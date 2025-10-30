'use client'

import { useState, useEffect } from 'react'
import { Brain, BookOpen, TrendingUp, AlertCircle, Activity, RefreshCw, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import SophieConversationCoach from '@/components/SophieConversationCoach'
import SophieLearningLog from '@/components/SophieLearningLog'

export default function SophieHQPage() {
  const [insights, setInsights] = useState<any>(null)
  const [conversationAnalysis, setConversationAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeView, setActiveView] = useState<'coach' | 'insights' | 'patterns' | 'alerts'>('coach')
  const [learningLogOpen, setLearningLogOpen] = useState(false)

  // Fetch insights
  const fetchInsights = async () => {
    try {
      setLoading(true)
      const [insightsResponse, conversationResponse] = await Promise.all([
        fetch('/api/sophie-insights'),
        fetch('/api/analyze-conversations')
      ])

      if (insightsResponse.ok) {
        const data = await insightsResponse.json()
        setInsights(data)
      }

      if (conversationResponse.ok) {
        const data = await conversationResponse.json()
        setConversationAnalysis(data)
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and auto-refresh every 30s
  useEffect(() => {
    fetchInsights()
    const interval = setInterval(fetchInsights, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-coldlava-cyan to-coldlava-purple p-6 shadow-2xl">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sophie's Intelligence HQ</h1>
              <p className="text-white/80 text-sm mt-1">
                The brain of your DBR operation • Train, Monitor, Optimize
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-white/70 text-sm">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
              <span className="text-white font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto flex items-center gap-2 px-6">
          <button
            onClick={() => setActiveView('coach')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'coach'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Brain className="w-5 h-5" />
            Conversation Coach
          </button>
          <button
            onClick={() => setActiveView('insights')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'insights'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-5 h-5" />
            Quality Insights
          </button>
          <button
            onClick={() => setActiveView('patterns')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'patterns'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Patterns
          </button>
          <button
            onClick={() => setActiveView('alerts')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'alerts'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            Alerts
            {insights?.criticalCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {insights.criticalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto p-6">
        {activeView === 'coach' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Conversation Coach - Full Width */}
            <div className="bg-gray-800/50 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <SophieConversationCoach userName="Oliver" currentLeadId={null} />
            </div>
          </div>
        )}

        {activeView === 'insights' && (
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">Quality Insights</h2>
            <p className="text-gray-400">Conversation quality analysis coming soon...</p>
          </div>
        )}

        {activeView === 'patterns' && (
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">Conversation Patterns</h2>
            <p className="text-gray-400">Pattern analysis coming soon...</p>
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-4">Priority Alerts</h2>
            <p className="text-gray-400">Alert system coming soon...</p>
          </div>
        )}
      </div>

      {/* Collapsible Learning Log - Bottom Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div
          className={`bg-gray-900 border-t border-white/20 shadow-2xl transition-all duration-300 ${
            learningLogOpen ? 'h-[500px]' : 'h-14'
          }`}
        >
          {/* Toggle Header */}
          <button
            onClick={() => setLearningLogOpen(!learningLogOpen)}
            className="w-full h-14 px-6 flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-coldlava-cyan" />
              <span className="text-white font-semibold">Learning Log Archive</span>
              <span className="text-gray-400 text-sm">
                (Historical lessons and training data)
              </span>
            </div>
            {learningLogOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Learning Log Content */}
          {learningLogOpen && (
            <div className="h-[calc(100%-56px)] overflow-y-auto p-6">
              <SophieLearningLog />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
