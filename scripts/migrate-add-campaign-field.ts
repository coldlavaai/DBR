#!/usr/bin/env tsx
/**
 * Migration Script: Add campaign field to existing records
 * 
 * This adds campaign='October' to all existing dbrLead records that don't have it yet
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function migrateExistingRecords() {
  console.log('🔄 Starting migration: Adding campaign field to existing records...\n')

  try {
    // Fetch all dbrLead records that don't have a campaign field
    const leadsWithoutCampaign = await sanityClient.fetch(
      `*[_type == "dbrLead" && !defined(campaign)] {
        _id,
        firstName,
        secondName,
        phoneNumber
      }`
    )

    console.log(`📊 Found ${leadsWithoutCampaign.length} records without campaign field\n`)

    if (leadsWithoutCampaign.length === 0) {
      console.log('✅ All records already have campaign field. Nothing to migrate.')
      return
    }

    console.log('🔄 Adding campaign="October" to existing records...\n')

    let updated = 0
    let errors = 0

    for (const lead of leadsWithoutCampaign) {
      try {
        await sanityClient
          .patch(lead._id)
          .set({ campaign: 'October' })
          .commit()

        updated++
        process.stdout.write(`✅ Updated: ${lead.firstName} ${lead.secondName} (${lead.phoneNumber})\n`)
      } catch (error: any) {
        errors++
        console.error(`❌ Error updating ${lead._id}: ${error.message}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Updated: ${updated}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📊 Total processed: ${leadsWithoutCampaign.length}`)
    console.log('='.repeat(60))
    console.log('\n✅ Migration complete!\n')

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    throw error
  }
}

migrateExistingRecords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
