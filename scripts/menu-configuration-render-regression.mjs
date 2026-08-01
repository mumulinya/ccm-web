import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'menu-configuration-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const executablePath = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const routeAppApis = async page => {
  let workspaceRevision = 0
  let personalRevision = 0
  let workspaceConfiguration = null
  let personalOverrides = { groups: null, items: {}, customLinks: [] }
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => {
    const value = message.text()
    if (message.type() === 'error' && !/^Failed to load resource: net::ERR_(CONNECTION_CLOSED|TIMED_OUT)$/.test(value)) report.errors.push(`console: ${value}`)
  })
  // Keep the render fixture isolated from unrelated authenticated page boot APIs.
  // More specific routes registered below take precedence over this fallback.
  await page.route('**/api/**', route => {
    const acceptsEvents = String(route.request().headers().accept || '').includes('text/event-stream')
    return route.fulfill(acceptsEvents
      ? { status: 200, contentType: 'text/event-stream', body: 'event: ready\ndata: {"success":true}\n\n' }
      : { status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, authenticated: true, csrf: 'selftest-csrf', capabilities: ['task.execute', 'project.runtime', 'project.git'], user: { id: 'selftest', username: 'selftest', role: 'admin' } }) }))
  await page.route('**/api/navigation/default', async route => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON()
      if (Number(payload.expected_revision || 0) !== workspaceRevision) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, code: 'state_drift' }) })
      workspaceConfiguration = payload.configuration
      workspaceRevision++
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, workspace_default: workspaceConfiguration ? { revision: workspaceRevision, configuration: workspaceConfiguration } : null }) })
  })
  await page.route('**/api/navigation/config*', async route => {
    const request = route.request()
    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON()
      if (Number(payload.expected_revision || 0) !== personalRevision) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, code: 'state_drift' }) })
      personalOverrides = payload.overrides
      personalRevision++
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, personal: { revision: personalRevision, overrides: personalOverrides } }) })
    }
    if (request.method() === 'POST') {
      personalOverrides = { groups: null, items: {}, customLinks: [] }
      personalRevision++
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, personal: { revision: personalRevision, overrides: personalOverrides } }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      success: true,
      schema: 'ccm-navigation-config-response-v3',
      workspace_default: workspaceConfiguration ? { revision: workspaceRevision, configuration: workspaceConfiguration } : null,
      personal: personalRevision ? { revision: personalRevision, overrides: personalOverrides } : null,
      can_manage_workspace_default: true,
    }) })
  })
  await page.route('**/api/projects', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [] }) }))
  await page.route('**/api/pets/agents', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agents: [] }) }))
  await page.route('**/api/status/stream*', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"type":"ready"}\n\n' }))
  await page.route('**/api/usability/workbench/stream*', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.route('**/api/usability/workbench', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, snapshot: {} }) }))
  await page.route('**/api/music/remote-command*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, commands: [] }) }))
}
const prepare = async (page, config = null) => {
  await routeAppApis(page)
  await page.addInitScript(value => {
    if (window.top !== window) return
    if (sessionStorage.getItem('ccm-menu-regression-prepared') === 'true') return
    localStorage.clear()
    if (value) localStorage.setItem('ccm-navigation-config-v2', JSON.stringify(value))
    sessionStorage.setItem('ccm-menu-regression-prepared', 'true')
  }, config)
  await page.goto(`${baseUrl}/?tab=menumanager`, { waitUntil: 'commit', timeout: 30_000 })
  await page.locator('.navigation-center').waitFor({ timeout: 60_000 })
  await page.getByText('导航配置中心', { exact: true }).waitFor({ timeout: 60_000 })
}
const noOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, center: document.querySelector('.navigation-center')?.clientWidth || 0, centerScroll: document.querySelector('.navigation-center')?.scrollWidth || 0 }))
  assert.ok(metrics.scroll <= metrics.client + 1, `${label} document overflow`)
  assert.ok(metrics.centerScroll <= metrics.center + 1, `${label} center overflow`)
}
const capture = async (page, name) => { const file = path.join(outputDir, `${name}.png`); await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file) }

try {
  const desktop = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage()
  await prepare(desktop)
  await noOverflow(desktop, 'desktop')
  assert.equal(await desktop.locator('.menu-row').count(), 20)
  assert.equal(await desktop.locator('[data-menu-id="knowledge"] select').inputValue(), 'data')
  assert.equal(await desktop.locator('[data-menu-id="memory-center"] select').inputValue(), 'data')
  assert.equal(await desktop.locator('[data-menu-id="cleanup-center"] select').inputValue(), 'system')
  report.checks.push({ name: 'all current menus migrate into complete default groups in one configuration center', pass: true })
  await capture(desktop, 'desktop-navigation-center')

  const changesRow = desktop.locator('[data-menu-id="changes"]')
  await changesRow.getByTitle('固定到常用').click()
  await desktop.locator('.nav-sidebar').getByText('常用', { exact: true }).waitFor()
  assert.equal(await desktop.locator('.nav-sidebar .nav-group-items').filter({ hasText: '代码协作' }).count() > 0, true)
  const metricsRow = desktop.locator('[data-menu-id="metrics"]')
  await metricsRow.getByTitle('隐藏菜单').click()
  await desktop.locator('.nav-sidebar .nav-item').filter({ hasText: '性能监控' }).waitFor({ state: 'detached' })
  assert.equal(await desktop.locator('.nav-sidebar .nav-item').filter({ hasText: '性能监控' }).count(), 0)
  report.checks.push({ name: 'pin and hide actions update the real desktop navigation immediately', pass: true })

  await desktop.getByRole('button', { name: '新增外部链接' }).click()
  const linkDialog = desktop.locator('.config-dialog').filter({ hasText: '新增外部链接' })
  await linkDialog.locator('input').nth(0).fill('危险链接')
  await linkDialog.locator('input').nth(1).fill('javascript:alert(1)')
  await linkDialog.getByRole('button', { name: '保存' }).click()
  await desktop.getByText('外部链接只允许使用 HTTP 或 HTTPS', { exact: true }).waitFor()
  assert.equal(await linkDialog.isVisible(), true)
  await linkDialog.locator('input').nth(1).fill('https://example.com/docs')
  await linkDialog.getByRole('button', { name: '保存' }).click()
  await desktop.locator('.menu-row[data-menu-id^="l_"]').waitFor()
  await desktop.waitForFunction(() => !document.querySelector('#toast-container > div'), null, { timeout: 6_000 })
  report.checks.push({ name: 'unsafe external URL is rejected while validated HTTPS link is persisted', pass: true })
  await capture(desktop, 'desktop-pinned-hidden-and-link')

  await desktop.getByTitle('新建分组').click()
  const groupDialog = desktop.locator('.config-dialog').filter({ hasText: '新建分组' })
  await groupDialog.locator('input').fill('交付工具')
  await groupDialog.getByRole('button', { name: '保存' }).click()
  const createdGroup = desktop.locator('.group-list .group-row').filter({ hasText: '交付工具' })
  await createdGroup.waitFor({ state: 'attached' })
  await createdGroup.scrollIntoViewIfNeeded()
  assert.equal(await createdGroup.isVisible(), true)
  const persistedBeforeReload = await desktop.evaluate(() => JSON.parse(localStorage.getItem('ccm-navigation-config-v2')).groups.some(group => group.label === '交付工具'))
  assert.equal(persistedBeforeReload, true)
  await desktop.goto(`${baseUrl}/?tab=menumanager`, { waitUntil: 'commit', timeout: 30_000 })
  await desktop.locator('.navigation-center').waitFor({ timeout: 60_000 })
  const persistedAfterReload = await desktop.evaluate(() => JSON.parse(localStorage.getItem('ccm-navigation-config-v2')).groups.some(group => group.label === '交付工具'))
  assert.equal(persistedAfterReload, true)
  const persistedGroup = desktop.locator('.group-list .group-row').filter({ hasText: '交付工具' })
  await persistedGroup.waitFor({ state: 'attached' })
  await persistedGroup.scrollIntoViewIfNeeded()
  assert.equal(await persistedGroup.isVisible(), true)
  report.checks.push({ name: 'custom group and prior changes survive reload through versioned persistence', pass: true })
  await capture(desktop, 'desktop-persisted-configuration')

  const mobileConfig = await desktop.evaluate(() => {
    const config = JSON.parse(localStorage.getItem('ccm-navigation-config-v2'))
    Object.values(config.items).forEach(item => { item.mobilePrimary = false })
    for (const id of ['dashboard', 'global-agent', 'groups', 'changes']) config.items[id].mobilePrimary = true
    config.items.metrics.hidden = true
    return config
  })
  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await prepare(mobile, mobileConfig)
  await noOverflow(mobile, 'mobile')
  const bottomLabels = await mobile.locator('.bottom-bar .bottom-label').allTextContents()
  assert.equal(bottomLabels.includes('代码协作'), true)
  assert.equal(bottomLabels.includes('任务派发'), false)
  assert.equal(await mobile.locator('.menu-row').count() > 0, true)
  report.checks.push({ name: 'mobile bottom navigation uses configured four primary entries and center remains usable', pass: true })
  await capture(mobile, 'mobile-navigation-center')

  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
  if (appHost) await appHost.server.close()
}
