<script setup>
import { computed, onMounted, ref } from 'vue'
import { toast, confirmDialog } from '../../utils/toast.js'

const loading = ref(false)
const overview = ref({ groups: [], projects: [], globals: [], alerts: [], totals: {}, metrics: { rates: {}, counters: {}, events: [] } })
const selectedScope = ref('')
const selectedId = ref('')
const detail = ref(null)
const activeView = ref('memory')
const activeType = ref('all')
const query = ref('')
const audit = ref([])
const evidence = ref([])
const evidenceOpen = ref(false)
const editState = ref(null)
const operationState = ref(null)
const qualityReport = ref(null)
const qualityLoading = ref(false)
const targetedQualityLoading = ref('')
const qualityTargetedSummary = ref(null)

const scopes = computed(() => [
  ...(overview.value.globals || []).map(item => ({ ...item, scope: 'global' })),
  ...(overview.value.groups || []).map(item => ({ ...item, scope: 'group' })),
  ...(overview.value.projects || []).map(item => ({ ...item, scope: 'project' }))
])

const selectedSummary = computed(() => scopes.value.find(item => item.scope === selectedScope.value && item.id === selectedId.value) || null)
const itemGroups = computed(() => detail.value?.itemGroups || [])
const visibleGroups = computed(() => itemGroups.value.map(group => {
  const matched = (group.items || []).filter(item => {
    if (activeType.value !== 'all' && group.type !== activeType.value) return false
    const text = `${item.text || ''} ${item.originalText || ''} ${item.itemId || ''}`.toLowerCase()
    return !query.value.trim() || text.includes(query.value.trim().toLowerCase())
  })
  const limit = activeType.value === 'all' && !query.value.trim() ? 8 : 40
  return { ...group, totalMatched: matched.length, items: matched.slice(0, limit) }
}).filter(group => group.items.length))

const memoryStats = computed(() => {
  const groups = itemGroups.value
  const items = groups.flatMap(group => group.items || [])
  return {
    total: items.length,
    pinned: items.filter(item => item.pinned && !item.deprecated).length,
    edited: items.filter(item => item.text !== item.originalText && !item.deprecated).length,
    deprecated: items.filter(item => item.deprecated).length
  }
})

const metricCards = computed(() => {
  const rates = overview.value.metrics?.rates || {}
  return [
    { label: '历史召回率', value: rates.recallRate, good: true, note: '找到相关原始证据的查询比例' },
    { label: '遗忘率', value: rates.forgettingRate, good: false, note: '上下文检查中遗漏约束的比例' },
    { label: '误派发率', value: rates.misdispatchRate, good: false, note: '被纠正为错误派发的任务比例' },
    { label: '恢复成功率', value: rates.recoverySuccessRate, good: true, note: '备份恢复与回滚成功比例' }
  ]
})

const qualityChecks = computed(() => qualityReport.value?.checks || [])
const qualityStatusText = computed(() => {
  const status = qualityReport.value?.status
  if (status === 'ok') return '质量稳定'
  if (status === 'warn') return '需要关注'
  if (status === 'fail') return '存在风险'
  return '等待采样'
})
const qualityRunMeta = computed(() => {
  const last = qualityReport.value?.lastTargetedRefresh || qualityTargetedSummary.value
  if (last?.checkId) {
    const duration = Number(last.durationMs || 0)
    return `单项 ${last.label || last.checkId} · ${duration}ms`
  }
  if (!qualityReport.value) return ''
  if (qualityReport.value.cached) return `缓存 ${Math.round(Number(qualityReport.value.cacheAgeMs || 0) / 1000)}s`
  if (qualityReport.value.durationMs !== undefined) return `耗时 ${Number(qualityReport.value.durationMs || 0)}ms`
  return ''
})
const postCompactUsage = computed(() => detail.value?.postCompactUsage || null)
const postCompactTotals = computed(() => postCompactUsage.value?.summary?.totals || postCompactUsage.value?.ledger?.totals || {})
const postCompactDiscipline = computed(() => postCompactUsage.value?.discipline || null)
const postCompactDispatch = computed(() => postCompactUsage.value?.dispatch || null)
const childAgentReliability = computed(() => postCompactUsage.value?.agentReliability || null)
const compactBoundaryTimeline = computed(() => postCompactUsage.value?.boundaryTimeline || null)
const groupSessionMemory = computed(() => postCompactUsage.value?.sessionMemory || selectedSummary.value?.sessionMemory || null)
const compactionHooks = computed(() => postCompactUsage.value?.compactionHooks || null)
const boundaryReplay = computed(() => postCompactUsage.value?.boundaryReplay || null)
const historicalBoundaryReplay = computed(() => postCompactUsage.value?.historicalBoundaryReplay || null)
const agentTypeReplay = computed(() => postCompactUsage.value?.agentTypeReplay || null)
const boundaryReplayRepairActions = computed(() => boundaryReplay.value?.repairPlan?.actions || [])
const boundaryReplayRepairLedger = computed(() => boundaryReplay.value?.repairLedger || null)
const boundaryReplayRepairWorkItems = computed(() => boundaryReplay.value?.repairWorkItems || postCompactUsage.value?.replayRepairWorkItems || null)
const replayRepairDispatchCandidates = computed(() => postCompactUsage.value?.replayRepairDispatchCandidates || boundaryReplay.value?.replayRepairDispatchCandidates || null)
const groupToolContinuity = computed(() => postCompactUsage.value?.toolContinuity || selectedSummary.value?.toolContinuity || null)
const compactFileReferences = computed(() => postCompactUsage.value?.compactFileReferences || null)
const compactFileReferenceReadPlan = computed(() => postCompactUsage.value?.compactFileReferenceReadPlan || null)
const compactFileReferenceReadPlanAccess = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanAccess || null)
const compactFileReferenceReadPlanFreshness = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanFreshness || null)
const compactFileReferenceReadPlanRevalidationGate = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanRevalidationGate || null)
const compactFileReferenceReadPlanDiscipline = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanDiscipline || null)
const compactFileReferenceReadPlanRevalidationDiscipline = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanRevalidationDiscipline || null)
const compactFileReferenceReadPlanRevalidationSessionBinding = computed(() => postCompactUsage.value?.compactFileReferenceReadPlanRevalidationSessionBinding || null)
const compactFileReferenceAccess = computed(() => postCompactUsage.value?.compactFileReferenceAccess || null)
const compactFileReferenceDiscipline = computed(() => postCompactUsage.value?.compactFileReferenceDiscipline || null)
const boundaryReplayRepairWorkRows = computed(() => {
  const work = boundaryReplayRepairWorkItems.value || {}
  return (work.items || work.openItems || []).slice(0, 8)
})
const replayRepairDispatchRows = computed(() => {
  const candidates = replayRepairDispatchCandidates.value || {}
  return (candidates.candidates || []).slice(0, 8)
})
const postCompactCards = computed(() => {
  const scoring = postCompactUsage.value?.typedMemory?.recallScoring || {}
  const archive = postCompactUsage.value?.archive || {}
  const discipline = postCompactDiscipline.value || {}
  return [
    { label: '候选', value: postCompactUsage.value?.summary?.candidateCount || 0, note: `账本 ${postCompactUsage.value?.ledger?.entryCount || 0} 条` },
    { label: 'used', value: postCompactTotals.value.used || 0, note: '子 Agent 明确使用' },
    { label: 'ignored', value: postCompactTotals.value.ignored || 0, note: '子 Agent 明确忽略' },
    { label: 'verified', value: postCompactTotals.value.verified || 0, note: '已核验当前状态' },
    { label: '严格分类率', value: discipline.effectiveStrictClassificationRate ?? discipline.strictClassificationRate ?? '—', suffix: discipline.effectiveStrictClassificationRate !== null && discipline.effectiveStrictClassificationRate !== undefined ? '%' : '', note: `阈值 ${discipline.threshold || 90}%` },
    { label: 'stale promoted', value: discipline.stalePromoted || 0, note: '旧候选直接 used' },
    { label: '召回加权', value: scoring.boosted_count || 0, note: `降权 ${scoring.deprioritized_count || 0}` },
    { label: '低优先归档', value: archive.archivedCount || 0, note: '蒸馏后不默认提升' }
  ]
})
const postCompactDisciplineCards = computed(() => {
  const discipline = postCompactDiscipline.value || {}
  const ledger = discipline.ledger || {}
  return [
    { label: 'task rows', value: discipline.checked || 0, note: `通过 ${discipline.strictClassified || 0}` },
    { label: 'missing', value: discipline.missing || 0, note: '未严格分类' },
    { label: 'ledger rate', value: ledger.strictClassificationRate ?? '—', suffix: ledger.strictClassificationRate !== null && ledger.strictClassificationRate !== undefined ? '%' : '', note: `open ${ledger.openMentionedCount || 0}` },
    { label: 'recent tasks', value: discipline.taskCount || 0, note: discipline.status || 'empty' }
  ]
})
const groupSessionMemoryCards = computed(() => {
  const session = groupSessionMemory.value || {}
  return [
    { label: 'summary.md', value: session.markdownExists ? 'yes' : 'no', note: session.summaryFile || 'no summary file' },
    { label: 'checksum', value: session.markdownChecksumMatches ? 'ok' : 'check', note: session.markdownChecksum || 'unknown' },
    { label: 'chars', value: session.markdownChars || 0, note: session.hasSummary ? 'injectable' : 'empty' },
    { label: 'compacted', value: session.compactedMessageCount || 0, note: session.lastSummarizedMessageId || 'recent-window' }
  ]
})
const groupToolContinuityCards = computed(() => {
  const continuity = groupToolContinuity.value || {}
  const allowed = continuity.allowedTools || {}
  const requested = continuity.requested || {}
  const synced = continuity.synced || {}
  const missing = continuity.missing || {}
  const count = set => (Array.isArray(set.mcp) ? set.mcp.length : 0) + (Array.isArray(set.skill) ? set.skill.length : 0)
  return [
    { label: 'allowed', value: count(allowed), note: `MCP ${(allowed.mcp || []).length} / Skill ${(allowed.skill || []).length}` },
    { label: 'requested', value: count(requested), note: `MCP ${(requested.mcp || []).length} / Skill ${(requested.skill || []).length}` },
    { label: 'synced', value: count(synced), note: `MCP ${(synced.mcp || []).length} / Skill ${(synced.skill || []).length}` },
    { label: 'missing', value: count(missing), note: `MCP ${(missing.mcp || []).length} / Skill ${(missing.skill || []).length}` },
    { label: 'invoked', value: (continuity.invokedSkills || []).length, note: continuity.hasRuntimeEvidence ? 'runtime evidence' : 'context only' },
    { label: 'policy', value: continuity.shouldBypassAuthorization ? 'fail' : 'context', note: continuity.shouldReuseAsContext ? 'no auth bypass' : 'check' }
  ]
})
const groupToolContinuityState = computed(() => {
  const continuity = groupToolContinuity.value || {}
  if (continuity.shouldBypassAuthorization) return 'fail'
  const missing = continuity.missing || {}
  const missingCount = (missing.mcp || []).length + (missing.skill || []).length
  if (missingCount > 0 || continuity.markdownChecksumMatches === false) return 'warn'
  return 'ok'
})
const groupToolContinuityRows = computed(() => {
  const continuity = groupToolContinuity.value || {}
  const rows = []
  for (const item of (continuity.invokedSkills || []).slice(0, 6)) {
    rows.push({ key: `skill:${item.name}:${item.contentHash || ''}`, type: 'skill', state: 'verified', title: item.name || 'unknown skill', detail: item.contentHash || item.source || 'invoked skill' })
  }
  for (const item of (continuity.missing?.mcp || []).slice(0, 5)) rows.push({ key: `missing-mcp:${item}`, type: 'missing', state: 'ignored', title: item, detail: 'missing MCP' })
  for (const item of (continuity.missing?.skill || []).slice(0, 5)) rows.push({ key: `missing-skill:${item}`, type: 'missing', state: 'ignored', title: item, detail: 'missing Skill' })
  return rows
})
const compactFileReferenceCards = computed(() => {
  const refs = compactFileReferences.value || {}
  const access = compactFileReferenceAccess.value || {}
  return [
    { label: 'references', value: refs.referenceCount || 0, note: `files ${refs.fileCount || 0} / dirs ${refs.directoryCount || 0}` },
    { label: 'missing', value: refs.missingCount || 0, note: 'missing paths' },
    { label: 'surfaced', value: access.ledger_entry_count || 0, note: access.ledger_file || 'no ledger' },
    { label: 'mentioned', value: access.mentioned_count || 0, note: `${access.reference_count || 0} refs` }
  ]
})
const compactFileReferenceRows = computed(() => {
  const refs = compactFileReferences.value || {}
  return (refs.references || []).slice(0, 8)
})
const compactFileReferenceReadPlanState = computed(() => {
  const plan = compactFileReferenceReadPlan.value || {}
  if (!plan.schema) return 'waiting'
  if (!plan.hasSourceOfTruth || !plan.hasCompactSummary) return 'warn'
  if (!plan.plannedCount) return 'fail'
  return 'ok'
})
const compactFileReferenceReadPlanCards = computed(() => {
  const plan = compactFileReferenceReadPlan.value || {}
  return [
    { label: 'planned', value: plan.plannedCount || 0, note: `${plan.sourceReferenceCount || 0} refs` },
    { label: 'missing', value: plan.missingCount || 0, note: 'skipped paths' },
    { label: 'source', value: plan.hasSourceOfTruth ? 'yes' : 'no', note: 'raw/group json' },
    { label: 'summary', value: plan.hasCompactSummary ? 'yes' : 'no', note: 'session/typed/tool' }
  ]
})
const compactFileReferenceReadPlanRows = computed(() => {
  const plan = compactFileReferenceReadPlan.value || {}
  return (plan.entries || []).slice(0, 8)
})
const compactFileReferenceReadPlanReceiptState = computed(() => {
  const discipline = compactFileReferenceReadPlanDiscipline.value || {}
  if (discipline.status === 'empty') return 'waiting'
  return discipline.status || 'waiting'
})
const compactFileReferenceReadPlanReceiptCards = computed(() => {
  const access = compactFileReferenceReadPlanAccess.value || {}
  const discipline = compactFileReferenceReadPlanDiscipline.value || {}
  return [
    { label: 'checked', value: discipline.checked || 0, note: `ledger ${discipline.ledgerEntryCount || access.ledger_entry_count || 0}` },
    { label: 'read_plan_id', value: discipline.passed ?? access.read_plan_id_mentioned_count ?? 0, note: `${discipline.checked || access.read_plan_entry_count || 0} plans` },
    { label: 'mentioned', value: discipline.mentioned ?? access.mentioned_count ?? 0, note: `indirect ${discipline.indirectMentionCount || 0}` },
    { label: 'score', value: discipline.score ?? access.read_plan_id_mention_rate ?? '—', suffix: discipline.score !== null && discipline.score !== undefined ? '%' : '', note: discipline.status || 'waiting' }
  ]
})
const compactFileReferenceReadPlanReceiptRows = computed(() => {
  const discipline = compactFileReferenceReadPlanDiscipline.value || {}
  const access = compactFileReferenceReadPlanAccess.value || {}
  return (discipline.rows || access.rows || []).slice(0, 8)
})
const compactFileReferenceReadPlanReceiptGaps = computed(() => {
  const discipline = compactFileReferenceReadPlanDiscipline.value || {}
  return (discipline.gaps || []).slice(0, 5)
})
const compactFileReferenceReadPlanFreshnessState = computed(() => {
  const freshness = compactFileReferenceReadPlanFreshness.value || {}
  if (freshness.status === 'empty') return 'waiting'
  return freshness.status || 'waiting'
})
const compactFileReferenceReadPlanFreshnessCards = computed(() => {
  const freshness = compactFileReferenceReadPlanFreshness.value || {}
  return [
    { label: 'fresh', value: freshness.freshCount || 0, note: `${freshness.checked || 0} checked` },
    { label: 'changed', value: freshness.changedCount || 0, note: 'must re-read' },
    { label: 'unknown', value: freshness.unverifiableCount || 0, note: 'fingerprint missing' },
    { label: 'rate', value: freshness.freshnessRate ?? '—', suffix: freshness.freshnessRate !== null && freshness.freshnessRate !== undefined ? '%' : '', note: freshness.status || 'waiting' }
  ]
})
const compactFileReferenceReadPlanFreshnessRows = computed(() => {
  const freshness = compactFileReferenceReadPlanFreshness.value || {}
  return (freshness.rows || []).slice(0, 8)
})
const compactFileReferenceReadPlanFreshnessGaps = computed(() => {
  const freshness = compactFileReferenceReadPlanFreshness.value || {}
  return (freshness.gaps || []).slice(0, 5)
})
const compactFileReferenceReadPlanRevalidationState = computed(() => {
  const discipline = compactFileReferenceReadPlanRevalidationDiscipline.value || {}
  const gate = compactFileReferenceReadPlanRevalidationGate.value || {}
  const session = compactFileReferenceReadPlanRevalidationSessionBinding.value || {}
  if (session.status === 'fail' || Number(session.missing || 0) > 0) return 'fail'
  if (discipline.status === 'empty' || gate.status === 'empty' || gate.status === 'not_required') return 'waiting'
  if (!discipline.status && gate.status === 'required') return 'fail'
  if (!discipline.status && gate.status === 'verify_recommended') return 'warn'
  return discipline.status || gate.status || 'waiting'
})
const compactFileReferenceReadPlanRevalidationCards = computed(() => {
  const gate = compactFileReferenceReadPlanRevalidationGate.value || {}
  const discipline = compactFileReferenceReadPlanRevalidationDiscipline.value || {}
  const session = compactFileReferenceReadPlanRevalidationSessionBinding.value || {}
  return [
    { label: 'required', value: gate.required_count || discipline.checked || 0, note: gate.status || 'waiting' },
    { label: 'verified', value: discipline.verified || 0, note: 'current source' },
    { label: 'ignored', value: discipline.ignored || 0, note: 'declared unused' },
    { label: 'score', value: discipline.score ?? '—', suffix: discipline.score !== null && discipline.score !== undefined ? '%' : '', note: discipline.missing ? `${discipline.missing} missing` : discipline.status || 'waiting' },
    { label: 'session', value: session.passed ?? discipline.sessionMatched ?? 0, note: `${session.checked ?? discipline.sessionRequired ?? 0} bound` },
    { label: 'mismatch', value: session.missing ?? discipline.sessionMismatch ?? 0, note: session.status || 'session binding' }
  ]
})
const compactFileReferenceReadPlanRevalidationRows = computed(() => {
  const discipline = compactFileReferenceReadPlanRevalidationDiscipline.value || {}
  const gate = compactFileReferenceReadPlanRevalidationGate.value || {}
  return (discipline.rows || [...(gate.required_entries || []), ...(gate.verification_entries || [])]).slice(0, 8)
})
const compactFileReferenceReadPlanRevalidationGaps = computed(() => {
  const discipline = compactFileReferenceReadPlanRevalidationDiscipline.value || {}
  return (discipline.gaps || []).slice(0, 5)
})
const compactFileReferenceDisciplineState = computed(() => {
  const status = compactFileReferenceDiscipline.value?.status
  if (status === 'empty') return 'waiting'
  return status || 'waiting'
})
const compactFileReferenceDisciplineCards = computed(() => {
  const discipline = compactFileReferenceDiscipline.value || {}
  return [
    { label: 'checked', value: discipline.checked || 0, note: `ledger ${discipline.ledgerEntryCount || 0}` },
    { label: 'passed', value: discipline.passed || 0, note: 'declared in receipts' },
    { label: 'missing', value: discipline.missing || 0, note: 'needs memoryUsed/memoryIgnored' },
    { label: 'mention rate', value: discipline.mentionRate ?? discipline.score ?? '—', suffix: discipline.mentionRate !== null && discipline.mentionRate !== undefined ? '%' : '', note: discipline.status || 'waiting' }
  ]
})
const compactFileReferenceDisciplineRows = computed(() => {
  const discipline = compactFileReferenceDiscipline.value || {}
  return (discipline.rows || []).slice(0, 8)
})
const compactFileReferenceDisciplineGaps = computed(() => {
  const discipline = compactFileReferenceDiscipline.value || {}
  return (discipline.gaps || []).slice(0, 5)
})
const postCompactDisciplineGaps = computed(() => (postCompactDiscipline.value?.recentRows || []).filter(row => row.strict_pass === false).slice(0, 6))
const postCompactDispatchCards = computed(() => {
  const dispatch = postCompactDispatch.value || {}
  return [
    { label: 'markers', value: dispatch.entryCount || 0, note: `first ${dispatch.firstDispatchCount || 0}` },
    { label: 'targets', value: dispatch.targetCount || 0, note: `boundary ${dispatch.boundaryCount || 0}` },
    { label: 'first rate', value: dispatch.firstDispatchRate ?? '—', suffix: dispatch.firstDispatchRate !== null && dispatch.firstDispatchRate !== undefined ? '%' : '', note: dispatch.status || 'empty' },
    { label: 'latest coverage', value: dispatch.latestBoundaryTargetCoverageRate ?? '—', suffix: dispatch.latestBoundaryTargetCoverageRate !== null && dispatch.latestBoundaryTargetCoverageRate !== undefined ? '%' : '', note: `gaps ${dispatch.gaps?.length || 0}` }
  ]
})
const childAgentReliabilityCards = computed(() => {
  const reliability = childAgentReliability.value || {}
  return [
    { label: 'score', value: reliability.score ?? '—', suffix: reliability.score !== null && reliability.score !== undefined ? '%' : '', note: reliability.status || 'empty' },
    { label: 'agents', value: reliability.agentCount || 0, note: `scored ${reliability.scoredAgentCount || 0}` },
    { label: 'weak', value: (reliability.agents || []).filter(agent => agent.status === 'fail' || agent.status === 'warn').length, note: '需要关注' },
    { label: 'compacted', value: reliability.compacted ? 'yes' : 'no', note: 'post-compact' }
  ]
})
const weakChildAgents = computed(() => (childAgentReliability.value?.agents || []).filter(agent => agent.status === 'fail' || agent.status === 'warn').slice(0, 6))
const compactBoundaryTimelineCards = computed(() => {
  const timeline = compactBoundaryTimeline.value || {}
  const boundary = timeline.boundary || {}
  return [
    { label: 'timeline', value: timeline.score ?? '—', suffix: timeline.score !== null && timeline.score !== undefined ? '%' : '', note: timeline.status || 'empty' },
    { label: 'reduction', value: boundary.reductionRate ?? '—', suffix: boundary.reductionRate !== null && boundary.reductionRate !== undefined ? '%' : '', note: `${formatNumber(boundary.preCompactTokenCount || 0)} -> ${formatNumber(boundary.postCompactTokenCount || 0)}` },
    { label: 'pressure', value: boundary.tokenPressure ?? '—', suffix: boundary.tokenPressure !== null && boundary.tokenPressure !== undefined ? '%' : '', note: 'post compact' },
    { label: 'events', value: timeline.events?.length || 0, note: `gaps ${timeline.gaps?.length || 0}` }
  ]
})
const compactionHookCards = computed(() => {
  const hooks = compactionHooks.value || {}
  return [
    { label: 'score', value: hooks.score ?? '—', suffix: hooks.score !== null && hooks.score !== undefined ? '%' : '', note: hooks.status || 'empty' },
    { label: 'pre', value: hooks.preCount || 0, note: 'before compact' },
    { label: 'post', value: hooks.postCount || 0, note: 'after compact' },
    { label: 'failed', value: hooks.failedCount || 0, note: `${hooks.avgDurationMs || 0}ms avg` }
  ]
})
const boundaryReplayCards = computed(() => {
  const replay = boundaryReplay.value || {}
  const repairPlan = replay.repairPlan || {}
  const repairLedger = replay.repairLedger || {}
  return [
    { label: 'score', value: replay.score ?? '—', suffix: replay.score !== null && replay.score !== undefined ? '%' : '', note: replay.status || 'empty' },
    { label: 'matched', value: replay.passed || 0, note: `of ${replay.checked || 0}` },
    { label: 'candidates', value: replay.candidateCount || 0, note: replay.targetProject || 'target' },
    { label: 'repair', value: repairPlan.requiredActionCount || 0, note: `${repairLedger.attemptCount || 0} attempts · work ${boundaryReplayRepairWorkItems.value?.openItemCount || 0}` }
  ]
})
const historicalBoundaryReplayCards = computed(() => {
  const replay = historicalBoundaryReplay.value || {}
  return [
    { label: 'score', value: replay.score ?? '—', suffix: replay.score !== null && replay.score !== undefined ? '%' : '', note: replay.status || 'empty' },
    { label: 'boundaries', value: replay.boundaryCount || 0, note: `replayed ${replay.replayedBoundaryCount || 0}` },
    { label: 'passed', value: replay.passedBoundaryCount || 0, note: `gaps ${replay.gapCount || 0}` },
    { label: 'target', value: replay.targetProject || 'agent', note: 'history replay' }
  ]
})
const agentTypeReplayCards = computed(() => {
  const matrix = agentTypeReplay.value || {}
  return [
    { label: 'score', value: matrix.score ?? '—', suffix: matrix.score !== null && matrix.score !== undefined ? '%' : '', note: matrix.status || 'empty' },
    { label: 'types', value: matrix.agentTypeCount || 0, note: `weak ${matrix.weakTypeCount || 0}` },
    { label: 'targets', value: matrix.targetCount || 0, note: `gaps ${matrix.gaps?.length || 0}` },
    { label: 'checked', value: (matrix.targets || []).reduce((sum, row) => sum + Number(row.checked || 0), 0), note: 'profile checks' }
  ]
})
const postCompactBuckets = computed(() => [
  { key: 'useful', label: '提升或保留', rows: postCompactUsage.value?.summary?.usefulCandidates || [] },
  { key: 'ignored', label: '降权候选', rows: postCompactUsage.value?.summary?.ignoredCandidates || [] },
  { key: 'missing', label: '需补结果说明', rows: postCompactUsage.value?.summary?.missingUsageCandidates || [] },
  { key: 'archive', label: '低优先归档', rows: postCompactUsage.value?.archive?.rows || [] }
].filter(bucket => bucket.rows.length))
const postCompactRecallRows = computed(() => [
  ...(postCompactUsage.value?.typedMemory?.boostedDocs || []).map(row => ({ ...row, kind: 'boosted' })),
  ...(postCompactUsage.value?.typedMemory?.deprioritizedDocs || []).map(row => ({ ...row, kind: 'deprioritized' }))
])

const typeLabels = {
  persistentRequirements: '用户约束', factAnchors: '事实锚点', decisions: '架构决策',
  conclusions: '任务结论', completed: '已完成', blocked: '阻塞事项', workerLedger: 'Agent 结果说明',
  openQuestions: '开放问题', nextActions: '下一步', decisionsArchive: '历史决策', conclusionsArchive: '历史结论',
  user: '用户画像', feedback: '工作偏好', authorization: '授权边界', missions: '全局任务结论',
  unresolved: '未完成事项', references: '资源索引', sessionArchives: '加密会话归档'
}

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatRate = value => value === null || value === undefined ? '待采样' : `${value}%`
const formatMetric = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return '—'
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return String(value)
  return `${numberValue.toLocaleString('zh-CN')}${suffix || ''}`
}
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无记录'
const formatSigned = value => `${Number(value || 0) > 0 ? '+' : ''}${Number(value || 0)}`
const compactDisplay = (value, max = 620) => {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}
const recommendationText = value => {
  if (value === 'promote_recall') return '提升召回'
  if (value === 'deprioritize_or_distill') return '降权蒸馏'
  if (value === 'require_usage_receipt') return '要求结果说明'
  return '核验后使用'
}

const requestJson = async (url, options) => {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok || data.success === false) throw new Error(data.error || '请求失败')
  return data
}

const qualityStatusFromScore = score => {
  if (score === null || score === undefined) return 'empty'
  if (Number(score) >= 90) return 'ok'
  if (Number(score) >= 70) return 'warn'
  return 'fail'
}

const summarizeQualityChecks = checks => {
  const scored = checks.filter(check => check.score !== null && check.score !== undefined)
  const overallScore = scored.length
    ? Math.round(scored.reduce((sum, check) => sum + Number(check.score || 0), 0) / scored.length * 10) / 10
    : null
  return {
    overallScore,
    status: qualityStatusFromScore(overallScore),
    nextActions: checks
      .flatMap(check => (check.gaps || []).slice(0, 2).map(gap => `${check.label}：${gap.reason || '存在缺口'}`))
      .slice(0, 8)
  }
}

const mergeTargetedQualityReport = (targetedReport, requestedCheckId) => {
  const refreshedCheck = (targetedReport?.checks || []).find(check => check.id === requestedCheckId) || targetedReport?.checks?.[0]
  if (!refreshedCheck) throw new Error('定向质量检查没有返回结果')
  const baseReport = qualityReport.value || { checks: [] }
  const currentChecks = Array.isArray(baseReport.checks) ? baseReport.checks : []
  const checks = currentChecks.some(check => check.id === refreshedCheck.id)
    ? currentChecks.map(check => check.id === refreshedCheck.id ? refreshedCheck : check)
    : [refreshedCheck, ...currentChecks]
  const summary = summarizeQualityChecks(checks)
  const lastTargetedRefresh = {
    checkId: refreshedCheck.id,
    label: refreshedCheck.label,
    generatedAt: targetedReport?.generatedAt,
    durationMs: targetedReport?.durationMs,
    unknownCheckIds: targetedReport?.unknownCheckIds || []
  }
  qualityReport.value = {
    ...baseReport,
    checks,
    overallScore: summary.overallScore,
    status: summary.status,
    nextActions: summary.nextActions,
    targeted: false,
    cached: false,
    availableCheckIds: targetedReport?.availableCheckIds || baseReport.availableCheckIds,
    lastTargetedRefresh
  }
  qualityTargetedSummary.value = lastTargetedRefresh
}

const loadOverview = async (preserveSelection = true) => {
  loading.value = true
  try {
    overview.value = await requestJson('/api/memory-center/overview')
    await loadQuality(false)
    const stillExists = scopes.value.some(item => item.scope === selectedScope.value && item.id === selectedId.value)
    if (!preserveSelection || !stillExists) {
      const preferred = scopes.value.find(item => item.alerts > 0)
        || scopes.value.reduce((best, item) => Number(item.beforeTokens || 0) > Number(best?.beforeTokens || 0) ? item : best, null)
        || scopes.value[0]
      if (preferred) {
        selectedScope.value = preferred.scope
        selectedId.value = preferred.id
      }
    }
    if (selectedId.value) await loadDetail()
  } catch (error) {
    toast.error(error.message || '读取记忆控制中心失败')
  } finally {
    loading.value = false
  }
}

const loadQuality = async (showToast = false) => {
  qualityLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/quality')
    qualityReport.value = data.quality || null
    qualityTargetedSummary.value = null
    if (showToast) toast.success('记忆压缩质量已刷新')
  } catch (error) {
    if (showToast) toast.error(error.message || '读取记忆质量失败')
  } finally {
    qualityLoading.value = false
  }
}

const runQuality = async () => {
  qualityLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/quality', { method: 'POST' })
    qualityReport.value = data.quality || null
    qualityTargetedSummary.value = null
    toast.success(`压缩质量评估完成：${qualityReport.value?.overallScore ?? '待采样'}%`)
  } catch (error) {
    toast.error(error.message || '压缩质量评估失败')
  } finally {
    qualityLoading.value = false
  }
}

const refreshQualityCheck = async check => {
  const checkId = typeof check === 'string' ? check : check?.id
  if (!checkId || targetedQualityLoading.value || qualityLoading.value) return
  targetedQualityLoading.value = checkId
  try {
    const data = await requestJson('/api/memory-center/quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkIds: [checkId], refresh: true, record: true })
    })
    mergeTargetedQualityReport(data.quality || null, checkId)
    const refreshed = qualityReport.value?.lastTargetedRefresh
    toast.success(`已刷新：${refreshed?.label || checkId}`)
  } catch (error) {
    toast.error(error.message || '单项质量检查失败')
  } finally {
    if (targetedQualityLoading.value === checkId) targetedQualityLoading.value = ''
  }
}

const loadDetail = async () => {
  if (!selectedId.value) return
  try {
    detail.value = await requestJson(`/api/memory-center/scope?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}`)
    if (activeView.value === 'audit') await loadAudit()
  } catch (error) {
    detail.value = null
    toast.error(error.message || '读取记忆详情失败')
  }
}

const selectScope = async item => {
  selectedScope.value = item.scope
  selectedId.value = item.id
  activeType.value = 'all'
  query.value = ''
  await loadDetail()
}

const setView = async view => {
  activeView.value = view
  if (view === 'audit') await loadAudit()
}

const loadAudit = async () => {
  if (!selectedId.value) return
  try {
    const data = await requestJson(`/api/memory-center/audit?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}&limit=300`)
    audit.value = data.audit || []
  } catch (error) {
    toast.error(error.message || '读取审计记录失败')
  }
}

const controlItem = async (item, action, extra = {}) => {
  try {
    await requestJson('/api/memory-center/control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: selectedScope.value, scope_id: selectedId.value, item_type: item.type, item_id: item.itemId, action, ...extra })
    })
    toast.success(action === 'pin' ? '记忆已固定' : action === 'unpin' ? '已取消固定' : action === 'restore' ? '已恢复原始记忆' : '记忆已更新')
    editState.value = null
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '记忆操作失败')
  }
}

const openEdit = (item, mode) => {
  editState.value = { item, mode, text: item.text || '', reason: '' }
}

const submitEdit = async () => {
  if (!editState.value) return
  const { item, mode, text, reason } = editState.value
  await controlItem(item, mode, { text, reason })
}

const openEvidence = async item => {
  const ref = item.evidence || {}
  if (!ref.messageId && !ref.taskId) return toast.info('这条记忆来自结构化状态，没有可定位的消息 ID')
  try {
    const params = new URLSearchParams()
    if (ref.groupId) params.set('group_id', ref.groupId)
    if (selectedScope.value === 'global') params.set('scope', 'global')
    if (ref.sessionId) params.set('session_id', ref.sessionId)
    if (ref.missionId) params.set('mission_id', ref.missionId)
    if (ref.messageId) params.set('message_id', ref.messageId)
    if (ref.taskId) params.set('task_id', ref.taskId)
    const data = await requestJson(`/api/memory-center/evidence?${params}`)
    evidence.value = data.evidence || []
    evidenceOpen.value = true
  } catch (error) {
    toast.error(error.message || '读取原始证据失败')
  }
}

const openOperation = operation => {
  operationState.value = { operation, reason: '', pattern: '' }
}

const removeBlockedPattern = async pattern => {
  operationState.value = { operation: 'remove_block_pattern', reason: '用户删除禁记规则', pattern }
  await runOperation()
}

const runOperation = async () => {
  const state = operationState.value
  if (!state) return
  if (state.operation === 'rollback') {
    const ok = await confirmDialog('回滚会用最近有效备份替换当前记忆，同时保留回滚前快照。确定继续？')
    if (!ok) return
  }
  loading.value = true
  try {
    await requestJson('/api/memory-center/operation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: selectedScope.value, scope_id: selectedId.value, operation: state.operation, reason: state.reason, pattern: state.pattern })
    })
    toast.success(state.operation === 'compact' ? '手动压缩完成' : state.operation === 'rebuild' ? '记忆已从原始数据重建' : state.operation === 'disable' ? '全局记忆写入已禁用' : state.operation === 'enable' ? '全局记忆写入已启用' : state.operation === 'block_pattern' ? '禁记规则已添加' : state.operation === 'remove_block_pattern' ? '禁记规则已删除' : '已从备份回滚')
    operationState.value = null
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '维护操作失败')
  } finally {
    loading.value = false
  }
}

const replayWorkActionLabel = action => {
  if (action === 'claim') return '认领'
  if (action === 'dispatch') return '派发标记'
  if (action === 'complete') return '完成'
  if (action === 'block') return '阻塞'
  if (action === 'cancel') return '取消'
  if (action === 'reopen') return '重开'
  return action
}

const updateReplayRepairWorkItem = async (item, action) => {
  if (selectedScope.value !== 'group') return toast.info('Replay 修复工作项只属于群聊记忆')
  const itemId = item.id || item.work_item_id
  if (!itemId) return toast.error('缺少 work item id')
  const payload = {
    group_id: selectedId.value,
    item_id: itemId,
    action,
    owner: 'group-main-agent',
    reason: `${replayWorkActionLabel(action)} replay repair work item`
  }
  if (action === 'dispatch') payload.dispatch_target = item.target_project || item.target || item.repair_target || ''
  if (action === 'block') {
    const reason = window.prompt('阻塞原因', item.blockedReason || item.instruction || '')
    if (reason === null) return
    payload.reason = reason || payload.reason
  }
  if (action === 'complete') {
    const reason = window.prompt('完成说明', item.expected || item.instruction || '已完成 replay repair work item')
    if (reason === null) return
    payload.reason = reason || payload.reason
  }
  try {
    await requestJson('/api/memory-center/replay-repair-work-item', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    toast.success(`Replay 修复工作项已${replayWorkActionLabel(action)}`)
    await loadDetail()
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || 'Replay 修复工作项更新失败')
  }
}

const submitFeedback = async type => {
  try {
    const data = await requestJson('/api/memory-center/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, scope: selectedScope.value, scope_id: selectedId.value, reason: '控制中心人工验收' })
    })
    overview.value.metrics = data.metrics
    toast.success('验收反馈已计入长期指标')
  } catch (error) {
    toast.error(error.message || '记录反馈失败')
  }
}

const runAcceptance = async () => {
  loading.value = true
  try {
    const data = await requestJson('/api/memory-center/acceptance', { method: 'POST' })
    overview.value.metrics = data.metrics
    toast.success(`长期验收完成：覆盖 ${data.acceptance?.dataset?.groupMessages || 0} 条真实群聊消息`)
  } catch (error) {
    toast.error(error.message || '长期验收失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadOverview(false))
</script>

<template>
  <div class="memory-center">
    <header class="mc-header aura-card">
      <div>
        <div class="eyebrow">MEMORY CONTROL CENTER</div>
        <h2>Agent 记忆控制中心</h2>
        <p>看见 Agent 当前记住了什么、依据什么，并在失真前纠正它。</p>
      </div>
      <div class="header-actions">
        <span class="sync-time">快照 {{ formatTime(overview.generatedAt) }}</span>
        <button class="btn btn-outline" :disabled="qualityLoading" @click="runQuality">{{ qualityLoading ? '评估中' : '评估压缩质量' }}</button>
        <button class="btn btn-outline" :disabled="loading" @click="loadOverview(true)">{{ loading ? '同步中' : '刷新状态' }}</button>
      </div>
    </header>

    <section class="summary-strip">
      <article class="summary-card">
        <span class="summary-label">健康范围</span>
        <strong>{{ overview.totals?.healthy || 0 }} / {{ overview.totals?.scopes || 0 }}</strong>
        <small>群聊与项目记忆</small>
      </article>
      <article class="summary-card" :class="{ warning: overview.totals?.alerts }">
        <span class="summary-label">主动告警</span>
        <strong>{{ overview.totals?.alerts || 0 }}</strong>
        <small>冲突、漂移、恢复与压力</small>
      </article>
      <article v-for="metric in metricCards" :key="metric.label" class="summary-card metric-card" :class="{ risk: !metric.good && metric.value > 0 }">
        <span class="summary-label">{{ metric.label }}</span>
        <strong>{{ formatRate(metric.value) }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </section>

    <section v-if="overview.alerts?.length" class="global-alerts">
      <div v-for="alert in overview.alerts.slice(0, 5)" :key="alert.id" :class="['global-alert', alert.severity]"><span></span><strong>{{ alert.code }}</strong><p>{{ alert.message }}</p><small>{{ alert.scope === 'system' ? '全局基线' : `${alert.scope} / ${alert.scopeId}` }}</small></div>
    </section>

    <section class="quality-panel aura-card">
      <div class="quality-panel-head">
        <div>
          <span class="panel-kicker">COMPACTION QUALITY</span>
          <h3>记忆压缩质量评估</h3>
          <p>检查约束保留、子 Agent 记忆使用、RAG 召回、长任务目标一致性和来源追溯。</p>
        </div>
        <div :class="['quality-score', qualityReport?.status || 'empty']">
          <strong>{{ qualityReport?.overallScore ?? '—' }}{{ qualityReport?.overallScore !== null && qualityReport?.overallScore !== undefined ? '%' : '' }}</strong>
          <span>{{ qualityStatusText }}</span>
          <small v-if="qualityRunMeta">{{ qualityRunMeta }}</small>
        </div>
      </div>
      <div class="quality-check-grid">
        <article v-for="check in qualityChecks" :key="check.id" :class="['quality-check-card', check.status]">
          <div class="quality-check-top">
            <strong>{{ check.label }}</strong>
            <div class="quality-check-actions">
              <span>{{ check.score === null || check.score === undefined ? '待采样' : `${check.score}%` }}</span>
              <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" :title="`刷新 ${check.label}`" @click="refreshQualityCheck(check)">
                {{ targetedQualityLoading === check.id ? '…' : '↻' }}
              </button>
            </div>
          </div>
          <p>{{ check.note }}</p>
          <div class="quality-check-stats">
            <span>检查 {{ check.checked || 0 }}</span>
            <span>通过 {{ check.passed || 0 }}</span>
            <span>缺口 {{ check.failed || 0 }}</span>
          </div>
          <details v-if="check.gaps?.length || check.evidence?.length" class="quality-check-detail">
            <summary>{{ check.gaps?.length ? `查看缺口 ${check.gaps.length}` : `查看证据 ${check.evidence.length}` }}</summary>
            <ul v-if="check.gaps?.length">
              <li v-for="(gap, index) in check.gaps.slice(0, 4)" :key="index">{{ gap.reason || gap.title || gap.item || JSON.stringify(gap) }}</li>
            </ul>
            <ul v-else>
              <li v-for="(item, index) in check.evidence.slice(0, 4)" :key="index">{{ item.title || item.item || item.file || item.source || JSON.stringify(item) }}</li>
            </ul>
          </details>
        </article>
      </div>
      <div v-if="qualityReport?.nextActions?.length" class="quality-next-actions">
        <strong>建议处理</strong>
        <span v-for="action in qualityReport.nextActions" :key="action">{{ action }}</span>
      </div>
    </section>

    <div class="workspace-grid">
      <aside class="scope-panel aura-card">
        <div class="panel-title-row">
          <div><span class="panel-kicker">MEMORY SCOPE</span><h3>记忆范围</h3></div>
          <span class="count-badge">{{ scopes.length }}</span>
        </div>
        <div class="scope-list">
          <button v-for="item in scopes" :key="`${item.scope}:${item.id}`" class="scope-item" :class="{ active: item.scope === selectedScope && item.id === selectedId }" @click="selectScope(item)">
            <span class="scope-mark" :class="[item.scope, item.health]">{{ item.scope === 'global' ? 'A' : item.scope === 'group' ? 'G' : 'P' }}</span>
            <span class="scope-copy"><strong>{{ item.label }}</strong><small>{{ item.scope === 'global' ? '全局 Agent 记忆' : item.scope === 'group' ? '群聊上下文' : '项目长期记忆' }}</small></span>
            <span v-if="item.alerts" class="alert-count">{{ item.alerts }}</span>
            <span v-else class="health-dot"></span>
          </button>
        </div>
      </aside>

      <main class="detail-panel aura-card">
        <template v-if="detail">
          <div class="detail-header">
            <div>
              <div class="scope-meta"><span :class="['status-pill', detail.summary.health]">{{ detail.summary.health === 'healthy' ? '健康' : detail.summary.health === 'warning' ? '需关注' : '严重' }}</span><span>{{ selectedScope === 'global' ? '全局 Agent 记忆' : selectedScope === 'group' ? '群聊记忆' : '项目记忆' }}</span></div>
              <h3>{{ selectedSummary?.label || selectedId }}</h3>
              <p>{{ selectedScope === 'global' ? `已加密保存 ${detail.memory.sessions?.length || 0} 个会话，${detail.memory.archives?.length || 0} 个压缩归档` : selectedScope === 'group' ? (detail.memory.goal || '尚未记录整体目标') : (detail.memory.architecture || '尚未记录架构描述') }}</p>
            </div>
            <div class="maintenance-actions">
              <button v-if="selectedScope === 'group' || selectedScope === 'global'" class="btn btn-sm" @click="openOperation('compact')">手动压缩</button>
              <button class="btn btn-sm btn-outline" @click="openOperation('rebuild')">从原始数据重建</button>
              <button v-if="selectedScope === 'global'" class="btn btn-sm btn-outline" @click="openOperation(detail.policy?.disabled ? 'enable' : 'disable')">{{ detail.policy?.disabled ? '启用记忆' : '禁用记忆' }}</button>
              <button v-if="selectedScope === 'global'" class="btn btn-sm btn-outline" @click="openOperation('block_pattern')">添加禁记规则</button>
              <button class="btn btn-sm btn-danger" :disabled="!detail.backupExists" @click="openOperation('rollback')">备份回滚</button>
            </div>
          </div>

          <div v-if="selectedScope === 'global' && detail.policy?.blockedPatterns?.length" class="memory-policy-strip">
            <span>禁记规则</span>
            <button v-for="pattern in detail.policy.blockedPatterns" :key="pattern" @click="removeBlockedPattern(pattern)">{{ pattern }} ×</button>
          </div>

          <div v-if="detail.alerts?.length" class="alerts-block">
            <div v-for="alert in detail.alerts" :key="alert.id" :class="['alert-row', alert.severity]">
              <span class="alert-signal"></span><strong>{{ alert.code }}</strong><span>{{ alert.message }}</span>
            </div>
          </div>

          <div class="context-meter">
            <div class="meter-copy"><span>Token 上下文占用</span><strong>{{ detail.summary.tokenPressure || 0 }}%</strong></div>
            <div class="meter-track"><span :style="{ width: `${Math.min(100, detail.summary.tokenPressure || 0)}%` }"></span></div>
            <div class="meter-notes"><span>压缩前 {{ formatNumber(detail.summary.beforeTokens) }}</span><span>当前 {{ formatNumber(detail.summary.afterTokens) }}</span><span>{{ detail.memory.compaction?.modelMode || '结构化项目记忆' }}</span></div>
          </div>

          <nav class="view-tabs">
            <button :class="{ active: activeView === 'memory' }" @click="setView('memory')">当前记忆 <span>{{ memoryStats.total }}</span></button>
            <button :class="{ active: activeView === 'context' }" @click="setView('context')">压缩边界</button>
            <button :class="{ active: activeView === 'audit' }" @click="setView('audit')">审计记录</button>
            <button :class="{ active: activeView === 'metrics' }" @click="setView('metrics')">长期验收</button>
          </nav>

          <section v-if="activeView === 'memory'" class="memory-view">
            <div class="memory-toolbar">
              <div class="type-filters">
                <button :class="{ active: activeType === 'all' }" @click="activeType = 'all'">全部</button>
                <button v-for="group in itemGroups" :key="group.type" :class="{ active: activeType === group.type }" @click="activeType = group.type">{{ typeLabels[group.type] || group.type }} <span>{{ group.items?.length || 0 }}</span></button>
              </div>
              <input v-model="query" class="memory-search" placeholder="搜索约束、事实、决策或结论" />
            </div>
            <div class="memory-stats-line"><span>固定 {{ memoryStats.pinned }}</span><span>已纠正 {{ memoryStats.edited }}</span><span>已废弃 {{ memoryStats.deprecated }}</span></div>
            <div v-if="visibleGroups.length" class="memory-groups">
              <section v-for="group in visibleGroups" :key="group.type" class="memory-group">
                <div class="group-heading"><h4>{{ typeLabels[group.type] || group.type }}</h4><span>显示 {{ group.items.length }} / {{ group.totalMatched }}</span></div>
                <article v-for="item in group.items" :key="item.itemId" class="memory-item" :class="{ pinned: item.pinned, deprecated: item.deprecated, edited: item.text !== item.originalText }">
                  <div class="item-state"><span v-if="item.pinned" class="state-tag pin">固定</span><span v-if="item.text !== item.originalText" class="state-tag edit">已纠正</span><span v-if="item.deprecated" class="state-tag off">已废弃</span><span v-if="item.archived" class="state-tag archive">归档</span></div>
                  <p>{{ compactDisplay(item.text || '无文本内容') }}</p>
                  <div v-if="item.text !== item.originalText" class="original-text">原始：{{ compactDisplay(item.originalText, 360) }}</div>
                  <div class="item-footer">
                    <span>{{ item.evidence?.messageId ? `消息 #${item.evidence.messageId}` : item.evidence?.taskId ? `任务 ${item.evidence.taskId}` : '结构化状态' }}</span>
                    <div class="item-actions">
                      <button v-if="item.type !== 'sessionArchives'" @click="controlItem(item, item.pinned ? 'unpin' : 'pin')">{{ item.pinned ? '取消固定' : '固定' }}</button>
                      <button v-if="item.type !== 'sessionArchives'" @click="openEdit(item, 'edit')">修改</button>
                      <button v-if="item.type !== 'sessionArchives' && !item.deprecated" @click="openEdit(item, 'delete')">删除</button>
                      <button v-else-if="item.type !== 'sessionArchives'" @click="controlItem(item, 'restore', { reason: '用户恢复原始记忆' })">恢复</button>
                      <button :disabled="!item.evidence?.messageId && !item.evidence?.taskId && !item.evidence?.sessionId && !item.evidence?.missionId" @click="openEvidence(item)">查看证据</button>
                    </div>
                  </div>
                </article>
              </section>
            </div>
            <div v-else class="empty-state">这个筛选下没有记忆条目。</div>
          </section>

          <section v-else-if="activeView === 'context'" class="context-view">
            <div class="boundary-grid">
              <article><span>压缩策略</span><strong>{{ selectedScope === 'global' ? 'CC-style session-memory + encrypted transcript' : detail.memory.messageCompression?.strategy || (selectedScope === 'project' ? 'lossless-project-archive-v2' : '尚未压缩') }}</strong></article>
              <article><span>摘要边界</span><strong>{{ selectedScope === 'global' ? `${detail.memory.compaction?.boundaries?.length || 0} 个边界` : detail.memory.compactBoundary?.summarizedThroughMessageId || '无' }}</strong></article>
              <article><span>已压缩消息</span><strong>{{ formatNumber(selectedScope === 'global' ? detail.memory.archives?.reduce((sum, item) => sum + Number(item.count || 0), 0) : detail.memory.compaction?.compactedMessageCount || detail.memory.compression?.compressedConclusions) }}</strong></article>
              <article><span>保留原文</span><strong>{{ selectedScope === 'global' ? 'AES-256-GCM 加密转录' : formatNumber(detail.memory.compaction?.preservedRecentMessages || detail.memory.conclusions?.length) }}</strong></article>
              <article><span>事实校验</span><strong>{{ detail.memory.integrity?.pass === false || detail.memory.compaction?.validation?.pass === false ? '失败' : '通过' }}</strong></article>
              <article><span>最近压缩</span><strong>{{ formatTime(detail.memory.compaction?.lastCompactedAt || detail.memory.compression?.lastCompactedAt) }}</strong></article>
            </div>
            <section v-if="selectedScope === 'group' && postCompactUsage" class="post-compact-panel">
              <div class="post-compact-head">
                <div><span class="panel-kicker">POST-COMPACT USAGE</span><h4>压缩重注入候选</h4></div>
                <code>{{ postCompactUsage.ledger?.file || '暂无账本文件' }}</code>
              </div>
              <div v-if="postCompactUsage.error" class="post-compact-error">{{ postCompactUsage.error }}</div>
              <template v-else>
                <div class="post-compact-cards">
                  <article v-for="card in postCompactCards" :key="card.label">
                    <span>{{ card.label }}</span>
                    <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                    <small>{{ card.note }}</small>
                  </article>
                </div>
                <div v-if="groupSessionMemory" :class="['discipline-panel', groupSessionMemory.markdownChecksumMatches ? 'ok' : groupSessionMemory.markdownExists ? 'warn' : 'fail']">
                  <div class="discipline-head">
                    <div>
                      <strong>Group Session Memory</strong>
                      <span>{{ groupSessionMemory.summaryFile || 'summary.md' }}</span>
                    </div>
                    <code>{{ groupSessionMemory.markdownChecksumMatches ? 'ok' : 'check' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in groupSessionMemoryCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="groupSessionMemory.markdownExcerpt" class="hook-ledger-list">
                    <article class="ok">
                      <span class="usage-state verified">summary</span>
                      <strong>{{ groupSessionMemory.summaryChecksum || groupSessionMemory.markdownChecksum || 'session memory' }}</strong>
                      <p>{{ compactDisplay(groupSessionMemory.markdownExcerpt, 360) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="groupToolContinuity" :class="['discipline-panel', groupToolContinuityState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Tool / Skill Continuity</strong>
                      <span>{{ groupToolContinuity.summaryFile || 'summary.md' }}</span>
                    </div>
                    <code>{{ groupToolContinuity.status || groupToolContinuityState }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in groupToolContinuityCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div class="hook-ledger-list">
                    <article :class="groupToolContinuity.shouldBypassAuthorization ? 'fail' : 'ok'">
                      <span class="usage-state verified">policy</span>
                      <strong>{{ groupToolContinuity.snapshotChecksum || groupToolContinuity.markdownChecksum || 'context only' }}</strong>
                      <p>只恢复上下文，不扩大授权；真实派发仍以当前 runtime tool gate 为准。</p>
                    </article>
                    <article v-for="row in groupToolContinuityRows" :key="row.key" :class="row.state">
                      <span :class="['usage-state', row.state]">{{ row.type }}</span>
                      <strong>{{ row.title }}</strong>
                      <p>{{ compactDisplay(row.detail, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferences" :class="['discipline-panel', compactFileReferences.missingCount ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>Compact File References</strong>
                      <span>{{ compactFileReferenceAccess?.ledger_file || 'group-memory-file-references' }}</span>
                    </div>
                    <code>{{ compactFileReferences.missingCount ? 'check' : 'ok' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceRows.length" class="hook-ledger-list">
                    <article v-for="ref in compactFileReferenceRows" :key="ref.reference_id" :class="ref.exists ? 'ok' : 'warn'">
                      <span :class="['usage-state', ref.exists ? 'verified' : 'ignored']">{{ ref.type }}</span>
                      <strong>{{ ref.reference_id }}</strong>
                      <p>{{ compactDisplay(ref.displayPath || ref.path, 220) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferenceReadPlan" :class="['discipline-panel', compactFileReferenceReadPlanState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Compact Read Plan</strong>
                      <span>{{ compactFileReferenceReadPlan.policy?.mode || 'read on demand' }}</span>
                    </div>
                    <code>{{ compactFileReferenceReadPlanState }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceReadPlanCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanRows.length" class="hook-ledger-list">
                    <article v-for="entry in compactFileReferenceReadPlanRows" :key="entry.read_plan_id" :class="entry.exists ? 'ok' : 'warn'">
                      <span :class="['usage-state', entry.action === 'skip_missing' ? 'ignored' : 'verified']">{{ entry.priority }}</span>
                      <strong>{{ entry.read_plan_id }}</strong>
                      <p>{{ compactDisplay(`${entry.action || 'read_if_needed'} · ${entry.type || ''} · ${entry.displayPath || entry.path || ''}`, 240) }}</p>
                      <code>{{ entry.readMode || 'read' }}</code>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferenceReadPlanFreshness" :class="['discipline-panel', compactFileReferenceReadPlanFreshnessState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Read Plan Freshness</strong>
                      <span>source checksum / mtime</span>
                    </div>
                    <code>{{ formatMetric(compactFileReferenceReadPlanFreshness.freshnessRate, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceReadPlanFreshnessCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanFreshnessRows.length" class="hook-ledger-list">
                    <article v-for="row in compactFileReferenceReadPlanFreshnessRows" :key="row.read_plan_id" :class="row.fresh ? 'ok' : row.unverifiable ? 'warn' : 'fail'">
                      <span :class="['usage-state', row.fresh ? 'verified' : row.unverifiable ? 'waiting' : 'fail']">{{ row.freshness_status || 'state' }}</span>
                      <strong>{{ row.read_plan_id || row.reference_id }}</strong>
                      <p>{{ compactDisplay(`${row.type || ''} · ${(row.changes || []).join(',') || 'fresh'} · ${row.path || ''}`, 240) }}</p>
                      <code>{{ row.current?.checksum || 'no-checksum' }}</code>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanFreshnessGaps.length" class="discipline-gap-list">
                    <article v-for="gap in compactFileReferenceReadPlanFreshnessGaps" :key="`${gap.read_plan_id}:${gap.reference_id}`">
                      <span class="usage-state waiting">{{ gap.type || 'gap' }}</span>
                      <strong>{{ gap.read_plan_id || gap.reference_id || 'source' }}</strong>
                      <p>{{ compactDisplay(gap.reason || (gap.changes || []).join(','), 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferenceReadPlanRevalidationGate || compactFileReferenceReadPlanRevalidationDiscipline" :class="['discipline-panel', compactFileReferenceReadPlanRevalidationState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Read Plan Revalidation</strong>
                      <span>{{ compactFileReferenceReadPlanRevalidationGate?.revalidation_gate_id || compactFileReferenceReadPlanRevalidationDiscipline?.gateId || 'revalidation gate' }}</span>
                    </div>
                    <code>{{ formatMetric(compactFileReferenceReadPlanRevalidationDiscipline?.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceReadPlanRevalidationCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanRevalidationRows.length" class="hook-ledger-list">
                    <article v-for="row in compactFileReferenceReadPlanRevalidationRows" :key="row.read_plan_id" :class="row.satisfied ? 'ok' : row.ignored_with_reason ? 'warn' : 'fail'">
                      <span :class="['usage-state', row.session_mismatch ? 'fail' : row.current_source_verified ? 'verified' : row.ignored_with_reason ? 'ignored' : 'fail']">{{ row.session_mismatch ? 'session' : row.current_source_verified ? 'verified' : row.ignored_with_reason ? 'ignored' : 're-read' }}</span>
                      <strong>{{ row.read_plan_id || row.reference_id }}</strong>
                      <p>{{ compactDisplay(`${row.revalidation_action || row.action || ''} · ${(row.changes || []).join(',') || row.freshness_status || ''} · ${row.path || row.displayPath || ''} · expected ${row.expected_task_agent_session_id || row.expected_native_session_id || 'session'} / receipt ${row.receipt_task_agent_session_id || row.receipt_native_session_id || 'missing'}`, 260) }}</p>
                      <code>{{ row.session_matched === false ? 'session mismatch' : row.mention_count ?? row.freshness_status ?? 0 }}</code>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanRevalidationGaps.length" class="discipline-gap-list">
                    <article v-for="gap in compactFileReferenceReadPlanRevalidationGaps" :key="`${gap.read_plan_id}:${gap.reference_id}`">
                      <span class="usage-state waiting">{{ gap.type || 'stale' }}</span>
                      <strong>{{ gap.read_plan_id || gap.reference_id || 'read plan' }}</strong>
                      <p>{{ compactDisplay(`${gap.reason || gap.path}${gap.session_mismatch ? ` · expected ${gap.expected_task_agent_session_id || gap.expected_native_session_id || 'session'} / receipt ${gap.receipt_task_agent_session_id || gap.receipt_native_session_id || 'missing'}` : ''}`, 220) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferenceReadPlanDiscipline || compactFileReferenceReadPlanAccess" :class="['discipline-panel', compactFileReferenceReadPlanReceiptState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Read Plan Receipt</strong>
                      <span>{{ compactFileReferenceReadPlanAccess?.ledger_file || compactFileReferenceReadPlanDiscipline?.ledgerFile || 'read plan access' }}</span>
                    </div>
                    <code>{{ formatMetric(compactFileReferenceReadPlanDiscipline?.score ?? compactFileReferenceReadPlanAccess?.read_plan_id_mention_rate, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceReadPlanReceiptCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanReceiptRows.length" class="hook-ledger-list">
                    <article v-for="row in compactFileReferenceReadPlanReceiptRows" :key="row.read_plan_id" :class="row.read_plan_id_mentioned ? 'ok' : row.mentioned ? 'warn' : 'fail'">
                      <span :class="['usage-state', row.read_plan_id_mentioned ? 'used' : row.mentioned ? 'waiting' : 'fail']">{{ row.read_plan_id_mentioned ? 'id' : row.mentioned ? 'ref' : 'miss' }}</span>
                      <strong>{{ row.read_plan_id || row.reference_id }}</strong>
                      <p>{{ compactDisplay(`${row.action || ''} · ${row.type || ''} · ${row.path || ''}`, 240) }}</p>
                      <code>{{ row.mention_count || 0 }}</code>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceReadPlanReceiptGaps.length" class="discipline-gap-list">
                    <article v-for="gap in compactFileReferenceReadPlanReceiptGaps" :key="`${gap.read_plan_id}:${gap.reference_id}`">
                      <span class="usage-state waiting">{{ gap.type || 'gap' }}</span>
                      <strong>{{ gap.read_plan_id || gap.reference_id || 'read plan' }}</strong>
                      <p>{{ compactDisplay(gap.reason || gap.path, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactFileReferenceDiscipline" :class="['discipline-panel', compactFileReferenceDisciplineState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Compact Reference Usage</strong>
                      <span>{{ compactFileReferenceDiscipline.ledgerFile || 'usage discipline' }}</span>
                    </div>
                    <code>{{ formatMetric(compactFileReferenceDiscipline.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactFileReferenceDisciplineCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceDisciplineRows.length" class="hook-ledger-list">
                    <article v-for="row in compactFileReferenceDisciplineRows" :key="row.reference_id" :class="row.mentioned ? 'ok' : 'warn'">
                      <span :class="['usage-state', row.mentioned ? 'used' : 'waiting']">{{ row.mentioned ? 'declared' : 'pending' }}</span>
                      <strong>{{ row.reference_id || row.type }}</strong>
                      <p>{{ compactDisplay(row.path || row.latest?.source || row.type, 220) }}</p>
                      <code>{{ row.mention_count || 0 }}</code>
                    </article>
                  </div>
                  <div v-if="compactFileReferenceDisciplineGaps.length" class="discipline-gap-list">
                    <article v-for="gap in compactFileReferenceDisciplineGaps" :key="`${gap.reference_id}:${gap.path}`">
                      <span class="usage-state waiting">{{ gap.type || 'gap' }}</span>
                      <strong>{{ gap.reference_id || 'reference' }}</strong>
                      <p>{{ compactDisplay(gap.reason || gap.path, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactBoundaryTimeline" :class="['timeline-panel', compactBoundaryTimeline.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>压缩边界时间线</strong>
                      <span>{{ compactBoundaryTimeline.boundary?.summaryChecksum || compactBoundaryTimeline.boundary?.summarizedThroughMessageId || 'no boundary' }}</span>
                    </div>
                    <code>{{ formatMetric(compactBoundaryTimeline.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactBoundaryTimelineCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactBoundaryTimeline.components?.length" class="timeline-component-list">
                    <article v-for="component in compactBoundaryTimeline.components" :key="component.key" :class="component.status">
                      <span>{{ component.label }}</span>
                      <strong>{{ formatMetric(component.score, '%') }}</strong>
                    </article>
                  </div>
                  <div v-if="compactBoundaryTimeline.events?.length" class="timeline-event-list">
                    <article v-for="event in compactBoundaryTimeline.events.slice(0, 8)" :key="`${event.kind}:${event.at}`" :class="event.status">
                      <span>{{ event.kind }}</span>
                      <strong>{{ event.title }}</strong>
                      <p>{{ compactDisplay(event.detail, 170) }}</p>
                      <code>{{ formatTime(event.at) }}</code>
                    </article>
                  </div>
                  <div v-if="compactBoundaryTimeline.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in compactBoundaryTimeline.gaps.slice(0, 5)" :key="`${gap.component || 'timeline'}:${gap.reason}`">
                      <span :class="['usage-state', compactBoundaryTimeline.status]">{{ gap.component || 'gap' }}</span>
                      <strong>{{ gap.agent || gap.component || 'timeline' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="compactionHooks" :class="['discipline-panel', compactionHooks.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>压缩 Hook Ledger</strong>
                      <span>{{ compactionHooks.hookRunIds?.[compactionHooks.hookRunIds.length - 1] || compactionHooks.file || 'no hook ledger' }}</span>
                    </div>
                    <code>{{ formatMetric(compactionHooks.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactionHookCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="compactionHooks.recentEntries?.length" class="hook-ledger-list">
                    <article v-for="entry in compactionHooks.recentEntries.slice(0, 8)" :key="entry.entryId" :class="entry.status">
                      <span :class="['usage-state', entry.status]">{{ entry.phase }}</span>
                      <strong>{{ entry.summary?.noHooksRegistered ? 'no hooks registered' : (entry.summary?.keys || []).join(', ') || entry.entryId }}</strong>
                      <p>{{ entry.error || entry.summary?.text || `${entry.durationMs || 0}ms` }}</p>
                      <code>{{ formatTime(entry.at) }}</code>
                    </article>
                  </div>
                  <div v-if="compactionHooks.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in compactionHooks.gaps.slice(0, 5)" :key="`${gap.component}:${gap.reason}`">
                      <span :class="['usage-state', compactionHooks.status]">{{ gap.component || 'hook' }}</span>
                      <strong>{{ gap.entryId || gap.component || 'hook' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="boundaryReplay" :class="['discipline-panel', boundaryReplay.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>压缩边界 Replay Gate</strong>
                      <span>{{ boundaryReplay.targetProject || 'child Agent' }} · {{ boundaryReplay.renderedHash || 'no replay hash' }}</span>
                    </div>
                    <code>{{ formatMetric(boundaryReplay.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in boundaryReplayCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="boundaryReplay.needles?.length" class="replay-needle-list">
                    <article v-for="needle in boundaryReplay.needles.slice(0, 10)" :key="`${needle.type}:${needle.label}:${needle.value}`" :class="{ ok: needle.matched, fail: !needle.matched }">
                      <span :class="['usage-state', needle.matched ? 'verified' : 'fail']">{{ needle.type }}</span>
                      <strong>{{ needle.label }}</strong>
                      <p>{{ compactDisplay(needle.value, 180) }}</p>
                    </article>
                  </div>
                  <div v-if="boundaryReplay.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in boundaryReplay.gaps.slice(0, 5)" :key="`${gap.type}:${gap.label}`">
                      <span :class="['usage-state', boundaryReplay.status]">{{ gap.type || 'replay' }}</span>
                      <strong>{{ gap.label || 'replay' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                  <div v-if="boundaryReplayRepairActions.length" class="replay-repair-list">
                    <div class="recall-diagnostic-head">
                      <strong>Replay Repair Plan</strong>
                      <span>{{ boundaryReplay.repairPlan?.action || 'refresh_and_replay_child_agent_memory' }}</span>
                    </div>
                    <article v-for="action in boundaryReplayRepairActions.slice(0, 6)" :key="action.action_id">
                      <span :class="['usage-state', action.priority === 'critical' ? 'fail' : action.priority === 'high' ? 'warn' : 'verified']">{{ action.priority }}</span>
                      <strong>{{ action.title || action.component }}</strong>
                      <p>{{ compactDisplay(action.instruction || action.source_reason, 220) }}</p>
                    </article>
                  </div>
                  <div v-if="boundaryReplayRepairLedger?.recentAttempts?.length" class="replay-attempt-list">
                    <div class="recall-diagnostic-head">
                      <strong>Replay Attempt History</strong>
                      <span>{{ boundaryReplayRepairLedger.file || 'sidecar ledger' }}</span>
                    </div>
                    <article v-for="attempt in boundaryReplayRepairLedger.recentAttempts.slice(0, 6)" :key="attempt.attempt_id" :class="attempt.status">
                      <span :class="['usage-state', attempt.status]">{{ attempt.status }}</span>
                      <strong>{{ formatMetric(attempt.score, '%') }} · {{ attempt.target_project || 'target' }}</strong>
                      <p>{{ attempt.rendered_hash || attempt.attempt_id }} · actions {{ attempt.required_action_count || 0 }} · seen {{ attempt.seen_count || 1 }}</p>
                    </article>
                  </div>
                  <div v-if="boundaryReplayRepairWorkRows.length" class="replay-work-list">
                    <div class="recall-diagnostic-head">
                      <strong>Replay Repair Work Items</strong>
                      <span>open {{ boundaryReplayRepairWorkItems?.openItemCount || 0 }} · {{ boundaryReplayRepairWorkItems?.file || 'sidecar work ledger' }}</span>
                    </div>
                    <article v-for="item in boundaryReplayRepairWorkRows" :key="item.id || item.work_item_id" :class="item.status">
                      <span :class="['usage-state', item.session_mismatch ? 'fail' : item.status]">{{ item.session_mismatch ? 'session' : item.status }}</span>
                      <strong>{{ item.subject || item.component || item.repair_target }}</strong>
                      <p>{{ compactDisplay(`${item.read_plan_id ? `read_plan=${item.read_plan_id} · ` : ''}${item.revalidation_gate_id ? `gate=${item.revalidation_gate_id} · ` : ''}${item.expected_task_agent_session_id ? `expected=${item.expected_task_agent_session_id} · receipt=${item.receipt_task_agent_session_id || 'missing'} · ` : ''}${item.instruction || item.expected || item.replay_rendered_hash}`, 260) }}</p>
                      <div class="replay-work-actions">
                        <button v-if="item.status === 'pending'" @click="updateReplayRepairWorkItem(item, 'claim')">认领</button>
                        <button v-if="['pending', 'in_progress', 'blocked'].includes(item.status)" @click="updateReplayRepairWorkItem(item, 'dispatch')">派发</button>
                        <button v-if="['pending', 'in_progress', 'blocked'].includes(item.status)" @click="updateReplayRepairWorkItem(item, 'complete')">完成</button>
                        <button v-if="['pending', 'in_progress'].includes(item.status)" @click="updateReplayRepairWorkItem(item, 'block')">阻塞</button>
                        <button v-if="['completed', 'cancelled'].includes(item.status)" @click="updateReplayRepairWorkItem(item, 'reopen')">重开</button>
                      </div>
                    </article>
                  </div>
                  <div v-if="replayRepairDispatchRows.length" class="replay-work-list">
                    <div class="recall-diagnostic-head">
                      <strong>Main Agent Dispatch Candidates</strong>
                      <span>ready {{ replayRepairDispatchCandidates?.readyCount || 0 }} · shouldCreateRealTask=false</span>
                    </div>
                    <article v-for="candidate in replayRepairDispatchRows" :key="candidate.candidate_id || candidate.work_item_id" :class="candidate.status">
                      <span :class="['usage-state', candidate.session_mismatch ? 'fail' : candidate.dispatchMarked ? 'verified' : candidate.status]">{{ candidate.session_mismatch ? 'session' : candidate.priority || candidate.status }}</span>
                      <strong>{{ candidate.dispatch_target || candidate.targetProject || candidate.repair_target || candidate.component }}</strong>
                      <p>{{ compactDisplay(`${candidate.read_plan_id ? `read_plan=${candidate.read_plan_id} · ` : ''}${candidate.revalidation_gate_id ? `gate=${candidate.revalidation_gate_id} · ` : ''}${candidate.instruction || candidate.expected || candidate.prompt_patch}`, 260) }}</p>
                      <small>{{ candidate.recommendedAction || 'main_agent_review' }} · {{ candidate.work_item_id }}</small>
                    </article>
                  </div>
                </div>
                <div v-if="historicalBoundaryReplay" :class="['discipline-panel', historicalBoundaryReplay.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>历史压缩边界 Replay</strong>
                      <span>{{ historicalBoundaryReplay.boundaryCount || 0 }} boundaries · {{ historicalBoundaryReplay.targetProject || 'child Agent' }}</span>
                    </div>
                    <code>{{ formatMetric(historicalBoundaryReplay.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in historicalBoundaryReplayCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="historicalBoundaryReplay.boundaries?.length" class="historical-boundary-list">
                    <article v-for="boundary in historicalBoundaryReplay.boundaries.slice(0, 8)" :key="`${boundary.boundaryId}:${boundary.renderedHash}`" :class="boundary.replayStatus">
                      <span :class="['usage-state', boundary.replayStatus]">{{ boundary.replayStatus }}</span>
                      <strong>{{ boundary.summaryChecksum || boundary.summarizedThroughMessageId || boundary.boundaryId }}</strong>
                      <p>score {{ formatMetric(boundary.score, '%') }} · {{ boundary.passed || 0 }}/{{ boundary.checked || 0 }} · gaps {{ boundary.gapCount || 0 }}</p>
                    </article>
                  </div>
                  <div v-if="historicalBoundaryReplay.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in historicalBoundaryReplay.gaps.slice(0, 5)" :key="`${gap.boundaryId}:${gap.type}:${gap.label}`">
                      <span :class="['usage-state', historicalBoundaryReplay.status]">{{ gap.type || 'history' }}</span>
                      <strong>{{ gap.summaryChecksum || gap.boundaryId || 'boundary' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="agentTypeReplay" :class="['discipline-panel', agentTypeReplay.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>子 Agent 类型 Replay</strong>
                      <span>{{ agentTypeReplay.agentTypeCount || 0 }} types · {{ agentTypeReplay.targetCount || 0 }} targets</span>
                    </div>
                    <code>{{ formatMetric(agentTypeReplay.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in agentTypeReplayCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="agentTypeReplay.agentTypes?.length" class="agent-type-replay-list">
                    <article v-for="type in agentTypeReplay.agentTypes.slice(0, 8)" :key="type.agentType" :class="type.status">
                      <span :class="['usage-state', type.status]">{{ type.status }}</span>
                      <strong>{{ type.agentType }}</strong>
                      <p>score {{ formatMetric(type.score, '%') }} · targets {{ type.targetCount || 0 }} · gaps {{ type.gaps?.length || 0 }}</p>
                    </article>
                  </div>
                  <div v-if="agentTypeReplay.targets?.length" class="agent-type-target-list">
                    <article v-for="target in agentTypeReplay.targets.slice(0, 8)" :key="`${target.agentType}:${target.targetProject}`" :class="target.status">
                      <span :class="['usage-state', target.status]">{{ target.agentType }}</span>
                      <strong>{{ target.targetProject }}</strong>
                      <p>{{ target.source || 'target' }} · profile {{ formatMetric(target.score, '%') }} · replay {{ formatMetric(target.replayScore, '%') }}</p>
                    </article>
                  </div>
                  <div v-if="agentTypeReplay.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in agentTypeReplay.gaps.slice(0, 5)" :key="`${gap.agentType}:${gap.targetProject}:${gap.component}`">
                      <span :class="['usage-state', agentTypeReplay.status]">{{ gap.agentType || 'type' }}</span>
                      <strong>{{ gap.targetProject || gap.label || 'target' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="postCompactDispatch" :class="['discipline-panel', postCompactDispatch.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>首派发 marker</strong>
                      <span>{{ postCompactDispatch.latestBoundaryId || 'no boundary' }}</span>
                    </div>
                    <code>{{ formatMetric(postCompactDispatch.latestBoundaryTargetCoverageRate ?? postCompactDispatch.firstDispatchRate, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in postCompactDispatchCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="postCompactDispatch.boundaries?.length" class="discipline-buckets">
                    <article v-for="boundary in postCompactDispatch.boundaries.slice(0, 7)" :key="boundary.boundary_id" :class="{ weak: boundary.firstTargetCoverageRate !== null && boundary.firstTargetCoverageRate < 100 }">
                      <span>{{ compactDisplay(boundary.summary_checksum || boundary.boundary_id, 18) }}</span>
                      <strong>{{ formatMetric(boundary.firstTargetCoverageRate, '%') }}</strong>
                      <small>{{ boundary.firstTargetCount || 0 }}/{{ boundary.targetCount || 0 }} · {{ boundary.dispatchCount || 0 }} dispatch</small>
                    </article>
                  </div>
                  <div v-if="postCompactDispatch.gaps?.length" class="discipline-gap-list">
                    <article v-for="gap in postCompactDispatch.gaps.slice(0, 5)" :key="`${gap.boundary_id || 'boundary'}:${gap.marker_id || gap.reason}`">
                      <span :class="['usage-state', postCompactDispatch.status]">{{ postCompactDispatch.status }}</span>
                      <strong>{{ gap.boundary_id || gap.marker_id || 'dispatch' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="childAgentReliability" :class="['discipline-panel', childAgentReliability.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>子 Agent 记忆可靠性</strong>
                      <span>{{ childAgentReliability.agentCount || 0 }} agents · {{ childAgentReliability.scoredAgentCount || 0 }} scored</span>
                    </div>
                    <code>{{ formatMetric(childAgentReliability.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in childAgentReliabilityCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="childAgentReliability.agents?.length" class="agent-reliability-list">
                    <article v-for="agent in childAgentReliability.agents.slice(0, 8)" :key="agent.agent" :class="agent.status">
                      <div>
                        <strong>{{ agent.agent }}</strong>
                        <span>{{ agent.status }}</span>
                      </div>
                      <code>{{ formatMetric(agent.score, '%') }}</code>
                      <p>receipt {{ formatMetric(agent.receiptDeclarationRate, '%') }} · candidate {{ formatMetric(agent.candidateStrictRate, '%') }} · first {{ agent.firstDispatches || 0 }}</p>
                    </article>
                  </div>
                  <div v-if="weakChildAgents.length" class="discipline-gap-list">
                    <article v-for="agent in weakChildAgents" :key="`${agent.agent}:gap`">
                      <span :class="['usage-state', agent.status]">{{ agent.status }}</span>
                      <strong>{{ agent.agent }}</strong>
                      <p>{{ compactDisplay(agent.gaps?.[0]?.reason || '记忆可靠性低于阈值', 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="postCompactDiscipline" :class="['discipline-panel', postCompactDiscipline.status]">
                  <div class="discipline-head">
                    <div>
                      <strong>候选纪律趋势</strong>
                      <span>{{ postCompactDiscipline.checked || 0 }} rows · {{ postCompactDiscipline.taskCount || 0 }} tasks</span>
                    </div>
                    <code>{{ formatMetric(postCompactDiscipline.effectiveStrictClassificationRate ?? postCompactDiscipline.strictClassificationRate, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in postCompactDisciplineCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="postCompactDiscipline.buckets?.length" class="discipline-buckets">
                    <article v-for="bucket in postCompactDiscipline.buckets.slice(-7)" :key="bucket.key" :class="{ weak: bucket.strictClassificationRate !== null && bucket.strictClassificationRate < postCompactDiscipline.threshold }">
                      <span>{{ bucket.key }}</span>
                      <strong>{{ formatMetric(bucket.strictClassificationRate, '%') }}</strong>
                      <small>{{ bucket.strictClassified || 0 }}/{{ bucket.checked || 0 }} · stale {{ bucket.stalePromoted || 0 }}</small>
                    </article>
                  </div>
                  <div v-if="postCompactDisciplineGaps.length" class="discipline-gap-list">
                    <article v-for="row in postCompactDisciplineGaps" :key="`${row.taskId}:${row.gate_id}:${row.candidate_id}:${row.usage_state}`">
                      <span :class="['usage-state', row.usage_state]">{{ row.usage_state }}</span>
                      <strong>{{ row.candidate_id || row.gate_id || 'candidate' }}</strong>
                      <p>{{ compactDisplay(row.reason || row.value, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="postCompactBuckets.length" class="post-compact-buckets">
                  <section v-for="bucket in postCompactBuckets" :key="bucket.key" class="post-compact-bucket">
                    <div class="bucket-heading"><h5>{{ bucket.label }}</h5><span>{{ bucket.rows.length }}</span></div>
                    <article v-for="row in bucket.rows.slice(0, 4)" :key="`${bucket.key}:${row.candidate_id}:${row.value}`" class="candidate-row" :class="bucket.key">
                      <div class="candidate-top">
                        <strong>{{ row.candidate_id || row.kind || 'candidate' }}</strong>
                        <span>{{ recommendationText(row.recommendation) }}</span>
                      </div>
                      <p>{{ compactDisplay(row.value || '无候选文本', 190) }}</p>
                      <div class="usage-counts">
                        <span>used {{ row.used_count || 0 }}</span>
                        <span>ignored {{ row.ignored_count || 0 }}</span>
                        <span>verified {{ row.verified_count || 0 }}</span>
                        <span>mentioned {{ row.mentioned_count || 0 }}</span>
                      </div>
                    </article>
                  </section>
                </div>
                <div v-if="postCompactRecallRows.length" class="recall-diagnostic-list">
                  <div class="recall-diagnostic-head">
                    <strong>类型化记忆召回诊断</strong>
                    <span>hints {{ postCompactUsage.typedMemory?.recallScoring?.hint_count || 0 }} · matched {{ postCompactUsage.typedMemory?.recallScoring?.matched_count || 0 }}</span>
                  </div>
                  <article v-for="row in postCompactRecallRows.slice(0, 6)" :key="`${row.kind}:${row.relPath}`" :class="['recall-diagnostic-row', row.kind]">
                    <span>{{ row.kind === 'boosted' ? '加权' : '降权' }}</span>
                    <strong>{{ row.relPath }}</strong>
                    <code>{{ formatSigned(row.adjustment) }}</code>
                  </article>
                </div>
                <div v-if="postCompactUsage.ledger?.recentEntries?.length" class="recent-usage-list">
                  <div class="recall-diagnostic-head"><strong>最近子 Agent 结果说明</strong><span>{{ formatTime(postCompactUsage.ledger.updatedAt) }}</span></div>
                  <article v-for="entry in postCompactUsage.ledger.recentEntries.slice(0, 5)" :key="entry.entry_id" class="recent-usage-row">
                    <span :class="['usage-state', entry.usage_state]">{{ entry.usage_state }}</span>
                    <strong>{{ entry.agent || entry.target_project || 'agent' }}</strong>
                    <p>{{ compactDisplay(entry.value, 180) }}</p>
                  </article>
                </div>
              </template>
            </section>
            <div class="summary-preview">
              <div class="preview-heading"><h4>Agent 当前接收到的核心摘要</h4><span>{{ detail.memory.compaction?.summaryChecksum || '项目结构化记忆' }}</span></div>
              <pre>{{ JSON.stringify(selectedScope === 'global' ? { sessions: detail.memory.sessions?.map(item => ({ sessionId: item.sessionId, summary: item.summary, boundary: item.boundary })), recentMissions: detail.memory.missions?.slice(-5), unresolved: detail.memory.unresolved?.slice(-8) } : detail.memory.conversationSummary || { architecture: detail.memory.architecture, techStack: detail.memory.techStack, recentConclusions: detail.memory.conclusions?.slice(-3), decisions: detail.memory.decisions?.slice(-8) }, null, 2) }}</pre>
            </div>
          </section>

          <section v-else-if="activeView === 'audit'" class="audit-view">
            <article v-for="entry in audit" :key="entry.id" class="audit-item">
              <span class="audit-time">{{ formatTime(entry.at) }}</span>
              <div><strong>{{ entry.action || entry.type }}</strong><p>{{ entry.reason || '系统自动记录' }}</p></div>
              <code>{{ entry.itemType || entry.metricType || entry.scope }}{{ entry.itemId ? ` / ${entry.itemId}` : '' }}</code>
            </article>
            <div v-if="!audit.length" class="empty-state">还没有人工纠正或维护操作。</div>
          </section>

          <section v-else class="metrics-view">
            <div class="metrics-grid">
              <article v-for="metric in metricCards" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ formatRate(metric.value) }}</strong><p>{{ metric.note }}</p></article>
            </div>
            <div class="feedback-panel">
              <div><h4>真实运行验收反馈</h4><p>当你确认一次召回、遗忘或派发结果时，在这里记一票，长期指标会持续累积。</p></div>
              <div class="feedback-actions"><button class="btn btn-sm btn-primary" :disabled="loading" @click="runAcceptance">运行真实项目验收</button><button class="btn btn-sm" @click="submitFeedback('recall_hit')">召回正确</button><button class="btn btn-sm" @click="submitFeedback('recall_miss')">召回失败</button><button class="btn btn-sm" @click="submitFeedback('remembered')">约束记住了</button><button class="btn btn-sm" @click="submitFeedback('forgotten')">发现遗忘</button><button class="btn btn-sm btn-danger" @click="submitFeedback('misdispatch')">错误派发</button></div>
            </div>
            <div v-if="overview.metrics?.latestAcceptance" class="acceptance-note">最近真实验收：{{ formatTime(overview.metrics.latestAcceptance.at) }} · {{ overview.metrics.latestAcceptance.dataset.groupMessages }} 条消息 · {{ overview.metrics.latestAcceptance.dataset.recallChecks }} 个证据锚点 · {{ overview.metrics.latestAcceptance.dataset.dispatches }} 次历史派发</div>
            <div class="counter-table">
              <div><span>召回采样</span><strong>{{ overview.metrics?.counters?.recallAttempts || 0 }}</strong></div><div><span>记忆检查</span><strong>{{ overview.metrics?.counters?.memoryChecks || 0 }}</strong></div><div><span>派发采样</span><strong>{{ overview.metrics?.counters?.dispatches || 0 }}</strong></div><div><span>恢复尝试</span><strong>{{ overview.metrics?.counters?.recoveryAttempts || 0 }}</strong></div>
            </div>
          </section>
        </template>
        <div v-else class="empty-state large">{{ loading ? '正在读取记忆状态…' : '选择一个群聊或项目开始检查。' }}</div>
      </main>
    </div>

    <div v-if="editState" class="mc-modal-overlay" @click.self="editState = null">
      <div class="mc-modal">
        <div><span class="panel-kicker">MEMORY CORRECTION</span><h3>{{ editState.mode === 'edit' ? '修改这条记忆' : '删除这条记忆' }}</h3></div>
        <label v-if="editState.mode === 'edit'">修正后的内容<textarea v-model="editState.text" rows="5"></textarea></label>
        <label>操作原因<textarea v-model="editState.reason" rows="3" placeholder="说明为什么需要纠正，便于以后审计"></textarea></label>
        <div class="modal-actions"><button class="btn" @click="editState = null">取消</button><button class="btn" :class="editState.mode === 'delete' ? 'btn-danger' : 'btn-primary'" :disabled="!editState.reason.trim() || (editState.mode === 'edit' && !editState.text.trim())" @click="submitEdit">确认</button></div>
      </div>
    </div>

    <div v-if="operationState" class="mc-modal-overlay" @click.self="operationState = null">
      <div class="mc-modal">
        <div><span class="panel-kicker">MEMORY MAINTENANCE</span><h3>{{ operationState.operation === 'compact' ? '手动压缩' : operationState.operation === 'rebuild' ? '从原始数据重建' : operationState.operation === 'disable' ? '禁用全局记忆' : operationState.operation === 'enable' ? '启用全局记忆' : operationState.operation === 'block_pattern' ? '添加禁记规则' : '从备份回滚' }}</h3></div>
        <p class="modal-note">{{ operationState.operation === 'compact' ? '按照当前压缩边界收敛上下文，不删除加密原始转录。' : operationState.operation === 'rebuild' ? '忽略旧摘要边界，从加密原始转录重新生成全局记忆。' : operationState.operation === 'disable' ? '停止新的长期记忆写入与提取，已有记忆仍可查看和删除。' : operationState.operation === 'enable' ? '恢复长期记忆写入、压缩和按需召回。' : operationState.operation === 'block_pattern' ? '匹配此文本或正则表达式的内容不会进入长期记忆。' : '使用最近有效备份替换主记忆，并保留回滚前快照。' }}</p>
        <label v-if="operationState.operation === 'block_pattern'">文本或正则规则<input v-model="operationState.pattern" placeholder="例如：客户手机号|内部代号" /></label>
        <label>操作原因<textarea v-model="operationState.reason" rows="3" placeholder="建议记录本次维护的原因"></textarea></label>
        <div class="modal-actions"><button class="btn" @click="operationState = null">取消</button><button class="btn" :class="['rollback','disable'].includes(operationState.operation) ? 'btn-danger' : 'btn-primary'" :disabled="!operationState.reason.trim() || (operationState.operation === 'block_pattern' && !operationState.pattern.trim())" @click="runOperation">执行</button></div>
      </div>
    </div>

    <div v-if="evidenceOpen" class="mc-modal-overlay" @click.self="evidenceOpen = false">
      <div class="mc-modal evidence-modal">
        <div><span class="panel-kicker">SOURCE EVIDENCE</span><h3>原始消息证据</h3></div>
        <article v-for="row in evidence" :key="`${row.groupId}:${row.messageId}`" class="evidence-row"><div><strong>#{{ row.messageId }}</strong><span>{{ row.role }} · {{ row.agent }} · {{ formatTime(row.timestamp) }}</span></div><pre>{{ row.content }}</pre></article>
        <div v-if="!evidence.length" class="empty-state">没有找到对应的原始消息。</div>
        <div class="modal-actions"><button class="btn btn-primary" @click="evidenceOpen = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-center{height:100%;overflow:auto;padding:18px 20px 36px;color:var(--text-primary)}
.aura-card{background:var(--bg-card);border:1px solid var(--border-color);box-shadow:var(--shadow-lg);backdrop-filter:blur(24px) saturate(150%)}
.mc-header{border-radius:16px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:24px}.eyebrow,.panel-kicker{font-family:var(--font-tech);font-size:10px;letter-spacing:1.8px;color:var(--accent-blue);font-weight:700}.mc-header h2{font-size:24px;margin:5px 0 4px}.mc-header p,.detail-header p,.modal-note{color:var(--text-muted);font-size:13px;line-height:1.55}.header-actions{display:flex;align-items:center;gap:12px}.sync-time{font-size:11px;color:var(--text-muted)}
.summary-strip{display:grid;grid-template-columns:repeat(6,minmax(145px,1fr));gap:10px;margin:12px 0}.summary-card{min-height:105px;padding:16px;border-radius:13px;background:rgba(255,255,255,.55);border:1px solid var(--border-color);display:flex;flex-direction:column}.summary-label{font-size:11px;color:var(--text-muted);font-weight:700}.summary-card strong{font-family:var(--font-tech);font-size:24px;margin:9px 0 5px}.summary-card small{font-size:10px;color:var(--text-muted);line-height:1.4}.summary-card.warning strong,.summary-card.risk strong{color:var(--accent-yellow)}
.global-alerts{display:flex;flex-direction:column;gap:6px;margin:-2px 0 12px}.global-alert{display:grid;grid-template-columns:7px auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);font-size:10px}.global-alert>span{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.global-alert strong{font-family:monospace}.global-alert p{color:var(--text-secondary)}.global-alert small{color:var(--text-muted)}.global-alert.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.global-alert.critical>span{background:var(--accent-red)}
.quality-panel{border-radius:16px;padding:18px;margin:12px 0}.quality-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.quality-panel-head h3{font-size:17px;margin:4px 0}.quality-panel-head p{font-size:11px;color:var(--text-muted);line-height:1.5}.quality-score{min-width:112px;padding:12px 14px;border-radius:13px;background:rgba(100,116,139,.08);text-align:right}.quality-score strong{display:block;font-family:var(--font-tech);font-size:26px}.quality-score span,.quality-score small{display:block;font-size:10px;color:var(--text-muted)}.quality-score small{margin-top:4px;max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quality-score.ok strong{color:var(--accent-green)}.quality-score.warn strong{color:var(--accent-yellow)}.quality-score.fail strong{color:var(--accent-red)}.quality-check-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}.quality-check-card{min-width:0;padding:12px;border-radius:11px;border:1px solid var(--border-color);background:rgba(255,255,255,.42)}.quality-check-card.ok{border-color:rgba(16,185,129,.18);background:rgba(16,185,129,.045)}.quality-check-card.warn{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.06)}.quality-check-card.fail{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.055)}.quality-check-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.quality-check-top strong{min-width:0;font-size:12px;color:var(--text-primary);overflow-wrap:anywhere}.quality-check-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.quality-check-top span{font-family:var(--font-tech);font-size:13px;color:var(--accent-blue)}.quality-refresh-btn{width:24px;height:24px;border-radius:8px;border:1px solid rgba(37,99,235,.18);background:rgba(37,99,235,.06);color:var(--accent-blue);font-size:13px;font-weight:900;line-height:1;cursor:pointer}.quality-refresh-btn:disabled{cursor:not-allowed;opacity:.52}.quality-check-card p{min-height:42px;margin:8px 0 10px;font-size:9.5px;line-height:1.45;color:var(--text-muted)}.quality-check-stats{display:flex;gap:5px;flex-wrap:wrap}.quality-check-stats span{padding:3px 6px;border-radius:999px;background:rgba(15,23,42,.055);font-size:9px;color:var(--text-secondary)}.quality-check-detail{margin-top:8px;font-size:9px;color:var(--text-muted)}.quality-check-detail summary{cursor:pointer;font-weight:800}.quality-check-detail ul{margin:6px 0 0;padding-left:16px;line-height:1.45}.quality-next-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.quality-next-actions strong{font-size:10px;color:var(--text-muted);padding:4px 0}.quality-next-actions span{padding:5px 8px;border-radius:999px;background:rgba(245,158,11,.08);color:#a16207;font-size:9px}
.workspace-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px;min-height:620px}.scope-panel,.detail-panel{border-radius:16px;min-height:0}.scope-panel{padding:18px 10px}.panel-title-row{display:flex;align-items:center;justify-content:space-between;padding:0 8px 14px}.panel-title-row h3{font-size:17px;margin-top:3px}.count-badge{font-family:var(--font-tech);font-size:11px;padding:4px 8px;border-radius:20px;background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.scope-list{display:flex;flex-direction:column;gap:5px;max-height:700px;overflow:auto}.scope-item{border:1px solid transparent;background:transparent;border-radius:10px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;color:var(--text-primary);cursor:pointer;transition:.2s}.scope-item:hover{background:rgba(var(--accent-blue-rgb),.05)}.scope-item.active{background:rgba(var(--accent-blue-rgb),.1);border-color:rgba(var(--accent-blue-rgb),.18)}.scope-mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-family:var(--font-tech);font-size:11px;color:white;background:var(--accent-purple)}.scope-mark.project{background:var(--accent-blue)}.scope-mark.warning,.scope-mark.critical{box-shadow:0 0 0 3px rgba(245,158,11,.12)}.scope-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.scope-copy strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scope-copy small{font-size:10px;color:var(--text-muted)}.health-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-green)}.alert-count{font-size:10px;color:#fff;background:var(--accent-yellow);padding:2px 6px;border-radius:10px}
.detail-panel{padding:20px;overflow:hidden}.detail-header{display:flex;justify-content:space-between;gap:22px;align-items:flex-start}.detail-header h3{font-size:22px;margin:6px 0 5px}.detail-header>div:first-child{min-width:0}.detail-header>div:first-child>p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:760px}.scope-meta{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text-muted)}.status-pill{padding:3px 7px;border-radius:10px;background:rgba(16,185,129,.1);color:var(--accent-green);font-weight:800}.status-pill.warning{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.status-pill.critical{background:rgba(239,68,68,.1);color:var(--accent-red)}.maintenance-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.alerts-block{margin-top:14px;display:flex;flex-direction:column;gap:6px}.alert-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);border-radius:9px;font-size:11px}.alert-row.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.alert-signal{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.critical .alert-signal{background:var(--accent-red)}
.context-meter{margin-top:15px;padding:14px;border-radius:11px;background:rgba(var(--accent-blue-rgb),.035);border:1px solid rgba(var(--accent-blue-rgb),.08)}.meter-copy,.meter-notes{display:flex;justify-content:space-between;gap:12px}.meter-copy{font-size:11px}.meter-copy strong{font-family:var(--font-tech);color:var(--accent-blue)}.meter-track{height:5px;background:rgba(var(--accent-blue-rgb),.1);border-radius:4px;margin:9px 0;overflow:hidden}.meter-track span{display:block;height:100%;background:var(--gradient-cyber);border-radius:4px}.meter-notes{font-size:9px;color:var(--text-muted)}
.view-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-top:15px}.view-tabs button{border:0;background:transparent;color:var(--text-muted);padding:10px 13px;font-size:11px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent}.view-tabs button.active{color:var(--accent-blue);border-bottom-color:var(--accent-blue)}.view-tabs span{margin-left:4px;padding:1px 5px;border-radius:8px;background:rgba(var(--accent-blue-rgb),.08)}
.memory-toolbar{display:flex;flex-direction:column;gap:8px;padding:13px 0 8px}.type-filters{display:flex;gap:5px;overflow:auto;padding-bottom:3px}.type-filters button{white-space:nowrap;border:1px solid var(--border-color);background:rgba(255,255,255,.4);border-radius:16px;padding:5px 9px;font-size:10px;color:var(--text-muted);cursor:pointer}.type-filters button.active{border-color:rgba(var(--accent-blue-rgb),.25);background:rgba(var(--accent-blue-rgb),.08);color:var(--accent-blue)}.memory-search{width:100%;padding:7px 10px;font-size:11px}.memory-stats-line{display:flex;gap:14px;font-size:10px;color:var(--text-muted);padding:2px 0 10px}.memory-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:560px;overflow:auto;padding-right:4px}.memory-group{border:1px solid var(--border-color);border-radius:11px;padding:10px;background:rgba(255,255,255,.25)}.group-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.group-heading h4{font-size:12px}.group-heading span{font-family:var(--font-tech);font-size:9px;color:var(--text-muted)}.memory-item{padding:10px;border-radius:9px;background:rgba(255,255,255,.55);border:1px solid transparent;margin-top:7px}.memory-item.pinned{border-color:rgba(var(--accent-blue-rgb),.25)}.memory-item.deprecated{opacity:.58;border-style:dashed}.memory-item p{font-size:11px;line-height:1.6;white-space:pre-wrap}.item-state{display:flex;gap:4px;margin-bottom:5px;min-height:14px}.state-tag{font-size:8px;font-weight:800;padding:2px 5px;border-radius:6px}.state-tag.pin{color:var(--accent-blue);background:rgba(var(--accent-blue-rgb),.1)}.state-tag.edit{color:var(--accent-purple);background:rgba(99,102,241,.1)}.state-tag.off{color:var(--accent-red);background:rgba(239,68,68,.08)}.state-tag.archive{color:var(--text-muted);background:rgba(100,116,139,.1)}.original-text{font-size:9px;color:var(--text-muted);padding:6px 8px;margin-top:7px;border-left:2px solid rgba(99,102,241,.2);line-height:1.5}.item-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;color:var(--text-muted);font-size:8px}.item-actions{display:flex;gap:2px;flex-wrap:wrap;justify-content:flex-end}.item-actions button{border:0;background:transparent;color:var(--text-muted);font-size:8px;padding:3px 4px;cursor:pointer}.item-actions button:hover{color:var(--accent-blue)}.item-actions button:disabled{opacity:.35;cursor:default}
.boundary-grid,.metrics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}.boundary-grid article,.metrics-grid article{padding:13px;border-radius:10px;border:1px solid var(--border-color);background:rgba(255,255,255,.4);display:flex;flex-direction:column;gap:7px}.boundary-grid span,.metrics-grid span{font-size:9px;color:var(--text-muted)}.boundary-grid strong{font-size:11px;overflow-wrap:anywhere}.metrics-grid strong{font-family:var(--font-tech);font-size:22px;color:var(--accent-blue)}.metrics-grid p{font-size:9px;color:var(--text-muted)}.summary-preview{border:1px solid var(--border-color);border-radius:11px;overflow:hidden}.preview-heading{padding:11px 13px;display:flex;justify-content:space-between;background:rgba(var(--accent-blue-rgb),.035)}.preview-heading h4{font-size:11px}.preview-heading span{font-family:monospace;font-size:9px;color:var(--text-muted)}.summary-preview pre,.evidence-row pre{margin:0;padding:14px;max-height:360px;overflow:auto;font:10px/1.6 'JetBrains Mono',monospace;white-space:pre-wrap;color:var(--text-secondary)}
.post-compact-panel{margin:12px 0;border:1px solid rgba(var(--accent-blue-rgb),.12);border-radius:12px;background:rgba(var(--accent-blue-rgb),.035);padding:13px}.post-compact-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.post-compact-head h4{font-size:13px;margin-top:3px}.post-compact-head code{max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:var(--text-muted);background:rgba(100,116,139,.08);padding:5px 7px;border-radius:7px}.post-compact-error{padding:10px;border-radius:8px;background:rgba(239,68,68,.06);color:var(--accent-red);font-size:10px}.post-compact-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.post-compact-cards article{min-width:0;padding:10px;border-radius:9px;border:1px solid var(--border-color);background:rgba(255,255,255,.48);display:flex;flex-direction:column;gap:4px}.post-compact-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.post-compact-cards strong{font-family:var(--font-tech);font-size:17px;color:var(--accent-blue)}.post-compact-cards small{font-size:8px;color:var(--text-muted);line-height:1.35}.discipline-panel{margin-top:9px;border:1px solid rgba(16,185,129,.16);border-radius:10px;background:rgba(16,185,129,.045);overflow:hidden}.discipline-panel.warn,.discipline-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.discipline-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.discipline-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid var(--border-color)}.discipline-head div{display:flex;flex-direction:column;gap:2px;min-width:0}.discipline-head strong{font-size:10px;color:var(--text-primary)}.discipline-head span{font-size:8px;color:var(--text-muted)}.discipline-head code{font-family:var(--font-tech);font-size:18px;color:var(--accent-green)}.discipline-panel.warn .discipline-head code,.discipline-panel.waiting .discipline-head code{color:var(--accent-yellow)}.discipline-panel.fail .discipline-head code{color:var(--accent-red)}.discipline-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}.discipline-cards article,.discipline-buckets article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.discipline-cards span,.discipline-buckets span{font-size:8px;color:var(--text-muted);font-weight:800}.discipline-cards strong,.discipline-buckets strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue)}.discipline-cards small,.discipline-buckets small{font-size:7px;color:var(--text-muted);line-height:1.35}.discipline-buckets{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;padding:0 9px 9px}.discipline-buckets article.weak{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.06)}.discipline-gap-list{border-top:1px solid var(--border-color)}.discipline-gap-list article{display:grid;grid-template-columns:64px minmax(90px,170px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.discipline-gap-list article:first-child{border-top:0}.discipline-gap-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.discipline-gap-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.post-compact-buckets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.post-compact-bucket{min-width:0;border:1px solid var(--border-color);border-radius:10px;background:rgba(255,255,255,.34);padding:9px}.bucket-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.bucket-heading h5{font-size:10px}.bucket-heading span{font-family:var(--font-tech);font-size:9px;color:var(--text-muted)}.candidate-row{border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,.52);padding:8px;margin-top:6px}.candidate-row.useful{border-color:rgba(16,185,129,.14)}.candidate-row.ignored,.candidate-row.archive{border-color:rgba(245,158,11,.18)}.candidate-row.missing{border-color:rgba(99,102,241,.18)}.candidate-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.candidate-top strong{font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.candidate-top span{font-size:8px;color:var(--accent-blue);font-weight:800;white-space:nowrap}.candidate-row p{font-size:9px;line-height:1.5;color:var(--text-secondary);margin:5px 0;overflow-wrap:anywhere}.usage-counts{display:flex;gap:4px;flex-wrap:wrap}.usage-counts span{font-size:7px;color:var(--text-muted);background:rgba(100,116,139,.08);border-radius:999px;padding:2px 5px}.recall-diagnostic-list,.recent-usage-list{margin-top:9px;border:1px solid var(--border-color);border-radius:10px;background:rgba(255,255,255,.32);overflow:hidden}.recall-diagnostic-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:rgba(100,116,139,.06);font-size:9px;color:var(--text-muted)}.recall-diagnostic-head strong{font-size:10px;color:var(--text-primary)}.recall-diagnostic-row,.recent-usage-row{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid var(--border-color);font-size:9px}.recall-diagnostic-row span{font-weight:800;color:var(--accent-green)}.recall-diagnostic-row.deprioritized span{color:var(--accent-yellow)}.recall-diagnostic-row strong,.recent-usage-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recall-diagnostic-row code{text-align:right;color:var(--accent-blue)}.recent-usage-row{grid-template-columns:64px 90px minmax(0,1fr)}.recent-usage-row p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.usage-state{font-size:8px;font-weight:800;border-radius:999px;padding:3px 6px;text-align:center;background:rgba(100,116,139,.1);color:var(--text-muted)}.usage-state.used{background:rgba(16,185,129,.1);color:var(--accent-green)}.usage-state.ignored,.usage-state.warn,.usage-state.waiting{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.usage-state.verified{background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.usage-state.mentioned{background:rgba(99,102,241,.1);color:var(--accent-purple)}.usage-state.fail{background:rgba(239,68,68,.1);color:var(--accent-red)}
.audit-view{padding-top:12px;max-height:560px;overflow:auto}.audit-item{display:grid;grid-template-columns:145px minmax(0,1fr) auto;gap:12px;padding:11px;border-bottom:1px solid var(--border-color);align-items:center}.audit-time{font-size:9px;color:var(--text-muted)}.audit-item strong{font-size:11px}.audit-item p{font-size:9px;color:var(--text-muted);margin-top:3px}.audit-item code{font-size:8px;color:var(--accent-blue)}.feedback-panel{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:12px;padding:14px;border-radius:10px;background:rgba(var(--accent-blue-rgb),.04);border:1px solid rgba(var(--accent-blue-rgb),.1)}.feedback-panel h4{font-size:12px;margin-bottom:4px}.feedback-panel p{font-size:9px;color:var(--text-muted)}.feedback-actions{display:flex;gap:5px;flex-wrap:wrap}.counter-table{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.counter-table div{padding:11px;border-bottom:2px solid rgba(var(--accent-blue-rgb),.12);display:flex;justify-content:space-between;font-size:10px}.counter-table span{color:var(--text-muted)}
.acceptance-note{margin-top:9px;padding:9px 11px;border-radius:8px;background:rgba(16,185,129,.06);color:var(--text-muted);font-size:9px;border:1px solid rgba(16,185,129,.12)}
.empty-state{padding:35px;text-align:center;color:var(--text-muted);font-size:11px}.empty-state.large{padding-top:180px}.mc-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.24);backdrop-filter:blur(10px);z-index:200;display:grid;place-items:center}.mc-modal{width:min(520px,calc(100vw - 36px));max-height:80vh;overflow:auto;border:1px solid var(--border-color);background:rgba(255,255,255,.92);box-shadow:0 26px 80px rgba(15,23,42,.18);border-radius:15px;padding:22px}.mc-modal h3{font-size:19px;margin:4px 0 14px}.mc-modal label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700;color:var(--text-muted);margin-top:13px}.mc-modal textarea{resize:vertical;font-size:12px;line-height:1.5}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.evidence-modal{width:min(760px,calc(100vw - 36px))}.evidence-row{border:1px solid var(--border-color);border-radius:10px;margin-top:9px;overflow:hidden}.evidence-row>div{display:flex;justify-content:space-between;padding:9px 12px;background:rgba(var(--accent-blue-rgb),.04);font-size:9px;color:var(--text-muted)}
@media(max-width:1100px){.summary-strip{grid-template-columns:repeat(3,1fr)}.memory-groups{grid-template-columns:1fr}.workspace-grid{grid-template-columns:220px minmax(0,1fr)}.quality-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.post-compact-cards,.discipline-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.discipline-buckets{grid-template-columns:repeat(4,minmax(0,1fr))}.post-compact-buckets{grid-template-columns:1fr}}
@media(max-width:760px){.memory-center{padding:10px}.mc-header,.detail-header,.feedback-panel,.quality-panel-head,.post-compact-head{flex-direction:column}.summary-strip{grid-template-columns:repeat(2,1fr)}.workspace-grid{grid-template-columns:1fr}.scope-panel{max-height:240px}.detail-panel{padding:13px}.maintenance-actions{justify-content:flex-start}.memory-toolbar{flex-direction:column}.memory-search{width:100%}.boundary-grid,.metrics-grid{grid-template-columns:repeat(2,1fr)}.quality-check-grid{grid-template-columns:1fr}.audit-item{grid-template-columns:1fr}.counter-table{grid-template-columns:repeat(2,1fr)}.post-compact-head code{max-width:100%;white-space:normal;overflow-wrap:anywhere}.post-compact-cards,.discipline-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.discipline-buckets{grid-template-columns:repeat(2,minmax(0,1fr))}.recall-diagnostic-row,.recent-usage-row,.discipline-gap-list article{grid-template-columns:1fr}}
:global([data-theme='dark']) .memory-center .aura-card,:global([data-theme='dark']) .summary-card,:global([data-theme='dark']) .memory-group,:global([data-theme='dark']) .memory-item,:global([data-theme='dark']) .boundary-grid article,:global([data-theme='dark']) .metrics-grid article,:global([data-theme='dark']) .quality-check-card,:global([data-theme='dark']) .post-compact-cards article,:global([data-theme='dark']) .discipline-cards article,:global([data-theme='dark']) .discipline-buckets article,:global([data-theme='dark']) .post-compact-bucket,:global([data-theme='dark']) .candidate-row,:global([data-theme='dark']) .recall-diagnostic-list,:global([data-theme='dark']) .recent-usage-list{background:rgba(15,23,42,.54)}:global([data-theme='dark']) .mc-modal{background:rgba(15,23,42,.94)}
.scope-mark.global{background:linear-gradient(135deg,var(--accent-purple),var(--accent-blue))}
.memory-policy-strip{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 0 12px;font-size:10px;color:var(--text-muted)}.memory-policy-strip button{border:1px solid rgba(239,68,68,.18);background:rgba(239,68,68,.06);color:var(--accent-red);border-radius:14px;padding:4px 8px;cursor:pointer}
.timeline-panel{margin-top:9px;border:1px solid rgba(var(--accent-blue-rgb),.16);border-radius:10px;background:rgba(var(--accent-blue-rgb),.04);overflow:hidden}.timeline-panel.warn,.timeline-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.timeline-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.timeline-panel .discipline-head code{color:var(--accent-blue)}.timeline-panel.warn .discipline-head code,.timeline-panel.waiting .discipline-head code{color:var(--accent-yellow)}.timeline-panel.fail .discipline-head code{color:var(--accent-red)}.timeline-component-list{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:0 9px 9px}.timeline-component-list article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.36);padding:7px;display:flex;flex-direction:column;gap:3px}.timeline-component-list article.warn{border-color:rgba(245,158,11,.2)}.timeline-component-list article.fail{border-color:rgba(239,68,68,.2)}.timeline-component-list span{font-size:8px;font-weight:800;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timeline-component-list strong{font-family:var(--font-tech);font-size:13px;color:var(--accent-blue)}.timeline-event-list{border-top:1px solid var(--border-color)}.timeline-event-list article{display:grid;grid-template-columns:88px minmax(90px,170px) minmax(0,1fr) 120px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.timeline-event-list article:first-child{border-top:0}.timeline-event-list span{font-size:8px;font-weight:800;color:var(--text-muted);text-transform:uppercase}.timeline-event-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.timeline-event-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.timeline-event-list code{font-size:8px;color:var(--text-muted);text-align:right}
.hook-ledger-list{border-top:1px solid var(--border-color)}.hook-ledger-list article{display:grid;grid-template-columns:64px minmax(120px,220px) minmax(0,1fr) 120px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.hook-ledger-list article:first-child{border-top:0}.hook-ledger-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hook-ledger-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.hook-ledger-list code{font-size:8px;color:var(--text-muted);text-align:right}
.replay-needle-list{border-top:1px solid var(--border-color)}.replay-needle-list article{display:grid;grid-template-columns:72px minmax(110px,190px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.replay-needle-list article:first-child{border-top:0}.replay-needle-list article.fail{background:rgba(239,68,68,.045)}.replay-needle-list article.ok{background:rgba(16,185,129,.035)}.replay-needle-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.replay-needle-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.usage-state.completed{background:rgba(16,185,129,.1);color:var(--accent-green)}.usage-state.blocked{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.usage-state.pending{background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.usage-state.in_progress{background:rgba(99,102,241,.1);color:var(--accent-purple)}.usage-state.cancelled{background:rgba(239,68,68,.1);color:var(--accent-red)}
.replay-repair-list{border-top:1px solid var(--border-color);background:rgba(255,255,255,.24)}.replay-repair-list article{display:grid;grid-template-columns:72px minmax(130px,210px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.replay-repair-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.replay-repair-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.replay-attempt-list{border-top:1px solid var(--border-color);background:rgba(100,116,139,.035)}.replay-attempt-list article{display:grid;grid-template-columns:72px minmax(120px,190px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.replay-attempt-list article.fail{background:rgba(239,68,68,.04)}.replay-attempt-list article.warn{background:rgba(245,158,11,.045)}.replay-attempt-list article.ok{background:rgba(16,185,129,.035)}.replay-attempt-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.replay-attempt-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.replay-work-list{border-top:1px solid var(--border-color);background:rgba(var(--accent-blue-rgb),.035)}.replay-work-list article{display:grid;grid-template-columns:74px minmax(130px,210px) minmax(0,1fr) minmax(128px,auto);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.replay-work-list article.pending{background:rgba(var(--accent-blue-rgb),.035)}.replay-work-list article.in_progress{background:rgba(99,102,241,.045)}.replay-work-list article.blocked{background:rgba(245,158,11,.055)}.replay-work-list article.completed{background:rgba(16,185,129,.035)}.replay-work-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.replay-work-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.replay-work-actions{display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}.replay-work-actions button{border:1px solid rgba(var(--accent-blue-rgb),.14);background:rgba(var(--accent-blue-rgb),.06);color:var(--accent-blue);border-radius:8px;padding:3px 6px;font-size:8px;font-weight:800;cursor:pointer}.replay-work-actions button:hover{background:rgba(var(--accent-blue-rgb),.12)}
.historical-boundary-list{border-top:1px solid var(--border-color);background:rgba(255,255,255,.2)}.historical-boundary-list article{display:grid;grid-template-columns:72px minmax(150px,230px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.historical-boundary-list article.fail{background:rgba(239,68,68,.04)}.historical-boundary-list article.warn{background:rgba(245,158,11,.045)}.historical-boundary-list article.ok{background:rgba(16,185,129,.035)}.historical-boundary-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.historical-boundary-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.agent-type-replay-list,.agent-type-target-list{border-top:1px solid var(--border-color);background:rgba(255,255,255,.22)}.agent-type-replay-list article,.agent-type-target-list article{display:grid;grid-template-columns:74px minmax(120px,200px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.agent-type-replay-list article.fail,.agent-type-target-list article.fail{background:rgba(239,68,68,.04)}.agent-type-replay-list article.warn,.agent-type-target-list article.warn{background:rgba(245,158,11,.045)}.agent-type-replay-list article.ok,.agent-type-target-list article.ok{background:rgba(16,185,129,.035)}.agent-type-replay-list strong,.agent-type-target-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.agent-type-replay-list p,.agent-type-target-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.agent-reliability-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:0 9px 9px}.agent-reliability-list article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;align-items:start}.agent-reliability-list article.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.agent-reliability-list article.warn{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.agent-reliability-list div{min-width:0;display:flex;gap:5px;align-items:center}.agent-reliability-list strong{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.agent-reliability-list span{font-size:7px;font-weight:800;color:var(--text-muted);text-transform:uppercase}.agent-reliability-list code{font-family:var(--font-tech);font-size:14px;color:var(--accent-blue)}.agent-reliability-list p{grid-column:1/-1;font-size:8px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:1100px){.timeline-component-list{grid-template-columns:repeat(3,minmax(0,1fr))}.timeline-event-list article{grid-template-columns:74px minmax(0,1fr) 100px}.timeline-event-list p{grid-column:1/-1;white-space:normal}}
@media(max-width:760px){.agent-reliability-list{grid-template-columns:1fr}.timeline-component-list{grid-template-columns:repeat(2,minmax(0,1fr))}.timeline-event-list article,.hook-ledger-list article,.replay-needle-list article,.replay-repair-list article,.replay-attempt-list article,.replay-work-list article,.historical-boundary-list article,.agent-type-replay-list article,.agent-type-target-list article{grid-template-columns:1fr}.timeline-event-list code,.hook-ledger-list code{text-align:left}}
:global([data-theme='dark']) .agent-reliability-list article,:global([data-theme='dark']) .timeline-component-list article{background:rgba(15,23,42,.54)}
</style>
