import { createApp, computed, ref } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import MainAgentDecisionCard from '../src/components/agents/MainAgentDecisionCard.vue'
import TaskExperienceCard from '../src/components/tasks/TaskExperienceCard.vue'
import GroupMainAgentStatusCard from '../src/components/collaboration/GroupMainAgentStatusCard.vue'
import ProjectTaskIntakeMessage from '../src/components/collaboration/ProjectTaskIntakeMessage.vue'
import TaskCollaborationCard from '../src/components/collaboration/TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from '../src/components/agents/AgentCodeChangeDrawer.vue'
import GlobalAgent from '../src/components/global/GlobalAgent.vue'
import { summarizeWorkEvents, sanitizeUserFacingAgentText } from '../src/utils/agentDisplay.js'
import { globalAgentRunTaskCard } from '../src/utils/taskExperience.js'

const style = document.createElement('style')
style.textContent = `
  body { margin: 0; background: #eef2f7; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .visual-fixture { display: grid; gap: 18px; width: min(1040px, calc(100vw - 32px)); margin: 0 auto; padding: 24px 0 40px; }
  .fixture-case { padding: 14px; border: 1px solid rgba(148, 163, 184, .28); border-radius: 10px; background: rgba(255, 255, 255, .78); }
  .fixture-case h2 { margin: 0 0 10px; font-size: 14px; color: #334155; }
  .agent-work-events { margin-top: 10px; border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(15, 23, 42, 0.08)); border-radius: 8px; background: color-mix(in srgb, var(--agent-accent) 5%, rgba(255, 255, 255, 0.7)); overflow: hidden; }
  .agent-work-events > summary { list-style: none; cursor: pointer; user-select: none; }
  .agent-work-events > summary::-webkit-details-marker { display: none; }
  .agent-work-events:not([open]) .work-events-preview, .agent-work-events:not([open]) .work-events-list { display: none; }
  .agent-work-events[open] .work-events-preview { border-bottom: 1px solid rgba(15, 23, 42, 0.06); }
  .work-events-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border-bottom: 1px solid rgba(15, 23, 42, 0.06); color: #475569; font-size: 11px; font-weight: 800; }
  .work-head-main, .work-head-meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .work-head-meta { color: #64748b; font-weight: 700; }
  .work-agent-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 999px; background: var(--agent-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--agent-accent) 12%, transparent); }
  .work-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e293b; }
  .work-state-pill { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; background: color-mix(in srgb, var(--agent-accent) 13%, transparent); color: var(--agent-accent); }
  .work-events-preview { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px; padding: 8px 10px; align-items: start; color: #64748b; font-size: 11px; }
  .work-events-preview pre, .work-event pre { margin: 0; white-space: pre-wrap; word-break: break-word; color: #334155; font-family: Consolas, "JetBrains Mono", monospace; line-height: 1.5; }
  .work-events-list { display: flex; flex-direction: column; gap: 7px; padding: 9px; max-height: 300px; overflow-y: auto; }
  .work-event { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 9px; align-items: start; }
  .work-event-side { display: flex; flex-direction: column; gap: 3px; color: #64748b; font-size: 10px; font-weight: 800; }
  .global-agent-fixture-frame { height: 720px; min-height: 720px; overflow: hidden; border: 1px solid rgba(148, 163, 184, .24); border-radius: 10px; }
`
document.head.appendChild(style)

const now = '2026-07-06T10:00:00.000Z'
const GLOBAL_AGENT_SESSIONS_KEY = 'cc_global_assistant_sessions_v2'
const GLOBAL_AGENT_CURRENT_ID_KEY = 'cc_global_assistant_current_id_v2'
let globalAgentFixtureSessions = []

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const originalFetch = window.fetch.bind(window)
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  if (url.includes('/api/global-agent/quality')) {
    return jsonResponse({
      success: true,
      quality: {
        policy: { shadowMode: false, minWriteConfidence: 0.72 },
        rates: {},
      },
    })
  }
  if (url.includes('/api/global-agent/history')) {
    if (String(init?.method || 'GET').toUpperCase() === 'POST') return jsonResponse({ success: true })
    return jsonResponse({ success: true, sessions: globalAgentFixtureSessions, currentSessionId: 'global-stream-fixture' })
  }
  if (url.includes('/api/global-agent/bridge/pending')) {
    return jsonResponse({ success: true, requests: [] })
  }
  return originalFetch(input, init)
}

const renderedChangeFiles = [
  {
    path: 'frontend/src/stores/login.js',
    project: 'web',
    agent: 'web',
    statusText: '修改',
    statusColor: '#2563eb',
    additions: 3,
    deletions: 1,
    diff: {
      available: true,
      additions: 3,
      deletions: 1,
      raw: [
        'diff --git a/frontend/src/stores/login.js b/frontend/src/stores/login.js',
        '--- a/frontend/src/stores/login.js',
        '+++ b/frontend/src/stores/login.js',
        '@@ -8,6 +8,8 @@ export function useLoginStore() {',
        '-  const user = null',
        '+  const user = restoreSessionFromStorage()',
        '+  const ready = Boolean(user)',
        '+  refreshTokenIfNeeded(user)',
      ].join('\n'),
    },
  },
  {
    path: 'frontend/src/views/Login.vue',
    project: 'web',
    agent: 'web',
    statusText: '修改',
    statusColor: '#2563eb',
    additions: 2,
    deletions: 0,
    diff: {
      available: true,
      additions: 2,
      deletions: 0,
      raw: [
        'diff --git a/frontend/src/views/Login.vue b/frontend/src/views/Login.vue',
        '--- a/frontend/src/views/Login.vue',
        '+++ b/frontend/src/views/Login.vue',
        '@@ -20,6 +20,8 @@',
        '+  await loginStore.restore()',
        '+  await router.replace(nextRoute)',
      ].join('\n'),
    },
  },
]

const renderedChangeSummary = {
  schema: 'ccm-main-agent-change-summary-v1',
  title: '改动明细',
  status: 'ready',
  status_label: '2 个文件',
  headline: 'web 产生了 2 个文件改动。',
  file_count: 2,
  additions: 5,
  deletions: 1,
  files: renderedChangeFiles,
  agents: [{ agent: 'web', role: '前端', file_count: 2, additions: 5, deletions: 1, files: renderedChangeFiles }],
  next_action: '可以点开查看具体文件 diff；原始执行记录仍在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
}

const renderedPlanMode = {
  title: '执行前计划',
  mode: 'cc-style-plan-mode',
  requires_confirmation: false,
  auto_continue: true,
  risk: { level: 'low', summary: '只修改登录状态恢复链路。', reasons: ['范围清晰'] },
  impact_scope: { projects: ['web'], areas: ['登录状态恢复'], file_hints: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
  read_only_exploration: { summary: '已确认登录 store 和登录页恢复入口。', projects: ['web'], knowledge_used: true, code_snapshot_used: true },
  acceptance: ['刷新页面后会恢复登录态', '登录状态恢复必须有文件改动', 'npm run test:login-state 必须通过'],
  permission_boundaries: ['不要修改无关登录样式', '不要编造未执行的验证结果'],
}

const groupIntakePlanMode = {
  title: '执行前计划',
  mode: 'cc-style-plan-mode',
  requires_confirmation: true,
  auto_continue: false,
  confirmation_status: 'awaiting_confirmation',
  risk: { level: 'high', summary: '涉及支付数据结构，需要先确认执行边界。', reasons: ['数据结构调整', '多项目协作'] },
  steps: [
    { id: 'understand_goal', label: '理解需求与验收目标', detail: '已锁定相关项目：api、web', status: 'completed' },
    { id: 'read_only_explore', label: '只读探索影响范围', detail: '已检查支付接口、前端结算入口和历史任务记录。', status: 'completed' },
    { id: 'confirm_boundary', label: '确认执行边界', detail: '涉及支付数据结构，等待你确认后执行。', status: 'needs_confirmation' },
    { id: 'dispatch_sub_agents', label: '派发子 Agent 工作单', detail: '确认后会把后端接口和前端结算入口分派给对应子 Agent。', status: 'pending' },
    { id: 'verify_and_summarize', label: '验收结果并总结给用户', detail: '完成后主 Agent 会核对改动、验证、风险和下一步。', status: 'pending' },
  ],
  impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端页面与交互'], multi_agent: true },
  read_only_exploration: { summary: '只读探索已完成，确认支付表和结算页都在影响范围内。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
  acceptance: ['必须有主 Agent 计划和子 Agent 结构化结果说明', '涉及代码时必须有系统捕获的文件变更', '必须有已执行验证记录和最终总结'],
  permission_boundaries: ['确认前不得修改文件', '确认前不得派发子 Agent 执行写入操作', '删除、迁移或部署必须再次等待用户确认'],
}

const groupIntakeTaskCard = {
  version: 1,
  visible: true,
  task_id: 'task-group-intake-plan',
  title: '调整支付流程',
  goal: '调整支付流程，先确认支付数据结构和前端结算入口的影响范围。',
  phase: 'needs_user',
  phase_label: '待确认',
  progress: 16,
  active_agents: [],
  agents: [],
  plan_mode: groupIntakePlanMode,
  completed: ['已理解需求', '已完成只读探索'],
  blockers: ['等待你确认执行前计划'],
  next_action: '请确认执行前计划；确认后主 Agent 才会派发子 Agent。',
  actions: [
    { id: 'confirm_plan', label: '确认执行', kind: 'confirm_plan', tone: 'primary' },
    { id: 'revise_plan', label: '调整计划', kind: 'revise_plan', tone: 'warning' },
  ],
  technical: {
    trace_id: 'trace-group-intake-plan',
    plan_mode: groupIntakePlanMode,
    raw_payload: 'CCM_AGENT_RECEIPT raw payload should stay folded',
  },
}

const groupIntakeMessage = {
  id: 'message-group-intake-plan',
  role: 'assistant',
  agent: 'coordinator',
  type: 'project_task_intake',
  content: '我先按只读方式看了一轮：调整支付流程。这个需求涉及支付数据结构，需要先确认范围，我已经整理好执行前计划。你确认后，我再派发子 Agent 开始修改。',
  timestamp: now,
  task_id: 'task-group-intake-plan',
  task: {
    id: 'task-group-intake-plan',
    title: '调整支付流程',
    status: 'pending',
    status_detail: '执行前计划已准备好，等待你确认后才会派发子 Agent',
    workflow_type: 'daily_dev',
    intake_state: 'awaiting_confirmation',
  },
  queue: { queued: false, message: '任务已创建，等待用户确认执行前计划' },
  intakeSummary: {
    schema: 'ccm-group-task-intake-summary-v1',
    title: '接下来',
    status: 'waiting_confirmation',
    status_label: '等待确认',
    headline: '主 Agent 已完成只读探索；确认计划后才会派发子 Agent 开始修改。',
    items: [
      { label: '负责主 Agent', value: 'coordinator' },
      { label: '执行策略', value: '确认后派发' },
      { label: '风险', value: '高风险' },
    ],
    next_action: '等待用户确认执行前计划',
  },
  intake_summary: null,
  planMode: groupIntakePlanMode,
  plan_mode: groupIntakePlanMode,
  taskCard: groupIntakeTaskCard,
  task_card: groupIntakeTaskCard,
  taskRuntime: {
    taskId: 'task-group-intake-plan',
    status: 'pending',
    statusText: '执行前计划已准备好，等待你确认后才会派发子 Agent',
    taskCard: groupIntakeTaskCard,
    task_card: groupIntakeTaskCard,
  },
  task_runtime: null,
}

const renderedPlanAlignment = {
  schema: 'ccm-main-agent-plan-alignment-v1',
  title: '计划执行核对',
  status: 'aligned',
  status_label: '已对齐',
  headline: '主 Agent 已把执行结果和原计划逐项核对，当前没有发现计划偏离。',
  checks: [
    { id: 'plan_confirmed', label: '计划已进入执行', ok: true, detail: '已按确认后的计划进入执行链路', evidence: [] },
    { id: 'criterion_1', label: '刷新页面后会恢复登录态', ok: true, detail: '主 Agent 已在最终验收中覆盖该计划项', evidence: ['登录状态刷新后的恢复逻辑已经完成。'] },
    { id: 'criterion_2', label: '登录状态恢复必须有文件改动', ok: true, detail: '已捕获 2 个文件改动', evidence: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
    { id: 'criterion_3', label: 'npm run test:login-state 必须通过', ok: true, detail: '已执行 1 项验证', evidence: ['npm run test:login-state'] },
  ],
  deviations: [],
  next_action: '可以查看最终总结和改动明细。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
}

const renderedUserHandoff = {
  schema: 'ccm-main-agent-user-handoff-v1',
  title: '接下来建议',
  status: 'ready',
  status_label: '可验收',
  headline: '这轮任务已经收尾，建议先核对交付总结和改动明细。',
  summary_cards: [
    { id: 'completed', label: '完成内容', value: '登录状态刷新后的恢复逻辑已经完成。', tone: 'ok' },
    { id: 'verification', label: '验证状态', value: '已执行 1 项验证', tone: 'ok' },
    { id: 'attention', label: '待关注', value: '暂无待处理风险', tone: 'ok' },
    { id: 'next', label: '下一步', value: 'web 产生了 2 个文件改动。', tone: 'ok' },
  ],
  primary_action: { id: 'view_changes', label: '查看改动', detail: 'web 产生了 2 个文件改动。', kind: 'view_changes', tone: 'primary' },
  secondary_actions: [
    { id: 'review_delivery', label: '核对交付总结', detail: '查看完成内容、验证结果和风险提示。', kind: 'review_delivery', tone: 'outline' },
    { id: 'continue_request', label: '继续提出新要求', detail: '如果结果符合预期，可以直接继续补充下一步需求。', kind: 'continue', tone: 'outline' },
  ],
  evidence: ['计划：执行前计划：登录态恢复执行计划', '改动：2 个文件', '验证：1 项已执行', '验收：主 Agent 验收：已通过', '复核：独立复核：已通过', '计划核对：已对齐'],
  unresolved: [],
  next_action: 'web 产生了 2 个文件改动。',
  technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const conversationDecision = {
  version: 2,
  mode: 'conversation',
  trace_id: 'trace-simple-chat',
  decision: {
    selected_actions: ['read_group_context', 'generate_final_reply'],
    dispatch_policy: { action: 'answer', reason: '普通问话', nextStep: '直接回复用户' },
    reason: '普通问话',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v1',
    user_visible_text: '已判断为普通对话，直接回复用户。',
    tool_use_summary: { tool_summary: '本轮没有需要展示的工具调用' },
  },
  todo_plan: {
    title: '我准备这样处理',
    source: 'cc-style-todo',
    schema: 'cc-style-todo-v2',
    display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true, user_visible: false, hide_for_simple_conversation: true },
    steps: [
      { id: 'understand_intent', content: '确认用户这句话是普通询问', activeForm: '正在判断用户意图', status: 'completed' },
      { id: 'generate_final_reply', content: '直接回答用户的问题', activeForm: '正在生成回复', status: 'completed' },
    ],
  },
  user_plan_steps: [
    { id: 'understand_intent', content: '确认用户这句话是普通询问', activeForm: '正在判断用户意图', status: 'completed' },
    { id: 'generate_final_reply', content: '直接回答用户的问题', activeForm: '正在生成回复', status: 'completed' },
  ],
  permissions: [],
  observation: { intent_kind: 'chat' },
  verify: { passed: true, blocked_actions: [], conclusion: '普通对话已处理' },
  reply: { kind: 'assistant_message', preview: '你好，我在。' },
}

const taskDecision = {
  version: 2,
  mode: 'project_task',
  trace_id: 'trace-task-visible',
  decision: {
    selected_actions: ['read_group_context', 'create_project_task', 'dispatch_child_agent', 'read_child_agent_receipts', 'generate_final_reply'],
    dispatch_policy: { action: 'delegate', reason: '明确开发任务', nextStep: '等待子 Agent 结果说明' },
    reason: '明确开发任务',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v1',
    user_visible_text: '已把明确需求转成项目任务，并进入执行队列。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '读取/检查 2 项，协作通道 1 个' },
    dispatch_launch_summary: {
      schema: 'ccm-main-agent-dispatch-launch-summary-v1',
      title: '已派发的工作',
      headline: '我已把「修复登录状态刷新问题」拆给 1 个子 Agent：web。',
      rows: [
        {
          id: 'dispatch-web',
          agent: 'web',
          role: '项目 Agent',
          task: '修复登录状态恢复逻辑，并提交结构化结果说明。',
          reason: '前端负责登录状态恢复链路。',
          depends_on: [],
          status: 'dispatched',
          status_label: '已派发',
        },
      ],
      acceptance: ['每个子 Agent 都需要提交结构化结果说明。', '主 Agent 会统一核对文件、验证和阻塞情况。'],
      next_action: '等待子 Agent 返回结果说明；有缺口时主 Agent 会定向补充或请你确认。',
      technical_hint: '子 Agent 的完整工作单、Trace 和底层执行记录默认收在技术详情里。',
    },
    technical_details: [
      { id: 'troubleshooting', title: '排障摘要', items: [] },
      { id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-task-visible' }] },
    ],
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true, raw_events_default_collapsed: true },
      items: [
        { id: 'cp-plan', label: '主 Agent 已制定协作计划', detail: '已确认登录态刷新问题由前端状态恢复链路处理。', status: 'done' },
        { id: 'cp-dispatch', label: '已派发给子 Agent', detail: 'web 正在修改登录状态恢复逻辑。', status: 'done' },
        { id: 'cp-review', label: '已检查交付质量', detail: '主 Agent 已核对文件变更和验证结果。', status: 'done' },
        { id: 'cp-complete', label: '任务交付完成', detail: '登录状态刷新后的恢复逻辑已经完成。', status: 'done' },
      ],
    },
  },
  todo_plan: {
    title: '我准备这样处理',
    source: 'cc-style-todo',
    schema: 'cc-style-todo-v2',
    display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true, user_visible: true },
    steps: [
      { id: 'understand_intent', content: '确认需求目标和涉及范围', activeForm: '正在确认需求目标', status: 'completed' },
      { id: 'create_project_task', content: '创建可跟踪的项目任务卡', activeForm: '正在创建项目任务卡', status: 'completed' },
      { id: 'dispatch_child_agent', content: '派发给 1 个子 Agent 执行', activeForm: '正在派发子 Agent', status: 'in_progress', actions: [{ id: 'cancel', label: '取消任务', kind: 'cancel', tone: 'danger' }] },
      { id: 'verify_and_reply', content: '汇总修改、验证结果和风险，生成最终回复', activeForm: '正在验收并生成最终回复', status: 'pending' },
    ],
  },
  user_plan_steps: [],
  dispatch_launch_summary: null,
  permissions: [],
  observation: { intent_kind: 'task' },
  verify: { passed: true, blocked_actions: [], conclusion: '任务已进入执行链路' },
  reply: { kind: 'task_card', preview: '任务已创建。' },
}
taskDecision.user_plan_steps = taskDecision.todo_plan.steps
taskDecision.dispatch_launch_summary = taskDecision.display_stream.dispatch_launch_summary

const taskMissingVerificationDecision = JSON.parse(JSON.stringify(taskDecision))
taskMissingVerificationDecision.trace_id = 'trace-task-missing-verification'
taskMissingVerificationDecision.display_stream.user_visible_text = '已把明确需求转成项目任务，计划仍需要补齐验收步骤。'
taskMissingVerificationDecision.decision.dispatch_policy.nextStep = '先补齐验收步骤'
taskMissingVerificationDecision.verify = { passed: false, blocked_actions: ['generate_final_reply'], conclusion: '计划缺少验收步骤，暂不进入最终总结' }
taskMissingVerificationDecision.todo_plan.steps = [
  { id: 'understand_intent', content: '确认需求目标和涉及范围', activeForm: '正在确认需求目标', status: 'completed' },
  { id: 'change_code', content: '修改登录态恢复逻辑', activeForm: '正在修改登录态恢复逻辑', status: 'in_progress' },
  { id: 'delivery_note', content: '整理交付说明', activeForm: '正在整理交付说明', status: 'pending' },
]
taskMissingVerificationDecision.todo_plan.verification_nudge = true
taskMissingVerificationDecision.todo_plan.verification_reminder = {
  schema: 'ccm-main-agent-plan-verification-reminder-v1',
  status: 'needs_verification_step',
  title: '还缺验收步骤',
  headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
  reason: '计划已有 3 项以上，但没有显式的验证或验收步骤。',
  next_action: '主 Agent 会把验收补进计划，再继续交付总结。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}
taskMissingVerificationDecision.user_plan_steps = taskMissingVerificationDecision.todo_plan.steps

const taskCompletedDecision = JSON.parse(JSON.stringify(taskDecision))
taskCompletedDecision.display_stream.user_visible_text = '登录状态刷新后的恢复逻辑已经完成，交付总结已整理。'
taskCompletedDecision.decision.dispatch_policy.nextStep = '交付总结已生成'
taskCompletedDecision.verify.conclusion = '任务已完成并生成交付总结'
taskCompletedDecision.reply.preview = '任务已完成。'
taskCompletedDecision.todo_plan.steps = taskCompletedDecision.todo_plan.steps.map(step => ({ ...step, status: 'completed', actions: [] }))
taskCompletedDecision.user_plan_steps = taskCompletedDecision.todo_plan.steps

const workchainTodoPlan = {
  schema: 'ccm-main-agent-workchain-todo-v1',
  source: 'workchain',
  title: '我准备这样处理',
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: false, technical_default_collapsed: true },
  steps: [
    { id: 'plan', content: '确认目标和验收标准', activeForm: '正在确认目标和验收标准', active_form: '正在确认目标和验收标准', status: 'completed' },
    { id: 'dispatch', content: '派发给子 Agent 执行', activeForm: '正在派发子 Agent 执行', active_form: '正在派发子 Agent 执行', status: 'completed' },
    { id: 'review', content: '跟踪 TestAgent 独立复核', activeForm: '正在跟踪 TestAgent 独立复核', active_form: '正在跟踪 TestAgent 独立复核', status: 'in_progress' },
    { id: 'summarize', content: '总结完成内容和下一步', activeForm: '正在整理用户可读总结', active_form: '正在整理用户可读总结', status: 'pending' },
  ],
  current_step: { id: 'review', content: '跟踪 TestAgent 独立复核', activeForm: '正在跟踪 TestAgent 独立复核', active_form: '正在跟踪 TestAgent 独立复核', status: 'in_progress' },
  progress: { completed: 2, total: 4 },
  next_action: '等待 TestAgent 复核结论，主 Agent 再决定是否返工或总结。',
}
const workchainTodoDisplayStream = {
  schema: 'ccm-streamlined-display-v2',
  user_visible_text: '主 Agent 正在按计划推进任务，并等待 TestAgent 的独立复核结论。',
  tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '协作通道 1 个，验证 1 项' },
  workchain: {
    schema: 'ccm-main-agent-workchain-v1',
    mode: 'project_task',
    user_visible_text: '主 Agent 正在按计划推进任务，并等待 TestAgent 的独立复核结论。',
    stages: [
      { id: 'plan', label: '计划', status: 'completed' },
      { id: 'execute', label: '执行', status: 'completed' },
      { id: 'review', label: '复核', status: 'in_progress' },
      { id: 'summarize', label: '总结', status: 'pending' },
    ],
    todo_plan: workchainTodoPlan,
    todoPlan: workchainTodoPlan,
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true },
      items: [
        { id: 'cp-workchain-plan', label: '主 Agent 已生成计划', detail: '计划包含执行、复核和总结。', status: 'done' },
        { id: 'cp-workchain-review', label: '正在等待 TestAgent 复核', detail: '复核结论会决定是否返工。', status: 'active' },
      ],
    },
    completion_summary: { evidence: ['已生成计划', '已派发执行', '等待 TestAgent 独立复核'] },
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-todo' }] }],
  },
  todo_plan: workchainTodoPlan,
  todoPlan: workchainTodoPlan,
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true },
    items: [
      { id: 'cp-workchain-plan', label: '主 Agent 已生成计划', detail: '计划包含执行、复核和总结。', status: 'done' },
      { id: 'cp-workchain-review', label: '正在等待 TestAgent 复核', detail: '复核结论会决定是否返工。', status: 'active' },
    ],
  },
  technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-todo' }] }],
}
const workchainTodoCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-todo',
  title: '主 Agent 与 TestAgent 对接',
  goal: '让主 Agent 等待 TestAgent 独立复核后再总结。',
  phase: 'executing',
  phase_label: '复核中',
  status: 'in_progress',
  progress: 62,
  display_stream: workchainTodoDisplayStream,
  progress_checkpoints: workchainTodoDisplayStream.progress_checkpoints,
  completed: ['已生成计划', '已派发执行'],
  blockers: [],
  next_action: '等待 TestAgent 复核结论。',
  technical: { trace_id: 'trace-workchain-todo', display_stream: workchainTodoDisplayStream },
}
const workchainCompletedArchivedTodoPlan = {
  ...workchainTodoPlan,
  steps: workchainTodoPlan.steps.map(step => ({ ...step, status: 'completed', actions: [] })),
  visible_steps: [],
  visibleSteps: [],
  archived_steps_count: workchainTodoPlan.steps.length,
  archivedStepsCount: workchainTodoPlan.steps.length,
  archive_summary: '计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。',
  archiveSummary: '计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。',
  current_step: null,
  currentStep: null,
  completed_count: workchainTodoPlan.steps.length,
  total_count: workchainTodoPlan.steps.length,
  progress_label: `${workchainTodoPlan.steps.length}/${workchainTodoPlan.steps.length}`,
  display_policy: {
    ...workchainTodoPlan.display_policy,
    archive_completed_todo: true,
    archiveCompletedTodo: true,
    archived_when_complete: true,
    archivedWhenComplete: true,
    visible_when_completed: false,
    visibleWhenCompleted: false,
  },
}
const workchainCompletedArchivedCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-completed-archived',
  title: '主 Agent 与 TestAgent 对接',
  goal: '完成主 Agent 与 TestAgent 的计划、复核和总结闭环。',
  phase: 'completed',
  phase_label: '已完成',
  status: 'completed',
  progress: 100,
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
    workchain: {
      schema: 'ccm-main-agent-workchain-v1',
      mode: 'project_task',
      status: 'completed',
      user_visible_text: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
      stages: workchainTodoDisplayStream.workchain.stages.map(stage => ({ ...stage, status: 'completed' })),
      todo_plan: workchainCompletedArchivedTodoPlan,
      todoPlan: workchainCompletedArchivedTodoPlan,
      completion_summary: {
        evidence: ['主 Agent 已生成计划', 'TestAgent 已完成独立复核', '最终总结已整理'],
        verification: ['TestAgent 独立复核已通过'],
        independent_review: ['TestAgent：已通过'],
        terminal: true,
      },
      technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-completed-archived' }] }],
    },
    todo_plan: workchainCompletedArchivedTodoPlan,
    todoPlan: workchainCompletedArchivedTodoPlan,
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-completed-archived' }] }],
  },
  todo_plan: workchainCompletedArchivedTodoPlan,
  todoPlan: workchainCompletedArchivedTodoPlan,
  completion_card: {
    schema: 'ccm-main-agent-completion-card-v1',
    title: '最终交付总览',
    status: 'completed',
    status_label: '已完成',
    headline: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
    metrics: [
      { id: 'status', label: '状态', value: '已完成' },
      { id: 'verification', label: '验证', value: 'TestAgent 已复核' },
      { id: 'risk', label: '风险', value: '无待处理风险' },
    ],
    highlights: ['计划、执行、TestAgent 复核和总结都已收尾。'],
    verification: ['TestAgent 独立复核已通过。'],
    acceptance: ['主 Agent 已把复核结论纳入最终验收。'],
    risks: ['暂无需要你额外处理的风险。'],
    next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
    technical_hint: '已完成的 Todo 已归档，完整步骤保留在技术详情里。',
  },
  completed: ['计划已完成', 'TestAgent 复核已完成', '最终总结已整理'],
  blockers: [],
  next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
  technical: { trace_id: 'trace-workchain-completed-archived' },
}
const workchainQualityFollowup = {
  schema: 'ccm-main-agent-quality-followup-v1',
  title: '交付总结还需补齐',
  status: 'needs_attention',
  status_label: '需补齐',
  headline: '这轮任务已经有处理结果，但最终交付总结还缺少可验收的信息。',
  missing: ['交付证据', '验证结果', '验收结论'],
  evidence: ['已整理任务目标', '已看到执行完成信号'],
  next_action: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
  display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_default_collapsed: true, hide_internal_protocols: true },
}
const workchainQualityFollowupTodoPlan = {
  schema: 'ccm-main-agent-workchain-todo-v1',
  source: 'workchain',
  title: '协作群当前计划',
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: false, archive_completed_todo: false, technical_default_collapsed: true },
  steps: [
    ...workchainTodoPlan.steps.map(step => ({ ...step, status: 'completed', actions: [] })),
    { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', source: 'final_summary_quality' },
  ],
  current_step: { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress' },
  currentStep: { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress' },
  completed_count: workchainTodoPlan.steps.length,
  total_count: workchainTodoPlan.steps.length + 1,
  progress_label: `${workchainTodoPlan.steps.length}/${workchainTodoPlan.steps.length + 1}`,
  visible_steps: [],
  visibleSteps: [],
  quality_followup_required: true,
  qualityFollowupRequired: true,
  quality_followup: workchainQualityFollowup,
  qualityFollowup: workchainQualityFollowup,
}
workchainQualityFollowupTodoPlan.visible_steps = workchainQualityFollowupTodoPlan.steps
workchainQualityFollowupTodoPlan.visibleSteps = workchainQualityFollowupTodoPlan.steps
const workchainQualityFollowupDisplayStream = {
  schema: 'ccm-streamlined-display-v2',
  user_visible_text: '任务已有处理结果，但最终交付总结还在补齐，还缺少交付证据、验证结果、验收结论。下一步：先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
  tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '已处理任务结果，正在补齐总结证据' },
  workchain: {
    schema: 'ccm-main-agent-workchain-v1',
    mode: 'project_task',
    status: 'completed',
    user_visible_text: '任务已有处理结果，但最终交付总结还在补齐，还缺少交付证据、验证结果、验收结论。下一步：先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
    stages: workchainTodoDisplayStream.workchain.stages.map(stage => ({ ...stage, status: 'completed' })),
    completion_summary: {
      evidence: ['任务已有处理结果'],
      final_summary_quality: { required: true, passed: false, missing: ['交付证据', '验证结果', '验收结论'] },
      quality_followup: workchainQualityFollowup,
    },
    todo_plan: workchainQualityFollowupTodoPlan,
    todoPlan: workchainQualityFollowupTodoPlan,
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true },
      items: [
        { id: 'final-summary-checkpoint', label: '已整理本轮总结', detail: '任务已有处理结果', status: 'done' },
        { id: 'quality-followup-checkpoint', label: '正在补齐交付总结', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', status: 'active' },
      ],
    },
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-quality-followup' }, { label: 'Raw', value: 'CCM_AGENT_RECEIPT raw payload' }] }],
  },
  todo_plan: workchainQualityFollowupTodoPlan,
  todoPlan: workchainQualityFollowupTodoPlan,
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true },
    items: [
      { id: 'final-summary-checkpoint', label: '已整理本轮总结', detail: '任务已有处理结果', status: 'done' },
      { id: 'quality-followup-checkpoint', label: '正在补齐交付总结', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', status: 'active' },
    ],
  },
  technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-quality-followup' }, { label: 'Raw', value: 'CCM_AGENT_RECEIPT raw payload' }] }],
}
const workchainQualityFollowupCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-quality-followup',
  title: '主 Agent 最终总结补齐',
  goal: '确保最终交付总结包含证据、验证和验收结论。',
  phase: 'completed',
  phase_label: '总结待补齐',
  status: 'completed',
  progress: 90,
  display_stream: workchainQualityFollowupDisplayStream,
  todo_plan: workchainQualityFollowupTodoPlan,
  todoPlan: workchainQualityFollowupTodoPlan,
  progress_checkpoints: workchainQualityFollowupDisplayStream.progress_checkpoints,
  quality_followup: workchainQualityFollowup,
  qualityFollowup: workchainQualityFollowup,
  completed: ['任务已有处理结果'],
  blockers: [],
  next_action: '先补齐交付证据、验证结果和验收结论。',
  technical: { trace_id: 'trace-workchain-quality-followup', display_stream: workchainQualityFollowupDisplayStream },
}
const ordinaryWorkchainTodoPlan = {
  ...workchainTodoPlan,
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: true, technical_default_collapsed: true },
  steps: [
    { id: 'chat', content: '直接回答普通问话', activeForm: '正在回答普通问话', active_form: '正在回答普通问话', status: 'completed' },
  ],
}
const ordinaryWorkchainTodoCard = {
  version: 1,
  visible: true,
  task_id: 'task-ordinary-workchain-todo',
  title: '普通问话',
  goal: '解释 TestAgent 当前状态。',
  phase: 'completed',
  phase_label: '已回复',
  status: 'completed',
  progress: 100,
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'TestAgent 的业务流程由另一个 Agent 处理，我只会连接主 Agent 和 TestAgent 的边界。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '本轮没有需要展示的工具调用' },
    workchain: { schema: 'ccm-main-agent-workchain-v1', mode: 'conversation', todo_plan: ordinaryWorkchainTodoPlan, todoPlan: ordinaryWorkchainTodoPlan, technical_details: [], completion_summary: { evidence: [] } },
    todo_plan: ordinaryWorkchainTodoPlan,
    todoPlan: ordinaryWorkchainTodoPlan,
    technical_details: [],
  },
  completed: [],
  blockers: [],
  next_action: '继续等待你的下一步要求。',
}

const deliveryReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '修复登录状态刷新问题',
  status: 'done',
  status_label: '已完成',
  headline: '登录状态刷新后的恢复逻辑已经完成。',
  sections: [
    { id: 'completed', title: '完成内容', items: ['刷新页面后会恢复登录态。'] },
    { id: 'plan_review', title: '计划回顾', items: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'] },
    { id: 'scope', title: '涉及范围', items: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
    { id: 'verification', title: '验证结果', items: ['npm run test:login-state'] },
    { id: 'verification_evidence', title: '验收证据', items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'] },
    { id: 'acceptance', title: '验收结论', items: ['主 Agent 验收：已通过', '计划核对：已对齐'] },
    { id: 'independent_review', title: '复核结论', items: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'] },
    { id: 'risks', title: '风险与待确认', items: ['暂无需要你额外处理的风险。'] },
    { id: 'user_handoff', title: '接下来建议', items: ['查看改动：web 产生了 2 个文件改动。', '核对交付总结：查看完成内容、验证结果和风险提示。'] },
    { id: 'next', title: '下一步', items: ['可以查看改动详情，或继续补充新的要求。'] },
  ],
  files: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'],
  plan_review: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'],
  planReview: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'],
  change_summary: renderedChangeSummary,
  verification: ['npm run test:login-state'],
  verification_evidence: {
    schema: 'ccm-main-agent-verification-evidence-v1',
    title: '验收证据',
    status: 'ready',
    status_label: '证据充分',
    metric_value: '1 项实际执行',
    metric_detail: '已实际执行 1 项验证：npm run test:login-state；外部 Runner 证据 1 项：验证来源已记录。',
    metric_tone: 'success',
    executed_count: 1,
    failed_count: 0,
    suggested_count: 0,
    missing_required_count: 0,
    external_runner_count: 1,
    required_gate_passed: true,
    source_gate_passed: true,
    executed: ['npm run test:login-state'],
    failed: [],
    suggested: [],
    missing_required: [],
    items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    next_action: '可以结合改动明细和验收结论一起核对。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  verificationEvidence: {
    schema: 'ccm-main-agent-verification-evidence-v1',
    title: '验收证据',
    status: 'ready',
    status_label: '证据充分',
    items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
  },
  acceptance: ['主 Agent 验收：已通过', '计划核对：已对齐'],
  independent_review: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
  independentReview: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
  independent_review_gate: { required: true, pass: true, reason: '复杂变更已完成独立复核。', evidence: ['TestAgent verdict: passed'] },
  independentReviewGate: { required: true, pass: true, reason: '复杂变更已完成独立复核。', evidence: ['TestAgent verdict: passed'] },
  risks: [],
  next_action: ['可以查看改动详情，或继续补充新的要求。'],
  user_handoff: renderedUserHandoff,
  userHandoff: renderedUserHandoff,
  completion_card: {
    schema: 'ccm-main-agent-completion-card-v1',
    title: '最终交付总览',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    metrics: [
      { id: 'status', label: '状态', value: '已完成', tone: 'success' },
      { id: 'scope', label: '涉及范围', value: '2 个文件', detail: 'frontend/src/stores/login.js；frontend/src/views/Login.vue' },
      { id: 'verification', label: '验证', value: '1 项实际执行', detail: '已实际执行 1 项验证：npm run test:login-state；外部 Runner 证据 1 项：验证来源已记录。', tone: 'success' },
      { id: 'acceptance', label: '验收', value: '已通过', detail: '主 Agent 验收：已通过', tone: 'success' },
      { id: 'risk', label: '风险', value: '无待处理风险', tone: 'success' },
    ],
    highlights: ['刷新页面后会恢复登录态。'],
    verification: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    verification_evidence: {
      schema: 'ccm-main-agent-verification-evidence-v1',
      title: '验收证据',
      status: 'ready',
      status_label: '证据充分',
      items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    },
    acceptance: ['主 Agent 验收：已通过', '计划核对：已对齐'],
    risks: ['暂无需要你额外处理的风险。'],
    next_action: '可以查看改动详情，或继续补充新的要求。',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  pickup_summary: {
    schema: 'ccm-main-agent-pickup-summary-v1',
    title: '回来继续看这里',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    current_state: '可以直接查看完成内容、涉及范围和验证结果；原始执行记录在技术详情里。',
    review_items: ['复核：独立复核：已通过', '验收：主 Agent 验收：已通过', '计划：执行前计划：登录态恢复执行计划', '改动：frontend/src/stores/login.js', '验证：npm run test:login-state'],
    resume_action: '可以查看改动详情，或继续补充新的要求。',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
}

const planGapDeliveryReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '登录修复验收缺口',
  status: 'failed',
  status_label: '未完成',
  headline: '登录修复还缺验证证据。',
  sections: [
    { id: 'completed', title: '完成内容', items: ['已整理登录修复当前状态。'] },
    { id: 'plan_review', title: '计划回顾', items: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'] },
    { id: 'verification', title: '验证结果', items: ['npm test -- --run login 失败'] },
    { id: 'verification_evidence', title: '验收证据', items: ['失败验证 1 项：npm test -- --run login 失败', '项目必需验证缺口 1 项：web：npm run test:login'] },
    { id: 'acceptance', title: '验收结论', items: ['最终验收：未通过，仍需处理缺口', '计划核对：仍有缺口'] },
    { id: 'risks', title: '未完成原因', items: ['缺少测试环境变量'] },
    { id: 'next_action', title: '下一步', items: ['先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）'] },
  ],
  files: [],
  plan_review: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'],
  planReview: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'],
  verification: ['npm test -- --run login 失败'],
  acceptance: ['最终验收：未通过，仍需处理缺口', '计划核对：仍有缺口'],
  risks: ['缺少测试环境变量'],
  next_action: ['先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）'],
  pickup_summary: {
    schema: 'ccm-main-agent-pickup-summary-v1',
    title: '恢复处理时先看这里',
    status: 'failed',
    status_label: '未完成',
    headline: '登录修复还缺验证证据。',
    current_state: '可以从计划缺口继续处理，原始执行记录在技术详情里。',
    review_items: ['计划：计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '待确认：缺少测试环境变量'],
    resume_action: '先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  user_handoff: {
    schema: 'ccm-main-agent-user-handoff-v1',
    title: '接下来建议',
    status: 'failed',
    status_label: '未完成',
    headline: '这轮任务没有完整完成，先补齐计划缺口再继续验收。',
    primary_action: {
      id: 'retry_or_continue',
      label: '补齐计划缺口后继续',
      detail: '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
      kind: 'retry',
      tone: 'primary',
    },
    secondary_actions: [{
      id: 'review_verification',
      label: '核对验证结果',
      detail: '已整理 1 项验证记录。',
      kind: 'review_delivery',
      tone: 'outline',
    }],
    evidence: ['计划：执行前计划：登录修复执行计划', '计划缺口：1 项', '验证：1 项已执行', '待确认：1 项'],
    unresolved: ['计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '缺少测试环境变量'],
    next_action: '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
}

const planGapDeliveryCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-gap-delivery',
  title: '登录修复验收缺口',
  goal: '修复登录恢复并完成验证。',
  phase: 'failed',
  phase_label: '待补齐',
  progress: 78,
  active_agents: [],
  agents: [],
  completed: ['已整理登录修复当前状态'],
  blockers: ['缺少测试环境变量'],
  next_action: '先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
  delivery: { headline: planGapDeliveryReport.headline, files: [], verification: planGapDeliveryReport.verification, risks: planGapDeliveryReport.risks, acceptance_passed: false },
  delivery_report: planGapDeliveryReport,
  pickup_summary: planGapDeliveryReport.pickup_summary,
  user_handoff: planGapDeliveryReport.user_handoff,
  technical: { trace_id: 'trace-plan-gap-delivery', user_handoff: planGapDeliveryReport.user_handoff },
  actions: [],
}

const testAgentExecutionPlanFixture = {
  schema: 'ccm-test-agent-execution-plan-v1',
  valid: true,
  workOrderId: 'wo-test-agent-render',
  artifactDir: 'C:/tmp/test-agent-artifacts/render',
  summary: {
    projects: 1,
    commands: 1,
    httpChecks: 1,
    adversarialHttpChecks: 1,
    browserChecks: 2,
    expectedArtifactTypes: ['report_json', 'report_markdown', 'artifact_manifest', 'verdict_json', 'screenshot', 'browser_har', 'download', 'upload_file'],
  },
  commands: [{ command: 'npm run test:login-state' }],
  issues: [],
}

const testAgentExecutionPlanTextSummary = 'TestAgent 复核计划：1 个项目，1 个命令，2 个 HTTP 检查，2 个浏览器检查；预期证据：结构化报告、报告文档、证据清单、复核结论、页面截图、网络归档、文件下载证据、文件上传证据'

const testAgentBlockedExecutionPlanFixture = {
  ...testAgentExecutionPlanFixture,
  valid: false,
  workOrderId: 'wo-test-agent-blocked-render',
  artifactDir: 'C:/tmp/test-agent-artifacts/blocked',
  summary: {
    projects: 1,
    commands: 0,
    httpChecks: 0,
    adversarialHttpChecks: 0,
    browserChecks: 0,
    expectedArtifactTypes: ['report_json', 'artifact_manifest', 'verdict_json'],
  },
  commands: [],
  issues: [
    { severity: 'error', code: 'missing_work_dir', message: 'Project workDir is required. C:/tmp/test-agent-artifacts/blocked' },
  ],
}

const testAgentBlockedPlanCard = {
  version: 1,
  visible: true,
  task_id: 'task-test-agent-plan-blocked',
  title: 'TestAgent 复核计划预检',
  goal: '在真实复核前确认 TestAgent 工作单是否可执行。',
  phase: 'blocked',
  phase_label: '受阻',
  progress: 42,
  active_agents: ['TestAgent 等待交接信息修复'],
  agents: [{ name: 'TestAgent', status: 'blocked', summary: '复核计划预检未通过，等待主 Agent 修复交接信息。' }],
  completed: ['已生成 TestAgent 复核计划'],
  blockers: ['缺少项目工作目录，请补齐 TestAgent 交接信息。'],
  next_action: '主 Agent 会先修复 TestAgent 工作单或项目路径，再重新生成复核计划。',
  test_agent_execution_plan_summary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
  testAgentExecutionPlanSummary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
  test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
  testAgentExecutionPlan: testAgentBlockedExecutionPlanFixture,
  technical: {
    trace_id: 'trace-test-agent-plan-blocked',
    test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
  },
}

const testAgentFailedReviewSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'needs_rework',
  status_label: '需返工',
  headline: '独立复核发现待处理缺口，我会先安排返工，再重新验收。',
  rows: [
    'TestAgent：未通过，需要返工',
    '必检项 命令验证未覆盖：npm test 未通过',
    '验收条件未通过：登录恢复验证必须通过',
    '浏览器网络：发现 1 个网络问题',
    '把失败检查项带回给原实现成员返工',
    '返工后重新运行 TestAgent 复核',
  ],
  next_action: '把失败检查项带回给原实现成员返工；返工后重新运行 TestAgent 复核。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const testAgentFailedReviewCard = {
  version: 1,
  visible: true,
  task_id: 'task-test-agent-review-failed',
  title: 'TestAgent 独立复核未通过',
  goal: '修复登录状态恢复后，由 TestAgent 做独立复核；当前复核要求返工。',
  phase: 'failed',
  phase_label: '待返工',
  progress: 72,
  active_agents: ['我正在安排返工'],
  agents: [{ name: 'TestAgent', status: 'failed', summary: '独立复核发现待处理缺口，需要原实现成员返工。' }],
  completed: ['已完成 TestAgent 独立复核'],
  blockers: ['命令验证未通过', '登录恢复验收条件未通过'],
  next_action: '把失败检查项带回给原实现成员返工；返工后重新运行 TestAgent 复核。',
  independent_review_summary: testAgentFailedReviewSummary,
  independentReviewSummary: testAgentFailedReviewSummary,
  independent_review: testAgentFailedReviewSummary.rows,
  independentReview: testAgentFailedReviewSummary.rows,
  delivery_report: {
    schema: 'ccm-main-agent-delivery-report-v1',
    title: 'TestAgent 复核返工',
    status: 'failed',
    status_label: '待返工',
    headline: 'TestAgent 独立复核没有通过，本轮不能直接验收完成。',
    sections: [
      { id: 'completed', title: '已完成检查', items: ['已运行 TestAgent 独立复核。'] },
      { id: 'independent_review', title: '复核结论', items: testAgentFailedReviewSummary.rows },
      { id: 'acceptance', title: '验收结论', items: ['最终验收：未通过，需要先返工。'] },
      { id: 'risks', title: '未完成原因', items: ['命令验证未通过，登录恢复验收条件未通过。'] },
      { id: 'next_action', title: '下一步', items: ['把失败检查项带回给原实现成员返工；返工后重新运行 TestAgent 复核。'] },
    ],
    independent_review_summary: testAgentFailedReviewSummary,
    independentReviewSummary: testAgentFailedReviewSummary,
    independent_review: testAgentFailedReviewSummary.rows,
    independentReview: testAgentFailedReviewSummary.rows,
    acceptance: ['最终验收：未通过，需要先返工。'],
    risks: ['命令验证未通过，登录恢复验收条件未通过。'],
    next_action: ['把失败检查项带回给原实现成员返工；返工后重新运行 TestAgent 复核。'],
    technical_hint: 'TestAgent 原始报告、裁决文件和证据路径已放入技术详情。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'TestAgent 独立复核没有通过，我会先安排原实现成员返工，再重新复核。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '独立复核 1 次，发现 2 个待处理缺口' },
  },
  technical: {
    trace_id: 'trace-test-agent-review-failed',
    test_agent_report: {
      verdict: 'failed',
      recommendation: 'rework',
      needsRework: true,
      report_json: 'C:/tmp/test-agent-artifacts/failed/report.json',
      verdict_json: 'C:/tmp/test-agent-artifacts/failed/verdict.json',
      artifact_manifest: 'C:/tmp/test-agent-artifacts/failed/artifact-manifest.json',
      browser_artifacts: 'C:/tmp/test-agent-artifacts/failed/browser-artifacts',
    },
  },
}

const taskCard = {
  version: 1,
  visible: true,
  task_id: 'task-render-1',
  title: '修复登录状态刷新问题',
  goal: '用户登录后刷新页面仍保持登录态。',
  phase: 'completed',
  phase_label: '已完成',
  progress: 100,
  active_agents: [],
  agents: [{ name: '前端 · web', status: 'done', summary: '已完成登录状态恢复逻辑', blockers: [] }],
  work_items: [
    { id: 'wi-api', subject: '确认登录态接口契约', owner: 'api', target: 'api', status: 'completed', evidence: ['接口契约已确认'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '修复刷新后登录态恢复', owner: 'web', target: 'web', status: 'completed', evidence: ['登录状态恢复逻辑已完成'], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: { total: 2, counts: { completed: 2 }, all_completed: true },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'completed',
    status_label: '已收齐',
    headline: '2 个子 Agent 的结果已收齐，主 Agent 正在整理验收和交付总结。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '已确认登录态接口契约', current_focus: '确认登录态接口契约', evidence: [{ id: 'result', label: '结果', value: '已完成' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '登录状态恢复逻辑已完成', current_focus: '修复刷新后登录态恢复', evidence: [{ id: 'files', label: '文件', value: '2 个', detail: 'frontend/src/stores/login.js、frontend/src/views/Login.vue' }, { id: 'verification', label: '验证', value: '1 项', detail: 'npm run test:login-state' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
    ],
    next_action: '主 Agent 会把这些结果合并进最终总结',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  agent_coordination: {
    schema: 'ccm-main-child-agent-coordination-v1',
    title: '协作状态',
    status: 'healthy',
    health: 92,
    child_plan_review: {
      schema: 'ccm-child-agent-plan-review-v1',
      title: '子 Agent 执行计划',
      status: 'approved',
      status_label: '已通过',
      headline: '主 Agent 已检查子 Agent 的接单计划，目标、范围和验证安排清晰。',
      rows: [
        {
          agent: 'web',
          status: 'approved',
          status_label: '计划清晰',
          understood_goal: '修复刷新后登录态恢复。',
          planned_scope: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'],
          verification_plan: ['npm run test:login-state'],
          reason: '目标、范围和验证安排清晰。',
        },
      ],
      next_action: '继续跟踪执行结果、文件改动和验证证据。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  mainAgentDecision: taskCompletedDecision,
  main_agent_decision: taskCompletedDecision,
  display_stream: taskCompletedDecision.display_stream,
  progress_checkpoints: taskCompletedDecision.display_stream.progress_checkpoints,
  completed: ['已创建任务卡', '已完成登录状态恢复修改'],
  blockers: [],
  next_action: '可以查看改动详情，或继续补充新的要求。',
  delivery: { headline: '登录状态刷新后的恢复逻辑已经完成。', files: deliveryReport.files, verification: deliveryReport.verification, risks: [], acceptance_passed: true },
  delivery_report: deliveryReport,
  test_agent_execution_plan_summary: testAgentExecutionPlanTextSummary,
  testAgentExecutionPlanSummary: testAgentExecutionPlanTextSummary,
  test_agent_execution_plan: testAgentExecutionPlanFixture,
  testAgentExecutionPlan: testAgentExecutionPlanFixture,
  plan_mode: renderedPlanMode,
  plan_alignment: renderedPlanAlignment,
  user_handoff: renderedUserHandoff,
  change_summary: renderedChangeSummary,
  actions: [],
  technical: {
    trace_id: 'trace-task-visible',
    execution_ids: ['exec-render-1'],
    session_ids: ['session-render-1'],
    display_stream: taskDecision.display_stream,
    plan_alignment: renderedPlanAlignment,
    change_summary: renderedChangeSummary,
    user_handoff: renderedUserHandoff,
    test_agent_execution_plan: testAgentExecutionPlanFixture,
  },
}

const workQueueCard = {
  version: 1,
  visible: true,
  task_id: 'task-queue-1',
  title: '跨端负责人筛选',
  goal: '后端提供筛选接口后，前端接入负责人筛选 UI。',
  phase: 'executing',
  phase_label: '正在修改',
  progress: 58,
  active_agents: ['前端 · web 等待派发'],
  agents: [
    { name: '后端 · api', status: 'done', summary: '负责人筛选接口已完成' },
    { name: '前端 · web', status: 'pending', summary: '前置接口完成后可继续接入 UI' },
  ],
  work_items: [
    { id: 'wi-api', subject: '提供 owner 筛选接口', activeForm: '已完成 owner 筛选接口', owner: 'api', target: 'api', status: 'completed', evidence: ['接口契约已确认'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI', owner: 'web', target: 'web', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: {
    total: 2,
    counts: { completed: 1, pending: 1 },
    next_claimable: [{ id: 'wi-web', target: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
    dependency_summary: {
      schema: 'ccm-main-agent-work-item-dependency-summary-v1',
      title: '依赖与派发',
      status: 'ready_to_dispatch',
      status_label: '1 项可派发',
      headline: '1 个工作项已经解锁，可以继续派发。',
      rows: [{
        id: 'wi-web',
        target: 'web',
        subject: '接入 owner 筛选 UI',
        status: 'pending',
        dependency_count: 1,
        open_dependency_count: 0,
        label: 'web 的前置依赖已完成，可以进入下一步',
        next_action: '可以派发给对应子 Agent 继续执行。',
      }],
      next_action: '优先派发已解锁工作项，并继续监听前置任务状态。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
    all_completed: false,
  },
  work_item_unlock_summary: {
    schema: 'ccm-main-agent-work-item-unlock-summary-v1',
    title: '前置完成，下一步已解锁',
    status: 'auto_dispatch_deferred',
    status_label: '已自动接上',
    headline: 'api 完成后，“接入 owner 筛选 UI”已经解锁，主 Agent 已自动接上派发。',
    rows: [{ id: 'wi-web', target: 'web', owner: 'web', subject: '接入 owner 筛选 UI', label: 'web 的前置依赖已完成，可以进入下一步' }],
    next_claimable: [{ id: 'wi-web', target: 'web', owner: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
    next_action: '当前执行轮结束后，主 Agent 会继续派发这个已解锁工作项。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { completed_agent: 'api', unlocked_work_item_ids: ['wi-web'], auto_dispatch: { deferred: true } },
  },
  work_item_claim_summary: {
    schema: 'ccm-main-agent-work-item-claim-summary-v1',
    title: '派发状态',
    status: 'agent_busy',
    status_label: '继续等待',
    headline: 'web 正在处理“修复登录状态恢复”，“接入 owner 筛选 UI”会继续等待。',
    next_action: '当前工作完成后，主 Agent 会重新检查并派发这个工作项。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { reason_code: 'agent_busy', work_item_id: 'wi-web', busy_work_item_id: 'wi-login' },
  },
  completion_readiness_summary: {
    schema: 'ccm-main-agent-completion-readiness-v1',
    title: '完成前收尾',
    status: 'blocked',
    status_label: '尚未收尾',
    headline: '还有 1 个工作项未完成，1 个子 Agent 会话仍在处理，主 Agent 不会提前宣布完成。',
    rows: [{ target: 'web', subject: '接入 owner 筛选 UI', status: 'in_progress', status_label: '执行中' }],
    open_session_count: 1,
    unresolved_work_item_count: 1,
    next_action: '先完成或处理这些工作项；全部收敛后再做最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { unresolved_work_item_ids: ['wi-web'], open_session_ids: ['session-hidden'] },
  },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'running',
    status_label: '跟踪中',
    headline: '2 个子 Agent 的进展已汇总，主 Agent 会继续跟踪文件、验证和结果。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '负责人筛选接口已完成', current_focus: '提供 owner 筛选接口', evidence: [{ id: 'files', label: '文件', value: '1 个', detail: 'backend/server.ts' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'pending', status_label: '等待中', summary: '等待派发：接入 owner 筛选 UI', current_focus: '接入 owner 筛选 UI', evidence: [], blockers: [], next_action: '等待前置条件满足后派发' },
    ],
    next_action: '等待子 Agent 继续提交结果说明和验证',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  agent_coordination: {
    schema: 'ccm-main-child-agent-coordination-v1',
    title: '协作状态',
    status: 'needs_attention',
    health: 72,
    child_plan_review: {
      schema: 'ccm-child-agent-plan-review-v1',
      title: '子 Agent 执行计划',
      status: 'needs_revision',
      status_label: '需调整',
      headline: '1 个子 Agent 的执行计划还不够清楚，主 Agent 会先要求补齐目标、范围或验证安排。',
      rows: [
        { agent: 'web', status: 'needs_revision', status_label: '需调整', understood_goal: '', planned_scope: [], verification_plan: [], unclear: ['需要明确 owner 筛选 UI 范围'], reason: '接单说明缺少目标或计划范围' },
      ],
      next_action: '先要求对应子 Agent 重写接单计划，再继续执行或验收。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
    memory_gate_summary: {
      required: true,
      status: 'missing_receipt_reference',
      summary: '结果说明缺少记忆使用声明。',
      rows: [
        { agent: 'web', status: 'missing_receipt_reference', reason: '结果说明缺少记忆使用声明。' },
      ],
    },
  },
  continuation_status: {
    schema: 'ccm-main-agent-continuation-status-v1',
    title: '下一步派发已接上',
    status: 'queued',
    status_label: '已入队',
    headline: '主 Agent 已接收 web 的已解锁工作项，只推进这一小步。',
    kind: 'supplement',
    kind_label: '补充要求',
    strategy: 'continue_next_work_item',
    route_label: '继续派发已解锁工作项',
    target: 'web',
    reason: '接入 owner 筛选 UI',
    handoff_steps: [
      { id: 'capture', label: '已记录补充要求', detail: '接入 owner 筛选 UI' },
      { id: 'preserve_context', label: '保留已有上下文', detail: 'api 前置接口和当前验收结果会继续作为判断依据。' },
      { id: 'continue', label: '继续同一任务', detail: '主 Agent 会复用原任务证据继续执行，完成后重新验收并总结。' },
    ],
    next_action: '主 Agent 会复用原任务证据继续执行，完成后重新验收并总结。',
    at: now,
  },
  receipt_rework_summary: {
    schema: 'ccm-main-agent-receipt-rework-summary-v1',
    title: '结果复检',
    status: 'needs_rework',
    status_label: '1 个缺口',
    headline: 'web 的结果说明还需要补齐，主 Agent 不会把这轮直接判定完成。',
    gaps: [{
      id: 'weak_receipt',
      target: 'web',
      title: '要求补充高质量结果说明',
      reason: '结果说明质量缺少：已执行验证、声明记忆使用',
      missing: ['已执行验证', '声明记忆使用'],
      tone: 'warning',
      action: { kind: 'targeted_rework', id: 'weak_receipt', title: '要求补充高质量结果说明', target: 'web', reason: '结果说明质量缺少：已执行验证、声明记忆使用', tone: 'warning', label: '要求补充高质量结果说明' },
    }],
    next_action: '可以按单个结果说明缺口定向补充；补齐后主 Agent 会重新验收并汇总。',
  },
  acceptance_review: {
    title: '主 Agent 验收',
    status: 'reviewing',
    headline: '还缺 3 项证据，不能宣布完成',
    checks: [
      { id: 'ack_gate', label: '接单说明完整', ok: false, detail: '还有 1 个接单说明需要补齐目标、范围和验证安排' },
      { id: 'memory_gate_receipt', label: '记忆使用声明', ok: false, detail: '还有 1 条记忆使用声明需要补齐' },
      { id: 'api_microcompact_receipt', label: '上下文压缩计划使用说明', ok: false, detail: '还有 1 个上下文压缩计划缺少使用状态' },
    ],
    missing: ['接单说明完整', '记忆使用声明', '上下文压缩计划使用说明'],
    next_action: '继续返工或补齐缺失证据后再验收',
    technical: {
      raw_gate_checks: [
        { id: 'ack_gate', detail: 'ACK raw detail' },
        { id: 'memory_gate_receipt', detail: '记忆 gate raw detail' },
        { id: 'api_microcompact_receipt', detail: 'API microcompact edit plan raw detail' },
      ],
    },
  },
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true, raw_events_default_collapsed: true },
    items: [
      { id: 'cp-recovery', label: '主 Agent 已接上恢复任务', detail: '目标、状态与验收条件已重新核对。', status: 'done', phase: 'planning' },
      { id: 'cp-receipt', label: 'web：提交结果说明', detail: '已完成页面改动并提交结果状态。', status: 'done', phase: 'executing' },
      { id: 'cp-rework', label: '主 Agent 已发起定向补充', detail: '补齐 npm test 证据。', status: 'active', phase: 'rework' },
      { id: 'cp-supervisor', label: '全局监工已安排返工', detail: '已按交付缺口重派 web。', status: 'active', phase: 'rework' },
    ],
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'api 前置接口已完成，web 已解锁，可以继续派发。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'receipt-status 1 条，协作通道 2 个' },
  },
  completed: ['api 前置接口已完成，等待 web 结果说明'],
  blockers: [],
  next_action: '把已解锁的 web 工作项派发给前端 Agent。',
  delivery: { headline: '已有前置交付，下一步可以接入前端。', files: [], verification: [], risks: [], acceptance_passed: false },
  delivery_report: {
    schema: 'ccm-main-agent-delivery-report-v1',
    title: '历史结果说明交付摘要',
    status: 'needs_rework',
    status_label: '结果说明待补',
    headline: '结构化结果说明质量不足，trace_id=legacy-secret',
    sections: [
      { id: 'legacy_receipt', title: '结果说明质量', items: ['web 结果说明缺少验证', 'CCM_AGENT_RECEIPT raw payload trace_id=legacy-secret should stay folded'] },
      { id: 'next', title: '下一步', items: ['补充结果说明后继续验收'] },
    ],
    next_action: '补充结果说明后继续验收',
  },
  actions: [],
  technical: { trace_id: 'trace-work-queue', execution_ids: ['exec-api'], session_ids: [] },
}

const workItemVerificationReminderCard = {
  ...workQueueCard,
  task_id: 'task-work-item-verification-reminder',
  title: '执行队列验收提醒',
  goal: '多个实现工作项已经完成，主 Agent 需要在最终总结前补齐真实验收。',
  phase: 'reviewing',
  phase_label: '等待验收',
  progress: 82,
  active_agents: ['主 Agent 正在补齐验收'],
  work_items: [
    { id: 'wi-api', subject: '实现接口参数兼容', owner: 'api', target: 'api', status: 'completed', evidence: ['接口兼容逻辑已完成'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '接入前端筛选控件', owner: 'web', target: 'web', status: 'completed', evidence: ['筛选控件已接入'], blockedBy: [], attempt: 1 },
    { id: 'wi-doc', subject: '整理交付说明', owner: 'docs', target: 'docs', status: 'completed', evidence: ['交付说明已整理'], blockedBy: [], attempt: 1 },
  ],
  work_item_summary: {
    total: 3,
    counts: { completed: 3 },
    next_claimable: [],
    all_completed: true,
    verification_nudge: true,
    verification_reminder: {
      schema: 'ccm-main-agent-work-item-verification-reminder-v1',
      status: 'needs_verification_work_item',
      title: '执行队列还缺验收',
      headline: '工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。',
      reason: '3 个以上工作项全部完成时，需要在最终总结前补一次真实验收。',
      next_action: '主 Agent 会补齐验收或说明无法验证的原因，再给出最终交付总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  agent_progress_summary: {
    ...workQueueCard.agent_progress_summary,
    headline: '3 个工作项都已完成，主 Agent 正在补齐最终验收证据。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '接口参数兼容已完成', current_focus: '实现接口参数兼容', evidence: [], blockers: [], next_action: '等待主 Agent 验收' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '筛选控件已接入', current_focus: '接入前端筛选控件', evidence: [], blockers: [], next_action: '等待主 Agent 验收' },
    ],
    next_action: '补齐真实验收后再输出最终总结',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '执行队列已经收敛，最终总结前还需要补齐验收。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '协作通道 3 个，验收证据待补' },
  },
  completed: ['接口参数兼容已完成', '筛选控件已接入', '交付说明已整理'],
  next_action: '先补齐验收，再生成最终总结。',
  delivery: { headline: '已有实现结果，验收证据仍在补齐。', files: [], verification: [], risks: ['缺少真实验收证据'], acceptance_passed: false },
}

const receiptResolvedCard = {
  ...workQueueCard,
  task_id: 'task-receipt-resolved',
  title: '负责人筛选结果复检',
  phase: 'reviewing',
  phase_label: '正在运行测试',
  progress: 86,
  active_agents: ['主 Agent 正在最终验收'],
  agents: [
    { name: '后端 · api', status: 'done', summary: '负责人筛选接口已完成' },
    { name: '前端 · web', status: 'done', summary: '已补充验证和记忆声明' },
  ],
  work_items: workQueueCard.work_items.map(item => item.id === 'wi-web' ? { ...item, status: 'completed', evidence: ['已补充验证和记忆声明'] } : item),
  work_item_summary: { total: 2, counts: { completed: 2 }, all_completed: true, next_claimable: [] },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'completed',
    status_label: '已收齐',
    headline: '2 个子 Agent 的结果已收齐，主 Agent 正在整理验收和交付总结。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '负责人筛选接口已完成', current_focus: '提供 owner 筛选接口', evidence: [{ id: 'files', label: '文件', value: '1 个', detail: 'backend/server.ts' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '已补充验证和记忆声明', current_focus: '接入 owner 筛选 UI', evidence: [{ id: 'verification', label: '验证', value: '1 项', detail: 'npm test' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
    ],
    next_action: '主 Agent 会把这些结果合并进最终总结',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  receipt_rework_summary: {
    schema: 'ccm-main-agent-receipt-rework-summary-v1',
    title: '结果复检',
    status: 'passed',
    status_label: '已通过',
    headline: 'web 的结果说明已完成复检，主 Agent 会继续收敛最终交付。',
    gaps: [],
    active_rework: [],
    resolved: [{
      target: 'web',
      title: '结果说明已补齐',
      reason: '结果说明评分 100，主 Agent 已重新验收。',
      status: 'passed',
      at: now,
    }],
    next_action: '继续执行剩余验收；如果所有检查通过，主 Agent 会输出最终总结。',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'web 已补齐结果说明，主 Agent 正在做最终验收。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '结果复检已通过，等待最终总结' },
  },
  completed: ['web 已补齐结果说明'],
  blockers: [],
  next_action: '等待主 Agent 完成最终验收总结。',
}

const goalRevisionContinuationCard = {
  ...workQueueCard,
  task_id: 'task-goal-revision-continuation',
  title: '支付流程目标调整',
  goal: '原任务正在处理支付流程，现在用户要求保留旧支付表，只新增兼容字段。',
  phase: 'executing',
  phase_label: '重新核对',
  progress: 42,
  active_agents: ['主 Agent 正在重新核对计划'],
  agents: [
    { name: '后端 · api', status: 'running', summary: '当前轮执行中，等待主 Agent 接住目标调整' },
    { name: '前端 · web', status: 'pending', summary: '等待新的计划边界' },
  ],
  continuation_status: {
    schema: 'ccm-main-agent-continuation-status-v1',
    title: '目标调整已接收',
    status: 'interrupting',
    status_label: '正在停止当前轮',
    headline: '主 Agent 已收到新的目标边界，会先停止可能跑偏的当前执行轮，再重新核对计划。',
    kind: 'revise_goal',
    kind_label: '目标调整',
    strategy: 'replan_same_task',
    route_label: '先停止当前轮再重核计划',
    replan_required: true,
    interrupt_current_run: true,
    reason: '先保留旧支付表，只新增兼容字段。',
    handoff_steps: [
      { id: 'capture', label: '已记录新的目标边界', detail: '先保留旧支付表，只新增兼容字段。' },
      { id: 'preserve_context', label: '保留已有上下文', detail: '已完成的文件、验证和子 Agent 结果说明会继续作为判断依据。' },
      { id: 'interrupt_and_replan', label: '停止当前轮并重核计划', detail: '主 Agent 正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。' },
    ],
    next_action: '主 Agent 正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。',
    at: now,
  },
  acceptance_review: {
    title: '主 Agent 验收',
    status: 'reviewing',
    headline: '还缺 3 项证据，不能宣布完成',
    checks: [
      { id: 'ack_gate', label: '接单说明完整', ok: false, detail: '还有 1 个接单说明需要补齐目标、范围和验证安排' },
      { id: 'memory_gate_receipt', label: '记忆使用声明', ok: false, detail: '还有 1 条记忆使用声明需要补齐' },
      { id: 'api_microcompact_receipt', label: '上下文压缩计划使用说明', ok: false, detail: '还有 1 个上下文压缩计划缺少使用状态' },
    ],
    missing: ['接单说明完整', '记忆使用声明', '上下文压缩计划使用说明'],
    next_action: '继续返工或补齐缺失证据后再验收',
    technical: {
      raw_gate_checks: [
        { id: 'ack_gate', detail: 'ACK raw detail' },
        { id: 'memory_gate_receipt', detail: '记忆 gate raw detail' },
        { id: 'api_microcompact_receipt', detail: 'API microcompact edit plan raw detail' },
      ],
    },
  },
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true, raw_events_default_collapsed: true },
    items: [
      { id: 'cp-running', label: '当前执行轮仍在收尾', detail: '主 Agent 不会丢掉已返回的上下文。', status: 'active', phase: 'executing' },
      { id: 'cp-goal-revision', label: '用户调整了目标边界', detail: '本轮结束后会先重核计划。', status: 'warning', phase: 'rework' },
    ],
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '目标调整已收到，主 Agent 会在当前轮结束后重新核对计划。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '目标调整已记录，等待当前执行轮结束' },
  },
  completed: ['已接收目标调整'],
  blockers: ['等待当前执行轮结束后重核计划'],
  next_action: '当前执行轮结束后，先重新核对计划，再继续执行。',
}

const mainAgentStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'completed',
  label: '已完成',
  task_id: 'task-render-1',
  running_child_agents: [],
  open_qa_count: 0,
  latest_progress_checkpoint: {
    id: 'completion-task-render-1',
    label: '任务交付完成',
    detail: '登录状态刷新后的恢复逻辑已经完成。',
    status: 'done',
    phase: 'completed',
    task_id: 'task-render-1',
  },
  recent_progress_checkpoints: [
    { id: 'cp-dispatch', label: '已派发给子 Agent', detail: 'web 正在修改登录状态恢复逻辑。', status: 'done', phase: 'executing' },
    { id: 'cp-review', label: '已检查交付质量', detail: '主 Agent 已核对文件变更和验证结果。', status: 'done', phase: 'reviewing' },
    { id: 'completion-task-render-1', label: '任务交付完成', detail: '登录状态刷新后的恢复逻辑已经完成。', status: 'done', phase: 'completed' },
  ],
  completion_summary: {
    schema: 'ccm-group-main-agent-completion-summary-v1',
    title: '修复登录状态刷新问题',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    file_change_count: 2,
    verification_count: 1,
    risk_count: 0,
    next_action: '可以查看改动详情，或继续补充新的要求。',
  },
  pickup_summary: deliveryReport.pickup_summary,
  pickupSummary: deliveryReport.pickup_summary,
  latest_delivery_summary: {
    actual_file_change_count: 2,
    external_runner_verification_count: 1,
    delivery_report: deliveryReport,
    pickup_summary: deliveryReport.pickup_summary,
  },
}

const groupChildAgentActiveSummary = {
  schema: 'ccm-group-child-agent-status-summary-v1',
  title: '子 Agent 等待情况',
  status: 'needs_attention',
  status_label: '需补齐',
  completed_agents: ['api'],
  running_agents: ['web'],
  waiting_agents: [],
  attention_agents: ['qa'],
  summary_text: '已完成：api；处理中：web；待补齐：qa',
  next_action: '主 Agent 会先处理待补齐的验证证据，再汇总验收和最终总结。',
  rows: [
    { agent: 'api', status: 'completed', status_label: '已完成', detail: '接口筛选参数已补齐。' },
    { agent: 'web', status: 'running', status_label: '处理中', detail: '正在接入 owner 筛选 UI。' },
    { agent: 'qa', status: 'blocked', status_label: '待补齐', detail: '等待补充筛选场景验证证据。' },
  ],
}

const mainAgentActiveStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'executing',
  label: '正在处理',
  task_id: 'task-active-todo',
  latest_task_title: '接入负责人筛选',
  active_task_count: 1,
  running_child_agents: ['前端 · web 正在处理'],
  child_agent_status_summary: groupChildAgentActiveSummary,
  childAgentStatusSummary: groupChildAgentActiveSummary,
  current_todo_summary: {
    schema: 'ccm-group-main-agent-current-todo-v1',
    title: '我正在这样处理',
    task_id: 'task-active-todo',
    task_title: '接入负责人筛选',
    step_id: 'child_agent_execution',
    label: 'web 正在执行',
    active_form: '子 Agent 正在执行',
    detail: 'web 正在接入 owner 筛选 UI。',
    recent_action: '已派发给子 Agent',
    needs_action: '等待子 Agent 提交结果说明，然后主 Agent 会验收并总结。',
    status: 'in_progress',
    status_label: '进行中',
    progress_label: '4/7',
    completed_count: 4,
    total_count: 7,
    next_action: '等待子 Agent 提交结果说明，然后主 Agent 会验收并总结。',
  },
  latest_progress_checkpoint: {
    id: 'cp-active-web',
    label: 'web 正在修改负责人筛选',
    detail: '主 Agent 已派发任务，等待子 Agent 提交结构化结果说明。',
    status: 'active',
    phase: 'executing',
    task_id: 'task-active-todo',
  },
  recent_progress_checkpoints: [
    { id: 'cp-plan-active', label: '主 Agent 已制定协作计划', detail: '已确认由 web 接入筛选 UI。', status: 'done', phase: 'planning' },
    { id: 'cp-dispatch-active', label: '已派发给子 Agent', detail: 'web 正在处理。', status: 'done', phase: 'dispatching' },
    { id: 'cp-active-web', label: 'web 正在修改负责人筛选', detail: '等待结果说明。', status: 'active', phase: 'executing' },
  ],
  progress_refresh_summary: {
    schema: 'ccm-group-main-agent-progress-refresh-v1',
    title: '进度刷新提醒',
    status: 'needs_refresh',
    status_label: '需要接续',
    headline: 'web 已经一段时间没有新的可展示进展，主 Agent 会先刷新状态，再决定继续等待、重派或定向补充。',
    current_state: 'web 已经一段时间没有新的可展示进展，主 Agent 会先刷新状态，再决定继续等待、重派或定向补充。',
    review_items: ['最后进展：web 正在修改负责人筛选', '待确认：web 是否仍在处理「接入 owner 筛选 UI」', 'trace_id=hidden-progress-refresh'],
    next_action: '先刷新任务卡；如果仍没有新结果，就重新派发或定向补充。',
    display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_details_default_collapsed: true, hide_internal_protocols: true },
  },
  open_qa_count: 0,
  blockers: [],
  needs: [],
  updated_at: now,
}

const mainAgentArchivedTodoStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'completed',
  label: '已完成',
  task_id: 'task-archived-current-todo',
  latest_task_title: '主 Agent 与 TestAgent 对接',
  active_task_count: 0,
  running_child_agents: [],
  current_todo_summary: {
    schema: 'ccm-group-main-agent-current-todo-v1',
    title: '群聊主 Agent 当前计划',
    task_id: 'task-archived-current-todo',
    task_title: '主 Agent 与 TestAgent 对接',
    step_id: 'summarize',
    label: '总结交付',
    active_form: '正在总结交付',
    detail: '计划已全部完成，主视图应只保留最终总结。',
    status: 'completed',
    status_label: '已完成',
    progress_label: '4/4',
    completed_count: 4,
    total_count: 4,
    next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
    display_policy: {
      user_visible: true,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
      archive_completed_todo: true,
      visible_when_completed: false,
    },
  },
  completion_summary: {
    status: 'completed',
    status_label: '已完成',
    headline: '主 Agent 与 TestAgent 的连接闭环已经完成，Todo 已归档。',
    file_change_count: 0,
    verification_count: 1,
    risk_count: 0,
    next_action: '可以继续补充新要求。',
  },
  latest_progress_checkpoint: {
    id: 'cp-archived-current-todo',
    label: '已整理本轮总结',
    detail: '已完成计划、执行、TestAgent 复核和最终总结。',
    status: 'done',
    phase: 'completed',
    task_id: 'task-archived-current-todo',
  },
  open_qa_count: 0,
  blockers: [],
  needs: [],
  updated_at: now,
}

const planRevisionCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-revision',
  title: '调整支付流程',
  goal: '调整支付流程时先确认影响范围。',
  phase: 'needs_user',
  phase_label: '待确认',
  progress: 18,
  active_agents: [],
  agents: [],
  plan_mode: {
    title: '执行前计划',
    mode: 'cc-style-plan-mode',
    requires_confirmation: true,
    auto_continue: false,
    risk: { level: 'high', summary: '涉及支付数据结构，需要先确认执行边界。', reasons: ['数据结构调整', '多项目协作'] },
    revision: {
      status: 'revision_requested',
      count: 1,
      feedback: '先保留旧支付表，只新增兼容字段。',
      next_step: '请重新确认调整后的执行前计划；确认后才会派发子 Agent。',
    },
    needs_clarification: false,
    clarification_questions: [
      {
        id: 'compatibility_boundary',
        question: '是否需要兼容旧数据、旧接口或现有配置？',
        reason: '支付流程改动需要明确兼容策略。',
        examples: ['必须兼容旧接口', '可以只做新逻辑'],
        status: 'answered_by_revision',
        answer: '先保留旧支付表，只新增兼容字段。',
      },
    ],
    impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端页面与交互'], multi_agent: true },
    read_only_exploration: { summary: '只读代码快照和本地知识库召回已用于评估。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
    acceptance: ['必须有结构化结果说明', '必须有文件变更和验证证据', '已纳入用户调整意见：先保留旧支付表，只新增兼容字段。'],
    permission_boundaries: ['确认前不得修改文件', '调整后的计划重新确认前不得派发子 Agent 或修改文件'],
  },
  completed: ['已完成只读探索'],
  blockers: ['等待你确认调整后的执行前计划'],
  next_action: '请确认执行前计划，确认后才会派发子 Agent',
  actions: [
    { id: 'confirm_plan', label: '确认执行', kind: 'confirm_plan', tone: 'primary' },
    { id: 'revise_plan', label: '调整计划', kind: 'revise_plan', tone: 'warning' },
    { id: 'cancel', label: '取消任务', kind: 'cancel', tone: 'danger' },
  ],
  technical: { trace_id: 'trace-plan-revision' },
}

const confirmedPlanFollowupCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-confirmed-followup',
  title: '调整支付流程',
  goal: '按已确认的计划调整支付流程，并保留旧支付表兼容字段。',
  phase: 'executing',
  phase_label: '按计划执行',
  progress: 36,
  active_agents: ['后端 · api 正在执行', '前端 · web 等待接口契约'],
  agents: [
    { name: '后端 · api', status: 'running', summary: '正在新增兼容字段和接口契约' },
    { name: '前端 · web', status: 'pending', summary: '等待后端契约后接入结算页' },
  ],
  plan_mode: {
    title: '执行前计划',
    mode: 'cc-style-plan-mode',
    requires_confirmation: false,
    auto_continue: true,
    confirmation_status: 'confirmed',
    accepted_at: now,
    confirmed_at: now,
    accepted_feedback: '同时更新 README 中的支付兼容说明。',
    risk: { level: 'high', summary: '已按你确认后的边界进入执行，仍会在完成前核对支付兼容风险。', reasons: ['支付流程', '兼容旧数据'] },
    steps: [
      { id: 'understand_goal', label: '理解需求与验收目标', detail: '已确认需要保留旧支付表，只新增兼容字段。', status: 'completed' },
      { id: 'dispatch_sub_agents', label: '派发子 Agent 工作单', detail: 'api 正在执行后端兼容字段，web 等待契约。', status: 'in_progress' },
      { id: 'verify_and_summarize', label: '验收结果并总结给用户', detail: '完成后逐项核对改动、验证和 README 说明。', status: 'pending' },
    ],
    impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端结算页', 'README 兼容说明'], multi_agent: true },
    read_only_exploration: { summary: '只读探索已完成，支付表、接口和结算页都在影响范围内。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
    acceptance: ['旧支付表仍保留', '新增兼容字段并更新接口契约', 'README 写清支付兼容说明', '最终总结前逐项核对验收标准'],
    plan_execution_followup: {
      schema: 'ccm-main-agent-plan-execution-followup-v1',
      status: 'confirmed_tracking',
      title: '计划已确认，正在按计划执行',
      headline: '主 Agent 会带着你的补充要求推进执行，并在最终总结前逐项核对验收标准。',
      accepted_at: now,
      accepted_feedback: '同时更新 README 中的支付兼容说明。',
      next_action: '等待子 Agent 结果说明、文件改动和验证证据；如有偏离，主 Agent 会先返工再总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  work_items: [
    { id: 'wi-api-pay', subject: '新增支付兼容字段', owner: 'api', target: 'api', status: 'running', evidence: [], blockedBy: [], attempt: 1 },
    { id: 'wi-web-pay', subject: '结算页接入兼容提示', owner: 'web', target: 'web', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
    { id: 'wi-doc-pay', subject: '更新 README 兼容说明', owner: 'docs', target: 'docs', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: { total: 3, counts: { running: 1, pending: 2 }, all_completed: false },
  completed: ['执行前计划已确认', '用户补充要求已记录'],
  blockers: [],
  next_action: '等待子 Agent 返回结果说明和验证证据，主 Agent 再验收并总结。',
  actions: [],
  technical: {
    trace_id: 'trace-plan-confirmed-followup',
    raw_payload: 'CCM_AGENT_RECEIPT raw payload should stay folded',
  },
}

const globalHistoryMessage = {
  role: 'assistant',
  content: '登录状态刷新后的恢复逻辑已经完成。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-1',
    status: 'completed',
    user_message: '全局检查登录状态刷新问题并完成修复',
    tool_calls: 1,
    final_reply: deliveryReport.markdown || deliveryReport.headline,
    final_delivery_report: deliveryReport,
    final_report: {
      delivery_report: deliveryReport,
      summary: deliveryReport.headline,
      plan_mode: renderedPlanMode,
      plan_alignment: renderedPlanAlignment,
      actual_file_changes: renderedChangeFiles,
      verification: ['npm run test:login-state'],
      acceptance_gate_passed: true,
    },
    plan_mode: renderedPlanMode,
    plan_alignment: renderedPlanAlignment,
    work_items: [
      { id: 'global-wi-web', subject: '修复登录状态恢复', owner: 'web', target: 'web', status: 'completed', evidence: ['登录状态恢复逻辑已完成'], filesChanged: ['frontend/src/stores/login.js'], verification: ['npm run test:login-state'] },
    ],
    mainAgentDecision: taskCompletedDecision,
    main_agent_decision: taskCompletedDecision,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: deliveryReport.headline,
      delivery_report: deliveryReport,
      main_agent_decision: taskCompletedDecision,
    },
    progress_checkpoints: {
      schema: 'ccm-main-agent-live-checkpoints-v1',
      items: [
        { id: 'global-cp-complete', label: '全局主 Agent 已整理交付总结', detail: deliveryReport.headline, status: 'done', phase: 'completed' },
      ],
    },
  },
}
const globalHistoryCard = globalAgentRunTaskCard(globalHistoryMessage)

const globalDirectDispatchSummary = {
  schema: 'ccm-main-agent-dispatch-launch-summary-v1',
  source: 'global-agent-direct-dispatch',
  title: '已派发的工作',
  count_label: '1 个执行目标',
  headline: '全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。',
  rows: [
    {
      id: 'global-dispatch-send_group_cmd-dev-group',
      kind: 'group',
      agent: 'dev-group',
      role: '群聊主 Agent',
      task: '修复登录状态恢复逻辑，并在任务卡里持续更新计划、执行和最终总结。',
      reason: '全局主 Agent 判断该需求需要群聊主 Agent 接管并继续拆分执行。',
      depends_on: [],
      status: 'dispatched',
      status_label: '已进入任务链路',
    },
  ],
  acceptance: ['下游 Agent 需要给出用户能看懂的处理结果、验证情况和风险。'],
  next_action: '后续进度以群聊任务卡的计划、执行和最终总结为准。',
  technical_hint: '全局运行 ID、Trace、原始工作单和底层执行记录默认收在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false, show_when_plan_archived: true },
}

const setupGlobalAgentFixtureState = () => {
  const streamDispatchSummary = {
    ...globalDirectDispatchSummary,
    rows: globalDirectDispatchSummary.rows.map(row => ({
      ...row,
      reason: 'CCM_AGENT_RECEIPT raw payload should stay inside technical details.',
    })),
  }
  const streamPlanMode = {
    ...renderedPlanMode,
    source: 'global-main-agent-plan-mode-v1',
    schema: 'ccm-global-main-agent-plan-mode-v1',
    requirement: '给开发群派发任务，修复登录状态恢复逻辑',
    requires_confirmation: true,
    auto_continue: false,
    confirmation_status: 'awaiting_confirmation',
    risk: { level: 'medium', summary: '发送群聊指令需要你确认后才会执行。', reasons: ['会改变协作状态', '需要派发给群聊主 Agent'] },
    steps: [
      { id: 'global-plan-step-1', label: '确认目标和影响范围', detail: '先核对登录状态恢复任务要交给哪个群聊。', status: 'completed' },
      { id: 'global-plan-step-2', label: '等待用户确认', detail: '确认前不会发送群聊指令。', status: 'in_progress' },
      { id: 'global-plan-step-3', label: '派发群聊主 Agent 并总结', detail: '执行后说明派发目标、验收标准和下一步。', status: 'pending' },
    ],
    next_step: '等待你确认执行前计划；确认后继续执行并总结。',
  }
  const autoStreamPlanMode = {
    ...streamPlanMode,
    requirement: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
    requires_confirmation: false,
    auto_continue: true,
    confirmation_status: 'auto_continue',
    risk: { level: 'medium', summary: '已在当前授权范围内继续执行。', reasons: ['用户已明确授权', '仍会在完成后总结结果'] },
    steps: [
      { id: 'global-plan-step-1', label: '确认目标和授权范围', detail: '用户已明确授权发送群聊指令。', status: 'completed' },
      { id: 'global-plan-step-2', label: '派发群聊主 Agent', detail: '正在把任务交给 dev-group。', status: 'in_progress' },
      { id: 'global-plan-step-3', label: '检查结果并总结', detail: '完成后说明派发目标、验收标准和下一步。', status: 'pending' },
    ],
    next_step: '继续执行计划，并在完成后给出总结。',
  }
  const globalCompletedArchivedTodoPlan = {
    schema: 'ccm-main-agent-workchain-todo-v1',
    source: 'global-stream',
    title: '全局主 Agent 当前计划',
    steps: [
      { id: 'understand', label: '确认目标和影响范围', active_form: '正在确认目标和影响范围', status: 'completed' },
      { id: 'dispatch', label: '派发群聊主 Agent', active_form: '正在派发群聊主 Agent', status: 'completed' },
      { id: 'verify', label: '核对 TestAgent 复核和验证结果', active_form: '正在核对 TestAgent 复核和验证结果', status: 'completed' },
      { id: 'summary', label: '整理最终总结', active_form: '正在整理最终总结', status: 'completed' },
    ],
    visible_steps: [],
    visibleSteps: [],
    completed_count: 4,
    total_count: 4,
    progress_label: '4/4',
    verification: ['TestAgent 独立复核已通过'],
    independent_review: ['TestAgent：已通过'],
    display_policy: {
      user_visible: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      archive_completed_todo: true,
      archiveCompletedTodo: true,
      visible_when_completed: false,
      visibleWhenCompleted: false,
    },
  }
  globalAgentFixtureSessions = [
    {
      id: 'global-stream-fixture',
      name: '全局流式派发',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: 'user',
          content: '你是谁？',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '🧠 理解需求：这是普通问话，不创建任务。\n✍️ 组织回复：直接回答用户。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧠', title: '理解需求', text: '这是普通问话，直接回答用户。' },
            { tone: 'ok', icon: '✍️', title: '组织回复', text: '不创建 Todo，也不派发给下游 Agent。' },
          ],
        },
        {
          role: 'user',
          content: '给开发群派发任务，修复登录状态恢复逻辑',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '🔐 等待授权确认：发送群聊指令需要确认。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已整理执行前计划，确认后再发送群聊指令。' },
            { tone: 'waiting', icon: '🔐', title: '等待授权确认', text: '这个操作需要你确认后才会继续。' },
          ],
          agenticRun: {
            id: 'global-plan-stream-run',
            status: 'waiting_confirmation',
            phase: 'needs_confirmation',
            user_message: '给开发群派发任务，修复登录状态恢复逻辑',
            original_user_message: '给开发群派发任务，修复登录状态恢复逻辑',
            final_reply: '发送群聊指令需要确认后才能继续。',
            pending_tool: { name: 'send_group_cmd', risk: 'write', signature: 'send_group_cmd:dev-group' },
            plan_mode: streamPlanMode,
            planMode: streamPlanMode,
            confirmation_summary: {
              schema: 'ccm-global-main-agent-confirmation-summary-v1',
              title: '等待授权确认',
              headline: '全局主 Agent 已准备执行“发送群聊主 Agent 指令”，确认前不会执行这一步。',
              question: '是否允许全局主 Agent 继续执行这一步？',
              next_action: '使用卡片按钮确认或取消；确认后会继续执行并给出结果总结。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_todo: false },
            },
          },
        },
        {
          role: 'user',
          content: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '🧭 执行前计划已整理：继续执行计划，并在完成后给出总结。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '执行前计划已整理', text: '继续执行计划，并在完成后给出总结。' },
            { tone: 'running', icon: '🛠️', title: '执行工具', text: '正在发送群聊主 Agent 指令。' },
          ],
          agenticRun: {
            id: 'global-auto-plan-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
            original_user_message: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
            final_reply: '',
            pending_tool: null,
            plan_mode: autoStreamPlanMode,
            planMode: autoStreamPlanMode,
          },
        },
        {
          role: 'user',
          content: '确认，继续派发',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '📨 已派发的工作：dev-group 已进入任务链路。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已判断需要群聊主 Agent 接管并继续拆分执行。' },
            { tone: 'ok', icon: '📨', title: '已派发的工作', text: '全局主 Agent 已把这次需求交给 dev-group。下一步等待群聊任务卡更新。' },
          ],
          dispatch_launch_summary: streamDispatchSummary,
          dispatchLaunchSummary: streamDispatchSummary,
          progress_refresh_summary: {
            schema: 'ccm-global-main-agent-progress-refresh-v1',
            title: '进度刷新提醒',
            status: 'needs_refresh',
            status_label: '需要接续',
            headline: 'dev-group 的群聊任务卡已经一段时间没有新的可展示进展，全局主 Agent 会主动刷新状态。',
            current_state: 'dev-group 的群聊任务卡已经一段时间没有新的可展示进展，全局主 Agent 会主动刷新状态。',
            review_items: ['关注对象：dev-group', '接续要点：刷新群聊任务卡后继续验收', 'trace_id=hidden-global-refresh'],
            next_action: '先刷新群聊任务卡；如果仍没有新结果，就继续等待或定向补充。',
            display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_details_default_collapsed: true, hide_internal_protocols: true },
          },
        },
        {
          role: 'user',
          content: '继续让 TestAgent 独立复核这次交付',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '✅ TestAgent 复核计划：TestAgent 复核计划预检未通过，主 Agent 会先修复交接信息再执行。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已判断需要 TestAgent 做独立复核。' },
            { tone: 'waiting', icon: '✅', title: 'TestAgent 复核计划', text: 'TestAgent 复核计划预检未通过，主 Agent 会先修复交接信息再执行。' },
          ],
          agenticRun: {
            id: 'global-test-agent-plan-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: '继续让 TestAgent 独立复核这次交付',
            original_user_message: '继续让 TestAgent 独立复核这次交付',
            final_reply: '',
            tool_calls: 1,
            test_agent_execution_plan_summary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
            testAgentExecutionPlanSummary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
            test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
            testAgentExecutionPlan: testAgentBlockedExecutionPlanFixture,
          },
        },
        {
          role: 'user',
          content: 'TestAgent 复核完成后把结论同步给我',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '✅ 独立复核：TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '✅', title: 'TestAgent 复核计划', text: 'TestAgent 已生成复核计划，主 Agent 会按计划启动独立复核。' },
            { tone: 'ok', icon: '✅', title: '独立复核', text: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。' },
          ],
          agenticRun: {
            id: 'global-test-agent-review-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: 'TestAgent 复核完成后把结论同步给我',
            original_user_message: 'TestAgent 复核完成后把结论同步给我',
            final_reply: '',
            tool_calls: 1,
            test_agent_execution_plan_summary: testAgentExecutionPlanTextSummary,
            testAgentExecutionPlanSummary: testAgentExecutionPlanTextSummary,
            test_agent_execution_plan: testAgentExecutionPlanFixture,
            testAgentExecutionPlan: testAgentExecutionPlanFixture,
            independent_review_summary: {
              schema: 'ccm-main-agent-independent-review-summary-v1',
              title: '独立复核',
              status: 'passed',
              status_label: '已通过',
              headline: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
              rows: ['TestAgent：已通过', '验证证据：npm run test:login-state', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              next_action: '继续核对交付总结、改动和验证结果。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
            },
            independentReviewSummary: {
              schema: 'ccm-main-agent-independent-review-summary-v1',
              title: '独立复核',
              status: 'passed',
              status_label: '已通过',
              headline: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
              rows: ['TestAgent：已通过', '验证证据：npm run test:login-state', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              next_action: '继续核对交付总结、改动和验证结果。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
            },
            independent_review: ['TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
            independentReview: ['TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
          },
        },
        {
          role: 'user',
          content: '如果 TestAgent 发现没通过，要告诉我怎么返工',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '⚠️ 独立复核未通过：TestAgent 发现待处理缺口，我会先安排返工，再重新验收。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '✅', title: '读取独立复核', text: 'TestAgent 已返回复核结论。' },
            { tone: 'warning', icon: '⚠️', title: '需要返工', text: '独立复核发现待处理缺口，我会先安排返工，再重新验收。' },
          ],
          agenticRun: {
            id: 'global-test-agent-review-failed-run',
            status: 'failed',
            phase: 'failed',
            user_message: '如果 TestAgent 发现没通过，要告诉我怎么返工',
            original_user_message: '如果 TestAgent 发现没通过，要告诉我怎么返工',
            final_reply: 'TestAgent 独立复核未通过，我会先把失败检查项带回给原实现成员返工，返工后重新运行 TestAgent 复核。',
            tool_calls: 1,
            independent_review_summary: testAgentFailedReviewSummary,
            independentReviewSummary: testAgentFailedReviewSummary,
            test_agent_review_summary: testAgentFailedReviewSummary,
            testAgentReviewSummary: testAgentFailedReviewSummary,
            independent_review: testAgentFailedReviewSummary.rows,
            independentReview: testAgentFailedReviewSummary.rows,
            final_report: {
              summary: 'TestAgent 独立复核未通过，需要先返工。',
              risks: ['命令验证未通过', '登录恢复验收条件未通过'],
              independent_review_summary: testAgentFailedReviewSummary,
              independentReviewSummary: testAgentFailedReviewSummary,
              independent_review: testAgentFailedReviewSummary.rows,
              independentReview: testAgentFailedReviewSummary.rows,
              acceptance_gate_passed: false,
              technical: {
                verdict: 'failed',
                recommendation: 'rework',
                report_json: 'C:/tmp/test-agent-artifacts/failed/report.json',
                verdict_json: 'C:/tmp/test-agent-artifacts/failed/verdict.json',
                artifact_manifest: 'C:/tmp/test-agent-artifacts/failed/artifact-manifest.json',
              },
            },
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '📨 派发状态：web 正在处理现有工作，下一项会继续等待。',
          timestamp: now,
          streamEvents: [
            { tone: 'waiting', icon: '📨', title: '派发状态', text: 'web 正在处理现有工作，下一项会继续等待。' },
          ],
          agenticRun: {
            id: 'global-work-item-claim-waiting-run',
            status: 'running',
            phase: 'execute',
            user_message: '继续派发前端筛选工作项',
            original_user_message: '继续派发前端筛选工作项',
            final_reply: '',
            tool_calls: 1,
            work_items: [
              { id: 'global-wi-login', subject: '修复登录状态恢复', activeForm: '正在修复登录状态恢复', owner: 'web', target: 'web', status: 'in_progress', blockedBy: [], attempt: 1 },
              { id: 'global-wi-filter', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI', owner: 'web', target: 'web-filter', status: 'pending', blockedBy: [], attempt: 1 },
            ],
            work_item_summary: {
              total: 2,
              counts: { in_progress: 1, pending: 1 },
              next_claimable: [{ id: 'global-wi-filter', target: 'web-filter', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
              all_completed: false,
            },
            work_item_unlock_summary: {
              schema: 'ccm-main-agent-work-item-unlock-summary-v1',
              title: '前置完成，下一步已解锁',
              status: 'auto_dispatch_deferred',
              status_label: '已自动接上',
              headline: 'api 完成后，“接入 owner 筛选 UI”已经解锁，主 Agent 已自动接上派发。',
              rows: [{ id: 'global-wi-filter', target: 'web-filter', owner: 'web', subject: '接入 owner 筛选 UI', label: 'web-filter 的前置依赖已完成，可以进入下一步' }],
              next_claimable: [{ id: 'global-wi-filter', target: 'web-filter', owner: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
              next_action: '当前执行轮结束后，主 Agent 会继续派发这个已解锁工作项。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { completed_agent: 'api', unlocked_work_item_ids: ['global-wi-filter'], auto_dispatch: { deferred: true } },
            },
            work_item_claim_summary: {
              schema: 'ccm-main-agent-work-item-claim-summary-v1',
              title: '派发状态',
              status: 'agent_busy',
              status_label: '继续等待',
              headline: 'web 正在处理“修复登录状态恢复”，“接入 owner 筛选 UI”会继续等待。',
              next_action: '当前工作完成后，主 Agent 会重新检查并派发这个工作项。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { reason_code: 'agent_busy', work_item_id: 'global-wi-filter', busy_work_item_id: 'global-wi-login' },
            },
            completion_readiness_summary: {
              schema: 'ccm-main-agent-completion-readiness-v1',
              title: '完成前收尾',
              status: 'blocked',
              status_label: '尚未收尾',
              headline: '还有 1 个工作项未完成，1 个子 Agent 会话仍在处理，主 Agent 不会提前宣布完成。',
              rows: [{ target: 'web-filter', subject: '接入 owner 筛选 UI', status: 'pending', status_label: '等待开始' }],
              open_session_count: 1,
              unresolved_work_item_count: 1,
              next_action: '先完成或处理这些工作项；全部收敛后再做最终总结。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { unresolved_work_item_ids: ['global-wi-filter'], open_session_ids: ['global-session-hidden'] },
            },
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '✅ 全局 Todo 已归档：最终总结已整理。',
          timestamp: now,
          streamEvents: [
            { tone: 'ok', icon: '✅', title: '全局 Todo 已归档', text: '计划、执行、TestAgent 复核和总结都已完成。' },
          ],
          todo_plan: globalCompletedArchivedTodoPlan,
          todoPlan: globalCompletedArchivedTodoPlan,
          agenticRun: {
            id: 'global-completed-archived-todo-run',
            status: 'completed',
            phase: 'completed',
            user_message: '完成后把全局 Todo 收起，只保留总结',
            original_user_message: '完成后把全局 Todo 收起，只保留总结',
            final_reply: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
            todo_plan: globalCompletedArchivedTodoPlan,
            todoPlan: globalCompletedArchivedTodoPlan,
            final_report: {
              summary: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
              verification: ['TestAgent 独立复核已通过'],
              independent_review: ['TestAgent：已通过', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              acceptance_gate_passed: true,
            },
            final_delivery_report: {
              headline: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
              status: 'done',
              status_label: '已完成',
              verification: ['TestAgent 独立复核已通过'],
              acceptance: ['主 Agent 已纳入复核结论。'],
            },
          },
        },
      ],
    },
  ]
  localStorage.setItem(GLOBAL_AGENT_SESSIONS_KEY, JSON.stringify(globalAgentFixtureSessions))
  localStorage.setItem(GLOBAL_AGENT_CURRENT_ID_KEY, 'global-stream-fixture')
}

const globalDirectDispatchReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '全局直派群聊主 Agent',
  status: 'done',
  status_label: '已派发',
  headline: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
  sections: [
    { id: 'completed', title: '处理结果', items: ['需求已派发到 dev-group，当前不代表最终交付完成。'] },
    { id: 'next', title: '下一步', items: ['后续进度以群聊任务卡的计划、执行和最终总结为准。'] },
  ],
  files: [],
  verification: ['已创建群聊任务链路'],
  acceptance: ['主 Agent 验收：当前仅确认已派发，最终验收等待下游任务完成。'],
  risks: ['这只是已派发，不代表需求已经完成。'],
  next_action: '后续进度以群聊任务卡的计划、执行和最终总结为准。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalDirectDispatchMessage = {
  role: 'assistant',
  content: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-direct-dispatch',
    status: 'completed',
    user_message: '给开发群派发任务，修复登录状态恢复逻辑',
    tool_calls: 1,
    final_reply: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
    final_delivery_report: globalDirectDispatchReport,
    final_report: { delivery_report: globalDirectDispatchReport, summary: globalDirectDispatchReport.headline },
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: globalDirectDispatchReport.headline,
      delivery_report: globalDirectDispatchReport,
      dispatch_launch_summary: globalDirectDispatchSummary,
    },
  },
}
const globalDirectDispatchCard = globalAgentRunTaskCard(globalDirectDispatchMessage)

const globalFailedHistoryMessage = {
  role: 'assistant',
  content: '任务没有完成，原因已整理。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-failed',
    status: 'failed',
    goal: '修复登录状态刷新问题',
    user_message: '修复登录状态刷新问题',
    tool_calls: 1,
    error: '缺少测试环境变量',
    final_report: { risks: '需要补齐 .env.test 后再验收' },
  },
}
const globalFailedHistoryCard = globalAgentRunTaskCard(globalFailedHistoryMessage)

const globalCancelledHistoryMessage = {
  role: 'assistant',
  content: '用户取消了本轮任务。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-cancelled',
    status: 'cancelled',
    goal: '整理自动化任务列表',
    user_message: '整理自动化任务列表',
    tool_calls: 1,
    final_reply: '本轮任务已按要求停止。',
  },
}
const globalCancelledHistoryCard = globalAgentRunTaskCard(globalCancelledHistoryMessage)

const childEvents = [
  { kind: 'status', time: now, text: '准备读取相关文件' },
  { kind: 'tool', time: now, text: 'Read LoginStore.vue' },
  { kind: 'output', time: now, text: 'CCM_AGENT_RECEIPT raw payload should be hidden from normal users' },
  { kind: 'done', time: now, text: '完成登录状态恢复修改，等待主 Agent 验收' },
]

const FixtureApp = {
  components: { MainAgentDecisionCard, TaskExperienceCard, GroupMainAgentStatusCard, ProjectTaskIntakeMessage, TaskCollaborationCard, AgentCodeChangeDrawer, GlobalAgent },
  setup() {
    setupGlobalAgentFixtureState()
    window.__ccmLastTaskAction = null
    const childSummary = computed(() => summarizeWorkEvents(childEvents))
    const compactWorkText = (text) => sanitizeUserFacingAgentText(text, '执行成员正在执行。', 220)
    const codeDrawer = ref({
      visible: false,
      title: '',
      subtitle: '',
      project: '',
      fileChanges: null,
      files: [],
      selectedPath: '',
    })
    const handleTaskAction = (action) => {
      window.__ccmLastTaskAction = action
      if (action?.kind !== 'view_changes') return
      const files = Array.isArray(action.files) ? action.files : []
      codeDrawer.value = {
        visible: true,
        title: action.label || 'Agent 代码改动',
        subtitle: '真实点击任务卡改动明细打开',
        project: action.project || files.find(item => item?.project)?.project || '',
        fileChanges: { files, count: files.length },
        files,
        selectedPath: action.selectedPath || files[0]?.path || '',
      }
    }
    const closeCodeDrawer = () => {
      codeDrawer.value = { ...codeDrawer.value, visible: false }
    }
    return { conversationDecision, taskDecision, taskCompletedDecision, taskMissingVerificationDecision, taskCard, planGapDeliveryCard, groupIntakeMessage, workQueueCard, workchainTodoCard, workchainCompletedArchivedCard, workchainQualityFollowupCard, ordinaryWorkchainTodoCard, testAgentBlockedPlanCard, testAgentFailedReviewCard, workItemVerificationReminderCard, receiptResolvedCard, goalRevisionContinuationCard, planRevisionCard, confirmedPlanFollowupCard, mainAgentStatus, mainAgentActiveStatus, mainAgentArchivedTodoStatus, globalHistoryCard, globalDirectDispatchCard, globalFailedHistoryCard, globalCancelledHistoryCard, childEvents, childSummary, compactWorkText, codeDrawer, handleTaskAction, closeCodeDrawer }
  },
  template: `
    <main class="visual-fixture">
      <section id="case-simple-conversation" class="fixture-case">
        <h2>普通问话</h2>
        <MainAgentDecisionCard :decision="conversationDecision" />
      </section>

      <section id="case-task-plan" class="fixture-case">
        <h2>任务计划</h2>
        <MainAgentDecisionCard :decision="taskDecision" />
      </section>

      <section id="case-task-plan-missing-verification" class="fixture-case">
        <h2>任务计划缺验收提醒</h2>
        <MainAgentDecisionCard :decision="taskMissingVerificationDecision" />
      </section>

      <section id="case-task-card" class="fixture-case">
        <h2>任务卡</h2>
        <GroupMainAgentStatusCard :status="mainAgentStatus" :latestDecision="taskDecision" />
        <TaskExperienceCard :card="taskCard" @action="handleTaskAction" />
        <div id="case-delivery-plan-gap" style="margin-top:14px">
          <h2>交付总结计划缺口</h2>
          <TaskExperienceCard :card="planGapDeliveryCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-todo-card" style="margin-top:14px">
          <h2>Workchain Todo 桥接</h2>
          <TaskExperienceCard :card="workchainTodoCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-completed-archived" style="margin-top:14px">
          <h2>Workchain Todo 完成归档</h2>
          <TaskExperienceCard :card="workchainCompletedArchivedCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-quality-followup" style="margin-top:14px">
          <h2>Workchain 总结补齐</h2>
          <TaskExperienceCard :card="workchainQualityFollowupCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-ordinary-hidden" style="margin-top:14px">
          <h2>普通问话 Workchain Todo 隐藏</h2>
          <TaskExperienceCard :card="ordinaryWorkchainTodoCard" @action="handleTaskAction" />
        </div>
        <div id="case-test-agent-plan-blocked" style="margin-top:14px">
          <h2>TestAgent 计划预检受阻</h2>
          <TaskExperienceCard :card="testAgentBlockedPlanCard" @action="handleTaskAction" />
        </div>
        <div id="case-test-agent-review-failed" style="margin-top:14px">
          <h2>TestAgent 复核返工</h2>
          <TaskExperienceCard :card="testAgentFailedReviewCard" @action="handleTaskAction" />
        </div>
        <div id="case-work-item-next" style="margin-top:14px">
          <h2>执行队列后续派发</h2>
          <TaskExperienceCard :card="workQueueCard" @action="handleTaskAction" />
          <div id="case-work-item-verification-reminder" style="margin-top:14px">
            <h2>执行队列验收提醒</h2>
            <TaskExperienceCard :card="workItemVerificationReminderCard" @action="handleTaskAction" />
          </div>
          <div id="case-receipt-rework-resolved" style="margin-top:14px">
            <h2>结果补充已复检</h2>
            <TaskExperienceCard :card="receiptResolvedCard" @action="handleTaskAction" />
          </div>
          <div id="case-goal-revision-continuation" style="margin-top:14px">
            <h2>目标调整接续</h2>
            <TaskExperienceCard :card="goalRevisionContinuationCard" @action="handleTaskAction" />
          </div>
          <div id="case-plan-revision" style="margin-top:14px">
            <h2>计划退回调整</h2>
            <TaskExperienceCard :card="planRevisionCard" @action="handleTaskAction" />
          </div>
          <div id="case-plan-confirmed-followup" style="margin-top:14px">
            <h2>计划确认后执行跟进</h2>
            <TaskExperienceCard :card="confirmedPlanFollowupCard" @action="handleTaskAction" />
          </div>
        </div>
        <div id="case-global-history-completion" style="margin-top:14px">
          <h2>全局历史完成态</h2>
          <TaskExperienceCard :card="globalHistoryCard" context="global" @action="handleTaskAction" />
        </div>
        <div id="case-global-direct-dispatch" style="margin-top:14px">
          <h2>全局直派已接管</h2>
          <TaskExperienceCard :card="globalDirectDispatchCard" context="global" @action="handleTaskAction" />
        </div>
        <div id="case-global-history-terminal" style="margin-top:14px">
          <h2>全局历史失败/取消态</h2>
          <TaskExperienceCard :card="globalFailedHistoryCard" context="global" @action="handleTaskAction" />
          <TaskExperienceCard :card="globalCancelledHistoryCard" context="global" @action="handleTaskAction" />
        </div>
      </section>

      <section id="case-group-main-current-todo" class="fixture-case">
        <h2>协作群当前步骤</h2>
        <GroupMainAgentStatusCard :status="mainAgentActiveStatus" :latestDecision="taskDecision" />
        <div id="case-group-main-current-todo-archived" style="margin-top:14px">
          <h2>群聊当前 Todo 完成归档</h2>
          <GroupMainAgentStatusCard :status="mainAgentArchivedTodoStatus" :latestDecision="taskCompletedDecision" />
        </div>
      </section>

      <section id="case-group-task-intake-plan" class="fixture-case">
        <h2>群聊任务接管计划</h2>
        <ProjectTaskIntakeMessage :msg="groupIntakeMessage" :display-content="groupIntakeMessage.content" :accent-style="{ '--agent-accent': '#2563eb' }">
          <TaskCollaborationCard :card="groupIntakeMessage.taskCard" :runtime="groupIntakeMessage.taskRuntime" @action="handleTaskAction" />
        </ProjectTaskIntakeMessage>
      </section>

      <section id="case-child-agent" class="fixture-case">
        <h2>执行成员摘要</h2>
        <details class="agent-work-events running" style="--agent-accent:#2563eb">
          <summary class="work-events-head">
            <div class="work-head-main">
              <span class="work-agent-dot"></span>
              <span class="work-title">执行成员执行摘要</span>
              <span class="work-state-pill running">执行中</span>
            </div>
            <div class="work-head-meta">
              <span>{{ childSummary.summary }}</span>
              <small v-if="childSummary.hiddenCount">+{{ childSummary.hiddenCount }} 条详情</small>
            </div>
          </summary>
          <div class="work-events-preview">
            <span>10:00:00</span>
            <pre>{{ childSummary.latestText }}</pre>
          </div>
          <div class="work-events-list">
            <div v-for="event in childEvents" :key="event.kind + event.text" class="work-event">
              <div class="work-event-side">
                <span class="work-event-kind">{{ event.kind }}</span>
                <span class="work-event-time">10:00:00</span>
              </div>
              <pre>{{ compactWorkText(event.text) }}</pre>
            </div>
          </div>
        </details>
      </section>

      <section id="case-global-stream-live" class="fixture-case">
        <h2>全局流式派发进度</h2>
        <div class="global-agent-fixture-frame">
          <GlobalAgent />
        </div>
      </section>
      <AgentCodeChangeDrawer
        :visible="codeDrawer.visible"
        :title="codeDrawer.title"
        :subtitle="codeDrawer.subtitle"
        :project="codeDrawer.project"
        :fileChanges="codeDrawer.fileChanges"
        :files="codeDrawer.files"
        :selectedPath="codeDrawer.selectedPath"
        @close="closeCodeDrawer"
      />
    </main>
  `,
}

createApp(FixtureApp).mount('#app')
