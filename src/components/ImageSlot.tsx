'use client'

/**
 * Stand-in for a screenshot that has not been supplied yet.
 *
 * The prototype used a drag-and-drop `<image-slot>` web component for empty
 * screenshot slots. In production those slots either carry a real image or —
 * for the catalog entries and category tiles still awaiting screenshots — show
 * a labelled placeholder built from the slot's own descriptive hint.
 */
export function ImageSlot({ src, label }: { src?: string | null; label?: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label ?? ''}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={label ?? 'Screenshot pending'}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px',
        boxSizing: 'border-box',
        textAlign: 'center',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005)), repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 8px, transparent 8px 16px)',
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: '9px',
          lineHeight: 1.6,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#4a4a55',
        }}
      >
        {label || 'Screenshot pending'}
      </span>
    </div>
  )
}
