import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN, // Write token for updates
})

// Helper to parse datetime strings from Google Sheets
function parseDateTime(dateStr: string | null | undefined): string | undefined {
  if (!dateStr || dateStr.trim() === '') return undefined

  try {
    // Try parsing DD/MM/YYYY HH:MM format
    const parts = dateStr.split(' ')
    if (parts.length === 2) {
      const [datePart, timePart] = parts
      const [day, month, year] = datePart.split('/')
      const [hours, minutes] = timePart.split(':')
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      )
      return date.toISOString()
    }

    // Fallback: try direct parsing
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? undefined : date.toISOString()
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a sync trigger from Google Sheets Apps Script
    if (body.sheetName && body.timestamp) {
      // This is a notification that the sheet was updated
      // Trigger a full sync by calling the existing sync logic
      console.log(`Sheet update notification received for ${body.sheetName}, row ${body.editedRow}`)

      // Instead of syncing here, just acknowledge
      // The dashboard will auto-refresh every 30 seconds to pick up changes
      return NextResponse.json({
        success: true,
        message: 'Update notification received. Dashboard will refresh automatically.',
        editedRow: body.editedRow,
        timestamp: body.timestamp
      })
    }

    // Original webhook logic for direct lead updates
    // Validate required fields
    if (!body.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Create document ID from phone number
    const docId = `dbr-${body.phoneNumber.replace(/\D/g, '')}`

    // Prepare update data
    const updateData: any = {}

    if (body.contactStatus !== undefined) updateData.contactStatus = body.contactStatus
    if (body.firstName !== undefined) updateData.firstName = body.firstName
    if (body.secondName !== undefined) updateData.secondName = body.secondName
    if (body.leadSentiment !== undefined) updateData.leadSentiment = body.leadSentiment
    if (body.conversationHistory !== undefined) updateData.conversationHistory = body.conversationHistory
    if (body.m1Sent !== undefined) updateData.m1Sent = parseDateTime(body.m1Sent)
    if (body.m2Sent !== undefined) updateData.m2Sent = parseDateTime(body.m2Sent)
    if (body.m3Sent !== undefined) updateData.m3Sent = parseDateTime(body.m3Sent)
    if (body.replyReceived !== undefined) updateData.replyReceived = parseDateTime(body.replyReceived)
    if (body.installDate !== undefined) updateData.installDate = parseDateTime(body.installDate)

    // Check if document exists
    const existing = await sanityClient.getDocument(docId).catch(() => null)

    if (existing) {
      // Update existing document
      await sanityClient
        .patch(docId)
        .set(updateData)
        .commit()

      return NextResponse.json({
        success: true,
        action: 'updated',
        id: docId,
        message: `Lead ${body.firstName} ${body.secondName} updated successfully`,
      })
    } else {
      // Create new document if it doesn't exist
      const newDoc = {
        _type: 'dbrLead',
        _id: docId,
        phoneNumber: body.phoneNumber,
        ...updateData,
      }

      await sanityClient.create(newDoc)

      return NextResponse.json({
        success: true,
        action: 'created',
        id: docId,
        message: `Lead ${body.firstName} ${body.secondName} created successfully`,
      })
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update lead',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'DBR Webhook endpoint is active',
    usage: 'POST lead data to this endpoint to update Sanity',
    requiredFields: ['phoneNumber'],
    optionalFields: [
      'contactStatus',
      'firstName',
      'secondName',
      'leadSentiment',
      'conversationHistory',
      'm1Sent',
      'm2Sent',
      'm3Sent',
      'replyReceived',
      'installDate'
    ]
  })
}
