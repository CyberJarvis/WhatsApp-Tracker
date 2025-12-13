'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { KPICards } from '@/components/dashboard/KPICards';
import { GroupsTable } from '@/components/dashboard/GroupsTable';
import { MemberTrendChart } from '@/components/charts/MemberTrendChart';
import { GrowthBarChart } from '@/components/charts/GrowthBarChart';
import { AnomalyAlerts } from '@/components/dashboard/AnomalyAlerts';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { useSummary } from '@/hooks/useSummary';
import { useGroups } from '@/hooks/useGroups';
import type { GroupAnalytics } from '@/lib/types';

export default function DashboardPage() {
  const { summary, trend, isLoading: summaryLoading } = useSummary();
  const { groups, isLoading: groupsLoading } = useGroups();

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

  const anomalies = groupAnalytics.filter(g => g.isAnomaly && g.netGrowth < 0);
  const topGainers = [...groupAnalytics]
    .filter(g => g.netGrowth > 0)
    .sort((a, b) => b.netGrowth - a.netGrowth)
    .slice(0, 5);
  const topLosers = [...groupAnalytics]
    .filter(g => g.netGrowth < 0)
    .sort((a, b) => a.netGrowth - b.netGrowth)
    .slice(0, 5);

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        subtitle="Overview of your WhatsApp group analytics"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI Cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : summary ? (
          <KPICards summary={summary} />
        ) : null}

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Member Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Member Trend (7 Days)</CardTitle>
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
            <CardHeader>
              <CardTitle>Anomaly Alerts</CardTitle>
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

        {/* Top Gainers & Losers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Gainers</CardTitle>
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
              <CardTitle>Top Losers</CardTitle>
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

        {/* Groups Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Groups</CardTitle>
          </CardHeader>
          <CardContent>
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
  );
}
