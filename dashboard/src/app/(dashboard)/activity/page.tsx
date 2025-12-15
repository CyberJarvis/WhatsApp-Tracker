'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { MessageStatsCard } from '@/components/messages/MessageStatsCard'
import { MessageActivityChart } from '@/components/messages/MessageActivityChart'
import { ActivityHeatmap } from '@/components/messages/ActivityHeatmap'
import { useGroupFilter } from '@/components/groups/GroupFilterContext'

type Period = 'day' | 'week' | 'month'
type ChartType = 'line' | 'bar'

export default function ActivityPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [chartType, setChartType] = useState<ChartType>('line')
  const { selectedGroupIds, selectedCount } = useGroupFilter()

  // Use first selected group or undefined for all groups
  const groupId = selectedCount === 1 ? selectedGroupIds[0] : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Message Activity"
        subtitle="Track message patterns and engagement across your groups"
      />

      <main className="p-6 space-y-6">
        {/* Period and Chart Type Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <div className="flex rounded-lg bg-white border border-gray-200 p-1">
              {(['day', 'week', 'month'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Chart:</span>
            <div className="flex rounded-lg bg-white border border-gray-200 p-1">
              {(['line', 'bar'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    chartType === type
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <MessageStatsCard groupId={groupId} period={period} />

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Message Activity Chart */}
          <div className="lg:col-span-2">
            <MessageActivityChart
              groupId={groupId}
              period={period}
              chartType={chartType}
            />
          </div>

          {/* Activity Heatmap */}
          <div className="lg:col-span-2">
            <ActivityHeatmap groupId={groupId} />
          </div>
        </div>

        {/* Group Comparison Section */}
        {selectedCount > 1 && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Group Activity Comparison
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedGroupIds.slice(0, 6).map((gId) => (
                <div
                  key={gId}
                  className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-green-300 hover:bg-green-50/30"
                >
                  <MessageStatsCard groupId={gId} period={period} />
                </div>
              ))}
            </div>
            {selectedCount > 6 && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Showing 6 of {selectedCount} selected groups
              </p>
            )}
          </div>
        )}

        {/* Tips Section */}
        <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 border border-green-100">
          <h3 className="font-semibold text-green-800">Understanding Activity Patterns</h3>
          <ul className="mt-3 space-y-2 text-sm text-green-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span>The heatmap shows peak activity hours - use this to optimize announcement timing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span>Compare admin vs user messages to gauge engagement balance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span>Track trends over time to identify growing or declining groups</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
