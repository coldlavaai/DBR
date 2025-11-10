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

async function checkCampaigns() {
  console.log('📊 Checking campaign data...')

  // Count records WITHOUT campaign field (old format)
  const oldRecords = await client.fetch(`count(*[_type == "dbrLead" && !defined(campaign)])`)
  console.log(`❌ Old records (no campaign): ${oldRecords}`)

  // Count records WITH campaign field (new format)
  const octoberRecords = await client.fetch(`count(*[_type == "dbrLead" && campaign == "October"])`)
  console.log(`✅ October campaign: ${octoberRecords}`)

  const novRecords = await client.fetch(`count(*[_type == "dbrLead" && campaign == "10th Nov"])`)
  console.log(`✅ 10th Nov campaign: ${novRecords}`)

  // Sample some old records to see their IDs
  const sampleOld = await client.fetch<Array<{ _id: string }>>(`*[_type == "dbrLead" && !defined(campaign)][0...5] { _id }`)
  console.log(`\n📝 Sample old record IDs:`)
  sampleOld.forEach(r => console.log(`  - ${r._id}`))
}

checkCampaigns()
