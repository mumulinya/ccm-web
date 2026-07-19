import {
  normalizeTestAgentExecutionPlanSummary,
  sanitizeUserFacingAgentText,
  sanitizeUserFacingPlanText,
  sanitizeUserFacingStructure,
} from "./agentDisplay.js";
import {
  classifyGlobalAgentRunPresentation,
  PRESENTATION_REPLY,
} from "./resultPresentation.js";

export const visibleGlobalText = (value, fallback = '信息已整理。', max = 420) => (
  sanitizeUserFacingAgentText(value, fallback, max)
)

export const visibleGlobalPlanText = (value, fallback = '计划信息已整理。', max = 420) => (
  sanitizeUserFacingPlanText(value, fallback, max)
)

export const GLOBAL_STREAM_COMPLETED_FALLBACK = '这轮处理结果已整理，最终是否交付以总结和验收结果为准。'

export const GLOBAL_STREAM_EVENT_LIMIT = 12

export const compactStreamText = (value, max = 220) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '...' : text
}

export const compactVisibleStreamText = (value, fallback = '状态已更新。', max = 220) => visibleGlobalText(value, fallback, max)

export const visibleGlobalStreamEventTitle = (value, fallback = '状态更新') => {
  const title = visibleGlobalPlanText(value, fallback, 120)
    .replace(/执行\s*工具/g, '执行动作')
    .replace(/工具\s*完成/g, '动作已返回')
    .replace(/完成\s*工具/g, '动作已返回')
    .replace(/工具\s*执行\s*完成/g, '动作已返回')
    .replace(/工具\s*失败/g, '执行遇到问题')
    .trim()
  return title || fallback
}

export const visibleGlobalStreamEventText = (value, fallback = '状态已更新。', max = 220) => {
  const text = compactVisibleStreamText(value, fallback, max + 80)
    .replace(/执行\s*工具/g, '执行动作')
    .replace(/工具\s*执行\s*完成/g, '动作已返回')
    .replace(/工具\s*完成/g, '动作已返回')
    .replace(/完成\s*工具/g, '动作已返回')
    .replace(/已完成[，,]\s*正在检查结果/g, '已返回结果，我正在检查')
    .replace(/执行完成[，,]\s*正在检查结果/g, '已返回结果，我正在检查')
    .trim()
  return text.length > max ? `${text.slice(0, max)}...` : (text || fallback)
}

export const globalDispatchLaunchSummary = (msg = {}) => {
  const displayStream = msg.display_stream
    || msg.displayStream
    || msg.agenticRun?.display_stream
    || msg.agenticRun?.displayStream
    || msg.agenticRun?.final_report?.display_stream
    || msg.agenticRun?.finalReport?.displayStream
    || null
  const summary = msg.dispatch_launch_summary
    || msg.dispatchLaunchSummary
    || displayStream?.dispatch_launch_summary
    || displayStream?.dispatchLaunchSummary
    || null
  const visible = sanitizeUserFacingStructure(summary, {
    fallback: '派发进度已整理，技术细节已放入技术详情。',
    max: 260,
  })
  if (!visible) return visible
  return {
    ...visible,
    title: visible.title ? visibleGlobalPlanText(visible.title, '已安排的工作', 120) : visible.title,
    headline: visible.headline ? visibleGlobalPlanText(visible.headline, '安排进度已整理。', 260) : visible.headline,
    next_action: visible.next_action ? visibleGlobalPlanText(visible.next_action, '等待执行结果。', 220) : visible.next_action,
    nextAction: visible.nextAction ? visibleGlobalPlanText(visible.nextAction, '等待执行结果。', 220) : visible.nextAction,
  }
}

export const globalDispatchLaunchRows = (msg = {}) => {
  const rows = globalDispatchLaunchSummary(msg)?.rows
  return Array.isArray(rows) ? rows
    .filter(row => row && typeof row === 'object')
    .map(row => ({
      ...row,
      role: visibleGlobalPlanText(row.role || '执行成员', '执行成员', 80),
      task: row.task ? visibleGlobalPlanText(row.task, '执行任务已整理。', 220) : row.task,
      reason: row.reason ? visibleGlobalPlanText(row.reason, '安排原因已整理。', 180) : row.reason,
    })) : []
}

export const globalDispatchRowClass = (row = {}) => {
  const status = String(row.status || row.state || row.status_label || '').toLowerCase()
  if (/fail|error|blocked|失败|阻塞|异常/.test(status)) return 'error'
  if (/done|complete|completed|ok|success|通过|完成/.test(status)) return 'ok'
  if (/wait|pending|queue|等待|排队/.test(status)) return 'waiting'
  return 'running'
}

export const GLOBAL_TODO_DONE_STATUSES = new Set(['done', 'completed', 'complete', 'success', 'succeeded', 'ok', 'passed'])

export const GLOBAL_TODO_ACTIVE_STATUSES = new Set([
  'in_progress',
  'active',
  'running',
  'reviewing',
  'reworking',
  'needs_confirmation',
  'waiting_confirmation',
  'needs_user',
  'waiting_clarification',
  'blocked',
  'failed',
  'error',
])

export const globalTodoStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['failed', 'error'].includes(normalized)) return '失败'
  if (normalized === 'blocked') return '待补齐'
  if (['needs_user', 'waiting_user', 'waiting_clarification'].includes(normalized)) return '等待补充'
  if (['needs_confirmation', 'waiting_confirmation'].includes(normalized)) return '等待确认'
  if (normalized === 'reviewing') return '验收中'
  if (normalized === 'reworking') return '返工中'
  if (GLOBAL_TODO_DONE_STATUSES.has(normalized)) return '完成'
  if (['pending', 'queued', 'waiting'].includes(normalized)) return '等待'
  return '进行中'
}

export const globalStreamTodoTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['failed', 'error'].includes(normalized)) return 'failed'
  if (['blocked', 'needs_confirmation', 'waiting_confirmation', 'needs_user', 'waiting_clarification'].includes(normalized)) return 'waiting'
  if (GLOBAL_TODO_DONE_STATUSES.has(normalized)) return 'done'
  return 'active'
}

export const globalStreamCurrentTodoTone = (summary = {}) => globalStreamTodoTone(summary.status)

export const isGlobalStreamSupervising = (msg = {}) => String(msg.agenticRun?.status || '').toLowerCase() === 'supervising'

export const GLOBAL_EXECUTION_STREAM_EVENTS = new Set([
  'tool_started',
  'tool_completed',
  'tool_failed',
  'tool_validation_failed',
  'clarification_required',
  'confirmation_required',
  'dispatch_launch_summary',
  'plan_mode_ready',
  'supervising',
  'test_agent_execution_plan_ready',
  'test_agent_review_ready',
  'post_review_spot_check_ready',
])

export const globalEventConfirmsExecution = (event = {}) => {
  const intent = event.step?.decision?.intent
    || event.decision?.intent
    || event.run?.decision_summary?.intent
    || event.run?.decisionSummary?.intent
    || null
  const state = String(event.step?.state || event.state || '').toLowerCase()
  return intent?.action_required === true
    || ['execute', 'needs_confirmation'].includes(state)
    || !!(event.tool?.name || event.pending_tool?.name || event.step?.tool?.name)
    || !!(event.mission_id || event.missionId || event.run?.mission_id || event.run?.missionId)
    || GLOBAL_EXECUTION_STREAM_EVENTS.has(String(event.type || ''))
}

export const globalExecutionIntentConfirmed = (msg = {}) => {
  if (msg.executionIntentConfirmed === true) return true
  const run = msg.agenticRun || msg.agentic_run || {}
  // 轻量 reply（点歌/问答/只读）：不进重型 stream / 技术详情
  if (classifyGlobalAgentRunPresentation(run, msg) === PRESENTATION_REPLY) {
    return false
  }
  const intent = run.decision_summary?.intent || run.decisionSummary?.intent || null
  if (intent?.action_required === true || Number(run.tool_calls || run.toolCalls || 0) > 0) return true
  if (run.mission_id || run.missionId || run.supervisor_id || run.supervisorId || run.pending_tool || run.pendingTool) return true
  if (getGlobalPlanMode(msg) || getGlobalTodoPlan(msg) || globalDispatchLaunchRows(msg).length || globalStreamToolUseSummary(msg)) return true
  return (msg.streamEvents || []).some(event => GLOBAL_EXECUTION_STREAM_EVENTS.has(String(event.eventType || '')))
}

export const globalStreamHeaderTitle = (msg = {}) => isGlobalStreamSupervising(msg)
  ? '持续跟进中'
  : msg.streaming
    ? '我正在处理'
    : '处理过程'

export const globalStreamHeaderSubtitle = (msg = {}) => isGlobalStreamSupervising(msg)
  ? '正在持续跟踪执行、验收和最终总结'
  : msg.streaming
    ? '正在实时更新理解、规划和工具执行状态'
    : '本轮过程已结束'

export const getGlobalDisplayStream = (msg = {}) => msg.display_stream
  || msg.displayStream
  || msg.agenticRun?.display_stream
  || msg.agenticRun?.displayStream
  || msg.agenticRun?.final_report?.display_stream
  || msg.agenticRun?.finalReport?.displayStream
  || null

export const getGlobalPlanMode = (msg = {}) => msg.plan_mode
  || msg.planMode
  || msg.agenticRun?.plan_mode
  || msg.agenticRun?.planMode
  || getGlobalDisplayStream(msg)?.plan_mode
  || getGlobalDisplayStream(msg)?.planMode
  || null

export const getGlobalTodoPlan = (msg = {}) => {
  const displayStream = getGlobalDisplayStream(msg)
  const mainDecision = msg.main_agent_decision
    || msg.mainAgentDecision
    || msg.agenticRun?.main_agent_decision
    || msg.agenticRun?.mainAgentDecision
    || displayStream?.main_agent_decision
    || displayStream?.mainAgentDecision
    || displayStream?.workchain?.main_agent_decision
    || displayStream?.workchain?.mainAgentDecision
    || msg.agenticRun?.workchain?.main_agent_decision
    || msg.agenticRun?.workchain?.mainAgentDecision
    || null
  return mainDecision?.todo_plan
    || mainDecision?.todoPlan
    || msg.todo_plan
    || msg.todoPlan
    || msg.agenticRun?.todo_plan
    || msg.agenticRun?.todoPlan
    || displayStream?.todo_plan
    || displayStream?.todoPlan
    || displayStream?.workchain?.todo_plan
    || displayStream?.workchain?.todoPlan
    || null
}

export const normalizeGlobalTodoStep = (step = {}, index = 0) => {
  if (!step || typeof step !== 'object') return null
  const fallbackLabel = `步骤 ${index + 1}`
  const label = visibleGlobalPlanText(
    step.label || step.title || step.text || step.content || step.name || fallbackLabel,
    fallbackLabel,
    140
  )
  const activeForm = visibleGlobalPlanText(step.active_form || step.activeForm || label, label, 140)
  const detailSource = step.detail || step.description || step.summary || step.reason || ''
  return {
    id: step.id || step.key || `global-todo-step-${index}`,
    label,
    active_form: activeForm,
    detail: detailSource ? visibleGlobalPlanText(detailSource, '当前步骤详情已整理。', 260) : '',
    needs_action: step.needs_action || step.needsAction ? visibleGlobalPlanText(step.needs_action || step.needsAction, '', 220) : '',
    needsAction: step.needs_action || step.needsAction ? visibleGlobalPlanText(step.needs_action || step.needsAction, '', 220) : '',
    status: String(step.status || step.state || (index === 0 ? 'in_progress' : 'pending')).toLowerCase(),
  }
}

export const globalTodoTextNeedsUserAction = (value = '', status = '') => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return false
  const normalizedStatus = String(status || '').toLowerCase()
  if (/需要你|等你|等待你|请你|请确认|确认(?:是否|计划|范围|授权|影响|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|选择|授权|回复|上传|输入|填写|处理\s*\d+\s*个待确认问答|人工确认|待确认问答|用户确认|是否允许|是否继续|允许继续|确认并继续/i.test(text)) return true
  if (['needs_user', 'waiting_user', 'needs_confirmation', 'waiting_confirmation'].includes(normalizedStatus) && /确认(?:计划|范围|授权|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|回复|授权|选择|上传|输入|填写|处理\s*\d+\s*个待确认问答/.test(text)) return true
  return false
}

export const buildGlobalDispatchTodoSteps = (msg = {}) => {
  const summary = globalDispatchLaunchSummary(msg)
  const rows = globalDispatchLaunchRows(msg)
  if (!rows.length) return null
  const targets = rows
    .map(row => [row.role || '执行成员', row.agent].filter(Boolean).join(' · '))
    .filter(Boolean)
    .slice(0, 4)
    .join('、')
  const terminalStatus = String(summary?.status || summary?.phase || '').toLowerCase()
  const trackStatus = ['failed', 'error', 'cancelled', 'canceled'].includes(terminalStatus)
    ? 'failed'
    : GLOBAL_TODO_DONE_STATUSES.has(terminalStatus)
      ? 'completed'
      : 'in_progress'
  return {
    title: summary?.title || '全局派发进度',
    next_action: summary?.next_action || '等待执行目标更新结果，我会继续验收并总结。',
    steps: [
      {
        id: 'global-dispatch-understand',
        label: '理解并整理需求',
        detail: summary?.headline || '已明确这次需求需要交给执行目标处理。',
        status: 'completed',
      },
      {
        id: 'global-dispatch-launch',
        label: '派发执行目标',
        detail: targets ? `已派发给：${targets}。` : '已把任务交给执行目标。',
        status: 'completed',
      },
      {
        id: 'global-dispatch-track',
        label: '跟踪执行、验收和最终总结',
        active_form: '正在跟踪执行和验收结果',
        detail: summary?.next_action || '等待执行目标更新任务卡，我会汇总最终结果。',
        status: trackStatus,
      },
    ],
  }
}

export const GLOBAL_TODO_VERIFICATION_PATTERN = /验证|测试|验收|复核|运行检查|执行检查|检查(?:命令|结果|通过|失败)|verify|verification|test|qa|typecheck|lint|build|check/i

export const globalTodoHasVerificationStep = (step = {}) => GLOBAL_TODO_VERIFICATION_PATTERN.test([
  step.label,
  step.title,
  step.detail,
  step.active_form,
  step.activeForm,
  step.content,
].filter(Boolean).join(' '))

export const globalTodoDisplayPolicy = (source = {}) => ({
  ...(source?.display || {}),
  ...(source?.display_policy || source?.displayPolicy || {}),
})

export const globalTodoHasVerificationEvidence = (source = {}, msg = {}) => {
  const run = msg.agenticRun || {}
  const finalReport = run.final_report || run.finalReport || {}
  const deliveryReport = run.final_delivery_report || run.finalDeliveryReport || finalReport.delivery_report || finalReport.deliveryReport || {}
  const values = [
    source.verification,
    source.verification_executed,
    source.verificationExecuted,
    source.acceptance,
    source.independent_review,
    source.independentReview,
    run.verification,
    finalReport.verification,
    finalReport.verification_executed,
    finalReport.verificationExecuted,
    deliveryReport.verification,
    deliveryReport.acceptance,
    run.independent_review,
    run.independentReview,
    run.independent_review_summary,
    run.independentReviewSummary,
  ]
  return values.some(value => Array.isArray(value) ? value.filter(Boolean).length > 0 : Boolean(value))
    || run.acceptance_gate_passed === true
    || finalReport.acceptance_gate_passed === true
    || finalReport.acceptanceGatePassed === true
    || deliveryReport.acceptance_gate_passed === true
    || deliveryReport.acceptanceGatePassed === true
}

export const buildGlobalTodoVerificationReminder = (source = {}, steps = [], msg = {}) => {
  const raw = source.verification_reminder
    || source.verificationReminder
    || msg.verification_reminder
    || msg.verificationReminder
    || msg.agenticRun?.verification_reminder
    || msg.agenticRun?.verificationReminder
    || null
  const legacyNudge = source.verification_nudge === true || source.verificationNudge === true
  const terminalStatus = String(msg.agenticRun?.status || msg.status || '').toLowerCase()
  const allDone = steps.length > 0 && steps.every(step => GLOBAL_TODO_DONE_STATUSES.has(String(step?.status || '').toLowerCase()))
  const hasVerificationEvidence = steps.some(globalTodoHasVerificationStep) || globalTodoHasVerificationEvidence(source, msg)
  const fallback = steps.length >= 3
    && !hasVerificationEvidence
    && (!GLOBAL_TODO_DONE_STATUSES.has(terminalStatus) || allDone)
    ? {
        schema: 'ccm-main-agent-plan-verification-reminder-v1',
        status: 'needs_verification_step',
        title: '还缺验收步骤',
        headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
        next_action: '我会把验收补进计划，再继续跟踪和总结。',
      }
    : null
  const reminder = raw || (legacyNudge ? fallback || {
    schema: 'ccm-main-agent-plan-verification-reminder-v1',
    status: 'needs_verification_step',
    title: '还缺验收步骤',
    headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
    next_action: '我会把验收补进计划，再继续跟踪和总结。',
  } : fallback)
  const policy = reminder?.display_policy || reminder?.displayPolicy || {}
  if (!reminder || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(reminder, {
    fallback: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
    max: 260,
  })
}

export const shouldArchiveGlobalCompletedTodo = (source = {}, steps = [], msg = {}, verificationReminder = null) => {
  if (verificationReminder) return false
  const allDone = steps.length > 0 && steps.every(step => GLOBAL_TODO_DONE_STATUSES.has(String(step?.status || '').toLowerCase()))
  if (!allDone) return false
  const policy = globalTodoDisplayPolicy(source)
  const archiveByPolicy = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false
  const terminalStatus = String(msg.agenticRun?.status || msg.status || '').toLowerCase()
  const terminal = msg.streaming === false || GLOBAL_TODO_DONE_STATUSES.has(terminalStatus)
  const hasVerificationEvidence = steps.some(globalTodoHasVerificationStep) || globalTodoHasVerificationEvidence(source, msg)
  return archiveByPolicy || (terminal && hasVerificationEvidence)
}

export const buildGlobalStreamCurrentTodoSummary = (msg = {}) => {
  if (!msg || msg.role !== 'assistant' || msg.type !== 'global_stream') return null
  const todoPlan = getGlobalTodoPlan(msg)
  const planMode = getGlobalPlanMode(msg)
  const dispatchTodo = buildGlobalDispatchTodoSteps(msg)
  const planModeWaitingConfirmation = planMode
    && planMode.requires_confirmation !== false
    && /await|waiting|pending|confirm|确认|授权/i.test(String(planMode.confirmation_status || planMode.confirmationStatus || ''))
  const planModeSteps = Array.isArray(planMode?.steps)
    ? planMode.steps.map(step => {
        const stepStatus = String(step?.status || step?.state || '').toLowerCase()
        if (GLOBAL_TODO_DONE_STATUSES.has(stepStatus)) return step
        const stepText = `${step?.label || ''} ${step?.title || ''} ${step?.detail || ''}`
        if (planModeWaitingConfirmation && /等待|确认|授权/.test(stepText)) return { ...step, status: 'needs_confirmation' }
        return step
      })
    : []
  const source = Array.isArray(todoPlan?.steps) && todoPlan.steps.length
    ? todoPlan
    : planModeSteps.length
      ? {
          title: planMode.title || '执行前计划',
          next_action: planMode.next_step || planMode.nextAction || planMode.next_action || '',
          steps: planModeSteps,
        }
      : dispatchTodo
  if (!source?.steps?.length) return null
  const steps = source.steps.map(normalizeGlobalTodoStep).filter(Boolean)
  if (!steps.length) return null
  const verificationReminder = buildGlobalTodoVerificationReminder(source, steps, msg)
  if (shouldArchiveGlobalCompletedTodo(source, steps, msg, verificationReminder)) return null
  const activeStep = steps.find(step => GLOBAL_TODO_ACTIVE_STATUSES.has(step.status))
    || steps.find(step => !GLOBAL_TODO_DONE_STATUSES.has(step.status))
    || steps[steps.length - 1]
  const completedCount = steps.filter(step => GLOBAL_TODO_DONE_STATUSES.has(step.status)).length
  const nextAction = source.next_action || source.nextAction || source.next_step || source.nextStep || ''
  const recentStep = [...steps].reverse().find(step => GLOBAL_TODO_DONE_STATUSES.has(step.status) && step !== activeStep)
  const recentAction = visibleGlobalPlanText(
    recentStep?.active_form || recentStep?.activeForm || recentStep?.label || recentStep?.content || '',
    '',
    180,
  )
  const rawNeedsAction = activeStep.needs_action || activeStep.needsAction || source.needs_action || source.needsAction || ''
  const needsActionCandidate = globalTodoTextNeedsUserAction(rawNeedsAction, activeStep.status)
    ? rawNeedsAction
    : globalTodoTextNeedsUserAction(nextAction, activeStep.status)
      ? nextAction
      : ''
  const needsAction = visibleGlobalPlanText(needsActionCandidate, '', 220)
  return {
    schema: 'ccm-global-main-agent-current-todo-v1',
    title: visibleGlobalPlanText(source.title || '当前步骤', '当前步骤', 120),
    task_id: msg.agenticRun?.id || msg.agenticRun?.mission_id || '',
    step_id: activeStep.id,
    label: activeStep.label,
    active_form: activeStep.active_form || activeStep.label,
    detail: activeStep.detail,
    recent_action: recentAction,
    recentAction,
    needs_action: needsAction,
    needsAction,
    status: activeStep.status,
    status_label: globalTodoStatusLabel(activeStep.status),
    progress_label: `${completedCount}/${steps.length}`,
    completed_count: completedCount,
    total_count: steps.length,
    next_action: nextAction ? visibleGlobalPlanText(nextAction, '我会继续执行并在完成后总结。', 260) : '',
    verification_reminder: verificationReminder,
    verificationReminder,
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
}

export const globalStreamProgressRefreshSummary = (msg = {}) => {
  const displayStream = getGlobalDisplayStream(msg)
  const summary = msg.progress_refresh_summary
    || msg.progressRefreshSummary
    || displayStream?.progress_refresh_summary
    || displayStream?.progressRefreshSummary
    || msg.agenticRun?.progress_refresh_summary
    || msg.agenticRun?.progressRefreshSummary
    || msg.agenticRun?.final_report?.progress_refresh_summary
    || msg.agenticRun?.finalReport?.progressRefreshSummary
    || null
  const policy = summary?.display_policy || summary?.displayPolicy || {}
  if (!summary || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(summary, {
    fallback: '进度刷新提醒已整理，技术细节已放入技术详情。',
    max: 260,
  })
}

export const globalStreamProgressRefreshTone = (summary = {}) => {
  const status = String(summary.status || '').toLowerCase()
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['needs_refresh', 'stalled', 'blocked', 'waiting'].includes(status)) return 'waiting'
  return 'active'
}

export const globalStreamProgressRefreshItems = (summary = {}) => {
  const items = summary.review_items || summary.reviewItems || []
  return Array.isArray(items)
    ? items.map(item => visibleGlobalText(item, '接续要点已整理。', 180)).filter(Boolean).slice(0, 5)
    : []
}

export const globalToolLabels = {
  inspect_system: '读取系统状态',
  list_projects: '读取项目列表',
  inspect_project: '读取项目上下文',
  list_groups: '读取群聊列表',
  list_tasks: '读取任务列表',
  list_cron: '读取定时任务',
  query_knowledge: '查询知识库',
  query_global_memory: '查询全局记忆',
  manage_global_memory: '管理全局记忆',
  inspect_mission: '查询全局任务',
  inspect_supervision: '查询持续跟进状态',
  orchestrate_development: '创建跨项目开发任务',
  manage_supervision: '管理持续跟进',
  create_task: '创建开发任务',
  send_project_cmd: '发送项目执行指令',
  send_group_cmd: '发送协作群指令',
  manage_cron: '管理定时任务',
  manage_group: '管理群聊',
  manage_project: '管理项目',
  manage_task: '管理任务',
  manage_tool: '管理工具',
  git_review: '审查代码变更',
  git_commit: '提交代码',
  create_template: '创建模板',
  play_music: '播放音乐',
  stop_music: '停止音乐',
  toggle_pet: '控制桌面宠物',
  navigate: '切换页面'
}

export const getGlobalToolLabel = (name) => globalToolLabels[String(name || '').trim()] || String(name || '工具操作')

export const globalToolStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['done', 'completed', 'ok', 'success'].includes(normalized)) return '已返回'
  if (['failed', 'error', 'blocked'].includes(normalized)) return '待排查'
  return '进行中'
}

export const compactGlobalToolLabel = (value, fallback = '执行动作') => {
  const text = visibleGlobalPlanText(value, fallback, 120)
    .replace(/^正在/, '')
    .replace(/已完成.*$/, '')
    .replace(/已返回.*$/, '')
    .replace(/执行遇到问题.*$/, '')
    .replace(/[。.]$/, '')
    .trim()
  return text || fallback
}

export const buildGlobalStreamToolUseSummary = (rows = []) => {
  const normalizedRows = rows
    .filter(row => row && typeof row === 'object')
    .map((row, index) => ({
      id: row.id || `global-tool-row-${index}`,
      label: compactGlobalToolLabel(row.label || row.text || row.detail || '', '执行动作'),
      status: String(row.status || 'running').toLowerCase(),
      detail: row.detail ? visibleGlobalPlanText(row.detail, '执行动作已更新。', 180) : '',
    }))
    .filter(row => row.label)
  const visibleRows = [...normalizedRows.reduce((map, row) => map.set(row.label, row), new Map()).values()]
  if (!visibleRows.length) return null
  const runningCount = visibleRows.filter(row => ['running', 'in_progress', 'active'].includes(row.status)).length
  const completedCount = visibleRows.filter(row => ['done', 'completed', 'ok', 'success'].includes(row.status)).length
  const failedCount = visibleRows.filter(row => ['failed', 'error', 'blocked'].includes(row.status)).length
  const latest = visibleRows[visibleRows.length - 1]
  const headline = failedCount
    ? `${failedCount} 项动作待排查`
    : runningCount
      ? `正在执行 ${runningCount} 项动作`
      : `已返回 ${completedCount || visibleRows.length} 项动作，正在检查结果`
  const latestLabel = latest.status === 'done' || latest.status === 'completed'
    ? `${latest.label}已返回，等待检查`
    : ['failed', 'error', 'blocked'].includes(latest.status)
      ? `${latest.label}待排查`
      : `正在${latest.label}`
  return {
    schema: 'ccm-global-main-agent-tool-summary-v1',
    title: '动作摘要',
    headline,
    latest_label: latestLabel,
    running_count: runningCount,
    completed_count: completedCount,
    failed_count: failedCount,
    total_count: visibleRows.length,
    rows: visibleRows.slice(-4).map(row => ({
      ...row,
      status_label: globalToolStatusLabel(row.status),
    })),
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
}

export const globalToolSummaryRowsFromEvents = (streamEvents = []) => {
  const rows = []
  const legacyToolStartedTitle = `执行${'工具'}`
  const legacyToolCompletedTitle = `${'工具'}完成`
  for (const event of Array.isArray(streamEvents) ? streamEvents : []) {
    const title = visibleGlobalStreamEventTitle(event?.title || '', '')
    if (!title.includes('执行动作') && !title.includes('动作已返回') && title !== legacyToolStartedTitle && title !== legacyToolCompletedTitle && !title.includes('执行遇到问题')) continue
    const text = visibleGlobalStreamEventText(event.text || '', '执行动作已更新。', 180)
    const status = title.includes('返回')
      ? 'done'
      : title.includes('问题')
        ? 'failed'
        : 'running'
    rows.push({
      id: `${title}:${text}`,
      label: compactGlobalToolLabel(text, title.includes('返回') ? '已返回动作' : '执行动作'),
      status,
      detail: text,
    })
  }
  return rows
}

export const globalStreamToolUseSummary = (msg = {}) => {
  const existing = msg.global_tool_use_summary
    || msg.globalToolUseSummary
    || msg.tool_use_summary
    || msg.toolUseSummary
    || null
  const normalizedExisting = existing?.tool_summary && !existing?.headline
    ? {
        schema: 'ccm-global-main-agent-tool-summary-v1',
        title: '动作摘要',
        headline: existing.tool_summary,
        latest_label: existing.tool_summary,
        running_count: 0,
        completed_count: 0,
        failed_count: 0,
        total_count: 0,
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
      }
    : existing
  const summary = normalizedExisting || buildGlobalStreamToolUseSummary(globalToolSummaryRowsFromEvents(msg.streamEvents))
  return sanitizeUserFacingStructure(summary, {
    fallback: '动作摘要已整理，技术细节已放入技术详情。',
    max: 260,
  })
}

export const updateGlobalStreamToolUseSummary = (agentMsg, event = {}) => {
  const type = String(event.type || '')
  if (!['tool_started', 'tool_completed', 'tool_failed', 'tool_validation_failed'].includes(type)) return
  const tool = event.tool || event.pending_tool || event.step?.tool || {}
  const toolName = tool.name || event.toolName || event.step?.toolName || ''
  const label = getGlobalToolLabel(toolName)
  const status = type === 'tool_completed'
    ? 'done'
    : (type === 'tool_failed' || type === 'tool_validation_failed')
      ? 'failed'
      : 'running'
  const key = tool.signature || tool.id || event.tool_call_id || event.toolUseId || toolName || label
  const previous = agentMsg.global_tool_use_summary || agentMsg.globalToolUseSummary || {}
  const rows = Array.isArray(previous.rows) ? previous.rows : []
  const nextRows = [
    ...rows.filter(row => (row.id || row.label) !== key),
    {
      id: key,
      label,
      status,
      detail: type === 'tool_completed'
        ? `${label}已返回结果，我正在检查。`
        : status === 'failed'
          ? `${label}执行遇到问题，我正在重新判断下一步。`
          : `正在${label}。`,
    },
  ].slice(-8)
  const summary = buildGlobalStreamToolUseSummary(nextRows)
  if (!summary) return
  agentMsg.global_tool_use_summary = summary
  agentMsg.globalToolUseSummary = summary
}

export const getGlobalTestAgentExecutionPlanPayload = (source = {}) => {
  const plan = source.test_agent_execution_plan
    || source.testAgentExecutionPlan
    || source.technical?.test_agent_execution_plan
    || source.technical?.testAgentExecutionPlan
    || null
  const detail = source.detail || source.message || source.text || ''
  const summary = normalizeTestAgentExecutionPlanSummary(
    plan,
    source.test_agent_execution_plan_summary || source.testAgentExecutionPlanSummary || detail || null,
    detail
  )
  if (!plan && !summary) return null
  return { plan, summary, detail }
}

export const getGlobalTestAgentReviewPayload = (source = {}) => {
  const summary = source.test_agent_review_summary
    || source.testAgentReviewSummary
    || source.independent_review_summary
    || source.independentReviewSummary
    || null
  const rows = Array.isArray(source.independent_review)
    ? source.independent_review
    : Array.isArray(source.independentReview)
      ? source.independentReview
      : []
  const postReviewSpotCheckSummary = source.post_review_spot_check_summary
    || source.postReviewSpotCheckSummary
    || source.technical?.post_review_spot_check_summary
    || source.technical?.postReviewSpotCheckSummary
    || null
  const postReviewSpotCheck = source.post_review_spot_check
    || source.postReviewSpotCheck
    || source.technical?.post_review_spot_check
    || source.technical?.postReviewSpotCheck
    || null
  if (!summary && !rows.length && !postReviewSpotCheckSummary && !postReviewSpotCheck) return null
  return {
    summary: summary ? sanitizeUserFacingStructure(summary, { fallback: 'TestAgent 独立复核结论已整理。', max: 420 }) : null,
    rows: sanitizeUserFacingStructure(rows, { fallback: 'TestAgent 独立复核证据已整理。', max: 240 }),
    report: source.test_agent_report || source.testAgentReport || source.technical?.test_agent_report || source.technical?.testAgentReport || null,
    postReviewSpotCheckSummary: postReviewSpotCheckSummary
      ? sanitizeUserFacingStructure(postReviewSpotCheckSummary, { fallback: '完成前抽查结论已整理。', max: 420 })
      : null,
    postReviewSpotCheck,
    detail: source.detail || source.message || source.text || '',
  }
}

export const mergeGlobalRunTestAgentExecutionPlan = (run = {}, previousRun = {}) => {
  const previousPlan = previousRun.test_agent_execution_plan || previousRun.testAgentExecutionPlan || null
  const previousSummary = previousRun.test_agent_execution_plan_summary || previousRun.testAgentExecutionPlanSummary || null
  const previousReviewSummary = previousRun.test_agent_review_summary || previousRun.testAgentReviewSummary || previousRun.independent_review_summary || previousRun.independentReviewSummary || null
  const previousReviewRows = Array.isArray(previousRun.independent_review) ? previousRun.independent_review : Array.isArray(previousRun.independentReview) ? previousRun.independentReview : []
  const previousReport = previousRun.test_agent_report || previousRun.testAgentReport || null
  const previousPostReviewSpotCheckSummary = previousRun.post_review_spot_check_summary
    || previousRun.postReviewSpotCheckSummary
    || previousRun.technical?.post_review_spot_check_summary
    || previousRun.technical?.postReviewSpotCheckSummary
    || null
  const previousPostReviewSpotCheck = previousRun.post_review_spot_check
    || previousRun.postReviewSpotCheck
    || previousRun.technical?.post_review_spot_check
    || previousRun.technical?.postReviewSpotCheck
    || null
  const next = { ...run }
  if (!next.test_agent_execution_plan && !next.testAgentExecutionPlan) {
    next.test_agent_execution_plan = previousPlan
    next.testAgentExecutionPlan = previousPlan
  }
  if (!next.test_agent_execution_plan_summary && !next.testAgentExecutionPlanSummary) {
    next.test_agent_execution_plan_summary = previousSummary
    next.testAgentExecutionPlanSummary = previousSummary
  }
  if (!next.test_agent_execution_plan_detail && !next.testAgentExecutionPlanDetail) {
    next.test_agent_execution_plan_detail = previousRun.test_agent_execution_plan_detail || previousRun.testAgentExecutionPlanDetail || ''
    next.testAgentExecutionPlanDetail = previousRun.testAgentExecutionPlanDetail || previousRun.test_agent_execution_plan_detail || ''
  }
  if (!next.test_agent_review_summary && !next.testAgentReviewSummary && !next.independent_review_summary && !next.independentReviewSummary && previousReviewSummary) {
    next.test_agent_review_summary = previousReviewSummary
    next.testAgentReviewSummary = previousReviewSummary
    next.independent_review_summary = previousReviewSummary
    next.independentReviewSummary = previousReviewSummary
  }
  if (!next.independent_review && !next.independentReview && previousReviewRows.length) {
    next.independent_review = previousReviewRows
    next.independentReview = previousReviewRows
  }
  if (!next.test_agent_report && !next.testAgentReport && previousReport) {
    next.test_agent_report = previousReport
    next.testAgentReport = previousReport
  }
  const postReviewSpotCheckSummary = next.post_review_spot_check_summary
    || next.postReviewSpotCheckSummary
    || next.technical?.post_review_spot_check_summary
    || next.technical?.postReviewSpotCheckSummary
    || previousPostReviewSpotCheckSummary
  if (postReviewSpotCheckSummary) {
    next.post_review_spot_check_summary = postReviewSpotCheckSummary
    next.postReviewSpotCheckSummary = postReviewSpotCheckSummary
  }
  const postReviewSpotCheck = next.post_review_spot_check
    || next.postReviewSpotCheck
    || next.technical?.post_review_spot_check
    || next.technical?.postReviewSpotCheck
    || previousPostReviewSpotCheck
  if (postReviewSpotCheck) {
    next.post_review_spot_check = postReviewSpotCheck
    next.postReviewSpotCheck = postReviewSpotCheck
  }
  return next
}

export const applyGlobalTestAgentExecutionPlanReady = (agentMsg, event = {}) => {
  const payload = getGlobalTestAgentExecutionPlanPayload(event)
  if (!payload?.summary) return null
  const previousRun = agentMsg.agenticRun || {}
  const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || ''
  const run = mergeGlobalRunTestAgentExecutionPlan({
    ...previousRun,
    id: previousRun.id || event.run_id || event.runId || `global-test-agent-plan-${event.task_id || event.taskId || Date.now()}`,
    trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
    status: previousRun.status || 'running',
    phase: previousRun.phase || 'execute',
    user_message: userMessage,
    original_user_message: previousRun.original_user_message || userMessage,
    final_reply: previousRun.final_reply || '',
    tool_calls: Number(previousRun.tool_calls || 1),
    model_calls: Number(previousRun.model_calls || 0),
    test_agent_execution_plan: payload.plan || previousRun.test_agent_execution_plan || previousRun.testAgentExecutionPlan || null,
    testAgentExecutionPlan: payload.plan || previousRun.testAgentExecutionPlan || previousRun.test_agent_execution_plan || null,
    test_agent_execution_plan_summary: payload.summary,
    testAgentExecutionPlanSummary: payload.summary,
    test_agent_execution_plan_detail: payload.detail || previousRun.test_agent_execution_plan_detail || '',
    testAgentExecutionPlanDetail: payload.detail || previousRun.testAgentExecutionPlanDetail || '',
  }, previousRun)
  agentMsg.agenticRun = run
  return payload.summary
}

export const applyGlobalTestAgentReviewReady = (agentMsg, event = {}) => {
  const payload = getGlobalTestAgentReviewPayload(event)
  if (!payload?.summary && !payload?.rows?.length && !payload?.postReviewSpotCheckSummary && !payload?.postReviewSpotCheck) return null
  const previousRun = agentMsg.agenticRun || {}
  const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || ''
  agentMsg.agenticRun = mergeGlobalRunTestAgentExecutionPlan({
    ...previousRun,
    id: previousRun.id || event.run_id || event.runId || `global-test-agent-review-${event.task_id || event.taskId || Date.now()}`,
    trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
    status: previousRun.status || 'running',
    phase: previousRun.phase || 'execute',
    user_message: userMessage,
    original_user_message: previousRun.original_user_message || userMessage,
    final_reply: previousRun.final_reply || '',
    tool_calls: Number(previousRun.tool_calls || 1),
    model_calls: Number(previousRun.model_calls || 0),
    test_agent_review_summary: payload.summary || previousRun.test_agent_review_summary || previousRun.testAgentReviewSummary || null,
    testAgentReviewSummary: payload.summary || previousRun.testAgentReviewSummary || previousRun.test_agent_review_summary || null,
    independent_review_summary: payload.summary || previousRun.independent_review_summary || previousRun.independentReviewSummary || null,
    independentReviewSummary: payload.summary || previousRun.independentReviewSummary || previousRun.independent_review_summary || null,
    independent_review: payload.rows?.length ? payload.rows : previousRun.independent_review || previousRun.independentReview || [],
    independentReview: payload.rows?.length ? payload.rows : previousRun.independentReview || previousRun.independent_review || [],
    test_agent_report: payload.report || previousRun.test_agent_report || previousRun.testAgentReport || null,
    testAgentReport: payload.report || previousRun.testAgentReport || previousRun.test_agent_report || null,
    post_review_spot_check_summary: payload.postReviewSpotCheckSummary || previousRun.post_review_spot_check_summary || previousRun.postReviewSpotCheckSummary || null,
    postReviewSpotCheckSummary: payload.postReviewSpotCheckSummary || previousRun.postReviewSpotCheckSummary || previousRun.post_review_spot_check_summary || null,
    post_review_spot_check: payload.postReviewSpotCheck || previousRun.post_review_spot_check || previousRun.postReviewSpotCheck || null,
    postReviewSpotCheck: payload.postReviewSpotCheck || previousRun.postReviewSpotCheck || previousRun.post_review_spot_check || null,
  }, previousRun)
  return payload.summary || payload.postReviewSpotCheckSummary
}

export const globalEventToVisibleLine = (event = {}) => {
  const type = String(event.type || '')
  if (type === 'user_steer_queued') {
    const steering = event.steering || event.user_steer || event.userSteer || {}
    const revised = steering.kind === 'revise_goal'
    return {
      tone: 'running',
      icon: revised ? '🧭' : '✍️',
      title: revised ? '目标调整已接收' : '补充要求已接收',
      text: revised
        ? '我会在当前任务里先重新核对目标和计划，再继续执行。'
        : '我会把这条要求接到当前任务里继续处理。'
    }
  }
  if (type === 'user_steer_applied') {
    const steering = event.steering || event.user_steer || event.userSteer || {}
    const revised = steering.kind === 'revise_goal' || event.replan_required === true
    return {
      tone: 'running',
      icon: revised ? '🧭' : '✅',
      title: revised ? '目标调整已纳入' : '补充要求已纳入',
      text: compactVisibleStreamText(event.message, revised
        ? '新的目标边界已纳入，下一步会重新核对计划。'
        : '补充要求已纳入当前任务，我会带着它继续处理。')
    }
  }
  if (type === 'user_steer_failed') {
    return {
      tone: 'error',
      icon: '⚠️',
      title: '补充要求未接入',
      text: compactVisibleStreamText(event.message, '这条补充没有接入当前任务，请重新发送。')
    }
  }
  if (type === 'test_agent_execution_plan_ready') {
    const payload = getGlobalTestAgentExecutionPlanPayload(event)
    const summary = payload?.summary || {}
    return {
      tone: summary.status === 'blocked' ? 'waiting' : 'running',
      icon: '✅',
      title: summary.title || 'TestAgent 复核计划',
      text: compactVisibleStreamText(summary.headline || event.detail, 'TestAgent 复核计划已生成，我会继续跟进独立复核。')
    }
  }
  if (type === 'test_agent_review_ready') {
    const payload = getGlobalTestAgentReviewPayload(event)
    const summary = payload?.summary || {}
    return {
      tone: summary.status === 'passed' ? 'ok' : ['needs_rework', 'needs_recheck', 'needs_user'].includes(summary.status) ? 'waiting' : 'running',
      icon: summary.status === 'passed' ? '✅' : '⚠️',
      title: summary.title || '独立复核',
      text: compactVisibleStreamText(summary.headline || event.detail, 'TestAgent 已提交独立复核结论，我会纳入最终验收。')
    }
  }
  if (type === 'post_review_spot_check_ready') {
    const payload = getGlobalTestAgentReviewPayload(event)
    const summary = payload?.postReviewSpotCheckSummary || {}
    return {
      tone: summary.status === 'passed' ? 'ok' : summary.status === 'needs_recheck' ? 'waiting' : 'running',
      icon: summary.status === 'passed' ? '✅' : '⚠️',
      title: summary.title || '完成前抽查',
      text: compactVisibleStreamText(summary.headline || event.detail, '完成前抽查已返回，我正在核对最终验收条件。')
    }
  }
  if (event.ui?.title || event.ui?.text) {
    const icons = {
      understanding: '🧠',
      planning: '🧭',
      answering: '✍️',
      executing: '🛠️',
      dispatching: '📨',
      reviewing: '✅',
      debugging: '⚠️',
      waiting: '⏳',
      paused: '⏸️',
      supervising: '📡',
      completed: '✨',
      failed: '❌',
      cancelled: '🛑'
    }
    return {
      tone: event.ui.tone || 'running',
      icon: event.ui.icon || icons[event.ui.phase] || '•',
      title: event.ui.title || '状态更新',
      text: compactVisibleStreamText(event.ui.text || '', '状态已更新。')
    }
  }
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || ''
  const toolLabel = getGlobalToolLabel(toolName)
  if (type === 'dispatch_launch_summary') {
    const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {}
    const rows = Array.isArray(summary.rows) ? summary.rows : []
    const targets = rows.map(row => [visibleGlobalPlanText(row.role || '执行成员', '执行成员', 80), row.agent].filter(Boolean).join(' · ')).filter(Boolean).slice(0, 4).join('、')
    const text = visibleGlobalPlanText(
      [summary.headline || (targets ? `我已把这次需求交给：${targets}。` : ''), summary.next_action ? `下一步：${summary.next_action}` : ''].filter(Boolean).join(' '),
      '安排已发出，正在等待执行目标更新结果。',
      220
    )
    return { tone: 'ok', icon: '📨', title: summary.title || '已派发的工作', text }
  }
  if (type === 'plan_mode_ready') {
    const planMode = event.plan_mode || event.planMode || {}
    return {
      tone: 'running',
      icon: '🧭',
      title: planMode.title || '执行前计划已整理',
      text: compactVisibleStreamText(planMode.next_step || planMode.risk?.summary || event.message, '我已整理计划，会继续执行并在完成后总结。')
    }
  }
  if (type === 'started') return { tone: 'running', icon: '🧠', title: '理解需求', text: '正在理解你的消息，判断是普通对话还是需要执行操作。' }
  if (type === 'decision') {
    const state = event.step?.state || ''
    const message = compactVisibleStreamText(event.step?.message || event.step?.decision?.intent?.reason || '', '正在规划下一步。')
    if (toolName) return { tone: 'running', icon: '🧭', title: '形成行动计划', text: message || `准备执行：${toolLabel}` }
    if (state === 'answer' || state === 'complete') return { tone: 'running', icon: '✍️', title: '组织回复', text: message || '已经形成回答，正在整理给你。' }
    if (state === 'needs_confirmation') return { tone: 'waiting', icon: '⏳', title: '需要确认', text: message || '需要你确认目标或授权范围。' }
    return { tone: 'running', icon: '🧭', title: '规划下一步', text: message || '正在规划下一步。' }
  }
  if (type === 'tool_started') return { tone: 'running', icon: '🛠️', title: '执行动作', text: `正在${toolLabel}。` }
  if (type === 'tool_completed') return { tone: 'ok', icon: '✅', title: '动作已返回', text: `${toolLabel}已返回结果，我正在检查。` }
  if (type === 'tool_failed' || type === 'tool_validation_failed') {
    return { tone: 'error', icon: '⚠️', title: '执行遇到问题', text: compactVisibleStreamText(event.reply || event.step?.message, `${toolLabel}执行遇到问题，我正在重新判断下一步。`) }
  }
  if (type === 'clarification_required') return { tone: 'waiting', icon: '❓', title: '需要补充信息', text: compactVisibleStreamText(event.reply, '需要你补充目标、范围或验收标准。') }
  if (type === 'confirmation_required') return { tone: 'waiting', icon: '🔐', title: '等待授权确认', text: compactVisibleStreamText(event.reply, '这个操作需要你确认后才会继续。') }
  if (type === 'paused') return { tone: 'waiting', icon: '⏸️', title: '已暂停', text: compactVisibleStreamText(event.reply, '全局 Agent 已暂停。') }
  if (type === 'supervising') return { tone: 'running', icon: '📡', title: '持续跟进中', text: compactVisibleStreamText(event.reply, '已经创建长期任务，正在跟进协作群和项目执行成员交付。') }
  if (type === 'completed') return { tone: 'ok', icon: '✨', title: '处理结果', text: compactVisibleStreamText(event.reply, GLOBAL_STREAM_COMPLETED_FALLBACK) }
  if (type === 'failed') return { tone: 'error', icon: '❌', title: '失败', text: compactVisibleStreamText(event.reply, '任务没有完成，我已整理未完成原因和下一步。') }
  if (type === 'cancelled') return { tone: 'waiting', icon: '🛑', title: '已取消', text: compactVisibleStreamText(event.reply, '本轮处理已取消。') }
  return null
}
