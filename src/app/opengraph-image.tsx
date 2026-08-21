import { ImageResponse } from 'next/og'

import { SITE } from '@/lib/site'

/**
 * Social share card. Rendered at build/request time, so the link preview a
 * recruiter sees in Slack or email matches the site's ops-console look:
 * near-black canvas, the signal-green AM mark, name and tagline.
 */
export const runtime = 'nodejs'
export const alt = SITE.title
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CANVAS = '#07070e'
const ACCENT = '#34d399'
const BRIGHT = '#f0f0f4'
const MUTED = '#8f8f9b'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CANVAS,
          padding: '72px 80px',
          // Faint accent wash from the top-left, echoing the hero.
          backgroundImage: `radial-gradient(900px 600px at 12% -10%, rgba(52,211,153,0.16), transparent 60%)`,
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CANVAS,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            AM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: 9, background: ACCENT }} />
            <div style={{ color: MUTED, fontSize: 22, letterSpacing: 2, textTransform: 'uppercase' }}>
              Senior Product Manager · Data &amp; AI · Dubai
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: BRIGHT, fontSize: 92, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
            {SITE.name}
          </div>
          <div style={{ color: ACCENT, fontSize: 52, fontWeight: 600, letterSpacing: -1 }}>
            {SITE.role}
          </div>
        </div>

        {/* Proof row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
          {[
            ['28', 'Products shipped'],
            ['10', 'Countries live'],
            ['15', 'Agent case studies'],
          ].map(([value, label]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: BRIGHT, fontSize: 52, fontWeight: 700, letterSpacing: -2 }}>{value}</div>
              <div style={{ color: MUTED, fontSize: 22, letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
