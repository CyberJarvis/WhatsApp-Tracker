/**
 * WhatsApp Service
 * Manages WhatsApp Web client using whatsapp-web.js
 */

import { Client, LocalAuth, GroupChat, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { getConfig } from '../config';
import logger, { logWhatsAppEvent } from '../utils/logger';
import { sleep } from '../utils/helpers';
import { WhatsAppGroup } from '../types';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between API calls

// Dashboard API configuration
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://localhost:3001'

// Message batch configuration
const MESSAGE_BATCH_SIZE = 10
const MESSAGE_BATCH_INTERVAL = 5000 // 5 seconds

/**
 * WhatsApp Service Class
 * Singleton pattern for managing WhatsApp client
 */
interface MessageData {
  messageId: string
  groupId: string
  senderId: string
  senderName: string
  senderPhone?: string
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'other'
  isAdmin: boolean
  timestamp: string
  userId: string
}

class WhatsAppService {
  private client: Client | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private readyPromise: Promise<void> | null = null;
  private messageBatch: MessageData[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private userId: string | null = null; // Will be set from config or environment

  /**
   * Initialize the WhatsApp client
   * Displays QR code on first run, reuses session afterward
   */
  async initialize(): Promise<void> {
    if (this.isReady) {
      logger.info('WhatsApp client already ready');
      return;
    }

    if (this.isInitializing && this.readyPromise) {
      logger.info('WhatsApp client initialization in progress, waiting...');
      return this.readyPromise;
    }

    this.isInitializing = true;
    const config = getConfig();

    this.readyPromise = new Promise((resolve, reject) => {
      logger.info('Initializing WhatsApp client...');

      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: config.whatsapp.sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      // QR Code event - display in terminal
      this.client.on('qr', (qr: string) => {
        logWhatsAppEvent('qr_received');
        console.log('\n');
        console.log('='.repeat(50));
        console.log('Scan this QR code with WhatsApp:');
        console.log('='.repeat(50));
        qrcode.generate(qr, { small: true });
        console.log('='.repeat(50));
        console.log('\n');
      });

      // Loading screen progress
      this.client.on('loading_screen', (percent: number, message: string) => {
        logWhatsAppEvent('loading', { percent, message });
      });

      // Authentication successful
      this.client.on('authenticated', () => {
        logWhatsAppEvent('authenticated');
        logger.info('WhatsApp authentication successful');
      });

      // Authentication failure
      this.client.on('auth_failure', (message: string) => {
        logWhatsAppEvent('auth_failure', { message });
        logger.error('WhatsApp authentication failed', { message });
        this.isInitializing = false;
        reject(new Error(`WhatsApp authentication failed: ${message}`));
      });

      // Client ready
      this.client.on('ready', () => {
        logWhatsAppEvent('ready');
        logger.info('WhatsApp client is ready');
        this.isReady = true;
        this.isInitializing = false;
        resolve();
      });

      // Client disconnected
      this.client.on('disconnected', (reason: string) => {
        logWhatsAppEvent('disconnected', { reason });
        logger.warn('WhatsApp client disconnected', { reason });
        this.isReady = false;
        this.isInitializing = false;
      });

      // Message received - track for analytics
      this.client.on('message', async (message: Message) => {
        try {
          await this.handleIncomingMessage(message);
        } catch (error) {
          logger.error('Error handling message', { error: (error as Error).message });
        }
      });

      // Start the client
      this.client.initialize().catch((error) => {
        logger.error('Failed to initialize WhatsApp client', { error: error.message });
        this.isInitializing = false;
        reject(error);
      });
    });

    return this.readyPromise;
  }

  /**
   * Ensure client is ready before operations
   */
  private ensureReady(): void {
    if (!this.isReady || !this.client) {
      throw new Error('WhatsApp client is not ready');
    }
  }

  /**
   * Get all group chats
   * Filters out archived groups and non-group chats
   */
  async getAllGroups(): Promise<WhatsAppGroup[]> {
    this.ensureReady();

    logWhatsAppEvent('fetching_groups');
    const chats = await this.client!.getChats();

    const groups: WhatsAppGroup[] = [];

    for (const chat of chats) {
      // Filter only groups that are not archived
      if (chat.isGroup && !chat.archived) {
        const groupChat = chat as GroupChat;

        // Add rate limiting delay
        await sleep(RATE_LIMIT_DELAY);

        try {
          // Fetch participants (this is needed as participants might not be loaded)
          const participants = groupChat.participants || [];

          groups.push({
            id: { _serialized: chat.id._serialized, server: 'g.us', user: '' },
            name: chat.name || 'Unknown Group',
            participants: participants.map((p) => ({
              id: { _serialized: p.id._serialized, server: 'c.us', user: '' },
              isAdmin: p.isAdmin || false,
              isSuperAdmin: p.isSuperAdmin || false,
            })),
            isGroup: true,
            archived: chat.archived || false,
            timestamp: chat.timestamp || Date.now(),
          });
        } catch (error) {
          logger.warn('Failed to fetch group details', {
            groupId: chat.id._serialized,
            error: (error as Error).message,
          });
        }
      }
    }

    logWhatsAppEvent('groups_fetched', { count: groups.length });
    return groups;
  }

  /**
   * Get a specific group by ID
   */
  async getGroupById(groupId: string): Promise<WhatsAppGroup | null> {
    this.ensureReady();

    try {
      const chat = await this.client!.getChatById(groupId);

      if (!chat.isGroup) {
        logger.warn('Chat is not a group', { chatId: groupId });
        return null;
      }

      const groupChat = chat as GroupChat;
      const participants = groupChat.participants || [];

      return {
        id: { _serialized: chat.id._serialized, server: 'g.us', user: '' },
        name: chat.name || 'Unknown Group',
        participants: participants.map((p) => ({
          id: { _serialized: p.id._serialized, server: 'c.us', user: '' },
          isAdmin: p.isAdmin || false,
          isSuperAdmin: p.isSuperAdmin || false,
        })),
        isGroup: true,
        archived: chat.archived || false,
        timestamp: chat.timestamp || Date.now(),
      };
    } catch (error) {
      logger.error('Failed to get group by ID', {
        groupId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Get member count for a specific group
   */
  async getGroupMemberCount(groupId: string): Promise<number> {
    const group = await this.getGroupById(groupId);
    return group ? group.participants.length : 0;
  }

  /**
   * Send a message to a chat (used for reports)
   */
  async sendMessage(chatId: string, message: string): Promise<boolean> {
    this.ensureReady();

    try {
      await this.client!.sendMessage(chatId, message);
      logWhatsAppEvent('message_sent', { chatId: chatId.substring(0, 10) + '...' });
      return true;
    } catch (error) {
      logger.error('Failed to send message', {
        chatId,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Check if client is ready
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Gracefully destroy the client
   */
  async destroy(): Promise<void> {
    if (this.client) {
      logWhatsAppEvent('destroying');
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      logger.info('WhatsApp client destroyed');
    }
  }

  /**
   * Get all groups with rate limiting between fetches
   * Used for bulk operations
   */
  async getGroupsWithRateLimiting(
    groupIds: string[],
    delayMs: number = RATE_LIMIT_DELAY
  ): Promise<Map<string, WhatsAppGroup | null>> {
    this.ensureReady();

    const results = new Map<string, WhatsAppGroup | null>();

    for (const groupId of groupIds) {
      const group = await this.getGroupById(groupId);
      results.set(groupId, group);
      await sleep(delayMs);
    }

    return results;
  }

  /**
   * Set the user ID for message tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
    logger.info('User ID set for message tracking', { userId: userId.substring(0, 8) + '...' });
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    // Only track group messages
    const chat = await message.getChat();
    if (!chat.isGroup) return;

    // Skip if no user ID configured
    if (!this.userId) {
      logger.debug('Skipping message - no user ID configured');
      return;
    }

    // Get sender info
    const contact = await message.getContact();
    const groupChat = chat as GroupChat;

    // Check if sender is admin
    const participant = groupChat.participants?.find(
      p => p.id._serialized === contact.id._serialized
    );
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin || false;

    // Determine message type
    let messageType: MessageData['messageType'] = 'text';
    if (message.hasMedia) {
      if (message.type === 'image') messageType = 'image';
      else if (message.type === 'video') messageType = 'video';
      else if (message.type === 'audio' || message.type === 'ptt') messageType = 'audio';
      else if (message.type === 'document') messageType = 'document';
      else if (message.type === 'sticker') messageType = 'sticker';
      else messageType = 'other';
    }

    const messageData: MessageData = {
      messageId: message.id._serialized,
      groupId: chat.id._serialized,
      senderId: contact.id._serialized,
      senderName: contact.pushname || contact.name || contact.number || 'Unknown',
      senderPhone: contact.number,
      messageType,
      isAdmin,
      timestamp: new Date(message.timestamp * 1000).toISOString(),
      userId: this.userId,
    };

    // Add to batch
    this.messageBatch.push(messageData);

    // Start batch timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushMessageBatch(), MESSAGE_BATCH_INTERVAL);
    }

    // Flush if batch is full
    if (this.messageBatch.length >= MESSAGE_BATCH_SIZE) {
      await this.flushMessageBatch();
    }
  }

  /**
   * Flush message batch to dashboard API
   */
  private async flushMessageBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.messageBatch.length === 0) return;

    const batch = [...this.messageBatch];
    this.messageBatch = [];

    try {
      const response = await fetch(`${DASHBOARD_API_URL}/api/messages/incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Failed to send messages to dashboard', { error: errorData, statusCode: response.status });
        return;
      }

      const result = await response.json() as { processed: number; total: number };
      logger.info('Messages sent to dashboard', {
        processed: result.processed,
        total: result.total,
      });
    } catch (error) {
      logger.error('Error sending messages to dashboard', {
        error: (error as Error).message,
        batchSize: batch.length,
      });
    }
  }
}

// Export singleton instance
export const whatsAppService = new WhatsAppService();
export default whatsAppService;
