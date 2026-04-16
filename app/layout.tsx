import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import './globals.css'
import AppHeader from '@/components/layout/AppHeader'
import AppFooter from '@/components/layout/AppFooter'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gordon Pro Field App',
  description: 'Tree assessment intake for Gordon Pro Tree Service crews',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GP Field',
  },
}

export const viewport: Viewport = {
  themeColor: '#1C3A2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </body>
    </html>
  )
}
