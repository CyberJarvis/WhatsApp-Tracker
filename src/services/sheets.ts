/**
 * Google Sheets Service
 * Manages all Google Sheets API operations
 */

import { google, sheets_v4 } from 'googleapis';
import * as path from 'path';
import { getConfig } from '../config';
import logger, { logSheetsOperation } from '../utils/logger';
import {
  getYesterdayDateString,
  parseBoolean,
  parseIntSafe,
  retryWithBackoff,
} from '../utils/helpers';
import {
  TrackedGroup,
  GroupSnapshot,
  DailyStats,
  GroupsSheetRow,
  DailyStatsSheetRow,
  SnapshotsSheetRow,
} from '../types';

// Sheet names
const SHEETS = {
  GROUPS: 'Groups',
  DAILY_STATS: 'DailyStats',
  SNAPSHOTS: 'Snapshots',
};

// Column headers for each sheet
const HEADERS = {
  GROUPS: ['groupId', 'groupName', 'isActive', 'adminGroupId', 'addedAt'],
  DAILY_STATS: [
    'date',
    'groupId',
    'groupName',
    'totalMembers',
    'joinedToday',
    'leftToday',
    'netGrowth',
    'notes',
  ],
  SNAPSHOTS: ['timestamp', 'groupId', 'groupName', 'totalMembers'],
};

/**
 * Google Sheets Service Class
 */
class SheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string = '';
  private isInitialized: boolean = false;

  /**
   * Initialize the Google Sheets client with service account
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Sheets service already initialized');
      return;
    }

    const config = getConfig();
    this.spreadsheetId = config.google.spreadsheetId;

    try {
      const credentialsPath = path.resolve(config.google.credentialsPath);
      logger.info('Loading Google credentials', { path: credentialsPath });

      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.isInitialized = true;

      // Verify connection by reading spreadsheet metadata
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      logSheetsOperation('initialize', true);
      logger.info('Google Sheets service initialized successfully');

      // Ensure required sheets exist
      await this.ensureSheetsExist();
    } catch (error) {
      logSheetsOperation('initialize', false, { error: (error as Error).message });
      throw new Error(
        `Failed to initialize Google Sheets: ${(error as Error).message}`
      );
    }
  }

  /**
   * Ensure all required sheets exist with headers
   */
  private async ensureSheetsExist(): Promise<void> {
    const spreadsheet = await this.sheets!.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const existingSheets =
      spreadsheet.data.sheets?.map((s) => s.properties?.title) || [];

    for (const [sheetName, headers] of Object.entries({
      [SHEETS.GROUPS]: HEADERS.GROUPS,
      [SHEETS.DAILY_STATS]: HEADERS.DAILY_STATS,
      [SHEETS.SNAPSHOTS]: HEADERS.SNAPSHOTS,
    })) {
      if (!existingSheets.includes(sheetName)) {
        logger.info(`Creating sheet: ${sheetName}`);
        await this.createSheet(sheetName, headers);
      }
    }
  }

  /**
   * Create a new sheet with headers
   */
  private async createSheet(sheetName: string, headers: string[]): Promise<void> {
    await this.sheets!.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    // Add headers
    await this.sheets!.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    logSheetsOperation('create_sheet', true, { sheetName });
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.sheets) {
      throw new Error('Sheets service not initialized');
    }
  }

  // ============================================================================
  // Groups Sheet Operations
  // ============================================================================

  /**
   * Get all tracked groups from the Groups sheet
   */
  async getTrackedGroups(): Promise<TrackedGroup[]> {
    this.ensureInitialized();

    try {
      const response = await retryWithBackoff(async () => {
        return this.sheets!.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${SHEETS.GROUPS}!A2:E`,
        });
      });

      const rows = (response.data.values || []) as GroupsSheetRow[];
      const groups: TrackedGroup[] = rows
        .filter((row) => row[0]) // Filter out empty rows
        .map((row) => ({
          groupId: row[0] || '',
          groupName: row[1] || '',
          isActive: parseBoolean(row[2]),
          adminGroupId: row[3] || undefined,
          addedAt: row[4] || '',
        }));

      logSheetsOperation('get_tracked_groups', true, { count: groups.length });
      return groups;
    } catch (error) {
      logSheetsOperation('get_tracked_groups', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get only active tracked groups
   */
  async getActiveTrackedGroups(): Promise<TrackedGroup[]> {
    const groups = await this.getTrackedGroups();
    return groups.filter((g) => g.isActive);
  }

  /**
   * Add a new group to tracking
   */
  async addTrackedGroup(group: TrackedGroup): Promise<void> {
    this.ensureInitialized();

    try {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.GROUPS}!A:E`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              group.groupId,
              group.groupName,
              group.isActive ? 'TRUE' : 'FALSE',
              group.adminGroupId || '',
              group.addedAt,
            ],
          ],
        },
      });

      logSheetsOperation('add_tracked_group', true, { groupId: group.groupId });
    } catch (error) {
      logSheetsOperation('add_tracked_group', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update group's active status
   */
  async updateGroupStatus(groupId: string, isActive: boolean): Promise<void> {
    this.ensureInitialized();

    try {
      const groups = await this.getTrackedGroups();
      const rowIndex = groups.findIndex((g) => g.groupId === groupId);

      if (rowIndex === -1) {
        logger.warn('Group not found for status update', { groupId });
        return;
      }

      // Row index + 2 (1 for header, 1 for 0-based index)
      const range = `${SHEETS.GROUPS}!C${rowIndex + 2}`;
      await this.sheets!.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[isActive ? 'TRUE' : 'FALSE']],
        },
      });

      logSheetsOperation('update_group_status', true, { groupId, isActive });
    } catch (error) {
      logSheetsOperation('update_group_status', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ============================================================================
  // Snapshots Sheet Operations
  // ============================================================================

  /**
   * Append a snapshot to the Snapshots sheet
   */
  async appendSnapshot(snapshot: GroupSnapshot): Promise<void> {
    this.ensureInitialized();

    try {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.SNAPSHOTS}!A:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              snapshot.timestamp,
              snapshot.groupId,
              snapshot.groupName,
              snapshot.totalMembers.toString(),
            ],
          ],
        },
      });

      logSheetsOperation('append_snapshot', true, {
        groupId: snapshot.groupId,
        members: snapshot.totalMembers,
      });
    } catch (error) {
      logSheetsOperation('append_snapshot', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Append multiple snapshots in batch
   */
  async appendSnapshots(snapshots: GroupSnapshot[]): Promise<void> {
    this.ensureInitialized();

    if (snapshots.length === 0) return;

    try {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.SNAPSHOTS}!A:D`,
        valueInputOption: 'RAW',
        requestBody: {
          values: snapshots.map((s) => [
            s.timestamp,
            s.groupId,
            s.groupName,
            s.totalMembers.toString(),
          ]),
        },
      });

      logSheetsOperation('append_snapshots_batch', true, {
        count: snapshots.length,
      });
    } catch (error) {
      logSheetsOperation('append_snapshots_batch', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get the latest snapshot for a group
   */
  async getLatestSnapshot(groupId: string): Promise<GroupSnapshot | null> {
    this.ensureInitialized();

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.SNAPSHOTS}!A2:D`,
      });

      const rows = (response.data.values || []) as SnapshotsSheetRow[];

      // Filter by groupId and get the latest (last) one
      const groupSnapshots = rows.filter((row) => row[1] === groupId);

      if (groupSnapshots.length === 0) return null;

      const latest = groupSnapshots[groupSnapshots.length - 1];
      return {
        timestamp: latest[0],
        groupId: latest[1],
        groupName: latest[2],
        totalMembers: parseIntSafe(latest[3]),
      };
    } catch (error) {
      logSheetsOperation('get_latest_snapshot', false, {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Get snapshots for a specific date
   */
  async getSnapshotsForDate(
    groupId: string,
    date: string
  ): Promise<GroupSnapshot[]> {
    this.ensureInitialized();

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.SNAPSHOTS}!A2:D`,
      });

      const rows = (response.data.values || []) as SnapshotsSheetRow[];

      return rows
        .filter((row) => row[1] === groupId && row[0].startsWith(date))
        .map((row) => ({
          timestamp: row[0],
          groupId: row[1],
          groupName: row[2],
          totalMembers: parseIntSafe(row[3]),
        }));
    } catch (error) {
      logSheetsOperation('get_snapshots_for_date', false, {
        error: (error as Error).message,
      });
      return [];
    }
  }

  // ============================================================================
  // DailyStats Sheet Operations
  // ============================================================================

  /**
   * Append daily stats to the DailyStats sheet
   */
  async appendDailyStats(stats: DailyStats): Promise<void> {
    this.ensureInitialized();

    try {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.DAILY_STATS}!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              stats.date,
              stats.groupId,
              stats.groupName,
              stats.totalMembers.toString(),
              stats.joinedToday.toString(),
              stats.leftToday.toString(),
              stats.netGrowth.toString(),
              stats.notes,
            ],
          ],
        },
      });

      logSheetsOperation('append_daily_stats', true, {
        groupId: stats.groupId,
        date: stats.date,
      });
    } catch (error) {
      logSheetsOperation('append_daily_stats', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Append multiple daily stats in batch
   */
  async appendDailyStatsBatch(statsList: DailyStats[]): Promise<void> {
    this.ensureInitialized();

    if (statsList.length === 0) return;

    try {
      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.DAILY_STATS}!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values: statsList.map((s) => [
            s.date,
            s.groupId,
            s.groupName,
            s.totalMembers.toString(),
            s.joinedToday.toString(),
            s.leftToday.toString(),
            s.netGrowth.toString(),
            s.notes,
          ]),
        },
      });

      logSheetsOperation('append_daily_stats_batch', true, {
        count: statsList.length,
      });
    } catch (error) {
      logSheetsOperation('append_daily_stats_batch', false, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get yesterday's stats for a group
   */
  async getYesterdayStats(groupId: string): Promise<DailyStats | null> {
    this.ensureInitialized();

    const yesterday = getYesterdayDateString();

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.DAILY_STATS}!A2:H`,
      });

      const rows = (response.data.values || []) as DailyStatsSheetRow[];

      const row = rows.find((r) => r[0] === yesterday && r[1] === groupId);

      if (!row) return null;

      return {
        date: row[0],
        groupId: row[1],
        groupName: row[2],
        totalMembers: parseIntSafe(row[3]),
        joinedToday: parseIntSafe(row[4]),
        leftToday: parseIntSafe(row[5]),
        netGrowth: parseIntSafe(row[6]),
        notes: row[7] || '',
      };
    } catch (error) {
      logSheetsOperation('get_yesterday_stats', false, {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Get stats for a specific date
   */
  async getStatsForDate(date: string): Promise<DailyStats[]> {
    this.ensureInitialized();

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.DAILY_STATS}!A2:H`,
      });

      const rows = (response.data.values || []) as DailyStatsSheetRow[];

      return rows
        .filter((r) => r[0] === date)
        .map((row) => ({
          date: row[0],
          groupId: row[1],
          groupName: row[2],
          totalMembers: parseIntSafe(row[3]),
          joinedToday: parseIntSafe(row[4]),
          leftToday: parseIntSafe(row[5]),
          netGrowth: parseIntSafe(row[6]),
          notes: row[7] || '',
        }));
    } catch (error) {
      logSheetsOperation('get_stats_for_date', false, {
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Check if stats already exist for a group on a specific date
   */
  async statsExistForDate(groupId: string, date: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${SHEETS.DAILY_STATS}!A2:B`,
      });

      const rows = (response.data.values || []) as string[][];
      return rows.some((r) => r[0] === date && r[1] === groupId);
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const sheetsService = new SheetsService();
export default sheetsService;
