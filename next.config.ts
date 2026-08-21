import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Screenshots are served straight from /public at their natural size; the
  // design relies on exact CSS sizing rather than the image optimizer.
  images: { unoptimized: true },
}

export default nextConfig
