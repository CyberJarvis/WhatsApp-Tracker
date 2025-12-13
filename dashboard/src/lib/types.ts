// Types matching the main WhatsApp tracker system

export interface TrackedGroup {
  groupId: string;
  groupName: string;
  isActive: boolean;
  adminGroupId?: string;
  addedAt: string;
}

export interface GroupSnapshot {
  timestamp: string;
  groupId: string;
  groupName: string;
  totalMembers: number;
}

export interface DailyStats {
  date: string;
  groupId: string;
  groupName: string;
  totalMembers: number;
  joinedToday: number;
  leftToday: number;
  netGrowth: number;
  notes: string;
}

export interface GroupWithStats extends TrackedGroup {
  currentMembers: number;
  todayGrowth: number;
  yesterdayMembers?: number;
}

export interface DashboardSummary {
  totalGroups: number;
  activeGroups: number;
  totalMembers: number;
  todayJoined: number;
  todayLeft: number;
  netGrowth: number;
  anomalyCount: number;
}

export interface GroupAnalytics {
  groupId: string;
  groupName: string;
  currentMembers: number;
  previousMembers: number;
  joined: number;
  left: number;
  netGrowth: number;
  percentageChange: number;
  isAnomaly: boolean;
  notes: string[];
}

export interface DailyReportSummary {
  date: string;
  totalGroups: number;
  totalMembers: number;
  totalJoined: number;
  totalLeft: number;
  netGrowth: number;
  groupStats: GroupAnalytics[];
  anomalies: GroupAnalytics[];
  topGainers: GroupAnalytics[];
  topLosers: GroupAnalytics[];
}

export interface TrendDataPoint {
  date: string;
  totalMembers: number;
  joined: number;
  left: number;
  netGrowth: number;
}

export interface ExportRequest {
  type: 'csv' | 'excel' | 'pdf';
  dateRange: {
    from: string;
    to: string;
  };
  groupIds?: string[];
}
