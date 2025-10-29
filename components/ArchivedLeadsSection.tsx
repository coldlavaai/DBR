'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore, ChevronDown, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface ArchivedLeadsSectionProps {
  leads: Lead[]
  onUnarchive?: () => void
}

export default function ArchivedLeadsSection({ leads, onUnarchive }: ArchivedLeadsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unarchiving, setUnarchiving] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)

  const loadMore = () => {
    setLoading(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 5)
      setLoading(false)
    }, 300)
  }

  // Get unique statuses from archived leads
  const uniqueStatuses = new Set(leads.map(lead => lead.contactStatus).filter(Boolean))
  const statuses = ['all', ...Array.from(uniqueStatuses)]

  // Count leads per status
  const statusCounts = statuses.reduce((acc, status) => {
    if (status === 'all') {
      acc[status] = leads.length
    } else {
      acc[status] = leads.filter(lead => lead.contactStatus === status).length
    }
    return acc
  }, {} as Record<string, number>)

  // Filter leads by selected status
  const filteredLeads = selectedStatus === 'all'
    ? leads
    : leads.filter(lead => lead.contactStatus === selectedStatus)

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

  // Get status emoji and color
  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ALL':
        return { emoji: '📦', label: 'All Archived', color: 'from-gray-400 to-slate-500' }
      case 'HOT':
        return { emoji: '🔥', label: 'Hot', color: 'from-orange-400 to-red-500' }
      case 'WARM':
        return { emoji: '🟠', label: 'Warm', color: 'from-yellow-400 to-orange-400' }
      case 'NEUTRAL':
        return { emoji: '🔵', label: 'Neutral', color: 'from-gray-400 to-slate-500' }
      case 'COLD':
        return { emoji: '🧊', label: 'Cold', color: 'from-blue-600 to-cyan-700' }
      case 'POSITIVE':
        return { emoji: '✅', label: 'Positive', color: 'from-emerald-400 to-teal-500' }
      case 'CALL_BOOKED':
        return { emoji: '📞', label: 'Call Booked', color: 'from-purple-400 to-pink-500' }
      case 'CONVERTED':
        return { emoji: '✨', label: 'Converted', color: 'from-emerald-400 to-teal-500' }
      case 'INSTALLED':
        return { emoji: '✅', label: 'Installed', color: 'from-green-500 to-emerald-600' }
      case 'NEGATIVE':
        return { emoji: '❌', label: 'Negative', color: 'from-red-400 to-rose-500' }
      case 'REMOVED':
        return { emoji: '🚫', label: 'Removed', color: 'from-red-400 to-rose-500' }
      case 'SENT_1':
        return { emoji: '📨', label: 'Sent 1', color: 'from-blue-400 to-cyan-500' }
      case 'SENT_2':
        return { emoji: '📨', label: 'Sent 2', color: 'from-blue-500 to-indigo-500' }
      case 'SENT_3':
        return { emoji: '📨', label: 'Sent 3', color: 'from-indigo-500 to-purple-500' }
      default:
        return { emoji: '📄', label: status || 'Unknown', color: 'from-gray-400 to-slate-500' }
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
          <div>
            <h3 className="text-xl font-bold text-white">Archive</h3>
            <p className="text-sm text-gray-400">{leads.length} archived lead{leads.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <ArchiveRestore className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-white/10">
          {/* Status Tabs */}
          <div className="p-4 bg-black/20 border-b border-white/10">
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const display = getStatusDisplay(status)
                const isActive = selectedStatus === status

                return (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status)
                      setVisibleCount(3) // Reset visible count when changing filter
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      isActive
                        ? `bg-gradient-to-r ${display.color} text-white shadow-lg scale-105`
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{display.emoji}</span>
                    <span>{display.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                      {statusCounts[status] || 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Leads List */}
          <div className="p-6 animate-fade-in">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">No archived leads in this category</p>
                <p className="text-sm mt-1">Archived leads will appear here</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                  {filteredLeads.slice(0, visibleCount).map((lead) => (
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

                {visibleCount < filteredLeads.length && (
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
                        Load More ({filteredLeads.length - visibleCount} remaining)
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
