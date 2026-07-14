import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'project-management-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const candidates = [process.env.PLAYWRIGHT_BROWSER_PATH, 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const projectsFixture = { projects: [{ name: 'ccm-demo', running: true, agent: 'codex', platform: '飞书', work_dir: 'C:\\workspace\\ccm-demo', session_count: 1, state: 'idle' }] }
const sessionsFixture = { sessions: [{ id: 's1', name: '普通问答与任务验证', message_count: 2, updated_at: '2026-07-14T04:00:00.000Z' }] }
const detailFixture = { id: 's1', history: [
  { id: 'u1', role: 'user', content: '这个项目现在可以运行吗？', timestamp: '2026-07-14T03:59:00.000Z' },
  { id: 'a1', role: 'assistant', content: '可以，项目当前运行正常。\n关键服务已经就绪。', timestamp: '2026-07-14T04:00:00.000Z', workEvents: [{ id: 'w1', kind: 'status', text: 'internal status payload trace_id=hidden' }] },
] }

const sseEvent = payload => `data: ${JSON.stringify(payload)}\n\n`

const prepare = async page => {
  let sendRequestCount = 0
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('**/api/projects', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projectsFixture) }))
  await page.route('**/api/agents', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agents: [{ type: 'codex', name: 'Codex' }] }) }))
  await page.route('**/api/projects/ccm-demo/sessions', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionsFixture) }))
  await page.route('**/api/projects/ccm-demo/sessions/s1', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detailFixture) }))
  await page.route('**/api/projects/archived', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, projects: [{ name: 'old-demo', archived_at: '2026-07-13T08:00:00.000Z' }] }) }))
  await page.route('**/api/projects/lifecycle-audit**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, records: [] }) }))
  await page.route('**/api/sessions/message', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }))
  await page.route('**/api/send-stream', async route => {
    sendRequestCount += 1
    const isTask = sendRequestCount === 2
    const body = isTask
      ? [
          sseEvent({ type: 'presentation', message_mode: 'task', show_task_card: true }),
          sseEvent({ type: 'task_runtime', run: { id: 'pchat_task_1' }, taskExperience: { task_id: 'pchat_task_1', title: '修改登录页并运行测试', goal: '修改登录页并运行测试', status: 'in_progress', phase: 'executing', requires_card: true } }),
          sseEvent({ type: 'work_event', event: { id: 'task-status', kind: 'status', text: '正在修改' } }),
          sseEvent({ type: 'chunk', text: '已完成登录页修改，并通过测试。' }),
          sseEvent({ type: 'done', run: { id: 'pchat_task_1' }, taskExperience: { task_id: 'pchat_task_1', title: '修改登录页并运行测试', goal: '修改登录页并运行测试', status: 'done', phase: 'completed', requires_card: true, verification: ['npm test 通过'] }, fileChanges: { count: 1, files: [{ path: 'src/login.vue', statusText: '已修改', statusColor: '#16a34a' }] }, workEvents: [{ id: 'task-done', kind: 'done', text: '执行完成' }] }),
        ].join('')
      : [
          sseEvent({ type: 'presentation', message_mode: 'conversation', show_task_card: false }),
          sseEvent({ type: 'status', text: 'Agent 正在思考...' }),
          sseEvent({ type: 'task_runtime', run: { id: 'legacy-noisy-run' }, taskExperience: { task_id: 'legacy-noisy-run', title: '你是什么模型', status: 'in_progress', phase: 'executing' } }),
          sseEvent({ type: 'work_event', event: { id: 'hidden-internal', kind: 'status', text: '正在修改 trace_id=hidden' } }),
          sseEvent({ type: 'chunk', text: '我是当前项目配置的 Codex Agent，可以回答问题，也可以在你明确要求时处理代码任务。' }),
          sseEvent({ type: 'done', taskExperience: { task_id: 'legacy-noisy-run', title: '你是什么模型', status: 'done', phase: 'completed' }, workEvents: [{ id: 'hidden-done', kind: 'done', text: '内部执行完成' }] }),
        ].join('')
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body })
  })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if ((page.viewportSize()?.width || 1000) <= 768) {
    await page.getByRole('button', { name: '更多', exact: true }).click()
    await page.locator('.mobile-more-grid').getByRole('button', { name: '项目管理', exact: true }).click()
  } else {
    await page.locator('.nav-item').filter({ hasText: '项目管理' }).first().click()
  }
  await page.locator('.project-manager').waitFor({ state: 'visible' })
  await page.getByText('可以，项目当前运行正常。', { exact: false }).waitFor()
}

const assertLayout = async (page, label) => {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    managerWidth: document.querySelector('.project-manager')?.clientWidth || 0,
    managerScrollWidth: document.querySelector('.project-manager')?.scrollWidth || 0,
    openTechnicalDetails: Array.from(document.querySelectorAll('.agent-work-events')).filter(item => item.open).length,
    internalStatusVisible: document.body.innerText.includes('trace_id=hidden'),
  }))
  assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `${label} document overflow`)
  assert.ok(metrics.managerScrollWidth <= metrics.managerWidth + 1, `${label} manager overflow`)
  assert.equal(metrics.openTechnicalDetails, 0)
  assert.equal(metrics.internalStatusVisible, false)
  report.checks.push({ name: `${label} has no overflow and keeps technical details folded`, pass: true })
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
  await assertLayout(desktop, 'desktop project workspace')
  const desktopColumns = await desktop.evaluate(() => ({ sidebar: document.querySelector('.session-sidebar')?.getBoundingClientRect().width || 0, content: document.querySelector('.content')?.getBoundingClientRect().width || 0 }))
  assert.ok(desktopColumns.sidebar >= 250)
  assert.ok(desktopColumns.content >= 700)
  assert.equal(await desktop.getByText('s1', { exact: true }).count(), 0)
  assert.match(await desktop.locator('.message.assistant .bubble').innerText(), /正常。\n关键服务/)
  report.checks.push({ name: 'desktop keeps readable session and conversation columns, hides internal session id and preserves line breaks', pass: true })
  await capture(desktop, 'desktop-project-workspace')
  await desktop.locator('#projectChatInput').fill('你是什么模型')
  await desktop.locator('.project-manager .send-button').click()
  await desktop.getByText('我是当前项目配置的 Codex Agent', { exact: false }).waitFor()
  assert.equal(await desktop.locator('.task-experience-card').count(), 0)
  assert.equal((await desktop.locator('.messages').innerText()).includes('项目执行任务'), false)
  assert.equal((await desktop.locator('.messages').innerText()).includes('正在修改 trace_id=hidden'), false)
  report.checks.push({ name: 'ordinary project question renders only the friendly answer without task card or internal work details', pass: true })
  await desktop.getByText('我是当前项目配置的 Codex Agent', { exact: false }).scrollIntoViewIfNeeded()
  await capture(desktop, 'desktop-ordinary-conversation')

  await desktop.waitForFunction(() => document.querySelector('.project-manager .send-button')?.textContent?.trim() === '发送')
  await desktop.locator('#projectChatInput').fill('修改登录页并运行测试')
  await desktop.locator('.project-manager .send-button').click()
  await desktop.locator('.task-experience-card').waitFor()
  assert.equal(await desktop.locator('.task-experience-card').count(), 1)
  assert.equal((await desktop.locator('.messages').innerText()).includes('项目执行任务'), true)
  report.checks.push({ name: 'explicit implementation request keeps the project task card and delivery progress', pass: true })
  await capture(desktop, 'desktop-explicit-task')

  await desktop.getByTitle('归档项目管理').click()
  await desktop.getByText('old-demo', { exact: true }).waitFor()
  await capture(desktop, 'desktop-archive-manager')

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobile = await mobileContext.newPage()
  await prepare(mobile)
  await assertLayout(mobile, 'mobile project workspace')
  await capture(mobile, 'mobile-project-workspace')
  const closedTransform = await mobile.locator('.session-sidebar').evaluate(element => getComputedStyle(element).transform)
  assert.notEqual(closedTransform, 'none')
  await mobile.getByTitle('打开会话列表').click()
  await mobile.locator('.session-sidebar.open').waitFor()
  assert.equal(await mobile.getByText('普通问答与任务验证', { exact: true }).isVisible(), true)
  report.checks.push({ name: 'mobile session list is a working drawer and conversation keeps full width', pass: true })
  await capture(mobile, 'mobile-session-drawer')

  assert.deepEqual(report.errors, [])
  report.pass = true
} catch (error) {
  report.error = error?.stack || String(error)
  process.exitCode = 1
} finally {
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}
