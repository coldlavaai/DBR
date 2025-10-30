'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, TrendingUp, MessageCircle, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Send, RefreshCw, Loader2 } from 'lucide-react'

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

export default function SophieQualityMonitor() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [teachingMode, setTeachingMode] = useState(false)
  const [teachingAnalysisId, setTeachingAnalysisId] = useState<string | null>(null)
  const [dialogueHistory, setDialogueHistory] = useState<any[]>([])
  const [userInput, setUserInput] = useState('')
  const [sophieThinking, setSophieThinking] = useState(false)

  // Initial load: Auto-analyze and fetch
  useEffect(() => {
    const init = async () => {
      const hasAnalyzed = localStorage.getItem('sophie_initial_analysis_done')

      if (!hasAnalyzed) {
        await runBatchAnalysis(3) // Last 3 days
        localStorage.setItem('sophie_initial_analysis_done', 'true')
      }

      await fetchAnalyses()
    }

    init()
  }, [])

  // Live updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalyses, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/sophie-analyze-conversations?status=pending_review')
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

  const runBatchAnalysis = async (daysBack: number = 3) => {
    setAnalyzing(true)
    try {
      const response = await fetch('/api/sophie-analyze-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all_unanalyzed', daysBack }),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchAnalyses()
      }
    } catch (error) {
      console.error('Batch analysis failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const submitFeedback = async (analysisId: string, action: 'agree' | 'disagree') => {
    if (action === 'disagree') {
      setTeachingMode(true)
      setTeachingAnalysisId(analysisId)
      setDialogueHistory([])
      return
    }

    try {
      const response = await fetch('/api/sophie-review-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId, action, userName: 'Oliver' }),
      })

      if (response.ok) {
        await fetchAnalyses()
        setExpandedCard(null)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const sendTeachingMessage = async () => {
    if (!teachingAnalysisId || !userInput.trim()) return

    setSophieThinking(true)
    try {
      const action = dialogueHistory.length === 0 ? 'start_teaching' : 'continue_dialogue'

      const response = await fetch('/api/sophie-teaching-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: teachingAnalysisId,
          issueIndex: 0,
          action,
          userMessage: userInput,
          dialogueHistory,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDialogueHistory(data.dialogueHistory)
        setUserInput('')
      }
    } catch (error) {
      console.error('Teaching dialogue error:', error)
    } finally {
      setSophieThinking(false)
    }
  }

  const saveFinalLearning = async () => {
    if (!teachingAnalysisId) return

    try {
      const response = await fetch('/api/sophie-teaching-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: teachingAnalysisId,
          issueIndex: 0,
          action: 'save_learning',
          userMessage: userInput,
          dialogueHistory,
        }),
      })

      if (response.ok) {
        setTeachingMode(false)
        setDialogueHistory([])
        setTeachingAnalysisId(null)
        await fetchAnalyses()
        setExpandedCard(null)
      }
    } catch (error) {
      console.error('Save learning error:', error)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30 text-green-400'
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
    if (score >= 40) return 'bg-orange-500/20 border-orange-500/30 text-orange-400'
    return 'bg-red-500/20 border-red-500/30 text-red-400'
  }

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      critical: '🔴 CRITICAL',
      high: '🟠 HIGH',
      medium: '🟡 MEDIUM',
      low: '🟢 LOW',
    }
    return badges[priority] || badges.medium
  }

  const getIssueTypeLabel = (issueType: string) => {
    return issueType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  }

  // Sort by priority and score
  const sortedAnalyses = [...analyses].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2

    if (aPriority !== bPriority) return aPriority - bPriority
    return a.qualityScore - b.qualityScore
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 text-coldlava-cyan animate-spin" />
      </div>
    )
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="w-12 h-12 text-coldlava-cyan animate-spin" />
        <div className="text-white text-lg">Analyzing conversations...</div>
        <div className="text-gray-400 text-sm">This may take a minute</div>
      </div>
    )
  }

  if (sortedAnalyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <div className="text-white text-xl font-semibold">All conversations reviewed!</div>
        <div className="text-gray-400">No pending reviews at the moment</div>
        <button
          onClick={() => runBatchAnalysis(7)}
          className="mt-4 px-6 py-3 bg-coldlava-cyan hover:bg-coldlava-cyan/80 text-white rounded-lg font-medium"
        >
          Analyze Last 7 Days
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-red-400 text-sm font-medium">Critical</div>
          <div className="text-white text-2xl font-bold">
            {analyses.filter(a => a.priority === 'critical').length}
          </div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="text-orange-400 text-sm font-medium">High</div>
          <div className="text-white text-2xl font-bold">
            {analyses.filter(a => a.priority === 'high').length}
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="text-yellow-400 text-sm font-medium">Medium</div>
          <div className="text-white text-2xl font-bold">
            {analyses.filter(a => a.priority === 'medium').length}
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-green-400 text-sm font-medium">Good</div>
          <div className="text-white text-2xl font-bold">
            {analyses.filter(a => a.qualityScore >= 80).length}
          </div>
        </div>
      </div>

      {/* Conversation Cards Grid */}
      <div className="grid grid-cols-1 gap-3">
        {sortedAnalyses.map((analysis) => {
          const isExpanded = expandedCard === analysis._id

          return (
            <div
              key={analysis._id}
              className="bg-gray-800/50 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all"
            >
              {/* Card Header - Always Visible */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : analysis._id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Score Badge */}
                  <div className={`px-3 py-1 rounded-lg border ${getScoreColor(analysis.qualityScore)} font-bold text-2xl min-w-[80px] text-center`}>
                    {analysis.qualityScore}%
                  </div>

                  {/* Lead Info */}
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold text-lg">
                      {analysis.metadata.leadName}
                    </div>
                    <div className="text-gray-400 text-sm flex items-center gap-3">
                      <span>{getPriorityBadge(analysis.priority)}</span>
                      <span>•</span>
                      <span>{analysis.issuesIdentified?.length || 0} issues</span>
                      <span>•</span>
                      <span>{analysis.metadata.messageCount} messages</span>
                      <span>•</span>
                      <span>{analysis.metadata.leadStatus}</span>
                    </div>
                  </div>

                  {/* Top Issues Preview */}
                  {!isExpanded && analysis.issuesIdentified?.length > 0 && (
                    <div className="hidden lg:flex gap-2">
                      {analysis.issuesIdentified.slice(0, 3).map((issue, i) => (
                        <span key={i} className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
                          {getIssueTypeLabel(issue.issueType)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10 bg-gray-900/30 p-6 space-y-4">
                  {/* Assessment */}
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-blue-400 font-semibold mb-2">Sophie's Assessment:</div>
                    <p className="text-white text-sm leading-relaxed">{analysis.overallAssessment}</p>
                  </div>

                  {/* Issues */}
                  {analysis.issuesIdentified?.map((issue, index) => (
                    <div key={index} className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
                      <div className="text-red-400 font-semibold mb-2">
                        {getIssueTypeLabel(issue.issueType)} (Message #{issue.messageIndex})
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{issue.explanation}</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-red-400 font-semibold mb-1">❌ What AI Said:</div>
                          <div className="bg-red-900/20 rounded p-2 text-sm text-white">
                            "{issue.actualResponse}"
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-green-400 font-semibold mb-1">✅ Should Say:</div>
                          <div className="bg-green-900/20 rounded p-2 text-sm text-white">
                            "{issue.suggestedResponse}"
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Actions or Teaching Mode */}
                  {!teachingMode || teachingAnalysisId !== analysis._id ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => submitFeedback(analysis._id, 'agree')}
                        className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <ThumbsUp className="w-5 h-5" />
                        Agree & Learn
                      </button>
                      <button
                        onClick={() => submitFeedback(analysis._id, 'disagree')}
                        className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Disagree & Teach
                      </button>
                    </div>
                  ) : (
                    // Teaching Dialogue
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-purple-400 font-semibold">Teaching Sophie</div>
                        <button
                          onClick={() => {
                            setTeachingMode(false)
                            setDialogueHistory([])
                          }}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {dialogueHistory.length === 0 ? (
                          <div className="text-gray-400 text-sm text-center py-4">
                            Explain what you think the real issue is...
                          </div>
                        ) : (
                          dialogueHistory.map((msg, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded ${
                                msg.role === 'sophie'
                                  ? 'bg-purple-900/30 border border-purple-500/30'
                                  : 'bg-blue-900/30 border border-blue-500/30'
                              }`}
                            >
                              <div className="text-xs font-semibold mb-1 ${msg.role === 'sophie' ? 'text-purple-400' : 'text-blue-400'}">
                                {msg.role === 'sophie' ? '🤖 Sophie:' : '👤 You:'}
                              </div>
                              <div className="text-white text-sm">{msg.message}</div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !sophieThinking && sendTeachingMessage()}
                          placeholder={dialogueHistory.length === 0 ? "What's the real issue?" : "Continue..."}
                          className="flex-1 px-4 py-2 bg-gray-800 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          disabled={sophieThinking}
                        />
                        <button
                          onClick={sendTeachingMessage}
                          disabled={!userInput.trim() || sophieThinking}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50"
                        >
                          {sophieThinking ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {dialogueHistory.length > 2 && (
                        <button
                          onClick={saveFinalLearning}
                          className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                        >
                          ✅ Capture Agreed Learning
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
