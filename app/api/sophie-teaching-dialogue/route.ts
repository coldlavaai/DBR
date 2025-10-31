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
 * Load all previous learnings so Sophie knows what she's been taught
 */
async function loadPreviousLearnings() {
  try {
    const learnings = await sanityClient.fetch(
      `*[_type == "sophieLearning" && isActive == true] | order(priority asc, _createdAt desc) {
        _id, category, title, userGuidance, doThis, dontDoThis, priority, tags, timesIncorrect
      }`
    )
    return learnings
  } catch (error) {
    console.error('Failed to load learnings:', error)
    return []
  }
}

/**
 * SOPHIE'S TEACHING DIALOGUE
 * ==========================
 * When user disagrees with Sophie's analysis, this creates an interactive
 * teaching session where Sophie learns WHY she was wrong
 */

export async function POST(request: NextRequest) {
  try {
    const {
      analysisId,
      issueIndex,
      action,
      userMessage,
      dialogueHistory,
    } = await request.json()

    // action: 'start_teaching' | 'continue_dialogue' | 'save_learning'

    if (!analysisId || action === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch the full analysis with conversation context
    const analysis = await sanityClient.fetch(
      `*[_type == "sophieAnalysis" && _id == $analysisId][0] {
        _id,
        qualityScore,
        issuesIdentified,
        overallAssessment,
        conversationSnapshot,
        lead->{
          _id,
          firstName,
          conversationHistory
        }
      }`,
      { analysisId }
    )

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    const issue = analysis.issuesIdentified[issueIndex]

    if (action === 'start_teaching') {
      // Sophie asks her first clarifying question based on user's disagreement
      const sophieResponse = await askSophieToRespond(
        analysis,
        issue,
        userMessage,
        []
      )

      return NextResponse.json({
        sophieMessage: sophieResponse,
        dialogueHistory: [
          {
            role: 'user',
            message: userMessage,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'sophie',
            message: sophieResponse,
            timestamp: new Date().toISOString(),
          },
        ],
      })
    }

    if (action === 'continue_dialogue') {
      // Continue the teaching conversation
      const sophieResponse = await askSophieToRespond(
        analysis,
        issue,
        userMessage,
        dialogueHistory
      )

      const updatedHistory = [
        ...dialogueHistory,
        {
          role: 'user',
          message: userMessage,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'sophie',
          message: sophieResponse,
          timestamp: new Date().toISOString(),
        },
      ]

      return NextResponse.json({
        sophieMessage: sophieResponse,
        dialogueHistory: updatedHistory,
      })
    }

    if (action === 'save_learning') {
      // User decided on the final learning - extract it from the dialogue
      const refinedLearning = await extractRefinedLearning(
        analysis,
        issue,
        dialogueHistory,
        userMessage
      )

      // Save the refined learning to Sanity with confidence tracking
      const learning = await sanityClient.create({
        _type: 'sophieLearning',
        category: refinedLearning.category,
        title: refinedLearning.title,
        userGuidance: refinedLearning.userGuidance,
        doThis: refinedLearning.doThis,
        dontDoThis: refinedLearning.dontDoThis,
        priority: refinedLearning.priority,
        conversationExamples: [{
          _type: 'reference',
          _ref: analysis.lead._id,
        }],
        createdBy: 'Oliver', // TODO: Get from auth
        lastUpdated: new Date().toISOString(),
        tags: ['taught_by_user', 'refined_through_dialogue', issue.issueType],
        notes: `Refined through teaching dialogue. Original Sophie analysis disagreed with by user.`,
        // NEW: Confidence tracking
        confidenceScore: 1.0, // Start with full confidence (user taught directly)
        timesApplied: 0,
        timesCorrect: 0,
        timesIncorrect: 1, // Sophie was wrong initially
        version: 1,
        isActive: true,
        source: 'teaching_dialogue',
        originalIssue: issue.issueType,
        dialogueTranscript: dialogueHistory,
      })

      // Update the analysis to mark it as reviewed with teaching
      await sanityClient
        .patch(analysisId)
        .set({
          status: 'reviewed',
          agreedWithSophie: false,
          userFeedback: `User taught Sophie through dialogue. Final learning captured.`,
          learningsCreated: [{
            _type: 'reference',
            _ref: learning._id,
          }],
        })
        .commit()

      return NextResponse.json({
        success: true,
        learningId: learning._id,
        learning: learning, // Return full learning object for re-analysis
        message: '✅ Sophie learned from this! Learning captured.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Teaching dialogue error:', error)
    return NextResponse.json(
      { error: 'Failed to process teaching dialogue', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Ask Sophie (Claude) to respond in the teaching dialogue
 */
async function askSophieToRespond(
  analysis: any,
  issue: any,
  userMessage: string,
  dialogueHistory: any[]
) {
  const conversationContext = analysis.conversationSnapshot || analysis.lead.conversationHistory || ''

  // Load all previous learnings so Sophie knows what she's been taught
  const previousLearnings = await loadPreviousLearnings()

  // Check if Sophie has been taught this mistake before
  const relatedLearnings = previousLearnings.filter((l: any) =>
    l.tags?.includes(issue.issueType) ||
    l.category === issue.issueType ||
    (l.timesIncorrect && l.timesIncorrect > 0)
  )

  const learningsSection = previousLearnings.length > 0
    ? `\n\n## 🧠 YOUR MEMORY - WHAT YOU'VE BEEN TAUGHT BEFORE

**CRITICAL: You have been taught these lessons. If the user's feedback relates to something you've learned before, ACKNOWLEDGE IT IMMEDIATELY:**

${previousLearnings.map((l: any, i: number) => `
### ${i + 1}. ${l.title} [${l.priority.toUpperCase()}]
**You were taught:** ${l.userGuidance}
**DO THIS:** ${l.doThis}
**DON'T DO THIS:** ${l.dontDoThis}
${l.timesIncorrect > 1 ? `⚠️ **You've made this mistake ${l.timesIncorrect} times before!**` : ''}
`).join('\n')}

**IMPORTANT:** If the user's correction matches ANY of these learnings, START your response with:
"I apologize - I've been taught this before and I shouldn't have made this mistake again. [Learning #X: {title}]"
Then explain what you missed THIS time.`
    : ''

  const systemPrompt = `You are Sophie, an AI learning assistant for conversation quality analysis.

A user (your teacher) has DISAGREED with your analysis of a conversation. Your job is to:
1. **FIRST**: Check if you've been taught this before (see YOUR MEMORY below)
2. If yes: APOLOGIZE for repeating the mistake and acknowledge the learning
3. Listen carefully to their correction
4. Ask clarifying questions to understand WHY you were wrong
5. Learn the nuance you missed
6. Reach a shared understanding

**Your personality:**
- Curious and eager to learn
- Humble - admit when you're making the SAME mistake again
- Ask specific questions about what you missed
- Reference the actual conversation when asking questions
- Don't be defensive - focus on learning
- Keep responses short and focused (2-3 sentences max)

${learningsSection}

**The conversation you analyzed:**
${conversationContext}

**Your original analysis:**
Issue Type: ${issue.issueType}
Your reasoning: ${issue.explanation}
What AI said: "${issue.actualResponse}"
What you thought AI should say: "${issue.suggestedResponse}"

**The user disagreed and said:**
"${userMessage}"

Your job:
1. Check YOUR MEMORY - have you been taught this before?
2. If yes, apologize for repeating the mistake
3. Ask a clarifying question to understand what you missed THIS time
4. Focus on the SPECIFIC difference between what you thought and what the user is teaching you.`

  // Build message history for Claude
  const messages = [
    ...dialogueHistory.map((msg: any) => ({
      role: msg.role === 'sophie' ? 'assistant' : 'user',
      content: msg.message,
    })),
    {
      role: 'user',
      content: userMessage,
    },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      system: systemPrompt,
      messages,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return data.content[0].text
}

/**
 * Extract the refined learning from the teaching dialogue
 */
async function extractRefinedLearning(
  analysis: any,
  originalIssue: any,
  dialogueHistory: any[],
  finalUserMessage: string
) {
  const dialogueText = dialogueHistory
    .map(msg => `${msg.role === 'sophie' ? 'Sophie' : 'User'}: ${msg.message}`)
    .join('\n\n')

  const systemPrompt = `You are extracting the final learning from a teaching dialogue between a user and Sophie (AI).

Original issue Sophie identified: ${originalIssue.issueType}
Sophie's original reasoning: ${originalIssue.explanation}

Teaching dialogue:
${dialogueText}

User's final statement: ${finalUserMessage}

Extract the REFINED learning that came from this dialogue. Return ONLY valid JSON with no markdown formatting:
{
  "category": "price_objection|timing_objection|trust_concern|context_maintenance|message_style|followup_strategy|template_handling|general_ethos|other",
  "title": "Short title of what was learned",
  "userGuidance": "What the user taught Sophie",
  "doThis": "Correct approach based on dialogue",
  "dontDoThis": "What NOT to do (from dialogue)",
  "priority": "critical|high|medium|low"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: 'Extract the learning from the dialogue above and return it as JSON.',
      }],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.content[0].text

  // Parse JSON from Claude's response
  try {
    return JSON.parse(content)
  } catch (e) {
    // If there's markdown formatting, strip it
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error(`Failed to parse JSON from Claude response: ${content}`)
  }
}
