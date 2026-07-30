import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'global-page-loading-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const prepare = async (page, { authDelay = 0, projectDelay = 0, groupDelay = 0 } = {}) => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(`console: ${message.text()}`)
  })
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('theme-preset', 'deep-ocean')
    localStorage.setItem('app-low-perf', 'true')
  })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const acceptsEvents = String(route.request().headers().accept || '').includes('text/event-stream')
    if (acceptsEvents) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: ready\ndata: {"type":"ready"}\n\n' })
    if (url.pathname === '/api/auth/session') {
      if (authDelay) await delay(authDelay)
      return route.fulfill(json({ success: true, authenticated: true, user: { username: 'loading-selftest' } }))
    }
    if (url.pathname === '/api/projects') {
      if (projectDelay) await delay(projectDelay)
      return route.fulfill(json({ success: true, projects: [] }))
    }
    if (url.pathname === '/api/groups') {
      if (groupDelay) await delay(groupDelay)
      return route.fulfill(json({ success: true, groups: [] }))
    }
    if (['/api/runtime/events', '/api/status/stream', '/api/usability/workbench/stream'].includes(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    }
    if (url.pathname === '/api/pets/agents') return route.fulfill(json({ success: true, agents: [] }))
    if (url.pathname === '/api/usability/workbench') return route.fulfill(json({ success: true, snapshot: {} }))
    if (url.pathname === '/api/conversation-turns') return route.fulfill(json({ success: true, turns: [] }))
    if (url.pathname === '/api/tasks/permission-requests') return route.fulfill(json({ success: true, requests: [] }))
    if (url.pathname === '/api/music/remote-command') return route.fulfill(json({ success: true, commands: [] }))
    return route.fulfill(json({ success: true, items: [], data: [], sessions: [], settings: {}, config: {} }))
  })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop, { authDelay: 650, projectDelay: 900, groupDelay: 850 })
  const navigation = desktop.goto(`${baseUrl}/?tab=projects`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const authOverlay = desktop.locator('[data-page-loading="authentication"]')
  await authOverlay.waitFor({ state: 'visible', timeout: 5_000 })
  assert.match(await authOverlay.innerText(), /正在验证登录状态/)
  assert.equal(await authOverlay.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(5, 12, 30)')
  report.checks.push({ name: 'authentication reuses the global viewport overlay', pass: true })
  await capture(desktop, 'desktop-auth-loading')
  await navigation

  const projectOverlay = desktop.locator('[data-page-loading="projects"]')
  await projectOverlay.waitFor({ state: 'visible', timeout: 8_000 })
  assert.match(await projectOverlay.innerText(), /正在加载项目管理/)
  assert.equal(await desktop.locator('[data-page-loading]').count(), 1)
  report.checks.push({ name: 'project page stays covered until its initial APIs settle', pass: true })
  await capture(desktop, 'desktop-project-loading')
  await projectOverlay.waitFor({ state: 'detached', timeout: 10_000 })
  await desktop.locator('.project-manager').waitFor({ state: 'visible', timeout: 10_000 })

  await desktop.locator('.nav-item').filter({ hasText: '群聊协作' }).first().click()
  const groupOverlay = desktop.locator('[data-page-loading="groups"]')
  await groupOverlay.waitFor({ state: 'visible', timeout: 5_000 })
  assert.match(await groupOverlay.innerText(), /正在加载群聊协作/)
  await capture(desktop, 'desktop-group-loading')
  await groupOverlay.waitFor({ state: 'detached', timeout: 10_000 })
  await desktop.locator('.group-chat').waitFor({ state: 'visible', timeout: 10_000 })

  await desktop.locator('.nav-item').filter({ hasText: '项目管理' }).first().click()
  await desktop.waitForTimeout(300)
  assert.equal(await desktop.locator('[data-page-loading="projects"]').count(), 0)
  report.checks.push({ name: 'returning to a loaded tab does not flash the overlay again', pass: true })
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile, { authDelay: 500, projectDelay: 800 })
  const mobileNavigation = mobile.goto(`${baseUrl}/?tab=projects`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await mobile.locator('[data-page-loading="authentication"]').waitFor({ state: 'visible', timeout: 5_000 })
  await mobileNavigation
  const mobileProjectOverlay = mobile.locator('[data-page-loading="projects"]')
  await mobileProjectOverlay.waitFor({ state: 'visible', timeout: 8_000 })
  const mobileMetrics = await mobileProjectOverlay.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { left: rect.left, right: rect.right, width: rect.width, viewport: document.documentElement.clientWidth }
  })
  assert.ok(mobileMetrics.left >= 0 && mobileMetrics.right <= mobileMetrics.viewport + 1, JSON.stringify(mobileMetrics))
  await capture(mobile, 'mobile-project-loading')
  await mobileProjectOverlay.waitFor({ state: 'detached', timeout: 10_000 })
  report.checks.push({ name: 'mobile overlay fits the content viewport and clears after loading', pass: true })
  await mobileContext.close()

  assert.equal(report.errors.length, 0, report.errors.join('\n'))
  report.pass = true
} catch (error) {
  report.errors.push(error?.stack || String(error))
} finally {
  await browser.close()
  if (appHost) await appHost.server.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
}

if (!report.pass) {
  console.error(report.errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Global page loading render regression passed: ${report.checks.length} checks`)
  report.checks.forEach((check, index) => console.log(`${index + 1}. ${check.name}`))
  report.screenshots.forEach(file => console.log(`screenshot: ${file}`))
}
