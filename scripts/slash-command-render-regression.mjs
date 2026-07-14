import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_SLASH_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(process.cwd(), 'docs', 'command-center', 'evidence', '2026-07-14')

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw error
  }
}

async function clickNavigation(page, label) {
  const target = page.locator('.nav-item').filter({ hasText: label })
  if (await target.count() !== 1) throw new Error(`导航项不唯一：${label}`)
  await target.click()
}

async function assertNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  if (metrics.scroll > metrics.client + 1) throw new Error(`${label} 出现横向溢出：${JSON.stringify(metrics)}`)
}

async function openSlashMenu(input) {
  await input.fill('/')
  const menu = input.locator('xpath=..').locator('.slash-menu')
  await menu.waitFor({ state: 'visible' })
  await menu.locator('.slash-item').first().waitFor({ state: 'visible', timeout: 10_000 })
  return menu
}

let browser
try {
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()
  const errors = []

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  desktop.on('pageerror', error => errors.push(`desktop: ${error.message}`))
  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' })

  await clickNavigation(desktop, '全局助手')
  const globalInput = desktop.locator('.global-assistant-panel .input-wrapper input[type="text"]')
  const globalMenu = await openSlashMenu(globalInput)
  const globalCount = await globalMenu.locator('.slash-item').count()
  if (globalCount < 50) throw new Error(`全局命令不足 50 项：${globalCount}`)
  for (const label of ['直接读取', '当前会话', '打开页面', 'Agent 工作流']) {
    if (await globalMenu.getByText(label, { exact: true }).count() === 0) throw new Error(`全局菜单缺少实现标识：${label}`)
  }
  await assertNoDocumentOverflow(desktop, '全局命令菜单')
  await desktop.screenshot({ path: path.join(outputDir, '01-global-command-menu-desktop.png') })

  await clickNavigation(desktop, '项目管理')
  const projectInput = desktop.locator('#projectChatInput')
  await desktop.waitForFunction(() => {
    const select = document.querySelector('.project-manager .project-select-wrapper select')
    return !!select?.value && !!document.querySelector('.project-manager .session-item.active')
  }, null, { timeout: 15_000 })
  await projectInput.fill('/branch')
  await projectInput.locator('xpath=..').locator('.slash-item').waitFor({ state: 'visible', timeout: 10_000 })
  await projectInput.press('Enter')
  const projectResult = desktop.locator('.project-manager .command-result').filter({ hasText: '/branch' })
  await projectResult.waitFor({ state: 'visible' })
  if (!(await projectResult.innerText()).includes('分支')) throw new Error('/branch 没有返回真实分支信息')
  await assertNoDocumentOverflow(desktop, '项目命令结果')
  await desktop.screenshot({ path: path.join(outputDir, '02-project-branch-result-desktop.png') })

  await clickNavigation(desktop, '群聊协作')
  const groupInput = desktop.locator('#groupChatInput')
  await desktop.locator('.group-chat .group-card.active').waitFor({ state: 'visible', timeout: 15_000 })
  await groupInput.fill('/sessions')
  await groupInput.locator('xpath=..').locator('.slash-item').waitFor({ state: 'visible', timeout: 10_000 })
  await groupInput.press('Enter')
  const groupResult = desktop.locator('.group-chat .command-result').filter({ hasText: '/sessions' })
  await groupResult.waitFor({ state: 'visible' })
  if (!(await groupResult.innerText()).includes('当前会话')) throw new Error('/sessions 没有返回当前群聊会话')

  const messageCountBefore = await desktop.locator('.group-chat .message').count()
  await groupInput.fill('/clear')
  await groupInput.press('Enter')
  const cancel = desktop.locator('#cd-cancel')
  await cancel.waitFor({ state: 'visible' })
  await cancel.click()
  const messageCountAfter = await desktop.locator('.group-chat .message').count()
  if (messageCountAfter !== messageCountBefore) throw new Error('取消 /clear 后群聊消息仍发生变化')
  await desktop.screenshot({ path: path.join(outputDir, '03-group-sessions-result-desktop.png') })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => errors.push(`mobile: ${error.message}`))
  await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const mobileNav = mobile.locator('.bottom-item').filter({ hasText: '群聊' })
  if (await mobileNav.count() !== 1) throw new Error('移动端群聊导航不唯一')
  await mobileNav.click()
  const mobileInput = mobile.locator('#groupChatInput')
  const mobileMenu = await openSlashMenu(mobileInput)
  const mobileCount = await mobileMenu.locator('.slash-item').count()
  if (mobileCount < 50) throw new Error(`移动端群聊命令不足 50 项：${mobileCount}`)
  const menuBox = await mobileMenu.boundingBox()
  if (!menuBox || menuBox.x < 0 || menuBox.x + menuBox.width > 391) throw new Error(`移动端命令菜单超出视口：${JSON.stringify(menuBox)}`)
  await assertNoDocumentOverflow(mobile, '移动端命令菜单')
  await mobile.screenshot({ path: path.join(outputDir, '04-group-command-menu-mobile.png') })

  if (errors.length) throw new Error(`页面脚本错误：${errors.join('; ')}`)
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
  console.log(JSON.stringify({ pass: true, baseUrl, counts: { global: globalCount, mobileGroup: mobileCount }, screenshots }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
