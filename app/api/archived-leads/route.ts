import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_READ_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET() {
  try {
    // Fetch ALL archived leads (regardless of status) sorted by most recent archive date
    const archivedLeads = await sanityClient.fetch(
      `*[_type == "dbrLead" && archived == true] | order(archivedAt desc) {
        _id,
        firstName,
        secondName,
        phoneNumber,
        emailAddress,
        postcode,
        contactStatus,
        leadSentiment,
        conversationHistory,
        latestLeadReply,
        replyReceived,
        archivedAt,
        m1Sent,
        m2Sent,
        m3Sent,
        installDate,
        notes,
        manualMode,
        callBookedTime
      }`
    )

    return NextResponse.json({
      success: true,
      leads: archivedLeads,
      count: archivedLeads.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching archived leads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch archived leads' },
      { status: 500 }
    )
  }
}
