# Claude Code - Mistakes & Lessons Learned

**Purpose:** Track errors, oversights, and lessons to prevent repeat mistakes

---

## 2025-10-30 - Sophie HQ Conversation Parser Failure

### What Went Wrong:
Built entire conversation analysis system WITHOUT checking actual database format first

### The Mistake:
- Assumed conversation format: `AI (30/10/2025 19:15): message`
- Actual database format: `[19:15 30/10/2025] AI: message`
- Parser regex didn't match → ZERO conversations parsed → Sophie HQ completely non-functional

### What Should Have Been Done:
1. **FIRST**: Query database and inspect actual conversation samples
2. **THEN**: Write parser to match actual format
3. **THEN**: Test parser with real data samples
4. **FINALLY**: Build UI and features

### Impact:
- Wasted 1+ hour building features on broken foundation
- User frustration from navigating to wrong URL (Greenstar vs DBR)
- Multiple deploy cycles fixing what should have been caught immediately

### Lesson:
**ALWAYS validate data format FIRST before building parsers/processors**
- Use browser console or API to inspect actual data
- Test regex patterns against real samples
- Verify parsing works BEFORE building UI

---

## 2025-10-30 - Wrong Vercel URL

### What Went Wrong:
Navigated to `greenstarwebsiteupgrade.vercel.app` instead of correct DBR dashboard URL

### The Mistake:
- Two separate Vercel projects: Greenstar Solar website upgrade vs DBR Dashboard
- Confused which deployment to check
- User had to correct me aggressively

### What Should Have Been Done:
1. Check `vercel ls` to see actual deployment URLs
2. Verify repo with `git remote -v`
3. Use correct URL from start

### Lesson:
**Verify deployment URLs before navigating - check `vercel ls` FIRST**

---

## General Reminders

### Before Starting Any Feature:
1. ✅ Understand actual data format (query samples)
2. ✅ Verify deployment URLs and repos
3. ✅ Test critical functions with real data FIRST
4. ✅ Build incrementally and test each piece
5. ✅ Don't assume - validate

### When Building Data Processors:
1. ✅ Query actual data samples FIRST
2. ✅ Test regex/parsers against real examples
3. ✅ Log parsed output to verify correctness
4. ✅ Handle multiple formats gracefully
5. ✅ Add error logging for debugging

### When Debugging:
1. ✅ Check browser console logs
2. ✅ Test API endpoints directly
3. ✅ Inspect actual database records
4. ✅ Don't claim it works until proven

---

## 2025-10-30 - Used Wrong AI API (OpenAI instead of Claude)

### What Went Wrong:
Implemented conversation analysis using OpenAI API when user explicitly wanted Claude/Anthropic

### The Mistake:
- User requested using Claude for analysis
- I implemented using `gpt-4o` via OpenAI API
- Caused 100% analysis failures due to missing OPENAI_API_KEY
- Wasted time debugging when root cause was wrong API entirely

### What Should Have Been Done:
1. Confirm which AI API to use BEFORE writing code
2. Use Anthropic Claude API (already have ANTHROPIC_API_KEY in Vercel)
3. Reference user preferences from conversation history

### Impact:
- All 100 conversation analyses failed
- Additional debugging time wasted
- Need to rewrite API integration

### Lesson:
**Always confirm API/service choices with user BEFORE implementation**
- Review conversation history for user preferences
- Don't assume - ask or reference earlier decisions
- Verify environment variables match chosen services

---

## 2025-10-30 - Wrong Claude Model Name

### What Went Wrong:
Used non-existent Claude model name `claude-3-5-sonnet-20241022` causing all analyses to fail with 404 errors

### The Mistake:
- Used incorrect date in model name (20241022 doesn't exist)
- Correct model: `claude-3-5-sonnet-20240620`
- Error was hidden by poor error handling (initially just said "Analysis failed")

### What Should Have Been Done:
1. Check Anthropic API documentation for correct model names BEFORE writing code
2. Implement detailed error logging from the start
3. Test with a single API call before processing 100 conversations

### Lesson:
**Always verify API model names/endpoints from official documentation**
**Implement detailed error logging immediately, not as an afterthought**

---

## 2025-10-30 - Parser Format Mismatch (Multiple Formats)

### What Went Wrong:
Conversation history contained MULTIPLE formats mixed together, causing Sophie to confuse AI vs customer messages

### The Mistake:
- Assumed all messages had timestamps in format `[HH:MM DD/MM/YYYY] Sender: message`
- Actual data had THREE formats:
  1. Old M1/M2: `AI: message` (no timestamp)
  2. Newer M3: `[timestamp] AI: message`
  3. Customer replies: `[timestamp] CustomerName: message`
- Parser only handled timestamped messages, causing M1/M2 to be skipped
- But they were still in conversationHistory string shown in UI
- Display logic incorrectly identified which messages were AI vs customer

### What Should Have Been Done:
1. Check ALL possible message formats in actual data FIRST
2. Handle ALL formats consistently in parser
3. Either parse all formats OR explicitly skip unwanted formats
4. Test display logic with actual mixed-format data

### Impact:
- Sophie incorrectly labeled customer messages as "What AI Said"
- User saw "stop spamming me" (customer message) labeled as AI response
- Multiple hours debugging parser logic
- Had to delete and re-analyze all conversations multiple times

### Lesson:
**When parsing user-generated data, ALWAYS check for format variations**
- Real-world data often has multiple formats from system evolution
- Test parser with actual data samples, not assumed formats
- Make parser decisions explicit (skip vs parse)
- Test UI display with same mixed data

---

**Last Updated:** 2025-10-30
