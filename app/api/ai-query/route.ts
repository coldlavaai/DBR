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
  useCdn: false,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// System prompt that constrains Claude to dashboard topics only
const SYSTEM_PROMPT = `You are a Sales Analytics Assistant for the Greenstar Solar DBR (Database Reactivation) Dashboard.

STRICT CONSTRAINTS:
- You can ONLY answer questions about lead data, metrics, and sales performance from this dashboard
- You MUST use the provided tools to fetch real data - never make up numbers or statistics
- You cannot discuss topics outside of: leads, messages, replies, sentiment, status, calls, conversions, objections, patterns
- If asked about anything else (general knowledge, other topics), politely redirect: "I can only help with questions about your lead data and sales performance. What would you like to know about your dashboard?"
- Keep responses concise, actionable, and professional
- Always provide context with numbers (e.g., "up 15% from yesterday")
- Suggest relevant follow-up actions when appropriate

AVAILABLE DATA:
- Lead metrics (total, hot, warm, cold, neutral)
- Message statistics (sent M1/M2/M3, replied, sentiment)
- Call booking data (upcoming, past, total)
- Performance trends and comparisons
- Individual lead details and conversation history
- Pattern analysis (common objections, interests)

RESPONSE STYLE:
- Use clear formatting with emojis for visual hierarchy
- Provide numbers with context and trends
- Include actionable insights
- Be conversational but professional
- Always end with a helpful suggestion or follow-up option

Your goal: Help sales teams get insights and take action quickly to maximize conversions.`

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'get_dashboard_metrics',
    description: 'Get key dashboard metrics like total leads, reply rate, hot leads, messages sent, etc. Use this for questions about overall performance, statistics, or "how many" questions.',
    input_schema: {
      type: 'object',
      properties: {
        timeRange: {
          type: 'string',
          enum: ['today', 'week', 'month', 'all'],
          description: 'Time range to filter metrics'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to retrieve. Options: totalLeads, hotLeads, warmLeads, replyRate, messagesSent, callsBooked, avgResponseTime'
        }
      },
      required: ['timeRange']
    }
  },
  {
    name: 'search_leads',
    description: 'Search for specific leads by status, sentiment, or other criteria. Use this for questions like "show me", "who are", "list my" leads.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['HOT', 'WARM', 'COLD', 'NEUTRAL', 'CALL_BOOKED', 'CONVERTED', 'INSTALLED', 'POSITIVE', 'REMOVED'],
          description: 'Filter by lead contact status'
        },
        sentiment: {
          type: 'string',
          enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'UNCLEAR', 'UNSURE'],
          description: 'Filter by lead sentiment'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of leads to return (default: 5)',
          default: 5
        },
        sortBy: {
          type: 'string',
          enum: ['recent', 'engagement', 'name'],
          description: 'How to sort results',
          default: 'engagement'
        }
      }
    }
  },
  {
    name: 'compare_performance',
    description: 'Compare metrics between two time periods. Use this for questions like "how does this week compare to last week" or "what changed".',
    input_schema: {
      type: 'object',
      properties: {
        period1: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'First time period'
        },
        period2: {
          type: 'string',
          enum: ['yesterday', 'lastWeek', 'lastMonth'],
          description: 'Second time period to compare against'
        },
        metric: {
          type: 'string',
          description: 'Specific metric to compare (optional, compares all by default)'
        }
      },
      required: ['period1', 'period2']
    }
  },
  {
    name: 'analyze_patterns',
    description: 'Analyze patterns in conversations like common objections, interests, or rejection reasons. Use this for questions about "why", "what do people say", "common reasons".',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['objections', 'interests', 'rejections', 'positive_signals'],
          description: 'Type of pattern to analyze'
        },
        sentiment: {
          type: 'string',
          enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
          description: 'Filter by sentiment (optional)'
        },
        limit: {
          type: 'number',
          description: 'Number of examples to return',
          default: 10
        }
      },
      required: ['category']
    }
  },
  {
    name: 'get_actionable_leads',
    description: 'Get leads that need attention or action right now. Use this for questions like "who should I contact", "what needs my attention", "prioritize my work".',
    input_schema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium'],
          description: 'Priority level',
          default: 'high'
        },
        limit: {
          type: 'number',
          description: 'Number of leads to return',
          default: 5
        }
      },
      required: ['priority']
    }
  }
]

// Tool execution functions
async function getDashboardMetrics(timeRange: string, metrics?: string[]) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dashboard?timeRange=${timeRange}`,
      { cache: 'no-store' }
    )

    if (!response.ok) throw new Error('Failed to fetch dashboard data')

    const data = await response.json()

    // Return filtered metrics if specified
    if (metrics && metrics.length > 0) {
      const filtered: any = { timeRange }
      metrics.forEach(m => {
        if (m === 'totalLeads') filtered.totalLeads = data.stats.totalLeads
        if (m === 'hotLeads') filtered.hotLeads = data.hotLeads.length
        if (m === 'warmLeads') filtered.warmLeads = data.warmLeads.length
        if (m === 'replyRate') filtered.replyRate = data.stats.replyRate
        if (m === 'messagesSent') filtered.messagesSent = data.stats.messagesSent
        if (m === 'callsBooked') filtered.callsBooked = data.totalCallsBooked
        if (m === 'avgResponseTime') filtered.avgResponseTime = data.stats.avgResponseTime
      })
      return filtered
    }

    // Return full summary
    return {
      timeRange,
      totalLeads: data.stats.totalLeads,
      hotLeads: data.hotLeads.length,
      warmLeads: data.warmLeads.length,
      callBookedLeads: data.callBookedLeads.length,
      replyRate: data.stats.replyRate,
      repliedLeads: data.stats.repliedLeads,
      messagesSent: data.stats.messagesSent,
      avgResponseTime: data.stats.avgResponseTime,
      sentiment: data.stats.sentiment,
      statusBreakdown: data.stats.statusBreakdown,
      upcomingCalls: data.upcomingCallsCount,
      totalCallsBooked: data.totalCallsBooked
    }
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    throw new Error('Failed to retrieve dashboard metrics')
  }
}

async function searchLeads(params: any) {
  try {
    let query = '*[_type == "dbrLead" && !archived'

    if (params.status) {
      query += ` && contactStatus == "${params.status}"`
    }
    if (params.sentiment) {
      query += ` && leadSentiment == "${params.sentiment}"`
    }

    query += '] | order(_createdAt desc)'

    if (params.sortBy === 'engagement') {
      query += ' | order(replyReceived desc)'
    } else if (params.sortBy === 'name') {
      query += ' | order(firstName asc)'
    }

    query += `[0...${params.limit || 5}] {
      _id, firstName, secondName, phoneNumber, contactStatus,
      leadSentiment, latestLeadReply, replyReceived, notes
    }`

    const leads = await sanityClient.fetch(query)

    return {
      count: leads.length,
      leads: leads.map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        phone: l.phoneNumber,
        status: l.contactStatus,
        sentiment: l.leadSentiment,
        lastReply: l.latestLeadReply,
        lastReplyTime: l.replyReceived,
        notes: l.notes
      }))
    }
  } catch (error) {
    console.error('Error searching leads:', error)
    throw new Error('Failed to search leads')
  }
}

async function comparePerformance(period1: string, period2: string, metric?: string) {
  try {
    // Fetch both periods
    const [data1, data2] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dashboard?timeRange=${period1}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dashboard?timeRange=${period2}`, { cache: 'no-store' }).then(r => r.json())
    ])

    const comparison: any = {
      period1,
      period2,
      changes: {}
    }

    // Calculate changes
    const metrics: any = {
      totalLeads: { current: data1.stats.totalLeads, previous: data2.stats.totalLeads },
      hotLeads: { current: data1.hotLeads.length, previous: data2.hotLeads.length },
      warmLeads: { current: data1.warmLeads.length, previous: data2.warmLeads.length },
      replyRate: { current: data1.stats.replyRate, previous: data2.stats.replyRate },
      messagesSent: { current: data1.stats.messagesSent.total, previous: data2.stats.messagesSent.total },
      callsBooked: { current: data1.upcomingCallsCount, previous: data2.upcomingCallsCount }
    }

    Object.entries(metrics).forEach(([key, values]: [string, any]) => {
      const change = values.current - values.previous
      const percentChange = values.previous > 0 ? ((change / values.previous) * 100).toFixed(1) : 'N/A'

      comparison.changes[key] = {
        current: values.current,
        previous: values.previous,
        change,
        percentChange,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
      }
    })

    return comparison
  } catch (error) {
    console.error('Error comparing performance:', error)
    throw new Error('Failed to compare performance')
  }
}

async function analyzePatterns(params: any) {
  try {
    let query = '*[_type == "dbrLead" && !archived && latestLeadReply != null'

    if (params.sentiment) {
      query += ` && leadSentiment == "${params.sentiment}"`
    }

    query += `][0...${params.limit || 10}] {
      _id, firstName, secondName, contactStatus, leadSentiment,
      latestLeadReply, conversationHistory
    }`

    const leads = await sanityClient.fetch(query)

    // Extract patterns based on category
    const patterns: any = {
      category: params.category,
      examples: []
    }

    leads.forEach((lead: any) => {
      if (lead.latestLeadReply) {
        patterns.examples.push({
          leadName: `${lead.firstName} ${lead.secondName}`,
          status: lead.contactStatus,
          sentiment: lead.leadSentiment,
          message: lead.latestLeadReply.substring(0, 150) + (lead.latestLeadReply.length > 150 ? '...' : '')
        })
      }
    })

    return patterns
  } catch (error) {
    console.error('Error analyzing patterns:', error)
    throw new Error('Failed to analyze patterns')
  }
}

async function getActionableLeads(params: any) {
  try {
    // Get recent hot leads who replied
    const query = `*[_type == "dbrLead" && !archived && (
      (contactStatus == "HOT" && replyReceived != null) ||
      (contactStatus == "WARM" && replyReceived != null) ||
      (contactStatus == "CALL_BOOKED")
    )] | order(replyReceived desc)[0...${params.limit || 5}] {
      _id, firstName, secondName, phoneNumber, contactStatus,
      leadSentiment, latestLeadReply, replyReceived, notes
    }`

    const leads = await sanityClient.fetch(query)

    return {
      priority: params.priority,
      count: leads.length,
      leads: leads.map((l: any) => ({
        id: l._id,
        name: `${l.firstName} ${l.secondName}`,
        phone: l.phoneNumber,
        status: l.contactStatus,
        sentiment: l.leadSentiment,
        lastReply: l.latestLeadReply,
        lastReplyTime: l.replyReceived,
        reason: l.contactStatus === 'HOT' ? 'High interest - needs immediate follow-up' :
                l.contactStatus === 'CALL_BOOKED' ? 'Call scheduled - prepare talking points' :
                'Engaged recently - maintain momentum'
      }))
    }
  } catch (error) {
    console.error('Error getting actionable leads:', error)
    throw new Error('Failed to get actionable leads')
  }
}

// Execute tool based on name
async function executeTool(toolName: string, toolInput: any) {
  switch (toolName) {
    case 'get_dashboard_metrics':
      return await getDashboardMetrics(toolInput.timeRange, toolInput.metrics)

    case 'search_leads':
      return await searchLeads(toolInput)

    case 'compare_performance':
      return await comparePerformance(toolInput.period1, toolInput.period2, toolInput.metric)

    case 'analyze_patterns':
      return await analyzePatterns(toolInput)

    case 'get_actionable_leads':
      return await getActionableLeads(toolInput)

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

export async function POST(request: Request) {
  try {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    const { query, context } = await request.json()

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long. Please keep questions under 500 characters.' },
        { status: 400 }
      )
    }

    // Rate limiting check (simple in-memory, production would use Redis)
    // TODO: Implement proper rate limiting with Redis or Upstash

    console.log('🤖 AI Query:', query)

    // Call Claude with tools
    let messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: query
      }
    ]

    let response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Use Sonnet for better analysis
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages
    })

    console.log('📊 Claude response:', response.stop_reason, 'blocks:', response.content.length)

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find(block => block.type === 'tool_use') as Anthropic.ToolUseBlock

      if (!toolUse) break

      console.log('🔧 Executing tool:', toolUse.name, 'with input:', toolUse.input)

      try {
        const toolResult = await executeTool(toolUse.name, toolUse.input)

        console.log('✅ Tool result:', JSON.stringify(toolResult).substring(0, 200))

        // Add assistant response and tool result to messages
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

        // Get final response from Claude
        response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools,
          messages
        })

        console.log('🎯 Final response:', response.stop_reason)

      } catch (toolError: any) {
        console.error('❌ Tool execution error:', toolError)

        // Send error back to Claude for graceful handling
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

        // Let Claude handle the error gracefully
        response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages
        })
      }
    }

    // Extract text response
    const textBlock = response.content.find(block => block.type === 'text') as Anthropic.TextBlock
    const answer = textBlock?.text || 'I apologize, but I could not process your question. Please try rephrasing it.'

    return NextResponse.json({
      answer,
      model: 'claude-3-5-sonnet',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ AI Query error:', error)

    // Return user-friendly error
    return NextResponse.json(
      {
        error: 'I encountered an error processing your question. Please try again or rephrase your question.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
