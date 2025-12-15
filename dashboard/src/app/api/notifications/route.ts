import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Notification from '@/models/Notification'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Fetch notifications
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
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const query: Record<string, unknown> = { userId }
    if (unreadOnly) {
      query.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId, isRead: false }),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PUT - Mark notifications as read
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
    const { notificationIds, markAllRead } = body

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    if (markAllRead) {
      await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      )
    } else if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        {
          _id: { $in: notificationIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
          userId,
        },
        { $set: { isRead: true, readAt: new Date() } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

// DELETE - Clear notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clearAll = searchParams.get('clearAll') === 'true'
    const notificationId = searchParams.get('id')

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(session.user.id)

    if (clearAll) {
      await Notification.deleteMany({ userId })
    } else if (notificationId) {
      await Notification.deleteOne({
        _id: new mongoose.Types.ObjectId(notificationId),
        userId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}
