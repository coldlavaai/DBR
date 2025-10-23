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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const filterType = searchParams.get('filter') // e.g., 'hot', 'positive', 'sentiment-positive'
    const timeRange = searchParams.get('timeRange') || 'all'

    // Build date filter
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

    // Build status/sentiment filter
    let typeFilter = ''
    if (filterType === 'hot') {
      typeFilter = ' && contactStatus == "HOT"'
    } else if (filterType === 'positive') {
      typeFilter = ' && contactStatus == "POSITIVE"'
    } else if (filterType === 'negative') {
      typeFilter = ' && contactStatus == "NEGATIVE"'
    } else if (filterType === 'removed') {
      typeFilter = ' && contactStatus == "REMOVED"'
    } else if (filterType === 'sent1') {
      typeFilter = ' && contactStatus == "Sent_1"'
    } else if (filterType === 'sent2') {
      typeFilter = ' && contactStatus == "Sent_2"'
    } else if (filterType === 'sent3') {
      typeFilter = ' && contactStatus == "Sent_3"'
    } else if (filterType === 'converted') {
      typeFilter = ' && contactStatus == "CONVERTED"'
    } else if (filterType === 'scheduled') {
      typeFilter = ' && contactStatus == "SCHEDULED"'
    } else if (filterType === 'sentiment-positive') {
      typeFilter = ' && leadSentiment == "POSITIVE"'
    } else if (filterType === 'sentiment-negative') {
      typeFilter = ' && leadSentiment == "NEGATIVE"'
    } else if (filterType === 'sentiment-neutral') {
      typeFilter = ' && leadSentiment == "NEUTRAL"'
    } else if (filterType === 'sentiment-removed') {
      typeFilter = ' && leadSentiment == "NEGATIVE_REMOVED"'
    } else if (filterType === 'sentiment-unclear') {
      typeFilter = ' && leadSentiment == "UNCLEAR"'
    }

    // Fetch leads with full data
    const query = `*[_type == "dbrLead"${dateFilter}${typeFilter}] | order(replyReceived desc, m1Sent desc) {
      _id,
      firstName,
      secondName,
      phoneNumber,
      contactStatus,
      leadSentiment,
      conversationHistory,
      m1Sent,
      m2Sent,
      m3Sent,
      replyReceived,
      installDate
    }`

    const leads = await sanityClient.fetch(query)

    return NextResponse.json({ leads, count: leads.length })
  } catch (error) {
    console.error('Error fetching DBR leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads data' },
      { status: 500 }
    )
  }
}
