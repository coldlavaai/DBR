# Twilio Setup for Manual SMS Control

## Overview
The dashboard uses the **same Twilio number** that's configured in your n8n workflows to ensure message continuity and proper conversation threading.

## Environment Variables Required

### Vercel Environment Variables (Dashboard)
Add these to your Vercel project settings:

```bash
TWILIO_ACCOUNT_SID=AC... (your Twilio account SID)
TWILIO_AUTH_TOKEN=... (your Twilio auth token)
TWILIO_GREENSTAR_SMS=+44... (your Greenstar SMS number - MUST match n8n)
```

### How to Add in Vercel
1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add each variable with the values from your `~/.claude_credentials` file
3. Select **All** environments (Production, Preview, Development)
4. Click **Save**
5. Redeploy the application

## Same Number as n8n

✅ **Critical:** The number must be identical to your n8n Twilio configuration

**n8n Twilio Number:** `TWILIO_GREENSTAR_SMS`
**Dashboard Twilio Number:** `TWILIO_GREENSTAR_SMS`

### Why This Matters
- Messages sent from the dashboard appear in the same conversation thread
- Replies are routed correctly to your n8n webhooks
- Conversation history is continuous and accurate
- Customers see one consistent sender number

## Twilio Credentials Location

Your Twilio credentials are stored in `~/.claude_credentials`:

```bash
# Twilio (Greenstar SMS)
export TWILIO_ACCOUNT_SID="..."
export TWILIO_AUTH_TOKEN="..."
export TWILIO_GREENSTAR_SMS="+44..."
export TWILIO_GREENSTAR_SMS_SID="..."
```

## Testing the Integration

### 1. Verify Environment Variables
```bash
# Check if variables are set in Vercel
vercel env ls

# Or check in the Vercel dashboard
https://vercel.com/coldlavaai/greenstar-dbr-dashboard/settings/environment-variables
```

### 2. Test API Endpoint
```bash
# Test send-sms endpoint (replace with actual lead data)
curl -X POST https://greenstar-dbr-dashboard.vercel.app/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test-lead-id",
    "phoneNumber": "+44YOUR_TEST_NUMBER",
    "message": "Test message from dashboard"
  }'
```

### 3. Check Twilio Logs
- Go to https://console.twilio.com/us1/monitor/logs/sms
- Verify messages appear from the correct sender number
- Check that the "From" number matches your n8n messages

## Message Flow

### Automated (n8n)
```
n8n → Twilio API → Customer (+44...)
   ↓
Using TWILIO_GREENSTAR_SMS
```

### Manual (Dashboard)
```
Dashboard → API → Twilio API → Customer (+44...)
                    ↓
              Using TWILIO_GREENSTAR_SMS (same number!)
```

### Reply
```
Customer → Twilio → n8n Webhook
                  ↓
            Dashboard shows in conversation history
```

## Conversation History

The SMS Chat Modal fetches conversation history from Twilio using:

```typescript
// Fetches ALL messages between TWILIO_GREENSTAR_SMS and the lead
// Includes:
// - Messages sent by n8n (automated)
// - Messages sent by dashboard (manual)
// - Replies from the customer
```

### What You'll See in the Chat
- **Green/Purple Gradient Bubbles:** Messages FROM Greenstar (n8n or dashboard)
- **White/Gray Bubbles:** Messages FROM the customer
- **Timestamps:** When each message was sent
- **Status:** Delivery status for sent messages

## Security Notes

⚠️ **Never commit credentials to GitHub**

✅ **Store in environment variables:**
- Vercel environment variables (dashboard)
- n8n credentials store (workflow)
- `~/.claude_credentials` (local development)

✅ **Restrict API access:**
- Twilio webhook signatures verify requests
- Dashboard uses server-side API routes (not exposed to client)
- Environment variables are only accessible server-side

## Troubleshooting

### Issue: "Twilio credentials not configured"
**Solution:** Environment variables not set in Vercel
1. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_GREENSTAR_SMS
2. Redeploy the application

### Issue: Messages appear from different numbers
**Solution:** n8n and dashboard using different numbers
1. Check n8n Twilio node configuration
2. Compare with TWILIO_GREENSTAR_SMS in Vercel
3. Ensure both use the exact same number

### Issue: Can't fetch conversation history
**Solution:** Twilio API permissions
1. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are correct
2. Verify Twilio account has SMS API access
3. Check Twilio console for any API errors

### Issue: Message sent but doesn't appear in conversation
**Solution:** Wait a few seconds and refresh
1. Twilio API has slight delay (~1-2 seconds)
2. SMS Chat Modal has a refresh button (top right)
3. Conversation history fetches from Twilio directly

## Rate Limits

### Twilio Rate Limits
- **Sending:** 1 message per second per phone number (n8n already handles this)
- **API Requests:** 1,000 requests per second (more than sufficient)

### Dashboard Behavior
- No rate limiting on dashboard side
- User can send multiple messages
- Twilio API will queue messages if needed

## Cost Considerations

### Twilio SMS Pricing
- **Outbound UK SMS:** ~£0.04 per message
- **Inbound UK SMS:** ~£0.01 per message

### Manual vs Automated
- Manual messages cost the same as automated
- No additional fees for dashboard integration
- Same Twilio account, same billing

## Summary

✅ **Setup Complete:**
- Dashboard uses TWILIO_GREENSTAR_SMS (same as n8n)
- Manual messages appear in the same conversation thread
- Conversation history includes all messages (n8n + dashboard)
- Customers see one consistent sender number

⚠️ **Required Actions:**
1. Add Twilio environment variables to Vercel
2. Verify the number matches your n8n configuration
3. Test by sending a manual message from the dashboard
4. Check the message appears in Twilio logs with correct sender

🎯 **End Result:**
- Seamless handoff between AI automation and manual control
- Unified conversation history
- No customer confusion about sender identity
