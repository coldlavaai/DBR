'use client'

import { RefreshCw, LogOut, User, Settings, Shield } from 'lucide-react'
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
                  <div className="hidden sm:block text-left">
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
                  <div className="absolute right-0 mt-2 w-64 bg-coldlava-secondary/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 overflow-hidden z-50 animate-slide-up">
                    <div className="p-4 border-b border-white/10">
                      <p className="text-white font-semibold">{session.user.name || 'User'}</p>
                      <p className="text-sm text-gray-400 truncate">{session.user.email}</p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          session.user.role === 'admin'
                            ? 'bg-coldlava-gold/20 text-coldlava-gold border border-coldlava-gold/50'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        }`}>
                          {session.user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {session.user.role}
                        </span>
                      </div>
                    </div>

                    <div className="p-2">
                      {session.user.role === 'admin' && (
                        <button
                          onClick={() => {
                            router.push('/admin/users')
                            setShowUserMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                          <Settings className="w-4 h-4" />
                          Manage Users
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
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
