import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || '',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

/**
 * Parse conversationHistory string into structured messages
 */
function parseConversationHistory(conversationHistory: string, leadName: string) {
  if (!conversationHistory || !conversationHistory.trim()) {
    return []
  }

  const messages: any[] = []
  const lines = conversationHistory.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    // Format: [19:15 30/10/2025] Sender: content
    const format1 = line.match(/\[(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\] ([^:]+): (.+)/)
    // Format: [30/10/2025, 19:06] MANUAL: content
    const format2 = line.match(/\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})\] ([^:]+): (.+)/)

    if (format1 || format2) {
      const match = format1 || format2
      if (!match) continue

      const [, timestamp, sender, content] = match

      if (!content || !content.trim()) continue

      const senderType = sender.trim() === 'AI' ? 'agent' :
                        sender.trim() === 'MANUAL' ? 'agent' : 'lead'

      messages.push({
        _id: `msg_${Date.now()}_${Math.random()}`,
        _createdAt: timestamp,
        sender: senderType,
        content: content.trim(),
      })
    }
  }

  return messages
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id

    // Fetch lead with all messages (inline messages array)
    const lead = await sanityClient.fetch(`
      *[_type == "dbrLead" && _id == $leadId][0] {
        _id, _createdAt, _updatedAt, firstName, secondName, phoneNumber,
        contactStatus, leadSentiment, latestLeadReply, notes, postcode,
        replyReceived, replyProcessed, m1Sent, m2Sent, m3Sent,
        callBookedTime, lastSyncedAt, finalStatus,
        messages,
        conversationHistory
      }
    `, { leadId })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // FALLBACK: If no structured messages but conversationHistory exists, parse it
    if ((!lead.messages || lead.messages.length === 0) && lead.conversationHistory) {
      lead.messages = parseConversationHistory(lead.conversationHistory, lead.firstName)
    }

    return NextResponse.json(lead)

  } catch (error: any) {
    console.error('❌ Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead', details: error.message },
      { status: 500 }
    )
  }
}
