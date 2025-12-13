'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatNumber, formatDate } from '@/lib/utils';
import type { TrendDataPoint } from '@/lib/types';

interface MemberTrendChartProps {
  data: TrendDataPoint[];
}

export function MemberTrendChart({ data }: MemberTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatDate(value)}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis
          tickFormatter={(value) => formatNumber(value)}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <Tooltip
          formatter={(value: number) => formatNumber(value)}
          labelFormatter={(label) => formatDate(label)}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalMembers"
          name="Total Members"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ fill: '#22c55e', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
