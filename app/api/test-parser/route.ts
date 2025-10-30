import { NextResponse } from 'next/server'

// Copy of the parser function
function parseConversationMessages(conversation: string) {
  if (!conversation) return []

  const messages: any[] = []
  const lines = conversation.split('\n')

  for (const line of lines) {
    // New format: [19:15 30/10/2025] AI: message
    const newFormatMatch = line.match(/\[(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\] ([^:]+): (.+)/)

    // Very old format: Just "AI: message" (M1/M2/M3 without timestamps - SKIP THESE)
    const simpleAiMatch = line.match(/^AI: (.+)/)

    // Old format: AI (30/10/2025 19:15): message
    const oldAiMatch = line.match(/AI \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)
    const oldLeadMatch = line.match(/Lead \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)

    // SKIP simple AI messages (M1/M2/M3 automated sends)
    if (simpleAiMatch) {
      continue
    } else if (newFormatMatch) {
      const [, timestamp, sender, content] = newFormatMatch
      if (content && content.trim()) {
        messages.push({
          sender: sender.trim() === 'AI' ? 'AI' : 'Lead',
          timestamp,
          content: content.trim(),
        })
      }
    } else if (oldAiMatch) {
      messages.push({
        sender: 'AI',
        timestamp: oldAiMatch[1],
        content: oldAiMatch[2],
      })
    } else if (oldLeadMatch) {
      messages.push({
        sender: 'Lead',
        timestamp: oldLeadMatch[1],
        content: oldLeadMatch[2],
      })
    }
  }

  return messages
}

export async function POST(request: Request) {
  const { conversation } = await request.json()

  const parsed = parseConversationMessages(conversation)

  return NextResponse.json({
    originalLines: conversation.split('\n').map((line, i) => ({
      index: i,
      line: line.substring(0, 100)
    })),
    parsedMessages: parsed.map((msg, i) => ({
      index: i,
      sender: msg.sender,
      content: msg.content.substring(0, 100)
    })),
    totalParsed: parsed.length
  })
}
