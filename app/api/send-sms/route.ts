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

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM_NUMBER = process.env.TWILIO_GREENSTAR_SMS

// Google Sheets
const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

export async function POST(request: Request) {
  try {
    const { leadId, phoneNumber, message } = await request.json()

    if (!leadId || !phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Lead ID, phone number, and message are required' },
        { status: 400 }
      )
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      )
    }

    console.log(`📤 Sending manual SMS to ${phoneNumber}`)

    // Send SMS via Twilio API
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: TWILIO_FROM_NUMBER,
          Body: message,
        }),
      }
    )

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json()
      console.error('Twilio error:', errorData)
      return NextResponse.json(
        { error: `Twilio error: ${errorData.message || 'Unknown error'}` },
        { status: twilioResponse.status }
      )
    }

    const twilioData = await twilioResponse.json()
    console.log(`✅ SMS sent successfully, SID: ${twilioData.sid}`)

    // Get lead data for row number
    const lead = await sanityClient.fetch(
      `*[_type == "dbrLead" && _id == $leadId][0]{ conversationHistory, rowNumber }`,
      { leadId }
    )

    const timestamp = new Date().toISOString()
    const formattedTimestamp = new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    // Format: [DD/MM/YYYY HH:MM] MANUAL: message
    const newConversationEntry = `\n\n[${formattedTimestamp}] MANUAL: ${message}`
    const updatedHistory = (lead?.conversationHistory || '') + newConversationEntry

    // Update conversation history in Sanity
    try {
      await sanityClient
        .patch(leadId)
        .set({
          conversationHistory: updatedHistory,
          lastUpdatedAt: timestamp,
        })
        .commit()

      console.log(`✅ Updated Sanity conversation history for lead ${leadId}`)
    } catch (sanityError) {
      console.error('Error updating Sanity:', sanityError)
      // Don't fail the request if Sanity update fails
    }

    // Update conversation history in Google Sheets
    try {
      if (lead?.rowNumber) {
        const auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const sheets = google.sheets({ version: 'v4', auth })

        // Column O (column 15, index 14) is Conversation History
        const rowIndex = lead.rowNumber + 1 // +1 because row numbers are 1-indexed and we have a header
        const range = `O${rowIndex}` // Column O = Conversation History

        // Fetch current conversation history from Google Sheets
        const currentData = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range,
        })

        const currentHistory = currentData.data.values?.[0]?.[0] || ''
        const updatedGoogleHistory = currentHistory + newConversationEntry

        // Update Google Sheets
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[updatedGoogleHistory]],
          },
        })

        console.log(`✅ Updated Google Sheets conversation history for row ${rowIndex}`)
      } else {
        console.warn(`⚠️ No row number found for lead ${leadId}, skipping Google Sheets conversation update`)
      }
    } catch (sheetsError) {
      console.error('Error updating Google Sheets conversation history:', sheetsError)
      // Don't fail the request if sheets update fails
    }

    return NextResponse.json({
      success: true,
      messageSid: twilioData.sid,
      status: twilioData.status,
      sentAt: twilioData.date_created,
    })
  } catch (error) {
    console.error('Error sending SMS:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
