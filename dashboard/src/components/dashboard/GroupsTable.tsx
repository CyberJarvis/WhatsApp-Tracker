'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, formatGrowth, getGrowthColor, truncateGroupId } from '@/lib/utils';
import type { GroupWithStats } from '@/lib/types';

interface GroupsTableProps {
  groups: GroupWithStats[];
  showSearch?: boolean;
  limit?: number;
}

type SortField = 'groupName' | 'currentMembers' | 'todayGrowth';
type SortDirection = 'asc' | 'desc';

export function GroupsTable({ groups, showSearch = true, limit }: GroupsTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('currentMembers');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  let filteredGroups = groups.filter((group) =>
    group.groupName.toLowerCase().includes(search.toLowerCase())
  );

  filteredGroups = [...filteredGroups].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  if (limit) {
    filteredGroups = filteredGroups.slice(0, limit);
  }

  return (
    <div>
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-sm font-medium text-gray-500">
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('groupName')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Group Name
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3">Group ID</th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('currentMembers')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Members
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  onClick={() => handleSort('todayGrowth')}
                  className="flex items-center gap-1 hover:text-gray-900"
                >
                  Today
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredGroups.map((group) => (
              <tr
                key={group.groupId}
                className="text-sm hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                  {group.groupName}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {truncateGroupId(group.groupId)}
                </td>
                <td className="px-4 py-3 text-gray-900">
                  {formatNumber(group.currentMembers)}
                </td>
                <td className={`px-4 py-3 font-medium ${getGrowthColor(group.todayGrowth)}`}>
                  {formatGrowth(group.todayGrowth)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={group.isActive ? 'success' : 'default'}>
                    {group.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/groups/${encodeURIComponent(group.groupId)}`}
                    className="text-green-600 hover:text-green-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredGroups.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No groups found
          </div>
        )}
      </div>
    </div>
  );
}
