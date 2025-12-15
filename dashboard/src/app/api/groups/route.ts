import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Group from '@/models/Group'
import Snapshot from '@/models/Snapshot'
import DailyStat from '@/models/DailyStat'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'
import { getToday, getYesterday } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userObjectId = new mongoose.Types.ObjectId(userId)
    await dbConnect()

    // Parse group and cluster filters from query params
    const { searchParams } = new URL(request.url)
    const groupIdsParam = searchParams.get('groupIds')
    const clusterIdsParam = searchParams.get('clusterIds')
    let filterGroupIds = groupIdsParam ? groupIdsParam.split(',') : null

    // If cluster filter is provided, resolve cluster IDs to group IDs
    if (clusterIdsParam) {
      const clusterIds = clusterIdsParam.split(',')
      const clusters = await Cluster.find({
        _id: { $in: clusterIds },
        userId: userObjectId,
      }).select('groupIds').lean()

      // Collect all group IDs from selected clusters
      const clusterGroupIds = new Set<string>()
      clusters.forEach(cluster => {
        cluster.groupIds.forEach((gid: string) => clusterGroupIds.add(gid))
      })

      if (clusterGroupIds.size > 0) {
        // If both group filter and cluster filter, use intersection
        if (filterGroupIds && filterGroupIds.length > 0) {
          filterGroupIds = filterGroupIds.filter(id => clusterGroupIds.has(id))
        } else {
          filterGroupIds = Array.from(clusterGroupIds)
        }
      }
    }

    // Build filter for groups
    const groupFilter: Record<string, unknown> = { userId: userObjectId, isActive: true }
    if (filterGroupIds && filterGroupIds.length > 0) {
      groupFilter.groupId = { $in: filterGroupIds }
    }

    // Get all groups for this user (only needed fields)
    const groups = await Group.find(groupFilter)
      .select('_id groupId groupName isActive addedAt')
      .lean()

    // Get all clusters for this user to map groups to clusters
    const allClusters = await Cluster.find({ userId: userObjectId })
      .select('groupIds name color')
      .lean()

    // Build a map of groupId -> cluster info for quick lookup
    const groupClusterMap = new Map<string, Array<{ _id: string; name: string; color: string }>>()
    allClusters.forEach(cluster => {
      cluster.groupIds.forEach((groupId: string) => {
        if (!groupClusterMap.has(groupId)) {
          groupClusterMap.set(groupId, [])
        }
        groupClusterMap.get(groupId)!.push({
          _id: cluster._id.toString(),
          name: cluster.name,
          color: cluster.color,
        })
      })
    })

    // Get dates for stats
    const today = getToday()
    const yesterday = getYesterday()

    // Get all group ObjectIds for batch queries
    const groupObjectIds = groups.map(g => g._id as mongoose.Types.ObjectId)

    // BATCH QUERY 1: Get latest snapshots for all groups in one aggregation
    const latestSnapshots = await Snapshot.aggregate([
      { $match: { groupId: { $in: groupObjectIds } } },
      { $sort: { groupId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$groupId',
          totalMembers: { $first: '$totalMembers' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ])

    // Build snapshot lookup map
    const snapshotMap = new Map<string, number>()
    latestSnapshots.forEach(s => {
      snapshotMap.set(s._id.toString(), s.totalMembers || 0)
    })

    // BATCH QUERY 2: Get today's stats for all groups
    const todayStats = await DailyStat.find({
      groupId: { $in: groupObjectIds },
      date: today
    }).select('groupId netGrowth').lean()

    const todayStatsMap = new Map<string, number>()
    todayStats.forEach(s => {
      todayStatsMap.set(s.groupId.toString(), s.netGrowth || 0)
    })

    // BATCH QUERY 3: Get yesterday's stats for all groups
    const yesterdayStats = await DailyStat.find({
      groupId: { $in: groupObjectIds },
      date: yesterday
    }).select('groupId totalMembers').lean()

    const yesterdayStatsMap = new Map<string, number>()
    yesterdayStats.forEach(s => {
      yesterdayStatsMap.set(s.groupId.toString(), s.totalMembers || 0)
    })

    // Build response by joining in memory (no more N+1 queries!)
    const groupsWithStats = groups.map(group => {
      const groupIdStr = (group._id as mongoose.Types.ObjectId).toString()
      const currentMembers = snapshotMap.get(groupIdStr) || 0
      const yesterdayMembers = yesterdayStatsMap.get(groupIdStr) || currentMembers
      const todayGrowth = todayStatsMap.get(groupIdStr) || 0

      return {
        groupId: group.groupId,
        groupName: group.groupName,
        currentMembers,
        yesterdayMembers,
        todayGrowth,
        isActive: group.isActive,
        addedAt: group.addedAt,
        clusters: groupClusterMap.get(group.groupId) || [],
      }
    })

    const activeCount = groups.length

    // Build inactive filter
    const inactiveFilter: Record<string, unknown> = { userId: userObjectId, isActive: false }
    if (filterGroupIds && filterGroupIds.length > 0) {
      inactiveFilter.groupId = { $in: filterGroupIds }
    }
    const inactiveCount = await Group.countDocuments(inactiveFilter)

    return NextResponse.json({
      groups: groupsWithStats,
      summary: {
        total: groups.length + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}
