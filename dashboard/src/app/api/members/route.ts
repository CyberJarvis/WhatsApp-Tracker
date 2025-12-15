import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import MemberActivity from '@/models/MemberActivity'
import Group from '@/models/Group'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Fetch members with activity data
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
    const sort = searchParams.get('sort') || 'messages' // messages, activity, name
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Build query
    const query: Record<string, unknown> = { userId }

    if (groupId) {
      const group = await Group.findOne({ userId: session.user.id, groupId }).lean()
      if (group) {
        query.groupId = group._id
      }
    }

    if (search) {
      query.memberName = { $regex: search, $options: 'i' }
    }

    // Determine sort order
    let sortOptions: Record<string, 1 | -1>
    switch (sort) {
      case 'activity':
        sortOptions = { lastMessageAt: -1 }
        break
      case 'name':
        sortOptions = { memberName: 1 }
        break
      default: // messages
        sortOptions = { messageCount: -1 }
    }

    const skip = (page - 1) * limit
    const [members, total] = await Promise.all([
      MemberActivity.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('groupId', 'groupName')
        .lean(),
      MemberActivity.countDocuments(query),
    ])

    return NextResponse.json({
      members: members.map(member => ({
        ...member,
        groupName: (member.groupId as { groupName?: string })?.groupName || 'Unknown',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
