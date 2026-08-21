import type { MetadataRoute } from 'next'

import { ALLOW_INDEXING, SITE_URL } from '@/lib/site'

/**
 * Search-engine rules.
 *
 * Indexing is disallowed until a real NEXT_PUBLIC_SITE_URL is set and
 * NEXT_PUBLIC_ALLOW_INDEXING=true — the safe default while the confidentiality
 * review of screenshots and operational numbers is still open. Flip both to
 * open the site to crawlers once the review is done.
 */
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
