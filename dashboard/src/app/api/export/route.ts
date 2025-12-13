import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import DailyStat from '@/models/DailyStat'
import Group from '@/models/Group'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { type, dateRange, groupIds } = body

    // Build query
    let query: Record<string, unknown> = {
      userId,
      date: { $gte: dateRange.from, $lte: dateRange.to },
    }

    // Filter by group IDs if specified
    if (groupIds && groupIds.length > 0) {
      const groups = await Group.find({
        userId,
        groupId: { $in: groupIds },
      }).select('_id')
      query.groupId = { $in: groups.map(g => g._id) }
    }

    const stats = await DailyStat.find(query)
      .populate('groupId', 'groupId groupName')
      .sort({ date: -1 })
      .lean()

    // Transform stats
    const transformedStats = stats.map((stat) => {
      const group = stat.groupId as unknown as { groupId: string; groupName: string } | null
      return {
        date: stat.date,
        groupId: group?.groupId || '',
        groupName: group?.groupName || 'Unknown Group',
        totalMembers: stat.totalMembers,
        joinedToday: stat.joinedToday,
        leftToday: stat.leftToday,
        netGrowth: stat.netGrowth,
        notes: stat.notes || '',
      }
    })

    if (type === 'csv') {
      const headers = ['Date', 'Group ID', 'Group Name', 'Total Members', 'Joined', 'Left', 'Net Growth', 'Notes']
      const rows = transformedStats.map(s => [
        s.date,
        s.groupId,
        s.groupName,
        s.totalMembers,
        s.joinedToday,
        s.leftToday,
        s.netGrowth,
        s.notes,
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="whatsapp-stats-${dateRange.from}-to-${dateRange.to}.csv"`,
        },
      })
    }

    if (type === 'excel') {
      const workbook = XLSX.utils.book_new()

      const data = transformedStats.map(s => ({
        Date: s.date,
        'Group ID': s.groupId,
        'Group Name': s.groupName,
        'Total Members': s.totalMembers,
        Joined: s.joinedToday,
        Left: s.leftToday,
        'Net Growth': s.netGrowth,
        Notes: s.notes,
      }))

      const worksheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Stats')

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="whatsapp-stats-${dateRange.from}-to-${dateRange.to}.xlsx"`,
        },
      })
    }

    // Default: return JSON
    return NextResponse.json({ stats: transformedStats })
  } catch (error) {
    console.error('Error generating export:', error)
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
