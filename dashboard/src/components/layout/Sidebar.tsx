'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  User,
  Activity,
  UserPlus,
  FolderKanban,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Groups', href: '/groups', icon: Users },
  { name: 'Categories', href: '/categories', icon: FolderKanban },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Members', href: '/members', icon: UserPlus },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  // { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [waConnected, setWaConnected] = useState(false)

  useEffect(() => {
    const fetchWhatsAppStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status')
        const data = await res.json()
        if (res.ok) {
          setWaConnected(data.isConnected || false)
        }
      } catch (error) {
        console.error('Error fetching WhatsApp status:', error)
        setWaConnected(false)
      }
    }

    fetchWhatsAppStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchWhatsAppStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <MessageCircle className="h-8 w-8 text-green-500" />
        <span className="text-xl font-bold text-white">WA Analytics</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info & Footer */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        {/* User Info */}
        {session?.user && (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name || session.user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
        )}

        {/* WhatsApp Status */}
        <div className="rounded-lg bg-gray-800 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">WhatsApp</p>
              <p className="text-sm font-medium text-white">
                {waConnected ? 'Connected' : 'Not Connected'}
              </p>
            </div>
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                waConnected ? 'bg-green-500' : 'bg-red-500'
              )}
            />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  )
}
