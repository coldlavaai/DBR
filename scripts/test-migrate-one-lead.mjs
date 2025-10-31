#!/usr/bin/env node

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// Import parsing logic (duplicated for now)
function parseTimestamp(timestampStr, dateStr) {
  try {
    let year, month, day, hours, minutes

    // Format 1: "19:15 30/10/2025" (time first, then date)
    if (timestampStr && timestampStr.includes(' ') && !timestampStr.includes(',')) {
      const [time, date] = timestampStr.split(' ')
      ;[hours, minutes] = time.split(':').map(n => parseInt(n))
      ;[day, month, year] = date.split('/').map(n => parseInt(n))
    }
    // Format 2: "30/10/2025 19:15" (date first, then time)
    else if (dateStr && dateStr.includes(' ')) {
      const [date, time] = dateStr.split(' ')
      ;[day, month, year] = date.split('/').map(n => parseInt(n))
      ;[hours, minutes] = time.split(':').map(n => parseInt(n))
    }
    // Format 3: "30/10/2025, 19:06" (comma separator)
    else if (timestampStr && timestampStr.includes(',')) {
      const [date, time] = timestampStr.split(', ')
      ;[day, month, year] = date.split('/').map(n => parseInt(n))
      ;[hours, minutes] = time.split(':').map(n => parseInt(n))
    }
    else {
      return null
    }

    // Validate parsed values
    if (!year || !month || !day || hours === undefined || minutes === undefined) {
      console.error('❌ Invalid date components:', { year, month, day, hours, minutes })
      return null
    }

    const date = new Date(year, month - 1, day, hours, minutes)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date:', { year, month, day, hours, minutes })
      return null
    }

    return date
  } catch (error) {
    console.error('❌ Timestamp parsing error:', error)
    return null
  }
}

function detectTemplateType(content) {
  const isM1 = content.includes('is this the same') && content.includes('who enquired about solar panels')
  const isM2 = content.includes('Just checking in again') && content.includes('Are you still thinking about going solar')
  const isM3 = content.includes('Just checking in one last time') && content.includes("If you're still curious")

  if (isM1) return 'M1'
  if (isM2) return 'M2'
  if (isM3) return 'M3'
  return null
}

function parseConversationHistory(conversationHistory, leadName) {
  if (!conversationHistory || !conversationHistory.trim()) {
    return []
  }

  const messages = []
  const lines = conversationHistory.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    const format1 = line.match(/\[(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\] ([^:]+): (.+)/)
    const format2AI = line.match(/AI \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)
    const format2Lead = line.match(/Lead \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)
    const format3Manual = line.match(/\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})\] MANUAL: (.+)/)
    const simpleAI = line.match(/^AI: (.+)/)

    if (format1) {
      const [, timestamp, sender, content] = format1
      const parsedTimestamp = parseTimestamp(timestamp)

      if (!parsedTimestamp || !content.trim()) {
        console.log(`   ⏭️  Skipping ${!content.trim() ? 'empty' : 'invalid timestamp'} message from ${sender}`)
        continue
      }

      const senderType = sender.trim() === 'AI' ? 'ai' :
                        sender.trim() === 'MANUAL' ? 'manual' : 'customer'

      const templateType = senderType === 'ai' ? detectTemplateType(content) : null

      messages.push({
        _type: 'object',
        _key: `msg_${parsedTimestamp.getTime()}`,
        timestamp: parsedTimestamp.toISOString(),
        sender: senderType,
        senderName: senderType === 'ai' ? 'AI Agent' :
                   senderType === 'manual' ? 'Support Team' :
                   sender.trim(),
        content: content.trim(),
        messageType: templateType ? 'automated' :
                    senderType === 'customer' ? 'customer' : 'ai_generated',
        templateType: templateType,
      })
    } else if (format2AI) {
      const [, timestamp, content] = format2AI
      const parsedTimestamp = parseTimestamp(null, timestamp)
      if (!parsedTimestamp || !content.trim()) continue

      const templateType = detectTemplateType(content)
      messages.push({
        _type: 'object',
        _key: `msg_${parsedTimestamp.getTime()}`,
        timestamp: parsedTimestamp.toISOString(),
        sender: 'ai',
        senderName: 'AI Agent',
        content: content.trim(),
        messageType: templateType ? 'automated' : 'ai_generated',
        templateType: templateType,
      })
    } else if (format2Lead) {
      const [, timestamp, content] = format2Lead
      const parsedTimestamp = parseTimestamp(null, timestamp)
      if (!parsedTimestamp || !content.trim()) continue

      messages.push({
        _type: 'object',
        _key: `msg_${parsedTimestamp.getTime()}`,
        timestamp: parsedTimestamp.toISOString(),
        sender: 'customer',
        senderName: leadName || 'Customer',
        content: content.trim(),
        messageType: 'customer',
      })
    } else if (format3Manual) {
      const [, timestamp, content] = format3Manual
      const parsedTimestamp = parseTimestamp(timestamp)
      if (!parsedTimestamp || !content.trim()) continue

      messages.push({
        _type: 'object',
        _key: `msg_${parsedTimestamp.getTime()}`,
        timestamp: parsedTimestamp.toISOString(),
        sender: 'manual',
        senderName: 'Support Team',
        content: content.trim(),
        messageType: 'manual',
      })
    }
  }

  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  return messages
}

async function testMigrateCharlie() {
  try {
    console.log('🧪 TEST MIGRATION: Charlie Slone\n')

    const lead = await client.fetch(
      `*[_type == "dbrLead" && _id == "dbr-447521656647"][0] {
        _id,
        firstName,
        secondName,
        conversationHistory,
        messages
      }`
    )

    if (!lead) {
      console.log('❌ Charlie Slone not found')
      return
    }

    console.log(`📋 Lead: ${lead.firstName} ${lead.secondName}`)
    console.log(`   ID: ${lead._id}\n`)

    console.log('📝 Raw conversationHistory:')
    console.log(lead.conversationHistory)
    console.log('')

    const leadName = `${lead.firstName}${lead.secondName ? ' ' + lead.secondName : ''}`
    const messages = parseConversationHistory(lead.conversationHistory, lead.firstName)

    console.log(`\n✅ Parsed into ${messages.length} structured messages:\n`)

    messages.forEach((msg, i) => {
      const emoji = msg.sender === 'ai' ? '🤖' : msg.sender === 'customer' ? '👤' : '👨‍💼'
      const date = new Date(msg.timestamp).toLocaleString()
      console.log(`${i + 1}. ${emoji} [${msg.senderName}] at ${date}`)
      console.log(`   Type: ${msg.messageType}${msg.templateType ? ` (${msg.templateType})` : ''}`)
      console.log(`   Content: ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`)
      console.log('')
    })

    // Update lead
    console.log('💾 Writing to Sanity...')
    await client.patch(lead._id).set({ messages }).commit()
    console.log('✅ Migration complete!\n')

    // Fetch back to verify
    const updated = await client.fetch(
      `*[_id == "dbr-447521656647"][0] { messages }`
    )

    console.log(`🔍 Verification: Lead now has ${updated.messages?.length || 0} structured messages`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testMigrateCharlie()
