/**
 * Scheduler
 * Manages cron jobs for capture and report tasks
 */

import * as cron from 'node-cron';
import { getConfig } from '../config';
import logger from '../utils/logger';
import { runCaptureJob } from './capture';
import { runReportJob } from './report';

// Track scheduled jobs for cleanup
const scheduledJobs: cron.ScheduledTask[] = [];

// Track if jobs are currently running (prevent overlap)
let captureJobRunning = false;
let reportJobRunning = false;

/**
 * Initialize and start all scheduled jobs
 */
export function startScheduler(): void {
  const config = getConfig();

  logger.info('Starting scheduler', {
    captureCron: config.scheduler.captureCron,
    reportCron: config.scheduler.reportCron,
  });

  // Schedule capture job (every 3 hours by default)
  const captureJob = cron.schedule(
    config.scheduler.captureCron,
    async () => {
      if (captureJobRunning) {
        logger.warn('Capture job already running, skipping this run');
        return;
      }

      captureJobRunning = true;
      try {
        await runCaptureJob();
      } catch (error) {
        logger.error('Capture job threw an error', {
          error: (error as Error).message,
        });
      } finally {
        captureJobRunning = false;
      }
    },
    {
      scheduled: true,
      timezone: process.env.TZ || undefined,
    }
  );

  scheduledJobs.push(captureJob);
  logger.info('Capture job scheduled', { cron: config.scheduler.captureCron });

  // Schedule report job (10 AM daily by default)
  const reportJob = cron.schedule(
    config.scheduler.reportCron,
    async () => {
      if (reportJobRunning) {
        logger.warn('Report job already running, skipping this run');
        return;
      }

      reportJobRunning = true;
      try {
        await runReportJob();
      } catch (error) {
        logger.error('Report job threw an error', {
          error: (error as Error).message,
        });
      } finally {
        reportJobRunning = false;
      }
    },
    {
      scheduled: true,
      timezone: process.env.TZ || undefined,
    }
  );

  scheduledJobs.push(reportJob);
  logger.info('Report job scheduled', { cron: config.scheduler.reportCron });

  logger.info('Scheduler started successfully');
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  logger.info('Stopping scheduler...');

  for (const job of scheduledJobs) {
    job.stop();
  }

  scheduledJobs.length = 0;
  logger.info('Scheduler stopped');
}

/**
 * Manually trigger the capture job (useful for testing)
 */
export async function triggerCaptureJob(): Promise<void> {
  if (captureJobRunning) {
    logger.warn('Capture job already running');
    return;
  }

  logger.info('Manually triggering capture job');
  captureJobRunning = true;
  try {
    await runCaptureJob();
  } finally {
    captureJobRunning = false;
  }
}

/**
 * Manually trigger the report job (useful for testing)
 */
export async function triggerReportJob(): Promise<void> {
  if (reportJobRunning) {
    logger.warn('Report job already running');
    return;
  }

  logger.info('Manually triggering report job');
  reportJobRunning = true;
  try {
    await runReportJob();
  } finally {
    reportJobRunning = false;
  }
}

/**
 * Check if a cron expression is valid
 */
export function isValidCron(expression: string): boolean {
  return cron.validate(expression);
}

/**
 * Get next run times for scheduled jobs
 */
export function getNextRunTimes(): { capture: string; report: string } {
  const config = getConfig();

  // node-cron doesn't provide next run time directly
  // Return the cron expressions for reference
  return {
    capture: `Scheduled: ${config.scheduler.captureCron}`,
    report: `Scheduled: ${config.scheduler.reportCron}`,
  };
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  jobsCount: number;
  captureRunning: boolean;
  reportRunning: boolean;
} {
  return {
    isRunning: scheduledJobs.length > 0,
    jobsCount: scheduledJobs.length,
    captureRunning: captureJobRunning,
    reportRunning: reportJobRunning,
  };
}

export default {
  startScheduler,
  stopScheduler,
  triggerCaptureJob,
  triggerReportJob,
  getSchedulerStatus,
  getNextRunTimes,
};
