import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Message from '@/models/Message'
import Group from '@/models/Group'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Fetch messages with pagination
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Build query
    const query: Record<string, unknown> = { userId }

    if (groupId) {
      // Find the group to get its ObjectId
      const group = await Group.findOne({ userId: session.user.id, groupId }).lean()
      if (group) {
        query.groupId = group._id
      }
    }

    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) {
        (query.timestamp as Record<string, Date>).$gte = new Date(startDate)
      }
      if (endDate) {
        (query.timestamp as Record<string, Date>).$lte = new Date(endDate)
      }
    }

    // Get messages with pagination
    const skip = (page - 1) * limit
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('groupId', 'groupName')
        .lean(),
      Message.countDocuments(query),
    ])

    return NextResponse.json({
      messages: messages.map(msg => ({
        ...msg,
        groupName: (msg.groupId as { groupName?: string })?.groupName || 'Unknown',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
