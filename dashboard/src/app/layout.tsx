import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import SWRProvider from '@/components/providers/SWRProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WhatsApp Analytics Dashboard',
  description: 'Track and analyze WhatsApp group member statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <SWRProvider>
            {children}
          </SWRProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
