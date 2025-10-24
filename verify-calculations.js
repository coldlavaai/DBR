const { createClient } = require('@sanity/client')

const client = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function verify() {
  const allLeads = await client.fetch('*[_type == "dbrLead"]')

  console.log('=== METRIC VERIFICATION ===\n')

  // Only count leads that have been sent messages (not "Ready")
  const contactedLeads = allLeads.filter(l => l.contactStatus !== 'Ready')

  console.log(`Total Leads in DB: ${allLeads.length}`)
  console.log(`Ready (not contacted): ${allLeads.filter(l => l.contactStatus === 'Ready').length}`)
  console.log(`Contacted Leads: ${contactedLeads.length}\n`)

  // Messages sent (only from leads that have messages)
  const m1 = allLeads.filter(l => l.m1Sent).length
  const m2 = allLeads.filter(l => l.m2Sent).length
  const m3 = allLeads.filter(l => l.m3Sent).length
  const totalMessages = m1 + m2 + m3

  console.log('MESSAGES SENT (Should match top card):')
  console.log(`  M1: ${m1}`)
  console.log(`  M2: ${m2}`)
  console.log(`  M3: ${m3}`)
  console.log(`  Total: ${totalMessages}\n`)

  // Replies
  const replied = allLeads.filter(l => l.replyReceived).length
  const replyRate = ((replied / totalMessages) * 100).toFixed(1)

  console.log('REPLY RATE (Should match top card):')
  console.log(`  Replied: ${replied} leads`)
  console.log(`  Reply Rate: ${replyRate}%\n`)

  // Hot Leads
  const hot = allLeads.filter(l => l.contactStatus === 'HOT' && l.archived !== true).length
  console.log(`HOT LEADS (Should match top card): ${hot}\n`)

  // Calls Booked
  const callsBooked = allLeads.filter(l => l.contactStatus === 'CALL_BOOKED' && l.archived !== true).length
  console.log(`CALLS BOOKED (Should match top card): ${callsBooked}\n`)

  // Sentiment counts
  const sentiment = {
    POSITIVE: allLeads.filter(l => l.leadSentiment === 'POSITIVE').length,
    NEGATIVE: allLeads.filter(l => l.leadSentiment === 'NEGATIVE').length,
    NEUTRAL: allLeads.filter(l => l.leadSentiment === 'NEUTRAL').length,
    NEGATIVE_REMOVED: allLeads.filter(l => l.leadSentiment === 'NEGATIVE_REMOVED').length,
    UNCLEAR: allLeads.filter(l => l.leadSentiment === 'UNCLEAR').length,
    UNSURE: allLeads.filter(l => l.leadSentiment === 'UNSURE').length,
  }

  console.log('SENTIMENT BREAKDOWN (Should match sentiment section):')
  Object.entries(sentiment).forEach(([key, val]) => {
    console.log(`  ${key}: ${val}`)
  })

  const totalWithSentiment = Object.values(sentiment).reduce((a, b) => a + b, 0)
  console.log(`  Total with sentiment: ${totalWithSentiment}`)
  console.log(`  No sentiment: ${allLeads.length - totalWithSentiment}\n`)

  // Check for discrepancies
  console.log('=== CHECKING FOR DISCREPANCIES ===\n')

  // Find leads with M1 sent but status is not Sent_1
  const m1SentButNotSent1 = allLeads.filter(l => l.m1Sent && l.contactStatus !== 'Sent_1')
  console.log(`Leads with M1 sent but status != Sent_1: ${m1SentButNotSent1.length}`)
  if (m1SentButNotSent1.length > 0) {
    console.log('  (This is NORMAL - they progressed to other statuses)')
    const statusBreakdown = {}
    m1SentButNotSent1.forEach(l => {
      statusBreakdown[l.contactStatus] = (statusBreakdown[l.contactStatus] || 0) + 1
    })
    console.log('  Status breakdown of these leads:')
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`)
    })
  }
}

verify().catch(console.error)
