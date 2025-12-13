'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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
    .slice(0, limit)
    .map((item) => ({
      name: item.groupName.length > 20
        ? item.groupName.substring(0, 20) + '...'
        : item.groupName,
      value: item.netGrowth,
      fullName: item.groupName,
      members: item.currentMembers,
    }));

  if (sortedData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const barColor = type === 'gainers' ? '#22c55e' : '#ef4444';

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={95}
        />
        <Tooltip
          formatter={(value: number) => [
            `${value > 0 ? '+' : ''}${formatNumber(value)}`,
            'Net Growth',
          ]}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              return `${payload[0].payload.fullName} (${formatNumber(payload[0].payload.members)} members)`;
            }
            return label;
          }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
