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

async function migrateOctoberData() {
  console.log('🔄 Migrating October data from old to new IDs...')

  // Get all October records grouped by phone number
  const allRecords = await client.fetch<Array<{ _id: string, phoneNumber: string }>>(`*[_type == "dbrLead" && campaign == "October"] { _id, phoneNumber }`)

  // Group by phone
  const byPhone = new Map<string, string[]>()
  allRecords.forEach(r => {
    if (!byPhone.has(r.phoneNumber)) {
      byPhone.set(r.phoneNumber, [])
    }
    byPhone.get(r.phoneNumber)!.push(r._id)
  })

  // Find duplicates
  const duplicates = Array.from(byPhone.entries()).filter(([_, ids]) => ids.length > 1)
  console.log(`📊 Found ${duplicates.length} phone numbers with duplicate records`)

  let migrated = 0

  for (const [phone, ids] of duplicates) {
    // Identify old and new IDs
    const oldId = ids.find(id => !id.includes('October'))
    const newId = ids.find(id => id.includes('October'))

    if (!oldId || !newId) {
      console.log(`⚠️ Skipping ${phone} - couldn't identify old/new pair`)
      continue
    }

    // Fetch both records
    const oldRecord = await client.getDocument(oldId)
    const newRecord = await client.getDocument(newId)

    if (!oldRecord || !newRecord) {
      console.log(`⚠️ Skipping ${phone} - couldn't fetch records`)
      continue
    }

    // Merge important fields from old to new (preserve conversation history, status, notes)
    const fieldsToMerge = [
      'conversationHistory',
      'latestLeadReply',
      'notes',
      'm1Sent',
      'm2Sent',
      'm3Sent',
      'replyReceived',
      'contactStatus',
      'leadSentiment',
      'callBookedTime',
      'installDate',
      'archived',
      'archivedAt'
    ]

    const updates: any = {}
    let hasUpdates = false

    fieldsToMerge.forEach(field => {
      if ((oldRecord as any)[field] && !(newRecord as any)[field]) {
        updates[field] = (oldRecord as any)[field]
        hasUpdates = true
      }
    })

    // Update new record if needed
    if (hasUpdates) {
      try {
        await client.patch(newId).set(updates).commit()
      } catch (error: any) {
        console.error(`❌ Error updating ${newId}:`, error.message)
        continue
      }
    }

    // Find and update all references
    try {
      const references = await client.fetch(`*[references("${oldId}")]`)

      for (const ref of references) {
        // Update the reference to point to new ID
        const refDoc: any = await client.getDocument(ref._id)
        if (refDoc && refDoc.lead && refDoc.lead._ref === oldId) {
          await client.patch(ref._id).set({ 'lead._ref': newId }).commit()
        }
      }

      // Now delete the old record
      await client.delete(oldId)
      migrated++

      if (migrated % 10 === 0) {
        console.log(`✅ Migrated ${migrated}/${duplicates.length}`)
      }
    } catch (error: any) {
      console.error(`❌ Error migrating ${phone}:`, error.message)
    }
  }

  console.log(`\n✅ Migration complete! Migrated ${migrated}/${duplicates.length} records`)
}

migrateOctoberData()
