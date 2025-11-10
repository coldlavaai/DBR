# Campaign Setup Guide

## Overview
This guide documents how to add new campaign batches to the DBR dashboard, based on the successful addition of the "10th Nov" campaign alongside the existing "October" campaign.

## Date: November 10, 2025

---

## Campaign Architecture

### Data Flow
```
Google Sheets (Campaign Tabs)
    ↓ (Initial sync)
Sanity CMS (campaign field on each lead)
    ↓ (Live queries with campaign filter)
Dashboard (Auto-refresh every 30s)
    ↓ (Bidirectional sync on updates)
Google Sheets (Campaign Tabs)
```

### Key Principle
**Each campaign is completely isolated** - separate sheet tabs, separate Sanity documents with campaign field, separate dashboard views.

---

## How to Add a New Campaign

### Step 1: Create Google Sheet Tab
1. Duplicate an existing campaign tab (e.g., "October")
2. Rename it to your new campaign name (e.g., "15th Dec")
3. Import your new lead data
4. Ensure all columns match the existing structure

**Column Structure (A-U):**
- A: Contact_Status
- B: First_Name
- C: Second_Name
- D: Phone_number
- E: Email_address
- F: Postcode
- G: Address
- H: Enquiry_date
- I: M1_sent
- J: M2_sent
- K: M3_sent
- L: Reply_received
- M: Latest_lead_reply
- N: Lead_sentiment
- O: Conversation_history
- P: Notes
- Q: Install_date
- R: Call_booked_time
- S: Archived
- T: Archived_at
- U: Campaign
- V: Manual_Mode

### Step 2: Update Sync Scripts
Create a new sync script or update existing one:

```bash
npx tsx scripts/sync-dbr-leads-[campaign-name].ts
```

**Key points in sync script:**
- Set `SHEET_NAME` to your new tab name
- Set `CAMPAIGN_NAME` to match exactly
- Document ID format: `dbr-{campaign}-{phone}` (e.g., `dbr-15th-Dec-447123456789`)

### Step 3: Copy Conditional Formatting
Run the conditional formatting script to copy rules from an existing campaign:

```bash
npx tsx scripts/copy-conditional-formatting.ts
```

Update the script to specify source and target sheets.

### Step 4: Initial Data Sync
1. Run the sync script to import leads into Sanity
2. Verify lead counts match between Sheet and Sanity
3. Check that `campaign` field is correctly set on all documents

### Step 5: Test Dashboard
1. Navigate to dashboard and select your new campaign from dropdown
2. Verify all stats show correct data
3. Test Recent Activity filtering
4. Try updating a lead status - confirm it writes to correct sheet tab
5. Toggle manual mode - confirm it updates correct sheet
6. Book a call - confirm all columns update in correct sheet

---

## Critical Issues & Solutions

### Issue 1: Duplicate Records (MAJOR)
**Problem:** Changing document ID format from `dbr-{phone}` to `dbr-{campaign}-{phone}` created duplicates instead of replacing records.

**Symptom:** October showed 1935 leads instead of 972 after migration.

**Root Cause:** Sanity sees different IDs as different documents, so old records weren't deleted when new ones were created.

**Solution:**
1. Created migration script to merge old and new records
2. Preserved all conversation history from old records
3. Deleted old-format records after merging
4. Scripts used:
   - `scripts/migrate-october-data.ts` - Merged October data
   - `scripts/delete-old-nov.ts` - Cleaned up 10th Nov duplicates

**Lesson:** When changing document ID formats, ALWAYS create migration scripts to handle existing data. Never assume Sanity will automatically merge/replace.

### Issue 2: Recent Activity Showing Wrong Campaign
**Problem:** When viewing 10th Nov dashboard, Recent Activity showed October conversations.

**Root Cause:** `RecentActivity` component used `useState(initialActivities)` which only updates on first render, not when props change.

**Solution:**
Added `useEffect` to watch `initialActivities`:
```typescript
useEffect(() => {
  setActivities(initialActivities)
  setHasMore(true)
}, [initialActivities])
```

**Files Changed:**
- `components/RecentActivity.tsx:26-29`

### Issue 3: "Load More" Not Filtering by Campaign
**Problem:** Clicking "Load More" in Recent Activity showed leads from all campaigns.

**Root Cause:**
1. API endpoint didn't accept campaign parameter
2. Component didn't pass campaign when loading more

**Solution:**
1. Updated API to accept campaign parameter:
   ```typescript
   const campaign = searchParams.get('campaign') || 'October'
   ```
2. Updated component to pass campaign prop and include it in fetch URL
3. Updated dashboard to pass campaign prop to RecentActivity

**Files Changed:**
- `app/api/recent-activity/route.ts:21-35`
- `components/RecentActivity.tsx:17,21,35`
- `components/EnhancedDbrDashboard.tsx:479`

### Issue 4: Bidirectional Sync Not Campaign-Aware
**Problem:** Dashboard updates (status changes, manual mode toggles, call bookings) wrote to wrong sheet tab or failed to find records.

**Root Cause:** All update endpoints searched for phone numbers without specifying which sheet tab to search in.

**Solution:**
Updated all update endpoints to:
1. Fetch lead's campaign from Sanity
2. Use campaign to determine sheet name
3. Search for phone in correct sheet tab: `${sheetName}!D2:D`
4. Update correct sheet tab: `${sheetName}!A${row}`

**Files Changed:**
- `app/api/update-lead-status/route.ts:40-56,66`
- `app/api/toggle-manual-mode/route.ts:65-81,91`
- `app/api/book-call/route.ts:116-136,176-185`

**Example Fix:**
```typescript
// Before
range: 'D2:D'  // Searches first sheet only

// After
range: `${sheetName}!D2:D`  // Searches correct campaign sheet
```

### Issue 5: Build Failure - TypeScript Compilation Error
**Problem:** Vercel build failed with TypeScript error in `scripts/copy-conditional-formatting.ts`

**Error Message:**
```
Type error: Argument of type 'Schema$ConditionalFormatRule' is not assignable...
```

**Root Cause:** Next.js was trying to type-check all `.ts` files including utility scripts which don't need to be part of the build.

**Solution:**
Excluded scripts folder from TypeScript compilation:
```json
// tsconfig.json
{
  "exclude": ["node_modules", "scripts"]
}
```

**File Changed:**
- `tsconfig.json:25`

**Lesson:** Keep utility scripts separate from Next.js compilation. Scripts that are only run manually via `npx tsx` don't need to be included in the build process.

---

## Campaign Document Structure

Each lead document in Sanity has:
```typescript
{
  _type: "dbrLead",
  _id: "dbr-{campaign}-{phone}",  // e.g., "dbr-October-447123456789"
  campaign: "October" | "10th Nov" | ...,  // CRITICAL: Must match sheet tab name
  phoneNumber: "+447123456789",
  firstName: "John",
  secondName: "Doe",
  contactStatus: "HOT" | "WARM" | "COLD" | ...,
  manualMode: boolean,
  conversationHistory: string,
  // ... other fields
}
```

**CRITICAL:** The `campaign` field value must EXACTLY match the Google Sheet tab name for bidirectional sync to work.

---

## Checklist for New Campaign

- [ ] Create new Google Sheet tab with campaign name
- [ ] Import lead data with all required columns
- [ ] Create/update sync script with correct SHEET_NAME and CAMPAIGN_NAME
- [ ] Run sync script and verify lead counts
- [ ] Copy conditional formatting rules to new sheet
- [ ] Test dashboard displays new campaign correctly
- [ ] Test Recent Activity shows only campaign's leads
- [ ] Test "Load More" in Recent Activity
- [ ] Test changing lead status writes to correct sheet
- [ ] Test toggling manual mode writes to correct sheet
- [ ] Test booking call writes to correct sheet
- [ ] Hard refresh browser to clear cache
- [ ] Verify no data leakage between campaigns

---

## File Reference

### Core Dashboard Files
- `app/api/dashboard/route.ts` - Main unified dashboard endpoint
- `components/EnhancedDbrDashboard.tsx` - Main dashboard component
- `components/RecentActivity.tsx` - Recent activity widget

### Sync & Update Endpoints
- `app/api/sync-sheets/route.ts` - Sheet → Sanity sync
- `app/api/update-lead-status/route.ts` - Status updates → both DBs
- `app/api/toggle-manual-mode/route.ts` - Manual mode → both DBs
- `app/api/book-call/route.ts` - Call bookings → both DBs
- `app/api/recent-activity/route.ts` - Load more activities

### Utility Scripts (Not in build)
- `scripts/sync-dbr-leads.ts` - October initial sync
- `scripts/sync-dbr-leads-nov.ts` - 10th Nov initial sync
- `scripts/migrate-october-data.ts` - October data migration
- `scripts/delete-old-nov.ts` - Cleanup old 10th Nov records
- `scripts/copy-conditional-formatting.ts` - Copy sheet formatting
- `scripts/check-campaigns.ts` - Verify campaign data
- `scripts/check-nov-duplicates.ts` - Check for duplicate phones

### Configuration
- `tsconfig.json` - TypeScript config (excludes scripts/)
- `lib/google-auth.ts` - Google Sheets authentication helper

---

## Common Pitfalls

### 1. Campaign Name Mismatch
❌ **Wrong:** Sheet tab called "10th Nov", Sanity campaign field set to "10th November"
✅ **Right:** Both exactly "10th Nov"

### 2. Forgetting to Pass Campaign Prop
When creating new components that filter data, always:
```typescript
<Component data={filteredData} campaign={campaign} />
```

### 3. Hard-Coded Sheet References
❌ **Wrong:** `range: 'October!D2:D'`
✅ **Right:** `range: \`\${sheetName}!D2:D\``

### 4. Browser Caching
After deploying changes, users must hard refresh (Ctrl+Shift+R) to see updates.

### 5. Document ID Changes
Never change document ID format without a migration plan. IDs are immutable in Sanity.

---

## Performance Notes

- Dashboard auto-refreshes every 30 seconds
- All API endpoints use `useCdn: false` for live data
- Single unified `/api/dashboard` endpoint (7 queries → 1 query)
- Recent Activity uses pagination (load more functionality)
- Google Sheets updates use batch operations where possible

---

## Environment Variables Required

```bash
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_WRITE_TOKEN=

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY=  # JSON with proper \n escaping

# Cal.com (for booking)
CAL_API_KEY=
```

---

## Future Improvements

1. **Automated Migration Tool**: Create a CLI tool to handle campaign addition automatically
2. **Campaign Config File**: Store campaign names in a config file rather than hard-coded
3. **Data Validation**: Add pre-sync validation to catch schema mismatches
4. **Monitoring**: Add alerts for data sync discrepancies
5. **Rollback Strategy**: Document how to safely remove a campaign

---

## Contact & Support

For questions or issues with campaign setup:
- Review this guide first
- Check the error patterns in "Critical Issues & Solutions"
- Verify campaign names match exactly everywhere
- Test bidirectional sync after any changes

Last Updated: November 10, 2025
