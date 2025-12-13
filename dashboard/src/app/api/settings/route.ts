import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export const dynamic = 'force-dynamic'

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

    const user = await User.findById(session.user.id)
      .select('name email sheetsId sheetsEmail waConnected waLastSeen')
      .lean()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      sheetsId: user.sheetsId,
      sheetsEmail: user.sheetsEmail,
      waConnected: user.waConnected,
      waLastSeen: user.waLastSeen,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, sheetsId } = await request.json()

    await dbConnect()

    // Extract Sheet ID from URL if provided
    let extractedSheetId = sheetsId
    if (sheetsId && sheetsId.includes('docs.google.com')) {
      const match = sheetsId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
      if (match) {
        extractedSheetId = match[1]
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (sheetsId !== undefined) updateData.sheetsId = extractedSheetId

    const user = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true }
    ).select('name email sheetsId sheetsEmail waConnected')

    return NextResponse.json({
      message: 'Settings updated successfully',
      user: {
        name: user?.name,
        email: user?.email,
        sheetsId: user?.sheetsId,
        waConnected: user?.waConnected,
      },
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
