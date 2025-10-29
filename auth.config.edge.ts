import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config (for middleware)
// No bcrypt or Node.js APIs here
export const authConfigEdge: NextAuthConfig = {
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const publicRoutes = ['/auth/login', '/auth/error']
      const isPublicRoute = publicRoutes.some(route => nextUrl.pathname.startsWith(route))
      const isAuthApi = nextUrl.pathname.startsWith('/api/auth')

      // Allow cron jobs and webhooks to run without authentication
      const publicApiRoutes = [
        '/api/sync-sheets',
        '/api/sync-calcom-bookings',
        '/api/webhook/dbr-update',
        '/api/calcom-webhook',
        '/api/diagnostic',
        '/api/health',
        '/api/watchdog',
        '/api/sync-with-retry'
      ]
      const isPublicApi = publicApiRoutes.some(route => nextUrl.pathname.startsWith(route))

      if (isAuthApi || isPublicRoute || isPublicApi) {
        return true
      }

      if (!isLoggedIn) {
        return false
      }

      return true
    },
  },

  providers: [], // Providers are only defined in main config
}
