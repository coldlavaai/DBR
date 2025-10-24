import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log(`📋 Fetching lead details for ${id}`)

    const lead = await sanityClient.fetch(
      `*[_type == "dbrLead" && _id == $id][0] {
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
      }`,
      { id }
    )

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    console.log(`✅ Found lead: ${lead.firstName} ${lead.secondName}`)

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
