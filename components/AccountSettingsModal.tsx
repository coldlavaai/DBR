'use client'

import { useState, useEffect } from 'react'
import { X, Save, RotateCcw, Settings, Layout, Clock, BarChart3, Eye, EyeOff, GripVertical, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

interface UserPreferences {
  sectionOrder: string[]
  sectionsExpanded: Record<string, boolean>
  sectionsVisible: Record<string, boolean>
  defaultTimeRange: 'today' | 'week' | 'month' | 'all'
  autoRefreshEnabled: boolean
  autoRefreshInterval: number
  visibleMetricCards: string[]
  isDefault?: boolean
}

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentPreferences: UserPreferences
  onSave: (preferences: UserPreferences) => void
}

const sectionLabels: Record<string, string> = {
  hotLeads: '🔥 Hot Leads',
  warmLeads: '🟠 Warm Leads',
  upcomingCalls: '📅 Upcoming Calls',
  allBookedCalls: '📞 All Booked Calls',
  recentActivity: '🔔 Recent Activity',
  leadStatusBuckets: '📊 Lead Status Buckets',
  sentimentAnalysis: '😊 Sentiment Analysis',
  statusBreakdown: '📈 Status Breakdown',
  archivedLeads: '🗄️ Archive',
}

const metricCardLabels: Record<string, string> = {
  totalLeads: '👥 Total Leads',
  messagesSent: '💬 Messages Sent',
  replyRate: '📈 Reply Rate',
  hotLeads: '🔥 Hot Leads',
  avgResponse: '⏱️ Avg Response Time',
  callsBooked: '🎯 Total Calls Booked',
  upcomingCalls: '📅 Upcoming Calls',
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  currentPreferences,
  onSave,
}: AccountSettingsModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'layout' | 'dashboard' | 'metrics'>('layout')
  const [preferences, setPreferences] = useState<UserPreferences>(currentPreferences)
  const [saving, setSaving] = useState(false)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setPreferences(currentPreferences)
  }, [currentPreferences])

  const handleSave = async () => {
    setSaving(true)
    await onSave(preferences)
    setSaving(false)
  }

  const resetToDefaults = () => {
    setPreferences({
      sectionOrder: ['hotLeads', 'warmLeads', 'upcomingCalls', 'allBookedCalls', 'recentActivity', 'leadStatusBuckets', 'sentimentAnalysis', 'statusBreakdown', 'archivedLeads'],
      sectionsExpanded: {
        hotLeads: true,
        warmLeads: true,
        upcomingCalls: true,
        allBookedCalls: true,
        recentActivity: true,
        leadStatusBuckets: true,
        sentimentAnalysis: true,
        statusBreakdown: true,
        archivedLeads: false,
      },
      sectionsVisible: {
        hotLeads: true,
        warmLeads: true,
        upcomingCalls: true,
        allBookedCalls: true,
        recentActivity: true,
        leadStatusBuckets: true,
        sentimentAnalysis: true,
        statusBreakdown: true,
        archivedLeads: true,
      },
      defaultTimeRange: 'all',
      autoRefreshEnabled: true,
      autoRefreshInterval: 30,
      visibleMetricCards: ['totalLeads', 'messagesSent', 'replyRate', 'hotLeads', 'avgResponse', 'callsBooked', 'upcomingCalls'],
    })
  }

  const handleDragStart = (sectionId: string) => {
    setDraggedSection(sectionId)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedSection || draggedSection === targetId) return

    const newOrder = [...preferences.sectionOrder]
    const draggedIndex = newOrder.indexOf(draggedSection)
    const targetIndex = newOrder.indexOf(targetId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedSection)

    setPreferences({ ...preferences, sectionOrder: newOrder })
  }

  const handleDragEnd = () => {
    setDraggedSection(null)
  }

  const toggleSectionVisibility = (sectionId: string) => {
    setPreferences({
      ...preferences,
      sectionsVisible: {
        ...preferences.sectionsVisible,
        [sectionId]: !preferences.sectionsVisible[sectionId],
      },
    })
  }

  const toggleSectionExpanded = (sectionId: string) => {
    setPreferences({
      ...preferences,
      sectionsExpanded: {
        ...preferences.sectionsExpanded,
        [sectionId]: !preferences.sectionsExpanded[sectionId],
      },
    })
  }

  const toggleMetricCard = (cardId: string) => {
    const isVisible = preferences.visibleMetricCards.includes(cardId)
    setPreferences({
      ...preferences,
      visibleMetricCards: isVisible
        ? preferences.visibleMetricCards.filter(id => id !== cardId)
        : [...preferences.visibleMetricCards, cardId],
    })
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-coldlava-cyan" />
            <h2 className="text-2xl font-bold text-white">Account Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-white/10 bg-black/20">
          {[
            { id: 'layout' as const, label: 'Layout', icon: Layout },
            { id: 'dashboard' as const, label: 'Dashboard', icon: Clock },
            { id: 'metrics' as const, label: 'Metrics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-pink text-white shadow-lg'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Section Order & Visibility</h3>
                <p className="text-sm text-gray-400 mb-4">Drag to reorder, toggle visibility and default state</p>

                <div className="space-y-2">
                  {preferences.sectionOrder.map((sectionId) => (
                    <div
                      key={sectionId}
                      draggable
                      onDragStart={() => handleDragStart(sectionId)}
                      onDragOver={(e) => handleDragOver(e, sectionId)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 cursor-move transition-all ${
                        draggedSection === sectionId ? 'opacity-50' : ''
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 text-white font-medium">{sectionLabels[sectionId]}</span>

                      <button
                        onClick={() => toggleSectionExpanded(sectionId)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                          preferences.sectionsExpanded[sectionId]
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}
                      >
                        {preferences.sectionsExpanded[sectionId] ? 'Expanded' : 'Collapsed'}
                      </button>

                      <button
                        onClick={() => toggleSectionVisibility(sectionId)}
                        className={`p-2 rounded-lg transition-colors ${
                          preferences.sectionsVisible[sectionId]
                            ? 'bg-coldlava-cyan/20 text-coldlava-cyan'
                            : 'bg-gray-600/20 text-gray-400'
                        }`}
                      >
                        {preferences.sectionsVisible[sectionId] ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Default Time Range</h3>
                <p className="text-sm text-gray-400 mb-4">Set your preferred default filter</p>

                <div className="grid grid-cols-4 gap-2">
                  {(['today', 'week', 'month', 'all'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setPreferences({ ...preferences, defaultTimeRange: range })}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        preferences.defaultTimeRange === range
                          ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-pink text-white shadow-lg scale-105'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Auto-Refresh</h3>
                <p className="text-sm text-gray-400 mb-4">Configure automatic dashboard updates</p>

                <div className="flex items-center gap-4 mb-4">
                  <span className="text-white">Enable Auto-Refresh:</span>
                  <button
                    onClick={() =>
                      setPreferences({ ...preferences, autoRefreshEnabled: !preferences.autoRefreshEnabled })
                    }
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                      preferences.autoRefreshEnabled ? 'bg-coldlava-cyan' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                        preferences.autoRefreshEnabled ? 'translate-x-7' : ''
                      }`}
                    />
                  </button>
                </div>

                {preferences.autoRefreshEnabled && (
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 30, 60, 0].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setPreferences({ ...preferences, autoRefreshInterval: interval })}
                        className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                          preferences.autoRefreshInterval === interval
                            ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-pink text-white shadow-lg'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {interval === 0 ? 'Off' : `${interval}s`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Visible Metric Cards</h3>
                <p className="text-sm text-gray-400 mb-4">Choose which metrics to display at the top of your dashboard</p>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(metricCardLabels).map(([cardId, label]) => {
                    const isVisible = preferences.visibleMetricCards.includes(cardId)
                    return (
                      <button
                        key={cardId}
                        onClick={() => toggleMetricCard(cardId)}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          isVisible
                            ? 'bg-gradient-to-r from-coldlava-cyan/20 to-coldlava-pink/20 border-2 border-coldlava-cyan/50'
                            : 'bg-white/5 border-2 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className={`font-medium ${isVisible ? 'text-white' : 'text-gray-400'}`}>
                          {label}
                        </span>
                        {isVisible && <Check className="w-5 h-5 text-coldlava-cyan" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-black/20">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-coldlava-cyan to-coldlava-pink hover:opacity-90 rounded-lg text-white font-semibold transition-opacity disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
