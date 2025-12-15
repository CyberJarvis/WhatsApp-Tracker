import useSWR from 'swr'

interface Notification {
  _id: string
  type: 'alert' | 'report' | 'system' | 'info'
  severity: 'info' | 'warning' | 'critical' | 'success'
  title: string
  message: string
  isRead: boolean
  readAt?: string
  createdAt: string
  metadata?: {
    alertId?: string
    reportId?: string
    groupId?: string
    groupName?: string
    link?: string
  }
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useNotifications(unreadOnly: boolean = false, limit: number = 20) {
  const params = new URLSearchParams()
  if (unreadOnly) params.set('unreadOnly', 'true')
  params.set('limit', limit.toString())

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    `/api/notifications?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: true,
    }
  )

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      })
      mutate()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      mutate()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const clearNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })
      mutate()
    } catch (error) {
      console.error('Error clearing notification:', error)
    }
  }

  const clearAllNotifications = async () => {
    try {
      await fetch('/api/notifications?clearAll=true', {
        method: 'DELETE',
      })
      mutate()
    } catch (error) {
      console.error('Error clearing all notifications:', error)
    }
  }

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    mutate,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  }
}
