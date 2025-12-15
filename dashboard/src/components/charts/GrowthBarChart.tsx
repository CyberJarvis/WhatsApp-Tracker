'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { GroupAnalytics } from '@/lib/types';

interface GrowthBarChartProps {
  data: GroupAnalytics[];
  type: 'gainers' | 'losers';
  limit?: number;
}

export function GrowthBarChart({ data, type, limit = 5 }: GrowthBarChartProps) {
  const sortedData = [...data]
    .sort((a, b) =>
      type === 'gainers' ? b.netGrowth - a.netGrowth : a.netGrowth - b.netGrowth
    )
    .slice(0, limit);

  if (sortedData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const isGainer = type === 'gainers';

  return (
    <div className="space-y-3">
      {sortedData.map((item, index) => (
        <div
          key={item.groupId}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900" title={item.groupName}>
                {item.groupName || 'Unnamed Group'}
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(item.currentMembers)} members
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 ${isGainer ? 'text-green-600' : 'text-red-600'}`}>
            {isGainer ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {item.netGrowth > 0 ? '+' : ''}{formatNumber(item.netGrowth)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
