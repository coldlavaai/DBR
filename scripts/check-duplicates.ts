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

async function checkDuplicates() {
  console.log('📊 Checking for duplicates within campaigns...')

  // Get October records
  const october = await client.fetch<Array<{ _id: string, phoneNumber: string }>>(`*[_type == "dbrLead" && campaign == "October"] { _id, phoneNumber }`)
  
  // Group by phone number
  const octoberPhones = new Map<string, string[]>()
  october.forEach(r => {
    const phone = r.phoneNumber
    if (!octoberPhones.has(phone)) {
      octoberPhones.set(phone, [])
    }
    octoberPhones.get(phone)!.push(r._id)
  })

  const octoberDupes = Array.from(octoberPhones.entries()).filter(([_, ids]) => ids.length > 1)
  console.log(`\n📱 October campaign:`)
  console.log(`  Total records: ${october.length}`)
  console.log(`  Unique phones: ${octoberPhones.size}`)
  console.log(`  Duplicate phones: ${octoberDupes.length}`)

  if (octoberDupes.length > 0) {
    console.log(`\n  Sample duplicates:`)
    octoberDupes.slice(0, 3).forEach(([phone, ids]) => {
      console.log(`    ${phone}: ${ids.length} records`)
      ids.forEach(id => console.log(`      - ${id}`))
    })
  }

  // Get 10th Nov records
  const nov = await client.fetch<Array<{ _id: string, phoneNumber: string }>>(`*[_type == "dbrLead" && campaign == "10th Nov"] { _id, phoneNumber }`)
  
  const novPhones = new Map<string, string[]>()
  nov.forEach(r => {
    const phone = r.phoneNumber
    if (!novPhones.has(phone)) {
      novPhones.set(phone, [])
    }
    novPhones.get(phone)!.push(r._id)
  })

  const novDupes = Array.from(novPhones.entries()).filter(([_, ids]) => ids.length > 1)
  console.log(`\n📱 10th Nov campaign:`)
  console.log(`  Total records: ${nov.length}`)
  console.log(`  Unique phones: ${novPhones.size}`)
  console.log(`  Duplicate phones: ${novDupes.length}`)

  if (novDupes.length > 0) {
    console.log(`\n  Sample duplicates:`)
    novDupes.slice(0, 3).forEach(([phone, ids]) => {
      console.log(`    ${phone}: ${ids.length} records`)
      ids.forEach(id => console.log(`      - ${id}`))
    })
  }
}

checkDuplicates()
