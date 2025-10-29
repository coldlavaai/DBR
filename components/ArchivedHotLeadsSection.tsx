'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore, ChevronDown, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface ArchivedHotLeadsSectionProps {
  leads: Lead[]
  onUnarchive?: () => void
}

export default function ArchivedHotLeadsSection({ leads, onUnarchive }: ArchivedHotLeadsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unarchiving, setUnarchiving] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)

  const loadMore = () => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 5)
      setLoading(false)
    }, 300)
  }

  const handleUnarchive = async (leadId: string, leadName: string) => {
    if (!confirm(`Unarchive ${leadName}? This will move them back to active leads.`)) {
      return
    }

    setUnarchiving(leadId)

    try {
      const response = await fetch('/api/archive-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, archived: false })
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive lead')
      }

      // Call the refresh callback
      if (onUnarchive) {
        onUnarchive()
      }
    } catch (error) {
      console.error('Error unarchiving lead:', error)
      alert('Failed to unarchive lead. Please try again.')
    } finally {
      setUnarchiving(null)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-gray-400" />
        </div>
        <ArchiveRestore className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-white/10 animate-fade-in">
          {leads.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No archived leads</p>
              <p className="text-sm mt-1">Archived hot leads will appear here</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {leads.slice(0, visibleCount).map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    onRefresh={onUnarchive}
                    onArchive={handleUnarchive}
                    showArchiveButton={true}
                    isArchived={true}
                  />
                ))}
              </div>

              {visibleCount < leads.length && (
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
