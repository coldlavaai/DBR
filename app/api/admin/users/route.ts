import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'

// GET all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.image,
        u.email_verified,
        u.created_at,
        u.last_login,
        u.is_active,
        COALESCE(
          json_agg(
            json_build_object('provider', a.provider)
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) as auth_providers
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `

    return NextResponse.json({ users: result.rows })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password, role = 'user' } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const result = await sql`
      INSERT INTO users (email, name, password_hash, role, is_active, email_verified)
      VALUES (${email}, ${name || null}, ${passwordHash}, ${role}, true, CURRENT_TIMESTAMP)
      RETURNING id, email, name, role, created_at, is_active
    `

    return NextResponse.json({ user: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
