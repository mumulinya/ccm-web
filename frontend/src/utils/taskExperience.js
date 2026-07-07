import { sanitizeUserFacingAgentText, sanitizeUserFacingStructure } from './agentDisplay.js'

const asArray = (value) => Array.isArray(value) ? value : []
const toList = (...values) => values.flatMap(value => Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
const uniq = (items) => [...new Set(asArray(items).map(item => String(item || '').trim()).filter(Boolean))]
const getUnifiedDeliveryReport = (source) => source?.delivery_report
  || source?.deliveryReport
  || source?.final_delivery_report
  || source?.finalDeliveryReport
  || source?.final_report?.delivery_report
  || source?.finalReport?.deliveryReport
  || source?.display_stream?.delivery_report
  || source?.displayStream?.deliveryReport
  || source?.workchain?.delivery_report
  || source?.workchain?.completion_summary?.delivery_report
  || null
const normalizeDeliveryFile = (item, fallbackProject = '') => {
  if (!item) return null
  if (typeof item === 'string') {
    const text = item.trim()
    return text ? { path: text, project: fallbackProject, statusText: '变更', statusColor: '#64748b' } : null
  }
  const path = String(item.path || item.file || item.name || '').trim()
  if (!path) return null
  return {
    ...item,
    path,
    project: item.project || item.target_project || item.projectName || item.agent || fallbackProject || '',
    statusText: item.statusText || item.status || item.status_kind || '变更',
    statusColor: item.statusColor || '#64748b',
    additions: Number(item.additions || item.diff?.additions || 0),
    deletions: Number(item.deletions || item.diff?.deletions || 0),
  }
}
const deliveryFileKey = (file) => String(file?.path || '').trim().replace(/\\/g, '/').toLowerCase()
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
const mergeDeliveryFile = (current, incoming) => ({
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
const uniqDeliveryFiles = (items) => {
  const byPath = new Map()
  asArray(items).map(item => normalizeDeliveryFile(item)).filter(Boolean).forEach(file => {
    const key = deliveryFileKey(file)
    if (!key) return
    byPath.set(key, byPath.has(key) ? mergeDeliveryFile(byPath.get(key), file) : file)
  })
  return [...byPath.values()]
}
const compact = (value, max = 220) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}
const INTERNAL_CARD_TEXT_PATTERN = /CCM_AGENT_RECEIPT|trace_id|session_id|run_id|workflow_timeline|Runtime Kernel|raw_report|raw\s+receipt|raw\s+payload|原始回执|stack/i
const friendlyTerminalText = (value, fallback, max = 260) => {
  const text = compact(value, max)
  if (!text) return fallback
  return sanitizeUserFacingAgentText(INTERNAL_CARD_TEXT_PATTERN.test(text) ? fallback : text, fallback, max)
}
const buildRunTerminalFallbackDeliveryReport = (run = {}, report = {}, message = {}, phase = '') => {
  if (!['failed', 'cancelled'].includes(phase)) return null
  const failed = phase === 'failed'
  const headline = friendlyTerminalText(
    report.summary || run.error || run.final_reply || message.content,
    failed ? '任务没有完成，主 Agent 已整理未完成原因和下一步。' : '任务已取消，当前状态已整理。'
  )
  const risks = uniq(toList(run.error, run.last_error, report.error, report.risks, report.remaining_items, run.risks))
  const nextAction = failed ? '可以重新执行，系统会复用已有证据。' : '如需继续，可以重新发起这个需求。'
  return {
    schema: 'ccm-main-agent-delivery-report-v1',
    surface: 'global',
    status: failed ? 'failed' : 'cancelled',
    status_label: failed ? '未完成' : '已取消',
    title: compact(run.goal || run.user_message || message.content || '全局任务', 120),
    headline,
    sections: [
      { id: 'completed', title: failed ? '处理结果' : '停止说明', items: [headline] },
      { id: 'scope', title: '涉及范围', items: ['未检测到代码文件变更。'] },
      { id: 'verification', title: '验证结果', items: ['暂无系统捕获的验证命令。'] },
      { id: 'acceptance', title: '验收结论', items: [failed ? '主 Agent 验收：未通过，原因已整理在未完成原因里。' : '主 Agent 验收：任务已停止，未继续验收。'] },
      { id: 'risks', title: failed ? '未完成原因' : '停止原因', items: risks.length ? risks.map(item => friendlyTerminalText(item, failed ? '执行过程中遇到需要处理的问题。' : '任务已停止。')) : [failed ? '未捕获到明确失败原因；排障信息已放入技术详情。' : '任务已停止；没有继续执行。'] },
      { id: 'next_action', title: '下一步', items: [nextAction] },
    ],
    files: [],
    verification: [],
    acceptance: [failed ? '主 Agent 验收：未通过，原因已整理在未完成原因里。' : '主 Agent 验收：任务已停止，未继续验收。'],
    risks,
    next_action: nextAction,
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
}
const buildRecoverySummary = (source = {}) => {
  const existing = source.recovery_summary || source.recoverySummary
  if (existing) return existing
  const reasoning = source.reasoning_loop || source.reasoningLoop || {}
  const checks = asArray(reasoning.recovery_checks || reasoning.recoveryChecks)
  const recovery = source.recovery || {}
  const resumeCount = Number(source.resume_count || source.resumeCount || recovery.lease_recovery_count || 0)
  if (!checks.length && !resumeCount && !source.recovery_pending && !recovery.recovered_at && !recovery.revalidated_at) return null
  const latest = checks[checks.length - 1] || {}
  const remaining = uniq(latest.remaining_gaps || latest.remainingGaps || source.remaining_gaps || source.remainingGaps || [])
  return {
    schema: 'ccm-main-agent-recovery-summary-v1',
    title: '恢复接续',
    status: source.recovery_pending ? 'needs_user' : ['completed', 'done', 'failed', 'cancelled'].includes(String(source.status || '')) ? 'recorded' : 'active',
    mode: recovery.mode || (resumeCount ? 'resume' : 'recovery'),
    headline: source.recovery_pending
      ? '检测到上次任务没有完整收尾，主 Agent 已暂停并等待你确认是否继续。'
      : '主 Agent 已接上上次任务上下文，重新核对目标、当前状态和验收条件后继续推进。',
    revalidated: {
      goal: latest.goal_revalidated === true || latest.goalRevalidated === true || checks.length === 0,
      state: latest.state_revalidated === true || latest.stateRevalidated === true || checks.length === 0,
      acceptance: latest.acceptance_revalidated === true || latest.acceptanceRevalidated === true || checks.length === 0,
    },
    preserved: uniq([
      resumeCount ? `恢复 ${resumeCount} 次运行上下文` : '',
      source.work_items?.length || source.workItems?.length ? `恢复 ${source.work_items?.length || source.workItems?.length} 个执行队列工作项` : '',
    ]),
    remaining_gaps: remaining.slice(0, 6),
    next_action: remaining.length ? '继续处理恢复后仍未满足的验收缺口。' : '继续使用恢复后的上下文执行并等待验收。',
    technical: {
      recovery_checks: checks.length,
      lease_recovery_count: resumeCount,
      previous_status: recovery.previous_status || '',
      recovered_at: recovery.recovered_at || recovery.revalidated_at || '',
    },
  }
}
const buildContinuationStatus = (source = {}) => {
  const existing = source.continuation_status || source.continuationStatus || source.rework_status || source.reworkStatus
  if (existing) return existing
  const state = source.collaboration_state || source.collaborationState || {}
  const last = state.last_continuation || state.lastContinuation || source.last_continuation || source.lastContinuation
  if (!last?.at) return null
  const kind = String(last.rework_kind || last.reworkKind || last.kind || '').trim()
  const sourceName = String(last.source || source.last_continue_source || source.lastContinueSource || '').trim()
  const target = compact(last.target || last.agent || last.project || '', 80)
  const reason = compact(last.reason || last.detail || last.title || last.label || '', 180)
  const isNextWorkItem = kind === 'next_claimable_work_item' || /next_work_item|user_next_work_item/i.test(`${sourceName} ${kind}`)
  const isTargeted = isNextWorkItem || /targeted|gap_rework|rework|ack_rewrite|missing_|contract_|weak_receipt/i.test(`${sourceName} ${kind}`)
  const continuationKind = ['supplement', 'revise_goal', 'new_task'].includes(String(last.kind || '').trim()) ? String(last.kind || '').trim() : 'supplement'
  const replanRequired = continuationKind === 'revise_goal' || last.replan_required === true || last.replanRequired === true
  const interruptCurrentRun = replanRequired && (last.interrupt_current_run === true || last.interruptCurrentRun === true)
  const status = ['pending', 'queued'].includes(String(source.status || '').toLowerCase())
    ? 'queued'
    : String(last.status || (String(source.status || '').toLowerCase() === 'in_progress' ? 'active' : 'accepted'))
  const routeLabel = last.route_label || last.routeLabel || (status === 'deferred'
    ? interruptCurrentRun
      ? '先停止当前轮再重核计划'
      : '本轮结束后接续'
    : status === 'interrupting'
      ? '先停止当前轮再重核计划'
    : replanRequired
      ? '先重核计划再继续'
      : isNextWorkItem
        ? '继续派发已解锁工作项'
        : isTargeted
          ? '定向返工'
          : '并入同一任务')
  const nextAction = ['deferred', 'interrupting'].includes(status)
    ? replanRequired && interruptCurrentRun
      ? '主 Agent 正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。'
      : replanRequired
      ? '当前执行轮结束后，主 Agent 会先重新核对目标、影响范围和验收条件，再决定是否继续派发或返工。'
      : '当前执行轮结束后，主 Agent 会自动接着处理这条补充。'
    : replanRequired
      ? '主 Agent 会复用原任务上下文重新核对计划，必要时重新派发子 Agent，完成后重新验收并总结。'
      : '主 Agent 会复用原任务证据继续执行，完成后重新验收并总结。'
  return {
    schema: 'ccm-main-agent-continuation-status-v1',
    title: isNextWorkItem ? '下一步派发已接上' : isTargeted ? '定向补充已接上' : replanRequired ? '目标调整已接收' : '补充要求已接收',
    status,
    status_label: ({ queued: '已入队', accepted: '已接收', active: '处理中', deferred: '本轮后继续', interrupting: '正在停止当前轮' })[status] || '已接收',
    headline: isNextWorkItem
      ? `主 Agent 已接收${target ? ` ${target} 的` : ''}已解锁工作项，只推进这一小步。`
      : isTargeted
        ? `主 Agent 已接收${target ? ` ${target} 的` : ''}返工缺口，会复用当前任务上下文继续处理。`
        : replanRequired && interruptCurrentRun
          ? '主 Agent 已收到新的目标边界，会先停止可能跑偏的当前执行轮，再重新核对计划。'
          : replanRequired
          ? '主 Agent 已收到新的目标边界，会先重新核对计划，再在同一任务里继续推进。'
          : '主 Agent 已收到你的补充要求，会在同一任务里继续处理。',
    kind: continuationKind,
    kind_label: ({ supplement: '补充要求', revise_goal: '目标调整', new_task: '独立新任务' })[continuationKind] || '补充要求',
    strategy: last.strategy || (replanRequired ? 'replan_same_task' : isNextWorkItem ? 'continue_next_work_item' : isTargeted ? 'targeted_rework' : 'continue_same_task'),
    route_label: routeLabel,
    replan_required: replanRequired,
    interrupt_current_run: interruptCurrentRun,
    target,
    reason,
    handoff_steps: [
      { id: 'capture', label: replanRequired ? '已记录新的目标边界' : '已记录补充要求', detail: reason || '补充内容已写入当前任务上下文。' },
      { id: 'preserve_context', label: '保留已有上下文', detail: '已完成的文件、验证和子 Agent 结果说明会继续作为判断依据。' },
      { id: replanRequired ? (interruptCurrentRun ? 'interrupt_and_replan' : 'replan') : status === 'deferred' ? 'defer' : 'continue', label: replanRequired ? (interruptCurrentRun ? '停止当前轮并重核计划' : '重新核对计划') : status === 'deferred' ? '等待当前轮结束' : '继续同一任务', detail: nextAction },
    ],
    next_action: nextAction,
    at: last.at,
    technical: { source: sourceName, kind, work_item_id: last.work_item_id || last.workItemId || '' },
  }
}
const buildReceiptReworkSummary = (source = {}) => {
  const existing = source.receipt_rework_summary || source.receiptReworkSummary
  if (existing) return sanitizeUserFacingStructure(existing, { fallback: '结果复检已整理，技术细节已放入技术详情。', max: 420 })
  const delivery = source.delivery_summary || source.deliverySummary || source
  const state = source.collaboration_state || source.collaborationState || {}
  const continuationEvents = [
    ...asArray(state.continuation_events || state.continuationEvents),
    state.last_continuation || state.lastContinuation || source.last_continuation || source.lastContinuation,
  ].filter(item => item && /receipt|ack|verification|missing_receipt|weak_receipt|memory_gate|post_compact|reinject|重注入|记忆/i.test(`${item.rework_kind || item.reworkKind || item.kind || ''} ${item.source || ''} ${item.title || ''} ${item.reason || ''}`))
  const qualityRows = asArray(delivery.weak_receipt_quality || delivery.weakReceiptQuality || delivery.receipt_quality || delivery.receiptQuality)
  const memoryGateRows = asArray(
    delivery.memory_gate_receipt_rows
      || delivery.memoryGateReceiptRows
      || delivery.memory_gate_summary?.rows
      || delivery.memoryGateSummary?.rows
      || source.agent_coordination?.memory_gate_summary?.rows
      || source.agentCoordination?.memoryGateSummary?.rows
  )
  const reinjectionGateRows = asArray(
    delivery.post_compact_reinjection_gate_receipt_rows
      || delivery.postCompactReinjectionGateReceiptRows
      || delivery.post_compact_reinjection_gate_summary?.rows
      || delivery.postCompactReinjectionGateSummary?.rows
      || source.agent_coordination?.post_compact_reinjection_gate_summary?.rows
      || source.agentCoordination?.postCompactReinjectionGateSummary?.rows
  )
  const receipts = [
    ...asArray(delivery.receipts),
    ...asArray(delivery.receipt_statuses || delivery.receiptStatuses),
  ]
  const gaps = []
  const add = (row = {}) => {
    const quality = row.quality || row
    const target = compact(row.agent || row.project || row.target || '', 80)
    const missing = uniq(quality.missing || row.missing || [])
    const status = String(row.status || row.receipt_status || row.receiptStatus || '').trim()
    if (!target && !missing.length && !status) return
    if (gaps.some(item => item.target === target && item.reason === row.reason)) return
    const weak = quality.grade && quality.grade !== 'good'
    const missingReceipt = status && status !== 'done'
    if (!weak && !missingReceipt) return
    const reason = compact(row.reason || (missing.length ? `缺少：${missing.join('、')}` : `结果说明状态为 ${status || '待补充'}`), 180)
    gaps.push({
      id: missingReceipt ? 'missing_receipt' : 'weak_receipt',
      target,
      title: missingReceipt ? '要求子 Agent 补结果说明' : '要求补充高质量结果说明',
      reason,
      missing,
      tone: 'warning',
      action: {
        kind: 'targeted_rework',
        id: missingReceipt ? 'missing_receipt' : 'weak_receipt',
        title: missingReceipt ? '要求子 Agent 补结果说明' : '要求补充高质量结果说明',
        target,
        reason,
        tone: 'warning',
        label: missingReceipt ? '要求子 Agent 补结果说明' : '要求补充高质量结果说明',
      },
    })
  }
  const addMemoryGateGap = (row = {}) => {
    const gate = row.memory_gate || row.memoryGate || row
    const target = compact(row.agent || row.project || row.target || '', 80)
    const missingIds = uniq(asArray(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds))
    const status = String(row.status || gate.status || '').trim()
    const passed = gate.pass === true || row.pass === true || status === 'passed'
    const required = gate.required === true || row.required === true || missingIds.length > 0 || status === 'missing_receipt_reference'
    if (!required || passed || (status && status !== 'missing_receipt_reference' && !missingIds.length)) return
    const reason = compact(row.reason || (missingIds.length ? `结果说明缺少记忆 gate 引用：${missingIds.join('、')}` : '结果说明需要补充本轮群聊记忆使用声明。'), 180)
    if (gaps.some(item => item.id === 'memory_gate_receipt' && item.target === target && item.reason === reason)) return
    gaps.push({
      id: 'memory_gate_receipt',
      target,
      title: '补充记忆使用声明',
      reason,
      missing: ['记忆 gate 引用', ...missingIds].slice(0, 6),
      tone: 'warning',
      action: {
        kind: 'targeted_rework',
        id: 'memory_gate_receipt',
        title: '补充记忆使用声明',
        target,
        reason,
        tone: 'warning',
        label: '补充记忆使用声明',
      },
    })
  }
  const addReinjectionGateGap = (row = {}) => {
    const gate = row.post_compact_reinjection_gate || row.postCompactReinjectionGate || row
    const target = compact(row.agent || row.project || row.target || '', 80)
    const missingIds = uniq(asArray(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds))
    const status = String(row.status || gate.status || '').trim()
    const passed = gate.pass === true || row.pass === true || status === 'passed'
    const missingCandidateIds = uniq(asArray(gate.missing_candidate_reference_gate_ids || gate.missingCandidateReferenceGateIds || row.missing_candidate_reference_gate_ids || row.missingCandidateReferenceGateIds))
    const missingUsageIds = uniq(asArray(gate.missing_candidate_usage_gate_ids || gate.missingCandidateUsageGateIds || row.missing_candidate_usage_gate_ids || row.missingCandidateUsageGateIds))
    const missingUsageCandidateIds = uniq(asArray(gate.missing_candidate_usage_candidate_ids || gate.missingCandidateUsageCandidateIds || row.missing_candidate_usage_candidate_ids || row.missingCandidateUsageCandidateIds))
    const required = gate.required === true || row.required === true || missingIds.length > 0 || missingCandidateIds.length > 0 || missingUsageIds.length > 0 || missingUsageCandidateIds.length > 0 || ['missing_receipt_reference', 'missing_candidate_reference', 'missing_candidate_usage'].includes(status)
    if (!required || passed || (status && !['missing_receipt_reference', 'missing_candidate_reference', 'missing_candidate_usage'].includes(status) && !missingIds.length && !missingCandidateIds.length && !missingUsageIds.length && !missingUsageCandidateIds.length)) return
    const reason = compact(row.reason || (missingUsageIds.length || status === 'missing_candidate_usage'
      ? `结果说明缺少压缩后重注入候选使用状态 used/ignored/verified：${missingUsageCandidateIds.join('、') || missingUsageIds.join('、') || missingCandidateIds.join('、') || missingIds.join('、') || '本轮候选'}`
      : missingCandidateIds.length || status === 'missing_candidate_reference'
      ? `结果说明缺少压缩后重注入候选声明：${missingCandidateIds.join('、') || missingIds.join('、') || '本轮候选'}`
      : missingIds.length ? `结果说明缺少压缩后重注入 gate 引用：${missingIds.join('、')}` : '结果说明需要补充压缩前重注入候选的使用声明。'), 180)
    if (gaps.some(item => item.id === 'post_compact_reinjection_gate_receipt' && item.target === target && item.reason === reason)) return
    gaps.push({
      id: 'post_compact_reinjection_gate_receipt',
      target,
      title: '补充压缩记忆使用声明',
      reason,
      missing: ['压缩后重注入 gate/候选引用/使用状态', ...missingIds, ...missingCandidateIds, ...missingUsageIds, ...missingUsageCandidateIds].slice(0, 6),
      tone: 'warning',
      action: {
        kind: 'targeted_rework',
        id: 'post_compact_reinjection_gate_receipt',
        title: '补充压缩记忆使用声明',
        target,
        reason,
        tone: 'warning',
        label: '补充压缩记忆使用声明',
      },
    })
  }
  qualityRows.forEach(add)
  receipts.forEach(add)
  memoryGateRows.forEach(addMemoryGateGap)
  reinjectionGateRows.forEach(addReinjectionGateGap)
  const gapTargets = new Set(gaps.map(item => String(item.target || '').toLowerCase()).filter(Boolean))
  const activeRework = continuationEvents.slice(-5).map(item => ({
    target: compact(item.target || item.agent || item.project || '', 80),
    title: item.title || (/missing_receipt/i.test(`${item.rework_kind || item.reworkKind || ''}`) ? '已发起补结果说明' : '已要求补充结果说明'),
    reason: compact(item.reason || item.detail || '等待子 Agent 补齐证据后重新验收', 180),
    at: item.at || '',
    status: item.status || 'accepted',
  })).filter(item => item.target || item.reason)
  const resolved = activeRework
    .filter(item => item.target && !gapTargets.has(String(item.target || '').toLowerCase()))
    .map(item => ({ ...item, title: '结果说明已补齐', status: 'passed', reason: '补充后暂未发现新的结果说明缺口，主 Agent 会继续跟踪验收。' }))
    .slice(0, 5)
  if (!gaps.length && !activeRework.length && !resolved.length) return null
  const status = gaps.length ? (activeRework.length ? 'reworking' : 'needs_rework') : resolved.length ? 'passed' : 'rechecking'
  const targets = uniq([...gaps.map(item => item.target), ...activeRework.map(item => item.target), ...resolved.map(item => item.target)]).slice(0, 4)
  return {
    schema: 'ccm-main-agent-receipt-rework-summary-v1',
    title: '结果复检',
    status,
    status_label: gaps.length ? `${gaps.length} 个缺口` : status === 'passed' ? '已通过' : '复检中',
    headline: gaps.length
      ? targets.length ? `${targets.join('、')} 的结果说明还需要补齐，主 Agent 不会把这轮直接判定完成。` : '子 Agent 结果说明还需要补齐，主 Agent 不会把这轮直接判定完成。'
      : targets.length ? `${targets.join('、')} 的结果说明已完成复检，主 Agent 会继续收敛最终交付。` : '结果说明已完成复检，主 Agent 会继续收敛最终交付。',
    gaps: gaps.slice(0, 8),
    active_rework: activeRework.filter(item => item.target && gapTargets.has(String(item.target || '').toLowerCase())).slice(0, 5),
    resolved,
    next_action: gaps.length ? '可以按单个缺口定向补充；补齐后主 Agent 会重新验收并汇总。' : '继续执行剩余验收；如果所有检查通过，主 Agent 会输出最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  }
}
const workItemRefs = (item = {}) => [item.id, item.target, item.owner, item.subject].map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
const workItemStatus = (item = {}) => String(item.status || '').toLowerCase()
const WORK_ITEM_VERIFICATION_PATTERN = /验证|测试|运行检查|执行检查|检查(?:命令|结果|通过|失败)|verify|verification|test|qa|typecheck|lint|build|check/i
const workItemHasVerificationSignal = (item = {}) => WORK_ITEM_VERIFICATION_PATTERN.test([
  item.subject,
  item.description,
  item.activeForm,
  item.active_form,
  item.owner,
  item.target,
  ...asArray(item.evidence),
  ...asArray(item.verification),
].filter(Boolean).join(' '))
const buildWorkItemVerificationReminder = (rows = []) => {
  if (rows.length < 3) return null
  if (!rows.every(item => ['completed', 'done'].includes(workItemStatus(item)))) return null
  if (rows.some(workItemHasVerificationSignal)) return null
  return {
    schema: 'ccm-main-agent-work-item-verification-reminder-v1',
    status: 'needs_verification_work_item',
    title: '执行队列还缺验收',
    headline: '工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。',
    reason: '3 个以上工作项全部完成时，需要在最终总结前补一次真实验收。',
    next_action: '主 Agent 会补齐验收或说明无法验证的原因，再给出最终交付总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
}
const buildWorkItemSummary = (items = []) => {
  const rows = asArray(items)
  const counts = rows.reduce((acc, item) => {
    const status = workItemStatus(item) || 'pending'
    acc[status] = Number(acc[status] || 0) + 1
    return acc
  }, {})
  const completedRefs = new Set(rows.filter(item => ['completed', 'done'].includes(workItemStatus(item))).flatMap(workItemRefs))
  const hasOpenDependency = (item = {}) => asArray(item.blockedBy || item.blocked_by || item.dependsOn || item.depends_on)
    .some(ref => !completedRefs.has(String(ref || '').trim().toLowerCase()))
  const nextClaimable = rows
    .filter(item => ['pending', 'queued', 'blocked'].includes(workItemStatus(item) || 'pending') && !hasOpenDependency(item))
    .map(item => ({ id: item.id || item.target || item.subject, target: item.target || item.owner || '', subject: item.subject || item.description || '继续处理已解锁工作项' }))
    .slice(0, 6)
  return {
    total: rows.length,
    counts,
    active: rows.filter(item => ['in_progress', 'running'].includes(workItemStatus(item))).map(item => item.owner || item.target).filter(Boolean),
    next_claimable: nextClaimable,
    verification_nudge: Boolean(buildWorkItemVerificationReminder(rows)),
    verification_reminder: buildWorkItemVerificationReminder(rows),
    all_completed: rows.length > 0 && rows.every(item => ['completed', 'done'].includes(workItemStatus(item))),
  }
}
const mergeWorkItemSummary = (provided = null, items = []) => {
  const derived = buildWorkItemSummary(items)
  const nextClaimable = asArray(provided?.next_claimable || provided?.nextClaimable)
  return {
    ...derived,
    ...(provided || {}),
    counts: { ...derived.counts, ...(provided?.counts || {}) },
    next_claimable: nextClaimable.length ? nextClaimable : derived.next_claimable,
    verification_reminder: provided?.verification_reminder || provided?.verificationReminder || derived.verification_reminder,
    verification_nudge: Boolean(provided?.verification_nudge || provided?.verificationNudge || derived.verification_nudge),
  }
}
const visibleAgentName = (value = '') => {
  const text = String(value || '').replace(/^(项目|协作群|前端|后端|测试|项目 Agent|全局主 Agent)\s*[·:：]\s*/, '').trim()
  return text && !/^(coordinator|main-agent|global-agent|主\s*Agent|全局主\s*Agent)$/i.test(text) ? text : ''
}
const childAgentRole = (name = '', fallback = '') => {
  const direct = String(fallback || '').trim()
  if (direct) return direct
  if (/web|front|frontend|app|mobile|ui|页面|前端/i.test(name)) return '前端'
  if (/api|server|backend|cloud|service|后端|服务/i.test(name)) return '后端'
  if (/test|qa|验收|测试/i.test(name)) return '测试'
  return '项目'
}
const childAgentStatus = (status = '', phase = '') => {
  const value = String(status || '').toLowerCase()
  if (['done', 'completed', 'succeeded', 'success'].includes(value)) return 'completed'
  if (['failed', 'error'].includes(value)) return 'failed'
  if (['blocked', 'needs_info', 'needs_user', 'waiting_user', 'partial', 'missing_receipt'].includes(value)) return 'blocked'
  if (['running', 'in_progress', 'executing', 'reviewing', 'ready', 'prompt_accepted', 'spawning', 'open'].includes(value)) return 'running'
  if (['pending', 'queued', 'waiting', 'planned'].includes(value)) return 'pending'
  return phase === 'completed' ? 'completed' : ['executing', 'reviewing', 'reworking'].includes(phase) ? 'running' : 'pending'
}
const childAgentStatusLabel = (status = '') => ({
  completed: '已完成',
  failed: '失败',
  blocked: '需处理',
  running: '执行中',
  pending: '等待中',
}[childAgentStatus(status)] || '等待中')
const childAgentDefaultSummary = (name = '', status = '', focus = '', blockers = []) => {
  const current = friendlyTerminalText(focus, '', 140)
  const normalized = childAgentStatus(status)
  if (normalized === 'completed') return current ? `已完成：${current}` : `${childAgentRole(name)}工作已完成`
  if (normalized === 'failed') return blockers[0] ? `失败：${blockers[0]}` : `${childAgentRole(name)}执行失败，等待主 Agent 处理`
  if (normalized === 'blocked') return blockers[0] ? `受阻：${blockers[0]}` : `${childAgentRole(name)}遇到问题，等待主 Agent 调整`
  if (normalized === 'running') return current ? `正在${current.replace(/^正在/, '')}` : `${childAgentRole(name)}正在修改和检查`
  return current ? `等待派发：${current}` : `${childAgentRole(name)}正在等待开始`
}
const childAgentNextAction = (status = '', focus = '') => {
  const normalized = childAgentStatus(status)
  if (normalized === 'completed') return '等待主 Agent 纳入验收和最终总结'
  if (normalized === 'failed' || normalized === 'blocked') return '主 Agent 会按缺口定向补充'
  if (normalized === 'running') return '继续执行，完成后提交结果和验证'
  return focus ? '等待前置条件满足后派发' : '等待主 Agent 分配下一步'
}
const buildChildAgentProgressSummary = ({ phase = '', agents = [], workItems = [], rows = [] } = {}) => {
  const byName = new Map()
  const ensure = (name, role = '') => {
    const agent = visibleAgentName(name)
    if (!agent) return null
    const key = agent.toLowerCase()
    if (!byName.has(key)) byName.set(key, { agent, role: childAgentRole(agent, role), rawStatuses: [], focus: '', summaries: [], files: [], verification: [], blockers: [], evidence: [] })
    return byName.get(key)
  }
  for (const agentRow of asArray(agents)) {
    const name = visibleAgentName(agentRow.agent || agentRow.name || agentRow.project || agentRow.target)
    const role = String(agentRow.role || '').trim() || (/^\s*([^·:：]+)\s*[·:：]/.exec(String(agentRow.name || ''))?.[1] || '')
    const row = ensure(name || agentRow.name, role)
    if (!row) continue
    row.rawStatuses.push(agentRow.status)
    if (agentRow.summary) row.summaries.push(agentRow.summary)
    if (agentRow.current_focus || agentRow.currentFocus) row.focus = compact(agentRow.current_focus || agentRow.currentFocus, 140)
    row.blockers.push(...asArray(agentRow.blockers))
  }
  for (const item of asArray(workItems)) {
    const row = ensure(item.owner || item.target || item.agent || item.project)
    if (!row) continue
    row.rawStatuses.push(item.status)
    if (!row.focus) row.focus = compact(item.subject || item.title || item.description || '', 140)
    row.summaries.push(...asArray(item.evidence), item.summary || item.description || '')
    row.files.push(...asArray(item.filesChanged || item.files_changed || item.files))
    row.verification.push(...asArray(item.verification || item.tests || item.verification_results))
    row.blockers.push(...asArray(item.blockers), ...asArray(item.needs))
  }
  for (const provided of asArray(rows)) {
    const row = ensure(provided.agent || provided.name || provided.project || provided.target, provided.role)
    if (!row) continue
    row.rawStatuses.push(provided.status)
    if (!row.focus) row.focus = compact(provided.current_focus || provided.currentFocus || provided.focus || '', 140)
    row.summaries.push(provided.summary)
    row.files.push(...asArray(provided.filesChanged || provided.files_changed || provided.files))
    row.verification.push(...asArray(provided.verification || provided.tests || provided.verification_results))
    row.blockers.push(...asArray(provided.blockers), ...asArray(provided.needs))
  }
  const normalizedRows = [...byName.values()].map(row => {
    const status = childAgentStatus(row.rawStatuses.find(item => item) || '', phase)
    const files = uniq(row.files)
    const verification = uniq(row.verification)
    const blockers = uniq(row.blockers).map(item => friendlyTerminalText(item, '', 140)).filter(Boolean).slice(0, 4)
    const focus = friendlyTerminalText(row.focus, '', 140)
    const fallback = childAgentDefaultSummary(row.agent, status, focus, blockers)
    const summary = row.summaries.map(item => friendlyTerminalText(item, '', 160)).find(Boolean) || fallback
    const evidence = [
      files.length ? { id: 'files', label: '文件', value: `${files.length} 个`, detail: files.slice(0, 3).join('、') } : null,
      verification.length ? { id: 'verification', label: '验证', value: `${verification.length} 项`, detail: verification.slice(0, 2).join('、') } : null,
    ].filter(Boolean)
    return {
      agent: row.agent,
      role: row.role,
      status,
      status_label: childAgentStatusLabel(status),
      summary,
      current_focus: focus,
      evidence,
      files_changed_count: files.length,
      verification_count: verification.length,
      blockers,
      next_action: childAgentNextAction(status, focus),
    }
  }).filter(row => row.agent)
  if (!normalizedRows.length) return null
  const blocked = normalizedRows.filter(row => ['blocked', 'failed'].includes(row.status)).length
  const active = normalizedRows.filter(row => ['running', 'pending'].includes(row.status)).length
  const completed = normalizedRows.filter(row => row.status === 'completed').length
  const status = blocked ? 'needs_attention' : active ? 'running' : completed === normalizedRows.length ? 'completed' : 'running'
  return {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status,
    status_label: status === 'completed' ? '已收齐' : status === 'needs_attention' ? '需关注' : '跟踪中',
    headline: blocked
      ? `${blocked} 个子 Agent 需要补证据或处理阻塞，主 Agent 会按缺口继续推进。`
      : active
        ? `${normalizedRows.length} 个子 Agent 的进展已汇总，主 Agent 会继续跟踪文件、验证和结果。`
        : `${completed} 个子 Agent 的结果已收齐，主 Agent 正在整理验收和交付总结。`,
    rows: normalizedRows.slice(0, 12),
    next_action: status === 'completed' ? '主 Agent 会把这些结果合并进最终总结' : status === 'needs_attention' ? '优先处理缺口，不整轮重跑' : '等待子 Agent 继续提交结果和验证',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  }
}
const buildChangeSummary = ({ files = [], workItems = [], agents = [] } = {}) => {
  const raw = [
    ...asArray(files),
    ...asArray(workItems).flatMap(item => asArray(item.filesChanged || item.files_changed || item.files).map(file => ({ ...(typeof file === 'string' ? { path: file } : file), project: item.target || item.owner || '', agent: item.owner || item.target || '' }))),
  ]
  const normalized = uniqDeliveryFiles(raw).slice(0, 40)
  if (!normalized.length) return null
  const agentNames = uniq([...normalized.map(file => file.agent || file.project), ...asArray(agents).map(row => visibleAgentName(row.agent || row.name || row.project || row.target))]).filter(Boolean)
  const grouped = agentNames.map(agent => {
    const agentFiles = normalized.filter(file => (file.agent || file.project || '') === agent)
    return {
      agent,
      role: childAgentRole(agent),
      file_count: agentFiles.length,
      additions: agentFiles.reduce((sum, file) => sum + Number(file.additions || file.diff?.additions || 0), 0),
      deletions: agentFiles.reduce((sum, file) => sum + Number(file.deletions || file.diff?.deletions || 0), 0),
      files: agentFiles.slice(0, 8),
    }
  }).filter(row => row.file_count > 0)
  return {
    schema: 'ccm-main-agent-change-summary-v1',
    title: '改动明细',
    status: 'ready',
    status_label: `${normalized.length} 个文件`,
    headline: grouped.length ? `${grouped.length} 个子 Agent/项目产生了 ${normalized.length} 个文件改动。` : `本轮捕获到 ${normalized.length} 个文件改动。`,
    file_count: normalized.length,
    additions: normalized.reduce((sum, file) => sum + Number(file.additions || file.diff?.additions || 0), 0),
    deletions: normalized.reduce((sum, file) => sum + Number(file.deletions || file.diff?.deletions || 0), 0),
    files: normalized,
    agents: grouped,
    next_action: '可以点开查看具体文件 diff；原始执行记录仍在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  }
}
const splitPlanCriteria = (value) => {
  if (Array.isArray(value)) return value.map(item => compact(item, 160)).filter(Boolean)
  return String(value || '')
    .split(/(?:\n|；|;|。|\d+[、.]\s*)+/)
    .map(item => compact(item, 160))
    .filter(Boolean)
    .slice(0, 8)
}
const buildPlanAlignment = ({ provided = null, planMode = null, deliveryReport = null, files = [], verification = [], workItems = [], phase = '', report = {} } = {}) => {
  if (provided) return provided
  const plan = planMode || report.plan_mode || report.planMode || null
  if (!plan) return null
  const normalizedFiles = uniqDeliveryFiles(files)
  const verificationRows = uniq(toList(verification, deliveryReport?.verification, report.verification, report.verification_results))
  const criteria = uniq([
    ...splitPlanCriteria(plan.acceptance || plan.acceptance_criteria || plan.acceptanceCriteria),
    ...asArray(workItems).flatMap(item => splitPlanCriteria(item.acceptance)),
  ]).slice(0, 8)
  const terminal = ['completed', 'failed', 'cancelled', 'reverted'].includes(String(phase || '').toLowerCase())
  const accepted = deliveryReport?.status === 'done' || report.acceptance_gate_passed === true || report.acceptanceGatePassed === true
  const criterionStatus = (criterion) => {
    if (/文件|改动|diff|代码|修改|变更/i.test(criterion)) {
      return { ok: normalizedFiles.length > 0, detail: normalizedFiles.length ? `已捕获 ${normalizedFiles.length} 个文件改动` : '还没有捕获真实文件改动', evidence: normalizedFiles.slice(0, 3).map(item => item.path) }
    }
    if (/验证|测试|检查|test|check|lint|build/i.test(criterion)) {
      return { ok: verificationRows.length > 0, detail: verificationRows.length ? `已执行 ${verificationRows.length} 项验证` : '还没有系统捕获的验证记录', evidence: verificationRows.slice(0, 3) }
    }
    if (/回执|agent|子\s*Agent|工作单|派发|协作/i.test(criterion)) {
      const done = asArray(workItems).filter(item => ['completed', 'done'].includes(String(item.status || '').toLowerCase()))
      return { ok: done.length > 0 || asArray(workItems).length > 0, detail: done.length ? `已完成 ${done.length} 个工作项` : asArray(workItems).length ? '工作项已进入执行队列' : '还没有可核对的协作证据', evidence: done.slice(0, 3).map(item => item.target || item.owner || item.subject).filter(Boolean) }
    }
    return { ok: accepted, detail: accepted ? '主 Agent 已在最终验收中覆盖该计划项' : '等待最终验收确认该计划项', evidence: accepted ? [deliveryReport?.headline || report.summary || '最终验收已通过'].filter(Boolean) : [] }
  }
  const checks = [
    {
      id: 'plan_confirmed',
      label: '计划已进入执行',
      ok: plan.requires_confirmation !== true || accepted || asArray(workItems).length > 0 || normalizedFiles.length > 0,
      detail: plan.requires_confirmation === true ? '确认后进入执行链路' : '已按计划进入执行链路',
      evidence: plan.revision?.feedback ? [`已按反馈调整：${compact(plan.revision.feedback, 120)}`] : [],
    },
    ...criteria.map((criterion, index) => {
      const status = criterionStatus(criterion)
      return { id: `criterion_${index + 1}`, label: criterion, ok: status.ok, detail: status.detail, evidence: status.evidence }
    }),
  ]
  if (!criteria.length) {
    checks.push(
      { id: 'code_changes', label: '计划要求代码改动', ok: normalizedFiles.length > 0, detail: `捕获 ${normalizedFiles.length} 个文件改动`, evidence: normalizedFiles.slice(0, 3).map(item => item.path) },
      { id: 'verification', label: '计划要求验证', ok: verificationRows.length > 0, detail: `已执行 ${verificationRows.length} 项验证`, evidence: verificationRows.slice(0, 3) },
    )
  }
  const failed = checks.filter(item => !item.ok)
  const status = !failed.length && terminal ? 'aligned' : failed.length && terminal ? 'deviated' : failed.length ? 'needs_evidence' : 'tracking'
  return {
    schema: 'ccm-main-agent-plan-alignment-v1',
    title: '计划执行核对',
    status,
    status_label: status === 'aligned' ? '已对齐' : status === 'deviated' ? '有偏离' : status === 'needs_evidence' ? `${failed.length} 项待补` : '核对中',
    headline: status === 'aligned'
      ? '主 Agent 已把执行结果和原计划逐项核对，当前没有发现计划偏离。'
      : failed.length ? `主 Agent 已发现 ${failed.length} 个计划项还缺证据或存在偏离。` : '主 Agent 正在按原计划收集执行证据。',
    checks: checks.slice(0, 10),
    deviations: failed.map(item => ({ id: item.id, label: item.label, reason: item.detail })).slice(0, 8),
    next_action: failed.length ? '优先补齐这些计划项，再进入最终交付总结。' : terminal ? '可以查看最终总结和改动明细。' : '继续执行并更新计划核对结果。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  }
}

const handoffText = (value) => {
  if (!value || typeof value !== 'object') return compact(value, 220)
  return compact(value.label || value.reason || value.summary || value.detail || value.message || value.title || value.path || value.id || '', 220)
}
const buildUserHandoff = ({ provided = null, phase = '', status = '', nextAction = '', blockers = [], deliveryReport = null, changeSummary = null, planAlignment = null, files = [], verification = [], risks = [] } = {}) => {
  if (provided) return provided
  const normalizedPhase = String(phase || status || '').toLowerCase()
  const terminal = ['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'].includes(normalizedPhase)
  const needsUser = normalizedPhase === 'needs_user' || ['waiting_confirmation', 'waiting_user', 'paused', 'manual_takeover'].includes(String(status || '').toLowerCase())
  const cancelled = ['cancelled', 'canceled'].includes(normalizedPhase)
  const blocked = normalizedPhase === 'blocked'
  if (!terminal && !needsUser && !blocked) return null
  const normalizedFiles = uniqDeliveryFiles(files.length ? files : deliveryReport?.files || [])
  const fileCount = Number(changeSummary?.file_count || changeSummary?.fileCount || normalizedFiles.length || 0)
  const verificationRows = uniq(toList(verification, deliveryReport?.verification))
  const independentReviewRows = uniq(toList(deliveryReport?.independent_review, deliveryReport?.independentReview).map(handoffText))
  const planProblems = asArray(planAlignment?.deviations)
  const unresolved = uniq([
    ...toList(blockers, risks, deliveryReport?.risks).map(handoffText),
    ...planProblems.map(item => handoffText(item.reason || item.label)),
  ]).slice(0, 8)
  const evidence = uniq([
    fileCount ? `改动：${fileCount} 个文件` : '',
    verificationRows.length ? `验证：${verificationRows.length} 项已执行` : '',
    independentReviewRows[0] ? `复核：${independentReviewRows[0]}` : '',
    planAlignment?.status === 'aligned' ? '计划核对：已对齐' : planProblems.length ? `计划核对：${planProblems.length} 项待补` : '',
    deliveryReport?.headline || '',
  ]).slice(0, 6)
  const actions = []
  const addAction = (id, label, detail = '', kind = '', tone = 'outline') => {
    if (actions.some(item => item.id === id)) return
    actions.push({ id, label, detail: compact(detail || label, 180), kind: kind || id, tone })
  }
  if (needsUser) addAction('provide_input', '补充确认', unresolved[0] || nextAction || '主 Agent 正在等待你的确认。', 'continue', 'primary')
  if (cancelled) addAction('restart_request', '重新发起需求', nextAction || '任务已经停止；需要继续时可以重新发起。', 'continue', 'primary')
  if (!cancelled && (blocked || normalizedPhase === 'failed' || unresolved.length)) addAction('continue_rework', normalizedPhase === 'failed' ? '重新执行或继续修复' : '继续处理缺口', unresolved[0] || nextAction || '主 Agent 会复用已有证据继续处理。', normalizedPhase === 'failed' ? 'retry' : 'gap_continue', normalizedPhase === 'failed' ? 'primary' : 'warning')
  if (fileCount > 0) addAction('view_changes', '查看改动', changeSummary?.headline || `已捕获 ${fileCount} 个文件改动。`, 'view_changes', terminal && !unresolved.length ? 'primary' : 'outline')
  if (deliveryReport) addAction('review_delivery', '核对交付总结', '查看完成内容、验证结果和风险提示。', 'review_delivery', fileCount ? 'outline' : 'primary')
  if (cancelled && unresolved.length) addAction('review_stop_reason', '查看停止原因', unresolved[0], 'review_risks', 'outline')
  if (terminal && !unresolved.length) addAction('continue_request', '继续提出新要求', '如果结果符合预期，可以直接继续补充下一步需求。', 'continue', actions.length ? 'outline' : 'primary')
  if (!actions.length) addAction('next_action', '继续跟进', nextAction || '主 Agent 会继续处理并更新结果。', 'continue', 'primary')
  const handoffStatus = needsUser ? 'needs_user' : normalizedPhase === 'failed' ? 'failed' : cancelled ? 'cancelled' : blocked || unresolved.length ? 'needs_attention' : normalizedPhase === 'reverted' ? 'reverted' : 'ready'
  return {
    schema: 'ccm-main-agent-user-handoff-v1',
    title: '接下来建议',
    status: handoffStatus,
    status_label: ({ ready: '可验收', needs_user: '等你确认', failed: '未完成', cancelled: '已停止', reverted: '已撤销', needs_attention: '需处理' })[handoffStatus] || '需处理',
    headline: handoffStatus === 'ready'
      ? '这轮任务已经收尾，建议先核对交付总结和改动明细。'
      : handoffStatus === 'needs_user'
        ? '主 Agent 已停在需要你决定的位置，不会擅自继续。'
        : handoffStatus === 'failed'
          ? '这轮任务没有完整完成，主 Agent 已整理可以继续推进的入口。'
          : handoffStatus === 'cancelled'
            ? '任务已经停止；需要继续时可以重新发起或恢复需求。'
            : handoffStatus === 'reverted'
              ? '最近一轮改动已撤销；继续前建议重新确认当前代码状态。'
              : '还有缺口需要处理，主 Agent 会按证据继续收敛。',
    primary_action: actions[0],
    secondary_actions: actions.slice(1, 4),
    evidence,
    unresolved,
    next_action: actions[0]?.detail || nextAction,
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
}

export const taskPhasePresentation = (status, fallback = 'planning') => {
  const key = String(status || '').toLowerCase()
  const phase = ({
    pending: 'queued', queued: 'queued', planning: 'planning',
    running: 'executing', in_progress: 'executing', executing: 'executing', supervising: 'executing',
    reviewing: 'reviewing', testing: 'reviewing',
    reworking: 'reworking', retrying: 'reworking', recovering: 'blocked', blocked: 'blocked',
    waiting_confirmation: 'needs_user', waiting_clarification: 'needs_user', waiting_user: 'needs_user',
    manual_takeover: 'needs_user', paused: 'needs_user', done: 'completed', completed: 'completed', succeeded: 'completed',
    failed: 'failed', cancelled: 'cancelled', reverted: 'reverted',
  })[key] || fallback
  return {
    phase,
    label: ({ planning: '正在分析', queued: '准备开始', executing: '正在修改', reviewing: '正在运行测试', reworking: '正在修复问题', needs_user: '需要你确认', blocked: '正在恢复', completed: '已完成', failed: '失败', cancelled: '已取消', reverted: '已安全撤销' })[phase] || '正在处理',
    progress: ({ planning: 10, queued: 18, executing: 55, reviewing: 85, reworking: 68, needs_user: 72, blocked: 62, completed: 100, failed: 100, cancelled: 0, reverted: 100 })[phase] ?? 10,
  }
}

const taskActions = (phase, capabilities = {}) => {
  const actions = []
  if (capabilities.viewChanges) actions.push({ id: 'changes', kind: 'view_changes', label: '查看改动', tone: 'outline' })
  if (capabilities.saveKnowledge && ['completed', 'failed', 'cancelled', 'reverted'].includes(phase)) actions.push({ id: 'save_knowledge', kind: 'save_knowledge', label: '保存知识', tone: 'outline' })
  if (phase === 'completed' && capabilities.continue) actions.push({ id: 'continue', kind: 'continue', label: '继续修改', tone: 'primary' })
  if (['planning', 'queued', 'executing', 'reviewing', 'reworking', 'blocked'].includes(phase) && capabilities.cancel) actions.push({ id: 'cancel', kind: 'cancel', label: '停止', tone: 'danger' })
  if (phase === 'needs_user' && capabilities.resume) actions.push({ id: 'resume', kind: 'resume', label: '继续', tone: 'primary' })
  if (phase === 'failed' && capabilities.retry) actions.push({ id: 'retry', kind: 'retry', label: '重新执行', tone: 'primary' })
  if (phase === 'completed' && capabilities.rollback) actions.push({ id: 'rollback', kind: 'rollback', label: '安全撤销', tone: 'danger' })
  return actions
}

const buildGlobalUserRequestSummary = (run = {}) => {
  const provided = run.clarification_summary
    || run.clarificationSummary
    || run.confirmation_summary
    || run.confirmationSummary
    || null
  if (!provided) return null
  const summary = sanitizeUserFacingStructure(provided, {
    fallback: '全局主 Agent 正在等待你补充信息或确认操作。',
    max: 420,
  })
  const schema = String(summary.schema || '')
  const kind = schema.includes('confirmation') ? 'confirmation' : 'clarification'
  return {
    ...summary,
    kind,
    title: summary.title || (kind === 'confirmation' ? '等待授权确认' : '需要你补充信息'),
    status: summary.status || 'waiting_user',
    status_label: summary.status_label || (kind === 'confirmation' ? '需要授权' : '等待你回复'),
    headline: summary.headline || (kind === 'confirmation'
      ? '全局主 Agent 已准备执行一步需要授权的操作，确认前不会继续。'
      : '全局主 Agent 已停在需要你补充信息的位置，不会猜测目标或擅自执行。'),
    question: summary.question || (kind === 'confirmation' ? '是否允许继续执行这一步？' : '请补充目标、范围或验收标准。'),
    next_action: summary.next_action || (kind === 'confirmation'
      ? '请确认或取消；确认后会继续执行并总结结果。'
      : '你回复后，全局主 Agent 会接着同一个运行继续处理。'),
  }
}

export const globalMissionTaskCard = (message = {}) => {
  const mission = message.globalMission || {}
  if (!mission.id) return null
  const children = asArray(message.globalMissionChildren)
  const summary = mission.mission_summary || {}
  const missionDelivery = mission.delivery_summary || {}
  const supervisor = message.globalMissionSupervisor || {}
  const finalReport = supervisor.final_report || mission.final_report || {}
  const deliveryReport = getUnifiedDeliveryReport(finalReport) || getUnifiedDeliveryReport(missionDelivery) || getUnifiedDeliveryReport(supervisor) || getUnifiedDeliveryReport(mission)
  const recoverySummary = buildRecoverySummary(mission) || buildRecoverySummary(supervisor)
  const continuationStatus = buildContinuationStatus(mission) || buildContinuationStatus(missionDelivery) || buildContinuationStatus(supervisor)
  const receiptReworkSummary = buildReceiptReworkSummary(mission) || buildReceiptReworkSummary(missionDelivery) || buildReceiptReworkSummary(supervisor)
  const supervisorStatus = supervisor.status || ''
  const presentationStatus = mission.rolled_back_at
    ? 'reverted'
    : ['paused', 'waiting_user', 'manual_takeover', 'cancelled', 'failed', 'completed'].includes(supervisorStatus)
      ? supervisorStatus
      : mission.status
  const presentation = taskPhasePresentation(presentationStatus, mission.status === 'done' ? 'completed' : 'executing')
  const total = Number(summary.total || children.length || 0)
  const passed = Number(summary.passed || children.filter(row => row.task?.status === 'done').length || 0)
  const blocked = Number(summary.blocked || children.filter(row => ['blocked', 'failed'].includes(row.task?.status)).length || 0)
  const agents = children.map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    const targetType = target.type === 'group' ? '协作群' : '项目'
    return {
      id: task.id,
      name: `${targetType} · ${target.name || task.target_project || '执行目标'}`,
      status: task.status || 'pending',
      summary: compact(task.status_detail || target.reason || (task.status === 'done' ? '工作已完成' : '等待开始'), 120),
    }
  })
  const missionWorkItems = asArray(mission.work_items || mission.workItems || missionDelivery.work_items || missionDelivery.workItems)
  const derivedWorkItems = children.map(row => {
    const task = row.task || {}
    const target = row.target || task.mission_target || {}
    return {
      id: task.id || target.name || target.project,
      taskId: task.id || mission.id,
      subject: task.business_goal || target.task || target.reason || task.title || '执行目标',
      description: task.status_detail || target.reason || '',
      owner: target.coordinator || target.project || task.target_project || target.name || '',
      target: target.name || task.target_project || target.project || '',
      status: task.status === 'done' ? 'completed' : task.status || 'pending',
      blockedBy: asArray(task.mission_dependencies || target.depends_on || target.dependsOn),
      attempt: Number(task.retry_count || task.auto_gap_continue_count || 1) || 1,
      evidence: uniq([task.delivery_summary?.headline, task.receipt?.summary]),
      filesChanged: uniq(asArray(task.delivery_summary?.actual_file_changes).map(item => item.path || item)),
      verification: uniq(task.delivery_summary?.verification_executed || task.receipt?.verification || []),
      blockers: uniq([task.status_detail, ...(task.receipt?.blockers || [])]).filter(Boolean),
    }
  }).filter(item => item.id || item.target || item.subject)
  const workItems = missionWorkItems.length ? missionWorkItems : derivedWorkItems
  const workItemSummary = mergeWorkItemSummary(mission.work_item_summary || mission.workItemSummary || missionDelivery.work_item_summary || missionDelivery.workItemSummary, workItems)
  const childDeliveryFiles = [
    ...asArray(missionDelivery.actual_file_changes),
    ...asArray(missionDelivery.child_tasks).flatMap(child => asArray(child?.actual_file_changes)),
    ...asArray(summary.children).flatMap(child => asArray(child?.actual_file_changes)),
    ...children.flatMap(row => {
      const task = row.task || {}
      const fallbackProject = row.target?.name || task.target_project || task.mission_target?.name || ''
      return [
        ...asArray(task.delivery_summary?.actual_file_changes).map(item => normalizeDeliveryFile(item, fallbackProject)),
        ...asArray(task.file_changes?.files).map(item => normalizeDeliveryFile(item, fallbackProject)),
      ]
    }),
  ].filter(Boolean)
  const files = uniqDeliveryFiles([
    ...childDeliveryFiles,
    ...(finalReport.actual_file_changes || []),
    ...(finalReport.file_changes || []),
    ...(finalReport.files_modified || finalReport.files || []),
    ...(deliveryReport?.files || []),
  ])
  const verification = uniq(toList(finalReport.verification_results, finalReport.verification, deliveryReport?.verification))
  const risks = uniq(toList(finalReport.risks, finalReport.remaining_items, deliveryReport?.risks))
  const active = agents.filter(item => ['in_progress', 'running', 'pending'].includes(item.status)).map(item => `${item.name} 正在处理`)
  const actions = taskActions(presentation.phase, {
    viewChanges: files.length > 0,
    continue: true,
    cancel: true,
    resume: ['paused', 'waiting_user', 'manual_takeover'].includes(supervisor.status),
    retry: true,
    rollback: !!mission.rollback_available,
    saveKnowledge: true,
  })
  const missionDisplayStream = mission.display_stream || mission.displayStream || missionDelivery.display_stream || missionDelivery.displayStream || (deliveryReport ? { delivery_report: deliveryReport, user_visible_text: deliveryReport.headline } : null)
  const missionProgressCheckpoints = missionDisplayStream?.progress_checkpoints || missionDisplayStream?.progressCheckpoints || missionDisplayStream?.workchain?.progress_checkpoints || missionDisplayStream?.workchain?.progressCheckpoints || mission.workchain?.progress_checkpoints || mission.workchain?.progressCheckpoints || null
  const mainAgentDecision = mission.mainAgentDecision || mission.main_agent_decision || missionDisplayStream?.mainAgentDecision || missionDisplayStream?.main_agent_decision || null
  const agentProgressSummary = mission.agent_progress_summary || mission.agentProgressSummary || missionDelivery.agent_progress_summary || missionDelivery.agentProgressSummary || buildChildAgentProgressSummary({ phase: presentation.phase, agents, workItems })
  const changeSummary = mission.change_summary || mission.changeSummary || missionDelivery.change_summary || missionDelivery.changeSummary || buildChangeSummary({ files, workItems, agents })
  const missionPlanMode = mission.plan_mode || mission.planMode || mission.workflow_meta?.plan_mode || mission.workflowMeta?.planMode || missionDelivery.plan_mode || missionDelivery.planMode || finalReport.plan_mode || finalReport.planMode || null
  const planAlignment = buildPlanAlignment({ provided: mission.plan_alignment || mission.planAlignment || missionDelivery.plan_alignment || missionDelivery.planAlignment || finalReport.plan_alignment || finalReport.planAlignment, planMode: missionPlanMode, deliveryReport, files, verification, workItems, phase: presentation.phase, report: finalReport })
  const nextAction = presentation.phase === 'completed' ? '可以查看改动或继续修改' : presentation.phase === 'needs_user' ? '请确认后继续' : presentation.phase === 'failed' ? '可以重新执行，系统会复用已有证据' : '主 Agent 正在协调各执行目标'
  const userHandoff = buildUserHandoff({ provided: mission.user_handoff || mission.userHandoff || missionDelivery.user_handoff || missionDelivery.userHandoff || finalReport.user_handoff || finalReport.userHandoff || deliveryReport?.user_handoff || deliveryReport?.userHandoff, phase: presentation.phase, status: presentationStatus, nextAction, blockers: blocked ? [`${blocked} 个执行目标需要处理`] : [], deliveryReport, changeSummary, planAlignment, files, verification, risks })
  return {
    version: 1,
    task_id: mission.id,
    title: mission.title || '跨项目开发任务',
    goal: mission.business_goal || mission.goal || mission.title || '',
    phase: presentation.phase,
    phase_label: presentation.label,
    status: mission.status,
    progress: total ? Math.max(presentation.progress === 100 ? 100 : 10, Math.round(passed / total * 100)) : presentation.progress,
    active_agents: active,
    agents,
    work_items: workItems,
    work_item_summary: workItemSummary,
    agent_progress_summary: agentProgressSummary,
    agentProgressSummary,
    change_summary: changeSummary,
    changeSummary,
    plan_mode: missionPlanMode,
    planMode: missionPlanMode,
    plan_alignment: planAlignment,
    planAlignment,
    user_handoff: userHandoff,
    userHandoff,
    recovery_summary: recoverySummary,
    continuation_status: continuationStatus,
    receipt_rework_summary: receiptReworkSummary,
    completed: uniq([passed ? `${passed}/${total || passed} 个执行目标已完成` : '', files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: blocked ? [`${blocked} 个执行目标需要处理`] : risks.slice(0, 4),
    next_action: nextAction,
    mainAgentDecision,
    main_agent_decision: mainAgentDecision,
    display_stream: missionDisplayStream,
    progress_checkpoints: missionProgressCheckpoints,
    delivery_report: deliveryReport,
    delivery: { headline: deliveryReport?.headline || finalReport.summary || missionDelivery.headline || mission.status_detail || '', files, changes: files, verification, risks, acceptance_passed: finalReport.acceptance_gate_passed === true || missionDelivery.acceptance_gate_passed === true || deliveryReport?.status === 'done' },
    actions,
    technical: { trace_id: mission.trace_id || '', execution_ids: children.map(row => row.task?.id).filter(Boolean), session_ids: [], supervisor_id: supervisor.id || mission.supervisor_id || '', agent_progress_summary: agentProgressSummary, change_summary: changeSummary, plan_alignment: planAlignment, user_handoff: userHandoff },
  }
}

export const globalAgentRunTaskCard = (message = {}) => {
  const run = message.agenticRun || {}
  if (!run.id) return null
  const category = run.decision_summary?.intent?.category
  const ordinaryReply = ['conversation', 'question', 'analysis'].includes(category) && Number(run.tool_calls || 0) === 0 && !run.mission_id
  if (ordinaryReply) return null
  const presentation = taskPhasePresentation(run.status, 'executing')
  const report = run.final_report || {}
  const deliveryReport = getUnifiedDeliveryReport(run) || getUnifiedDeliveryReport(report) || buildRunTerminalFallbackDeliveryReport(run, report, message, presentation.phase)
  const recoverySummary = buildRecoverySummary(run)
  const continuationStatus = buildContinuationStatus(run) || buildContinuationStatus(report)
  const receiptReworkSummary = buildReceiptReworkSummary(run) || buildReceiptReworkSummary(report)
  const userRequestSummary = buildGlobalUserRequestSummary(run)
  const runWorkItems = asArray(run.work_items || run.workItems)
  const agentProgressSummary = run.agent_progress_summary || run.agentProgressSummary || report.agent_progress_summary || report.agentProgressSummary || buildChildAgentProgressSummary({ phase: presentation.phase, workItems: runWorkItems, rows: asArray(run.agent_progress_rows || run.agentProgressRows) })
  const files = uniqDeliveryFiles(toList(report.actual_file_changes, report.file_changes, report.files_modified, run.files_modified, deliveryReport?.files))
  const changeSummary = run.change_summary || run.changeSummary || report.change_summary || report.changeSummary || buildChangeSummary({ files, workItems: runWorkItems, rows: asArray(run.agent_progress_rows || run.agentProgressRows) })
  const verification = uniq(toList(report.verification_results, report.verification, run.verification_results, deliveryReport?.verification))
  const risks = uniq(toList(report.risks, report.remaining_items, run.risks, deliveryReport?.risks))
  const runPlanMode = run.plan_mode || run.planMode || run.workflow_meta?.plan_mode || run.workflowMeta?.planMode || report.plan_mode || report.planMode || null
  const planAlignment = buildPlanAlignment({ provided: run.plan_alignment || run.planAlignment || report.plan_alignment || report.planAlignment, planMode: runPlanMode, deliveryReport, files, verification, workItems: runWorkItems, phase: presentation.phase, report })
  const nextAction = userRequestSummary?.next_action || (presentation.phase === 'needs_user' ? (run.clarification_question || '请确认后继续') : presentation.phase === 'completed' ? '任务已处理完成' : presentation.phase === 'failed' ? '可以重新执行，系统会复用已有证据' : presentation.phase === 'cancelled' ? '任务已取消；需要时可以重新发起' : '系统会继续处理并更新结果')
  const userHandoff = buildUserHandoff({ provided: run.user_handoff || run.userHandoff || report.user_handoff || report.userHandoff || deliveryReport?.user_handoff || deliveryReport?.userHandoff, phase: presentation.phase, status: run.status, nextAction, blockers: uniq([userRequestSummary?.question, run.clarification_question, run.last_error, run.error]).slice(0, 4), deliveryReport, changeSummary, planAlignment, files, verification, risks })
  let actions = taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!run.mission_id, cancel: true, resume: true, retry: true, rollback: false, saveKnowledge: true })
  if (run.status === 'waiting_confirmation') actions = [
    { id: 'reject', kind: 'reject_confirmation', label: '取消', tone: 'outline' },
    { id: 'confirm', kind: 'confirm', label: '确认并继续', tone: 'primary' },
  ]
  if (run.status === 'waiting_clarification') actions = [
    { id: 'provide_clarification', kind: 'provide_clarification', label: '补充信息', tone: 'primary' },
    { id: 'cancel', kind: 'cancel', label: '取消', tone: 'outline' },
  ]
  const runDisplayStream = run.display_stream || run.displayStream || (run.workchain ? { workchain: run.workchain, user_visible_text: run.workchain.user_visible_text, tool_use_summary: { tool_summary: run.workchain.completion_summary?.evidence?.join('，') || '' }, technical_details: run.workchain.technical_details || [], progress_checkpoints: run.workchain.progress_checkpoints || null, delivery_report: deliveryReport } : deliveryReport ? { delivery_report: deliveryReport, user_visible_text: deliveryReport.headline } : null)
  const runProgressCheckpoints = runDisplayStream?.progress_checkpoints || runDisplayStream?.progressCheckpoints || runDisplayStream?.workchain?.progress_checkpoints || runDisplayStream?.workchain?.progressCheckpoints || null
  const mainAgentDecision = run.mainAgentDecision || run.main_agent_decision || message.mainAgentDecision || message.main_agent_decision || runDisplayStream?.mainAgentDecision || runDisplayStream?.main_agent_decision || null
  return {
    version: 1,
    task_id: run.mission_id || run.id,
    title: compact(run.goal || run.user_message || message.content || '全局任务', 90),
    goal: compact(run.goal || run.user_message || '', 240),
    phase: presentation.phase,
    phase_label: presentation.label,
    status: run.status,
    progress: presentation.progress,
    active_agents: presentation.phase === 'executing' ? ['全局主 Agent 正在处理'] : [],
    agents: [],
    work_items: runWorkItems,
    work_item_summary: mergeWorkItemSummary(run.work_item_summary || run.workItemSummary, runWorkItems),
    agent_progress_summary: agentProgressSummary,
    agentProgressSummary,
    change_summary: changeSummary,
    changeSummary,
    plan_mode: runPlanMode,
    planMode: runPlanMode,
    plan_alignment: planAlignment,
    planAlignment,
    user_request_summary: userRequestSummary,
    userRequestSummary,
    user_handoff: userHandoff,
    userHandoff,
    recovery_summary: recoverySummary,
    continuation_status: continuationStatus,
    receipt_rework_summary: receiptReworkSummary,
    completed: uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: uniq([run.clarification_question, run.last_error, run.error, ...risks]).slice(0, 4),
    next_action: nextAction,
    mainAgentDecision,
    main_agent_decision: mainAgentDecision,
    display_stream: runDisplayStream,
    progress_checkpoints: runProgressCheckpoints,
    delivery_report: deliveryReport,
    delivery: { headline: deliveryReport?.headline || report.summary || (presentation.phase === 'completed' ? compact(message.content, 240) : ''), files, changes: files, verification, risks, acceptance_passed: report.acceptance_gate_passed === true || deliveryReport?.status === 'done' },
    actions,
    technical: { trace_id: run.trace_id || '', execution_ids: [], session_ids: [], run_id: run.id, supervisor_id: run.supervisor_id || '', recovery_summary: recoverySummary, agent_progress_summary: agentProgressSummary, change_summary: changeSummary, plan_alignment: planAlignment, user_handoff: userHandoff },
  }
}

export const projectExecutionTaskCard = (message = {}, project = '') => {
  const task = message.taskExperience || {}
  const events = asArray(message.workEvents)
  const files = asArray(message.fileChanges?.files).map(item => item.path || item.file || item).filter(Boolean)
  const failed = events.some(item => item.kind === 'error') || /^❌/.test(String(message.content || ''))
  const done = !message.streaming && events.some(item => item.kind === 'done')
  const taskId = task.task_id || message.task_id || message.run_id || ''
  if (!message.streaming && !files.length && !failed && !task.requires_card) return null
  const presentation = taskPhasePresentation(task.phase || (failed ? 'failed' : done ? 'completed' : 'running'), message.streaming ? 'executing' : 'completed')
  const verification = uniq(task.verification || events.filter(item => item.kind === 'verification').map(item => item.text))
  const risks = uniq(task.risks || (failed ? [compact(message.content || events.find(item => item.kind === 'error')?.text, 180)] : []))
  const projectChangeSummary = task.change_summary || task.changeSummary || buildChangeSummary({ files: asArray(message.fileChanges?.files), agents: [{ agent: project }] })
  const projectPlanMode = task.plan_mode || task.planMode || message.plan_mode || message.planMode || null
  const projectPlanAlignment = buildPlanAlignment({ provided: task.plan_alignment || task.planAlignment, planMode: projectPlanMode, files: asArray(message.fileChanges?.files), verification, phase: presentation.phase, report: task })
  const nextAction = presentation.phase === 'completed' ? '可以查看改动或继续修改' : presentation.phase === 'failed' ? '可以重新执行' : '完成后会汇总改动和检查结果'
  const projectUserHandoff = buildUserHandoff({ provided: task.user_handoff || task.userHandoff, phase: presentation.phase, status: task.status || (failed ? 'failed' : done ? 'done' : 'in_progress'), nextAction, blockers: risks, changeSummary: projectChangeSummary, planAlignment: projectPlanAlignment, files: asArray(message.fileChanges?.files), verification, risks })
  return {
    version: 1,
    task_id: taskId,
    title: task.title || compact(message.requestText || `处理 ${project} 项目`, 90),
    goal: task.goal || compact(message.requestText || '', 240),
    phase: presentation.phase,
    phase_label: presentation.label,
    status: task.status || (failed ? 'failed' : done ? 'done' : 'in_progress'),
    progress: presentation.progress,
    active_agents: presentation.phase === 'executing' ? [`项目 Agent · ${project} 正在处理`] : [],
    agents: [{ name: `项目 Agent · ${project}`, status: failed ? 'failed' : done ? 'done' : 'running', summary: failed ? '执行遇到问题' : done ? '项目工作已完成' : '正在处理项目文件' }],
    change_summary: projectChangeSummary,
    changeSummary: projectChangeSummary,
    plan_mode: projectPlanMode,
    planMode: projectPlanMode,
    plan_alignment: projectPlanAlignment,
    planAlignment: projectPlanAlignment,
    user_handoff: projectUserHandoff,
    userHandoff: projectUserHandoff,
    completed: uniq([files.length ? `修改了 ${files.length} 个文件` : '', verification.length ? `${verification.length} 项检查已执行` : '']),
    blockers: risks.slice(0, 4),
    next_action: nextAction,
    delivery: { headline: task.headline || (done ? '项目 Agent 已完成本轮处理' : ''), files, changes: asArray(message.fileChanges?.files), verification, risks, acceptance_passed: done && !failed },
    actions: [
      ...taskActions(presentation.phase, { viewChanges: files.length > 0, continue: !!taskId, cancel: !!taskId, retry: !!taskId, rollback: !!task.rollback_available, saveKnowledge: !message.streaming }),
      ...(!message.streaming && taskId ? [
        { id: 'archive', kind: 'archive', label: '删除记录', tone: 'outline' },
        { id: 'purge', kind: 'purge', label: '永久清除', tone: 'danger' },
      ] : []),
    ],
    technical: taskId ? { trace_id: task.trace_id || message.projectRun?.trace_id || '', execution_ids: task.execution_ids || [], session_ids: task.session_ids || [], run_id: message.projectRun?.id || taskId, parent_run_id: message.projectRun?.parent_run_id || task.parent_run_id || '', plan_alignment: projectPlanAlignment, user_handoff: projectUserHandoff } : null,
  }
}
