"use strict";
// Behavior-freeze split from group-memory-distillation.ts (part 3/3).
// Extracted functional module. The original entry remains a compatibility facade.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.distillPtlEmergencyDowngradeToTypedMemory = distillPtlEmergencyDowngradeToTypedMemory;
exports.evaluateGroupTypedMemoryDistillationQuality = evaluateGroupTypedMemoryDistillationQuality;
exports.inspectGroupTypedMemoryDistillationWork = inspectGroupTypedMemoryDistillationWork;
exports.distillGroupMessagesToTypedMemory = distillGroupMessagesToTypedMemory;
exports.distillGroupMessagesToTypedMemoryUntilCaughtUp = distillGroupMessagesToTypedMemoryUntilCaughtUp;
exports.runGroupTypedMemoryDistillationMutationCoordinatorSelfTest = runGroupTypedMemoryDistillationMutationCoordinatorSelfTest;
exports.runGroupTypedMemoryLogDistillationSelfTest = runGroupTypedMemoryLogDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactUsageDistillationSelfTest = runGroupTypedMemoryPostCompactUsageDistillationSelfTest;
exports.runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest = runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest;
exports.runGroupTypedMemoryDistillationQualitySelfTest = runGroupTypedMemoryDistillationQualitySelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const group_memory_index_1 = require("./group-memory-index");
const group_memory_distillation_part_01_1 = require("./group-memory-distillation-part-01");
function distillPtlEmergencyDowngradeToTypedMemory(groupId, input = {}, options = {}) {
    if (options.__distillationMutationCoordinator !== true)
        return (0, group_memory_distillation_part_01_1.runGroupTypedMemoryDistillationMutation)(groupId, "ptl_emergency_downgrade", options, () => distillPtlEmergencyDowngradeToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
            version: group_memory_index_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || (0, group_memory_index_1.now)());
    const archive = (0, group_memory_index_1.ptlEmergencyTypedArchive)(groupId, input, { ...options, updatedAt });
    const ledger = (0, group_memory_distillation_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const writes = [];
    if (archive.engaged || archive.outcome_count > 0 || archive.blocked_outcome_count > 0) {
        writes.push((0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
            type: "feedback",
            slug: "worker-context-ptl-emergency-downgrade",
            name: "WorkerContextPacket PTL emergency downgrade discipline",
            description: "Emergency downgrade budgets and cautions for repeated WorkerContextPacket compact failures.",
            source: "auto:ptl-emergency-downgrade-distillation",
            updatedAt,
            body: (0, group_memory_index_1.renderPtlEmergencyTypedBody)(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    (0, group_memory_index_1.writeJsonAtomic)(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        groupSessionId: archive.groupSessionId || "",
        facts: ledger.facts || {},
        ptlEmergencyArchive: archive,
        updatedAt,
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
        version: group_memory_index_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        groupSessionId: archive.groupSessionId || "",
        skipped: false,
        reason: (0, group_memory_index_1.compactText)(options.reason || "", 220),
        ledgerFile: ledger.file,
        engaged: archive.engaged,
        emergencyLevel: archive.emergency_level,
        blockedOutcomeCount: archive.blocked_outcome_count,
        taskCompactedBlockedCount: archive.task_compacted_blocked_count,
        failedCategoryCount: archive.failed_category_count,
        outcomeCount: archive.outcome_count,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function evaluateGroupTypedMemoryDistillationQuality(groupId, options = {}) {
    const evaluatedAt = (0, group_memory_index_1.now)();
    const projectRoot = path.resolve(String(options.projectRoot || options.project_root || process.cwd()));
    const ledger = (0, group_memory_distillation_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
    const facts = (0, group_memory_index_1.collectDistilledFacts)(ledger);
    const checks = [];
    const factsByType = new Map();
    for (const fact of facts) {
        const type = (0, group_memory_index_1.normalizeMemoryType)(fact.category || fact.type);
        factsByType.set(type, [...(factsByType.get(type) || []), fact]);
    }
    const inadmissibleFacts = facts
        .map(fact => ({ fact, admission: (0, group_memory_index_1.groupLogDistillationAdmission)(fact) }))
        .filter(row => !row.admission.admitted)
        .map(row => `#${row.fact.messageId || ""} ${row.fact.type || row.fact.category || ""}: ${row.admission.reason}`)
        .slice(0, 30);
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "long_term_write_admission",
        label: "长期记忆写入符合非流水准入规则",
        pass: inadmissibleFacts.length === 0 && ledger.admission?.schema === "ccm-group-typed-memory-write-admission-v1",
        severity: "fatal",
        detail: inadmissibleFacts.length
            ? "长期记忆仍包含可重建、临时或缺少非显然理由的流水事实。"
            : "通用群聊蒸馏只保留跨会话有效且满足 Claude Code 写入门槛的事实。",
        evidence: [{
                evaluatedThisRun: Number(ledger.admission?.evaluatedThisRun || 0),
                admittedThisRun: Number(ledger.admission?.admittedThisRun || 0),
                rejectedThisRun: Number(ledger.admission?.rejectedThisRun || 0),
                evictedExistingFactCount: Number(ledger.admission?.evictedExistingFactCount || 0),
            }],
        gaps: inadmissibleFacts,
    });
    const invalidPositiveFeedbackFacts = facts
        .filter(fact => fact.type === "validated_approach")
        .filter(fact => {
        const binding = fact?.confirmation || {};
        return binding.schema !== "ccm-group-positive-feedback-binding-v1"
            || binding.explicit !== true
            || binding.targetFound !== true
            || binding.targetSourceRole !== "assistant"
            || binding.scopeMatches !== true
            || binding.checksumMatches !== true
            || binding.targetEligible !== true;
    })
        .map(fact => `#${fact.messageId || ""} validated_approach`)
        .slice(0, 30);
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "positive_feedback_binding",
        label: "正向反馈绑定同会话非显然做法",
        pass: invalidPositiveFeedbackFacts.length === 0,
        severity: "fatal",
        detail: invalidPositiveFeedbackFacts.length
            ? "存在没有可靠绑定到同会话 Assistant 做法的正向反馈记忆。"
            : "正向反馈只在同会话目标、checksum、跨会话价值和 Why/How 全部成立时写入。",
        gaps: invalidPositiveFeedbackFacts,
    });
    const positiveFeedbackLifecycle = ledger.positiveFeedbackLifecycle || {};
    const lifecycleEvents = Array.isArray(positiveFeedbackLifecycle.events) ? positiveFeedbackLifecycle.events : [];
    const activeFactIds = new Set(facts.map(fact => String(fact.id || "")).filter(Boolean));
    const invalidLifecycleEvents = lifecycleEvents.filter((event) => event.schema !== "ccm-group-positive-feedback-lifecycle-event-v1"
        || Number(event.version || 0) !== group_memory_index_1.GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION
        || event.groupId !== groupId
        || !["revoked", "superseded"].includes(String(event.action || ""))
        || !event.eventId
        || !event.targetFactId
        || !event.targetConfirmationMessageId
        || !event.targetApproachMessageId
        || !/^[a-f0-9]{64}$/.test(String(event.targetApproachChecksum || ""))
        || !event.revocationMessageId
        || !event.reason
        || (event.action === "superseded" && (!event.replacementFactId || !event.replacementMessageId))
        || event.eventChecksum !== (0, group_memory_index_1.positiveFeedbackLifecycleEventChecksum)(event)
        || activeFactIds.has(String(event.targetFactId || ""))).map((event) => `#${event.eventId || "missing"} ${event.action || "unknown"}`).slice(0, 30);
    const lifecycleObservationsLeakBody = (Array.isArray(positiveFeedbackLifecycle.observations) ? positiveFeedbackLifecycle.observations : [])
        .some((row) => row?.text !== undefined || row?.content !== undefined || row?.reasonText !== undefined);
    const lifecycleSummaryMatches = Number(positiveFeedbackLifecycle.activeValidatedCount || 0)
        === facts.filter(fact => fact.type === "validated_approach").length;
    const lifecycleApplicable = positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
        || lifecycleEvents.length > 0
        || facts.some(fact => fact.type === "validated_approach");
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "positive_feedback_lifecycle",
        label: "正向反馈撤销与替代保持可验证生命周期",
        pass: !lifecycleApplicable || (positiveFeedbackLifecycle.schema === "ccm-group-positive-feedback-lifecycle-v1"
            && positiveFeedbackLifecycle.groupId === groupId
            && invalidLifecycleEvents.length === 0
            && lifecycleObservationsLeakBody === false
            && lifecycleSummaryMatches),
        severity: "fatal",
        detail: invalidLifecycleEvents.length || lifecycleObservationsLeakBody || !lifecycleSummaryMatches
            ? "正向反馈生命周期存在无效事件、活动事实残留、统计偏差或拒绝正文泄漏。"
            : "被撤销或替代的正向反馈不再进入活动 MEMORY.md，并保留同会话绑定和校验事件。",
        gaps: [
            ...invalidLifecycleEvents,
            ...(lifecycleObservationsLeakBody ? ["rejected_lifecycle_observation_body_leak"] : []),
            ...(!lifecycleSummaryMatches ? ["active_validated_count_mismatch"] : []),
        ],
    });
    const expectedTypes = [...factsByType.keys()].filter(type => (factsByType.get(type) || []).length > 0);
    const docsByType = new Map();
    for (const doc of docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation")) {
        docsByType.set(doc.type, [...(docsByType.get(doc.type) || []), doc]);
    }
    const missingTypeDocs = expectedTypes.filter(type => !(docsByType.get(type) || []).length);
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "typed_doc_coverage",
        label: "蒸馏事实有对应 typed Markdown",
        pass: missingTypeDocs.length === 0,
        severity: "high",
        detail: missingTypeDocs.length ? "部分蒸馏事实类别缺少对应 Markdown 记忆。" : "所有有事实的类别都有 Markdown 记忆。",
        gaps: missingTypeDocs,
    });
    const docText = docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation").map(doc => doc.body).join("\n");
    const missingSourceLinks = facts
        .filter(fact => fact.messageId && !docText.includes(`#${fact.messageId}`))
        .map(fact => `#${fact.messageId} ${(0, group_memory_index_1.compactText)(fact.text, 120)}`)
        .slice(0, 20);
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "source_message_links_preserved",
        label: "蒸馏事实保留 source message id",
        pass: missingSourceLinks.length === 0,
        severity: "fatal",
        detail: missingSourceLinks.length ? "部分事实无法从 Markdown 中回溯到 source message id。" : "蒸馏 Markdown 保留了 source message id。",
        gaps: missingSourceLinks,
    });
    const pathClaims = (0, group_memory_index_1.uniqueStrings)(facts.flatMap(fact => (0, group_memory_index_1.extractPathClaims)(fact.text)), 120);
    const stalePaths = pathClaims
        .map(claim => ({ claim, resolved: (0, group_memory_index_1.resolveClaimPath)(projectRoot, claim) }))
        .filter(item => item.resolved && !fs.existsSync(item.resolved))
        .map(item => `${item.claim} -> ${item.resolved}`)
        .slice(0, 30);
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "file_path_claims_checked",
        label: "文件路径声明已按当前仓库核验",
        pass: stalePaths.length === 0,
        severity: "medium",
        detail: stalePaths.length ? "部分记忆里的文件路径在当前仓库不存在，使用前必须重新核验。" : "未发现当前仓库不存在的文件路径声明。",
        evidence: pathClaims.slice(0, 30),
        gaps: stalePaths,
    });
    const taskSignals = facts.map(group_memory_index_1.extractTaskStateSignal).filter(Boolean);
    const taskMap = new Map();
    for (const signal of taskSignals)
        taskMap.set(signal.taskId, [...(taskMap.get(signal.taskId) || []), signal]);
    const unresolvedContradictions = [];
    for (const [taskId, signals] of taskMap.entries()) {
        const sorted = signals.sort((a, b) => a.sourceIndex - b.sourceIndex);
        const states = new Set(sorted.map(item => item.state));
        const last = sorted[sorted.length - 1];
        if (states.has("done") && states.has("blocked") && last?.state === "blocked") {
            unresolvedContradictions.push(`[${taskId}] latest=${last.state} #${last.messageId} ${last.text}`);
        }
    }
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "no_unresolved_status_contradictions",
        label: "完成/阻塞状态没有未解决矛盾",
        pass: unresolvedContradictions.length === 0,
        severity: "high",
        detail: unresolvedContradictions.length ? "发现同一任务先完成后又阻塞，需按最新阻塞处理。" : "未发现未解决的完成/阻塞矛盾。",
        gaps: unresolvedContradictions.slice(0, 12),
    });
    const hasUsefulFacts = facts.length > 0 && (expectedTypes.includes("user") || expectedTypes.includes("project") || expectedTypes.includes("feedback") || expectedTypes.includes("reference"));
    (0, group_memory_index_1.addDistillationQualityCheck)(checks, {
        id: "distilled_signal_not_empty",
        label: "蒸馏结果不是空洞记忆",
        pass: hasUsefulFacts || Number(ledger.sourceMessageCount || 0) === 0,
        severity: "medium",
        detail: hasUsefulFacts ? "蒸馏 ledger 中有可召回事实。" : "存在消息来源但没有可召回蒸馏事实。",
    });
    const failedChecks = checks.filter(check => !check.pass);
    const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + (0, group_memory_index_1.distillationQualityPenalty)(check.severity), 0)));
    const status = failedChecks.some(check => check.severity === "fatal") || score < 60
        ? "failed"
        : failedChecks.some(check => check.severity === "high") || score < 80
            ? "degraded"
            : "pass";
    return {
        schema: "ccm-group-typed-memory-distillation-quality-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
        groupId,
        score,
        pass: status === "pass",
        status,
        evaluatedAt,
        projectRoot,
        factCount: facts.length,
        docCount: docs.length,
        pathClaimCount: pathClaims.length,
        stalePathCount: stalePaths.length,
        contradictionCount: unresolvedContradictions.length,
        checks,
    };
}
function inspectGroupTypedMemoryDistillationWork(groupId, messages = [], options = {}) {
    const state = (0, group_memory_index_1.buildGroupTypedMemoryDistillationWorkState)(groupId, messages, options);
    const skipReason = state.disabled && state.recoveryReasons.length === 0
        ? "disabled"
        : state.runRequired
            ? "work_pending"
            : "no_new_messages_after_committed_cursor";
    return {
        schema: "ccm-group-typed-memory-distillation-preflight-v1",
        version: 1,
        groupId,
        runRequired: state.runRequired,
        skipped: !state.runRequired,
        reason: skipReason,
        disabled: state.disabled,
        lockRequired: state.runRequired,
        lockAcquired: false,
        previousCommittedMessageId: state.previousCursorMessageId,
        cursorFound: !state.previousCursorMessageId || state.cursorIndex >= 0,
        cursorMissingFallback: state.cursorMissing,
        forceRescan: state.forceRescan,
        eligibleMessageCount: state.eligibleRows.length,
        pendingMessageCount: state.pendingRows.length,
        selectedMessageCount: state.selectedRows.length,
        remainingMessageCount: Math.max(0, state.pendingRows.length - state.selectedRows.length),
        maxMessages: state.maxMessages,
        maintenanceRequired: state.maintenanceReasons.length > 0,
        maintenanceReasons: state.maintenanceReasons,
        recoveryRequired: state.recoveryReasons.length > 0,
        recoveryReasons: state.recoveryReasons,
        postCompactUsageArchiveChanged: state.postCompactUsageArchiveChanged,
    };
}
function distillGroupMessagesToTypedMemory(groupId, messages = [], memory = {}, options = {}) {
    const existingMutation = group_memory_index_1.activeGroupTypedMemoryDistillationMutations.get(groupId);
    if (existingMutation?.handle) {
        existingMutation.depth = Number(existingMutation.depth || 1) + 1;
        existingMutation.mutationKinds = [...new Set([...(existingMutation.mutationKinds || []), "group_log_distillation"])];
        try {
            const value = (0, group_memory_index_1.distillGroupMessagesToTypedMemoryUnlocked)(groupId, messages, memory, {
                ...options,
                __distillationTransaction: { handle: existingMutation.handle, summary: null },
            });
            return {
                ...value,
                transaction: {
                    schema: "ccm-group-typed-memory-distillation-transaction-v1",
                    version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
                    groupId,
                    leaseId: String(existingMutation.handle.lock?.leaseId || ""),
                    fencingToken: Number(existingMutation.handle.lock?.fencingToken || 0),
                    status: "reentrant",
                    committed: value?.skipped !== true,
                },
            };
        }
        finally {
            existingMutation.depth = Math.max(1, Number(existingMutation.depth || 2) - 1);
        }
    }
    const preflight = inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
    if (!preflight.runRequired) {
        const ledger = (0, group_memory_distillation_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
        return {
            schema: "ccm-group-typed-memory-distillation-v1",
            version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: preflight.reason,
            ledgerFile: ledger.file,
            sourceMessageCount: 0,
            candidateCount: 0,
            extractedCandidateCount: 0,
            rejectedCandidateCount: 0,
            evictedExistingFactCount: 0,
            newFactCount: 0,
            updatedFactCount: 0,
            writeCount: 0,
            removalCount: 0,
            writes: [],
            removals: [],
            quality: ledger.quality || null,
            admission: ledger.admission || null,
            positiveFeedbackLifecycle: {
                ...(ledger.positiveFeedbackLifecycle || {}),
                appliedThisRun: 0,
                rejectedThisRun: 0,
            },
            cursor: {
                schema: "ccm-group-typed-memory-distillation-cursor-v1",
                previousCommittedMessageId: preflight.previousCommittedMessageId,
                lastCommittedMessageId: preflight.previousCommittedMessageId,
                cursorFound: preflight.cursorFound,
                cursorMissingFallback: preflight.cursorMissingFallback,
                forceRescan: preflight.forceRescan,
                eligibleMessageCount: preflight.eligibleMessageCount,
                pendingMessageCount: preflight.pendingMessageCount,
                processedMessageCount: 0,
                remainingMessageCount: preflight.pendingMessageCount,
                batchLimited: false,
                committedAt: String(ledger.distillationCursor?.committedAt || ledger.lastDistilledAt || ""),
            },
            lastDistilledMessageId: preflight.previousCommittedMessageId,
            distilledAt: String(ledger.lastDistilledAt || ledger.updatedAt || ""),
            preflight,
            transaction: {
                schema: "ccm-group-typed-memory-distillation-transaction-v1",
                version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
                groupId,
                status: "preflight_skipped",
                committed: false,
                lockAcquired: false,
            },
        };
    }
    const acquired = (0, group_memory_index_1.acquireGroupTypedMemoryDistillationLock)(groupId, { ...options, mutationKind: "group_log_distillation" });
    if (!acquired.acquired) {
        const error = new Error(`typed_memory_distillation_transaction_unavailable:${acquired.reason || "lock_unavailable"}`);
        error.code = acquired.reason || "distillation_lock_unavailable";
        error.transaction = acquired;
        throw error;
    }
    const handle = acquired.handle;
    const mutationContext = {
        groupId,
        mutationKind: "group_log_distillation",
        mutationKinds: ["group_log_distillation"],
        handle,
        options,
        pendingArtifacts: new Map(),
        depth: 1,
        writeCount: 0,
        startedAt: String(handle.lock?.acquiredAt || (0, group_memory_index_1.now)()),
    };
    group_memory_index_1.activeGroupTypedMemoryDistillationMutations.set(groupId, mutationContext);
    const transactionSummary = {
        schema: "ccm-group-typed-memory-distillation-transaction-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        leaseId: String(handle.lock?.leaseId || ""),
        fencingToken: Number(handle.lock?.fencingToken || 0),
        waitedMs: Number(acquired.waitedMs || 0),
        recoveredLeaseCount: Number(acquired.recoveredLeaseCount || 0),
        acquiredAt: String(handle.lock?.acquiredAt || ""),
    };
    try {
        mutationContext.artifactRecovery = (0, group_memory_index_1.recoverGroupTypedMemoryArtifactTransaction)(groupId);
        const diagnosticHoldMs = Math.max(0, Math.min(10_000, Number(options.__transactionDiagnosticHoldMs || 0)));
        if (diagnosticHoldMs > 0)
            (0, group_memory_index_1.typedMemoryDistillationWait)(diagnosticHoldMs);
        const value = (0, group_memory_index_1.distillGroupMessagesToTypedMemoryUnlocked)(groupId, messages, memory, {
            ...options,
            __distillationTransaction: { handle, summary: transactionSummary },
        });
        (0, group_memory_index_1.commitGroupTypedMemoryArtifactMutation)(mutationContext);
        const ownership = (0, group_memory_index_1.verifyGroupTypedMemoryDistillationLock)(handle);
        if (!ownership.owned)
            throw new Error(`typed_memory_distillation_lock_lost_after_commit:${ownership.reason}`);
        const completedAt = (0, group_memory_index_1.now)();
        const priorState = (0, group_memory_distillation_part_01_1.readGroupTypedMemoryDistillationTransactionState)(groupId);
        const committed = value?.skipped !== true;
        (0, group_memory_index_1.writeGroupTypedMemoryDistillationTransactionState)(groupId, {
            status: "completed",
            mutationKind: "group_log_distillation",
            mutationKinds: mutationContext.mutationKinds,
            lastMutationKind: "group_log_distillation",
            leaseId: transactionSummary.leaseId,
            fencingToken: transactionSummary.fencingToken,
            lastFencingToken: transactionSummary.fencingToken,
            lastCommittedFencingToken: committed
                ? transactionSummary.fencingToken
                : Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
            recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
            waitedMs: Number(acquired.waitedMs || 0),
            writeCount: Number(mutationContext.writeCount || 0),
            startedAt: transactionSummary.acquiredAt,
            completedAt,
            failedAt: "",
            error: "",
            updatedAt: completedAt,
        });
        group_memory_index_1.activeGroupTypedMemoryDistillationMutations.delete(groupId);
        (0, group_memory_index_1.releaseGroupTypedMemoryDistillationLock)(handle, "completed");
        return {
            ...value,
            preflight: {
                ...preflight,
                lockAcquired: true,
            },
            transaction: {
                ...transactionSummary,
                status: "completed",
                committed,
                completedAt,
                artifactTransaction: mutationContext.artifactTransaction || null,
                artifactRecovery: mutationContext.artifactRecovery || null,
            },
        };
    }
    catch (error) {
        const failedAt = (0, group_memory_index_1.now)();
        const ownership = (0, group_memory_index_1.verifyGroupTypedMemoryDistillationLock)(handle);
        if (ownership.owned) {
            const priorState = (0, group_memory_distillation_part_01_1.readGroupTypedMemoryDistillationTransactionState)(groupId);
            (0, group_memory_index_1.writeGroupTypedMemoryDistillationTransactionState)(groupId, {
                status: "failed",
                mutationKind: "group_log_distillation",
                mutationKinds: mutationContext.mutationKinds,
                lastMutationKind: String(priorState.valid ? priorState.state?.lastMutationKind || "" : ""),
                leaseId: transactionSummary.leaseId,
                fencingToken: transactionSummary.fencingToken,
                lastFencingToken: transactionSummary.fencingToken,
                lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
                recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : acquired.recoveredLeaseCount || 0),
                waitedMs: Number(acquired.waitedMs || 0),
                writeCount: Number(mutationContext.writeCount || 0),
                startedAt: transactionSummary.acquiredAt,
                completedAt: "",
                failedAt,
                error: (0, group_memory_index_1.compactText)(error?.message || error, 800),
                updatedAt: failedAt,
            });
        }
        group_memory_index_1.activeGroupTypedMemoryDistillationMutations.delete(groupId);
        (0, group_memory_index_1.releaseGroupTypedMemoryDistillationLock)(handle, "failed");
        throw error;
    }
}
function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages = [], memory = {}, options = {}) {
    const maxBatches = Math.max(1, Math.min(32, Number(options.maxCatchUpBatches || options.max_catch_up_batches || 8)));
    const batches = [];
    let latest = null;
    for (let batch = 0; batch < maxBatches; batch += 1) {
        latest = distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
        batches.push(latest);
        if (latest?.skipped === true || Number(latest?.cursor?.remainingMessageCount || 0) <= 0)
            break;
    }
    const sum = (key) => batches.reduce((total, row) => total + Number(row?.[key] || 0), 0);
    const remainingMessageCount = Number(latest?.cursor?.remainingMessageCount || 0);
    return {
        ...(latest || {
            schema: "ccm-group-typed-memory-distillation-v1",
            version: group_memory_index_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "no_distillation_batch_executed",
        }),
        sourceMessageCount: sum("sourceMessageCount"),
        candidateCount: sum("candidateCount"),
        extractedCandidateCount: sum("extractedCandidateCount"),
        rejectedCandidateCount: sum("rejectedCandidateCount"),
        evictedExistingFactCount: sum("evictedExistingFactCount"),
        newFactCount: sum("newFactCount"),
        updatedFactCount: sum("updatedFactCount"),
        writeCount: sum("writeCount"),
        removalCount: sum("removalCount"),
        writes: batches.flatMap(row => Array.isArray(row?.writes) ? row.writes : []),
        removals: batches.flatMap(row => Array.isArray(row?.removals) ? row.removals : []),
        catchUp: {
            schema: "ccm-group-typed-memory-distillation-catch-up-v1",
            batchCount: batches.length,
            maxBatches,
            complete: remainingMessageCount === 0,
            remainingMessageCount,
            batches: batches.map((row, index) => ({
                batch: index + 1,
                skipped: row?.skipped === true,
                reason: row?.reason || "",
                sourceMessageCount: Number(row?.sourceMessageCount || 0),
                newFactCount: Number(row?.newFactCount || 0),
                updatedFactCount: Number(row?.updatedFactCount || 0),
                previousCommittedMessageId: row?.cursor?.previousCommittedMessageId || "",
                lastCommittedMessageId: row?.cursor?.lastCommittedMessageId || row?.lastDistilledMessageId || "",
                remainingMessageCount: Number(row?.cursor?.remainingMessageCount || 0),
            })),
        },
    };
}
function runGroupTypedMemoryDistillationMutationCoordinatorSelfTest() {
    return require("./group-memory-recall-self-tests").runGroupTypedMemoryDistillationMutationCoordinatorSelfTest();
}
function runGroupTypedMemoryLogDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryLogDistillationSelfTest();
}
function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactUsageDistillationSelfTest();
}
function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest();
}
function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest();
}
function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest();
}
function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest();
}
function runGroupTypedMemoryDistillationQualitySelfTest() {
    return require("./group-memory-distillation-self-tests").runGroupTypedMemoryDistillationQualitySelfTest();
}
//# sourceMappingURL=group-memory-distillation-part-03.js.map