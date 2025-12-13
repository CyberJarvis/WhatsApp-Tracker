/**
 * Capture Job
 * Runs every 3 hours to capture group member snapshots
 */

import logger, { logJobStart, logJobComplete, logJobError } from '../utils/logger';
import { sleep, getTimestamp, generateRunId } from '../utils/helpers';
import { whatsAppService } from '../services/whatsapp';
import { sheetsService } from '../services/sheets';
import { GroupSnapshot, CaptureJobResult, TrackedGroup } from '../types';

// Rate limit delay between group fetches (ms)
const RATE_LIMIT_DELAY = 1500;

/**
 * Execute the capture job
 * Fetches current member counts for all tracked groups and saves snapshots
 */
export async function runCaptureJob(): Promise<CaptureJobResult> {
  const runId = generateRunId();
  const startTime = new Date();
  const errors: string[] = [];
  const snapshots: GroupSnapshot[] = [];

  logJobStart('capture');
  logger.info('Starting capture job', { runId });

  try {
    // Get all active tracked groups from Sheets
    const trackedGroups = await sheetsService.getActiveTrackedGroups();
    logger.info(`Found ${trackedGroups.length} active groups to track`, { runId });

    if (trackedGroups.length === 0) {
      logger.warn('No active groups to track', { runId });
      return createResult(true, startTime, 0, [], errors);
    }

    // Process each group
    for (const group of trackedGroups) {
      try {
        logger.debug(`Processing group: ${group.groupName}`, {
          runId,
          groupId: group.groupId,
        });

        // Fetch current member count from WhatsApp
        const memberCount = await whatsAppService.getGroupMemberCount(group.groupId);

        if (memberCount === 0) {
          // Group might be inaccessible or deleted
          logger.warn(`Group returned 0 members, may be inaccessible`, {
            runId,
            groupId: group.groupId,
            groupName: group.groupName,
          });
          errors.push(`${group.groupName}: No members found (may be inaccessible)`);
        }

        // Create snapshot
        const snapshot: GroupSnapshot = {
          timestamp: getTimestamp(),
          groupId: group.groupId,
          groupName: group.groupName,
          totalMembers: memberCount,
        };

        snapshots.push(snapshot);

        logger.debug(`Captured snapshot`, {
          runId,
          groupId: group.groupId,
          members: memberCount,
        });

        // Rate limiting delay
        await sleep(RATE_LIMIT_DELAY);
      } catch (error) {
        const errorMsg = `${group.groupName}: ${(error as Error).message}`;
        errors.push(errorMsg);
        logger.error(`Failed to capture group`, {
          runId,
          groupId: group.groupId,
          error: (error as Error).message,
        });
      }
    }

    // Batch save all snapshots to Sheets
    if (snapshots.length > 0) {
      logger.info(`Saving ${snapshots.length} snapshots to Sheets`, { runId });
      await sheetsService.appendSnapshots(snapshots);
    }

    const result = createResult(
      errors.length === 0,
      startTime,
      snapshots.length,
      snapshots,
      errors
    );

    logJobComplete('capture', result.duration, result.groupsProcessed);
    logger.info('Capture job completed', {
      runId,
      success: result.success,
      groupsProcessed: result.groupsProcessed,
      errors: errors.length,
    });

    return result;
  } catch (error) {
    logJobError('capture', error as Error);
    logger.error('Capture job failed', {
      runId,
      error: (error as Error).message,
    });

    return createResult(false, startTime, 0, [], [
      `Job failed: ${(error as Error).message}`,
    ]);
  }
}

/**
 * Create a standardized job result
 */
function createResult(
  success: boolean,
  startTime: Date,
  groupsProcessed: number,
  snapshots: GroupSnapshot[],
  errors: string[]
): CaptureJobResult {
  const endTime = new Date();
  return {
    success,
    jobName: 'capture',
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    groupsProcessed,
    errors,
    snapshots,
  };
}

/**
 * Run capture for a single group (useful for testing)
 */
export async function captureGroup(group: TrackedGroup): Promise<GroupSnapshot | null> {
  try {
    const memberCount = await whatsAppService.getGroupMemberCount(group.groupId);

    const snapshot: GroupSnapshot = {
      timestamp: getTimestamp(),
      groupId: group.groupId,
      groupName: group.groupName,
      totalMembers: memberCount,
    };

    await sheetsService.appendSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    logger.error('Failed to capture single group', {
      groupId: group.groupId,
      error: (error as Error).message,
    });
    return null;
  }
}

export default runCaptureJob;
