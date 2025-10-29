import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'
export const maxDuration = 300

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    services: {}
  }

  try {
    // 1. Check Google Sheets API
    try {
      const sheets = getGoogleSheetsClient()
      const startTime = Date.now()
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'A1:A2',
      })
      const latency = Date.now() - startTime

      checks.services.googleSheets = {
        status: 'healthy',
        latency: `${latency}ms`,
        rowsAccessible: response.data.values?.length || 0
      }
    } catch (error) {
      checks.services.googleSheets = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.overall = 'degraded'
    }

    // 2. Check Sanity Database
    try {
      const startTime = Date.now()
      const syncMeta = await sanityClient.fetch(
        `*[_id == "syncMetadata"][0]{ lastSyncTimestamp, lastSyncStats }`
      )
      const leadCount = await sanityClient.fetch(`count(*[_type == "dbrLead"])`)
      const latency = Date.now() - startTime

      checks.services.sanity = {
        status: 'healthy',
        latency: `${latency}ms`,
        totalLeads: leadCount,
        lastSync: syncMeta?.lastSyncTimestamp || 'never',
        lastSyncStats: syncMeta?.lastSyncStats
      }
    } catch (error) {
      checks.services.sanity = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.overall = 'degraded'
    }

    // 3. Check Cal.com API
    try {
      const CAL_API_KEY = 'cal_live_932f5eaefdad7c1eb6cbf62799057315'
      const EVENT_TYPE_ID = '3721996'

      const startTime = Date.now()
      const response = await fetch(
        `https://api.cal.com/v2/bookings?eventTypeIds=${EVENT_TYPE_ID}&status=upcoming&sortStart=asc&take=1`,
        {
          headers: {
            'Authorization': `Bearer ${CAL_API_KEY}`,
            'cal-api-version': '2024-08-13'
          }
        }
      )
      const latency = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        checks.services.calCom = {
          status: 'healthy',
          latency: `${latency}ms`,
          upcomingBookings: data.data?.length || 0
        }
      } else {
        checks.services.calCom = {
          status: 'unhealthy',
          httpStatus: response.status
        }
        checks.overall = 'degraded'
      }
    } catch (error) {
      checks.services.calCom = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      checks.overall = 'degraded'
    }

    // 4. Check sync timing
    try {
      const syncMeta = await sanityClient.fetch(
        `*[_id == "syncMetadata"][0]{ lastSyncTimestamp }`
      )

      if (syncMeta?.lastSyncTimestamp) {
        const lastSync = new Date(syncMeta.lastSyncTimestamp)
        const now = new Date()
        const minutesSinceSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000)

        checks.syncHealth = {
          lastSync: syncMeta.lastSyncTimestamp,
          minutesAgo: minutesSinceSync,
          status: minutesSinceSync > 5 ? 'stale' : 'recent'
        }

        if (minutesSinceSync > 10) {
          checks.overall = 'degraded'
          checks.syncHealth.warning = 'Sync may be stuck - last sync was over 10 minutes ago'
        }
      } else {
        checks.syncHealth = {
          status: 'unknown',
          warning: 'No sync metadata found'
        }
      }
    } catch (error) {
      checks.syncHealth = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 5. Environment checks
    checks.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      hasGoogleCreds: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasSanityToken: !!process.env.SANITY_API_WRITE_TOKEN,
      hasSanityProject: !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
    }

    return NextResponse.json(checks)

  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
