/**
 * Application Configuration
 * Loads and validates environment variables
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfig, ErrorCode } from '../types';

// Load environment variables from .env file
dotenv.config();

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Validate that credentials file exists
 */
function validateCredentialsPath(credPath: string): void {
  const absolutePath = path.resolve(credPath);
  if (!fs.existsSync(absolutePath)) {
    console.warn(
      `Warning: Google credentials file not found at ${absolutePath}. ` +
      `Please place your service account JSON file there.`
    );
  }
}

/**
 * Validate cron expression format (basic validation)
 */
function validateCronExpression(expr: string, name: string): void {
  const parts = expr.split(' ');
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression for ${name}: "${expr}". ` +
      `Expected 5 parts (minute hour day month weekday)`
    );
  }
}

/**
 * Build and validate application configuration
 */
function buildConfig(): AppConfig {
  const config: AppConfig = {
    whatsapp: {
      sessionPath: getOptionalEnv('WHATSAPP_SESSION_PATH', '.wwebjs_auth'),
    },
    google: {
      spreadsheetId: getRequiredEnv('GOOGLE_SHEETS_ID'),
      credentialsPath: getOptionalEnv(
        'GOOGLE_CREDENTIALS_PATH',
        './credentials/service-account.json'
      ),
    },
    scheduler: {
      captureCron: getOptionalEnv('CAPTURE_CRON', '0 */3 * * *'),
      reportCron: getOptionalEnv('REPORT_CRON', '0 10 * * *'),
    },
    reporting: {
      adminGroupId: getOptionalEnv('ADMIN_GROUP_ID', ''),
    },
    logging: {
      level: getOptionalEnv('LOG_LEVEL', 'info'),
    },
  };

  // Validate configuration
  validateCredentialsPath(config.google.credentialsPath);
  validateCronExpression(config.scheduler.captureCron, 'CAPTURE_CRON');
  validateCronExpression(config.scheduler.reportCron, 'REPORT_CRON');

  return config;
}

/**
 * Application configuration singleton
 */
let configInstance: AppConfig | null = null;

/**
 * Get application configuration
 * Lazily loads and caches the configuration
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = buildConfig();
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

// Export error code for config errors
export { ErrorCode };
