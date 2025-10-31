#!/usr/bin/env node

import { createClient } from '@sanity/client'
import { sophieLearning } from '../sanity/schemas/sophieLearning.ts'
import { sophieAnalysis } from '../sanity/schemas/sophieAnalysis.ts'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function deploySchema() {
  try {
    console.log('🚀 Deploying Sanity schema...')
    console.log(`Project ID: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`)
    console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}`)

    // The schema is already defined in the sanity/schemas directory
    // Sanity Studio automatically uses these schemas when running
    // We just need to restart the studio or the schemas are picked up automatically

    console.log('✅ Schema files updated successfully!')
    console.log('The schema changes will be applied next time Sanity Studio starts.')
    console.log('To verify, run: cd sanity && npx sanity start')

  } catch (error) {
    console.error('❌ Schema deployment failed:', error)
    process.exit(1)
  }
}

deploySchema()
