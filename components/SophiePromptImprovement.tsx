'use client'

import { useState, useEffect } from 'react'
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Eye, EyeOff, Copy, Send, RefreshCw } from 'lucide-react'

interface PromptSuggestion {
  id: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  section: 'NEW SECTION' | 'REPLACE EXISTING' | 'ENHANCE EXISTING'
  learningCount: number
  evidence: string[]
  currentText: string | null
  suggestedAddition?: string
  suggestedReplacement?: string
  reasoning: string
}

interface SuggestionsData {
  suggestions: PromptSuggestion[]
  totalLearnings: number
  categoryCounts: Record<string, number>
}

export default function SophiePromptImprovement() {
  const [data, setData] = useState<SuggestionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSuggestion, setSelectedSuggestion] = useState<PromptSuggestion | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [approvedSuggestions, setApprovedSuggestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sophie-prompt-suggestions')
      if (response.ok) {
        const result = await response.json()
        setData(result)
        if (result.suggestions.length > 0) {
          setSelectedSuggestion(result.suggestions[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
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

  const getSectionBadge = (section: string) => {
    const badges: Record<string, { bg: string, text: string }> = {
      'NEW SECTION': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      'REPLACE EXISTING': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      'ENHANCE EXISTING': { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    }
    const badge = badges[section] || badges['NEW SECTION']
    return (
      <span className={`px-2 py-1 rounded-lg ${badge.bg} ${badge.text} text-xs font-medium`}>
        {section}
      </span>
    )
  }

  const toggleApproval = (suggestionId: string) => {
    const newApproved = new Set(approvedSuggestions)
    if (newApproved.has(suggestionId)) {
      newApproved.delete(suggestionId)
    } else {
      newApproved.add(suggestionId)
    }
    setApprovedSuggestions(newApproved)
  }

  const buildFinalPrompt = () => {
    if (!data) return ''

    const approvedChanges = data.suggestions.filter(s => approvedSuggestions.has(s.id))

    // Build the enhanced prompt with approved suggestions
    let prompt = `[EXISTING PROMPT SECTIONS - PRESERVED]\n\n`

    approvedChanges.forEach(suggestion => {
      if (suggestion.section === 'NEW SECTION') {
        prompt += `\n${suggestion.suggestedAddition}\n`
      } else if (suggestion.section === 'REPLACE EXISTING') {
        prompt += `\n[REPLACING: ${suggestion.title}]\n${suggestion.suggestedReplacement}\n`
      }
    })

    return prompt
  }

  const copyToClipboard = () => {
    const prompt = buildFinalPrompt()
    navigator.clipboard.writeText(prompt)
    alert('✅ Prompt copied to clipboard!')
  }

  const updateN8n = async () => {
    const confirmed = confirm(
      `Update n8n workflow with ${approvedSuggestions.size} approved improvements?\n\n` +
      `This will preserve all existing functionality and add new sections.`
    )

    if (!confirmed) return

    alert('🚧 n8n API integration coming soon!\n\nFor now, use "Copy to Clipboard" and paste manually into n8n.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading prompt suggestions...</div>
      </div>
    )
  }

  if (!data || data.suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FileText className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Prompt Suggestions Yet</h3>
        <p className="text-gray-400 max-w-md">
          Start reviewing conversations in the Quality Insights tab and agreeing with Sophie's analysis.
          Once you've captured enough learnings, prompt improvement suggestions will appear here.
        </p>
        <button
          onClick={fetchSuggestions}
          className="mt-6 px-4 py-2 bg-coldlava-cyan hover:bg-coldlava-cyan/80 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex gap-6">
      {/* Left Panel: Suggestions List */}
      <div className="w-1/3 flex flex-col gap-4">
        {/* Header */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-2">Prompt Improvements</h3>
          <div className="text-sm text-gray-400 mb-3">
            Based on {data.totalLearnings} learnings from real conversations
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {approvedSuggestions.size} / {data.suggestions.length} approved
            </span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-coldlava-cyan hover:text-coldlava-cyan/80 flex items-center gap-1"
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {data.suggestions.map((suggestion) => {
            const isApproved = approvedSuggestions.has(suggestion.id)
            const isSelected = selectedSuggestion?.id === suggestion.id

            return (
              <button
                key={suggestion.id}
                onClick={() => setSelectedSuggestion(suggestion)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-coldlava-cyan/20 border-2 border-coldlava-cyan'
                    : 'bg-gray-800/50 border border-white/10 hover:bg-gray-800/80'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-white mb-1">
                      {suggestion.title}
                    </div>
                    <div className="flex gap-2 mb-2">
                      {getPriorityBadge(suggestion.priority)}
                      {getSectionBadge(suggestion.section)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleApproval(suggestion.id)
                    }}
                    className={`ml-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      isApproved
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {isApproved && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  {suggestion.learningCount} learnings • {suggestion.evidence.length} examples
                </div>
              </button>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={copyToClipboard}
            disabled={approvedSuggestions.size === 0}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Copy className="w-5 h-5" />
            Copy to Clipboard ({approvedSuggestions.size} approved)
          </button>
          <button
            onClick={updateN8n}
            disabled={approvedSuggestions.size === 0}
            className="w-full px-4 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
            Update n8n Workflow
          </button>
        </div>
      </div>

      {/* Right Panel: Detailed View */}
      <div className="flex-1 bg-gray-800/50 rounded-xl border border-white/10 overflow-hidden flex flex-col">
        {selectedSuggestion ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {selectedSuggestion.title}
                  </h3>
                  <div className="flex gap-2 mb-3">
                    {getPriorityBadge(selectedSuggestion.priority)}
                    {getSectionBadge(selectedSuggestion.section)}
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                <div className="text-blue-400 text-sm font-semibold mb-1">Why this matters:</div>
                <p className="text-white text-sm">{selectedSuggestion.reasoning}</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Evidence */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="text-coldlava-cyan font-semibold mb-2">
                  📊 Evidence ({selectedSuggestion.learningCount} learnings):
                </div>
                <ul className="space-y-1">
                  {selectedSuggestion.evidence.map((item, i) => (
                    <li key={i} className="text-gray-400 text-sm flex gap-2">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Current vs Suggested */}
              {selectedSuggestion.currentText && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-red-400 font-semibold mb-2">
                      ❌ Current (Will be replaced):
                    </div>
                    <div className="bg-red-900/20 rounded-lg p-4 text-sm text-white leading-relaxed font-mono whitespace-pre-wrap border border-red-500/20">
                      {selectedSuggestion.currentText}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-green-400 font-semibold mb-2">
                      ✅ Suggested Replacement:
                    </div>
                    <div className="bg-green-900/20 rounded-lg p-4 text-sm text-white leading-relaxed font-mono whitespace-pre-wrap border border-green-500/20">
                      {selectedSuggestion.suggestedReplacement}
                    </div>
                  </div>
                </div>
              )}

              {/* New Addition */}
              {selectedSuggestion.suggestedAddition && !selectedSuggestion.currentText && (
                <div>
                  <div className="text-xs text-green-400 font-semibold mb-2">
                    ✅ New Section to Add:
                  </div>
                  <div className="bg-green-900/20 rounded-lg p-4 text-sm text-white leading-relaxed font-mono whitespace-pre-wrap border border-green-500/20">
                    {selectedSuggestion.suggestedAddition}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a suggestion to review
          </div>
        )}
      </div>

      {/* Preview Panel (Conditional) */}
      {showPreview && (
        <div className="w-1/3 bg-gray-900/80 rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-coldlava-cyan/20 to-coldlava-purple/20">
            <h3 className="text-lg font-bold text-white">Final Prompt Preview</h3>
            <p className="text-xs text-gray-400 mt-1">
              {approvedSuggestions.size} improvements approved
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {buildFinalPrompt()}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
