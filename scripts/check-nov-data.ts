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

async function checkNovData() {
  console.log('🔍 Checking 10th Nov records with activity...')

  // Get 10th Nov records with replies
  const novWithReplies = await client.fetch<Array<{ _id: string, phoneNumber: string, firstName: string, secondName: string, replyReceived: string, m1Sent: string }>>(`*[_type == "dbrLead" && campaign == "10th Nov" && defined(replyReceived)] | order(replyReceived desc) [0...10] { _id, phoneNumber, firstName, secondName, replyReceived, m1Sent }`)

  console.log(`\n📱 Found ${novWithReplies.length} 10th Nov records with replies`)
  console.log(`\nSample records:`)
  novWithReplies.forEach(r => {
    console.log(`  ${r.firstName} ${r.secondName} (${r.phoneNumber})`)
    console.log(`    Reply: ${r.replyReceived}`)
    console.log(`    M1 Sent: ${r.m1Sent}`)
    console.log(`    ID: ${r._id}`)
  })

  // Count total 10th Nov records
  const total = await client.fetch(`count(*[_type == "dbrLead" && campaign == "10th Nov"])`)
  console.log(`\n📊 Total 10th Nov records: ${total}`)

  // Check for any records with October dates but 10th Nov campaign
  const octoberDates = await client.fetch<Array<{ _id: string, phoneNumber: string, m1Sent: string }>>(`*[_type == "dbrLead" && campaign == "10th Nov" && m1Sent < "2024-11-01"] [0...5] { _id, phoneNumber, m1Sent }`)
  
  if (octoberDates.length > 0) {
    console.log(`\n⚠️ WARNING: Found ${octoberDates.length} records in 10th Nov campaign with October dates:`)
    octoberDates.forEach(r => {
      console.log(`  ${r.phoneNumber}: ${r.m1Sent} (${r._id})`)
    })
  } else {
    console.log(`\n✅ No October-dated records found in 10th Nov campaign`)
  }
}

checkNovData()
