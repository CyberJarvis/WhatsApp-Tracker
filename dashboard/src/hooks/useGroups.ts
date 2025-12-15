import useSWR from 'swr';
import type { GroupWithStats, ClusterSummary } from '@/lib/types';

interface GroupWithClusters extends GroupWithStats {
  clusters?: ClusterSummary[];
}

interface GroupsResponse {
  groups: GroupWithClusters[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

interface UseGroupsOptions {
  groupIds?: string[];
  clusterIds?: string[];
}

// Build URL helper for preloading
export function buildGroupsUrl(options?: UseGroupsOptions | string[]): string {
  const opts: UseGroupsOptions = Array.isArray(options)
    ? { groupIds: options }
    : options || {};

  const params = new URLSearchParams();
  if (opts.groupIds && opts.groupIds.length > 0) {
    params.set('groupIds', opts.groupIds.join(','));
  }
  if (opts.clusterIds && opts.clusterIds.length > 0) {
    params.set('clusterIds', opts.clusterIds.join(','));
  }
  return `/api/groups${params.toString() ? `?${params.toString()}` : ''}`;
}

export function useGroups(options?: UseGroupsOptions | string[]) {
  const url = buildGroupsUrl(options);

  const { data, error, isLoading, mutate } = useSWR<GroupsResponse>(
    url,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes - refresh in background
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
