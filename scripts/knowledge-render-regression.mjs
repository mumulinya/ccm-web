import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'knowledge-render-regression')
fs.mkdirSync(outputDir, { recursive: true })

const documentsData = process.env.CCM_BASE_URL
  ? await fetch(`${baseUrl}/api/rag/documents`).then(response => response.json())
  : { success: true, documents: [], status: { state: 'ready', chunks: 1 } }
const sourceDocument = documentsData.documents?.[0] || {
  name: 'knowledge-render-fixture.md',
  title: '知识页面回归测试资料',
  chunksCount: 1,
  scope: { type: 'global', id: '' },
  visibility: 'restricted'
}

const installedBrowsers = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean)
const executablePath = installedBrowsers.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], errors: [], screenshots: [] }

const runViewport = async (name, viewport) => {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`))
  page.on('console', message => {
    const text = message.text()
    if (message.type() === 'error' && !/net::ERR_CONNECTION_CLOSED|EventSource's response has a MIME type/.test(text)) report.errors.push(`${name} console: ${text}`)
  })
  await page.route('**/api/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, projects: [], groups: [], tasks: [], sessions: [], items: [] })
  }))
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, authenticated: true, user: { username: 'knowledge-render-selftest', role: 'admin' } })
  }))
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: ''
  }))
  if (!documentsData.documents?.length) {
    await page.route('**/api/rag/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, documents: [sourceDocument], status: documentsData.status || { state: 'ready', chunks: 1 } })
    }))
  }
  await page.route('**/api/rag/chunks*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      chunks: [{ filename: sourceDocument.name, index: 0, heading: '安全保管', text: '密钥应妥善保管，并通过安全方式提供给技术实施方。' }]
    })
  }))
  await page.route('**/api/rag/chat', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        reply: `密钥应通过加密渠道交付，不要在公开群聊中发送。[source:${sourceDocument.name}#0]`,
        debugChunks: [{
          id: `${sourceDocument.name}#0`, filename: sourceDocument.name, chunkIndex: 0, heading: '安全保管',
          citation: `${sourceDocument.name}#0`, text: '密钥应妥善保管，并通过安全方式提供给技术实施方。',
          score: 3.8, keywordScore: 2.1, vectorScore: 0.8, coverage: 0.9
        }],
        citations: [`${sourceDocument.name}#0`],
        retrieval: { mode: 'hybrid', embedding: 'hashing', fallback: true, error: '', rerank: 'keyword+vector+coverage', citations: [`${sourceDocument.name}#0`] }
      })
    })
  })
  await page.goto(`${baseUrl}/?tab=knowledge`, { waitUntil: 'commit', timeout: 30_000 })
  await page.locator('body').waitFor()
  await page.locator('h1').filter({ hasText: '知识库与文档' }).waitFor()
  await page.waitForTimeout(500)

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    heading: document.querySelector('.knowledge-page h1')?.textContent?.trim(),
    openTechnicalDetails: Array.from(document.querySelectorAll('details')).filter(item => item.open && item.textContent?.includes('技术详情')).length
  }))
  assert.equal(layout.scrollWidth, layout.clientWidth, `${name} has horizontal overflow`)
  assert.equal(layout.heading, '知识库与文档')
  assert.equal(layout.openTechnicalDetails, 0, `${name} technical details should be collapsed`)
  report.checks.push({ name: `${name} layout has no overflow and technical details are collapsed`, pass: true })
  const initialScreenshot = path.join(outputDir, `${name}-initial.png`)
  await page.screenshot({ path: initialScreenshot, fullPage: true })
  report.screenshots.push(initialScreenshot)

  await page.locator('.query-box textarea').fill('第三方密钥应该如何保管？')
  await page.locator('.query-box button[type="submit"]').click()
  await page.getByText('密钥应通过加密渠道交付', { exact: false }).waitFor()
  assert.equal(await page.getByText('3.800', { exact: true }).count(), 0, `${name} ordinary answer leaked retrieval score`)
  assert.equal(await page.locator('.source-list').count(), 0, `${name} sources should be collapsed before user opens them`)
  report.checks.push({ name: `${name} ordinary answer hides scores and keeps sources collapsed`, pass: true })

  await page.locator('.source-toggle').click()
  await page.locator('.source-item').first().click()
  await page.locator('.chunks-preview-drawer').waitFor()
  await page.locator('[data-knowledge-chunk="0"]').waitFor()
  await page.waitForTimeout(350)
  const drawerBox = await page.locator('.drawer-container').boundingBox()
  assert.ok(drawerBox && drawerBox.x >= -1 && drawerBox.x + drawerBox.width <= viewport.width + 1, `${name} source drawer is outside the viewport`)
  report.checks.push({ name: `${name} citation opens the referenced document chunk`, pass: true })
  await page.locator('.btn-close-drawer').click()
  await page.locator('.chunks-preview-drawer').waitFor({ state: 'detached' })
  await page.waitForTimeout(150)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    const content = document.querySelector('.content-area')
    const knowledge = document.querySelector('.knowledge-page')
    if (content) content.scrollTop = 0
    if (knowledge) knowledge.scrollTop = 0
  })

  const screenshot = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  report.screenshots.push(screenshot)
  await context.close()
}

try {
  await runViewport('desktop-1440x1000', { width: 1440, height: 1000 })
  await runViewport('mobile-390x844', { width: 390, height: 844 })
  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  await browser.close()
  if (appHost) await appHost.server.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
