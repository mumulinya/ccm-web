import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'render-regression')
const port = Number(process.env.CCM_RENDER_REGRESSION_PORT || 5174)
const baseUrl = `http://127.0.0.1:${port}`
const fixtureUrl = `${baseUrl}/visual-regression/main-agent-display-fixture.html`

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

async function run() {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })

  let server
  let browser
  try {
    server = await startViteServer()
    browser = await launchBrowser()
    const page = await browser.newPage({ viewport: { width: 1180, height: 980 }, deviceScaleFactor: 1 })
    const browserMessages = []
    page.on('console', message => browserMessages.push(`${message.type()}: ${message.text()}`))
    page.on('pageerror', error => browserMessages.push(`pageerror: ${error.message}`))
    page.on('response', response => {
      if (response.status() >= 400) browserMessages.push(`response:${response.status()}: ${response.url()}`)
    })
    await page.goto(fixtureUrl, { waitUntil: 'networkidle' })
    if (browserMessages.length) {
      const serious = browserMessages.filter(item => /^pageerror:/.test(item) || /^response:4/.test(item) && !item.endsWith('/favicon.ico'))
      if (serious.length) throw new Error(`Browser errors:\n${serious.join('\n')}`)
    }

    const simple = page.locator('#case-simple-conversation')
    await expectVisible(simple.locator('.main-agent-decision-card'), 'simple conversation card')
    await expectHidden(simple.locator('.decision-plan'), 'simple conversation todo plan')
    if (await simple.getByText('我准备这样处理').isVisible().catch(() => false)) throw new Error('simple conversation should not show todo title')
    await simple.screenshot({ path: path.join(outputDir, '01-simple-conversation-no-todo.png') })

    const task = page.locator('#case-task-plan')
    await expectVisible(task.locator('.decision-plan'), 'task todo plan')
    await expectVisible(task.locator('.plan-focus'), 'task current focus')
    await expectVisible(task.getByText('工具摘要：读取/检查 2 项，协作通道 1 个'), 'task tool summary')
    await task.screenshot({ path: path.join(outputDir, '02-task-plan-visible.png') })

    const taskCard = page.locator('#case-task-card')
    await expectVisible(taskCard.locator('.task-card-streamlined'), 'task card streamlined summary')
    await expectHidden(taskCard.locator('.decision-technical pre'), 'decision raw json while technical details are folded')
    const foldedDetails = await taskCard.locator('details.task-card-technical').evaluate(el => !el.open)
    if (!foldedDetails) throw new Error('task technical details should be folded by default')
    await taskCard.screenshot({ path: path.join(outputDir, '03-technical-details-folded.png') })

    const child = page.locator('#case-child-agent')
    const childDetails = child.locator('details.agent-work-events')
    await expectVisible(child.getByText('子 Agent 执行摘要'), 'child agent summary')
    if (await childDetails.evaluate(el => el.open)) throw new Error('child agent details should be folded by default')
    await expectHidden(child.locator('.work-events-list'), 'child agent event list before expanding')
    await childDetails.locator('summary').click()
    if (!(await childDetails.evaluate(el => el.open))) throw new Error('child agent details should open after clicking summary')
    await expectVisible(child.locator('.work-events-list'), 'child agent event list after expanding')
    await expectVisible(child.getByText('Agent 已提交结构化完成信息，主 Agent 正在汇总验收。'), 'sanitized child agent internal output')
    await child.screenshot({ path: path.join(outputDir, '04-child-agent-summary-expanded.png') })

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
