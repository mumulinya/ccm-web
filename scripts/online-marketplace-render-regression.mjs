#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'docs', 'mcp-skill-goal-docs', 'evidence', 'online-marketplace-2026-07-14')
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
  await page.locator('.category-item').filter({ hasText: '技能商城' }).click()
  await page.locator('.marketplace-source-selector select').waitFor({ timeout: 30_000 })
}

const assertNoOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  assert.ok(metrics.scroll <= metrics.client + 1, `${label} horizontal overflow: ${JSON.stringify(metrics)}`)
  report.checks.push({ name: `${label} no horizontal overflow`, pass: true })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  const buffer = await page.screenshot({ path: file, fullPage: true })
  assert.ok(buffer.length > 20_000, `${name} screenshot is unexpectedly small`)
  report.screenshots.push(file)
}

const waitForMarketplaceResults = async page => {
  await page.waitForFunction(() => !document.querySelector('.marketplace-loading-state') && document.querySelectorAll('.marketplace-tool').length > 0, null, { timeout: 60_000 })
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop)
  await desktop.locator('.marketplace-source-selector select').selectOption('skills-sh')
  await desktop.locator('.marketplace-search-box input').fill('react')
  await desktop.locator('.marketplace-search-box input').press('Enter')
  await waitForMarketplaceResults(desktop)
  assert.ok(await desktop.locator('.marketplace-tool').count() > 0)
  assert.equal(await desktop.getByText(/配置 API Key|激活 Smithery/).count(), 0)
  assert.ok(await desktop.getByText(/次安装/).count() > 0)
  report.checks.push({ name: 'desktop Skills.sh real search renders install counts without configuration card', pass: true })
  await assertNoOverflow(desktop, 'desktop Skills.sh marketplace')
  await capture(desktop, 'desktop-skills-sh-search')

  await desktop.locator('.marketplace-source-selector select').selectOption('smithery')
  await desktop.locator('.marketplace-search-box input').fill('github')
  await desktop.locator('.marketplace-search-box input').press('Enter')
  await waitForMarketplaceResults(desktop)
  await desktop.getByText(/无需配置 API Key/).waitFor({ timeout: 60_000 })
  const desktopSmitheryStatus = await desktop.locator('.marketplace-source-status').innerText()
  const desktopSmitheryTotal = Number(desktopSmitheryStatus.match(/共\s*(\d+)\s*条/)?.[1] || 0)
  assert.ok(desktopSmitheryTotal > 0 && desktopSmitheryTotal < 1000, `Smithery search was overwritten by the full registry: ${desktopSmitheryStatus}`)
  assert.ok(await desktop.getByText(/次使用/).count() > 0)
  await desktop.locator('.marketplace-tool').first().getByRole('button', { name: '预览' }).click()
  await desktop.locator('.marketplace-preview-modal').waitFor({ timeout: 60_000 })
  await desktop.locator('.marketplace-preview-modal .preview-row').first().waitFor({ timeout: 60_000 })
  assert.ok(await desktop.locator('.preview-row').count() > 0)
  report.checks.push({ name: 'desktop Smithery anonymous search and source-bound detail preview render', pass: true })
  await capture(desktop, 'desktop-smithery-preview')
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  await mobile.locator('.marketplace-source-selector select').selectOption('smithery')
  await mobile.locator('.marketplace-search-box input').fill('github')
  await mobile.locator('.marketplace-search-box input').press('Enter')
  await waitForMarketplaceResults(mobile)
  const mobileSmitheryStatus = await mobile.locator('.marketplace-source-status').innerText()
  const mobileSmitheryTotal = Number(mobileSmitheryStatus.match(/共\s*(\d+)\s*条/)?.[1] || 0)
  assert.ok(mobileSmitheryTotal > 0 && mobileSmitheryTotal < 1000, `mobile Smithery search was overwritten by the full registry: ${mobileSmitheryStatus}`)
  await assertNoOverflow(mobile, 'mobile Smithery marketplace')
  const searchBox = await mobile.locator('.marketplace-search-box').boundingBox()
  assert.ok(searchBox && searchBox.x >= -1 && searchBox.x + searchBox.width <= 391, 'mobile search box is outside viewport')
  report.checks.push({ name: 'mobile search, categories, cards and actions stay inside viewport', pass: true })
  await capture(mobile, 'mobile-smithery-search')
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
