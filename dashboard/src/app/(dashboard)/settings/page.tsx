'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  User,
  Mail,
  MessageCircle,
  FileSpreadsheet,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
} from 'lucide-react'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [name, setName] = useState('')
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [waConnected, setWaConnected] = useState(false)

  // Service account email (you would get this from environment)
  const serviceAccountEmail = 'whatsapp-analytics-bot@whatsapp-analytics-481111.iam.gserviceaccount.com'

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()

      if (res.ok) {
        setName(data.name || '')
        setSheetsUrl(data.sheetsId || '')
        setWaConnected(data.waConnected || false)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sheetsId: sheetsUrl }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        await update({ name })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReconnectWhatsApp = () => {
    // Disconnect current session and redirect to setup
    fetch('/api/whatsapp/disconnect', { method: 'POST' })
      .then(() => {
        router.push('/setup')
      })
      .catch(console.error)
  }

  const copyServiceEmail = () => {
    navigator.clipboard.writeText(serviceAccountEmail)
    setMessage({ type: 'success', text: 'Email copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Settings" subtitle="Manage your account and preferences" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Settings" subtitle="Manage your account and preferences" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Success/Error Message */}
        {message && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{session?.user?.email}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    waConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {waConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {waConnected
                      ? 'Your WhatsApp is linked and tracking groups'
                      : 'Connect your WhatsApp to start tracking'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReconnectWhatsApp}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {waConnected ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Google Sheets Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">How to set up Google Sheets export:</h4>
              <ol className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  Create a new Google Sheet or use an existing one
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    Share the sheet with this email as an{' '}
                    <strong>Editor</strong>:
                  </span>
                </li>
              </ol>
              <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded border">
                <code className="flex-1 text-xs text-gray-700 break-all">
                  {serviceAccountEmail}
                </code>
                <button
                  onClick={copyServiceEmail}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                  title="Copy email"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-sm text-blue-700 space-y-2 mt-2" start={3}>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  Paste your Google Sheet URL below
                </li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Sheet URL or ID
              </label>
              <input
                type="text"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Your data will be exported to this sheet
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
