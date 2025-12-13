import dbConnect from './db'
import User from '@/models/User'

// WhatsApp Service URL - runs separately on port 3002
const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3002'

class WhatsAppManager {
  async initializeClient(userId: string): Promise<void> {
    try {
      await fetch(`${WA_SERVICE_URL}/api/init/${userId}`, {
        method: 'POST',
      })
    } catch (err) {
      console.error(`Error initializing client for ${userId}:`, err)
    }
  }

  async getQRCode(userId: string): Promise<string | null> {
    try {
      const res = await fetch(`${WA_SERVICE_URL}/api/qr/${userId}`)
      const data = await res.json()

      if (data.status === 'ready') {
        // Update user in database
        await this.updateUserConnectionStatus(userId, true)
        return null // No QR needed, already connected
      }

      return data.qrCode || null
    } catch (err) {
      console.error(`Error getting QR for ${userId}:`, err)
      return null
    }
  }

  async getStatus(userId: string): Promise<{ isConnected: boolean; isInitialized: boolean; hasQR: boolean }> {
    try {
      const res = await fetch(`${WA_SERVICE_URL}/api/status/${userId}`)
      return await res.json()
    } catch (err) {
      console.error(`Error getting status for ${userId}:`, err)
      return { isConnected: false, isInitialized: false, hasQR: false }
    }
  }

  isClientReady(userId: string): boolean {
    // This is sync, so we can't check the service
    // The actual check happens via API
    return false
  }

  async disconnect(userId: string): Promise<void> {
    try {
      await fetch(`${WA_SERVICE_URL}/api/disconnect/${userId}`, {
        method: 'POST',
      })
      await this.updateUserConnectionStatus(userId, false)
    } catch (err) {
      console.error(`Error disconnecting ${userId}:`, err)
    }
  }

  private async updateUserConnectionStatus(userId: string, connected: boolean): Promise<void> {
    try {
      await dbConnect()
      await User.findByIdAndUpdate(userId, {
        waConnected: connected,
        waLastSeen: connected ? new Date() : undefined,
      })
    } catch (err) {
      console.error(`Error updating connection status for user ${userId}:`, err)
    }
  }

  getClientStatus(userId: string): { isInitialized: boolean; isReady: boolean; hasQR: boolean } {
    // Sync method - return defaults, use async getStatus() instead
    return {
      isInitialized: false,
      isReady: false,
      hasQR: false,
    }
  }
}

// Singleton instance
const globalForWA = globalThis as unknown as {
  waManager: WhatsAppManager | undefined
}

export const waManager = globalForWA.waManager ?? new WhatsAppManager()

if (process.env.NODE_ENV !== 'production') {
  globalForWA.waManager = waManager
}

export default waManager
