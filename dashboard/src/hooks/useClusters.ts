import useSWR from 'swr'
import type { Cluster, CreateClusterInput, UpdateClusterInput } from '@/lib/types'

interface ClustersResponse {
  clusters: Cluster[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useClusters() {
  const { data, error, isLoading, mutate } = useSWR<ClustersResponse>(
    '/api/clusters',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  const createCluster = async (input: CreateClusterInput): Promise<Cluster> => {
    const response = await fetch('/api/clusters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create cluster')
    }

    const result = await response.json()
    mutate() // Refresh the clusters list
    return result.cluster
  }

  const updateCluster = async (id: string, input: UpdateClusterInput): Promise<Cluster> => {
    const response = await fetch(`/api/clusters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update cluster')
    }

    const result = await response.json()
    mutate() // Refresh the clusters list
    return result.cluster
  }

  const deleteCluster = async (id: string): Promise<void> => {
    const response = await fetch(`/api/clusters/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete cluster')
    }

    mutate() // Refresh the clusters list
  }

  return {
    clusters: data?.clusters || [],
    isLoading,
    error,
    createCluster,
    updateCluster,
    deleteCluster,
    mutate,
  }
}
