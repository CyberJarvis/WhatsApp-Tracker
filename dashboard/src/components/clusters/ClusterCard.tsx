'use client'

import { useState } from 'react'
import type { Cluster } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ClusterCardProps {
  cluster: Cluster
  onEdit?: (cluster: Cluster) => void
  onDelete?: (cluster: Cluster) => void
  onClick?: (cluster: Cluster) => void
}

export function ClusterCard({ cluster, onEdit, onDelete, onClick }: ClusterCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    if (onDelete) {
      onDelete(cluster)
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800 dark:border-gray-700',
        onClick && 'cursor-pointer'
      )}
      onClick={() => onClick?.(cluster)}
    >
      {/* Color indicator */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ backgroundColor: cluster.color }}
      />

      <div className="pt-2">
        {/* Header with name and color dot */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: cluster.color }}
          />
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {cluster.name}
          </h3>
        </div>

        {/* Description */}
        {cluster.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {cluster.description}
          </p>
        )}

        {/* Group count and Assign button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {cluster.groupCount} {cluster.groupCount === 1 ? 'group' : 'groups'}
          </span>
          {onClick && (
            <button
              type="button"
              className="text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
              onClick={(e) => {
                e.stopPropagation()
                onClick(cluster)
              }}
            >
              + Assign Groups
            </button>
          )}
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            {onEdit && (
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(cluster)
                }}
              >
                Edit
              </button>
            )}
            {onDelete && !showDeleteConfirm && (
              <button
                type="button"
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(true)
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div
            className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-red-700 dark:text-red-300 mb-2">
              Delete this category?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
