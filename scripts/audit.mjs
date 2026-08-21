/**
 * Exhaustive content audit.
 *
 * The smoke test proves each *kind* of surface works. This walks the whole
 * catalog instead: it opens every project modal and every agent study (both
 * tabs), and checks that each one renders real content, loads every image it
 * references, and raises no console error. It also verifies every asset path
 * the content data points at actually resolves.
 *
 * Run against a built app:
 *   npm run build && npm start &
 *   node scripts/audit.mjs
 *
 * Env: CHECK_BASE (default http://localhost:3000), PLAYWRIGHT_CHROMIUM.
 */
import { chromium } from 'playwright'

const BASE = process.env.CHECK_BASE || 'http://localhost:3000'
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM || undefined

const failures = []
const fail = (message) => {
  failures.push(message)
  console.log('  FAIL ' + message)
}

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const consoleErrors = []
const badResponses = new Set()
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400) badResponses.add(`${r.status()} ${r.url()}`)
})

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.keyboard.press('Enter') // dismiss the boot overlay
await page.waitForTimeout(600)

/* ── 1. Every asset path referenced by the content data resolves ───────── */

console.log('Assets referenced by content data')
{
  const paths = await page.evaluate(async () => {
    // Pull every /assets/... string out of the shipped JS chunks.
    const found = new Set()
    for (const script of document.querySelectorAll('script[src]')) {
      const body = await fetch(script.src).then((r) => r.text())
      for (const match of body.matchAll(/["'](\/assets\/[^"']+)["']/g)) found.add(match[1])
    }
    return [...found]
  })

  let missing = 0
  for (const path of paths) {
    const response = await page.request.head(BASE + encodeURI(path))
    if (!response.ok()) {
      fail(`asset 404: ${path}`)
      missing++
    }
  }
  console.log(`  ok   ${paths.length} asset paths referenced, ${paths.length - missing} resolve`)
}

/* ── 2. Every project modal opens with real content ────────────────────── */

console.log('\nProject modals')
{
  // The catalog view is the master index — walk every card in it.
  await page.getByRole('button', { name: 'View Portfolio' }).click()
  await page.waitForTimeout(700)

  const total = await page.locator('article').count()
  console.log(`  ${total} catalog cards`)

  let empty = 0
  let brokenImages = 0

  for (let i = 0; i < total; i++) {
    const name = (await page.locator('article').nth(i).locator('h3').innerText()).trim()

    await page.locator('article').nth(i).click()
    await page.waitForTimeout(320)

    const state = await page.evaluate(() => {
      // The modal is the fixed, high-z overlay holding a .modal-card.
      const card = document.querySelector('.modal-card')
      if (!card) return null
      const images = [...card.querySelectorAll('img')]
      return {
        chars: card.innerText.trim().length,
        heading: (card.querySelector('h1, h2')?.innerText || '').trim(),
        broken: images.filter((img) => img.complete && img.naturalWidth === 0).length,
        images: images.length,
      }
    })

    if (!state) {
      fail(`${name}: modal did not open`)
    } else {
      // A modal with almost no text means the project key resolved to nothing.
      if (state.chars < 120) {
        fail(`${name}: modal opened but rendered only ${state.chars} chars`)
        empty++
      }
      if (state.broken) {
        fail(`${name}: ${state.broken}/${state.images} images failed to load`)
        brokenImages += state.broken
      }
    }

    await page.keyboard.press('Escape')
    await page.waitForTimeout(160)
  }

  console.log(`  ok   ${total - empty}/${total} modals rendered content, ${brokenImages} broken images`)
}

/* ── 3. Every agent study opens, on both tabs ──────────────────────────── */

console.log('\nAgent studies')
{
  await page.getByRole('button', { name: /Abdul Muwahib/ }).first().click()
  await page.waitForTimeout(600)
  await page.locator('#healthagents').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  const links = page.locator('#healthagents').getByText('View case study →')
  const total = await links.count()
  console.log(`  ${total} agent cards`)

  let missingDeepDive = 0
  let thin = 0

  for (let i = 0; i < total; i++) {
    await links.nth(i).click()
    await page.waitForTimeout(380)

    const overview = await page.evaluate(() => {
      const card = document.querySelector('.ha-card')
      if (!card) return null
      const text = card.innerText
      return {
        chars: text.trim().length,
        agent: (card.querySelector('h1, h2')?.innerText || '').trim(),
        hasSwimlane: /AI AGENT/i.test(text) && /SYSTEMS & DATA/i.test(text),
        hasEvals: /EVAL|GATE|SIGNAL/i.test(text),
        hasDeepDiveTab: [...card.querySelectorAll('button')].some((b) => /Deep Dive/i.test(b.textContent)),
      }
    })

    if (!overview) {
      fail(`agent #${i}: modal did not open`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(160)
      continue
    }

    const label = overview.agent || `agent #${i}`
    if (overview.chars < 400) {
      fail(`${label}: overview rendered only ${overview.chars} chars`)
      thin++
    }
    if (!overview.hasSwimlane) fail(`${label}: swimlane lanes missing`)
    if (!overview.hasEvals) fail(`${label}: eval gates / signals missing`)

    if (overview.hasDeepDiveTab) {
      await page.locator('.ha-card').getByText(/Deep Dive/).first().click()
      await page.waitForTimeout(320)
      const deep = await page.evaluate(() => {
        const text = document.querySelector('.ha-card')?.innerText || ''
        return {
          chars: text.trim().length,
          hasAutonomy: /AUTONOMOUS|ASKS HUMAN|HARD STOP/.test(text),
        }
      })
      if (!deep.hasAutonomy) fail(`${label}: deep-dive tab has no autonomy table`)
      if (deep.chars < 400) fail(`${label}: deep-dive rendered only ${deep.chars} chars`)
    } else {
      missingDeepDive++
    }

    await page.keyboard.press('Escape')
    await page.waitForTimeout(160)
  }

  console.log(
    `  ok   ${total - thin}/${total} studies rendered, ${total - missingDeepDive} carry a deep dive`,
  )
}

/* ── 4. Terminal aliases resolve ───────────────────────────────────────── */

console.log('\nTerminal aliases')
{
  const commands = [
    ['fero', /Last Mile Platform/i],
    ['pop health', /Population Health/i],
    ['newborn', /Newborn/i],
    ['pgx', /PGx|Pharmacogenom/i],
    ['care gap', /Care-Gap|Care Gap/i],
    ['supply chain', /Supply Chain/i],
    ['career', /Gulf Cryo|Rivigo|Amazon/i],
    ['plan', /Who I Am/i],
  ]

  for (const [command, expected] of commands) {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(320)
    const input = page.locator('#term-input')
    if (!(await input.count())) {
      fail(`terminal did not open for "${command}"`)
      continue
    }
    await input.fill(command)
    await input.press('Enter')
    await page.waitForTimeout(520)

    const text = await page.locator('body').innerText()
    if (!expected.test(text)) fail(`terminal "${command}" did not resolve as expected`)
    else console.log(`  ok   ${command}`)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(160)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(160)
  }
}

await browser.close()

/* ── Report ───────────────────────────────────────────────────────────── */

console.log('\n' + '─'.repeat(60))

const hydration = consoleErrors.filter((e) => /hydrat|did not match|Minified React error/i.test(e))
if (hydration.length) {
  console.log(`Hydration / React errors: ${hydration.length}`)
  for (const error of [...new Set(hydration)].slice(0, 5)) console.log('  ' + error.slice(0, 200))
} else {
  console.log('Hydration / React errors: none')
}

const otherErrors = [...new Set(consoleErrors)].filter((e) => !hydration.includes(e))
console.log(`Other console errors: ${otherErrors.length}`)
for (const error of otherErrors.slice(0, 8)) console.log('  ' + error.slice(0, 200))

console.log(`Non-2xx responses: ${badResponses.size}`)
for (const response of [...badResponses].slice(0, 8)) console.log('  ' + response)

const total = failures.length + hydration.length + otherErrors.length + badResponses.size
console.log(total ? `\n${total} problems found.` : '\nNo problems found.')
process.exit(total ? 1 : 0)
