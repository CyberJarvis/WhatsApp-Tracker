'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { NotificationBell } from '@/components/alerts/NotificationBell'
import { useAlerts, Alert, AlertType, AlertMetric, AlertOperator, NotificationChannel } from '@/hooks/useAlerts'
import { useNotifications } from '@/hooks/useNotifications'
import { useGroupFilter } from '@/components/groups/GroupFilterContext'
import {
  Bell,
  Plus,
  Trash2,
  Edit,
  Power,
  PowerOff,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  X,
} from 'lucide-react'

interface AlertFormData {
  name: string
  description: string
  alertType: AlertType
  metric: AlertMetric
  operator: AlertOperator
  threshold: number
  timeWindowHours: number
  applyToAllGroups: boolean
  selectedGroupIds: string[]
  notificationChannels: NotificationChannel[]
  cooldownHours: number
}

const defaultFormData: AlertFormData = {
  name: '',
  description: '',
  alertType: 'inactivity',
  metric: 'days_inactive',
  operator: 'gt',
  threshold: 3,
  timeWindowHours: 24,
  applyToAllGroups: true,
  selectedGroupIds: [],
  notificationChannels: ['in_app'],
  cooldownHours: 24,
}

const alertTypeOptions: { value: AlertType; label: string; icon: typeof Bell; description: string }[] = [
  { value: 'inactivity', label: 'Inactivity', icon: Clock, description: 'Alert when a group is inactive' },
  { value: 'member_surge', label: 'Member Surge', icon: TrendingUp, description: 'Alert on sudden member increase' },
  { value: 'member_drop', label: 'Member Drop', icon: TrendingDown, description: 'Alert on sudden member decrease' },
  { value: 'high_activity', label: 'High Activity', icon: MessageSquare, description: 'Alert on high message volume' },
  { value: 'low_activity', label: 'Low Activity', icon: AlertTriangle, description: 'Alert on low message volume' },
  { value: 'custom', label: 'Custom', icon: Bell, description: 'Create a custom alert rule' },
]

const metricOptions: { value: AlertMetric; label: string }[] = [
  { value: 'message_count', label: 'Message Count' },
  { value: 'member_count', label: 'Member Count' },
  { value: 'member_change', label: 'Member Change' },
  { value: 'days_inactive', label: 'Days Inactive' },
  { value: 'message_rate', label: 'Message Rate (per hour)' },
]

const operatorOptions: { value: AlertOperator; label: string }[] = [
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'eq', label: 'Equal to' },
]

export default function AlertsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [formData, setFormData] = useState<AlertFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { alerts, isLoading, createAlert, updateAlert, deleteAlert, toggleAlert } = useAlerts()
  const { notifications } = useNotifications()
  const { allGroups } = useGroupFilter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const alertData = {
      name: formData.name,
      description: formData.description,
      alertType: formData.alertType,
      condition: {
        metric: formData.metric,
        operator: formData.operator,
        threshold: formData.threshold,
        timeWindowHours: formData.timeWindowHours,
      },
      applyToAllGroups: formData.applyToAllGroups,
      groupIds: formData.selectedGroupIds,
      notificationChannels: formData.notificationChannels,
      cooldownHours: formData.cooldownHours,
    }

    let success = false
    if (editingAlert) {
      success = await updateAlert(editingAlert._id, alertData)
    } else {
      success = await createAlert(alertData)
    }

    if (success) {
      setShowForm(false)
      setEditingAlert(null)
      setFormData(defaultFormData)
    }
    setIsSubmitting(false)
  }

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert)
    setFormData({
      name: alert.name,
      description: alert.description || '',
      alertType: alert.alertType,
      metric: alert.condition.metric,
      operator: alert.condition.operator,
      threshold: alert.condition.threshold,
      timeWindowHours: alert.condition.timeWindowHours || 24,
      applyToAllGroups: alert.applyToAllGroups,
      selectedGroupIds: alert.groupIds,
      notificationChannels: alert.notificationChannels,
      cooldownHours: alert.cooldownHours,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      await deleteAlert(id)
    }
  }

  const getAlertTypeIcon = (type: AlertType) => {
    const option = alertTypeOptions.find((o) => o.value === type)
    const Icon = option?.icon || Bell
    return <Icon className="h-5 w-5" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Alerts & Notifications"
        subtitle="Configure alert rules and manage notifications"
      />

      <main className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Active Alerts</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {alerts.filter((a) => a.isActive).length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-50 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Triggers</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {alerts.reduce((sum, a) => sum + a.triggerCount, 0)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Unread Notifications</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {notifications.filter((n) => !n.isRead).length}
            </p>
          </div>
        </div>

        {/* Alert Creation/Edit Form */}
        {showForm && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAlert ? 'Edit Alert' : 'Create New Alert'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingAlert(null)
                  setFormData(defaultFormData)
                }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    placeholder="e.g., Group Inactivity Alert"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alert Type</label>
                  <select
                    value={formData.alertType}
                    onChange={(e) => setFormData({ ...formData, alertType: e.target.value as AlertType })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {alertTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  placeholder="Brief description of this alert"
                />
              </div>

              {/* Condition */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-3 font-medium text-gray-900">Alert Condition</h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Metric</label>
                    <select
                      value={formData.metric}
                      onChange={(e) => setFormData({ ...formData, metric: e.target.value as AlertMetric })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      {metricOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <select
                      value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value as AlertOperator })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      {operatorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Threshold</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Group Selection */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.applyToAllGroups}
                    onChange={(e) => setFormData({ ...formData, applyToAllGroups: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Apply to all groups</span>
                </label>
              </div>

              {/* Settings */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cooldown (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={formData.cooldownHours}
                    onChange={(e) => setFormData({ ...formData, cooldownHours: parseInt(e.target.value) || 24 })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum time between alerts</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notification Channels</label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notificationChannels.includes('in_app')}
                        onChange={(e) => {
                          const channels: NotificationChannel[] = e.target.checked
                            ? [...formData.notificationChannels, 'in_app']
                            : formData.notificationChannels.filter((c) => c !== 'in_app')
                          setFormData({ ...formData, notificationChannels: channels })
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">In-app notification</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notificationChannels.includes('email')}
                        onChange={(e) => {
                          const channels: NotificationChannel[] = e.target.checked
                            ? [...formData.notificationChannels, 'email']
                            : formData.notificationChannels.filter((c) => c !== 'email')
                          setFormData({ ...formData, notificationChannels: channels })
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">Email notification</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingAlert(null)
                    setFormData(defaultFormData)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingAlert ? 'Update Alert' : 'Create Alert'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Configured Alerts</h3>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                New Alert
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-gray-200 p-4">
                  <div className="h-5 w-32 rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-gray-500">No alerts configured yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-sm font-medium text-green-600 hover:text-green-700"
              >
                Create your first alert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`rounded-lg border p-4 transition-colors ${
                    alert.isActive
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          alert.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {getAlertTypeIcon(alert.alertType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{alert.name}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              alert.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {alert.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {alert.description && (
                          <p className="mt-1 text-sm text-gray-500">{alert.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Condition:</span>
                            {alert.condition.metric} {alert.condition.operator} {alert.condition.threshold}
                          </span>
                          <span>|</span>
                          <span>Triggered {alert.triggerCount} times</span>
                          {alert.lastTriggeredAt && (
                            <>
                              <span>|</span>
                              <span>
                                Last: {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAlert(alert._id, !alert.isActive)}
                        className={`rounded p-1.5 ${
                          alert.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={alert.isActive ? 'Disable alert' : 'Enable alert'}
                      >
                        {alert.isActive ? (
                          <Power className="h-4 w-4" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(alert)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit alert"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(alert._id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Notifications</h3>
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No notifications yet. Alerts will appear here when triggered.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  className={`rounded-lg border-l-4 p-4 ${
                    notification.severity === 'critical'
                      ? 'border-l-red-500 bg-red-50'
                      : notification.severity === 'warning'
                      ? 'border-l-yellow-500 bg-yellow-50'
                      : 'border-l-blue-500 bg-blue-50'
                  } ${notification.isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      {notification.message && (
                        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">
                        New
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
