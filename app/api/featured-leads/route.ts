import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET() {
  try {
    console.log('⭐ Fetching featured (starred) leads')

    const leads = await sanityClient.fetch(`
      *[_type == "dbrLead" && starred == true] | order(_createdAt desc) {
        _id,
        _createdAt,
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
        manualMode,
        starred
      }
    `)

    console.log(`✅ Found ${leads.length} starred leads`)

    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching featured leads:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
