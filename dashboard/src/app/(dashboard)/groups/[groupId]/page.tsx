'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MemberTrendChart } from '@/components/charts/MemberTrendChart';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { useGroups } from '@/hooks/useGroups';
import { useSnapshots } from '@/hooks/useSnapshots';
import { formatNumber, formatGrowth, formatDateTime, getGrowthColor } from '@/lib/utils';
import type { TrendDataPoint } from '@/lib/types';

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = decodeURIComponent(params.groupId as string);

  const { groups, isLoading: groupsLoading } = useGroups();
  const { snapshots, isLoading: snapshotsLoading } = useSnapshots(groupId, 7);

  const group = groups.find(g => g.groupId === groupId);

  // Convert snapshots to trend data
  const trendData: TrendDataPoint[] = snapshots.map(s => ({
    date: s.timestamp,
    totalMembers: s.totalMembers,
    joined: 0,
    left: 0,
    netGrowth: 0,
  }));

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
        title={group.groupName}
        subtitle={`Group ID: ${groupId}`}
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Back Link */}
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Groups
        </Link>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">Current Members</p>
            <p className="text-2xl font-bold">{formatNumber(group.currentMembers)}</p>
          </Card>

          <Card>
            <p className="text-sm text-gray-500">Today's Change</p>
            <p className={`text-2xl font-bold ${getGrowthColor(group.todayGrowth)}`}>
              {formatGrowth(group.todayGrowth)}
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

        {/* Member Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Member Trend (7 Days)</CardTitle>
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
