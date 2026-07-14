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
]
const raw = `diff --git a/frontend/src/components/tools/CodeChanges.vue b/frontend/src/components/tools/CodeChanges.vue\nindex 123..456 100644\n--- a/frontend/src/components/tools/CodeChanges.vue\n+++ b/frontend/src/components/tools/CodeChanges.vue\n@@ -10,3 +10,4 @@\n const files = ref([])\n-const message = ref('提交')\n+const message = ref('检查并提交')\n+const preview = ref(null)\n const branch = ref('main')`
const hunks = [{ header: '@@ -10,3 +10,4 @@', oldStart: 10, oldLines: 3, newStart: 10, newLines: 4, context: '', changes: [{ type: 'context', content: 'const files = ref([])' }, { type: 'remove', content: "const message = ref('提交')" }, { type: 'add', content: "const message = ref('检查并提交')" }, { type: 'add', content: 'const preview = ref(null)' }, { type: 'context', content: "const branch = ref('main')" }] }]

const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
const prepare = async page => {
  page.on('pageerror', error => report.errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') report.errors.push(`console: ${message.text()}`) })
  await page.route('**/api/projects', route => route.fulfill(json({ projects: [{ name: 'coordinator', running: true }] })))
  await page.route('**/api/git/status*', route => route.fulfill(json({ success: true, branch: 'feature/code-workbench', files, summary: { total: 3, additions: 178, deletions: 43, staged: 1, unstaged: 3, untracked: 1, conflicts: 0, modules: ['frontend', 'backend', 'docs'], riskLevel: 'medium', warnings: ['1 个未跟踪文件需要确认'] }, context: { attribution: 'exact', tasks: [{ taskId: 'task-code-workbench', title: '完善代码变更工作台', status: 'in_progress', agent: 'codex', traceId: 'trace-code-workbench', exactFiles: files.map(file => file.path), association: 'exact', verification: ['npm run build:frontend'] }], latestTestAgent: { status: 'passed', recommendation: 'accept', summary: '浏览器与接口检查通过', browserChecks: 4 } } })))
  await page.route('**/api/git/diff*', route => route.fulfill(json({ success: true, raw, hunks, additions: 2, deletions: 1 })))
  await page.route('**/api/git/commit-preview', route => route.fulfill(json({ success: true, preview: { files: [files[0], files[1]], outsideStaged: ['README.md'], conflicts: [], blocked: false, warnings: ['暂存区还有 1 个未选文件，本次不会提交'] } })))
  await page.route('**/api/git/log*', route => route.fulfill(json({ success: true, commits: [{ hash: 'abcdef123', shortHash: 'abcdef1', author: 'CCM', timestamp: '2026-07-14T08:00:00.000Z', message: 'feat: 完善代码变更工作台' }] })))
  await page.goto(`${baseUrl}/?tab=changes`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.code-changes-workbench').waitFor({ timeout: 20_000 })
  await page.getByText('3 个文件等待处理', { exact: true }).waitFor()
}
const noOverflow = async (page, label) => {
  const metrics = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, root: document.querySelector('.code-changes-workbench')?.scrollWidth || 0, rootWidth: document.querySelector('.code-changes-workbench')?.clientWidth || 0 }))
  assert.ok(metrics.scroll <= metrics.width + 1, `${label} document overflow`)
  assert.ok(metrics.root <= metrics.rootWidth + 1, `${label} workbench overflow`)
}
const capture = async (page, name) => { const file = path.join(outputDir, `${name}.png`); await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file) }

try {
  const desktop = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage()
  await prepare(desktop)
  await noOverflow(desktop, 'desktop')
  assert.equal(await desktop.getByText('TestAgent 已通过', { exact: true }).isVisible(), true)
  assert.equal(await desktop.getByText('文件记录精确匹配', { exact: false }).isVisible(), true)
  report.checks.push({ name: 'desktop renders user summary, exact task attribution and TestAgent verification before technical diff', pass: true })
  await capture(desktop, 'desktop-change-overview')

  await desktop.getByTitle('左右对比').click()
  assert.equal(await desktop.locator('.split-head').isVisible(), true)
  report.checks.push({ name: 'split diff renders two stable code columns', pass: true })
  await capture(desktop, 'desktop-split-diff')

  await desktop.getByLabel('选择 frontend/src/components/tools/CodeChanges.vue').check()
  await desktop.getByLabel('选择 backend/modules/tools/git.ts').check()
  await desktop.getByRole('button', { name: /检查并提交/ }).click()
  await desktop.getByText('只提交你明确选择的文件', { exact: true }).waitFor()
  assert.equal(await desktop.getByText('暂存区另有 1 个未选文件，本次不会带入', { exact: true }).isVisible(), true)
  assert.equal(await desktop.getByRole('button', { name: '确认提交' }).isDisabled(), true)
  report.checks.push({ name: 'commit preview excludes outside staged files and requires message, verification and review acknowledgement', pass: true })
  await capture(desktop, 'desktop-commit-preview')

  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await prepare(mobile)
  await noOverflow(mobile, 'mobile')
  assert.equal(await mobile.getByText('3 个文件等待处理', { exact: true }).isVisible(), true)
  assert.equal(await mobile.locator('.file-scroll').isVisible(), true)
  assert.equal(await mobile.getByTitle('左右对比').isVisible(), false)
  report.checks.push({ name: 'mobile keeps summary, grouped files and unified diff usable without horizontal page overflow', pass: true })
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
