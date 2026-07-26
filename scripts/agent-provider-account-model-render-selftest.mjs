import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'agent-provider-account-model-render')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const providers = [
  { id: 'codex', label: 'Codex CLI', description: '使用本机 Codex 账号登录。', settingsManaged: true },
  { id: 'cursor', label: 'Cursor Agent', description: '使用本机 Cursor 账号登录。', settingsManaged: true },
  { id: 'gemini', label: 'Gemini CLI', description: '使用 Google 账号登录。', settingsManaged: true },
  { id: 'opencode', label: 'OpenCode', description: '使用已连接的模型 Provider。', settingsManaged: true },
  { id: 'claudecode', label: 'Claude Code API', description: '使用第三方 API。', settingsManaged: true },
]

const config = Object.fromEntries(providers.map(provider => [provider.id, {
  enabled: provider.id !== 'claudecode',
  authMode: provider.id === 'claudecode' ? 'api' : 'cli_login',
  model: '',
  ...(provider.id === 'claudecode' ? { apiUrl: 'https://api.anthropic.com', credentialType: 'api_key', hasKey: false } : {}),
}]))
Object.assign(config.claudecode, {
  enabled: true,
  manualEnabled: false,
  syncExternal: true,
  externalManaged: true,
  providerName: 'CC-Switch Claude Provider',
  source: 'cc-switch',
  apiUrl: 'https://claude-gateway.example.test',
  model: 'claude-external-model',
  credentialType: 'auth_token',
  hasKey: true,
  credentialProtected: false,
})

const statuses = Object.fromEntries(providers.map(provider => [provider.id, {
  provider: provider.id,
  installed: true,
  version: `${provider.label} test`,
  authState: provider.id === 'claudecode' ? 'not_configured' : 'logged_in',
  account: provider.id === 'claudecode' ? '' : `${provider.id}-user@example.test`,
  detail: provider.id === 'claudecode' ? '请配置 API' : '已读取当前登录账号',
  install: { status: 'idle' },
}]))
Object.assign(statuses.claudecode, { authState: 'configured', externalManaged: true, providerName: 'CC-Switch Claude Provider', credentialSource: 'cc-switch', detail: '已同步 CC-Switch Claude Provider' })

const modelCatalog = {
  codex: [{ id: '', label: '自动（跟随 Codex CLI）' }, { id: 'gpt-account-a', label: 'Account Model A' }, { id: 'gpt-account-b', label: 'Account Model B' }],
  cursor: [{ id: '', label: '自动（由 Cursor 选择）' }, { id: 'cursor-account-model', label: 'Cursor Account Model' }],
  gemini: [{ id: '', label: '自动（由 Gemini CLI 选择）' }, { id: 'gemini-account-model', label: 'Gemini Account Model' }],
  opencode: [{ id: '', label: '自动（由 OpenCode 选择）' }, { id: 'openai/account-model', label: 'openai/account-model' }],
  claudecode: [{ id: 'claude-external-model', label: 'Claude External Model' }],
}

const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname
    if (!pathname.startsWith('/api/')) return route.continue()
    if (pathname === '/api/runtime/events' || pathname.endsWith('/stream')) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    if (pathname === '/api/auth/session') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, authenticated: true, user: { username: 'selftest' } }) })
    if (pathname === '/api/system/agent-providers') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, config, statuses, providers }) })
    const modelMatch = pathname.match(/^\/api\/system\/agent-providers\/([^/]+)\/models$/)
    if (modelMatch) {
      const models = modelCatalog[modelMatch[1]] || []
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, models, source: models.some(model => model.id) ? 'account_catalog' : 'unavailable', allowsCustom: true, error: models.length ? '' : '请先配置凭据' }) })
    }
    const testMatch = pathname.match(/^\/api\/system\/agent-providers\/([^/]+)\/test$/)
    if (testMatch) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, test: { provider: testMatch[1], usable: true, latencyMs: 842, model: 'gpt-account-a', detail: 'Agent 已完成最小只读响应测试', checkedAt: new Date().toISOString() } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.getByText('系统设置', { exact: true }).first().click()
  await page.getByRole('button', { name: /开发 Agent/ }).click()
  await page.locator('[data-settings-panel="agent-providers"]').waitFor()
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  await prepare(page)
  await page.locator('#codex-provider-model').waitFor()
  assert.equal(await page.getByText('codex-user@example.test', { exact: false }).count(), 1)
  assert.equal(await page.locator('.provider-account').count(), 4)
  assert.equal(await page.locator('#codex-provider-model').evaluate(element => element.tagName), 'SELECT')
  assert.deepEqual(await page.locator('#codex-provider-model option').evaluateAll(options => options.map(option => option.value)), ['', 'gpt-account-a', 'gpt-account-b', '__custom__'])
  assert.equal(await page.locator('datalist').count(), 0)
  const codexRow = page.locator('.agent-provider-row').filter({ hasText: 'Codex CLI' }).first()
  await codexRow.getByRole('button', { name: '测试', exact: true }).click()
  await codexRow.getByText('当前 Agent 可以使用', { exact: true }).waitFor()
  assert.match(await codexRow.locator('.provider-test-result').innerText(), /842 ms[\s\S]+gpt-account-a/)
  await page.locator('#codex-provider-model').selectOption('__custom__')
  assert.equal(await page.locator('#codex-provider-custom-model').isVisible(), true)
  assert.equal(await page.getByText('正在跟随 CC-Switch', { exact: true }).count(), 1)
  assert.equal(await page.getByText(/CC-Switch Claude Provider/).count() >= 1, true)
  assert.equal(await page.locator('#claude-provider-key').isDisabled(), true)
  assert.equal(await page.locator('#claude-provider-key').getAttribute('placeholder'), '由 CC-Switch 管理，不复制到 CCM')
  assert.equal(await page.getByRole('button', { name: '测试 Agent', exact: true }).count(), 1)
  const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1)
  report.checks.push({ name: 'current Agent accounts are visible without credential material', pass: true })
  report.checks.push({ name: 'current-account model catalogs render as real select controls with an explicit custom fallback', pass: true })
  report.checks.push({ name: 'logged-in Agent test action renders verified availability, latency, and model', pass: true })
  report.checks.push({ name: 'Claude Code API visibly follows CC-Switch while keeping the external key out of the browser', pass: true })
  const screenshot = path.join(outputDir, 'desktop-agent-accounts-and-models.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  report.screenshots.push(screenshot)
  await page.locator('.claude-provider-row').scrollIntoViewIfNeeded()
  const claudeScreenshot = path.join(outputDir, 'desktop-claude-cc-switch-sync.png')
  await page.screenshot({ path: claudeScreenshot })
  report.screenshots.push(claudeScreenshot)
  await context.close()
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
