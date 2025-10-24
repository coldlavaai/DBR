'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageSquare, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface Message {
  sid: string
  from: string
  to: string
  body: string
  status: string
  direction: string
  sentAt: string
  isFromGreenstar: boolean
}

interface SmsChatModalProps {
  isOpen: boolean
  onClose: () => void
  lead: {
    _id: string
    firstName: string
    secondName: string
    phoneNumber: string
  }
}

export default function SmsChatModal({ isOpen, onClose, lead }: SmsChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [refreshing, setRefreshing] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/sms-conversation?phoneNumber=${encodeURIComponent(lead.phoneNumber)}`)

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      setMessages(data.messages || [])
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          phoneNumber: lead.phoneNumber,
          message: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      // Clear input
      setNewMessage('')

      // Refresh messages after a short delay to allow Twilio to process
      setTimeout(() => {
        fetchMessages()
      }, 1500)
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchMessages()
  }

  useEffect(() => {
    if (isOpen) {
      fetchMessages()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (!isOpen) return null

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border-2 border-coldlava-cyan/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-coldlava-cyan/10 to-coldlava-purple/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-coldlava-cyan to-coldlava-purple rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {lead.firstName} {lead.secondName}
                </h2>
                <p className="text-sm text-gray-400">{lead.phoneNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh messages"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-coldlava-cyan animate-spin" />
              <span className="ml-3 text-gray-400">Loading conversation...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}

          {!loading && !error && messages.map((message) => (
            <div
              key={message.sid}
              className={`flex ${message.isFromGreenstar ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.isFromGreenstar
                    ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white rounded-br-none'
                    : 'bg-white/10 text-white rounded-bl-none border border-white/10'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <span>{formatTimestamp(message.sentAt)}</span>
                  {message.isFromGreenstar && (
                    <span className="capitalize">• {message.status}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-black/30">
          {error && sending && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-coldlava-cyan/50 focus:ring-2 focus:ring-coldlava-cyan/20 resize-none min-h-[60px] max-h-32"
              rows={2}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple rounded-xl text-white font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Messages are sent via Twilio to {lead.phoneNumber}
          </p>
        </form>
      </div>
    </div>
  )
}
