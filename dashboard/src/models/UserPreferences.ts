import mongoose, { Schema, Document, Types } from 'mongoose'

export interface IDashboardSettings {
  defaultDateRange: number // days
  refreshInterval: number // seconds
  showInactiveGroups: boolean
  compactView: boolean
}

export interface INotificationSettings {
  emailEnabled: boolean
  inAppEnabled: boolean
  dailyDigest: boolean
  digestTime: number // hour 0-23
}

export interface IUserPreferences extends Document {
  userId: Types.ObjectId
  selectedGroupIds: string[] // WhatsApp group IDs
  selectAll: boolean
  // Cluster filtering
  selectedClusterIds: string[] // Cluster ObjectIds for filtering
  clusterFilterMode: 'all' | 'selected' // Whether filtering by clusters
  dashboardSettings: IDashboardSettings
  notificationSettings: INotificationSettings
  timezone: string
  updatedAt: Date
  createdAt: Date
}

const DashboardSettingsSchema = new Schema<IDashboardSettings>(
  {
    defaultDateRange: { type: Number, default: 7 },
    refreshInterval: { type: Number, default: 300 }, // 5 minutes
    showInactiveGroups: { type: Boolean, default: false },
    compactView: { type: Boolean, default: false },
  },
  { _id: false }
)

const NotificationSettingsSchema = new Schema<INotificationSettings>(
  {
    emailEnabled: { type: Boolean, default: true },
    inAppEnabled: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false },
    digestTime: { type: Number, default: 9, min: 0, max: 23 },
  },
  { _id: false }
)

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    selectedGroupIds: {
      type: [String],
      default: [],
    },
    selectAll: {
      type: Boolean,
      default: true,
    },
    selectedClusterIds: {
      type: [String],
      default: [],
    },
    clusterFilterMode: {
      type: String,
      enum: ['all', 'selected'],
      default: 'all',
    },
    dashboardSettings: {
      type: DashboardSettingsSchema,
      default: () => ({
        defaultDateRange: 7,
        refreshInterval: 300,
        showInactiveGroups: false,
        compactView: false,
      }),
    },
    notificationSettings: {
      type: NotificationSettingsSchema,
      default: () => ({
        emailEnabled: true,
        inAppEnabled: true,
        dailyDigest: false,
        digestTime: 9,
      }),
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata', // IST
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.UserPreferences || mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema)
