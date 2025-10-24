import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

export async function POST(request: Request) {
  try {
    const { leadId, notes, phoneNumber } = await request.json()

    if (!leadId || !notes || !phoneNumber) {
      return NextResponse.json(
        { error: 'Lead ID, notes, and phone number are required' },
        { status: 400 }
      )
    }

    console.log(`📝 Updating notes for lead ${leadId}`)

    // Update Sanity
    await sanityClient
      .patch(leadId)
      .set({
        notes,
        lastUpdatedAt: new Date().toISOString(),
      })
      .commit()

    console.log(`✅ Updated Sanity notes for lead ${leadId}`)

    // Update Google Sheets (column K = index 10)
    try {
      const sheets = getGoogleSheetsClient()

      // Search for the phone number in column D (index 3)
      const phoneWithoutPlus = phoneNumber.replace(/\+/g, '')
      const allRows = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'D2:D', // Column D (Phone_number) from row 2 onwards
      })

      const rows = allRows.data.values || []
      const rowIndex = rows.findIndex((row: any[]) =>
        row[0] && row[0].replace(/\D/g, '') === phoneWithoutPlus.replace(/\D/g, '')
      )

      if (rowIndex >= 0) {
        const sheetRow = rowIndex + 2 // +2 because we start from row 2 and arrays are 0-indexed
        const range = `K${sheetRow}` // Column K = Notes

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[notes]],
          },
        })

        console.log(`✅ Updated Google Sheets notes for row ${sheetRow}`)
      } else {
        console.warn(`⚠️ Phone number ${phoneNumber} not found in Google Sheets`)
      }
    } catch (sheetsError) {
      console.error('⚠️ Failed to update Google Sheets notes:', sheetsError)
      // Don't fail the request if Sheets update fails
    }

    return NextResponse.json({
      success: true,
      notes,
    })
  } catch (error) {
    console.error('Error updating notes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
