# DBR Dashboard - Database Recovery System

## Overview

Your Sanity Studio now includes a comprehensive **DBR (Database Recovery) Dashboard** for managing your 3-stage SMS follow-up campaigns for solar leads.

## What Was Created

### 1. Sanity Schema (`sanity/schemas/dbrLead.ts`)
A complete schema tracking all DBR lead data including:
- Contact status (HOT, POSITIVE, NEGATIVE, REMOVED, Sent_1/2/3, etc.)
- Lead information (name, phone, email, address, postcode)
- Message timing (M_1, M_2, M_3 sent timestamps)
- Conversation history & AI analysis
- Reply tracking & sentiment analysis
- Installation dates & final outcomes

### 2. Dashboard Views
The dashboard is organized into filtered views:
- **HOT LEADS** - Ready to convert
- **POSITIVE** - Interested leads
- **AWAITING REPLY** - Messages sent, waiting for response
- **SCHEDULED & CONVERTED** - Booked installations
- **NEGATIVE & REMOVED** - Not interested/opted out
- **ALL DBR LEADS** - Complete list

### 3. Sync Script (`scripts/sync-dbr-leads.ts`)
Automated sync from your Google Sheet to Sanity with:
- Full data transformation
- Create/update logic
- Datetime parsing (handles UK format)
- Error handling
- Progress reporting

## How to Use

### Access the Dashboard

1. Start your development server:
   ```bash
   cd ~/Documents/greenstar-solar-redesign
   npm run dev
   ```

2. Open Sanity Studio:
   ```
   http://localhost:3001/studio
   ```

3. Navigate to:
   **DBR Dashboard (Database Recovery)** in the left sidebar

### Sync Data from Google Sheets

Run the sync command whenever you need to update Sanity with the latest data from your Google Sheet:

```bash
cd ~/Documents/greenstar-solar-redesign
npm run sync:dbr
```

**Important:** Make sure the Google Sheet is shared with:
```
claude-code-automation@claude-code-access-475710.iam.gserviceaccount.com
```

### Dashboard Features

Each lead displays:
- **Status emoji** (🔥 HOT, ✅ POSITIVE, ❌ NEGATIVE, etc.)
- **Full name & sentiment**
- **Phone number**
- **Original enquiry date**
- **Last reply timestamp**

Click any lead to view:
- Complete conversation history
- All message timestamps (M_1, M_2, M_3)
- AI sentiment analysis
- Notes & installation dates
- Final outcome status

### Filtering & Sorting

The dashboard provides pre-configured views:
- **HOT LEADS** - Your highest priority conversions
- **POSITIVE** - Leads showing interest
- **AWAITING REPLY** - Leads in the follow-up sequence
- **SCHEDULED & CONVERTED** - Success metrics
- **NEGATIVE & REMOVED** - Archive of non-converters

### Manual Updates

You can manually update any lead in Sanity:
1. Click the lead to open
2. Update fields (status, notes, install date, etc.)
3. Save changes

**Note:** Manual changes in Sanity will be overwritten next time you run `npm run sync:dbr`

## Data Sync Flow

```
Google Sheet (Source of Truth)
       ↓
npm run sync:dbr
       ↓
Sanity Studio (Dashboard View)
```

**Recommendation:** Keep the Google Sheet as your source of truth and sync regularly (e.g., after each DBR campaign batch).

## Technical Details

### Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| contactStatus | String | Current lead status |
| firstName / secondName | String | Lead name |
| phoneNumber | String | Contact number |
| emailAddress | String | Email (optional) |
| postcode / address | String | Location |
| enquiryDate | String | Original enquiry date |
| m1Sent / m2Sent / m3Sent | DateTime | Message timestamps |
| replyReceived | DateTime | Last reply time |
| conversationHistory | Text | Full SMS thread |
| latestLeadReply | Text | Most recent response |
| leadSentiment | String | AI analysis (POSITIVE/NEGATIVE/etc.) |
| replyProcessed | String | Processing status |
| aiReplySent | DateTime | AI response time |
| installDate | Date | Scheduled installation |
| finalStatus | String | Campaign outcome |
| notes | Text | Manual notes |
| lastSyncedAt | DateTime | Last sync timestamp |

### Sync Command Details

```bash
npm run sync:dbr
```

This runs: `npx tsx scripts/sync-dbr-leads.ts`

The script:
1. Loads env variables from `.env.local`
2. Connects to Google Sheets API
3. Fetches all leads (199 rows)
4. Transforms data to Sanity format
5. Creates or updates documents
6. Reports progress

**Success output:**
```
✅ Found 199 leads in Google Sheet
✨ Created: 199
📝 Updated: 0
⏭️  Skipped: 0
❌ Errors: 0
📊 Total processed: 199
```

## Troubleshooting

### Sync fails with "Configuration must contain projectId"
- Solution: Env variables not loaded. The script should auto-load `.env.local`

### Sync fails with "401" or "permission denied"
- Solution: Share the Google Sheet with the service account:
  `claude-code-automation@claude-code-access-475710.iam.gserviceaccount.com`

### Dashboard shows old data
- Solution: Run `npm run sync:dbr` to pull latest from Google Sheets

### Can't find DBR Dashboard in Studio
- Solution: Restart dev server: `npm run dev`

## Next Steps

### Automation Ideas
1. **Scheduled syncs** - Add a cron job to sync every hour
2. **n8n integration** - Trigger sync after DBR workflow updates
3. **Real-time updates** - Webhook from Google Sheets to Sanity
4. **Export reports** - Query Sanity API for analytics

### Analytics Queries
You can query the Sanity API to get:
- Conversion rates by status
- Response times
- Hot lead counts
- Sentiment distribution

Example using GROQ:
```
*[_type == "dbrLead" && contactStatus == "HOT"] | order(replyReceived desc)
```

---

**Created:** 2025-10-23
**Version:** 1.0
**Synced Leads:** 199
