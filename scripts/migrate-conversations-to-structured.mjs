#!/usr/bin/env node

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

/**
 * Parse timestamp from various formats
 */
function parseTimestamp(timestampStr, dateStr) {
  try {
    // Format 1: "19:15 30/10/2025" (time first, then date)
    if (timestampStr && timestampStr.includes(' ')) {
      const [time, date] = timestampStr.split(' ')
      const [hours, minutes] = time.split(':')
      const [day, month, year] = date.split('/')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
    }

    // Format 2: "30/10/2025 19:15" (date first, then time)
    if (dateStr) {
      const [date, time] = dateStr.split(' ')
      const [day, month, year] = date.split('/')
      const [hours, minutes] = time.split(':')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
    }

    // Format 3: "30/10/2025, 19:06" (comma separator)
    if (timestampStr && timestampStr.includes(',')) {
      const [date, time] = timestampStr.split(', ')
      const [day, month, year] = date.split('/')
      const [hours, minutes] = time.split(':')
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes))
    }

    return null
  } catch (error) {
    console.error('Failed to parse timestamp:', timestampStr, dateStr, error)
    return null
  }
}

/**
 * Detect template type from message content
 */
function detectTemplateType(content) {
  // M1: "Hi, is this the same [Name] who enquired about solar panels"
  const isM1 = content.includes('is this the same') && content.includes('who enquired about solar panels')

  // M2: "Just checking in again" + "Are you still thinking about going solar"
  const isM2 = content.includes('Just checking in again') &&
               content.includes('Are you still thinking about going solar')

  // M3: "Just checking in one last time" + "If you're still curious"
  const isM3 = content.includes('Just checking in one last time') &&
               content.includes("If you're still curious")

  if (isM1) return 'M1'
  if (isM2) return 'M2'
  if (isM3) return 'M3'
  return null
}

/**
 * Parse conversationHistory string into structured messages
 */
function parseConversationHistory(conversationHistory, leadName) {
  if (!conversationHistory || !conversationHistory.trim()) {
    return []
  }

  const messages = []
  const lines = conversationHistory.split('\n')

  for (const line of lines) {
    if (!line.trim()) continue // Skip empty lines

    // Format 1: [19:15 30/10/2025] AI: message
    const format1 = line.match(/\[(\d{2}:\d{2} \d{2}\/\d{2}\/\d{4})\] ([^:]+): (.+)/)

    // Format 2: AI (30/10/2025 19:15): message
    const format2AI = line.match(/AI \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)

    // Format 3: Lead (30/10/2025 19:15): message
    const format2Lead = line.match(/Lead \((\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\): (.+)/)

    // Format 4: [30/10/2025, 19:06] MANUAL: message
    const format3Manual = line.match(/\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2})\] MANUAL: (.+)/)

    // Format 5: Simple AI: message (template, no timestamp)
    const simpleAI = line.match(/^AI: (.+)/)

    if (format1) {
      const [, timestamp, sender, content] = format1
      const parsedTimestamp = parseTimestamp(timestamp)

      if (!parsedTimestamp) {
        console.warn('Failed to parse timestamp:', timestamp)
        continue
      }

      const senderType = sender.trim() === 'AI' ? 'ai' :
                        sender.trim() === 'MANUAL' ? 'manual' : 'customer'

      const templateType = senderType === 'ai' ? detectTemplateType(content) : null

      // Skip empty messages (blank content after colon)
      if (!content.trim()) {
        console.log('Skipping empty message at:', timestamp)
        continue
      }

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
    } else if (simpleAI) {
      const [, content] = simpleAI

      if (!content.trim()) continue

      const templateType = detectTemplateType(content)

      // Use a fallback timestamp (epoch) for template messages without timestamps
      messages.push({
        _type: 'object',
        _key: `msg_template_${Date.now()}_${Math.random()}`,
        timestamp: new Date(0).toISOString(), // Epoch - will be sorted first
        sender: 'ai',
        senderName: 'AI Agent',
        content: content.trim(),
        messageType: 'automated',
        templateType: templateType || 'M1',
      })
    }
  }

  // Sort messages by timestamp to ensure chronological order
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return messages
}

/**
 * Migrate all leads
 */
async function migrateAllLeads() {
  try {
    console.log('🚀 Starting conversation migration to structured format...\n')

    // Fetch all leads with conversationHistory
    const leads = await client.fetch(
      `*[_type == "dbrLead" && defined(conversationHistory) && conversationHistory != ""] {
        _id,
        firstName,
        secondName,
        conversationHistory,
        messages
      }`
    )

    console.log(`📊 Found ${leads.length} leads with conversation history\n`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const lead of leads) {
      try {
        // Skip if already migrated
        if (lead.messages && lead.messages.length > 0) {
          console.log(`⏭️  Skipping ${lead.firstName} ${lead.secondName} - already has structured messages`)
          skipped++
          continue
        }

        const leadName = `${lead.firstName}${lead.secondName ? ' ' + lead.secondName : ''}`
        console.log(`🔄 Migrating: ${leadName} (${lead._id})`)

        // Parse conversation into structured messages
        const messages = parseConversationHistory(lead.conversationHistory, lead.firstName)

        if (messages.length === 0) {
          console.log(`   ⚠️  No valid messages found, skipping`)
          skipped++
          continue
        }

        console.log(`   📝 Parsed ${messages.length} messages`)

        // Update lead with structured messages
        await client
          .patch(lead._id)
          .set({ messages })
          .commit()

        console.log(`   ✅ Migrated ${messages.length} messages\n`)
        migrated++

        // Rate limiting - don't hammer Sanity
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`   ❌ Error migrating ${lead.firstName}:`, error)
        errors++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`✅ Migrated: ${migrated}`)
    console.log(`⏭️  Skipped (already migrated): ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📈 Total processed: ${leads.length}`)
    console.log('='.repeat(60))

    if (migrated > 0) {
      console.log('\n✨ Migration complete! Structured messages now available.')
      console.log('🔍 Next: Update Sophie analysis to use structured data')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

migrateAllLeads()
