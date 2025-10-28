'use client'

import { Calendar, Clock } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface BookedCallsSectionProps {
  leads: Lead[]
  onRefresh?: () => void
  expandedLeadId?: string | null
}

export default function BookedCallsSection({ leads, onRefresh, expandedLeadId }: BookedCallsSectionProps) {
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

  return (
    <div className="p-6 space-y-4">
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
  )
}
