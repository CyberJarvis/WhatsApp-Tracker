import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ICluster extends Document {
  _id: Types.ObjectId
  name: string
  description?: string
  color: string
  userId: Types.ObjectId
  groupIds: string[]
  groupCount: number
  createdAt: Date
  updatedAt: Date
}

const ClusterSchema = new Schema<ICluster>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    color: {
      type: String,
      required: true,
      default: '#3B82F6',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupIds: {
      type: [String],
      default: [],
    },
    groupCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for unique cluster names per user
ClusterSchema.index({ userId: 1, name: 1 }, { unique: true })

// Index for efficient group lookup
ClusterSchema.index({ userId: 1, groupIds: 1 })

// Pre-save hook to update groupCount
ClusterSchema.pre('save', function () {
  this.groupCount = this.groupIds.length
})

// Pre-findOneAndUpdate hook to update groupCount
ClusterSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as { groupIds?: string[]; $set?: { groupIds?: string[] } }
  if (update.groupIds) {
    this.set({ groupCount: update.groupIds.length })
  } else if (update.$set?.groupIds) {
    this.set({ groupCount: update.$set.groupIds.length })
  }
})

export default mongoose.models.Cluster || mongoose.model<ICluster>('Cluster', ClusterSchema)

// Color presets for clusters
export const CLUSTER_COLORS = [
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Cyan', hex: '#06B6D4' },
]
