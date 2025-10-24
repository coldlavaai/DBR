import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    // Get current date/time for filtering
    const now = new Date().toISOString()

    // Fetch CALL_BOOKED leads with upcoming call times only (future calls)
    // Use archived != true to handle undefined archived fields
    // Only include leads with callBookedTime in the future
    const query = `*[_type == "dbrLead" && contactStatus == "CALL_BOOKED" && archived != true && defined(callBookedTime) && callBookedTime > $now] | order(callBookedTime asc) {
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
      archivedAt
    }`

    const leads = await sanityClient.fetch(query, { now })

    return NextResponse.json({ leads, count: leads.length })
  } catch (error) {
    console.error('Error fetching call booked leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call booked leads' },
      { status: 500 }
    )
  }
}
