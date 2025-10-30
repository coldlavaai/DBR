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
    // Get all sophieAnalysis documents
    const analyses = await sanityClient.fetch(`*[_type == "sophieAnalysis"] | order(_createdAt asc) {
      _id,
      _createdAt,
      "leadId": lead._ref,
      "leadName": metadata.leadName
    }`)

    console.log(`Found ${analyses.length} total analyses`)

    // Group by leadId to find duplicates
    const leadGroups: Record<string, any[]> = {}
    analyses.forEach((a: any) => {
      if (!leadGroups[a.leadId]) {
        leadGroups[a.leadId] = []
      }
      leadGroups[a.leadId].push(a)
    })

    // Find duplicates (keep oldest, delete rest)
    const toDelete: string[] = []
    const kept: string[] = []

    Object.entries(leadGroups).forEach(([leadId, group]) => {
      if (group.length > 1) {
        // Keep the first (oldest), delete the rest
        const duplicates = group.slice(1)
        toDelete.push(...duplicates.map((d: any) => d._id))
        kept.push(group[0]._id)
        console.log(`Lead ${group[0].leadName}: keeping 1, deleting ${duplicates.length} duplicates`)
      }
    })

    console.log(`\nDeleting ${toDelete.length} duplicate analyses...`)

    // Delete in batches
    const batchSize = 100
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize)
      const transaction = sanityClient.transaction()
      batch.forEach((id: string) => transaction.delete(id))
      await transaction.commit()
      console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}`)
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${toDelete.length} duplicates`,
      totalBefore: analyses.length,
      totalAfter: analyses.length - toDelete.length,
      duplicatesRemoved: toDelete.length
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup duplicates', details: String(error) },
      { status: 500 }
    )
  }
}
