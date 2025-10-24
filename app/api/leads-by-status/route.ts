import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statuses = searchParams.get('statuses')?.split(',') || []
    const limit = parseInt(searchParams.get('limit') || '5')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (statuses.length === 0) {
      return NextResponse.json({ error: 'Statuses parameter is required' }, { status: 400 })
    }

    console.log(`📊 Fetching leads with statuses: ${statuses.join(', ')}, limit: ${limit}, offset: ${offset}`)

    // Build the status filter for GROQ query
    const statusFilter = statuses.map(status => `contactStatus == "${status}"`).join(' || ')

    // Fetch leads matching the statuses
    const query = `*[_type == "dbrLead" && (${statusFilter})] | order(_createdAt desc) [${offset}...${offset + limit}] {
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
      starred,
      notes
    }`

    const leads = await sanityClient.fetch(query)

    // Check if there are more leads beyond the current limit
    const countQuery = `count(*[_type == "dbrLead" && (${statusFilter})])`
    const totalCount = await sanityClient.fetch(countQuery)
    const hasMore = (offset + limit) < totalCount

    console.log(`✅ Found ${leads.length} leads (total: ${totalCount}, hasMore: ${hasMore})`)

    return NextResponse.json({
      leads,
      hasMore,
      total: totalCount
    })
  } catch (error) {
    console.error('Error fetching leads by status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
