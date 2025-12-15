import mongoose, { Schema, Document, Types } from 'mongoose'

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export interface IReportMetrics {
  memberGrowth: boolean
  messageActivity: boolean
  topMembers: boolean
  anomalies: boolean
  groupComparison: boolean
}

export interface IScheduledReport extends Document {
  userId: Types.ObjectId
  name: string
  frequency: ReportFrequency
  dayOfWeek?: number // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number // 1-31 for monthly
  hour: number // 0-23 UTC
  minute: number // 0-59
  recipients: string[] // Email addresses
  groupIds: Types.ObjectId[] // Specific groups, empty = all
  includeAllGroups: boolean
  includeMetrics: IReportMetrics
  format: 'email' | 'pdf' | 'csv'
  isActive: boolean
  lastRunAt?: Date
  lastRunStatus?: 'success' | 'failed'
  lastRunError?: string
  nextRunAt: Date
  createdAt: Date
  updatedAt: Date
}

const ReportMetricsSchema = new Schema<IReportMetrics>(
  {
    memberGrowth: { type: Boolean, default: true },
    messageActivity: { type: Boolean, default: true },
    topMembers: { type: Boolean, default: true },
    anomalies: { type: Boolean, default: true },
    groupComparison: { type: Boolean, default: false },
  },
  { _id: false }
)

const ScheduledReportSchema = new Schema<IScheduledReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
    },
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
      default: 9,
    },
    minute: {
      type: Number,
      default: 0,
      min: 0,
      max: 59,
    },
    recipients: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one recipient email is required',
      },
    },
    groupIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Group',
      default: [],
    },
    includeAllGroups: {
      type: Boolean,
      default: true,
    },
    includeMetrics: {
      type: ReportMetricsSchema,
      default: () => ({
        memberGrowth: true,
        messageActivity: true,
        topMembers: true,
        anomalies: true,
        groupComparison: false,
      }),
    },
    format: {
      type: String,
      enum: ['email', 'pdf', 'csv'],
      default: 'email',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRunAt: {
      type: Date,
    },
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed'],
    },
    lastRunError: {
      type: String,
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for finding reports to run
ScheduledReportSchema.index({ isActive: 1, nextRunAt: 1 })
ScheduledReportSchema.index({ userId: 1, isActive: 1 })

export default mongoose.models.ScheduledReport || mongoose.model<IScheduledReport>('ScheduledReport', ScheduledReportSchema)
