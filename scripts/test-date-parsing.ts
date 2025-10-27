// Test the parseDateTime function from sync-sheets
function getBritishTimezoneOffset(year: number, month: number, day: number): string {
  const marchLast = new Date(Date.UTC(year, 2, 31))
  const marchLastSunday = 31 - marchLast.getUTCDay()
  const bstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0))

  const octoberLast = new Date(Date.UTC(year, 9, 31))
  const octoberLastSunday = 31 - octoberLast.getUTCDay()
  const bstEnd = new Date(Date.UTC(year, 9, octoberLastSunday, 1, 0, 0))

  const dateToCheck = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const isBST = dateToCheck >= bstStart && dateToCheck < bstEnd

  return isBST ? '+01:00' : '+00:00'
}

function parseDateTime(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null

  try {
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('-')) || dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
      return dateStr
    }

    const match1 = dateStr.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match1) {
      const [, hours, minutes, day, month, year] = match1
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
    if (match2) {
      const [, day, month, year, hours, minutes] = match2
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const match3 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (match3) {
      const [, day, month, year] = match3
      const offset = getBritishTimezoneOffset(parseInt(year), parseInt(month), parseInt(day))
      const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00${offset}`
      return new Date(isoStr).toISOString()
    }

    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

// Test with Julie's date
const julieDate = '28/10/2025 10:00'
const parsed = parseDateTime(julieDate)

console.log('Input:', julieDate)
console.log('Parsed:', parsed)
console.log('Is null?:', parsed === null)

if (parsed) {
  const date = new Date(parsed)
  console.log('UK Time:', date.toLocaleString('en-GB', { timeZone: 'Europe/London' }))
}
