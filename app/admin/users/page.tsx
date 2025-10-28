'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Plus, Shield, ShieldOff, Trash2, Key, CheckCircle, XCircle, Mail, Calendar, Clock, Eye, EyeOff } from 'lucide-react'

interface User {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'user'
  image: string | null
  email_verified: string | null
  created_at: string
  last_login: string | null
  is_active: boolean
  auth_providers: { provider: string }[]
}

function UserManagementContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'user' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    } else if (session?.user?.role !== 'admin') {
      router.push('/dbr-analytics')
    } else {
      fetchUsers()
    }
  }, [status, session, router])

  useEffect(() => {
    if (users.length > 0) {
      const action = searchParams.get('action')
      const userId = searchParams.get('userId')

      if (action === 'change-password' && userId) {
        const user = users.find(u => u.id === parseInt(userId))
        if (user) {
          setSelectedUser(user)
          setShowPasswordModal(true)
        }
      }
    }
  }, [searchParams, users])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        setError('Failed to load users')
      }
    } catch (error) {
      setError('An error occurred while loading users')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        setSuccess('User created successfully')
        setShowCreateModal(false)
        setNewUser({ email: '', name: '', password: '', role: 'user' })
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create user')
      }
    } catch (error) {
      setError('An error occurred while creating user')
    }
  }

  const toggleUserRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setSuccess(`User role updated to ${newRole}`)
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update role')
      }
    } catch (error) {
      setError('An error occurred while updating role')
    }
  }

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update status')
      }
    } catch (error) {
      setError('An error occurred while updating status')
    }
  }

  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('User deleted successfully')
        fetchUsers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete user')
      }
    } catch (error) {
      setError('An error occurred while deleting user')
    }
  }

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 12) {
      return { valid: false, message: 'Password must be at least 12 characters long' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}etc.)' }
    }
    return { valid: true, message: 'Password meets requirements' }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!selectedUser) return

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      if (response.ok) {
        setSuccess(`Password changed successfully for ${selectedUser.email}`)
        setShowPasswordModal(false)
        setNewPassword('')
        setConfirmPassword('')
        setSelectedUser(null)
        router.push('/admin/users')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setError('An error occurred while changing password')
    }
  }

  const openPasswordModal = (user: User) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-coldlava flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-coldlava p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Users className="w-8 h-8" />
                User Management
              </h1>
              <p className="text-gray-300">Manage user accounts and permissions</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-cyan text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create User
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-200 hover:text-white">×</button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-200">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-200 hover:text-white">×</button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/20 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Auth Methods</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Last Login</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Joined</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-cyan flex items-center justify-center text-white font-semibold">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.name || 'No name'}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleUserRole(user.id, user.role)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          user.role === 'admin'
                            ? 'bg-coldlava-gold/20 text-coldlava-gold border border-coldlava-gold/50'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        } hover:opacity-80`}
                      >
                        {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {user.role}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          user.is_active
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        } hover:opacity-80`}
                      >
                        {user.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.auth_providers.map((provider, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 border border-white/20"
                          >
                            {provider.provider}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="p-2 text-coldlava-cyan hover:text-coldlava-cyan/80 hover:bg-coldlava-cyan/10 rounded transition-all"
                          title="Change password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-coldlava-secondary rounded-xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-4">Create New User</h2>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-cyan text-white rounded-lg font-semibold hover:opacity-90 transition-all"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-coldlava-secondary rounded-xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-2">Change Password</h2>
              <p className="text-gray-300 mb-6">
                Changing password for <span className="text-coldlava-cyan font-semibold">{selectedUser.email}</span>
              </p>

              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coldlava-cyan"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs font-semibold text-gray-300 mb-2">Password Requirements:</p>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li className={newPassword.length >= 12 ? 'text-green-400' : ''}>• At least 12 characters long</li>
                    <li className={/[a-z]/.test(newPassword) ? 'text-green-400' : ''}>• One lowercase letter (a-z)</li>
                    <li className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>• One uppercase letter (A-Z)</li>
                    <li className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>• One number (0-9)</li>
                    <li className={/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(newPassword) ? 'text-green-400' : ''}>• One special character (!@#$%^&* etc.)</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setSelectedUser(null)
                      router.push('/admin/users')
                    }}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-cyan text-white rounded-lg font-semibold hover:opacity-90 transition-all"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-coldlava flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <UserManagementContent />
    </Suspense>
  )
}
