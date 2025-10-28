import { getGoogleSheetsClient } from '@/lib/google-auth'

async function checkSheet() {
  const sheets = getGoogleSheetsClient()
  const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

  // Get a few rows to see conversation history format
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A2:O20', // First 18 leads with conversation history column
  })

  const rows = response.data.values || []

  console.log('=== CHECKING CONVERSATION HISTORY FORMAT ===\n')

  let foundCount = 0
  rows.forEach((row, i) => {
    const firstName = row[1]
    const lastName = row[2]
    const conversationHistory = row[14] // Column O

    if (conversationHistory && conversationHistory.trim()) {
      foundCount++
      console.log(`\n--- Lead ${i + 1}: ${firstName} ${lastName} ---`)
      console.log('Raw (JSON escaped):')
      console.log(JSON.stringify(conversationHistory))
      console.log('\nFormatted display:')
      console.log(conversationHistory)
      console.log('---')

      if (foundCount >= 3) {
        console.log('\n... (showing first 3 with conversation history)')
        return
      }
    }
  })

  if (foundCount === 0) {
    console.log('No leads found with conversation history in first 18 rows')
  }
}

checkSheet().catch(console.error)
