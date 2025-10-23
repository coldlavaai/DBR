'use client'

import { useState } from 'react'
import { Flame, Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Clock, Calendar, Archive, Copy, Check } from 'lucide-react'

interface Lead {
  _id: string
  firstName: string
  secondName: string
  phoneNumber: string
  emailAddress?: string
  contactStatus: string
  leadSentiment: string
  conversationHistory?: string
  latestLeadReply?: string
  replyReceived?: string
  m1Sent?: string
  m2Sent?: string
  m3Sent?: string
  installDate?: string
}

interface HotLeadsSectionProps {
  leads: Lead[]
  onArchive?: () => void
}

export default function HotLeadsSection({ leads, onArchive }: HotLeadsSectionProps) {
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toUpperCase()) {
      case 'POSITIVE':
        return 'from-green-400 to-emerald-500'
      case 'NEGATIVE':
      case 'NEGATIVE_REMOVED':
        return 'from-red-400 to-rose-500'
      case 'NEUTRAL':
        return 'from-gray-400 to-slate-500'
      default:
        return 'from-yellow-400 to-orange-500'
    }
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment?.toUpperCase()) {
      case 'POSITIVE':
        return '🔥'
      case 'NEGATIVE':
        return '❌'
      case 'NEGATIVE_REMOVED':
        return '🚫'
      case 'NEUTRAL':
        return '🤔'
      default:
        return '❓'
    }
  }

  const handleArchive = async (leadId: string, leadName: string) => {
    if (!confirm(`Archive ${leadName}? This will remove them from the hot leads view.`)) {
      return
    }

    setArchiving(leadId)

    try {
      const response = await fetch('/api/archive-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, archived: true })
      })

      if (!response.ok) {
        throw new Error('Failed to archive lead')
      }

      // Call the refresh callback
      if (onArchive) {
        onArchive()
      }
    } catch (error) {
      console.error('Error archiving lead:', error)
      alert('Failed to archive lead. Please try again.')
    } finally {
      setArchiving(null)
    }
  }

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('Failed to copy to clipboard')
    }
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <Flame className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400 text-lg">No hot leads at the moment</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-orange-400 to-red-500 rounded-full" />
          <Flame className="w-7 h-7 text-orange-400 animate-pulse" />
          Hot Leads ({leads.length})
        </h3>
        <p className="text-sm text-gray-400">Click to expand details</p>
      </div>

      {/* Leads Grid */}
      <div className="space-y-4">
        {leads.map((lead) => {
          const isExpanded = expandedLead === lead._id

          return (
            <div
              key={lead._id}
              className={`bg-white/5 backdrop-blur-sm border-2 rounded-xl overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? 'border-coldlava-cyan shadow-lg shadow-coldlava-cyan/20'
                  : 'border-white/10 hover:border-coldlava-purple/50'
              }`}
            >
              {/* Lead Header - Always Visible */}
              <button
                onClick={() => setExpandedLead(isExpanded ? null : lead._id)}
                className="w-full p-5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Name row with copy button and sentiment - Now wraps properly */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <h4 className="text-base sm:text-lg md:text-xl font-bold text-white">
                          {lead.firstName} {lead.secondName}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(`${lead.firstName} ${lead.secondName}`, `name-${lead._id}`)
                          }}
                          className="p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          title="Copy name"
                          aria-label="Copy name"
                        >
                          {copiedField === `name-${lead._id}` ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r ${getSentimentColor(lead.leadSentiment)} text-white whitespace-nowrap`}>
                        {getSentimentEmoji(lead.leadSentiment)} {lead.leadSentiment || 'UNCLEAR'}
                      </span>
                    </div>

                    {/* Contact details - Now stacks on mobile, wraps on tablet */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-300">
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{lead.phoneNumber}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(lead.phoneNumber, `phone-${lead._id}`)
                          }}
                          className="p-1.5 sm:p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                          title="Copy phone"
                          aria-label="Copy phone number"
                        >
                          {copiedField === `phone-${lead._id}` ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </span>
                      {lead.emailAddress && (
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-none">{lead.emailAddress}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(lead.emailAddress!, `email-${lead._id}`)
                            }}
                            className="p-1.5 sm:p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                            title="Copy email"
                            aria-label="Copy email"
                          >
                            {copiedField === `email-${lead._id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </span>
                      )}
                      {lead.replyReceived && (
                        <span className="flex items-center gap-1.5 text-coldlava-cyan flex-shrink-0">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="whitespace-nowrap">Replied {formatDate(lead.replyReceived)}</span>
                        </span>
                      )}
                    </div>

                    {/* Latest Reply Preview */}
                    {lead.latestLeadReply && !isExpanded && (
                      <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10 relative group">
                        <p className="text-sm text-gray-300 italic line-clamp-2">
                          "{lead.latestLeadReply}"
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(lead.latestLeadReply!, `reply-${lead._id}`)
                          }}
                          className="absolute top-2 right-2 p-1.5 hover:bg-white/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy reply"
                        >
                          {copiedField === `reply-${lead._id}` ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand Button */}
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-coldlava-cyan" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-5 pt-0 space-y-4 animate-fade-in">
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                    <a
                      href={`tel:${lead.phoneNumber}`}
                      className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple rounded-xl text-white font-semibold hover:scale-105 transition-transform"
                    >
                      <Phone className="w-5 h-5" />
                      Call Now
                    </a>
                    <a
                      href={`sms:${lead.phoneNumber}`}
                      className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      SMS
                    </a>
                    {lead.emailAddress && (
                      <a
                        href={`mailto:${lead.emailAddress}`}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        Email
                      </a>
                    )}
                    <button
                      onClick={() => handleArchive(lead._id, `${lead.firstName} ${lead.secondName}`)}
                      disabled={archiving === lead._id}
                      className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gray-700/50 rounded-xl text-white font-semibold hover:bg-gray-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Archive className="w-5 h-5" />
                      {archiving === lead._id ? 'Archiving...' : 'Archive'}
                    </button>
                  </div>

                  {/* Message Timeline */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Message Timeline</h5>
                    <div className="space-y-2 text-sm">
                      {lead.m1Sent && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          <span>M1 sent {formatDate(lead.m1Sent)}</span>
                        </div>
                      )}
                      {lead.m2Sent && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-purple-400 rounded-full" />
                          <span>M2 sent {formatDate(lead.m2Sent)}</span>
                        </div>
                      )}
                      {lead.m3Sent && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <div className="w-2 h-2 bg-pink-400 rounded-full" />
                          <span>M3 sent {formatDate(lead.m3Sent)}</span>
                        </div>
                      )}
                      {lead.installDate && (
                        <div className="flex items-center gap-2 text-coldlava-cyan font-semibold">
                          <Calendar className="w-4 h-4" />
                          <span>Install scheduled: {new Date(lead.installDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Full Conversation History */}
                  {lead.conversationHistory && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Conversation History</h5>
                        <button
                          onClick={() => copyToClipboard(lead.conversationHistory!, `conversation-${lead._id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                          title="Copy conversation"
                        >
                          {copiedField === `conversation-${lead._id}` ? (
                            <>
                              <Check className="w-3 h-3 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-300">Copy All</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4 bg-black/30 rounded-xl border border-white/10 max-h-64 overflow-y-auto custom-scrollbar">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-inter leading-relaxed">
                          {lead.conversationHistory}
                        </pre>
                      </div>
                    </div>
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
