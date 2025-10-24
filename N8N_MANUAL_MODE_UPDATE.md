# n8n Workflow Update for Manual Mode

## Overview
The dashboard now supports **Manual Mode**, allowing sales teams to take control of SMS conversations and pause AI automation for specific leads.

## Google Sheets Update Required

### 1. Add Manual_Mode Column
- **Column:** V (column 22)
- **Header:** `Manual_Mode`
- **Values:** `YES` or `NO` (or empty = NO)
- **Location:** After the `Final_status` column (column U)

### 2. Example Google Sheets Structure
```
| ... | Final_status | Manual_Mode |
| ... | LOST         |             |
| ... | IN_PROGRESS  | YES         |
| ... | WON          | NO          |
```

## n8n Workflow Updates

### Update Location
Add a conditional check **BEFORE** any automated message sending nodes (M1, M2, or M3).

### Implementation Options

#### Option 1: IF Node (Recommended)
Add an **IF** node immediately after fetching the lead data from Google Sheets:

**IF Node Configuration:**
- **Condition:** `{{ $json["Manual_Mode"] }} != "YES"`
- **True Branch:** Continue with automated message workflow
- **False Branch:** Skip all automated messages (connect to end node or next step)

**Node Flow:**
```
Google Sheets → IF Node → [Manual_Mode = YES] → Skip Message
                       → [Manual_Mode != YES] → Send Automated Message
```

#### Option 2: Filter Node
Use a **Filter** node to only process leads where Manual_Mode is not "YES":

**Filter Configuration:**
- **Keep:** Items where `Manual_Mode` is not equal to `YES`

**Node Flow:**
```
Google Sheets → Filter (Manual_Mode != YES) → Send Automated Message
```

### Detailed Implementation Steps

#### Step 1: Locate Your Trigger Nodes
Find where your workflow sends M1, M2, or M3 messages (likely scheduled cron triggers or webhook triggers).

#### Step 2: Add Conditional Logic
**Right after** fetching lead data from Google Sheets and **before** any message generation or sending:

1. Add a new **IF** node
2. Click "Add Condition"
3. Configure condition:
   - **Field:** `Manual_Mode` (or `{{ $json["Manual_Mode"] }}`)
   - **Operation:** `Not Equal`
   - **Value:** `YES`

#### Step 3: Route True Branch (Automation Continues)
Connect the **True** output to your existing OpenAI/Twilio message sending nodes.

#### Step 4: Route False Branch (Skip Automation)
Connect the **False** output to either:
- A **NoOp** node (does nothing, just ends)
- The next step after messaging (e.g., status update)
- An optional **Set** node to log that the lead was skipped

### Example Workflow Structure

```
┌─────────────────────────┐
│  Cron Trigger (M1)      │
│  Every 9am              │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│  Google Sheets          │
│  Fetch Leads (Sent_1)   │
└───────────┬─────────────┘
            │
            v
┌─────────────────────────┐
│  IF: Manual_Mode != YES │ ◄─── ADD THIS NODE
└───────┬─────────┬───────┘
        │         │
    TRUE│         │FALSE
        │         │
        v         v
 ┌──────────┐  ┌─────────┐
 │ OpenAI   │  │ Skip    │
 │ Generate │  │ Message │
 │ M1       │  └─────────┘
 └────┬─────┘
      │
      v
 ┌──────────┐
 │ Twilio   │
 │ Send SMS │
 └──────────┘
```

### Testing the Implementation

1. **Add Manual_Mode Column** to your Google Sheet (column V)
2. **Set a Test Lead** to `Manual_Mode = YES`
3. **Run the n8n Workflow** manually or wait for the cron trigger
4. **Verify:** The test lead should be skipped (no message sent)
5. **Check Logs:** Should show the lead was filtered/skipped
6. **Test Normal Lead:** Set another lead to `Manual_Mode = NO` or leave empty
7. **Verify:** The normal lead should receive automated messages as usual

### Expected Behavior

| Manual_Mode Value | n8n Behavior |
|-------------------|--------------|
| `YES` | ✅ Skip all automated messages (M1, M2, M3) |
| `NO` | ❌ Send automated messages normally |
| Empty/Blank | ❌ Send automated messages normally (treated as NO) |

### Dashboard Integration

When a user toggles manual mode in the dashboard:

1. **Dashboard** → Updates Sanity CMS (`manualMode: true/false`)
2. **Dashboard** → Updates Google Sheets Column V (`Manual_Mode: YES/NO`)
3. **n8n** → Checks Column V before sending messages
4. **n8n** → Skips lead if `Manual_Mode = YES`

### Important Notes

⚠️ **Warning:** Make sure to add the condition check in **ALL** message-sending branches:
- M1 (First message workflow)
- M2 (24h follow-up workflow)
- M3 (48h follow-up workflow)
- Any AI reply workflows

✅ **Best Practice:** Add logging to track skipped leads for debugging:
```
IF Manual_Mode = YES:
  Log: "Skipped [Lead Name] - Manual Mode Active"
```

### Troubleshooting

**Issue:** Automated messages still being sent despite Manual_Mode = YES
- **Check:** IF node condition is correct (`!= YES` or `not equal to YES`)
- **Check:** The IF node is placed BEFORE message sending
- **Check:** Google Sheets column V is correctly populated
- **Check:** n8n is reading the correct range (must include column V)

**Issue:** n8n can't read Manual_Mode column
- **Check:** Google Sheets range in n8n includes column V (e.g., `A2:V`)
- **Check:** Column header is exactly `Manual_Mode` (case-sensitive might matter)
- **Check:** Google Sheets API permissions are correct

### Alternative: n8n Function Node

If you prefer JavaScript logic, use a **Function** node:

```javascript
// Skip if Manual_Mode is YES
if ($input.item.json.Manual_Mode === 'YES') {
  return { json: { skipped: true, reason: 'Manual mode active' } }
}

// Otherwise, continue with message
return $input.item
```

### Summary

✅ **Dashboard Complete:**
- Manual mode toggle UI ✓
- Twilio SMS integration ✓
- Live chat interface ✓
- Google Sheets sync ✓

⏳ **Your Task:**
- Add Manual_Mode column to Google Sheet (Column V)
- Update n8n workflows to check Manual_Mode before sending messages
- Test with at least one lead set to Manual_Mode = YES

🎯 **End Result:**
- Sales team can take manual control of hot leads
- AI automation automatically pauses when manual mode is active
- Seamless handoff between AI and human control
