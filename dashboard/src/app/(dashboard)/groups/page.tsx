'use client';

import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { GroupsTable } from '@/components/dashboard/GroupsTable';
import { Badge } from '@/components/ui/Badge';
import { useGroups } from '@/hooks/useGroups';
import { formatNumber } from '@/lib/utils';

export default function GroupsPage() {
  const { groups, summary, isLoading } = useGroups();

  return (
    <div className="flex flex-col">
      <Header
        title="Groups"
        subtitle="Manage and view all tracked WhatsApp groups"
      />

      <div className="flex-1 space-y-6 p-6">
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

        {/* Groups Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Groups</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            ) : (
              <GroupsTable groups={groups} showSearch={true} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
