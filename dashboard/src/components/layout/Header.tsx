'use client';

import { RefreshCw, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GroupSelector } from '@/components/groups/GroupSelector';
import { NotificationBell } from '@/components/alerts/NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showGroupFilter?: boolean;
}

export function Header({ title, subtitle, showGroupFilter = true }: HeaderProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000); // Update time display every minute

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Trigger WhatsApp sync before refreshing data
      await fetch('/api/whatsapp/sync', { method: 'POST' });
    } catch (error) {
      console.error('Sync error:', error);
    }
    // Reload to show fresh data
    window.location.reload();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Group Filter */}
        {showGroupFilter && <GroupSelector />}

        {/* Last Update */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Updated {formatTime(lastUpdate)}</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        {/* Notifications */}
        <NotificationBell />
      </div>
    </header>
  );
}
