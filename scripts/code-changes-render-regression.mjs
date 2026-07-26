import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'code-changes-render-regression')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })
const executablePath = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(fs.existsSync)
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const report = { pass: false, generatedAt: new Date().toISOString(), checks: [], screenshots: [], errors: [] }

const files = [
  { path: 'frontend/src/components/tools/CodeChanges.vue', status: 'M', statusCode: ' M', statusText: '已修改', statusColor: '#2563eb', staged: false, unstaged: true, untracked: false, conflict: false, additions: 86, deletions: 31, workingAdditions: 86, workingDeletions: 31 },
  { path: 'backend/modules/tools/git.ts', status: 'MM', statusCode: 'MM', statusText: '已修改', statusColor: '#2563eb', staged: true, unstaged: true, untracked: false, conflict: false, additions: 48, deletions: 12, stagedAdditions: 21, stagedDeletions: 4, workingAdditions: 27, workingDeletions: 8 },
  { path: 'docs/code-changes.md', status: '??', statusCode: '??', statusText: '未跟踪', statusColor: '#0f766e', staged: false, unstaged: true, untracked: true, conflict: false, additions: 44, deletions: 0, workingAdditions: 44, workingDeletions: 0 },
  ...Array.from({ length: 36 }, (_, index) => ({
    path: `modules/service-${String(index + 1).padStart(2, '0')}/src/feature-${index + 1}.ts`,
    status: 'M', statusCode: ' M', statusText: '已修改', statusColor: '#2563eb',
    staged: false, unstaged: true, untracked: false, conflict: false,
    additions: index + 2, deletions: index % 4, workingAdditions: index + 2, workingDeletions: index % 4,
  })),
]
const raw = `diff --git a/frontend/src/components/tools/CodeChanges.vue b/frontend/src/components/tools/CodeChanges.vue\nindex 123..456 100644\n--- a/frontend/src/components/tools/CodeChanges.vue\n+++ b/frontend/src/components/tools/CodeChanges.vue\n@@ -10,3 +10,4 @@\n const files = ref([])\n-const message = ref('提交')\n+const message = ref('检查并提交')\n+const preview = ref(null)\n const branch = ref('main')`
const hunks = [{ header: '@@ -10,83 +10,84 @@', oldStart: 10, oldLines: 83, newStart: 10, newLines: 84, context: '', changes: [{ type: 'context', content: 'const files = ref([])' }, { type: 'remove', content: "const message = ref('提交')" }, { type: 'add', content: "const message = ref('检查并提交')" }, { type: 'add', content: 'const preview = ref(null)' }, ...Array.from({ length: 80 }, (_, index) => ({ type: 'context', content: `const retainedLine${index + 1} = '用于验证独立 Diff 滚动区域'` })), { type: 'context', content: "const branch = ref('main')" }] }]

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/api/auth/session', route => route.fulfill(json({ success: true, authenticated: true, user: { username: 'selftest' } })))
  await page.route('**/api/pets/agents', route => route.fulfill(json({ success: true, agents: [] })))
  await page.route('**/api/status/stream**', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.route('**/api/usability/workbench/stream**', route => route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' }))
  await page.route('**/api/usability/workbench', route => route.fulfill(json({ success: true, snapshot: {} })))
  await page.route('**/api/music/remote-command', route => route.fulfill(json({ success: true, commands: [] })))
  await page.route('**/api/projects', route => route.fulfill(json({ projects: [{ name: 'coordinator', running: true }] })))
  await page.route('**/api/git/status*', route => route.fulfill(json({ success: true, branch: 'feature/code-workbench', files, summary: { total: files.length, additions: 178, deletions: 43, staged: 1, unstaged: files.length, untracked: 1, conflicts: 0, modules: ['frontend', 'backend', 'docs', 'modules'], riskLevel: 'medium', warnings: ['1 个未跟踪文件需要确认'] }, repository: { remoteUrl: 'https://github.com/example/ccm.git', remoteName: 'origin', branch: 'feature/code-workbench', upstream: 'origin/feature/code-workbench', pushTarget: 'origin/feature/code-workbench', ahead: 2, behind: 1, dirty: true, changedFiles: files.length, canFetch: true, canPull: false, canPush: true, canCommitAndPush: true }, context: { attribution: 'exact', tasks: [{ taskId: 'task-code-workbench', title: '完善代码变更工作台', status: 'in_progress', agent: 'codex', traceId: 'trace-code-workbench', exactFiles: files.map(file => file.path), association: 'exact', verification: ['npm run build:frontend'] }], latestTestAgent: { status: 'passed', recommendation: 'accept', summary: '浏览器与接口检查通过', browserChecks: 4 } } })))
  await page.route('**/api/git/remote-operation', async route => route.fulfill(json({ success: true, message: '远端引用已拉取', operation: 'fetch' })))
  await page.route('**/api/git/diff*', route => route.fulfill(json({ success: true, raw, hunks, additions: 2, deletions: 1 })))
  await page.route('**/api/git/commit-preview', route => route.fulfill(json({ success: true, preview: { files: [files[0], files[1]], outsideStaged: ['README.md'], conflicts: [], blocked: false, warnings: ['暂存区还有 1 个未选文件，本次不会提交'] } })))
  await page.route('**/api/git/log*', route => route.fulfill(json({ success: true, commits: [{ hash: 'abcdef123', shortHash: 'abcdef1', author: 'CCM', timestamp: '2026-07-14T08:00:00.000Z', message: 'feat: 完善代码变更工作台' }] })))
  await page.goto(`${baseUrl}/?tab=changes`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.code-changes-workbench').waitFor({ timeout: 20_000 })
  await page.getByText(`${files.length} 个文件等待处理`, { exact: true }).waitFor()
  await page.locator('[data-page-loading="changes"]').waitFor({ state: 'detached', timeout: 10_000 })
}
const noOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, root: document.querySelector('.code-changes-workbench')?.scrollWidth || 0, rootWidth: document.querySelector('.code-changes-workbench')?.clientWidth || 0 }))
  assert.ok(metrics.scroll <= metrics.width + 1, `${label} document overflow`)
  assert.ok(metrics.root <= metrics.rootWidth + 1, `${label} workbench overflow`)
}
const assertIndependentPaneScroll = async (page, label) => {
  const metrics = await page.evaluate(() => {
    const pane = document.querySelector('.code-changes-pane')
    const workbench = document.querySelector('.code-changes-workbench')
    const layout = document.querySelector('.changes-layout')
    const filePane = document.querySelector('.change-files')
    const diffPane = document.querySelector('.diff-pane')
    const diff = document.querySelector('.diff-viewer')
    const files = document.querySelector('.file-scroll')
    const fileRect = filePane?.getBoundingClientRect()
    const diffRect = diffPane?.getBoundingClientRect()
    return {
      paneClientHeight: pane?.clientHeight || 0,
      paneScrollHeight: pane?.scrollHeight || 0,
      paneOverflowY: pane ? getComputedStyle(pane).overflowY : '',
      workbenchOverflowY: workbench ? getComputedStyle(workbench).overflowY : '',
      layoutHeight: layout?.clientHeight || 0,
      diffOverflowY: diff ? getComputedStyle(diff).overflowY : '',
      fileOverflowY: files ? getComputedStyle(files).overflowY : '',
      diffClientHeight: diff?.clientHeight || 0,
      diffScrollHeight: diff?.scrollHeight || 0,
      fileClientHeight: files?.clientHeight || 0,
      fileScrollHeight: files?.scrollHeight || 0,
      fileTop: fileRect?.top || 0,
      fileBottom: fileRect?.bottom || 0,
      diffTop: diffRect?.top || 0,
      diffBottom: diffRect?.bottom || 0,
    }
  })
  assert.ok(metrics.layoutHeight >= 280, `${label} dual pane workspace is too short`)
  assert.ok(Math.abs(metrics.fileTop - metrics.diffTop) <= 1 && Math.abs(metrics.fileBottom - metrics.diffBottom) <= 1, `${label} panes are not equal height: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.paneScrollHeight <= metrics.paneClientHeight + 1, `${label} outer code page must stay fixed`)
  assert.equal(metrics.paneOverflowY, 'hidden')
  assert.equal(metrics.workbenchOverflowY, 'hidden')
  assert.equal(metrics.diffOverflowY, 'auto')
  assert.equal(metrics.fileOverflowY, 'auto')
  assert.ok(metrics.diffScrollHeight > metrics.diffClientHeight + 100, `${label} diff fixture should scroll independently`)
  assert.ok(metrics.fileScrollHeight > metrics.fileClientHeight + 100, `${label} file fixture should scroll independently`)

  await page.evaluate(() => {
    document.querySelector('.code-changes-pane').scrollTop = 0
    document.querySelector('.file-scroll').scrollTop = 0
    document.querySelector('.diff-viewer').scrollTop = 0
  })
  await page.locator('.file-scroll').hover()
  await page.mouse.wheel(0, 520)
  await page.waitForTimeout(80)
  const leftScroll = await page.evaluate(() => ({
    pane: document.querySelector('.code-changes-pane').scrollTop,
    files: document.querySelector('.file-scroll').scrollTop,
    diff: document.querySelector('.diff-viewer').scrollTop,
  }))
  assert.equal(leftScroll.pane, 0)
  assert.ok(leftScroll.files > 0)
  assert.equal(leftScroll.diff, 0)

  await page.locator('.diff-viewer').hover()
  await page.mouse.wheel(0, 620)
  await page.waitForTimeout(80)
  const rightScroll = await page.evaluate(() => {
    const toolbarRect = document.querySelector('.diff-toolbar').getBoundingClientRect()
    const paneRect = document.querySelector('.diff-pane').getBoundingClientRect()
    return {
      pane: document.querySelector('.code-changes-pane').scrollTop,
      files: document.querySelector('.file-scroll').scrollTop,
      diff: document.querySelector('.diff-viewer').scrollTop,
      diffClientHeight: document.querySelector('.diff-viewer').clientHeight,
      diffScrollHeight: document.querySelector('.diff-viewer').scrollHeight,
      toolbarVisible: toolbarRect.top >= paneRect.top - 1 && toolbarRect.bottom <= paneRect.bottom + 1,
    }
  })
  assert.equal(rightScroll.pane, 0)
  assert.equal(rightScroll.files, leftScroll.files)
  assert.ok(rightScroll.diff > 0, JSON.stringify(rightScroll))
  assert.equal(rightScroll.toolbarVisible, true)
}
const capture = async (page, name) => { const file = path.join(outputDir, `${name}.png`); await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file) }

try {
  const desktop = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage()
  await prepare(desktop)
  await noOverflow(desktop, 'desktop')
  await assertIndependentPaneScroll(desktop, 'desktop')
  report.checks.push({ name: 'desktop uses equal-height file and Diff panels with isolated vertical scrolling', pass: true })
  await capture(desktop, 'desktop-independent-dual-pane-scroll')
  assert.equal(await desktop.getByText('TestAgent 已通过', { exact: true }).isVisible(), true)
  assert.equal(await desktop.getByText('文件记录精确匹配', { exact: false }).isVisible(), true)
  assert.equal(await desktop.locator('.grouping-switch').getByRole('button', { name: '目录' }).getAttribute('class').then(value => value.includes('active')), true)
  assert.equal(await desktop.getByRole('button', { name: '收起 backend', exact: true }).isVisible(), true)
  const backendDirectoryCheckbox = desktop.getByRole('checkbox', { name: '选择目录 backend', exact: true })
  assert.equal(await backendDirectoryCheckbox.isVisible(), true)
  await backendDirectoryCheckbox.check()
  assert.equal(await desktop.getByRole('checkbox', { name: '选择 backend/modules/tools/git.ts' }).isChecked(), true)
  await backendDirectoryCheckbox.uncheck()
  await desktop.getByRole('button', { name: '收起 backend', exact: true }).click()
  assert.equal(await desktop.getByRole('checkbox', { name: '选择 backend/modules/tools/git.ts' }).isVisible(), false)
  await desktop.getByRole('button', { name: '展开 backend', exact: true }).click()
  await desktop.locator('.grouping-switch').getByRole('button', { name: '模块' }).click()
  assert.equal(await desktop.locator('.file-group h4').filter({ hasText: 'backend' }).isVisible(), true)
  await desktop.locator('.grouping-switch').getByRole('button', { name: '目录' }).click()
  report.checks.push({ name: 'changed files support directory tree, module grouping and directory-level selection', pass: true })
  assert.equal(await desktop.locator('.repository-state').getByText('本地领先', { exact: false }).isVisible(), true)
  assert.equal(await desktop.getByRole('button', { name: '拉取代码' }).isDisabled(), true)
  await desktop.getByRole('button', { name: '获取远端' }).click()
  report.checks.push({ name: 'desktop renders repository sync controls, branch state, task attribution and TestAgent verification', pass: true })
  await capture(desktop, 'desktop-change-overview')

  await desktop.getByTitle('左右对比').click()
  assert.equal(await desktop.locator('.split-head').isVisible(), true)
  report.checks.push({ name: 'split diff renders two stable code columns', pass: true })
  await capture(desktop, 'desktop-split-diff')

  await desktop.getByLabel('选择 frontend/src/components/tools/CodeChanges.vue').check()
  await desktop.getByLabel('选择 backend/modules/tools/git.ts').check()
  await desktop.locator('.commit-button').click()
  await desktop.getByText('只提交你明确选择的文件', { exact: true }).waitFor()
  assert.equal(await desktop.getByText('暂存区另有 1 个未选文件，本次不会带入', { exact: true }).isVisible(), true)
  const commitPanel = desktop.locator('.commit-panel')
  assert.equal(await commitPanel.getByRole('button', { name: '提交代码' }).isDisabled(), true)
  assert.equal(await commitPanel.getByRole('button', { name: '提交并推送' }).isDisabled(), true)
  await commitPanel.getByPlaceholder('说明这次改动解决了什么').fill('feat: 完善 Git 工作流')
  await commitPanel.getByText('已运行相关验证', { exact: true }).click()
  await commitPanel.getByText('我已核对上述文件范围、风险和验证状态', { exact: true }).click()
  assert.equal(await commitPanel.getByRole('button', { name: '提交代码' }).isEnabled(), true)
  assert.equal(await commitPanel.getByRole('button', { name: '提交并推送' }).isEnabled(), true)
  report.checks.push({ name: 'commit preview exposes separate commit and commit-and-push actions after explicit review', pass: true })
  await capture(desktop, 'desktop-commit-preview')

  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await prepare(mobile)
  await noOverflow(mobile, 'mobile')
  const mobilePaneContract = await mobile.evaluate(() => ({
    workbenchOverflow: getComputedStyle(document.querySelector('.code-changes-workbench')).overflowY,
    fileOverflow: getComputedStyle(document.querySelector('.file-scroll')).overflowY,
    diffOverflow: getComputedStyle(document.querySelector('.diff-viewer')).overflowY,
    fileHeight: Math.round(document.querySelector('.change-files').getBoundingClientRect().height),
    diffHeight: Math.round(document.querySelector('.diff-pane').getBoundingClientRect().height),
  }))
  assert.equal(mobilePaneContract.workbenchOverflow, 'auto')
  assert.equal(mobilePaneContract.fileOverflow, 'auto')
  assert.equal(mobilePaneContract.diffOverflow, 'auto')
  assert.ok(Math.abs(mobilePaneContract.fileHeight - mobilePaneContract.diffHeight) <= 1, JSON.stringify(mobilePaneContract))
  assert.equal(await mobile.getByText(`${files.length} 个文件等待处理`, { exact: true }).isVisible(), true)
  assert.equal(await mobile.locator('.file-scroll').isVisible(), true)
  assert.equal(await mobile.locator('.grouping-switch').getByRole('button', { name: '目录' }).isVisible(), true)
  assert.equal(await mobile.getByTitle('左右对比').isVisible(), false)
  const remoteButtons = await mobile.locator('.repository-actions button').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect()
    return { text: node.textContent.trim(), left: rect.left, right: rect.right, width: rect.width, visible: getComputedStyle(node).visibility !== 'hidden' && rect.width > 0 }
  }))
  assert.equal(remoteButtons.length, 3)
  assert.ok(remoteButtons.every(button => button.visible && button.left >= 0 && button.right <= 390), JSON.stringify(remoteButtons))
  assert.ok(remoteButtons[0].right <= remoteButtons[1].left + 1 && remoteButtons[1].right <= remoteButtons[2].left + 1, JSON.stringify(remoteButtons))
  report.checks.push({ name: 'mobile keeps repository actions, directory grouping, summary and unified diff usable without horizontal overflow', pass: true })
  await capture(mobile, 'mobile-change-workbench')

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
