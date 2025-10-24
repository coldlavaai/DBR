import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { google } from 'googleapis'

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
    const { leadId, manualMode } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    console.log(`🔄 Toggling manual mode for lead ${leadId} to ${manualMode}`)

    // Update Sanity
    const updateData: any = {
      manualMode: manualMode === true,
      lastUpdatedAt: new Date().toISOString(),
    }

    if (manualMode === true) {
      updateData.manualModeActivatedAt = new Date().toISOString()
    }

    const updatedLead = await sanityClient
      .patch(leadId)
      .set(updateData)
      .commit()

    console.log(`✅ Updated Sanity for lead ${leadId}`)

    // Update Google Sheets
    try {
      // Get the lead's phone number to find the row
      const lead = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id == $leadId][0]{ phoneNumber, rowNumber }`,
        { leadId }
      )

      if (lead?.rowNumber) {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const sheets = google.sheets({ version: 'v4', auth })

        // Column V (column 22) for Manual_Mode
        const rowIndex = lead.rowNumber + 1 // +1 because row numbers are 1-indexed and we have a header
        const range = `V${rowIndex}` // Column V

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[manualMode ? 'YES' : 'NO']],
          },
        })

        console.log(`✅ Updated Google Sheet row ${rowIndex} with manual mode: ${manualMode ? 'YES' : 'NO'}`)
      } else {
        console.warn(`⚠️ No row number found for lead ${leadId}, skipping Google Sheets update`)
      }
    } catch (sheetsError) {
      console.error('Error updating Google Sheets:', sheetsError)
      // Don't fail the entire request if sheets update fails
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead,
      manualMode: manualMode === true,
    })
  } catch (error) {
    console.error('Error toggling manual mode:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
