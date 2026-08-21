'use client'

/**
 * The portfolio's single view model.
 *
 * The prototype kept all state in one component and computed every render value
 * in a `renderVals()` method. That shape is preserved here — one hook owning the
 * state, returning the fully-derived object the generated markup binds against —
 * because the design's styling is data-driven: an agent study's colour, a
 * status tint, and an effort badge are all computed per item, and splitting that
 * across components would scatter the palette.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { agentExtras, agentStudies, agentTech, projects, projectTech } from '@/data'
import {
  careerAmazon,
  careerGulf,
  careerRivigo,
  catalog as catalogSource,
  presSteps,
  type CareerEntry,
  type CatalogItem,
} from '@/data/site'
import { chatMessagesFor, chatRepliesFor, type ChatStep } from '@/lib/chat'
import { resolveCommand } from '@/lib/terminal'

const MONO = "font-family:var(--font-ibm-plex-mono),monospace;"

/** Sticky-header offset applied when scrolling to a section. */
const SCROLL_OFFSET = 70

/** Sections the scroll-spy tracks, in document order. */
const SPY_SECTIONS = ['featured', 'healthagents', 'impact', 'career', 'method', 'about', 'contact']

/** Deep-dive accent — project deep-dives read blue, agents use their own colour. */
const DEEPDIVE_BLUE = '#60a5fa'

/** Role colours for an example-run transcript. */
const ROLE_COLORS: Record<string, string> = {
  User: '#22d3ee',
  Agent: DEEPDIVE_BLUE,
  Tool: 'var(--a,#34d399)',
  System: '#8a93a5',
  Human: '#fbbf24',
}

const MODE_COLORS: Record<string, string> = {
  act: 'var(--a,#34d399)',
  ask: '#fbbf24',
  block: '#fb7185',
}

const MODE_LABELS: Record<string, string> = {
  act: 'AUTONOMOUS',
  ask: 'ASKS HUMAN',
  block: 'HARD STOP',
}

const GCC_COLORS: Record<string, string> = {
  Fintech: '#818cf8',
  Delivery: '#fb923c',
  Airlines: '#38bdf8',
  Crypto: '#fbbf24',
}

const CATALOG_DOMAINS = ['All', 'Products', 'AI Apps', 'Agents', 'Product Case Studies', 'Data Analytics']
const CATALOG_INDUSTRIES = ['All', 'Supply Chain', 'Healthcare', 'CRM', 'Fintech', 'Delivery', 'Airlines', 'Crypto']
const HOME_INDUSTRIES = ['All', 'Supply Chain', 'Healthcare', 'CRM']

const IMPACT_TICKER = [
  '10 Countries Live',
  '28 Products Shipped',
  '300+ Manual Hours Removed',
  '<1 Wk Problem to Prototype',
  '6 Yrs Shipping Products',
]

const FILTER_CHIP =
  "font-family:var(--font-ibm-plex-mono),monospace;font-size:11px;letter-spacing:0.04em;padding:8px 14px;border-radius:6px;cursor:pointer;transition:all .2s;"

const KHINT_STORAGE_KEY = 'apm_khint_dismissed'

export type View = 'home' | 'catalog'
export type ModalTab = 'overview' | 'deep' | 'roadmap'
export type AgentTab = 'overview' | 'deep'

export interface TerminalLine {
  cmd: string
  res: string
}

/**
 * The generated markup binds to this object by property path. It is
 * intentionally loose: the ported design reads dozens of derived style strings
 * and per-item flags, and typing each one adds no safety over the data it is
 * derived from.
 */
export type ViewModel = Record<string, any>

/* ── Derivation helpers ───────────────────────────────────────────────── */

function effortStyle(effort: string | undefined): string {
  switch ((effort || '').toLowerCase()) {
    case 'low':
      return 'color:#34d399;background:rgba(var(--aRGB,52,211,153),0.1);border-color:rgba(var(--aRGB,52,211,153),0.3);'
    case 'high':
      return 'color:#f472b6;background:rgba(244,114,182,0.1);border-color:rgba(244,114,182,0.3);'
    default:
      return 'color:#fbbf24;background:rgba(251,191,36,0.1);border-color:rgba(251,191,36,0.3);'
  }
}

/** Example-run transcript rows, tinted per speaker role. */
function techExample(steps: any[] | undefined, agentColor: string) {
  return (steps ?? []).map((step: any) => {
    const color = step.who === 'Agent' ? agentColor : (ROLE_COLORS[step.who] ?? '#8a93a5')
    return {
      who: step.who,
      t: step.t,
      chipStyle:
        MONO +
        'font-size:8px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;color:' +
        color +
        ';background:' +
        color +
        '14;border:1px solid ' +
        color +
        '3a;border-radius:4px;padding:4px 0;flex-shrink:0;width:66px;text-align:center;',
    }
  })
}

function techArch(steps: any[] | undefined, accent: string) {
  return (steps ?? []).map((step: any, index: number) => ({
    s: step.s,
    d: step.d,
    num: '0' + (index + 1),
    numStyle:
      'width:24px;height:24px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;' +
      MONO +
      'font-size:9px;font-weight:700;color:#07070e;background:' +
      accent +
      ';flex-shrink:0;',
  }))
}

/**
 * Tool contracts. A read-only contract is dimmed; anything that mutates state
 * is called out in amber so the side effect is impossible to miss.
 */
function techContracts(contracts: any[] | undefined, accent: string, mutatingPattern: RegExp) {
  return (contracts ?? []).map((contract: any) => ({
    n: contract.n,
    a: contract.a,
    r: contract.r,
    e: contract.e,
    nStyle: MONO + 'font-size:11.5px;font-weight:600;color:' + accent + ';',
    effStyle: MONO + 'font-size:9.5px;line-height:1.4;color:' + (mutatingPattern.test(contract.e) ? '#5a5a64' : '#fbbf24') + ';',
  }))
}

function techAutonomy(rows: any[] | undefined) {
  return (rows ?? []).map((row: any) => {
    const color = MODE_COLORS[row.mode] ?? '#8a93a5'
    return {
      w: row.w,
      a: row.a,
      badge: MODE_LABELS[row.mode] ?? row.mode,
      badgeStyle:
        MONO +
        'font-size:7.5px;letter-spacing:0.07em;font-weight:600;color:' +
        color +
        ';background:' +
        color +
        '16;border:1px solid ' +
        color +
        '44;border-radius:3px;padding:3px 8px;white-space:nowrap;',
      dotStyle: 'width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;background:' + color + ';',
    }
  })
}

/** First model/runtime names from an integration stack, for the card chips. */
function stackNames(integrations: any[]): string[] {
  const modelLayer = integrations.find((group: any) => group.layer.indexOf('Model') === 0)
  return (modelLayer?.items ?? []).map((item: string) => item.split(/ [—-] | \(/)[0].trim())
}

/* ── Catalog composition ──────────────────────────────────────────────── */

interface DecoratedCatalogItem extends CatalogItem {
  thumbSrc: string
  noThumb: boolean
  studyFlag: string
  studyFlagStyle: string
}

/**
 * The catalog is the master index. Each card borrows its thumbnail from the
 * first screenshot of the project it opens, and inherits a LIVE / CONCEPT flag
 * from that project's enhancement record.
 */
function decorateCatalog(): DecoratedCatalogItem[] {
  return catalogSource.map((item) => {
    const modalKey = item.modal
    const project = modalKey ? projects[modalKey] : undefined
    const thumbSrc = item.thumbSrc || project?.modules?.[0]?.shots?.[0]?.src || ''
    const studyType = project?.enhancements?.studyType

    let studyFlag = ''
    let studyFlagStyle = ''
    if (studyType === 'live') {
      studyFlag = 'LIVE'
      studyFlagStyle = 'color:#07070e;background:#34d399;border:1px solid #34d399;'
    } else if (studyType === 'concept') {
      studyFlag = 'CONCEPT'
      studyFlagStyle = 'color:#a78bfa;background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.4);'
    }

    return { ...item, thumbSrc, noThumb: !thumbSrc, studyFlag, studyFlagStyle }
  })
}

const DECORATED_CATALOG = decorateCatalog()

/** Cards without an explicit industry fall back to their domain's default. */
function industryOf(item: CatalogItem): string {
  if (item.industry) return item.industry
  return item.domain === 'Product Case Studies' ? 'Healthcare' : 'Supply Chain'
}

/* ── Hook ─────────────────────────────────────────────────────────────── */

export function useViewModel(): ViewModel {
  const [view, setView] = useState<View>('home')
  const [modal, setModal] = useState<string | null>(null)
  const [ha, setHa] = useState<string | null>(null)
  const [mTab, setMTab] = useState<ModalTab>('overview')
  const [haTab, setHaTab] = useState<AgentTab>('overview')

  const [filter, setFilter] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [homeIndustry, setHomeIndustry] = useState('All')
  const [haInd, setHaInd] = useState('All')

  const [activeSec, setActiveSec] = useState<string | null>(null)
  const [careerQ, setCareerQ] = useState<string | null>(null)
  const [gccOpen, setGccOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [hoverProj, setHoverProj] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [zoomImg, setZoomImg] = useState<{ src: string; w: number; h: number } | null>(null)

  const [chatOpen, setChatOpen] = useState(false)
  const [chatStep, setChatStep] = useState<ChatStep>('welcome')

  const [termOpen, setTermOpen] = useState(false)
  const [termHistory, setTermHistory] = useState<TerminalLine[]>([])
  const [termStep, setTermStep] = useState(0)

  const [presMode, setPresMode] = useState(false)
  const [presStep, setPresStep] = useState(0)

  const [resumeOpen, setResumeOpen] = useState(false)
  const [kHint, setKHint] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  /* ── Navigation ── */

  const go = useCallback((next: View) => {
    setView(next)
    window.setTimeout(() => window.scrollTo({ top: 0 }), 30)
  }, [])

  const navTo = useCallback(
    (id: string) => {
      const jump = () => {
        const el = document.getElementById(id)
        if (el) {
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET,
            behavior: 'smooth',
          })
        }
      }

      if (view !== 'home') {
        setView('home')
        window.setTimeout(jump, 90)
      } else {
        jump()
      }
    },
    [view],
  )

  const openModal = useCallback((key: string) => {
    setModal(key)
    setHa(null)
    setMTab('overview')
  }, [])

  const openAgent = useCallback((id: string) => {
    setHa(id)
    setModal(null)
    setHaTab('overview')
  }, [])

  /* ── Presentation mode ── */

  const presGo = useCallback((index: number) => {
    const step = presSteps[index]
    if (!step) return

    setPresStep(index)
    setModal(step.modal ?? null)
    setHa(step.ha ?? null)

    if (step.section) {
      window.setTimeout(
        () => {
          const el = document.getElementById(step.section as string)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        },
        step.modal ? 0 : 100,
      )
    }
  }, [])

  // presGo is stable, but the key handler needs the latest step index without
  // re-binding the listener on every step change. Refs are synced after commit
  // rather than during render; every reader runs from an event or an effect.
  const presStepRef = useRef(presStep)
  useEffect(() => {
    presStepRef.current = presStep
  }, [presStep])

  const presNext = useCallback(() => {
    const current = presStepRef.current
    if (current < presSteps.length - 1) presGo(current + 1)
  }, [presGo])

  const presPrev = useCallback(() => {
    const current = presStepRef.current
    if (current > 0) presGo(current - 1)
  }, [presGo])

  /* ── Terminal ── */

  const termGo = useCallback(
    (index: number) => {
      const step = presSteps[index]
      if (!step) return

      setTermStep(index)
      if (step.ha) {
        setModal(null)
        setHa(step.ha)
      } else if (step.modal) {
        setModal(step.modal)
        setHa(null)
      } else if (step.section) {
        setModal(null)
        setHa(null)
        navTo(step.section)
      }
    },
    [navTo],
  )

  const termStepRef = useRef(termStep)
  useEffect(() => {
    termStepRef.current = termStep
  }, [termStep])

  const termExec = useCallback(
    (raw: string) => {
      const command = (raw || '').trim()
      if (!command) return

      const { response, action } = resolveCommand(command, termStepRef.current)

      switch (action.kind) {
        case 'close':
          setTermOpen(false)
          return
        case 'clear':
          setTermHistory([])
          return
        case 'step':
          termGo(action.index)
          break
        case 'view':
          go(action.view)
          break
        case 'section':
          navTo(action.id)
          break
        case 'modal':
          setModal(action.key)
          setHa(null)
          break
        case 'agent':
          setModal(null)
          setHa(action.id)
          break
        case 'industry':
          setHaInd(action.industry)
          setModal(null)
          setHa(null)
          navTo('healthagents')
          break
        default:
          break
      }

      setTermHistory((history) => history.concat([{ cmd: raw, res: response }]))
      window.setTimeout(() => {
        const log = document.querySelector('[data-term-log]')
        if (log) log.scrollTop = log.scrollHeight
      }, 50)
    },
    [go, navTo, termGo],
  )

  const focusTerminal = useCallback(() => {
    window.setTimeout(() => document.getElementById('term-input')?.focus(), 100)
  }, [])

  /* ── Effects ── */

  // Body scroll lock while a modal owns the screen.
  useEffect(() => {
    document.documentElement.style.overflow = modal || ha ? 'hidden' : ''
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [modal, ha])

  // First-visit ⌘K hint, shown once per browser.
  useEffect(() => {
    let dismissed = false
    try {
      dismissed = !!localStorage.getItem(KHINT_STORAGE_KEY)
    } catch {
      // Private mode or blocked storage — treat as "not yet shown".
    }
    if (dismissed) return

    const timer = window.setTimeout(() => setKHint(true), 2600)
    return () => window.clearTimeout(timer)
  }, [])

  // Scroll-spy for the primary nav. Off the home view there is nothing to spy
  // on, so the listener simply is not attached and `activeSec` is ignored at
  // read time rather than being reset here.
  useEffect(() => {
    if (view !== 'home') return

    const onScroll = () => {
      const threshold = window.scrollY + 130
      let current: string | null = null

      for (const id of SPY_SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top + window.scrollY <= threshold) current = id
      }

      setActiveSec((previous) => (previous === current ? previous : current))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = window.setTimeout(onScroll, 700)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(timer)
    }
  }, [view])

  // The key handler is bound once; this ref gives it the current layer state
  // without re-registering the listener on every open/close.
  const layers = useRef({ modal, ha, presMode, termOpen, mobileNavOpen })
  useEffect(() => {
    layers.current = { modal, ha, presMode, termOpen, mobileNavOpen }
  }, [modal, ha, presMode, termOpen, mobileNavOpen])

  // Keyboard: ⌘K terminal, "p" presentation mode, Escape unwinds the top layer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      const current = layers.current

      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setTermOpen((open) => !open)
        focusTerminal()
        return
      }

      if (event.key === 'Escape') {
        // Close the deepest layer only, so Escape unwinds one step at a time.
        if (current.presMode) setPresMode(false)
        else if (current.mobileNavOpen) setMobileNavOpen(false)
        else if (current.ha) setHa(null)
        else if (current.modal) setModal(null)
        else if (current.termOpen) setTermOpen(false)
        return
      }

      if (!current.presMode) {
        if (event.key === 'p' && !event.ctrlKey && !event.metaKey && !typing) {
          event.preventDefault()
          setPresMode(true)
          presGo(0)
        }
        return
      }

      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        presNext()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        presPrev()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [focusTerminal, presGo, presNext, presPrev])

  /* ── Derived: navigation ── */

  const onHome = view === 'home'
  const currentSection = onHome ? activeSec : null

  const navItems = useMemo(
    () =>
      [
        { id: 'featured', label: 'Work' },
        { id: 'impact', label: 'Impact' },
        { id: 'healthagents', label: 'Agents' },
        { id: 'career', label: 'Experience' },
        { id: 'method', label: 'Method' },
        { id: 'about', label: 'About' },
        { id: 'contact', label: 'Contact' },
      ].map((item) => {
        const active = currentSection === item.id
        return {
          label: item.label,
          onClick: () => navTo(item.id),
          style:
            "background:none;border:none;padding:5px 0;cursor:pointer;white-space:nowrap;font-family:var(--font-space-grotesk),system-ui,sans-serif;font-size:13.5px;font-weight:500;transition:color 0.2s,border-color 0.2s;border-top:2px solid transparent;border-bottom:2px solid " +
            (active ? 'var(--a,#34d399)' : 'transparent') +
            ';color:' +
            (active ? '#f0f0f4' : '#8f8f9b') +
            ';',
        }
      }),
    [currentSection, navTo],
  )

  const mNavItems = useMemo(
    () =>
      navItems.map((item) => ({
        label: item.label,
        onClick: () => {
          setMobileNavOpen(false)
          item.onClick()
        },
        style:
          "text-align:left;background:none;border:none;border-bottom:1px solid rgba(255,255,255,0.05);padding:14px 4px;cursor:pointer;font-family:var(--font-space-grotesk),system-ui,sans-serif;font-size:16px;font-weight:500;color:#e0e0e6;",
      })),
    [navItems],
  )

  /* ── Derived: project modal ── */

  const mp = modal ? projects[modal] : null
  const PT = (modal ? projectTech[modal] : null) ?? {}

  const mpHasTech = (PT.example ?? []).length > 0
  const mpHasEnh = !!mp?.enhancements?.items?.length
  const mpHasPM = !!mp?.pm

  const mpTabDefs = useMemo(() => {
    const tabs: { id: ModalTab; label: string }[] = [{ id: 'overview', label: 'Overview' }]
    if (mpHasTech) tabs.push({ id: 'deep', label: 'Deep Dive — how it runs' })
    if (mpHasEnh || mpHasPM) tabs.push({ id: 'roadmap', label: 'Roadmap & PM' })
    return tabs
  }, [mpHasEnh, mpHasPM, mpHasTech])

  const mpTabs = mpTabDefs.map((tab) => ({
    label: tab.label,
    onClick: () => setMTab(tab.id),
    style:
      MONO +
      'font-size:11.5px;letter-spacing:0.04em;padding:10px 16px;cursor:pointer;background:none;border:none;border-bottom:2px solid ' +
      (mTab === tab.id ? 'var(--a,#34d399)' : 'transparent') +
      ';color:' +
      (mTab === tab.id ? '#f0f0f4' : '#8f8f9b') +
      ';transition:all .2s;white-space:nowrap;',
  }))

  const enhancementItems = mp?.enhancements?.items ?? []
  const mapEnhancement = (item: any) => ({
    enhance: item.enhance,
    current: item.current,
    metric: item.metric,
    impact: item.impact,
    effort: item.effort,
    effortStyle: effortStyle(item.effort),
    tier: item.tier || 'quick',
  })

  /* ── Derived: agent studies ── */

  const haIndustryOrder = useMemo(() => {
    const seen = new Set<string>()
    const order: string[] = []
    for (const study of agentStudies) {
      if (!seen.has(study.industry)) {
        seen.add(study.industry)
        order.push(study.industry)
      }
    }
    return order
  }, [])

  const haIndustries = ['All', ...haIndustryOrder].map((ind) => ({
    label: ind,
    active: ind === haInd,
    style:
      MONO +
      'font-size:11px;letter-spacing:0.04em;padding:8px 14px;border-radius:6px;cursor:pointer;transition:all .2s;white-space:nowrap;' +
      (ind === haInd
        ? 'color:#07070e;background:#e0e0e6;border:1px solid #e0e0e6;'
        : 'color:#8a8a95;background:transparent;border:1px solid rgba(255,255,255,0.1);'),
    onClick: () => setHaInd(ind),
  }))

  const haCards = agentStudies
    .filter((study) => haInd === 'All' || study.industry === haInd)
    .map((study) => {
      const toolLayer = study.integrations.find((group: any) => group.layer === 'Tools / actions')
      return {
        industry: study.industry,
        vertical: study.vertical,
        agent: study.agent,
        tagline: study.tagline,
        status: study.status,
        example: study.example || '',
        hasExample: !!study.example,
        m0v: study.metrics[0].v,
        m0l: study.metrics[0].l,
        m1v: study.metrics[1].v,
        m1l: study.metrics[1].l,
        intCount: study.integrations.reduce((total: number, group: any) => total + group.items.length, 0),
        toolCount: (toolLayer?.items ?? []).length,
        stackChips: stackNames(study.integrations).slice(0, 3),
        stackChipStyle:
          MONO +
          'font-size:8px;letter-spacing:0.04em;color:' +
          study.color +
          ';background:' +
          study.color +
          '10;border:1px solid ' +
          study.color +
          '2e;border-radius:4px;padding:3px 7px;',
        barStyle: 'height:3px;background:' + study.color + ';',
        labelStyle: MONO + 'font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:' + study.color + ';',
        dotStyle:
          'width:7px;height:7px;border-radius:50%;background:' +
          study.color +
          ';box-shadow:0 0 8px ' +
          study.color +
          ';flex-shrink:0;',
        statusStyle:
          MONO +
          'font-size:7.5px;letter-spacing:0.08em;font-weight:600;text-transform:uppercase;color:' +
          study.color +
          ';border:1px solid ' +
          study.color +
          '55;background:' +
          study.color +
          '14;border-radius:3px;padding:2px 7px;',
        arrowStyle: MONO + 'font-size:9px;letter-spacing:0.04em;color:' + study.color + ';',
        onClick: () => openAgent(study.id),
      }
    })

  const haSel = useMemo(() => {
    const study = ha ? agentStudies.find((a) => a.id === ha) : null
    if (!study) return null

    const laneNames = ['Clinician / User', 'AI Agent', 'Systems & Data']
    const laneColors = ['var(--a,#34d399)', study.color, '#8a93a5']

    const lanes = [0, 1, 2].map((laneIndex) => ({
      name: laneNames[laneIndex],
      dotStyle: 'width:7px;height:7px;border-radius:50%;background:' + laneColors[laneIndex] + ';flex-shrink:0;',
      labelStyle:
        MONO + 'font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:' + laneColors[laneIndex] + ';',
      cells: study.flow.map((step: any, stepIndex: number) => ({
        active: step.lane === laneIndex,
        num: stepIndex + 1,
        label: step.lane === laneIndex ? step.label : '',
        cardStyle:
          'flex:1;display:flex;flex-direction:column;gap:6px;padding:9px 10px;border-radius:8px;background:' +
          laneColors[laneIndex] +
          '14;border:1px solid ' +
          laneColors[laneIndex] +
          '40;',
        numStyle:
          'width:18px;height:18px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;' +
          MONO +
          'font-size:9px;font-weight:700;color:#07070e;background:' +
          laneColors[laneIndex] +
          ';',
      })),
    }))

    const integrations = study.integrations.map((group: any) => ({
      layer: group.layer,
      items: group.items,
      dotStyle: 'width:7px;height:7px;border-radius:2px;background:' + group.color + ';flex-shrink:0;',
      labelStyle:
        MONO +
        'font-size:9px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:' +
        group.color +
        ';',
      bulletStyle: 'position:absolute;left:0;top:7px;width:4px;height:4px;border-radius:50%;background:' + group.color + ';',
    }))

    const extras = agentExtras[study.id] ?? {}
    const rollout = (extras.rollout ?? []).map((phase: any, index: number) => ({
      p: phase.p,
      d: phase.d,
      num: '0' + (index + 1),
      numStyle:
        'width:26px;height:26px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;' +
        MONO +
        'font-size:10px;font-weight:700;color:#07070e;background:' +
        study.color +
        ';flex-shrink:0;',
    }))

    const tech = agentTech[study.id] ?? {}
    const hasTech = (tech.example ?? []).length > 0

    const tabDefs: { id: AgentTab; label: string }[] = [{ id: 'overview', label: 'Overview' }]
    if (hasTech) tabDefs.push({ id: 'deep', label: 'Deep Dive — how it runs' })

    const showDeep = haTab === 'deep' && hasTech

    return {
      vertical: study.vertical,
      agent: study.agent,
      name: study.name,
      tagline: study.tagline,
      status: study.status,
      industry: study.industry,
      example: study.example || '',
      hasExample: !!study.example,
      problem: study.problem,
      goal: study.goal,
      metrics: study.metrics,

      tabs: tabDefs.map((tab) => ({
        label: tab.label,
        onClick: () => setHaTab(tab.id),
        style:
          MONO +
          'font-size:11px;letter-spacing:0.05em;padding:10px 16px;cursor:pointer;background:none;border:none;border-bottom:2px solid ' +
          (haTab === tab.id ? study.color : 'transparent') +
          ';color:' +
          (haTab === tab.id ? '#f0f0f4' : '#8f8f9b') +
          ';transition:all .2s;white-space:nowrap;',
      })),
      hasTech,
      showOverview: !showDeep,
      showDeep,

      techExample: techExample(tech.example, study.color),
      techArch: techArch(tech.arch, study.color),
      techContracts: techContracts(tech.contracts, study.color, /read-only/i),
      techContext: tech.context ?? [],
      techBudget: tech.budget ?? [],
      techAutonomy: techAutonomy(tech.autonomy),

      rationale: extras.rationale ?? '',
      hasRationale: !!extras.rationale,
      stack: stackNames(study.integrations),
      rollout,
      hasRollout: rollout.length > 0,
      failureModes: extras.failureModes ?? [],
      hasFailure: (extras.failureModes ?? []).length > 0,
      evalsOffline: study.evalsOffline,
      evalsOnline: study.evalsOnline,
      lanes,
      integrations,

      stackChipStyle:
        MONO +
        'font-size:10px;letter-spacing:0.03em;color:' +
        study.color +
        ';background:' +
        study.color +
        '12;border:1px solid ' +
        study.color +
        '3a;border-radius:5px;padding:4px 10px;',
      stackTagStyle:
        MONO + 'font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:#8f8f9b;align-self:center;',
      rationaleStyle:
        'margin-top:16px;background:' +
        study.color +
        '0d;border:1px solid ' +
        study.color +
        '33;border-radius:12px;padding:20px 22px;',
      rationaleTagStyle:
        MONO + 'font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:' + study.color + ';margin-bottom:10px;',
      topBarStyle: 'height:4px;background:linear-gradient(90deg,' + study.color + ' 0%,' + study.color + '00 92%);',
      labelStyle: MONO + 'font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:' + study.color + ';',
      dotStyle:
        'width:10px;height:10px;border-radius:50%;background:' +
        study.color +
        ';box-shadow:0 0 12px ' +
        study.color +
        ';flex-shrink:0;',
      statusStyle:
        MONO +
        'font-size:8px;letter-spacing:0.08em;font-weight:600;text-transform:uppercase;color:' +
        study.color +
        ';border:1px solid ' +
        study.color +
        '55;background:' +
        study.color +
        '14;border-radius:4px;padding:3px 9px;',
      metricValStyle: 'font-size:30px;font-weight:700;letter-spacing:-0.03em;line-height:1;color:' + study.color + ';',
    }
  }, [ha, haTab])

  /* ── Derived: catalog ── */

  const catalogCards = useMemo(() => {
    let cards = filter === 'All' ? DECORATED_CATALOG : DECORATED_CATALOG.filter((c) => c.domain === filter)
    if (industry !== 'All') cards = cards.filter((c) => industryOf(c) === industry)
    return cards.map((card) => ({ ...card, onClick: () => card.modal && openModal(card.modal) }))
  }, [filter, industry, openModal])

  const gccGroups = useMemo(
    () =>
      (['Fintech', 'Delivery', 'Airlines', 'Crypto'] as const).map((ind) => {
        const color = GCC_COLORS[ind]
        return {
          label: ind,
          dotStyle: 'width:5px;height:5px;border-radius:50%;background:' + color + ';flex-shrink:0;',
          labelStyle:
            "font-family:var(--font-ibm-plex-mono),monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:" +
            color +
            ';',
          items: DECORATED_CATALOG.filter((c) => c.industry === ind).map((c) => ({
            name: c.name,
            desc: c.desc,
            key: c.modal || '',
            onClick: () => c.modal && openModal(c.modal),
          })),
        }
      }),
    [openModal],
  )

  const chipStyle = (active: boolean, accent: 'green' | 'cyan') => {
    if (!active) return FILTER_CHIP + 'background:rgba(255,255,255,0.02);color:#8f8f9b;border:1px solid rgba(255,255,255,0.06);'
    return accent === 'green'
      ? FILTER_CHIP +
          'background:rgba(var(--aRGB,52,211,153),0.12);color:#34d399;border:1px solid rgba(var(--aRGB,52,211,153),0.35);box-shadow:0 0 16px rgba(var(--aRGB,52,211,153),0.15);'
      : FILTER_CHIP +
          'background:rgba(34,211,238,0.12);color:#22d3ee;border:1px solid rgba(34,211,238,0.35);box-shadow:0 0 16px rgba(34,211,238,0.15);'
  }

  /* ── Derived: career accordions ── */

  const buildCareer = useCallback(
    (key: string, entries: CareerEntry[]) =>
      entries.map((entry, index) => {
        const id = `${key}:${index}`
        const open = careerQ === id
        return {
          q: entry.q,
          tag: entry.tag,
          tagColor: entry.tagColor,
          tagStyle: `color:${entry.tagColor};border:1px solid ${entry.tagColor}55;background:${entry.tagColor}14;`,
          isStar: !!entry.isStar,
          isList: !!entry.isList,
          isText: !!entry.isText,
          isMetrics: !!entry.isMetrics,
          star: entry.star ?? {},
          bullets: entry.bullets ?? [],
          body: entry.body ?? '',
          note: entry.note ?? '',
          webApp: entry.webApp ?? [],
          driverApp: entry.driverApp ?? [],
          open,
          chevron: open ? '−' : '+',
          rowStyle: open ? 'background:rgba(var(--aRGB,52,211,153),0.03);' : '',
          onClick: () => setCareerQ(open ? null : id),
        }
      }),
    [careerQ],
  )

  /* ── Derived: hover preview ── */

  const hoverProject = hoverProj ? projects[hoverProj] : null
  const hoverImg = hoverProject?.modules?.[0]?.shots?.[0]?.src ?? ''
  let hoverDesc = hoverProject ? (hoverProject.solutionDesc || hoverProject.problemDesc || '') : ''
  if (hoverDesc.length > 185) hoverDesc = hoverDesc.slice(0, 182).replace(/\s+\S*$/, '') + '…'

  /* ── Derived: chat ── */

  const chatReplies = chatRepliesFor(chatStep).map((reply) => ({
    icon: reply.icon,
    label: reply.label,
    onClick: () => {
      if (reply.action.kind === 'step') {
        setChatStep(reply.action.step)
      } else {
        navTo(reply.action.section)
        setChatOpen(false)
      }
    },
  }))

  /* ── Assembly ── */

  return {
    /* Views */
    isHome: view === 'home',
    isCatalog: view === 'catalog',
    isDetail: false,
    showIntro,
    dismissIntro: () => setShowIntro(false),

    /* Chrome */
    navItems,
    mNavItems,
    mobileNavOpen,
    mobileNavClosed: !mobileNavOpen,
    toggleMobileNav: () => setMobileNavOpen((open) => !open),
    closeMobileNav: () => setMobileNavOpen(false),
    goHome: () => {
      setModal(null)
      go('home')
    },
    viewPortfolio: () => go('catalog'),
    navProjects: () => go('catalog'),
    navExperience: () => navTo('career'),
    navMethod: () => navTo('method'),
    navShipAI: () => navTo('shipai'),

    /* Home — filters and tickers */
    impactTicker: [...IMPACT_TICKER, ...IMPACT_TICKER],
    filters: CATALOG_DOMAINS.map((label) => ({
      label,
      onClick: () => setFilter(label),
      style: chipStyle(label === filter, 'green'),
    })),
    industryFilters: CATALOG_INDUSTRIES.map((label) => ({
      label,
      onClick: () => setIndustry(label),
      style: chipStyle(label === industry, 'cyan'),
    })),
    homeIndustryFilters: HOME_INDUSTRIES.map((label) => ({
      label,
      onClick: () => setHomeIndustry(label),
      style: chipStyle(label === homeIndustry, 'cyan'),
    })),

    // Industry filtering on the home grid dims rather than removes, so the
    // breadth of the portfolio stays visible while the relevant column pops.
    supplyFx: homeIndustry === 'Healthcare' || homeIndustry === 'CRM' ? 'grayscale(1) opacity(0.18)' : 'none',
    aiAppsFx: homeIndustry === 'Healthcare' ? 'grayscale(1) opacity(0.18)' : 'none',
    aiAppsItemFx: homeIndustry === 'CRM' ? 'grayscale(1) opacity(0.18)' : 'none',
    docTemplateBg: homeIndustry === 'CRM' ? 'rgba(244,114,182,0.1)' : 'transparent',
    bandScmFx: homeIndustry === 'Healthcare' || homeIndustry === 'CRM' ? 'grayscale(1) opacity(0.22)' : 'none',
    bandHealthFx: homeIndustry === 'Supply Chain' || homeIndustry === 'CRM' ? 'grayscale(1) opacity(0.22)' : 'none',
    bandCrmFx: homeIndustry === 'Supply Chain' || homeIndustry === 'Healthcare' ? 'grayscale(1) opacity(0.22)' : 'none',

    /* Catalog */
    catalogCards,
    catalogEmpty: catalogCards.length === 0,
    gccGroups,
    gccOpen,
    gccToggleLabel: gccOpen ? 'Hide teardowns ↑' : 'Show all 12 GCC teardowns →',
    toggleGcc: () => setGccOpen((open) => !open),

    /* Career */
    careerGulf: buildCareer('gulf', careerGulf),
    careerRivigo: buildCareer('rivigo', careerRivigo),
    careerAmazon: buildCareer('amazon', careerAmazon),

    /* Agents */
    haCards,
    haIndustries,
    haSel,
    closeHA: () => setHa(null),

    /* Project modal */
    modalOpen: !!mp,
    mp: mp ?? {},
    closeModal: () => {
      setModal(null)
      setHoverProj(null)
    },
    mpTabs,
    mpHasTabs: mpTabDefs.length > 1,
    mpShowOverview: mTab === 'overview',
    mpShowDeep: mpHasTech && mTab === 'deep',
    mpShowRoadmap: (mpHasEnh || mpHasPM) && mTab === 'roadmap',
    mpHasTech,
    mpTechExample: techExample(PT.example, DEEPDIVE_BLUE),
    mpTechArch: techArch(PT.arch, DEEPDIVE_BLUE),
    mpTechContracts: techContracts(PT.contracts, DEEPDIVE_BLUE, /read-only|blocks/i),
    mpTechContext: PT.context ?? [],
    mpTechBudget: PT.budget ?? [],
    mpTechAutonomy: techAutonomy(PT.autonomy),
    mpHasDeliverables: !!mp?.deliverables?.length,
    mpShipAI: mp?.shipAI ?? [],
    mpHasShipAI: !!mp?.shipAI?.length,
    mpHasEcosystemNote: !!mp?.ecosystemNote,
    mpHasRealImpact: !!mp?.realImpact,
    // Concepts and teardowns describe a proposed rollout; delivered work
    // describes what actually happened.
    mpBuildLabel: /concept|proposal|teardown/i.test(mp?.roleTitle ?? '')
      ? 'How I’d Build It — Proposed Rollout'
      : 'How It Was Built',
    mpHasPhases: !!mp?.phases?.length,
    mpHasScreens: !!mp?.screens?.length,
    mpHasFeedback: !!mp?.feedback?.length,
    mpHasPM,
    mpPm: mp?.pm ?? {},
    mpHasNvidia: !!mp?.nvidiaAI?.length,
    mpHasModules: !!mp?.modules?.length,
    mpIsHealthStudy: mp?.badge === 'DoH Abu Dhabi' || mp?.badge === 'Malaffi Improvement',
    mpStudyLive: mp?.enhancements?.studyType === 'live',
    mpStudyLiveBadge: String(mp?.badge ?? '').includes('Dubai Health') ? 'Shipped by Dubai Health' : 'Shipped by DoH',
    mpStudyConcept: mp?.enhancements?.studyType === 'concept',
    mpStudyBasis: mp?.enhancements?.studyBasis ?? '',
    mpHasEnh,
    mpEnh: mp?.enhancements ?? { items: [] },
    mpEnhItems: enhancementItems.map(mapEnhancement),
    mpEnhQuick: enhancementItems.filter((it: any) => (it.tier || 'quick') === 'quick').map(mapEnhancement),
    mpEnhBets: enhancementItems.filter((it: any) => it.tier === 'bet').map(mapEnhancement),
    mpHasQuick: enhancementItems.some((it: any) => (it.tier || 'quick') === 'quick'),
    mpHasBets: enhancementItems.some((it: any) => it.tier === 'bet'),

    /* Screenshot zoom */
    zoomOpen: !!zoomImg,
    zoomSrc: zoomImg?.src ?? '',
    zoomW: zoomImg?.w ?? 1600,
    zoomH: zoomImg?.h ?? 900,
    zoomShot: (event: any) => {
      const { src, w, h } = event.currentTarget.dataset
      setZoomImg({ src, w: Number(w) || 1600, h: Number(h) || 900 })
    },
    closeZoom: () => setZoomImg(null),

    /* Hover preview */
    hoverOpen: !!hoverProject && !modal,
    hoverName: hoverProject?.name ?? '',
    hoverBadge: hoverProject?.badge ?? '',
    hoverDesc,
    hoverImg,
    hoverX: hoverPos.x,
    hoverY: hoverPos.y,
    hoverIn: (event: any) => {
      const key = event.currentTarget.getAttribute('data-proj')
      if (!key) return
      // Keep the card fully on screen regardless of where the cursor is.
      const x = Math.min(event.clientX + 18, (window.innerWidth || 1200) - 384)
      const y = Math.max(8, Math.min(event.clientY + 16, (window.innerHeight || 800) - 340))
      setHoverProj(key)
      setHoverPos({ x, y })
    },
    hoverOut: () => setHoverProj(null),

    /* Assistant chat */
    chatOpen,
    toggleChat: () => {
      setChatOpen((open) => {
        if (!open) setChatStep('welcome')
        return !open
      })
    },
    chatMessages: chatMessagesFor(chatStep),
    chatReplies,

    /* Resume */
    resumeOpen,
    openResume: () => setResumeOpen(true),
    closeResume: () => setResumeOpen(false),

    /* ⌘K hint */
    kHint,
    dismissKHint: () => {
      try {
        localStorage.setItem(KHINT_STORAGE_KEY, '1')
      } catch {
        // Storage unavailable — the hint simply reappears next visit.
      }
      setKHint(false)
    },
    openTermFromHint: () => {
      try {
        localStorage.setItem(KHINT_STORAGE_KEY, '1')
      } catch {
        // As above.
      }
      setKHint(false)
      setTermOpen(true)
      focusTerminal()
    },

    /* Terminal */
    termOpen,
    termHistory,
    termToggle: () => {
      setTermOpen((open) => !open)
      focusTerminal()
    },
    termClose: () => setTermOpen(false),
    termKeyDown: (event: any) => {
      if (event.key === 'Enter') {
        termExec(event.target.value)
        event.target.value = ''
      }
    },
    termStepItems: presSteps.map((step, index) => ({
      label: step.label,
      note: step.note,
      num: String(index + 1).padStart(2, '0'),
      onClick: () => termGo(index),
      style:
        index === termStep
          ? 'background:rgba(var(--aRGB,52,211,153),0.08);border-color:rgba(var(--aRGB,52,211,153),0.25);'
          : index < termStep
            ? 'background:rgba(var(--aRGB,52,211,153),0.02);'
            : '',
      numColor: index === termStep ? 'color:#34d399;' : index < termStep ? 'color:#059669;' : 'color:#63636d;',
      labelColor: index === termStep ? 'color:#f0f0f4;' : 'color:#9a9aa5;',
    })),

    /* Presentation mode */
    presMode,
    presStep,
    presTotal: presSteps.length,
    presLabel: presSteps[presStep]?.label ?? '',
    presNote: presSteps[presStep]?.note ?? '',
    presStepNum: String(presStep + 1).padStart(2, '0'),
    presStepItems: presSteps.map((step, index) => ({
      label: step.label,
      num: String(index + 1).padStart(2, '0'),
      active: index === presStep,
      done: index < presStep,
      onClick: () => presGo(index),
      style:
        index === presStep
          ? 'background:rgba(var(--aRGB,52,211,153),0.15);color:#34d399;border:1px solid rgba(var(--aRGB,52,211,153),0.4);'
          : index < presStep
            ? 'background:rgba(var(--aRGB,52,211,153),0.06);color:#059669;border:1px solid rgba(var(--aRGB,52,211,153),0.15);'
            : 'background:rgba(255,255,255,0.03);color:#8f8f9b;border:1px solid rgba(255,255,255,0.08);',
    })),
    presNext,
    presPrev,
    presExit: () => setPresMode(false),
    presToggle: () => {
      if (presMode) {
        setPresMode(false)
      } else {
        setPresMode(true)
        setPresStep(0)
        presGo(0)
      }
    },

    /* Direct project openers used by the home grid */
    ...Object.fromEntries(
      Object.entries(PROJECT_OPENERS).map(([name, key]) => [name, () => openModal(key)]),
    ),
  }
}

/**
 * Named openers the home grid binds to directly. The prototype declared one
 * closure per project; the mapping is kept as data so adding a card to the grid
 * is a one-line change.
 */
const PROJECT_OPENERS: Record<string, string> = {
  openPlanner: 'planner',
  openTrading: 'trading',
  openSafecount: 'safecount',
  openTharwa: 'tharwa',
  openExecIntel: 'execintel',
  openItemCode: 'itemcode',
  openScmHub: 'scmhub',
  openFero: 'fero',
  openRoutePlanning: 'routeplanning',
  openControlTower: 'shipped_control_tower',
  openLearningHub: 'learninghub',
  openDocTemplate: 'doc_template',
  openConsequenceMgmt: 'consequence_mgmt',
  openTicket: 'ticket',
  openGptErp: 'gpt_erp',
  openSynapse: 'shipped_synapse',
  openQhse: 'shipped_qhse',
  openAssetsReport: 'shipped_assets_report',
  openOpenOrders: 'shipped_open_orders',
  openAssetTracking: 'asset_tracking',
  openFoundry: 'foundry',
  openEdn: 'shipped_edn_notif',
  openContractMgmt: 'contract_mgmt',
  openTalentMgmt: 'talent_mgmt',
  openMsFabric: 'ms_fabric',
  openPopHealth: 'pop_health',
  openNewbornScreening: 'newborn_screening',
  openShifaAi: 'shifa_ai',
  openHealthTwin: 'health_twin',
  openTableegh: 'tableegh',
  openMalaffiCareGaps: 'malaffi_caregaps',
  openMalaffiPgx: 'malaffi_pgx',
  openMalaffiPatient: 'malaffi_patient',
  openSahatna: 'sahatna',
  openDubaiVicu: 'dubai_vicu',
  openNabidhCompanion: 'nabidh_companion',
  openSalamaCareGaps: 'salama_caregaps',
  openDemandForecast: 'demand_forecast',
  openNetworkTwin: 'network_twin',
  openFleetMaint: 'fleet_maintenance',
  openCrmCopilot: 'crm_copilot',
  openCrmChurn: 'crm_churn',
  openCrmPortal: 'crm_portal',
  openTelematics: 'location_telematics',
  openDashcam: 'driver_dashcam',
  openErpIntegration: 'erp_integration',
  openZfSafety: 'zf_safety',
  openDbMgmt: 'database_mgmt',
}
