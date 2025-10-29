'use client'

import { useState } from 'react'
import { TrendingUp, ChevronDown, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface WarmLeadsSectionProps {
  leads: Lead[]
  onArchive?: () => void
  expandedLeadId?: string | null
}

export default function WarmLeadsSection({ leads, onArchive, expandedLeadId }: WarmLeadsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)

  const loadMore = () => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 5)
      setLoading(false)
    }, 300)
  }

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No warm leads at the moment</p>
      </div>
    )
  }

  const visibleLeads = leads.slice(0, visibleCount)
  const hasMore = visibleCount < leads.length

  return (
    <div className="p-6">
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
        {visibleLeads.map((lead) => (
          <LeadCard
            key={lead._id}
            lead={lead}
            onRefresh={onArchive}
            expandedByDefault={lead._id === expandedLeadId}
            showArchiveButton={true}
          />
        ))}
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
