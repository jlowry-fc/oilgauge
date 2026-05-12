import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OilGauge Pro',
  description: 'Oil tank gauging and production tracking',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      </head>
      <body style={{ minHeight: '100vh', margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
