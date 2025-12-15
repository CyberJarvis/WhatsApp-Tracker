import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db'
import Group from '@/models/Group'
import Message from '@/models/Message'
import MessageStats from '@/models/MessageStats'
import MemberActivity from '@/models/MemberActivity'
import mongoose from 'mongoose'
import { getToday } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface IncomingMessage {
  messageId: string
  groupId: string // WhatsApp group ID
  senderId: string // WhatsApp sender ID
  senderName: string
  senderPhone?: string
  content?: string
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'other'
  isAdmin: boolean
  timestamp: string
  userId: string // Dashboard user ID
}

// POST - Receive incoming message from WhatsApp service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messages: IncomingMessage[] = Array.isArray(body) ? body : [body]

    if (messages.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    await dbConnect()

    let processed = 0
    const errors: string[] = []

    for (const msg of messages) {
      try {
        const userId = new mongoose.Types.ObjectId(msg.userId)

        // Find the group in our database
        const group = await Group.findOne({
          userId: msg.userId,
          groupId: msg.groupId,
        }).lean()

        if (!group) {
          errors.push(`Group not found: ${msg.groupId}`)
          continue
        }

        const groupObjectId = group._id as mongoose.Types.ObjectId
        const messageTimestamp = new Date(msg.timestamp)
        const todayStr = getToday()
        const hour = messageTimestamp.getHours()

        // 1. Store the message (optional - can be disabled for privacy)
        await Message.findOneAndUpdate(
          { messageId: msg.messageId, userId },
          {
            messageId: msg.messageId,
            groupId: groupObjectId,
            userId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            mediaType: msg.messageType,
            isFromAdmin: msg.isAdmin,
            hasMedia: msg.messageType !== 'text',
            timestamp: messageTimestamp,
          },
          { upsert: true, new: true }
        )

        // 2. Update daily MessageStats
        const statsUpdate: Record<string, number> = {
          totalMessages: 1,
          userMessages: msg.isAdmin ? 0 : 1,
          adminMessages: msg.isAdmin ? 1 : 0,
        }

        // Update media count
        const mediaField = `mediaCount.${msg.messageType}`

        await MessageStats.findOneAndUpdate(
          {
            userId,
            groupId: groupObjectId,
            date: todayStr,
            hour: { $exists: false }, // Daily aggregate (no hour field)
          },
          {
            $inc: {
              ...statsUpdate,
              [mediaField]: 1,
            },
            $setOnInsert: {
              userId,
              groupId: groupObjectId,
              date: todayStr,
            },
          },
          { upsert: true }
        )

        // 3. Update hourly MessageStats
        await MessageStats.findOneAndUpdate(
          {
            userId,
            groupId: groupObjectId,
            date: todayStr,
            hour,
          },
          {
            $inc: {
              ...statsUpdate,
              [mediaField]: 1,
            },
            $setOnInsert: {
              userId,
              groupId: groupObjectId,
              date: todayStr,
              hour,
            },
          },
          { upsert: true }
        )

        // 4. Update MemberActivity
        const activityUpdate = {
          $inc: {
            messageCount: 1,
            todayMessageCount: 1,
            weekMessageCount: 1,
          },
          $set: {
            memberName: msg.senderName,
            memberPhone: msg.senderPhone,
            lastMessageAt: messageTimestamp,
            lastSeenAt: messageTimestamp,
            isAdmin: msg.isAdmin,
            isActive: true,
          },
          $setOnInsert: {
            memberId: msg.senderId,
            groupId: groupObjectId,
            userId,
            firstSeenAt: messageTimestamp,
            activityLevel: 'low',
          },
        }

        await MemberActivity.findOneAndUpdate(
          {
            userId,
            groupId: groupObjectId,
            memberId: msg.senderId,
          },
          activityUpdate,
          { upsert: true }
        )

        // 5. Update activity level based on message count
        const activity = await MemberActivity.findOne({
          userId,
          groupId: groupObjectId,
          memberId: msg.senderId,
        })

        if (activity) {
          let activityLevel: 'high' | 'moderate' | 'low' | 'inactive' = 'low'
          if (activity.weekMessageCount >= 50) activityLevel = 'high'
          else if (activity.weekMessageCount >= 20) activityLevel = 'moderate'
          else if (activity.weekMessageCount >= 5) activityLevel = 'low'
          else activityLevel = 'inactive'

          if (activity.activityLevel !== activityLevel) {
            await MemberActivity.updateOne(
              { _id: activity._id },
              { $set: { activityLevel } }
            )
          }
        }

        processed++
      } catch (err) {
        errors.push(`Error processing message ${msg.messageId}: ${(err as Error).message}`)
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: messages.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error processing incoming messages:', error)
    return NextResponse.json(
      { error: 'Failed to process messages' },
      { status: 500 }
    )
  }
}
