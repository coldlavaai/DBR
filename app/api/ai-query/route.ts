import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// ============================================================================
// SOPHIE - CONVERSATION INTELLIGENCE ENGINE
// ============================================================================
// Sophie is NOT a basic chatbot. She's the brain of the DBR system.
// Her job: Analyze conversations, identify patterns, suggest improvements,
// and make the bot better every single day.
// ============================================================================

const SYSTEM_PROMPT = `You are Sophie, the Conversation Intelligence Engine for Greenstar Solar's DBR system.

YOUR PURPOSE:
You analyze conversations to find patterns, identify failures, and suggest specific improvements to make the bot better. You are NOT a text version of the dashboard - you provide insights that aren't visible anywhere else.

CRITICAL RULES:
- ALWAYS use tools to analyze real conversation data
- Focus on ACTIONABLE insights (what should be fixed/improved)
- Identify patterns: objections, timing, geography, bot failures
- Suggest SPECIFIC bot training improvements
- Keep responses SHORT (2-3 sentences) and impactful

RESPONSE STYLE:
State the insight, give the data, suggest the action.
Example: "Top objection: 'Too expensive' (18 leads). Add pricing comparison script showing 20-year savings."

You make the bot smarter every day.`

// ============================================================================
// INTELLIGENCE TOOLS - Deep conversation analysis, not basic metrics
// ============================================================================

const tools: Anthropic.Tool[] = [
  {
    name: 'analyze_conversations',
    description: 'Deep analysis of actual conversation text to identify objections, sentiment patterns, and success/failure points. Use this for questions about conversation quality, objections, or "what are people saying".',
    input_schema: {
      type: 'object',
      properties: {
        focusArea: {
          type: 'string',
          enum: ['objections', 'sentiment_shifts', 'success_patterns', 'failure_points', 'all'],
          description: 'What aspect of conversations to analyze'
        },
        timeRange: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time period for analysis',
          default: 'week'
        },
        statusFilter: {
          type: 'string',
          enum: ['HOT', 'WARM', 'COLD', 'NEGATIVE', 'CALL_BOOKED', 'all'],
          description: 'Filter by lead status',
          default: 'all'
        }
      },
      required: ['focusArea']
    }
  },
  {
    name: 'identify_bot_failures',
    description: 'Find specific conversations where the bot performed poorly - leads that went NEGATIVE, hot leads that cooled off, or conversations that stalled. Use this for "where is the bot failing" or "what needs fixing".',
    input_schema: {
      type: 'object',
      properties: {
        failureType: {
          type: 'string',
          enum: ['went_negative', 'lost_hot_lead', 'no_response', 'stalled_conversation', 'all'],
          description: 'Type of failure to analyze'
        },
        limit: {
          type: 'number',
          description: 'Number of examples to return',
          default: 10
        }
      },
      required: ['failureType']
    }
  },
  {
    name: 'find_hidden_patterns',
    description: 'Discover non-obvious patterns in the data: geographic trends (postcodes), timing patterns (when people respond), demographic correlations. Use this for "are there any patterns" or "what trends do you see".',
    input_schema: {
      type: 'object',
      properties: {
        patternType: {
          type: 'string',
          enum: ['geographic', 'timing', 'message_stage', 'sentiment_journey', 'all'],
          description: 'What type of pattern to find'
        },
        minSampleSize: {
          type: 'number',
          description: 'Minimum number of leads required for pattern to be significant',
          default: 5
        }
      },
      required: ['patternType']
    }
  },
  {
    name: 'suggest_bot_improvements',
    description: 'Generate specific, actionable suggestions to improve bot performance based on conversation analysis. Use this for "how can I improve the bot" or "what should I train".',
    input_schema: {
      type: 'object',
      properties: {
        improvementArea: {
          type: 'string',
          enum: ['objection_handling', 'response_quality', 'timing', 'personalization', 'all'],
          description: 'What area to focus improvements on'
        },
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low', 'all'],
          description: 'Priority level of suggestions',
          default: 'high'
        }
      },
      required: ['improvementArea']
    }
  },
  {
    name: 'get_priority_actions',
    description: 'Identify the top priority actions the team should take RIGHT NOW - hot leads to contact, failing conversations to rescue, opportunities to act on. Use this for "what should I do" or "who should I contact".',
    input_schema: {
      type: 'object',
      properties: {
        actionType: {
          type: 'string',
          enum: ['contact_now', 'rescue_conversation', 'follow_up', 'book_calls', 'all'],
          description: 'Type of action to prioritize'
        },
        maxActions: {
          type: 'number',
          description: 'Maximum number of actions to return',
          default: 5
        }
      },
      required: ['actionType']
    }
  }
]

// ============================================================================
// TOOL EXECUTION FUNCTIONS - The intelligence layer
// ============================================================================

async function analyzeConversations(params: any) {
  try {
    const { focusArea, timeRange = 'week', statusFilter = 'all' } = params

    // Build query to get leads with conversation data
    let query = '*[_type == "dbrLead" && !archived'

    // Time filter
    if (timeRange !== 'all') {
      const cutoffDate = new Date()
      if (timeRange === 'today') cutoffDate.setHours(0, 0, 0, 0)
      else if (timeRange === 'week') cutoffDate.setDate(cutoffDate.getDate() - 7)
      else if (timeRange === 'month') cutoffDate.setMonth(cutoffDate.getMonth() - 1)

      query += ` && _createdAt >= "${cutoffDate.toISOString()}"`
    }

    // Status filter
    if (statusFilter !== 'all') {
      query += ` && contactStatus == "${statusFilter}"`
    }

    query += `] | order(_createdAt desc) {
      _id, firstName, secondName, contactStatus, leadSentiment,
      latestLeadReply, notes, postcode, replyReceived,
      m1Sent, m2Sent, m3Sent, callBookedTime
    }`

    const leads = await sanityClient.fetch(query)

    // Analyze based on focus area
    if (focusArea === 'objections' || focusArea === 'all') {
      return analyzeObjections(leads)
    } else if (focusArea === 'sentiment_shifts') {
      return analyzeSentimentShifts(leads)
    } else if (focusArea === 'success_patterns') {
      return analyzeSuccessPatterns(leads)
    } else if (focusArea === 'failure_points') {
      return analyzeFailurePoints(leads)
    }

    return { error: 'Invalid focus area' }
  } catch (error) {
    console.error('Error analyzing conversations:', error)
    throw new Error('Failed to analyze conversations')
  }
}

function analyzeObjections(leads: any[]) {
  // Common objection keywords
  const objectionPatterns = {
    'price': ['too expensive', 'too much', 'cost', 'price', 'afford', 'cheaper'],
    'timing': ['not now', 'maybe later', 'busy', 'next year', 'not ready'],
    'trust': ['scam', 'not interested', 'suspicious', 'trust', 'legit'],
    'already_have': ['already have', 'got solar', 'already installed'],
    'renting': ['rent', 'landlord', 'not my house', 'tenant'],
    'information': ['more info', 'send details', 'email me', 'brochure']
  }

  const objectionCounts: any = {}
  const examples: any = {}

  leads.forEach(lead => {
    const text = `${lead.latestLeadReply || ''} ${lead.notes || ''}`.toLowerCase()

    Object.entries(objectionPatterns).forEach(([objection, keywords]) => {
      const found = keywords.some(keyword => text.includes(keyword))
      if (found) {
        objectionCounts[objection] = (objectionCounts[objection] || 0) + 1
        if (!examples[objection]) {
          examples[objection] = {
            lead: `${lead.firstName} ${lead.secondName}`,
            text: lead.latestLeadReply || lead.notes,
            status: lead.contactStatus
          }
        }
      }
    })
  })

  // Sort by frequency
  const sorted = Object.entries(objectionCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([objection, count]) => ({
      objection,
      count,
      example: examples[objection]
    }))

  return {
    totalLeadsAnalyzed: leads.length,
    topObjections: sorted,
    insight: sorted.length > 0
      ? `Top objection: "${sorted[0].objection}" (${sorted[0].count} leads). This needs a better response script.`
      : 'No clear objection patterns found in recent conversations.'
  }
}

function analyzeSentimentShifts(leads: any[]) {
  // Find leads where sentiment changed (went negative or improved)
  const negative = leads.filter(l =>
    l.leadSentiment === 'NEGATIVE' &&
    (l.contactStatus === 'HOT' || l.contactStatus === 'WARM')
  )

  const improved = leads.filter(l =>
    l.contactStatus === 'HOT' &&
    (l.leadSentiment === 'POSITIVE' || !l.leadSentiment)
  )

  return {
    wentNegative: negative.length,
    improved: improved.length,
    negativeExamples: negative.slice(0, 3).map(l => ({
      name: `${l.firstName} ${l.secondName}`,
      lastReply: l.latestLeadReply,
      status: l.contactStatus
    })),
    insight: negative.length > 0
      ? `${negative.length} leads went negative despite being hot/warm. Review these conversations for bot improvement.`
      : 'Sentiment trends are positive - no major issues detected.'
  }
}

function analyzeSuccessPatterns(leads: any[]) {
  // Analyze leads that booked calls - what did they have in common?
  const booked = leads.filter(l => l.callBookedTime)

  if (booked.length === 0) {
    return { insight: 'No call bookings in this time period to analyze.' }
  }

  // Analyze timing
  const bookingHours = booked
    .filter(l => l.callBookedTime)
    .map(l => new Date(l.callBookedTime).getHours())

  const avgHour = bookingHours.length > 0
    ? Math.round(bookingHours.reduce((a, b) => a + b, 0) / bookingHours.length)
    : null

  // Analyze which message stage got the booking
  const m1Bookings = booked.filter(l => l.m1Sent && !l.m2Sent).length
  const m2Bookings = booked.filter(l => l.m2Sent && !l.m3Sent).length
  const m3Bookings = booked.filter(l => l.m3Sent).length

  // Analyze postcodes
  const postcodes: any = {}
  booked.forEach(l => {
    if (l.postcode) {
      const area = l.postcode.substring(0, 2).toUpperCase()
      postcodes[area] = (postcodes[area] || 0) + 1
    }
  })

  const topPostcode = Object.entries(postcodes)
    .sort(([, a]: any, [, b]: any) => b - a)[0]

  return {
    totalBookings: booked.length,
    avgBookingHour: avgHour,
    messageStage: {
      m1: m1Bookings,
      m2: m2Bookings,
      m3: m3Bookings
    },
    topPostcodeArea: topPostcode ? { area: topPostcode[0], count: topPostcode[1] } : null,
    insight: `${booked.length} calls booked. ${m1Bookings > m2Bookings + m3Bookings ? 'M1 is most effective' : 'Follow-ups (M2/M3) drive bookings'}.${avgHour ? ` Peak time: ${avgHour}:00.` : ''}`
  }
}

function analyzeFailurePoints(leads: any[]) {
  // Find where conversations break down
  const sent = leads.filter(l => l.m1Sent || l.m2Sent || l.m3Sent)
  const replied = leads.filter(l => l.replyReceived)
  const negative = leads.filter(l => l.leadSentiment === 'NEGATIVE')
  const stalled = leads.filter(l =>
    (l.m1Sent || l.m2Sent) &&
    !l.replyReceived &&
    l.contactStatus !== 'REMOVED'
  )

  const replyRate = sent.length > 0 ? (replied.length / sent.length * 100).toFixed(1) : 0

  return {
    totalSent: sent.length,
    replied: replied.length,
    replyRate: `${replyRate}%`,
    negative: negative.length,
    stalled: stalled.length,
    stalledExamples: stalled.slice(0, 3).map(l => ({
      name: `${l.firstName} ${l.secondName}`,
      phone: l.phoneNumber,
      messagesSent: [l.m1Sent && 'M1', l.m2Sent && 'M2', l.m3Sent && 'M3'].filter(Boolean).join(', ')
    })),
    insight: `${stalled.length} leads not responding (${replyRate}% reply rate). Consider message timing or content adjustments.`
  }
}

async function identifyBotFailures(params: any) {
  try {
    const { failureType, limit = 10 } = params

    let query = '*[_type == "dbrLead" && !archived'

    if (failureType === 'went_negative') {
      query += ' && leadSentiment == "NEGATIVE"'
    } else if (failureType === 'lost_hot_lead') {
      query += ' && (contactStatus == "COLD" || contactStatus == "NEUTRAL") && leadSentiment == "POSITIVE"'
    } else if (failureType === 'no_response') {
      query += ' && (m1Sent || m2Sent || m3Sent) && !replyReceived'
    } else if (failureType === 'stalled_conversation') {
      query += ' && replyReceived && !callBookedTime && contactStatus != "REMOVED"'
    }

    query += `] | order(_createdAt desc)[0...${limit}] {
      _id, firstName, secondName, phoneNumber, contactStatus,
      leadSentiment, latestLeadReply, notes, m1Sent, m2Sent, m3Sent,
      replyReceived
    }`

    const failures = await sanityClient.fetch(query)

    return {
      failureType,
      count: failures.length,
      examples: failures.map(l => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        phone: l.phoneNumber,
        status: l.contactStatus,
        sentiment: l.leadSentiment,
        lastReply: l.latestLeadReply,
        issue: getFailureDescription(failureType, l)
      })),
      recommendation: getFailureRecommendation(failureType, failures)
    }
  } catch (error) {
    console.error('Error identifying bot failures:', error)
    throw new Error('Failed to identify bot failures')
  }
}

function getFailureDescription(type: string, lead: any): string {
  if (type === 'went_negative') return 'Lead responded negatively'
  if (type === 'lost_hot_lead') return 'Was interested but went cold'
  if (type === 'no_response') return `Sent ${[lead.m1Sent && 'M1', lead.m2Sent && 'M2', lead.m3Sent && 'M3'].filter(Boolean).join(', ')}, no reply`
  if (type === 'stalled_conversation') return 'Replied but conversation stalled'
  return 'Unknown issue'
}

function getFailureRecommendation(type: string, failures: any[]): string {
  if (failures.length === 0) return 'No failures of this type found.'

  if (type === 'went_negative') {
    return `${failures.length} leads went negative. Review their responses to identify objections and improve bot scripts.`
  } else if (type === 'lost_hot_lead') {
    return `${failures.length} interested leads went cold. Add urgency or follow-up prompts to prevent drop-off.`
  } else if (type === 'no_response') {
    return `${failures.length} leads not responding. Test different message timing or opening lines.`
  } else if (type === 'stalled_conversation') {
    return `${failures.length} conversations stalled. Add call-to-action prompts or booking links.`
  }
  return 'Review these cases to identify improvement opportunities.'
}

async function findHiddenPatterns(params: any) {
  try {
    const { patternType, minSampleSize = 5 } = params

    const leads = await sanityClient.fetch(`*[_type == "dbrLead" && !archived] {
      _id, firstName, secondName, contactStatus, leadSentiment,
      latestLeadReply, postcode, replyReceived, callBookedTime,
      m1Sent, m2Sent, m3Sent, _createdAt
    }`)

    if (patternType === 'geographic') {
      return analyzeGeographicPatterns(leads, minSampleSize)
    } else if (patternType === 'timing') {
      return analyzeTimingPatterns(leads, minSampleSize)
    } else if (patternType === 'message_stage') {
      return analyzeMessageStagePatterns(leads, minSampleSize)
    } else if (patternType === 'sentiment_journey') {
      return analyzeSentimentJourney(leads, minSampleSize)
    }

    // Return all patterns
    return {
      geographic: analyzeGeographicPatterns(leads, minSampleSize),
      timing: analyzeTimingPatterns(leads, minSampleSize),
      messageStage: analyzeMessageStagePatterns(leads, minSampleSize)
    }
  } catch (error) {
    console.error('Error finding patterns:', error)
    throw new Error('Failed to find patterns')
  }
}

function analyzeGeographicPatterns(leads: any[], minSize: number) {
  const postcodeStats: any = {}

  leads.forEach(lead => {
    if (lead.postcode) {
      const area = lead.postcode.substring(0, 2).toUpperCase()
      if (!postcodeStats[area]) {
        postcodeStats[area] = { total: 0, hot: 0, booked: 0, replied: 0 }
      }
      postcodeStats[area].total++
      if (lead.contactStatus === 'HOT') postcodeStats[area].hot++
      if (lead.callBookedTime) postcodeStats[area].booked++
      if (lead.replyReceived) postcodeStats[area].replied++
    }
  })

  // Filter by minimum sample size and calculate conversion rates
  const significant = Object.entries(postcodeStats)
    .filter(([, stats]: any) => stats.total >= minSize)
    .map(([area, stats]: any) => ({
      area,
      total: stats.total,
      hotRate: ((stats.hot / stats.total) * 100).toFixed(1),
      bookingRate: ((stats.booked / stats.total) * 100).toFixed(1),
      replyRate: ((stats.replied / stats.total) * 100).toFixed(1)
    }))
    .sort((a: any, b: any) => parseFloat(b.bookingRate) - parseFloat(a.bookingRate))

  const best = significant[0]
  const worst = significant[significant.length - 1]

  return {
    patterns: significant.slice(0, 10),
    insight: best
      ? `${best.area} has highest booking rate (${best.bookingRate}%). ${worst ? `${worst.area} is lowest (${worst.bookingRate}%). ` : ''}Focus campaigns on high-performing areas.`
      : 'Not enough data for geographic patterns.'
  }
}

function analyzeTimingPatterns(leads: any[], minSize: number) {
  const repliedLeads = leads.filter(l => l.replyReceived)

  if (repliedLeads.length < minSize) {
    return { insight: 'Not enough reply data for timing analysis.' }
  }

  // Analyze hour of day for replies
  const replyHours = repliedLeads
    .map(l => new Date(l.replyReceived).getHours())

  const hourCounts: any = {}
  replyHours.forEach(hour => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const peakHour = Object.entries(hourCounts)
    .sort(([, a]: any, [, b]: any) => b - a)[0]

  // Analyze day of week
  const replyDays = repliedLeads
    .map(l => new Date(l.replyReceived).getDay())

  const dayCounts: any = {}
  replyDays.forEach(day => {
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const peakDay = Object.entries(dayCounts)
    .sort(([, a]: any, [, b]: any) => b - a)[0]

  return {
    peakHour: peakHour ? { hour: peakHour[0], count: peakHour[1] } : null,
    peakDay: peakDay ? { day: dayNames[parseInt(peakDay[0])], count: peakDay[1] } : null,
    insight: `Peak response time: ${peakHour ? `${peakHour[0]}:00` : 'Unknown'}${peakDay ? ` on ${dayNames[parseInt(peakDay[0])]}s` : ''}. Schedule messages accordingly.`
  }
}

function analyzeMessageStagePatterns(leads: any[], minSize: number) {
  const withMessages = leads.filter(l => l.m1Sent || l.m2Sent || l.m3Sent)

  const m1Only = withMessages.filter(l => l.m1Sent && !l.m2Sent)
  const m2Reached = withMessages.filter(l => l.m2Sent)
  const m3Reached = withMessages.filter(l => l.m3Sent)

  const m1Replied = m1Only.filter(l => l.replyReceived).length
  const m2Replied = m2Reached.filter(l => l.replyReceived).length
  const m3Replied = m3Reached.filter(l => l.replyReceived).length

  const m1Rate = m1Only.length > 0 ? (m1Replied / m1Only.length * 100).toFixed(1) : 0
  const m2Rate = m2Reached.length > 0 ? (m2Replied / m2Reached.length * 100).toFixed(1) : 0
  const m3Rate = m3Reached.length > 0 ? (m3Replied / m3Reached.length * 100).toFixed(1) : 0

  return {
    stages: {
      m1: { sent: m1Only.length, replied: m1Replied, rate: `${m1Rate}%` },
      m2: { sent: m2Reached.length, replied: m2Replied, rate: `${m2Rate}%` },
      m3: { sent: m3Reached.length, replied: m3Replied, rate: `${m3Rate}%` }
    },
    insight: `M1 reply rate: ${m1Rate}%. ${parseFloat(m2Rate) > parseFloat(m1Rate) ? 'Follow-ups improve response rates - keep sending M2/M3.' : 'M1 is most effective - optimize first message.'}`
  }
}

function analyzeSentimentJourney(leads: any[], minSize: number) {
  // Track how sentiment evolves
  const positive = leads.filter(l => l.leadSentiment === 'POSITIVE').length
  const negative = leads.filter(l => l.leadSentiment === 'NEGATIVE').length
  const neutral = leads.filter(l => !l.leadSentiment || l.leadSentiment === 'NEUTRAL').length

  const hot = leads.filter(l => l.contactStatus === 'HOT').length
  const booked = leads.filter(l => l.callBookedTime).length

  return {
    sentiment: { positive, negative, neutral },
    conversion: { hot, booked },
    conversionRate: leads.length > 0 ? ((booked / leads.length) * 100).toFixed(1) : 0,
    insight: `${positive} positive, ${negative} negative leads. ${((hot / leads.length) * 100).toFixed(1)}% reached HOT status. ${booked > 0 ? `${booked} booked calls.` : 'No bookings yet - focus on hot leads.'}`
  }
}

async function suggestBotImprovements(params: any) {
  try {
    const { improvementArea, priority = 'high' } = params

    // Get conversation data to analyze
    const leads = await sanityClient.fetch(`*[_type == "dbrLead" && !archived] | order(_createdAt desc)[0...100] {
      contactStatus, leadSentiment, latestLeadReply, notes,
      replyReceived, callBookedTime, m1Sent, m2Sent, m3Sent
    }`)

    const suggestions: any = []

    if (improvementArea === 'objection_handling' || improvementArea === 'all') {
      const objectionAnalysis = analyzeObjections(leads)
      if (objectionAnalysis.topObjections.length > 0) {
        objectionAnalysis.topObjections.forEach((obj: any) => {
          suggestions.push({
            area: 'Objection Handling',
            priority: 'high',
            issue: `"${obj.objection}" objection appears ${obj.count} times`,
            suggestion: getObjectionScript(obj.objection),
            impact: 'high'
          })
        })
      }
    }

    if (improvementArea === 'response_quality' || improvementArea === 'all') {
      const negative = leads.filter(l => l.leadSentiment === 'NEGATIVE')
      if (negative.length > 5) {
        suggestions.push({
          area: 'Response Quality',
          priority: 'high',
          issue: `${negative.length} leads responded negatively`,
          suggestion: 'Review bot tone - may be too pushy or sales-y. Add empathy and personalization.',
          impact: 'high'
        })
      }
    }

    if (improvementArea === 'timing' || improvementArea === 'all') {
      const sent = leads.filter(l => l.m1Sent || l.m2Sent || l.m3Sent).length
      const replied = leads.filter(l => l.replyReceived).length
      const replyRate = sent > 0 ? (replied / sent * 100).toFixed(1) : 0

      if (parseFloat(replyRate) < 30) {
        suggestions.push({
          area: 'Timing',
          priority: 'medium',
          issue: `Low reply rate (${replyRate}%)`,
          suggestion: 'Test sending messages at different times. Try 10am-12pm and 6pm-8pm for best response rates.',
          impact: 'medium'
        })
      }
    }

    if (improvementArea === 'personalization' || improvementArea === 'all') {
      suggestions.push({
        area: 'Personalization',
        priority: 'medium',
        issue: 'Generic messages may reduce engagement',
        suggestion: 'Add personalization: use first name, reference postcode area, mention local installations.',
        impact: 'medium'
      })
    }

    return {
      totalSuggestions: suggestions.length,
      suggestions: suggestions.filter((s: any) => priority === 'all' || s.priority === priority),
      insight: suggestions.length > 0
        ? `${suggestions.length} improvement${suggestions.length > 1 ? 's' : ''} identified. Start with ${suggestions[0].area.toLowerCase()}.`
        : 'Bot is performing well - no critical improvements needed.'
    }
  } catch (error) {
    console.error('Error suggesting improvements:', error)
    throw new Error('Failed to suggest improvements')
  }
}

function getObjectionScript(objection: string): string {
  const scripts: any = {
    'price': 'Add: "I understand cost is a factor. With government grants and financing, most homeowners pay nothing upfront and save £200+/month from day one. Can I show you the numbers for your home?"',
    'timing': 'Add: "No pressure at all. Would it help to book a quick 10-min call to understand your options when you\'re ready? No obligation."',
    'trust': 'Add: "Completely understand. We\'re a UK registered company with 500+ installations. Check our reviews at [link]. Would you like to speak with a recent customer in your area?"',
    'already_have': 'Add: "Great! Are you getting the performance you expected? We offer free system health checks and can often boost output by 15-20% with optimization."',
    'renting': 'Add: "Many landlords are interested in solar to increase property value and attract tenants. Would you like information to share with your landlord?"',
    'information': 'Add: "Absolutely! Sending now. What\'s the most important factor for you - cost savings, environmental impact, or property value?"'
  }
  return scripts[objection] || 'Review conversations with this objection and create a specific response script.'
}

async function getPriorityActions(params: any) {
  try {
    const { actionType, maxActions = 5 } = params

    const actions: any = []

    if (actionType === 'contact_now' || actionType === 'all') {
      const hotLeads = await sanityClient.fetch(`*[_type == "dbrLead" && !archived && contactStatus == "HOT" && !callBookedTime] | order(_createdAt asc)[0...${maxActions}] {
        _id, firstName, secondName, phoneNumber, latestLeadReply, _createdAt
      }`)

      hotLeads.forEach((lead: any) => {
        const daysOld = Math.floor((Date.now() - new Date(lead._createdAt).getTime()) / (1000 * 60 * 60 * 24))
        actions.push({
          type: 'CONTACT NOW',
          priority: daysOld > 2 ? 'URGENT' : 'HIGH',
          lead: {
            name: `${lead.firstName} ${lead.secondName}`,
            phone: lead.phoneNumber,
            id: lead._id
          },
          reason: `Hot lead${daysOld > 0 ? `, ${daysOld} days old` : ''}. ${lead.latestLeadReply ? 'Last said: "' + lead.latestLeadReply.substring(0, 50) + '..."' : 'No reply yet.'}`,
          action: 'Call or text NOW to book appointment'
        })
      })
    }

    if (actionType === 'rescue_conversation' || actionType === 'all') {
      const negative = await sanityClient.fetch(`*[_type == "dbrLead" && !archived && leadSentiment == "NEGATIVE" && contactStatus != "REMOVED"] | order(_createdAt desc)[0...${maxActions}] {
        _id, firstName, secondName, phoneNumber, latestLeadReply
      }`)

      negative.forEach((lead: any) => {
        actions.push({
          type: 'RESCUE',
          priority: 'MEDIUM',
          lead: {
            name: `${lead.firstName} ${lead.secondName}`,
            phone: lead.phoneNumber,
            id: lead._id
          },
          reason: `Went negative. Said: "${lead.latestLeadReply?.substring(0, 50)}..."`,
          action: 'Personal outreach to address concerns'
        })
      })
    }

    if (actionType === 'book_calls' || actionType === 'all') {
      const callBooked = await sanityClient.fetch(`*[_type == "dbrLead" && !archived && contactStatus == "CALL_BOOKED" && callBookedTime > now()] | order(callBookedTime asc)[0...${maxActions}] {
        _id, firstName, secondName, phoneNumber, callBookedTime
      }`)

      callBooked.forEach((lead: any) => {
        const timeUntil = Math.floor((new Date(lead.callBookedTime).getTime() - Date.now()) / (1000 * 60 * 60))
        actions.push({
          type: 'UPCOMING CALL',
          priority: timeUntil < 24 ? 'HIGH' : 'MEDIUM',
          lead: {
            name: `${lead.firstName} ${lead.secondName}`,
            phone: lead.phoneNumber,
            id: lead._id
          },
          reason: `Call scheduled in ${timeUntil < 24 ? `${timeUntil} hours` : `${Math.floor(timeUntil / 24)} days`}`,
          action: 'Prepare for call - review conversation history'
        })
      })
    }

    return {
      totalActions: actions.length,
      actions: actions.slice(0, maxActions),
      insight: actions.length > 0
        ? `${actions.length} priority action${actions.length > 1 ? 's' : ''}. ${actions[0].type}: ${actions[0].lead.name}.`
        : 'No urgent actions right now. Great work keeping up!'
    }
  } catch (error) {
    console.error('Error getting priority actions:', error)
    throw new Error('Failed to get priority actions')
  }
}

// ============================================================================
// TOOL EXECUTION ROUTER
// ============================================================================

async function executeTool(toolName: string, toolInput: any) {
  switch (toolName) {
    case 'analyze_conversations':
      return await analyzeConversations(toolInput)
    case 'identify_bot_failures':
      return await identifyBotFailures(toolInput)
    case 'find_hidden_patterns':
      return await findHiddenPatterns(toolInput)
    case 'suggest_bot_improvements':
      return await suggestBotImprovements(toolInput)
    case 'get_priority_actions':
      return await getPriorityActions(toolInput)
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ============================================================================
// API ENDPOINT
// ============================================================================

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const { query, context } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long (max 500 characters)' },
        { status: 400 }
      )
    }

    console.log('🧠 Sophie Intelligence Query:', query)

    let messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: query
      }
    ]

    let response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      tools,
      messages
    })

    console.log('📊 Sophie response:', response.stop_reason, 'blocks:', response.content.length)

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use') as Anthropic.ToolUseBlock

      if (!toolUse) break

      console.log('🔧 Executing:', toolUse.name, 'with:', JSON.stringify(toolUse.input).substring(0, 100))

      try {
        const toolResult = await executeTool(toolUse.name, toolUse.input)

        console.log('✅ Result:', JSON.stringify(toolResult).substring(0, 200))

        messages.push({
          role: 'assistant',
          content: response.content
        })

        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult)
            }
          ]
        })

        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          tools,
          messages
        })

        console.log('🎯 Final response:', response.stop_reason)

      } catch (toolError: any) {
        console.error('❌ Tool error:', toolError)

        messages.push({
          role: 'assistant',
          content: response.content
        })

        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: toolError.message }),
              is_error: true
            }
          ]
        })

        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages
        })
      }
    }

    const textBlock = response.content.find(block => block.type === 'text') as Anthropic.TextBlock
    const answer = textBlock?.text || 'I could not process your question. Please try rephrasing.'

    return NextResponse.json({
      answer,
      model: 'sophie-intelligence-engine',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Sophie error:', error)
    console.error('❌ Stack:', error.stack)

    return NextResponse.json(
      {
        error: 'I encountered an error. Please try again.',
        details: error.message
      },
      { status: 500 }
    )
  }
}
