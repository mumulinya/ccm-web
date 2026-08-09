import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'slash-command-result-v2-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_COMMAND_RESULT_PORT || 3096) })
let browser

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw firstError
  }
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }))
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${label} 存在横向溢出：${JSON.stringify(dimensions)}`)
}

try {
  await fs.rm(outputDir, { recursive:true, force:true })
  await fs.mkdir(outputDir, { recursive:true })
  browser = await launchBrowser()
  for (const [label, viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor:1 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${baseUrl}/visual-regression/command-result-v2-fixture.html`, { waitUntil:'networkidle' })
    assert.equal(await page.getByText('当前作用域有 10 个已授权 MCP 服务，9 个已连接。', { exact:true }).isVisible(), true)
    assert.equal(await page.getByText('未生效的授权', { exact:true }).isVisible(), true)
    assert.equal(await page.getByText('技术详情', { exact:true }).first().isVisible(), true)
    assert.equal(await page.getByText('fixture-mcp-9', { exact:true }).count(), 0, '默认只应展示前 8 条')
    await page.getByText('展开全部明细', { exact:true }).click()
    assert.equal(await page.getByText('fixture-mcp-9', { exact:true }).isVisible(), true)
    await page.getByText('技术详情', { exact:true }).first().click()
    assert.equal((await page.locator('pre').first().innerText()).includes('ccm-command-technical-details-v1'), true)
    await page.getByText('打开工具配置', { exact:true }).click()
    assert.equal(await page.getByText('已请求打开：tools', { exact:true }).isVisible(), true)
    assert.equal((await page.locator('body').innerText()).includes('查看原始结果'), false)
    await assertNoOverflow(page, label)
    await page.screenshot({ path:path.join(outputDir, `${label}.png`), fullPage:true })
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.log(JSON.stringify({ success:true, schema:'ccm-command-result-v2-render-regression', screenshots:(await fs.readdir(outputDir)).sort() }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
