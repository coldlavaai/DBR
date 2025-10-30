import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST() {
  try {
    // Get ALL sophieAnalysis documents
    const analyses = await sanityClient.fetch(`*[_type == "sophieAnalysis"]._id`)

    console.log(`Found ${analyses.length} analyses to delete`)

    // Delete in batches
    const batchSize = 100
    for (let i = 0; i < analyses.length; i += batchSize) {
      const batch = analyses.slice(i, i + batchSize)
      const transaction = sanityClient.transaction()
      batch.forEach((id: string) => transaction.delete(id))
      await transaction.commit()
      console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}`)
    }

    return NextResponse.json({
      success: true,
      message: `Deleted all ${analyses.length} analyses. Ready for fresh analysis.`,
      deleted: analyses.length
    })

  } catch (error) {
    console.error('Delete all error:', error)
    return NextResponse.json(
      { error: 'Failed to delete analyses', details: String(error) },
      { status: 500 }
    )
  }
}
