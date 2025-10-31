'use client'

import { useState, useEffect } from 'react'
import { BookOpen, AlertCircle, CheckCircle, Flame, TrendingUp, Shield, Clock, MessageSquare } from 'lucide-react'

interface Learning {
  _id: string
  category: string
  title: string
  userGuidance: string
  doThis?: string
  dontDoThis?: string
  exampleResponses?: Array<{ scenario: string, response: string }>
  priority: string
  tags?: string[]
  createdBy?: string
  lastUpdated: string
  confidenceScore?: number
  timesApplied?: number
  timesCorrect?: number
  timesIncorrect?: number
  source?: string
  isActive?: boolean
}

export default function SophieLearningLog() {
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchLearnings()
  }, [selectedCategory])

  const fetchLearnings = async () => {
    setLoading(true)
    try {
      const url = selectedCategory
        ? `/api/sophie-learning?category=${selectedCategory}`
        : '/api/sophie-learning'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setLearnings(data.learnings)
      }
    } catch (error) {
      console.error('Failed to fetch learnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: any = {
      'price_objection': '💰',
      'timing_objection': '⏰',
      'interest_signal': '🤔',
      'trust_concern': '🔒',
      'context_maintenance': '🎯',
      'message_style': '📝',
      'followup_strategy': '🔄',
      'general_ethos': '🌟',
      'other': '🎨',
    }
    return icons[category] || '📚'
  }

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      'critical': 'from-red-500 to-orange-500',
      'high': 'from-orange-500 to-yellow-500',
      'medium': 'from-blue-500 to-cyan-500',
      'low': 'from-gray-500 to-gray-400',
    }
    return colors[priority] || colors.medium
  }

  const getPriorityIcon = (priority: string) => {
    const icons: any = {
      'critical': Flame,
      'high': AlertCircle,
      'medium': TrendingUp,
      'low': MessageSquare,
    }
    const Icon = icons[priority] || TrendingUp
    return <Icon className="w-4 h-4" />
  }

  const categories = [
    { value: null, label: 'All Learnings', icon: '📚' },
    { value: 'price_objection', label: 'Price Objections', icon: '💰' },
    { value: 'timing_objection', label: 'Timing Objections', icon: '⏰' },
    { value: 'interest_signal', label: 'Interest Signals', icon: '🤔' },
    { value: 'trust_concern', label: 'Trust Building', icon: '🔒' },
    { value: 'general_ethos', label: 'General Ethos', icon: '🌟' },
  ]

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-coldlava-purple to-coldlava-cyan p-4">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-lg font-bold text-white">Learning Log</h3>
            <p className="text-white/80 text-xs">Accumulated knowledge from training sessions</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.value || 'all'}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-white text-gray-900'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Learnings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-coldlava-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading learnings...</p>
            </div>
          </div>
        ) : learnings.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No learnings yet</p>
              <p className="text-gray-500 text-sm">Start training Sophie by reviewing conversations</p>
            </div>
          </div>
        ) : (
          learnings.map((learning) => (
            <div
              key={learning._id}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-lg p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getCategoryIcon(learning.category)}</span>
                    <h4 className="text-white font-bold">{learning.title}</h4>
                  </div>
                  <p className="text-gray-400 text-sm">{learning.userGuidance}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${getPriorityColor(learning.priority)} text-white text-xs font-semibold`}>
                  {getPriorityIcon(learning.priority)}
                  <span className="uppercase">{learning.priority}</span>
                </div>
              </div>

              {/* Do This / Don't Do This */}
              <div className="space-y-2">
                {learning.doThis && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-green-400 font-semibold text-xs mb-1">Do This:</p>
                        <p className="text-green-300 text-sm">{learning.doThis}</p>
                      </div>
                    </div>
                  </div>
                )}

                {learning.dontDoThis && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-400 font-semibold text-xs mb-1">Don't Do This:</p>
                        <p className="text-red-300 text-sm">{learning.dontDoThis}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Example Responses */}
              {learning.exampleResponses && learning.exampleResponses.length > 0 && (
                <div className="mt-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-cyan-400 font-semibold text-xs mb-2">Example Responses:</p>
                  <div className="space-y-2">
                    {learning.exampleResponses.map((example, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="text-gray-400 italic mb-1">"{example.scenario}"</p>
                        <p className="text-cyan-300">→ {example.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking Stats */}
              {(learning.confidenceScore !== undefined || learning.timesApplied !== undefined) && (
                <div className="mt-3 bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-purple-400 font-semibold text-xs mb-2">Learning Performance:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {learning.confidenceScore !== undefined && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">{(learning.confidenceScore * 100).toFixed(0)}%</div>
                        <div className="text-xs text-gray-400">Confidence</div>
                      </div>
                    )}
                    {learning.timesApplied !== undefined && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-coldlava-cyan">{learning.timesApplied}</div>
                        <div className="text-xs text-gray-400">Times Used</div>
                      </div>
                    )}
                    {(learning.timesCorrect !== undefined && learning.timesIncorrect !== undefined) && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-400">{learning.timesCorrect}/{learning.timesCorrect + learning.timesIncorrect}</div>
                        <div className="text-xs text-gray-400">Correct</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {learning.createdBy && `by ${learning.createdBy} • `}
                    {new Date(learning.lastUpdated).toLocaleDateString('en-GB')}
                  </span>
                  {learning.source && (
                    <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded-full text-xs">
                      {learning.source === 'user_agreed' ? '✅ Agreed' : learning.source === 'teaching_dialogue' ? '💬 Taught' : learning.source === 'consolidated' ? '🔄 Consolidated' : learning.source}
                    </span>
                  )}
                </div>
                {learning.tags && learning.tags.length > 0 && (
                  <div className="flex gap-1">
                    {learning.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      {!loading && learnings.length > 0 && (
        <div className="p-4 bg-black/30 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {learnings.length} learning{learnings.length !== 1 ? 's' : ''} captured
            </span>
            <button
              onClick={fetchLearnings}
              className="text-coldlava-cyan hover:text-coldlava-cyan/80 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
