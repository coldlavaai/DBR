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
    const body = await request.json()
    console.log('📅 Cal.com webhook received:', JSON.stringify(body, null, 2))

    const { triggerEvent, payload } = body

    // Handle BOOKING_CREATED event
    if (triggerEvent === 'BOOKING_CREATED') {
      const {
        startTime,
        attendees,
        responses,
      } = payload

      const attendee = attendees?.[0]
      const email = attendee?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone || responses?.['Phone Number']
      const name = attendee?.name || responses?.name

      console.log('🔍 Looking for lead with email:', email, 'or phone:', phone)

      if (!email && !phone) {
        console.log('⚠️  No email or phone in webhook')
        return NextResponse.json({ received: true, skipped: 'no contact info' })
      }

      // Search for lead by phone or email
      let leadQuery = `*[_type == "dbrLead" && (`
      const params: any = {}

      if (phone) {
        const normalizedPhone = phone.replace(/[^\d+]/g, '')
        leadQuery += `phoneNumber == $phone`
        params.phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`
      }

      if (email) {
        if (phone) leadQuery += ` || `
        leadQuery += `emailAddress == $email`
        params.email = email
      }

      leadQuery += `)][0] { _id, firstName, secondName, phoneNumber, emailAddress, rowNumber }`

      const lead = await sanityClient.fetch(leadQuery, params)

      if (!lead) {
        console.log('⚠️  No lead found for email:', email, 'phone:', phone)
        return NextResponse.json({
          received: true,
          skipped: 'lead not found',
          searched: { email, phone }
        })
      }

      console.log('✅ Found lead:', lead._id, lead.firstName, lead.secondName)

      // Update lead in Sanity
      await sanityClient
        .patch(lead._id)
        .set({
          contactStatus: 'CALL_BOOKED',
          callBookedTime: startTime,
          notes: `Call booked via Cal.com${name ? ` with ${name}` : ''} on ${new Date(startTime).toLocaleDateString()}`,
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

      console.log('✅ Lead updated in Sanity:', lead._id)

      // Update Google Sheet - search by phone number
      try {
        const sheets = getGoogleSheetsClient()

        console.log('📊 Searching Google Sheet for lead phone:', lead.phoneNumber)

        // Get all phone numbers from column D
        const phoneColumnData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'D2:D',
        })

        const rows = phoneColumnData.data.values || []
        const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')
        const digitsOnly = phoneWithoutPlus.replace(/\D/g, '')

        console.log('🔎 Searching for digits:', digitsOnly, '(from', lead.phoneNumber, ')')
        console.log('📋 Searching through', rows.length, 'phone numbers in sheet')

        // Log first 5 phone numbers for debugging
        console.log('📱 Sample sheet phones:', rows.slice(0, 5).map((r: any[]) => r[0]))

        // Find the row index by matching phone number (without +)
        const rowIndex = rows.findIndex((row: any[], index: number) => {
          if (!row[0]) return false
          const sheetDigits = row[0].replace(/\D/g, '')
          const matches = sheetDigits === digitsOnly
          if (matches) {
            console.log(`✓ Match found at index ${index}: sheet="${row[0]}" (digits: ${sheetDigits}) === lead="${lead.phoneNumber}" (digits: ${digitsOnly})`)
          }
          return matches
        })

        if (rowIndex >= 0) {
          const sheetRow = rowIndex + 2 // +2 because row 1 is headers, array is 0-indexed

          const callDate = new Date(startTime)
          const formattedTime = `${callDate.getDate().toString().padStart(2, '0')}/${(callDate.getMonth() + 1).toString().padStart(2, '0')}/${callDate.getFullYear()} ${callDate.getHours().toString().padStart(2, '0')}:${callDate.getMinutes().toString().padStart(2, '0')}`

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
              valueInputOption: 'RAW'
            }
          })

          console.log('✅ Google Sheet updated: row', sheetRow, 'phone:', phoneWithoutPlus)
        } else {
          console.log('⚠️  Could not find phone', digitsOnly, 'in Google Sheet (searched', rows.length, 'rows)')
          // Log all sheet phone digits for comparison
          console.log('🔍 All sheet phone digits:', rows.map((r: any[]) => r[0] ? r[0].replace(/\D/g, '') : 'empty').join(', '))
        }
      } catch (sheetsError) {
        console.error('⚠️  Failed to update Google Sheet:', sheetsError)
      }

      return NextResponse.json({
        success: true,
        leadId: lead._id,
        leadName: `${lead.firstName} ${lead.secondName}`,
        callTime: startTime
      })
    }

    // Handle BOOKING_RESCHEDULED event
    if (triggerEvent === 'BOOKING_RESCHEDULED') {
      const { startTime, attendees, responses } = payload

      const email = attendees?.[0]?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone || responses?.['Phone Number']

      if (!email && !phone) {
        return NextResponse.json({ received: true, skipped: 'no contact info' })
      }

      let leadQuery = `*[_type == "dbrLead" && (`
      const params: any = {}

      if (phone) {
        const normalizedPhone = phone.replace(/[^\d+]/g, '')
        leadQuery += `phoneNumber == $phone`
        params.phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`
      }

      if (email) {
        if (phone) leadQuery += ` || `
        leadQuery += `emailAddress == $email`
        params.email = email
      }

      leadQuery += `)][0] { _id, firstName, secondName, phoneNumber, emailAddress, rowNumber }`

      const lead = await sanityClient.fetch(leadQuery, params)

      if (!lead) {
        return NextResponse.json({ received: true, skipped: 'lead not found' })
      }

      await sanityClient
        .patch(lead._id)
        .set({
          callBookedTime: startTime,
          notes: `Call rescheduled via Cal.com to ${new Date(startTime).toLocaleDateString()} ${new Date(startTime).toLocaleTimeString()}`,
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

      // Update Google Sheet - search by phone number
      try {
        const sheets = getGoogleSheetsClient()

        const phoneColumnData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'D2:D',
        })

        const rows = phoneColumnData.data.values || []
        const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')

        const rowIndex = rows.findIndex((row: any[]) =>
          row[0] && row[0].replace(/\D/g, '') === phoneWithoutPlus.replace(/\D/g, '')
        )

        if (rowIndex >= 0) {
          const sheetRow = rowIndex + 2

          const callDate = new Date(startTime)
          const formattedTime = `${callDate.getDate().toString().padStart(2, '0')}/${(callDate.getMonth() + 1).toString().padStart(2, '0')}/${callDate.getFullYear()} ${callDate.getHours().toString().padStart(2, '0')}:${callDate.getMinutes().toString().padStart(2, '0')}`

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `X${sheetRow}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[formattedTime]]
            }
          })

          console.log('✅ Google Sheet updated with rescheduled time: row', sheetRow)
        }
      } catch (sheetsError) {
        console.error('⚠️  Failed to update Google Sheet:', sheetsError)
      }

      return NextResponse.json({ success: true, leadId: lead._id, rescheduled: true })
    }

    // Handle BOOKING_CANCELLED event
    if (triggerEvent === 'BOOKING_CANCELLED') {
      const { attendees, responses } = payload

      const email = attendees?.[0]?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone || responses?.['Phone Number']

      if (!email && !phone) {
        return NextResponse.json({ received: true, skipped: 'no contact info' })
      }

      let leadQuery = `*[_type == "dbrLead" && (`
      const params: any = {}

      if (phone) {
        const normalizedPhone = phone.replace(/[^\d+]/g, '')
        leadQuery += `phoneNumber == $phone`
        params.phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`
      }

      if (email) {
        if (phone) leadQuery += ` || `
        leadQuery += `emailAddress == $email`
        params.email = email
      }

      leadQuery += `)][0] { _id, firstName, secondName, phoneNumber, emailAddress, rowNumber }`

      const lead = await sanityClient.fetch(leadQuery, params)

      if (!lead) {
        return NextResponse.json({ received: true, skipped: 'lead not found' })
      }

      await sanityClient
        .patch(lead._id)
        .set({
          contactStatus: 'WARM',
          callBookedTime: null,
          notes: `Call cancelled via Cal.com on ${new Date().toLocaleDateString()}`,
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

      // Update Google Sheet - search by phone number
      try {
        const sheets = getGoogleSheetsClient()

        const phoneColumnData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'D2:D',
        })

        const rows = phoneColumnData.data.values || []
        const phoneWithoutPlus = lead.phoneNumber.replace(/\+/g, '')

        const rowIndex = rows.findIndex((row: any[]) =>
          row[0] && row[0].replace(/\D/g, '') === phoneWithoutPlus.replace(/\D/g, '')
        )

        if (rowIndex >= 0) {
          const sheetRow = rowIndex + 2

          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
              data: [
                {
                  range: `A${sheetRow}`,
                  values: [['WARM']]
                },
                {
                  range: `X${sheetRow}`,
                  values: [['']]
                }
              ],
              valueInputOption: 'RAW'
            }
          })

          console.log('✅ Google Sheet updated for cancellation: row', sheetRow)
        }
      } catch (sheetsError) {
        console.error('⚠️  Failed to update Google Sheet:', sheetsError)
      }

      return NextResponse.json({ success: true, leadId: lead._id, cancelled: true })
    }

    // Unknown event type
    return NextResponse.json({
      received: true,
      event: triggerEvent,
      message: 'Event type not handled'
    })

  } catch (error) {
    console.error('❌ Cal.com webhook error:', error)
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
