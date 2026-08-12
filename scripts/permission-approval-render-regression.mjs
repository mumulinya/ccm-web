import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'permission-approval-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_PERMISSION_APPROVAL_PORT || 3099) })
let browser

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } })
  await page.goto(`${baseUrl}/visual-regression/permission-approval-fixture.html`, { waitUntil: 'networkidle' })
  const card = page.locator('.permission-approval-card')
  assert.equal(await card.getByText('需要确认代码修改', { exact: true }).isVisible(), true)
  assert.equal(await card.getByText('项目子 Agent 准备修改 smart-live-ui', { exact: true }).isVisible(), true)
  assert.equal(await card.getByText('当前项目工作区', { exact: true }).isVisible(), true)
  assert.equal(await card.getByText('仅当前任务及其返工、复验有效', { exact: true }).isVisible(), true)
  assert.equal(await card.getByText('发布、密钥、提权和破坏性操作仍需单独确认', { exact: true }).isVisible(), true)
  assert.equal(await card.getByRole('button', { name: '允许当前任务修改' }).isVisible(), true)
  assert.ok((await card.evaluate(node => parseFloat(getComputedStyle(node).borderLeftWidth))) <= 1, '卡片不应使用整圈警告色粗边框')
  await page.screenshot({ path: path.join(outputDir, 'desktop-light.png'), fullPage: true })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  await page.screenshot({ path: path.join(outputDir, 'desktop-dark.png'), fullPage: true })
  await card.getByRole('button', { name: '允许当前任务修改' }).click()
  assert.equal(await page.locator('.decision').textContent(), 'approved:permission-fixture')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`${baseUrl}/visual-regression/permission-approval-fixture.html`, { waitUntil: 'networkidle' })
  const widths = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  assert.ok(widths.scroll <= widths.client + 1, `移动端出现横向溢出：${JSON.stringify(widths)}`)
  assert.equal(await mobile.getByRole('button', { name: '允许当前任务修改' }).isVisible(), true)
  await mobile.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true })
  console.log(JSON.stringify({ pass: true, screenshots: outputDir, checks: 10 }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
