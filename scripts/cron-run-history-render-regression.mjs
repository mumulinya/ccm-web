import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const workspace = process.cwd()
const outputDir = path.join(workspace, 'docs', 'main-agent-workchain', 'operations-and-integrations', 'scheduling', 'evidence', 'cron-reliability-v2')
const home = fsSync.mkdtempSync(path.join(os.tmpdir(), 'ccm-cron-live-render-'))
process.env.USERPROFILE = home
process.env.HOME = home
process.env.CCM_FEISHU_CONTROL_BOT_AUTO_START = '0'
const ccmDir = path.join(home, '.cc-connect')
fsSync.mkdirSync(path.join(ccmDir, 'test-agent-artifacts', 'run-live'), { recursive: true })

const task = {
  id: 'task-cron-live', title: '修复订单审核并完成浏览器验收', status: 'in_progress', status_detail: '群聊主 Agent 正在验收交付结果',
  group_id: 'group-live', target_project: 'orders', cron_job_id: 'job-live', cron_run_id: 'run-live', trace_id: 'trace-live',
  created_at: '2026-07-13T01:00:00.000Z', updated_at: '2026-07-13T01:08:00.000Z',
  plan: { steps: [{ id: '1', label: '确认需求', status: 'completed' }, { id: '2', label: '修改代码', status: 'completed' }, { id: '3', label: '浏览器验收', status: 'in_progress' }] },
  delivery_summary: { headline: '主 Agent 正在验收交付结果', detail: '项目子 Agent 已完成修改，正在核对页面行为和验证证据。', acceptance_gate_passed: false },
}
const job = {
  id: 'job-live', name: '订单审核每日回归', target_type: 'group', group_id: 'group-live', workflow_type: 'daily_dev', schedule: '0 9 * * 1-5', prompt: '处理 ready 需求并完成独立验收', enabled: true,
  timezone: 'Asia/Shanghai', retry_limit: 3, retry_interval_minutes: 10, misfire_policy: 'run_once', misfire_grace_minutes: 1440,
  notification_enabled: true, notify_on: ['failed', 'waiting', 'done'], next_run: '2026-07-14T01:00:00.000Z', run_count: 3, last_run: '2026-07-13T01:00:00.000Z', last_status: 'running_task', last_result: '任务正在执行和验收',
  run_history: [{ id: 'run-live', trigger: 'schedule', attempt: 1, scheduled_for: '2026-07-13T01:00:00.000Z', started_at: '2026-07-13T01:00:00.000Z', dispatched_at: '2026-07-13T01:00:05.000Z', status: 'running_task', result: '任务正在执行和验收', task_ids: [task.id], task_states: { [task.id]: { status: 'in_progress', result: '主 Agent 正在验收' } }, notifications: { started: { status: 'sent', at: '2026-07-13T01:00:03.000Z' } } }],
}
fsSync.writeFileSync(path.join(ccmDir, 'tasks.json'), JSON.stringify([task], null, 2))
fsSync.writeFileSync(path.join(ccmDir, 'cron-jobs.json'), JSON.stringify([job], null, 2))
fsSync.writeFileSync(path.join(ccmDir, 'groups.json'), JSON.stringify([{ id: 'group-live', name: '订单项目群', projects: ['orders'], orchestrator: { enabled: true } }], null, 2))
fsSync.writeFileSync(path.join(ccmDir, 'test-agent-artifacts', 'run-live', 'report.json'), JSON.stringify({ id: 'test-live', taskId: task.id, groupId: task.group_id, status: 'passed', recommendation: 'accept', summary: '真实浏览器验收通过', startedAt: '2026-07-13T01:05:00.000Z', finishedAt: '2026-07-13T01:08:00.000Z' }))
fsSync.writeFileSync(path.join(ccmDir, 'test-agent-artifacts', 'run-live', 'page.png'), Buffer.from('89504e470d0a1a0a', 'hex'))
fsSync.writeFileSync(path.join(ccmDir, 'test-agent-artifacts', 'run-live', 'artifact-manifest.json'), JSON.stringify({ files: [{ type: 'screenshot', title: '订单页面', path: 'page.png', status: 'passed' }] }))

const require = createRequire(import.meta.url)
const { startServer } = require('../ccm-package/dist/server.js')
const { stopCronScheduler } = require('../ccm-package/dist/modules/scheduling/cron.js')

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw error
  }
}

async function assertNoOverflow(page, label) {
  const widths = await page.evaluate(() => ({ document: [document.documentElement.clientWidth, document.documentElement.scrollWidth], root: [document.querySelector('.cron-jobs')?.clientWidth || 0, document.querySelector('.cron-jobs')?.scrollWidth || 0] }))
  if (widths.document[1] > widths.document[0] + 1 || widths.root[1] > widths.root[0] + 1) throw new Error(`${label} horizontal overflow: ${JSON.stringify(widths)}`)
}

async function openCron(page, mobile = false) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  if (mobile) {
    await page.locator('.bottom-item').filter({ hasText: '更多' }).click()
    await page.locator('.mobile-more-menu').getByRole('button', { name: '定时任务', exact: true }).click()
  } else {
    await page.locator('.nav-item').filter({ hasText: '定时任务' }).click()
  }
  await page.locator('.cron-jobs').waitFor({ state: 'visible' })
  await page.locator('.cron-job-row').getByText('订单审核每日回归', { exact: true }).waitFor({ state: 'visible' })
}

let server
let browser
let baseUrl = ''
try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  server = startServer(0)
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve()
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}/`
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 920 } })
  const errors = []
  desktop.on('pageerror', error => errors.push(error.message))
  await openCron(desktop)
  await assertNoOverflow(desktop, 'desktop list')
  await desktop.screenshot({ path: path.join(outputDir, '01-list-desktop.png') })
  const search = desktop.locator('.cron-filter-bar input[type="search"]')
  await search.fill('不存在的任务')
  await desktop.getByText('没有符合筛选条件的定时任务').waitFor()
  await search.fill('订单审核')
  await desktop.locator('.cron-job-row').getByText('订单审核每日回归', { exact: true }).waitFor()
  await desktop.locator('.cron-job-row .select-column input').check()
  await desktop.locator('.bulk-actions button').filter({ hasText: '停用' }).click()
  await desktop.locator('.cron-job-row .toggle input').waitFor()
  if (await desktop.locator('.cron-job-row .toggle input').isChecked()) throw new Error('bulk disable did not update the real API')
  await desktop.locator('.cron-job-row .select-column input').check()
  await desktop.locator('.bulk-actions button').filter({ hasText: '启用' }).click()
  await desktop.waitForFunction(() => document.querySelector('.cron-job-row .toggle input')?.checked === true)
  await desktop.getByRole('button', { name: '运行记录' }).click()
  await desktop.getByRole('dialog', { name: '定时任务运行记录' }).waitFor()
  if (await desktop.locator('.run-technical').evaluate(element => element.open)) throw new Error('technical details must be collapsed')
  await desktop.screenshot({ path: path.join(outputDir, '02-run-controls-desktop.png') })
  await desktop.getByRole('button', { name: '关闭运行记录' }).click()
  await desktop.getByRole('button', { name: '新建定时任务' }).click()
  await desktop.getByText('调度可靠性').waitFor()
  await desktop.waitForFunction(() => !document.querySelector('#toast-container .toast'), null, { timeout: 6000 })
  await desktop.screenshot({ path: path.join(outputDir, '03-reliability-form-desktop.png') })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', error => errors.push(error.message))
  await openCron(mobile, true)
  await assertNoOverflow(mobile, 'mobile list')
  const mobileOverview = await mobile.locator('.cron-overview').boundingBox()
  if (!mobileOverview || mobileOverview.height < 60) throw new Error(`mobile scheduling overview is not visible: ${JSON.stringify(mobileOverview)}`)
  await mobile.screenshot({ path: path.join(outputDir, '04-list-mobile.png') })
  await mobile.getByRole('button', { name: '运行记录' }).click()
  await mobile.getByRole('dialog', { name: '定时任务运行记录' }).waitFor()
  await assertNoOverflow(mobile, 'mobile history')
  await mobile.screenshot({ path: path.join(outputDir, '05-run-controls-mobile.png') })

  if (errors.length) throw new Error(`browser errors: ${errors.join('; ')}`)
  const screenshots = (await fs.readdir(outputDir)).filter(name => name.endsWith('.png')).sort()
  if (screenshots.length !== 5) throw new Error(`expected 5 screenshots, got ${screenshots.length}`)
  console.log(JSON.stringify({ pass: true, baseUrl, realApi: true, screenshots: screenshots.map(name => path.join(outputDir, name)) }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  stopCronScheduler()
  if (server) await new Promise(resolve => server.close(() => resolve()))
  await fs.rm(home, { recursive: true, force: true })
}
