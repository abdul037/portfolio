'use client'

/**
 * Decorative motion.
 *
 * Everything here is ambience: particle fields, cursor glow, magnetic nav
 * items, scroll reveals, counters and gauges. All of it is gated on
 * `prefers-reduced-motion`; when motion is reduced the hook still resolves
 * reveals, counters, bars and gauges to their finished state so no content is
 * left hidden or blank — it just gets there without animating.
 */
import { useEffect } from 'react'

const REVEAL_THRESHOLD = 0.08
const REVEAL_DELAY_STEP = 0.09
const COUNT_DURATION = 1200

/** Circumference-derived dash length for the 46r gauge arcs in the design. */
const GAUGE_ARC_LENGTH = 216.77
const GAUGE_ARC_GAP = 72.26

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/* ── Reveals, counters, bars, gauges ──────────────────────────────────── */

function fillBars(root: Element) {
  root.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
    bar.style.width = `${bar.getAttribute('data-bar')}%`
  })
}

function fillGauges(root: Element, animate: boolean) {
  root.querySelectorAll<SVGElement>('[data-gauge-arc]').forEach((arc) => {
    if (arc.dataset.gaugeDone) return
    arc.dataset.gaugeDone = '1'

    const percent = Math.max(0, Math.min(100, parseFloat(arc.getAttribute('data-gauge-arc') || '0'))) / 100
    const target = GAUGE_ARC_LENGTH * percent

    if (!animate) {
      arc.setAttribute('stroke-dasharray', `${target} ${GAUGE_ARC_LENGTH + GAUGE_ARC_GAP - target}`)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_DURATION)
      const value = target * easeOutCubic(progress)
      arc.setAttribute('stroke-dasharray', `${value} ${GAUGE_ARC_LENGTH + GAUGE_ARC_GAP - value}`)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function countUp(el: HTMLElement, animate: boolean) {
  if (el.dataset.countDone) return
  el.dataset.countDone = '1'

  const end = parseFloat(el.getAttribute('data-count') || '0')
  const suffix = el.getAttribute('data-suffix') || ''

  if (!animate) {
    el.textContent = `${Math.round(end)}${suffix}`
    return
  }

  const start = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / COUNT_DURATION)
    el.textContent = `${Math.round(end * easeOutCubic(progress))}${suffix}`
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useMotionFx() {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const cleanups: (() => void)[] = []

    /* Reveals — one observer, re-scanned as React swaps sections in and out. */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue

          const el = entry.target as HTMLElement
          const delay = parseInt(el.getAttribute('data-delay') || '0', 10)
          if (delay && !reduced) el.style.transitionDelay = `${Math.min(delay, 10) * REVEAL_DELAY_STEP}s`

          el.classList.add('on')
          fillBars(el)
          fillGauges(el, !reduced)
          if (el.hasAttribute('data-count')) countUp(el, !reduced)

          observer.unobserve(el)
        }
      },
      { threshold: REVEAL_THRESHOLD },
    )

    const scan = () => {
      document
        .querySelectorAll<HTMLElement>('[data-reveal]:not(.on), [data-count]:not([data-count-done])')
        .forEach((el) => observer.observe(el))
    }

    scan()

    // React re-creates nodes on filter changes and view switches, so re-scan
    // after the DOM settles rather than on every mutation.
    let rescanPending = false
    const mutations = new MutationObserver(() => {
      if (rescanPending) return
      rescanPending = true
      window.setTimeout(() => {
        rescanPending = false
        scan()
      }, 120)
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    cleanups.push(() => {
      observer.disconnect()
      mutations.disconnect()
    })

    /* Scroll progress bar + parallax depth. */
    let scrollQueued = false
    const onScroll = () => {
      if (scrollQueued) return
      scrollQueued = true
      requestAnimationFrame(() => {
        scrollQueued = false

        const bar = document.querySelector<HTMLElement>('[data-progress]')
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (bar && max > 0) bar.style.width = `${(window.scrollY / max) * 100}%`

        if (reduced) return
        document.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
          const depth = parseFloat(el.getAttribute('data-depth') || '0')
          el.style.transform = `translateY(${window.scrollY * depth}px)`
        })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    cleanups.push(() => window.removeEventListener('scroll', onScroll))

    if (reduced) {
      return () => cleanups.forEach((fn) => fn())
    }

    /* Cursor glow — eased toward the pointer so it trails rather than snaps. */
    let pointerX = -10000
    let pointerY = -10000
    let glowX = -10000
    let glowY = -10000
    let glowFrame = 0

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const glowLoop = () => {
      glowX += (pointerX - glowX) * 0.07
      glowY += (pointerY - glowY) * 0.07
      const glow = document.querySelector<HTMLElement>('[data-glow]')
      if (glow) {
        glow.style.left = `${glowX}px`
        glow.style.top = `${glowY}px`
      }
      glowFrame = requestAnimationFrame(glowLoop)
    }
    glowFrame = requestAnimationFrame(glowLoop)

    cleanups.push(() => {
      window.removeEventListener('pointermove', onPointerMove)
      cancelAnimationFrame(glowFrame)
    })

    /* Magnetic elements — nav items and CTAs lean toward the cursor. */
    const magneticMove = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-magnetic]')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dx = (event.clientX - rect.left - rect.width / 2) * 0.12
      const dy = (event.clientY - rect.top - rect.height / 2) * 0.12
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`
    }

    const magneticLeave = (event: PointerEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-magnetic]')
      if (!el) return
      el.style.transition = 'transform .5s cubic-bezier(.2,.7,.2,1)'
      el.style.transform = ''
      window.setTimeout(() => {
        el.style.transition = ''
      }, 500)
    }

    // Delegated from the document so elements React mounts later are covered.
    document.addEventListener('pointermove', magneticMove, { passive: true })
    document.addEventListener('pointerout', magneticLeave, { passive: true })
    cleanups.push(() => {
      document.removeEventListener('pointermove', magneticMove)
      document.removeEventListener('pointerout', magneticLeave)
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])
}

/* ── Particle network canvases ────────────────────────────────────────── */

const NODE_COLORS = ['52,211,153', '34,211,238', '167,139,250', '244,114,182']

/** Distance under which two nodes are joined by a line. */
const LINK_DISTANCE = 200

/**
 * Draw a drifting particle network into a canvas.
 * Returns a teardown that stops the loop and detaches the resize listener.
 */
export function initParticleNetwork(canvas: HTMLCanvasElement, nodeCount: number, scale = 1.5): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  let width = 0
  let height = 0
  let frame = 0

  const resize = () => {
    width = canvas.width = Math.max(1, canvas.offsetWidth * scale)
    height = canvas.height = Math.max(1, canvas.offsetHeight * scale)
  }
  resize()

  const nodes = Array.from({ length: nodeCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2 + 1,
    col: NODE_COLORS[(Math.random() * NODE_COLORS.length) | 0],
  }))

  window.addEventListener('resize', resize)

  const draw = () => {
    ctx.clearRect(0, 0, width, height)

    for (const node of nodes) {
      node.x += node.vx
      node.y += node.vy
      if (node.x < 0 || node.x > width) node.vx *= -1
      if (node.y < 0 || node.y > height) node.vy *= -1

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${node.col},0.4)`
      ctx.fill()
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance >= LINK_DISTANCE) continue

        ctx.beginPath()
        ctx.moveTo(nodes[i].x, nodes[i].y)
        ctx.lineTo(nodes[j].x, nodes[j].y)
        ctx.strokeStyle = `rgba(${nodes[i].col},${0.08 * (1 - distance / LINK_DISTANCE)})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }

    frame = requestAnimationFrame(draw)
  }

  frame = requestAnimationFrame(draw)

  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
  }
}

/** Wire up both particle canvases (fixed ambient field + hero field). */
export function useParticleCanvases() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const teardowns: (() => void)[] = []

    // The hero canvas mounts a beat after the boot overlay clears.
    const timer = window.setTimeout(() => {
      document.querySelectorAll<HTMLCanvasElement>('canvas[data-neural-bg]').forEach((canvas) => {
        teardowns.push(initParticleNetwork(canvas, 60))
      })
      document.querySelectorAll<HTMLCanvasElement>('canvas[data-hero-canvas]').forEach((canvas) => {
        teardowns.push(initParticleNetwork(canvas, 60))
      })
    }, 500)

    return () => {
      window.clearTimeout(timer)
      teardowns.forEach((fn) => fn())
    }
  }, [])
}
