import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'group-coordination-render')
const port = Number(process.env.CCM_GROUP_COORDINATION_RENDER_PORT || 5193)
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
  const page = await browser.newPage({ viewport:{ width:1180, height:900 }, deviceScaleFactor:1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/visual-regression/group-coordination-fixture.html`, { waitUntil:'networkidle' })
  const task = page.locator('#task-case')
  const ordinary = page.locator('#ordinary-case')
  if (!(await task.getByText(/后端成员.*已在独立会话并行处理/).first().isVisible())) throw new Error('独立并行会话进度不可见')
  if (!(await task.getByText(/主 Agent 正在安全合并.*后端成员.*代码/).first().isVisible())) throw new Error('主 Agent 安全合并进度不可见')
  if (!(await task.getByText(/后端成员已完成协作工作项并通过主 Agent 验收/).first().isVisible())) throw new Error('验收后恢复摘要不可见')
  if (await ordinary.locator('.agent-qa-bubble').count()) throw new Error('普通问话不应展示协调工作项')
  const details = task.locator('details')
  if (await details.evaluateAll(rows => rows.some(row => row.open))) throw new Error('技术详情默认必须折叠')
  const visibleText = await task.innerText()
  if (/gcr_technical_only|task_dependency_technical_only|CCM_AGENT_RECEIPT|session_id/.test(visibleText)) throw new Error('内部协议或 ID 泄露到用户可见文本')
  const boxes = await task.locator('.agent-qa-bubble').evaluateAll(elements => elements.map(el => { const r=el.getBoundingClientRect(); return { left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth } }))
  if (boxes.some(box => box.left < 0 || box.right > 1180 || box.width <= 0 || box.scrollWidth > box.clientWidth + 1)) throw new Error(`桌面布局溢出：${JSON.stringify(boxes)}`)
  await page.locator('.fixture').screenshot({ path:path.join(outputDir,'desktop-group-coordination.png') })
  await details.first().locator('summary').click()
  if (!(await task.getByText('gcr_technical_only').first().isVisible())) throw new Error('展开技术详情后应能查看协调请求 ID')

  await page.setViewportSize({ width:390, height:844 })
  await page.reload({ waitUntil:'networkidle' })
  const mobileTask = page.locator('#task-case')
  const mobileBoxes = await mobileTask.locator('.agent-qa-bubble').evaluateAll(elements => elements.map(el => { const r=el.getBoundingClientRect(); return { left:r.left,right:r.right,width:r.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth } }))
  if (mobileBoxes.some(box => box.left < 0 || box.right > 390 || box.width <= 0 || box.scrollWidth > box.clientWidth + 1)) throw new Error(`移动端布局溢出：${JSON.stringify(mobileBoxes)}`)
  if (await mobileTask.locator('details').evaluateAll(rows => rows.some(row => row.open))) throw new Error('移动端技术详情默认必须折叠')
  if (errors.length) throw new Error(`浏览器错误：${errors.join('; ')}`)
  await page.locator('.fixture').screenshot({ path:path.join(outputDir,'mobile-group-coordination.png') })
  const report = { pass:true, ordinary_conversation_hidden:true, parallel_session_visible:true, safe_merge_visible:true, technical_default_collapsed:true, internal_protocol_hidden:true, desktop:boxes, mobile:mobileBoxes, screenshots:['desktop-group-coordination.png','mobile-group-coordination.png'] }
  await fs.writeFile(path.join(outputDir,'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ pass:true, outputDir, screenshots:2 }, null, 2))
} finally {
  if (browser) await browser.close()
  await server.close()
}
