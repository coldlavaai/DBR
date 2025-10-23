'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, MessageSquare, TrendingUp, Flame, Clock, Target } from 'lucide-react'
import DashboardHeader from './DashboardHeader'
import MetricCard from './MetricCard'
import ConversionFunnel from './ConversionFunnel'
import SearchAndExport from './SearchAndExport'
import LeadsModal from './LeadsModal'
import HotLeadsSection from './HotLeadsSection'
import RecentActivity from './RecentActivity'

interface EnhancedStats {
  totalLeads: number
  messagesSent: { m1: number; m2: number; m3: number; total: number }
  sentiment: { positive: number; negative: number; neutral: number; negativeRemoved: number; unclear: number }
  statusBreakdown: { hot: number; positive: number; negative: number; removed: number; sent1: number; sent2: number; sent3: number; converted: number; scheduled: number }
  replyRate: number
  repliedLeads: number
  trends?: { totalLeads: number; messagesSent: number; replyRate: number; hotLeads: number; converted: number }
  dailyData?: any[]
  funnelData?: any
  avgResponseTime?: number
  lastUpdated?: string
}

export default function EnhancedDbrDashboard() {
  const [stats, setStats] = useState<EnhancedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilter, setModalFilter] = useState<{ type: string; label: string }>({ type: '', label: '' })
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [hotLeads, setHotLeads] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [statsResponse, hotLeadsResponse] = await Promise.all([
        fetch(`/api/dbr-analytics?timeRange=${timeRange}`),
        fetch('/api/hot-leads')
      ])

      if (!statsResponse.ok) throw new Error('Failed to fetch analytics data')
      const data = await statsResponse.json()
      setStats(data)

      if (hotLeadsResponse.ok) {
        const hotData = await hotLeadsResponse.json()
        setHotLeads(hotData.leads || [])

        // Generate recent activity from hot leads
        const activities = hotData.leads
          .filter((lead: any) => lead.replyReceived)
          .slice(0, 5)
          .map((lead: any) => ({
            id: lead._id,
            type: 'reply' as const,
            leadName: `${lead.firstName} ${lead.secondName}`,
            message: lead.latestLeadReply || 'No message preview',
            timestamp: lead.replyReceived,
            sentiment: lead.leadSentiment
          }))
        setRecentActivity(activities)
      }
    } catch (error) {
      console.error('Error fetching DBR stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeRange])

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Auto-refresh every 2 minutes (matches cron interval)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchStats(true)
    }, 120000)

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
        {/* Time Range Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-white font-semibold">Time Range:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {(['all', 'month', 'week', 'today'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 sm:px-6 py-2 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white shadow-lg scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                autoRefresh ? 'bg-coldlava-cyan' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                  autoRefresh ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Search and Export */}
        <SearchAndExport
          totalRecords={stats.totalLeads}
          onExport={handleExport}
        />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            subtitle={`M1: ${stats.messagesSent.m1} | M2: ${stats.messagesSent.m2} | M3: ${stats.messagesSent.m3}`}
            icon={MessageSquare}
            color="purple"
          />

          <MetricCard
            title="Reply Rate"
            value={`${stats.replyRate.toFixed(1)}%`}
            trend={stats.trends?.replyRate}
            subtitle={`${stats.repliedLeads} replies received`}
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
        </div>

        {/* HOT LEADS SECTION - Prominent & Interactive */}
        <HotLeadsSection leads={hotLeads} />

        {/* Recent Activity & Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivity activities={recentActivity} />
          </div>

          <div className="space-y-6">
            <MetricCard
              title="Avg Response Time"
              value={`${stats.avgResponseTime || 0}h`}
              subtitle="Time to first reply"
              icon={Clock}
              color="purple"
            />

            <MetricCard
              title="Converted"
              value={stats.statusBreakdown.converted}
              trend={stats.trends?.converted}
              subtitle="Successful conversions"
              icon={Target}
              color="green"
              onClick={() => openModal('converted', '✨ Converted Leads')}
            />
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-coldlava-cyan to-coldlava-purple rounded-full" />
            Sentiment Analysis
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Positive', value: stats.sentiment.positive, color: 'from-green-400 to-emerald-500', filter: 'sentiment-positive' },
              { label: 'Negative', value: stats.sentiment.negative, color: 'from-red-400 to-rose-500', filter: 'sentiment-negative' },
              { label: 'Neutral', value: stats.sentiment.neutral, color: 'from-gray-400 to-slate-500', filter: 'sentiment-neutral' },
              { label: 'Removed', value: stats.sentiment.negativeRemoved, color: 'from-gray-600 to-gray-700', filter: 'sentiment-removed' },
              { label: 'Unclear', value: stats.sentiment.unclear, color: 'from-yellow-400 to-orange-500', filter: 'sentiment-unclear' },
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

          {/* Sentiment bar */}
          <div className="relative h-8 bg-white/10 rounded-lg overflow-hidden flex">
            {Object.entries(stats.sentiment).map(([key, value]) => {
              if (value === 0) return null
              const colors: any = {
                positive: 'bg-green-500',
                negative: 'bg-red-500',
                neutral: 'bg-gray-400',
                negativeRemoved: 'bg-gray-700',
                unclear: 'bg-yellow-500',
              }
              const percentage = (value / stats.totalLeads) * 100
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

        {/* Status Breakdown */}
        <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-coldlava-pink to-coldlava-gold rounded-full" />
            Contact Status Breakdown
          </h3>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { label: 'HOT', value: stats.statusBreakdown.hot, gradient: 'from-orange-400 to-red-500', filter: 'hot' },
              { label: 'Positive', value: stats.statusBreakdown.positive, gradient: 'from-green-400 to-emerald-500', filter: 'positive' },
              { label: 'Sent 1', value: stats.statusBreakdown.sent1, gradient: 'from-blue-400 to-cyan-500', filter: 'sent1' },
              { label: 'Sent 2', value: stats.statusBreakdown.sent2, gradient: 'from-blue-500 to-indigo-500', filter: 'sent2' },
              { label: 'Sent 3', value: stats.statusBreakdown.sent3, gradient: 'from-indigo-500 to-purple-500', filter: 'sent3' },
              { label: 'Scheduled', value: stats.statusBreakdown.scheduled, gradient: 'from-purple-400 to-pink-500', filter: 'scheduled' },
              { label: 'Converted', value: stats.statusBreakdown.converted, gradient: 'from-emerald-400 to-teal-500', filter: 'converted' },
              { label: 'Negative', value: stats.statusBreakdown.negative, gradient: 'from-red-400 to-rose-500', filter: 'negative' },
              { label: 'Removed', value: stats.statusBreakdown.removed, gradient: 'from-gray-400 to-slate-500', filter: 'removed' },
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

        {/* Conversion Funnel - Moved to Bottom */}
        {stats.funnelData && <ConversionFunnel data={stats.funnelData} />}
      </div>

      {/* Leads Modal */}
      <LeadsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filterType={modalFilter.type}
        filterLabel={modalFilter.label}
        timeRange={timeRange}
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
