#!/usr/bin/env node

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function testNewFields() {
  try {
    console.log('🧪 Testing new schema fields...')

    // Create a test learning with new fields
    const testLearning = await client.create({
      _type: 'sophieLearning',
      category: 'TEST',
      title: 'TEST: Schema Field Test',
      userGuidance: 'This is a test to verify new fields work',
      doThis: 'Test action',
      dontDoThis: 'Test avoidance',
      priority: 'low',
      isActive: true,
      // NEW FIELDS - TESTING
      isHardRule: true,
      timesReinforced: 5,
      tags: ['test', 'schema_validation'],
      createdBy: 'Schema Test Script',
      lastUpdated: new Date().toISOString(),
    })

    console.log('✅ Created test learning:', testLearning._id)

    // Fetch it back to verify fields saved
    const fetched = await client.fetch(
      `*[_id == $id][0] {
        _id,
        title,
        isHardRule,
        timesReinforced,
        tags,
        category
      }`,
      { id: testLearning._id }
    )

    console.log('📥 Fetched learning back:', JSON.stringify(fetched, null, 2))

    if (fetched.isHardRule === true && fetched.timesReinforced === 5) {
      console.log('✅ ✅ ✅ NEW FIELDS WORK! isHardRule and timesReinforced saved correctly!')
    } else {
      console.log('❌ New fields did not save:', {
        isHardRule: fetched.isHardRule,
        timesReinforced: fetched.timesReinforced
      })
    }

    // Clean up test document
    await client.delete(testLearning._id)
    console.log('🧹 Cleaned up test learning')

    // Test appliedLearningIds on sophieAnalysis
    console.log('\n🧪 Testing sophieAnalysis new fields...')
    const analyses = await client.fetch(
      `*[_type == "sophieAnalysis"][0...1] {
        _id,
        appliedLearningIds,
        analysisVersion,
        metadata
      }`
    )

    console.log('📥 Sample analysis:', JSON.stringify(analyses[0], null, 2))

    if (analyses[0] && 'appliedLearningIds' in analyses[0]) {
      console.log('✅ appliedLearningIds field exists on sophieAnalysis!')
    } else {
      console.log('❌ appliedLearningIds field NOT found on sophieAnalysis')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testNewFields()
