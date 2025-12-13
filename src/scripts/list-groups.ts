/**
 * Utility Script: List All WhatsApp Groups
 * Run with: npx ts-node src/scripts/list-groups.ts
 *
 * This script connects to WhatsApp and lists all groups you're a member of,
 * showing their IDs and names so you can add them to tracking.
 */

import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

async function listGroups(): Promise<void> {
  console.log('='.repeat(60));
  console.log('WhatsApp Group Lister');
  console.log('='.repeat(60));
  console.log('');

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: '.wwebjs_auth',
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

  client.on('qr', (qr: string) => {
    console.log('Scan this QR code with WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('');
  });

  client.on('loading_screen', (percent: number, message: string) => {
    console.log(`Loading: ${percent}% - ${message}`);
  });

  client.on('authenticated', () => {
    console.log('Authenticated successfully!');
  });

  client.on('ready', async () => {
    console.log('\nWhatsApp client ready! Fetching groups...\n');

    try {
      const chats = await client.getChats();
      const groups = chats.filter((chat) => chat.isGroup && !chat.archived);

      console.log('='.repeat(60));
      console.log(`Found ${groups.length} active groups:`);
      console.log('='.repeat(60));
      console.log('');

      // Sort by name
      groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Print header
      console.log('| # | Group Name                          | Group ID                    | Members |');
      console.log('|---|-------------------------------------|-----------------------------| --------|');

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const name = (group.name || 'Unknown').substring(0, 35).padEnd(35);
        const id = group.id._serialized.padEnd(27);

        // Get participant count
        let memberCount = '?';
        try {
          const groupChat = group as any;
          if (groupChat.participants) {
            memberCount = String(groupChat.participants.length);
          }
        } catch {
          // Ignore
        }

        console.log(`| ${String(i + 1).padStart(1)} | ${name} | ${id} | ${memberCount.padStart(6)} |`);
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('');
      console.log('To track a group, add a row to the "Groups" sheet in Google Sheets:');
      console.log('');
      console.log('  groupId          | groupName       | isActive | adminGroupId | addedAt');
      console.log('  ----------------|-----------------|----------|--------------|----------');
      console.log('  [paste ID here] | [group name]    | TRUE     |              | [date]');
      console.log('');
      console.log('Example:');
      if (groups.length > 0) {
        const example = groups[0];
        const today = new Date().toISOString().split('T')[0];
        console.log(`  ${example.id._serialized} | ${(example.name || 'My Group').substring(0, 15)} | TRUE | | ${today}`);
      }
      console.log('');

      // CSV format for easy copy
      console.log('='.repeat(60));
      console.log('CSV format (copy-paste to spreadsheet):');
      console.log('='.repeat(60));
      console.log('');
      console.log('groupId,groupName,isActive,adminGroupId,addedAt');

      const today = new Date().toISOString().split('T')[0];
      for (const group of groups) {
        const safeName = (group.name || 'Unknown').replace(/,/g, ' ');
        console.log(`${group.id._serialized},${safeName},TRUE,,${today}`);
      }

      console.log('');
      console.log('Done! Closing connection...');

      await client.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Error fetching groups:', error);
      await client.destroy();
      process.exit(1);
    }
  });

  client.on('auth_failure', (message: string) => {
    console.error('Authentication failed:', message);
    process.exit(1);
  });

  console.log('Initializing WhatsApp client...');
  console.log('(If this is your first time, you will need to scan a QR code)\n');

  await client.initialize();
}

listGroups().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
