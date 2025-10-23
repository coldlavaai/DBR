'use client'

import { RefreshCw } from 'lucide-react'
import Image from 'next/image'

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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Cold Lava Logo - Smaller on mobile */}
          <div className="flex items-center gap-6">
            <a
              href="https://coldlava.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-48 sm:w-56 md:w-72 h-14 sm:h-16 md:h-20 group cursor-pointer"
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

          {/* Center: DBR + Greenstar Logo - Responsive sizing */}
          <div className="group flex items-center gap-3 sm:gap-4 md:gap-6 px-4 sm:px-6 md:px-8 py-3 md:py-4 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20 hover:border-coldlava-cyan/50 transition-all duration-300 hover:shadow-lg hover:shadow-coldlava-cyan/20">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-coldlava-cyan to-coldlava-purple bg-clip-text text-transparent tracking-wide">
              DBR
            </h1>
            <div className="relative w-32 sm:w-40 md:w-48 h-10 sm:h-12 md:h-14 group-hover:scale-105 transition-all duration-300 drop-shadow-lg">
              <Image
                src="/greenstar-logo.png"
                alt="Greenstar Solar"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Right: Last updated */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="text-center md:text-right px-3 sm:px-4 py-2 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
                <p className="text-xs text-gray-400 font-medium">Last updated</p>
                <p className="text-sm text-coldlava-cyan font-bold">
                  {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
