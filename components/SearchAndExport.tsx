'use client'

import { Search, Download, Filter, Phone, Mail, MapPin, X } from 'lucide-react'
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

interface SearchAndExportProps {
  onSearch?: (query: string) => void
  onExport?: () => void
  onResultClick?: (leadId: string, contactStatus: string) => void
  totalRecords?: number
}

export default function SearchAndExport({
  onSearch,
  onExport,
  onResultClick,
  totalRecords = 0,
}: SearchAndExportProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
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

  // Debounced search
  useEffect(() => {
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
  }, [searchQuery])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result._id, result.contactStatus)
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])
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
    <div className="flex items-center gap-4 mb-6">
      {/* Search bar with dropdown */}
      <div className="flex-1 relative" ref={searchRef}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="w-full pl-12 pr-10 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl
                   focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/20
                   transition-all duration-300 text-gray-900 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSearchResults([])
              setShowResults(false)
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-coldlava-cyan/30 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 animate-fade-in">
            {searchResults.map((result) => (
              <button
                key={result._id}
                onClick={() => handleResultClick(result)}
                className="w-full p-4 hover:bg-coldlava-cyan/10 transition-colors border-b border-gray-100 last:border-b-0 text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-coldlava-cyan transition-colors">
                        {result.firstName} {result.secondName}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusColor(result.contactStatus)} text-white whitespace-nowrap`}>
                        {result.contactStatus}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
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

        {/* Searching indicator */}
        {searching && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500 text-sm">
            Searching...
          </div>
        )}

        {/* No results */}
        {showResults && !searching && searchResults.length === 0 && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-500 text-sm">
            No results found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Filter button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="px-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl
                 hover:border-coldlava-purple hover:bg-purple-50 transition-all duration-300
                 flex items-center gap-2 text-gray-700 font-medium"
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
  )
}
