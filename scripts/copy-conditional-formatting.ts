import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Use the same auth approach as google-auth.ts
function getGoogleAuth() {
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json')

  let credentials

  if (fs.existsSync(credentialsPath)) {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // dotenv converts \n to actual newlines, which breaks JSON parsing
    // We need to escape them back for valid JSON
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const fixed = raw.replace(/\n/g, '\\n')
    credentials = JSON.parse(fixed)
  } else {
    throw new Error('Google Service Account credentials not found')
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

const auth = getGoogleAuth()
const sheets = google.sheets({ version: 'v4', auth })
const SHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

async function copyConditionalFormatting() {
  console.log('📋 Copying conditional formatting from October to 10th Nov...')

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    })

    const octoberSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'October')
    const novSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === '10th Nov')

    if (!octoberSheet || !novSheet) {
      throw new Error('Could not find October or 10th Nov sheets')
    }

    const octoberSheetId = octoberSheet.properties?.sheetId
    const novSheetId = novSheet.properties?.sheetId

    console.log(`✅ Found October sheet (ID: ${octoberSheetId})`)
    console.log(`✅ Found 10th Nov sheet (ID: ${novSheetId})`)

    const octoberRules = octoberSheet.conditionalFormats || []
    console.log(`📊 Found ${octoberRules.length} conditional formatting rules in October`)

    const novRules = novSheet.conditionalFormats || []
    console.log(`📊 Found ${novRules.length} existing rules in 10th Nov`)

    const duplicateRule = novRules.find(rule =>
      rule.booleanRule?.format?.backgroundColor?.red === 1 &&
      rule.booleanRule?.format?.backgroundColor?.green === 1 &&
      rule.booleanRule?.format?.backgroundColor?.blue === 0
    )

    if (duplicateRule) {
      console.log('✅ Found yellow duplicate highlighting rule')
    }

    const newRules = octoberRules.map(rule => ({
      ...rule,
      ranges: rule.ranges?.map(range => ({
        ...range,
        sheetId: novSheetId,
      })),
    }))

    if (duplicateRule) {
      newRules.push(duplicateRule)
    }

    console.log(`📝 Will apply ${newRules.length} rules to 10th Nov`)

    // Build requests to add each conditional formatting rule
    const requests = newRules.map(rule => ({
      addConditionalFormatRule: {
        rule,
        index: 0,
      },
    }))

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests,
      },
    })

    console.log('✅ Successfully copied conditional formatting rules!')
    console.log(`   - ${octoberRules.length} rules from October`)
    if (duplicateRule) {
      console.log(`   - 1 yellow duplicate rule preserved`)
    }
    console.log(`   - Total: ${newRules.length} rules now active on 10th Nov`)

  } catch (error: any) {
    console.error('❌ Error copying conditional formatting:', error.message)
    throw error
  }
}

copyConditionalFormatting()
