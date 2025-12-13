/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

/**
 * Sleep for specified milliseconds
 * Used for rate limiting API calls
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}

/**
 * Get current timestamp in ISO format
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse boolean from string (Google Sheets stores as TRUE/FALSE)
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return value.toUpperCase() === 'TRUE';
}

/**
 * Parse integer from string with fallback
 */
export function parseIntSafe(value: string | undefined, fallback: number = 0): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Check if a member change is anomalous (>10% drop)
 */
export function isAnomalousChange(
  oldCount: number,
  newCount: number,
  threshold: number = 10
): boolean {
  if (oldCount === 0) return false;
  const percentChange = calculatePercentageChange(oldCount, newCount);
  return percentChange < -threshold;
}

/**
 * Format number with commas for display
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Batch an array into chunks of specified size
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Check if a group ID is valid WhatsApp group format
 */
export function isValidGroupId(id: string): boolean {
  // WhatsApp group IDs end with @g.us
  return id.endsWith('@g.us');
}

/**
 * Extract readable group ID from WhatsApp ID object
 */
export function extractGroupId(idObj: { _serialized: string } | string): string {
  if (typeof idObj === 'string') return idObj;
  return idObj._serialized;
}

/**
 * Generate a unique run ID for logging
 */
export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Safely stringify an object for logging
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

/**
 * Check if time is within a specific hour range
 */
export function isWithinHours(startHour: number, endHour: number): boolean {
  const currentHour = new Date().getHours();
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get start of today in local time
 */
export function getStartOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Get start of yesterday in local time
 */
export function getStartOfYesterday(): Date {
  const date = getStartOfToday();
  date.setDate(date.getDate() - 1);
  return date;
}
