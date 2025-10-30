'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle, User, Bot } from 'lucide-react'

interface Message {
  _id: string
  _createdAt: string
  sender: 'agent' | 'lead'
  content: string
}

interface ConversationIssue {
  type: 'CRITICAL' | 'WARNING'
  category: string
  title: string
  description: string
  evidence: any
  recommendation: string
}

interface ConversationViewerProps {
  leadId: string | null
  onClose: () => void
}

export default function ConversationViewer({ leadId, onClose }: ConversationViewerProps) {
  const [loading, setLoading] = useState(true)
  const [lead, setLead] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [issues, setIssues] = useState<ConversationIssue[]>([])

  useEffect(() => {
    if (!leadId) return

    const fetchConversation = async () => {
      setLoading(true)
      try {
        // Fetch lead data with messages
        const leadResponse = await fetch(`/api/leads/${leadId}`)
        if (leadResponse.ok) {
          const leadData = await leadResponse.json()
          setLead(leadData)
          setMessages(leadData.messages || [])
        }

        // Fetch analysis for this specific lead
        const analysisResponse = await fetch('/api/analyze-conversations')
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          const leadAnalysis = analysisData.issues.find((i: any) => i.leadId === leadId)
          if (leadAnalysis) {
            setIssues(leadAnalysis.issues)
          }
        }
      } catch (error) {
        console.error('Failed to load conversation:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
  }, [leadId])

  if (!leadId) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {lead ? `${lead.firstName} ${lead.secondName}` : 'Loading...'}
            </h2>
            <p className="text-sm text-gray-600">{lead?.phoneNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Issues Summary */}
            {issues.length > 0 && (
              <div className="p-4 bg-red-50 border-b border-red-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-2">
                      {issues.length} Quality Issue{issues.length > 1 ? 's' : ''} Detected
                    </h3>
                    <div className="space-y-2">
                      {issues.map((issue, idx) => (
                        <div key={idx} className="text-sm">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                            issue.type === 'CRITICAL'
                              ? 'bg-red-200 text-red-900'
                              : 'bg-yellow-200 text-yellow-900'
                          }`}>
                            {issue.type}
                          </span>
                          <span className="font-medium text-red-900">{issue.title}</span>
                          <p className="text-red-700 mt-1 ml-16">{issue.description}</p>
                          <p className="text-red-600 mt-1 ml-16 text-xs italic">
                            💡 {issue.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((message, idx) => (
                  <div
                    key={message._id}
                    className={`flex gap-3 ${message.sender === 'agent' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.sender === 'agent'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {message.sender === 'agent' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`flex-1 max-w-[75%] ${message.sender === 'agent' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.sender === 'agent'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(message._createdAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {/* Quality Annotation */}
                      {message.sender === 'agent' && (
                        (() => {
                          const messageIssues = issues.filter(issue => {
                            if (!issue.evidence) return false
                            const evidenceStr = JSON.stringify(issue.evidence).toLowerCase()
                            return evidenceStr.includes(message.content.toLowerCase().substring(0, 50))
                          })

                          if (messageIssues.length > 0) {
                            return (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-left">
                                {messageIssues.map((issue, issueIdx) => (
                                  <div key={issueIdx} className="text-xs">
                                    <span className="font-semibold text-red-900">⚠️ {issue.category.replace(/_/g, ' ')}</span>
                                    <p className="text-red-700 mt-1">{issue.description}</p>
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        })()
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Lead Status */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    lead?.contactStatus === 'HOT' ? 'bg-orange-100 text-orange-800' :
                    lead?.contactStatus === 'WARM' ? 'bg-yellow-100 text-yellow-800' :
                    lead?.contactStatus === 'COLD' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead?.contactStatus || 'UNKNOWN'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    lead?.leadSentiment === 'POSITIVE' ? 'bg-green-100 text-green-800' :
                    lead?.leadSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lead?.leadSentiment || 'NEUTRAL'}
                  </span>
                </div>
                {lead?.callBookedTime && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Call Booked: {new Date(lead.callBookedTime).toLocaleDateString('en-GB')}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
