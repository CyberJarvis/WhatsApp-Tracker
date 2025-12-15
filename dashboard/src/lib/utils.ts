import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: true,
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: true,
  });
}

export function formatGrowth(growth: number): string {
  if (growth > 0) return `+${formatNumber(growth)}`;
  if (growth < 0) return formatNumber(growth);
  return '0';
}

export function formatPercentage(value: number): string {
  const formatted = value.toFixed(1);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `${formatted}%`;
  return '0%';
}

export function getGrowthColor(growth: number): string {
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-500';
}

export function getGrowthBgColor(growth: number): string {
  if (growth > 0) return 'bg-green-100 text-green-800';
  if (growth < 0) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

// Helper to get current date in IST
function getISTDate(): Date {
  const now = new Date();
  // Convert to IST by adding 5:30 hours offset
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcOffset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() + utcOffset + istOffset);
}

// Format date as YYYY-MM-DD in IST
function formatISTDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRange(days: number): { from: string; to: string } {
  const toDate = getISTDate();
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - days);

  return {
    from: formatISTDateString(fromDate),
    to: formatISTDateString(toDate),
  };
}

export function getYesterday(): string {
  const ist = getISTDate();
  ist.setDate(ist.getDate() - 1);
  return formatISTDateString(ist);
}

export function getToday(): string {
  return formatISTDateString(getISTDate());
}

export function truncateGroupId(groupId: string): string {
  return groupId.replace('@g.us', '').slice(-8);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
