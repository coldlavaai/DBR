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

async function checkNovDuplicates() {
  console.log('📊 Checking 10th Nov for duplicates...')

  const nov = await client.fetch<Array<{ _id: string, phoneNumber: string }>>(`*[_type == "dbrLead" && campaign == "10th Nov"] { _id, phoneNumber }`)
  
  const byPhone = new Map<string, string[]>()
  nov.forEach(r => {
    if (!byPhone.has(r.phoneNumber)) {
      byPhone.set(r.phoneNumber, [])
    }
    byPhone.get(r.phoneNumber)!.push(r._id)
  })

  const dupes = Array.from(byPhone.entries()).filter(([_, ids]) => ids.length > 1)
  console.log(`\n📱 10th Nov:`)
  console.log(`  Total records: ${nov.length}`)
  console.log(`  Unique phones: ${byPhone.size}`)
  console.log(`  Duplicate phones: ${dupes.length}`)

  if (dupes.length > 0) {
    console.log(`\n  Sample duplicates:`)
    dupes.slice(0, 5).forEach(([phone, ids]) => {
      console.log(`    ${phone}: ${ids.length} records`)
      ids.forEach(id => console.log(`      - ${id}`))
    })
  }
}

checkNovDuplicates()
