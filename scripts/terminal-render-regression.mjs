import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'terminal-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const workspace = {
  activeTerminalId: 'term-one', splitMode: false,
  sessions: [
    { id: 'term-one', name: '开发终端', selectedProject: 'ccm-demo', currentCwd: 'C:\\workspace\\ccm-demo', history: ['git status', 'node -v'], terminalOutput: [{ text: 'PowerShell · admin', type: 'system', time: '13:00:00' }], lastExitCode: null, lastDurationMs: 0 },
    { id: 'term-two', name: '测试终端', selectedProject: '', currentCwd: 'C:\\Users\\admin', history: ['npm test'], terminalOutput: [{ text: '测试会话已就绪', type: 'system', time: '13:00:02' }], lastExitCode: 0, lastDurationMs: 820 },
  ],
}
const sse = payload => `data: ${JSON.stringify(payload)}\n\n`

const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('**/api/projects', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [{ name: 'ccm-demo', work_dir: 'C:\\workspace\\ccm-demo', running: true }] }) }))
  await page.route('**/api/terminal/info', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, platform: 'win32', home: 'C:\\Users\\admin', user: 'admin', shell: 'powershell' }) }))
  await page.route('**/api/terminal/workspace', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().method() === 'GET' ? { success: true, workspace } : { success: true }) }))
  await page.route('**/api/terminal/stream', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: [
    sse({ type: 'started', runId: 'terminal-ui-run', cwd: 'C:\\workspace\\ccm-demo' }),
    sse({ type: 'stdout', text: 'streamed hello\n' }),
    sse({ type: 'stdout', text: 'all checks passed\n' }),
    sse({ type: 'done', runId: 'terminal-ui-run', exitCode: 0, stopped: false, cwd: 'C:\\workspace\\ccm-demo', durationMs: 430 }),
  ].join('') }))
  await page.route('**/api/terminal/stop', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }))
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if ((page.viewportSize()?.width || 1000) <= 768) {
    await page.getByRole('button', { name: '更多', exact: true }).click()
    await page.locator('.mobile-more-grid').getByRole('button', { name: '内置终端', exact: true }).click()
  } else {
    await page.locator('.nav-item').filter({ hasText: '内置终端' }).first().click()
  }
  await page.locator('.terminal-workbench').waitFor()
  await page.getByText('开发终端', { exact: true }).waitFor()
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
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop)
  await assertNoOverflow(desktop, 'desktop')
  assert.equal(await desktop.locator('.terminal-pane').count(), 1)
  await desktop.getByTitle('切换分屏').click()
  assert.equal(await desktop.locator('.terminal-pane').count(), 2)
  report.checks.push({ name: 'desktop keeps two persisted sessions and toggles split view without deleting either session', pass: true })
  await capture(desktop, 'desktop-split-workspace')

  const activePane = desktop.locator('.terminal-pane.active')
  await activePane.locator('.terminal-input').fill("Write-Output 'hello'")
  await activePane.getByRole('button', { name: '运行', exact: true }).click()
  await activePane.getByText('streamed hello', { exact: false }).waitFor()
  assert.match(await activePane.locator('.pane-meta').innerText(), /已完成[\s\S]*exit 0[\s\S]*430ms/)
  report.checks.push({ name: 'streamed command output, completion state, exit code and duration render in the active terminal', pass: true })
  await capture(desktop, 'desktop-command-result')

  await desktop.getByTitle('命令历史').click()
  await desktop.locator('.history-drawer').getByRole('button', { name: 'git status', exact: true }).waitFor()
  report.checks.push({ name: 'persisted command history is searchable and reusable', pass: true })
  await capture(desktop, 'desktop-history-drawer')

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  await assertNoOverflow(mobile, 'mobile')
  assert.equal(await mobile.locator('.terminal-pane').count(), 1)
  assert.equal(await mobile.locator('.preset-panel').isVisible(), true)
  assert.equal(await mobile.locator('.terminal-input').isVisible(), true)
  report.checks.push({ name: 'mobile keeps one usable terminal, horizontal presets and command input without page overflow', pass: true })
  await capture(mobile, 'mobile-terminal-workspace')

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
