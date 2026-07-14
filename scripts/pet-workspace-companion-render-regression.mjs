import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_PET_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(process.cwd(), 'docs', 'main-agent-workchain', 'operations-and-integrations', 'pets', 'evidence', 'workspace-companion')
const atlasPath = 'C:\\Users\\admin\\.codex\\pets\\kun-chick\\spritesheet.webp'

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw error
  }
}

const agents = [
  { name: 'global-agent', displayName: '全局 Agent', petLabel: '全局 Agent', state: 'building', stateDetail: 'Codex：正在修改宠物工作台', actor: 'Codex', actorKind: 'third-party', runtime: 'codex' },
  { name: 'music-agent', displayName: '音乐 Agent', petLabel: '音乐 Agent', state: 'juggling', stateDetail: '正在播放工作歌单' },
]
const skin = { id: 'visual-v2', name: '参考图宠物', generated: true, spriteVersionNumber: 2, spritesheetPath: 'generated/visual-v2/spritesheet.webp' }
const jobs = [
  { id: 'active', name: '参考图宠物', status: 'generating', stageLabel: '正在制作完整动作', progress: 46, targetAgent: 'global-agent' },
  { id: 'failed', name: '旧任务', status: 'failed', stageLabel: '生成结果未通过校验', progress: 95, error: '观察方向盲测未通过', targetAgent: 'global-agent' },
]

async function installRoutes(page) {
  await page.route('**/api/status/stream?client=workspace', route => route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    body: `data: ${JSON.stringify({ type: 'snapshot', agents })}\n\n`,
  }))
  await page.route('**/api/pets/agents', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, agents }) }))
  await page.route('**/api/pets/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configs: { 'global-agent': { type: skin.id, enabled: true }, 'music-agent': { type: 'cloudling', enabled: true } }, positions: {}, customTypes: [skin] }) }))
  await page.route('**/api/pets/status', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ running: true }) }))
  await page.route('**/api/pets/action-strategy', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, project: { idleCycleSeconds: 60, idle: [{ order: 1, state: 'idle', seconds: 60, detail: '等待指令' }], active: [{ order: 1, state: 'building', seconds: 90, detail: '执行任务', trigger: '子 Agent 正在执行' }] } }) }))
  await page.route('**/api/pets/generation-jobs', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, jobs }) }))
  await page.route('**/pets/generated/visual-v2/spritesheet.webp', async route => route.fulfill({ status: 200, contentType: 'image/webp', body: await fs.readFile(atlasPath) }))
}

async function openPets(page, mobile = false) {
  await installRoutes(page)
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const nav = mobile ? page.locator('.bottom-item').filter({ hasText: '宠物' }) : page.locator('.nav-item').filter({ hasText: '宠物空间' })
  await nav.click()
  await page.locator('.pet-space-container').waitFor({ state: 'visible', timeout: 20_000 })
}

async function assertNoOverflow(page, label) {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  if (size.scroll > size.client + 1) throw new Error(`${label}: horizontal overflow ${JSON.stringify(size)}`)
}

let browser
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()
  const errors = []

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  desktop.on('pageerror', error => errors.push(`desktop: ${error.message}`))
  await openPets(desktop)
  if (await desktop.locator('.pet-list-item').count() !== 2) throw new Error('desktop: expected exactly two system pets')
  await desktop.getByText('Codex：正在修改宠物工作台').first().waitFor()
  await desktop.locator('.pet-v2-sprite').first().waitFor()
  await assertNoOverflow(desktop, 'desktop')
  await desktop.screenshot({ path: path.join(outputDir, '01-two-system-pets-desktop.png'), fullPage: false })

  await desktop.getByRole('button', { name: '从图片创建' }).click()
  await desktop.getByRole('dialog').waitFor()
  await desktop.getByText('正在制作完整动作').waitFor()
  await desktop.getByText('观察方向盲测未通过').waitFor()
  await desktop.screenshot({ path: path.join(outputDir, '02-generation-jobs-desktop.png'), fullPage: false })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => errors.push(`mobile: ${error.message}`))
  await openPets(mobile, true)
  if (await mobile.locator('.pet-list-item').count() !== 2) throw new Error('mobile: expected exactly two system pets')
  await mobile.getByRole('button', { name: '从图片创建' }).click()
  await mobile.getByRole('dialog').waitFor()
  await assertNoOverflow(mobile, 'mobile')
  await mobile.screenshot({ path: path.join(outputDir, '03-generation-mobile.png'), fullPage: false })

  if (errors.length) throw new Error(errors.join('; '))
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png'))
  const report = { pass: screenshots.length === 3, checks: { exactlyTwoPets: true, actorDetailVisible: true, v2AtlasVisible: true, generationJobsVisible: true, mobileResponsive: true }, screenshots }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
}
