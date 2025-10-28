'use client'

import { useEffect, useState } from 'react'
import LeadCard, { Lead } from './LeadCard'

interface LeadsModalProps {
  isOpen: boolean
  onClose: () => void
  filterType: string
  filterLabel: string
  timeRange: string
}

export default function LeadsModal({ isOpen, onClose, filterType, filterLabel, timeRange }: LeadsModalProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchLeads()
    }
  }, [isOpen, filterType, timeRange])

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  async function fetchLeads() {
    setLoading(true)
    try {
      const response = await fetch(`/api/dbr-leads?filter=${filterType}&timeRange=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch leads')
      const data = await response.json()
      setLeads(data.leads)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-y-0 right-0 max-w-4xl w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl flex flex-col border-l-2 border-coldlava-cyan/30">
        {/* Header */}
        <div className="bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b-2 border-coldlava-cyan/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <div className="w-1 h-8 bg-gradient-to-b from-coldlava-cyan to-coldlava-purple rounded-full" />
              {filterLabel}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {loading ? 'Loading...' : `${leads.length} lead${leads.length !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple text-white rounded-lg hover:scale-105 transition-transform text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coldlava-cyan"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No leads found for this category
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <LeadCard
                  key={lead._id}
                  lead={lead}
                  onRefresh={fetchLeads}
                  showArchiveButton={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
