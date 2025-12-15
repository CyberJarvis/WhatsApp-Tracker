import useSWR from 'swr'

interface GroupOption {
  _id: string
  groupId: string
  groupName: string
}

interface SelectedGroupsResponse {
  selectAll: boolean
  selectedGroupIds: string[]
  allGroups: GroupOption[]
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSelectedGroups() {
  const { data, error, isLoading, mutate } = useSWR<SelectedGroupsResponse>(
    '/api/preferences/groups',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  // Filter out groups with empty/null names for display
  const allGroupsRaw = data?.allGroups || []
  const validGroups = allGroupsRaw.filter(g => g.groupName && g.groupName.trim() !== '')

  const updateSelectedGroups = async (
    selectedGroupIds: string[],
    selectAll: boolean
  ) => {
    try {
      const response = await fetch('/api/preferences/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedGroupIds, selectAll }),
      })

      if (!response.ok) {
        throw new Error('Failed to update selected groups')
      }

      return true
    } catch (error) {
      console.error('Error updating selected groups:', error)
      return false
    }
  }

  const toggleGroup = async (groupId: string) => {
    if (!data) return false

    const currentIds = data.selectAll
      ? validGroups.map(g => g.groupId)
      : [...data.selectedGroupIds]

    const isSelected = currentIds.includes(groupId)
    const newIds = isSelected
      ? currentIds.filter(id => id !== groupId)
      : [...currentIds, groupId]

    // Optimistic update - update UI immediately
    mutate(
      {
        ...data,
        selectAll: false,
        selectedGroupIds: newIds,
      },
      false // Don't revalidate yet
    )

    // Then sync with server in background
    const success = await updateSelectedGroups(newIds, false)

    if (!success) {
      // Revert on failure
      mutate()
    }

    return success
  }

  const selectAllGroups = async () => {
    if (!data) return false

    // Optimistic update
    mutate(
      {
        ...data,
        selectAll: true,
        selectedGroupIds: [],
      },
      false
    )

    const success = await updateSelectedGroups([], true)

    if (!success) {
      mutate()
    }

    return success
  }

  const deselectAllGroups = async () => {
    if (!data) return false

    // Optimistic update
    mutate(
      {
        ...data,
        selectAll: false,
        selectedGroupIds: [],
      },
      false
    )

    const success = await updateSelectedGroups([], false)

    if (!success) {
      mutate()
    }

    return success
  }

  // Get the effective selected group IDs (only from valid groups)
  const effectiveSelectedIds = data?.selectAll
    ? validGroups.map(g => g.groupId)
    : (data?.selectedGroupIds || []).filter(id =>
        validGroups.some(g => g.groupId === id)
      )

  return {
    allGroups: validGroups,
    totalGroupCount: allGroupsRaw.length, // Total including groups with empty names
    selectedGroupIds: effectiveSelectedIds,
    selectAll: data?.selectAll ?? true,
    isLoading,
    error,
    updateSelectedGroups,
    toggleGroup,
    selectAllGroups,
    deselectAllGroups,
    mutate,
  }
}
