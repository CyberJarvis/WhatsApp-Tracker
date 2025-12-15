'use client'

import { cn } from '@/lib/utils'

interface ClusterBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  onClick?: () => void
  removable?: boolean
  onRemove?: () => void
  className?: string
}

export function ClusterBadge({
  name,
  color,
  size = 'sm',
  onClick,
  removable = false,
  onRemove,
  className,
}: ClusterBadgeProps) {
  // Calculate contrasting text color based on background
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  }

  const textColor = getContrastColor(color)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      onClick={onClick}
    >
      {name}
      {removable && onRemove && (
        <button
          type="button"
          className="ml-1 inline-flex items-center justify-center rounded-full hover:bg-black/10"
          style={{ color: textColor }}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <svg
            className={cn(
              size === 'sm' && 'h-3 w-3',
              size === 'md' && 'h-4 w-4'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  )
}
