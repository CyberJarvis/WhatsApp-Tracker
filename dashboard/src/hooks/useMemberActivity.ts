import useSWR from 'swr'

interface LeaderboardMember {
  rank: number
  memberId: string
  memberName: string
  messageCount: number
  lastMessageAt: string
  isAdmin: boolean
  activityLevel: string
  groupName: string
}

interface LeaderboardResponse {
  leaderboard: LeaderboardMember[]
  period: string
}

interface MemberHistorySummary {
  joins: number
  leaves: number
  netChange: number
}

interface MemberEvent {
  memberId: string
  memberName?: string
  eventType: 'join' | 'leave'
  timestamp: string
  groupName: string
}

interface MemberHistoryResponse {
  events: MemberEvent[]
  summary: MemberHistorySummary
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface LeaderboardOptions {
  groupId?: string
  clusterIds?: string[]
  period?: 'all' | 'today' | 'week'
  limit?: number
}

export function useMemberLeaderboard(
  options: LeaderboardOptions | string | undefined = {},
  periodArg?: string,
  limitArg?: number
) {
  // Support both old API (groupId, period, limit) and new API (options object)
  const opts: LeaderboardOptions = typeof options === 'string' || options === undefined
    ? { groupId: options, period: periodArg as 'all' | 'today' | 'week', limit: limitArg }
    : options

  const params = new URLSearchParams()
  if (opts.groupId) params.set('groupId', opts.groupId)
  if (opts.clusterIds && opts.clusterIds.length > 0) {
    params.set('clusterIds', opts.clusterIds.join(','))
  }
  params.set('period', opts.period || 'all')
  params.set('limit', (opts.limit || 10).toString())

  const { data, error, isLoading, mutate } = useSWR<LeaderboardResponse>(
    `/api/members/leaderboard?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  return {
    leaderboard: data?.leaderboard || [],
    period: data?.period,
    isLoading,
    error,
    mutate,
  }
}

export function useMemberHistory(groupId?: string, days: number = 7) {
  const params = new URLSearchParams()
  if (groupId) params.set('groupId', groupId)
  params.set('days', days.toString())

  const { data, error, isLoading, mutate } = useSWR<MemberHistoryResponse>(
    `/api/members/history?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  )

  return {
    events: data?.events || [],
    summary: data?.summary,
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  }
}
