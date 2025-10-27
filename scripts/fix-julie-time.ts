import { getGoogleSheetsClient } from '../lib/google-auth'

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'
const JULIE_ROW = 209
const CORRECT_TIME = '28/10/2025 11:00'

async function fixJulieTime() {
  console.log(`🔧 Fixing Julie's call time in Google Sheets...`)
  console.log(`📅 Setting to: ${CORRECT_TIME}`)

  const sheets = getGoogleSheetsClient()

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `X${JULIE_ROW}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[CORRECT_TIME]]
    }
  })

  console.log(`✅ Updated row ${JULIE_ROW} column X to ${CORRECT_TIME}`)

  // Verify
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `A${JULIE_ROW}:X${JULIE_ROW}`,
  })

  const row = response.data.values?.[0]
  console.log(`\n📋 Verified:`)
  console.log(`  Name: ${row?.[1]} ${row?.[2]}`)
  console.log(`  Status: ${row?.[0]}`)
  console.log(`  Call Time: ${row?.[23]}`)
}

fixJulieTime().catch(console.error)
