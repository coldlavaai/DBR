import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_READ_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function checkArchived() {
  try {
    const archivedLeads = await sanityClient.fetch(
      `*[_type == "dbrLead" && archived == true] {
        _id,
        firstName,
        secondName,
        phoneNumber,
        archived,
        archivedAt,
        contactStatus
      }`
    )

    console.log(`\n📦 Found ${archivedLeads.length} archived leads in Sanity:\n`)
    archivedLeads.forEach((lead: any) => {
      console.log(`- ${lead.firstName} ${lead.secondName} (${lead.phoneNumber})`)
      console.log(`  Status: ${lead.contactStatus}`)
      console.log(`  Archived: ${lead.archived}`)
      console.log(`  Archived At: ${lead.archivedAt}`)
      console.log()
    })

    if (archivedLeads.length === 0) {
      console.log('❌ No archived leads found in Sanity')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

checkArchived()
