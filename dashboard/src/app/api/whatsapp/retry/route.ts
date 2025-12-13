import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3002'

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

    // Call retry endpoint on WhatsApp service
    const res = await fetch(`${WA_SERVICE_URL}/api/retry/${userId}`, {
      method: 'POST',
    })
    const data = await res.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error retrying WhatsApp connection:', error)
    return NextResponse.json({
      status: 'error',
      message: 'WhatsApp service not available. Please start the WhatsApp service.',
    })
  }
}
