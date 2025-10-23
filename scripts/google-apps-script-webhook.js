/**
 * Google Apps Script for DBR Lead Updates
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Update the WEBHOOK_URL constant below with your deployment URL
 * 6. Click the "Save" button (disk icon)
 * 7. Go to Triggers (clock icon on left sidebar)
 * 8. Click "+ Add Trigger"
 * 9. Configure:
 *    - Function: onEdit
 *    - Event source: From spreadsheet
 *    - Event type: On edit
 * 10. Click "Save"
 * 11. Authorize the script when prompted
 */

// UPDATE THIS WITH YOUR DEPLOYMENT URL
const WEBHOOK_URL = 'https://YOUR-DEPLOYMENT-URL.vercel.app/api/webhook/dbr-update'

// Column mapping (based on your sheet structure)
const COLUMNS = {
  CONTACT_STATUS: 0,      // Column A
  FIRST_NAME: 1,          // Column B
  SECOND_NAME: 2,         // Column C
  PHONE_NUMBER: 3,        // Column D
  M1_SENT: 4,             // Column E
  M2_SENT: 5,             // Column F
  M3_SENT: 6,             // Column G
  REPLY_RECEIVED: 7,      // Column H
  LEAD_SENTIMENT: 8,      // Column I
  CONVERSATION_HISTORY: 9, // Column J
  INSTALL_DATE: 10        // Column K
}

/**
 * Triggered when the sheet is edited
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet()
    const range = e.range
    const row = range.getRow()

    // Skip header row
    if (row === 1) return

    // Get the edited column
    const editedColumn = range.getColumn() - 1

    // Only trigger webhook for relevant columns
    const relevantColumns = [
      COLUMNS.CONTACT_STATUS,
      COLUMNS.LEAD_SENTIMENT,
      COLUMNS.M1_SENT,
      COLUMNS.M2_SENT,
      COLUMNS.M3_SENT,
      COLUMNS.REPLY_RECEIVED,
      COLUMNS.CONVERSATION_HISTORY,
      COLUMNS.INSTALL_DATE
    ]

    if (!relevantColumns.includes(editedColumn)) {
      Logger.log('Edited column not relevant for webhook')
      return
    }

    // Get the entire row data
    const rowData = sheet.getRange(row, 1, 1, 11).getValues()[0]

    // Prepare payload
    const payload = {
      contactStatus: rowData[COLUMNS.CONTACT_STATUS] || '',
      firstName: rowData[COLUMNS.FIRST_NAME] || '',
      secondName: rowData[COLUMNS.SECOND_NAME] || '',
      phoneNumber: rowData[COLUMNS.PHONE_NUMBER] || '',
      m1Sent: rowData[COLUMNS.M1_SENT] || '',
      m2Sent: rowData[COLUMNS.M2_SENT] || '',
      m3Sent: rowData[COLUMNS.M3_SENT] || '',
      replyReceived: rowData[COLUMNS.REPLY_RECEIVED] || '',
      leadSentiment: rowData[COLUMNS.LEAD_SENTIMENT] || '',
      conversationHistory: rowData[COLUMNS.CONVERSATION_HISTORY] || '',
      installDate: rowData[COLUMNS.INSTALL_DATE] || ''
    }

    // Validate phone number exists
    if (!payload.phoneNumber) {
      Logger.log('No phone number found, skipping webhook')
      return
    }

    // Send to webhook
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    }

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const responseCode = response.getResponseCode()
    const responseText = response.getContentText()

    if (responseCode === 200) {
      Logger.log('Webhook successful: ' + responseText)
    } else {
      Logger.log('Webhook failed: ' + responseCode + ' - ' + responseText)
    }

  } catch (error) {
    Logger.log('Error in onEdit: ' + error.toString())
  }
}

/**
 * Manual trigger function for testing
 * Run this from the Apps Script editor to test a specific row
 */
function testWebhookForRow() {
  const TEST_ROW = 2 // Change this to test different rows

  const sheet = SpreadsheetApp.getActiveSheet()
  const rowData = sheet.getRange(TEST_ROW, 1, 1, 11).getValues()[0]

  const payload = {
    contactStatus: rowData[COLUMNS.CONTACT_STATUS] || '',
    firstName: rowData[COLUMNS.FIRST_NAME] || '',
    secondName: rowData[COLUMNS.SECOND_NAME] || '',
    phoneNumber: rowData[COLUMNS.PHONE_NUMBER] || '',
    m1Sent: rowData[COLUMNS.M1_SENT] || '',
    m2Sent: rowData[COLUMNS.M2_SENT] || '',
    m3Sent: rowData[COLUMNS.M3_SENT] || '',
    replyReceived: rowData[COLUMNS.REPLY_RECEIVED] || '',
    leadSentiment: rowData[COLUMNS.LEAD_SENTIMENT] || '',
    conversationHistory: rowData[COLUMNS.CONVERSATION_HISTORY] || '',
    installDate: rowData[COLUMNS.INSTALL_DATE] || ''
  }

  Logger.log('Testing with payload: ' + JSON.stringify(payload))

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  }

  const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
  Logger.log('Response: ' + response.getResponseCode() + ' - ' + response.getContentText())
}
