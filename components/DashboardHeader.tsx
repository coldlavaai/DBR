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
      {/* Animated background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-coldlava-cyan rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-coldlava-pink rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Client branding */}
          <div className="flex items-center gap-6">
            {clientLogoUrl && (
              <div className="relative w-16 h-16 bg-white rounded-xl p-2 shadow-lg">
                <Image
                  src={clientLogoUrl}
                  alt={`${clientName} logo`}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                {clientName}
                <span className="text-coldlava-cyan">|</span>
                <span className="bg-gradient-to-r from-coldlava-cyan to-coldlava-purple bg-clip-text text-transparent">
                  Analytics
                </span>
              </h1>
              <p className="text-gray-300 text-sm">{campaignName}</p>
            </div>
          </div>

          {/* Right: Cold Lava branding + refresh */}
          <div className="flex items-center gap-6">
            {/* Last updated + refresh button */}
            {lastUpdated && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Last updated</p>
                  <p className="text-sm text-gray-300">
                    {new Date(lastUpdated).toLocaleTimeString()}
                  </p>
                </div>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-coldlava-cyan ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                    />
                  </button>
                )}
              </div>
            )}

            {/* Powered by Cold Lava */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-coldlava-cyan rounded-full animate-pulse" />
                <span className="text-xs text-gray-300">Powered by</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold bg-gradient-to-r from-coldlava-cyan via-coldlava-pink to-coldlava-purple bg-clip-text text-transparent">
                  Cold Lava
                </span>
                <span className="text-xs text-coldlava-cyan">AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
