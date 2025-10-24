import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

export async function POST(request: Request) {
  try {
    const { leadId, starred } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    console.log(`⭐ Toggling starred for lead ${leadId} to ${starred}`)

    // Update Sanity
    const updateData: any = {
      starred: starred === true,
      lastUpdatedAt: new Date().toISOString(),
    }

    const updatedLead = await sanityClient
      .patch(leadId)
      .set(updateData)
      .commit()

    console.log(`✅ Updated Sanity for lead ${leadId}`)

    // TODO: Add Google Sheets sync for starred status (Column W) when column is added
    // For now, starred status only syncs to Sanity to avoid errors

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      starred: starred === true,
    })
  } catch (error) {
    console.error('Error toggling starred:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
