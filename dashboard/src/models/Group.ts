import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type GroupActivityStatus = 'active' | 'moderate' | 'inactive' | 'dormant'

export interface IGroup extends Document {
  groupId: string // WhatsApp group ID
  groupName: string
  isActive: boolean
  addedAt: Date
  userId: Types.ObjectId
  // Activity tracking fields
  lastMessageAt?: Date
  totalMessageCount: number
  todayMessageCount: number
  weekMessageCount: number
  activityStatus: GroupActivityStatus
  lastActivityCheck?: Date
  // Member tracking
  currentMemberCount: number
  adminCount: number
}

const GroupSchema = new Schema<IGroup>(
  {
    groupId: {
      type: String,
      required: [true, 'Group ID is required'],
    },
    groupName: {
      type: String,
      required: [true, 'Group name is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Activity tracking fields
    lastMessageAt: {
      type: Date,
    },
    totalMessageCount: {
      type: Number,
      default: 0,
    },
    todayMessageCount: {
      type: Number,
      default: 0,
    },
    weekMessageCount: {
      type: Number,
      default: 0,
    },
    activityStatus: {
      type: String,
      enum: ['active', 'moderate', 'inactive', 'dormant'],
      default: 'inactive',
    },
    lastActivityCheck: {
      type: Date,
    },
    // Member tracking
    currentMemberCount: {
      type: Number,
      default: 0,
    },
    adminCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Compound unique index: each user can only have one entry per WhatsApp group
GroupSchema.index({ userId: 1, groupId: 1 }, { unique: true })

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema)

export default Group
