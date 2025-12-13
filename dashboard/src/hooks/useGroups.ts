import useSWR from 'swr';
import type { GroupWithStats } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface GroupsResponse {
  groups: GroupWithStats[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

export function useGroups() {
  const { data, error, isLoading, mutate } = useSWR<GroupsResponse>(
    '/api/groups',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
    }
  );

  return {
    groups: data?.groups || [],
    summary: data?.summary,
    isLoading,
    isError: error,
    mutate,
  };
}
