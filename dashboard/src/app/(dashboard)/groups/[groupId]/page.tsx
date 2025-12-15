'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MemberTrendChart } from '@/components/charts/MemberTrendChart';
import { MessageStatsCard } from '@/components/messages/MessageStatsCard';
import { ActivityHeatmap } from '@/components/messages/ActivityHeatmap';
import { MemberLeaderboard } from '@/components/members/MemberLeaderboard';
import { PeriodSelector, PeriodOption, DateRange } from '@/components/ui/PeriodSelector';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { useGroups } from '@/hooks/useGroups';
import { useSnapshots } from '@/hooks/useSnapshots';
import { formatNumber, formatGrowth, formatDateTime, getGrowthColor } from '@/lib/utils';
import type { TrendDataPoint } from '@/lib/types';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = decodeURIComponent(params.groupId as string);

  // Period state
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('week');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const handlePeriodChange = (period: PeriodOption, customRange?: DateRange) => {
    setSelectedPeriod(period);
    if (period === 'custom' && customRange) {
      setCustomDateRange(customRange);
    }
  };

  // Map period to days for snapshots
  const getPeriodDays = (period: PeriodOption): number => {
    switch (period) {
      case 'today': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      case 'custom':
        if (customDateRange) {
          const from = new Date(customDateRange.from);
          const to = new Date(customDateRange.to);
          return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 7;
      default: return 7;
    }
  };

  // Map period to leaderboard period
  const getLeaderboardPeriod = (period: PeriodOption): 'today' | 'week' | 'all' => {
    if (period === 'today') return 'today';
    if (period === 'week') return 'week';
    return 'all';
  };

  const { groups, isLoading: groupsLoading } = useGroups();
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots(groupId, getPeriodDays(selectedPeriod));

  const group = groups.find(g => g.groupId === groupId);

  // Convert snapshots to trend data
  const trendData: TrendDataPoint[] = snapshots.map(s => ({
    date: s.timestamp,
    totalMembers: s.totalMembers,
    joined: 0,
    left: 0,
    netGrowth: 0,
  }));

  // Calculate period change from snapshots
  const calculatePeriodChange = (): number => {
    if (snapshots.length < 2) return group?.todayGrowth || 0;

    // Sort snapshots by timestamp (oldest first)
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const oldestMembers = sortedSnapshots[0]?.totalMembers || 0;
    const latestMembers = sortedSnapshots[sortedSnapshots.length - 1]?.totalMembers || 0;

    return latestMembers - oldestMembers;
  };

  // Get label for period change
  const getPeriodChangeLabel = (): string => {
    switch (selectedPeriod) {
      case 'today': return "Today's Change";
      case 'week': return "This Week's Change";
      case 'month': return "This Month's Change";
      case 'year': return "This Year's Change";
      case 'custom': return "Period Change";
      default: return "Today's Change";
    }
  };

  const periodChange = calculatePeriodChange();

  if (groupsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg text-gray-500">Group not found</p>
        <Link href="/groups" className="mt-4 text-green-600 hover:underline">
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title={group.groupName || 'Unnamed Group'}
        subtitle={`Group ID: ${groupId}`}
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Back Link and Period Selector */}
        <div className="flex items-center justify-between">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Groups
          </Link>
          <PeriodSelector
            value={selectedPeriod}
            onChange={handlePeriodChange}
            customRange={customDateRange}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Current Members</p>
            <p className="text-2xl font-bold">{formatNumber(group.currentMembers)}</p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">{getPeriodChangeLabel()}</p>
            <p className={`text-2xl font-bold ${getGrowthColor(periodChange)}`}>
              {snapshotsLoading ? '...' : formatGrowth(periodChange)}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1">
              <Badge variant={group.isActive ? 'success' : 'default'} className="text-base">
                {group.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Added On</p>
            <p className="text-lg font-medium">{group.addedAt || 'Unknown'}</p>
          </Card>
        </div>

        {/* Message Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Message Activity</h2>
          <MessageStatsCard
            groupId={groupId}
            period={selectedPeriod}
            startDate={selectedPeriod === 'custom' ? customDateRange?.from : undefined}
            endDate={selectedPeriod === 'custom' ? customDateRange?.to : undefined}
          />
        </div>

        {/* Activity Heatmap & Leaderboard */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActivityHeatmap groupId={groupId} />
          <MemberLeaderboard groupId={groupId} period={getLeaderboardPeriod(selectedPeriod)} limit={10} />
        </div>

        {/* Member Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              Member Trend ({selectedPeriod === 'today' ? 'Today' :
                selectedPeriod === 'week' ? '7 Days' :
                selectedPeriod === 'month' ? '30 Days' :
                selectedPeriod === 'year' ? '365 Days' :
                selectedPeriod === 'custom' ? 'Custom Range' : '7 Days'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <ChartSkeleton />
            ) : (
              <MemberTrendChart data={trendData} />
            )}
          </CardContent>
        </Card>

        {/* Recent Snapshots */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshotsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-sm font-medium text-gray-500">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Members</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {snapshots.slice(-10).reverse().map((snapshot, idx) => (
                      <tr key={idx} className="text-sm hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {formatDateTime(snapshot.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatNumber(snapshot.totalMembers)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {snapshots.length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    No snapshots available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
