'use client'

import { MessageSquare, Phone, Calendar, TrendingUp } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'reply' | 'message' | 'status_change' | 'scheduled'
  leadName: string
  message: string
  timestamp: string
  sentiment?: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
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
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <div className="w-1 h-6 bg-gradient-to-b from-coldlava-cyan to-coldlava-purple rounded-full" />
        Recent Activity
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-coldlava-cyan/50 transition-all duration-300 group"
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

                {activity.sentiment && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/20 text-green-300 border border-green-400/30">
                    {activity.sentiment}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
