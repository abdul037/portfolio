/**
 * Site-wide configuration read from the environment at build time.
 *
 * Deploy-time env vars (all optional — the app runs without any of them):
 *   NEXT_PUBLIC_SITE_URL     canonical origin, e.g. https://abdulmuwahib.com.
 *                            Sets metadataBase so OG/Twitter and canonical URLs
 *                            resolve absolutely. Falls back to a placeholder.
 *   NEXT_PUBLIC_ALLOW_INDEXING
 *                            'true' lets search engines index the site.
 *                            Anything else (the default) serves noindex — the
 *                            safe default while the confidentiality review of
 *                            screenshots and operational numbers is pending.
 */

const RAW_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim()

/** Canonical origin, normalised to no trailing slash. */
export const SITE_URL = (RAW_URL || 'https://portfolio.example.com').replace(/\/+$/, '')

/** True only when a real site URL was supplied AND indexing was opted into. */
export const ALLOW_INDEXING =
  !!RAW_URL && process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase() === 'true'

export const SITE = {
  name: 'Abdul Muwahib',
  role: 'AI Product Manager',
  title: 'Abdul Muwahib — AI Product Manager',
  description:
    'Senior Product Manager (Data & AI, Dubai). Enterprise AI products, autonomous agents, and healthcare AI case studies — built, shipped, and measured across 10 countries.',
  locale: 'en',
  email: 'abdulmuwahib@gmail.com',
} as const
