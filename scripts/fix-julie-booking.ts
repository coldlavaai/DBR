import { createClient } from '@sanity/client'
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'

const sanityClient = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

function getGoogleSheetsClient() {
  const keyPath = path.join(process.env.HOME!, '.google', 'service-account-key.json')
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

async function fixJulieBooking() {
  const julieId = 'dbr-447925285841'
  const juliePhone = '+447925285841'

  // Set call time to tomorrow (Oct 28, 2025) at 11:00 AM UK time
  const callTime = new Date('2025-10-28T11:00:00+01:00').toISOString()

  console.log('🔧 Fixing Julie Dinmore booking...')
  console.log('📅 Setting callBookedTime to:', callTime)

  // Update Sanity
  await sanityClient
    .patch(julieId)
    .set({
      callBookedTime: callTime,
      lastUpdatedAt: new Date().toISOString()
    })
    .commit()

  console.log('✅ Updated Sanity')

  // Update Google Sheets
  const sheets = getGoogleSheetsClient()

  const phoneWithoutPlus = juliePhone.replace(/\+/g, '')
  const allRows = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'D2:D',
  })

  const rows = allRows.data.values || []
  const rowIndex = rows.findIndex((row: any[]) =>
    row[0] && row[0].replace(/\D/g, '') === phoneWithoutPlus.replace(/\D/g, '')
  )

  if (rowIndex >= 0) {
    const sheetRow = rowIndex + 2
    const callDate = new Date(callTime)
    const formattedTime = `${callDate.getDate().toString().padStart(2, '0')}/${(callDate.getMonth() + 1).toString().padStart(2, '0')}/${callDate.getFullYear()} ${callDate.getHours().toString().padStart(2, '0')}:${callDate.getMinutes().toString().padStart(2, '0')}`

    console.log(`📊 Updating Google Sheets row ${sheetRow} with time: ${formattedTime}`)

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        data: [
          {
            range: `A${sheetRow}`,
            values: [['CALL_BOOKED']]
          },
          {
            range: `X${sheetRow}`,
            values: [[formattedTime]]
          }
        ],
        valueInputOption: 'USER_ENTERED'
      }
    })

    console.log('✅ Updated Google Sheets')
  } else {
    console.error('❌ Julie not found in Google Sheets')
  }

  console.log('✅ All done!')
}

fixJulieBooking().catch(console.error)
