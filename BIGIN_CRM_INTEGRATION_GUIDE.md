# Bigin CRM Integration Guide

**Status**: Not Yet Implemented
**Estimated Time**: 3.5 hours
**Complexity**: Medium (OAuth setup is the tricky part)
**Last Updated**: 2025-10-27

---

## 📋 Overview

This document outlines the complete integration between the DBR Analytics Dashboard and Bigin CRM. The integration allows one-click export of leads from the dashboard to Bigin CRM, where existing automations add them to the appropriate pipeline.

### User Flow

1. User clicks **"Send to CRM"** button on a lead card
2. Dashboard creates/updates contact in Bigin via API
3. System waits **15 seconds** for Bigin to process
4. Dashboard adds tag "DBR_Dashboard_Import" to contact
5. **Existing Bigin automation** detects tag → Adds contact to pipeline
6. Dashboard shows "✓ In CRM" badge

---

## 🎯 Why This Approach Works

**Tag-Based Automation Benefits:**
- ✅ Leverages existing Bigin workflow logic
- ✅ No need to manage pipeline IDs or stages in code
- ✅ Pipeline rules can change in Bigin without touching code
- ✅ Automatic duplicate detection via upsert
- ✅ Full conversation history preserved
- ✅ Simple one-way sync

**Why the 15-Second Delay?**
- Bigin needs time to fully index the contact
- Ensures tag automation can find the contact
- Allows internal webhooks to process
- Prevents race conditions

---

## 🔐 Authentication Setup (Self-Client OAuth)

### Step 1: Register Self-Client Application

1. Go to: https://api-console.zoho.com/
2. Click **"Add Client"** → Select **"Self Client"**
3. Note down:
   - **Client ID**: `1000.XXXXX`
   - **Client Secret**: `xxxxxxxxxxxxxxxx`

### Step 2: Generate Initial Authorization Code

Visit this URL in your browser (replace `{client_id}` with your actual Client ID):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBigin.modules.contacts.ALL,ZohoBigin.settings.tags.WRITE&client_id={client_id}&response_type=code&access_type=offline&redirect_uri=http://localhost
```

**Important Parameters:**
- `scope`: Both contacts AND tags permissions required
- `access_type=offline`: Critical! Gets you a refresh token that never expires
- `redirect_uri=http://localhost`: Simple redirect for self-client

**After clicking "Approve":**
- Browser redirects to: `http://localhost?code=1000.xxxx...xxxx`
- Copy the **code** parameter (valid for only 2 minutes!)

### Step 3: Exchange Code for Tokens (One-Time Setup)

Run this curl command immediately (within 2 minutes):

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=1000.xxxx...xxxx" \
  -d "client_id=1000.XXXXX" \
  -d "client_secret=xxxxxxxxxxxxxxxx" \
  -d "redirect_uri=http://localhost" \
  -d "grant_type=authorization_code"
```

**Response:**
```json
{
  "access_token": "1000.aaaa...aaaa",
  "refresh_token": "1000.bbbb...bbbb",
  "expires_in": 3600,
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer"
}
```

### Step 4: Store Credentials Securely

Add to `.env.local`:

```env
# Bigin CRM Integration
BIGIN_REFRESH_TOKEN=1000.bbbb...bbbb
BIGIN_CLIENT_ID=1000.XXXXX
BIGIN_CLIENT_SECRET=xxxxxxxxxxxxxxxx
BIGIN_API_DOMAIN=https://www.zohoapis.com
```

**IMPORTANT**: Add `.env.local` to `.gitignore` (already done)

Store in `~/.claude_credentials` for permanent reference:

```bash
# Bigin CRM (Greenstar)
export BIGIN_REFRESH_TOKEN="1000.bbbb...bbbb"
export BIGIN_CLIENT_ID="1000.XXXXX"
export BIGIN_CLIENT_SECRET="xxxxxxxxxxxxxxxx"
```

---

## 🛠️ Required OAuth Scopes

```
ZohoBigin.modules.contacts.ALL
ZohoBigin.settings.tags.WRITE
```

More granular alternative:
```
ZohoBigin.modules.contacts.READ
ZohoBigin.modules.contacts.WRITE
ZohoBigin.modules.contacts.CREATE
ZohoBigin.modules.contacts.UPDATE
ZohoBigin.settings.tags.WRITE
```

---

## 📡 API Endpoints Reference

### 1. Upsert Contact (Create or Update)

**Endpoint:**
```
POST https://www.zohoapis.com/bigin/v2/Contacts/upsert
```

**Headers:**
```
Authorization: Zoho-oauthtoken {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "duplicate_check_fields": ["Email", "Phone"],
  "data": [{
    "Last_Name": "Stray",
    "First_Name": "Oliver",
    "Email": "otatler@gmail.com",
    "Phone": "+447742201349",
    "Street": "123 Solar Street",
    "City": "Fareham",
    "Zip_Code": "CH600DG",
    "Description": "DBR Campaign - Replied 2h ago\n\nConversation history...",
    "Lead_Source": "DBR Dashboard",
    "Lead_Status": "HOT"
  }],
  "trigger": ["workflow"]
}
```

**Response:**
```json
{
  "data": [{
    "code": "SUCCESS",
    "details": {
      "id": "3477061000005623115",
      "action": "insert"
    },
    "message": "record added",
    "status": "success"
  }]
}
```

**Key Points:**
- `duplicate_check_fields`: Checks Email AND Phone before creating
- If match found → Updates existing contact (action: "update")
- If no match → Creates new contact (action: "insert")
- Returns contact ID for use in Step 2

### 2. Add Tag to Contact

**Endpoint:**
```
POST https://www.zohoapis.com/bigin/v1/Contacts/{contact_id}/actions/add_tags?tag_names=DBR_Dashboard_Import&over_write=false
```

**Headers:**
```
Authorization: Zoho-oauthtoken {access_token}
```

**Parameters:**
- `contact_id`: From upsert response
- `tag_names`: Comma-separated tags (e.g., "DBR_Dashboard_Import,Hot_Lead")
- `over_write`: false (keeps existing tags)

**Response:**
```json
{
  "data": [{
    "code": "SUCCESS",
    "details": {
      "id": "3477061000005623115",
      "tags": [
        { "name": "DBR_Dashboard_Import" }
      ]
    },
    "message": "tags added successfully",
    "status": "success"
  }]
}
```

### 3. Refresh Access Token

**Endpoint:**
```
POST https://accounts.zoho.com/oauth/v2/token
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Body:**
```
refresh_token={BIGIN_REFRESH_TOKEN}
client_id={BIGIN_CLIENT_ID}
client_secret={BIGIN_CLIENT_SECRET}
grant_type=refresh_token
```

**Response:**
```json
{
  "access_token": "1000.new...token",
  "api_domain": "https://www.zohoapis.com",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Note**: Access tokens last 1 hour. Refresh tokens never expire.

---

## 💻 Implementation Code

### Backend API Route

Create: `app/api/send-to-bigin/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export const dynamic = 'force-dynamic'

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: '2024-01-01',
  useCdn: false,
})

export async function POST(request: Request) {
  const { leadId } = await request.json()

  try {
    // 1. Fetch lead from Sanity
    const lead = await sanityClient.fetch(
      `*[_type == "dbrLead" && _id == $leadId][0]`,
      { leadId }
    )

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // 2. Get fresh Bigin access token
    const accessToken = await getBiginAccessToken()

    // 3. STEP 1: Upsert contact to Bigin
    const contactResponse = await fetch(
      'https://www.zohoapis.com/bigin/v2/Contacts/upsert',
      {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duplicate_check_fields: ['Email', 'Phone'],
          data: [{
            Last_Name: lead.secondName || lead.firstName,
            First_Name: lead.firstName,
            Email: lead.emailAddress || `${lead.phoneNumber}@placeholder.com`,
            Phone: lead.phoneNumber,
            Zip_Code: lead.postcode,
            Street: lead.address,
            Description: formatConversationHistory(lead.conversationHistory),
            Lead_Source: 'DBR Dashboard',
            Lead_Status: lead.contactStatus
          }],
          trigger: ['workflow']
        })
      }
    )

    const contactData = await contactResponse.json()

    if (!contactData.data || contactData.data[0].code !== 'SUCCESS') {
      console.error('Bigin upsert error:', contactData)
      throw new Error('Failed to create contact in Bigin')
    }

    const contactId = contactData.data[0].details.id
    const action = contactData.data[0].details.action // "insert" or "update"

    // 4. WAIT 15 SECONDS for Bigin to fully process the contact
    console.log(`Contact ${action}ed with ID: ${contactId}. Waiting 15 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 15000))

    // 5. STEP 2: Add tag to trigger automation
    const tagResponse = await fetch(
      `https://www.zohoapis.com/bigin/v1/Contacts/${contactId}/actions/add_tags?tag_names=DBR_Dashboard_Import&over_write=false`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        }
      }
    )

    const tagData = await tagResponse.json()

    if (!tagData.data || tagData.data[0].code !== 'SUCCESS') {
      console.error('Bigin tag error:', tagData)
      throw new Error('Failed to add tag to contact')
    }

    // 6. Update Sanity with CRM sync status
    await sanityClient
      .patch(leadId)
      .set({
        biginContactId: contactId,
        crmStatus: 'SENT',
        lastSyncedAt: new Date().toISOString()
      })
      .commit()

    return NextResponse.json({
      success: true,
      contactId,
      action,
      message: `Contact ${action}ed successfully and tagged in Bigin`
    })

  } catch (error: any) {
    console.error('Error sending to Bigin:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send to Bigin' },
      { status: 500 }
    )
  }
}

// Helper: Format conversation history for Bigin Description field
function formatConversationHistory(history: any): string {
  if (!history || history.length === 0) {
    return 'No conversation history available'
  }

  return history
    .map((msg: any) => {
      const timestamp = new Date(msg.timestamp).toLocaleString('en-GB')
      const sender = msg.from === 'ai' ? 'AI' : 'Lead'
      return `[${timestamp}] ${sender}: ${msg.message}`
    })
    .join('\n\n')
    .substring(0, 30000) // Bigin Description field max: 32,000 chars
}

// Helper: Refresh Bigin access token using refresh token
async function getBiginAccessToken(): Promise<string> {
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.BIGIN_REFRESH_TOKEN!,
      client_id: process.env.BIGIN_CLIENT_ID!,
      client_secret: process.env.BIGIN_CLIENT_SECRET!,
      grant_type: 'refresh_token'
    })
  })

  const data = await response.json()

  if (!data.access_token) {
    console.error('Token refresh error:', data)
    throw new Error('Failed to refresh Bigin access token')
  }

  return data.access_token
}
```

---

### Frontend Button Component

Update: `components/LeadCard.tsx`

```typescript
// Add imports
import { Send, Check, Loader } from 'lucide-react'
import { useState } from 'react'

// Add state variables inside component
const [sendingToCRM, setSendingToCRM] = useState(false)
const [crmStatus, setCrmStatus] = useState(lead.crmStatus || 'NOT_SENT')

// Add handler function
const handleSendToCRM = async () => {
  if (!confirm(`Send "${lead.firstName} ${lead.secondName}" to Bigin CRM?`)) {
    return
  }

  setSendingToCRM(true)

  try {
    const response = await fetch('/api/send-to-bigin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead._id })
    })

    const data = await response.json()

    if (data.success) {
      setCrmStatus('SENT')
      // Show success toast (if you have toast notifications)
      alert(`✓ Contact ${data.action}ed in Bigin CRM!`)

      // Refresh the dashboard to update the lead data
      if (onRefresh) onRefresh()
    } else {
      throw new Error(data.error)
    }
  } catch (error: any) {
    alert(`❌ Failed to send to CRM: ${error.message}`)
  } finally {
    setSendingToCRM(false)
  }
}

// Add button to JSX (next to Archive button)
{crmStatus === 'SENT' ? (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg">
    <Check className="w-4 h-4 text-green-400" />
    <span className="text-xs text-green-300">In CRM</span>
  </div>
) : (
  <button
    onClick={handleSendToCRM}
    disabled={sendingToCRM}
    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-xs text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {sendingToCRM ? (
      <span className="flex items-center gap-1.5">
        <Loader className="w-3 h-3 animate-spin" />
        Sending... (15s)
      </span>
    ) : (
      <span className="flex items-center gap-1.5">
        <Send className="w-3 h-3" />
        Send to CRM
      </span>
    )}
  </button>
)}
```

---

### Sanity Schema Update

Update: `sanity/schemas/dbrLead.ts`

Add these fields to the schema:

```typescript
{
  name: 'biginContactId',
  title: 'Bigin Contact ID',
  type: 'string',
  description: 'Contact ID in Bigin CRM (if sent)',
},
{
  name: 'crmStatus',
  title: 'CRM Status',
  type: 'string',
  options: {
    list: [
      { title: 'Not Sent', value: 'NOT_SENT' },
      { title: 'Sent to CRM', value: 'SENT' },
      { title: 'Send Failed', value: 'FAILED' }
    ]
  },
  initialValue: 'NOT_SENT'
},
{
  name: 'lastSyncedAt',
  title: 'Last Synced to CRM At',
  type: 'datetime',
  description: 'When this lead was last synced to Bigin'
}
```

---

## 🚧 Common OAuth Issues & Solutions

### Problem 1: OAUTH_SCOPE_MISMATCH
- **Cause**: Token generated with wrong/insufficient scope
- **Fix**: Delete old token, regenerate with ALL required scopes
- **Prevention**: Always include both `contacts.ALL` and `tags.WRITE`

### Problem 2: invalid_code Error
- **Cause**: Authorization code expired (only valid 2 minutes)
- **Fix**: Generate new code, exchange immediately
- **Prevention**: Have curl command ready before generating code

### Problem 3: No Refresh Token Returned
- **Cause**: Forgot `access_type=offline` in authorization URL
- **Fix**: Regenerate with `access_type=offline`
- **Check**: Refresh token should start with `1000.`

### Problem 4: Multi-Organization Confusion
- **Cause**: Bigin allows multiple orgs, token tied to wrong one
- **Fix**: Log out, log into correct Bigin org, then generate code
- **Check**: Verify you're in the Greenstar org before OAuth

### Problem 5: Rate Limiting
- **Limit**: 5 token generation requests per minute
- **Fix**: Store refresh token permanently, don't regenerate
- **Note**: Refresh tokens never expire unless manually revoked

### Problem 6: Token Refresh Fails
- **Cause**: Refresh token was revoked or client secret changed
- **Fix**: Go through full OAuth flow again to get new refresh token
- **Prevention**: Never commit credentials to Git

---

## ⚠️ Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| Tag doesn't exist in Bigin | Create tag manually in Bigin Settings first |
| Wrong organization selected | Ensure correct Bigin org active during OAuth |
| Token expires mid-operation | Implement retry logic with fresh token |
| Conversation too long for Description | Truncated to 30,000 chars in code |
| Rate limiting (100 contacts/call) | Not an issue for one-at-a-time sends |
| Upsert finds wrong duplicate | Adjust `duplicate_check_fields` if needed |
| 15-second wait times out | Increase to 20-30 seconds if needed |
| Automation doesn't trigger | Check tag name matches exactly in Bigin |

---

## ✅ Testing Checklist

Before deploying to production:

### OAuth Setup
- [ ] Self-client created in Zoho API Console
- [ ] Authorization code generated successfully
- [ ] Access token + refresh token received
- [ ] Refresh token stored in `.env.local`
- [ ] Token refresh function works (generates new access token)

### Contact Creation
- [ ] New contact creates successfully in Bigin
- [ ] Existing contact updates (no duplicate created)
- [ ] Phone number format preserved (+44...)
- [ ] Email address included
- [ ] Postcode/address fields populated
- [ ] Conversation history appears in Description

### Tagging
- [ ] Tag "DBR_Dashboard_Import" adds successfully after 15s
- [ ] Multiple tags can be added (if needed)
- [ ] Existing tags not overwritten
- [ ] Tag triggers Bigin automation correctly

### Error Handling
- [ ] Invalid lead ID returns 404
- [ ] OAuth failure shows clear error
- [ ] Bigin API down shows error message
- [ ] User can retry failed sends
- [ ] Loading state shows during 15s wait

### Dashboard Updates
- [ ] "In CRM" badge shows after successful send
- [ ] Lead marked as SENT in Sanity
- [ ] biginContactId stored correctly
- [ ] lastSyncedAt timestamp accurate

---

## 📊 Performance Considerations

### API Call Timing
- **Contact Upsert**: ~500-1000ms
- **15-Second Wait**: 15,000ms (required)
- **Tag Addition**: ~300-500ms
- **Total Time**: ~16-17 seconds per lead

### Rate Limits
- **Bigin API**: 5,000 calls/day (free tier)
- **Token Refresh**: 5 calls/minute max
- **Single Lead Send**: ~3 API calls (token + upsert + tag)
- **Daily Capacity**: ~1,666 leads (well above needs)

### Optimization Ideas (Future)
- [ ] Batch send multiple leads (if needed)
- [ ] Cache access token for 1 hour (refresh only when expired)
- [ ] Poll for contact existence instead of blind 15s wait
- [ ] Add progress bar during wait period
- [ ] Queue sends in background (if bulk import needed)

---

## 🎯 Implementation Timeline

When ready to implement:

1. **OAuth Setup** (30 mins)
   - Create self-client
   - Generate tokens
   - Store in `.env.local`

2. **Backend API Route** (1.5 hours)
   - Create `/api/send-to-bigin/route.ts`
   - Implement upsert logic
   - Add 15-second delay
   - Implement tag addition
   - Error handling

3. **Frontend Button** (30 mins)
   - Add button to LeadCard
   - Loading states
   - Success/error handling

4. **Sanity Schema** (10 mins)
   - Add new fields
   - Deploy schema changes

5. **Testing** (1 hour)
   - Test all scenarios
   - Verify automation triggers
   - Check error handling

**Total**: ~3.5 hours

---

## 📝 Notes & Decisions

### Why Upsert Instead of Insert?
- Prevents accidental duplicates
- Handles re-sends gracefully
- Updates contact if phone/email already exists

### Why 15-Second Delay?
- Bigin needs time to index new contacts
- Tag automation must be able to find contact
- Polling would be more elegant but adds complexity

### Why Tag-Based Instead of Direct Pipeline?
- Leverages existing Bigin automation rules
- Pipeline logic stays in Bigin (easier to modify)
- Avoids hardcoding pipeline IDs in code
- More flexible for future changes

### What Gets Synced?
- **Name**: First name + Last name
- **Contact**: Phone + Email
- **Location**: Postcode + Address
- **Context**: Full conversation history in Description
- **Source**: "DBR Dashboard" tag
- **Status**: Current contact status (HOT, WARM, etc.)

### What Doesn't Get Synced?
- Lead ID (internal to dashboard)
- Manual mode flag
- Archive status
- Notes (could be added if needed)
- Booking history (separate system)

---

## 🔒 Security Considerations

- ✅ Refresh token stored in `.env.local` (not committed to Git)
- ✅ Access token generated on-demand (expires after 1 hour)
- ✅ API route server-side only (no client-side exposure)
- ✅ Credentials backed up in `~/.claude_credentials`
- ✅ OAuth scopes limited to minimum required permissions
- ⚠️ Conversation history may contain PII (already in Bigin DB)

---

## 🚀 Deployment Notes

### Environment Variables (Vercel)
Add these to Vercel project settings:

```
BIGIN_REFRESH_TOKEN=1000.xxx...
BIGIN_CLIENT_ID=1000.xxx...
BIGIN_CLIENT_SECRET=xxx...
```

### Git Commit Message (When Implemented)
```
Add Bigin CRM integration with tag-based automation

- Create /api/send-to-bigin route for contact upsert
- Implement 15-second delay before tagging
- Add "Send to CRM" button to lead cards
- Track CRM sync status in Sanity
- OAuth self-client authentication with refresh tokens
- Conversation history included in contact description

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📚 Additional Resources

### Official Documentation
- Bigin API Docs: https://www.bigin.com/developer/docs/apis/v2/
- Upsert Records: https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
- Add Tags: https://www.bigin.com/developer/docs/apis/add-tags-records.html
- OAuth Setup: https://www.bigin.com/developer/docs/apis/v2/oauth-overview.html

### Useful Tools
- Zoho API Console: https://api-console.zoho.com/
- Postman Collection: Could create one for testing
- Token Tester: Use curl to verify tokens work

---

**Document Created**: 2025-10-27
**For Project**: Greenstar DBR Dashboard
**Client**: Greenstar Solar
**Developer**: Cold Lava AI (Oliver Tatler)

---

*This integration is ready to implement when needed. All research complete, code examples provided, OAuth flow documented.*
