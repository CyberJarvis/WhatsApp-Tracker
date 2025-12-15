import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import UserPreferences from '@/models/UserPreferences'
import Group from '@/models/Group'

export const dynamic = 'force-dynamic'

// GET - Get selected groups for filtering
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

    // Get user preferences
    const preferences = await UserPreferences.findOne({ userId: session.user.id }).lean()

    // Get all groups for the user
    const allGroups = await Group.find({ userId: session.user.id, isActive: true })
      .select('_id groupId groupName')
      .lean()

    // If selectAll is true or no preferences exist, return all groups as selected
    const selectAll = preferences?.selectAll ?? true
    const selectedGroupIds = selectAll
      ? allGroups.map(g => g.groupId)
      : (preferences?.selectedGroupIds || [])

    return NextResponse.json({
      selectAll,
      selectedGroupIds,
      allGroups: allGroups.map(g => ({
        _id: g._id,
        groupId: g.groupId,
        groupName: g.groupName,
      })),
    })
  } catch (error) {
    console.error('Error fetching selected groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch selected groups' },
      { status: 500 }
    )
  }
}

// PUT - Update selected groups
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
    const { selectedGroupIds, selectAll } = body

    await dbConnect()

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          selectedGroupIds: selectAll ? [] : (selectedGroupIds || []),
          selectAll: selectAll ?? false,
        },
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      selectAll: preferences.selectAll,
      selectedGroupIds: preferences.selectedGroupIds,
    })
  } catch (error) {
    console.error('Error updating selected groups:', error)
    return NextResponse.json(
      { error: 'Failed to update selected groups' },
      { status: 500 }
    )
  }
}
