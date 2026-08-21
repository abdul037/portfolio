'use client'

/**
 * First-visit boot sequence.
 *
 * A terminal-styled cold open that states what the portfolio contains before
 * the hero appears. It is deliberately skippable and self-limiting:
 *
 *   - a SKIP control is present from the first frame, and Enter/Escape dismiss it
 *   - it plays once per browser session, so the reloads that happen during a
 *     live walkthrough go straight to the hero
 *   - reduced-motion visitors never see it at all
 */
import { useCallback, useEffect, useRef } from 'react'

import { dismissIntro, useIntroPlaying } from '@/lib/introStore'

/** Total run time before the overlay clears itself. */
const BOOT_DURATION = 17000

type LineStyle = 'default' | 'dim' | 'cyan' | 'accent'

interface BootLine {
  /** Text to print. */
  t: string
  /** Milliseconds after boot start. */
  d: number
  style?: LineStyle
  /** Vertical gap instead of a line of text. */
  spacer?: boolean
  /** Large, glowing headline treatment. */
  big?: boolean
  /** Extra text-shadow bloom. */
  glow?: boolean
  /** Type the text out character by character. */
  typewriter?: boolean
  /** Animated loading bar. */
  progress?: boolean
}

const LINES: BootLine[] = [
  { t: '> Incoming connection detected ...', d: 0, style: 'dim' },
  { t: '> Verifying access ████████████ GRANTED', d: 700, style: 'dim' },
  { t: '', d: 1400, spacer: true },
  { t: '╔═══════════════════════════════════════════════╗', d: 1600, style: 'dim' },
  { t: '║', d: 1700, spacer: true },
  { t: "  WHAT'S IN IT FOR YOU?", d: 1800, style: 'accent', big: true, typewriter: true },
  { t: '║', d: 3200, spacer: true },
  { t: '╚═══════════════════════════════════════════════╝', d: 3400, style: 'dim' },
  { t: '', d: 3700, spacer: true },
  { t: "  You're about to explore a live portfolio of", d: 4000, style: 'cyan' },
  { t: '  AI products built, shipped, and measured.', d: 4500, style: 'cyan' },
  { t: '  Not mockups. Not slide decks. Real systems.', d: 5100, glow: true },
  { t: '', d: 5700, spacer: true },
  { t: "┌─ WHAT YOU'LL FIND ─────────────────────────", d: 5900, style: 'accent' },
  { t: '│', d: 6000, spacer: true },
  { t: '│  ▸ 28+ enterprise products — live screenshots & deep-dives', d: 6200 },
  { t: "│  ▸ 8 healthcare AI case studies — built on Abu Dhabi's ecosystem", d: 6800 },
  { t: '│  ▸ AI Agents — autonomous workflows from inbox to dispatch', d: 7400 },
  { t: '│  ▸ NVIDIA AI infrastructure mapped to real use cases', d: 8000 },
  { t: '│  ▸ UI ideas, product insights & architecture patterns to take away', d: 8600 },
  { t: '│', d: 9100, spacer: true },
  { t: '└───────────────────────────────────────────────', d: 9200, style: 'dim' },
  { t: '', d: 9500, spacer: true },
  { t: '┌─ WHO BUILT THIS ──────────────────────────', d: 9700, style: 'accent' },
  { t: '│', d: 9800, spacer: true },
  { t: '  ABDUL MUWAHIB', d: 10000, style: 'accent', big: true, typewriter: true },
  { t: '  Senior Product Manager · Data & AI · Dubai', d: 11300, style: 'cyan' },
  { t: "  NIT Jalandhar · Gold Medalist · University Topper '20", d: 11800 },
  { t: "  Youngest CEO's Office member · Badminton Nationals U17", d: 12400 },
  { t: '│', d: 12900, spacer: true },
  { t: '└───────────────────────────────────────────────', d: 13000, style: 'dim' },
  { t: '', d: 13300, spacer: true },
  { t: '> Loading portfolio ░░░░░░░░░░', d: 13500, progress: true },
  { t: '', d: 14500, spacer: true },
  { t: "> Click anything. Dig deep. It's all real.", d: 14800, style: 'accent', glow: true, typewriter: true },
]

const LINE_COLORS: Record<LineStyle, string> = {
  dim: 'rgba(52,211,153,0.2)',
  cyan: '#22d3ee',
  accent: '#34d399',
  default: 'rgba(52,211,153,0.55)',
}

const RAIN_CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ'
const RAIN_COLUMN_WIDTH = 14

/*
 * The frames are drawn with box-characters at a fixed column count, so the
 * type scales with the viewport instead of wrapping. The clamp ceilings are
 * the design's original sizes.
 */
const SIZE_BODY = 'clamp(7px, 2.1vw, 11px)'
const SIZE_ACCENT = 'clamp(8px, 2.5vw, 13px)'
const SIZE_HEADLINE = 'clamp(15px, 4.6vw, 24px)'
const SIZE_CURSOR = 'clamp(9px, 2.7vw, 14px)'

function lineStyleFor(line: BootLine): string {
  const color = LINE_COLORS[line.style ?? 'default']
  const parts = [
    'opacity:0',
    'transform:translateX(-10px)',
    'transition:all .3s ease',
    'margin:3px 0',
    `font-size:${SIZE_BODY}`,
    'letter-spacing:0.05em',
    `color:${color}`,
  ]

  if (line.style === 'accent') {
    parts.push('font-weight:700', `font-size:${SIZE_ACCENT}`, 'text-shadow:0 0 20px rgba(52,211,153,0.5)')
  }
  if (line.big) {
    parts.push(
      `font-size:${SIZE_HEADLINE}`,
      'letter-spacing:0.12em',
      'margin-bottom:4px',
      'margin-top:4px',
      'animation:bootPulseGlow 2s ease-in-out infinite',
    )
  }
  if (line.glow) {
    parts.push('text-shadow:0 0 30px rgba(52,211,153,0.7),0 0 60px rgba(52,211,153,0.3)')
  }

  return parts.join(';') + ';'
}

export function BootIntro() {
  const overlayRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const rainRef = useRef<HTMLCanvasElement>(null)

  // Whether the intro runs at all is decided outside React — see introStore.
  const visible = useIntroPlaying()
  const finish = useCallback(() => dismissIntro(), [])

  // Drive the sequence.
  useEffect(() => {
    if (!visible) return

    const terminal = terminalRef.current
    if (!terminal) return

    const timers: number[] = []
    const intervals: number[] = []
    terminal.innerHTML = ''

    const cursor = document.createElement('span')
    cursor.textContent = '▌'
    cursor.style.cssText = `color:#34d399;animation:bootBlink 0.7s step-end infinite;font-size:${SIZE_CURSOR};`

    const appendCursor = (el: HTMLElement) => {
      cursor.parentNode?.removeChild(cursor)
      el.appendChild(cursor)
    }

    const reveal = (el: HTMLElement) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.opacity = '1'
          el.style.transform = 'translateX(0)'
        }),
      )
    }

    for (const line of LINES) {
      timers.push(
        window.setTimeout(() => {
          if (line.spacer) {
            const spacer = document.createElement('div')
            spacer.style.height = line.t === '║' ? '4px' : '8px'
            terminal.appendChild(spacer)
            return
          }

          const el = document.createElement('div')
          el.style.cssText = lineStyleFor(line)

          if (line.progress) {
            el.style.color = 'rgba(52,211,153,0.4)'
            el.textContent = '> Loading portfolio '
            terminal.appendChild(el)
            reveal(el)

            let filled = 0
            const interval = window.setInterval(() => {
              filled++
              el.textContent = `> Loading portfolio ${'█'.repeat(filled)}${'░'.repeat(Math.max(0, 10 - filled))}`
              if (filled >= 10) {
                window.clearInterval(interval)
                el.style.color = '#34d399'
                el.textContent = '> Loading portfolio ██████████ DONE'
              }
            }, 70)
            intervals.push(interval)
            return
          }

          terminal.appendChild(el)
          reveal(el)

          if (line.typewriter) {
            let index = 0
            el.textContent = ''
            const interval = window.setInterval(() => {
              el.textContent += line.t[index]
              index++
              if (index >= line.t.length) window.clearInterval(interval)
            }, 45)
            intervals.push(interval)
          } else {
            el.textContent = line.t
          }

          appendCursor(el)
        }, line.d),
      )
    }

    timers.push(window.setTimeout(finish, BOOT_DURATION))

    return () => {
      timers.forEach(window.clearTimeout)
      intervals.forEach(window.clearInterval)
    }
  }, [visible, finish])

  // Matrix rain behind the terminal text.
  useEffect(() => {
    if (!visible) return

    const canvas = rainRef.current
    const overlay = overlayRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !overlay || !ctx) return

    canvas.width = overlay.offsetWidth || 1200
    canvas.height = overlay.offsetHeight || 800

    const columns = Math.max(1, Math.floor(canvas.width / RAIN_COLUMN_WIDTH))
    const drops = Array.from({ length: columns }, () => (Math.random() * -50) | 0)

    let frame = 0
    const draw = () => {
      ctx.fillStyle = 'rgba(7,7,14,0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#34d399'
      ctx.font = '12px monospace'

      for (let column = 0; column < drops.length; column++) {
        const char = RAIN_CHARS[(Math.random() * RAIN_CHARS.length) | 0]
        ctx.fillText(char, column * RAIN_COLUMN_WIDTH, drops[column] * RAIN_COLUMN_WIDTH)
        if (drops[column] * RAIN_COLUMN_WIDTH > canvas.height && Math.random() > 0.975) drops[column] = 0
        drops[column]++
      }

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [visible])

  // Enter or Escape skips.
  useEffect(() => {
    if (!visible) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        finish()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, finish])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      data-hero-overlay="1"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#07070e',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // The box-drawing frames are a fixed character width. On a narrow
        // screen they would otherwise widen the overlay and push SKIP out of
        // reach, so the overflow is clipped rather than allowed to reflow.
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes bootBlink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes bootPulseGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(52,211,153,0.5) }
          50% { text-shadow: 0 0 40px rgba(52,211,153,0.9), 0 0 80px rgba(52,211,153,0.3) }
        }
      `}</style>

      <canvas
        ref={rainRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12, zIndex: 0 }}
      />

      <div
        ref={terminalRef}
        data-boot-terminal
        style={{
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          maxWidth: '560px',
          width: '100%',
          padding: '0 32px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          // Narrow screens shrink the type rather than wrapping the frames.
          fontSize: 'clamp(7px, 2.1vw, 11px)',
          whiteSpace: 'pre',
        }}
      />

      <div
        data-boot-scan
        style={{
          position: 'absolute',
          left: '-20%',
          width: '20%',
          height: '1px',
          top: '50%',
          background: 'linear-gradient(90deg, transparent, var(--a,#34d399), transparent)',
          boxShadow: '0 0 30px rgba(var(--aRGB,52,211,153),0.6)',
          opacity: 0,
        }}
      />

      <button
        type="button"
        onClick={finish}
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          fontSize: '10px',
          letterSpacing: '0.12em',
          color: 'rgba(52,211,153,0.55)',
          cursor: 'pointer',
          padding: '10px 18px',
          zIndex: 2,
          background: 'none',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: '5px',
          transition: 'all .2s',
        }}
      >
        SKIP ↵
      </button>
    </div>
  )
}
