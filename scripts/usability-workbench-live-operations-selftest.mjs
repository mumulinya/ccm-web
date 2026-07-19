import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const component = read('frontend/src/components/common/UsabilityWorkbench.vue')
const live = read('frontend/src/composables/useUsabilityWorkbenchLive.js')
const preferences = read('frontend/src/composables/useWorkbenchPreferences.js')
const backend = read('backend/modules/system/usability.ts')

const checks = [
  ['工作台 SSE 路由', backend, '/api/usability/workbench/stream'],
  ['SSE 心跳', backend, 'type: "heartbeat"'],
  ['任务进度投影', backend, 'progress: taskProgress(task, phase)'],
  ['待处理分类投影', backend, 'attention_counts: attentionCounts'],
  ['阻塞状态归入待处理', backend, '"awaiting_user", "blocked"'],
  ['完成状态兼容', backend, '["done", "completed", "succeeded"]'],
  ['项目操作能力', backend, 'actions: running ? ["open", "stop"] : ["open", "start"]'],
  ['定时任务操作能力', backend, 'actions: ["open", "toggle"]'],
  ['浏览器实时连接', live, "new EventSource('/api/usability/workbench/stream')"],
  ['本地快照缓存', live, 'localStorage.setItem(CACHE_KEY'],
  ['过期数据门禁', live, 'STALE_AFTER_MS'],
  ['断线恢复', live, 'scheduleRecovery()'],
  ['个人布局存储', preferences, 'localStorage.setItem(STORAGE_KEY'],
  ['区域隐藏', component, 'setSection(item.key'],
  ['快捷入口排序', component, 'moveQuickAction(item.tab'],
  ['待处理筛选', component, 'filteredAttention'],
  ['任务运行时长', component, 'taskElapsed(task)'],
  ['项目启停', component, "operation === 'start' ? '/api/start' : '/api/stop'"],
  ['定时任务启停', component, "api('/api/cron/update'"],
  ['缓存提示', component, 'stale-banner'],
]

const failures = checks.filter(([, source, marker]) => !source.includes(marker))
if (failures.length) {
  console.error(`Workbench live operations self-test failed: ${failures.map(([name]) => name).join(', ')}`)
  process.exit(1)
}
if (component.includes('setInterval(() => load(true), 15000')) {
  console.error('Workbench live operations self-test failed: legacy 15s polling remains')
  process.exit(1)
}

console.log(JSON.stringify({ success: true, checks: checks.length + 1, paid_provider_calls: 0 }, null, 2))
