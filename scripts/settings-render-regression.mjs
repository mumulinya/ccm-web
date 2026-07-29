import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'settings-render-regression')
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], errors: [], screenshots: [] }

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const mockBaseApi = async page => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname === '/api/auth/session') return route.fulfill(json({ success: true, authenticated: true, user: { username: 'settings-selftest' } }))
    if (pathname === '/api/projects') return route.fulfill(json({ success: true, projects: [] }))
    if (pathname === '/api/pets/agents') return route.fulfill(json({ success: true, agents: [] }))
    if (pathname === '/api/system/settings-status') return route.fulfill(json({ success: true, version: '1.0.24', service: { status: 'online', pid: 1234, uptimeSeconds: 7200, startedAt: '2026-07-23T06:00:00.000Z' }, credentials: { protected: true, backend: 'AES-256-GCM', entries: 2 } }))
    if (pathname === '/api/feishu/config') return route.fulfill(json({ success: true, enabled: false, control_bot_enabled: false }))
    if (pathname === '/api/feishu/control-bot/status') return route.fulfill(json({ success: true, running: false, pid: null }))
    if (pathname === '/api/feishu/health' || pathname === '/api/feishu/health/probe') return route.fulfill(json({ success: true, healthy: false, socket_connected: false }))
    if (pathname === '/api/orchestrator/credential/reveal') return route.fulfill(json({ success: true, apiKey: 'sk-settings-render-secret' }))
    if (pathname === '/api/orchestrator/config') return route.fulfill(json({ success: true, config: { enabled: true, apiUrl: 'https://api.example.test/v1', model: 'test-model', hasKey: true } }))
    if (pathname === '/api/rag/embedding-config') return route.fulfill(json({ success: true, config: { enabled: false, provider: 'local', model: 'local' }, chunksCount: 0 }))
    if (pathname === '/api/runtime/events' || pathname === '/api/status/stream' || pathname === '/api/usability/workbench/stream') return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    return route.fulfill(json({ success: true, config: {}, items: [], data: [] }))
  })
}

const openSettings = async page => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('body').waitFor()
  const visible = page.getByText('系统设置', { exact: true }).first()
  if (await visible.isVisible()) await visible.click()
  else {
    await page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('*')).find(element => element.textContent?.trim() === '系统设置')
      target?.click()
    })
  }
  await page.locator('[data-settings-panel="channels"]').waitFor()
  await page.locator('[data-page-loading="settings"]').waitFor({ state: 'detached', timeout: 10_000 })
}

const assertLayout = async (page, name) => {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    openDetails: Array.from(document.querySelectorAll('.settings-details')).filter(item => item.open).length
  }))
  assert.equal(layout.scrollWidth, layout.clientWidth, `${name} has horizontal overflow`)
  assert.equal(layout.openDetails, 0, `${name} technical/help details should default closed`)
  report.checks.push({ name: `${name} has no overflow and details default closed`, pass: true })
}

const assertFullWidthSettings = async page => {
  const metrics = await page.evaluate(() => {
    const pageElement = document.querySelector('.settings-page')
    const header = document.querySelector('.settings-page-header')
    const layout = document.querySelector('.settings-layout')
    const content = document.querySelector('.settings-content')
    const pageStyle = getComputedStyle(pageElement)
    const expectedContentWidth = pageElement.clientWidth - Number.parseFloat(pageStyle.paddingLeft) - Number.parseFloat(pageStyle.paddingRight)
    const headerRect = header.getBoundingClientRect()
    const layoutRect = layout.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    return {
      expectedContentWidth,
      headerWidth: headerRect.width,
      layoutWidth: layoutRect.width,
      headerRight: headerRect.right,
      layoutRight: layoutRect.right,
      contentRight: contentRect.right,
      pageRight: pageElement.getBoundingClientRect().right,
      paddingRight: Number.parseFloat(pageStyle.paddingRight),
    }
  })
  assert.ok(Math.abs(metrics.headerWidth - metrics.expectedContentWidth) <= 1, JSON.stringify(metrics))
  assert.ok(Math.abs(metrics.layoutWidth - metrics.expectedContentWidth) <= 1, JSON.stringify(metrics))
  assert.ok(Math.abs(metrics.headerRight - metrics.layoutRight) <= 1, JSON.stringify(metrics))
  assert.ok(Math.abs(metrics.contentRight - (metrics.pageRight - metrics.paddingRight)) <= 1, JSON.stringify(metrics))
  report.checks.push({ name: 'desktop settings header and content fill the available page width', pass: true, details: metrics })
}

const screenshot = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

const runDesktop = async () => {
  const context = await browser.newContext({ viewport: { width: 1536, height: 830 } })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(`desktop page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`desktop console: ${message.text()}`) })
  await mockBaseApi(page)
  await page.route('**/api/orchestrator/cache-capability/probe', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, connection: { success: true, providerCallCount: 2 }, receipt: { status: 'confirmed', cacheReadInputTokens: 2048 }, capability: { status: 'confirmed', evidence: { status: 'confirmed', cacheReadInputTokens: 2048 } } })
  }))
  await openSettings(page)
  await assertLayout(page, 'desktop channels')
  await assertFullWidthSettings(page)
  await screenshot(page, 'desktop-channels')

  await page.getByRole('button', { name: /统一大模型/ }).click()
  await page.locator('[data-settings-panel="models"]').waitFor()
  await page.getByRole('button', { name: /保存并测试连接/ }).click()
  await page.getByText('统一大模型连接正常', { exact: true }).waitFor()
  assert.equal(await page.getByText('本次连接测试通过', { exact: true }).count(), 4)
  assert.equal(await page.getByText('v1.0.8', { exact: true }).count(), 0)
  report.checks.push({ name: 'model connection result maps to global, group, project and music agents', pass: true })
  const apiKeyInput = page.locator('#model-key')
  const revealButton = page.getByRole('button', { name: '显示 API Key' })
  assert.equal(await revealButton.count(), 1)
  await revealButton.click()
  assert.equal(await apiKeyInput.getAttribute('type'), 'text')
  assert.equal(await apiKeyInput.inputValue(), 'sk-settings-render-secret')
  await page.getByRole('button', { name: '隐藏 API Key' }).click()
  assert.equal(await apiKeyInput.getAttribute('type'), 'password')
  assert.equal(await apiKeyInput.inputValue(), '')
  report.checks.push({ name: 'saved API key reveals on demand and clears from the form when hidden', pass: true })
  const advancedSummary = page.locator('.settings-details summary')
  assert.equal(await advancedSummary.count(), 1)
  await advancedSummary.click()
  const nativeCacheToggle = page.getByText('强制向当前自定义接口发送所选原生缓存字段', { exact: true })
  assert.equal(await nativeCacheToggle.count(), 1)
  await nativeCacheToggle.click()
  await page.locator('#model-native-cache-family').waitFor()
  const interfaceProtocol = page.locator('#model-format')
  const cacheProtocol = page.locator('#model-native-cache-family')
  assert.equal(await cacheProtocol.inputValue(), 'openai')
  await interfaceProtocol.selectOption('anthropic-compatible')
  assert.equal(await cacheProtocol.inputValue(), 'anthropic')
  await cacheProtocol.selectOption('openai')
  await interfaceProtocol.selectOption('gemini-compatible')
  assert.equal(await cacheProtocol.inputValue(), 'openai')
  await cacheProtocol.selectOption('auto')
  assert.equal(await cacheProtocol.inputValue(), 'gemini')
  report.checks.push({ name: 'cache protocol follows interface protocol until the user overrides it', pass: true })
  const nativeCacheLayout = await page.evaluate(() => {
    const pageElement = document.querySelector('.settings-page')
    const details = document.querySelector('.settings-details-content')
    const switches = Array.from(document.querySelectorAll('.settings-switch-stack .settings-switch'))
      .map(item => item.getBoundingClientRect())
    const detailsRect = details.getBoundingClientRect()
    return {
      pageClientWidth: pageElement.clientWidth,
      pageScrollWidth: pageElement.scrollWidth,
      detailsLeft: detailsRect.left,
      detailsRight: detailsRect.right,
      switches: switches.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
    }
  })
  assert.equal(nativeCacheLayout.pageScrollWidth, nativeCacheLayout.pageClientWidth, JSON.stringify(nativeCacheLayout))
  assert.equal(nativeCacheLayout.switches.every(item => item.left >= nativeCacheLayout.detailsLeft && item.right <= nativeCacheLayout.detailsRight + 1), true)
  assert.equal(nativeCacheLayout.switches.every((item, index, rows) => index === 0 || item.top >= rows[index - 1].bottom), true)
  report.checks.push({ name: 'native cache controls stay in separate rows without horizontal overflow', pass: true, details: nativeCacheLayout })
  await screenshot(page, 'desktop-models-native-cache')
  await page.evaluate(() => {
    const scrollers = [document.querySelector('.settings-page'), document.querySelector('.tab-pane.scrollable-pane')].filter(Boolean)
    for (const scroller of scrollers) scroller.scrollTop = scroller.scrollHeight
  })
  await advancedSummary.click()
  await page.waitForTimeout(60)
  const collapsedLayout = await page.evaluate(() => {
    const summary = document.querySelector('.settings-details summary').getBoundingClientRect()
    const settingsPage = document.querySelector('.settings-page').getBoundingClientRect()
    const scrollers = [document.querySelector('.settings-page'), document.querySelector('.tab-pane.scrollable-pane')]
      .filter(Boolean)
      .map(item => ({ scrollTop: item.scrollTop, maxScrollTop: Math.max(0, item.scrollHeight - item.clientHeight) }))
    return {
      summaryTop: summary.top,
      summaryBottom: summary.bottom,
      viewportTop: settingsPage.top,
      viewportBottom: settingsPage.bottom,
      scrollers,
    }
  })
  assert.equal(collapsedLayout.summaryBottom >= collapsedLayout.viewportTop && collapsedLayout.summaryTop <= collapsedLayout.viewportBottom, true, JSON.stringify(collapsedLayout))
  assert.equal(collapsedLayout.scrollers.every(item => item.scrollTop <= item.maxScrollTop + 1), true, JSON.stringify(collapsedLayout))
  report.checks.push({ name: 'collapsing advanced settings restores a visible valid scroll position', pass: true, details: collapsedLayout })
  await assertLayout(page, 'desktop models')
  await screenshot(page, 'desktop-models')

  await page.getByRole('button', { name: /系统与重置/ }).click()
  await page.locator('[data-settings-panel="system"]').waitFor()
  await page.getByText('CCM 服务运行正常', { exact: true }).waitFor()
  assert.equal(await page.getByText('恢复界面默认设置', { exact: true }).count(), 1)
  await assertLayout(page, 'desktop system')
  await screenshot(page, 'desktop-system')
  await context.close()
}

const runMobile = async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(`mobile page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`mobile console: ${message.text()}`) })
  await mockBaseApi(page)
  await openSettings(page)
  await page.getByRole('button', { name: /统一大模型/ }).click()
  await page.locator('[data-settings-panel="models"]').waitFor()
  await assertLayout(page, 'mobile models')
  const navBox = await page.locator('.settings-sidebar').boundingBox()
  assert.ok(navBox && navBox.x >= -1 && navBox.x + navBox.width <= 391, 'mobile settings navigation is outside viewport')
  report.checks.push({ name: 'mobile settings navigation stays within viewport', pass: true })
  await screenshot(page, 'mobile-models')
  await context.close()
}

try {
  await runDesktop()
  await runMobile()
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
