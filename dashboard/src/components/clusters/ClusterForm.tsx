'use client'

import { useState, useEffect } from 'react'
import type { Cluster, CreateClusterInput, UpdateClusterInput } from '@/lib/types'
import { ClusterBadge } from './ClusterBadge'
import { cn } from '@/lib/utils'

// Color presets for clusters
export const CLUSTER_COLORS = [
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Cyan', hex: '#06B6D4' },
]

interface ClusterFormProps {
  cluster?: Cluster | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateClusterInput | UpdateClusterInput) => Promise<void>
  isLoading?: boolean
}

export function ClusterForm({
  cluster,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ClusterFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(CLUSTER_COLORS[0].hex)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!cluster

  // Reset form when opening/closing or when cluster changes
  useEffect(() => {
    if (isOpen) {
      if (cluster) {
        setName(cluster.name)
        setDescription(cluster.description || '')
        setColor(cluster.color)
      } else {
        setName('')
        setDescription('')
        setColor(CLUSTER_COLORS[0].hex)
      }
      setError(null)
    }
  }, [isOpen, cluster])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Category' : 'Create Category'}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Name input */}
              <div>
                <label
                  htmlFor="cluster-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="cluster-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., BH Skills, Abroad Studies"
                  maxLength={100}
                  disabled={isLoading}
                />
              </div>

              {/* Description input */}
              <div>
                <label
                  htmlFor="cluster-description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="cluster-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Optional description for this category"
                  maxLength={500}
                  disabled={isLoading}
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {CLUSTER_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        color === c.hex
                          ? 'border-gray-900 scale-110 dark:border-white'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview
                </label>
                <div className="flex items-center gap-2">
                  <ClusterBadge
                    name={name || 'Category Name'}
                    color={color}
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 dark:border-gray-700">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !name.trim()}
              >
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
