'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { GroupsTable } from '@/components/dashboard/GroupsTable';
import { Badge } from '@/components/ui/Badge';
import { ClusterSidebar } from '@/components/clusters/ClusterSidebar';
import { ErrorState } from '@/components/ui/ErrorState';
import { useGroups } from '@/hooks/useGroups';
import { useGroupFilter } from '@/components/groups/GroupFilterContext';
import { useSelectedClusters } from '@/hooks/useSelectedClusters';
import { formatNumber } from '@/lib/utils';

export default function GroupsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedGroupIds, selectAll } = useGroupFilter();
  const { selectedClusterIds, clusterFilterMode } = useSelectedClusters();

  const groupIdsToFilter = selectAll ? undefined : selectedGroupIds;
  const clusterIdsToFilter = clusterFilterMode === 'selected' ? selectedClusterIds : undefined;

  const { groups, summary, isLoading, isError, mutate } = useGroups({
    groupIds: groupIdsToFilter,
    clusterIds: clusterIdsToFilter,
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Groups"
        subtitle="Manage and view all tracked WhatsApp groups"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Cluster Sidebar */}
        <ClusterSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Groups</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '-' : formatNumber(summary?.total || 0)}
                  </p>
                </div>
                <Badge variant="info">All</Badge>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Groups</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isLoading ? '-' : formatNumber(summary?.active || 0)}
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactive Groups</p>
                  <p className="text-2xl font-bold text-gray-500">
                    {isLoading ? '-' : formatNumber(summary?.inactive || 0)}
                  </p>
                </div>
                <Badge variant="default">Inactive</Badge>
              </div>
            </Card>
          </div>

          {/* Active Filter Indicator */}
          {clusterFilterMode === 'selected' && selectedClusterIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2 dark:bg-blue-900/20 dark:text-blue-300">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtered by {selectedClusterIds.length} {selectedClusterIds.length === 1 ? 'category' : 'categories'}
            </div>
          )}

          {/* Groups Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {clusterFilterMode === 'selected' && selectedClusterIds.length > 0
                  ? 'Filtered Groups'
                  : 'All Groups'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState
                  title="Failed to load groups"
                  message="Unable to fetch groups data. Please check your connection and try again."
                  onRetry={() => mutate()}
                />
              ) : (
                <GroupsTable groups={groups} showSearch={true} showClusters={true} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
