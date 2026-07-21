import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'docs', 'main-agent-workchain', 'operations-and-integrations', 'cleanup', 'cleanup-center-workspace-redesign-2026-07-21', 'evidence')
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks: [], errors: [], screenshots: [] }

const summaryFixture = {
  success: true,
  updated_at: '2026-07-14T02:00:00.000Z',
  policy: { default_retention_days: 30, retention_options: [7, 30, 90, 0], preview_ttl_minutes: 10 },
  storage: { total_bytes: 8_290_304 },
  cards: [
    { id: 'tasks', title: '任务记录', count: 39, bytes: 4200000, detail: '8 项已归档' },
    { id: 'cron', title: '定时任务', count: 4, bytes: 12000, detail: '0 项已归档' },
    { id: 'project_runs', title: '项目运行', count: 4, bytes: 48000, detail: '1 项失败' },
    { id: 'conversations', title: '会话数据', count: 26, bytes: 1300000, detail: '项目、群聊与全局会话' },
    { id: 'execution_artifacts', title: '执行产物', count: 77, bytes: 1900000, detail: '执行记录、检查点和输出' },
    { id: 'quality_evidence', title: '测试与回放证据', count: 18, bytes: 830304, detail: 'TestAgent 证据和任务回放' },
  ],
  rows: {
    tasks: [{ id: 'task-1', title: '完善清理中心', status: 'done', project: 'ccm', updated_at: '2026-07-14T01:30:00.000Z' }],
    cron: [], project_runs: [], conversations: [], execution_artifacts: [],
    quality_evidence: [{ id: 'test-artifacts', title: 'TestAgent 截图与浏览器证据', type: '测试证据', count: 12, bytes: 720000 }],
  },
  actions: [
    { id: 'archive_failed_project_runs', label: '归档失败的项目运行', description: '从进行中列表移走失败记录，仍可保留用于复盘。', risk: 'safe', irreversible: false, target_count: 1 },
    { id: 'purge_archived_tasks', label: '永久删除已归档任务', description: '同时清理子 Agent 会话、TestAgent 证据、任务回放和执行工作树。', risk: 'danger', irreversible: true, target_count: 2 },
  ],
  history: [{
    schema: 'ccm-cleanup-receipt-v1', id: 'receipt-1', label: '归档失败的项目运行', status: 'success',
    processed_count: 1, failed_count: 0, released_bytes: 0, retention_days: 30,
    completed_at: '2026-07-14T01:00:00.000Z', cleanup: { sessions: 1 },
  }],
}

const previewFixture = {
  success: true,
  preview_token: 'preview-render-token',
  expires_at: '2026-07-14T02:10:00.000Z',
  action: { id: 'purge_archived_tasks', label: '永久删除已归档任务', risk: 'danger', irreversible: true, target_count: 2 },
  policy: { retention_days: 30 },
  preview: {
    will_affect: 2,
    irreversible: true,
    note: '只会永久删除本次预览中勾选的记录。任务相关的测试证据和回放会一并删除。',
    items: [
      { id: 'task-a', title: '旧版页面任务', status: 'archived', project: 'ccm', updated_at: '2026-05-01T10:00:00.000Z' },
      { id: 'task-b', title: '历史回归任务', status: 'archived', project: 'web', updated_at: '2026-05-02T10:00:00.000Z' },
    ],
  },
}

const preparePage = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('**/api/cleanup/summary', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(summaryFixture) }))
  await page.route('**/api/cleanup/preview', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(previewFixture) }))
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const nav = page.getByText('清理中心', { exact: true }).first()
  if (await nav.isVisible()) await nav.click()
  else {
    await page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('*')).find(element => element.textContent?.trim() === '清理中心')
      target?.click()
    })
  }
  await page.locator('.cleanup-page').waitFor()
}

const assertNoOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    openDetails: Array.from(document.querySelectorAll('.cleanup-technical-details')).filter(item => item.open).length,
    rawJson: document.body.innerText.includes('"schema":') || document.body.innerText.includes('preview_token'),
  }))
  assert.equal(metrics.scrollWidth, metrics.clientWidth, `${label} has horizontal overflow`)
  assert.equal(metrics.openDetails, 0, `${label} technical details should be closed`)
  assert.equal(metrics.rawJson, false, `${label} exposes raw JSON`)
  report.checks.push({ name: `${label} has no overflow, raw JSON or open technical details`, pass: true })
}

const capture = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.screenshots.push(file)
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const desktopPage = await desktop.newPage()
  await preparePage(desktopPage)
  await desktopPage.getByText('测试与回放证据', { exact: true }).click()
  await desktopPage.getByText('TestAgent 截图与浏览器证据', { exact: true }).waitFor()
  assert.equal(await desktopPage.locator('.cleanup-segmented button').count(), 4)
  assert.equal(await desktopPage.locator('.cleanup-storage-tile').count(), 6)
  assert.equal(await desktopPage.locator('.cleanup-storage-meter').count(), 6)
  report.checks.push({ name: 'desktop uses governance navigation and capacity distribution meters', pass: true })
  await assertNoOverflow(desktopPage, 'desktop overview')
  await capture(desktopPage, 'desktop-overview')

  await desktopPage.getByRole('button', { name: '永久删除' }).click()
  await desktopPage.getByRole('button', { name: /查看清单/ }).click()
  await desktopPage.getByText('旧版页面任务', { exact: true }).waitFor()
  const executeButton = desktopPage.getByRole('button', { name: '永久删除 2 项' })
  assert.equal(await executeButton.isDisabled(), true)
  await desktopPage.getByPlaceholder('永久删除').fill('永久删除')
  assert.equal(await executeButton.isEnabled(), true)
  const desktopActionColumn = await desktopPage.locator('.cleanup-action-column').boundingBox()
  const desktopPreview = await desktopPage.locator('.cleanup-preview').boundingBox()
  assert.ok(desktopActionColumn && desktopPreview && desktopPreview.x > desktopActionColumn.x, 'desktop danger preview should use the right inspection column')
  report.checks.push({ name: 'dangerous action requires exact preview selection and confirmation phrase', pass: true })
  await assertNoOverflow(desktopPage, 'desktop danger preview')
  await capture(desktopPage, 'desktop-danger-preview')

  await desktopPage.getByRole('button', { name: '清理记录' }).click()
  await desktopPage.getByText('归档失败的项目运行', { exact: true }).waitFor()
  await assertNoOverflow(desktopPage, 'desktop history')
  await capture(desktopPage, 'desktop-history')
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobilePage = await mobile.newPage()
  await preparePage(mobilePage)
  assert.equal(await mobilePage.locator('.cleanup-segmented button').count(), 4)
  const mobileSummary = await mobilePage.locator('.cleanup-summary-strip').boundingBox()
  assert.ok(mobileSummary && mobileSummary.height >= 45, 'mobile cleanup summary must remain visible')
  report.checks.push({ name: 'mobile keeps summary and all governance views reachable', pass: true })
  await assertNoOverflow(mobilePage, 'mobile overview')
  await capture(mobilePage, 'mobile-overview')
  await mobilePage.getByRole('button', { name: '永久删除' }).click()
  await mobilePage.getByRole('button', { name: /查看清单/ }).click()
  await assertNoOverflow(mobilePage, 'mobile danger preview')
  await capture(mobilePage, 'mobile-danger-preview')
  await mobile.close()

  const live = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const livePage = await live.newPage()
  livePage.on('pageerror', error => report.errors.push(`live page: ${error.message}`))
  await livePage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await livePage.getByText('清理中心', { exact: true }).first().click()
  await livePage.locator('.cleanup-storage-tile').first().waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await livePage.locator('.cleanup-storage-tile').count(), 6)
  assert.equal(await livePage.locator('.cleanup-segmented button').count(), 4)
  await assertNoOverflow(livePage, 'live cleanup data')
  report.checks.push({ name: 'production cleanup summary loads through the real API', pass: true })
  await live.close()

  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  await browser.close()
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
