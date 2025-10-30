'use client'

import { useState } from 'react'
import { Brain, BookOpen, FileText, ArrowLeft, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import SophieQualityMonitor from '@/components/SophieQualityMonitor'
import SophieLearningLog from '@/components/SophieLearningLog'
import SophiePromptImprovement from '@/components/SophiePromptImprovement'

export default function SophieHQPage() {
  const [activeView, setActiveView] = useState<'monitor' | 'prompt' | 'learning'>('monitor')
  const [learningLogOpen, setLearningLogOpen] = useState(false)

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
                Conversation Quality Monitoring • Real-time Analysis • Continuous Learning
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-black/30 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto flex items-center gap-2 px-6">
          <button
            onClick={() => setActiveView('monitor')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'monitor'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-5 h-5" />
            Quality Monitor
          </button>
          <button
            onClick={() => setActiveView('prompt')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'prompt'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-5 h-5" />
            Prompt Updates
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`px-6 py-4 font-medium transition-all flex items-center gap-2 ${
              activeView === 'learning'
                ? 'text-white border-b-2 border-coldlava-cyan bg-coldlava-cyan/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Learning Archive
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto p-6 pb-24">
        {activeView === 'monitor' && <SophieQualityMonitor />}

        {activeView === 'prompt' && (
          <div className="h-[calc(100vh-220px)]">
            <SophiePromptImprovement />
          </div>
        )}

        {activeView === 'learning' && (
          <div className="bg-gray-800/50 rounded-xl border border-white/10 p-6">
            <SophieLearningLog />
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
