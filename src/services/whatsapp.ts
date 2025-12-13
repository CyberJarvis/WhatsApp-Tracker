/**
 * WhatsApp Service
 * Manages WhatsApp Web client using whatsapp-web.js
 */

import { Client, LocalAuth, GroupChat } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { getConfig } from '../config';
import logger, { logWhatsAppEvent } from '../utils/logger';
import { sleep } from '../utils/helpers';
import { WhatsAppGroup } from '../types';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between API calls

/**
 * WhatsApp Service Class
 * Singleton pattern for managing WhatsApp client
 */
class WhatsAppService {
  private client: Client | null = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;
  private readyPromise: Promise<void> | null = null;

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
}

// Export singleton instance
export const whatsAppService = new WhatsAppService();
export default whatsAppService;
