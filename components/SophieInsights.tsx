'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, TrendingUp, Activity, Settings, RefreshCw, ExternalLink, MessageSquare } from 'lucide-react'
import ConversationViewer from './ConversationViewer'

interface SophieInsightsProps {
  isOpen: boolean
  onClose: () => void
}

export default function SophieInsights({ isOpen, onClose }: SophieInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [conversationAnalysis, setConversationAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'issues' | 'patterns' | 'quality' | 'health'>('issues')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

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
    if (isOpen) {
      fetchInsights()
      const interval = setInterval(fetchInsights, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen])

  if (!isOpen) return null

  const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT') return 'from-red-500 to-orange-500'
    if (priority === 'WARNING') return 'from-yellow-500 to-orange-500'
    return 'from-blue-500 to-cyan-500'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'active') return '✅'
    if (status === 'warning') return '⚠️'
    if (status === 'monitoring') return '👁️'
    return '📊'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[800px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl z-50 overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-coldlava-cyan to-coldlava-purple p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🧠</span>
              Sophie's Intelligence HQ
            </h2>
            <p className="text-white/80 text-sm mt-1">
              Real-time monitoring and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchInsights}
              disabled={loading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="px-6 py-2 bg-black/20 text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 30s
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/20">
          <button
            onClick={() => setActiveTab('issues')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'issues'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertCircle className="w-5 h-5 inline mr-2" />
            Live Issues
            {insights?.criticalCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {insights.criticalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'patterns'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Patterns
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'quality'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-5 h-5 inline mr-2" />
            Quality
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'health'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-5 h-5 inline mr-2" />
            System
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-200px)] p-6">
          {loading && !insights ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 text-coldlava-cyan animate-spin" />
            </div>
          ) : (
            <>
              {/* LIVE ISSUES TAB */}
              {activeTab === 'issues' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Priority Alerts</h3>
                    <span className="text-sm text-gray-400">
                      {insights?.liveIssues?.length || 0} active
                    </span>
                  </div>

                  {insights?.liveIssues?.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className={`bg-gradient-to-r ${getPriorityColor(issue.priority)} p-0.5 rounded-xl`}
                    >
                      <div className="bg-gray-900 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{issue.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white">{issue.title}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                issue.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' :
                                issue.priority === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {issue.priority}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-3">{issue.description}</p>

                            {issue.leads && issue.leads.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {issue.leads.map((lead: any, i: number) => (
                                  <div key={i} className="bg-black/30 rounded-lg p-2 text-sm">
                                    <div className="font-medium text-white">{lead.name}</div>
                                    {lead.phone && (
                                      <div className="text-gray-400 text-xs">{lead.phone}</div>
                                    )}
                                    {lead.daysSinceUpdate && (
                                      <div className="text-orange-400 text-xs">
                                        {lead.daysSinceUpdate} days since update
                                      </div>
                                    )}
                                    {lead.lastReply && (
                                      <div className="text-gray-400 text-xs mt-1 italic">
                                        "{lead.lastReply}..."
                                      </div>
                                    )}
                                    {lead.callTime && (
                                      <div className="text-cyan-400 text-xs">
                                        Call: {new Date(lead.callTime).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {issue.action && (
                              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white font-medium transition-all flex items-center gap-2">
                                {issue.action}
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PATTERNS TAB */}
              {activeTab === 'patterns' && (
                <div className="space-y-6">
                  {/* Top Objections */}
                  {insights?.conversationPatterns?.topObjections?.length > 0 && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📊 Top Objections This Week
                      </h3>
                      <div className="space-y-3">
                        {insights.conversationPatterns.topObjections.map((obj: any, index: number) => (
                          <div key={index} className="bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium capitalize">{obj.objection.replace('_', ' ')}</span>
                              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-bold">
                                {obj.count} leads
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm">{obj.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Geographic Insights */}
                  {insights?.conversationPatterns?.topPostcodes && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        📍 Geographic Insights
                      </h3>
                      <div className="space-y-3">
                        {insights.conversationPatterns.topPostcodes.map((pc: any, index: number) => (
                          <div key={index} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                            <div>
                              <div className="text-white font-bold text-lg">{pc.area}</div>
                              <div className="text-gray-400 text-sm">{pc.total} leads</div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-400">{pc.conversionRate}%</div>
                              <div className="text-gray-400 text-xs">conversion</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timing Patterns */}
                  {insights?.conversationPatterns?.peakResponseTime && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        ⏰ Peak Response Time
                      </h3>
                      <div className="bg-gradient-to-r from-coldlava-cyan/20 to-coldlava-purple/20 rounded-lg p-6 text-center">
                        <div className="text-5xl font-bold text-white mb-2">
                          {insights.conversationPatterns.peakResponseTime.hour}:00
                        </div>
                        <div className="text-gray-400">
                          {insights.conversationPatterns.peakResponseTime.count} responses at this hour
                        </div>
                        <div className="mt-4 text-sm text-cyan-400">
                          💡 Schedule M2/M3 messages around this time
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QUALITY TAB */}
              {activeTab === 'quality' && insights?.qualityMetrics && (
                <div className="space-y-6">
                  {/* Quality Score */}
                  <div className="bg-black/40 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Conversation Quality Score</h3>
                    <div className="flex items-center gap-6">
                      <div className="relative w-32 h-32">
                        <svg className="transform -rotate-90 w-32 h-32">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-gray-700"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - insights.qualityMetrics.qualityScore / 100)}`}
                            className={`${
                              insights.qualityMetrics.qualityScore >= 80 ? 'text-green-500' :
                              insights.qualityMetrics.qualityScore >= 60 ? 'text-yellow-500' :
                              'text-red-500'
                            } transition-all duration-1000`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold text-white">
                            {insights.qualityMetrics.qualityScore}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reply Rate:</span>
                          <span className="text-white font-bold">{insights.qualityMetrics.replyRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Negative Rate:</span>
                          <span className="text-red-400 font-bold">{insights.qualityMetrics.negativeRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Booking Rate:</span>
                          <span className="text-green-400 font-bold">{insights.qualityMetrics.bookingRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Repeated Failures */}
                  {insights.qualityMetrics.repeatedFailures.length > 0 && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        ⚠️ Repeated Failures
                      </h3>
                      <div className="space-y-3">
                        {insights.qualityMetrics.repeatedFailures.map((failure: any, index: number) => (
                          <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium">{failure.issue}</span>
                              <span className="text-red-400 font-bold">{failure.count}x</span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">🔧 Fix: {failure.fix}</p>
                            <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                              Apply fix →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* What's Working */}
                  {insights.qualityMetrics.working.length > 0 && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        ✅ What's Working
                      </h3>
                      <div className="space-y-2">
                        {insights.qualityMetrics.working.map((item: any, index: number) => (
                          <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-white">{item.metric}</span>
                            <span className="text-green-400 text-sm font-medium">{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation Quality Issues */}
                  {conversationAnalysis && conversationAnalysis.analyzedConversations > 0 && (
                    <div className="bg-black/40 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Conversation Quality Issues
                        </h3>
                        <span className="text-red-400 font-bold">
                          {conversationAnalysis.analyzedConversations} conversations analyzed
                        </span>
                      </div>

                      <div className="space-y-3">
                        {conversationAnalysis.conversations.slice(0, 10).map((conv: any, index: number) => (
                          <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-white font-bold">{conv.leadName}</h4>
                                <p className="text-gray-400 text-xs">{conv.phoneNumber}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${
                                    conv.qualityScore >= 80 ? 'text-green-400' :
                                    conv.qualityScore >= 60 ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {conv.qualityScore}
                                  </div>
                                  <div className="text-xs text-gray-500">Quality</div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${
                                    conv.conversationOutcome === 'Call Booked' ? 'text-green-400' :
                                    conv.conversationOutcome === 'Positive Engagement' ? 'text-cyan-400' :
                                    conv.conversationOutcome === 'Negative Response' ? 'text-red-400' :
                                    'text-gray-400'
                                  }`}>
                                    {conv.conversationOutcome}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 mb-3">
                              {conv.insights.slice(0, 3).map((insight: any, issueIdx: number) => (
                                <div key={issueIdx} className="bg-black/30 rounded-lg p-3 text-sm">
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                      insight.type === 'success' ? 'bg-green-500/30 text-green-300' :
                                      insight.type === 'missed_opportunity' ? 'bg-orange-500/30 text-orange-300' :
                                      'bg-red-500/30 text-red-300'
                                    }`}>
                                      {insight.category}
                                    </span>
                                    <span className="text-white font-medium flex-1">{insight.title}</span>
                                  </div>
                                  {insight.whatWentWrong && (
                                    <p className="text-red-300 text-xs mt-2">❌ {insight.whatWentWrong}</p>
                                  )}
                                  {insight.howToImprove && (
                                    <p className="text-cyan-300 text-xs mt-1">💡 {insight.howToImprove}</p>
                                  )}
                                  {insight.whatWorked && (
                                    <p className="text-green-300 text-xs mt-2">✅ {insight.whatWorked}</p>
                                  )}
                                  {insight.learnFrom && (
                                    <p className="text-cyan-300 text-xs mt-1">📚 {insight.learnFrom}</p>
                                  )}
                                  {insight.impact && (
                                    <p className="text-gray-400 text-xs mt-1 italic">Impact: {insight.impact}</p>
                                  )}
                                </div>
                              ))}
                              {conv.insights.length > 3 && (
                                <p className="text-gray-500 text-xs text-center">+ {conv.insights.length - 3} more insights</p>
                              )}
                            </div>

                            <button
                              onClick={() => setSelectedLeadId(conv.leadId)}
                              className="w-full px-3 py-2 bg-coldlava-cyan/20 hover:bg-coldlava-cyan/30 rounded-lg text-sm text-cyan-400 font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              View Full Conversation
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {conversationAnalysis.issues.length > 10 && (
                        <p className="text-center text-gray-400 text-sm mt-4">
                          Showing 10 of {conversationAnalysis.issues.length} conversations with issues
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SYSTEM HEALTH TAB */}
              {activeTab === 'health' && insights?.systemHealth && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white mb-4">System Status</h3>

                  {/* Google Sheets Sync */}
                  <div className="bg-black/40 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getStatusIcon(insights.systemHealth.googleSheetsSync.status)}</span>
                        <div>
                          <h4 className="text-white font-bold">Google Sheets Sync</h4>
                          <p className="text-gray-400 text-sm">Last sync: {insights.systemHealth.googleSheetsSync.lastSync}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        insights.systemHealth.googleSheetsSync.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {insights.systemHealth.googleSheetsSync.status}
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm">
                      {insights.systemHealth.googleSheetsSync.recentUpdates} leads updated in last 10 minutes
                    </div>
                  </div>

                  {/* Sanity Database */}
                  <div className="bg-black/40 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <h4 className="text-white font-bold">Sanity Database</h4>
                          <p className="text-gray-400 text-sm">Connected and operational</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                        active
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Leads:</span>
                        <span className="text-white font-bold ml-2">{insights.systemHealth.sanityDatabase.totalLeads}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Active:</span>
                        <span className="text-green-400 font-bold ml-2">{insights.systemHealth.sanityDatabase.activeLeads}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sophie AI */}
                  <div className="bg-black/40 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🧠</span>
                        <div>
                          <h4 className="text-white font-bold">Sophie AI Engine</h4>
                          <p className="text-gray-400 text-sm">
                            Monitoring {insights.systemHealth.sophieAI.leadsAnalyzed} conversations
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-400">
                        {insights.systemHealth.sophieAI.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Conversation Viewer Modal */}
      <ConversationViewer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
