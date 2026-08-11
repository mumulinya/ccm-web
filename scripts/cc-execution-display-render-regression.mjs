import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { startPlaywrightAppServer } from './playwright-app-server.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'scratch', 'cc-execution-display-render')
const { server, baseUrl } = await startPlaywrightAppServer(root, { port: Number(process.env.CCM_CC_DISPLAY_PORT || 3094) })
let browser

async function launchBrowser() {
  try { return await chromium.launch() } catch (firstError) {
    for (const channel of ['chrome', 'msedge']) {
      try { return await chromium.launch({ channel }) } catch {}
    }
    throw firstError
  }
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ scrollWidth:document.documentElement.scrollWidth, clientWidth:document.documentElement.clientWidth }))
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, `${label}存在横向溢出：${JSON.stringify(dimensions)}`)
}

try {
  await fs.rm(outputDir, { recursive:true, force:true })
  await fs.mkdir(outputDir, { recursive:true })
  browser = await launchBrowser()

  const desktop = await browser.newPage({ viewport:{ width:1280, height:850 }, deviceScaleFactor:1 })
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await desktop.goto(`${baseUrl}/visual-regression/agent-execution-transcript-fixture.html`, { waitUntil:'networkidle' })
  assert.equal(await desktop.getByText('正在思考…', { exact:true }).isVisible(), true, '普通处理中必须使用紧凑中性状态')
  assert.equal((await desktop.locator('.pending-message').innerText()).includes('项目主 Agent'), false, '普通处理中不得提前显示任务化文案')
  assert.equal(await desktop.locator('.ordinary-message .cc-execution').count(), 0, '普通对话默认不得显示执行卡片')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-head').count(), 0, '任务运行中不得显示执行记录入口')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-rows').count(), 1, '任务运行中必须直接显示实时过程')
  assert.match((await desktop.locator('.running-task-message .cc-live-execution-status').innerText()).replace(/\s+/g, ' '), /^已处理 .+ · 项目 Agent$/, '运行态顶部必须显示处理时间和当前阶段')
  assert.equal(await desktop.locator('.running-task-message .cc-requirement-navigator').count(), 0, '运行态不得重复显示重型阶段导航卡')
  assert.equal(await desktop.locator('.running-task-message .cc-requirement-plan').count(), 0, '有精确锚点的运行计划不得在消息施工区重复展示')
  assert.equal(await desktop.locator('.composer-fixture .active-task-plan-dock').isVisible(), true, '用户可读计划必须移动到输入框上方导航器')
  assert.equal(await desktop.locator('.composer-fixture').getByText('完善后台管理端', { exact:true }).isVisible(), true, '计划导航器必须展示简洁业务目标而不是泛化计划标题')
  assert.equal(await desktop.locator('.composer-fixture').getByText('补充项目启动识别能力', { exact:true }).count(), 0, '排队任务不得进入当前计划导航器')
  assert.equal(await desktop.locator('.composer-fixture .active-task-plan-dock').count(), 1, '输入区上方只能展示一个当前任务计划')
  assert.equal(await desktop.locator('.composer-fixture').getByText('完善后台管理页面', { exact:true }).isVisible(), true, '计划导航器必须展示当前步骤')
  assert.equal(await desktop.locator('.running-task-message').getByText('smart-live-ui · Codex', { exact:true }).isVisible(), true, '当前项目Agent必须作为父行显示')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-stage-head').filter({ hasText:'准备与检索' }).getAttribute('aria-expanded'), 'false', '已完成阶段默认必须压缩为一行')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-stage-head').filter({ hasText:'项目 Agent' }).getAttribute('aria-expanded'), 'true', '当前阶段默认必须展开')
  assert.equal(await desktop.locator('.running-task-message').getByText('已在 4.1s 内完成 Maven 构建', { exact:true }).isVisible(), true, '已完成工具必须使用Codex风格紧凑文案')
  assert.equal(await desktop.locator('.running-task-message').getByText('正在运行 读取项目日志', { exact:true }).isVisible(), true, '运行中工具必须原位显示')
  assert.match(await desktop.locator('.running-task-message .cc-execution-row').filter({ hasText:'正在运行 读取项目日志' }).innerText(), /已运行 \d+(?:\.\d+)?s/, '超过2秒的工具必须在原行显示实时耗时')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-running.png'), fullPage:true })
  await desktop.locator('.running-task-message .cc-execution-row').filter({ hasText:'Maven 构建' }).locator('.cc-execution-row-summary').click()
  assert.equal(await desktop.locator('.running-task-message').getByText('参数', { exact:true }).isVisible(), true, '实时工具行必须可以展开安全详情')
  assert.ok((await desktop.locator('.composer-fixture .active-task-plan-dock').evaluate(node => parseFloat(getComputedStyle(node).borderTopWidth))) <= 1, '计划导航器必须保持轻量边框')
  assert.equal(await desktop.locator('.task-message .answer').isVisible(), true, '完成后必须先显示最终回答')
  assert.equal(await desktop.locator('.task-message .cc-completion-files').isVisible(), true, '完成后必须显示文件改动卡')
  assert.equal(await desktop.locator('.task-message').getByText('已编辑 4 个文件', { exact:true }).isVisible(), true)
  assert.equal(await desktop.locator('.task-message .cc-completion-file-row').count(), 3, '文件卡默认只显示前三项')
  assert.equal(await desktop.locator('.task-message .cc-execution-rows').count(), 0, '完成后的执行记录默认必须折叠')
  const completionOrder = await desktop.locator('.task-message').evaluate(node => ({ answer:[...node.children].findIndex(child => child.classList.contains('answer')), files:[...node.children].findIndex(child => child.querySelector?.('.cc-completion-files')), execution:[...node.children].findIndex(child => child.querySelector?.('.cc-execution')) }))
  assert.ok(completionOrder.answer < completionOrder.files && completionOrder.files <= completionOrder.execution, `完成态顺序错误：${JSON.stringify(completionOrder)}`)
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-collapsed.png'), fullPage:true })
  await desktop.locator('.ordinary-message').hover()
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.ordinary-message .cc-execution').count(), 1, 'Ctrl+O必须显示普通对话的安全技术记录')
  assert.equal(await desktop.getByText('正在组织回复', { exact:true }).isVisible(), true)
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.ordinary-message .cc-execution').count(), 0, '再次Ctrl+O必须恢复普通对话轻量视图')
  await desktop.locator('.task-message .cc-completion-file-row').first().click()
  assert.equal(await desktop.locator('.opened-file').textContent(), 'docs/FEATURE.md', '单文件点击必须按稳定排序投递权威Diff打开请求')
  await desktop.locator('.task-message .cc-completion-review').click()
  assert.equal(await desktop.locator('.opened-batch').textContent(), '4', '审核必须投递整批文件')
  await desktop.locator('.task-message .cc-completion-files-more').click()
  assert.equal(await desktop.locator('.task-message .cc-completion-file-row').count(), 4, '展开后必须显示剩余文件')
  await desktop.locator('.task-message .cc-execution-head').click()
  assert.equal(await desktop.getByText('Find definition', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.getByText('2 项工具并行', { exact:true }).isVisible(), true)
  assert.equal((await desktop.locator('body').innerText()).includes('结果约 240 tokens'), true)
  assert.equal((await desktop.locator('body').innerText()).includes('模型'), true)
  assert.equal(await desktop.getByText('smart-live-ui · Codex', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.getByText('CCM 已完成终态验收', { exact:true }).isVisible(), true)
  assert.equal(await desktop.locator('.task-message').getByText('已提交结果，等待 CCM 验收', { exact:true }).count(), 0, 'Agent完成后不得保留旧等待状态行')
  assert.equal(await desktop.locator('.task-message .cc-execution-row').filter({ hasText:'独立验收通过' }).getByText('TestAgent', { exact:true }).isVisible(), true)
  assert.equal(await desktop.getByText('主 Agent 验收与总结', { exact:true }).isVisible(), true)
  assert.equal(await desktop.getByText('最终交付总结已完成', { exact:true }).isVisible(), true)
  await desktop.locator('.task-message .cc-execution-row-summary').first().click()
  assert.equal(await desktop.getByText('参数', { exact:true }).first().isVisible(), true)
  assert.equal((await desktop.locator('body').innerText()).includes('PRIVATE_HANDOFF_SENTINEL'), false)
  await noOverflow(desktop, 'desktop')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-expanded.png'), fullPage:true })
  await desktop.locator('.task-message').hover()
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.task-message .cc-execution-rows').count(), 0, 'Ctrl+O必须只切换当前完成消息')
  assert.deepEqual(desktopErrors, [])

  const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await mobile.goto(`${baseUrl}/visual-regression/agent-execution-transcript-fixture.html`, { waitUntil:'networkidle' })
  await mobile.screenshot({ path:path.join(outputDir, 'mobile-running.png'), fullPage:true })
  await mobile.locator('.task-message .cc-execution-head').click()
  await noOverflow(mobile, 'mobile')
  assert.equal(await mobile.getByText('Find definition', { exact:true }).first().isVisible(), true)
  assert.equal(await mobile.locator('.cc-execution-head kbd:visible').count(), 0, '移动端不应显示键盘提示')
  await mobile.screenshot({ path:path.join(outputDir, 'mobile-expanded.png'), fullPage:true })
  assert.deepEqual(mobileErrors, [])

  console.log(JSON.stringify({ pass:true, schema:'ccm-cc-execution-display-render-regression-v1', baseUrl, screenshots:(await fs.readdir(outputDir)).sort().map(name => path.join(outputDir, name)), checks:{ liveCompactProjection:true, desktopCollapsed:true, desktopExpanded:true, ctrlO:true, mobileResponsive:true, noSensitiveText:true } }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
