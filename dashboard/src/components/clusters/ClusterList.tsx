'use client'

import type { Cluster } from '@/lib/types'
import { ClusterCard } from './ClusterCard'

interface ClusterListProps {
  clusters: Cluster[]
  onEdit?: (cluster: Cluster) => void
  onDelete?: (cluster: Cluster) => void
  onClick?: (cluster: Cluster) => void
  emptyMessage?: string
}

export function ClusterList({
  clusters,
  onEdit,
  onDelete,
  onClick,
  emptyMessage = 'No categories yet',
}: ClusterListProps) {
  if (clusters.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clusters.map((cluster) => (
        <ClusterCard
          key={cluster._id}
          cluster={cluster}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onClick}
        />
      ))}
    </div>
  )
}
