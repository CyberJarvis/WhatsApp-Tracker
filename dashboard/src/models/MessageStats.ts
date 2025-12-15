import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMediaCount {
  text: number
  image: number
  video: number
  audio: number
  document: number
  sticker: number
  other: number
}

export interface IMessageStats extends Document {
  date: string // YYYY-MM-DD format
  hour?: number // 0-23 for hourly stats, undefined for daily
  groupId: Types.ObjectId
  userId: Types.ObjectId
  totalMessages: number
  adminMessages: number
  userMessages: number
  mediaCount: IMediaCount
  uniqueSenders: number
  createdAt: Date
  updatedAt: Date
}

const MediaCountSchema = new Schema<IMediaCount>(
  {
    text: { type: Number, default: 0 },
    image: { type: Number, default: 0 },
    video: { type: Number, default: 0 },
    audio: { type: Number, default: 0 },
    document: { type: Number, default: 0 },
    sticker: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  { _id: false }
)

const MessageStatsSchema = new Schema<IMessageStats>(
  {
    date: {
      type: String,
      required: true,
      index: true,
    },
    hour: {
      type: Number,
      min: 0,
      max: 23,
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
    totalMessages: {
      type: Number,
      default: 0,
    },
    adminMessages: {
      type: Number,
      default: 0,
    },
    userMessages: {
      type: Number,
      default: 0,
    },
    mediaCount: {
      type: MediaCountSchema,
      default: () => ({
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        sticker: 0,
        other: 0,
      }),
    },
    uniqueSenders: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
MessageStatsSchema.index({ groupId: 1, date: 1, hour: 1 })
MessageStatsSchema.index({ userId: 1, date: 1 })
MessageStatsSchema.index({ userId: 1, groupId: 1, date: 1 })

// Unique constraint: one stats record per group per date (or per hour if hourly)
MessageStatsSchema.index(
  { userId: 1, groupId: 1, date: 1, hour: 1 },
  { unique: true }
)

export default mongoose.models.MessageStats || mongoose.model<IMessageStats>('MessageStats', MessageStatsSchema)
