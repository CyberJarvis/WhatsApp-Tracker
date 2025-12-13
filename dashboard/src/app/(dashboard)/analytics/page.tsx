'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MemberTrendChart } from '@/components/charts/MemberTrendChart';
import { GrowthBarChart } from '@/components/charts/GrowthBarChart';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { useSummary } from '@/hooks/useSummary';
import { useGroups } from '@/hooks/useGroups';
import { formatNumber, formatGrowth, getDateRange } from '@/lib/utils';
import type { GroupAnalytics } from '@/lib/types';

type DateRangeOption = '7' | '14' | '30';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeOption>('7');

  const { trend, isLoading: summaryLoading } = useSummary();
  const { groups, isLoading: groupsLoading } = useGroups();

  const isLoading = summaryLoading || groupsLoading;

  // Convert groups to analytics format
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
    isAnomaly: false,
    notes: [],
  }));

  // Calculate totals
  const totalMembers = groups.reduce((sum, g) => sum + g.currentMembers, 0);
  const totalGrowth = groups.reduce((sum, g) => sum + g.todayGrowth, 0);
  const growingGroups = groups.filter(g => g.todayGrowth > 0).length;
  const decliningGroups = groups.filter(g => g.todayGrowth < 0).length;

  return (
    <div className="flex flex-col">
      <Header
        title="Analytics"
        subtitle="Detailed insights into your WhatsApp groups"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <div className="flex gap-2">
            {(['7', '14', '30'] as DateRangeOption[]).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range} Days
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Total Members</p>
            <p className="text-2xl font-bold">
              {isLoading ? '-' : formatNumber(totalMembers)}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Net Growth Today</p>
            <p className={`text-2xl font-bold ${totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? '-' : formatGrowth(totalGrowth)}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Growing Groups</p>
            <p className="text-2xl font-bold text-green-600">
              {isLoading ? '-' : growingGroups}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Declining Groups</p>
            <p className="text-2xl font-bold text-red-600">
              {isLoading ? '-' : decliningGroups}
            </p>
          </Card>
        </div>

        {/* Member Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Total Member Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <MemberTrendChart data={trend} />
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Gainers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <GrowthBarChart data={groupAnalytics} type="gainers" limit={10} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 Losers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ChartSkeleton />
              ) : (
                <GrowthBarChart data={groupAnalytics} type="losers" limit={10} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group Size Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Groups by Size</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {[
                  { label: '< 100', filter: (m: number) => m < 100 },
                  { label: '100-250', filter: (m: number) => m >= 100 && m < 250 },
                  { label: '250-500', filter: (m: number) => m >= 250 && m < 500 },
                  { label: '500-1000', filter: (m: number) => m >= 500 && m < 1000 },
                  { label: '1000+', filter: (m: number) => m >= 1000 },
                ].map(({ label, filter }) => {
                  const count = groups.filter(g => filter(g.currentMembers)).length;
                  return (
                    <div key={label} className="rounded-lg bg-gray-50 p-4 text-center">
                      <p className="text-sm text-gray-500">{label} members</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-400">groups</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
