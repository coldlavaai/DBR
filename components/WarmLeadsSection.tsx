'use client'

import { TrendingUp } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface WarmLeadsSectionProps {
  leads: Lead[]
  onArchive?: () => void
  expandedLeadId?: string | null
}

export default function WarmLeadsSection({ leads, onArchive, expandedLeadId }: WarmLeadsSectionProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No warm leads at the moment</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full" />
          <TrendingUp className="w-7 h-7 text-yellow-400" />
          Warm Leads ({leads.length})
        </h3>
        <p className="text-sm text-gray-400">Leads showing interest</p>
      </div>

      {/* Leads Grid - Using LeadCard component */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            onRefresh={onArchive}
            expandedByDefault={lead._id === expandedLeadId}
            showArchiveButton={true}
          />
        ))}
      </div>
    </div>
  )
}
