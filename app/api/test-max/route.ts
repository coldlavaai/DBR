import { NextResponse } from 'next/server'
import { getGoogleSheetsClient } from '@/lib/google-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sheets = getGoogleSheetsClient()
    const SPREADSHEET_ID = '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g'

    // Get columns A-D
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:D',
    })

    const rows = response.data.values || []

    // Find Max Tatler by name
    const maxByName = rows.filter((row: any[], index: number) => {
      return row[1] === 'Max' && row[2] === 'Tatler'
    }).map((row: any[], index: number) => ({
      rowIndex: rows.indexOf(row) + 2,
      status: row[0],
      firstName: row[1],
      secondName: row[2],
      phoneNumber: row[3]
    }))

    // Search by phone
    const maxByPhone = rows.filter((row: any[]) => {
      const phone = row[3] || ''
      return phone.includes('7742201349')
    }).map((row: any[]) => ({
      rowIndex: rows.indexOf(row) + 2,
      status: row[0],
      firstName: row[1],
      secondName: row[2],
      phoneNumber: row[3],
      phoneDigitsOnly: (row[3] || '').replace(/\D/g, '')
    }))

    return NextResponse.json({
      totalRows: rows.length,
      maxByName,
      maxByPhone
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
