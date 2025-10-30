import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

// ============================================================================
// SOPHIE'S INTELLIGENCE HQ - AUTO-ANALYSIS
// ============================================================================
// This endpoint runs ALL intelligence checks automatically and returns
// a complete picture of system health, conversation quality, and priorities
// ============================================================================

export async function GET(request: Request) {
  try {
    console.log('🧠 Sophie Auto-Analysis Running...')

    // Fetch all leads for analysis
    const allLeads = await sanityClient.fetch(`*[_type == "dbrLead" && !archived] {
      _id, _createdAt, _updatedAt, firstName, secondName, phoneNumber,
      contactStatus, leadSentiment, latestLeadReply, notes, postcode,
      replyReceived, replyProcessed, m1Sent, m2Sent, m3Sent,
      callBookedTime, lastSyncedAt, finalStatus
    }`)

    // Run all analysis in parallel
    const [
      liveIssues,
      conversationPatterns,
      qualityMetrics,
      systemHealth
    ] = await Promise.all([
      analyzeLiveIssues(allLeads),
      analyzeConversationPatterns(allLeads),
      analyzeQualityMetrics(allLeads),
      checkSystemHealth(allLeads)
    ])

    // Count total critical issues for badge
    const criticalCount = liveIssues.filter((i: any) => i.priority === 'URGENT').length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      criticalCount,
      liveIssues,
      conversationPatterns,
      qualityMetrics,
      systemHealth
    })

  } catch (error: any) {
    console.error('❌ Sophie Insights Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// 1. LIVE ISSUES - Priority alerts that need immediate attention
// ============================================================================

async function analyzeLiveIssues(leads: any[]) {
  const issues: any[] = []
  const now = Date.now()
  const oneDayAgo = now - (24 * 60 * 60 * 1000)
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000)

  // URGENT: Hot leads stalled 3+ days
  const stalledHotLeads = leads.filter((l: any) =>
    l.contactStatus === 'HOT' &&
    !l.callBookedTime &&
    new Date(l._updatedAt).getTime() < threeDaysAgo
  )

  if (stalledHotLeads.length > 0) {
    issues.push({
      priority: 'URGENT',
      icon: '⚠️',
      title: `${stalledHotLeads.length} hot lead${stalledHotLeads.length > 1 ? 's' : ''} stalled 3+ days`,
      description: 'These leads are hot but haven\'t been contacted recently',
      action: 'Contact now',
      leads: stalledHotLeads.slice(0, 5).map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        phone: l.phoneNumber,
        daysSinceUpdate: Math.floor((now - new Date(l._updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      }))
    })
  }

  // URGENT: Leads went NEGATIVE in last 24h
  const recentNegative = leads.filter((l: any) =>
    l.leadSentiment === 'NEGATIVE' &&
    new Date(l._updatedAt).getTime() > oneDayAgo
  )

  if (recentNegative.length > 0) {
    issues.push({
      priority: 'URGENT',
      icon: '💔',
      title: `${recentNegative.length} lead${recentNegative.length > 1 ? 's' : ''} went NEGATIVE in last 24h`,
      description: 'Review these conversations to identify bot failures',
      action: 'Review conversations',
      leads: recentNegative.slice(0, 5).map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        lastReply: l.latestLeadReply?.substring(0, 100)
      }))
    })
  }

  // WARNING: Reply rate drop
  const last7Days = leads.filter((l: any) =>
    new Date(l._createdAt).getTime() > (now - 7 * 24 * 60 * 60 * 1000)
  )
  const previous7Days = leads.filter((l: any) => {
    const created = new Date(l._createdAt).getTime()
    return created > (now - 14 * 24 * 60 * 60 * 1000) && created < (now - 7 * 24 * 60 * 60 * 1000)
  })

  const currentReplyRate = calculateReplyRate(last7Days)
  const previousReplyRate = calculateReplyRate(previous7Days)
  const rateChange = currentReplyRate - previousReplyRate

  if (rateChange < -10) {
    issues.push({
      priority: 'WARNING',
      icon: '📉',
      title: `Reply rate dropped ${Math.abs(rateChange).toFixed(1)}% this week`,
      description: `Current: ${currentReplyRate.toFixed(1)}%, Previous: ${previousReplyRate.toFixed(1)}%`,
      action: 'Review message content and timing'
    })
  }

  // INFO: Upcoming calls
  const upcomingCalls = leads.filter((l: any) =>
    l.callBookedTime &&
    new Date(l.callBookedTime).getTime() > now &&
    new Date(l.callBookedTime).getTime() < (now + 24 * 60 * 60 * 1000)
  )

  if (upcomingCalls.length > 0) {
    issues.push({
      priority: 'INFO',
      icon: '📞',
      title: `${upcomingCalls.length} call${upcomingCalls.length > 1 ? 's' : ''} booked in next 24 hours`,
      description: 'Prepare for upcoming conversations',
      action: 'Review lead history',
      leads: upcomingCalls.map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        callTime: l.callBookedTime
      }))
    })
  }

  // Detect manual engagement from notes
  const manualEngagements = leads.filter((l: any) =>
    l.notes && (
      l.notes.toLowerCase().includes('manual') ||
      l.notes.toLowerCase().includes('called') ||
      l.notes.toLowerCase().includes('spoke to') ||
      l.notes.toLowerCase().includes('rang')
    )
  ).filter((l: any) =>
    new Date(l._updatedAt).getTime() > oneDayAgo
  )

  if (manualEngagements.length > 0) {
    issues.push({
      priority: 'WARNING',
      icon: '🔧',
      title: `Manual engagement triggered ${manualEngagements.length}x today`,
      description: 'Bot may have failed - review these conversations',
      action: 'Identify bot failure patterns',
      leads: manualEngagements.slice(0, 5).map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        notes: l.notes?.substring(0, 100)
      }))
    })
  }

  return issues.length > 0 ? issues : [{
    priority: 'INFO',
    icon: '✅',
    title: 'No critical issues detected',
    description: 'All systems running smoothly',
    action: null
  }]
}

// ============================================================================
// 2. CONVERSATION PATTERNS - What Sophie has learned
// ============================================================================

async function analyzeConversationPatterns(leads: any[]) {
  // Top objections
  const objectionPatterns = {
    'price': ['too expensive', 'too much', 'cost', 'price', 'afford', 'cheaper'],
    'timing': ['not now', 'maybe later', 'busy', 'next year', 'not ready'],
    'trust': ['scam', 'not interested', 'suspicious', 'trust', 'legit'],
    'already_have': ['already have', 'got solar', 'already installed'],
    'renting': ['rent', 'landlord', 'not my house', 'tenant'],
    'information': ['more info', 'send details', 'email me', 'brochure']
  }

  const objectionCounts: any = {}

  leads.forEach((lead: any) => {
    const text = `${lead.latestLeadReply || ''} ${lead.notes || ''}`.toLowerCase()
    Object.entries(objectionPatterns).forEach(([objection, keywords]) => {
      if (keywords.some((keyword: string) => text.includes(keyword))) {
        objectionCounts[objection] = (objectionCounts[objection] || 0) + 1
      }
    })
  })

  const topObjections = Object.entries(objectionCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3)
    .map(([objection, count]) => ({
      objection,
      count,
      suggestion: getObjectionFix(objection)
    }))

  // Geographic insights
  const postcodeStats: any = {}
  leads.forEach((lead: any) => {
    if (lead.postcode) {
      const area = lead.postcode.substring(0, 2).toUpperCase()
      if (!postcodeStats[area]) {
        postcodeStats[area] = { total: 0, hot: 0, booked: 0 }
      }
      postcodeStats[area].total++
      if (lead.contactStatus === 'HOT') postcodeStats[area].hot++
      if (lead.callBookedTime) postcodeStats[area].booked++
    }
  })

  const topPostcodes = Object.entries(postcodeStats)
    .filter(([, stats]: any) => stats.total >= 5)
    .map(([area, stats]: any) => ({
      area,
      total: stats.total,
      conversionRate: ((stats.booked / stats.total) * 100).toFixed(1)
    }))
    .sort((a: any, b: any) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))
    .slice(0, 3)

  // Timing patterns
  const repliedLeads = leads.filter((l: any) => l.replyReceived)
  const replyHours = repliedLeads.map((l: any) => new Date(l.replyReceived).getHours())
  const hourCounts: any = {}
  replyHours.forEach((hour: number) => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const peakHour = Object.entries(hourCounts)
    .sort(([, a]: any, [, b]: any) => b - a)[0]

  return {
    topObjections,
    topPostcodes: topPostcodes.length > 0 ? topPostcodes : null,
    peakResponseTime: peakHour ? {
      hour: parseInt(peakHour[0]),
      count: peakHour[1]
    } : null
  }
}

// ============================================================================
// 3. QUALITY METRICS - Bot performance scoring
// ============================================================================

async function analyzeQualityMetrics(leads: any[]) {
  const sent = leads.filter((l: any) => l.m1Sent || l.m2Sent || l.m3Sent)
  const replied = leads.filter((l: any) => l.replyReceived)
  const negative = leads.filter((l: any) => l.leadSentiment === 'NEGATIVE')
  const hot = leads.filter((l: any) => l.contactStatus === 'HOT')
  const booked = leads.filter((l: any) => l.callBookedTime)

  const replyRate = sent.length > 0 ? (replied.length / sent.length * 100) : 0
  const negativeRate = sent.length > 0 ? (negative.length / sent.length * 100) : 0
  const bookingRate = sent.length > 0 ? (booked.length / sent.length * 100) : 0

  // Calculate quality score (0-100)
  let qualityScore = 100
  qualityScore -= Math.max(0, (30 - replyRate) * 2) // Penalize low reply rate
  qualityScore -= negativeRate * 3 // Heavily penalize negative responses
  qualityScore += bookingRate * 5 // Reward bookings
  qualityScore = Math.max(0, Math.min(100, qualityScore))

  // Find repeated failures
  const repeatedFailures: any[] = []

  // Bot doesn't handle "send info" requests
  const sendInfoRequests = leads.filter((l: any) =>
    l.latestLeadReply &&
    (l.latestLeadReply.toLowerCase().includes('send') || l.latestLeadReply.toLowerCase().includes('info'))
  )
  if (sendInfoRequests.length > 5) {
    repeatedFailures.push({
      issue: `Bot doesn't handle "send info" requests`,
      count: sendInfoRequests.length,
      fix: 'Add automated info sending workflow'
    })
  }

  // No response to price questions
  const priceQuestions = leads.filter((l: any) =>
    l.latestLeadReply &&
    (l.latestLeadReply.toLowerCase().includes('price') || l.latestLeadReply.toLowerCase().includes('cost'))
  )
  if (priceQuestions.length > 5) {
    repeatedFailures.push({
      issue: 'No response to price questions',
      count: priceQuestions.length,
      fix: 'Add pricing script with grant/finance info'
    })
  }

  // What's working
  const working: any[] = []

  if (replyRate > 35) {
    working.push({
      metric: `M1 reply rate: ${replyRate.toFixed(1)}%`,
      status: 'Good'
    })
  }

  if (bookingRate > 5) {
    working.push({
      metric: `Booking rate: ${bookingRate.toFixed(1)}%`,
      status: 'Improving'
    })
  }

  return {
    qualityScore: Math.round(qualityScore),
    replyRate: replyRate.toFixed(1),
    negativeRate: negativeRate.toFixed(1),
    bookingRate: bookingRate.toFixed(1),
    repeatedFailures,
    working
  }
}

// ============================================================================
// 4. SYSTEM HEALTH - Infrastructure status
// ============================================================================

async function checkSystemHealth(leads: any[]) {
  const now = Date.now()
  const recentSyncs = leads.filter((l: any) =>
    l.lastSyncedAt &&
    (now - new Date(l.lastSyncedAt).getTime()) < (10 * 60 * 1000) // Last 10 min
  )

  const lastSync = leads
    .filter((l: any) => l.lastSyncedAt)
    .sort((a: any, b: any) => new Date(b.lastSyncedAt).getTime() - new Date(a.lastSyncedAt).getTime())[0]

  const minutesSinceSync = lastSync
    ? Math.floor((now - new Date(lastSync.lastSyncedAt).getTime()) / (1000 * 60))
    : null

  return {
    googleSheetsSync: {
      status: minutesSinceSync && minutesSinceSync < 15 ? 'active' : 'warning',
      lastSync: minutesSinceSync ? `${minutesSinceSync} min ago` : 'Unknown',
      recentUpdates: recentSyncs.length
    },
    sanityDatabase: {
      status: 'active',
      totalLeads: leads.length,
      activeLeads: leads.filter((l: any) => !l.archived).length
    },
    sophieAI: {
      status: 'monitoring',
      leadsAnalyzed: leads.length
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateReplyRate(leads: any[]): number {
  const sent = leads.filter((l: any) => l.m1Sent || l.m2Sent || l.m3Sent)
  const replied = leads.filter((l: any) => l.replyReceived)
  return sent.length > 0 ? (replied.length / sent.length * 100) : 0
}

function getObjectionFix(objection: string): string {
  const fixes: any = {
    'price': 'Add pricing comparison showing 20-year savings',
    'timing': 'Add no-pressure "when you\'re ready" response',
    'trust': 'Include reviews and local customer references',
    'already_have': 'Offer free system health check',
    'renting': 'Provide landlord information pack',
    'information': 'Auto-send info pack with personalized details'
  }
  return fixes[objection] || 'Review and create response script'
}
