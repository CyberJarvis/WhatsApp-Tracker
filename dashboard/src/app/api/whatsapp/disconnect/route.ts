import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'

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

    // Call WhatsApp service to disconnect
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/disconnect/${userId}`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Error calling WhatsApp service:', err)
    }

    // Update user in database
    await dbConnect()
    await User.findByIdAndUpdate(userId, { waConnected: false })

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
