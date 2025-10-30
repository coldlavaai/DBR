'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Brain, User, Loader2, Save, Check, BookOpen } from 'lucide-react'

interface Message {
  id: string
  sender: 'sophie' | 'user'
  content: string
  timestamp: Date
}

interface SophieConversationCoachProps {
  userName: string
  currentLeadId?: string | null
}

export default function SophieConversationCoach({
  userName,
  currentLeadId = null
}: SophieConversationCoachProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Send initial greeting from Sophie
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        sender: 'sophie',
        content: `Hey ${userName}! 👋 I'm Sophie, your Conversation Coach.\n\nI've analyzed all your lead conversations and I'm here to help you refine the AI agent's responses. We can:\n\n• Review specific conversations that need improvement\n• Discuss how YOU would handle different objections\n• Build a learning model of your perfect response patterns\n• Capture best practices for the team\n\nWhat would you like to work on today?`,
        timestamp: new Date(),
      }])
    }
  }, [userName, messages.length])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call Sophie's chat API with streaming
      const response = await fetch('/api/sophie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          userName,
          sessionId,
          leadId: currentLeadId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from Sophie')
      }

      // Create Sophie's message that will be updated as stream arrives
      const sophieMessageId = `sophie_${Date.now()}`
      setMessages(prev => [...prev, {
        id: sophieMessageId,
        sender: 'sophie',
        content: '',
        timestamp: new Date(),
      }])

      // Read the streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'text') {
              // Append text to Sophie's message
              setMessages(prev => prev.map(msg =>
                msg.id === sophieMessageId
                  ? { ...msg, content: msg.content + data.content }
                  : msg
              ))
            } else if (data.type === 'error') {
              console.error('Stream error:', data.content)
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        sender: 'sophie',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl overflow-hidden">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-coldlava-cyan/20 to-coldlava-purple/20 border-b border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coldlava-cyan to-coldlava-purple flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Training Session</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                Have a conversation with Sophie to teach her how to handle different situations.
                She'll learn from your expertise and apply it to future conversations.
              </p>
            </div>
          </div>
          <span className="px-4 py-2 bg-white/10 rounded-lg text-white text-sm font-medium border border-white/20">
            👤 {userName}
          </span>
        </div>
      </div>

      {/* Messages Area - Full Width Layout */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-6 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'sophie' && (
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-coldlava-cyan to-coldlava-purple flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
            )}

            {/* Message Card */}
            <div className={`flex-1 max-w-4xl ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block w-full p-6 rounded-xl ${
                message.sender === 'sophie'
                  ? 'bg-gray-800/80 text-white border border-gray-700'
                  : 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-sm">
                    {message.sender === 'sophie' ? '🧠 Sophie' : '👤 You'}
                  </span>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>

            {message.sender === 'user' && (
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-coldlava-cyan to-coldlava-purple flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-6">
              <div className="flex gap-2 items-center">
                <span className="text-white/70 text-sm mr-3">Sophie is thinking</span>
                <div className="w-2 h-2 bg-coldlava-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-coldlava-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-coldlava-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Prominent & Spacious */}
      <div className="p-6 bg-black/40 border-t border-white/10">
        <div className="flex gap-4 items-end max-w-6xl mx-auto">
          <div className="flex-1">
            <label className="text-white text-sm font-medium mb-2 block">
              Your guidance for Sophie
            </label>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Example: 'When someone says they're worried about price, we should focus on the long-term savings rather than upfront cost...'"
              className="w-full bg-gray-800 text-white rounded-xl px-6 py-4 border border-gray-700 focus:border-coldlava-cyan focus:outline-none resize-none text-base"
              rows={3}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`px-8 py-4 rounded-xl font-medium transition-all flex items-center gap-3 text-lg ${
              isLoading || !inputValue.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white hover:shadow-xl hover:scale-105'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Sending</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-3 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
