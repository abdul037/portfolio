'use client'

/**
 * Resume viewer.
 *
 * The prototype rendered the PDF by lazy-loading pdf.js from a CDN and painting
 * each page to a canvas. Production uses the browser's own PDF viewer instead —
 * no third-party script, no extra bytes, and it keeps text selectable and
 * searchable. Browsers without an inline viewer (notably mobile Safari) fall
 * through to the open/download link.
 */
import type { ViewModel } from '@/lib/useViewModel'

const RESUME_PATH = '/assets/AbduMuwahib_resume.pdf'

const chromeButton = {
  fontFamily: "var(--font-ibm-plex-mono), monospace",
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9a9aa5',
  textDecoration: 'none',
  background: 'none',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '5px',
  padding: '5px 12px',
  cursor: 'pointer',
  transition: 'all 0.2s',
} as const

export function ResumeModal({ v }: { v: ViewModel }) {
  if (!v.resumeOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 800,
        background: 'rgba(4,4,8,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '800px',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--a,#34d399)',
          }}
        >
          Resume · Abdul Muwahib
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href={RESUME_PATH} download style={chromeButton} className="hv-33">
            Download ↓
          </a>
          <button type="button" onClick={v.closeResume} style={chromeButton} className="hv-34">
            Close ✕
          </button>
        </div>
      </div>

      <object
        data={RESUME_PATH}
        type="application/pdf"
        aria-label="Resume — Abdul Muwahib"
        style={{
          width: '100%',
          maxWidth: '800px',
          height: 'min(1100px, 82vh)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          background: '#0b0b12',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            padding: '40px',
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: '12px',
            lineHeight: 1.8,
            color: '#9a9aa5',
          }}
        >
          This browser can’t display the PDF inline.{' '}
          <a href={RESUME_PATH} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>
            Open it in a new tab →
          </a>
        </div>
      </object>
    </div>
  )
}
