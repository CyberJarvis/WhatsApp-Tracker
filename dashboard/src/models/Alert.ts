import mongoose, { Schema, Document, Types } from 'mongoose'

export type AlertType = 'inactivity' | 'member_surge' | 'member_drop' | 'high_activity' | 'low_activity' | 'custom'
export type AlertOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
export type AlertMetric = 'message_count' | 'member_count' | 'member_change' | 'days_inactive' | 'message_rate'
export type NotificationChannel = 'in_app' | 'email'

export interface IAlertCondition {
  metric: AlertMetric
  operator: AlertOperator
  threshold: number
  timeWindowHours?: number // For rate-based alerts
}

export interface IAlert extends Document {
  userId: Types.ObjectId
  name: string
  description?: string
  alertType: AlertType
  condition: IAlertCondition
  groupIds: Types.ObjectId[] // Specific groups, empty = all
  applyToAllGroups: boolean
  notificationChannels: NotificationChannel[]
  isActive: boolean
  cooldownHours: number // Minimum hours between triggers
  lastTriggeredAt?: Date
  triggerCount: number
  createdAt: Date
  updatedAt: Date
}

const AlertConditionSchema = new Schema<IAlertCondition>(
  {
    metric: {
      type: String,
      enum: ['message_count', 'member_count', 'member_change', 'days_inactive', 'message_rate'],
      required: true,
    },
    operator: {
      type: String,
      enum: ['gt', 'lt', 'eq', 'gte', 'lte'],
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
    timeWindowHours: {
      type: Number,
      min: 1,
      max: 168, // Max 1 week
    },
  },
  { _id: false }
)

const AlertSchema = new Schema<IAlert>(
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
    description: {
      type: String,
      maxlength: 500,
    },
    alertType: {
      type: String,
      enum: ['inactivity', 'member_surge', 'member_drop', 'high_activity', 'low_activity', 'custom'],
      required: true,
    },
    condition: {
      type: AlertConditionSchema,
      required: true,
    },
    groupIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Group',
      default: [],
    },
    applyToAllGroups: {
      type: Boolean,
      default: true,
    },
    notificationChannels: {
      type: [String],
      enum: ['in_app', 'email'],
      default: ['in_app'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    cooldownHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
    lastTriggeredAt: {
      type: Date,
    },
    triggerCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
AlertSchema.index({ userId: 1, isActive: 1 })
AlertSchema.index({ isActive: 1, lastTriggeredAt: 1 })

export default mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema)
