import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Snapshot from '@/models/Snapshot'
import Group from '@/models/Group'
import mongoose from 'mongoose'

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
    const userObjectId = new mongoose.Types.ObjectId(userId)
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const days = parseInt(searchParams.get('days') || '7', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000', 10), 5000)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build aggregation pipeline for efficient querying
    const matchStage: Record<string, unknown> = {
      userId: userObjectId,
      timestamp: { $gte: startDate },
    }

    // If groupId is provided, find the internal group ID
    if (groupId) {
      const group = await Group.findOne({ userId: userObjectId, groupId })
        .select('_id')
        .lean()
      if (group) {
        matchStage.groupId = group._id
      } else {
        return NextResponse.json({ snapshots: [], total: 0 })
      }
    }

    // Use aggregation with $lookup for efficient join instead of populate
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: { timestamp: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $lookup: {
          from: 'groups',
          localField: 'groupId',
          foreignField: '_id',
          as: 'groupInfo',
          pipeline: [
            { $project: { groupId: 1, groupName: 1 } }
          ]
        }
      },
      {
        $project: {
          groupId: { $arrayElemAt: ['$groupInfo.groupId', 0] },
          groupName: { $arrayElemAt: ['$groupInfo.groupName', 0] },
          timestamp: 1,
          totalMembers: 1
        }
      }
    ]

    const snapshots = await Snapshot.aggregate(pipeline)

    // Transform results
    const transformedSnapshots = snapshots.map((snapshot) => ({
      groupId: snapshot.groupId || '',
      groupName: snapshot.groupName || 'Unknown Group',
      timestamp: snapshot.timestamp,
      totalMembers: snapshot.totalMembers,
    }))

    return NextResponse.json({
      snapshots: transformedSnapshots,
      pagination: {
        offset,
        limit,
        hasMore: snapshots.length === limit
      }
    })
  } catch (error) {
    console.error('Error fetching snapshots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    )
  }
}
