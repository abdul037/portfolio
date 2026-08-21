/**
 * One-shot port of the handoff prototype's template into React components.
 *
 * The handoff ships its markup in a design-prototyping dialect: `{{ expr }}`
 * bindings, `<sc-if>` / `<sc-for>` control flow, `style-hover` attributes, and
 * inline styles on every element. Hand-transcribing ~2,700 lines of that would
 * drift from the design; this script translates it mechanically instead, so the
 * ported markup is exactly the design that was signed off.
 *
 * What it produces:
 *   - one .tsx component per top-level region of the prototype, each taking the
 *     view-model (`v`) built by src/lib/useViewModel.ts
 *   - src/app/hover.css, holding the `style-hover` rules as :hover classes
 *
 * Run: node scripts/port-template.mjs <handoff-design-dir>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = process.argv[2]
if (!srcDir) {
  console.error('usage: node scripts/port-template.mjs <handoff-design-dir>')
  process.exit(1)
}

const OUT_DIR = 'src/components/design'
const HOVER_CSS = 'src/app/hover.css'

/* ── Source slice ─────────────────────────────────────────────────────────
   The prototype file is <helmet> (fonts + <style>) then the template between
   <x-dc> and </x-dc>, then the logic class. We only want the template body,
   minus its outermost <div data-root>, which is hand-written in the shell.
   ─────────────────────────────────────────────────────────────────────── */
const raw = readFileSync(join(srcDir, 'Portfolio v7.dc.html'), 'utf8')

const lines = raw
  // The prototype loads screenshots relative to its own file; served from
  // Next's /public they need to be root-absolute.
  .replace(/(["'(=])assets\//g, '$1/assets/')
  // The fonts are self-hosted through next/font, which mints its own family
  // names, so the design's literal families resolve through CSS variables.
  .replace(/'Space Grotesk'/g, 'var(--font-space-grotesk)')
  .replace(/'IBM Plex Mono'/g, 'var(--font-ibm-plex-mono)')
  // Wording overrides: the "What I Build" grid shows real shipped products, so
  // it should not be labelled with the design's "case study" catch-all (that
  // stays on the genuine concept case studies below). See also globals.css
  // (.pf-hero::after "View build").
  .replace('Click any item to open its full case study', 'Click any item to open its full breakdown')
  // Only the status-panel display label; the window.PORTFOLIO_* references live
  // in the logic class the converter never reads.
  .replace('>PORTFOLIO</span>', '>PRODUCTS</span>')
  .split('\n')

/** 1-based, inclusive line ranges lifted from the prototype's section comments. */
const REGIONS = [
  { name: 'BackgroundLayers', from: 86, to: 88, comment: 'Fixed background layers' },
  { name: 'SiteHeader', from: 91, to: 110, comment: 'Sticky header + primary nav' },
  { name: 'MobileNav', from: 113, to: 121, comment: 'Mobile nav drawer' },
  { name: 'HomeHero', from: 127, to: 239, comment: 'Hero' },
  { name: 'HomeMarquee', from: 242, to: 275, comment: 'Achievement marquee' },
  { name: 'HomeWork', from: 278, to: 687, comment: 'Products, apps & agents' },
  { name: 'HomeImpact', from: 692, to: 707, comment: 'Proof / impact' },
  { name: 'HomeAgents', from: 710, to: 769, comment: 'AI agent case studies' },
  { name: 'HomeTeardowns', from: 774, to: 806, comment: 'GCC product teardowns' },
  { name: 'HomeShipAI', from: 809, to: 952, comment: 'How I ship AI' },
  { name: 'HomeCareer', from: 955, to: 1368, comment: 'Career arc' },
  { name: 'HomeRoadmap', from: 1373, to: 1545, comment: 'Delivery roadmap' },
  { name: 'HomeMethod', from: 1548, to: 1575, comment: 'Method' },
  { name: 'HomePhilosophy', from: 1578, to: 1584, comment: 'Philosophy' },
  { name: 'HomeAbout', from: 1587, to: 1603, comment: 'Who I am & what I do' },
  { name: 'HomeRoots', from: 1606, to: 1626, comment: 'Where I come from' },
  { name: 'HomeContact', from: 1629, to: 1645, comment: 'Contact' },
  { name: 'CatalogView', from: 1652, to: 1707, comment: 'Full filterable catalog' },
  { name: 'HoverPreview', from: 1775, to: 1787, comment: 'Card hover preview' },
  { name: 'SiteFooter', from: 1790, to: 1799, comment: 'Footer' },
  { name: 'AssistantChat', from: 1802, to: 1852, comment: 'Assistant chat dock' },
  { name: 'ProjectModal', from: 1855, to: 2389, comment: 'Project modal' },
  { name: 'AgentModal', from: 2392, to: 2703, comment: 'Agent deep-dive modal' },
  { name: 'CommandHint', from: 2720, to: 2734, comment: 'First-visit ⌘K hint' },
  { name: 'CommandTerminal', from: 2737, to: 2778, comment: 'Command terminal' },
  { name: 'PresentationBar', from: 2782, to: 2810, comment: 'Presentation mode bar' },
]

/* ── Parser ───────────────────────────────────────────────────────────── */

const VOID_TAGS = new Set(['img', 'br', 'input', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed'])

const TOKEN_RE =
  /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>`]+))?)*)\s*(\/?)>/g

const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g

function parseAttrs(text) {
  const attrs = []
  if (!text) return attrs
  let m
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(text))) {
    const value = m[2] ?? m[3] ?? m[4] ?? null
    attrs.push({ name: m[1], value })
  }
  return attrs
}

/** Parse an HTML fragment into a lightweight element / text tree. */
function parse(html) {
  const root = { type: 'root', children: [] }
  const stack = [root]
  let cursor = 0
  let m
  TOKEN_RE.lastIndex = 0

  const pushText = (text) => {
    if (text) stack[stack.length - 1].children.push({ type: 'text', value: text })
  }

  while ((m = TOKEN_RE.exec(html))) {
    pushText(html.slice(cursor, m.index))
    cursor = TOKEN_RE.lastIndex

    if (m[0].startsWith('<!--')) continue

    if (m[1]) {
      // Closing tag — unwind to the matching open element.
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].name === m[1]) {
          stack.length = i
          break
        }
      }
      continue
    }

    const node = {
      type: 'element',
      name: m[2],
      attrs: parseAttrs(m[3]),
      children: [],
    }
    stack[stack.length - 1].children.push(node)
    if (!m[4] && !VOID_TAGS.has(node.name)) stack.push(node)
  }

  pushText(html.slice(cursor))
  return root
}

/* ── Expression translation ───────────────────────────────────────────── */

const LITERAL_RE = /^(true|false|null|-?\d+(\.\d+)?|'[^']*'|"[^"]*")$/

/**
 * Rewrite a prototype binding into a JS expression.
 * Bare loop variables stay bare; everything else resolves off the view-model.
 */
function expr(source, scope) {
  const text = source.trim()
  if (LITERAL_RE.test(text)) return text
  if (text === '$index') return scope.length ? `${scope[scope.length - 1]}Index` : '0'
  const root = text.split('.')[0]
  if (scope.includes(root)) return text
  return `v.${text}`
}

const BINDING_RE = /\{\{([^}]*)\}\}/g

/** True when the value is a single binding and nothing else. */
function isPureBinding(value) {
  const m = value.match(/^\s*\{\{([^}]*)\}\}\s*$/)
  return m ? m[1].trim() : null
}

/** Turn a string containing bindings into a JS template literal. */
function interpolate(value, scope) {
  const body = value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$(?!\{)/g, '\\$')
    .replace(BINDING_RE, (_, e) => `\${${expr(e, scope)}}`)
  return '`' + body + '`'
}

/* ── Style handling ───────────────────────────────────────────────────── */

function camel(prop) {
  if (prop.startsWith('--')) return prop
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function splitDeclarations(css) {
  return css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
}

/** Compile a static CSS string into a JSX style-object literal. */
function styleObject(css) {
  const entries = []
  for (const decl of splitDeclarations(css)) {
    const idx = decl.indexOf(':')
    if (idx < 0) continue
    const prop = decl.slice(0, idx).trim()
    const value = decl.slice(idx + 1).trim()
    if (!prop) continue
    const key = camel(prop)
    const quoted = JSON.stringify(value)
    entries.push(`${/^[a-zA-Z][\w]*$/.test(key) ? key : JSON.stringify(key)}: ${quoted}`)
  }
  return `{ ${entries.join(', ')} }`
}

/* ── Hover rules ──────────────────────────────────────────────────────── */

const hoverRules = new Map() // css text -> class name

function hoverClass(css) {
  if (hoverRules.has(css)) return hoverRules.get(css)
  const name = `hv-${hoverRules.size + 1}`
  hoverRules.set(css, name)
  return name
}

function writeHoverCss() {
  const out = [
    '/* Generated by scripts/port-template.mjs — do not edit by hand. */',
    '/*',
    ' * The prototype expressed hover states as `style-hover` attributes applied',
    ' * over an inline style. Inline styles win the cascade, so each ported rule',
    ' * marks its declarations !important to reproduce that precedence.',
    ' */',
    '',
  ]
  for (const [css, name] of hoverRules) {
    const decls = splitDeclarations(css).map((d) => `  ${d} !important;`)
    out.push(`.${name}:hover {`, ...decls, '}', '')
  }
  writeFileSync(HOVER_CSS, out.join('\n'))
  console.log(`${HOVER_CSS} (${hoverRules.size} hover rules)`)
}

/* ── Attribute translation ────────────────────────────────────────────── */

const ATTR_RENAMES = {
  class: 'className',
  for: 'htmlFor',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'text-anchor': 'textAnchor',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'mask-image': 'maskImage',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  tabindex: 'tabIndex',
  maxlength: 'maxLength',
  autocomplete: 'autoComplete',
  readonly: 'readOnly',
}

/**
 * Extra attributes stamped onto a region's root element, so a stylesheet can
 * reach markup that otherwise carries only inline styles.
 */
const ROOT_ATTRS = {
  // The ⌘K hint and the assistant chat dock both anchor to the bottom-right
  // corner. See the [data-khint] rule in globals.css.
  CommandHint: { 'data-khint': '1' },
}

/**
 * Accessible names for icon-only controls in the design.
 *
 * The prototype's chat dock is a bare mascot glyph with no text, so screen
 * readers announce it as an unlabelled button. Keyed by handler so the label
 * survives regeneration.
 */
const ARIA_LABELS = {
  toggleChat: 'Open assistant chat',
}

/** Attributes that exist only for the prototype runtime. */
const DROPPED_ATTRS = new Set(['hint-placeholder-val', 'hint-placeholder-count', 'data-xray', 'data-xc'])

const EVENT_ATTRS = new Set(['onClick', 'onMouseEnter', 'onMouseLeave', 'onKeyDown', 'onInput', 'onChange', 'onSubmit'])

function renderAttrs(node, scope) {
  const parts = []
  let className = null
  let hover = null

  for (const attr of node.attrs) {
    const { name, value } = attr
    if (DROPPED_ATTRS.has(name)) continue

    if (name === 'style-hover') {
      hover = value
      continue
    }

    if (name === 'class') {
      className = value
      continue
    }

    if (name === 'style') {
      const pure = isPureBinding(value)
      if (pure !== null) {
        parts.push(`style={css(${expr(pure, scope)})}`)
      } else if (BINDING_RE.test(value)) {
        BINDING_RE.lastIndex = 0
        parts.push(`style={css(${interpolate(value, scope)})}`)
      } else {
        parts.push(`style={${styleObject(value)}}`)
      }
      continue
    }

    if (EVENT_ATTRS.has(name)) {
      const pure = isPureBinding(value ?? '')
      parts.push(`${name}={${pure !== null ? expr(pure, scope) : 'undefined'}}`)

      const label = pure !== null ? ARIA_LABELS[pure] : undefined
      if (label && !node.attrs.some((a) => a.name === 'aria-label')) {
        parts.push(`aria-label=${JSON.stringify(label)}`)
      }
      continue
    }

    const jsxName = ATTR_RENAMES[name] ?? name

    if (value === null) {
      parts.push(jsxName)
      continue
    }

    const pure = isPureBinding(value)
    if (pure !== null) {
      parts.push(`${jsxName}={${expr(pure, scope)}}`)
    } else if (BINDING_RE.test(value)) {
      BINDING_RE.lastIndex = 0
      parts.push(`${jsxName}={${interpolate(value, scope)}}`)
    } else {
      parts.push(`${jsxName}=${JSON.stringify(value)}`)
    }
  }

  if (hover !== null) {
    const cls = hoverClass(hover)
    className = className ? `${className} ${cls}` : cls
  }
  if (className !== null) {
    const pure = isPureBinding(className)
    if (pure !== null) parts.push(`className={${expr(pure, scope)}}`)
    else if (BINDING_RE.test(className)) {
      BINDING_RE.lastIndex = 0
      parts.push(`className={${interpolate(className, scope)}}`)
    } else parts.push(`className=${JSON.stringify(className)}`)
  }

  return parts.length ? ' ' + parts.join(' ') : ''
}

/* ── Emitter ──────────────────────────────────────────────────────────── */

const SELF_CLOSING = new Set([...VOID_TAGS, 'animate', 'stop', 'use'])

function attrValue(node, name) {
  const found = node.attrs.find((a) => a.name === name)
  return found ? found.value : null
}

function indent(depth) {
  return '  '.repeat(depth)
}

/** JSX text needs its braces escaped; HTML entities pass through untouched. */
function jsxText(text) {
  return text.replace(/[{}]/g, (c) => `{'${c}'}`)
}

function emitChildren(node, depth, scope) {
  return node.children.map((child) => emit(child, depth, scope)).filter(Boolean)
}

function emit(node, depth, scope) {
  if (node.type === 'text') {
    const value = node.value
    if (!value.trim()) return ''

    // Collapse the prototype's source whitespace but keep single spaces that
    // separate inline content from its neighbours.
    const lead = /^\s/.test(value) ? ' ' : ''
    const tail = /\s$/.test(value) ? ' ' : ''
    const body = value.trim().replace(/\s+/g, ' ')

    if (!BINDING_RE.test(body)) {
      BINDING_RE.lastIndex = 0
      // The design uses "// Section Name" as a literal mono eyebrow. Bare in
      // JSX that reads as a stray comment, so emit it as a string expression.
      if (/^\/[/*]/.test(body)) {
        return `${indent(depth)}{${JSON.stringify(lead + body + tail)}}`
      }
      return indent(depth) + jsxText(lead + body + tail)
    }
    BINDING_RE.lastIndex = 0

    const pure = isPureBinding(body)
    if (pure !== null) return `${indent(depth)}${lead ? "{' '}" : ''}{${expr(pure, scope)}}${tail ? "{' '}" : ''}`

    // Mixed text and bindings — split so the static parts stay literal JSX.
    let out = ''
    let last = 0
    let m
    let first = true
    BINDING_RE.lastIndex = 0
    while ((m = BINDING_RE.exec(body))) {
      const chunk = body.slice(last, m.index)
      // A leading "// " eyebrow reads as a stray comment to JSX tooling.
      out += first && /^\/[/*]/.test(chunk) ? `{${JSON.stringify(chunk)}}` : jsxText(chunk)
      out += `{${expr(m[1], scope)}}`
      last = BINDING_RE.lastIndex
      first = false
    }
    out += jsxText(body.slice(last))
    return indent(depth) + jsxText(lead) + out + jsxText(tail)
  }

  if (node.type !== 'element') return ''

  /* ── Control flow ── */
  if (node.name === 'sc-if') {
    const condSource = isPureBinding(attrValue(node, 'value') ?? '') ?? 'false'
    const cond = expr(condSource, scope)
    const kids = emitChildren(node, depth + 2, scope)
    return [
      `${indent(depth)}{${cond} ? (`,
      `${indent(depth + 1)}<>`,
      ...kids,
      `${indent(depth + 1)}</>`,
      `${indent(depth)}) : null}`,
    ].join('\n')
  }

  if (node.name === 'sc-for') {
    const listSource = isPureBinding(attrValue(node, 'list') ?? '') ?? '[]'
    const list = expr(listSource, scope)
    const item = attrValue(node, 'as') || 'item'
    const inner = [...scope, item]
    const kids = emitChildren(node, depth + 2, inner)
    return [
      `${indent(depth)}{arr(${list}).map((${item}: any, ${item}Index: number) => (`,
      `${indent(depth + 1)}<Fragment key={${item}Index}>`,
      ...kids,
      `${indent(depth + 1)}</Fragment>`,
      `${indent(depth)}))}`,
    ].join('\n')
  }

  /* ── Prototype-only placeholder component ── */
  if (node.name === 'image-slot') {
    const src = attrValue(node, 'src')
    const placeholder = attrValue(node, 'placeholder') ?? ''
    const render = (name, value) => {
      if (value === null) return ''
      const pure = isPureBinding(value)
      if (pure !== null) return ` ${name}={${expr(pure, scope)}}`
      if (BINDING_RE.test(value)) {
        BINDING_RE.lastIndex = 0
        return ` ${name}={${interpolate(value, scope)}}`
      }
      return ` ${name}=${JSON.stringify(value)}`
    }
    return `${indent(depth)}<ImageSlot${render('src', src)}${render('label', placeholder)} />`
  }

  /* ── Ordinary elements ── */
  const attrs = renderAttrs(node, scope)

  if (SELF_CLOSING.has(node.name) || node.children.length === 0) {
    return `${indent(depth)}<${node.name}${attrs} />`
  }

  const kids = emitChildren(node, depth + 1, scope)
  if (kids.length === 0) return `${indent(depth)}<${node.name}${attrs} />`

  return [`${indent(depth)}<${node.name}${attrs}>`, ...kids, `${indent(depth)}</${node.name}>`].join('\n')
}

/* ── Component generation ─────────────────────────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true })

const generated = []

for (const region of REGIONS) {
  const html = lines.slice(region.from - 1, region.to).join('\n')
  const tree = parse(html)
  const roots = tree.children.filter((c) => c.type === 'element' || (c.type === 'text' && c.value.trim()))

  const rootAttrs = ROOT_ATTRS[region.name]
  if (rootAttrs) {
    // Walk past control-flow wrappers to the first real element.
    let target = roots.find((n) => n.type === 'element')
    while (target && (target.name === 'sc-if' || target.name === 'sc-for')) {
      target = target.children.find((c) => c.type === 'element')
    }
    if (target) {
      for (const [name, value] of Object.entries(rootAttrs)) target.attrs.push({ name, value })
    }
  }

  const body = roots.map((n) => emit(n, 3, [])).filter(Boolean)
  const usesFragment = body.some((b) => b.includes('<Fragment'))
  const usesArr = body.some((b) => b.includes('arr('))
  const usesCss = body.some((b) => b.includes('css('))
  const usesImageSlot = body.some((b) => b.includes('<ImageSlot'))
  const usesViewModel = body.some((b) => /\bv\./.test(b))

  const reactImports = usesFragment ? "import { Fragment } from 'react'\n" : ''
  const helpers = [usesCss && 'css', usesArr && 'arr'].filter(Boolean)
  const helperImport = helpers.length ? `import { ${helpers.join(', ')} } from '@/lib/style'\n` : ''
  const slotImport = usesImageSlot ? "import { ImageSlot } from '@/components/ImageSlot'\n" : ''

  const file = [
    '// Generated by scripts/port-template.mjs from the design handoff package.',
    `// Region: ${region.comment} (prototype lines ${region.from}–${region.to}).`,
    '// Markup is a faithful port of the signed-off design; behaviour lives in',
    '// src/lib/useViewModel.ts. Regenerate rather than hand-editing structure.',
    "'use client'",
    '',
    reactImports + helperImport + slotImport +
      (usesViewModel ? "import type { ViewModel } from '@/lib/useViewModel'" : ''),
    '',
    `export function ${region.name}(${usesViewModel ? '{ v }: { v: ViewModel }' : ''}) {`,
    '  return (',
    '    <>',
    ...body,
    '    </>',
    '  )',
    '}',
    '',
  ].join('\n')

  writeFileSync(join(OUT_DIR, `${region.name}.tsx`), file)
  generated.push(region.name)
  console.log(`${region.name}.tsx  (lines ${region.from}-${region.to})`)
}

writeHoverCss()

// Barrel file so the shell can import every region from one place.
const barrel = [
  '// Generated by scripts/port-template.mjs — do not edit by hand.',
  ...generated.map((name) => `export { ${name} } from './${name}'`),
  '',
].join('\n')
writeFileSync(join(OUT_DIR, 'index.ts'), barrel)

console.log(`\n${generated.length} components generated into ${OUT_DIR}`)
