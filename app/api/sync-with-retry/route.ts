import { NextResponse } from 'next/server'

// Force dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * RESILIENT SYNC ENDPOINT WITH AUTOMATIC RETRY
 *
 * This endpoint orchestrates the entire sync pipeline with retry logic:
 * 1. Cal.com → Google Sheets (retry up to 3 times)
 * 2. Google Sheets → Sanity (retry up to 3 times)
 * 3. Verify sync succeeded
 *
 * If any step fails, it retries with exponential backoff.
 * If all retries fail, logs error and returns partial success info.
 */

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  taskName: string = 'operation'
): Promise<{ success: boolean; data?: T; error?: string; attempts: number }> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${taskName}] Attempt ${attempt}/${maxRetries}`)
      const result = await fn()
      console.log(`[${taskName}] ✅ Success on attempt ${attempt}`)
      return { success: true, data: result, attempts: attempt }
    } catch (error) {
      lastError = error
      console.error(`[${taskName}] ❌ Failed attempt ${attempt}:`, error)

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`[${taskName}] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    attempts: maxRetries
  }
}

async function fetchWithTimeout(url: string, options: any = {}, timeout: number = 120000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET() {
  const startTime = Date.now()
  const results: any = {
    timestamp: new Date().toISOString(),
    overall: 'success',
    steps: {}
  }

  try {
    console.log('🔄 Starting resilient sync pipeline...')

    // STEP 1: Sync Cal.com bookings to Google Sheets
    console.log('\n📅 STEP 1: Syncing Cal.com → Google Sheets...')
    const calSyncResult = await retryWithBackoff(
      async () => {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3001'

        const response = await fetchWithTimeout(`${baseUrl}/api/sync-calcom-bookings`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        return await response.json()
      },
      3,
      2000,
      'Cal.com Sync'
    )

    results.steps.calComSync = calSyncResult

    if (!calSyncResult.success) {
      results.overall = 'partial'
      console.warn('⚠️  Cal.com sync failed after retries, continuing with Sheets sync...')
    }

    // Wait 2 seconds for Google Sheets to process updates
    await new Promise(resolve => setTimeout(resolve, 2000))

    // STEP 2: Sync Google Sheets to Sanity
    console.log('\n📋 STEP 2: Syncing Google Sheets → Sanity...')
    const sheetsSyncResult = await retryWithBackoff(
      async () => {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3001'

        const response = await fetchWithTimeout(`${baseUrl}/api/sync-sheets`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        return await response.json()
      },
      3,
      2000,
      'Sheets Sync'
    )

    results.steps.sheetsSync = sheetsSyncResult

    if (!sheetsSyncResult.success) {
      results.overall = 'failed'
      console.error('❌ Google Sheets sync failed after retries')
    }

    // STEP 3: Verify sync health
    console.log('\n🏥 STEP 3: Verifying sync health...')
    const healthCheckResult = await retryWithBackoff(
      async () => {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3001'

        const response = await fetchWithTimeout(`${baseUrl}/api/health`, {
          method: 'GET'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const health = await response.json()

        if (health.overall !== 'healthy') {
          throw new Error(`Health check failed: ${health.overall}`)
        }

        return health
      },
      2,
      1000,
      'Health Check'
    )

    results.steps.healthCheck = healthCheckResult

    if (!healthCheckResult.success) {
      results.overall = 'degraded'
      console.warn('⚠️  Health check failed, but sync may have succeeded')
    }

    // Calculate total duration
    const duration = Date.now() - startTime
    results.duration = `${duration}ms`

    // Final status
    console.log(`\n✅ Sync pipeline completed: ${results.overall}`)
    console.log(`⏱️  Total duration: ${duration}ms`)

    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ Sync pipeline fatal error:', error)

    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'failed',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        steps: results.steps
      },
      { status: 500 }
    )
  }
}
