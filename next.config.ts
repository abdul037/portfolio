import type { NextConfig } from 'next'

/**
 * Content Security Policy.
 *
 * Tuned to exactly what this app needs and nothing more:
 *  - script-src keeps 'unsafe-inline' because Next injects an inline bootstrap
 *    script; moving to a strict nonce policy is a separate, larger change.
 *  - style-src needs 'unsafe-inline': the ported design applies every style as
 *    an inline attribute (see "Why no Tailwind" in the README).
 *  - font-src 'self' — fonts are self-hosted under /_next by next/font.
 *  - img-src allows data: for the inline SVG favicon and canvas work.
 *  - object-src 'self' — the resume renders in an <object> PDF embed.
 *  - connect-src 'self' covers the assistant chat's future same-origin route.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'self'",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  // 'self', not 'none': the resume renders a same-origin PDF in an <object>,
  // which frame-ancestors governs. Cross-origin framing is still blocked.
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  // Belt-and-braces clickjacking protection alongside frame-ancestors; matches
  // it at SAMEORIGIN so the resume PDF <object> still renders.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // Only meaningful over HTTPS; harmless on http during local dev.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Screenshots are served straight from /public at their natural size; the
  // design relies on exact CSS sizing rather than the image optimizer.
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}

export default nextConfig
