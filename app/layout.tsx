import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DBR Analytics Dashboard',
  description: 'Database Recovery Campaign Analytics for Greenstar Solar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
