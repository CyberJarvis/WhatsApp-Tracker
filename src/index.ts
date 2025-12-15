/**
 * WhatsApp Group Analytics Automation System
 * Main Entry Point
 *
 * This system tracks daily join/leave statistics for WhatsApp groups
 * and stores the data in Google Sheets.
 */

import { getConfig } from './config';
import logger from './utils/logger';
import { whatsAppService } from './services/whatsapp';
import { sheetsService } from './services/sheets';
import {
  startScheduler,
  stopScheduler,
  triggerCaptureJob,
  triggerReportJob,
} from './jobs/scheduler';

// Track initialization state
let isShuttingDown = false;

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  logger.info('='.repeat(50));
  logger.info('WhatsApp Group Analytics System Starting...');
  logger.info('='.repeat(50));

  try {
    // Load and validate configuration
    const config = getConfig();
    logger.info('Configuration loaded', {
      sheetsId: config.google.spreadsheetId.substring(0, 10) + '...',
      captureCron: config.scheduler.captureCron,
      reportCron: config.scheduler.reportCron,
    });

    // Initialize Google Sheets service
    logger.info('Initializing Google Sheets connection...');
    await sheetsService.initialize();
    logger.info('Google Sheets connected successfully');

    // Initialize WhatsApp client
    logger.info('Initializing WhatsApp client...');
    logger.info('If this is the first run, scan the QR code with WhatsApp');
    await whatsAppService.initialize();
    logger.info('WhatsApp client ready');

    // Set user ID for message tracking if configured
    const dashboardUserId = process.env.DASHBOARD_USER_ID;
    if (dashboardUserId) {
      whatsAppService.setUserId(dashboardUserId);
      logger.info('Message tracking enabled for dashboard');
    } else {
      logger.warn('DASHBOARD_USER_ID not set - message tracking disabled');
    }

    // Start the scheduler
    logger.info('Starting job scheduler...');
    startScheduler();

    // Log startup complete
    logger.info('='.repeat(50));
    logger.info('System is now running!');
    logger.info('Capture job runs: every 3 hours');
    logger.info('Report job runs: daily at 10:00 AM');
    logger.info('Press Ctrl+C to stop');
    logger.info('='.repeat(50));

    // Run initial capture if requested via command line
    if (process.argv.includes('--run-capture')) {
      logger.info('Running initial capture job...');
      await triggerCaptureJob();
    }

    // Run initial report if requested via command line
    if (process.argv.includes('--run-report')) {
      logger.info('Running initial report job...');
      await triggerReportJob();
    }

    // Keep the process running
    await keepAlive();
  } catch (error) {
    logger.error('Failed to start application', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

/**
 * Keep the process running indefinitely
 */
function keepAlive(): Promise<void> {
  return new Promise((resolve) => {
    // This promise never resolves, keeping the process alive
    // The process will exit via signal handlers
    setInterval(() => {
      // Heartbeat - just to keep the event loop active
      if (isShuttingDown) {
        resolve();
      }
    }, 60000); // Check every minute
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop the scheduler first
    stopScheduler();

    // Destroy WhatsApp client
    await whatsAppService.destroy();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled rejection', {
    reason: String(reason),
  });
});

// Start the application
main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
