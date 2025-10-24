'use client'

import { useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import LeadCard, { Lead } from './LeadCard'

interface ArchivedHotLeadsSectionProps {
  leads: Lead[]
  onUnarchive?: () => void
}

export default function ArchivedHotLeadsSection({ leads, onUnarchive }: ArchivedHotLeadsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unarchiving, setUnarchiving] = useState<string | null>(null)

  const handleUnarchive = async (leadId: string, leadName: string) => {
    if (!confirm(`Unarchive ${leadName}? This will move them back to active leads.`)) {
      return
    }

    setUnarchiving(leadId)

    try {
      const response = await fetch('/api/archive-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, archived: false })
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive lead')
      }

      // Call the refresh callback
      if (onUnarchive) {
        onUnarchive()
      }
    } catch (error) {
      console.error('Error unarchiving lead:', error)
      alert('Failed to unarchive lead. Please try again.')
    } finally {
      setUnarchiving(null)
    }
  }

  if (leads.length === 0) {
    return null // Don't show the section if there are no archived leads
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Archive className="w-6 h-6 text-gray-400" />
          <h3 className="text-xl font-bold text-white">
            Archived Leads ({leads.length})
          </h3>
        </div>
        <ArchiveRestore className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-6 pt-0 space-y-4 animate-fade-in border-t border-white/10">
          {leads.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              onRefresh={onUnarchive}
              onArchive={handleUnarchive}
              showArchiveButton={true}
              isArchived={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
