import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'internal-mcp-render')
const port = Number(process.env.CCM_INTERNAL_MCP_RENDER_PORT || 5194)
const require = createRequire(import.meta.url)

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

await fs.rm(outputDir, { recursive:true, force:true })
await fs.mkdir(outputDir, { recursive:true })
const viteEntry = require.resolve('vite', { paths:[frontendDir] })
const { createServer } = await import(pathToFileURL(viteEntry).href)
const server = await createServer({ root:frontendDir, server:{ host:'127.0.0.1', port, strictPort:true }, logLevel:'error' })
let browser
try {
  await server.listen()
  browser = await launchBrowser()
  const page = await browser.newPage({ viewport:{ width:1180, height:940 }, deviceScaleFactor:1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/visual-regression/internal-mcp-catalog-fixture.html`, { waitUntil:'networkidle' })
  const catalog = page.locator('.internal-mcp-catalog')
  for (const name of ['群聊 Agent 协调器', '飞书协作 MCP', '任务运行 MCP', '知识上下文 MCP', 'TestAgent 验收 MCP', '交付工作区 MCP', '任务证据 MCP']) {
    if (!(await catalog.getByText(name, { exact:true }).isVisible())) throw new Error(`${name} 不可见`)
  }
  if ((await catalog.getByText('系统保护', { exact:true }).count()) !== 7) throw new Error('内部 MCP 保护标识缺失')
  if ((await catalog.locator('.tool-row').count()) !== 33) throw new Error('内部 MCP 工具列表不完整')
  if (await catalog.getByRole('button', { name:/删除|编辑|停用/ }).count()) throw new Error('内部 MCP 不应提供编辑、停用或删除操作')
  if (!(await catalog.getByRole('button', { name:'前往系统设置' }).isVisible())) throw new Error('飞书配置入口不可见')
  const details = catalog.locator('details')
  if (await details.evaluateAll(rows => rows.some(row => row.open))) throw new Error('技术详情默认必须折叠')
  if ((await catalog.innerText()).includes('C:/technical/internal')) throw new Error('技术路径不应默认展示')
  const boxes = await catalog.locator('.mcp-item').evaluateAll(elements => elements.map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth} }))
  if (boxes.some(box => box.left < 0 || box.right > 1180 || box.width <= 0 || box.scrollWidth > box.clientWidth + 1)) throw new Error(`桌面布局溢出：${JSON.stringify(boxes)}`)
  await page.locator('.fixture').screenshot({ path:path.join(outputDir,'desktop-internal-mcp.png') })
  await catalog.getByRole('button', { name:'前往系统设置' }).click()
  if ((await page.locator('#configure-output').innerText()).trim() !== 'settings-opened') throw new Error('系统设置导航事件未触发')
  await details.first().locator('summary').click()
  if (!(await catalog.getByText('ccm__group_coordinator', { exact:true }).isVisible())) throw new Error('技术详情展开后内部标识不可见')

  await page.setViewportSize({ width:390, height:844 })
  await page.reload({ waitUntil:'networkidle' })
  const mobileCatalog = page.locator('.internal-mcp-catalog')
  const mobileBoxes = await mobileCatalog.locator('.mcp-item').evaluateAll(elements => elements.map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth} }))
  if (mobileBoxes.some(box => box.left < 0 || box.right > 390 || box.width <= 0 || box.scrollWidth > box.clientWidth + 1)) throw new Error(`移动端布局溢出：${JSON.stringify(mobileBoxes)}`)
  if (await mobileCatalog.locator('details').evaluateAll(rows => rows.some(row => row.open))) throw new Error('移动端技术详情默认必须折叠')
  if (errors.length) throw new Error(`浏览器错误：${errors.join('; ')}`)
  await page.locator('.fixture').screenshot({ path:path.join(outputDir,'mobile-internal-mcp.png') })
  const report = { pass:true, internal_services_visible:7, protected_read_only:true, tools_visible:33, technical_default_collapsed:true, settings_navigation:true, desktop:boxes, mobile:mobileBoxes, screenshots:['desktop-internal-mcp.png','mobile-internal-mcp.png'] }
  await fs.writeFile(path.join(outputDir,'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ pass:true, outputDir, screenshots:2 }, null, 2))
} finally {
  if (browser) await browser.close()
  await server.close()
}
