import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

// GET - Load user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    // Fetch preferences
    const result = await sql`
      SELECT
        section_order,
        sections_expanded,
        sections_visible,
        default_time_range,
        auto_refresh_enabled,
        auto_refresh_interval,
        visible_metric_cards,
        updated_at
      FROM user_preferences
      WHERE user_id = ${userId}
      LIMIT 1
    `

    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return NextResponse.json({
        sectionOrder: ['hotLeads', 'warmLeads', 'upcomingCalls', 'allBookedCalls', 'recentActivity', 'leadStatusBuckets', 'sentimentAnalysis', 'statusBreakdown', 'archivedLeads'],
        sectionsExpanded: {
          hotLeads: true,
          warmLeads: true,
          upcomingCalls: true,
          allBookedCalls: true,
          recentActivity: true,
          leadStatusBuckets: true,
          sentimentAnalysis: true,
          statusBreakdown: true,
          archivedLeads: false,
        },
        sectionsVisible: {
          hotLeads: true,
          warmLeads: true,
          upcomingCalls: true,
          allBookedCalls: true,
          recentActivity: true,
          leadStatusBuckets: true,
          sentimentAnalysis: true,
          statusBreakdown: true,
          archivedLeads: true,
        },
        defaultTimeRange: 'all',
        autoRefreshEnabled: true,
        autoRefreshInterval: 30,
        visibleMetricCards: ['totalLeads', 'messagesSent', 'replyRate', 'hotLeads', 'avgResponse', 'callsBooked', 'upcomingCalls'],
        isDefault: true,
      })
    }

    const prefs = result.rows[0]

    return NextResponse.json({
      sectionOrder: prefs.section_order,
      sectionsExpanded: prefs.sections_expanded,
      sectionsVisible: prefs.sections_visible,
      defaultTimeRange: prefs.default_time_range,
      autoRefreshEnabled: prefs.auto_refresh_enabled,
      autoRefreshInterval: prefs.auto_refresh_interval,
      visibleMetricCards: prefs.visible_metric_cards,
      updatedAt: prefs.updated_at,
      isDefault: false,
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// POST - Save user preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()

    const {
      sectionOrder,
      sectionsExpanded,
      sectionsVisible,
      defaultTimeRange,
      autoRefreshEnabled,
      autoRefreshInterval,
      visibleMetricCards,
    } = body

    // Upsert preferences
    await sql`
      INSERT INTO user_preferences (
        user_id,
        section_order,
        sections_expanded,
        sections_visible,
        default_time_range,
        auto_refresh_enabled,
        auto_refresh_interval,
        visible_metric_cards
      )
      VALUES (
        ${userId},
        ${sectionOrder || null},
        ${JSON.stringify(sectionsExpanded) || null},
        ${JSON.stringify(sectionsVisible) || null},
        ${defaultTimeRange || 'all'},
        ${autoRefreshEnabled !== undefined ? autoRefreshEnabled : true},
        ${autoRefreshInterval !== undefined ? autoRefreshInterval : 30},
        ${visibleMetricCards || null}
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        section_order = COALESCE(${sectionOrder || null}, user_preferences.section_order),
        sections_expanded = COALESCE(${JSON.stringify(sectionsExpanded) || null}::jsonb, user_preferences.sections_expanded),
        sections_visible = COALESCE(${JSON.stringify(sectionsVisible) || null}::jsonb, user_preferences.sections_visible),
        default_time_range = COALESCE(${defaultTimeRange || null}, user_preferences.default_time_range),
        auto_refresh_enabled = COALESCE(${autoRefreshEnabled !== undefined ? autoRefreshEnabled : null}, user_preferences.auto_refresh_enabled),
        auto_refresh_interval = COALESCE(${autoRefreshInterval !== undefined ? autoRefreshInterval : null}, user_preferences.auto_refresh_interval),
        visible_metric_cards = COALESCE(${visibleMetricCards || null}, user_preferences.visible_metric_cards),
        updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({ success: true, message: 'Preferences saved successfully' })
  } catch (error) {
    console.error('Error saving user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
