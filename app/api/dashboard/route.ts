import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

/**
 * UNIFIED DASHBOARD ENDPOINT
 *
 * Replaces 7 separate endpoints with ONE optimized query:
 * - /api/dbr-analytics
 * - /api/hot-leads
 * - /api/warm-leads
 * - /api/call-booked-leads
 * - /api/all-booked-calls
 * - /api/archived-leads
 * - /api/recent-activity
 *
 * Performance: 7 queries → 1 query = 5-7× faster
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'all'

    // SINGLE QUERY - Fetch ALL leads once
    const allLeads = await sanityClient.fetch(
      `*[_type == "dbrLead"] | order(_createdAt desc) {
        _id,
        firstName,
        secondName,
        phoneNumber,
        emailAddress,
        postcode,
        address,
        contactStatus,
        leadSentiment,
        conversationHistory,
        latestLeadReply,
        m1Sent,
        m2Sent,
        m3Sent,
        replyReceived,
        notes,
        installDate,
        callBookedTime,
        manualMode,
        archived,
        archivedAt,
        _createdAt,
        enquiryDate
      }`
    )

    // Apply time filter if needed
    let filteredLeads = allLeads
    if (timeRange !== 'all') {
      const now = new Date()
      let cutoffDate: Date

      switch (timeRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          cutoffDate = new Date(0)
      }

      filteredLeads = allLeads.filter((lead: any) => {
        const createdAt = new Date(lead._createdAt || lead.enquiryDate || 0)
        return createdAt >= cutoffDate
      })
    }

    // FILTER IN MEMORY - Much faster than separate queries
    const activeLeads = filteredLeads.filter((l: any) => !l.archived)
    const archivedLeads = filteredLeads.filter((l: any) => l.archived)

    const hotLeads = activeLeads.filter((l: any) => l.contactStatus === 'HOT')
    const warmLeads = activeLeads.filter((l: any) => l.contactStatus === 'WARM')

    // Upcoming calls (future only)
    const now = new Date().toISOString()
    const callBookedLeads = activeLeads.filter((l: any) =>
      l.contactStatus === 'CALL_BOOKED' &&
      l.callBookedTime &&
      l.callBookedTime > now
    ).sort((a: any, b: any) =>
      (a.callBookedTime || '').localeCompare(b.callBookedTime || '')
    )

    // All booked calls (past and future)
    const allBookedCalls = activeLeads.filter((l: any) =>
      l.contactStatus === 'CALL_BOOKED'
    ).sort((a: any, b: any) =>
      (b.callBookedTime || '').localeCompare(a.callBookedTime || '')
    )

    // Recent activity (leads with recent replies)
    const recentActivity = activeLeads
      .filter((l: any) => l.replyReceived)
      .sort((a: any, b: any) =>
        (b.replyReceived || '').localeCompare(a.replyReceived || '')
      )
      .slice(0, 20)
      .map((l: any) => ({
        lead: {
          _id: l._id,
          firstName: l.firstName,
          secondName: l.secondName,
          phoneNumber: l.phoneNumber,
          contactStatus: l.contactStatus,
        },
        type: 'reply_received',
        timestamp: l.replyReceived,
        description: `${l.firstName} ${l.secondName} replied`,
        leadSentiment: l.leadSentiment,
        latestReply: l.latestLeadReply,
      }))

    // CALCULATE STATS - From filtered leads
    const stats = calculateStats(filteredLeads, activeLeads)

    // RETURN EVERYTHING in one response
    return NextResponse.json({
      // Core data
      hotLeads,
      warmLeads,
      callBookedLeads,
      allBookedCalls,
      archivedLeads,
      recentActivity,

      // Analytics
      stats,

      // Metadata
      lastUpdated: new Date().toISOString(),
      totalLeads: filteredLeads.length,
      timeRange
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

function calculateStats(allLeads: any[], activeLeads: any[]) {
  // Message counts
  const m1Sent = activeLeads.filter(l => l.m1Sent).length
  const m2Sent = activeLeads.filter(l => l.m2Sent).length
  const m3Sent = activeLeads.filter(l => l.m3Sent).length
  const manualMessages = activeLeads.filter(l => l.manualMode).length

  // Sentiment breakdown
  const sentimentCounts: any = {
    positive: 0,
    negative: 0,
    neutral: 0,
    negativeRemoved: 0,
    unclear: 0,
    unsure: 0
  }

  activeLeads.forEach(lead => {
    const sentiment = (lead.leadSentiment || '').toLowerCase()
    if (sentiment.includes('positive')) sentimentCounts.positive++
    else if (sentiment.includes('negative') && sentiment.includes('removed')) sentimentCounts.negativeRemoved++
    else if (sentiment.includes('negative')) sentimentCounts.negative++
    else if (sentiment.includes('neutral')) sentimentCounts.neutral++
    else if (sentiment.includes('unclear')) sentimentCounts.unclear++
    else if (sentiment.includes('unsure')) sentimentCounts.unsure++
  })

  // Status breakdown
  const statusCounts: any = {
    ready: 0,
    sent1: 0,
    sent2: 0,
    sent3: 0,
    cold: 0,
    neutral: 0,
    warm: 0,
    hot: 0,
    callBooked: 0,
    converted: 0,
    installed: 0,
    removed: 0
  }

  activeLeads.forEach(lead => {
    const status = (lead.contactStatus || '').toUpperCase()
    switch (status) {
      case 'READY': statusCounts.ready++; break
      case 'SENT_1': statusCounts.sent1++; break
      case 'SENT_2': statusCounts.sent2++; break
      case 'SENT_3': statusCounts.sent3++; break
      case 'COLD': statusCounts.cold++; break
      case 'NEUTRAL': statusCounts.neutral++; break
      case 'WARM': statusCounts.warm++; break
      case 'HOT': statusCounts.hot++; break
      case 'CALL_BOOKED': statusCounts.callBooked++; break
      case 'CONVERTED': statusCounts.converted++; break
      case 'INSTALLED': statusCounts.installed++; break
      case 'REMOVED': statusCounts.removed++; break
    }
  })

  // Reply metrics
  const repliedLeads = activeLeads.filter(l => l.replyReceived).length
  const replyRate = activeLeads.length > 0
    ? ((repliedLeads / activeLeads.length) * 100).toFixed(1)
    : '0.0'

  return {
    totalLeads: allLeads.length,
    messagesSent: {
      m1: m1Sent,
      m2: m2Sent,
      m3: m3Sent,
      total: m1Sent + m2Sent + m3Sent,
      manual: manualMessages,
      ai: m1Sent + m2Sent + m3Sent - manualMessages
    },
    sentiment: sentimentCounts,
    statusBreakdown: statusCounts,
    replyRate: parseFloat(replyRate),
    repliedLeads,
    lastUpdated: new Date().toISOString()
  }
}
