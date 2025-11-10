import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function deleteOldOctoberRecords() {
  console.log('🧹 Deleting old-format October records...')

  // Get all October records with old ID format (dbr-{phone} instead of dbr-October-{phone})
  const oldFormatRecords = await client.fetch<Array<{ _id: string, phoneNumber: string }>>(`*[_type == "dbrLead" && campaign == "October" && _id match "dbr-44*" && !(_id match "dbr-October-*")] { _id, phoneNumber }`)

  console.log(`📊 Found ${oldFormatRecords.length} old-format records to delete`)

  if (oldFormatRecords.length === 0) {
    console.log('✅ No old-format records to delete')
    return
  }

  // Delete in batches of 100
  const BATCH_SIZE = 100
  let deleted = 0

  for (let i = 0; i < oldFormatRecords.length; i += BATCH_SIZE) {
    const batch = oldFormatRecords.slice(i, i + BATCH_SIZE)

    const transaction = client.transaction()
    batch.forEach(record => {
      transaction.delete(record._id)
    })

    try {
      await transaction.commit()
      deleted += batch.length
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      console.log(`✅ Deleted batch ${batchNum}: ${deleted}/${oldFormatRecords.length}`)
    } catch (error: any) {
      console.error(`❌ Error deleting batch:`, error.message)
    }
  }

  console.log(`\n✅ Deletion complete! Deleted ${deleted}/${oldFormatRecords.length} old-format records`)
}

deleteOldOctoberRecords()
