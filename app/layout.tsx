import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import './globals.css'
import AppHeader from '@/components/layout/AppHeader'
import AppFooter from '@/components/layout/AppFooter'
import OfflineBanner from '@/components/ui/OfflineBanner'

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
  description: 'Get a free AI-powered tree assessment from Gordon Pro Tree Service. Upload photos and receive instant species ID, hazard flags, and crew tips.',
  openGraph: {
    title: 'Gordon Pro Tree Service — Free Tree Assessment',
    description: 'Upload photos of your tree for an instant AI-powered assessment. Licensed arborists, fast response.',
    images: [{ url: '/images/fieldapp.png', width: 512, height: 512, alt: 'Gordon Pro Tree Service' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Gordon Pro Tree Service — Free Tree Assessment',
    description: 'Upload photos of your tree for an instant AI-powered assessment.',
    images: ['/images/fieldapp.png'],
  },
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
        <OfflineBanner />
        <AppHeader />
        <main className="flex-1">{children}</main>
        <AppFooter />
      </body>
    </html>
  )
}
