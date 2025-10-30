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
 * SOPHIE REVIEW FEEDBACK HANDLER
 * ===============================
 * Captures user feedback on Sophie's conversation analysis
 * Creates sophieLearning entries when user agrees with analysis
 * Updates sophieAnalysis with user feedback
 */

export async function POST(request: NextRequest) {
  try {
    const { analysisId, action, userFeedback, userName } = await request.json()

    // action: 'agree' | 'disagree'
    // userFeedback: optional text feedback

    if (!analysisId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: analysisId and action' },
        { status: 400 }
      )
    }

    // Fetch the analysis
    const analysis = await sanityClient.fetch(
      `*[_type == "sophieAnalysis" && _id == $analysisId][0] {
        _id,
        qualityScore,
        issuesIdentified,
        overallAssessment,
        keyTakeaways,
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

    const agreedWithSophie = action === 'agree'
    let learningsCreated: any[] = []

    // If user agrees, create learning entries from the issues
    if (agreedWithSophie && analysis.issuesIdentified && analysis.issuesIdentified.length > 0) {
      for (const issue of analysis.issuesIdentified) {
        // Map issue types to learning categories
        const categoryMap: Record<string, string> = {
          'bad_price_handling': 'price_objection',
          'bad_timing_handling': 'timing_objection',
          'trust_issue': 'trust_concern',
          'lost_context': 'context_maintenance',
          'too_long': 'message_style',
          'too_short': 'message_style',
          'wrong_tone': 'message_style',
          'missed_booking': 'interest_signal',
          'should_stop': 'followup_strategy',
          'too_pushy': 'followup_strategy',
          'not_assertive': 'followup_strategy',
          'repetitive': 'message_style',
          'didnt_answer': 'context_maintenance',
          'wrong_response': 'general_ethos',
        }

        const category = categoryMap[issue.issueType] || 'other'

        // Determine priority based on issue type
        const criticalIssues = ['trust_issue', 'too_pushy', 'should_stop', 'lost_context']
        const highIssues = ['bad_price_handling', 'bad_timing_handling', 'missed_booking']

        let priority = 'medium'
        if (criticalIssues.includes(issue.issueType)) {
          priority = 'critical'
        } else if (highIssues.includes(issue.issueType)) {
          priority = 'high'
        }

        // Create the learning entry
        const learning = await sanityClient.create({
          _type: 'sophieLearning',
          category,
          title: `${issue.issueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: Message #${issue.messageIndex}`,
          userGuidance: issue.explanation,
          dontDoThis: issue.actualResponse,
          doThis: issue.suggestedResponse,
          priority,
          conversationExamples: [{
            _type: 'reference',
            _ref: analysis.lead._id,
          }],
          createdBy: userName || 'Sophie',
          lastUpdated: new Date().toISOString(),
          tags: [issue.issueType, 'uk_psychology', 'dbr_campaign'],
        })

        learningsCreated.push({
          _type: 'reference',
          _ref: learning._id,
        })
      }
    }

    // Update the sophieAnalysis with feedback
    const updatedAnalysis = await sanityClient
      .patch(analysisId)
      .set({
        status: agreedWithSophie ? 'reviewed' : 'needs_info',
        agreedWithSophie,
        userFeedback: userFeedback || (agreedWithSophie ? 'Agreed with analysis' : 'Disagreed with analysis'),
        learningsCreated: agreedWithSophie ? learningsCreated : [],
      })
      .commit()

    return NextResponse.json({
      success: true,
      message: agreedWithSophie
        ? `✅ Feedback captured! Created ${learningsCreated.length} learning entries.`
        : '✅ Feedback captured! Sophie will reconsider this analysis.',
      learningsCreated: learningsCreated.length,
      analysisId: updatedAnalysis._id,
    })

  } catch (error) {
    console.error('Review feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to process feedback', details: String(error) },
      { status: 500 }
    )
  }
}
