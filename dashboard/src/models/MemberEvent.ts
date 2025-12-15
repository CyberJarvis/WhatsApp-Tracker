import mongoose, { Schema, Document, Types } from 'mongoose'

export type EventType = 'join' | 'leave'
export type DetectionMethod = 'real-time' | 'snapshot-diff'

export interface IMemberEvent extends Document {
  memberId: string
  memberName?: string
  memberPhone?: string
  groupId: Types.ObjectId
  userId: Types.ObjectId
  eventType: EventType
  timestamp: Date
  detectedVia: DetectionMethod
  triggeredBy?: string // Who added/removed (if available)
  createdAt: Date
}

const MemberEventSchema = new Schema<IMemberEvent>(
  {
    memberId: {
      type: String,
      required: true,
      index: true,
    },
    memberName: {
      type: String,
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
    eventType: {
      type: String,
      enum: ['join', 'leave'],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    detectedVia: {
      type: String,
      enum: ['real-time', 'snapshot-diff'],
      default: 'real-time',
    },
    triggeredBy: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Compound indexes for efficient queries
MemberEventSchema.index({ groupId: 1, timestamp: -1 })
MemberEventSchema.index({ userId: 1, timestamp: -1 })
MemberEventSchema.index({ groupId: 1, eventType: 1, timestamp: -1 })
MemberEventSchema.index({ userId: 1, groupId: 1, timestamp: -1 })

export default mongoose.models.MemberEvent || mongoose.model<IMemberEvent>('MemberEvent', MemberEventSchema)
