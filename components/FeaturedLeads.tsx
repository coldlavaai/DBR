'use client'

import { Star } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface FeaturedLeadsProps {
  leads: Lead[]
  onRefresh?: () => void
}

export default function FeaturedLeads({ leads, onRefresh }: FeaturedLeadsProps) {
  if (leads.length === 0) {
    return null // Don't show the section if there are no starred leads
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-yellow-400/30 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
          <Star className="w-7 h-7 text-yellow-400 fill-yellow-400 animate-pulse" />
          Featured Leads ({leads.length})
        </h3>
        <p className="text-sm text-gray-400">Leads you're keeping an eye on</p>
      </div>

      {/* Leads Grid */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            onRefresh={onRefresh}
            showArchiveButton={false}
          />
        ))}
      </div>
    </div>
  )
}
