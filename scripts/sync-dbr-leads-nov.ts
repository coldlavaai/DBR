#!/usr/bin/env tsx
/**
 * Sync DBR Leads from Google Sheets to Sanity
 *
 * This script:
 * 1. Reads the DBR leads from Google Sheets
 * 2. Transforms the data to match Sanity schema
 * 3. Creates or updates documents in Sanity
 *
 * Usage:
 *   npx tsx scripts/sync-dbr-leads.ts
 */

import { createClient } from '@sanity/client'
import { google } from 'googleapis'
import { Credentials } from 'google-auth-library'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// Configuration
const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'
const SHEET_NAME = '10th Nov' // Which sheet tab to sync from
const CAMPAIGN_NAME = '10th Nov' // Campaign identifier for this batch
const RANGE = `${SHEET_NAME}!A2:U` // Start from row 2 (skip headers), columns A-U, ALL rows

// Sanity Client
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Google Sheets Authentication
async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const authClient = await auth.getClient()
  return google.sheets({ version: 'v4', auth: authClient as any })
}

// Parse ISO datetime string or return null
function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    // Try parsing as ISO datetime
    if (dateStr.includes('T')) {
      const date = new Date(dateStr)
      return isNaN(date.getTime()) ? null : date.toISOString()
    }

    // Try parsing UK format like "10:10 23/10/2025"
    const ukMatch = dateStr.match(/(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (ukMatch) {
      const [_, hours, minutes, day, month, year] = ukMatch
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:00.000Z`)
      return isNaN(date.getTime()) ? null : date.toISOString()
    }

    return null
  } catch (error) {
    console.warn(`Failed to parse datetime: ${dateStr}`)
    return null
  }
}

// Parse date string (for install dates)
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
  } catch (error) {
    return null
  }
}

// Transform Google Sheets row to Sanity document
function transformRowToSanityDoc(row: any[], rowIndex: number) {
  const [
    contactStatus,
    firstName,
    secondName,
    phoneNumber,
    emailAddress,
    postcode,
    address,
    enquiryDate,
    rowNumber,
    replyReceived,
    notes,
    m1Sent,
    m2Sent,
    m3Sent,
    conversationHistory,
    latestLeadReply,
    replyProcessed,
    leadSentiment,
    aiReplySent,
    installDate,
    finalStatus,
  ] = row

  // Generate unique ID based on phone number
  const documentId = `dbr-${phoneNumber?.replace(/\D/g, '') || rowIndex}`

  return {
    _type: 'dbrLead',
    _id: documentId,
    contactStatus: contactStatus || 'Sent_1',
    firstName: firstName || 'Unknown',
    secondName: secondName || '',
    phoneNumber: phoneNumber || '',
    emailAddress: emailAddress || '',
    postcode: postcode || '',
    address: address || '',
    enquiryDate: enquiryDate || '',
    rowNumber: parseInt(rowNumber) || rowIndex,
    replyReceived: parseDateTime(replyReceived),
    notes: notes || '',
    m1Sent: parseDateTime(m1Sent),
    m2Sent: parseDateTime(m2Sent),
    m3Sent: parseDateTime(m3Sent),
    conversationHistory: conversationHistory || '',
    latestLeadReply: latestLeadReply || '',
    replyProcessed: replyProcessed || 'NO',
    leadSentiment: leadSentiment || null,
    aiReplySent: parseDateTime(aiReplySent),
    installDate: parseDate(installDate),
    finalStatus: finalStatus || 'IN_PROGRESS',
    lastSyncedAt: new Date().toISOString(),
    googleSheetId: SPREADSHEET_ID,
    campaign: CAMPAIGN_NAME,
  }
}

// Main sync function
async function syncDbrLeads() {
  console.log('🔄 Starting DBR Leads sync from Google Sheets to Sanity...\n')

  try {
    // 1. Fetch data from Google Sheets
    console.log('📊 Fetching data from Google Sheets...')
    const sheets = await getGoogleSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      console.log('⚠️  No data found in Google Sheet')
      return
    }

    console.log(`✅ Found ${rows.length} leads in Google Sheet\n`)

    // 2. Transform and sync to Sanity
    console.log('🔄 Syncing to Sanity...')
    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip empty rows
      if (!row[0] && !row[1] && !row[2]) {
        skipped++
        continue
      }

      try {
        const doc = transformRowToSanityDoc(row, i + 2) // +2 because row 1 is header, 0-indexed

        // Check if document exists
        const existing = await sanityClient.getDocument(doc._id).catch(() => null)

        if (existing) {
          // Update existing document
          await sanityClient
            .patch(doc._id)
            .set(doc)
            .commit()
          updated++
          process.stdout.write(`📝 Updated: ${doc.firstName} ${doc.secondName} (${doc.contactStatus})\n`)
        } else {
          // Create new document
          await sanityClient.create(doc)
          created++
          process.stdout.write(`✨ Created: ${doc.firstName} ${doc.secondName} (${doc.contactStatus})\n`)
        }
      } catch (error: any) {
        errors++
        console.error(`❌ Error processing row ${i + 2}: ${error.message}`)
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SYNC SUMMARY')
    console.log('='.repeat(60))
    console.log(`✨ Created: ${created}`)
    console.log(`📝 Updated: ${updated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📊 Total processed: ${rows.length}`)
    console.log('='.repeat(60))
    console.log('\n✅ Sync complete! View your dashboard at:')
    console.log(`   ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/studio\n`)

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message)
    throw error
  }
}

// Run the sync
syncDbrLeads()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
