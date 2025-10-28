import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function GET() {
  try {
    const leads = [
      { id: 'dbr-447925285841', name: 'Julie Dinmore' },
      { id: 'dbr-447772897016', name: 'Al Smith' }
    ]

    console.log('🔧 Activating manual mode in Sanity...')

    for (const { id, name } of leads) {
      await sanityClient
        .patch(id)
        .set({
          manualMode: true,
          manualModeActivatedAt: new Date().toISOString(),
        })
        .commit()

      console.log(`✅ ${name}: Manual mode activated`)
    }

    return NextResponse.json({
      success: true,
      message: 'Manual mode activated for Julie and Al',
      leads: leads.map(l => l.name)
    })
  } catch (error) {
    console.error('Error activating manual mode:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
