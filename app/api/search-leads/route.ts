import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ leads: [], count: 0 })
    }

    // Search by name, phone, or email (case insensitive)
    const groqQuery = `*[_type == "dbrLead" && archived != true && (
      firstName match $query + "*" ||
      secondName match $query + "*" ||
      phoneNumber match "*" + $query + "*" ||
      emailAddress match "*" + $query + "*"
    )] | order(_score desc)[0...10] {
      _id,
      firstName,
      secondName,
      phoneNumber,
      emailAddress,
      contactStatus,
      leadSentiment,
      postcode
    }` as const

    const leads = await sanityClient.fetch(groqQuery as any, { query } as any)

    return NextResponse.json({ leads, count: leads.length })
  } catch (error) {
    console.error('Error searching leads:', error)
    return NextResponse.json(
      { error: 'Failed to search leads' },
      { status: 500 }
    )
  }
}
