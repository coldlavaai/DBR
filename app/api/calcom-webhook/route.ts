import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('📅 Cal.com webhook received:', JSON.stringify(payload, null, 2))

    // Cal.com sends booking data with attendees
    const { triggerEvent, payload: bookingData } = payload

    // Only process booking.created events
    if (triggerEvent !== 'BOOKING_CREATED') {
      return NextResponse.json({ message: 'Event type not processed' })
    }

    // Extract attendee information
    const attendees = bookingData?.responses?.email || bookingData?.attendees || []
    const attendeeEmail = Array.isArray(attendees) ? attendees[0]?.email : attendees?.email
    const attendeeName = Array.isArray(attendees) ? attendees[0]?.name : attendees?.name
    const attendeePhone = bookingData?.responses?.phone || bookingData?.responses?.['Phone Number']
    const bookingStartTime = bookingData?.startTime || bookingData?.start || new Date().toISOString()

    console.log(`📞 New booking from: ${attendeeName} (${attendeeEmail}, ${attendeePhone})`)
    console.log(`🕐 Booking time: ${bookingStartTime}`)

    if (!attendeeEmail && !attendeePhone) {
      console.warn('⚠️ No email or phone in booking')
      return NextResponse.json({ message: 'No contact info in booking' })
    }

    // Search for lead in Sanity by email or phone
    let lead = null

    if (attendeeEmail) {
      const emailQuery = `*[_type == "dbrLead" && emailAddress == $email][0]`
      lead = await sanityClient.fetch(emailQuery, { email: attendeeEmail })
    }

    if (!lead && attendeePhone) {
      // Normalize phone numbers for comparison
      const normalizedPhone = attendeePhone.replace(/\D/g, '')
      const phoneQuery = `*[_type == "dbrLead" && phoneNumber match "*${normalizedPhone}*"][0]`
      lead = await sanityClient.fetch(phoneQuery)
    }

    if (lead) {
      console.log(`✅ Found lead in database: ${lead.firstName} ${lead.secondName}`)

      // Update lead status to CALL_BOOKED
      await sanityClient
        .patch(lead._id)
        .set({
          contactStatus: 'CALL_BOOKED',
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

      console.log(`✅ Updated lead ${lead._id} status to CALL_BOOKED`)

      // Update Google Sheets
      if (lead.phoneNumber) {
        const sheets = getGoogleSheetsClient()
        const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')
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

          // Update both Contact_Status (column A) and call_booked (column X)
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              valueInputOption: 'USER_ENTERED',
              data: [
                {
                  range: `A${sheetRow}`,
                  values: [['CALL_BOOKED']],
                },
                {
                  range: `X${sheetRow}`,
                  values: [[bookingStartTime]],
                },
              ],
            },
          })

          console.log(`✅ Updated Google Sheets row ${sheetRow}: Status=CALL_BOOKED, Time=${bookingStartTime}`)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Lead ${lead.firstName} ${lead.secondName} marked as CALL_BOOKED`,
      })
    } else {
      console.warn(`⚠️ No matching lead found for ${attendeeEmail || attendeePhone}`)
      return NextResponse.json({
        success: false,
        message: 'No matching lead found in database',
      })
    }
  } catch (error) {
    console.error('Error processing Cal.com webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
