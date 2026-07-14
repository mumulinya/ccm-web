import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_MUSIC_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(process.cwd(), 'docs', 'main-agent-workchain', 'operations-and-integrations', 'music', 'evidence', 'production-workflow')
const fakeTrack = { id: 1, filename: 'Regression Artist - Stable Song.wav', title: 'Stable Song', artist: 'Regression Artist', duration: '3:18', pic: '' }
let chatRequests = 0

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw error
  }
}

async function installRoutes(page) {
  let state = { version: 1, favorites: [], playlists: [], queue: [], updatedAt: new Date().toISOString() }
  await page.route('**/api/music/list', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, tracks: [fakeTrack] }) }))
  await page.route('**/api/music/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, config: { enabled: false, hasKey: false, model: '', sourceLabel: '系统设置 / 统一大模型配置' } }) }))
  await page.route('**/api/music/library-state**', async route => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const body = route.request().postDataJSON?.() || {}
    if (url.pathname.endsWith('/favorite') && method === 'POST') state.favorites = body.favorite ? [body.filename] : []
    else if (url.pathname.endsWith('/queue') && method === 'PUT') state.queue = body.tracks || []
    else if (url.pathname.endsWith('/playlists') && method === 'POST') state.playlists.push({ id: 'visual-list', name: body.name, tracks: [], createdAt: state.updatedAt, updatedAt: state.updatedAt })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, state }) })
  })
  await page.route('**/api/music/download-jobs**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, jobs: [{ id: 'job-1', source: 'netease', sourceId: '1', title: '下载中的歌曲', artist: '测试歌手', status: 'running', progress: null, phase: '正在下载并转码', attempt: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] }) }))
  await page.route('**/api/music/chat', route => { chatRequests += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, reply: '为你找到一首合适的歌。', neteaseResults: [{ type: 'netease', songId: 1, title: '真实搜索结果', artist: '测试歌手', duration: '3:18', downloadToken: 'signed.visual.token' }] }) }) })
  await page.route('**/api/music/weather**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, weather: '晴 24°C' }) }))
  await page.route('**/api/music/song-quote', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, quote: '旋律让此刻慢下来。' }) }))
  await page.route('**/api/music/song-emotion', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, emotion: '平静' }) }))
}

async function openMusic(page, mobile = false) {
  await installRoutes(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const nav = mobile ? page.locator('.bottom-item').filter({ hasText: '音乐' }) : page.locator('.nav-item').filter({ hasText: '音乐播放' })
  await nav.click()
  await page.locator('.aura-player').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.queue-item').waitFor({ state: 'visible' })
}

async function assertLayout(page, label) {
  const result = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth }))
  if (result.scroll > result.client + 1 || result.bodyScroll > result.client + 1) throw new Error(`${label} horizontal overflow: ${JSON.stringify(result)}`)
  const overlaps = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('button,input,select')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    const pairs = []
    visible.forEach((a, i) => visible.slice(i + 1).forEach(b => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); if (x.left < y.right - 2 && x.right > y.left + 2 && x.top < y.bottom - 2 && x.bottom > y.top + 2 && !a.contains(b) && !b.contains(a)) pairs.push(`${a.outerHTML.slice(0,120)} ${JSON.stringify({x:x.x,y:x.y,w:x.width,h:x.height})} <> ${b.outerHTML.slice(0,120)} ${JSON.stringify({x:y.x,y:y.y,w:y.width,h:y.height})}`) }))
    return pairs.slice(0, 10)
  })
  if (overlaps.length) throw new Error(`${label} has overlapping interactive controls: ${overlaps.join('; ')}`)
}

let browser
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  await openMusic(desktop)
  await desktop.locator('.qi-like-btn').click()
  await desktop.waitForFunction(() => document.querySelector('.qi-like-btn')?.classList.contains('liked'), null, { timeout: 5000 })
  await assertLayout(desktop, 'desktop')
  await desktop.locator('.download-center-button').click()
  await desktop.locator('.download-center').waitFor()
  await desktop.screenshot({ path: path.join(outputDir, '01-music-desktop.png'), fullPage: false })
  await desktop.locator('.download-center .icon-button').click()
  await desktop.locator('.aura-command-input').fill('帮我找一首安静的歌')
  await desktop.locator('.aura-send-btn-micro').click()
  await desktop.locator('.tracks-card-box').waitFor()
  const addResultButton = desktop.locator('.tracks-card-box .aura-add-btn').first()
  if (await addResultButton.isDisabled()) throw new Error('signed search result should be actionable')
  await desktop.locator('.settings-btn-icon[title="重试上一条"]').click()
  await desktop.waitForTimeout(250)
  if (chatRequests < 2) throw new Error('retry did not resend the last user message')
  await desktop.screenshot({ path: path.join(outputDir, '02-music-assistant-desktop.png'), fullPage: false })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => errors.push(error.message))
  await openMusic(mobile, true)
  await assertLayout(mobile, 'mobile')
  await mobile.locator('.download-center-button').click()
  await mobile.locator('.download-center').waitFor()
  await mobile.screenshot({ path: path.join(outputDir, '03-music-mobile.png'), fullPage: false })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  console.log(JSON.stringify({ pass: true, chatRequests, screenshots: ['01-music-desktop.png', '02-music-assistant-desktop.png', '03-music-mobile.png'].map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally { if (browser) await browser.close() }
