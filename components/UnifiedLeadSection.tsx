'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Loader2, Maximize2, X, LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'
import LeadCard, { Lead } from './LeadCard'

interface FilterTab {
  id: string
  label: string
  emoji: string
  color: string
}

interface UnifiedLeadSectionProps {
  leads: Lead[]
  icon: LucideIcon
  title: string
  emptyMessage?: string
  colorScheme: 'orange' | 'yellow' | 'purple' | 'gray' | 'green'
  onRefresh?: () => void
  expandedLeadId?: string | null
  showArchiveButton?: boolean
  isArchived?: boolean
  onArchive?: (leadId: string, leadName: string) => void

  // Optional: custom sort function
  sortFn?: (leads: Lead[]) => Lead[]

  // Optional: show call time badges
  showCallTimeBadge?: boolean

  // Optional: filter tabs (for archived section)
  filterTabs?: FilterTab[]
  getLeadFilterValue?: (lead: Lead) => string

  // Optional: collapsible (for archived sections)
  collapsible?: boolean
  defaultCollapsed?: boolean
}

const colorSchemes = {
  orange: {
    icon: 'text-orange-400',
    title: 'text-orange-400',
    badge: 'bg-gradient-to-r from-orange-400 to-red-500'
  },
  yellow: {
    icon: 'text-yellow-400',
    title: 'text-yellow-400',
    badge: 'bg-gradient-to-r from-yellow-400 to-orange-400'
  },
  purple: {
    icon: 'text-purple-400',
    title: 'text-purple-400',
    badge: 'bg-gradient-to-r from-purple-400 to-pink-500'
  },
  gray: {
    icon: 'text-gray-400',
    title: 'text-gray-400',
    badge: 'bg-gradient-to-r from-gray-400 to-slate-500'
  },
  green: {
    icon: 'text-emerald-400',
    title: 'text-emerald-400',
    badge: 'bg-gradient-to-r from-emerald-400 to-teal-500'
  }
}

export default function UnifiedLeadSection({
  leads,
  icon: Icon,
  title,
  emptyMessage = 'No leads at the moment',
  colorScheme,
  onRefresh,
  expandedLeadId,
  showArchiveButton = true,
  isArchived = false,
  onArchive,
  sortFn,
  showCallTimeBadge = false,
  filterTabs,
  getLeadFilterValue,
  collapsible = false,
  defaultCollapsed = false
}: UnifiedLeadSectionProps) {
  const [visibleCount, setVisibleCount] = useState(3)
  const [loading, setLoading] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(!defaultCollapsed)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

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

      const formatted = date.toLocaleString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      return { formatted, isPast, date }
    } catch {
      return null
    }
  }

  // Apply custom sort if provided
  let processedLeads = sortFn ? sortFn([...leads]) : leads

  // Apply filter if filter tabs exist
  if (filterTabs && getLeadFilterValue && selectedFilter !== 'all') {
    processedLeads = processedLeads.filter(
      lead => getLeadFilterValue(lead) === selectedFilter
    )
  }

  const visibleLeads = processedLeads.slice(0, visibleCount)
  const hasMore = visibleCount < processedLeads.length

  const colors = colorSchemes[colorScheme]

  // Render lead with optional call time badge
  const renderLead = (lead: Lead) => {
    const callTime = showCallTimeBadge ? formatCallTime((lead as any).callBookedTime) : null

    return (
      <div key={lead._id} className="relative">
        {callTime && (
          <div className={`absolute -top-2 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
            callTime.isPast ? 'bg-gray-600/80 text-gray-300' : 'bg-emerald-500/80 text-white'
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {callTime.formatted}
            {callTime.isPast && ' (Past)'}
          </div>
        )}
        <LeadCard
          lead={lead}
          onRefresh={onRefresh}
          expandedByDefault={lead._id === expandedLeadId}
          showArchiveButton={showArchiveButton}
          isArchived={isArchived}
          onArchive={onArchive}
        />
      </div>
    )
  }

  // Fullscreen view
  if (isFullScreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] bg-gradient-coldlava overflow-y-auto">
        <div className="min-h-screen p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sticky top-6 z-10 bg-gradient-coldlava/95 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center gap-3">
              <Icon className={`w-6 h-6 ${colors.icon}`} />
              <h2 className="text-2xl font-bold text-white">{title} ({processedLeads.length})</h2>
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="Exit fullscreen"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filter tabs in fullscreen */}
          {filterTabs && (
            <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/10">
              <div className="flex flex-wrap gap-2">
                {[{ id: 'all', label: 'All', emoji: '📦', color: 'from-gray-400 to-slate-500' }, ...filterTabs].map((tab) => {
                  const isActive = selectedFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSelectedFilter(tab.id)
                        setVisibleCount(3)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                        isActive
                          ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* All leads - no limit */}
          <div className="space-y-4 pb-6">
            {processedLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">{emptyMessage}</p>
              </div>
            ) : (
              processedLeads.map(renderLead)
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Collapsible wrapper (for archived sections)
  if (collapsible) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${colors.icon}`} />
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-gray-400">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="border-t border-white/10 p-6 pt-0 animate-fade-in">
            {renderCompactView()}
          </div>
        )}
      </div>
    )
  }

  // Standard compact view
  function renderCompactView() {
    return (
      <>
        {processedLeads.length === 0 ? (
          <div className="p-8 text-center">
            <Icon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400 text-lg">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            {filterTabs && (
              <div className="mb-4 bg-black/20 p-4 rounded-xl border border-white/10">
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'all', label: 'All', emoji: '📦', color: 'from-gray-400 to-slate-500' }, ...filterTabs].map((tab) => {
                    const isActive = selectedFilter === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setSelectedFilter(tab.id)
                          setVisibleCount(3)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                          isActive
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-lg scale-105`
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Maximize button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsFullScreen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-all"
                title="Open fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
                Full Screen
              </button>
            </div>

            <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-2">
              {visibleLeads.map(renderLead)}
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
                    Load More ({processedLeads.length - visibleCount} remaining)
                  </>
                )}
              </button>
            )}
          </>
        )}
      </>
    )
  }

  return <div className="p-6">{renderCompactView()}</div>
}
