import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || 'all'

    // Build date filter based on time range
    let dateFilter = ''
    const now = new Date()

    if (timeRange === 'today') {
      const today = now.toISOString().split('T')[0]
      dateFilter = ` && m1Sent > "${today}"`
    } else if (timeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      dateFilter = ` && m1Sent > "${weekAgo}"`
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      dateFilter = ` && m1Sent > "${monthAgo}"`
    }

    // Fetch all leads (or filtered by time)
    const query = `*[_type == "dbrLead"${dateFilter}]`
    const leads = await sanityClient.fetch(query)

    // Calculate stats
    const totalLeads = leads.length

    const messagesSent = {
      m1: leads.filter((l: any) => l.m1Sent).length,
      m2: leads.filter((l: any) => l.m2Sent).length,
      m3: leads.filter((l: any) => l.m3Sent).length,
      total: 0,
    }
    messagesSent.total = messagesSent.m1 + messagesSent.m2 + messagesSent.m3

    const sentiment = {
      positive: leads.filter((l: any) => l.leadSentiment === 'POSITIVE').length,
      negative: leads.filter((l: any) => l.leadSentiment === 'NEGATIVE').length,
      neutral: leads.filter((l: any) => l.leadSentiment === 'NEUTRAL').length,
      negativeRemoved: leads.filter((l: any) => l.leadSentiment === 'NEGATIVE_REMOVED').length,
      unclear: leads.filter((l: any) => l.leadSentiment === 'UNCLEAR').length,
    }

    const statusBreakdown = {
      hot: leads.filter((l: any) => l.contactStatus === 'HOT').length,
      positive: leads.filter((l: any) => l.contactStatus === 'POSITIVE').length,
      negative: leads.filter((l: any) => l.contactStatus === 'NEGATIVE').length,
      removed: leads.filter((l: any) => l.contactStatus === 'REMOVED').length,
      sent1: leads.filter((l: any) => l.contactStatus === 'Sent_1').length,
      sent2: leads.filter((l: any) => l.contactStatus === 'Sent_2').length,
      sent3: leads.filter((l: any) => l.contactStatus === 'Sent_3').length,
      converted: leads.filter((l: any) => l.contactStatus === 'CONVERTED').length,
      scheduled: leads.filter((l: any) => l.contactStatus === 'SCHEDULED').length,
    }

    const repliedLeads = leads.filter((l: any) => l.replyReceived).length
    const replyRate = totalLeads > 0 ? (repliedLeads / totalLeads) * 100 : 0

    return NextResponse.json({
      totalLeads,
      messagesSent,
      sentiment,
      statusBreakdown,
      replyRate,
    })
  } catch (error) {
    console.error('Error fetching DBR stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
