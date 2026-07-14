import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const baseUrl = process.env.CCM_TASK_DISPATCH_URL || 'http://127.0.0.1:3082/'
const outputDir = path.join(
  root,
  'docs',
  'main-agent-workchain',
  'shared-workchain',
  'architecture-and-validation',
  'evidence',
  'task-dispatch-v2',
)

async function launchBrowser() {
  try {
    return await chromium.launch()
  } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try {
        return await chromium.launch({ channel })
      } catch {}
    }
    throw firstError
  }
}

async function openTaskDispatch(page, mobile = false) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  if (mobile) {
    const taskNav = page.getByRole('button', { name: '任务派发', exact: true })
    if (await taskNav.count() !== 1) throw new Error('mobile task navigation should be unique')
    await taskNav.click()
  } else {
    const taskNav = page.locator('.nav-item').filter({ hasText: '任务派发' })
    if (await taskNav.count() !== 1) throw new Error('desktop task navigation should be unique')
    await taskNav.click()
  }
  await page.locator('.task-dispatch-header').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('.execution-dashboard').waitFor({ state: 'visible', timeout: 10_000 })
  await page.locator('.execution-dashboard .dashboard-head-actions').getByRole('button', { name: '刷新', exact: true }).waitFor({ state: 'visible', timeout: 15_000 })
}

async function assertNoHorizontalOverflow(page, label) {
  const layout = await page.evaluate(() => {
    const manager = document.querySelector('.task-manager')
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      managerClientWidth: manager?.clientWidth || 0,
      managerScrollWidth: manager?.scrollWidth || 0,
    }
  })
  if (layout.documentScrollWidth > layout.documentClientWidth + 1) {
    throw new Error(`${label} document has horizontal overflow: ${JSON.stringify(layout)}`)
  }
  if (layout.managerScrollWidth > layout.managerClientWidth + 1) {
    throw new Error(`${label} task manager has horizontal overflow: ${JSON.stringify(layout)}`)
  }
}

let browser
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await openTaskDispatch(desktop)
  await assertNoHorizontalOverflow(desktop, 'desktop overview')

  const primaryCreate = desktop.locator('.task-dispatch-header .primary-action')
  if (await primaryCreate.count() !== 1) throw new Error('task dispatch should expose one primary create entry')
  if (await desktop.locator('.runtime-governance-card').isVisible()) throw new Error('runtime governance must stay out of the default overview')
  await desktop.screenshot({ path: path.join(outputDir, '01-task-overview-desktop.png'), fullPage: false })

  await primaryCreate.click()
  await desktop.getByRole('menu').waitFor({ state: 'visible' })
  if (await desktop.getByRole('menuitem').filter({ hasText: '业务开发任务' }).count() !== 1) {
    throw new Error('business task create option should be available from the unified menu')
  }
  if (await desktop.getByRole('menuitem').filter({ hasText: '普通任务' }).count() !== 1) {
    throw new Error('standard task create option should be available from the unified menu')
  }
  await desktop.locator('.create-menu').screenshot({ path: path.join(outputDir, '02-unified-create-menu-desktop.png') })
  await primaryCreate.click()

  const desktopAllTasks = desktop.locator('.task-view-tabs button').filter({ hasText: '全部任务' })
  if (await desktopAllTasks.count() !== 1) throw new Error('desktop all-task view should be unique')
  await desktopAllTasks.click()
  await desktop.locator('.task-list-view').waitFor({ state: 'visible' })
  await assertNoHorizontalOverflow(desktop, 'desktop task list')
  if (await desktop.getByText('批量删除', { exact: true }).isVisible().catch(() => false)) throw new Error('archive action must not be labelled as delete')
  const technicalDetailsFolded = await desktop.evaluate(() => Array.from(document.querySelectorAll('.task-list-view .task-technical-details')).every(item => item.open === false))
  if (!technicalDetailsFolded) throw new Error('task-list technical details must be folded by default')
  await desktop.screenshot({ path: path.join(outputDir, '03-task-list-desktop.png'), fullPage: false })

  const desktopRuntime = desktop.locator('.task-view-tabs button').filter({ hasText: '运行管理' })
  if (await desktopRuntime.count() !== 1) throw new Error('desktop runtime view should be unique')
  await desktopRuntime.click()
  await desktop.locator('.task-runtime-management').waitFor({ state: 'visible' })
  await desktop.locator('.runtime-governance-card').waitFor({ state: 'visible' })
  await assertNoHorizontalOverflow(desktop, 'desktop runtime management')
  await desktop.screenshot({ path: path.join(outputDir, '04-runtime-management-desktop.png'), fullPage: false })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await openTaskDispatch(mobile, true)
  await assertNoHorizontalOverflow(mobile, 'mobile overview')
  await mobile.screenshot({ path: path.join(outputDir, '05-task-overview-mobile.png'), fullPage: false })

  const mobileAllTasks = mobile.locator('.task-view-tabs button').filter({ hasText: '全部任务' })
  if (await mobileAllTasks.count() !== 1) throw new Error('mobile all-task view should be unique')
  await mobileAllTasks.click()
  await mobile.locator('.task-list-view').waitFor({ state: 'visible' })
  await assertNoHorizontalOverflow(mobile, 'mobile task list')
  await mobile.screenshot({ path: path.join(outputDir, '06-task-list-mobile.png'), fullPage: false })

  const errors = [...desktopErrors, ...mobileErrors]
  if (errors.length) throw new Error(`browser page errors:\n${errors.join('\n')}`)
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
  if (screenshots.length !== 6) throw new Error(`expected 6 screenshots, got ${screenshots.length}`)
  console.log(JSON.stringify({ pass: true, baseUrl, screenshots: screenshots.map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
