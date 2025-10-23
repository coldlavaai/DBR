/**
 * DBR Dashboard Auto-Sync Script
 * This script automatically sends updates to the Sanity dashboard whenever
 * a cell is edited in the Google Sheet.
 * 
 * Setup Instructions:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Update the WEBHOOK_URL below with your Vercel deployment URL
 * 6. Save the project (Ctrl+S or Cmd+S)
 * 7. Click the trigger icon (clock) in the left sidebar
 * 8. Add trigger: onEdit, Head deployment, On edit
 * 9. Authorize the script when prompted
 */

// UPDATE THIS URL TO YOUR VERCEL DEPLOYMENT
const WEBHOOK_URL = 'https://greenstar-dbr-dashboard.vercel.app/api/webhook/dbr-update';

/**
 * Trigger function that runs on every edit
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Only process the DBR sheet (adjust name if needed)
    if (sheetName !== 'GreenstarDBR') {
      Logger.log('Skipping sheet: ' + sheetName);
      return;
    }
    
    const editedRow = e.range.getRow();
    Logger.log('Edit detected on row: ' + editedRow);
    
    // Send the webhook
    sendWebhook(editedRow);
    
  } catch (error) {
    Logger.log('Error in onEdit: ' + error.toString());
  }
}

/**
 * Manual test function - run this once to test the webhook
 */
function testWebhook() {
  sendWebhook(0); // 0 means sync all data
}

/**
 * Sends webhook to update Sanity dashboard
 */
function sendWebhook(rowNumber) {
  try {
    const payload = {
      sheetName: 'GreenstarDBR',
      editedRow: rowNumber,
      timestamp: new Date().toISOString()
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log('Sending webhook to: ' + WEBHOOK_URL);
    Logger.log('Payload: ' + JSON.stringify(payload));
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('Response code: ' + responseCode);
    Logger.log('Response: ' + responseText);
    
    if (responseCode === 200) {
      Logger.log('✓ Webhook sent successfully');
    } else {
      Logger.log('✗ Webhook failed with code: ' + responseCode);
    }
    
  } catch (error) {
    Logger.log('Error sending webhook: ' + error.toString());
  }
}

/**
 * Full sync function - manually sync all data
 * Run this if you want to force a complete refresh
 */
function fullSync() {
  Logger.log('Starting full sync...');
  sendWebhook(0);
  Logger.log('Full sync complete');
}
