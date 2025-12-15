'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import type { Cluster } from '@/lib/types'
import { useGroups } from '@/hooks/useGroups'
import { useClusterGroups } from '@/hooks/useClusterGroups'
import { ClusterBadge } from './ClusterBadge'

interface ClusterGroupAssignerProps {
  cluster: Cluster
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function ClusterGroupAssigner({
  cluster,
  isOpen,
  onClose,
  onSave,
}: ClusterGroupAssignerProps) {
  const { groups, isLoading: groupsLoading } = useGroups()
  const { setClusterGroups } = useClusterGroups()
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Initialize selected groups when cluster changes
  useEffect(() => {
    if (isOpen && cluster) {
      setSelectedGroupIds(new Set(cluster.groupIds || []))
      setSearch('')
    }
  }, [isOpen, cluster])

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const searchLower = search.toLowerCase()
    return groups.filter(
      (g) =>
        g.groupName?.toLowerCase().includes(searchLower) ||
        g.groupId.toLowerCase().includes(searchLower)
    )
  }, [groups, search])

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedGroupIds(new Set(filteredGroups.map((g) => g.groupId)))
  }

  const deselectAll = () => {
    setSelectedGroupIds(new Set())
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await setClusterGroups(cluster._id, Array.from(selectedGroupIds))
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save groups:', error)
    } finally {
      setIsSaving(false)
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
        <div className="relative w-full max-w-lg transform rounded-lg bg-white shadow-xl transition-all dark:bg-gray-800">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assign Groups to Category
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <ClusterBadge name={cluster.name} color={cluster.color} size="sm" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedGroupIds.size} groups selected
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-700">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {filteredGroups.length} groups
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="max-h-80 overflow-y-auto px-6 py-3">
            {groupsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                No groups found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroupIds.has(group.groupId)
                  return (
                    <label
                      key={group.groupId}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(group.groupId)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                          {group.groupName || 'Unnamed Group'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.currentMembers} members
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
