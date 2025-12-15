import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Group from '@/models/Group'
import Snapshot from '@/models/Snapshot'
import DailyStat from '@/models/DailyStat'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'
import { getToday, getDateRange } from '@/lib/utils'

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
    await dbConnect()

    // Parse group, cluster, and period filter from query params
    const { searchParams } = new URL(request.url)
    const groupIdsParam = searchParams.get('groupIds')
    const clusterIdsParam = searchParams.get('clusterIds')
    const period = searchParams.get('period') || 'today'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    let filterGroupIds = groupIdsParam ? groupIdsParam.split(',') : null

    const today = getToday()
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // Calculate date range based on period
    let fromDate: string
    let toDate: string = today

    switch (period) {
      case 'today':
        fromDate = today
        break
      case 'week':
        fromDate = getDateRange(7).from
        break
      case 'month':
        fromDate = getDateRange(30).from
        break
      case 'year':
        fromDate = getDateRange(365).from
        break
      case 'custom':
        fromDate = startDateParam || today
        toDate = endDateParam || today
        break
      default:
        fromDate = today
    }

    // If cluster filter is provided, resolve cluster IDs to group IDs
    if (clusterIdsParam) {
      const clusterIds = clusterIdsParam.split(',')
      const clusterObjectIds = clusterIds.map(id => new mongoose.Types.ObjectId(id))

      const clusters = await Cluster.find({
        _id: { $in: clusterObjectIds },
        userId: userObjectId,
      }).select('groupIds').lean()

      // Collect all group IDs from selected clusters
      const clusterGroupIds = clusters.flatMap(c => c.groupIds || [])

      if (filterGroupIds) {
        // Intersection: groups must be in both filters
        const clusterGroupSet = new Set(clusterGroupIds)
        filterGroupIds = filterGroupIds.filter(id => clusterGroupSet.has(id))
      } else {
        filterGroupIds = clusterGroupIds
      }
    }

    // Build base filter for groups
    const groupFilter: Record<string, unknown> = { userId: userObjectId, isActive: true }
    if (filterGroupIds && filterGroupIds.length > 0) {
      groupFilter.groupId = { $in: filterGroupIds }
    }

    // Get all active groups count
    const totalGroups = await Group.countDocuments(groupFilter)

    // Get the MongoDB ObjectIds for the filtered groups
    let groupObjectIds: mongoose.Types.ObjectId[] = []
    if (filterGroupIds && filterGroupIds.length > 0) {
      const filteredGroups = await Group.find({
        userId: userObjectId,
        groupId: { $in: filterGroupIds }
      }).select('_id').lean()
      groupObjectIds = filteredGroups.map(g => g._id as mongoose.Types.ObjectId)
    }

    // Build snapshot match filter
    const snapshotMatchFilter: Record<string, unknown> = { userId: userObjectId }
    if (groupObjectIds.length > 0) {
      snapshotMatchFilter.groupId = { $in: groupObjectIds }
    }

    const latestSnapshots = await Snapshot.aggregate([
      { $match: snapshotMatchFilter },
      { $sort: { groupId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$groupId',
          totalMembers: { $first: '$totalMembers' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ])

    const totalMembers = latestSnapshots.reduce((sum, s) => sum + (s.totalMembers || 0), 0)

    // Get stats from DailyStat for the selected period (for joined/left tracking)
    const dailyStatFilter: Record<string, unknown> = {
      userId: userObjectId,
      date: fromDate === toDate ? fromDate : { $gte: fromDate, $lte: toDate }
    }
    if (groupObjectIds.length > 0) {
      dailyStatFilter.groupId = { $in: groupObjectIds }
    }
    const periodStats = await DailyStat.find(dailyStatFilter).lean()

    const totalJoined = periodStats.reduce((sum, s) => sum + s.joinedToday, 0)
    const totalLeft = periodStats.reduce((sum, s) => sum + s.leftToday, 0)
    const netGrowth = totalJoined - totalLeft

    // Get anomaly stats with group details
    const anomalyStats = periodStats.filter(s => s.notes && s.notes.includes('Large'))

    // Get group details for anomalies
    let anomalies: Array<{
      groupId: string
      groupName: string
      date: string
      previousMembers: number
      currentMembers: number
      netGrowth: number
      percentageChange: number
      notes: string
    }> = []

    if (anomalyStats.length > 0) {
      // Get group IDs from anomaly stats
      const anomalyGroupObjectIds = anomalyStats.map(s => s.groupId)
      const anomalyGroups = await Group.find({
        _id: { $in: anomalyGroupObjectIds }
      }).select('_id groupId groupName').lean()

      const groupMap = new Map(anomalyGroups.map(g => [g._id.toString(), g]))

      anomalies = anomalyStats.map(stat => {
        const group = groupMap.get(stat.groupId.toString())
        const prevMembers = stat.totalMembers - (stat.joinedToday - stat.leftToday)
        return {
          groupId: group?.groupId || 'unknown',
          groupName: group?.groupName || 'Unknown Group',
          date: stat.date,
          previousMembers: prevMembers,
          currentMembers: stat.totalMembers,
          netGrowth: stat.joinedToday - stat.leftToday,
          percentageChange: prevMembers > 0 ? ((stat.totalMembers - prevMembers) / prevMembers) * 100 : 0,
          notes: stat.notes || '',
        }
      }).filter(a => a.netGrowth < 0) // Only show negative anomalies (member drops)
        .sort((a, b) => a.netGrowth - b.netGrowth) // Sort by biggest drops first
    }

    // Count matches what's displayed in anomalies list
    const anomalyCount = anomalies.length

    // Get 7-day trend data
    const { from: sevenDaysAgo } = getDateRange(7)

    // Build trend match filter
    const trendMatchFilter: Record<string, unknown> = {
      userId: userObjectId,
      date: { $gte: sevenDaysAgo },
    }
    if (groupObjectIds.length > 0) {
      trendMatchFilter.groupId = { $in: groupObjectIds }
    }

    const trendStats = await DailyStat.aggregate([
      {
        $match: trendMatchFilter,
      },
      {
        $group: {
          _id: '$date',
          totalMembers: { $sum: '$totalMembers' },
          joined: { $sum: '$joinedToday' },
          left: { $sum: '$leftToday' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    const trend = trendStats.map((stat) => ({
      date: stat._id,
      totalMembers: stat.totalMembers,
      joined: stat.joined,
      left: stat.left,
      netGrowth: stat.joined - stat.left,
    }))

    // Get inactive groups count (only when not filtering)
    const inactiveGroupFilter: Record<string, unknown> = { userId: userObjectId, isActive: false }
    if (filterGroupIds && filterGroupIds.length > 0) {
      inactiveGroupFilter.groupId = { $in: filterGroupIds }
    }
    const inactiveGroups = await Group.countDocuments(inactiveGroupFilter)

    return NextResponse.json({
      summary: {
        totalGroups: totalGroups + inactiveGroups,
        activeGroups: totalGroups,
        totalMembers,
        todayJoined: totalJoined,
        todayLeft: totalLeft,
        netGrowth,
        anomalyCount,
      },
      trend,
      anomalies,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
