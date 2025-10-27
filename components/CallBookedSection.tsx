'use client'

import { Calendar, Clock } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface CallBookedSectionProps {
  leads: Lead[]
  onRefresh?: () => void
  expandedLeadId?: string | null
}

export default function CallBookedSection({ leads, onRefresh, expandedLeadId }: CallBookedSectionProps) {
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
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <Calendar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No upcoming calls</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-purple-400 to-pink-500 rounded-full" />
          <Calendar className="w-7 h-7 text-purple-400" />
          Upcoming Calls ({leads.length})
        </h3>
        <p className="text-sm text-gray-400">Scheduled via Cal.com</p>
      </div>

      {/* Leads Grid - Using LeadCard component with call time badges */}
      <div className="space-y-4">
        {sortedLeads.map((lead) => {
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
                showArchiveButton={false}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
