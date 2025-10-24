import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  token: process.env.SANITY_API_WRITE_TOKEN || '',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📞 Cal.com webhook received:', JSON.stringify(body, null, 2))

    // Cal.com webhook payload structure
    const { triggerEvent, payload } = body

    // Handle booking.created event
    if (triggerEvent === 'BOOKING_CREATED') {
      const {
        startTime,
        endTime,
        attendees,
        responses,
        metadata
      } = payload

      // Extract attendee info
      const attendee = attendees?.[0]
      const email = attendee?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone
      const name = attendee?.name || responses?.name

      console.log('🔍 Looking for lead with email:', email, 'or phone:', phone)

      if (!email && !phone) {
        console.log('⚠️  No email or phone in webhook, skipping')
        return NextResponse.json({ received: true, skipped: 'no contact info' })
      }

      // Search for lead by phone or email
      let leadQuery = `*[_type == "dbrLead" && (`
      const params: any = {}

      if (phone) {
        // Normalize phone number for search
        const normalizedPhone = phone.replace(/[^\d+]/g, '')
        leadQuery += `phoneNumber == $phone`
        params.phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`
      }

      if (email) {
        if (phone) leadQuery += ` || `
        leadQuery += `emailAddress == $email`
        params.email = email
      }

      leadQuery += `)][0]`

      console.log('🔍 Query:', leadQuery, 'Params:', params)

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

      // Update lead with booking info
      await sanityClient
        .patch(lead._id)
        .set({
          contactStatus: 'CALL_BOOKED',
          callBookedTime: startTime,
          notes: `Call booked via Cal.com${name ? ` with ${name}` : ''} on ${new Date(startTime).toLocaleDateString()}`,
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

      console.log('✅ Lead updated:', lead._id)

      return NextResponse.json({
        success: true,
        leadId: lead._id,
        leadName: `${lead.firstName} ${lead.secondName}`,
        callTime: startTime
      })
    }

    // Handle booking.rescheduled event
    if (triggerEvent === 'BOOKING_RESCHEDULED') {
      const { startTime, attendees, responses } = payload

      const email = attendees?.[0]?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone

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

      leadQuery += `)][0]`

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

      return NextResponse.json({ success: true, leadId: lead._id, rescheduled: true })
    }

    // Handle booking.cancelled event
    if (triggerEvent === 'BOOKING_CANCELLED') {
      const { attendees, responses } = payload

      const email = attendees?.[0]?.email || responses?.email
      const phone = responses?.attendeePhoneNumber || responses?.phone

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

      leadQuery += `)][0]`

      const lead = await sanityClient.fetch(leadQuery, params)

      if (!lead) {
        return NextResponse.json({ received: true, skipped: 'lead not found' })
      }

      await sanityClient
        .patch(lead._id)
        .set({
          contactStatus: 'WARM', // Move back to WARM when cancelled
          callBookedTime: null,
          notes: `Call cancelled via Cal.com on ${new Date().toLocaleDateString()}`,
          lastUpdatedAt: new Date().toISOString(),
        })
        .commit()

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
