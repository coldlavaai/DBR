import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

// ============================================================================
// CONVERSATION QUALITY ANALYSIS - Sophie's Deep Dive
// ============================================================================
// This endpoint analyzes EVERY conversation for errors:
// - Repetition errors
// - Context failures
// - Double booking
// - Pricing violations
// - Wrong products mentioned
// - Robotic language
// ============================================================================

export async function GET(request: Request) {
  try {
    console.log('🔍 Sophie Analyzing Conversations...')

    // Fetch all leads with conversation history
    const allLeads = await sanityClient.fetch(`*[_type == "dbrLead" && !archived] {
      _id, _createdAt, _updatedAt, firstName, secondName, phoneNumber,
      contactStatus, leadSentiment, latestLeadReply, notes, postcode,
      replyReceived, replyProcessed, m1Sent, m2Sent, m3Sent,
      callBookedTime, lastSyncedAt, finalStatus,
      "messages": *[_type == "message" && references(^._id)] | order(_createdAt asc) {
        _id, _createdAt, sender, content
      }
    }`)

    console.log(`📊 Analyzing ${allLeads.length} leads...`)

    // Analyze each conversation
    const conversationIssues = []

    for (const lead of allLeads) {
      if (!lead.messages || lead.messages.length === 0) continue

      const issues = analyzeConversation(lead)
      if (issues.length > 0) {
        conversationIssues.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          phoneNumber: lead.phoneNumber,
          contactStatus: lead.contactStatus,
          leadSentiment: lead.leadSentiment,
          issues
        })
      }
    }

    console.log(`⚠️ Found ${conversationIssues.length} conversations with issues`)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalLeads: allLeads.length,
      conversationsWithIssues: conversationIssues.length,
      issues: conversationIssues
    })

  } catch (error: any) {
    console.error('❌ Conversation Analysis Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze conversations', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// CONVERSATION ANALYSIS LOGIC
// ============================================================================

function analyzeConversation(lead: any): any[] {
  const issues: any[] = []
  const messages = lead.messages || []

  // Get only agent messages for analysis
  const agentMessages = messages.filter((m: any) => m.sender === 'agent')
  const leadMessages = messages.filter((m: any) => m.sender === 'lead')

  if (agentMessages.length === 0) return issues

  // 1. CHECK FOR REPETITION ERRORS
  for (let i = 1; i < agentMessages.length; i++) {
    const prevContent = agentMessages[i - 1].content.toLowerCase()
    const currContent = agentMessages[i].content.toLowerCase()

    if (hasRepetition(prevContent, currContent)) {
      issues.push({
        type: 'CRITICAL',
        category: 'REPETITION_ERROR',
        title: 'Agent repeated information',
        description: 'Same message content sent in multiple messages - sounds robotic',
        evidence: {
          message1: agentMessages[i - 1].content.substring(0, 100),
          message2: agentMessages[i].content.substring(0, 100)
        },
        recommendation: 'Each message should build on previous ones, not repeat them'
      })
    }
  }

  // 2. CHECK FOR CONTEXT FAILURES
  for (let i = 0; i < leadMessages.length; i++) {
    const leadMsg = leadMessages[i]
    const leadContent = leadMsg.content.toLowerCase()

    // Find next agent message after this lead message
    const leadMsgTime = new Date(leadMsg._createdAt).getTime()
    const nextAgentMsg = agentMessages.find((m: any) =>
      new Date(m._createdAt).getTime() > leadMsgTime
    )

    if (!nextAgentMsg) continue

    const agentContent = nextAgentMsg.content.toLowerCase()

    // Check for "I rent" but agent tries to book installation
    if ((leadContent.includes('rent') || leadContent.includes('landlord')) &&
        (agentContent.includes('installation') || agentContent.includes('install'))) {
      issues.push({
        type: 'CRITICAL',
        category: 'CONTEXT_FAILURE',
        title: 'Agent ignored rental status',
        description: 'Lead said they rent, but agent tried to book installation',
        evidence: {
          leadSaid: leadMsg.content.substring(0, 100),
          agentReplied: nextAgentMsg.content.substring(0, 100)
        },
        recommendation: 'Should have offered landlord info pack or future contact'
      })
    }

    // Check if lead already confirmed time but agent offers more times
    if ((leadContent.includes('tuesday') || leadContent.includes('wednesday') ||
         leadContent.includes('works') || leadContent.includes('ok')) &&
        agentContent.includes('tuesday') && agentContent.includes('wednesday')) {
      issues.push({
        type: 'CRITICAL',
        category: 'DOUBLE_BOOKING',
        title: 'Agent tried to rebook confirmed call',
        description: 'Lead already confirmed time, agent offered alternatives',
        evidence: {
          leadSaid: leadMsg.content.substring(0, 100),
          agentReplied: nextAgentMsg.content.substring(0, 100)
        },
        recommendation: 'Should have confirmed the time, not offered more options'
      })
    }
  }

  // 3. CHECK FOR PRICING VIOLATIONS
  for (const msg of agentMessages) {
    const content = msg.content

    // Look for specific pricing patterns
    const pricingPatterns = [
      /£\d,?\d{3}/g, // £5,000 or £5000
      /£\d+k/gi, // £5k
      /\d+,\d{3}/g, // 5,000
    ]

    for (const pattern of pricingPatterns) {
      if (pattern.test(content)) {
        issues.push({
          type: 'CRITICAL',
          category: 'PRICING_VIOLATION',
          title: 'Agent gave specific pricing',
          description: 'Should redirect to call for personalized quote',
          evidence: {
            message: msg.content.substring(0, 150)
          },
          recommendation: 'Say "every home is different, let\'s get you personalized quote on the call"'
        })
        break
      }
    }
  }

  // 4. CHECK FOR WRONG PRODUCT MENTIONS
  const wrongProducts = ['tesla', 'powerwall', 'lg chem', 'panasonic', 'jinko', 'longi']
  const correctProducts = ['aiko', 'fox ess', 'solaredge', 'ecoflow']

  for (const msg of agentMessages) {
    const content = msg.content.toLowerCase()

    for (const product of wrongProducts) {
      if (content.includes(product)) {
        issues.push({
          type: 'CRITICAL',
          category: 'WRONG_PRODUCT',
          title: `Mentioned product Greenstar doesn't offer: ${product}`,
          description: 'Only mention Greenstar products',
          evidence: {
            message: msg.content.substring(0, 150)
          },
          recommendation: 'Only mention: Aiko panels, Fox ESS/SolarEdge inverters, EcoFlow/SolarEdge batteries'
        })
      }
    }
  }

  // 5. CHECK FOR ROBOTIC LANGUAGE
  const roboticPhrases = [
    'as an ai',
    'based on our previous conversation',
    'i would like to inform you',
    'thank you for your inquiry',
    'i am pleased to',
    'kindly note that',
    'please be advised'
  ]

  for (const msg of agentMessages) {
    const content = msg.content.toLowerCase()

    for (const phrase of roboticPhrases) {
      if (content.includes(phrase)) {
        issues.push({
          type: 'WARNING',
          category: 'ROBOTIC_LANGUAGE',
          title: 'Message sounds robotic',
          description: 'Too formal, doesn\'t sound human',
          evidence: {
            message: msg.content.substring(0, 150),
            roboticPhrase: phrase
          },
          recommendation: 'Use conversational UK tone: "Ah yeah, totally get that!"'
        })
      }
    }
  }

  // 6. CHECK FOR NO CONTEXT REFERENCE IN M2/M3
  if (agentMessages.length >= 2 && leadMessages.length > 0) {
    const m2 = agentMessages[1]
    const m2Content = m2.content.toLowerCase()

    // Check if M2 references any previous context
    const contextWords = ['you mentioned', 'you said', 'you asked', 'following up', 'as you', 'since you']
    const hasContextRef = contextWords.some(word => m2Content.includes(word))

    if (!hasContextRef && leadMessages.length > 0) {
      issues.push({
        type: 'WARNING',
        category: 'NO_CONTEXT_REFERENCE',
        title: 'M2 doesn\'t reference previous context',
        description: 'Second message should build on M1 and reference lead\'s response',
        evidence: {
          message: m2.content.substring(0, 150)
        },
        recommendation: 'Start with "You mentioned..." or "Following up on..."'
      })
    }
  }

  // 7. CHECK FOR AMERICAN SPELLING
  const americanSpellings = [
    { word: 'color', uk: 'colour' },
    { word: 'realize', uk: 'realise' },
    { word: 'optimize', uk: 'optimise' },
    { word: 'center', uk: 'centre' },
    { word: 'labor', uk: 'labour' },
  ]

  for (const msg of agentMessages) {
    const content = msg.content.toLowerCase()

    for (const { word, uk } of americanSpellings) {
      if (content.includes(word)) {
        issues.push({
          type: 'WARNING',
          category: 'AMERICAN_SPELLING',
          title: `American spelling: "${word}"`,
          description: `Should use UK spelling: "${uk}"`,
          evidence: {
            message: msg.content.substring(0, 150)
          },
          recommendation: `Use "${uk}" instead of "${word}"`
        })
      }
    }
  }

  return issues
}

// Helper function to detect repetition
function hasRepetition(text1: string, text2: string): boolean {
  // Remove common words and check for significant overlap
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']

  const words1 = text1.split(' ')
    .filter(w => w.length > 3 && !commonWords.includes(w))
  const words2 = text2.split(' ')
    .filter(w => w.length > 3 && !commonWords.includes(w))

  if (words1.length === 0 || words2.length === 0) return false

  // Calculate overlap percentage
  let matchCount = 0
  for (const word of words1) {
    if (words2.includes(word)) matchCount++
  }

  const overlapPercentage = (matchCount / Math.max(words1.length, words2.length)) * 100

  // If more than 40% of words overlap, consider it repetition
  return overlapPercentage > 40
}
