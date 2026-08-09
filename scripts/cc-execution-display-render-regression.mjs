import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'cc-execution-display-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_CC_DISPLAY_PORT || 3094) })
let browser

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }))
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${label}存在横向溢出：${JSON.stringify(dimensions)}`)
}

try {
  await fs.rm(outputDir, { recursive:true, force:true })
  await fs.mkdir(outputDir, { recursive:true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport:{ width:1280, height:850 }, deviceScaleFactor:1 })
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await desktop.goto(`${baseUrl}/visual-regression/agent-execution-transcript-fixture.html`, { waitUntil:'networkidle' })
  assert.equal(await desktop.getByText('正在思考…', { exact:true }).isVisible(), true, '普通处理中必须使用紧凑中性状态')
  assert.equal((await desktop.locator('.pending-message').innerText()).includes('项目主 Agent'), false, '普通处理中不得提前显示任务化文案')
  assert.equal(await desktop.locator('.cc-execution').count(), 1, '普通对话默认必须隐藏零动作执行记录')
  assert.equal(await desktop.locator('.cc-execution').getByText('任务已完成', { exact:true }).isVisible(), true)
  assert.equal(await desktop.locator('.cc-execution-rows').count(), 0, '默认必须紧凑折叠')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-collapsed.png'), fullPage:true })
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.cc-execution').count(), 2, 'Ctrl+O必须显示普通对话的安全技术记录')
  assert.equal(await desktop.getByText('正在组织回复', { exact:true }).isVisible(), true)
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.cc-execution').count(), 1, '再次Ctrl+O必须恢复普通对话轻量视图')
  await desktop.locator('.cc-execution-head').click()
  assert.equal(await desktop.getByText('Find definition', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.getByText('已提交结果，等待 CCM 验收', { exact:true }).isVisible(), true)
  assert.equal(await desktop.getByText('TestAgent', { exact:true }).isVisible(), true)
  assert.equal(await desktop.getByText('参数摘要', { exact:true }).isVisible(), true)
  assert.equal((await desktop.locator('body').innerText()).includes('PRIVATE_HANDOFF_SENTINEL'), false)
  await noOverflow(desktop, 'desktop')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-expanded.png'), fullPage:true })
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.cc-execution-rows').count(), 0, 'Ctrl+O必须切换折叠状态')
  assert.deepEqual(desktopErrors, [])

  const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await mobile.goto(`${baseUrl}/visual-regression/agent-execution-transcript-fixture.html`, { waitUntil:'networkidle' })
  await mobile.locator('.cc-execution-head').click()
  await noOverflow(mobile, 'mobile')
  assert.equal(await mobile.getByText('Find definition', { exact:true }).first().isVisible(), true)
  assert.equal(await mobile.locator('.cc-execution-head kbd:visible').count(), 0, '移动端不应显示键盘提示')
  await mobile.screenshot({ path:path.join(outputDir, 'mobile-expanded.png'), fullPage:true })
  assert.deepEqual(mobileErrors, [])

  console.log(JSON.stringify({ pass:true, schema:'ccm-cc-execution-display-render-regression-v1', baseUrl, screenshots:(await fs.readdir(outputDir)).sort().map(name => path.join(outputDir, name)), checks:{ desktopCollapsed:true, desktopExpanded:true, ctrlO:true, mobileResponsive:true, noSensitiveText:true } }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
