import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'agent-final-answer-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_FINAL_ANSWER_PORT || 3098) })
let browser

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

try {
  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })
  browser = await launchBrowser()
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseUrl}/visual-regression/agent-final-answer-fixture.html`, { waitUntil: 'networkidle' })

  assert.equal(await page.locator('.ordinary h1').innerText(), 'CCM Workspace')
  assert.equal(await page.locator('.ordinary strong').innerText(), '多 Agent 协作平台')
  assert.equal((await page.locator('.ordinary pre code').innerText()).trim(), "const safe = true\nconsole.log('markdown code block')")
  assert.equal(await page.locator('.ordinary img').count(), 0, 'Agent Markdown不得渲染模型提供的图片标签')
  assert.equal(await page.evaluate(() => window.__agentAnswerXss === true), false, '恶意Markdown不得执行')
  assert.equal(await page.locator('.ordinary').getByText('危险链接', { exact: true }).getAttribute('href'), null, '危险协议必须移除')
  assert.equal(await page.locator('.ordinary').getByText('安全链接', { exact: true }).getAttribute('target'), '_blank')
  assert.equal(await page.locator('.ordinary').getByText('@project-agent', { exact: true }).count(), 1, 'Mention必须保留并安全高亮')

  const ordinaryMetrics = await page.locator('.ordinary .agent-final-answer').evaluate(node => ({ overflowY: getComputedStyle(node).overflowY, height: node.clientHeight, scrollHeight: node.scrollHeight, border: getComputedStyle(node).borderTopWidth }))
  assert.equal(ordinaryMetrics.overflowY, 'visible')
  assert.equal(ordinaryMetrics.height, ordinaryMetrics.scrollHeight)
  assert.equal(ordinaryMetrics.border, '0px')

  await page.locator('.streaming .agent-final-answer').evaluate(node => { node.dataset.fixtureIdentity = 'same-stream-node' })
  assert.equal(await page.locator('.streaming .agent-final-answer__cursor').count(), 1)
  await page.getByRole('button', { name: '完成流式' }).click()
  assert.equal(await page.locator('.streaming .agent-final-answer').getAttribute('data-fixture-identity'), 'same-stream-node', '流式完成不得替换回答根节点')
  assert.equal(await page.locator('.streaming .agent-final-answer__cursor').count(), 0)
  assert.match(await page.locator('.streaming').innerText(), /完成后的内容仍在同一个回答节点中/)

  const longAnswer = page.locator('.long .agent-final-answer')
  assert.equal(await longAnswer.getByRole('button', { name: '收起长回答' }).isVisible(), true)
  const expandedMetrics = await longAnswer.evaluate(node => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }))
  assert.equal(expandedMetrics.clientHeight, expandedMetrics.scrollHeight)
  await longAnswer.getByRole('button', { name: '收起长回答' }).click()
  assert.equal(await longAnswer.getByRole('button', { name: '展开全文' }).isVisible(), true)
  assert.equal(await longAnswer.locator('.agent-final-answer__content').evaluate(node => getComputedStyle(node).overflowY), 'hidden')

  assert.equal(errors.length, 0, errors.join('\n'))
  await page.screenshot({ path: path.join(outputDir, 'desktop-light.png'), fullPage: true })
  await page.getByRole('button', { name: '切换主题' }).click()
  await page.screenshot({ path: path.join(outputDir, 'desktop-dark.png'), fullPage: true })
  await page.reload({ waitUntil: 'networkidle' })
  assert.equal(await page.locator('.long').getByRole('button', { name: '展开全文' }).isVisible(), true, '长回答收起状态必须按消息恢复')

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`${baseUrl}/visual-regression/agent-final-answer-fixture.html`, { waitUntil: 'networkidle' })
  const widths = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
  assert.ok(widths.scroll <= widths.client + 1, `移动端出现横向溢出：${JSON.stringify(widths)}`)
  await mobile.screenshot({ path: path.join(outputDir, 'mobile.png'), fullPage: true })

  console.log(JSON.stringify({ pass: true, screenshots: outputDir, checks: 17 }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
