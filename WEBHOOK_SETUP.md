# Real-Time Webhook Setup Guide

## Overview

This system enables real-time updates from your Google Sheet to the Sanity dashboard. When you change a lead's status, sentiment, or any tracked field in the sheet, it automatically updates in Sanity within seconds.

---

## Architecture

```
Google Sheet → Apps Script Trigger → Webhook API → Sanity CMS → Dashboard
```

---

## Setup Steps

### Step 1: Deployment URL ✅

**Your DBR Dashboard is already deployed at:**
```
https://greenstar-dbr-dashboard.vercel.app
```

Use this URL for the webhook configuration below.

### Step 2: Configure Google Apps Script

1. **Open your Google Sheet**
   - Navigate to: https://docs.google.com/spreadsheets/d/1_ObKIa-z3LqJEbJtgvQh-nTnVCEU-MdGjEh7fqnxXaU/edit

2. **Open Apps Script Editor**
   - Click `Extensions` > `Apps Script`
   - This opens the script editor in a new tab

3. **Add the Webhook Script**
   - Delete any existing code in the editor
   - Copy the entire contents of `scripts/google-apps-script-webhook.js`
   - Paste into the editor
   - **IMPORTANT**: The webhook URL is already set to:
     ```javascript
     const WEBHOOK_URL = 'https://greenstar-dbr-dashboard.vercel.app/api/webhook/dbr-update'
     ```
     This is the correct production URL - no changes needed!

4. **Save the Script**
   - Click the disk icon or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)
   - Name it "DBR Webhook" when prompted

### Step 3: Set Up Trigger

1. **Open Triggers Panel**
   - In the Apps Script editor, click the clock icon (⏰) on the left sidebar
   - Or go to `Triggers` from the left menu

2. **Add New Trigger**
   - Click the blue `+ Add Trigger` button in bottom right

3. **Configure Trigger**
   Set the following options:
   - **Function to run**: `onEdit`
   - **Deployment**: `Head`
   - **Event source**: `From spreadsheet`
   - **Event type**: `On edit`
   - **Failure notification**: `Notify me daily` (recommended)

4. **Save Trigger**
   - Click `Save`
   - You'll be prompted to authorize the script
   - Click `Review permissions`
   - Select your Google account
   - Click `Advanced` if you see a warning
   - Click `Go to DBR Webhook (unsafe)`
   - Click `Allow`

### Step 4: Test the Webhook

#### Option A: Manual Test from Apps Script

1. In the Apps Script editor, select the `testWebhookForRow` function from the dropdown at the top
2. Edit line 75 to test a specific row:
   ```javascript
   const TEST_ROW = 2 // Change to the row you want to test
   ```
3. Click the `Run` button (▶️)
4. Check the `Execution log` (at the bottom) for results
5. You should see: `Response: 200 - {"success":true,...}`

#### Option B: Edit Test in Sheet

1. Go to your Google Sheet
2. Change the `Contact_Status` of any lead (e.g., change "Ready" to "HOT")
3. Wait 2-3 seconds
4. Check the dashboard - the change should appear immediately

#### Option C: Test Webhook Endpoint Directly

```bash
curl -X POST https://greenstar-dbr-dashboard.vercel.app/api/webhook/dbr-update \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "447909225284",
    "firstName": "Rob",
    "secondName": "Johnson",
    "contactStatus": "HOT",
    "leadSentiment": "POSITIVE"
  }'
```

---

## What Triggers Updates?

The webhook is triggered when you edit these columns:
- **Column A**: Contact_Status (HOT, POSITIVE, NEGATIVE, etc.)
- **Column E**: M1_Sent (timestamp)
- **Column F**: M2_Sent (timestamp)
- **Column G**: M3_Sent (timestamp)
- **Column H**: Reply_Received (timestamp)
- **Column I**: Lead_sentiment (POSITIVE, NEGATIVE, NEUTRAL, etc.)
- **Column J**: Conversation_history (text)
- **Column K**: Install_Date (date)

Other columns (Name, Phone, etc.) can be edited but won't trigger automatic updates.

---

## How It Works

1. **User edits a cell** in one of the tracked columns
2. **Google Apps Script trigger fires** (within 1-2 seconds)
3. **Script reads the entire row** for that lead
4. **Sends POST request** to your webhook endpoint
5. **Webhook validates data** and updates Sanity
6. **Dashboard reflects change** immediately (or after refresh)

---

## Monitoring & Debugging

### View Apps Script Logs

1. In Apps Script editor, click `Executions` (≡ icon) on left sidebar
2. See all recent trigger executions
3. Click any execution to view logs and errors

### View Webhook Logs (Vercel)

1. Go to your Vercel dashboard
2. Select your project
3. Click `Logs` tab
4. Filter by `/api/webhook/dbr-update`

### Common Issues

#### "Webhook failed: 401"
- Your Vercel deployment needs the `SANITY_API_WRITE_TOKEN` environment variable
- Go to Vercel > Project Settings > Environment Variables
- Add: `SANITY_API_WRITE_TOKEN` = `sktOOK5RKSYRsfYmxKC2ARKG1...`

#### "Webhook failed: 404"
- Check your `WEBHOOK_URL` in the Apps Script
- Make sure it ends with `/api/webhook/dbr-update`
- Verify deployment is live

#### "No phone number found"
- The webhook requires a phone number to identify the lead
- Ensure Column D has a value for that row

#### Changes not appearing in dashboard
- The dashboard uses cached data
- Refresh the page (F5) to see updates
- Or wait for the next automatic fetch (when switching time filters)

---

## Security Notes

- The webhook is public but requires valid lead data
- Only updates existing leads or creates new ones
- No deletion capability via webhook
- Phone number is used as unique identifier
- All updates are logged in Vercel

---

## Disabling the Webhook

If you need to temporarily disable automatic updates:

1. Go to Apps Script Triggers panel
2. Click the 3 dots (⋮) next to the `onEdit` trigger
3. Click `Delete trigger`

To re-enable, just add the trigger again following Step 3.

---

## Manual Sync vs Real-Time Webhook

You now have two ways to sync data:

1. **Real-Time Webhook** (Automatic)
   - Triggers on every edit
   - Updates individual leads immediately
   - Best for: ongoing status updates

2. **Manual Full Sync** (On-demand)
   - Run: `npm run sync:dbr`
   - Syncs all 975 leads at once
   - Best for: bulk updates, initial setup

Both methods work together - use whichever fits your workflow!

---

## Next Steps

1. Deploy to Vercel if not already done
2. Set up the Google Apps Script trigger
3. Test with a status change
4. Monitor the dashboard for real-time updates
5. Share the dashboard URL with your team

**Dashboard URL**: `https://greenstar-dbr-dashboard.vercel.app/dbr-analytics`

---

**Questions?** Check the Vercel logs or Apps Script execution logs for detailed error messages.
