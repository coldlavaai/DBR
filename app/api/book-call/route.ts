import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const CAL_API_KEY = 'cal_live_3f6e6da57376dc32becef1d218758439'
const CAL_EVENT_TYPE_ID = 3721996 // "intro" event type

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadId, name, email, phone, startTime, notes } = body

    if (!leadId || !name || !email || !phone || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('📞 Booking call for:', name, 'at', startTime)

    // Calculate end time (15 minutes after start)
    const start = new Date(startTime)
    const end = new Date(start.getTime() + 15 * 60 * 1000)

    // Create booking with Cal.com API
    const calResponse = await fetch(
      `https://api.cal.com/v1/bookings?apiKey=${CAL_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTypeId: CAL_EVENT_TYPE_ID,
          start: start.toISOString(),
          end: end.toISOString(),
          responses: {
            name,
            email,
            attendeePhoneNumber: phone,
            notes: notes || `DBR follow-up call`,
            location: {
              value: 'integrations:daily',
              optionValue: ''
            }
          },
          timeZone: 'Europe/London',
          language: 'en',
          metadata: {
            leadId,
            source: 'DBR Dashboard'
          }
        })
      }
    )

    if (!calResponse.ok) {
      const errorData = await calResponse.json()
      console.error('Cal.com API error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Failed to create booking with Cal.com' },
        { status: calResponse.status }
      )
    }

    const calData = await calResponse.json()
    console.log('✅ Cal.com booking created:', calData.id)

    // Update lead in Sanity with booking details
    try {
      await sanityClient
        .patch(leadId)
        .set({
          callBookedTime: start.toISOString(), // Store call booking time
          contactStatus: 'CALL_BOOKED',
          notes: notes || `Call booked via DBR Dashboard on ${start.toLocaleDateString()}`,
          lastUpdatedAt: new Date().toISOString(),
          calBookingId: calData.id,
          calBookingUrl: calData.uid ? `https://cal.com/booking/${calData.uid}` : undefined
        })
        .commit()

      console.log('✅ Lead updated in Sanity:', leadId)
    } catch (sanityError) {
      console.error('Sanity update error:', sanityError)
      // Don't fail the request if Sanity update fails - booking is still created
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: calData.id,
        uid: calData.uid,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      }
    })

  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
