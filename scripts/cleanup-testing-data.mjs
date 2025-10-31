import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})

async function cleanup() {
  console.log('🧹 Starting cleanup of TESTING dataset and related leads...\n')

  // STEP 1: Find all TESTING dataset leads
  const testingDatasetId = '0zCFr5Hp4BHeiAjnocfez4'
  const originalDatasetId = 'MR2mHETXVqBGL7XovVIhho'

  const testingLeads = await sanityClient.fetch(
    `*[_type == "dbrLead" && references("${testingDatasetId}")] { _id, firstName, secondName }`
  )

  console.log(`🔍 Found ${testingLeads.length} leads in TESTING dataset`)

  if (testingLeads.length > 0) {
    console.log('🗑️  Deleting TESTING dataset leads...')

    // Delete in batches of 50
    const BATCH_SIZE = 50
    let deleted = 0

    for (let i = 0; i < testingLeads.length; i += BATCH_SIZE) {
      const batch = testingLeads.slice(i, i + BATCH_SIZE)

      try {
        const transaction = sanityClient.transaction()
        batch.forEach(lead => {
          transaction.delete(lead._id)
        })
        await transaction.commit()

        deleted += batch.length
        console.log(`  ✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(testingLeads.length / BATCH_SIZE)} (${deleted}/${testingLeads.length})`)
      } catch (error) {
        console.error(`  ❌ Batch failed:`, error.message)

        // Try one by one
        for (const lead of batch) {
          try {
            await sanityClient.delete(lead._id)
            deleted++
          } catch (err) {
            console.error(`    ❌ Failed to delete ${lead._id}`)
          }
        }
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`✅ Deleted ${deleted} TESTING leads\n`)
  }

  // STEP 2: Remove datasetId from partially migrated leads
  const leadsWithDatasetId = await sanityClient.fetch(
    `*[_type == "dbrLead" && defined(datasetId)] { _id }`
  )

  if (leadsWithDatasetId.length > 0) {
    console.log(`🔧 Removing datasetId from ${leadsWithDatasetId.length} leads...`)

    for (const lead of leadsWithDatasetId) {
      try {
        await sanityClient.patch(lead._id).unset(['datasetId']).commit()
      } catch (err) {
        console.error(`  ❌ Failed to clean ${lead._id}`)
      }
    }

    console.log(`✅ Cleaned datasetId references\n`)
  }

  // STEP 3: Delete dataset documents
  console.log('🗑️  Deleting dataset documents...')

  try {
    await sanityClient.delete(testingDatasetId)
    console.log('  ✅ Deleted TESTING dataset')
  } catch (err) {
    console.error('  ❌ Failed to delete TESTING dataset:', err.message)
  }

  try {
    await sanityClient.delete(originalDatasetId)
    console.log('  ✅ Deleted Original Dataset')
  } catch (err) {
    console.error('  ❌ Failed to delete Original Dataset:', err.message)
  }

  // STEP 4: Verify final state
  console.log('\n✨ Cleanup complete! Verifying...')

  const finalCount = await sanityClient.fetch(`count(*[_type == "dbrLead"])`)
  const datasetsLeft = await sanityClient.fetch(`count(*[_type == "dataset"])`)

  console.log(`\n📊 Final state:`)
  console.log(`  Total leads: ${finalCount}`)
  console.log(`  Datasets: ${datasetsLeft}`)
  console.log(`\n✅ Dashboard should now show ${finalCount} original leads`)
}

cleanup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Cleanup failed:', err)
    process.exit(1)
  })
