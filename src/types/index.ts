/**
 * WhatsApp Group Analytics - Type Definitions
 */

// ============================================================================
// Google Sheets Data Types
// ============================================================================

/**
 * Group metadata stored in the "Groups" sheet
 */
export interface TrackedGroup {
  groupId: string;
  groupName: string;
  isActive: boolean;
  adminGroupId?: string;
  addedAt: string;
}

/**
 * Snapshot captured every 3 hours, stored in "Snapshots" sheet
 */
export interface GroupSnapshot {
  timestamp: string;
  groupId: string;
  groupName: string;
  totalMembers: number;
}

/**
 * Daily statistics stored in "DailyStats" sheet
 */
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

// ============================================================================
// WhatsApp Types (from whatsapp-web.js)
// ============================================================================

/**
 * WhatsApp Chat ID structure
 */
export interface ChatId {
  _serialized: string;
  server: string;
  user: string;
}

/**
 * WhatsApp Group Participant
 */
export interface GroupParticipant {
  id: ChatId;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/**
 * WhatsApp Group Chat (simplified for our use case)
 */
export interface WhatsAppGroup {
  id: ChatId;
  name: string;
  participants: GroupParticipant[];
  isGroup: boolean;
  archived: boolean;
  timestamp: number;
  owner?: ChatId;
  description?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Computed analytics for a single group
 */
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

/**
 * Daily report summary
 */
export interface DailyReportSummary {
  date: string;
  totalGroups: number;
  totalMembers: number;
  totalJoined: number;
  totalLeft: number;
  netGrowth: number;
  groupStats: GroupAnalytics[];
  anomalies: GroupAnalytics[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Application configuration
 */
export interface AppConfig {
  whatsapp: {
    sessionPath: string;
  };
  google: {
    spreadsheetId: string;
    credentialsPath: string;
  };
  scheduler: {
    captureCron: string;
    reportCron: string;
  };
  reporting: {
    adminGroupId: string;
  };
  logging: {
    level: string;
  };
}

// ============================================================================
// Job Types
// ============================================================================

/**
 * Job execution result
 */
export interface JobResult {
  success: boolean;
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  groupsProcessed: number;
  errors: string[];
}

/**
 * Capture job result with snapshot details
 */
export interface CaptureJobResult extends JobResult {
  snapshots: GroupSnapshot[];
}

/**
 * Report job result with stats details
 */
export interface ReportJobResult extends JobResult {
  stats: DailyStats[];
  reportSent: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error with context
 */
export interface AppError extends Error {
  code: string;
  context?: Record<string, unknown>;
  isRetryable: boolean;
}

/**
 * Error codes used throughout the application
 */
export enum ErrorCode {
  WHATSAPP_NOT_READY = 'WHATSAPP_NOT_READY',
  WHATSAPP_DISCONNECTED = 'WHATSAPP_DISCONNECTED',
  WHATSAPP_AUTH_FAILED = 'WHATSAPP_AUTH_FAILED',
  SHEETS_AUTH_FAILED = 'SHEETS_AUTH_FAILED',
  SHEETS_API_ERROR = 'SHEETS_API_ERROR',
  SHEETS_NOT_FOUND = 'SHEETS_NOT_FOUND',
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  INVALID_CONFIG = 'INVALID_CONFIG',
  JOB_FAILED = 'JOB_FAILED',
}

// ============================================================================
// Sheet Row Types (for Google Sheets API)
// ============================================================================

/**
 * Raw row from Groups sheet
 */
export type GroupsSheetRow = [
  string, // groupId
  string, // groupName
  string, // isActive (TRUE/FALSE)
  string, // adminGroupId
  string  // addedAt
];

/**
 * Raw row from DailyStats sheet
 */
export type DailyStatsSheetRow = [
  string, // date
  string, // groupId
  string, // groupName
  string, // totalMembers
  string, // joinedToday
  string, // leftToday
  string, // netGrowth
  string  // notes
];

/**
 * Raw row from Snapshots sheet
 */
export type SnapshotsSheetRow = [
  string, // timestamp
  string, // groupId
  string, // groupName
  string  // totalMembers
];
