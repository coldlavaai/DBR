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
    const campaign = searchParams.get('campaign') || 'October'

    // SINGLE QUERY - Fetch ALL leads for this campaign
    // Only match records where campaign field is explicitly set (ignore old records without campaign)
    const allLeads = await sanityClient.fetch(
      `*[_type == "dbrLead" && campaign == $campaign] | order(_createdAt desc) {
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
      }`,
      { campaign }
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

    // Recent activity (correct format for RecentActivity component)
    const recentActivity = activeLeads
      .filter((l: any) => l.replyReceived)
      .sort((a: any, b: any) =>
        (b.replyReceived || '').localeCompare(a.replyReceived || '')
      )
      .slice(0, 20)
      .map((l: any) => ({
        id: l._id,
        type: 'reply' as const,
        leadName: `${l.firstName} ${l.secondName}`,
        message: l.latestLeadReply || 'No message preview',
        timestamp: l.replyReceived,
        contactStatus: l.contactStatus,
      }))

    // CALCULATE STATS - From filtered leads
    const stats = calculateStats(filteredLeads, activeLeads, timeRange)

    // TOTAL CALLS BOOKED - Running total of ALL leads that ever had callBookedTime set
    // This includes leads that moved to CONVERTED, INSTALLED, or any other status
    const totalCallsBookedEver = allLeads.filter((l: any) => l.callBookedTime).length

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

      // Additional metrics
      upcomingCallsCount: callBookedLeads.length,  // Future calls only (CALL_BOOKED status)
      totalCallsBooked: totalCallsBookedEver,      // Running total of ALL calls ever booked

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

function calculateStats(allLeads: any[], activeLeads: any[], timeRange: string) {
  // Separate manual and AI leads
  const manualLeads = activeLeads.filter(l => l.manualMode === true)
  const aiLeads = activeLeads.filter(l => l.manualMode !== true)

  // Message counts by type
  const manualMessages = {
    m1: manualLeads.filter(l => l.m1Sent).length,
    m2: manualLeads.filter(l => l.m2Sent).length,
    m3: manualLeads.filter(l => l.m3Sent).length,
    total: 0
  }
  manualMessages.total = manualMessages.m1 + manualMessages.m2 + manualMessages.m3

  const aiMessages = {
    m1: aiLeads.filter(l => l.m1Sent).length,
    m2: aiLeads.filter(l => l.m2Sent).length,
    m3: aiLeads.filter(l => l.m3Sent).length,
    total: 0
  }
  aiMessages.total = aiMessages.m1 + aiMessages.m2 + aiMessages.m3

  const messagesSent = {
    m1: activeLeads.filter(l => l.m1Sent).length,
    m2: activeLeads.filter(l => l.m2Sent).length,
    m3: activeLeads.filter(l => l.m3Sent).length,
    total: 0,
    manual: manualMessages.total,
    ai: aiMessages.total
  }
  messagesSent.total = messagesSent.m1 + messagesSent.m2 + messagesSent.m3

  // Sentiment breakdown (exact match, not includes)
  const sentimentCounts: any = {
    positive: activeLeads.filter(l => l.leadSentiment === 'POSITIVE').length,
    negative: activeLeads.filter(l => l.leadSentiment === 'NEGATIVE').length,
    neutral: activeLeads.filter(l => l.leadSentiment === 'NEUTRAL').length,
    negativeRemoved: activeLeads.filter(l => l.leadSentiment === 'NEGATIVE_REMOVED').length,
    unclear: activeLeads.filter(l => l.leadSentiment === 'UNCLEAR').length,
    unsure: activeLeads.filter(l => l.leadSentiment === 'UNSURE').length,
    noSentiment: activeLeads.filter(l => !l.leadSentiment).length
  }

  // Status breakdown
  const statusCounts: any = {
    ready: activeLeads.filter(l => l.contactStatus === 'Ready').length,
    sent1: activeLeads.filter(l => l.contactStatus === 'Sent_1').length,
    sent2: activeLeads.filter(l => l.contactStatus === 'Sent_2').length,
    sent3: activeLeads.filter(l => l.contactStatus === 'Sent_3').length,
    cold: activeLeads.filter(l => l.contactStatus === 'COLD').length,
    neutral: activeLeads.filter(l => l.contactStatus === 'NEUTRAL').length,
    warm: activeLeads.filter(l => l.contactStatus === 'WARM').length,
    hot: activeLeads.filter(l => l.contactStatus === 'HOT').length,
    callBooked: activeLeads.filter(l => l.contactStatus === 'CALL_BOOKED').length,
    converted: activeLeads.filter(l => l.contactStatus === 'CONVERTED').length,
    installed: activeLeads.filter(l => l.contactStatus === 'INSTALLED').length,
    removed: activeLeads.filter(l => l.contactStatus === 'REMOVED').length
  }

  // Reply metrics
  const repliedLeads = activeLeads.filter(l => l.replyReceived).length
  const leadsWithMessages = activeLeads.filter(l => l.m1Sent || l.m2Sent || l.m3Sent).length
  const replyRate = leadsWithMessages > 0 ? (repliedLeads / leadsWithMessages) * 100 : 0

  // Average response time (hours) - from M1 sent to first reply received
  const responseTimes = activeLeads
    .filter(l => l.m1Sent && l.replyReceived)
    .map(l => {
      const sent = new Date(l.m1Sent).getTime()
      const replied = new Date(l.replyReceived).getTime()
      return (replied - sent) / (1000 * 60 * 60) // hours
    })

  const avgResponseTime = responseTimes.length > 0
    ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
    : 0

  return {
    totalLeads: allLeads.length,
    messagesSent,
    sentiment: sentimentCounts,
    statusBreakdown: statusCounts,
    replyRate,
    repliedLeads,
    avgResponseTime,
    lastUpdated: new Date().toISOString()
  }
}
