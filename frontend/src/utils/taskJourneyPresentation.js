import { sanitizeUserFacingAgentText } from './agentDisplay.js'

const asList = (value) => Array.isArray(value)
  ? value.filter(Boolean)
  : value === undefined || value === null || value === '' ? [] : [value]

const unique = (items, limit = 12) => [...new Set(
  asList(items).map(item => String(item || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
)].slice(0, limit)

const clean = (value, fallback = '', max = 260) => sanitizeUserFacingAgentText(value, fallback, max)

const DELIVERY_PHASES = new Set(['completed', 'done', 'succeeded'])

const executionPhase = (phase = '') => ({
  understanding: { label: '正在理解需求', kind: 'planning' },
  planning: { label: '正在分析', kind: 'planning' },
  queued: { label: '等待执行', kind: 'queued' },
  dispatching: { label: '正在安排执行', kind: 'running' },
  executing: { label: '正在开发', kind: 'running' },
  in_progress: { label: '正在开发', kind: 'running' },
  running: { label: '正在开发', kind: 'running' },
  reviewing: { label: '正在验收', kind: 'reviewing' },
  testing: { label: '正在验收', kind: 'reviewing' },
  accepting: { label: '最终验收', kind: 'reviewing' },
  reworking: { label: '正在返工', kind: 'warning' },
  needs_user: { label: '等待确认', kind: 'warning' },
  environment_blocked: { label: '等待运行条件', kind: 'warning' },
  recovery_required: { label: '等待安全恢复', kind: 'warning' },
  blocked: { label: '任务受阻', kind: 'danger' },
  completed: { label: '已完成', kind: 'success' },
  done: { label: '已完成', kind: 'success' },
  succeeded: { label: '已完成', kind: 'success' },
  failed: { label: '执行失败', kind: 'danger' },
  cancelled: { label: '已停止', kind: 'muted' },
  canceled: { label: '已停止', kind: 'muted' },
  reverted: { label: '已撤销', kind: 'muted' },
}[phase] || { label: '正在处理', kind: 'running' })

const globalPhase = (phase = '') => ({
  understanding: { label: '正在理解需求', kind: 'planning' },
  planning: { label: '正在确定执行位置', kind: 'planning' },
  queued: { label: '下游任务排队中', kind: 'queued' },
  dispatching: { label: '正在派发任务', kind: 'running' },
  executing: { label: '正在跟踪下游执行', kind: 'running' },
  in_progress: { label: '正在跟踪下游执行', kind: 'running' },
  running: { label: '正在跟踪下游执行', kind: 'running' },
  reviewing: { label: '正在汇总下游验收', kind: 'reviewing' },
  testing: { label: '正在汇总下游验收', kind: 'reviewing' },
  accepting: { label: '正在核对最终交付', kind: 'reviewing' },
  reworking: { label: '下游任务正在返工', kind: 'warning' },
  needs_user: { label: '等待你确认', kind: 'warning' },
  environment_blocked: { label: '等待下游运行条件', kind: 'warning' },
  recovery_required: { label: '等待确认安全恢复', kind: 'warning' },
  blocked: { label: '下游任务受阻', kind: 'danger' },
  completed: { label: '交付已汇总', kind: 'success' },
  done: { label: '交付已汇总', kind: 'success' },
  succeeded: { label: '交付已汇总', kind: 'success' },
  failed: { label: '任务未完成', kind: 'danger' },
  cancelled: { label: '任务已停止', kind: 'muted' },
  canceled: { label: '任务已停止', kind: 'muted' },
  reverted: { label: '任务已撤销', kind: 'muted' },
}[phase] || { label: '正在跟踪任务', kind: 'running' })

const usesMainAgentSelfVerification = (card = {}) => card.acceptance_mode === 'main_agent_self_verification'
  || card.acceptanceMode === 'main_agent_self_verification'
  || card.test_agent_enabled === false
  || card.testAgentEnabled === false
  || asList(card.agents).some(agent => /主 Agent\s*自验/.test(String(agent?.name || agent?.label || agent || '')))

const executionStageLabels = (card = {}) => [
  '理解需求',
  '制定计划',
  '开发执行',
  usesMainAgentSelfVerification(card) ? '主 Agent自验' : 'TestAgent（独立验收）',
  '最终验收',
  '完成交付',
]
const globalStageLabels = ['理解需求', '确定执行位置', '创建或拆分任务', '派发与排队', '跟踪下游', '汇总交付']

const executionStageIndex = (phase = '') => ({
  understanding: 0,
  planning: 1,
  queued: 1,
  dispatching: 2,
  executing: 2,
  in_progress: 2,
  running: 2,
  reworking: 2,
  reviewing: 3,
  testing: 3,
  accepting: 4,
  needs_user: 4,
  environment_blocked: 4,
  recovery_required: 4,
  blocked: 4,
  completed: 5,
  done: 5,
  succeeded: 5,
  failed: 4,
  cancelled: 4,
  canceled: 4,
  reverted: 4,
}[phase] ?? 1)

const globalStageIndex = (phase = '') => ({
  understanding: 0,
  planning: 1,
  queued: 3,
  dispatching: 3,
  executing: 4,
  in_progress: 4,
  running: 4,
  reworking: 4,
  reviewing: 4,
  testing: 4,
  accepting: 4,
  needs_user: 4,
  environment_blocked: 4,
  recovery_required: 4,
  blocked: 4,
  completed: 5,
  done: 5,
  succeeded: 5,
  failed: 4,
  cancelled: 4,
  canceled: 4,
  reverted: 4,
}[phase] ?? 1)

export const buildTaskRolePresentation = (context = 'task', phase = '', card = {}) => {
  const global = context === 'global'
  return {
    context,
    phase,
    phaseMeta: global ? globalPhase(phase) : executionPhase(phase),
    stages: global ? globalStageLabels : executionStageLabels(card),
    currentStage: global ? globalStageIndex(phase) : executionStageIndex(phase),
    terminalSuccess: DELIVERY_PHASES.has(phase),
  }
}

export const taskStageLabelForContext = (value, context = 'task', card = {}) => {
  const label = clean(value, '', 180)
  if (!label) return label
  if (context !== 'global') {
    return usesMainAgentSelfVerification(card) && /TestAgent|独立验收/i.test(label) ? '主 Agent自验' : label
  }
  if (/^(?:制定计划|执行前计划|分析需求)$/.test(label)) return '确定执行位置'
  if (/^(?:开发执行|正在开发|正在修改|执行开发)$/.test(label)) return '跟踪下游执行'
  if (/TestAgent|独立验收/i.test(label)) return '核对下游验收'
  if (/^(?:最终验收|主 Agent 验收)$/.test(label)) return '汇总下游结果'
  if (/^(?:完成交付|交付完成|最终交付|总结交付)$/.test(label)) return '汇总交付'
  return label
}

const sourceIngestion = (card = {}) => card.source_ingestion
  || card.sourceIngestion
  || card.technical?.source_ingestion
  || card.technical?.sourceIngestion
  || null

const requirementExtraction = (card = {}) => card.requirement_extraction
  || card.requirementExtraction
  || card.technical?.requirement_extraction
  || card.technical?.requirementExtraction
  || sourceIngestion(card)?.requirement
  || null

const planMode = (card = {}) => card.plan_mode
  || card.planMode
  || card.main_agent_decision?.plan_mode
  || card.mainAgentDecision?.planMode
  || null

const sourceName = (source, index) => clean(
  source?.name || source?.filename || source?.url || source?.path || `资料 ${index + 1}`,
  `资料 ${index + 1}`,
  100,
)

const sourceStatus = (source = {}) => {
  const value = String(source.status || '').toLowerCase()
  if (source.readable === true && value === 'partial') return { kind: 'partial', label: '已读取部分内容' }
  if (source.readable === true || value === 'parsed') return { kind: 'read', label: '已读取' }
  if (value === 'needs_authorization') return { kind: 'attention', label: '需要授权' }
  if (value === 'unsupported') return { kind: 'attention', label: '格式暂不支持' }
  return { kind: 'failed', label: '读取失败' }
}

export const buildTaskSourceCoverage = (card = {}) => {
  const ingestion = sourceIngestion(card)
  if (!ingestion) return null
  const rawSources = asList(ingestion.sources).length
    ? asList(ingestion.sources)
    : asList(ingestion.attachments || ingestion.technical?.sources)
  if (!rawSources.length) return null
  const rows = rawSources.map((source, index) => {
    const status = sourceStatus(source)
    return {
      id: source.id || source.url || source.path || `${index}`,
      name: sourceName(source, index),
      kind: status.kind,
      status: status.label,
      detail: clean(source.error || source.summary, status.kind === 'read' ? '正文已加入任务上下文。' : '执行前需要处理这份资料。', 180),
      required: source.required !== false,
    }
  })
  const readable = rows.filter(row => ['read', 'partial'].includes(row.kind)).length
  const attention = rows.filter(row => ['attention', 'failed'].includes(row.kind))
  return {
    total: rows.length,
    readable,
    attention: attention.length,
    blocking: attention.some(row => row.required),
    label: attention.length ? `已读取 ${readable}/${rows.length} 份资料` : `${readable} 份资料均已读取`,
    headline: attention.length
      ? `${attention.length} 份资料尚未完整读取，不能根据文件名猜测内容。`
      : '本次提交的资料已加入需求理解和验收上下文。',
    rows,
  }
}

export const buildTaskRequestContract = (card = {}, context = 'task') => {
  const plan = planMode(card) || {}
  const requirement = requirementExtraction(card) || {}
  const coverage = buildTaskSourceCoverage(card)
  const scope = unique([
    ...asList(requirement.scope),
    ...asList(plan.impact_scope?.areas || plan.impactScope?.areas),
    ...asList(card.scope),
  ], 6).map(item => clean(item, '', 120)).filter(Boolean)
  const projects = unique([
    ...asList(plan.impact_scope?.projects || plan.impactScope?.projects),
    ...asList(card.responsible_projects || card.responsibleProjects),
    ...asList(card.target_projects || card.targetProjects),
  ], 8).map(item => clean(item, '', 80)).filter(Boolean)
  const acceptance = unique([
    ...asList(requirement.acceptance_criteria || requirement.acceptanceCriteria),
    ...asList(plan.acceptance),
    ...asList(card.acceptance_criteria || card.acceptanceCriteria),
  ], 6).map(item => clean(item?.label || item?.content || item, '', 180)).filter(Boolean)
  const exclusions = unique([
    ...asList(requirement.out_of_scope || requirement.outOfScope),
    ...asList(plan.out_of_scope || plan.outOfScope),
    ...asList(card.out_of_scope || card.outOfScope),
  ], 4).map(item => clean(item, '', 140)).filter(Boolean)
  const requiresConfirmation = card.requires_confirmation === true
    || (plan.requires_confirmation === true && !plan.accepted_at && !plan.confirmed_at)
  const accepted = Boolean(plan.accepted_at || plan.confirmed_at || plan.confirmation_status === 'accepted')
  const goal = clean(
    requirement.business_goal || card.goal || card.user_goal || card.userGoal || card.request || card.title,
    '任务目标尚未完整记录。',
    360,
  )
  const clarification = unique([
    ...asList(requirement.clarification_questions || requirement.clarificationQuestions),
    ...asList(plan.clarification_questions || plan.clarificationQuestions)
      .filter(item => !item?.status || item.status === 'open')
      .map(item => item?.question || item),
  ], 4).map(item => clean(item, '', 180)).filter(Boolean)
  return {
    title: '需求确认',
    goal,
    scope,
    projects,
    acceptance,
    exclusions,
    clarification,
    sourceCoverage: coverage,
    requiresConfirmation,
    accepted,
    executionMode: requiresConfirmation && !accepted ? '等待确认后执行' : '已进入自动执行链路',
    sourceLabel: ({ global: '全局助手', group: '群聊会话', project: '项目会话' }[context] || '当前会话'),
  }
}

export const buildTaskQueueOverview = (card = {}, phase = '') => {
  const runtime = card.runtime_status || card.runtimeStatus || {}
  const work = card.work_item_summary || card.workItemSummary || {}
  const dependency = work.dependency_summary || work.dependencySummary || {}
  const position = Number(
    runtime.queue_position
      ?? runtime.queuePosition
      ?? card.queue_position
      ?? card.queuePosition
      ?? 0,
  )
  const waiting = unique([
    ...asList(dependency.waiting_on || dependency.waitingOn),
    ...asList(dependency.blocked_by || dependency.blockedBy),
    ...asList(card.waiting_on || card.waitingOn),
  ].map(item => item?.label || item?.subject || item), 4).map(item => clean(item, '', 140)).filter(Boolean)
  const active = unique(
    asList(card.active_agents || card.activeAgents).map(item => item?.name || item?.label || item),
    4,
  ).map(item => clean(item, '', 100)).filter(Boolean)
  if (!position && !waiting.length && !active.length && phase !== 'queued') return null
  return {
    position,
    waiting,
    active,
    label: position > 0 ? `当前排在第 ${position} 位` : phase === 'queued' ? '正在等待开始' : '执行队列已更新',
    reason: waiting.length
      ? `需要先完成：${waiting.join('、')}`
      : position > 1
        ? `前面还有 ${position - 1} 个任务，完成后会自动开始。`
        : phase === 'queued'
          ? '执行资源就绪后会自动开始。'
          : active[0] || '',
  }
}

export const buildTaskIntervention = (card = {}, phase = '', context = 'task') => {
  if (!['needs_user', 'environment_blocked', 'recovery_required', 'blocked'].includes(phase)) return null
  const actions = asList(card.actions)
  const action = actions.find(item => ['confirm', 'confirm_plan', 'continue', 'retry', 'resume', 'resume_interrupted', 'provide_clarification'].includes(item?.kind))
    || actions[0]
  const reasons = unique([
    ...asList(card.blockers),
    card.user_handoff?.headline,
    card.userHandoff?.headline,
    card.status_detail,
    card.statusDetail,
  ], 4).map(item => clean(item, '', 180)).filter(Boolean)
  const next = clean(card.next_action || card.nextAction || action?.label, '请处理当前提示，完成后任务会从原进度继续。', 220)
  return {
    title: phase === 'environment_blocked'
      ? '需要补充运行条件'
      : phase === 'recovery_required'
        ? '需要确认安全恢复'
        : phase === 'blocked'
          ? '任务暂时受阻'
          : '需要你处理',
    reason: reasons[0] || '任务已暂停在需要你确认的位置。',
    action: next,
    impact: context === 'global'
      ? '处理前不会继续派发或推动下游任务，也不会错误地标记为完成；已有进展和证据会保留。'
      : '处理前不会继续修改或错误地标记为完成；已有进展和证据会保留。',
    command: action || null,
  }
}

export const buildTaskReworkOverview = (card = {}, phase = '', context = 'task') => {
  const receipt = card.receipt_rework_summary || card.receiptReworkSummary || {}
  const usage = card.usage_summary || card.usageSummary || {}
  const attempts = asList(card.work_items || card.workItems).map(item => Number(item?.attempt || 0)).filter(Number.isFinite)
  const current = Math.max(
    Number(receipt.round || receipt.current_round || receipt.currentRound || 0),
    Number(card.rework_round || card.reworkRound || 0),
    Number(usage.test_agent_rounds || usage.testAgentRounds || 0),
    ...attempts,
    phase === 'reworking' ? 1 : 0,
  )
  const failures = unique([
    ...asList(receipt.failures || receipt.failed_items || receipt.failedItems),
    ...asList(card.independent_review_summary?.failed_items || card.independentReviewSummary?.failedItems),
    ...asList(card.blockers),
  ].map(item => item?.label || item?.summary || item), 4).map(item => clean(item, '', 160)).filter(Boolean)
  if (phase !== 'reworking' && current <= 1 && !failures.length) return null
  const maxRounds = Number(receipt.max_rounds || receipt.maxRounds || card.max_rework_rounds || card.maxReworkRounds || 3)
  const selfVerification = context !== 'global' && usesMainAgentSelfVerification(card)
  return {
    current: Math.max(1, current),
    max: Math.max(1, maxRounds),
    failures,
    label: `第 ${Math.max(1, current)}/${Math.max(1, maxRounds)} 轮返工`,
    headline: failures.length
      ? `${context === 'global' ? '下游验收' : selfVerification ? '主 Agent自验' : '独立验收'}发现 ${failures.length} 项需要修复的问题，正在按失败范围返工。`
      : context === 'global'
        ? '下游主 Agent 正在根据验收缺口定向返工，完成后会重新回传验收结果。'
        : '正在根据验收缺口定向返工，完成后会重新复验。',
  }
}

export const buildTaskJourneyPresentation = (card = {}, context = 'task', phase = '') => ({
  role: buildTaskRolePresentation(context, phase, card),
  request: buildTaskRequestContract(card, context),
  sources: buildTaskSourceCoverage(card),
  queue: buildTaskQueueOverview(card, phase),
  intervention: buildTaskIntervention(card, phase, context),
  rework: buildTaskReworkOverview(card, phase, context),
})
