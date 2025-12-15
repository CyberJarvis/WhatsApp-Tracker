import useSWR from 'swr';
import type { DashboardSummary, TrendDataPoint, AnomalyRecord } from '@/lib/types';

interface SummaryResponse {
  summary: DashboardSummary;
  trend: TrendDataPoint[];
  anomalies: AnomalyRecord[];
}

interface UseSummaryOptions {
  groupIds?: string[];
  clusterIds?: string[];
  period?: string;
  startDate?: string;
  endDate?: string;
}

// Build URL helper for preloading
export function buildSummaryUrl(options?: UseSummaryOptions): string {
  const params = new URLSearchParams();
  if (options?.groupIds && options.groupIds.length > 0) {
    params.set('groupIds', options.groupIds.join(','));
  }
  if (options?.clusterIds && options.clusterIds.length > 0) {
    params.set('clusterIds', options.clusterIds.join(','));
  }
  if (options?.period) {
    params.set('period', options.period);
  }
  if (options?.startDate) {
    params.set('startDate', options.startDate);
  }
  if (options?.endDate) {
    params.set('endDate', options.endDate);
  }
  return `/api/summary${params.toString() ? `?${params.toString()}` : ''}`;
}

// Support both old API (positional args) and new API (options object)
export function useSummary(
  groupIdsOrOptions?: string[] | UseSummaryOptions,
  clusterIds?: string[]
) {
  // Normalize to options object
  const options: UseSummaryOptions = Array.isArray(groupIdsOrOptions)
    ? { groupIds: groupIdsOrOptions, clusterIds }
    : groupIdsOrOptions || {};

  const url = buildSummaryUrl(options);

  const { data, error, isLoading, mutate } = useSWR<SummaryResponse>(
    url,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes - refresh in background
    }
  );

  return {
    summary: data?.summary,
    trend: data?.trend || [],
    anomalies: data?.anomalies || [],
    isLoading,
    isError: error,
    mutate,
  };
}
