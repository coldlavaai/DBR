'use client'

import { useState } from 'react'
import { Phone, Mail, MessageSquare, ChevronDown, ChevronUp, Clock, Calendar, Archive, ArchiveRestore, Copy, Check, Radio, Zap, Trash2 } from 'lucide-react'
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
  notes?: string
}

interface LeadCardProps {
  lead: Lead
  onRefresh?: () => void
  onArchive?: (leadId: string, leadName: string) => void
  expandedByDefault?: boolean
  showArchiveButton?: boolean
  isArchived?: boolean
}

export default function LeadCard({
  lead,
  onRefresh,
  onArchive,
  expandedByDefault = false,
  showArchiveButton = true,
  isArchived = false
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(expandedByDefault)
  const [archiving, setArchiving] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [bookingLead, setBookingLead] = useState<Lead | null>(null)
  const [smsLead, setSmsLead] = useState<Lead | null>(null)
  const [togglingManual, setTogglingManual] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [manualModeOverride, setManualModeOverride] = useState<boolean | null>(null)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const LEAD_STATUSES = [
    'Ready',
    'Sent_1',
    'Sent_2',
    'Sent_3',
    'COLD',
    'NEUTRAL',
    'WARM',
    'HOT',
    'CALL_BOOKED',
    'CONVERTED',
    'INSTALLED',
    'REMOVED',
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

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'READY':
        return 'from-slate-400 to-gray-500'
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
      case 'READY':
        return '⏳'
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

  const handleArchive = async () => {
    if (!onArchive) return

    const action = isArchived ? 'Unarchive' : 'Archive'
    const actionLower = isArchived ? 'unarchive' : 'archive'

    if (!confirm(`${action} ${lead.firstName} ${lead.secondName}? This will ${isArchived ? 'move them back to active leads' : 'remove them from this view'}.`)) {
      return
    }

    setArchiving(true)

    try {
      const response = await fetch('/api/archive-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead._id, archived: !isArchived })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${actionLower} lead`)
      }

      onArchive(lead._id, `${lead.firstName} ${lead.secondName}`)
    } catch (error) {
      console.error(`Error ${actionLower}ing lead:`, error)
      alert(`Failed to ${actionLower} lead. Please try again.`)
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

  const saveNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note')
      return
    }

    setSavingNote(true)

    try {
      // Create timestamp in UK format: DD/MM/YYYY HH:MM
      const now = new Date()
      const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      // Format: [DD/MM/YYYY HH:MM] Note text
      const timestampedNote = `[${timestamp}] ${newNote.trim()}`

      // Append to existing notes (or create new)
      const updatedNotes = lead.notes
        ? `${lead.notes}\n${timestampedNote}`
        : timestampedNote

      const response = await fetch('/api/update-lead-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          notes: updatedNotes,
          phoneNumber: lead.phoneNumber
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      // Clear input and refresh
      setNewNote('')
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note. Please try again.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDelete = async () => {
    const confirmMessage = `⚠️ PERMANENT DELETE ⚠️\n\nAre you sure you want to PERMANENTLY DELETE ${lead.firstName} ${lead.secondName}?\n\nThis will:\n• Remove from Dashboard\n• Delete from Sanity Database\n• Delete from Google Sheets\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm:`

    const userInput = prompt(confirmMessage)

    if (userInput !== 'DELETE') {
      if (userInput !== null) {
        alert('Deletion cancelled. You must type "DELETE" exactly to confirm.')
      }
      return
    }

    setDeleting(true)

    try {
      const response = await fetch('/api/delete-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          phoneNumber: lead.phoneNumber
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete lead')
      }

      alert(`✅ ${lead.firstName} ${lead.secondName} has been permanently deleted from all systems.`)

      // Refresh the dashboard
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Failed to delete lead. Please try again.')
    } finally {
      setDeleting(false)
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
                <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r ${getStatusColor(lead.contactStatus)} text-white whitespace-nowrap`}>
                  {getStatusEmoji(lead.contactStatus)} {lead.contactStatus || 'SENT_1'}
                </span>
                {isManualMode && (
                  <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-coldlava-pink to-coldlava-gold text-white whitespace-nowrap flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3" />
                    MANUAL
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
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isArchived
                      ? 'bg-emerald-600/50 text-white hover:bg-emerald-500/50'
                      : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
                  }`}
                >
                  {isArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                  {archiving
                    ? (isArchived ? 'Unarchiving...' : 'Archiving...')
                    : (isArchived ? 'Unarchive' : 'Archive')
                  }
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 bg-red-600/50 rounded-xl text-white font-semibold hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                {deleting ? 'Deleting...' : 'Delete'}
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

            {/* Notes Section */}
            <div className="space-y-2 mt-4">
              <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Notes</h5>

              {/* Existing Notes Display */}
              {lead.notes && (
                <div className="p-4 bg-black/30 rounded-xl border border-white/10 max-h-48 overflow-y-auto custom-scrollbar mb-3">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-inter leading-relaxed">
                    {lead.notes}
                  </pre>
                </div>
              )}

              {/* Add New Note */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a new note..."
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-coldlava-cyan resize-none"
                  rows={3}
                />
                <button
                  onClick={saveNote}
                  disabled={savingNote || !newNote.trim()}
                  className="w-full px-4 py-2 bg-coldlava-cyan hover:bg-coldlava-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </div>
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
