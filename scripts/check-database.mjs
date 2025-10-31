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

async function checkDatabase() {
  console.log('🔍 Checking database state...\n')

  // Total leads
  const totalLeads = await sanityClient.fetch(
    `count(*[_type == "dbrLead"])`
  )
  console.log(`📊 Total leads in database: ${totalLeads}`)

  // Check if dataset schema exists
  const datasets = await sanityClient.fetch(
    `*[_type == "dataset"] { _id, name, totalLeads }`
  )

  if (datasets.length > 0) {
    console.log(`\n📋 Found ${datasets.length} dataset(s):`)
    datasets.forEach(d => {
      console.log(`  - ${d.name}: ${d.totalLeads} leads (ID: ${d._id})`)
    })

    // Check leads with dataset references
    const leadsWithDataset = await sanityClient.fetch(
      `count(*[_type == "dbrLead" && defined(datasetId)])`
    )
    console.log(`\n🔗 Leads with dataset reference: ${leadsWithDataset}`)

    // Check leads without dataset
    const leadsWithoutDataset = await sanityClient.fetch(
      `count(*[_type == "dbrLead" && !defined(datasetId)])`
    )
    console.log(`❌ Leads without dataset reference: ${leadsWithoutDataset}`)
  } else {
    console.log(`\n✅ No dataset schema found (expected for original dashboard)`)
  }

  // Sample of first 5 leads to see structure
  console.log(`\n📄 Sample of 5 leads:`)
  const sampleLeads = await sanityClient.fetch(
    `*[_type == "dbrLead"] | order(_createdAt desc) [0...5] {
      _id,
      firstName,
      secondName,
      phoneNumber,
      datasetId
    }`
  )

  sampleLeads.forEach((lead, i) => {
    console.log(`  ${i + 1}. ${lead.firstName} ${lead.secondName} - ${lead.phoneNumber}`)
    if (lead.datasetId) {
      console.log(`     → Has datasetId: ${lead.datasetId._ref}`)
    }
  })
}

checkDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
