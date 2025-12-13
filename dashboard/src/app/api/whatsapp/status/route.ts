import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import waManager from '@/lib/whatsapp-manager'
import dbConnect from '@/lib/db'
import User from '@/models/User'

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

    // Get status from WhatsApp manager
    const clientStatus = waManager.getClientStatus(userId)

    // Also get status from database
    await dbConnect()
    const user = await User.findById(userId).select('waConnected waLastSeen')

    return NextResponse.json({
      isConnected: clientStatus.isReady || user?.waConnected || false,
      isInitialized: clientStatus.isInitialized,
      hasQR: clientStatus.hasQR,
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
