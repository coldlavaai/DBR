import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

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
    const { leadId, archived } = await request.json()

    if (!leadId || typeof archived !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid request. leadId and archived (boolean) are required.' },
        { status: 400 }
      )
    }

    console.log(`📦 ${archived ? 'Archiving' : 'Unarchiving'} lead ${leadId}`)

    // Update the lead's archived status
    const updateData: any = { archived }

    // If archiving, set the timestamp; if unarchiving, clear it
    if (archived) {
      updateData.archivedAt = new Date().toISOString()
    } else {
      updateData.archivedAt = null
    }

    await sanityClient
      .patch(leadId)
      .set(updateData)
      .commit()

    console.log(`✅ Updated Sanity archived status for lead ${leadId}`)

    // Get lead phone number to update Google Sheets
    const lead = await sanityClient.fetch(
      `*[_type == "dbrLead" && _id == $leadId][0]{ phoneNumber }`,
      { leadId }
    )

    // Update Google Sheets column Z (Archived)
    if (lead?.phoneNumber) {
      const sheets = getGoogleSheetsClient()

      // Search for the phone number in column D (Phone_number)
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
        const range = `Z${sheetRow}` // Column Z = Archived

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[archived ? 'Yes' : 'No']],
          },
        })

        console.log(`✅ Updated Google Sheets Archived column for row ${sheetRow} to ${archived ? 'Yes' : 'No'}`)
      } else {
        console.warn(`⚠️ Phone number ${lead.phoneNumber} not found in Google Sheets`)
      }
    } else {
      console.warn(`⚠️ No phone number found for lead ${leadId}`)
    }

    return NextResponse.json({
      success: true,
      message: archived ? 'Lead archived successfully' : 'Lead unarchived successfully',
      leadId,
      archived
    })
  } catch (error) {
    console.error('Error archiving lead:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive lead'
      },
      { status: 500 }
    )
  }
}
