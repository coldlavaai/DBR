# AI Assistant Setup Guide

## 🎯 What We Built

An enterprise-grade AI-powered sales analytics assistant integrated directly into your DBR Dashboard. This uses **Claude 3.5 Sonnet** from Anthropic to provide intelligent insights about your leads, performance metrics, and sales patterns.

## ✨ Features

### Conversational Analytics
- Ask natural language questions about your data
- Get instant insights with context and trends
- Compare performance across time periods
- Identify patterns and actionable opportunities

### Intelligent Tools (5 core capabilities)
1. **Dashboard Metrics**: "How many hot leads today?" "What's our reply rate?"
2. **Lead Search**: "Show me my hottest leads" "Who needs attention?"
3. **Performance Comparison**: "Compare this week to last week"
4. **Pattern Analysis**: "What are the most common objections?"
5. **Actionable Insights**: "Who should I contact right now?"

### Enterprise-Grade Architecture
- ✅ Full error handling and graceful degradation
- ✅ Input validation and sanitization
- ✅ Proper logging for debugging
- ✅ Dark theme UI matching dashboard aesthetic
- ✅ Suggested questions for quick queries
- ✅ Real-time data from Sanity database
- ✅ Cost-optimized with Claude 3.5 Sonnet

## 🔧 Setup Instructions

### Step 1: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in with your account
3. Navigate to "API Keys" in the dashboard
4. Click "Create Key"
5. Copy your API key (it starts with `sk-ant-...`)

### Step 2: Add API Key to Environment

Open `.env.local` and add your API key:

```bash
# Anthropic API (for AI Assistant feature)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Step 3: Restart Development Server

```bash
# Kill existing servers
pkill -f "next dev"

# Start fresh
npm run dev
```

### Step 4: Test the AI Assistant

1. Open dashboard at http://localhost:3000
2. Look for the search bar with toggle: **Search Leads | Ask AI**
3. Click "Ask AI" tab
4. Try these test questions:
   - "How are we performing today?"
   - "Show me my hottest leads"
   - "Compare this week to last week"
   - "What are the most common objections?"

## 💰 Cost Estimate

Using **Claude 3.5 Sonnet**:
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens
- Average query: ~500-1000 tokens total
- **Cost per query**: ~$0.01-0.02
- **Monthly cost (1000 queries)**: ~$10-20

This is extremely cost-effective for the intelligence provided.

## 🔒 Security

The system is constrained to ONLY answer questions about:
- Lead data and metrics
- Sales performance
- Conversation patterns
- Dashboard statistics

It **cannot**:
- Answer general knowledge questions
- Access external APIs
- Read/write files outside the database
- Execute arbitrary code

## 🎨 UI Features

### Dark Theme Integration
- Matches dashboard color scheme (coldlava-cyan/purple)
- Glassmorphism effects with backdrop blur
- Smooth animations and transitions

### Suggested Questions
When you click "Ask AI" without typing, you'll see:
- How are we performing today?
- Who should I contact right now?
- What are the most common objections?
- Compare this week to last week
- Show me my hottest leads

### Smart Loading States
- Animated spinner while processing
- "Analyzing your data..." message
- Graceful error handling with retry options

## 🔍 Example Queries

### Performance Metrics
```
"How many hot leads do we have?"
"What's our reply rate this month?"
"How many calls have we booked?"
```

### Comparisons
```
"How does today compare to yesterday?"
"Compare this week to last week"
"What changed in our metrics?"
```

### Lead Intelligence
```
"Show me leads that need attention"
"Who are my hottest leads?"
"Which warm leads should I prioritize?"
```

### Pattern Analysis
```
"What are people saying when they reject?"
"What do positive leads mention most?"
"What are the common objections?"
```

## 🚀 Production Deployment

### Vercel Environment Variable

1. Go to https://vercel.com/coldlavaai/greenstar-dbr-dashboard/settings/environment-variables
2. Add new variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-your-key-here`
   - Environments: Production, Preview, Development
3. Redeploy: `git push origin main`

### Adding to Cold Lava Credentials

Add to `~/.claude_credentials`:

```bash
# ----------------
# Anthropic API
# ----------------
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
# Used for: AI Assistant in DBR Dashboard
```

Then source it:
```bash
source ~/.claude_credentials
```

## 🐛 Troubleshooting

### "API key not configured" Error
- Check `.env.local` has the key
- Restart dev server after adding key
- Verify no extra spaces in the key

### "Failed to process query" Error
- Check API key is valid
- Check internet connection
- View console logs for detailed error

### No Response from AI
- Open browser console (F12)
- Look for network errors
- Check `/api/ai-query` endpoint logs

### Slow Responses
- Normal for complex queries (2-5 seconds)
- Claude Sonnet processes ~40 tokens/second
- Queries requiring multiple tools take longer

## 📊 Monitoring & Logs

Development logs show:
```
🤖 AI Query: <user question>
📊 Claude response: tool_use blocks: 2
🔧 Executing tool: get_dashboard_metrics
✅ Tool result: {...}
🎯 Final response: end_turn
```

Check these to debug issues or understand query flow.

## 🎯 Next Steps (Optional Enhancements)

Future improvements you could add:
1. **Voice Input**: Browser speech API for voice queries
2. **Query History**: Save recent questions for quick re-run
3. **Export Insights**: Save AI responses as reports
4. **Scheduled Reports**: "Send me weekly performance summary"
5. **Proactive Alerts**: AI notifies when metrics drop
6. **Team Insights**: Compare team member performance

## 📞 Support

If you encounter issues:
1. Check console logs (browser + server)
2. Verify API key is correctly set
3. Test with simple query first: "How many hot leads?"
4. Check Anthropic API status: https://status.anthropic.com/

---

**Built with Claude 3.5 Sonnet | Enterprise-Grade AI for Sales Teams**
