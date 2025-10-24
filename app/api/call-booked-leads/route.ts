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
    // Fetch all CALL_BOOKED leads
    const query = `*[_type == "dbrLead" && contactStatus == "CALL_BOOKED" && !archived] | order(_createdAt desc) {
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
      manualMode,
      archived,
      archivedAt
    }`

    const leads = await sanityClient.fetch(query)

    return NextResponse.json({ leads, count: leads.length })
  } catch (error) {
    console.error('Error fetching call booked leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch call booked leads' },
      { status: 500 }
    )
  }
}
