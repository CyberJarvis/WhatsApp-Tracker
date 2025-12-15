'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { MemberLeaderboard } from '@/components/members/MemberLeaderboard'
import { JoinLeaveChart } from '@/components/members/JoinLeaveChart'
import { ErrorState } from '@/components/ui/ErrorState'
import { useGroupFilter } from '@/components/groups/GroupFilterContext'
import { useMemberHistory } from '@/hooks/useMemberActivity'
import { Users, UserPlus, UserMinus, Search, Download } from 'lucide-react'

type Period = 'all' | 'today' | 'week'

export default function MembersPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [historyDays, setHistoryDays] = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  const { selectedGroupIds, selectedCount } = useGroupFilter()

  // Use first selected group or undefined for all groups
  const groupId = selectedCount === 1 ? selectedGroupIds[0] : undefined
  const { events, summary, isLoading: historyLoading, error: historyError, mutate: mutateHistory } = useMemberHistory(groupId, historyDays)

  // Filter events by search query
  const filteredEvents = events.filter((event) =>
    event.memberName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Member Analytics"
        subtitle="Track member activity, engagement, and growth"
      />

      <main className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Leaderboard Period:</span>
            <div className="flex rounded-lg bg-white border border-gray-200 p-1">
              {(['today', 'week', 'all'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === p
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">History:</span>
            <div className="flex rounded-lg bg-white border border-gray-200 p-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setHistoryDays(days)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    historyDays === days
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Net Change</span>
            </div>
            <p className={`mt-4 text-2xl font-bold ${(summary?.netChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(summary?.netChange || 0) >= 0 ? '+' : ''}{summary?.netChange || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">Last {historyDays} days</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">New Joins</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-green-600">
              +{summary?.joins || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">Last {historyDays} days</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <UserMinus className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Members Left</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-red-600">
              -{summary?.leaves || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">Last {historyDays} days</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Leaderboard */}
          <MemberLeaderboard groupId={groupId} period={period} limit={10} />

          {/* Join/Leave Chart */}
          <JoinLeaveChart groupId={groupId} days={historyDays} />
        </div>

        {/* Recent Member Events */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Member Events</h3>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              {/* Export */}
              <button
                onClick={() => {
                  const csv = [
                    'Member,Group,Event,Time',
                    ...filteredEvents.map(
                      (e) =>
                        `"${e.memberName}","${e.groupName}","${e.eventType}","${new Date(
                          e.timestamp
                        ).toLocaleString()}"`
                    ),
                  ].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `member-events-${new Date().toISOString().split('T')[0]}.csv`
                  a.click()
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-24 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : historyError ? (
            <ErrorState
              title="Failed to load member events"
              message="Unable to fetch member history. Please try again."
              onRetry={() => mutateHistory()}
            />
          ) : filteredEvents.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchQuery ? 'No matching members found' : 'No member events in this period'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-3">Member</th>
                    <th className="pb-3">Group</th>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEvents.slice(0, 50).map((event) => (
                    <tr key={`${event.memberId}-${event.timestamp}`} className="hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-sm font-medium text-white">
                            {(event.memberName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{event.memberName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{event.groupName}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            event.eventType === 'join'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {event.eventType === 'join' ? (
                            <UserPlus className="h-3 w-3" />
                          ) : (
                            <UserMinus className="h-3 w-3" />
                          )}
                          {event.eventType === 'join' ? 'Joined' : 'Left'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length > 50 && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Showing 50 of {filteredEvents.length} events
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
