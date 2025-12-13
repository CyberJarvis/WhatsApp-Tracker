import useSWR from 'swr';
import type { DashboardSummary, TrendDataPoint } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SummaryResponse {
  summary: DashboardSummary;
  trend: TrendDataPoint[];
}

export function useSummary() {
  const { data, error, isLoading, mutate } = useSWR<SummaryResponse>(
    '/api/summary',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
    }
  );

  return {
    summary: data?.summary,
    trend: data?.trend || [],
    isLoading,
    isError: error,
    mutate,
  };
}
