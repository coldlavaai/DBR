import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'

// PATCH update user (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()
    const { role, is_active, password } = body

    // Prevent admin from deactivating themselves
    if (session.user.id === userId && is_active === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    // Prevent admin from removing their own admin role
    if (session.user.id === userId && role && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`)
      values.push(role)
      paramIndex++
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(is_active)
      paramIndex++
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updates.push(`password_hash = $${paramIndex}`)
      values.push(passwordHash)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, is_active, updated_at
    `

    const result = await sql.query(query, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING id
    `

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
