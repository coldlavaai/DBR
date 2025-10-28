const testConvo = `AI: Hi Bilal! 😊 Just checking in again. Are you still thinking about going solar? Let me know if you have any questions. I'd love to help!

[12:31 28/10/2025] AI: Just checking in one last time, Bilal. If you're still curious about solar panels, feel free to reach out. We'd love to help! 😊 Best, Sophie, Greenstar Solar

[12:32 28/10/2025] Bilal: Hi Sophie,
I may touch base next year as I am still catching up with few things

Thanks for chasing`

console.log('=== TESTING MESSAGE PARSING ===\n')

// Split by double newlines
const messages = testConvo.split(/\n\n+/).filter(msg => msg.trim())

console.log(`Found ${messages.length} messages\n`)

messages.forEach((msg, idx) => {
  console.log(`--- Message ${idx + 1} ---`)
  console.log('Raw:', JSON.stringify(msg))
  
  const timestampMatch = msg.match(/^\[([^\]]+)\]\s*([^:]+):\s*([\s\S]+)$/)
  
  if (timestampMatch) {
    const [, timestamp, sender, text] = timestampMatch
    console.log('✓ MATCHED!')
    console.log('  Timestamp:', timestamp)
    console.log('  Sender:', sender)
    console.log('  Text:', text.substring(0, 50) + '...')
  } else {
    console.log('✗ NO MATCH - will show as plain text')
  }
  console.log()
})
