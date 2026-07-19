import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const sourcePath = path.join(root, 'frontend/src/components/common/UsabilityWorkbench.vue')
const source = fs.readFileSync(sourcePath, 'utf8')

const checks = [
  ['状态概览', 'pulse-strip'],
  ['目标发起区', 'command-surface'],
  ['快捷入口', 'quickActions'],
  ['待处理任务', 'attention-section'],
  ['执行中任务', 'active-section'],
  ['近期交付', 'completed-section'],
  ['项目资源', 'resources.projects.slice'],
  ['协作群资源', 'resources.groups.slice'],
  ['定时任务资源', 'resources.cron.slice'],
  ['桌面双栏布局', 'workspace-grid'],
  ['移动端断点', '@media(max-width:760px)'],
  ['图标组件', '@lucide/vue'],
  ['输入门禁', ':disabled="intakeBusy || (!requirement.trim() && intakeFiles.length === 0)"'],
]

const missing = checks.filter(([, marker]) => !source.includes(marker))
if (missing.length) {
  console.error(`Workbench redesign self-test failed: ${missing.map(([name]) => name).join(', ')}`)
  process.exit(1)
}

if (source.includes('resources{display:grid')) {
  console.error('Workbench redesign self-test failed: legacy resource grid remains')
  process.exit(1)
}

console.log(JSON.stringify({
  success: true,
  checks: checks.length + 1,
  paid_provider_calls: 0,
}, null, 2))
