import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id

    // Fetch lead with all messages
    const lead = await sanityClient.fetch(`
      *[_type == "dbrLead" && _id == $leadId][0] {
        _id, _createdAt, _updatedAt, firstName, secondName, phoneNumber,
        contactStatus, leadSentiment, latestLeadReply, notes, postcode,
        replyReceived, replyProcessed, m1Sent, m2Sent, m3Sent,
        callBookedTime, lastSyncedAt, finalStatus,
        "messages": *[_type == "message" && references(^._id)] | order(_createdAt asc) {
          _id, _createdAt, sender, content
        }
      }
    `, { leadId })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(lead)

  } catch (error: any) {
    console.error('❌ Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead', details: error.message },
      { status: 500 }
    )
  }
}
