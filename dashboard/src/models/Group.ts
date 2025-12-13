import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IGroup extends Document {
  groupId: string // WhatsApp group ID
  groupName: string
  isActive: boolean
  addedAt: Date
  userId: Types.ObjectId
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
  },
  {
    timestamps: true,
  }
)

// Compound unique index: each user can only have one entry per WhatsApp group
GroupSchema.index({ userId: 1, groupId: 1 }, { unique: true })

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema)

export default Group
