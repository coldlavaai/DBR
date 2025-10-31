#!/usr/bin/env node

import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

console.log('🏥 GREENSTAR DBR DASHBOARD - SYSTEM HEALTH CHECK')
console.log('='.repeat(70))
console.log('')

const issues = []
const warnings = []
const successes = []

// 1. SANITY CMS CONNECTION
console.log('📊 Testing Sanity CMS Connection...')
try {
  const datasets = await sanityClient.request({
    uri: `/projects/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`,
    withCredentials: false,
  })
  successes.push('✅ Sanity CMS connection successful')

  // Check if we can read data
  const leadCount = await sanityClient.fetch(`count(*[_type == "dbrLead"])`)
  const analysisCount = await sanityClient.fetch(`count(*[_type == "sophieAnalysis"])`)
  const learningCount = await sanityClient.fetch(`count(*[_type == "sophieLearning"])`)

  successes.push(`✅ Database accessible: ${leadCount} leads, ${analysisCount} analyses, ${learningCount} learnings`)

  // Check for structured messages migration status
  const leadsWithStructuredMessages = await sanityClient.fetch(
    `count(*[_type == "dbrLead" && defined(messages) && count(messages) > 0])`
  )
  const leadsWithConversationHistory = await sanityClient.fetch(
    `count(*[_type == "dbrLead" && defined(conversationHistory) && conversationHistory != ""])`
  )

  if (leadsWithConversationHistory > leadsWithStructuredMessages) {
    warnings.push(
      `⚠️  Migration incomplete: ${leadsWithConversationHistory - leadsWithStructuredMessages} leads need structured message migration`
    )
  } else {
    successes.push('✅ All conversations migrated to structured format')
  }

} catch (error) {
  issues.push(`❌ Sanity CMS connection FAILED: ${error.message}`)
}

// 2. ANTHROPIC API CONNECTION
console.log('\n🤖 Testing Anthropic API Connection...')
try {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Test with a minimal API call
  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }],
  })

  successes.push('✅ Anthropic API connection successful (Sophie Intelligence ready)')
} catch (error) {
  issues.push(`❌ Anthropic API FAILED: ${error.message}`)
}

// 3. DATA INTEGRITY CHECKS
console.log('\n🔍 Checking Data Integrity...')
try {
  // Check for orphaned analyses
  const orphanedAnalyses = await sanityClient.fetch(
    `count(*[_type == "sophieAnalysis" && !defined(lead)])`
  )

  if (orphanedAnalyses > 0) {
    warnings.push(`⚠️  ${orphanedAnalyses} orphaned analyses found (no linked lead)`)
  } else {
    successes.push('✅ No orphaned analyses')
  }

  // Check for duplicate analyses
  const duplicateAnalyses = await sanityClient.fetch(`
    *[_type == "sophieAnalysis"] {
      "leadId": lead._ref
    } | order(leadId) | {
      "leadId": leadId,
      "count": count(*[_type == "sophieAnalysis" && lead._ref == ^.leadId])
    }[count > 1]
  `)

  if (duplicateAnalyses.length > 0) {
    warnings.push(`⚠️  ${duplicateAnalyses.length} leads have duplicate analyses`)
  } else {
    successes.push('✅ No duplicate analyses')
  }

  // Check for inactive learnings that are still being referenced
  const inactiveLearnings = await sanityClient.fetch(
    `count(*[_type == "sophieLearning" && isActive == false])`
  )
  const activeLearnings = await sanityClient.fetch(
    `count(*[_type == "sophieLearning" && isActive == true])`
  )

  successes.push(`✅ Learning management: ${activeLearnings} active, ${inactiveLearnings} archived`)

} catch (error) {
  issues.push(`❌ Data integrity check FAILED: ${error.message}`)
}

// 4. SECURITY AUDIT
console.log('\n🔒 Security Audit...')

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_DATASET',
  'SANITY_API_WRITE_TOKEN',
  'ANTHROPIC_API_KEY',
  'AUTH_SECRET',
]

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
if (missingEnvVars.length > 0) {
  issues.push(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`)
} else {
  successes.push('✅ All required environment variables present')
}

// Check for placeholder values
if (process.env.RESEND_API_KEY === 'your-resend-api-key-here') {
  warnings.push('⚠️  RESEND_API_KEY is using placeholder value (email functionality disabled)')
}

// 5. SOPHIE INTELLIGENCE HEALTH
console.log('\n🧠 Sophie Intelligence Health...')
try {
  const hardRules = await sanityClient.fetch(
    `count(*[_type == "sophieLearning" && isActive == true && (isHardRule == true || timesReinforced >= 3)])`
  )
  const runningMemory = await sanityClient.fetch(
    `count(*[_type == "sophieLearning" && isActive == true && (isHardRule != true && (!timesReinforced || timesReinforced < 3))])`
  )

  successes.push(`✅ Sophie's brain: ${hardRules} Hard Rules, ${runningMemory} Running Memory entries`)

  // Check version control system
  const analysesWithVersionControl = await sanityClient.fetch(
    `count(*[_type == "sophieAnalysis" && defined(appliedLearningIds)])`
  )
  const totalAnalyses = await sanityClient.fetch(`count(*[_type == "sophieAnalysis"])`)

  if (analysesWithVersionControl < totalAnalyses) {
    warnings.push(`⚠️  ${totalAnalyses - analysesWithVersionControl} analyses missing version control data`)
  } else {
    successes.push('✅ All analyses have version control tracking')
  }

} catch (error) {
  issues.push(`❌ Sophie Intelligence check FAILED: ${error.message}`)
}

// 6. API ENDPOINTS CHECK
console.log('\n🌐 Checking API Endpoints...')
try {
  const baseUrl = 'https://greenstar-dbr-dashboard.vercel.app'

  const endpoints = [
    '/api/sophie-analyze-conversations',
    '/api/sophie-teaching-dialogue',
    '/api/sophie-consolidate-learnings',
    '/api/sophie-reanalyze',
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // We expect 400 errors for missing params, not 500 errors
      if (response.status === 500) {
        issues.push(`❌ ${endpoint} returning 500 error`)
      } else {
        successes.push(`✅ ${endpoint} endpoint responding`)
      }
    } catch (fetchError) {
      warnings.push(`⚠️  Could not reach ${endpoint}`)
    }
  }
} catch (error) {
  warnings.push(`⚠️  API endpoint check skipped: ${error.message}`)
}

// FINAL REPORT
console.log('\n' + '='.repeat(70))
console.log('📋 HEALTH CHECK SUMMARY')
console.log('='.repeat(70))

if (successes.length > 0) {
  console.log('\n✅ SUCCESSES:')
  successes.forEach(s => console.log('  ' + s))
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:')
  warnings.forEach(w => console.log('  ' + w))
}

if (issues.length > 0) {
  console.log('\n❌ CRITICAL ISSUES:')
  issues.forEach(i => console.log('  ' + i))
}

console.log('\n' + '='.repeat(70))
console.log(`OVERALL HEALTH: ${issues.length === 0 ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`)
console.log(`Issues: ${issues.length} | Warnings: ${warnings.length} | Successes: ${successes.length}`)
console.log('='.repeat(70))

process.exit(issues.length > 0 ? 1 : 0)
