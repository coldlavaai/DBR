// Comprehensive audit to identify data issues
const { createClient } = require('@sanity/client')

const client = createClient({
  projectId: 'kpz3fwyf',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

async function detailedAudit() {
  const leads = await client.fetch('*[_type == "dbrLead"]')

  console.log('=== COMPREHENSIVE DATA AUDIT ===\n')
  console.log(`Total Leads in Sanity: ${leads.length}\n`)

  // Issue 1: Missing contactStatus
  const leadsWithoutStatus = leads.filter(l => !l.contactStatus || l.contactStatus === '')
  console.log(`❌ ISSUE 1: Leads WITHOUT contactStatus: ${leadsWithoutStatus.length}`)
  if (leadsWithoutStatus.length > 0) {
    console.log(`   Sample leads without status:`)
    leadsWithoutStatus.slice(0, 5).forEach(l => {
      console.log(`     - ${l.firstName} ${l.secondName} (${l.phoneNumber})`)
    })
  }

  // Issue 2: Missing sentiment
  const leadsWithoutSentiment = leads.filter(l => !l.leadSentiment || l.leadSentiment === '')
  console.log(`\n❌ ISSUE 2: Leads WITHOUT sentiment: ${leadsWithoutSentiment.length}`)

  // Check if they have replies but no sentiment
  const repliedButNoSentiment = leads.filter(l => l.replyReceived && (!l.leadSentiment || l.leadSentiment === ''))
  console.log(`   Leads with REPLIES but NO sentiment: ${repliedButNoSentiment.length}`)
  if (repliedButNoSentiment.length > 0) {
    console.log(`   Sample:`)
    repliedButNoSentiment.slice(0, 5).forEach(l => {
      console.log(`     - ${l.firstName} ${l.secondName}: replied but no sentiment`)
    })
  }

  // Issue 3: Verify calculations
  const m1 = leads.filter(l => l.m1Sent).length
  const m2 = leads.filter(l => l.m2Sent).length
  const m3 = leads.filter(l => l.m3Sent).length
  const totalMessages = m1 + m2 + m3
  const replied = leads.filter(l => l.replyReceived).length
  const replyRate = ((replied / totalMessages) * 100).toFixed(1)

  console.log(`\n✅ VERIFIED CALCULATIONS:`)
  console.log(`   Messages: M1=${m1}, M2=${m2}, M3=${m3}, Total=${totalMessages}`)
  console.log(`   Replied: ${replied} leads`)
  console.log(`   Reply Rate: ${replyRate}%`)

  // Issue 4: Status distribution
  console.log(`\n📊 STATUS DISTRIBUTION:`)
  const statuses = {}
  leads.forEach(l => {
    const status = l.contactStatus || 'NULL/EMPTY'
    statuses[status] = (statuses[status] || 0) + 1
  })
  Object.entries(statuses).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })

  // Issue 5: Sentiment distribution
  console.log(`\n📊 SENTIMENT DISTRIBUTION:`)
  const sentiments = {}
  leads.forEach(l => {
    const sentiment = l.leadSentiment || 'NULL/EMPTY'
    sentiments[sentiment] = (sentiments[sentiment] || 0) + 1
  })
  Object.entries(sentiments).sort((a, b) => b[1] - a[1]).forEach(([sentiment, count]) => {
    console.log(`   ${sentiment}: ${count}`)
  })

  // Issue 6: Manual mode distribution
  const manualModeTrue = leads.filter(l => l.manualMode === true).length
  const manualModeFalse = leads.filter(l => l.manualMode === false).length
  const manualModeUndefined = leads.filter(l => l.manualMode === undefined || l.manualMode === null).length

  console.log(`\n📊 MANUAL MODE DISTRIBUTION:`)
  console.log(`   TRUE: ${manualModeTrue}`)
  console.log(`   FALSE: ${manualModeFalse}`)
  console.log(`   UNDEFINED/NULL: ${manualModeUndefined}`)

  // Issue 7: Check archived leads
  const archived = leads.filter(l => l.archived === true).length
  const notArchived = leads.filter(l => l.archived !== true).length

  console.log(`\n📊 ARCHIVED STATUS:`)
  console.log(`   Archived: ${archived}`)
  console.log(`   Not Archived: ${notArchived}`)

  // Summary
  console.log(`\n=== SUMMARY ===`)
  console.log(`Total leads: ${leads.length}`)
  console.log(`❌ Data quality issues found:`)
  console.log(`   1. ${leadsWithoutStatus.length} leads missing contactStatus`)
  console.log(`   2. ${leadsWithoutSentiment.length} leads missing sentiment (${repliedButNoSentiment.length} have replies)`)
  console.log(`\n💡 RECOMMENDATION:`)
  if (leadsWithoutStatus.length > 0) {
    console.log(`   Fix sync to ensure ALL leads get a default contactStatus`)
  }
  if (repliedButNoSentiment.length > 0) {
    console.log(`   Set sentiment for leads that have replied`)
  }
}

detailedAudit().catch(console.error)
