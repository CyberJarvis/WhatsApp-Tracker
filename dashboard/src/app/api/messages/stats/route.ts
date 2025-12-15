import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MessageStats from '@/models/MessageStats'
import Group from '@/models/Group'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'
import { getToday, getDateRange } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET - Fetch aggregated message statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const clusterIdsParam = searchParams.get('clusterIds')
    const period = searchParams.get('period') || 'day' // day, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Resolve cluster IDs to group IDs if provided
    let clusterGroupIds: string[] | null = null
    if (clusterIdsParam) {
      const clusterIds = clusterIdsParam.split(',')
      const clusterObjectIds = clusterIds.map(id => new mongoose.Types.ObjectId(id))
      const clusters = await Cluster.find({
        _id: { $in: clusterObjectIds },
        userId,
      }).select('groupIds').lean()
      clusterGroupIds = clusters.flatMap(c => c.groupIds || [])
    }

    // Calculate date range based on period (using IST)
    const todayIST = getToday()
    let fromDateStr: string
    let toDateStr = todayIST

    if (startDate && endDate) {
      fromDateStr = startDate
      toDateStr = endDate
    } else {
      switch (period) {
        case 'week':
          fromDateStr = getDateRange(7).from
          break
        case 'month':
          fromDateStr = getDateRange(30).from
          break
        case 'year':
          fromDateStr = getDateRange(365).from
          break
        default: // day/today
          fromDateStr = todayIST
      }
    }

    // Build match query
    const matchQuery: Record<string, unknown> = {
      userId,
      date: { $gte: fromDateStr, $lte: toDateStr },
    }

    // Get group ObjectIds for filtering
    let filterGroupObjectIds: mongoose.Types.ObjectId[] | null = null

    if (groupId) {
      // Single group filter
      const group = await Group.findOne({ userId: session.user.id, groupId }).lean()
      if (group) {
        matchQuery.groupId = group._id
      }
    } else if (clusterGroupIds && clusterGroupIds.length > 0) {
      // Cluster filter - get ObjectIds for all groups in the cluster
      const groups = await Group.find({
        userId: session.user.id, // Use string userId for consistency with single-group query
        groupId: { $in: clusterGroupIds },
      }).select('_id').lean()

      filterGroupObjectIds = groups.map(g => g._id as mongoose.Types.ObjectId)
      if (filterGroupObjectIds.length > 0) {
        matchQuery.groupId = { $in: filterGroupObjectIds }
      } else {
        // No groups found in cluster, return empty result
        matchQuery.groupId = { $in: [] }
      }
    }

    // Aggregate stats by date
    const dailyStats = await MessageStats.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$date',
          totalMessages: { $sum: '$totalMessages' },
          adminMessages: { $sum: '$adminMessages' },
          userMessages: { $sum: '$userMessages' },
          mediaCount: {
            $push: '$mediaCount',
          },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Process media counts
    const processedStats = dailyStats.map(stat => {
      const mediaTotal = {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        sticker: 0,
        other: 0,
      }

      stat.mediaCount.forEach((mc: Record<string, number>) => {
        Object.keys(mediaTotal).forEach(key => {
          mediaTotal[key as keyof typeof mediaTotal] += mc[key] || 0
        })
      })

      return {
        date: stat._id,
        totalMessages: stat.totalMessages,
        adminMessages: stat.adminMessages,
        userMessages: stat.userMessages,
        mediaCount: mediaTotal,
      }
    })

    // Calculate totals
    const totals = processedStats.reduce(
      (acc, stat) => ({
        totalMessages: acc.totalMessages + stat.totalMessages,
        adminMessages: acc.adminMessages + stat.adminMessages,
        userMessages: acc.userMessages + stat.userMessages,
      }),
      { totalMessages: 0, adminMessages: 0, userMessages: 0 }
    )

    // Get hourly breakdown for today (IST)
    const todayStr = todayIST
    const hourlyMatchQuery: Record<string, unknown> = {
      userId,
      date: todayStr,
      hour: { $exists: true },
    }
    // Apply same group filter to hourly stats
    if (matchQuery.groupId) {
      hourlyMatchQuery.groupId = matchQuery.groupId
    }

    const hourlyStats = await MessageStats.aggregate([
      { $match: hourlyMatchQuery },
      {
        $group: {
          _id: '$hour',
          totalMessages: { $sum: '$totalMessages' },
          adminMessages: { $sum: '$adminMessages' },
          userMessages: { $sum: '$userMessages' },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Fill in missing hours with zeros
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const stat = hourlyStats.find(s => s._id === hour)
      return {
        hour,
        totalMessages: stat?.totalMessages || 0,
        adminMessages: stat?.adminMessages || 0,
        userMessages: stat?.userMessages || 0,
      }
    })

    return NextResponse.json({
      period,
      dateRange: { from: fromDateStr, to: toDateStr },
      totals,
      dailyStats: processedStats,
      hourlyStats: hourlyData,
    })
  } catch (error) {
    console.error('Error fetching message stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch message stats' },
      { status: 500 }
    )
  }
}
