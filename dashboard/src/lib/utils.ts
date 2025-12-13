import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export function getYesterday(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function truncateGroupId(groupId: string): string {
  return groupId.replace('@g.us', '').slice(-8);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
