import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'

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

const DESCRIPTION =
  'Senior Product Manager (Data & AI, Dubai). Enterprise AI products, autonomous agents, and healthcare AI case studies — built, shipped, and measured across 10 countries.'

export const metadata: Metadata = {
  title: 'Abdul Muwahib — AI Product Manager',
  description: DESCRIPTION,
  authors: [{ name: 'Abdul Muwahib' }],
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
  openGraph: {
    title: 'Abdul Muwahib — AI Product Manager',
    description: DESCRIPTION,
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07070e',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
