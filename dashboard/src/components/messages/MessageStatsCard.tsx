'use client'

import { MessageSquare, Users, Shield, TrendingUp } from 'lucide-react'
import { useMessageStats } from '@/hooks/useMessageStats'

interface MessageStatsCardProps {
  groupId?: string
  clusterIds?: string[]
  period?: string
  startDate?: string
  endDate?: string
  disabled?: boolean
}

export function MessageStatsCard({ groupId, clusterIds, period = 'week', startDate, endDate, disabled = false }: MessageStatsCardProps) {
  const { totals: fetchedTotals, isLoading } = useMessageStats({ groupId, clusterIds, period, startDate, endDate })

  // When disabled (no groups selected), show zeroes
  const totals = disabled ? { totalMessages: 0, adminMessages: 0, userMessages: 0 } : fetchedTotals

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-white p-6 shadow-sm">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="mt-4 h-8 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      label: 'Total Messages',
      value: totals?.totalMessages || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Admin Messages',
      value: totals?.adminMessages || 0,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'User Messages',
      value: totals?.userMessages || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Admin %',
      value: totals?.totalMessages
        ? `${Math.round((totals.adminMessages / totals.totalMessages) * 100)}%`
        : '0%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg ${stat.bgColor} p-2`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">{stat.label}</span>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-gray-900">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
