import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import UserPreferences from '@/models/UserPreferences'

export const dynamic = 'force-dynamic'

// GET - Fetch user preferences
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

    let preferences = await UserPreferences.findOne({ userId: session.user.id }).lean()

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await UserPreferences.create({
        userId: session.user.id,
        selectedGroupIds: [],
        selectAll: true,
        dashboardSettings: {
          defaultDateRange: 7,
          refreshInterval: 300,
          showInactiveGroups: false,
          compactView: false,
        },
        notificationSettings: {
          emailEnabled: true,
          inAppEnabled: true,
          dailyDigest: false,
          digestTime: 9,
        },
        timezone: 'Asia/Kolkata',
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update user preferences
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
    const { dashboardSettings, notificationSettings, timezone } = body

    await dbConnect()

    const updateData: Record<string, unknown> = {}

    if (dashboardSettings) {
      updateData.dashboardSettings = dashboardSettings
    }
    if (notificationSettings) {
      updateData.notificationSettings = notificationSettings
    }
    if (timezone) {
      updateData.timezone = timezone
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId: session.user.id },
      { $set: updateData },
      { upsert: true, new: true }
    )

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
