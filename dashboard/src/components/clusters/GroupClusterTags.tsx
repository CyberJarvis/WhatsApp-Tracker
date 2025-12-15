'use client'

import { ClusterBadge } from './ClusterBadge'
import type { ClusterSummary } from '@/lib/types'

interface GroupClusterTagsProps {
  clusters: ClusterSummary[]
  maxDisplay?: number
  onClusterClick?: (clusterId: string) => void
}

export function GroupClusterTags({
  clusters,
  maxDisplay = 2,
  onClusterClick,
}: GroupClusterTagsProps) {
  if (!clusters || clusters.length === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        No category
      </span>
    )
  }

  const displayClusters = clusters.slice(0, maxDisplay)
  const remainingCount = clusters.length - maxDisplay

  return (
    <div className="flex flex-wrap items-center gap-1">
      {displayClusters.map((cluster) => (
        <ClusterBadge
          key={cluster._id}
          name={cluster.name}
          color={cluster.color}
          size="sm"
          onClick={onClusterClick ? () => onClusterClick(cluster._id) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          +{remainingCount} more
        </span>
      )}
    </div>
  )
}
