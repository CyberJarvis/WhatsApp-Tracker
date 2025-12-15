import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IMessage extends Document {
  messageId: string
  groupId: Types.ObjectId
  userId: Types.ObjectId
  senderId: string
  senderName: string
  timestamp: Date
  content: string
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact'
  isFromAdmin: boolean
  hasMedia: boolean
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    messageId: {
      type: String,
      required: true,
      index: true,
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
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      default: 'Unknown',
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: '',
      maxlength: 1000, // Truncate long messages
    },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact'],
      default: 'text',
    },
    isFromAdmin: {
      type: Boolean,
      default: false,
    },
    hasMedia: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
MessageSchema.index({ groupId: 1, timestamp: -1 })
MessageSchema.index({ userId: 1, timestamp: -1 })
MessageSchema.index({ senderId: 1, groupId: 1 })
MessageSchema.index({ userId: 1, groupId: 1, timestamp: -1 })

// Unique constraint to prevent duplicate messages
MessageSchema.index({ messageId: 1, userId: 1 }, { unique: true })

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)
