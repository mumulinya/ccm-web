<script setup>
import { computed, ref, watch } from 'vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import { getDeliveryReport, getStreamlinedToolSummary, getStreamlinedUserText, getTechnicalDetailSections, normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingAgentText, sanitizeUserFacingPlanStructure, sanitizeUserFacingPlanText } from '../../utils/agentDisplay.js'

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

const kicker = computed(() => card.value.kicker || ({
  group: 'AI 编程任务',
  project: '项目执行任务',
  global: '跨项目 AI 任务',
}[props.context] || 'AI 编程任务'))

const agentLabel = (status) => ({
  done: '已回传结果', completed: '已回传结果', succeeded: '已回传结果',
  running: '执行中', in_progress: '执行中', reviewing: '检查中',
  pending: '等待中', queued: '等待中', blocked: '受阻',
  failed: '失败', partial: '需修复', cancelled: '已取消',
}[status] || status || '等待中')

const hasDelivery = computed(() => {
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
const workchainStages = computed(() => Array.isArray(workchain.value?.stages) ? workchain.value.stages.map(stage => displayValue(stage, '工作链路阶段已整理。', 220)) : [])
const progressCheckpointSource = computed(() => displayValue(props.card.progress_checkpoints || props.card.progressCheckpoints || displayStream.value?.progress_checkpoints || displayStream.value?.progressCheckpoints || workchain.value?.progress_checkpoints || workchain.value?.progressCheckpoints || null, '关键进展已整理。'))
const progressCheckpoints = computed(() => {
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
const pickupSummary = computed(() => displayValue(props.card.pickup_summary || props.card.pickupSummary || deliveryReport.value?.pickup_summary || deliveryReport.value?.pickupSummary || workchain.value?.completion_summary?.pickup_summary || workchain.value?.completionSummary?.pickupSummary || null, '回来继续看的摘要已整理。'))
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
  const joined = `${gate?.status || ''} ${gate?.status_label || ''} ${gate?.verdict || ''} ${gate?.reason || ''} ${rows.join(' ')}`
  const negativeSafeJoined = joined
    .replace(/未发现(?:失败|错误|阻塞|风险|问题|网络错误|失败步骤|待处理缺口)/g, '')
    .replace(/没有(?:失败|错误|阻塞|风险|问题|网络错误|失败步骤|待处理缺口)/g, '')
    .replace(/无(?:失败|错误|阻塞|风险|问题|网络错误|失败步骤|待处理缺口)/g, '')
  const needsHuman = /人工|确认|needs[_\s-]*human|needs[_\s-]*user|manual/i.test(negativeSafeJoined)
  const needsRecheck = /需复验|重新复验|needs[_\s-]*recheck/i.test(negativeSafeJoined)
  const needsRework = /返工|未通过|失败|缺口|待处理|受阻|needs[_\s-]*rework|blocked|failed/i.test(negativeSafeJoined)
  const passed = gate?.pass === true || gate?.passed === true || (/已通过|可以接受|passed|pass|accepted/i.test(joined) && !needsRework && !needsHuman)
  const status = needsHuman ? 'needs_user' : needsRecheck ? 'needs_recheck' : needsRework ? 'needs_rework' : passed ? 'passed' : 'recorded'
  return {
    schema: 'ccm-main-agent-independent-review-summary-v1',
    title: '独立复核',
    status,
    status_label: ({ passed: '已通过', needs_rework: '需返工', needs_recheck: '需复验', needs_user: '等你确认', recorded: '已记录' })[status],
    headline: status === 'passed'
      ? 'TestAgent/独立复核已检查交付证据，我可以继续做最终验收。'
      : status === 'needs_rework'
        ? '独立复核发现未通过项，我会先安排返工，再重新验收。'
        : status === 'needs_recheck'
          ? '独立复核还没有闭环，我会先补齐证据并重新复验。'
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
const planMode = computed(() => displayValue(props.card.plan_mode || props.card.planMode || null, '执行前计划已整理。'))
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

<template>
  <section class="task-experience-card" :class="[`context-${context}`, `phase-${card.phase}`]">
    <header class="task-card-head">
      <div>
        <span class="task-card-kicker">{{ kicker }}</span>
        <h4>{{ card.title || '开发任务' }}</h4>
      </div>
      <span class="task-card-phase">{{ card.phase_label || '正在处理' }}</span>
    </header>

    <div v-if="visibleTaskGoal" class="task-card-goal">{{ visibleTaskGoal }}</div>
    <div class="task-card-streamlined">
      <strong>{{ streamlinedText }}</strong>
      <small>{{ streamlinedToolSummary }}</small>
    </div>
    <div v-if="requirementEpicItems.length" class="task-card-section requirement-epic-plan">
      <div class="section-head">
        <label>需求拆单任务图</label>
        <span>{{ requirementEpicItems.length }} 个任务 · {{ requirementEpicDependencyCount }} 条依赖</span>
      </div>
      <div class="requirement-epic-items">
        <article v-for="item in requirementEpicItems" :key="item.item_key" :class="['requirement-epic-item', item.status]">
          <div>
            <strong>{{ item.title }}</strong>
            <small>{{ item.target_id || (item.target_type === 'auto' ? '由主 Agent 分派' : item.target_type) }}</small>
          </div>
          <span>{{ agentLabel(item.status) }}</span>
          <p v-if="item.depends_on?.length">前置：{{ item.depends_on.join('、') }}</p>
          <p v-if="item.branch_detail" :class="['requirement-epic-branch', item.branch_state]">{{ item.branch_detail }}</p>
          <p v-if="item.status_detail">{{ item.status_detail }}</p>
          <p v-if="item.acceptance_criteria?.length">验收：{{ item.acceptance_criteria.slice(0, 2).join('；') }}</p>
        </article>
      </div>
      <small v-if="card.phase === 'needs_user'">确认一次任务图后，系统会原子创建全部子任务并按依赖派发。</small>
    </div>
    <div v-if="workchainStages.length" class="task-card-workchain" aria-label="处理链路">
      <div v-for="stage in workchainStages" :key="stage.id" :class="['workchain-stage', stage.status]">
        <span>{{ stage.label }}</span>
        <small>{{ stage.status === 'completed' ? '完成' : stage.status === 'in_progress' ? '进行中' : stage.status === 'needs_confirmation' ? '待确认' : stage.status === 'failed' ? '失败' : stage.status === 'cancelled' ? '已停止' : '等待' }}</small>
      </div>
    </div>
    <div v-if="progressCheckpoints.length" class="task-card-section progress-checkpoints">
      <div class="section-head">
        <label>{{ progressCheckpointSource?.title || '关键进展' }}</label>
        <span>{{ progressCheckpoints.length }} 条</span>
      </div>
      <ol>
        <li v-for="checkpoint in progressCheckpoints" :key="checkpoint.id || checkpoint.label" :class="checkpoint.status">
          <span class="checkpoint-dot"></span>
          <div>
            <strong>{{ checkpoint.label }}</strong>
            <small v-if="checkpoint.detail">{{ checkpoint.detail }}</small>
          </div>
          <em>{{ timelineStatusLabel(checkpoint.status) }}</em>
        </li>
      </ol>
    </div>
    <div v-if="recoverySummary" class="task-card-section recovery-summary" :class="recoverySummary.status">
      <div class="section-head">
        <label>{{ recoverySummary.title || '恢复接续' }}</label>
        <span>{{ recoverySummary.status_label || recoveryStatusLabel(recoverySummary.status) }}</span>
      </div>
      <p v-if="recoverySummary.headline">{{ recoverySummary.headline }}</p>
      <div class="recovery-checks">
        <span :class="{ ok: recoverySummary.revalidated?.goal }">目标</span>
        <span :class="{ ok: recoverySummary.revalidated?.state }">状态</span>
        <span :class="{ ok: recoverySummary.revalidated?.acceptance }">验收</span>
      </div>
      <ul v-if="recoverySummary.preserved?.length || recoverySummary.remaining_gaps?.length">
        <li v-for="item in recoverySummary.preserved?.slice(0, 3)" :key="`preserved-${item}`">{{ item }}</li>
        <li v-for="item in recoverySummary.remaining_gaps?.slice(0, 3)" :key="`gap-${item}`">仍待补齐：{{ item }}</li>
      </ul>
      <small v-if="recoverySummary.next_action">下一步：{{ recoverySummary.next_action }}</small>
    </div>
    <div v-if="continuationStatus" class="task-card-section continuation-status" :class="[continuationStatus.status, { 'needs-replan': continuationNeedsReplan }]">
      <div class="section-head">
        <label>{{ continuationStatus.title || '接续状态' }}</label>
        <span>{{ continuationStatus.status_label || continuationStatusLabel(continuationStatus.status) }}</span>
      </div>
      <p v-if="continuationStatus.headline">{{ continuationStatus.headline }}</p>
      <div v-if="continuationStatus.route_label || continuationStatus.kind_label || continuationStatus.target || continuationStatus.reason" class="continuation-meta">
        <span v-if="continuationStatus.route_label">处理方式：{{ continuationStatus.route_label }}</span>
        <span v-if="continuationStatus.kind_label">类型：{{ continuationStatus.kind_label }}</span>
        <span v-if="continuationStatus.target">目标：{{ continuationStatus.target }}</span>
        <span v-if="continuationStatus.reason">原因：{{ continuationStatus.reason }}</span>
      </div>
      <ol v-if="continuationSteps.length" class="continuation-steps">
        <li v-for="step in continuationSteps" :key="step.id || step.label || step">
          <strong>{{ step.label || step }}</strong>
          <small v-if="step.detail">{{ step.detail }}</small>
        </li>
      </ol>
      <small v-if="continuationStatus.next_action">下一步：{{ continuationStatus.next_action }}</small>
    </div>
    <div v-if="agentProgressRows.length" class="task-card-section agent-progress-summary" :class="agentProgressSummary.status">
      <div class="section-head">
        <label>{{ agentProgressSummary.title || '执行成员进展' }}</label>
        <span>{{ agentProgressSummary.status_label || agentProgressStatusLabel(agentProgressSummary.status) }}</span>
      </div>
      <p v-if="agentProgressSummary.headline">{{ agentProgressSummary.headline }}</p>
      <div class="agent-progress-rows">
        <article v-for="row in agentProgressRows" :key="row.agent" :class="['agent-progress-row', row.status]">
          <header>
            <strong>{{ row.role ? `${row.role} · ${row.agent}` : row.agent }}</strong>
            <em>{{ visibleAgentProgressStatusLabel(row) }}</em>
          </header>
          <p v-if="row.summary || row.current_focus">{{ row.agent }}：{{ row.summary || row.current_focus }}</p>
          <small v-if="row.current_focus">当前重点：{{ row.current_focus }}</small>
          <div v-if="asList(row.evidence).length" class="agent-progress-evidence">
            <span v-for="item in asList(row.evidence).slice(0, 4)" :key="item.id || `${row.agent}-${item.label}`">
              {{ item.label }}：{{ visibleAgentProgressEvidenceValue(row, item) }}<small v-if="item.detail"> · {{ item.detail }}</small>
            </span>
          </div>
          <ul v-if="row.blockers?.length">
            <li v-for="item in row.blockers.slice(0, 3)" :key="`${row.agent}-${item}`">{{ item }}</li>
          </ul>
          <small v-if="row.next_action" class="agent-progress-next">下一步：{{ row.next_action }}</small>
        </article>
      </div>
      <small v-if="agentProgressSummary.next_action" class="agent-progress-summary-next">下一步：{{ agentProgressSummary.next_action }}</small>
    </div>
    <div v-if="workItemUnlockSummary" class="task-card-section work-item-unlock-summary" :class="workItemUnlockSummary.status">
      <div class="section-head">
        <label>{{ workItemUnlockSummary.title || '前置完成，下一步已解锁' }}</label>
        <span>{{ workItemUnlockSummary.status_label || workItemUnlockStatusLabel(workItemUnlockSummary.status) }}</span>
      </div>
      <p v-if="workItemUnlockSummary.headline">{{ workItemUnlockSummary.headline }}</p>
      <ul v-if="asList(workItemUnlockSummary.rows).length">
        <li v-for="row in asList(workItemUnlockSummary.rows).slice(0, 4)" :key="row.id || row.label">
          {{ row.label || `${row.target || row.owner || '执行成员'} 的前置依赖已完成` }}
        </li>
      </ul>
      <small v-if="workItemUnlockSummary.next_action || workItemUnlockSummary.nextAction">下一步：{{ workItemUnlockSummary.next_action || workItemUnlockSummary.nextAction }}</small>
    </div>

    <div v-if="workItemClaimSummary" class="task-card-section work-item-claim-summary" :class="workItemClaimSummary.status">
      <div class="section-head">
        <label>{{ workItemClaimSummary.title || '派发状态' }}</label>
        <span>{{ workItemClaimSummary.status_label || workItemClaimStatusLabel(workItemClaimSummary.status) }}</span>
      </div>
      <p v-if="workItemClaimSummary.headline">{{ workItemClaimSummary.headline }}</p>
      <small v-if="workItemClaimSummary.next_action || workItemClaimSummary.nextAction">下一步：{{ workItemClaimSummary.next_action || workItemClaimSummary.nextAction }}</small>
    </div>

    <div v-if="workItems.length" class="task-card-section work-items">
      <div class="section-head">
        <label>执行队列</label>
        <span>{{ workItemSummary.counts?.completed || 0 }}/{{ workItemSummary.total || workItems.length }} 完成</span>
      </div>
      <div class="work-item-list">
        <article v-for="item in workItems.slice(0, 6)" :key="item.id || item.target || item.subject" :class="['work-item', item.status]">
          <header>
            <strong>{{ workItemHeadline(item) }}</strong>
            <em>{{ workItemStatusLabel(item.status) }}</em>
          </header>
          <small v-if="workItemMeta(item)">{{ workItemMeta(item) }}</small>
          <small v-if="workItemActiveForm(item)" class="work-item-active-form">当前：{{ workItemActiveForm(item) }}</small>
          <p v-if="item.evidence?.length || item.blockers?.length">{{ (item.evidence?.[0] || item.blockers?.[0] || '').slice(0, 140) }}</p>
        </article>
      </div>
      <div v-if="workItemDependencySummary" class="work-item-dependencies" :class="workItemDependencySummary.status">
        <header>
          <strong>{{ workItemDependencySummary.title || '依赖与派发' }}</strong>
          <em>{{ workItemDependencySummary.status_label || workItemDependencyStatusLabel(workItemDependencySummary.status) }}</em>
        </header>
        <p v-if="workItemDependencySummary.headline">{{ workItemDependencySummary.headline }}</p>
        <ul v-if="workItemDependencyRows.length">
          <li v-for="row in workItemDependencyRows" :key="row.id || row.label">
            <span>{{ row.label }}</span>
            <small v-if="row.next_action">{{ row.next_action }}</small>
          </li>
        </ul>
        <small v-if="workItemDependencySummary.next_action || workItemDependencySummary.nextAction" class="work-item-dependency-next">下一步：{{ workItemDependencySummary.next_action || workItemDependencySummary.nextAction }}</small>
      </div>
      <div v-if="nextClaimableWorkItems.length" class="work-item-next">
        <strong>下一步可派发</strong>
        <div v-for="item in nextClaimableWorkItems" :key="item.id || item.target || item.subject">
          <span>
            <b>{{ item.target || item.owner || '执行成员' }}：{{ item.subject || item.title || '继续处理已解锁工作项' }}</b>
            <small v-if="workItemActiveForm(item)" class="work-item-active-form">当前：{{ workItemActiveForm(item) }}</small>
          </span>
          <button type="button" :disabled="busy" @click="emit('action', { kind: 'continue_work_item', label: '继续派发', tone: 'primary', work_item_id: item.id, target: item.target || item.owner || '', reason: item.subject || item.title || '' })">继续派发</button>
        </div>
      </div>
      <div v-if="workItemVerificationReminder" class="work-item-verification-reminder">
        <strong>{{ workItemVerificationReminder.title || '执行队列还缺验收' }}</strong>
        <small>{{ workItemVerificationReminder.headline || '工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。' }}</small>
        <small v-if="workItemVerificationReminder.next_action || workItemVerificationReminder.nextAction" class="work-item-verification-next">下一步：{{ workItemVerificationReminder.next_action || workItemVerificationReminder.nextAction }}</small>
      </div>
    </div>
    <div class="task-card-progress"><span :style="{ width: `${Math.max(0, Math.min(100, Number(card.progress || 0)))}%` }"></span></div>
    <div class="task-card-progress-label"><span>总体进度</span><strong>{{ Math.max(0, Math.min(100, Number(card.progress || 0))) }}%</strong></div>

    <div v-if="completionOverview" class="task-card-section completion-overview" :class="completionOverview.status">
      <div class="section-head">
        <label>{{ completionOverview.title || '最终交付总览' }}</label>
        <span>{{ completionOverview.status_label || '已整理' }}</span>
      </div>
      <p v-if="completionOverview.headline">{{ completionOverview.headline }}</p>
      <div v-if="completionOverviewMetrics.length" class="completion-metrics">
        <div v-for="metric in completionOverviewMetrics" :key="metric.id || metric.label" :class="metric.tone">
          <small>{{ metric.label }}</small>
          <strong>{{ metric.value }}</strong>
          <em v-if="metric.detail">{{ metric.detail }}</em>
        </div>
      </div>
      <div v-if="completionOverviewHighlights.length || completionOverviewVerification.length || completionOverviewAcceptance.length || completionOverviewRisks.length" class="completion-lists">
        <section v-if="completionOverviewHighlights.length">
          <strong>{{ completionOverview.status === 'failed' ? '处理结果' : completionOverview.status === 'cancelled' ? '停止说明' : '完成内容' }}</strong>
          <small v-for="item in completionOverviewHighlights" :key="`highlight-${item}`">{{ item }}</small>
        </section>
        <section v-if="completionOverviewVerification.length">
          <strong>验证结果</strong>
          <small v-for="item in completionOverviewVerification" :key="`verify-${item}`">{{ item }}</small>
        </section>
        <section v-if="completionOverviewAcceptance.length">
          <strong>验收结论</strong>
          <small v-for="item in completionOverviewAcceptance" :key="`acceptance-${item}`">{{ item }}</small>
        </section>
        <section v-if="completionOverviewRisks.length">
          <strong>{{ ['cancelled', 'canceled'].includes(String(completionOverview.status || '').toLowerCase()) ? '停止原因' : completionOverview.status === 'failed' ? '未完成原因' : '风险与待确认' }}</strong>
          <small v-for="item in completionOverviewRisks" :key="`risk-${item}`">{{ item }}</small>
        </section>
      </div>
      <small v-if="completionOverview.next_action" class="completion-next">下一步：{{ completionOverview.next_action }}</small>
      <small v-if="completionOverview.technical_hint" class="completion-tech-hint">{{ completionOverview.technical_hint }}</small>
    </div>

    <div v-if="qualityFollowup" class="task-card-section quality-followup" :class="qualityFollowup.status">
      <div class="section-head">
        <label>{{ qualityFollowup.title || '交付总结还需补齐' }}</label>
        <span>{{ qualityFollowup.status_label || '需补齐' }}</span>
      </div>
      <p v-if="qualityFollowup.headline">{{ qualityFollowup.headline }}</p>
      <div v-if="qualityFollowupMissing.length || qualityFollowupEvidence.length" class="quality-followup-grid">
        <section v-if="qualityFollowupMissing.length">
          <strong>缺少内容</strong>
          <small v-for="item in qualityFollowupMissing" :key="`missing-${item}`">{{ item }}</small>
        </section>
        <section v-if="qualityFollowupEvidence.length">
          <strong>已有线索</strong>
          <small v-for="item in qualityFollowupEvidence" :key="`evidence-${item}`">{{ item }}</small>
        </section>
      </div>
      <small v-if="qualityFollowup.next_action || qualityFollowup.nextAction" class="quality-followup-next">下一步：{{ qualityFollowup.next_action || qualityFollowup.nextAction }}</small>
      <div v-if="qualityFollowupAction" class="task-card-actions quality-followup-actions">
        <button type="button" :disabled="busy" class="task-card-button primary" @click="emit('action', qualityFollowupAction)">{{ qualityFollowupAction.label }}</button>
      </div>
    </div>

    <div v-if="userRequestSummary" class="task-card-section user-request-summary" :class="[userRequestSummary.status, userRequestSummary.kind]">
      <div class="section-head">
        <label>{{ userRequestSummary.title || '需要你处理' }}</label>
        <span>{{ userRequestSummary.status_label || '等待你回复' }}</span>
      </div>
      <p v-if="userRequestSummary.headline">{{ userRequestSummary.headline }}</p>
      <div v-if="userRequestSummary.question" class="user-request-question">
        <small>{{ userRequestSummary.kind === 'confirmation' ? '确认项' : '问题' }}</small>
        <strong>{{ userRequestSummary.question }}</strong>
      </div>
      <div v-if="userRequestSummary.action || userRequestSummary.target || userRequestSummary.risk_label" class="user-request-meta">
        <span v-if="userRequestSummary.action">动作：{{ userRequestSummary.action }}</span>
        <span v-if="userRequestSummary.target">目标：{{ userRequestSummary.target }}</span>
        <span v-if="userRequestSummary.risk_label">风险：{{ userRequestSummary.risk_label }}</span>
      </div>
      <p v-if="userRequestSummary.reason" class="user-request-reason">{{ userRequestSummary.reason }}</p>
      <ul v-if="userRequestSuggestions.length" class="user-request-suggestions">
        <li v-for="item in userRequestSuggestions" :key="item">{{ item }}</li>
      </ul>
      <small v-if="userRequestSummary.next_action" class="user-request-next">下一步：{{ userRequestSummary.next_action }}</small>
    </div>

    <div v-if="userHandoff" class="task-card-section user-handoff" :class="userHandoff.status">
      <div class="section-head">
        <label>{{ userHandoff.title || '接下来建议' }}</label>
        <span>{{ userHandoff.status_label || '已整理' }}</span>
      </div>
      <p v-if="userHandoff.headline">{{ userHandoff.headline }}</p>
      <div v-if="userHandoffSummaryCards.length" class="handoff-summary-cards">
        <article v-for="item in userHandoffSummaryCards" :key="item.id || item.label" :class="item.tone">
          <small>{{ item.label || '交接摘要' }}</small>
          <strong>{{ item.value || item.detail || item.summary || '已整理' }}</strong>
        </article>
      </div>
      <article v-if="userHandoff.primary_action" class="handoff-primary-action">
        <div>
          <strong>{{ userHandoff.primary_action.label || '继续跟进' }}</strong>
          <small v-if="userHandoff.primary_action.detail">{{ userHandoff.primary_action.detail }}</small>
        </div>
        <button
          v-if="handoffActionCanEmit(userHandoff.primary_action)"
          type="button"
          :disabled="busy"
          :class="userHandoff.primary_action.tone || 'primary'"
          @click="emit('action', handoffActionPayload(userHandoff.primary_action))"
        >{{ userHandoff.primary_action.label || '处理' }}</button>
      </article>
      <div v-if="userHandoffSecondaryActions.length" class="handoff-secondary-actions">
        <article v-for="action in userHandoffSecondaryActions" :key="action.id || action.label">
          <div>
            <strong>{{ action.label }}</strong>
            <small v-if="action.detail">{{ action.detail }}</small>
          </div>
          <button
            v-if="handoffActionCanEmit(action)"
            type="button"
            :disabled="busy"
            :class="action.tone || 'outline'"
            @click="emit('action', handoffActionPayload(action))"
          >{{ action.label }}</button>
        </article>
      </div>
      <div v-if="userHandoffEvidence.length" class="handoff-evidence">
        <span v-for="item in userHandoffEvidence" :key="item">{{ item }}</span>
      </div>
      <ul v-if="userHandoffUnresolved.length" class="handoff-unresolved">
        <li v-for="item in userHandoffUnresolved" :key="item">{{ item }}</li>
      </ul>
      <small v-if="userHandoff.technical_hint" class="handoff-tech-hint">{{ userHandoff.technical_hint }}</small>
    </div>

    <div v-if="changeSummary && topChangeFiles.length" class="task-card-section change-summary">
      <div class="section-head">
        <label>{{ changeSummary.title || '改动明细' }}</label>
        <span>{{ changeSummary.status_label || `${topChangeFiles.length} 个文件` }}</span>
      </div>
      <p v-if="changeSummary.headline">{{ changeSummary.headline }}</p>
      <div class="change-file-list">
        <button
          v-for="file in topChangeFiles"
          :key="`${file.project || file.agent || 'file'}-${file.path}`"
          type="button"
          :disabled="busy"
          class="change-file-row"
          @click="emitChangeAction(file)"
        >
          <span>
            <strong>{{ file.path }}</strong>
            <small>{{ file.agent || file.project || '项目' }} · {{ file.statusText || '变更' }}</small>
          </span>
          <em v-if="file.additions || file.deletions">+{{ file.additions || 0 }} -{{ file.deletions || 0 }}</em>
          <em v-else>查看</em>
        </button>
      </div>
      <small v-if="changeSummary.next_action" class="change-summary-next">下一步：{{ changeSummary.next_action }}</small>
    </div>

    <div v-if="planMode" class="task-card-section plan-mode">
      <div class="plan-mode-head">
        <label>{{ planMode.title || '执行前计划' }}</label>
        <span :class="['plan-risk', planMode.risk?.level || 'low']">{{ riskLabel(planMode.risk?.level) }}</span>
      </div>
      <p v-if="planRiskSummary">{{ planRiskSummary }}</p>
      <div v-if="planApprovalRequest" class="plan-approval-request">
        <div class="section-head">
          <label>{{ planApprovalRequest.title || '等待你确认计划' }}</label>
          <span>{{ planApprovalRequest.status_label || '待确认' }}</span>
        </div>
        <p>{{ planApprovalRequest.headline || '确认后我才会按这份计划开始执行。' }}</p>
        <ul v-if="planApprovalRows.length">
          <li v-for="item in planApprovalRows" :key="item">{{ item }}</li>
        </ul>
        <small v-if="planApprovalRequest.feedback_hint || planApprovalRequest.feedbackHint">{{ planApprovalRequest.feedback_hint || planApprovalRequest.feedbackHint }}</small>
      </div>
      <div v-if="planMode.revision" class="plan-mode-revision">
        <strong>计划调整</strong>
        <small>第 {{ planMode.revision.count || 1 }} 次：{{ planMode.revision.feedback || '用户要求调整执行前计划。' }}</small>
        <small v-if="planMode.revision.next_step">下一步：{{ planMode.revision.next_step }}</small>
      </div>
      <div v-if="planMode.accepted_feedback" class="plan-mode-accepted">
        <strong>确认补充</strong>
        <small>{{ planMode.accepted_feedback }}</small>
      </div>
      <div v-if="planExecutionFollowup" class="plan-mode-followup">
        <strong>{{ planExecutionFollowup.title || '计划已确认，正在按计划执行' }}</strong>
        <small>{{ planExecutionFollowup.headline || '我会按这份计划推进执行，并在最终总结前逐项核对验收标准。' }}</small>
        <small v-if="planExecutionFollowup.next_action || planExecutionFollowup.nextAction" class="plan-mode-followup-next">下一步：{{ planExecutionFollowup.next_action || planExecutionFollowup.nextAction }}</small>
      </div>
      <div v-if="planMode.clarification_questions?.length" class="plan-mode-questions">
        <strong>{{ planMode.needs_clarification ? '需要确认' : '已按反馈确认' }}</strong>
        <ul>
          <li v-for="question in planMode.clarification_questions.slice(0, 5)" :key="question.id || question.question">
            <span>{{ question.question }}</span>
            <small v-if="question.answer">已记录：{{ question.answer }}</small>
            <small v-else-if="question.reason">{{ question.reason }}</small>
            <em v-if="question.examples?.length">例如：{{ question.examples.join(' / ') }}</em>
          </li>
        </ul>
      </div>
      <div v-if="planModeSteps.length" class="plan-mode-steps">
        <strong>执行步骤</strong>
        <ol>
          <li v-for="(step, stepIndex) in planModeSteps" :key="step.id || step.label || step.content || stepIndex" :class="step.status">
            <span>{{ stepIndex + 1 }}</span>
            <div>
              <b>{{ step.label || step.content || step }}</b>
              <small v-if="step.detail || step.activeForm">{{ step.detail || step.activeForm }}</small>
            </div>
          </li>
        </ol>
      </div>
      <div class="plan-mode-grid">
        <div v-if="planMode.impact_scope?.projects?.length || planMode.impact_scope?.areas?.length">
          <strong>影响范围</strong>
          <small v-if="planMode.impact_scope?.projects?.length">项目：{{ planMode.impact_scope.projects.join('、') }}</small>
          <small v-if="planMode.impact_scope?.areas?.length">区域：{{ planMode.impact_scope.areas.join('、') }}</small>
        </div>
        <div v-if="planMode.read_only_exploration?.summary">
          <strong>只读探索</strong>
          <small>{{ planMode.read_only_exploration.summary }}</small>
        </div>
      </div>
      <div v-if="planAcceptanceItems.length" class="plan-mode-list">
        <strong>验收标准</strong>
        <ul><li v-for="item in planAcceptanceItems" :key="item">{{ item }}</li></ul>
      </div>
      <div v-if="planPermissionBoundaries.length && card.phase === 'needs_user'" class="plan-mode-list permission">
        <strong>执行边界</strong>
        <ul><li v-for="item in planPermissionBoundaries" :key="item">{{ item }}</li></ul>
      </div>
      <div v-if="hasPlanConfirmAction" class="plan-mode-accept-feedback">
        <label :for="planAcceptFeedbackId">确认执行时补充要求</label>
        <textarea
          :id="planAcceptFeedbackId"
          v-model="planAcceptFeedback"
          :disabled="busy"
          maxlength="600"
          rows="2"
          placeholder="可选：例如同时更新 README、保留旧接口兼容"
        ></textarea>
      </div>
    </div>

    <div v-if="planAlignment && planAlignmentChecks.length" class="task-card-section plan-alignment" :class="planAlignment.status">
      <div class="section-head">
        <label>{{ planAlignment.title || '计划执行核对' }}</label>
        <span>{{ planAlignment.status_label || planAlignmentStatusLabel(planAlignment.status) }}</span>
      </div>
      <p v-if="planAlignment.headline">{{ planAlignment.headline }}</p>
      <div class="plan-alignment-checks">
        <article v-for="check in planAlignmentChecks" :key="check.id || check.label" :class="{ ok: check.ok }">
          <span>{{ check.ok ? '✓' : '!' }}</span>
          <div>
            <strong>{{ check.label }}</strong>
            <small v-if="check.detail">{{ check.detail }}</small>
            <em v-if="asList(check.evidence).length">{{ asList(check.evidence).slice(0, 3).join('；') }}</em>
          </div>
        </article>
      </div>
      <ul v-if="planAlignmentDeviations.length" class="plan-alignment-deviations">
        <li v-for="item in planAlignmentDeviations" :key="item.id || item.label">
          <strong>{{ item.label }}</strong>
          <small>{{ item.reason || '需要补齐证据或调整计划。' }}</small>
        </li>
      </ul>
      <small v-if="planAlignment.next_action" class="plan-alignment-next">下一步：{{ planAlignment.next_action }}</small>
    </div>

    <div v-if="workOrderPreview?.orders?.length" class="task-card-section work-orders">
      <div class="section-head">
        <label>{{ workOrderPreview.title || '执行成员任务' }}</label>
        <span>{{ workOrderPreview.requires_confirmation ? '确认后派发' : '可执行' }}</span>
      </div>
      <p v-if="workOrderPreview.summary">{{ workOrderPreview.summary }}</p>
      <div class="work-order-list">
        <article v-for="order in workOrderPreview.orders" :key="order.id || order.project" class="work-order">
          <header>
            <strong>{{ order.title || order.project }}</strong>
            <em>{{ workOrderStatusLabel(order.status) }}</em>
          </header>
          <small v-if="order.objective">{{ order.objective }}</small>
          <div class="work-order-cols">
            <div v-if="order.allowed_scope?.length">
              <b>允许范围</b>
              <ul><li v-for="item in order.allowed_scope.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
            <div v-if="order.forbidden_scope?.length">
              <b>不要做</b>
              <ul><li v-for="item in order.forbidden_scope.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
            <div v-if="order.acceptance?.length">
              <b>验收</b>
              <ul><li v-for="item in order.acceptance.slice(0, 4)" :key="item">{{ item }}</li></ul>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-if="agentCoordination" class="task-card-section agent-coordination" :class="agentCoordination.status">
      <div class="section-head">
        <label>{{ agentCoordination.title || '协作状态' }}</label>
        <span>{{ coordinationStatusLabel(agentCoordination.status) }} · {{ agentCoordination.health || 0 }}</span>
      </div>
      <div v-if="childAgentPlanReviewRows.length" class="child-plan-review" :class="childAgentPlanReview.status">
        <div class="section-head">
          <label>{{ childAgentPlanReview.title || '执行成员接单计划' }}</label>
          <span>{{ childAgentPlanReview.status_label || childPlanReviewStatusLabel(childAgentPlanReview.status) }}</span>
        </div>
        <p v-if="childAgentPlanReview.headline">{{ childAgentPlanReview.headline }}</p>
        <div class="child-plan-review-rows">
          <article v-for="row in childAgentPlanReviewRows" :key="row.agent" :class="row.status">
            <header>
              <strong>{{ row.agent }}</strong>
              <em>{{ row.status_label || childPlanReviewStatusLabel(row.status) }}</em>
            </header>
            <small v-if="row.understood_goal">目标：{{ row.understood_goal }}</small>
            <small v-if="asList(row.planned_scope).length">范围：{{ asList(row.planned_scope).slice(0, 3).join('、') }}</small>
            <small v-if="asList(row.verification_plan).length">验证：{{ asList(row.verification_plan).slice(0, 3).join('、') }}</small>
            <small v-if="asList(row.unclear).length">待澄清：{{ asList(row.unclear).slice(0, 2).join('、') }}</small>
            <small v-if="row.reason" class="child-plan-reason">{{ row.reason }}</small>
          </article>
        </div>
        <small v-if="childAgentPlanReview.next_action" class="child-plan-next">下一步：{{ childAgentPlanReview.next_action }}</small>
      </div>
      <div class="coord-grid">
        <div v-if="agentCoordination.handoff?.length">
          <strong>任务交接</strong>
          <small v-for="item in agentCoordination.handoff.slice(0, 4)" :key="item.agent">{{ item.agent }}：{{ item.detail }}</small>
        </div>
        <div v-if="agentCoordination.heartbeat?.length">
          <strong>进度</strong>
          <small v-for="item in agentCoordination.heartbeat.slice(0, 4)" :key="item.id">{{ item.text }}</small>
        </div>
        <div v-if="agentCoordination.contract_sync">
          <strong>接口约定同步</strong>
          <small>{{ agentCoordination.contract_sync.summary }}</small>
        </div>
        <div v-if="agentCoordination.ack_review?.rows?.length">
          <strong>结果说明检查</strong>
          <small v-for="row in agentCoordination.ack_review.rows.slice(0, 4)" :key="row.agent">{{ row.agent }}：{{ row.reason }}</small>
        </div>
        <div v-if="agentCoordination.contract_transfer?.rows?.length">
          <strong>任务交接同步</strong>
          <small v-if="agentCoordination.contract_injection_gate">{{ agentCoordination.contract_injection_gate.summary }}</small>
          <small v-for="row in (agentCoordination.contract_injection_gate?.rows?.length ? agentCoordination.contract_injection_gate.rows : agentCoordination.contract_transfer.rows).slice(0, 4)" :key="row.id || row.injection_id">
            {{ row.target }}：{{ row.endpoint || row.type }} · {{ contractInjectionLabel(contractRowStatus(row)) }}
            <code v-if="row.injection_id">{{ row.injection_id }}</code>
            <span v-if="row.consumption_reason"> · {{ row.consumption_reason }}</span>
          </small>
        </div>
      </div>
      <div v-if="agentCoordination.receipt_quality?.length" class="receipt-quality">
        <strong>结果说明质量</strong>
        <span v-for="row in agentCoordination.receipt_quality.slice(0, 5)" :key="row.agent">
          {{ row.agent || 'Agent' }} · {{ row.quality?.score || 0 }} · {{ receiptGradeLabel(row.quality?.grade) }}
        </span>
      </div>
      <div v-if="memoryGateSummary?.required" class="memory-gate-status" :class="memoryGateSummary.status">
        <strong>记忆使用声明</strong>
        <small>{{ memoryGateSummary.summary || memoryGateStatusLabel(memoryGateSummary.status) }}</small>
        <small v-for="row in (memoryGateSummary.rows || []).slice(0, 4)" :key="`${row.agent || 'agent'}-${(row.gate_ids || row.missing_gate_ids || []).join('-')}`">
          {{ row.agent || 'Agent' }}：{{ row.reason || memoryGateStatusLabel(row.status) }}
        </small>
      </div>
      <div v-if="reinjectionGateSummary?.required" class="memory-gate-status reinjection" :class="reinjectionGateSummary.status">
        <strong>压缩后上下文恢复</strong>
        <small>{{ reinjectionGateSummary.summary || reinjectionGateStatusLabel(reinjectionGateSummary.status) }}</small>
        <small v-if="reinjectionGateSummary.candidate_usage_counts">
          候选状态：已使用 {{ reinjectionGateSummary.candidate_usage_counts.used || 0 }} · 未使用 {{ reinjectionGateSummary.candidate_usage_counts.ignored || 0 }} · 已核对 {{ reinjectionGateSummary.candidate_usage_counts.verified || 0 }}<template v-if="reinjectionGateSummary.candidate_usage_counts.mentioned"> · 待声明 {{ reinjectionGateSummary.candidate_usage_counts.mentioned }}</template>
        </small>
        <small v-for="row in (reinjectionGateSummary.rows || []).slice(0, 4)" :key="`${row.agent || 'agent'}-${(row.gate_ids || row.missing_gate_ids || []).join('-')}`">
          {{ row.agent || 'Agent' }}：{{ row.reason || reinjectionGateStatusLabel(row.status) }}<template v-if="row.candidate_usage_counts">（已使用 {{ row.candidate_usage_counts.used || 0 }} / 未使用 {{ row.candidate_usage_counts.ignored || 0 }} / 已核对 {{ row.candidate_usage_counts.verified || 0 }}）</template>
        </small>
      </div>
      <div v-if="postCompactDispatchSummary?.required" class="memory-gate-status dispatch-marker" :class="postCompactDispatchSummary.status">
        <strong>压缩派发标记</strong>
        <small>{{ postCompactDispatchSummary.summary || postCompactDispatchStatusLabel(postCompactDispatchSummary.status) }}</small>
        <small v-for="row in (postCompactDispatchSummary.rows || []).slice(0, 4)" :key="`${row.agent || 'agent'}-${row.marker_id || row.boundary_id}`">
          {{ row.agent || 'Agent' }}：{{ row.reason || postCompactDispatchStatusLabel(row.status) }}
        </small>
      </div>
      <div v-if="agentCoordination.targeted_rework?.length" class="targeted-rework">
        <strong>定向补充建议</strong>
        <ul>
          <li v-for="item in agentCoordination.targeted_rework.slice(0, 5)" :key="`${item.id}-${item.target}`">
            <span>{{ item.title }}<small v-if="item.target"> · {{ item.target }}</small>：{{ item.reason }}</span>
            <button type="button" :disabled="busy" @click="emit('action', { ...item, kind: 'targeted_rework', label: item.title || '定向补充', tone: item.tone || 'warning' })">执行</button>
          </li>
        </ul>
      </div>
      <div v-if="agentCoordination.coordination_events?.length" class="coord-events">
        <strong>协作记录</strong>
        <ol>
          <li v-for="event in agentCoordination.coordination_events.slice(-8)" :key="event.id" :class="event.status">
            <span>{{ event.label }}</span>
            <small v-if="event.detail">{{ event.detail }}</small>
          </li>
        </ol>
      </div>
      <small v-if="agentCoordination.next_action" class="coord-next">下一步：{{ agentCoordination.next_action }}</small>
    </div>

    <div v-if="receiptReworkSummary?.gaps?.length || receiptReworkSummary?.active_rework?.length || receiptReworkSummary?.resolved?.length" class="task-card-section receipt-rework-summary" :class="receiptReworkSummary.status">
      <div class="section-head">
        <label>{{ receiptReworkSummary.title || '结果复检' }}</label>
        <span>{{ receiptReworkSummary.status_label || `${receiptReworkSummary.gaps?.length || 0} 个缺口` }}</span>
      </div>
      <p v-if="receiptReworkSummary.headline">{{ receiptReworkSummary.headline }}</p>
      <ul v-if="receiptReworkSummary.active_rework?.length" class="receipt-rework-active">
        <li v-for="item in receiptReworkSummary.active_rework.slice(0, 4)" :key="`active-${item.target}-${item.at || item.reason}`">
          <span>
            <strong>{{ item.target || '执行成员' }}：{{ item.title || '已要求补充结果说明' }}</strong>
            <small>{{ item.reason || '等待执行成员补齐证据后重新验收' }}</small>
          </span>
          <em>等待说明</em>
        </li>
      </ul>
      <ul v-if="receiptReworkSummary.gaps?.length">
        <li v-for="gap in receiptReworkSummary.gaps.slice(0, 5)" :key="`${gap.id}-${gap.target}-${gap.reason}`">
          <span>
            <strong>{{ gap.target || '执行成员' }}：{{ gap.title || '要求补充结果说明' }}</strong>
            <small>{{ gap.reason || gap.missing?.join('、') || '缺少可验收证据' }}</small>
          </span>
          <button type="button" :disabled="busy" @click="emit('action', { ...(gap.action || gap), kind: 'targeted_rework', label: gap.action?.label || gap.title || '要求补充', tone: gap.tone || 'warning' })">补充</button>
        </li>
      </ul>
      <ul v-if="receiptReworkSummary.resolved?.length" class="receipt-rework-resolved">
        <li v-for="item in receiptReworkSummary.resolved.slice(0, 4)" :key="`resolved-${item.target}-${item.at || item.reason}`">
          <span>
            <strong>{{ item.target || '执行成员' }}：{{ item.title || '结果说明已补齐' }}</strong>
            <small>{{ item.reason || '我已重新验收这条结果说明。' }}</small>
          </span>
          <em>已复检</em>
        </li>
      </ul>
      <small v-if="receiptReworkSummary.next_action" class="receipt-rework-next">下一步：{{ receiptReworkSummary.next_action }}</small>
    </div>

    <details v-if="runtimeKernel" class="task-card-section runtime-kernel" :class="{ active: runtimeKernel.ack_only?.active }">
      <summary class="runtime-kernel-summary">
        <strong>技术详情</strong>
        <span>可展开排查</span>
      </summary>
      <div class="runtime-grid">
        <div>
          <strong>生命周期</strong>
          <small>{{ runtimeKernel.lifecycle_count || 0 }} 条 · 阻塞 {{ runtimeKernel.blocked_count || 0 }}</small>
        </div>
        <div>
          <strong>接单说明检查</strong>
          <small>{{ runtimeKernel.ack_only?.active ? '只允许补齐接单说明' : '未限制接单说明补齐' }} · {{ runtimeKernel.ack_only?.count || 0 }}</small>
        </div>
        <div>
          <strong>派发</strong>
          <small>dispatch_worker {{ runtimeKernel.dispatch_worker_count || 0 }}</small>
        </div>
        <div>
          <strong>上下文</strong>
          <small>压力 {{ formatRuntimePressure(runtimeKernel.context_budget?.max_pressure) }}{{ runtimeKernel.context_budget?.compact_recommended ? ' · 建议压缩' : '' }}</small>
        </div>
        <div v-if="postCompactDispatchSummary?.required">
          <strong>压缩派发</strong>
          <small>{{ postCompactDispatchStatusLabel(postCompactDispatchSummary.status) }} · 首次 {{ postCompactDispatchSummary.first_dispatch_count || 0 }}/{{ postCompactDispatchSummary.marker_count || 0 }}</small>
        </div>
        <div v-if="runtimeTooling">
          <strong>MCP/Skill Gate</strong>
          <small>{{ runtimeToolingLabel(runtimeTooling.status) }} · 快照 {{ runtimeTooling.snapshots?.length || 0 }} · Skill {{ runtimeTooling.invoked_skills?.length || 0 }}</small>
        </div>
      </div>
      <div v-if="runtimeKernel.worker_context_packet_ids?.length || runtimeKernel.injection_ids?.length || postCompactDispatchSummary?.marker_ids?.length || runtimeTooling?.snapshots?.length || runtimeTooling?.invoked_skills?.length" class="runtime-tags">
        <code v-for="id in runtimeKernel.worker_context_packet_ids?.slice(0, 4)" :key="`packet-${id}`">{{ id }}</code>
        <code v-for="id in runtimeKernel.injection_ids?.slice(0, 6)" :key="`inject-${id}`">{{ id }}</code>
        <code v-for="id in postCompactDispatchSummary?.marker_ids?.slice(0, 4)" :key="`pcfd-${id}`">{{ id }}</code>
        <code v-for="id in runtimeTooling?.snapshots?.slice(0, 4)" :key="`runtime-snapshot-${id}`">snapshot:{{ id }}</code>
        <code v-for="skill in runtimeTooling?.invoked_skills?.slice(0, 4)" :key="`runtime-skill-${skill.name || skill}`">Skill:{{ skill.name || skill }}</code>
      </div>
      <div v-if="runtimeTooling?.missing?.mcp?.length || runtimeTooling?.missing?.skill?.length || runtimeTooling?.errors?.length" class="runtime-tool-warnings">
        <small v-for="item in runtimeTooling.missing?.mcp?.slice(0, 3)" :key="`missing-mcp-${item}`">缺 MCP：{{ item }}</small>
        <small v-for="item in runtimeTooling.missing?.skill?.slice(0, 3)" :key="`missing-skill-${item}`">缺 Skill：{{ item }}</small>
        <small v-for="item in runtimeTooling.errors?.slice(0, 2)" :key="`runtime-error-${item}`">{{ item }}</small>
      </div>
      <ol v-if="runtimeKernel.latest_lifecycle?.length" class="runtime-events">
        <li v-for="event in runtimeKernel.latest_lifecycle.slice(-4)" :key="event.id || event.trace_event_id || `${event.action}-${event.phase}`">
          <span>{{ event.action || 'runtime' }}</span>
          <small>{{ event.phase || 'execute' }} · {{ event.status || 'planned' }}</small>
        </li>
      </ol>
    </details>

    <div v-if="card.active_agents?.length" class="task-card-section">
      <label>正在工作</label>
      <div class="task-card-pills"><span v-for="agent in card.active_agents" :key="agent">{{ agent }}</span></div>
    </div>

    <div v-if="card.agents?.length" class="task-card-agents">
      <div v-for="agent in card.agents" :key="agent.id || agent.name" class="task-card-agent">
        <strong>{{ agent.name }}</strong><span>{{ agentLabel(agent.status) }}</span>
        <small v-if="agent.summary">{{ agent.summary }}</small>
      </div>
    </div>

    <div v-if="executionStory?.steps?.length" class="task-card-section execution-story">
      <label>{{ executionStory.title || '执行过程' }}</label>
      <div class="execution-steps">
        <div v-for="step in executionStory.steps" :key="step.id" :class="['execution-step', step.status]">
          <span></span>
          <div>
            <strong>{{ step.label }}</strong>
            <small>{{ step.detail }}</small>
            <code v-if="step.evidence">{{ step.evidence }}</code>
          </div>
          <em>{{ timelineStatusLabel(step.status) }}</em>
        </div>
      </div>
    </div>

    <div v-if="card.workflow_timeline?.length" class="task-card-section task-card-flow">
      <label>协作流程</label>
      <ol>
        <li v-for="step in card.workflow_timeline" :key="step.id" :class="step.status">
          <span class="flow-dot"></span>
          <div>
            <strong>{{ step.label }}</strong>
            <small v-if="step.detail">{{ step.detail }}</small>
          </div>
          <em>{{ timelineStatusLabel(step.status) }}</em>
        </li>
      </ol>
    </div>

    <div v-if="card.agent_questions?.length" class="task-card-section task-card-qa">
      <label>协作问答</label>
      <div v-for="qa in card.agent_questions" :key="qa.id" class="task-card-qa-row" :class="qa.status">
        <strong>{{ qa.from }} → {{ qa.to }}</strong>
        <span>{{ qa.label }}</span>
        <small v-if="qa.summary" class="qa-summary">{{ qa.summary }}</small>
        <small v-if="qa.question">问：{{ qa.question }}</small>
        <small v-if="qa.answer">答：{{ qa.answer }}</small>
        <small v-if="qa.next_action" class="qa-next">下一步：{{ qa.next_action }}</small>
        <div v-if="qa.badges?.length" class="qa-badges">
          <em v-for="badge in qa.badges" :key="badge">{{ badge }}</em>
        </div>
      </div>
    </div>

    <div v-if="card.conflict_warnings?.length" class="task-card-section task-card-conflicts">
      <label>冲突保护</label>
      <div v-for="conflict in card.conflict_warnings" :key="conflict.id" class="task-card-conflict">
        <strong>{{ conflict.title }}</strong>
        <span>{{ conflict.detail }}</span>
        <code v-if="conflict.scopes?.length">{{ conflict.scopes.join('、') }}</code>
      </div>
    </div>

    <div v-if="card.completed?.length" class="task-card-section completed">
      <label>已完成</label>
      <ul><li v-for="item in card.completed" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.blockers?.length" class="task-card-section blockers">
      <label>{{ card.phase === 'needs_user' ? '需要你的决定' : '当前阻塞' }}</label>
      <ul><li v-for="item in card.blockers" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="visibleTaskNextAction" class="task-card-next"><span>下一步</span><strong>{{ visibleTaskNextAction }}</strong></div>

    <div v-if="showArchivedDispatchLaunch" class="task-card-section task-dispatch-launch-summary">
      <div class="dispatch-launch-head">
        <label>{{ dispatchLaunchSummary.title || '已派发的工作' }}</label>
        <span>{{ dispatchLaunchSummary.count_label || `${dispatchLaunchRows.length} 个执行目标` }}</span>
      </div>
      <p v-if="dispatchLaunchSummary.headline">{{ dispatchLaunchSummary.headline }}</p>
      <div class="dispatch-launch-list">
        <article v-for="row in dispatchLaunchRows" :key="row.id || row.agent">
          <header>
            <strong>{{ row.role || '执行成员' }} · {{ row.agent }}</strong>
            <em>{{ row.status_label || '已派发' }}</em>
          </header>
          <span>{{ row.task }}</span>
          <small v-if="row.reason">{{ row.reason }}</small>
          <small v-if="row.depends_on?.length">依赖：{{ row.depends_on.join('、') }}</small>
        </article>
      </div>
      <small v-if="dispatchLaunchSummary.next_action" class="dispatch-launch-next">下一步：{{ dispatchLaunchSummary.next_action }}</small>
    </div>

    <MainAgentDecisionCard v-if="showMainAgentDecision" :decision="mainAgentDecision" compact @step-action="emit('action', $event)" />
    <MainAgentDecisionCard v-if="showWorkchainTodoDecision" :decision="workchainTodoDecision" compact @step-action="emit('action', $event)" />

    <div v-if="testAgentExecutionPlanSummary" class="task-card-section test-agent-plan-summary" :class="testAgentExecutionPlanSummary.status">
      <div class="section-head">
        <label>{{ testAgentExecutionPlanSummary.title || 'TestAgent 复核计划' }}</label>
        <span>{{ testAgentExecutionPlanSummary.status_label || '已生成' }}</span>
      </div>
      <p v-if="testAgentExecutionPlanSummary.headline">{{ testAgentExecutionPlanSummary.headline }}</p>
      <ul v-if="testAgentExecutionPlanRows.length">
        <li v-for="item in testAgentExecutionPlanRows" :key="item">{{ item }}</li>
      </ul>
      <div v-if="testAgentExecutionPlanIssues.length" class="test-agent-plan-issues">
        <strong>预检提示</strong>
        <small v-for="item in testAgentExecutionPlanIssues" :key="item">{{ item }}</small>
      </div>
      <small v-if="testAgentExecutionPlanSummary.next_action" class="test-agent-plan-next">下一步：{{ testAgentExecutionPlanSummary.next_action }}</small>
    </div>

    <div v-if="completionReadinessSummary" class="task-card-section completion-readiness" :class="completionReadinessSummary.status">
      <div class="section-head">
        <label>{{ completionReadinessSummary.title || '完成前收尾' }}</label>
        <span>{{ completionReadinessSummary.status_label || completionReadinessStatusLabel(completionReadinessSummary.status) }}</span>
      </div>
      <p v-if="completionReadinessSummary.headline">{{ completionReadinessSummary.headline }}</p>
      <ul v-if="completionReadinessRows.length">
        <li v-for="row in completionReadinessRows" :key="`${row.target || row.owner}-${row.subject}`">
          <strong>{{ row.target || row.owner || '执行成员' }}</strong>
          <span>{{ row.subject || '未完成工作项' }}</span>
          <em>{{ row.status_label || workItemStatusLabel(row.status) }}</em>
        </li>
      </ul>
      <small v-if="completionReadinessSummary.next_action || completionReadinessSummary.nextAction">下一步：{{ completionReadinessSummary.next_action || completionReadinessSummary.nextAction }}</small>
    </div>

    <div v-if="acceptanceReview" class="task-card-section acceptance-review" :class="acceptanceReview.status">
      <div class="section-head">
        <label>{{ acceptanceReview.title || '最终验收' }}</label>
        <span>{{ acceptanceStatusLabel(acceptanceReview.status) }}</span>
      </div>
      <p>{{ acceptanceReview.headline }}</p>
      <div class="acceptance-checks">
        <div v-for="check in acceptanceReview.checks" :key="check.id" :class="{ ok: check.ok }">
          <span>{{ check.ok ? '✓' : '!' }}</span>
          <strong>{{ check.label }}</strong>
          <small>{{ check.detail }}</small>
        </div>
      </div>
      <small v-if="acceptanceReview.next_action" class="acceptance-next">下一步：{{ acceptanceReview.next_action }}</small>
    </div>

    <div v-if="independentReviewSummary" class="task-card-section independent-review-summary" :class="independentReviewSummary.status">
      <div class="section-head">
        <label>{{ independentReviewSummary.title || '独立复核' }}</label>
        <span>{{ independentReviewSummary.status_label || '已记录' }}</span>
      </div>
      <p v-if="independentReviewSummary.headline">{{ independentReviewSummary.headline }}</p>
      <ul v-if="independentReviewRows.length">
        <li v-for="item in independentReviewRows" :key="item">{{ item }}</li>
      </ul>
      <small v-if="independentReviewSummary.next_action">下一步：{{ independentReviewSummary.next_action }}</small>
    </div>

    <div v-if="postReviewSpotCheckSummary" class="task-card-section post-review-spot-check-summary" :class="postReviewSpotCheckSummary.status">
      <div class="section-head">
        <label>{{ postReviewSpotCheckSummary.title || '完成前抽查' }}</label>
        <span>{{ postReviewSpotCheckSummary.status_label || '已记录' }}</span>
      </div>
      <p v-if="postReviewSpotCheckSummary.headline">{{ postReviewSpotCheckSummary.headline }}</p>
      <ul v-if="postReviewSpotCheckRows.length">
        <li v-for="item in postReviewSpotCheckRows" :key="item">{{ item }}</li>
      </ul>
      <small v-if="postReviewSpotCheckSummary.next_action">下一步：{{ postReviewSpotCheckSummary.next_action }}</small>
    </div>

    <div v-if="hasDelivery && !completionOverview" class="task-card-delivery">
      <span>{{ card.delivery?.headline || (card.delivery?.acceptance_passed ? '改动和检查均已完成' : '已有交付进展') }}</span>
      <strong>{{ card.delivery?.files?.length || 0 }} 个文件 · {{ card.delivery?.verification?.length || 0 }} 项检查</strong>
    </div>

    <div v-if="deliveryReport" class="task-card-section delivery-report">
      <div class="section-head">
        <label>{{ deliveryReport.title || '交付总结' }}</label>
        <span>{{ deliveryReport.status_label || '已整理' }}</span>
      </div>
      <p v-if="deliveryReport.headline">{{ deliveryReport.headline }}</p>
      <div v-if="pickupSummary" class="pickup-summary" :class="pickupSummary.status">
        <header>
          <strong>{{ pickupSummary.title || '回来继续看这里' }}</strong>
          <span>{{ pickupSummary.status_label || '已整理' }}</span>
        </header>
        <p v-if="pickupSummary.current_state">{{ pickupSummary.current_state }}</p>
        <ul v-if="pickupReviewItems.length">
          <li v-for="item in pickupReviewItems" :key="item">{{ item }}</li>
        </ul>
        <small v-if="pickupSummary.resume_action">下一步：{{ pickupSummary.resume_action }}</small>
      </div>
      <div v-if="deliveryReportSections.length" class="delivery-report-grid">
        <section v-for="section in deliveryReportSections.slice(0, 10)" :key="section.id || section.title">
          <strong>{{ section.title }}</strong>
          <small v-for="item in section.items.slice(0, 4)" :key="`${section.id}-${item}`">{{ item }}</small>
        </section>
      </div>
    </div>

    <div v-if="card.delivery?.risks?.length" class="task-card-section blockers">
      <label>需要留意</label>
      <ul><li v-for="item in card.delivery.risks" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.actions?.length" class="task-card-actions">
      <button v-for="action in card.actions" :key="action.id" type="button" :disabled="busy" :class="['task-card-button', action.tone]" @click="emit('action', taskActionPayload(action))">{{ action.label }}</button>
    </div>

    <details v-if="card.technical" class="task-card-technical">
      <summary>技术详情</summary>
      <section v-for="section in technicalSections" :key="section.id" class="technical-section">
        <strong>{{ section.title }}</strong>
        <div v-for="item in section.items" :key="`${section.id}-${item.label}-${item.value}`">
          <span>{{ item.label }}</span>
          <code>{{ item.value }}</code>
          <button v-if="item.label === '执行记录' && card.technical.trace_id" type="button" :disabled="busy" @click="emit('action', { kind: 'view_trace', label: '任务回放', task_id: card.task_id, trace_id: card.technical.trace_id })">回放</button>
        </div>
      </section>
      <section v-if="archivedMainAgentDecision" class="technical-section archived-decision-summary">
        <strong>历史计划</strong>
        <div><span>状态</span><code>任务已进入终态，旧执行计划已收起</code></div>
        <div><span>模式</span><code>{{ archivedMainAgentDecision.mode || 'task' }}</code></div>
        <div v-if="archivedDecisionActions"><span>动作</span><code>{{ archivedDecisionActions }}</code></div>
        <div><span>验收</span><code>{{ archivedMainAgentDecision.verify?.passed ? 'verified' : 'needs-check' }}</code></div>
      </section>
      <section class="technical-section">
        <strong>任务记录</strong>
        <div v-if="card.task_id"><span>Task</span><code>{{ card.task_id }}</code></div>
        <div v-if="mainAgentDecision"><span>主Agent</span><code>{{ mainAgentDecision.mode }} / {{ mainAgentDecision.verify?.passed ? 'verified' : 'needs-check' }}</code></div>
        <div v-if="recoverySummary"><span>恢复</span><code>{{ recoverySummary.technical?.recovery_checks || 0 }} checks / {{ recoverySummary.technical?.lease_recovery_count || 0 }} resumes</code></div>
      </section>
    </details>
  </section>
</template>

<style scoped>
.task-experience-card { margin-top:12px; padding:16px; border:1px solid rgba(37,99,235,.22); border-radius:14px; background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,246,255,.88)); color:var(--text-primary); box-shadow:0 10px 30px rgba(15,23,42,.05); }
.context-global { border-color:rgba(124,58,237,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(245,243,255,.9)); }
.context-project { border-color:rgba(5,150,105,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(236,253,245,.9)); }
.task-card-streamlined { display:grid; gap:3px; margin:9px 0 10px; padding:9px 10px; border:1px solid rgba(148,163,184,.16); border-radius:8px; background:rgba(255,255,255,.58); }
.task-card-streamlined strong { color:#334155; font-size:12.5px; line-height:1.45; overflow-wrap:anywhere; }
.task-card-streamlined small { color:#2563eb; font-size:11px; font-weight:800; line-height:1.35; overflow-wrap:anywhere; }
.task-card-workchain { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; margin:8px 0 10px; }
.workchain-stage { min-width:0; padding:7px 6px; border:1px solid rgba(148,163,184,.18); border-radius:7px; background:rgba(248,250,252,.8); text-align:center; }
.workchain-stage span,.workchain-stage small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.workchain-stage span { color:#334155; font-size:11px; font-weight:800; }
.workchain-stage small { margin-top:2px; color:#64748b; font-size:10px; }
.workchain-stage.completed { border-color:rgba(34,197,94,.2); background:#f0fdf4; }
.workchain-stage.in_progress { border-color:rgba(37,99,235,.2); background:#eff6ff; }
.workchain-stage.needs_confirmation { border-color:rgba(245,158,11,.24); background:#fffbeb; }
.workchain-stage.failed { border-color:rgba(239,68,68,.2); background:#fef2f2; }
@media (max-width:640px){ .task-card-workchain { grid-template-columns:repeat(2,minmax(0,1fr)); } }
.progress-checkpoints { padding:11px; border:1px solid rgba(14,165,233,.18); border-radius:10px; background:rgba(240,249,255,.72); }
.progress-checkpoints ol { display:grid; gap:8px; margin:10px 0 0; padding:0; list-style:none; }
.progress-checkpoints li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:9px; align-items:start; min-width:0; }
.checkpoint-dot { width:8px; height:8px; margin-top:5px; border-radius:999px; background:#94a3b8; box-shadow:0 0 0 4px rgba(148,163,184,.12); }
.progress-checkpoints li.done .checkpoint-dot { background:#22c55e; box-shadow:0 0 0 4px rgba(34,197,94,.13); }
.progress-checkpoints li.active .checkpoint-dot { background:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,.13); }
.progress-checkpoints li.warning .checkpoint-dot { background:#f59e0b; box-shadow:0 0 0 4px rgba(245,158,11,.15); }
.progress-checkpoints li.failed .checkpoint-dot { background:#ef4444; box-shadow:0 0 0 4px rgba(239,68,68,.13); }
.progress-checkpoints strong { display:block; color:#0f172a; font-size:12px; line-height:1.35; overflow-wrap:anywhere; }
.progress-checkpoints small { display:block; margin-top:2px; color:#475569; font-size:11px; line-height:1.45; overflow-wrap:anywhere; }
.progress-checkpoints em { color:#64748b; font-size:10px; font-style:normal; font-weight:800; white-space:nowrap; }
.task-card-head,.task-card-progress-label,.task-card-next,.task-card-delivery { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.task-card-head h4 { margin:3px 0 0; font-size:15px; }.task-card-kicker { font-size:11px; color:#64748b; }
.task-card-phase { padding:4px 9px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700; white-space:nowrap; }
.phase-needs_user .task-card-phase,.phase-blocked .task-card-phase { background:#fef3c7; color:#92400e; }.phase-completed .task-card-phase { background:#dcfce7; color:#166534; }.phase-failed .task-card-phase { background:#fee2e2; color:#991b1b; }.phase-reverted .task-card-phase,.phase-cancelled .task-card-phase { background:#e2e8f0; color:#475569; }
.task-card-goal { margin-top:10px; color:#334155; line-height:1.55; }.task-card-progress { height:7px; margin-top:13px; overflow:hidden; border-radius:999px; background:#e2e8f0; }.task-card-progress span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#2563eb,#06b6d4); transition:width .25s ease; }.context-global .task-card-progress span { background:linear-gradient(90deg,#7c3aed,#2563eb); }.context-project .task-card-progress span { background:linear-gradient(90deg,#059669,#06b6d4); }
.task-card-progress-label { margin-top:5px; font-size:11px; color:#64748b; }.task-card-section { margin-top:13px; }.task-card-section label { display:block; margin-bottom:6px; font-size:12px; font-weight:700; color:#475569; }.task-card-pills { display:flex; gap:6px; flex-wrap:wrap; }.task-card-pills span { padding:4px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:12px; }
.plan-mode { padding:12px; border:1px solid rgba(37,99,235,.16); border-radius:11px; background:rgba(239,246,255,.72); }.plan-mode-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.plan-mode-head label { margin:0; }.plan-risk { padding:3px 8px; border-radius:999px; background:#dcfce7; color:#166534; font-size:11px; font-weight:800; white-space:nowrap; }.plan-risk.medium { background:#fef3c7; color:#92400e; }.plan-risk.high { background:#fee2e2; color:#991b1b; }.plan-mode p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.plan-approval-request { display:grid; gap:7px; margin-top:9px; padding:10px; border:1px solid rgba(245,158,11,.3); border-radius:9px; background:#fffbeb; }.plan-approval-request .section-head label { color:#92400e; }.plan-approval-request .section-head span { color:#92400e; background:#fef3c7; border-radius:999px; padding:2px 7px; font-size:10.5px; font-weight:900; }.plan-approval-request p { margin:0; color:#78350f; font-size:12px; line-height:1.45; overflow-wrap:anywhere; }.plan-approval-request ul { display:grid; gap:4px; margin:0; padding-left:18px; color:#92400e; font-size:11.5px; line-height:1.45; }.plan-approval-request small { color:#1d4ed8; font-weight:800; }.plan-mode-revision,.plan-mode-questions,.plan-mode-accepted,.plan-mode-followup,.plan-mode-steps { display:grid; gap:4px; margin-top:9px; padding:8px 9px; border:1px solid rgba(245,158,11,.24); border-radius:9px; background:#fffbeb; }.plan-mode-accepted { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.plan-mode-followup,.plan-mode-questions,.plan-mode-steps { border-color:rgba(37,99,235,.18); background:#eff6ff; }.plan-mode-followup-next { font-weight:800; }.plan-mode-questions ul { display:grid; gap:7px; margin:0; padding:0; list-style:none; }.plan-mode-questions li { display:grid; gap:3px; padding:7px 8px; border-radius:8px; background:rgba(255,255,255,.72); }.plan-mode-questions span { color:#1e3a8a; font-size:12px; font-weight:800; line-height:1.35; overflow-wrap:anywhere; }.plan-mode-questions em { color:#64748b; font-size:11px; font-style:normal; line-height:1.35; overflow-wrap:anywhere; }.plan-mode-steps ol { display:grid; gap:7px; margin:0; padding:0; list-style:none; }.plan-mode-steps li { display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px; padding:7px 8px; border-radius:8px; background:rgba(255,255,255,.74); border:1px solid rgba(37,99,235,.12); }.plan-mode-steps li > span { width:20px; height:20px; display:grid; place-items:center; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:11px; font-weight:900; }.plan-mode-steps li.completed > span,.plan-mode-steps li.done > span { background:#dcfce7; color:#166534; }.plan-mode-steps li.in_progress > span,.plan-mode-steps li.active > span { background:#bfdbfe; color:#1e40af; }.plan-mode-steps b { display:block; color:#1e3a8a; font-size:12px; line-height:1.35; overflow-wrap:anywhere; }.plan-mode-steps small { margin-top:2px; }.plan-mode-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:8px; margin-top:10px; }.plan-mode-grid div,.plan-mode-list { padding:8px 9px; border-radius:9px; background:rgba(255,255,255,.76); border:1px solid rgba(148,163,184,.22); }.plan-mode strong { display:block; margin-bottom:3px; color:#1e40af; font-size:12px; }.plan-mode .plan-mode-revision strong { color:#92400e; }.plan-mode .plan-mode-accepted strong { color:#166534; }.plan-mode small { display:block; color:#475569; font-size:12px; line-height:1.45; overflow-wrap:anywhere; }.plan-mode-list { margin-top:8px; }.plan-mode-list ul { margin:0; padding-left:18px; color:#475569; font-size:12px; line-height:1.55; }.plan-mode-list.permission strong { color:#92400e; }.plan-mode-accept-feedback { display:grid; gap:6px; margin-top:10px; padding:9px; border:1px dashed rgba(37,99,235,.28); border-radius:9px; background:rgba(255,255,255,.68); }.plan-mode-accept-feedback label { color:#1e40af; font-size:11.5px; font-weight:800; }.plan-mode-accept-feedback textarea { width:100%; min-height:58px; resize:vertical; border:1px solid #cbd5e1; border-radius:8px; padding:8px 9px; background:#fff; color:#0f172a; font:inherit; font-size:12px; line-height:1.45; box-sizing:border-box; }.plan-mode-accept-feedback textarea:focus { outline:2px solid rgba(37,99,235,.22); border-color:#2563eb; }.plan-mode-accept-feedback textarea:disabled { opacity:.6; cursor:not-allowed; }
.plan-alignment { padding:12px; border:1px solid rgba(34,197,94,.2); border-radius:11px; background:rgba(240,253,244,.78); }.plan-alignment.needs_evidence,.plan-alignment.deviated { border-color:rgba(245,158,11,.28); background:#fffbeb; }.plan-alignment p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.plan-alignment-checks { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:7px; margin-top:10px; }.plan-alignment-checks article { min-width:0; display:grid; grid-template-columns:auto minmax(0,1fr); gap:6px; padding:8px 9px; border:1px solid rgba(245,158,11,.2); border-radius:9px; background:rgba(255,255,255,.78); }.plan-alignment-checks article.ok { border-color:rgba(34,197,94,.22); }.plan-alignment-checks article > span { width:18px; height:18px; display:grid; place-items:center; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11px; font-weight:900; }.plan-alignment-checks article.ok > span { background:#dcfce7; color:#166534; }.plan-alignment-checks strong { display:block; color:#1f2937; font-size:12px; line-height:1.35; overflow-wrap:anywhere; }.plan-alignment-checks small,.plan-alignment-checks em { display:block; margin-top:3px; color:#64748b; font-size:11px; line-height:1.35; overflow-wrap:anywhere; }.plan-alignment-checks em { color:#166534; font-style:normal; }.plan-alignment-deviations { display:grid; gap:6px; margin:10px 0 0; padding:0; list-style:none; }.plan-alignment-deviations li { padding:7px 8px; border-radius:8px; background:rgba(254,243,199,.72); border:1px solid rgba(245,158,11,.2); }.plan-alignment-deviations strong,.plan-alignment-deviations small { display:block; font-size:11.5px; line-height:1.35; overflow-wrap:anywhere; }.plan-alignment-deviations strong { color:#92400e; }.plan-alignment-deviations small { margin-top:3px; color:#64748b; }.plan-alignment-next { display:block; margin-top:8px; color:#166534; font-size:11px; font-weight:800; line-height:1.4; }.plan-alignment.needs_evidence .plan-alignment-next,.plan-alignment.deviated .plan-alignment-next { color:#92400e; }
.section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.section-head label { margin:0; }.section-head span { padding:3px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:11px; font-weight:800; white-space:nowrap; }
.recovery-summary { padding:12px; border:1px solid rgba(37,99,235,.18); border-radius:11px; background:rgba(239,246,255,.74); }.recovery-summary.needs_user { border-color:rgba(245,158,11,.24); background:#fffbeb; }.recovery-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.recovery-summary ul { margin:8px 0 0; padding-left:18px; color:#475569; font-size:12px; line-height:1.55; }.recovery-summary>small { display:block; margin-top:8px; color:#1d4ed8; font-size:11px; font-weight:800; line-height:1.4; }.recovery-checks { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.recovery-checks span { padding:3px 8px; border-radius:999px; background:#e2e8f0; color:#475569; font-size:11px; font-weight:800; }.recovery-checks span.ok { background:#dcfce7; color:#166534; }
.continuation-status { padding:12px; border:1px solid rgba(14,165,233,.2); border-radius:11px; background:rgba(240,249,255,.78); }.continuation-status.deferred,.continuation-status.interrupting,.continuation-status.needs-replan { border-color:rgba(245,158,11,.24); background:#fffbeb; }.continuation-status.active { border-color:rgba(37,99,235,.22); background:#eff6ff; }.continuation-status p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.continuation-status>small { display:block; margin-top:8px; color:#0369a1; font-size:11px; font-weight:800; line-height:1.4; }.continuation-status.needs-replan>small { color:#92400e; }.continuation-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.continuation-meta span { max-width:100%; padding:3px 8px; border-radius:999px; background:rgba(14,165,233,.12); color:#075985; font-size:11px; font-weight:800; overflow-wrap:anywhere; }.continuation-status.needs-replan .continuation-meta span { background:rgba(245,158,11,.14); color:#92400e; }.continuation-steps { display:grid; gap:6px; margin:10px 0 0; padding:0; list-style:none; }.continuation-steps li { padding:7px 8px; border:1px solid rgba(14,165,233,.16); border-radius:8px; background:rgba(255,255,255,.74); }.continuation-status.needs-replan .continuation-steps li { border-color:rgba(245,158,11,.18); }.continuation-steps strong { display:block; color:#075985; font-size:11.5px; line-height:1.35; overflow-wrap:anywhere; }.continuation-status.needs-replan .continuation-steps strong { color:#92400e; }.continuation-steps small { display:block; margin-top:2px; color:#64748b; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }
.agent-progress-summary { padding:12px; border:1px solid rgba(20,184,166,.22); border-radius:11px; background:rgba(240,253,250,.78); }.agent-progress-summary.needs_attention { border-color:rgba(245,158,11,.28); background:#fffbeb; }.agent-progress-summary.completed { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.agent-progress-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.agent-progress-rows { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:8px; margin-top:10px; }.agent-progress-row { min-width:0; display:grid; gap:5px; padding:9px 10px; border:1px solid rgba(148,163,184,.22); border-left:3px solid #14b8a6; border-radius:9px; background:rgba(255,255,255,.78); }.agent-progress-row.completed,.agent-progress-row.done { border-left-color:#16a34a; }.agent-progress-row.blocked,.agent-progress-row.needs_attention { border-left-color:#f59e0b; }.agent-progress-row.failed { border-left-color:#ef4444; }.agent-progress-row.pending,.agent-progress-row.queued { border-left-color:#94a3b8; }.agent-progress-row header { display:flex; align-items:center; justify-content:space-between; gap:8px; min-width:0; }.agent-progress-row strong { min-width:0; color:#134e4a; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.agent-progress-row em { flex:0 0 auto; font-style:normal; color:#475569; font-size:10.5px; font-weight:800; white-space:nowrap; }.agent-progress-row p,.agent-progress-row small { display:block; margin:0; color:#475569; font-size:11px; line-height:1.42; overflow-wrap:anywhere; }.agent-progress-row ul { margin:0; padding-left:16px; color:#92400e; font-size:11px; line-height:1.45; }.agent-progress-evidence { display:flex; flex-wrap:wrap; gap:5px; }.agent-progress-evidence span { max-width:100%; padding:3px 7px; border-radius:999px; background:#ccfbf1; color:#0f766e; font-size:10.5px; font-weight:800; overflow-wrap:anywhere; }.agent-progress-evidence small { display:inline; color:#115e59; font-size:10px; font-weight:700; }.agent-progress-next,.agent-progress-summary-next { color:#0f766e; font-weight:800; }.agent-progress-summary-next { display:block; margin-top:8px; font-size:11px; line-height:1.4; }
.work-items { padding:12px; border:1px solid rgba(99,102,241,.16); border-radius:11px; background:rgba(238,242,255,.58); }.work-item-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; margin-top:10px; }.work-item { min-width:0; padding:9px 10px; border:1px solid rgba(148,163,184,.22); border-left:3px solid #94a3b8; border-radius:9px; background:rgba(255,255,255,.78); }.work-item.in_progress { border-left-color:#2563eb; }.work-item.completed,.work-item.done { border-left-color:#16a34a; }.work-item.blocked { border-left-color:#f59e0b; }.work-item.failed { border-left-color:#ef4444; }.work-item header { display:flex; align-items:center; justify-content:space-between; gap:8px; }.work-item strong { min-width:0; color:#334155; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.work-item em { flex:0 0 auto; font-style:normal; color:#475569; font-size:10.5px; font-weight:800; white-space:nowrap; }.work-item small,.work-item p { display:block; margin:5px 0 0; color:#64748b; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.work-item p { color:#475569; }.work-item-active-form { color:#1d4ed8 !important; font-weight:800; }.work-item-dependencies { display:grid; gap:7px; margin-top:10px; padding:9px 10px; border:1px solid rgba(14,165,233,.18); border-radius:9px; background:rgba(240,249,255,.78); }.work-item-dependencies.ready_to_dispatch { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.work-item-dependencies header { display:flex; justify-content:space-between; gap:8px; align-items:center; }.work-item-dependencies strong { color:#0369a1; font-size:12px; }.work-item-dependencies.ready_to_dispatch strong { color:#166534; }.work-item-dependencies em { font-style:normal; color:#0f766e; font-size:10.5px; font-weight:800; white-space:nowrap; }.work-item-dependencies p { margin:0; color:#334155; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }.work-item-dependencies ul { display:grid; gap:5px; margin:0; padding-left:18px; color:#475569; font-size:11.5px; line-height:1.45; }.work-item-dependencies li span,.work-item-dependencies li small { display:block; overflow-wrap:anywhere; }.work-item-dependencies li small { margin-top:2px; color:#64748b; }.work-item-dependency-next { color:#0369a1; font-size:11px; font-weight:800; line-height:1.4; }.work-item-next { display:grid; gap:6px; margin-top:10px; padding:9px 10px; border:1px solid rgba(37,99,235,.18); border-radius:9px; background:rgba(239,246,255,.76); }.work-item-next strong { color:#1d4ed8; font-size:12px; }.work-item-next div { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }.work-item-next span { display:grid; gap:2px; min-width:0; color:#334155; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }.work-item-next b { color:#334155; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }.work-item-next small { margin:0; font-size:11px; line-height:1.35; overflow-wrap:anywhere; }.work-item-next button { padding:4px 8px; border:1px solid #bfdbfe; border-radius:7px; background:#eff6ff; color:#1d4ed8; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }.work-item-next button:disabled { opacity:.55; cursor:not-allowed; }
.work-item-claim-summary,.work-item-unlock-summary { display:grid; gap:6px; padding:10px 12px; border:1px solid #bfdbfe; border-left:3px solid #2563eb; border-radius:9px; background:#eff6ff; }
.work-item-claim-summary.claimed,.work-item-unlock-summary.auto_dispatch_deferred,.work-item-unlock-summary.auto_dispatch_queued { border-color:#bbf7d0; border-left-color:#16a34a; background:#f0fdf4; }
.work-item-unlock-summary.ready_to_dispatch { border-color:#bae6fd; border-left-color:#0284c7; background:#f0f9ff; }
.work-item-claim-summary :is(p,small),.work-item-unlock-summary :is(p,small,li) { margin:0; color:#334155; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }
.work-item-claim-summary small,.work-item-unlock-summary small { color:#475569; font-weight:700; }
.work-item-unlock-summary ul { display:grid; gap:4px; margin:0; padding-left:18px; }
.work-item-verification-reminder { display:grid; gap:4px; margin-top:10px; padding:9px 10px; border:1px solid #fde68a; border-radius:9px; background:#fffbeb; }
.work-item-verification-reminder strong { color:#92400e; font-size:12px; }
.work-item-verification-reminder small { color:#78350f; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }
.work-item-verification-next { font-weight:800; }
.work-orders { padding:12px; border:1px solid rgba(14,165,233,.18); border-radius:11px; background:rgba(240,249,255,.72); }.work-orders p,.acceptance-review p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.work-order-list { display:grid; gap:8px; margin-top:10px; }.work-order { padding:10px; border-radius:10px; background:rgba(255,255,255,.8); border:1px solid rgba(148,163,184,.24); }.work-order header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px; }.work-order header strong { color:#0f172a; font-size:12px; }.work-order header em { font-style:normal; color:#2563eb; font-size:11px; font-weight:800; white-space:nowrap; }.work-order > small { display:block; color:#475569; font-size:12px; line-height:1.45; }.work-order-cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:7px; margin-top:8px; }.work-order-cols div { padding:7px; border-radius:8px; background:rgba(248,250,252,.88); }.work-order-cols b { display:block; margin-bottom:3px; color:#0369a1; font-size:11px; }.work-order-cols ul { margin:0; padding-left:15px; color:#64748b; font-size:11px; line-height:1.45; }
.agent-coordination { padding:12px; border-radius:11px; border:1px solid rgba(99,102,241,.18); background:rgba(238,242,255,.68); }.agent-coordination.needs_attention { border-color:rgba(245,158,11,.24); background:#fffbeb; }.agent-coordination.blocked { border-color:rgba(239,68,68,.22); background:#fef2f2; }.coord-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:8px; margin-top:10px; }.coord-grid div,.receipt-quality,.targeted-rework,.coord-events { padding:8px 9px; border-radius:9px; border:1px solid rgba(148,163,184,.22); background:rgba(255,255,255,.74); }.coord-grid strong,.receipt-quality strong,.targeted-rework strong,.coord-events strong { display:block; margin-bottom:4px; color:#3730a3; font-size:12px; }.coord-grid small { display:block; color:#475569; font-size:11px; line-height:1.45; overflow-wrap:anywhere; }.coord-grid small code { display:block; width:max-content; max-width:100%; margin-top:3px; padding:2px 5px; border-radius:6px; background:#eef2ff; color:#3730a3; font-size:10px; white-space:normal; overflow-wrap:anywhere; }.receipt-quality,.targeted-rework,.coord-events { margin-top:8px; }.receipt-quality { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }.receipt-quality strong { width:100%; margin-bottom:0; }.receipt-quality span { padding:3px 7px; border-radius:999px; background:#eef2ff; color:#3730a3; font-size:11px; font-weight:800; }.targeted-rework ul { display:grid; gap:6px; margin:0; padding-left:0; color:#475569; font-size:11px; line-height:1.5; list-style:none; }.targeted-rework li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; }.targeted-rework small { color:#64748b; }.targeted-rework button { padding:3px 8px; border:1px solid #fde68a; border-radius:7px; background:#fffbeb; color:#92400e; font-size:11px; font-weight:800; cursor:pointer; }.targeted-rework button:disabled { opacity:.55; cursor:not-allowed; }.coord-events ol { display:grid; gap:5px; margin:0; padding:0; list-style:none; }.coord-events li { display:grid; grid-template-columns:minmax(0,1fr); padding:6px 7px; border-radius:7px; background:#f8fafc; border-left:3px solid #cbd5e1; }.coord-events li.ok { border-left-color:#22c55e; }.coord-events li.warn { border-left-color:#f59e0b; }.coord-events span { color:#334155; font-size:11px; font-weight:800; }.coord-events small { color:#64748b; font-size:10.5px; line-height:1.35; }.coord-next { display:block; margin-top:8px; color:#4338ca; font-size:11px; font-weight:800; }
.child-plan-review { display:grid; gap:8px; margin-top:10px; padding:9px 10px; border:1px solid rgba(59,130,246,.18); border-radius:9px; background:#eff6ff; }.child-plan-review.needs_revision { border-color:rgba(245,158,11,.24); background:#fffbeb; }.child-plan-review.waiting { border-color:rgba(148,163,184,.22); background:#f8fafc; }.child-plan-review p { margin:0; color:#334155; font-size:12px; line-height:1.5; }.child-plan-review-rows { display:grid; gap:7px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); }.child-plan-review article { min-width:0; display:grid; gap:4px; padding:8px 9px; border:1px solid rgba(59,130,246,.14); border-left:3px solid #3b82f6; border-radius:8px; background:rgba(255,255,255,.78); }.child-plan-review article.needs_revision { border-left-color:#f59e0b; }.child-plan-review article.waiting { border-left-color:#94a3b8; }.child-plan-review header { display:flex; align-items:center; justify-content:space-between; gap:8px; min-width:0; }.child-plan-review strong { color:#1e40af; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.child-plan-review em { flex:0 0 auto; color:#475569; font-size:10.5px; font-style:normal; font-weight:800; white-space:nowrap; }.child-plan-review small { color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.child-plan-review .child-plan-reason { color:#334155; font-weight:800; }.child-plan-next { color:#1d4ed8; font-size:11px; font-weight:800; }
.memory-gate-status { display:grid; gap:4px; margin-top:8px; padding:8px 9px; border-radius:9px; border:1px solid rgba(14,165,233,.2); background:rgba(240,249,255,.78); }.memory-gate-status.missing_receipt_reference,.memory-gate-status.missing_candidate_reference,.memory-gate-status.missing_candidate_usage { border-color:rgba(245,158,11,.26); background:#fffbeb; }.memory-gate-status.passed { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.memory-gate-status strong { color:#075985; font-size:12px; }.memory-gate-status.missing_receipt_reference strong,.memory-gate-status.missing_candidate_reference strong,.memory-gate-status.missing_candidate_usage strong { color:#92400e; }.memory-gate-status.passed strong { color:#166534; }.memory-gate-status small { color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }
.receipt-rework-summary { padding:12px; border:1px solid rgba(245,158,11,.26); border-radius:11px; background:#fffbeb; }.receipt-rework-summary.passed { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.receipt-rework-summary.rechecking { border-color:rgba(14,165,233,.22); background:#f0f9ff; }.receipt-rework-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.receipt-rework-summary ul { display:grid; gap:7px; margin:10px 0 0; padding:0; list-style:none; }.receipt-rework-summary li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; padding:8px 9px; border:1px solid rgba(245,158,11,.2); border-radius:9px; background:rgba(255,255,255,.76); }.receipt-rework-resolved li { border-color:rgba(34,197,94,.18); }.receipt-rework-active li { border-color:rgba(14,165,233,.18); }.receipt-rework-summary strong { display:block; color:#92400e; font-size:12px; overflow-wrap:anywhere; }.receipt-rework-summary.passed strong,.receipt-rework-resolved strong { color:#166534; }.receipt-rework-active strong { color:#0369a1; }.receipt-rework-summary small { display:block; margin-top:2px; color:#64748b; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.receipt-rework-summary button { padding:4px 8px; border:1px solid #fde68a; border-radius:7px; background:#fff7ed; color:#92400e; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }.receipt-rework-summary em { padding:3px 7px; border-radius:999px; background:#dcfce7; color:#166534; font-style:normal; font-size:10.5px; font-weight:800; white-space:nowrap; }.receipt-rework-active em { background:#e0f2fe; color:#0369a1; }.receipt-rework-summary button:disabled { opacity:.55; cursor:not-allowed; }.receipt-rework-next { display:block; margin-top:8px; color:#92400e; font-size:11px; font-weight:800; line-height:1.4; }.receipt-rework-summary.passed .receipt-rework-next { color:#166534; }.receipt-rework-summary.rechecking .receipt-rework-next { color:#0369a1; }
.runtime-kernel { padding:10px 12px; border-radius:11px; border:1px solid rgba(15,118,110,.2); background:rgba(240,253,250,.72); }.runtime-kernel.active { border-color:rgba(217,119,6,.28); background:#fffbeb; }.runtime-kernel-summary { display:flex; align-items:center; justify-content:space-between; gap:10px; cursor:pointer; user-select:none; }.runtime-kernel-summary strong { color:#0f766e; font-size:12px; }.runtime-kernel-summary span { color:#64748b; font-size:10.5px; font-weight:800; }.runtime-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:8px; margin-top:10px; }.runtime-grid div { padding:8px 9px; border-radius:9px; border:1px solid rgba(148,163,184,.22); background:rgba(255,255,255,.78); }.runtime-grid strong { display:block; margin-bottom:4px; color:#0f766e; font-size:12px; }.runtime-grid small { display:block; color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.runtime-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.runtime-tags code { max-width:100%; padding:3px 6px; border-radius:6px; background:#ccfbf1; color:#0f766e; font-size:10.5px; white-space:normal; overflow-wrap:anywhere; }.runtime-tool-warnings { display:grid; gap:4px; margin-top:8px; padding:7px 8px; border-radius:8px; background:#fffbeb; border:1px solid rgba(245,158,11,.22); }.runtime-tool-warnings small { color:#92400e; font-size:10.5px; line-height:1.35; overflow-wrap:anywhere; }.runtime-events { display:grid; gap:5px; margin:9px 0 0; padding:0; list-style:none; }.runtime-events li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:6px 7px; border-radius:7px; background:rgba(255,255,255,.78); border-left:3px solid #14b8a6; }.runtime-events span { color:#134e4a; font-size:11px; font-weight:800; overflow-wrap:anywhere; }.runtime-events small { color:#64748b; font-size:10.5px; white-space:nowrap; }
.execution-story { padding:12px; border-radius:11px; background:rgba(248,250,252,.84); border:1px solid rgba(148,163,184,.22); }.execution-steps { display:grid; gap:6px; }.execution-step { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:8px; align-items:start; padding:8px; border-radius:9px; background:rgba(255,255,255,.8); border:1px solid transparent; }.execution-step > span { width:9px; height:9px; margin-top:4px; border-radius:999px; background:#cbd5e1; box-shadow:0 0 0 3px rgba(148,163,184,.14); }.execution-step.done > span { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.14); }.execution-step.active { border-color:rgba(37,99,235,.18); }.execution-step.active > span { background:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.16); }.execution-step.warning > span { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.16); }.execution-step.failed > span { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.16); }.execution-step strong { display:block; color:#334155; font-size:12px; }.execution-step small { display:block; margin-top:2px; color:#64748b; font-size:11px; line-height:1.45; }.execution-step code { display:block; width:max-content; max-width:100%; margin-top:4px; padding:2px 5px; border-radius:6px; background:#f1f5f9; color:#475569; font-size:10px; overflow-wrap:anywhere; white-space:normal; }.execution-step em { align-self:center; font-style:normal; color:#64748b; font-size:10px; white-space:nowrap; }
.test-agent-plan-summary { padding:12px; border:1px solid rgba(59,130,246,.2); border-radius:11px; background:#eff6ff; }
.test-agent-plan-summary.blocked { border-color:rgba(245,158,11,.28); background:#fffbeb; }
.test-agent-plan-summary.ready { border-color:rgba(14,165,233,.22); background:rgba(240,249,255,.8); }
.test-agent-plan-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
.test-agent-plan-summary ul { display:grid; gap:5px; margin:9px 0 0; padding-left:18px; color:#475569; font-size:11.5px; line-height:1.45; }
.test-agent-plan-issues { display:grid; gap:4px; margin-top:9px; padding:8px 9px; border:1px solid rgba(245,158,11,.24); border-radius:9px; background:rgba(255,251,235,.78); }
.test-agent-plan-issues strong { color:#92400e; font-size:11.5px; }
.test-agent-plan-issues small { color:#78350f; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }
.test-agent-plan-next { display:block; margin-top:8px; color:#1d4ed8; font-size:11px; font-weight:800; line-height:1.4; }
.test-agent-plan-summary.blocked .test-agent-plan-next { color:#92400e; }
.acceptance-review { padding:12px; border-radius:11px; border:1px solid rgba(245,158,11,.24); background:#fffbeb; }.acceptance-review.passed { border-color:rgba(34,197,94,.24); background:#f0fdf4; }.acceptance-review .section-head span { background:#fef3c7; color:#92400e; }.acceptance-review.passed .section-head span { background:#dcfce7; color:#166534; }.acceptance-checks { display:grid; grid-template-columns:repeat(auto-fit,minmax(145px,1fr)); gap:7px; margin-top:10px; }.acceptance-checks div { display:grid; grid-template-columns:auto 1fr; gap:2px 6px; padding:8px; border-radius:9px; background:rgba(255,255,255,.72); border:1px solid rgba(245,158,11,.18); }.acceptance-checks div.ok { border-color:rgba(34,197,94,.18); }.acceptance-checks span { grid-row:1/3; width:17px; height:17px; border-radius:999px; display:grid; place-items:center; background:#fef3c7; color:#92400e; font-size:11px; font-weight:900; }.acceptance-checks div.ok span { background:#dcfce7; color:#166534; }.acceptance-checks strong { color:#334155; font-size:12px; }.acceptance-checks small { color:#64748b; font-size:11px; line-height:1.35; }.acceptance-next { display:block; margin-top:8px; color:#92400e; font-size:11px; font-weight:700; }
.completion-readiness { display:grid; gap:8px; padding:12px; border:1px solid #fde68a; border-left:3px solid #f59e0b; border-radius:9px; background:#fffbeb; }
.completion-readiness.ready { border-color:#bbf7d0; border-left-color:#16a34a; background:#f0fdf4; }
.completion-readiness p,.completion-readiness>small { margin:0; color:#78350f; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }
.completion-readiness.ready :is(p,small) { color:#166534; }
.completion-readiness ul { display:grid; gap:5px; margin:0; padding:0; list-style:none; }
.completion-readiness li { display:grid; grid-template-columns:minmax(70px,auto) minmax(0,1fr) auto; gap:7px; align-items:center; padding:7px 8px; border:1px solid rgba(245,158,11,.18); border-radius:8px; background:rgba(255,255,255,.76); }
.completion-readiness li strong,.completion-readiness li span { min-width:0; color:#334155; font-size:11px; overflow-wrap:anywhere; }
.completion-readiness li em { color:#92400e; font-size:10.5px; font-style:normal; font-weight:800; white-space:nowrap; }
.independent-review-summary { padding:12px; border:1px solid rgba(14,165,233,.2); border-radius:11px; background:rgba(240,249,255,.78); }
.independent-review-summary.passed { border-color:rgba(34,197,94,.24); background:#f0fdf4; }
.independent-review-summary.needs_rework,.independent-review-summary.needs_recheck,.independent-review-summary.needs_user { border-color:rgba(245,158,11,.28); background:#fffbeb; }
.independent-review-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
.independent-review-summary ul { display:grid; gap:5px; margin:9px 0 0; padding-left:18px; color:#475569; font-size:11.5px; line-height:1.45; }
.independent-review-summary small { display:block; margin-top:8px; color:#0369a1; font-size:11px; font-weight:800; line-height:1.4; }
.independent-review-summary.passed small { color:#166534; }
.independent-review-summary.needs_rework small,.independent-review-summary.needs_recheck small,.independent-review-summary.needs_user small { color:#92400e; }
.post-review-spot-check-summary { padding:12px; border:1px solid rgba(14,165,233,.2); border-radius:11px; background:rgba(240,249,255,.78); }
.post-review-spot-check-summary.passed { border-color:rgba(34,197,94,.24); background:#f0fdf4; }
.post-review-spot-check-summary.needs_recheck,.post-review-spot-check-summary.needs_user { border-color:rgba(245,158,11,.28); background:#fffbeb; }
.post-review-spot-check-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }
.post-review-spot-check-summary ul { display:grid; gap:5px; margin:9px 0 0; padding-left:18px; color:#475569; font-size:11.5px; line-height:1.45; }
.post-review-spot-check-summary small { display:block; margin-top:8px; color:#0369a1; font-size:11px; font-weight:800; line-height:1.4; }
.post-review-spot-check-summary.passed small { color:#166534; }
.post-review-spot-check-summary.needs_recheck small,.post-review-spot-check-summary.needs_user small { color:#92400e; }
.task-card-agents { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px; margin-top:12px; }.task-card-agent { display:grid; grid-template-columns:1fr auto; gap:3px 8px; padding:8px 10px; border-radius:9px; background:rgba(255,255,255,.82); border:1px solid #e2e8f0; font-size:12px; }.task-card-agent small { grid-column:1/-1; color:#64748b; }.task-card-section ul { margin:0; padding-left:18px; color:#475569; font-size:12px; line-height:1.65; }.task-card-section.completed li::marker { color:#16a34a; }.task-card-section.blockers { padding:10px; border-radius:9px; background:#fff7ed; }
.requirement-epic-plan { padding:12px; border:1px solid rgba(124,58,237,.22); border-radius:11px; background:rgba(245,243,255,.72); }.requirement-epic-items { display:grid; gap:7px; margin-top:9px; }.requirement-epic-item { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:9px 10px; border:1px solid rgba(124,58,237,.16); border-left:3px solid #8b5cf6; border-radius:9px; background:rgba(255,255,255,.78); }.requirement-epic-item>div { min-width:0; display:grid; gap:2px; }.requirement-epic-item strong { color:#4c1d95; font-size:12px; overflow-wrap:anywhere; }.requirement-epic-item small,.requirement-epic-item p { color:#64748b; font-size:10.5px; line-height:1.4; }.requirement-epic-item>span { color:#6d28d9; font-size:10.5px; font-weight:800; white-space:nowrap; }.requirement-epic-item p { grid-column:1/-1; margin:0; }.requirement-epic-item.done,.requirement-epic-item.completed { border-left-color:#22c55e; }.requirement-epic-item.failed,.requirement-epic-item.blocked { border-left-color:#ef4444; }
.requirement-epic-item .requirement-epic-branch.ready { color:#166534; font-weight:800; }.requirement-epic-item .requirement-epic-branch.waiting { color:#92400e; font-weight:800; }.requirement-epic-item .requirement-epic-branch.blocked { color:#b91c1c; font-weight:800; }
.task-card-flow ol { display:grid; gap:7px; margin:0; padding:0; list-style:none; }.task-card-flow li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:start; gap:8px; padding:8px 9px; border:1px solid #e2e8f0; border-radius:9px; background:rgba(255,255,255,.74); font-size:12px; }.task-card-flow strong { display:block; color:#334155; }.task-card-flow small { display:block; margin-top:2px; color:#64748b; line-height:1.45; }.task-card-flow em { align-self:center; font-style:normal; font-size:10px; color:#64748b; }.flow-dot { width:9px; height:9px; margin-top:4px; border-radius:999px; background:#cbd5e1; box-shadow:0 0 0 3px rgba(148,163,184,.16); }.task-card-flow li.done .flow-dot { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.14); }.task-card-flow li.active .flow-dot { background:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.16); }.task-card-flow li.warning .flow-dot { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.18); }.task-card-flow li.failed .flow-dot { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.16); }
.task-card-qa { display:grid; gap:7px; }.task-card-qa-row { display:grid; grid-template-columns:1fr auto; gap:3px 8px; padding:8px 9px; border-radius:9px; border:1px solid #e2e8f0; background:rgba(255,255,255,.72); font-size:12px; }.task-card-qa-row strong { color:#334155; }.task-card-qa-row span { color:#2563eb; font-weight:700; font-size:11px; }.task-card-qa-row small { grid-column:1/-1; color:#64748b; line-height:1.45; overflow-wrap:anywhere; }.task-card-qa-row .qa-summary { color:#334155; font-weight:700; }.task-card-qa-row .qa-next { color:#1d4ed8; font-weight:800; }.task-card-qa-row.waiting span { color:#92400e; }.task-card-qa-row.accepted span { color:#166534; }.qa-badges { grid-column:1/-1; display:flex; flex-wrap:wrap; gap:5px; margin-top:3px; }.qa-badges em { padding:2px 7px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:10.5px; font-style:normal; font-weight:800; }
.task-card-conflicts { padding:10px; border-radius:9px; background:#fffbeb; }.task-card-conflict { display:grid; gap:4px; font-size:12px; }.task-card-conflict + .task-card-conflict { margin-top:8px; padding-top:8px; border-top:1px solid rgba(245,158,11,.22); }.task-card-conflict strong { color:#92400e; }.task-card-conflict span { color:#64748b; line-height:1.45; }.task-card-conflict code { width:max-content; max-width:100%; padding:3px 6px; border-radius:6px; background:rgba(245,158,11,.12); color:#92400e; overflow-wrap:anywhere; }
.task-card-next { margin-top:13px; padding:10px 12px; border-radius:9px; background:#eff6ff; font-size:12px; }.task-card-next span { color:#64748b; }.task-card-next strong { color:#1e40af; text-align:right; }.task-dispatch-launch-summary { padding:12px; border:1px solid rgba(59,130,246,.2); border-radius:10px; background:#eff6ff; }.task-dispatch-launch-summary .dispatch-launch-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }.task-dispatch-launch-summary .dispatch-launch-head label { margin:0; color:#1e3a8a; }.task-dispatch-launch-summary .dispatch-launch-head span { flex:0 0 auto; color:#2563eb; font-size:11px; font-weight:800; white-space:nowrap; }.task-dispatch-launch-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.task-dispatch-launch-summary .dispatch-launch-list { display:grid; gap:8px; margin-top:9px; }.task-dispatch-launch-summary article { min-width:0; display:grid; gap:4px; padding:9px 10px; border:1px solid rgba(59,130,246,.16); border-left:3px solid #3b82f6; border-radius:8px; background:rgba(255,255,255,.78); }.task-dispatch-launch-summary header { display:flex; align-items:center; justify-content:space-between; gap:8px; min-width:0; }.task-dispatch-launch-summary strong { color:#1e40af; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.task-dispatch-launch-summary em { flex:0 0 auto; color:#475569; font-size:10.5px; font-style:normal; font-weight:800; white-space:nowrap; }.task-dispatch-launch-summary article span,.task-dispatch-launch-summary article small,.task-dispatch-launch-summary .dispatch-launch-next { display:block; color:#475569; font-size:11px; line-height:1.42; overflow-wrap:anywhere; }.task-dispatch-launch-summary .dispatch-launch-next { margin-top:8px; color:#1d4ed8; font-weight:800; }.completion-overview { padding:12px; border:1px solid rgba(34,197,94,.22); border-radius:11px; background:#f0fdf4; }.completion-overview.failed { border-color:rgba(239,68,68,.22); background:#fef2f2; }.completion-overview.cancelled,.completion-overview.canceled { border-color:rgba(100,116,139,.2); background:#f8fafc; }.completion-overview p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; }.completion-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(118px,1fr)); gap:8px; margin-top:10px; }.completion-metrics div { min-width:0; display:grid; gap:3px; padding:8px; border:1px solid rgba(34,197,94,.16); border-radius:9px; background:rgba(255,255,255,.76); }.completion-metrics div.warning { border-color:rgba(245,158,11,.2); }.completion-metrics div.danger { border-color:rgba(239,68,68,.2); }.completion-metrics small { color:#64748b; font-size:10.5px; font-weight:800; }.completion-metrics strong { color:#166534; font-size:13px; overflow-wrap:anywhere; }.completion-metrics em { color:#64748b; font-size:10.5px; font-style:normal; line-height:1.35; overflow-wrap:anywhere; }.completion-lists { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; margin-top:10px; }.completion-lists section { display:grid; gap:4px; padding:8px; border:1px solid rgba(148,163,184,.18); border-radius:9px; background:rgba(255,255,255,.72); }.completion-lists strong { color:#334155; font-size:11.5px; }.completion-lists small { color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.completion-next,.completion-tech-hint { display:block; margin-top:8px; color:#166534; font-size:11px; font-weight:800; line-height:1.4; }.completion-tech-hint { color:#64748b; font-weight:700; }.quality-followup { padding:12px; border:1px solid rgba(245,158,11,.28); border-radius:11px; background:#fffbeb; }.quality-followup p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.quality-followup-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:8px; margin-top:10px; }.quality-followup-grid section { display:grid; gap:4px; padding:8px; border:1px solid rgba(245,158,11,.2); border-radius:9px; background:rgba(255,255,255,.78); }.quality-followup-grid strong { color:#92400e; font-size:11.5px; }.quality-followup-grid small { color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.quality-followup-next { display:block; margin-top:8px; color:#92400e; font-size:11px; font-weight:800; line-height:1.4; }.task-card-delivery { margin-top:10px; color:#166534; font-size:12px; }.task-card-delivery span { max-width:70%; }.delivery-report { padding:10px; border:1px solid rgba(34,197,94,.16); border-radius:9px; background:#f8fafc; }.delivery-report p { margin:7px 0 0; color:#334155; font-size:12px; line-height:1.5; }.pickup-summary { display:grid; gap:6px; margin-top:9px; padding:9px 10px; border:1px solid rgba(37,99,235,.16); border-radius:8px; background:#eff6ff; }.pickup-summary.failed { border-color:rgba(239,68,68,.18); background:#fef2f2; }.pickup-summary.cancelled { border-color:rgba(100,116,139,.18); background:#f8fafc; }.pickup-summary header { display:flex; justify-content:space-between; gap:8px; align-items:center; }.pickup-summary strong { color:#1e40af; font-size:12px; }.pickup-summary.failed strong { color:#b91c1c; }.pickup-summary.cancelled strong { color:#475569; }.pickup-summary span { color:#64748b; font-size:10.5px; font-weight:800; white-space:nowrap; }.pickup-summary ul { display:grid; gap:4px; margin:0; padding-left:16px; color:#334155; font-size:11px; line-height:1.4; }.pickup-summary small { color:#1e40af; font-size:11px; font-weight:800; line-height:1.35; }.pickup-summary.failed small { color:#b91c1c; }.delivery-report-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:9px; }.delivery-report-grid section { min-width:0; display:grid; gap:4px; padding:8px; border:1px solid rgba(148,163,184,.18); border-radius:8px; background:rgba(255,255,255,.72); }.delivery-report-grid strong { color:#166534; font-size:11.5px; }.delivery-report-grid small { color:#475569; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.user-request-summary { padding:12px; border:1px solid rgba(245,158,11,.28); border-radius:11px; background:#fffbeb; }.user-request-summary.confirmation { border-color:rgba(124,58,237,.24); background:#f5f3ff; }.user-request-summary p,.user-request-summary small,.user-request-summary li { color:#475569; font-size:11px; line-height:1.45; overflow-wrap:anywhere; }.user-request-summary p { margin:8px 0 0; font-size:12px; color:#334155; }.user-request-question { display:grid; gap:3px; margin-top:9px; padding:9px 10px; border:1px solid rgba(245,158,11,.2); border-radius:9px; background:rgba(255,255,255,.76); }.user-request-summary.confirmation .user-request-question { border-color:rgba(124,58,237,.2); }.user-request-question strong { color:#92400e; font-size:12.5px; line-height:1.45; overflow-wrap:anywhere; }.user-request-summary.confirmation .user-request-question strong { color:#5b21b6; }.user-request-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.user-request-meta span { max-width:100%; padding:3px 8px; border-radius:999px; background:rgba(245,158,11,.13); color:#92400e; font-size:10.5px; font-weight:800; overflow-wrap:anywhere; }.user-request-summary.confirmation .user-request-meta span { background:rgba(124,58,237,.12); color:#5b21b6; }.user-request-reason { font-weight:700; }.user-request-suggestions { display:grid; gap:4px; margin:8px 0 0; padding-left:18px; }.user-request-next { display:block; margin-top:8px; color:#92400e; font-weight:800; }.user-request-summary.confirmation .user-request-next { color:#5b21b6; }.user-handoff { padding:12px; border:1px solid rgba(37,99,235,.2); border-radius:11px; background:rgba(239,246,255,.78); }.user-handoff.ready { border-color:rgba(34,197,94,.22); background:#f0fdf4; }.user-handoff.failed,.user-handoff.needs_attention { border-color:rgba(245,158,11,.28); background:#fffbeb; }.user-handoff.cancelled,.user-handoff.reverted { border-color:rgba(100,116,139,.2); background:#f8fafc; }.user-handoff p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.handoff-primary-action,.handoff-secondary-actions article { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; margin-top:9px; padding:9px 10px; border:1px solid rgba(148,163,184,.2); border-radius:9px; background:rgba(255,255,255,.78); }.handoff-secondary-actions { display:grid; gap:7px; margin-top:7px; }.handoff-primary-action strong,.handoff-secondary-actions strong { display:block; color:#1e3a8a; font-size:12px; line-height:1.35; overflow-wrap:anywhere; }.user-handoff.ready .handoff-primary-action strong { color:#166534; }.user-handoff.failed .handoff-primary-action strong,.user-handoff.needs_attention .handoff-primary-action strong { color:#92400e; }.handoff-primary-action small,.handoff-secondary-actions small { display:block; margin-top:2px; color:#64748b; font-size:11px; line-height:1.4; overflow-wrap:anywhere; }.handoff-primary-action button,.handoff-secondary-actions button { padding:5px 9px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#334155; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }.handoff-primary-action button.primary,.handoff-secondary-actions button.primary { background:#2563eb; border-color:#2563eb; color:#fff; }.handoff-primary-action button.warning,.handoff-secondary-actions button.warning { border-color:#fde68a; background:#fffbeb; color:#92400e; }.handoff-primary-action button:disabled,.handoff-secondary-actions button:disabled { opacity:.55; cursor:not-allowed; }.handoff-evidence { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }.handoff-evidence span { max-width:100%; padding:3px 8px; border-radius:999px; background:#e0f2fe; color:#075985; font-size:10.5px; font-weight:800; overflow-wrap:anywhere; }.user-handoff.ready .handoff-evidence span { background:#dcfce7; color:#166534; }.handoff-unresolved { display:grid; gap:5px; margin:9px 0 0; padding-left:18px; color:#92400e; font-size:11px; line-height:1.45; }.handoff-tech-hint { display:block; margin-top:8px; color:#64748b; font-size:11px; font-weight:700; line-height:1.4; }.task-card-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }.task-card-button { padding:6px 10px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#334155; cursor:pointer; font-size:12px; }.task-card-button:disabled { opacity:.55; cursor:not-allowed; }.task-card-button.primary { background:#2563eb; border-color:#2563eb; color:#fff; }.task-card-button.danger { color:#b91c1c; border-color:#fecaca; }.task-card-button.warning { color:#92400e; border-color:#fde68a; background:#fffbeb; }
.change-summary { padding:12px; border:1px solid rgba(37,99,235,.18); border-radius:11px; background:rgba(239,246,255,.66); }.change-summary p { margin:8px 0 0; color:#334155; font-size:12px; line-height:1.5; overflow-wrap:anywhere; }.change-file-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:7px; margin-top:10px; }.change-file-row { min-width:0; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; padding:8px 9px; border:1px solid rgba(148,163,184,.2); border-left:3px solid #2563eb; border-radius:9px; background:rgba(255,255,255,.78); text-align:left; cursor:pointer; }.change-file-row:disabled { opacity:.55; cursor:not-allowed; }.change-file-row strong { display:block; color:#1e293b; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.change-file-row small { display:block; margin-top:3px; color:#64748b; font-size:10.5px; line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.change-file-row em { color:#2563eb; font-style:normal; font-size:10.5px; font-weight:900; white-space:nowrap; }.change-summary-next { display:block; margin-top:8px; color:#1d4ed8; font-size:11px; font-weight:800; line-height:1.4; }
.task-card-technical { margin-top:12px; font-size:11px; color:#64748b; }.task-card-technical summary { cursor:pointer; font-weight:800; }.technical-section { display:grid; gap:5px; margin-top:8px; padding:8px; border:1px solid rgba(148,163,184,.18); border-radius:8px; background:rgba(248,250,252,.72); }.technical-section>strong { color:#334155; font-size:11.5px; }.task-card-technical div { display:grid; grid-template-columns:70px minmax(0,1fr) auto; gap:8px; align-items:center; margin-top:0; }.task-card-technical code { overflow-wrap:anywhere; color:#475569; }.task-card-technical button { padding:2px 7px; border:1px solid #cbd5e1; border-radius:6px; background:#fff; color:#334155; font-size:10.5px; font-weight:800; cursor:pointer; }.task-card-technical button:disabled { opacity:.55; cursor:not-allowed; }
:global([data-theme="dark"] .task-experience-card){ background:linear-gradient(145deg,rgba(15,23,42,.96),rgba(30,41,59,.92)); border-color:rgba(96,165,250,.3); }:global([data-theme="dark"] .context-global) { border-color:rgba(167,139,250,.35); }:global([data-theme="dark"] .context-project) { border-color:rgba(52,211,153,.32); }.task-experience-card :is(.task-card-goal,.task-card-agent,.task-card-section ul,.task-card-next strong,.task-card-technical code) { color:inherit; }:global([data-theme="dark"] .task-dispatch-launch-summary){ border-color:rgba(96,165,250,.26); background:rgba(30,41,59,.72); }:global([data-theme="dark"] .task-dispatch-launch-summary article){ background:rgba(15,23,42,.72); border-color:rgba(96,165,250,.2); }:global([data-theme="dark"] .task-dispatch-launch-summary :is(label,strong,.dispatch-launch-next)){ color:#93c5fd; }:global([data-theme="dark"] .task-dispatch-launch-summary :is(p,span,small,em)){ color:#cbd5e1; }
:global([data-theme="dark"] .work-item-claim-summary),:global([data-theme="dark"] .work-item-unlock-summary){ border-color:rgba(59,130,246,.36); background:rgba(30,58,138,.25); }
:global([data-theme="dark"] .work-item-claim-summary.claimed),:global([data-theme="dark"] .work-item-unlock-summary.auto_dispatch_deferred),:global([data-theme="dark"] .work-item-unlock-summary.auto_dispatch_queued){ border-color:rgba(34,197,94,.36); background:rgba(20,83,45,.28); }
:global([data-theme="dark"] .work-item-claim-summary :is(p,small)),:global([data-theme="dark"] .work-item-unlock-summary :is(p,small,li)){ color:#dbeafe; }
:global([data-theme="dark"] .work-item-verification-reminder){ border-color:rgba(245,158,11,.32); background:rgba(120,53,15,.28); }
:global([data-theme="dark"] .work-item-verification-reminder :is(strong,small)){ color:#fde68a; }
.handoff-summary-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:7px; margin-top:9px; }
.handoff-summary-cards article { min-width:0; display:grid; gap:3px; padding:8px 9px; border:1px solid rgba(148,163,184,.18); border-radius:8px; background:rgba(255,255,255,.74); }
.handoff-summary-cards article.ok { border-color:rgba(34,197,94,.18); background:rgba(240,253,244,.78); }
.handoff-summary-cards article.warning,.handoff-summary-cards article.action { border-color:rgba(245,158,11,.22); background:rgba(255,251,235,.78); }
.handoff-summary-cards small { color:#64748b; font-size:10.5px; font-weight:800; line-height:1.25; }
.handoff-summary-cards strong { color:#334155; font-size:11.5px; line-height:1.35; overflow-wrap:anywhere; }
.handoff-summary-cards article.ok strong { color:#166534; }
.handoff-summary-cards article.warning strong,.handoff-summary-cards article.action strong { color:#92400e; }
:global([data-theme="dark"] .handoff-summary-cards article){ border-color:rgba(148,163,184,.28); background:rgba(15,23,42,.62); }
:global([data-theme="dark"] .handoff-summary-cards small){ color:#94a3b8; }
:global([data-theme="dark"] .handoff-summary-cards strong){ color:#e2e8f0; }
</style>
