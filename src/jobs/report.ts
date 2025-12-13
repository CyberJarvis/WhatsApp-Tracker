/**
 * Report Job
 * Runs daily at 10 AM to compute stats and send report
 */

import logger, { logJobStart, logJobComplete, logJobError } from '../utils/logger';
import {
  sleep,
  getDateString,
  generateRunId,
} from '../utils/helpers';
import { getConfig } from '../config';
import { whatsAppService } from '../services/whatsapp';
import { sheetsService } from '../services/sheets';
import { analyticsService } from '../services/analytics';
import {
  DailyStats,
  ReportJobResult,
  GroupAnalytics,
} from '../types';

// Rate limit delay between operations (ms)
const RATE_LIMIT_DELAY = 1000;

/**
 * Execute the report job
 * Computes daily stats and sends report to admin group
 */
export async function runReportJob(): Promise<ReportJobResult> {
  const runId = generateRunId();
  const startTime = new Date();
  const errors: string[] = [];
  const allStats: DailyStats[] = [];
  const groupAnalytics: GroupAnalytics[] = [];
  let reportSent = false;

  const today = getDateString();

  logJobStart('report');
  logger.info('Starting report job', { runId, today });

  try {
    // Get all active tracked groups
    const trackedGroups = await sheetsService.getActiveTrackedGroups();
    logger.info(`Found ${trackedGroups.length} active groups`, { runId });

    if (trackedGroups.length === 0) {
      logger.warn('No active groups to report on', { runId });
      return createResult(true, startTime, 0, [], errors, false);
    }

    // Process each group
    for (const group of trackedGroups) {
      try {
        // Check if we already have stats for today
        const existingStats = await sheetsService.statsExistForDate(
          group.groupId,
          today
        );

        if (existingStats) {
          logger.debug(`Stats already exist for today`, {
            runId,
            groupId: group.groupId,
          });
          continue;
        }

        // Get current member count
        const currentMembers = await whatsAppService.getGroupMemberCount(
          group.groupId
        );

        // Get yesterday's stats for comparison
        const yesterdayStats = await sheetsService.getYesterdayStats(group.groupId);
        const yesterdayMembers = yesterdayStats?.totalMembers ?? null;

        // Compute daily stats
        const stats = analyticsService.computeDailyStats(
          group.groupId,
          group.groupName,
          currentMembers,
          yesterdayMembers
        );

        allStats.push(stats);

        // Also compute extended analytics for report
        const analytics = analyticsService.computeGroupAnalytics(
          group.groupId,
          group.groupName,
          currentMembers,
          yesterdayMembers
        );

        groupAnalytics.push(analytics);

        logger.debug(`Computed stats for group`, {
          runId,
          groupId: group.groupId,
          members: currentMembers,
          joined: stats.joinedToday,
          left: stats.leftToday,
        });

        await sleep(RATE_LIMIT_DELAY);
      } catch (error) {
        const errorMsg = `${group.groupName}: ${(error as Error).message}`;
        errors.push(errorMsg);
        logger.error(`Failed to process group`, {
          runId,
          groupId: group.groupId,
          error: (error as Error).message,
        });
      }
    }

    // Batch save all daily stats
    if (allStats.length > 0) {
      logger.info(`Saving ${allStats.length} daily stats to Sheets`, { runId });
      await sheetsService.appendDailyStatsBatch(allStats);
    }

    // Generate and send report
    if (groupAnalytics.length > 0) {
      const summary = analyticsService.generateReportSummary(groupAnalytics);

      // Log compact summary
      logger.info(analyticsService.formatCompactSummary(summary), { runId });

      // Send report to admin group if configured
      const config = getConfig();
      if (config.reporting.adminGroupId) {
        const reportText = analyticsService.formatDailyReport(summary);

        logger.info('Sending report to admin group', {
          runId,
          adminGroupId: config.reporting.adminGroupId.substring(0, 10) + '...',
        });

        reportSent = await whatsAppService.sendMessage(
          config.reporting.adminGroupId,
          reportText
        );

        if (reportSent) {
          logger.info('Report sent successfully', { runId });
        } else {
          errors.push('Failed to send report to admin group');
          logger.error('Failed to send report', { runId });
        }
      } else {
        logger.info('No admin group configured, skipping report send', { runId });
      }

      // Check for significant anomalies
      if (analyticsService.hasSignificantAnomalies(summary)) {
        logger.warn('Significant anomalies detected in daily stats', {
          runId,
          anomalyCount: summary.anomalies.length,
        });
      }
    }

    const result = createResult(
      errors.length === 0,
      startTime,
      allStats.length,
      allStats,
      errors,
      reportSent
    );

    logJobComplete('report', result.duration, result.groupsProcessed);
    logger.info('Report job completed', {
      runId,
      success: result.success,
      groupsProcessed: result.groupsProcessed,
      reportSent,
      errors: errors.length,
    });

    return result;
  } catch (error) {
    logJobError('report', error as Error);
    logger.error('Report job failed', {
      runId,
      error: (error as Error).message,
    });

    return createResult(false, startTime, 0, [], [
      `Job failed: ${(error as Error).message}`,
    ], false);
  }
}

/**
 * Create a standardized job result
 */
function createResult(
  success: boolean,
  startTime: Date,
  groupsProcessed: number,
  stats: DailyStats[],
  errors: string[],
  reportSent: boolean
): ReportJobResult {
  const endTime = new Date();
  return {
    success,
    jobName: 'report',
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    groupsProcessed,
    errors,
    stats,
    reportSent,
  };
}

/**
 * Generate and return report without sending (useful for preview)
 */
export async function generateReportPreview(): Promise<string> {
  const trackedGroups = await sheetsService.getActiveTrackedGroups();
  const groupAnalytics: GroupAnalytics[] = [];

  for (const group of trackedGroups) {
    const currentMembers = await whatsAppService.getGroupMemberCount(group.groupId);
    const yesterdayStats = await sheetsService.getYesterdayStats(group.groupId);

    const analytics = analyticsService.computeGroupAnalytics(
      group.groupId,
      group.groupName,
      currentMembers,
      yesterdayStats?.totalMembers ?? null
    );

    groupAnalytics.push(analytics);
    await sleep(RATE_LIMIT_DELAY);
  }

  const summary = analyticsService.generateReportSummary(groupAnalytics);
  return analyticsService.formatDailyReport(summary);
}

export default runReportJob;
