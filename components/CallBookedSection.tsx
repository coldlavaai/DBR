'use client'

import { Calendar } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface CallBookedSectionProps {
  leads: Lead[]
  onRefresh?: () => void
  expandedLeadId?: string | null
}

export default function CallBookedSection({ leads, onRefresh, expandedLeadId }: CallBookedSectionProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <Calendar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No calls booked yet</p>
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
          Calls Booked ({leads.length})
        </h3>
        <p className="text-sm text-gray-400">Scheduled via Cal.com</p>
      </div>

      {/* Leads Grid - Using LeadCard component */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            onRefresh={onRefresh}
            expandedByDefault={lead._id === expandedLeadId}
            showArchiveButton={false}
          />
        ))}
      </div>
    </div>
  )
}
