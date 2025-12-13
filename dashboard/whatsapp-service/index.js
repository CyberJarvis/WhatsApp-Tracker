const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const path = require('path');
const { google } = require('googleapis');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Scheduling intervals
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const syncIntervals = new Map(); // Store sync intervals per user

const app = express();

// Environment variables
const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vrockfun9_db_user:mlK0Gi9VvFnbOpGk@cluster0.gqtgfa6.mongodb.net/whatsapp-analytics?retryWrites=true&w=majority&appName=Cluster0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

// CORS configuration for production
const corsOptions = {
  origin: [
    FRONTEND_URL,
    'http://localhost:3001',
    'http://localhost:3000',
    /\.vercel\.app$/,  // Allow all Vercel deployments
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Increase max listeners to prevent warnings
require('events').EventEmitter.defaultMaxListeners = 50;

// Store for user clients and state
const userClients = new Map();
const userQRCodes = new Map();
const userStates = new Map(); // 'idle' | 'initializing' | 'qr_ready' | 'authenticated' | 'ready' | 'error'

// MongoDB User Schema (simplified)
const UserSchema = new mongoose.Schema({
  email: String,
  waConnected: { type: Boolean, default: false },
  waSessionPath: String,
  waLastSeen: Date,
  sheetsId: String, // Google Sheet ID for export
});

const GroupSchema = new mongoose.Schema({
  groupId: String,
  groupName: String,
  isActive: { type: Boolean, default: true },
  addedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const SnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  totalMembers: { type: Number, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const DailyStatSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  totalMembers: { type: Number, required: true },
  joinedToday: { type: Number, default: 0 },
  leftToday: { type: Number, default: 0 },
  netGrowth: { type: Number, default: 0 },
  notes: { type: String },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
});

let User, Group, Snapshot, DailyStat;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    User = mongoose.model('User', UserSchema);
    Group = mongoose.model('Group', GroupSchema);
    Snapshot = mongoose.model('Snapshot', SnapshotSchema);
    DailyStat = mongoose.model('DailyStat', DailyStatSchema);
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Get user state
function getUserState(userId) {
  return userStates.get(userId) || 'idle';
}

// Set user state
function setUserState(userId, state) {
  console.log(`[${userId}] State: ${getUserState(userId)} -> ${state}`);
  userStates.set(userId, state);
}

// Cleanup client for a user
async function cleanupClient(userId) {
  const client = userClients.get(userId);
  if (client) {
    try {
      client.removeAllListeners();
      await client.destroy();
    } catch (err) {
      console.error(`Error destroying client for ${userId}:`, err.message);
    }
  }
  userClients.delete(userId);
  userQRCodes.delete(userId);
}

// Background sync member counts
async function syncMemberCounts(userId, client, groups) {
  console.log(`[${userId}] Starting background member count sync for ${groups.length} groups...`);

  let syncedCount = 0;
  let errorCount = 0;
  const batchSize = 10;

  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize);

    for (const group of batch) {
      try {
        // Check if client is still connected
        if (getUserState(userId) !== 'ready') {
          console.log(`[${userId}] Client disconnected, stopping member sync`);
          return;
        }

        // Fetch the chat to get participants
        const chat = await client.getChatById(group.id._serialized);
        const participantCount = chat?.participants?.length || 0;

        // Find the saved group
        const savedGroup = await Group.findOne({ userId, groupId: group.id._serialized });

        if (savedGroup && participantCount > 0) {
          // Create/update snapshot
          await Snapshot.findOneAndUpdate(
            {
              groupId: savedGroup._id,
              userId: userId,
              timestamp: { $gte: new Date(Date.now() - 60000) } // Within last minute
            },
            {
              timestamp: new Date(),
              totalMembers: participantCount,
              groupId: savedGroup._id,
              userId: userId,
            },
            { upsert: true }
          );
          syncedCount++;
        }
      } catch (err) {
        errorCount++;
        // Don't log every error to avoid spam
      }
    }

    // Small delay between batches to avoid overwhelming WhatsApp
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[${userId}] Member sync complete: ${syncedCount} synced, ${errorCount} errors`);
}

// Initialize WhatsApp client for a user
async function initializeClient(userId) {
  const currentState = getUserState(userId);

  // If already ready, return immediately
  if (currentState === 'ready') {
    console.log(`[${userId}] Client already ready`);
    return { status: 'ready' };
  }

  // If already initializing/authenticating, don't create another client
  if (currentState === 'initializing' || currentState === 'authenticated' || currentState === 'qr_ready') {
    console.log(`[${userId}] Client already in state: ${currentState}`);
    return { status: currentState === 'qr_ready' ? 'pending' : currentState };
  }

  console.log(`[${userId}] Initializing WhatsApp client...`);
  setUserState(userId, 'initializing');

  // Cleanup any existing client first
  await cleanupClient(userId);

  // Puppeteer args - optimized for stability
  const puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--disable-gpu',
  ];

  // Use system Chromium in Docker
  const puppeteerConfig = {
    headless: true,
    args: puppeteerArgs,
    timeout: 120000,
  };

  // If PUPPETEER_EXECUTABLE_PATH is set (Docker), use it
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: userId,
      dataPath: path.join(__dirname, '.wwebjs_sessions'),
    }),
    puppeteer: puppeteerConfig,
    qrMaxRetries: 5,
  });

  userClients.set(userId, client);

  // Handle QR code
  client.on('qr', async (qr) => {
    console.log(`[${userId}] QR received`);
    setUserState(userId, 'qr_ready');
    try {
      const qrDataUrl = await QRCode.toDataURL(qr, {
        width: 300,
        margin: 2,
      });
      userQRCodes.set(userId, qrDataUrl);
    } catch (err) {
      console.error(`[${userId}] Error generating QR:`, err);
    }
  });

  // Handle authentication (QR scanned successfully)
  client.on('authenticated', () => {
    console.log(`[${userId}] Authenticated (QR scanned)`);
    setUserState(userId, 'authenticated');
    userQRCodes.delete(userId); // Clear QR code
  });

  // Handle loading screen (syncing)
  client.on('loading_screen', (percent, message) => {
    console.log(`[${userId}] Loading: ${percent}% - ${message}`);
  });

  // Handle ready
  client.on('ready', async () => {
    console.log(`[${userId}] Client ready!`);
    setUserState(userId, 'ready');
    userQRCodes.delete(userId);

    // Update user in database
    try {
      if (User) {
        await User.findByIdAndUpdate(userId, {
          waConnected: true,
          waLastSeen: new Date(),
        });
      }

      // Sync groups - first save basic info
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);
      console.log(`[${userId}] Found ${groups.length} groups, starting sync...`);

      if (Group) {
        let syncedCount = 0;

        // First pass: Save all groups quickly
        for (const group of groups) {
          try {
            await Group.findOneAndUpdate(
              { userId, groupId: group.id._serialized },
              {
                userId,
                groupId: group.id._serialized,
                groupName: group.name,
                isActive: true,
              },
              { upsert: true }
            );
            syncedCount++;
          } catch (err) {
            console.error(`[${userId}] Error saving group ${group.name}:`, err.message);
          }
        }
        console.log(`[${userId}] Saved ${syncedCount} groups`);

        // Second pass: Get member counts (async, don't block)
        if (Snapshot) {
          syncMemberCounts(userId, client, groups).catch(err => {
            console.error(`[${userId}] Background member sync error:`, err.message);
          });
        }

        // Start 30-minute auto sync
        startAutoSync(userId);
      }
    } catch (err) {
      console.error(`[${userId}] Error updating user/groups:`, err);
    }
  });

  // Handle disconnection
  client.on('disconnected', async (reason) => {
    console.log(`[${userId}] Disconnected: ${reason}`);
    setUserState(userId, 'idle');
    stopAutoSync(userId); // Stop the 30-minute auto sync
    await cleanupClient(userId);

    try {
      if (User) {
        await User.findByIdAndUpdate(userId, { waConnected: false });
      }
    } catch (err) {
      console.error(`[${userId}] Error updating user:`, err);
    }
  });

  // Handle authentication failure
  client.on('auth_failure', async (msg) => {
    console.error(`[${userId}] Auth failure: ${msg}`);
    setUserState(userId, 'error');
    await cleanupClient(userId);
  });

  // Initialize (don't await, let it run in background)
  client.initialize().catch(async (err) => {
    console.error(`[${userId}] Error initializing client:`, err.message);
    setUserState(userId, 'error');
    await cleanupClient(userId);
  });

  return { status: 'initializing' };
}

// API Routes

// Health check endpoint
app.get('/api/status/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeClients: userClients.size,
  });
});

// Get QR code for user
app.get('/api/qr/:userId', async (req, res) => {
  const { userId } = req.params;
  const state = getUserState(userId);

  // If ready, return ready status
  if (state === 'ready') {
    return res.json({ status: 'ready' });
  }

  // If authenticated (QR scanned, waiting for sync)
  if (state === 'authenticated') {
    return res.json({ status: 'authenticated', message: 'Syncing with WhatsApp...' });
  }

  // Return QR if available
  const qr = userQRCodes.get(userId);
  if (qr && state === 'qr_ready') {
    return res.json({ status: 'pending', qrCode: qr });
  }

  // If error, return error status
  if (state === 'error') {
    return res.json({ status: 'error', message: 'Connection failed. Please try again.' });
  }

  // If idle, start initialization
  if (state === 'idle') {
    initializeClient(userId);
    return res.json({ status: 'initializing' });
  }

  // If initializing, wait for QR
  return res.json({ status: 'waiting' });
});

// Initialize client
app.post('/api/init/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await initializeClient(userId);
    res.json(result);
  } catch (err) {
    console.error('Error initializing client:', err);
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

// Get status
app.get('/api/status/:userId', (req, res) => {
  const { userId } = req.params;
  const state = getUserState(userId);

  res.json({
    state,
    isConnected: state === 'ready',
    isInitialized: userClients.has(userId),
    hasQR: userQRCodes.has(userId),
  });
});

// Disconnect
app.post('/api/disconnect/:userId', async (req, res) => {
  const { userId } = req.params;

  setUserState(userId, 'idle');
  await cleanupClient(userId);

  try {
    if (User) {
      await User.findByIdAndUpdate(userId, { waConnected: false });
    }
  } catch (err) {
    console.error('Error updating user:', err);
  }

  res.json({ success: true });
});

// Get groups for user
app.get('/api/groups/:userId', async (req, res) => {
  const { userId } = req.params;
  const state = getUserState(userId);

  if (state !== 'ready') {
    return res.status(400).json({ error: 'Client not ready' });
  }

  const client = userClients.get(userId);
  if (!client) {
    return res.status(400).json({ error: 'Client not found' });
  }

  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup).map(g => ({
      id: g.id._serialized,
      name: g.name,
      participantsCount: g.participants?.length || 0,
    }));

    res.json({ groups });
  } catch (err) {
    console.error('Error getting groups:', err);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Retry connection
app.post('/api/retry/:userId', async (req, res) => {
  const { userId } = req.params;

  // Force cleanup and restart
  setUserState(userId, 'idle');
  await cleanupClient(userId);

  const result = await initializeClient(userId);
  res.json(result);
});

// Capture group snapshot
app.post('/api/capture/:userId/:groupId', async (req, res) => {
  const { userId, groupId } = req.params;
  const state = getUserState(userId);

  if (state !== 'ready') {
    return res.status(400).json({ error: 'Client not ready' });
  }

  const client = userClients.get(userId);
  if (!client) {
    return res.status(400).json({ error: 'Client not found' });
  }

  try {
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const participants = await chat.participants;

    res.json({
      groupId: chat.id._serialized,
      groupName: chat.name,
      totalMembers: participants?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error capturing snapshot:', err);
    res.status(500).json({ error: 'Failed to capture snapshot' });
  }
});

// Manual sync groups with member counts
app.post('/api/sync/:userId', async (req, res) => {
  const { userId } = req.params;
  const state = getUserState(userId);

  if (state !== 'ready') {
    return res.status(400).json({ error: 'Client not ready' });
  }

  const client = userClients.get(userId);
  if (!client) {
    return res.status(400).json({ error: 'Client not found' });
  }

  try {
    console.log(`[${userId}] Manual sync started...`);
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);

    if (!Group || !Snapshot || !DailyStat) {
      return res.status(500).json({ error: 'Database models not ready' });
    }

    const today = new Date().toISOString().split('T')[0];
    let syncedCount = 0;
    let totalMembers = 0;
    let totalJoined = 0;
    let totalLeft = 0;

    for (const group of groups) {
      try {
        const participantCount = group.participants?.length || 0;
        totalMembers += participantCount;

        // Save/update group
        const savedGroup = await Group.findOneAndUpdate(
          { userId, groupId: group.id._serialized },
          {
            userId,
            groupId: group.id._serialized,
            groupName: group.name,
            isActive: true,
          },
          { upsert: true, new: true }
        );

        // Get baseline snapshot for today's comparison
        // First try to get today's first snapshot (baseline for the day)
        // If none exists, get yesterday's last snapshot
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        let baselineSnapshot = await Snapshot.findOne({
          groupId: savedGroup._id,
          userId: userId,
          timestamp: { $gte: startOfToday }
        }).sort({ timestamp: 1 }); // First snapshot of today

        // If no snapshot today, get yesterday's last snapshot
        if (!baselineSnapshot) {
          baselineSnapshot = await Snapshot.findOne({
            groupId: savedGroup._id,
            userId: userId,
            timestamp: { $lt: startOfToday }
          }).sort({ timestamp: -1 });
        }

        const baselineMembers = baselineSnapshot?.totalMembers || participantCount;
        const joined = Math.max(0, participantCount - baselineMembers);
        const left = Math.max(0, baselineMembers - participantCount);
        const netGrowth = participantCount - baselineMembers;

        totalJoined += joined;
        totalLeft += left;

        // Create snapshot with member count
        await Snapshot.create({
          timestamp: new Date(),
          totalMembers: participantCount,
          groupId: savedGroup._id,
          userId: userId,
        });

        // Create/update daily stat
        await DailyStat.findOneAndUpdate(
          { userId, groupId: savedGroup._id, date: today },
          {
            userId,
            groupId: savedGroup._id,
            date: today,
            totalMembers: participantCount,
            joinedToday: joined,
            leftToday: left,
            netGrowth: netGrowth,
            notes: Math.abs(netGrowth) > baselineMembers * 0.1 ? 'Large change detected' : '',
          },
          { upsert: true }
        );

        syncedCount++;
      } catch (err) {
        console.error(`[${userId}] Error syncing group ${group.name}:`, err.message);
      }
    }

    console.log(`[${userId}] Manual sync completed: ${syncedCount} groups, ${totalMembers} members, +${totalJoined}/-${totalLeft}`);
    res.json({
      success: true,
      groupsCount: syncedCount,
      totalMembers: totalMembers,
      joinedToday: totalJoined,
      leftToday: totalLeft,
    });
  } catch (err) {
    console.error('Error syncing groups:', err);
    res.status(500).json({ error: 'Failed to sync groups' });
  }
});

// ========== Auto Sync Functions ==========

// Start 30-minute auto sync for a user
function startAutoSync(userId) {
  // Clear any existing interval
  stopAutoSync(userId);

  console.log(`[${userId}] Starting 30-minute auto sync`);

  const interval = setInterval(async () => {
    const state = getUserState(userId);
    if (state !== 'ready') {
      console.log(`[${userId}] Auto sync skipped - client not ready`);
      return;
    }

    const client = userClients.get(userId);
    if (!client) return;

    try {
      console.log(`[${userId}] Auto sync started...`);
      const chats = await client.getChats();
      const groups = chats.filter(chat => chat.isGroup);

      const today = new Date().toISOString().split('T')[0];
      let totalMembers = 0;
      let totalJoined = 0;
      let totalLeft = 0;

      for (const group of groups) {
        try {
          const participantCount = group.participants?.length || 0;
          totalMembers += participantCount;

          const savedGroup = await Group.findOne({ userId, groupId: group.id._serialized });
          if (savedGroup && participantCount > 0) {
            // Get baseline snapshot for today's comparison
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            let baselineSnapshot = await Snapshot.findOne({
              groupId: savedGroup._id,
              userId: userId,
              timestamp: { $gte: startOfToday }
            }).sort({ timestamp: 1 }); // First snapshot of today

            if (!baselineSnapshot) {
              baselineSnapshot = await Snapshot.findOne({
                groupId: savedGroup._id,
                userId: userId,
                timestamp: { $lt: startOfToday }
              }).sort({ timestamp: -1 });
            }

            const baselineMembers = baselineSnapshot?.totalMembers || participantCount;
            const joined = Math.max(0, participantCount - baselineMembers);
            const left = Math.max(0, baselineMembers - participantCount);
            const netGrowth = participantCount - baselineMembers;

            totalJoined += joined;
            totalLeft += left;

            // Update snapshot (avoid duplicates within 60 seconds)
            await Snapshot.findOneAndUpdate(
              { groupId: savedGroup._id, userId, timestamp: { $gte: new Date(Date.now() - 60000) } },
              { timestamp: new Date(), totalMembers: participantCount, groupId: savedGroup._id, userId },
              { upsert: true }
            );

            // Update daily stat (SET values, not increment, since we compare against baseline)
            if (DailyStat) {
              await DailyStat.findOneAndUpdate(
                { userId, groupId: savedGroup._id, date: today },
                {
                  userId,
                  groupId: savedGroup._id,
                  date: today,
                  totalMembers: participantCount,
                  joinedToday: joined,
                  leftToday: left,
                  netGrowth: netGrowth,
                },
                { upsert: true }
              );
            }
          }
        } catch (err) {
          // Ignore individual group errors
        }
      }
      console.log(`[${userId}] Auto sync complete: ${groups.length} groups, ${totalMembers} members, +${totalJoined}/-${totalLeft}`);
    } catch (err) {
      console.error(`[${userId}] Auto sync error:`, err.message);
    }
  }, SYNC_INTERVAL_MS);

  syncIntervals.set(userId, interval);
}

// Stop auto sync for a user
function stopAutoSync(userId) {
  const interval = syncIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(userId);
    console.log(`[${userId}] Auto sync stopped`);
  }
}

// ========== Google Sheets Export ==========

async function exportToGoogleSheets(userId) {
  try {
    // Get user's Google Sheet ID
    const user = await User.findById(userId);
    if (!user || !user.sheetsId) {
      console.log(`[${userId}] No Google Sheet configured, skipping export`);
      return;
    }

    const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './credentials/service-account.json';
    const credentialsPath = path.resolve(__dirname, '..', GOOGLE_CREDENTIALS_PATH);

    // Check if credentials file exists
    const fs = require('fs');
    if (!fs.existsSync(credentialsPath)) {
      console.log(`[${userId}] Google credentials not found at ${credentialsPath}`);
      return;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get all groups with their latest snapshots
    const groups = await Group.find({ userId, isActive: true }).lean();
    const today = new Date().toISOString().split('T')[0];

    const rows = [
      ['Date', 'Group Name', 'Group ID', 'Total Members', 'Synced At'],
    ];

    for (const group of groups) {
      const snapshot = await Snapshot.findOne({ groupId: group._id }).sort({ timestamp: -1 }).lean();
      rows.push([
        today,
        group.groupName,
        group.groupId,
        snapshot?.totalMembers || 0,
        snapshot?.timestamp?.toISOString() || '',
      ]);
    }

    // Clear and write to sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId: user.sheetsId,
      range: 'Sheet1!A:E',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: user.sheetsId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    console.log(`[${userId}] Google Sheets export complete: ${groups.length} groups`);
  } catch (err) {
    console.error(`[${userId}] Google Sheets export error:`, err.message);
  }
}

// Schedule daily Google Sheets export at 10:00 AM IST
function scheduleDailyExport() {
  const checkAndExport = async () => {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();

    // Check if it's 10:00 AM IST (within 1 minute window)
    if (hours === 10 && minutes === 0) {
      console.log('10:00 AM IST - Running daily Google Sheets export for all users');

      // Export for all connected users
      for (const [userId, state] of userStates.entries()) {
        if (state === 'ready') {
          await exportToGoogleSheets(userId);
        }
      }
    }
  };

  // Check every minute
  setInterval(checkAndExport, 60 * 1000);
  console.log('Daily Google Sheets export scheduled for 10:00 AM IST');
}

// Manual export endpoint
app.post('/api/export/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    await exportToGoogleSheets(userId);
    res.json({ success: true, message: 'Export completed' });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Auto-reconnect users with saved sessions on startup
async function autoReconnectUsers() {
  const fs = require('fs');
  const sessionsDir = path.join(__dirname, '.wwebjs_sessions');

  try {
    // Wait for MongoDB models to be ready
    if (!User) {
      console.log('Waiting for MongoDB connection before auto-reconnect...');
      setTimeout(autoReconnectUsers, 2000);
      return;
    }

    // Find all users who were previously connected
    const connectedUsers = await User.find({ waConnected: true }).select('_id').lean();
    console.log(`Found ${connectedUsers.length} users with waConnected=true`);

    for (const user of connectedUsers) {
      const userId = user._id.toString();
      const sessionPath = path.join(sessionsDir, `session-${userId}`);

      // Check if session folder exists
      if (fs.existsSync(sessionPath)) {
        console.log(`[${userId}] Auto-reconnecting with saved session...`);
        // Initialize client (will use saved session)
        initializeClient(userId).catch(err => {
          console.error(`[${userId}] Auto-reconnect failed:`, err.message);
        });
        // Small delay between initializations to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`[${userId}] No saved session found, marking as disconnected`);
        await User.findByIdAndUpdate(userId, { waConnected: false });
      }
    }
  } catch (err) {
    console.error('Auto-reconnect error:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`MongoDB: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas (cloud)' : 'Local'}`);

  // Start daily export scheduler
  scheduleDailyExport();

  // Auto-reconnect users with saved sessions after a delay
  setTimeout(autoReconnectUsers, 3000);
});
