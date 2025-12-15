import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MemberEvent from '@/models/MemberEvent'
import Group from '@/models/Group'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Get member join/leave history
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
    const eventType = searchParams.get('eventType') // join, leave, or all
    const days = parseInt(searchParams.get('days') || '7')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Calculate date range
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    // Build query
    const query: Record<string, unknown> = {
      userId,
      timestamp: { $gte: fromDate },
    }

    if (groupId) {
      const group = await Group.findOne({ userId: session.user.id, groupId }).lean()
      if (group) {
        query.groupId = group._id
      }
    }

    if (eventType && eventType !== 'all') {
      query.eventType = eventType
    }

    const skip = (page - 1) * limit
    const [events, total] = await Promise.all([
      MemberEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('groupId', 'groupName')
        .lean(),
      MemberEvent.countDocuments(query),
    ])

    // Get summary stats
    const summary = await MemberEvent.aggregate([
      { $match: { ...query, timestamp: { $gte: fromDate } } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
    ])

    const joinCount = summary.find(s => s._id === 'join')?.count || 0
    const leaveCount = summary.find(s => s._id === 'leave')?.count || 0

    return NextResponse.json({
      events: events.map(event => ({
        ...event,
        groupName: (event.groupId as { groupName?: string })?.groupName || 'Unknown',
      })),
      summary: {
        joins: joinCount,
        leaves: leaveCount,
        netChange: joinCount - leaveCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching member history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member history' },
      { status: 500 }
    )
  }
}
