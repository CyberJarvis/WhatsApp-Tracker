import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'
import { parseJsonBody } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'

// GET - List all clusters for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const clusters = await Cluster.find({ userId })
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({ clusters })
  } catch (error) {
    console.error('Error fetching clusters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clusters' },
      { status: 500 }
    )
  }
}

// POST - Create a new cluster
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const result = await parseJsonBody<{ name: string; description?: string; color?: string }>(request)
    if ('error' in result) {
      return result.error
    }
    const { name, description, color } = result.data

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cluster name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Cluster name must be 100 characters or less' },
        { status: 400 }
      )
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    // Check if cluster with same name already exists for this user
    const existingCluster = await Cluster.findOne({
      userId,
      name: name.trim(),
    })

    if (existingCluster) {
      return NextResponse.json(
        { error: 'A cluster with this name already exists' },
        { status: 409 }
      )
    }

    const cluster = await Cluster.create({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3B82F6',
      userId,
      groupIds: [],
      groupCount: 0,
    })

    return NextResponse.json({ cluster }, { status: 201 })
  } catch (error) {
    console.error('Error creating cluster:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create cluster'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
