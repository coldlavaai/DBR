'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, X, AlertTriangle, Lightbulb, ArrowRight, ThumbsUp, ThumbsDown, Save } from 'lucide-react'

interface Issue {
  issueType: string
  messageIndex: number
  explanation: string
  actualResponse: string
  suggestedResponse: string
}

interface Analysis {
  _id: string
  qualityScore: number
  status: string
  priority: string
  issuesIdentified: Issue[]
  overallAssessment: string
  keyTakeaways: string[]
  metadata: {
    leadName: string
    leadStatus: string
    messageCount: number
  }
  leadDetails: {
    _id: string
    firstName: string
    conversationHistory: string
  }
}

export default function SophieConversationReview() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('pending')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  useEffect(() => {
    fetchAnalyses()
  }, [filter])

  const fetchAnalyses = async () => {
    setLoading(true)
    try {
      let url = '/api/sophie-analyze-conversations'
      if (filter === 'pending') url += '?status=pending_review'
      if (filter === 'critical') url += '?priority=critical'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAnalyses(data.analyses || [])
      }
    } catch (error) {
      console.error('Failed to fetch analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewAnalysis = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/sophie-analyze-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all_unanalyzed' }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ Analyzed ${data.results?.length || 0} conversations`)
        fetchAnalyses()
      }
    } catch (error) {
      console.error('Failed to analyze:', error)
      alert('❌ Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '✅'
    if (score >= 60) return '⚠️'
    return '🚨'
  }

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string, text: string, emoji: string }> = {
      critical: { bg: 'bg-red-500/20', text: 'text-red-400', emoji: '🔴' },
      high: { bg: 'bg-orange-500/20', text: 'text-orange-400', emoji: '🟠' },
      medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', emoji: '🟡' },
      low: { bg: 'bg-green-500/20', text: 'text-green-400', emoji: '🟢' },
    }
    const badge = badges[priority] || badges.medium
    return (
      <span className={`px-2 py-1 rounded-lg ${badge.bg} ${badge.text} text-xs font-medium`}>
        {badge.emoji} {priority.toUpperCase()}
      </span>
    )
  }

  const getIssueTypeLabel = (issueType: string) => {
    const labels: Record<string, string> = {
      wrong_response: '🚫 Wrong Response',
      should_stop: '⏹️ Should Have Stopped',
      missed_booking: '📅 Missed Booking',
      bad_price_handling: '💰 Poor Price Handling',
      bad_timing_handling: '⏰ Poor Timing Handling',
      trust_issue: '🔒 Trust Issue',
      too_long: '📏 Too Long',
      too_short: '📏 Too Short',
      lost_context: '🎯 Lost Context',
      wrong_tone: '😐 Wrong Tone',
      repetitive: '🔁 Repetitive',
      didnt_answer: '❓ Didn\'t Answer',
      too_pushy: '⚡ Too Pushy',
      not_assertive: '🐌 Not Assertive',
    }
    return labels[issueType] || issueType
  }

  const submitFeedback = async (action: 'agree' | 'disagree') => {
    if (!selectedAnalysis) return

    setSubmittingFeedback(true)
    try {
      const response = await fetch('/api/sophie-review-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: selectedAnalysis._id,
          action,
          userName: 'Oliver', // TODO: Get from auth context
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)

        // Refresh analyses and clear selection
        fetchAnalyses()
        setSelectedAnalysis(null)
      } else {
        const error = await response.json()
        alert(`❌ Failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('❌ Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel: List of Analyses */}
      <div className="w-1/3 flex flex-col gap-4">
        {/* Header */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-3">Conversations to Review</h3>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filter === 'all'
                  ? 'bg-coldlava-cyan text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filter === 'pending'
                  ? 'bg-coldlava-cyan text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                filter === 'critical'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              🔴 Critical
            </button>
          </div>

          {/* Analyze Button */}
          <button
            onClick={startNewAnalysis}
            disabled={analyzing}
            className="w-full px-4 py-2 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : '🔍 Analyze New Conversations'}
          </button>
        </div>

        {/* Analysis List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading analyses...</div>
          ) : analyses.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No conversations to review.<br/>
              Click "Analyze New Conversations" to start.
            </div>
          ) : (
            analyses.map((analysis) => (
              <button
                key={analysis._id}
                onClick={() => setSelectedAnalysis(analysis)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedAnalysis?._id === analysis._id
                    ? 'bg-coldlava-cyan/20 border-2 border-coldlava-cyan'
                    : 'bg-gray-800/50 border border-white/10 hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-white">
                      {analysis.metadata.leadName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {analysis.metadata.messageCount} messages • {analysis.metadata.leadStatus}
                    </div>
                  </div>
                  {getPriorityBadge(analysis.priority)}
                </div>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.qualityScore)}`}>
                    {getScoreEmoji(analysis.qualityScore)} {analysis.qualityScore}%
                  </div>
                  <div className="text-xs text-gray-400">
                    {analysis.issuesIdentified?.length || 0} issues
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Detailed Review */}
      <div className="flex-1 bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden flex flex-col">
        {selectedAnalysis ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {selectedAnalysis.metadata.leadName}
                  </h3>
                  <div className="text-gray-400 text-sm">
                    {selectedAnalysis.metadata.messageCount} messages • {selectedAnalysis.metadata.leadStatus}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(selectedAnalysis.qualityScore)} mb-2`}>
                    {getScoreEmoji(selectedAnalysis.qualityScore)} {selectedAnalysis.qualityScore}%
                  </div>
                  {getPriorityBadge(selectedAnalysis.priority)}
                </div>
              </div>

              {/* Overall Assessment */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-coldlava-cyan text-sm font-semibold mb-2">Sophie's Assessment:</div>
                <p className="text-white text-sm leading-relaxed">
                  {selectedAnalysis.overallAssessment}
                </p>
              </div>
            </div>

            {/* Issues List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedAnalysis.issuesIdentified?.map((issue, index) => (
                <div key={index} className="bg-gray-900/50 rounded-xl p-4 border border-red-500/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-red-400 font-semibold">
                      {getIssueTypeLabel(issue.issueType)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Message #{issue.messageIndex}
                    </div>
                  </div>

                  <div className="text-gray-400 text-sm mb-4">
                    {issue.explanation}
                  </div>

                  {/* What AI Said vs Should Say */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-red-400 font-semibold mb-2">
                        ❌ What AI Actually Said:
                      </div>
                      <div className="bg-red-900/20 rounded-lg p-3 text-sm text-white leading-relaxed">
                        "{issue.actualResponse}"
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-green-400 font-semibold mb-2">
                        ✅ What AI Should Have Said:
                      </div>
                      <div className="bg-green-900/20 rounded-lg p-3 text-sm text-white leading-relaxed">
                        "{issue.suggestedResponse}"
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Key Takeaways */}
              {selectedAnalysis.keyTakeaways && selectedAnalysis.keyTakeaways.length > 0 && (
                <div className="bg-coldlava-cyan/10 rounded-xl p-4 border border-coldlava-cyan/30">
                  <div className="text-coldlava-cyan font-semibold mb-3">
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Key Takeaways:
                  </div>
                  <ul className="space-y-2">
                    {selectedAnalysis.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="text-white text-sm flex gap-2">
                        <span>•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => submitFeedback('agree')}
                disabled={submittingFeedback}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsUp className="w-5 h-5" />
                {submittingFeedback ? 'Capturing Learnings...' : 'Agree & Learn'}
              </button>
              <button
                onClick={() => submitFeedback('disagree')}
                disabled={submittingFeedback}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsDown className="w-5 h-5" />
                Disagree
              </button>
              <button
                onClick={fetchAnalyses}
                className="px-6 py-3 bg-coldlava-cyan hover:bg-coldlava-cyan/80 text-white rounded-lg font-medium transition-all"
                title="Refresh analyses"
              >
                <Save className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a conversation to review
          </div>
        )}
      </div>
    </div>
  )
}
