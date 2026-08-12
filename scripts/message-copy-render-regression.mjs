import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'message-copy-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_MESSAGE_COPY_PORT || 3102) })
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
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  await page.goto(`${baseUrl}/visual-regression/message-copy-fixture.html`, { waitUntil: 'networkidle' })

  for (const selector of ['.user-row', '.assistant-row', '.streaming-row']) {
    const action = page.locator(selector).getByRole('button', { name: /复制/ })
    assert.equal(await action.isVisible(), true, `${selector} 缺少可见复制入口`)
    assert.ok(Number(await action.evaluate(node => getComputedStyle(node).opacity)) > 0.5, `${selector} 复制入口不应完全隐藏`)
  }

  await page.screenshot({ path: path.join(outputDir, 'desktop-light.png'), fullPage: true })

  await page.locator('.user-row').getByRole('button', { name: '复制' }).click()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '请检查项目状态，并告诉我需要处理的问题。')
  assert.equal(await page.locator('.user-row').getByRole('button', { name: '已复制' }).isVisible(), true)

  await page.locator('.assistant-row').getByRole('button', { name: '复制' }).click()
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), '系统当前可用。\n\n- 项目配置已读取\n- 暂无运行中的任务')

  await page.locator('.streaming-row').getByRole('button', { name: '复制当前内容' }).click()
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '我正在整理当前可用的项目和任务状态。')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`${baseUrl}/visual-regression/message-copy-fixture.html`, { waitUntil: 'networkidle' })
  const widths = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  assert.ok(widths.scroll <= widths.client + 1, `移动端出现横向溢出：${JSON.stringify(widths)}`)
  assert.equal(await mobile.locator('.assistant-row').getByRole('button', { name: '复制' }).isVisible(), true)
  await mobile.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true })
  console.log(JSON.stringify({ pass: true, screenshots: outputDir, checks: 11 }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
