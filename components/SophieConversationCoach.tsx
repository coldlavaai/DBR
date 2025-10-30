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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-coldlava-cyan to-coldlava-purple p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-lg font-bold text-white">Sophie's Conversation Coach</h3>
            <p className="text-white/80 text-xs">Training your AI agent to be perfect</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-medium">
            {userName}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              message.sender === 'sophie'
                ? 'bg-gradient-to-br from-coldlava-cyan to-coldlava-purple'
                : 'bg-gray-700'
            }`}>
              {message.sender === 'sophie' ? (
                <Brain className="w-5 h-5 text-white" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={`flex-1 max-w-[75%] ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-4 rounded-lg ${
                message.sender === 'sophie'
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'bg-coldlava-cyan text-gray-900'
              }`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-coldlava-cyan to-coldlava-purple flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/30 border-t border-gray-700">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell Sophie how you would handle this..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-coldlava-cyan focus:outline-none resize-none"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              isLoading || !inputValue.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white hover:shadow-lg hover:scale-105'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
