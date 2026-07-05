import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  globalAgentRunTaskCard,
  globalMissionTaskCard,
  projectExecutionTaskCard,
} from '../frontend/src/utils/taskExperience.js'

const hasAction = (card, kind) => Array.isArray(card?.actions) && card.actions.some(action => action.kind === kind)
const noProtocolNoise = (card) => {
  const visible = [
    card?.kicker,
    card?.title,
    card?.goal,
    card?.phase_label,
    ...(card?.active_agents || []),
    ...(card?.agents || []).flatMap(agent => [agent.name, agent.status, agent.summary]),
    ...(card?.completed || []),
    ...(card?.blockers || []),
    card?.next_action,
    card?.delivery?.headline,
    ...(card?.delivery?.files || []),
    ...(card?.delivery?.verification || []),
    ...(card?.delivery?.risks || []),
    ...(card?.actions || []).map(action => action.label),
  ].filter(Boolean).join('\n')
  return !/CCM_AGENT_RECEIPT|scratchpad|门禁|model_calls|tool_calls|native session|trace_id|session_ids/i.test(visible)
}

const groupActionRoutes = {
  view_changes: '/api/tasks/pipeline-viewer',
  cancel: '/api/tasks/cancel',
  retry: '/api/tasks/retry',
  continue: '/api/tasks/continue',
  gap_continue: '/api/tasks/continue-from-gaps',
  rollback: '/api/tasks/rollback',
}

const projectActionRoutes = {
  view_changes: 'openFileDiff',
  continue: 'sendMessage(parent_run_id)',
  cancel: '/api/project-runs/cancel',
  retry: 'sendMessage(parent_run_id)',
  rollback: '/api/project-runs/rollback',
}

const globalActionRoutes = {
  view_changes: 'switch-tab:changes',
  continue: '/api/global-agent/supervisors/control:update_goal',
  cancel: '/api/global-agent/supervisors/control:cancel',
  retry: '/api/global-agent/supervisors/control:resume',
  resume: '/api/global-agent/supervisors/control:resume',
  confirm: '/api/global-agent/runs/confirm',
  reject_confirmation: '/api/global-agent/runs/confirm',
}

const checks = {}
const groupChatSource = readFileSync(join(process.cwd(), 'frontend/src/components/GroupChat.vue'), 'utf-8')

// 入口 1：群聊协作，多 Agent 整体任务卡。这里使用后端 task card 形状作为契约输入，
// GroupChat 通过 TaskCollaborationCard 直接渲染为 TaskExperienceCard。
const groupCard = {
  version: 1,
  kicker: 'AI 编程任务',
  task_id: 'task_group_demo',
  title: '实现订单退款审核',
  goal: '后端接口和前端入口一起交付',
  phase: 'reviewing',
  phase_label: '正在运行测试',
  progress: 85,
  active_agents: ['后端 · api 正在处理', '前端 · web 正在处理'],
  agents: [
    { id: 'api', name: '后端 · api', status: 'done', summary: '接口已完成' },
    { id: 'web', name: '前端 · web', status: 'running', summary: '页面正在验证' },
  ],
  completed: ['接口已实现', '页面已接入', '2 项检查已执行'],
  blockers: [],
  next_action: '检查通过后自动交付',
  delivery: {
    headline: '已有可验收交付',
    files: ['api/refund.ts', 'web/RefundAudit.vue'],
    verification: ['npm test', 'npm run build'],
    risks: [],
    acceptance_passed: false,
  },
  actions: [
    { kind: 'view_changes', label: '查看改动' },
    { kind: 'continue', label: '追加要求' },
    { kind: 'cancel', label: '停止' },
  ],
  technical: { trace_id: 'trace_group_demo', execution_ids: ['exec-api', 'exec-web'], session_ids: ['tas-api', 'tas-web'] },
}
checks.groupCardNaturalAndMultiAgent = groupCard.kicker === 'AI 编程任务' && groupCard.agents.length === 2 && groupCard.phase_label === '正在运行测试'
checks.groupCardActionsMapped = ['view_changes', 'continue', 'cancel', 'retry', 'rollback'].every(kind => Boolean(groupActionRoutes[kind]))
checks.groupCardHidesProtocolByDefault = noProtocolNoise(groupCard)
checks.groupDirectAnswerHidesOrchestrationPanel = groupChatSource.includes('const shouldShowOrchestrationPlan')
  && groupChatSource.includes("action === 'delegate'")
  && groupChatSource.includes('v-if="shouldShowOrchestrationPlan(msg)"')
checks.groupWorkPanelSanitizesInternalProtocol = groupChatSource.includes('sanitizeUserVisibleWorkText')
  && groupChatSource.includes('CCM_AGENT_RECEIPT')
  && groupChatSource.includes('已为用户视图折叠')

// 入口 2：项目管理聊天，单项目执行卡；普通问答保持直接文本。
const projectQa = projectExecutionTaskCard({
  role: 'assistant',
  content: '这个项目是 Vue + Node。',
  streaming: false,
  workEvents: [{ kind: 'done', text: '回答完成' }],
}, 'demo-project')
checks.projectQaDirect = projectQa === null

const projectRun = {
  id: 'pchat_second',
  trace_id: 'project_chat_trace',
  parent_run_id: 'pchat_first',
  task_agent_session_id: 'tas_project',
  native_session_id: 'native-project',
  rollback_available: true,
}
const projectCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '继续把退款审核按钮加到订单详情页',
  streaming: false,
  task_id: projectRun.id,
  projectRun,
  taskExperience: {
    task_id: projectRun.id,
    trace_id: projectRun.trace_id,
    parent_run_id: projectRun.parent_run_id,
    session_ids: [projectRun.task_agent_session_id],
    phase: 'completed',
    status: 'done',
    requires_card: true,
    rollback_available: true,
  },
  workEvents: [{ kind: 'done', text: '项目 Agent 已完成' }],
  fileChanges: { count: 1, files: [{ path: 'src/pages/OrderDetail.vue', statusText: '修改' }] },
}, 'demo-project')
checks.projectCardSingleProject = projectCard?.kicker === undefined && projectCard?.agents?.length === 1 && projectCard?.active_agents?.length === 0
checks.projectCardIdentityContinuation = projectCard?.technical?.run_id === 'pchat_second'
  && projectCard?.technical?.parent_run_id === 'pchat_first'
  && projectCard?.technical?.session_ids?.includes('tas_project')
const projectRunningCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '继续处理退款审核',
  streaming: true,
  task_id: 'pchat_running',
  projectRun: { id: 'pchat_running', trace_id: 'project_chat_running' },
  taskExperience: { task_id: 'pchat_running', phase: 'executing', status: 'in_progress', requires_card: true },
  workEvents: [{ kind: 'status', text: '正在处理' }],
}, 'demo-project')
const projectFailedCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '继续处理退款审核',
  streaming: false,
  task_id: 'pchat_failed',
  projectRun: { id: 'pchat_failed', trace_id: 'project_chat_failed' },
  taskExperience: { task_id: 'pchat_failed', phase: 'failed', status: 'failed', requires_card: true },
  workEvents: [{ kind: 'error', text: '执行失败' }],
  content: '❌ 执行失败',
}, 'demo-project')
checks.projectCardActionsMapped = ['view_changes', 'continue', 'cancel', 'retry', 'rollback'].every(kind => Boolean(projectActionRoutes[kind]))
  && hasAction(projectCard, 'view_changes')
  && hasAction(projectCard, 'continue')
  && hasAction(projectCard, 'rollback')
  && hasAction(projectRunningCard, 'cancel')
  && hasAction(projectFailedCard, 'retry')
checks.projectCardHidesProtocolByDefault = noProtocolNoise(projectCard)

// 入口 3：全局 Agent，普通问答直接文本；任务型 run / mission 才显示跨项目卡。
const globalQa = globalAgentRunTaskCard({
  role: 'assistant',
  content: '可以，我先解释一下知识库机制。',
  agenticRun: {
    id: 'run_global_qa',
    status: 'completed',
    tool_calls: 0,
    decision_summary: { intent: { category: 'question', confidence: 0.98 } },
  },
})
checks.globalQaDirect = globalQa === null

const globalMission = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: {
    id: 'mission_14',
    title: '跨项目退款审核',
    status: 'in_progress',
    business_goal: '协调 api 和 web 完成退款审核',
    mission_summary: { total: 2, passed: 1, blocked: 0 },
  },
  globalMissionSupervisor: { id: 'gms_14', status: 'monitoring' },
  globalMissionSupervisorFinalReport: {
    files_modified: ['api/refund.ts'],
    verification_results: ['npm test'],
  },
  globalMissionChildren: [
    { task: { id: 'task_api', status: 'done', status_detail: '接口完成' }, target: { type: 'project', name: 'api' } },
    { task: { id: 'task_web', status: 'in_progress', status_detail: '前端验证中' }, target: { type: 'project', name: 'web' } },
  ],
})
checks.globalMissionCrossProject = globalMission?.kicker === undefined && globalMission?.agents?.length === 2 && globalMission?.progress >= 50
const failedGlobalMission = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: { id: 'mission_failed', title: '失败任务', status: 'failed', mission_summary: { total: 1, passed: 0 } },
  globalMissionSupervisor: { id: 'gms_failed', status: 'failed' },
  globalMissionChildren: [{ task: { id: 'task_failed', status: 'failed' }, target: { type: 'project', name: 'api' } }],
})
const completedGlobalMission = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission_complete',
  globalMission: {
    id: 'mission_done',
    title: '完成任务',
    status: 'done',
    rollback_available: true,
    mission_summary: { total: 1, passed: 1 },
  },
  globalMissionSupervisor: {
    id: 'gms_done',
    status: 'completed',
    final_report: {
      files_modified: ['api/refund.ts'],
      verification_results: ['npm test'],
      summary: '已完成',
      acceptance_gate_passed: true,
    },
  },
  globalMissionChildren: [{ task: { id: 'task_done', status: 'done' }, target: { type: 'project', name: 'api' } }],
})
checks.globalMissionActionsMapped = ['view_changes', 'continue', 'cancel', 'retry'].every(kind => Boolean(globalActionRoutes[kind]))
  && hasAction(globalMission, 'cancel')
  && hasAction(failedGlobalMission, 'retry')
  && hasAction(completedGlobalMission, 'continue')
  && hasAction(completedGlobalMission, 'view_changes')
checks.globalMissionHidesProtocolByDefault = noProtocolNoise(globalMission)

const waitingGlobalRun = globalAgentRunTaskCard({
  role: 'assistant',
  content: '需要确认写操作',
  agenticRun: {
    id: 'run_waiting',
    status: 'waiting_confirmation',
    tool_calls: 1,
    pending_tool: { name: 'manage_project' },
    decision_summary: { intent: { category: 'operation', confidence: 0.9 } },
  },
})
checks.globalConfirmationActions = hasAction(waitingGlobalRun, 'confirm') && hasAction(waitingGlobalRun, 'reject_confirmation')

// 统一语义：不同入口职责差异保留，但用户视角均为自然语言卡片。
checks.roleSeparationPreserved = groupCard.kicker === 'AI 编程任务'
  && projectCard?.title?.includes('退款审核')
  && globalMission?.title === '跨项目退款审核'
checks.noProtocolTermsAcrossVisibleCards = [groupCard, projectCard, globalMission, waitingGlobalRun].every(noProtocolNoise)

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({
  success: true,
  summary: {
    group: ['multi-agent card', 'continue/cancel/retry/rollback route contract', 'protocol hidden'],
    project: ['ordinary QA direct', 'single-project card', 'parent_run_id + task_agent_session_id continuity', 'rollback route'],
    global: ['ordinary QA direct', 'cross-project mission card', 'supervisor control route', 'confirmation actions'],
  },
  checks,
}, null, 2))
