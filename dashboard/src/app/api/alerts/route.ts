import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Alert from '@/models/Alert'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const alerts = await Alert.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      alertType,
      condition,
      groupIds,
      applyToAllGroups,
      notificationChannels,
      cooldownHours,
    } = body

    if (!name || !alertType || !condition) {
      return NextResponse.json(
        { error: 'Name, alert type, and condition are required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const alert = await Alert.create({
      userId: session.user.id,
      name,
      description,
      alertType,
      condition,
      groupIds: groupIds || [],
      applyToAllGroups: applyToAllGroups ?? true,
      notificationChannels: notificationChannels || ['in_app'],
      cooldownHours: cooldownHours || 24,
      isActive: true,
      triggerCount: 0,
    })

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}
