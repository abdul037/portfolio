/**
 * Responsive and reduced-motion checks.
 *
 * Asserts two things the design can silently regress on:
 *   1. nothing pushes the page wider than the viewport at phone or tablet width
 *   2. with `prefers-reduced-motion`, no revealed content is left invisible
 *
 * Run against a built app:
 *   npm run build && npm start &
 *   npm run check:responsive
 *
 * Env: CHECK_BASE (default http://localhost:3000), CHECK_SHOTS (screenshot dir),
 *      PLAYWRIGHT_CHROMIUM (explicit browser binary).
 */
import { chromium } from 'playwright'

const BASE = process.env.CHECK_BASE || 'http://localhost:3000'
const SHOTS = process.env.CHECK_SHOTS || null
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM || undefined

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1440, height: 900 },
]

const failures = []
const note = (message) => console.log('  ' + message)

const browser = await chromium.launch({ executablePath: EXECUTABLE })

/** Scroll the whole page so lazily-revealed sections lay themselves out. */
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 800) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(70)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
}

console.log('Horizontal overflow')
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)

  // Enter dismisses the boot overlay at any size.
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  await scrollThrough(page)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )

  if (overflow > 1) {
    failures.push(`${viewport.name} (${viewport.width}px): ${overflow}px of horizontal overflow`)
    note(`FAIL ${viewport.name.padEnd(16)} ${overflow}px overflow`)
  } else {
    note(`ok   ${viewport.name.padEnd(16)} no overflow`)
  }

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/responsive-${viewport.name}.png` })
  await context.close()
}

console.log('\nMobile navigation')
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.waitForTimeout(400)
  const opened = await page.getByRole('button', { name: 'Experience' }).first().isVisible()
  opened ? note('ok   drawer opens') : failures.push('mobile nav drawer did not open')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const closed = !(await page.getByRole('button', { name: 'Experience' }).first().isVisible().catch(() => false))
  closed ? note('ok   Escape closes drawer') : failures.push('Escape did not close the mobile nav drawer')

  await context.close()
}

console.log('\nReduced motion')
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const introShown = (await page.locator('[data-hero-overlay]').count()) > 0
  introShown ? failures.push('boot intro played with reduced motion') : note('ok   boot intro skipped')

  await scrollThrough(page)
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('[data-reveal]')].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) < 0.9,
    ).length,
  )
  hidden
    ? failures.push(`${hidden} revealed elements stayed invisible under reduced motion`)
    : note('ok   all reveals resolved to visible')

  if (SHOTS) await page.screenshot({ path: `${SHOTS}/reduced-motion.png` })
  await context.close()
}

await browser.close()

if (failures.length) {
  console.log('\nFailures:')
  for (const failure of failures) console.log('  - ' + failure)
  process.exit(1)
}

console.log('\nAll responsive and reduced-motion checks passed.')
