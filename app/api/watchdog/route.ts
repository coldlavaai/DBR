import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

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

/**
 * WATCHDOG SERVICE - AUTOMATIC HEALTH MONITORING & RECOVERY
 *
 * This endpoint runs every 5 minutes to:
 * 1. Check if last sync was successful
 * 2. Detect if sync is stuck (>10 minutes old)
 * 3. Automatically trigger recovery sync
 * 4. Log errors to Sanity for visibility
 * 5. Send alerts if system is unhealthy
 */

async function logError(type: string, message: string, details?: any) {
  try {
    await sanityClient.create({
      _type: 'systemError',
      errorType: type,
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false
    })
  } catch (error) {
    console.error('Failed to log error to Sanity:', error)
  }
}

async function sendAlert(issue: string, details: any) {
  console.error(`🚨 ALERT: ${issue}`, details)

  // Log to Sanity
  await logError('WATCHDOG_ALERT', issue, details)

  // TODO: Add email/SMS notification here if critical
  // For now, just console logging - can add Twilio SMS later
}

export async function GET() {
  const watchdogReport: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    actions: [],
    overall: 'healthy'
  }

  try {
    console.log('🐕 Watchdog checking system health...')

    // CHECK 1: Last sync timing
    console.log('⏰ Checking sync timing...')
    const syncMeta = await sanityClient.fetch(
      `*[_id == "syncMetadata"][0]{ lastSyncTimestamp, lastSyncStats }`
    )

    if (syncMeta?.lastSyncTimestamp) {
      const lastSync = new Date(syncMeta.lastSyncTimestamp)
      const now = new Date()
      const minutesSinceSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000)

      watchdogReport.checks.lastSync = {
        timestamp: syncMeta.lastSyncTimestamp,
        minutesAgo: minutesSinceSync,
        status: minutesSinceSync > 10 ? 'STALE' : 'OK'
      }

      // RECOVERY ACTION: Trigger sync if stale
      if (minutesSinceSync > 10) {
        console.warn(`⚠️  Sync is stale (${minutesSinceSync} min old), triggering recovery...`)
        watchdogReport.overall = 'recovering'

        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3001'

          const recoveryResponse = await fetch(`${baseUrl}/api/sync-with-retry`, {
            method: 'GET'
          })

          if (recoveryResponse.ok) {
            const result = await recoveryResponse.json()
            watchdogReport.actions.push({
              action: 'RECOVERY_SYNC_TRIGGERED',
              success: true,
              result
            })
            console.log('✅ Recovery sync completed successfully')
          } else {
            throw new Error(`Recovery sync failed: HTTP ${recoveryResponse.status}`)
          }
        } catch (error) {
          watchdogReport.actions.push({
            action: 'RECOVERY_SYNC_FAILED',
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
          watchdogReport.overall = 'unhealthy'

          await sendAlert('Recovery sync failed', {
            minutesSinceLastSync: minutesSinceSync,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
    } else {
      watchdogReport.checks.lastSync = {
        status: 'NO_METADATA',
        action: 'First sync needed'
      }
      watchdogReport.overall = 'initializing'

      // Trigger initial sync
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3001'

        await fetch(`${baseUrl}/api/sync-with-retry`, { method: 'GET' })
        watchdogReport.actions.push({ action: 'INITIAL_SYNC_TRIGGERED', success: true })
      } catch (error) {
        watchdogReport.actions.push({
          action: 'INITIAL_SYNC_FAILED',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // CHECK 2: Error rate
    console.log('📊 Checking recent errors...')
    const recentErrors = await sanityClient.fetch(
      `*[_type == "systemError" && timestamp > $since && resolved != true] | order(timestamp desc) [0...10]`,
      { since: new Date(Date.now() - 3600000).toISOString() } // Last hour
    )

    watchdogReport.checks.recentErrors = {
      count: recentErrors.length,
      status: recentErrors.length > 5 ? 'HIGH_ERROR_RATE' : 'OK'
    }

    if (recentErrors.length > 5) {
      watchdogReport.overall = 'degraded'
      await sendAlert('High error rate detected', {
        errorCount: recentErrors.length,
        timeWindow: '1 hour'
      })
    }

    // CHECK 3: Lead count sanity check
    console.log('📈 Checking lead count...')
    const leadCount = await sanityClient.fetch(`count(*[_type == "dbrLead"])`)

    watchdogReport.checks.leadCount = {
      total: leadCount,
      status: leadCount > 0 ? 'OK' : 'EMPTY_DATABASE'
    }

    if (leadCount === 0) {
      watchdogReport.overall = 'critical'
      await sendAlert('Database is empty', { leadCount: 0 })

      // Trigger emergency recovery
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3001'

        await fetch(`${baseUrl}/api/sync-with-retry`, { method: 'GET' })
        watchdogReport.actions.push({ action: 'EMERGENCY_SYNC_TRIGGERED', success: true })
      } catch (error) {
        watchdogReport.actions.push({
          action: 'EMERGENCY_SYNC_FAILED',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    console.log(`🐕 Watchdog report: ${watchdogReport.overall}`)

    return NextResponse.json(watchdogReport)

  } catch (error) {
    console.error('❌ Watchdog error:', error)

    await sendAlert('Watchdog service failed', {
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'watchdog_failed',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
