import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ISnapshot extends Document {
  timestamp: Date
  totalMembers: number
  groupId: Types.ObjectId
  userId: Types.ObjectId
}

const SnapshotSchema = new Schema<ISnapshot>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    totalMembers: {
      type: Number,
      required: true,
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
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
SnapshotSchema.index({ userId: 1, timestamp: -1 })
SnapshotSchema.index({ groupId: 1, timestamp: -1 })

const Snapshot: Model<ISnapshot> = mongoose.models.Snapshot || mongoose.model<ISnapshot>('Snapshot', SnapshotSchema)

export default Snapshot
