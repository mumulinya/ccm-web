import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_MUSIC_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(process.cwd(), 'docs', 'main-agent-workchain', 'operations-and-integrations', 'music', 'evidence', 'production-workflow')
const fakeTracks = [
  { id: 1, filename: 'Regression Artist - Stable Song.wav', title: 'Stable Song', artist: 'Regression Artist', duration: '3:18', pic: '' },
  { id: 2, filename: 'Regression Artist - Second Song.wav', title: 'Second Song', artist: 'Regression Artist', duration: '2:48', pic: '' },
]
let chatRequests = 0

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw error
  }
}

async function installRoutes(page) {
  await page.addInitScript(() => {
    const mediaPlaying = new WeakMap()
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return mediaPlaying.get(this) !== true },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value() { mediaPlaying.set(this, true); this.dispatchEvent(new Event('play')); return Promise.resolve() },
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value() { mediaPlaying.set(this, false); this.dispatchEvent(new Event('pause')) },
    })
  })
  let state = { version: 1, favorites: [], playlists: [], queue: [], updatedAt: new Date().toISOString() }
  await page.route('**/api/music/list', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, tracks: fakeTracks }) }))
  await page.route('**/api/music/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, config: { enabled: false, hasKey: false, model: '', sourceLabel: '系统设置 / 统一大模型配置' } }) }))
  await page.route('**/api/music/library-state**', async route => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const body = route.request().postDataJSON?.() || {}
    if (url.pathname.endsWith('/favorite') && method === 'POST') state.favorites = body.favorite ? [body.filename] : []
    else if (url.pathname.endsWith('/queue') && method === 'PUT') state.queue = body.tracks || []
    else if (url.pathname.endsWith('/playlists') && method === 'POST') state.playlists.push({ id: `visual-list-${state.playlists.length + 1}`, name: body.name, tracks: [], createdAt: state.updatedAt, updatedAt: state.updatedAt })
    else if (url.pathname.includes('/playlists/') && method === 'PUT') {
      const id = decodeURIComponent(url.pathname.split('/').pop())
      state.playlists = state.playlists.map(item => item.id === id ? { ...item, ...body, updatedAt: new Date().toISOString() } : item)
    } else if (url.pathname.includes('/playlists/') && method === 'DELETE') {
      const id = decodeURIComponent(url.pathname.split('/').pop())
      state.playlists = state.playlists.filter(item => item.id !== id)
    }
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
  if (mobile) {
    await page.locator('.bottom-item').filter({ hasText: '更多' }).click()
    await page.locator('.mobile-more-grid button').filter({ hasText: '音乐播放' }).click()
  } else {
    await page.locator('.nav-item').filter({ hasText: '音乐播放' }).click()
  }
  await page.locator('.aura-player').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('.queue-item').first().waitFor({ state: 'visible' })
}

async function assertLayout(page, label) {
  const result = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth }))
  if (result.scroll > result.client + 1 || result.bodyScroll > result.client + 1) throw new Error(`${label} horizontal overflow: ${JSON.stringify(result)}`)
  const overlaps = await page.evaluate(() => {
    const visible = [...document.querySelectorAll('button,input,select')].filter(el => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return false
      const points = [
        [r.left + (r.width / 2), r.top + (r.height / 2)],
        [r.left + Math.min(5, r.width / 2), r.top + Math.min(5, r.height / 2)],
        [r.right - Math.min(5, r.width / 2), r.bottom - Math.min(5, r.height / 2)],
      ]
      return points.some(([x, y]) => {
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false
        const hit = document.elementFromPoint(x, y)
        return hit === el || el.contains(hit)
      })
    })
    const pairs = []
    visible.forEach((a, i) => visible.slice(i + 1).forEach(b => { const x = a.getBoundingClientRect(), y = b.getBoundingClientRect(); if (x.left < y.right - 2 && x.right > y.left + 2 && x.top < y.bottom - 2 && x.bottom > y.top + 2 && !a.contains(b) && !b.contains(a)) pairs.push(`${a.outerHTML.slice(0,120)} ${JSON.stringify({x:x.x,y:x.y,w:x.width,h:x.height})} <> ${b.outerHTML.slice(0,120)} ${JSON.stringify({x:y.x,y:y.y,w:y.width,h:y.height})}`) }))
    return pairs.slice(0, 10)
  })
  if (overlaps.length) throw new Error(`${label} has overlapping interactive controls: ${overlaps.join('; ')}`)
}

async function queueButtonScrollSnapshot(page) {
  return page.evaluate(() => {
    const button = document.querySelector('.mega-btn.queue')
    const ancestors = []
    let current = button?.parentElement || null
    while (current) {
      if (current.scrollHeight > current.clientHeight || current.scrollWidth > current.clientWidth) {
        ancestors.push({ className: String(current.className || ''), top: current.scrollTop, left: current.scrollLeft })
      }
      current = current.parentElement
    }
    return { pageTop: document.scrollingElement?.scrollTop || 0, pageLeft: document.scrollingElement?.scrollLeft || 0, ancestors }
  })
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
  if (await desktop.locator('.music-workspace-nav').count()) throw new Error('duplicate music workspace navigation should be removed')
  await desktop.locator('.header-now-playing').waitFor()
  const spaceScrollBefore = await desktop.evaluate(() => document.scrollingElement?.scrollTop || 0)
  await desktop.keyboard.press('Space')
  await desktop.locator('.mega-play-btn[title="暂停"]').waitFor()
  await desktop.keyboard.press('Space')
  await desktop.locator('.mega-play-btn[title="播放"]').waitFor()
  const spaceScrollAfter = await desktop.evaluate(() => document.scrollingElement?.scrollTop || 0)
  if (spaceScrollAfter !== spaceScrollBefore) throw new Error('space playback shortcut scrolled the page')
  await desktop.locator('.queue-filter-input').focus()
  await desktop.keyboard.press('Space')
  if (await desktop.locator('.mega-play-btn').getAttribute('title') !== '播放') throw new Error('space inside an input should not toggle playback')
  await desktop.locator('.queue-filter-input').fill('')
  const visualVars = await desktop.locator('.aura-player').evaluate(element => ({
    primary: element.style.getPropertyValue('--cover-primary'),
    accent: element.style.getPropertyValue('--cover-accent'),
    secondary: element.style.getPropertyValue('--cover-secondary'),
  }))
  if (!visualVars.primary || !visualVars.accent || !visualVars.secondary) throw new Error(`cover-driven palette variables are missing: ${JSON.stringify(visualVars)}`)
  await desktop.locator('.album-art-image').last().waitFor()
  await desktop.locator('.album-art-image').last().evaluate(image => image.decode?.().catch(() => undefined))
  await desktop.locator('.immersive-toggle').click()
  await desktop.locator('.aura-player.is-immersive').waitFor()
  await desktop.waitForTimeout(900)
  const immersiveBounds = await desktop.locator('.aura-player.is-immersive').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }
  })
  if (immersiveBounds.x !== 0 || immersiveBounds.y !== 0 || Math.abs(immersiveBounds.width - immersiveBounds.viewportWidth) > 1 || Math.abs(immersiveBounds.height - immersiveBounds.viewportHeight) > 1) {
    throw new Error(`immersive mode does not fill the viewport: ${JSON.stringify(immersiveBounds)}`)
  }
  if (await desktop.locator('.local-library-card').isVisible()) throw new Error('immersive mode should hide the library')
  await desktop.screenshot({ path: path.join(outputDir, '05-music-immersive-desktop.png'), fullPage: false })
  await desktop.locator('.immersive-toggle').click()
  await desktop.locator('.aura-player.is-immersive').waitFor({ state: 'detached' })
  const queueScrollBefore = await queueButtonScrollSnapshot(desktop)
  await desktop.locator('.mega-btn.queue').click()
  await desktop.locator('.library-tabs button').filter({ hasText: '播放队列' }).evaluate(element => {
    if (!element.classList.contains('active')) throw new Error('bottom queue shortcut did not activate the queue view')
  })
  const queueScrollAfter = await queueButtonScrollSnapshot(desktop)
  if (JSON.stringify(queueScrollAfter) !== JSON.stringify(queueScrollBefore)) {
    throw new Error(`bottom queue shortcut changed workspace scroll: ${JSON.stringify({ before: queueScrollBefore, after: queueScrollAfter })}`)
  }
  await desktop.locator('.library-tabs button').filter({ hasText: '全部' }).click()
  if (await desktop.locator('.chat-console-card').count()) throw new Error('music assistant drawer should be closed by default')
  await desktop.locator('.assistant-dock-toggle').click()
  await desktop.locator('.chat-console-card').waitFor()
  await desktop.locator('.assistant-dock-toggle').click()
  await desktop.locator('.chat-console-card').waitFor({ state: 'detached' })
  await desktop.locator('.qi-like-btn').first().click()
  await desktop.waitForFunction(() => document.querySelector('.qi-like-btn')?.classList.contains('liked'), null, { timeout: 5000 })
  await desktop.locator('.playlist-directory-button').click()
  await desktop.locator('.playlist-create-row input').fill('通勤歌单')
  await desktop.locator('.playlist-create-row button').click()
  await desktop.locator('.playlist-dialog-item').filter({ hasText: '通勤歌单' }).waitFor()
  await desktop.locator('.playlist-icon-button').click()
  await desktop.locator('.queue-item').filter({ hasText: 'Stable Song' }).locator('button[title="添加到歌单"]').click()
  await desktop.locator('.playlist-dialog-item').filter({ hasText: '通勤歌单' }).locator('.playlist-dialog-main').click()
  await desktop.locator('.queue-item').filter({ hasText: 'Second Song' }).locator('button[title="添加到歌单"]').click()
  await desktop.locator('.playlist-dialog-item').filter({ hasText: '通勤歌单' }).locator('.playlist-dialog-main').click()
  await desktop.locator('.saved-playlist-tabs button').filter({ hasText: '通勤歌单' }).click()
  await desktop.locator('.active-playlist-context').filter({ hasText: '2 首歌曲' }).waitFor()
  await desktop.locator('.queue-item').filter({ hasText: 'Stable Song' }).locator('button[title="下移"]').click()
  await desktop.waitForFunction(() => document.querySelector('.queue-item .qi-title')?.textContent?.includes('Second Song'), null, { timeout: 5000 })
  await desktop.locator('.active-playlist-context button[title="重命名歌单"]').click()
  await desktop.locator('.playlist-rename-row input').fill('晚间通勤')
  await desktop.locator('.playlist-rename-row button').filter({ hasText: '保存' }).click()
  await desktop.locator('.playlist-dialog-item').filter({ hasText: '晚间通勤' }).waitFor()
  await desktop.locator('.playlist-icon-button').click()
  await assertLayout(desktop, 'desktop')
  await desktop.locator('.download-center-button').click()
  await desktop.locator('.download-center').waitFor()
  await desktop.screenshot({ path: path.join(outputDir, '01-music-desktop.png'), fullPage: false })
  await desktop.locator('.download-center .icon-button').click()
  await desktop.locator('.assistant-dock-toggle').click()
  await desktop.locator('.chat-console-card').waitFor()
  await desktop.locator('.aura-command-input').fill('帮我找一首安静的歌')
  await desktop.locator('.aura-send-btn-micro').click()
  await desktop.locator('.tracks-card-box').waitFor()
  const addResultButton = desktop.locator('.tracks-card-box .aura-add-btn').first()
  if (await addResultButton.isDisabled()) throw new Error('signed search result should be actionable')
  await desktop.locator('.settings-btn-icon[title="重试上一条"]').click()
  await desktop.waitForTimeout(250)
  if (chatRequests < 2) throw new Error('retry did not resend the last user message')
  if (await desktop.evaluate(() => window.scrollX) !== 0) throw new Error('opening the music assistant drawer must not shift the page horizontally')
  await desktop.screenshot({ path: path.join(outputDir, '02-music-assistant-desktop.png'), fullPage: false })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => errors.push(error.message))
  await openMusic(mobile, true)
  const collapsedPlayer = await mobile.locator('.bottom-mega-player').evaluate(element => ({ position: getComputedStyle(element).position, height: element.getBoundingClientRect().height, bottom: window.innerHeight - element.getBoundingClientRect().bottom }))
  if (collapsedPlayer.position !== 'fixed' || collapsedPlayer.height > 70 || collapsedPlayer.bottom < 56) throw new Error(`mobile mini player is not fixed above navigation: ${JSON.stringify(collapsedPlayer)}`)
  await mobile.locator('.mobile-player-toggle').click()
  await mobile.locator('.bottom-mega-player.expanded').waitFor()
  const expandedPlayer = await mobile.locator('.bottom-mega-player').evaluate(element => ({ height: element.getBoundingClientRect().height, volumeVisible: getComputedStyle(element.querySelector('.mega-volume-wrap')).display !== 'none' }))
  if (expandedPlayer.height < 100 || !expandedPlayer.volumeVisible) throw new Error(`expanded mobile player is incomplete: ${JSON.stringify(expandedPlayer)}`)
  await mobile.screenshot({ path: path.join(outputDir, '06-music-mobile-player-expanded.png'), fullPage: false })
  await mobile.locator('.mobile-player-toggle').click()
  await mobile.locator('.bottom-mega-player.expanded').waitFor({ state: 'detached' })
  await mobile.locator('.assistant-dock-toggle').click()
  await mobile.locator('.chat-console-card').waitFor()
  await mobile.locator('.assistant-dock-toggle').click()
  await mobile.locator('.chat-console-card').waitFor({ state: 'detached' })
  await assertLayout(mobile, 'mobile')
  await mobile.locator('.playlist-directory-button').click()
  await mobile.locator('.playlist-create-row input').fill('移动歌单')
  await mobile.locator('.playlist-create-row button').click()
  await mobile.locator('.playlist-dialog-item').filter({ hasText: '移动歌单' }).waitFor()
  await mobile.screenshot({ path: path.join(outputDir, '03-music-mobile-playlist.png'), fullPage: false })
  await mobile.locator('.playlist-icon-button').click()
  await mobile.locator('.download-center-button').click()
  await mobile.locator('.download-center').waitFor()
  await mobile.screenshot({ path: path.join(outputDir, '04-music-mobile.png'), fullPage: false })

  if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`)
  console.log(JSON.stringify({ pass: true, chatRequests, screenshots: ['01-music-desktop.png', '02-music-assistant-desktop.png', '03-music-mobile-playlist.png', '04-music-mobile.png', '05-music-immersive-desktop.png', '06-music-mobile-player-expanded.png'].map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally { if (browser) await browser.close() }
