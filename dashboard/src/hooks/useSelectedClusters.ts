import useSWR from 'swr'
import type { Cluster } from '@/lib/types'

interface ClusterPreferencesResponse {
  selectedClusterIds: string[]
  clusterFilterMode: 'all' | 'selected'
  allClusters: Cluster[]
}

interface UseSelectedClustersReturn {
  selectedClusterIds: string[]
  clusterFilterMode: 'all' | 'selected'
  allClusters: Cluster[]
  isLoading: boolean
  error: Error | null
  toggleCluster: (clusterId: string) => Promise<void>
  selectClusters: (clusterIds: string[]) => Promise<void>
  selectAllClusters: () => Promise<void>
  clearClusterFilter: () => Promise<void>
  setFilterMode: (mode: 'all' | 'selected') => Promise<void>
  isClusterSelected: (clusterId: string) => boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSelectedClusters(): UseSelectedClustersReturn {
  const { data, error, isLoading, mutate } = useSWR<ClusterPreferencesResponse>(
    '/api/preferences/clusters',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const updatePreferences = async (
    selectedClusterIds?: string[],
    clusterFilterMode?: 'all' | 'selected'
  ): Promise<void> => {
    const body: Record<string, unknown> = {}
    if (selectedClusterIds !== undefined) {
      body.selectedClusterIds = selectedClusterIds
    }
    if (clusterFilterMode !== undefined) {
      body.clusterFilterMode = clusterFilterMode
    }

    const response = await fetch('/api/preferences/clusters', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update cluster preferences')
    }

    mutate()
  }

  const toggleCluster = async (clusterId: string): Promise<void> => {
    const currentIds = data?.selectedClusterIds || []
    const isSelected = currentIds.includes(clusterId)

    const newIds = isSelected
      ? currentIds.filter(id => id !== clusterId)
      : [...currentIds, clusterId]

    // When toggling a cluster, automatically switch to 'selected' mode if selecting
    const newMode = newIds.length > 0 ? 'selected' : 'all'

    await updatePreferences(newIds, newMode)
  }

  const selectClusters = async (clusterIds: string[]): Promise<void> => {
    const newMode = clusterIds.length > 0 ? 'selected' : 'all'
    await updatePreferences(clusterIds, newMode)
  }

  const selectAllClusters = async (): Promise<void> => {
    await updatePreferences([], 'all')
  }

  const clearClusterFilter = async (): Promise<void> => {
    await updatePreferences([], 'all')
  }

  const setFilterMode = async (mode: 'all' | 'selected'): Promise<void> => {
    await updatePreferences(undefined, mode)
  }

  const isClusterSelected = (clusterId: string): boolean => {
    if (data?.clusterFilterMode === 'all') {
      return true
    }
    return data?.selectedClusterIds?.includes(clusterId) || false
  }

  return {
    selectedClusterIds: data?.selectedClusterIds || [],
    clusterFilterMode: data?.clusterFilterMode || 'all',
    allClusters: data?.allClusters || [],
    isLoading,
    error: error || null,
    toggleCluster,
    selectClusters,
    selectAllClusters,
    clearClusterFilter,
    setFilterMode,
    isClusterSelected,
  }
}
