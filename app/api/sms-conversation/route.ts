import { NextResponse } from 'next/server'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM_NUMBER = process.env.TWILIO_GREENSTAR_SMS

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phoneNumber')

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      )
    }

    console.log(`📞 Fetching SMS conversation for ${phoneNumber}`)

    // Fetch messages from Twilio
    const twilioUrl = new URL(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`)

    // Filter for messages to/from this specific phone number
    twilioUrl.searchParams.set('To', phoneNumber)
    twilioUrl.searchParams.set('PageSize', '100') // Get last 100 messages

    const response1 = await fetch(twilioUrl.toString(), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
    })

    // Also fetch messages FROM this number (replies)
    const twilioUrl2 = new URL(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`)
    twilioUrl2.searchParams.set('From', phoneNumber)
    twilioUrl2.searchParams.set('PageSize', '100')

    const response2 = await fetch(twilioUrl2.toString(), {
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
    })

    if (!response1.ok || !response2.ok) {
      console.error('Twilio API error')
      return NextResponse.json({ error: 'Failed to fetch messages from Twilio' }, { status: 500 })
    }

    const data1 = await response1.json()
    const data2 = await response2.json()

    // Combine and deduplicate messages
    const allMessages = [...data1.messages, ...data2.messages]
    const uniqueMessages = Array.from(
      new Map(allMessages.map((msg: any) => [msg.sid, msg])).values()
    )

    // Sort by date (oldest first)
    const sortedMessages = uniqueMessages.sort((a: any, b: any) => {
      return new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
    })

    // Format messages for display
    const formattedMessages = sortedMessages.map((msg: any) => ({
      sid: msg.sid,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      status: msg.status,
      direction: msg.direction, // inbound or outbound
      sentAt: msg.date_created,
      isFromGreenstar: msg.from === TWILIO_FROM_NUMBER,
    }))

    console.log(`✅ Found ${formattedMessages.length} messages`)

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length,
    })
  } catch (error) {
    console.error('Error fetching SMS conversation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
