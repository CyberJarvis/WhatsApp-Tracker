import mongoose, { Schema, Document, Types } from 'mongoose'

export type NotificationType = 'alert' | 'report' | 'system' | 'info'
export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success'

export interface INotificationMetadata {
  alertId?: Types.ObjectId
  reportId?: Types.ObjectId
  groupId?: Types.ObjectId
  groupName?: string
  metric?: string
  value?: number
  threshold?: number
  link?: string
}

export interface INotification extends Document {
  userId: Types.ObjectId
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  isRead: boolean
  readAt?: Date
  metadata?: INotificationMetadata
  expiresAt?: Date
  createdAt: Date
}

const NotificationMetadataSchema = new Schema<INotificationMetadata>(
  {
    alertId: { type: Schema.Types.ObjectId, ref: 'Alert' },
    reportId: { type: Schema.Types.ObjectId, ref: 'ScheduledReport' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    groupName: { type: String },
    metric: { type: String },
    value: { type: Number },
    threshold: { type: Number },
    link: { type: String },
  },
  { _id: false }
)

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['alert', 'report', 'system', 'info'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'success'],
      default: 'info',
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: NotificationMetadataSchema,
    },
    expiresAt: {
      type: Date,
      // Note: Index is created below as TTL index with expireAfterSeconds
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index for auto-deletion

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
