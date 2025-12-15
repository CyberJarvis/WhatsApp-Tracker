'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSelectedClusters } from '@/hooks/useSelectedClusters'
import { ClusterForm } from './ClusterForm'
import { useClusters } from '@/hooks/useClusters'
import { cn } from '@/lib/utils'
import type { CreateClusterInput, UpdateClusterInput } from '@/lib/types'

interface ClusterSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function ClusterSidebar({ collapsed = false, onToggle }: ClusterSidebarProps) {
  const {
    selectedClusterIds,
    clusterFilterMode,
    allClusters,
    isLoading,
    toggleCluster,
    clearClusterFilter,
  } = useSelectedClusters()
  const { createCluster } = useClusters()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateCluster = async (data: CreateClusterInput | UpdateClusterInput) => {
    setIsSubmitting(true)
    try {
      await createCluster(data as CreateClusterInput)
      setIsFormOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Expand categories"
        >
          <svg
            className="w-6 h-6 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Categories
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Collapse"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Filter Options */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
              />
            ))}
          </div>
        ) : (
          <>
            {/* All Groups Option */}
            <button
              type="button"
              onClick={clearClusterFilter}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                clusterFilterMode === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <span className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="flex-1 text-left">All Groups</span>
              {clusterFilterMode === 'all' && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>

            {/* Divider */}
            {allClusters.length > 0 && (
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            )}

            {/* Cluster List */}
            {allClusters.map((cluster) => {
              const isSelected =
                clusterFilterMode === 'selected' &&
                selectedClusterIds.includes(cluster._id)

              return (
                <button
                  key={cluster._id}
                  type="button"
                  onClick={() => toggleCluster(cluster._id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                    isSelected
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="flex-1 text-left truncate">{cluster.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {cluster.groupCount}
                  </span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              )
            })}

            {/* Empty State */}
            {allClusters.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                No categories yet
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-3 space-y-2 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Category
        </button>
        <Link
          href="/categories"
          className="block w-full text-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Manage Categories
        </Link>
      </div>

      {/* Create Form Modal */}
      <ClusterForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateCluster}
        isLoading={isSubmitting}
      />
    </div>
  )
}
