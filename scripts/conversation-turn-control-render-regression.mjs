import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'conversation-turn-control-render')
const port = Number(process.env.CCM_TURN_CONTROL_RENDER_PORT || 5187)
const require = createRequire(import.meta.url)

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })
const viteEntry = require.resolve('vite', { paths: [frontendDir] })
const { createServer } = await import(pathToFileURL(viteEntry).href)
const server = await createServer({ root: frontendDir, server: { host:'127.0.0.1', port, strictPort:true }, logLevel:'error' })
let browser
try {
  await server.listen()
  browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 1180, height: 860 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/visual-regression/conversation-turn-control-fixture.html`, { waitUntil:'networkidle' })
  const busy = page.locator('#busy-case')
  const idle = page.locator('#idle-case')
  if (!(await busy.getByText('引导当前').isVisible())) throw new Error('引导当前不可见')
  if (!(await busy.getByText('排队下一条').isVisible())) throw new Error('排队下一条不可见')
  if (!(await busy.getByTitle('停止当前工作').isVisible())) throw new Error('停止按钮不可见')
  if (await idle.locator('[data-testid="conversation-turn-controls"]').count()) throw new Error('空闲普通对话不应显示会话控制条')
  const textarea = busy.locator('textarea')
  if (await textarea.isDisabled()) throw new Error('Agent 工作中输入框必须可编辑')
  await busy.getByText('排队下一条').click()
  if ((await busy.locator('#events').textContent()).split('|')[0] !== 'queue') throw new Error('排队模式未切换')
  await busy.getByTitle('停止当前工作').click()
  await busy.getByRole('button', { name:'重新排队' }).click()
  await busy.getByRole('button', { name:'取消这条消息' }).first().click()
  const events = await busy.locator('#events').textContent()
  if (events !== 'queue|1|1|1') throw new Error(`控件事件错误：${events}`)
  const boxes = await busy.locator('.turn-control-toolbar, .turn-queue, .chat-composer').evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width }
  }))
  if (boxes.some(box => box.left < 0 || box.right > 1180 || box.width <= 0)) throw new Error(`桌面布局溢出：${JSON.stringify(boxes)}`)
  await busy.screenshot({ path:path.join(outputDir,'desktop-working-queue.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil:'networkidle' })
  const mobileBusy = page.locator('#busy-case')
  const mobileBoxes = await mobileBusy.locator('.turn-control-toolbar, .turn-queue, .chat-composer').evaluateAll(elements => elements.map(el => {
    const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width }
  }))
  if (mobileBoxes.some(box => box.left < 0 || box.right > 390 || box.width <= 0)) throw new Error(`移动端布局溢出：${JSON.stringify(mobileBoxes)}`)
  if (errors.length) throw new Error(`浏览器错误：${errors.join('; ')}`)
  await mobileBusy.screenshot({ path:path.join(outputDir,'mobile-working-queue.png') })
  await fs.writeFile(path.join(outputDir,'report.json'), JSON.stringify({ pass:true, desktop:boxes, mobile:mobileBoxes, screenshots:['desktop-working-queue.png','mobile-working-queue.png'] }, null, 2))
  console.log(JSON.stringify({ pass:true, outputDir, screenshots:2 }, null, 2))
} finally {
  if (browser) await browser.close()
  await server.close()
}
