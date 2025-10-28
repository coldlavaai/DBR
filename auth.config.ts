import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { sql } from '@vercel/postgres'

// Define user role type
export type UserRole = 'admin' | 'user'

// Define custom user type
export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  image: string | null
}

export const authConfig: NextAuthConfig = {
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Link accounts with same email
    }),

    // Apple OAuth
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // Email/Password credentials
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Fetch user from database
          const result = await sql`
            SELECT id, email, name, password_hash, role, image, is_active
            FROM users
            WHERE email = ${credentials.email as string}
            LIMIT 1
          `

          const user = result.rows[0]

          if (!user || !user.is_active) {
            return null
          }

          // Verify password
          if (!user.password_hash) {
            // User registered with OAuth, no password set
            return null
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          )

          if (!isValid) {
            return null
          }

          // Update last login
          await sql`
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = ${user.id}
          `

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            image: user.image,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],

  callbacks: {
    // Add user info to session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
      }
      return session
    },

    // Add role to JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
      }

      // On OAuth sign-in, create/update user in database
      if (account && user) {
        try {
          // Check if user exists
          const existingUser = await sql`
            SELECT id, role FROM users WHERE email = ${user.email!} LIMIT 1
          `

          if (existingUser.rows.length > 0) {
            // Update existing user
            const dbUser = existingUser.rows[0]
            await sql`
              UPDATE users
              SET name = ${user.name || null},
                  image = ${user.image || null},
                  last_login = CURRENT_TIMESTAMP,
                  email_verified = CURRENT_TIMESTAMP
              WHERE id = ${dbUser.id}
            `
            token.role = dbUser.role
          } else {
            // Create new user (default role: user)
            const newUser = await sql`
              INSERT INTO users (email, name, image, role, email_verified, is_active)
              VALUES (${user.email!}, ${user.name || null}, ${user.image || null}, 'user', CURRENT_TIMESTAMP, true)
              RETURNING id, role
            `
            token.role = newUser.rows[0].role
          }

          // Store OAuth account info
          await sql`
            INSERT INTO accounts (user_id, provider, provider_account_id, access_token, refresh_token, expires_at, token_type, scope, id_token)
            VALUES (
              (SELECT id FROM users WHERE email = ${user.email!} LIMIT 1),
              ${account.provider},
              ${account.providerAccountId},
              ${account.access_token || null},
              ${account.refresh_token || null},
              ${account.expires_at || null},
              ${account.token_type || null},
              ${account.scope || null},
              ${account.id_token || null}
            )
            ON CONFLICT (provider, provider_account_id)
            DO UPDATE SET
              access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token,
              expires_at = EXCLUDED.expires_at,
              token_type = EXCLUDED.token_type,
              scope = EXCLUDED.scope,
              id_token = EXCLUDED.id_token
          `
        } catch (error) {
          console.error('Error saving OAuth user:', error)
        }
      }

      return token
    },

    // Redirect callback
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/dbr-analytics'
    },
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days - stays logged in until manual logout
  },

  trustHost: true,
}
