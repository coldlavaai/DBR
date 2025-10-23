'use client'

import { useState } from 'react'
import { X, Calendar, Clock, User, Phone, Mail, Loader2 } from 'lucide-react'

interface BookCallModalProps {
  lead: {
    _id: string
    firstName: string
    secondName: string
    phoneNumber: string
    emailAddress?: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BookCallModal({ lead, isOpen, onClose, onSuccess }: BookCallModalProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time')
      return
    }

    setIsBooking(true)
    setError(null)

    try {
      // Combine date and time into ISO format
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)

      const response = await fetch('/api/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead._id,
          name: `${lead.firstName} ${lead.secondName}`,
          email: lead.emailAddress || `${lead.phoneNumber}@placeholder.com`,
          phone: lead.phoneNumber,
          startTime: startDateTime.toISOString(),
          notes: notes || `DBR follow-up call for ${lead.firstName} ${lead.secondName}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book call')
      }

      // Success - close modal and refresh
      if (onSuccess) {
        onSuccess()
      }
      onClose()
      alert(`Call booked successfully for ${lead.firstName}! Check your Cal.com calendar.`)
    } catch (error) {
      console.error('Booking error:', error)
      setError(error instanceof Error ? error.message : 'Failed to book call')
    } finally {
      setIsBooking(false)
    }
  }

  // Generate time slots (9 AM - 5 PM, 15-minute intervals)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 17 && minute > 0) break // Stop at 5:00 PM
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        slots.push({ value: timeStr, label: displayTime })
      }
    }
    return slots
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  // Get maximum date (30 days from now)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-coldlava-cyan/50 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Calendar className="w-7 h-7" />
              Book Call
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Lead Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Lead Details</h3>
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-coldlava-cyan" />
              <span className="font-semibold">{lead.firstName} {lead.secondName}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Phone className="w-4 h-4 text-coldlava-purple" />
              <span>{lead.phoneNumber}</span>
            </div>
            {lead.emailAddress && (
              <div className="flex items-center gap-2 text-gray-300">
                <Mail className="w-4 h-4 text-coldlava-pink" />
                <span>{lead.emailAddress}</span>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              <Calendar className="w-4 h-4 inline mr-2" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              max={maxDateStr}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/50 transition-all"
            />
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              <Clock className="w-4 h-4 inline mr-2" />
              Select Time (15-minute Introduction Call)
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/50 transition-all"
            >
              <option value="" className="bg-gray-800">Select a time...</option>
              {generateTimeSlots().map(slot => (
                <option key={slot.value} value={slot.value} className="bg-gray-800">
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific topics to discuss..."
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:border-coldlava-cyan focus:outline-none focus:ring-2 focus:ring-coldlava-cyan/50 transition-all resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={isBooking}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleBooking}
              disabled={isBooking || !selectedDate || !selectedTime}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-coldlava-cyan to-coldlava-purple hover:shadow-lg hover:shadow-coldlava-cyan/50 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Book Call
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
