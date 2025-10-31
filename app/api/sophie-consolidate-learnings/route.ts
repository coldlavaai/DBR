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
 * SOPHIE LEARNING CONSOLIDATION
 * ==============================
 * Identify and merge similar learnings to prevent prompt bloat
 * - Find learnings with similar categories and content
 * - Suggest consolidation
 * - Create meta-learnings that combine multiple lessons
 * - Archive superseded learnings
 */

export async function POST(request: NextRequest) {
  try {
    const { mode, category, learningIds, newTitle, newGuidance } = await request.json()

    // mode: 'suggest' | 'merge' | 'archive'

    if (mode === 'suggest') {
      // Find learnings that could be consolidated
      const learnings = await sanityClient.fetch(
        `*[_type == "sophieLearning" && isActive == true] | order(category, _createdAt desc) {
          _id,
          category,
          title,
          userGuidance,
          doThis,
          dontDoThis,
          timesApplied,
          confidenceScore
        }`
      )

      // Group by category
      const categories: Record<string, any[]> = {}
      learnings.forEach((learning: any) => {
        if (!categories[learning.category]) {
          categories[learning.category] = []
        }
        categories[learning.category].push(learning)
      })

      // Find categories with 3+ learnings
      const suggestions = Object.entries(categories)
        .filter(([_, group]) => group.length >= 3)
        .map(([cat, group]) => ({
          category: cat,
          count: group.length,
          learnings: group,
          suggestion: `Consider consolidating ${group.length} learnings about ${cat}`,
          totalApplications: group.reduce((sum, l) => sum + (l.timesApplied || 0), 0),
          averageConfidence: group.reduce((sum, l) => sum + (l.confidenceScore || 0), 0) / group.length,
        }))

      return NextResponse.json({
        success: true,
        suggestions,
        totalCategories: Object.keys(categories).length,
      })
    }

    if (mode === 'merge' && learningIds && learningIds.length >= 2) {
      // Merge multiple learnings into one meta-learning
      const learnings = await sanityClient.fetch(
        `*[_type == "sophieLearning" && _id in $ids] {
          _id,
          category,
          title,
          userGuidance,
          doThis,
          dontDoThis,
          conversationExamples,
          timesApplied,
          timesCorrect,
          timesIncorrect,
          confidenceScore,
          tags
        }`,
        { ids: learningIds }
      )

      if (learnings.length < 2) {
        return NextResponse.json(
          { error: 'Need at least 2 learnings to merge' },
          { status: 400 }
        )
      }

      // Combine conversation examples
      const allExamples = learnings.flatMap((l: any) => l.conversationExamples || [])
      const uniqueExamples = Array.from(new Set(allExamples.map((ex: any) => ex._ref)))
        .map(ref => ({ _type: 'reference', _ref: ref }))

      // Combine stats
      const combinedStats = {
        timesApplied: learnings.reduce((sum: number, l: any) => sum + (l.timesApplied || 0), 0),
        timesCorrect: learnings.reduce((sum: number, l: any) => sum + (l.timesCorrect || 0), 0),
        timesIncorrect: learnings.reduce((sum: number, l: any) => sum + (l.timesIncorrect || 0), 0),
      }

      const avgConfidence = learnings.reduce((sum: number, l: any) => sum + (l.confidenceScore || 0), 0) / learnings.length

      // Combine tags
      const allTags = learnings.flatMap((l: any) => l.tags || [])
      const uniqueTags = Array.from(new Set([...allTags, 'consolidated', 'meta_learning']))

      // Create new consolidated learning
      const metaLearning = await sanityClient.create({
        _type: 'sophieLearning',
        category: learnings[0].category,
        title: newTitle || `Consolidated: ${learnings[0].category}`,
        userGuidance: newGuidance || `Combined learning from ${learnings.length} related lessons:\n\n${learnings.map((l: any) => l.userGuidance).join('\n\n')}`,
        doThis: learnings.map((l: any) => l.doThis).join(' AND '),
        dontDoThis: learnings.map((l: any) => l.dontDoThis).join(' OR '),
        priority: 'high', // Consolidated learnings are important
        conversationExamples: uniqueExamples,
        createdBy: 'Sophie (Auto-consolidated)',
        lastUpdated: new Date().toISOString(),
        tags: uniqueTags,
        confidenceScore: avgConfidence,
        timesApplied: combinedStats.timesApplied,
        timesCorrect: combinedStats.timesCorrect,
        timesIncorrect: combinedStats.timesIncorrect,
        version: 1,
        isActive: true,
        source: 'consolidated',
        consolidatedFrom: learningIds,
      })

      // Archive the original learnings
      await Promise.all(
        learningIds.map((id: string) =>
          sanityClient.patch(id).set({ isActive: false, supersededBy: metaLearning._id }).commit()
        )
      )

      return NextResponse.json({
        success: true,
        message: `✅ Merged ${learnings.length} learnings into consolidated learning`,
        metaLearning: metaLearning._id,
        archived: learningIds.length,
      })
    }

    if (mode === 'archive' && learningIds) {
      // Archive specific learnings
      await Promise.all(
        learningIds.map((id: string) =>
          sanityClient.patch(id).set({ isActive: false }).commit()
        )
      )

      return NextResponse.json({
        success: true,
        message: `✅ Archived ${learningIds.length} learnings`,
        archived: learningIds.length,
      })
    }

    return NextResponse.json(
      { error: 'Invalid mode or missing parameters' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Learning consolidation error:', error)
    return NextResponse.json(
      { error: 'Failed to consolidate learnings', details: String(error) },
      { status: 500 }
    )
  }
}
