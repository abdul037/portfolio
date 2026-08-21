import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'

import { ALLOW_INDEXING, SITE, SITE_URL } from '@/lib/site'
import './globals.css'
import './hover.css'

// Self-hosted through Next's font pipeline: no render-blocking request to
// Google, and no layout shift while the display face loads.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  // Resolves relative OG / canonical URLs against the deploy origin.
  metadataBase: new URL(SITE_URL),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.title,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  keywords: [
    'Product Manager',
    'AI Product Manager',
    'Data & AI',
    'Dubai',
    'Enterprise AI',
    'AI Agents',
    'Healthcare AI',
    'Supply Chain',
  ],
  alternates: { canonical: '/' },
  // Indexing stays off until a real site URL is set and indexing is opted into
  // — the safe default while the confidentiality review is outstanding.
  robots: ALLOW_INDEXING
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  openGraph: {
    type: 'website',
    siteName: SITE.title,
    title: SITE.title,
    description: SITE.description,
    url: '/',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
  },
}

export const viewport: Viewport = {
  themeColor: '#07070e',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.locale} className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
