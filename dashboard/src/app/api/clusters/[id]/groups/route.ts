import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// PUT - Set/replace all groups in cluster
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid cluster ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { groupIds } = body

    if (!Array.isArray(groupIds)) {
      return NextResponse.json(
        { error: 'groupIds must be an array' },
        { status: 400 }
      )
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const cluster = await Cluster.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          groupIds: groupIds,
          groupCount: groupIds.length,
        },
      },
      { new: true }
    ).lean()

    if (!cluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cluster })
  } catch (error) {
    console.error('Error setting cluster groups:', error)
    return NextResponse.json(
      { error: 'Failed to set cluster groups' },
      { status: 500 }
    )
  }
}

// POST - Add groups to cluster (without removing existing)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid cluster ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { groupIds } = body

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json(
        { error: 'groupIds must be a non-empty array' },
        { status: 400 }
      )
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Add groups to cluster (using $addToSet to avoid duplicates)
    const cluster = await Cluster.findOneAndUpdate(
      { _id: id, userId },
      {
        $addToSet: { groupIds: { $each: groupIds } },
      },
      { new: true }
    )

    if (!cluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    // Update groupCount
    cluster.groupCount = cluster.groupIds.length
    await cluster.save()

    return NextResponse.json({ cluster: cluster.toObject() })
  } catch (error) {
    console.error('Error adding groups to cluster:', error)
    return NextResponse.json(
      { error: 'Failed to add groups to cluster' },
      { status: 500 }
    )
  }
}

// DELETE - Remove groups from cluster
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid cluster ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { groupIds } = body

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json(
        { error: 'groupIds must be a non-empty array' },
        { status: 400 }
      )
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Remove groups from cluster
    const cluster = await Cluster.findOneAndUpdate(
      { _id: id, userId },
      {
        $pull: { groupIds: { $in: groupIds } },
      },
      { new: true }
    )

    if (!cluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    // Update groupCount
    cluster.groupCount = cluster.groupIds.length
    await cluster.save()

    return NextResponse.json({ cluster: cluster.toObject() })
  } catch (error) {
    console.error('Error removing groups from cluster:', error)
    return NextResponse.json(
      { error: 'Failed to remove groups from cluster' },
      { status: 500 }
    )
  }
}
