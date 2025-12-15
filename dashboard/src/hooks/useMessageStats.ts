import useSWR from 'swr'

interface MediaCount {
  text: number
  image: number
  video: number
  audio: number
  document: number
  sticker: number
  other: number
}

interface DailyStat {
  date: string
  totalMessages: number
  adminMessages: number
  userMessages: number
  mediaCount: MediaCount
}

interface HourlyStat {
  hour: number
  totalMessages: number
  adminMessages: number
  userMessages: number
}

interface MessageStatsResponse {
  period: string
  dateRange: { from: string; to: string }
  totals: {
    totalMessages: number
    adminMessages: number
    userMessages: number
  }
  dailyStats: DailyStat[]
  hourlyStats: HourlyStat[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface UseMessageStatsOptions {
  groupId?: string
  clusterIds?: string[]
  period?: string
  startDate?: string
  endDate?: string
}

export function useMessageStats(options: UseMessageStatsOptions | string | undefined = {}, periodArg?: string) {
  // Support both old API (groupId, period) and new API (options object)
  const opts: UseMessageStatsOptions = typeof options === 'string' || options === undefined
    ? { groupId: options, period: periodArg }
    : options

  const params = new URLSearchParams()
  if (opts.groupId) params.set('groupId', opts.groupId)
  if (opts.clusterIds && opts.clusterIds.length > 0) {
    params.set('clusterIds', opts.clusterIds.join(','))
  }
  // For custom period, use startDate and endDate
  if (opts.period === 'custom' && opts.startDate && opts.endDate) {
    params.set('startDate', opts.startDate)
    params.set('endDate', opts.endDate)
  } else {
    params.set('period', opts.period || 'week')
  }

  const { data, error, isLoading, mutate } = useSWR<MessageStatsResponse>(
    `/api/messages/stats?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 60000, // 1 minute
      revalidateOnFocus: false,
    }
  )

  return {
    stats: data,
    totals: data?.totals,
    dailyStats: data?.dailyStats || [],
    hourlyStats: data?.hourlyStats || [],
    isLoading,
    error,
    mutate,
  }
}
