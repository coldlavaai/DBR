import { getGoogleSheetsClient } from '../lib/google-auth'

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'
const sheets = getGoogleSheetsClient()

async function checkJulie() {
  // Get all data including column X
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'A2:X',
  })

  const rows = response.data.values || []

  // Find Julie Dinmore
  const julieRows = rows.filter((row: any[]) =>
    row[1] === 'Julie' && row[2] && row[2].includes('Dinmore')
  )

  console.log(`Found ${julieRows.length} Julie Dinmore records:`)
  julieRows.forEach((row: any[], idx: number) => {
    const rowNum = rows.indexOf(row) + 2
    console.log(`\nRow ${rowNum}:`)
    console.log(`  Status (A): ${row[0]}`)
    console.log(`  Name (B-C): ${row[1]} ${row[2]}`)
    console.log(`  Phone (D): ${row[3]}`)
    console.log(`  Email (E): ${row[4]}`)
    console.log(`  Call Booked Time (X): ${row[23] || '(empty)'}`)
  })

  // Check all phones in column D that match 7925285841
  console.log(`\n\nSearching for phone 7925285841 in column D...`)
  const phoneRows = rows.filter((row: any[], idx: number) => {
    const phone = row[3]
    if (!phone) return false
    const digits = phone.replace(/\D/g, '')
    return digits.includes('7925285841')
  })

  console.log(`Found ${phoneRows.length} matching phone numbers`)
  phoneRows.forEach((row: any[]) => {
    const rowNum = rows.indexOf(row) + 2
    console.log(`  Row ${rowNum}: ${row[3]} (digits: ${row[3]?.replace(/\D/g, '')})`)
  })
}

checkJulie().catch(console.error)
