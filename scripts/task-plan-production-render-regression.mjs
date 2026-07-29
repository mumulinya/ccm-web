import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'task-plan-production-regression')
const port = Number(process.env.CCM_TASK_PLAN_REGRESSION_PORT || 5187)
const fixtureUrl = `http://127.0.0.1:${port}/visual-regression/task-experience-detail-fixture.html`
const require = createRequire(import.meta.url)

const startVite = async () => {
  const viteEntry = require.resolve('vite', { paths: [frontendDir] })
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  const server = await createServer({ root: frontendDir, server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' })
  await server.listen()
  return server
}
const startBrowser = async () => {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw error
  }
}
const assertVisible = async (locator, label) => {
  await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => { throw new Error(`${label} should be visible`) })
}

let vite
let browser
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  vite = await startVite()
  browser = await startBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1360, height: 980 } })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  await desktop.goto(fixtureUrl, { waitUntil: 'networkidle' })
  await desktop.getByRole('button', { name: '查看详情' }).click()
  await assertVisible(desktop.getByRole('heading', { name: '执行计划' }), 'first-level execution plan')
  await assertVisible(desktop.getByText('5/25 已完成'), 'true long plan count')
  await assertVisible(desktop.getByText('执行计划步骤 24'), 'all long-plan rows')
  await assertVisible(desktop.getByText('第 2 次：增加刷新后筛选条件保留'), 'revision history')
  const planScroll = desktop.locator('.complete-plan-steps')
  const scrollStyle = await planScroll.evaluate(element => ({ overflowY: getComputedStyle(element).overflowY, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }))
  if (!['auto', 'scroll'].includes(scrollStyle.overflowY) || scrollStyle.scrollHeight <= scrollStyle.clientHeight) throw new Error('long plan must scroll independently')
  await desktop.screenshot({ path: path.join(outputDir, '01-project-long-plan-desktop.png'), fullPage: true })

  const global = await browser.newPage({ viewport: { width: 1120, height: 820 } })
  await global.goto(`${fixtureUrl}?context=global&state=self-verification`, { waitUntil: 'networkidle' })
  await global.getByRole('button', { name: '查看详情' }).click()
  await assertVisible(global.getByText('全局任务 · 正在汇总下游验收'), 'global responsibility header')
  if (await global.getByText('全局任务 · 正在开发').isVisible()) throw new Error('global detail must not claim direct development')

  const self = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await self.goto(`${fixtureUrl}?state=self-verification`, { waitUntil: 'networkidle' })
  await self.getByRole('button', { name: '查看详情' }).click()
  await assertVisible(self.getByText('主 Agent自验', { exact: true }).first(), 'self-verification stage')
  const visibleText = await self.locator('.task-detail-drawer').innerText()
  if (/TestAgent（独立验收）/.test(visibleText)) throw new Error('disabled TestAgent must not be described as independent acceptance')
  const mobileOverflow = await self.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (mobileOverflow) throw new Error('mobile task detail has horizontal overflow')
  await self.screenshot({ path: path.join(outputDir, '02-self-verification-mobile.png'), fullPage: true })

  if (errors.length) throw new Error(`browser errors: ${errors.join('; ')}`)
  console.log(JSON.stringify({ pass: true, screenshots: await fs.readdir(outputDir) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (vite) await vite.close()
}
