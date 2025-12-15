import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import DailyStat from '@/models/DailyStat'
import Group from '@/models/Group'
import { getToday } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query: Record<string, unknown> = { userId }

    if (from && to) {
      query.date = { $gte: from, $lte: to }
    } else if (date) {
      query.date = date
    } else {
      // Default to today (IST)
      query.date = getToday()
    }

    const stats = await DailyStat.find(query)
      .populate('groupId', 'groupId groupName')
      .lean()

    // Transform stats to include group info
    const transformedStats = stats.map((stat) => {
      const group = stat.groupId as unknown as { groupId: string; groupName: string } | null
      return {
        groupId: group?.groupId || '',
        groupName: group?.groupName || 'Unknown Group',
        date: stat.date,
        totalMembers: stat.totalMembers,
        joinedToday: stat.joinedToday,
        leftToday: stat.leftToday,
        netGrowth: stat.netGrowth,
        notes: stat.notes || '',
      }
    })

    // Compute summary
    const totalMembers = transformedStats.reduce((sum, s) => sum + s.totalMembers, 0)
    const totalJoined = transformedStats.reduce((sum, s) => sum + s.joinedToday, 0)
    const totalLeft = transformedStats.reduce((sum, s) => sum + s.leftToday, 0)
    const anomalies = transformedStats.filter(s => s.notes && s.notes.includes('Large'))

    return NextResponse.json({
      stats: transformedStats,
      summary: {
        totalGroups: new Set(transformedStats.map(s => s.groupId)).size,
        totalMembers,
        totalJoined,
        totalLeft,
        netGrowth: totalJoined - totalLeft,
        anomalyCount: anomalies.length,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
