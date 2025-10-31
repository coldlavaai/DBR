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
 * SOPHIE LEARNING ANALYTICS
 * ==========================
 * Track and analyze which learnings are working
 * - Confidence scores over time
 * - Most applied learnings
 * - Learnings that prevent mistakes
 * - Learnings that need consolidation
 */

export async function GET(request: NextRequest) {
  try {
    // Fetch all learnings with usage stats
    const learnings = await sanityClient.fetch(
      `*[_type == "sophieLearning" && isActive == true] | order(confidenceScore desc, timesApplied desc) {
        _id,
        _createdAt,
        title,
        category,
        priority,
        confidenceScore,
        timesApplied,
        timesCorrect,
        timesIncorrect,
        version,
        source,
        tags,
        "exampleCount": count(conversationExamples)
      }`
    )

    // Fetch all analyses to see how many times each learning prevented a mistake
    const analyses = await sanityClient.fetch(
      `*[_type == "sophieAnalysis"] {
        _id,
        appliedLearnings,
        qualityScore,
        issuesIdentified
      }`
    )

    // Calculate analytics
    const analytics = {
      totalLearnings: learnings.length,
      byPriority: {
        critical: learnings.filter((l: any) => l.priority === 'critical').length,
        high: learnings.filter((l: any) => l.priority === 'high').length,
        medium: learnings.filter((l: any) => l.priority === 'medium').length,
        low: learnings.filter((l: any) => l.priority === 'low').length,
      },
      bySource: {
        user_agreed: learnings.filter((l: any) => l.source === 'user_agreed').length,
        teaching_dialogue: learnings.filter((l: any) => l.source === 'teaching_dialogue').length,
      },
      byCategory: {} as Record<string, number>,
      averageConfidence: 0,
      totalApplications: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      mostAppliedLearnings: [] as any[],
      highestConfidenceLearnings: [] as any[],
      needsConsolidation: [] as any[],
      recentLearnings: [] as any[],
    }

    // Calculate category breakdown
    learnings.forEach((learning: any) => {
      if (learning.category) {
        analytics.byCategory[learning.category] = (analytics.byCategory[learning.category] || 0) + 1
      }
      analytics.totalApplications += learning.timesApplied || 0
      analytics.totalCorrect += learning.timesCorrect || 0
      analytics.totalIncorrect += learning.timesIncorrect || 0
    })

    // Calculate average confidence
    const confidenceSum = learnings.reduce((sum: number, l: any) => sum + (l.confidenceScore || 0), 0)
    analytics.averageConfidence = learnings.length > 0 ? confidenceSum / learnings.length : 0

    // Most applied learnings (top 10)
    analytics.mostAppliedLearnings = learnings
      .filter((l: any) => (l.timesApplied || 0) > 0)
      .sort((a: any, b: any) => (b.timesApplied || 0) - (a.timesApplied || 0))
      .slice(0, 10)

    // Highest confidence learnings (top 10)
    analytics.highestConfidenceLearnings = learnings
      .sort((a: any, b: any) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
      .slice(0, 10)

    // Learnings that need consolidation (similar titles/categories, low application)
    const categoryGroups = learnings.reduce((groups: Record<string, any[]>, learning: any) => {
      if (!groups[learning.category]) {
        groups[learning.category] = []
      }
      groups[learning.category].push(learning)
      return groups
    }, {})

    analytics.needsConsolidation = Object.entries(categoryGroups)
      .filter(([_, group]) => (group as any[]).length >= 3) // 3+ learnings in same category
      .map(([category, group]) => ({
        category,
        count: (group as any[]).length,
        learnings: (group as any[]).slice(0, 5), // Show first 5
        suggestion: `${(group as any[]).length} learnings about ${category} - consider consolidating`,
      }))

    // Recent learnings (last 10)
    analytics.recentLearnings = learnings
      .sort((a: any, b: any) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime())
      .slice(0, 10)

    // Impact analysis - how many analyses used each learning
    const learningImpact: Record<string, { usedIn: number; preventedMistakes: number }> = {}

    analyses.forEach((analysis: any) => {
      if (analysis.appliedLearnings) {
        analysis.appliedLearnings.forEach((learningRef: any) => {
          const learningId = learningRef._ref
          if (!learningImpact[learningId]) {
            learningImpact[learningId] = { usedIn: 0, preventedMistakes: 0 }
          }
          learningImpact[learningId].usedIn++

          // If quality score is high, the learning likely helped
          if (analysis.qualityScore >= 70) {
            learningImpact[learningId].preventedMistakes++
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      analytics,
      learnings: learnings.slice(0, 50), // Return top 50 learnings
      learningImpact,
      totalAnalyses: analyses.length,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Learning analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics', details: String(error) },
      { status: 500 }
    )
  }
}
