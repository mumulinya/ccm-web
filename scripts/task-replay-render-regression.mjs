import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = process.cwd()
const frontendDir = path.join(root, 'frontend')
const outputDir = path.join(root, 'scratch', 'task-replay-regression')
const port = Number(process.env.CCM_TASK_REPLAY_REGRESSION_PORT || 5177)
const fixtureUrl = `http://127.0.0.1:${port}/visual-regression/task-replay-fixture.html`
const require = createRequire(import.meta.url)

async function server() {
  const viteEntry = require.resolve('vite', { paths:[frontendDir] })
  const { createServer } = await import(pathToFileURL(viteEntry).href)
  const instance = await createServer({ root:frontendDir, server:{host:'127.0.0.1',port,strictPort:true}, logLevel:'error' })
  await instance.listen(); return instance
}
async function browser() {
  try { return await chromium.launch() } catch (error) {
    for (const channel of ['chrome','msedge']) { try { return await chromium.launch({channel}) } catch {} }
    throw error
  }
}
async function visible(locator, label) {
  try { await locator.waitFor({ state:'visible', timeout:5000 }) }
  catch { throw new Error(`${label} should be visible`) }
}

let vite, instance
try {
  await fs.rm(outputDir,{recursive:true,force:true}); await fs.mkdir(outputDir,{recursive:true})
  vite = await server(); instance = await browser()
  const page = await instance.newPage({viewport:{width:1360,height:1050},deviceScaleFactor:1})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',response=>{ if(response.status()>=400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`) })
  await page.goto(fixtureUrl,{waitUntil:'networkidle'})
  await visible(page.getByRole('heading',{name:'修复登录状态刷新丢失'}),'task replay heading')
  await page.locator('.full-replay-timeline > summary').click()
  await visible(page.getByText('全局主 Agent 分析并派发任务'),'global dispatch')
  await visible(page.getByText('群聊主 Agent 创建执行计划'),'group plan')
  await visible(page.getByText('执行前计划',{exact:true}),'plan board title')
  await visible(page.getByText('修复会话存储与路由守卫的恢复逻辑'),'plan model step')
  await visible(page.locator('.step-copy em').getByText('追加要求',{exact:true}),'plan followup tag')
  await visible(page.getByText('修复登录状态刷新丢失并通过真实验证'),'work item subject')
  await visible(page.locator('.work-receipt').filter({hasText:'已完成登录恢复修复，项目测试与浏览器验证均已完成。'}),'work item receipt')
  const planTag = page.locator('.task-replay-plan-board .task-tag').first()
  await visible(planTag,'plan board task tag')
  if ((await planTag.textContent()).trim() !== '主任务') throw new Error('root plan tag should show 主任务, not duplicate the page title')
  const workListMax = await page.evaluate(() => getComputedStyle(document.querySelector('.work-list')).maxHeight)
  if (workListMax === 'none') throw new Error('work item list must be height-constrained to protect the timeline below')

  await visible(page.getByText('用户要的是什么'),'requirement anchor')
  await visible(page.getByText('刷新页面后保持登录状态，避免用户被动退出。'),'business goal')
  await visible(page.getByText('刷新页面后仍保持登录状态'),'acceptance criteria')
  await visible(page.getByText('最后交付了什么'),'delivery anchor')
  await visible(page.getByText(/任务已完成！web 子 Agent 修复了会话存储/),'final report body')
  await visible(page.getByText('遗留缺口：建议后续补充会话过期的自动续期测试'),'review gaps')
  const deliveryCard = page.locator('.task-replay-delivery')
  await deliveryCard.getByText('执行中追加了 1 次要求').click()
  await visible(deliveryCard.locator('.block-followups li').filter({hasText:'刷新后也要保留当前筛选条件'}),'followup requirement')
  await page.getByText('过程结论（参与者、动作、验证、返工与恢复）').click()
  await visible(page.getByText('Edit 调整初始化顺序'),'executed actions')
  await visible(page.getByText('首次浏览器验证失败，按失败证据定向返工修复初始化顺序'),'rework round')
  await visible(page.getByText('主 Agent 协作计划',{exact:false}).or(page.getByText('执行前计划',{exact:true})).first(),'plan source note')
  await page.getByRole('button',{name:'查看这名成员的改动与验证'}).click()
  await visible(page.locator('#replay-evidence-code-1.focused'),'work item links to evidence instead of duplicating it')
  await visible(page.getByText('web 返回代码改动'),'project change')
  await visible(page.locator('.task-replay-timeline article').filter({hasText:'复验通过'}).first(),'test verification')
  await visible(page.locator('.task-replay-timeline article').filter({hasText:'全局主 Agent 汇总任务结果'}).first(),'final summary')
  await visible(page.getByText('web 正在执行。'),'readable execution event shown by default')
  if (await page.getByText('agent.run',{exact:true}).isVisible()) throw new Error('machine-only trace rows must stay behind the technical toggle')
  await page.locator('.system-event-toggle input').check()
  await visible(page.getByText('agent.run',{exact:true}),'technical rows appear once toggled on')
  await page.locator('.system-event-toggle input').uncheck()
  await page.evaluate(() => window.__appendTaskReplayLiveEvent())
  await visible(page.getByText('任务回放已实时同步'),'SSE incremental replay event')
  await visible(page.locator('.evidence-image-link img'),'browser screenshot evidence')
  if (await page.locator('.event-technical').filter({hasText:'未通过的验收项'}).isVisible()) throw new Error('technical details must be folded by default')
  if ((await page.locator('body').innerText()).includes('C:\\Users\\')) throw new Error('local paths leaked')
  await page.screenshot({path:path.join(outputDir,'01-complete-task-timeline-desktop.png'),fullPage:true})

  await page.getByRole('button',{name:'问题',exact:true}).click()
  await visible(page.locator('.task-replay-timeline article').filter({hasText:'首次浏览器验证失败'}).first(),'failed browser event')
  if (await page.getByText('群聊主 Agent 创建执行计划').isVisible()) throw new Error('issue filter should hide normal events')
  await page.getByRole('button',{name:'查看相关信息'}).click()
  await visible(page.locator('.event-technical summary'),'folded technical summary')
  await page.locator('.event-technical summary').click()
  await visible(page.getByText('未通过的验收项'),'expanded technical details')
  await page.locator('.replay-workspace').screenshot({path:path.join(outputDir,'02-failure-located-and-technical-expanded.png')})

  await page.getByRole('button',{name:'全部',exact:true}).click()
  const verificationEvent = page.locator('.task-replay-timeline article').filter({hasText:'复验通过'}).first()
  await verificationEvent.getByRole('button',{name:'查看相关信息'}).click()
  await verificationEvent.getByRole('button',{name:'查看验证证据'}).first().click()
  await visible(page.locator('#replay-evidence-shot-1.focused'),'focused screenshot evidence')
  await page.locator('.replay-workspace').screenshot({path:path.join(outputDir,'03-test-agent-evidence-focused.png')})

  const codeEvidence = page.locator('#replay-evidence-code-1')
  await visible(codeEvidence.getByText('1/2 个文件可查看逐行变更'),'saved line diff coverage')
  await codeEvidence.getByRole('button',{name:'查看具体代码变更'}).click()
  await visible(page.locator('.code-drawer'),'code change drawer')
  const selectedFileHeading = page.locator('.drawer-diff .diff-toolbar strong')
  await visible(selectedFileHeading,'selected changed file')
  if (!(await selectedFileHeading.textContent()).includes('frontend/src/stores/session.js')) throw new Error('selected changed file path is incorrect')
  await visible(page.locator('.diff-line.remove .line-number.old').filter({hasText:'19'}).first(),'old line number')
  await visible(page.locator('.diff-line.add .line-number.new').filter({hasText:'19'}).first(),'new line number')
  await visible(page.getByText('return cached ? JSON.parse(cached) : null'),'removed code line')
  await visible(page.getByText('const session = cached ? JSON.parse(cached) : null'),'added code line')
  await page.locator('.code-drawer').screenshot({path:path.join(outputDir,'04-code-change-line-diff.png')})
  await page.locator('.drawer-files').getByText('frontend/src/router/guard.js',{exact:true}).click()
  await visible(page.getByText('该任务当时只保存了文件与行数统计，无法还原逐行代码内容'),'historical diff unavailable explanation')
  await page.locator('.drawer-close').click()

  await page.getByRole('button',{name:'返回任务列表'}).click()
  await visible(page.locator('.replay-index-filters'),'task replay index filters')
  await visible(page.locator('.task-index-tags').getByText('产品研发群',{exact:true}),'group facet label')
  await visible(page.locator('.task-index-tags').getByText('web',{exact:true}),'project facet label')
  await page.screenshot({path:path.join(outputDir,'05-filterable-task-index.png'),fullPage:true})

  const mobile = await instance.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
  await mobile.goto(fixtureUrl,{waitUntil:'networkidle'})
  await visible(mobile.getByRole('heading',{name:'修复登录状态刷新丢失'}),'mobile replay heading')
  const overflow = await mobile.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (overflow) throw new Error('mobile layout has horizontal overflow')
  await mobile.screenshot({path:path.join(outputDir,'06-complete-task-timeline-mobile.png'),fullPage:true})
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`)
  const shots=(await fs.readdir(outputDir)).filter(name=>name.endsWith('.png')).sort(); if(shots.length!==6)throw new Error(`expected 6 screenshots, got ${shots.length}`)
  console.log(JSON.stringify({pass:true,fixtureUrl,screenshots:shots.map(name=>path.join(outputDir,name))},null,2))
} catch(error) { console.error(JSON.stringify({pass:false,error:error.message},null,2)); process.exitCode=1 }
finally { if(instance)await instance.close(); if(vite)await vite.close() }
