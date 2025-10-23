import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_READ_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET() {
  try {
    // Fetch HOT leads sorted by most recent reply
    const hotLeads = await sanityClient.fetch(
      `*[_type == "dbrLead" && contactStatus == "HOT"] | order(replyReceived desc) [0...10] {
        _id,
        firstName,
        secondName,
        phoneNumber,
        emailAddress,
        contactStatus,
        leadSentiment,
        conversationHistory,
        latestLeadReply,
        replyReceived,
        m1Sent,
        m2Sent,
        m3Sent,
        installDate
      }`
    )

    return NextResponse.json({
      success: true,
      leads: hotLeads,
      count: hotLeads.length
    })
  } catch (error) {
    console.error('Error fetching hot leads:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hot leads' },
      { status: 500 }
    )
  }
}
