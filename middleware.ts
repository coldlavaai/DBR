// TEMPORARY: Authentication disabled for testing
// To re-enable: uncomment the NextAuth lines and comment out the pass-through middleware

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pass-through middleware (no authentication)
export default function middleware(request: NextRequest) {
  return NextResponse.next()
}

// Original auth middleware (commented out for testing):
// import NextAuth from 'next-auth'
// import { authConfigEdge } from './auth.config.edge'
// export default NextAuth(authConfigEdge).auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|logos).*)'
  ],
}
