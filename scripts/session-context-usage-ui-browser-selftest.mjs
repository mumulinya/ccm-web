import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3080').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'session-context-usage-ui')
assert.ok(outputDir.startsWith(`${root}${path.sep}`))
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.route('**/api/memory-center/scope?**', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    success: true,
    summary: {
      id: 'session:context-visual-proof',
      label: '上下文分项验证会话',
      currentTokens: 158_000,
      effectiveContextWindow: 256_000,
      autoCompactThreshold: 223_000,
      tokenSource: 'provider_usage_plus_estimate',
      tokenUpdatedAt: new Date().toISOString(),
      summarySource: 'model',
      modelVisiblePayload: {
        totalTokens: 158_000,
        tokenBreakdown: {
          system: 483,
          tools: 8_900,
          rules: 5_100,
          skills: 1_500,
          mcpTools: 3_400,
          subagentDefinitions: 856,
          summary: 1_900,
          recentMessages: 135_861,
        },
      },
    },
  }),
}))

const clickExactText = async text => {
  const candidates = page.getByText(text, { exact: true })
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index)
    if (!await candidate.isVisible()) continue
    await candidate.click()
    return
  }
  assert.fail(`expected a visible ${text} navigation target`)
}

const assertBadge = async (selector, label) => {
  const badge = page.locator(`${selector}:visible`).first()
  await badge.waitFor({ state: 'visible', timeout: 15_000 })
  const elementHandle = await badge.elementHandle()
  await page.waitForFunction(element => {
    return element && /(?:\d+(?:\.\d+)?% context used|正在压缩上下文)/.test(String(element.getAttribute('aria-label') || ''))
  }, elementHandle)
  const aria = await badge.getAttribute('aria-label')
  assert.match(String(aria), /(?:\d+(?:\.\d+)?% context used|正在压缩上下文)/, `${label} badge should expose context state`)
  await badge.click()
  const tooltip = badge.locator('.context-usage-popover')
  await tooltip.waitFor({ state: 'visible' })
  const text = await tooltip.innerText()
  assert.match(text, /Tokens/i)
  assert.match(text, /自动压缩/)
  assert.match(text, /更新于/)
  assert.match(text, /(?:System prompt|Fixed context)/)
  assert.ok(await tooltip.locator('.context-meter-segment').count() > 0, `${label} should render segmented context proportions`)
  return { aria, tooltip: text }
}

const overlapMetrics = selector => page.locator(`${selector}:visible`).first().evaluate(badge => {
  const composer = badge.closest('.input-wrapper, .chat-input-wrap')
  const send = composer?.parentElement?.querySelector('.send-btn, .send-button') || composer?.querySelector('.send-btn, .send-button')
  const badgeRect = badge.getBoundingClientRect()
  const sendRect = send?.getBoundingClientRect()
  const overlapsSend = sendRect
    ? !(badgeRect.right <= sendRect.left || badgeRect.left >= sendRect.right || badgeRect.bottom <= sendRect.top || badgeRect.top >= sendRect.bottom)
    : false
  return {
    visible: getComputedStyle(badge).display !== 'none',
    overlapsSend,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.locator('.auth-page, .app-container').first().waitFor({ state: 'visible', timeout: 15_000 })
if (await page.locator('.auth-page').isVisible().catch(() => false)) {
  await page.locator('input[name="username"]').fill('mumulin')
  await page.locator('input[name="password"]').fill('lzy123167')
  await page.locator('.auth-submit').click()
}
await page.locator('.app-container').waitFor({ state: 'visible' })

await clickExactText('全局助手')
const global = await assertBadge('.input-wrapper .session-context-usage', 'global')
await page.screenshot({ path: path.join(outputDir, 'desktop-global-context.png') })

await clickExactText('群聊协作')
const group = await assertBadge('.group-chat .session-context-usage', 'group')

await clickExactText('项目管理')
const projectSession = page.locator('.project-manager .session-item:visible').first()
let project = { skipped: 'no project session fixture' }
if (await projectSession.count()) {
  await projectSession.click()
  project = { skipped: 'project route selected; detailed component is covered by the shared component proof' }
}

await page.setViewportSize({ width: 390, height: 844 })
const mobileProject = await overlapMetrics('.project-manager .session-context-usage')
assert.equal(mobileProject.visible, true)
assert.equal(mobileProject.overlapsSend, false)
assert.ok(mobileProject.horizontalOverflow <= 1)

const mobileGroupNav = page.getByRole('button', { name: '群聊协作', exact: true })
assert.equal(await mobileGroupNav.count(), 1)
await mobileGroupNav.click()
const mobileGroup = await overlapMetrics('.group-chat .session-context-usage')
assert.equal(mobileGroup.visible, true)
assert.equal(mobileGroup.overlapsSend, false)
assert.ok(mobileGroup.horizontalOverflow <= 1)

const mobileGlobalNav = page.getByRole('button', { name: '全局助手', exact: true })
assert.equal(await mobileGlobalNav.count(), 1)
await mobileGlobalNav.click()
const mobileGlobal = await overlapMetrics('.input-wrapper .session-context-usage')
assert.equal(mobileGlobal.visible, true)
assert.equal(mobileGlobal.overlapsSend, false)
assert.ok(mobileGlobal.horizontalOverflow <= 1)
const mobileGlobalBadge = page.locator('.input-wrapper .session-context-usage')
if (await mobileGlobalBadge.getAttribute('aria-expanded') !== 'true') await mobileGlobalBadge.click()
await mobileGlobalBadge.locator('.context-usage-popover').waitFor({ state: 'visible' })
const mobilePopoverBounds = await mobileGlobalBadge.locator('.context-usage-popover').evaluate(element => {
  const rect = element.getBoundingClientRect()
  return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight }
})
assert.ok(mobilePopoverBounds.left >= 0)
assert.ok(mobilePopoverBounds.right <= mobilePopoverBounds.viewportWidth)
assert.ok(mobilePopoverBounds.top >= 0)
assert.ok(mobilePopoverBounds.bottom <= mobilePopoverBounds.viewportHeight)
await page.screenshot({ path: path.join(outputDir, 'mobile-global-context.png') })

assert.deepEqual(errors, [])
await browser.close()
console.log(JSON.stringify({
  pass: true,
  scopes: { global: global.aria, group: group.aria, project: project.aria || project.skipped },
  mobile: { project: mobileProject, group: mobileGroup, global: mobileGlobal, popover: mobilePopoverBounds },
  screenshots: outputDir,
}, null, 2))
