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
    const { leadId, phoneNumber } = await request.json()

    if (!leadId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Lead ID and phone number are required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting lead ${leadId} (${phoneNumber})`)

    // Delete from Sanity
    await sanityClient.delete(leadId)
    console.log(`✅ Deleted lead from Sanity: ${leadId}`)

    // Delete from Google Sheets
    try {
      const sheets = getGoogleSheetsClient()

      // Search for the phone number in column D
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

        // Delete the row from Google Sheets
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: 0, // Assuming the data is on the first sheet
                    dimension: 'ROWS',
                    startIndex: sheetRow - 1, // 0-indexed
                    endIndex: sheetRow, // Exclusive end
                  },
                },
              },
            ],
          },
        })

        console.log(`✅ Deleted row ${sheetRow} from Google Sheets`)
      } else {
        console.warn(`⚠️ Phone number ${phoneNumber} not found in Google Sheets`)
      }
    } catch (sheetsError) {
      console.error('⚠️ Failed to delete from Google Sheets:', sheetsError)
      // Don't fail the request if Sheets deletion fails - lead is already deleted from Sanity
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
