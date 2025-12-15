'use client';

import { Users, UserPlus, UserMinus, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatGrowth, getGrowthColor } from '@/lib/utils';
import type { DashboardSummary } from '@/lib/types';

type PeriodOption = 'today' | 'week' | 'month' | 'year' | 'custom';

interface KPICardsProps {
  summary: DashboardSummary;
  period?: PeriodOption;
}

// Get period-specific subtitles
const getPeriodSubtitles = (period: PeriodOption) => {
  switch (period) {
    case 'today':
      return { period: 'Today', growth: "Today's change" };
    case 'week':
      return { period: 'This week', growth: 'This week' };
    case 'month':
      return { period: 'This month', growth: 'This month' };
    case 'year':
      return { period: 'This year', growth: 'This year' };
    case 'custom':
      return { period: 'Selected period', growth: 'Selected period' };
    default:
      return { period: 'Today', growth: "Today's change" };
  }
};

export function KPICards({ summary, period = 'today' }: KPICardsProps) {
  const subtitles = getPeriodSubtitles(period);

  const cards = [
    {
      title: 'Groups',
      value: formatNumber(summary.activeGroups),
      subtitle: `${summary.totalGroups} total`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-l-blue-500',
    },
    {
      title: 'Members',
      value: formatNumber(summary.totalMembers),
      subtitle: 'Across all groups',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Joined',
      value: formatGrowth(summary.todayJoined),
      subtitle: subtitles.period,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Left',
      value: formatNumber(summary.todayLeft),
      subtitle: subtitles.period,
      icon: UserMinus,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-l-red-500',
    },
    {
      title: 'Net Growth',
      value: formatGrowth(summary.netGrowth),
      subtitle: subtitles.growth,
      icon: TrendingUp,
      color: getGrowthColor(summary.netGrowth),
      bgColor: summary.netGrowth >= 0 ? 'bg-green-100' : 'bg-red-100',
      borderColor: summary.netGrowth >= 0 ? 'border-l-green-500' : 'border-l-red-500',
    },
    {
      title: 'Anomalies',
      value: formatNumber(summary.anomalyCount),
      subtitle: 'Require attention',
      icon: AlertTriangle,
      color: summary.anomalyCount > 0 ? 'text-yellow-600' : 'text-gray-600',
      bgColor: summary.anomalyCount > 0 ? 'bg-yellow-100' : 'bg-gray-100',
      borderColor: summary.anomalyCount > 0 ? 'border-l-yellow-500' : 'border-l-gray-300',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className={`relative overflow-hidden border-l-4 ${card.borderColor}`}>
          {/* Icon in top right corner */}
          <div className={`absolute top-3 right-3 rounded-lg ${card.bgColor} p-2`}>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          {/* Content */}
          <div className="pr-12">
            <p className="text-sm font-medium text-gray-500">{card.title}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
            <p className="mt-1 text-xs text-gray-400">{card.subtitle}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
