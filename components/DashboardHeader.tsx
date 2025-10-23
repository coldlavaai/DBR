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

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Cold Lava Logo with hover effect */}
          <div className="flex items-center gap-6">
            <a
              href="https://coldlava.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-72 h-20 group cursor-pointer"
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

          {/* Center: Client Branding */}
          <div className="group flex items-center gap-4 px-8 py-4 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20 hover:border-coldlava-cyan/50 transition-all duration-300 hover:shadow-lg hover:shadow-coldlava-cyan/20">
            {clientLogoUrl && (
              <div className="relative w-16 h-16 bg-white rounded-xl p-2 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                <Image
                  src={clientLogoUrl}
                  alt={`${clientName} logo`}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {clientName}
                <span className="bg-gradient-to-r from-coldlava-cyan to-coldlava-purple bg-clip-text text-transparent animate-glow">
                  Analytics
                </span>
              </h1>
              <p className="text-gray-300 text-sm">{campaignName}</p>
            </div>
          </div>

          {/* Right: Last updated + refresh */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <>
                <div className="text-right px-4 py-2 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10">
                  <p className="text-xs text-gray-400 font-medium">Last updated</p>
                  <p className="text-sm text-coldlava-cyan font-bold">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </p>
                </div>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-3 bg-gradient-to-br from-coldlava-cyan/20 to-coldlava-purple/20 hover:from-coldlava-cyan/30 hover:to-coldlava-purple/30 border-2 border-coldlava-cyan/30 hover:border-coldlava-cyan rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-coldlava-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-coldlava-cyan ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                    />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
