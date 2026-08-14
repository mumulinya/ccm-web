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
  assert.equal(await desktop.locator('.running-task-message .cc-execution-density select').count(), 0, '运行中必须保持完整施工反馈，不显示完成态密度选择器')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-rows').count(), 1, '任务运行中必须直接显示实时过程')
  assert.match((await desktop.locator('.running-task-message .cc-live-execution-status').innerText()).replace(/\s+/g, ' '), /^已处理 .+$/, '运行态顶部只显示处理时间，不重复固定阶段目录')
  assert.equal(await desktop.locator('.running-task-message .cc-requirement-navigator').count(), 0, '运行态不得重复显示重型阶段导航卡')
  assert.equal(await desktop.locator('.running-task-message .cc-requirement-plan').count(), 0, '有精确锚点的运行计划不得在消息施工区重复展示')
  assert.equal(await desktop.locator('.composer-fixture .active-task-plan-dock').isVisible(), true, '用户可读计划必须移动到输入框上方导航器')
  assert.equal(await desktop.locator('.composer-fixture').getByText('完善后台管理端', { exact:true }).isVisible(), true, '计划导航器必须展示简洁业务目标而不是泛化计划标题')
  assert.equal(await desktop.locator('.composer-fixture').getByText('补充项目启动识别能力', { exact:true }).count(), 0, '排队任务不得进入当前计划导航器')
  assert.equal(await desktop.locator('.composer-fixture .active-task-plan-dock').count(), 1, '输入区上方只能展示一个当前任务计划')
  assert.equal(await desktop.locator('.composer-fixture').getByText('完善后台管理页面', { exact:true }).isVisible(), true, '计划导航器必须展示当前步骤')
  assert.equal(await desktop.locator('.running-task-message').getByText('smart-live-ui · Codex', { exact:true }).isVisible(), true, '当前项目Agent必须作为父行显示')
  assert.equal(await desktop.locator('.running-task-message .cc-execution-stage-head').count(), 0, '运行态不得展示完成态固定阶段目录')
  assert.equal(await desktop.locator('.running-task-message').getByText('已在 4.1s 内完成 Maven 构建', { exact:true }).isVisible(), true, '独立的已完成工具必须保留Codex风格紧凑文案')
  assert.equal(await desktop.locator('.running-task-message').getByText('正在运行 读取项目日志', { exact:true }).isVisible(), true, '运行中工具必须原位显示')
  assert.match(await desktop.locator('.running-task-message .cc-execution-row').filter({ hasText:'正在运行 读取项目日志' }).innerText(), /已运行 \d+(?:\.\d+)?s/, '超过2秒的工具必须在原行显示实时耗时')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-running.png'), fullPage:true })
  await desktop.locator('.running-task-message .cc-execution-row').filter({ hasText:'Maven 构建' }).locator('.cc-execution-row-summary').click()
  assert.equal(await desktop.locator('.running-task-message').getByText('技术详情', { exact:true }).isVisible(), true, '实时工具行必须先展示用户详情并提供二次技术展开')
  assert.ok((await desktop.locator('.composer-fixture .active-task-plan-dock').evaluate(node => parseFloat(getComputedStyle(node).borderTopWidth))) <= 1, '计划导航器必须保持轻量边框')
  assert.equal(await desktop.locator('.task-message .answer').isVisible(), true, '完成后必须先显示最终回答')
  assert.equal(await desktop.locator('.task-message .cc-completion-files').isVisible(), true, '完成后必须显示文件改动卡')
  assert.equal(await desktop.locator('.task-message').getByText('已编辑 4 个文件', { exact:true }).isVisible(), true)
  assert.equal(await desktop.locator('.task-message .cc-completion-file-row').count(), 0, '文件变化默认必须收成紧凑一行')
  assert.equal(await desktop.locator('.task-message .cc-execution-rows').count(), 0, '完成后的执行记录默认必须折叠')
  assert.match((await desktop.locator('.task-message .cc-execution-head').innerText()).replace(/\s+/g, ' '), /执行记录.*修改 4 个文件.*总耗时 17 秒/, '折叠态必须用一行展示有效结果和耗时')
  await desktop.locator('.task-message .cc-execution-density select').selectOption('summary')
  assert.equal(await desktop.locator('.task-message .cc-execution-density select').inputValue(), 'summary', '执行展示密度必须跨消息和会话共享偏好')
  await desktop.locator('.task-message .cc-execution-density select').selectOption('standard')
  assert.ok((await desktop.locator('.task-message .cc-execution').evaluate(node => parseFloat(getComputedStyle(node).borderRadius))) <= 10, '完成态执行记录只允许轻量圆角')
  const completionOrder = await desktop.locator('.task-message').evaluate(node => ({ answer:[...node.children].findIndex(child => child.classList.contains('answer')), files:[...node.children].findIndex(child => child.querySelector?.('.cc-completion-files')), execution:[...node.children].findIndex(child => child.querySelector?.('.cc-execution')) }))
  assert.ok(completionOrder.answer < completionOrder.files && completionOrder.files <= completionOrder.execution, `完成态顺序错误：${JSON.stringify(completionOrder)}`)
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-collapsed.png'), fullPage:true })
  await desktop.locator('.ordinary-message').hover()
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.ordinary-message .cc-execution').count(), 0, '已移除的Ctrl+O不得重新打开普通对话执行记录')
  await desktop.locator('.task-message .cc-completion-files-toggle').click()
  assert.equal(await desktop.locator('.task-message .cc-completion-file-row').count(), 4, '点击文件变化后必须展开真实文件列表')
  await desktop.locator('.task-message .cc-completion-file-row').first().click()
  assert.equal(await desktop.locator('.opened-file').textContent(), 'docs/FEATURE.md', '单文件点击必须按稳定排序投递权威Diff打开请求')
  await desktop.locator('.task-message .cc-completion-review').click()
  assert.equal(await desktop.locator('.opened-batch').textContent(), '4', '审核必须投递整批文件')
  await desktop.locator('.task-message .cc-execution-head').click()
  assert.equal(await desktop.locator('.task-message .cc-execution-stage-head').count(), 3, '展开执行记录后应先显示轻量阶段时间线')
  assert.equal(await desktop.locator('.task-message').getByText('Find definition', { exact:true }).count(), 0, '阶段未展开时不应直接铺开工具详情')
  await desktop.locator('.task-message .cc-execution-stage-head').first().scrollIntoViewIfNeeded()
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-stage-timeline.png'), fullPage:true })
  await desktop.locator('.task-message .cc-execution-stage-head').filter({ hasText:'了解情况' }).click()
  const syntheticBatch = desktop.locator('.task-message .cc-progress-batch-head').filter({ hasText:'已检查代码和配置' })
  assert.equal(await syntheticBatch.count(), 1, '没有主动说明的真实并行工具必须自动合并为结果批次')
  assert.match((await syntheticBatch.innerText()).replace(/\s+/g, ' '), /2项 · 并行/, '并行批次必须明确展示工具数量和并行语义')
  assert.equal(await syntheticBatch.getAttribute('aria-expanded'), 'false', '成功批次在完成态必须默认收起')
  await syntheticBatch.click()
  const syntheticChildren = desktop.locator('.task-message .cc-execution-row.batch-child').filter({ hasText:'src/modules/erp' })
  assert.equal(await syntheticChildren.count(), 2, '展开并行批次后必须显示全部真实子工具')
  assert.equal(await syntheticChildren.nth(0).getByText('查找目录', { exact:true }).isVisible(), true, '并行批次必须优先展示查找与搜索操作')
  assert.equal(await syntheticChildren.nth(1).getByText('批量读取项目文件', { exact:true }).isVisible(), true, '并行批次必须在查找后展示读取操作')
  assert.equal(await syntheticChildren.getByText('完成', { exact:true }).count(), 0, '成功子工具不得重复显示完成状态')
  await desktop.locator('.task-message .cc-progress-batch-head').first().click()
  assert.equal(await desktop.getByText('查找定义', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.locator('.task-message .cc-progress-batch-head').first().isVisible(), true)
  assert.equal((await desktop.locator('body').innerText()).includes('结果约 240 tokens'), true)
  assert.equal((await desktop.locator('body').innerText()).includes('模型'), true)
  await desktop.locator('.task-message .cc-execution-stage-head').filter({ hasText:'实施处理' }).click()
  assert.equal(await desktop.getByText('smart-live-ui · Codex', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.getByText('CCM 已完成终态验收', { exact:true }).isVisible(), true)
  assert.equal(await desktop.locator('.task-message').getByText('已提交结果，等待 CCM 验收', { exact:true }).count(), 0, 'Agent完成后不得保留旧等待状态行')
  await desktop.locator('.task-message .cc-execution-stage-head').filter({ hasText:'验证与交付' }).click()
  assert.equal(await desktop.locator('.task-message .cc-execution-row').filter({ hasText:'独立验收通过' }).getByText('TestAgent', { exact:true }).isVisible(), true)
  assert.equal(await desktop.getByText('验证与交付', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.getByText('最终交付总结已完成', { exact:true }).first().isVisible(), true)
  assert.equal(await desktop.locator('.task-message .cc-attempt-history-head').isVisible(), true, '历史返工必须集中显示在执行记录底部')
  assert.equal(await desktop.locator('.task-message').getByText('历史尝试', { exact:true }).count(), 1, '历史尝试不得在项目 Agent 详情中重复展示')
  await desktop.locator('.task-message .cc-attempt-history-head').click()
  assert.match(await desktop.locator('.task-message .cc-attempt-history-list').innerText(), /smart-live-ui[\s\S]*第 1 次/, '集中历史尝试必须按项目和尝试展示真实历史摘要')
  await desktop.locator('.task-message .cc-execution-row-summary').first().click()
  assert.equal(await desktop.locator('.task-message .tool-result-detail').first().isVisible(), true, '工具行必须展开共享的用户可读详情')
  assert.equal((await desktop.locator('body').innerText()).includes('PRIVATE_HANDOFF_SENTINEL'), false)
  await noOverflow(desktop, 'desktop')
  await desktop.screenshot({ path:path.join(outputDir, 'desktop-expanded.png'), fullPage:true })
  await desktop.locator('.task-message').hover()
  await desktop.keyboard.press('Control+O')
  assert.equal(await desktop.locator('.task-message .cc-execution-rows').count(), 1, '已移除的Ctrl+O不得改变当前完成消息的展开状态')
  assert.deepEqual(desktopErrors, [])

  const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await mobile.goto(`${baseUrl}/visual-regression/agent-execution-transcript-fixture.html`, { waitUntil:'networkidle' })
  await mobile.screenshot({ path:path.join(outputDir, 'mobile-running.png'), fullPage:true })
  await mobile.locator('.task-message .cc-execution-head').click()
  await noOverflow(mobile, 'mobile')
  assert.equal(await mobile.locator('.task-message .cc-execution-stage-head').count(), 3, '移动端应先显示紧凑阶段时间线')
  await mobile.locator('.task-message .cc-execution-stage-head').filter({ hasText:'了解情况' }).click()
  await mobile.locator('.task-message .cc-progress-batch-head').first().click()
  assert.equal(await mobile.getByText('查找定义', { exact:true }).first().isVisible(), true)
  assert.equal(await mobile.locator('.cc-execution-head kbd:visible').count(), 0, '移动端不应显示键盘提示')
  await mobile.screenshot({ path:path.join(outputDir, 'mobile-expanded.png'), fullPage:true })
  assert.deepEqual(mobileErrors, [])

  console.log(JSON.stringify({ pass:true, schema:'ccm-cc-execution-display-render-regression-v1', baseUrl, screenshots:(await fs.readdir(outputDir)).sort().map(name => path.join(outputDir, name)), checks:{ liveCompactProjection:true, desktopCollapsed:true, desktopExpanded:true, legacyShortcutRemoved:true, mobileResponsive:true, noSensitiveText:true } }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
