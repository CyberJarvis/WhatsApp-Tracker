# WhatsApp Group Analytics Automation System

A Node.js/TypeScript system to automatically track daily join/leave statistics for WhatsApp groups using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) with Google Sheets as the datastore.

## Features

- **Automated Tracking**: Captures group member counts every 3 hours
- **Daily Analytics**: Computes joined/left/growth statistics daily at 10 AM
- **Google Sheets Storage**: All data persisted in Google Sheets for easy access
- **Daily Reports**: Sends formatted summary to an admin WhatsApp group
- **Anomaly Detection**: Flags unusual member drops (>10%)
- **Session Persistence**: Scans QR once, reuses session automatically
- **Production Ready**: Proper logging, error handling, and graceful shutdown

## Prerequisites

- Node.js v18 or higher
- A WhatsApp account for the bot
- Google Cloud account with Sheets API enabled
- A dedicated machine/VPS for running the system

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd whatsapp-tracker
npm install
```

### 2. Set Up Google Cloud (Detailed Instructions Below)

1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a service account
4. Download the JSON key
5. Share your spreadsheet with the service account email

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. First Run

```bash
npm run dev
```

Scan the QR code with WhatsApp when prompted. The session will be saved for future runs.

### 5. Production Run

```bash
npm run build
npm start
```

---

## Google Cloud Setup (Step-by-Step)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "WhatsApp Analytics")
4. Click "Create"

### Step 2: Enable Google Sheets API

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

### Step 3: Create a Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter a name (e.g., "whatsapp-analytics-bot")
4. Click "Create and Continue"
5. Skip the optional steps, click "Done"

### Step 4: Generate JSON Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" and click "Create"
5. Save the downloaded file as `credentials/service-account.json`

### Step 5: Create and Share the Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it (e.g., "WhatsApp Group Analytics")
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
   ```
5. Click "Share" button
6. Add the service account email (found in the JSON file as `client_email`)
7. Give it "Editor" access

### Step 6: Configure .env

```env
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_CREDENTIALS_PATH=./credentials/service-account.json
```

---

## Configuration

All configuration is done via environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `WHATSAPP_SESSION_PATH` | Directory for WhatsApp session | `.wwebjs_auth` |
| `GOOGLE_SHEETS_ID` | Your Google Spreadsheet ID | *required* |
| `GOOGLE_CREDENTIALS_PATH` | Path to service account JSON | `./credentials/service-account.json` |
| `CAPTURE_CRON` | Cron for snapshot captures | `0 */3 * * *` (every 3 hours) |
| `REPORT_CRON` | Cron for daily report | `0 10 * * *` (10 AM daily) |
| `ADMIN_GROUP_ID` | WhatsApp group ID for reports | *optional* |
| `LOG_LEVEL` | Logging level | `info` |
| `TZ` | Timezone for cron jobs | System timezone |

---

## Google Sheets Structure

The system automatically creates three sheets:

### Groups Sheet
Add your groups here to start tracking:

| groupId | groupName | isActive | adminGroupId | addedAt |
|---------|-----------|----------|--------------|---------|
| 1234567890@g.us | My Group | TRUE | | 2024-01-15 |

### DailyStats Sheet
Automatically populated with daily statistics:

| date | groupId | groupName | totalMembers | joinedToday | leftToday | netGrowth | notes |
|------|---------|-----------|--------------|-------------|-----------|-----------|-------|
| 2024-01-15 | 1234567890@g.us | My Group | 150 | 5 | 2 | 3 | |

### Snapshots Sheet
Contains 3-hourly member count snapshots:

| timestamp | groupId | groupName | totalMembers |
|-----------|---------|-----------|--------------|
| 2024-01-15T09:00:00Z | 1234567890@g.us | My Group | 148 |

---

## Getting Group IDs

To find a WhatsApp group's ID:
1. Run the system and let it initialize
2. Check the logs - all groups will be listed with their IDs
3. Or use this snippet after initialization:

```typescript
// In a debug script
const groups = await whatsAppService.getAllGroups();
groups.forEach(g => console.log(`${g.name}: ${g.id._serialized}`));
```

Group IDs look like: `1234567890123@g.us`

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run in development mode with ts-node |
| `npm run dev:watch` | Run with auto-reload on changes |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm start -- --run-capture` | Start and immediately run capture |
| `npm start -- --run-report` | Start and immediately run report |

---

## Project Structure

```
whatsapp-tracker/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── index.ts          # Configuration loader
│   ├── services/
│   │   ├── whatsapp.ts       # WhatsApp client service
│   │   ├── sheets.ts         # Google Sheets API service
│   │   └── analytics.ts      # Analytics computation
│   ├── jobs/
│   │   ├── scheduler.ts      # Cron job management
│   │   ├── capture.ts        # 3-hourly capture job
│   │   └── report.ts         # Daily report job
│   ├── utils/
│   │   ├── logger.ts         # Winston logging
│   │   └── helpers.ts        # Utility functions
│   └── types/
│       └── index.ts          # TypeScript definitions
├── credentials/              # Service account JSON (gitignored)
├── logs/                     # Application logs (gitignored)
├── .wwebjs_auth/             # WhatsApp session (gitignored)
├── .env                      # Environment config (gitignored)
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## How It Works

### Capture Job (Every 3 Hours)
1. Reads active groups from the "Groups" sheet
2. Fetches current member count for each group via WhatsApp
3. Saves snapshots to the "Snapshots" sheet
4. Logs any errors for inaccessible groups

### Report Job (Daily at 10 AM)
1. Reads active groups from the "Groups" sheet
2. Gets current member counts from WhatsApp
3. Compares with yesterday's stats
4. Computes: joined, left, net growth
5. Saves to "DailyStats" sheet
6. Generates formatted report
7. Sends report to admin WhatsApp group (if configured)

---

## Daily Report Format

```
📊 Daily Group Analytics Report
📅 Date: 2024-01-15

📈 Overall Summary
• Groups Tracked: 32
• Total Members: 4,567
• Joined Today: +45
• Left Today: -12
• Net Growth: +33

🚀 Top Gainers
1. Study Group A: +15 (234 total)
2. Course Batch 2024: +12 (567 total)
...

📉 Top Losers
1. Old Course Group: -5 (123 total)
...

⚠️ Anomalies Detected
• Inactive Group: -15.2% (200 → 170)

📋 All Groups
[Table with all group stats]
```
---

## Troubleshooting

### QR Code Not Showing
- Make sure you have a display/terminal that supports QR codes
- Try running in a different terminal

### Google Sheets "Permission Denied"
- Verify the spreadsheet is shared with the service account email
- Check that the service account has "Editor" access

### WhatsApp Disconnects
- The session may have expired
- Delete `.wwebjs_auth` folder and re-scan QR
- Ensure you're not using WhatsApp Web elsewhere

### Groups Showing 0 Members
- You may have been removed from the group
- The group may have been deleted
- Check if you're still a member via WhatsApp

### High Memory Usage
- This is normal for Puppeteer-based solutions
- Recommend at least 1GB RAM
- Consider increasing swap space on low-memory VPS

---

## Security Notes

- **Never commit** the service account JSON or `.env` file
- Keep your WhatsApp session directory secure
- Use a dedicated WhatsApp number for the bot
- Regularly rotate service account keys
- Monitor for unusual API usage

---

## Running as a Service (Linux)

Create a systemd service file `/etc/systemd/system/whatsapp-tracker.service`:

```ini
[Unit]
Description=WhatsApp Group Analytics
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/whatsapp-tracker
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-tracker
sudo systemctl start whatsapp-tracker
sudo systemctl status whatsapp-tracker
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Disclaimer

This tool uses [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), an unofficial library. WhatsApp does not officially support bots or automated clients. Use responsibly and be aware that:

- Your account could potentially be banned
- This is for internal/educational use only
- Always respect WhatsApp's Terms of Service

---

## License

ISC
