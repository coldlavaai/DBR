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

async function findDuplicates() {
  console.log('🔍 Checking for duplicate phone numbers...\n')

  // Get all leads with phone numbers
  const allLeads = await sanityClient.fetch(
    `*[_type == "dbrLead"] {
      _id,
      firstName,
      secondName,
      phoneNumber,
      datasetId,
      _createdAt
    } | order(phoneNumber)`
  )

  console.log(`📊 Total leads: ${allLeads.length}\n`)

  // Group by phone number
  const phoneGroups = {}
  allLeads.forEach(lead => {
    const phone = lead.phoneNumber
    if (!phoneGroups[phone]) {
      phoneGroups[phone] = []
    }
    phoneGroups[phone].push(lead)
  })

  // Find duplicates
  const duplicates = Object.entries(phoneGroups).filter(([_, leads]) => leads.length > 1)

  console.log(`🔁 Found ${duplicates.length} duplicate phone numbers\n`)

  if (duplicates.length > 0) {
    console.log('First 10 duplicates:')
    duplicates.slice(0, 10).forEach(([phone, leads]) => {
      console.log(`\n📞 ${phone} (${leads.length} copies):`)
      leads.forEach(lead => {
        const datasetInfo = lead.datasetId ? `Dataset: ${lead.datasetId._ref}` : 'No dataset'
        console.log(`  - ${lead.firstName} ${lead.secondName} (${datasetInfo}, created: ${lead._createdAt})`)
      })
    })

    // Count leads in TESTING dataset
    const testingLeads = allLeads.filter(l => l.datasetId && l.datasetId._ref === '0zCFr5Hp4BHeiAjnocfez4')
    console.log(`\n🧪 TESTING dataset: ${testingLeads.length} leads`)

    // Count leads without dataset
    const noDataset = allLeads.filter(l => !l.datasetId)
    console.log(`❌ No dataset: ${noDataset.length} leads`)

    console.log(`\n💡 Recommendation: Delete all ${testingLeads.length} TESTING dataset leads to restore original state`)
  }
}

findDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
