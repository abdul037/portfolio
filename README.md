# Abdul Muwahib — AI Product Manager

A single-page, dark-themed portfolio built from the `design_handoff_portfolio_site`
package. It presents enterprise AI products, autonomous agent case studies,
healthcare product case studies, GCC industry teardowns, career history and
working method — framed as an "ops console": a keyboard-driven command
terminal, a guided presentation mode, and screenshot-driven deep-dive modals.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · self-hosted Google
Fonts via `next/font`. No CSS framework and no runtime dependencies beyond
React — see [Why no Tailwind](#why-no-tailwind).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

Other scripts:

```bash
npm run typecheck          # tsc --noEmit
npm run lint
npm run smoke              # 17 interaction checks
npm run audit              # every modal, every agent study, every asset
npm run check:responsive   # overflow + reduced-motion
```

The three browser checks need the app running (`npm run build && npm start`)
and Playwright's Chromium (`npx playwright install chromium`).

## How the design was ported

The handoff ships its markup in a design-prototyping dialect: `{{ expr }}`
bindings, `<sc-if>` / `<sc-for>` control flow, `style-hover` attributes, and
inline styles on every one of ~2,700 lines. Hand-transcribing that would have
drifted from the design that was signed off, so the markup and content are
**translated mechanically** and the behaviour is written by hand.

Three one-shot scripts do the translation. They take the handoff's `design/`
directory as their argument:

| Script | Produces |
| --- | --- |
| `scripts/port-template.mjs` | `src/components/design/*.tsx` — one component per region of the prototype, plus `src/app/hover.css` |
| `scripts/port-data.mjs` | `src/data/{projects,deepdive,pm,enhancements,agentStudies}.ts` |
| `scripts/port-site-data.mjs` | `src/data/site.ts` — catalog, career Q&A, presentation steps, terminal aliases |

```bash
node scripts/port-template.mjs  ../design_handoff_portfolio_site/design
node scripts/port-data.mjs      ../design_handoff_portfolio_site/design
node scripts/port-site-data.mjs ../design_handoff_portfolio_site/design
```

When a new handoff export lands, drop it in, re-run the three scripts, and read
the handoff's `CHANGELOG.md` for anything that needs a matching change in the
hand-written layer. **Don't hand-edit anything under `src/components/design/`
or the generated files in `src/data/` — those changes are lost on regeneration.**

### Layout

```
src/
  app/
    layout.tsx        fonts, metadata, viewport
    page.tsx
    globals.css       design tokens, keyframes, responsive rules
    hover.css         generated :hover rules (from style-hover)
    icon.svg
  components/
    Portfolio.tsx     the shell — composition and stacking order
    BootIntro.tsx     first-visit boot sequence (hand-written)
    ResumeModal.tsx   resume viewer (hand-written)
    ImageSlot.tsx     placeholder for screenshots not yet supplied
    design/           GENERATED markup, one component per region
  data/
    index.ts          composes the content modules into one project record
    types.ts          hand-written shapes for the ported content
    site.ts           GENERATED catalog / career / presentation steps
    *.ts              GENERATED content modules
  lib/
    useViewModel.ts   all state + every derived render value
    useMotionFx.ts    reveals, counters, gauges, parallax, cursor glow, canvases
    terminal.ts       ⌘K command resolution
    chat.ts           assistant chat decision tree
    introStore.ts     whether this page load plays the boot intro
    style.ts          CSS-string → React style object helpers
public/assets/        screenshots + resume PDF
```

### The view model

The prototype kept all state in one component and computed every render value
in a `renderVals()` method. That shape is preserved in `src/lib/useViewModel.ts`
rather than split across components, because the design's styling is
data-driven — an agent study's colour, a status tint and an effort badge are
each computed per item, and scattering that would scatter the palette. The
generated markup binds to the returned object by property path.

## Interactions

| Interaction | Notes |
| --- | --- |
| **Scroll-spy nav** | Active section underlined in the accent colour |
| **⌘K / Ctrl-K terminal** | Exact then fuzzy matching across sections, projects, agents and industries; `help`, `plan`, `next`/`prev`, `home`, `catalog`, `clear`, `close` |
| **Presentation mode** (`p`) | 8-step guided walkthrough with speaker notes; `→`/`Space`, `←`, `Esc` |
| **Project modal** | Overview · Deep Dive (example run, architecture, tool contracts, autonomy table) · Roadmap & PM |
| **Agent deep-dive** | 3-lane swimlane, integration stack, offline eval gates and online signals, rollout, failure modes |
| **Catalog** | 62 items, filterable by domain and industry |
| **Assistant chat** | Scripted decision tree — see [Open items](#open-items) |
| **Escape** | Unwinds one layer at a time: presentation → mobile nav → agent → project → terminal |

## Accessibility and motion

Every decorative animation is behind `prefers-reduced-motion`. When motion is
reduced the boot intro does not play, the particle canvases and cursor glow
never start, and reveals, counters, bars and gauges resolve straight to their
finished state — nothing is left invisible or blank.

## Why no Tailwind

The handoff recommends Tailwind, and for a from-scratch build it would be the
right call. Here the design already existed as ~2,700 lines of exact inline
styles, and the markup is generated from it rather than retyped. Re-expressing
those styles as utility classes would mean hand-rewriting every line — the one
step most likely to introduce visual drift — for no gain, since the generated
components are not edited by hand anyway. Tokens, keyframes and responsive
rules live in `globals.css`; per-element styling stays inline, exactly as the
design specifies. If the design is ever taken over by hand, that is the moment
to introduce a utility layer.

## Deliberate departures from the prototype

These are the only places the implementation differs from the handoff, and why:

- **Resume viewer** — the prototype lazy-loaded pdf.js from a CDN and painted
  each page to a canvas. Production uses the browser's own PDF viewer: no
  third-party script, text stays selectable, and there is an open/download
  fallback for browsers with no inline viewer. This is what the handoff's
  README asks for in production.
- **Fonts** — self-hosted through `next/font` instead of a render-blocking
  Google Fonts stylesheet. The design's literal font families are mapped to
  `var(--font-space-grotesk)` / `var(--font-ibm-plex-mono)`.
- **Responsive grid rules** — the prototype's mobile rules matched inline
  styles by substring *with a space* after the colon
  (`[style*="grid-template-columns: 1fr 1fr"]`). React serialises inline styles
  without that space, so those selectors matched nothing and several sections
  overflowed on phones. The selectors were corrected and extended to cover
  every multi-column template the design actually uses.
- **⌘K hint placement** — the hint and the assistant chat dock both anchor to
  the bottom-right corner, and the hint sat on top, making the chat button
  unclickable the whole time the hint was showing. The hint is now lifted clear
  of the dock and hides entirely while the chat is open.
- **Boot intro** — clipped and type-scaled so its box-drawing frames cannot
  widen the page on a phone; SKIP is always reachable, and Enter/Escape dismiss
  it. It plays once per session, so the reloads that happen during a live
  walkthrough go straight to the hero.
- **Chat toggle** — given an accessible name; it was an unlabelled icon button.
- **Escape** — also closes the mobile nav drawer, which previously had no
  keyboard dismissal.
- **Not ported** — `support.js` and `image-slot.js` are prototype-only, as the
  handoff instructs. The prototype's unreachable "detail page" view (its
  `isDetail` flag is hard-coded `false`) was dropped as dead code.

## Open items

Carried over from the handoff — these need Abdul's decision, not a code change:

- **Assistant chat is a scripted decision tree.** The intended production
  version answers questions in first person about the work, grounded in the
  project and agent content, via an LLM. That needs a server-side API key and a
  confirmed scope, so the scripted tree ships as specified. Swapping it in
  means replacing `chatMessages` / `chatReplies` in the view model with a
  transcript fed by a route handler — the dock UI does not change. **Never ship
  an API key client-side.**
- **Screenshots pending.** Catalog entries and category tiles without a
  screenshot render a labelled placeholder. The handoff's changelog lists these
  as known and accepted for the current export.
- **Confidentiality review pending.** The handoff flags that Last Mile Platform
  screenshots, Gulf Cryo names and real operational numbers may need redaction
  before a public deploy. Nothing has been redacted here.

## Verification

Three browser suites, each failing on any console error or non-2xx response.
Start the built app first (`npm run build && npm start`).

| Command | What it covers |
| --- | --- |
| `npm run smoke` | One check per interactive surface: boot sequence, every home section, scroll-spy, career accordion, both modal types and their tabs, both filter sets, the catalog, the terminal (including its not-found path), presentation mode, the chat branch, the resume viewer |
| `npm run audit` | The whole catalog rather than a sample: opens all 62 project modals and all 15 agent studies on both tabs, asserts each renders real content with no broken image, resolves every asset path the content references, and checks a spread of terminal aliases |
| `npm run check:responsive` | Zero horizontal overflow at four viewports, mobile drawer opens and closes on Escape, and reduced-motion leaves no revealed content invisible |

Last full run: 17/17 smoke, 62/62 modals, 15/15 agent studies, 86/86 assets
resolving, no hydration or console errors, no overflow at any viewport.
