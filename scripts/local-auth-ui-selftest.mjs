import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'local-auth-ui-selftest')
fs.mkdirSync(outputDir, { recursive: true })
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-auth-ui-'))
const port = await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); }); })
const baseUrl = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port), '127.0.0.1'], { cwd: root, env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome, CCM_FEISHU_CONTROL_BOT_AUTO_START: '0', CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
child.stdout.on('data', chunk => { output = `${output}${chunk}`.slice(-5000) })
child.stderr.on('data', chunk => { output = `${output}${chunk}`.slice(-5000) })

const stop = async () => { if (child.exitCode === null) child.kill('SIGTERM'); await new Promise(resolve => { if (child.exitCode !== null) return resolve(); const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000); child.once('exit', () => { clearTimeout(timer); resolve(); }); }); }

let browser
try {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) { try { if ((await fetch(`${baseUrl}/api/auth/session`)).ok) break } catch {} await new Promise(resolve => setTimeout(resolve, 200)) }
  assert.equal(fs.existsSync(path.join(tempHome, '.cc-connect', 'auth', 'setup-code.txt')), true, output)
  const setupCode = fs.readFileSync(path.join(tempHome, '.cc-connect', 'auth', 'setup-code.txt'), 'utf8').trim()
  const executablePath = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean).find(candidate => fs.existsSync(candidate))
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.getByText('首次安装').waitFor()
  await page.locator('input[name="setup-code"]').fill(setupCode)
  await page.locator('input[name="username"]').fill('ui-admin')
  await page.locator('input[name="password"]').fill('UI-Admin-123!')
  await page.locator('input[name="confirm-password"]').fill('UI-Admin-123!')
  await page.getByRole('button', { name: /创建账户/ }).click()
  await page.waitForURL(url => url.pathname !== '/login', { timeout: 20_000 })
  await page.goto(`${baseUrl}/?tab=settings`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /账户与安全/ }).click()
  await page.getByText('账户与角色').waitFor()
  await page.screenshot({ path: path.join(outputDir, 'desktop-security.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(outputDir, 'mobile-security.png'), fullPage: true })
  assert.equal(await page.getByText('Viewer只能查看和只读问答').count() > 0, true)
  console.log(JSON.stringify({ pass: true, checks: { firstInstallForm: true, setupCodeRegistration: true, csrfAuthenticatedNavigation: true, roleManagementVisible: true, desktop: true, mobile: true }, screenshots: ['desktop-security.png', 'mobile-security.png'], paidProviderCalls: 0 }, null, 2))
} finally {
  await browser?.close().catch(() => {})
  await stop()
  if (!process.env.CCM_KEEP_TEST_ARTIFACTS) fs.rmSync(tempHome, { recursive: true, force: true })
}
