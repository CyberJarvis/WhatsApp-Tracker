import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Group from '@/models/Group'
import Snapshot from '@/models/Snapshot'
import DailyStat from '@/models/DailyStat'

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

    const userId = session.user.id
    await dbConnect()

    // Get all groups for this user
    const groups = await Group.find({ userId, isActive: true }).lean()

    // Get latest snapshots for each group
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        // Get latest snapshot
        const latestSnapshot = await Snapshot.findOne({ groupId: group._id })
          .sort({ timestamp: -1 })
          .lean()

        // Get today's and yesterday's stats
        const [todayStat, yesterdayStat] = await Promise.all([
          DailyStat.findOne({ groupId: group._id, date: today }).lean(),
          DailyStat.findOne({ groupId: group._id, date: yesterday }).lean(),
        ])

        const currentMembers = latestSnapshot?.totalMembers || 0
        const yesterdayMembers = yesterdayStat?.totalMembers || currentMembers
        const todayGrowth = todayStat?.netGrowth || 0

        return {
          groupId: group.groupId,
          groupName: group.groupName,
          currentMembers,
          yesterdayMembers,
          todayGrowth,
          isActive: group.isActive,
          addedAt: group.addedAt,
        }
      })
    )

    const activeCount = groups.length
    const inactiveCount = await Group.countDocuments({ userId, isActive: false })

    return NextResponse.json({
      groups: groupsWithStats,
      summary: {
        total: groups.length + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
      },
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}
