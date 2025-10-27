import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '../lib/google-auth'

const sanityClient = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  token: process.env.SANITY_API_WRITE_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

function getBritishTimezoneOffset(year: number, month: number, day: number): string {
  const marchLast = new Date(Date.UTC(year, 2, 31))
  const marchLastSunday = 31 - marchLast.getUTCDay()
  const bstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0))

  const octoberLast = new Date(Date.UTC(year, 9, 31))
  const octoberLastSunday = 31 - octoberLast.getUTCDay()
  const bstEnd = new Date(Date.UTC(year, 9, octoberLastSunday, 1, 0, 0))

  const dateToCheck = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const isBST = dateToCheck >= bstStart && dateToCheck < bstEnd

  return isBST ? '+01:00' : '+00:00'
}

function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('-')) || dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
      return dateStr
    }

    const match1 = dateStr.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match1) {
      const [, hours, minutes, day, month, year] = match1
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (match2) {
      const [, day, month, year, hours, minutes] = match2
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const match3 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match3) {
      const [, day, month, year] = match3
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

async function syncJulie() {
  console.log('🔄 Syncing Julie from Google Sheets to Sanity...')

  const sheets = getGoogleSheetsClient()

  // Get Julie's row (row 209)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A209:X209',
  })

  const row = response.data.values?.[0]
  if (!row) {
    console.error('❌ Could not find Julie in row 209')
    return
  }

  console.log(`📊 Raw data from sheet:`)
  console.log(`  Status (A): ${row[0]}`)
  console.log(`  Name: ${row[1]} ${row[2]}`)
  console.log(`  Phone (D): ${row[3]}`)
  console.log(`  Call Time (X / row[23]): "${row[23]}"`)

  const callBookedTimeRaw = row[23]
  const callBookedTime = parseDateTime(callBookedTimeRaw)

  console.log(`📅 Parsed callBookedTime: ${callBookedTime}`)

  if (!callBookedTime) {
    console.error('❌ Failed to parse call booked time!')
    return
  }

  // Update Sanity
  const julieId = 'dbr-447925285841'

  console.log(`📝 Updating Sanity document ${julieId}...`)

  await sanityClient
    .patch(julieId)
    .set({
      callBookedTime: callBookedTime,
      lastSyncedAt: new Date().toISOString(),
    })
    .commit()

  console.log('✅ Julie synced successfully!')

  // Verify
  const updated = await sanityClient.fetch(
    `*[_id == $id][0]{ _id, firstName, secondName, contactStatus, callBookedTime }`,
    { id: julieId }
  )

  console.log('\n📋 Verified in Sanity:')
  console.log(JSON.stringify(updated, null, 2))
}

syncJulie().catch(console.error)
