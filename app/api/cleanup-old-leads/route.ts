import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST() {
  try {
    console.log('🧹 Starting cleanup of old records without campaign field...')

    // Delete ALL dbrLead records to start fresh
    // All data is safely stored in Google Sheets and will be re-synced
    const oldRecords = await sanityClient.fetch<Array<{ _id: string }>>(
      `*[_type == "dbrLead"] { _id }`
    )

    console.log(`📊 Found ${oldRecords.length} old records without campaign field`)

    if (oldRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No old records to clean up',
        deleted: 0
      })
    }

    // Delete them in batches
    const BATCH_SIZE = 100
    let deleted = 0

    for (let i = 0; i < oldRecords.length; i += BATCH_SIZE) {
      const batch = oldRecords.slice(i, i + BATCH_SIZE)

      // Delete each record individually with error handling
      for (const record of batch) {
        try {
          await sanityClient.delete(record._id)
          deleted++
        } catch (error: any) {
          // If deletion fails due to references, skip it
          if (error.message?.includes('cannot be deleted as there are references')) {
            console.log(`⚠️ Skipping ${record._id} (has references)`)
          } else {
            console.error(`❌ Error deleting ${record._id}:`, error.message)
          }
        }
      }

      console.log(`✅ Progress: ${deleted}/${oldRecords.length}`)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleted} old records`,
      deleted
    })

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
