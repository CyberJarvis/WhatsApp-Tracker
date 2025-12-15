'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KPICards } from '@/components/dashboard/KPICards';
import { GroupsTable } from '@/components/dashboard/GroupsTable';
import { MemberTrendChart } from '@/components/charts/MemberTrendChart';
import { GrowthBarChart } from '@/components/charts/GrowthBarChart';
import { AnomalyAlerts } from '@/components/dashboard/AnomalyAlerts';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { MessageStatsCard } from '@/components/messages/MessageStatsCard';
import { ActivityHeatmap } from '@/components/messages/ActivityHeatmap';
import { MemberLeaderboard } from '@/components/members/MemberLeaderboard';
import { PeriodSelector, PeriodOption, DateRange } from '@/components/ui/PeriodSelector';
import { useSummary } from '@/hooks/useSummary';
import { useGroups } from '@/hooks/useGroups';
import { useGroupFilter } from '@/components/groups/GroupFilterContext';
import { useSelectedClusters } from '@/hooks/useSelectedClusters';
import { MessageSquare, TrendingUp, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import type { GroupAnalytics } from '@/lib/types';

// Section header component for consistent styling
function SectionHeader({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-green-100 p-2">
          <Icon className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// Get period display text
const getPeriodText = (period: PeriodOption): string => {
  switch (period) {
    case 'today': return 'Today';
    case 'week': return '7 Days';
    case 'month': return '30 Days';
    case 'year': return '365 Days';
    case 'custom': return 'Custom Range';
    default: return '7 Days';
  }
};

export default function DashboardPage() {
  const { selectedGroupIds, selectedCount, selectAll } = useGroupFilter();
  const { selectedClusterIds, clusterFilterMode } = useSelectedClusters();

  // Period state for message stats
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('week');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const handlePeriodChange = (period: PeriodOption, customRange?: DateRange) => {
    setSelectedPeriod(period);
    if (period === 'custom' && customRange) {
      setCustomDateRange(customRange);
    }
  };

  // Map period to leaderboard period (leaderboard only supports today, week, all)
  const getLeaderboardPeriod = (period: PeriodOption): 'today' | 'week' | 'all' => {
    if (period === 'today') return 'today';
    if (period === 'week') return 'week';
    return 'all'; // month, year, custom -> all
  };

  // Pass selected groups to hooks for filtering (undefined = all groups)
  const groupIdsToFilter = selectAll ? undefined : selectedGroupIds;
  const clusterIdsToFilter = clusterFilterMode === 'selected' ? selectedClusterIds : undefined;

  // Check if "No Groups" is selected (not selectAll and empty selection)
  const noGroupsSelected = !selectAll && selectedGroupIds.length === 0;

  const { summary: fetchedSummary, trend: fetchedTrend, anomalies: fetchedAnomalies, isLoading: summaryLoading } = useSummary({
    groupIds: noGroupsSelected ? ['__none__'] : groupIdsToFilter,
    clusterIds: clusterIdsToFilter,
    period: selectedPeriod,
    startDate: selectedPeriod === 'custom' ? customDateRange?.from : undefined,
    endDate: selectedPeriod === 'custom' ? customDateRange?.to : undefined,
  });
  const { groups: fetchedGroups, isLoading: groupsLoading } = useGroups({
    groupIds: noGroupsSelected ? ['__none__'] : groupIdsToFilter,
    clusterIds: clusterIdsToFilter,
  });

  // When no groups selected, show empty data
  const summary = noGroupsSelected ? {
    totalGroups: 0,
    activeGroups: 0,
    totalMembers: 0,
    todayJoined: 0,
    todayLeft: 0,
    netGrowth: 0,
    anomalyCount: 0,
  } : fetchedSummary;
  const trend = noGroupsSelected ? [] : fetchedTrend;
  const groups = noGroupsSelected ? [] : fetchedGroups;

  // Use first selected group or undefined for all groups (for single-group components)
  const groupId = selectedCount === 1 ? selectedGroupIds[0] : undefined;

  // Convert groups to analytics format for charts
  const groupAnalytics: GroupAnalytics[] = groups.map(g => ({
    groupId: g.groupId,
    groupName: g.groupName,
    currentMembers: g.currentMembers,
    previousMembers: g.yesterdayMembers || g.currentMembers,
    joined: g.todayGrowth > 0 ? g.todayGrowth : 0,
    left: g.todayGrowth < 0 ? Math.abs(g.todayGrowth) : 0,
    netGrowth: g.todayGrowth,
    percentageChange: g.yesterdayMembers
      ? ((g.currentMembers - g.yesterdayMembers) / g.yesterdayMembers) * 100
      : 0,
    isAnomaly: g.yesterdayMembers
      ? Math.abs((g.currentMembers - g.yesterdayMembers) / g.yesterdayMembers) > 0.1
      : false,
    notes: [],
  }));

  // Convert API anomalies to GroupAnalytics format for the AnomalyAlerts component
  const anomalies: GroupAnalytics[] = noGroupsSelected ? [] : (fetchedAnomalies || []).map(a => ({
    groupId: a.groupId,
    groupName: a.groupName,
    currentMembers: a.currentMembers,
    previousMembers: a.previousMembers,
    joined: 0,
    left: Math.abs(a.netGrowth),
    netGrowth: a.netGrowth,
    percentageChange: a.percentageChange,
    isAnomaly: true,
    notes: [a.notes],
  }));

  const topGainers = [...groupAnalytics]
    .filter(g => g.netGrowth > 0)
    .sort((a, b) => b.netGrowth - a.netGrowth)
    .slice(0, 5);
  const topLosers = [...groupAnalytics]
    .filter(g => g.netGrowth < 0)
    .sort((a, b) => a.netGrowth - b.netGrowth)
    .slice(0, 5);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Dashboard"
        subtitle="Overview of your WhatsApp group analytics"
      />

      <div className="flex-1 p-6">
        {/* Top Bar with Period Selector */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-500">Live data</span>
          </div>
          <PeriodSelector
            value={selectedPeriod}
            onChange={handlePeriodChange}
            customRange={customDateRange}
          />
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          {summaryLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : summary ? (
            <KPICards summary={summary} period={selectedPeriod} />
          ) : null}
        </div>

        {/* Message Activity Section */}
        <div className="mb-8">
          <SectionHeader icon={MessageSquare} title="Message Activity" />
          <MessageStatsCard
            groupId={noGroupsSelected ? '__none__' : groupId}
            clusterIds={clusterIdsToFilter}
            period={selectedPeriod}
            startDate={selectedPeriod === 'custom' ? customDateRange?.from : undefined}
            endDate={selectedPeriod === 'custom' ? customDateRange?.to : undefined}
            disabled={noGroupsSelected}
          />
        </div>

        {/* Activity & Leaderboard Row */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActivityHeatmap
            groupId={noGroupsSelected ? '__none__' : groupId}
            clusterIds={clusterIdsToFilter}
            disabled={noGroupsSelected}
          />
          <MemberLeaderboard
            groupId={noGroupsSelected ? '__none__' : groupId}
            clusterIds={clusterIdsToFilter}
            period={getLeaderboardPeriod(selectedPeriod)}
            limit={5}
            disabled={noGroupsSelected}
          />
        </div>

        {/* Member Trends Section */}
        <div className="mb-8">
          <SectionHeader icon={TrendingUp} title="Member Trends" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Member Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Member Growth ({getPeriodText(selectedPeriod)})</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <ChartSkeleton />
                ) : (
                  <MemberTrendChart data={trend} />
                )}
              </CardContent>
            </Card>

            {/* Anomaly Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Anomaly Alerts</CardTitle>
                {anomalies.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                    <AlertTriangle className="h-3 w-3" />
                    {anomalies.length} alerts
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <AnomalyAlerts anomalies={anomalies} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Growth Analysis Section */}
        <div className="mb-8">
          <SectionHeader icon={BarChart3} title="Growth Analysis" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top Gainers</CardTitle>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    +{topGainers.reduce((sum, g) => sum + g.netGrowth, 0)} members
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <GrowthBarChart data={topGainers} type="gainers" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top Losers</CardTitle>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {topLosers.reduce((sum, g) => sum + g.netGrowth, 0)} members
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <ChartSkeleton />
                ) : (
                  <GrowthBarChart data={topLosers} type="losers" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Groups Overview Section */}
        <div>
          <SectionHeader icon={Users} title="Groups Overview" />
          <Card>
            <CardContent className="pt-6">
              {groupsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : (
                <GroupsTable groups={groups} limit={10} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
