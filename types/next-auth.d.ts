import { DefaultSession } from 'next-auth'
import { UserRole } from '@/auth.config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }

  interface User {
    role: UserRole
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: UserRole
  }
}
