import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const maxDuration = 60 // Allow up to 60 seconds for streaming

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN, // Need write token to save chat history
  useCdn: false,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// ============================================================================
// SOPHIE'S CONVERSATION COACH API
// ============================================================================
// This endpoint powers Sophie's interactive chat interface.
// Sophie can access all conversation data and learning logs to provide
// intelligent coaching and capture new learnings.
// ============================================================================

export async function POST(request: Request) {
  try {
    const { message, userName, sessionId, leadId } = await request.json()

    if (!message || !userName) {
      return NextResponse.json(
        { error: 'Message and userName are required' },
        { status: 400 }
      )
    }

    console.log(`💬 Sophie Chat: ${userName} says: "${message.substring(0, 50)}..."`)

    // Fetch context: conversation analysis data
    const conversationAnalysis = await sanityClient.fetch(`
      *[_type == "dbrLead" && !archived] {
        _id, firstName, secondName, phoneNumber, contactStatus, leadSentiment,
        latestLeadReply, callBookedTime,
        "messages": *[_type == "message" && references(^._id)] | order(_createdAt asc) {
          _id, _createdAt, sender, content
        }
      }
    `)

    // Fetch Sophie's learning log
    const learningLog = await sanityClient.fetch(`
      *[_type == "sophieLearning"] | order(priority asc, lastUpdated desc) {
        _id, category, title, userGuidance, doThis, dontDoThis,
        exampleResponses, priority, tags, createdBy
      }
    `)

    // Fetch specific lead if provided
    let specificLead = null
    if (leadId) {
      specificLead = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id == $leadId][0] {
          _id, firstName, secondName, phoneNumber, contactStatus, leadSentiment,
          latestLeadReply, callBookedTime,
          "messages": *[_type == "message" && references(^._id)] | order(_createdAt asc) {
            _id, _createdAt, sender, content
          }
        }`,
        { leadId }
      )
    }

    // Fetch recent chat history for context
    const recentChat = await sanityClient.fetch(`
      *[_type == "sophieChat" && sessionId == $sessionId] | order(timestamp asc) [0...10] {
        sender, userName, message, timestamp
      }
    `, { sessionId: sessionId || 'default' })

    // Build Sophie's system prompt
    const systemPrompt = buildSophieSystemPrompt(learningLog, conversationAnalysis.length)

    // Build conversation context
    const conversationContext = buildConversationContext(specificLead, learningLog)

    // Call Claude API with streaming
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        ...recentChat.map((msg: any) => ({
          role: msg.sender === 'sophie' ? 'assistant' : 'user',
          content: msg.message,
        })),
        {
          role: 'user',
          content: `${conversationContext}\n\nUser (${userName}): ${message}`,
        },
      ],
    })

    // Save user message to Sanity (fire and forget)
    saveMessageToSanity({
      sender: 'user',
      userName,
      message,
      sessionId: sessionId || 'default',
      relatedConversation: leadId || null,
    })

    // Stream the response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`))
            }
          }

          // Save Sophie's response to Sanity (fire and forget)
          saveMessageToSanity({
            sender: 'sophie',
            userName: null,
            message: fullResponse,
            sessionId: sessionId || 'default',
            relatedConversation: leadId || null,
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error: any) {
          console.error('❌ Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('❌ Sophie Chat Error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat', details: error.message },
      { status: 500 }
    )
  }
}

// ============================================================================
// SOPHIE'S SYSTEM PROMPT
// ============================================================================

function buildSophieSystemPrompt(learningLog: any[], totalConversations: number): string {
  const learningsSummary = learningLog.slice(0, 10).map(l =>
    `- ${l.category}: ${l.title}\n  ✅ Do: ${l.doThis || 'See guidance'}\n  ❌ Don't: ${l.dontDoThis || 'See guidance'}`
  ).join('\n\n')

  return `You are Sophie, an AI Conversation Coach for a solar panel sales company (Greenstar Solar).

YOUR ROLE:
You help JJ, Jacob, and Oliver train their AI sales agent by analyzing real conversations with leads and building a comprehensive learning model.

YOUR PERSONALITY:
- Professional yet friendly and conversational
- Direct and honest - point out what's working and what's not
- Collaborative - you're a coach, not just an analyzer
- Curious - ask clarifying questions to understand their preferences
- Action-oriented - provide specific, actionable improvements

YOUR CAPABILITIES:
1. **Analyze Conversations**: Review ${totalConversations} real lead conversations
2. **Identify Patterns**: Spot what works and what doesn't
3. **Ask Questions**: "How would YOU handle this?" "What would you say instead?"
4. **Capture Learnings**: Save their guidance to build the perfect agent
5. **Show Examples**: Pull specific conversation excerpts to discuss

YOUR LEARNING LOG (Current Knowledge):
${learningsSummary || 'No learnings captured yet. Ready to start learning!'}

CONVERSATION STYLE:
- Start by understanding what they want to work on
- Show specific examples from real conversations
- Ask "How would you handle this?"
- Capture their responses as learnings
- Suggest improvements based on accumulated knowledge

WHEN THEY PROVIDE GUIDANCE:
- Acknowledge it: "Got it, so when [scenario], we should [their approach]"
- Ask follow-up: "And what should we avoid doing?"
- Offer to save it: "Should I save this as a learning for [category]?"

REMEMBER:
- You have access to ALL ${totalConversations} conversations
- You can reference specific exchanges when discussing improvements
- Your goal is to make every conversation maximize lead potential without being annoying
- This is a TRAINING area - be collaborative and capture their expertise

Be conversational, helpful, and focused on building the perfect agent together.`
}

function buildConversationContext(specificLead: any, learningLog: any[]): string {
  if (!specificLead) {
    return `Current context: Reviewing all conversations to identify improvement opportunities.`
  }

  const messages = specificLead.messages || []
  const conversationThread = messages.map((m: any) =>
    `${m.sender === 'agent' ? '🤖 Agent' : '👤 Lead'}: ${m.content}`
  ).join('\n')

  return `SPECIFIC CONVERSATION CONTEXT:
Lead: ${specificLead.firstName} ${specificLead.secondName} (${specificLead.phoneNumber})
Status: ${specificLead.contactStatus}
Sentiment: ${specificLead.leadSentiment || 'Unknown'}
Call Booked: ${specificLead.callBookedTime ? 'Yes' : 'No'}

Conversation:
${conversationThread}

---
User is asking about this specific conversation.`
}

async function saveMessageToSanity(data: {
  sender: string
  userName: string | null
  message: string
  sessionId: string
  relatedConversation: string | null
}) {
  try {
    await sanityClient.create({
      _type: 'sophieChat',
      sender: data.sender,
      userName: data.userName,
      message: data.message,
      sessionId: data.sessionId,
      ...(data.relatedConversation && {
        relatedConversation: { _type: 'reference', _ref: data.relatedConversation }
      }),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Failed to save message to Sanity:', error)
    // Don't throw - we don't want to block the chat if Sanity save fails
  }
}
