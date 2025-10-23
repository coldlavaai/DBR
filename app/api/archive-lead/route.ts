import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST(request: Request) {
  try {
    const { leadId, archived } = await request.json()

    if (!leadId || typeof archived !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid request. leadId and archived (boolean) are required.' },
        { status: 400 }
      )
    }

    // Update the lead's archived status
    const updateData: any = { archived }

    // If archiving, set the timestamp; if unarchiving, clear it
    if (archived) {
      updateData.archivedAt = new Date().toISOString()
    } else {
      updateData.archivedAt = null
    }

    await sanityClient
      .patch(leadId)
      .set(updateData)
      .commit()

    return NextResponse.json({
      success: true,
      message: archived ? 'Lead archived successfully' : 'Lead unarchived successfully',
      leadId,
      archived
    })
  } catch (error) {
    console.error('Error archiving lead:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive lead'
      },
      { status: 500 }
    )
  }
}
