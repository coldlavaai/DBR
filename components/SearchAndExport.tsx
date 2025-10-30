'use client'

import { Search, Download, Filter, Phone, Mail, MapPin, X, Sparkles, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface SearchResult {
  _id: string
  firstName: string
  secondName: string
  phoneNumber: string
  emailAddress?: string
  contactStatus: string
  leadSentiment?: string
  postcode?: string
}

interface AIResponse {
  answer: string
  model?: string
  timestamp?: string
}

interface SearchAndExportProps {
  onSearch?: (query: string) => void
  onExport?: () => void
  onResultClick?: (leadId: string, contactStatus: string) => void
  totalRecords?: number
}

const SUGGESTED_QUESTIONS = [
  "How are we performing today?",
  "Who should I contact right now?",
  "What are the most common objections?",
  "Compare this week to last week",
  "Show me my hottest leads"
]

export default function SearchAndExport({
  onSearch,
  onExport,
  onResultClick,
  totalRecords = 0,
}: SearchAndExportProps) {
  const [mode, setMode] = useState<'search' | 'ai'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search for lead search mode
  useEffect(() => {
    if (mode !== 'search') return

    if (searchQuery.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/search-leads?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.leads || [])
          setShowResults(true)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, mode])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setAiResponse(null)
    setAiError(null)
    onSearch?.(value)
  }

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result._id, result.contactStatus)
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])
  }

  const handleAIQuery = async (question?: string) => {
    const query = question || searchQuery
    if (!query || query.trim().length === 0) return

    setAiLoading(true)
    setAiError(null)
    setAiResponse(null)

    try {
      const response = await fetch('/api/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context: {} })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process query')
      }

      const data = await response.json()
      setAiResponse(data)
      setShowResults(true)
    } catch (error: any) {
      console.error('AI query error:', error)
      setAiError(error.message || 'Failed to process your question. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && mode === 'ai' && !aiLoading) {
      handleAIQuery()
    }
  }

  const clearAll = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    setAiResponse(null)
    setAiError(null)
  }

  const getStatusColor = (status: string) => {
    if (status === 'HOT') return 'from-orange-400 to-red-500'
    if (status === 'CALL_BOOKED') return 'from-purple-400 to-pink-500'
    if (status === 'WARM') return 'from-yellow-400 to-orange-400'
    if (status === 'POSITIVE') return 'from-green-400 to-emerald-500'
    if (status === 'CONVERTED') return 'from-emerald-400 to-teal-500'
    return 'from-gray-400 to-slate-500'
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => {
            setMode('search')
            clearAll()
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
            mode === 'search'
              ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          Search Leads
        </button>
        <button
          onClick={() => {
            setMode('ai')
            clearAll()
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
            mode === 'ai'
              ? 'bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Ask AI
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Search/AI Input */}
        <div className="flex-1 relative" ref={searchRef}>
          {mode === 'search' ? (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coldlava-cyan z-10" />
          ) : (
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-coldlava-cyan z-10" />
          )}
          <input
            type="text"
            placeholder={
              mode === 'search'
                ? 'Search by name, phone, or email...'
                : 'Ask anything about your leads and performance...'
            }
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => (mode === 'search' && searchResults.length > 0) && setShowResults(true)}
            onKeyPress={handleKeyPress}
            className="w-full pl-12 pr-10 py-3 bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl
                     focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/20
                     transition-all duration-300 text-white placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={clearAll}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* AI Suggested Questions */}
          {mode === 'ai' && !searchQuery && !aiResponse && !aiLoading && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-coldlava-cyan/30 rounded-xl shadow-2xl p-4 z-50 animate-fade-in">
              <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Quick Questions:</p>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(question)
                      handleAIQuery(question)
                    }}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-coldlava-cyan/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 border border-white/10 hover:border-coldlava-cyan/50"
                  >
                    • {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lead Search Results */}
          {mode === 'search' && showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-coldlava-cyan/30 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 animate-fade-in">
              {searchResults.map((result) => (
                <button
                  key={result._id}
                  onClick={() => handleResultClick(result)}
                  className="w-full p-4 hover:bg-coldlava-cyan/20 transition-colors border-b border-white/10 last:border-b-0 text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white group-hover:text-coldlava-cyan transition-colors">
                          {result.firstName} {result.secondName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor(result.contactStatus)} text-white whitespace-nowrap`}>
                          {result.contactStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {result.phoneNumber}
                        </span>
                        {result.emailAddress && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {result.emailAddress}
                          </span>
                        )}
                        {result.postcode && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {result.postcode}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-coldlava-cyan opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      View →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* AI Response */}
          {mode === 'ai' && showResults && aiResponse && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-coldlava-cyan/30 rounded-xl shadow-2xl p-6 z-50 animate-fade-in max-h-96 overflow-y-auto">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">AI Assistant</h4>
                  <p className="text-xs text-gray-400">Powered by Claude</p>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">{aiResponse.answer}</div>
              </div>
              <button
                onClick={clearAll}
                className="mt-4 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Ask another question
              </button>
            </div>
          )}

          {/* Loading States */}
          {searching && mode === 'search' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-lg p-4 text-center text-gray-400 text-sm">
              Searching...
            </div>
          )}

          {aiLoading && mode === 'ai' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-coldlava-cyan/30 rounded-xl shadow-lg p-6 text-center z-50 animate-fade-in">
              <Loader2 className="w-6 h-6 text-coldlava-cyan animate-spin mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Analyzing your data...</p>
            </div>
          )}

          {/* Error State */}
          {aiError && mode === 'ai' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-red-500/30 rounded-xl shadow-lg p-4 text-center z-50 animate-fade-in">
              <p className="text-red-400 text-sm mb-2">{aiError}</p>
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* No Results */}
          {mode === 'search' && showResults && !searching && searchResults.length === 0 && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-lg p-4 text-center text-gray-400 text-sm">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl
                   hover:border-coldlava-purple hover:bg-purple-500/10 transition-all duration-300
                   flex items-center gap-2 text-gray-300 hover:text-white font-medium"
        >
          <Filter className="w-5 h-5" />
          Filters
        </button>

        {/* Export button */}
        {onExport && (
          <button
            onClick={onExport}
            className="px-6 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white rounded-xl
                     hover:shadow-lg hover:scale-105 transition-all duration-300
                     flex items-center gap-2 font-semibold"
          >
            <Download className="w-5 h-5" />
            Export ({totalRecords})
          </button>
        )}
      </div>
    </div>
  )
}
