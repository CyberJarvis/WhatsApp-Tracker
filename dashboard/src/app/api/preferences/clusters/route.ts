import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import UserPreferences from '@/models/UserPreferences'
import Cluster from '@/models/Cluster'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Get cluster filter preferences
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

    // Get or create user preferences
    let preferences = await UserPreferences.findOne({ userId }).lean()

    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
        selectedClusterIds: [],
        clusterFilterMode: 'all',
      })
      preferences = preferences.toObject()
    }

    // Get all clusters for the user
    const allClusters = await Cluster.find({ userId })
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({
      selectedClusterIds: preferences.selectedClusterIds || [],
      clusterFilterMode: preferences.clusterFilterMode || 'all',
      allClusters,
    })
  } catch (error) {
    console.error('Error fetching cluster preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cluster preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update cluster filter preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { selectedClusterIds, clusterFilterMode } = body

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)
    const updateData: Record<string, unknown> = {}

    if (Array.isArray(selectedClusterIds)) {
      updateData.selectedClusterIds = selectedClusterIds
    }

    if (clusterFilterMode && ['all', 'selected'].includes(clusterFilterMode)) {
      updateData.clusterFilterMode = clusterFilterMode
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true }
    ).lean()

    return NextResponse.json({
      selectedClusterIds: preferences.selectedClusterIds || [],
      clusterFilterMode: preferences.clusterFilterMode || 'all',
    })
  } catch (error) {
    console.error('Error updating cluster preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update cluster preferences' },
      { status: 500 }
    )
  }
}
