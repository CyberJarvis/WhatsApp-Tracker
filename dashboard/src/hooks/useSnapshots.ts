import useSWR from 'swr';
import type { GroupSnapshot } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SnapshotsResponse {
  snapshots: GroupSnapshot[];
}

export function useSnapshots(groupId?: string, days: number = 7) {
  const url = groupId
    ? `/api/snapshots?groupId=${encodeURIComponent(groupId)}&days=${days}`
    : `/api/snapshots?days=${days}`;

  const { data, error, isLoading, mutate } = useSWR<SnapshotsResponse>(
    url,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
    }
  );

  return {
    snapshots: data?.snapshots || [],
    isLoading,
    isError: error,
    mutate,
  };
}
