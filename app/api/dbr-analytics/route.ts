import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

function getDateRanges(timeRange: string) {
  const now = new Date()
  let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date

  if (timeRange === 'today') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    currentEnd = now
    previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000)
    previousEnd = currentStart
  } else if (timeRange === 'week') {
    currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    currentEnd = now
    previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    previousEnd = currentStart
  } else if (timeRange === 'month') {
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    currentEnd = now
    previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    previousEnd = currentStart
  } else {
    // All time - use 30 days as "current" and 30 days before as "previous"
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    currentEnd = now
    previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    previousEnd = currentStart
  }

  return { currentStart, currentEnd, previousStart, previousEnd }
}

function calculateStats(leads: any[]) {
  const totalLeads = leads.length

  // Calculate AI vs Manual messages
  const manualLeads = leads.filter((l) => l.manualMode === true)
  const aiLeads = leads.filter((l) => l.manualMode !== true)

  const manualMessages = {
    m1: manualLeads.filter((l) => l.m1Sent).length,
    m2: manualLeads.filter((l) => l.m2Sent).length,
    m3: manualLeads.filter((l) => l.m3Sent).length,
    total: 0,
  }
  manualMessages.total = manualMessages.m1 + manualMessages.m2 + manualMessages.m3

  const aiMessages = {
    m1: aiLeads.filter((l) => l.m1Sent).length,
    m2: aiLeads.filter((l) => l.m2Sent).length,
    m3: aiLeads.filter((l) => l.m3Sent).length,
    total: 0,
  }
  aiMessages.total = aiMessages.m1 + aiMessages.m2 + aiMessages.m3

  const messagesSent = {
    m1: leads.filter((l) => l.m1Sent).length,
    m2: leads.filter((l) => l.m2Sent).length,
    m3: leads.filter((l) => l.m3Sent).length,
    total: 0,
    manual: manualMessages.total,
    ai: aiMessages.total,
  }
  messagesSent.total = messagesSent.m1 + messagesSent.m2 + messagesSent.m3

  const sentiment = {
    positive: leads.filter((l) => l.leadSentiment === 'POSITIVE').length,
    negative: leads.filter((l) => l.leadSentiment === 'NEGATIVE').length,
    neutral: leads.filter((l) => l.leadSentiment === 'NEUTRAL').length,
    negativeRemoved: leads.filter((l) => l.leadSentiment === 'NEGATIVE_REMOVED').length,
    unclear: leads.filter((l) => l.leadSentiment === 'UNCLEAR').length,
  }

  const statusBreakdown = {
    sent1: leads.filter((l) => l.contactStatus === 'Sent_1').length,
    sent2: leads.filter((l) => l.contactStatus === 'Sent_2').length,
    sent3: leads.filter((l) => l.contactStatus === 'Sent_3').length,
    cold: leads.filter((l) => l.contactStatus === 'COLD').length,
    neutral: leads.filter((l) => l.contactStatus === 'NEUTRAL').length,
    warm: leads.filter((l) => l.contactStatus === 'WARM').length,
    hot: leads.filter((l) => l.contactStatus === 'HOT').length,
    callBooked: leads.filter((l) => l.contactStatus === 'CALL_BOOKED').length,
    converted: leads.filter((l) => l.contactStatus === 'CONVERTED').length,
    installed: leads.filter((l) => l.contactStatus === 'INSTALLED').length,
    removed: leads.filter((l) => l.contactStatus === 'REMOVED').length,
  }

  const repliedLeads = leads.filter((l) => l.replyReceived).length
  // Calculate reply rate based on messages sent, not total leads
  const replyRate = messagesSent.total > 0 ? (repliedLeads / messagesSent.total) * 100 : 0

  return {
    totalLeads,
    messagesSent,
    sentiment,
    statusBreakdown,
    replyRate,
    repliedLeads,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || 'all'

    const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(timeRange)

    // Fetch all leads for calculations
    const allLeadsQuery = `*[_type == "dbrLead"]`
    const allLeads = await sanityClient.fetch(allLeadsQuery)

    // Filter leads by date ranges
    const currentLeads = timeRange === 'all'
      ? allLeads
      : allLeads.filter((l: any) => {
          const leadDate = l.m1Sent ? new Date(l.m1Sent) : null
          return leadDate && leadDate >= currentStart && leadDate <= currentEnd
        })

    const previousLeads = allLeads.filter((l: any) => {
      const leadDate = l.m1Sent ? new Date(l.m1Sent) : null
      return leadDate && leadDate >= previousStart && leadDate < previousEnd
    })

    // Calculate current and previous stats
    const currentStats = calculateStats(currentLeads)
    const previousStats = calculateStats(previousLeads)

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const trends = {
      totalLeads: calculateChange(currentStats.totalLeads, previousStats.totalLeads),
      messagesSent: calculateChange(currentStats.messagesSent.total, previousStats.messagesSent.total),
      replyRate: calculateChange(currentStats.replyRate, previousStats.replyRate),
      hotLeads: calculateChange(currentStats.statusBreakdown.hot, previousStats.statusBreakdown.hot),
      converted: calculateChange(currentStats.statusBreakdown.converted, previousStats.statusBreakdown.converted),
    }

    // Generate daily trend data for charts (last 30 days)
    const dailyData = []
    const days = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(currentEnd.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayLeads = allLeads.filter((l: any) => {
        if (!l.m1Sent) return false
        const leadDate = new Date(l.m1Sent).toISOString().split('T')[0]
        return leadDate === dateStr
      })

      const dayStats = calculateStats(dayLeads)

      dailyData.push({
        date: dateStr,
        totalLeads: dayStats.totalLeads,
        replies: dayStats.repliedLeads,
        hot: dayStats.statusBreakdown.hot,
        converted: dayStats.statusBreakdown.converted,
        replyRate: dayStats.replyRate,
      })
    }

    // Conversion funnel data
    const funnelData = {
      totalSent: currentStats.messagesSent.total,
      replied: currentStats.repliedLeads,
      positive: currentStats.statusBreakdown.hot + currentStats.statusBreakdown.warm,
      scheduled: currentStats.statusBreakdown.callBooked,
      converted: currentStats.statusBreakdown.converted,
    }

    // Response time analysis
    const responseTimes = currentLeads
      .filter((l: any) => l.m1Sent && l.replyReceived)
      .map((l: any) => {
        const sent = new Date(l.m1Sent).getTime()
        const replied = new Date(l.replyReceived).getTime()
        return (replied - sent) / (1000 * 60 * 60) // hours
      })

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      : 0

    // Fetch the real last sync timestamp from Sanity
    let lastUpdated = new Date().toISOString()
    try {
      const syncMeta = await sanityClient.getDocument('syncMetadata').catch(() => null)
      if (syncMeta && (syncMeta as any).lastSyncTimestamp) {
        lastUpdated = (syncMeta as any).lastSyncTimestamp
      }
    } catch (error) {
      console.error('Error fetching sync metadata:', error)
    }

    return NextResponse.json({
      ...currentStats,
      trends,
      dailyData,
      funnelData,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      previousPeriod: previousStats,
      lastUpdated,
    })
  } catch (error) {
    console.error('Error fetching DBR stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
