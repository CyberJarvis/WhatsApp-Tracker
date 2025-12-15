'use client'

import { Trophy, MessageSquare, Clock, Shield } from 'lucide-react'
import { useMemberLeaderboard } from '@/hooks/useMemberActivity'

interface MemberLeaderboardProps {
  groupId?: string
  clusterIds?: string[]
  period?: 'all' | 'today' | 'week'
  limit?: number
  disabled?: boolean
}

export function MemberLeaderboard({
  groupId,
  clusterIds,
  period = 'all',
  limit = 10,
  disabled = false,
}: MemberLeaderboardProps) {
  const { leaderboard: fetchedLeaderboard, isLoading } = useMemberLeaderboard({ groupId, clusterIds, period, limit })

  // When disabled (no groups selected), show empty leaderboard
  const leaderboard = disabled ? [] : fetchedLeaderboard

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />
      case 3:
        return <Trophy className="h-5 w-5 text-orange-400" />
      default:
        return (
          <span className="flex h-5 w-5 items-center justify-center text-sm font-medium text-gray-500">
            {rank}
          </span>
        )
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const periodLabels = {
    all: 'All Time',
    today: 'Today',
    week: 'This Week',
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Top Active Members</h3>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          {periodLabels[period]}
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          No activity data available
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((member) => (
            <div
              key={`${member.memberId}-${member.groupName}`}
              className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50"
            >
              {/* Rank Badge */}
              <div className="flex h-8 w-8 items-center justify-center">
                {getRankBadge(member.rank)}
              </div>

              {/* Avatar */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white">
                {member.memberName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900">
                    {member.memberName}
                  </span>
                  {member.isAdmin && (
                    <span title="Admin">
                      <Shield className="h-4 w-4 text-purple-500" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="truncate">{member.groupName}</span>
                  {member.lastMessageAt && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(member.lastMessageAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Message Count */}
              <div className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">
                  {member.messageCount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
