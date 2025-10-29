'use client'

import { useState } from 'react'
import { Calendar, Clock, ChevronDown, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface CallBookedSectionProps {
  leads: Lead[]
  onRefresh?: () => void
  expandedLeadId?: string | null
}

export default function CallBookedSection({ leads, onRefresh, expandedLeadId }: CallBookedSectionProps) {
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)

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
        isPast,
        date
      }
    } catch {
      return null
    }
  }

  // Sort leads: upcoming calls first (soonest to latest), then past calls (latest to earliest)
  const sortedLeads = [...leads].sort((a, b) => {
    const aTime = (a as any).callBookedTime
    const bTime = (b as any).callBookedTime

    if (!aTime && !bTime) return 0
    if (!aTime) return 1
    if (!bTime) return -1

    const aDate = new Date(aTime)
    const bDate = new Date(bTime)
    const now = new Date()

    const aIsPast = aDate < now
    const bIsPast = bDate < now

    // If one is past and one is future, future comes first
    if (aIsPast && !bIsPast) return 1
    if (!aIsPast && bIsPast) return -1

    // Both future or both past: sort by date ascending (soonest first)
    return aDate.getTime() - bDate.getTime()
  })

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No upcoming calls</p>
      </div>
    )
  }

  const visibleLeads = sortedLeads.slice(0, visibleCount)
  const hasMore = visibleCount < sortedLeads.length

  return (
    <div className="p-6">
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
              Load More ({sortedLeads.length - visibleCount} remaining)
            </>
          )}
        </button>
      )}
    </div>
  )
}
