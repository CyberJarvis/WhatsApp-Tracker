'use client'

import { SWRConfig } from 'swr'
import { ReactNode } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

interface SWRProviderProps {
  children: ReactNode
}

export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Deduplication: requests with the same key within 2 seconds are deduplicated
        dedupingInterval: 2000,
        // Keep previous data while revalidating for smoother UX
        keepPreviousData: true,
        // Don't refetch on window focus to reduce unnecessary requests
        revalidateOnFocus: false,
        // Don't refetch on reconnect immediately
        revalidateOnReconnect: true,
        // Retry failed requests up to 3 times with exponential backoff
        errorRetryCount: 3,
        errorRetryInterval: 1000,
        // Cache data for 10 minutes before considering it stale
        refreshInterval: 0, // Let individual hooks set this
        // Suspense mode disabled for better loading state control
        suspense: false,
        // Show cached data while revalidating
        revalidateIfStale: true,
        // Optimistic updates enabled
        compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }}
    >
      {children}
    </SWRConfig>
  )
}
