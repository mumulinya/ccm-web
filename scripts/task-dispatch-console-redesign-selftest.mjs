import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const header = fs.readFileSync(path.join(root, 'frontend/src/components/tasks/TaskDispatchHeader.vue'), 'utf8')
const template = fs.readFileSync(path.join(root, 'frontend/src/components/tasks/TaskManager.template.html'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'frontend/src/components/tasks/TaskManager.css'), 'utf8')

const checks = [
  ['任务控制台标题', header, '派发、跟进与验收'],
  ['五项状态概览', header, 'summaryItems'],
  ['Lucide 操作图标', header, '@lucide/vue'],
  ['带图标视图标签', header, '<component :is="view.icon"'],
  ['零任务启动面板', template, 'dashboard-zero-state'],
  ['新建任务入口', template, "handleCreateType('business')"],
  ['需求池入口', template, '@click="openBacklog"'],
  ['三步任务流程', template, 'zero-state-flow'],
  ['无记录时隐藏零值筛选', template, 'v-if="dashboardItems().length"'],
  ['无框概览内容区', styles, 'padding:24px 28px 48px'],
  ['移动端单列任务流程', styles, '.zero-state-flow{grid-template-columns:1fr'],
]

const missing = checks.filter(([, source, marker]) => !source.includes(marker))
if (missing.length || template.includes('title="当前筛选下没有可展示的执行任务"')) {
  console.error(`Task dispatch redesign self-test failed: ${missing.map(([name]) => name).join(', ') || '旧空状态仍存在'}`)
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length + 1, paid_provider_calls: 0 }, null, 2))
