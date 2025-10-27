import { getGoogleSheetsClient } from '../lib/google-auth'

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

async function checkAlSmith() {
  const sheets = getGoogleSheetsClient()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A2:X',
  })

  const rows = response.data.values || []
  
  // Find Al Smith by phone
  const alRows = rows.filter((row: any[]) => {
    const phone = row[3]
    if (!phone) return false
    const digits = phone.replace(/\D/g, '')
    return digits === '447772897016'
  })

  if (alRows.length === 0) {
    console.log('❌ Al Smith not found in Google Sheets!')
    return
  }

  console.log(`Found ${alRows.length} Al Smith record(s):`)
  alRows.forEach((row: any[]) => {
    const rowNum = rows.indexOf(row) + 2
    console.log(`\nRow ${rowNum}:`)
    console.log(`  Status (A): ${row[0]}`)
    console.log(`  Name (B-C): ${row[1]} ${row[2]}`)
    console.log(`  Phone (D): ${row[3]}`)
    console.log(`  Email (E): ${row[4]}`)
    console.log(`  Call Booked Time (X): "${row[23] || '(empty)'}"`)
  })
}

checkAlSmith().catch(console.error)
