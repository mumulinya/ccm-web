import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = process.env.CCM_BASE_URL || 'http://127.0.0.1:3080'
const outputDir = path.join(root, 'docs', 'main-agent-workchain', 'performance', 'page-loading-performance-optimization-2026-07-21', 'evidence')
fs.mkdirSync(outputDir, { recursive: true })

const originalWindow = globalThis.window
const originalFetch = globalThis.fetch
let remoteEngineWakeCount = 0
globalThis.window = {}
globalThis.fetch = async () => ({ json: async () => ({ command: { id: 'lazy-engine-test', type: 'play', keyword: 'test song' } }) })
const { startMusicRemoteCommandPoller } = await import('../frontend/src/composables/useMusicRemotePlayback.js')
const stopRemotePoller = startMusicRemoteCommandPoller({
  intervalMs: 60_000,
  onEngineRequired: () => { remoteEngineWakeCount++ },
})
await new Promise(resolve => setTimeout(resolve, 30))
stopRemotePoller()
globalThis.fetch = originalFetch
if (originalWindow === undefined) delete globalThis.window
else globalThis.window = originalWindow
assert.equal(remoteEngineWakeCount, 1)

const html = await fetch(baseUrl).then(response => response.text())
assert.match(html, /class="ccm-boot"/)
assert.match(html, /正在打开工作台/)

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })

const bootPage = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await bootPage.route('**/assets/*.js', route => route.abort())
await bootPage.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await bootPage.locator('.ccm-boot').waitFor({ state: 'visible' })
await bootPage.screenshot({ path: path.join(outputDir, '01-static-startup-state.png') })
await bootPage.close()

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const requests = []
const pageErrors = []
page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }))
page.on('pageerror', error => pageErrors.push(error.message))
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.getByRole('heading', { name: '今天的工作，一处看清' }).waitFor({ state: 'visible', timeout: 20_000 })
await page.waitForTimeout(2_000)

const requestPaths = () => requests.map(item => {
  try { return new URL(item.url).pathname } catch { return item.url }
})
const initialPaths = requestPaths()
const initialMusicAssets = initialPaths.filter(value => /\/assets\/MusicPlayer-[^/]+\.(?:js|css)$/.test(value))
const initialMusicData = initialPaths.filter(value => /^\/api\/music\/(?:list|config|weather|download-jobs|memory)$/.test(value))
const initialWorkbenchReads = initialPaths.filter(value => value === '/api/usability/workbench')
const initialWorkbenchStreams = initialPaths.filter(value => value === '/api/usability/workbench/stream')
assert.deepEqual(initialMusicAssets, [])
assert.deepEqual(initialMusicData, [])
assert.equal(initialWorkbenchReads.length, 0)
assert.equal(initialWorkbenchStreams.length, 1)
const initialTiming = await page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0]
  return {
    domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
    loadEventMs: Math.round(navigation?.loadEventEnd || 0),
    transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0),
  }
})
await page.screenshot({ path: path.join(outputDir, '02-workbench-ready.png') })

const memoryNav = page.locator('.nav-item').filter({ hasText: '记忆控制中心' })
assert.equal(await memoryNav.count(), 1)
await memoryNav.hover()
await page.waitForTimeout(400)
const memoryPrefetched = requestPaths().some(value => /\/assets\/MemoryCenter-[^/]+\.js$/.test(value))
assert.equal(memoryPrefetched, true)

const musicNav = page.locator('.nav-item').filter({ hasText: '音乐播放' })
assert.equal(await musicNav.count(), 1)
await musicNav.click()
await page.locator('.aura-player').waitFor({ state: 'visible', timeout: 20_000 })
await page.waitForTimeout(500)
const afterMusicPaths = requestPaths()
assert.equal(afterMusicPaths.some(value => /\/assets\/MusicPlayer-[^/]+\.js$/.test(value)), true)
assert.equal(afterMusicPaths.some(value => value === '/api/music/list'), true)
await page.screenshot({ path: path.join(outputDir, '03-music-loaded-on-demand.png') })

const dashboardNav = page.locator('.nav-item').filter({ hasText: '我的工作台' })
assert.equal(await dashboardNav.count(), 1)
await dashboardNav.click()
await page.getByRole('heading', { name: '今天的工作，一处看清' }).waitFor({ state: 'visible' })
assert.equal(await page.locator('.aura-player').count(), 1)
assert.equal(await page.locator('.aura-player').isVisible(), false)
const musicEngineRetained = await page.evaluate(() => typeof window.__cc_global_play_music === 'function')
assert.equal(musicEngineRetained, true)

const afterMusicTiming = await page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0]
  return {
    domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd || 0),
    loadEventMs: Math.round(navigation?.loadEventEnd || 0),
    transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + Number(entry.transferSize || 0), 0),
  }
})
const report = {
  pass: true,
  initial: {
    requestCount: initialPaths.length,
    musicAssets: initialMusicAssets.length,
    musicDataRequests: initialMusicData.length,
    workbenchReads: initialWorkbenchReads.length,
    workbenchStreams: initialWorkbenchStreams.length,
    timing: initialTiming,
  },
  memoryPrefetched,
  musicLoadedOnDemand: true,
  musicEngineRetained,
  remoteCommandWakesLazyEngine: remoteEngineWakeCount === 1,
  afterMusicTiming,
  pageErrors,
}
assert.deepEqual(pageErrors, [])
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log(JSON.stringify(report, null, 2))
