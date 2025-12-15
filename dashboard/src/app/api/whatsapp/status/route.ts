import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3002'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get status directly from WhatsApp service
    let serviceStatus = { state: 'idle', isConnected: false, isInitialized: false, hasQR: false }
    try {
      const res = await fetch(`${WA_SERVICE_URL}/api/status/${userId}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        serviceStatus = await res.json()
      }
    } catch (err) {
      console.error('Error fetching WhatsApp service status:', err)
    }

    // Also get last seen from database
    await dbConnect()
    const user = await User.findById(userId).select('waLastSeen')

    return NextResponse.json({
      isConnected: serviceStatus.isConnected || serviceStatus.state === 'ready',
      isInitialized: serviceStatus.isInitialized,
      hasQR: serviceStatus.hasQR,
      state: serviceStatus.state,
      lastSeen: user?.waLastSeen || null,
    })
  } catch (error) {
    console.error('Error getting WhatsApp status:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
