import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'global-memory-center-sessions')
assert.ok(outputDir.startsWith(`${root}${path.sep}`))
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.goto(process.env.CCM_BASE_URL || 'http://127.0.0.1:3080', { waitUntil: 'domcontentloaded' })
await page.locator('.app-container').waitFor({ state: 'visible' })

const memoryNav = page.getByText('记忆控制中心', { exact: true })
assert.equal(await memoryNav.count(), 1)
await memoryNav.click()
const center = page.locator('.memory-center')
await center.waitFor({ state: 'visible' })
const globalParent = center.locator('.scope-parent').filter({ has: page.getByText('全局 Agent', { exact: true }) })
await globalParent.locator('summary').getByText('1 个会话', { exact: true }).waitFor({ state: 'visible' })
await globalParent.getByText('长期记忆', { exact: true }).waitFor({ state: 'visible' })
const currentSessionButton = globalParent.locator('.scope-children button').filter({ hasText: '你好呀 · 当前' })
await currentSessionButton.waitFor({ state: 'visible' })
await currentSessionButton.click()
await center.locator('.detail-head h3').filter({ hasText: '你好呀' }).waitFor({ state: 'visible' })
assert.equal(await center.getByText('diagnostic:', { exact: false }).count(), 0)
const detailText = await center.locator('.detail-content').innerText()
assert.match(detailText, /(?:当前会话摘要|历史会话摘要)/, detailText)
assert.match(detailText, /本会话压缩归档/, detailText)
const groupParent = center.locator('.scope-parent').filter({ has: page.getByText('智评生活开发群', { exact: true }) })
assert.equal(await groupParent.getAttribute('open'), null)
await groupParent.locator('summary').click()
await groupParent.locator('.scope-children button').first().waitFor({ state: 'visible' })
assert.equal(await groupParent.locator('.scope-children button').count(), 3)
await groupParent.locator('summary').click()
const projectParent = center.locator('.scope-parent').filter({ has: page.getByText('smart-live-app', { exact: true }) })
assert.equal(await projectParent.getAttribute('open'), null)
await projectParent.locator('summary').click()
await projectParent.locator('.scope-children button').first().waitFor({ state: 'visible' })
assert.equal(await projectParent.locator('.scope-children button').count(), 11)
await projectParent.locator('summary').click()
await groupParent.locator('summary').click()
const correctedGroupSession = groupParent.locator('.scope-children button').filter({ hasText: '14,946 / 900,000' })
await correctedGroupSession.click()
await center.locator('.detail-head h3').filter({ hasText: '新会话' }).waitFor({ state: 'visible' })
await center.locator('.memory-section h4').filter({ hasText: '近期原文（只读）' }).waitFor({ state: 'visible' })
await center.getByText('等待模型抽取', { exact: false }).waitFor({ state: 'visible' })
assert.equal(await center.getByText('事实', { exact: true }).count(), 0)
assert.equal(await center.getByText('决策', { exact: true }).count(), 0)
assert.equal(await center.getByText('下一步', { exact: true }).count(), 0)
const recentSection = center.locator('.memory-section').filter({ hasText: '近期原文（只读）' }).first()
assert.equal(await recentSection.locator('.memory-row').count(), 2)
assert.equal(await recentSection.locator('.row-actions').count(), 0)
const desktopMetrics = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  scopeScrollHeight: document.querySelector('.scope-list')?.scrollHeight || 0,
  scopeClientHeight: document.querySelector('.scope-list')?.clientHeight || 0,
}))
assert.ok(desktopMetrics.overflow <= 1)
await page.screenshot({ path: path.join(outputDir, 'desktop.png') })
await page.screenshot({ path: path.join(outputDir, 'group-session-corrected-desktop.png') })

await page.setViewportSize({ width: 390, height: 844 })
await globalParent.locator('summary').getByText('1 个会话', { exact: true }).waitFor({ state: 'visible' })
const mobileMetrics = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  scopeVisible: getComputedStyle(document.querySelector('.scope-list')).display !== 'none',
}))
assert.ok(mobileMetrics.overflow <= 1)
assert.equal(mobileMetrics.scopeVisible, true)
await page.screenshot({ path: path.join(outputDir, 'mobile.png') })
assert.deepEqual(errors, [])
await browser.close()
console.log(JSON.stringify({ pass: true, desktopMetrics, mobileMetrics, screenshots: outputDir }, null, 2))
