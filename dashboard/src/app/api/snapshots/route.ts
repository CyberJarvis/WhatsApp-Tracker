import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Snapshot from '@/models/Snapshot'
import Group from '@/models/Group'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const days = parseInt(searchParams.get('days') || '7', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    let query: Record<string, unknown> = {
      userId,
      timestamp: { $gte: startDate },
    }

    // If groupId is provided, find the internal group ID
    if (groupId) {
      const group = await Group.findOne({ userId, groupId }).lean()
      if (group) {
        query.groupId = group._id
      } else {
        return NextResponse.json({ snapshots: [] })
      }
    }

    const snapshots = await Snapshot.find(query)
      .populate('groupId', 'groupId groupName')
      .sort({ timestamp: -1 })
      .lean()

    // Transform snapshots
    const transformedSnapshots = snapshots.map((snapshot) => {
      const group = snapshot.groupId as unknown as { groupId: string; groupName: string } | null
      return {
        groupId: group?.groupId || '',
        groupName: group?.groupName || 'Unknown Group',
        timestamp: snapshot.timestamp,
        totalMembers: snapshot.totalMembers,
      }
    })

    return NextResponse.json({ snapshots: transformedSnapshots })
  } catch (error) {
    console.error('Error fetching snapshots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    )
  }
}
