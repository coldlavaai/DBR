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

      // Filter for conversations where CUSTOMER replied (not just AI sent M1/M2/M3)
      leadsToAnalyze = allUnanalyzed
        .filter((lead: any) => {
          const messages = parseConversationMessages(lead.conversationHistory)
          // Must have at least one message from the Lead (customer reply)
          const hasCustomerReply = messages.some((m: any) => m.sender === 'Lead')
          return hasCustomerReply
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
        // DUPLICATE PREVENTION: Check if analysis already exists for this lead
        const existingAnalysis = await sanityClient.fetch(
          `*[_type == "sophieAnalysis" && lead._ref == $leadId][0]._id`,
          { leadId: lead._id }
        )

        if (existingAnalysis) {
          console.log(`Skipping ${lead.firstName} ${lead.secondName} - already analyzed`)
          results.push({
            leadId: lead._id,
            leadName: `${lead.firstName} ${lead.secondName}`,
            skipped: true,
            reason: 'Already analyzed'
          })
          continue
        }

        const analysis = await analyzeConversation(lead)

        // Get all active learning IDs for version tracking
        const allLearnings = await loadPreviousLearnings()
        const activeLearningIds = allLearnings.map((l: any) => l._id)

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
          // Track which learnings were applied in this analysis
          appliedLearnings: (analysis as any).appliedLearnings || [],
          learningCount: ((analysis as any).appliedLearnings)?.length || 0,
          // Version control: track ALL learning IDs that existed when this analysis was done
          appliedLearningIds: activeLearningIds,
          analysisVersion: allLearnings.length, // Simple version = count of learnings
        })

        results.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          score: analysis.qualityScore,
          analysisId: savedAnalysis._id,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Failed to analyze lead ${lead._id}:`, errorMessage)
        results.push({
          leadId: lead._id,
          leadName: `${lead.firstName} ${lead.secondName}`,
          error: `Analysis failed: ${errorMessage}`,
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
 * Check if a message is M1/M2/M3 automated follow-up
 */
function isAutomatedFollowUp(content: string, sender: string): { isTemplate: boolean; templateType: string | null } {
  if (sender !== 'AI') return { isTemplate: false, templateType: null }

  // M1: "Hi, is this the same [Name] who enquired about solar panels"
  const isM1 = content.includes('is this the same') && content.includes('who enquired about solar panels')

  // M2: "Just checking in again" + "Are you still thinking about going solar"
  const isM2 = content.includes('Just checking in again') &&
               content.includes('Are you still thinking about going solar')

  // M3: "Just checking in one last time" + "If you're still curious"
  const isM3 = content.includes('Just checking in one last time') &&
               content.includes("If you're still curious")

  if (isM1) return { isTemplate: true, templateType: 'M1' }
  if (isM2) return { isTemplate: true, templateType: 'M2' }
  if (isM3) return { isTemplate: true, templateType: 'M3' }

  return { isTemplate: false, templateType: null }
}

/**
 * Parse conversation history into structured messages
 */
function parseConversationMessages(conversation: string) {
  if (!conversation) return []

  const messages: any[] = []
  const lines = conversation.split('\n')

  for (const line of lines) {
    // New format: [19:15 30/10/2025] AI: message
    // New format: [19:15 30/10/2025] Name: message
    const newFormatMatch = line.match(/\[(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\] ([^:]+): (.+)/)

    // M1 format: Just "AI: message" (without timestamps - SKIP THESE)
    const simpleAiMatch = line.match(/^AI: (.+)/)

    // Old format: AI (30/10/2025 19:15): message
    // Old format: Lead (30/10/2025 19:15): message
    const oldAiMatch = line.match(/AI \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)
    const oldLeadMatch = line.match(/Lead \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)

    // Handle M1 (simple AI messages without timestamps - these are template messages)
    if (simpleAiMatch) {
      const content = simpleAiMatch[1]
      const templateCheck = isAutomatedFollowUp(content, 'AI')

      messages.push({
        sender: 'AI',
        timestamp: 'N/A',
        content: content.trim(),
        isTemplate: templateCheck.isTemplate,
        templateType: templateCheck.templateType,
      })
    } else if (newFormatMatch) {
      const [, timestamp, sender, content] = newFormatMatch
      // Skip empty messages
      if (content && content.trim()) {
        const parsedSender = sender.trim() === 'AI' ? 'AI' : 'Lead'
        const templateCheck = isAutomatedFollowUp(content, parsedSender)

        messages.push({
          sender: parsedSender,
          timestamp,
          content: content.trim(),
          isTemplate: templateCheck.isTemplate,
          templateType: templateCheck.templateType,
        })
      }
    } else if (oldAiMatch) {
      const content = oldAiMatch[2]
      const templateCheck = isAutomatedFollowUp(content, 'AI')

      messages.push({
        sender: 'AI',
        timestamp: oldAiMatch[1],
        content: content,
        isTemplate: templateCheck.isTemplate,
        templateType: templateCheck.templateType,
      })
    } else if (oldLeadMatch) {
      messages.push({
        sender: 'Lead',
        timestamp: oldLeadMatch[1],
        content: oldLeadMatch[2],
        isTemplate: false,
        templateType: null,
      })
    }
  }

  return messages
}

/**
 * Load all previous learnings from Sanity
 */
async function loadPreviousLearnings() {
  try {
    const learnings = await sanityClient.fetch(
      `*[_type == "sophieLearning" && isActive == true] | order(priority desc, _createdAt desc) {
        _id,
        category,
        title,
        userGuidance,
        doThis,
        dontDoThis,
        priority,
        tags,
        isHardRule,
        timesReinforced
      }`
    )
    return learnings
  } catch (error) {
    console.error('Failed to load learnings:', error)
    return []
  }
}

/**
 * Call Anthropic Claude to analyze conversation quality
 */
async function callAIForAnalysis(messages: any[], lead: any) {
  const conversationText = messages.map((m, i) => {
    const prefix = m.isTemplate ? `Message ${i + 1} [${m.sender} - ${m.templateType} TEMPLATE]:` : `Message ${i + 1} [${m.sender}]:`
    return `${prefix} ${m.content}`
  }).join('\n\n')

  // CRITICAL: Load ALL previous learnings - Sophie's memory
  const learnings = await loadPreviousLearnings()

  // Separate Hard Rules from regular learnings
  const hardRules = learnings.filter((l: any) => l.isHardRule === true || l.timesReinforced >= 3)
  const regularLearnings = learnings.filter((l: any) => !l.isHardRule && (!l.timesReinforced || l.timesReinforced < 3))

  // Format Hard Rules section
  const hardRulesSection = hardRules.length > 0
    ? `\n\n## 🔥 UNBREAKABLE HARD RULES 🔥
**These rules have been validated ${hardRules.length > 1 ? hardRules.length : ''} time(s). NEVER break them under ANY circumstances.**

${hardRules.map((rule: any, i: number) => `
### HARD RULE #${i + 1}: ${rule.title} [REINFORCED ${rule.timesReinforced || 3}x]
**You were taught:** ${rule.userGuidance}
**ALWAYS DO THIS:** ${rule.doThis}
**NEVER DO THIS:** ${rule.dontDoThis}
⚠️ **Breaking this rule = COMPLETE FAILURE**
`).join('\n')}
`
    : ''

  // Format regular learnings section
  const learningsSection = regularLearnings.length > 0
    ? `\n\n## 🧠 SOPHIE'S RUNNING MEMORY - RECENT LEARNINGS
**These are being tested. Follow them carefully:**

${regularLearnings.map((l: any, i: number) => `
### Learning #${i + 1}: ${l.title} [${l.priority.toUpperCase()}]
**What you were taught:** ${l.userGuidance}
**DO THIS:** ${l.doThis}
**DON'T DO THIS:** ${l.dontDoThis}
`).join('\n')}
`
    : ''

  const systemPrompt = `You are Sophie, an AI conversation quality analyst for Greenstar Solar's DBR (Database Reactivation) campaign.

## ⚠️ UNBREAKABLE HARD RULES - READ FIRST ⚠️

**HARD RULE #0: CHRONOLOGICAL ORDER IS SACRED**
Messages are ALWAYS displayed in chronological order:
- **OLDEST messages at the TOP**
- **NEWEST messages at the BOTTOM**

You MUST read conversations from TOP to BOTTOM to understand the flow correctly.
**NEVER assume the order is reversed.**
**NEVER guess who said what - READ THE LABELS.**

If you make this mistake again, you will fail completely. This rule has been taught to you MULTIPLE times.

${hardRulesSection}

${learningsSection}

## YOUR MISSION
Analyze conversations between the AI agent and leads to identify quality issues and learning opportunities. Evaluate across four key dimensions: sales tactics, objection handling, sentiment analysis, and UK cultural fit.

**CRITICAL RULE: ONE ISSUE PER MESSAGE**
- Identify the PRIMARY issue with each AI message
- Do NOT flag the same message with multiple issues
- Choose the most important problem if multiple exist
- Issues must be logical and not contradictory

## ANALYSIS FRAMEWORK

### 1. SENTIMENT ANALYSIS
**Customer Emotional State:**
- Interested/engaged vs. resistant/defensive
- Confident vs. anxious about investment
- Trusting vs. skeptical of sales approach
- Ready to move forward vs. needs more time

**Red Flags:**
- Abrupt one-word responses (disengaged)
- Explicit rejection signals ("not interested", "stop messaging")
- Defensive language (feels pressured)
- Delaying tactics without genuine questions

### 2. SALES TACTICS
**Effective Techniques:**
- Building rapport before pitching
- Asking discovery questions to understand needs
- Creating value before asking for commitment
- Social proof and credibility building
- Clear next steps that give customer control

**Poor Tactics:**
- Premature closing attempts
- Feature-dumping without understanding needs
- Ignoring buying signals (missing opportunities)
- Generic responses that don't address specific concerns
- Overpromising or exaggerating benefits

### 3. OBJECTION HANDLING
**Strong Handling:**
- Acknowledge the concern genuinely
- Provide specific, verifiable information
- Reframe objection as opportunity to educate
- Offer proof points (reviews, case studies)
- Give customer control of next steps

**Weak Handling:**
- Dismissing concerns ("don't worry about that")
- Generic reassurances without specifics
- Defensive responses
- Ignoring the real concern
- Pushing past objections without addressing them

### 4. UK CULTURAL FIT
**British Communication:**
- Understatement and reserve (not overly enthusiastic)
- Respect for autonomy (no hard selling)
- Honest, straightforward information
- Acknowledging concerns as valid
- Polite persistence (not aggressive)

**Avoid:**
- American sales hyperbole
- Urgency tactics ("limited time offer!")
- Excessive enthusiasm
- Pressure to decide immediately

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

## ISSUE TYPES TO FLAG (Choose ONE per message)

**Sales & Persuasion:**
- too_pushy: Aggressive closing, urgency tactics, ignoring refusals
- not_assertive: Missing clear opportunities to suggest consultation
- missed_booking: Customer clearly ready but AI doesn't capitalize
- wrong_tone: Inappropriate enthusiasm, hyperbole, or cultural mismatch
- no_response: AI failed to respond after customer replied (unacceptable silence)

**Objection & Concern Handling:**
- trust_issue: Dismissing concerns, vague reassurances, overselling
- bad_price_handling: Poor handling of cost objections
- bad_timing_handling: Pushing immediate action, ignoring customer's timeline
- didnt_answer: Avoiding or ignoring the actual question

**Conversation Flow:**
- should_stop: Continuing when customer clearly not interested
- lost_context: Forgetting previous info, contradicting earlier statements
- repetitive: Repeating same points without progress
- too_long: Overwhelming message length
- too_short: Robotic, unhelpful brevity

**IMPORTANT:** If a message has multiple problems, choose the MOST CRITICAL one. Do not list the same messageIndex multiple times.

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

## RESPONSE EXAMPLES

**Strong Responses:**
- "I understand - solar is a significant investment. Most systems pay for themselves in 6-8 years based on current energy prices."
- "That's a valid concern. Would it help if I shared some customer reviews from people in similar situations?"
- "Great question. Let me give you the honest answer: [specific info]. You can also check our Trustpilot if you'd like independent feedback."
- "Would a free consultation help answer your specific questions? No obligation at all - just a chance to get personalized information."

**Weak Responses:**
- "Don't worry about the cost - you'll save so much money!" (dismissive of real concern)
- "Now is the perfect time! Prices are going up!" (pressure tactic)
- "We're the best solar company in the UK!" (unsupported claim)
- "You need to act fast before this offer expires!" (artificial urgency)

**CRITICAL ANALYSIS RULES:**

1. **TEMPLATE MESSAGES (M1/M2/M3):**
   - Messages marked as "TEMPLATE" are automated follow-ups sent by the system
   - M1 = Initial outreach ("Hi, is this the same [Name] who enquired...")
   - M2 = First follow-up ("Just checking in again...")
   - M3 = Final follow-up ("Just checking in one last time...")
   - DO NOT analyze template messages as if they were responses to the customer
   - Templates are just context - they show what was sent but are not personalized responses
   - If a customer replies to a template and there's NO real AI response after, that's the issue to flag

2. **CONVERSATION FLOW & CHRONOLOGY:**
   - Messages are in chronological order (top to bottom)
   - Understand what came before and after each message
   - A template message is NOT a response to the customer - it's an automated send
   - Look for ACTUAL AI responses (non-template messages) after customer replies
   - If customer replies and AI doesn't respond (or only sends another template), that may be an issue

3. **ONE ISSUE PER MESSAGE MAXIMUM:**
   - Each messageIndex should appear ONLY ONCE in your issues array
   - If a message has multiple problems, identify the MOST CRITICAL one only
   - Do NOT create multiple issues pointing to the same messageIndex

4. **Message Index Rules:**
   - Messages are numbered starting from 1
   - ONLY analyze messages where sender is [AI] AND it's NOT a template
   - If analyzing lack of response, reference the message number where a response SHOULD have been
   - messageIndex must point to an AI message number, NEVER a Lead message

5. **Logical Consistency:**
   - Issues must make logical sense (can't be both "too_pushy" AND "not_assertive")
   - Choose the issue that best describes the primary problem

**Example 1 - Template Message Handling:**
Message 1 [AI - M1 TEMPLATE]: Hi, is this the same John who enquired about solar panels?
Message 2 [Lead]: Not interested
Message 3 [AI - M2 TEMPLATE]: Just checking in again. Are you still thinking about going solar?

Analysis: The AI never actually responded to the customer's "Not interested" - only sent automated M2.
Correct Issue: Message 3 - "no_response" (AI failed to acknowledge customer's clear disinterest, only sent template)
Wrong: Analyzing M1 or M2 as if they were responses to the customer

**Example 2 - Multiple Issues on Same Message:**
Message 1 [AI]: Hello!
Message 2 [Lead]: Not interested
Message 3 [AI]: Let me tell you more about our great deals! You need to act fast before prices go up!

Analysis: Message 3 has multiple problems (ignores refusal, too pushy, wrong tone)
Correct: ONE issue for Message 3 - "should_stop" (most critical: ignored clear disinterest)
Wrong: Multiple issues for Message 3 - "should_stop", "too_pushy", "wrong_tone" (contradictory and repetitive)

Return your analysis as JSON with this structure:
{
  "qualityScore": 0-100,
  "overallAssessment": "string (2-3 sentences summary)",
  "keyTakeaways": ["specific lesson 1", "specific lesson 2", "specific lesson 3"],
  "appliedLearnings": ["Learning #1", "Learning #3"] /* which learnings from your memory influenced this analysis */,
  "issues": [
    {
      "issueType": "no_response|should_stop|missed_booking|bad_price_handling|bad_timing_handling|trust_issue|too_long|too_short|lost_context|wrong_tone|repetitive|didnt_answer|too_pushy|not_assertive",
      "messageIndex": 1,
      "explanation": "what was wrong and why it matters (sales tactics, objection handling, sentiment, or cultural fit)",
      "actualResponse": "exact quote of what the AI said at this messageIndex - MUST be from an [AI] message (can be empty string if issue is no_response), NEVER from [Lead]",
      "suggestedResponse": "what AI should have said instead - professional, respectful, effective"
    }
  ]
}

NOTE: In "appliedLearnings", list which learnings from your memory (if any) you applied. This helps us track which learnings are working.

REMEMBER:
- Each messageIndex must appear ONLY ONCE
- Choose the single most important issue per AI message
- Template messages (M1/M2/M3) are NOT responses - don't analyze them as such
- If AI doesn't respond after customer message, flag it as "no_response"`

  const userPrompt = `Analyze this conversation with ${lead.firstName}:\n\nLead Status: ${lead.contactStatus}\n\n${conversationText}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const analysisText = data.content[0].text
  const analysis = JSON.parse(analysisText)

  return analysis
}
