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
    // Fetch WARM leads (excluding archived) sorted by most recent reply
    const warmLeads = await sanityClient.fetch(
      `*[_type == "dbrLead" && contactStatus == "WARM" && archived != true] | order(replyReceived desc) [0...20] {
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
        m1Sent,
        m2Sent,
        m3Sent,
        installDate,
        callBookedTime,
        notes,
        manualMode
      }`
    )

    return NextResponse.json({
      success: true,
      leads: warmLeads,
      count: warmLeads.length
    })
  } catch (error) {
    console.error('Error fetching warm leads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warm leads' },
      { status: 500 }
    )
  }
}
