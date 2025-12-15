'use client';

import { AlertTriangle, TrendingDown, X, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, formatPercentage } from '@/lib/utils';
import type { GroupAnalytics } from '@/lib/types';

interface AnomalyAlertsProps {
  anomalies: GroupAnalytics[];
}

export function AnomalyAlerts({ anomalies }: AnomalyAlertsProps) {
  if (anomalies.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-900">All Clear</p>
            <p className="text-sm text-green-700">No anomalies detected in selected period</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly) => (
        <Card
          key={anomaly.groupId}
          className="border-yellow-200 bg-yellow-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-900">{anomaly.groupName}</p>
                <p className="text-sm text-yellow-700">
                  Lost {formatNumber(Math.abs(anomaly.netGrowth))} members
                  ({formatPercentage(anomaly.percentageChange)})
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="warning">Anomaly</Badge>
                  <span className="text-xs text-yellow-600">
                    {formatNumber(anomaly.previousMembers)} → {formatNumber(anomaly.currentMembers)} members
                  </span>
                </div>
              </div>
            </div>
            <button className="text-yellow-600 hover:text-yellow-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
