// Quick audit script to verify data calculations
const { createClient } = require('@sanity/client')

const client = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function audit() {
  const leads = await client.fetch('*[_type == "dbrLead"]')

  console.log('=== DATA AUDIT ===\n')
  console.log(`Total Leads: ${leads.length}`)

  // Messages sent
  const m1Count = leads.filter(l => l.m1Sent).length
  const m2Count = leads.filter(l => l.m2Sent).length
  const m3Count = leads.filter(l => l.m3Sent).length
  const totalMessages = m1Count + m2Count + m3Count

  console.log(`\nMessages Sent:`)
  console.log(`  M1: ${m1Count}`)
  console.log(`  M2: ${m2Count}`)
  console.log(`  M3: ${m3Count}`)
  console.log(`  Total: ${totalMessages}`)

  // Manual vs AI
  const manualLeads = leads.filter(l => l.manualMode === true)
  const aiLeads = leads.filter(l => l.manualMode !== true)
  const manualM1 = manualLeads.filter(l => l.m1Sent).length
  const manualM2 = manualLeads.filter(l => l.m2Sent).length
  const manualM3 = manualLeads.filter(l => l.m3Sent).length
  const aiM1 = aiLeads.filter(l => l.m1Sent).length
  const aiM2 = aiLeads.filter(l => l.m2Sent).length
  const aiM3 = aiLeads.filter(l => l.m3Sent).length

  console.log(`\nManual Mode:`)
  console.log(`  M1: ${manualM1}, M2: ${manualM2}, M3: ${manualM3}, Total: ${manualM1+manualM2+manualM3}`)
  console.log(`AI Mode:`)
  console.log(`  M1: ${aiM1}, M2: ${aiM2}, M3: ${aiM3}, Total: ${aiM1+aiM2+aiM3}`)

  // Replies
  const repliedLeads = leads.filter(l => l.replyReceived).length
  const replyRate = totalMessages > 0 ? ((repliedLeads / totalMessages) * 100).toFixed(1) : 0

  console.log(`\nReplies:`)
  console.log(`  Replied Leads: ${repliedLeads}`)
  console.log(`  Reply Rate: ${replyRate}%`)

  // Status breakdown
  const statuses = {
    Sent_1: leads.filter(l => l.contactStatus === 'Sent_1').length,
    Sent_2: leads.filter(l => l.contactStatus === 'Sent_2').length,
    Sent_3: leads.filter(l => l.contactStatus === 'Sent_3').length,
    COLD: leads.filter(l => l.contactStatus === 'COLD').length,
    NEUTRAL: leads.filter(l => l.contactStatus === 'NEUTRAL').length,
    WARM: leads.filter(l => l.contactStatus === 'WARM').length,
    HOT: leads.filter(l => l.contactStatus === 'HOT').length,
    CALL_BOOKED: leads.filter(l => l.contactStatus === 'CALL_BOOKED').length,
    CONVERTED: leads.filter(l => l.contactStatus === 'CONVERTED').length,
    INSTALLED: leads.filter(l => l.contactStatus === 'INSTALLED').length,
    REMOVED: leads.filter(l => l.contactStatus === 'REMOVED').length,
  }

  console.log(`\nStatus Breakdown:`)
  Object.entries(statuses).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
  const statusTotal = Object.values(statuses).reduce((a, b) => a + b, 0)
  console.log(`  Status Total: ${statusTotal}`)

  // Sentiment breakdown
  const sentiments = {
    POSITIVE: leads.filter(l => l.leadSentiment === 'POSITIVE').length,
    NEGATIVE: leads.filter(l => l.leadSentiment === 'NEGATIVE').length,
    NEUTRAL: leads.filter(l => l.leadSentiment === 'NEUTRAL').length,
    NEGATIVE_REMOVED: leads.filter(l => l.leadSentiment === 'NEGATIVE_REMOVED').length,
    UNCLEAR: leads.filter(l => l.leadSentiment === 'UNCLEAR').length,
    NO_SENTIMENT: leads.filter(l => !l.leadSentiment).length,
  }

  console.log(`\nSentiment Breakdown:`)
  Object.entries(sentiments).forEach(([sentiment, count]) => {
    console.log(`  ${sentiment}: ${count}`)
  })
  const sentimentTotal = Object.values(sentiments).reduce((a, b) => a + b, 0)
  console.log(`  Sentiment Total: ${sentimentTotal}`)

  // Hot leads check
  const hotLeads = leads.filter(l => l.contactStatus === 'HOT')
  console.log(`\nHot Leads Detail:`)
  console.log(`  Count: ${hotLeads.length}`)
  if (hotLeads.length > 0) {
    hotLeads.slice(0, 5).forEach(lead => {
      console.log(`    - ${lead.firstName} ${lead.secondName}: ${lead.phoneNumber}`)
    })
  }
}

audit().catch(console.error)
