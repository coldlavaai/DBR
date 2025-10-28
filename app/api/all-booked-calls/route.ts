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
    // Fetch ALL CALL_BOOKED leads, most recent first (by booking time or creation time)
    const query = `*[_type == "dbrLead" && contactStatus == "CALL_BOOKED" && archived != true] | order(callBookedTime desc, _createdAt desc) {
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
      _createdAt
    }`

    const leads = await sanityClient.fetch(query)

    return NextResponse.json({ leads, count: leads.length }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching all booked calls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch all booked calls' },
      { status: 500 }
    )
  }
}
