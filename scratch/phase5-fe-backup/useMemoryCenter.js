import { computed, onMounted, ref } from 'vue'
import { Download, ShieldCheck, Sparkles } from '@lucide/vue'
import { toast, confirmDialog } from '../../utils/toast.js'

export function useMemoryCenter() {

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
  const liveMemoryWaveApprovalLoading = ref(false)
  const liveMemoryWaveApprovalRetentionLoading = ref(false)
  const liveMemoryWaveApprovalRetentionResult = ref(null)
  const liveMemoryWaveProvider = ref('codex')
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
  const sessionMemoryManualExtractionRunning = ref('')
  const sessionMemoryTrendAckLoading = ref('')
  const sessionMemoryDiagnosticExportLoading = ref('')
  const sessionMemoryArtifactRetentionResult = ref(null)
  const sessionMemoryPromptLoading = ref(false)
  const sessionMemoryPromptSaving = ref(false)
  const sessionMemoryPromptTarget = ref('')
  const sessionMemoryPromptProfile = ref(null)
  const sessionMemoryPromptContent = ref('')
  const sessionMemoryCustomizationMode = ref('prompt')
  const sessionMemoryTemplateLoading = ref(false)
  const sessionMemoryTemplateSaving = ref(false)
  const sessionMemoryTemplateProfile = ref(null)
  const sessionMemoryTemplateContent = ref('')
  const dispatchRecovery = ref({ summary: {}, rows: [] })
  const dispatchRecoveryLoading = ref(false)
  const dispatchResolveLoading = ref(false)
  const dispatchResolveState = ref(null)
  const expandedDispatchId = ref('')
  const contextSettings = ref({
    memoryContextPreset: 'default',
    modelContextWindow: 0,
    modelAutoCompactTokenLimit: 0,
    timeBasedMicrocompactEnabled: false,
    timeBasedThinkingClearEnabled: false,
    timeBasedMicrocompactGapMinutes: 60,
    timeBasedMicrocompactKeepRecent: 5,
    typedMemoryDeliveryMaxDocuments: 5,
    typedMemoryDeliveryMaxBytesPerDocument: 4096,
    typedMemoryDeliveryMaxLinesPerDocument: 200,
    typedMemoryDeliveryMaxSessionBytes: 61440,
    typedMemoryDeliveryMaxTokens: 5000,
    sessionMemoryCompactMaxSectionTokens: 2000,
    sessionMemoryCompactMaxTotalTokens: 12000,
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
      { label: 'model extracted', value: overall.modelExtractedSessionCount || 0, note: `verified ${overall.modelReceiptVerifiedCount || 0} · manual ${overall.modelManualExtractionCount || 0}` },
      { label: 'manual refresh', value: overall.modelManualFullSessionRefreshCount || 0, note: `model ${overall.modelManualModelInvokedCount || 0} · no-new ${overall.modelManualNoNewMessageRefreshCount || 0}` },
      { label: 'manual bypass', value: overall.modelManualSuppressionBypassCount || 0, note: `eligible ${overall.modelManualSuppressionEligibleCount || 0}` },
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
      { label: 'custom prompts', value: overall.modelCustomPromptConfiguredSessionCount || 0, note: `exact ${overall.modelCustomPromptExactSessionCount || 0} · global ${overall.modelCustomPromptGlobalCount || 0}` },
      { label: 'custom templates', value: overall.modelCustomTemplateConfiguredSessionCount || 0, note: `exact ${overall.modelCustomTemplateExactSessionCount || 0} · global ${overall.modelCustomTemplateGlobalCount || 0}` },
      { label: 'merge quality', value: overall.modelMergeQualityObservedCount || 0, note: `failed ${overall.modelMergeQualityFailedCount || 0}` },
      { label: 'supersession', value: overall.factSupersessionEdgeCount || 0, note: `graphs ${overall.factSupersessionGraphObservedCount || 0}` },
      { label: 'typed proposals', value: overall.modelExtractionTypedMemoryProposalCount || 0, note: `admitted ${overall.modelExtractionTypedMemoryAdmittedCount || 0} · rejected ${overall.modelExtractionTypedMemoryRejectedCount || 0}` },
      { label: 'typed active', value: overall.modelExtractionTypedMemoryActiveFactCount || 0, note: `superseded ${overall.modelExtractionTypedMemorySupersededFactCount || 0} · invalid ${overall.modelExtractionTypedMemoryArchiveInvalidCount || 0}` },
      { label: 'semantic topics', value: overall.modelExtractionTypedMemoryActiveTopicCount || 0, note: `retired ${overall.modelExtractionTypedMemoryRetiredTopicCount || 0} · merged ${overall.modelExtractionTypedMemoryMergedTopicCount || 0}` },
      { label: 'topic quality', value: overall.modelExtractionTypedMemoryCrossLanguageReuseCount || 0, note: `unclassified ${overall.modelExtractionTypedMemoryUnclassifiedFactCount || 0} · rebalanced ${overall.modelExtractionTypedMemoryRebalancedFactCount || 0}` },
      { label: 'memory selector', value: overall.manifestSelectorDecisionCount || 0, note: `selected ${overall.manifestSelectorSelectedDocumentCount || 0} · empty ${overall.manifestSelectorEmptyDecisionCount || 0} · failed ${overall.manifestSelectorFailedDecisionCount || 0}` },
      { label: 'selector delivery', value: overall.manifestSelectorSelectedCommittedDocumentCount || 0, note: `attached ${overall.manifestSelectorSelectedAttachedDocumentCount || 0} · dropped ${Number(overall.manifestSelectorSelectedNotRecalledDocumentCount || 0) + Number(overall.manifestSelectorRecalledNotAttachedDocumentCount || 0)} · gaps ${overall.manifestSelectorClosureGapCount || 0}` },
      { label: 'selector consumed', value: Number(overall.manifestSelectorConsumptionUsedDocumentCount || 0) + Number(overall.manifestSelectorConsumptionVerifiedDocumentCount || 0), note: `delivered ${overall.manifestSelectorConsumptionDeliveredDocumentCount || 0} · ignored ${overall.manifestSelectorConsumptionIgnoredDocumentCount || 0}` },
      { label: 'selector calibrated', value: overall.manifestSelectorCalibrationHintedDecisionCount || 0, note: `support ${overall.manifestSelectorCalibrationSupportHintCount || 0} · caution ${overall.manifestSelectorCalibrationCautionHintCount || 0} · mixed ${overall.manifestSelectorCalibrationMixedHintCount || 0}` },
      { label: 'recall shape', value: overall.manifestSelectorShapeSelectorRunCount || 0, note: `selected ${overall.manifestSelectorShapeSelectedTotal || 0}/${overall.manifestSelectorShapeCandidateTotal || 0} · empty ${overall.manifestSelectorShapeEmptySelectionCount || 0}` },
      { label: 'selector utility', value: overall.manifestSelectorShapeConsumedUtilityRate == null ? 0 : Math.round(overall.manifestSelectorShapeConsumedUtilityRate * 1000) / 10, note: `receipt ${overall.manifestSelectorShapeConsumptionReceiptCoverageRate == null ? '—' : `${Math.round(overall.manifestSelectorShapeConsumptionReceiptCoverageRate * 1000) / 10}%`} · invalid ${overall.manifestSelectorShapeInvalidCount || 0}` },
      { label: 'memory writes', value: overall.memoryWriteShapeCount || 0, note: `create/update ${overall.memoryWriteShapeCreateCount || 0}/${overall.memoryWriteShapeUpdateCount || 0} · near limit ${overall.memoryWriteShapeNearBodyLimitCount || 0}` },
      { label: 'shape drift', value: overall.memoryShapeDriftSessionCount || 0, note: `warming ${overall.memoryShapeWarmingSessionCount || 0} · signals ${overall.memoryShapeDriftSignalCount || 0} · invalid ${overall.memoryShapeDriftInvalidSessionCount || 0}` },
      { label: 'durable trend', value: overall.memoryShapeTrendBucketCount || 0, note: `sealed ${overall.memoryShapeTrendSealedBucketCount || 0} · drift ${overall.memoryShapeTrendDriftSessionCount || 0} · recovered ${overall.memoryShapeTrendBackupRecoverySessionCount || 0}` },
      { label: 'trend incidents', value: overall.memoryShapeTrendIncidentPendingCount || 0, note: `ack ${overall.memoryShapeTrendIncidentAcknowledgedCount || 0} · resolved ${overall.memoryShapeTrendIncidentResolvedCount || 0} · invalid ${overall.memoryShapeTrendIncidentInvalidSessionCount || 0}` },
      { label: 'receipt gaps', value: overall.manifestSelectorConsumptionClosureGapCount || 0, note: `unreported ${overall.manifestSelectorConsumptionUnreportedDocumentCount || 0} · unexpected ${overall.manifestSelectorConsumptionUnexpectedClaimCount || 0} · stale ${overall.manifestSelectorConsumptionStaleCommittedWithoutConsumptionCount || 0}` },
      { label: 'typed retry', value: overall.modelExtractionTypedMemoryRetryPendingCount || 0, note: `recovered ${overall.modelExtractionTypedMemoryRetryCompletedCount || 0} · exhausted ${overall.modelExtractionTypedMemoryRetryExhaustedCount || 0}` },
      { label: 'unjustified loss', value: overall.factSupersessionUnjustifiedLostCount || 0, note: `invalid ${overall.factSupersessionGraphInvalidCount || 0}` }
    ]
  })
  const sessionMemoryFleetRows = computed(() => {
    const report = sessionMemoryFleetReport.value || {}
    const weak = report.weakGroups || []
    return (weak.length ? weak : report.groups || []).slice(0, 8)
  })
  const sessionMemoryPromptTargets = computed(() => (sessionMemoryFleetReport.value?.groups || [])
    .filter(row => row.groupSessionId && row.groupSessionId !== 'default')
    .map(row => ({
      scopeId: row.modelExtractionScopeId || `${row.groupId}--${row.groupSessionId}`,
      label: `${row.groupId} / ${row.groupSessionId}`
    })))
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
  const liveMemoryWaveApprovalProviderPreviews = computed(() => taskAgentSnapshotReport.value?.liveProviderMemoryWaveApprovalProviderPreviews || [])
  const liveMemoryTransitionCanaryProviderPreviews = computed(() => taskAgentSnapshotReport.value?.liveProviderMemoryVersionTransitionCanaryProviderPreviews || [])
  const liveMemoryInitialBaselineCanaryProviderPreviews = computed(() => taskAgentSnapshotReport.value?.liveProviderInitialMemoryBaselineCanaryProviderPreviews || [])
  const selectedLiveMemoryProviderPreview = (rows, fallback = {}) => rows.find(row => (row.requestedProvider || row.plan?.provider) === liveMemoryWaveProvider.value) || fallback
  const liveMemoryWaveApprovalPreview = computed(() => selectedLiveMemoryProviderPreview(liveMemoryWaveApprovalProviderPreviews.value, taskAgentSnapshotReport.value?.liveProviderMemoryWaveApprovalPreview || {}))
  const liveMemoryTransitionCanaryPreview = computed(() => selectedLiveMemoryProviderPreview(liveMemoryTransitionCanaryProviderPreviews.value, taskAgentSnapshotReport.value?.liveProviderMemoryVersionTransitionCanaryPreview || {}))
  const liveMemoryInitialBaselineCanaryPreview = computed(() => selectedLiveMemoryProviderPreview(liveMemoryInitialBaselineCanaryProviderPreviews.value))
  const liveMemoryWaveApprovalInventory = computed(() => taskAgentSnapshotReport.value?.liveProviderMemoryWaveApprovalInventory || {})
  const liveMemoryVersionTransitionLedger = computed(() => taskAgentSnapshotReport.value?.liveProviderMemoryVersionTransitionLedger || {})
  const liveMemoryWaveHasActiveApproval = computed(() => Number(liveMemoryWaveApprovalInventory.value?.approvedCount || 0) > 0)
  const liveMemoryWaveActiveApproval = computed(() => (liveMemoryWaveApprovalInventory.value?.rows || []).find(row => row.status === 'approved') || null)
  const liveMemoryWaveApprovalAction = computed(() => liveMemoryWaveHasActiveApproval.value
    ? 'revoke_live_memory_wave'
    : liveMemoryWaveApprovalPreview.value?.approvable
      ? 'approve_live_memory_wave'
      : liveMemoryTransitionCanaryPreview.value?.approvable
        ? 'approve_live_memory_transition_canary'
        : liveMemoryInitialBaselineCanaryPreview.value?.approvable
          ? 'approve_live_memory_initial_baseline_canary'
          : '')
  const liveMemoryWaveApprovalLabel = computed(() => liveMemoryWaveHasActiveApproval.value
    ? '撤销波次批准'
    : liveMemoryWaveApprovalAction.value === 'approve_live_memory_transition_canary'
      ? '批准迁移 Canary'
      : liveMemoryWaveApprovalAction.value === 'approve_live_memory_initial_baseline_canary'
        ? '批准首次基线'
        : '批准建议波次')
  const liveMemoryWaveApprovalTitle = computed(() => liveMemoryWaveHasActiveApproval.value
    ? '撤销当前单次执行凭据'
    : liveMemoryWaveApprovalAction.value === 'approve_live_memory_transition_canary'
      ? '创建绑定新 Provider 身份的最小 canary 凭据'
      : liveMemoryWaveApprovalAction.value === 'approve_live_memory_initial_baseline_canary'
        ? '创建选定 Provider 的首份记忆基线 canary 凭据'
        : '创建绑定当前建议的单次执行凭据')
  const liveMemoryWaveHasPrunableApprovals = computed(() => Number(liveMemoryWaveApprovalInventory.value?.prunableCount || 0) > 0)
  const taskAgentModelReceiptLifecycle = computed(() => taskAgentSnapshotReport.value?.modelMemoryReceiptLifecycle || {})
  const taskAgentModelReceiptRecovery = computed(() => taskAgentSnapshotReport.value?.modelMemoryReceiptRecovery || {})
  const taskAgentDiagnosticFleet = computed(() => taskAgentSnapshotReport.value?.diagnosticExportFleet || {})
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
      { label: 'model loaded', value: overall.modelMemoryReceiptReferencedValidCount || 0, note: `required ${overall.memoryContextConsumptionReceiptRequiredCount || 0}` },
      { label: 'load receipt gaps', value: (overall.modelMemoryReceiptReferencedMissingCount || 0) + (overall.modelMemoryReceiptReferencedInvalidCount || 0), note: `missing ${overall.modelMemoryReceiptReferencedMissingCount || 0} · invalid ${overall.modelMemoryReceiptReferencedInvalidCount || 0}` },
      { label: 'receipt retention', value: overall.modelMemoryReceiptOrphanCount || 0, note: `prunable ${overall.modelMemoryReceiptPrunableCount || 0}${overall.modelMemoryReceiptPruningBlocked ? ' · blocked' : ''}` },
      { label: 'load recovery', value: overall.modelMemoryReceiptRecoveredCount || 0, note: `blocked ${overall.modelMemoryReceiptRecoveryBlockedCount || 0} · interrupted ${overall.modelMemoryReceiptRecoveryInterruptedCount || 0}` },
      { label: 'recovery retention', value: overall.modelMemoryReceiptRecoveryOrphanCount || 0, note: `prunable ${overall.modelMemoryReceiptRecoveryPrunableCount || 0} · replay held ${overall.modelMemoryReceiptReplaySuppressedCount || 0}` },
      { label: 'recovery soak', value: overall.continuationSoakMemoryRecoveryCommittedCount || 0, note: `providers ${overall.continuationSoakMemoryRecoveryProviderCount || 0} · faults ${overall.continuationSoakMemoryRecoveryFaultInjectedCount || 0}` },
      { label: 'live memory probe', value: overall.continuationSoakLiveProviderMemoryProbePassedCount || 0, note: `providers ${overall.continuationSoakLiveProviderMemoryProbeProviderCount || 0} · receipt ${overall.continuationSoakLiveProviderMemoryProbeReceiptRecoveryPassedCount || 0}/${overall.continuationSoakLiveProviderMemoryProbeReceiptRecoveryRequiredCount || 0} · timeout start ${overall.continuationSoakLiveProviderMemoryProbeStartupTimeoutCount || 0} / api ${overall.continuationSoakLiveProviderMemoryProbeApiRetryTimeoutCount || 0} / turn ${overall.continuationSoakLiveProviderMemoryProbeTurnTimeoutCount || 0}` },
      { label: 'multi-group live', value: overall.liveProviderMultiGroupFleetPassingGroupCount || 0, note: `observed ${overall.liveProviderMultiGroupFleetObservedGroupCount || 0} · failed ${overall.liveProviderMultiGroupFleetFailedObservationCount || 0} · stale ${overall.liveProviderMultiGroupFleetStaleOrInvalidCount || 0} · ${overall.liveProviderMultiGroupFleetIsolationValid ? 'isolated' : 'unverified'}` },
      { label: 'live report retention', value: overall.liveProviderReportRetentionPrunableCount || 0, note: `reports ${overall.liveProviderReportRetentionReportCount || 0} · referenced child ${overall.liveProviderReportRetentionReferencedSingleCount || 0} / multi ${overall.liveProviderReportRetentionReferencedMultiCount || 0} · invalid ${overall.liveProviderReportRetentionInvalidCount || 0} · ${overall.liveProviderReportRetentionCoordinated ? 'coordinated' : 'uncoordinated'}` },
      { label: 'live endurance', value: overall.liveProviderMemoryEndurancePassedGroupCount || 0, note: `waves ${overall.liveProviderMemoryEnduranceWaveCount || 0} · observed ${overall.liveProviderMemoryEnduranceObservedGroupCount || 0} · timeout ${overall.liveProviderMemoryEnduranceProviderLatencyTimeoutCount || 0} · CCM ${overall.liveProviderMemoryEnduranceCcmEvidenceFailureCount || 0} · versions ${overall.liveProviderMemoryEnduranceVersionEpochCount || 0}/${overall.liveProviderMemoryEnduranceVersionTransitionCount || 0} · suggest c${overall.liveProviderMemoryEnduranceRecommendedConcurrencyCeiling || 0} / ${Math.round((overall.liveProviderMemoryEnduranceRecommendedProviderTimeoutMs || 0) / 1000)}s · ${overall.liveProviderMemoryEnduranceAdvisoryOnly ? 'advisory' : 'policy check'}` },
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
      { label: 'version bound', value: overall.diagnosticVersionFullCoverageRate == null ? '—' : `${overall.diagnosticVersionFullCoverageRate}%`, note: `${overall.diagnosticVersionFullyBoundCount || 0}/${overall.diagnosticVersionEvidenceCount || 0} exact-session evidence` },
      { label: 'unbound evidence', value: overall.diagnosticVersionUnboundEvidenceCount || 0, note: 'provider + model + runtime + contract' },
      { label: 'recovery fence', value: overall.invocationRecoveryMaxFencingToken || 0, note: `leases ${overall.invocationRecoveryLeasedCount || 0} · takeover ${overall.invocationRecoveryLeaseTakeoverCount || 0}` },
      { label: 'session bound', value: overall.groupSessionBoundCount || 0, note: `scope mismatch ${overall.deliveryScopeMismatchCount || 0}` },
      { label: 'snapshot sync', value: overall.memorySnapshotSyncCommittedCount || 0, note: `update ${overall.memorySnapshotSyncPromptUpdateCount || 0} · pending ${overall.memorySnapshotSyncCommitPendingCount || 0} · rejected ${overall.memorySnapshotSyncCommitRejectedCount || 0} · preserved ${overall.memorySnapshotSyncLateFailurePreservedCount || 0} · invalid ${overall.memorySnapshotSyncCommitInvalidCount || 0}` },
      { label: 'memory delta', value: overall.memoryEntrySyncDeltaCount || 0, note: `full ${overall.memoryEntrySyncFullCount || 0} · continuation ${overall.memoryEntrySyncContinuationCount || 0} · changed ${overall.memoryEntryChangedCount || 0} · lease ${overall.memoryEntryRenderLeaseActiveCount || 0}/${overall.memoryEntryRenderLeaseTakeoverCount || 0} · invalid ${overall.memoryEntrySyncInvalidCount || 0}` },
      { label: 'render wait', value: overall.memoryEntryRenderWaitResolvedCount || 0, note: `contention ${overall.memoryEntryRenderContentionCount || 0} · timeout ${overall.memoryEntryRenderWaitTimeoutCount || 0} · same PID ${overall.memoryEntryRenderSameProcessConflictCount || 0} · receipt ${overall.memoryEntryRenderContentionReceiptValidCount || 0}/${overall.memoryEntryRenderContentionReceiptInvalidCount || 0} · ${overall.memoryEntryRenderWaitTotalMs || 0}ms` },
      { label: 'memory prompt proof', value: overall.memoryPromptInjectionPromptBoundCount || 0, note: `enforced ${overall.memoryPromptInjectionEnforcedCount || 0} · missing ${overall.memoryPromptInjectionMissingCount || 0} · invalid ${overall.memoryPromptInjectionInvalidCount || 0}` },
      { label: 'trusted envelope', value: overall.memoryTrustedEnvelopeValidCount || 0, note: `required ${overall.memoryTrustedEnvelopeRequiredCount || 0} · unverified ${overall.memoryTrustedEnvelopeUnverifiedCount || 0}` },
      { label: 'provider memory role', value: overall.providerMemoryNativeSystemCount || 0, note: `required ${overall.providerMemoryChannelRequiredCount || 0} · user fallback ${overall.providerMemoryUserFallbackCount || 0} · unverified ${overall.providerMemoryChannelUnverifiedCount || 0}` },
      { label: 'continuation baseline', value: overall.memoryContinuationBaselineValidCount || 0, note: `required ${overall.memoryContinuationBaselineRequiredCount || 0} · unverified ${overall.memoryContinuationBaselineUnverifiedCount || 0}` },
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
  const taskAgentModelReceiptRows = computed(() => {
    const lifecycle = taskAgentModelReceiptLifecycle.value || {}
    return [
      ...(lifecycle.referencedRows || []).filter(row => row.status !== 'referenced_valid'),
      ...(lifecycle.orphanRows || []).filter(row => row.prunable || !row.valid)
    ].slice(0, 8)
  })
  const taskAgentModelReceiptRecoveryRows = computed(() => (taskAgentModelReceiptRecovery.value?.rows || []).filter(row => row.status !== 'recovered' || !row.valid).slice(0, 8))
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
  const truePostCompactPayload = computed(() => postCompactUsage.value?.truePostCompactPayload || selectedSummary.value?.truePostCompactPayload || null)
  const postCompactCleanupAudit = computed(() => postCompactUsage.value?.postCompactCleanupAudit || null)
  const apiMicroCompactEditPlan = computed(() => postCompactUsage.value?.apiMicroCompactEditPlan || null)
  const apiMicrocompactReceiptDiscipline = computed(() => postCompactUsage.value?.apiMicrocompactReceiptDiscipline || null)
  const compactionSummaryInputProjection = computed(() => postCompactUsage.value?.compactionSummaryInputProjection || null)
  const compactionSummaryInputProjectionState = computed(() => {
    const projection = compactionSummaryInputProjection.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    return 'waiting'
  })
  const compactionSummaryInputProjectionCards = computed(() => {
    const projection = compactionSummaryInputProjection.value || {}
    const receipt = projection.receipt || {}
    return [
      { label: 'messages', value: receipt.projected_message_count || 0, note: `/ ${receipt.source_message_count || 0} source` },
      { label: 'images', value: receipt.image_blocks_stripped || 0, note: 'replaced with marker' },
      { label: 'documents', value: receipt.document_blocks_stripped || 0, note: 'replaced with marker' },
      { label: 'attachments', value: receipt.reinjected_attachments_stripped || 0, note: 'restored after compact' },
      { label: 'tokens saved', value: receipt.estimated_tokens_saved || 0, note: `${receipt.estimated_tokens_after || 0} projected` },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no model compact yet' }
    ]
  })
  const postCompactTaskStatusProjection = computed(() => postCompactUsage.value?.postCompactTaskStatusProjection || null)
  const postCompactTaskStatusProjectionState = computed(() => {
    const projection = postCompactTaskStatusProjection.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    return 'waiting'
  })
  const postCompactTaskStatusProjectionCards = computed(() => {
    const projection = postCompactTaskStatusProjection.value || {}
    const receipt = projection.receipt || {}
    return [
      { label: 'included', value: receipt.included_task_count || 0, note: `/ ${receipt.matched_task_count || 0} matched` },
      { label: 'running', value: receipt.running_task_count || 0, note: 'avoid duplicate dispatch' },
      { label: 'completed', value: receipt.completed_unretrieved_count || 0, note: 'result not retrieved' },
      { label: 'blocked', value: receipt.blocked_task_count || 0, note: 'requires coordinator attention' },
      { label: 'isolated', value: receipt.excluded_scope_count || 0, note: 'other group/session tasks' },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no compact yet' }
    ]
  })
  const postCompactTaskStatusRows = computed(() => postCompactTaskStatusProjection.value?.tasks || [])
  const postCompactFileRestoreDedup = computed(() => postCompactUsage.value?.postCompactFileRestoreDedup || null)
  const postCompactFileRestoreDedupState = computed(() => {
    const projection = postCompactFileRestoreDedup.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    return 'waiting'
  })
  const postCompactFileRestoreDedupCards = computed(() => {
    const projection = postCompactFileRestoreDedup.value || {}
    const receipt = projection.receipt || {}
    return [
      { label: 'candidates', value: receipt.source_file_candidate_count || 0, note: 'before preserved-tail dedup' },
      { label: 'visible reads', value: receipt.preserved_full_read_path_count || 0, note: `${receipt.preserved_message_count || 0} preserved messages` },
      { label: 'deduped', value: receipt.deduped_file_candidate_count || 0, note: 'already visible in recent window' },
      { label: 'stub exempt', value: receipt.unchanged_stub_exemption_count || 0, note: 'restore real content' },
      { label: 'restored', value: receipt.restored_file_candidate_count || 0, note: `/ ${receipt.file_budget || 5} budget` },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no compact yet' }
    ]
  })
  const postCompactInvokedSkillAttachment = computed(() => postCompactUsage.value?.postCompactInvokedSkillAttachment || null)
  const postCompactInvokedSkillAttachmentState = computed(() => {
    const projection = postCompactInvokedSkillAttachment.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    return 'waiting'
  })
  const postCompactInvokedSkillAttachmentCards = computed(() => {
    const projection = postCompactInvokedSkillAttachment.value || {}
    const receipt = projection.receipt || {}
    return [
      { label: 'invoked', value: receipt.invocation_count || 0, note: 'exact current gcs session' },
      { label: 'attached', value: receipt.attachment_count || 0, note: (receipt.skill_names || []).join(', ') || 'no invoked skills' },
      { label: 'tokens', value: receipt.attached_token_count || 0, note: `/ ${receipt.total_max_tokens || 25000} total` },
      { label: 'truncated', value: receipt.truncated_skill_count || 0, note: `${receipt.single_skill_max_tokens || 5000} per skill` },
      { label: 'catalog drift', value: receipt.catalog_drift_count || 0, note: (receipt.drift_skill_names || []).join(', ') || 'hashes current' },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no compact yet' }
    ]
  })
  const postCompactPlanAttachment = computed(() => postCompactUsage.value?.postCompactPlanAttachment || null)
  const postCompactPlanAttachmentState = computed(() => {
    const projection = postCompactPlanAttachment.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    if (projection.status === 'empty') return 'waiting'
    return 'waiting'
  })
  const postCompactPlanAttachmentCards = computed(() => {
    const projection = postCompactPlanAttachment.value || {}
    const receipt = projection.receipt || {}
    return [
      { label: 'selected task', value: receipt.selected_task_id || 'none', note: receipt.selection_reason || 'no compact yet' },
      { label: 'plan mode', value: receipt.plan_mode_active ? 'awaiting' : receipt.confirmation_status || 'none', note: receipt.intake_state || 'exact-session state' },
      { label: 'tokens', value: receipt.attachment_token_count || 0, note: `/ ${receipt.max_plan_tokens || 50000} CC budget` },
      { label: 'candidates', value: receipt.candidate_plan_count || 0, note: `${receipt.active_plan_count || 0} active` },
      { label: 'isolated', value: receipt.excluded_scope_count || 0, note: 'other group/session tasks' },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no compact yet' }
    ]
  })
  const postCompactDynamicContextDelta = computed(() => postCompactUsage.value?.postCompactDynamicContextDelta || null)
  const postCompactDynamicContextDeltaState = computed(() => {
    const projection = postCompactDynamicContextDelta.value || {}
    if (projection.status === 'fail' || projection.receiptValid === false) return 'fail'
    if (projection.status === 'applied') return 'ok'
    return 'waiting'
  })
  const postCompactDynamicContextDeltaCards = computed(() => {
    const projection = postCompactDynamicContextDelta.value || {}
    const receipt = projection.receipt || {}
    const tools = receipt.deferred_tools || {}
    const agents = receipt.agent_listing || {}
    const mcp = receipt.mcp_instructions || {}
    const loaded = receipt.loaded_tool_state || {}
    return [
      { label: 'scan mode', value: receipt.scan_mode || 'none', note: `${receipt.prior_attachment_count || 0} prior deltas` },
      { label: 'tools', value: tools.current_count || 0, note: `+${(tools.added_names || []).length} / -${(tools.removed_names || []).length}` },
      { label: 'loaded tools', value: loaded.carried_count || 0, note: `${loaded.dropped_count || 0} dropped after auth/catalog check` },
      { label: 'agents', value: agents.current_count || 0, note: `+${(agents.added_names || []).length} / -${(agents.removed_names || []).length}` },
      { label: 'MCP instructions', value: mcp.current_count || 0, note: `+${(mcp.added_names || []).length} / -${(mcp.removed_names || []).length}` },
      { label: 'tokens', value: receipt.attachment_token_count || 0, note: `/ ${receipt.max_attachment_tokens || 20000}` },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no compact yet' }
    ]
  })
  const compactionModelUsage = computed(() => postCompactUsage.value?.compactionModelUsage || null)
  const compactionModelUsageState = computed(() => {
    const usage = compactionModelUsage.value || {}
    if (usage.status === 'fail' || usage.receiptValid === false) return 'fail'
    if (usage.status === 'reported') return 'ok'
    if (usage.status === 'unreported' || usage.status === 'failed') return 'warn'
    return 'waiting'
  })
  const compactionModelUsageCards = computed(() => {
    const projection = compactionModelUsage.value || {}
    const receipt = projection.receipt || {}
    const delta = receipt.input_estimate_delta
    return [
      { label: 'provider', value: receipt.provider || 'none', note: receipt.model || 'no model compact yet' },
      { label: 'input', value: receipt.input_tokens || 0, note: `estimated ${receipt.estimated_input_tokens || 0}` },
      { label: 'output', value: receipt.output_tokens || 0, note: `delta ${delta === null || delta === undefined ? 'n/a' : delta}` },
      { label: 'cache read', value: receipt.cache_read_input_tokens || 0, note: receipt.cache_read_included_in_input ? 'included in input' : 'separate tokens' },
      { label: 'cache create', value: receipt.cache_creation_input_tokens || 0, note: 'provider reported' },
      { label: 'total', value: receipt.accounted_total_tokens || 0, note: projection.status || 'waiting' },
      { label: 'receipt', value: projection.receiptValid === false ? 'invalid' : projection.receiptPresent ? 'valid' : 'none', note: receipt.usage_checksum || 'no compact yet' }
    ]
  })
  const timeBasedToolResultMicrocompact = computed(() => postCompactUsage.value?.timeBasedToolResultMicrocompact || null)
  const timeBasedToolResultMicrocompactState = computed(() => {
    const micro = timeBasedToolResultMicrocompact.value || {}
    if (micro.status === 'fail' || micro.receiptValid === false) return 'fail'
    if (micro.status === 'applied') return 'ok'
    if (micro.status === 'waiting') return 'warn'
    return 'waiting'
  })
  const timeBasedToolResultMicrocompactCards = computed(() => {
    const micro = timeBasedToolResultMicrocompact.value || {}
    const receipt = micro.receipt || {}
    return [
      { label: 'policy', value: micro.enabled ? 'on' : 'off', note: `${micro.gapThresholdMinutes || 60} min gap` },
      { label: 'keep recent', value: micro.keepRecent || 5, note: 'tool results' },
      { label: 'cleared', value: receipt.cleared_tool_result_count || 0, note: `kept ${receipt.kept_tool_count || 0}` },
      { label: 'tokens saved', value: receipt.tokens_saved || 0, note: receipt.reason || micro.status || 'waiting' },
      { label: 'gap', value: receipt.gap_minutes || 0, note: `/ ${receipt.gap_threshold_minutes || micro.gapThresholdMinutes || 60} min` },
      { label: 'receipt', value: micro.receiptValid === false ? 'invalid' : micro.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no run yet' }
    ]
  })
  const timeBasedThinkingMicrocompact = computed(() => postCompactUsage.value?.timeBasedThinkingMicrocompact || null)
  const timeBasedThinkingMicrocompactState = computed(() => {
    const micro = timeBasedThinkingMicrocompact.value || {}
    if (micro.status === 'fail' || micro.receiptValid === false) return 'fail'
    if (micro.status === 'applied') return 'ok'
    if (micro.status === 'latched') return 'ok'
    if (micro.status === 'waiting') return 'warn'
    return 'waiting'
  })
  const timeBasedThinkingMicrocompactCards = computed(() => {
    const micro = timeBasedThinkingMicrocompact.value || {}
    const receipt = micro.receipt || {}
    return [
      { label: 'policy', value: micro.enabled ? 'on' : 'off', note: `${micro.gapThresholdMinutes || 60} min gap` },
      { label: 'latch', value: receipt.latched ? 'active' : 'idle', note: receipt.compact_epoch || micro.compactEpoch || 'precompact' },
      { label: 'thinking turns', value: receipt.thinking_turn_count || 0, note: `cleared ${receipt.cleared_thinking_turn_count || 0} · kept ${receipt.kept_thinking_turn_count || 0}` },
      { label: 'tokens saved', value: receipt.tokens_saved || 0, note: receipt.reason || micro.status || 'waiting' },
      { label: 'restart', value: receipt.prior_latch_reused ? 'reused' : receipt.newly_latched ? 'latched' : 'waiting', note: 'exact gcs session' },
      { label: 'receipt', value: micro.receiptValid === false ? 'invalid' : micro.receiptPresent ? 'valid' : 'none', note: receipt.receipt_checksum || 'no run yet' }
    ]
  })
  const apiMicrocompactNativeApplyReadiness = computed(() => postCompactUsage.value?.apiMicrocompactNativeApplyReadiness || null)
  const apiMicrocompactNativeApplyProof = computed(() => postCompactUsage.value?.apiMicrocompactNativeApplyProof || null)
  const providerNativeCompactSessionCapacity = computed(() => postCompactUsage.value?.providerNativeCompactSessionCapacity || null)
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
      { label: 'final prompt', value: snapshots.finalDispatchGateReadyCount || 0, note: `blocked ${snapshots.finalDispatchGateBlockedCount || 0} · missing ${snapshots.finalDispatchGateMissingCount || 0}` },
      { label: 'prompt proof', value: snapshots.finalDispatchPromptBoundCount || 0, note: `lineage ${snapshots.finalDispatchLineageProofCount || 0} · invalid ${snapshots.finalDispatchGateInvalidCount || 0}` },
      { label: 'reactive compact', value: snapshots.finalDispatchReactiveCompactRecoveredCount || 0, note: `blocked ${snapshots.finalDispatchReactiveCompactBlockedCount || 0} · invalid ${snapshots.finalDispatchReactiveCompactInvalidCount || 0}` },
      { label: 'compact circuit', value: snapshots.finalDispatchReactiveCompactCircuitOpenCount || 0, note: `failures ${snapshots.finalDispatchReactiveCompactCircuitFailureCount || 0} · invalid ${snapshots.finalDispatchReactiveCompactCircuitInvalidCount || 0}` },
      { label: 'snapshot sync', value: snapshots.memorySnapshotSyncCommittedCount || 0, note: `update ${snapshots.memorySnapshotSyncPromptUpdateCount || 0} · pending ${snapshots.memorySnapshotSyncCommitPendingCount || 0} · rejected ${snapshots.memorySnapshotSyncCommitRejectedCount || 0} · preserved ${snapshots.memorySnapshotSyncLateFailurePreservedCount || 0} · invalid ${snapshots.memorySnapshotSyncCommitInvalidCount || 0}` },
      { label: 'memory delta', value: snapshots.memoryEntrySyncDeltaCount || 0, note: `full ${snapshots.memoryEntrySyncFullCount || 0} · continuation ${snapshots.memoryEntrySyncContinuationCount || 0} · changed ${snapshots.memoryEntryChangedCount || 0} · lease ${snapshots.memoryEntryRenderLeaseActiveCount || 0}/${snapshots.memoryEntryRenderLeaseTakeoverCount || 0} · invalid ${snapshots.memoryEntrySyncInvalidCount || 0}` },
      { label: 'render wait', value: snapshots.memoryEntryRenderWaitResolvedCount || 0, note: `contention ${snapshots.memoryEntryRenderContentionCount || 0} · timeout ${snapshots.memoryEntryRenderWaitTimeoutCount || 0} · same PID ${snapshots.memoryEntryRenderSameProcessConflictCount || 0} · receipt ${snapshots.memoryEntryRenderContentionReceiptValidCount || 0}/${snapshots.memoryEntryRenderContentionReceiptInvalidCount || 0} · ${snapshots.memoryEntryRenderWaitTotalMs || 0}ms` },
      { label: 'memory prompt proof', value: snapshots.memoryPromptInjectionPromptBoundCount || 0, note: `enforced ${snapshots.memoryPromptInjectionEnforcedCount || 0} · missing ${snapshots.memoryPromptInjectionMissingCount || 0} · invalid ${snapshots.memoryPromptInjectionInvalidCount || 0}` },
      { label: 'trusted envelope', value: snapshots.memoryTrustedEnvelopeValidCount || 0, note: `required ${snapshots.memoryTrustedEnvelopeRequiredCount || 0} · unverified ${snapshots.memoryTrustedEnvelopeUnverifiedCount || 0}` },
      { label: 'provider memory role', value: snapshots.providerMemoryNativeSystemCount || 0, note: `required ${snapshots.providerMemoryChannelRequiredCount || 0} · user fallback ${snapshots.providerMemoryUserFallbackCount || 0} · unverified ${snapshots.providerMemoryChannelUnverifiedCount || 0}` },
      { label: 'continuation baseline', value: snapshots.memoryContinuationBaselineValidCount || 0, note: `required ${snapshots.memoryContinuationBaselineRequiredCount || 0} · unverified ${snapshots.memoryContinuationBaselineUnverifiedCount || 0}` },
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
  const truePostCompactPayloadState = computed(() => {
    const payload = truePostCompactPayload.value || {}
    if (!payload.hasPayload || payload.health === 'empty') return 'waiting'
    if (payload.health === 'fail' || payload.gateStatus === 'recompact_required') return 'fail'
    if (payload.health === 'warn' || payload.gateStatus === 'ptl_reduced') return 'warn'
    return 'ok'
  })
  const truePostCompactPayloadCards = computed(() => {
    const payload = truePostCompactPayload.value || {}
    const components = payload.components || {}
    return [
      { label: 'gate', value: payload.gateStatus || '—', note: payload.action || 'no gate' },
      { label: 'true tokens', value: payload.truePostCompactTokenCount || 0, note: `trigger ${formatNumber(payload.triggerTokens || 0)}` },
      { label: 'pre-PTL', value: payload.prePtlTokenCount || 0, note: payload.ptlApplied ? 'PTL applied' : 'PTL not needed' },
      { label: 'summary', value: components.summary || 0, note: 'summary payload' },
      { label: 'recent', value: components.recentWindow || 0, note: 'kept message window' },
      { label: 'reinjection', value: components.reinjection || 0, note: `persistent ${formatNumber(components.persistentMemory || 0)}` },
      { label: 'session restore', value: components.sessionMemoryRestore || 0, note: `tools ${formatNumber(components.toolContinuityRestore || 0)}` },
      { label: 'render cap', value: payload.safeRenderChars || 0, note: payload.willRetriggerNextTurn ? 'safe child context' : 'normal child context' }
    ]
  })
  const truePostCompactPayloadGaps = computed(() => (truePostCompactPayload.value?.gaps || []).slice(0, 6))
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
      { label: 'scope', value: cleanup.groupSessionId || 'unbound', note: cleanup.compactSource?.kind || 'legacy source' },
      { label: 'checksum', value: cleanup.cleanupAuditChecksum ? cleanup.cleanupAuditChecksum.slice(0, 12) : 'missing', note: cleanup.cleanupScope?.allowsGlobalReset === false ? 'global reset denied' : 'verify scope' },
      { label: 'skills', value: cleanup.preserveInvokedSkills ? 'keep' : 'check', note: `${(cleanup.skillHints || []).length} hints` },
      { label: 'tools', value: cleanup.preserveToolContinuity ? 'keep' : 'check', note: cleanup.resetDerivedCompactState ? 'reset exact session' : (cleanup.cleanupScope?.kind?.includes('partial') ? 'partial retains state' : 'missing reset') },
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
  const postCompactSessionStateReset = computed(() => postCompactUsage.value?.postCompactSessionStateReset || null)
  const postCompactSessionStateResetState = computed(() => {
    const reset = postCompactSessionStateReset.value || {}
    if (!reset.schema) return 'waiting'
    if (reset.status === 'fail_closed' || reset.checksum_valid === false || (reset.verification_issues || []).length) return 'fail'
    return 'ok'
  })
  const postCompactSessionStateResetCards = computed(() => {
    const reset = postCompactSessionStateReset.value || {}
    return [
      { label: 'path', value: reset.compact_path || '—', note: reset.group_session_id || 'exact session' },
      { label: 'generation', value: reset.post_compact_mark?.generation || 0, note: reset.post_compact_mark?.status || 'waiting' },
      { label: 'provider cursor', value: reset.provider_active_cursor?.status || '—', note: reset.provider_active_cursor?.previous_message_id || 'no prior cursor' },
      { label: 'extraction', value: reset.session_memory_extraction_cursor?.status || '—', note: reset.session_memory_extraction_cursor?.message_id || 'no cursor' },
      { label: 'cache baseline', value: reset.cache_read_baseline?.status || '—', note: `generation ${reset.cache_read_baseline?.generation || 0}` },
      { label: 'warning', value: reset.compact_warning?.status || '—', note: reset.compact_warning?.suppressed ? 'until next pressure sample' : 'not suppressed' },
      { label: 'failures', value: reset.auto_compact_failure_state?.consecutive_failures || 0, note: reset.auto_compact_failure_state?.status || 'waiting' },
      { label: 'capacity', value: reset.provider_capacity_reset?.status || '—', note: `generation ${reset.provider_capacity_reset?.generation || 0}` }
    ]
  })
  const promptCacheBreakDetection = computed(() => postCompactUsage.value?.promptCacheBreakDetection || null)
  const promptCacheCompactionNotification = computed(() => postCompactUsage.value?.promptCacheCompactionNotification || null)
  const promptCacheBreakDetectionState = computed(() => {
    const cache = promptCacheBreakDetection.value || {}
    if (!cache.schema) return 'waiting'
    if (cache.status === 'fail_closed' || cache.checksum_valid === false) return 'fail'
    if (cache.last_event?.cache_break === true) return 'warn'
    return 'ok'
  })
  const promptCacheBreakDetectionCards = computed(() => {
    const cache = promptCacheBreakDetection.value || {}
    const event = cache.last_event || {}
    const notification = promptCacheCompactionNotification.value || {}
    const deletion = cache.pending_cache_deletion?.notification || {}
    return [
      { label: 'status', value: cache.status || '—', note: cache.group_session_id || 'exact session' },
      { label: 'calls', value: cache.call_count || 0, note: `${cache.cache_break_count || 0} breaks · ${cache.prompt_state_call_count || 0} states` },
      { label: 'generation', value: cache.baseline_generation || 0, note: notification.baseline_status || 'runtime baseline' },
      { label: 'cache read', value: event.cache_read_input_tokens || cache.previous_cache_read_tokens || 0, note: `previous ${event.previous_cache_read_tokens ?? 'none'}` },
      { label: 'classification', value: event.classification || (cache.pending_post_compaction ? 'post_compaction_pending' : (deletion.schema ? 'cache_deletion_pending' : '—')), note: event.cache_break_reason || event.source || 'group main' },
      { label: 'prompt state', value: event.prompt_changed ? 'changed' : (cache.prompt_state_baseline?.schema ? 'tracked' : 'waiting'), note: (event.prompt_change_causes || []).join(', ') || cache.prompt_state_baseline?.snapshot_id || 'no snapshot' },
      { label: 'post compact', value: event.is_post_compaction ? 'yes' : (cache.pending_post_compaction ? 'pending' : 'no'), note: event.post_compact_boundary_id || cache.pending_post_compaction?.boundary_id || 'no boundary' },
      { label: 'microcompact', value: deletion.schema ? 'pending' : (event.cache_deletion_applied ? 'consumed' : 'no'), note: deletion.execution_receipt_id || event.microcompact_execution_receipt_id || `${cache.cache_deletion_consumed_count || 0} consumed` },
      { label: 'drop', value: event.token_drop || 0, note: `${Math.round(Number(event.drop_ratio || 0) * 1000) / 10}%` },
      { label: 'checksum', value: cache.checksum_valid === false ? 'invalid' : 'valid', note: (deletion.receipt_checksum || notification.receipt_checksum || '').slice(0, 12) || 'no notification' }
    ]
  })
  const promptCacheBreakDetectionEvents = computed(() => {
    const rows = promptCacheBreakDetection.value?.recent_events || []
    return rows.slice(-8).reverse()
  })
  const autoCompactCircuitBreaker = computed(() => postCompactUsage.value?.autoCompactCircuitBreaker || null)
  const autoCompactCircuitBreakerState = computed(() => {
    const circuit = autoCompactCircuitBreaker.value || {}
    if (!circuit.schema) return 'waiting'
    if (circuit.state === 'fail_closed' || circuit.checksum_valid === false) return 'fail'
    if (circuit.state === 'open' || circuit.blocked === true) return 'warn'
    return 'ok'
  })
  const autoCompactCircuitBreakerCards = computed(() => {
    const circuit = autoCompactCircuitBreaker.value || {}
    return [
      { label: 'state', value: circuit.state || '—', note: circuit.blocked ? 'automatic runs blocked' : 'automatic runs admitted' },
      { label: 'failures', value: circuit.consecutive_failures || 0, note: `of ${circuit.max_consecutive_failures || 3}` },
      { label: 'revision', value: circuit.revision || 0, note: circuit.group_session_id || 'exact session' },
      { label: 'checksum', value: circuit.checksum_valid === false ? 'invalid' : 'valid', note: circuit.ledger_checksum ? circuit.ledger_checksum.slice(0, 12) : 'empty ledger' },
      { label: 'opened', value: circuit.opened_at ? 'yes' : 'no', note: circuit.opened_at || circuit.last_failure_at || 'never' },
      { label: 'success', value: circuit.last_success_at ? 'seen' : 'none', note: circuit.last_success_at || 'manual compact resets' }
    ]
  })
  const autoCompactCircuitBreakerEvents = computed(() => {
    const rows = autoCompactCircuitBreaker.value?.recent_events || []
    return rows.slice(-8).reverse()
  })
  const reactiveCompactRetryOwnership = computed(() => postCompactUsage.value?.reactiveCompactRetryOwnership || null)
  const reactiveCompactRetryOwnershipState = computed(() => {
    const ownership = reactiveCompactRetryOwnership.value || {}
    if (!ownership.schema) return 'waiting'
    if (ownership.state === 'fail_closed' || ownership.checksum_valid === false || ownership.blocked === true) return 'fail'
    if ((ownership.totals?.claimed || 0) > 0) return 'warn'
    return 'ok'
  })
  const reactiveCompactRetryOwnershipCards = computed(() => {
    const ownership = reactiveCompactRetryOwnership.value || {}
    const totals = ownership.totals || {}
    return [
      { label: 'epochs', value: totals.total || 0, note: ownership.group_session_id || 'exact session' },
      { label: 'claimed', value: totals.claimed || 0, note: 'active retry owners' },
      { label: 'recovered', value: totals.recovered || 0, note: 'single-shot success' },
      { label: 'failed', value: totals.failed || 0, note: 'single-shot exhausted' },
      { label: 'fence', value: Math.max(0, Number(ownership.next_fencing_token || 1) - 1), note: `revision ${ownership.revision || 0}` },
      { label: 'checksum', value: ownership.checksum_valid === false ? 'invalid' : 'valid', note: ownership.ledger_checksum ? ownership.ledger_checksum.slice(0, 12) : 'empty ledger' }
    ]
  })
  const reactiveCompactRetryOwnershipRows = computed(() => {
    const rows = reactiveCompactRetryOwnership.value?.entries || []
    return rows.slice(-8).reverse()
  })
  const workerContextCompactSessionArtifacts = computed(() => postCompactUsage.value?.workerContextCompactSessionArtifacts || null)
  const workerContextCompactSessionState = computed(() => {
    const artifacts = workerContextCompactSessionArtifacts.value || {}
    if (!artifacts.schema || artifacts.status !== 'ok') return 'waiting'
    if (artifacts.ptlEmergency?.engaged === true) return 'warn'
    if ([artifacts.hook, artifacts.outcome, artifacts.strategy, artifacts.ptlEmergency].some(row => row?.recoveredFromBackup === true)) return 'warn'
    return 'ok'
  })
  const workerContextCompactSessionCards = computed(() => {
    const artifacts = workerContextCompactSessionArtifacts.value || {}
    return [
      { label: 'hooks', value: artifacts.hook?.entries || 0, note: 'pre/post compact hooks' },
      { label: 'outcomes', value: artifacts.outcome?.entries || 0, note: `${artifacts.outcome?.recovered || 0} recovered` },
      { label: 'blocked', value: artifacts.outcome?.blocked || 0, note: artifacts.groupSessionId || 'exact session' },
      { label: 'samples', value: artifacts.strategy?.sampleCount || 0, note: `${(artifacts.strategy?.preferredCategories || []).length} preferred` },
      { label: 'PTL', value: artifacts.ptlEmergency?.engaged ? artifacts.ptlEmergency?.emergencyLevel || 'engaged' : 'clear', note: `${artifacts.ptlEmergency?.blockedOutcomeCount || 0} blocked outcomes` },
      { label: 'scope', value: artifacts.groupSessionId || 'unbound', note: artifacts.scopeId || 'missing scope' }
    ]
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
  const providerNativeCompactSessionCapacityState = computed(() => {
    const capacity = providerNativeCompactSessionCapacity.value || {}
    if (!capacity.schema) return 'waiting'
    if (['failed', 'fail_closed'].includes(String(capacity.reconciliation?.status || ''))) return 'fail'
    if (capacity.checksum_valid === false) return 'fail'
    if (Number(capacity.rejected_outcome_count || 0) > 0) return 'warn'
    return Number(capacity.session_count || 0) > 0 || Number(capacity.reset_count || 0) > 0 ? 'ok' : 'waiting'
  })
  const providerNativeCompactSessionCapacityCards = computed(() => {
    const capacity = providerNativeCompactSessionCapacity.value || {}
    return [
      { label: 'generation', value: capacity.generation || 1, note: capacity.last_reset?.reset_id || 'initial' },
      { label: 'sessions', value: capacity.session_count || 0, note: `sticky ${capacity.sticky_beta_session_count || 0}` },
      { label: 'pending', value: capacity.pending_strong_outcome_count || 0, note: 'strong outcomes' },
      { label: 'latest cleared', value: capacity.provider_cleared_input_tokens_latest_total || 0, note: 'tokens' },
      { label: 'resets', value: capacity.reset_count || 0, note: capacity.last_reset?.reason || 'none' },
      { label: 'fenced', value: capacity.rejected_outcome_count || 0, note: 'stale outcomes' },
      { label: 'reconcile', value: capacity.reconciliation?.status || 'n/a', note: capacity.reconciliation?.boundary_id || 'no compact head' }
    ]
  })
  const providerNativeCompactSessionCapacityRows = computed(() => (providerNativeCompactSessionCapacity.value?.sessions || []).slice(0, 8))
  const providerNativeCompactSessionCapacityRejectedRows = computed(() => (providerNativeCompactSessionCapacity.value?.recent_rejected_outcomes || []).slice(0, 6))
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
      { label: '仅投递', value: totals.deliveredUnreported || 0, note: '无有效使用回执' },
      { label: '读访问', value: totals.readObserved || 0, note: 'Provider 工具事件' },
      { label: '不可观测', value: totals.captureUnavailable || 0, note: '执行器未提供工具流' },
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

  const acknowledgeSessionMemoryTrendIncident = async row => {
    const incident = row?.memoryShapeTrendActiveIncident
    if (!incident?.incidentId || sessionMemoryTrendAckLoading.value) return
    if (!await confirmDialog(`确认已检查会话 ${row.groupSessionId} 的趋势信号？该操作只更新告警可见状态，不会修改、压缩或删除记忆。`)) return
    sessionMemoryTrendAckLoading.value = incident.incidentId
    try {
      await requestJson('/api/memory-center/session-memory-shape-trend/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeId: row.scopeId,
          incidentId: incident.incidentId,
          incidentChecksum: incident.incidentChecksum,
          explicitConfirmation: true,
          actor: 'memory-center'
        })
      })
      await loadOverview(true)
      toast.success('趋势事件已确认，记忆策略保持不变')
    } catch (error) {
      toast.error(error.message || '趋势事件确认失败')
    } finally {
      sessionMemoryTrendAckLoading.value = ''
    }
  }

  const downloadSessionMemoryDiagnostic = async row => {
    const scopeId = String(row?.scopeId || (row?.groupId && row?.groupSessionId ? `${row.groupId}::${row.groupSessionId}` : ''))
    if (!scopeId || !String(row?.groupSessionId || '').startsWith('gcs_') || sessionMemoryDiagnosticExportLoading.value) return
    sessionMemoryDiagnosticExportLoading.value = scopeId
    try {
      const response = await fetch(`/api/memory-center/session-diagnostic-export?scope_id=${encodeURIComponent(scopeId)}`)
      if (!response.ok) {
        let error = null
        try { error = await response.json() } catch {}
        throw new Error(error?.error || '诊断导出失败')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const headerName = disposition.match(/filename="?([^";]+)"?/i)?.[1] || ''
      const fallbackName = `ccm-memory-diagnostic-${row.groupId}-${row.groupSessionId}.json`.replace(/[^a-zA-Z0-9._-]+/g, '-')
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = headerName || fallbackName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
      toast.success('已导出 body-free 会话诊断包')
    } catch (error) {
      toast.error(error.message || '诊断导出失败')
    } finally {
      sessionMemoryDiagnosticExportLoading.value = ''
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
        timeBasedMicrocompactEnabled: config.timeBasedMicrocompactEnabled === true,
        timeBasedThinkingClearEnabled: config.timeBasedThinkingClearEnabled === true,
        timeBasedMicrocompactGapMinutes: Number(config.timeBasedMicrocompactGapMinutes || 60),
        timeBasedMicrocompactKeepRecent: Number(config.timeBasedMicrocompactKeepRecent || 5),
        typedMemoryDeliveryMaxDocuments: Number(config.typedMemoryDeliveryMaxDocuments || 5),
        typedMemoryDeliveryMaxBytesPerDocument: Number(config.typedMemoryDeliveryMaxBytesPerDocument || 4096),
        typedMemoryDeliveryMaxLinesPerDocument: Number(config.typedMemoryDeliveryMaxLinesPerDocument || 200),
        typedMemoryDeliveryMaxSessionBytes: Number(config.typedMemoryDeliveryMaxSessionBytes || 61440),
        typedMemoryDeliveryMaxTokens: Number(config.typedMemoryDeliveryMaxTokens || 5000),
        sessionMemoryCompactMaxSectionTokens: Number(config.sessionMemoryCompactMaxSectionTokens || 2000),
        sessionMemoryCompactMaxTotalTokens: Number(config.sessionMemoryCompactMaxTotalTokens || 12000),
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

  const loadSessionMemoryCustomPrompt = async () => {
    sessionMemoryPromptLoading.value = true
    try {
      const scopeId = sessionMemoryPromptTarget.value
      const data = await requestJson(`/api/memory-center/session-memory-custom-prompt?scope_id=${encodeURIComponent(scopeId)}`)
      sessionMemoryPromptProfile.value = data.profile || null
      const direct = scopeId ? data.profile?.exactSession : data.profile?.global
      sessionMemoryPromptContent.value = direct?.present ? direct.content : (scopeId ? data.profile?.content || '' : '')
    } catch (error) {
      toast.error(error.message || '读取 Session Memory 提示词失败')
    } finally {
      sessionMemoryPromptLoading.value = false
    }
  }

  const loadSessionMemoryCustomTemplate = async () => {
    sessionMemoryTemplateLoading.value = true
    try {
      const scopeId = sessionMemoryPromptTarget.value
      const data = await requestJson(`/api/memory-center/session-memory-custom-template?scope_id=${encodeURIComponent(scopeId)}`)
      sessionMemoryTemplateProfile.value = data.profile || null
      const direct = scopeId ? data.profile?.exactSession : data.profile?.global
      sessionMemoryTemplateContent.value = direct?.present ? direct.content : data.profile?.content || ''
    } catch (error) {
      toast.error(error.message || '读取 Session Memory 模板失败')
    } finally {
      sessionMemoryTemplateLoading.value = false
    }
  }

  const loadSessionMemoryCustomization = async () => {
    await Promise.all([loadSessionMemoryCustomPrompt(), loadSessionMemoryCustomTemplate()])
  }

  const saveSessionMemoryCustomPrompt = async reset => {
    if (sessionMemoryPromptSaving.value) return
    const content = String(sessionMemoryPromptContent.value || '').trim()
    if (!reset && !content) return toast.error('提示词不能为空；需要恢复继承时请使用重置')
    if (content.length > 32000) return toast.error('提示词不能超过 32,000 个字符')
    sessionMemoryPromptSaving.value = true
    try {
      const data = await requestJson('/api/memory-center/session-memory-custom-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeId: sessionMemoryPromptTarget.value,
          content,
          reset: reset === true,
          actor: 'memory-center',
          reason: reset ? 'reset_custom_session_memory_prompt' : 'save_custom_session_memory_prompt'
        })
      })
      sessionMemoryPromptProfile.value = data.profile || null
      await loadSessionMemoryCustomPrompt()
      await loadOverview(true)
      toast.success(reset ? 'Session Memory 提示词已恢复继承' : 'Session Memory 提示词已保存')
    } catch (error) {
      toast.error(error.message || '保存 Session Memory 提示词失败')
    } finally {
      sessionMemoryPromptSaving.value = false
    }
  }

  const saveSessionMemoryCustomTemplate = async reset => {
    if (sessionMemoryTemplateSaving.value) return
    const content = String(sessionMemoryTemplateContent.value || '').trim()
    if (!reset && !content) return toast.error('模板不能为空；需要恢复继承时请使用重置')
    if (content.length > 48000) return toast.error('模板不能超过 48,000 个字符')
    if (!reset) {
      const lines = content.replace(/\r\n/g, '\n').split('\n')
      const headerIndexes = lines.map((line, index) => /^#\s+\S/.test(line) ? index : -1).filter(index => index >= 0)
      if (!headerIndexes.length || headerIndexes.length > 20) return toast.error('模板必须包含 1 到 20 个一级章节')
      if (headerIndexes.some(index => !/^_[^\r\n]+_$/.test(String(lines[index + 1] || '')))) return toast.error('每个一级章节下一行必须是下划线包围的描述')
      if (lines.some(line => /^#{2,6}\s+/.test(line))) return toast.error('模板不支持嵌套标题')
    }
    sessionMemoryTemplateSaving.value = true
    try {
      const data = await requestJson('/api/memory-center/session-memory-custom-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scopeId: sessionMemoryPromptTarget.value,
          content,
          reset: reset === true,
          actor: 'memory-center',
          reason: reset ? 'reset_custom_session_memory_template' : 'save_custom_session_memory_template'
        })
      })
      sessionMemoryTemplateProfile.value = data.profile || null
      await loadSessionMemoryCustomTemplate()
      await loadOverview(true)
      toast.success(reset ? 'Session Memory 模板已恢复继承' : 'Session Memory 模板已保存')
    } catch (error) {
      toast.error(error.message || '保存 Session Memory 模板失败')
    } finally {
      sessionMemoryTemplateSaving.value = false
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
    if (Number(settings.sessionMemoryCompactMaxSectionTokens || 0) < 250 || Number(settings.sessionMemoryCompactMaxSectionTokens || 0) > 20000) return toast.error('Session Memory 单章节投影必须介于 250 和 20000 token')
    if (Number(settings.sessionMemoryCompactMaxTotalTokens || 0) < 1000 || Number(settings.sessionMemoryCompactMaxTotalTokens || 0) > 100000) return toast.error('Session Memory 总投影必须介于 1000 和 100000 token')
    if (Number(settings.sessionMemoryCompactMaxTotalTokens || 0) < Number(settings.sessionMemoryCompactMaxSectionTokens || 0)) return toast.error('Session Memory 总投影不能小于单章节投影')
    if (Number(settings.timeBasedMicrocompactGapMinutes || 0) < 1 || Number(settings.timeBasedMicrocompactGapMinutes || 0) > 10080) return toast.error('时间触发间隔必须介于 1 和 10080 分钟')
    if (Number(settings.timeBasedMicrocompactKeepRecent || 0) < 1 || Number(settings.timeBasedMicrocompactKeepRecent || 0) > 100) return toast.error('保留工具结果数必须介于 1 和 100')
    contextSettingsSaving.value = true
    try {
      const data = await requestJson('/api/orchestrator/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryContextPreset: settings.memoryContextPreset,
          modelContextWindow: windowTokens,
          modelAutoCompactTokenLimit: thresholdTokens,
          timeBasedMicrocompactEnabled: settings.timeBasedMicrocompactEnabled === true,
          timeBasedThinkingClearEnabled: settings.timeBasedThinkingClearEnabled === true,
          timeBasedMicrocompactGapMinutes: Number(settings.timeBasedMicrocompactGapMinutes || 60),
          timeBasedMicrocompactKeepRecent: Number(settings.timeBasedMicrocompactKeepRecent || 5),
          typedMemoryDeliveryMaxDocuments: Number(settings.typedMemoryDeliveryMaxDocuments || 5),
          typedMemoryDeliveryMaxBytesPerDocument: Number(settings.typedMemoryDeliveryMaxBytesPerDocument || 4096),
          typedMemoryDeliveryMaxLinesPerDocument: Number(settings.typedMemoryDeliveryMaxLinesPerDocument || 200),
          typedMemoryDeliveryMaxSessionBytes: Number(settings.typedMemoryDeliveryMaxSessionBytes || 61440),
          typedMemoryDeliveryMaxTokens: Number(settings.typedMemoryDeliveryMaxTokens || 5000),
          sessionMemoryCompactMaxSectionTokens: Number(settings.sessionMemoryCompactMaxSectionTokens || 2000),
          sessionMemoryCompactMaxTotalTokens: Number(settings.sessionMemoryCompactMaxTotalTokens || 12000),
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
        timeBasedMicrocompactEnabled: config.timeBasedMicrocompactEnabled === true,
        timeBasedThinkingClearEnabled: config.timeBasedThinkingClearEnabled === true,
        timeBasedMicrocompactGapMinutes: Number(config.timeBasedMicrocompactGapMinutes || 60),
        timeBasedMicrocompactKeepRecent: Number(config.timeBasedMicrocompactKeepRecent || 5),
        typedMemoryDeliveryMaxDocuments: Number(config.typedMemoryDeliveryMaxDocuments || 5),
        typedMemoryDeliveryMaxBytesPerDocument: Number(config.typedMemoryDeliveryMaxBytesPerDocument || 4096),
        typedMemoryDeliveryMaxLinesPerDocument: Number(config.typedMemoryDeliveryMaxLinesPerDocument || 200),
        typedMemoryDeliveryMaxSessionBytes: Number(config.typedMemoryDeliveryMaxSessionBytes || 61440),
        typedMemoryDeliveryMaxTokens: Number(config.typedMemoryDeliveryMaxTokens || 5000),
        sessionMemoryCompactMaxSectionTokens: Number(config.sessionMemoryCompactMaxSectionTokens || 2000),
        sessionMemoryCompactMaxTotalTokens: Number(config.sessionMemoryCompactMaxTotalTokens || 12000),
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

  const extractSessionMemoryNow = async row => {
    const scopeId = `${row.groupId}::${row.groupSessionId}`
    if (sessionMemoryManualExtractionRunning.value) return
    if (!await confirmDialog(`立即使用会话 ${row.groupSessionId} 的完整当前记录重新提炼 Session Memory？`)) return
    sessionMemoryManualExtractionRunning.value = scopeId
    try {
      const data = await requestJson('/api/memory-center/operation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'group',
          scope_id: scopeId,
          operation: 'extract_session_memory_now',
          reason: '用户在记忆中心手动立即抽取当前群聊会话记忆',
          explicitExecution: true
        })
      })
      toast.success(`Session Memory 已更新 · ${data.result?.executionId || 'receipt committed'}`)
      await loadOverview(true)
    } catch (error) {
      const labels = {
        manual_extraction_empty_transcript: '当前会话没有可抽取的消息',
        manual_extraction_model_not_invoked: '手动抽取未实际调用模型，已拒绝假成功',
        model_executor_unavailable: 'Session Memory 模型执行器当前不可用'
      }
      toast.error(labels[error.message] || error.message || 'Session Memory 立即抽取失败')
    } finally {
      sessionMemoryManualExtractionRunning.value = ''
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
    if (operation === 'approve_live_memory_wave') return '批准一次耐久波次'
    if (operation === 'approve_live_memory_transition_canary') return '批准一次版本迁移 Canary'
    if (operation === 'approve_live_memory_initial_baseline_canary') return '批准首次 Provider 记忆基线'
    if (operation === 'revoke_live_memory_wave') return '撤销耐久波次批准'
    if (operation === 'prune_live_memory_wave_approvals') return '清理耐久波次审批回执'
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
    if (operation === 'approve_live_memory_wave') return '创建一张绑定当前 endurance 报告、Provider 版本、并发和 timeout 的 30 分钟单次凭据。批准本身不执行，但后续显式执行可能产生 Provider 费用。'
    if (operation === 'approve_live_memory_transition_canary') return '当前 Provider 身份已变化。创建仅允许 2 个隔离群聊、并发 1 的 15 分钟单次 canary 凭据；执行可能产生 Provider 费用，成功后仍须通过新版本记忆连续性晋升门禁。'
    if (operation === 'approve_live_memory_initial_baseline_canary') return '当前 Provider 已安装但尚无可信 endurance 基线。创建仅允许 2 个隔离群聊、并发 1 的 15 分钟单次凭据；执行可能产生 Provider 费用，成功证据必须晋升为首份 Provider 专属基线。'
    if (operation === 'revoke_live_memory_wave') return '立即消费并撤销当前未执行的单次凭据。撤销后不能恢复，也不能用于启动 Provider 波次。'
    if (operation === 'prune_live_memory_wave_approvals') return '只清理超过终态保留期或数量上限的有效审批回执。active、claimed、篡改记录和被引用报告均会保留。'
    return '使用最近有效备份替换主记忆，并保留回滚前快照。'
  }

  const openOperation = operation => {
    operationState.value = {
      operation,
      reason: operation === 'archive_selftest_residue'
        ? 'Memory Center 归档 Global Agent 自测残留'
        : operation === 'prune_task_agent_memory_context_snapshots'
          ? 'Memory Center 清理过期 task Agent 记忆上下文快照'
          : operation === 'approve_live_memory_wave'
            ? 'Memory Center 用户显式批准当前建议耐久波次'
            : operation === 'approve_live_memory_transition_canary'
              ? 'Memory Center 用户显式确认 Provider 身份变化并批准最小记忆连续性 canary'
            : operation === 'approve_live_memory_initial_baseline_canary'
              ? 'Memory Center 用户显式确认当前 Provider 尚无基线并批准最小首次基线 canary'
            : operation === 'revoke_live_memory_wave'
              ? 'Memory Center 用户显式撤销当前耐久波次批准'
              : operation === 'prune_live_memory_wave_approvals'
                ? 'Memory Center 清理已超过保留策略的终态耐久波次审批回执'
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

  const approveLiveMemoryWave = async reason => {
    if (liveMemoryWaveApprovalLoading.value) return
    const preview = liveMemoryWaveApprovalPreview.value || {}
    if (!preview.approvable) return toast.error('当前耐久波次不满足批准门禁')
    liveMemoryWaveApprovalLoading.value = true
    try {
      const data = await requestJson('/api/memory-center/live-endurance-wave-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explicitApproval: true,
          riskAccepted: true,
          approvedBy: 'memory-center-local-user',
          reason,
          enduranceReportChecksum: preview.enduranceReportChecksum,
          planChecksum: preview.planChecksum,
          provider: preview.plan?.provider || ''
        })
      })
      operationState.value = null
      toast.success(`单次批准已创建：${data.receipt?.receiptId || 'receipt'}`)
      await loadOverview(true)
    } catch (error) {
      toast.error(error.message || '耐久波次批准失败')
    } finally {
      liveMemoryWaveApprovalLoading.value = false
    }
  }

  const approveLiveMemoryTransitionCanary = async reason => {
    if (liveMemoryWaveApprovalLoading.value) return
    const preview = liveMemoryTransitionCanaryPreview.value || {}
    if (!preview.approvable) return toast.error('当前版本迁移不满足 canary 批准门禁')
    liveMemoryWaveApprovalLoading.value = true
    try {
      const data = await requestJson('/api/memory-center/live-endurance-wave-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_transition_canary',
          explicitApproval: true,
          riskAccepted: true,
          transitionAcknowledged: true,
          approvedBy: 'memory-center-local-user',
          reason,
          enduranceReportChecksum: preview.enduranceReportChecksum,
          planChecksum: preview.planChecksum,
          provider: preview.plan?.provider || ''
        })
      })
      operationState.value = null
      toast.success(`版本迁移 canary 批准已创建：${data.receipt?.receiptId || 'receipt'}`)
      await loadOverview(true)
    } catch (error) {
      toast.error(error.message || '版本迁移 canary 批准失败')
    } finally {
      liveMemoryWaveApprovalLoading.value = false
    }
  }

  const approveLiveMemoryInitialBaselineCanary = async reason => {
    if (liveMemoryWaveApprovalLoading.value) return
    const preview = liveMemoryInitialBaselineCanaryPreview.value || {}
    if (!preview.approvable) return toast.error('当前 Provider 不满足首次基线批准门禁')
    liveMemoryWaveApprovalLoading.value = true
    try {
      const data = await requestJson('/api/memory-center/live-endurance-wave-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_initial_baseline_canary',
          explicitApproval: true,
          riskAccepted: true,
          initialBaselineAcknowledged: true,
          approvedBy: 'memory-center-local-user',
          reason,
          baselineAbsenceChecksum: preview.baselineAbsenceChecksum,
          planChecksum: preview.planChecksum,
          provider: preview.plan?.provider || '',
          model: preview.plan?.model || ''
        })
      })
      operationState.value = null
      toast.success(`首次基线 canary 批准已创建：${data.receipt?.receiptId || 'receipt'}`)
      await loadOverview(true)
    } catch (error) {
      toast.error(error.message || '首次基线 canary 批准失败')
    } finally {
      liveMemoryWaveApprovalLoading.value = false
    }
  }

  const revokeLiveMemoryWave = async reason => {
    if (liveMemoryWaveApprovalLoading.value) return
    const receipt = liveMemoryWaveActiveApproval.value
    if (!receipt) return toast.error('没有可撤销的耐久波次批准')
    liveMemoryWaveApprovalLoading.value = true
    try {
      await requestJson('/api/memory-center/live-endurance-wave-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          explicitRevocation: true,
          revokedBy: 'memory-center-local-user',
          reason,
          receiptId: receipt.receiptId,
          receiptChecksum: receipt.receiptChecksum
        })
      })
      operationState.value = null
      toast.success('耐久波次批准已撤销')
      await loadOverview(true)
    } catch (error) {
      toast.error(error.message || '撤销耐久波次批准失败')
    } finally {
      liveMemoryWaveApprovalLoading.value = false
    }
  }

  const runLiveMemoryWaveApprovalRetention = async (dryRun = true, reason = '') => {
    if (liveMemoryWaveApprovalRetentionLoading.value) return
    liveMemoryWaveApprovalRetentionLoading.value = true
    try {
      const data = await requestJson('/api/memory-center/live-endurance-wave-approval-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execute: !dryRun,
          explicitPrune: !dryRun,
          actor: 'memory-center-local-user',
          reason: reason || (dryRun ? 'Memory Center 预演耐久波次审批回执保留' : 'Memory Center 清理终态耐久波次审批回执')
        })
      })
      liveMemoryWaveApprovalRetentionResult.value = data.result || null
      if (!dryRun) operationState.value = null
      toast.success(dryRun
        ? `预演完成：可清理 ${data.result?.prunableCount || 0} 张终态回执`
        : `清理完成：已删除 ${data.result?.prunedCount || 0} 张终态回执`)
      await loadOverview(true)
    } catch (error) {
      toast.error(error.message || '耐久波次审批回执维护失败')
    } finally {
      liveMemoryWaveApprovalRetentionLoading.value = false
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
    if (state.operation === 'approve_live_memory_wave') {
      await approveLiveMemoryWave(state.reason)
      return
    }
    if (state.operation === 'approve_live_memory_transition_canary') {
      await approveLiveMemoryTransitionCanary(state.reason)
      return
    }
    if (state.operation === 'approve_live_memory_initial_baseline_canary') {
      await approveLiveMemoryInitialBaselineCanary(state.reason)
      return
    }
    if (state.operation === 'revoke_live_memory_wave') {
      await revokeLiveMemoryWave(state.reason)
      return
    }
    if (state.operation === 'prune_live_memory_wave_approvals') {
      await runLiveMemoryWaveApprovalRetention(false, state.reason)
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

  onMounted(async () => {
    await loadOverview(false)
    await loadSessionMemoryCustomization()
  })

  return {
    Download,
    ShieldCheck,
    Sparkles,
    acknowledgeInvalidRefreshOutcome,
    acknowledgeSessionMemoryTrendIncident,
    activeType,
    activeView,
    agentTypeReplay,
    agentTypeReplayCards,
    apiMicroCompactEditPlan,
    apiMicroCompactEditPlanCards,
    apiMicroCompactEditPlanGaps,
    apiMicroCompactEditPlanRows,
    apiMicroCompactEditPlanState,
    apiMicrocompactNativeApplyProof,
    apiMicrocompactNativeApplyProofCards,
    apiMicrocompactNativeApplyProofGaps,
    apiMicrocompactNativeApplyProofRows,
    apiMicrocompactNativeApplyProofState,
    apiMicrocompactNativeApplyReadiness,
    apiMicrocompactNativeApplyReadinessCards,
    apiMicrocompactNativeApplyReadinessGaps,
    apiMicrocompactNativeApplyReadinessRows,
    apiMicrocompactNativeApplyReadinessState,
    apiMicrocompactReceiptDiscipline,
    apiMicrocompactReceiptDisciplineCards,
    apiMicrocompactReceiptDisciplineGaps,
    apiMicrocompactReceiptDisciplineRows,
    apiMicrocompactReceiptDisciplineState,
    approveLiveMemoryInitialBaselineCanary,
    approveLiveMemoryTransitionCanary,
    approveLiveMemoryWave,
    audit,
    autoCompactCircuitBreaker,
    autoCompactCircuitBreakerCards,
    autoCompactCircuitBreakerEvents,
    autoCompactCircuitBreakerState,
    boundaryReplay,
    boundaryReplayCards,
    boundaryReplayRepairActions,
    boundaryReplayRepairLedger,
    boundaryReplayRepairWorkItems,
    boundaryReplayRepairWorkRows,
    childAgentReliability,
    childAgentReliabilityCards,
    compactBoundaryTimeline,
    compactBoundaryTimelineCards,
    compactDisplay,
    compactFileReferenceAccess,
    compactFileReferenceCards,
    compactFileReferenceDiscipline,
    compactFileReferenceDisciplineCards,
    compactFileReferenceDisciplineGaps,
    compactFileReferenceDisciplineRows,
    compactFileReferenceDisciplineState,
    compactFileReferenceReadPlan,
    compactFileReferenceReadPlanAccess,
    compactFileReferenceReadPlanCards,
    compactFileReferenceReadPlanDiscipline,
    compactFileReferenceReadPlanFreshness,
    compactFileReferenceReadPlanFreshnessCards,
    compactFileReferenceReadPlanFreshnessGaps,
    compactFileReferenceReadPlanFreshnessRows,
    compactFileReferenceReadPlanFreshnessState,
    compactFileReferenceReadPlanReceiptCards,
    compactFileReferenceReadPlanReceiptGaps,
    compactFileReferenceReadPlanReceiptRows,
    compactFileReferenceReadPlanReceiptState,
    compactFileReferenceReadPlanRevalidationCards,
    compactFileReferenceReadPlanRevalidationDiscipline,
    compactFileReferenceReadPlanRevalidationGaps,
    compactFileReferenceReadPlanRevalidationGate,
    compactFileReferenceReadPlanRevalidationRows,
    compactFileReferenceReadPlanRevalidationSessionBinding,
    compactFileReferenceReadPlanRevalidationState,
    compactFileReferenceReadPlanRows,
    compactFileReferenceReadPlanState,
    compactFileReferenceRows,
    compactFileReferences,
    compactStrategyDecision,
    compactStrategyDecisionCards,
    compactStrategyDecisionGaps,
    compactStrategyDecisionState,
    compactionHookCards,
    compactionHooks,
    compactionModelUsage,
    compactionModelUsageCards,
    compactionModelUsageState,
    compactionSummaryInputProjection,
    compactionSummaryInputProjectionCards,
    compactionSummaryInputProjectionState,
    contextPresets,
    contextSettings,
    contextSettingsLoading,
    contextSettingsSaving,
    controlItem,
    crossGroupAdvisoryRows,
    crossGroupFreshnessCheck,
    crossGroupQualityAvailable,
    crossGroupQualityCards,
    crossGroupQualityRows,
    crossGroupRowState,
    crossGroupSuppressionCheck,
    crossGroupSuppressionRows,
    crossProjectPressureUsageAvailable,
    crossProjectPressureUsageCards,
    crossProjectPressureUsageCheck,
    crossProjectPressureUsageReport,
    crossProjectPressureUsageRowState,
    crossProjectPressureUsageRows,
    crossProjectPressureUsageState,
    detail,
    dispatchActionLabel,
    dispatchActions,
    dispatchRecovery,
    dispatchRecoveryLoading,
    dispatchRecoveryRows,
    dispatchRecoverySummaryCards,
    dispatchResolveLoading,
    dispatchResolveState,
    dispatchStateLabel,
    downloadSessionMemoryDiagnostic,
    editState,
    evidence,
    evidenceOpen,
    expandedDispatchId,
    extractSessionMemoryNow,
    formatBytes,
    formatMetric,
    formatNumber,
    formatRate,
    formatSigned,
    formatTime,
    globalBridgeCheck,
    globalMemoryArbitrationAvailable,
    globalSelftestArchiveCards,
    globalSelftestArchiveState,
    globalSelftestContaminationCheck,
    globalSelftestHasActivePollution,
    globalSelftestHasResidue,
    globalSelftestResidueRows,
    globalSelftestScan,
    groupSessionMemory,
    groupSessionMemoryCards,
    groupToolContinuity,
    groupToolContinuityCards,
    groupToolContinuityRows,
    groupToolContinuityState,
    historicalBoundaryReplay,
    historicalBoundaryReplayCards,
    ignoreMemoryReceiptAvailable,
    ignoreMemoryReceiptBriefCheck,
    ignoreMemoryReceiptBriefReport,
    ignoreMemoryReceiptCandidateCheck,
    ignoreMemoryReceiptCandidateReport,
    ignoreMemoryReceiptCards,
    ignoreMemoryReceiptComplianceCheck,
    ignoreMemoryReceiptComplianceReport,
    ignoreMemoryReceiptRepairCheck,
    ignoreMemoryReceiptRepairReport,
    ignoreMemoryReceiptRows,
    ignoreMemoryReceiptState,
    ignoreMemoryReceiptTypedMemoryCheck,
    ignoreMemoryReceiptTypedMemoryReport,
    ignoreMemoryReceiptWorkItemRows,
    invalidModelCapabilityRefreshOutcomes,
    invalidRefreshOutcomeAcknowledging,
    itemGroups,
    liveMemoryInitialBaselineCanaryPreview,
    liveMemoryInitialBaselineCanaryProviderPreviews,
    liveMemoryTransitionCanaryPreview,
    liveMemoryTransitionCanaryProviderPreviews,
    liveMemoryVersionTransitionLedger,
    liveMemoryWaveActiveApproval,
    liveMemoryWaveApprovalAction,
    liveMemoryWaveApprovalInventory,
    liveMemoryWaveApprovalLabel,
    liveMemoryWaveApprovalLoading,
    liveMemoryWaveApprovalPreview,
    liveMemoryWaveApprovalProviderPreviews,
    liveMemoryWaveApprovalRetentionLoading,
    liveMemoryWaveApprovalRetentionResult,
    liveMemoryWaveApprovalTitle,
    liveMemoryWaveHasActiveApproval,
    liveMemoryWaveHasPrunableApprovals,
    liveMemoryWaveProvider,
    loadAudit,
    loadContextSettings,
    loadDetail,
    loadDispatchRecovery,
    loadOverview,
    loadQuality,
    loadSessionMemoryCustomPrompt,
    loadSessionMemoryCustomTemplate,
    loadSessionMemoryCustomization,
    loading,
    memoryStats,
    mergeTargetedQualityReport,
    metricCards,
    modelCapabilityDowngradeAlerts,
    modelCapabilityEntries,
    modelCapabilityMaintenanceRunning,
    modelCapabilityRefreshOutcomeLedger,
    modelCapabilityRefreshPlan,
    modelCapabilityRefreshStatus,
    modelCapabilitySaving,
    modelCapabilitySetting,
    modelCapacityStatus,
    normalizeCrossGroupQualityRow,
    openDispatchResolve,
    openEdit,
    openEvidence,
    openOperation,
    operationNote,
    operationState,
    operationTitle,
    overview,
    pendingTypedMemoryStaleCandidates,
    postCompactBuckets,
    postCompactCards,
    postCompactCleanupAudit,
    postCompactCleanupAuditCards,
    postCompactCleanupAuditGaps,
    postCompactCleanupAuditRows,
    postCompactCleanupAuditState,
    postCompactDiscipline,
    postCompactDisciplineCards,
    postCompactDisciplineGaps,
    postCompactDispatch,
    postCompactDispatchCards,
    postCompactDynamicContextDelta,
    postCompactDynamicContextDeltaCards,
    postCompactDynamicContextDeltaState,
    postCompactFileRestoreDedup,
    postCompactFileRestoreDedupCards,
    postCompactFileRestoreDedupState,
    postCompactInvokedSkillAttachment,
    postCompactInvokedSkillAttachmentCards,
    postCompactInvokedSkillAttachmentState,
    postCompactPlanAttachment,
    postCompactPlanAttachmentCards,
    postCompactPlanAttachmentState,
    postCompactRecallRows,
    postCompactSessionStateReset,
    postCompactSessionStateResetCards,
    postCompactSessionStateResetState,
    postCompactTaskStatusProjection,
    postCompactTaskStatusProjectionCards,
    postCompactTaskStatusProjectionState,
    postCompactTaskStatusRows,
    postCompactTotals,
    postCompactUsage,
    promptCacheBreakDetection,
    promptCacheBreakDetectionCards,
    promptCacheBreakDetectionEvents,
    promptCacheBreakDetectionState,
    promptCacheCompactionNotification,
    providerNativeCompactSessionCapacity,
    providerNativeCompactSessionCapacityCards,
    providerNativeCompactSessionCapacityRejectedRows,
    providerNativeCompactSessionCapacityRows,
    providerNativeCompactSessionCapacityState,
    providerRuntimeContractRows,
    qualityCheckById,
    qualityChecks,
    qualityLoading,
    qualityReport,
    qualityRunMeta,
    qualityStatusFromScore,
    qualityStatusText,
    qualityTargetedSummary,
    query,
    reactiveCompactRetryOwnership,
    reactiveCompactRetryOwnershipCards,
    reactiveCompactRetryOwnershipRows,
    reactiveCompactRetryOwnershipState,
    recommendationText,
    refreshQualityCheck,
    removeBlockedPattern,
    replayRepairDispatchCandidates,
    replayRepairDispatchRows,
    replaySessionMemoryExtraction,
    replayWorkActionLabel,
    requestJson,
    resolveTypedMemoryStaleCandidate,
    resumeProjection,
    retrySessionMemoryTypedCommit,
    revokeLiveMemoryWave,
    revokeModelCapability,
    runAcceptance,
    runGlobalSelftestResidueArchive,
    runLiveMemoryWaveApprovalRetention,
    runModelCapabilityMaintenance,
    runOperation,
    runQuality,
    runSessionMemoryArtifactRetention,
    runSessionRetentionMaintenance,
    runTaskAgentSnapshotRetention,
    saveContextSettings,
    saveModelCapability,
    saveSessionMemoryCustomPrompt,
    saveSessionMemoryCustomTemplate,
    scopes,
    selectContextPreset,
    selectScope,
    selectedId,
    selectedLiveMemoryProviderPreview,
    selectedScope,
    selectedSummary,
    selftestResidueArchiveLoading,
    selftestResidueArchiveResult,
    semanticRecallRows,
    semanticRecallScoring,
    sessionMemoryArtifactRetentionResult,
    sessionMemoryArtifactRetentionRunning,
    sessionMemoryCustomizationMode,
    sessionMemoryDiagnosticExportLoading,
    sessionMemoryFleetCards,
    sessionMemoryFleetOverall,
    sessionMemoryFleetReport,
    sessionMemoryFleetRows,
    sessionMemoryFleetState,
    sessionMemoryHistoryRows,
    sessionMemoryManualExtractionRunning,
    sessionMemoryPromptContent,
    sessionMemoryPromptLoading,
    sessionMemoryPromptProfile,
    sessionMemoryPromptSaving,
    sessionMemoryPromptTarget,
    sessionMemoryPromptTargets,
    sessionMemoryReplayCheckLabels,
    sessionMemoryReplayChecks,
    sessionMemoryReplayLoading,
    sessionMemoryReplayResult,
    sessionMemoryTemplateContent,
    sessionMemoryTemplateLoading,
    sessionMemoryTemplateProfile,
    sessionMemoryTemplateSaving,
    sessionMemoryTrendAckLoading,
    sessionMemoryTypedRetryRunning,
    sessionRetentionRunning,
    sessionRetentionStatus,
    setView,
    submitDispatchResolve,
    submitEdit,
    submitFeedback,
    summarizeQualityChecks,
    targetedQualityLoading,
    taskAgentContinuationSoakRows,
    taskAgentDiagnosticFleet,
    taskAgentInvocationRows,
    taskAgentMemoryContextSnapshotCards,
    taskAgentMemoryContextSnapshotCheck,
    taskAgentMemoryContextSnapshotRows,
    taskAgentMemoryContextSnapshotState,
    taskAgentMemoryContextSnapshots,
    taskAgentModelReceiptLifecycle,
    taskAgentModelReceiptRecovery,
    taskAgentModelReceiptRecoveryRows,
    taskAgentModelReceiptRows,
    taskAgentSnapshotCards,
    taskAgentSnapshotHasPrunable,
    taskAgentSnapshotReport,
    taskAgentSnapshotRetentionLoading,
    taskAgentSnapshotRetentionResult,
    taskAgentSnapshotRows,
    taskAgentSnapshotState,
    timeBasedThinkingMicrocompact,
    timeBasedThinkingMicrocompactCards,
    timeBasedThinkingMicrocompactState,
    timeBasedToolResultMicrocompact,
    timeBasedToolResultMicrocompactCards,
    timeBasedToolResultMicrocompactState,
    toggleDispatchTranscript,
    truePostCompactPayload,
    truePostCompactPayloadCards,
    truePostCompactPayloadGaps,
    truePostCompactPayloadState,
    typeLabels,
    typedMemoryArtifactTransaction,
    typedMemoryConsumptionCards,
    typedMemoryConsumptionLedger,
    typedMemoryConsumptionRows,
    typedMemoryConsumptionScoring,
    typedMemoryDirectOperationCards,
    typedMemoryDirectOperations,
    typedMemoryDistillationPreflight,
    typedMemoryDistillationTransaction,
    typedMemoryEntrypoint,
    typedMemoryStaleCandidateLedger,
    typedMemoryStaleCandidates,
    typedMemoryWriteAdmission,
    typedMemoryWriteAdmissionCards,
    updateReplayRepairWorkItem,
    updateReplayRepairWorkItemForGroup,
    visibleGroups,
    weakChildAgents,
    workerContextCompactSessionArtifacts,
    workerContextCompactSessionCards,
    workerContextCompactSessionState
  }
}
