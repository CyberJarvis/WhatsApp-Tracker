# WhatsApp Analytics Dashboard - Deployment Guide

This guide covers deploying the WhatsApp Analytics Dashboard using:
- **Vercel** - For the Next.js dashboard (free tier available)
- **Railway** - For the WhatsApp service (free tier: 500 hours/month)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel (Dashboard)                           │
│                   your-app.vercel.app                           │
│                                                                 │
│  - Next.js Frontend                                             │
│  - Authentication (NextAuth)                                    │
│  - API Routes (proxy to WhatsApp service)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Railway (WhatsApp Service)                      │
│               your-service.up.railway.app                       │
│                                                                 │
│  - WhatsApp Web.js with Puppeteer                               │
│  - QR Code generation                                           │
│  - Multi-user session management                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB Atlas                               │
│                  (Cloud Database)                               │
│                                                                 │
│  - Users, Groups, Snapshots, Daily Stats                        │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **GitHub Account** - To host your code
2. **MongoDB Atlas Account** - Free tier available at https://mongodb.com/atlas
3. **Vercel Account** - Free at https://vercel.com
4. **Railway Account** - Free at https://railway.app

---

## Step 1: Set Up MongoDB Atlas

1. Go to https://mongodb.com/atlas and create an account
2. Create a new cluster (free tier M0 is fine)
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Vercel/Railway access)
5. Get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/whatsapp-analytics?retryWrites=true&w=majority
   ```

---

## Step 2: Push Code to GitHub

1. Create a new GitHub repository
2. Push your code:
   ```bash
   cd /path/to/WhatsApp-Tracker/dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/whatsapp-analytics.git
   git push -u origin main
   ```

---

## Step 3: Deploy WhatsApp Service to Railway

Railway needs to be deployed FIRST because Vercel needs its URL.

### 3.1 Create Railway Project

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure the service:
   - **Root Directory**: `whatsapp-service`
   - Railway will auto-detect the Dockerfile

### 3.2 Set Environment Variables

In Railway dashboard, go to Variables and add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/whatsapp-analytics?retryWrites=true&w=majority` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (update after Vercel deploy) |
| `PORT` | `3002` |

### 3.3 Get Railway URL

After deployment, get your Railway URL from the "Settings" tab:
```
https://your-service-name.up.railway.app
```

---

## Step 4: Deploy Dashboard to Vercel

### 4.1 Import to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New Project" → "Import Git Repository"
3. Select your repository
4. Configure:
   - **Root Directory**: `dashboard` (or leave empty if dashboard is root)
   - **Framework Preset**: Next.js

### 4.2 Set Environment Variables

In Vercel dashboard, go to Settings → Environment Variables and add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/whatsapp-analytics?retryWrites=true&w=majority` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` |
| `WHATSAPP_SERVICE_URL` | `https://your-service.up.railway.app` |

### 4.3 Deploy

Click "Deploy" and wait for the build to complete.

---

## Step 5: Update Railway FRONTEND_URL

Go back to Railway and update the `FRONTEND_URL` environment variable with your actual Vercel URL.

---

## Step 6: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Register a new account
3. Scan the WhatsApp QR code
4. Verify groups are synced

---

## Environment Variables Summary

### Dashboard (Vercel)

```env
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key
WHATSAPP_SERVICE_URL=https://your-service.up.railway.app
```

### WhatsApp Service (Railway)

```env
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://your-app.vercel.app
PORT=3002
```

---

## Troubleshooting

### QR Code Not Loading
- Check Railway logs for errors
- Verify CORS is configured correctly
- Ensure MongoDB connection is working

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain exactly

### WhatsApp Disconnects
- Railway free tier has 500 hours/month
- WhatsApp sessions may timeout after inactivity
- Consider Railway's paid plan for 24/7 uptime

### Session Persistence
- WhatsApp sessions are stored in Railway's filesystem
- Sessions survive restarts but may be lost on redeployment
- For production, consider storing sessions in MongoDB

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | Unlimited (hobby) | $20/month (Pro) |
| **Railway** | 500 hours/month | $5/month (Developer) |
| **MongoDB Atlas** | 512MB storage | $9/month (M2) |

**Total for hobby use: $0/month**
**Total for production: ~$35/month**

---

## Local Development

To run locally:

```bash
# Terminal 1 - Dashboard
cd dashboard
npm install
npm run dev

# Terminal 2 - WhatsApp Service
cd dashboard/whatsapp-service
npm install
npm start
```

Dashboard: http://localhost:3001
WhatsApp Service: http://localhost:3002

---

## Security Notes

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Whitelist specific IPs** in MongoDB for production
4. **Enable 2FA** on all accounts (GitHub, Vercel, Railway, MongoDB)
