import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Group from '@/models/Group'
import Snapshot from '@/models/Snapshot'
import DailyStat from '@/models/DailyStat'
import mongoose from 'mongoose'

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

    const today = new Date().toISOString().split('T')[0]

    // Get all active groups count
    const totalGroups = await Group.countDocuments({ userId, isActive: true })

    // Get total members from latest snapshots for each group
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const latestSnapshots = await Snapshot.aggregate([
      { $match: { userId: userObjectId } },
      { $sort: { groupId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$groupId',
          totalMembers: { $first: '$totalMembers' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ])

    const totalMembers = latestSnapshots.reduce((sum, s) => sum + (s.totalMembers || 0), 0)

    // Get today's stats from DailyStat (for joined/left tracking)
    const todayStats = await DailyStat.find({ userId, date: today }).lean()

    const totalJoined = todayStats.reduce((sum, s) => sum + s.joinedToday, 0)
    const totalLeft = todayStats.reduce((sum, s) => sum + s.leftToday, 0)
    const netGrowth = totalJoined - totalLeft
    const anomalyCount = todayStats.filter(s => s.notes && s.notes.includes('Large')).length

    // Get 7-day trend data
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const trendStats = await DailyStat.aggregate([
      {
        $match: {
          userId: userObjectId,
          date: { $gte: sevenDaysAgo.toISOString().split('T')[0] },
        },
      },
      {
        $group: {
          _id: '$date',
          totalMembers: { $sum: '$totalMembers' },
          joined: { $sum: '$joinedToday' },
          left: { $sum: '$leftToday' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    const trend = trendStats.map((stat) => ({
      date: stat._id,
      totalMembers: stat.totalMembers,
      joined: stat.joined,
      left: stat.left,
      netGrowth: stat.joined - stat.left,
    }))

    // Get inactive groups count
    const inactiveGroups = await Group.countDocuments({ userId, isActive: false })

    return NextResponse.json({
      summary: {
        totalGroups: totalGroups + inactiveGroups,
        activeGroups: totalGroups,
        totalMembers,
        todayJoined: totalJoined,
        todayLeft: totalLeft,
        netGrowth,
        anomalyCount,
      },
      trend,
    })
  } catch (error) {
    console.error('Error fetching summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
