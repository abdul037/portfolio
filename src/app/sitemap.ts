import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

/**
 * The portfolio is a single route — projects and agent studies are modal
 * overlays, not their own URLs — so the sitemap has one entry.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
