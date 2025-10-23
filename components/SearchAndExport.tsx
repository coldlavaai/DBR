'use client'

import { Search, Download, Filter } from 'lucide-react'
import { useState } from 'react'

interface SearchAndExportProps {
  onSearch?: (query: string) => void
  onExport?: () => void
  totalRecords?: number
}

export default function SearchAndExport({
  onSearch,
  onExport,
  totalRecords = 0,
}: SearchAndExportProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* Search bar */}
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone, status..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl
                   focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/20
                   transition-all duration-300 text-gray-900 placeholder-gray-400"
        />
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
