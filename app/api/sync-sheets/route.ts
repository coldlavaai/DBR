import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { getGoogleSheetsClient } from '@/lib/google-auth'

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
const RANGE = 'A2:W' // First sheet, starting from row 2 (now includes Manual_Mode column V and Featured column W)

function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // If already in ISO format, return as-is
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('-')) || dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
      return dateStr
    }

    // Try HH:MM DD/MM/YYYY format (UK timezone assumed)
    const match1 = dateStr.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match1) {
      const [, hours, minutes, day, month, year] = match1
      // Create date string in ISO format with UK timezone
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+01:00`
      return new Date(isoStr).toISOString()
    }

    // Try DD/MM/YYYY HH:MM format (UK timezone assumed)
    const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (match2) {
      const [, day, month, year, hours, minutes] = match2
      // Create date string in ISO format with UK timezone
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+01:00`
      return new Date(isoStr).toISOString()
    }

    // Try just DD/MM/YYYY format
    const match3 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match3) {
      const [, day, month, year] = match3
      // Assume noon UK time
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00+01:00`
      return new Date(isoStr).toISOString()
    }

    // Fallback - try to parse as-is
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

function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber

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

  // If it's just digits and doesn't match above, assume UK and add +44
  if (cleaned.match(/^\d{10,11}$/)) {
    return '+44' + cleaned
  }

  // Default: add +44 prefix
  return '+44' + cleaned
}

export async function GET() {
  try {
    console.log('🔄 Starting Google Sheets → Sanity sync...')

    // Initialize Google Sheets API with service account
    const sheets = getGoogleSheetsClient()

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    })

    const rows = response.data.values || []
    console.log(`📊 Found ${rows.length} leads in Google Sheet`)

    let processed = 0
    let errors = 0

    // Fetch all existing documents to preserve archived status
    console.log('🔍 Fetching existing documents to preserve archived status...')
    const existingDocs = await sanityClient.fetch(
      `*[_type == "dbrLead"] { _id, archived, archivedAt }`
    )
    const existingDocsMap = new Map(
      existingDocs.map((doc: any) => [doc._id, { archived: doc.archived, archivedAt: doc.archivedAt }])
    )
    console.log(`📋 Found ${existingDocs.length} existing documents`)

    // Use Sanity transactions to batch mutations (100 mutations per transaction)
    const BATCH_SIZE = 100
    const mutations = []

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
        // 17: Lead_sentiment, 18: AI_reply_sent, 19: Install_Date, 20: Final_status,
        // 21: Manual_Mode, 22: Featured
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
        const manualModeStr = row[21]
        const featuredStr = row[22]

        if (!phoneNumber || !firstName || !secondName) {
          continue // Skip rows without required fields
        }

        // Normalize phone number to international format (+44...)
        const normalizedPhone = normalizePhoneNumber(phoneNumber)
        const docId = `dbr-${normalizedPhone.replace(/\D/g, '')}`

        const leadData: any = {
          _type: 'dbrLead',
          phoneNumber: normalizedPhone,
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
        // Always use the array index as rowNumber (not the row_number column)
        // This ensures every lead has the correct row number for Google Sheets updates
        leadData.rowNumber = rowIndex

        // DateTime fields
        if (m1Sent) leadData.m1Sent = parseDateTime(m1Sent)
        if (m2Sent) leadData.m2Sent = parseDateTime(m2Sent)
        if (m3Sent) leadData.m3Sent = parseDateTime(m3Sent)
        if (replyReceived) leadData.replyReceived = parseDateTime(replyReceived)
        if (aiReplySent) leadData.aiReplySent = parseDateTime(aiReplySent)

        // Date field (not datetime!)
        if (installDate) leadData.installDate = parseDate(installDate)

        // Manual mode field
        leadData.manualMode = manualModeStr === 'YES'

        // Featured/starred field
        leadData.starred = featuredStr === 'TRUE'

        // Preserve archived status if document exists
        const existingDoc = existingDocsMap.get(docId) as { archived?: boolean; archivedAt?: string } | undefined
        if (existingDoc) {
          // Preserve archived fields from existing document
          if (existingDoc.archived !== undefined) {
            leadData.archived = existingDoc.archived
          }
          if (existingDoc.archivedAt) {
            leadData.archivedAt = existingDoc.archivedAt
          }
        }

        // Add to mutations array for batch processing
        mutations.push({
          createOrReplace: { ...leadData, _id: docId }
        })
      } catch (error) {
        console.error('Error processing lead:', phoneNumber, error)
        if (errors < 5) { // Log first 5 errors in detail
          console.error('Row data:', row)
          console.error('Error details:', error instanceof Error ? error.message : error)
        }
        errors++
      }
    }

    // Process mutations in batches using transactions
    console.log(`📦 Processing ${mutations.length} mutations in batches of ${BATCH_SIZE}`)

    for (let i = 0; i < mutations.length; i += BATCH_SIZE) {
      const batch = mutations.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(mutations.length / BATCH_SIZE)

      try {
        const transaction = sanityClient.transaction()
        batch.forEach(m => {
          transaction.createOrReplace(m.createOrReplace)
        })
        await transaction.commit()
        processed += batch.length
        console.log(`✅ Batch ${batchNum}/${totalBatches}: ${batch.length} leads synced (${processed}/${mutations.length} total)`)
      } catch (batchError) {
        console.error(`❌ Batch ${batchNum} failed:`, batchError)
        errors += batch.length
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
      message: `Synced ${processed} leads using ${Math.ceil(mutations.length / 100)} transaction batches`
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
