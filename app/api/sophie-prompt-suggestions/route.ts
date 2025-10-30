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
 * SOPHIE'S PROMPT IMPROVEMENT SUGGESTIONS
 * =======================================
 * Aggregates learnings from Sanity and generates suggested prompt improvements
 * Groups by category and shows evidence-based recommendations
 */

export async function GET(request: NextRequest) {
  try {
    // Fetch all learnings from Sanity
    const learnings = await sanityClient.fetch(
      `*[_type == "sophieLearning"] | order(priority asc, lastUpdated desc) {
        _id,
        category,
        title,
        userGuidance,
        doThis,
        dontDoThis,
        priority,
        exampleResponses,
        conversationExamples,
        tags,
        notes,
        createdBy,
        lastUpdated
      }`
    )

    if (learnings.length === 0) {
      return NextResponse.json({
        suggestions: [],
        totalLearnings: 0,
        message: 'No learnings captured yet. Start reviewing conversations to build intelligence.',
      })
    }

    // Group learnings by category
    const grouped = groupLearningsByCategory(learnings)

    // Generate prompt suggestions for each category
    const suggestions = generatePromptSuggestions(grouped, learnings.length)

    return NextResponse.json({
      suggestions,
      totalLearnings: learnings.length,
      categoryCounts: Object.keys(grouped).reduce((acc, key) => {
        acc[key] = grouped[key].length
        return acc
      }, {} as Record<string, number>),
    })

  } catch (error) {
    console.error('Failed to generate prompt suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt suggestions' },
      { status: 500 }
    )
  }
}

/**
 * Group learnings by category
 */
function groupLearningsByCategory(learnings: any[]) {
  const grouped: Record<string, any[]> = {}

  for (const learning of learnings) {
    const category = learning.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(learning)
  }

  return grouped
}

/**
 * Generate prompt suggestions based on learnings
 */
function generatePromptSuggestions(grouped: Record<string, any[]>, totalLearnings: number) {
  const suggestions = []

  // UK Psychology Framework (if we have trust or tone learnings)
  const trustLearnings = grouped['trust_concern'] || []
  const toneLearnings = grouped['message_style'] || []

  if (trustLearnings.length > 0 || toneLearnings.length > 0) {
    suggestions.push({
      id: 'uk_psychology',
      title: 'UK Psychology Framework',
      priority: 'critical',
      section: 'NEW SECTION',
      learningCount: trustLearnings.length + toneLearnings.length,
      evidence: [...trustLearnings, ...toneLearnings].slice(0, 5).map(l => l.title),
      currentText: null,
      suggestedAddition: buildUKPsychologySection(trustLearnings, toneLearnings),
      reasoning: 'UK customers require specific psychological understanding for trust building and appropriate tone.',
    })
  }

  // Price Objection Handling
  const priceLearnings = grouped['price_objection'] || []
  if (priceLearnings.length > 0) {
    suggestions.push({
      id: 'price_objection',
      title: 'Price Objection Handling',
      priority: 'critical',
      section: 'REPLACE EXISTING',
      learningCount: priceLearnings.length,
      evidence: priceLearnings.slice(0, 5).map(l => l.title),
      currentText: `"How much?" / "What's the cost?":
→ "Fair question! Every roof is different - size, panels, setup all vary. Our team can give you an accurate cost. A quick call with the team will answer all your questions?"`,
      suggestedReplacement: buildPriceObjectionSection(priceLearnings),
      reasoning: 'Current response dismisses concern. New approach acknowledges investment anxiety and provides specifics.',
    })
  }

  // Timing Objection Handling
  const timingLearnings = grouped['timing_objection'] || []
  if (timingLearnings.length > 0) {
    suggestions.push({
      id: 'timing_objection',
      title: 'Timing Objection Handling',
      priority: 'high',
      section: 'NEW SECTION',
      learningCount: timingLearnings.length,
      evidence: timingLearnings.slice(0, 5).map(l => l.title),
      currentText: null,
      suggestedAddition: buildTimingObjectionSection(timingLearnings),
      reasoning: 'No current guidance on timing concerns. UK customers need patience and validation.',
    })
  }

  // When to Stop Messaging
  const followupLearnings = grouped['followup_strategy'] || []
  if (followupLearnings.length > 0) {
    suggestions.push({
      id: 'when_to_stop',
      title: 'When to Stop Messaging',
      priority: 'high',
      section: 'NEW SECTION',
      learningCount: followupLearnings.length,
      evidence: followupLearnings.slice(0, 5).map(l => l.title),
      currentText: null,
      suggestedAddition: buildWhenToStopSection(followupLearnings),
      reasoning: 'Prevents wasted messages on dead conversations and respects customer boundaries.',
    })
  }

  // Context Maintenance
  const contextLearnings = grouped['context_maintenance'] || []
  if (contextLearnings.length > 0) {
    suggestions.push({
      id: 'context_maintenance',
      title: 'Context Awareness Rules',
      priority: 'medium',
      section: 'NEW SECTION',
      learningCount: contextLearnings.length,
      evidence: contextLearnings.slice(0, 5).map(l => l.title),
      currentText: null,
      suggestedAddition: buildContextMaintenanceSection(contextLearnings),
      reasoning: 'Prevents repeating questions and maintains conversation continuity.',
    })
  }

  return suggestions
}

/**
 * Build UK Psychology Framework section
 */
function buildUKPsychologySection(trustLearnings: any[], toneLearnings: any[]) {
  return `=== UK PSYCHOLOGY FRAMEWORK ===

**CRITICAL: Understanding British Communication**

**British Understatement (ALWAYS decode this):**
- "I'm a little bit unsure" = VERY uncertain (needs reassurance)
- "Quite interested" = Genuinely interested but cautious
- "I'll have a think" = Needs more information, not ready yet
- "Not sure if now is the right time" = Has concerns to address

**Primary Emotion: FEAR**
- Solar = £6k-9k investment = triggers immediate anxiety
- Fear often masked by British composure and politeness
- Concern about making wrong decision, being "sold to"
- Need for control and verification before committing

**What BUILDS Trust:**
✅ Honest acknowledgment of concerns (NEVER dismiss)
✅ Specific, verifiable information (not vague reassurances)
✅ No pressure tactics or urgency
✅ Clear next steps THEY control
✅ References to reviews/social proof (Trustpilot)

**What DESTROYS Trust:**
❌ Overpromising ("save 95% on bills!")
❌ Pushy booking attempts without addressing concerns
❌ Dismissing worries ("don't worry about that")
❌ Too much enthusiasm (seems fake/American)
❌ Repetitive messaging

**Tone Guidelines:**
- Helpful, not pushy
- Informative, not selling
- British expressions: "brilliant", "spot on", "absolutely"
- No hyperbole or excessive enthusiasm
- Respectful of their decision-making process

${buildEvidenceList(trustLearnings, toneLearnings)}`
}

/**
 * Build Price Objection section
 */
function buildPriceObjectionSection(learnings: any[]) {
  const examples = learnings
    .filter(l => l.doThis)
    .slice(0, 3)
    .map(l => `→ ${l.doThis}`)
    .join('\n')

  const avoidExamples = learnings
    .filter(l => l.dontDoThis)
    .slice(0, 2)
    .map(l => `❌ DON'T: "${l.dontDoThis}"`)
    .join('\n')

  return `"How much?" / "What's the cost?" / "What are the prices?":

**Acknowledge the concern first:**
"I understand - solar is a significant investment. For a typical 3-bed home, systems range from £6k-£9k depending on roof space and energy usage."

**Provide value context:**
"Most systems pay for themselves in 6-8 years, then it's basically free electricity for 20+ years. The exact cost depends on your specific property."

**Offer next step:**
"Would you like to understand the numbers specific to your situation? A quick call with the team can give you accurate pricing."

${avoidExamples}

${examples}`
}

/**
 * Build Timing Objection section
 */
function buildTimingObjectionSection(learnings: any[]) {
  return `=== TIMING OBJECTIONS ===

"Not right now" / "Maybe later" / "Next year":

**Validate their timeline:**
"That's completely understandable - solar is a big decision. No pressure at all."

**Keep door open:**
"Would it be helpful if I sent you some information to review when you're ready? Or I can check back in a few months?"

**Don't push:**
- Never use urgency tactics ("prices going up!")
- Never pressure immediate action
- Respect their stated timeline

Evidence from ${learnings.length} conversations showing timing pressure destroys trust.`
}

/**
 * Build When to Stop section
 */
function buildWhenToStopSection(learnings: any[]) {
  return `=== WHEN TO STOP MESSAGING ===

**Stop immediately if:**
- Lead says "stop", "no thanks", "not interested" explicitly
- No response after 3 messages across different days
- Lead went with competitor
- Clear disinterest signals: one-word negatives, hostile tone

**Red flags - don't continue:**
- Dead conversation (no engagement)
- Wrong number confirmed
- Already has solar (unless asking about upgrades)

**Save your messages for engaged leads.**

Based on ${learnings.length} learnings about respecting boundaries.`
}

/**
 * Build Context Maintenance section
 */
function buildContextMaintenanceSection(learnings: any[]) {
  return `=== CONTEXT AWARENESS RULES ===

**NEVER:**
- Ask for information already provided in conversation history
- Contradict previous statements
- Repeat same questions
- Forget what lead already told you

**ALWAYS:**
- Reference previous conversation points
- Build on established information
- Remember their specific concerns
- Acknowledge their timeline/availability mentioned earlier

Based on ${learnings.length} examples of lost context damaging conversations.`
}

/**
 * Build evidence list from learnings
 */
function buildEvidenceList(trustLearnings: any[], toneLearnings: any[]) {
  const combined = [...trustLearnings, ...toneLearnings].slice(0, 3)
  if (combined.length === 0) return ''

  return `\n**Evidence from real conversations:**\n${combined.map(l => `- ${l.title}`).join('\n')}`
}
