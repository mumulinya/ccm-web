import { createApp } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import TaskExperienceCard from '../src/components/tasks/TaskExperienceCard.vue'

const fixtureState = new URLSearchParams(window.location.search).get('state') || 'completed'
const fixtureContext = new URLSearchParams(window.location.search).get('context') || 'project'
const longPlanSteps = Array.from({ length: 25 }, (_, index) => ({
  id: `plan-step-${index + 1}`,
  label: index === 0 ? '读取项目结构和登录源码' : index === 24 ? '完成最终验收并交付' : `执行计划步骤 ${index + 1}`,
  content: `这是第 ${index + 1} 个可核验的计划步骤`,
  detail: index === 5 ? '当前正在核对登录状态恢复和路由守卫。' : '',
  status: index < 5 ? 'completed' : index === 5 ? 'in_progress' : 'pending',
}))
const card = {
  id: 'task-fixture-1',
  task_id: 'task-fixture-1',
  trace_id: 'trace-fixture-1',
  title: '修复项目登录状态',
  goal: '刷新页面后保持登录状态，并完成独立验收。',
  phase: 'completed',
  status: 'completed',
  progress: 100,
  started_at: '2026-07-26T08:00:00.000Z',
  completed_at: '2026-07-26T08:08:00.000Z',
  owner: 'coordinator',
  acceptance_mode: 'test_agent',
  test_agent_enabled: true,
  summary: '登录状态恢复逻辑已完成并通过验证。',
  usage_summary: {
    model_calls: 4,
    retry_count: 1,
    test_agent_rounds: 2,
    input_tokens: 12840,
    output_tokens: 2360,
  },
  plan_alignment: {
    checks: [
      {
        id: 'criterion_1',
        label: '刷新页面后仍保持登录状态',
        ok: true,
        detail: 'TestAgent 已在真实浏览器刷新页面并核对用户状态',
        evidence: ['登录页刷新前后截图', '浏览器会话状态记录'],
        verification_method: 'TestAgent 页面验收',
      },
      {
        id: 'criterion_2',
        label: '未登录用户仍会进入登录页',
        ok: true,
        detail: '已执行未登录访问回归',
        evidence: ['路由守卫回归通过'],
        verification_method: '浏览器与路由检查',
      },
    ],
  },
  completed: ['补齐登录状态恢复逻辑', '增加刷新场景回归检查'],
  work_items: [
    { id: 'step-1', subject: '定位登录状态丢失原因', status: 'completed', owner: 'project-agent' },
    { id: 'step-2', subject: '修复并运行验证', status: 'completed', owner: 'project-agent' },
  ],
  plan_mode: {
    title: '登录状态恢复执行计划',
    architecture_plan: { goal: '先读取源码和会话边界，再按依赖顺序修复并验证。' },
    steps: longPlanSteps,
    impact_scope: { projects: ['web'], areas: ['frontend/src/stores', 'frontend/src/router'] },
    acceptance: ['刷新页面后仍保持登录状态', '未登录用户仍会进入登录页'],
    revision_count: 2,
    revisions: [
      { revision: 1, feedback: '增加未登录路由回归', completed_at: '2026-07-26T08:01:00.000Z' },
      { revision: 2, feedback: '增加刷新后筛选条件保留', completed_at: '2026-07-26T08:02:00.000Z' },
    ],
  },
  source_evidence: {
    summary: '项目主 Agent 已读取登录状态存储、路由守卫和相关测试文件。',
    selectedPaths: ['frontend/src/stores/session.js', 'frontend/src/router/session-guard.js'],
  },
  delivery: {
    headline: '登录状态恢复逻辑已完成并通过验证。',
    completed: ['补齐登录状态恢复逻辑'],
    verification: ['TestAgent 已完成真实页面验证'],
    risks: ['旧浏览器版本仍建议继续观察'],
    files: [
      { path: 'frontend/src/stores/session.js', status: 'M', additions: 8, deletions: 2, project: 'web' },
      { path: 'frontend/src/router/session-guard.js', status: 'A', additions: 24, deletions: 0, project: 'web' },
      { path: 'frontend/src/legacy/session.js', status: 'D', additions: 0, deletions: 18, project: 'web' },
    ],
  },
  runtime_kernel: {
    lifecycle_count: 6,
    blocked_count: 0,
    dispatch_worker_count: 1,
    context_budget: { max_pressure: 18 },
    worker_context_packet_ids: ['packet-private-1'],
    injection_ids: ['injection-private-1'],
    latest_lifecycle: [{ id: 'run-1', action: 'dispatch_worker', phase: 'execute', status: 'completed' }],
  },
  technical: {
    trace_id: 'trace-fixture-1',
    provider: 'fixture-provider',
    generation: 2,
    session_id: 'native-session-private',
    mcp: ['filesystem'],
    skills: ['acceptance-evidence'],
  },
  actions: [],
}

if (fixtureState === 'self-verification') {
  Object.assign(card, {
    phase: 'testing',
    status: 'reviewing',
    progress: 85,
    completed_at: '',
    acceptance_mode: 'main_agent_self_verification',
    test_agent_enabled: false,
    main_agent_self_verification: true,
    summary: '项目主 Agent 正在根据真实命令结果执行自验。',
  })
}

if (fixtureState === 'failed') {
  Object.assign(card, {
    phase: 'failed',
    status: 'failed',
    summary: '页面验收没有通过，任务已停止并保留失败证据。',
    completed_at: '2026-07-26T08:08:00.000Z',
    timeline: [
      { label: '理解需求', status: 'done' },
      { label: '制定计划', status: 'done' },
      { label: '开发执行', status: 'done' },
      { label: 'TestAgent（独立验收）', status: 'failed', detail: '刷新后登录状态仍然丢失' },
      { label: '最终验收', status: 'failed' },
      { label: '完成交付', status: 'done' },
    ],
    plan_alignment: {
      checks: [{
        id: 'criterion_1',
        label: '刷新页面后仍保持登录状态',
        ok: false,
        detail: '刷新后用户状态丢失',
        evidence: ['TestAgent 失败截图'],
        verification_method: 'TestAgent 页面验收',
      }],
    },
    delivery: {
      ...card.delivery,
      headline: '页面验收没有通过，任务未达到交付条件。',
      acceptance_passed: false,
      risks: ['刷新后登录状态仍然丢失'],
    },
    actions: [{ id: 'retry', kind: 'retry', label: '重新执行', tone: 'primary' }],
  })
}

const originalFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = String(input?.url || input || '')
  if (url.includes('/api/tasks/replay?task_id=')) {
    return new Response(JSON.stringify({
      success: true,
      replay: {
        plans: [{
          task_id: card.task_id,
          source: 'plan_mode',
          title: card.plan_mode.title,
          strategy: card.plan_mode.architecture_plan.goal,
          status: card.phase === 'completed' ? 'completed' : 'in_progress',
          steps: longPlanSteps.map(step => ({ ...step, title: step.label })),
          step_count: longPlanSteps.length,
          completed_count: longPlanSteps.filter(step => step.status === 'completed').length,
          impact_projects: card.plan_mode.impact_scope.projects,
          impact_areas: card.plan_mode.impact_scope.areas,
          acceptance: card.plan_mode.acceptance,
          revision_count: card.plan_mode.revision_count,
          revisions: card.plan_mode.revisions,
        }],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  return originalFetch(input, init)
}

createApp({
  components: { TaskExperienceCard },
  setup: () => ({ card, fixtureContext }),
  template: `
    <main class="fixture">
      <TaskExperienceCard :card="card" :context="fixtureContext" compact />
    </main>
  `,
}).mount('#app')

document.body.style.margin = '0'
document.body.style.minHeight = '100vh'

const style = document.createElement('style')
style.textContent = `
  body { background: var(--bg-primary); color: var(--text-primary); }
  .fixture { width: min(760px, calc(100vw - 24px)); margin: 24px auto; }
`
document.head.appendChild(style)
