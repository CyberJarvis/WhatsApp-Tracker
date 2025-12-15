import useSWR from 'swr'

export type AlertType = 'inactivity' | 'member_surge' | 'member_drop' | 'high_activity' | 'low_activity' | 'custom'
export type AlertOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
export type AlertMetric = 'message_count' | 'member_count' | 'member_change' | 'days_inactive' | 'message_rate'
export type NotificationChannel = 'in_app' | 'email'

export interface AlertCondition {
  metric: AlertMetric
  operator: AlertOperator
  threshold: number
  timeWindowHours?: number
}

export interface Alert {
  _id: string
  userId: string
  name: string
  description?: string
  alertType: AlertType
  condition: AlertCondition
  groupIds: string[]
  applyToAllGroups: boolean
  notificationChannels: NotificationChannel[]
  isActive: boolean
  cooldownHours: number
  lastTriggeredAt?: string
  triggerCount: number
  createdAt: string
  updatedAt: string
}

interface AlertsResponse {
  alerts: Alert[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<AlertsResponse>(
    '/api/alerts',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const createAlert = async (alertData: Partial<Alert>) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      })

      if (!response.ok) {
        throw new Error('Failed to create alert')
      }

      mutate()
      return true
    } catch (error) {
      console.error('Error creating alert:', error)
      return false
    }
  }

  const updateAlert = async (id: string, updates: Partial<Alert>) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update alert')
      }

      mutate()
      return true
    } catch (error) {
      console.error('Error updating alert:', error)
      return false
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete alert')
      }

      mutate()
      return true
    } catch (error) {
      console.error('Error deleting alert:', error)
      return false
    }
  }

  const toggleAlert = async (id: string, isActive: boolean) => {
    return updateAlert(id, { isActive })
  }

  return {
    alerts: data?.alerts || [],
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    mutate,
  }
}
