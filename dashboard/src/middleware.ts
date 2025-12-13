import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')
    const isSetupPage = req.nextUrl.pathname.startsWith('/setup')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Skip API routes - they handle their own auth
    if (isApiRoute) {
      return NextResponse.next()
    }

    // If user is logged in and on auth page, redirect to home or setup
    if (token && isAuthPage) {
      if (!token.waConnected) {
        return NextResponse.redirect(new URL('/setup', req.url))
      }
      return NextResponse.redirect(new URL('/', req.url))
    }

    // If user is logged in but not connected to WhatsApp
    if (token && !token.waConnected && !isSetupPage && !isAuthPage) {
      return NextResponse.redirect(new URL('/setup', req.url))
    }

    // If user is connected and on setup page, redirect to home
    if (token && token.waConnected && isSetupPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow auth pages without token
        const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')
        if (isAuthPage) return true

        // Allow setup page only with token
        const isSetupPage = req.nextUrl.pathname.startsWith('/setup')
        if (isSetupPage) return !!token

        // All other pages require token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
