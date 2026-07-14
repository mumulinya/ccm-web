#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'docs', 'mcp-skill-goal-docs', 'evidence', 'tool-control-center-2026-07-14')
fs.mkdirSync(outputDir, { recursive: true })
const executablePath = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(fs.existsSync)
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], screenshots: [], errors: [] }

const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => {
    const value = message.text()
    if (message.type() === 'error' && !/favicon|fonts\.googleapis|ERR_(CONNECTION_CLOSED|TIMED_OUT)/.test(value)) report.errors.push(`console: ${value}`)
  })
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }))
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.goto(`${baseUrl}/?tab=tools`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('[data-testid="tool-control-overview"]').waitFor({ timeout: 60_000 })
  await page.getByText('真实调用已验证', { exact: true }).waitFor()
  await page.locator('[data-testid="tool-control-overview"]').getByText('3/3', { exact: true }).waitFor({ timeout: 60_000 })
  await page.getByText('目标验收 7/7 项通过', { exact: true }).waitFor({ timeout: 60_000 })
}

const assertNoOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  assert.ok(metrics.scroll <= metrics.client + 1, `${label} has horizontal overflow: ${JSON.stringify(metrics)}`)
  report.checks.push({ name: `${label} has no horizontal overflow`, pass: true })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  const buffer = await page.screenshot({ path: file, fullPage: true })
  assert.ok(buffer.length > 20_000, `${name} screenshot is unexpectedly small`)
  report.screenshots.push(file)
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop)
  await assertNoOverflow(desktop, 'desktop overview')
  assert.equal(await desktop.locator('.technical-overview[open]').count(), 0)
  assert.equal(await desktop.getByText('3/3', { exact: true }).count() > 0, true)
  assert.equal(await desktop.getByText('目标验收 7/7 项通过', { exact: true }).count(), 1)
  assert.equal(await desktop.locator('.category-item').filter({ hasText: '授权总览' }).getByText('3/3', { exact: true }).count(), 1)
  assert.equal(await desktop.locator('.category-item').filter({ hasText: 'Agent 运行时' }).getByText('4/4', { exact: true }).count(), 1)
  report.checks.push({ name: 'desktop overview shows verified scopes and completed goal with technical details closed', pass: true })
  await capture(desktop, 'desktop-overview')

  await desktop.locator('.category-item').filter({ hasText: 'MCP 连接中心' }).click()
  const feishuCard = desktop.locator('.tool-card').filter({ hasText: 'mcp-feishu' })
  await feishuCard.waitFor({ timeout: 60_000 })
  assert.equal(await feishuCard.getByText('FEISHU_APP_SECRET').count(), 0)
  await feishuCard.getByRole('button', { name: '编辑' }).click()
  const editor = desktop.getByRole('dialog', { name: '编辑 MCP 服务器' })
  await editor.waitFor()
  assert.equal(await editor.locator('textarea').nth(1).inputValue(), '')
  assert.equal(await editor.getByText(/已安全保存 2 项/).count(), 1)
  report.checks.push({ name: 'MCP editor exposes credential names but never returns credential values', pass: true })
  await capture(desktop, 'desktop-mcp-editor')
  await editor.getByTitle('关闭').click()
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  await assertNoOverflow(mobile, 'mobile overview')
  const overviewBox = await mobile.locator('[data-testid="tool-control-overview"]').boundingBox()
  assert.ok(overviewBox && overviewBox.x >= -1 && overviewBox.x + overviewBox.width <= 391, 'mobile overview is outside viewport')
  assert.equal(await mobile.getByText('真实调用已验证', { exact: true }).count(), 1)
  report.checks.push({ name: 'mobile overview stays usable and keeps the verified status visible', pass: true })
  await capture(mobile, 'mobile-overview')
  await mobileContext.close()

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
