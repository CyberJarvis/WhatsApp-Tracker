'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Search, X, Filter, FolderKanban } from 'lucide-react'
import { useGroupFilter } from './GroupFilterContext'
import { useSelectedClusters } from '@/hooks/useSelectedClusters'

interface GroupSelectorProps {
  className?: string
  showLabel?: boolean
}

export function GroupSelector({ className = '', showLabel = true }: GroupSelectorProps) {
  const {
    allGroups,
    totalGroupCount,
    selectedGroupIds,
    selectAll,
    isLoading,
    toggleGroup,
    selectAllGroups,
    deselectAllGroups,
    isGroupSelected,
    selectedCount,
  } = useGroupFilter()

  const {
    allClusters,
    selectedClusterIds,
    clusterFilterMode,
    toggleCluster,
    clearClusterFilter,
    isLoading: clustersLoading,
  } = useSelectedClusters()

  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>('categories')

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.group-selector')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredGroups = allGroups.filter(group =>
    (group.groupName || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleGroup = async (groupId: string) => {
    // Clear cluster filter when manually selecting individual groups
    if (clusterFilterMode === 'selected' && selectedClusterIds.length > 0) {
      await clearClusterFilter()
    }
    toggleGroup(groupId)
  }

  const handleSelectAll = async () => {
    // Clear cluster filter when selecting all groups manually
    if (clusterFilterMode === 'selected' && selectedClusterIds.length > 0) {
      await clearClusterFilter()
    }
    selectAllGroups()
  }

  const handleDeselectAll = async () => {
    // Clear cluster filter when deselecting groups manually
    if (clusterFilterMode === 'selected' && selectedClusterIds.length > 0) {
      await clearClusterFilter()
    }
    deselectAllGroups()
  }

  // Determine the display label
  const getFilterLabel = () => {
    if (clusterFilterMode === 'selected' && selectedClusterIds.length > 0) {
      if (selectedClusterIds.length === 1) {
        const cluster = allClusters.find(c => c._id === selectedClusterIds[0])
        return cluster?.name || 'Category'
      }
      return `${selectedClusterIds.length} Categories`
    }
    if (selectAll) return 'All Groups'
    if (selectedCount === 0) return 'No Groups'
    return `${selectedCount} Group${selectedCount !== 1 ? 's' : ''}`
  }

  if (isLoading || clustersLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  return (
    <div className={`group-selector relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Filter className="h-4 w-4" />
        {showLabel && <span>{getFilterLabel()}</span>}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FolderKanban className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Categories
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'groups'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Groups
            </button>
          </div>

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <>
              <div className="max-h-64 overflow-y-auto p-2">
                {/* All option */}
                <button
                  onClick={() => {
                    clearClusterFilter()
                    selectAllGroups()
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      clusterFilterMode === 'all'
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {clusterFilterMode === 'all' && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1 font-medium text-gray-900">All Groups</span>
                  <span className="text-xs text-gray-500">{totalGroupCount}</span>
                </button>

                {/* Categories */}
                {allClusters.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-gray-100">
                    {allClusters.map((cluster) => {
                      const isSelected =
                        clusterFilterMode === 'selected' &&
                        selectedClusterIds.includes(cluster._id)
                      return (
                        <button
                          key={cluster._id}
                          onClick={() => toggleCluster(cluster._id)}
                          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <div
                            className="flex h-5 w-5 items-center justify-center rounded-full border"
                            style={{
                              borderColor: isSelected ? cluster.color : '#d1d5db',
                              backgroundColor: isSelected ? cluster.color : 'white',
                            }}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cluster.color }}
                          />
                          <span className="flex-1 truncate text-gray-700">{cluster.name}</span>
                          <span className="text-xs text-gray-500">{cluster.groupCount}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {allClusters.length === 0 && (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No categories yet
                  </div>
                )}
              </div>
            </>
          )}

          {/* Groups Tab */}
          {activeTab === 'groups' && (
            <>
              {/* Search */}
              <div className="border-b border-gray-100 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-8 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <span className="text-xs font-medium text-gray-500">
                  {selectedCount} of {allGroups.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs font-medium text-green-600 hover:text-green-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Group List */}
              <div className="max-h-64 overflow-y-auto p-2">
                {filteredGroups.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    {searchQuery ? 'No groups found' : 'No groups available'}
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const isSelected = isGroupSelected(group.groupId)
                    return (
                      <button
                        key={group.groupId}
                        onClick={() => handleToggleGroup(group.groupId)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            isSelected
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="flex-1 truncate text-gray-700">{group.groupName}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-md bg-green-600 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
