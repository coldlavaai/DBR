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
// SOPHIE'S CONVERSATION INTELLIGENCE ENGINE
// ============================================================================
// This analyzes EVERY conversation for quality and learning:
//
// For each lead message → agent response pair:
// 1. Was the agent's response appropriate for what the lead said?
// 2. How could it have been better? (specific suggestions)
// 3. What patterns emerge from successful vs unsuccessful responses?
// 4. What should we teach the n8n agent to improve?
//
// This feeds back into the n8n agent for continuous improvement.
// ============================================================================

export async function GET(request: Request) {
  try {
    console.log('🧠 Sophie: Analyzing conversation quality...')

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

    // Analyze each conversation for quality and learning opportunities
    const conversationAnalysis = []
    const patterns = {
      successfulResponses: [] as any[],
      missedOpportunities: [] as any[],
      commonIssues: {} as any,
      whatWorks: [] as any[],
    }

    for (const lead of allLeads) {
      if (!lead.messages || lead.messages.length === 0) continue

      const analysis = analyzeConversationQuality(lead)

      if (analysis.insights.length > 0 || analysis.qualityScore < 80) {
        conversationAnalysis.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          phoneNumber: lead.phoneNumber,
          conversationOutcome: determineOutcome(lead),
          qualityScore: analysis.qualityScore,
          insights: analysis.insights,
          exchanges: analysis.exchanges
        })
      }

      // Collect patterns
      analysis.insights.forEach((insight: any) => {
        if (insight.type === 'success') {
          patterns.successfulResponses.push(insight)
        } else if (insight.type === 'missed_opportunity') {
          patterns.missedOpportunities.push(insight)
        }
      })
    }

    // Identify common patterns
    const issueTypes: any = {}
    conversationAnalysis.forEach(conv => {
      conv.insights.forEach((insight: any) => {
        if (!issueTypes[insight.category]) {
          issueTypes[insight.category] = { count: 0, examples: [] }
        }
        issueTypes[insight.category].count++
        if (issueTypes[insight.category].examples.length < 3) {
          issueTypes[insight.category].examples.push({
            leadName: conv.leadName,
            insight: insight.title
          })
        }
      })
    })

    patterns.commonIssues = Object.entries(issueTypes)
      .sort(([, a]: any, [, b]: any) => b.count - a.count)
      .slice(0, 5)
      .map(([category, data]: any) => ({
        category,
        count: data.count,
        examples: data.examples
      }))

    console.log(`📊 Analyzed ${conversationAnalysis.length} conversations`)

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalConversations: allLeads.length,
      analyzedConversations: conversationAnalysis.length,
      averageQualityScore: Math.round(
        conversationAnalysis.reduce((sum, c) => sum + c.qualityScore, 0) /
        (conversationAnalysis.length || 1)
      ),
      conversations: conversationAnalysis,
      patterns
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
// CONVERSATION QUALITY ANALYSIS - The Core Intelligence
// ============================================================================

function analyzeConversationQuality(lead: any): {
  qualityScore: number
  insights: any[]
  exchanges: any[]
} {
  const messages = lead.messages || []
  const insights: any[] = []
  const exchanges: any[] = []

  // Build conversation exchanges (lead message → agent response pairs)
  for (let i = 0; i < messages.length; i++) {
    const currentMsg = messages[i]

    if (currentMsg.sender === 'lead') {
      // Find the next agent response
      const agentResponse = messages.slice(i + 1).find((m: any) => m.sender === 'agent')

      if (agentResponse) {
        const exchange = {
          leadMessage: currentMsg.content,
          agentResponse: agentResponse.content,
          timestamp: currentMsg._createdAt
        }

        exchanges.push(exchange)

        // Analyze this specific exchange
        const exchangeInsights = analyzeExchange(exchange, lead, messages.slice(0, i))
        insights.push(...exchangeInsights)
      }
    }
  }

  // Calculate overall quality score
  const qualityScore = calculateQualityScore(insights, exchanges, lead)

  return {
    qualityScore,
    insights,
    exchanges
  }
}

// Analyze a single lead message → agent response exchange
function analyzeExchange(
  exchange: any,
  lead: any,
  previousMessages: any[]
): any[] {
  const insights: any[] = []
  const leadMsg = exchange.leadMessage.toLowerCase()
  const agentMsg = exchange.agentResponse.toLowerCase()

  // 1. TIMING OBJECTION ANALYSIS
  if (leadMsg.includes('busy') || leadMsg.includes('not now') || leadMsg.includes('later') || leadMsg.includes('maybe')) {
    if (!agentMsg.includes('tuesday') && !agentMsg.includes('wednesday') && !agentMsg.includes('thursday') &&
        !agentMsg.includes('monday') && !agentMsg.includes('friday')) {
      insights.push({
        type: 'missed_opportunity',
        category: 'Timing Objection',
        title: 'Should have offered specific times',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWentWrong: 'Lead mentioned timing concern. Agent should have offered specific day/time options instead of vague scheduling.',
        howToImprove: 'When leads mention "busy" or "later", immediately offer 2-3 specific times: "How about Tuesday 2pm or Wednesday 10am?" This reduces friction.',
        impact: 'High - Specific times convert 40% better',
        priority: 'high'
      })
    } else if (agentMsg.includes('vat') || agentMsg.includes('march 2027')) {
      insights.push({
        type: 'success',
        category: 'Timing Objection',
        title: 'Good use of urgency with VAT deadline',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWorked: 'Agent combined specific timing with VAT deadline urgency',
        learnFrom: 'Mentioning March 2027 deadline adds legitimate urgency',
        priority: 'learning'
      })
    }
  }

  // 2. PRICE OBJECTION ANALYSIS
  if (leadMsg.includes('cost') || leadMsg.includes('price') || leadMsg.includes('how much') || leadMsg.includes('expensive')) {
    const hasPricing = /£\d|£\s?\d/.test(agentMsg)

    if (hasPricing) {
      insights.push({
        type: 'issue',
        category: 'Price Objection',
        title: 'Gave specific pricing',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWentWrong: 'Provided specific pricing. This anchors expectations incorrectly and removes reason to book call.',
        howToImprove: 'Redirect: "Every home is different - roof size, usage. The call gives YOUR exact numbers plus grant eligibility check."',
        impact: 'Medium - Pricing in SMS reduces booking by 25%',
        priority: 'medium'
      })
    } else if (agentMsg.includes('personalized') || agentMsg.includes('your home') || agentMsg.includes('exact numbers')) {
      insights.push({
        type: 'success',
        category: 'Price Objection',
        title: 'Redirected to personalized quote effectively',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWorked: 'Avoided specific prices and positioned call as place for accurate numbers',
        learnFrom: 'This maintains call value and prevents price anchoring',
        priority: 'learning'
      })
    }
  }

  // 3. INTEREST SIGNAL ANALYSIS
  if (leadMsg.includes('interested') || leadMsg.includes('tell me more') || leadMsg.includes('how does') || leadMsg.includes('what')) {
    if (!agentMsg.includes('call') && !agentMsg.includes('chat') && !agentMsg.includes('speak')) {
      insights.push({
        type: 'missed_opportunity',
        category: 'Interest Signal',
        title: 'Missed opportunity to book call',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWentWrong: 'Lead showed interest but agent didn\'t push for call booking. Prime conversion moment.',
        howToImprove: 'Strike immediately: "Great! Let\'s get you exact numbers. I have Tuesday 2pm or Wednesday 10am - which works?"',
        impact: 'High - Interest signals are hottest conversion moments',
        priority: 'high'
      })
    }
  }

  // 4. TRUST/LEGITIMACY CONCERN
  if (leadMsg.includes('scam') || leadMsg.includes('legit') || leadMsg.includes('trust') || leadMsg.includes('suspicious')) {
    if (!agentMsg.includes('trustpilot') && !agentMsg.includes('greenstarsolar.co.uk') && !agentMsg.includes('fareham')) {
      insights.push({
        type: 'missed_opportunity',
        category: 'Trust Building',
        title: 'Didn\'t provide trust signals',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWentWrong: 'Trust concern raised but no verifiable proof provided',
        howToImprove: 'Always include: "5⭐ Trustpilot (69 reviews), Fareham Hampshire, greenstarsolar.co.uk - Google us!"',
        impact: 'High - Trust signals convert 60% of skeptics',
        priority: 'high'
      })
    }
  }

  // 5. CONTEXT MAINTENANCE CHECK
  if (previousMessages.length > 0) {
    const hasContextReference = agentMsg.includes('you mentioned') || agentMsg.includes('you said') ||
                                 agentMsg.includes('you asked') || agentMsg.includes('following up') ||
                                 agentMsg.includes('as you')

    if (!hasContextReference && previousMessages.length >= 2) {
      insights.push({
        type: 'issue',
        category: 'Context Maintenance',
        title: 'Didn\'t reference previous conversation',
        leadSaid: exchange.leadMessage.substring(0, 100),
        agentReplied: exchange.agentResponse.substring(0, 150),
        whatWentWrong: 'Responded without acknowledging previous context. Sounds robotic.',
        howToImprove: 'Always reference: "Following up on what you said about..." or "You mentioned [concern]..."',
        impact: 'Medium - Context failures reduce trust by 30%',
        priority: 'medium'
      })
    }
  }

  // 6. REPETITION CHECK
  if (previousMessages.length > 0) {
    const previousAgentMessages = previousMessages.filter((m: any) => m.sender === 'agent')
    if (previousAgentMessages.length > 0) {
      const lastAgentMsg = previousAgentMessages[previousAgentMessages.length - 1].content.toLowerCase()

      const currentWords = agentMsg.split(' ').filter((w: string) => w.length > 4)
      const previousWords = lastAgentMsg.split(' ').filter((w: string) => w.length > 4)

      const overlap = currentWords.filter((w: string) => previousWords.includes(w))
      const overlapPercentage = (overlap.length / Math.max(currentWords.length, 1)) * 100

      if (overlapPercentage > 40) {
        insights.push({
          type: 'issue',
          category: 'Repetition',
          title: 'Repeated previous message',
          leadSaid: exchange.leadMessage.substring(0, 100),
          agentReplied: exchange.agentResponse.substring(0, 150),
          whatWentWrong: 'Repeating information already said. Sounds robotic.',
          howToImprove: 'Each message should build on previous ones, not repeat them.',
          impact: 'High - Repetition is #1 sign of poor AI',
          priority: 'high'
        })
      }
    }
  }

  // 7. MESSAGE LENGTH CHECK
  if (exchange.agentResponse.length > 400) {
    insights.push({
      type: 'issue',
      category: 'Message Length',
      title: 'Response too long',
      leadSaid: exchange.leadMessage.substring(0, 100),
      agentReplied: exchange.agentResponse.substring(0, 150),
      whatWentWrong: `${exchange.agentResponse.length} chars. Long SMS get ignored.`,
      howToImprove: 'Keep under 300 chars. Break into shorter messages or save for call.',
      impact: 'Medium - Over 400 chars = 35% lower response',
      priority: 'low'
    })
  }

  return insights
}

// Calculate overall quality score
function calculateQualityScore(insights: any[], exchanges: any[], lead: any): number {
  let score = 100

  // Penalize based on issues
  const highPriorityIssues = insights.filter(i => i.priority === 'high' && i.type !== 'success')
  const mediumPriorityIssues = insights.filter(i => i.priority === 'medium' && i.type !== 'success')
  const lowPriorityIssues = insights.filter(i => i.priority === 'low' && i.type !== 'success')

  score -= highPriorityIssues.length * 15
  score -= mediumPriorityIssues.length * 8
  score -= lowPriorityIssues.length * 3

  // Bonus for successful responses
  const successfulResponses = insights.filter(i => i.type === 'success')
  score += successfulResponses.length * 5

  // Outcome bonus/penalty
  if (lead.callBookedTime) score += 20
  if (lead.leadSentiment === 'NEGATIVE') score -= 25

  return Math.max(0, Math.min(100, Math.round(score)))
}

// Determine conversation outcome
function determineOutcome(lead: any): string {
  if (lead.callBookedTime) return 'Call Booked'
  if (lead.leadSentiment === 'POSITIVE') return 'Positive Engagement'
  if (lead.leadSentiment === 'NEGATIVE') return 'Negative Response'
  if (lead.replyReceived) return 'Engaged'
  return 'No Response'
}
