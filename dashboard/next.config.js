const path = require('path');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['googleapis'],
  turbopack: {},
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,
  },
}

module.exports = nextConfig
