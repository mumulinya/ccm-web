import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'settings-render-regression')
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], errors: [], screenshots: [] }

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const adminSession = {
  success: true,
  authenticated: true,
  user: { username: 'settings-selftest', role: 'admin' },
  csrf: 'settings-render-csrf',
  capabilities: ['read', 'chat.read_only', 'task.execute', 'project.runtime', 'project.git', 'attachment.manage', 'project.define', 'terminal.manage', 'agent.credentials', 'tools.manage', 'cleanup.permanent', 'permission.high_risk', 'security.manage'],
}
const accessUsers = [
  { id: 'admin-1', username: 'settings-selftest', role: 'admin', disabled_at: null },
  { id: 'user-1', username: 'design-reviewer', role: 'user', disabled_at: null },
  { id: 'user-2', username: 'release-operator', role: 'user', disabled_at: '2026-07-20T08:00:00.000Z' },
]
const accessModules = [
  { id: 'workbench', label: '工作协作', description: '工作台、全局助手、任务派发与任务回放' },
  { id: 'resource_workspace', label: '项目与群聊', description: '项目管理和群聊协作' },
  { id: 'developer_tools', label: '开发工具', description: '代码协作、代码智能和自动开发运营' },
  { id: 'knowledge', label: '知识库', description: '知识库与文档' },
  { id: 'memory', label: '记忆中心', description: '记忆控制中心' },
  { id: 'terminal_ops', label: '终端与日志', description: '终端工作台和项目日志' },
  { id: 'tool_ops', label: '工具与 MCP', description: '工具配置、MCP、技能和市场' },
  { id: 'platform_settings', label: '平台设置', description: '渠道、模型、开发 Agent 和 TestAgent 设置' },
]
const mockBaseApi = async page => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/*', route => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.startsWith('/api/')) return route.continue()
    const acceptsEvents = String(route.request().headers().accept || '').includes('text/event-stream')
    if (acceptsEvents) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: ready\ndata: {"type":"ready"}\n\n' })
    if (pathname === '/api/auth/session') return route.fulfill(json(adminSession))
    if (pathname === '/api/auth/users') return route.fulfill(json({ success: true, users: accessUsers }))
    if (pathname === '/api/admin/feature-access') return route.fulfill(json({ success: true, revision: 4, modules: accessModules, grants: [{ userId: 'user-1', modules: ['workbench', 'resource_workspace', 'developer_tools'] }] }))
    if (pathname === '/api/admin/resource-access') return route.fulfill(json({ success: true, revision: 4, grants: [{ grantId: 'grant-1', userId: 'user-1', resourceType: 'project', resourceId: 'smart-live-ui', level: 'manage' }, { grantId: 'grant-2', userId: 'user-1', resourceType: 'group', resourceId: 'group-1', level: 'use' }] }))
    if (pathname === '/api/admin/access-audit') return route.fulfill(json({ success: true, events: [{ eventId: 'audit-1', occurredAt: '2026-07-23T06:00:00.000Z', action: '更新功能权限', kind: 'feature', targetUserId: 'user-1' }] }))
    if (pathname === '/api/music/playback/commands/head') return route.fulfill(json({ success: true, command: null }))
    if (pathname === '/api/projects') return route.fulfill(json({ success: true, projects: [{ name: 'smart-live-ui', display_name: '智评生活前端' }, { name: 'smart-live-api', display_name: '智评生活服务端' }] }))
    if (pathname === '/api/groups') return route.fulfill(json({ success: true, groups: [{ id: 'group-1', name: '智评生活开发群' }] }))
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

const assertAccessControls = async (page, name) => {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('.access-page')
    const controls = Array.from(root.querySelectorAll('input:not([type="checkbox"]), select'))
      .filter(element => getComputedStyle(element).display !== 'none')
      .map(element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return { tag: element.tagName, height: rect.height, radius: Number.parseFloat(style.borderRadius), width: rect.width }
      })
    return {
      pageClientWidth: root.clientWidth,
      pageScrollWidth: root.scrollWidth,
      pageClientHeight: root.clientHeight,
      pageScrollHeight: root.scrollHeight,
      controls,
    }
  })
  assert.equal(metrics.pageScrollWidth, metrics.pageClientWidth, `${name} has horizontal overflow`)
  assert.ok(metrics.controls.length > 0, `${name} should render form controls`)
  assert.equal(metrics.controls.every(item => item.height >= 33 && item.height <= 36), true, JSON.stringify(metrics.controls))
  assert.equal(metrics.controls.every(item => item.radius >= 5 && item.radius <= 8), true, JSON.stringify(metrics.controls))
  report.checks.push({ name: `${name} uses canonical form controls without horizontal overflow`, pass: true, details: metrics })
}

const runAccessManagement = async (viewport, prefix) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(`${prefix} access page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`${prefix} access console: ${message.text()}`) })
  await mockBaseApi(page)

  await page.goto(`${baseUrl}/?tab=user-management`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.access-page').waitFor()
  await page.locator('[data-page-loading="user-management"]').waitFor({ state: 'detached', timeout: 10_000 })
  await page.getByText('成员账号', { exact: true }).waitFor()
  await assertAccessControls(page, `${prefix} user management`)
  await screenshot(page, `${prefix}-user-management`)

  await page.goto(`${baseUrl}/?tab=permission-management`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.access-page').waitFor()
  await page.locator('[data-page-loading="permission-management"]').waitFor({ state: 'detached', timeout: 10_000 })
  await page.getByText('项目与群聊范围', { exact: true }).waitFor()
  await assertAccessControls(page, `${prefix} permission management`)
  await screenshot(page, `${prefix}-permission-management`)
  const scroll = await page.evaluate(() => {
    const root = document.querySelector('.access-page')
    const before = root.scrollTop
    root.scrollTop = root.scrollHeight
    return { before, after: root.scrollTop, max: Math.max(0, root.scrollHeight - root.clientHeight) }
  })
  if (scroll.max > 1) assert.ok(scroll.after > scroll.before, `${prefix} permission page cannot scroll vertically: ${JSON.stringify(scroll)}`)
  assert.ok(Math.abs(scroll.after - scroll.max) <= 2, `${prefix} permission page did not reach its bottom: ${JSON.stringify(scroll)}`)
  report.checks.push({ name: `${prefix} permission management has a working vertical scroll owner`, pass: true, details: scroll })
  await screenshot(page, `${prefix}-permission-management-bottom`)
  if (prefix === 'desktop') {
    await page.getByRole('button', { name: '切换深色' }).click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.waitForTimeout(220)
    const darkControls = await page.evaluate(() => Array.from(document.querySelectorAll('.access-page select')).map(element => {
      const style = getComputedStyle(element)
      const channels = value => (value.match(/\d+(?:\.\d+)?/g) || []).slice(0, 3).map(Number)
      const luminance = value => {
        const [red = 0, green = 0, blue = 0] = channels(value)
        return (red * .2126) + (green * .7152) + (blue * .0722)
      }
      return { background: style.backgroundColor, color: style.color, border: style.borderColor, backgroundLuminance: luminance(style.backgroundColor), colorLuminance: luminance(style.color) }
    }))
    assert.equal(darkControls.every(item => item.backgroundLuminance < 80 && item.colorLuminance > 150), true, JSON.stringify(darkControls))
    report.checks.push({ name: 'permission management controls use theme tokens in dark mode', pass: true, details: darkControls })
    await screenshot(page, 'desktop-permission-management-dark')
  }
  await context.close()
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
  await page.waitForFunction(() => document.querySelector('#model-key')?.getAttribute('type') === 'text')
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
    const settingsPage = document.querySelector('.settings-page')
    settingsPage.scrollTop = settingsPage.scrollHeight
  })
  const scrollBeforeSave = await page.evaluate(() => {
    const settingsPage = document.querySelector('.settings-page')
    const outerPage = document.querySelector('.tab-pane.scrollable-pane')
    return {
      distanceFromBottom: Math.max(0, settingsPage.scrollHeight - settingsPage.clientHeight - settingsPage.scrollTop),
      outerScrollTop: outerPage?.scrollTop || 0,
    }
  })
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
  await page.waitForTimeout(100)
  const savedAdvancedLayout = await page.evaluate(() => {
    const details = document.querySelector('.settings-details')
    const settingsPage = document.querySelector('.settings-page')
    const outerPage = document.querySelector('.tab-pane.scrollable-pane')
    const saveButton = Array.from(document.querySelectorAll('button')).find(item => item.textContent?.trim() === '保存配置')
    const pageRect = settingsPage.getBoundingClientRect()
    const buttonRect = saveButton.getBoundingClientRect()
    return {
      detailsOpen: details.open,
      scrollTop: settingsPage.scrollTop,
      maxScrollTop: Math.max(0, settingsPage.scrollHeight - settingsPage.clientHeight),
      distanceFromBottom: Math.max(0, settingsPage.scrollHeight - settingsPage.clientHeight - settingsPage.scrollTop),
      saveButtonVisible: buttonRect.bottom >= pageRect.top && buttonRect.top <= pageRect.bottom,
      outerScrollTop: outerPage?.scrollTop || 0,
    }
  })
  assert.equal(savedAdvancedLayout.detailsOpen, true, JSON.stringify(savedAdvancedLayout))
  assert.equal(savedAdvancedLayout.scrollTop <= savedAdvancedLayout.maxScrollTop + 1, true, JSON.stringify(savedAdvancedLayout))
  assert.equal(savedAdvancedLayout.saveButtonVisible, true, JSON.stringify(savedAdvancedLayout))
  assert.ok(Math.abs(savedAdvancedLayout.distanceFromBottom - scrollBeforeSave.distanceFromBottom) <= 2, JSON.stringify({ scrollBeforeSave, savedAdvancedLayout }))
  assert.equal(savedAdvancedLayout.outerScrollTop, scrollBeforeSave.outerScrollTop, JSON.stringify({ scrollBeforeSave, savedAdvancedLayout }))
  report.checks.push({ name: 'saving advanced model settings preserves the settings scroll anchor', pass: true, details: savedAdvancedLayout })
  await screenshot(page, 'desktop-models-after-advanced-save')
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

  await page.getByRole('button', { name: /TestAgent/ }).click()
  await page.locator('[data-settings-panel="test-agent"]').waitFor()
  const testAgentControls = await page.evaluate(() => Array.from(document.querySelectorAll('.test-agent-hardening-grid select')).map(element => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return { height: rect.height, radius: Number.parseFloat(style.borderRadius), background: style.backgroundColor }
  }))
  assert.equal(testAgentControls.length, 4)
  assert.equal(testAgentControls.every(item => item.height === 34 && item.radius === 6), true, JSON.stringify(testAgentControls))
  report.checks.push({ name: 'TestAgent hardening selects use canonical control dimensions', pass: true, details: testAgentControls })
  await assertLayout(page, 'desktop test agent')
  await screenshot(page, 'desktop-test-agent')
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
  await runAccessManagement({ width: 1536, height: 830 }, 'desktop')
  await runAccessManagement({ width: 390, height: 844 }, 'mobile')
  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  await browser.close()
  if (appHost) await appHost.server.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
