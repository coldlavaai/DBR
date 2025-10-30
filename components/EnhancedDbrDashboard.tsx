'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, MessageSquare, TrendingUp, Flame, Clock, Target, RefreshCw, Calendar, Archive } from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import MetricCard from './MetricCard'
import SearchAndExport from './SearchAndExport'
import LeadsModal from './LeadsModal'
import UnifiedLeadSection from './UnifiedLeadSection'
import RecentActivity from './RecentActivity'
import LeadStatusBuckets from './LeadStatusBuckets'
import LeadDetailModal from './LeadDetailModal'
import SectionHeader from './SectionHeader'
import { Lead } from './LeadCard'

interface EnhancedStats {
  totalLeads: number
  messagesSent: { m1: number; m2: number; m3: number; total: number; manual: number; ai: number }
  sentiment: { positive: number; negative: number; neutral: number; negativeRemoved: number; unclear: number; unsure: number }
  statusBreakdown: { ready: number; sent1: number; sent2: number; sent3: number; cold: number; neutral: number; warm: number; hot: number; callBooked: number; converted: number; installed: number; removed: number }
  replyRate: number
  repliedLeads: number
  trends?: { totalLeads: number; messagesSent: number; replyRate: number; hotLeads: number; converted: number; callBooked: number }
  dailyData?: any[]
  funnelData?: any
  avgResponseTime?: number
  lastUpdated?: string
}

export default function EnhancedDbrDashboard() {
  const [stats, setStats] = useState<EnhancedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilter, setModalFilter] = useState<{ type: string; label: string }>({ type: '', label: '' })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [hotLeads, setHotLeads] = useState<any[]>([])
  const [warmLeads, setWarmLeads] = useState<any[]>([])
  const [callBookedLeads, setCallBookedLeads] = useState<any[]>([])
  const [allBookedCalls, setAllBookedCalls] = useState<any[]>([])
  const [archivedLeads, setArchivedLeads] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [expandedLeadFromActivity, setExpandedLeadFromActivity] = useState<string | null>(null)
  const [leadDetailModalOpen, setLeadDetailModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [upcomingCallsCount, setUpcomingCallsCount] = useState(0)
  const [totalCallsBooked, setTotalCallsBooked] = useState(0)

  // Collapsible section states
  const [sectionsExpanded, setSectionsExpanded] = useState({
    hotLeads: true,
    warmLeads: true,
    upcomingCalls: true,
    allBookedCalls: true,
    recentActivity: true,
    leadStatusBuckets: true,
    sentimentAnalysis: true,
    statusBreakdown: true,
    archivedLeads: true,
  })

  // Section ordering state
  const defaultSectionOrder = [
    'hotLeads',
    'warmLeads',
    'upcomingCalls',
    'allBookedCalls',
    'recentActivity',
    'leadStatusBuckets',
    'sentimentAnalysis',
    'statusBreakdown',
    'archivedLeads',
  ]
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultSectionOrder)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)
  const [dragOverSection, setDragOverSection] = useState<string | null>(null)

  // Load section order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('dbr-section-order')
    if (savedOrder) {
      try {
        setSectionOrder(JSON.parse(savedOrder))
      } catch (e) {
        console.error('Failed to parse saved section order:', e)
      }
    }
  }, [])

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Drag and drop handlers
  const handleDragStart = (sectionId: string) => (e: React.DragEvent) => {
    setDraggedSection(sectionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (sectionId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSection(sectionId)
  }

  const handleDragLeave = () => {
    setDragOverSection(null)
  }

  const handleDrop = (targetSectionId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverSection(null)

    if (!draggedSection || draggedSection === targetSectionId) return

    const newOrder = [...sectionOrder]
    const draggedIndex = newOrder.indexOf(draggedSection)
    const targetIndex = newOrder.indexOf(targetSectionId)

    // Remove dragged item and insert at target position
    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedSection)

    setSectionOrder(newOrder)
    localStorage.setItem('dbr-section-order', JSON.stringify(newOrder))
  }

  const handleDragEnd = () => {
    setDraggedSection(null)
    setDragOverSection(null)
  }

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // UNIFIED ENDPOINT - One API call instead of 7!
      const cacheBuster = `_=${Date.now()}`
      const response = await fetch(`/api/dashboard?timeRange=${timeRange}&${cacheBuster}`, {
        cache: 'no-store'
      })

      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const data = await response.json()

      // Set all state from single response
      setStats(data.stats)
      setHotLeads(data.hotLeads || [])
      setWarmLeads(data.warmLeads || [])
      setCallBookedLeads(data.callBookedLeads || [])
      setAllBookedCalls(data.allBookedCalls || [])
      setArchivedLeads(data.archivedLeads || [])
      setRecentActivity(data.recentActivity || [])
      setUpcomingCallsCount(data.upcomingCallsCount || 0)
      setTotalCallsBooked(data.totalCallsBooked || 0)
    } catch (error) {
      console.error('Error fetching DBR stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  // Sync from Google Sheets
  const syncFromSheets = useCallback(async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync-sheets', {
        method: 'GET',
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to sync from Google Sheets')
      }

      const result = await response.json()
      console.log('Sync complete:', result)

      // Refresh dashboard data after sync
      await fetchStats(true)
    } catch (error) {
      console.error('Error syncing from Google Sheets:', error)
      alert('Failed to sync from Google Sheets. Please try again.')
    } finally {
      setSyncing(false)
    }
  }, [fetchStats])

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Auto-refresh every 30 seconds for near real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStats(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchStats])

  const openModal = (filterType: string, filterLabel: string) => {
    setModalFilter({ type: filterType, label: filterLabel })
    setModalOpen(true)
  }

  const handleExport = () => {
    // Export logic will be implemented
    console.log('Exporting data...')
    alert('Export feature coming soon!')
  }

  const handleActivityClick = (leadId: string, leadName: string) => {
    setSelectedLeadId(leadId)
    setLeadDetailModalOpen(true)
  }

  const handleSearchResultClick = (leadId: string, contactStatus: string) => {
    // Determine which section to navigate to based on status
    let sectionId = ''
    let sectionKey: keyof typeof sectionsExpanded = 'hotLeads'

    if (contactStatus === 'HOT') {
      sectionId = 'hot-leads-section'
      sectionKey = 'hotLeads'
    } else if (contactStatus === 'WARM') {
      sectionId = 'warm-leads-section'
      sectionKey = 'warmLeads'
    } else if (contactStatus === 'CALL_BOOKED') {
      // Check if it's upcoming or past - for now, go to all booked calls
      sectionId = 'all-booked-calls-section'
      sectionKey = 'allBookedCalls'
    } else if (contactStatus === 'CONVERTED' || contactStatus === 'INSTALLED') {
      // These might be in status buckets
      sectionId = 'lead-status-buckets-section'
      sectionKey = 'leadStatusBuckets'
    } else {
      // Default to status buckets for other statuses
      sectionId = 'lead-status-buckets-section'
      sectionKey = 'leadStatusBuckets'
    }

    // Expand the section if collapsed
    setSectionsExpanded(prev => ({ ...prev, [sectionKey]: true }))

    // Open the lead detail modal directly - much better UX
    setSelectedLeadId(leadId)
    setLeadDetailModalOpen(true)

    // Also scroll to the section after a brief delay
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // Render section based on ID
  const renderSection = (sectionId: string) => {
    // Sort function for call booked leads (upcoming first, then past)
    const sortCallBookedLeads = (leads: Lead[]) => {
      return [...leads].sort((a, b) => {
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
    }

    const sectionConfig = {
      hotLeads: {
        id: 'hot-leads-section',
        title: 'Hot Leads',
        count: hotLeads.length,
        color: 'border-orange-500/50 hover:border-orange-400',
        content: <UnifiedLeadSection
          leads={hotLeads}
          icon={Flame}
          title="Hot Leads"
          emptyMessage="No hot leads at the moment"
          colorScheme="orange"
          onRefresh={() => fetchStats(true)}
          expandedLeadId={expandedLeadFromActivity}
        />
      },
      warmLeads: {
        id: 'warm-leads-section',
        title: 'Warm Leads',
        count: warmLeads.length,
        color: 'border-yellow-500/50 hover:border-yellow-400',
        content: <UnifiedLeadSection
          leads={warmLeads}
          icon={TrendingUp}
          title="Warm Leads"
          emptyMessage="No warm leads at the moment"
          colorScheme="yellow"
          onRefresh={() => fetchStats(true)}
          expandedLeadId={expandedLeadFromActivity}
        />
      },
      upcomingCalls: {
        id: 'upcoming-calls-section',
        title: 'Upcoming Calls',
        count: callBookedLeads.length,
        color: 'border-purple-500/50 hover:border-purple-400',
        content: <UnifiedLeadSection
          leads={callBookedLeads}
          icon={Calendar}
          title="Upcoming Calls"
          emptyMessage="No upcoming calls"
          colorScheme="purple"
          onRefresh={() => fetchStats(true)}
          expandedLeadId={expandedLeadFromActivity}
          sortFn={sortCallBookedLeads}
          showCallTimeBadge={true}
        />
      },
      allBookedCalls: {
        id: 'all-booked-calls-section',
        title: 'All Booked Calls',
        count: allBookedCalls.length,
        color: 'border-indigo-500/50 hover:border-indigo-400',
        content: <UnifiedLeadSection
          leads={allBookedCalls}
          icon={Calendar}
          title="Booked Calls"
          emptyMessage="No calls booked"
          colorScheme="purple"
          onRefresh={() => fetchStats(true)}
          expandedLeadId={expandedLeadFromActivity}
          showCallTimeBadge={true}
        />
      },
      recentActivity: {
        id: 'recent-activity-section',
        title: 'Recent Activity',
        count: recentActivity.length,
        color: 'border-cyan-500/50 hover:border-cyan-400',
        content: <RecentActivity activities={recentActivity} onActivityClick={handleActivityClick} />
      },
      leadStatusBuckets: {
        id: 'lead-status-buckets-section',
        title: 'Lead Status Buckets',
        color: 'border-pink-500/50 hover:border-pink-400',
        content: <LeadStatusBuckets onRefresh={() => fetchStats(true)} />
      },
      sentimentAnalysis: {
        id: 'sentiment-analysis-section',
        title: 'Sentiment Analysis',
        color: 'border-green-500/50 hover:border-green-400',
        content: (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              {[
                { label: 'Positive', value: stats?.sentiment.positive || 0, color: 'from-green-400 to-emerald-500', filter: 'sentiment-positive' },
                { label: 'Negative', value: stats?.sentiment.negative || 0, color: 'from-red-400 to-rose-500', filter: 'sentiment-negative' },
                { label: 'Neutral', value: stats?.sentiment.neutral || 0, color: 'from-gray-400 to-slate-500', filter: 'sentiment-neutral' },
                { label: 'Unsure', value: stats?.sentiment.unsure || 0, color: 'from-yellow-400 to-amber-500', filter: 'sentiment-unsure' },
                { label: 'Unclear', value: stats?.sentiment.unclear || 0, color: 'from-orange-400 to-red-400', filter: 'sentiment-unclear' },
                { label: 'Removed', value: stats?.sentiment.negativeRemoved || 0, color: 'from-gray-600 to-gray-700', filter: 'sentiment-removed' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => openModal(item.filter, `${item.label} Sentiment`)}
                  className="text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-105 group"
                >
                  <div className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent group-hover:scale-110 transition-transform`}>
                    {item.value}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">{item.label}</div>
                </button>
              ))}
            </div>
            <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden flex">
              {Object.entries(stats?.sentiment || {}).map(([key, value]) => {
                if (value === 0) return null
                const colors: any = {
                  positive: 'bg-green-500',
                  negative: 'bg-red-500',
                  neutral: 'bg-gray-400',
                  negativeRemoved: 'bg-gray-700',
                  unclear: 'bg-yellow-500',
                }
                const percentage = (value / (stats?.totalLeads || 1)) * 100
                return (
                  <div
                    key={key}
                    className={`${colors[key]} h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage > 5 ? `${percentage.toFixed(0)}%` : ''}
                  </div>
                )
              })}
            </div>
          </div>
        )
      },
      statusBreakdown: {
        id: 'status-breakdown-section',
        title: 'Status Breakdown',
        color: 'border-blue-500/50 hover:border-blue-400',
        content: (
          <div className="p-6">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: 'Ready', value: stats?.statusBreakdown.ready || 0, gradient: 'from-slate-400 to-gray-500', filter: 'ready' },
                { label: 'Sent 1', value: stats?.statusBreakdown.sent1 || 0, gradient: 'from-blue-400 to-cyan-500', filter: 'sent1' },
                { label: 'Sent 2', value: stats?.statusBreakdown.sent2 || 0, gradient: 'from-blue-500 to-indigo-500', filter: 'sent2' },
                { label: 'Sent 3', value: stats?.statusBreakdown.sent3 || 0, gradient: 'from-indigo-500 to-purple-500', filter: 'sent3' },
                { label: 'COLD', value: stats?.statusBreakdown.cold || 0, gradient: 'from-blue-600 to-cyan-700', filter: 'cold' },
                { label: 'NEUTRAL', value: stats?.statusBreakdown.neutral || 0, gradient: 'from-gray-400 to-slate-500', filter: 'neutral' },
                { label: 'WARM', value: stats?.statusBreakdown.warm || 0, gradient: 'from-yellow-400 to-orange-400', filter: 'warm' },
                { label: 'HOT', value: stats?.statusBreakdown.hot || 0, gradient: 'from-orange-400 to-red-500', filter: 'hot' },
                { label: 'Call Booked', value: stats?.statusBreakdown.callBooked || 0, gradient: 'from-purple-400 to-pink-500', filter: 'callBooked' },
                { label: 'Converted', value: stats?.statusBreakdown.converted || 0, gradient: 'from-emerald-400 to-teal-500', filter: 'converted' },
                { label: 'Installed', value: stats?.statusBreakdown.installed || 0, gradient: 'from-green-500 to-emerald-600', filter: 'installed' },
                { label: 'Removed', value: stats?.statusBreakdown.removed || 0, gradient: 'from-red-400 to-rose-500', filter: 'removed' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => openModal(item.filter, `${item.label} Leads`)}
                  className="text-center p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-105 group"
                >
                  <div className={`text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform`}>
                    {item.value}
                  </div>
                  <div className="text-xs text-gray-300 mt-1">{item.label}</div>
                </button>
              ))}
            </div>
          </div>
        )
      },
      archivedLeads: {
        id: 'archived-leads-section',
        title: 'Archive',
        count: archivedLeads.length,
        color: 'border-gray-500/50 hover:border-gray-400',
        content: <UnifiedLeadSection
          leads={archivedLeads}
          icon={Archive}
          title="Archive"
          emptyMessage="No archived leads"
          colorScheme="gray"
          onRefresh={() => fetchStats(true)}
          expandedLeadId={expandedLeadFromActivity}
          isArchived={true}
          collapsible={true}
          defaultCollapsed={false}
          filterTabs={[
            { id: 'HOT', label: 'Hot', emoji: '🔥', color: 'from-orange-400 to-red-500' },
            { id: 'WARM', label: 'Warm', emoji: '🟠', color: 'from-yellow-400 to-orange-400' },
            { id: 'NEUTRAL', label: 'Neutral', emoji: '🔵', color: 'from-gray-400 to-slate-500' },
            { id: 'COLD', label: 'Cold', emoji: '🧊', color: 'from-blue-600 to-cyan-700' },
            { id: 'POSITIVE', label: 'Positive', emoji: '✅', color: 'from-emerald-400 to-teal-500' },
            { id: 'CALL_BOOKED', label: 'Call Booked', emoji: '📞', color: 'from-purple-400 to-pink-500' },
            { id: 'CONVERTED', label: 'Converted', emoji: '✨', color: 'from-emerald-400 to-teal-500' },
            { id: 'INSTALLED', label: 'Installed', emoji: '✅', color: 'from-green-500 to-emerald-600' },
            { id: 'NEGATIVE', label: 'Negative', emoji: '❌', color: 'from-red-400 to-rose-500' },
            { id: 'REMOVED', label: 'Removed', emoji: '🚫', color: 'from-red-400 to-rose-500' },
          ]}
          getLeadFilterValue={(lead) => lead.contactStatus}
        />
      },
    }

    const section = sectionConfig[sectionId as keyof typeof sectionConfig]
    if (!section) return null

    const isExpanded = sectionsExpanded[sectionId as keyof typeof sectionsExpanded]

    const isDragging = draggedSection === sectionId
    const isDragOver = dragOverSection === sectionId && draggedSection !== sectionId

    const sectionColor = 'color' in section ? section.color : 'border-white/20 hover:border-coldlava-cyan/50'

    return (
      <div
        key={sectionId}
        id={section.id}
        onDragOver={handleDragOver(sectionId)}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop(sectionId)}
        className={`
          mb-4 rounded-xl overflow-hidden
          bg-gradient-to-r from-white/10 to-white/5
          backdrop-blur-sm border-2 transition-all duration-300
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDragOver ? 'border-coldlava-cyan bg-coldlava-cyan/10' : sectionColor}
        `}
      >
        <SectionHeader
          title={section.title}
          isExpanded={isExpanded}
          onToggle={() => toggleSection(sectionId as keyof typeof sectionsExpanded)}
          count={'count' in section ? section.count : undefined}
          draggable={true}
          onDragStart={handleDragStart(sectionId)}
          onDragEnd={handleDragEnd}
        />
        {isExpanded && (
          <div className="border-t border-white/10">
            {section.content}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="animated-bg" />
        <div className="geometric-patterns" />
        <div className="flex items-center justify-center h-screen relative z-10">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-coldlava-cyan border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="w-20 h-20 border-4 border-coldlava-pink border-b-transparent rounded-full animate-spin mx-auto absolute top-0 left-1/2 -translate-x-1/2" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-white text-xl font-bold mt-6 bg-gradient-to-r from-coldlava-cyan via-coldlava-pink to-coldlava-purple bg-clip-text text-transparent animate-pulse">
              Loading Cold Lava Analytics...
            </p>
            <p className="text-gray-400 text-sm mt-2 font-inter">Preparing your premium dashboard</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="min-h-screen relative">
      {/* Cold Lava Animated Background */}
      <div className="animated-bg" />
      <div className="geometric-patterns" />

      {/* Header */}
      <DashboardHeader
        lastUpdated={stats.lastUpdated}
      />

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 animate-fade-in">
        {/* Time Range Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4">
          <span className="text-white font-semibold text-sm sm:text-base whitespace-nowrap">Time Range:</span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-1 w-full sm:w-auto">
            {(['all', 'month', 'week', 'today'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-xs sm:text-sm md:text-base whitespace-nowrap ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-sm active:scale-95'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Sync from Sheets button */}
          <button
            onClick={syncFromSheets}
            disabled={syncing}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-300 text-xs sm:text-sm whitespace-nowrap shadow-lg"
            title="Sync latest data from Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Sheets'}</span>
            <span className="sm:hidden">{syncing ? 'Syncing' : 'Sync'}</span>
          </button>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs sm:text-sm text-gray-300 whitespace-nowrap">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${
                autoRefresh ? 'bg-coldlava-cyan' : 'bg-white/20'
              }`}
              aria-label="Toggle auto-refresh"
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                  autoRefresh ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Search and Export */}
        <SearchAndExport
          totalRecords={stats.totalLeads}
          onExport={handleExport}
          onResultClick={handleSearchResultClick}
        />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <MetricCard
            title="Total Leads"
            value={stats.totalLeads}
            trend={stats.trends?.totalLeads}
            subtitle="Database contacts"
            icon={Users}
            color="blue"
          />

          <MetricCard
            title="Messages Sent"
            value={stats.messagesSent.total}
            trend={stats.trends?.messagesSent}
            subtitle={`M1: ${stats.messagesSent.m1} M2: ${stats.messagesSent.m2} M3: ${stats.messagesSent.m3}\nAI: ${stats.messagesSent.ai} | Manual: ${stats.messagesSent.manual}`}
            icon={MessageSquare}
            color="purple"
          />

          <MetricCard
            title="Reply Rate"
            value={`${stats.replyRate.toFixed(1)}%`}
            trend={stats.trends?.replyRate}
            subtitle={`${stats.repliedLeads} replies`}
            icon={TrendingUp}
            color="green"
          />

          <MetricCard
            title="Hot Leads"
            value={stats.statusBreakdown.hot}
            trend={stats.trends?.hotLeads}
            subtitle="Ready for follow-up"
            icon={Flame}
            color="orange"
            onClick={() => openModal('hot', '🔥 Hot Leads')}
          />

          <MetricCard
            title="Avg Response"
            value={`${stats.avgResponseTime || 0}h`}
            subtitle="Time to reply"
            icon={Clock}
            color="purple"
          />

          <MetricCard
            title="Total Calls Booked"
            value={totalCallsBooked}
            trend={stats.trends?.callBooked}
            subtitle="Running total"
            icon={Target}
            color="green"
            onClick={() => openModal('callBooked', '📞 Calls Booked')}
          />

          <MetricCard
            title="Upcoming Calls"
            value={upcomingCallsCount}
            subtitle="Future scheduled"
            icon={Calendar}
            color="blue"
          />
        </div>

        {/* Dynamic Sections - Draggable & Reorderable */}
        {sectionOrder.map((sectionId) => renderSection(sectionId))}
      </div>

      {/* Leads Modal */}
      <LeadsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filterType={modalFilter.type}
        filterLabel={modalFilter.label}
        timeRange={timeRange}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        isOpen={leadDetailModalOpen}
        onClose={() => {
          setLeadDetailModalOpen(false)
          setSelectedLeadId(null)
        }}
        onRefresh={() => fetchStats(true)}
      />

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-8 py-6 mt-12 border-t border-white/10">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <p>© 2025 Cold Lava AI - Database Recovery Analytics Platform</p>
          <div className="flex items-center gap-4">
            <a href="https://coldlava.ai" target="_blank" rel="noopener noreferrer" className="hover:text-coldlava-cyan transition-colors">
              coldlava.ai
            </a>
            <span>|</span>
            <a href="mailto:oliver@otdm.net" className="hover:text-coldlava-cyan transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
