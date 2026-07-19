"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertGroupCompactionNotCancelled = exports.saveGroupMemory = exports.readGroupReplayRepairDispatchCandidatesSummary = exports.loadGroupMemory = exports.getGroupSessionMemoryMarkdownFile = exports.getGroupReplayRepairWorkItemsFile = exports.getGroupReplayRepairLedgerFile = exports.getGroupPostCompactDispatchLedgerFile = exports.getGroupMemoryReloadLedgerFile = exports.getGroupMemoryFile = exports.deleteGroupSessionMemoryArtifacts = exports.createEmptyGroupMemory = exports.getGroupMemoryBackupFile = exports.validateGroupMemoryResumeEffectiveTokenBaseline = exports.updateGroupMemory = exports.uniqueByKey = exports.resolveGroupSessionMemoryExtractionCursor = exports.readGroupPostCompactDispatchLedger = exports.getGroupSessionMemoryScopeId = exports.findLatestWorkerLedger = exports.compactPreserveLines = exports.compactMemoryText = exports.buildGroupMemoryResumeEffectiveTokenBaseline = exports.appendWorkerLedger = exports.appendGroupMemorySnipBoundaryMarker = exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = exports.GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = exports.GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT = exports.GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES = exports.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS = exports.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS = exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION = exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION = exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = exports.writeTextAtomic = exports.writeJsonAtomic = exports.readGroupMemoryReloadLedger = exports.getGroupMessagesFileHint = void 0;
exports.readGroupGlobalMemoryArbitrationLedger = exports.getGroupGlobalMemoryArbitrationLedgerFile = exports.distillGroupGlobalMemoryArbitrationToTypedMemory = exports.buildChildGlobalAgentMemoryHealthGate = exports.scheduleGroupMemoryAutoCompaction = exports.runGroupMemoryAutoCompactionNow = exports.renderGroupPostCompactPlanAttachment = exports.renderGroupPostCompactInvokedSkillAttachments = exports.renderGroupPostCompactDynamicContextDelta = exports.renderGroupMemoryContextBundle = exports.renderGlobalGroupMemoryContextBundle = exports.prepareGroupMemoryResumeProjection = exports.ensureGroupMemoryAutoCompactionHook = exports.buildGroupPostCompactDynamicContextCatalog = exports.buildGroupMemoryContext = exports.buildGroupContextPacket = exports.buildGlobalGroupMemoryContext = exports.buildAgentMemoryContextBundleWithManifestSelection = exports.buildAgentMemoryContextBundle = exports.readGroupSessionMemorySnapshotSummary = exports.persistGroupSessionMemorySnapshot = exports.persistGroupSessionMemoryCadenceObservation = exports.getGroupSessionMemorySnapshotFile = exports.evaluateGroupSessionMemoryUpdateCadence = exports.enforceGroupSessionMemoryBudget = exports.commitGroupSessionMemorySnapshot = exports.buildGroupSessionMemorySnapshot = exports.buildGroupSessionMemorySectionEvidence = exports.analyzeGroupSessionMemoryBudget = exports.recoverChildTypedMemoryDispatchWal = exports.markChildTypedMemoryRunnerReturned = exports.markChildTypedMemoryDispatchStarted = exports.markChildTypedMemoryDispatchCommitted = exports.createChildTypedMemoryDispatchWal = exports.commitChildTypedMemoryDelivery = exports.buildChildTypedMemoryRecallLedgerScope = exports.buildChildTypedMemoryDeliveryCapsule = exports.buildAgentMemoryPacket = exports.admitChildTypedMemoryDelivery = exports.admitChildPostTurnSummaryDelivery = exports.withGroupCompactionActivityCommitFence = exports.verifyGroupCompactionActivityLedger = exports.startGroupCompactionActivity = exports.requestGroupCompactionCancellation = exports.reconcileGroupCompactionActivity = exports.readGroupCompactionActivity = exports.pulseGroupCompactionActivity = exports.getGroupCompactionActivityFile = exports.finishGroupCompactionActivity = exports.deleteGroupCompactionActivity = void 0;
exports.readGroupToolContinuitySnapshotSummary = exports.persistGroupToolContinuitySnapshot = exports.getGroupToolContinuitySnapshotFile = exports.getGroupToolContinuityMarkdownFile = exports.summarizeGroupCompactFileReferenceReadPlanFreshness = exports.summarizeGroupCompactFileReferenceReadPlanAccess = exports.summarizeGroupCompactFileReferenceAccess = exports.recordGroupPostCompactCandidateUsageLedger = exports.recordGroupMemoryReloadAudit = exports.recordGroupCompactFileReferenceSurfacing = exports.recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger = exports.recordGroupApiMicrocompactNativeApplyProofLedger = exports.recordGroupApiMicrocompactNativeApplyAdapterTelemetry = exports.readGroupPostCompactCandidateUsageLedger = exports.readGroupCompactFileReferenceLedger = exports.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger = exports.readGroupApiMicrocompactNativeApplyProofLedger = exports.latestGroupCompactFileReferenceReadPlanRows = exports.latestGroupCompactFileReferenceReadPlanRevalidationGate = exports.getGroupPostCompactCandidateUsageLedgerFile = exports.getGroupCompactFileReferenceLedgerFile = exports.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile = exports.getGroupApiMicrocompactNativeApplyProofLedgerFile = exports.buildGroupPostCompactCandidateUsageSummary = exports.buildGroupMemorySourceManifest = exports.buildGroupCompactFileReferences = exports.buildGroupCompactFileReferenceReadPlanRevalidationGate = exports.buildGroupCompactFileReferenceReadPlan = exports.buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary = exports.buildGroupApiMicrocompactNativeApplyProofSummary = exports.buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow = exports.recordGroupGlobalMemoryArbitrationLedger = void 0;
exports.runGroupMemoryAutoCompactionSelfTest = runGroupMemoryAutoCompactionSelfTest;
exports.runGroupMemoryStorageRecoverySelfTest = runGroupMemoryStorageRecoverySelfTest;
exports.runGlobalGroupMemoryContextSelfTest = runGlobalGroupMemoryContextSelfTest;
exports.runGroupCompactFileReferenceReadPlanSelfTest = runGroupCompactFileReferenceReadPlanSelfTest;
exports.runGroupMemorySourceManifestSelfTest = runGroupMemorySourceManifestSelfTest;
exports.runGroupMemoryReloadAuditSelfTest = runGroupMemoryReloadAuditSelfTest;
exports.runGroupMemorySourceChangeReloadSelfTest = runGroupMemorySourceChangeReloadSelfTest;
exports.runGroupMemoryDispatchFreshnessGateSelfTest = runGroupMemoryDispatchFreshnessGateSelfTest;
exports.runGroupPostCompactFirstDispatchMarkerSelfTest = runGroupPostCompactFirstDispatchMarkerSelfTest;
exports.runGroupPostCompactCandidateUsageLedgerSelfTest = runGroupPostCompactCandidateUsageLedgerSelfTest;
exports.runGroupProjectMemoryImportContextSelfTest = runGroupProjectMemoryImportContextSelfTest;
exports.runGroupGlobalClaudeMemoryImportContextSelfTest = runGroupGlobalClaudeMemoryImportContextSelfTest;
exports.runGroupGlobalAgentMemoryBridgeContextSelfTest = runGroupGlobalAgentMemoryBridgeContextSelfTest;
exports.runGroupGlobalAgentMemoryHealthGateSelfTest = runGroupGlobalAgentMemoryHealthGateSelfTest;
exports.runGroupGlobalAgentMemoryArbitrationContextSelfTest = runGroupGlobalAgentMemoryArbitrationContextSelfTest;
exports.runGroupGlobalAgentMemorySemanticArbitrationSelfTest = runGroupGlobalAgentMemorySemanticArbitrationSelfTest;
exports.runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest = runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest;
exports.runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest = runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest;
exports.runGroupTypedMemoryContextSelfTest = runGroupTypedMemoryContextSelfTest;
exports.runGroupTypedMemoryContextPressureRepairProvenanceSelfTest = runGroupTypedMemoryContextPressureRepairProvenanceSelfTest;
var group_memory_shared_1 = require("./group-memory-shared");
Object.defineProperty(exports, "getGroupMessagesFileHint", { enumerable: true, get: function () { return group_memory_shared_1.getGroupMessagesFileHint; } });
Object.defineProperty(exports, "readGroupMemoryReloadLedger", { enumerable: true, get: function () { return group_memory_shared_1.readGroupMemoryReloadLedger; } });
Object.defineProperty(exports, "writeJsonAtomic", { enumerable: true, get: function () { return group_memory_shared_1.writeJsonAtomic; } });
Object.defineProperty(exports, "writeTextAtomic", { enumerable: true, get: function () { return group_memory_shared_1.writeTextAtomic; } });
Object.defineProperty(exports, "GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION; } });
Object.defineProperty(exports, "GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION; } });
Object.defineProperty(exports, "GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS; } });
Object.defineProperty(exports, "GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION; } });
Object.defineProperty(exports, "GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION; } });
Object.defineProperty(exports, "GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION; } });
Object.defineProperty(exports, "GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_RELOAD_AUDIT_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_RELOAD_AUDIT_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION; } });
Object.defineProperty(exports, "GROUP_MEMORY_SOURCE_MANIFEST_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_MEMORY_SOURCE_MANIFEST_VERSION; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_SNAPSHOT_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION; } });
Object.defineProperty(exports, "GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES; } });
Object.defineProperty(exports, "GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION", { enumerable: true, get: function () { return group_memory_shared_1.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION; } });
Object.defineProperty(exports, "appendGroupMemorySnipBoundaryMarker", { enumerable: true, get: function () { return group_memory_shared_1.appendGroupMemorySnipBoundaryMarker; } });
Object.defineProperty(exports, "appendWorkerLedger", { enumerable: true, get: function () { return group_memory_shared_1.appendWorkerLedger; } });
Object.defineProperty(exports, "buildGroupMemoryResumeEffectiveTokenBaseline", { enumerable: true, get: function () { return group_memory_shared_1.buildGroupMemoryResumeEffectiveTokenBaseline; } });
Object.defineProperty(exports, "compactMemoryText", { enumerable: true, get: function () { return group_memory_shared_1.compactMemoryText; } });
Object.defineProperty(exports, "compactPreserveLines", { enumerable: true, get: function () { return group_memory_shared_1.compactPreserveLines; } });
Object.defineProperty(exports, "findLatestWorkerLedger", { enumerable: true, get: function () { return group_memory_shared_1.findLatestWorkerLedger; } });
Object.defineProperty(exports, "getGroupSessionMemoryScopeId", { enumerable: true, get: function () { return group_memory_shared_1.getGroupSessionMemoryScopeId; } });
Object.defineProperty(exports, "readGroupPostCompactDispatchLedger", { enumerable: true, get: function () { return group_memory_shared_1.readGroupPostCompactDispatchLedger; } });
Object.defineProperty(exports, "resolveGroupSessionMemoryExtractionCursor", { enumerable: true, get: function () { return group_memory_shared_1.resolveGroupSessionMemoryExtractionCursor; } });
Object.defineProperty(exports, "uniqueByKey", { enumerable: true, get: function () { return group_memory_shared_1.uniqueByKey; } });
Object.defineProperty(exports, "updateGroupMemory", { enumerable: true, get: function () { return group_memory_shared_1.updateGroupMemory; } });
Object.defineProperty(exports, "validateGroupMemoryResumeEffectiveTokenBaseline", { enumerable: true, get: function () { return group_memory_shared_1.validateGroupMemoryResumeEffectiveTokenBaseline; } });
var group_memory_storage_1 = require("./group-memory-storage");
Object.defineProperty(exports, "getGroupMemoryBackupFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupMemoryBackupFile; } });
Object.defineProperty(exports, "createEmptyGroupMemory", { enumerable: true, get: function () { return group_memory_storage_1.createEmptyGroupMemory; } });
Object.defineProperty(exports, "deleteGroupSessionMemoryArtifacts", { enumerable: true, get: function () { return group_memory_storage_1.deleteGroupSessionMemoryArtifacts; } });
Object.defineProperty(exports, "getGroupMemoryFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupMemoryFile; } });
Object.defineProperty(exports, "getGroupMemoryReloadLedgerFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupMemoryReloadLedgerFile; } });
Object.defineProperty(exports, "getGroupPostCompactDispatchLedgerFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupPostCompactDispatchLedgerFile; } });
Object.defineProperty(exports, "getGroupReplayRepairLedgerFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupReplayRepairLedgerFile; } });
Object.defineProperty(exports, "getGroupReplayRepairWorkItemsFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupReplayRepairWorkItemsFile; } });
Object.defineProperty(exports, "getGroupSessionMemoryMarkdownFile", { enumerable: true, get: function () { return group_memory_storage_1.getGroupSessionMemoryMarkdownFile; } });
Object.defineProperty(exports, "loadGroupMemory", { enumerable: true, get: function () { return group_memory_storage_1.loadGroupMemory; } });
Object.defineProperty(exports, "readGroupReplayRepairDispatchCandidatesSummary", { enumerable: true, get: function () { return group_memory_storage_1.readGroupReplayRepairDispatchCandidatesSummary; } });
Object.defineProperty(exports, "saveGroupMemory", { enumerable: true, get: function () { return group_memory_storage_1.saveGroupMemory; } });
var group_compaction_activity_1 = require("./group-compaction-activity");
Object.defineProperty(exports, "assertGroupCompactionNotCancelled", { enumerable: true, get: function () { return group_compaction_activity_1.assertGroupCompactionNotCancelled; } });
Object.defineProperty(exports, "deleteGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.deleteGroupCompactionActivity; } });
Object.defineProperty(exports, "finishGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.finishGroupCompactionActivity; } });
Object.defineProperty(exports, "getGroupCompactionActivityFile", { enumerable: true, get: function () { return group_compaction_activity_1.getGroupCompactionActivityFile; } });
Object.defineProperty(exports, "pulseGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.pulseGroupCompactionActivity; } });
Object.defineProperty(exports, "readGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.readGroupCompactionActivity; } });
Object.defineProperty(exports, "reconcileGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.reconcileGroupCompactionActivity; } });
Object.defineProperty(exports, "requestGroupCompactionCancellation", { enumerable: true, get: function () { return group_compaction_activity_1.requestGroupCompactionCancellation; } });
Object.defineProperty(exports, "startGroupCompactionActivity", { enumerable: true, get: function () { return group_compaction_activity_1.startGroupCompactionActivity; } });
Object.defineProperty(exports, "verifyGroupCompactionActivityLedger", { enumerable: true, get: function () { return group_compaction_activity_1.verifyGroupCompactionActivityLedger; } });
Object.defineProperty(exports, "withGroupCompactionActivityCommitFence", { enumerable: true, get: function () { return group_compaction_activity_1.withGroupCompactionActivityCommitFence; } });
var group_agent_memory_packet_1 = require("./group-agent-memory-packet");
Object.defineProperty(exports, "admitChildPostTurnSummaryDelivery", { enumerable: true, get: function () { return group_agent_memory_packet_1.admitChildPostTurnSummaryDelivery; } });
Object.defineProperty(exports, "admitChildTypedMemoryDelivery", { enumerable: true, get: function () { return group_agent_memory_packet_1.admitChildTypedMemoryDelivery; } });
Object.defineProperty(exports, "buildAgentMemoryPacket", { enumerable: true, get: function () { return group_agent_memory_packet_1.buildAgentMemoryPacket; } });
Object.defineProperty(exports, "buildChildTypedMemoryDeliveryCapsule", { enumerable: true, get: function () { return group_agent_memory_packet_1.buildChildTypedMemoryDeliveryCapsule; } });
Object.defineProperty(exports, "buildChildTypedMemoryRecallLedgerScope", { enumerable: true, get: function () { return group_agent_memory_packet_1.buildChildTypedMemoryRecallLedgerScope; } });
Object.defineProperty(exports, "commitChildTypedMemoryDelivery", { enumerable: true, get: function () { return group_agent_memory_packet_1.commitChildTypedMemoryDelivery; } });
Object.defineProperty(exports, "createChildTypedMemoryDispatchWal", { enumerable: true, get: function () { return group_agent_memory_packet_1.createChildTypedMemoryDispatchWal; } });
Object.defineProperty(exports, "markChildTypedMemoryDispatchCommitted", { enumerable: true, get: function () { return group_agent_memory_packet_1.markChildTypedMemoryDispatchCommitted; } });
Object.defineProperty(exports, "markChildTypedMemoryDispatchStarted", { enumerable: true, get: function () { return group_agent_memory_packet_1.markChildTypedMemoryDispatchStarted; } });
Object.defineProperty(exports, "markChildTypedMemoryRunnerReturned", { enumerable: true, get: function () { return group_agent_memory_packet_1.markChildTypedMemoryRunnerReturned; } });
Object.defineProperty(exports, "recoverChildTypedMemoryDispatchWal", { enumerable: true, get: function () { return group_agent_memory_packet_1.recoverChildTypedMemoryDispatchWal; } });
var group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
Object.defineProperty(exports, "analyzeGroupSessionMemoryBudget", { enumerable: true, get: function () { return group_session_memory_snapshot_1.analyzeGroupSessionMemoryBudget; } });
Object.defineProperty(exports, "buildGroupSessionMemorySectionEvidence", { enumerable: true, get: function () { return group_session_memory_snapshot_1.buildGroupSessionMemorySectionEvidence; } });
Object.defineProperty(exports, "buildGroupSessionMemorySnapshot", { enumerable: true, get: function () { return group_session_memory_snapshot_1.buildGroupSessionMemorySnapshot; } });
Object.defineProperty(exports, "commitGroupSessionMemorySnapshot", { enumerable: true, get: function () { return group_session_memory_snapshot_1.commitGroupSessionMemorySnapshot; } });
Object.defineProperty(exports, "enforceGroupSessionMemoryBudget", { enumerable: true, get: function () { return group_session_memory_snapshot_1.enforceGroupSessionMemoryBudget; } });
Object.defineProperty(exports, "evaluateGroupSessionMemoryUpdateCadence", { enumerable: true, get: function () { return group_session_memory_snapshot_1.evaluateGroupSessionMemoryUpdateCadence; } });
Object.defineProperty(exports, "getGroupSessionMemorySnapshotFile", { enumerable: true, get: function () { return group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile; } });
Object.defineProperty(exports, "persistGroupSessionMemoryCadenceObservation", { enumerable: true, get: function () { return group_session_memory_snapshot_1.persistGroupSessionMemoryCadenceObservation; } });
Object.defineProperty(exports, "persistGroupSessionMemorySnapshot", { enumerable: true, get: function () { return group_session_memory_snapshot_1.persistGroupSessionMemorySnapshot; } });
Object.defineProperty(exports, "readGroupSessionMemorySnapshotSummary", { enumerable: true, get: function () { return group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary; } });
var group_memory_context_1 = require("./group-memory-context");
Object.defineProperty(exports, "buildAgentMemoryContextBundle", { enumerable: true, get: function () { return group_memory_context_1.buildAgentMemoryContextBundle; } });
Object.defineProperty(exports, "buildAgentMemoryContextBundleWithManifestSelection", { enumerable: true, get: function () { return group_memory_context_1.buildAgentMemoryContextBundleWithManifestSelection; } });
Object.defineProperty(exports, "buildGlobalGroupMemoryContext", { enumerable: true, get: function () { return group_memory_context_1.buildGlobalGroupMemoryContext; } });
Object.defineProperty(exports, "buildGroupContextPacket", { enumerable: true, get: function () { return group_memory_context_1.buildGroupContextPacket; } });
Object.defineProperty(exports, "buildGroupMemoryContext", { enumerable: true, get: function () { return group_memory_context_1.buildGroupMemoryContext; } });
Object.defineProperty(exports, "buildGroupPostCompactDynamicContextCatalog", { enumerable: true, get: function () { return group_memory_context_1.buildGroupPostCompactDynamicContextCatalog; } });
Object.defineProperty(exports, "ensureGroupMemoryAutoCompactionHook", { enumerable: true, get: function () { return group_memory_context_1.ensureGroupMemoryAutoCompactionHook; } });
Object.defineProperty(exports, "prepareGroupMemoryResumeProjection", { enumerable: true, get: function () { return group_memory_context_1.prepareGroupMemoryResumeProjection; } });
Object.defineProperty(exports, "renderGlobalGroupMemoryContextBundle", { enumerable: true, get: function () { return group_memory_context_1.renderGlobalGroupMemoryContextBundle; } });
Object.defineProperty(exports, "renderGroupMemoryContextBundle", { enumerable: true, get: function () { return group_memory_context_1.renderGroupMemoryContextBundle; } });
Object.defineProperty(exports, "renderGroupPostCompactDynamicContextDelta", { enumerable: true, get: function () { return group_memory_context_1.renderGroupPostCompactDynamicContextDelta; } });
Object.defineProperty(exports, "renderGroupPostCompactInvokedSkillAttachments", { enumerable: true, get: function () { return group_memory_context_1.renderGroupPostCompactInvokedSkillAttachments; } });
Object.defineProperty(exports, "renderGroupPostCompactPlanAttachment", { enumerable: true, get: function () { return group_memory_context_1.renderGroupPostCompactPlanAttachment; } });
Object.defineProperty(exports, "runGroupMemoryAutoCompactionNow", { enumerable: true, get: function () { return group_memory_context_1.runGroupMemoryAutoCompactionNow; } });
Object.defineProperty(exports, "scheduleGroupMemoryAutoCompaction", { enumerable: true, get: function () { return group_memory_context_1.scheduleGroupMemoryAutoCompaction; } });
var group_global_memory_arbitration_1 = require("./group-global-memory-arbitration");
Object.defineProperty(exports, "buildChildGlobalAgentMemoryHealthGate", { enumerable: true, get: function () { return group_global_memory_arbitration_1.buildChildGlobalAgentMemoryHealthGate; } });
Object.defineProperty(exports, "distillGroupGlobalMemoryArbitrationToTypedMemory", { enumerable: true, get: function () { return group_global_memory_arbitration_1.distillGroupGlobalMemoryArbitrationToTypedMemory; } });
Object.defineProperty(exports, "getGroupGlobalMemoryArbitrationLedgerFile", { enumerable: true, get: function () { return group_global_memory_arbitration_1.getGroupGlobalMemoryArbitrationLedgerFile; } });
Object.defineProperty(exports, "readGroupGlobalMemoryArbitrationLedger", { enumerable: true, get: function () { return group_global_memory_arbitration_1.readGroupGlobalMemoryArbitrationLedger; } });
Object.defineProperty(exports, "recordGroupGlobalMemoryArbitrationLedger", { enumerable: true, get: function () { return group_global_memory_arbitration_1.recordGroupGlobalMemoryArbitrationLedger; } });
var group_compact_file_references_1 = require("./group-compact-file-references");
Object.defineProperty(exports, "buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow; } });
Object.defineProperty(exports, "buildGroupApiMicrocompactNativeApplyProofSummary", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyProofSummary; } });
Object.defineProperty(exports, "buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary; } });
Object.defineProperty(exports, "buildGroupCompactFileReferenceReadPlan", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupCompactFileReferenceReadPlan; } });
Object.defineProperty(exports, "buildGroupCompactFileReferenceReadPlanRevalidationGate", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupCompactFileReferenceReadPlanRevalidationGate; } });
Object.defineProperty(exports, "buildGroupCompactFileReferences", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupCompactFileReferences; } });
Object.defineProperty(exports, "buildGroupMemorySourceManifest", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupMemorySourceManifest; } });
Object.defineProperty(exports, "buildGroupPostCompactCandidateUsageSummary", { enumerable: true, get: function () { return group_compact_file_references_1.buildGroupPostCompactCandidateUsageSummary; } });
Object.defineProperty(exports, "getGroupApiMicrocompactNativeApplyProofLedgerFile", { enumerable: true, get: function () { return group_compact_file_references_1.getGroupApiMicrocompactNativeApplyProofLedgerFile; } });
Object.defineProperty(exports, "getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile", { enumerable: true, get: function () { return group_compact_file_references_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile; } });
Object.defineProperty(exports, "getGroupCompactFileReferenceLedgerFile", { enumerable: true, get: function () { return group_compact_file_references_1.getGroupCompactFileReferenceLedgerFile; } });
Object.defineProperty(exports, "getGroupPostCompactCandidateUsageLedgerFile", { enumerable: true, get: function () { return group_compact_file_references_1.getGroupPostCompactCandidateUsageLedgerFile; } });
Object.defineProperty(exports, "latestGroupCompactFileReferenceReadPlanRevalidationGate", { enumerable: true, get: function () { return group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRevalidationGate; } });
Object.defineProperty(exports, "latestGroupCompactFileReferenceReadPlanRows", { enumerable: true, get: function () { return group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRows; } });
Object.defineProperty(exports, "readGroupApiMicrocompactNativeApplyProofLedger", { enumerable: true, get: function () { return group_compact_file_references_1.readGroupApiMicrocompactNativeApplyProofLedger; } });
Object.defineProperty(exports, "readGroupApiMicrocompactNativeApplyRequestTelemetryLedger", { enumerable: true, get: function () { return group_compact_file_references_1.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger; } });
Object.defineProperty(exports, "readGroupCompactFileReferenceLedger", { enumerable: true, get: function () { return group_compact_file_references_1.readGroupCompactFileReferenceLedger; } });
Object.defineProperty(exports, "readGroupPostCompactCandidateUsageLedger", { enumerable: true, get: function () { return group_compact_file_references_1.readGroupPostCompactCandidateUsageLedger; } });
Object.defineProperty(exports, "recordGroupApiMicrocompactNativeApplyAdapterTelemetry", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupApiMicrocompactNativeApplyAdapterTelemetry; } });
Object.defineProperty(exports, "recordGroupApiMicrocompactNativeApplyProofLedger", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupApiMicrocompactNativeApplyProofLedger; } });
Object.defineProperty(exports, "recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger; } });
Object.defineProperty(exports, "recordGroupCompactFileReferenceSurfacing", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupCompactFileReferenceSurfacing; } });
Object.defineProperty(exports, "recordGroupMemoryReloadAudit", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupMemoryReloadAudit; } });
Object.defineProperty(exports, "recordGroupPostCompactCandidateUsageLedger", { enumerable: true, get: function () { return group_compact_file_references_1.recordGroupPostCompactCandidateUsageLedger; } });
Object.defineProperty(exports, "summarizeGroupCompactFileReferenceAccess", { enumerable: true, get: function () { return group_compact_file_references_1.summarizeGroupCompactFileReferenceAccess; } });
Object.defineProperty(exports, "summarizeGroupCompactFileReferenceReadPlanAccess", { enumerable: true, get: function () { return group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanAccess; } });
Object.defineProperty(exports, "summarizeGroupCompactFileReferenceReadPlanFreshness", { enumerable: true, get: function () { return group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanFreshness; } });
var group_tool_continuity_1 = require("./group-tool-continuity");
Object.defineProperty(exports, "getGroupToolContinuityMarkdownFile", { enumerable: true, get: function () { return group_tool_continuity_1.getGroupToolContinuityMarkdownFile; } });
Object.defineProperty(exports, "getGroupToolContinuitySnapshotFile", { enumerable: true, get: function () { return group_tool_continuity_1.getGroupToolContinuitySnapshotFile; } });
Object.defineProperty(exports, "persistGroupToolContinuitySnapshot", { enumerable: true, get: function () { return group_tool_continuity_1.persistGroupToolContinuitySnapshot; } });
Object.defineProperty(exports, "readGroupToolContinuitySnapshotSummary", { enumerable: true, get: function () { return group_tool_continuity_1.readGroupToolContinuitySnapshotSummary; } });
async function runGroupMemoryAutoCompactionSelfTest() {
    return require("./memory-self-tests").runGroupMemoryAutoCompactionSelfTest();
}
function runGroupMemoryStorageRecoverySelfTest() {
    return require("./memory-self-tests").runGroupMemoryStorageRecoverySelfTest();
}
function runGlobalGroupMemoryContextSelfTest() {
    return require("./memory-self-tests").runGlobalGroupMemoryContextSelfTest();
}
function runGroupCompactFileReferenceReadPlanSelfTest() {
    return require("./memory-self-tests").runGroupCompactFileReferenceReadPlanSelfTest();
}
function runGroupMemorySourceManifestSelfTest() {
    return require("./memory-self-tests").runGroupMemorySourceManifestSelfTest();
}
function runGroupMemoryReloadAuditSelfTest() {
    return require("./memory-self-tests").runGroupMemoryReloadAuditSelfTest();
}
function runGroupMemorySourceChangeReloadSelfTest() {
    return require("./memory-self-tests").runGroupMemorySourceChangeReloadSelfTest();
}
function runGroupMemoryDispatchFreshnessGateSelfTest() {
    return require("./memory-self-tests").runGroupMemoryDispatchFreshnessGateSelfTest();
}
function runGroupPostCompactFirstDispatchMarkerSelfTest() {
    return require("./memory-self-tests").runGroupPostCompactFirstDispatchMarkerSelfTest();
}
function runGroupPostCompactCandidateUsageLedgerSelfTest() {
    return require("./memory-self-tests").runGroupPostCompactCandidateUsageLedgerSelfTest();
}
function runGroupProjectMemoryImportContextSelfTest() {
    return require("./memory-self-tests").runGroupProjectMemoryImportContextSelfTest();
}
function runGroupGlobalClaudeMemoryImportContextSelfTest() {
    return require("./memory-self-tests").runGroupGlobalClaudeMemoryImportContextSelfTest();
}
function runGroupGlobalAgentMemoryBridgeContextSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemoryBridgeContextSelfTest();
}
function runGroupGlobalAgentMemoryHealthGateSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemoryHealthGateSelfTest();
}
function runGroupGlobalAgentMemoryArbitrationContextSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemoryArbitrationContextSelfTest();
}
function runGroupGlobalAgentMemorySemanticArbitrationSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemorySemanticArbitrationSelfTest();
}
function runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest();
}
function runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest() {
    return require("./memory-self-tests").runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest();
}
function runGroupTypedMemoryContextSelfTest() {
    return require("./memory-self-tests").runGroupTypedMemoryContextSelfTest();
}
function runGroupTypedMemoryContextPressureRepairProvenanceSelfTest() {
    return require("./memory-self-tests").runGroupTypedMemoryContextPressureRepairProvenanceSelfTest();
}
//# sourceMappingURL=memory.js.map