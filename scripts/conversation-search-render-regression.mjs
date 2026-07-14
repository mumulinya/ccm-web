import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_SEARCH_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(process.cwd(), 'docs', 'main-agent-workchain', 'shared-workchain', 'user-experience', 'evidence', 'conversation-search-v2')

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw error
  }
}

async function findProbe() {
  for (const query of ['的', 'Agent', '任务', '项目']) {
    const response = await fetch(`${baseUrl}api/search?q=${encodeURIComponent(query)}&source=global&page_size=1`)
    const data = await response.json()
    if (data.total > 0) return query
  }
  throw new Error('真实全局会话中没有可用于截图回归的搜索词')
}

async function openSearch(page, mobile = false) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.removeItem('ccm-conversation-search-favorites-v2'))
  const nav = mobile ? page.locator('.bottom-item').filter({ hasText: '对话' }) : page.locator('.nav-item').filter({ hasText: '对话搜索' })
  await nav.click()
  await page.locator('.conversation-search-page').waitFor({ state: 'visible' })
}

async function runSearch(page, probe) {
  await page.locator('.source-tabs button').filter({ hasText: '全局助手' }).click()
  await page.locator('.search-input-wrap input').fill(probe)
  await page.locator('.search-command-bar .primary-button').click()
  await page.locator('.search-result-row').first().waitFor({ state: 'visible', timeout: 45_000 })
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('.conversation-search-page')
    return { documentClientWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth, rootClientWidth: root?.clientWidth || 0, rootScrollWidth: root?.scrollWidth || 0 }
  })
  if (metrics.documentScrollWidth > metrics.documentClientWidth + 1 || metrics.rootScrollWidth > metrics.rootClientWidth + 1) throw new Error(`${label} horizontal overflow: ${JSON.stringify(metrics)}`)
}

let browser
try {
  const probe = await findProbe()
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await openSearch(desktop)
  await runSearch(desktop, probe)
  if (await desktop.locator('.search-result-row img, .search-result-row script').count()) throw new Error('search results must not render message HTML')
  await assertNoOverflow(desktop, 'desktop results')
  await desktop.screenshot({ path: path.join(outputDir, '01-results-desktop.png'), fullPage: false })

  await desktop.locator('.filter-button').click()
  await desktop.locator('.filter-panel').waitFor({ state: 'visible' })
  await assertNoOverflow(desktop, 'desktop filters')
  await desktop.screenshot({ path: path.join(outputDir, '02-filters-desktop.png'), fullPage: false })
  await desktop.locator('.filter-button').click()

  await desktop.locator('.search-result-row .icon-action').first().click()
  await desktop.locator('.source-tabs .favorites-tab').click()
  if (await desktop.locator('.saved-view .search-result-row').count() !== 1) throw new Error('favorite result should persist in saved view')

  await desktop.locator('.source-tabs button').filter({ hasText: '全局助手' }).click()
  await desktop.locator('.search-command-bar .primary-button').click()
  await desktop.locator('.search-result-row').first().waitFor({ state: 'visible' })
  await desktop.locator('.search-result-row .open-button').first().click()
  await desktop.locator('.global-assistant-panel').waitFor({ state: 'visible', timeout: 15_000 })
  await desktop.locator('.chat-bubble-wrapper.search-hit').waitFor({ state: 'visible', timeout: 15_000 })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await openSearch(mobile, true)
  await runSearch(mobile, probe)
  await assertNoOverflow(mobile, 'mobile results')
  await mobile.screenshot({ path: path.join(outputDir, '03-results-mobile.png'), fullPage: false })
  await mobile.locator('.filter-button').click()
  await mobile.locator('.filter-panel').waitFor({ state: 'visible' })
  await assertNoOverflow(mobile, 'mobile filters')
  await mobile.screenshot({ path: path.join(outputDir, '04-filters-mobile.png'), fullPage: false })

  const security = await browser.newPage({ viewport: { width: 900, height: 700 } })
  await security.route('**/api/search?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schema: 'ccm-conversation-search-v2', success: true, query: { query: 'unsafe', terms: ['unsafe'], match: 'all' }, page: 1, page_size: 25, total: 1, page_count: 1, has_more: false, facets: {}, results: [{ id: 'unsafe', conversationType: 'global', source: 'global', sourceLabel: '全局助手', project: '', groupId: '', groupName: '', sessionId: 'fixture', sessionName: '安全回归', messageId: 'unsafe-message', messageIndex: 0, role: 'user', agent: '', content: 'unsafe <img src=x onerror="window.__searchXss=true">', timestamp: new Date().toISOString(), taskId: '', taskTitle: '', attachments: [], context: { before: [], after: [] }, matchTerms: ['unsafe'] }] }) }))
  await openSearch(security)
  await security.locator('.search-input-wrap input').fill('unsafe')
  await security.locator('.search-command-bar .primary-button').click()
  await security.locator('.search-result-row').waitFor()
  if (await security.locator('.search-result-row img').count()) throw new Error('malicious image tag rendered')
  if (await security.evaluate(() => window.__searchXss === true)) throw new Error('stored message HTML executed')
  if (!(await security.locator('.message-preview').innerText()).includes('<img')) throw new Error('malicious HTML should remain visible as plain text')

  const errors = [...desktopErrors, ...mobileErrors]
  if (errors.length) throw new Error(`browser page errors:\n${errors.join('\n')}`)
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
  if (screenshots.length !== 4) throw new Error(`expected 4 screenshots, got ${screenshots.length}`)
  console.log(JSON.stringify({ pass: true, baseUrl, probeLength: probe.length, screenshots: screenshots.map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
