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

    // Sync to Google Sheets (Column W - Featured)
    try {
      const lead = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id == $leadId][0] {
          phoneNumber
        }`,
        { leadId }
      )

      if (lead?.phoneNumber) {
        const sheets = getGoogleSheetsClient()

        // Get all phone numbers from the sheet to find the row
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'A2:A',
        })

        const phoneNumbers = response.data.values || []
        const normalizedPhone = lead.phoneNumber.replace(/\D/g, '')

        const rowIndex = phoneNumbers.findIndex(
          row => row[0] && row[0].toString().replace(/\D/g, '') === normalizedPhone
        )

        if (rowIndex !== -1) {
          const sheetRow = rowIndex + 2 // +2 because array is 0-indexed and sheet starts at row 2

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `W${sheetRow}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[starred ? 'TRUE' : 'FALSE']]
            }
          })

          console.log(`✅ Updated Google Sheets row ${sheetRow}, Column W (Featured) = ${starred}`)
        } else {
          console.warn(`⚠️ Phone number ${normalizedPhone} not found in Google Sheet`)
        }
      }
    } catch (error) {
      console.error('Error syncing starred to Google Sheets:', error)
      // Don't fail the request if Google Sheets sync fails
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
