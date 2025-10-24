'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface LeadStatusBucketsProps {
  onRefresh?: () => void
}

interface BucketState {
  leads: Lead[]
  loading: boolean
  hasMore: boolean
  limit: number
}

export default function LeadStatusBuckets({ onRefresh }: LeadStatusBucketsProps) {
  const [buckets, setBuckets] = useState<Record<string, BucketState>>({
    POSITIVE: { leads: [], loading: false, hasMore: true, limit: 5 },
    NEGATIVE: { leads: [], loading: false, hasMore: true, limit: 5 },
    CONVERTED: { leads: [], loading: false, hasMore: true, limit: 5 },
    REMOVED: { leads: [], loading: false, hasMore: true, limit: 5 },
  })

  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({
    POSITIVE: false,
    NEGATIVE: false,
    CONVERTED: false,
    REMOVED: false,
  })

  const bucketConfig = {
    POSITIVE: {
      title: '🔥 Positive Leads',
      description: 'Engaged and interested contacts',
      gradient: 'from-green-400 to-emerald-500',
      statuses: ['POSITIVE']
    },
    NEGATIVE: {
      title: '❌ Negative Leads',
      description: 'Not interested or declined',
      gradient: 'from-red-400 to-rose-500',
      statuses: ['NEGATIVE']
    },
    CONVERTED: {
      title: '✨ Converted / Won',
      description: 'Successfully converted and installed',
      gradient: 'from-emerald-400 to-teal-500',
      statuses: ['CONVERTED', 'WON']
    },
    REMOVED: {
      title: '🚫 Removed Leads',
      description: 'Archived or removed from campaign',
      gradient: 'from-gray-400 to-slate-500',
      statuses: ['REMOVED']
    },
  }

  const fetchBucketLeads = async (bucketKey: string, loadMore = false) => {
    const bucket = buckets[bucketKey]
    const config = bucketConfig[bucketKey as keyof typeof bucketConfig]

    setBuckets(prev => ({
      ...prev,
      [bucketKey]: { ...prev[bucketKey], loading: true }
    }))

    try {
      const newLimit = loadMore ? bucket.limit + 5 : bucket.limit
      const statusQuery = config.statuses.join(',')

      const response = await fetch(`/api/leads-by-status?statuses=${statusQuery}&limit=${newLimit}`)

      if (!response.ok) throw new Error('Failed to fetch leads')

      const data = await response.json()

      setBuckets(prev => ({
        ...prev,
        [bucketKey]: {
          ...prev[bucketKey],
          leads: data.leads || [],
          loading: false,
          hasMore: data.hasMore || false,
          limit: newLimit
        }
      }))
    } catch (error) {
      console.error(`Error fetching ${bucketKey} leads:`, error)
      setBuckets(prev => ({
        ...prev,
        [bucketKey]: { ...prev[bucketKey], loading: false }
      }))
    }
  }

  const toggleBucket = (bucketKey: string) => {
    const isExpanding = !expandedBuckets[bucketKey]

    setExpandedBuckets(prev => ({
      ...prev,
      [bucketKey]: isExpanding
    }))

    // Fetch leads when expanding for the first time
    if (isExpanding && buckets[bucketKey].leads.length === 0) {
      fetchBucketLeads(bucketKey)
    }
  }

  const loadMore = (bucketKey: string) => {
    fetchBucketLeads(bucketKey, true)
  }

  const handleLeadUpdate = () => {
    // Refresh all expanded buckets
    Object.keys(expandedBuckets).forEach(key => {
      if (expandedBuckets[key]) {
        fetchBucketLeads(key)
      }
    })

    // Also call parent refresh if provided
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-coldlava-pink to-coldlava-gold rounded-full" />
            Lead Status Buckets
          </h3>
          <p className="text-sm text-gray-400 mt-1">Click to expand and view leads by status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(bucketConfig) as Array<keyof typeof bucketConfig>).map((bucketKey) => {
          const config = bucketConfig[bucketKey]
          const bucket = buckets[bucketKey]
          const isExpanded = expandedBuckets[bucketKey]

          return (
            <div
              key={bucketKey}
              className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:border-white/20"
            >
              {/* Bucket Header */}
              <button
                onClick={() => toggleBucket(bucketKey)}
                className="w-full p-5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`text-lg font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mb-1`}>
                      {config.title}
                    </h4>
                    <p className="text-sm text-gray-400">{config.description}</p>
                    {bucket.leads.length > 0 && (
                      <p className="text-xs text-coldlava-cyan mt-1">
                        {bucket.leads.length} lead{bucket.leads.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-coldlava-cyan" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Bucket Content */}
              {isExpanded && (
                <div className="p-5 pt-0 space-y-3 animate-fade-in">
                  {bucket.loading && bucket.leads.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-coldlava-cyan animate-spin" />
                      <span className="ml-3 text-gray-400">Loading leads...</span>
                    </div>
                  ) : bucket.leads.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No {bucketKey.toLowerCase()} leads found</p>
                    </div>
                  ) : (
                    <>
                      {bucket.leads.map(lead => (
                        <LeadCard
                          key={lead._id}
                          lead={lead}
                          onRefresh={handleLeadUpdate}
                          showArchiveButton={false}
                        />
                      ))}

                      {/* Load More Button */}
                      {bucket.hasMore && (
                        <button
                          onClick={() => loadMore(bucketKey)}
                          disabled={bucket.loading}
                          className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {bucket.loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Load More
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
        })}
      </div>
    </div>
  )
}
