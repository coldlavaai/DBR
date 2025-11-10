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

// Retry helper function for Google Sheets API calls
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt)) // Exponential backoff
      }
    }
  }
  throw lastError
}

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

    // Update Google Sheets by searching for phone number
    try {
      // Get the lead's phone number and campaign
      const lead = await sanityClient.fetch(
        `*[_type == "dbrLead" && _id == $leadId][0]{ phoneNumber, campaign }`,
        { leadId }
      )

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
          const range = `${sheetName}!V${sheetRow}` // Column V = Manual_Mode in the correct sheet

          await retryOperation(async () => {
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [[manualMode ? 'YES' : '']],
              },
            })
          })

          console.log(`✅ Updated Google Sheet (${sheetName}) row ${sheetRow} with manual mode: ${manualMode ? 'YES' : 'empty'}`)
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
      manualMode: manualMode === true,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error toggling manual mode:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
