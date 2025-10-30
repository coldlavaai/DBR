import {createClient} from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function cleanupDuplicates() {
  // Get all sophieAnalysis documents
  const analyses = await client.fetch(`*[_type == "sophieAnalysis"] | order(_createdAt asc) {
    _id,
    _createdAt,
    "leadId": lead._ref,
    "leadName": metadata.leadName
  }`)

  console.log(`Found ${analyses.length} total analyses`)

  // Group by leadId to find duplicates
  const leadGroups = {}
  analyses.forEach(a => {
    if (!leadGroups[a.leadId]) {
      leadGroups[a.leadId] = []
    }
    leadGroups[a.leadId].push(a)
  })

  // Find duplicates (keep oldest, delete rest)
  let toDelete = []
  Object.entries(leadGroups).forEach(([leadId, group]) => {
    if (group.length > 1) {
      // Keep the first (oldest), delete the rest
      const duplicates = group.slice(1)
      toDelete.push(...duplicates.map(d => d._id))
      console.log(`Lead ${group[0].leadName}: keeping 1, deleting ${duplicates.length} duplicates`)
    }
  })

  console.log(`\nDeleting ${toDelete.length} duplicate analyses...`)

  // Delete in batches
  const batchSize = 100
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize)
    const transaction = client.transaction()
    batch.forEach(id => transaction.delete(id))
    await transaction.commit()
    console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}`)
  }

  console.log('Done! Duplicates removed.')
  console.log(`Kept ${analyses.length - toDelete.length} unique analyses`)
}

cleanupDuplicates().catch(console.error)
