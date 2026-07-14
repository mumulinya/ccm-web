import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.resolve(root, 'scratch', 'global-ui-layout-regression')
assert.ok(outputDir.startsWith(`${root}${path.sep}`), 'screenshot directory must stay inside the workspace')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], screenshots: [], errors: [] }

const recordPageErrors = (page, label) => {
  page.on('pageerror', error => report.errors.push(`${label}: ${error.message}`))
}

const setTheme = async (context, theme) => {
  await context.addInitScript(selectedTheme => {
    localStorage.setItem('theme', selectedTheme)
    localStorage.setItem('theme-preset', 'default')
  }, theme)
}

const openApp = async page => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.app-container').waitFor({ state: 'visible' })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

const assertNoHorizontalOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }))
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label} document overflow`)
  assert.ok(metrics.bodyWidth <= metrics.clientWidth + 1, `${label} body overflow`)
  report.checks.push({ name: `${label} has no horizontal overflow`, pass: true, metrics })
}

const runDesktopLight = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  await setTheme(context, 'light')
  const page = await context.newPage()
  recordPageErrors(page, 'desktop light')
  await openApp(page)
  const shell = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    headerHeight: document.querySelector('.main-wrapper > .header')?.getBoundingClientRect().height || 0,
    navWidth: document.querySelector('.nav-sidebar')?.getBoundingClientRect().width || 0,
    tabInsideHeader: Boolean(document.querySelector('.main-wrapper > .header > .tab-bar')),
    pageTitleVisible: document.querySelector('.main-wrapper > .header > h2')?.getBoundingClientRect().width > 0,
    bottomItems: document.querySelectorAll('.bottom-item').length,
  }))
  assert.equal(shell.theme, 'light')
  assert.ok(shell.headerHeight <= 50, 'desktop header should be compact')
  assert.ok(shell.navWidth >= 220 && shell.navWidth <= 240, 'desktop navigation width should stay compact')
  assert.equal(shell.tabInsideHeader, true)
  assert.equal(shell.pageTitleVisible, false)
  assert.equal(shell.bottomItems, 0)
  report.checks.push({ name: 'desktop shell uses one compact top bar and compact navigation', pass: true, shell })
  await assertNoHorizontalOverflow(page, 'desktop light workbench')
  await capture(page, 'desktop-light-workbench')
  await context.close()
}

const runDesktopDark = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  await setTheme(context, 'dark')
  const page = await context.newPage()
  recordPageErrors(page, 'desktop dark')
  await openApp(page)
  await page.locator('.nav-item').filter({ hasText: '群聊协作' }).click()
  await page.locator('.group-chat').waitFor({ state: 'visible' })
  await page.locator('.group-chat .header-actions').waitFor({ state: 'visible', timeout: 15_000 })
  const groupHeader = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    visiblePrimaryActions: document.querySelectorAll('.group-chat .header-actions > .btn').length,
    openMenus: document.querySelectorAll('.group-chat details[open]').length,
    headerHeight: document.querySelector('.group-chat .content-header')?.getBoundingClientRect().height || 0,
    htmlOpacity: getComputedStyle(document.documentElement).opacity,
    htmlFilter: getComputedStyle(document.documentElement).filter,
  }))
  assert.equal(groupHeader.theme, 'dark')
  assert.equal(groupHeader.visiblePrimaryActions, 4)
  assert.equal(groupHeader.openMenus, 0)
  assert.ok(groupHeader.headerHeight <= 56, 'group header should remain compact')
  assert.equal(groupHeader.htmlOpacity, '1')
  assert.equal(groupHeader.htmlFilter, 'none')
  report.checks.push({ name: 'dark group chat keeps technical and destructive actions folded', pass: true, groupHeader })
  await assertNoHorizontalOverflow(page, 'desktop dark group chat')
  await capture(page, 'desktop-dark-group-chat')
  await context.close()
}

const runMobileLight = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await setTheme(context, 'light')
  const page = await context.newPage()
  recordPageErrors(page, 'mobile light')
  await openApp(page)
  const mobileNav = await page.evaluate(() => ({
    navHidden: getComputedStyle(document.querySelector('.nav-sidebar')).display === 'none',
    bottomCount: document.querySelectorAll('.bottom-item').length,
    bottomWidth: document.querySelector('.bottom-bar')?.scrollWidth || 0,
    viewportWidth: document.documentElement.clientWidth,
    moreOpen: Boolean(document.querySelector('.mobile-more-menu')),
  }))
  assert.equal(mobileNav.navHidden, true)
  assert.equal(mobileNav.bottomCount, 5)
  assert.ok(mobileNav.bottomWidth <= mobileNav.viewportWidth + 1)
  assert.equal(mobileNav.moreOpen, false)
  await page.getByRole('button', { name: '更多', exact: true }).click()
  await page.locator('.mobile-more-menu').waitFor({ state: 'visible' })
  const menuMetrics = await page.evaluate(() => ({
    columns: getComputedStyle(document.querySelector('.mobile-more-grid')).gridTemplateColumns.split(' ').length,
    itemCount: document.querySelectorAll('.mobile-more-grid button').length,
  }))
  assert.equal(menuMetrics.columns, 2)
  assert.ok(menuMetrics.itemCount >= 10)
  report.checks.push({ name: 'mobile navigation exposes four core entries and a two-column more menu', pass: true, mobileNav, menuMetrics })
  await assertNoHorizontalOverflow(page, 'mobile light more menu')
  await capture(page, 'mobile-light-more-menu')
  await context.close()
}

const runMobileDark = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await setTheme(context, 'dark')
  const page = await context.newPage()
  recordPageErrors(page, 'mobile dark')
  await openApp(page)
  await page.getByRole('button', { name: '全局助手', exact: true }).click()
  await page.locator('.global-assistant-panel').waitFor({ state: 'visible' })
  const assistant = await page.evaluate(() => {
    const bubble = document.querySelector('.global-assistant-panel .chat-bubble-wrapper.assistant .chat-bubble')
    const bubbleStyle = bubble ? getComputedStyle(bubble) : null
    const parseRgb = value => (value?.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    const luminance = value => {
      const channels = parseRgb(value).map(channel => {
        const normalized = channel / 255
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }
    const foreground = luminance(bubbleStyle?.color)
    const background = luminance(bubbleStyle?.backgroundColor)
    return {
      theme: document.documentElement.dataset.theme,
      glowCount: document.querySelectorAll('.global-assistant-panel .glow-bg').length,
      backgroundImage: getComputedStyle(document.querySelector('.global-assistant-panel')).backgroundImage,
      sidebarCollapsed: document.querySelector('.assistant-sidebar')?.classList.contains('collapsed') || false,
      sidebarWidth: document.querySelector('.assistant-sidebar')?.getBoundingClientRect().width || 0,
      headerHeight: document.querySelector('.global-assistant-panel .chat-header')?.getBoundingClientRect().height || 0,
      bubbleBackground: bubbleStyle?.backgroundColor || '',
      bubbleColor: bubbleStyle?.color || '',
      bubbleContrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
    }
  })
  assert.equal(assistant.theme, 'dark')
  assert.equal(assistant.glowCount, 0)
  assert.equal(assistant.backgroundImage, 'none')
  assert.equal(assistant.sidebarCollapsed, true)
  assert.ok(assistant.sidebarWidth <= 1)
  assert.ok(assistant.headerHeight <= 56)
  assert.ok(assistant.bubbleContrast >= 4.5, `assistant bubble contrast is ${assistant.bubbleContrast}`)
  report.checks.push({ name: 'mobile dark global assistant is neutral and starts with its session drawer closed', pass: true, assistant })
  await assertNoHorizontalOverflow(page, 'mobile dark global assistant')
  await capture(page, 'mobile-dark-global-agent')
  await context.close()
}

try {
  await runDesktopLight()
  await runDesktopDark()
  await runMobileLight()
  await runMobileDark()
  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
