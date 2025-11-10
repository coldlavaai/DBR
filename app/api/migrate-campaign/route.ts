import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST() {
  try {
    console.log('🔄 Starting migration: Adding campaign field to existing records...')

    // Fetch all dbrLead records that don't have a campaign field
    const leadsWithoutCampaign = await sanityClient.fetch(
      `*[_type == "dbrLead" && !defined(campaign)] {
        _id,
        firstName,
        secondName,
        phoneNumber
      }`
    )

    console.log(`📊 Found ${leadsWithoutCampaign.length} records without campaign field`)

    if (leadsWithoutCampaign.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All records already have campaign field',
        updated: 0,
        errors: 0
      })
    }

    let updated = 0
    let errors = 0

    for (const lead of leadsWithoutCampaign) {
      try {
        await sanityClient
          .patch(lead._id)
          .set({ campaign: 'October' })
          .commit()

        updated++
        console.log(`✅ Updated: ${lead.firstName} ${lead.secondName}`)
      } catch (error: any) {
        errors++
        console.error(`❌ Error updating ${lead._id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration complete. Updated ${updated} records.`,
      updated,
      errors,
      total: leadsWithoutCampaign.length
    })

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
