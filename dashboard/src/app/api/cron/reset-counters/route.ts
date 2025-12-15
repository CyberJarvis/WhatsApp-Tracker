import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import MemberActivity from '@/models/MemberActivity'

export const dynamic = 'force-dynamic'

// API Key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-key'

// POST - Reset daily and weekly counters
// Should be called by a cron job:
// - Daily at midnight: reset todayMessageCount
// - Weekly on Monday at midnight: reset weekMessageCount
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const providedKey = authHeader?.replace('Bearer ', '')

    if (providedKey !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily' // daily or weekly

    await dbConnect()

    let result

    if (type === 'weekly') {
      // Reset weekly counters
      result = await MemberActivity.updateMany(
        {},
        {
          $set: {
            weekMessageCount: 0,
            todayMessageCount: 0, // Also reset daily on weekly reset
          },
        }
      )

      console.log(`Weekly counter reset: ${result.modifiedCount} records updated`)

      return NextResponse.json({
        success: true,
        type: 'weekly',
        modifiedCount: result.modifiedCount,
      })
    } else {
      // Reset daily counters
      result = await MemberActivity.updateMany(
        {},
        {
          $set: {
            todayMessageCount: 0,
          },
        }
      )

      console.log(`Daily counter reset: ${result.modifiedCount} records updated`)

      return NextResponse.json({
        success: true,
        type: 'daily',
        modifiedCount: result.modifiedCount,
      })
    }
  } catch (error) {
    console.error('Error resetting counters:', error)
    return NextResponse.json(
      { error: 'Failed to reset counters' },
      { status: 500 }
    )
  }
}

// GET - Check last reset status (for debugging)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const providedKey = authHeader?.replace('Bearer ', '')

    if (providedKey !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    // Get stats about current counter values
    const stats = await MemberActivity.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalTodayMessages: { $sum: '$todayMessageCount' },
          totalWeekMessages: { $sum: '$weekMessageCount' },
          totalAllTimeMessages: { $sum: '$messageCount' },
          avgTodayMessages: { $avg: '$todayMessageCount' },
          avgWeekMessages: { $avg: '$weekMessageCount' },
        },
      },
    ])

    return NextResponse.json({
      success: true,
      stats: stats[0] || {
        totalRecords: 0,
        totalTodayMessages: 0,
        totalWeekMessages: 0,
        totalAllTimeMessages: 0,
      },
    })
  } catch (error) {
    console.error('Error getting counter stats:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
