import { getGoogleSheetsClient } from '../lib/google-auth'

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'
const AL_SMITH_ROW = 179

// UTC: 2025-10-30T09:15:00.000Z
// UK GMT: 30/10/2025 09:15 (GMT = UTC+0)
const CORRECT_TIME = '30/10/2025 09:15'

async function fixAlSmithTime() {
  console.log(`🔧 Fixing Al Smith's call time in Google Sheets...`)
  console.log(`📅 Setting to: ${CORRECT_TIME}`)

  const sheets = getGoogleSheetsClient()

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `X${AL_SMITH_ROW}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[CORRECT_TIME]]
    }
  })

  console.log(`✅ Updated row ${AL_SMITH_ROW} column X to ${CORRECT_TIME}`)

  // Verify
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `A${AL_SMITH_ROW}:X${AL_SMITH_ROW}`,
  })

  const row = response.data.values?.[0]
  console.log(`\n📋 Verified:`)
  console.log(`  Name: ${row?.[1]} ${row?.[2]}`)
  console.log(`  Status: ${row?.[0]}`)
  console.log(`  Call Time: ${row?.[23]}`)
}

fixAlSmithTime().catch(console.error)
