'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Loader2, CheckCircle, RefreshCw, Smartphone, Wifi } from 'lucide-react'

type SetupStatus = 'initializing' | 'waiting' | 'pending' | 'authenticated' | 'ready' | 'error'

export default function SetupPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [status, setStatus] = useState<SetupStatus>('initializing')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const initCalledRef = useRef(false)

  const fetchQRCode = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/qr')
      const data = await res.json()

      if (data.status === 'ready') {
        setStatus('ready')
        // Update session to reflect connected status
        await update({ waConnected: true })
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 2000)
      } else if (data.status === 'authenticated') {
        setStatus('authenticated')
        setQrCode(null)
      } else if (data.status === 'pending' && data.qrCode) {
        setStatus('pending')
        setQrCode(data.qrCode)
      } else if (data.status === 'initializing' || data.status === 'waiting') {
        setStatus(data.status)
      } else if (data.status === 'idle') {
        // Not initialized yet - trigger initialization
        if (!initCalledRef.current) {
          initCalledRef.current = true
          await fetch('/api/whatsapp/qr', { method: 'POST' })
        }
        setStatus('initializing')
      } else if (data.status === 'error' || data.error) {
        setStatus('error')
        setError(data.message || data.error || 'Connection failed')
      }
    } catch {
      setStatus('error')
      setError('Failed to connect to server')
    }
  }, [router, update])

  const initializeWhatsApp = async () => {
    if (initCalledRef.current) return
    initCalledRef.current = true

    try {
      await fetch('/api/whatsapp/qr', { method: 'POST' })
      // Start polling for QR code
      fetchQRCode()
    } catch {
      setStatus('error')
      setError('Failed to initialize WhatsApp')
    }
  }

  const retryConnection = async () => {
    setIsRetrying(true)
    setError(null)
    setStatus('initializing')
    initCalledRef.current = false

    try {
      await fetch('/api/whatsapp/retry', { method: 'POST' })
      initCalledRef.current = true
      fetchQRCode()
    } catch {
      setStatus('error')
      setError('Failed to retry connection')
    } finally {
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    // Initialize WhatsApp on mount
    initializeWhatsApp()

    // Poll for QR code updates (less frequently to avoid duplicate calls)
    const interval = setInterval(() => {
      if (status !== 'ready' && status !== 'error') {
        fetchQRCode()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [status, fetchQRCode])

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Connect WhatsApp</h1>
            <p className="text-gray-500 mt-2">
              Scan the QR code with your WhatsApp to start tracking your groups
            </p>
          </div>

          <div className="space-y-6">
            {/* Status: Initializing */}
            {status === 'initializing' && (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                <p className="text-gray-600">Initializing WhatsApp...</p>
                <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
              </div>
            )}

            {/* Status: Waiting for QR */}
            {status === 'waiting' && (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                <p className="text-gray-600">Generating QR code...</p>
              </div>
            )}

            {/* Status: QR Code Available */}
            {status === 'pending' && qrCode && (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-green-100 mb-6">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 w-full">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    How to scan
                  </h3>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-green-600">1.</span>
                      Open WhatsApp on your phone
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-green-600">2.</span>
                      Tap Menu or Settings and select Linked Devices
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-green-600">3.</span>
                      Tap on Link a Device
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium text-green-600">4.</span>
                      Point your phone at this screen to capture the QR code
                    </li>
                  </ol>
                </div>

                <button
                  onClick={() => fetchQRCode()}
                  className="mt-4 flex items-center gap-2 text-green-600 hover:text-green-700 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh QR code
                </button>
              </div>
            )}

            {/* Status: Authenticated (QR scanned, syncing) */}
            {status === 'authenticated' && (
              <div className="flex flex-col items-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Wifi className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">QR Code Scanned!</h2>
                <p className="text-gray-600 text-center mb-4">
                  Syncing with WhatsApp...
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm">
                  <p className="text-yellow-800 text-sm text-center">
                    Please keep your phone connected to the internet and don&apos;t close WhatsApp
                  </p>
                </div>
              </div>
            )}

            {/* Status: Connected */}
            {status === 'ready' && (
              <div className="flex flex-col items-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Connected!</h2>
                <p className="text-gray-600 text-center">
                  Your WhatsApp is now connected. Redirecting to dashboard...
                </p>
                <Loader2 className="w-6 h-6 text-green-600 animate-spin mt-4" />
              </div>
            )}

            {/* Status: Error */}
            {status === 'error' && (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl text-red-600">!</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
                <p className="text-gray-600 text-center mb-6">{error}</p>
                <button
                  onClick={retryConnection}
                  disabled={isRetrying}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Try Again
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Your WhatsApp session is stored securely on our servers
        </p>
      </div>
    </div>
  )
}
