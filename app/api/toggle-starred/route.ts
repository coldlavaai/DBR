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
    const { leadId, starred } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    console.log(`⭐ Toggling starred for lead ${leadId} to ${starred}`)

    // Update Sanity
    const updateData: any = {
      starred: starred === true,
      lastUpdatedAt: new Date().toISOString(),
    }

    const updatedLead = await sanityClient
      .patch(leadId)
      .set(updateData)
      .commit()

    console.log(`✅ Updated Sanity for lead ${leadId}`)

    // Update Google Sheets by searching for phone number
    try {
      // Get the lead's phone number
      const lead = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id == $leadId][0]{ phoneNumber }`,
        { leadId }
      )

      if (lead?.phoneNumber) {
        const sheets = getGoogleSheetsClient()

        // Search for the phone number in column D (index 3)
        const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')
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
          const range = `W${sheetRow}` // Column W = Starred

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[starred ? 'YES' : '']],
            },
          })

          console.log(`✅ Updated Google Sheet row ${sheetRow} with starred: ${starred ? 'YES' : 'empty'}`)
        } else {
          console.warn(`⚠️ Phone number ${lead.phoneNumber} not found in Google Sheets`)
        }
      } else {
        console.warn(`⚠️ No phone number found for lead ${leadId}`)
      }
    } catch (sheetsError) {
      console.error('Error updating Google Sheets:', sheetsError)
      // Don't fail the entire request if sheets update fails
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      starred: starred === true,
    })
  } catch (error) {
    console.error('Error toggling starred:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
