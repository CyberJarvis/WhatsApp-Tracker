import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MemberActivity from '@/models/MemberActivity'
import Group from '@/models/Group'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Get top active members (leaderboard)
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
    const limit = parseInt(searchParams.get('limit') || '10')
    const period = searchParams.get('period') || 'all' // all, today, week

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

    // Build match query
    const matchQuery: Record<string, unknown> = { userId, isActive: true }

    if (groupId) {
      const group = await Group.findOne({ userId: session.user.id, groupId }).lean()
      if (group) {
        matchQuery.groupId = group._id
      }
    } else if (clusterGroupIds && clusterGroupIds.length > 0) {
      // Cluster filter - get ObjectIds for all groups in the cluster
      const groups = await Group.find({
        userId: session.user.id,
        groupId: { $in: clusterGroupIds },
      }).select('_id').lean()
      const filterGroupObjectIds = groups.map(g => g._id as mongoose.Types.ObjectId)
      if (filterGroupObjectIds.length > 0) {
        matchQuery.groupId = { $in: filterGroupObjectIds }
      }
    }

    // Determine sort field based on period
    let sortField: string
    switch (period) {
      case 'today':
        sortField = 'todayMessageCount'
        break
      case 'week':
        sortField = 'weekMessageCount'
        break
      default:
        sortField = 'messageCount'
    }

    const leaderboard = await MemberActivity.find(matchQuery)
      .sort({ [sortField]: -1 })
      .limit(limit)
      .populate('groupId', 'groupName')
      .lean()

    return NextResponse.json({
      leaderboard: leaderboard.map((member, index) => ({
        rank: index + 1,
        memberId: member.memberId,
        memberName: member.memberName,
        messageCount: period === 'today'
          ? member.todayMessageCount
          : period === 'week'
          ? member.weekMessageCount
          : member.messageCount,
        lastMessageAt: member.lastMessageAt,
        isAdmin: member.isAdmin,
        activityLevel: member.activityLevel,
        groupName: (member.groupId as { groupName?: string })?.groupName || 'Unknown',
      })),
      period,
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
