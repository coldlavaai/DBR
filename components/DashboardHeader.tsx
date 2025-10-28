'use client'

import { RefreshCw, LogOut, User, Settings, Shield, UserPlus, Key, BarChart3 } from 'lucide-react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

interface DashboardHeaderProps {
  clientName?: string
  clientLogoUrl?: string
  campaignName?: string
  lastUpdated?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function DashboardHeader({
  clientName = process.env.NEXT_PUBLIC_CLIENT_NAME || 'Client',
  clientLogoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL,
  campaignName = process.env.NEXT_PUBLIC_CAMPAIGN_NAME || 'DBR Campaign',
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  return (
    <div className="relative overflow-hidden bg-gradient-coldlava border-b-4 border-coldlava-cyan shadow-2xl">
      {/* Enhanced animated background decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-coldlava-cyan rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-coldlava-pink rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-coldlava-purple rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Gradient overlay for extra depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-coldlava-cyan/5 via-transparent to-coldlava-pink/5 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left: Cold Lava Logo - Much smaller on mobile */}
          <div className="flex items-center flex-shrink-0">
            <a
              href="https://coldlava.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-36 sm:w-48 md:w-56 lg:w-72 h-12 sm:h-14 md:h-16 lg:h-20 group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-coldlava-cyan to-coldlava-pink rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative w-full h-full transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logos/cold-lava-logo.png"
                  alt="Cold Lava AI"
                  fill
                  className="object-contain object-left drop-shadow-2xl"
                  priority
                />
              </div>
            </a>
          </div>

          {/* Center: DBR + Greenstar Logo - Optimized for small screens */}
          <div className="group flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 md:py-4 bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl border-2 border-white/20 hover:border-coldlava-cyan/50 transition-all duration-300 hover:shadow-lg hover:shadow-coldlava-cyan/20 flex-shrink-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-coldlava-cyan to-coldlava-purple bg-clip-text text-transparent tracking-wide whitespace-nowrap">
              DBR
            </h1>
            <div className="relative w-24 sm:w-32 md:w-40 lg:w-48 h-8 sm:h-10 md:h-12 lg:h-14 group-hover:scale-105 transition-all duration-300 drop-shadow-lg flex-shrink-0">
              <Image
                src="/greenstar-logo.png"
                alt="Greenstar Solar"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Right: Last updated + User Menu */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {lastUpdated && (
              <div className="text-center md:text-right px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 rounded-lg sm:rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Last updated</p>
                <p className="text-xs sm:text-sm text-coldlava-cyan font-bold whitespace-nowrap">
                  {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            {/* User Menu */}
            {session?.user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-cyan flex items-center justify-center text-white font-semibold text-sm">
                    {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white font-medium leading-tight">
                      {session.user.name || 'User'}
                    </p>
                    {session.user.role === 'admin' && (
                      <p className="text-xs text-coldlava-gold flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </p>
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="fixed right-4 top-20 w-72 bg-gradient-to-br from-coldlava-primary to-coldlava-secondary backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-coldlava-cyan/30 overflow-hidden animate-slide-up" style={{ zIndex: 999999 }}>
                    {/* User Info Header */}
                    <div className="p-4 bg-white/5 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-cyan flex items-center justify-center text-white font-bold text-lg">
                          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-base truncate">{session.user.name || 'User'}</p>
                          <p className="text-sm text-gray-300 truncate">{session.user.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        session.user.role === 'admin'
                          ? 'bg-coldlava-gold/20 text-coldlava-gold border border-coldlava-gold/50'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      }`}>
                        {session.user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {session.user.role === 'admin' ? 'Administrator' : 'User'}
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      {/* Dashboard Link */}
                      <button
                        onClick={() => {
                          router.push('/dbr-analytics')
                          setShowUserMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-coldlava-cyan/20 rounded-xl transition-all group"
                      >
                        <BarChart3 className="w-5 h-5 text-coldlava-cyan group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Dashboard</span>
                      </button>

                      {/* Admin Only Options */}
                      {session.user.role === 'admin' && (
                        <>
                          <div className="my-2 border-t border-white/10"></div>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Admin Tools
                          </div>

                          <button
                            onClick={() => {
                              router.push('/admin/users?action=create')
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-coldlava-cyan/20 rounded-xl transition-all group"
                          >
                            <UserPlus className="w-5 h-5 text-coldlava-yellow group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Create User</span>
                          </button>

                          <button
                            onClick={() => {
                              router.push('/admin/users')
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-coldlava-cyan/20 rounded-xl transition-all group"
                          >
                            <Settings className="w-5 h-5 text-coldlava-pink group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Manage Users</span>
                          </button>

                          <button
                            onClick={() => {
                              router.push('/admin/users?action=change-password&userId=' + session.user.id)
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-coldlava-cyan/20 rounded-xl transition-all group"
                          >
                            <Key className="w-5 h-5 text-coldlava-purple group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Change Password</span>
                          </button>
                        </>
                      )}

                      {/* Sign Out */}
                      <div className="my-2 border-t border-white/10"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 rounded-xl transition-all group"
                      >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-white/5 border-t border-white/10 text-center">
                      <p className="text-xs text-gray-400">
                        Powered by <span className="text-coldlava-cyan font-semibold">Cold Lava</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
