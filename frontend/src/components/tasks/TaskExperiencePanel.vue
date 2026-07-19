<script setup>
import { computed, ref, watch } from 'vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import { getDeliveryReport, getStreamlinedToolSummary, getStreamlinedUserText, getTechnicalDetailSections, normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingAgentText, sanitizeUserFacingPlanStructure, sanitizeUserFacingPlanText } from '../../utils/agentDisplay.js'
import {
  PRESENTATION_DELIVERY,
  PRESENTATION_PLAN,
  normalizePresentation,
  showDeliveryScaffold,
  showPlanScaffold,
} from '../../utils/resultPresentation.js'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])

const asList = (value) => Array.isArray(value) ? value.filter(Boolean) : value === undefined || value === null || value === '' ? [] : [value]
const uniq = (items) => [...new Set(asList(items).map(item => String(item || '').trim()).filter(Boolean))]
const displayValue = (value, fallback = '任务状态已整理。', max = 420) => sanitizeUserFacingPlanStructure(value, { fallback, max })
const planCopy = (value, fallback = '计划信息已整理。', max = 260) => sanitizeUserFacingPlanText(value, fallback, max)
const card = computed(() => displayValue(props.card))
const requirementEpic = computed(() => props.card.requirement_epic || props.card.requirementEpic || null)
const requirementEpicItems = computed(() => {
  const epic = requirementEpic.value
  const statusRows = asList(epic?.summary?.children)
  const statusByKey = new Map()
  const statusByTaskId = new Map()
  for (const row of statusRows) {
    const key = String(row.requirement_item_key || row.item_key || '').trim()
    const taskId = String(row.task_id || row.id || '').trim()
    if (key) statusByKey.set(key, row)
    if (taskId) statusByTaskId.set(taskId, row)
  }
  const items = asList(epic?.items).map((item) => {
    const itemKey = String(item.item_key || item.requirement_item_key || '').trim()
    const status = (itemKey && statusByKey.get(itemKey))
      || statusRows.find(row => String(row.requirement_item_key || row.item_key || '') === itemKey)
      || null
    const childId = String(
      status?.task_id
      || status?.id
      || item.child_task_id
      || item.task_id
      || ''
    ).trim()
    return {
      ...item,
      item_key: itemKey || item.item_key,
      child_task_id: childId,
      status: status?.display_status || status?.status || statusByTaskId.get(childId)?.display_status || statusByTaskId.get(childId)?.status || (props.card.intake_state === 'awaiting_confirmation' ? 'pending' : 'queued'),
      status_detail: status?.status_detail || statusByTaskId.get(childId)?.status_detail || '',
    }
  })
  const byKey = new Map(items.map(item => [String(item.item_key || ''), item]))
  return items.map(item => {
    const dependencies = asList(item.depends_on).map(key => byKey.get(String(key))).filter(Boolean)
    const failedDependencies = dependencies.filter(dependency => ['failed', 'cancelled'].includes(String(dependency.status || '')))
    const waitingDependencies = dependencies.filter(dependency => !['done', 'completed', 'passed', 'approved'].includes(String(dependency.status || '')))
    return {
      ...item,
      branch_state: failedDependencies.length ? 'blocked' : waitingDependencies.length ? 'waiting' : ['pending', 'queued'].includes(String(item.status || '')) ? 'ready' : '',
      branch_detail: failedDependencies.length
        ? `阻塞链：${failedDependencies.map(dependency => dependency.title || dependency.item_key).join('、')}`
        : waitingDependencies.length
          ? `等待链：${waitingDependencies.map(dependency => dependency.title || dependency.item_key).join('、')}`
          : ['pending', 'queued'].includes(String(item.status || ''))
            ? '当前分支可继续'
            : '',
    }
  })
})
const requirementEpicDependencyCount = computed(() => requirementEpicItems.value.reduce((total, item) => total + asList(item.depends_on).length, 0))

const resultPresentation = computed(() => normalizePresentation(props.card.presentation) || PRESENTATION_DELIVERY)
const deliveryScaffoldEnabled = computed(() => {
  if (props.card.delivery_scaffold === false || props.card.deliveryScaffold === false) return false
  if (props.card.delivery_scaffold === true || props.card.deliveryScaffold === true) return true
  const explicit = normalizePresentation(props.card.presentation)
  if (explicit) return showDeliveryScaffold(explicit)
  // 无标记时默认保留完整交付脚手架，避免误伤存量 mission 卡
  return true
})
const planScaffoldEnabled = computed(() => {
  const explicit = normalizePresentation(props.card.presentation)
  if (explicit) return showPlanScaffold(explicit)
  return true
})

const kicker = computed(() => {
  if (resultPresentation.value === PRESENTATION_PLAN && !deliveryScaffoldEnabled.value) return '执行前计划'
  return card.value.kicker || ({
    group: 'AI 编程任务',
    project: '项目执行任务',
    global: '跨项目 AI 任务',
  }[props.context] || 'AI 编程任务')
})

const agentLabel = (status) => ({
  done: '已回传结果', completed: '已回传结果', succeeded: '已回传结果',
  running: '执行中', in_progress: '执行中', reviewing: '检查中',
  pending: '等待中', queued: '等待中', blocked: '受阻',
  failed: '失败', partial: '需修复', cancelled: '已取消',
}[status] || status || '等待中')

const hasDelivery = computed(() => {
  if (!deliveryScaffoldEnabled.value) return false
  const delivery = props.card.delivery || {}
  return delivery.acceptance_passed || delivery.headline || delivery.files?.length || delivery.verification?.length || delivery.risks?.length
})

const timelineStatusLabel = (status) => ({
  done: '完成',
  active: '进行中',
  warning: '注意',
  failed: '失败',
  pending: '等待',
}[status] || '等待')

const mainAgentDecision = computed(() => props.card.mainAgentDecision || props.card.main_agent_decision || props.card.technical?.mainAgentDecision || props.card.technical?.main_agent_decision || null)
const displayStream = computed(() => props.card.display_stream || props.card.displayStream || props.card.technical?.display_stream || props.card.technical?.displayStream || null)
const workchain = computed(() => displayValue(displayStream.value?.workchain || props.card.workchain || null, '处理链路已整理。'))
const workchainTodoPlan = computed(() => displayValue(
  props.card.todo_plan
    || props.card.todoPlan
    || displayStream.value?.todo_plan
    || displayStream.value?.todoPlan
    || workchain.value?.todo_plan
    || workchain.value?.todoPlan
    || null,
  '执行计划已整理。'
))
const workchainStages = computed(() => {
  if (!deliveryScaffoldEnabled.value) return []
  return Array.isArray(workchain.value?.stages) ? workchain.value.stages.map(stage => displayValue(stage, '工作链路阶段已整理。', 220)) : []
})
const progressCheckpointSource = computed(() => {
  if (!deliveryScaffoldEnabled.value) return null
  return displayValue(props.card.progress_checkpoints || props.card.progressCheckpoints || displayStream.value?.progress_checkpoints || displayStream.value?.progressCheckpoints || workchain.value?.progress_checkpoints || workchain.value?.progressCheckpoints || null, '关键进展已整理。')
})
const progressCheckpoints = computed(() => {
  if (!deliveryScaffoldEnabled.value) return []
  const source = progressCheckpointSource.value
  const items = Array.isArray(source) ? source : Array.isArray(source?.items) ? source.items : []
  if (source?.display_policy?.hide_for_ordinary_conversation || source?.displayPolicy?.hideForOrdinaryConversation) return []
  return items.filter(item => item?.label).slice(-6).map(item => displayValue(item, '进展已整理。', 260))
})
const dispatchLaunchSummary = computed(() => displayValue(
  displayStream.value?.dispatch_launch_summary
    || displayStream.value?.dispatchLaunchSummary
    || props.card.dispatch_launch_summary
    || props.card.dispatchLaunchSummary
    || null,
  '派发信息已整理，技术细节已放入技术详情。',
  260
))
const dispatchLaunchRows = computed(() => Array.isArray(dispatchLaunchSummary.value?.rows)
  ? dispatchLaunchSummary.value.rows.map(row => ({
    ...row,
    role: planCopy(row.role || '执行成员', '执行成员', 80),
    task: row.task ? planCopy(row.task, '执行任务已整理。', 220) : row.task,
    reason: row.reason ? planCopy(row.reason, '安排原因已整理。', 180) : row.reason,
  }))
  : [])
const showArchivedDispatchLaunch = computed(() => {
  if (showMainAgentDecision.value || !dispatchLaunchRows.value.length) return false
  const policy = dispatchLaunchSummary.value?.display_policy || dispatchLaunchSummary.value?.displayPolicy || {}
  return policy.show_when_plan_archived === true || policy.showWhenPlanArchived === true
})
const workItems = computed(() => displayValue(Array.isArray(props.card.work_items || props.card.workItems) ? (props.card.work_items || props.card.workItems) : [], '执行队列已整理。'))
const workItemSummary = computed(() => displayValue(props.card.work_item_summary || props.card.workItemSummary || {}, '执行队列已整理。'))
const workItemVerificationReminder = computed(() => {
  const raw = workItemSummary.value.verification_reminder || workItemSummary.value.verificationReminder || null
  const legacyNudge = workItemSummary.value.verification_nudge === true || workItemSummary.value.verificationNudge === true
  const reminder = raw || (legacyNudge ? {
    schema: 'ccm-main-agent-work-item-verification-reminder-v1',
    status: 'needs_verification_work_item',
    title: '执行队列还缺验收',
    headline: '工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。',
    next_action: '我会补齐验收或说明无法验证的原因，再给出最终交付总结。',
  } : null)
  const policy = reminder?.display_policy || reminder?.displayPolicy || {}
  if (!reminder || policy.user_visible === false) return null
  return displayValue(reminder, '执行队列验收提醒已整理。', 260)
})
const nextClaimableWorkItems = computed(() => {
  const value = workItemSummary.value.next_claimable || workItemSummary.value.nextClaimable || []
  return Array.isArray(value) ? value.filter(Boolean).slice(0, 4) : []
})
const workItemDependencySummary = computed(() => displayValue(
  workItemSummary.value.dependency_summary || workItemSummary.value.dependencySummary || null,
  '执行队列依赖关系已整理。',
  280
))
const workItemDependencyRows = computed(() => asList(workItemDependencySummary.value?.rows).slice(0, 5))
const workItemClaimSummary = computed(() => {
  const raw = props.card.work_item_claim_summary || props.card.workItemClaimSummary || null
  const policy = raw?.display_policy || raw?.displayPolicy || {}
  if (!raw || policy.user_visible === false) return null
  return displayValue(raw, '工作项派发状态已整理。', 280)
})
const workItemUnlockSummary = computed(() => {
  const raw = props.card.work_item_unlock_summary || props.card.workItemUnlockSummary || null
  const policy = raw?.display_policy || raw?.displayPolicy || {}
  if (!raw || policy.user_visible === false) return null
  return displayValue(raw, '工作项解锁状态已整理。', 300)
})
const hasPlanModeCopy = computed(() => !!(props.card.plan_mode || props.card.planMode))
const visibleTaskGoal = computed(() => hasPlanModeCopy.value && card.value.goal ? planCopy(card.value.goal, '任务目标已整理。', 420) : card.value.goal)
const visibleTaskNextAction = computed(() => hasPlanModeCopy.value && card.value.next_action ? planCopy(card.value.next_action, '等待下一步。', 260) : card.value.next_action)
const streamlinedText = computed(() => {
  const text = getStreamlinedUserText(props.card, card.value.next_action || card.value.goal || '任务正在处理。')
  return hasPlanModeCopy.value ? planCopy(text, '任务正在处理。', 260) : text
})
const streamlinedToolSummary = computed(() => {
  const text = getStreamlinedToolSummary(props.card, card.value.completed?.join('，') || '')
  return hasPlanModeCopy.value ? planCopy(text, '本轮没有需要展示的工具调用。', 180) : text
})
const deliveryReport = computed(() => getDeliveryReport(props.card))
const deliveryReportSections = computed(() => Array.isArray(deliveryReport.value?.sections) ? deliveryReport.value.sections.filter(section => section.items?.length) : [])
const pickupSummary = computed(() => {
  if (!deliveryScaffoldEnabled.value) return null
  return displayValue(props.card.pickup_summary || props.card.pickupSummary || deliveryReport.value?.pickup_summary || deliveryReport.value?.pickupSummary || workchain.value?.completion_summary?.pickup_summary || workchain.value?.completionSummary?.pickupSummary || null, '回来继续看的摘要已整理。')
})
const pickupReviewItems = computed(() => {
  const items = pickupSummary.value?.review_items || pickupSummary.value?.reviewItems || []
  return Array.isArray(items) ? items.filter(Boolean).slice(0, 6) : []
})
const normalizeChangeFile = (item, fallback = {}) => {
  if (!item) return null
  if (typeof item === 'string') {
    const path = item.trim()
    return path ? { path, project: fallback.project || '', agent: fallback.agent || fallback.project || '', statusText: '变更', statusColor: '#64748b' } : null
  }
  const path = String(item.path || item.file || item.name || '').trim()
  if (!path) return null
  return {
    ...item,
    path,
    project: item.project || item.target_project || item.projectName || item.agent || fallback.project || '',
    agent: item.agent || item.project || item.target_project || fallback.agent || item.project || fallback.project || '',
    statusText: item.statusText || item.status_label || item.status || '变更',
    statusColor: item.statusColor || item.status_color || '#64748b',
    additions: Number(item.additions || item.diff?.additions || 0),
    deletions: Number(item.deletions || item.diff?.deletions || 0),
    diff: item.diff || ((item.additions || item.deletions) ? { additions: Number(item.additions || 0), deletions: Number(item.deletions || 0), available: false } : null),
  }
}
const changeFileKey = (file) => String(file?.path || '').trim().replace(/\\/g, '/').toLowerCase()
const isGenericChangeOwner = (value) => {
  const text = String(value || '').trim().toLowerCase()
  return !text || ['项目', 'project', 'agent', 'default'].includes(text)
}
const pickChangeOwner = (current, incoming) => {
  const currentText = String(current || '').trim()
  const incomingText = String(incoming || '').trim()
  if (isGenericChangeOwner(currentText) && !isGenericChangeOwner(incomingText)) return incomingText
  return currentText || incomingText
}
const mergeChangeFile = (current, incoming) => ({
  ...current,
  ...incoming,
  path: current.path || incoming.path,
  project: pickChangeOwner(current.project, incoming.project),
  agent: pickChangeOwner(current.agent, incoming.agent || incoming.project),
  statusText: incoming.statusText || current.statusText,
  statusColor: incoming.statusColor || current.statusColor,
  additions: Math.max(Number(current.additions || 0), Number(incoming.additions || 0)),
  deletions: Math.max(Number(current.deletions || 0), Number(incoming.deletions || 0)),
  diff: incoming.diff || current.diff || null,
})
const providedChangeSummary = computed(() => displayValue(props.card.change_summary || props.card.changeSummary || props.card.technical?.change_summary || props.card.technical?.changeSummary || null, '改动摘要已整理。'))
const changeFiles = computed(() => {
  const files = [
    ...asList(providedChangeSummary.value?.files),
    ...asList(props.card.delivery?.changes),
    ...asList(props.card.delivery?.files),
    ...asList(deliveryReport.value?.files),
    ...workItems.value.flatMap(item => asList(item.filesChanged || item.files_changed || item.files).map(file => ({ ...(typeof file === 'string' ? { path: file } : file), project: item.target || item.owner || '', agent: item.owner || item.target || '' }))),
  ]
  const byPath = new Map()
  files.map(item => normalizeChangeFile(item)).filter(Boolean).forEach(file => {
    const key = changeFileKey(file)
    if (!key) return
    byPath.set(key, byPath.has(key) ? mergeChangeFile(byPath.get(key), file) : file)
  })
  return [...byPath.values()].slice(0, 40)
})
const changeSummary = computed(() => {
  if (providedChangeSummary.value) return providedChangeSummary.value
  if (!changeFiles.value.length) return null
  const agents = [...new Set(changeFiles.value.map(file => file.agent || file.project).filter(Boolean))]
  return {
    schema: 'ccm-main-agent-change-summary-v1',
    title: '改动明细',
    status: 'ready',
    status_label: `${changeFiles.value.length} 个文件`,
    headline: agents.length ? `${agents.length} 个执行成员/项目产生了 ${changeFiles.value.length} 个文件改动。` : `本轮捕获到 ${changeFiles.value.length} 个文件改动。`,
    file_count: changeFiles.value.length,
    additions: changeFiles.value.reduce((sum, file) => sum + Number(file.additions || file.diff?.additions || 0), 0),
    deletions: changeFiles.value.reduce((sum, file) => sum + Number(file.deletions || file.diff?.deletions || 0), 0),
    files: changeFiles.value,
    next_action: '可以点开查看具体文件 diff；原始执行记录仍在技术详情里。',
  }
})
const topChangeFiles = computed(() => changeFiles.value.slice(0, 8))
const isTerminalPhase = computed(() => ['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled'].includes(String(props.card.phase || props.card.status || '').toLowerCase()))
const completionOverview = computed(() => {
  if (!deliveryScaffoldEnabled.value) return null
  const report = deliveryReport.value || {}
  const provided = props.card.completion_card || props.card.completionCard || report.completion_card || report.completionCard || null
  if (provided) return displayValue(provided, '最终交付总览已整理。')
  if (!isTerminalPhase.value || !deliveryReport.value) return null
  const sectionItems = (id, title) => deliveryReportSections.value
    .find(section => section.id === id || section.title === title)?.items || []
  const files = asList(report.files || props.card.delivery?.files)
  const verification = asList(report.verification || props.card.delivery?.verification)
  const acceptance = asList(report.acceptance || props.card.delivery?.acceptance || sectionItems('acceptance', '验收结论'))
  const risks = asList(report.risks || props.card.delivery?.risks)
  const status = report.status || props.card.phase || props.card.status || ''
  const failed = ['failed', 'error'].includes(String(status).toLowerCase())
  const cancelled = ['cancelled', 'canceled'].includes(String(status).toLowerCase())
  return {
    schema: 'ccm-main-agent-completion-card-v1',
    title: failed ? '未完成总览' : cancelled ? '停止总览' : '最终交付总览',
    status,
    status_label: report.status_label || props.card.phase_label || '已整理',
    headline: report.headline || props.card.delivery?.headline || streamlinedText.value,
    metrics: [
      { id: 'status', label: '状态', value: report.status_label || props.card.phase_label || '已整理' },
      { id: 'scope', label: '涉及范围', value: files.length ? `${files.length} 个文件` : '未检测到文件变更' },
      { id: 'verification', label: '验证', value: verification.length ? `${verification.length} 项` : '暂无系统捕获' },
      { id: 'acceptance', label: '验收', value: acceptance.some(item => /未通过|待处理|缺口/.test(item)) ? '未通过' : acceptance.some(item => /已通过|已完成|已对齐/.test(item)) ? '已通过' : cancelled ? '已停止' : '待复核' },
      { id: 'risk', label: failed ? '未完成原因' : cancelled ? '停止原因' : '风险', value: risks.length ? `${risks.length} 项` : cancelled ? '已停止' : '暂无需要额外关注的风险' },
    ],
    highlights: sectionItems('completed', failed ? '处理结果' : cancelled ? '停止说明' : '完成内容').slice(0, 4),
    verification: verification.length ? verification.slice(0, 4) : sectionItems('verification', '验证结果').slice(0, 4),
    acceptance: acceptance.slice(0, 4),
    risks: risks.length ? risks.slice(0, 4) : sectionItems('risks', failed ? '未完成原因' : cancelled ? '停止原因' : '风险与待确认').slice(0, 4),
    next_action: asList(report.next_action || report.nextAction || props.card.next_action)[0] || '',
    technical_hint: report.technical_hint || report.pickup_summary?.technical_hint || '底层执行记录和排障信息默认收在技术详情里。',
  }
})
const completionOverviewMetrics = computed(() => Array.isArray(completionOverview.value?.metrics) ? completionOverview.value.metrics.filter(item => item?.label).slice(0, 5) : [])
const completionOverviewHighlights = computed(() => asList(completionOverview.value?.highlights).slice(0, 4))
const completionOverviewVerification = computed(() => asList(completionOverview.value?.verification).slice(0, 4))
const completionOverviewAcceptance = computed(() => asList(completionOverview.value?.acceptance).slice(0, 4))
const completionOverviewRisks = computed(() => asList(completionOverview.value?.risks).slice(0, 4))
const testAgentExecutionPlanSource = computed(() => (
  props.card.test_agent_execution_plan
    || props.card.testAgentExecutionPlan
    || props.card.technical?.test_agent_execution_plan
    || props.card.technical?.testAgentExecutionPlan
    || displayStream.value?.test_agent_execution_plan
    || displayStream.value?.testAgentExecutionPlan
    || null
))
const testAgentExecutionPlanSummary = computed(() => displayValue(
  normalizeTestAgentExecutionPlanSummary(
    testAgentExecutionPlanSource.value,
    props.card.test_agent_execution_plan_summary
      || props.card.testAgentExecutionPlanSummary
      || displayStream.value?.test_agent_execution_plan_summary
      || displayStream.value?.testAgentExecutionPlanSummary
      || null,
    props.card.test_agent_execution_plan_detail || props.card.testAgentExecutionPlanDetail || ''
  ),
  'TestAgent 复核计划已整理。'
))
const testAgentExecutionPlanRows = computed(() => asList(testAgentExecutionPlanSummary.value?.rows).slice(0, 6))
const testAgentExecutionPlanIssues = computed(() => asList(testAgentExecutionPlanSummary.value?.issues).slice(0, 4))
const visibleReviewText = (value, fallback = '复核证据已整理，技术细节已放入技术详情。') => {
  const raw = typeof value === 'object'
    ? value?.label || value?.summary || value?.detail || value?.message || value?.reason || value?.verdict || value?.status || ''
    : value
  return sanitizeUserFacingAgentText(raw, fallback, 260)
    .replace(/\bpassed\b|\bpass\b/gi, '已通过')
    .replace(/\bfailed\b|\bfail\b/gi, '未通过')
    .replace(/\bblocked\b/gi, '受阻')
    .replace(/\baccept(?:ed)?\b/gi, '可以接受')
    .replace(/\bneeds\s*rework\b/gi, '需要返工')
    .replace(/\bverdict\b/gi, '复核裁决')
}
const deliveryIndependentReviewSectionItems = computed(() => {
  const section = deliveryReportSections.value.find(item => item.id === 'independent_review' || item.title === '复核结论')
  return asList(section?.items)
})
const independentReviewSummary = computed(() => {
  const provided = props.card.independent_review_summary || props.card.independentReviewSummary || deliveryReport.value?.independent_review_summary || deliveryReport.value?.independentReviewSummary || null
  if (provided) return displayValue(provided, '独立复核结论已整理。')
  // Prefer structured backend gate only — do not infer status from Chinese keyword heuristics.
  const summary = workchain.value?.completion_summary || workchain.value?.completionSummary || {}
  const gate = displayValue(
    deliveryReport.value?.independent_review_gate
      || deliveryReport.value?.independentReviewGate
      || summary.independent_review_gate
      || summary.independentReviewGate
      || null,
    '独立复核状态已整理。'
  )
  const rows = uniq([
    ...asList(props.card.independent_review || props.card.independentReview),
    ...asList(deliveryReport.value?.independent_review || deliveryReport.value?.independentReview),
    ...deliveryIndependentReviewSectionItems.value,
    ...asList(summary.independent_review || summary.independentReview),
    ...asList(summary.independent_review_evidence || summary.independentReviewEvidence),
    ...asList(gate?.evidence),
  ].map(item => visibleReviewText(item)).filter(Boolean)).slice(0, 7)
  const hasGateSignal = gate && (gate.required !== undefined || gate.pass !== undefined || gate.passed !== undefined || gate.status || gate.reason)
  if (!rows.length && !hasGateSignal) return null
  const gateStatus = String(gate?.status || '').toLowerCase()
  const status = gate?.pass === true || gate?.passed === true || gateStatus === 'passed'
    ? 'passed'
    : gateStatus === 'failed' || gateStatus === 'needs_rework'
      ? 'needs_rework'
      : gateStatus === 'needs_recheck'
        ? 'needs_recheck'
        : gateStatus === 'needs_environment'
          ? 'needs_environment'
        : gateStatus === 'needs_user' || gateStatus === 'blocked' || gateStatus === 'partial'
          ? 'needs_user'
          : 'recorded'
  return {
    schema: 'ccm-main-agent-independent-review-summary-v1',
    title: '独立复核',
    status,
    status_label: ({ passed: '已通过', needs_rework: '需返工', needs_recheck: '需复验', needs_environment: '补条件', needs_user: '等你确认', recorded: '已记录' })[status],
    headline: status === 'passed'
      ? 'TestAgent/独立复核已检查交付证据，我可以继续做最终验收。'
      : status === 'needs_rework'
        ? '独立复核发现未通过项，我会先安排返工，再重新验收。'
        : status === 'needs_recheck'
          ? '独立复核还没有闭环，我会先补齐证据并重新复验。'
        : status === 'needs_environment'
          ? '独立复核受环境或登录条件阻塞，我会先补齐条件再继续验收。'
        : status === 'needs_user'
          ? '独立复核需要人工确认，我会先暂停最终验收。'
          : '独立复核证据已记录，我会纳入最终判断。',
    rows: rows.length ? rows : [visibleReviewText(gate?.reason || gate?.status_label || gate?.status, '复核状态已记录。')],
    next_action: status === 'passed'
      ? '继续核对交付总结、改动和验证结果。'
      : status === 'needs_rework'
        ? '先处理复核指出的缺口，再重新执行验收。'
        : status === 'needs_recheck'
          ? '补齐复核证据后重新运行 TestAgent。'
        : status === 'needs_environment'
          ? '先补齐环境、登录或运行条件，再继续 TestAgent 复核。'
        : status === 'needs_user'
          ? '等待你确认复核标记的问题。'
          : '继续等待完整复核证据或最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
})
const prioritizeIndependentReviewRows = (value, limit = 16) => {
  const rows = asList(value)
  if (rows.length <= limit) return rows
  const priorityPatterns = [
    /TestAgent[：:]|独立复核[：:]/i,
    /登录态浏览器验收|测试账号|登录条件/i,
    /操作结果验证|没有产生可见效果|暂时无法确认.*效果/i,
    /浏览器会话恢复|没有自动重试|重新建立会话/i,
    /边界与异常验证|边界检查|TestAgent 工作单/i,
    /多人协作浏览器验收|跨会话/i,
    /场景.*(?:未通过|受阻|未执行)|(?:发送方|接收方|操作方|观察方).*未通过/i,
    /真实浏览器验收|浏览器验收流程/i,
    /流程.*(?:未通过|受阻|未执行)/i,
    /返工后.*(?:TestAgent|复核)|重新运行\s*TestAgent/i,
    /交回|带回.*返工|原实现成员.*返工/i,
    /验收条件.*(?:未通过|待确认)|必检项.*(?:未覆盖|待确认)/i,
  ]
  const selected = []
  const add = (item) => {
    if (item && !selected.includes(item)) selected.push(item)
  }
  priorityPatterns.forEach(pattern => rows.filter(item => pattern.test(String(item || ''))).forEach(add))
  rows.forEach(add)
  return selected.slice(0, limit)
}
const independentReviewRows = computed(() => prioritizeIndependentReviewRows(independentReviewSummary.value?.rows))
const postReviewSpotCheckSummary = computed(() => {
  const completion = workchain.value?.completion_summary || workchain.value?.completionSummary || {}
  const raw = props.card.post_review_spot_check_summary
    || props.card.postReviewSpotCheckSummary
    || deliveryReport.value?.post_review_spot_check_summary
    || deliveryReport.value?.postReviewSpotCheckSummary
    || completion.post_review_spot_check_summary
    || completion.postReviewSpotCheckSummary
    || null
  if (!raw) return null
  const normalized = displayValue(raw, '完成前抽查状态已整理。')
  const statusText = String(normalized.status || '').toLowerCase()
  const status = statusText === 'passed'
    ? 'passed'
    : statusText === 'needs_user'
      ? 'needs_user'
      : statusText === 'needs_recheck' || statusText === 'needs_rework'
        ? 'needs_recheck'
        : 'recorded'
  const rows = uniq(asList(normalized.rows)
    .map(item => visibleReviewText(item, '抽查状态已整理。'))
    .filter(Boolean))
    .slice(0, 5)
  return {
    ...normalized,
    title: normalized.title || '完成前抽查',
    status,
    status_label: normalized.status_label || ({ passed: '已通过', needs_recheck: '需复验', needs_user: '待确认', recorded: '已记录' })[status],
    headline: visibleReviewText(normalized.headline, status === 'passed'
      ? '我已抽查关键验证，结果与 TestAgent 结论一致。'
      : '我的完成前抽查还没有通过。'),
    rows,
    next_action: visibleReviewText(normalized.next_action || normalized.nextAction, status === 'passed'
      ? '继续完成最终验收。'
      : '重新运行 TestAgent 并再次抽查关键验证。'),
  }
})
const postReviewSpotCheckRows = computed(() => asList(postReviewSpotCheckSummary.value?.rows).slice(0, 5))
const qualityFollowup = computed(() => {
  if (!deliveryScaffoldEnabled.value) return null
  const summary = workchain.value?.completion_summary || workchain.value?.completionSummary || displayStream.value?.completion_summary || displayStream.value?.completionSummary || props.card.completion_summary || props.card.completionSummary || {}
  const raw = props.card.quality_followup
    || props.card.qualityFollowup
    || deliveryReport.value?.quality_followup
    || deliveryReport.value?.qualityFollowup
    || summary.quality_followup
    || summary.qualityFollowup
    || null
  const policy = raw?.display_policy || raw?.displayPolicy || {}
  const mode = String(workchain.value?.mode || displayStream.value?.workchain?.mode || props.card.mode || '').toLowerCase()
  if (!raw || policy.user_visible === false) return null
  if (['conversation', 'ordinary', 'chat', 'question', 'analysis'].includes(mode) && policy.show_for_ordinary_conversation !== true && policy.showForOrdinaryConversation !== true) return null
  const normalized = displayValue(raw, '交付总结还需补齐。', 320)
  const missing = asList(normalized.missing || normalized.required_missing || normalized.requiredMissing || normalized.gaps)
    .map(item => planCopy(typeof item === 'string' ? item : item?.label || item?.title || item?.reason || item?.name || '', '缺少一项交付总结内容。', 140))
    .filter(Boolean)
    .slice(0, 6)
  const evidence = asList(normalized.evidence || normalized.available_evidence || normalized.availableEvidence || normalized.context)
    .map(item => planCopy(typeof item === 'string' ? item : item?.label || item?.summary || item?.detail || item?.value || '', '已有线索已整理。', 160))
    .filter(Boolean)
    .slice(0, 4)
  const nextAction = planCopy(normalized.next_action || normalized.nextAction || '我会先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', '我会先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', 260)
  if (!missing.length && !normalized.headline && !nextAction) return null
  return {
    ...normalized,
    title: planCopy(normalized.title || '交付总结还需补齐', '交付总结还需补齐', 80),
    status: normalized.status || 'needs_attention',
    status_label: normalized.status_label || normalized.statusLabel || '需补齐',
    headline: planCopy(normalized.headline || '这轮任务已经有处理结果，但最终交付总结还缺少可验收的信息。', '交付总结还需补齐。', 260),
    missing,
    evidence,
    next_action: nextAction,
  }
})
const qualityFollowupMissing = computed(() => asList(qualityFollowup.value?.missing).slice(0, 6))
const qualityFollowupEvidence = computed(() => asList(qualityFollowup.value?.evidence).slice(0, 4))
const qualityFollowupAction = computed(() => {
  if (!qualityFollowup.value) return null
  const missing = qualityFollowupMissing.value.length ? `：${qualityFollowupMissing.value.join('、')}` : ''
  return {
    id: 'quality_followup_continue',
    kind: 'continue',
    label: '继续补齐总结',
    tone: 'primary',
    source: 'quality_followup',
    message: qualityFollowup.value.next_action || qualityFollowup.value.nextAction || `请继续补齐最终交付总结${missing}，补齐后再给出最终交付总结。`,
  }
})
const hasFinalSummary = computed(() => isTerminalPhase.value && (deliveryReport.value || pickupSummary.value || hasDelivery.value))
const showMainAgentDecision = computed(() => !!mainAgentDecision.value && !hasFinalSummary.value && !planMode.value)
const shouldArchiveCompletedTodoPlan = (plan) => {
  const policy = {
    ...(plan?.display || {}),
    ...(plan?.display_policy || plan?.displayPolicy || {}),
  }
  const archiveCompleted = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false
  const hasVerificationNudge = plan?.verification_nudge === true
    || plan?.verificationNudge === true
    || Boolean(plan?.verification_reminder || plan?.verificationReminder)
  const steps = Array.isArray(plan?.steps) ? plan.steps : []
  return archiveCompleted
    && !hasVerificationNudge
    && steps.length > 0
    && steps.every(step => ['completed', 'skipped', 'cancelled'].includes(String(step?.status || '').toLowerCase()))
}
const workchainTodoDecision = computed(() => {
  if (mainAgentDecision.value || (hasFinalSummary.value && !qualityFollowup.value) || planMode.value) return null
  const plan = workchainTodoPlan.value
  const policy = plan?.display_policy || plan?.displayPolicy || {}
  if (!plan || !Array.isArray(plan.steps) || !plan.steps.length) return null
  if (policy.user_visible === false || policy.hide_for_ordinary_conversation === true || policy.hideForOrdinaryConversation === true) return null
  if (shouldArchiveCompletedTodoPlan(plan)) return null
  const goalRevisionTodo = plan.source === 'global-supervision-steering'
    || plan.steps.some(step => ['replan_supervised_mission', 'interrupt_previous_run'].includes(String(step?.id || '')))
  return {
    version: 2,
    mode: goalRevisionTodo ? 'goal_revision' : workchain.value?.mode || props.card.mode || (props.context === 'global' ? 'delegation' : 'project_task'),
    decision: {
      selected_actions: [],
      dispatch_policy: {
        action: 'track_workchain_todo',
        reason: goalRevisionTodo ? '旧执行已停止，正在按新目标重新规划。' : '我正在按计划推进任务。',
        nextStep: plan.next_action || plan.nextAction || '继续推进当前计划并等待验收结果。',
      },
    },
    display_stream: displayStream.value ? { ...displayStream.value, todo_plan: plan, todoPlan: plan } : { todo_plan: plan, todoPlan: plan, workchain: workchain.value },
    todo_plan: plan,
    todoPlan: plan,
    user_plan_steps: plan.steps,
    verify: { passed: false, conclusion: plan.current_step?.content || plan.currentStep?.content || '我正在推进计划。' },
  }
})
const showWorkchainTodoDecision = computed(() => !!workchainTodoDecision.value)
const archivedMainAgentDecision = computed(() => mainAgentDecision.value && hasFinalSummary.value ? mainAgentDecision.value : null)
const archivedDecisionActions = computed(() => {
  const actions = archivedMainAgentDecision.value?.decision?.selected_actions || archivedMainAgentDecision.value?.selected_actions || []
  return Array.isArray(actions) ? actions.filter(Boolean).slice(0, 6).join('、') : ''
})
const technicalSections = computed(() => getTechnicalDetailSections(props.card, props.card.technical || {}))
const planMode = computed(() => {
  if (!planScaffoldEnabled.value) return null
  return displayValue(props.card.plan_mode || props.card.planMode || null, '执行前计划已整理。')
})
const planModeSteps = computed(() => {
  const steps = planMode.value?.steps || planMode.value?.plan_steps || planMode.value?.planSteps || []
  return Array.isArray(steps)
    ? steps
      .filter(item => item?.label || item?.content || typeof item === 'string')
      .slice(0, 8)
      .map(step => {
        if (typeof step === 'string') return planCopy(step, '计划步骤已整理。', 180)
        const activeForm = step.activeForm || step.active_form || ''
        return {
          ...step,
          label: step.label ? planCopy(step.label, '计划步骤已整理。', 180) : step.label,
          content: step.content ? planCopy(step.content, '计划步骤已整理。', 180) : step.content,
          detail: step.detail ? planCopy(step.detail, '步骤说明已整理。', 220) : step.detail,
          activeForm: activeForm ? planCopy(activeForm, '当前动作已整理。', 180) : activeForm,
          active_form: activeForm ? planCopy(activeForm, '当前动作已整理。', 180) : step.active_form,
        }
      })
    : []
})
const planRiskSummary = computed(() => planMode.value?.risk?.summary ? planCopy(planMode.value.risk.summary, '', 220) : '')
const planAcceptanceItems = computed(() => asList(planMode.value?.acceptance).map(item => planCopy(item, '验收标准已整理。', 260)).slice(0, 8))
const planPermissionBoundaries = computed(() => asList(planMode.value?.permission_boundaries).map(item => planCopy(item, '执行边界已整理。', 260)).slice(0, 8))
const planAcceptFeedback = ref('')
const planAcceptFeedbackId = computed(() => `plan-accept-feedback-${props.card.task_id || props.card.id || 'task'}`)
const isPlanConfirmAction = (action) => action?.kind === 'confirm_plan' || (props.context === 'global' && action?.kind === 'confirm')
const hasPlanConfirmAction = computed(() => !!planMode.value && props.card.phase === 'needs_user' && asList(props.card.actions).some(isPlanConfirmAction))
const planApprovalRequest = computed(() => {
  const plan = planMode.value
  if (!plan || hasFinalSummary.value) return null
  const statusText = String(plan.confirmation_status || plan.confirmationStatus || props.card.status || props.card.phase || '').toLowerCase()
  const needsConfirmation = plan.requires_confirmation === true
    || hasPlanConfirmAction.value
    || /await|waiting|pending|confirm|确认|授权/.test(statusText)
  const alreadyConfirmed = plan.auto_continue === true
    || plan.requires_confirmation === false
    || /confirmed|accepted|auto_continue/.test(statusText)
    || plan.accepted_at
    || plan.confirmed_at
  if (!needsConfirmation || alreadyConfirmed) return null
  const pendingSteps = asList(plan.steps || plan.plan_steps || plan.planSteps)
    .filter(step => !['completed', 'done'].includes(String(step?.status || '').toLowerCase()))
    .map(step => planCopy(step?.label || step?.content || step, '后续步骤已整理。', 160))
    .filter(Boolean)
    .slice(0, 3)
  const permissionBoundaries = asList(plan.permission_boundaries).map(item => planCopy(item, '执行边界已整理。', 180)).slice(0, 2)
  return displayValue({
    schema: 'ccm-main-agent-plan-approval-request-v1',
    title: '等待你确认计划',
    status: 'waiting_confirmation',
    status_label: '待确认',
    headline: '确认后我才会按这份计划开始执行；确认前不会写入文件、安排执行成员或做高风险操作。',
    rows: [
      pendingSteps.length ? `确认后继续：${pendingSteps.join('；')}` : '确认后我会进入执行链路。',
      permissionBoundaries.length ? `执行边界：${permissionBoundaries.join('；')}` : '执行边界会按计划和当前授权范围控制。',
      '执行过程中会跟踪执行成员结果、文件改动和验证证据。',
      '最终总结前会逐项核对验收标准；技术记录默认放在技术详情里。',
    ],
    feedback_hint: hasPlanConfirmAction.value
      ? '你可以在下方补充要求；确认时会一起带入执行计划。'
      : '确认后我会继续执行，并在完成后给出结果总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }, '计划确认请求已整理。', 360)
})
const planApprovalRows = computed(() => asList(planApprovalRequest.value?.rows).slice(0, 5))
const planExecutionFollowup = computed(() => {
  if (!planMode.value || hasFinalSummary.value || hasPlanConfirmAction.value || props.card.phase === 'needs_user') return null
  const raw = planMode.value.plan_execution_followup
    || planMode.value.planExecutionFollowup
    || props.card.plan_execution_followup
    || props.card.planExecutionFollowup
    || null
  const statusText = String(planMode.value.confirmation_status || planMode.value.confirmationStatus || planMode.value.revision_status || planMode.value.revisionStatus || '').toLowerCase()
  const confirmed = /confirmed|accepted|auto_continue|confirmed_after_revision/.test(statusText)
    || planMode.value.accepted_at
    || planMode.value.confirmed_at
    || (planMode.value.auto_continue === true && planMode.value.requires_confirmation === false)
  const reminder = raw || (confirmed ? {
    schema: 'ccm-main-agent-plan-execution-followup-v1',
    status: 'confirmed_tracking',
    title: '计划已确认，正在按计划执行',
    headline: '我会按这份计划推进执行，并在最终总结前逐项核对验收标准。',
    next_action: '等待执行成员结果说明、文件改动和验证证据；如有偏离，我会先返工再总结。',
  } : null)
  const policy = reminder?.display_policy || reminder?.displayPolicy || {}
  if (!reminder || policy.user_visible === false) return null
  const visible = displayValue(reminder, '计划执行跟进已整理。', 280)
  return {
    ...visible,
    title: visible.title ? planCopy(visible.title, '计划已确认，正在按计划执行', 180) : visible.title,
    headline: visible.headline ? planCopy(visible.headline, '我会按这份计划推进执行。', 280) : visible.headline,
    next_action: visible.next_action ? planCopy(visible.next_action, '等待执行结果和验证证据。', 280) : visible.next_action,
    nextAction: visible.nextAction ? planCopy(visible.nextAction, '等待执行结果和验证证据。', 280) : visible.nextAction,
  }
})
const workOrderPreview = computed(() => {
  const raw = displayValue(props.card.work_order_preview || props.card.workOrderPreview || null, '执行成员任务已整理。')
  if (!raw) return raw
  return {
    ...raw,
    title: raw.title ? planCopy(raw.title, '执行成员任务', 180) : raw.title,
    summary: raw.summary ? planCopy(raw.summary, '执行安排已整理。', 260) : raw.summary,
    orders: asList(raw.orders).map(order => ({
      ...order,
      title: order.title ? planCopy(order.title, '执行任务', 180) : order.title,
      objective: order.objective ? planCopy(order.objective, '执行目标已整理。', 260) : order.objective,
      allowed_scope: asList(order.allowed_scope).map(item => planCopy(item, '允许范围已整理。', 180)),
      forbidden_scope: asList(order.forbidden_scope).map(item => planCopy(item, '禁止事项已整理。', 180)),
      acceptance: asList(order.acceptance).map(item => planCopy(item, '验收标准已整理。', 180)),
    })),
  }
})
const executionStory = computed(() => displayValue(props.card.execution_story || props.card.executionStory || null, '执行过程已整理。'))
const acceptanceReview = computed(() => displayValue(props.card.acceptance_review || props.card.acceptanceReview || null, '最终验收已整理。'))
const completionReadinessSummary = computed(() => {
  const provided = props.card.completion_readiness_summary || props.card.completionReadinessSummary || null
  if (provided) return displayValue(provided, '完成前收尾状态已整理。', 320)
  const nearCompletion = ['reviewing', 'needs_user', 'blocked', 'completed'].includes(String(card.value.phase || ''))
  const unresolved = workItems.value.filter(item => !['completed', 'done'].includes(String(item?.status || '')))
  if (!nearCompletion || !workItems.value.length) return null
  return displayValue({
    schema: 'ccm-main-agent-completion-readiness-v1',
    title: '完成前收尾',
    status: unresolved.length ? 'blocked' : 'ready',
    status_label: unresolved.length ? '尚未收尾' : '可以总结',
    headline: unresolved.length
      ? `还有 ${unresolved.length} 个工作项未完成，我不会提前宣布完成。`
      : '执行队列已经收尾，可以进入最终验收与总结。',
    rows: unresolved.slice(0, 8).map(item => ({
      target: item.target || item.owner || '执行成员',
      subject: item.subject || item.description || '未完成工作项',
      status: item.status || 'pending',
      status_label: workItemStatusLabel(item.status),
    })),
    next_action: unresolved.length ? '先完成或处理这些工作项；全部收敛后再做最终总结。' : '继续核对验收证据并整理最终总结。',
  }, '完成前收尾状态已整理。', 320)
})
const completionReadinessRows = computed(() => asList(completionReadinessSummary.value?.rows).slice(0, 8))
const planAlignment = computed(() => displayValue(props.card.plan_alignment || props.card.planAlignment || props.card.technical?.plan_alignment || props.card.technical?.planAlignment || null, '计划执行核对已整理。'))
const planAlignmentChecks = computed(() => Array.isArray(planAlignment.value?.checks) ? planAlignment.value.checks.filter(item => item?.label).slice(0, 8) : [])
const planAlignmentDeviations = computed(() => Array.isArray(planAlignment.value?.deviations) ? planAlignment.value.deviations.filter(item => item?.label).slice(0, 5) : [])
const userHandoff = computed(() => displayValue(props.card.user_handoff || props.card.userHandoff || props.card.technical?.user_handoff || props.card.technical?.userHandoff || null, '接下来建议已整理。'))
const userHandoffEvidence = computed(() => asList(userHandoff.value?.evidence).slice(0, 6))
const userHandoffUnresolved = computed(() => asList(userHandoff.value?.unresolved).slice(0, 5))
const userHandoffSecondaryActions = computed(() => asList(userHandoff.value?.secondary_actions || userHandoff.value?.secondaryActions).filter(item => item?.label).slice(0, 3))
const userHandoffSummaryCards = computed(() => asList(userHandoff.value?.summary_cards || userHandoff.value?.summaryCards).filter(item => item?.label || item?.value).slice(0, 4))
const userRequestSummarySource = computed(() => props.card.user_request_summary || props.card.userRequestSummary || props.card.clarification_summary || props.card.clarificationSummary || props.card.confirmation_summary || props.card.confirmationSummary || null)
const taskUserActionText = (summary = {}) => [
  summary.headline,
  summary.question,
  summary.action,
  summary.target,
  summary.reason,
  summary.next_action,
  summary.nextAction,
  ...asList(summary.answer_suggestions || summary.answerSuggestions),
].map(item => String(item || '').trim()).filter(Boolean).join('\n')
const taskUserRequestNeedsAction = (raw = {}, visible = {}) => {
  const policy = raw?.display_policy || raw?.displayPolicy || visible?.display_policy || visible?.displayPolicy || {}
  if (policy.user_visible === false || policy.userVisible === false) return false
  if (policy.requires_user_action === true || policy.requiresUserAction === true || policy.user_action_required === true || policy.userActionRequired === true) return true
  if (policy.requires_user_action === false || policy.requiresUserAction === false || policy.user_action_required === false || policy.userActionRequired === false) return false
  const schema = String(raw.schema || visible.schema || '').toLowerCase()
  const kind = String(raw.kind || visible.kind || '').toLowerCase()
  if (/confirmation|clarification|user_request|user-action|human/.test(`${schema}\n${kind}`)) return true
  const status = String(raw.status || visible.status || raw.phase || visible.phase || '').toLowerCase()
  const text = taskUserActionText({ ...raw, ...visible })
  const userActionPattern = /(?:需要你|等你|等待你|请你|请确认|确认(?:是否|计划|范围|授权|影响|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|选择|授权|回复|上传|输入|填写|人工确认|待确认问答|是否允许|是否继续|允许继续|确认并继续)/i
  if (userActionPattern.test(text)) return true
  const hasUserQuestion = Boolean(raw.question || visible.question) && /[?？]|是否|哪一|哪个|什么|如何|要不要|能否|可否/.test(text)
  if (hasUserQuestion && /needs_user|waiting_user|waiting_confirmation|waiting_clarification|manual_takeover|paused/.test(status)) return true
  return false
}
const userRequestSummary = computed(() => {
  const raw = userRequestSummarySource.value
  if (!raw) return null
  const visible = displayValue(raw, '我正在等待你补充信息或确认操作。')
  return taskUserRequestNeedsAction(raw, visible) ? visible : null
})
const userRequestSuggestions = computed(() => asList(userRequestSummary.value?.answer_suggestions || userRequestSummary.value?.answerSuggestions).slice(0, 4))
const agentCoordination = computed(() => displayValue(props.card.agent_coordination || props.card.agentCoordination || null, '协作状态已整理。'))
const buildChildPlanReviewFromAck = (ackReview = null) => {
  const rows = Array.isArray(ackReview?.rows) ? ackReview.rows : []
  if (!rows.length) return null
  const normalizedRows = rows.slice(0, 8).map((row) => {
    const rawStatus = String(row?.status || '').toLowerCase()
    const status = rawStatus === 'approved' ? 'approved' : rawStatus === 'waiting' ? 'waiting' : ['missing', 'weak', 'needs_rewrite'].includes(rawStatus) ? 'needs_revision' : (rawStatus || 'waiting')
    return {
      agent: row?.agent || row?.project || '执行成员',
      status,
      status_label: status === 'approved' ? '计划清晰' : status === 'waiting' ? '等待计划' : '需调整',
      understood_goal: row?.understood_goal || row?.understoodGoal || '',
      planned_scope: asList(row?.planned_scope || row?.plannedScope).slice(0, 5),
      verification_plan: asList(row?.verification_plan || row?.verificationPlan).slice(0, 5),
      unclear: asList(row?.unclear).slice(0, 4),
      reason: row?.reason || (status === 'approved' ? '目标、范围和验证安排清晰' : status === 'waiting' ? '等待执行成员提交接单计划' : '执行计划需要补齐目标、范围或验证安排'),
    }
  })
  const needsRevisionCount = normalizedRows.filter(row => row.status === 'needs_revision').length
  const waitingCount = normalizedRows.filter(row => row.status === 'waiting').length
  const status = needsRevisionCount ? 'needs_revision' : waitingCount ? 'waiting' : 'approved'
  return {
    schema: 'ccm-child-agent-plan-review-v1',
    title: '执行成员接单计划',
    status,
    status_label: status === 'approved' ? '已通过' : status === 'waiting' ? '等待提交' : '需调整',
    headline: status === 'approved'
      ? '我已检查执行成员的接单计划，目标、范围和验证安排清晰。'
      : status === 'waiting'
        ? '正在等待执行成员提交接单计划；收到后我会先检查再让其继续执行。'
        : `${needsRevisionCount} 个执行成员的执行计划还不够清楚，我会先要求补齐目标、范围或验证安排。`,
    rows: normalizedRows,
    next_action: status === 'approved' ? '继续跟踪执行结果、文件改动和验证证据。' : status === 'waiting' ? '等待执行成员提交接单计划。' : '先要求对应执行成员重写接单计划，再继续执行或验收。',
  }
}
const childAgentPlanReview = computed(() => displayValue(
  agentCoordination.value?.child_plan_review
    || agentCoordination.value?.childPlanReview
    || buildChildPlanReviewFromAck(agentCoordination.value?.ack_review || agentCoordination.value?.ackReview),
  '执行成员接单计划已整理。',
  320
))
const childAgentPlanReviewRows = computed(() => Array.isArray(childAgentPlanReview.value?.rows) ? childAgentPlanReview.value.rows.filter(row => row?.agent).slice(0, 8) : [])
const agentProgressSummary = computed(() => displayValue(props.card.agent_progress_summary || props.card.agentProgressSummary || props.card.technical?.agent_progress_summary || props.card.technical?.agentProgressSummary || null, '执行成员进展已整理。'))
const agentProgressRows = computed(() => Array.isArray(agentProgressSummary.value?.rows) ? agentProgressSummary.value.rows.filter(row => row?.agent).slice(0, 8) : [])
const receiptReworkSummary = computed(() => displayValue(props.card.receipt_rework_summary || props.card.receiptReworkSummary || props.card.technical?.receipt_rework_summary || props.card.technical?.receiptReworkSummary || null, '结果复检已整理。'))
const runtimeKernel = computed(() => props.card.runtime_kernel || props.card.runtimeKernel || props.card.technical?.runtime_kernel || agentCoordination.value?.runtime_kernel || null)
const memoryGateSummary = computed(() => displayValue(agentCoordination.value?.memory_gate_summary || agentCoordination.value?.memoryGateSummary || runtimeKernel.value?.memory_gate || runtimeKernel.value?.memoryGate || null, '记忆派发校验已整理。'))
const reinjectionGateSummary = computed(() => displayValue(agentCoordination.value?.post_compact_reinjection_gate_summary || agentCoordination.value?.postCompactReinjectionGateSummary || runtimeKernel.value?.post_compact_reinjection_gate || runtimeKernel.value?.postCompactReinjectionGate || null, '压缩记忆校验已整理。'))
const postCompactDispatchSummary = computed(() => agentCoordination.value?.post_compact_dispatch_marker_summary || agentCoordination.value?.postCompactDispatchMarkerSummary || runtimeKernel.value?.post_compact_dispatch_marker || runtimeKernel.value?.postCompactDispatchMarker || null)
const runtimeTooling = computed(() => runtimeKernel.value?.runtime_tooling || runtimeKernel.value?.runtimeTooling || null)
const recoverySummary = computed(() => displayValue(props.card.recovery_summary || props.card.recoverySummary || props.card.technical?.recovery_summary || props.card.technical?.recoverySummary || null, '恢复接续已整理。'))
const continuationStatus = computed(() => displayValue(props.card.continuation_status || props.card.continuationStatus || null, '接续状态已整理。'))
const continuationNeedsReplan = computed(() => continuationStatus.value?.replan_required === true || continuationStatus.value?.replanRequired === true)
const continuationSteps = computed(() => {
  const steps = continuationStatus.value?.handoff_steps || continuationStatus.value?.handoffSteps || continuationStatus.value?.steps || []
  return Array.isArray(steps) ? steps.filter(item => item?.label || item?.detail || typeof item === 'string').slice(0, 3) : []
})
const riskLabel = (level) => ({
  high: '高风险',
  medium: '需确认',
  low: '低风险',
}[level] || level || '待评估')
const workOrderStatusLabel = (status) => ({
  planned: '计划中',
  waiting_confirmation: '待确认',
  dispatched: '已派发',
  running: '执行中',
  done: '已完成',
  failed: '失败',
  blocked: '受阻',
}[status] || status || '计划中')
const acceptanceStatusLabel = (status) => ({
  passed: '已通过',
  reviewing: '验收中',
  needs_rework: '需返工',
  pending: '等待证据',
}[status] || status || '等待证据')
const planAlignmentStatusLabel = (status) => ({
  aligned: '已对齐',
  deviated: '有偏离',
  needs_evidence: '待补证据',
  tracking: '核对中',
}[status] || status || '核对中')
const coordinationStatusLabel = (status) => ({
  healthy: '健康',
  needs_attention: '需关注',
  blocked: '受阻',
}[status] || status || '跟踪中')
const childPlanReviewStatusLabel = (status) => ({
  approved: '已通过',
  waiting: '等待提交',
  needs_revision: '需调整',
}[status] || status || '跟踪中')
const agentProgressStatusLabel = (status) => ({
  completed: '已回传结果',
  done: '已回传结果',
  succeeded: '已回传结果',
  success: '已回传结果',
  ok: '已回传结果',
  running: '执行中',
  in_progress: '执行中',
  reviewing: '检查中',
  pending: '等待中',
  queued: '等待中',
  needs_attention: '需关注',
  blocked: '待补齐',
  failed: '失败',
}[status] || status || '跟踪中')
const isCompletedAgentProgressStatus = (status) => /^(completed|done|succeeded|success|ok)$/.test(String(status || '').toLowerCase())
const visibleAgentProgressStatusLabel = (row = {}) => {
  const raw = String(row.status_label || row.statusLabel || '').trim()
  if (isCompletedAgentProgressStatus(row.status) && /^(已完成|完成)$/.test(raw)) return '已回传结果'
  return raw || agentProgressStatusLabel(row.status)
}
const visibleAgentProgressEvidenceValue = (row = {}, item = {}) => {
  const key = String(item.id || item.label || '').trim().toLowerCase()
  const value = String(item.value || '').trim()
  if (isCompletedAgentProgressStatus(row.status) && /^(result|update|status|结果|更新|状态)$/.test(key) && /^(已完成|完成)$/.test(value)) {
    return '已回传结果'
  }
  return item.value
}
const receiptGradeLabel = (grade) => ({
  good: '高质量',
  partial: '需补充',
  weak: '较弱',
}[grade] || grade || '待评分')
const memoryGateStatusLabel = (status) => ({
  passed: '已通过',
  missing_receipt_reference: '缺记忆声明',
  not_required: '未触发',
}[status] || status || '跟踪中')
const reinjectionGateStatusLabel = (status) => ({
  passed: '已通过',
  missing_receipt_reference: '缺重注入声明',
  missing_candidate_reference: '缺候选声明',
  missing_candidate_usage: '缺使用状态',
  not_required: '未触发',
}[status] || status || '跟踪中')
const postCompactDispatchStatusLabel = (status) => ({
  first_dispatch_after_compact: '压缩后首次派发',
  followup_dispatch_after_compact: '压缩后后续派发',
  recorded: '已记录',
  not_required: '未触发',
}[status] || status || '跟踪中')
const contractInjectionLabel = (status) => ({
  ready: '待注入',
  ready_to_inject: '待注入',
  needs_target: '缺目标',
  needs_contract_changes: '缺接口约定',
  needs_injection: '待注入',
  needs_consumption: '待消费',
  needs_consumption_receipt: '待补消费说明',
  needs_consumption_evidence: '待消费证据',
  injected: '已注入',
  consumed: '已消费',
  not_required: '不需要',
}[status] || status || '待同步')
const contractRowStatus = (row) => row?.consumed ? 'consumed' : row?.missing_reason || (row?.injected ? 'injected' : row?.status)
const formatRuntimePressure = (value) => {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n <= 0) return '0%'
  return `${Math.round(n * 10) / 10}%`
}
const runtimeToolingLabel = (status) => ({
  ready: '已同步',
  needs_attention: '待检查',
  not_recorded: '未记录',
}[status] || status || '未记录')
const recoveryStatusLabel = (status) => ({
  active: '已接上',
  needs_user: '待确认',
  recorded: '已记录',
}[status] || status || '已接上')
const continuationStatusLabel = (status) => ({
  queued: '已入队',
  accepted: '已接收',
  active: '处理中',
  deferred: '本轮后继续',
  interrupting: '正在停止当前轮',
  replanning: '重核计划',
}[status] || status || '已接收')
const workItemStatusLabel = (status) => ({
  pending: '等待认领',
  running: '执行中',
  in_progress: '执行中',
  completed: '已完成',
  blocked: '受阻',
  failed: '失败',
  cancelled: '已停止',
  done: '已完成',
}[status] || status || '等待')
const workItemDependencyStatusLabel = (status) => ({
  waiting_dependency: '等待前置',
  ready_to_dispatch: '可派发',
  tracking: '跟踪中',
}[status] || status || '已记录')
const workItemClaimStatusLabel = (status) => ({
  claimed: '已派发',
  blocked: '等待前置',
  agent_busy: '继续等待',
  already_claimed: '处理中',
  already_resolved: '已经处理',
  task_not_found: '队列已刷新',
}[status] || '已记录')
const workItemUnlockStatusLabel = (status) => ({
  ready_to_dispatch: '已解锁',
  auto_dispatch_deferred: '已自动接上',
  auto_dispatch_queued: '已加入队列',
  auto_dispatch_blocked: '等待接续',
}[status] || '已解锁')
const completionReadinessStatusLabel = (status) => ({
  ready: '可以总结',
  blocked: '尚未收尾',
}[status] || '检查中')
const workItemHeadline = (item) => item.subject || item.description || item.target || item.owner || '子任务'
const workItemActiveForm = (item) => {
  if (!item) return ''
  const subject = sanitizeUserFacingAgentText(workItemHeadline(item), '子任务', 120)
  const raw = item.activeForm || item.active_form || item.current_focus || item.currentFocus || ''
  const status = String(item.status || '').toLowerCase()
  let fallback = ''
  if (/^(completed|done|succeeded)$/.test(status)) fallback = `已处理：${subject}`
  else if (/^(pending|queued|waiting)$/.test(status)) fallback = `等待开始：${subject}`
  else if (/^blocked$/.test(status)) fallback = `待补齐：${subject}`
  else if (/^failed$/.test(status)) fallback = `待排查：${subject}`
  else if (/^(running|in_progress|active|reviewing|reworking)$/.test(status)) fallback = `正在处理：${subject.replace(/^正在[:：\s]*/, '')}`
  let text = sanitizeUserFacingAgentText(raw || fallback, '', 160)
  if (/^(completed|done|succeeded)$/.test(status)) {
    text = text.replace(/^已完成[:：\s]*/, '已处理：')
  }
  if (!text || text === subject) return ''
  return text
}
const workItemMeta = (item) => {
  const bits = []
  if (item.owner || item.target) bits.push(item.owner || item.target)
  if (item.blockedBy?.length) bits.push(`等待 ${item.blockedBy.join('、')}`)
  if (item.attempt > 1) bits.push(`第 ${item.attempt} 轮`)
  return bits.join(' · ')
}
const emitChangeAction = (file = null) => {
  emit('action', {
    id: 'changes',
    kind: 'view_changes',
    label: '查看改动',
    tone: 'outline',
    files: changeFiles.value,
    selectedPath: file?.path || changeFiles.value[0]?.path || '',
    project: file?.project || changeFiles.value.find(item => item.project)?.project || '',
    change_summary: changeSummary.value,
  })
}
const taskActionPayload = (action) => {
  if (isPlanConfirmAction(action)) {
    const acceptFeedback = String(planAcceptFeedback.value || '').trim()
    return {
      ...action,
      accept_feedback: acceptFeedback,
      feedback: acceptFeedback,
    }
  }
  if (action?.kind !== 'view_changes') return action
  return {
    ...action,
    files: action.files || changeFiles.value,
    selectedPath: action.selectedPath || changeFiles.value[0]?.path || '',
    project: action.project || changeFiles.value.find(item => item.project)?.project || '',
    change_summary: action.change_summary || changeSummary.value,
  }
}
watch(() => props.card.task_id || props.card.id || '', () => {
  planAcceptFeedback.value = ''
})
const handoffActionCanEmit = (action) => ['view_changes', 'continue', 'retry', 'resume', 'gap_continue', 'confirm_plan', 'revise_plan', 'approve_epic', 'targeted_rework', 'continue_work_item', 'rollback', 'save_knowledge'].includes(action?.kind)
const handoffActionPayload = (action) => {
  if (!action) return action
  if (action.kind === 'view_changes') {
    return taskActionPayload({
      ...action,
      files: action.files || changeFiles.value,
      selectedPath: action.selectedPath || changeFiles.value[0]?.path || '',
      change_summary: action.change_summary || changeSummary.value,
    })
  }
  return { ...action, label: action.label || '继续' }
}
</script>

<template src="./TaskExperienceCard.template.html"></template>

<style scoped src="./TaskExperienceCard.css"></style>
