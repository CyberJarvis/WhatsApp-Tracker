'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

export type PeriodOption = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface DateRange {
  from: string
  to: string
}

interface PeriodSelectorProps {
  value: PeriodOption
  onChange: (period: PeriodOption, customRange?: DateRange) => void
  customRange?: DateRange
  className?: string
  showCustom?: boolean
}

const PERIOD_OPTIONS: { value: PeriodOption; label: string; shortLabel: string }[] = [
  { value: 'today', label: 'Today', shortLabel: 'Today' },
  { value: 'week', label: 'Last 7 Days', shortLabel: '7D' },
  { value: 'month', label: 'Last 30 Days', shortLabel: '30D' },
  { value: 'year', label: 'Last 365 Days', shortLabel: '365D' },
  { value: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
]

export function PeriodSelector({
  value,
  onChange,
  customRange,
  className = '',
  showCustom = true,
}: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempFromDate, setTempFromDate] = useState(customRange?.from || '')
  const [tempToDate, setTempToDate] = useState(customRange?.to || '')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options = showCustom ? PERIOD_OPTIONS : PERIOD_OPTIONS.filter(o => o.value !== 'custom')

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (period: PeriodOption) => {
    if (period === 'custom') {
      setShowDatePicker(true)
      // Initialize with current custom range or last 7 days
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      setTempFromDate(customRange?.from || weekAgo.toISOString().split('T')[0])
      setTempToDate(customRange?.to || today.toISOString().split('T')[0])
    } else {
      onChange(period)
      setIsOpen(false)
      setShowDatePicker(false)
    }
  }

  const handleApplyCustomRange = () => {
    if (tempFromDate && tempToDate) {
      onChange('custom', { from: tempFromDate, to: tempToDate })
      setIsOpen(false)
      setShowDatePicker(false)
    }
  }

  const getCurrentLabel = () => {
    if (value === 'custom' && customRange) {
      return `${formatDate(customRange.from)} - ${formatDate(customRange.to)}`
    }
    return options.find(o => o.value === value)?.label || 'Select Period'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="hidden sm:inline">{getCurrentLabel()}</span>
        <span className="sm:hidden">
          {value === 'custom' && customRange
            ? `${formatDate(customRange.from)}-${formatDate(customRange.to)}`
            : options.find(o => o.value === value)?.shortLabel}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          {!showDatePicker ? (
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    value === option.value
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.value === 'custom' && <Calendar className="h-4 w-4" />}
                  {option.label}
                  {value === option.value && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Custom Range</span>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={tempFromDate}
                    onChange={(e) => setTempFromDate(e.target.value)}
                    max={tempToDate || undefined}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={tempToDate}
                    onChange={(e) => setTempToDate(e.target.value)}
                    min={tempFromDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <button
                  onClick={handleApplyCustomRange}
                  disabled={!tempFromDate || !tempToDate}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
