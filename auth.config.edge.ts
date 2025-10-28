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

      if (isAuthApi || isPublicRoute) {
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
