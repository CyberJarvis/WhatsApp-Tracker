import { useClusters } from './useClusters'
import type { Cluster } from '@/lib/types'

interface UseClusterGroupsReturn {
  addGroupsToCluster: (clusterId: string, groupIds: string[]) => Promise<Cluster>
  removeGroupsFromCluster: (clusterId: string, groupIds: string[]) => Promise<Cluster>
  setClusterGroups: (clusterId: string, groupIds: string[]) => Promise<Cluster>
  getGroupClusters: (groupId: string) => Cluster[]
}

export function useClusterGroups(): UseClusterGroupsReturn {
  const { clusters, mutate } = useClusters()

  const addGroupsToCluster = async (clusterId: string, groupIds: string[]): Promise<Cluster> => {
    const response = await fetch(`/api/clusters/${clusterId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to add groups to cluster')
    }

    const result = await response.json()
    mutate() // Refresh clusters list
    return result.cluster
  }

  const removeGroupsFromCluster = async (clusterId: string, groupIds: string[]): Promise<Cluster> => {
    const response = await fetch(`/api/clusters/${clusterId}/groups`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to remove groups from cluster')
    }

    const result = await response.json()
    mutate() // Refresh clusters list
    return result.cluster
  }

  const setClusterGroups = async (clusterId: string, groupIds: string[]): Promise<Cluster> => {
    const response = await fetch(`/api/clusters/${clusterId}/groups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupIds }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to set cluster groups')
    }

    const result = await response.json()
    mutate() // Refresh clusters list
    return result.cluster
  }

  const getGroupClusters = (groupId: string): Cluster[] => {
    return clusters.filter(cluster => cluster.groupIds.includes(groupId))
  }

  return {
    addGroupsToCluster,
    removeGroupsFromCluster,
    setClusterGroups,
    getGroupClusters,
  }
}
