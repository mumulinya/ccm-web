import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'execution-stage-preview')
const outputFile = path.join(outputDir, 'testagent-rework-flow.png')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port:Number(process.env.CCM_STAGE_PREVIEW_PORT || 3096) })
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
  await fs.mkdir(outputDir, { recursive:true })
  browser = await launchBrowser()
  const page = await browser.newPage({ viewport:{ width:1180, height:980 }, deviceScaleFactor:1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseUrl}/visual-regression/execution-stage-preview-fixture.html`, { waitUntil:'networkidle' })
  assert.equal(await page.getByText('了解情况', { exact:true }).count(), 0, '默认必须收起阶段详情')
  await page.locator('.cc-execution-head').click()
  for (const label of ['了解情况', '实施处理', '验证与交付']) {
    assert.equal(await page.getByText(label, { exact:true }).isVisible(), true, `缺少阶段：${label}`)
  }
  assert.equal(await page.getByText('协调与分派', { exact:true }).count(), 0, '没有真实事件的阶段不得渲染')
  assert.equal(await page.getByText('总耗时 4 分 32 秒', { exact:true }).isVisible(), true)
  assert.equal(await page.getByText('List directory', { exact:true }).count(), 0, '已完成的准备阶段默认必须收起')
  const projectStage = page.locator('.cc-execution-stage-head').filter({ hasText:'实施处理' })
  await projectStage.click()
  for (const project of ['smart-live-Cloud', 'smart-live-app', 'smart-live-ui']) {
    assert.equal(await page.locator('.cc-child-agent-card').filter({ hasText:project }).first().isVisible(), true, `缺少项目执行记录：${project}`)
  }
  await projectStage.click()
  assert.equal(await page.locator('.cc-child-agent-card').filter({ hasText:'smart-live-Cloud' }).count(), 0, '项目阶段必须可以独立收起')
  const testStage = page.locator('.cc-execution-stage-head').filter({ hasText:'验证与交付' })
  await testStage.click()
  const testRow = page.locator('.cc-child-agent-card').filter({ hasText:'TestAgent' }).first()
  await testRow.locator('.cc-child-agent-head').click()
  assert.equal(await page.getByText('历史执行', { exact:true }).count(), 0, '同一任务attempt内的TestAgent复验不能冒充任务历史执行')
  assert.equal((await page.locator('body').innerText()).includes('第1轮独立验收'), false, '不得展示测试原始正文')
  const dimensions = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }))
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, '预览存在横向溢出')
  assert.deepEqual(errors, [])
  await page.screenshot({ path:outputFile, fullPage:true })
  console.log(JSON.stringify({ pass:true, schema:'ccm-execution-stage-preview-v1', screenshot:outputFile }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
