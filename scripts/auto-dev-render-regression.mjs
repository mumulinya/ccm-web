import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const baseUrl = process.env.CCM_AUTO_DEV_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(
  root,
  'docs',
  'main-agent-workchain',
  'shared-workchain',
  'architecture-and-validation',
  'evidence',
  'auto-dev-v2',
)

async function launchBrowser() {
  try {
    return await chromium.launch()
  } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try {
        return await chromium.launch({ channel })
      } catch {}
    }
    throw firstError
  }
}

async function openAutoDev(page, mobile = false) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const navigation = mobile
    ? page.locator('.bottom-item').filter({ hasText: '🧭自动' })
    : page.locator('.nav-item').filter({ hasText: '自动开发' })
  if (await navigation.count() !== 1) throw new Error(`${mobile ? 'mobile' : 'desktop'} auto-dev navigation should be unique`)
  await navigation.click()
  await page.locator('.auto-dev-page').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('.view-tabs button').filter({ hasText: '运行概览' }).waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForFunction(() => !document.querySelector('.readiness-badge')?.textContent?.includes('检查中'), null, { timeout: 45_000 })
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('.auto-dev-page')
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      pageClientWidth: root?.clientWidth || 0,
      pageScrollWidth: root?.scrollWidth || 0,
    }
  })
  if (metrics.documentScrollWidth > metrics.documentClientWidth + 1) {
    throw new Error(`${label} document has horizontal overflow: ${JSON.stringify(metrics)}`)
  }
  if (metrics.pageScrollWidth > metrics.pageClientWidth + 1) {
    throw new Error(`${label} page has horizontal overflow: ${JSON.stringify(metrics)}`)
  }
}

async function assertNoPanelOverlap(page, label) {
  const overlaps = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('.auto-dev-page .section-block')].filter(item => item.offsetParent !== null)
    const result = []
    for (let leftIndex = 0; leftIndex < panels.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < panels.length; rightIndex += 1) {
        const left = panels[leftIndex].getBoundingClientRect()
        const right = panels[rightIndex].getBoundingClientRect()
        const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
        const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top))
        if (width * height > 1) result.push({ leftIndex, rightIndex, width, height })
      }
    }
    return result
  })
  if (overlaps.length) throw new Error(`${label} panels overlap: ${JSON.stringify(overlaps)}`)
}

async function openView(page, label, selector) {
  await page.locator('.view-tabs button').filter({ hasText: label }).click()
  await page.locator(selector).waitFor({ state: 'visible' })
  await page.waitForTimeout(250)
  const scrollTop = await page.locator('.auto-dev-page').evaluate(element => element.scrollTop)
  if (scrollTop > 1) throw new Error(`${label} view should open at the top, got scrollTop ${scrollTop}`)
}

let browser
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await openAutoDev(desktop)
  await assertNoHorizontalOverflow(desktop, 'desktop overview')
  await assertNoPanelOverlap(desktop, 'desktop overview')
  if (await desktop.locator('.job-card').count()) throw new Error('cron job cards must not be rendered on auto-dev page')
  if (await desktop.getByText('创建每日接活', { exact: true }).count()) throw new Error('cron create action must not be rendered on auto-dev page')
  await desktop.screenshot({ path: path.join(outputDir, '01-overview-desktop.png'), fullPage: false })

  await openView(desktop, '工作复盘', '.reports-view')
  if (await desktop.locator('.report-document').count() !== 1) throw new Error('friendly report document should render')
  if (await desktop.locator('.evidence-strip').count() !== 1) throw new Error('evidence summary should render once')
  if (await desktop.locator('.evidence-strip').getByText('工作归属', { exact: true }).count() !== 1) throw new Error('work ownership summary should be visible')
  if (await desktop.locator('.technical-details[open]').count()) throw new Error('technical report details must be collapsed by default')
  if (await desktop.locator('.reports-view > pre, .report-surface > pre').count()) throw new Error('raw report must not be the default report surface')
  await assertNoHorizontalOverflow(desktop, 'desktop reports')
  await desktop.screenshot({ path: path.join(outputDir, '02-daily-report-desktop.png'), fullPage: false })

  await desktop.locator('.segmented-control button').filter({ hasText: '周报' }).click()
  await desktop.locator('.report-document h2').filter({ hasText: '工作周报' }).waitFor({ state: 'visible' })
  if (await desktop.locator('.technical-details[open]').count()) throw new Error('weekly technical report details must be collapsed by default')
  await assertNoHorizontalOverflow(desktop, 'desktop weekly report')
  await desktop.screenshot({ path: path.join(outputDir, '03-weekly-report-desktop.png'), fullPage: false })

  await openView(desktop, '通知设置', '.notifications-view')
  if (await desktop.locator('.notifications-view input[type="checkbox"]').count() !== 2) throw new Error('notification toggles are incomplete')
  await assertNoHorizontalOverflow(desktop, 'desktop notifications')
  await desktop.screenshot({ path: path.join(outputDir, '04-notifications-desktop.png'), fullPage: false })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await openAutoDev(mobile, true)
  await assertNoHorizontalOverflow(mobile, 'mobile overview')
  await assertNoPanelOverlap(mobile, 'mobile overview')
  await mobile.screenshot({ path: path.join(outputDir, '05-overview-mobile.png'), fullPage: false })

  await openView(mobile, '工作复盘', '.reports-view')
  if (await mobile.locator('.evidence-strip').count() !== 1) throw new Error('mobile evidence summary should render once')
  if (await mobile.locator('.technical-details[open]').count()) throw new Error('mobile technical report details must be collapsed by default')
  await assertNoHorizontalOverflow(mobile, 'mobile reports')
  await mobile.screenshot({ path: path.join(outputDir, '06-daily-report-mobile.png'), fullPage: false })

  await mobile.locator('.segmented-control button').filter({ hasText: '周报' }).click()
  await mobile.locator('.report-document h2').filter({ hasText: '工作周报' }).waitFor({ state: 'visible' })
  if (await mobile.locator('.technical-details[open]').count()) throw new Error('mobile weekly technical report details must be collapsed by default')
  await assertNoHorizontalOverflow(mobile, 'mobile weekly report')
  await mobile.screenshot({ path: path.join(outputDir, '07-weekly-report-mobile.png'), fullPage: false })

  await openView(mobile, '通知设置', '.notifications-view')
  await assertNoHorizontalOverflow(mobile, 'mobile notifications')
  const mobileToggleWidths = await mobile.locator('.toggle-field input[type="checkbox"]').evaluateAll(items => items.map(item => item.getBoundingClientRect().width))
  if (mobileToggleWidths.some(width => width > 24)) throw new Error(`mobile notification checkbox width is unstable: ${JSON.stringify(mobileToggleWidths)}`)
  await mobile.screenshot({ path: path.join(outputDir, '08-notifications-mobile.png'), fullPage: false })

  const errors = [...desktopErrors, ...mobileErrors]
  if (errors.length) throw new Error(`browser page errors:\n${errors.join('\n')}`)
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
  if (screenshots.length !== 8) throw new Error(`expected 8 screenshots, got ${screenshots.length}`)
  console.log(JSON.stringify({ pass: true, baseUrl, screenshots: screenshots.map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
