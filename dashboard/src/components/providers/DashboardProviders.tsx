'use client'

import { GroupFilterProvider } from '@/components/groups/GroupFilterContext'

interface DashboardProvidersProps {
  children: React.ReactNode
}

export function DashboardProviders({ children }: DashboardProvidersProps) {
  return (
    <GroupFilterProvider>
      {children}
    </GroupFilterProvider>
  )
}
