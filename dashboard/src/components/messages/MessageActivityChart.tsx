'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { useMessageStats } from '@/hooks/useMessageStats'

interface MessageActivityChartProps {
  groupId?: string
  period?: string
  chartType?: 'line' | 'bar'
}

export function MessageActivityChart({
  groupId,
  period = 'week',
  chartType = 'line',
}: MessageActivityChartProps) {
  const { dailyStats, isLoading } = useMessageStats(groupId, period)

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl bg-white p-6 shadow-sm">
        <div className="h-full w-full animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  const chartData = dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    total: stat.totalMessages,
    admin: stat.adminMessages,
    user: stat.userMessages,
  }))

  if (chartType === 'bar') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Message Activity</h3>
        <div className="h-80">
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
              />
              <Legend />
              <Bar dataKey="admin" name="Admin" fill="#8b5cf6" stackId="messages" />
              <Bar dataKey="user" name="Users" fill="#22c55e" stackId="messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Message Activity</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="admin"
              name="Admin"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="user"
              name="Users"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
