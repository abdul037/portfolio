/**
 * Smoke test: drives the real app in Chromium and asserts each interactive
 * surface actually works. Run against `next start` on :3000.
 *
 *   npm run build && npm start &
 *   npm run smoke
 *
 * Env: SMOKE_BASE (default http://localhost:3000), SMOKE_SHOTS (screenshot dir),
 *      PLAYWRIGHT_CHROMIUM (explicit browser binary).
 */
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000'
const SHOTS = process.env.SMOKE_SHOTS || null
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM || undefined

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push('CONSOLE: ' + m.text())
})
page.on('pageerror', (e) => problems.push('PAGEERROR: ' + e.message))
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`)
})

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push(['PASS', name])
  } catch (error) {
    results.push(['FAIL', name, error.message])
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

await page.goto(BASE, { waitUntil: 'networkidle' })

await check('boot sequence appears and is skippable', async () => {
  const skip = page.getByRole('button', { name: /SKIP/ })
  assert(await skip.count(), 'no SKIP button on first visit')
  await skip.click()
  await page.waitForTimeout(400)
  assert(!(await page.locator('[data-hero-overlay]').count()), 'overlay did not clear after skip')
})

await check('hero renders headline and stats', async () => {
  const text = await page.locator('#hero').innerText()
  assert(/BUILDING THE/i.test(text), 'hero headline missing')
  assert(/PRODUCTS/i.test(text) && /COUNTRIES/i.test(text), 'hero stat strip missing')
})

await check('all home sections present', async () => {
  const ids = ['hero', 'featured', 'impact', 'healthagents', 'shipai', 'career', 'roadmap', 'method', 'about', 'roots', 'contact']
  for (const id of ids) {
    assert(await page.locator(`#${id}`).count(), `missing section #${id}`)
  }
})

await check('scroll-spy highlights the active nav item', async () => {
  await page.locator('#career').scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const active = await page.evaluate(() =>
    [...document.querySelectorAll('.main-nav button')]
      .filter((b) => b.style.color === 'rgb(240, 240, 244)')
      .map((b) => b.textContent.trim()),
  )
  assert(active.length === 1, `expected exactly one active nav item, got ${JSON.stringify(active)}`)
})

await check('career accordion expands', async () => {
  await page.locator('#career').scrollIntoViewIfNeeded()
  const row = page.locator('#career').getByText('What was your role on these projects?').first()
  await row.click()
  await page.waitForTimeout(400)
  const text = await page.locator('#career').innerText()
  assert(/Product Lead & Builder/.test(text), 'accordion body did not expand')
  await shot('career-expanded')
})

await check('project modal opens from a work card and closes on Escape', async () => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('.pf-hero').first().click()
  await page.waitForTimeout(700)
  const text = await page.locator('body').innerText()
  assert(/THE PROBLEM IT SOLVES/i.test(text), 'project modal content missing')
  await shot('project-modal')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert(!/THE PROBLEM IT SOLVES/i.test(await page.locator('body').innerText()), 'modal did not close')
})

await check('agent deep-dive opens with swimlane and evals', async () => {
  await page.locator('#healthagents').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.locator('#healthagents').getByText('View case study →').first().click()
  await page.waitForTimeout(700)
  const text = await page.locator('body').innerText()
  assert(/AI Agent/i.test(text), 'agent swimlane lane label missing')
  assert(/Systems & Data/i.test(text), 'systems lane missing')
  assert(/Clinician \/ User/i.test(text), 'clinician lane missing')
  await shot('agent-modal')
})

await check('agent modal has a Deep Dive tab that switches content', async () => {
  const tab = page.getByText('Deep Dive — how it runs').first()
  assert(await tab.count(), 'deep dive tab missing')
  await tab.click()
  await page.waitForTimeout(500)
  const text = await page.locator('body').innerText()
  assert(/AUTONOMOUS|ASKS HUMAN|HARD STOP/.test(text), 'autonomy table missing on deep dive tab')
  await shot('agent-deepdive')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
})

await check('agent industry filter narrows the grid', async () => {
  await page.locator('#healthagents').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const countAll = await page.locator('#healthagents').getByText('View case study →').count()
  await page.locator('#healthagents').getByRole('button', { name: 'Fintech', exact: true }).click()
  await page.waitForTimeout(500)
  const countFintech = await page.locator('#healthagents').getByText('View case study →').count()
  assert(countFintech > 0, 'fintech filter returned nothing')
  assert(countFintech < countAll, `filter did not narrow (${countAll} -> ${countFintech})`)
  await page.locator('#healthagents').getByRole('button', { name: 'All', exact: true }).click()
  await page.waitForTimeout(300)
})

await check('catalog view opens with filters and cards', async () => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'View Portfolio' }).click()
  await page.waitForTimeout(700)
  const cards = await page.locator('article').count()
  assert(cards > 20, `expected a full catalog, got ${cards} cards`)
  await shot('catalog')
})

await check('catalog domain filter narrows results', async () => {
  const before = await page.locator('article').count()
  await page.locator('main').getByRole('button', { name: 'Agents', exact: true }).click()
  await page.waitForTimeout(500)
  const after = await page.locator('article').count()
  assert(after > 0 && after < before, `domain filter did not narrow (${before} -> ${after})`)
  await page.locator('main').getByRole('button', { name: 'All', exact: true }).first().click()
  await page.waitForTimeout(300)
})

await check('logo returns to home', async () => {
  await page.getByRole('button', { name: /Abdul Muwahib/ }).first().click()
  await page.waitForTimeout(600)
  assert(await page.locator('#hero').count(), 'did not return to home view')
})

await check('⌘K terminal opens and resolves a command', async () => {
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(500)
  const input = page.locator('#term-input')
  assert(await input.count(), 'terminal did not open')
  await input.fill('shifa')
  await input.press('Enter')
  await page.waitForTimeout(700)
  const text = await page.locator('body').innerText()
  assert(/ShifaAI/i.test(text), 'terminal command did not open the ShifaAI case study')
  await shot('terminal')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

await check('terminal reports unknown commands instead of navigating', async () => {
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(400)
  const input = page.locator('#term-input')
  await input.fill('zzzzqqqq')
  await input.press('Enter')
  await page.waitForTimeout(400)
  assert(/Not found/.test(await page.locator('body').innerText()), 'no not-found response')
  await input.fill('close')
  await input.press('Enter')
  await page.waitForTimeout(400)
})

await check('presentation mode starts on "p" and steps forward', async () => {
  await page.locator('body').click({ position: { x: 5, y: 400 } })
  await page.keyboard.press('p')
  await page.waitForTimeout(900)
  const first = await page.locator('body').innerText()
  assert(/Who I Am/i.test(first), 'presenter bar did not show the first step')
  await shot('presentation')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(900)
  assert(/Where I Come From/i.test(await page.locator('body').innerText()), 'ArrowRight did not advance')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
})

await check('assistant chat opens and branches', async () => {
  await page.getByRole('button', { name: 'Open assistant chat' }).click()
  await page.waitForTimeout(600)
  assert(/brings you to this portfolio/i.test(await page.locator('body').innerText()), 'chat did not open')
  await page.getByText("I'm a Recruiter").first().click()
  await page.waitForTimeout(500)
  assert(/Senior PM with 6 years/i.test(await page.locator('body').innerText()), 'chat branch did not advance')
  await shot('chat')
})

await check('resume viewer opens with an embedded PDF', async () => {
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /View Resume/ }).click()
  await page.waitForTimeout(700)
  const embed = await page.locator('object[type="application/pdf"]').count()
  assert(embed === 1, 'resume embed missing')
  await shot('resume')
})

await browser.close()

const failed = results.filter((r) => r[0] === 'FAIL')
for (const [status, name, message] of results) {
  console.log(`${status}  ${name}${message ? '\n        ' + message : ''}`)
}

const noise = [...new Set(problems)]
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (noise.length) {
  console.log('\nConsole / network problems:')
  for (const line of noise.slice(0, 20)) console.log('  ' + line)
}

process.exit(failed.length || noise.length ? 1 : 0)
