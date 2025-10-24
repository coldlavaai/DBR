'use client'

import { useState } from 'react'
import { Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Clock, Calendar, Archive, Copy, Check, Radio, Zap, Star } from 'lucide-react'
import BookCallModal from './BookCallModal'
import SmsChatModal from './SmsChatModal'

export interface Lead {
  _id: string
  firstName: string
  secondName: string
  phoneNumber: string
  emailAddress?: string
  postcode?: string
  contactStatus: string
  leadSentiment: string
  conversationHistory?: string
  latestLeadReply?: string
  replyReceived?: string
  m1Sent?: string
  m2Sent?: string
  m3Sent?: string
  installDate?: string
  manualMode?: boolean
  starred?: boolean
}

interface LeadCardProps {
  lead: Lead
  onRefresh?: () => void
  onArchive?: (leadId: string, leadName: string) => void
  expandedByDefault?: boolean
  showArchiveButton?: boolean
}

export default function LeadCard({
  lead,
  onRefresh,
  onArchive,
  expandedByDefault = false,
  showArchiveButton = true
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault)
  const [archiving, setArchiving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [bookingLead, setBookingLead] = useState<Lead | null>(null)
  const [smsLead, setSmsLead] = useState<Lead | null>(null)
  const [togglingManual, setTogglingManual] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [manualModeOverride, setManualModeOverride] = useState<boolean | null>(null)
  const [starredOverride, setStarredOverride] = useState<boolean | null>(null)
  const [togglingStarred, setTogglingStarred] = useState(false)

  const LEAD_STATUSES = [
    'HOT',
    'POSITIVE',
    'NEGATIVE',
    'REMOVED',
    'CONVERTED',
    'SCHEDULED',
    'IN_PROGRESS',
    'WON',
    'LOST',
  ]

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

  const handleArchive = async () => {
    if (!onArchive) return

    if (!confirm(`Archive ${lead.firstName} ${lead.secondName}? This will remove them from this view.`)) {
      return
    }

    setArchiving(true)

    try {
      const response = await fetch('/api/archive-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id, archived: true })
      })

      if (!response.ok) {
        throw new Error('Failed to archive lead')
      }

      onArchive(lead._id, `${lead.firstName} ${lead.secondName}`)
    } catch (error) {
      console.error('Error archiving lead:', error)
      alert('Failed to archive lead. Please try again.')
    } finally {
      setArchiving(false)
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

  const getManualMode = () => {
    return manualModeOverride !== null ? manualModeOverride : (lead.manualMode || false)
  }

  const getStarred = () => {
    return starredOverride !== null ? starredOverride : (lead.starred || false)
  }

  const toggleManualMode = async () => {
    const currentMode = getManualMode()
    const newMode = !currentMode

    // Optimistic update
    setManualModeOverride(newMode)
    setTogglingManual(true)

    try {
      const response = await fetch('/api/toggle-manual-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id, manualMode: newMode })
      })

      if (!response.ok) {
        // Revert on error
        setManualModeOverride(currentMode)
        throw new Error('Failed to toggle manual mode')
      }

      // Refresh in background
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error toggling manual mode:', error)
      alert('Failed to toggle manual mode. Please try again.')
    } finally {
      setTogglingManual(false)
    }
  }

  const toggleStarred = async () => {
    const currentStarred = getStarred()
    const newStarred = !currentStarred

    // Optimistic update
    setStarredOverride(newStarred)
    setTogglingStarred(true)

    try {
      const response = await fetch('/api/toggle-starred', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id, starred: newStarred })
      })

      if (!response.ok) {
        // Revert on error
        setStarredOverride(currentStarred)
        throw new Error('Failed to toggle starred')
      }

      // Refresh in background
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error toggling starred:', error)
      alert('Failed to toggle starred. Please try again.')
    } finally {
      setTogglingStarred(false)
    }
  }

  const updateLeadStatus = async (newStatus: string) => {
    setUpdatingStatus(true)

    try {
      const response = await fetch('/api/update-lead-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id, contactStatus: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update lead status')
      }

      // Refresh the leads
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      alert('Failed to update lead status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const isManualMode = getManualMode()

  return (
    <>
      <div
        className={`bg-white/5 backdrop-blur-sm border-2 rounded-xl overflow-hidden transition-all duration-300 ${
          isManualMode
            ? 'border-coldlava-pink animate-pulse shadow-lg shadow-coldlava-pink/30'
            : isExpanded
            ? 'border-coldlava-cyan shadow-lg shadow-coldlava-cyan/20'
            : 'border-white/10 hover:border-coldlava-purple/50'
        }`}
      >
        {/* Lead Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-5 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {/* Name row with copy button and sentiment */}
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
                {isManualMode && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-coldlava-pink to-coldlava-gold text-white whitespace-nowrap flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3" />
                    MANUAL
                  </span>
                )}
                {getStarred() && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white whitespace-nowrap flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    FEATURED
                  </span>
                )}
              </div>

              {/* Contact details */}
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
                {lead.postcode && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.postcode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-gray-300 hover:text-coldlava-cyan transition-colors flex-shrink-0 cursor-pointer"
                    title="Open in Google Maps"
                  >
                    <span className="text-coldlava-purple font-semibold">📍</span>
                    <span className="uppercase font-medium underline decoration-dotted">{lead.postcode}</span>
                  </a>
                )}
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
            {/* Manual Mode Toggle */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isManualMode ? 'bg-gradient-to-br from-coldlava-pink to-coldlava-gold' : 'bg-white/10'}`}>
                    {isManualMode ? <Radio className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">
                      {isManualMode ? 'Manual Control Active' : 'AI Automation Active'}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {isManualMode
                        ? 'You are in control of all messages. AI automation is paused.'
                        : 'AI is handling automated follow-ups based on schedule.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleManualMode}
                  disabled={togglingManual}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                    isManualMode
                      ? 'bg-gradient-to-r from-coldlava-pink to-coldlava-gold'
                      : 'bg-gray-600'
                  } ${togglingManual ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isManualMode ? 'Switch to AI automation' : 'Take manual control'}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                      isManualMode ? 'translate-x-7' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Star Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStarred() ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-white/10'}`}>
                  <Star className={`w-5 h-5 ${getStarred() ? 'text-white fill-white' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h4 className="font-semibold text-white">
                    {getStarred() ? 'Featured Lead' : 'Not Featured'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {getStarred()
                      ? 'This lead is featured for quick access in the dashboard.'
                      : 'Feature this lead to keep it visible in the Featured section.'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleStarred}
                disabled={togglingStarred}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                  getStarred()
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                    : 'bg-gray-600'
                } ${togglingStarred ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={getStarred() ? 'Remove from featured' : 'Add to featured'}
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                    getStarred() ? 'translate-x-7' : ''
                  }`}
                />
              </button>
            </div>

            {/* Lead Status Dropdown */}
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Lead Status</h5>
              <select
                value={lead.contactStatus || 'Sent_1'}
                onChange={(e) => updateLeadStatus(e.target.value)}
                disabled={updatingStatus}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-coldlava-cyan focus:ring-2 focus:ring-coldlava-cyan/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-gray-800 text-white">
                    {status}
                  </option>
                ))}
              </select>
              {updatingStatus && (
                <p className="text-xs text-coldlava-cyan">Updating status...</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:${lead.phoneNumber}`}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple rounded-xl text-white font-semibold hover:scale-105 transition-transform"
              >
                <Phone className="w-5 h-5" />
                Call Now
              </a>
              <button
                onClick={() => setBookingLead(lead)}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white font-semibold hover:scale-105 transition-transform"
              >
                <Calendar className="w-5 h-5" />
                Book Call
              </button>
              <button
                onClick={() => setSmsLead(lead)}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-coldlava-pink to-coldlava-gold rounded-xl text-white font-semibold hover:scale-105 transition-transform"
              >
                <MessageSquare className="w-5 h-5" />
                {isManualMode ? 'SMS Chat' : 'View Chat'}
              </button>
              {lead.emailAddress && (
                <a
                  href={`mailto:${lead.emailAddress}`}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </a>
              )}
              {showArchiveButton && (
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-gray-700/50 rounded-xl text-white font-semibold hover:bg-gray-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Archive className="w-5 h-5" />
                  {archiving ? 'Archiving...' : 'Archive'}
                </button>
              )}
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

      {/* Booking Modal */}
      {bookingLead && (
        <BookCallModal
          lead={bookingLead}
          isOpen={!!bookingLead}
          onClose={() => setBookingLead(null)}
          onSuccess={() => {
            setBookingLead(null)
            if (onRefresh) {
              onRefresh()
            }
          }}
        />
      )}

      {/* SMS Chat Modal */}
      {smsLead && (
        <SmsChatModal
          lead={smsLead}
          isOpen={!!smsLead}
          onClose={() => setSmsLead(null)}
        />
      )}
    </>
  )
}
