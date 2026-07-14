import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.CCM_LIVE_BASE_URL || 'http://127.0.0.1:3080'
const outputDir = path.join(process.cwd(), 'scratch', 'task-replay-regression')

async function launchBrowser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome', 'msedge']) { try { return await chromium.launch({ channel }) } catch {} }
    throw error
  }
}

let browser
try {
  const indexResponse = await fetch(`${baseUrl}/api/tasks/replay?limit=5`)
  const indexPayload = await indexResponse.json()
  const target = indexPayload?.index?.tasks?.[0]
  if (!indexResponse.ok || !target?.id) throw new Error('live replay index has no task')
  const replayResponse = await fetch(`${baseUrl}/api/tasks/replay?task_id=${encodeURIComponent(target.id)}`)
  const replayPayload = await replayResponse.json()
  if (!replayResponse.ok || replayPayload?.replay?.schema !== 'ccm-complete-task-replay-v1') throw new Error('live replay API did not return the complete-task schema')

  browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`) })
  await page.addInitScript(value => localStorage.setItem('trace-replay-target', JSON.stringify(value)), { task_id: target.id, trace_id: target.trace_id || '', scope: 'orchestrator' })
  await page.goto(`${baseUrl}/?tab=trace-replay&taskId=${encodeURIComponent(target.id)}`, { waitUntil: 'domcontentloaded' })
  if (await page.locator('.nav-item').filter({ hasText: '任务回放' }).count()) throw new Error('task replay should not remain as a standalone sidebar item')
  await page.getByRole('heading', { name: replayPayload.replay.title }).waitFor({ state: 'visible', timeout: 30000 })
  const defaultCount = await page.locator('.timeline-event').count()
  if (!defaultCount) throw new Error('live replay rendered no business timeline events')
  const toggle = page.locator('.system-event-toggle input')
  await toggle.check()
  const expandedCount = await page.locator('.timeline-event').count()
  if (expandedCount < defaultCount) throw new Error('enabling low-level events reduced the timeline')
  await toggle.uncheck()
  if (errors.length) throw new Error(`live page errors:\n${errors.join('\n')}`)
  await fs.mkdir(outputDir, { recursive: true })
  const screenshot = path.join(outputDir, '05-live-task-replay.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  console.log(JSON.stringify({ pass: true, baseUrl, taskId: target.id, title: replayPayload.replay.title, apiEvents: replayPayload.replay.summary.event_count, defaultRenderedEvents: defaultCount, allRenderedEvents: expandedCount, screenshot }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
