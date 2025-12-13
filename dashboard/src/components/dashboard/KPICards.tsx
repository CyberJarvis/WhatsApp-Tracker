'use client';

import { Users, UserPlus, UserMinus, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatGrowth, getGrowthColor } from '@/lib/utils';
import type { DashboardSummary } from '@/lib/types';

interface KPICardsProps {
  summary: DashboardSummary;
}

export function KPICards({ summary }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Groups',
      value: formatNumber(summary.activeGroups),
      subtitle: `${summary.totalGroups} total`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Members',
      value: formatNumber(summary.totalMembers),
      subtitle: 'Across all groups',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Joined Today',
      value: formatGrowth(summary.todayJoined),
      subtitle: 'New members',
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Left Today',
      value: formatNumber(summary.todayLeft),
      subtitle: 'Members left',
      icon: UserMinus,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Net Growth',
      value: formatGrowth(summary.netGrowth),
      subtitle: 'Today\'s change',
      icon: TrendingUp,
      color: getGrowthColor(summary.netGrowth),
      bgColor: summary.netGrowth >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
    {
      title: 'Anomalies',
      value: formatNumber(summary.anomalyCount),
      subtitle: 'Require attention',
      icon: AlertTriangle,
      color: summary.anomalyCount > 0 ? 'text-yellow-600' : 'text-gray-600',
      bgColor: summary.anomalyCount > 0 ? 'bg-yellow-100' : 'bg-gray-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
            </div>
            <div className={`rounded-lg ${card.bgColor} p-2`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
