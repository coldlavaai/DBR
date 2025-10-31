import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// ============================================================================
// SOPHIE LEARNING LOG API
// ============================================================================
// GET - Fetch all learnings
// POST - Save new learning
// PUT - Update existing learning
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = `*[_type == "sophieLearning"]`
    const params: any = {}

    if (category) {
      query += ` && category == $category`
      params.category = category
    }

    query += ` | order(priority asc, lastUpdated desc) {
      _id, _createdAt, category, title, userGuidance, doThis, dontDoThis,
      exampleResponses, conversationExamples, priority, tags, notes, createdBy, lastUpdated,
      confidenceScore, timesApplied, timesCorrect, timesIncorrect, version, isActive, source
    }`

    const learnings = await sanityClient.fetch(query, params)

    return NextResponse.json({
      learnings,
      total: learnings.length,
    })

  } catch (error: any) {
    console.error('❌ Error fetching learnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learnings', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      category,
      title,
      userGuidance,
      doThis,
      dontDoThis,
      exampleResponses,
      conversationExamples,
      priority,
      tags,
      notes,
      createdBy,
    } = body

    if (!category || !title || !userGuidance) {
      return NextResponse.json(
        { error: 'category, title, and userGuidance are required' },
        { status: 400 }
      )
    }

    const newLearning = await sanityClient.create({
      _type: 'sophieLearning',
      category,
      title,
      userGuidance,
      doThis: doThis || null,
      dontDoThis: dontDoThis || null,
      exampleResponses: exampleResponses || [],
      conversationExamples: conversationExamples || [],
      priority: priority || 'medium',
      tags: tags || [],
      notes: notes || null,
      createdBy: createdBy || 'Unknown',
      lastUpdated: new Date().toISOString(),
    })

    console.log(`✅ Saved new learning: ${title} (${category})`)

    return NextResponse.json({
      success: true,
      learning: newLearning,
    })

  } catch (error: any) {
    console.error('❌ Error saving learning:', error)
    return NextResponse.json(
      { error: 'Failed to save learning', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { _id, ...updates } = body

    if (!_id) {
      return NextResponse.json(
        { error: '_id is required for updates' },
        { status: 400 }
      )
    }

    const updatedLearning = await sanityClient
      .patch(_id)
      .set({
        ...updates,
        lastUpdated: new Date().toISOString(),
      })
      .commit()

    console.log(`✅ Updated learning: ${_id}`)

    return NextResponse.json({
      success: true,
      learning: updatedLearning,
    })

  } catch (error: any) {
    console.error('❌ Error updating learning:', error)
    return NextResponse.json(
      { error: 'Failed to update learning', details: error.message },
      { status: 500 }
    )
  }
}
