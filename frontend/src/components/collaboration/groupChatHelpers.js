import { sanitizeUserFacingAgentText, sanitizeUserFacingLegacyTerminology, sanitizeUserFacingPlanText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'
import {
  classifyGroupTaskCardPresentation,
  PRESENTATION_REPLY,
  shouldAttachTaskExperienceCard,
  showDeliveryScaffold,
  stripDeliveryScaffoldSections,
} from '../../utils/resultPresentation.js'

export const GROUP_VISIBLE_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|scratchpad|Runtime Kernel|workflow_timeline/i
export const GROUP_INTERNAL_PROTOCOL_FALLBACK = '执行成员已提交技术执行信息，我正在整理用户可读结论。'
export const GROUP_STREAM_ERROR_FALLBACK = '请求没有完成，我会保留当前进度；排障信息已放入技术详情。'

export const sanitizeGroupVisibleText = (value, fallback = '我正在处理当前请求。', max = 4000) => {
  const raw = String(value || '')
  if (!raw) return ''
  if (GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(raw)) {
    const visible = sanitizeUserFacingLegacyTerminology(sanitizeUserFacingAgentText(raw, GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200)))
    return sanitizeUserFacingPlanText(visible, fallback || GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200))
  }
  const text = sanitizeUserFacingPlanText(raw, fallback, max)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export const buildGroupStreamErrorText = (value) => `这次没有完成：${sanitizeGroupVisibleText(value || GROUP_STREAM_ERROR_FALLBACK, GROUP_STREAM_ERROR_FALLBACK, 800) || GROUP_STREAM_ERROR_FALLBACK}`

export function getVisibleGroupMessageContent(msg, fallback = '我已整理这条消息。') {
  if (!msg) return ''
  if (msg.role === 'user') return String(msg.content || '')
  const card = msg?.taskCard || msg?.task_card || msg?.taskRuntime?.taskCard || msg?.taskRuntime?.task_card || null
  const presentation = classifyGroupTaskCardPresentation(card, msg)
  const raw = presentation === PRESENTATION_REPLY
    ? stripDeliveryScaffoldSections(msg.content)
    : msg.content
  return sanitizeGroupVisibleText(raw, fallback, 4000)
}

export const isCoordinatorProject = (project) => String(project || '') === 'coordinator'

export const getCoordinatorMember = (group) => {
  return group?.members?.find(m => m.role === 'coordinator' || isCoordinatorProject(m.project)) || null
}

export const getRoutableMembers = (group) => {
  return (group?.members || []).filter(m => !isCoordinatorProject(m.project) && m.role !== 'coordinator')
}

export const getMemberCountLabel = (group) => {
  const count = getRoutableMembers(group).length
  return `${count}成员 + 协调者`
}

export const getAgentDisplayName = (agent) => {
  if (agent === 'system') return '系统'
  if (isCoordinatorProject(agent)) return '协调者'
  return agent || 'Agent'
}

export const getWorkEvents = (msg) => Array.isArray(msg?.workEvents) ? msg.workEvents.filter(Boolean) : []

export const agentAccentPalette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#4f46e5']

export const hashAgent = (agent) => String(agent || 'agent').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)

export const getAgentAccent = (agent) => agentAccentPalette[hashAgent(agent) % agentAccentPalette.length]

export const getAgentAccentStyle = (agent) => ({ '--agent-accent': getAgentAccent(agent) })

export const getAgentInitials = (agent) => {
  const name = getAgentDisplayName(agent).replace(/[（）()]/g, ' ').trim()
  const parts = name.split(/\s+|[-_/]/).filter(Boolean)
  if (!parts.length) return 'A'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export const getWorkPanelState = (msg) => {
  const events = getWorkEvents(msg)
  if (events.some(event => event.kind === 'error')) return { tone: 'fail', label: '失败' }
  if (msg?.streaming) return { tone: 'running', label: '执行中' }
  if (events.some(event => event.kind === 'done')) return { tone: 'ok', label: '完成' }
  return { tone: 'idle', label: events.length ? '等待结果说明' : '待执行' }
}

export const getAgentMessageStatus = (msg) => {
  if (msg?.agent === 'system') return { tone: 'fail', label: '系统' }
  const state = getWorkPanelState(msg)
  if (getWorkEvents(msg).length) return state
  if (msg?.streaming) return { tone: 'running', label: '思考中' }
  return { tone: 'idle', label: '回复' }
}

export const isGroupMainAgentMessage = (msg) => isCoordinatorProject(msg?.agent) || msg?.type === 'project_task_intake'

export const getTaskRuntime = (msg) => msg?.taskRuntime || msg?.task_runtime || null

export const isLegacyNonTaskCard = (card) => {
  if (!card) return false
  const text = String(`${card.title || ''} ${card.goal || ''}`).replace(/\s+/g, '')
  const greetingOnly = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)+[。.!！?？]*$/i.test(text)
  const hasEvidence = card.delivery?.files?.length || card.delivery?.verification?.length || card.completed?.length || card.agents?.some?.(agent => ['done', 'running', 'failed', 'partial', 'reviewing'].includes(String(agent.status || '')))
  return greetingOnly && !hasEvidence
}

export const getTaskCard = (msg) => {
  const card = msg?.taskCard || msg?.task_card || getTaskRuntime(msg)?.taskCard || getTaskRuntime(msg)?.task_card || null
  if (card?.visible === false) return null
  if (isLegacyNonTaskCard(card)) return null
  const presentation = classifyGroupTaskCardPresentation(card, msg)
  if (!shouldAttachTaskExperienceCard(presentation)) return null
  if (card.presentation) return card
  return { ...card, presentation, delivery_scaffold: showDeliveryScaffold(presentation) }
}

export const shouldShowOrchestrationPlan = (msg) => {
  if (!msg || getTaskCard(msg)) return false
  const assignments = Array.isArray(msg.assignments) ? msg.assignments : []
  if (assignments.length > 0) return true
  if (msg.coordinationPlan?.phases?.length) return true
  const action = String(msg.dispatchPolicy?.action || '')
  return action === 'delegate'
}

export const isInternalProtocolMessage = (msg) => {
  const content = String(msg?.content || '')
  if (msg?.task_id && ['agent_qa', 'agent_qa_resume', 'conflict_plan', 'task_rehearsal'].includes(String(msg?.type || ''))) return true
  const protocolPayload = /CCM_AGENT_RECEIPT|"ccm_receipt"|<task-notification>|【主 Agent 业务开发工作单】|主 Agent 返工工作单|任务前沙盘演练|主 Agent 派发修复|【任务需要继续处理】|📋\s*\*{0,2}(?:规则)?协调复盘/i.test(content)
  const generatedContinuation = /^任务补充说明[：:]\s*请继续推进任务/.test(content)
    || (content.includes('需要补齐的主 Agent 协作证据') && content.includes('继续执行要求'))
  return protocolPayload || generatedContinuation
}

export const getMessageTaskId = (msg) => msg?.task_id || msg?.task?.id || ''

export const isPrimaryTaskMessage = (messages, msg, index) => {
  const taskId = getMessageTaskId(msg)
  if (!taskId || isInternalProtocolMessage(msg)) return false
  return messages.findIndex((item) => getMessageTaskId(item) === taskId && !isInternalProtocolMessage(item)) === index
}

export const shouldShowGroupMessage = (messages, msg, index) => {
  if (isInternalProtocolMessage(msg)) return false
  const taskId = getMessageTaskId(msg)
  if (!taskId) return true
  if (isPrimaryTaskMessage(messages, msg, index)) return true
  return msg.role === 'user' && !/【主 Agent 业务开发工作单】|任务前沙盘演练|CCM_AGENT_RECEIPT|task-notification/i.test(String(msg.content || ''))
}

const groupMessageTime = (message) => {
  const value = message?.timestamp || message?.created_at || message?.createdAt || ''
  const time = Date.parse(value)
  return Number.isFinite(time) ? time : 0
}

export const buildGroupContextCompactionEvent = (memory, messages = []) => {
  const compaction = memory?.compaction || {}
  const compression = memory?.messageCompression || {}
  const boundary = memory?.compactBoundary || {}
  const compressedMessages = Number(compaction.compactedMessageCount || compression.compressedMessages || 0)
  const occurredAt = compaction.lastCompactedAt || compression.lastCompressedAt || boundary.createdAt || ''
  const boundaryId = String(boundary.id || compaction.background?.boundaryId || '')
  if (!boundaryId || !occurredAt || compressedMessages <= 0) return null

  const summarizedThroughMessageId = String(
    boundary.summarizedThroughMessageId
      || compaction.lastCompactedMessageId
      || compaction.background?.summarizedThroughMessageId
      || ''
  )
  let insertIndex = summarizedThroughMessageId
    ? messages.findIndex(message => String(message?.id || '') === summarizedThroughMessageId) + 1
    : 0
  if (insertIndex <= 0) {
    const eventTime = Date.parse(occurredAt)
    insertIndex = Number.isFinite(eventTime)
      ? messages.findIndex(message => groupMessageTime(message) > eventTime)
      : 0
    if (insertIndex < 0) insertIndex = messages.length
  }

  const manual = compaction.background?.force === true
  const recentMessages = Number(compaction.preservedRecentMessages || compression.recentMessages || compression.recentLimit || 0)
  return {
    id: boundaryId,
    insertIndex,
    label: manual ? '上下文已手动压缩' : '上下文已自动压缩',
    occurredAt,
    compressedMessages,
    recentMessages,
    title: `旧消息已压缩 ${compressedMessages} 条；保留近期原文 ${recentMessages} 条`,
  }
}

export const isPrimaryTaskCard = (messages, msg, index) => {
  return !!getTaskCard(msg) && isPrimaryTaskMessage(messages, msg, index)
}

export const taskRuntimeStatusLabel = (status) => ({ pending: '待执行', in_progress: '执行中', blocked: '受阻', done: '已完成', failed: '失败', cancelled: '已取消' }[status] || status || '执行中')

export const taskRuntimeAgentState = (state) => ({ queued: '排队', spawning: '启动', ready: '就绪', prompt_accepted: '已接单', running: '执行中', reviewing: '验收', succeeded: '完成', failed: '失败', cancel_requested: '停止中', cancelled: '已取消' }[state] || state || '等待')

export const taskRuntimeGreenLabel = (green) => ({ none: '未验收', targeted: '局部绿', project: '项目绿', workspace: '工作区绿', merge_ready: '可合并' }[green] || green || '未验收')

export const testAgentReviewPhase = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'needs_rework') return { phase: 'failed', phaseLabel: '需返工', runtimeStatus: 'blocked', agentStatus: 'failed' }
  if (value === 'needs_recheck') return { phase: 'reviewing', phaseLabel: '需复验', runtimeStatus: 'blocked', agentStatus: 'blocked' }
  if (value === 'needs_environment') return { phase: 'needs_user', phaseLabel: '补条件', runtimeStatus: 'blocked', agentStatus: 'blocked' }
  if (value === 'needs_user') return { phase: 'needs_user', phaseLabel: '等你确认', runtimeStatus: 'blocked', agentStatus: 'blocked' }
  if (value === 'passed') return { phase: 'reviewing', phaseLabel: '复核已返回', runtimeStatus: 'in_progress', agentStatus: 'done' }
  return { phase: 'reviewing', phaseLabel: '复核已记录', runtimeStatus: 'in_progress', agentStatus: 'reviewing' }
}

export const getTargetDisplayName = (target) => {
  if (target === 'all' || isCoordinatorProject(target)) return '协调者'
  return target || 'Agent'
}

export const formatFileSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export const getFileChangesTitle = (fileChanges) => {
  const files = fileChanges?.files || []
  const counts = files.reduce((acc, file) => {
    const kind = file.statusKind || ''
    if (kind === 'added') acc.added++
    else if (kind === 'deleted') acc.deleted++
    else acc.modified++
    return acc
  }, { added: 0, modified: 0, deleted: 0 })
  const parts = []
  if (counts.added) parts.push(`新增 ${counts.added}`)
  if (counts.modified) parts.push(`修改 ${counts.modified}`)
  if (counts.deleted) parts.push(`删除 ${counts.deleted}`)
  return parts.length ? `📁 变更了 ${files.length} 个文件（${parts.join('，')}）` : `📁 变更了 ${fileChanges?.count || 0} 个文件`
}

export const getExecutionOrderLabel = (order) => {
  if (order === 'backend_first') return '后端优先'
  if (order === 'sequential') return '顺序执行'
  return '并行执行'
}

export const workflowSteps = [
  { key: 'understanding', label: '理解' },
  { key: 'dispatching', label: '拆分' },
  { key: 'executing', label: '执行' },
  { key: 'reviewing', label: '验收' },
  { key: 'complete', label: '完成' }
]

export const getWorkflowPhase = (msg) => {
  const explicit = msg?.workflow?.phase
  if (explicit) return explicit
  const assignments = msg?.assignments || []
  if (!assignments.length) return 'understanding'
  const statuses = assignments.map(item => item.status || 'pending')
  if (statuses.some(status => ['failed', 'blocked', 'needs_info', 'partial'].includes(status))) return 'needs_rework'
  if (statuses.some(status => status === 'running')) return 'executing'
  if (statuses.every(status => status === 'done')) return 'reviewing'
  return 'dispatching'
}

export const getWorkflowStepState = (msg, stepKey) => {
  const phase = getWorkflowPhase(msg)
  if (phase === 'rework' || phase === 'needs_rework' || phase === 'needs_recheck') {
    if (stepKey === 'reviewing') return 'active warning'
    if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
    return ''
  }
  if (phase === 'needs_user') {
    if (stepKey === 'reviewing') return 'active warning'
    if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
    return ''
  }
  const order = workflowSteps.map(step => step.key)
  const current = order.indexOf(phase)
  const idx = order.indexOf(stepKey)
  if (current === -1 || idx === -1) return ''
  if (idx < current) return 'done'
  if (idx === current) return 'active'
  return ''
}

export const getWorkflowLabel = (msg) => {
  const phase = getWorkflowPhase(msg)
  if (msg?.workflow?.label) return msg.workflow.label
  if (phase === 'rework' || phase === 'needs_rework') return '验收返工'
  if (phase === 'needs_recheck') return '重新复验'
  if (phase === 'needs_user') return '等待用户'
  if (phase === 'reviewing') return '最终验收'
  if (phase === 'complete') return '协作完成'
  if (phase === 'executing') return '执行成员执行中'
  if (phase === 'dispatching') return '任务拆分'
  return '需求理解'
}

export const getDispatchActionLabel = (action) => {
  if (action === 'delegate') return '安排执行成员'
  if (action === 'ask_user') return '先问用户'
  if (action === 'hold') return '暂不执行'
  if (action === 'direct_answer') return '直接回复'
  return '派发决策'
}

export const getPlanTitle = (msg) => {
  if (getWorkflowPhase(msg) === 'rework' || (msg.assignments || []).some(item => item.rework)) return '返工计划'
  if (msg?.workflow?.label) return msg.workflow.label
  return '执行计划'
}

export const compactPlanText = (text, max = 180) => {
  const value = sanitizeGroupVisibleText(text, '计划详情已整理，可在技术详情查看。', max).replace(/\s+/g, ' ').trim()
  return value.length > max ? value.slice(0, max) + '...' : value
}

export const getAssignmentStatusLabel = (status) => {
  if (status === 'running') return '执行中'
  if (status === 'done') return '已完成'
  if (status === 'partial') return '部分完成'
  if (status === 'blocked') return '阻塞'
  if (status === 'needs_info') return '需补充信息'
  if (status === 'failed') return '失败'
  return '待处理'
}

export const getAssignmentStatusClass = (status) => {
  if (status === 'running') return 'running'
  if (status === 'done') return 'done'
  if (status === 'partial') return 'partial'
  if (status === 'blocked') return 'blocked'
  if (status === 'needs_info') return 'needs-info'
  if (status === 'failed') return 'failed'
  return 'pending'
}

export const getAssignmentIdentity = (item = {}) => ({
  assignmentId: String(item.assignmentId || item.assignment_id || item.id || ''),
  dispatchKey: String(item.dispatchKey || item.dispatch_key || ''),
  project: String(item.project || item.agent || item.target_project || item.targetName || '')
})

export const getDiffLineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'meta'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'remove'
  return 'context'
}

export const normalizeGroupTools = (tools = {}) => ({
  mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
  skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean)))
})

export const getGroupClarificationContext = (msg) => msg?.clarificationContext || msg?.clarification_context || null
export const getGroupClarificationSummary = (msg) => msg?.clarificationSummary || msg?.clarification_summary || null

export const isPendingGroupClarification = (msg) => {
  const context = getGroupClarificationContext(msg)
  return !!context
    && String(context.status || 'pending') === 'pending'
    && !context.resolved_at
    && !context.resolvedAt
}

export const groupSendRetrySignature = ({ groupId, target, mode, message, files, directed }) => JSON.stringify({
  groupId,
  target,
  mode,
  message,
  files: (files || []).map(file => [file.name, file.size]),
  continuationTaskId: directed?.continuation_task_id || '',
  clarificationRequestId: directed?.clarification_request_id || '',
  memoryAction: directed?.memory_action || '',
  memoryContent: directed?.memory_content || '',
})

export const resolveTestAgentFallbackTaskId = (data = {}, source = {}, prefix = 'test-agent-review', previousId = '') => {
  const explicit = data.taskId
    || data.task_id
    || data.workOrderId
    || data.work_order_id
    || source?.taskId
    || source?.task_id
    || source?.workOrderId
    || source?.work_order_id
    || ''
  if (explicit) return String(explicit)
  // Never mint UI-only task ids; only reuse a prior real id (not synthetic test-agent-* stamps).
  if (previousId && !/^test-agent-(review|plan)-\d+$/i.test(String(previousId))) return previousId
  return ''
}

export const getTestAgentReviewPayload = (data = {}) => {
  const summary = data.test_agent_review_summary
    || data.testAgentReviewSummary
    || data.independent_review_summary
    || data.independentReviewSummary
    || null
  const rows = Array.isArray(data.independent_review)
    ? data.independent_review
    : Array.isArray(data.independentReview)
      ? data.independentReview
      : []
  if (!summary && !rows.length) return null
  return {
    summary: summary ? sanitizeUserFacingStructure(summary, { fallback: 'TestAgent 独立复核结论已整理。', max: 420 }) : null,
    rows: sanitizeUserFacingStructure(rows, { fallback: 'TestAgent 独立复核证据已整理。', max: 240 }),
    report: data.test_agent_report || data.testAgentReport || data.technical?.test_agent_report || null,
    detail: data.detail || data.message || data.text || '',
  }
}

export const createTestAgentExecutionPlanFallbackMessage = (data = {}, summary = {}, plan = null, taskId) => {
  const blocked = summary.status === 'blocked'
  const headline = sanitizeGroupVisibleText(summary.headline || data.detail, 'TestAgent 复核计划已整理。', 360)
  const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || (blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。'), blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。', 260)
  const taskCard = {
    version: 1,
    visible: true,
    task_id: taskId,
    title: data.title || 'TestAgent 复核计划',
    goal: data.goal || '展示 TestAgent 复核计划，并跟进后续独立复核结果。',
    phase: blocked ? 'blocked' : 'reviewing',
    phase_label: blocked ? '需修复' : '复核准备中',
    progress: blocked ? 38 : 58,
    active_agents: [blocked ? '等待修复复核计划' : '等待 TestAgent 复核'],
    agents: [{ name: 'TestAgent', status: blocked ? 'blocked' : 'reviewing', summary: headline }],
    completed: ['已生成 TestAgent 复核计划'],
    blockers: blocked ? [...(Array.isArray(summary.issues) ? summary.issues : [])].slice(0, 4) : [],
    next_action: nextAction,
    test_agent_execution_plan: plan,
    testAgentExecutionPlan: plan,
    test_agent_execution_plan_summary: summary,
    testAgentExecutionPlanSummary: summary,
    test_agent_execution_plan_detail: data.detail || '',
    testAgentExecutionPlanDetail: data.detail || '',
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: headline,
      tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 复核计划已返回' },
    },
    technical: {
      trace_id: data.trace_id || data.traceId || '',
      test_agent_execution_plan: plan,
      raw_event_type: 'test_agent_execution_plan_ready',
    },
  }
  const taskRuntime = {
    taskId,
    status: blocked ? 'blocked' : 'in_progress',
    statusText: headline,
    taskCard,
    task_card: taskCard,
    testAgentExecutionPlan: plan,
    test_agent_execution_plan: plan,
    testAgentExecutionPlanSummary: summary,
    test_agent_execution_plan_summary: summary,
  }
  return {
    id: `test-agent-plan-${taskId}`,
    role: 'assistant',
    agent: 'coordinator',
    type: 'project_task_intake',
    content: headline,
    timestamp: new Date().toISOString(),
    task_id: taskId,
    task: {
      id: taskId,
      title: taskCard.title,
      status: taskRuntime.status,
      status_detail: headline,
      workflow_type: 'test_agent_review',
    },
    taskCard,
    task_card: taskCard,
    taskRuntime,
    task_runtime: taskRuntime,
  }
}

export const createTestAgentReviewFallbackMessage = (data = {}, summary = {}, payload = {}, taskId) => {
  const phase = testAgentReviewPhase(summary.status)
  const rows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : Array.isArray(summary.rows) ? summary.rows : []
  const headline = sanitizeGroupVisibleText(summary.headline || payload.detail, 'TestAgent 独立复核结论已整理。', 360)
  const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || '继续等待完整复核证据或最终总结。', '继续等待完整复核证据或最终总结。', 260)
  const taskCard = {
    version: 1,
    visible: true,
    task_id: taskId,
    title: data.title || 'TestAgent 独立复核',
    goal: data.goal || '展示 TestAgent 返回的独立复核结论，并等待后续验收或返工。',
    phase: phase.phase,
    phase_label: phase.phaseLabel,
    progress: phase.runtimeStatus === 'blocked' ? 72 : 84,
    active_agents: phase.phase === 'failed'
      ? ['正在安排返工']
      : summary.status === 'needs_recheck'
        ? ['正在安排重新复验']
      : summary.status === 'needs_environment'
        ? ['等待补齐复核条件']
      : phase.phase === 'needs_user'
        ? ['等待你确认复核问题']
        : ['正在纳入复核结论'],
    agents: [{ name: 'TestAgent', status: phase.agentStatus, summary: headline }],
    completed: ['已收到 TestAgent 独立复核结论'],
    blockers: phase.runtimeStatus === 'blocked' ? rows.slice(0, 4) : [],
    next_action: nextAction,
    independent_review_summary: summary,
    independentReviewSummary: summary,
    test_agent_review_summary: summary,
    testAgentReviewSummary: summary,
    independent_review: rows,
    independentReview: rows,
    test_agent_report: payload.report || null,
    testAgentReport: payload.report || null,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: headline,
      tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 独立复核结论已返回' },
    },
    technical: {
      trace_id: data.trace_id || data.traceId || '',
      test_agent_report: payload.report || data.test_agent_report || data.testAgentReport || null,
      failure_step_screenshots: data.technical?.failure_step_screenshots
        || summary?.technical?.failure_step_screenshots
        || [],
      failure_step_screenshot_rows: data.technical?.failure_step_screenshot_rows
        || summary?.technical?.failure_step_screenshot_rows
        || [],
      test_agent_environment_prep: data.technical?.test_agent_environment_prep
        || summary?.test_agent_environment_prep
        || summary?.testAgentEnvironmentPrep
        || null,
      raw_event_type: 'test_agent_review_ready',
    },
  }
  const taskRuntime = {
    taskId,
    status: phase.runtimeStatus,
    statusText: headline,
    taskCard,
    task_card: taskCard,
    independent_review_summary: summary,
    independentReviewSummary: summary,
    test_agent_review_summary: summary,
    testAgentReviewSummary: summary,
  }
  return {
    id: `test-agent-review-${taskId}`,
    role: 'assistant',
    agent: 'coordinator',
    type: 'project_task_intake',
    content: headline,
    timestamp: new Date().toISOString(),
    task_id: taskId,
    task: {
      id: taskId,
      title: taskCard.title,
      status: phase.runtimeStatus,
      status_detail: headline,
      workflow_type: 'test_agent_review',
    },
    taskCard,
    task_card: taskCard,
    taskRuntime,
    task_runtime: taskRuntime,
  }
}
