import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IDailyStat extends Document {
  date: string // YYYY-MM-DD
  totalMembers: number
  joinedToday: number
  leftToday: number
  netGrowth: number
  notes?: string
  groupId: Types.ObjectId
  userId: Types.ObjectId
}

const DailyStatSchema = new Schema<IDailyStat>(
  {
    date: {
      type: String,
      required: true,
      index: true,
    },
    totalMembers: {
      type: Number,
      required: true,
    },
    joinedToday: {
      type: Number,
      default: 0,
    },
    leftToday: {
      type: Number,
      default: 0,
    },
    netGrowth: {
      type: Number,
      default: 0,
    },
    notes: {
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
  },
  {
    timestamps: true,
  }
)

// Compound unique index: one stat per user, group, and date
DailyStatSchema.index({ userId: 1, groupId: 1, date: 1 }, { unique: true })

const DailyStat: Model<IDailyStat> = mongoose.models.DailyStat || mongoose.model<IDailyStat>('DailyStat', DailyStatSchema)

export default DailyStat
