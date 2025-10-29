'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronDown, Loader2, Maximize2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import LeadCard, { Lead } from './LeadCard'

interface BookedCallsSectionProps {
  leads: Lead[]
  onRefresh?: () => void
  expandedLeadId?: string | null
}

export default function BookedCallsSection({ leads, onRefresh, expandedLeadId }: BookedCallsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadMore = () => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 5)
      setLoading(false)
    }, 300)
  }

  const formatCallTime = (callTime?: string) => {
    if (!callTime) return null
    try {
      const date = new Date(callTime)
      const now = new Date()
      const isPast = date < now

      // Format as "Wed, Oct 24 at 1:30 PM"
      const formatted = date.toLocaleString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      return {
        formatted,
        isPast
      }
    } catch {
      return null
    }
  }

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No calls booked</p>
      </div>
    )
  }

  const visibleLeads = leads.slice(0, visibleCount)
  const hasMore = visibleCount < leads.length

  // Fullscreen view
  if (isFullScreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] bg-gradient-coldlava overflow-y-auto">
        <div className="min-h-screen p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sticky top-6 z-10 bg-gradient-coldlava/95 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Booked Calls ({leads.length})</h2>
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="Exit fullscreen"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* All leads - no limit */}
          <div className="space-y-4 pb-6">
            {leads.map((lead) => {
              const callTime = formatCallTime((lead as any).callBookedTime)

              return (
                <div key={lead._id} className="relative">
                  {/* Call Time Badge */}
                  {callTime && (
                    <div className={`absolute -top-2 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                      callTime.isPast
                        ? 'bg-gray-600/80 text-gray-300'
                        : 'bg-emerald-500/80 text-white'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {callTime.formatted}
                      {callTime.isPast && ' (Past)'}
                    </div>
                  )}
                  <LeadCard
                    lead={lead}
                    onRefresh={onRefresh}
                    expandedByDefault={lead._id === expandedLeadId}
                    showArchiveButton={true}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Compact view
  return (
    <div className="p-6">
      {/* Maximize button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsFullScreen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-all"
          title="Open fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
          Full Screen
        </button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {visibleLeads.map((lead) => {
          const callTime = formatCallTime((lead as any).callBookedTime)

          return (
            <div key={lead._id} className="relative">
              {/* Call Time Badge */}
              {callTime && (
                <div className={`absolute -top-2 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  callTime.isPast
                    ? 'bg-gray-600/80 text-gray-300'
                    : 'bg-emerald-500/80 text-white'
                }`}>
                  <Clock className="w-3 h-3" />
                  {callTime.formatted}
                  {callTime.isPast && ' (Past)'}
                </div>
              )}
              <LeadCard
                lead={lead}
                onRefresh={onRefresh}
                expandedByDefault={lead._id === expandedLeadId}
                showArchiveButton={true}
              />
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full mt-4 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Load More ({leads.length - visibleCount} remaining)
            </>
          )}
        </button>
      )}
    </div>
  )
}
