import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import dbConnect from './db'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password')
        }

        await dbConnect()

        const user = await User.findOne({ email: credentials.email.toLowerCase() })

        if (!user) {
          throw new Error('No account found with this email')
        }

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)

        if (!passwordMatch) {
          throw new Error('Incorrect password')
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          waConnected: user.waConnected,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.waConnected = user.waConnected
      }

      // Allow updating the token when session is updated
      if (trigger === 'update' && session) {
        if (session.waConnected !== undefined) {
          token.waConnected = session.waConnected
        }
        if (session.name !== undefined) {
          token.name = session.name
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string

        // Always fetch fresh waConnected status from database
        try {
          await dbConnect()
          const user = await User.findById(token.id).select('waConnected').lean()
          session.user.waConnected = user?.waConnected ?? false
        } catch {
          session.user.waConnected = token.waConnected as boolean ?? false
        }
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    id: string
    waConnected: boolean
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      waConnected: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    waConnected: boolean
  }
}
