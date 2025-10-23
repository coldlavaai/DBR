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

// Your actual Google Sheet ID
const SPREADSHEET_ID = '1ybvfHEtM0MhJ-Xqg__HvQDhKkgDhyvgFHJ9OtOcmM4I'
const RANGE = 'GreenstarDBR!A2:U' // Adjust if needed

function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // Try DD/MM/YYYY HH:MM format
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (match) {
      const [, day, month, year, hours, minutes] = match
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

    let created = 0
    let updated = 0
    let errors = 0

    // Process each row
    for (const row of rows) {
      try {
        const [
          phoneNumber,
          firstName,
          secondName,
          m1Sent,
          m2Sent,
          m3Sent,
          replyReceived,
          leadSentiment,
          contactStatus,
          conversationHistory,
          installDate,
          // ... add more fields as needed
        ] = row

        if (!phoneNumber) {
          continue // Skip rows without phone number
        }

        const docId = `dbr-${phoneNumber.replace(/\D/g, '')}`

        const leadData: any = {
          _type: 'dbrLead',
          phoneNumber,
          firstName: firstName || '',
          secondName: secondName || '',
          contactStatus: contactStatus || 'Ready',
          leadSentiment: leadSentiment || 'UNCLEAR',
          conversationHistory: conversationHistory || '',
        }

        if (m1Sent) leadData.m1Sent = parseDateTime(m1Sent)
        if (m2Sent) leadData.m2Sent = parseDateTime(m2Sent)
        if (m3Sent) leadData.m3Sent = parseDateTime(m3Sent)
        if (replyReceived) leadData.replyReceived = parseDateTime(replyReceived)
        if (installDate) leadData.installDate = parseDateTime(installDate)

        // Check if document exists
        const existing = await sanityClient.getDocument(docId).catch(() => null)

        if (existing) {
          await sanityClient.patch(docId).set(leadData).commit()
          updated++
        } else {
          await sanityClient.create({ ...leadData, _id: docId })
          created++
        }
      } catch (error) {
        console.error('Error processing lead:', error)
        errors++
      }
    }

    console.log(`✅ Sync complete: ${created} created, ${updated} updated, ${errors} errors`)

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: rows.length,
      timestamp: new Date().toISOString()
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
