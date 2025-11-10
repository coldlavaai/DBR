import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function deleteAllDbrLeads() {
  console.log('🧹 Starting bulk deletion of all dbrLead records...')

  try {
    // Fetch all dbrLead document IDs
    const records = await client.fetch<Array<{ _id: string }>>(
      `*[_type == "dbrLead"] { _id }`
    )

    console.log(`📊 Found ${records.length} records to delete`)

    if (records.length === 0) {
      console.log('✅ No records to delete')
      return
    }

    // Delete in batches of 100 using transactions
    const BATCH_SIZE = 100
    let deleted = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      // Create a transaction with multiple deletes
      const transaction = client.transaction()
      batch.forEach(record => {
        transaction.delete(record._id)
      })

      try {
        await transaction.commit()
        deleted += batch.length
        console.log(`✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${deleted}/${records.length}`)
      } catch (error: any) {
        console.error(`❌ Error deleting batch:`, error.message)
      }
    }

    console.log(`\n✅ Deletion complete! Deleted ${deleted}/${records.length} records`)

  } catch (error: any) {
    console.error('❌ Bulk deletion failed:', error.message)
    process.exit(1)
  }
}

deleteAllDbrLeads()
