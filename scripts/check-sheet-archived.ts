import { getGoogleSheetsClient } from '../lib/google-auth'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

async function checkSheetArchived() {
  try {
    const sheets = getGoogleSheetsClient()

    // Get phone numbers and archived status
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:Z', // Get all columns including Z (Archived)
    })

    const rows = response.data.values || []

    console.log('\n📊 Checking Google Sheets for archived leads...\n')

    // Find Rob Johnson
    const robJohnsonPhone = '7909225284' // Without country code
    const foundRows: any[] = []

    rows.forEach((row, index) => {
      const phoneNumber = row[3] // Column D
      const firstName = row[1] // Column B
      const secondName = row[2] // Column C
      const archived = row[25] // Column Z (index 25)

      if (phoneNumber && phoneNumber.replace(/\D/g, '').includes(robJohnsonPhone)) {
        foundRows.push({
          row: index + 2, // +2 because we start from row 2
          firstName,
          secondName,
          phoneNumber,
          archived: archived || 'NOT SET',
          contactStatus: row[0] // Column A
        })
      }
    })

    if (foundRows.length > 0) {
      console.log('✅ Found Rob Johnson in sheet:')
      foundRows.forEach(lead => {
        console.log(`\nRow ${lead.row}: ${lead.firstName} ${lead.secondName}`)
        console.log(`Phone: ${lead.phoneNumber}`)
        console.log(`Status: ${lead.contactStatus}`)
        console.log(`Archived (Column Z): "${lead.archived}"`)
      })
    } else {
      console.log('❌ Rob Johnson not found in sheet')
    }

    // Also check for any other rows with "Yes" in column Z
    console.log('\n\n📦 All archived leads in sheet (Column Z = "Yes"):')
    let archivedCount = 0
    rows.forEach((row, index) => {
      const archived = row[25] // Column Z
      if (archived && archived.toUpperCase() === 'YES') {
        archivedCount++
        console.log(`\nRow ${index + 2}: ${row[1]} ${row[2]} (${row[3]})`)
        console.log(`Status: ${row[0]}`)
      }
    })

    if (archivedCount === 0) {
      console.log('No leads with "Yes" in column Z')
    } else {
      console.log(`\nTotal: ${archivedCount} archived leads`)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkSheetArchived()
