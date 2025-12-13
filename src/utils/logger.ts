/**
 * Winston Logger Configuration
 * Provides structured logging with file rotation and console output
 */

import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

// Log format for console (colorized, readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Log format for files (JSON for easy parsing)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logs directory
const logsDir = path.join(process.cwd(), 'logs');

// Daily rotating file transport for general logs
const generalFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
});

// Daily rotating file transport for errors only
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: fileFormat,
});

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'whatsapp-analytics' },
  transports: [
    // Console output (always enabled)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File outputs
    generalFileTransport,
    errorFileTransport,
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Log rotation events
generalFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): winston.Logger {
  return logger.child(context);
}

/**
 * Log job start with structured data
 */
export function logJobStart(jobName: string): void {
  logger.info(`Job started: ${jobName}`, { job: jobName, event: 'job_start' });
}

/**
 * Log job completion with structured data
 */
export function logJobComplete(
  jobName: string,
  duration: number,
  groupsProcessed: number
): void {
  logger.info(`Job completed: ${jobName}`, {
    job: jobName,
    event: 'job_complete',
    duration,
    groupsProcessed,
  });
}

/**
 * Log job failure with error details
 */
export function logJobError(jobName: string, error: Error): void {
  logger.error(`Job failed: ${jobName}`, {
    job: jobName,
    event: 'job_error',
    error: error.message,
    stack: error.stack,
  });
}

/**
 * Log WhatsApp client events
 */
export function logWhatsAppEvent(event: string, data?: Record<string, unknown>): void {
  logger.info(`WhatsApp: ${event}`, { component: 'whatsapp', event, ...data });
}

/**
 * Log Google Sheets operations
 */
export function logSheetsOperation(
  operation: string,
  success: boolean,
  details?: Record<string, unknown>
): void {
  const level = success ? 'info' : 'error';
  logger[level](`Sheets: ${operation}`, {
    component: 'sheets',
    operation,
    success,
    ...details,
  });
}

export default logger;
