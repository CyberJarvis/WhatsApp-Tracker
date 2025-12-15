'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { UserPlus, UserMinus, TrendingUp } from 'lucide-react'
import { useMemberHistory } from '@/hooks/useMemberActivity'

interface JoinLeaveChartProps {
  groupId?: string
  days?: number
}

export function JoinLeaveChart({ groupId, days = 7 }: JoinLeaveChartProps) {
  const { events, summary, isLoading } = useMemberHistory(groupId, days)

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="h-80 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  // Group events by date
  const eventsByDate = events.reduce<Record<string, { joins: number; leaves: number }>>(
    (acc, event) => {
      const date = new Date(event.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      if (!acc[date]) {
        acc[date] = { joins: 0, leaves: 0 }
      }
      if (event.eventType === 'join') {
        acc[date].joins++
      } else {
        acc[date].leaves++
      }
      return acc
    },
    {}
  )

  // Convert to chart data
  const chartData = Object.entries(eventsByDate)
    .map(([date, data]) => ({
      date,
      joins: data.joins,
      leaves: -data.leaves, // Negative for visual effect
      net: data.joins - data.leaves,
    }))
    .reverse()

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Member Flow</h3>
        <span className="text-sm text-gray-500">Last {days} days</span>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-green-50 p-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">Joined</span>
          </div>
          <p className="mt-1 text-xl font-bold text-green-700">
            +{summary?.joins || 0}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-600">Left</span>
          </div>
          <p className="mt-1 text-xl font-bold text-red-700">
            -{summary?.leaves || 0}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Net</span>
          </div>
          <p
            className={`mt-1 text-xl font-bold ${
              (summary?.netChange || 0) >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {(summary?.netChange || 0) >= 0 ? '+' : ''}
            {summary?.netChange || 0}
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'leaves') return [Math.abs(value), 'Left']
                  return [value, name === 'joins' ? 'Joined' : 'Net']
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Bar dataKey="joins" name="Joined" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leaves" name="Left" fill="#ef4444" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-gray-500">
          No member activity in this period
        </div>
      )}
    </div>
  )
}
