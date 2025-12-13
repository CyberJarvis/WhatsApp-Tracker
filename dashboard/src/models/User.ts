import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name?: string
  createdAt: Date
  updatedAt: Date

  // WhatsApp connection status
  waConnected: boolean
  waSessionPath?: string
  waLastSeen?: Date

  // Optional Google Sheets export
  sheetsId?: string
  sheetsEmail?: string
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    name: {
      type: String,
      trim: true,
    },
    waConnected: {
      type: Boolean,
      default: false,
    },
    waSessionPath: {
      type: String,
    },
    waLastSeen: {
      type: Date,
    },
    sheetsId: {
      type: String,
    },
    sheetsEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
