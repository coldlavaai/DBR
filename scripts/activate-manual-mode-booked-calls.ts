import { getGoogleSheetsClient } from '../lib/google-auth'

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

async function activateManualMode() {
  const sheets = getGoogleSheetsClient()

  // Julie Dinmore - Row 209
  // Al Smith - Row 179
  const updates = [
    { row: 209, name: 'Julie Dinmore' },
    { row: 179, name: 'Al Smith' }
  ]

  console.log('🔧 Activating manual mode for booked calls...')

  for (const { row, name } of updates) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `V${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['YES']]
      }
    })
    console.log(`✅ ${name} (row ${row}): Manual Mode = YES`)
  }

  console.log('\n✅ All done!')
}

activateManualMode().catch(console.error)
