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
      <div className="p-8 text-center">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No warm leads at the moment</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
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
