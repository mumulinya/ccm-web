import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'requirement-source-render-regression')
const port = Number(process.env.CCM_REQUIREMENT_RENDER_PORT || 5182)
const baseUrl = `http://127.0.0.1:${port}`
const fixtureUrl = `${baseUrl}/visual-regression/requirement-source-workbench-fixture.html`
const require = createRequire(import.meta.url)

async function startViteServer() {
  const viteEntry = require.resolve('vite', { paths: [frontendDir] })
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  const server = await createServer({ root: frontendDir, server: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'error' })
  await server.listen()
  return server
}

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw error
  }
}

async function assertWorkbench(page, viewportLabel) {
  await page.goto(fixtureUrl, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.body.dataset.fixtureReady === 'true')
  const confirmation = page.locator('.confirm-card')
  await confirmation.waitFor({ state: 'visible' })
  const summary = confirmation.getByText('已读取 1 份资料，并整理为可执行需求。')
  if (!(await summary.isVisible())) throw new Error(`${viewportLabel}: source summary should be visible`)
  const details = confirmation.locator('details')
  const openBefore = await details.evaluate(element => element.open)
  if (openBefore) throw new Error(`${viewportLabel}: technical details should be collapsed by default`)
  if (await confirmation.locator('.source-technical-list').isVisible()) throw new Error(`${viewportLabel}: parser details should be hidden before expansion`)
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  if (width.scroll > width.client + 1) throw new Error(`${viewportLabel}: horizontal overflow ${width.scroll} > ${width.client}`)
  const capture = await page.evaluate(() => ({
    multipart: document.body.dataset.multipart === 'true',
    hasFilename: document.body.dataset.filename === 'true',
  }))
  return { confirmation, details, capture }
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true })
  let server
  let browser
  try {
    console.log('[render] starting Vite')
    server = await startViteServer()
    console.log('[render] launching browser')
    browser = await launchBrowser()
    console.log('[render] opening desktop context')
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 })
    const desktop = await desktopContext.newPage()
    const desktopState = await assertWorkbench(desktop, 'desktop')
    await desktopState.confirmation.screenshot({ path: path.join(outputDir, '01-workbench-upload-confirmation-desktop.png') })
    await desktopState.details.locator('summary').click()
    if (!(await desktopState.confirmation.getByText('parsed · utf8-text').isVisible())) throw new Error('desktop: parser status should be visible after expansion')
    await desktopState.confirmation.screenshot({ path: path.join(outputDir, '02-workbench-technical-details-desktop.png') })

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
    const mobile = await mobileContext.newPage()
    const mobileState = await assertWorkbench(mobile, 'mobile')
    await mobileState.confirmation.screenshot({ path: path.join(outputDir, '03-workbench-upload-confirmation-mobile.png') })

    const checks = {
      desktopMultipart: desktopState.capture.multipart === true,
      desktopFilenameSubmitted: desktopState.capture.hasFilename === true,
      mobileMultipart: mobileState.capture.multipart === true,
      screenshotsCreated: (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).length === 3,
    }
    const report = { pass: Object.values(checks).every(Boolean), checks, outputDir }
    await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
    if (!report.pass) process.exitCode = 1
  } finally {
    await browser?.close().catch(() => {})
    await server?.close().catch(() => {})
  }
}

await run()
