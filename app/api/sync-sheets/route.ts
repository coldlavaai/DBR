import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { google } from 'googleapis'

// Force this route to be dynamic (don't pre-render at build time)
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

// Your actual Google Sheet ID
const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'
const RANGE = 'A2:U' // First sheet, starting from row 2

function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // If already in ISO format, return as-is
    if (dateStr.includes('T') && dateStr.includes('Z') || dateStr.match(/\d{4}-\d{2}-\d{2}T/)) {
      return dateStr
    }

    // Try HH:MM DD/MM/YYYY format
    const match1 = dateStr.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match1) {
      const [, hours, minutes, day, month, year] = match1
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      )
      return date.toISOString()
    }

    // Try DD/MM/YYYY HH:MM format
    const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (match2) {
      const [, day, month, year, hours, minutes] = match2
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      )
      return date.toISOString()
    }

    // Fallback
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // If already in YYYY-MM-DD format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr
    }

    const dateTime = parseDateTime(dateStr)
    if (dateTime) {
      return dateTime.split('T')[0] // Extract just the date part
    }

    return null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    console.log('🔄 Starting Google Sheets → Sanity sync...')

    // Initialize Google Sheets API with service account
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    })

    const rows = response.data.values || []
    console.log(`📊 Found ${rows.length} leads in Google Sheet`)

    let processed = 0
    let errors = 0

    // Process rows with rate limiting
    // Sanity limits: 50 req/sec + 100 in-flight max
    const DELAY_MS = 25 // 40 req/sec to stay under limit

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex]
      // Extract all fields outside try block for error logging
      const contactStatus = row[0]
      const firstName = row[1]
      const secondName = row[2]
      const phoneNumber = row[3]

      try {
        // Actual column mapping from Google Sheet:
        // 0: Contact_Status, 1: First_name, 2: Second_name, 3: Phone_number,
        // 4: Email_address, 5: Postcode, 6: Address, 7: Enquiry_date, 8: row_number,
        // 9: Reply_received, 10: Notes, 11: M_1_sent, 12: M_2_sent, 13: M_3_sent,
        // 14: Conversation History, 15: Latest_lead_reply, 16: Reply_processed,
        // 17: Lead_sentiment, 18: AI_reply_sent, 19: Install_Date, 20: Final_status
        const emailAddress = row[4]
        const postcode = row[5]
        const address = row[6]
        const enquiryDate = row[7]
        const rowNumber = row[8]
        const replyReceived = row[9]
        const notes = row[10]
        const m1Sent = row[11]
        const m2Sent = row[12]
        const m3Sent = row[13]
        const conversationHistory = row[14]
        const latestLeadReply = row[15]
        const replyProcessed = row[16]
        const leadSentiment = row[17]
        const aiReplySent = row[18]
        const installDate = row[19]
        const finalStatus = row[20]

        if (!phoneNumber || !firstName || !secondName) {
          continue // Skip rows without required fields
        }

        const docId = `dbr-${phoneNumber.replace(/\D/g, '')}`

        const leadData: any = {
          _type: 'dbrLead',
          phoneNumber,
          firstName,
          secondName,
          contactStatus: contactStatus || 'Sent_1',
          lastSyncedAt: new Date().toISOString(),
        }

        // Optional string fields
        if (emailAddress) leadData.emailAddress = emailAddress
        if (postcode) leadData.postcode = postcode
        if (address) leadData.address = address
        if (enquiryDate) leadData.enquiryDate = enquiryDate
        if (conversationHistory) leadData.conversationHistory = conversationHistory
        if (latestLeadReply) leadData.latestLeadReply = latestLeadReply
        if (notes) leadData.notes = notes
        if (leadSentiment) leadData.leadSentiment = leadSentiment
        if (replyProcessed) leadData.replyProcessed = replyProcessed
        if (finalStatus) leadData.finalStatus = finalStatus

        // Number fields
        if (rowNumber) {
          const num = parseInt(rowNumber)
          if (!isNaN(num)) leadData.rowNumber = num
        }

        // DateTime fields
        if (m1Sent) leadData.m1Sent = parseDateTime(m1Sent)
        if (m2Sent) leadData.m2Sent = parseDateTime(m2Sent)
        if (m3Sent) leadData.m3Sent = parseDateTime(m3Sent)
        if (replyReceived) leadData.replyReceived = parseDateTime(replyReceived)
        if (aiReplySent) leadData.aiReplySent = parseDateTime(aiReplySent)

        // Date field (not datetime!)
        if (installDate) leadData.installDate = parseDate(installDate)

        // Save to Sanity with rate limiting
        try {
          await sanityClient.createOrReplace({ ...leadData, _id: docId })
          processed++

          // Progress logging every 100 leads
          if (processed % 100 === 0) {
            console.log(`✅ Progress: ${processed}/${rows.length} leads synced`)
          }

          // Rate limiting delay (except for last item)
          if (rowIndex < rows.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS))
          }
        } catch (saveError) {
          console.error('Error saving lead:', phoneNumber, saveError)
          errors++
        }
      } catch (error) {
        console.error('Error processing lead:', phoneNumber, error)
        if (errors < 5) { // Log first 5 errors in detail
          console.error('Row data:', row)
          console.error('Error details:', error instanceof Error ? error.message : error)
        }
        errors++
      }
    }

    console.log(`✅ Sync complete: ${processed} processed, ${errors} errors`)

    // Store the sync timestamp in Sanity for "last updated" display
    const syncTimestamp = new Date().toISOString()
    try {
      await sanityClient.createOrReplace({
        _id: 'syncMetadata',
        _type: 'syncMetadata',
        lastSyncTimestamp: syncTimestamp,
        lastSyncStats: {
          processed,
          errors,
          total: rows.length
        }
      })
    } catch (metaError) {
      console.error('Error storing sync metadata:', metaError)
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: rows.length,
      timestamp: syncTimestamp,
      message: `Synced ${processed} leads sequentially with rate limiting (40 req/sec)`
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
