import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'
import { MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign In - WhatsApp Analytics',
  description: 'Sign in to your WhatsApp Analytics dashboard',
}

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <MessageCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-2">Sign in to your WhatsApp Analytics dashboard</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
