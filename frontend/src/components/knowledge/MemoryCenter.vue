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
const selftestResidueArchiveLoading = ref(false)
const selftestResidueArchiveResult = ref(null)
const taskAgentSnapshotRetentionLoading = ref(false)
const taskAgentSnapshotRetentionResult = ref(null)
const contextSettingsLoading = ref(false)
const contextSettingsSaving = ref(false)
const modelCapacityStatus = ref(null)
const modelCapabilityEntries = ref([])
const modelCapabilityRefreshPlan = ref(null)
const modelCapabilityRefreshStatus = ref(null)
const modelCapabilityRefreshOutcomeLedger = ref(null)
const invalidModelCapabilityRefreshOutcomes = ref({ outcomes: [], pendingAcknowledgementCount: 0, acknowledgedCount: 0 })
const modelCapabilityDowngradeAlerts = ref([])
const modelCapabilitySaving = ref(false)
const modelCapabilityMaintenanceRunning = ref(false)
const invalidRefreshOutcomeAcknowledging = ref('')
const modelCapabilitySetting = ref({ provider: '', model: '', contextWindow: 200000, maxOutputTokens: 20000 })
const sessionRetentionStatus = ref(null)
const sessionRetentionRunning = ref(false)
const sessionMemoryReplayLoading = ref('')
const sessionMemoryReplayResult = ref(null)
const sessionMemoryArtifactRetentionRunning = ref('')
const sessionMemoryTypedRetryRunning = ref('')
const sessionMemoryArtifactRetentionResult = ref(null)
const dispatchRecovery = ref({ summary: {}, rows: [] })
const dispatchRecoveryLoading = ref(false)
const dispatchResolveLoading = ref(false)
const dispatchResolveState = ref(null)
const expandedDispatchId = ref('')
const contextSettings = ref({
  memoryContextPreset: 'default',
  modelContextWindow: 0,
  modelAutoCompactTokenLimit: 0,
  typedMemoryDeliveryMaxDocuments: 5,
  typedMemoryDeliveryMaxBytesPerDocument: 4096,
  typedMemoryDeliveryMaxLinesPerDocument: 200,
  typedMemoryDeliveryMaxSessionBytes: 61440,
  typedMemoryDeliveryMaxTokens: 5000,
  groupSessionRetentionDays: 30,
  groupSessionMaxArchived: 20,
  groupSessionAutoPruneEnabled: false,
  groupSessionRetentionIntervalHours: 24,
  groupSessionArtifactAutoArchiveEnabled: true,
  groupSessionArtifactHotExecutions: 50,
  groupSessionArtifactMaxHotMb: 64,
  groupSessionArtifactMaxAgeDays: 30
})
const contextPresets = [
  { id: 'default', label: '默认', note: '按模型能力自动计算', window: 0, threshold: 0 },
  { id: '516k', label: '预设 516K', note: '上下文 516000 / 紧凑 460000', window: 516000, threshold: 460000 },
  { id: '1m', label: '预设 1M', note: '上下文 1000000 / 紧凑 900000', window: 1000000, threshold: 900000 },
  { id: 'custom', label: '自定义', note: '手动填写窗口与阈值', window: null, threshold: null }
]

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

const sessionMemoryFleetReport = computed(() => overview.value.groupSessionMemoryFleetReport || null)
const sessionMemoryFleetOverall = computed(() => sessionMemoryFleetReport.value?.overall || {})
const sessionMemoryFleetState = computed(() => sessionMemoryFleetOverall.value.status || 'empty')
const sessionMemoryFleetCards = computed(() => {
  const overall = sessionMemoryFleetOverall.value
  return [
    { label: 'sessions', value: overall.sessionCount || 0, note: `${overall.groupCount || 0} groups` },
    { label: 'covered', value: overall.sessionsCovered || 0, note: `${overall.coverageRate ?? '—'}%` },
    { label: 'tokens', value: overall.totalMarkdownTokens || 0, note: 'fleet total' },
    { label: 'max session', value: overall.maxObservedSessionTokens || 0, note: `/ ${overall.ccMaxTotalTokens || 12000}` },
    { label: 'over budget', value: overall.budgetExceededCount || 0, note: `near ${overall.budgetNearLimitCount || 0}` },
    { label: 'legacy default', value: overall.legacyDefaultSessionCount || 0, note: 'expected 0' },
    { label: 'compact scope', value: overall.autoCompactionScopeObservedCount || 0, note: `invalid ${overall.autoCompactionScopeInvalidCount || 0}` },
    { label: 'turn summaries', value: overall.postTurnSummaryCount || 0, note: `${overall.postTurnSummaryEventCount || 0} events` },
    { label: 'missing turns', value: overall.postTurnSummaryMissingCount || 0, note: 'expected 0' },
    { label: 'invalid ledgers', value: overall.postTurnSummaryInvalidLedgerCount || 0, note: 'expected 0' },
    { label: 'turn archives', value: overall.postTurnSummaryArchiveCount || 0, note: 'hash-chain files' },
    { label: 'initialized', value: overall.cadenceInitializedSessionCount || 0, note: `waiting ${overall.cadenceWaitingInitializationCount || 0}` },
    { label: 'extractions', value: overall.totalSessionMemoryExtractionCount || 0, note: `active ${overall.activeExtractionCount || 0} · failed ${overall.failedExtractionSessionCount || 0}` },
    { label: 'model extracted', value: overall.modelExtractedSessionCount || 0, note: `verified ${overall.modelReceiptVerifiedCount || 0}` },
    { label: 'model pending', value: overall.modelExtractionPendingCount || 0, note: `backoff ${overall.modelExtractionBackoffCount || 0}` },
    { label: 'direct skips', value: overall.directMemorySuppressionCount || 0, note: `active ${overall.directMemorySuppressionActiveCount || 0} · invalid ${overall.directMemorySuppressionInvalidCount || 0}` },
    { label: 'invalid receipt', value: overall.modelReceiptInvalidCount || 0, note: 'expected 0' },
    { label: 'history events', value: overall.modelExtractionHistoryEventCount || 0, note: `invalid ${overall.modelExtractionHistoryInvalidCount || 0}` },
    { label: 'history chain', value: overall.modelExtractionHistoryChainInvalidCount || 0, note: 'broken links' },
    { label: 'replay verified', value: overall.modelExtractionReplayObservedCount || 0, note: `invalid ${overall.modelExtractionReplayInvalidCount || 0}` },
    { label: 'delivery evidence', value: overall.modelExtractionDeliveryEvidenceCount || 0, note: `invalid ${overall.modelExtractionDeliveryEvidenceInvalidCount || 0}` },
    { label: 'artifact hot', value: overall.modelExtractionArtifactHotCount || 0, note: formatBytes(overall.modelExtractionArtifactHotBytes || 0) },
    { label: 'artifact archive', value: overall.modelExtractionArtifactArchivedCount || 0, note: formatBytes(overall.modelExtractionArtifactArchivedBytes || 0) },
    { label: 'archive due', value: overall.modelExtractionArtifactCandidateExecutionCount || 0, note: `invalid ${overall.modelExtractionArtifactInvalidCount || 0}` },
    { label: 'input bounded', value: overall.modelInputDegradedCount || 0, note: `over ${overall.modelInputOverBudgetCount || 0}` },
    { label: 'merge quality', value: overall.modelMergeQualityObservedCount || 0, note: `failed ${overall.modelMergeQualityFailedCount || 0}` },
    { label: 'supersession', value: overall.factSupersessionEdgeCount || 0, note: `graphs ${overall.factSupersessionGraphObservedCount || 0}` },
    { label: 'typed proposals', value: overall.modelExtractionTypedMemoryProposalCount || 0, note: `admitted ${overall.modelExtractionTypedMemoryAdmittedCount || 0} · rejected ${overall.modelExtractionTypedMemoryRejectedCount || 0}` },
    { label: 'typed active', value: overall.modelExtractionTypedMemoryActiveFactCount || 0, note: `superseded ${overall.modelExtractionTypedMemorySupersededFactCount || 0} · invalid ${overall.modelExtractionTypedMemoryArchiveInvalidCount || 0}` },
    { label: 'semantic topics', value: overall.modelExtractionTypedMemoryActiveTopicCount || 0, note: `retired ${overall.modelExtractionTypedMemoryRetiredTopicCount || 0} · merged ${overall.modelExtractionTypedMemoryMergedTopicCount || 0}` },
    { label: 'topic quality', value: overall.modelExtractionTypedMemoryCrossLanguageReuseCount || 0, note: `unclassified ${overall.modelExtractionTypedMemoryUnclassifiedFactCount || 0} · rebalanced ${overall.modelExtractionTypedMemoryRebalancedFactCount || 0}` },
    { label: 'memory selector', value: overall.manifestSelectorDecisionCount || 0, note: `selected ${overall.manifestSelectorSelectedDocumentCount || 0} · empty ${overall.manifestSelectorEmptyDecisionCount || 0} · failed ${overall.manifestSelectorFailedDecisionCount || 0}` },
    { label: 'typed retry', value: overall.modelExtractionTypedMemoryRetryPendingCount || 0, note: `recovered ${overall.modelExtractionTypedMemoryRetryCompletedCount || 0} · exhausted ${overall.modelExtractionTypedMemoryRetryExhaustedCount || 0}` },
    { label: 'unjustified loss', value: overall.factSupersessionUnjustifiedLostCount || 0, note: `invalid ${overall.factSupersessionGraphInvalidCount || 0}` }
  ]
})
const sessionMemoryFleetRows = computed(() => {
  const report = sessionMemoryFleetReport.value || {}
  const weak = report.weakGroups || []
  return (weak.length ? weak : report.groups || []).slice(0, 8)
})
const sessionMemoryHistoryRows = computed(() => (sessionMemoryFleetReport.value?.groups || [])
  .flatMap((row) => (row.modelExtractionHistory?.rows || []).map((event) => ({
    ...event,
    groupId: row.groupId,
    groupSessionId: row.groupSessionId,
    scopeId: row.modelExtractionScopeId || row.scopeId
  })))
  .sort((a, b) => (Date.parse(b.at || b.completedAt || b.failedAt || '') || 0) - (Date.parse(a.at || a.completedAt || a.failedAt || '') || 0))
  .slice(0, 10))
const sessionMemoryReplayChecks = computed(() => Object.entries(sessionMemoryReplayResult.value?.checks || {}))
const sessionMemoryReplayCheckLabels = {
  historyIntegrity: '历史链完整',
  attemptPresent: '开始事件存在',
  terminalPresent: '终态事件存在',
  requestArtifactValid: '请求制品有效',
  requestArtifactBoundToAttempt: '请求制品绑定开始事件',
  promptRebuildMatches: '提示词可确定性重建',
  resultArtifactValid: '结果制品有效',
  resultArtifactBoundToTerminal: '结果制品绑定终态事件',
  rawOutputChecksumMatches: '原始输出校验一致',
  terminalStatusMatches: '终态状态一致',
  receiptChecksumValid: '结果说明签名有效',
  receiptBoundToTerminal: '结果说明绑定终态事件',
  outputRevalidates: '输出可重新验证',
  markdownChecksumMatches: '记忆校验一致',
  mergeQualityReplays: '合并质量可复算',
  factSupersessionGraphValid: '事实替代图有效',
  factSupersessionGraphReplays: '事实替代图可复算',
  failureClassMatches: '失败分类一致',
  failedOutputDoesNotClaimCommit: '失败结果未伪装提交'
}

const dispatchRecoveryRows = computed(() => (dispatchRecovery.value?.rows || []).slice(0, 40))
const dispatchRecoverySummaryCards = computed(() => {
  const summary = dispatchRecovery.value?.summary || {}
  return [
    { label: 'total', value: summary.total || 0 },
    { label: 'recoverable', value: summary.recoverable || 0 },
    { label: 'active', value: summary.active || 0 },
    { label: 'uncertain', value: summary.uncertain || 0 },
    { label: 'invalid', value: summary.invalid || 0 },
    { label: 'committed', value: summary.committed || 0 }
  ]
})

const dispatchStateLabel = state => ({
  recoverable_commit: '可恢复提交',
  cancel_prepared: '未启动',
  active: '执行中',
  uncertain: '不确定',
  invalid: '证据异常',
  terminal: '已终结'
}[state] || state || '未知')

const dispatchActionLabel = action => ({
  retry_recovery: '重试强证据恢复',
  acknowledge_uncertain: '确认不确定状态',
  cancel_prepared: '取消未启动派发',
  prune_terminal: '清理完整终态证据'
}[action] || action)

const dispatchActions = row => {
  if (row.recoverability === 'recoverable_commit') return ['retry_recovery']
  if (row.recoverability === 'uncertain' && !row.acknowledged) return ['acknowledge_uncertain']
  if (row.recoverability === 'cancel_prepared') return ['cancel_prepared']
  if (row.recoverability === 'terminal' && row.direct?.pairValid) return ['prune_terminal']
  return []
}

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
const qualityCheckById = id => qualityChecks.value.find(check => check.id === id) || null
const globalBridgeCheck = computed(() => qualityCheckById('child_global_agent_memory_bridge'))
const crossGroupSuppressionCheck = computed(() => qualityCheckById('global_memory_cross_group_suppression'))
const crossGroupFreshnessCheck = computed(() => qualityCheckById('global_memory_cross_group_suppression_freshness'))
const crossProjectPressureUsageCheck = computed(() => qualityCheckById('worker_context_packet_cross_group_pressure_recall_usage'))
const crossProjectPressureUsageReport = computed(() => crossProjectPressureUsageCheck.value?.report || overview.value.workerContextPacketCrossGroupPressureRecallUsageReport || {})
const globalSelftestContaminationCheck = computed(() => qualityCheckById('global_memory_selftest_contamination'))
const taskAgentMemoryContextSnapshotCheck = computed(() => qualityCheckById('task_agent_memory_context_snapshots'))
const taskAgentSnapshotReport = computed(() => overview.value.taskAgentMemoryContextSnapshotReport || taskAgentMemoryContextSnapshotCheck.value?.report || {})
const taskAgentSnapshotState = computed(() => taskAgentSnapshotReport.value?.overall?.status || taskAgentMemoryContextSnapshotCheck.value?.status || 'empty')
const taskAgentSnapshotCards = computed(() => {
  const overall = taskAgentSnapshotReport.value?.overall || {}
  const lifecycleIntegrity = overview.value.groupSessionLifecycleIntegrityReport?.overall || {}
  const retention = taskAgentSnapshotReport.value?.retention || {}
  const result = taskAgentSnapshotRetentionResult.value || {}
  return [
    { label: 'snapshots', value: overall.snapshotCount || 0, note: `${overall.sessionCount || 0} sessions` },
    { label: 'healthy', value: overall.okCount || 0, note: `warn ${overall.warnCount || 0} / fail ${overall.failCount || 0}` },
    { label: 'delivered', value: overall.deliveredCount || 0, note: `missing ${overall.deliveryMissingCount || 0} · failed ${overall.deliveryFailedCount || 0}` },
    { label: 'invocation edges', value: overall.invocationEdgeCount || 0, note: `valid ${overall.invocationValidCount || 0} · invalid ${overall.invocationInvalidCount || 0}` },
    { label: 'branches', value: overall.invocationBranchCount || 0, note: `retry ${overall.invocationRetryCount || 0} · switch ${overall.invocationProviderSwitchCount || 0}` },
    { label: 'recovered', value: overall.invocationRecoveredCount || 0, note: `uncertain ${overall.invocationUncertainCount || 0} · quarantine ${overall.invocationRecoveryQuarantinedCount || 0}` },
    { label: 'live edges', value: overall.invocationRecoveryActiveCount || 0, note: `pending ${overall.invocationRecoveryPendingCount || 0} · open ${overall.invocationNonTerminalCount || 0}` },
    { label: 'adoption', value: overall.invocationAdoptionVerifiedCount || 0, note: `required ${overall.invocationAdoptionRequiredCount || 0} · invalid ${overall.invocationAdoptionInvalidCount || 0}` },
    { label: 're-injected', value: overall.invocationReinjectionProvenCount || 0, note: `required ${overall.invocationReinjectionRequiredCount || 0} · unverified ${overall.invocationReinjectionUnverifiedCount || 0}` },
    { label: 'native resume', value: overall.invocationNativeContinuationAcknowledgedCount || 0, note: `receipts ${overall.invocationNativeContinuationReceiptCount || 0} · unverified ${overall.invocationNativeContinuationUnverifiedCount || 0} · drift ${overall.invocationNativeContinuationOutputFormatDriftCount || 0}` },
    { label: 're-budget', value: overall.invocationContextRebudgetVerifiedCount || 0, note: `drift ${overall.invocationContextRebudgetDriftCount || 0} · unavailable ${overall.invocationContextRebudgetUnavailableCount || 0}` },
    { label: 'compact epoch fence', value: overall.invocationCompactHeadFenceValidatedCount || 0, note: `required ${overall.invocationCompactHeadFenceRequiredCount || 0} · dispatch stale ${overall.invocationCompactHeadFenceStaleCount || 0} · delivery stale ${overall.compactHeadFenceStaleCount || 0}` },
    { label: 'session lifecycle fence', value: overall.invocationSessionLifecycleFenceValidatedCount || 0, note: `required ${overall.invocationSessionLifecycleFenceRequiredCount || 0} · dispatch stale ${overall.invocationSessionLifecycleFenceStaleCount || 0} · delivery stale ${overall.sessionLifecycleFenceStaleCount || 0}` },
    { label: 'lifecycle anchors', value: lifecycleIntegrity.anchoredCount || 0, note: `heads ${lifecycleIntegrity.headCount || 0} · recovered ${lifecycleIntegrity.recoveredCount || 0} · fail-closed ${lifecycleIntegrity.failClosedCount || 0}` },
    { label: 'capacity commit', value: overall.capacityRevalidationCommittedCount || 0, note: `prepared ${overall.capacityRevalidationPreparedCount || 0} · pending ${overall.capacityRevalidationPendingCount || 0} · invalid ${overall.capacityRevalidationInvalidCount || 0}` },
    { label: 'soak health', value: overall.continuationSoakHealthyChainCount || 0, note: `chains ${overall.continuationSoakChainCount || 0} · multi-turn ${overall.continuationSoakMultiTurnChainCount || 0} · restart ${overall.continuationSoakRestartObservedChainCount || 0}` },
    { label: 'evidence chain', value: overall.continuationSoakValidChainCount || 0, note: `invalid ${overall.continuationSoakInvalidChainCount || 0} · recovered ${overall.continuationSoakRecoveredEventCount || 0} · drift ${overall.continuationSoakOutputFormatDriftCount || 0}` },
    { label: 'contract epochs', value: overall.continuationSoakProviderContractEpochCount || 0, note: `transitions ${overall.continuationSoakProviderContractTransitionCount || 0}` },
    { label: 'version transition', value: overall.continuationSoakProviderContractTransitionVerifiedCount || 0, note: `unverified ${overall.continuationSoakProviderContractTransitionUnverifiedCount || 0}` },
    { label: 'real task output', value: overall.continuationSoakTaskArtifactProvenCount || 0, note: `evidence ${overall.continuationSoakTaskArtifactEvidenceCount || 0} · unproven ${overall.continuationSoakTaskArtifactUnprovenCount || 0}` },
    { label: 'memory-bound output', value: overall.continuationSoakMemoryBoundTaskArtifactCount || 0, note: `recovered ${overall.continuationSoakRecoveredTaskArtifactCount || 0} · cross-version chains ${overall.continuationSoakCrossVersionTaskArtifactChainCount || 0}` },
    { label: 'post-compact output', value: overall.continuationSoakPostCompactArtifactClosureProvenCount || 0, note: `evidence ${overall.continuationSoakPostCompactTaskArtifactEvidenceCount || 0} · unproven ${overall.continuationSoakPostCompactArtifactClosureUnprovenCount || 0}` },
    { label: 'closure recovery', value: overall.continuationSoakPostCompactArtifactRecoveryClosureCount || 0, note: `cross-version chains ${overall.continuationSoakCrossVersionPostCompactArtifactChainCount || 0} · identity drift ${overall.continuationSoakPostCompactArtifactIdentityMismatchCount || 0}` },
    { label: 'compact receipt drift', value: overall.continuationSoakPostCompactArtifactCompactTransactionReceiptMismatchCount || 0, note: `head drift ${overall.continuationSoakPostCompactArtifactCompactHeadFenceMismatchCount || 0} · epoch drift ${overall.continuationSoakPostCompactArtifactEpochMismatchCount || 0} · delivery drift ${overall.continuationSoakPostCompactArtifactDeliveryMismatchCount || 0}` },
    { label: 'provider CLIs', value: overall.providerRuntimeContractHealthyCount || 0, note: `checked ${overall.providerRuntimeContractCount || 0} · failed ${overall.providerRuntimeContractFailedCount || 0}` },
    { label: 'recovery fence', value: overall.invocationRecoveryMaxFencingToken || 0, note: `leases ${overall.invocationRecoveryLeasedCount || 0} · takeover ${overall.invocationRecoveryLeaseTakeoverCount || 0}` },
    { label: 'session bound', value: overall.groupSessionBoundCount || 0, note: `scope mismatch ${overall.deliveryScopeMismatchCount || 0}` },
    { label: 'orphan', value: overall.orphanFileCount || 0, note: `missing ${overall.missingFileCount || 0}` },
    { label: 'packet gaps', value: overall.missingPacketCount || 0, note: `gate gaps ${overall.missingGateCount || 0}` },
    { label: 'prunable', value: overall.prunableCount ?? retention.candidateCount ?? 0, note: `stale ${overall.staleCount || 0}` },
    { label: result.dryRun ? 'preview' : 'pruned', value: result.prunedCount ?? '—', note: result.schema ? `skipped ${result.skippedCount || 0}` : 'no operation' }
  ]
})
const taskAgentSnapshotRows = computed(() => {
  const report = taskAgentSnapshotReport.value || {}
  const rows = report.weakRows?.length ? report.weakRows : report.rows || []
  return rows.slice(0, 8)
})
const taskAgentInvocationRows = computed(() => {
  const rows = taskAgentSnapshotReport.value?.invocationLineage?.rows || []
  return [...rows].sort((a, b) => {
    const rank = row => row.valid === false ? 0 : row.recovery_outcome === 'uncertain' ? 1 : !['completed', 'failed'].includes(row.status) ? 2 : 3
    return rank(a) - rank(b) || String(b.prepared_at || '').localeCompare(String(a.prepared_at || ''))
  }).slice(0, 8)
})
const taskAgentContinuationSoakRows = computed(() => (taskAgentSnapshotReport.value?.continuationSoak?.rows || []).slice(0, 8))
const providerRuntimeContractRows = computed(() => (taskAgentSnapshotReport.value?.providerRuntimeContracts?.rows || []).slice(0, 8))
const taskAgentSnapshotHasPrunable = computed(() => Number(taskAgentSnapshotReport.value?.overall?.prunableCount ?? taskAgentSnapshotReport.value?.retention?.candidateCount ?? 0) > 0)
const globalSelftestScan = computed(() => globalSelftestContaminationCheck.value?.report || {})
const globalSelftestArchiveState = computed(() => {
  const scan = globalSelftestScan.value
  if (Number(scan.active_contamination_count || 0) > 0) return 'fail'
  if (Number(scan.residue_contamination_count || 0) > 0) return 'warn'
  return globalSelftestContaminationCheck.value ? 'ok' : 'waiting'
})
const globalSelftestArchiveCards = computed(() => {
  const scan = globalSelftestScan.value
  const result = selftestResidueArchiveResult.value || {}
  return [
    { label: 'active', value: scan.active_contamination_count || 0, note: 'memory.json + bak' },
    { label: 'residue', value: scan.residue_contamination_count || 0, note: 'tmp / old backup' },
    { label: result.dryRun ? 'preview' : 'archived', value: result.archivedCount ?? '—', note: result.schema ? `skipped ${result.skippedCount || 0}` : 'no operation' },
    { label: 'status', value: globalSelftestArchiveState.value, note: scan.generatedAt ? formatTime(scan.generatedAt) : 'not sampled' }
  ]
})
const globalSelftestResidueRows = computed(() => {
  const check = globalSelftestContaminationCheck.value || {}
  const residueGaps = Array.isArray(check.residueGaps) ? check.residueGaps : []
  const rows = residueGaps.length ? residueGaps : (globalSelftestScan.value.rows || []).filter(row => row.active !== true)
  return rows.slice(0, 8)
})
const globalSelftestHasResidue = computed(() => Number(globalSelftestScan.value.residue_contamination_count || 0) > 0)
const globalSelftestHasActivePollution = computed(() => Number(globalSelftestScan.value.active_contamination_count || 0) > 0)
const crossGroupQualityAvailable = computed(() => {
  const ids = qualityReport.value?.availableCheckIds || []
  return ids.includes('global_memory_cross_group_suppression') || ids.includes('global_memory_cross_group_suppression_freshness') || !!crossGroupSuppressionCheck.value || !!crossGroupFreshnessCheck.value
})
const crossProjectPressureUsageAvailable = computed(() => {
  const ids = qualityReport.value?.availableCheckIds || []
  return ids.includes('worker_context_packet_cross_group_pressure_recall_usage')
    || !!crossProjectPressureUsageCheck.value
    || !!crossProjectPressureUsageReport.value?.schema
})
const crossProjectPressureUsageState = computed(() => crossProjectPressureUsageReport.value?.overall?.status || crossProjectPressureUsageCheck.value?.status || 'empty')
const globalMemoryArbitrationAvailable = computed(() => {
  const ids = qualityReport.value?.availableCheckIds || []
  return crossGroupQualityAvailable.value || ids.includes('child_global_agent_memory_bridge') || !!globalBridgeCheck.value
})
const ignoreMemoryReceiptComplianceCheck = computed(() => qualityCheckById('worker_context_packet_ignore_memory_receipt_compliance'))
const ignoreMemoryReceiptRepairCheck = computed(() => qualityCheckById('worker_context_packet_ignore_memory_receipt_repair_work_items'))
const ignoreMemoryReceiptCandidateCheck = computed(() => qualityCheckById('worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates'))
const ignoreMemoryReceiptBriefCheck = computed(() => qualityCheckById('worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs'))
const ignoreMemoryReceiptTypedMemoryCheck = computed(() => qualityCheckById('worker_context_packet_ignore_memory_receipt_repair_typed_memory'))
const ignoreMemoryReceiptComplianceReport = computed(() => ignoreMemoryReceiptComplianceCheck.value?.report || {})
const ignoreMemoryReceiptRepairReport = computed(() => ignoreMemoryReceiptRepairCheck.value?.report || {})
const ignoreMemoryReceiptCandidateReport = computed(() => ignoreMemoryReceiptCandidateCheck.value?.report || {})
const ignoreMemoryReceiptBriefReport = computed(() => ignoreMemoryReceiptBriefCheck.value?.report || {})
const ignoreMemoryReceiptTypedMemoryReport = computed(() => ignoreMemoryReceiptTypedMemoryCheck.value?.report || {})
const ignoreMemoryReceiptAvailable = computed(() => {
  const ids = qualityReport.value?.availableCheckIds || []
  return ids.includes('worker_context_packet_ignore_memory_receipt_compliance')
    || ids.includes('worker_context_packet_ignore_memory_receipt_repair_work_items')
    || ids.includes('worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates')
    || ids.includes('worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs')
    || ids.includes('worker_context_packet_ignore_memory_receipt_repair_typed_memory')
    || !!ignoreMemoryReceiptComplianceCheck.value
    || !!ignoreMemoryReceiptRepairCheck.value
    || !!ignoreMemoryReceiptCandidateCheck.value
    || !!ignoreMemoryReceiptBriefCheck.value
    || !!ignoreMemoryReceiptTypedMemoryCheck.value
})
const ignoreMemoryReceiptState = computed(() => {
  const statuses = [
    ignoreMemoryReceiptComplianceCheck.value?.status,
    ignoreMemoryReceiptRepairCheck.value?.status,
    ignoreMemoryReceiptCandidateCheck.value?.status,
    ignoreMemoryReceiptBriefCheck.value?.status,
    ignoreMemoryReceiptTypedMemoryCheck.value?.status,
    ignoreMemoryReceiptComplianceReport.value?.overall?.status,
    ignoreMemoryReceiptRepairReport.value?.overall?.status,
    ignoreMemoryReceiptCandidateReport.value?.overall?.status,
    ignoreMemoryReceiptBriefReport.value?.overall?.status,
    ignoreMemoryReceiptTypedMemoryReport.value?.overall?.status
  ].filter(Boolean)
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('warn')) return 'warn'
  if (statuses.includes('ok')) return 'ok'
  return 'waiting'
})
const ignoreMemoryReceiptCards = computed(() => {
  const compliance = ignoreMemoryReceiptComplianceReport.value?.overall || {}
  const repair = ignoreMemoryReceiptRepairReport.value?.overall || {}
  const candidates = ignoreMemoryReceiptCandidateReport.value?.overall || {}
  const briefs = ignoreMemoryReceiptBriefReport.value?.overall || {}
  const typed = ignoreMemoryReceiptTypedMemoryReport.value?.overall || {}
  return [
    { label: 'coverage', value: compliance.coverageRate ?? '—', suffix: compliance.coverageRate !== null && compliance.coverageRate !== undefined ? '%' : '', note: `${compliance.groupsCovered || 0}/${compliance.checkedGroupCount || 0} groups` },
    { label: 'bindings', value: compliance.ignoredPolicyBindingCount || 0, note: `${compliance.compliantReceiptCount || 0} compliant` },
    { label: 'missing receipt', value: compliance.missingReceiptCount || 0, note: `${compliance.missingMemoryIgnoredCount || 0} memoryIgnored gaps` },
    { label: 'wrong used', value: compliance.memoryUsedViolationCount || 0, note: 'memoryUsed violation' },
    { label: 'repair open', value: repair.openItemCount || 0, note: `${repair.currentOpenItemCount || 0} current` },
    { label: 'stale repair', value: repair.staleOpenItemCount || 0, note: `${repair.total || 0} total items` },
    { label: 'candidates', value: candidates.candidateCount || 0, note: `${candidates.packetBoundCandidateCount || 0} packet bound` },
    { label: 'briefs', value: briefs.readyBriefCount || 0, note: `${briefs.memoryIgnoredPromptBriefCount || 0} corrected prompts` },
    { label: 'typed memory', value: typed.typedMemoryDocCount || 0, note: `${typed.recallMatchCount || 0} recall hits` }
  ]
})
const ignoreMemoryReceiptRows = computed(() => {
  const complianceRows = (ignoreMemoryReceiptComplianceReport.value?.groups || [])
    .filter(row => Number(row.ignoredPolicyBindingCount || 0) > 0 || row.status === 'fail' || row.status === 'warn')
    .slice(0, 8)
    .map(row => ({
      key: `receipt:${row.groupId || 'group'}`,
      type: 'receipt',
      status: row.status || 'waiting',
      title: row.groupId || 'group',
      detail: `${row.compliantReceiptCount || 0}/${row.ignoredPolicyBindingCount || 0} compliant · missing ${row.missingReceiptCount || 0} · reason ${row.missingReasonCount || 0} · used ${row.memoryUsedViolationCount || 0}`,
      code: row.file || 'binding ledger'
    }))
  const repairRows = (ignoreMemoryReceiptRepairReport.value?.groups || [])
    .filter(row => Number(row.requiredActionCount || 0) > 0 || Number(row.openItemCount || 0) > 0 || row.status === 'fail' || row.status === 'warn')
    .slice(0, 8)
    .map(row => ({
      key: `repair:${row.groupId || 'group'}`,
      type: 'repair',
      status: row.status || 'waiting',
      title: row.groupId || 'group',
      detail: `required ${row.requiredActionCount || 0} · open ${row.openItemCount || 0} · current ${row.currentOpenItemCount || 0} · stale ${row.staleOpenItemCount || 0}`,
      code: row.file || 'work items'
    }))
  const candidateRows = (ignoreMemoryReceiptCandidateReport.value?.groups || [])
    .filter(row => Number(row.expectedCandidateCount || 0) > 0 || Number(row.candidateCount || 0) > 0 || row.status === 'fail' || row.status === 'warn')
    .slice(0, 8)
    .map(row => ({
      key: `candidate:${row.groupId || 'group'}`,
      type: 'candidate',
      status: row.status || 'waiting',
      title: row.groupId || 'group',
      detail: `expected ${row.expectedCandidateCount || 0} · covered ${row.coveredCandidateCount || 0} · packet ${row.packetBoundCandidateCount || 0} · prompt ${row.promptPatchCandidateCount || 0}`,
      code: row.file || 'dispatch candidates'
    }))
  const briefRows = (ignoreMemoryReceiptBriefReport.value?.groups || [])
    .filter(row => Number(row.expectedBriefCount || 0) > 0 || Number(row.readyBriefCount || 0) > 0 || row.status === 'fail' || row.status === 'warn')
    .slice(0, 8)
    .map(row => ({
      key: `brief:${row.groupId || 'group'}`,
      type: 'brief',
      status: row.status || 'waiting',
      title: row.groupId || 'group',
      detail: `expected ${row.expectedBriefCount || 0} · ready ${row.readyBriefCount || 0} · memoryIgnored ${row.memoryIgnoredPromptBriefCount || 0}`,
      code: row.file || 'dispatch briefs'
    }))
  const typedRows = (ignoreMemoryReceiptTypedMemoryReport.value?.groups || [])
    .filter(row => Number(row.inputRowCount || 0) > 0 || Number(row.typedMemoryDocCount || 0) > 0 || row.status === 'fail' || row.status === 'warn')
    .slice(0, 8)
    .map(row => ({
      key: `typed-memory:${row.groupId || 'group'}`,
      type: 'typed',
      status: row.status || 'waiting',
      title: row.groupId || 'group',
      detail: `rows ${row.inputRowCount || 0} · docs ${row.typedMemoryDocCount || 0} · archive ${row.archivedCount || 0} · recall ${row.recallMatchCount || 0}`,
      code: row.typedMemoryLedgerFile || 'typed MEMORY.md'
    }))
  return [...complianceRows, ...repairRows, ...candidateRows, ...briefRows, ...typedRows].slice(0, 18)
})
const ignoreMemoryReceiptWorkItemRows = computed(() => (ignoreMemoryReceiptRepairReport.value?.groups || [])
  .flatMap(group => (group.items || []).map(item => ({
    ...item,
    groupId: group.groupId || '',
    groupStatus: group.status || 'waiting',
    key: `ignore-memory-work:${group.groupId || 'group'}:${item.id || item.work_item_id || item.packet_id || item.binding_id || ''}`
  })))
  .filter(item => item.id || item.work_item_id)
  .slice(0, 10))
const crossProjectPressureUsageCards = computed(() => {
  const overall = crossProjectPressureUsageReport.value?.overall || {}
  return [
    { label: 'assist', value: overall.crossGroupAssistProjectCount || 0, note: `${overall.checkedProjectCount || 0} checked projects` },
    { label: 'supplement', value: overall.crossGroupSupplementCount || 0, note: `${overall.checkedGroupCount || 0} groups` },
    { label: 'source groups', value: overall.sourceGroupCount || 0, note: `${overall.freshCrossGroupEntryCount || 0} fresh entries` },
    { label: 'local', value: overall.localProjectCount || 0, note: 'local-first projects' },
    { label: 'conflicts', value: overall.conflictCount || 0, note: 'local vs cross' },
    { label: 'stale', value: overall.staleCrossGroupEntryCount || 0, note: 'cross-group entries' }
  ]
})
const crossProjectPressureUsageRows = computed(() => {
  const groups = crossProjectPressureUsageReport.value?.groups || []
  return groups.flatMap(group => (group.projects || [])
    .filter(project => project.mode !== 'no_pressure_usage_history' || project.status === 'warn')
    .map(project => {
      const supplement = (project.supplementRows || [])[0] || {}
      const conflict = (project.conflictRows || [])[0] || {}
      return {
        key: `cross-pressure:${group.groupId || 'group'}:${project.targetProject || 'project'}:${project.mode || project.status}`,
        groupId: group.groupId || '',
        targetProject: project.targetProject || '',
        mode: project.mode || '',
        status: project.status || 'empty',
        localMemoryCount: project.localMemoryCount || 0,
        crossGroupMemoryCount: project.crossGroupMemoryCount || 0,
        crossGroupSupplementCount: project.crossGroupSupplementCount || 0,
        sourceGroupCount: project.sourceGroupCount || 0,
        conflictCount: project.conflictCount || 0,
        staleCrossGroupEntryCount: project.staleCrossGroupEntryCount || 0,
        freshCrossGroupEntryCount: project.freshCrossGroupEntryCount || 0,
        recommendation: supplement.recommendation || conflict.cross_group_recommendation || '',
        relPath: supplement.rel_path || conflict.rel_path || '',
        sourceGroup: (project.sourceGroups || [])[0]?.groupId || ''
      }
    })).slice(0, 12)
})
const crossProjectPressureUsageRowState = row => row.conflictCount > 0 ? 'warn' : row.status === 'ok' ? 'ok' : row.status === 'warn' ? 'warn' : 'waiting'
const crossGroupQualityCards = computed(() => {
  const bridge = globalBridgeCheck.value?.report?.overall || {}
  const suppression = crossGroupSuppressionCheck.value?.report?.overall || {}
  const freshness = crossGroupFreshnessCheck.value?.report?.overall || {}
  return [
    { label: 'semantic', value: bridge.semanticConflictCount || bridge.semanticRiskCount || 0, note: `${bridge.semanticRiskCount || 0} risk rows` },
    { label: 'max risk', value: bridge.maxSemanticRiskScore || 0, note: 'semantic score' },
    { label: 'hard', value: suppression.suppressedCount || 0, note: `${suppression.checkedGroupCount || 0} groups` },
    { label: 'advisory', value: freshness.advisoryCount || 0, note: `${freshness.checkedGroupCount || 0} groups` },
    { label: 'superseded', value: freshness.supersededCount || 0, note: 'new global memory' },
    { label: 'missing', value: Number(suppression.missingRenderCount || 0) + Number(suppression.missingReferenceCount || 0) + Number(freshness.missingRenderCount || 0) + Number(freshness.missingReferenceCount || 0), note: 'render/source' }
  ]
})
const normalizeCrossGroupQualityRow = (group, item, mode) => {
  const freshness = item?.freshness || {}
  const sourceLedgers = item?.sourceLedgers || []
  return {
    key: `${mode}:${group.groupId || 'group'}:${item?.globalMemoryId || 'memory'}:${item?.reason || item?.status || ''}`,
    mode,
    groupId: group.groupId || '',
    targetProject: group.targetProject || '',
    globalMemoryId: item?.globalMemoryId || '',
    status: item?.status || item?.reason || '',
    action: item?.action || '',
    groupCount: item?.groupCount || 0,
    conflictGroupCount: item?.conflictGroupCount || 0,
    occurrenceCount: item?.totalOccurrenceCount || 0,
    sourceCount: sourceLedgers.length,
    source: sourceLedgers[0]?.file || group.crossGroupSuppressionSourceDir || '',
    latestEvidenceAt: freshness.latestEvidenceAt || '',
    globalUpdatedAt: freshness.globalUpdatedAt || '',
    superseded: freshness.supersededByNewerGlobalMemory === true,
    decayed: freshness.decayedToAdvisory === true
  }
}
const crossGroupSuppressionRows = computed(() => {
  const groups = crossGroupSuppressionCheck.value?.report?.groups || []
  return groups.flatMap(group => (group.crossGroupSuppressionItems || []).map(item => normalizeCrossGroupQualityRow(group, item, 'hard'))).slice(0, 12)
})
const crossGroupAdvisoryRows = computed(() => {
  const groups = crossGroupFreshnessCheck.value?.report?.groups || []
  return groups.flatMap(group => (group.crossGroupSuppressionAdvisoryItems || []).map(item => normalizeCrossGroupQualityRow(group, item, 'advisory'))).slice(0, 12)
})
const crossGroupQualityRows = computed(() => [...crossGroupSuppressionRows.value, ...crossGroupAdvisoryRows.value].slice(0, 16))
const crossGroupRowState = row => row.mode === 'hard' ? 'fail' : row.superseded ? 'ok' : row.decayed ? 'warn' : 'waiting'
const postCompactUsage = computed(() => detail.value?.postCompactUsage || null)
const postCompactTotals = computed(() => postCompactUsage.value?.summary?.totals || postCompactUsage.value?.ledger?.totals || {})
const postCompactDiscipline = computed(() => postCompactUsage.value?.discipline || null)
const postCompactDispatch = computed(() => postCompactUsage.value?.dispatch || null)
const childAgentReliability = computed(() => postCompactUsage.value?.agentReliability || null)
const compactBoundaryTimeline = computed(() => postCompactUsage.value?.boundaryTimeline || null)
const resumeProjection = computed(() => postCompactUsage.value?.resumeProjection || null)
const compactStrategyDecision = computed(() => postCompactUsage.value?.compactStrategyDecision || null)
const postCompactCleanupAudit = computed(() => postCompactUsage.value?.postCompactCleanupAudit || null)
const apiMicroCompactEditPlan = computed(() => postCompactUsage.value?.apiMicroCompactEditPlan || null)
const apiMicrocompactReceiptDiscipline = computed(() => postCompactUsage.value?.apiMicrocompactReceiptDiscipline || null)
const apiMicrocompactNativeApplyReadiness = computed(() => postCompactUsage.value?.apiMicrocompactNativeApplyReadiness || null)
const apiMicrocompactNativeApplyProof = computed(() => postCompactUsage.value?.apiMicrocompactNativeApplyProof || null)
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
const taskAgentMemoryContextSnapshots = computed(() => postCompactUsage.value?.taskAgentMemoryContextSnapshots || null)
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
  const semantic = postCompactUsage.value?.typedMemory?.semanticRecallScoring || {}
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
    { label: '语义召回', value: semantic.boosted_count || 0, note: `冲突 ${semantic.conflict_penalized_count || 0} · 去重 ${semantic.semantic_duplicate_count || 0}` },
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
const taskAgentMemoryContextSnapshotState = computed(() => {
  const snapshots = taskAgentMemoryContextSnapshots.value || {}
  if (snapshots.status === 'fail' || Number(snapshots.failCount || 0) > 0) return 'fail'
  if (snapshots.status === 'warn' || Number(snapshots.warnCount || 0) > 0 || Number(snapshots.prunableCount || 0) > 0) return 'warn'
  if (Number(snapshots.snapshotCount || 0) > 0) return 'ok'
  return 'waiting'
})
const taskAgentMemoryContextSnapshotCards = computed(() => {
  const snapshots = taskAgentMemoryContextSnapshots.value || {}
  return [
    { label: 'snapshots', value: snapshots.snapshotCount || 0, note: `${(snapshots.projects || []).length} projects` },
    { label: 'summary capsules', value: snapshots.postTurnSummaryCapsuleCount || 0, note: `valid ${snapshots.postTurnSummaryCapsuleValidCount || 0}` },
    { label: 'capsule gaps', value: Number(snapshots.postTurnSummaryCapsuleMissingCount || 0) + Number(snapshots.postTurnSummaryCapsuleInvalidCount || 0), note: `prompt ${snapshots.postTurnSummaryCapsulePromptBoundCount || 0} · epoch drift ${snapshots.postTurnSummaryCapsuleCompactEpochMismatchCount || 0}` },
    { label: 'failed / stale', value: snapshots.failCount || 0, note: `stale ${snapshots.staleCount || 0} · prunable ${snapshots.prunableCount || 0}` }
  ]
})
const taskAgentMemoryContextSnapshotRows = computed(() => {
  const snapshots = taskAgentMemoryContextSnapshots.value || {}
  const rows = snapshots.weakRows?.length ? snapshots.weakRows : snapshots.rows || []
  return rows.slice(0, 8)
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
const compactStrategyDecisionState = computed(() => {
  const decision = compactStrategyDecision.value || {}
  if (!decision.schema || decision.status === 'empty') return 'waiting'
  if (decision.status === 'fail' || (decision.failedInvariants || []).length) return 'fail'
  if (decision.status === 'warn' || (decision.gaps || []).length) return 'warn'
  return 'ok'
})
const compactStrategyDecisionCards = computed(() => {
  const decision = compactStrategyDecision.value || {}
  const micro = decision.microCompact || {}
  return [
    { label: 'mode', value: decision.mode || '—', note: decision.reason || decision.status || 'waiting' },
    { label: 'window', value: decision.messagesToSummarize || 0, note: `kept ${decision.keptMessages || 0}` },
    { label: 'tokens', value: decision.postCompactTokenEstimate || 0, note: `${formatNumber(decision.preCompactTokenCount || 0)} before` },
    { label: 'pressure', value: decision.tokenPressurePercent ?? '—', suffix: decision.tokenPressurePercent !== null && decision.tokenPressurePercent !== undefined ? '%' : '', note: 'pre compact' },
    { label: 'micro freed', value: micro.tokensFreed || 0, note: `${micro.compactedMessageCount || 0} compacted` },
    { label: 'invariants', value: decision.invariantPass ? 'ok' : ((decision.failedInvariants || []).length || 'check'), note: `gaps ${(decision.gaps || []).length}` }
  ]
})
const compactStrategyDecisionGaps = computed(() => {
  const decision = compactStrategyDecision.value || {}
  return (decision.gaps || []).slice(0, 6)
})
const postCompactCleanupAuditState = computed(() => {
  const cleanup = postCompactCleanupAudit.value || {}
  if (!cleanup.schema || cleanup.status === 'empty') return 'waiting'
  if (cleanup.status === 'fail' || cleanup.auditStatus === 'failed' || (cleanup.failedChecks || []).length) return 'fail'
  if (cleanup.status === 'warn' || cleanup.auditStatus === 'degraded' || (cleanup.gaps || []).length) return 'warn'
  return 'ok'
})
const postCompactCleanupAuditCards = computed(() => {
  const cleanup = postCompactCleanupAudit.value || {}
  return [
    { label: 'status', value: cleanup.auditStatus || cleanup.status || '—', note: cleanup.action || 'waiting' },
    { label: 'checks', value: cleanup.passedChecks || 0, note: `of ${cleanup.checkCount || 0}` },
    { label: 'actions', value: cleanup.cleanupActionCount || 0, note: cleanup.mode || 'cleanup' },
    { label: 'skills', value: cleanup.preserveInvokedSkills ? 'keep' : 'check', note: `${(cleanup.skillHints || []).length} hints` },
    { label: 'tools', value: cleanup.preserveToolContinuity ? 'keep' : 'check', note: cleanup.resetDerivedCompactState ? 'reset derived' : 'missing reset' },
    { label: 'legacy', value: cleanup.inferredFromLegacy ? 'yes' : 'no', note: cleanup.stored ? 'stored audit' : 'inferred' }
  ]
})
const postCompactCleanupAuditRows = computed(() => {
  const cleanup = postCompactCleanupAudit.value || {}
  return (cleanup.cleanupActions || []).slice(0, 8)
})
const postCompactCleanupAuditGaps = computed(() => {
  const cleanup = postCompactCleanupAudit.value || {}
  return (cleanup.gaps || []).slice(0, 6)
})
const apiMicroCompactEditPlanState = computed(() => {
  const plan = apiMicroCompactEditPlan.value || {}
  if (!plan.schema || plan.status === 'empty') return 'waiting'
  if (plan.status === 'fail' || (plan.gaps || []).some(gap => gap.severity === 'fatal')) return 'fail'
  if (plan.status === 'warn' || (plan.gaps || []).length) return 'warn'
  return 'ok'
})
const apiMicroCompactEditPlanCards = computed(() => {
  const plan = apiMicroCompactEditPlan.value || {}
  return [
    { label: 'edits', value: plan.editCount || 0, note: plan.recommended ? 'recommended' : 'advisory' },
    { label: 'tokens', value: plan.activeTokens || 0, note: `trigger ${formatNumber(plan.trigger?.value || plan.maxInputTokens || 0)}` },
    { label: 'target', value: plan.targetInputTokens || 0, note: `clear ${formatNumber(plan.clearAtLeastTokens || 0)}` },
    { label: 'thinking', value: plan.thinkingBlocks || 0, note: 'blocks' },
    { label: 'tool use', value: plan.toolUses || 0, note: `results ${plan.toolResults || 0}` },
    { label: 'legacy', value: plan.inferredFromLegacy ? 'yes' : 'no', note: plan.stored ? 'stored plan' : 'inferred' }
  ]
})
const apiMicroCompactEditPlanRows = computed(() => {
  const plan = apiMicroCompactEditPlan.value || {}
  return (plan.strategies || []).slice(0, 8)
})
const apiMicroCompactEditPlanGaps = computed(() => {
  const plan = apiMicroCompactEditPlan.value || {}
  return (plan.gaps || []).slice(0, 6)
})
const apiMicrocompactReceiptDisciplineState = computed(() => {
  const discipline = apiMicrocompactReceiptDiscipline.value || {}
  if (!discipline.schema || discipline.status === 'empty') return 'waiting'
  return discipline.status || 'waiting'
})
const apiMicrocompactReceiptDisciplineCards = computed(() => {
  const discipline = apiMicrocompactReceiptDiscipline.value || {}
  return [
    { label: 'checked', value: discipline.checked || 0, note: `passed ${discipline.passed || 0}` },
    { label: 'missing', value: discipline.missing || 0, note: discipline.status || 'waiting' },
    { label: 'score', value: discipline.score ?? '—', suffix: discipline.score !== null && discipline.score !== undefined ? '%' : '', note: 'receipt' },
    { label: 'advisory', value: discipline.advisory || 0, note: `native ${discipline.nativeApplied || 0}` },
    { label: 'session gap', value: discipline.sessionMismatch || 0, note: 'binding' },
    { label: 'ignored', value: discipline.ignored || 0, note: 'declared' },
    { label: 'tasks', value: discipline.checkedTaskCount || 0, note: `${discipline.taskCount || 0} total` }
  ]
})
const apiMicrocompactReceiptDisciplineRows = computed(() => {
  const discipline = apiMicrocompactReceiptDiscipline.value || {}
  return (discipline.rows || []).slice(0, 8)
})
const apiMicrocompactReceiptDisciplineGaps = computed(() => {
  const discipline = apiMicrocompactReceiptDiscipline.value || {}
  return (discipline.gaps || []).slice(0, 6)
})
const apiMicrocompactNativeApplyReadinessState = computed(() => {
  const readiness = apiMicrocompactNativeApplyReadiness.value || {}
  if (!readiness.schema || readiness.status === 'empty') return 'waiting'
  return readiness.status || 'waiting'
})
const apiMicrocompactNativeApplyReadinessCards = computed(() => {
  const readiness = apiMicrocompactNativeApplyReadiness.value || {}
  return [
    { label: 'checked', value: readiness.checked || 0, note: `passed ${readiness.passed || 0}` },
    { label: 'native ready', value: readiness.nativeReady || 0, note: 'provider API' },
    { label: 'advisory', value: readiness.advisory || 0, note: 'CLI / unsupported' },
    { label: 'session bound', value: readiness.sessionBound || 0, note: 'per run' },
    { label: 'invalid', value: readiness.missing || 0, note: readiness.status || 'waiting' },
    { label: 'score', value: readiness.score ?? '—', suffix: readiness.score !== null && readiness.score !== undefined ? '%' : '', note: 'contract' }
  ]
})
const apiMicrocompactNativeApplyReadinessRows = computed(() => {
  const readiness = apiMicrocompactNativeApplyReadiness.value || {}
  return (readiness.rows || []).slice(0, 8)
})
const apiMicrocompactNativeApplyReadinessGaps = computed(() => {
  const readiness = apiMicrocompactNativeApplyReadiness.value || {}
  return (readiness.gaps || []).slice(0, 6)
})
const apiMicrocompactNativeApplyProofState = computed(() => {
  const proof = apiMicrocompactNativeApplyProof.value || {}
  if (!proof.schema || proof.status === 'empty') return 'waiting'
  return proof.status || 'waiting'
})
const apiMicrocompactNativeApplyProofCards = computed(() => {
  const proof = apiMicrocompactNativeApplyProof.value || {}
  const adapterMatched = proof.requestTelemetryAdapterMatchedCount || 0
  const receiptMatched = proof.requestTelemetryReceiptMatchedCount || 0
  const strong = proof.requestTelemetryStrongCount || 0
  const stale = proof.requestTelemetryStaleCount || 0
  const receiptOnly = proof.requestTelemetryReceiptOnlyCount || 0
  const sessionBound = proof.requestTelemetrySessionBoundCount || 0
  const sessionMismatch = proof.requestTelemetrySessionMismatchCount || 0
  const dispatchBound = proof.requestTelemetryDispatchBoundCount || 0
  const dispatchUnbound = proof.requestTelemetryDispatchUnboundCount || 0
  const runnerBound = proof.requestTelemetryRunnerBoundCount || 0
  const runnerMissing = proof.requestTelemetryRunnerMissingCount || 0
  const runnerMismatch = proof.requestTelemetryRunnerMismatchCount || 0
  return [
    { label: 'checked', value: proof.checked || 0, note: `passed ${proof.passed || 0}` },
    { label: 'strong', value: strong, note: 'fresh + bound' },
    { label: 'telemetry', value: proof.requestTelemetryMatchedCount || 0, note: `adapter ${adapterMatched} · receipt ${receiptMatched}` },
    { label: 'adapter', value: adapterMatched, note: `fresh ${strong}` },
    { label: 'session', value: sessionBound, note: `mismatch ${sessionMismatch}` },
    { label: 'dispatch', value: dispatchBound, note: `unbound ${dispatchUnbound}` },
    { label: 'runner', value: runnerBound, note: `missing ${runnerMissing} · mismatch ${runnerMismatch}` },
    { label: 'weak', value: receiptOnly + stale, note: `receipt ${receiptOnly} · stale ${stale}` },
    { label: 'failed', value: proof.failedProofCount || 0, note: 'bad claim' },
    { label: 'missing', value: (proof.missingProofCount || 0) + (proof.requestTelemetryInvalidCount || 0) + (proof.requestTelemetryMissingCount || 0) + sessionMismatch + dispatchUnbound, note: 'proof / binding' },
    { label: 'ledger', value: proof.ledgerEntryCount || 0, note: proof.requestTelemetryLedgerFile || proof.ledgerFile || 'sidecar' },
    { label: 'score', value: proof.score ?? '—', suffix: proof.score !== null && proof.score !== undefined ? '%' : '', note: proof.status || 'proof' }
  ]
})
const apiMicrocompactNativeApplyProofRows = computed(() => {
  const proof = apiMicrocompactNativeApplyProof.value || {}
  return (proof.rows || []).slice(0, 8)
})
const apiMicrocompactNativeApplyProofGaps = computed(() => {
  const proof = apiMicrocompactNativeApplyProof.value || {}
  return (proof.gaps || []).slice(0, 6)
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
const semanticRecallScoring = computed(() => postCompactUsage.value?.typedMemory?.semanticRecallScoring || {})
const semanticRecallRows = computed(() => [
  ...(postCompactUsage.value?.typedMemory?.semanticConflictDocs || []).map(row => ({ ...row, kind: 'conflict' })),
  ...(postCompactUsage.value?.typedMemory?.semanticDuplicateDocs || []).map(row => ({ ...row, kind: 'duplicate' })),
  ...(postCompactUsage.value?.typedMemory?.semanticBoostedDocs || []).map(row => ({ ...row, kind: 'boosted' }))
])
const typedMemoryConsumptionScoring = computed(() => postCompactUsage.value?.typedMemory?.typedMemoryConsumptionScoring || {})
const typedMemoryConsumptionLedger = computed(() => postCompactUsage.value?.typedMemory?.consumptionLedger || null)
const typedMemoryStaleCandidateLedger = computed(() => postCompactUsage.value?.typedMemory?.staleCandidateLedger || null)
const typedMemoryStaleCandidates = computed(() => typedMemoryStaleCandidateLedger.value?.candidates || [])
const pendingTypedMemoryStaleCandidates = computed(() => typedMemoryStaleCandidates.value.filter(candidate => candidate.status === 'pending'))
const typedMemoryWriteAdmission = computed(() => postCompactUsage.value?.typedMemory?.writeAdmission || null)
const typedMemoryDirectOperations = computed(() => postCompactUsage.value?.typedMemory?.directOperations || null)
const typedMemoryDistillationTransaction = computed(() => postCompactUsage.value?.typedMemory?.distillationTransaction || null)
const typedMemoryDistillationPreflight = computed(() => postCompactUsage.value?.typedMemory?.distillationPreflight || null)
const typedMemoryArtifactTransaction = computed(() => postCompactUsage.value?.typedMemory?.artifactTransaction || null)
const typedMemoryEntrypoint = computed(() => postCompactUsage.value?.typedMemory?.entrypoint || null)
const typedMemoryDirectOperationCards = computed(() => {
  const direct = typedMemoryDirectOperations.value || {}
  return [
    { label: '当前有效', value: direct.activeDirectMemoryCount || 0, note: '当前 gcs 会话' },
    { label: '本轮记住', value: direct.rememberedThisRun || 0, note: '确定性提交' },
    { label: '本轮忘记', value: direct.forgottenThisRun || 0, note: `tombstone ${direct.tombstoneCount || 0}` },
    { label: '重复请求', value: direct.duplicateThisRun || 0, note: '复用稳定记忆 ID' },
    { label: '拒绝操作', value: direct.rejectedThisRun || 0, note: '歧义或证明失败' },
    { label: '阻止复活', value: direct.tombstoneSuppressedFactCountThisRun || 0, note: '后台重扫已跳过' },
  ]
})
const typedMemoryWriteAdmissionCards = computed(() => {
  const admission = typedMemoryWriteAdmission.value || {}
  return [
    { label: '原始候选', value: admission.evaluatedThisRun || 0, note: '本轮代码级评估' },
    { label: '准入长期记忆', value: admission.admittedThisRun || 0, note: '跨会话且非流水' },
    { label: '拒绝流水', value: admission.rejectedThisRun || 0, note: `hard ${admission.hardExclusionThisRun || 0}` },
    { label: '清退旧噪声', value: admission.evictedExistingFactCount || 0, note: '同步移除陈旧 Markdown' },
    { label: '拒绝观察', value: admission.observationCount || 0, note: '仅元数据审计' },
    { label: '活动流水', value: admission.reasonCounts?.activity_log_noise || 0, note: 'PR / Git / 周报' },
    { label: '正向确认', value: admission.positiveConfirmationAdmittedCount || 0, note: `候选 ${admission.positiveConfirmationCandidateCount || 0}` },
    { label: '无效确认', value: admission.positiveConfirmationRejectedCount || 0, note: `绑定异常 ${admission.positiveConfirmationInvalidBindingCount || 0}` },
    { label: '活动正向记忆', value: admission.positiveFeedbackActiveCount || 0, note: '当前可注入' },
    { label: '已撤回', value: admission.positiveFeedbackRevokedCount || 0, note: `无效撤回 ${admission.positiveFeedbackLifecycleRejectedThisRun || 0}` },
    { label: '已替代', value: admission.positiveFeedbackSupersededCount || 0, note: `当前源证明 ${admission.positiveFeedbackCurrentSourceProofCount || 0}` },
    { label: '撤回绑定异常', value: admission.positiveFeedbackLifecycleInvalidBindingThisRun || 0, note: '不记录被拒绝正文' },
  ]
})
const typedMemoryConsumptionCards = computed(() => {
  const scoring = typedMemoryConsumptionScoring.value
  const ledger = typedMemoryConsumptionLedger.value || {}
  const totals = ledger.totals || {}
  return [
    { label: '可信记录', value: ledger.validEntryCount || 0, note: `原始 ${ledger.rawEntryCount || 0}` },
    { label: 'used', value: totals.used || 0, note: '已用于子 Agent 任务' },
    { label: 'verified', value: totals.verified || 0, note: '服务端复算当前源' },
    { label: 'ignored', value: totals.ignored || 0, note: '明确未采用' },
    { label: '当前源证明', value: ledger.proofVerifiedEntryCount || 0, note: `降级 ${ledger.downgradedVerifiedEntryCount || 0}` },
    { label: '异常声明', value: ledger.anomalyEntryCount || 0, note: `平均置信度 ${Number(ledger.averageEvidenceConfidence || 0).toFixed(2)}` },
    { label: 'stale', value: ledger.staleEntryCount || 0, note: `${scoring.stale_after_days || 90} 天后失效` },
    { label: '无效', value: ledger.invalidEntryCount || 0, note: ledger.checksumValid === false ? '账本校验失败' : '条目校验失败' },
    { label: '加权', value: scoring.boosted_count || 0, note: `降权 ${scoring.deprioritized_count || 0}` },
    { label: '冲突', value: scoring.conflict_count || 0, note: '本轮重新判断' }
  ]
})
const typedMemoryConsumptionRows = computed(() => [
  ...(postCompactUsage.value?.typedMemory?.consumptionConflictDocs || []).map(row => ({ ...row, kind: 'conflict' })),
  ...(postCompactUsage.value?.typedMemory?.consumptionDeprioritizedDocs || []).map(row => ({ ...row, kind: 'deprioritized' })),
  ...(postCompactUsage.value?.typedMemory?.consumptionBoostedDocs || []).map(row => ({ ...row, kind: 'boosted' }))
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
const formatBytes = value => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
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

const replaySessionMemoryExtraction = async (event) => {
  const executionId = String(event?.executionId || '')
  const scopeId = String(event?.scopeId || '')
  if (!executionId || !scopeId) return
  sessionMemoryReplayLoading.value = executionId
  try {
    const data = await requestJson(`/api/memory-center/session-memory-extraction-replay?scope_id=${encodeURIComponent(scopeId)}&execution_id=${encodeURIComponent(executionId)}`)
    sessionMemoryReplayResult.value = data.replay || null
    if (data.replay?.pass) toast.success('提炼证据重放通过')
    else toast.error('提炼证据重放未通过')
  } catch (error) {
    sessionMemoryReplayResult.value = null
    toast.error(error.message || '提炼证据重放失败')
  } finally {
    sessionMemoryReplayLoading.value = ''
  }
}

const loadContextSettings = async () => {
  contextSettingsLoading.value = true
  try {
    const [data, capacityData, retentionData, capabilityData] = await Promise.all([
      requestJson('/api/orchestrator/config'),
      requestJson('/api/groups/memory/capacity'),
      requestJson('/api/groups/sessions/maintenance'),
      requestJson('/api/groups/memory/capabilities')
    ])
    const config = data.config || {}
    modelCapacityStatus.value = capacityData || null
    sessionRetentionStatus.value = retentionData.status || null
    modelCapabilityEntries.value = capabilityData.entries || []
    modelCapabilityRefreshPlan.value = capabilityData.refreshPlan || null
    modelCapabilityRefreshStatus.value = capabilityData.refreshStatus || null
    modelCapabilityRefreshOutcomeLedger.value = capabilityData.refreshOutcomeLedger || null
    invalidModelCapabilityRefreshOutcomes.value = capabilityData.invalidRefreshOutcomes || { outcomes: [], pendingAcknowledgementCount: 0, acknowledgedCount: 0 }
    modelCapabilityDowngradeAlerts.value = capabilityData.downgradeAlerts || []
    contextSettings.value = {
      memoryContextPreset: config.memoryContextPreset || 'default',
      modelContextWindow: Number(config.modelContextWindow || 0),
      modelAutoCompactTokenLimit: Number(config.modelAutoCompactTokenLimit || 0),
      typedMemoryDeliveryMaxDocuments: Number(config.typedMemoryDeliveryMaxDocuments || 5),
      typedMemoryDeliveryMaxBytesPerDocument: Number(config.typedMemoryDeliveryMaxBytesPerDocument || 4096),
      typedMemoryDeliveryMaxLinesPerDocument: Number(config.typedMemoryDeliveryMaxLinesPerDocument || 200),
      typedMemoryDeliveryMaxSessionBytes: Number(config.typedMemoryDeliveryMaxSessionBytes || 61440),
      typedMemoryDeliveryMaxTokens: Number(config.typedMemoryDeliveryMaxTokens || 5000),
      groupSessionRetentionDays: Number(config.groupSessionRetentionDays || 30),
      groupSessionMaxArchived: Number(config.groupSessionMaxArchived || 20),
      groupSessionAutoPruneEnabled: config.groupSessionAutoPruneEnabled === true,
      groupSessionRetentionIntervalHours: Number(config.groupSessionRetentionIntervalHours || 24),
      groupSessionArtifactAutoArchiveEnabled: config.groupSessionArtifactAutoArchiveEnabled !== false,
      groupSessionArtifactHotExecutions: Number(config.groupSessionArtifactHotExecutions || 50),
      groupSessionArtifactMaxHotMb: Number(config.groupSessionArtifactMaxHotMb || 64),
      groupSessionArtifactMaxAgeDays: Number(config.groupSessionArtifactMaxAgeDays || 30)
    }
  } finally {
    contextSettingsLoading.value = false
  }
}

const saveModelCapability = async () => {
  const setting = modelCapabilitySetting.value
  const provider = String(setting.provider || '').trim()
  const contextWindow = Number(setting.contextWindow || 0)
  const maxOutputTokens = Number(setting.maxOutputTokens || 0)
  if (!provider) return toast.error('请填写 provider，例如 codex、cursor 或 claudecode')
  if (!Number.isFinite(contextWindow) || contextWindow < 32000 || contextWindow > 4000000) return toast.error('上下文窗口必须介于 32,000 和 4,000,000 token')
  if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16000) return toast.error('最大输出 token 与上下文窗口不兼容')
  modelCapabilitySaving.value = true
  try {
    await requestJson('/api/groups/memory/capabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'user_setting',
        provider,
        model: String(setting.model || '').trim(),
        contextWindow,
        maxOutputTokens,
        checkedAt: new Date().toISOString()
      })
    })
    await loadContextSettings()
    toast.success('Provider 模型容量已保存')
  } catch (error) {
    toast.error(error.message || '保存 Provider 模型容量失败')
  } finally {
    modelCapabilitySaving.value = false
  }
}

const revokeModelCapability = async entry => {
  if (!await confirmDialog(`撤销 ${entry.provider}${entry.model ? ` / ${entry.model}` : ''} 的容量证据？`)) return
  try {
    await requestJson('/api/groups/memory/capabilities/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceId: entry.evidenceId, reason: 'memory_center_manual_revocation' })
    })
    await loadContextSettings()
    toast.success('容量证据已撤销')
  } catch (error) {
    toast.error(error.message || '撤销容量证据失败')
  }
}

const runModelCapabilityMaintenance = async execute => {
  if (modelCapabilityMaintenanceRunning.value) return
  if (execute && !await confirmDialog('清理已过期或已撤销超过 30 天的容量证据？')) return
  modelCapabilityMaintenanceRunning.value = true
  try {
    const data = await requestJson('/api/groups/memory/capabilities/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: !execute, explicitExecution: execute, retentionDays: 30 })
    })
    await loadContextSettings()
    toast.success(execute ? `已清理 ${data.result?.deletedCount || 0} 条证据` : `发现 ${data.result?.candidateCount || 0} 条清理候选`)
  } catch (error) {
    toast.error(error.message || '容量缓存维护失败')
  } finally {
    modelCapabilityMaintenanceRunning.value = false
  }
}

const acknowledgeInvalidRefreshOutcome = async outcome => {
  if (invalidRefreshOutcomeAcknowledging.value) return
  if (!await confirmDialog(`确认已检查隔离记录 ${outcome.originalFileName || outcome.invalidOutcomeId}？取证文件会继续保留。`)) return
  invalidRefreshOutcomeAcknowledging.value = outcome.invalidOutcomeId
  try {
    const data = await requestJson('/api/groups/memory/capabilities/invalid-outcomes/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidOutcomeId: outcome.invalidOutcomeId, note: 'acknowledged_in_memory_center' })
    })
    invalidModelCapabilityRefreshOutcomes.value = data.invalidRefreshOutcomes || invalidModelCapabilityRefreshOutcomes.value
    await loadContextSettings()
    toast.success('隔离记录已确认，取证材料仍保留')
  } catch (error) {
    toast.error(error.message || '确认隔离记录失败')
  } finally {
    invalidRefreshOutcomeAcknowledging.value = ''
  }
}

const selectContextPreset = preset => {
  contextSettings.value.memoryContextPreset = preset.id
  if (preset.id !== 'custom') {
    contextSettings.value.modelContextWindow = preset.window
    contextSettings.value.modelAutoCompactTokenLimit = preset.threshold
  }
}

const saveContextSettings = async () => {
  const settings = contextSettings.value
  const windowTokens = Number(settings.modelContextWindow || 0)
  const thresholdTokens = Number(settings.modelAutoCompactTokenLimit || 0)
  if (settings.memoryContextPreset === 'custom') {
    if (!Number.isFinite(windowTokens) || windowTokens < 32000) return toast.error('上下文窗口不能小于 32,000 token')
    if (!Number.isFinite(thresholdTokens) || thresholdTokens < 18000 || thresholdTokens >= windowTokens - 3000) {
      return toast.error('自动压缩阈值需大于等于 18,000，并至少比上下文窗口低 3,000 token')
    }
  }
  if (Number(settings.groupSessionArtifactHotExecutions || 0) < 2 || Number(settings.groupSessionArtifactHotExecutions || 0) > 1000) return toast.error('热抽取记录数必须介于 2 和 1000')
  if (Number(settings.groupSessionArtifactMaxHotMb || 0) < 1 || Number(settings.groupSessionArtifactMaxHotMb || 0) > 10240) return toast.error('抽取制品热存储必须介于 1 和 10240 MB')
  if (Number(settings.groupSessionArtifactMaxAgeDays || 0) < 1 || Number(settings.groupSessionArtifactMaxAgeDays || 0) > 3650) return toast.error('抽取制品热存储天数必须介于 1 和 3650 天')
  if (Number(settings.typedMemoryDeliveryMaxDocuments || 0) < 1 || Number(settings.typedMemoryDeliveryMaxDocuments || 0) > 5) return toast.error('每轮记忆文件数必须介于 1 和 5')
  if (Number(settings.typedMemoryDeliveryMaxBytesPerDocument || 0) < 512 || Number(settings.typedMemoryDeliveryMaxBytesPerDocument || 0) > 4096) return toast.error('单份记忆容量必须介于 512 和 4096 bytes')
  if (Number(settings.typedMemoryDeliveryMaxLinesPerDocument || 0) < 10 || Number(settings.typedMemoryDeliveryMaxLinesPerDocument || 0) > 200) return toast.error('单份记忆行数必须介于 10 和 200 行')
  if (Number(settings.typedMemoryDeliveryMaxSessionBytes || 0) < 4096 || Number(settings.typedMemoryDeliveryMaxSessionBytes || 0) > 61440) return toast.error('单个压缩周期容量必须介于 4096 和 61440 bytes')
  if (Number(settings.typedMemoryDeliveryMaxTokens || 0) < 500 || Number(settings.typedMemoryDeliveryMaxTokens || 0) > 20000) return toast.error('记忆投递 token 必须介于 500 和 20000')
  contextSettingsSaving.value = true
  try {
    const data = await requestJson('/api/orchestrator/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoryContextPreset: settings.memoryContextPreset,
        modelContextWindow: windowTokens,
        modelAutoCompactTokenLimit: thresholdTokens,
        typedMemoryDeliveryMaxDocuments: Number(settings.typedMemoryDeliveryMaxDocuments || 5),
        typedMemoryDeliveryMaxBytesPerDocument: Number(settings.typedMemoryDeliveryMaxBytesPerDocument || 4096),
        typedMemoryDeliveryMaxLinesPerDocument: Number(settings.typedMemoryDeliveryMaxLinesPerDocument || 200),
        typedMemoryDeliveryMaxSessionBytes: Number(settings.typedMemoryDeliveryMaxSessionBytes || 61440),
        typedMemoryDeliveryMaxTokens: Number(settings.typedMemoryDeliveryMaxTokens || 5000),
        groupSessionRetentionDays: Number(settings.groupSessionRetentionDays || 30),
        groupSessionMaxArchived: Number(settings.groupSessionMaxArchived || 20),
        groupSessionAutoPruneEnabled: settings.groupSessionAutoPruneEnabled === true,
        groupSessionRetentionIntervalHours: Number(settings.groupSessionRetentionIntervalHours || 24),
        groupSessionArtifactAutoArchiveEnabled: settings.groupSessionArtifactAutoArchiveEnabled === true,
        groupSessionArtifactHotExecutions: Number(settings.groupSessionArtifactHotExecutions || 50),
        groupSessionArtifactMaxHotMb: Number(settings.groupSessionArtifactMaxHotMb || 64),
        groupSessionArtifactMaxAgeDays: Number(settings.groupSessionArtifactMaxAgeDays || 30)
      })
    })
    const config = data.config || {}
    contextSettings.value = {
      memoryContextPreset: config.memoryContextPreset || 'default',
      modelContextWindow: Number(config.modelContextWindow || 0),
      modelAutoCompactTokenLimit: Number(config.modelAutoCompactTokenLimit || 0),
      typedMemoryDeliveryMaxDocuments: Number(config.typedMemoryDeliveryMaxDocuments || 5),
      typedMemoryDeliveryMaxBytesPerDocument: Number(config.typedMemoryDeliveryMaxBytesPerDocument || 4096),
      typedMemoryDeliveryMaxLinesPerDocument: Number(config.typedMemoryDeliveryMaxLinesPerDocument || 200),
      typedMemoryDeliveryMaxSessionBytes: Number(config.typedMemoryDeliveryMaxSessionBytes || 61440),
      typedMemoryDeliveryMaxTokens: Number(config.typedMemoryDeliveryMaxTokens || 5000),
      groupSessionRetentionDays: Number(config.groupSessionRetentionDays || 30),
      groupSessionMaxArchived: Number(config.groupSessionMaxArchived || 20),
      groupSessionAutoPruneEnabled: config.groupSessionAutoPruneEnabled === true,
      groupSessionRetentionIntervalHours: Number(config.groupSessionRetentionIntervalHours || 24),
      groupSessionArtifactAutoArchiveEnabled: config.groupSessionArtifactAutoArchiveEnabled !== false,
      groupSessionArtifactHotExecutions: Number(config.groupSessionArtifactHotExecutions || 50),
      groupSessionArtifactMaxHotMb: Number(config.groupSessionArtifactMaxHotMb || 64),
      groupSessionArtifactMaxAgeDays: Number(config.groupSessionArtifactMaxAgeDays || 30)
    }
    await loadContextSettings()
    toast.success('上下文与压缩阈值已保存')
  } catch (error) {
    toast.error(error.message || '保存上下文设置失败')
  } finally {
    contextSettingsSaving.value = false
  }
}

const runSessionRetentionMaintenance = async execute => {
  if (sessionRetentionRunning.value) return
  if (execute && !await confirmDialog('执行归档会话清理？只会处理超过保留期限或数量上限的归档会话，未完成任务会阻止删除。')) return
  sessionRetentionRunning.value = true
  try {
    const data = await requestJson('/api/groups/sessions/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: !execute, explicitExecution: execute })
    })
    sessionRetentionStatus.value = data.status || null
    toast.success(execute ? `归档清理完成：删除 ${data.status?.deletedCount || 0}` : `清理预览完成：候选 ${data.status?.candidateCount || 0}`)
  } catch (error) {
    toast.error(error.message || '会话保留维护失败')
  } finally {
    sessionRetentionRunning.value = false
  }
}

const runSessionMemoryArtifactRetention = async (row, execute) => {
  const scopeId = `${row.groupId}::${row.groupSessionId}`
  if (sessionMemoryArtifactRetentionRunning.value) return
  if (execute && !await confirmDialog(`归档会话 ${row.groupSessionId} 的旧模型抽取制品？历史链和回放能力会保留。`)) return
  sessionMemoryArtifactRetentionRunning.value = scopeId
  try {
    const data = await requestJson('/api/memory-center/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'group',
        scope_id: scopeId,
        operation: 'retain_model_extraction_artifacts',
        reason: execute ? '用户在记忆中心执行模型抽取制品冷归档' : '用户在记忆中心预览模型抽取制品冷归档',
        dryRun: !execute,
        explicitExecution: execute
      })
    })
    sessionMemoryArtifactRetentionResult.value = { scopeId, ...(data.result || {}) }
    toast.success(execute
      ? `已归档 ${data.result?.archivedThisRun || 0} 个抽取制品`
      : `发现 ${data.result?.candidateExecutionCount || 0} 次抽取可归档`)
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '模型抽取制品维护失败')
  } finally {
    sessionMemoryArtifactRetentionRunning.value = ''
  }
}

const retrySessionMemoryTypedCommit = async row => {
  const scopeId = `${row.groupId}::${row.groupSessionId}`
  if (sessionMemoryTypedRetryRunning.value) return
  if (!await confirmDialog(`立即重试会话 ${row.groupSessionId} 的 typed-memory 提交？只会重放已签名抽取制品，不会重新调用模型。`)) return
  sessionMemoryTypedRetryRunning.value = scopeId
  try {
    const data = await requestJson('/api/memory-center/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'group',
        scope_id: scopeId,
        operation: 'retry_model_extraction_typed_memory',
        reason: '用户在记忆中心手动重试模型 extraction typed-memory 提交',
        explicitExecution: true
      })
    })
    toast.success(`重试完成：恢复 ${data.result?.recoveredCount || 0}，失败 ${data.result?.failedCount || 0}`)
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || 'typed-memory 提交重试失败')
  } finally {
    sessionMemoryTypedRetryRunning.value = ''
  }
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

const loadDispatchRecovery = async (showToast = false) => {
  dispatchRecoveryLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/dispatch-recovery?limit=300')
    dispatchRecovery.value = data.inventory || { summary: {}, rows: [] }
    if (showToast) toast.success('派发恢复证据已刷新')
  } catch (error) {
    if (showToast) toast.error(error.message || '读取派发恢复证据失败')
  } finally {
    dispatchRecoveryLoading.value = false
  }
}

const openDispatchResolve = (row, action) => {
  dispatchResolveState.value = {
    row,
    action,
    reason: action === 'retry_recovery' ? 'Memory Center 使用强证据重试恢复'
      : action === 'acknowledge_uncertain' ? '人工确认该派发结果无法安全推断'
        : action === 'cancel_prepared' ? '取消尚未启动的子 Agent 派发'
          : '清理已完成保留期审计的终态派发证据'
  }
}

const submitDispatchResolve = async () => {
  const state = dispatchResolveState.value
  if (!state?.reason?.trim() || dispatchResolveLoading.value) return
  dispatchResolveLoading.value = true
  try {
    const row = state.row
    const data = await requestJson('/api/memory-center/dispatch-recovery/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: state.action,
        ticketId: row.ticketId,
        ticketChecksum: row.ticketChecksum,
        recordChecksum: row.recordChecksum,
        runnerRequestId: row.runnerRequestId || '',
        requestChecksum: row.direct?.requestChecksum || '',
        transcriptHeadChecksum: row.direct?.transcript?.headChecksum || '',
        explicitConfirmation: true,
        actor: 'memory-center',
        reason: state.reason.trim()
      })
    })
    dispatchRecovery.value = data.inventory || dispatchRecovery.value
    dispatchResolveState.value = null
    toast.success(dispatchActionLabel(state.action) + '已完成')
  } catch (error) {
    toast.error(error.message || '派发恢复操作失败')
  } finally {
    dispatchResolveLoading.value = false
  }
}

const toggleDispatchTranscript = row => {
  const id = row.ticketId || row.runnerRequestId
  expandedDispatchId.value = expandedDispatchId.value === id ? '' : id
}

const loadOverview = async (preserveSelection = true) => {
  loading.value = true
  try {
    await loadContextSettings()
    overview.value = await requestJson('/api/memory-center/overview')
    await loadDispatchRecovery(false)
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

const operationTitle = operation => {
  if (operation === 'compact') return '手动压缩'
  if (operation === 'rebuild') return '从原始数据重建'
  if (operation === 'disable') return '禁用全局记忆'
  if (operation === 'enable') return '启用全局记忆'
  if (operation === 'block_pattern') return '添加禁记规则'
  if (operation === 'archive_selftest_residue') return '归档自测残留'
  if (operation === 'prune_task_agent_memory_context_snapshots') return '清理子 Agent 记忆快照'
  return '从备份回滚'
}

const operationNote = operation => {
  if (operation === 'compact') return '按照当前压缩边界收敛上下文，不删除加密原始转录。'
  if (operation === 'rebuild') return '忽略旧摘要边界，从加密原始转录重新生成全局记忆。'
  if (operation === 'disable') return '停止新的长期记忆写入与提取，已有记忆仍可查看和删除。'
  if (operation === 'enable') return '恢复长期记忆写入、压缩和按需召回。'
  if (operation === 'block_pattern') return '匹配此文本或正则表达式的内容不会进入长期记忆。'
  if (operation === 'archive_selftest_residue') return '只移动 Global Agent memory 目录里的历史自测残留，不处理 active memory 或 active backup。'
  if (operation === 'prune_task_agent_memory_context_snapshots') return '按 retention 预案清理过期或孤儿 task Agent 记忆上下文快照，不触碰最新会话快照。'
  return '使用最近有效备份替换主记忆，并保留回滚前快照。'
}

const openOperation = operation => {
  operationState.value = {
    operation,
    reason: operation === 'archive_selftest_residue'
      ? 'Memory Center 归档 Global Agent 自测残留'
      : operation === 'prune_task_agent_memory_context_snapshots'
        ? 'Memory Center 清理过期 task Agent 记忆上下文快照'
        : '',
    pattern: ''
  }
}

const removeBlockedPattern = async pattern => {
  operationState.value = { operation: 'remove_block_pattern', reason: '用户删除禁记规则', pattern }
  await runOperation()
}

const runGlobalSelftestResidueArchive = async (dryRun = true, reason = '') => {
  if (selftestResidueArchiveLoading.value) return
  selftestResidueArchiveLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'global',
        scope_id: 'global-agent',
        operation: 'archive_selftest_residue',
        dryRun,
        actor: 'memory-center',
        reason: reason || (dryRun ? 'Memory Center 预演 Global Agent 自测残留归档' : 'Memory Center 归档 Global Agent 自测残留')
      })
    })
    selftestResidueArchiveResult.value = data.result || null
    if (!dryRun) operationState.value = null
    toast.success(dryRun
      ? `预演完成：可归档 ${data.result?.archivedCount || 0} 个残留文件`
      : `归档完成：已移动 ${data.result?.archivedCount || 0} 个残留文件`)
    await refreshQualityCheck('global_memory_selftest_contamination')
    if (!dryRun) await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '自测残留归档失败')
  } finally {
    selftestResidueArchiveLoading.value = false
  }
}

const runTaskAgentSnapshotRetention = async (dryRun = true, reason = '') => {
  if (taskAgentSnapshotRetentionLoading.value) return
  taskAgentSnapshotRetentionLoading.value = true
  try {
    const scopedToGroup = selectedScope.value === 'group' && selectedId.value
    const data = await requestJson('/api/memory-center/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: scopedToGroup ? 'group' : 'global',
        scope_id: scopedToGroup ? selectedId.value : 'global-agent',
        group_id: scopedToGroup ? selectedId.value : '',
        operation: 'prune_task_agent_memory_context_snapshots',
        dryRun,
        actor: 'memory-center',
        reason: reason || (dryRun ? 'Memory Center 预演 task Agent 记忆上下文快照清理' : 'Memory Center 清理过期 task Agent 记忆上下文快照')
      })
    })
    taskAgentSnapshotRetentionResult.value = data.result || null
    if (!dryRun) operationState.value = null
    toast.success(dryRun
      ? `预演完成：可清理 ${data.result?.candidateCount || 0} 个快照`
      : `清理完成：已处理 ${data.result?.prunedCount || 0} 个快照`)
    await refreshQualityCheck('task_agent_memory_context_snapshots')
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || 'task Agent 记忆快照清理失败')
  } finally {
    taskAgentSnapshotRetentionLoading.value = false
  }
}

const runOperation = async () => {
  const state = operationState.value
  if (!state) return
  if (state.operation === 'rollback') {
    const ok = await confirmDialog('回滚会用最近有效备份替换当前记忆，同时保留回滚前快照。确定继续？')
    if (!ok) return
  }
  if (state.operation === 'archive_selftest_residue') {
    await runGlobalSelftestResidueArchive(false, state.reason)
    return
  }
  if (state.operation === 'prune_task_agent_memory_context_snapshots') {
    await runTaskAgentSnapshotRetention(false, state.reason)
    return
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

const updateReplayRepairWorkItemForGroup = async (groupId, item, action) => {
  if (!groupId) return toast.info('Replay 修复工作项缺少群聊 ID')
  const itemId = item.id || item.work_item_id
  if (!itemId) return toast.error('缺少 work item id')
  const payload = {
    group_id: groupId,
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
    if (selectedScope.value === 'group' && selectedId.value === groupId) await loadDetail()
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || 'Replay 修复工作项更新失败')
  }
}

const updateReplayRepairWorkItem = async (item, action) => {
  if (selectedScope.value !== 'group') return toast.info('Replay 修复工作项只属于群聊记忆')
  await updateReplayRepairWorkItemForGroup(selectedId.value, item, action)
}

const resolveTypedMemoryStaleCandidate = async (candidate, action) => {
  if (selectedScope.value !== 'group') return toast.info('陈旧记忆候选只属于群聊会话')
  const actionLabel = action === 'reject' ? '拒绝候选' : action === 'confirm_remove' ? '确认删除旧记忆' : '确认更新记忆'
  const reason = window.prompt(`${actionLabel}原因`, candidate.conflictReason || '')
  if (reason === null) return
  if (!reason.trim()) return toast.info('确认或拒绝候选必须填写原因')
  const confirmed = await confirmDialog(`${actionLabel}：${candidate.relPath}。该操作只影响当前群聊会话，确定继续？`)
  if (!confirmed) return
  try {
    await requestJson('/api/memory-center/stale-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope_id: selectedId.value,
        candidate_id: candidate.candidateId,
        candidate_checksum: candidate.candidateChecksum,
        action,
        reason: reason.trim(),
        actor: 'memory-center-user',
        explicit_confirmation: true
      })
    })
    toast.success(action === 'reject' ? '候选已拒绝，长期记忆未变更' : action === 'confirm_remove' ? '旧记忆已从当前会话召回中移除' : '旧记忆已替换为确认后的新版本')
    await loadDetail()
  } catch (error) {
    toast.error(error.message || '陈旧记忆候选处理失败')
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

    <section class="context-capacity-panel aura-card">
      <div class="context-capacity-head">
        <div>
          <div class="eyebrow">MODEL CONTEXT POLICY</div>
          <h3>上下文与压缩阈值</h3>
        </div>
        <div class="context-capacity-actions">
          <button class="btn btn-outline" :disabled="contextSettingsLoading" @click="loadContextSettings">{{ contextSettingsLoading ? '刷新中' : '刷新' }}</button>
          <button class="btn btn-primary" :disabled="contextSettingsSaving" @click="saveContextSettings">{{ contextSettingsSaving ? '保存中' : '保存' }}</button>
        </div>
      </div>
      <div class="context-preset-grid">
        <button
          v-for="preset in contextPresets"
          :key="preset.id"
          class="context-preset"
          :class="{ active: contextSettings.memoryContextPreset === preset.id }"
          @click="selectContextPreset(preset)"
        >
          <strong>{{ preset.label }}</strong>
          <span>{{ preset.note }}</span>
        </button>
      </div>
      <p class="context-capacity-note">默认模式按模型能力和 CC 公式计算；预设与自定义值作为所有群聊的全局容量上限。</p>
      <div v-if="modelCapacityStatus" class="capacity-runtime-strip">
        <span><small>解析来源</small><strong>{{ modelCapacityStatus.capacity?.source || 'unknown' }}</strong></span>
        <span><small>缓存状态</small><strong>{{ modelCapacityStatus.capacity?.cacheStatus || '—' }}</strong></span>
        <span><small>可信度</small><strong>{{ modelCapacityStatus.capacity?.confidence ?? '—' }}</strong></span>
        <span><small>模型窗口</small><strong>{{ formatNumber(modelCapacityStatus.capacity?.contextWindow) }}</strong></span>
        <span><small>输出预留</small><strong>{{ formatNumber(modelCapacityStatus.capacity?.reservedOutputTokens) }}</strong></span>
        <span><small>有效窗口</small><strong>{{ formatNumber(modelCapacityStatus.capacity?.effectiveContextWindow) }}</strong></span>
        <span><small>压缩触发线</small><strong>{{ formatNumber(modelCapacityStatus.effectiveAutoCompactThreshold) }}</strong></span>
        <span><small>能力缓存</small><strong>{{ modelCapacityStatus.capabilityCache?.active || 0 }} 有效 / {{ modelCapacityStatus.capabilityCache?.expired || 0 }} 过期 / {{ modelCapacityStatus.capabilityCache?.revoked || 0 }} 撤销</strong></span>
        <span><small>能力到期</small><strong>{{ formatTime(modelCapacityStatus.capacity?.expiresAt) }}</strong></span>
        <span><small>待刷新</small><strong>{{ modelCapabilityRefreshPlan?.requestCount || 0 }}</strong></span>
        <span><small>刷新租约</small><strong>#{{ modelCapabilityRefreshStatus?.lease?.fencingToken || 0 }} / PID {{ modelCapabilityRefreshStatus?.lease?.ownerPid || '—' }}</strong></span>
        <span><small>刷新健康</small><strong>{{ modelCapabilityRefreshOutcomeLedger?.totals?.degradedProviders || 0 }} 异常 / {{ modelCapabilityRefreshOutcomeLedger?.outcomeCount || 0 }} 条记录</strong></span>
        <span><small>结果记录</small><strong>{{ modelCapabilityRefreshOutcomeLedger?.valid === false ? `待恢复 · ${modelCapabilityRefreshOutcomeLedger?.recoveryReason || 'invalid'}` : '校验通过' }}</strong></span>
        <span><small>隔离待确认</small><strong>{{ invalidModelCapabilityRefreshOutcomes?.pendingAcknowledgementCount || 0 }}</strong></span>
      </div>
      <div class="provider-capability-editor">
        <div class="context-capacity-head">
          <div>
            <div class="eyebrow">PROVIDER CAPABILITY</div>
            <h3>子 Agent 模型容量</h3>
          </div>
          <div class="context-capacity-actions">
            <button class="btn btn-outline" :disabled="modelCapabilityMaintenanceRunning" @click="runModelCapabilityMaintenance(false)">预览维护</button>
            <button class="btn btn-outline" :disabled="modelCapabilityMaintenanceRunning" @click="runModelCapabilityMaintenance(true)">清理过期</button>
            <button class="btn btn-outline" :disabled="modelCapabilitySaving" @click="saveModelCapability">{{ modelCapabilitySaving ? '保存中' : '保存容量' }}</button>
          </div>
        </div>
        <div class="context-field-grid provider-capability-fields">
          <label>
            <span>Provider</span>
            <input v-model.trim="modelCapabilitySetting.provider" type="text" placeholder="codex">
          </label>
          <label>
            <span>模型（可选）</span>
            <input v-model.trim="modelCapabilitySetting.model" type="text" placeholder="默认模型">
          </label>
          <label>
            <span>上下文窗口</span>
            <input v-model.number="modelCapabilitySetting.contextWindow" type="number" min="32000" max="4000000" step="1000">
          </label>
          <label>
            <span>最大输出</span>
            <input v-model.number="modelCapabilitySetting.maxOutputTokens" type="number" min="0" max="3984000" step="1000">
          </label>
        </div>
        <div v-if="modelCapabilityEntries.length" class="provider-capability-list">
          <span v-for="entry in modelCapabilityEntries.slice(0, 12)" :key="`${entry.key}:${entry.source}`">
            <span>
              <strong>{{ entry.provider }}{{ entry.model ? ` / ${entry.model}` : '' }}</strong>
              <small>{{ formatNumber(entry.contextWindow) }} · {{ entry.source }} · {{ entry.revoked ? '已撤销' : entry.expired ? '已过期' : '有效' }}</small>
            </span>
            <button v-if="!entry.revoked" class="btn btn-outline capability-revoke" @click="revokeModelCapability(entry)">撤销</button>
          </span>
        </div>
        <div v-if="modelCapabilityDowngradeAlerts.length" class="capability-downgrade-list">
          <span v-for="alert in modelCapabilityDowngradeAlerts.slice(-5).reverse()" :key="alert.alertId">
            <strong>{{ alert.provider }}{{ alert.model ? ` / ${alert.model}` : '' }}</strong>
            <small>{{ formatNumber(alert.previousContextWindow) }} -> {{ formatNumber(alert.currentContextWindow) }} · 影响 {{ alert.affectedSessionCount || 0 }} 个活跃会话 · {{ formatTime(alert.detectedAt) }}</small>
          </span>
        </div>
        <div v-if="modelCapabilityRefreshPlan?.requests?.length" class="capability-refresh-list">
          <span v-for="request in modelCapabilityRefreshPlan.requests.slice(0, 8)" :key="request.requestId">
            <strong>{{ request.provider }}{{ request.model ? ` / ${request.model}` : '' }}</strong>
            <small>{{ request.status }} · 尝试 {{ request.attemptCount || 0 }} 次 · {{ request.retryAt ? `重试 ${formatTime(request.retryAt)}` : formatTime(request.expiresAt) }}</small>
          </span>
        </div>
        <div v-if="modelCapabilityRefreshOutcomeLedger?.providers?.length" class="capability-health-list">
          <span v-for="provider in modelCapabilityRefreshOutcomeLedger.providers" :key="provider.provider">
            <strong :class="provider.health">{{ provider.provider }} · {{ provider.health }}</strong>
            <small>刷新 {{ provider.refreshed }}/{{ provider.total }} · 成功率 {{ provider.refreshSuccessRate }}% · 连续缺失 {{ provider.consecutiveMetadataAbsent }}</small>
          </span>
        </div>
        <div v-if="modelCapabilityRefreshStatus?.ledgerRecovery?.recovered" class="capability-recovery-proof">
          <strong>账本已从 journal 恢复</strong>
          <small>{{ modelCapabilityRefreshStatus.ledgerRecovery.recoveryReason }} · {{ formatTime(modelCapabilityRefreshStatus.ledgerRecovery.recoveredAt) }} · archive 剩余 {{ modelCapabilityRefreshStatus.archiveRetention?.remaining || 0 }}</small>
        </div>
        <div v-if="invalidModelCapabilityRefreshOutcomes?.outcomes?.length" class="invalid-refresh-outcome-list">
          <span v-for="outcome in invalidModelCapabilityRefreshOutcomes.outcomes.slice(0, 8)" :key="outcome.invalidOutcomeId">
            <span>
              <strong>{{ outcome.originalFileName || outcome.invalidOutcomeId }}</strong>
              <small>{{ outcome.reason || 'invalid pending outcome' }} · {{ formatTime(outcome.quarantinedAt) }} · {{ outcome.checksumValid ? '取证校验通过' : '取证校验失败' }}</small>
            </span>
            <button v-if="outcome.status === 'pending_ack'" class="btn btn-outline capability-revoke" :disabled="invalidRefreshOutcomeAcknowledging === outcome.invalidOutcomeId" @click="acknowledgeInvalidRefreshOutcome(outcome)">{{ invalidRefreshOutcomeAcknowledging === outcome.invalidOutcomeId ? '确认中' : '确认' }}</button>
            <small v-else class="invalid-outcome-ack">已确认</small>
          </span>
        </div>
      </div>
      <div class="context-field-grid">
        <label>
          <span>上下文窗口</span>
          <input v-model.number="contextSettings.modelContextWindow" type="number" min="32000" max="4000000" step="1000" :disabled="contextSettings.memoryContextPreset !== 'custom'">
          <small>写入 model_context_window，仅在“自定义”模式可编辑。</small>
        </label>
        <label>
          <span>自动压缩阈值</span>
          <input v-model.number="contextSettings.modelAutoCompactTokenLimit" type="number" min="18000" max="3980000" step="1000" :disabled="contextSettings.memoryContextPreset !== 'custom'">
          <small>写入 model_auto_compact_token_limit，仅在“自定义”模式可编辑。</small>
        </label>
        <label>
          <span>每轮记忆文件数</span>
          <input v-model.number="contextSettings.typedMemoryDeliveryMaxDocuments" type="number" min="1" max="5" step="1">
          <small>Claude Code 同级 attachment 边界，每轮最多 5 份相关记忆。</small>
        </label>
        <label>
          <span>单份记忆容量（bytes）</span>
          <input v-model.number="contextSettings.typedMemoryDeliveryMaxBytesPerDocument" type="number" min="512" max="4096" step="256">
          <small>按 UTF-8 实际字节裁剪，中文不会按字符数误算。</small>
        </label>
        <label>
          <span>单份记忆行数</span>
          <input v-model.number="contextSettings.typedMemoryDeliveryMaxLinesPerDocument" type="number" min="10" max="200" step="10">
          <small>每份相关记忆最多投递 200 行。</small>
        </label>
        <label>
          <span>单周期累计容量（bytes）</span>
          <input v-model.number="contextSettings.typedMemoryDeliveryMaxSessionBytes" type="number" min="4096" max="61440" step="1024">
          <small>同一 tas_* 与 compact epoch 最多累计 60KB，压缩后自动重置。</small>
        </label>
        <label>
          <span>记忆投递 token 上限</span>
          <input v-model.number="contextSettings.typedMemoryDeliveryMaxTokens" type="number" min="500" max="20000" step="500">
          <small>实际额度还会按当前子 Agent 模型窗口的 2% 自动下调。</small>
        </label>
        <label>
          <span>归档保留天数</span>
          <input v-model.number="contextSettings.groupSessionRetentionDays" type="number" min="1" max="3650" step="1">
          <small>超过这个期限的归档会话进入清理候选，未完成任务会阻止删除。</small>
        </label>
        <label>
          <span>最大归档会话数</span>
          <input v-model.number="contextSettings.groupSessionMaxArchived" type="number" min="1" max="1000" step="1">
          <small>超过数量上限时优先清理最旧归档会话，不影响活跃会话。</small>
        </label>
        <label class="retention-toggle-field">
          <span>自动归档清理</span>
          <div class="retention-toggle-row">
            <input v-model="contextSettings.groupSessionAutoPruneEnabled" type="checkbox">
            <strong>{{ contextSettings.groupSessionAutoPruneEnabled ? '已开启' : '默认关闭' }}</strong>
          </div>
          <small>开启后才会由服务器调度器执行实际清理；关闭时只允许手动预览。</small>
        </label>
        <label>
          <span>维护周期（小时）</span>
          <input v-model.number="contextSettings.groupSessionRetentionIntervalHours" type="number" min="1" max="720" step="1">
          <small>服务监听成功后启动调度，首次执行延迟 60 秒。</small>
        </label>
        <label class="retention-toggle-field">
          <span>抽取制品自动冷归档</span>
          <div class="retention-toggle-row">
            <input v-model="contextSettings.groupSessionArtifactAutoArchiveEnabled" type="checkbox">
            <strong>{{ contextSettings.groupSessionArtifactAutoArchiveEnabled ? '已开启' : '已关闭' }}</strong>
          </div>
          <small>只归档回放审计制品，不改变注入模型的 Session Memory。</small>
        </label>
        <label>
          <span>热抽取记录数</span>
          <input v-model.number="contextSettings.groupSessionArtifactHotExecutions" type="number" min="2" max="1000" step="1">
          <small>始终保护最近成功、最近失败和正在执行的抽取。</small>
        </label>
        <label>
          <span>热制品容量（MB）</span>
          <input v-model.number="contextSettings.groupSessionArtifactMaxHotMb" type="number" min="1" max="10240" step="1">
          <small>超出后按会话从最旧制品开始归档。</small>
        </label>
        <label>
          <span>热制品天数</span>
          <input v-model.number="contextSettings.groupSessionArtifactMaxAgeDays" type="number" min="1" max="3650" step="1">
          <small>旧制品进入带校验清单的会话冷存储。</small>
        </label>
      </div>
      <div class="retention-maintenance-row">
        <span>上次运行 {{ formatTime(sessionRetentionStatus?.lastRunAt) }} · 候选 {{ sessionRetentionStatus?.candidateCount || 0 }} · 已删 {{ sessionRetentionStatus?.deletedCount || 0 }} · 租约 #{{ sessionRetentionStatus?.lease?.fencingToken || 0 }} / PID {{ sessionRetentionStatus?.lease?.ownerPid || '—' }}</span>
        <div>
          <button class="btn btn-outline" :disabled="sessionRetentionRunning" @click="runSessionRetentionMaintenance(false)">预览清理</button>
          <button class="btn btn-outline danger" :disabled="sessionRetentionRunning" @click="runSessionRetentionMaintenance(true)">执行清理</button>
        </div>
      </div>
    </section>

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

    <section :class="['dispatch-recovery-panel', { alert: (dispatchRecovery.summary?.uncertain || 0) + (dispatchRecovery.summary?.invalid || 0) > 0 }]">
      <div class="dispatch-recovery-head">
        <div><span class="panel-kicker">DISPATCH RECOVERY</span><h4>子 Agent 记忆派发恢复</h4></div>
        <button class="btn btn-outline" :disabled="dispatchRecoveryLoading" title="刷新派发恢复证据" @click="loadDispatchRecovery(true)">{{ dispatchRecoveryLoading ? '刷新中…' : '刷新' }}</button>
      </div>
      <div class="dispatch-recovery-counters">
        <span v-for="card in dispatchRecoverySummaryCards" :key="card.label"><small>{{ card.label }}</small><strong>{{ formatNumber(card.value) }}</strong></span>
      </div>
      <div v-if="dispatchRecoveryRows.length" class="dispatch-recovery-list">
        <article v-for="row in dispatchRecoveryRows" :key="row.ticketId || row.runnerRequestId" :class="row.recoverability">
          <div class="dispatch-recovery-row">
            <span :class="['dispatch-recovery-state', row.recoverability]">{{ dispatchStateLabel(row.recoverability) }}</span>
            <div class="dispatch-recovery-identity">
              <strong>{{ row.project || row.direct?.project || 'unknown project' }}</strong>
              <small>{{ row.groupId || 'no-group' }} · {{ row.groupSessionId || 'no-gcs' }} · {{ row.taskAgentSessionId || 'no-tas' }}</small>
            </div>
            <div class="dispatch-recovery-proof">
              <code>{{ row.ticketId || 'WAL missing' }}</code>
              <small>{{ row.runnerRequestId || 'runner pending' }} · {{ row.direct?.requestStatus || 'missing' }} · transcript {{ row.direct?.transcript?.valid ? 'valid' : row.direct?.transcript?.present ? 'invalid' : 'none' }}</small>
            </div>
            <time>{{ formatTime(row.updatedAt || row.direct?.completedAt || row.direct?.createdAt) }}</time>
            <div class="dispatch-recovery-actions">
              <button v-if="row.direct?.transcript?.present" class="btn btn-outline" title="查看增量执行轨迹" @click="toggleDispatchTranscript(row)">轨迹</button>
              <button v-for="action in dispatchActions(row)" :key="action" class="btn btn-outline" :class="{ danger: ['cancel_prepared', 'prune_terminal'].includes(action) }" :title="dispatchActionLabel(action)" @click="openDispatchResolve(row, action)">{{ dispatchActionLabel(action) }}</button>
            </div>
          </div>
          <div v-if="row.acknowledged" class="dispatch-recovery-ack">已确认 · {{ row.acknowledgement?.actor }} · {{ formatTime(row.acknowledgement?.completedAt) }}</div>
          <div v-if="expandedDispatchId === (row.ticketId || row.runnerRequestId)" class="dispatch-transcript-list">
            <div class="dispatch-transcript-meta"><code>{{ row.direct?.transcript?.headChecksum || 'no-head' }}</code><span>{{ formatBytes(row.direct?.transcript?.bytes || 0) }} · {{ row.direct?.transcript?.eventCount || 0 }} events</span></div>
            <div v-for="event in row.direct?.transcript?.events || []" :key="event.sequence" class="dispatch-transcript-event">
              <time>{{ formatTime(event.at) }}</time><strong>{{ event.type }}</strong><pre>{{ event.payload?.text || JSON.stringify(event.payload || {}) }}</pre>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="dispatch-recovery-empty">暂无记忆派发恢复记录</div>
    </section>

    <section v-if="sessionMemoryFleetReport" :class="['session-memory-fleet-panel', sessionMemoryFleetState]">
      <div class="session-memory-fleet-head">
        <div><span class="panel-kicker">SESSION MEMORY FLEET</span><h4>群聊会话记忆预算</h4></div>
        <code>{{ sessionMemoryFleetState }}</code>
      </div>
      <div class="session-memory-fleet-cards">
        <article v-for="card in sessionMemoryFleetCards" :key="card.label">
          <span>{{ card.label }}</span>
          <strong>{{ formatNumber(card.value) }}</strong>
          <small>{{ card.note }}</small>
        </article>
      </div>
      <div v-if="sessionMemoryFleetRows.length" class="session-memory-fleet-list">
        <article v-for="row in sessionMemoryFleetRows" :key="row.scopeId" :class="row.status">
          <span :class="['usage-state', row.status === 'ok' ? 'used' : row.status === 'empty' ? 'waiting' : row.status]">{{ row.status }}</span>
          <strong>{{ row.groupSessionId || 'default' }}</strong>
          <p>{{ row.groupId }} · turns {{ formatNumber(row.postTurnSummaryCount || 0) }}/{{ formatNumber(row.postTurnSummaryAssistantMessageCount || 0) }} · missing {{ formatNumber(row.postTurnSummaryMissingCount || 0) }} · ledger {{ row.postTurnSummaryLedgerValid ? 'verified' : 'invalid' }} · archives {{ formatNumber(row.postTurnSummaryArchiveCount || 0) }} · compact scope {{ row.autoCompactionScopeEvidencePresent ? row.autoCompactionTypedMemoryScopeValid ? 'verified' : 'invalid' : 'unobserved' }} · {{ row.extractionMethod || 'deterministic_structured_fallback' }} · receipt {{ row.modelReceiptChecksumValid ? 'verified' : row.modelExtracted ? 'invalid' : row.modelExtractionBackoff ? 'backoff' : row.directMemorySuppressionActive ? 'suppressed' : 'pending' }} · direct skip {{ formatNumber(row.directMemorySuppressionCount || 0) }} {{ row.directMemorySuppressionPresent ? row.directMemorySuppressionChecksumValid ? 'verified' : 'invalid' : 'none' }} / proofs {{ formatNumber(row.directMemorySuppressionProofCount || 0) }} / fence {{ formatNumber(row.directMemorySuppressionLedgerFence || 0) }} / cursor {{ row.directMemorySuppressionCursorBefore || 'start' }}→{{ row.directMemorySuppressionCursorAfter || 'none' }} · delivery {{ row.modelExtracted ? row.modelExtractionDeliveryEvidenceValid ? 'verified' : 'invalid' : 'unobserved' }} · quality {{ row.modelMergeQualityStatus || 'unobserved' }} {{ formatNumber(row.modelMergeQualityScore || 0) }} · facts {{ row.factSupersessionGraphPresent ? row.factSupersessionGraphValid ? 'verified' : 'invalid' : 'unobserved' }} {{ formatNumber(row.factSupersessionEdgeCount || 0) }}/{{ formatNumber(row.factSupersessionUnjustifiedLostCount || 0) }} · typed {{ row.modelExtractionTypedMemoryArchivePresent ? row.modelExtractionTypedMemoryArchiveValid ? 'verified' : 'invalid' : 'empty' }} {{ formatNumber(row.modelExtractionTypedMemoryAdmittedCount || 0) }}/{{ formatNumber(row.modelExtractionTypedMemoryRejectedCount || 0) }}/{{ formatNumber(row.modelExtractionTypedMemorySupersededThisRun || 0) }} · retry {{ formatNumber(row.modelExtractionTypedMemoryRetryPendingCount || 0) }}/{{ formatNumber(row.modelExtractionTypedMemoryRetryCompletedCount || 0) }}/{{ formatNumber(row.modelExtractionTypedMemoryRetryExhaustedCount || 0) }} · chain {{ row.modelExtractionHistoryChainValid && row.modelExtractionHistoryHeadMatches ? 'verified' : row.modelExtractionHistoryTotalCount ? 'invalid' : 'empty' }} · replay {{ row.modelExtractionReplayStatus || 'unobserved' }} · artifacts {{ row.modelExtractionArtifactRetentionStatus || 'empty' }} hot {{ formatBytes(row.modelExtractionArtifactHotBytes) }} / cold {{ formatBytes(row.modelExtractionArtifactArchivedBytes) }} / due {{ formatNumber(row.modelExtractionArtifactCandidateExecutionCount || 0) }} · input {{ row.modelInputBudgetStatus || 'unobserved' }} {{ formatNumber(row.modelInputEstimatedTokens || 0) }}/{{ formatNumber(row.modelInputMaxTokens || 0) }} · omitted {{ formatNumber(row.modelInputOmittedMessageCount || 0) }}{{ row.modelInputClipped ? ' · clipped' : '' }} · {{ row.cadenceStatus || 'unobserved' }} · tx {{ row.extractionStatus || 'idle' }} · Δ {{ formatNumber(row.cadenceTokensSinceLastExtraction || 0) }}</p>
          <p v-if="row.manifestSelectorPresent">selector {{ row.manifestSelectorLatest?.status || 'empty' }} · decisions {{ formatNumber(row.manifestSelectorDecisionCount || 0) }} · selected {{ formatNumber(row.manifestSelectorSelectedDocumentCount || 0) }} · empty {{ formatNumber(row.manifestSelectorEmptyDecisionCount || 0) }} · failed {{ formatNumber(row.manifestSelectorFailedDecisionCount || 0) }} · integrity {{ row.manifestSelectorValid ? 'verified' : 'invalid' }}</p>
          <code>{{ formatNumber(row.markdownTokens || 0) }} / {{ formatNumber(row.totalTokenBudget || 12000) }}</code>
          <div class="session-memory-artifact-actions">
            <button v-if="row.modelExtractionTypedMemoryRetryPendingCount || row.modelExtractionTypedMemoryRetryExhaustedCount" class="btn btn-outline" :disabled="!!sessionMemoryTypedRetryRunning" title="使用已签名抽取制品立即重试 typed-memory 提交，不重新调用模型" @click="retrySessionMemoryTypedCommit(row)">立即重试</button>
            <button class="btn btn-outline" :disabled="!!sessionMemoryArtifactRetentionRunning" title="预览该会话的抽取制品归档" @click="runSessionMemoryArtifactRetention(row, false)">预览归档</button>
            <button class="btn btn-outline" :disabled="!!sessionMemoryArtifactRetentionRunning || !row.modelExtractionArtifactCandidateExecutionCount" title="执行该会话的抽取制品归档" @click="runSessionMemoryArtifactRetention(row, true)">执行归档</button>
          </div>
        </article>
      </div>
      <div v-if="sessionMemoryHistoryRows.length" class="session-memory-history-list">
        <article v-for="event in sessionMemoryHistoryRows" :key="event.eventId">
          <span :class="['usage-state', event.status === 'committed' ? 'used' : event.status === 'failed' ? 'fail' : 'waiting']">{{ event.status }}</span>
          <strong>{{ event.groupSessionId }}</strong>
          <p>{{ event.reason || event.failureClass || event.executionId || 'model extraction' }} · quality {{ event.mergeQuality?.status || 'unobserved' }} {{ formatNumber(event.mergeQuality?.score || 0) }}</p>
          <code>{{ formatTime(event.at || event.completedAt || event.failedAt) }}</code>
          <button
            v-if="['committed', 'failed'].includes(event.status)"
            class="session-memory-replay-btn"
            :disabled="sessionMemoryReplayLoading === event.executionId"
            title="重新校验该次提炼的历史链、压缩制品和模型输出"
            @click="replaySessionMemoryExtraction(event)"
          >{{ sessionMemoryReplayLoading === event.executionId ? '校验中…' : '重放' }}</button>
        </article>
      </div>
      <div v-if="sessionMemoryReplayResult" :class="['session-memory-replay-panel', sessionMemoryReplayResult.pass ? 'ok' : 'fail']">
        <div class="session-memory-replay-head">
          <div>
            <span class="panel-kicker">EXTRACTION REPLAY</span>
            <h5>{{ sessionMemoryReplayResult.pass ? '提炼证据重放通过' : '提炼证据重放失败' }}</h5>
          </div>
          <button class="session-memory-replay-close" title="关闭重放结果" @click="sessionMemoryReplayResult = null">关闭</button>
        </div>
        <div class="session-memory-replay-meta">
          <code>{{ sessionMemoryReplayResult.executionId }}</code>
          <span>历史链 {{ sessionMemoryReplayResult.history?.integrityValid ? '完整' : '异常' }}</span>
          <span>请求 {{ sessionMemoryReplayResult.request?.valid ? '有效' : '无效' }} · {{ sessionMemoryReplayResult.request?.tier || 'missing' }} · {{ formatBytes(sessionMemoryReplayResult.request?.compressedBytes) }}</span>
          <span>结果 {{ sessionMemoryReplayResult.result?.valid ? '有效' : '无效' }} · {{ sessionMemoryReplayResult.result?.tier || 'missing' }} · {{ formatBytes(sessionMemoryReplayResult.result?.compressedBytes) }}</span>
          <span>输入 {{ sessionMemoryReplayResult.request?.inputBudgetStatus || 'unobserved' }} · {{ formatNumber(sessionMemoryReplayResult.request?.estimatedInputTokens || 0) }} tokens</span>
        </div>
        <div class="session-memory-replay-checks">
          <article v-for="([key, passed]) in sessionMemoryReplayChecks" :key="key" :class="passed ? 'ok' : 'fail'">
            <span>{{ passed ? '通过' : '失败' }}</span>
            <strong>{{ sessionMemoryReplayCheckLabels[key] || key }}</strong>
          </article>
        </div>
      </div>
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
      <div v-if="ignoreMemoryReceiptAvailable" :class="['ignore-memory-receipt-panel', ignoreMemoryReceiptState]">
        <div class="ignore-memory-receipt-head">
          <div>
            <span class="panel-kicker">IGNORE MEMORY DECLARATIONS</span>
            <h4>不使用记忆声明</h4>
          </div>
          <div class="ignore-memory-receipt-actions">
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 ignore-memory receipt compliance" @click="refreshQualityCheck('worker_context_packet_ignore_memory_receipt_compliance')">{{ targetedQualityLoading === 'worker_context_packet_ignore_memory_receipt_compliance' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 ignore-memory receipt repair items" @click="refreshQualityCheck('worker_context_packet_ignore_memory_receipt_repair_work_items')">{{ targetedQualityLoading === 'worker_context_packet_ignore_memory_receipt_repair_work_items' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 ignore-memory receipt dispatch candidates" @click="refreshQualityCheck('worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates')">{{ targetedQualityLoading === 'worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 ignore-memory receipt dispatch briefs" @click="refreshQualityCheck('worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs')">{{ targetedQualityLoading === 'worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 ignore-memory receipt typed memory" @click="refreshQualityCheck('worker_context_packet_ignore_memory_receipt_repair_typed_memory')">{{ targetedQualityLoading === 'worker_context_packet_ignore_memory_receipt_repair_typed_memory' ? '…' : '↻' }}</button>
          </div>
        </div>
        <div class="ignore-memory-receipt-cards">
          <article v-for="card in ignoreMemoryReceiptCards" :key="card.label">
            <span>{{ card.label }}</span>
            <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
        <div v-if="ignoreMemoryReceiptRows.length" class="ignore-memory-receipt-list">
          <article v-for="row in ignoreMemoryReceiptRows" :key="row.key" :class="row.status">
            <span :class="['usage-state', row.status === 'ok' ? 'verified' : row.status === 'fail' ? 'fail' : 'warn']">{{ row.type }}</span>
            <strong>{{ row.title }}</strong>
            <p>{{ compactDisplay(row.detail, 260) }}</p>
            <code>{{ compactDisplay(row.code, 120) }}</code>
          </article>
        </div>
        <div v-if="ignoreMemoryReceiptWorkItemRows.length" class="ignore-memory-receipt-work-list">
          <div class="recall-diagnostic-head">
            <strong>Ignore-Memory Repair Work Items</strong>
            <span>{{ ignoreMemoryReceiptRepairReport?.overall?.openItemCount || 0 }} open</span>
          </div>
          <article v-for="item in ignoreMemoryReceiptWorkItemRows" :key="item.key" :class="item.status || item.groupStatus">
            <span :class="['usage-state', item.status === 'completed' ? 'completed' : item.status === 'blocked' ? 'blocked' : item.status === 'in_progress' ? 'in_progress' : item.status === 'pending' ? 'pending' : item.groupStatus === 'fail' ? 'fail' : 'warn']">{{ item.status || item.groupStatus }}</span>
            <strong>{{ item.target_project || item.target || item.packet_id || 'receipt repair' }}</strong>
            <p>{{ compactDisplay(`${item.groupId || 'group'} · ${item.packet_id || item.worker_context_packet_id || 'packet'} · ${item.binding_id || item.worker_context_packet_binding_id || 'binding'} · ${item.priority || 'priority'}`, 260) }}</p>
            <div class="replay-work-actions">
              <button v-if="item.status === 'pending'" @click="updateReplayRepairWorkItemForGroup(item.groupId, item, 'claim')">认领</button>
              <button v-if="['pending', 'in_progress', 'blocked'].includes(item.status)" @click="updateReplayRepairWorkItemForGroup(item.groupId, item, 'dispatch')">派发</button>
              <button v-if="['pending', 'in_progress', 'blocked'].includes(item.status)" @click="updateReplayRepairWorkItemForGroup(item.groupId, item, 'complete')">完成</button>
              <button v-if="['pending', 'in_progress'].includes(item.status)" @click="updateReplayRepairWorkItemForGroup(item.groupId, item, 'block')">阻塞</button>
              <button v-if="['completed', 'cancelled'].includes(item.status)" @click="updateReplayRepairWorkItemForGroup(item.groupId, item, 'reopen')">重开</button>
            </div>
          </article>
        </div>
        <div v-if="!ignoreMemoryReceiptRows.length && !ignoreMemoryReceiptWorkItemRows.length" class="ignore-memory-receipt-empty">暂无 ignore-memory 声明缺口</div>
      </div>
      <div v-if="crossProjectPressureUsageAvailable" :class="['cross-group-quality-panel', crossProjectPressureUsageState]">
        <div class="cross-group-quality-head">
          <div>
            <span class="panel-kicker">PROJECT PRESSURE MEMORY</span>
            <h4>跨群聊压力记忆使用</h4>
          </div>
          <div class="cross-group-quality-actions">
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 cross-group pressure usage" @click="refreshQualityCheck('worker_context_packet_cross_group_pressure_recall_usage')">{{ targetedQualityLoading === 'worker_context_packet_cross_group_pressure_recall_usage' ? '…' : '↻' }}</button>
          </div>
        </div>
        <div class="cross-group-quality-cards">
          <article v-for="card in crossProjectPressureUsageCards" :key="card.label">
            <span>{{ card.label }}</span>
            <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
        <div v-if="crossProjectPressureUsageRows.length" class="cross-group-quality-table">
          <article v-for="row in crossProjectPressureUsageRows" :key="row.key" :class="crossProjectPressureUsageRowState(row)">
            <span :class="['usage-state', row.conflictCount > 0 ? 'warn' : row.mode === 'cross_group_project_assist' ? 'used' : row.mode === 'local_first' ? 'verified' : 'waiting']">{{ row.mode || row.status }}</span>
            <strong>{{ row.targetProject || 'project' }}</strong>
            <p>{{ compactDisplay(`${row.groupId || 'group'} · local ${row.localMemoryCount || 0} · cross ${row.crossGroupMemoryCount || 0} · supplement ${row.crossGroupSupplementCount || 0} · source ${row.sourceGroupCount || 0} · ${row.recommendation || row.relPath || row.status}`, 280) }}</p>
            <code>{{ row.conflictCount ? `${row.conflictCount} conflict` : row.staleCrossGroupEntryCount ? `${row.staleCrossGroupEntryCount} stale` : row.sourceGroup || `${row.freshCrossGroupEntryCount || 0} fresh` }}</code>
          </article>
        </div>
        <div v-else class="cross-group-quality-empty">暂无同项目跨群聊压力使用提示</div>
      </div>
      <div v-if="globalSelftestContaminationCheck" :class="['selftest-residue-panel', globalSelftestArchiveState]">
        <div class="selftest-residue-head">
          <div>
            <span class="panel-kicker">GLOBAL MEMORY CLEANUP</span>
            <h4>Global Agent 自测残留</h4>
          </div>
          <div class="selftest-residue-actions">
            <button class="btn btn-sm btn-outline" :disabled="selftestResidueArchiveLoading" @click="runGlobalSelftestResidueArchive(true)">{{ selftestResidueArchiveLoading ? '处理中' : '预演归档' }}</button>
            <button class="btn btn-sm btn-primary" :disabled="selftestResidueArchiveLoading || !globalSelftestHasResidue || globalSelftestHasActivePollution" @click="openOperation('archive_selftest_residue')">归档残留</button>
          </div>
        </div>
        <div class="selftest-residue-cards">
          <article v-for="card in globalSelftestArchiveCards" :key="card.label">
            <span>{{ card.label }}</span>
            <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
        <div v-if="selftestResidueArchiveResult" class="selftest-residue-result">
          <strong>{{ selftestResidueArchiveResult.dryRun ? '预演结果' : '归档结果' }}</strong>
          <span>可移动 {{ selftestResidueArchiveResult.archivedCount || 0 }}</span>
          <span>跳过 {{ selftestResidueArchiveResult.skippedCount || 0 }}</span>
          <span>active {{ selftestResidueArchiveResult.after?.active_contamination_count ?? selftestResidueArchiveResult.before?.active_contamination_count ?? 0 }}</span>
          <span>residue {{ selftestResidueArchiveResult.after?.residue_contamination_count ?? selftestResidueArchiveResult.before?.residue_contamination_count ?? 0 }}</span>
        </div>
        <div v-if="globalSelftestResidueRows.length" class="selftest-residue-list">
          <article v-for="row in globalSelftestResidueRows" :key="`${row.file}:${row.kind || row.reason || ''}`" :class="row.active ? 'fail' : 'warn'">
            <span :class="['usage-state', row.active ? 'fail' : 'warn']">{{ row.active ? 'active' : 'residue' }}</span>
            <strong>{{ row.kind || row.role || 'file' }}</strong>
            <p>{{ compactDisplay(row.file || row.reason || row.preview, 260) }}</p>
          </article>
        </div>
      </div>
      <div v-if="taskAgentMemoryContextSnapshotCheck || taskAgentSnapshotReport?.schema" :class="['task-agent-snapshot-panel', taskAgentSnapshotState]">
        <div class="task-agent-snapshot-head">
          <div>
            <span class="panel-kicker">TASK AGENT MEMORY</span>
            <h4>项目子 Agent 记忆快照</h4>
          </div>
          <div class="task-agent-snapshot-actions">
            <button class="btn btn-sm btn-outline" :disabled="taskAgentSnapshotRetentionLoading" @click="runTaskAgentSnapshotRetention(true)">{{ taskAgentSnapshotRetentionLoading ? '处理中' : '预演清理' }}</button>
            <button class="btn btn-sm btn-primary" :disabled="taskAgentSnapshotRetentionLoading || !taskAgentSnapshotHasPrunable" @click="openOperation('prune_task_agent_memory_context_snapshots')">清理快照</button>
          </div>
        </div>
        <div class="task-agent-snapshot-cards">
          <article v-for="card in taskAgentSnapshotCards" :key="card.label">
            <span>{{ card.label }}</span>
            <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
        <div v-if="taskAgentSnapshotRetentionResult" class="task-agent-snapshot-result">
          <strong>{{ taskAgentSnapshotRetentionResult.dryRun ? '预演结果' : '清理结果' }}</strong>
          <span>候选 {{ taskAgentSnapshotRetentionResult.candidateCount || 0 }}</span>
          <span>处理 {{ taskAgentSnapshotRetentionResult.prunedCount || 0 }}</span>
          <span>跳过 {{ taskAgentSnapshotRetentionResult.skippedCount || 0 }}</span>
        </div>
        <div v-if="taskAgentSnapshotRows.length" class="task-agent-snapshot-list">
          <article v-for="row in taskAgentSnapshotRows" :key="`${row.snapshotId}:${row.snapshotFile}`" :class="row.status">
            <span :class="['usage-state', row.status === 'fail' ? 'fail' : row.status === 'warn' ? 'warn' : 'verified']">{{ row.status }}</span>
            <strong>{{ row.snapshotId || row.sessionId || 'snapshot' }}</strong>
            <p>{{ compactDisplay(`${row.groupId || 'group'} · ${row.groupSessionId || 'session-unbound'} · ${row.project || 'project'} · ${row.taskId || 'task'} · ${(row.gaps || [])[0]?.reason || row.invocationEdgeId || row.workerContextPacketId || row.snapshotFile}`, 300) }}</p>
            <code>{{ row.prunable ? 'prunable' : `lifecycle #${row.sessionLifecycleGeneration || 0} ${row.sessionLifecycleFenceStatus || 'pending'} · ${row.invocationEdgeId ? `${row.invocationBranchKind || 'main'} · ${row.invocationEdgeStatus || 'prepared'} · ${row.invocationEdgeId}` : row.memoryContextDelivered ? `delivered · ${row.deliveryPromptBindingMode || 'bound'}` : row.deliveryStatus || (row.gateCount ? `${row.gateCount} gates` : 'gate check')}` }}</code>
          </article>
        </div>
        <div v-if="taskAgentInvocationRows.length" class="task-agent-snapshot-list task-agent-invocation-list">
          <div class="recall-diagnostic-head">
            <strong>Invocation Recovery</strong>
            <span>{{ taskAgentSnapshotReport?.overall?.invocationNonTerminalCount || 0 }} open</span>
          </div>
          <article v-for="row in taskAgentInvocationRows" :key="row.invocation_edge_id" :class="row.valid === false ? 'fail' : row.recovery_outcome === 'uncertain' || !['completed', 'failed'].includes(row.status) ? 'warn' : 'ok'">
            <span :class="['usage-state', row.valid === false ? 'fail' : row.recovery_outcome === 'uncertain' || !['completed', 'failed'].includes(row.status) ? 'warn' : 'verified']">{{ row.status }}</span>
            <strong>{{ row.invocation_edge_id }}</strong>
            <p>{{ compactDisplay(`${row.group_id} · ${row.group_session_id} · ${row.task_agent_session_id} · ${row.recovery_outcome || row.terminal_reason || row.branch_kind} · adoption ${row.adoption_status || 'pending'} · native ${row.native_continuation_status || 'pending'} · reinjection ${row.reinjection_status || 'pending'}`, 340) }}</p>
            <code>{{ row.branch_kind || 'main' }} · budget {{ row.context_rebudget_status || 'pending' }} · lifecycle #{{ row.session_lifecycle_generation || 0 }} {{ row.session_lifecycle_dispatch_fence_status || 'pending' }} · compact #{{ row.compact_head_generation || 0 }} {{ row.compact_head_dispatch_fence_status || 'pending' }} · recovery {{ row.recovery_fencing_token || 0 }} · {{ row.dispatch_ticket_id || row.runner_request_id || 'no dispatch witness' }}</code>
          </article>
        </div>
        <div v-if="taskAgentContinuationSoakRows.length" class="task-agent-snapshot-list task-agent-invocation-list">
          <div class="recall-diagnostic-head">
            <strong>Continuation Soak</strong>
            <span>{{ taskAgentSnapshotReport?.continuationSoak?.overall?.healthyChainCount || 0 }} healthy</span>
          </div>
          <article v-for="row in taskAgentContinuationSoakRows" :key="row.file" :class="row.status">
            <span :class="['usage-state', row.status === 'fail' ? 'fail' : row.status === 'warn' ? 'warn' : 'verified']">{{ row.status }}</span>
            <strong>{{ row.taskAgentSessionId }}</strong>
            <p>{{ compactDisplay(`${row.groupId} · ${row.groupSessionId} · turns ${row.turnCount} · resume ${row.continuationAcknowledgedCount}/${row.continuationCount} · task output ${row.taskArtifactProvenCount || 0}/${row.taskArtifactEvidenceCount || 0} · post-compact ${row.postCompactArtifactClosureProvenCount || 0}/${row.postCompactTaskArtifactEvidenceCount || 0}`, 340) }}</p>
            <code>events {{ row.eventCount }} · service {{ row.serviceEpochCount }} · contracts {{ row.providerContractEpochCount || 0 }} · compact chain {{ row.crossVersionPostCompactArtifact ? 'proven' : 'pending' }} · receipt drift {{ row.postCompactArtifactCompactTransactionReceiptMismatchCount || 0 }} · recovery {{ row.postCompactArtifactRecoveryClosureCount || 0 }} · {{ row.latestProviderRuntimeVersion || 'version pending' }} · {{ (row.gaps || [])[0] || row.headChecksum }}</code>
          </article>
        </div>
        <div v-if="providerRuntimeContractRows.length" class="task-agent-snapshot-list task-agent-invocation-list">
          <div class="recall-diagnostic-head">
            <strong>Provider Contract Inventory</strong>
            <span>{{ taskAgentSnapshotReport?.overall?.providerRuntimeContractHealthyCount || 0 }} healthy</span>
          </div>
          <article v-for="row in providerRuntimeContractRows" :key="row.provider" :class="row.status === 'ok' ? 'ok' : 'warn'">
            <span :class="['usage-state', row.status === 'ok' ? 'verified' : 'warn']">{{ row.status }}</span>
            <strong>{{ row.provider }}</strong>
            <p>{{ row.versionText || row.semanticVersion || row.error || 'version unavailable' }}</p>
            <code>{{ row.executableIdentityChecksum ? row.executableIdentityChecksum.slice(0, 20) : 'identity unavailable' }}</code>
          </article>
        </div>
      </div>
      <div v-if="globalMemoryArbitrationAvailable" class="cross-group-quality-panel">
        <div class="cross-group-quality-head">
          <div>
            <span class="panel-kicker">GLOBAL MEMORY ARBITRATION</span>
            <h4>全局记忆仲裁</h4>
          </div>
          <div class="cross-group-quality-actions">
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 semantic arbitration" @click="refreshQualityCheck('child_global_agent_memory_bridge')">{{ targetedQualityLoading === 'child_global_agent_memory_bridge' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 hard suppression" @click="refreshQualityCheck('global_memory_cross_group_suppression')">{{ targetedQualityLoading === 'global_memory_cross_group_suppression' ? '…' : '↻' }}</button>
            <button class="quality-refresh-btn" :disabled="qualityLoading || !!targetedQualityLoading" title="刷新 advisory freshness" @click="refreshQualityCheck('global_memory_cross_group_suppression_freshness')">{{ targetedQualityLoading === 'global_memory_cross_group_suppression_freshness' ? '…' : '↻' }}</button>
          </div>
        </div>
        <div class="cross-group-quality-cards">
          <article v-for="card in crossGroupQualityCards" :key="card.label">
            <span>{{ card.label }}</span>
            <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
            <small>{{ card.note }}</small>
          </article>
        </div>
        <div v-if="crossGroupQualityRows.length" class="cross-group-quality-table">
          <article v-for="row in crossGroupQualityRows" :key="row.key" :class="crossGroupRowState(row)">
            <span :class="['usage-state', row.mode === 'hard' ? 'fail' : row.superseded ? 'used' : 'waiting']">{{ row.mode }}</span>
            <strong>{{ row.globalMemoryId || 'global-memory' }}</strong>
            <p>{{ compactDisplay(`${row.groupId || 'group'} · ${row.targetProject || 'target'} · groups ${row.conflictGroupCount || row.groupCount || 0} · occurrences ${row.occurrenceCount || 0} · ${row.action || row.status}`, 260) }}</p>
            <code>{{ row.superseded ? 'superseded' : row.decayed ? 'decayed' : row.sourceCount ? `${row.sourceCount} ledgers` : 'ledger' }}</code>
          </article>
        </div>
        <div v-else class="cross-group-quality-empty">暂无跨群聊抑制行</div>
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
            <span class="scope-copy"><strong>{{ item.label }}</strong><small>{{ item.scope === 'global' ? '全局 Agent 记忆' : item.scope === 'group' ? `群聊会话记忆 · ${item.groupSessionId || 'default'}` : '项目长期记忆' }}</small></span>
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
            <section v-if="selectedScope === 'group' && resumeProjection" :class="['discipline-panel', resumeProjection.status === 'verified' || resumeProjection.status === 'no_boundary' ? 'ok' : 'fail']">
              <div class="discipline-head">
                <div>
                  <span class="panel-kicker">DURABLE RESUME</span>
                  <h4>会话恢复投影</h4>
                </div>
                <code>{{ resumeProjection.status || 'unknown' }}</code>
              </div>
              <div class="discipline-cards">
                <article><span>会话</span><strong>{{ detail.groupSessionId || 'default' }}</strong><small>{{ detail.groupId || selectedId }}</small></article>
                <article><span>原始消息</span><strong>{{ formatNumber(resumeProjection.rawMessageCount || 0) }}</strong><small>完整 transcript</small></article>
                <article><span>已摘要跳过</span><strong>{{ formatNumber(resumeProjection.omittedMessageCount || 0) }}</strong><small>仅在证明通过后剪枝</small></article>
                <article><span>恢复窗口</span><strong>{{ formatNumber(resumeProjection.projectedMessageCount || 0) }}</strong><small>保留段 + 新消息</small></article>
                <article><span>提交序号</span><strong>#{{ resumeProjection.boundary?.sequence || 0 }}</strong><small>fence {{ resumeProjection.boundary?.fencingToken || 0 }}</small></article>
                <article><span>恢复证明</span><strong>{{ resumeProjection.proofs?.proofCount || 0 }}</strong><small>{{ resumeProjection.proofs?.valid === false ? '账本异常' : '校验通过' }}</small></article>
              </div>
              <div class="discipline-gap-list">
                <article>
                  <span :class="['usage-state', resumeProjection.verified ? 'used' : 'fail']">{{ resumeProjection.verified ? 'verified' : 'fail closed' }}</span>
                  <strong>{{ resumeProjection.boundary?.boundaryId || '尚无压缩边界' }}</strong>
                  <p>{{ resumeProjection.reason || 'empty session' }}</p>
                </article>
              </div>
              <code>{{ resumeProjection.journal?.file || '尚未创建 boundary journal' }}</code>
            </section>
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
                <div v-if="typedMemoryStaleCandidateLedger" :class="['discipline-panel', typedMemoryStaleCandidateLedger.checksumValid === false || typedMemoryStaleCandidateLedger.invalidCount ? 'fail' : pendingTypedMemoryStaleCandidates.length ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>陈旧记忆更新候选</strong>
                      <span>子 Agent 只能提交候选，确认后才会更新当前群聊会话记忆</span>
                    </div>
                    <code>{{ typedMemoryStaleCandidateLedger.checksumValid === false ? 'checksum failed' : `${typedMemoryStaleCandidateLedger.pendingCount || 0} pending` }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article><span>待确认</span><strong>{{ typedMemoryStaleCandidateLedger.pendingCount || 0 }}</strong><small>只属于当前 gcs 会话</small></article>
                    <article><span>已执行</span><strong>{{ typedMemoryStaleCandidateLedger.appliedCount || 0 }}</strong><small>旧版本已停止召回</small></article>
                    <article><span>已拒绝</span><strong>{{ typedMemoryStaleCandidateLedger.rejectedCount || 0 }}</strong><small>不展示候选正文</small></article>
                    <article><span>无效证明</span><strong>{{ typedMemoryStaleCandidateLedger.invalidCount || 0 }}</strong><small>账本失败时关闭执行</small></article>
                  </div>
                  <div v-if="typedMemoryStaleCandidates.length" class="stale-candidate-list">
                    <article v-for="candidate in typedMemoryStaleCandidates.slice(0, 12)" :key="candidate.candidateId" :class="['stale-candidate-row', candidate.status]">
                      <div class="stale-candidate-head">
                        <span :class="['usage-state', candidate.status === 'pending' ? 'mentioned' : candidate.status === 'applied' ? 'verified' : 'ignored']">{{ candidate.status }}</span>
                        <strong>{{ candidate.relPath }}</strong>
                        <code>{{ candidate.recommendedAction }}</code>
                      </div>
                      <p>{{ candidate.conflictReason }}</p>
                      <div v-if="candidate.replacementMemory" class="stale-candidate-replacement">{{ candidate.replacementMemory }}</div>
                      <small>{{ candidate.currentSourceRelativePath }} · {{ formatTime(candidate.generatedAt) }}</small>
                      <div v-if="candidate.status === 'pending'" class="stale-candidate-actions">
                        <button class="btn btn-sm btn-primary" @click="resolveTypedMemoryStaleCandidate(candidate, candidate.recommendedAction === 'remove' ? 'confirm_remove' : 'confirm_update')">{{ candidate.recommendedAction === 'remove' ? '确认移除' : '确认更新' }}</button>
                        <button class="btn btn-sm btn-outline" @click="resolveTypedMemoryStaleCandidate(candidate, 'reject')">拒绝</button>
                      </div>
                      <div v-else-if="candidate.resolution" class="stale-candidate-resolution">{{ candidate.resolution.reason }} · {{ formatTime(candidate.resolution.resolvedAt) }}</div>
                    </article>
                  </div>
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
                <div v-if="taskAgentMemoryContextSnapshots" :class="['discipline-panel', taskAgentMemoryContextSnapshotState]">
                  <div class="discipline-head">
                    <div>
                      <strong>Task Agent Memory Snapshots</strong>
                      <span>{{ taskAgentMemoryContextSnapshots.directory || 'task-agent-memory-context-snapshots' }}</span>
                    </div>
                    <code>{{ taskAgentMemoryContextSnapshotState }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in taskAgentMemoryContextSnapshotCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="taskAgentMemoryContextSnapshotRows.length" class="hook-ledger-list">
                    <article v-for="row in taskAgentMemoryContextSnapshotRows" :key="`${row.snapshotId}:${row.snapshotFile}`" :class="row.status === 'ok' ? 'ok' : row.status === 'warn' ? 'warn' : 'fail'">
                      <span :class="['usage-state', row.status === 'fail' ? 'fail' : row.status === 'warn' ? 'warn' : 'verified']">{{ row.status }}</span>
                      <strong>{{ row.snapshotId || row.sessionId || 'snapshot' }}</strong>
                      <p>{{ compactDisplay(`${row.project || 'project'} · ${row.taskId || 'task'} · ${(row.gaps || [])[0]?.reason || row.workerContextPacketId || row.snapshotFile}`, 260) }}</p>
                      <code>{{ row.postTurnSummaryCapsuleChecksum ? `summary ${row.postTurnSummaryCapsuleSelectedCount || 0}` : row.prunable ? 'prunable' : row.gateCount ? `${row.gateCount} gates` : 'gate check' }}</code>
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
                <div v-if="compactStrategyDecision" :class="['discipline-panel', compactStrategyDecisionState]">
                  <div class="discipline-head">
                    <div>
                      <strong>压缩策略决策</strong>
                      <span>{{ compactStrategyDecision.decisionId || compactStrategyDecision.summaryChecksum || 'no decision' }}</span>
                    </div>
                    <code>{{ compactStrategyDecision.mode || compactStrategyDecision.status || 'waiting' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in compactStrategyDecisionCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div class="hook-ledger-list">
                    <article :class="compactStrategyDecision.invariantPass ? 'ok' : 'warn'">
                      <span :class="['usage-state', compactStrategyDecision.invariantPass ? 'verified' : 'waiting']">invariants</span>
                      <strong>{{ compactStrategyDecision.invariantPass ? 'pass' : 'needs check' }}</strong>
                      <p>{{ compactDisplay((compactStrategyDecision.failedInvariants || []).join(', ') || compactStrategyDecision.reason || 'strategy decision recorded', 220) }}</p>
                      <code>{{ compactStrategyDecision.decisionChecksum || 'checksum' }}</code>
                    </article>
                    <article v-if="compactStrategyDecision.transcriptPath" class="ok">
                      <span class="usage-state verified">raw</span>
                      <strong>transcript</strong>
                      <p>{{ compactDisplay(compactStrategyDecision.transcriptPath, 240) }}</p>
                      <code>{{ compactStrategyDecision.summaryChecksum || 'summary' }}</code>
                    </article>
                  </div>
                  <div v-if="compactStrategyDecisionGaps.length" class="discipline-gap-list">
                    <article v-for="gap in compactStrategyDecisionGaps" :key="`${gap.severity}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'fatal' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>{{ gap.invariant || compactStrategyDecision.mode || 'strategy' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="postCompactCleanupAudit" :class="['discipline-panel', postCompactCleanupAuditState]">
                  <div class="discipline-head">
                    <div>
                      <strong>压缩后清理审计</strong>
                      <span>{{ postCompactCleanupAudit.boundaryId || postCompactCleanupAudit.summaryChecksum || 'cleanup audit' }}</span>
                    </div>
                    <code>{{ postCompactCleanupAudit.auditStatus || postCompactCleanupAudit.status || 'waiting' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in postCompactCleanupAuditCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div v-if="postCompactCleanupAuditRows.length" class="hook-ledger-list">
                    <article v-for="row in postCompactCleanupAuditRows" :key="row.id || row.action" :class="row.status === 'missing' ? 'warn' : 'ok'">
                      <span :class="['usage-state', row.status === 'missing' ? 'waiting' : 'verified']">{{ row.status || 'recorded' }}</span>
                      <strong>{{ row.id || row.action }}</strong>
                      <p>{{ compactDisplay(row.action || row.evidence, 220) }}</p>
                      <code>{{ Array.isArray(row.evidence) ? row.evidence.length : (row.evidence || 'audit') }}</code>
                    </article>
                  </div>
                  <div v-if="postCompactCleanupAudit.transcriptPath" class="hook-ledger-list">
                    <article class="ok">
                      <span class="usage-state verified">raw</span>
                      <strong>transcript kept</strong>
                      <p>{{ compactDisplay(postCompactCleanupAudit.transcriptPath, 240) }}</p>
                      <code>{{ postCompactCleanupAudit.summaryChecksum || 'summary' }}</code>
                    </article>
                  </div>
                  <div v-if="postCompactCleanupAuditGaps.length" class="discipline-gap-list">
                    <article v-for="gap in postCompactCleanupAuditGaps" :key="`${gap.severity}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'fatal' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>{{ gap.checkId || postCompactCleanupAudit.mode || 'cleanup' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="apiMicroCompactEditPlan" :class="['discipline-panel', apiMicroCompactEditPlanState]">
                  <div class="discipline-head">
                    <div>
                      <strong>API Microcompact Edit Plan</strong>
                      <span>{{ apiMicroCompactEditPlan.planChecksum || apiMicroCompactEditPlan.reason || 'context management' }}</span>
                    </div>
                    <code>{{ apiMicroCompactEditPlan.editCount || 0 }} edits</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in apiMicroCompactEditPlanCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div v-if="apiMicroCompactEditPlanRows.length" class="hook-ledger-list">
                    <article v-for="row in apiMicroCompactEditPlanRows" :key="`${row.type}:${row.reason}`" :class="row.recommended ? 'ok' : 'warn'">
                      <span :class="['usage-state', row.recommended ? 'verified' : 'waiting']">{{ row.recommended ? 'edit' : 'advisory' }}</span>
                      <strong>{{ row.type }}</strong>
                      <p>{{ compactDisplay(row.reason || JSON.stringify(row.keep || row.trigger || {}), 220) }}</p>
                      <code>{{ row.keep === 'all' ? 'keep all' : row.keep?.value || row.trigger?.value || 'plan' }}</code>
                    </article>
                  </div>
                  <div v-if="apiMicroCompactEditPlanGaps.length" class="discipline-gap-list">
                    <article v-for="gap in apiMicroCompactEditPlanGaps" :key="`${gap.severity}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'fatal' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>api microcompact</strong>
                      <p>{{ compactDisplay(gap.reason, 180) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="apiMicrocompactReceiptDiscipline" :class="['discipline-panel', apiMicrocompactReceiptDisciplineState]">
                  <div class="discipline-head">
                    <div>
                      <strong>API Microcompact Receipt Discipline</strong>
                      <span>{{ apiMicrocompactReceiptDiscipline.planChecksum || apiMicrocompactReceiptDiscipline.status || 'receipt usage' }}</span>
                    </div>
                    <code>{{ formatMetric(apiMicrocompactReceiptDiscipline.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in apiMicrocompactReceiptDisciplineCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactReceiptDisciplineRows.length" class="hook-ledger-list">
                    <article v-for="row in apiMicrocompactReceiptDisciplineRows" :key="`${row.taskId}:${row.agent}`" :class="row.pass ? 'ok' : 'warn'">
                      <span :class="['usage-state', row.pass ? 'verified' : (row.session_mismatch_plan_checksums || []).length ? 'fail' : 'waiting']">{{ row.pass ? 'declared' : (row.session_mismatch_plan_checksums || []).length ? 'session' : 'missing' }}</span>
                      <strong>{{ row.agent || row.taskId || 'agent' }}</strong>
                      <p>{{ compactDisplay(`${(row.plan_checksums || []).join(', ')} · advisory ${row.advisory_count || 0} · native ${row.native_applied_count || 0} · session gaps ${(row.session_mismatch_plan_checksums || []).length}`, 240) }}</p>
                      <code>{{ row.taskId || 'task' }}</code>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactReceiptDisciplineGaps.length" class="discipline-gap-list">
                    <article v-for="gap in apiMicrocompactReceiptDisciplineGaps" :key="`${gap.taskId}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'high' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>{{ gap.agent || 'api microcompact' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 200) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="apiMicrocompactNativeApplyReadiness" :class="['discipline-panel', apiMicrocompactNativeApplyReadinessState]">
                  <div class="discipline-head">
                    <div>
                      <strong>API Microcompact Native Apply Readiness</strong>
                      <span>{{ apiMicrocompactNativeApplyReadiness.status || 'executor contract' }}</span>
                    </div>
                    <code>{{ formatMetric(apiMicrocompactNativeApplyReadiness.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in apiMicrocompactNativeApplyReadinessCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactNativeApplyReadinessRows.length" class="hook-ledger-list">
                    <article v-for="row in apiMicrocompactNativeApplyReadinessRows" :key="`${row.taskId}:${row.editPlanChecksum}`" :class="row.contractValid ? 'ok' : 'warn'">
                      <span :class="['usage-state', row.nativeReady ? 'verified' : row.contractValid ? 'waiting' : 'fail']">{{ row.nativeReady ? 'native ready' : row.contractValid ? 'advisory' : 'invalid' }}</span>
                      <strong>{{ row.agent || row.executor?.agentType || 'executor' }}</strong>
                      <p>{{ compactDisplay(`${row.mode || 'unknown'} · edit ${row.editPlanChecksum || 'missing'} · apply ${row.applyPlanChecksum || 'missing'} · session ${row.taskAgentSessionId || row.memoryContextSnapshotId || 'unbound'}`, 260) }}</p>
                      <code>{{ row.executor?.transport || row.taskId || 'task' }}</code>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactNativeApplyReadinessGaps.length" class="discipline-gap-list">
                    <article v-for="gap in apiMicrocompactNativeApplyReadinessGaps" :key="`${gap.taskId}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'high' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>{{ gap.agent || 'api microcompact' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 200) }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="apiMicrocompactNativeApplyProof" :class="['discipline-panel', apiMicrocompactNativeApplyProofState]">
                  <div class="discipline-head">
                    <div>
                      <strong>API Microcompact Native Apply Proof</strong>
                      <span>{{ apiMicrocompactNativeApplyProof.ledgerFile || apiMicrocompactNativeApplyProof.status || 'proof ledger' }}</span>
                    </div>
                    <code>{{ formatMetric(apiMicrocompactNativeApplyProof.score, '%') }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in apiMicrocompactNativeApplyProofCards" :key="card.label">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatMetric(card.value, card.suffix) }}</strong>
                      <small>{{ compactDisplay(card.note, 80) }}</small>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactNativeApplyProofRows.length" class="hook-ledger-list">
                    <article v-for="row in apiMicrocompactNativeApplyProofRows" :key="row.entryId || `${row.taskId}:${row.planChecksum}`" :class="row.nativeApplyStrongProof ? 'ok' : row.proofStatus === 'failed' || ['missing', 'stale', 'receipt_only'].includes(row.requestTelemetryStatus) || (row.proofStatus === 'verified' && (!row.requestTelemetrySessionBound || !row.requestTelemetryDispatchBound)) ? 'fail' : 'warn'">
                      <span :class="['usage-state', row.nativeApplyStrongProof ? 'verified' : row.proofStatus === 'failed' || ['missing', 'stale', 'receipt_only'].includes(row.requestTelemetryStatus) || (row.proofStatus === 'verified' && (!row.requestTelemetrySessionBound || !row.requestTelemetryDispatchBound)) ? 'fail' : 'waiting']">{{ row.nativeApplyStrongProof ? 'bound' : row.requestTelemetryStatus || row.proofStatus || 'proof' }}</span>
                      <strong>{{ row.agent || row.targetProject || 'executor' }}</strong>
                      <p>{{ compactDisplay(`plan ${row.planChecksum || 'missing'} · request ${row.requestPatchChecksum || 'missing'} · session ${row.requestTelemetrySessionStatus || row.taskAgentSessionId || 'unbound'} · dispatch ${row.requestTelemetryDispatchStatus || 'unbound'} · runner ${row.requestTelemetryRunnerRequestId || 'none'} · telemetry ${row.requestTelemetrySource || row.requestTelemetryEntryId || row.requestTelemetryStatus || 'missing'} · age ${row.requestTelemetryAgeMs ?? 'n/a'}`, 340) }}</p>
                      <code>{{ row.taskId || row.generatedAt || 'ledger' }}</code>
                    </article>
                  </div>
                  <div v-if="apiMicrocompactNativeApplyProofGaps.length" class="discipline-gap-list">
                    <article v-for="gap in apiMicrocompactNativeApplyProofGaps" :key="`${gap.taskId}:${gap.reason}`">
                      <span :class="['usage-state', gap.severity === 'high' ? 'fail' : 'warn']">{{ gap.severity || 'gap' }}</span>
                      <strong>{{ gap.agent || 'native proof' }}</strong>
                      <p>{{ compactDisplay(gap.reason, 220) }}</p>
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
                <div v-if="semanticRecallRows.length" class="recall-diagnostic-list">
                  <div class="recall-diagnostic-head">
                    <strong>自然语言语义召回</strong>
                    <span>matched {{ semanticRecallScoring.boosted_count || 0 }} · conflict {{ semanticRecallScoring.conflict_penalized_count || 0 }} · dedup {{ semanticRecallScoring.semantic_duplicate_count || 0 }}</span>
                  </div>
                  <article v-for="row in semanticRecallRows.slice(0, 8)" :key="`semantic:${row.kind}:${row.relPath}`" :class="['recall-diagnostic-row', `semantic-${row.kind}`]">
                    <span>{{ row.kind === 'conflict' ? '冲突' : row.kind === 'duplicate' ? '去重' : '匹配' }}</span>
                    <strong :title="(row.concepts || []).join(', ')">{{ row.relPath }}<template v-if="row.duplicateOf"> → {{ row.duplicateOf }}</template></strong>
                    <code>{{ formatSigned(row.adjustment) }}</code>
                  </article>
                </div>
                <div v-if="typedMemoryDistillationTransaction" :class="['discipline-panel', !typedMemoryDistillationTransaction.stateValid || !typedMemoryDistillationTransaction.lockValid || typedMemoryDistillationTransaction.lockStale || typedMemoryDistillationTransaction.status === 'failed' ? 'fail' : typedMemoryDistillationTransaction.lockActive ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>长期记忆提交事务</strong>
                      <span>会话级租约 · fencing token · 崩溃接管</span>
                    </div>
                    <code>{{ typedMemoryDistillationTransaction.status }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article><span>Fencing</span><strong>{{ typedMemoryDistillationTransaction.fencingToken || 0 }}</strong><small>提交 {{ typedMemoryDistillationTransaction.lastCommittedFencingToken || 0 }}</small></article>
                    <article><span>锁状态</span><strong>{{ typedMemoryDistillationTransaction.lockActive ? 'active' : typedMemoryDistillationTransaction.lockStale ? 'stale' : 'released' }}</strong><small>{{ typedMemoryDistillationTransaction.lockValid ? 'checksum valid' : 'checksum failed' }}</small></article>
                    <article><span>崩溃接管</span><strong>{{ typedMemoryDistillationTransaction.recoveredLeaseCount || 0 }}</strong><small>abandoned lease</small></article>
                    <article><span>竞争等待</span><strong>{{ formatNumber(typedMemoryDistillationTransaction.waitedMs || 0) }} ms</strong><small>{{ formatTime(typedMemoryDistillationTransaction.committedAt) }}</small></article>
                  </div>
                  <div v-if="typedMemoryDistillationTransaction.error" class="post-compact-error">{{ typedMemoryDistillationTransaction.error }}</div>
                </div>
                <div v-if="typedMemoryDistillationPreflight" :class="['discipline-panel', typedMemoryDistillationPreflight.recoveryRequired ? 'warn' : typedMemoryDistillationPreflight.runRequired ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>蒸馏增量探针</strong>
                      <span>当前群聊会话游标 · 锁前只读检查</span>
                    </div>
                    <code>{{ typedMemoryDistillationPreflight.runRequired ? 'work pending' : 'caught up' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article><span>待处理消息</span><strong>{{ formatNumber(typedMemoryDistillationPreflight.pendingMessageCount || 0) }}</strong><small>本批 {{ formatNumber(typedMemoryDistillationPreflight.selectedMessageCount || 0) }}</small></article>
                    <article><span>事务锁</span><strong>{{ typedMemoryDistillationPreflight.lockRequired ? 'required' : 'skipped' }}</strong><small>{{ typedMemoryDistillationPreflight.reason || 'caught up' }}</small></article>
                    <article><span>维护任务</span><strong>{{ typedMemoryDistillationPreflight.maintenanceRequired ? 'pending' : 'none' }}</strong><small>{{ typedMemoryDistillationPreflight.maintenanceReasons?.join(' · ') || 'no maintenance' }}</small></article>
                    <article><span>恢复任务</span><strong>{{ typedMemoryDistillationPreflight.recoveryRequired ? 'pending' : 'none' }}</strong><small>{{ typedMemoryDistillationPreflight.recoveryReasons?.join(' · ') || 'clean' }}</small></article>
                  </div>
                </div>
                <div v-if="typedMemoryArtifactTransaction" :class="['discipline-panel', !typedMemoryArtifactTransaction.valid || typedMemoryArtifactTransaction.corrupt ? 'fail' : typedMemoryArtifactTransaction.status === 'prepared' ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>记忆多工件提交</strong>
                      <span>topic Markdown · MEMORY.md · ledger</span>
                    </div>
                    <code>{{ typedMemoryArtifactTransaction.status }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article><span>提交工件</span><strong>{{ typedMemoryArtifactTransaction.artifactCount || 0 }}</strong><small>{{ typedMemoryArtifactTransaction.mutationKind || 'memory mutation' }}</small></article>
                    <article><span>Journal</span><strong>{{ typedMemoryArtifactTransaction.valid ? 'valid' : 'invalid' }}</strong><small>{{ typedMemoryArtifactTransaction.checksumValid ? 'checksum valid' : 'checksum failed' }}</small></article>
                    <article><span>恢复动作</span><strong>{{ typedMemoryArtifactTransaction.recoveryAction ? (typedMemoryArtifactTransaction.recoveryAction.includes('rollforward') ? 'rollforward' : 'rollback') : 'none' }}</strong><small>{{ formatTime(typedMemoryArtifactTransaction.recoveredAt || typedMemoryArtifactTransaction.committedAt) }}</small></article>
                    <article><span>Artifact Fence</span><strong>{{ typedMemoryArtifactTransaction.fencingToken || 0 }}</strong><small>{{ typedMemoryArtifactTransaction.targets?.slice(0, 2).join(' · ') || 'no targets' }}</small></article>
                  </div>
                </div>
                <div v-if="typedMemoryEntrypoint" :class="['discipline-panel', typedMemoryEntrypoint.injectionTruncated ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>MEMORY.md 索引容量</strong>
                      <span>磁盘保持完整 · 子 Agent 注入按 Claude Code 容量投影</span>
                    </div>
                    <code>{{ typedMemoryEntrypoint.injectionTruncated ? 'bounded' : 'full' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article><span>主题文件</span><strong>{{ formatNumber(typedMemoryEntrypoint.documentCount || 0) }}</strong><small>完整可发现</small></article>
                    <article><span>磁盘索引</span><strong>{{ formatNumber(typedMemoryEntrypoint.diskLineCount || 0) }} 行</strong><small>{{ formatBytes(typedMemoryEntrypoint.diskBytes || 0) }}</small></article>
                    <article><span>注入投影</span><strong>{{ formatNumber(typedMemoryEntrypoint.injectionLineCount || 0) }} 行</strong><small>{{ formatBytes(typedMemoryEntrypoint.injectionBytes || 0) }}</small></article>
                    <article><span>容量上限</span><strong>{{ formatNumber(typedMemoryEntrypoint.maxInjectionLines || 200) }} 行</strong><small>{{ formatBytes(typedMemoryEntrypoint.maxInjectionBytes || 25000) }}</small></article>
                  </div>
                </div>
                <div v-if="typedMemoryDirectOperations" :class="['discipline-panel', typedMemoryDirectOperations.rejectedThisRun ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>会话直接记忆事务</strong>
                      <span>remember / forget · 唯一目标绑定 · 删除 tombstone</span>
                    </div>
                    <code>{{ typedMemoryDirectOperations.receiptCount || 0 }} receipts</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in typedMemoryDirectOperationCards" :key="`direct-memory:${card.label}`">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatNumber(card.value) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="typedMemoryDirectOperations.recentReceipts?.length" class="discipline-gap-list">
                    <article v-for="row in typedMemoryDirectOperations.recentReceipts" :key="row.requestId">
                      <span :class="['usage-state', row.status === 'committed' ? 'verified' : row.status === 'duplicate' ? 'used' : 'ignored']">{{ row.status }}</span>
                      <strong>{{ row.memoryId || row.requestId }}</strong>
                      <p>{{ row.action }} · {{ row.reason }}</p>
                    </article>
                  </div>
                </div>
                <div v-if="typedMemoryWriteAdmission" class="discipline-panel ok">
                  <div class="discipline-head">
                    <div>
                      <strong>长期记忆写入准入</strong>
                      <span>Claude Code 非流水门槛 · failure 与 success 均可记忆 · 拒绝记录不保存正文</span>
                    </div>
                    <code>{{ typedMemoryWriteAdmission.admittedThisRun || 0 }}/{{ typedMemoryWriteAdmission.evaluatedThisRun || 0 }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in typedMemoryWriteAdmissionCards" :key="`write-admission:${card.label}`">
                      <span>{{ card.label }}</span>
                      <strong>{{ formatNumber(card.value) }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                </div>

                <div v-if="typedMemoryConsumptionLedger" :class="['discipline-panel', typedMemoryConsumptionLedger.checksumValid === false || typedMemoryConsumptionLedger.invalidEntryCount ? 'fail' : typedMemoryConsumptionLedger.staleEntryCount || typedMemoryConsumptionLedger.anomalyEntryCount ? 'warn' : 'ok']">
                  <div class="discipline-head">
                    <div>
                      <strong>类型化记忆消费反馈</strong>
                      <span>half-life {{ typedMemoryConsumptionScoring.half_life_days || 30 }} 天 · 当前群聊会话独立账本</span>
                    </div>
                    <code>{{ typedMemoryConsumptionLedger.checksumValid === false ? 'fail' : typedMemoryConsumptionLedger.anomalyEntryCount ? 'review' : 'trusted' }}</code>
                  </div>
                  <div class="discipline-cards">
                    <article v-for="card in typedMemoryConsumptionCards" :key="`consumption:${card.label}`">
                      <span>{{ card.label }}</span>
                      <strong>{{ card.value }}</strong>
                      <small>{{ card.note }}</small>
                    </article>
                  </div>
                  <div v-if="typedMemoryConsumptionRows.length" class="recall-diagnostic-list consumption-diagnostic-list">
                    <div class="recall-diagnostic-head">
                      <strong>消费证据对本轮召回的影响</strong>
                      <span>matched {{ typedMemoryConsumptionScoring.matched_doc_count || 0 }}</span>
                    </div>
                    <article v-for="row in typedMemoryConsumptionRows.slice(0, 8)" :key="`consumption:${row.kind}:${row.relPath}`" :class="['recall-diagnostic-row', `consumption-${row.kind}`]">
                      <span>{{ row.kind === 'conflict' ? '冲突' : row.kind === 'deprioritized' ? '降权' : '加权' }}</span>
                      <strong>{{ row.relPath }}</strong>
                      <code>{{ formatSigned(row.adjustment) }}</code>
                    </article>
                  </div>
                  <div v-if="typedMemoryConsumptionLedger.staleRows?.length" class="recent-usage-list consumption-stale-list">
                    <div class="recall-diagnostic-head"><strong>已过期消费证据</strong><span>{{ typedMemoryConsumptionLedger.staleEntryCount }} rows</span></div>
                    <article v-for="row in typedMemoryConsumptionLedger.staleRows.slice(0, 6)" :key="row.entryId" class="recent-usage-row">
                      <span :class="['usage-state', row.usageState]">{{ row.usageState }}</span>
                      <strong>{{ row.relPath }}</strong>
                      <p>{{ row.ageDays }} 天 · {{ row.targetProject || 'agent' }}</p>
                    </article>
                  </div>
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

    <div v-if="dispatchResolveState" class="mc-modal-overlay" @click.self="dispatchResolveState = null">
      <div class="mc-modal">
        <div><span class="panel-kicker">DISPATCH RESOLUTION</span><h3>{{ dispatchActionLabel(dispatchResolveState.action) }}</h3></div>
        <div class="dispatch-resolve-identity">
          <code>{{ dispatchResolveState.row.ticketId }}</code>
          <span>{{ dispatchResolveState.row.groupId }} · {{ dispatchResolveState.row.groupSessionId }} · {{ dispatchResolveState.row.taskAgentSessionId }}</span>
        </div>
        <label>操作原因<textarea v-model="dispatchResolveState.reason" rows="3" placeholder="记录本次派发恢复处理原因"></textarea></label>
        <div class="modal-actions"><button class="btn" :disabled="dispatchResolveLoading" @click="dispatchResolveState = null">取消</button><button class="btn" :class="['cancel_prepared', 'prune_terminal'].includes(dispatchResolveState.action) ? 'btn-danger' : 'btn-primary'" :disabled="dispatchResolveLoading || !dispatchResolveState.reason.trim()" @click="submitDispatchResolve">{{ dispatchResolveLoading ? '处理中…' : '确认执行' }}</button></div>
      </div>
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
        <div><span class="panel-kicker">MEMORY MAINTENANCE</span><h3>{{ operationTitle(operationState.operation) }}</h3></div>
        <p class="modal-note">{{ operationNote(operationState.operation) }}</p>
        <label v-if="operationState.operation === 'block_pattern'">文本或正则规则<input v-model="operationState.pattern" placeholder="例如：客户手机号|内部代号" /></label>
        <label>操作原因<textarea v-model="operationState.reason" rows="3" placeholder="建议记录本次维护的原因"></textarea></label>
        <div class="modal-actions"><button class="btn" @click="operationState = null">取消</button><button class="btn" :class="['rollback','disable'].includes(operationState.operation) ? 'btn-danger' : 'btn-primary'" :disabled="!operationState.reason.trim() || (operationState.operation === 'block_pattern' && !operationState.pattern.trim()) || (operationState.operation === 'archive_selftest_residue' && (selftestResidueArchiveLoading || !globalSelftestHasResidue || globalSelftestHasActivePollution)) || (operationState.operation === 'prune_task_agent_memory_context_snapshots' && (taskAgentSnapshotRetentionLoading || !taskAgentSnapshotHasPrunable))" @click="runOperation">{{ operationState.operation === 'archive_selftest_residue' ? '归档残留' : operationState.operation === 'prune_task_agent_memory_context_snapshots' ? '清理快照' : '执行' }}</button></div>
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
.context-capacity-panel{margin:0 0 12px;padding:16px;border-radius:8px}.context-capacity-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.context-capacity-head h3{font-size:16px;margin-top:4px}.context-capacity-actions{display:flex;gap:8px}.context-preset-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}.context-preset{min-height:76px;padding:11px;text-align:left;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.42);color:var(--text-primary);cursor:pointer;display:flex;flex-direction:column;gap:4px}.context-preset:hover{border-color:rgba(var(--accent-blue-rgb),.28)}.context-preset.active{border-color:var(--accent-blue);box-shadow:0 0 0 1px rgba(var(--accent-blue-rgb),.16);background:rgba(var(--accent-blue-rgb),.05)}.context-preset strong{font-size:12px}.context-preset span{font-size:9px;line-height:1.4;color:var(--text-muted)}.context-capacity-note{margin:10px 0;color:var(--text-muted);font-size:9px}.context-field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.context-field-grid label{padding:11px;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.3);display:flex;flex-direction:column;gap:7px}.context-field-grid label>span{font-size:11px;font-weight:800}.context-field-grid input{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface-color);color:var(--text-primary);font-family:var(--font-tech);font-size:12px}.context-field-grid input:disabled{opacity:.7}.context-field-grid small{font-size:8px;line-height:1.45;color:var(--text-muted)}
.capacity-runtime-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:10px 0;margin-bottom:10px;border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color)}.capacity-runtime-strip span{min-width:0;display:flex;flex-direction:column;gap:3px}.capacity-runtime-strip small{font-size:8px;color:var(--text-muted)}.capacity-runtime-strip strong{font-family:var(--font-tech);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.retention-toggle-row{display:flex;align-items:center;gap:9px;min-height:36px}.context-field-grid .retention-toggle-row input{width:18px;height:18px;padding:0}.retention-toggle-row strong{font-size:10px;color:var(--accent-blue)}.retention-maintenance-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);font-size:9px;color:var(--text-muted)}.retention-maintenance-row>div{display:flex;gap:6px}.retention-maintenance-row .danger{color:var(--accent-red);border-color:rgba(239,68,68,.2)}
.provider-capability-editor{margin:0 0 12px;padding:12px 0;border-bottom:1px solid var(--border-color)}.provider-capability-editor .context-capacity-head h3{font-size:13px}.provider-capability-fields{grid-template-columns:repeat(4,minmax(0,1fr));margin-top:9px}.provider-capability-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 14px;margin-top:10px}.provider-capability-list>span{min-width:0;padding:8px 0;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:8px}.provider-capability-list>span>span{min-width:0;display:flex;flex-direction:column;gap:3px}.provider-capability-list strong,.provider-capability-list small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.provider-capability-list strong{font-size:10px}.provider-capability-list small{font-size:8px;color:var(--text-muted)}.provider-capability-list .capability-revoke{flex:0 0 auto;padding:5px 7px;font-size:8px}
.capability-downgrade-list{margin-top:8px;border-top:1px solid rgba(239,68,68,.2)}.capability-downgrade-list>span{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-color)}.capability-downgrade-list strong{font-size:9px;color:var(--accent-red)}.capability-downgrade-list small{font-size:8px;color:var(--text-muted);text-align:right}
.capability-refresh-list{margin-top:8px;border-top:1px solid var(--border-color)}.capability-refresh-list>span{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-color)}.capability-refresh-list strong{font-size:9px;color:var(--accent-blue)}.capability-refresh-list small{font-size:8px;color:var(--text-muted);text-align:right}
.capability-health-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 12px;margin-top:8px}.capability-health-list>span{min-width:0;padding:7px 0;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:3px}.capability-health-list strong{font-size:9px}.capability-health-list strong.degraded,.capability-health-list strong.unsupported{color:var(--accent-red)}.capability-health-list strong.healthy{color:var(--accent-green)}.capability-health-list small{font-size:8px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.capability-recovery-proof{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:8px;border:1px solid rgba(16,185,129,.2);border-radius:8px;background:rgba(16,185,129,.05)}.capability-recovery-proof strong{font-size:9px;color:var(--accent-green)}.capability-recovery-proof small{font-size:8px;color:var(--text-muted);text-align:right}.invalid-refresh-outcome-list{margin-top:8px;border-top:1px solid rgba(239,68,68,.18)}.invalid-refresh-outcome-list>span{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color)}.invalid-refresh-outcome-list>span>span{min-width:0;display:flex;flex-direction:column;gap:3px}.invalid-refresh-outcome-list strong{font-size:9px;color:var(--accent-red);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.invalid-refresh-outcome-list small{font-size:8px;color:var(--text-muted)}.invalid-outcome-ack{white-space:nowrap;color:var(--accent-green)!important}
.memory-center{height:100%;overflow:auto;padding:18px 20px 36px;color:var(--text-primary)}
.aura-card{background:var(--bg-card);border:1px solid var(--border-color);box-shadow:var(--shadow-lg);backdrop-filter:blur(24px) saturate(150%)}
.mc-header{border-radius:16px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:24px}.eyebrow,.panel-kicker{font-family:var(--font-tech);font-size:10px;letter-spacing:1.8px;color:var(--accent-blue);font-weight:700}.mc-header h2{font-size:24px;margin:5px 0 4px}.mc-header p,.detail-header p,.modal-note{color:var(--text-muted);font-size:13px;line-height:1.55}.header-actions{display:flex;align-items:center;gap:12px}.sync-time{font-size:11px;color:var(--text-muted)}
.summary-strip{display:grid;grid-template-columns:repeat(6,minmax(145px,1fr));gap:10px;margin:12px 0}.summary-card{min-height:105px;padding:16px;border-radius:13px;background:rgba(255,255,255,.55);border:1px solid var(--border-color);display:flex;flex-direction:column}.summary-label{font-size:11px;color:var(--text-muted);font-weight:700}.summary-card strong{font-family:var(--font-tech);font-size:24px;margin:9px 0 5px}.summary-card small{font-size:10px;color:var(--text-muted);line-height:1.4}.summary-card.warning strong,.summary-card.risk strong{color:var(--accent-yellow)}
.global-alerts{display:flex;min-width:0;flex-direction:column;gap:6px;margin:-2px 0 12px}.global-alert{display:grid;min-width:0;grid-template-columns:7px auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);font-size:10px}.global-alert>span{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.global-alert strong{font-family:monospace}.global-alert strong,.global-alert p,.global-alert small{min-width:0;overflow-wrap:anywhere}.global-alert p{color:var(--text-secondary)}.global-alert small{color:var(--text-muted)}.global-alert.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.global-alert.critical>span{background:var(--accent-red)}
.quality-panel{border-radius:16px;padding:18px;margin:12px 0}.quality-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.quality-panel-head h3{font-size:17px;margin:4px 0}.quality-panel-head p{font-size:11px;color:var(--text-muted);line-height:1.5}.quality-score{min-width:112px;padding:12px 14px;border-radius:13px;background:rgba(100,116,139,.08);text-align:right}.quality-score strong{display:block;font-family:var(--font-tech);font-size:26px}.quality-score span,.quality-score small{display:block;font-size:10px;color:var(--text-muted)}.quality-score small{margin-top:4px;max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quality-score.ok strong{color:var(--accent-green)}.quality-score.warn strong{color:var(--accent-yellow)}.quality-score.fail strong{color:var(--accent-red)}.quality-check-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}.quality-check-card{min-width:0;padding:12px;border-radius:11px;border:1px solid var(--border-color);background:rgba(255,255,255,.42)}.quality-check-card.ok{border-color:rgba(16,185,129,.18);background:rgba(16,185,129,.045)}.quality-check-card.warn{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.06)}.quality-check-card.fail{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.055)}.quality-check-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.quality-check-top strong{min-width:0;font-size:12px;color:var(--text-primary);overflow-wrap:anywhere}.quality-check-actions{display:flex;align-items:center;gap:5px;flex:0 0 auto}.quality-check-top span{font-family:var(--font-tech);font-size:13px;color:var(--accent-blue)}.quality-refresh-btn{width:24px;height:24px;border-radius:8px;border:1px solid rgba(37,99,235,.18);background:rgba(37,99,235,.06);color:var(--accent-blue);font-size:13px;font-weight:900;line-height:1;cursor:pointer}.quality-refresh-btn:disabled{cursor:not-allowed;opacity:.52}.quality-check-card p{min-height:42px;margin:8px 0 10px;font-size:9.5px;line-height:1.45;color:var(--text-muted)}.quality-check-stats{display:flex;gap:5px;flex-wrap:wrap}.quality-check-stats span{padding:3px 6px;border-radius:999px;background:rgba(15,23,42,.055);font-size:9px;color:var(--text-secondary)}.quality-check-detail{margin-top:8px;font-size:9px;color:var(--text-muted)}.quality-check-detail summary{cursor:pointer;font-weight:800}.quality-check-detail ul{margin:6px 0 0;padding-left:16px;line-height:1.45}.quality-next-actions{display:flex;min-width:0;gap:6px;flex-wrap:wrap;margin-top:12px}.quality-next-actions strong{font-size:10px;color:var(--text-muted);padding:4px 0}.quality-next-actions span{max-width:100%;padding:5px 8px;border-radius:999px;background:rgba(245,158,11,.08);color:#a16207;font-size:9px;overflow-wrap:anywhere}
.selftest-residue-panel{margin-top:12px;border:1px solid rgba(16,185,129,.16);border-radius:12px;background:rgba(16,185,129,.04);overflow:hidden}.selftest-residue-panel.warn{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.selftest-residue-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.selftest-residue-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid var(--border-color)}.selftest-residue-head h4{font-size:13px;margin-top:3px}.selftest-residue-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.selftest-residue-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}.selftest-residue-cards article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.selftest-residue-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.selftest-residue-cards strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue);overflow-wrap:anywhere}.selftest-residue-cards small{font-size:7px;color:var(--text-muted);line-height:1.35}.selftest-residue-result{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 9px 9px;font-size:9px;color:var(--text-muted)}.selftest-residue-result strong{font-size:10px;color:var(--text-primary)}.selftest-residue-result span{padding:3px 6px;border-radius:999px;background:rgba(100,116,139,.08)}.selftest-residue-list{border-top:1px solid var(--border-color)}.selftest-residue-list article{display:grid;grid-template-columns:64px minmax(80px,150px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.selftest-residue-list article:first-child{border-top:0}.selftest-residue-list article.warn{background:rgba(245,158,11,.045)}.selftest-residue-list article.fail{background:rgba(239,68,68,.045)}.selftest-residue-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selftest-residue-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.task-agent-snapshot-panel{margin-top:12px;border:1px solid rgba(var(--accent-blue-rgb),.14);border-radius:12px;background:rgba(var(--accent-blue-rgb),.035);overflow:hidden}.task-agent-snapshot-panel.warn,.task-agent-snapshot-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.task-agent-snapshot-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.task-agent-snapshot-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid var(--border-color)}.task-agent-snapshot-head h4{font-size:13px;margin-top:3px}.task-agent-snapshot-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.task-agent-snapshot-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}.task-agent-snapshot-cards article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.task-agent-snapshot-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.task-agent-snapshot-cards strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue);overflow-wrap:anywhere}.task-agent-snapshot-cards small{font-size:7px;color:var(--text-muted);line-height:1.35}.task-agent-snapshot-result{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:0 9px 9px;font-size:9px;color:var(--text-muted)}.task-agent-snapshot-result strong{font-size:10px;color:var(--text-primary)}.task-agent-snapshot-result span{padding:3px 6px;border-radius:999px;background:rgba(100,116,139,.08)}.task-agent-snapshot-list{border-top:1px solid var(--border-color)}.task-agent-snapshot-list article{display:grid;grid-template-columns:64px minmax(110px,210px) minmax(0,1fr) 80px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.task-agent-snapshot-list article:first-child{border-top:0}.task-agent-snapshot-list article.warn{background:rgba(245,158,11,.045)}.task-agent-snapshot-list article.fail{background:rgba(239,68,68,.045)}.task-agent-snapshot-list article.ok{background:rgba(16,185,129,.035)}.task-agent-snapshot-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.task-agent-snapshot-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.task-agent-snapshot-list code{font-size:8px;color:var(--text-muted);text-align:right}
.cross-group-quality-panel{margin-top:12px;border:1px solid rgba(var(--accent-blue-rgb),.12);border-radius:12px;background:rgba(var(--accent-blue-rgb),.035);overflow:hidden}.cross-group-quality-panel.warn,.cross-group-quality-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.cross-group-quality-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.cross-group-quality-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid var(--border-color)}.cross-group-quality-head h4{font-size:13px;margin-top:3px}.cross-group-quality-actions{display:flex;gap:5px}.cross-group-quality-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}.cross-group-quality-cards article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.cross-group-quality-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.cross-group-quality-cards strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue)}.cross-group-quality-cards small{font-size:7px;color:var(--text-muted);line-height:1.35}.cross-group-quality-table{border-top:1px solid var(--border-color)}.cross-group-quality-table article{display:grid;grid-template-columns:64px minmax(130px,230px) minmax(0,1fr) 92px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.cross-group-quality-table article:first-child{border-top:0}.cross-group-quality-table article.ok{background:rgba(16,185,129,.035)}.cross-group-quality-table article.warn,.cross-group-quality-table article.waiting{background:rgba(245,158,11,.045)}.cross-group-quality-table article.fail{background:rgba(239,68,68,.045)}.cross-group-quality-table strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cross-group-quality-table p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.cross-group-quality-table code{font-size:8px;color:var(--text-muted);text-align:right}.cross-group-quality-empty{padding:13px 10px;border-top:1px solid var(--border-color);font-size:10px;color:var(--text-muted);text-align:center}
.ignore-memory-receipt-panel{margin-top:12px;border:1px solid rgba(16,185,129,.16);border-radius:12px;background:rgba(16,185,129,.04);overflow:hidden}.ignore-memory-receipt-panel.warn,.ignore-memory-receipt-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.ignore-memory-receipt-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.ignore-memory-receipt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid var(--border-color)}.ignore-memory-receipt-head h4{font-size:13px;margin-top:3px}.ignore-memory-receipt-actions{display:flex;gap:5px;justify-content:flex-end}.ignore-memory-receipt-cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;padding:9px}.ignore-memory-receipt-cards article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.ignore-memory-receipt-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.ignore-memory-receipt-cards strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue);overflow-wrap:anywhere}.ignore-memory-receipt-cards small{font-size:7px;color:var(--text-muted);line-height:1.35}.ignore-memory-receipt-list{border-top:1px solid var(--border-color)}.ignore-memory-receipt-list article{display:grid;grid-template-columns:64px minmax(130px,220px) minmax(0,1fr) 120px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.ignore-memory-receipt-list article:first-child{border-top:0}.ignore-memory-receipt-list article.ok{background:rgba(16,185,129,.035)}.ignore-memory-receipt-list article.warn,.ignore-memory-receipt-list article.waiting{background:rgba(245,158,11,.045)}.ignore-memory-receipt-list article.fail{background:rgba(239,68,68,.045)}.ignore-memory-receipt-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ignore-memory-receipt-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.ignore-memory-receipt-list code{font-size:8px;color:var(--text-muted);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ignore-memory-receipt-empty{padding:13px 10px;border-top:1px solid var(--border-color);font-size:10px;color:var(--text-muted);text-align:center}
.ignore-memory-receipt-work-list{border-top:1px solid var(--border-color);background:rgba(var(--accent-blue-rgb),.025)}.ignore-memory-receipt-work-list article{display:grid;grid-template-columns:74px minmax(140px,230px) minmax(0,1fr) minmax(128px,auto);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.ignore-memory-receipt-work-list article.pending{background:rgba(var(--accent-blue-rgb),.035)}.ignore-memory-receipt-work-list article.in_progress{background:rgba(99,102,241,.045)}.ignore-memory-receipt-work-list article.blocked,.ignore-memory-receipt-work-list article.warn{background:rgba(245,158,11,.055)}.ignore-memory-receipt-work-list article.completed,.ignore-memory-receipt-work-list article.ok{background:rgba(16,185,129,.035)}.ignore-memory-receipt-work-list article.fail{background:rgba(239,68,68,.045)}.ignore-memory-receipt-work-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ignore-memory-receipt-work-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}
.workspace-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px;min-height:620px}.scope-panel,.detail-panel{border-radius:16px;min-height:0}.scope-panel{padding:18px 10px}.panel-title-row{display:flex;align-items:center;justify-content:space-between;padding:0 8px 14px}.panel-title-row h3{font-size:17px;margin-top:3px}.count-badge{font-family:var(--font-tech);font-size:11px;padding:4px 8px;border-radius:20px;background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.scope-list{display:flex;flex-direction:column;gap:5px;max-height:700px;overflow:auto}.scope-item{border:1px solid transparent;background:transparent;border-radius:10px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;color:var(--text-primary);cursor:pointer;transition:.2s}.scope-item:hover{background:rgba(var(--accent-blue-rgb),.05)}.scope-item.active{background:rgba(var(--accent-blue-rgb),.1);border-color:rgba(var(--accent-blue-rgb),.18)}.scope-mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-family:var(--font-tech);font-size:11px;color:white;background:var(--accent-purple)}.scope-mark.project{background:var(--accent-blue)}.scope-mark.warning,.scope-mark.critical{box-shadow:0 0 0 3px rgba(245,158,11,.12)}.scope-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.scope-copy strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scope-copy small{font-size:10px;color:var(--text-muted)}.health-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-green)}.alert-count{font-size:10px;color:#fff;background:var(--accent-yellow);padding:2px 6px;border-radius:10px}
.detail-panel{padding:20px;overflow:hidden}.detail-header{display:flex;justify-content:space-between;gap:22px;align-items:flex-start}.detail-header h3{font-size:22px;margin:6px 0 5px}.detail-header>div:first-child{min-width:0}.detail-header>div:first-child>p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:760px}.scope-meta{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text-muted)}.status-pill{padding:3px 7px;border-radius:10px;background:rgba(16,185,129,.1);color:var(--accent-green);font-weight:800}.status-pill.warning{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.status-pill.critical{background:rgba(239,68,68,.1);color:var(--accent-red)}.maintenance-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.alerts-block{margin-top:14px;display:flex;flex-direction:column;gap:6px}.alert-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);border-radius:9px;font-size:11px}.alert-row.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.alert-signal{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.critical .alert-signal{background:var(--accent-red)}
.context-meter{margin-top:15px;padding:14px;border-radius:11px;background:rgba(var(--accent-blue-rgb),.035);border:1px solid rgba(var(--accent-blue-rgb),.08)}.meter-copy,.meter-notes{display:flex;justify-content:space-between;gap:12px}.meter-copy{font-size:11px}.meter-copy strong{font-family:var(--font-tech);color:var(--accent-blue)}.meter-track{height:5px;background:rgba(var(--accent-blue-rgb),.1);border-radius:4px;margin:9px 0;overflow:hidden}.meter-track span{display:block;height:100%;background:var(--gradient-cyber);border-radius:4px}.meter-notes{font-size:9px;color:var(--text-muted)}
.view-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-top:15px}.view-tabs button{border:0;background:transparent;color:var(--text-muted);padding:10px 13px;font-size:11px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent}.view-tabs button.active{color:var(--accent-blue);border-bottom-color:var(--accent-blue)}.view-tabs span{margin-left:4px;padding:1px 5px;border-radius:8px;background:rgba(var(--accent-blue-rgb),.08)}
.memory-toolbar{display:flex;min-width:0;flex-direction:column;gap:8px;padding:13px 0 8px}.type-filters{display:flex;width:100%;min-width:0;max-width:100%;gap:5px;overflow-x:auto;padding-bottom:3px}.type-filters button{flex:0 0 auto;white-space:nowrap;border:1px solid var(--border-color);background:rgba(255,255,255,.4);border-radius:16px;padding:5px 9px;font-size:10px;color:var(--text-muted);cursor:pointer}.type-filters button.active{border-color:rgba(var(--accent-blue-rgb),.25);background:rgba(var(--accent-blue-rgb),.08);color:var(--accent-blue)}.memory-search{width:100%;padding:7px 10px;font-size:11px}.memory-stats-line{display:flex;gap:14px;font-size:10px;color:var(--text-muted);padding:2px 0 10px}.memory-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:560px;overflow:auto;padding-right:4px}.memory-group{border:1px solid var(--border-color);border-radius:11px;padding:10px;background:rgba(255,255,255,.25)}.group-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.group-heading h4{font-size:12px}.group-heading span{font-family:var(--font-tech);font-size:9px;color:var(--text-muted)}.memory-item{padding:10px;border-radius:9px;background:rgba(255,255,255,.55);border:1px solid transparent;margin-top:7px}.memory-item.pinned{border-color:rgba(var(--accent-blue-rgb),.25)}.memory-item.deprecated{opacity:.58;border-style:dashed}.memory-item p{font-size:11px;line-height:1.6;white-space:pre-wrap}.item-state{display:flex;gap:4px;margin-bottom:5px;min-height:14px}.state-tag{font-size:8px;font-weight:800;padding:2px 5px;border-radius:6px}.state-tag.pin{color:var(--accent-blue);background:rgba(var(--accent-blue-rgb),.1)}.state-tag.edit{color:var(--accent-purple);background:rgba(99,102,241,.1)}.state-tag.off{color:var(--accent-red);background:rgba(239,68,68,.08)}.state-tag.archive{color:var(--text-muted);background:rgba(100,116,139,.1)}.original-text{font-size:9px;color:var(--text-muted);padding:6px 8px;margin-top:7px;border-left:2px solid rgba(99,102,241,.2);line-height:1.5}.item-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;color:var(--text-muted);font-size:8px}.item-actions{display:flex;gap:2px;flex-wrap:wrap;justify-content:flex-end}.item-actions button{border:0;background:transparent;color:var(--text-muted);font-size:8px;padding:3px 4px;cursor:pointer}.item-actions button:hover{color:var(--accent-blue)}.item-actions button:disabled{opacity:.35;cursor:default}
.boundary-grid,.metrics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}.boundary-grid article,.metrics-grid article{padding:13px;border-radius:10px;border:1px solid var(--border-color);background:rgba(255,255,255,.4);display:flex;flex-direction:column;gap:7px}.boundary-grid span,.metrics-grid span{font-size:9px;color:var(--text-muted)}.boundary-grid strong{font-size:11px;overflow-wrap:anywhere}.metrics-grid strong{font-family:var(--font-tech);font-size:22px;color:var(--accent-blue)}.metrics-grid p{font-size:9px;color:var(--text-muted)}.summary-preview{border:1px solid var(--border-color);border-radius:11px;overflow:hidden}.preview-heading{padding:11px 13px;display:flex;justify-content:space-between;background:rgba(var(--accent-blue-rgb),.035)}.preview-heading h4{font-size:11px}.preview-heading span{font-family:monospace;font-size:9px;color:var(--text-muted)}.summary-preview pre,.evidence-row pre{margin:0;padding:14px;max-height:360px;overflow:auto;font:10px/1.6 'JetBrains Mono',monospace;white-space:pre-wrap;color:var(--text-secondary)}
.post-compact-panel{margin:12px 0;border:1px solid rgba(var(--accent-blue-rgb),.12);border-radius:12px;background:rgba(var(--accent-blue-rgb),.035);padding:13px}.post-compact-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.post-compact-head h4{font-size:13px;margin-top:3px}.post-compact-head code{max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:var(--text-muted);background:rgba(100,116,139,.08);padding:5px 7px;border-radius:7px}.post-compact-error{padding:10px;border-radius:8px;background:rgba(239,68,68,.06);color:var(--accent-red);font-size:10px}.post-compact-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.post-compact-cards article{min-width:0;padding:10px;border-radius:9px;border:1px solid var(--border-color);background:rgba(255,255,255,.48);display:flex;flex-direction:column;gap:4px}.post-compact-cards span{font-size:8px;color:var(--text-muted);font-weight:800}.post-compact-cards strong{font-family:var(--font-tech);font-size:17px;color:var(--accent-blue)}.post-compact-cards small{font-size:8px;color:var(--text-muted);line-height:1.35}.discipline-panel{margin-top:9px;border:1px solid rgba(16,185,129,.16);border-radius:10px;background:rgba(16,185,129,.045);overflow:hidden}.discipline-panel.warn,.discipline-panel.waiting{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.055)}.discipline-panel.fail{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.055)}.discipline-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid var(--border-color)}.discipline-head div{display:flex;flex-direction:column;gap:2px;min-width:0}.discipline-head strong{font-size:10px;color:var(--text-primary)}.discipline-head span{font-size:8px;color:var(--text-muted)}.discipline-head code{font-family:var(--font-tech);font-size:18px;color:var(--accent-green)}.discipline-panel.warn .discipline-head code,.discipline-panel.waiting .discipline-head code{color:var(--accent-yellow)}.discipline-panel.fail .discipline-head code{color:var(--accent-red)}.discipline-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;padding:9px}.discipline-cards article,.discipline-buckets article{min-width:0;border:1px solid var(--border-color);border-radius:8px;background:rgba(255,255,255,.38);padding:8px;display:flex;flex-direction:column;gap:3px}.discipline-cards span,.discipline-buckets span{font-size:8px;color:var(--text-muted);font-weight:800}.discipline-cards strong,.discipline-buckets strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue)}.discipline-cards small,.discipline-buckets small{font-size:7px;color:var(--text-muted);line-height:1.35}.discipline-buckets{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;padding:0 9px 9px}.discipline-buckets article.weak{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.06)}.discipline-gap-list{border-top:1px solid var(--border-color)}.discipline-gap-list article{display:grid;grid-template-columns:64px minmax(90px,170px) minmax(0,1fr);gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.discipline-gap-list article:first-child{border-top:0}.discipline-gap-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.discipline-gap-list p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.post-compact-buckets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.post-compact-bucket{min-width:0;border:1px solid var(--border-color);border-radius:10px;background:rgba(255,255,255,.34);padding:9px}.bucket-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.bucket-heading h5{font-size:10px}.bucket-heading span{font-family:var(--font-tech);font-size:9px;color:var(--text-muted)}.candidate-row{border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,.52);padding:8px;margin-top:6px}.candidate-row.useful{border-color:rgba(16,185,129,.14)}.candidate-row.ignored,.candidate-row.archive{border-color:rgba(245,158,11,.18)}.candidate-row.missing{border-color:rgba(99,102,241,.18)}.candidate-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.candidate-top strong{font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.candidate-top span{font-size:8px;color:var(--accent-blue);font-weight:800;white-space:nowrap}.candidate-row p{font-size:9px;line-height:1.5;color:var(--text-secondary);margin:5px 0;overflow-wrap:anywhere}.usage-counts{display:flex;gap:4px;flex-wrap:wrap}.usage-counts span{font-size:7px;color:var(--text-muted);background:rgba(100,116,139,.08);border-radius:999px;padding:2px 5px}.recall-diagnostic-list,.recent-usage-list{margin-top:9px;border:1px solid var(--border-color);border-radius:10px;background:rgba(255,255,255,.32);overflow:hidden}.recall-diagnostic-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:rgba(100,116,139,.06);font-size:9px;color:var(--text-muted)}.recall-diagnostic-head strong{font-size:10px;color:var(--text-primary)}.recall-diagnostic-row,.recent-usage-row{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid var(--border-color);font-size:9px}.recall-diagnostic-row span{font-weight:800;color:var(--accent-green)}.recall-diagnostic-row.deprioritized span{color:var(--accent-yellow)}.recall-diagnostic-row strong,.recent-usage-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recall-diagnostic-row code{text-align:right;color:var(--accent-blue)}.recent-usage-row{grid-template-columns:64px 90px minmax(0,1fr)}.recent-usage-row p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted)}.usage-state{font-size:8px;font-weight:800;border-radius:999px;padding:3px 6px;text-align:center;background:rgba(100,116,139,.1);color:var(--text-muted)}.usage-state.used{background:rgba(16,185,129,.1);color:var(--accent-green)}.usage-state.ignored,.usage-state.warn,.usage-state.waiting{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.usage-state.verified{background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.usage-state.mentioned{background:rgba(99,102,241,.1);color:var(--accent-purple)}.usage-state.fail{background:rgba(239,68,68,.1);color:var(--accent-red)}
.audit-view{padding-top:12px;max-height:560px;overflow:auto}.audit-item{display:grid;grid-template-columns:145px minmax(0,1fr) auto;gap:12px;padding:11px;border-bottom:1px solid var(--border-color);align-items:center}.audit-time{font-size:9px;color:var(--text-muted)}.audit-item strong{font-size:11px}.audit-item p{font-size:9px;color:var(--text-muted);margin-top:3px}.audit-item code{font-size:8px;color:var(--accent-blue)}.feedback-panel{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:12px;padding:14px;border-radius:10px;background:rgba(var(--accent-blue-rgb),.04);border:1px solid rgba(var(--accent-blue-rgb),.1)}.feedback-panel h4{font-size:12px;margin-bottom:4px}.feedback-panel p{font-size:9px;color:var(--text-muted)}.feedback-actions{display:flex;gap:5px;flex-wrap:wrap}.counter-table{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.counter-table div{padding:11px;border-bottom:2px solid rgba(var(--accent-blue-rgb),.12);display:flex;justify-content:space-between;font-size:10px}.counter-table span{color:var(--text-muted)}
.acceptance-note{margin-top:9px;padding:9px 11px;border-radius:8px;background:rgba(16,185,129,.06);color:var(--text-muted);font-size:9px;border:1px solid rgba(16,185,129,.12)}
.empty-state{padding:35px;text-align:center;color:var(--text-muted);font-size:11px}.empty-state.large{padding-top:180px}.mc-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.24);backdrop-filter:blur(10px);z-index:200;display:grid;place-items:center}.mc-modal{width:min(520px,calc(100vw - 36px));max-height:80vh;overflow:auto;border:1px solid var(--border-color);background:rgba(255,255,255,.92);box-shadow:0 26px 80px rgba(15,23,42,.18);border-radius:15px;padding:22px}.mc-modal h3{font-size:19px;margin:4px 0 14px}.mc-modal label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700;color:var(--text-muted);margin-top:13px}.mc-modal textarea{resize:vertical;font-size:12px;line-height:1.5}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.evidence-modal{width:min(760px,calc(100vw - 36px))}.evidence-row{border:1px solid var(--border-color);border-radius:10px;margin-top:9px;overflow:hidden}.evidence-row>div{display:flex;justify-content:space-between;padding:9px 12px;background:rgba(var(--accent-blue-rgb),.04);font-size:9px;color:var(--text-muted)}
@media(max-width:1100px){.summary-strip{grid-template-columns:repeat(3,1fr)}.memory-groups{grid-template-columns:1fr}.workspace-grid{grid-template-columns:220px minmax(0,1fr)}.quality-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cross-group-quality-cards,.ignore-memory-receipt-cards,.selftest-residue-cards,.task-agent-snapshot-cards,.post-compact-cards,.discipline-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.discipline-buckets{grid-template-columns:repeat(4,minmax(0,1fr))}.post-compact-buckets{grid-template-columns:1fr}}
@media(max-width:760px){.memory-center{padding:10px}.mc-header,.detail-header,.feedback-panel,.quality-panel-head,.post-compact-head,.cross-group-quality-head,.ignore-memory-receipt-head,.selftest-residue-head,.task-agent-snapshot-head,.context-capacity-head{flex-direction:column;align-items:flex-start}.context-preset-grid,.context-field-grid{grid-template-columns:1fr}.summary-strip{grid-template-columns:repeat(2,1fr)}.global-alert{grid-template-columns:7px minmax(0,1fr);align-items:start}.global-alert>span{margin-top:3px}.global-alert strong,.global-alert p,.global-alert small{grid-column:2}.workspace-grid{grid-template-columns:1fr}.scope-panel{max-height:240px}.detail-panel{padding:13px}.maintenance-actions{justify-content:flex-start}.memory-toolbar{flex-direction:column}.memory-search{width:100%}.boundary-grid,.metrics-grid{grid-template-columns:repeat(2,1fr)}.quality-check-grid{grid-template-columns:1fr}.audit-item{grid-template-columns:1fr}.counter-table{grid-template-columns:repeat(2,1fr)}.post-compact-head code{max-width:100%;white-space:normal;overflow-wrap:anywhere}.cross-group-quality-cards,.ignore-memory-receipt-cards,.selftest-residue-cards,.task-agent-snapshot-cards,.post-compact-cards,.discipline-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.discipline-buckets{grid-template-columns:repeat(2,minmax(0,1fr))}.cross-group-quality-table article,.ignore-memory-receipt-list article,.ignore-memory-receipt-work-list article,.selftest-residue-list article,.task-agent-snapshot-list article,.recall-diagnostic-row,.recent-usage-row,.discipline-gap-list article{grid-template-columns:1fr}.cross-group-quality-table code,.ignore-memory-receipt-list code,.task-agent-snapshot-list code{text-align:left}}
:global([data-theme='dark']) .memory-center .aura-card,:global([data-theme='dark']) .summary-card,:global([data-theme='dark']) .memory-group,:global([data-theme='dark']) .memory-item,:global([data-theme='dark']) .boundary-grid article,:global([data-theme='dark']) .metrics-grid article,:global([data-theme='dark']) .quality-check-card,:global([data-theme='dark']) .ignore-memory-receipt-cards article,:global([data-theme='dark']) .ignore-memory-receipt-work-list article,:global([data-theme='dark']) .selftest-residue-cards article,:global([data-theme='dark']) .task-agent-snapshot-cards article,:global([data-theme='dark']) .post-compact-cards article,:global([data-theme='dark']) .discipline-cards article,:global([data-theme='dark']) .discipline-buckets article,:global([data-theme='dark']) .post-compact-bucket,:global([data-theme='dark']) .candidate-row,:global([data-theme='dark']) .recall-diagnostic-list,:global([data-theme='dark']) .recent-usage-list{background:rgba(15,23,42,.54)}:global([data-theme='dark']) .mc-modal{background:rgba(15,23,42,.94)}
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
@media(max-width:760px){.capacity-runtime-strip,.provider-capability-fields,.provider-capability-list,.capability-health-list{grid-template-columns:repeat(2,minmax(0,1fr))}.retention-maintenance-row{flex-direction:column;align-items:flex-start}}
:global([data-theme='dark']) .agent-reliability-list article,:global([data-theme='dark']) .timeline-component-list article{background:rgba(15,23,42,.54)}
.dispatch-recovery-panel{margin:10px 0;border:1px solid rgba(16,185,129,.2);border-radius:8px;background:rgba(16,185,129,.025);overflow:hidden}.dispatch-recovery-panel.alert{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.035)}.dispatch-recovery-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-bottom:1px solid var(--border-color)}.dispatch-recovery-head h4{margin:2px 0 0;font-size:13px}.dispatch-recovery-head .btn{padding:6px 9px;font-size:8px}.dispatch-recovery-counters{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-bottom:1px solid var(--border-color)}.dispatch-recovery-counters span{min-width:0;padding:8px 10px;border-left:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;gap:6px}.dispatch-recovery-counters span:first-child{border-left:0}.dispatch-recovery-counters small{font-size:7px;font-weight:800;color:var(--text-muted);text-transform:uppercase;overflow:hidden;text-overflow:ellipsis}.dispatch-recovery-counters strong{font-family:var(--font-tech);font-size:13px;color:var(--accent-green)}.dispatch-recovery-panel.alert .dispatch-recovery-counters strong{color:var(--accent-yellow)}.dispatch-recovery-list>article{border-top:1px solid rgba(100,116,139,.1)}.dispatch-recovery-list>article:first-child{border-top:0}.dispatch-recovery-list>article.invalid,.dispatch-recovery-list>article.uncertain{background:rgba(245,158,11,.035)}.dispatch-recovery-row{display:grid;grid-template-columns:86px minmax(150px,220px) minmax(190px,1fr) 108px minmax(150px,auto);gap:8px;align-items:center;padding:9px 10px}.dispatch-recovery-state{border-radius:5px;padding:4px 6px;font-size:7px;font-weight:800;text-align:center;background:rgba(100,116,139,.1);color:var(--text-muted)}.dispatch-recovery-state.recoverable_commit{background:rgba(16,185,129,.1);color:var(--accent-green)}.dispatch-recovery-state.active{background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.dispatch-recovery-state.cancel_prepared,.dispatch-recovery-state.uncertain{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.dispatch-recovery-state.invalid{background:rgba(239,68,68,.1);color:var(--accent-red)}.dispatch-recovery-identity,.dispatch-recovery-proof{min-width:0;display:flex;flex-direction:column;gap:3px}.dispatch-recovery-identity strong,.dispatch-recovery-identity small,.dispatch-recovery-proof code,.dispatch-recovery-proof small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dispatch-recovery-identity strong{font-size:9px}.dispatch-recovery-identity small,.dispatch-recovery-proof small{font-size:7px;color:var(--text-muted)}.dispatch-recovery-proof code{font-size:8px;color:var(--accent-blue)}.dispatch-recovery-row>time{font-size:7px;color:var(--text-muted);text-align:right}.dispatch-recovery-actions{display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap}.dispatch-recovery-actions .btn{padding:5px 7px;font-size:7px;white-space:nowrap}.dispatch-recovery-actions .danger{color:var(--accent-red);border-color:rgba(239,68,68,.2)}.dispatch-recovery-ack{padding:0 10px 8px;font-size:7px;color:var(--accent-green)}.dispatch-transcript-list{max-height:280px;overflow:auto;border-top:1px solid var(--border-color);background:rgba(15,23,42,.025)}.dispatch-transcript-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border-color)}.dispatch-transcript-meta code,.dispatch-transcript-meta span{min-width:0;font-size:7px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dispatch-transcript-event{display:grid;grid-template-columns:88px 130px minmax(0,1fr);gap:8px;padding:6px 10px;border-top:1px solid rgba(100,116,139,.08);align-items:start}.dispatch-transcript-event:first-child{border-top:0}.dispatch-transcript-event time,.dispatch-transcript-event strong{font-size:7px;color:var(--text-muted)}.dispatch-transcript-event strong{color:var(--accent-blue)}.dispatch-transcript-event pre{margin:0;max-height:72px;overflow:auto;font-family:var(--font-tech);font-size:7px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text-secondary)}.dispatch-recovery-empty{padding:14px;text-align:center;font-size:9px;color:var(--text-muted)}.dispatch-resolve-identity{display:flex;flex-direction:column;gap:5px;padding:8px;border:1px solid var(--border-color);border-radius:7px;background:rgba(var(--accent-blue-rgb),.035)}.dispatch-resolve-identity code{font-size:8px;color:var(--accent-blue);overflow-wrap:anywhere}.dispatch-resolve-identity span{font-size:8px;color:var(--text-muted);overflow-wrap:anywhere}
@media(max-width:1100px){.dispatch-recovery-row{grid-template-columns:82px minmax(140px,1fr) minmax(180px,1.5fr)}.dispatch-recovery-row>time{display:none}.dispatch-recovery-actions{grid-column:2/-1}.dispatch-recovery-counters{grid-template-columns:repeat(3,minmax(0,1fr))}.dispatch-recovery-counters span:nth-child(4){border-left:0;border-top:1px solid var(--border-color)}}
@media(max-width:760px){.dispatch-recovery-head{align-items:flex-start}.dispatch-recovery-counters{grid-template-columns:repeat(2,minmax(0,1fr))}.dispatch-recovery-counters span:nth-child(3),.dispatch-recovery-counters span:nth-child(5){border-left:0}.dispatch-recovery-counters span:nth-child(n+3){border-top:1px solid var(--border-color)}.dispatch-recovery-row{grid-template-columns:1fr}.dispatch-recovery-actions{grid-column:1;justify-content:flex-start}.dispatch-recovery-identity small,.dispatch-recovery-proof code,.dispatch-recovery-proof small{white-space:normal;overflow-wrap:anywhere}.dispatch-transcript-event{grid-template-columns:1fr}.dispatch-transcript-meta{align-items:flex-start;flex-direction:column}}
:global([data-theme='dark']) .dispatch-transcript-list{background:rgba(15,23,42,.38)}
.session-memory-fleet-panel{margin:10px 0;border:1px solid rgba(var(--accent-blue-rgb),.18);border-radius:8px;background:rgba(var(--accent-blue-rgb),.035);overflow:hidden}.session-memory-fleet-panel.warn{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.045)}.session-memory-fleet-panel.fail{border-color:rgba(239,68,68,.28);background:rgba(239,68,68,.045)}.session-memory-fleet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-bottom:1px solid var(--border-color)}.session-memory-fleet-head h4{margin:2px 0 0;font-size:13px}.session-memory-fleet-head code{font-size:9px;font-weight:800;color:var(--accent-blue);text-transform:uppercase}.session-memory-fleet-panel.warn .session-memory-fleet-head code{color:var(--accent-yellow)}.session-memory-fleet-panel.fail .session-memory-fleet-head code{color:var(--accent-red)}.session-memory-fleet-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:9px 10px}.session-memory-fleet-cards article{min-width:0;border:1px solid var(--border-color);border-radius:7px;background:rgba(255,255,255,.42);padding:8px;display:flex;flex-direction:column;gap:3px}.session-memory-fleet-cards span{font-size:8px;font-weight:800;color:var(--text-muted);text-transform:uppercase}.session-memory-fleet-cards strong{font-family:var(--font-tech);font-size:15px;color:var(--accent-blue);overflow:hidden;text-overflow:ellipsis}.session-memory-fleet-cards small{font-size:8px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.session-memory-fleet-list{border-top:1px solid var(--border-color)}.session-memory-fleet-list article{display:grid;grid-template-columns:64px minmax(120px,210px) minmax(0,1fr) 110px 136px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.session-memory-fleet-list article:first-child{border-top:0}.session-memory-fleet-list strong,.session-memory-fleet-list p{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.session-memory-fleet-list p{color:var(--text-muted)}.session-memory-fleet-list code{text-align:right;font-size:8px;color:var(--text-muted)}.session-memory-artifact-actions{display:flex;justify-content:flex-end;gap:5px}.session-memory-artifact-actions .btn{padding:5px 7px;font-size:8px;white-space:nowrap}
.session-memory-history-list{border-top:1px solid var(--border-color);padding:7px 10px}.session-memory-history-list article{display:grid;grid-template-columns:76px minmax(120px,210px) minmax(0,1fr) 120px 54px;gap:8px;align-items:center;padding:6px 0;border-top:1px solid rgba(100,116,139,.08);font-size:9px}.session-memory-history-list article:first-child{border-top:0}.session-memory-history-list strong,.session-memory-history-list p{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.session-memory-history-list p{color:var(--text-muted)}.session-memory-history-list code{text-align:right;font-size:8px;color:var(--text-muted)}.session-memory-replay-btn,.session-memory-replay-close{border:1px solid rgba(var(--accent-blue-rgb),.2);background:rgba(var(--accent-blue-rgb),.07);color:var(--accent-blue);border-radius:6px;padding:5px 8px;font-size:8px;font-weight:800;cursor:pointer}.session-memory-replay-btn:disabled{opacity:.55;cursor:wait}.session-memory-replay-panel{margin:0 10px 10px;border:1px solid rgba(16,185,129,.22);border-radius:8px;background:rgba(16,185,129,.04);overflow:hidden}.session-memory-replay-panel.fail{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.04)}.session-memory-replay-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border-bottom:1px solid var(--border-color)}.session-memory-replay-head h5{margin-top:2px;font-size:11px}.session-memory-replay-close{color:var(--text-muted);border-color:var(--border-color);background:transparent}.session-memory-replay-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 11px;border-bottom:1px solid var(--border-color)}.session-memory-replay-meta span,.session-memory-replay-meta code{font-size:8px;color:var(--text-muted)}.session-memory-replay-meta code{color:var(--accent-blue);overflow-wrap:anywhere}.session-memory-replay-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:9px 10px}.session-memory-replay-checks article{min-width:0;display:flex;align-items:center;gap:6px;border:1px solid rgba(16,185,129,.16);border-radius:6px;padding:7px;background:rgba(255,255,255,.35)}.session-memory-replay-checks article.fail{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.04)}.session-memory-replay-checks span{flex:none;font-size:7px;font-weight:800;color:var(--accent-green)}.session-memory-replay-checks article.fail span{color:var(--accent-red)}.session-memory-replay-checks strong{min-width:0;font-size:8px;overflow-wrap:anywhere}
@media(max-width:1100px){.session-memory-fleet-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.session-memory-fleet-head,.session-memory-replay-head{align-items:flex-start}.session-memory-fleet-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.session-memory-fleet-list article,.session-memory-history-list article{grid-template-columns:1fr}.session-memory-fleet-list code,.session-memory-history-list code{text-align:left}.session-memory-fleet-list p,.session-memory-history-list p{white-space:normal;overflow-wrap:anywhere}.session-memory-artifact-actions{justify-content:flex-start;flex-wrap:wrap}.session-memory-replay-btn{justify-self:start}.session-memory-replay-checks{grid-template-columns:1fr}}
:global([data-theme='dark']) .session-memory-fleet-cards article,:global([data-theme='dark']) .session-memory-replay-checks article{background:rgba(15,23,42,.54)}
.recall-diagnostic-row.semantic-duplicate span{color:var(--accent-yellow)}
.recall-diagnostic-row.semantic-conflict span{color:var(--accent-red)}
.recall-diagnostic-row.consumption-deprioritized span{color:var(--accent-yellow)}
.recall-diagnostic-row.consumption-conflict span{color:var(--accent-red)}
.consumption-diagnostic-list,.consumption-stale-list{margin:0 9px 9px}
.stale-candidate-list{border-top:1px solid var(--border-color)}.stale-candidate-row{padding:10px;border-top:1px solid rgba(100,116,139,.08);background:rgba(255,255,255,.18)}.stale-candidate-row:first-child{border-top:0}.stale-candidate-row.pending{background:rgba(245,158,11,.035)}.stale-candidate-row.applied{background:rgba(16,185,129,.03)}.stale-candidate-row.rejected{opacity:.72}.stale-candidate-head{display:grid;grid-template-columns:72px minmax(0,1fr) 72px;gap:8px;align-items:center}.stale-candidate-head strong{min-width:0;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.stale-candidate-head code{text-align:right;font-size:8px;color:var(--text-muted)}.stale-candidate-row>p{margin:7px 0;font-size:9px;line-height:1.55;color:var(--text-secondary)}.stale-candidate-row>small{display:block;margin-top:7px;font-size:8px;color:var(--text-muted);overflow-wrap:anywhere}.stale-candidate-replacement{max-height:150px;overflow:auto;padding:8px;border:1px solid var(--border-color);border-radius:7px;background:rgba(var(--accent-blue-rgb),.035);font-family:var(--font-tech);font-size:8px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.stale-candidate-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}.stale-candidate-resolution{margin-top:7px;font-size:8px;color:var(--text-muted)}
@media(max-width:760px){.stale-candidate-head{grid-template-columns:1fr}.stale-candidate-head code{text-align:left}.stale-candidate-actions{justify-content:flex-start}}
:global([data-theme='dark']) .stale-candidate-row{background:rgba(15,23,42,.42)}
</style>
