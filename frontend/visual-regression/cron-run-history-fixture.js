import { createApp, ref } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import CronJobs from '../src/components/tools/CronJobs.vue'

const task = {
  id: 'task-cron-1',
  title: '修复订单审核页面并完成浏览器验收',
  status: 'in_progress',
  phase: 'review',
  status_detail: '代码修改已经返回，群聊主 Agent 正在核对 TestAgent 的页面验证结果。',
  trace_id: 'trace-cron-1',
  group_id: 'group-1',
  todo: {
    total: 5,
    completed: 3,
    current: { id: 'test', label: 'TestAgent 浏览器验收', status: 'reviewing' },
    steps: [
      { id: 'understand', label: '理解订单审核需求', status: 'completed' },
      { id: 'dispatch', label: '派发前后端子 Agent', status: 'completed' },
      { id: 'change', label: '完成代码修改', status: 'completed' },
      { id: 'test', label: 'TestAgent 浏览器验收', status: 'reviewing' },
      { id: 'delivery', label: '主 Agent 最终总结', status: 'pending' }
    ]
  },
  main_agent: {
    headline: '主 Agent 正在验收交付结果',
    summary: '子 Agent 已完成代码修改，正在确认页面行为、截图证据和验收标准。',
    acceptance_passed: false
  },
  test_agent: {
    status: 'passed', recommendation: 'accept', summary: '真实浏览器填写、提交和刷新流程均已通过。',
    run_count: 2, screenshot_count: 3, evidence_count: 8, evidence_available: true
  },
  replay_available: true
}

const job = {
  id: 'cron-job-1', name: '订单审核每日回归', target_type: 'group', group_id: 'group-1', workflow_type: 'daily_dev',
  requires_code_changes: true, continue_gaps: true, gap_continue_limit: 3, backlog_batch_limit: 2, import_shared_docs: true,
  schedule: '0 9 * * 1-5', prompt: '处理 ready 需求并完成独立验收', enabled: true, run_count: 3,
  last_run: '2026-07-13T01:00:00.000Z', next_run: '2026-07-14T01:00:00.000Z', last_status: 'running_task',
  last_result: '已创建 1 个任务，正在执行和验收',
  run_history: [
    { id: 'cron-run-3', trigger: 'manual', started_at: '2026-07-13T01:00:00.000Z', completed_at: null, status: 'running_task', result: '已创建 1 个任务，正在执行和验收', task_ids: [task.id], tasks: [task], meta: {} },
    { id: 'cron-run-2', trigger: 'schedule', started_at: '2026-07-12T01:00:00.000Z', completed_at: '2026-07-12T01:00:01.000Z', status: 'skipped', result: '没有 ready 状态的业务需求，本次未创建空任务', task_ids: [], tasks: [], meta: {} },
    { id: 'cron-run-1', trigger: 'schedule', started_at: '2026-07-11T01:00:00.000Z', completed_at: '2026-07-11T01:00:12.000Z', status: 'failed', result: '任务创建失败，需求已恢复为待处理状态', task_ids: [], tasks: [], meta: {} }
  ]
}

window.fetch = async (input) => {
  const url = String(input)
  let payload = { success: true }
  if (url.startsWith('/api/cron')) payload = { jobs: [job], archived_count: 0, scheduler: { running: true, running_job_ids: [] } }
  else if (url === '/api/projects') payload = { projects: [{ name: 'web' }] }
  else if (url === '/api/groups') payload = { groups: [{ id: 'group-1', name: '订单项目群' }] }
  else if (url === '/api/orchestrator/diagnostics') payload = { checks: [{ id: 'agent-process', status: 'pass' }] }
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const Root = {
  components: { CronJobs },
  setup() {
    const navigation = ref(null)
    const navigate = (target) => {
      navigation.value = target
      document.body.dataset.navigation = JSON.stringify(target)
    }
    return { navigation, navigate }
  },
  template: '<main class="fixture-shell"><CronJobs @navigate="navigate" /><output v-if="navigation" class="fixture-navigation">{{ navigation.tab }}</output></main>'
}

document.body.style.margin = '0'
document.body.style.height = '100vh'
document.getElementById('app').style.height = '100vh'
createApp(Root).mount('#app')
document.body.dataset.fixtureReady = 'true'
