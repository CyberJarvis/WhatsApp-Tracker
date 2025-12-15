import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Get single cluster with its groups
export async function GET(
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

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const cluster = await Cluster.findOne({
      _id: id,
      userId,
    }).lean()

    if (!cluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ cluster })
  } catch (error) {
    console.error('Error fetching cluster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cluster' },
      { status: 500 }
    )
  }
}

// PUT - Update cluster details
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
    const { name, description, color } = body

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Check if cluster exists and belongs to user
    const existingCluster = await Cluster.findOne({
      _id: id,
      userId,
    })

    if (!existingCluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingCluster.name) {
      const duplicateCluster = await Cluster.findOne({
        userId,
        name: name.trim(),
        _id: { $ne: id },
      })

      if (duplicateCluster) {
        return NextResponse.json(
          { error: 'A cluster with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (color !== undefined) updateData.color = color

    const cluster = await Cluster.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).lean()

    return NextResponse.json({ cluster })
  } catch (error) {
    console.error('Error updating cluster:', error)
    return NextResponse.json(
      { error: 'Failed to update cluster' },
      { status: 500 }
    )
  }
}

// DELETE - Delete cluster
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

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const result = await Cluster.findOneAndDelete({
      _id: id,
      userId,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cluster:', error)
    return NextResponse.json(
      { error: 'Failed to delete cluster' },
      { status: 500 }
    )
  }
}
