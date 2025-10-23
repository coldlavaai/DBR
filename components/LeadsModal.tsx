'use client'

import { useEffect, useState } from 'react'

interface Lead {
  _id: string
  firstName: string
  secondName: string
  phoneNumber: string
  contactStatus: string
  leadSentiment: string
  conversationHistory: string
  m1Sent?: string
  m2Sent?: string
  m3Sent?: string
  replyReceived?: string
  installDate?: string
}

interface LeadsModalProps {
  isOpen: boolean
  onClose: () => void
  filterType: string
  filterLabel: string
  timeRange: string
}

export default function LeadsModal({ isOpen, onClose, filterType, filterLabel, timeRange }: LeadsModalProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLeads()
    }
  }, [isOpen, filterType, timeRange])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  async function fetchLeads() {
    setLoading(true)
    try {
      const response = await fetch(`/api/dbr-leads?filter=${filterType}&timeRange=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch leads')
      const data = await response.json()
      setLeads(data.leads)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      HOT: 'bg-orange-100 text-orange-800',
      POSITIVE: 'bg-green-100 text-green-800',
      NEGATIVE: 'bg-red-100 text-red-800',
      REMOVED: 'bg-gray-100 text-gray-800',
      Sent_1: 'bg-blue-100 text-blue-800',
      Sent_2: 'bg-blue-100 text-blue-800',
      Sent_3: 'bg-blue-100 text-blue-800',
      CONVERTED: 'bg-emerald-100 text-emerald-800',
      SCHEDULED: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatConversation = (conversation: string) => {
    if (!conversation) return 'No conversation recorded'

    // Split by common patterns like timestamps or speaker changes
    const lines = conversation.split('\n').filter(line => line.trim())

    return lines.map((line, idx) => {
      const trimmed = line.trim()

      // Detect message types and format accordingly
      if (trimmed.startsWith('[') || trimmed.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        // Timestamp or metadata
        return (
          <div key={idx} className="text-xs text-gray-500 mt-3 mb-1 font-semibold">
            {trimmed}
          </div>
        )
      } else if (trimmed.toLowerCase().includes('ai:') || trimmed.toLowerCase().includes('bot:') || trimmed.toLowerCase().includes('assistant:')) {
        // AI message
        return (
          <div key={idx} className="mb-2 flex justify-start">
            <div className="bg-blue-50 text-blue-900 px-4 py-2 rounded-lg max-w-[80%]">
              {trimmed.replace(/^(AI:|Bot:|Assistant:)/i, '')}
            </div>
          </div>
        )
      } else if (trimmed.toLowerCase().includes('user:') || trimmed.toLowerCase().includes('customer:') || trimmed.toLowerCase().includes('lead:')) {
        // User message
        return (
          <div key={idx} className="mb-2 flex justify-end">
            <div className="bg-green-50 text-green-900 px-4 py-2 rounded-lg max-w-[80%]">
              {trimmed.replace(/^(User:|Customer:|Lead:)/i, '')}
            </div>
          </div>
        )
      } else {
        // Regular text
        return (
          <div key={idx} className="mb-2 text-gray-700">
            {trimmed}
          </div>
        )
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-y-0 right-0 max-w-4xl w-full bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-gray-900">{filterLabel}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-lg"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No leads found for this category
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead._id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Lead header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedLead(expandedLead === lead._id ? null : lead._id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {lead.firstName} {lead.secondName}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(lead.contactStatus)}`}>
                          {lead.contactStatus}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedLead === lead._id ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <span className="font-medium">Phone:</span> {lead.phoneNumber}
                      </div>
                      <div>
                        <span className="font-medium">Sentiment:</span> {lead.leadSentiment || 'Unknown'}
                      </div>
                      {lead.m1Sent && (
                        <div>
                          <span className="font-medium">M1 Sent:</span> {formatDate(lead.m1Sent)}
                        </div>
                      )}
                      {lead.replyReceived && (
                        <div>
                          <span className="font-medium">Reply:</span> {formatDate(lead.replyReceived)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {expandedLead === lead._id ? 'Click to hide conversation' : 'Click to view full conversation'}
                    </div>
                  </div>

                  {/* Expanded conversation */}
                  {expandedLead === lead._id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Conversation History</h4>
                      <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                        {formatConversation(lead.conversationHistory)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
