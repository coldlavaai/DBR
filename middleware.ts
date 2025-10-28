import NextAuth from 'next-auth'
import { authConfigEdge } from './auth.config.edge'

export default NextAuth(authConfigEdge).auth

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|logos).*)'
  ],
}
