'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Calendar, TrendingUp, ChevronDown, Loader2 } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'reply' | 'message' | 'status_change' | 'scheduled'
  leadName: string
  message: string
  timestamp: string
  contactStatus?: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
  onActivityClick?: (leadId: string, leadName: string) => void
}

export default function RecentActivity({ activities: initialActivities, onActivityClick }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/recent-activity?offset=${activities.length}&limit=5`)
      if (!response.ok) throw new Error('Failed to load more activities')

      const data = await response.json()
      if (data.activities && data.activities.length > 0) {
        setActivities(prev => [...prev, ...data.activities])
        setHasMore(data.hasMore)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="w-5 h-5 text-coldlava-cyan" />
      case 'message':
        return <Phone className="w-5 h-5 text-coldlava-purple" />
      case 'scheduled':
        return <Calendar className="w-5 h-5 text-green-400" />
      default:
        return <TrendingUp className="w-5 h-5 text-orange-400" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reply':
        return 'Replied'
      case 'message':
        return 'Message Sent'
      case 'scheduled':
        return 'Install Scheduled'
      default:
        return 'Status Changed'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SENT_1':
        return 'from-blue-400 to-cyan-500'
      case 'SENT_2':
        return 'from-blue-500 to-indigo-500'
      case 'SENT_3':
        return 'from-indigo-500 to-purple-500'
      case 'COLD':
        return 'from-blue-600 to-cyan-700'
      case 'NEUTRAL':
        return 'from-gray-400 to-slate-500'
      case 'WARM':
        return 'from-yellow-400 to-orange-400'
      case 'HOT':
        return 'from-orange-400 to-red-500'
      case 'CALL_BOOKED':
        return 'from-purple-400 to-pink-500'
      case 'CONVERTED':
        return 'from-emerald-400 to-teal-500'
      case 'INSTALLED':
        return 'from-green-500 to-emerald-600'
      case 'REMOVED':
        return 'from-red-400 to-rose-500'
      default:
        return 'from-gray-400 to-slate-500'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SENT_1':
      case 'SENT_2':
      case 'SENT_3':
        return '📨'
      case 'COLD':
        return '❄️'
      case 'NEUTRAL':
        return '🤔'
      case 'WARM':
        return '🌡️'
      case 'HOT':
        return '🔥'
      case 'CALL_BOOKED':
        return '📞'
      case 'CONVERTED':
        return '✨'
      case 'INSTALLED':
        return '✅'
      case 'REMOVED':
        return '🚫'
      default:
        return '❓'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">

      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {activities.map((activity) => (
          <button
            key={activity.id}
            onClick={() => onActivityClick?.(activity.id, activity.leadName)}
            className="w-full text-left p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-coldlava-cyan/50 transition-all duration-300 group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                {getIcon(activity.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-white truncate">{activity.leadName}</h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(activity.timestamp)}</span>
                </div>

                <p className="text-sm text-coldlava-cyan mb-1">{getTypeLabel(activity.type)}</p>

                <p className="text-sm text-gray-300 line-clamp-2">{activity.message}</p>

                {activity.contactStatus && (
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r ${getStatusColor(activity.contactStatus)} text-white`}>
                    {getStatusEmoji(activity.contactStatus)} {activity.contactStatus}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Load More Button */}
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
              Load More
            </>
          )}
        </button>
      )}
    </div>
  )
}
