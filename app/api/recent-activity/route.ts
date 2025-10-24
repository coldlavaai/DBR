import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET() {
  try {
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

    // If we have lots of replies (>10), favor hot/warm leads
    let activities
    if (allLeadsWithReplies.length > 10) {
      // Split into hot/warm and other statuses
      const hotWarmLeads = allLeadsWithReplies.filter(
        (lead: any) => lead.contactStatus === 'HOT' || lead.contactStatus === 'WARM'
      )
      const otherLeads = allLeadsWithReplies.filter(
        (lead: any) => lead.contactStatus !== 'HOT' && lead.contactStatus !== 'WARM'
      )

      // Take 3 hot/warm (if available) and 2 other, all sorted by most recent
      const selectedHotWarm = hotWarmLeads.slice(0, 3)
      const selectedOthers = otherLeads.slice(0, 2)

      // Merge and re-sort by timestamp to maintain chronological order
      const combined = [...selectedHotWarm, ...selectedOthers]
      combined.sort((a, b) => {
        const dateA = new Date(a.replyReceived).getTime()
        const dateB = new Date(b.replyReceived).getTime()
        return dateB - dateA
      })

      activities = combined.slice(0, 5)
    } else {
      // If fewer replies, just show the 5 most recent
      activities = allLeadsWithReplies.slice(0, 5)
    }

    // Format for the RecentActivity component
    const formattedActivities = activities.map((lead: any) => ({
      id: lead._id,
      type: 'reply' as const,
      leadName: `${lead.firstName} ${lead.secondName}`,
      message: lead.latestLeadReply || 'No message preview',
      timestamp: lead.replyReceived,
      contactStatus: lead.contactStatus,
    }))

    return NextResponse.json({ activities: formattedActivities })
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
