'use client'

import { useMessageStats } from '@/hooks/useMessageStats'

interface ActivityHeatmapProps {
  groupId?: string
  clusterIds?: string[]
  disabled?: boolean
}

// Empty hourly stats (24 hours with 0 messages)
const emptyHourlyStats = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  totalMessages: 0,
  adminMessages: 0,
  userMessages: 0,
}))

export function ActivityHeatmap({ groupId, clusterIds, disabled = false }: ActivityHeatmapProps) {
  const { hourlyStats: fetchedHourlyStats, isLoading } = useMessageStats({ groupId, clusterIds, period: 'day' })

  // When disabled (no groups selected), show empty data
  const hourlyStats = disabled ? emptyHourlyStats : fetchedHourlyStats

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="h-40 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  // Find max value for color intensity
  const maxMessages = Math.max(...hourlyStats.map((h) => h.totalMessages), 1)

  // Get color intensity based on message count
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    const intensity = count / maxMessages
    if (intensity < 0.25) return 'bg-green-200'
    if (intensity < 0.5) return 'bg-green-400'
    if (intensity < 0.75) return 'bg-green-500'
    return 'bg-green-600'
  }

  // Format hour for display
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}${ampm}`
  }

  // Split hours into AM (0-11) and PM (12-23)
  const amHours = hourlyStats.filter(s => s.hour < 12)
  const pmHours = hourlyStats.filter(s => s.hour >= 12)

  const renderHourCell = (stat: typeof hourlyStats[0]) => (
    <div
      key={stat.hour}
      className={`group relative flex h-10 items-center justify-center rounded ${getColorIntensity(
        stat.totalMessages
      )} cursor-pointer transition-all hover:scale-110`}
      title={`${formatHour(stat.hour)}: ${stat.totalMessages} messages`}
    >
      <span className="text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100">
        {stat.totalMessages > 0 ? stat.totalMessages : ''}
      </span>
      {/* Tooltip */}
      <div className="absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
        {formatHour(stat.hour)}: {stat.totalMessages} messages
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
      </div>
    </div>
  )

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Hourly Activity (Today)</h3>

      {/* AM Row */}
      <div className="flex gap-1 mb-1">
        <div className="w-8 flex items-center justify-center text-xs font-medium text-gray-500">AM</div>
        <div className="flex-1 grid grid-cols-12 gap-1">
          {amHours.map(renderHourCell)}
        </div>
      </div>

      {/* PM Row */}
      <div className="flex gap-1">
        <div className="w-8 flex items-center justify-center text-xs font-medium text-gray-500">PM</div>
        <div className="flex-1 grid grid-cols-12 gap-1">
          {pmHours.map(renderHourCell)}
        </div>
      </div>

      {/* Hour labels (12, 1, 2, 3, ..., 11) */}
      <div className="flex gap-1 mt-2">
        <div className="w-8" /> {/* Spacer for row labels */}
        <div className="flex-1 grid grid-cols-12 gap-1">
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
            <div key={hour} className="text-center text-xs text-gray-400">
              {hour}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded bg-gray-100" />
          <div className="h-3 w-3 rounded bg-green-200" />
          <div className="h-3 w-3 rounded bg-green-400" />
          <div className="h-3 w-3 rounded bg-green-500" />
          <div className="h-3 w-3 rounded bg-green-600" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
