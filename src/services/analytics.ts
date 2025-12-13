/**
 * Analytics Service
 * Computes daily statistics and generates reports
 */

import {
  calculatePercentageChange,
  isAnomalousChange,
  formatNumber,
  formatPercentage,
  getDateString,
  truncate,
} from '../utils/helpers';
import {
  GroupSnapshot,
  DailyStats,
  GroupAnalytics,
  DailyReportSummary,
} from '../types';

// Anomaly threshold (percentage drop that triggers warning)
const ANOMALY_THRESHOLD = 10;

/**
 * Analytics Service Class
 */
class AnalyticsService {
  /**
   * Compute daily stats for a single group
   */
  computeDailyStats(
    groupId: string,
    groupName: string,
    currentMembers: number,
    yesterdayMembers: number | null
  ): DailyStats {
    const today = getDateString();
    const notes: string[] = [];

    // Handle first-time entry
    if (yesterdayMembers === null) {
      notes.push('First day of tracking');
      return {
        date: today,
        groupId,
        groupName,
        totalMembers: currentMembers,
        joinedToday: 0,
        leftToday: 0,
        netGrowth: 0,
        notes: notes.join('; '),
      };
    }

    // Calculate changes
    const netChange = currentMembers - yesterdayMembers;
    const joined = netChange > 0 ? netChange : 0;
    const left = netChange < 0 ? Math.abs(netChange) : 0;

    // Check for anomalies
    if (isAnomalousChange(yesterdayMembers, currentMembers, ANOMALY_THRESHOLD)) {
      const percentDrop = calculatePercentageChange(yesterdayMembers, currentMembers);
      notes.push(`Large drop: ${formatPercentage(percentDrop)} (${left} members)`);
    }

    // Check for no change
    if (netChange === 0) {
      notes.push('No change');
    }

    return {
      date: today,
      groupId,
      groupName,
      totalMembers: currentMembers,
      joinedToday: joined,
      leftToday: left,
      netGrowth: netChange,
      notes: notes.join('; '),
    };
  }

  /**
   * Compute analytics for a group (extended stats)
   */
  computeGroupAnalytics(
    groupId: string,
    groupName: string,
    currentMembers: number,
    previousMembers: number | null
  ): GroupAnalytics {
    const prevCount = previousMembers ?? currentMembers;
    const netChange = currentMembers - prevCount;
    const joined = netChange > 0 ? netChange : 0;
    const left = netChange < 0 ? Math.abs(netChange) : 0;
    const percentChange = calculatePercentageChange(prevCount, currentMembers);
    const isAnomaly = isAnomalousChange(prevCount, currentMembers, ANOMALY_THRESHOLD);

    const notes: string[] = [];
    if (previousMembers === null) {
      notes.push('First day of tracking');
    }
    if (isAnomaly) {
      notes.push(`Anomaly: ${formatPercentage(percentChange)} change`);
    }
    if (netChange === 0 && previousMembers !== null) {
      notes.push('No change');
    }

    return {
      groupId,
      groupName,
      currentMembers,
      previousMembers: prevCount,
      joined,
      left,
      netGrowth: netChange,
      percentageChange: percentChange,
      isAnomaly,
      notes,
    };
  }

  /**
   * Generate daily report summary from group analytics
   */
  generateReportSummary(groupAnalytics: GroupAnalytics[]): DailyReportSummary {
    const today = getDateString();

    const totalMembers = groupAnalytics.reduce((sum, g) => sum + g.currentMembers, 0);
    const totalJoined = groupAnalytics.reduce((sum, g) => sum + g.joined, 0);
    const totalLeft = groupAnalytics.reduce((sum, g) => sum + g.left, 0);
    const anomalies = groupAnalytics.filter((g) => g.isAnomaly);

    return {
      date: today,
      totalGroups: groupAnalytics.length,
      totalMembers,
      totalJoined,
      totalLeft,
      netGrowth: totalJoined - totalLeft,
      groupStats: groupAnalytics,
      anomalies,
    };
  }

  /**
   * Format daily report as WhatsApp message
   */
  formatDailyReport(summary: DailyReportSummary): string {
    const lines: string[] = [];

    // Header
    lines.push(`📊 *Daily Group Analytics Report*`);
    lines.push(`📅 Date: ${summary.date}`);
    lines.push('');

    // Overall summary
    lines.push('*📈 Overall Summary*');
    lines.push(`• Groups Tracked: ${summary.totalGroups}`);
    lines.push(`• Total Members: ${formatNumber(summary.totalMembers)}`);
    lines.push(`• Joined Today: +${formatNumber(summary.totalJoined)}`);
    lines.push(`• Left Today: -${formatNumber(summary.totalLeft)}`);
    lines.push(`• Net Growth: ${summary.netGrowth >= 0 ? '+' : ''}${formatNumber(summary.netGrowth)}`);
    lines.push('');

    // Top gainers (top 5 groups with most joins)
    const topGainers = [...summary.groupStats]
      .filter((g) => g.joined > 0)
      .sort((a, b) => b.joined - a.joined)
      .slice(0, 5);

    if (topGainers.length > 0) {
      lines.push('*🚀 Top Gainers*');
      topGainers.forEach((g, i) => {
        lines.push(`${i + 1}. ${truncate(g.groupName, 25)}: +${g.joined} (${formatNumber(g.currentMembers)} total)`);
      });
      lines.push('');
    }

    // Top losers (top 5 groups with most leaves)
    const topLosers = [...summary.groupStats]
      .filter((g) => g.left > 0)
      .sort((a, b) => b.left - a.left)
      .slice(0, 5);

    if (topLosers.length > 0) {
      lines.push('*📉 Top Losers*');
      topLosers.forEach((g, i) => {
        lines.push(`${i + 1}. ${truncate(g.groupName, 25)}: -${g.left} (${formatNumber(g.currentMembers)} total)`);
      });
      lines.push('');
    }

    // Anomalies (if any)
    if (summary.anomalies.length > 0) {
      lines.push('*⚠️ Anomalies Detected*');
      summary.anomalies.forEach((g) => {
        lines.push(
          `• ${truncate(g.groupName, 25)}: ${formatPercentage(g.percentageChange)} (${g.previousMembers} → ${g.currentMembers})`
        );
      });
      lines.push('');
    }

    // Individual group stats (compact format)
    lines.push('*📋 All Groups*');
    lines.push('```');
    lines.push('Group                    | Members | Change');
    lines.push('-------------------------|---------|-------');

    summary.groupStats
      .sort((a, b) => b.currentMembers - a.currentMembers)
      .forEach((g) => {
        const name = truncate(g.groupName, 24).padEnd(24);
        const members = formatNumber(g.currentMembers).padStart(7);
        const change =
          g.netGrowth === 0
            ? '    0'
            : g.netGrowth > 0
            ? `   +${g.netGrowth}`.slice(-5)
            : `   ${g.netGrowth}`.slice(-5);
        lines.push(`${name} | ${members} | ${change}`);
      });

    lines.push('```');
    lines.push('');

    // Footer
    lines.push('_Generated automatically by WhatsApp Analytics Bot_');

    return lines.join('\n');
  }

  /**
   * Format a compact summary for logging
   */
  formatCompactSummary(summary: DailyReportSummary): string {
    return (
      `[${summary.date}] ` +
      `Groups: ${summary.totalGroups}, ` +
      `Members: ${formatNumber(summary.totalMembers)}, ` +
      `Joined: +${summary.totalJoined}, ` +
      `Left: -${summary.totalLeft}, ` +
      `Net: ${summary.netGrowth >= 0 ? '+' : ''}${summary.netGrowth}`
    );
  }

  /**
   * Detect if there's a significant anomaly in the data
   */
  hasSignificantAnomalies(summary: DailyReportSummary): boolean {
    // Consider significant if:
    // 1. More than 20% of groups have anomalies
    // 2. Total net loss is more than 5% of total members
    const anomalyRate = summary.anomalies.length / summary.totalGroups;
    const lossRate = summary.totalLeft / summary.totalMembers;

    return anomalyRate > 0.2 || lossRate > 0.05;
  }

  /**
   * Compare two snapshots to get the change
   */
  compareSnapshots(
    earlier: GroupSnapshot,
    later: GroupSnapshot
  ): { joined: number; left: number; netChange: number } {
    const netChange = later.totalMembers - earlier.totalMembers;
    return {
      joined: netChange > 0 ? netChange : 0,
      left: netChange < 0 ? Math.abs(netChange) : 0,
      netChange,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
