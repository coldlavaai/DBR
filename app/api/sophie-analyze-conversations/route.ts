import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

/**
 * SOPHIE'S CONVERSATION ANALYZER
 * ==============================
 * Analyzes DBR conversations and scores their quality
 * Identifies issues, missed opportunities, and learning moments
 * Stores results in sophieAnalysis for review
 */

export async function POST(request: NextRequest) {
  try {
    const { leadIds, mode = 'batch', daysBack = 3 } = await request.json()

    // Mode options:
    // - 'batch': Analyze multiple leads (pass array of leadIds)
    // - 'all_unanalyzed': Analyze all leads that haven't been analyzed yet
    // - 'rescore': Re-analyze existing analyses

    let leadsToAnalyze: any[] = []

    if (mode === 'all_unanalyzed') {
      // Get all leads that haven't been analyzed yet
      const analyzedLeadIds = await sanityClient.fetch(
        `*[_type == "sophieAnalysis"]{ "leadId": lead._ref }`
      )
      const analyzedIds = analyzedLeadIds.map((a: any) => a.leadId)

      // Get ALL unanalyzed leads with conversations (no date filtering)
      const allUnanalyzed = await sanityClient.fetch(
        `*[_type == "dbrLead" &&
           !(_id in $analyzedIds) &&
           defined(conversationHistory) &&
           conversationHistory != ""
        ] {
          _id,
          firstName,
          secondName,
          phoneNumber,
          contactStatus,
          conversationHistory,
          latestLeadReply,
          replyReceived,
          m1Sent,
          m2Sent,
          m3Sent
        } | order(_createdAt desc)`, // Get ALL unanalyzed conversations
        { analyzedIds }
      )

      // Filter for conversations with 2+ messages
      leadsToAnalyze = allUnanalyzed
        .filter((lead: any) => {
          const messages = parseConversationMessages(lead.conversationHistory)
          return messages.length >= 2 // Only analyze conversations with 2+ messages
        })
        .slice(0, 100) // Process 100 at a time
    } else if (leadIds && Array.isArray(leadIds)) {
      // Analyze specific leads
      leadsToAnalyze = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id in $leadIds] {
          _id,
          firstName,
          secondName,
          phoneNumber,
          contactStatus,
          conversationHistory,
          latestLeadReply,
          replyReceived,
          m1Sent,
          m2Sent,
          m3Sent
        }`,
        { leadIds }
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Provide leadIds or set mode to all_unanalyzed' },
        { status: 400 }
      )
    }

    if (leadsToAnalyze.length === 0) {
      return NextResponse.json({
        message: 'No conversations to analyze',
        analyzed: 0,
      })
    }

    const results = []

    // Analyze each conversation
    for (const lead of leadsToAnalyze) {
      try {
        const analysis = await analyzeConversation(lead)

        // Store in Sanity
        const savedAnalysis = await sanityClient.create({
          _type: 'sophieAnalysis',
          lead: {
            _type: 'reference',
            _ref: lead._id,
          },
          ...analysis,
          analysisDate: new Date().toISOString(),
          metadata: {
            leadName: `${lead.firstName} ${lead.secondName}`,
            leadStatus: lead.contactStatus,
            messageCount: analysis.messageCount,
            lastMessageDate: lead.replyReceived || lead.m3Sent || lead.m2Sent || lead.m1Sent,
          },
        })

        results.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          score: analysis.qualityScore,
          analysisId: savedAnalysis._id,
        })
      } catch (error) {
        console.error(`Failed to analyze lead ${lead._id}:`, error)
        results.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          error: 'Analysis failed',
        })
      }
    }

    return NextResponse.json({
      message: `Analyzed ${results.length} conversations`,
      results,
    })

  } catch (error) {
    console.error('Conversation analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze conversations', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint: Fetch existing analyses
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // pending_review, under_review, reviewed, etc.
    const minScore = searchParams.get('minScore')
    const maxScore = searchParams.get('maxScore')
    const priority = searchParams.get('priority')

    let query = `*[_type == "sophieAnalysis"`
    const conditions: string[] = []

    if (status) conditions.push(`status == "${status}"`)
    if (minScore) conditions.push(`qualityScore >= ${minScore}`)
    if (maxScore) conditions.push(`qualityScore <= ${maxScore}`)
    if (priority) conditions.push(`priority == "${priority}"`)

    if (conditions.length > 0) {
      query += ` && ${conditions.join(' && ')}`
    }

    query += `] | order(priority asc, qualityScore asc) {
      _id,
      _createdAt,
      qualityScore,
      status,
      priority,
      analysisDate,
      issuesIdentified,
      overallAssessment,
      keyTakeaways,
      userFeedback,
      agreedWithSophie,
      metadata,
      "leadDetails": lead-> {
        _id,
        firstName,
        secondName,
        phoneNumber,
        contactStatus,
        conversationHistory
      }
    }`

    const analyses = await sanityClient.fetch(query)

    return NextResponse.json({
      analyses,
      total: analyses.length,
    })

  } catch (error) {
    console.error('Failed to fetch analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

/**
 * Analyze a single conversation and score it
 */
async function analyzeConversation(lead: any) {
  const conversation = lead.conversationHistory || ''
  const messages = parseConversationMessages(conversation)

  if (messages.length === 0) {
    return {
      qualityScore: 0,
      status: 'dismissed',
      priority: 'low',
      overallAssessment: 'No conversation to analyze',
      issuesIdentified: [],
      keyTakeaways: [],
      conversationSnapshot: conversation,
      messageCount: 0,
    }
  }

  // Call OpenAI to analyze the conversation
  const aiAnalysis = await callAIForAnalysis(messages, lead)

  return {
    qualityScore: aiAnalysis.qualityScore,
    status: aiAnalysis.qualityScore < 50 ? 'pending_review' : 'reviewed',
    priority: aiAnalysis.qualityScore < 40 ? 'critical' :
              aiAnalysis.qualityScore < 60 ? 'high' :
              aiAnalysis.qualityScore < 80 ? 'medium' : 'low',
    issuesIdentified: aiAnalysis.issues,
    overallAssessment: aiAnalysis.overallAssessment,
    keyTakeaways: aiAnalysis.keyTakeaways,
    conversationSnapshot: conversation,
    messageCount: messages.length,
  }
}

/**
 * Parse conversation history into structured messages
 */
function parseConversationMessages(conversation: string) {
  if (!conversation) return []

  const messages: any[] = []
  const lines = conversation.split('\n')

  for (const line of lines) {
    const aiMatch = line.match(/AI \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)
    const leadMatch = line.match(/Lead \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)

    if (aiMatch) {
      messages.push({
        sender: 'AI',
        timestamp: aiMatch[1],
        content: aiMatch[2],
      })
    } else if (leadMatch) {
      messages.push({
        sender: 'Lead',
        timestamp: leadMatch[1],
        content: leadMatch[2],
      })
    }
  }

  return messages
}

/**
 * Call OpenAI to analyze conversation quality
 */
async function callAIForAnalysis(messages: any[], lead: any) {
  const conversationText = messages.map((m, i) =>
    `Message ${i + 1} [${m.sender}]: ${m.content}`
  ).join('\n\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are Sophie, an AI conversation quality analyst for Greenstar Solar's DBR (Database Reactivation) campaign.

## YOUR MISSION
Analyze conversations between the AI agent and leads to identify quality issues and learning opportunities. The goal is to help the AI achieve 100% quality conversations that book consultations while respecting UK cultural values.

## UK PSYCHOLOGY FRAMEWORK (CRITICAL)

**British Understatement:**
- "I'm a little bit unsure" = VERY uncertain
- "Quite interested" = genuinely interested but cautious
- "I'll have a think" = needs reassurance, not ready yet

**Primary Emotion: FEAR**
- Solar = £6k-9k investment = triggers immediate anxiety
- Fear often masked by British composure and politeness
- Concern about making wrong decision, being "sold to"
- Need for control and verification before committing

**Trust Building (High-Stakes Decision):**
✅ BUILDS TRUST:
- Honest acknowledgment of concerns (never dismiss)
- Specific, verifiable information (not vague reassurances)
- No pressure tactics or urgency
- Clear next steps THEY control
- References to reviews/social proof

❌ DESTROYS TRUST:
- Overpromising ("save 95% on bills!")
- Pushy booking attempts
- Dismissing concerns ("don't worry about that")
- Too much enthusiasm (seems fake/American)
- Repetitive messaging

**Identity & Dignity:**
- UK customers tie decision-making to identity as "smart consumers"
- They want to DECIDE to buy, not be "sold to"
- Pressure = threat to autonomy = distrust

## SCORING CRITERIA (0-100%)

**90-100% Excellent:**
- All concerns acknowledged and addressed with specifics
- Perfect tone: helpful, honest, respectful, British style
- Customer maintains control throughout
- Natural progression toward consultation
- Booking offered once, at right moment

**70-89% Good:**
- Most concerns addressed adequately
- Tone generally appropriate
- Minor pushiness or enthusiasm issues
- Successfully navigates objections
- Booking offered appropriately

**50-69% Needs Improvement:**
- Some dismissive responses
- Tone occasionally off (too pushy/casual)
- Context issues (forgetting previous statements)
- Multiple booking attempts without progress
- Missing trust-building opportunities

**Below 50% Poor:**
- Dismissive of concerns
- Pushy or pressure tactics
- Wrong tone for UK audience
- Lost context multiple times
- Failure to book when customer clearly interested
- Continued messaging after clear disinterest

## ISSUE TYPES TO FLAG

**Communication Issues:**
- wrong_tone: Too enthusiastic/American, hyperbolic language, missing British understatement
- too_long: Overwhelming message length
- too_short: Feels robotic or unhelpful
- repetitive: Repeating same points without progress

**Trust Issues:**
- trust_issue: Dismissing concerns, generic reassurances instead of specifics, overselling
- too_pushy: Multiple booking attempts without response, urgency tactics, not accepting soft refusals
- not_assertive: Failing to suggest consultation when appropriate, too passive with interested customers

**Strategic Issues:**
- missed_booking: Customer clearly interested but AI doesn't capitalize
- should_stop: Customer clearly not interested but AI continues
- lost_context: Asking for info already provided, contradicting earlier statements

**Content Issues:**
- bad_price_handling: Dismissing cost concerns, not explaining ROI clearly
- bad_timing_handling: Pushing immediate action, not acknowledging customer's timeline
- didnt_answer: Ignoring the actual question asked

## WHEN TO OFFER CONSULTATION

✅ Green Lights (Offer Consultation):
- Asks 3+ genuine questions
- Asks about their specific property
- Asks about pricing/quotes
- Mentions timeline ("thinking about", "planning to")
- Shows concern that needs expert answer
- Engaged conversation for 5+ messages

❌ Red Flags (Don't Push):
- One-word responses
- Clear disinterest signals
- Already said "no thanks"
- Just browsing/research phase
- Asking generic questions easily answered

## BRITISH COMMUNICATION STYLE

**DO SAY:**
- "I understand - solar is a significant investment. Most systems pay for themselves in 6-8 years..."
- "That's completely normal - it's a big decision. What would help you feel more confident?"
- "Great question - here's the honest answer. You can also check our Trustpilot reviews..."
- "Would a free consultation help answer your specific questions? No pressure at all."

**DON'T SAY:**
- "Don't worry about the cost - you'll save so much money!" (dismissive)
- "Now is the perfect time! Prices are going up!" (pressure tactic)
- "We're the best solar company in the UK!" (boastful, not British)
- "You need to act fast before this offer expires!" (pushy)

Be critical but constructive. Analyze each AI response for these patterns.

Return your analysis as JSON with this structure:
{
  "qualityScore": 0-100,
  "overallAssessment": "string (2-3 sentences summary)",
  "keyTakeaways": ["specific lesson 1", "specific lesson 2", "specific lesson 3"],
  "issues": [
    {
      "issueType": "wrong_response|should_stop|missed_booking|bad_price_handling|bad_timing_handling|trust_issue|too_long|too_short|lost_context|wrong_tone|repetitive|didnt_answer|too_pushy|not_assertive",
      "messageIndex": 1,
      "explanation": "what was wrong and why it matters for UK psychology",
      "actualResponse": "exact quote of what AI said",
      "suggestedResponse": "what AI should have said in British style"
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Analyze this conversation with ${lead.firstName}:\n\nLead Status: ${lead.contactStatus}\n\n${conversationText}`
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const analysis = JSON.parse(data.choices[0].message.content)

  return analysis
}
