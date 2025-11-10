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

    // Find all records with OLD ID format (dbr-{phone} without campaign prefix)
    // New format is: dbr-October-{phone} or dbr-10th-Nov-{phone}
    // Old format is: dbr-{phone} (starts with dbr-4 since all UK numbers start with 44)
    const oldRecords = await sanityClient.fetch<Array<{ _id: string }>>(
      `*[_type == "dbrLead" && _id match "dbr-4*" && !(_id match "dbr-October-*") && !(_id match "dbr-10th-Nov-*")] { _id }`
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
      const transaction = sanityClient.transaction()

      batch.forEach(record => {
        transaction.delete(record._id)
      })

      await transaction.commit()
      deleted += batch.length
      console.log(`✅ Deleted ${deleted}/${oldRecords.length}`)
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
