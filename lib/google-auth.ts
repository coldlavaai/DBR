import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

export function getGoogleAuth() {
  // Try to use the credentials file first (works better with Node 24)
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json')

  let credentials

  if (fs.existsSync(credentialsPath)) {
    // Use file if it exists (local development)
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Fall back to environment variable (Vercel deployment)
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  } else {
    throw new Error('Google Service Account credentials not found')
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Full read/write access
  })
}

export function getGoogleSheetsClient() {
  const auth = getGoogleAuth()
  return google.sheets({ version: 'v4', auth })
}
