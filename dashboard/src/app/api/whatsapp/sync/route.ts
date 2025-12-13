import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3002'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Call WhatsApp service to sync
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/sync/${userId}`, {
      method: 'POST',
    })

    if (!response.ok) {
      const data = await response.json()
      return NextResponse.json(
        { error: data.error || 'Sync failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      groupsCount: data.groupsCount,
      totalMembers: data.totalMembers,
    })
  } catch (error) {
    console.error('Error syncing WhatsApp:', error)
    return NextResponse.json(
      { error: 'Failed to sync' },
      { status: 500 }
    )
  }
}
