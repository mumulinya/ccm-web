import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'terminal-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const workspace = {
  activeTerminalId: 'term-one', splitMode: false,
  sessions: [
    { id: 'term-one', name: '开发终端', selectedProject: 'ccm-demo', currentCwd: 'C:\\workspace\\ccm-demo', shell: 'pwsh' },
    { id: 'term-two', name: '测试终端', selectedProject: '', currentCwd: 'C:\\Users\\admin', shell: 'pwsh' },
  ],
}
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const sse = payload => `data: ${JSON.stringify(payload)}\n\n`

const prepare = async page => {
  const inputs = []
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => {
    const value = message.text()
    if (message.type() === 'error' && !/favicon|EventSource/i.test(value)) report.errors.push(`console: ${value}`)
  })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/auth/session', route => route.fulfill(json({ success: true, authenticated: true, user: { username: 'selftest' } })))
  await page.route('**/api/projects', route => route.fulfill(json({ projects: [{ name: 'ccm-demo', work_dir: 'C:\\workspace\\ccm-demo', running: true }] })))
  await page.route('**/api/groups', route => route.fulfill(json({ groups: [{ id: 'group-demo', name: '研发协作群' }] })))
  await page.route('**/api/pets/agents', route => route.fulfill(json({ agents: [] })))
  await page.route('**/api/status/stream*', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.route('**/api/usability/workbench/stream*', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.route('**/api/usability/workbench', route => route.fulfill(json({ success: true, snapshot: {} })))
  await page.route('**/api/music/remote-command*', route => route.fulfill(json({ success: true, commands: [] })))
  await page.route('**/api/terminal/info', route => route.fulfill(json({ success: true, platform: 'win32', home: 'C:\\Users\\admin', user: 'admin', shell: 'powershell' })))
  await page.route('**/api/terminal/shells', route => route.fulfill(json({ success: true, defaultShell: 'pwsh', shells: [{ id: 'pwsh', label: 'PowerShell 7' }, { id: 'cmd', label: 'Command Prompt' }] })))
  await page.route('**/api/terminal/workspace', route => route.fulfill(json(route.request().method() === 'GET' ? { success: true, workspace } : { success: true })))
  await page.route('**/api/terminal/project-actions*', route => route.fulfill(json({ success: true, cwd: 'C:\\workspace\\ccm-demo', scripts: [{ name: 'dev', command: 'npm run dev' }, { name: 'test', command: 'npm run test' }, { name: 'build', command: 'npm run build' }], repository: { branch: 'feature/terminal-workbench', dirty: true, changedFiles: 5 } })))
  await page.route('**/api/terminal/sessions', route => route.fulfill(json({ success: true, sessions: [{ id: 'term-one', name: '开发终端', shellLabel: 'PowerShell 7', status: 'running', pid: 31888, ports: [3080, 5173], startedAt: new Date(Date.now() - 125_000).toISOString() }] })))
  await page.route('**/api/terminal/session/events*', route => {
    const id = new URL(route.request().url()).searchParams.get('id') || 'term-one'
    return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse({ type: 'ready', session: { id, name: id === 'term-one' ? '开发终端' : '测试终端', shellLabel: 'PowerShell 7', status: 'running', pid: id === 'term-one' ? 31888 : 31999, startedAt: new Date().toISOString() } }) + sse({ type: 'snapshot', data: `\u001b[36mPowerShell 7 · persistent PTY\u001b[0m\r\nPS C:\\workspace\\ccm-demo> ` }) })
  })
  await page.route('**/api/terminal/session/input', async route => {
    inputs.push((await route.request().postDataJSON()).data)
    await route.fulfill(json({ success: true }))
  })
  await page.route('**/api/terminal/session/resize', route => route.fulfill(json({ success: true })))
  await page.route('**/api/terminal/session/confirm', route => route.fulfill(json({ success: true })))
  await page.route('**/api/terminal/session', route => route.fulfill(json({ success: true, session: { id: route.request().postDataJSON()?.sessionId || 'term-one', status: 'running', pid: 31888, startedAt: new Date().toISOString() } })))
  await page.goto(`${baseUrl}/?tab=terminal`, { waitUntil: 'commit', timeout: 30_000 })
  await page.locator('.terminal-workbench').waitFor({ timeout: 60_000 })
  await page.locator('.xterm-screen').first().waitFor({ timeout: 60_000 })
  return inputs
}

const assertNoOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    workbenchWidth: document.querySelector('.terminal-workbench')?.clientWidth || 0,
    workbenchScrollWidth: document.querySelector('.terminal-workbench')?.scrollWidth || 0,
  }))
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label} document overflow`)
  assert.ok(metrics.workbenchScrollWidth <= metrics.workbenchWidth + 1, `${label} terminal overflow`)
}
const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

try {
  const desktop = await (await browser.newContext({ viewport: { width: 1440, height: 920 } })).newPage()
  const inputs = await prepare(desktop)
  await assertNoOverflow(desktop, 'desktop')
  assert.equal(await desktop.locator('.terminal-pane').count(), 1)
  assert.equal(await desktop.locator('.xterm-screen').count(), 1)
  assert.match(await desktop.locator('.pane-context-bar').innerText(), /ccm-demo[\s\S]*PowerShell 7[\s\S]*feature\/terminal-workbench/)
  report.checks.push({ name: 'real xterm viewport renders inside a project and shell aware workspace', pass: true })
  await capture(desktop, 'desktop-pty-workspace')

  await desktop.getByRole('button', { name: '命令', exact: true }).click()
  const commandDrawer = desktop.locator('.command-drawer')
  await commandDrawer.getByText('项目脚本', { exact: false }).waitFor()
  await commandDrawer.getByRole('button', { name: /test[\s\S]*npm run test/ }).click()
  await desktop.waitForFunction(() => true)
  assert.equal(inputs.some(value => String(value).includes('npm run test')), true)
  report.checks.push({ name: 'detected package scripts run in the active persistent shell', pass: true })

  await desktop.getByRole('button', { name: '进程', exact: true }).click()
  const processDrawer = desktop.locator('.process-drawer')
  await processDrawer.getByText('PID 31888', { exact: false }).waitFor()
  assert.equal(await processDrawer.getByRole('button', { name: 'localhost:3080' }).isVisible(), true)
  assert.equal(await processDrawer.getByRole('button', { name: 'localhost:5173' }).isVisible(), true)
  report.checks.push({ name: 'process drawer exposes pid runtime and detected development ports', pass: true })
  await capture(desktop, 'desktop-process-drawer')
  await processDrawer.getByTitle('关闭').click()

  await desktop.getByRole('button', { name: '交给 Agent', exact: true }).click()
  const agentDrawer = desktop.locator('.agent-drawer')
  assert.equal(await agentDrawer.getByText('全局助手', { exact: true }).isVisible(), true)
  assert.equal(await agentDrawer.getByText('ccm-demo 项目 Agent', { exact: true }).isVisible(), true)
  assert.equal(await agentDrawer.getByText('研发协作群 群聊主 Agent', { exact: true }).isVisible(), true)
  report.checks.push({ name: 'terminal evidence can be drafted to global project or group agents without auto-send', pass: true })
  await capture(desktop, 'desktop-agent-routing')

  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await prepare(mobile)
  await assertNoOverflow(mobile, 'mobile')
  assert.equal(await mobile.locator('.terminal-pane').count(), 1)
  assert.equal(await mobile.locator('.xterm-screen').isVisible(), true)
  assert.equal(await mobile.locator('.toolbar-actions').getByRole('button').count(), 5)
  report.checks.push({ name: 'mobile keeps one full usable terminal with compact workflow controls', pass: true })
  await capture(mobile, 'mobile-pty-workspace')

  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}
