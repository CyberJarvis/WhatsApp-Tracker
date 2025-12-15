import mongoose, { Schema, Document, Types } from 'mongoose'

export type ActivityLevel = 'high' | 'moderate' | 'low' | 'inactive'

export interface IMemberActivity extends Document {
  memberId: string // WhatsApp ID
  memberName: string
  memberPhone?: string
  groupId: Types.ObjectId
  userId: Types.ObjectId
  messageCount: number
  todayMessageCount: number
  weekMessageCount: number
  lastMessageAt?: Date
  firstSeenAt: Date
  lastSeenAt: Date
  isAdmin: boolean
  isActive: boolean
  activityLevel: ActivityLevel
  createdAt: Date
  updatedAt: Date
}

const MemberActivitySchema = new Schema<IMemberActivity>(
  {
    memberId: {
      type: String,
      required: true,
      index: true,
    },
    memberName: {
      type: String,
      default: 'Unknown',
    },
    memberPhone: {
      type: String,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    todayMessageCount: {
      type: Number,
      default: 0,
    },
    weekMessageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    activityLevel: {
      type: String,
      enum: ['high', 'moderate', 'low', 'inactive'],
      default: 'low',
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
MemberActivitySchema.index({ groupId: 1, messageCount: -1 }) // For leaderboards
MemberActivitySchema.index({ memberId: 1, groupId: 1 }) // For member lookup
MemberActivitySchema.index({ userId: 1, groupId: 1 })
MemberActivitySchema.index({ groupId: 1, activityLevel: 1 })
MemberActivitySchema.index({ groupId: 1, lastMessageAt: -1 })

// Unique constraint: one activity record per member per group per user
MemberActivitySchema.index(
  { userId: 1, groupId: 1, memberId: 1 },
  { unique: true }
)

export default mongoose.models.MemberActivity || mongoose.model<IMemberActivity>('MemberActivity', MemberActivitySchema)
