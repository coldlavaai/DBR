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
    const { leadId, contactStatus } = await request.json()

    if (!leadId || !contactStatus) {
      return NextResponse.json(
        { error: 'Lead ID and contact status are required' },
        { status: 400 }
      )
    }

    console.log(`📊 Updating lead status for ${leadId} to ${contactStatus}`)

    // Update Sanity
    await sanityClient
      .patch(leadId)
      .set({
        contactStatus,
        lastUpdatedAt: new Date().toISOString(),
      })
      .commit()

    console.log(`✅ Updated Sanity contact status for lead ${leadId}`)

    // Get lead data including campaign
    const lead = await sanityClient.fetch(
      `*[_type == "dbrLead" && _id == $leadId][0]{ phoneNumber, campaign }`,
      { leadId }
    )

    // Update Google Sheets Final_status column by searching for phone number
    if (lead?.phoneNumber && lead?.campaign) {
      const sheets = getGoogleSheetsClient()

      // Determine sheet name from campaign
      const sheetName = lead.campaign // 'October' or '10th Nov'

      // Search for the phone number in column D (index 3)
      const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')
      const allRows = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!D2:D`, // Column D (Phone_number) in the correct sheet tab
      })

      const rows = allRows.data.values || []
      const rowIndex = rows.findIndex((row: any[]) =>
        row[0] && row[0].replace(/\D/g, '') === phoneWithoutPlus.replace(/\D/g, '')
      )

      if (rowIndex >= 0) {
        const sheetRow = rowIndex + 2 // +2 because we start from row 2 and arrays are 0-indexed
        const range = `${sheetName}!A${sheetRow}` // Column A = Contact_Status in the correct sheet

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[contactStatus]],
          },
        })

        console.log(`✅ Updated Google Sheets (${sheetName}) Contact_Status for row ${sheetRow} to ${contactStatus}`)
      } else {
        console.warn(`⚠️ Phone number ${lead.phoneNumber} not found in Google Sheets`)
      }
    } else {
      console.warn(`⚠️ No phone number found for lead ${leadId}`)
    }

    return NextResponse.json({
      success: true,
      contactStatus,
    })
  } catch (error) {
    console.error('Error updating lead status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
