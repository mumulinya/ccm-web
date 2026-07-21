import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = process.env.CCM_BASE_URL || 'http://127.0.0.1:3080'
const outputDir = path.join(root, 'docs', 'group-memory-cc-parity', 'memory-center-task-agent-project-grouping-2026-07-21', 'evidence')
fs.mkdirSync(outputDir, { recursive: true })

const response = await fetch(`${baseUrl}/api/memory-center/overview`)
assert.equal(response.ok, true)
const overview = await response.json()
const tasks = Array.isArray(overview.tasks) ? overview.tasks : []
const expectedProjects = [...new Set(tasks.map(item => String(item.projectId || '')).filter(Boolean))].sort()
assert.ok(tasks.length > 0, 'real Memory Center API must expose task Agent sessions')
assert.ok(expectedProjects.length > 0, 'task Agent sessions must expose authoritative projectId')

const candidates = [
  process.env.PLAYWRIGHT_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find(candidate => fs.existsSync(candidate))
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
await page.locator('.app-container').waitFor({ state: 'visible' })
const memoryNav = page.getByText('记忆控制中心', { exact: true })
assert.equal(await memoryNav.count(), 1)
await memoryNav.click()

const center = page.locator('.memory-center')
await center.waitFor({ state: 'visible' })
const taskGroup = center.locator('[data-scope-kind="task-agent"]')
await taskGroup.waitFor({ state: 'visible' })

const desktopBefore = await page.evaluate(() => {
  const section = document.querySelector('[data-scope-kind="task-agent"]')
  return {
    projectIds: [...section.querySelectorAll(':scope > details')].map(item => item.getAttribute('data-project-id')).sort(),
    projectSessionCounts: [...section.querySelectorAll(':scope > details')].map(item => ({
      id: item.getAttribute('data-project-id'),
      count: item.querySelectorAll('.scope-children > button').length,
    })),
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sidebarOverflow: document.querySelector('.scope-list').scrollWidth - document.querySelector('.scope-list').clientWidth,
  }
})
assert.deepEqual(desktopBefore.projectIds, expectedProjects)
assert.equal(desktopBefore.projectSessionCounts.reduce((sum, item) => sum + item.count, 0), tasks.length)
assert.ok(desktopBefore.documentOverflow <= 1)
assert.ok(desktopBefore.sidebarOverflow <= 1)

const firstProject = taskGroup.locator(':scope > details').first()
await firstProject.locator(':scope > summary').click()
assert.equal(await firstProject.getAttribute('open'), '')
const visibleLabels = await firstProject.locator('.scope-children > button strong').allTextContents()
assert.ok(visibleLabels.length > 0)
assert.ok(visibleLabels.every(label => /Claude Code|Codex|Cursor|Gemini CLI|OpenCode|开发 Agent/.test(label)))
await taskGroup.evaluate(element => {
  const sidebar = element.closest('.scope-list')
  sidebar.scrollTop = Math.max(0, element.offsetTop - 8)
})
await page.screenshot({ path: path.join(outputDir, '01-task-agent-project-groups-desktop.png') })

await page.setViewportSize({ width: 390, height: 844 })
await taskGroup.evaluate(element => {
  const sidebar = element.closest('.scope-list')
  sidebar.scrollTop = Math.max(0, element.offsetTop - 8)
})
const mobile = await page.evaluate(() => ({
  documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  sidebarOverflow: document.querySelector('.scope-list').scrollWidth - document.querySelector('.scope-list').clientWidth,
  taskGroupVisible: getComputedStyle(document.querySelector('[data-scope-kind="task-agent"]')).display !== 'none',
  projectCount: document.querySelectorAll('[data-scope-kind="task-agent"] > details').length,
}))
assert.ok(mobile.documentOverflow <= 1)
assert.ok(mobile.sidebarOverflow <= 1)
assert.equal(mobile.taskGroupVisible, true)
assert.equal(mobile.projectCount, expectedProjects.length)
await page.screenshot({ path: path.join(outputDir, '02-task-agent-project-groups-mobile.png') })

assert.deepEqual(errors, [])
const report = {
  pass: true,
  taskSessions: tasks.length,
  projects: expectedProjects,
  desktop: desktopBefore,
  mobile,
}
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
await browser.close()
console.log(JSON.stringify(report, null, 2))
