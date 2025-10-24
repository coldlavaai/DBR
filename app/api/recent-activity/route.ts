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
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Fetch all leads with replies, sorted by most recent reply
    const query = `*[_type == "dbrLead" && replyReceived != null] | order(replyReceived desc) {
      _id,
      firstName,
      secondName,
      phoneNumber,
      replyReceived,
      latestLeadReply,
      leadSentiment,
      contactStatus
    }`

    const allLeadsWithReplies = await sanityClient.fetch(query)

    // Apply pagination
    const paginatedLeads = allLeadsWithReplies.slice(offset, offset + limit)
    const hasMore = offset + limit < allLeadsWithReplies.length

    // Format for the RecentActivity component
    const formattedActivities = paginatedLeads.map((lead: any) => ({
      id: lead._id,
      type: 'reply' as const,
      leadName: `${lead.firstName} ${lead.secondName}`,
      message: lead.latestLeadReply || 'No message preview',
      timestamp: lead.replyReceived,
      contactStatus: lead.contactStatus,
    }))

    return NextResponse.json({ activities: formattedActivities, hasMore })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
