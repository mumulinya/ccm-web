import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = path.resolve(import.meta.dirname, '..')
const appHost = process.env.CCM_BASE_URL ? null : await startPlaywrightAppServer(root, { port: 3082 })
const baseUrl = String(process.env.CCM_BASE_URL || appHost.baseUrl).replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'theme-background-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const group = { id: 'group-theme', name: '智评生活开发群', members: [], active_session_id: 'gcs_theme' }
const siblingGroup = { id: 'group-theme-2', name: 'Agent 协作验证', members: [], active_session_id: 'gcs_theme_2' }

const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(`console: ${message.text()}`)
  })
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('theme-preset', 'deep-ocean')
    localStorage.setItem('app-low-perf', 'true')
  })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname
    if (!pathname.startsWith('/api/')) return route.continue()
    const acceptsEvents = String(route.request().headers().accept || '').includes('text/event-stream')
    if (acceptsEvents) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: ready\ndata: {"type":"ready"}\n\n' })
    if (pathname === '/api/auth/session') return route.fulfill(json({ success: true, authenticated: true, user: { username: 'theme-selftest', role: 'admin' }, capabilities: ['read', 'task.execute', 'project.runtime', 'project.git', 'security.manage'] }))
    if (pathname === '/api/groups') return route.fulfill(json({ success: true, groups: [group, siblingGroup] }))
    if (pathname === '/api/groups/messages') return route.fulfill(json({
      success: true,
      sessionId: 'gcs_theme',
      sessions: [{ id: 'gcs_theme', title: '主题一致性检查', message_count: 2 }],
      messages: [
        { id: 'gm_user', role: 'user', content: '检查当前页面是否跟随深海主题。', timestamp: '2026-07-23T08:00:00.000Z' },
        { id: 'gm_agent', role: 'assistant', content: '页面、面板与下拉选项均使用当前主题变量。', timestamp: '2026-07-23T08:00:05.000Z' },
      ],
      memory: { active: false },
    }))
    if (pathname === '/api/projects') return route.fulfill(json({ success: true, projects: [] }))
    if (pathname === '/api/pets/agents') return route.fulfill(json({ success: true, agents: [] }))
    if (pathname === '/api/agent-collaboration/protocol') return route.fulfill(json({ success: true, version: 'v1', summary: { open: 0 } }))
    if (pathname === '/api/runtime/events' || pathname === '/api/status/stream' || pathname === '/api/usability/workbench/stream') {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' })
    }
    if (pathname === '/api/memory-center/scopes') return route.fulfill(json({ success: true, scopes: [] }))
    if (pathname === '/api/memory-center/settings') return route.fulfill(json({ success: true, settings: {} }))
    if (pathname === '/api/model-capabilities') return route.fulfill(json({ success: true, capabilities: [] }))
    if (pathname === '/api/usability/workbench') return route.fulfill(json({ success: true, snapshot: {} }))
    if (pathname === '/api/conversation-turns') return route.fulfill(json({ success: true, turns: [] }))
    if (pathname === '/api/tasks/permission-requests') return route.fulfill(json({ success: true, requests: [] }))
    return route.fulfill(json({ success: true, items: [], data: [], settings: {}, config: {} }))
  })
}

const openTab = async (page, tab, selector) => {
  await page.goto(`${baseUrl}/?tab=${encodeURIComponent(tab)}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator(selector).waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(250)
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 920 } })
  const desktop = await desktopContext.newPage()
  await prepare(desktop)
  await openTab(desktop, 'groups', '.group-chat')

  const groupTheme = await desktop.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const select = document.querySelector('.group-select-wrap select')
    const option = select?.querySelector('option')
    const siblingOption = select?.querySelectorAll('option')?.[1]
    const wrap = document.querySelector('.group-select-wrap')
    return {
      theme: document.documentElement.dataset.theme,
      preset: document.documentElement.dataset.themePreset,
      primary: root.getPropertyValue('--bg-primary').trim(),
      surface: root.getPropertyValue('--surface').trim(),
      wrapBackground: wrap ? getComputedStyle(wrap).backgroundColor : '',
      selectColor: select ? getComputedStyle(select).color : '',
      optionBackground: option ? getComputedStyle(option).backgroundColor : '',
      optionColor: option ? getComputedStyle(option).color : '',
      siblingOptionBackground: siblingOption ? getComputedStyle(siblingOption).backgroundColor : '',
    }
  })
  assert.equal(groupTheme.theme, 'dark')
  assert.equal(groupTheme.preset, 'deep-ocean')
  assert.equal(groupTheme.primary, '#050c1e')
  assert.equal(groupTheme.surface, '#0c1a3a')
  assert.equal(groupTheme.wrapBackground, 'rgb(12, 26, 58)')
  assert.equal(groupTheme.selectColor, 'rgb(224, 242, 254)')
  assert.notEqual(groupTheme.optionBackground, 'rgb(255, 255, 255)')
  assert.equal(groupTheme.optionColor, 'rgb(224, 242, 254)')
  assert.equal(groupTheme.siblingOptionBackground, 'rgb(12, 26, 58)')
  report.checks.push({ name: 'desktop group selector and native options use the deep-ocean palette', pass: true, details: groupTheme })
  const groupComposerTheme = await desktop.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const wrapper = document.querySelector('.group-chat .chat-input-wrap')
    const textarea = document.querySelector('.group-chat .chat-composer textarea')
    return {
      control: root.getPropertyValue('--control-bg').trim(),
      surface: root.getPropertyValue('--surface').trim(),
      wrapper: wrapper ? getComputedStyle(wrapper).backgroundColor : '',
      textarea: textarea ? getComputedStyle(textarea).backgroundColor : '',
    }
  })
  assert.equal(groupComposerTheme.control, groupComposerTheme.surface)
  assert.equal(groupComposerTheme.wrapper, 'rgb(12, 26, 58)')
  assert.equal(groupComposerTheme.textarea, 'rgba(0, 0, 0, 0)')
  report.checks.push({ name: 'shared group composer follows the selected control surface', pass: true, details: groupComposerTheme })
  await capture(desktop, 'desktop-deep-ocean-group-chat')

  await openTab(desktop, 'global-agent', '.global-assistant-panel')
  const globalComposerTheme = await desktop.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const wrapper = document.querySelector('.global-assistant-panel .input-wrapper')
    const input = document.querySelector('#globalChatInput')
    return {
      control: root.getPropertyValue('--control-bg').trim(),
      surface: root.getPropertyValue('--surface').trim(),
      wrapper: wrapper ? getComputedStyle(wrapper).backgroundColor : '',
      input: input ? getComputedStyle(input).backgroundColor : '',
    }
  })
  assert.equal(globalComposerTheme.control, globalComposerTheme.surface)
  assert.equal(globalComposerTheme.wrapper, 'rgb(12, 26, 58)')
  assert.equal(globalComposerTheme.input, 'rgba(0, 0, 0, 0)')
  report.checks.push({ name: 'global Agent input surface does not retain the legacy green control color', pass: true, details: globalComposerTheme })
  await capture(desktop, 'desktop-deep-ocean-global-agent')

  await openTab(desktop, 'memory-center', '.memory-center')
  const memoryTheme = await desktop.evaluate(() => {
    const page = document.querySelector('.memory-center')
    const header = document.querySelector('.workspace-page-shell:has(.memory-center) > .workspace-page-header')
    return {
      page: page ? getComputedStyle(page).backgroundColor : '',
      header: header ? getComputedStyle(header).backgroundColor : '',
      foreground: page ? getComputedStyle(page).color : '',
    }
  })
  assert.equal(memoryTheme.page, 'rgb(5, 12, 30)')
  assert.equal(memoryTheme.header, 'rgb(12, 26, 58)')
  assert.equal(memoryTheme.foreground, 'rgb(224, 242, 254)')
  report.checks.push({ name: 'Memory Center page and header consume the selected theme', pass: true, details: memoryTheme })
  await capture(desktop, 'desktop-deep-ocean-memory-center')

  await openTab(desktop, 'settings', '.settings-page')
  await desktop.locator('.settings-nav-item').filter({ hasText: '外观与刷新' }).click()
  await desktop.locator('[data-settings-panel="experience"]').waitFor({ state: 'visible' })
  const settingsTheme = await desktop.evaluate(() => {
    const panel = document.querySelector('[data-settings-panel="experience"]')
    const preset = document.querySelector('.theme-preset')
    return {
      panel: panel ? getComputedStyle(panel).backgroundColor : '',
      preset: preset ? getComputedStyle(preset).backgroundColor : '',
      text: panel ? getComputedStyle(panel).color : '',
    }
  })
  assert.notEqual(settingsTheme.preset, 'rgb(255, 255, 255)')
  assert.notEqual(settingsTheme.text, 'rgb(15, 23, 42)')
  report.checks.push({ name: 'settings appearance controls remain themed while editing the theme', pass: true, details: settingsTheme })
  await capture(desktop, 'desktop-deep-ocean-settings')
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  await openTab(mobile, 'groups', '.group-chat')
  const mobileLayout = await mobile.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    groupWidth: document.querySelector('.group-chat')?.clientWidth || 0,
    groupScrollWidth: document.querySelector('.group-chat')?.scrollWidth || 0,
    selectWidth: document.querySelector('.group-select-wrap')?.getBoundingClientRect().width || 0,
    optionBackground: getComputedStyle(document.querySelectorAll('.group-select-wrap option')[1]).backgroundColor,
    overflowSources: Array.from(document.querySelectorAll('body *')).map(element => {
      const rect = element.getBoundingClientRect()
      return { tag: element.tagName, className: String(element.className || ''), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }
    }).filter(item => item.right > document.documentElement.clientWidth + 1 || item.left < -1).sort((a, b) => b.right - a.right).slice(0, 8),
  }))
  assert.ok(mobileLayout.scrollWidth <= mobileLayout.viewport + 1, JSON.stringify(mobileLayout))
  assert.ok(mobileLayout.groupScrollWidth <= mobileLayout.groupWidth + 1, JSON.stringify(mobileLayout))
  assert.ok(mobileLayout.selectWidth >= 180 && mobileLayout.selectWidth <= mobileLayout.viewport)
  assert.equal(mobileLayout.optionBackground, 'rgb(12, 26, 58)')
  report.checks.push({ name: 'mobile group selector keeps themed options without horizontal overflow', pass: true, details: mobileLayout })
  await capture(mobile, 'mobile-deep-ocean-group-chat')
  await mobileContext.close()

  assert.equal(report.errors.length, 0, report.errors.join('\n'))
  report.pass = true
} catch (error) {
  report.errors.push(error?.stack || String(error))
} finally {
  await browser.close()
  if (appHost) await appHost.server.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
}

if (!report.pass) {
  console.error(report.errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Theme background render regression passed: ${report.checks.length} checks`)
  report.checks.forEach((check, index) => console.log(`${index + 1}. ${check.name}`))
  report.screenshots.forEach(file => console.log(`screenshot: ${file}`))
}
