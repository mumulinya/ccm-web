import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const source = fs.readFileSync(path.join(process.cwd(), 'frontend/src/App.vue'), 'utf8')
const checks = [
  ['检测浏览器刷新', "navigationEntry?.type === 'reload'"],
  ['刷新回到工作台', "isPageReload ? { tab: 'dashboard' } : readNavigationTargetFromUrl()"],
  ['挂载复用启动目标', 'const initialNavigation = startupNavigationTarget'],
  ['默认页是工作台', "currentTab.value = startupTab?.id || 'dashboard'"],
  ['URL 会同步当前页', "url.searchParams.set('tab', tabId)"],
]

const missing = checks.filter(([, marker]) => !source.includes(marker))
if (missing.length) {
  console.error(`Workbench homepage self-test failed: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length, paid_provider_calls: 0 }, null, 2))
