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
  await visible(page.getByText('全局主 Agent 分析并派发任务'),'global dispatch')
  await visible(page.getByText('群聊主 Agent 创建执行计划'),'group plan')
  await visible(page.getByText('web 返回代码改动'),'project change')
  await visible(page.getByText('TestAgent 复验通过'),'test verification')
  await visible(page.getByText('全局主 Agent 汇总任务结果'),'final summary')
  await visible(page.locator('.evidence-image-link img'),'browser screenshot evidence')
  if (await page.locator('.event-technical').filter({hasText:'failed_assertion'}).isVisible()) throw new Error('technical details must be folded by default')
  if ((await page.locator('body').innerText()).includes('C:\\Users\\')) throw new Error('local paths leaked')
  await page.screenshot({path:path.join(outputDir,'01-complete-task-timeline-desktop.png'),fullPage:true})

  await page.getByRole('button',{name:'问题',exact:true}).click()
  await visible(page.getByText('TestAgent 首次浏览器验证失败'),'failed browser event')
  if (await page.getByText('群聊主 Agent 创建执行计划').isVisible()) throw new Error('issue filter should hide normal events')
  await page.getByRole('button',{name:'查看详情'}).click()
  await visible(page.locator('.event-technical summary'),'folded technical summary')
  await page.locator('.event-technical summary').click()
  await visible(page.getByText('failed_assertion'),'expanded technical details')
  await page.locator('.replay-workspace').screenshot({path:path.join(outputDir,'02-failure-located-and-technical-expanded.png')})

  await page.getByRole('button',{name:'全部',exact:true}).click()
  await page.getByText('TestAgent 复验通过').locator('xpath=ancestor::article').getByRole('button',{name:'查看详情'}).click()
  await page.getByText('TestAgent 复验通过').locator('xpath=ancestor::article').getByRole('button',{name:'查看验证证据'}).first().click()
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

  const mobile = await instance.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
  await mobile.goto(fixtureUrl,{waitUntil:'networkidle'})
  await visible(mobile.getByRole('heading',{name:'修复登录状态刷新丢失'}),'mobile replay heading')
  const overflow = await mobile.evaluate(()=>document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  if (overflow) throw new Error('mobile layout has horizontal overflow')
  await mobile.screenshot({path:path.join(outputDir,'05-complete-task-timeline-mobile.png'),fullPage:true})
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`)
  const shots=(await fs.readdir(outputDir)).filter(name=>name.endsWith('.png')).sort(); if(shots.length!==5)throw new Error(`expected 5 screenshots, got ${shots.length}`)
  console.log(JSON.stringify({pass:true,fixtureUrl,screenshots:shots.map(name=>path.join(outputDir,name))},null,2))
} catch(error) { console.error(JSON.stringify({pass:false,error:error.message},null,2)); process.exitCode=1 }
finally { if(instance)await instance.close(); if(vite)await vite.close() }
