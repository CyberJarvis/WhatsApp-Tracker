import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import RegisterForm from '@/components/auth/RegisterForm'
import { MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Create Account - WhatsApp Analytics',
  description: 'Create your WhatsApp Analytics account',
}

export default async function RegisterPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-2">Start tracking your WhatsApp groups analytics</p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
