import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Cal.com credentials (from session log)
const CAL_API_KEY = 'cal_live_932f5eaefdad7c1eb6cbf62799057315'
const EVENT_TYPE_ID = '3721996' // Introduction Call - 15 minutes
const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

// Normalize phone number to match Google Sheet format
function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ''

  // Remove all whitespace and non-numeric characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // If it already starts with +, return as-is
  if (cleaned.startsWith('+')) {
    return cleaned
  }

  // If it starts with 44, add the + prefix
  if (cleaned.startsWith('44')) {
    return '+' + cleaned
  }

  // If it starts with 0 (UK local format), replace 0 with +44
  if (cleaned.startsWith('0')) {
    return '+44' + cleaned.substring(1)
  }

  // Default: add +44 prefix if just digits
  if (cleaned.match(/^\d{10,11}$/)) {
    return '+44' + cleaned
  }

  return cleaned
}

export async function GET() {
  try {
    console.log('🔄 Starting Cal.com → Google Sheets → Sanity sync...')

    // 1. Fetch all bookings from Cal.com (v2 API)
    console.log('📅 Fetching bookings from Cal.com...')
    const calResponse = await fetch(
      `https://api.cal.com/v2/bookings?eventTypeIds=${EVENT_TYPE_ID}&status=upcoming&sortStart=asc`,
      {
        headers: {
          'Authorization': `Bearer ${CAL_API_KEY}`,
          'cal-api-version': '2024-08-13'
        }
      }
    )

    if (!calResponse.ok) {
      const errorText = await calResponse.text()
      console.error('Cal.com API error:', errorText)
      throw new Error(`Cal.com API failed: ${calResponse.status}`)
    }

    const calData = await calResponse.json()
    const bookings = calData.data || []

    console.log(`📊 Found ${bookings.length} upcoming bookings in Cal.com`)

    if (bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings to sync',
        bookingsFound: 0,
        matchesFound: 0,
        updated: 0
      })
    }

    // 2. Fetch all leads from Google Sheet
    console.log('📋 Fetching leads from Google Sheets...')
    const sheets = getGoogleSheetsClient()
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:X', // All lead data
    })

    const rows = sheetResponse.data.values || []
    console.log(`📊 Found ${rows.length} leads in Google Sheet`)

    // 3. Cross-reference bookings with sheet leads
    let matchesFound = 0
    let updatesApplied = 0
    const updateDetails: any[] = []

    for (const booking of bookings) {
      // Extract attendee details from booking
      const attendees = booking.attendees || []
      if (attendees.length === 0) continue

      const attendee = attendees[0] // Primary attendee
      const bookingPhone = normalizePhoneNumber(attendee.phoneNumber || '')
      const bookingEmail = attendee.email?.toLowerCase()
      const bookingName = attendee.name
      const bookingStart = booking.start // ISO 8601 format
      const bookingUid = booking.uid

      console.log(`🔍 Checking booking: ${bookingName} (${bookingEmail || bookingPhone}) at ${bookingStart}`)

      // Search for matching contact in sheet
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]
        const sheetPhone = normalizePhoneNumber(row[3] || '') // Column D
        const sheetEmail = (row[4] || '').toLowerCase() // Column E
        const currentCallBookedTime = row[23] // Column X

        // Match by phone OR email
        const isMatch = (bookingPhone && sheetPhone && bookingPhone === sheetPhone) ||
                        (bookingEmail && sheetEmail && bookingEmail === sheetEmail)

        if (isMatch) {
          matchesFound++
          console.log(`✅ Match found: Row ${rowIndex + 2} - ${row[1]} ${row[2]}`)

          // Check if already updated with this booking
          if (currentCallBookedTime && currentCallBookedTime.includes(bookingStart.split('T')[0])) {
            console.log(`⏭️  Already synced - skipping`)
            continue
          }

          // Prepare update for this row
          const rowNumber = rowIndex + 2 // Google Sheets is 1-indexed, +1 for header row

          // Format booking time as: "HH:MM DD/MM/YYYY" (UK format)
          const bookingDate = new Date(bookingStart)
          const formattedTime = `${bookingDate.getHours().toString().padStart(2, '0')}:${bookingDate.getMinutes().toString().padStart(2, '0')} ${bookingDate.getDate().toString().padStart(2, '0')}/${(bookingDate.getMonth() + 1).toString().padStart(2, '0')}/${bookingDate.getFullYear()}`

          updateDetails.push({
            rowNumber,
            name: `${row[1]} ${row[2]}`,
            phone: sheetPhone,
            email: sheetEmail,
            bookingTime: formattedTime,
            bookingUid,
            range: `A${rowNumber}:X${rowNumber}`
          })

          break // Stop searching once match found
        }
      }
    }

    console.log(`🎯 Found ${matchesFound} matches between Cal.com and Google Sheet`)

    // 4. Apply updates to Google Sheet
    if (updateDetails.length > 0) {
      console.log(`📝 Applying ${updateDetails.length} updates to Google Sheet...`)

      for (const update of updateDetails) {
        try {
          // Fetch current row data
          const currentRow = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: update.range,
          })

          const rowData = currentRow.data.values?.[0] || []

          // Update specific columns:
          // - Column A (0): Set to CALL_BOOKED if not already
          // - Column X (23): Set to booking time
          rowData[0] = 'CALL_BOOKED' // Contact_Status
          rowData[23] = update.bookingTime // call_booked column

          // Write back to sheet
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: update.range,
            valueInputOption: 'RAW',
            requestBody: {
              values: [rowData]
            }
          })

          updatesApplied++
          console.log(`✅ Updated row ${update.rowNumber}: ${update.name} - ${update.bookingTime}`)

        } catch (error) {
          console.error(`❌ Failed to update row ${update.rowNumber}:`, error)
        }
      }
    }

    // 5. Trigger full Sanity sync to update dashboard
    if (updatesApplied > 0) {
      console.log('🔄 Triggering Sanity sync to update dashboard...')

      try {
        // Call the existing sync-sheets route to update Sanity
        const syncResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/sync-sheets`, {
          method: 'GET'
        })

        if (syncResponse.ok) {
          console.log('✅ Sanity sync completed successfully')
        } else {
          console.warn('⚠️  Sanity sync may have failed')
        }
      } catch (error) {
        console.error('❌ Failed to trigger Sanity sync:', error)
      }
    }

    // 6. Return summary
    return NextResponse.json({
      success: true,
      message: `Cal.com sync completed`,
      bookingsFound: bookings.length,
      matchesFound,
      updatesApplied,
      updates: updateDetails.map(u => ({
        row: u.rowNumber,
        name: u.name,
        bookingTime: u.bookingTime
      }))
    })

  } catch (error: any) {
    console.error('❌ Cal.com sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Cal.com sync failed',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
