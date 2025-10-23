'use client'

import { useEffect, useState } from 'react'
import LeadsModal from './LeadsModal'

interface DbrStats {
  totalLeads: number
  messagesSent: {
    m1: number
    m2: number
    m3: number
    total: number
  }
  sentiment: {
    positive: number
    negative: number
    neutral: number
    negativeRemoved: number
    unclear: number
  }
  statusBreakdown: {
    hot: number
    positive: number
    negative: number
    removed: number
    sent1: number
    sent2: number
    sent3: number
    converted: number
    scheduled: number
  }
  replyRate: number
}

export default function DbrDashboard() {
  const [stats, setStats] = useState<DbrStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilter, setModalFilter] = useState<{ type: string; label: string }>({ type: '', label: '' })

  const openModal = (filterType: string, filterLabel: string) => {
    setModalFilter({ type: filterType, label: filterLabel })
    setModalOpen(true)
  }

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)

      try {
        const response = await fetch(`/api/dbr-analytics?timeRange=${timeRange}`)
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data')
        }
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching DBR stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [timeRange])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">DBR Campaign Analytics</h1>
        <p className="text-gray-600">Database Recovery Campaign Performance</p>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6 flex gap-2">
        {(['all', 'month', 'week', 'today'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalLeads}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Messages Sent</div>
          <div className="text-3xl font-bold text-blue-600">{stats.messagesSent.total}</div>
          <div className="text-xs text-gray-500 mt-1">
            M1: {stats.messagesSent.m1} | M2: {stats.messagesSent.m2} | M3: {stats.messagesSent.m3}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm font-medium text-gray-600 mb-1">Reply Rate</div>
          <div className="text-3xl font-bold text-green-600">{stats.replyRate.toFixed(1)}%</div>
        </div>

        <div
          onClick={() => openModal('hot', '🔥 Hot Leads')}
          className="bg-white p-6 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all"
        >
          <div className="text-sm font-medium text-gray-600 mb-1">Hot Leads</div>
          <div className="text-3xl font-bold text-orange-600">{stats.statusBreakdown.hot}</div>
          <div className="text-xs text-gray-500 mt-2">Click to view →</div>
        </div>
      </div>

      {/* Sentiment Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sentiment Analysis</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            onClick={() => openModal('sentiment-positive', '🔥 Positive Sentiment')}
            className="text-center p-4 rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
          >
            <div className="text-3xl font-bold text-green-600">{stats.sentiment.positive}</div>
            <div className="text-sm text-gray-600 mt-1">🔥 Positive</div>
          </div>
          <div
            onClick={() => openModal('sentiment-negative', '❌ Negative Sentiment')}
            className="text-center p-4 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
          >
            <div className="text-3xl font-bold text-red-600">{stats.sentiment.negative}</div>
            <div className="text-sm text-gray-600 mt-1">❌ Negative</div>
          </div>
          <div
            onClick={() => openModal('sentiment-neutral', '🤔 Neutral Sentiment')}
            className="text-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="text-3xl font-bold text-gray-600">{stats.sentiment.neutral}</div>
            <div className="text-sm text-gray-600 mt-1">🤔 Neutral</div>
          </div>
          <div
            onClick={() => openModal('sentiment-removed', '🚫 Negative Removed')}
            className="text-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="text-3xl font-bold text-gray-800">{stats.sentiment.negativeRemoved}</div>
            <div className="text-sm text-gray-600 mt-1">🚫 Removed</div>
          </div>
          <div
            onClick={() => openModal('sentiment-unclear', '❓ Unclear Sentiment')}
            className="text-center p-4 rounded-lg hover:bg-yellow-50 cursor-pointer transition-colors"
          >
            <div className="text-3xl font-bold text-yellow-600">{stats.sentiment.unclear}</div>
            <div className="text-sm text-gray-600 mt-1">❓ Unclear</div>
          </div>
        </div>

        {/* Sentiment Chart */}
        <div className="mt-6">
          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden flex">
            {stats.sentiment.positive > 0 && (
              <div
                className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.sentiment.positive / stats.totalLeads) * 100}%`,
                }}
              >
                {((stats.sentiment.positive / stats.totalLeads) * 100).toFixed(0)}%
              </div>
            )}
            {stats.sentiment.negative > 0 && (
              <div
                className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.sentiment.negative / stats.totalLeads) * 100}%`,
                }}
              >
                {((stats.sentiment.negative / stats.totalLeads) * 100).toFixed(0)}%
              </div>
            )}
            {stats.sentiment.neutral > 0 && (
              <div
                className="bg-gray-400 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.sentiment.neutral / stats.totalLeads) * 100}%`,
                }}
              >
                {((stats.sentiment.neutral / stats.totalLeads) * 100).toFixed(0)}%
              </div>
            )}
            {stats.sentiment.negativeRemoved > 0 && (
              <div
                className="bg-gray-700 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.sentiment.negativeRemoved / stats.totalLeads) * 100}%`,
                }}
              >
                {((stats.sentiment.negativeRemoved / stats.totalLeads) * 100).toFixed(0)}%
              </div>
            )}
            {stats.sentiment.unclear > 0 && (
              <div
                className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.sentiment.unclear / stats.totalLeads) * 100}%`,
                }}
              >
                {((stats.sentiment.unclear / stats.totalLeads) * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Status Breakdown</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          <div
            onClick={() => openModal('hot', '🔥 HOT Leads')}
            className="text-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-orange-600">{stats.statusBreakdown.hot}</div>
            <div className="text-sm text-gray-600 mt-1">🔥 HOT</div>
          </div>
          <div
            onClick={() => openModal('positive', '✅ Positive Leads')}
            className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-green-600">{stats.statusBreakdown.positive}</div>
            <div className="text-sm text-gray-600 mt-1">✅ Positive</div>
          </div>
          <div
            onClick={() => openModal('sent1', '📤 Sent Message 1')}
            className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-blue-600">{stats.statusBreakdown.sent1}</div>
            <div className="text-sm text-gray-600 mt-1">📤 Sent 1</div>
          </div>
          <div
            onClick={() => openModal('sent2', '📤 Sent Message 2')}
            className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-blue-600">{stats.statusBreakdown.sent2}</div>
            <div className="text-sm text-gray-600 mt-1">📤 Sent 2</div>
          </div>
          <div
            onClick={() => openModal('sent3', '📤 Sent Message 3')}
            className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-blue-600">{stats.statusBreakdown.sent3}</div>
            <div className="text-sm text-gray-600 mt-1">📤 Sent 3</div>
          </div>
          <div
            onClick={() => openModal('scheduled', '📅 Scheduled Leads')}
            className="text-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-purple-600">{stats.statusBreakdown.scheduled}</div>
            <div className="text-sm text-gray-600 mt-1">📅 Scheduled</div>
          </div>
          <div
            onClick={() => openModal('converted', '✨ Converted Leads')}
            className="text-center p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-emerald-600">{stats.statusBreakdown.converted}</div>
            <div className="text-sm text-gray-600 mt-1">✨ Converted</div>
          </div>
          <div
            onClick={() => openModal('negative', '❌ Negative Leads')}
            className="text-center p-4 bg-red-50 rounded-lg hover:bg-red-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-red-600">{stats.statusBreakdown.negative}</div>
            <div className="text-sm text-gray-600 mt-1">❌ Negative</div>
          </div>
          <div
            onClick={() => openModal('removed', '🚫 Removed Leads')}
            className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="text-2xl font-bold text-gray-600">{stats.statusBreakdown.removed}</div>
            <div className="text-sm text-gray-600 mt-1">🚫 Removed</div>
          </div>
        </div>
      </div>

      {/* Leads Modal */}
      <LeadsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filterType={modalFilter.type}
        filterLabel={modalFilter.label}
        timeRange={timeRange}
      />
    </div>
  )
}
