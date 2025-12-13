import { google } from 'googleapis';
import type {
  TrackedGroup,
  GroupSnapshot,
  DailyStats,
  GroupWithStats,
  DashboardSummary,
  TrendDataPoint
} from './types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// Sheet names matching the main system
const SHEETS = {
  GROUPS: 'Groups',
  DAILY_STATS: 'DailyStats',
  SNAPSHOTS: 'Snapshots',
};

class SheetsClient {
  private sheets: ReturnType<typeof google.sheets> | null = null;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  private async getClient() {
    if (this.sheets) return this.sheets;

    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || '../credentials/service-account.json';

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: SCOPES,
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }

  async getTrackedGroups(): Promise<TrackedGroup[]> {
    const sheets = await this.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEETS.GROUPS}!A2:E`,
    });

    const rows = response.data.values || [];

    return rows.map((row) => ({
      groupId: row[0] || '',
      groupName: row[1] || '',
      isActive: row[2]?.toUpperCase() === 'TRUE',
      adminGroupId: row[3] || undefined,
      addedAt: row[4] || '',
    }));
  }

  async getActiveGroups(): Promise<TrackedGroup[]> {
    const groups = await this.getTrackedGroups();
    return groups.filter(g => g.isActive);
  }

  async getSnapshots(days: number = 7): Promise<GroupSnapshot[]> {
    const sheets = await this.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEETS.SNAPSHOTS}!A2:D`,
    });

    const rows = response.data.values || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return rows
      .map((row) => ({
        timestamp: row[0] || '',
        groupId: row[1] || '',
        groupName: row[2] || '',
        totalMembers: parseInt(row[3] || '0', 10),
      }))
      .filter(snapshot => new Date(snapshot.timestamp) >= cutoffDate);
  }

  async getLatestSnapshots(): Promise<Map<string, GroupSnapshot>> {
    const snapshots = await this.getSnapshots(1);
    const latestMap = new Map<string, GroupSnapshot>();

    for (const snapshot of snapshots) {
      const existing = latestMap.get(snapshot.groupId);
      if (!existing || new Date(snapshot.timestamp) > new Date(existing.timestamp)) {
        latestMap.set(snapshot.groupId, snapshot);
      }
    }

    return latestMap;
  }

  async getDailyStats(date?: string): Promise<DailyStats[]> {
    const sheets = await this.getClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEETS.DAILY_STATS}!A2:H`,
    });

    const rows = response.data.values || [];

    const stats = rows.map((row) => ({
      date: row[0] || '',
      groupId: row[1] || '',
      groupName: row[2] || '',
      totalMembers: parseInt(row[3] || '0', 10),
      joinedToday: parseInt(row[4] || '0', 10),
      leftToday: parseInt(row[5] || '0', 10),
      netGrowth: parseInt(row[6] || '0', 10),
      notes: row[7] || '',
    }));

    if (date) {
      return stats.filter(s => s.date === date);
    }

    return stats;
  }

  async getStatsForDateRange(from: string, to: string): Promise<DailyStats[]> {
    const allStats = await this.getDailyStats();
    const fromDate = new Date(from);
    const toDate = new Date(to);

    return allStats.filter(s => {
      const d = new Date(s.date);
      return d >= fromDate && d <= toDate;
    });
  }

  async getGroupsWithStats(): Promise<GroupWithStats[]> {
    const [groups, latestSnapshots, yesterdayStats] = await Promise.all([
      this.getActiveGroups(),
      this.getLatestSnapshots(),
      this.getDailyStats(this.getYesterday()),
    ]);

    const yesterdayMap = new Map(yesterdayStats.map(s => [s.groupId, s]));

    return groups.map(group => {
      const snapshot = latestSnapshots.get(group.groupId);
      const yesterday = yesterdayMap.get(group.groupId);
      const currentMembers = snapshot?.totalMembers || 0;
      const yesterdayMembers = yesterday?.totalMembers;
      const todayGrowth = yesterdayMembers !== undefined
        ? currentMembers - yesterdayMembers
        : 0;

      return {
        ...group,
        currentMembers,
        todayGrowth,
        yesterdayMembers,
      };
    });
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [groups, latestSnapshots, todayStats] = await Promise.all([
      this.getTrackedGroups(),
      this.getLatestSnapshots(),
      this.getDailyStats(this.getToday()),
    ]);

    const activeGroups = groups.filter(g => g.isActive);
    let totalMembers = 0;

    for (const snapshot of latestSnapshots.values()) {
      totalMembers += snapshot.totalMembers;
    }

    const todayJoined = todayStats.reduce((sum, s) => sum + s.joinedToday, 0);
    const todayLeft = todayStats.reduce((sum, s) => sum + s.leftToday, 0);
    const anomalyCount = todayStats.filter(s => s.notes.includes('Large')).length;

    return {
      totalGroups: groups.length,
      activeGroups: activeGroups.length,
      totalMembers,
      todayJoined,
      todayLeft,
      netGrowth: todayJoined - todayLeft,
      anomalyCount,
    };
  }

  async getTrendData(days: number = 7): Promise<TrendDataPoint[]> {
    const allStats = await this.getDailyStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Group stats by date
    const dateMap = new Map<string, DailyStats[]>();

    for (const stat of allStats) {
      const statDate = new Date(stat.date);
      if (statDate >= cutoffDate) {
        const existing = dateMap.get(stat.date) || [];
        existing.push(stat);
        dateMap.set(stat.date, existing);
      }
    }

    // Aggregate by date
    const trendData: TrendDataPoint[] = [];

    for (const [date, stats] of dateMap) {
      trendData.push({
        date,
        totalMembers: stats.reduce((sum, s) => sum + s.totalMembers, 0),
        joined: stats.reduce((sum, s) => sum + s.joinedToday, 0),
        left: stats.reduce((sum, s) => sum + s.leftToday, 0),
        netGrowth: stats.reduce((sum, s) => sum + s.netGrowth, 0),
      });
    }

    // Sort by date
    trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return trendData;
  }

  async getSnapshotsForGroup(groupId: string, days: number = 7): Promise<GroupSnapshot[]> {
    const snapshots = await this.getSnapshots(days);
    return snapshots
      .filter(s => s.groupId === groupId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getStatsForGroup(groupId: string, days: number = 30): Promise<DailyStats[]> {
    const allStats = await this.getDailyStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allStats
      .filter(s => s.groupId === groupId && new Date(s.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterday(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const sheetsClient = new SheetsClient();
