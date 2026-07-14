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

const screenshot = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

const runDesktop = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(`desktop page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`desktop console: ${message.text()}`) })
  await page.route('**/api/orchestrator/connection-test', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, message: '连接正常，响应耗时 128 ms', latencyMs: 128, consumers: [
      { id: 'global-agent', label: '全局 Agent', ready: true },
      { id: 'group-main-agent', label: '群聊主 Agent', ready: true },
      { id: 'music-agent', label: '音乐 Agent', ready: true }
    ] })
  }))
  await openSettings(page)
  await assertLayout(page, 'desktop channels')
  await screenshot(page, 'desktop-channels')

  await page.getByRole('button', { name: /统一大模型/ }).click()
  await page.locator('[data-settings-panel="models"]').waitFor()
  await page.getByRole('button', { name: /保存并测试连接/ }).click()
  await page.getByText('统一大模型连接正常', { exact: true }).waitFor()
  assert.equal(await page.getByText('本次连接测试通过', { exact: true }).count(), 3)
  assert.equal(await page.getByText('v1.0.8', { exact: true }).count(), 0)
  report.checks.push({ name: 'model connection result maps to global, group and music agents', pass: true })
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
