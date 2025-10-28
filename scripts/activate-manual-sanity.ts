import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  token: process.env.SANITY_API_WRITE_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function activateManualMode() {
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

  console.log('\n✅ All done! Manual mode will now show across all dashboard sections.')
}

activateManualMode().catch(console.error)
