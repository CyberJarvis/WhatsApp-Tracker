'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, AlertTriangle, Info, TrendingUp, Users } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications()

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'member_change':
        return <Users className="h-4 w-4 text-blue-500" />
      case 'activity_spike':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'info':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-300 bg-gray-50'
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-gray-500">
                <Bell className="h-8 w-8 mb-2 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification._id}
                    className={`border-l-4 px-4 py-3 transition-colors ${getSeverityColor(
                      notification.severity
                    )} ${!notification.isRead ? 'bg-opacity-100' : 'bg-opacity-30'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead([notification._id])}
                          className="rounded p-1 hover:bg-white/50"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <a
                href="/alerts"
                className="block text-center text-sm font-medium text-green-600 hover:text-green-700"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
