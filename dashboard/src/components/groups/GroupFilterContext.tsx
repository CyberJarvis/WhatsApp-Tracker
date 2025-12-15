'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSelectedGroups } from '@/hooks/useSelectedGroups'

interface GroupOption {
  _id: string
  groupId: string
  groupName: string
}

interface GroupFilterContextType {
  allGroups: GroupOption[]
  totalGroupCount: number
  selectedGroupIds: string[]
  selectAll: boolean
  isLoading: boolean
  error: Error | undefined
  updateSelectedGroups: (selectedGroupIds: string[], selectAll: boolean) => Promise<boolean>
  toggleGroup: (groupId: string) => Promise<boolean>
  selectAllGroups: () => Promise<boolean>
  deselectAllGroups: () => Promise<boolean>
  isGroupSelected: (groupId: string) => boolean
  selectedCount: number
}

const GroupFilterContext = createContext<GroupFilterContextType | undefined>(undefined)

export function GroupFilterProvider({ children }: { children: ReactNode }) {
  const {
    allGroups,
    totalGroupCount,
    selectedGroupIds,
    selectAll,
    isLoading,
    error,
    updateSelectedGroups,
    toggleGroup,
    selectAllGroups,
    deselectAllGroups,
  } = useSelectedGroups()

  const isGroupSelected = (groupId: string) => {
    return selectedGroupIds.includes(groupId)
  }

  const value: GroupFilterContextType = {
    allGroups,
    totalGroupCount,
    selectedGroupIds,
    selectAll,
    isLoading,
    error,
    updateSelectedGroups,
    toggleGroup,
    selectAllGroups,
    deselectAllGroups,
    isGroupSelected,
    selectedCount: selectedGroupIds.length,
  }

  return (
    <GroupFilterContext.Provider value={value}>
      {children}
    </GroupFilterContext.Provider>
  )
}

export function useGroupFilter() {
  const context = useContext(GroupFilterContext)
  if (context === undefined) {
    throw new Error('useGroupFilter must be used within a GroupFilterProvider')
  }
  return context
}
