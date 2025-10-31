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
 * SOPHIE RE-ANALYSIS SYSTEM
 * ==========================
 * After teaching Sophie, re-analyze conversations to apply new learning
 * Options:
 * - reanalyze_all: All conversations
 * - reanalyze_recent: Last N days
 * - reanalyze_affected: Only conversations matching the learning context
 */

export async function POST(request: NextRequest) {
  try {
    const { mode, learningId, daysBack = 7, limit = 100 } = await request.json()

    // mode: 'reanalyze_all' | 'reanalyze_recent' | 'reanalyze_affected'

    if (!mode) {
      return NextResponse.json(
        { error: 'Missing mode parameter' },
        { status: 400 }
      )
    }

    let analysesToRerun: any[] = []

    if (mode === 'reanalyze_all') {
      // Get ALL analyses (dangerous, expensive)
      analysesToRerun = await sanityClient.fetch(
        `*[_type == "sophieAnalysis"] | order(_createdAt desc) [0...${limit}] {
          _id,
          lead->{_id, firstName}
        }`
      )
    } else if (mode === 'reanalyze_recent') {
      // Get analyses from last N days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)

      analysesToRerun = await sanityClient.fetch(
        `*[_type == "sophieAnalysis" && _createdAt > $cutoffDate] | order(_createdAt desc) [0...${limit}] {
          _id,
          lead->{_id, firstName}
        }`,
        { cutoffDate: cutoffDate.toISOString() }
      )
    } else if (mode === 'reanalyze_affected' && learningId) {
      // Get analyses that might be affected by this specific learning
      const learning = await sanityClient.fetch(
        `*[_type == "sophieLearning" && _id == $learningId][0] {
          _id,
          category,
          tags,
          conversationExamples
        }`,
        { learningId }
      )

      if (!learning) {
        return NextResponse.json(
          { error: 'Learning not found' },
          { status: 404 }
        )
      }

      // Find analyses with similar issues or from same conversation
      const relevantTags = learning.tags || []
      const exampleLeadIds = learning.conversationExamples?.map((ex: any) => ex._ref) || []

      // **SMART RE-ANALYSIS**: Only get analyses that DON'T already have this learning applied
      analysesToRerun = await sanityClient.fetch(
        `*[_type == "sophieAnalysis" && (
          issuesIdentified[].issueType match $tags ||
          lead._ref in $leadIds
        ) && !($learningId in appliedLearningIds)] | order(_createdAt desc) [0...${limit}] {
          _id,
          lead->{_id, firstName},
          appliedLearningIds
        }`,
        { tags: relevantTags, leadIds: exampleLeadIds, learningId }
      )
    }

    if (analysesToRerun.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No analyses to re-run',
        count: 0,
      })
    }

    // Delete old analyses
    const deletionPromises = analysesToRerun.map((analysis) =>
      sanityClient.delete(analysis._id)
    )
    await Promise.all(deletionPromises)

    // **RATE LIMITING**: Process in batches with delays
    const batchSize = 5 // Process 5 at a time
    const delayBetweenBatches = 2000 // 2 second delay between batches
    const leadIds = analysesToRerun.map((a) => a.lead._id)
    let successCount = 0

    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize)

      // Trigger re-analysis for this batch
      const reanalysisResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'https://greenstar-dbr-dashboard.vercel.app'}/api/sophie-analyze-conversations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'specific_leads',
            leadIds: batch,
          }),
        }
      )

      if (reanalysisResponse.ok) {
        const data = await reanalysisResponse.json()
        successCount += data.results?.length || 0
      }

      // Wait before next batch (except for last batch)
      if (i + batchSize < leadIds.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }

    const reanalysisData = { results: [], count: successCount }

    return NextResponse.json({
      success: true,
      message: `✅ Re-analyzed ${analysesToRerun.length} conversations with new learning`,
      deleted: analysesToRerun.length,
      reanalyzed: reanalysisData.results?.length || 0,
      mode,
      learningId,
    })

  } catch (error) {
    console.error('Re-analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to re-analyze', details: String(error) },
      { status: 500 }
    )
  }
}
