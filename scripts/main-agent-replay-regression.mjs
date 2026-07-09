import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'replay-regression')
const port = Number(process.env.CCM_REPLAY_REGRESSION_PORT || 5175)
const baseUrl = `http://127.0.0.1:${port}`
const fixtureUrl = `${baseUrl}/visual-regression/main-agent-replay-fixture.html`
const require = createRequire(import.meta.url)

async function startViteServer() {
  const viteEntry = require.resolve('vite', { paths: [frontendDir] })
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  const server = await createServer({
    root: frontendDir,
    server: { host: '127.0.0.1', port, strictPort: true },
    logLevel: 'error',
  })
  await server.listen()
  return server
}

async function launchBrowser() {
  try {
    return await chromium.launch()
  } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try {
        return await chromium.launch({ channel })
      } catch {}
    }
    throw firstError
  }
}

async function expectVisible(locator, label) {
  if (!(await locator.isVisible())) throw new Error(`${label} should be visible`)
}

async function expectHidden(locator, label) {
  if (await locator.isVisible()) throw new Error(`${label} should be hidden`)
}

async function textDoesNotLeak(locator, patterns, label) {
  const text = await locator.innerText()
  for (const pattern of patterns) {
    if (pattern.test(text)) throw new Error(`${label} leaked internal text matching ${pattern}`)
  }
}

async function run() {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })

  let server
  let browser
  try {
    server = await startViteServer()
    browser = await launchBrowser()
    const page = await browser.newPage({ viewport: { width: 1180, height: 1100 }, deviceScaleFactor: 1 })
    const browserMessages = []
    page.on('pageerror', error => browserMessages.push(`pageerror: ${error.message}`))
    page.on('response', response => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) browserMessages.push(`response:${response.status()}: ${response.url()}`)
    })
    await page.goto(fixtureUrl, { waitUntil: 'networkidle' })
    if (browserMessages.length) throw new Error(`Browser errors:\n${browserMessages.join('\n')}`)

    const chat = page.locator('#replay-msg-replay-assistant-chat')
    await expectVisible(chat.locator('.main-agent-decision-card'), 'replayed simple conversation card')
    await expectHidden(chat.locator('.decision-plan'), 'replayed simple conversation todo plan')
    if (await chat.getByText('我准备这样处理').isVisible().catch(() => false)) throw new Error('replayed simple conversation should not show todo title')
    await textDoesNotLeak(chat, [/trace_id/i, /session_ids/i, /CCM_AGENT_RECEIPT/i, /Runtime Kernel/i], 'simple conversation')
    await chat.screenshot({ path: path.join(outputDir, '01-replay-simple-chat-no-todo.png') })

    const task = page.locator('#replay-msg-replay-task-intake')
    await expectVisible(task.locator('.decision-plan'), 'replayed task todo plan')
    await expectVisible(task.locator('.plan-focus'), 'replayed task current focus')
    await expectVisible(task.locator('.task-card-streamlined'), 'replayed task card streamlined summary')
    await expectVisible(task.getByText('工具摘要：读取/检查 2 项，协作通道 1 个，结果说明 1 条').first(), 'replayed tool summary')
    await expectHidden(task.locator('.decision-technical pre'), 'replayed raw decision json while folded')
    const taskTechnicalFolded = await task.locator('details.task-card-technical').evaluate(el => !el.open)
    if (!taskTechnicalFolded) throw new Error('replayed task technical details should be folded by default')
    await textDoesNotLeak(task, [/raw_events/i, /session_secret/i, /CCM_AGENT_RECEIPT/i], 'task visible surface')
    await task.screenshot({ path: path.join(outputDir, '02-replay-task-visible-todo.png') })

    const technical = task.locator('details.task-card-technical')
    await technical.locator('summary').click()
    await expectVisible(technical.getByText('完整记录'), 'replayed task technical full records after expand')
    await expectVisible(technical.getByText('trace-replay-task'), 'replayed task trace after expand')
    await task.screenshot({ path: path.join(outputDir, '03-replay-technical-expanded.png') })

    const child = page.locator('#replay-msg-replay-child-agent')
    const childDetails = child.locator('details.agent-work-events')
    await expectVisible(child.getByText('执行成员执行摘要'), 'replayed child agent summary')
    if (await childDetails.evaluate(el => el.open)) throw new Error('replayed child agent details should be folded by default')
    await expectHidden(child.locator('.work-events-list'), 'replayed child event list before expand')
    await textDoesNotLeak(child, [/trace_id/i, /session_secret/i, /CCM_AGENT_RECEIPT/i], 'child summary before expand')
    await childDetails.locator('summary').click()
    await expectVisible(child.locator('.work-events-list'), 'replayed child event list after expand')
    await expectVisible(child.getByText('执行成员已提交结构化结果说明，我正在汇总验收。'), 'replayed sanitized child internal output')
    await textDoesNotLeak(child, [/trace_id/i, /session_secret/i, /CCM_AGENT_RECEIPT/i], 'child expanded output')
    await child.screenshot({ path: path.join(outputDir, '04-replay-child-expanded-sanitized.png') })

    const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
    if (screenshots.length !== 4) throw new Error(`Expected 4 screenshots, got ${screenshots.length}`)
    console.log(JSON.stringify({ pass: true, fixtureUrl, screenshots: screenshots.map(name => path.join(outputDir, name)) }, null, 2))
  } catch (error) {
    console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
    process.exitCode = 1
  } finally {
    if (browser) await browser.close()
    if (server) await server.close()
  }
}

run()
