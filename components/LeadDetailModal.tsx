'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface LeadDetailModalProps {
  leadId: string | null
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

export default function LeadDetailModal({ leadId, isOpen, onClose, onRefresh }: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && leadId) {
      fetchLead()
    }
  }, [isOpen, leadId])

  const fetchLead = async () => {
    if (!leadId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/lead/${leadId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch lead details')
      }

      const data = await response.json()
      setLead(data.lead)
    } catch (err) {
      console.error('Error fetching lead:', err)
      setError(err instanceof Error ? err.message : 'Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    // Add delay to allow Sanity to index the update before re-fetching
    setTimeout(() => {
      fetchLead()
    }, 500)

    // Immediately refresh parent dashboard
    if (onRefresh) {
      onRefresh()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-full border-2 border-white/20 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Modal content */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border-2 border-white/20 shadow-2xl p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-coldlava-cyan animate-spin" />
              <span className="ml-3 text-white">Loading lead details...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchLead}
                className="px-4 py-2 bg-coldlava-cyan hover:bg-coldlava-purple rounded-lg text-white font-semibold transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {lead && !loading && !error && (
            <LeadCard
              lead={lead}
              onRefresh={handleRefresh}
              expandedByDefault={true}
              showArchiveButton={true}
            />
          )}
        </div>
      </div>
    </div>
  )
}
