import useSWR from 'swr';
import type { DailyStats } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface StatsResponse {
  stats: DailyStats[];
  summary: {
    totalGroups: number;
    totalMembers: number;
    totalJoined: number;
    totalLeft: number;
    netGrowth: number;
    anomalyCount: number;
  };
}

export function useStats(date?: string) {
  const url = date ? `/api/stats?date=${date}` : '/api/stats';

  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    url,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data?.stats || [],
    summary: data?.summary,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useStatsRange(from: string, to: string) {
  const url = `/api/stats?from=${from}&to=${to}`;

  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    from && to ? url : null,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data?.stats || [],
    summary: data?.summary,
    isLoading,
    isError: error,
    mutate,
  };
}
