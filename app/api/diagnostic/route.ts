import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export const runtime = 'nodejs'
export const maxDuration = 300

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchName = searchParams.get('name') || 'Marcel'

    console.log(`🔍 Diagnostic search for: ${searchName}`)

    // 1. Check Google Sheets
    console.log('📋 Checking Google Sheets...')
    const sheets = getGoogleSheetsClient()
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:Z',
    })

    const rows = sheetResponse.data.values || []
    const matchingRows: any[] = []

    rows.forEach((row, index) => {
      const fullName = `${row[1]} ${row[2]}`.toLowerCase()
      if (fullName.includes(searchName.toLowerCase())) {
        matchingRows.push({
          rowNumber: index + 2,
          contactStatus: row[0],
          firstName: row[1],
          secondName: row[2],
          phoneNumber: row[3],
          emailAddress: row[4],
          postcode: row[5],
          callBookedTime: row[23], // Column X
          archived: row[25], // Column Z
        })
      }
    })

    console.log(`📊 Found ${matchingRows.length} matches in Google Sheets`)

    // 2. Check Sanity
    console.log('💾 Checking Sanity...')
    const sanityQuery = `*[_type == "dbrLead" && (
      firstName match "*${searchName}*" ||
      secondName match "*${searchName}*"
    )] {
      _id,
      firstName,
      secondName,
      phoneNumber,
      contactStatus,
      callBookedTime,
      archived,
      archivedAt,
      lastSyncedAt
    }`

    const sanityMatches = await sanityClient.fetch(sanityQuery)
    console.log(`💾 Found ${sanityMatches.length} matches in Sanity`)

    // 3. Check Cal.com
    console.log('📅 Checking Cal.com...')
    const CAL_API_KEY = 'cal_live_932f5eaefdad7c1eb6cbf62799057315'
    const EVENT_TYPE_ID = '3721996'

    const calResponse = await fetch(
      `https://api.cal.com/v2/bookings?eventTypeIds=${EVENT_TYPE_ID}&status=upcoming&sortStart=asc`,
      {
        headers: {
          'Authorization': `Bearer ${CAL_API_KEY}`,
          'cal-api-version': '2024-08-13'
        }
      }
    )

    let calMatches: any[] = []
    if (calResponse.ok) {
      const calData = await calResponse.json()
      const bookings = calData.data || []
      calMatches = bookings.filter((booking: any) => {
        const attendee = booking.attendees?.[0]
        return attendee?.name?.toLowerCase().includes(searchName.toLowerCase())
      }).map((booking: any) => ({
        name: booking.attendees?.[0]?.name,
        email: booking.attendees?.[0]?.email,
        phone: booking.attendees?.[0]?.phoneNumber,
        start: booking.start,
        uid: booking.uid
      }))
    }

    console.log(`📅 Found ${calMatches.length} matches in Cal.com`)

    // 4. Return comprehensive report
    return NextResponse.json({
      success: true,
      searchName,
      googleSheets: {
        found: matchingRows.length,
        matches: matchingRows
      },
      sanity: {
        found: sanityMatches.length,
        matches: sanityMatches
      },
      calCom: {
        found: calMatches.length,
        matches: calMatches
      },
      sync_status: {
        sheets_to_sanity: matchingRows.length === sanityMatches.length ? 'IN_SYNC' : 'OUT_OF_SYNC',
        cal_to_sheets: calMatches.length > 0 ? 'BOOKINGS_EXIST' : 'NO_BOOKINGS'
      }
    })

  } catch (error) {
    console.error('❌ Diagnostic error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
