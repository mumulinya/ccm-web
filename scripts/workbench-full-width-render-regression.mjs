import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'workbench-full-width-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const executablePath = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean).find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const snapshot = {
  success: true,
  generated_at: new Date().toISOString(),
  counts: { queued: 1 },
  attention_counts: { confirmation: 0, failed: 0, supplement: 0 },
  attention: [],
  active: [{ id: 'task-1', title: '完善工作台宽屏布局', status: 'running', project: 'ccm', progress: { percent: 42, phase: '实现中', started_at: new Date(Date.now() - 180_000).toISOString() } }],
  completed: [{ id: 'task-2', title: '完成主题一致性检查', status: 'done', updated_at: new Date().toISOString(), delivery: { files_changed: 8, verification_count: 4 } }],
  resources: {
    projects: Array.from({ length: 7 }, (_, index) => ({ name: `workspace-${index + 1}`, agent: index % 2 ? 'codex' : 'claudecode', running: index < 3 })),
    groups: [{ id: 'group-1', name: '产品研发协作群', members: 4 }],
    cron: [{ id: 'cron-1', name: '夜间回归', enabled: true, next_run: new Date(Date.now() + 3_600_000).toISOString() }],
  },
  archive: { retention_days: 30 },
}

const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname
    const acceptsEvents = String(route.request().headers().accept || '').includes('text/event-stream')
    if (acceptsEvents) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: ready\ndata: {"type":"ready"}\n\n' })
    if (pathname === '/api/auth/session') return route.fulfill(json({ success: true, authenticated: true, user: { username: 'workbench-selftest' } }))
    if (pathname === '/api/usability/workbench') return route.fulfill(json(snapshot))
    if (pathname === '/api/projects') return route.fulfill(json({ success: true, projects: snapshot.resources.projects }))
    if (pathname === '/api/pets/agents') return route.fulfill(json({ success: true, agents: [] }))
    if (['/api/runtime/events', '/api/status/stream', '/api/usability/workbench/stream'].includes(pathname)) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    if (pathname === '/api/music/remote-command') return route.fulfill(json({ success: true, commands: [] }))
    if (pathname === '/api/conversation-turns') return route.fulfill(json({ success: true, turns: [] }))
    if (pathname === '/api/tasks/permission-requests') return route.fulfill(json({ success: true, requests: [] }))
    return route.fulfill(json({ success: true, items: [], data: [] }))
  })
  await page.goto(`${baseUrl}/?tab=dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.workbench').waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: /^workspace-5/ }).waitFor({ state: 'attached', timeout: 10_000 })
  await page.locator('[data-page-loading="dashboard"]').waitFor({ state: 'detached', timeout: 10_000 })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1680, height: 960 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop)
  const desktopMetrics = await desktop.evaluate(() => {
    const pane = document.querySelector('.tab-pane.scrollable-pane')
    const workbench = document.querySelector('.workbench')
    const pulse = document.querySelector('.pulse-strip')
    const grid = document.querySelector('.workspace-grid')
    const rail = document.querySelector('.workspace-rail')
    return {
      viewport: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      paneWidth: pane?.clientWidth || 0,
      workbenchWidth: workbench?.getBoundingClientRect().width || 0,
      pulseWidth: pulse?.getBoundingClientRect().width || 0,
      gridWidth: grid?.getBoundingClientRect().width || 0,
      railWidth: rail?.getBoundingClientRect().width || 0,
      workbenchPadding: getComputedStyle(workbench).paddingInline,
    }
  })
  assert.ok(Math.abs(desktopMetrics.workbenchWidth - desktopMetrics.paneWidth) <= 1, JSON.stringify(desktopMetrics))
  assert.ok(desktopMetrics.pulseWidth >= desktopMetrics.workbenchWidth - 82, JSON.stringify(desktopMetrics))
  assert.ok(Math.abs(desktopMetrics.gridWidth - desktopMetrics.pulseWidth) <= 1, JSON.stringify(desktopMetrics))
  assert.ok(desktopMetrics.railWidth >= 320, JSON.stringify(desktopMetrics))
  assert.ok(desktopMetrics.documentScrollWidth <= desktopMetrics.viewport + 1, JSON.stringify(desktopMetrics))
  report.checks.push({ name: 'desktop workbench fills the entire tab content width', pass: true, details: desktopMetrics })
  await capture(desktop, 'desktop-full-width-workbench')
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  const mobileMetrics = await mobile.evaluate(() => {
    const pane = document.querySelector('.tab-pane.scrollable-pane')
    const workbench = document.querySelector('.workbench')
    return {
      viewport: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      paneWidth: pane?.clientWidth || 0,
      workbenchWidth: workbench?.getBoundingClientRect().width || 0,
      workbenchScrollWidth: workbench?.scrollWidth || 0,
    }
  })
  assert.ok(Math.abs(mobileMetrics.workbenchWidth - mobileMetrics.paneWidth) <= 1, JSON.stringify(mobileMetrics))
  assert.ok(mobileMetrics.documentScrollWidth <= mobileMetrics.viewport + 1, JSON.stringify(mobileMetrics))
  assert.ok(mobileMetrics.workbenchScrollWidth <= mobileMetrics.workbenchWidth + 1, JSON.stringify(mobileMetrics))
  report.checks.push({ name: 'mobile workbench remains full-width without horizontal overflow', pass: true, details: mobileMetrics })
  await capture(mobile, 'mobile-full-width-workbench')
  await mobileContext.close()

  assert.deepEqual(report.errors, [])
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
  console.log(`Workbench full-width render regression passed: ${report.checks.length} checks`)
  report.checks.forEach((check, index) => console.log(`${index + 1}. ${check.name}`))
  report.screenshots.forEach(file => console.log(`screenshot: ${file}`))
}
