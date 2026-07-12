"use strict";
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
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION = exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS = exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS = exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION = exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION = exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT = exports.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES = exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER = exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION = exports.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION = exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION = exports.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION = exports.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION = exports.GROUP_PROJECT_MEMORY_IMPORT_VERSION = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER = exports.GROUP_TYPED_MEMORY_RECALL_LEDGER = exports.GROUP_TYPED_MEMORY_MAX_RECALL = exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES = exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES = exports.GROUP_TYPED_MEMORY_ENTRYPOINT = exports.GROUP_TYPED_MEMORY_VERSION = void 0;
exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER = exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER = exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION = exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS = void 0;
exports.buildClaudeMemorySettingSourcePolicy = buildClaudeMemorySettingSourcePolicy;
exports.deriveGroupTypedMemoryTargetPaths = deriveGroupTypedMemoryTargetPaths;
exports.readGroupTypedMemoryPressureRecallUsageLedger = readGroupTypedMemoryPressureRecallUsageLedger;
exports.recordGroupTypedMemoryPressureRecallUsageLedger = recordGroupTypedMemoryPressureRecallUsageLedger;
exports.readPostCompactCompletionMemoryPreservationClosureUsageLedger = readPostCompactCompletionMemoryPreservationClosureUsageLedger;
exports.recordPostCompactCompletionMemoryPreservationClosureUsage = recordPostCompactCompletionMemoryPreservationClosureUsage;
exports.buildPostCompactCompletionMemoryPreservationClosureUsageSummary = buildPostCompactCompletionMemoryPreservationClosureUsageSummary;
exports.buildGroupTypedMemoryPressureRecallUsageSummary = buildGroupTypedMemoryPressureRecallUsageSummary;
exports.buildGroupTypedMemoryPressureRecallUsageProjectSummary = buildGroupTypedMemoryPressureRecallUsageProjectSummary;
exports.getGroupTypedMemoryDir = getGroupTypedMemoryDir;
exports.getGroupTypedMemoryIndexFile = getGroupTypedMemoryIndexFile;
exports.getGroupTypedMemoryRecallLedgerFile = getGroupTypedMemoryRecallLedgerFile;
exports.getGroupTypedMemoryPressureRecallUsageLedgerFile = getGroupTypedMemoryPressureRecallUsageLedgerFile;
exports.getGroupTypedMemoryDistillationLedgerFile = getGroupTypedMemoryDistillationLedgerFile;
exports.getGroupClaudeInstructionsLoadedHookLedgerFile = getGroupClaudeInstructionsLoadedHookLedgerFile;
exports.registerGroupMemoryInstructionsLoadedHook = registerGroupMemoryInstructionsLoadedHook;
exports.hasGroupMemoryInstructionsLoadedHook = hasGroupMemoryInstructionsLoadedHook;
exports.loadGroupClaudeInstructionsLoadedHookLedger = loadGroupClaudeInstructionsLoadedHookLedger;
exports.executeGroupMemoryInstructionsLoadedHooks = executeGroupMemoryInstructionsLoadedHooks;
exports.getGroupClaudeMemoryExternalIncludeApprovalLedgerFile = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile;
exports.loadGroupClaudeMemoryExternalIncludeApprovalLedger = loadGroupClaudeMemoryExternalIncludeApprovalLedger;
exports.approveGroupClaudeMemoryExternalInclude = approveGroupClaudeMemoryExternalInclude;
exports.markGroupClaudeMemoryExternalIncludeWarningShown = markGroupClaudeMemoryExternalIncludeWarningShown;
exports.upsertGroupTypedMemoryDocument = upsertGroupTypedMemoryDocument;
exports.discoverProjectMemoryFiles = discoverProjectMemoryFiles;
exports.importProjectMemoryFilesToGroupTypedMemory = importProjectMemoryFilesToGroupTypedMemory;
exports.discoverGlobalClaudeMemoryFiles = discoverGlobalClaudeMemoryFiles;
exports.importGlobalClaudeMemoryToGroupTypedMemory = importGlobalClaudeMemoryToGroupTypedMemory;
exports.scanGroupTypedMemoryDocuments = scanGroupTypedMemoryDocuments;
exports.buildGroupTypedMemoryIndex = buildGroupTypedMemoryIndex;
exports.buildGroupTypedMemoryLoadPlan = buildGroupTypedMemoryLoadPlan;
exports.renderGroupTypedMemoryLoadPlan = renderGroupTypedMemoryLoadPlan;
exports.readGroupTypedMemoryDistillationLedger = readGroupTypedMemoryDistillationLedger;
exports.distillProviderReproofReceiptConsumptionToTypedMemory = distillProviderReproofReceiptConsumptionToTypedMemory;
exports.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory;
exports.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory;
exports.distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory;
exports.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile;
exports.acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals;
exports.revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention;
exports.recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery = recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth;
exports.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext;
exports.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance = runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance;
exports.lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows = restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows;
exports.distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory;
exports.distillProviderRankingMemoryUsageReceiptRepairToTypedMemory = distillProviderRankingMemoryUsageReceiptRepairToTypedMemory;
exports.distillProviderDispatchOverrideFollowupToTypedMemory = distillProviderDispatchOverrideFollowupToTypedMemory;
exports.distillProviderSwitchExecutionToTypedMemory = distillProviderSwitchExecutionToTypedMemory;
exports.distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory = distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory;
exports.distillIgnoreMemoryReceiptRepairToTypedMemory = distillIgnoreMemoryReceiptRepairToTypedMemory;
exports.distillPressureMemoryProvenanceReceiptRepairToTypedMemory = distillPressureMemoryProvenanceReceiptRepairToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceToTypedMemory = distillPressureProvenancePreDispatchComplianceToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory = distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory;
exports.buildCrossGroupProviderDispatchReliabilitySignal = buildCrossGroupProviderDispatchReliabilitySignal;
exports.buildGlobalProviderDispatchReliabilitySignals = buildGlobalProviderDispatchReliabilitySignals;
exports.getGlobalProviderDispatchReliabilitySnapshotFile = getGlobalProviderDispatchReliabilitySnapshotFile;
exports.writeGlobalProviderDispatchReliabilitySnapshot = writeGlobalProviderDispatchReliabilitySnapshot;
exports.readGlobalProviderDispatchReliabilitySnapshot = readGlobalProviderDispatchReliabilitySnapshot;
exports.getOrRefreshGlobalProviderDispatchReliabilitySnapshot = getOrRefreshGlobalProviderDispatchReliabilitySnapshot;
exports.buildPressureProvenancePreDispatchComplianceDispatchPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy;
exports.distillContextUsageRepairToTypedMemory = distillContextUsageRepairToTypedMemory;
exports.distillCompactStrategyToTypedMemory = distillCompactStrategyToTypedMemory;
exports.distillPtlEmergencyDowngradeToTypedMemory = distillPtlEmergencyDowngradeToTypedMemory;
exports.evaluateGroupTypedMemoryDistillationQuality = evaluateGroupTypedMemoryDistillationQuality;
exports.distillGroupMessagesToTypedMemory = distillGroupMessagesToTypedMemory;
exports.syncGroupTypedMemoryFromGroupMemory = syncGroupTypedMemoryFromGroupMemory;
exports.shouldIgnoreGroupMemoryRequest = shouldIgnoreGroupMemoryRequest;
exports.readGroupTypedMemoryRecallLedger = readGroupTypedMemoryRecallLedger;
exports.getAlreadySurfacedGroupTypedMemory = getAlreadySurfacedGroupTypedMemory;
exports.recordGroupTypedMemoryRecall = recordGroupTypedMemoryRecall;
exports.buildGroupTypedMemoryRecall = buildGroupTypedMemoryRecall;
exports.renderGroupTypedMemoryRecall = renderGroupTypedMemoryRecall;
exports.runGroupTypedMemoryIndexSelfTest = runGroupTypedMemoryIndexSelfTest;
exports.runGroupTypedMemoryPostCompactUsageScoringSelfTest = runGroupTypedMemoryPostCompactUsageScoringSelfTest;
exports.runGroupTypedMemoryWorkerContextPressureRecallSelfTest = runGroupTypedMemoryWorkerContextPressureRecallSelfTest;
exports.runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest = runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest;
exports.runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest = runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest;
exports.runGroupTypedMemoryLoadPlanSelfTest = runGroupTypedMemoryLoadPlanSelfTest;
exports.runGroupTypedMemoryPathConditionSelfTest = runGroupTypedMemoryPathConditionSelfTest;
exports.runGroupProjectMemoryImportSelfTest = runGroupProjectMemoryImportSelfTest;
exports.runGroupGlobalClaudeMemoryImportSelfTest = runGroupGlobalClaudeMemoryImportSelfTest;
exports.runGroupClaudeMemoryExternalIncludeApprovalSelfTest = runGroupClaudeMemoryExternalIncludeApprovalSelfTest;
exports.runGroupClaudeMemorySettingSourcePolicySelfTest = runGroupClaudeMemorySettingSourcePolicySelfTest;
exports.runGroupInstructionsLoadedHookPipelineSelfTest = runGroupInstructionsLoadedHookPipelineSelfTest;
exports.runGroupTypedMemoryLogDistillationSelfTest = runGroupTypedMemoryLogDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactUsageDistillationSelfTest = runGroupTypedMemoryPostCompactUsageDistillationSelfTest;
exports.runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest = runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest;
exports.runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest = runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest;
exports.runGroupTypedMemoryDistillationQualitySelfTest = runGroupTypedMemoryDistillationQualitySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
exports.GROUP_TYPED_MEMORY_VERSION = 1;
exports.GROUP_TYPED_MEMORY_ENTRYPOINT = "MEMORY.md";
exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES = 200;
exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES = 25_000;
exports.GROUP_TYPED_MEMORY_MAX_RECALL = 5;
exports.GROUP_TYPED_MEMORY_RECALL_LEDGER = ".recall-ledger.json";
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER = ".pressure-recall-usage-ledger.json";
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER = ".post-compact-completion-memory-preservation-closure-usage-ledger.json";
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS = 14;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS = 45;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD = 0.34;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD = 0.45;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT = 0.6;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD = 0.25;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS = 21;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS = 60;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS = 24;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION = 1;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES = 80;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH = 5;
exports.GROUP_PROJECT_MEMORY_IMPORT_VERSION = 1;
exports.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION = 1;
exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER = ".distillation-ledger.json";
exports.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES = 1200;
exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT = 100;
exports.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION = 1;
exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT = 160;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR = ".archive/post-compact-completion-memory-preservation-closure-conflict-resolutions";
exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS = 14;
exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS = 32;
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION = 1;
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS = 15 * 60 * 1000;
exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER = ".claude-external-include-approvals.json";
exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER = ".instructions-loaded-hooks.json";
const GROUP_TYPED_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory-md");
const GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR = path.join(utils_1.CCM_DIR, "global-provider-reliability");
const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-work-items");
const VALID_TYPES = new Set(["user", "feedback", "project", "reference"]);
const CLAUDE_EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"];
const CLAUDE_ALWAYS_ON_SETTING_SOURCES = ["policySettings", "flagSettings"];
const CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS = new Set([
    ".md", ".txt", ".text", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts", ".cs", ".php",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
    ".sql", ".graphql", ".gql", ".proto", ".ini", ".cfg", ".conf",
]);
const groupMemoryInstructionsLoadedHooks = new Set();
function now() {
    return new Date().toISOString();
}
function safeSegment(value, fallback = "unknown") {
    const text = String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
    return text || fallback;
}
function normalizeMemoryType(value) {
    const type = String(value || "").trim().toLowerCase();
    return VALID_TYPES.has(type) ? type : "project";
}
function normalizeClaudeSettingSourceName(value) {
    const text = String(value || "").trim();
    if (!text)
        return "";
    if (["user", "userSettings"].includes(text))
        return "userSettings";
    if (["project", "projectSettings"].includes(text))
        return "projectSettings";
    if (["local", "localSettings"].includes(text))
        return "localSettings";
    if (["policy", "managed", "managedSettings", "policySettings"].includes(text))
        return "policySettings";
    if (["flag", "cli", "flagSettings"].includes(text))
        return "flagSettings";
    return "";
}
function parseClaudeSettingSources(value) {
    if (value === undefined || value === null)
        return null;
    const raw = Array.isArray(value)
        ? value
        : String(value).trim() === ""
            ? []
            : String(value).split(",").map(item => item.trim());
    const enabled = [];
    const invalid = [];
    for (const item of raw) {
        const normalized = normalizeClaudeSettingSourceName(item);
        if (normalized)
            enabled.push(normalized);
        else if (String(item || "").trim())
            invalid.push(String(item));
    }
    return { enabled: [...new Set(enabled)], invalid };
}
function buildClaudeMemorySettingSourcePolicy(options = {}) {
    const configured = parseClaudeSettingSources(options.settingSources ?? options.setting_sources ?? process.env.CCM_CLAUDE_SETTING_SOURCES);
    const editable = configured
        ? configured.enabled.filter(source => CLAUDE_EDITABLE_SETTING_SOURCES.includes(source))
        : [...CLAUDE_EDITABLE_SETTING_SOURCES];
    const enabled = new Set([
        ...editable,
        ...CLAUDE_ALWAYS_ON_SETTING_SOURCES,
        ...(configured?.enabled || []).filter(source => CLAUDE_ALWAYS_ON_SETTING_SOURCES.includes(source)),
    ]);
    const explicitDisable = (camel, snake) => options[camel] === false || options[snake] === false;
    const policy = {
        schema: "ccm-claude-memory-setting-source-policy-v1",
        version: exports.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION,
        configured: configured ? configured.enabled : null,
        invalid: configured?.invalid || [],
        enabled: [...enabled],
        disabled: [...CLAUDE_EDITABLE_SETTING_SOURCES, ...CLAUDE_ALWAYS_ON_SETTING_SOURCES].filter(source => !enabled.has(source)),
        isolationMode: configured !== null && editable.length === 0,
        includeUser: enabled.has("userSettings") && !explicitDisable("includeUser", "include_user"),
        includeProject: enabled.has("projectSettings") && !explicitDisable("includeProject", "include_project"),
        includeLocal: enabled.has("localSettings") && !explicitDisable("includeLocal", "include_local"),
        includeManaged: enabled.has("policySettings") && !explicitDisable("includeManaged", "include_managed"),
        includeFlagSettings: enabled.has("flagSettings"),
        order: ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"],
    };
    return policy;
}
function compactText(value, max = 1000) {
    const text = String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
    if (text.length <= max)
        return text;
    const head = Math.max(1, Math.floor(max * 0.65));
    const tail = Math.max(1, max - head - 32);
    return `${text.slice(0, head)}\n...[typed-memory truncated]...\n${text.slice(-tail)}`;
}
function uniqueStrings(values = [], limit = 20) {
    const result = [];
    const seen = new Set();
    for (const raw of values) {
        const value = compactText(raw, 500);
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= limit)
            break;
    }
    return result;
}
function checksum(value, length = 16) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}
function ensureGroupTypedMemoryDir(groupId) {
    const dir = getGroupTypedMemoryDir(groupId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
function writeTextAtomic(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
        if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === content)
            return false;
    }
    catch { }
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, content, "utf-8");
    fs.renameSync(temp, file);
    return true;
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function yamlEscape(value) {
    return JSON.stringify(value == null ? "" : value);
}
function renderFrontmatter(meta) {
    const ordered = [
        "name", "description", "type", "source", "paths", "group_id", "updated_at", "checksum",
    ];
    const lines = ["---"];
    for (const key of ordered) {
        if (meta[key] === undefined || meta[key] === null)
            continue;
        lines.push(`${key}: ${yamlEscape(meta[key])}`);
    }
    lines.push("---");
    return lines.join("\n");
}
function parseFrontmatter(content) {
    const text = String(content || "");
    if (!text.startsWith("---"))
        return { meta: {}, body: text.trim() };
    const end = text.indexOf("\n---", 3);
    if (end < 0)
        return { meta: {}, body: text.trim() };
    const raw = text.slice(3, end).trim();
    const meta = {};
    for (const line of raw.split(/\n+/)) {
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (!match)
            continue;
        const value = match[2].trim();
        try {
            meta[match[1]] = JSON.parse(value);
        }
        catch {
            meta[match[1]] = value.replace(/^"|"$/g, "");
        }
    }
    return { meta, body: text.slice(end + 4).trim() };
}
function normalizePathGlobs(value) {
    const raw = Array.isArray(value)
        ? value
        : String(value || "").split(/[,;\n]+/);
    return raw
        .map(item => String(item || "").trim().replace(/\\/g, "/"))
        .map(item => item.endsWith("/**") ? item.slice(0, -3) : item)
        .filter(item => item && item !== "**")
        .slice(0, 40);
}
function normalizeTargetPath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}
function deriveGroupTypedMemoryTargetPaths(value, extra = []) {
    const text = String(value || "");
    const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql|css|scss|html))/g) || [];
    const result = [];
    const seen = new Set();
    for (const raw of [...extra, ...matched]) {
        const value = normalizeTargetPath(raw);
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= 80)
            break;
    }
    return result;
}
function globToRegExp(pattern) {
    const normalized = normalizeTargetPath(pattern);
    let out = "^";
    for (let index = 0; index < normalized.length; index += 1) {
        const char = normalized[index];
        const next = normalized[index + 1];
        const afterNext = normalized[index + 2];
        if (char === "*" && next === "*" && afterNext === "/") {
            out += "(?:.*/)?";
            index += 2;
        }
        else if (char === "*" && next === "*") {
            out += ".*";
            index += 1;
        }
        else if (char === "*") {
            out += "[^/]*";
        }
        else if ("\\^$+?.()|{}[]".includes(char)) {
            out += `\\${char}`;
        }
        else {
            out += char;
        }
    }
    out += "$";
    return new RegExp(out, "i");
}
function pathMatchesTypedMemoryGlobs(targetPath, globs = []) {
    const target = normalizeTargetPath(targetPath);
    if (!target)
        return false;
    for (const rawPattern of normalizePathGlobs(globs)) {
        const pattern = normalizeTargetPath(rawPattern);
        if (!pattern)
            continue;
        if (pattern.endsWith("/")) {
            if (target.startsWith(pattern))
                return true;
            continue;
        }
        if (!pattern.includes("*") && (target === pattern || target.startsWith(`${pattern}/`) || target.endsWith(`/${pattern}`)))
            return true;
        if (globToRegExp(pattern).test(target))
            return true;
    }
    return false;
}
function evaluateTypedMemoryPathCondition(doc, targetPaths = []) {
    const globs = normalizePathGlobs(doc?.paths || doc?.pathGlobs || doc?.globs || []);
    if (!globs.length)
        return { conditional: false, matched: true, matchedPaths: [], globs };
    const paths = deriveGroupTypedMemoryTargetPaths("", targetPaths);
    const matchedPaths = paths.filter(targetPath => pathMatchesTypedMemoryGlobs(targetPath, globs));
    return {
        conditional: true,
        matched: matchedPaths.length > 0,
        matchedPaths,
        globs,
    };
}
function listMemoryMarkdownFiles(groupId) {
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        return fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".md") && name !== exports.GROUP_TYPED_MEMORY_ENTRYPOINT)
            .map(name => path.join(dir, name));
    }
    catch {
        return [];
    }
}
function tokens(value) {
    const text = String(value || "").toLowerCase();
    const result = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        result.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        result.add(chinese.slice(index, index + 2));
    return [...result].slice(0, 200);
}
function extractSnippet(body, queryTokens, max = 700) {
    const lines = String(body || "").split(/\n+/).filter(Boolean);
    const scored = lines.map((line, index) => ({
        line,
        index,
        score: queryTokens.reduce((sum, token) => sum + (line.toLowerCase().includes(token) ? 1 : 0), 0),
    })).sort((a, b) => b.score - a.score || a.index - b.index);
    const picked = (scored[0]?.score ? scored.slice(0, 4).sort((a, b) => a.index - b.index).map(item => item.line) : lines.slice(0, 4)).join("\n");
    return compactText(picked, max);
}
function normalizePostCompactCandidateUsageHints(input = {}) {
    const usage = input.postCompactCandidateUsage
        || input.post_compact_candidate_usage
        || input.candidateUsage
        || input.candidate_usage
        || {};
    const rows = [
        ...(Array.isArray(usage.useful_candidates || usage.usefulCandidates) ? (usage.useful_candidates || usage.usefulCandidates) : []),
        ...(Array.isArray(usage.ignored_candidates || usage.ignoredCandidates) ? (usage.ignored_candidates || usage.ignoredCandidates) : []),
        ...(Array.isArray(usage.missing_usage_candidates || usage.missingUsageCandidates) ? (usage.missing_usage_candidates || usage.missingUsageCandidates) : []),
        ...(Array.isArray(usage.rows) ? usage.rows : []),
    ];
    return rows.map((row) => {
        const candidateId = String(row.candidate_id || row.candidateId || "").trim();
        const value = compactText(row.value || "", 260);
        const recommendation = String(row.recommendation || "").trim()
            || (Number(row.used_count || 0) + Number(row.verified_count || 0) > Number(row.ignored_count || 0)
                ? "promote_recall"
                : Number(row.ignored_count || 0) > Number(row.used_count || 0) + Number(row.verified_count || 0)
                    ? "deprioritize_or_distill"
                    : Number(row.mentioned_count || 0) > 0 ? "require_usage_receipt" : "neutral_verify_current_context");
        return {
            candidate_id: candidateId,
            value,
            recommendation,
            used_count: Number(row.used_count || 0),
            verified_count: Number(row.verified_count || 0),
            ignored_count: Number(row.ignored_count || 0),
            mentioned_count: Number(row.mentioned_count || 0),
        };
    }).filter((row) => row.candidate_id || row.value);
}
function scorePostCompactCandidateUsageHint(corpus, hints = []) {
    const matched = [];
    let adjustment = 0;
    for (const hint of hints) {
        const candidateId = String(hint.candidate_id || "").toLowerCase();
        const value = String(hint.value || "").toLowerCase();
        const matches = (!!candidateId && corpus.includes(candidateId)) || (!!value && corpus.includes(value));
        if (!matches)
            continue;
        let delta = 0;
        if (hint.recommendation === "promote_recall")
            delta = 8 + Math.min(6, hint.used_count + hint.verified_count);
        else if (hint.recommendation === "deprioritize_or_distill")
            delta = -8 - Math.min(6, hint.ignored_count);
        else if (hint.recommendation === "require_usage_receipt")
            delta = 2;
        else
            delta = 3;
        adjustment += delta;
        matched.push({
            candidate_id: hint.candidate_id,
            value: hint.value,
            recommendation: hint.recommendation,
            delta,
        });
    }
    return { adjustment, matched };
}
function firstFiniteNumber(...values) {
    for (const value of values) {
        if (value === undefined || value === null || value === "")
            continue;
        const number = Number(value);
        if (Number.isFinite(number))
            return number;
    }
    return 0;
}
function normalizeWorkerContextPressureStatus(rawStatus, pressure = 0, freeTokens = 0, compactRecommended = false) {
    const status = String(rawStatus || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["over_budget", "critical", "compact_recommended"].includes(status))
        return status;
    if (/over.*budget|budget.*exhaust|negative_free|blocked_by_budget/.test(status))
        return "over_budget";
    if (/critical|emergency/.test(status))
        return "critical";
    if (/compact|compress|crop|trim|pressure|warning/.test(status) && !/ok|pass|recovered|continue/.test(status))
        return "compact_recommended";
    if (freeTokens < 0 || pressure >= 100)
        return "over_budget";
    if (pressure >= 90)
        return "critical";
    if (compactRecommended || pressure >= 82)
        return "compact_recommended";
    return "";
}
function normalizeWorkerContextPressureRecallSignals(options = {}) {
    const sources = [];
    const memory = options.groupMemory || options.group_memory || options.memory || options.workerMemory || options.worker_memory || null;
    const addSource = (source, raw) => {
        if (raw === undefined || raw === null || raw === "")
            return;
        if (Array.isArray(raw)) {
            raw.forEach((item, index) => addSource(`${source}[${index}]`, item));
            return;
        }
        const value = typeof raw === "object" ? raw : { status: raw };
        sources.push({ source, raw: value });
    };
    addSource("worker_context_packet_context_usage", options.workerContextPacketContextUsage || options.worker_context_packet_context_usage);
    addSource("worker_context_usage", options.workerContextUsage || options.worker_context_usage || options.contextUsage || options.context_usage);
    addSource("worker_context_pressure", options.workerContextPressure || options.worker_context_pressure || options.contextPressure || options.context_pressure);
    addSource("pre_dispatch_gate", options.preDispatchGate || options.pre_dispatch_gate || options.workerContextPreDispatchGate || options.worker_context_pre_dispatch_gate);
    addSource("context_compaction_retry", options.contextCompactionRetry || options.context_compaction_retry || options.workerContextCompactionRetry || options.worker_context_compaction_retry);
    addSource("compact_strategy_pressure", options.compactStrategyPressure || options.compact_strategy_pressure || options.compactStrategyDecision || options.compact_strategy_decision);
    addSource("ptl_emergency", options.ptlEmergency || options.ptl_emergency || options.ptlEmergencyHint || options.ptl_emergency_hint);
    if (options.forceWorkerContextPressureRecall === true || options.force_worker_context_pressure_recall === true) {
        addSource("forced", { status: "compact_recommended", reason: "force_worker_context_pressure_recall" });
    }
    if (memory && typeof memory === "object") {
        const compaction = memory.compaction || {};
        const boundary = memory.compactBoundary || memory.compact_boundary || {};
        const postRestore = boundary.post_compact_restore || boundary.postCompactRestore || {};
        const messageCompression = memory.messageCompression || memory.message_compression || {};
        addSource("group_memory_context_pressure_warning", compaction.contextPressureWarning || compaction.context_pressure_warning || compaction.compactWarning || compaction.compact_warning || messageCompression.contextPressureWarning || messageCompression.context_pressure_warning);
        addSource("group_memory_pre_compact_warning", compaction.preCompactWarning || compaction.pre_compact_warning);
        addSource("group_memory_ptl_emergency", compaction.ptlEmergency || compaction.ptl_emergency || boundary.ptlEmergency || boundary.ptl_emergency || postRestore.ptlEmergency || postRestore.ptl_emergency);
        addSource("group_memory_compact_strategy_decision", compaction.compactStrategyDecision || compaction.compact_strategy_decision || boundary.compactStrategyDecision || boundary.compact_strategy_decision || postRestore.strategyDecision || postRestore.strategy_decision || messageCompression.compactStrategyDecision || messageCompression.compact_strategy_decision);
        addSource("group_memory_partial_compact", compaction.partialCompact || compaction.partial_compact || boundary.partialCompact || boundary.partial_compact);
    }
    const signals = sources.map(({ source, raw }) => {
        const compactRecommended = raw.compact_recommended === true
            || raw.compactRecommended === true
            || raw.must_repair_before_dispatch === true
            || raw.mustRepairBeforeDispatch === true
            || raw.blocked === true
            || raw.dispatch_ready === false
            || raw.dispatchReady === false
            || /compact|compress|crop|trim|budget|pressure/i.test(`${raw.recommendation || ""}\n${raw.next_step || raw.nextStep || ""}\n${raw.reason || ""}`);
        const pressure = firstFiniteNumber(raw.pressure, raw.worker_context_packet_pressure, raw.context_pressure, raw.contextPressure);
        const totalTokens = firstFiniteNumber(raw.total_tokens, raw.totalTokens, raw.worker_context_packet_total_tokens);
        const maxTokens = firstFiniteNumber(raw.max_tokens, raw.maxTokens, raw.worker_context_packet_max_tokens);
        const autocompactBufferTokens = firstFiniteNumber(raw.autocompact_buffer_tokens, raw.autocompactBufferTokens, raw.worker_context_packet_autocompact_buffer_tokens);
        const computedFreeTokens = maxTokens > 0 ? maxTokens - totalTokens - autocompactBufferTokens : 0;
        const freeTokens = firstFiniteNumber(raw.free_tokens, raw.freeTokens, raw.worker_context_packet_free_tokens, computedFreeTokens);
        const rawStatus = raw.status
            || raw.usage_status
            || raw.usageStatus
            || raw.pressure_status
            || raw.pressureStatus
            || raw.level
            || raw.emergency_level
            || raw.emergencyLevel
            || raw.recommendation
            || raw.next_step
            || raw.nextStep
            || "";
        const pressureStatus = normalizeWorkerContextPressureStatus(rawStatus, pressure, freeTokens, compactRecommended);
        const suppressed = raw.suppressed === true || raw.suppress === true || raw.is_suppressed === true || raw.isSuppressed === true;
        const blockedOutcomeCount = firstFiniteNumber(raw.blocked_outcome_count, raw.blockedOutcomeCount, raw.blocked_count, raw.blockedCount);
        const taskCompactedBlockedCount = firstFiniteNumber(raw.task_compacted_blocked_count, raw.taskCompactedBlockedCount);
        const ptlEngaged = raw.engaged === true
            || raw.ptl_emergency_engaged === true
            || raw.ptlEmergencyEngaged === true
            || /ptl.*emergency|emergency.*downgrade|repeated compact failure/i.test(`${raw.reason || ""}\n${raw.method || ""}\n${raw.status || ""}`);
        const repeatedCompactFailure = raw.repeated_compact_failure === true
            || raw.repeatedCompactFailure === true
            || blockedOutcomeCount >= 2
            || taskCompactedBlockedCount > 0
            || (/blocked|fail/.test(String(raw.status || "").toLowerCase()) && /compact|retry|budget/i.test(`${raw.method || ""}\n${raw.reason || ""}`));
        const active = !suppressed && (!!pressureStatus || ptlEngaged || repeatedCompactFailure);
        return {
            source,
            active,
            suppressed,
            status: pressureStatus,
            pressure,
            total_tokens: totalTokens,
            max_tokens: maxTokens,
            free_tokens: freeTokens,
            autocompact_buffer_tokens: autocompactBufferTokens,
            ptl_emergency: ptlEngaged,
            repeated_compact_failure: repeatedCompactFailure,
            blocked_outcome_count: blockedOutcomeCount,
            task_compacted_blocked_count: taskCompactedBlockedCount,
            reason: compactText(raw.reason || raw.recommendation || raw.next_step || raw.nextStep || raw.method || "", 260),
        };
    }).filter(signal => signal.active || signal.suppressed || signal.status || signal.ptl_emergency || signal.repeated_compact_failure);
    const rank = { compact_recommended: 1, critical: 2, over_budget: 3 };
    const activeSignals = signals.filter(signal => signal.active);
    const pressureStatus = activeSignals
        .map(signal => signal.status)
        .filter(Boolean)
        .sort((a, b) => Number(rank[b] || 0) - Number(rank[a] || 0))[0] || "";
    const finiteFreeTokens = activeSignals
        .map(signal => Number(signal.free_tokens || 0))
        .filter(value => Number.isFinite(value) && value !== 0);
    return {
        schema: "ccm-worker-context-pressure-recall-signals-v1",
        active: activeSignals.length > 0,
        signal_count: signals.length,
        active_signal_count: activeSignals.length,
        pressure_status: pressureStatus,
        max_pressure: activeSignals.reduce((max, signal) => Math.max(max, Number(signal.pressure || 0)), 0),
        min_free_tokens: finiteFreeTokens.length ? Math.min(...finiteFreeTokens) : 0,
        ptl_emergency: activeSignals.some(signal => signal.ptl_emergency === true),
        repeated_compact_failure: activeSignals.some(signal => signal.repeated_compact_failure === true),
        signals: activeSignals.slice(-8),
        suppressed_signal_count: signals.filter(signal => signal.suppressed).length,
    };
}
function queryMentionsWorkerContextPressure(text, queryTokens = []) {
    const haystack = `${text}\n${queryTokens.join("\n")}`.toLowerCase();
    return /workercontextpacket|worker context|context_usage|context usage|context pressure|usage pressure|free_tokens|autocompact|over_budget|compact_recommended|metadata_partial_compact|task_hash_unchanged|ptl emergency|ptl|compact strategy|上下文|压力|预算|压缩/.test(haystack);
}
function classifyWorkerContextPressureRecallDoc(corpus, doc = {}) {
    const haystack = `${doc.relPath || ""}\n${doc.file || ""}\n${doc.source || ""}\n${doc.name || ""}\n${doc.description || ""}\n${corpus}`.toLowerCase();
    const kinds = [];
    const matchedKeywords = [];
    const addKind = (kind, patterns) => {
        for (const [keyword, pattern] of patterns) {
            if (!pattern.test(haystack))
                continue;
            if (!kinds.includes(kind))
                kinds.push(kind);
            matchedKeywords.push(keyword);
        }
    };
    addKind("context_usage", [
        ["worker-context-usage-pressure-discipline", /worker-context-usage-pressure-discipline/],
        ["worker_context_packet_context_usage_repair", /worker_context_packet_context_usage_repair|context usage repair/],
        ["context_usage.status", /context_usage\.status|context usage budget/],
        ["free_tokens", /free_tokens|free=/],
        ["autocompact_buffer", /autocompact_buffer/],
    ]);
    addKind("compact_strategy", [
        ["worker-context-compact-strategy", /worker-context-compact-strategy/],
        ["compact_strategy_memory", /compact strategy memory|compact-strategy-memory|compact_strategy/],
        ["metadata_partial_compact", /metadata_partial_compact|metadata partial compact/],
        ["free_token_delta", /free_token_delta|avg_free_token_delta/],
        ["task_hash_unchanged", /task_hash_unchanged/],
    ]);
    addKind("ptl_emergency", [
        ["worker-context-ptl-emergency-downgrade", /worker-context-ptl-emergency-downgrade/],
        ["ptl emergency", /ptl emergency|ptl-emergency|ptl_emergency/],
        ["emergency downgrade", /emergency downgrade|emergency-downgrade/],
        ["maxTaskChars", /maxtaskchars|max_task_chars/],
        ["repeated compact failure", /repeated compact failure/],
    ]);
    return {
        pressure_doc: kinds.length > 0,
        kinds,
        matched_keywords: uniqueStrings(matchedKeywords, 12),
    };
}
function scoreWorkerContextPressureRecall(corpus, doc, signals = {}, queryText = "", queryTokens = []) {
    const classification = classifyWorkerContextPressureRecallDoc(corpus, doc);
    if (!classification.pressure_doc) {
        return {
            adjustment: 0,
            matched: [],
            pressure_doc: false,
            kinds: [],
            signal_count: signals.signal_count || 0,
            active_signal_count: signals.active_signal_count || 0,
        };
    }
    const matched = [];
    let adjustment = 0;
    const status = String(signals.pressure_status || "");
    const pressureWeight = status === "over_budget" ? 8 : status === "critical" ? 6 : status === "compact_recommended" ? 4 : 0;
    const addDelta = (kind, delta, reason) => {
        if (!delta)
            return;
        adjustment += delta;
        matched.push({ kind, delta, reason });
    };
    if (signals.active) {
        if (classification.kinds.includes("context_usage")) {
            addDelta("context_usage", 8 + Math.min(6, pressureWeight), `${status || "pressure"} context_usage discipline`);
        }
        if (classification.kinds.includes("compact_strategy")) {
            const delta = signals.repeated_compact_failure
                ? 14
                : status === "over_budget"
                    ? 12
                    : status === "critical"
                        ? 10
                        : status === "compact_recommended"
                            ? 7
                            : 5;
            addDelta("compact_strategy", delta, signals.repeated_compact_failure ? "repeated compact failure strategy memory" : `${status || "pressure"} compact strategy memory`);
        }
        if (classification.kinds.includes("ptl_emergency")) {
            const delta = signals.ptl_emergency || signals.repeated_compact_failure
                ? 16
                : status === "over_budget"
                    ? 5
                    : 0;
            addDelta("ptl_emergency", delta, signals.ptl_emergency ? "ptl emergency engaged" : "over-budget emergency downgrade advisory");
        }
        adjustment = Math.min(28, adjustment);
    }
    else if (!queryMentionsWorkerContextPressure(queryText, queryTokens)) {
        const delta = classification.kinds.includes("ptl_emergency")
            ? -7
            : classification.kinds.includes("compact_strategy")
                ? -5
                : -4;
        addDelta(classification.kinds[0] || "pressure_doc", delta, "no worker-context pressure signal");
    }
    return {
        adjustment,
        matched,
        pressure_doc: true,
        kinds: classification.kinds,
        matched_keywords: classification.matched_keywords,
        signal_count: signals.signal_count || 0,
        active_signal_count: signals.active_signal_count || 0,
        pressure_status: signals.pressure_status || "",
        ptl_emergency: signals.ptl_emergency === true,
        repeated_compact_failure: signals.repeated_compact_failure === true,
    };
}
function normalizeWorkerContextPressureRecallUsageState(value) {
    const state = String(value || "").toLowerCase().trim();
    if (["used", "ignored", "verified", "mentioned"].includes(state))
        return state;
    if (["checked", "reviewed", "validated", "confirmed"].includes(state))
        return "verified";
    if (["skipped", "unused", "not_used", "not-used", "not used", "unreferenced"].includes(state))
        return "ignored";
    if (["applied", "referenced", "consumed"].includes(state))
        return "used";
    return "";
}
function roundPressureRecallUsageWeight(value, precision = 3) {
    const number = Number(value || 0);
    if (!Number.isFinite(number))
        return 0;
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
}
function normalizeWorkerContextPressureRecallUsageAging(options = {}) {
    const disabled = options.disableUsageAging === true
        || options.disable_usage_aging === true
        || options.usageAging === false
        || options.usage_aging === false
        || options.pressureRecallUsageAging === false
        || options.pressure_recall_usage_aging === false;
    const explicitNow = options.nowMs
        ?? options.now_ms
        ?? (options.now || options.generatedAt || options.generated_at ? Date.parse(String(options.now || options.generatedAt || options.generated_at)) : undefined);
    const nowMs = Number.isFinite(Number(explicitNow)) && Number(explicitNow) > 0 ? Number(explicitNow) : Date.now();
    const halfLifeDays = Math.max(1, Number(options.usageHalfLifeDays
        ?? options.usage_half_life_days
        ?? options.pressureRecallUsageHalfLifeDays
        ?? options.pressure_recall_usage_half_life_days
        ?? exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS));
    const staleAfterDays = Math.max(halfLifeDays, Number(options.usageStaleAfterDays
        ?? options.usage_stale_after_days
        ?? options.pressureRecallUsageStaleAfterDays
        ?? options.pressure_recall_usage_stale_after_days
        ?? exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS));
    const minWeight = Math.max(0, Math.min(1, Number(options.usageMinDecayWeight
        ?? options.usage_min_decay_weight
        ?? options.pressureRecallUsageMinDecayWeight
        ?? options.pressure_recall_usage_min_decay_weight
        ?? 0)));
    return {
        schema: "ccm-group-typed-memory-pressure-recall-usage-aging-v1",
        enabled: !disabled,
        now_ms: nowMs,
        now: new Date(nowMs).toISOString(),
        half_life_days: halfLifeDays,
        stale_after_days: staleAfterDays,
        min_decay_weight: minWeight,
    };
}
function workerContextPressureRecallUsageEntryTimeMs(entry = {}, fallbackMs = Date.now()) {
    const raw = entry.generated_at
        || entry.generatedAt
        || entry.at
        || entry.updated_at
        || entry.updatedAt
        || entry.last_seen_at
        || entry.lastSeenAt
        || "";
    const parsed = Date.parse(String(raw || ""));
    return Number.isFinite(parsed) ? parsed : fallbackMs;
}
function workerContextPressureRecallUsageAgeDays(entry = {}, aging = {}) {
    const nowMs = Number(aging.now_ms || Date.now());
    const timeMs = workerContextPressureRecallUsageEntryTimeMs(entry, nowMs);
    return Math.max(0, (nowMs - timeMs) / (24 * 60 * 60 * 1000));
}
function workerContextPressureRecallUsageDecayWeight(ageDays, aging = {}) {
    if (aging.enabled === false)
        return 1;
    const days = Math.max(0, Number(ageDays || 0));
    const halfLifeDays = Math.max(1, Number(aging.half_life_days || exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS));
    const weight = Math.pow(0.5, days / halfLifeDays);
    return roundPressureRecallUsageWeight(Math.max(Number(aging.min_decay_weight || 0), weight), 4);
}
function workerContextPressureRecallStatsKey(row = {}, targetProject = "") {
    const relPath = String(row.rel_path || row.relPath || "").trim().toLowerCase();
    const name = String(row.name || "").trim().toLowerCase();
    return [
        String(targetProject || row.target_project || row.targetProject || "").trim().toLowerCase(),
        relPath || checksum(name || row.source || row.value || "pressure-memory", 18),
    ].join("|");
}
function workerContextPressureRecallUsageRecommendation(stats = {}) {
    const weightedTotal = Number(stats.weighted_total_count ?? stats.total_weighted_count ?? 0);
    const rawTotal = Number(stats.total_count || 0);
    const staleCount = Number(stats.stale_count || 0);
    const freshCount = Number(stats.fresh_count || 0);
    if (rawTotal > 0 && weightedTotal > 0 && weightedTotal < 0.5 && staleCount >= rawTotal && freshCount === 0) {
        return "stale_pressure_recall_history";
    }
    const used = Number(stats.weighted_used_count ?? stats.used_weighted_count ?? stats.used_count ?? 0);
    const verified = Number(stats.weighted_verified_count ?? stats.verified_weighted_count ?? stats.verified_count ?? 0);
    const ignored = Number(stats.weighted_ignored_count ?? stats.ignored_weighted_count ?? stats.ignored_count ?? 0);
    const mentioned = Number(stats.weighted_mentioned_count ?? stats.mentioned_weighted_count ?? stats.mentioned_count ?? 0);
    if (used + verified >= ignored + mentioned + 2)
        return "promote_pressure_recall";
    if (ignored >= used + verified + 2)
        return "deprioritize_pressure_recall";
    if (mentioned > 0 && used + verified + ignored === 0)
        return "require_pressure_usage_receipt";
    return "neutral_verify_current_pressure";
}
function buildWorkerContextPressureRecallUsageEntry(groupId, input = {}, row = {}) {
    const usageState = normalizeWorkerContextPressureRecallUsageState(row.usage_state || row.usageState || row.status || row.state);
    if (!usageState)
        return null;
    const relPath = String(row.rel_path || row.relPath || "").trim();
    const name = compactText(row.name || row.title || "", 180);
    if (!relPath && !name)
        return null;
    const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
    const agent = String(row.agent || input.agent || input.project || targetProject || "").trim();
    const generatedAt = String(input.generatedAt || input.generated_at || row.generated_at || row.generatedAt || now());
    const entryCore = {
        group_id: groupId,
        target_project: targetProject,
        agent,
        task_id: String(input.taskId || input.task_id || row.task_id || row.taskId || "").trim(),
        execution_id: String(input.executionId || input.execution_id || row.execution_id || row.executionId || "").trim(),
        worker_context_packet_id: String(row.worker_context_packet_id || row.workerContextPacketId || input.workerContextPacketId || input.worker_context_packet_id || "").trim(),
        memory_context_snapshot_id: String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || input.memoryContextSnapshotId || input.memory_context_snapshot_id || "").trim(),
        rel_path: relPath,
        name,
        type: String(row.type || "").trim(),
        source: String(row.source || "").trim(),
        kinds: uniqueStrings(Array.isArray(row.kinds) ? row.kinds : [], 8),
        pressure_status: String(row.pressure_status || row.pressureStatus || "").trim(),
        pressure_adjustment: Number(row.pressure_adjustment ?? row.pressureAdjustment ?? row.adjustment ?? 0),
        usage_state: usageState,
        direct_reference: row.direct_reference === true || row.directReference === true,
        referenced: row.referenced === true,
        receipt_status: String(row.receipt_status || row.receiptStatus || "").trim(),
        provenance_status: String(row.provenance_status || row.provenanceStatus || "").trim(),
        repair_status: String(row.repair_status || row.repairStatus || "").trim(),
        repair_work_item_id: String(row.repair_work_item_id || row.repairWorkItemId || row.work_item_id || row.workItemId || "").trim(),
        repair_gap_type: String(row.repair_gap_type || row.repairGapType || row.gap_type || row.gapType || "").trim(),
        current_source_verified: row.current_source_verified === true || row.currentSourceVerified === true,
        reason: compactText(row.reason || row.note || "", 500),
        generated_at: generatedAt,
    };
    return {
        schema: "ccm-group-typed-memory-pressure-recall-usage-entry-v1",
        entry_id: `tmpru_${checksum(entryCore, 18)}`,
        ...entryCore,
    };
}
function readGroupTypedMemoryPressureRecallUsageLedger(groupId) {
    const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-typed-memory-pressure-recall-usage-ledger-v1",
            version: 1,
            groupId,
            file,
            stats: {},
            entries: [],
            totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
            updatedAt: "",
        };
    }
}
function getGroupPressureRecallUsageRepairWorkItemsFile(groupId) {
    return path.join(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${safeSegment(groupId)}.json`);
}
function normalizePressureRecallUsageRepairStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["in_progress", "running", "claimed", "dispatching"].includes(status))
        return "in_progress";
    if (["blocked", "needs_info", "needs_user", "waiting"].includes(status))
        return "blocked";
    if (["completed", "done", "resolved", "ok"].includes(status))
        return "completed";
    if (["cancelled", "canceled", "superseded"].includes(status))
        return "cancelled";
    return "pending";
}
function pressureRecallUsageRepairOpen(status) {
    return ["pending", "in_progress", "blocked"].includes(normalizePressureRecallUsageRepairStatus(status));
}
function normalizeWorkerContextPressureRecallUsageRepairHints(groupId, options = {}) {
    if (options.disablePressureRecallUsageRepairHints === true
        || options.disable_pressure_recall_usage_repair_hints === true
        || options.disableCrossGroupPressureRecallUsageRepairHints === true
        || options.disable_cross_group_pressure_recall_usage_repair_hints === true)
        return [];
    const explicit = options.workerContextPressureRecallUsageRepairHints
        || options.worker_context_pressure_recall_usage_repair_hints
        || options.pressureRecallUsageRepairHints
        || options.pressure_recall_usage_repair_hints
        || null;
    const rawItems = Array.isArray(explicit)
        ? explicit
        : Array.isArray(explicit?.items)
            ? explicit.items
            : (() => {
                try {
                    const parsed = JSON.parse(fs.readFileSync(getGroupPressureRecallUsageRepairWorkItemsFile(groupId), "utf-8"));
                    return Array.isArray(parsed?.items) ? parsed.items : [];
                }
                catch {
                    return [];
                }
            })();
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const includeClosed = options.includeClosedPressureRecallUsageRepairHints === true
        || options.include_closed_pressure_recall_usage_repair_hints === true;
    return (Array.isArray(rawItems) ? rawItems : [])
        .map((item) => {
        const source = String(item.source || "").trim();
        const component = String(item.component || "").trim();
        if (source !== "cross_group_pressure_recall_usage_repair" && component !== "cross_group_pressure_recall_usage")
            return null;
        const status = normalizePressureRecallUsageRepairStatus(item.status);
        if (!includeClosed && !pressureRecallUsageRepairOpen(status))
            return null;
        const itemProject = String(item.target_project || item.targetProject || item.target || "").trim();
        if (targetProject && itemProject && itemProject.toLowerCase() !== targetProject)
            return null;
        const relPath = String(item.cross_group_pressure_recall_usage_rel_path
            || item.crossGroupPressureRecallUsageRelPath
            || item.repair_target
            || item.repairTarget
            || "").trim();
        return {
            schema: "ccm-group-typed-memory-pressure-recall-usage-repair-hint-v1",
            work_item_id: String(item.work_item_id || item.workItemId || item.id || "").trim(),
            status,
            open: pressureRecallUsageRepairOpen(status),
            priority: String(item.priority || "").trim(),
            gap_type: String(item.cross_group_pressure_recall_usage_gap_type || item.crossGroupPressureRecallUsageGapType || "").trim(),
            rel_path: relPath,
            target_project: itemProject,
            local_recommendation: String(item.local_recommendation || item.localRecommendation || "").trim(),
            cross_group_recommendation: String(item.cross_group_recommendation || item.crossGroupRecommendation || "").trim(),
            reason: compactText(item.cross_group_pressure_recall_usage_reason || item.reason || item.description || "", 420),
            source_group_count: Number(item.source_group_count || item.sourceGroupCount || 0),
            source_groups: Array.isArray(item.source_groups || item.sourceGroups) ? (item.source_groups || item.sourceGroups).slice(0, 8) : [],
            updated_at: String(item.updatedAt || item.updated_at || item.lastSeenAt || item.last_seen_at || "").trim(),
        };
    })
        .filter(Boolean);
}
function matchWorkerContextPressureRecallUsageRepairHint(row = {}, repairHints = [], fallbackTargetProject = "") {
    if (!Array.isArray(repairHints) || !repairHints.length)
        return null;
    const relPath = String(row.rel_path || row.relPath || "").trim().toLowerCase();
    const targetProject = String(row.target_project || row.targetProject || fallbackTargetProject || "").trim().toLowerCase();
    return repairHints.find((hint) => {
        const hintRelPath = String(hint.rel_path || hint.relPath || "").trim().toLowerCase();
        const hintProject = String(hint.target_project || hint.targetProject || "").trim().toLowerCase();
        if (hintProject && targetProject && hintProject !== targetProject)
            return false;
        return !!hintRelPath && !!relPath && hintRelPath === relPath;
    }) || null;
}
function writeGroupTypedMemoryPressureRecallUsageLedger(groupId, ledger) {
    const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-260);
    writeJsonAtomic(file, {
        schema: "ccm-group-typed-memory-pressure-recall-usage-ledger-v1",
        version: 1,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
        updatedAt: ledger.updatedAt || now(),
    });
}
function recordGroupTypedMemoryPressureRecallUsageLedger(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const rows = Array.isArray(input.rows)
        ? input.rows
        : Array.isArray(input.pressureRecallUsageRows || input.pressure_recall_usage_rows)
            ? (input.pressureRecallUsageRows || input.pressure_recall_usage_rows)
            : [];
    const entries = rows
        .map((row) => buildWorkerContextPressureRecallUsageEntry(groupId, input, row))
        .filter(Boolean);
    const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
    if (!entries.length) {
        const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
        return {
            schema: "ccm-group-typed-memory-pressure-recall-usage-record-v1",
            groupId,
            file,
            skipped: true,
            reason: "no_pressure_recall_usage_rows",
            recorded_count: 0,
            totals: ledger.totals || {},
        };
    }
    const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
    const seen = new Set((ledger.entries || []).map((entry) => entry.entry_id));
    const newEntries = entries.filter((entry) => !seen.has(entry.entry_id));
    const stats = ledger.stats || {};
    for (const entry of newEntries) {
        const key = workerContextPressureRecallStatsKey(entry, entry.target_project);
        const current = stats[key] || {
            rel_path: entry.rel_path,
            name: entry.name,
            type: entry.type,
            source: entry.source,
            target_project: entry.target_project,
            kinds: entry.kinds || [],
            used_count: 0,
            ignored_count: 0,
            verified_count: 0,
            mentioned_count: 0,
            total_count: 0,
            agents: [],
            task_ids: [],
            packet_ids: [],
            provenance_statuses: [],
            repair_work_item_ids: [],
            repair_statuses: [],
            repair_gap_types: [],
            first_seen_at: entry.generated_at,
        };
        current.rel_path = current.rel_path || entry.rel_path;
        current.name = current.name || entry.name;
        current.type = current.type || entry.type;
        current.source = current.source || entry.source;
        current.target_project = current.target_project || entry.target_project;
        current.kinds = uniqueStrings([...(Array.isArray(current.kinds) ? current.kinds : []), ...(entry.kinds || [])], 12);
        current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
        current.total_count = Number(current.total_count || 0) + 1;
        current.last_usage_state = entry.usage_state;
        current.last_agent = entry.agent;
        current.last_task_id = entry.task_id;
        current.last_worker_context_packet_id = entry.worker_context_packet_id;
        current.last_pressure_status = entry.pressure_status || current.last_pressure_status || "";
        current.last_provenance_status = entry.provenance_status || current.last_provenance_status || "";
        current.last_repair_status = entry.repair_status || current.last_repair_status || "";
        current.last_repair_work_item_id = entry.repair_work_item_id || current.last_repair_work_item_id || "";
        current.last_repair_gap_type = entry.repair_gap_type || current.last_repair_gap_type || "";
        current.current_source_verified_count = Number(current.current_source_verified_count || 0) + (entry.current_source_verified === true ? 1 : 0);
        current.last_seen_at = entry.generated_at;
        current.agents = uniqueStrings([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean), 12);
        current.task_ids = uniqueStrings([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean), 12);
        current.packet_ids = uniqueStrings([...(Array.isArray(current.packet_ids) ? current.packet_ids : []), entry.worker_context_packet_id].filter(Boolean), 12);
        current.provenance_statuses = uniqueStrings([...(Array.isArray(current.provenance_statuses) ? current.provenance_statuses : []), entry.provenance_status].filter(Boolean), 12);
        current.repair_work_item_ids = uniqueStrings([...(Array.isArray(current.repair_work_item_ids) ? current.repair_work_item_ids : []), entry.repair_work_item_id].filter(Boolean), 12);
        current.repair_statuses = uniqueStrings([...(Array.isArray(current.repair_statuses) ? current.repair_statuses : []), entry.repair_status].filter(Boolean), 12);
        current.repair_gap_types = uniqueStrings([...(Array.isArray(current.repair_gap_types) ? current.repair_gap_types : []), entry.repair_gap_type].filter(Boolean), 12);
        current.recommendation = workerContextPressureRecallUsageRecommendation(current);
        stats[key] = current;
    }
    const allEntries = [...(ledger.entries || []), ...newEntries].slice(-260);
    const totals = allEntries.reduce((acc, entry) => {
        const state = normalizeWorkerContextPressureRecallUsageState(entry.usage_state);
        if (state)
            acc[state] = Number(acc[state] || 0) + 1;
        acc.total += 1;
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    const updatedAt = String(input.generatedAt || input.generated_at || now());
    writeGroupTypedMemoryPressureRecallUsageLedger(groupId, {
        stats,
        entries: allEntries,
        totals,
        updatedAt,
    });
    return {
        schema: "ccm-group-typed-memory-pressure-recall-usage-record-v1",
        groupId,
        file,
        recorded_count: newEntries.length,
        duplicate_count: entries.length - newEntries.length,
        totals,
        updatedAt,
    };
}
function getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER);
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageState(value) {
    const state = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["used", "applied", "consumed"].includes(state))
        return "used";
    if (["verified", "checked", "reverified"].includes(state))
        return "verified";
    if (["ignored", "not_used", "skipped"].includes(state))
        return "ignored";
    if (["mentioned", "missing", "unclassified"].includes(state))
        return "mentioned";
    return "";
}
const POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS = new Set([
    "agent", "child", "closure", "compact", "completion", "corrected", "current", "feedback", "memory",
    "outcome", "post", "preservation", "receipt", "repair", "review", "session", "source", "task", "typed",
    "verify", "verified", "worker", "context", "continue", "resume", "exact", "reverify", "usage",
]);
const POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS = new Set([
    "记忆", "压缩", "修复", "回执", "会话", "上下", "下文", "任务", "继续", "当前", "源码", "验证", "群聊", "智能", "召回",
]);
function normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(text, explicitKey = "") {
    const explicit = String(explicitKey || "").trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
    const source = compactText(text || "", 1200).toLowerCase();
    const asciiTokens = (source.match(/[a-z0-9_./:-]{3,}/g) || [])
        .flatMap((token) => token.split(/[./:_-]+/g))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3
        && token.length <= 48
        && !POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS.has(token)
        && !/^(phase)?\d+$/.test(token)
        && !/^[a-f0-9]{16,}$/.test(token));
    const chineseTokens = [];
    for (const run of source.match(/[\u3400-\u9fff]{2,}/g) || []) {
        for (let index = 0; index < run.length - 1 && chineseTokens.length < 32; index += 1) {
            const token = run.slice(index, index + 2);
            if (!POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS.has(token))
                chineseTokens.push(token);
        }
    }
    const tokens = uniqueStrings([...asciiTokens, ...chineseTokens], 40).sort();
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-task-family-v1",
        key: explicit || (tokens.length ? `task-family-${checksum(tokens, 18)}` : ""),
        tokens,
        source_available: !!source,
    };
}
function postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance(entry = {}, queryFamily = {}, options = {}) {
    const entryKey = String(entry.task_family_key || entry.taskFamilyKey || "").trim();
    const entryTokens = uniqueStrings(entry.task_family_tokens || entry.taskFamilyTokens || [], 40);
    const queryKey = String(queryFamily.key || "").trim();
    const queryTokens = uniqueStrings(queryFamily.tokens || [], 40);
    if (!queryKey && queryTokens.length === 0)
        return { score: 1, matched: true, reason: "no_task_family_filter" };
    if (entryKey && queryKey && entryKey === queryKey)
        return { score: 1, matched: true, reason: "exact_task_family" };
    if (entryTokens.length === 0)
        return { score: 1, matched: true, reason: "legacy_global_feedback" };
    if (queryTokens.length === 0)
        return { score: 1, matched: true, reason: "query_family_unavailable" };
    const querySet = new Set(queryTokens);
    const overlap = entryTokens.filter((token) => querySet.has(token));
    const score = roundPressureRecallUsageWeight(overlap.length / Math.max(1, Math.min(entryTokens.length, queryTokens.length)), 4);
    const threshold = Math.max(0.1, Math.min(1, Number(options.taskFamilyRelevanceThreshold
        ?? options.task_family_relevance_threshold
        ?? options.postCompactClosureTaskFamilyRelevanceThreshold
        ?? options.post_compact_closure_task_family_relevance_threshold
        ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD)));
    return {
        score,
        matched: score >= threshold,
        reason: score >= threshold ? "related_task_family" : "unrelated_task_family",
        overlap_tokens: overlap,
        threshold,
    };
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageAging(options = {}) {
    return normalizeWorkerContextPressureRecallUsageAging({
        ...options,
        usageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays
            ?? options.post_compact_closure_usage_half_life_days
            ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS,
        usageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays
            ?? options.post_compact_closure_usage_stale_after_days
            ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS,
        usageMinDecayWeight: options.postCompactClosureUsageMinDecayWeight
            ?? options.post_compact_closure_usage_min_decay_weight
            ?? 0,
    });
}
function postCompactCompletionMemoryPreservationClosureReceiptSourceReliability(entry = {}, options = {}) {
    const source = String(entry.receipt_source || entry.receiptSource || "").trim().toLowerCase();
    const configured = options.receiptSourceReliability || options.receipt_source_reliability || {};
    const configuredValue = configured && typeof configured === "object" ? configured[source] : undefined;
    const defaults = {
        corrected_repair_receipt: 1,
        timeline_binding: 0.95,
        assignment_binding: 0.9,
        "task.receipt": 0.9,
        "task.delivery_summary": 0.8,
        worker_context_packet_receipt: 0.8,
        "group_message.receipt": 0.75,
        "group_message.delivery_summary": 0.65,
        "timeline_binding.status": 0.55,
    };
    let reliability = Number.isFinite(Number(configuredValue)) ? Number(configuredValue) : defaults[source] ?? 0.65;
    const status = String(entry.receipt_status || entry.receiptStatus || "").trim().toLowerCase();
    if (status && !["done", "verified", "completed", "ok", "passed"].includes(status))
        reliability *= 0.75;
    return {
        source: source || "unknown",
        status,
        reliability: roundPressureRecallUsageWeight(Math.max(0.1, Math.min(1, reliability)), 4),
    };
}
function postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry = {}) {
    const taskSession = String(entry.task_agent_session_id || entry.taskAgentSessionId || "").trim();
    const nativeSession = String(entry.native_session_id || entry.nativeSessionId || "").trim();
    if (!taskSession && !nativeSession)
        return "";
    return `${taskSession || "missing-task"}|${nativeSession || "missing-native"}`;
}
function clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries = []) {
    const clusters = [];
    for (const entry of entries) {
        const sessionKey = postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry);
        const packetKey = String(entry.worker_context_packet_id || entry.workerContextPacketId || "").trim();
        const matchingIndexes = [];
        clusters.forEach((cluster, index) => {
            if (sessionKey && cluster.session_keys.has(sessionKey))
                matchingIndexes.push(index);
            else if (packetKey && cluster.packet_keys.has(packetKey))
                matchingIndexes.push(index);
        });
        if (!matchingIndexes.length) {
            clusters.push({
                entries: [entry],
                session_keys: new Set(sessionKey ? [sessionKey] : []),
                packet_keys: new Set(packetKey ? [packetKey] : []),
            });
            continue;
        }
        const targetIndex = matchingIndexes[0];
        const target = clusters[targetIndex];
        target.entries.push(entry);
        if (sessionKey)
            target.session_keys.add(sessionKey);
        if (packetKey)
            target.packet_keys.add(packetKey);
        for (const index of matchingIndexes.slice(1).sort((a, b) => b - a)) {
            const merged = clusters[index];
            target.entries.push(...merged.entries);
            for (const key of merged.session_keys)
                target.session_keys.add(key);
            for (const key of merged.packet_keys)
                target.packet_keys.add(key);
            clusters.splice(index, 1);
        }
    }
    return clusters.map((cluster, index) => {
        const ordered = [...cluster.entries].sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
        const representative = ordered[ordered.length - 1] || {};
        return {
            ...representative,
            evidence_cluster_id: `closure-evidence-${checksum([
                ...[...cluster.session_keys].sort(),
                ...[...cluster.packet_keys].sort(),
                representative.entry_id || index,
            ], 18)}`,
            correlated_entry_count: cluster.entries.length,
            correlated_duplicate_count: Math.max(0, cluster.entries.length - 1),
            evidence_session_keys: [...cluster.session_keys],
            evidence_packet_keys: [...cluster.packet_keys],
        };
    });
}
function scorePostCompactCompletionMemoryPreservationClosureEvidence(entries = [], options = {}) {
    const independentEntries = clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries).map((entry) => {
        const sourceReliability = postCompactCompletionMemoryPreservationClosureReceiptSourceReliability(entry, options);
        return {
            ...entry,
            receipt_source_reliability: sourceReliability,
            independent_effective_weight: roundPressureRecallUsageWeight(Number(entry.effective_weight || 0) * sourceReliability.reliability, 4),
        };
    });
    const independentSessionKeys = uniqueStrings(independentEntries.flatMap((entry) => entry.evidence_session_keys || []), 320);
    const independentPacketKeys = uniqueStrings(independentEntries.flatMap((entry) => entry.evidence_packet_keys || []), 320);
    const providers = uniqueStrings(independentEntries.map((entry) => String(entry.agent || "").trim().toLowerCase()).filter(Boolean), 64);
    const receiptSources = uniqueStrings(independentEntries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 32);
    const weightedEvidence = independentEntries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
    const baseConfidence = 1 - Math.exp(-weightedEvidence / 1.5);
    const sessionFactor = independentSessionKeys.length >= 2 ? 1 : independentSessionKeys.length === 1 ? 0.55 : 0.4;
    const providerFactor = providers.length >= 2 ? 1 : 0.9;
    const sourceFactor = receiptSources.length >= 2 ? 1 : 0.92;
    const confidence = roundPressureRecallUsageWeight(baseConfidence * sessionFactor * providerFactor * sourceFactor, 4);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-independent-evidence-v1",
        independentEntries,
        rawEntryCount: entries.length,
        independentEvidenceCount: independentEntries.length,
        correlatedDuplicateCount: Math.max(0, entries.length - independentEntries.length),
        independentSessionCount: independentSessionKeys.length,
        independentPacketCount: independentPacketKeys.length,
        distinctProviderCount: providers.length,
        distinctReceiptSourceCount: receiptSources.length,
        providers,
        receiptSources,
        weightedEvidence: roundPressureRecallUsageWeight(weightedEvidence, 4),
        averageSourceReliability: independentEntries.length
            ? roundPressureRecallUsageWeight(independentEntries.reduce((sum, entry) => sum + Number(entry.receipt_source_reliability?.reliability || 0), 0) / independentEntries.length, 4)
            : 0,
        confidence,
        confidenceThreshold: Math.max(0.1, Math.min(1, Number(options.evidenceConfidenceThreshold
            ?? options.evidence_confidence_threshold
            ?? options.postCompactClosureEvidenceConfidenceThreshold
            ?? options.post_compact_closure_evidence_confidence_threshold
            ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD))),
    };
}
function arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict(independentEntries = [], options = {}) {
    const compliant = independentEntries.filter((entry) => entry.compliant === true);
    const positiveEntries = compliant.filter((entry) => ["used", "verified"].includes(String(entry.usage_state || "")));
    const ignoredEntries = compliant.filter((entry) => entry.usage_state === "ignored");
    const summarizeBranch = (entries) => {
        const weight = entries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
        const sessions = uniqueStrings(entries.flatMap((entry) => entry.evidence_session_keys || []), 320);
        return {
            entry_count: entries.length,
            independent_session_count: sessions.length,
            independent_packet_count: uniqueStrings(entries.flatMap((entry) => entry.evidence_packet_keys || []), 320).length,
            weighted_evidence: roundPressureRecallUsageWeight(weight, 4),
            confidence: roundPressureRecallUsageWeight(1 - Math.exp(-weight / 1.5), 4),
            providers: uniqueStrings(entries.map((entry) => entry.agent).filter(Boolean), 32),
            receipt_sources: uniqueStrings(entries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 24),
            entry_ids: uniqueStrings(entries.map((entry) => entry.entry_id).filter(Boolean), 32),
            task_agent_session_ids: uniqueStrings(entries.map((entry) => entry.task_agent_session_id).filter(Boolean), 32),
            native_session_ids: uniqueStrings(entries.map((entry) => entry.native_session_id).filter(Boolean), 32),
        };
    };
    const positive = summarizeBranch(positiveEntries);
    const ignored = summarizeBranch(ignoredEntries);
    const maxWeight = Math.max(positive.weighted_evidence, ignored.weighted_evidence);
    const minWeight = Math.min(positive.weighted_evidence, ignored.weighted_evidence);
    const conflictRatio = maxWeight > 0 ? roundPressureRecallUsageWeight(minWeight / maxWeight, 4) : 0;
    const minBranchWeight = Math.max(0.1, Number(options.conflictMinBranchWeight
        ?? options.conflict_min_branch_weight
        ?? options.postCompactClosureConflictMinBranchWeight
        ?? options.post_compact_closure_conflict_min_branch_weight
        ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT));
    const ratioThreshold = Math.max(0.05, Math.min(1, Number(options.conflictRatioThreshold
        ?? options.conflict_ratio_threshold
        ?? options.postCompactClosureConflictRatioThreshold
        ?? options.post_compact_closure_conflict_ratio_threshold
        ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD)));
    const active = positive.independent_session_count > 0
        && ignored.independent_session_count > 0
        && positive.weighted_evidence >= minBranchWeight
        && ignored.weighted_evidence >= minBranchWeight
        && conflictRatio >= ratioThreshold;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-v1",
        active,
        arbitration_state: active
            ? "contradictory_reverify_current_session"
            : positive.weighted_evidence > ignored.weighted_evidence
                ? "consistent_used_or_verified"
                : ignored.weighted_evidence > positive.weighted_evidence
                    ? "consistent_ignored"
                    : "insufficient_evidence",
        ranking_action: active ? "neutralize_historical_promotion_and_suppression" : "use_confidence_gated_recommendation",
        current_session_verification_required: active,
        historical_majority_authorization_allowed: false,
        conflict_ratio: conflictRatio,
        conflict_confidence: active ? roundPressureRecallUsageWeight(Math.min(positive.confidence, ignored.confidence) * conflictRatio, 4) : 0,
        min_branch_weight: minBranchWeight,
        ratio_threshold: ratioThreshold,
        positive,
        ignored,
    };
}
function postCompactCompletionMemoryPreservationClosureUsageRecommendation(stats = {}, options = {}) {
    const ignoredThreshold = Math.max(1, Number(options.weightedIgnoredThreshold || options.weighted_ignored_threshold || 1.5));
    const used = Number(stats.weighted_used_count ?? stats.used_count ?? 0);
    const verified = Number(stats.weighted_verified_count ?? stats.verified_count ?? 0);
    const ignored = Number(stats.weighted_ignored_count ?? stats.ignored_count ?? 0);
    const stale = Number(stats.stale_count || 0);
    if (stats.active_receipt_repair_required === true)
        return "require_receipt_repair_before_reuse";
    if (stats.conflict_resolution_active === true) {
        return ["used", "verified"].includes(String(stats.conflict_resolution_usage_state || ""))
            ? "resolved_conflict_promote_but_reverify_future_session"
            : "resolved_conflict_neutral_reverify_future_session";
    }
    if (stats.feedback_conflict_active === true)
        return "surface_conflict_reverify_current_session";
    const confidenceThreshold = Number(stats.evidence_confidence_threshold
        ?? options.evidenceConfidenceThreshold
        ?? options.evidence_confidence_threshold
        ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD);
    const ignoredEvidenceConfident = Number(stats.independent_session_count || 0) >= 2
        && Number(stats.evidence_confidence || 0) >= confidenceThreshold;
    if (ignored >= ignoredThreshold && ignored > used + verified && ignoredEvidenceConfident)
        return "deprioritize_closure_recall";
    if (["used", "verified"].includes(String(stats.last_usage_state || ""))
        && stats.last_current_source_verified === true
        && stats.last_feedback_fresh !== false)
        return "promote_but_reverify_current_source";
    if (used + verified > ignored && stale === 0)
        return "promote_but_reverify_current_source";
    if (stale > 0)
        return "caution_stale_history_reverify_current_source";
    return "neutral_reverify_current_source";
}
function readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile(groupId);
    const parsed = readJson(file, null);
    if (parsed?.schema === "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1") {
        return {
            ...parsed,
            file,
            entries: Array.isArray(parsed.entries) ? parsed.entries : [],
            stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
            totals: parsed.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1",
        version: 1,
        groupId,
        file,
        entries: [],
        stats: {},
        totals: { used: 0, verified: 0, ignored: 0, mentioned: 0, stale: 0, compliant: 0, noncompliant: 0, total: 0 },
        updatedAt: "",
    };
}
function recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, input = {}) {
    groupId = String(groupId || "").trim();
    const closureRelPath = "post-compact-completion-memory-preservation-repair-closures.md";
    if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true)
        return null;
    const generatedAt = String(input.generatedAt || input.generated_at || now());
    const rows = (Array.isArray(input.rows) ? input.rows : [])
        .map((raw) => {
        const relPath = String(raw.rel_path || raw.relPath || "").trim();
        const usageState = normalizePostCompactCompletionMemoryPreservationClosureUsageState(raw.usage_state || raw.usageState);
        if (relPath !== closureRelPath || !usageState)
            return null;
        const currentSourceVerified = raw.current_source_verified === true || raw.currentSourceVerified === true;
        const reason = compactText(raw.reason || "", 500);
        const semanticCompliance = usageState === "ignored" ? !!reason : ["used", "verified"].includes(usageState) && currentSourceVerified;
        const compliant = typeof raw.compliant === "boolean" ? raw.compliant : semanticCompliance;
        const taskText = compactText(raw.task_text || raw.taskText || raw.task || input.taskText || input.task_text || input.task || "", 900);
        const taskFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(taskText, raw.task_family_key || raw.taskFamilyKey || input.taskFamilyKey || input.task_family_key);
        const conflictResolutionRequested = raw.conflict_resolution === true || raw.conflictResolution === true;
        const conflictResolution = conflictResolutionRequested
            && compliant
            && !!String(raw.task_agent_session_id || raw.taskAgentSessionId || input.taskAgentSessionId || input.task_agent_session_id || "").trim()
            && !!String(raw.native_session_id || raw.nativeSessionId || input.nativeSessionId || input.native_session_id || "").trim();
        const entryCore = {
            group_id: groupId,
            target_project: String(raw.target_project || raw.targetProject || input.targetProject || input.target_project || "").trim(),
            agent: String(raw.agent || raw.agent_type || raw.agentType || input.agent || input.agentType || input.agent_type || "").trim(),
            task_id: String(raw.task_id || raw.taskId || input.taskId || input.task_id || "").trim(),
            task_text: taskText,
            task_family_key: taskFamily.key,
            task_family_tokens: taskFamily.tokens,
            execution_id: String(raw.execution_id || raw.executionId || input.executionId || input.execution_id || "").trim(),
            worker_context_packet_id: String(raw.worker_context_packet_id || raw.workerContextPacketId || input.workerContextPacketId || input.worker_context_packet_id || "").trim(),
            binding_id: String(raw.binding_id || raw.bindingId || input.bindingId || input.binding_id || "").trim(),
            task_agent_session_id: String(raw.task_agent_session_id || raw.taskAgentSessionId || input.taskAgentSessionId || input.task_agent_session_id || "").trim(),
            native_session_id: String(raw.native_session_id || raw.nativeSessionId || input.nativeSessionId || input.native_session_id || "").trim(),
            receipt_source: String(raw.receipt_source || raw.receiptSource || input.receiptSource || input.receipt_source || "").trim(),
            receipt_status: String(raw.receipt_status || raw.receiptStatus || input.receiptStatus || input.receipt_status || "").trim(),
            rel_path: relPath,
            usage_state: usageState,
            current_source_verified: currentSourceVerified,
            compliant,
            stale: ["used", "verified"].includes(usageState) && !currentSourceVerified,
            reason,
            repair_work_item_id: String(raw.repair_work_item_id || raw.repairWorkItemId || "").trim(),
            conflict_resolution: conflictResolution,
            conflict_resolution_state: conflictResolution ? usageState : "",
            conflict_parent_arbitration_state: String(raw.conflict_parent_arbitration_state || raw.conflictParentArbitrationState || "").trim(),
            conflict_parent_fingerprint: String(raw.conflict_parent_fingerprint || raw.conflictParentFingerprint || "").trim(),
            conflict_parent_ratio: Number(raw.conflict_parent_ratio || raw.conflictParentRatio || 0),
            conflict_parent_positive_weight: Number(raw.conflict_parent_positive_weight || raw.conflictParentPositiveWeight || 0),
            conflict_parent_ignored_weight: Number(raw.conflict_parent_ignored_weight || raw.conflictParentIgnoredWeight || 0),
            conflict_resolution_reversible: conflictResolution,
            generated_at: generatedAt,
        };
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-usage-entry-v1",
            entry_id: `pccmpu_${checksum([
                entryCore.group_id,
                entryCore.target_project,
                entryCore.task_id,
                entryCore.task_family_key,
                entryCore.execution_id,
                entryCore.worker_context_packet_id,
                entryCore.binding_id,
                entryCore.task_agent_session_id,
                entryCore.native_session_id,
                entryCore.rel_path,
                entryCore.usage_state,
                entryCore.current_source_verified,
                entryCore.compliant,
                entryCore.reason,
                entryCore.repair_work_item_id,
                entryCore.conflict_resolution,
                entryCore.conflict_parent_fingerprint,
            ], 20)}`,
            ...entryCore,
        };
    })
        .filter(Boolean);
    const ledger = readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId);
    if (!rows.length)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-usage-record-v1",
            groupId,
            file: ledger.file,
            skipped: true,
            reason: "no_closure_usage_rows",
            recordedCount: 0,
            totals: ledger.totals || {},
        };
    const existingIds = new Set((ledger.entries || []).map((entry) => entry.entry_id));
    const newEntries = rows.filter((entry) => !existingIds.has(entry.entry_id));
    const stats = { ...(ledger.stats || {}) };
    for (const entry of newEntries) {
        const key = `${String(entry.target_project || "").toLowerCase()}|${entry.rel_path}`;
        const current = stats[key] || {
            target_project: entry.target_project,
            rel_path: entry.rel_path,
            used_count: 0,
            verified_count: 0,
            ignored_count: 0,
            mentioned_count: 0,
            stale_count: 0,
            compliant_count: 0,
            noncompliant_count: 0,
            total_count: 0,
            task_agent_session_ids: [],
            native_session_ids: [],
            packet_ids: [],
            first_seen_at: entry.generated_at,
        };
        current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
        current.stale_count = Number(current.stale_count || 0) + (entry.stale ? 1 : 0);
        current[entry.compliant ? "compliant_count" : "noncompliant_count"] = Number(current[entry.compliant ? "compliant_count" : "noncompliant_count"] || 0) + 1;
        current.total_count = Number(current.total_count || 0) + 1;
        current.last_usage_state = entry.usage_state;
        current.last_compliant = entry.compliant === true;
        current.active_receipt_repair_required = entry.compliant !== true;
        current.last_current_source_verified = entry.current_source_verified === true;
        current.last_reason = entry.reason;
        current.last_repair_work_item_id = entry.repair_work_item_id;
        current.last_seen_at = entry.generated_at;
        current.task_agent_session_ids = uniqueStrings([...(current.task_agent_session_ids || []), entry.task_agent_session_id].filter(Boolean), 24);
        current.native_session_ids = uniqueStrings([...(current.native_session_ids || []), entry.native_session_id].filter(Boolean), 24);
        current.packet_ids = uniqueStrings([...(current.packet_ids || []), entry.worker_context_packet_id].filter(Boolean), 24);
        current.recommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation(current, input);
        stats[key] = current;
    }
    const entries = [...(ledger.entries || []), ...newEntries].slice(-320);
    const totals = entries.reduce((acc, entry) => {
        acc[entry.usage_state] = Number(acc[entry.usage_state] || 0) + 1;
        acc.stale += entry.stale ? 1 : 0;
        acc[entry.compliant ? "compliant" : "noncompliant"] += 1;
        acc.total += 1;
        return acc;
    }, { used: 0, verified: 0, ignored: 0, mentioned: 0, stale: 0, compliant: 0, noncompliant: 0, total: 0 });
    writeJsonAtomic(ledger.file, {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1",
        version: 1,
        groupId,
        entries,
        stats,
        totals,
        updatedAt: generatedAt,
    });
    const conflictResolutionRows = rows.filter((entry) => entry.conflict_resolution === true);
    let conflictResolutionDistillation = null;
    if (conflictResolutionRows.length) {
        try {
            conflictResolutionDistillation = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, {
                rows: conflictResolutionRows,
            }, {
                reason: "closure-feedback-conflict-current-session-resolution",
                updatedAt: generatedAt,
            });
        }
        catch (error) {
            conflictResolutionDistillation = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-error-v1",
                error: compactText(error?.message || error || "conflict resolution distillation failed", 500),
            };
        }
    }
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-record-v1",
        groupId,
        file: ledger.file,
        recordedCount: newEntries.length,
        duplicateCount: rows.length - newEntries.length,
        totals,
        conflictResolutionDistillation,
        updatedAt: generatedAt,
    };
}
function buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, options = {}) {
    const ledger = readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const closureRelPath = "post-compact-completion-memory-preservation-repair-closures.md";
    const taskText = compactText(options.task || options.taskText || options.task_text || options.taskQuery || options.task_query || "", 1200);
    const queryFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(taskText, options.taskFamilyKey || options.task_family_key);
    const aging = normalizePostCompactCompletionMemoryPreservationClosureUsageAging(options);
    const sourceEntries = (Array.isArray(ledger.entries) ? ledger.entries : []).filter((entry) => {
        const projectMatches = !targetProject || !entry.target_project || String(entry.target_project).toLowerCase() === targetProject;
        return projectMatches && entry.rel_path === closureRelPath;
    });
    const scoredEntries = sourceEntries.map((entry) => {
        const relevance = postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance(entry, queryFamily, options);
        const ageDays = workerContextPressureRecallUsageAgeDays(entry, aging);
        const decayWeight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
        const relevanceWeight = relevance.matched ? Math.max(0.75, Number(relevance.score || 0)) : 0;
        return {
            ...entry,
            task_family_relevance: relevance,
            age_days: roundPressureRecallUsageWeight(ageDays, 3),
            decay_weight: decayWeight,
            effective_weight: roundPressureRecallUsageWeight(decayWeight * relevanceWeight, 4),
        };
    });
    const relevantEntries = scoredEntries.filter((entry) => entry.task_family_relevance?.matched === true);
    const evidence = scorePostCompactCompletionMemoryPreservationClosureEvidence(relevantEntries, options);
    const independentEntries = evidence.independentEntries || [];
    const conflict = arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict(independentEntries, options);
    const resolutionEntries = independentEntries.filter((entry) => entry.conflict_resolution === true && entry.compliant === true);
    const latestResolution = [...resolutionEntries].sort((a, b) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
    const resolutionState = String(latestResolution?.conflict_resolution_state || latestResolution?.usage_state || "");
    const resolutionAt = String(latestResolution?.generated_at || "");
    const laterOpposingEntries = latestResolution ? independentEntries.filter((entry) => {
        if (String(entry.generated_at || "").localeCompare(resolutionAt) <= 0 || entry.compliant !== true)
            return false;
        const state = String(entry.usage_state || "");
        return ["used", "verified"].includes(resolutionState) ? state === "ignored" : ["used", "verified"].includes(state);
    }) : [];
    const laterOpposingWeight = laterOpposingEntries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
    const resolutionReopened = !!latestResolution && laterOpposingWeight >= Number(conflict.min_branch_weight || exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT);
    const resolutionActive = !!latestResolution && !resolutionReopened;
    const conflictResolution = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-resolution-v1",
        active: resolutionActive,
        reopened: resolutionReopened,
        state: latestResolution
            ? resolutionReopened
                ? "reopened_by_later_reliable_opposition"
                : ["used", "verified"].includes(resolutionState)
                    ? "resolved_used_or_verified_reverify_future_session"
                    : "resolved_ignored_reverify_future_session"
            : "unresolved",
        resolution_entry_id: latestResolution?.entry_id || "",
        resolution_usage_state: resolutionState,
        task_agent_session_id: latestResolution?.task_agent_session_id || "",
        native_session_id: latestResolution?.native_session_id || "",
        worker_context_packet_id: latestResolution?.worker_context_packet_id || "",
        current_source_verified: latestResolution?.current_source_verified === true,
        reason: latestResolution?.reason || "",
        parent_conflict_fingerprint: latestResolution?.conflict_parent_fingerprint || "",
        resolved_at: resolutionAt,
        later_opposing_entry_ids: uniqueStrings(laterOpposingEntries.map((entry) => entry.entry_id), 32),
        later_opposing_weight: roundPressureRecallUsageWeight(laterOpposingWeight, 4),
        reversible: true,
        historical_branches_preserved: true,
        historical_majority_authorization_allowed: false,
    };
    const effectiveConflict = {
        ...conflict,
        active: resolutionReopened ? true : conflict.active === true && !resolutionActive,
        historical_conflict_detected: conflict.active === true,
        resolution: conflictResolution,
        arbitration_state: resolutionActive ? conflictResolution.state : resolutionReopened ? "contradictory_reverify_current_session" : conflict.arbitration_state,
        current_session_verification_required: resolutionReopened ? true : conflict.active === true && !resolutionActive,
    };
    const latest = [...independentEntries].sort((a, b) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
    const primary = independentEntries.reduce((acc, entry) => {
        const state = normalizePostCompactCompletionMemoryPreservationClosureUsageState(entry.usage_state);
        if (!state)
            return acc;
        acc[`${state}_count`] = Number(acc[`${state}_count`] || 0) + 1;
        acc[`weighted_${state}_count`] = Number(acc[`weighted_${state}_count`] || 0) + Number(entry.independent_effective_weight || 0);
        acc.total_count = Number(acc.total_count || 0) + 1;
        acc.weighted_total_count = Number(acc.weighted_total_count || 0) + Number(entry.independent_effective_weight || 0);
        acc.stale_count = Number(acc.stale_count || 0) + (Number(entry.age_days || 0) >= Number(aging.stale_after_days || 45) ? 1 : 0);
        acc.fresh_count = Number(acc.fresh_count || 0) + (Number(entry.age_days || 0) < Number(aging.stale_after_days || 45) ? 1 : 0);
        acc[entry.compliant === true ? "compliant_count" : "noncompliant_count"] = Number(acc[entry.compliant === true ? "compliant_count" : "noncompliant_count"] || 0) + 1;
        acc.task_family_keys = uniqueStrings([...(acc.task_family_keys || []), entry.task_family_key].filter(Boolean), 24);
        return acc;
    }, {
        target_project: String(options.targetProject || options.target_project || ""),
        rel_path: closureRelPath,
        used_count: 0,
        verified_count: 0,
        ignored_count: 0,
        mentioned_count: 0,
        weighted_used_count: 0,
        weighted_verified_count: 0,
        weighted_ignored_count: 0,
        weighted_mentioned_count: 0,
        total_count: 0,
        weighted_total_count: 0,
        stale_count: 0,
        fresh_count: 0,
        compliant_count: 0,
        noncompliant_count: 0,
        task_family_keys: [],
    });
    for (const state of ["used", "verified", "ignored", "mentioned"]) {
        primary[`weighted_${state}_count`] = roundPressureRecallUsageWeight(primary[`weighted_${state}_count`] || 0, 4);
    }
    primary.weighted_total_count = roundPressureRecallUsageWeight(primary.weighted_total_count || 0, 4);
    primary.last_usage_state = latest?.usage_state || "";
    primary.last_compliant = latest ? latest.compliant === true : null;
    primary.last_current_source_verified = latest?.current_source_verified === true;
    primary.last_feedback_age_days = Number(latest?.age_days || 0);
    primary.last_feedback_fresh = !!latest && Number(latest.age_days || 0) < Number(aging.stale_after_days || 45);
    primary.active_receipt_repair_required = !!latest && latest.compliant !== true && primary.last_feedback_fresh;
    primary.evidence_confidence = evidence.confidence;
    primary.evidence_confidence_threshold = evidence.confidenceThreshold;
    primary.independent_evidence_count = evidence.independentEvidenceCount;
    primary.independent_session_count = evidence.independentSessionCount;
    primary.independent_packet_count = evidence.independentPacketCount;
    primary.correlated_duplicate_count = evidence.correlatedDuplicateCount;
    primary.distinct_provider_count = evidence.distinctProviderCount;
    primary.distinct_receipt_source_count = evidence.distinctReceiptSourceCount;
    primary.feedback_conflict_active = effectiveConflict.active === true;
    primary.feedback_conflict_ratio = effectiveConflict.conflict_ratio;
    primary.conflict_resolution_active = conflictResolution.active === true;
    primary.conflict_resolution_usage_state = conflictResolution.resolution_usage_state;
    primary.recommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation(primary, options);
    const rows = primary.total_count > 0 ? [primary] : [];
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-summary-v1",
        version: 2,
        groupId,
        targetProject: String(options.targetProject || options.target_project || ""),
        file: ledger.file,
        entryCount: sourceEntries.length,
        rawMatchedEntryCount: relevantEntries.length,
        matchedEntryCount: independentEntries.length,
        unrelatedEntryCount: scoredEntries.length - relevantEntries.length,
        correlatedDuplicateCount: evidence.correlatedDuplicateCount,
        rowCount: rows.length,
        recommendation: primary.recommendation || "neutral_reverify_current_source",
        activeReceiptRepairRequired: primary.active_receipt_repair_required === true,
        usedCount: Number(primary.used_count || 0),
        verifiedCount: Number(primary.verified_count || 0),
        ignoredCount: Number(primary.ignored_count || 0),
        staleCount: Number(primary.stale_count || 0),
        compliantCount: Number(primary.compliant_count || 0),
        noncompliantCount: Number(primary.noncompliant_count || 0),
        weightedUsedCount: Number(primary.weighted_used_count || 0),
        weightedVerifiedCount: Number(primary.weighted_verified_count || 0),
        weightedIgnoredCount: Number(primary.weighted_ignored_count || 0),
        weightedTotalCount: Number(primary.weighted_total_count || 0),
        evidenceConfidence: Number(evidence.confidence || 0),
        evidenceConfidenceThreshold: Number(evidence.confidenceThreshold || 0),
        independentEvidenceCount: Number(evidence.independentEvidenceCount || 0),
        independentSessionCount: Number(evidence.independentSessionCount || 0),
        independentPacketCount: Number(evidence.independentPacketCount || 0),
        distinctProviderCount: Number(evidence.distinctProviderCount || 0),
        distinctReceiptSourceCount: Number(evidence.distinctReceiptSourceCount || 0),
        averageSourceReliability: Number(evidence.averageSourceReliability || 0),
        evidenceProviders: evidence.providers || [],
        evidenceReceiptSources: evidence.receiptSources || [],
        feedbackConflict: effectiveConflict,
        historicalFeedbackConflict: conflict,
        feedbackConflictResolution: conflictResolution,
        feedbackConflictActive: effectiveConflict.active === true,
        feedbackArbitrationState: effectiveConflict.arbitration_state,
        currentSessionConflictVerificationRequired: effectiveConflict.current_session_verification_required === true,
        historicalMajorityAuthorizationAllowed: false,
        taskFamily: queryFamily,
        taskFamilyRelevant: relevantEntries.length > 0,
        taskFamilyRelevanceThreshold: Number(options.taskFamilyRelevanceThreshold
            ?? options.task_family_relevance_threshold
            ?? exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD),
        aging,
        feedbackEntries: independentEntries.slice(-24),
        rawFeedbackEntries: scoredEntries.slice(-24),
        rows,
        immutableClosureHistoryPreserved: true,
        updatedAt: ledger.updatedAt || "",
    };
}
function normalizeWorkerContextPressureRecallUsageStatsRow(row = {}, aging = {}) {
    const clone = { ...row };
    const ageDays = workerContextPressureRecallUsageAgeDays({
        last_seen_at: clone.last_seen_at || clone.lastSeenAt || clone.generated_at || clone.generatedAt,
    }, aging);
    const weight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
    for (const state of ["used", "verified", "ignored", "mentioned"]) {
        const raw = Number(clone[`${state}_count`] || 0);
        clone[`weighted_${state}_count`] = roundPressureRecallUsageWeight(raw * weight);
    }
    clone.weighted_total_count = roundPressureRecallUsageWeight(Number(clone.total_count || 0) * weight);
    clone.decay_weight = weight;
    clone.age_days = roundPressureRecallUsageWeight(ageDays, 2);
    clone.stale_count = ageDays >= Number(aging.stale_after_days || exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS) ? Number(clone.total_count || 0) : 0;
    clone.fresh_count = Number(clone.total_count || 0) - Number(clone.stale_count || 0);
    clone.recommendation = workerContextPressureRecallUsageRecommendation(clone);
    return clone;
}
function buildWorkerContextPressureRecallUsageStatsRowsFromEntries(entries = [], aging = {}) {
    const stats = {};
    for (const entry of Array.isArray(entries) ? entries : []) {
        const usageState = normalizeWorkerContextPressureRecallUsageState(entry?.usage_state || entry?.usageState);
        if (!usageState)
            continue;
        const key = workerContextPressureRecallStatsKey(entry, entry?.target_project || entry?.targetProject);
        const current = stats[key] || {
            rel_path: entry.rel_path || entry.relPath || "",
            name: entry.name || "",
            type: entry.type || "",
            source: entry.source || "",
            target_project: entry.target_project || entry.targetProject || "",
            kinds: [],
            used_count: 0,
            ignored_count: 0,
            verified_count: 0,
            mentioned_count: 0,
            weighted_used_count: 0,
            weighted_ignored_count: 0,
            weighted_verified_count: 0,
            weighted_mentioned_count: 0,
            total_count: 0,
            weighted_total_count: 0,
            stale_count: 0,
            fresh_count: 0,
            agents: [],
            task_ids: [],
            packet_ids: [],
            group_ids: [],
            provenance_statuses: [],
            repair_work_item_ids: [],
            repair_statuses: [],
            repair_gap_types: [],
            first_seen_at: entry.generated_at || entry.generatedAt || "",
            max_age_days: 0,
            min_age_days: null,
        };
        current.rel_path = current.rel_path || entry.rel_path || entry.relPath || "";
        current.name = current.name || entry.name || "";
        current.type = current.type || entry.type || "";
        current.source = current.source || entry.source || "";
        current.target_project = current.target_project || entry.target_project || entry.targetProject || "";
        current.kinds = uniqueStrings([...(Array.isArray(current.kinds) ? current.kinds : []), ...(Array.isArray(entry.kinds) ? entry.kinds : [])], 12);
        current[`${usageState}_count`] = Number(current[`${usageState}_count`] || 0) + 1;
        current.total_count = Number(current.total_count || 0) + 1;
        const ageDays = workerContextPressureRecallUsageAgeDays(entry, aging);
        const decayWeight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
        current[`weighted_${usageState}_count`] = Number(current[`weighted_${usageState}_count`] || 0) + decayWeight;
        current.weighted_total_count = Number(current.weighted_total_count || 0) + decayWeight;
        if (ageDays >= Number(aging.stale_after_days || exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS))
            current.stale_count = Number(current.stale_count || 0) + 1;
        else
            current.fresh_count = Number(current.fresh_count || 0) + 1;
        current.max_age_days = Math.max(Number(current.max_age_days || 0), ageDays);
        current.min_age_days = current.min_age_days === null ? ageDays : Math.min(Number(current.min_age_days || ageDays), ageDays);
        const generatedAt = entry.generated_at || entry.generatedAt || "";
        current.first_seen_at = current.first_seen_at && generatedAt
            ? String(current.first_seen_at).localeCompare(String(generatedAt)) <= 0 ? current.first_seen_at : generatedAt
            : current.first_seen_at || generatedAt;
        if (!current.last_seen_at || String(generatedAt || "").localeCompare(String(current.last_seen_at || "")) > 0) {
            current.last_seen_at = generatedAt;
            current.last_usage_state = usageState;
            current.last_agent = entry.agent || "";
            current.last_task_id = entry.task_id || entry.taskId || "";
            current.last_worker_context_packet_id = entry.worker_context_packet_id || entry.workerContextPacketId || "";
            current.last_pressure_status = entry.pressure_status || entry.pressureStatus || "";
            current.last_provenance_status = entry.provenance_status || entry.provenanceStatus || "";
            current.last_repair_status = entry.repair_status || entry.repairStatus || "";
            current.last_repair_work_item_id = entry.repair_work_item_id || entry.repairWorkItemId || "";
            current.last_repair_gap_type = entry.repair_gap_type || entry.repairGapType || "";
        }
        current.agents = uniqueStrings([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean), 12);
        current.task_ids = uniqueStrings([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id || entry.taskId].filter(Boolean), 12);
        current.packet_ids = uniqueStrings([...(Array.isArray(current.packet_ids) ? current.packet_ids : []), entry.worker_context_packet_id || entry.workerContextPacketId].filter(Boolean), 12);
        current.group_ids = uniqueStrings([...(Array.isArray(current.group_ids) ? current.group_ids : []), entry.group_id || entry.groupId].filter(Boolean), 24);
        current.provenance_statuses = uniqueStrings([...(Array.isArray(current.provenance_statuses) ? current.provenance_statuses : []), entry.provenance_status || entry.provenanceStatus].filter(Boolean), 12);
        current.repair_work_item_ids = uniqueStrings([...(Array.isArray(current.repair_work_item_ids) ? current.repair_work_item_ids : []), entry.repair_work_item_id || entry.repairWorkItemId].filter(Boolean), 12);
        current.repair_statuses = uniqueStrings([...(Array.isArray(current.repair_statuses) ? current.repair_statuses : []), entry.repair_status || entry.repairStatus].filter(Boolean), 12);
        current.repair_gap_types = uniqueStrings([...(Array.isArray(current.repair_gap_types) ? current.repair_gap_types : []), entry.repair_gap_type || entry.repairGapType].filter(Boolean), 12);
        current.current_source_verified_count = Number(current.current_source_verified_count || 0) + (entry.current_source_verified === true || entry.currentSourceVerified === true ? 1 : 0);
        stats[key] = current;
    }
    return Object.values(stats).map((row) => {
        for (const state of ["used", "verified", "ignored", "mentioned"]) {
            row[`weighted_${state}_count`] = roundPressureRecallUsageWeight(row[`weighted_${state}_count`] || 0);
        }
        row.weighted_total_count = roundPressureRecallUsageWeight(row.weighted_total_count || 0);
        row.max_age_days = roundPressureRecallUsageWeight(row.max_age_days || 0, 2);
        row.min_age_days = row.min_age_days === null ? 0 : roundPressureRecallUsageWeight(row.min_age_days || 0, 2);
        row.avg_decay_weight = row.total_count ? roundPressureRecallUsageWeight(Number(row.weighted_total_count || 0) / Number(row.total_count || 1), 4) : 0;
        row.recommendation = workerContextPressureRecallUsageRecommendation(row);
        return row;
    });
}
function summarizeWorkerContextPressureRecallUsageRows(statsRows = []) {
    const totals = statsRows.reduce((acc, row) => {
        acc.used += Number(row.used_count || 0);
        acc.ignored += Number(row.ignored_count || 0);
        acc.verified += Number(row.verified_count || 0);
        acc.mentioned += Number(row.mentioned_count || 0);
        acc.total += Number(row.total_count || 0);
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    const weightedTotals = statsRows.reduce((acc, row) => {
        acc.used += Number(row.weighted_used_count || 0);
        acc.ignored += Number(row.weighted_ignored_count || 0);
        acc.verified += Number(row.weighted_verified_count || 0);
        acc.mentioned += Number(row.weighted_mentioned_count || 0);
        acc.total += Number(row.weighted_total_count || 0);
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
    for (const key of Object.keys(weightedTotals))
        weightedTotals[key] = roundPressureRecallUsageWeight(weightedTotals[key]);
    return {
        totals,
        weightedTotals,
        stale_memory_count: statsRows.filter((row) => row.recommendation === "stale_pressure_recall_history" || Number(row.stale_count || 0) > 0 && Number(row.fresh_count || 0) === 0).length,
        stale_entry_count: statsRows.reduce((sum, row) => sum + Number(row.stale_count || 0), 0),
        fresh_entry_count: statsRows.reduce((sum, row) => sum + Number(row.fresh_count || 0), 0),
    };
}
function sortWorkerContextPressureRecallUsageRows(statsRows = []) {
    return [...(Array.isArray(statsRows) ? statsRows : [])].sort((a, b) => {
        const aScore = Number(a.weighted_used_count ?? a.used_count ?? 0) * 3
            + Number(a.weighted_verified_count ?? a.verified_count ?? 0) * 2
            - Number(a.weighted_ignored_count ?? a.ignored_count ?? 0)
            - Number(a.weighted_mentioned_count ?? a.mentioned_count ?? 0);
        const bScore = Number(b.weighted_used_count ?? b.used_count ?? 0) * 3
            + Number(b.weighted_verified_count ?? b.verified_count ?? 0) * 2
            - Number(b.weighted_ignored_count ?? b.ignored_count ?? 0)
            - Number(b.weighted_mentioned_count ?? b.mentioned_count ?? 0);
        return bScore - aScore || String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""));
    });
}
function filterWorkerContextPressureRecallUsageRows(statsRows = [], options = {}) {
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const docs = Array.isArray(options.docs || options.recalledDocs || options.recalled_docs) ? (options.docs || options.recalledDocs || options.recalled_docs) : [];
    const relPaths = new Set(docs.map((doc) => String(doc.relPath || doc.rel_path || "").trim().toLowerCase()).filter(Boolean));
    const names = new Set(docs.map((doc) => String(doc.name || "").trim().toLowerCase()).filter(Boolean));
    return sortWorkerContextPressureRecallUsageRows((Array.isArray(statsRows) ? statsRows : [])
        .filter((row) => !targetProject || String(row.target_project || "").toLowerCase() === targetProject)
        .filter((row) => !relPaths.size && !names.size
        || relPaths.has(String(row.rel_path || "").trim().toLowerCase())
        || names.has(String(row.name || "").trim().toLowerCase())));
}
function buildWorkerContextPressureRecallUsageSummaryFromRows(groupId, statsRows = [], options = {}) {
    const aging = options.aging?.schema ? options.aging : normalizeWorkerContextPressureRecallUsageAging(options);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const summaryStats = summarizeWorkerContextPressureRecallUsageRows(statsRows);
    return {
        schema: String(options.schema || "ccm-group-typed-memory-pressure-recall-usage-summary-v1"),
        version: 1,
        groupId,
        target_project: targetProject,
        ledger_file: String(options.ledgerFile || options.ledger_file || ""),
        has_history: statsRows.length > 0,
        memory_count: statsRows.length,
        totals: summaryStats.totals,
        weighted_totals: summaryStats.weightedTotals,
        aging: {
            ...aging,
            stale_memory_count: summaryStats.stale_memory_count,
            stale_entry_count: summaryStats.stale_entry_count,
            fresh_entry_count: summaryStats.fresh_entry_count,
        },
        useful_pressure_memories: statsRows.filter((row) => ["promote_pressure_recall", "neutral_verify_current_pressure"].includes(row.recommendation)).slice(0, 8),
        ignored_pressure_memories: statsRows.filter((row) => row.recommendation === "deprioritize_pressure_recall").slice(0, 8),
        missing_usage_pressure_memories: statsRows.filter((row) => row.recommendation === "require_pressure_usage_receipt").slice(0, 8),
        stale_pressure_memories: statsRows.filter((row) => row.recommendation === "stale_pressure_recall_history").slice(0, 8),
        rows: statsRows.slice(0, 16),
        recent_entries: Array.isArray(options.recentEntries || options.recent_entries) ? (options.recentEntries || options.recent_entries).slice(-16) : [],
        updatedAt: String(options.updatedAt || options.updated_at || ""),
    };
}
function buildGroupTypedMemoryPressureRecallUsageSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
    const aging = normalizeWorkerContextPressureRecallUsageAging(options);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const sourceRows = Array.isArray(ledger.entries) && ledger.entries.length
        ? buildWorkerContextPressureRecallUsageStatsRowsFromEntries(ledger.entries, aging)
        : Object.values(ledger.stats || {}).map((row) => normalizeWorkerContextPressureRecallUsageStatsRow(row, aging));
    const statsRows = filterWorkerContextPressureRecallUsageRows(sourceRows, options);
    return buildWorkerContextPressureRecallUsageSummaryFromRows(groupId, statsRows, {
        ...options,
        targetProject,
        aging,
        ledgerFile: ledger.file,
        recentEntries: (ledger.entries || [])
            .filter((entry) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
            .slice(-16),
        updatedAt: ledger.updatedAt || "",
    });
}
function listGroupTypedMemoryPressureRecallUsageLedgers(options = {}) {
    const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids)
        ? (options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const maxGroups = Math.max(1, Number(options.maxGroups || options.max_groups || options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups || exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS));
    const exclude = new Set((Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : [])
        .map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const candidates = explicitGroupIds.length
        ? explicitGroupIds.map((groupId) => ({
            groupId,
            file: getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId),
        }))
        : (() => {
            try {
                return fs.readdirSync(GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .map(entry => ({
                    groupId: entry.name,
                    file: path.join(GROUP_TYPED_MEMORY_DIR, entry.name, exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER),
                }));
            }
            catch {
                return [];
            }
        })();
    return candidates
        .filter((item) => item.file && fs.existsSync(item.file))
        .map((item) => {
        try {
            const stat = fs.statSync(item.file);
            return { ...item, mtimeMs: stat.mtimeMs || 0 };
        }
        catch {
            return { ...item, mtimeMs: 0 };
        }
    })
        .filter((item) => !exclude.has(String(item.groupId || "").toLowerCase()))
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
        .slice(0, maxGroups);
}
function buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, options = {}) {
    groupId = String(groupId || "").trim();
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const includeCurrent = options.includeCurrentGroup === true || options.include_current_group === true;
    const currentIds = new Set([groupId, safeSegment(groupId)].map(item => String(item || "").trim().toLowerCase()).filter(Boolean));
    const aging = normalizeWorkerContextPressureRecallUsageAging(options);
    const ledgers = listGroupTypedMemoryPressureRecallUsageLedgers({
        ...options,
        excludeGroupIds: includeCurrent ? options.excludeGroupIds || options.exclude_group_ids || [] : [
            ...(Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : []),
            ...Array.from(currentIds),
        ],
    });
    const entries = [];
    const sourceGroups = [];
    for (const item of ledgers) {
        try {
            const parsed = JSON.parse(fs.readFileSync(item.file, "utf-8"));
            const ledgerGroupId = String(parsed.groupId || parsed.group_id || item.groupId || "").trim();
            if (!includeCurrent && currentIds.has(ledgerGroupId.toLowerCase()))
                continue;
            const ledgerEntries = (Array.isArray(parsed.entries) ? parsed.entries : [])
                .filter((entry) => !targetProject || String(entry.target_project || entry.targetProject || "").trim().toLowerCase() === targetProject)
                .map((entry) => ({ ...entry, group_id: entry.group_id || entry.groupId || ledgerGroupId || item.groupId }));
            if (!ledgerEntries.length)
                continue;
            entries.push(...ledgerEntries);
            sourceGroups.push({
                groupId: ledgerGroupId || item.groupId,
                file: item.file,
                entry_count: ledgerEntries.length,
                updatedAt: parsed.updatedAt || parsed.updated_at || "",
            });
        }
        catch { }
    }
    const sourceRows = buildWorkerContextPressureRecallUsageStatsRowsFromEntries(entries, aging);
    const statsRows = filterWorkerContextPressureRecallUsageRows(sourceRows, options);
    const recentEntries = entries
        .sort((a, b) => String(b.generated_at || b.generatedAt || "").localeCompare(String(a.generated_at || a.generatedAt || "")))
        .slice(0, 16)
        .reverse();
    return {
        ...buildWorkerContextPressureRecallUsageSummaryFromRows(groupId, statsRows, {
            ...options,
            schema: "ccm-group-typed-memory-pressure-recall-usage-project-summary-v1",
            targetProject,
            aging,
            ledgerFile: "",
            recentEntries,
            updatedAt: sourceGroups.map((item) => item.updatedAt).filter(Boolean).sort().slice(-1)[0] || "",
        }),
        source: "cross_group_project_pressure_recall_usage",
        include_current_group: includeCurrent,
        source_group_count: sourceGroups.length,
        source_groups: sourceGroups.slice(0, 24),
        entry_count: entries.length,
    };
}
function normalizeWorkerContextPressureRecallUsageHints(groupId, options = {}) {
    const explicit = options.workerContextPressureRecallUsage
        || options.worker_context_pressure_recall_usage
        || options.pressureRecallUsage
        || options.pressure_recall_usage
        || null;
    const summary = explicit?.schema ? explicit : buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
        targetProject: options.targetProject || options.target_project,
        nowMs: options.nowMs || options.now_ms,
        now: options.now,
        generatedAt: options.generatedAt || options.generated_at,
        usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
        usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
        disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
    });
    const crossGroupDisabled = explicit?.schema
        || options.disableCrossGroupPressureRecallUsage === true
        || options.disable_cross_group_pressure_recall_usage === true
        || options.crossGroupPressureRecallUsage === false
        || options.cross_group_pressure_recall_usage === false;
    const crossGroupSummary = crossGroupDisabled ? null : buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, {
        targetProject: options.targetProject || options.target_project,
        nowMs: options.nowMs || options.now_ms,
        now: options.now,
        generatedAt: options.generatedAt || options.generated_at,
        usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
        usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
        disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
        groupIds: options.crossGroupPressureRecallUsageGroupIds
            || options.cross_group_pressure_recall_usage_group_ids
            || options.crossGroupIds
            || options.cross_group_ids,
        maxGroups: options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
    });
    const rowsFromSummary = (value, scope) => [
        ...(Array.isArray(value?.useful_pressure_memories || value?.usefulPressureMemories) ? (value.useful_pressure_memories || value.usefulPressureMemories) : []),
        ...(Array.isArray(value?.ignored_pressure_memories || value?.ignoredPressureMemories) ? (value.ignored_pressure_memories || value.ignoredPressureMemories) : []),
        ...(Array.isArray(value?.missing_usage_pressure_memories || value?.missingUsagePressureMemories) ? (value.missing_usage_pressure_memories || value.missingUsagePressureMemories) : []),
        ...(Array.isArray(value?.stale_pressure_memories || value?.stalePressureMemories) ? (value.stale_pressure_memories || value.stalePressureMemories) : []),
        ...(Array.isArray(value?.rows) ? value.rows : []),
    ].map((row) => ({
        ...row,
        hint_scope: row.hint_scope || scope,
        source_group_count: row.source_group_count || value?.source_group_count || 0,
        source_groups: row.source_groups || value?.source_groups || [],
    }));
    const localRows = rowsFromSummary(summary, "local_group");
    const localDocKeys = new Set(localRows.map((row) => `${String(row.rel_path || row.relPath || "").trim().toLowerCase()}|${String(row.name || "").trim().toLowerCase()}`));
    const crossRows = rowsFromSummary(crossGroupSummary, "cross_group_project")
        .filter((row) => !localDocKeys.has(`${String(row.rel_path || row.relPath || "").trim().toLowerCase()}|${String(row.name || "").trim().toLowerCase()}`));
    const rows = [...localRows, ...crossRows];
    const repairHints = normalizeWorkerContextPressureRecallUsageRepairHints(groupId, options);
    const seen = new Set();
    return rows.map((row) => {
        const targetProject = String(row.target_project || row.targetProject || summary?.target_project || summary?.targetProject || crossGroupSummary?.target_project || crossGroupSummary?.targetProject || options.targetProject || options.target_project || "").trim();
        const repairHint = matchWorkerContextPressureRecallUsageRepairHint(row, repairHints, targetProject);
        const normalized = {
            rel_path: String(row.rel_path || row.relPath || "").trim(),
            name: String(row.name || "").trim(),
            target_project: targetProject,
            hint_scope: String(row.hint_scope || row.hintScope || "").trim() || "local_group",
            source_group_count: Number(row.source_group_count || row.sourceGroupCount || 0),
            group_ids: uniqueStrings(Array.isArray(row.group_ids || row.groupIds) ? (row.group_ids || row.groupIds) : [], 24),
            recommendation: String(row.recommendation || "").trim() || workerContextPressureRecallUsageRecommendation(row),
            used_count: Number(row.used_count || row.usedCount || 0),
            verified_count: Number(row.verified_count || row.verifiedCount || 0),
            ignored_count: Number(row.ignored_count || row.ignoredCount || 0),
            mentioned_count: Number(row.mentioned_count || row.mentionedCount || 0),
            weighted_used_count: Number(row.weighted_used_count || row.used_weighted_count || row.weightedUsedCount || 0),
            weighted_verified_count: Number(row.weighted_verified_count || row.verified_weighted_count || row.weightedVerifiedCount || 0),
            weighted_ignored_count: Number(row.weighted_ignored_count || row.ignored_weighted_count || row.weightedIgnoredCount || 0),
            weighted_mentioned_count: Number(row.weighted_mentioned_count || row.mentioned_weighted_count || row.weightedMentionedCount || 0),
            weighted_total_count: Number(row.weighted_total_count || row.total_weighted_count || row.weightedTotalCount || 0),
            stale_count: Number(row.stale_count || row.staleCount || 0),
            fresh_count: Number(row.fresh_count || row.freshCount || 0),
            avg_decay_weight: Number(row.avg_decay_weight || row.avgDecayWeight || row.decay_weight || row.decayWeight || 0),
            max_age_days: Number(row.max_age_days || row.maxAgeDays || row.age_days || row.ageDays || 0),
            repair_status: repairHint?.status || "",
            repair_open: repairHint?.open === true,
            repair_work_item_id: repairHint?.work_item_id || "",
            repair_gap_type: repairHint?.gap_type || "",
            repair_priority: repairHint?.priority || "",
            repair_reason: repairHint?.reason || "",
            repair_local_recommendation: repairHint?.local_recommendation || "",
            repair_cross_group_recommendation: repairHint?.cross_group_recommendation || "",
            repair_source_group_count: Number(repairHint?.source_group_count || 0),
            provenance_status: repairHint?.open === true
                ? (repairHint?.gap_type === "recommendation_conflict" ? "disputed_under_repair" : "stale_evidence_under_repair")
                : String(row.hint_scope || row.hintScope || "").trim() === "cross_group_project"
                    ? "cross_group_project_assist"
                    : "local_group_evidence",
        };
        const key = `${normalized.rel_path.toLowerCase()}|${normalized.name.toLowerCase()}|${normalized.recommendation}|${normalized.hint_scope}`;
        if (!normalized.rel_path && !normalized.name || seen.has(key))
            return null;
        seen.add(key);
        return normalized;
    }).filter(Boolean);
}
function scoreWorkerContextPressureRecallUsageHint(doc, hints = [], signals = {}) {
    const matched = [];
    let adjustment = 0;
    if (signals.active !== true || !Array.isArray(hints) || !hints.length)
        return { adjustment, matched };
    const relPath = String(doc.relPath || doc.rel_path || "").trim().toLowerCase();
    const name = String(doc.name || "").trim().toLowerCase();
    for (const hint of hints) {
        const hintRelPath = String(hint.rel_path || hint.relPath || "").trim().toLowerCase();
        const hintName = String(hint.name || "").trim().toLowerCase();
        const matches = (!!hintRelPath && hintRelPath === relPath) || (!!hintName && hintName === name);
        if (!matches)
            continue;
        let delta = 0;
        const weightedUsed = Number(hint.weighted_used_count || hint.used_count || 0);
        const weightedVerified = Number(hint.weighted_verified_count || hint.verified_count || 0);
        const weightedIgnored = Number(hint.weighted_ignored_count || hint.ignored_count || 0);
        if (hint.recommendation === "promote_pressure_recall")
            delta = 5 + Math.min(5, Math.round(weightedUsed + weightedVerified));
        else if (hint.recommendation === "deprioritize_pressure_recall")
            delta = -7 - Math.min(5, Math.round(weightedIgnored));
        else if (hint.recommendation === "require_pressure_usage_receipt")
            delta = 1;
        else if (hint.recommendation === "stale_pressure_recall_history")
            delta = 0;
        else
            delta = 2;
        adjustment += delta;
        matched.push({
            rel_path: hint.rel_path,
            name: hint.name,
            target_project: hint.target_project || "",
            recommendation: hint.recommendation,
            delta,
            weighted_used_count: hint.weighted_used_count || 0,
            weighted_verified_count: hint.weighted_verified_count || 0,
            weighted_ignored_count: hint.weighted_ignored_count || 0,
            stale_count: hint.stale_count || 0,
            fresh_count: hint.fresh_count || 0,
            avg_decay_weight: hint.avg_decay_weight || 0,
            max_age_days: hint.max_age_days || 0,
            hint_scope: hint.hint_scope || "",
            source_group_count: hint.source_group_count || 0,
            group_ids: hint.group_ids || [],
            provenance_status: hint.provenance_status || "",
            repair_status: hint.repair_status || "",
            repair_open: hint.repair_open === true,
            repair_work_item_id: hint.repair_work_item_id || "",
            repair_gap_type: hint.repair_gap_type || "",
            repair_priority: hint.repair_priority || "",
            repair_reason: hint.repair_reason || "",
            repair_local_recommendation: hint.repair_local_recommendation || "",
            repair_cross_group_recommendation: hint.repair_cross_group_recommendation || "",
            repair_source_group_count: hint.repair_source_group_count || 0,
        });
    }
    return { adjustment, matched };
}
function normalizePressureProvenanceDispatchFeedbackPolicyForRecall(options = {}) {
    const candidate = options.pressureProvenanceDispatchFeedbackPolicy
        || options.pressure_provenance_dispatch_feedback_policy
        || options.pressureProvenancePreDispatchComplianceDispatchPolicy
        || options.pressure_provenance_pre_dispatch_compliance_dispatch_policy
        || null;
    if (!candidate || typeof candidate !== "object") {
        return {
            schema: "ccm-pressure-provenance-feedback-recall-risk-policy-v1",
            active: false,
            disabled: false,
            policyRows: [],
        };
    }
    const policyRows = Array.isArray(candidate.policyRows || candidate.policy_rows)
        ? (candidate.policyRows || candidate.policy_rows)
        : [];
    const disabled = candidate.disabled === true || candidate.disable === true;
    return {
        ...candidate,
        schema: candidate.schema || "ccm-pressure-provenance-feedback-recall-risk-policy-v1",
        active: candidate.active === true && !disabled,
        disabled,
        policyRows,
        targetProject: candidate.targetProject || candidate.target_project || "",
        agentType: candidate.agentType || candidate.agent_type || "unknown",
        severity: candidate.severity || "",
        action: candidate.action || "",
    };
}
function pressureProvenanceFeedbackRecallRepairQuery(text, queryTokens = []) {
    const haystack = `${text}\n${queryTokens.join("\n")}`.toLowerCase();
    return /memoryprovenanceusage|current_source_verified|currentsourceverified|repairworkitem|repair_work_item|provenance_status|disputed_under_repair|stale_evidence_under_repair|pressure provenance|provenance repair|repair provenance|压力.*来源|来源.*修复|来源核验|记忆.*回执|回执.*核验|回执.*修复/.test(haystack);
}
function pressureProvenanceFeedbackRecallUnderRepair(value = {}) {
    const provenance = String(value.provenance_status || value.provenanceStatus || "").trim().toLowerCase();
    return provenance === "disputed_under_repair"
        || provenance === "stale_evidence_under_repair"
        || !!String(value.repair_work_item_id || value.repairWorkItemId || value.work_item_id || value.workItemId || "").trim()
        || value.repair_open === true
        || value.repairOpen === true;
}
function scoreWorkerContextPressureFeedbackPolicyRecallRisk(doc, corpus, pressureUsage = {}, policy = {}, queryText = "", queryTokens = []) {
    const active = policy?.active === true && policy?.disabled !== true;
    const matched = Array.isArray(pressureUsage?.matched)
        ? pressureUsage.matched.filter((match) => pressureProvenanceFeedbackRecallUnderRepair(match))
        : [];
    const haystack = `${doc.relPath || ""}\n${doc.name || ""}\n${doc.description || ""}\n${corpus}`.toLowerCase();
    const textRisk = /disputed_under_repair|stale_evidence_under_repair|repair_open\s*[:=]\s*true/.test(haystack);
    const riskDoc = matched.length > 0 || pressureProvenanceFeedbackRecallUnderRepair(doc) || textRisk;
    if (!active || !riskDoc) {
        return {
            schema: "ccm-worker-context-pressure-provenance-feedback-recall-risk-v1",
            active,
            adjustment: 0,
            matched,
            risk_doc: riskDoc,
            repair_first: false,
            action: active ? "no_risk_detected" : "policy_inactive",
        };
    }
    const repairFirst = pressureProvenanceFeedbackRecallRepairQuery(queryText, queryTokens);
    const severity = String(policy.severity || "").toLowerCase();
    const delta = repairFirst ? 0 : severity === "high" ? -16 : -12;
    return {
        schema: "ccm-worker-context-pressure-provenance-feedback-recall-risk-v1",
        active: true,
        adjustment: delta,
        matched,
        risk_doc: true,
        text_risk: textRisk,
        repair_first: repairFirst,
        action: repairFirst ? "repair_first_preserve_risky_pressure_memory" : "deprioritize_risky_pressure_memory",
        reason: repairFirst
            ? "feedback policy active; task asks for provenance/repair work, so keep risky pressure memory visible but require repair-first current-source verification"
            : "feedback policy active for this agent/project; risky under-repair pressure memory is downranked unless the task explicitly asks for provenance repair",
        policy_action: policy.action || "",
        policy_severity: policy.severity || "",
        target_project: policy.targetProject || policy.target_project || "",
        agent_type: policy.agentType || policy.agent_type || "unknown",
    };
}
function truncateIndexContent(content) {
    let lines = content.split("\n").slice(0, exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES);
    let text = lines.join("\n");
    const maxBytes = exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES;
    while (Buffer.byteLength(text, "utf-8") > maxBytes && lines.length > 1) {
        lines = lines.slice(0, -1);
        text = lines.join("\n");
    }
    if (content !== text)
        text += "\n- [index truncated] More typed memories exist on disk.";
    return text;
}
function markdownLinkTitle(value) {
    return String(value || "").replace(/[\[\]\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled memory";
}
function renderMemoryDocument(input) {
    const type = normalizeMemoryType(input.type);
    const body = compactText(input.body || input.content || "", Number(input.maxBodyChars || 12_000));
    const meta = {
        name: markdownLinkTitle(input.name || input.title),
        description: compactText(input.description || body.split(/\n+/)[0] || "", 220),
        type,
        source: String(input.source || "manual"),
        paths: normalizePathGlobs(input.paths || input.pathGlobs || input.globs || []),
        group_id: String(input.groupId || input.group_id || ""),
        updated_at: String(input.updatedAt || input.updated_at || now()),
        checksum: checksum([type, input.name, input.description, body], 24),
    };
    return `${renderFrontmatter(meta)}\n\n${body}\n`;
}
function getGroupTypedMemoryDir(groupId) {
    return path.join(GROUP_TYPED_MEMORY_DIR, safeSegment(groupId));
}
function getGroupTypedMemoryIndexFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_TYPED_MEMORY_ENTRYPOINT);
}
function getGroupTypedMemoryRecallLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_TYPED_MEMORY_RECALL_LEDGER);
}
function getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER);
}
function getGroupTypedMemoryDistillationLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER);
}
function getGroupClaudeInstructionsLoadedHookLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER);
}
function registerGroupMemoryInstructionsLoadedHook(hook) {
    if (typeof hook !== "function")
        throw new Error("InstructionsLoaded hook must be a function");
    groupMemoryInstructionsLoadedHooks.add(hook);
    return () => groupMemoryInstructionsLoadedHooks.delete(hook);
}
function hasGroupMemoryInstructionsLoadedHook() {
    return groupMemoryInstructionsLoadedHooks.size > 0;
}
function loadGroupClaudeInstructionsLoadedHookLedger(groupId) {
    const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
    const parsed = readJson(file, {});
    return {
        schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
        version: exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        file,
        entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        updatedAt: String(parsed?.updatedAt || ""),
    };
}
function writeGroupClaudeInstructionsLoadedHookLedger(groupId, ledger) {
    const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
    const value = {
        schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
        version: exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        entries: (Array.isArray(ledger?.entries) ? ledger.entries : []).slice(-300),
        updatedAt: now(),
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function executeGroupMemoryInstructionsLoadedHooks(groupId, input = {}) {
    const event = {
        schema: "ccm-claude-instructions-loaded-hook-event-v1",
        version: exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        hook_event_name: "InstructionsLoaded",
        file_path: String(input.filePath || input.file_path || ""),
        memory_type: String(input.memoryType || input.memory_type || "Project"),
        load_reason: String(input.loadReason || input.load_reason || "context_bundle"),
        globs: normalizePathGlobs(input.globs || input.paths || []),
        trigger_file_path: String(input.triggerFilePath || input.trigger_file_path || ""),
        parent_file_path: String(input.parentFilePath || input.parent_file_path || ""),
        source: String(input.source || ""),
        scope: String(input.scope || ""),
        kind: String(input.kind || ""),
        rel_path: String(input.relPath || input.rel_path || ""),
        firedAt: now(),
    };
    const rows = [];
    let index = 0;
    for (const hook of groupMemoryInstructionsLoadedHooks) {
        const startedAt = Date.now();
        try {
            const output = hook(event);
            const returnedPromise = !!output && typeof output.then === "function";
            rows.push({
                hookIndex: index,
                status: returnedPromise ? "async_not_awaited" : "ok",
                durationMs: Date.now() - startedAt,
                result: returnedPromise ? "Promise returned by sync pipeline" : compactText(JSON.stringify(output ?? null), 1000),
            });
        }
        catch (error) {
            rows.push({
                hookIndex: index,
                status: "error",
                durationMs: Date.now() - startedAt,
                error: compactText(error?.message || error, 1000),
            });
        }
        index += 1;
    }
    const summary = {
        schema: "ccm-claude-instructions-loaded-hook-execution-v1",
        version: exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        configured: groupMemoryInstructionsLoadedHooks.size > 0,
        hookCount: groupMemoryInstructionsLoadedHooks.size,
        event,
        rows,
        firedCount: rows.length,
        failureCount: rows.filter(row => row.status === "error").length,
        ledgerFile: getGroupClaudeInstructionsLoadedHookLedgerFile(groupId),
    };
    if (summary.configured) {
        const ledger = loadGroupClaudeInstructionsLoadedHookLedger(groupId);
        writeGroupClaudeInstructionsLoadedHookLedger(groupId, {
            ...ledger,
            entries: [...(ledger.entries || []), summary],
        });
    }
    return summary;
}
function getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER);
}
function normalizeExternalIncludeApprovalPath(file) {
    const text = String(file || "").trim();
    return text ? path.resolve(text).replace(/\\/g, "/") : "";
}
function externalIncludeApprovalKey(file) {
    return checksum(normalizeExternalIncludeApprovalPath(file), 24);
}
function loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) {
    const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
    const parsed = readJson(file, {});
    return {
        schema: "ccm-claude-memory-external-include-approval-ledger-v1",
        version: exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
        groupId,
        file,
        hasExternalIncludesApproved: parsed?.hasExternalIncludesApproved === true,
        hasExternalIncludesWarningShown: parsed?.hasExternalIncludesWarningShown === true,
        warningShownAt: String(parsed?.warningShownAt || ""),
        approved: Array.isArray(parsed?.approved) ? parsed.approved : [],
        warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
        updatedAt: String(parsed?.updatedAt || ""),
    };
}
function writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, ledger) {
    const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
    const value = {
        schema: "ccm-claude-memory-external-include-approval-ledger-v1",
        version: exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
        groupId,
        hasExternalIncludesApproved: ledger?.hasExternalIncludesApproved === true,
        hasExternalIncludesWarningShown: ledger?.hasExternalIncludesWarningShown === true,
        warningShownAt: String(ledger?.warningShownAt || ""),
        approved: (Array.isArray(ledger?.approved) ? ledger.approved : []).slice(-300),
        warnings: (Array.isArray(ledger?.warnings) ? ledger.warnings : []).slice(-80),
        updatedAt: now(),
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function approveGroupClaudeMemoryExternalInclude(groupId, input = {}) {
    const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
    const includes = Array.isArray(input.includes)
        ? input.includes
        : Array.isArray(input.paths)
            ? input.paths.map((item) => ({ path: item }))
            : [input];
    const approvedBy = String(input.approvedBy || input.approved_by || "local-user");
    const approveAll = input.approveAll === true || input.approve_all === true || input.hasExternalIncludesApproved === true;
    const approved = new Map();
    for (const item of ledger.approved || []) {
        if (!item?.key)
            continue;
        approved.set(String(item.key), item);
    }
    for (const item of includes) {
        const includePath = normalizeExternalIncludeApprovalPath(item?.path || item?.ref || item);
        if (!includePath)
            continue;
        const key = externalIncludeApprovalKey(includePath);
        approved.set(key, {
            key,
            path: includePath,
            parent: String(item?.parent || item?.from || input.parent || ""),
            scope: String(item?.scope || input.scope || ""),
            kind: String(item?.kind || input.kind || ""),
            approvedBy,
            approvedAt: now(),
        });
    }
    return writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, {
        ...ledger,
        hasExternalIncludesApproved: ledger.hasExternalIncludesApproved === true || approveAll,
        approved: [...approved.values()],
    });
}
function markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input = {}) {
    const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
    const includes = Array.isArray(input.includes) ? input.includes : [];
    const warnings = [...(ledger.warnings || []), {
            shownAt: now(),
            actor: String(input.actor || "system"),
            count: Number(input.count || includes.length || 0),
            includes: includes.slice(0, 40).map((item) => ({
                path: normalizeExternalIncludeApprovalPath(item?.path || item?.ref || item),
                parent: String(item?.parent || item?.from || ""),
                scope: String(item?.scope || ""),
                kind: String(item?.kind || ""),
            })),
        }];
    return writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, {
        ...ledger,
        hasExternalIncludesWarningShown: true,
        warningShownAt: ledger.warningShownAt || now(),
        warnings,
    });
}
function upsertGroupTypedMemoryDocument(groupId, input) {
    const dir = ensureGroupTypedMemoryDir(groupId);
    const type = normalizeMemoryType(input.type);
    const name = markdownLinkTitle(input.name || input.title || type);
    const slug = safeSegment(input.slug || `${type}-${name.toLowerCase()}`, `${type}-memory`);
    const file = path.join(dir, `${slug}.md`);
    const content = renderMemoryDocument({ ...input, type, name, groupId });
    const changed = writeTextAtomic(file, content);
    return { file, changed, slug, type, name };
}
function listMarkdownFilesRecursive(dir, options = {}) {
    const maxFiles = Math.max(1, Math.min(300, Number(options.maxFiles || options.max_files || 80)));
    const result = [];
    const visit = (current) => {
        if (result.length >= maxFiles)
            return;
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            if (result.length >= maxFiles)
                break;
            const file = path.join(current, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
                result.push(file);
        }
    };
    visit(dir);
    return result;
}
function projectMemoryRelPath(projectRoot, file) {
    const rel = path.relative(projectRoot, file).replace(/\\/g, "/");
    return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : path.basename(file);
}
function executeInstructionsLoadedHooksForImportedClaudeMemory(groupId, items = [], options = {}) {
    const executions = [];
    const baseLoadReason = String(options.instructionsLoadReason || options.instructions_load_reason || options.memoryReloadReason || options.memory_reload_reason || options.loadReason || options.load_reason || "context_bundle");
    for (const item of items || []) {
        const memoryType = item.scope === "user"
            ? "User"
            : item.scope === "managed"
                ? "Managed"
                : item.kind === "local"
                    ? "Local"
                    : "Project";
        const loadReason = item.includeParentFile ? "include" : baseLoadReason;
        executions.push(executeGroupMemoryInstructionsLoadedHooks(groupId, {
            filePath: item.file,
            memoryType,
            loadReason,
            globs: item.paths || [],
            parentFilePath: item.includeParentFile || "",
            source: item.scope ? `global-claude-memory:${item.scope}` : "project-memory",
            scope: item.scope || "project",
            kind: item.kind || "",
            relPath: item.relPath || "",
        }));
    }
    const configured = executions.some(item => item.configured === true);
    return {
        schema: "ccm-claude-instructions-loaded-hook-import-summary-v1",
        version: exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        configured,
        eventCount: executions.length,
        hookCount: configured ? executions.reduce((max, item) => Math.max(max, Number(item.hookCount || 0)), 0) : 0,
        firedCount: executions.reduce((sum, item) => sum + Number(item.firedCount || 0), 0),
        failureCount: executions.reduce((sum, item) => sum + Number(item.failureCount || 0), 0),
        ledgerFile: getGroupClaudeInstructionsLoadedHookLedgerFile(groupId),
        executions: executions.slice(-40),
    };
}
function discoverProjectMemoryFiles(projectRoot, options = {}) {
    const root = path.resolve(String(projectRoot || ""));
    const settingSourcePolicy = buildClaudeMemorySettingSourcePolicy(options);
    const includeProject = settingSourcePolicy.includeProject;
    const includeLocal = settingSourcePolicy.includeLocal;
    const maxParentDepth = Math.max(0, Math.min(12, Number(options.maxParentDepth || options.max_parent_depth || 0)));
    const maxRuleFiles = Math.max(1, Math.min(300, Number(options.maxRuleFiles || options.max_rule_files || 80)));
    if (!root || !fs.existsSync(root)) {
        return {
            schema: "ccm-project-memory-discovery-v1",
            version: 1,
            projectRoot: root,
            status: "missing_project_root",
            settingSourcePolicy,
            files: [],
            issues: [{ type: "missing_project_root", path: root }],
        };
    }
    const dirs = [];
    let current = root;
    for (let depth = 0; depth <= maxParentDepth; depth += 1) {
        dirs.push(current);
        const parent = path.dirname(current);
        if (!parent || parent === current)
            break;
        current = parent;
    }
    const files = [];
    const issues = [];
    const seen = new Set();
    const addFile = (file, kind, baseDir) => {
        const resolved = path.resolve(file);
        const key = normalizeFileKey(resolved);
        if (seen.has(key))
            return;
        seen.add(key);
        if (!fs.existsSync(resolved))
            return;
        try {
            const stat = fs.statSync(resolved);
            if (!stat.isFile())
                return;
            const content = fs.readFileSync(resolved, "utf-8");
            const parsed = parseFrontmatter(content);
            files.push({
                file: resolved,
                relPath: projectMemoryRelPath(root, resolved),
                baseDir,
                kind,
                memoryType: kind === "local" ? "local" : "project",
                name: parsed.meta.name || path.basename(resolved),
                description: parsed.meta.description || compactText(parsed.body.split(/\n+/).find(Boolean) || "", 180),
                paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                bytes: stat.size,
                mtimeMs: stat.mtimeMs,
                checksum: checksum(content, 24),
                body: parsed.body || content,
            });
        }
        catch (error) {
            issues.push({ type: "unreadable_project_memory", path: resolved, error: compactText(error?.message || error, 260) });
        }
    };
    for (const dir of dirs.reverse()) {
        if (includeProject) {
            addFile(path.join(dir, "CLAUDE.md"), "project", dir);
            addFile(path.join(dir, ".claude", "CLAUDE.md"), "project", dir);
            const rulesDir = path.join(dir, ".claude", "rules");
            for (const file of listMarkdownFilesRecursive(rulesDir, { maxFiles: maxRuleFiles }))
                addFile(file, "project_rule", dir);
        }
        if (includeLocal)
            addFile(path.join(dir, "CLAUDE.local.md"), "local", dir);
    }
    return {
        schema: "ccm-project-memory-discovery-v1",
        version: 1,
        projectRoot: root,
        status: files.length ? "found" : "empty",
        settingSourcePolicy,
        includeProject,
        includeLocal,
        maxParentDepth,
        maxRuleFiles,
        discoveredCount: files.length,
        files,
        issues,
    };
}
function importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options = {}) {
    const discovery = discoverProjectMemoryFiles(projectRoot, options);
    const projectName = safeSegment(options.project || options.projectName || options.project_name || path.basename(String(projectRoot || "project")), "project");
    const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
    const includeAudit = buildClaudeMemoryIncludeExpansion(discovery.files || [], {
        groupId,
        allowedRoots: [discovery.projectRoot],
        allowExternalIncludes: options.allowExternalIncludes === true || options.allow_external_includes === true,
        maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
    });
    const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
    const boundedImportItems = importItems.slice(0, maxImportFiles);
    const writes = [];
    const skipped = [];
    for (const item of boundedImportItems) {
        const rel = String(item.relPath || path.basename(item.file || "memory.md"));
        const slug = safeSegment(`project-${projectName}-${rel.replace(/\.md$/i, "")}`, `project-${projectName}-memory`);
        const titlePrefix = item.includeParentFile
            ? "Project Memory Include"
            : item.kind === "local" ? "Local Project Memory" : item.kind === "project_rule" ? "Project Rule" : "Project Memory";
        const body = [
            `# ${titlePrefix}: ${rel}`,
            "",
            `Imported from ${item.file}`,
            item.includeParentFile ? `Included by ${item.includeParentFile}` : "",
            item.includeDepth ? `Include depth: ${item.includeDepth}` : "",
            "",
            neutralizeClaudeMemoryIncludeRefs(item.body || ""),
        ].filter(line => line !== "").join("\n");
        const write = upsertGroupTypedMemoryDocument(groupId, {
            type: item.kind === "local" ? "project" : "reference",
            slug,
            name: `${titlePrefix}: ${rel}`,
            description: item.description || `${titlePrefix} imported from ${rel}`,
            source: `project-memory:${projectName}:${item.kind}:${rel}`,
            paths: item.paths || [],
            updatedAt: new Date(Number(item.mtimeMs || Date.now())).toISOString(),
            body,
        });
        writes.push({ ...write, sourceFile: item.file, relPath: rel, kind: item.kind, paths: item.paths || [], checksum: item.checksum, includeParentFile: item.includeParentFile || "", includeDepth: Number(item.includeDepth || 0) });
    }
    if (importItems.length > maxImportFiles) {
        skipped.push({ type: "max_import_files", count: importItems.length - maxImportFiles });
    }
    const instructionsLoadedHooks = executeInstructionsLoadedHooksForImportedClaudeMemory(groupId, boundedImportItems, {
        ...options,
        loadReason: options.instructionsLoadReason || options.instructions_load_reason || "project_memory_import",
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-project-memory-import-v1",
        version: exports.GROUP_PROJECT_MEMORY_IMPORT_VERSION,
        groupId,
        project: projectName,
        projectRoot: discovery.projectRoot,
        status: discovery.status === "missing_project_root" ? "missing_project_root" : "imported",
        settingSourcePolicy: discovery.settingSourcePolicy,
        includeProject: discovery.includeProject,
        includeLocal: discovery.includeLocal,
        discoveredCount: discovery.discoveredCount || 0,
        importedCount: writes.length,
        instructionsLoadedHooks,
        includeAudit: {
            ...includeAudit,
            files: undefined,
            importedIncludeCount: writes.filter(item => Number(item.includeDepth || 0) > 0).length,
        },
        skipped,
        issues: [...(discovery.issues || []), ...(includeAudit.issues || [])],
        writes,
        index,
        importedAt: now(),
    };
}
function defaultManagedClaudeMemoryRoot() {
    if (process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR)
        return process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR;
    if (process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH)
        return process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH;
    if (process.platform === "win32")
        return "C:\\Program Files\\ClaudeCode";
    if (process.platform === "darwin")
        return "/Library/Application Support/ClaudeCode";
    return "/etc/claude-code";
}
function defaultUserClaudeMemoryRoot() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}
function discoverGlobalClaudeMemoryFiles(options = {}) {
    const settingSourcePolicy = buildClaudeMemorySettingSourcePolicy(options);
    const includeUser = settingSourcePolicy.includeUser;
    const includeManaged = settingSourcePolicy.includeManaged;
    const userRoot = path.resolve(String(options.userRoot || options.user_root || defaultUserClaudeMemoryRoot()));
    const managedRoot = path.resolve(String(options.managedRoot || options.managed_root || defaultManagedClaudeMemoryRoot()));
    const maxRuleFiles = Math.max(1, Math.min(300, Number(options.maxRuleFiles || options.max_rule_files || 80)));
    const files = [];
    const issues = [];
    const seen = new Set();
    const addFile = (file, scope, kind, root) => {
        const resolved = path.resolve(file);
        const key = normalizeFileKey(resolved);
        if (seen.has(key))
            return;
        seen.add(key);
        if (!fs.existsSync(resolved))
            return;
        try {
            const stat = fs.statSync(resolved);
            if (!stat.isFile())
                return;
            const content = fs.readFileSync(resolved, "utf-8");
            const parsed = parseFrontmatter(content);
            files.push({
                file: resolved,
                relPath: path.relative(root, resolved).replace(/\\/g, "/") || path.basename(resolved),
                root,
                scope,
                kind,
                name: parsed.meta.name || path.basename(resolved),
                description: parsed.meta.description || compactText(parsed.body.split(/\n+/).find(Boolean) || "", 180),
                paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                bytes: stat.size,
                mtimeMs: stat.mtimeMs,
                checksum: checksum(content, 24),
                body: parsed.body || content,
            });
        }
        catch (error) {
            issues.push({ type: "unreadable_global_claude_memory", path: resolved, error: compactText(error?.message || error, 260) });
        }
    };
    if (includeManaged && fs.existsSync(managedRoot)) {
        addFile(path.join(managedRoot, "CLAUDE.md"), "managed", "managed", managedRoot);
        for (const file of listMarkdownFilesRecursive(path.join(managedRoot, ".claude", "rules"), { maxFiles: maxRuleFiles })) {
            addFile(file, "managed", "managed_rule", managedRoot);
        }
    }
    else if (includeManaged && (options.managedRoot || options.managed_root || process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR || process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH)) {
        issues.push({ type: "missing_managed_root", path: managedRoot });
    }
    if (includeUser && fs.existsSync(userRoot)) {
        addFile(path.join(userRoot, "CLAUDE.md"), "user", "user", userRoot);
        for (const file of listMarkdownFilesRecursive(path.join(userRoot, "rules"), { maxFiles: maxRuleFiles })) {
            addFile(file, "user", "user_rule", userRoot);
        }
    }
    else if (includeUser && (options.userRoot || options.user_root || process.env.CLAUDE_CONFIG_DIR)) {
        issues.push({ type: "missing_user_root", path: userRoot });
    }
    return {
        schema: "ccm-global-claude-memory-discovery-v1",
        version: 1,
        status: files.length ? "found" : "empty",
        settingSourcePolicy,
        includeUser,
        includeManaged,
        userRoot,
        managedRoot,
        discoveredCount: files.length,
        files,
        issues,
    };
}
function importGlobalClaudeMemoryToGroupTypedMemory(groupId, options = {}) {
    const discovery = discoverGlobalClaudeMemoryFiles(options);
    const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
    const includeAudit = buildClaudeMemoryIncludeExpansion(discovery.files || [], {
        groupId,
        maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
        allowUserExternalIncludes: options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false,
        allowExternalForItem: (item) => {
            if (item?.scope === "user")
                return options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false;
            return options.allowExternalIncludes === true || options.allow_external_includes === true;
        },
    });
    const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
    const boundedImportItems = importItems.slice(0, maxImportFiles);
    const writes = [];
    const skipped = [];
    for (const item of boundedImportItems) {
        const rel = String(item.relPath || path.basename(item.file || "CLAUDE.md"));
        const slug = safeSegment(`global-claude-${item.scope}-${rel.replace(/\.md$/i, "")}`, `global-claude-${item.scope}-memory`);
        const titlePrefix = item.scope === "managed"
            ? (item.includeParentFile ? "Managed Claude Include" : item.kind === "managed_rule" ? "Managed Claude Rule" : "Managed Claude Memory")
            : (item.includeParentFile ? "User Claude Include" : item.kind === "user_rule" ? "User Claude Rule" : "User Claude Memory");
        const body = [
            `# ${titlePrefix}: ${rel}`,
            "",
            `Imported from ${item.file}`,
            item.includeParentFile ? `Included by ${item.includeParentFile}` : "",
            item.includeDepth ? `Include depth: ${item.includeDepth}` : "",
            "",
            neutralizeClaudeMemoryIncludeRefs(item.body || ""),
        ].filter(line => line !== "").join("\n");
        const write = upsertGroupTypedMemoryDocument(groupId, {
            type: item.scope === "user" ? "user" : "reference",
            slug,
            name: `${titlePrefix}: ${rel}`,
            description: item.description || `${titlePrefix} imported from ${rel}`,
            source: `global-claude-memory:${item.scope}:${item.kind}:${rel}`,
            paths: item.paths || [],
            updatedAt: new Date(Number(item.mtimeMs || Date.now())).toISOString(),
            body,
        });
        writes.push({ ...write, sourceFile: item.file, relPath: rel, scope: item.scope, kind: item.kind, paths: item.paths || [], checksum: item.checksum, includeParentFile: item.includeParentFile || "", includeDepth: Number(item.includeDepth || 0) });
    }
    if (importItems.length > maxImportFiles) {
        skipped.push({ type: "max_import_files", count: importItems.length - maxImportFiles });
    }
    const instructionsLoadedHooks = executeInstructionsLoadedHooksForImportedClaudeMemory(groupId, boundedImportItems, {
        ...options,
        loadReason: options.instructionsLoadReason || options.instructions_load_reason || "global_claude_memory_import",
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-global-claude-memory-import-v1",
        version: exports.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION,
        groupId,
        status: discovery.status === "empty" ? "empty" : "imported",
        settingSourcePolicy: discovery.settingSourcePolicy,
        includeUser: discovery.includeUser,
        includeManaged: discovery.includeManaged,
        userRoot: discovery.userRoot,
        managedRoot: discovery.managedRoot,
        discoveredCount: discovery.discoveredCount || 0,
        importedCount: writes.length,
        instructionsLoadedHooks,
        includeAudit: {
            ...includeAudit,
            files: undefined,
            importedIncludeCount: writes.filter(item => Number(item.includeDepth || 0) > 0).length,
        },
        skipped,
        issues: [...(discovery.issues || []), ...(includeAudit.issues || [])],
        writes,
        index,
        importedAt: now(),
    };
}
function scanGroupTypedMemoryDocuments(groupId) {
    return listMemoryMarkdownFiles(groupId).map(file => {
        const content = fs.readFileSync(file, "utf-8");
        const parsed = parseFrontmatter(content);
        const stat = fs.statSync(file);
        return {
            file,
            relPath: path.basename(file),
            name: parsed.meta.name || path.basename(file, ".md"),
            description: parsed.meta.description || "",
            type: normalizeMemoryType(parsed.meta.type),
            source: parsed.meta.source || "",
            paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
            updatedAt: parsed.meta.updated_at || stat.mtime.toISOString(),
            checksum: parsed.meta.checksum || checksum(content, 24),
            body: parsed.body,
            mtimeMs: stat.mtimeMs,
            bytes: stat.size,
        };
    }).sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)));
}
function buildGroupTypedMemoryIndex(groupId) {
    const dir = ensureGroupTypedMemoryDir(groupId);
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const lines = [
        "# MEMORY.md",
        "",
        "CCM group typed memory index. This file is loaded as the stable entrypoint; linked files hold the full typed memories.",
        "",
    ];
    for (const type of ["user", "feedback", "project", "reference"]) {
        const subset = docs.filter(doc => doc.type === type);
        if (!subset.length)
            continue;
        lines.push(`## ${type}`);
        for (const doc of subset)
            lines.push(`- [${markdownLinkTitle(doc.name)}](${doc.relPath}) - ${compactText(doc.description, 150)}`);
        lines.push("");
    }
    const content = truncateIndexContent(lines.join("\n").trim() + "\n");
    const file = path.join(dir, exports.GROUP_TYPED_MEMORY_ENTRYPOINT);
    const changed = writeTextAtomic(file, content);
    return { file, dir, docs, changed, lineCount: content.split("\n").length, bytes: Buffer.byteLength(content, "utf-8") };
}
function groupTypedMemoryPriority(type) {
    const value = normalizeMemoryType(type);
    if (value === "user")
        return 400;
    if (value === "feedback")
        return 300;
    if (value === "project")
        return 200;
    return 100;
}
function normalizeFileKey(file) {
    return path.resolve(file).replace(/\\/g, "/").toLowerCase();
}
function isPathInside(baseDir, file) {
    const base = normalizeFileKey(baseDir);
    const target = normalizeFileKey(file);
    return target === base || target.startsWith(`${base}/`);
}
function isClaudeMemoryTextInclude(file) {
    const ext = path.extname(String(file || "")).toLowerCase();
    return CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS.has(ext);
}
function stripIncludePath(value) {
    return String(value || "")
        .replace(/\\ /g, " ")
        .replace(/[#?].*$/, "")
        .replace(/[),.;，。；、]+$/g, "")
        .trim();
}
function extractTypedMemoryIncludeRefs(content) {
    const refs = [];
    let inFence = false;
    for (const rawLine of String(content || "").split(/\n/)) {
        const line = rawLine.replace(/\r/g, "");
        if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence || /^\s*<!--/.test(line))
            continue;
        const includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g;
        let match;
        while ((match = includeRegex.exec(line)) !== null) {
            const ref = stripIncludePath(match[1]);
            if (!ref || ref.startsWith("@") || /^[#%^&*()]+/.test(ref))
                continue;
            if (ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref) || /^[a-zA-Z0-9._-]/.test(ref)) {
                refs.push(ref);
            }
        }
    }
    return [...new Set(refs)].slice(0, 40);
}
function resolveClaudeMemoryIncludePath(baseFile, ref) {
    const cleaned = stripIncludePath(ref);
    if (!cleaned)
        return "";
    if (cleaned.startsWith("~/"))
        return path.resolve(os.homedir(), cleaned.slice(2));
    if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned))
        return path.resolve(cleaned);
    return path.resolve(path.dirname(baseFile), cleaned);
}
function neutralizeClaudeMemoryIncludeRefs(content) {
    const lines = [];
    let inFence = false;
    for (const rawLine of String(content || "").split(/\n/)) {
        const line = rawLine.replace(/\r/g, "");
        if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
            inFence = !inFence;
            lines.push(rawLine);
            continue;
        }
        if (inFence || /^\s*<!--/.test(line)) {
            lines.push(rawLine);
            continue;
        }
        lines.push(line.replace(/(^|\s)@((?:[^\s\\]|\\ )+)/g, (_match, lead, ref) => {
            const cleaned = stripIncludePath(ref);
            if (!cleaned || cleaned.startsWith("@") || /^[#%^&*()]+/.test(cleaned))
                return `${lead}@${ref}`;
            return `${lead}included:${cleaned}`;
        }));
    }
    return lines.join("\n");
}
function claudeMemoryIncludeRelPath(file, roots = []) {
    const resolved = path.resolve(file);
    const root = roots.find(item => item && isPathInside(item, resolved));
    if (root) {
        const rel = path.relative(root, resolved).replace(/\\/g, "/");
        return rel || path.basename(resolved);
    }
    return `external/${checksum(resolved, 10)}-${path.basename(resolved)}`;
}
function buildClaudeMemoryIncludeExpansion(sourceItems = [], options = {}) {
    const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
    const groupId = String(options.groupId || options.group_id || "");
    const approvalLedger = options.externalIncludeApprovalLedger
        || options.external_include_approval_ledger
        || (groupId ? loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) : null);
    const approvedIncludeKeys = new Set((Array.isArray(approvalLedger?.approved) ? approvalLedger.approved : []).map((item) => String(item.key || "")).filter(Boolean));
    const baseKeys = new Set(sourceItems.map((item) => normalizeFileKey(item.file || "")).filter(Boolean));
    const processed = new Set();
    const visiting = new Set();
    const files = [];
    const issues = [];
    const graph = [];
    const pendingExternalIncludes = [];
    const approvedExternalIncludes = [];
    const rootsForItem = (item) => {
        const roots = [
            ...(Array.isArray(item?.allowedRoots) ? item.allowedRoots : []),
            item?.root,
            item?.projectRoot,
            item?.baseDir,
            ...(Array.isArray(options.allowedRoots) ? options.allowedRoots : []),
        ].filter(Boolean).map((value) => path.resolve(String(value)));
        return [...new Set(roots)];
    };
    const canIncludeExternal = (rootItem, file) => {
        const key = externalIncludeApprovalKey(file);
        const explicitlyAllowed = typeof options.allowExternalForItem === "function"
            ? options.allowExternalForItem(rootItem, file) === true
            : options.allowExternalIncludes === true || options.allow_external_includes === true;
        if (explicitlyAllowed)
            return { allowed: true, reason: "explicit_option", key };
        if (rootItem?.scope === "user" && options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false) {
            return { allowed: true, reason: "user_memory_external_allowed", key };
        }
        if (approvalLedger?.hasExternalIncludesApproved === true || approvedIncludeKeys.has(key)) {
            return { allowed: true, reason: "approved_external_include", key };
        }
        return { allowed: false, reason: "requires_approval", key };
    };
    const addIssue = (issue) => {
        const entry = {
            type: String(issue.type || "include_issue"),
            ref: String(issue.ref || ""),
            from: String(issue.from || ""),
            parent: String(issue.parent || ""),
            detail: compactText(issue.detail || "", 500),
            approvalRequired: issue.approvalRequired === true,
            approved: issue.approved === true,
            approvalKey: String(issue.approvalKey || ""),
            scope: String(issue.scope || ""),
            kind: String(issue.kind || ""),
        };
        issues.push(entry);
        graph.push({ ...entry, status: "skipped" });
    };
    const visitRefs = (parentItem, rootItem, depth) => {
        const parentFile = String(parentItem.file || "");
        const parentRelPath = String(parentItem.relPath || path.basename(parentFile));
        const refs = extractTypedMemoryIncludeRefs(parentItem.body || "");
        for (const ref of refs) {
            const resolved = resolveClaudeMemoryIncludePath(parentFile, ref);
            if (!resolved)
                continue;
            const includeDepth = depth + 1;
            const key = normalizeFileKey(resolved);
            const roots = rootsForItem(rootItem);
            const external = !roots.some(root => isPathInside(root, resolved));
            if (includeDepth > maxIncludeDepth) {
                addIssue({ type: "max_include_depth", ref: resolved, from: parentRelPath, parent: parentFile, detail: `include depth exceeded ${maxIncludeDepth}` });
                continue;
            }
            const externalDecision = external ? canIncludeExternal(rootItem, resolved) : { allowed: true, reason: "internal", key: "" };
            if (external && !externalDecision.allowed) {
                const pending = {
                    path: normalizeExternalIncludeApprovalPath(resolved),
                    parent: parentFile,
                    from: parentRelPath,
                    scope: String(rootItem.scope || "project"),
                    kind: String(rootItem.kind || ""),
                    approvalKey: externalDecision.key,
                };
                pendingExternalIncludes.push(pending);
                addIssue({
                    type: "external_include_skipped",
                    ref: resolved,
                    from: parentRelPath,
                    parent: parentFile,
                    detail: "Claude memory include is outside the approved memory root and requires approval before import",
                    approvalRequired: true,
                    approvalKey: externalDecision.key,
                    scope: pending.scope,
                    kind: pending.kind,
                });
                continue;
            }
            if (visiting.has(key)) {
                addIssue({ type: "circular_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: "cycle detected while expanding Claude memory @include" });
                continue;
            }
            if (!fs.existsSync(resolved)) {
                addIssue({ type: "missing_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target does not exist" });
                continue;
            }
            let stat;
            try {
                stat = fs.statSync(resolved);
            }
            catch (error) {
                addIssue({ type: "unreadable_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: error?.message || error });
                continue;
            }
            if (!stat.isFile()) {
                addIssue({ type: "non_file_include_skipped", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target is not a file" });
                continue;
            }
            if (!isClaudeMemoryTextInclude(resolved)) {
                addIssue({ type: "non_text_include_skipped", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target is not a known text file extension" });
                continue;
            }
            if (baseKeys.has(key)) {
                graph.push({ type: "already_discovered_include", status: "already_loaded", ref: resolved, from: parentRelPath, parent: parentFile });
                continue;
            }
            if (processed.has(key)) {
                graph.push({ type: "deduped_include", status: "already_loaded", ref: resolved, from: parentRelPath, parent: parentFile });
                continue;
            }
            visiting.add(key);
            processed.add(key);
            try {
                const content = fs.readFileSync(resolved, "utf-8");
                const parsed = parseFrontmatter(content);
                const relPath = claudeMemoryIncludeRelPath(resolved, roots);
                const item = {
                    ...rootItem,
                    file: resolved,
                    relPath,
                    kind: `${String(rootItem.kind || "memory")}_include`,
                    includeParentFile: parentFile,
                    includeParentRelPath: parentRelPath,
                    includeDepth,
                    name: parsed.meta.name || path.basename(resolved),
                    description: parsed.meta.description || compactText((parsed.body || content).split(/\n+/).find(Boolean) || "", 180),
                    paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                    bytes: stat.size,
                    mtimeMs: stat.mtimeMs,
                    checksum: checksum(content, 24),
                    body: parsed.body || content,
                };
                files.push(item);
                if (external && externalDecision.reason === "approved_external_include") {
                    approvedExternalIncludes.push({
                        path: normalizeExternalIncludeApprovalPath(resolved),
                        parent: parentFile,
                        from: parentRelPath,
                        scope: String(rootItem.scope || "project"),
                        kind: String(rootItem.kind || ""),
                        approvalKey: externalDecision.key,
                    });
                }
                graph.push({ type: "include_imported", status: external ? externalDecision.reason : "included", ref: resolved, from: parentRelPath, parent: parentFile, relPath, depth: includeDepth });
                visitRefs(item, rootItem, includeDepth);
            }
            catch (error) {
                addIssue({ type: "unreadable_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: error?.message || error });
            }
            finally {
                visiting.delete(key);
            }
        }
    };
    for (const item of sourceItems)
        visitRefs(item, item, 0);
    return {
        schema: "ccm-claude-memory-include-audit-v1",
        version: exports.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION,
        generatedAt: now(),
        maxIncludeDepth,
        includedCount: files.length,
        skippedCount: issues.length,
        externalIncludeCount: pendingExternalIncludes.length + approvedExternalIncludes.length,
        externalIncludeApproval: {
            schema: "ccm-claude-memory-external-include-approval-v1",
            version: exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
            ledgerFile: approvalLedger?.file || (groupId ? getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId) : ""),
            hasExternalIncludesApproved: approvalLedger?.hasExternalIncludesApproved === true,
            hasExternalIncludesWarningShown: approvalLedger?.hasExternalIncludesWarningShown === true,
            warningShownAt: String(approvalLedger?.warningShownAt || ""),
            pendingCount: pendingExternalIncludes.length,
            approvedCount: approvedExternalIncludes.length,
            shouldShowWarning: pendingExternalIncludes.length > 0
                && approvalLedger?.hasExternalIncludesApproved !== true
                && approvalLedger?.hasExternalIncludesWarningShown !== true,
            pendingExternalIncludes: pendingExternalIncludes.slice(0, 40),
            approvedExternalIncludes: approvedExternalIncludes.slice(0, 40),
        },
        graph: graph.slice(0, 120),
        issues,
        files,
    };
}
function resolveTypedMemoryIncludePath(baseFile, ref) {
    const cleaned = stripIncludePath(ref);
    if (!cleaned)
        return "";
    if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned))
        return path.resolve(cleaned);
    return path.resolve(path.dirname(baseFile), cleaned);
}
function buildTypedMemoryLoadEntry(input) {
    const file = String(input.file || "");
    const stat = fs.statSync(file);
    const content = fs.readFileSync(file, "utf-8");
    const parsed = parseFrontmatter(content);
    const type = input.kind === "entrypoint" ? "entrypoint" : normalizeMemoryType(parsed.meta.type || input.type);
    const body = parsed.body || content;
    const includeRefs = extractTypedMemoryIncludeRefs(body);
    const relPath = input.relPath || path.basename(file);
    const priority = input.kind === "entrypoint" ? 0 : groupTypedMemoryPriority(type);
    const pathGlobs = normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || input.pathGlobs || []);
    return {
        id: `${input.kind || "typed_doc"}:${relPath}`,
        kind: input.kind || "typed_doc",
        relPath,
        file,
        name: parsed.meta.name || path.basename(file, ".md"),
        description: parsed.meta.description || "",
        type,
        source: parsed.meta.source || "",
        pathGlobs,
        pathCondition: input.pathCondition || evaluateTypedMemoryPathCondition({ paths: pathGlobs }, input.targetPaths || []),
        priority,
        includeDepth: Number(input.depth || 0),
        parentRelPath: input.parentRelPath || "",
        loadReason: input.parentRelPath ? "include" : input.kind === "entrypoint" ? "entrypoint" : "typed_doc",
        includeRefs,
        mtimeMs: stat.mtimeMs,
        bytes: stat.size,
        checksum: checksum(content, 24),
        estimatedTokens: Math.max(1, Math.ceil(Buffer.byteLength(content, "utf-8") / 4)),
    };
}
function buildGroupTypedMemoryLoadPlan(groupId, options = {}) {
    const index = buildGroupTypedMemoryIndex(groupId);
    const dir = index.dir;
    const maxEntries = Math.max(4, Math.min(240, Number(options.maxEntries || options.max_entries || exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES)));
    const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
    const targetPaths = deriveGroupTypedMemoryTargetPaths(options.query || "", options.targetPaths || options.target_paths || []);
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const pathConditions = new Map();
    for (const doc of docs)
        pathConditions.set(normalizeFileKey(doc.file), evaluateTypedMemoryPathCondition(doc, targetPaths));
    const docByFile = new Map();
    for (const doc of docs)
        docByFile.set(normalizeFileKey(doc.file), doc);
    const sortedDocs = docs.slice().sort((a, b) => {
        const byPriority = groupTypedMemoryPriority(a.type) - groupTypedMemoryPriority(b.type);
        if (byPriority !== 0)
            return byPriority;
        const byTime = Number(a.mtimeMs || 0) - Number(b.mtimeMs || 0);
        return byTime !== 0 ? byTime : String(a.relPath || "").localeCompare(String(b.relPath || ""));
    });
    const entries = [];
    const issues = [];
    const processed = new Set();
    const visiting = new Set();
    const addIssue = (issue) => {
        issues.push({
            type: issue.type || "include_issue",
            ref: String(issue.ref || ""),
            from: String(issue.from || ""),
            detail: compactText(issue.detail || "", 500),
        });
    };
    const processFile = (file, input = {}) => {
        const resolved = path.resolve(file);
        const key = normalizeFileKey(resolved);
        const from = String(input.parentRelPath || "");
        if (!isPathInside(dir, resolved)) {
            addIssue({ type: "external_include_skipped", ref: resolved, from, detail: "include path is outside this group's typed memory directory" });
            return;
        }
        if (visiting.has(key)) {
            addIssue({ type: "circular_include", ref: path.basename(resolved), from, detail: "cycle detected while expanding typed memory @include" });
            return;
        }
        if (processed.has(key))
            return;
        if (!fs.existsSync(resolved)) {
            addIssue({ type: "missing_include", ref: resolved, from, detail: "typed memory @include target does not exist" });
            return;
        }
        if (Number(input.depth || 0) > maxIncludeDepth) {
            addIssue({ type: "max_include_depth", ref: resolved, from, detail: `include depth exceeded ${maxIncludeDepth}` });
            return;
        }
        visiting.add(key);
        let entry;
        try {
            const known = docByFile.get(key);
            entry = buildTypedMemoryLoadEntry({
                file: resolved,
                kind: input.kind || (known ? "typed_doc" : "include"),
                relPath: known?.relPath || path.relative(dir, resolved).replace(/\\/g, "/"),
                type: known?.type || input.type,
                pathGlobs: known?.paths || input.pathGlobs || [],
                pathCondition: input.pathCondition || pathConditions.get(key) || evaluateTypedMemoryPathCondition(known || {}, targetPaths),
                targetPaths,
                depth: input.depth || 0,
                parentRelPath: input.parentRelPath || "",
            });
            for (const ref of entry.includeRefs || []) {
                const includePath = resolveTypedMemoryIncludePath(resolved, ref);
                processFile(includePath, {
                    kind: "include",
                    depth: Number(entry.includeDepth || 0) + 1,
                    parentRelPath: entry.relPath,
                    type: entry.type,
                });
            }
            entries.push(entry);
            processed.add(key);
        }
        catch (error) {
            addIssue({ type: "unreadable_memory_file", ref: resolved, from, detail: error?.message || error });
        }
        finally {
            visiting.delete(key);
        }
    };
    processFile(index.file, { kind: "entrypoint", relPath: exports.GROUP_TYPED_MEMORY_ENTRYPOINT, depth: 0 });
    let conditionalMatched = 0;
    let conditionalSkipped = 0;
    for (const doc of sortedDocs) {
        const condition = pathConditions.get(normalizeFileKey(doc.file)) || evaluateTypedMemoryPathCondition(doc, targetPaths);
        if (condition.conditional && !condition.matched) {
            conditionalSkipped += 1;
            continue;
        }
        if (condition.conditional && condition.matched)
            conditionalMatched += 1;
        processFile(doc.file, { kind: "typed_doc", relPath: doc.relPath, type: doc.type, depth: 0, pathCondition: condition, targetPaths });
    }
    const boundedEntries = entries.slice(0, maxEntries).map((entry, loadOrder) => ({ ...entry, loadOrder }));
    const truncated = entries.length > boundedEntries.length;
    const totalBytes = boundedEntries.reduce((sum, entry) => sum + Number(entry.bytes || 0), 0);
    const estimatedTokens = boundedEntries.reduce((sum, entry) => sum + Number(entry.estimatedTokens || 0), 0);
    const byType = boundedEntries.reduce((acc, entry) => {
        const key = String(entry.type || entry.kind || "unknown");
        acc[key] = Number(acc[key] || 0) + 1;
        return acc;
    }, {});
    const status = issues.some(issue => issue.type === "missing_include" || issue.type === "circular_include" || issue.type === "unreadable_memory_file")
        ? "include_warnings"
        : truncated ? "truncated" : "pass";
    return {
        schema: "ccm-group-typed-memory-load-plan-v1",
        version: exports.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION,
        groupId,
        generatedAt: now(),
        status,
        pass: status === "pass",
        loadOrderPolicy: "entrypoint_first_then_lower_priority_docs_then_higher_priority_docs; includes_load_before_parent",
        priorityTiers: {
            entrypoint: 0,
            reference: groupTypedMemoryPriority("reference"),
            project: groupTypedMemoryPriority("project"),
            feedback: groupTypedMemoryPriority("feedback"),
            user: groupTypedMemoryPriority("user"),
        },
        maxEntries,
        maxIncludeDepth,
        targetPaths,
        conditionalMatched,
        conditionalSkipped,
        entryCount: boundedEntries.length,
        totalDiscoveredEntries: entries.length,
        truncated,
        totalBytes,
        estimatedTokens,
        byType,
        issues,
        indexFile: index.file,
        memoryDir: dir,
        entries: boundedEntries,
    };
}
function renderGroupTypedMemoryLoadPlan(plan) {
    if (!plan?.schema)
        return "";
    const lines = [
        `类型化 MEMORY.md 加载计划：${plan.status || "unknown"}；加载 ${plan.entryCount || 0}/${plan.totalDiscoveredEntries || 0} 项，约 ${plan.estimatedTokens || 0} tokens；条件匹配 ${plan.conditionalMatched || 0}、跳过 ${plan.conditionalSkipped || 0}；策略 ${plan.loadOrderPolicy || "unknown"}。`,
        `- 优先级：entrypoint < reference < project < feedback < user；高优先级记忆在后加载，子 Agent 应优先服从后加载内容。`,
    ];
    if (Array.isArray(plan.targetPaths) && plan.targetPaths.length) {
        lines.push(`- 路径条件目标：${plan.targetPaths.slice(0, 8).join("、")}。`);
    }
    if (Array.isArray(plan.issues) && plan.issues.length) {
        lines.push(`- 加载计划警告：${plan.issues.slice(0, 5).map((issue) => `${issue.type}:${issue.from || "root"}->${issue.ref || ""}`).join("；")}`);
    }
    const entries = Array.isArray(plan.entries) ? plan.entries : [];
    const preview = entries.slice(-8);
    if (preview.length) {
        lines.push("- 加载顺序预览（后面的优先级更高）：");
        for (const entry of preview) {
            lines.push(`  - #${entry.loadOrder ?? 0} [${entry.type || entry.kind}] ${entry.relPath || ""}${entry.parentRelPath ? `（include by ${entry.parentRelPath}）` : ""}`);
        }
    }
    return lines.join("\n");
}
function listLines(title, items, mapper, limit = 12) {
    const values = (items || []).map(mapper).map(item => compactText(item, 500)).filter(Boolean).slice(-limit);
    if (!values.length)
        return "";
    return [`## ${title}`, ...values.map(item => `- ${item}`)].join("\n");
}
function messageContent(message) {
    return String(message?.content || message?.delivery_summary?.headline || message?.result || "").trim();
}
function messageIdentity(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function messageActor(message) {
    return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}
function extractMessageFiles(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
        ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
        ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
            ? message.delivery_summary.actual_file_changes.map((item) => item?.path || item?.file || item)
            : []),
        ...(Array.isArray(message?.receipt?.filesChanged) ? message.receipt.filesChanged : []),
    ];
    const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : item?.path || item?.file || JSON.stringify(item)).filter(Boolean);
}
function extractMessageSkills(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.invokedSkills) ? message.invokedSkills : []),
        ...(Array.isArray(message?.skills) ? message.skills : []),
        ...(Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : []),
    ];
    const matched = [...content.matchAll(/Skill\s*[:：]\s*([A-Za-z0-9_.:@/-]+)/g)].map(match => match[1]);
    return [...explicit, ...matched]
        .map(item => typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name || item?.id || JSON.stringify(item))
        .filter(Boolean);
}
function extractMessageVerification(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.verification) ? message.verification : []),
        ...(Array.isArray(message?.receipt?.verification) ? message.receipt.verification : []),
        ...(Array.isArray(message?.delivery_summary?.verification) ? message.delivery_summary.verification : []),
    ];
    const matched = content.match(/\b(?:npm|pnpm|yarn|bun)\s+run\s+[A-Za-z0-9:_-]+|(?:pytest|vitest|tsc|mvn test|go test|cargo test)[^\n，。；]*/gi) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}
function addDistilledCandidate(candidates, category, type, message, index, text) {
    const bounded = compactText(text, 900);
    if (!bounded)
        return;
    const messageId = messageIdentity(message, index);
    const actor = messageActor(message);
    const key = checksum([category, type, messageId, bounded], 24);
    candidates.push({
        id: key,
        category,
        type,
        messageId,
        sourceIndex: index,
        actor,
        timestamp: String(message?.timestamp || message?.time || ""),
        text: bounded,
        checksum: key,
    });
}
function extractGroupLogDistillationCandidates(messages = []) {
    const candidates = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        const content = messageContent(message);
        if (!content)
            continue;
        const actor = messageActor(message);
        const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
        const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
        if (message?.role === "user" && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|目标|长期|must\b|never\b|always\b|do not\b|required?\b)/i.test(content)) {
            addDistilledCandidate(candidates, "user", "requirement", message, index, content);
        }
        if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
            addDistilledCandidate(candidates, "project", "dispatch_decision", message, index, `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`);
            for (const assignment of message.assignments || []) {
                addDistilledCandidate(candidates, "project", "assignment", message, index, `${assignment?.project || assignment?.target || "unknown"}：${assignment?.task || assignment?.reason || ""}`);
            }
        }
        if (/(决定|采用|使用|方案|策略|decision|decided|use|strategy)/i.test(content) && /(src\/|\.ts|\.js|\.vue|接口|服务|数据库|api|agent|memory|compact|压缩|记忆)/i.test(content)) {
            addDistilledCandidate(candidates, "project", "technical_decision", message, index, content);
        }
        if (/(失败|阻塞|未完成|超时|异常|回退|拒绝|error|failed|blocked|timeout|needs_info|need info)/i.test(`${status}\n${content}`)) {
            addDistilledCandidate(candidates, "feedback", "failure_or_blocker", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${content}`);
        }
        if (["done", "complete", "completed", "success"].includes(status) || message?.delivery_summary?.has_final_review) {
            addDistilledCandidate(candidates, "project", "completed_work", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${message?.receipt?.summary || message?.delivery_summary?.headline || content}`);
        }
        const files = uniqueStrings(extractMessageFiles(message), 12);
        if (files.length)
            addDistilledCandidate(candidates, "reference", "files", message, index, `${actor}: ${files.join(", ")} | ${compactText(content, 300)}`);
        const skills = uniqueStrings(extractMessageSkills(message), 10);
        if (skills.length)
            addDistilledCandidate(candidates, "reference", "skills", message, index, `${actor}: ${skills.map(item => `Skill:${item}`).join(", ")}`);
        const verification = uniqueStrings(extractMessageVerification(message), 10);
        if (verification.length)
            addDistilledCandidate(candidates, "reference", "verification", message, index, `${actor}: ${verification.join(", ")}`);
    }
    return candidates;
}
function readGroupTypedMemoryDistillationLedger(groupId) {
    const file = getGroupTypedMemoryDistillationLedgerFile(groupId);
    const state = readJson(file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: {},
        updatedAt: "",
    });
    return { ...state, facts: state?.facts && typeof state.facts === "object" ? state.facts : {}, file };
}
function pruneDistilledFacts(facts = {}, perTypeLimit = exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT) {
    const next = {};
    for (const type of ["user", "project", "feedback", "reference"]) {
        const entries = Object.entries(facts[type] || {})
            .sort((a, b) => Number(a[1].sourceIndex || 0) - Number(b[1].sourceIndex || 0) || String(a[1].lastSeenAt || "").localeCompare(String(b[1].lastSeenAt || "")))
            .slice(-perTypeLimit);
        next[type] = Object.fromEntries(entries);
    }
    return next;
}
function renderDistilledMemoryBody(title, facts, options = {}) {
    const lines = [
        `# ${title}`,
        "",
        `Generated by CCM long-term group-log distillation at ${options.updatedAt || now()}.`,
        "Each fact keeps its source message id so a future agent can recover the raw transcript before trusting file/function/flag claims.",
        "",
        "## Distilled Facts",
    ];
    for (const fact of facts) {
        const source = `#${fact.messageId || ""}`;
        const kind = fact.type ? `[${fact.type}] ` : "";
        const actor = fact.actor ? `${fact.actor}: ` : "";
        lines.push(`- ${source} ${kind}${actor}${compactText(fact.text, 900)}`);
    }
    return lines.join("\n").trim() + "\n";
}
function buildPostCompactCandidateUsageArchive(input = {}, options = {}) {
    const usage = input.postCompactCandidateUsage
        || input.post_compact_candidate_usage
        || input.candidateUsage
        || input.candidate_usage
        || {};
    const hints = normalizePostCompactCandidateUsageHints({ postCompactCandidateUsage: usage });
    const archived = hints
        .filter((row) => row.recommendation === "deprioritize_or_distill" || row.recommendation === "require_usage_receipt")
        .sort((a, b) => {
        const aWeight = Number(a.ignored_count || 0) * 2 + Number(a.mentioned_count || 0) - Number(a.used_count || 0) - Number(a.verified_count || 0);
        const bWeight = Number(b.ignored_count || 0) * 2 + Number(b.mentioned_count || 0) - Number(b.used_count || 0) - Number(b.verified_count || 0);
        return bWeight - aWeight || String(a.value || "").localeCompare(String(b.value || ""));
    })
        .slice(0, Math.max(1, Number(options.limit || options.max || 40)));
    if (!archived.length) {
        return {
            schema: "ccm-group-post-compact-candidate-usage-distillation-v1",
            archived_count: 0,
            rows: [],
            body: "",
        };
    }
    const updatedAt = options.updatedAt || now();
    const lines = [
        "# Post-Compact Candidate Usage Archive",
        "",
        `Generated by CCM post-compact usage distillation at ${updatedAt}.`,
        "This document records recovered-memory candidates that child Agents repeatedly ignored or mentioned without a clear usage decision.",
        "Treat these rows as low-priority memory: do not promote them back into task context unless the current task explicitly matches and the repository state is re-verified.",
        "",
        "## Archived Or Deprioritized Candidates",
    ];
    for (const row of archived) {
        const state = row.recommendation === "deprioritize_or_distill" ? "deprioritized" : "needs-explicit-usage-receipt";
        lines.push(`- [${state}] candidate_id=${row.candidate_id || ""}; value=${row.value || ""}; used=${row.used_count || 0}; verified=${row.verified_count || 0}; ignored=${row.ignored_count || 0}; mentioned=${row.mentioned_count || 0}.`);
    }
    return {
        schema: "ccm-group-post-compact-candidate-usage-distillation-v1",
        archived_count: archived.length,
        rows: archived,
        body: lines.join("\n").trim() + "\n",
    };
}
function preservedGroupTypedMemoryDistillationArchives(...ledgers) {
    const keys = [
        "providerReproofReceiptConsumptionArchive",
        "ignoreMemoryReceiptRepairArchive",
        "pressureMemoryProvenanceReceiptRepairArchive",
        "pressureProvenancePreDispatchComplianceArchive",
        "pressureProvenancePreDispatchComplianceRecoveryArchive",
        "pressureProvenanceProviderDispatchOverrideFollowupArchive",
        "providerSwitchExecutionArchive",
        "providerRankingProvenanceCompactRepairReceiptConsumptionArchive",
        "postCompactReinjectionRepairReceiptConsumptionArchive",
        "postCompactReceiptMemoryUsageRepairCompletionArchive",
        "postCompactCompletionMemoryPreservationRepairClosureArchive",
        "postCompactCompletionMemoryPreservationClosureConflictResolutionArchive",
        "providerRankingMemoryUsageReceiptRepairArchive",
        "contextUsageRepairArchive",
        "compactStrategyTypedArchive",
        "ptlEmergencyTypedArchive",
    ];
    const out = {};
    for (const key of keys) {
        const value = ledgers.map((ledger) => ledger?.[key]).find((candidate) => candidate?.schema);
        if (value?.schema)
            out[key] = value;
    }
    return out;
}
function normalizeProviderReproofReceiptConsumptionStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["strong", "native_strong", "provider_strong"].includes(status))
        return "strong";
    if (["used", "consumed", "applied"].includes(status))
        return "used";
    if (["verified", "checked", "rechecked"].includes(status))
        return "verified";
    if (["ignored", "not_used", "not-used", "not used", "skipped"].includes(status))
        return "ignored";
    if (["blocked", "failed", "needs_info", "needs-user", "needs_user", "waiting"].includes(status))
        return "blocked";
    return status ? "invalid" : "missing";
}
function providerReproofReceiptConsumptionCategory(status) {
    return status === "ignored" || status === "blocked" ? "caution" : "promoted";
}
function providerReproofReceiptConsumptionRecommendation(row = {}) {
    const status = String(row.status || "");
    if (status === "blocked")
        return "requires_followup_before_reuse";
    if (status === "ignored")
        return "do_not_promote_unless_current_task_explicitly_matches";
    if (status === "strong")
        return "recall_but_verify_native_provider_proof_ledger";
    if (status === "verified")
        return "promote_recall_with_current_source_verification";
    return "promote_recall_with_current_repo_verification";
}
function providerReproofReceiptConsumptionRowId(row = {}) {
    return `provider-reproof-receipt:${checksum([
        row.timeline_binding_id,
        row.brief_id,
        row.work_item_id,
        row.task_id,
        row.project,
        row.request_patch_checksum,
        row.status,
    ], 24)}`;
}
function providerReproofReceiptConsumptionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
    ];
    if (rows.length)
        return rows;
    const reportGroups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return reportGroups.flatMap((group) => Array.isArray(group.bindings) ? group.bindings : []);
}
function normalizeProviderReproofReceiptConsumptionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerReproofReceiptConsumptionInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const dispatchSource = String(entry.source || entry.dispatch_source || raw?.source || "").trim();
        const status = normalizeProviderReproofReceiptConsumptionStatus(entry.replay_repair_consumption_status
            || entry.replayRepairConsumptionStatus
            || entry.usage_state
            || entry.usageState
            || raw?.status);
        const row = {
            schema: "ccm-provider-reproof-receipt-consumption-distilled-row-v1",
            version: exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || raw?.timelineBindingId || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || raw?.work_item_id || raw?.workItemId || "").trim(),
            task_id: String(entry.task_id || entry.taskId || raw?.task_id || raw?.taskId || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            dispatch_source: dispatchSource,
            status,
            category: providerReproofReceiptConsumptionCategory(status),
            recommendation: "",
            consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.replay_repair_consumption_source || raw?.consumption_source || "").trim(),
            consumption_state: String(entry.replay_repair_consumption_state || entry.replayRepairConsumptionState || raw?.replay_repair_consumption_state || raw?.usage_state || raw?.usageState || "").trim(),
            reason: compactText(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.replay_repair_consumption_reason || raw?.reason || raw?.summary || "", 700),
            receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim(),
            provider_reproof_status: String(entry.provider_reproof_status || entry.providerReproofStatus || raw?.provider_reproof_status || "").trim(),
            provider_reproof_reason: compactText(entry.provider_reproof_reason || entry.providerReproofReason || raw?.provider_reproof_reason || "", 500),
            reproof_candidate_id: String(entry.reproof_candidate_id || entry.reproofCandidateId || raw?.reproof_candidate_id || "").trim(),
            original_work_item_id: String(entry.original_work_item_id || entry.originalWorkItemId || raw?.original_work_item_id || "").trim(),
            original_timeline_binding_id: String(entry.original_timeline_binding_id || entry.originalTimelineBindingId || raw?.original_timeline_binding_id || "").trim(),
            request_patch_checksum: String(entry.request_patch_checksum || entry.requestPatchChecksum || raw?.request_patch_checksum || "").trim(),
            runner_request_id: String(entry.runner_request_id || entry.runnerRequestId || raw?.runner_request_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
            memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
            execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        row.recommendation = providerReproofReceiptConsumptionRecommendation(row);
        return { ...row, row_id: providerReproofReceiptConsumptionRowId(row), strong_receipt_claim_only: status === "strong" };
    }).filter((row) => row.dispatch_source === "api_microcompact_native_apply_provider_reproof")
        .filter((row) => ["strong", "used", "verified", "ignored", "blocked"].includes(row.status));
}
function mergeProviderReproofReceiptConsumptionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const normalized = { ...row };
        const id = String(normalized.row_id || providerReproofReceiptConsumptionRowId(normalized));
        merged.set(id, { ...normalized, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || providerReproofReceiptConsumptionRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function renderProviderReproofReceiptConsumptionBody(title, rows = [], options = {}) {
    const lines = [
        `# ${title}`,
        "",
        `Generated by CCM provider re-proof receipt consumption distillation at ${options.updatedAt || now()}.`,
        "Each row came from a child Agent receipt after a provider re-proof dispatch brief was injected into its WorkerContextPacket.",
        "A receipt strong claim is not native provider strong proof; future agents must still verify the native proof/request telemetry ledger before closing provider re-proof.",
        "",
        "## Receipt Consumption Rows",
    ];
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.task_id ? `task=${row.task_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.request_patch_checksum ? `request=${row.request_patch_checksum}` : "",
            row.runner_request_id ? `runner=${row.runner_request_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status}] ${ids || row.row_id}; recommendation=${row.recommendation}; provider_reproof_status=${row.provider_reproof_status || "unknown"}.`);
        if (row.reason)
            lines.push(`  Reason: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
        if (row.provider_reproof_reason)
            lines.push(`  Provider re-proof reason: ${compactText(row.provider_reproof_reason, 400).replace(/\n/g, " ")}`);
        if (row.strong_receipt_claim_only)
            lines.push("  Note: receipt strong is a consumption claim only; require native provider proof ledger before closure.");
    }
    return lines.join("\n").trim() + "\n";
}
function providerReproofReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const promoted = rows.filter((row) => row.category === "promoted");
    const caution = rows.filter((row) => row.category === "caution");
    return {
        schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
        version: exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        promoted_count: promoted.length,
        caution_count: caution.length,
        strong_receipt_claim_count: rows.filter((row) => row.status === "strong").length,
        used_count: rows.filter((row) => row.status === "used").length,
        verified_count: rows.filter((row) => row.status === "verified").length,
        ignored_count: rows.filter((row) => row.status === "ignored").length,
        blocked_count: rows.filter((row) => row.status === "blocked").length,
        rows,
        updatedAt,
    };
}
function distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
            version: exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderReproofReceiptConsumptionRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.providerReproofReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderReproofReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = providerReproofReceiptConsumptionArchive(merged.rows, { updatedAt });
    const writes = [];
    const promotedRows = archive.rows.filter((row) => row.category === "promoted");
    const cautionRows = archive.rows.filter((row) => row.category === "caution");
    if (promotedRows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "provider-reproof-receipt-consumption-recall",
            name: "Provider re-proof receipt consumption recall",
            description: "Provider re-proof dispatch briefs that child Agents actually used, verified, or claimed strong after WorkerContextPacket injection.",
            source: "auto:provider-reproof-receipt-consumption-distillation",
            updatedAt,
            body: renderProviderReproofReceiptConsumptionBody("Provider Re-proof Receipt Consumption Recall", promotedRows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    if (cautionRows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "provider-reproof-receipt-consumption-cautions",
            name: "Provider re-proof receipt consumption cautions",
            description: "Provider re-proof dispatch briefs that child Agents ignored or blocked; keep them as cautionary memory, not promoted context.",
            source: "auto:provider-reproof-receipt-consumption-distillation",
            updatedAt,
            body: renderProviderReproofReceiptConsumptionBody("Provider Re-proof Receipt Consumption Cautions", cautionRows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        providerReproofReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-provider-reproof-receipt-consumption-distillation-v1",
        version: exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        promotedCount: archive.promoted_count,
        cautionCount: archive.caution_count,
        strongReceiptClaimCount: archive.strong_receipt_claim_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function providerRankingProvenanceCompactRepairReceiptConsumptionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
    ];
    if (rows.length)
        return rows;
    const reportGroups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return reportGroups.flatMap((group) => Array.isArray(group.bindings) ? group.bindings : []);
}
function providerRankingProvenanceStringList(...values) {
    return uniqueStrings(values.flatMap(value => {
        if (Array.isArray(value))
            return value;
        if (value === undefined || value === null || value === "")
            return [];
        return [value];
    }).map((item) => String(item || "").trim()).filter(Boolean), 48);
}
function providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row = {}) {
    return `provider-ranking-compact-repair-receipt:${checksum([
        row.timeline_binding_id,
        row.brief_id,
        row.work_item_id,
        row.task_id,
        row.project,
        row.provider_switch_decision_receipt_id,
        row.provider_switch_decision_receipt_checksum,
        row.typed_memory_rel_paths,
        row.typed_memory_row_ids,
    ], 24)}`;
}
function normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerRankingProvenanceCompactRepairReceiptConsumptionInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const source = String(entry.source || entry.dispatch_source || raw?.source || "").trim();
        const status = normalizeProviderReproofReceiptConsumptionStatus(entry.replay_repair_consumption_status
            || entry.replayRepairConsumptionStatus
            || entry.usage_state
            || entry.usageState
            || raw?.status);
        const relPaths = providerRankingProvenanceStringList(entry.provider_ranking_provenance_rel_paths, entry.providerRankingProvenanceRelPaths, entry.typed_memory_rel_paths, entry.typedMemoryRelPaths, raw?.provider_ranking_provenance_rel_paths, raw?.typed_memory_rel_paths);
        const rowIds = providerRankingProvenanceStringList(entry.provider_ranking_provenance_row_ids, entry.providerRankingProvenanceRowIds, entry.typed_memory_row_ids, entry.typedMemoryRowIds, raw?.provider_ranking_provenance_row_ids, raw?.typed_memory_row_ids);
        const preserved = entry.provider_ranking_provenance_preserved === true
            || entry.providerRankingProvenancePreserved === true
            || raw?.provider_ranking_provenance_preserved === true
            || raw?.providerRankingProvenancePreserved === true;
        const verified = entry.provider_ranking_provenance_receipt_consumption_verified === true
            || entry.providerRankingProvenanceReceiptConsumptionVerified === true
            || raw?.provider_ranking_provenance_receipt_consumption_verified === true;
        const repairStatus = String(entry.provider_ranking_provenance_repair_status || entry.repairStatus || entry.repair_status || raw?.provider_ranking_provenance_repair_status || "").trim().toLowerCase();
        const repairGapType = String(entry.provider_ranking_provenance_repair_gap_type || entry.repairGapType || entry.repair_gap_type || raw?.provider_ranking_provenance_repair_gap_type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
        const row = {
            schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distilled-row-v1",
            version: exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || raw?.work_item_id || "").trim(),
            task_id: String(entry.task_id || entry.taskId || raw?.task_id || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            dispatch_source: source,
            status,
            consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.replay_repair_consumption_source || raw?.consumption_source || "").trim(),
            consumption_state: String(entry.replay_repair_consumption_state || entry.replayRepairConsumptionState || raw?.replay_repair_consumption_state || raw?.usage_state || raw?.usageState || "").trim(),
            reason: compactText(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.reason || raw?.summary || "", 900),
            receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim().toLowerCase(),
            provider_switch_decision_receipt_id: String(entry.provider_switch_decision_receipt_id || entry.providerSwitchDecisionReceiptId || raw?.provider_switch_decision_receipt_id || "").trim(),
            provider_switch_decision_receipt_checksum: String(entry.provider_switch_decision_receipt_checksum || entry.providerSwitchDecisionReceiptChecksum || raw?.provider_switch_decision_receipt_checksum || "").trim(),
            typed_memory_rel_paths: relPaths,
            typed_memory_row_ids: rowIds,
            provider_ranking_provenance_preserved: preserved,
            provider_ranking_provenance_receipt_consumption_verified: verified,
            provider_ranking_provenance_repair_status: repairStatus,
            provider_ranking_provenance_repair_gap_type: repairGapType,
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || raw?.worker_context_packet_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
            memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
            execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row) };
    }).filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.dispatch_source === "worker_context_provider_ranking_provenance_compact_repair")
        .filter((row) => row.status === "verified")
        .filter((row) => row.provider_ranking_provenance_receipt_consumption_verified === true)
        .filter((row) => row.provider_ranking_provenance_preserved === true)
        .filter((row) => row.provider_ranking_provenance_repair_status === "completed")
        .filter((row) => row.provider_ranking_provenance_repair_gap_type === "provider_ranking_provenance_compact")
        .filter((row) => row.provider_switch_decision_receipt_id && row.provider_switch_decision_receipt_checksum)
        .filter((row) => row.typed_memory_rel_paths.length > 0 && row.typed_memory_row_ids.length > 0);
}
function mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const relPaths = uniqueStrings(rows.flatMap((row) => row.typed_memory_rel_paths || []), 80);
    const rowIds = uniqueStrings(rows.flatMap((row) => row.typed_memory_row_ids || []), 120);
    return {
        schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
        version: exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.status === "verified").length,
        preserved_count: rows.filter((row) => row.provider_ranking_provenance_preserved === true).length,
        receipt_count: uniqueStrings(rows.map((row) => row.provider_switch_decision_receipt_id).filter(Boolean), 120).length,
        rel_path_count: relPaths.length,
        row_id_count: rowIds.length,
        typed_memory_rel_paths: relPaths,
        typed_memory_row_ids: rowIds,
        rows,
        updatedAt,
    };
}
function renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Provider Ranking Provenance Compact Repair Receipt Memory",
        "",
        `Generated by CCM provider ranking provenance compact repair receipt distillation at ${options.updatedAt || now()}.`,
        "Each row came from a verified replayRepairDispatchBriefUsage receipt after a provider ranking provenance compact repair brief was injected into a child Agent WorkerContextPacket.",
        "Stable rule: provider switch execution history is ranking evidence only, not authorization. These rows help future Agents recall how to preserve typed MEMORY.md provider ranking provenance through compact retry; they do not authorize provider switches.",
        "",
        "## Verified Repair Receipts",
    ];
    for (const row of rows.slice(-80).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.task_id ? `task=${row.task_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.provider_switch_decision_receipt_id ? `providerReceipt=${row.provider_switch_decision_receipt_id}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [verified] ${ids || row.row_id}; preserved=${row.provider_ranking_provenance_preserved === true}; repair=${row.provider_ranking_provenance_repair_gap_type || "provider_ranking_provenance_compact"}.`);
        if (row.typed_memory_rel_paths?.length)
            lines.push(`  Typed MEMORY.md relPaths: ${row.typed_memory_rel_paths.slice(0, 8).join(", ")}.`);
        if (row.typed_memory_row_ids?.length)
            lines.push(`  Typed MEMORY.md rowIds: ${row.typed_memory_row_ids.slice(0, 10).join(", ")}.`);
        if (row.provider_switch_decision_receipt_checksum)
            lines.push(`  Provider switch receipt checksum: ${row.provider_switch_decision_receipt_checksum}.`);
        if (row.reason)
            lines.push(`  Receipt reason: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- For future compact retries, keep provider ranking provenance compact-safe by preserving typed MEMORY.md rel paths, row ids, and the matching provider switch decision receipt checksum in the WorkerContextPacket and compact outcome ledger.");
    lines.push("- Never use this memory as provider-switch authority; require a fresh valid provider switch decision receipt for each explicit switch.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
            version: exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = providerRankingProvenanceCompactRepairReceiptConsumptionArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "provider-ranking-provenance-compact-repair-receipt-memory",
            name: "Provider ranking provenance compact repair receipt memory",
            description: "Verified child Agent receipts proving provider ranking provenance compact repair consumed typed MEMORY.md and provider switch receipt context.",
            source: "auto:provider-ranking-provenance-compact-repair-receipt-consumption-distillation",
            updatedAt,
            body: renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        providerRankingProvenanceCompactRepairReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distillation-v1",
        version: exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        verifiedCount: archive.verified_count,
        preservedCount: archive.preserved_count,
        receiptCount: archive.receipt_count,
        relPathCount: archive.rel_path_count,
        rowIdCount: archive.row_id_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function postCompactReinjectionRepairReceiptConsumptionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.rows) ? group.rows : []),
        ...(Array.isArray(group.bindings) ? group.bindings : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function normalizePostCompactReinjectionRepairReceiptUsageState(value) {
    const state = String(value || "").trim().toLowerCase();
    if (["used", "consumed", "applied"].includes(state))
        return "used";
    if (["verified", "checked", "rechecked", "reviewed", "validated", "confirmed"].includes(state))
        return "verified";
    if (["ignored", "skipped", "unused", "not_used", "not-used", "not used"].includes(state))
        return "ignored";
    return "";
}
function postCompactReinjectionRepairReceiptConsumptionRowId(row = {}) {
    return `post-compact-reinjection-repair-receipt:${checksum([
        row.timeline_binding_id,
        row.brief_id,
        row.work_item_id,
        row.reinjection_gate_id,
        row.post_compact_candidate_id,
        row.task_agent_session_id,
        row.native_session_id,
        row.completion_source,
        row.resolution_reason,
    ], 24)}`;
}
function normalizePostCompactReinjectionRepairReceiptConsumptionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return postCompactReinjectionRepairReceiptConsumptionInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const workItem = raw?.work_item || raw?.workItem || {};
        const usageState = normalizePostCompactReinjectionRepairReceiptUsageState(entry.post_compact_reinjection_receipt_usage_state
            || entry.postCompactReinjectionReceiptUsageState
            || raw?.usage_state
            || raw?.usageState);
        const completionSource = String(raw?.completion_source
            || raw?.completionSource
            || workItem.completion_source
            || workItem.completionSource
            || entry.completion_source
            || entry.completionSource
            || "").trim();
        const resolutionReason = String(raw?.resolution_reason
            || raw?.resolutionReason
            || workItem.resolution_reason
            || workItem.resolutionReason
            || entry.resolution_reason
            || entry.resolutionReason
            || "").trim();
        const row = {
            schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distilled-row-v1",
            version: exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || workItem.work_item_id || workItem.id || raw?.work_item_id || "").trim(),
            task_id: String(entry.task_id || entry.taskId || raw?.task_id || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            dispatch_source: String(entry.source || entry.dispatch_source || raw?.source || "").trim(),
            component: String(entry.component || raw?.component || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            reinjection_gate_id: String(entry.reinjection_gate_id || entry.reinjectionGateId || raw?.reinjection_gate_id || workItem.reinjection_gate_id || "").trim(),
            post_compact_candidate_id: String(entry.post_compact_candidate_id || entry.postCompactCandidateId || raw?.post_compact_candidate_id || workItem.post_compact_candidate_id || "").trim(),
            post_compact_candidate_kind: String(entry.post_compact_candidate_kind || entry.postCompactCandidateKind || raw?.post_compact_candidate_kind || workItem.post_compact_candidate_kind || "").trim(),
            post_compact_candidate_value: compactText(entry.post_compact_candidate_value || entry.postCompactCandidateValue || raw?.post_compact_candidate_value || workItem.post_compact_candidate_value || "", 1200),
            post_compact_candidate_source_message_id: String(entry.post_compact_candidate_source_message_id || entry.postCompactCandidateSourceMessageId || raw?.post_compact_candidate_source_message_id || workItem.post_compact_candidate_source_message_id || "").trim(),
            usage_state: usageState,
            category: usageState === "ignored" ? "caution" : "restored",
            current_source_verified: entry.post_compact_reinjection_current_source_verified === true
                || entry.postCompactReinjectionCurrentSourceVerified === true
                || raw?.current_source_verified === true
                || raw?.currentSourceVerified === true,
            receipt_reason: compactText(entry.post_compact_reinjection_receipt_reason || entry.postCompactReinjectionReceiptReason || raw?.receipt_reason || raw?.reason || "", 900),
            memory_receipt_matched: entry.post_compact_reinjection_memory_receipt_matched === true
                || entry.postCompactReinjectionMemoryReceiptMatched === true
                || raw?.memory_receipt_matched === true,
            task_session_matched: entry.post_compact_reinjection_task_session_matched === true
                || entry.postCompactReinjectionTaskSessionMatched === true
                || raw?.task_session_matched === true,
            native_session_matched: entry.post_compact_reinjection_native_session_matched === true
                || entry.postCompactReinjectionNativeSessionMatched === true
                || raw?.native_session_matched === true,
            receipt_verified: entry.post_compact_reinjection_receipt_verified === true
                || entry.postCompactReinjectionReceiptVerified === true
                || raw?.receipt_verified === true,
            receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim().toLowerCase(),
            consumption_status: String(entry.replay_repair_consumption_status || entry.replayRepairConsumptionStatus || raw?.consumption_status || "").trim().toLowerCase(),
            consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.consumption_source || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || raw?.worker_context_packet_id || "").trim(),
            worker_handoff_id: String(entry.worker_handoff_id || entry.workerHandoffId || raw?.worker_handoff_id || "").trim(),
            memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
            memory_context_snapshot_checksum: String(entry.memory_context_snapshot_checksum || entry.memoryContextSnapshotChecksum || raw?.memory_context_snapshot_checksum || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
            native_session_id: String(entry.native_session_id || entry.nativeSessionId || raw?.native_session_id || "").trim(),
            execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
            event_types: uniqueStrings(Array.isArray(entry.event_types) ? entry.event_types : Array.isArray(raw?.event_types) ? raw.event_types : [], 24),
            completion_source: completionSource,
            resolution_reason: resolutionReason,
            completed_at: String(raw?.completed_at || raw?.completedAt || workItem.completedAt || workItem.completed_at || entry.completed_at || entry.updated_at || options.updatedAt || now()),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            reuse_policy: "historical_repair_evidence_requires_current_source_reverification",
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: postCompactReinjectionRepairReceiptConsumptionRowId(row) };
    }).filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.dispatch_source === "compact_boundary_replay_repair")
        .filter((row) => row.component === "post_compact_reinject")
        .filter((row) => ["used", "verified", "ignored"].includes(row.usage_state))
        .filter((row) => row.receipt_verified === true)
        .filter((row) => row.memory_receipt_matched === true)
        .filter((row) => row.task_session_matched === true && row.native_session_matched === true)
        .filter((row) => row.reinjection_gate_id && row.post_compact_candidate_id && row.post_compact_candidate_kind)
        .filter((row) => row.brief_id && row.work_item_id && row.task_agent_session_id && row.native_session_id)
        .filter((row) => row.usage_state === "ignored" ? !!row.receipt_reason : row.current_source_verified === true)
        .filter((row) => row.completion_source === "post_compact_reinjection_replay_repair_receipt_consumption")
        .filter((row) => row.resolution_reason === "post_compact_reinjection_repair_receipt_verified");
}
function mergePostCompactReinjectionRepairReceiptConsumptionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || postCompactReinjectionRepairReceiptConsumptionRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || postCompactReinjectionRepairReceiptConsumptionRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function postCompactReinjectionRepairReceiptConsumptionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
        version: exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        restored_count: rows.filter((row) => row.category === "restored").length,
        caution_count: rows.filter((row) => row.category === "caution").length,
        used_count: rows.filter((row) => row.usage_state === "used").length,
        verified_count: rows.filter((row) => row.usage_state === "verified").length,
        ignored_count: rows.filter((row) => row.usage_state === "ignored").length,
        current_source_verified_count: rows.filter((row) => row.current_source_verified === true).length,
        task_session_count: uniqueStrings(rows.map((row) => row.task_agent_session_id).filter(Boolean), 240).length,
        native_session_count: uniqueStrings(rows.map((row) => row.native_session_id).filter(Boolean), 240).length,
        rows,
        updatedAt,
    };
}
function renderPostCompactReinjectionRepairReceiptConsumptionBody(title, rows = [], options = {}) {
    const lines = [
        `# ${title}`,
        "",
        `Generated by CCM post-compact reinjection repair receipt distillation at ${options.updatedAt || now()}.`,
        "Each row is a verified completion from the exact bound child Agent task/native session after the exact reinjection gate and candidate were classified with postCompactCandidateUsage plus matching memoryUsed or memoryIgnored evidence.",
        "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Future use must reverify the current source before treating the recovered candidate as fresh task context.",
        "",
        "## Verified Completion Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.task_id ? `task=${row.task_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
            row.timeline_binding_id ? `timeline=${row.timeline_binding_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.usage_state}] ${ids || row.row_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
        lines.push(`  Candidate: gate=${row.reinjection_gate_id}; id=${row.post_compact_candidate_id}; kind=${row.post_compact_candidate_kind}; value=${row.post_compact_candidate_value || ""}; source_message=${row.post_compact_candidate_source_message_id || ""}.`);
        lines.push(`  Bound session: task_agent_session=${row.task_agent_session_id}; native_session=${row.native_session_id}; execution=${row.execution_id || ""}; packet=${row.worker_context_packet_id || ""}; handoff=${row.worker_handoff_id || ""}; snapshot=${row.memory_context_snapshot_id || ""}.`);
        lines.push(`  Receipt: currentSourceVerified=${row.current_source_verified === true}; memoryReceiptMatched=${row.memory_receipt_matched === true}; taskSessionMatched=${row.task_session_matched === true}; nativeSessionMatched=${row.native_session_matched === true}.`);
        if (row.receipt_reason)
            lines.push(`  Receipt reason: ${compactText(row.receipt_reason, 900).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Recall this memory to avoid reopening an already-proven identical repair without evidence.");
    lines.push("- Before injecting the candidate into a future child Agent session, re-read or revalidate the current repository/source state and obtain a new usage receipt for that session.");
    return lines.join("\n").trim() + "\n";
}
function distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
            version: exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePostCompactReinjectionRepairReceiptConsumptionRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergePostCompactReinjectionRepairReceiptConsumptionRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = postCompactReinjectionRepairReceiptConsumptionArchive(merged.rows, { updatedAt });
    const writes = [];
    const restoredRows = archive.rows.filter((row) => row.category === "restored");
    const cautionRows = archive.rows.filter((row) => row.category === "caution");
    if (restoredRows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "post-compact-reinjection-repair-receipt-memory",
            name: "Post-compact reinjection repair receipt memory",
            description: "Verified exact gate/candidate repair completions bound to child Agent task and native sessions; historical recovery evidence requires current-source revalidation before reuse.",
            source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
            updatedAt,
            body: renderPostCompactReinjectionRepairReceiptConsumptionBody("Post-Compact Reinjection Repair Receipt Memory", restoredRows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    if (cautionRows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "post-compact-reinjection-repair-receipt-cautions",
            name: "Post-compact reinjection repair receipt cautions",
            description: "Verified ignored post-compact reinjection candidates; retain the closure evidence without promoting the ignored candidate into future task context.",
            source: "auto:post-compact-reinjection-repair-receipt-consumption-distillation",
            updatedAt,
            body: renderPostCompactReinjectionRepairReceiptConsumptionBody("Post-Compact Reinjection Repair Receipt Cautions", cautionRows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        postCompactReinjectionRepairReceiptConsumptionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1",
        version: exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        restoredCount: archive.restored_count,
        cautionCount: archive.caution_count,
        usedCount: archive.used_count,
        verifiedCount: archive.verified_count,
        ignoredCount: archive.ignored_count,
        currentSourceVerifiedCount: archive.current_source_verified_count,
        taskSessionCount: archive.task_session_count,
        nativeSessionCount: archive.native_session_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function postCompactReceiptMemoryUsageRepairCompletionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
    ];
    return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}
function postCompactReceiptMemoryUsageRepairCompletionRowId(row = {}) {
    return `post-compact-receipt-memory-usage-repair-completion:${checksum([
        row.groupId,
        row.work_item_id,
        row.brief_id,
        row.timeline_binding_id,
        row.original_worker_context_packet_id,
        row.repair_task_agent_session_id,
        row.repair_native_session_id,
        row.required_doc_rel_paths,
        row.completion_source,
    ], 24)}`;
}
function normalizePostCompactReceiptMemoryUsageRepairCompletionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    const requiredEvents = ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"];
    return postCompactReceiptMemoryUsageRepairCompletionInputRows(input).map((raw, index) => {
        const item = raw?.work_item || raw?.workItem || raw?.item || raw || {};
        const entry = raw?.entry || raw?.binding || raw?.timeline_binding || item.replay_repair_timeline_binding || raw || {};
        const proof = raw?.proof || item.post_compact_receipt_memory_usage_repair_receipt || entry.post_compact_receipt_memory_usage_repair_receipt || {};
        const requiredDocRelPaths = uniqueStrings([
            ...(Array.isArray(proof.required_doc_rel_paths) ? proof.required_doc_rel_paths : []),
            ...(Array.isArray(proof.requiredDocRelPaths) ? proof.requiredDocRelPaths : []),
            ...(Array.isArray(entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
            ...(Array.isArray(item.post_compact_receipt_memory_required_doc_rel_paths) ? item.post_compact_receipt_memory_required_doc_rel_paths : []),
        ], 40);
        const coveredDocRelPaths = uniqueStrings([
            ...(Array.isArray(proof.covered_doc_rel_paths) ? proof.covered_doc_rel_paths : []),
            ...(Array.isArray(proof.coveredDocRelPaths) ? proof.coveredDocRelPaths : []),
            ...(Array.isArray(entry.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? entry.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
        ], 40);
        const rawCoverageRows = Array.isArray(proof.coverage_rows)
            ? proof.coverage_rows
            : Array.isArray(proof.coverageRows)
                ? proof.coverageRows
                : Array.isArray(entry.post_compact_receipt_memory_usage_repair_coverage_rows)
                    ? entry.post_compact_receipt_memory_usage_repair_coverage_rows
                    : [];
        const coverageRows = rawCoverageRows.map((coverage) => ({
            rel_path: String(coverage.rel_path || coverage.relPath || "").trim(),
            usage_state: String(coverage.usage_state || coverage.usageState || (coverage.ignoredCovered === true || coverage.ignored_covered === true ? "ignored" : coverage.usedCovered === true || coverage.used_covered === true ? "verified" : "missing")).trim().toLowerCase(),
            covered: coverage.covered === true,
            compliant: coverage.compliant === true,
            current_source_verified: coverage.current_source_verified === true || coverage.currentSourceVerified === true,
            ignored_reason_covered: coverage.ignored_reason_covered === true || coverage.ignoredReasonCovered === true,
            reason: compactText(coverage.reason || coverage.ignored_reason || coverage.ignoredReason || "", 700),
        })).filter((coverage) => coverage.rel_path);
        const eventTypes = uniqueStrings([
            ...(Array.isArray(entry.event_types) ? entry.event_types : []),
            ...(Array.isArray(proof.event_types) ? proof.event_types : []),
        ], 24);
        const originalTaskAgentSessionId = String(entry.original_task_agent_session_id || item.original_task_agent_session_id || proof.original_task_agent_session_id || proof.originalTaskAgentSessionId || "").trim();
        const originalNativeSessionId = String(entry.original_native_session_id || item.original_native_session_id || proof.original_native_session_id || proof.originalNativeSessionId || "").trim();
        const repairTaskAgentSessionId = String(proof.task_agent_session_id || proof.taskAgentSessionId || entry.task_agent_session_id || "").trim();
        const repairNativeSessionId = String(proof.native_session_id || proof.nativeSessionId || entry.native_session_id || "").trim();
        const completionSource = String(raw?.completion_source || item.completion_source || entry.completion_source || "").trim();
        const resolutionReason = String(raw?.resolution_reason || raw?.resolutionReason || item.resolutionReason || item.resolution_reason || entry.resolution_reason || "").trim();
        const row = {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distilled-row-v1",
            version: exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || item.groupId || item.group_id || fallbackGroupId || "").trim(),
            source: String(entry.source || item.source || "").trim(),
            project: String(entry.project || item.target_project || item.project || "").trim(),
            task_id: String(entry.task_id || "").trim(),
            work_item_id: String(entry.work_item_id || item.work_item_id || item.id || proof.work_item_id || "").trim(),
            brief_id: String(entry.brief_id || proof.brief_id || "").trim(),
            timeline_binding_id: String(entry.timeline_binding_id || proof.timeline_binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || item.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || item.dispatch_key || "").trim(),
            original_worker_context_packet_id: String(entry.original_worker_context_packet_id || item.original_worker_context_packet_id || proof.original_worker_context_packet_id || "").trim(),
            original_binding_id: String(entry.original_binding_id || item.original_binding_id || proof.original_binding_id || "").trim(),
            original_assignment_id: String(entry.original_assignment_id || item.original_assignment_id || proof.original_assignment_id || "").trim(),
            original_dispatch_key: String(entry.original_dispatch_key || item.original_dispatch_key || proof.original_dispatch_key || "").trim(),
            original_task_agent_session_id: originalTaskAgentSessionId,
            original_native_session_id: originalNativeSessionId,
            repair_task_agent_session_id: repairTaskAgentSessionId,
            repair_native_session_id: repairNativeSessionId,
            repair_execution_id: String(proof.execution_id || entry.execution_id || "").trim(),
            required_doc_rel_paths: requiredDocRelPaths,
            covered_doc_rel_paths: coveredDocRelPaths,
            coverage_rows: coverageRows,
            original_gap_codes: uniqueStrings([
                ...(Array.isArray(entry.post_compact_receipt_memory_gap_codes) ? entry.post_compact_receipt_memory_gap_codes : []),
                ...(Array.isArray(item.post_compact_receipt_memory_gap_codes) ? item.post_compact_receipt_memory_gap_codes : []),
            ], 24),
            all_docs_compliant: proof.all_docs_compliant === true || proof.allDocsCompliant === true || entry.post_compact_receipt_memory_usage_repair_all_docs_compliant === true,
            historical_boundary_covered: proof.historical_boundary_covered === true || proof.historicalBoundaryCovered === true || entry.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true,
            task_session_matched: proof.task_session_matched === true || entry.post_compact_receipt_memory_usage_repair_task_session_matched === true,
            native_session_matched: proof.native_session_matched === true || entry.post_compact_receipt_memory_usage_repair_native_session_matched === true,
            receipt_verified: proof.verified === true || entry.post_compact_receipt_memory_usage_repair_verified === true,
            receipt_status: String(entry.receipt_status || "").trim().toLowerCase(),
            consumption_status: String(entry.replay_repair_consumption_status || "").trim().toLowerCase(),
            consumption_source: String(entry.replay_repair_consumption_source || "").trim(),
            event_types: eventTypes,
            completion_source: completionSource,
            resolution_reason: resolutionReason,
            completed_at: String(proof.completed_at || item.completedAt || item.completed_at || raw?.completed_at || options.updatedAt || now()),
            reuse_policy: "historical_corrected_receipt_evidence_requires_new_session_current_source_reverification",
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: postCompactReceiptMemoryUsageRepairCompletionRowId(row) };
    }).filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair")
        .filter((row) => row.completion_source === "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption")
        .filter((row) => row.resolution_reason === "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified")
        .filter((row) => row.receipt_verified === true && row.all_docs_compliant === true && row.historical_boundary_covered === true)
        .filter((row) => row.task_session_matched === true && row.native_session_matched === true)
        .filter((row) => row.work_item_id && row.brief_id && row.timeline_binding_id)
        .filter((row) => row.original_worker_context_packet_id && row.original_binding_id)
        .filter((row) => row.repair_task_agent_session_id && row.repair_native_session_id)
        .filter((row) => row.repair_task_agent_session_id !== row.original_task_agent_session_id && row.repair_native_session_id !== row.original_native_session_id)
        .filter((row) => row.required_doc_rel_paths.length > 0 && row.required_doc_rel_paths.every((relPath) => row.covered_doc_rel_paths.includes(relPath)))
        .filter((row) => row.required_doc_rel_paths.every((relPath) => row.coverage_rows.some((coverage) => coverage.rel_path === relPath && coverage.covered === true && coverage.compliant === true)))
        .filter((row) => requiredEvents.every(eventType => row.event_types.includes(eventType)));
}
function mergePostCompactReceiptMemoryUsageRepairCompletionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || postCompactReceiptMemoryUsageRepairCompletionRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || postCompactReceiptMemoryUsageRepairCompletionRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.completed_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function postCompactReceiptMemoryUsageRepairCompletionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
        version: exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.receipt_verified === true).length,
        original_session_count: uniqueStrings(rows.flatMap((row) => [row.original_task_agent_session_id, row.original_native_session_id]).filter(Boolean), 480).length,
        repair_session_count: uniqueStrings(rows.flatMap((row) => [row.repair_task_agent_session_id, row.repair_native_session_id]).filter(Boolean), 480).length,
        required_doc_count: uniqueStrings(rows.flatMap((row) => row.required_doc_rel_paths || []), 240).length,
        rows,
        updatedAt,
    };
}
function renderPostCompactReceiptMemoryUsageRepairCompletionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Receipt Memory Usage Repair Completions",
        "",
        `Generated by CCM corrected-receipt completion distillation at ${options.updatedAt || now()}.`,
        "Each row proves that a child Agent receipt-memory usage gap was corrected in a newly bound repair task/native session after the complete dispatch timeline was observed.",
        "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Every future child Agent session must independently classify recalled memory in memoryUsed or memoryIgnored and reverify the current source before used/verified memory is accepted.",
        "Historical task/native session ids are evidence only and never authorize a future session.",
        "",
        "## Verified Corrected-Receipt Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [verified] work_item=${row.work_item_id}; brief=${row.brief_id}; timeline=${row.timeline_binding_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
        lines.push(`  Original evidence: packet=${row.original_worker_context_packet_id}; binding=${row.original_binding_id}; assignment=${row.original_assignment_id || ""}; dispatch=${row.original_dispatch_key || ""}; task_agent_session=${row.original_task_agent_session_id || ""}; native_session=${row.original_native_session_id || ""}.`);
        lines.push(`  Corrected receipt session: task_agent_session=${row.repair_task_agent_session_id}; native_session=${row.repair_native_session_id}; execution=${row.repair_execution_id || ""}; allDocsCompliant=${row.all_docs_compliant === true}; historicalBoundaryCovered=${row.historical_boundary_covered === true}.`);
        for (const coverage of row.coverage_rows || []) {
            lines.push(`  Memory doc: ${coverage.rel_path}; usageState=${coverage.usage_state}; currentSourceVerified=${coverage.current_source_verified === true}; ignoredReasonCovered=${coverage.ignored_reason_covered === true}; compliant=${coverage.compliant === true}${coverage.reason ? `; reason=${compactText(coverage.reason, 500).replace(/\n/g, " ")}` : ""}.`);
        }
        if (row.original_gap_codes?.length)
            lines.push(`  Original gaps: ${row.original_gap_codes.join(", ")}.`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Use this memory to avoid reopening an identical corrected-receipt repair when the exact completion proof still applies.");
    lines.push("- Do not reuse the historical repair session as current authority; bind any future use to the new task/native session and produce a new memory usage receipt.");
    return lines.join("\n").trim() + "\n";
}
function distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
            version: exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePostCompactReceiptMemoryUsageRepairCompletionRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergePostCompactReceiptMemoryUsageRepairCompletionRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = postCompactReceiptMemoryUsageRepairCompletionArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "post-compact-receipt-memory-usage-repair-completions",
            name: "Post-compact receipt memory usage repair completions",
            description: "Verified corrected-receipt completions from new repair sessions, with per-document usage evidence and mandatory future current-source reverification.",
            source: "auto:post-compact-receipt-memory-usage-repair-completion-distillation",
            updatedAt,
            body: renderPostCompactReceiptMemoryUsageRepairCompletionBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        postCompactReceiptMemoryUsageRepairCompletionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
        version: exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        verifiedCount: archive.verified_count,
        originalSessionCount: archive.original_session_count,
        repairSessionCount: archive.repair_session_count,
        requiredDocCount: archive.required_doc_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function postCompactCompletionMemoryPreservationRepairClosureInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const direct = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.completions) ? input.completions : []),
    ];
    if (direct.length)
        return direct;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => (Array.isArray(group.items) ? group.items : []).map((row) => ({
        ...row,
        groupId: row.groupId || row.group_id || group.groupId || group.group_id || "",
    })));
}
function postCompactCompletionMemoryPreservationRepairClosureRowId(row = {}) {
    return `post-compact-completion-memory-preservation-repair-closure:${checksum([
        row.groupId,
        row.work_item_id,
        row.failed_outcome_id,
        row.corrected_outcome_id,
        row.completion_doc_rel_paths,
        row.completion_work_item_ids,
        row.completion_timeline_binding_ids,
        row.current_session_binding_id,
        row.current_task_agent_session_id,
        row.current_native_session_id,
    ], 24)}`;
}
function normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return postCompactCompletionMemoryPreservationRepairClosureInputRows(input).map((raw, index) => {
        const item = raw?.item || raw?.completion || raw || {};
        const proof = item.corrected_retry_proof || item.correctedRetryProof || {};
        const historicalTaskSessions = uniqueStrings(item.completion_preservation_historical_task_agent_session_ids || item.completionPreservationHistoricalTaskAgentSessionIds || [], 32);
        const historicalNativeSessions = uniqueStrings(item.completion_preservation_historical_native_session_ids || item.completionPreservationHistoricalNativeSessionIds || [], 32);
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distilled-row-v1",
            version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
            groupId: String(item.groupId || item.group_id || item.scopeId || item.scope_id || fallbackGroupId).trim(),
            source: String(item.source || "").trim(),
            component: String(item.component || "").trim(),
            project: String(item.target_project || item.project || item.target || "").trim(),
            work_item_id: String(item.work_item_id || item.id || "").trim(),
            assignment_id: String(item.assignment_id || item.taskId || "").trim(),
            dispatch_key: String(item.dispatch_key || "").trim(),
            worker_context_packet_id: String(item.worker_context_packet_id || "").trim(),
            binding_id: String(item.binding_id || item.worker_context_packet_binding_id || "").trim(),
            failed_retry_id: String(item.compact_retry_id || proof.failed_retry_id || "").trim(),
            failed_outcome_id: String(item.compact_outcome_id || proof.failed_outcome_id || "").trim(),
            failed_hook_run_id: String(item.compact_hook_run_id || "").trim(),
            corrected_retry_id: String(item.corrected_compact_retry_id || proof.corrected_retry_id || "").trim(),
            corrected_outcome_id: String(item.corrected_compact_outcome_id || proof.corrected_outcome_id || "").trim(),
            corrected_hook_run_id: String(item.corrected_compact_hook_run_id || proof.corrected_hook_run_id || "").trim(),
            completion_doc_rel_paths: uniqueStrings(item.completion_preservation_completion_doc_rel_paths || item.completionPreservationCompletionDocRelPaths || [], 24),
            required_doc_rel_paths: uniqueStrings(item.completion_preservation_required_doc_rel_paths || item.completionPreservationRequiredDocRelPaths || [], 24),
            completion_work_item_ids: uniqueStrings(item.completion_preservation_work_item_ids || item.completionPreservationWorkItemIds || [], 32),
            completion_timeline_binding_ids: uniqueStrings(item.completion_preservation_timeline_binding_ids || item.completionPreservationTimelineBindingIds || [], 32),
            historical_task_agent_session_ids: historicalTaskSessions,
            historical_native_session_ids: historicalNativeSessions,
            current_session_binding_id: String(item.completion_preservation_current_session_binding_id || item.completionPreservationCurrentSessionBindingId || "").trim(),
            current_task_agent_session_id: String(item.completion_preservation_current_task_agent_session_id || item.completionPreservationCurrentTaskAgentSessionId || "").trim(),
            current_native_session_id: String(item.completion_preservation_current_native_session_id || item.completionPreservationCurrentNativeSessionId || "").trim(),
            original_gap_codes: uniqueStrings(item.completion_preservation_gap_codes || item.completionPreservationGapCodes || [], 32),
            exact_identity_restored: proof.exact_identity_restored === true || proof.exactIdentityRestored === true,
            current_session_boundary_restored: proof.current_session_boundary_restored === true || proof.currentSessionBoundaryRestored === true,
            historical_sessions_remain_evidence_only: proof.historical_sessions_remain_evidence_only === true || proof.historicalSessionsRemainEvidenceOnly === true,
            completion_source: String(item.completion_source || "").trim(),
            resolution_reason: String(item.resolutionReason || item.resolution_reason || "").trim(),
            completed_at: String(item.completedAt || item.completed_at || proof.verified_at || options.updatedAt || now()),
            reuse_policy: "historical_compaction_repair_closure_requires_new_session_current_source_reverification",
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        row.row_id = postCompactCompletionMemoryPreservationRepairClosureRowId(row);
        return row;
    })
        .filter((row) => row.groupId === fallbackGroupId || (!fallbackGroupId && !!row.groupId))
        .filter((row) => row.source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair")
        .filter((row) => row.component === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation")
        .filter((row) => row.completion_source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry")
        .filter((row) => row.resolution_reason === "completion_memory_compaction_preservation_corrected_retry_verified")
        .filter((row) => row.exact_identity_restored && row.current_session_boundary_restored && row.historical_sessions_remain_evidence_only)
        .filter((row) => row.work_item_id && row.failed_retry_id && row.failed_outcome_id && row.corrected_retry_id && row.corrected_outcome_id)
        .filter((row) => row.failed_retry_id !== row.corrected_retry_id && row.failed_outcome_id !== row.corrected_outcome_id)
        .filter((row) => row.completion_doc_rel_paths.length > 0 && row.required_doc_rel_paths.length > 0)
        .filter((row) => row.completion_work_item_ids.length > 0 && row.completion_timeline_binding_ids.length > 0)
        .filter((row) => row.current_session_binding_id && row.current_task_agent_session_id && row.current_native_session_id)
        .filter((row) => !row.historical_task_agent_session_ids.includes(row.current_task_agent_session_id))
        .filter((row) => !row.historical_native_session_ids.includes(row.current_native_session_id));
}
function mergePostCompactCompletionMemoryPreservationRepairClosureRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.completed_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function postCompactCompletionMemoryPreservationRepairClosureArchive(rows = [], options = {}) {
    return {
        schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.exact_identity_restored && row.current_session_boundary_restored).length,
        failed_outcome_count: uniqueStrings(rows.map((row) => row.failed_outcome_id), 480).length,
        corrected_outcome_count: uniqueStrings(rows.map((row) => row.corrected_outcome_id), 480).length,
        completion_doc_count: uniqueStrings(rows.flatMap((row) => row.completion_doc_rel_paths || []), 240).length,
        completion_work_item_count: uniqueStrings(rows.flatMap((row) => row.completion_work_item_ids || []), 480).length,
        timeline_binding_count: uniqueStrings(rows.flatMap((row) => row.completion_timeline_binding_ids || []), 480).length,
        rows,
        updatedAt: String(options.updatedAt || now()),
    };
}
function renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Repair Closures",
        "",
        `Generated by CCM compact-preservation repair closure distillation at ${options.updatedAt || now()}.`,
        "Each row records a failed compact outcome whose corrected-receipt completion memory was restored only by a newer, different compact retry/outcome with exact identity and current-session authority proof.",
        "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Every future child Agent session must reverify the current source and classify this recalled MEMORY.md in memoryUsed or memoryIgnored.",
        "All task/native sessions listed here are historical evidence in a future child session and never authorize that future session.",
        "",
        "## Verified Closure Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [verified] repair_work_item=${row.work_item_id}; failed_retry=${row.failed_retry_id}; failed_outcome=${row.failed_outcome_id}; corrected_retry=${row.corrected_retry_id}; corrected_outcome=${row.corrected_outcome_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
        lines.push(`  Restored identity: completion_docs=${(row.completion_doc_rel_paths || []).join(",")}; required_docs=${(row.required_doc_rel_paths || []).join(",")}; completion_work_items=${(row.completion_work_item_ids || []).join(",")}; timelines=${(row.completion_timeline_binding_ids || []).join(",")}.`);
        lines.push(`  Historical closure session: binding=${row.current_session_binding_id}; task_agent_session=${row.current_task_agent_session_id}; native_session=${row.current_native_session_id}; exactIdentityRestored=${row.exact_identity_restored === true}; currentSessionBoundaryRestored=${row.current_session_boundary_restored === true}; historicalSessionsRemainEvidenceOnly=${row.historical_sessions_remain_evidence_only === true}.`);
        if (row.original_gap_codes?.length)
            lines.push(`  Original preservation gaps: ${row.original_gap_codes.join(", ")}.`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Use this history to avoid reopening the identical failed retry/outcome after its exact corrected outcome is still applicable.");
    lines.push("- Never use this history as current repository truth or current-session authority; re-read current sources and produce a fresh memory usage receipt.");
    return lines.join("\n").trim() + "\n";
}
function distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
            version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
    const merged = mergePostCompactCompletionMemoryPreservationRepairClosureRows(Array.isArray(previousArchive.rows) ? previousArchive.rows : [], incomingRows, { ...options, updatedAt });
    const archive = postCompactCompletionMemoryPreservationRepairClosureArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "post-compact-completion-memory-preservation-repair-closures",
            name: "Post-compact completion memory preservation repair closures",
            description: "Verified newer compact outcomes that restored corrected-receipt completion identity and session authority, with mandatory future current-source reverification.",
            source: "auto:post-compact-completion-memory-preservation-repair-closure-distillation",
            updatedAt,
            body: renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        postCompactCompletionMemoryPreservationRepairClosureArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        verifiedCount: archive.verified_count,
        failedOutcomeCount: archive.failed_outcome_count,
        correctedOutcomeCount: archive.corrected_outcome_count,
        completionDocCount: archive.completion_doc_count,
        completionWorkItemCount: archive.completion_work_item_count,
        timelineBindingCount: archive.timeline_binding_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input = {}, options = {}) {
    const rows = Array.isArray(input) ? input : Array.isArray(input.rows) ? input.rows : [];
    return rows.map((entry) => {
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-row-v1",
            version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
            group_id: String(entry.group_id || entry.groupId || groupId || "").trim(),
            target_project: String(entry.target_project || entry.targetProject || "").trim(),
            task_id: String(entry.task_id || entry.taskId || "").trim(),
            task_text: compactText(entry.task_text || entry.taskText || "", 900),
            task_family_key: String(entry.task_family_key || entry.taskFamilyKey || "").trim(),
            task_family_tokens: uniqueStrings(entry.task_family_tokens || entry.taskFamilyTokens || [], 40),
            resolution_entry_id: String(entry.entry_id || "").trim(),
            resolution_usage_state: normalizePostCompactCompletionMemoryPreservationClosureUsageState(entry.conflict_resolution_state || entry.usage_state),
            current_source_verified: entry.current_source_verified === true,
            reason: compactText(entry.reason || "", 700),
            worker_context_packet_id: String(entry.worker_context_packet_id || "").trim(),
            binding_id: String(entry.binding_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || "").trim(),
            native_session_id: String(entry.native_session_id || "").trim(),
            execution_id: String(entry.execution_id || "").trim(),
            receipt_source: String(entry.receipt_source || "").trim(),
            receipt_status: String(entry.receipt_status || "").trim(),
            parent_arbitration_state: String(entry.conflict_parent_arbitration_state || "").trim(),
            parent_conflict_fingerprint: String(entry.conflict_parent_fingerprint || "").trim(),
            parent_conflict_ratio: Number(entry.conflict_parent_ratio || 0),
            parent_positive_weight: Number(entry.conflict_parent_positive_weight || 0),
            parent_ignored_weight: Number(entry.conflict_parent_ignored_weight || 0),
            reversible: entry.conflict_resolution_reversible === true,
            historical_branches_preserved: true,
            historical_majority_authorization_allowed: false,
            resolved_at: String(entry.generated_at || options.updatedAt || now()),
        };
        row.row_id = `post-compact-closure-conflict-resolution:${checksum([
            row.group_id,
            row.task_family_key,
            row.resolution_entry_id,
            row.task_agent_session_id,
            row.native_session_id,
            row.parent_conflict_fingerprint,
        ], 24)}`;
        return row;
    }).filter((row) => row.group_id === groupId)
        .filter((row) => row.resolution_entry_id && row.task_family_key)
        .filter((row) => row.task_agent_session_id && row.native_session_id)
        .filter((row) => row.parent_arbitration_state === "contradictory_reverify_current_session" && row.parent_conflict_fingerprint)
        .filter((row) => row.reversible === true)
        .filter((row) => row.resolution_usage_state === "ignored" ? !!row.reason : ["used", "verified"].includes(row.resolution_usage_state) && row.current_source_verified === true);
}
function renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Closure Conflict Resolutions",
        "",
        `Generated by CCM closure conflict-resolution distillation at ${options.updatedAt || now()}.`,
        "Each row records a newer current-session decision that resolved a contradictory used/verified versus ignored closure-memory history for one task family.",
        "Stable boundary: the resolution is session-bound recovery evidence, not permanent repository truth or authorization. Historical branches remain immutable and a later reliable contradiction may reopen arbitration.",
        "",
        "## Session-Bound Resolution Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [resolved:${row.resolution_usage_state}] task_family=${row.task_family_key}; resolution_entry=${row.resolution_entry_id}; parent=${row.parent_conflict_fingerprint}; resolved_at=${row.resolved_at}.`);
        lines.push(`  Current resolution session: packet=${row.worker_context_packet_id}; binding=${row.binding_id}; task_agent_session=${row.task_agent_session_id}; native_session=${row.native_session_id}; execution=${row.execution_id || ""}.`);
        lines.push(`  Verification: currentSourceVerified=${row.current_source_verified === true}; reason=${row.reason || ""}; parentState=${row.parent_arbitration_state}; parentRatio=${row.parent_conflict_ratio}; positiveWeight=${row.parent_positive_weight}; ignoredWeight=${row.parent_ignored_weight}.`);
        lines.push("  Reuse boundary: reversible=true; historicalBranchesPreserved=true; historicalMajorityAuthorizationAllowed=false.");
    }
    lines.push("");
    lines.push("## Future Session Rule");
    lines.push("- Use the newest valid resolution as ranking guidance for the same task family only, then reverify current source and return a fresh memoryUsed or memoryIgnored decision.");
    lines.push("- Never erase either historical conflict branch; reopen conflict arbitration when newer reliable opposing evidence appears.");
    return lines.join("\n").trim() + "\n";
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId) {
    return path.join(getGroupTypedMemoryDir(groupId), exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "manifest.json");
}
function conflictResolutionColdArchiveManifestChecksum(manifest = {}) {
    const value = {
        group_id: manifest.group_id || "",
        row_count: Number(manifest.row_count || 0),
        hot_row_count: Number(manifest.hot_row_count || 0),
        rows_checksum: manifest.rows_checksum || "",
        shards: (manifest.shards || []).map((shard) => ({
            bucket: shard.bucket || "",
            rel_path: shard.rel_path || "",
            content_checksum: shard.content_checksum || "",
            row_count: Number(shard.row_count || 0),
            row_ids_checksum: shard.row_ids_checksum || "",
        })),
    };
    if (manifest.generation_number !== undefined
        || manifest.generation_id
        || manifest.previous_manifest_checksum
        || manifest.previous_manifest_rel_path) {
        value.generation_number = Number(manifest.generation_number || 0);
        value.generation_id = manifest.generation_id || "";
        value.previous_manifest_checksum = manifest.previous_manifest_checksum || "";
        value.previous_manifest_rel_path = manifest.previous_manifest_rel_path || "";
    }
    return checksum(value, 48);
}
function getConflictResolutionColdArchiveManifestGenerationsDir(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "manifests");
}
function getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum) {
    return path.join(getConflictResolutionColdArchiveManifestGenerationsDir(groupId), `${safeSegment(manifestChecksum, "invalid")}.json`);
}
function conflictResolutionColdArchiveShardFile(groupId, relPath) {
    const typedDir = path.resolve(getGroupTypedMemoryDir(groupId));
    const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
    const file = path.resolve(typedDir, String(relPath || ""));
    if (file !== coldDir && !file.startsWith(`${coldDir}${path.sep}`))
        throw new Error("conflict-resolution cold archive shard path escapes group archive directory");
    return file;
}
function readConflictResolutionColdArchiveManifest(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
    const manifest = readJson(file, null);
    if (!manifest)
        return null;
    return { ...manifest, file };
}
function readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor = {}) {
    try {
        const file = conflictResolutionColdArchiveShardFile(groupId, descriptor.rel_path || descriptor.relPath || "");
        const shard = readJson(file, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = checksum(rows, 48);
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && String(shard.bucket || "") === String(descriptor.bucket || "")
            && calculatedChecksum === String(descriptor.content_checksum || "")
            && calculatedChecksum === String(shard.content_checksum || "")
            && rows.length === Number(descriptor.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId);
        return {
            valid,
            file,
            descriptor,
            shard,
            rows,
            calculatedChecksum,
            error: valid ? "" : "cold archive shard schema/group/checksum/count mismatch",
        };
    }
    catch (error) {
        return { valid: false, file: "", descriptor, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options = {}) {
    const explicitManifest = options.manifest && typeof options.manifest === "object" ? options.manifest : null;
    const manifest = explicitManifest || readConflictResolutionColdArchiveManifest(groupId);
    if (!manifest) {
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-archive-verification-v1",
            groupId,
            status: "missing",
            valid: false,
            manifestFile: getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId),
            manifest: null,
            shardCount: 0,
            verifiedShardCount: 0,
            rowCount: 0,
            rows: [],
            gaps: ["cold_archive_manifest_missing"],
        };
    }
    const manifestChecksumValid = manifest.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-manifest-v1"
        && String(manifest.group_id || "") === groupId
        && String(manifest.manifest_checksum || "") === conflictResolutionColdArchiveManifestChecksum(manifest);
    const shardResults = (Array.isArray(manifest.shards) ? manifest.shards : []).map((descriptor) => readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor));
    const rows = shardResults.flatMap((result) => result.valid ? result.rows : []);
    const rowIds = rows.map((row) => String(row.row_id || "")).filter(Boolean);
    const uniqueRowIds = new Set(rowIds);
    const rowsChecksumValid = rows.length === Number(manifest.row_count || 0)
        && uniqueRowIds.size === rows.length
        && checksum([...rows].sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || ""))), 48) === String(manifest.rows_checksum || "");
    const valid = manifestChecksumValid && shardResults.every((result) => result.valid) && rowsChecksumValid;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-archive-verification-v1",
        groupId,
        status: valid ? "ok" : "fail",
        valid,
        manifestFile: options.manifestFile || options.manifest_file || manifest.file || getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId),
        manifest,
        manifestChecksumValid,
        shardCount: shardResults.length,
        verifiedShardCount: shardResults.filter((result) => result.valid).length,
        rowCount: rows.length,
        rows: options.includeRows === true || options.include_rows === true ? rows : [],
        shardResults: shardResults.map((result) => ({
            valid: result.valid,
            file: result.file,
            bucket: result.descriptor?.bucket || "",
            rowCount: result.rows.length,
            contentChecksum: result.descriptor?.content_checksum || "",
            calculatedChecksum: result.calculatedChecksum,
            error: result.error,
        })),
        gaps: [
            ...(!manifestChecksumValid ? ["cold_archive_manifest_checksum_mismatch"] : []),
            ...shardResults.filter((result) => !result.valid).map((result) => `cold_archive_shard_invalid:${result.descriptor?.bucket || "unknown"}`),
            ...(!rowsChecksumValid ? ["cold_archive_rows_checksum_or_count_mismatch"] : []),
        ],
    };
}
function readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest = {}) {
    const checksumValue = String(currentManifest.previous_manifest_checksum || "").trim();
    if (!checksumValue)
        return null;
    const expectedFile = getConflictResolutionColdArchiveManifestGenerationFile(groupId, checksumValue);
    const expectedRelPath = path.relative(getGroupTypedMemoryDir(groupId), expectedFile).split(path.sep).join("/");
    if (String(currentManifest.previous_manifest_rel_path || "") !== expectedRelPath)
        return {
            invalidLink: true,
            expectedFile,
            expectedRelPath,
            actualRelPath: String(currentManifest.previous_manifest_rel_path || ""),
        };
    const manifest = readJson(expectedFile, null);
    return manifest ? { ...manifest, file: expectedFile } : { missing: true, expectedFile, expectedRelPath };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options = {}) {
    const currentManifest = readConflictResolutionColdArchiveManifest(groupId);
    const current = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
        manifest: currentManifest,
        manifestFile: currentManifest?.file,
        includeRows: true,
    });
    const generationNumber = Number(currentManifest?.generation_number || 0);
    const currentGenerationFile = currentManifest?.manifest_checksum
        ? getConflictResolutionColdArchiveManifestGenerationFile(groupId, currentManifest.manifest_checksum)
        : "";
    const currentGenerationManifest = currentGenerationFile ? readJson(currentGenerationFile, null) : null;
    const currentGenerationCopyValid = !!currentGenerationManifest
        && currentGenerationManifest.manifest_checksum === currentManifest?.manifest_checksum
        && conflictResolutionColdArchiveManifestChecksum(currentGenerationManifest) === currentManifest?.manifest_checksum;
    const previousManifest = currentManifest ? readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest) : null;
    const previousRequired = generationNumber >= 2 || !!currentManifest?.previous_manifest_checksum;
    const previous = previousManifest && !previousManifest.invalidLink && !previousManifest.missing
        ? verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
            manifest: previousManifest,
            manifestFile: previousManifest.file,
            includeRows: true,
        })
        : null;
    const linkValid = !previousRequired || (!!previousManifest
        && !previousManifest.invalidLink
        && !previousManifest.missing
        && String(previousManifest.manifest_checksum || "") === String(currentManifest?.previous_manifest_checksum || "")
        && Number(previousManifest.generation_number || Math.max(1, generationNumber - 1)) < generationNumber);
    const currentRowIds = new Set((current.rows || []).map((row) => String(row.row_id || "")));
    const previousRowsRecoverable = !previousRequired || (previous?.valid === true
        && (previous.rows || []).every((row) => currentRowIds.has(String(row.row_id || ""))));
    const valid = current.valid === true
        && currentGenerationCopyValid
        && (!previousRequired || previous?.valid === true)
        && linkValid
        && previousRowsRecoverable;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-generation-verification-v1",
        groupId,
        status: valid ? "ok" : "fail",
        valid,
        generationNumber,
        currentManifestChecksum: currentManifest?.manifest_checksum || "",
        currentGenerationFile,
        currentGenerationCopyValid,
        previousManifestChecksum: currentManifest?.previous_manifest_checksum || "",
        previousRequired,
        current,
        previous,
        linkValid,
        previousRowsRecoverable,
        recoverySimulationPassed: valid && previousRowsRecoverable,
        gaps: [
            ...(current.valid ? [] : ["current_manifest_generation_invalid"]),
            ...(currentGenerationCopyValid ? [] : ["current_manifest_generation_copy_invalid"]),
            ...(previousRequired && previous?.valid !== true ? ["previous_manifest_generation_invalid"] : []),
            ...(!linkValid ? ["manifest_generation_link_invalid"] : []),
            ...(!previousRowsRecoverable ? ["previous_generation_rows_not_recoverable_from_current"] : []),
        ],
    };
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options = {}) {
    const generationsDir = getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
    const candidates = [];
    try {
        for (const name of fs.readdirSync(generationsDir).filter(name => name.endsWith(".json"))) {
            const file = path.join(generationsDir, name);
            const manifest = readJson(file, null);
            if (!manifest || String(manifest.group_id || "") !== groupId)
                continue;
            const verification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
                manifest,
                manifestFile: file,
            });
            if (verification.valid)
                candidates.push({ manifest, file, verification });
        }
    }
    catch { }
    candidates.sort((a, b) => Number(b.manifest.generation_number || 0) - Number(a.manifest.generation_number || 0)
        || String(b.manifest.updated_at || "").localeCompare(String(a.manifest.updated_at || "")));
    const selected = candidates[0] || null;
    if (!selected)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-recovery-v1",
            groupId,
            status: "blocked",
            recovered: false,
            reason: "no_valid_manifest_generation",
            candidateCount: candidates.length,
        };
    const current = readConflictResolutionColdArchiveManifest(groupId);
    const currentValid = current
        ? verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, { manifest: current, manifestFile: current.file }).valid === true
        : false;
    const alreadyCurrent = currentValid && current?.manifest_checksum === selected.manifest.manifest_checksum;
    if (!alreadyCurrent && options.dryRun !== true && options.dry_run !== true) {
        writeJsonAtomic(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId), selected.manifest);
    }
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-manifest-recovery-v1",
        groupId,
        status: alreadyCurrent ? "already_current" : options.dryRun === true || options.dry_run === true ? "recoverable" : "recovered",
        recovered: alreadyCurrent || !(options.dryRun === true || options.dry_run === true),
        alreadyCurrent,
        candidateCount: candidates.length,
        selectedGenerationNumber: Number(selected.manifest.generation_number || 0),
        selectedManifestChecksum: selected.manifest.manifest_checksum || "",
        selectedManifestFile: selected.file,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "quarantine.json");
}
function listConflictResolutionColdArchiveShardFiles(groupId) {
    const root = path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "shards");
    const files = [];
    const visit = (dir) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && entry.name.endsWith(".json"))
                files.push(file);
        }
    };
    visit(root);
    return files.sort();
}
function readStandaloneConflictResolutionColdArchiveShard(groupId, file) {
    try {
        const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
        const resolved = path.resolve(file);
        if (!resolved.startsWith(`${coldDir}${path.sep}`))
            throw new Error("orphan shard path escapes cold archive");
        const shard = readJson(resolved, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = checksum(rows, 48);
        const filenameChecksum = path.basename(resolved, ".json");
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && calculatedChecksum === String(shard.content_checksum || "")
            && calculatedChecksum === filenameChecksum
            && rows.length === Number(shard.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId && row.row_id);
        return { valid, file: resolved, shard, rows, calculatedChecksum, error: valid ? "" : "standalone orphan shard checksum/group/count mismatch" };
    }
    catch (error) {
        return { valid: false, file, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function conflictResolutionOpenRepairEntryIds(groupId) {
    const file = path.join(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${safeSegment(groupId)}.json`);
    const ledger = readJson(file, {});
    const openStatuses = new Set(["pending", "in_progress", "running", "claimed", "dispatching", "blocked", "needs_info", "needs_user", "waiting"]);
    return new Set((Array.isArray(ledger.items) ? ledger.items : [])
        .filter((item) => openStatuses.has(String(item.status || "pending").trim().toLowerCase()))
        .map((item) => String(item.completion_preservation_conflict_resolution_entry_id || "").trim())
        .filter(Boolean));
}
function conflictResolutionQuarantineChecksum(value = {}) {
    return checksum({
        group_id: value.group_id || "",
        current_manifest_checksum: value.current_manifest_checksum || "",
        previous_manifest_checksum: value.previous_manifest_checksum || "",
        entries: (value.entries || []).map((entry) => ({
            rel_path: entry.rel_path || "",
            content_checksum: entry.content_checksum || "",
            row_ids_checksum: entry.row_ids_checksum || "",
            first_seen_at: entry.first_seen_at || "",
            eligible_after: entry.eligible_after || "",
            status: entry.status || "",
            deleted_at: entry.deleted_at || "",
        })),
    }, 48);
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options = {}) {
    const at = String(options.at || options.generatedAt || options.generated_at || now());
    const atMs = Date.parse(at);
    const gracePeriodMs = Math.max(0, Number(options.gracePeriodMs ?? options.grace_period_ms ?? 7 * 24 * 60 * 60 * 1000));
    const deleteEligible = options.deleteEligible === true || options.delete_eligible === true;
    const dryRun = options.dryRun === true || options.dry_run === true;
    const rawAllowedRelPaths = options.allowedRelPaths || options.allowed_rel_paths;
    const approvalRestricted = Array.isArray(rawAllowedRelPaths);
    const allowedRelPaths = new Set(uniqueStrings(Array.isArray(rawAllowedRelPaths) ? rawAllowedRelPaths : [], 5000));
    const generationHealth = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    const currentManifest = generationHealth.current?.manifest || {};
    const previousManifest = generationHealth.previous?.manifest || {};
    const typedDir = getGroupTypedMemoryDir(groupId);
    const referenced = new Set([
        ...(currentManifest.shards || []).map((shard) => String(shard.rel_path || "")),
        ...(previousManifest.shards || []).map((shard) => String(shard.rel_path || "")),
    ]);
    const currentRowIds = new Set((generationHealth.current?.rows || []).map((row) => String(row.row_id || "")));
    const openRepairEntryIds = conflictResolutionOpenRepairEntryIds(groupId);
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId);
    const existing = readJson(quarantineFile, {});
    const existingPresent = fs.existsSync(quarantineFile);
    const existingValid = !existingPresent || (existing.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1"
        && String(existing.group_id || "") === groupId
        && String(existing.quarantine_checksum || "") === conflictResolutionQuarantineChecksum(existing));
    const existingByPath = new Map((existingValid && Array.isArray(existing.entries) ? existing.entries : []).map((entry) => [String(entry.rel_path || ""), entry]));
    const shardFiles = listConflictResolutionColdArchiveShardFiles(groupId);
    const orphanFiles = shardFiles.filter(file => !referenced.has(path.relative(typedDir, file).split(path.sep).join("/")));
    const rows = [];
    for (const file of orphanFiles) {
        const relPath = path.relative(typedDir, file).split(path.sep).join("/");
        const previous = existingByPath.get(relPath) || null;
        const shard = readStandaloneConflictResolutionColdArchiveShard(groupId, file);
        const resolutionEntryIds = uniqueStrings((shard.rows || []).map((row) => row.resolution_entry_id), (shard.rows || []).length || 1);
        const referencedByOpenRepair = resolutionEntryIds.some((entryId) => openRepairEntryIds.has(entryId));
        const recoveryCovered = shard.valid === true && (shard.rows || []).every((row) => currentRowIds.has(String(row.row_id || "")));
        const firstSeenAt = String(previous?.first_seen_at || at);
        const firstSeenMs = Date.parse(firstSeenAt);
        const eligibleAfterMs = Number.isFinite(firstSeenMs) ? firstSeenMs + gracePeriodMs : Number.POSITIVE_INFINITY;
        const eligibleAfter = Number.isFinite(eligibleAfterMs) ? new Date(eligibleAfterMs).toISOString() : "";
        const graceElapsed = !!previous && Number.isFinite(atMs) && Number.isFinite(eligibleAfterMs) && atMs >= eligibleAfterMs;
        const explicitlyApproved = !approvalRestricted || allowedRelPaths.has(relPath);
        const canDelete = deleteEligible
            && !dryRun
            && !!previous
            && existingValid
            && graceElapsed
            && generationHealth.valid === true
            && generationHealth.previousRequired === true
            && generationHealth.previous?.valid === true
            && generationHealth.recoverySimulationPassed === true
            && shard.valid === true
            && recoveryCovered
            && !referencedByOpenRepair
            && explicitlyApproved;
        let status = !existingValid ? "blocked_quarantine_integrity"
            : referencedByOpenRepair ? "protected_open_repair"
                : !shard.valid ? "blocked_invalid_shard"
                    : !generationHealth.valid ? "blocked_manifest_generation"
                        : !recoveryCovered ? "blocked_recovery_simulation"
                            : graceElapsed && !explicitlyApproved ? "awaiting_explicit_approval"
                                : graceElapsed ? "eligible" : "quarantined";
        let deletedAt = String(previous?.deleted_at || "");
        if (canDelete) {
            fs.unlinkSync(file);
            status = "deleted";
            deletedAt = at;
        }
        rows.push({
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-shard-v1",
            group_id: groupId,
            rel_path: relPath,
            content_checksum: shard.shard?.content_checksum || path.basename(file, ".json"),
            row_count: (shard.rows || []).length,
            row_ids_checksum: checksum((shard.rows || []).map((row) => row.row_id), 48),
            resolution_entry_ids: resolutionEntryIds,
            first_seen_at: firstSeenAt,
            last_seen_at: at,
            eligible_after: eligibleAfter,
            grace_elapsed: graceElapsed,
            shard_valid: shard.valid === true,
            recovery_covered: recoveryCovered,
            referenced_by_open_repair: referencedByOpenRepair,
            explicitly_approved: explicitlyApproved,
            status,
            deleted_at: deletedAt,
            error: shard.error || "",
        });
    }
    for (const entry of existingValid && Array.isArray(existing.entries) ? existing.entries : []) {
        if (rows.some(row => row.rel_path === entry.rel_path))
            continue;
        if (entry.status === "deleted")
            rows.push(entry);
    }
    const quarantine = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-orphan-quarantine-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
        group_id: groupId,
        current_manifest_checksum: currentManifest.manifest_checksum || "",
        previous_manifest_checksum: previousManifest.manifest_checksum || "",
        grace_period_ms: gracePeriodMs,
        generation_chain_valid: generationHealth.valid === true,
        recovery_simulation_passed: generationHealth.recoverySimulationPassed === true,
        quarantine_input_valid: existingValid,
        orphan_count: rows.filter(row => row.status !== "deleted").length,
        quarantined_count: rows.filter(row => row.status === "quarantined").length,
        protected_open_repair_count: rows.filter(row => row.status === "protected_open_repair").length,
        eligible_count: rows.filter(row => row.status === "eligible").length,
        deleted_count: rows.filter(row => row.status === "deleted").length,
        blocked_count: rows.filter(row => String(row.status || "").startsWith("blocked_")).length,
        entries: rows.sort((a, b) => String(a.rel_path || "").localeCompare(String(b.rel_path || ""))),
        updated_at: at,
    };
    quarantine.quarantine_checksum = conflictResolutionQuarantineChecksum(quarantine);
    if (!dryRun && existingValid)
        writeJsonAtomic(quarantineFile, quarantine);
    return {
        ...quarantine,
        file: quarantineFile,
        dry_run: dryRun,
        delete_eligible: deleteEligible,
        generation_health: generationHealth,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-ledger.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "gc-approval-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notifications.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-receipts.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-deliveries.json");
}
function conflictResolutionMaintenanceState(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
    });
    const recommendation = conflictResolutionMaintenanceRecommendation(generation, quarantine);
    const stateFingerprint = checksum([
        groupId,
        generation.currentManifestChecksum || "",
        generation.previousManifestChecksum || "",
        quarantine.quarantine_checksum || "",
        recommendation.severity || "",
        recommendation.action || "",
    ], 32);
    return {
        at,
        group_id: groupId,
        current_manifest_checksum: generation.currentManifestChecksum || "",
        previous_manifest_checksum: generation.previousManifestChecksum || "",
        quarantine_checksum: quarantine.quarantine_checksum || "",
        grace_period_ms: Number(quarantine.grace_period_ms || 0),
        recommendation,
        state_fingerprint: stateFingerprint,
        revalidated: !!generation && !!quarantine && !!quarantine.quarantine_checksum,
        healthy: generation.valid === true && quarantine.quarantine_input_valid !== false,
        valid: generation.valid === true && quarantine.quarantine_input_valid !== false,
        generation,
        quarantine,
    };
}
function conflictResolutionMaintenanceNotificationReceiptChecksum(receipt = {}) {
    return checksum({
        receipt_id: receipt.receipt_id || "",
        receipt_kind: receipt.receipt_kind || "",
        group_id: receipt.group_id || "",
        audience: receipt.audience || "",
        notification_id: receipt.notification_id || "",
        state_fingerprint: receipt.state_fingerprint || "",
        current_manifest_checksum: receipt.current_manifest_checksum || "",
        previous_manifest_checksum: receipt.previous_manifest_checksum || "",
        quarantine_checksum: receipt.quarantine_checksum || "",
        actor_role: receipt.actor_role || "",
        actor_id: receipt.actor_id || "",
        session_id: receipt.session_id || "",
        reason: receipt.reason || "",
        issued_at: receipt.issued_at || "",
        expires_at: receipt.expires_at || "",
        advisory_visibility_only: receipt.advisory_visibility_only === true,
    }, 48);
}
function readConflictResolutionMaintenanceNotificationReceiptLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
    const ledger = readJson(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
        updated_at: ledger.updated_at || "",
    };
}
function writeConflictResolutionMaintenanceNotificationReceiptLedger(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: entries.slice(-320),
        receipt_count: Math.min(entries.length, 320),
        updated_at: at,
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function createConflictResolutionMaintenanceNotificationReceipt(groupId, kind, input = {}) {
    const at = String(input.at || input.issuedAt || input.issued_at || now());
    const audience = String(input.audience || "").trim().toLowerCase();
    const notificationId = String(input.notificationId || input.notification_id || "").trim();
    const actorRole = String(input.actorRole || input.actor_role || audience).trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
    const sessionId = String(input.sessionId || input.session_id || "").trim();
    const reason = String(input.reason || "").trim();
    const requestedGroupId = String(input.groupId || input.group_id || groupId).trim();
    if (requestedGroupId !== groupId)
        throw new Error("maintenance notification receipt group mismatch");
    if (!new Set(["group-main-agent", "global-agent"]).has(audience))
        throw new Error("maintenance notification receipt audience is invalid");
    if (actorRole !== audience)
        throw new Error("maintenance notification receipt actor must match audience");
    if (!notificationId)
        throw new Error("maintenance notification receipt requires notificationId");
    if (!actorId || !sessionId)
        throw new Error("maintenance notification receipt requires actorId and sessionId");
    if (kind === "suppressed" && !reason)
        throw new Error("maintenance notification suppression requires reason");
    const notificationLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId), {});
    const notification = (Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [])
        .find((entry) => String(entry.notification_id || "") === notificationId) || null;
    if (!notification)
        throw new Error("maintenance notification not found");
    if (String(notification.group_id || "") !== groupId)
        throw new Error("maintenance notification group mismatch");
    if (String(notification.audience || "") !== audience)
        throw new Error("maintenance notification audience mismatch");
    const state = conflictResolutionMaintenanceState(groupId, {
        at: notification.state_observed_at || notification.first_seen_at || at,
        gracePeriodMs: notification.grace_period_ms,
    });
    if (!state.revalidated)
        throw new Error("maintenance notification current archive state cannot be revalidated");
    if (String(notification.state_fingerprint || "") !== state.state_fingerprint)
        throw new Error("maintenance notification state is stale");
    const expiresInMs = Math.max(60_000, Math.min(30 * 24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 7 * 24 * 60 * 60 * 1000)));
    const receipt = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-v1",
        version: 1,
        receipt_id: `conflict-resolution-maintenance-notification-${kind}:${checksum([groupId, audience, notificationId, state.state_fingerprint, actorId, sessionId, at], 24)}`,
        receipt_kind: kind,
        group_id: groupId,
        audience,
        notification_id: notificationId,
        state_fingerprint: state.state_fingerprint,
        current_manifest_checksum: state.current_manifest_checksum,
        previous_manifest_checksum: state.previous_manifest_checksum,
        quarantine_checksum: state.quarantine_checksum,
        actor_role: actorRole,
        actor_id: actorId,
        session_id: sessionId,
        reason: reason || "notification acknowledged",
        issued_at: at,
        expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
        advisory_visibility_only: true,
        destructive_action_authorized: false,
        should_create_real_task: false,
        cross_group_authorization_allowed: false,
    };
    receipt.receipt_checksum = conflictResolutionMaintenanceNotificationReceiptChecksum(receipt);
    const ledger = readConflictResolutionMaintenanceNotificationReceiptLedger(groupId);
    writeConflictResolutionMaintenanceNotificationReceiptLedger(groupId, [
        ...ledger.entries.filter((entry) => entry.receipt_id !== receipt.receipt_id),
        receipt,
    ], at);
    return receipt;
}
function acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return createConflictResolutionMaintenanceNotificationReceipt(groupId, "acknowledged", input);
}
function suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return createConflictResolutionMaintenanceNotificationReceipt(groupId, "suppressed", input);
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const atMs = Date.parse(at);
    const ledger = readConflictResolutionMaintenanceNotificationReceiptLedger(groupId);
    const entries = ledger.entries.map((receipt) => {
        const checksumValid = receipt.receipt_checksum === conflictResolutionMaintenanceNotificationReceiptChecksum(receipt);
        const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
        const valid = receipt.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-v1"
            && String(receipt.group_id || "") === groupId
            && new Set(["acknowledged", "suppressed"]).has(String(receipt.receipt_kind || ""))
            && receipt.actor_role === receipt.audience
            && receipt.advisory_visibility_only === true
            && receipt.destructive_action_authorized === false
            && receipt.should_create_real_task === false
            && checksumValid
            && Number.isFinite(expiresAtMs)
            && Number.isFinite(atMs)
            && atMs <= expiresAtMs;
        return { ...receipt, checksum_valid: checksumValid, expired: Number.isFinite(expiresAtMs) && Number.isFinite(atMs) ? atMs > expiresAtMs : true, valid };
    });
    return {
        ...ledger,
        entries,
        valid_receipt_count: entries.filter((entry) => entry.valid).length,
        invalid_receipt_count: entries.filter((entry) => !entry.valid).length,
    };
}
function conflictResolutionMaintenanceNotificationDeliveryChecksum(entry = {}) {
    return checksum({
        delivery_id: entry.delivery_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        context_id: entry.context_id || "",
        consumer_session_id: entry.consumer_session_id || "",
        channel: entry.channel || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        advisory_only: entry.advisory_only === true,
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry = {}) {
    return checksum({
        compact_id: entry.compact_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        detailed_entry_count: Number(entry.detailed_entry_count || 0),
        context_ids_root_checksum: entry.context_ids_root_checksum || "",
        source_delivery_checksums_root: entry.source_delivery_checksums_root || "",
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value = {}) {
    return checksum({
        schema: value.schema || "",
        version: Number(value.version || 0),
        group_id: value.group_id || "",
        retention_generation: Number(value.retention_generation || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({ delivery_id: entry.delivery_id || "", delivery_checksum: entry.delivery_checksum || "" })),
        compacted_entries: (value.compacted_entries || []).map((entry) => ({ compact_id: entry.compact_id || "", compact_checksum: entry.compact_checksum || "" })),
        updated_at: value.updated_at || "",
    }, 48);
}
function getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-deliveries.previous.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-quarantine.json");
}
function getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "delivery-telemetry-recovery-evidence");
}
function verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, file) {
    const present = fs.existsSync(file);
    const value = readJson(file, null);
    const detailed = Array.isArray(value?.entries) ? value.entries : [];
    const compacted = Array.isArray(value?.compacted_entries) ? value.compacted_entries : [];
    const detailedValid = detailed.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
        && String(entry.group_id || "") === groupId
        && entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry));
    const compactedValid = compacted.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
        && String(entry.group_id || "") === groupId
        && entry.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry));
    const ledgerChecksumValid = !!value
        && value.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && value.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value);
    const valid = present
        && String(value?.group_id || "") === groupId
        && ledgerChecksumValid
        && detailedValid
        && compactedValid;
    return {
        file,
        present,
        value,
        valid,
        group_valid: String(value?.group_id || "") === groupId,
        ledger_checksum_valid: ledgerChecksumValid,
        detailed_valid: detailedValid,
        compacted_valid: compactedValid,
        retention_generation: Number(value?.retention_generation || 0),
        ledger_checksum: value?.ledger_checksum || "",
        error: valid ? "" : !present ? "delivery_ledger_missing" : !value ? "delivery_ledger_json_invalid" : String(value?.group_id || "") !== groupId ? "delivery_ledger_group_mismatch" : !ledgerChecksumValid ? "delivery_ledger_checksum_invalid" : !detailedValid ? "delivery_detail_invalid" : "delivery_compact_invalid",
    };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId) {
    const currentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
    const current = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, currentFile);
    const previous = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, previousFile);
    const previousRequired = current.valid && !!current.value?.previous_ledger_checksum;
    const chainValid = !previousRequired || (previous.valid && current.value.previous_ledger_checksum === previous.ledger_checksum);
    const recoverable = !current.valid && previous.valid;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-generation-verification-v1",
        group_id: groupId,
        status: current.valid && chainValid ? "ok" : recoverable ? "recoverable" : current.present || previous.present ? "blocked" : "empty",
        valid: current.valid && chainValid,
        recoverable,
        current,
        previous,
        previous_required: previousRequired,
        chain_valid: chainValid,
        gaps: [
            ...(!current.valid && current.present ? [current.error] : []),
            ...(previousRequired && !previous.valid ? [previous.error || "delivery_previous_invalid"] : []),
            ...(!chainValid ? ["delivery_generation_chain_invalid"] : []),
        ],
    };
}
function appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entry, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const ledger = readJson(file, {});
    const previous = Array.isArray(ledger.entries) ? ledger.entries : [];
    const quarantineId = String(entry.quarantine_id || `delivery-telemetry-quarantine:${checksum([groupId, entry.source_path, entry.content_checksum, entry.reason], 24)}`);
    const normalized = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-entry-v1",
        quarantine_id: quarantineId,
        group_id: groupId,
        source_path: entry.source_path || "",
        evidence_path: entry.evidence_path || "",
        content_checksum: entry.content_checksum || "",
        reason: entry.reason || "unknown",
        status: entry.status || "quarantined",
        recovery_eligible: entry.recovery_eligible === true,
        first_seen_at: entry.first_seen_at || at,
        last_seen_at: at,
    };
    const byId = new Map(previous.map((row) => [String(row.quarantine_id || ""), row]));
    const existing = byId.get(quarantineId);
    byId.set(quarantineId, { ...existing, ...normalized, first_seen_at: existing?.first_seen_at || normalized.first_seen_at });
    const value = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, [...byId.values()], at, {
        compactedEntries: Array.isArray(ledger.compacted_entries) ? ledger.compacted_entries : [],
    });
    return { ...value, file, entry: value.entries.find((row) => row.quarantine_id === quarantineId) || byId.get(quarantineId) };
}
function conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(value = {}) {
    return checksum({
        compact_id: value.compact_id || "",
        group_id: value.group_id || "",
        reason: value.reason || "",
        cleaned_count: Number(value.cleaned_count || 0),
        first_seen_at: value.first_seen_at || "",
        last_cleaned_at: value.last_cleaned_at || "",
        quarantine_ids_root: value.quarantine_ids_root || "",
        cleanup_receipt_ids_root: value.cleanup_receipt_ids_root || "",
    }, 48);
}
function retainConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, compactedEntries, at, options = {}) {
    const unresolved = entries.filter((entry) => String(entry.status || "") !== "cleaned");
    const cleaned = entries.filter((entry) => String(entry.status || "") === "cleaned");
    const compactById = new Map();
    for (const entry of compactedEntries) {
        if (entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1"
            || String(entry.group_id || "") !== groupId
            || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(entry))
            continue;
        compactById.set(String(entry.compact_id || ""), entry);
    }
    const cleanedByReason = new Map();
    for (const entry of cleaned) {
        const reason = String(entry.reason || "unknown");
        cleanedByReason.set(reason, [...(cleanedByReason.get(reason) || []), entry]);
    }
    for (const [reason, rows] of cleanedByReason) {
        const compactId = `delivery-telemetry-quarantine-compact:${checksum([groupId, reason], 24)}`;
        const existing = compactById.get(compactId) || null;
        const quarantineIds = rows.map((row) => row.quarantine_id).filter(Boolean).sort();
        const receiptIds = rows.map((row) => row.cleanup_receipt_id).filter(Boolean).sort();
        const compact = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1",
            version: 1,
            compact_id: compactId,
            group_id: groupId,
            reason,
            cleaned_count: Number(existing?.cleaned_count || 0) + rows.length,
            first_seen_at: [existing?.first_seen_at, ...rows.map((row) => row.first_seen_at)].filter(Boolean).sort()[0] || at,
            last_cleaned_at: [existing?.last_cleaned_at, ...rows.map((row) => row.cleaned_at)].filter(Boolean).sort().slice(-1)[0] || at,
            quarantine_ids_root: checksum([existing?.quarantine_ids_root || "", quarantineIds], 48),
            cleanup_receipt_ids_root: checksum([existing?.cleanup_receipt_ids_root || "", receiptIds], 48),
            terminal: true,
            compacted_at: at,
        };
        compact.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(compact);
        compactById.set(compactId, compact);
    }
    const maxCompactedEntries = Math.max(20, Math.min(500, Number(options.maxCompactedEntries || options.max_compacted_entries || 120)));
    const compacted = [...compactById.values()]
        .sort((a, b) => String(a.last_cleaned_at || "").localeCompare(String(b.last_cleaned_at || "")))
        .slice(-maxCompactedEntries);
    const recoveryProofs = unresolved.filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")));
    return {
        entries: unresolved.sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || ""))),
        compacted_entries: compacted,
        retention: {
            policy: "preserve_all_unresolved_and_latest_recovery_proof_compact_cleaned_terminal_only",
            unresolved_count: unresolved.length,
            cleaned_compacted_this_run_count: cleaned.length,
            compacted_summary_count: compacted.length,
            latest_recovery_proof_id: recoveryProofs[0]?.quarantine_id || "",
            max_compacted_entries: maxCompactedEntries,
        },
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, at, options = {}) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const retained = retainConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, Array.isArray(options.compactedEntries) ? options.compactedEntries : [], at, options);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1",
        version: 1,
        group_id: groupId,
        entries: retained.entries,
        compacted_entries: retained.compacted_entries,
        quarantine_count: retained.entries.length,
        compacted_quarantine_count: retained.compacted_entries.reduce((sum, row) => sum + Number(row.cleaned_count || 0), 0),
        retention: retained.retention,
        updated_at: at,
    };
    value.quarantine_checksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(value);
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(value = {}) {
    const payload = {
        group_id: value.group_id || "",
        entries: (value.entries || []).map((row) => ({
            quarantine_id: row.quarantine_id || "",
            content_checksum: row.content_checksum || "",
            reason: row.reason || "",
            status: row.status || "",
        })),
    };
    if (Array.isArray(value.compacted_entries) && value.compacted_entries.length) {
        payload.compacted_entries = value.compacted_entries.map((row) => ({ compact_id: row.compact_id || "", compact_checksum: row.compact_checksum || "" }));
    }
    return checksum(payload, 48);
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const ledger = readJson(file, {});
    const present = fs.existsSync(file);
    if (!present)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
            group_id: groupId,
            status: "empty",
            destructive_action_authorized: false,
            created_task_count: 0,
            created_approval_receipt_count: 0,
            deleted_count: 0,
        };
    if (String(ledger.group_id || "") !== groupId || ledger.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(ledger))
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
            group_id: groupId,
            status: "blocked",
            reason: "delivery_quarantine_checksum_invalid",
            destructive_action_authorized: false,
            created_task_count: 0,
            created_approval_receipt_count: 0,
            deleted_count: 0,
        };
    const written = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, ledger.entries || [], at, {
        ...options,
        compactedEntries: ledger.compacted_entries || [],
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-retention-v1",
        group_id: groupId,
        status: "ok",
        retention: written.retention,
        quarantine_checksum: written.quarantine_checksum,
        unresolved_count: written.entries.length,
        compacted_count: written.compacted_quarantine_count,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
        file,
    };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-receipts.json");
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt = {}) {
    return checksum({
        receipt_id: receipt.receipt_id || "",
        group_id: receipt.group_id || "",
        actor_role: receipt.actor_role || "",
        actor_id: receipt.actor_id || "",
        reason: receipt.reason || "",
        quarantine_checksum: receipt.quarantine_checksum || "",
        current_ledger_checksum: receipt.current_ledger_checksum || "",
        previous_ledger_checksum: receipt.previous_ledger_checksum || "",
        candidates: (receipt.candidates || []).map((candidate) => ({
            quarantine_id: candidate.quarantine_id || "",
            target_path: candidate.target_path || "",
            target_kind: candidate.target_kind || "",
            target_content_checksum: candidate.target_content_checksum || "",
        })),
        issued_at: receipt.issued_at || "",
        expires_at: receipt.expires_at || "",
        single_use: receipt.single_use === true,
    }, 48);
}
function readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
    const ledger = readJson(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
    const open = entries.filter((entry) => entry.consumed !== true && entry.revoked !== true);
    const terminal = entries.filter((entry) => entry.consumed === true || entry.revoked === true).slice(-160);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: [...open, ...terminal],
        open_receipt_count: open.length,
        consumed_receipt_count: terminal.filter((entry) => entry.consumed === true).length,
        updated_at: at,
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-delivery-cleanup-journals.json");
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal = {}) {
    return checksum({
        execution_id: journal.execution_id || "",
        group_id: journal.group_id || "",
        receipt_id: journal.receipt_id || "",
        receipt_checksum: journal.receipt_checksum || "",
        quarantine_checksum: journal.quarantine_checksum || "",
        current_ledger_checksum: journal.current_ledger_checksum || "",
        previous_ledger_checksum: journal.previous_ledger_checksum || "",
        latest_recovery_proof_id: journal.latest_recovery_proof_id || "",
        status: journal.status || "",
        candidates: (journal.candidates || []).map((candidate) => ({
            quarantine_id: candidate.quarantine_id || "",
            target_path: candidate.target_path || "",
            target_kind: candidate.target_kind || "",
            target_content_checksum: candidate.target_content_checksum || "",
            status: candidate.status || "",
            intent_at: candidate.intent_at || "",
            deleted_at: candidate.deleted_at || "",
        })),
        started_at: journal.started_at || "",
        updated_at: journal.updated_at || "",
        completed_at: journal.completed_at || "",
    }, 48);
}
function readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId);
    const ledger = readJson(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupId);
    const open = entries.filter((entry) => entry.status !== "completed" && entry.status !== "cancelled");
    const terminal = entries.filter((entry) => entry.status === "completed" || entry.status === "cancelled").slice(-160);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: [...open, ...terminal],
        open_journal_count: open.length,
        completed_journal_count: terminal.filter((entry) => entry.status === "completed").length,
        updated_at: at,
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function upsertConflictResolutionMaintenanceNotificationDeliveryCleanupJournal(groupId, journal, at) {
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    const normalized = { ...journal, updated_at: at };
    normalized.journal_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(normalized);
    const entries = [...ledger.entries.filter((entry) => entry.execution_id !== normalized.execution_id), normalized];
    writeConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId, entries, at);
    return normalized;
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    const rows = ledger.entries.map((journal) => {
        const checksumValid = journal.journal_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupJournalChecksum(journal);
        const groupValid = String(journal.group_id || "") === groupId;
        let missingPendingCount = 0;
        let missingIntentCount = 0;
        for (const candidate of journal.candidates || []) {
            if (candidate.status === "deleted")
                continue;
            const exists = fs.existsSync(candidate.target_path);
            if (!exists && candidate.status === "delete_intent")
                missingIntentCount++;
            if (!exists && candidate.status === "pending")
                missingPendingCount++;
        }
        const resumable = journal.status === "in_progress" && checksumValid && groupValid && missingPendingCount === 0;
        return {
            execution_id: journal.execution_id,
            receipt_id: journal.receipt_id,
            status: journal.status,
            checksum_valid: checksumValid,
            group_valid: groupValid,
            resumable,
            missing_after_intent_count: missingIntentCount,
            missing_without_intent_count: missingPendingCount,
            deleted_count: (journal.candidates || []).filter((candidate) => candidate.status === "deleted").length + missingIntentCount,
            candidate_count: (journal.candidates || []).length,
        };
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-journal-reconciliation-v1",
        group_id: groupId,
        generated_at: at,
        journal_count: rows.length,
        open_journal_count: rows.filter((row) => row.status === "in_progress").length,
        resumable_journal_count: rows.filter((row) => row.resumable).length,
        blocked_journal_count: rows.filter((row) => row.status === "in_progress" && !row.resumable).length,
        invalid_journal_count: rows.filter((row) => !row.checksum_valid || !row.group_valid).length,
        rows,
        destructive_action_authorized: false,
        resumed_count: 0,
        deleted_count: 0,
        policy: "scheduler_detects_only_explicit_execution_resumes_exact_journal",
        file: ledger.file,
    };
}
function revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    const at = String(input.at || input.revokedAt || input.revoked_at || now());
    const receiptId = String(input.receiptId || input.receipt_id || "").trim();
    const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
    const reason = String(input.reason || "").trim();
    if (input.explicitRevocation !== true && input.explicit_revocation !== true)
        throw new Error("delivery cleanup revocation requires explicitRevocation=true");
    if (!actorId || !reason)
        throw new Error("delivery cleanup revocation requires actorId and reason");
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    const receipt = ledger.entries.find((entry) => entry.receipt_id === receiptId) || null;
    if (!receipt)
        throw new Error("delivery cleanup receipt not found");
    if (String(receipt.group_id || "") !== groupId)
        throw new Error("delivery cleanup receipt group mismatch");
    if (receipt.consumed === true)
        throw new Error("consumed delivery cleanup receipt cannot be revoked");
    if (receipt.revoked === true)
        return receipt;
    if (receipt.receipt_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt))
        throw new Error("delivery cleanup receipt checksum invalid");
    const journals = readConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLedger(groupId);
    if (journals.entries.some((journal) => journal.receipt_id === receiptId && journal.status === "in_progress")) {
        throw new Error("delivery cleanup receipt with in-progress journal cannot be revoked");
    }
    const revoked = {
        ...receipt,
        revoked: true,
        revoked_at: at,
        revoked_by: actorId,
        revocation_reason: reason,
    };
    writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, ledger.entries.map((entry) => entry.receipt_id === receiptId ? revoked : entry), at);
    return revoked;
}
function pathWithinDirectory(target, directory) {
    const resolvedTarget = path.resolve(target);
    const resolvedDirectory = path.resolve(directory);
    return resolvedTarget.startsWith(`${resolvedDirectory}${path.sep}`);
}
function buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, options = {}) {
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const quarantine = readJson(quarantineFile, {});
    if (quarantine.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1"
        || String(quarantine.group_id || "") !== groupId
        || quarantine.quarantine_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine)) {
        throw new Error("delivery cleanup requires a valid group-local quarantine ledger");
    }
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    if (!generation.valid)
        throw new Error("delivery cleanup requires a valid current/previous delivery generation chain");
    const entries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    const latestRecoveryProofId = entries
        .filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0]?.quarantine_id || "";
    const requestedRaw = options.quarantineIds || options.quarantine_ids;
    const requested = Array.isArray(requestedRaw) ? new Set(uniqueStrings(requestedRaw, 1000)) : null;
    const coldDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId);
    const evidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId);
    const currentFile = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId));
    const previousFile = path.resolve(getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId));
    const candidates = [];
    for (const entry of entries) {
        if (requested && !requested.has(String(entry.quarantine_id || "")))
            continue;
        if (entry.status === "cleaned" || entry.quarantine_id === latestRecoveryProofId)
            continue;
        let targetPath = "";
        let targetKind = "";
        if (entry.status === "quarantined_corrupt_current" && entry.evidence_path) {
            targetPath = String(entry.evidence_path);
            targetKind = "recovery_evidence";
            if (!pathWithinDirectory(targetPath, evidenceDir))
                continue;
        }
        else if (entry.reason === "interrupted_atomic_temp") {
            targetPath = String(entry.source_path || "");
            targetKind = "interrupted_temp";
            if (!pathWithinDirectory(targetPath, coldDir))
                continue;
        }
        else if (entry.reason === "orphan_or_mismatched_previous") {
            targetPath = String(entry.source_path || "");
            targetKind = "orphan_previous";
            if (!pathWithinDirectory(targetPath, coldDir))
                continue;
        }
        if (!targetPath || !fs.existsSync(targetPath))
            continue;
        const resolvedTarget = path.resolve(targetPath);
        if (resolvedTarget === currentFile || (resolvedTarget === previousFile && generation.previous_required))
            continue;
        let content = "";
        try {
            content = fs.readFileSync(resolvedTarget, "utf-8");
        }
        catch {
            continue;
        }
        const targetContentChecksum = checksum(content, 48);
        if (targetKind !== "recovery_evidence" && targetContentChecksum !== String(entry.content_checksum || ""))
            continue;
        candidates.push({
            quarantine_id: entry.quarantine_id,
            reason: entry.reason,
            target_path: resolvedTarget,
            target_kind: targetKind,
            target_content_checksum: targetContentChecksum,
        });
    }
    if (requested && candidates.length !== requested.size)
        throw new Error("delivery cleanup requested set contains protected, missing or stale evidence");
    return { quarantine, generation, latestRecoveryProofId, candidates };
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    const at = String(input.at || input.issuedAt || input.issued_at || now());
    const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
    const reason = String(input.reason || "").trim();
    if (input.explicitApproval !== true && input.explicit_approval !== true)
        throw new Error("delivery cleanup receipt requires explicitApproval=true");
    if (!new Set(["group-main-agent", "global-agent", "local-user"]).has(actorRole))
        throw new Error("delivery cleanup actor role is invalid");
    if (!actorId || !reason)
        throw new Error("delivery cleanup receipt requires actorId and reason");
    const selection = buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, input);
    if (!selection.candidates.length)
        throw new Error("delivery cleanup requires at least one eligible non-current evidence file");
    const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
    const receipt = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-v1",
        version: 1,
        receipt_id: `delivery-telemetry-cleanup:${checksum([groupId, selection.quarantine.quarantine_checksum, selection.candidates, actorRole, actorId, at], 24)}`,
        group_id: groupId,
        actor_role: actorRole,
        actor_id: actorId,
        reason,
        quarantine_checksum: selection.quarantine.quarantine_checksum,
        current_ledger_checksum: selection.generation.current.ledger_checksum,
        previous_ledger_checksum: selection.generation.previous.ledger_checksum,
        latest_recovery_proof_id: selection.latestRecoveryProofId,
        candidates: selection.candidates.sort((a, b) => a.target_path.localeCompare(b.target_path)),
        issued_at: at,
        expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
        single_use: true,
        consumed: false,
        authorization_boundary: "exact_group_quarantine_generation_and_file_checksum_only",
    };
    receipt.receipt_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt);
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, [...ledger.entries, receipt], at);
    return receipt;
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    const at = String(input.at || input.executedAt || input.executed_at || now());
    const trigger = String(input.trigger || input.source || "manual").trim().toLowerCase();
    const receiptId = String(input.receiptId || input.receipt_id || "").trim();
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    const receipt = ledger.entries.find((entry) => entry.receipt_id === receiptId) || null;
    const blocked = (reason) => ({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
        group_id: groupId,
        receipt_id: receiptId,
        status: "blocked",
        executed: false,
        reason,
        deleted_count: 0,
    });
    if (["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger))
        return blocked("background_trigger_cannot_cleanup_delivery_evidence");
    if (input.explicitExecution !== true && input.explicit_execution !== true)
        return blocked("explicit_execution_required");
    if (!receipt)
        return blocked("cleanup_receipt_not_found");
    if (String(receipt.group_id || "") !== groupId)
        return blocked("cleanup_receipt_group_mismatch");
    if (receipt.consumed === true)
        return blocked("cleanup_receipt_already_consumed");
    if (receipt.single_use !== true || receipt.receipt_checksum !== conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt))
        return blocked("cleanup_receipt_checksum_invalid");
    const atMs = Date.parse(at);
    const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
    if (!Number.isFinite(atMs) || !Number.isFinite(expiresAtMs) || atMs > expiresAtMs)
        return blocked("cleanup_receipt_expired");
    let selection;
    try {
        selection = buildConflictResolutionMaintenanceNotificationDeliveryCleanupCandidates(groupId, { quarantineIds: receipt.candidates.map((candidate) => candidate.quarantine_id) });
    }
    catch {
        return blocked("cleanup_candidate_state_stale_or_protected");
    }
    if (selection.quarantine.quarantine_checksum !== receipt.quarantine_checksum)
        return blocked("cleanup_quarantine_stale");
    if (selection.generation.current.ledger_checksum !== receipt.current_ledger_checksum || selection.generation.previous.ledger_checksum !== receipt.previous_ledger_checksum)
        return blocked("cleanup_delivery_generation_stale");
    if (selection.latestRecoveryProofId !== receipt.latest_recovery_proof_id)
        return blocked("cleanup_latest_recovery_proof_changed");
    const selectedById = new Map(selection.candidates.map((candidate) => [candidate.quarantine_id, candidate]));
    for (const candidate of receipt.candidates) {
        const current = selectedById.get(candidate.quarantine_id);
        if (!current || current.target_path !== candidate.target_path || current.target_kind !== candidate.target_kind || current.target_content_checksum !== candidate.target_content_checksum)
            return blocked("cleanup_candidate_checksum_stale");
    }
    const deleted = [];
    for (const candidate of receipt.candidates) {
        fs.unlinkSync(candidate.target_path);
        deleted.push(candidate);
    }
    const quarantineEntries = (selection.quarantine.entries || []).map((entry) => selectedById.has(entry.quarantine_id) ? {
        ...entry,
        status: "cleaned",
        cleaned_at: at,
        cleanup_receipt_id: receiptId,
    } : entry);
    const updatedQuarantine = writeConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, quarantineEntries, at, {
        compactedEntries: selection.quarantine.compacted_entries || [],
    });
    const updatedReceipts = ledger.entries.map((entry) => entry.receipt_id === receiptId ? {
        ...entry,
        consumed: true,
        consumed_at: at,
        deleted_count: deleted.length,
        execution_checksum: checksum({ receipt_id: receiptId, deleted, at }, 48),
    } : entry);
    writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, updatedReceipts, at);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-execution-v1",
        group_id: groupId,
        receipt_id: receiptId,
        status: "executed",
        executed: true,
        deleted_count: deleted.length,
        deleted_paths: deleted.map(candidate => candidate.target_path),
        quarantine_checksum_after: updatedQuarantine.quarantine_checksum,
        destructive_action_authorized: true,
        explicit_receipt_required: true,
        executed_at: at,
    };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const atMs = Date.parse(at);
    const receipts = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    const receiptRows = receipts.entries.map((receipt) => {
        const checksumValid = receipt.receipt_checksum === conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt);
        const expiresAtMs = Date.parse(String(receipt.expires_at || ""));
        const valid = receipt.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-v1"
            && String(receipt.group_id || "") === groupId
            && receipt.single_use === true
            && checksumValid;
        return { ...receipt, checksum_valid: checksumValid, expired: Number.isFinite(atMs) && Number.isFinite(expiresAtMs) ? atMs > expiresAtMs : true, valid };
    });
    const recoveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId, { at });
    const quarantine = readJson(recoveryHealth.quarantine_file, {});
    const entries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    const latestProof = recoveryHealth.latest_recovery_proof_id
        ? entries.find((entry) => entry.quarantine_id === recoveryHealth.latest_recovery_proof_id) || null
        : null;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-status-v1",
        group_id: groupId,
        generated_at: at,
        receipt_file: receipts.file,
        receipt_count: receiptRows.length,
        open_receipt_count: receiptRows.filter((receipt) => receipt.consumed !== true && receipt.revoked !== true).length,
        consumed_receipt_count: receiptRows.filter((receipt) => receipt.consumed === true).length,
        invalid_receipt_count: receiptRows.filter((receipt) => !receipt.valid).length,
        expired_open_receipt_count: receiptRows.filter((receipt) => receipt.expired && receipt.consumed !== true && receipt.revoked !== true).length,
        receipts: receiptRows,
        recovery_health: recoveryHealth,
        unresolved_quarantine_count: entries.length,
        compacted_quarantine_count: Number(quarantine.compacted_quarantine_count || recoveryHealth.compacted_quarantine_count || 0),
        latest_recovery_proof_id: recoveryHealth.latest_recovery_proof_id || "",
        latest_recovery_proof_present: !!latestProof && (!latestProof.evidence_path || fs.existsSync(latestProof.evidence_path)),
        retention: quarantine.retention || {},
        scheduler_cleanup_authorized: false,
        policy: "explicit_exact_checksum_single_use_cleanup_only_latest_recovery_proof_protected",
    };
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const coldDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId);
    const currentFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    const candidates = [];
    let names = [];
    try {
        names = fs.readdirSync(coldDir);
    }
    catch { }
    for (const name of names.filter(name => /^maintenance-notification-deliveries(?:\.previous)?\.json\..+\.tmp$/.test(name))) {
        const source = path.join(coldDir, name);
        let content = "";
        try {
            content = fs.readFileSync(source, "utf-8");
        }
        catch { }
        candidates.push({ source_path: source, content_checksum: checksum(content, 48), reason: "interrupted_atomic_temp", status: "quarantined_temp", recovery_eligible: false });
    }
    if (generation.current.valid && generation.previous.present && (!generation.previous_required || !generation.chain_valid)) {
        let content = "";
        try {
            content = fs.readFileSync(previousFile, "utf-8");
        }
        catch { }
        candidates.push({ source_path: previousFile, content_checksum: checksum(content, 48), reason: "orphan_or_mismatched_previous", status: "quarantined_previous", recovery_eligible: false });
    }
    const records = options.persist === false ? candidates : candidates.map(candidate => appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, candidate, at).entry);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-orphan-reconciliation-v1",
        group_id: groupId,
        status: "ok",
        current_file: currentFile,
        previous_file: previousFile,
        candidate_count: candidates.length,
        temp_candidate_count: candidates.filter(row => row.reason === "interrupted_atomic_temp").length,
        orphan_previous_count: candidates.filter(row => row.reason === "orphan_or_mismatched_previous").length,
        candidates: records,
        generation,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
    };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupId, options = {}) {
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    const orphans = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, { ...options, persist: false });
    const quarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
    const quarantinePresent = fs.existsSync(quarantineFile);
    const quarantine = readJson(quarantineFile, {});
    const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
    const evidenceDir = path.resolve(getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId));
    const quarantineEntries = Array.isArray(quarantine.entries) ? quarantine.entries : [];
    const compactedQuarantineEntries = Array.isArray(quarantine.compacted_entries) ? quarantine.compacted_entries : [];
    const quarantineChecksumValid = !quarantinePresent || (quarantine.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-v1"
        && String(quarantine.group_id || "") === groupId
        && quarantine.quarantine_checksum === conflictResolutionMaintenanceNotificationDeliveryQuarantineChecksum(quarantine));
    const invalidQuarantineEntries = quarantineEntries.filter((entry) => {
        const source = path.resolve(String(entry.source_path || coldDir));
        const sourceLocal = source === coldDir || source.startsWith(`${coldDir}${path.sep}`);
        const evidencePath = String(entry.evidence_path || "");
        const evidenceLocal = !evidencePath || path.resolve(evidencePath).startsWith(`${evidenceDir}${path.sep}`);
        const evidence = evidencePath ? readJson(evidencePath, null) : null;
        const evidenceValid = !evidencePath || (!!evidence
            && String(evidence.group_id || "") === groupId
            && String(evidence.source_content_checksum || "") === String(entry.content_checksum || "")
            && checksum(String(evidence.source_content || ""), 48) === String(entry.content_checksum || ""));
        return String(entry.group_id || "") !== groupId || !sourceLocal || !evidenceLocal || !evidenceValid;
    });
    const invalidCompactedQuarantineEntries = compactedQuarantineEntries.filter((entry) => entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1"
        || String(entry.group_id || "") !== groupId
        || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(entry));
    const latestRecoveryProof = quarantineEntries
        .filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))[0] || null;
    const safe = (generation.valid || generation.status === "empty")
        && quarantineChecksumValid
        && invalidQuarantineEntries.length === 0
        && invalidCompactedQuarantineEntries.length === 0
        && orphans.destructive_action_authorized === false
        && orphans.created_task_count === 0
        && orphans.created_approval_receipt_count === 0
        && orphans.deleted_count === 0;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-health-v1",
        group_id: groupId,
        status: safe ? "ok" : generation.recoverable ? "recoverable" : "fail",
        safe,
        generation,
        orphans,
        quarantine_file: quarantineFile,
        quarantine_present: quarantinePresent,
        quarantine_checksum_valid: quarantineChecksumValid,
        quarantine_count: quarantineEntries.length,
        compacted_quarantine_count: compactedQuarantineEntries.reduce((sum, entry) => sum + Number(entry.cleaned_count || 0), 0),
        invalid_quarantine_entry_count: invalidQuarantineEntries.length + invalidCompactedQuarantineEntries.length,
        latest_recovery_proof_id: latestRecoveryProof?.quarantine_id || "",
        latest_recovery_proof_present: !!latestRecoveryProof,
        retention: quarantine.retention || {},
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
    };
}
function readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const ledger = readJson(file, {});
    const present = fs.existsSync(file);
    const legacy = ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v1";
    const checksumValid = !present || legacy || (ledger.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && ledger.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(ledger));
    const previousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId);
    const previous = readJson(previousFile, null);
    const previousChainValid = !ledger.previous_ledger_checksum
        || (!!previous
            && previous.ledger_checksum === ledger.previous_ledger_checksum
            && previous.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(previous));
    return {
        schema: ledger.schema || "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2",
        version: Number(ledger.version || (legacy ? 1 : 2)),
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        compacted_entries: Array.isArray(ledger.compacted_entries) ? ledger.compacted_entries : [],
        retention_generation: Number(ledger.retention_generation || 0),
        previous_ledger_checksum: ledger.previous_ledger_checksum || "",
        ledger_checksum: ledger.ledger_checksum || "",
        ledger_checksum_valid: checksumValid,
        previous_chain_valid: previousChainValid,
        previous_file: previousFile,
        retention: ledger.retention || {},
        file,
        updated_at: ledger.updated_at || "",
    };
}
function retainConflictResolutionMaintenanceNotificationDeliveries(groupId, entries, compactedEntries, at, options = {}) {
    const atMs = Date.parse(at);
    const terminalAgeMs = Math.max(60_000, Number(options.terminalAgeMs || options.terminal_age_ms || 30 * 24 * 60 * 60 * 1000));
    const maxHotEntries = Math.max(20, Math.min(2000, Number(options.maxHotEntries || options.max_hot_entries || 320)));
    const maxCompactedEntries = Math.max(20, Math.min(1000, Number(options.maxCompactedEntries || options.max_compacted_entries || 160)));
    const currentNotifications = ["group-main-agent", "global-agent"].flatMap(audience => {
        const context = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, {
            at,
            maxNotifications: 20,
            recordDelivery: false,
        });
        return context.notifications || [];
    });
    const currentByKey = new Map(currentNotifications.map((notification) => [
        JSON.stringify([notification.audience, notification.notification_id, notification.state_fingerprint]),
        notification,
    ]));
    const validRows = [];
    const invalidRows = [];
    for (const entry of entries) {
        const valid = entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
            && String(entry.group_id || "") === groupId
            && entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
        (valid ? validRows : invalidRows).push(entry);
    }
    const pinned = [];
    const terminalCandidates = [];
    const recentCandidates = [];
    for (const entry of validRows) {
        const key = JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint]);
        const current = currentByKey.get(key);
        const currentDelivery = !!current && (!current.state_observed_at || String(entry.last_delivered_at || "") >= String(current.state_observed_at));
        if (currentDelivery) {
            pinned.push(entry);
            continue;
        }
        const deliveredAtMs = Date.parse(String(entry.last_delivered_at || ""));
        const old = Number.isFinite(atMs) && Number.isFinite(deliveredAtMs) && atMs - deliveredAtMs >= terminalAgeMs;
        (old ? terminalCandidates : recentCandidates).push(entry);
    }
    recentCandidates.sort((a, b) => String(b.last_delivered_at || "").localeCompare(String(a.last_delivered_at || "")));
    const invalidHot = invalidRows.slice(-Math.min(40, maxHotEntries));
    const hotCapacity = Math.max(0, maxHotEntries - pinned.length - invalidHot.length);
    const recentHot = recentCandidates.slice(0, hotCapacity);
    terminalCandidates.push(...recentCandidates.slice(hotCapacity));
    const compactById = new Map();
    for (const entry of compactedEntries) {
        if (entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
            || String(entry.group_id || "") !== groupId
            || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry))
            continue;
        compactById.set(String(entry.compact_id || ""), entry);
    }
    const terminalGroups = new Map();
    for (const entry of terminalCandidates) {
        const key = JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint]);
        terminalGroups.set(key, [...(terminalGroups.get(key) || []), entry]);
    }
    for (const [key, rows] of terminalGroups) {
        const [audience, notificationId, stateFingerprint] = JSON.parse(key);
        const compactId = `conflict-resolution-maintenance-notification-delivery-compact:${checksum([groupId, key], 24)}`;
        const existing = compactById.get(compactId) || null;
        const contextIds = uniqueStrings(rows.map((entry) => entry.context_id), 5000).sort();
        const sourceChecksums = rows.map((entry) => entry.delivery_checksum).filter(Boolean).sort();
        const compact = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1",
            version: 1,
            compact_id: compactId,
            group_id: groupId,
            audience,
            notification_id: notificationId,
            state_fingerprint: stateFingerprint,
            first_delivered_at: [existing?.first_delivered_at, ...rows.map((entry) => entry.first_delivered_at)].filter(Boolean).sort()[0] || at,
            last_delivered_at: [existing?.last_delivered_at, ...rows.map((entry) => entry.last_delivered_at)].filter(Boolean).sort().slice(-1)[0] || at,
            delivery_count: Number(existing?.delivery_count || 0) + rows.reduce((sum, entry) => sum + Number(entry.delivery_count || 0), 0),
            detailed_entry_count: Number(existing?.detailed_entry_count || 0) + rows.length,
            context_ids_root_checksum: checksum([existing?.context_ids_root_checksum || "", contextIds], 48),
            source_delivery_checksums_root: checksum([existing?.source_delivery_checksums_root || "", sourceChecksums], 48),
            terminal: true,
            advisory_only: true,
            destructive_action_authorized: false,
            should_create_real_task: false,
            compacted_at: at,
        };
        compact.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(compact);
        compactById.set(compactId, compact);
    }
    const compacted = [...compactById.values()]
        .sort((a, b) => String(a.last_delivered_at || "").localeCompare(String(b.last_delivered_at || "")))
        .slice(-maxCompactedEntries);
    const hot = [...invalidHot, ...recentHot, ...pinned]
        .sort((a, b) => String(a.last_delivered_at || "").localeCompare(String(b.last_delivered_at || "")));
    return {
        entries: hot,
        compacted_entries: compacted,
        retention: {
            policy: "pin_current_delivery_compact_terminal_preserve_invalid_diagnostics",
            max_hot_entries: maxHotEntries,
            max_compacted_entries: maxCompactedEntries,
            terminal_age_ms: terminalAgeMs,
            input_detailed_count: entries.length,
            hot_detailed_count: hot.length,
            pinned_current_delivery_count: pinned.length,
            invalid_hot_count: invalidHot.length,
            compacted_this_run_count: terminalCandidates.length,
            compacted_summary_count: compacted.length,
            protected_current_notification_ids: currentNotifications.map((notification) => notification.notification_id),
        },
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, entries, at, options = {}) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
    const previousRaw = options.previousLedgerOverride && typeof options.previousLedgerOverride === "object"
        ? options.previousLedgerOverride
        : readJson(file, {});
    const previousValid = previousRaw.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && previousRaw.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(previousRaw);
    const retained = retainConflictResolutionMaintenanceNotificationDeliveries(groupId, entries, Array.isArray(options.compactedEntries) ? options.compactedEntries : (Array.isArray(previousRaw.compacted_entries) ? previousRaw.compacted_entries : []), at, options);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2",
        version: 2,
        group_id: groupId,
        retention_generation: Number(previousRaw.retention_generation || 0) + 1,
        previous_ledger_checksum: previousValid ? previousRaw.ledger_checksum : "",
        entries: retained.entries,
        compacted_entries: retained.compacted_entries,
        delivery_count: retained.entries.length,
        compacted_delivery_count: retained.compacted_entries.reduce((sum, entry) => sum + Number(entry.delivery_count || 0), 0),
        retention: retained.retention,
        updated_at: at,
    };
    value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value);
    if (previousValid)
        writeJsonAtomic(getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId), previousRaw);
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const apply = options.apply === true || options.recover === true || options.dryRun === false || options.dry_run === false;
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    const resultBase = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-v1",
        group_id: groupId,
        generation,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
    };
    if (generation.valid)
        return { ...resultBase, status: "current_valid", recovered: false, recovery_required: false };
    if (!generation.recoverable)
        return {
            ...resultBase,
            status: generation.status === "empty" ? "empty" : "blocked",
            recovered: false,
            recovery_required: generation.status !== "empty",
            reason: generation.status === "empty" ? "delivery_ledger_not_initialized" : "no_valid_same_group_previous_delivery_generation",
        };
    const currentFile = generation.current.file;
    let currentContent = "";
    try {
        currentContent = fs.readFileSync(currentFile, "utf-8");
    }
    catch { }
    const corruptChecksum = checksum(currentContent, 48);
    const evidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId);
    const evidenceFile = path.join(evidenceDir, `${corruptChecksum || "missing"}.json`);
    if (!apply)
        return {
            ...resultBase,
            status: "recoverable",
            recovered: false,
            recovery_required: true,
            selected_previous_checksum: generation.previous.ledger_checksum,
            corrupt_current_checksum: corruptChecksum,
            evidence_file: evidenceFile,
        };
    const evidence = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-recovery-evidence-v1",
        version: 1,
        group_id: groupId,
        source_file: currentFile,
        source_content_checksum: corruptChecksum,
        source_content: currentContent,
        reason: generation.current.error || "current_delivery_generation_invalid",
        quarantined_at: at,
    };
    writeJsonAtomic(evidenceFile, evidence);
    appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, {
        source_path: currentFile,
        evidence_path: evidenceFile,
        content_checksum: corruptChecksum,
        reason: generation.current.error || "current_delivery_generation_invalid",
        status: "quarantined_corrupt_current",
        recovery_eligible: false,
    }, at);
    const selected = generation.previous.value;
    const written = writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, selected.entries || [], at, {
        ...options,
        compactedEntries: selected.compacted_entries || [],
        previousLedgerOverride: selected,
    });
    const verified = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
    return {
        ...resultBase,
        status: verified.valid ? "recovered" : "blocked",
        recovered: verified.valid,
        recovery_required: !verified.valid,
        selected_previous_checksum: generation.previous.ledger_checksum,
        corrupt_current_checksum: corruptChecksum,
        evidence_file: evidenceFile,
        retention_generation: written.retention_generation,
        ledger_checksum: written.ledger_checksum,
        verification: verified,
    };
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
    if (!ledger.ledger_checksum_valid)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-retention-v1",
            group_id: groupId,
            status: "blocked",
            reason: "delivery_ledger_checksum_invalid",
            destructive_action_authorized: false,
            created_task_count: 0,
            created_approval_receipt_count: 0,
            deleted_count: 0,
        };
    const written = writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, ledger.entries, at, {
        ...options,
        compactedEntries: ledger.compacted_entries,
    });
    const health = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, { ...options, at });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-retention-v1",
        group_id: groupId,
        status: health.invalid_delivery_count === 0 ? "ok" : "warn",
        retention_generation: written.retention_generation,
        ledger_checksum: written.ledger_checksum,
        previous_ledger_checksum: written.previous_ledger_checksum,
        retention: written.retention,
        health,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
        file: written.file,
    };
}
function recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId, audience, notifications = [], input = {}) {
    const normalizedAudience = String(audience || "").trim().toLowerCase();
    if (!new Set(["group-main-agent", "global-agent"]).has(normalizedAudience))
        throw new Error("maintenance notification delivery audience is invalid");
    const at = String(input.at || input.deliveredAt || input.delivered_at || now());
    const contextId = String(input.contextId || input.context_id || "").trim();
    const consumerSessionId = String(input.consumerSessionId || input.consumer_session_id || input.sessionId || input.session_id || "").trim();
    const channel = String(input.channel || normalizedAudience).trim().slice(0, 80) || normalizedAudience;
    if (!contextId || !consumerSessionId)
        throw new Error("maintenance notification delivery requires contextId and consumerSessionId");
    const safeNotifications = (Array.isArray(notifications) ? notifications : []).filter((entry) => entry
        && String(entry.group_id || "") === groupId
        && String(entry.audience || "") === normalizedAudience
        && entry.notification_id
        && entry.state_fingerprint
        && entry.advisory_only === true
        && entry.destructive_action_authorized === false
        && entry.should_create_real_task === false
        && entry.cross_group_authorization_allowed === false);
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
    if (!ledger.ledger_checksum_valid)
        throw new Error("maintenance notification delivery ledger checksum is invalid");
    const byId = new Map(ledger.entries.map((entry) => [String(entry.delivery_id || ""), entry]));
    const recorded = [];
    for (const notification of safeNotifications) {
        const deliveryId = `conflict-resolution-maintenance-notification-delivery:${checksum([
            groupId,
            normalizedAudience,
            notification.notification_id,
            notification.state_fingerprint,
            contextId,
            consumerSessionId,
        ], 24)}`;
        const previous = byId.get(deliveryId) || null;
        const entry = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1",
            version: 1,
            delivery_id: deliveryId,
            group_id: groupId,
            audience: normalizedAudience,
            notification_id: notification.notification_id,
            state_fingerprint: notification.state_fingerprint,
            severity: notification.severity || "info",
            context_id: contextId,
            consumer_session_id: consumerSessionId,
            channel,
            first_delivered_at: previous?.first_delivered_at || at,
            last_delivered_at: at,
            delivery_count: Number(previous?.delivery_count || 0) + 1,
            advisory_only: true,
            destructive_action_authorized: false,
            should_create_real_task: false,
            cross_group_authorization_allowed: false,
        };
        entry.delivery_checksum = conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
        byId.set(deliveryId, entry);
        recorded.push(entry);
    }
    if (recorded.length)
        writeConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, [...byId.values()], at);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-result-v1",
        group_id: groupId,
        audience: normalizedAudience,
        context_id: contextId,
        consumer_session_id: consumerSessionId,
        recorded_count: recorded.length,
        entries: recorded,
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
    };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, options = {}) {
    const at = String(options.at || options.now || now());
    const atMs = Date.parse(at);
    const unseenAfterMs = Math.max(60_000, Number(options.unseenAfterMs || options.unseen_after_ms || 15 * 60 * 1000));
    const repeatThreshold = Math.max(2, Number(options.repeatThreshold || options.repeat_threshold || 3));
    const ledger = readConflictResolutionMaintenanceNotificationDeliveryLedger(groupId);
    const notificationLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId), {});
    const pinnedCurrentNotificationIds = new Set(uniqueStrings(notificationLedger.pinned_current_notification_ids || [], 20));
    const deliveries = ledger.entries.map((entry) => {
        const checksumValid = entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry);
        const valid = entry.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
            && String(entry.group_id || "") === groupId
            && new Set(["group-main-agent", "global-agent"]).has(String(entry.audience || ""))
            && entry.advisory_only === true
            && entry.destructive_action_authorized === false
            && entry.should_create_real_task === false
            && checksumValid;
        return { ...entry, checksum_valid: checksumValid, valid };
    });
    const compactedDeliveries = ledger.compacted_entries.map((entry) => {
        const checksumValid = entry.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry);
        const valid = entry.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
            && String(entry.group_id || "") === groupId
            && new Set(["group-main-agent", "global-agent"]).has(String(entry.audience || ""))
            && entry.advisory_only === true
            && entry.destructive_action_authorized === false
            && entry.should_create_real_task === false
            && checksumValid;
        return { ...entry, checksum_valid: checksumValid, valid };
    });
    const pending = ["group-main-agent", "global-agent"].flatMap(audience => {
        const context = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, {
            at,
            maxNotifications: 20,
            recordDelivery: false,
        });
        return context.notifications || [];
    });
    const rows = pending.map((notification) => {
        const matching = deliveries.filter((entry) => entry.valid === true
            && entry.audience === notification.audience
            && entry.notification_id === notification.notification_id
            && entry.state_fingerprint === notification.state_fingerprint
            && (!notification.state_observed_at || String(entry.last_delivered_at || "") >= String(notification.state_observed_at)));
        const firstSeenMs = Date.parse(String(notification.first_seen_at || notification.last_seen_at || ""));
        const ageMs = Number.isFinite(atMs) && Number.isFinite(firstSeenMs) ? Math.max(0, atMs - firstSeenMs) : 0;
        const severe = new Set(["critical", "warn", "warning", "error"]).has(String(notification.severity || "").toLowerCase());
        const delivered = matching.length > 0;
        const repeatedUnseen = !delivered && severe && ageMs >= unseenAfterMs && Number(notification.seen_count || 0) >= repeatThreshold;
        return {
            group_id: groupId,
            audience: notification.audience,
            notification_id: notification.notification_id,
            state_fingerprint: notification.state_fingerprint,
            severity: notification.severity,
            action: notification.action,
            state_observed_at: notification.state_observed_at || "",
            first_seen_at: notification.first_seen_at || "",
            last_seen_at: notification.last_seen_at || "",
            seen_count: Number(notification.seen_count || 0),
            age_ms: ageMs,
            delivered,
            delivery_count: matching.reduce((sum, entry) => sum + Number(entry.delivery_count || 0), 0),
            repeated_unseen: repeatedUnseen,
            advisory_only: true,
            should_create_real_task: false,
        };
    });
    const currentKeys = new Map(rows.map((row) => [JSON.stringify([row.audience, row.notification_id, row.state_fingerprint]), row]));
    const compactedCurrentDeliveryCount = compactedDeliveries.filter((entry) => {
        const current = currentKeys.get(JSON.stringify([entry.audience, entry.notification_id, entry.state_fingerprint]));
        return !!current && (!current.state_observed_at || String(entry.last_delivered_at || "") >= String(current.state_observed_at));
    }).length;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-health-v1",
        group_id: groupId,
        generated_at: at,
        pending_count: rows.length,
        delivered_pending_count: rows.filter((row) => row.delivered).length,
        unseen_pending_count: rows.filter((row) => !row.delivered).length,
        repeated_unseen_count: rows.filter((row) => row.repeated_unseen).length,
        invalid_delivery_count: deliveries.filter((entry) => !entry.valid).length + compactedDeliveries.filter((entry) => !entry.valid).length + (ledger.ledger_checksum_valid ? 0 : 1),
        ledger_checksum_valid: ledger.ledger_checksum_valid,
        previous_chain_valid: ledger.previous_chain_valid,
        retention_generation: ledger.retention_generation,
        hot_delivery_entry_count: deliveries.length,
        compacted_delivery_entry_count: compactedDeliveries.length,
        compacted_current_delivery_count: compactedCurrentDeliveryCount,
        pinned_current_notification_count: pinnedCurrentNotificationIds.size,
        unprotected_repeated_unseen_count: rows.filter((row) => row.repeated_unseen && !pinnedCurrentNotificationIds.has(row.notification_id)).length,
        retention: ledger.retention || {},
        rows,
        policy: "read_only_delivery_observation_no_task_no_approval_no_delete",
        destructive_action_authorized: false,
        created_task_count: 0,
        created_approval_receipt_count: 0,
        deleted_count: 0,
        file: ledger.file,
    };
}
function buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, audience, options = {}) {
    const normalizedAudience = String(audience || "").trim().toLowerCase();
    if (!new Set(["group-main-agent", "global-agent"]).has(normalizedAudience))
        throw new Error("maintenance notification context audience is invalid");
    const at = String(options.at || options.now || now());
    const notificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
    const notificationLedger = readJson(notificationFile, {});
    const audienceNotifications = (Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [])
        .filter((entry) => String(entry.group_id || "") === groupId && String(entry.audience || "") === normalizedAudience);
    const pinnedIds = new Set(uniqueStrings(notificationLedger.pinned_current_notification_ids || [], 20));
    const pinnedNotifications = audienceNotifications.filter((entry) => pinnedIds.has(String(entry.notification_id || "")));
    const notifications = pinnedNotifications.length
        ? pinnedNotifications
        : audienceNotifications
            .sort((a, b) => String(b.state_observed_at || b.last_seen_at || "").localeCompare(String(a.state_observed_at || a.last_seen_at || "")))
            .slice(0, 8);
    const receiptInspection = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, { at });
    const receipts = receiptInspection.entries.filter((entry) => entry.valid === true && entry.audience === normalizedAudience);
    const stateCache = new Map();
    const currentRows = notifications.filter((entry) => {
        const gracePeriodMs = Number(entry.grace_period_ms || 0);
        const observedAt = String(entry.state_observed_at || entry.first_seen_at || at);
        const cacheKey = `${observedAt}:${gracePeriodMs}`;
        if (!stateCache.has(cacheKey))
            stateCache.set(cacheKey, conflictResolutionMaintenanceState(groupId, { at: observedAt, gracePeriodMs }));
        const state = stateCache.get(cacheKey);
        return state.revalidated === true
            && entry.state_fingerprint === state.state_fingerprint
            && (!entry.current_manifest_checksum || entry.current_manifest_checksum === state.current_manifest_checksum)
            && (!entry.previous_manifest_checksum || entry.previous_manifest_checksum === state.previous_manifest_checksum)
            && (!entry.quarantine_checksum || entry.quarantine_checksum === state.quarantine_checksum);
    });
    const hiddenIds = new Set(receipts.map((receipt) => `${receipt.notification_id}:${receipt.state_fingerprint}`));
    const maxNotifications = Math.max(1, Math.min(20, Number(options.maxNotifications || options.max_notifications || 4)));
    const pending = currentRows
        .filter((entry) => !hiddenIds.has(`${entry.notification_id}:${entry.state_fingerprint}`))
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")))
        .slice(0, maxNotifications)
        .map((entry) => ({
        notification_id: entry.notification_id,
        group_id: groupId,
        audience: normalizedAudience,
        state_fingerprint: entry.state_fingerprint,
        severity: entry.severity || "info",
        action: entry.action || "continue_read_only_verification",
        reason: String(entry.reason || "").slice(0, 360),
        state_observed_at: entry.state_observed_at || "",
        first_seen_at: entry.first_seen_at || "",
        last_seen_at: entry.last_seen_at || "",
        seen_count: Number(entry.seen_count || 1),
        advisory_only: true,
        destructive_action_authorized: false,
        should_create_real_task: false,
        cross_group_authorization_allowed: false,
    }));
    const delivery = options.recordDelivery === true && pending.length
        ? recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupId, normalizedAudience, pending, {
            at,
            contextId: options.contextId || options.context_id,
            consumerSessionId: options.consumerSessionId || options.consumer_session_id || options.sessionId || options.session_id,
            channel: options.channel || normalizedAudience,
        })
        : null;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-context-v1",
        group_id: groupId,
        audience: normalizedAudience,
        generated_at: at,
        pending_count: pending.length,
        current_notification_count: currentRows.length,
        hidden_by_valid_receipt_count: currentRows.length - pending.length,
        notifications: pending,
        policy: "advisory_visibility_only_no_task_no_approval_no_delete",
        advisory_only: true,
        cross_group_authorization_allowed: false,
        notification_file: notificationFile,
        receipt_file: receiptInspection.file,
        delivery,
    };
}
function emitConflictResolutionMaintenanceNotifications(groupId, run = {}, options = {}) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
    const ledger = readJson(file, {});
    const previous = Array.isArray(ledger.entries) ? ledger.entries : [];
    const at = String(run.at || options.at || now());
    const stateFingerprint = checksum([
        groupId,
        run.current_manifest_checksum || "",
        run.previous_manifest_checksum || "",
        run.quarantine_checksum || "",
        run.recommendation?.severity || "",
        run.recommendation?.action || "",
    ], 32);
    const drafts = [
        { audience: "group-main-agent", recommendation: run.group_main_agent_recommendation || run.recommendation || {} },
        { audience: "global-agent", recommendation: run.global_agent_recommendation || run.recommendation || {} },
    ].map((draft) => {
        const notificationId = `conflict-resolution-maintenance-notification:${checksum([groupId, draft.audience, stateFingerprint], 24)}`;
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-v1",
            version: 1,
            notification_id: notificationId,
            group_id: groupId,
            audience: draft.audience,
            state_fingerprint: stateFingerprint,
            severity: draft.recommendation.severity || "info",
            action: draft.recommendation.action || "continue_read_only_verification",
            reason: draft.recommendation.reason || "",
            advisory_only: true,
            destructive_action_authorized: false,
            should_create_real_task: false,
            cross_group_authorization_allowed: false,
            source_run_id: run.run_id || "",
            state_observed_at: at,
            current_manifest_checksum: run.current_manifest_checksum || "",
            previous_manifest_checksum: run.previous_manifest_checksum || "",
            quarantine_checksum: run.quarantine_checksum || "",
            grace_period_ms: Number(run.grace_period_ms || 0),
            first_seen_at: at,
            last_seen_at: at,
            seen_count: 1,
        };
    });
    const byId = new Map(previous.map((entry) => [String(entry.notification_id || ""), entry]));
    let newCount = 0;
    let deduplicatedCount = 0;
    for (const draft of drafts) {
        const existing = byId.get(draft.notification_id);
        if (existing) {
            deduplicatedCount++;
            byId.set(draft.notification_id, {
                ...existing,
                ...draft,
                first_seen_at: existing.first_seen_at || draft.first_seen_at,
                last_seen_at: at,
                seen_count: Number(existing.seen_count || 1) + 1,
            });
        }
        else {
            newCount++;
            byId.set(draft.notification_id, draft);
        }
    }
    const pinnedIds = new Set(drafts.map((draft) => draft.notification_id));
    const pinned = [...byId.values()].filter((entry) => pinnedIds.has(entry.notification_id));
    const recent = [...byId.values()]
        .filter((entry) => !pinnedIds.has(entry.notification_id))
        .sort((a, b) => String(a.last_seen_at || a.first_seen_at || "").localeCompare(String(b.last_seen_at || b.first_seen_at || "")))
        .slice(-Math.max(0, 240 - pinned.length));
    const entries = [...recent, ...pinned]
        .sort((a, b) => String(a.last_seen_at || a.first_seen_at || "").localeCompare(String(b.last_seen_at || b.first_seen_at || "")));
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-ledger-v1",
        version: 1,
        group_id: groupId,
        entries,
        notification_count: entries.length,
        new_notification_count: newCount,
        deduplicated_notification_count: deduplicatedCount,
        pinned_current_notification_ids: [...pinnedIds],
        pinned_current_notification_count: pinned.length,
        retention_policy: "pin_current_group_and_audience_state_then_keep_recent_terminal_notifications",
        updated_at: at,
    };
    writeJsonAtomic(file, value);
    return { ...value, file, stateFingerprint };
}
function conflictResolutionMaintenanceRecommendation(generation = {}, quarantine = {}) {
    if (generation.valid !== true)
        return {
            severity: "critical",
            action: "recover_or_repair_manifest_generation",
            destructive: false,
            reason: `manifest generation invalid: ${(generation.gaps || []).join(",") || "unknown"}`,
        };
    if (Number(quarantine.protected_open_repair_count || 0) > 0)
        return {
            severity: "warn",
            action: "wait_for_open_repair_closure",
            destructive: false,
            reason: `orphan shards protected by open repairs=${quarantine.protected_open_repair_count}`,
        };
    if (Number(quarantine.eligible_count || 0) > 0)
        return {
            severity: "advisory",
            action: "request_explicit_gc_approval_receipt",
            destructive: false,
            reason: `eligible orphan shards=${quarantine.eligible_count}; background maintenance cannot authorize deletion`,
        };
    if (Number(quarantine.quarantined_count || 0) > 0)
        return {
            severity: "info",
            action: "continue_quarantine_grace_monitoring",
            destructive: false,
            reason: `quarantined orphan shards=${quarantine.quarantined_count}`,
        };
    return {
        severity: "ok",
        action: "continue_read_only_verification",
        destructive: false,
        reason: "manifest generations and cold shards verify; no destructive maintenance required",
    };
}
function runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options = {}) {
    const at = String(options.at || options.generatedAt || options.generated_at || now());
    const trigger = String(options.trigger || options.source || "manual").trim().toLowerCase();
    const backgroundTrigger = ["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger);
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    const archive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
    });
    const recommendation = conflictResolutionMaintenanceRecommendation(generation, quarantine);
    const intervalMs = Math.max(60_000, Number(options.intervalMs || options.interval_ms || 6 * 60 * 60 * 1000));
    const runCore = {
        group_id: groupId,
        trigger,
        at,
        current_manifest_checksum: generation.currentManifestChecksum || "",
        previous_manifest_checksum: generation.previousManifestChecksum || "",
        quarantine_checksum: quarantine.quarantine_checksum || "",
        generation_valid: generation.valid === true,
        archive_valid: archive.valid === true,
        orphan_count: Number(quarantine.orphan_count || 0),
        eligible_count: Number(quarantine.eligible_count || 0),
        protected_open_repair_count: Number(quarantine.protected_open_repair_count || 0),
        grace_period_ms: Number(quarantine.grace_period_ms || 0),
    };
    const runId = `conflict-resolution-maintenance:${checksum(runCore, 24)}`;
    const run = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-run-v1",
        version: 1,
        run_id: runId,
        ...runCore,
        mode: "verify_and_quarantine_dry_run_only",
        destructive_action_authorized: false,
        deletion_attempted: false,
        background_trigger: backgroundTrigger,
        recommendation,
        group_main_agent_recommendation: {
            ...recommendation,
            owner: "group-main-agent",
            should_create_real_task: false,
            next_step_requires_explicit_dispatch: true,
        },
        global_agent_recommendation: {
            ...recommendation,
            owner: "global-agent",
            advisory_only: true,
            cross_group_authorization_allowed: false,
        },
        next_run_at: new Date(Date.parse(at) + intervalMs).toISOString(),
    };
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
    const ledger = readJson(file, {});
    const entries = [...(Array.isArray(ledger.entries) ? ledger.entries : []).filter((entry) => entry.run_id !== runId), run].slice(-240);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-ledger-v1",
        version: 1,
        group_id: groupId,
        controller_policy: "background_verify_and_dry_run_never_delete",
        entries,
        latest_run: run,
        next_run_at: run.next_run_at,
        updated_at: at,
    };
    if (options.persist !== false)
        writeJsonAtomic(file, value);
    const notifications = options.emitNotifications === true || options.emit_notifications === true
        ? emitConflictResolutionMaintenanceNotifications(groupId, run, { at })
        : null;
    return { ...run, file, ledger: value, generation, archive, quarantine, notifications };
}
function conflictResolutionGcApprovalReceiptChecksum(receipt = {}) {
    return checksum({
        receipt_id: receipt.receipt_id || "",
        group_id: receipt.group_id || "",
        approved: receipt.approved === true,
        allow_delete: receipt.allow_delete === true,
        actor_role: receipt.actor_role || "",
        actor_id: receipt.actor_id || "",
        reason: receipt.reason || "",
        current_manifest_checksum: receipt.current_manifest_checksum || "",
        previous_manifest_checksum: receipt.previous_manifest_checksum || "",
        quarantine_checksum: receipt.quarantine_checksum || "",
        candidates: (receipt.candidates || []).map((candidate) => ({
            rel_path: candidate.rel_path || "",
            content_checksum: candidate.content_checksum || "",
            row_ids_checksum: candidate.row_ids_checksum || "",
        })),
        issued_at: receipt.issued_at || "",
        expires_at: receipt.expires_at || "",
        single_use: receipt.single_use === true,
    }, 48);
}
function readConflictResolutionGcApprovalLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
    const ledger = readJson(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        file,
        updated_at: ledger.updated_at || "",
    };
}
function writeConflictResolutionGcApprovalLedger(groupId, entries, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
    const open = entries.filter((entry) => entry.consumed !== true && entry.revoked !== true);
    const terminal = entries.filter((entry) => entry.consumed === true || entry.revoked === true).slice(-160);
    const value = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: [...open, ...terminal],
        open_receipt_count: open.length,
        consumed_receipt_count: terminal.filter((entry) => entry.consumed === true).length,
        updated_at: at,
    };
    writeJsonAtomic(file, value);
    return { ...value, file };
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input = {}) {
    const at = String(input.at || input.issuedAt || input.issued_at || now());
    const actorRole = String(input.actorRole || input.actor_role || "").trim().toLowerCase();
    const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
    const reason = String(input.reason || "").trim();
    if (input.explicitApproval !== true && input.explicit_approval !== true)
        throw new Error("GC approval requires explicitApproval=true");
    if (!new Set(["group-main-agent", "global-agent"]).has(actorRole))
        throw new Error("GC approval actor must be group-main-agent or global-agent");
    if (!actorId)
        throw new Error("GC approval requires actorId");
    if (!reason)
        throw new Error("GC approval requires reason");
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    if (!generation.valid)
        throw new Error(`GC approval blocked by invalid manifest generations: ${(generation.gaps || []).join(",")}`);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
    });
    if (quarantine.quarantine_input_valid === false)
        throw new Error("GC approval blocked by invalid quarantine manifest");
    const requestedPathsRaw = input.candidateRelPaths || input.candidate_rel_paths;
    const requestedPaths = Array.isArray(requestedPathsRaw) ? new Set(uniqueStrings(requestedPathsRaw, 5000)) : null;
    const eligible = (quarantine.entries || []).filter((entry) => entry.status === "eligible"
        && entry.shard_valid === true
        && entry.recovery_covered === true
        && entry.referenced_by_open_repair !== true
        && (!requestedPaths || requestedPaths.has(entry.rel_path)));
    if (!eligible.length)
        throw new Error("GC approval requires at least one eligible quarantined shard");
    if (requestedPaths && eligible.length !== requestedPaths.size)
        throw new Error("GC approval candidate set includes non-eligible or missing shards");
    const expiresInMs = Math.max(60_000, Math.min(24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 30 * 60 * 1000)));
    const receiptId = `conflict-resolution-gc-approval:${checksum([
        groupId,
        generation.currentManifestChecksum,
        generation.previousManifestChecksum,
        quarantine.quarantine_checksum,
        eligible.map((entry) => entry.rel_path),
        actorRole,
        actorId,
        at,
    ], 24)}`;
    const receipt = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-receipt-v1",
        version: 1,
        receipt_id: receiptId,
        group_id: groupId,
        approved: true,
        allow_delete: true,
        actor_role: actorRole,
        actor_id: actorId,
        reason,
        current_manifest_checksum: generation.currentManifestChecksum,
        previous_manifest_checksum: generation.previousManifestChecksum,
        quarantine_checksum: quarantine.quarantine_checksum,
        candidates: eligible.map((entry) => ({
            rel_path: entry.rel_path,
            content_checksum: entry.content_checksum,
            row_ids_checksum: entry.row_ids_checksum,
        })).sort((a, b) => a.rel_path.localeCompare(b.rel_path)),
        issued_at: at,
        expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
        single_use: true,
        consumed: false,
        authorization_boundary: "exact_group_generation_quarantine_and_shard_set_only",
    };
    receipt.receipt_checksum = conflictResolutionGcApprovalReceiptChecksum(receipt);
    const ledger = readConflictResolutionGcApprovalLedger(groupId);
    const entries = [...ledger.entries.filter((entry) => entry.receipt_id !== receiptId), receipt];
    writeConflictResolutionGcApprovalLedger(groupId, entries, at);
    return receipt;
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input = {}) {
    const at = String(input.at || input.executedAt || input.executed_at || now());
    const trigger = String(input.trigger || input.source || "manual").trim().toLowerCase();
    const receiptId = String(input.receiptId || input.receipt_id || "").trim();
    const ledger = readConflictResolutionGcApprovalLedger(groupId);
    const receipt = ledger.entries.find((entry) => entry.receipt_id === receiptId) || null;
    const blocked = (reason, extra = {}) => ({
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-execution-v1",
        groupId,
        status: "blocked",
        executed: false,
        reason,
        receipt_id: receiptId,
        ...extra,
    });
    if (["background", "timer", "scheduler", "cron", "automatic", "auto"].includes(trigger))
        return blocked("background_trigger_cannot_authorize_destructive_gc");
    if (input.explicitExecution !== true && input.explicit_execution !== true)
        return blocked("explicit_execution_required");
    if (!receipt)
        return blocked("approval_receipt_not_found");
    if (String(receipt.group_id || "") !== groupId)
        return blocked("approval_receipt_group_mismatch");
    if (receipt.consumed === true)
        return blocked("approval_receipt_already_consumed");
    if (receipt.revoked === true)
        return blocked("approval_receipt_revoked");
    if (receipt.approved !== true || receipt.allow_delete !== true || receipt.single_use !== true)
        return blocked("approval_receipt_policy_invalid");
    if (receipt.receipt_checksum !== conflictResolutionGcApprovalReceiptChecksum(receipt))
        return blocked("approval_receipt_checksum_invalid");
    const expiresAt = Date.parse(String(receipt.expires_at || ""));
    const atMs = Date.parse(at);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(atMs) || atMs > expiresAt)
        return blocked("approval_receipt_expired");
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    if (!generation.valid)
        return blocked("manifest_generation_invalid", { gaps: generation.gaps || [] });
    if (generation.currentManifestChecksum !== receipt.current_manifest_checksum
        || generation.previousManifestChecksum !== receipt.previous_manifest_checksum)
        return blocked("approval_receipt_generation_stale");
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
    });
    if (quarantine.quarantine_input_valid === false)
        return blocked("quarantine_manifest_invalid");
    if (quarantine.quarantine_checksum !== receipt.quarantine_checksum)
        return blocked("approval_receipt_quarantine_stale");
    const eligibleByPath = new Map((quarantine.entries || []).filter((entry) => entry.status === "eligible").map((entry) => [entry.rel_path, entry]));
    const candidatesValid = (receipt.candidates || []).every((candidate) => {
        const entry = eligibleByPath.get(candidate.rel_path);
        return !!entry
            && entry.content_checksum === candidate.content_checksum
            && entry.row_ids_checksum === candidate.row_ids_checksum
            && entry.shard_valid === true
            && entry.recovery_covered === true
            && entry.referenced_by_open_repair !== true;
    });
    if (!candidatesValid || !(receipt.candidates || []).length)
        return blocked("approval_receipt_candidate_set_stale");
    const allowedRelPaths = receipt.candidates.map((candidate) => candidate.rel_path);
    const result = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        at,
        gracePeriodMs: input.gracePeriodMs ?? input.grace_period_ms,
        deleteEligible: true,
        allowedRelPaths,
    });
    const deletedThisRun = (result.entries || []).filter((entry) => entry.status === "deleted" && entry.deleted_at === at);
    if (deletedThisRun.some((entry) => !allowedRelPaths.includes(entry.rel_path)))
        return blocked("gc_deleted_outside_approved_candidate_set");
    const execution = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-execution-v1",
        groupId,
        status: "executed",
        executed: true,
        receipt_id: receiptId,
        receipt_checksum: receipt.receipt_checksum,
        deleted_count: deletedThisRun.length,
        deleted_rel_paths: deletedThisRun.map((entry) => entry.rel_path),
        current_manifest_checksum: generation.currentManifestChecksum,
        previous_manifest_checksum: generation.previousManifestChecksum,
        quarantine_checksum_before: quarantine.quarantine_checksum,
        quarantine_checksum_after: result.quarantine_checksum,
        executed_at: at,
        actor_role: receipt.actor_role,
        actor_id: receipt.actor_id,
    };
    const updatedEntries = ledger.entries.map((entry) => entry.receipt_id === receiptId ? {
        ...entry,
        consumed: true,
        consumed_at: at,
        execution_status: execution.status,
        execution_deleted_count: execution.deleted_count,
        execution_checksum: checksum(execution, 48),
    } : entry);
    writeConflictResolutionGcApprovalLedger(groupId, updatedEntries, at);
    return { ...execution, result };
}
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, options = {}) {
    const maintenanceFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
    const maintenanceLedger = readJson(maintenanceFile, {});
    const approvalLedger = readConflictResolutionGcApprovalLedger(groupId);
    const notificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
    const notificationLedger = readJson(notificationFile, {});
    const receipts = approvalLedger.entries || [];
    const invalidReceipts = receipts.filter((receipt) => receipt.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-gc-approval-receipt-v1"
        || String(receipt.group_id || "") !== groupId
        || receipt.receipt_checksum !== conflictResolutionGcApprovalReceiptChecksum(receipt));
    const latestRun = maintenanceLedger.latest_run || null;
    const latestRunSafe = !latestRun || (latestRun.mode === "verify_and_quarantine_dry_run_only"
        && latestRun.destructive_action_authorized === false
        && latestRun.deletion_attempted === false);
    const generation = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at: options.at || options.now || now(),
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
    });
    const notificationDeliveryHealth = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupId, options);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-status-v1",
        groupId,
        status: latestRunSafe && invalidReceipts.length === 0 && generation.valid === true && quarantine.quarantine_input_valid !== false ? "ok" : "fail",
        maintenanceFile,
        approvalFile: approvalLedger.file,
        notificationFile,
        notifications: Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [],
        notificationCount: Number(notificationLedger.notification_count || 0),
        notificationDeliveryHealth,
        latestRun,
        nextRunAt: maintenanceLedger.next_run_at || latestRun?.next_run_at || "",
        latestRunSafe,
        receiptCount: receipts.length,
        openApprovalCount: receipts.filter((receipt) => receipt.consumed !== true && receipt.revoked !== true).length,
        consumedApprovalCount: receipts.filter((receipt) => receipt.consumed === true).length,
        invalidApprovalCount: invalidReceipts.length,
        backgroundDeletionAuthorized: false,
        generation,
        quarantine,
        recommendation: conflictResolutionMaintenanceRecommendation(generation, quarantine),
        gaps: [
            ...(!latestRunSafe ? ["maintenance_latest_run_violated_dry_run_boundary"] : []),
            ...(invalidReceipts.length ? [`invalid_gc_approval_receipts:${invalidReceipts.length}`] : []),
            ...(generation.gaps || []),
            ...(quarantine.quarantine_input_valid === false ? ["quarantine_manifest_invalid"] : []),
        ],
    };
}
function runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupIds = [], options = {}) {
    const at = String(options.at || options.now || now());
    const atMs = Date.parse(at);
    const rows = uniqueStrings(groupIds, 500).map((groupId) => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
        const ledger = readJson(file, {});
        const nextRunAt = String(ledger.next_run_at || "");
        const nextRunMs = Date.parse(nextRunAt);
        const due = options.force === true || !Number.isFinite(nextRunMs) || (Number.isFinite(atMs) && atMs >= nextRunMs);
        if (!due)
            return { groupId, due: false, skipped: true, nextRunAt, destructiveActionAuthorized: false };
        const run = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, {
            at,
            trigger: "background",
            intervalMs: options.intervalMs || options.interval_ms,
            gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
            persist: options.persist !== false,
            emitNotifications: options.emitNotifications === true || options.emit_notifications === true,
        });
        return { groupId, due: true, skipped: false, run, nextRunAt: run.next_run_at, destructiveActionAuthorized: false };
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-due-maintenance-v1",
        at,
        groupCount: rows.length,
        dueCount: rows.filter(row => row.due).length,
        skippedCount: rows.filter(row => row.skipped).length,
        destructiveActionAuthorized: false,
        deletedCount: 0,
        rows,
    };
}
function loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId) {
    const manifest = readConflictResolutionColdArchiveManifest(groupId);
    if (!manifest)
        return [];
    const verification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, { includeRows: true });
    if (!verification.valid)
        throw new Error(`conflict-resolution cold archive verification failed: ${(verification.gaps || []).join(",")}`);
    return verification.rows || [];
}
function writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, inputRows = [], options = {}) {
    const rows = [...inputRows]
        .filter((row) => String(row.group_id || "") === groupId && row.row_id)
        .sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || "")));
    const currentManifest = readConflictResolutionColdArchiveManifest(groupId);
    if (currentManifest) {
        const currentVerification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, {
            manifest: currentManifest,
            manifestFile: currentManifest.file,
        });
        if (!currentVerification.valid)
            throw new Error(`refusing to advance invalid conflict-resolution cold archive manifest: ${(currentVerification.gaps || []).join(",")}`);
        const currentGenerationFile = getConflictResolutionColdArchiveManifestGenerationFile(groupId, currentManifest.manifest_checksum);
        if (fs.existsSync(currentGenerationFile)) {
            const existingGeneration = readJson(currentGenerationFile, null);
            if (!existingGeneration || existingGeneration.manifest_checksum !== currentManifest.manifest_checksum
                || conflictResolutionColdArchiveManifestChecksum(existingGeneration) !== currentManifest.manifest_checksum) {
                throw new Error(`existing conflict-resolution manifest generation is invalid: ${currentGenerationFile}`);
            }
        }
        else {
            const state = { ...currentManifest };
            delete state.file;
            writeJsonAtomic(currentGenerationFile, state);
        }
    }
    const buckets = new Map();
    for (const row of rows) {
        const bucket = checksum(String(row.row_id || ""), 1);
        buckets.set(bucket, [...(buckets.get(bucket) || []), row]);
    }
    const typedDir = getGroupTypedMemoryDir(groupId);
    const descriptors = [];
    for (const [bucket, bucketRows] of [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const sortedRows = [...bucketRows].sort((a, b) => String(a.row_id || "").localeCompare(String(b.row_id || "")));
        const contentChecksum = checksum(sortedRows, 48);
        const relPath = path.posix.join(exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR, "shards", bucket, `${contentChecksum}.json`);
        const file = conflictResolutionColdArchiveShardFile(groupId, relPath);
        const shard = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1",
            version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
            group_id: groupId,
            bucket,
            content_checksum: contentChecksum,
            row_count: sortedRows.length,
            rows: sortedRows,
            created_at: String(options.updatedAt || options.updated_at || now()),
        };
        if (fs.existsSync(file)) {
            const existing = readJson(file, null);
            if (!existing || checksum(existing.rows || [], 48) !== contentChecksum || existing.content_checksum !== contentChecksum) {
                throw new Error(`refusing to overwrite invalid content-addressed conflict-resolution shard: ${file}`);
            }
        }
        else {
            writeJsonAtomic(file, shard);
        }
        descriptors.push({
            shard_id: `conflict-resolution-shard:${bucket}:${contentChecksum}`,
            bucket,
            rel_path: path.relative(typedDir, file).split(path.sep).join("/"),
            content_checksum: contentChecksum,
            row_count: sortedRows.length,
            row_ids: sortedRows.map((row) => row.row_id),
            resolution_entry_ids: uniqueStrings(sortedRows.map((row) => row.resolution_entry_id), sortedRows.length),
            task_family_keys: uniqueStrings(sortedRows.map((row) => row.task_family_key), sortedRows.length),
            row_ids_checksum: checksum(sortedRows.map((row) => row.row_id), 48),
        });
    }
    const generationNumber = currentManifest ? Math.max(1, Number(currentManifest.generation_number || 1)) + 1 : 1;
    const previousManifestChecksum = String(currentManifest?.manifest_checksum || "");
    const previousManifestFile = previousManifestChecksum
        ? getConflictResolutionColdArchiveManifestGenerationFile(groupId, previousManifestChecksum)
        : "";
    const manifest = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-manifest-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION,
        group_id: groupId,
        row_count: rows.length,
        hot_row_count: Math.min(rows.length, Number(options.hotRowLimit || options.hot_row_limit || exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT)),
        shard_count: descriptors.length,
        rows_checksum: checksum(rows, 48),
        shards: descriptors,
        generation_number: generationNumber,
        generation_id: `conflict-resolution-cold-generation:${generationNumber}:${checksum(rows, 16)}`,
        previous_manifest_checksum: previousManifestChecksum,
        previous_manifest_rel_path: previousManifestFile ? path.relative(typedDir, previousManifestFile).split(path.sep).join("/") : "",
        updated_at: String(options.updatedAt || options.updated_at || now()),
    };
    manifest.manifest_checksum = conflictResolutionColdArchiveManifestChecksum(manifest);
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
    const generationFile = getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifest.manifest_checksum);
    if (fs.existsSync(generationFile)) {
        const existing = readJson(generationFile, null);
        if (!existing || existing.manifest_checksum !== manifest.manifest_checksum
            || conflictResolutionColdArchiveManifestChecksum(existing) !== manifest.manifest_checksum) {
            throw new Error(`refusing to overwrite invalid conflict-resolution manifest generation: ${generationFile}`);
        }
    }
    else {
        writeJsonAtomic(generationFile, manifest);
    }
    writeJsonAtomic(file, manifest);
    return { ...manifest, file, generation_file: generationFile };
}
function lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query = {}, options = {}) {
    const manifest = readConflictResolutionColdArchiveManifest(groupId);
    if (!manifest)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
            groupId,
            status: "missing",
            found: false,
            rows: [],
            shardsRead: 0,
            gaps: ["cold_archive_manifest_missing"],
        };
    if (manifest.manifest_checksum !== conflictResolutionColdArchiveManifestChecksum(manifest))
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
            groupId,
            status: "tampered",
            found: false,
            rows: [],
            shardsRead: 0,
            gaps: ["cold_archive_manifest_checksum_mismatch"],
        };
    const rowId = String(query.rowId || query.row_id || "").trim();
    const resolutionEntryId = String(query.resolutionEntryId || query.resolution_entry_id || query.entryId || query.entry_id || "").trim();
    const taskFamilyKey = String(query.taskFamilyKey || query.task_family_key || "").trim();
    const descriptors = (manifest.shards || []).filter((shard) => {
        if (rowId)
            return (shard.row_ids || []).includes(rowId);
        if (resolutionEntryId)
            return (shard.resolution_entry_ids || []).includes(resolutionEntryId);
        if (taskFamilyKey)
            return (shard.task_family_keys || []).includes(taskFamilyKey);
        return options.verifyAll === true || options.verify_all === true;
    });
    const shardResults = descriptors.map((descriptor) => readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor));
    if (shardResults.some((result) => !result.valid))
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
            groupId,
            status: "tampered",
            found: false,
            rows: [],
            shardsRead: shardResults.length,
            gaps: shardResults.filter((result) => !result.valid).map((result) => `cold_archive_shard_invalid:${result.descriptor?.bucket || "unknown"}`),
        };
    const rows = shardResults.flatMap((result) => result.rows).filter((row) => {
        if (rowId && row.row_id !== rowId)
            return false;
        if (resolutionEntryId && row.resolution_entry_id !== resolutionEntryId)
            return false;
        if (taskFamilyKey && row.task_family_key !== taskFamilyKey)
            return false;
        return true;
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-lookup-v1",
        groupId,
        status: rows.length ? "found" : "not_found",
        found: rows.length > 0,
        rows: rows.slice(0, Math.max(1, Number(options.limit || 20))),
        matchedRowCount: rows.length,
        shardsRead: shardResults.length,
        manifestChecksum: manifest.manifest_checksum,
        gaps: [],
    };
}
function restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId, query = {}, options = {}) {
    const lookup = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query, options);
    if (lookup.status === "tampered")
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
            groupId,
            status: "blocked",
            restored: false,
            reason: "cold_archive_integrity_failed",
            lookup,
        };
    if (!lookup.found || !(lookup.rows || []).length)
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
            groupId,
            status: "not_found",
            restored: false,
            reason: "matching_cold_rows_not_found",
            lookup,
        };
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const archive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
    if (archive.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1")
        return {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
            groupId,
            status: "blocked",
            restored: false,
            reason: "hot_archive_contract_missing",
            lookup,
        };
    const hotRowLimit = Math.max(20, Number(archive.hot_row_limit || exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT));
    const requested = new Map((lookup.rows || []).slice(0, hotRowLimit).map((row) => [String(row.row_id || ""), row]));
    const merged = new Map();
    for (const row of Array.isArray(archive.rows) ? archive.rows : [])
        merged.set(String(row.row_id || ""), row);
    for (const [rowId, row] of requested)
        merged.set(rowId, row);
    const sorted = [...merged.values()].sort((a, b) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")));
    const requestedIds = new Set(requested.keys());
    const recentNonRequested = sorted.filter((row) => !requestedIds.has(String(row.row_id || ""))).slice(-Math.max(0, hotRowLimit - requestedIds.size));
    const restoredRows = [...recentNonRequested, ...requested.values()]
        .sort((a, b) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")))
        .slice(-hotRowLimit);
    const restoredAt = String(options.restoredAt || options.restored_at || now());
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: {
            ...archive,
            rows: restoredRows,
            hot_row_count: restoredRows.length,
            restored_cold_row_ids: uniqueStrings([...(archive.restored_cold_row_ids || []), ...requestedIds], 64),
            last_cold_restore_at: restoredAt,
            cold_restore_mode: "audit_only_not_current_authority",
        },
        updatedAt: restoredAt,
    });
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-restore-v1",
        groupId,
        status: "restored",
        restored: true,
        restoredRowCount: requested.size,
        restoredRowIds: [...requestedIds],
        hotRowCount: restoredRows.length,
        hotRowLimit,
        authorityBoundary: "audit_only_not_current_authority",
        lookup,
        restoredAt,
    };
}
function distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input = {}, options = {}) {
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input, { ...options, updatedAt });
    const previousArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
    const previousColdRows = loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId);
    const merged = new Map();
    for (const row of previousColdRows)
        merged.set(row.row_id, row);
    for (const row of Array.isArray(previousArchive.rows) ? previousArchive.rows : [])
        merged.set(row.row_id, row);
    const previousIds = new Set(merged.keys());
    for (const row of incomingRows) {
        const previous = merged.get(row.row_id);
        merged.set(row.row_id, {
            ...(previous || {}),
            ...row,
            first_seen_at: previous?.first_seen_at || row.resolved_at,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const rows = [...merged.values()].sort((a, b) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")));
    const hotRowLimit = Math.max(20, Number(options.hotRowLimit || options.hot_row_limit || exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT));
    const hotRows = rows.slice(-hotRowLimit);
    const coldManifest = writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, rows, { ...options, updatedAt, hotRowLimit });
    const archive = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        resolved_used_or_verified_count: rows.filter((row) => ["used", "verified"].includes(row.resolution_usage_state)).length,
        resolved_ignored_count: rows.filter((row) => row.resolution_usage_state === "ignored").length,
        task_family_count: uniqueStrings(rows.map((row) => row.task_family_key), 320).length,
        task_session_count: uniqueStrings(rows.map((row) => row.task_agent_session_id), 320).length,
        native_session_count: uniqueStrings(rows.map((row) => row.native_session_id), 320).length,
        immutable_branch_count: rows.length,
        retention_policy: "checksum_addressed_cold_shards_bounded_hot_index_render_latest_100",
        retention_pruned_count: 0,
        hot_row_limit: hotRowLimit,
        hot_row_count: hotRows.length,
        cold_archive_row_count: Number(coldManifest.row_count || 0),
        cold_archive_shard_count: Number(coldManifest.shard_count || 0),
        cold_archive_manifest_rel_path: path.relative(getGroupTypedMemoryDir(groupId), coldManifest.file).split(path.sep).join("/"),
        cold_archive_manifest_checksum: coldManifest.manifest_checksum,
        cold_archive_rows_checksum: coldManifest.rows_checksum,
        rows: hotRows,
        updatedAt,
    };
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "post-compact-completion-memory-preservation-closure-conflict-resolutions",
            name: "Post-compact completion memory preservation closure conflict resolutions",
            description: "Session-bound, reversible current-source decisions resolving contradictory closure-memory feedback without erasing historical branches.",
            source: "auto:post-compact-completion-memory-preservation-closure-conflict-resolution-distillation",
            updatedAt,
            body: renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
        version: exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
        groupId,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingRows.some((incoming) => incoming.row_id === row.row_id)).length,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function providerRankingMemoryUsageReceiptRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.candidates) ? input.candidates : []),
        ...(Array.isArray(input.briefs) ? input.briefs : []),
        ...(Array.isArray(input.gaps) ? input.gaps : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.candidates) ? group.candidates : []),
        ...(Array.isArray(group.briefs) ? group.briefs : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function providerRankingMemoryUsageReceiptRepairRowId(row = {}) {
    return `provider-ranking-memory-usage-receipt-repair:${checksum([
        row.groupId,
        row.work_item_id,
        row.brief_id,
        row.worker_context_packet_id,
        row.binding_id,
        row.project,
        row.doc_rel_paths,
        row.gap_signature,
    ], 24)}`;
}
function normalizeProviderRankingMemoryUsageReceiptRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerRankingMemoryUsageReceiptRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
        const source = String(entry.source || raw?.source || "").trim();
        const docRelPaths = providerRankingProvenanceStringList(entry.provider_ranking_provenance_rel_paths, entry.providerRankingProvenanceRelPaths, entry.provider_ranking_compact_repair_receipt_memory_usage_doc_rel_path, entry.providerRankingCompactRepairReceiptMemoryUsageDocRelPath, entry.docRelPath, entry.doc_rel_path, raw?.provider_ranking_provenance_rel_paths, raw?.docRelPath, raw?.doc_rel_path);
        const gapCodes = providerRankingProvenanceStringList(entry.provider_ranking_provenance_gap_codes, entry.providerRankingProvenanceGapCodes, Array.isArray(entry.gaps) ? entry.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [], Array.isArray(raw?.gaps) ? raw.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : []);
        const text = [
            entry.reason,
            entry.source_reason,
            entry.description,
            entry.instruction,
            entry.expected,
            entry.prompt_patch,
            entry.promptPatch,
            entry.worker_task,
            entry.workerTask,
            raw?.reason,
        ].filter(Boolean).join("\n");
        const row = {
            schema: "ccm-provider-ranking-memory-usage-receipt-repair-distilled-row-v1",
            version: exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source,
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            priority: String(entry.priority || raw?.priority || "").trim(),
            component: String(entry.component || raw?.component || "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_contract").trim(),
            doc_rel_paths: docRelPaths,
            gap_codes: gapCodes,
            gap_signature: gapCodes.join("|"),
            reason: compactText(entry.reason || entry.source_reason || entry.description || entry.instruction || raw?.reason || gapCodes.join("; ") || "provider ranking memory usage receipt repair required", 1000),
            expected: compactText(entry.expected || raw?.expected || "Corrected CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored cites provider-ranking-provenance-compact-repair-receipt-memory.md and preserves the authorization boundary.", 900),
            prompt_patch: compactText(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1500),
            worker_task: compactText(entry.worker_task || entry.workerTask || raw?.worker_task || "", 1800),
            has_memory_used_prompt: /memoryUsed/i.test(text),
            has_memory_ignored_prompt: /memoryIgnored/i.test(text),
            has_usage_state_prompt: /usageState|usage_state/i.test(text),
            has_authorization_boundary_prompt: /ranking evidence only, not authorization/i.test(text),
            has_fresh_receipt_prompt: /fresh valid provider switch decision receipt/i.test(text),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerRankingMemoryUsageReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair"
        || row.component === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_contract"
        || /provider ranking.*memory usage|memoryUsed|memoryIgnored|fresh valid provider switch decision receipt|ranking evidence only, not authorization/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}\n${row.worker_task}`));
}
function mergeProviderRankingMemoryUsageReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerRankingMemoryUsageReceiptRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || providerRankingMemoryUsageReceiptRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function providerRankingMemoryUsageReceiptRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const docRelPaths = uniqueStrings(rows.flatMap((row) => Array.isArray(row.doc_rel_paths) ? row.doc_rel_paths : []), 80);
    return {
        schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
        version: exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail", "ready"].includes(String(row.status || ""))).length,
        completed_count: rows.filter((row) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        doc_rel_path_count: docRelPaths.length,
        corrected_prompt_count: rows.filter((row) => row.has_memory_used_prompt === true && row.has_memory_ignored_prompt === true).length,
        usage_state_prompt_count: rows.filter((row) => row.has_usage_state_prompt === true).length,
        authorization_boundary_prompt_count: rows.filter((row) => row.has_authorization_boundary_prompt === true).length,
        fresh_receipt_prompt_count: rows.filter((row) => row.has_fresh_receipt_prompt === true).length,
        doc_rel_paths: docRelPaths,
        rows,
        updatedAt,
    };
}
function renderProviderRankingMemoryUsageReceiptRepairBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Provider Ranking Memory Usage Receipt Discipline",
        "",
        `Generated by CCM provider ranking memory usage receipt repair distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records corrected-receipt repair briefs for child Agents that received provider ranking compact repair typed memory but failed to cite it in CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored.",
        "Stable rule: if provider-ranking-provenance-compact-repair-receipt-memory.md is present in WorkerContextPacket, the final receipt must explicitly mention it in memoryUsed or memoryIgnored, declare usageState, and restate that provider ranking history is ranking evidence only, not authorization.",
        "Any explicit provider switch still requires a fresh valid provider switch decision receipt.",
        "",
        "## Corrected Receipt Rows",
    ];
    for (const row of rows.slice(-80).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
        ].filter(Boolean).join("; ");
        const docs = Array.isArray(row.doc_rel_paths) && row.doc_rel_paths.length ? row.doc_rel_paths.slice(0, 6).join(", ") : "provider-ranking-provenance-compact-repair-receipt-memory.md";
        lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; memory_doc=${docs}.`);
        lines.push("  Rule: corrected CCM_AGENT_RECEIPT must include memoryUsed or memoryIgnored for this doc, include usageState, include ranking evidence only, not authorization, and require a fresh valid provider switch decision receipt for explicit switches.");
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
        if (row.reason)
            lines.push(`  Evidence: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
            version: exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderRankingMemoryUsageReceiptRepairRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderRankingMemoryUsageReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = providerRankingMemoryUsageReceiptRepairArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "provider-ranking-memory-usage-receipt-discipline",
            name: "Provider ranking memory usage receipt discipline",
            description: "Child Agent receipt discipline for provider ranking compact repair typed memory usage.",
            source: "auto:provider-ranking-memory-usage-receipt-repair-distillation",
            updatedAt,
            body: renderProviderRankingMemoryUsageReceiptRepairBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        providerRankingMemoryUsageReceiptRepairArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
        version: exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        openCount: archive.open_count,
        completedCount: archive.completed_count,
        packetBoundCount: archive.packet_bound_count,
        docRelPathCount: archive.doc_rel_path_count,
        correctedPromptCount: archive.corrected_prompt_count,
        usageStatePromptCount: archive.usage_state_prompt_count,
        authorizationBoundaryPromptCount: archive.authorization_boundary_prompt_count,
        freshReceiptPromptCount: archive.fresh_receipt_prompt_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function providerDispatchOverrideFollowupInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
        ...(Array.isArray(input.bindingLedger?.entries) ? input.bindingLedger.entries : []),
        ...(Array.isArray(input.binding_ledger?.entries) ? input.binding_ledger.entries : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.entries) ? group.entries : []),
        ...(Array.isArray(group.bindings) ? group.bindings : []),
        ...(Array.isArray(group.checks) ? group.checks : []),
    ].map((row) => ({ ...row, groupId: row.groupId || row.group_id || group.groupId || group.group_id || "" })));
}
function providerDispatchOverrideFollowupDecision(entry = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_decision
        || entry.workerContextProviderDispatchDecision
        || entry.provider_dispatch_decision
        || entry.providerDispatchDecision
        || raw.decision
        || {};
}
function providerDispatchOverrideFollowupReceipt(entry = {}, decision = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_override_receipt
        || entry.workerContextProviderDispatchOverrideReceipt
        || entry.provider_dispatch_override_receipt
        || entry.providerDispatchOverrideReceipt
        || decision.provider_dispatch_override_receipt
        || decision.providerDispatchOverrideReceipt
        || decision.override
        || raw.override
        || raw.overrideReceipt
        || raw.override_receipt
        || {};
}
function providerDispatchOverrideFollowupCompletion(entry = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_override_completion
        || entry.workerContextProviderDispatchOverrideCompletion
        || entry.provider_dispatch_override_completion
        || entry.providerDispatchOverrideCompletion
        || raw.completion
        || {};
}
function providerDispatchOverrideFollowupRepair(entry = {}, completion = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_override_followup_repair
        || entry.workerContextProviderDispatchOverrideFollowupRepair
        || entry.provider_dispatch_override_followup_repair_work_item
        || entry.providerDispatchOverrideFollowupRepairWorkItem
        || raw.followup
        || raw.followupRepair
        || raw.followup_repair
        || (completion.followup_work_item_id ? { work_item_id: completion.followup_work_item_id } : {})
        || {};
}
function providerDispatchOverrideFollowupUsageRows(receipt = {}) {
    return [
        ...(Array.isArray(receipt.memoryProvenanceUsage) ? receipt.memoryProvenanceUsage : []),
        ...(Array.isArray(receipt.memory_provenance_usage) ? receipt.memory_provenance_usage : []),
        ...(Array.isArray(receipt.pressureMemoryProvenanceUsage) ? receipt.pressureMemoryProvenanceUsage : []),
        ...(Array.isArray(receipt.pressure_memory_provenance_usage) ? receipt.pressure_memory_provenance_usage : []),
    ].filter((row) => row && typeof row === "object");
}
function providerDispatchOverrideFollowupRowId(row = {}) {
    return `provider-dispatch-override-followup:${checksum([
        row.groupId,
        row.binding_id,
        row.assignment_id,
        row.worker_context_packet_id,
        row.override_id,
        row.completion_id,
        row.followup_work_item_id,
    ], 24)}`;
}
function normalizeProviderDispatchOverrideFollowupRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerDispatchOverrideFollowupInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const decision = providerDispatchOverrideFollowupDecision(entry, raw);
        const overrideReceipt = providerDispatchOverrideFollowupReceipt(entry, decision, raw);
        const completion = providerDispatchOverrideFollowupCompletion(entry, raw);
        const followup = providerDispatchOverrideFollowupRepair(entry, completion, raw);
        const receipt = completion.receipt || raw.receipt || {};
        const usageRows = providerDispatchOverrideFollowupUsageRows(receipt);
        const verifiedRows = usageRows.filter((row) => row.currentSourceVerified === true || row.current_source_verified === true);
        const completionOk = completion.completion_ok === true
            || (String(completion.status || "").toLowerCase() === "completed"
                && usageRows.length > 0
                && verifiedRows.length === usageRows.length);
        const memoryUsageCount = Number(completion.memory_provenance_usage_count || completion.memoryProvenanceUsageCount || usageRows.length || 0);
        const verifiedCount = Number(completion.current_source_verified_count || completion.currentSourceVerifiedCount || verifiedRows.length || 0);
        const row = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distilled-row-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            project: String(entry.project || decision.project || completion.project || raw?.project || "").trim(),
            agent_type: String(entry.agent_type || entry.agentType || decision.agent_type || decision.agentType || completion.agent_type || completion.agentType || "unknown").trim() || "unknown",
            binding_id: String(entry.binding_id || entry.bindingId || completion.binding_id || completion.bindingId || raw?.binding_id || raw?.bindingId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || completion.assignment_id || completion.assignmentId || raw?.assignment_id || raw?.assignmentId || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || completion.dispatch_key || completion.dispatchKey || raw?.dispatch_key || raw?.dispatchKey || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || completion.worker_context_packet_id || completion.workerContextPacketId || raw?.worker_context_packet_id || raw?.workerContextPacketId || "").trim(),
            decision_id: String(decision.decision_id || decision.decisionId || completion.decision_id || completion.decisionId || raw?.decision_id || raw?.decisionId || "").trim(),
            override_id: String(overrideReceipt.override_id || overrideReceipt.overrideId || completion.override_id || completion.overrideId || raw?.override_id || raw?.overrideId || "").trim(),
            followup_work_item_id: String(followup.work_item_id || followup.workItemId || completion.followup_work_item_id || completion.followupWorkItemId || raw?.followup_work_item_id || raw?.followupWorkItemId || "").trim(),
            completion_id: String(completion.completion_id || completion.completionId || raw?.completion_id || raw?.completionId || "").trim(),
            task_id: String(completion.task_id || completion.taskId || raw?.task_id || raw?.taskId || "").trim(),
            worker_handoff_id: String(completion.worker_handoff_id || completion.workerHandoffId || raw?.worker_handoff_id || raw?.workerHandoffId || "").trim(),
            task_agent_session_id: String(completion.task_agent_session_id || completion.taskAgentSessionId || raw?.task_agent_session_id || raw?.taskAgentSessionId || "").trim(),
            native_session_id: String(completion.native_session_id || completion.nativeSessionId || raw?.native_session_id || raw?.nativeSessionId || "").trim(),
            execution_id: String(completion.execution_id || completion.executionId || raw?.execution_id || raw?.executionId || "").trim(),
            memory_context_snapshot_id: String(completion.memory_context_snapshot_id || completion.memoryContextSnapshotId || raw?.memory_context_snapshot_id || raw?.memoryContextSnapshotId || "").trim(),
            receipt_status: String(completion.receipt_status || completion.receiptStatus || receipt.status || raw?.receipt_status || raw?.receiptStatus || "").trim().toLowerCase(),
            completion_status: completionOk ? "completed" : String(completion.status || "needs_repair").trim().toLowerCase(),
            completion_ok: completionOk,
            memory_provenance_usage_count: memoryUsageCount,
            current_source_verified_count: verifiedCount,
            all_current_source_verified: memoryUsageCount > 0 && verifiedCount === memoryUsageCount,
            approved_by: String(overrideReceipt.approved_by || overrideReceipt.approvedBy || raw?.approved_by || raw?.approvedBy || "").trim(),
            override_reason: compactText(overrideReceipt.reason || overrideReceipt.override_reason || overrideReceipt.overrideReason || raw?.override_reason || "", 700),
            completion_reason: compactText(completion.reason || raw?.reason || "", 700),
            rel_paths: uniqueStrings(usageRows.map((usage) => usage.relPath || usage.rel_path || usage.path || usage.file).filter(Boolean), 16),
            repair_statuses: uniqueStrings(usageRows.map((usage) => usage.repairStatus || usage.repair_status).filter(Boolean), 8),
            repair_gap_types: uniqueStrings(usageRows.map((usage) => usage.repairGapType || usage.repair_gap_type).filter(Boolean), 8),
            usage_states: uniqueStrings(usageRows.map((usage) => usage.usageState || usage.usage_state).filter(Boolean), 8),
            usage_reasons: uniqueStrings(usageRows.map((usage) => usage.reason || usage.summary || usage.note).filter(Boolean), 8),
            dispatch_policy: String(decision.dispatch_policy || decision.dispatchPolicy || decision.action || "").trim(),
            health_status: String(decision.advisory_health_status || decision.health_status || decision.healthStatus || entry.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.health_status || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || completion.at || options.updatedAt || now()),
            last_seen_at: String(completion.at || entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerDispatchOverrideFollowupRowId(row) };
    }).filter((row) => row.completion_ok === true)
        .filter((row) => row.memory_provenance_usage_count > 0 && row.all_current_source_verified === true);
}
function mergeProviderDispatchOverrideFollowupRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function pressureProvenanceProviderDispatchOverrideFollowupArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const attributionMap = new Map();
    for (const row of rows || []) {
        const key = `${String(row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        const current = attributionMap.get(key) || {
            agent_type: row.agent_type || "unknown",
            project: row.project || "unknown",
            completed_count: 0,
            memory_provenance_usage_count: 0,
            current_source_verified_count: 0,
            rel_paths: [],
            followup_work_item_ids: [],
            override_ids: [],
            first_completed_at: "",
            last_completed_at: "",
        };
        current.completed_count += 1;
        current.memory_provenance_usage_count += Number(row.memory_provenance_usage_count || 0);
        current.current_source_verified_count += Number(row.current_source_verified_count || 0);
        current.rel_paths = uniqueStrings([...(current.rel_paths || []), ...(Array.isArray(row.rel_paths) ? row.rel_paths : [])], 20);
        current.followup_work_item_ids = uniqueStrings([...(current.followup_work_item_ids || []), row.followup_work_item_id].filter(Boolean), 20);
        current.override_ids = uniqueStrings([...(current.override_ids || []), row.override_id].filter(Boolean), 20);
        const completedAt = String(row.last_seen_at || row.first_seen_at || "");
        current.first_completed_at = current.first_completed_at
            ? [current.first_completed_at, completedAt].filter(Boolean).sort()[0]
            : completedAt;
        current.last_completed_at = [current.last_completed_at, completedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()]
        .sort((a, b) => Number(b.completed_count || 0) - Number(a.completed_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    const relPaths = uniqueStrings(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
        archived_count: rows.length,
        completed_count: rows.length,
        attribution_count: attributions.length,
        rel_path_count: relPaths.length,
        all_current_source_verified_count: rows.filter((row) => row.all_current_source_verified === true).length,
        rel_paths: relPaths,
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenanceProviderDispatchOverrideFollowupBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Dispatch Override Follow-up Repair History",
        "",
        `Generated by CCM provider dispatch override follow-up distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records cases where pressure provenance provider dispatch was temporarily overridden, then repaired by a child Agent completion receipt with verified memoryProvenanceUsage rows.",
        "Stable rule: a completed override follow-up proves the specific repair loop was closed; it does not make future provider holds safe by default. Future dispatch should still prefer the normal provider gate, sample receipts, and re-check current source evidence.",
        "",
        "## Executor / Project Repair Attributions",
    ];
    for (const row of attributions.slice(0, 20)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; completed=${row.completed_count || 0}; receiptRows=${row.memory_provenance_usage_count || 0}; verifiedRows=${row.current_source_verified_count || 0}; lastCompletedAt=${row.last_completed_at || ""}.`);
        if (row.rel_paths?.length)
            lines.push(`  Evidence docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.followup_work_item_ids?.length)
            lines.push(`  Follow-up work items: ${row.followup_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Completed Override Follow-ups");
    for (const row of rows.slice(-40).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.agent_type ? `agentType=${row.agent_type}` : "",
            row.task_id ? `task=${row.task_id}` : "",
            row.override_id ? `override=${row.override_id}` : "",
            row.completion_id ? `completion=${row.completion_id}` : "",
            row.followup_work_item_id ? `work_item=${row.followup_work_item_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [repaired] ${ids || row.row_id}; memoryProvenanceUsage=${row.memory_provenance_usage_count || 0}; currentSourceVerified=${row.current_source_verified_count || 0}; session=${row.task_agent_session_id || "unknown"}; execution=${row.execution_id || "unknown"}.`);
        if (row.rel_paths?.length)
            lines.push(`  relPath=${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.usage_reasons?.length)
            lines.push(`  Usage evidence: ${row.usage_reasons.slice(0, 4).map((item) => compactText(item, 500).replace(/\n/g, " ")).join(" | ")}`);
        if (row.override_reason)
            lines.push(`  Override reason: ${compactText(row.override_reason, 500).replace(/\n/g, " ")}`);
        if (row.completion_reason)
            lines.push(`  Completion reason: ${compactText(row.completion_reason, 500).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Treat these rows as repaired history and cautionary context for the same agentType/project. If a new provider advisory says hold_until_repair, do not bypass it just because an older override was later repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderDispatchOverrideFollowupRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderDispatchOverrideFollowupRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = pressureProvenanceProviderDispatchOverrideFollowupArchive(merged.rows, { ...options, updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "provider-dispatch-override-followup-recall",
            name: "Provider dispatch override follow-up repair history",
            description: "Completed pressure provenance provider dispatch overrides whose follow-up repair was verified by child Agent memoryProvenanceUsage receipts.",
            source: "auto:pressure-provenance-provider-dispatch-override-followup-distillation",
            updatedAt,
            body: renderPressureProvenanceProviderDispatchOverrideFollowupBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        pressureProvenanceProviderDispatchOverrideFollowupArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        completedCount: archive.completed_count,
        attributionCount: archive.attribution_count,
        relPathCount: archive.rel_path_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function providerSwitchExecutionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.executions) ? input.executions : []),
        ...(Array.isArray(input.receipts) ? input.receipts : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
    ];
    return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}
function providerSwitchExecutionReceiptFromInput(entry = {}, raw = {}) {
    if (entry.schema === "ccm-provider-switch-execution-receipt-v1")
        return entry;
    return entry.worker_context_provider_switch_execution_receipt
        || entry.workerContextProviderSwitchExecutionReceipt
        || entry.provider_switch_execution_receipt
        || entry.providerSwitchExecutionReceipt
        || raw.executionReceipt
        || raw.execution_receipt
        || raw.providerSwitchExecutionReceipt
        || raw.provider_switch_execution_receipt
        || raw.receipt
        || {};
}
function providerSwitchDecisionReceiptFromInput(entry = {}, raw = {}, executionReceipt = {}) {
    if (entry.schema === "ccm-provider-switch-decision-receipt-v1")
        return entry;
    return entry.worker_context_provider_switch_decision_receipt
        || entry.workerContextProviderSwitchDecisionReceipt
        || entry.provider_switch_decision_receipt
        || entry.providerSwitchDecisionReceipt
        || raw.providerSwitchDecisionReceipt
        || raw.provider_switch_decision_receipt
        || executionReceipt.provider_switch_decision_receipt
        || executionReceipt.providerSwitchDecisionReceipt
        || {};
}
function providerSwitchExecutionSessionBindingFromInput(entry = {}, raw = {}) {
    return entry.worker_context_provider_switch_session_binding
        || entry.workerContextProviderSwitchSessionBinding
        || entry.provider_switch_session_binding
        || entry.providerSwitchSessionBinding
        || raw.sessionBinding
        || raw.session_binding
        || {};
}
function providerSwitchExecutionRowId(row = {}) {
    return `provider-switch-execution:${checksum([
        row.groupId,
        row.execution_receipt_id,
        row.provider_switch_decision_receipt_id,
        row.task_agent_session_id,
        row.execution_id,
        row.expected_provider,
        row.actually_executed_provider,
        row.status,
    ], 24)}`;
}
function normalizeProviderSwitchExecutionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerSwitchExecutionInputRows(input).map((raw, index) => {
        raw = raw || {};
        const entry = raw?.entry || raw?.binding || raw || {};
        const executionReceipt = providerSwitchExecutionReceiptFromInput(entry, raw);
        const decisionReceipt = providerSwitchDecisionReceiptFromInput(entry, raw, executionReceipt);
        const sessionBinding = providerSwitchExecutionSessionBindingFromInput(entry, raw);
        const ledgerState = entry.provider_switch_ledger_state || entry.providerSwitchLedgerState || raw.provider_switch_ledger_state || {};
        const expectedProvider = String(executionReceipt.expected_provider
            || executionReceipt.expectedProvider
            || decisionReceipt.new_provider?.agent_type
            || decisionReceipt.newProvider?.agentType
            || sessionBinding.expected_provider
            || sessionBinding.expectedProvider
            || "").trim();
        const actualProvider = String(executionReceipt.actually_executed_provider
            || executionReceipt.actuallyExecutedProvider
            || executionReceipt.executed_provider
            || executionReceipt.executedProvider
            || ledgerState.actually_executed_provider
            || ledgerState.actuallyExecutedProvider
            || sessionBinding.session_provider
            || sessionBinding.sessionProvider
            || "").trim();
        const gaps = uniqueStrings([
            ...(Array.isArray(executionReceipt.gaps) ? executionReceipt.gaps : []),
            ...(Array.isArray(raw.gaps) ? raw.gaps : []),
        ], 24);
        const status = String(executionReceipt.status || raw.status || "").trim().toLowerCase() === "passed"
            || executionReceipt.executed_as_approved === true
            ? "passed"
            : "failed";
        const mismatch = gaps.includes("executed_provider_mismatch")
            || (!!expectedProvider && !!actualProvider && expectedProvider.toLowerCase() !== actualProvider.toLowerCase());
        const at = String(executionReceipt.at || raw.at || entry.at || options.updatedAt || now());
        const row = {
            schema: "ccm-provider-switch-execution-distilled-row-v1",
            version: exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
            groupId: String(executionReceipt.groupId || executionReceipt.group_id || entry.groupId || entry.group_id || raw.groupId || raw.group_id || fallbackGroupId || "").trim(),
            project: String(executionReceipt.project || decisionReceipt.project || entry.project || raw.project || "").trim(),
            agent_type: expectedProvider || "unknown",
            old_provider: String(decisionReceipt.old_provider?.agent_type || decisionReceipt.oldProvider?.agentType || entry.original_agent_type || entry.originalAgentType || "").trim(),
            expected_provider: expectedProvider || "unknown",
            actually_executed_provider: actualProvider || "unknown",
            provider_switch_decision_receipt_id: String(executionReceipt.provider_switch_decision_receipt_id || executionReceipt.providerSwitchDecisionReceiptId || decisionReceipt.receipt_id || raw.provider_switch_decision_receipt_id || "").trim(),
            provider_switch_decision_receipt_checksum: String(executionReceipt.provider_switch_decision_receipt_checksum || executionReceipt.providerSwitchDecisionReceiptChecksum || decisionReceipt.receipt_checksum || raw.provider_switch_decision_receipt_checksum || "").trim(),
            provider_reliability_snapshot_id: String(decisionReceipt.provider_reliability_snapshot?.snapshot_id || decisionReceipt.providerReliabilitySnapshot?.snapshotId || "").trim(),
            execution_receipt_id: String(executionReceipt.execution_receipt_id || executionReceipt.executionReceiptId || raw.execution_receipt_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw.assignment_id || raw.assignmentId || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw.dispatch_key || raw.dispatchKey || "").trim(),
            worker_context_packet_id: String(executionReceipt.worker_context_packet_id || executionReceipt.workerContextPacketId || entry.worker_context_packet_id || entry.workerContextPacketId || raw.worker_context_packet_id || "").trim(),
            task_agent_session_id: String(executionReceipt.task_agent_session_id || executionReceipt.taskAgentSessionId || entry.task_agent_session_id || raw.task_agent_session_id || "").trim(),
            native_session_id: String(executionReceipt.native_session_id || executionReceipt.nativeSessionId || entry.native_session_id || raw.native_session_id || "").trim(),
            execution_id: String(executionReceipt.execution_id || executionReceipt.executionId || entry.execution_id || raw.execution_id || "").trim(),
            receipt_status: String(executionReceipt.receipt_status || executionReceipt.receiptStatus || entry.receipt_status || raw.receipt_status || "").trim().toLowerCase(),
            advised_alternative: executionReceipt.advised_alternative === true || decisionReceipt.advised_alternative === true,
            approved_switch: executionReceipt.approved_switch === true || decisionReceipt.approved_switch === true,
            system_attested: executionReceipt.system_attested === true,
            child_declared: executionReceipt.child_declared === true,
            final_child_receipt_present: executionReceipt.final_child_receipt_present === true,
            status,
            executed_as_approved: executionReceipt.executed_as_approved === true && !mismatch && status === "passed",
            mismatch,
            gaps,
            reason: compactText(raw.reason || executionReceipt.reason || executionReceipt.child_declaration?.reason || "", 500),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || at),
            last_seen_at: at,
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerSwitchExecutionRowId(row) };
    }).filter((row) => row.groupId)
        .filter((row) => row.provider_switch_decision_receipt_id || row.execution_receipt_id || row.execution_id)
        .filter((row) => row.expected_provider && row.actually_executed_provider);
}
function mergeProviderSwitchExecutionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerSwitchExecutionRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerSwitchExecutionRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function providerSwitchExecutionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const attributionMap = new Map();
    for (const row of rows || []) {
        const key = `${String(row.expected_provider || row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        const current = attributionMap.get(key) || {
            agent_type: row.expected_provider || row.agent_type || "unknown",
            project: row.project || "unknown",
            expected_provider: row.expected_provider || row.agent_type || "unknown",
            approved_count: 0,
            executed_count: 0,
            passed_count: 0,
            failed_count: 0,
            mismatch_count: 0,
            actual_providers: [],
            execution_receipt_ids: [],
            decision_receipt_ids: [],
            task_agent_session_ids: [],
            row_ids: [],
            memory_rel_paths: ["provider-switch-execution-memory.md"],
            gap_codes: [],
            first_executed_at: "",
            last_executed_at: "",
            last_failed_at: "",
            last_passed_at: "",
        };
        current.approved_count += row.approved_switch === true ? 1 : 0;
        current.executed_count += 1;
        current.passed_count += row.status === "passed" ? 1 : 0;
        current.failed_count += row.status === "failed" ? 1 : 0;
        current.mismatch_count += row.mismatch === true ? 1 : 0;
        current.actual_providers = uniqueStrings([...(current.actual_providers || []), row.actually_executed_provider].filter(Boolean), 12);
        current.execution_receipt_ids = uniqueStrings([...(current.execution_receipt_ids || []), row.execution_receipt_id].filter(Boolean), 24);
        current.decision_receipt_ids = uniqueStrings([...(current.decision_receipt_ids || []), row.provider_switch_decision_receipt_id].filter(Boolean), 24);
        current.task_agent_session_ids = uniqueStrings([...(current.task_agent_session_ids || []), row.task_agent_session_id].filter(Boolean), 24);
        current.row_ids = uniqueStrings([...(current.row_ids || []), row.row_id].filter(Boolean), 32);
        current.memory_rel_paths = uniqueStrings([...(current.memory_rel_paths || []), "provider-switch-execution-memory.md"], 8);
        current.gap_codes = uniqueStrings([...(current.gap_codes || []), ...(Array.isArray(row.gaps) ? row.gaps : [])], 32);
        const executedAt = String(row.last_seen_at || row.first_seen_at || "");
        current.first_executed_at = current.first_executed_at
            ? [current.first_executed_at, executedAt].filter(Boolean).sort()[0]
            : executedAt;
        current.last_executed_at = [current.last_executed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        if (row.status === "failed")
            current.last_failed_at = [current.last_failed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        if (row.status === "passed")
            current.last_passed_at = [current.last_passed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()]
        .sort((a, b) => Number(b.mismatch_count || 0) - Number(a.mismatch_count || 0)
        || Number(b.failed_count || 0) - Number(a.failed_count || 0)
        || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    return {
        schema: "ccm-provider-switch-execution-distillation-v1",
        version: exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        approved_count: rows.filter((row) => row.approved_switch === true).length,
        executed_count: rows.length,
        passed_count: rows.filter((row) => row.status === "passed").length,
        failed_count: rows.filter((row) => row.status === "failed").length,
        mismatch_count: rows.filter((row) => row.mismatch === true).length,
        attribution_count: attributions.length,
        attributions,
        rows,
        updatedAt,
    };
}
function renderProviderSwitchExecutionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Switch Execution Memory",
        "",
        `Generated by CCM provider switch execution distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records approved provider switches after the child Agent session finished, including the system-attested executed provider and the child receipt declaration.",
        "Stable rule: passed switch history does not authorize future switches by itself. Failed or mismatched execution history must be treated as local dispatch caution until the runner/session cause is repaired and reverified.",
        "",
        "## Provider / Project Execution Attributions",
    ];
    for (const row of attributions.slice(0, 24)) {
        lines.push(`- expected=${row.expected_provider || row.agent_type || "unknown"}; project=${row.project || "unknown"}; executed=${row.executed_count || 0}; passed=${row.passed_count || 0}; failed=${row.failed_count || 0}; mismatch=${row.mismatch_count || 0}; actualProviders=${(row.actual_providers || []).slice(0, 6).join(",") || "unknown"}; last=${row.last_executed_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Recent Provider Switch Executions");
    for (const row of rows.slice(-40).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.expected_provider ? `expected=${row.expected_provider}` : "",
            row.actually_executed_provider ? `actual=${row.actually_executed_provider}` : "",
            row.provider_switch_decision_receipt_id ? `decision=${row.provider_switch_decision_receipt_id}` : "",
            row.execution_receipt_id ? `receipt=${row.execution_receipt_id}` : "",
            row.task_agent_session_id ? `session=${row.task_agent_session_id}` : "",
            row.execution_id ? `execution=${row.execution_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "unknown"}] ${ids || row.row_id}; approved=${row.approved_switch === true}; systemAttested=${row.system_attested === true}; childDeclared=${row.child_declared === true}; mismatch=${row.mismatch === true}.`);
        if (row.gaps?.length)
            lines.push(`  Gaps: ${row.gaps.slice(0, 8).join(", ")}.`);
        if (row.reason)
            lines.push(`  Reason: ${compactText(row.reason, 400).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use these rows as local execution feedback for the same expected provider and project. Passed history is monitoring evidence only; repeated mismatch history should require receipt sampling or a hold until the runner binding is repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderSwitchExecutionToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-provider-switch-execution-distillation-v1",
            version: exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderSwitchExecutionRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.providerSwitchExecutionArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderSwitchExecutionRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = providerSwitchExecutionArchive(merged.rows, { ...options, updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "provider-switch-execution-memory",
            name: "Provider switch execution memory",
            description: "System-attested provider switch executions and mismatch feedback from child Agent completion receipts.",
            source: "auto:provider-switch-execution-distillation",
            updatedAt,
            body: renderProviderSwitchExecutionBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        providerSwitchExecutionArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-provider-switch-execution-distillation-v1",
        version: exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        approvedCount: archive.approved_count,
        executedCount: archive.executed_count,
        passedCount: archive.passed_count,
        failedCount: archive.failed_count,
        mismatchCount: archive.mismatch_count,
        attributionCount: archive.attribution_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function providerDispatchOverrideFollowupReceiptValidationInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.validations) ? input.validations : []),
    ];
    return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}
function providerDispatchOverrideFollowupReceiptValidationRowId(row = {}) {
    return `provider-dispatch-override-followup-receipt-validation:${checksum([
        row.groupId,
        row.validation_id,
        row.binding_id,
        row.execution_id,
        row.attempt_status,
    ], 24)}`;
}
function normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerDispatchOverrideFollowupReceiptValidationInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const validation = raw?.validation
            || raw?.receipt_validation
            || entry.worker_context_provider_dispatch_override_followup_receipt_contract_validation
            || entry.provider_dispatch_override_followup_receipt_contract_validation
            || {};
        const contract = validation.contract
            || entry.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract
            || entry.workerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContract
            || {};
        const gaps = Array.isArray(validation.gaps) ? validation.gaps : [];
        const receiptEvidenceRows = providerDispatchOverrideFollowupUsageRows(validation.receipt || {});
        const status = validation.contract_satisfied === true
            ? "passed"
            : String(validation.status || "failed").trim().toLowerCase() === "passed"
                ? "passed"
                : "failed";
        const attemptAt = String(validation.at || validation.validated_at || validation.validatedAt || raw?.at || entry.at || options.updatedAt || now());
        const row = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distilled-row-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
            groupId: String(validation.groupId || validation.group_id || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            project: String(validation.project || entry.project || raw?.project || "").trim(),
            agent_type: String(validation.agent_type || validation.agentType || entry.agent_type || entry.agentType || raw?.agent_type || raw?.agentType || "unknown").trim() || "unknown",
            validation_id: String(validation.validation_id || validation.validationId || raw?.validation_id || raw?.validationId || "").trim(),
            binding_id: String(validation.binding_id || validation.bindingId || entry.binding_id || entry.bindingId || raw?.binding_id || raw?.bindingId || "").trim(),
            assignment_id: String(validation.assignment_id || validation.assignmentId || entry.assignment_id || entry.assignmentId || "").trim(),
            dispatch_key: String(validation.dispatch_key || validation.dispatchKey || entry.dispatch_key || entry.dispatchKey || "").trim(),
            worker_context_packet_id: String(validation.worker_context_packet_id || validation.workerContextPacketId || entry.worker_context_packet_id || entry.workerContextPacketId || "").trim(),
            task_id: String(validation.task_id || validation.taskId || entry.task_id || entry.taskId || "").trim(),
            worker_handoff_id: String(validation.worker_handoff_id || validation.workerHandoffId || entry.worker_handoff_id || entry.workerHandoffId || "").trim(),
            task_agent_session_id: String(validation.task_agent_session_id || validation.taskAgentSessionId || entry.task_agent_session_id || entry.taskAgentSessionId || "").trim(),
            native_session_id: String(validation.native_session_id || validation.nativeSessionId || entry.native_session_id || entry.nativeSessionId || "").trim(),
            execution_id: String(validation.execution_id || validation.executionId || entry.execution_id || entry.executionId || "").trim(),
            receipt_status: String(validation.receipt_status || validation.receiptStatus || "").trim().toLowerCase(),
            attempt_status: status,
            contract_satisfied: status === "passed",
            repair_work_item_id: String(validation.repair_work_item_id || validation.repairWorkItemId || validation.repair_work_item?.work_item_id || "").trim(),
            repair_work_item_status: String(validation.repair_work_item_status || validation.repairWorkItemStatus || validation.repair_work_item?.status || "").trim().toLowerCase(),
            required_rel_paths: uniqueStrings(contract.rel_paths || contract.relPaths || [], 24),
            required_followup_work_item_ids: uniqueStrings(contract.followup_work_item_ids || contract.followupWorkItemIds || [], 24),
            required_override_ids: uniqueStrings(contract.override_ids || contract.overrideIds || [], 24),
            gap_codes: uniqueStrings(gaps.map((gap) => gap.code || gap.gap_code || gap.gapCode).filter(Boolean), 24),
            gap_reasons: uniqueStrings(gaps.map((gap) => gap.reason || gap.message).filter(Boolean), 16),
            receipt_evidence_reasons: uniqueStrings(receiptEvidenceRows.map((row) => row.reason || row.summary || row.note).filter(Boolean), 16),
            memory_provenance_usage_count: Number(validation.memory_provenance_usage_count || validation.memoryProvenanceUsageCount || 0),
            provider_override_followup_reverified_row_count: Number(validation.provider_override_followup_reverified_row_count || validation.providerOverrideFollowupReverifiedRowCount || 0),
            current_source_verified_count: Number(validation.current_source_verified_count || validation.currentSourceVerifiedCount || 0),
            reason: compactText(validation.reason || raw?.reason || "", 700),
            attempt_at: attemptAt,
            first_seen_at: attemptAt,
            last_seen_at: attemptAt,
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerDispatchOverrideFollowupReceiptValidationRowId(row) };
    }).filter((row) => !!row.validation_id)
        .filter((row) => row.attempt_status === "failed" || row.attempt_status === "passed");
}
function mergeProviderDispatchOverrideFollowupReceiptValidationRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupReceiptValidationRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupReceiptValidationRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: row.attempt_at || updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(600, Number(options.limit || options.maxRows || options.max_rows || 240)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.attempt_at || a.last_seen_at || "").localeCompare(String(b.attempt_at || b.last_seen_at || "")) || String(a.row_id || "").localeCompare(String(b.row_id || "")))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const attributionRows = new Map();
    for (const row of rows || []) {
        const key = `${String(row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        attributionRows.set(key, [...(attributionRows.get(key) || []), row]);
    }
    const attributions = [...attributionRows.entries()].map(([, sourceRows]) => {
        const ordered = [...sourceRows].sort((a, b) => String(a.attempt_at || "").localeCompare(String(b.attempt_at || "")) || String(a.row_id || "").localeCompare(String(b.row_id || "")));
        const failed = ordered.filter((row) => row.attempt_status === "failed");
        const passed = ordered.filter((row) => row.attempt_status === "passed");
        let consecutiveFailureCount = 0;
        for (let index = ordered.length - 1; index >= 0; index -= 1) {
            if (ordered[index].attempt_status !== "failed")
                break;
            consecutiveFailureCount += 1;
        }
        const latest = ordered[ordered.length - 1] || {};
        const lastFailedAt = failed.map((row) => row.attempt_at || "").filter(Boolean).sort().slice(-1)[0] || "";
        const lastPassedAt = passed.map((row) => row.attempt_at || "").filter(Boolean).sort().slice(-1)[0] || "";
        const repairVerified = failed.length > 0
            && latest.attempt_status === "passed"
            && !!lastPassedAt
            && (!lastFailedAt || lastPassedAt.localeCompare(lastFailedAt) >= 0);
        return {
            agent_type: latest.agent_type || "unknown",
            project: latest.project || "unknown",
            attempt_count: ordered.length,
            failed_count: failed.length,
            passed_count: passed.length,
            consecutive_failure_count: consecutiveFailureCount,
            latest_status: latest.attempt_status || "",
            repair_verified: repairVerified,
            first_attempt_at: ordered[0]?.attempt_at || "",
            last_attempt_at: latest.attempt_at || "",
            last_failed_at: lastFailedAt,
            last_passed_at: lastPassedAt,
            validation_ids: uniqueStrings(ordered.map((row) => row.validation_id).filter(Boolean), 32),
            repair_work_item_ids: uniqueStrings(ordered.map((row) => row.repair_work_item_id).filter(Boolean), 24),
            rel_paths: uniqueStrings(ordered.flatMap((row) => row.required_rel_paths || []), 32),
            followup_work_item_ids: uniqueStrings(ordered.flatMap((row) => row.required_followup_work_item_ids || []), 32),
            override_ids: uniqueStrings(ordered.flatMap((row) => row.required_override_ids || []), 32),
            gap_codes: uniqueStrings(ordered.flatMap((row) => row.gap_codes || []), 32),
        };
    }).sort((a, b) => Number(b.consecutive_failure_count || 0) - Number(a.consecutive_failure_count || 0) || Number(b.failed_count || 0) - Number(a.failed_count || 0));
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
        archived_count: rows.length,
        attempt_count: rows.length,
        failed_count: rows.filter((row) => row.attempt_status === "failed").length,
        passed_count: rows.filter((row) => row.attempt_status === "passed").length,
        attribution_count: attributions.length,
        escalated_attribution_count: attributions.filter((row) => Number(row.consecutive_failure_count || 0) >= 2).length,
        repaired_attribution_count: attributions.filter((row) => row.repair_verified === true).length,
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Dispatch Override Follow-up Receipt Validation History",
        "",
        `Generated by CCM corrected-receipt validation distillation at ${options.updatedAt || now()}.`,
        "This feedback memory preserves every provider override follow-up receipt validation attempt across child Agent sessions.",
        "Stable rule: repeated failed corrected receipts for the same agentType/project must escalate the next provider dispatch from sampling to hold. A later verified receipt clears the active failure streak and returns the provider to monitored sampling, while the failed attempts remain auditable.",
        "",
        "## Executor / Project Validation State",
    ];
    for (const row of attributions.slice(0, 24)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; attempts=${row.attempt_count || 0}; failed=${row.failed_count || 0}; passed=${row.passed_count || 0}; consecutiveFailures=${row.consecutive_failure_count || 0}; latest=${row.latest_status || "unknown"}; repairVerified=${row.repair_verified === true}; lastAttemptAt=${row.last_attempt_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Gap codes: ${row.gap_codes.slice(0, 12).join(", ")}.`);
        if (row.repair_work_item_ids?.length)
            lines.push(`  Validation repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Validation Attempts");
    for (const row of rows.slice(-80).reverse()) {
        lines.push(`- [${row.attempt_status || "unknown"}] agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; validation=${row.validation_id || "unknown"}; execution=${row.execution_id || "unknown"}; repairWorkItem=${row.repair_work_item_id || "unknown"}; at=${row.attempt_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Missing evidence: ${row.gap_codes.slice(0, 12).join(", ")}.`);
        if (row.required_rel_paths?.length)
            lines.push(`  Required relPath: ${row.required_rel_paths.slice(0, 8).join(", ")}.`);
        if (row.receipt_evidence_reasons?.length)
            lines.push(`  Receipt evidence: ${row.receipt_evidence_reasons.slice(0, 4).map((item) => compactText(item, 500).replace(/\n/g, " ")).join(" | ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use the latest consecutive failure streak for the active gate, but never delete older failures or successful repairs from audit history.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeProviderDispatchOverrideFollowupReceiptValidationRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive(merged.rows, { ...options, updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "provider-dispatch-override-followup-receipt-validation-history",
            name: "Provider dispatch override follow-up receipt validation history",
            description: "Append-only failed and repaired corrected-receipt validation attempts used by provider-specific pre-dispatch policy.",
            source: "auto:pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation",
            updatedAt,
            body: renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        attemptCount: archive.attempt_count,
        failedCount: archive.failed_count,
        passedCount: archive.passed_count,
        attributionCount: archive.attribution_count,
        escalatedAttributionCount: archive.escalated_attribution_count,
        repairedAttributionCount: archive.repaired_attribution_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function ignoreMemoryReceiptRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.candidates) ? input.candidates : []),
        ...(Array.isArray(input.briefs) ? input.briefs : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.candidates) ? group.candidates : []),
        ...(Array.isArray(group.briefs) ? group.briefs : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function ignoreMemoryReceiptRepairRowId(row = {}) {
    return `ignore-memory-receipt-repair:${checksum([
        row.groupId,
        row.work_item_id,
        row.worker_context_packet_id,
        row.binding_id,
        row.assignment_id,
        row.project,
        row.status,
        row.gap_signature,
    ], 24)}`;
}
function normalizeIgnoreMemoryReceiptRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return ignoreMemoryReceiptRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
        const source = String(entry.source || raw?.source || "").trim();
        const gaps = uniqueStrings([
            ...(Array.isArray(entry.gaps) ? entry.gaps : []),
            ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
        ].map((gap) => typeof gap === "string" ? gap : gap?.reason || gap?.type || JSON.stringify(gap)), 16);
        const reason = compactText(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gaps.join("; ")
            || "ignore-memory receipt repair required", 900);
        const row = {
            schema: "ccm-ignore-memory-receipt-repair-distilled-row-v1",
            version: exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source,
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            priority: String(entry.priority || raw?.priority || "").trim(),
            component: String(entry.component || raw?.component || "worker_context_ignore_memory_receipt_contract").trim(),
            memory_policy_reason: String(entry.worker_context_packet_memory_policy_reason || entry.memory_policy_reason || entry.expectedReason || raw?.memory_policy_reason || "user_requested_ignore_memory").trim(),
            gap_signature: gaps.join("|"),
            reason,
            expected: compactText(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryIgnored includes user_requested_ignore_memory; memoryUsed empty for platform memory", 700),
            prompt_patch: compactText(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1200),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: ignoreMemoryReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_ignore_memory_receipt_repair" || row.component === "worker_context_ignore_memory_receipt_contract" || /ignore-memory|memoryIgnored|user_requested_ignore_memory/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}`));
}
function mergeIgnoreMemoryReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || ignoreMemoryReceiptRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || ignoreMemoryReceiptRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(240, Number(options.limit || options.maxRows || options.max_rows || 80)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function ignoreMemoryReceiptRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    return {
        schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
        version: exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        completed_count: rows.filter((row) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        corrected_prompt_count: rows.filter((row) => /memoryIgnored/i.test(`${row.expected}\n${row.prompt_patch}`)).length,
        rows,
        updatedAt,
    };
}
function renderIgnoreMemoryReceiptRepairBody(rows = [], options = {}) {
    const lines = [
        "# Ignore-Memory Receipt Discipline",
        "",
        `Generated by CCM ignore-memory receipt repair distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records repeated child-Agent receipt failures when the WorkerContextPacket says platform/group/typed/global memory must be ignored.",
        "When a current task says to ignore memory, treat platform memory as empty and require the final CCM_AGENT_RECEIPT.memoryIgnored to mention user_requested_ignore_memory / must_not_use_group_memory. Do not put historical group, typed MEMORY.md, or global memory in memoryUsed.",
        "",
        "## Receipt Discipline Rows",
    ];
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; reason=${row.memory_policy_reason || "user_requested_ignore_memory"}.`);
        lines.push(`  Rule: corrected receipts must put user_requested_ignore_memory / must_not_use_group_memory in memoryIgnored and must not claim historical platform memory in memoryUsed.`);
        if (row.reason)
            lines.push(`  Evidence: ${compactText(row.reason, 650).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
            version: exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeIgnoreMemoryReceiptRepairRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.ignoreMemoryReceiptRepairArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeIgnoreMemoryReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = ignoreMemoryReceiptRepairArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "ignore-memory-receipt-discipline",
            name: "Ignore-memory receipt discipline",
            description: "Child Agent receipt discipline for WorkerContextPacket ignore-memory policy.",
            source: "auto:ignore-memory-receipt-repair-distillation",
            updatedAt,
            body: renderIgnoreMemoryReceiptRepairBody(archive.rows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        ignoreMemoryReceiptRepairArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
        version: exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        openCount: archive.open_count,
        completedCount: archive.completed_count,
        packetBoundCount: archive.packet_bound_count,
        correctedPromptCount: archive.corrected_prompt_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function pressureMemoryProvenanceReceiptRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.candidates) ? input.candidates : []),
        ...(Array.isArray(input.briefs) ? input.briefs : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.candidates) ? group.candidates : []),
        ...(Array.isArray(group.briefs) ? group.briefs : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function pressureMemoryProvenanceStringList(...values) {
    return uniqueStrings(values.flatMap(value => {
        if (Array.isArray(value))
            return value;
        if (value === undefined || value === null || value === "")
            return [];
        return [value];
    }).map((item) => String(item || "").trim()).filter(Boolean), 24);
}
function pressureMemoryProvenanceRowsFromRawRecovery(entry = {}) {
    const recovery = entry.raw_recovery || entry.rawRecovery || {};
    const docs = Array.isArray(recovery.requiredDocs || recovery.required_docs) ? (recovery.requiredDocs || recovery.required_docs) : [];
    return docs.map((doc) => ({
        rel_path: doc.rel_path || doc.relPath || "",
        name: doc.name || "",
        provenance_status: doc.provenance_status || doc.provenanceStatus || "",
        repair_work_item_id: doc.repair_work_item_id || doc.repairWorkItemId || "",
        repair_status: doc.repair_status || doc.repairStatus || "",
        repair_gap_type: doc.repair_gap_type || doc.repairGapType || "",
    }));
}
function pressureMemoryProvenanceReceiptRepairRowId(row = {}) {
    return `pressure-memory-provenance-receipt-repair:${checksum([
        row.groupId,
        row.work_item_id,
        row.worker_context_packet_id,
        row.binding_id,
        row.assignment_id,
        row.project,
        row.status,
        row.rel_paths,
        row.repair_work_item_ids,
        row.gap_signature,
    ], 24)}`;
}
function normalizePressureMemoryProvenanceReceiptRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return pressureMemoryProvenanceReceiptRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
        const source = String(entry.source || raw?.source || "").trim();
        const recoveryDocs = pressureMemoryProvenanceRowsFromRawRecovery(entry);
        const gapCodes = pressureMemoryProvenanceStringList(entry.pressure_memory_provenance_gap_codes, entry.pressureMemoryProvenanceGapCodes, recoveryDocs.map((doc) => doc.repair_gap_type).filter(Boolean), Array.isArray(entry.gaps) ? entry.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [], Array.isArray(raw?.gaps) ? raw.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : []);
        const relPaths = pressureMemoryProvenanceStringList(entry.pressure_memory_provenance_rel_paths, entry.pressureMemoryProvenanceRelPaths, recoveryDocs.map((doc) => doc.rel_path || doc.relPath).filter(Boolean), entry.repair_target && String(entry.repair_target).endsWith(".md") ? entry.repair_target : "");
        const repairIds = pressureMemoryProvenanceStringList(entry.pressure_memory_provenance_repair_work_item_ids, entry.pressureMemoryProvenanceRepairWorkItemIds, recoveryDocs.map((doc) => doc.repair_work_item_id || doc.repairWorkItemId).filter(Boolean));
        const provenanceStatuses = pressureMemoryProvenanceStringList(entry.provenance_status, entry.provenanceStatus, recoveryDocs.map((doc) => doc.provenance_status || doc.provenanceStatus).filter(Boolean));
        const reason = compactText(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gapCodes.join("; ")
            || "pressure memory provenance receipt repair required", 1000);
        const row = {
            schema: "ccm-pressure-memory-provenance-receipt-repair-distilled-row-v1",
            version: exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source,
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            priority: String(entry.priority || raw?.priority || "").trim(),
            component: String(entry.component || raw?.component || "worker_context_pressure_memory_provenance_receipt_contract").trim(),
            rel_paths: relPaths,
            repair_work_item_ids: repairIds,
            provenance_statuses: provenanceStatuses,
            gap_codes: gapCodes,
            gap_signature: gapCodes.join("|"),
            reason,
            expected: compactText(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryProvenanceUsage covers pressure repair memory and marks currentSourceVerified=true when disputed/stale memory is used", 850),
            prompt_patch: compactText(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1400),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: pressureMemoryProvenanceReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_pressure_memory_provenance_receipt_repair"
        || row.component === "worker_context_pressure_memory_provenance_receipt_contract"
        || /memoryProvenanceUsage|provenanceStatus|repairWorkItemId|currentSourceVerified|pressure memory provenance/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}`));
}
function mergePressureMemoryProvenanceReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || pressureMemoryProvenanceReceiptRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || pressureMemoryProvenanceReceiptRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureMemoryProvenanceReceiptRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const relPaths = uniqueStrings(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    const repairIds = uniqueStrings(rows.flatMap((row) => Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []), 80);
    const provenanceStatuses = uniqueStrings(rows.flatMap((row) => Array.isArray(row.provenance_statuses) ? row.provenance_statuses : []), 20);
    return {
        schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
        version: exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        completed_count: rows.filter((row) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        rel_path_count: relPaths.length,
        repair_work_item_count: repairIds.length,
        disputed_count: rows.filter((row) => (row.provenance_statuses || []).includes("disputed_under_repair")).length,
        stale_under_repair_count: rows.filter((row) => (row.provenance_statuses || []).includes("stale_evidence_under_repair")).length,
        corrected_prompt_count: rows.filter((row) => /memoryProvenanceUsage/i.test(`${row.expected}\n${row.prompt_patch}\n${row.reason}`)).length,
        current_source_verified_prompt_count: rows.filter((row) => /currentSourceVerified|current_source_verified/i.test(`${row.expected}\n${row.prompt_patch}\n${row.reason}`)).length,
        rel_paths: relPaths,
        repair_work_item_ids: repairIds,
        provenance_statuses: provenanceStatuses,
        rows,
        updatedAt,
    };
}
function renderPressureMemoryProvenanceReceiptRepairBody(rows = [], options = {}) {
    const lines = [
        "# Pressure Memory Provenance Receipt Discipline",
        "",
        `Generated by CCM pressure memory provenance receipt repair distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records repeated child-Agent receipt failures when WorkerContextPacket surfaced pressure MEMORY.md that was disputed_under_repair or stale_evidence_under_repair.",
        "When a current task sees pressure repair provenance, the final CCM_AGENT_RECEIPT must include memoryProvenanceUsage rows. Each row must include relPath, usageState, provenanceStatus, repairWorkItemId, repairStatus, repairGapType. If usageState is used or verified for disputed/stale-under-repair memory, currentSourceVerified must be true.",
        "",
        "## Receipt Discipline Rows",
    ];
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
        ].filter(Boolean).join("; ");
        const relPaths = Array.isArray(row.rel_paths) && row.rel_paths.length ? `relPath=${row.rel_paths.slice(0, 6).join(",")}` : "relPath=unknown";
        const repairIds = Array.isArray(row.repair_work_item_ids) && row.repair_work_item_ids.length ? `repairWorkItemId=${row.repair_work_item_ids.slice(0, 6).join(",")}` : "repairWorkItemId=unknown";
        const provenance = Array.isArray(row.provenance_statuses) && row.provenance_statuses.length ? `provenanceStatus=${row.provenance_statuses.slice(0, 4).join(",")}` : "provenanceStatus=under_repair";
        lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; ${relPaths}; ${repairIds}; ${provenance}.`);
        lines.push("  Rule: memoryProvenanceUsage is mandatory for pressure repair memory; used/verified disputed_under_repair or stale_evidence_under_repair rows require currentSourceVerified=true.");
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
        if (row.reason)
            lines.push(`  Evidence: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
            version: exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePressureMemoryProvenanceReceiptRepairRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.pressureMemoryProvenanceReceiptRepairArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergePressureMemoryProvenanceReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = pressureMemoryProvenanceReceiptRepairArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "pressure-memory-provenance-receipt-discipline",
            name: "Pressure memory provenance receipt discipline",
            description: "Child Agent receipt discipline for WorkerContextPacket pressure repair MEMORY.md provenance.",
            source: "auto:pressure-memory-provenance-receipt-repair-distillation",
            updatedAt,
            body: renderPressureMemoryProvenanceReceiptRepairBody(archive.rows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        pressureMemoryProvenanceReceiptRepairArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
        version: exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        openCount: archive.open_count,
        completedCount: archive.completed_count,
        packetBoundCount: archive.packet_bound_count,
        relPathCount: archive.rel_path_count,
        repairWorkItemCount: archive.repair_work_item_count,
        correctedPromptCount: archive.corrected_prompt_count,
        currentSourceVerifiedPromptCount: archive.current_source_verified_prompt_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function pressureProvenancePreDispatchComplianceInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.packets) ? input.packets : []),
        ...(Array.isArray(input.violations) ? input.violations : []),
        ...(Array.isArray(input.failures) ? input.failures : []),
        ...(Array.isArray(input.gaps) ? input.gaps : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.packets) ? group.packets : []),
        ...(Array.isArray(group.violations) ? group.violations : []),
        ...(Array.isArray(group.failures) ? group.failures : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || row.group_id || group.groupId || group.group_id || "" })));
}
function pressureProvenancePreDispatchComplianceRowId(row = {}) {
    return `pressure-provenance-pre-dispatch-compliance:${checksum([
        row.groupId,
        row.packet_id,
        row.binding_id,
        row.project,
        row.agent_type,
        row.status,
        row.gap_signature,
        row.rel_paths,
        row.repair_work_item_ids,
    ], 24)}`;
}
function normalizePressureProvenancePreDispatchComplianceRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return pressureProvenancePreDispatchComplianceInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.packet || raw?.violation || raw || {};
        const gaps = [
            ...(Array.isArray(entry.gaps) ? entry.gaps : []),
            ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
        ];
        const gapCodes = uniqueStrings(gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || gap?.severity || "").filter(Boolean), 24);
        const docs = [
            ...(Array.isArray(entry.docs) ? entry.docs : []),
            ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
            ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
        ];
        const relPaths = uniqueStrings([
            ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
            ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
            ...docs.map((doc) => doc.rel_path || doc.relPath || doc.relPath || doc.name || ""),
        ], 40);
        const repairIds = uniqueStrings([
            ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
            ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
            ...docs.map((doc) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
        ], 40);
        const status = String(entry.status || raw?.status || (gapCodes.length ? "non_compliant" : "compliant")).trim().toLowerCase();
        const row = {
            schema: "ccm-pressure-provenance-pre-dispatch-compliance-distilled-row-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
            binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
            status,
            pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
            required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
            discipline_doc_count: Number(entry.discipline_doc_count || entry.disciplineDocCount || 0),
            receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || 0),
            missing_receipt: entry.missing_receipt === true || gapCodes.some((code) => /child_agent_receipt|missing.*receipt/i.test(code)),
            missing_memory_provenance_usage: entry.missing_memory_provenance_usage === true || gapCodes.some((code) => /memoryProvenanceUsage|receipt_memoryProvenanceUsage/i.test(code)),
            current_source_verified_gap: entry.current_source_verified_gap === true || gapCodes.some((code) => /currentSourceVerified|current_source_verified/i.test(code)),
            rel_paths: relPaths,
            repair_work_item_ids: repairIds,
            gap_codes: gapCodes,
            gap_signature: gapCodes.join("|"),
            reason: compactText(entry.reason || raw?.reason || gapCodes.join("; ") || "pressure provenance pre-dispatch compliance gap", 1000),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: pressureProvenancePreDispatchComplianceRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.pre_dispatch_prompted === true && (row.status !== "compliant" || row.gap_codes.length || row.missing_receipt || row.missing_memory_provenance_usage || row.current_source_verified_gap));
}
function mergePressureProvenancePreDispatchComplianceRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureProvenancePreDispatchComplianceArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || 2));
    const attributionMap = new Map();
    for (const row of rows) {
        const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
        const current = attributionMap.get(key) || {
            agent_type: row.agent_type || "unknown",
            project: row.project || "unknown",
            violation_count: 0,
            packet_count: 0,
            missing_receipt_count: 0,
            missing_memory_provenance_usage_count: 0,
            current_source_verified_gap_count: 0,
            rel_paths: new Set(),
            repair_work_item_ids: new Set(),
            gap_codes: new Set(),
            first_violation_at: "",
            last_violation_at: "",
        };
        current.violation_count += Number(row.seen_count || 1);
        current.packet_count += row.packet_id ? 1 : 0;
        if (row.missing_receipt)
            current.missing_receipt_count += 1;
        if (row.missing_memory_provenance_usage)
            current.missing_memory_provenance_usage_count += 1;
        if (row.current_source_verified_gap)
            current.current_source_verified_gap_count += 1;
        for (const item of row.rel_paths || [])
            current.rel_paths.add(String(item));
        for (const item of row.repair_work_item_ids || [])
            current.repair_work_item_ids.add(String(item));
        for (const item of row.gap_codes || [])
            current.gap_codes.add(String(item));
        current.first_violation_at = current.first_violation_at
            ? [current.first_violation_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
            : String(row.first_seen_at || row.last_seen_at || updatedAt);
        current.last_violation_at = [current.last_violation_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()].map((row) => ({
        ...row,
        frequent: Number(row.violation_count || 0) >= threshold,
        rel_paths: [...row.rel_paths].slice(0, 24),
        repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
        gap_codes: [...row.gap_codes].slice(0, 24),
    })).sort((a, b) => Number(b.violation_count || 0) - Number(a.violation_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    return {
        schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
        archived_count: rows.length,
        frequent_threshold: threshold,
        attribution_count: attributions.length,
        frequent_attribution_count: attributions.filter((row) => row.frequent).length,
        missing_receipt_count: rows.filter((row) => row.missing_receipt).length,
        missing_memory_provenance_usage_count: rows.filter((row) => row.missing_memory_provenance_usage).length,
        current_source_verified_gap_count: rows.filter((row) => row.current_source_verified_gap).length,
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenancePreDispatchComplianceBody(archive = {}, options = {}) {
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const frequent = attributions.filter((row) => row.frequent).length ? attributions.filter((row) => row.frequent) : attributions;
    const lines = [
        "# Pressure Provenance Pre-Dispatch Compliance",
        "",
        `Generated by CCM pressure provenance pre-dispatch compliance distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records child Agent executors/projects that received pre-dispatch pressure provenance discipline but still failed the final CCM_AGENT_RECEIPT.memoryProvenanceUsage contract.",
        "Dispatch policy: when these executor/project pairs receive disputed_under_repair or stale_evidence_under_repair pressure MEMORY.md, keep the memoryProvenanceUsage example in the worker prompt, require ACK of the receipt contract, and verify final receipts before closing the task.",
        "",
        "## Executor / Project Attribution",
    ];
    for (const row of frequent.slice(0, 20)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; violations=${row.violation_count || 0}; missingReceipt=${row.missing_receipt_count || 0}; missingMemoryProvenanceUsage=${row.missing_memory_provenance_usage_count || 0}; currentSourceVerifiedGap=${row.current_source_verified_gap_count || 0}.`);
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
        if (row.rel_paths?.length)
            lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.repair_work_item_ids?.length)
            lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Stable Rule");
    lines.push("- Pre-dispatch prompting is not sufficient evidence. A task can close only after the child Agent receipt includes memoryProvenanceUsage rows covering every pressure repair memory, including repairStatus, repairGapType, and currentSourceVerified=true for used/verified disputed or stale-under-repair memory.");
    return lines.join("\n").trim() + "\n";
}
function distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePressureProvenancePreDispatchComplianceRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergePressureProvenancePreDispatchComplianceRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = pressureProvenancePreDispatchComplianceArchive(merged.rows, { ...options, updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "pressure-provenance-pre-dispatch-compliance",
            name: "Pressure provenance pre-dispatch compliance",
            description: "Executor/project attribution for pressure provenance receipt failures after pre-dispatch discipline was shown.",
            source: "auto:pressure-provenance-pre-dispatch-compliance-distillation",
            updatedAt,
            body: renderPressureProvenancePreDispatchComplianceBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        pressureProvenancePreDispatchComplianceArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        attributionCount: archive.attribution_count,
        frequentAttributionCount: archive.frequent_attribution_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function pressureProvenancePreDispatchComplianceRecoveryRowId(row = {}) {
    return `pressure-provenance-compliance-recovery:${checksum([
        row.groupId,
        row.packet_id,
        row.binding_id,
        row.project,
        row.agent_type,
        row.rel_paths,
        row.repair_work_item_ids,
    ], 24)}`;
}
function normalizePressureProvenancePreDispatchComplianceRecoveryRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return pressureProvenancePreDispatchComplianceInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.packet || raw?.recovery || raw || {};
        const docs = [
            ...(Array.isArray(entry.docs) ? entry.docs : []),
            ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
            ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
        ];
        const relPaths = uniqueStrings([
            ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
            ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
            ...docs.map((doc) => doc.rel_path || doc.relPath || doc.name || ""),
        ], 40);
        const repairIds = uniqueStrings([
            ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
            ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
            ...docs.map((doc) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
        ], 40);
        const status = String(entry.status || raw?.status || "compliant").trim().toLowerCase();
        const row = {
            schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-row-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
            binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
            status,
            pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
            required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
            receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || entry.receipt_count || entry.receiptCount || 0),
            compliant_doc_count: Number(entry.compliant_doc_count || entry.compliantDocCount || docs.length || 0),
            current_source_verified_count: Number(entry.current_source_verified_count || entry.currentSourceVerifiedCount || 0),
            rel_paths: relPaths,
            repair_work_item_ids: repairIds,
            reason: compactText(entry.reason || raw?.reason || "pressure provenance receipt compliant after prior feedback policy", 1000),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: pressureProvenancePreDispatchComplianceRecoveryRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.pre_dispatch_prompted === true && row.status === "compliant" && Number(row.required_doc_count || 0) > 0);
}
function mergePressureProvenancePreDispatchComplianceRecoveryRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureProvenancePreDispatchComplianceRecoveryArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const attributionMap = new Map();
    for (const row of rows) {
        const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
        const current = attributionMap.get(key) || {
            agent_type: row.agent_type || "unknown",
            project: row.project || "unknown",
            compliant_count: 0,
            packet_count: 0,
            receipt_row_count: 0,
            compliant_doc_count: 0,
            current_source_verified_count: 0,
            rel_paths: new Set(),
            repair_work_item_ids: new Set(),
            first_compliant_at: "",
            last_compliant_at: "",
        };
        const seenCount = Number(row.seen_count || 1);
        current.compliant_count += seenCount;
        current.packet_count += row.packet_id ? 1 : 0;
        current.receipt_row_count += Number(row.receipt_row_count || 0);
        current.compliant_doc_count += Number(row.compliant_doc_count || 0);
        current.current_source_verified_count += Number(row.current_source_verified_count || 0);
        current.first_compliant_at = current.first_compliant_at
            ? [current.first_compliant_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
            : String(row.first_seen_at || row.last_seen_at || updatedAt);
        current.last_compliant_at = [current.last_compliant_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
        for (const item of row.rel_paths || [])
            current.rel_paths.add(String(item));
        for (const item of row.repair_work_item_ids || [])
            current.repair_work_item_ids.add(String(item));
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()].map((row) => ({
        ...row,
        rel_paths: [...row.rel_paths].slice(0, 24),
        repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
    })).sort((a, b) => Number(b.compliant_count || 0) - Number(a.compliant_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    return {
        schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
        archived_count: rows.length,
        attribution_count: attributions.length,
        compliant_count: rows.reduce((sum, row) => sum + Number(row.seen_count || 1), 0),
        receipt_row_count: rows.reduce((sum, row) => sum + Number(row.receipt_row_count || 0), 0),
        compliant_doc_count: rows.reduce((sum, row) => sum + Number(row.compliant_doc_count || 0), 0),
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenancePreDispatchComplianceRecoveryBody(archive = {}, options = {}) {
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Pressure Provenance Compliance Recovery",
        "",
        `Generated by CCM pressure provenance compliance recovery distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records executor/project pairs that later produced compliant memoryProvenanceUsage receipts after receiving pressure provenance discipline.",
        "Recovery policy: compliant receipts do not delete historical violations, but they reduce effective violation pressure so old executor/project mistakes can recover after sustained correct behavior.",
        "",
        "## Executor / Project Recovery",
    ];
    for (const row of attributions.slice(0, 20)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; compliant=${row.compliant_count || 0}; packets=${row.packet_count || 0}; receiptRows=${row.receipt_row_count || 0}; lastCompliantAt=${row.last_compliant_at || ""}.`);
        if (row.rel_paths?.length)
            lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.repair_work_item_ids?.length)
            lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Stable Rule");
    lines.push("- Recovery evidence can reduce dispatch feedback policy severity only when it comes from compliant pressure provenance receipts. Historical violation rows remain archived for audit and can become active again if new violations outnumber recovery credits.");
    return lines.join("\n").trim() + "\n";
}
function distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
            version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizePressureProvenancePreDispatchComplianceRecoveryRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergePressureProvenancePreDispatchComplianceRecoveryRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = pressureProvenancePreDispatchComplianceRecoveryArchive(merged.rows, { ...options, updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "pressure-provenance-compliance-recovery",
            name: "Pressure provenance compliance recovery",
            description: "Executor/project recovery evidence for compliant pressure provenance receipts after feedback policy.",
            source: "auto:pressure-provenance-compliance-recovery-distillation",
            updatedAt,
            body: renderPressureProvenancePreDispatchComplianceRecoveryBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        pressureProvenancePreDispatchComplianceRecoveryArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        attributionCount: archive.attribution_count,
        compliantCount: archive.compliant_count,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function normalizePressureProvenanceDispatchPolicyKey(value) {
    return String(value || "").trim().toLowerCase();
}
function pressureProvenanceDispatchPolicyAttributionMatches(row = {}, options = {}) {
    const targetProject = normalizePressureProvenanceDispatchPolicyKey(options.targetProject || options.target_project || options.project);
    const agentType = normalizePressureProvenanceDispatchPolicyKey(options.agentType || options.agent_type || options.executor || options.runner);
    const rowProject = normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject);
    const rowAgentType = normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner);
    const projectMatches = !targetProject || !rowProject || rowProject === targetProject || rowProject === "unknown" || rowProject === "*";
    const agentMatches = !agentType || !rowAgentType || rowAgentType === agentType || rowAgentType === "unknown" || rowAgentType === "*";
    return projectMatches && agentMatches;
}
function pressureProvenanceDispatchPolicyAttributionKey(row = {}) {
    return `${normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner || "unknown")}|${normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject || "unknown")}`;
}
function summarizeProviderDispatchOverrideFollowupPolicyAttributions(attributions = []) {
    const completedCount = attributions.reduce((sum, row) => sum + Number(row.completed_count || row.completedCount || 0), 0);
    const memoryUsageCount = attributions.reduce((sum, row) => sum + Number(row.memory_provenance_usage_count || row.memoryProvenanceUsageCount || 0), 0);
    const verifiedCount = attributions.reduce((sum, row) => sum + Number(row.current_source_verified_count || row.currentSourceVerifiedCount || 0), 0);
    const lastCompletedAt = attributions
        .map((row) => row.last_completed_at || row.lastCompletedAt || "")
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || "";
    return {
        completedCount,
        memoryUsageCount,
        verifiedCount,
        lastCompletedAt,
        relPaths: uniqueStrings(attributions.flatMap((row) => Array.isArray(row.rel_paths || row.relPaths) ? (row.rel_paths || row.relPaths) : []), 16),
        followupWorkItemIds: uniqueStrings(attributions.flatMap((row) => Array.isArray(row.followup_work_item_ids || row.followupWorkItemIds) ? (row.followup_work_item_ids || row.followupWorkItemIds) : []), 16),
        overrideIds: uniqueStrings(attributions.flatMap((row) => Array.isArray(row.override_ids || row.overrideIds) ? (row.override_ids || row.overrideIds) : []), 16),
    };
}
function summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions(attributions = []) {
    const ordered = [...(attributions || [])]
        .sort((a, b) => String(a.last_attempt_at || a.lastAttemptAt || "").localeCompare(String(b.last_attempt_at || b.lastAttemptAt || "")));
    const latest = ordered[ordered.length - 1] || {};
    return {
        attemptCount: attributions.reduce((sum, row) => sum + Number(row.attempt_count || row.attemptCount || 0), 0),
        failedCount: attributions.reduce((sum, row) => sum + Number(row.failed_count || row.failedCount || 0), 0),
        passedCount: attributions.reduce((sum, row) => sum + Number(row.passed_count || row.passedCount || 0), 0),
        consecutiveFailureCount: Number(latest.consecutive_failure_count || latest.consecutiveFailureCount || 0),
        latestStatus: String(latest.latest_status || latest.latestStatus || ""),
        repairVerified: latest.repair_verified === true || latest.repairVerified === true,
        lastAttemptAt: String(latest.last_attempt_at || latest.lastAttemptAt || ""),
        lastFailedAt: String(latest.last_failed_at || latest.lastFailedAt || ""),
        lastPassedAt: String(latest.last_passed_at || latest.lastPassedAt || ""),
        validationIds: uniqueStrings(attributions.flatMap((row) => row.validation_ids || row.validationIds || []), 32),
        repairWorkItemIds: uniqueStrings(attributions.flatMap((row) => row.repair_work_item_ids || row.repairWorkItemIds || []), 24),
        relPaths: uniqueStrings(attributions.flatMap((row) => row.rel_paths || row.relPaths || []), 32),
        followupWorkItemIds: uniqueStrings(attributions.flatMap((row) => row.followup_work_item_ids || row.followupWorkItemIds || []), 32),
        overrideIds: uniqueStrings(attributions.flatMap((row) => row.override_ids || row.overrideIds || []), 32),
        gapCodes: uniqueStrings(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
    };
}
function summarizeProviderSwitchExecutionPolicyAttributions(attributions = []) {
    const ordered = [...(attributions || [])]
        .sort((a, b) => String(a.last_executed_at || a.lastExecutedAt || "").localeCompare(String(b.last_executed_at || b.lastExecutedAt || "")));
    const latest = ordered[ordered.length - 1] || {};
    return {
        executedCount: attributions.reduce((sum, row) => sum + Number(row.executed_count || row.executedCount || 0), 0),
        approvedCount: attributions.reduce((sum, row) => sum + Number(row.approved_count || row.approvedCount || 0), 0),
        passedCount: attributions.reduce((sum, row) => sum + Number(row.passed_count || row.passedCount || 0), 0),
        failedCount: attributions.reduce((sum, row) => sum + Number(row.failed_count || row.failedCount || 0), 0),
        mismatchCount: attributions.reduce((sum, row) => sum + Number(row.mismatch_count || row.mismatchCount || 0), 0),
        expectedProvider: String(latest.expected_provider || latest.expectedProvider || latest.agent_type || latest.agentType || ""),
        actualProviders: uniqueStrings(attributions.flatMap((row) => row.actual_providers || row.actualProviders || []), 24),
        lastExecutedAt: String(latest.last_executed_at || latest.lastExecutedAt || ""),
        lastFailedAt: attributions.map((row) => row.last_failed_at || row.lastFailedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        lastPassedAt: attributions.map((row) => row.last_passed_at || row.lastPassedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        executionReceiptIds: uniqueStrings(attributions.flatMap((row) => row.execution_receipt_ids || row.executionReceiptIds || []), 24),
        decisionReceiptIds: uniqueStrings(attributions.flatMap((row) => row.decision_receipt_ids || row.decisionReceiptIds || []), 24),
        taskAgentSessionIds: uniqueStrings(attributions.flatMap((row) => row.task_agent_session_ids || row.taskAgentSessionIds || []), 24),
        rowIds: uniqueStrings(attributions.flatMap((row) => row.row_ids || row.rowIds || []), 32),
        memoryRelPaths: uniqueStrings(attributions.flatMap((row) => row.memory_rel_paths || row.memoryRelPaths || []), 8),
        gapCodes: uniqueStrings(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
    };
}
function scoreProviderSwitchExecutionRows(rows = [], options = {}) {
    const passedCredit = Math.max(0, Number(options.providerSwitchExecutionPassedCredit
        || options.provider_switch_execution_passed_credit
        || 1));
    const mismatchPenalty = Math.max(1, Number(options.providerSwitchExecutionMismatchPenalty
        || options.provider_switch_execution_mismatch_penalty
        || 1.5));
    let weightedMismatchScore = 0;
    let weightedFailedScore = 0;
    let weightedPassedScore = 0;
    let newestAttemptAt = "";
    let oldestAttemptAt = "";
    for (const row of rows || []) {
        const at = String(row.last_seen_at || row.last_executed_at || row.lastExecutedAt || row.first_seen_at || row.at || "");
        const decay = providerDispatchReliabilityDecayWeight(at, options);
        const status = String(row.status || "").trim().toLowerCase();
        const gaps = Array.isArray(row.gaps || row.gap_codes || row.gapCodes) ? (row.gaps || row.gap_codes || row.gapCodes) : [];
        const mismatch = row.mismatch === true
            || row.provider_switch_execution_mismatch === true
            || row.providerSwitchExecutionMismatch === true
            || gaps.includes("executed_provider_mismatch");
        if (mismatch)
            weightedMismatchScore += decay.weight;
        if (status === "failed")
            weightedFailedScore += decay.weight;
        if (status === "passed")
            weightedPassedScore += decay.weight;
        if (at) {
            newestAttemptAt = [newestAttemptAt, at].filter(Boolean).sort().slice(-1)[0] || "";
            oldestAttemptAt = oldestAttemptAt ? [oldestAttemptAt, at].sort()[0] : at;
        }
    }
    const weightedRiskScore = weightedFailedScore + weightedMismatchScore * (mismatchPenalty - 1);
    const weightedEvidence = weightedRiskScore + weightedPassedScore;
    const adjustedEvidence = weightedRiskScore + weightedPassedScore * passedCredit;
    const riskScore = adjustedEvidence > 0 ? weightedRiskScore / adjustedEvidence : 0;
    const confidence = weightedEvidence > 0 ? 1 - Math.exp(-weightedEvidence / 3) : 0;
    return {
        attemptCount: rows.length,
        failedCount: rows.filter((row) => String(row.status || "").trim().toLowerCase() === "failed").length,
        passedCount: rows.filter((row) => String(row.status || "").trim().toLowerCase() === "passed").length,
        mismatchCount: rows.filter((row) => row.mismatch === true).length,
        weightedMismatchScore: providerDispatchReliabilityRound(weightedMismatchScore),
        weightedFailedScore: providerDispatchReliabilityRound(weightedFailedScore),
        weightedPassedScore: providerDispatchReliabilityRound(weightedPassedScore),
        weightedRiskScore: providerDispatchReliabilityRound(weightedRiskScore),
        weightedEvidence: providerDispatchReliabilityRound(weightedEvidence),
        riskScore: providerDispatchReliabilityRound(riskScore),
        confidence: providerDispatchReliabilityRound(confidence),
        passedCredit,
        mismatchPenalty,
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
        newestAttemptAt,
        oldestAttemptAt,
    };
}
function providerDispatchReliabilityNowMs(options = {}) {
    const explicit = Number(options.nowMs || options.now_ms || 0);
    if (Number.isFinite(explicit) && explicit > 0)
        return explicit;
    const parsed = Date.parse(String(options.generatedAt || options.generated_at || options.now || ""));
    return Number.isFinite(parsed) ? parsed : Date.now();
}
function providerDispatchReliabilityRound(value, digits = 4) {
    const number = Number(value || 0);
    const scale = 10 ** digits;
    return Math.round(number * scale) / scale;
}
function providerDispatchReliabilityDecayWeight(at, options = {}) {
    const nowMs = providerDispatchReliabilityNowMs(options);
    const atMs = Date.parse(String(at || ""));
    const ageDays = Number.isFinite(atMs) ? Math.max(0, (nowMs - atMs) / 86_400_000) : 0;
    const halfLifeDays = Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS)));
    return {
        ageDays,
        weight: 2 ** (-ageDays / halfLifeDays),
        halfLifeDays,
    };
}
function scoreProviderDispatchReliabilityRows(rows = [], options = {}) {
    const recoveryCredit = Math.max(0, Number(options.recoveryCredit || options.recovery_credit || 1.25));
    let weightedFailureScore = 0;
    let weightedPassedScore = 0;
    let newestAttemptAt = "";
    let oldestAttemptAt = "";
    for (const row of rows || []) {
        const at = String(row.attempt_at || row.last_seen_at || row.first_seen_at || "");
        const decay = providerDispatchReliabilityDecayWeight(at, options);
        if (row.attempt_status === "failed")
            weightedFailureScore += decay.weight;
        if (row.attempt_status === "passed")
            weightedPassedScore += decay.weight;
        if (at) {
            newestAttemptAt = [newestAttemptAt, at].filter(Boolean).sort().slice(-1)[0] || "";
            oldestAttemptAt = oldestAttemptAt ? [oldestAttemptAt, at].sort()[0] : at;
        }
    }
    const weightedEvidence = weightedFailureScore + weightedPassedScore;
    const adjustedEvidence = weightedFailureScore + weightedPassedScore * recoveryCredit;
    const riskScore = adjustedEvidence > 0 ? weightedFailureScore / adjustedEvidence : 0;
    const confidence = weightedEvidence > 0 ? 1 - Math.exp(-weightedEvidence / 3) : 0;
    return {
        attemptCount: rows.length,
        failedCount: rows.filter((row) => row.attempt_status === "failed").length,
        passedCount: rows.filter((row) => row.attempt_status === "passed").length,
        weightedFailureScore: providerDispatchReliabilityRound(weightedFailureScore),
        weightedPassedScore: providerDispatchReliabilityRound(weightedPassedScore),
        weightedEvidence: providerDispatchReliabilityRound(weightedEvidence),
        riskScore: providerDispatchReliabilityRound(riskScore),
        confidence: providerDispatchReliabilityRound(confidence),
        recoveryCredit,
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
        newestAttemptAt,
        oldestAttemptAt,
    };
}
function listProviderDispatchReliabilityDistillationLedgers(options = {}) {
    const explicitGroupIds = Array.isArray(options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids)
        ? (options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids)
            .map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const excluded = new Set((Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : [])
        .flatMap((item) => [String(item || "").trim().toLowerCase(), safeSegment(item).toLowerCase()])
        .filter(Boolean));
    const maxGroups = Math.max(1, Math.min(200, Number(options.maxGroups || options.max_groups || exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS)));
    const candidates = explicitGroupIds.length
        ? explicitGroupIds.map((groupId) => ({ groupId, file: getGroupTypedMemoryDistillationLedgerFile(groupId) }))
        : (() => {
            try {
                return fs.readdirSync(GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .map(entry => ({ groupId: entry.name, file: path.join(GROUP_TYPED_MEMORY_DIR, entry.name, exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER) }));
            }
            catch {
                return [];
            }
        })();
    return candidates
        .filter((item) => item.file && fs.existsSync(item.file))
        .map((item) => {
        try {
            const stat = fs.statSync(item.file);
            return { ...item, mtimeMs: Number(stat.mtimeMs || 0) };
        }
        catch {
            return { ...item, mtimeMs: 0 };
        }
    })
        .filter((item) => !excluded.has(String(item.groupId || "").toLowerCase()))
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
        .slice(0, maxGroups);
}
function loadProviderDispatchReliabilitySources(options = {}) {
    const targetGroupId = String(options.targetGroupId || options.target_group_id || options.groupId || options.group_id || "").trim();
    const targetKeys = new Set([targetGroupId, safeSegment(targetGroupId)].map(item => item.toLowerCase()).filter(Boolean));
    const ledgers = listProviderDispatchReliabilityDistillationLedgers({
        ...options,
        excludeGroupIds: [
            ...(Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : []),
            ...(targetGroupId ? [targetGroupId] : []),
        ],
    });
    const sources = [];
    for (const item of ledgers) {
        try {
            const parsed = readJson(item.file, {});
            const ledgerGroupId = String(parsed.groupId || parsed.group_id || item.groupId || "").trim();
            if (targetKeys.has(ledgerGroupId.toLowerCase()) || targetKeys.has(safeSegment(ledgerGroupId).toLowerCase()))
                continue;
            const archive = parsed.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
            const rows = Array.isArray(archive.rows) ? archive.rows : [];
            if (!rows.length)
                continue;
            sources.push({
                sourceKey: checksum([ledgerGroupId || item.groupId, item.file], 18),
                rows,
                attributions: Array.isArray(archive.attributions) ? archive.attributions : [],
                updatedAt: archive.updatedAt || parsed.updatedAt || "",
            });
        }
        catch { }
    }
    return sources;
}
function buildProviderDispatchReliabilitySignalFromSources(sources = [], options = {}) {
    const agentType = String(options.agentType || options.agent_type || "unknown").trim().toLowerCase() || "unknown";
    const failureThreshold = Math.max(1, Number(options.failureThreshold || options.failure_threshold || options.providerOverrideFollowupReceiptValidationFailureThreshold || options.provider_override_followup_receipt_validation_failure_threshold || 2));
    const minSourceGroups = Math.max(1, Number(options.minSourceGroups || options.min_source_groups || 2));
    const matchingSources = (sources || []).map((source) => {
        const rows = (Array.isArray(source.rows) ? source.rows : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        const attributions = (Array.isArray(source.attributions) ? source.attributions : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        return { ...source, rows, attributions };
    }).filter((source) => source.rows.length > 0);
    const score = scoreProviderDispatchReliabilityRows(matchingSources.flatMap((source) => source.rows), options);
    const activeFailureSourceCount = matchingSources.filter((source) => source.attributions.some((row) => Number(row.consecutive_failure_count || row.consecutiveFailureCount || 0) >= failureThreshold)).length;
    const sourceGroupCount = matchingSources.length;
    const actionable = sourceGroupCount >= minSourceGroups && score.weightedEvidence >= 0.5;
    const riskStatus = !score.attemptCount
        ? "empty"
        : actionable && (activeFailureSourceCount >= 2 || score.riskScore >= 0.67 && score.confidence >= 0.35)
            ? "high"
            : actionable && (activeFailureSourceCount >= 1 || score.riskScore >= 0.4)
                ? "medium"
                : "low";
    return {
        schema: "ccm-cross-group-provider-dispatch-reliability-signal-v1",
        version: 1,
        source: "privacy-redacted:cross-group-provider-receipt-validation-aggregate",
        agent_type: agentType,
        risk_status: riskStatus,
        risk_score: score.riskScore,
        confidence: score.confidence,
        weighted_failure_score: score.weightedFailureScore,
        weighted_passed_score: score.weightedPassedScore,
        weighted_evidence: score.weightedEvidence,
        attempt_count: score.attemptCount,
        failed_count: score.failedCount,
        passed_count: score.passedCount,
        source_group_count: sourceGroupCount,
        active_failure_source_count: activeFailureSourceCount,
        half_life_days: score.halfLifeDays,
        recovery_credit: score.recoveryCredit,
        minimum_source_groups: minSourceGroups,
        actionable,
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        recommendation: riskStatus === "high"
            ? "increase_receipt_sampling_and_prefer_safer_provider_when_local_policy_allows"
            : riskStatus === "medium"
                ? "sample_receipts_and_monitor_provider_reliability"
                : riskStatus === "low"
                    ? "observe_provider_reliability_without_changing_local_gate"
                    : "no_cross_group_provider_reliability_evidence",
        privacy: {
            group_ids_included: false,
            project_names_included: false,
            memory_paths_included: false,
            task_or_execution_ids_included: false,
            receipt_evidence_included: false,
        },
        generated_at: new Date(providerDispatchReliabilityNowMs(options)).toISOString(),
    };
}
function buildCrossGroupProviderDispatchReliabilitySignal(groupId, options = {}) {
    const sources = loadProviderDispatchReliabilitySources({ ...options, targetGroupId: groupId });
    return buildProviderDispatchReliabilitySignalFromSources(sources, options);
}
function providerDispatchReliabilitySourceProvenance(sources = []) {
    const rows = (sources || []).map((source) => ({
        source_key: source.sourceKey || "",
        updated_at: source.updatedAt || "",
        attempt_count: Array.isArray(source.rows) ? source.rows.length : 0,
        content_checksum: checksum((source.rows || []).map((row) => ({
            row_id: row.row_id || "",
            attempt_status: row.attempt_status || "",
            attempt_at: row.attempt_at || "",
            agent_type: row.agent_type || "",
        })), 32),
    })).sort((a, b) => String(a.source_key || "").localeCompare(String(b.source_key || "")));
    return {
        schema: "ccm-provider-dispatch-reliability-source-provenance-v1",
        source_ledger_count: rows.length,
        attempt_count: rows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0),
        latest_source_updated_at: rows.map((row) => row.updated_at).filter(Boolean).sort().slice(-1)[0] || "",
        generation_checksum: checksum(rows, 40),
        group_ids_included: false,
        project_names_included: false,
        private_evidence_included: false,
    };
}
function buildGlobalProviderDispatchReliabilitySignals(options = {}) {
    const sources = loadProviderDispatchReliabilitySources({ ...options, targetGroupId: "" });
    const agentTypes = uniqueStrings(sources.flatMap((source) => source.rows.map((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase()).filter(Boolean)), 64);
    const signals = agentTypes.map(agentType => buildProviderDispatchReliabilitySignalFromSources(sources, { ...options, agentType }));
    return {
        schema: "ccm-global-provider-dispatch-reliability-signals-v1",
        version: 1,
        source: "privacy-redacted:global-provider-receipt-validation-aggregate",
        signal_count: signals.length,
        actionable_signal_count: signals.filter((signal) => signal.actionable).length,
        high_risk_signal_count: signals.filter((signal) => signal.risk_status === "high").length,
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        source_provenance: providerDispatchReliabilitySourceProvenance(sources),
        signals,
        privacy: {
            group_ids_included: false,
            project_names_included: false,
            memory_paths_included: false,
            task_or_execution_ids_included: false,
            receipt_evidence_included: false,
        },
        generated_at: new Date(providerDispatchReliabilityNowMs(options)).toISOString(),
    };
}
function getGlobalProviderDispatchReliabilitySnapshotFile(options = {}) {
    return String(options.snapshotFile || options.snapshot_file || path.join(GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR, "snapshot.json"));
}
function globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshot = {}) {
    return checksum({
        signals: snapshot.signals || null,
        source_provenance: snapshot.source_provenance || null,
        generated_at: snapshot.generated_at || "",
        expires_at: snapshot.expires_at || "",
        ttl_ms: Number(snapshot.ttl_ms || 0),
    }, 48);
}
function globalProviderDispatchReliabilitySnapshotChecksum(snapshot = {}) {
    const comparable = { ...snapshot };
    delete comparable.snapshot_checksum;
    delete comparable.file;
    delete comparable.validation;
    return checksum(comparable, 48);
}
function writeGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const file = getGlobalProviderDispatchReliabilitySnapshotFile(options);
    const generatedAtMs = providerDispatchReliabilityNowMs(options);
    const ttlMs = Math.max(30_000, Math.min(24 * 60 * 60 * 1000, Number(options.ttlMs || options.ttl_ms || exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS)));
    const signals = buildGlobalProviderDispatchReliabilitySignals({
        ...options,
        generatedAt: new Date(generatedAtMs).toISOString(),
        nowMs: generatedAtMs,
    });
    const sourceProvenance = signals.source_provenance || {};
    const snapshotBase = {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-v1",
        version: exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION,
        snapshot_id: `provider-reliability-snapshot:${checksum([
            generatedAtMs,
            sourceProvenance.generation_checksum || "",
            signals.signals || [],
        ], 20)}`,
        generation_id: `provider-reliability-generation:${String(sourceProvenance.generation_checksum || "empty").slice(0, 24)}`,
        generated_at: new Date(generatedAtMs).toISOString(),
        expires_at: new Date(generatedAtMs + ttlMs).toISOString(),
        ttl_ms: ttlMs,
        source: "privacy-redacted:global-provider-reliability-snapshot",
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        source_provenance: sourceProvenance,
        signals,
    };
    snapshotBase.payload_checksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshotBase);
    snapshotBase.snapshot_checksum = globalProviderDispatchReliabilitySnapshotChecksum(snapshotBase);
    try {
        if (fs.existsSync(file))
            fs.copyFileSync(file, `${file}.bak`);
    }
    catch { }
    writeJsonAtomic(file, snapshotBase);
    return { ...snapshotBase, file };
}
function validateGlobalProviderDispatchReliabilitySnapshot(snapshot = {}, options = {}) {
    const nowMs = providerDispatchReliabilityNowMs(options);
    const gaps = [];
    if (snapshot.schema !== "ccm-global-provider-dispatch-reliability-snapshot-v1")
        gaps.push("schema");
    if (Number(snapshot.version || 0) !== exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION)
        gaps.push("version");
    if (!snapshot.snapshot_id)
        gaps.push("snapshot_id");
    if (!snapshot.generation_id)
        gaps.push("generation_id");
    if (snapshot.guidance_only !== true)
        gaps.push("guidance_only");
    if (snapshot.local_policy_override_allowed !== false)
        gaps.push("local_policy_override_allowed");
    if (snapshot.contains_private_memory !== false)
        gaps.push("contains_private_memory");
    const payloadChecksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshot);
    if (!snapshot.payload_checksum || snapshot.payload_checksum !== payloadChecksum)
        gaps.push("payload_checksum");
    const snapshotChecksum = globalProviderDispatchReliabilitySnapshotChecksum(snapshot);
    if (!snapshot.snapshot_checksum || snapshot.snapshot_checksum !== snapshotChecksum)
        gaps.push("snapshot_checksum");
    const expiresMs = Date.parse(String(snapshot.expires_at || ""));
    const expired = !Number.isFinite(expiresMs) || expiresMs <= nowMs;
    if (expired)
        gaps.push("expired");
    let sourceGenerationMatches = true;
    let currentSourceProvenance = null;
    if (options.verifySourceGeneration !== false && options.verify_source_generation !== false && snapshot.source_provenance?.generation_checksum) {
        const current = buildGlobalProviderDispatchReliabilitySignals({
            ...options,
            generatedAt: new Date(nowMs).toISOString(),
            nowMs,
        });
        currentSourceProvenance = current.source_provenance || {};
        sourceGenerationMatches = currentSourceProvenance.generation_checksum === snapshot.source_provenance.generation_checksum;
        if (!sourceGenerationMatches)
            gaps.push("source_generation");
    }
    const integrityGaps = gaps.filter(gap => !["expired", "source_generation"].includes(gap));
    const status = integrityGaps.length
        ? "tampered"
        : expired
            ? "expired"
            : !sourceGenerationMatches
                ? "stale_source_generation"
                : "fresh";
    return {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-validation-v1",
        status,
        usable: status === "fresh",
        integrity_ok: integrityGaps.length === 0,
        freshness_ok: !expired,
        source_generation_matches: sourceGenerationMatches,
        gaps,
        checked_at: new Date(nowMs).toISOString(),
        current_source_provenance: currentSourceProvenance,
    };
}
function readGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const file = getGlobalProviderDispatchReliabilitySnapshotFile(options);
    const candidates = options.allowBackupRecovery === false || options.allow_backup_recovery === false
        ? [{ file, recoveredFromBackup: false }]
        : [{ file, recoveredFromBackup: false }, { file: `${file}.bak`, recoveredFromBackup: true }];
    let firstInvalid = null;
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate.file))
            continue;
        const snapshot = readJson(candidate.file, null);
        if (!snapshot || typeof snapshot !== "object") {
            if (!firstInvalid)
                firstInvalid = { status: "tampered", usable: false, gaps: ["parse"], file: candidate.file };
            continue;
        }
        const validation = validateGlobalProviderDispatchReliabilitySnapshot(snapshot, options);
        const result = {
            schema: "ccm-global-provider-dispatch-reliability-snapshot-read-v1",
            file: candidate.file,
            recovered_from_backup: candidate.recoveredFromBackup,
            status: validation.status,
            usable: validation.usable,
            validation,
            snapshot,
        };
        if (validation.usable)
            return result;
        if (!firstInvalid)
            firstInvalid = result;
    }
    return firstInvalid || {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-read-v1",
        file,
        recovered_from_backup: false,
        status: "missing",
        usable: false,
        validation: { status: "missing", usable: false, gaps: ["missing"] },
        snapshot: null,
    };
}
function getOrRefreshGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const current = readGlobalProviderDispatchReliabilitySnapshot(options);
    if (current.usable)
        return { ...current, refreshed: false };
    if (options.allowRefresh === false || options.allow_refresh === false)
        return { ...current, refreshed: false };
    const written = writeGlobalProviderDispatchReliabilitySnapshot(options);
    const verified = readGlobalProviderDispatchReliabilitySnapshot({
        ...options,
        allowBackupRecovery: false,
    });
    return {
        ...verified,
        refreshed: true,
        refresh_reason: current.status || "missing",
        previous_status: current.status || "missing",
        written_snapshot_id: written.snapshot_id || "",
    };
}
function buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, options = {}) {
    const disabled = options.disabled === true
        || options.disablePolicy === true
        || options.disable_policy === true
        || options.disablePressureProvenanceFeedbackDispatchPolicy === true
        || options.disable_pressure_provenance_feedback_dispatch_policy === true;
    const targetProject = String(options.targetProject || options.target_project || options.project || "").trim();
    const agentType = String(options.agentType || options.agent_type || options.executor || options.runner || "unknown").trim() || "unknown";
    const generatedAt = String(options.generatedAt || options.generated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const archive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
    const recoveryArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
    const providerOverrideFollowupArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
    const providerOverrideFollowupReceiptValidationArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
    const providerSwitchExecutionArchive = ledger.providerSwitchExecutionArchive || {};
    const providerOverrideFollowupReceiptValidationRows = Array.isArray(providerOverrideFollowupReceiptValidationArchive.rows)
        ? providerOverrideFollowupReceiptValidationArchive.rows
        : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const violationRows = Array.isArray(archive.rows) ? archive.rows : [];
    const recoveryAttributions = Array.isArray(recoveryArchive.attributions) ? recoveryArchive.attributions : [];
    const providerOverrideFollowupDisabled = options.disableProviderDispatchOverrideFollowupHistory === true
        || options.disable_provider_dispatch_override_followup_history === true
        || options.disableProviderOverrideFollowupHistory === true
        || options.disable_provider_override_followup_history === true;
    const providerOverrideFollowupAttributions = providerOverrideFollowupDisabled
        ? []
        : Array.isArray(providerOverrideFollowupArchive.attributions)
            ? providerOverrideFollowupArchive.attributions
            : [];
    const matchingProviderOverrideFollowupAttributions = providerOverrideFollowupAttributions
        .filter((row) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
    const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || archive.frequent_threshold || 2));
    const providerOverrideFollowupReceiptValidationDisabled = options.disableProviderDispatchOverrideFollowupReceiptValidationHistory === true
        || options.disable_provider_dispatch_override_followup_receipt_validation_history === true;
    const providerOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationDisabled
        ? []
        : Array.isArray(providerOverrideFollowupReceiptValidationArchive.attributions)
            ? providerOverrideFollowupReceiptValidationArchive.attributions
            : [];
    const matchingProviderOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationAttributions
        .filter((row) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
    const providerSwitchExecutionDisabled = options.disableProviderSwitchExecutionHistory === true
        || options.disable_provider_switch_execution_history === true;
    const providerSwitchExecutionAttributions = providerSwitchExecutionDisabled
        ? []
        : Array.isArray(providerSwitchExecutionArchive.attributions)
            ? providerSwitchExecutionArchive.attributions
            : [];
    const providerSwitchExecutionRows = providerSwitchExecutionDisabled
        ? []
        : Array.isArray(providerSwitchExecutionArchive.rows)
            ? providerSwitchExecutionArchive.rows
            : [];
    const matchingProviderSwitchExecutionAttributions = providerSwitchExecutionAttributions
        .filter((row) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
    const providerSwitchExecutionMismatchThreshold = Math.max(1, Number(options.providerSwitchExecutionMismatchThreshold
        || options.provider_switch_execution_mismatch_threshold
        || 2));
    const providerOverrideFollowupReceiptValidationFailureThreshold = Math.max(1, Number(options.providerOverrideFollowupReceiptValidationFailureThreshold
        || options.provider_override_followup_receipt_validation_failure_threshold
        || 2));
    const crossGroupProviderReliabilityDisabled = disabled
        || options.disableCrossGroupProviderReliability === true
        || options.disable_cross_group_provider_reliability === true
        || options.crossGroupProviderReliability === false
        || options.cross_group_provider_reliability === false;
    const crossGroupProviderReliabilitySignal = crossGroupProviderReliabilityDisabled
        ? null
        : buildCrossGroupProviderDispatchReliabilitySignal(groupId, {
            ...options,
            agentType,
            generatedAt,
            failureThreshold: providerOverrideFollowupReceiptValidationFailureThreshold,
        });
    const recoveryDisabled = options.disablePressureProvenanceFeedbackRecovery === true
        || options.disable_pressure_provenance_feedback_recovery === true
        || options.disableRecovery === true
        || options.disable_recovery === true;
    const recoveryCreditPerCompliant = Math.max(0, Number(options.recoveryCreditPerCompliant || options.recovery_credit_per_compliant || 1));
    const violationPolicyRows = attributions
        .filter((row) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }))
        .map((row) => {
        const recoveryMatches = recoveryDisabled ? [] : recoveryAttributions
            .filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const recoveryCount = recoveryMatches.reduce((sum, candidate) => sum + Number(candidate.compliant_count || 0), 0);
        const recoveryCredit = Math.floor(recoveryCount * recoveryCreditPerCompliant);
        const violationCount = Number(row.violation_count || 0);
        const recoveryLastCompliantAt = recoveryMatches.map((candidate) => candidate.last_compliant_at || "").filter(Boolean).sort().slice(-1)[0] || "";
        const matchingViolationRows = violationRows.filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const postRecoveryViolations = recoveryLastCompliantAt
            ? matchingViolationRows.filter((candidate) => String(candidate.last_seen_at || candidate.first_seen_at || "").localeCompare(recoveryLastCompliantAt) > 0)
            : [];
        const postRecoveryViolationCount = postRecoveryViolations.reduce((sum, candidate) => sum + Number(candidate.seen_count || 1), 0);
        const relapsed = !recoveryDisabled && recoveryCredit > 0 && postRecoveryViolationCount > 0;
        const effectiveViolationCount = Math.max(0, relapsed ? Math.max(postRecoveryViolationCount, violationCount - recoveryCredit) : violationCount - recoveryCredit);
        const providerOverrideFollowupMatches = matchingProviderOverrideFollowupAttributions
            .filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions(providerOverrideFollowupMatches);
        const providerOverrideFollowupFreshAfterLastViolation = !!providerOverrideFollowup.lastCompletedAt
            && !!String(row.last_violation_at || "")
            && providerOverrideFollowup.lastCompletedAt.localeCompare(String(row.last_violation_at || "")) >= 0;
        return {
            agent_type: row.agent_type || "unknown",
            project: row.project || "unknown",
            violation_count: violationCount,
            effective_violation_count: effectiveViolationCount,
            recovered_violation_count: Math.min(violationCount, recoveryCredit),
            recovery_compliant_count: recoveryCount,
            recovery_credit: recoveryCredit,
            recovery_last_compliant_at: recoveryLastCompliantAt,
            recovery_disabled: recoveryDisabled,
            post_recovery_violation_count: postRecoveryViolationCount,
            recovery_streak_broken_at: postRecoveryViolations.map((candidate) => candidate.last_seen_at || candidate.first_seen_at || "").filter(Boolean).sort().slice(-1)[0] || "",
            relapsed,
            recovered: !relapsed && violationCount >= threshold && effectiveViolationCount < threshold && recoveryCredit > 0,
            packet_count: Number(row.packet_count || 0),
            missing_receipt_count: Number(row.missing_receipt_count || 0),
            missing_memory_provenance_usage_count: Number(row.missing_memory_provenance_usage_count || 0),
            current_source_verified_gap_count: Number(row.current_source_verified_gap_count || 0),
            frequent: effectiveViolationCount >= threshold || relapsed,
            raw_frequent: row.frequent === true || violationCount >= threshold,
            first_violation_at: row.first_violation_at || "",
            last_violation_at: row.last_violation_at || "",
            rel_paths: uniqueStrings(Array.isArray(row.rel_paths) ? row.rel_paths : [], 12),
            repair_work_item_ids: uniqueStrings(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : [], 12),
            gap_codes: uniqueStrings(Array.isArray(row.gap_codes) ? row.gap_codes : [], 12),
            provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
            provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
            provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
            provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
            provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
            provider_override_followup_fresh_after_last_violation: providerOverrideFollowupFreshAfterLastViolation,
            provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
            provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
            provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
        };
    });
    const violationKeys = new Set(violationPolicyRows.map((row) => pressureProvenanceDispatchPolicyAttributionKey(row)));
    const providerOverrideFollowupOnlyRows = matchingProviderOverrideFollowupAttributions
        .filter((row) => !violationKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
        .map((row) => {
        const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions([row]);
        return {
            agent_type: row.agent_type || row.agentType || "unknown",
            project: row.project || row.target_project || row.targetProject || "unknown",
            violation_count: 0,
            effective_violation_count: 0,
            recovered_violation_count: 0,
            recovery_compliant_count: 0,
            recovery_credit: 0,
            recovery_last_compliant_at: "",
            recovery_disabled: recoveryDisabled,
            post_recovery_violation_count: 0,
            recovery_streak_broken_at: "",
            relapsed: false,
            recovered: true,
            provider_override_followup_only: true,
            provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
            provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
            provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
            provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
            provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
            provider_override_followup_fresh_after_last_violation: true,
            provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
            provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
            provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
            packet_count: 0,
            missing_receipt_count: 0,
            missing_memory_provenance_usage_count: 0,
            current_source_verified_gap_count: 0,
            frequent: false,
            raw_frequent: false,
            first_violation_at: "",
            last_violation_at: "",
            rel_paths: providerOverrideFollowup.relPaths,
            repair_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
            gap_codes: ["provider_dispatch_override_followup_repaired"],
        };
    });
    const basePolicyRows = [...violationPolicyRows, ...providerOverrideFollowupOnlyRows];
    const basePolicyKeys = new Set(basePolicyRows.map((row) => pressureProvenanceDispatchPolicyAttributionKey(row)));
    const providerOverrideFollowupReceiptValidationOnlyRows = matchingProviderOverrideFollowupReceiptValidationAttributions
        .filter((row) => !basePolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
        .map((row) => ({
        agent_type: row.agent_type || row.agentType || "unknown",
        project: row.project || row.target_project || row.targetProject || "unknown",
        violation_count: 0,
        effective_violation_count: 0,
        recovered_violation_count: 0,
        recovery_compliant_count: 0,
        recovery_credit: 0,
        recovery_last_compliant_at: "",
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: 0,
        recovery_streak_broken_at: "",
        relapsed: false,
        recovered: false,
        provider_override_followup_only: true,
        provider_override_followup_repaired: false,
        provider_override_followup_repaired_count: 0,
        provider_override_followup_memory_provenance_usage_count: 0,
        provider_override_followup_current_source_verified_count: 0,
        provider_override_followup_last_completed_at: "",
        provider_override_followup_fresh_after_last_violation: false,
        provider_override_followup_rel_paths: [],
        provider_override_followup_work_item_ids: [],
        provider_override_followup_override_ids: [],
        packet_count: 0,
        missing_receipt_count: 0,
        missing_memory_provenance_usage_count: 0,
        current_source_verified_gap_count: 0,
        frequent: false,
        raw_frequent: false,
        first_violation_at: "",
        last_violation_at: "",
        rel_paths: [],
        repair_work_item_ids: [],
        gap_codes: [],
    }));
    const validationPolicyRows = [...basePolicyRows, ...providerOverrideFollowupReceiptValidationOnlyRows];
    const validationPolicyKeys = new Set(validationPolicyRows.map((row) => pressureProvenanceDispatchPolicyAttributionKey(row)));
    const providerSwitchExecutionOnlyRows = matchingProviderSwitchExecutionAttributions
        .filter((row) => !validationPolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
        .map((row) => {
        const execution = summarizeProviderSwitchExecutionPolicyAttributions([row]);
        return {
            agent_type: row.agent_type || row.agentType || row.expected_provider || row.expectedProvider || "unknown",
            project: row.project || row.target_project || row.targetProject || "unknown",
            violation_count: 0,
            effective_violation_count: 0,
            recovered_violation_count: 0,
            recovery_compliant_count: 0,
            recovery_credit: 0,
            recovery_last_compliant_at: "",
            recovery_disabled: recoveryDisabled,
            post_recovery_violation_count: 0,
            recovery_streak_broken_at: "",
            relapsed: false,
            recovered: false,
            provider_switch_execution_only: true,
            packet_count: 0,
            missing_receipt_count: 0,
            missing_memory_provenance_usage_count: 0,
            current_source_verified_gap_count: 0,
            frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
            raw_frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
            first_violation_at: "",
            last_violation_at: "",
            rel_paths: [],
            repair_work_item_ids: [],
            gap_codes: execution.gapCodes,
        };
    });
    const localPolicyRows = [...validationPolicyRows, ...providerSwitchExecutionOnlyRows];
    const crossGroupProviderReliabilityOnlyRows = !localPolicyRows.length && crossGroupProviderReliabilitySignal?.actionable === true
        ? [{
                agent_type: agentType,
                project: targetProject || "unknown",
                violation_count: 0,
                effective_violation_count: 0,
                recovered_violation_count: 0,
                recovery_compliant_count: 0,
                recovery_credit: 0,
                recovery_last_compliant_at: "",
                recovery_disabled: recoveryDisabled,
                post_recovery_violation_count: 0,
                recovery_streak_broken_at: "",
                relapsed: false,
                recovered: false,
                cross_group_provider_reliability_only: true,
                provider_override_followup_only: false,
                provider_override_followup_repaired: false,
                provider_override_followup_repaired_count: 0,
                provider_override_followup_memory_provenance_usage_count: 0,
                provider_override_followup_current_source_verified_count: 0,
                provider_override_followup_last_completed_at: "",
                provider_override_followup_fresh_after_last_violation: false,
                provider_override_followup_rel_paths: [],
                provider_override_followup_work_item_ids: [],
                provider_override_followup_override_ids: [],
                packet_count: 0,
                missing_receipt_count: 0,
                missing_memory_provenance_usage_count: 0,
                current_source_verified_gap_count: 0,
                frequent: false,
                raw_frequent: false,
                first_violation_at: "",
                last_violation_at: "",
                rel_paths: [],
                repair_work_item_ids: [],
                gap_codes: [],
            }]
        : [];
    const matching = [...localPolicyRows, ...crossGroupProviderReliabilityOnlyRows]
        .map((row) => {
        const validationMatches = matchingProviderOverrideFollowupReceiptValidationAttributions
            .filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const validation = summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions(validationMatches);
        const validationEscalated = validation.consecutiveFailureCount >= providerOverrideFollowupReceiptValidationFailureThreshold;
        const validationRepairVerified = !validationEscalated && validation.repairVerified;
        const localValidationRisk = scoreProviderDispatchReliabilityRows(providerOverrideFollowupReceiptValidationRows.filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        })), {
            ...options,
            generatedAt,
        });
        const providerSwitchExecutionMatches = matchingProviderSwitchExecutionAttributions
            .filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const providerSwitchExecution = summarizeProviderSwitchExecutionPolicyAttributions(providerSwitchExecutionMatches);
        const providerSwitchExecutionEvidenceRows = providerSwitchExecutionRows
            .filter((candidate) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
            targetProject: row.project || row.target_project || row.targetProject || targetProject,
            agentType: row.agent_type || row.agentType || agentType,
        }));
        const providerSwitchExecutionRisk = scoreProviderSwitchExecutionRows(providerSwitchExecutionEvidenceRows, {
            ...options,
            generatedAt,
        });
        const providerSwitchExecutionRowIds = uniqueStrings([
            ...providerSwitchExecution.rowIds,
            ...providerSwitchExecutionEvidenceRows.map((candidate) => candidate.row_id || candidate.rowId || "").filter(Boolean),
        ], 32);
        const providerSwitchExecutionMemoryRelPaths = providerSwitchExecution.executedCount > 0 || providerSwitchExecutionEvidenceRows.length
            ? uniqueStrings([
                ...providerSwitchExecution.memoryRelPaths,
                "provider-switch-execution-memory.md",
            ], 8)
            : [];
        const providerSwitchExecutionEscalated = providerSwitchExecution.mismatchCount >= providerSwitchExecutionMismatchThreshold;
        return {
            ...row,
            frequent: row.frequent === true || validationEscalated || providerSwitchExecutionEscalated,
            recovered: row.relapsed !== true && (row.recovered === true || validationRepairVerified),
            provider_override_followup_repaired: row.provider_override_followup_repaired === true || validationRepairVerified,
            provider_override_followup_repaired_count: Math.max(Number(row.provider_override_followup_repaired_count || 0), validationRepairVerified ? validation.passedCount : 0),
            provider_override_followup_last_completed_at: validationRepairVerified ? validation.lastPassedAt : row.provider_override_followup_last_completed_at || "",
            provider_override_followup_fresh_after_last_violation: validationRepairVerified || row.provider_override_followup_fresh_after_last_violation === true,
            provider_override_followup_rel_paths: uniqueStrings([
                ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
                ...validation.relPaths,
            ], 16),
            provider_override_followup_work_item_ids: uniqueStrings([
                ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
                ...validation.followupWorkItemIds,
            ], 16),
            provider_override_followup_override_ids: uniqueStrings([
                ...(Array.isArray(row.provider_override_followup_override_ids) ? row.provider_override_followup_override_ids : []),
                ...validation.overrideIds,
            ], 16),
            provider_override_followup_receipt_validation_attempt_count: validation.attemptCount,
            provider_override_followup_receipt_validation_failed_count: validation.failedCount,
            provider_override_followup_receipt_validation_passed_count: validation.passedCount,
            provider_override_followup_receipt_validation_consecutive_failure_count: validation.consecutiveFailureCount,
            provider_override_followup_receipt_validation_latest_status: validation.latestStatus,
            provider_override_followup_receipt_validation_escalated: validationEscalated,
            provider_override_followup_receipt_validation_repair_verified: validationRepairVerified,
            provider_override_followup_receipt_validation_last_attempt_at: validation.lastAttemptAt,
            provider_override_followup_receipt_validation_last_failed_at: validation.lastFailedAt,
            provider_override_followup_receipt_validation_last_passed_at: validation.lastPassedAt,
            provider_override_followup_receipt_validation_ids: validation.validationIds,
            provider_override_followup_receipt_validation_repair_work_item_ids: validation.repairWorkItemIds,
            provider_override_followup_receipt_validation_rel_paths: validation.relPaths,
            provider_override_followup_receipt_validation_followup_work_item_ids: validation.followupWorkItemIds,
            provider_override_followup_receipt_validation_override_ids: validation.overrideIds,
            provider_override_followup_receipt_validation_gap_codes: validation.gapCodes,
            provider_override_followup_receipt_validation_decayed_failure_score: localValidationRisk.weightedFailureScore,
            provider_override_followup_receipt_validation_decayed_passed_score: localValidationRisk.weightedPassedScore,
            provider_override_followup_receipt_validation_risk_score: localValidationRisk.riskScore,
            provider_override_followup_receipt_validation_risk_confidence: localValidationRisk.confidence,
            provider_override_followup_receipt_validation_half_life_days: localValidationRisk.halfLifeDays,
            provider_switch_execution_history_present: providerSwitchExecution.executedCount > 0,
            provider_switch_execution_executed_count: providerSwitchExecution.executedCount,
            provider_switch_execution_approved_count: providerSwitchExecution.approvedCount,
            provider_switch_execution_passed_count: providerSwitchExecution.passedCount,
            provider_switch_execution_failed_count: providerSwitchExecution.failedCount,
            provider_switch_execution_mismatch_count: providerSwitchExecution.mismatchCount,
            provider_switch_execution_mismatch_escalated: providerSwitchExecutionEscalated,
            provider_switch_execution_mismatch_threshold: providerSwitchExecutionMismatchThreshold,
            provider_switch_execution_expected_provider: providerSwitchExecution.expectedProvider,
            provider_switch_execution_actual_providers: providerSwitchExecution.actualProviders,
            provider_switch_execution_last_executed_at: providerSwitchExecution.lastExecutedAt,
            provider_switch_execution_last_failed_at: providerSwitchExecution.lastFailedAt,
            provider_switch_execution_last_passed_at: providerSwitchExecution.lastPassedAt,
            provider_switch_execution_receipt_ids: providerSwitchExecution.executionReceiptIds,
            provider_switch_execution_decision_receipt_ids: providerSwitchExecution.decisionReceiptIds,
            provider_switch_execution_task_agent_session_ids: providerSwitchExecution.taskAgentSessionIds,
            provider_switch_execution_row_ids: providerSwitchExecutionRowIds,
            provider_switch_execution_memory_rel_paths: providerSwitchExecutionMemoryRelPaths,
            provider_switch_execution_gap_codes: providerSwitchExecution.gapCodes,
            provider_switch_execution_decayed_mismatch_score: providerSwitchExecutionRisk.weightedMismatchScore,
            provider_switch_execution_decayed_failed_score: providerSwitchExecutionRisk.weightedFailedScore,
            provider_switch_execution_decayed_passed_score: providerSwitchExecutionRisk.weightedPassedScore,
            provider_switch_execution_weighted_risk_score: providerSwitchExecutionRisk.weightedRiskScore,
            provider_switch_execution_risk_score: providerSwitchExecutionRisk.riskScore,
            provider_switch_execution_risk_confidence: providerSwitchExecutionRisk.confidence,
            provider_switch_execution_half_life_days: providerSwitchExecutionRisk.halfLifeDays,
            provider_switch_execution_passed_credit: providerSwitchExecutionRisk.passedCredit,
            provider_switch_execution_mismatch_penalty: providerSwitchExecutionRisk.mismatchPenalty,
            cross_group_provider_reliability_guidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
            cross_group_provider_reliability_actionable: crossGroupProviderReliabilitySignal?.actionable === true,
            cross_group_provider_reliability_risk_status: crossGroupProviderReliabilitySignal?.risk_status || "empty",
            cross_group_provider_reliability_risk_score: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
            cross_group_provider_reliability_confidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
            cross_group_provider_reliability_source_group_count: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
        };
    })
        .sort((a, b) => Number(b.effective_violation_count || 0) - Number(a.effective_violation_count || 0) || Number(b.violation_count || 0) - Number(a.violation_count || 0));
    const frequent = matching.filter((row) => row.frequent);
    const recovered = matching.filter((row) => row.recovered);
    const relapsed = matching.filter((row) => row.relapsed);
    const active = !disabled && frequent.length > 0;
    const pressureDiscipline = options.pressureMemoryProvenanceReceiptDiscipline
        || options.pressure_memory_provenance_receipt_discipline
        || null;
    const pressureDisciplineActive = pressureDiscipline?.active === true
        || Number(pressureDiscipline?.docCount || pressureDiscipline?.doc_count || 0) > 0
        || (Array.isArray(pressureDiscipline?.rows) && pressureDiscipline.rows.length > 0);
    const top = frequent[0] || matching[0] || {};
    const policyRows = (active ? frequent : matching).slice(0, Math.max(1, Number(options.maxRows || options.max_rows || 6)));
    return {
        schema: "ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1",
        version: exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
        groupId,
        targetProject,
        agentType,
        active,
        disabled,
        generatedAt,
        source: "typed-feedback:pressure-provenance-pre-dispatch-compliance",
        sourceArchiveSchema: archive.schema || "",
        sourceArchiveUpdatedAt: archive.updatedAt || "",
        recoveryArchiveSchema: recoveryArchive.schema || "",
        recoveryArchiveUpdatedAt: recoveryArchive.updatedAt || "",
        providerOverrideFollowupArchiveSchema: providerOverrideFollowupArchive.schema || "",
        providerOverrideFollowupArchiveUpdatedAt: providerOverrideFollowupArchive.updatedAt || "",
        providerOverrideFollowupReceiptValidationArchiveSchema: providerOverrideFollowupReceiptValidationArchive.schema || "",
        providerOverrideFollowupReceiptValidationArchiveUpdatedAt: providerOverrideFollowupReceiptValidationArchive.updatedAt || "",
        providerSwitchExecutionArchiveSchema: providerSwitchExecutionArchive.schema || "",
        providerSwitchExecutionArchiveUpdatedAt: providerSwitchExecutionArchive.updatedAt || "",
        sourceLedgerFile: ledger.file || getGroupTypedMemoryDistillationLedgerFile(groupId),
        frequentThreshold: threshold,
        recoveryEnabled: !recoveryDisabled,
        recoveryCreditPerCompliant,
        attributionCount: attributions.length,
        matchingAttributionCount: matching.length,
        rawFrequentViolationAttributionCount: matching.filter((row) => row.raw_frequent).length,
        frequentViolationAttributionCount: frequent.length,
        recoveredAttributionCount: recovered.length,
        relapsedAttributionCount: relapsed.length,
        recoveryAttributionCount: recoveryAttributions.length,
        providerOverrideFollowupHistoryEnabled: !providerOverrideFollowupDisabled,
        providerOverrideFollowupAttributionCount: providerOverrideFollowupAttributions.length,
        matchingProviderOverrideFollowupAttributionCount: matchingProviderOverrideFollowupAttributions.length,
        providerOverrideFollowupRepairedAttributionCount: matching.filter((row) => row.provider_override_followup_repaired === true).length,
        providerOverrideFollowupReceiptValidationHistoryEnabled: !providerOverrideFollowupReceiptValidationDisabled,
        providerOverrideFollowupReceiptValidationFailureThreshold,
        providerOverrideFollowupReceiptValidationAttributionCount: providerOverrideFollowupReceiptValidationAttributions.length,
        matchingProviderOverrideFollowupReceiptValidationAttributionCount: matchingProviderOverrideFollowupReceiptValidationAttributions.length,
        providerOverrideFollowupReceiptValidationEscalatedAttributionCount: matching.filter((row) => row.provider_override_followup_receipt_validation_escalated === true).length,
        providerOverrideFollowupReceiptValidationRepairedAttributionCount: matching.filter((row) => row.provider_override_followup_receipt_validation_repair_verified === true).length,
        providerSwitchExecutionHistoryEnabled: !providerSwitchExecutionDisabled,
        providerSwitchExecutionMismatchThreshold,
        providerSwitchExecutionAttributionCount: providerSwitchExecutionAttributions.length,
        matchingProviderSwitchExecutionAttributionCount: matchingProviderSwitchExecutionAttributions.length,
        providerSwitchExecutionMismatchAttributionCount: matching.filter((row) => Number(row.provider_switch_execution_mismatch_count || 0) > 0).length,
        providerSwitchExecutionEscalatedAttributionCount: matching.filter((row) => row.provider_switch_execution_mismatch_escalated === true).length,
        providerSwitchExecutionPassedCount: matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_passed_count || 0), 0),
        providerSwitchExecutionFailedCount: matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_failed_count || 0), 0),
        providerSwitchExecutionMismatchCount: matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_mismatch_count || 0), 0),
        providerSwitchExecutionDecayedMismatchScore: providerDispatchReliabilityRound(matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_decayed_mismatch_score || 0), 0)),
        providerSwitchExecutionDecayedFailedScore: providerDispatchReliabilityRound(matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_decayed_failed_score || 0), 0)),
        providerSwitchExecutionDecayedPassedScore: providerDispatchReliabilityRound(matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_decayed_passed_score || 0), 0)),
        providerSwitchExecutionWeightedRiskScore: providerDispatchReliabilityRound(matching.reduce((sum, row) => sum + Number(row.provider_switch_execution_weighted_risk_score || 0), 0)),
        crossGroupProviderReliabilityEnabled: !crossGroupProviderReliabilityDisabled,
        crossGroupProviderReliabilityActionable: crossGroupProviderReliabilitySignal?.actionable === true,
        crossGroupProviderReliabilityRiskStatus: crossGroupProviderReliabilitySignal?.risk_status || "empty",
        crossGroupProviderReliabilityRiskScore: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
        crossGroupProviderReliabilityConfidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
        crossGroupProviderReliabilitySourceGroupCount: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
        crossGroupProviderReliabilityGuidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
        pressureMemoryProvenanceDisciplineActive: pressureDisciplineActive,
        action: active
            ? matching.some((row) => row.provider_switch_execution_mismatch_escalated === true)
                ? "hold_provider_after_repeated_provider_switch_execution_mismatches"
                : matching.some((row) => row.provider_override_followup_receipt_validation_escalated === true)
                    ? "hold_provider_after_repeated_override_followup_receipt_validation_failures"
                    : relapsed.length
                        ? "reactivate_pressure_memory_provenance_receipt_contract_after_recovery_relapse"
                        : "strengthen_pressure_memory_provenance_receipt_contract"
            : recovered.length
                ? matching.some((row) => row.provider_override_followup_receipt_validation_repair_verified === true)
                    ? "monitor_repaired_provider_override_followup_receipt_validation"
                    : "monitor_recovered_pressure_memory_provenance_receipt_contract"
                : matching.some((row) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
                    ? "monitor_provider_switch_execution_mismatch_history"
                    : crossGroupProviderReliabilitySignal?.actionable === true
                        ? "monitor_cross_group_provider_reliability_guidance"
                        : "monitor_pressure_memory_provenance_receipt_contract",
        severity: active && (Number(top.effective_violation_count || top.violation_count || 0) >= threshold * 2
            || Number(top.provider_switch_execution_mismatch_count || 0) >= providerSwitchExecutionMismatchThreshold * 2) ? "high" : active ? "medium" : "none",
        receiptContractMode: pressureDisciplineActive ? "strict_required_for_pressure_memory" : active ? "preemptive_ack_and_empty_usage_allowed" : "default",
        ackRequired: active,
        finalReceiptVerificationRequired: active,
        memoryProvenanceUsageRequiredWhenPressureMemoryPresent: active,
        currentSourceVerificationRequiredWhenUsed: active,
        closeGate: active ? "do_not_close_until_memoryProvenanceUsage_is_present_or_explicitly_empty_with_reason" : "default_receipt_review",
        requiredReceiptFields: active
            ? ["memoryProvenanceUsage", "relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"]
            : [],
        policyRows,
        relPaths: uniqueStrings(policyRows.flatMap((row) => [
            ...(Array.isArray(row.rel_paths) ? row.rel_paths : []),
            ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
            ...(Array.isArray(row.provider_override_followup_receipt_validation_rel_paths) ? row.provider_override_followup_receipt_validation_rel_paths : []),
            ...(Array.isArray(row.provider_switch_execution_memory_rel_paths) ? row.provider_switch_execution_memory_rel_paths : []),
        ]), 16),
        repairWorkItemIds: uniqueStrings(policyRows.flatMap((row) => [
            ...(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []),
            ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
            ...(Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids) ? row.provider_override_followup_receipt_validation_repair_work_item_ids : []),
        ]), 16),
        gapCodes: uniqueStrings(policyRows.flatMap((row) => [
            ...(Array.isArray(row.gap_codes) ? row.gap_codes : []),
            ...(Array.isArray(row.provider_override_followup_receipt_validation_gap_codes) ? row.provider_override_followup_receipt_validation_gap_codes : []),
            ...(Array.isArray(row.provider_switch_execution_gap_codes) ? row.provider_switch_execution_gap_codes : []),
        ]), 16),
        reason: active
            ? top.provider_switch_execution_mismatch_escalated === true
                ? compactText(`Provider switch execution typed memory found ${top.provider_switch_execution_mismatch_count || 0} mismatch(es) for expected provider=${agentType} project=${targetProject || "unknown"}; hold new approved switches for this provider/project until runner/session binding repair is verified.`, 700)
                : top.provider_override_followup_receipt_validation_escalated === true
                    ? compactText(`Corrected provider override follow-up receipts failed ${top.provider_override_followup_receipt_validation_consecutive_failure_count || 0} consecutive validation attempt(s) for agentType=${agentType} project=${targetProject || "unknown"}; hold new child Agent dispatch until a receipt satisfies the full relPath/work-item/override-id/current-source contract.`, 700)
                    : compactText(`Phase 137 feedback memory found repeated pressure provenance receipt violations for agentType=${agentType} project=${targetProject || "unknown"}; effective violations=${top.effective_violation_count ?? top.violation_count ?? 0} after recovery credits${top.relapsed ? `; recovered attribution relapsed with ${top.post_recovery_violation_count || 0} post-recovery violation(s)` : ""}; require stricter ACK and final receipt verification before child Agent closure.`, 700)
            : disabled
                ? "pressure provenance feedback dispatch policy disabled"
                : recovered.length
                    ? matching.some((row) => row.provider_override_followup_receipt_validation_repair_verified === true)
                        ? "corrected provider override follow-up receipt passed after prior failures; clear the active failure streak, retain audit history, and allow monitored receipt sampling"
                        : matching.some((row) => row.provider_override_followup_repaired === true)
                            ? "matching attribution has verified provider dispatch override follow-up repair history; allow only with receipt sampling and current evidence checks"
                            : "matching attribution recovered below frequent violation threshold after compliant pressure provenance receipts"
                    : matching.some((row) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
                        ? "provider switch execution mismatch history exists; keep future switches under receipt sampling and do not treat past passed switch executions as authorization"
                        : crossGroupProviderReliabilitySignal?.actionable === true
                            ? `privacy-redacted cross-group provider reliability is ${crossGroupProviderReliabilitySignal.risk_status || "unknown"} for agentType=${agentType}; this is receipt-sampling guidance only and cannot override this group's local hold/allow policy`
                            : matching.length
                                ? "matching attribution exists but has not reached frequent violation threshold"
                                : "no matching pressure provenance pre-dispatch compliance feedback attribution",
    };
}
function contextUsageRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.packets) ? input.packets : []),
        ...(Array.isArray(input.gaps) ? input.gaps : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.packets) ? group.packets : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function contextUsageRepairRowId(row = {}) {
    return `context-usage-repair:${checksum([
        row.groupId,
        row.worker_context_packet_id,
        row.binding_id,
        row.work_item_id,
        row.project,
        row.usage_status,
        row.pressure,
    ], 24)}`;
}
function normalizeContextUsageRepairStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["over_budget", "critical", "compact_recommended", "warn", "ok", "completed", "cancelled", "pending", "in_progress", "blocked"].includes(status))
        return status;
    return status ? "unknown" : "compact_recommended";
}
function normalizeContextUsageRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return contextUsageRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.packet || raw || {};
        const usageStatus = normalizeContextUsageRepairStatus(entry.worker_context_packet_usage_status
            || entry.usage_status
            || entry.status
            || entry.workerContextPacketUsageStatus
            || raw?.usage_status
            || raw?.status);
        const topCategories = Array.isArray(entry.worker_context_packet_top_categories)
            ? entry.worker_context_packet_top_categories
            : Array.isArray(entry.top_categories)
                ? entry.top_categories
                : [];
        const reductions = Array.isArray(entry.worker_context_packet_suggested_reductions)
            ? entry.worker_context_packet_suggested_reductions
            : Array.isArray(entry.suggested_reductions)
                ? entry.suggested_reductions
                : [];
        const row = {
            schema: "ccm-context-usage-repair-distilled-row-v1",
            version: exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source: String(entry.source || raw?.source || "worker_context_packet_context_usage_repair").trim(),
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            usage_status: usageStatus,
            pressure: Number(entry.worker_context_packet_pressure ?? entry.pressure ?? raw?.pressure ?? 0),
            total_tokens: Number(entry.worker_context_packet_total_tokens ?? entry.total_tokens ?? raw?.total_tokens ?? 0),
            max_tokens: Number(entry.worker_context_packet_max_tokens ?? entry.max_tokens ?? raw?.max_tokens ?? 0),
            free_tokens: Number(entry.worker_context_packet_free_tokens ?? entry.free_tokens ?? raw?.free_tokens ?? 0),
            autocompact_buffer_tokens: Number(entry.worker_context_packet_autocompact_buffer_tokens ?? entry.autocompact_buffer_tokens ?? raw?.autocompact_buffer_tokens ?? 0),
            top_categories: topCategories.slice(0, 8).map((item) => ({
                id: String(item.id || item.category_id || item.categoryId || item.name || "").trim(),
                name: String(item.name || item.label || item.id || item.category_id || "").trim(),
                tokens: Number(item.tokens || 0),
            })),
            suggested_reductions: reductions.slice(0, 8).map((item) => ({
                category_id: String(item.category_id || item.categoryId || item.id || item.name || "").trim(),
                name: String(item.name || item.label || item.category_id || item.id || "").trim(),
                tokens: Number(item.tokens || 0),
                suggestion: compactText(item.suggestion || item.instruction || item.reason || "", 360),
            })),
            instruction: compactText(entry.instruction || raw?.instruction || "", 1200),
            expected: compactText(entry.expected || raw?.expected || "context_usage.status<=warn; free_tokens>=autocompact_buffer_tokens; rendered Context usage budget present", 700),
            reason: compactText(entry.source_reason || entry.description || raw?.reason || raw?.source_reason || "", 700),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: contextUsageRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_packet_context_usage_repair" || /context usage|Context usage budget|free_tokens|autocompact_buffer|typed MEMORY/i.test(`${row.reason}\n${row.instruction}\n${row.expected}`));
}
function mergeContextUsageRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || contextUsageRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || contextUsageRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function contextUsageRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const overBudgetRows = rows.filter((row) => row.usage_status === "over_budget");
    const criticalRows = rows.filter((row) => row.usage_status === "critical");
    const compactRows = rows.filter((row) => row.usage_status === "compact_recommended");
    return {
        schema: "ccm-context-usage-repair-distillation-v1",
        version: exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        over_budget_count: overBudgetRows.length,
        critical_count: criticalRows.length,
        compact_recommended_count: compactRows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        max_pressure: rows.reduce((max, row) => Math.max(max, Number(row.pressure || 0)), 0),
        rows,
        updatedAt,
    };
}
function renderContextUsageRepairBody(rows = [], options = {}) {
    const categoryCounts = new Map();
    for (const row of rows) {
        for (const category of row.top_categories || []) {
            const id = String(category.id || category.category_id || category.name || "").trim();
            if (!id)
                continue;
            categoryCounts.set(id, Number(categoryCounts.get(id) || 0) + 1);
        }
    }
    const hotCategories = [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([id, count]) => `${id}:${count}`)
        .join("; ");
    const lines = [
        "# WorkerContextPacket Context Usage Repair Discipline",
        "",
        `Generated by CCM context usage repair distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records repeated WorkerContextPacket context pressure repairs before third-party child Agent dispatch.",
        "When context_usage.status is compact_recommended, critical, or over_budget, compact/crop the WorkerContextPacket before child-Agent dispatch.",
        "Keep task_goal, verification_and_acceptance, required proof/receipt identifiers, and the rendered Context usage budget visible.",
        "Target context_usage.status<=warn and free_tokens>=autocompact_buffer_tokens. Prefer replacing full group_memory_rendered with the newest compact summary, deduping typed_memory_recall, suppressing irrelevant global_memory, and trimming replay_repair_dispatch_briefs to IDs and required proof facts.",
        hotCategories ? `Hot pressure categories: ${hotCategories}.` : "",
        "",
        "## Pressure Repair Rows",
    ].filter(line => line !== "");
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
        ].filter(Boolean).join("; ");
        const categories = (row.top_categories || []).slice(0, 4).map((item) => `${item.id || item.name}:${item.tokens || 0}`).join("; ");
        const reductions = (row.suggested_reductions || []).slice(0, 3).map((item) => `${item.category_id || item.name}: ${item.suggestion || ""}`).join(" ");
        lines.push(`- [${row.usage_status || "pressure"}] ${ids || row.row_id}; pressure=${Number(row.pressure || 0)}%; tokens=${Number(row.total_tokens || 0)}/${Number(row.max_tokens || 0)}; free=${Number(row.free_tokens || 0)}; buffer=${Number(row.autocompact_buffer_tokens || 0)}.`);
        if (categories)
            lines.push(`  Top categories: ${categories}.`);
        if (reductions)
            lines.push(`  Suggested reductions: ${compactText(reductions, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillContextUsageRepairToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-context-usage-repair-distillation-v1",
            version: exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const incomingRows = normalizeContextUsageRepairRows(input, { ...options, groupId, updatedAt });
    const previousArchive = ledger.contextUsageRepairArchive || {};
    const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
    const merged = mergeContextUsageRepairRows(previousRows, incomingRows, { ...options, updatedAt });
    const archive = contextUsageRepairArchive(merged.rows, { updatedAt });
    const writes = [];
    if (archive.rows.length) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-usage-pressure-discipline",
            name: "WorkerContextPacket context usage pressure discipline",
            description: "Reactive compact/crop discipline for WorkerContextPacket context pressure before child Agent dispatch.",
            source: "auto:context-usage-repair-distillation",
            updatedAt,
            body: renderContextUsageRepairBody(archive.rows, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        contextUsageRepairArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-context-usage-repair-distillation-v1",
        version: exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        incomingRowCount: incomingRows.length,
        archivedCount: archive.archived_count,
        overBudgetCount: archive.over_budget_count,
        criticalCount: archive.critical_count,
        compactRecommendedCount: archive.compact_recommended_count,
        openCount: archive.open_count,
        packetBoundCount: archive.packet_bound_count,
        maxPressure: archive.max_pressure,
        newRowCount: merged.newRowCount,
        updatedRowCount: merged.updatedRowCount,
        prunedRowCount: merged.prunedRowCount,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function compactStrategyInputStrategy(input = {}) {
    return input.strategy || input.compactStrategy || input.compact_strategy || {};
}
function compactStrategyInputOutcomes(input = {}) {
    if (Array.isArray(input))
        return input;
    if (Array.isArray(input.outcomes))
        return input.outcomes;
    if (Array.isArray(input.entries))
        return input.entries;
    if (Array.isArray(input.outcomeEntries))
        return input.outcomeEntries;
    if (Array.isArray(input.outcome_entries))
        return input.outcome_entries;
    if (Array.isArray(input.outcomeLedger?.entries))
        return input.outcomeLedger.entries;
    if (Array.isArray(input.outcome_ledger?.entries))
        return input.outcome_ledger.entries;
    return [];
}
function normalizeCompactStrategyCategories(strategy = {}) {
    return (Array.isArray(strategy.categories) ? strategy.categories : []).map((row) => ({
        category: String(row.category || row.id || row.name || "").trim(),
        attempts: Number(row.attempts || 0),
        recovered: Number(row.recovered || 0),
        blocked: Number(row.blocked || 0),
        recovery_rate: Number(row.recovery_rate || row.recoveryRate || 0),
        task_preserved: Number(row.task_preserved || row.taskPreserved || 0),
        task_compacted: Number(row.task_compacted || row.taskCompacted || 0),
        avg_token_delta: Number(row.avg_token_delta || row.avgTokenDelta || 0),
        avg_free_token_delta: Number(row.avg_free_token_delta || row.avgFreeTokenDelta || 0),
        avg_partial_omitted_chars: Number(row.avg_partial_omitted_chars || row.avgPartialOmittedChars || 0),
        strategy_score: Number(row.strategy_score || row.strategyScore || 0),
        recommendation: String(row.recommendation || "observe").trim() || "observe",
        latest_at: String(row.latest_at || row.latestAt || ""),
    })).filter((row) => row.category);
}
function normalizeCompactStrategyOutcomeRows(rows = [], options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-compact-strategy-outcome-distilled-row-v1",
            version: exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            outcome_id: String(entry.outcome_id || entry.outcomeId || "").trim(),
            retry_id: String(entry.retry_id || entry.retryId || "").trim(),
            hook_run_id: String(entry.hook_run_id || entry.hookRunId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || "").trim(),
            method: String(entry.method || entry.retry_method || entry.retryMethod || "metadata_partial_compact").trim(),
            status: String(entry.status || (entry.dispatch_ready === true ? "recovered" : entry.dispatch_ready === false ? "blocked" : "")).trim().toLowerCase(),
            dispatch_ready: entry.dispatch_ready === true || entry.dispatchReady === true,
            from_total_tokens: Number(entry.from_total_tokens || entry.fromTotalTokens || 0),
            retry_total_tokens: Number(entry.retry_total_tokens || entry.retryTotalTokens || 0),
            from_free_tokens: Number(entry.from_free_tokens || entry.fromFreeTokens || 0),
            retry_free_tokens: Number(entry.retry_free_tokens || entry.retryFreeTokens || 0),
            token_delta: Number(entry.token_delta || entry.tokenDelta || 0),
            free_token_delta: Number(entry.free_token_delta || entry.freeTokenDelta || 0),
            partial_compact: entry.partial_compact === true || entry.partialCompact === true,
            task_compacted: entry.task_compacted === true || entry.taskCompacted === true,
            task_hash_unchanged: entry.task_hash_unchanged === true || entry.taskHashUnchanged === true,
            selected_categories: [...new Set(categories)],
            partial_omitted_chars: Number(entry.partial_omitted_chars || entry.partialOmittedChars || entry.omitted_chars || 0),
            distillation_candidate: entry.distillation_candidate !== false,
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || now()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `compact-strategy-outcome:${checksum([
                row.groupId,
                row.outcome_id,
                row.retry_id,
                row.hook_run_id,
                row.assignment_id,
                row.selected_categories.join(","),
                row.status,
            ], 24)}`,
        };
    }).filter((row) => row.distillation_candidate !== false && row.selected_categories.length > 0);
}
function compactStrategyTypedArchive(strategy = {}, outcomes = [], options = {}) {
    const updatedAt = String(options.updatedAt || now());
    const categories = normalizeCompactStrategyCategories(strategy);
    const preferred = Array.isArray(strategy.preferred_categories || strategy.preferredCategories)
        ? (strategy.preferred_categories || strategy.preferredCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "prefer").map((item) => item.category);
    const avoid = Array.isArray(strategy.avoid_categories || strategy.avoidCategories)
        ? (strategy.avoid_categories || strategy.avoidCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "avoid").map((item) => item.category);
    const outcomeRows = normalizeCompactStrategyOutcomeRows(outcomes, { ...options, groupId: strategy.groupId || strategy.group_id });
    return {
        schema: "ccm-compact-strategy-typed-memory-distillation-v1",
        version: exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(strategy.groupId || strategy.group_id || options.groupId || options.group_id || "").trim(),
        strategy_id: String(strategy.strategy_id || strategy.strategyId || ""),
        strategy_sample_count: Number(strategy.sample_count || strategy.sampleCount || 0),
        category_count: categories.length,
        preferred_count: preferred.length,
        avoid_count: avoid.length,
        outcome_count: outcomeRows.length,
        recovered_outcome_count: outcomeRows.filter((row) => row.status === "recovered" || row.dispatch_ready === true).length,
        blocked_outcome_count: outcomeRows.filter((row) => row.status === "blocked" || row.dispatch_ready === false).length,
        task_preserved_outcome_count: outcomeRows.filter((row) => row.task_hash_unchanged === true).length,
        total_token_delta: outcomeRows.reduce((sum, row) => sum + Number(row.token_delta || 0), 0),
        total_free_token_delta: outcomeRows.reduce((sum, row) => sum + Number(row.free_token_delta || 0), 0),
        preferred_categories: preferred,
        avoid_categories: avoid,
        categories,
        outcome_rows: outcomeRows,
        source_strategy_file: String(strategy.file || ""),
        source_ledger_file: String(strategy.source_ledger_file || strategy.sourceLedgerFile || ""),
        updatedAt,
    };
}
function renderCompactStrategyReferenceBody(archive = {}, options = {}) {
    const lines = [
        "# WorkerContextPacket Compact Strategy Memory",
        "",
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || now()}.`,
        "Use this memory when a future WorkerContextPacket is near or over budget and needs compact/crop before child-Agent dispatch.",
        "Prefer compact categories with proven recovery, positive free_token_delta, and task_hash_unchanged=true. Avoid categories that repeatedly block or compact the task body.",
        "",
        `Samples: strategy=${archive.strategy_sample_count || 0}; outcomes=${archive.outcome_count || 0}; recovered=${archive.recovered_outcome_count || 0}; blocked=${archive.blocked_outcome_count || 0}; task_preserved=${archive.task_preserved_outcome_count || 0}.`,
        archive.preferred_categories?.length ? `Preferred categories: ${archive.preferred_categories.join(", ")}.` : "",
        archive.avoid_categories?.length ? `Avoid categories: ${archive.avoid_categories.join(", ")}.` : "",
        "",
        "## Category Strategy",
    ].filter(line => line !== "");
    for (const row of archive.categories || []) {
        lines.push(`- [${row.recommendation || "observe"}] ${row.category}: attempts=${row.attempts || 0}; recovered=${row.recovered || 0}; blocked=${row.blocked || 0}; recovery_rate=${row.recovery_rate || 0}; avg_free_token_delta=${row.avg_free_token_delta || 0}; task_preserved=${row.task_preserved || 0}; task_compacted=${row.task_compacted || 0}; score=${row.strategy_score || 0}.`);
    }
    lines.push("", "## Outcome Samples");
    for (const row of (archive.outcome_rows || []).slice(-12)) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.assignment_id ? `assignment=${row.assignment_id}` : "",
            row.retry_id ? `retry=${row.retry_id}` : "",
            row.hook_run_id ? `hook=${row.hook_run_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "unknown"}] ${ids || row.row_id}; method=${row.method}; categories=${(row.selected_categories || []).join(",")}; token_delta=${row.token_delta || 0}; free_token_delta=${row.free_token_delta || 0}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function renderCompactStrategyCautionBody(archive = {}, options = {}) {
    const avoidRows = (archive.categories || []).filter((row) => archive.avoid_categories?.includes(row.category) || row.recommendation === "avoid" || Number(row.blocked || 0) > 0);
    const blockedOutcomes = (archive.outcome_rows || []).filter((row) => row.status === "blocked" || row.dispatch_ready === false);
    const lines = [
        "# WorkerContextPacket Compact Strategy Cautions",
        "",
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || now()}.`,
        "These categories or outcomes should not be blindly reused for future WorkerContextPacket compaction. Verify current task shape before applying them.",
        "",
        "## Avoid Or Review Categories",
    ];
    for (const row of avoidRows) {
        lines.push(`- ${row.category}: recommendation=${row.recommendation || "observe"}; attempts=${row.attempts || 0}; recovered=${row.recovered || 0}; blocked=${row.blocked || 0}; avg_free_token_delta=${row.avg_free_token_delta || 0}; task_compacted=${row.task_compacted || 0}.`);
    }
    lines.push("", "## Blocked Outcomes");
    for (const row of blockedOutcomes.slice(-12)) {
        lines.push(`- ${row.project || row.assignment_id || row.row_id}: categories=${(row.selected_categories || []).join(",")}; token_delta=${row.token_delta || 0}; free_token_delta=${row.free_token_delta || 0}; task_compacted=${row.task_compacted === true}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillCompactStrategyToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-compact-strategy-typed-memory-distillation-v1",
            version: exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const strategy = compactStrategyInputStrategy(input);
    const outcomes = compactStrategyInputOutcomes(input);
    const archive = compactStrategyTypedArchive({ ...strategy, groupId: strategy.groupId || strategy.group_id || groupId }, outcomes, { ...options, groupId, updatedAt });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const writes = [];
    if (archive.category_count > 0 || archive.outcome_count > 0) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "worker-context-compact-strategy-memory",
            name: "WorkerContextPacket compact strategy memory",
            description: "Reusable compact strategy outcomes for WorkerContextPacket budget recovery.",
            source: "auto:compact-strategy-memory-distillation",
            updatedAt,
            body: renderCompactStrategyReferenceBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
        }));
    }
    if (archive.avoid_count > 0 || archive.blocked_outcome_count > 0) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-compact-strategy-cautions",
            name: "WorkerContextPacket compact strategy cautions",
            description: "Compact strategy categories and outcomes that blocked dispatch or need review before reuse.",
            source: "auto:compact-strategy-memory-distillation",
            updatedAt,
            body: renderCompactStrategyCautionBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        compactStrategyArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-compact-strategy-typed-memory-distillation-v1",
        version: exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        archivedCount: archive.outcome_count,
        categoryCount: archive.category_count,
        preferredCount: archive.preferred_count,
        avoidCount: archive.avoid_count,
        recoveredOutcomeCount: archive.recovered_outcome_count,
        blockedOutcomeCount: archive.blocked_outcome_count,
        writeCount: writes.length,
        writes,
        index,
        archive,
        distilledAt: updatedAt,
    };
}
function normalizePtlEmergencyHintForTypedMemory(input = {}, options = {}) {
    const raw = input.hint || input.ptlEmergencyHint || input.ptl_emergency_hint || input || {};
    const retryOptions = raw.recommended_retry_options || raw.recommendedRetryOptions || {};
    return {
        schema: "ccm-ptl-emergency-typed-memory-hint-v1",
        version: exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(raw.groupId || raw.group_id || options.groupId || options.group_id || "").trim(),
        hint_id: String(raw.hint_id || raw.hintId || "").trim(),
        engaged: raw.engaged === true,
        emergency_level: String(raw.emergency_level || raw.emergencyLevel || (raw.engaged ? "warning" : "none")).trim(),
        reason: compactText(raw.reason || "", 900),
        blocked_outcome_count: Number(raw.blocked_outcome_count || raw.blockedOutcomeCount || 0),
        task_compacted_blocked_count: Number(raw.task_compacted_blocked_count || raw.taskCompactedBlockedCount || 0),
        repeated_failed_categories: uniqueStrings((Array.isArray(raw.repeated_failed_categories || raw.repeatedFailedCategories)
            ? (raw.repeated_failed_categories || raw.repeatedFailedCategories)
            : []).map((item) => String(item || "").trim()).filter(Boolean), 30),
        recommended_retry_options: {
            memory: retryOptions.memory || retryOptions.memoryOptions || {},
            replayRepairDispatchBriefs: retryOptions.replayRepairDispatchBriefs || retryOptions.replay_repair_dispatch_briefs || {},
            metadata: retryOptions.metadata || retryOptions.metadataPartialCompact || {},
            maxTaskChars: Number(retryOptions.maxTaskChars || retryOptions.max_task_chars || 0),
        },
        source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || "").trim(),
        source_strategy_file: String(raw.source_strategy_file || raw.sourceStrategyFile || "").trim(),
        generated_at: String(raw.generated_at || raw.generatedAt || options.updatedAt || now()),
    };
}
function normalizePtlEmergencyOutcomeRows(rows = [], options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-ptl-emergency-typed-memory-outcome-row-v1",
            version: exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            outcome_id: String(entry.outcome_id || entry.outcomeId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || "").trim(),
            method: String(entry.method || "metadata_partial_compact_then_deterministic_head_tail_critical_lines").trim(),
            status: String(entry.status || (entry.dispatch_ready === false ? "blocked" : entry.dispatch_ready === true ? "recovered" : "")).trim().toLowerCase(),
            dispatch_ready: entry.dispatch_ready === true || entry.dispatchReady === true,
            task_compacted: entry.task_compacted === true || entry.taskCompacted === true,
            task_hash_unchanged: entry.task_hash_unchanged === true || entry.taskHashUnchanged === true,
            token_delta: Number(entry.token_delta || entry.tokenDelta || 0),
            free_token_delta: Number(entry.free_token_delta || entry.freeTokenDelta || 0),
            from_total_tokens: Number(entry.from_total_tokens || entry.fromTotalTokens || 0),
            retry_total_tokens: Number(entry.retry_total_tokens || entry.retryTotalTokens || 0),
            from_free_tokens: Number(entry.from_free_tokens || entry.fromFreeTokens || 0),
            retry_free_tokens: Number(entry.retry_free_tokens || entry.retryFreeTokens || 0),
            selected_categories: uniqueStrings(categories, 20),
            partial_omitted_chars: Number(entry.partial_omitted_chars || entry.partialOmittedChars || entry.omitted_chars || 0),
            distillation_candidate: entry.distillation_candidate !== false,
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || now()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `ptl-emergency-outcome:${checksum([
                row.groupId,
                row.outcome_id,
                row.assignment_id,
                row.selected_categories.join(","),
                row.status,
                row.task_compacted,
            ], 24)}`,
        };
    }).filter((row) => row.distillation_candidate !== false && (row.status === "blocked" || row.dispatch_ready === false || row.task_compacted === true));
}
function ptlEmergencyTypedArchive(groupId, input = {}, options = {}) {
    const hint = normalizePtlEmergencyHintForTypedMemory(input, { ...options, groupId });
    const outcomeRows = normalizePtlEmergencyOutcomeRows(Array.isArray(input.outcomes) ? input.outcomes
        : Array.isArray(input.entries) ? input.entries
            : Array.isArray(input.outcomeLedger?.entries) ? input.outcomeLedger.entries
                : [], { ...options, groupId });
    const failedCategories = uniqueStrings([
        ...(hint.repeated_failed_categories || []),
        ...outcomeRows.flatMap((row) => row.selected_categories || []),
    ], 40);
    return {
        schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
        version: exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        hint,
        engaged: hint.engaged === true,
        emergency_level: hint.emergency_level || "",
        blocked_outcome_count: Math.max(Number(hint.blocked_outcome_count || 0), outcomeRows.filter((row) => row.status === "blocked" || row.dispatch_ready === false).length),
        task_compacted_blocked_count: Math.max(Number(hint.task_compacted_blocked_count || 0), outcomeRows.filter((row) => row.task_compacted === true && (row.status === "blocked" || row.dispatch_ready === false)).length),
        failed_category_count: failedCategories.length,
        failed_categories: failedCategories,
        outcome_count: outcomeRows.length,
        rows: outcomeRows,
        source_ledger_file: hint.source_ledger_file || "",
        source_strategy_file: hint.source_strategy_file || "",
        updatedAt: String(options.updatedAt || now()),
    };
}
function renderPtlEmergencyTypedBody(archive = {}, options = {}) {
    const retry = archive.hint?.recommended_retry_options || {};
    const memory = retry.memory || {};
    const replay = retry.replayRepairDispatchBriefs || {};
    const metadata = retry.metadata || {};
    const lines = [
        "# WorkerContextPacket PTL Emergency Downgrade Discipline",
        "",
        `Generated by CCM PTL emergency typed-memory distillation at ${options.updatedAt || now()}.`,
        "This feedback memory records repeated compact failures where normal WorkerContextPacket retry was not enough before child-Agent dispatch.",
        "When similar pressure appears, switch to PTL emergency downgrade: shrink memory, replay repair briefs, metadata, and task body budgets before creating another child Agent session.",
        "",
        `Emergency level: ${archive.emergency_level || "unknown"}.`,
        `Reason: ${archive.hint?.reason || "repeated compact failure"}`,
        `Blocked outcomes: ${archive.blocked_outcome_count || 0}; task_compacted_blocked: ${archive.task_compacted_blocked_count || 0}.`,
        archive.failed_categories?.length ? `Repeated failed categories: ${archive.failed_categories.join(", ")}.` : "",
        "",
        "## Recommended Retry Budgets",
        `- memory.maxRenderedChars=${Number(memory.maxRenderedChars || memory.max_rendered_chars || 0)}; memory.maxJsonChars=${Number(memory.maxJsonChars || memory.max_json_chars || 0)}; memory.maxRecallItems=${Number(memory.maxRecallItems || memory.max_recall_items || 0)}.`,
        `- replayRepairDispatchBriefs.maxBriefs=${Number(replay.maxBriefs || replay.max_briefs || 0)}; maxStringChars=${Number(replay.maxStringChars || replay.max_string_chars || 0)}; maxIdChars=${Number(replay.maxIdChars || replay.max_id_chars || 0)}.`,
        `- metadata.maxCategories=${Number(metadata.maxCategories || metadata.max_categories || 0)}; maxItems=${Number(metadata.maxItems || metadata.max_items || 0)}; maxStringChars=${Number(metadata.maxStringChars || metadata.max_string_chars || 0)}.`,
        `- maxTaskChars=${Number(retry.maxTaskChars || retry.max_task_chars || 0)}.`,
        "",
        "## Blocked Outcome Samples",
    ];
    for (const row of archive.rows || []) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.assignment_id ? `assignment=${row.assignment_id}` : "",
            row.outcome_id ? `outcome=${row.outcome_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "blocked"}] ${ids || row.row_id}; method=${row.method}; categories=${(row.selected_categories || []).join(",")}; retry_total=${row.retry_total_tokens || 0}; retry_free=${row.retry_free_tokens || 0}; task_compacted=${row.task_compacted === true}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillPtlEmergencyDowngradeToTypedMemory(groupId, input = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return {
            schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
            version: exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "disabled",
        };
    }
    const updatedAt = String(options.updatedAt || options.updated_at || now());
    const archive = ptlEmergencyTypedArchive(groupId, input, { ...options, updatedAt });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const writes = [];
    if (archive.engaged || archive.outcome_count > 0 || archive.blocked_outcome_count > 0) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-ptl-emergency-downgrade",
            name: "WorkerContextPacket PTL emergency downgrade discipline",
            description: "Emergency downgrade budgets and cautions for repeated WorkerContextPacket compact failures.",
            source: "auto:ptl-emergency-downgrade-distillation",
            updatedAt,
            body: renderPtlEmergencyTypedBody(archive, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
        }));
    }
    const ledgerState = { ...ledger };
    delete ledgerState.file;
    writeJsonAtomic(ledger.file, {
        ...ledgerState,
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        facts: ledger.facts || {},
        ptlEmergencyArchive: archive,
        updatedAt,
    });
    const index = buildGroupTypedMemoryIndex(groupId);
    return {
        schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
        version: exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
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
function extractPathClaims(value) {
    const text = String(value || "");
    const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return uniqueStrings(matched.map(item => item.replace(/[),.;，。；]+$/g, "")), 80);
}
function resolveClaimPath(projectRoot, claim) {
    const raw = String(claim || "").trim();
    if (!raw)
        return "";
    if (/^[A-Za-z]:\\/.test(raw) || path.isAbsolute(raw))
        return raw;
    return path.resolve(projectRoot, raw.replace(/\\/g, path.sep));
}
function addDistillationQualityCheck(checks, input) {
    checks.push({
        id: input.id,
        label: input.label,
        pass: input.pass,
        severity: input.severity || "medium",
        detail: input.detail || "",
        evidence: input.evidence || [],
        gaps: input.gaps || [],
        score: input.pass ? 100 : 0,
    });
}
function distillationQualityPenalty(severity) {
    if (severity === "fatal")
        return 45;
    if (severity === "high")
        return 28;
    if (severity === "medium")
        return 14;
    return 7;
}
function collectDistilledFacts(ledger) {
    const facts = [];
    for (const type of ["user", "project", "feedback", "reference"]) {
        for (const fact of Object.values(ledger?.facts?.[type] || {}))
            facts.push({ ...fact, category: type });
    }
    return facts;
}
function extractTaskStateSignal(fact) {
    const text = String(fact?.text || "");
    const taskId = String(fact?.taskId || (text.match(/\[([^\]]+)\]/)?.[1]) || "").trim();
    if (!taskId)
        return null;
    const state = /(失败|阻塞|未完成|超时|异常|failed|blocked|timeout|needs_info|need info)/i.test(text)
        ? "blocked"
        : /(完成|修复|通过|done|success|completed|passed|fixed)/i.test(text)
            ? "done"
            : "";
    if (!state)
        return null;
    return { taskId, state, sourceIndex: Number(fact?.sourceIndex || 0), messageId: fact?.messageId || "", text: compactText(text, 220) };
}
function evaluateGroupTypedMemoryDistillationQuality(groupId, options = {}) {
    const evaluatedAt = now();
    const projectRoot = path.resolve(String(options.projectRoot || options.project_root || process.cwd()));
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const facts = collectDistilledFacts(ledger);
    const checks = [];
    const factsByType = new Map();
    for (const fact of facts) {
        const type = normalizeMemoryType(fact.category || fact.type);
        factsByType.set(type, [...(factsByType.get(type) || []), fact]);
    }
    const expectedTypes = [...factsByType.keys()].filter(type => (factsByType.get(type) || []).length > 0);
    const docsByType = new Map();
    for (const doc of docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation")) {
        docsByType.set(doc.type, [...(docsByType.get(doc.type) || []), doc]);
    }
    const missingTypeDocs = expectedTypes.filter(type => !(docsByType.get(type) || []).length);
    addDistillationQualityCheck(checks, {
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
        .map(fact => `#${fact.messageId} ${compactText(fact.text, 120)}`)
        .slice(0, 20);
    addDistillationQualityCheck(checks, {
        id: "source_message_links_preserved",
        label: "蒸馏事实保留 source message id",
        pass: missingSourceLinks.length === 0,
        severity: "fatal",
        detail: missingSourceLinks.length ? "部分事实无法从 Markdown 中回溯到 source message id。" : "蒸馏 Markdown 保留了 source message id。",
        gaps: missingSourceLinks,
    });
    const pathClaims = uniqueStrings(facts.flatMap(fact => extractPathClaims(fact.text)), 120);
    const stalePaths = pathClaims
        .map(claim => ({ claim, resolved: resolveClaimPath(projectRoot, claim) }))
        .filter(item => item.resolved && !fs.existsSync(item.resolved))
        .map(item => `${item.claim} -> ${item.resolved}`)
        .slice(0, 30);
    addDistillationQualityCheck(checks, {
        id: "file_path_claims_checked",
        label: "文件路径声明已按当前仓库核验",
        pass: stalePaths.length === 0,
        severity: "medium",
        detail: stalePaths.length ? "部分记忆里的文件路径在当前仓库不存在，使用前必须重新核验。" : "未发现当前仓库不存在的文件路径声明。",
        evidence: pathClaims.slice(0, 30),
        gaps: stalePaths,
    });
    const taskSignals = facts.map(extractTaskStateSignal).filter(Boolean);
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
    addDistillationQualityCheck(checks, {
        id: "no_unresolved_status_contradictions",
        label: "完成/阻塞状态没有未解决矛盾",
        pass: unresolvedContradictions.length === 0,
        severity: "high",
        detail: unresolvedContradictions.length ? "发现同一任务先完成后又阻塞，需按最新阻塞处理。" : "未发现未解决的完成/阻塞矛盾。",
        gaps: unresolvedContradictions.slice(0, 12),
    });
    const hasUsefulFacts = facts.length > 0 && (expectedTypes.includes("user") || expectedTypes.includes("project") || expectedTypes.includes("feedback") || expectedTypes.includes("reference"));
    addDistillationQualityCheck(checks, {
        id: "distilled_signal_not_empty",
        label: "蒸馏结果不是空洞记忆",
        pass: hasUsefulFacts || Number(ledger.sourceMessageCount || 0) === 0,
        severity: "medium",
        detail: hasUsefulFacts ? "蒸馏 ledger 中有可召回事实。" : "存在消息来源但没有可召回蒸馏事实。",
    });
    const failedChecks = checks.filter(check => !check.pass);
    const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + distillationQualityPenalty(check.severity), 0)));
    const status = failedChecks.some(check => check.severity === "fatal") || score < 60
        ? "failed"
        : failedChecks.some(check => check.severity === "high") || score < 80
            ? "degraded"
            : "pass";
    return {
        schema: "ccm-group-typed-memory-distillation-quality-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
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
function distillGroupMessagesToTypedMemory(groupId, messages = [], memory = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return { schema: "ccm-group-typed-memory-distillation-v1", version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION, groupId, skipped: true, reason: "disabled" };
    }
    const updatedAt = now();
    const maxMessages = Math.max(1, Math.min(5000, Number(options.maxMessages || options.max_messages || exports.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES)));
    const sourceMessages = (messages || []).filter(message => !String(message?.content || "").startsWith("📤")).slice(-maxMessages);
    const candidates = extractGroupLogDistillationCandidates(sourceMessages);
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const facts = { ...(ledger.facts || {}) };
    let newFactCount = 0;
    let updatedFactCount = 0;
    for (const candidate of candidates) {
        const type = normalizeMemoryType(candidate.category);
        const bucket = facts[type] || {};
        const previous = bucket[candidate.checksum];
        bucket[candidate.checksum] = {
            ...candidate,
            firstSeenAt: previous?.firstSeenAt || updatedAt,
            lastSeenAt: updatedAt,
            count: Number(previous?.count || 0) + 1,
        };
        facts[type] = bucket;
        if (previous)
            updatedFactCount += 1;
        else
            newFactCount += 1;
    }
    const prunedFacts = pruneDistilledFacts(facts, Number(options.perTypeLimit || options.per_type_limit || exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT));
    const lastMessage = sourceMessages[sourceMessages.length - 1];
    const lastMessageId = lastMessage ? messageIdentity(lastMessage, (messages || []).length - 1) : "";
    const postCompactUsageArchive = buildPostCompactCandidateUsageArchive(options, { updatedAt });
    writeJsonAtomic(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: compactText(options.reason || "", 220),
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        newFactCount,
        updatedFactCount,
        lastDistilledMessageId: lastMessageId,
        lastDistilledAt: updatedAt,
        facts: prunedFacts,
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
            updatedAt,
        },
        ...preservedGroupTypedMemoryDistillationArchives(ledger),
        updatedAt,
    });
    const writes = [];
    const docSpecs = [
        {
            type: "user",
            slug: "distilled-log-user-requirements",
            name: "Distilled group-log user requirements",
            description: "Long-term user constraints and goals distilled from the group transcript.",
            title: "Distilled Group-Log User Requirements",
        },
        {
            type: "project",
            slug: "distilled-log-project-context",
            name: "Distilled group-log project context",
            description: "Long-term decisions, assignments, and completion facts distilled from the group transcript.",
            title: "Distilled Group-Log Project Context",
        },
        {
            type: "feedback",
            slug: "distilled-log-feedback-failures",
            name: "Distilled group-log feedback and failures",
            description: "Failures, blockers, and corrections distilled from the group transcript.",
            title: "Distilled Group-Log Feedback And Failures",
        },
        {
            type: "reference",
            slug: "distilled-log-reference-artifacts",
            name: "Distilled group-log reference artifacts",
            description: "Files, skills, verification commands, and artifact pointers distilled from the group transcript.",
            title: "Distilled Group-Log Reference Artifacts",
        },
    ];
    for (const spec of docSpecs) {
        const bucket = Object.values(prunedFacts[spec.type] || {}).sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0));
        if (!bucket.length)
            continue;
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: spec.type,
            slug: spec.slug,
            name: spec.name,
            description: spec.description,
            source: "auto:group-log-distillation",
            updatedAt,
            body: renderDistilledMemoryBody(spec.title, bucket, { updatedAt }),
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    if (postCompactUsageArchive.archived_count > 0) {
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "post-compact-candidate-usage-archive",
            name: "Post-compact candidate usage archive",
            description: "Low-priority recovered-memory candidates that were ignored or lacked explicit used/ignored/verified receipts.",
            source: "auto:post-compact-usage-distillation",
            updatedAt,
            body: postCompactUsageArchive.body,
            maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
        }));
    }
    const index = buildGroupTypedMemoryIndex(groupId);
    const quality = evaluateGroupTypedMemoryDistillationQuality(groupId, {
        projectRoot: options.projectRoot || options.project_root,
    });
    const persistedLedger = readGroupTypedMemoryDistillationLedger(groupId);
    writeJsonAtomic(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: compactText(options.reason || "", 220),
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        newFactCount,
        updatedFactCount,
        lastDistilledMessageId: lastMessageId,
        lastDistilledAt: updatedAt,
        facts: persistedLedger.facts || prunedFacts,
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
            updatedAt,
        },
        ...preservedGroupTypedMemoryDistillationArchives(persistedLedger, ledger),
        quality,
        updatedAt,
    });
    return {
        schema: "ccm-group-typed-memory-distillation-v1",
        version: exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: compactText(options.reason || "", 220),
        ledgerFile: ledger.file,
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        newFactCount,
        updatedFactCount,
        writeCount: writes.length,
        writes,
        index,
        quality,
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
        },
        lastDistilledMessageId: lastMessageId,
        distilledAt: updatedAt,
    };
}
function syncGroupTypedMemoryFromGroupMemory(groupId, memory = {}) {
    const updatedAt = now();
    const goal = memory?.goal || memory?.summary || "";
    const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
    const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
    const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
    const blocked = Array.isArray(memory?.blocked) ? memory.blocked : [];
    const workerLedger = Array.isArray(memory?.workerLedger) ? memory.workerLedger : [];
    const reinject = memory?.compaction?.postCompactReinject || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan || {};
    const writes = [];
    const userBody = [
        "# User Requirements",
        goal ? `## Current Goal\n${compactText(goal, 1200)}` : "",
        listLines("Persistent Requirements", requirements, (item) => `#${item.messageId || item.id || ""} ${item.text || item}`, 24),
    ].filter(Boolean).join("\n\n");
    if (goal || requirements.length)
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "user",
            slug: "user-requirements",
            name: "User requirements and acceptance constraints",
            description: "Hard user constraints, acceptance requirements, and the active group goal.",
            source: "auto:group-memory-json",
            updatedAt,
            body: userBody,
        }));
    const projectBody = [
        "# Project Collaboration Context",
        goal ? `## Goal\n${compactText(goal, 1200)}` : "",
        listLines("Decisions", decisions, (item) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 16),
        listLines("Next Actions", memory?.nextActions || [], (item) => item.action || item, 10),
        memory?.messageDigest ? `## Conversation Summary\n${compactText(memory.messageDigest, 3000)}` : "",
    ].filter(Boolean).join("\n\n");
    if (projectBody.trim())
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "project-context",
            name: "Project collaboration context",
            description: "Group goal, decisions, next actions, and compacted conversation state.",
            source: "auto:group-memory-json",
            updatedAt,
            body: projectBody,
        }));
    const feedbackBody = [
        "# Feedback And Failure Memory",
        listLines("Blocked Or Failed Work", blocked, (item) => `${item.project || item.agent || "agent"}: ${item.reason || item.summary || item.text || ""}`, 16),
        listLines("Worker Ledger Warnings", workerLedger.filter((item) => !/done|success|completed/i.test(String(item.status || item.receiptStatus || ""))), (item) => `${item.project || item.agent || "agent"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 16),
    ].filter(Boolean).join("\n\n");
    if (blocked.length || feedbackBody.includes("- "))
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "feedback-failures",
            name: "Feedback and failure memory",
            description: "Corrections, blockers, failed receipts, and patterns the agents should not repeat.",
            source: "auto:group-memory-json",
            updatedAt,
            body: feedbackBody,
        }));
    const referenceBody = [
        "# Reference Artifacts",
        listLines("Fact Anchors", facts, (item) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
        listLines("Files To Reinject", reinject.files || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
        listLines("Skills Or Tools To Reinject", reinject.skills || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
        listLines("Verification To Reinject", reinject.verification || [], (item) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    ].filter(Boolean).join("\n\n");
    if (facts.length || reinject?.hasCandidates)
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "reference-artifacts",
            name: "Reference artifacts and restored context",
            description: "Facts, files, skills, verification, and artifact pointers useful for future recall.",
            source: "auto:group-memory-json",
            updatedAt,
            body: referenceBody,
        }));
    const index = buildGroupTypedMemoryIndex(groupId);
    return { schema: "ccm-group-typed-memory-sync-v1", version: exports.GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}
function shouldIgnoreGroupMemoryRequest(query, options = {}) {
    if (options.forceMemory === true || options.force_memory === true || options.disableIgnoreMemoryDetection === true || options.disable_ignore_memory_detection === true)
        return false;
    if (options.ignoreMemory === true || options.ignore_memory === true)
        return true;
    const text = String(query || "")
        .replace(/\bmemoryIgnored\b|\bmemory_ignored\b|\bmemoryUsed\b|\bmemory_used\b|\bmemoryUsed\s*\/\s*memoryIgnored\b|\bmemoryProvenanceUsage\b/gi, "receipt_field");
    return /(忽略|不要|不使用|别用|\bignore\b|\bignored\b|do not use|don't use)[^\n]{0,20}(记忆|\bmemory\b)/i.test(text)
        || /(记忆|\bmemory\b)[^\n]{0,20}(忽略|不要|不使用|\bignore\b|\bignored\b)/i.test(text);
}
function normalizeRecallScope(value) {
    return safeSegment(value || "global", "global");
}
function readGroupTypedMemoryRecallLedger(groupId) {
    const file = getGroupTypedMemoryRecallLedgerFile(groupId);
    const state = readJson(file, { schema: "ccm-group-typed-memory-recall-ledger-v1", version: 1, scopes: {}, updatedAt: "" });
    return { ...state, scopes: state?.scopes && typeof state.scopes === "object" ? state.scopes : {}, file };
}
function getAlreadySurfacedGroupTypedMemory(groupId, scope = "global", options = {}) {
    if (options.disableLedger === true || options.disable_ledger === true)
        return [];
    const ledger = readGroupTypedMemoryRecallLedger(groupId);
    const scoped = ledger.scopes?.[normalizeRecallScope(scope)] || {};
    return Object.keys(scoped.docs || {}).slice(-Number(options.limit || 120));
}
function recordGroupTypedMemoryRecall(groupId, scope, recall, query = "", options = {}) {
    if (options.disableLedger === true || options.disable_ledger === true || recall?.ignored)
        return readGroupTypedMemoryRecallLedger(groupId);
    const surfaced = Array.isArray(recall?.surfaced) ? recall.surfaced.filter(Boolean) : [];
    if (!surfaced.length)
        return readGroupTypedMemoryRecallLedger(groupId);
    const ledger = readGroupTypedMemoryRecallLedger(groupId);
    const key = normalizeRecallScope(scope);
    const scoped = ledger.scopes[key] || { docs: {}, updatedAt: "" };
    const at = now();
    for (const relPath of surfaced) {
        const docKey = String(relPath || "");
        const prev = scoped.docs?.[docKey] || {};
        scoped.docs = scoped.docs || {};
        scoped.docs[docKey] = {
            relPath: docKey,
            firstAt: prev.firstAt || at,
            lastAt: at,
            count: Number(prev.count || 0) + 1,
            lastQueryHash: checksum(String(query || ""), 16),
        };
    }
    const entries = Object.entries(scoped.docs || {}).sort((a, b) => String(a[1].lastAt || "").localeCompare(String(b[1].lastAt || ""))).slice(-200);
    scoped.docs = Object.fromEntries(entries);
    scoped.updatedAt = at;
    ledger.scopes[key] = scoped;
    ledger.updatedAt = at;
    writeJsonAtomic(ledger.file, {
        schema: "ccm-group-typed-memory-recall-ledger-v1",
        version: 1,
        scopes: ledger.scopes,
        updatedAt: at,
    });
    return readGroupTypedMemoryRecallLedger(groupId);
}
function buildGroupTypedMemoryRecall(groupId, query, options = {}) {
    const text = String(query || "");
    const index = buildGroupTypedMemoryIndex(groupId);
    if (shouldIgnoreGroupMemoryRequest(text, options)) {
        return {
            schema: "ccm-group-typed-memory-recall-v1",
            ignored: true,
            reason: "user_requested_ignore_memory",
            indexFile: index.file,
            memoryDir: index.dir,
            recalled: [],
            surfaced: [],
        };
    }
    const queryTokens = tokens(text);
    const targetPaths = deriveGroupTypedMemoryTargetPaths(text, options.targetPaths || options.target_paths || []);
    const already = new Set((options.alreadySurfaced || options.already_surfaced || []).map((item) => String(item || "").toLowerCase()));
    const requiredRelPaths = new Set((options.requiredRelPaths || options.required_rel_paths || [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean));
    const recentTools = new Set((options.recentTools || options.recent_tools || []).map((item) => String(item || "").toLowerCase()).filter(Boolean));
    const postCompactUsageHints = normalizePostCompactCandidateUsageHints(options);
    const workerContextPressureSignals = normalizeWorkerContextPressureRecallSignals(options);
    const workerContextPressureUsageHints = normalizeWorkerContextPressureRecallUsageHints(groupId, options);
    const pressureProvenanceDispatchFeedbackPolicy = normalizePressureProvenanceDispatchFeedbackPolicyForRecall(options);
    const diagnostics = [];
    const scored = index.docs.map(doc => {
        const requiredRecall = requiredRelPaths.has(String(doc.relPath || "").toLowerCase());
        if (!requiredRecall && (already.has(doc.relPath.toLowerCase()) || already.has(doc.file.toLowerCase()))) {
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "already_surfaced" });
            return null;
        }
        const pathCondition = evaluateTypedMemoryPathCondition(doc, targetPaths);
        if (pathCondition.conditional && !pathCondition.matched) {
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "path_condition_miss", globs: pathCondition.globs, targetPaths });
            return null;
        }
        const corpus = `${doc.name}\n${doc.description}\n${doc.body}`.toLowerCase();
        let score = 0;
        for (const token of queryTokens)
            if (corpus.includes(token))
                score += token.length >= 5 ? 3 : 1;
        if (doc.type === "user")
            score += 4;
        if (doc.type === "feedback")
            score += 3;
        if (doc.type === "project")
            score += 2;
        if (doc.type === "reference")
            score += 1;
        const source = String(doc.source || "").toLowerCase();
        if (source.includes("global-claude-memory:"))
            score += 5;
        if (source.includes("global-claude-memory:managed:"))
            score += 2;
        if (pathCondition.conditional && pathCondition.matched)
            score += 8;
        if (requiredRecall)
            score += 100;
        for (const tool of recentTools) {
            if (!tool || !corpus.includes(tool))
                continue;
            if (/(警告|陷阱|风险|失败|阻塞|不要|禁止|warning|pitfall|risk|failed|blocked|do not|never)/i.test(corpus))
                score += 2;
            else
                score -= 4;
        }
        const postCompactUsage = scorePostCompactCandidateUsageHint(corpus, postCompactUsageHints);
        if (postCompactUsage.adjustment)
            score += postCompactUsage.adjustment;
        const workerContextPressureRecall = scoreWorkerContextPressureRecall(corpus, doc, workerContextPressureSignals, text, queryTokens);
        if (workerContextPressureRecall.adjustment)
            score += workerContextPressureRecall.adjustment;
        const workerContextPressureUsage = scoreWorkerContextPressureRecallUsageHint(doc, workerContextPressureUsageHints, workerContextPressureSignals);
        if (workerContextPressureUsage.adjustment)
            score += workerContextPressureUsage.adjustment;
        const workerContextPressureFeedbackPolicy = scoreWorkerContextPressureFeedbackPolicyRecallRisk(doc, corpus, workerContextPressureUsage, pressureProvenanceDispatchFeedbackPolicy, text, queryTokens);
        if (workerContextPressureFeedbackPolicy.adjustment)
            score += workerContextPressureFeedbackPolicy.adjustment;
        if (!requiredRecall && score <= 0 && queryTokens.length && !(pathCondition.conditional && pathCondition.matched)) {
            const reason = workerContextPressureFeedbackPolicy.active === true
                && workerContextPressureFeedbackPolicy.risk_doc === true
                && Number(workerContextPressureFeedbackPolicy.adjustment || 0) < 0
                ? "pressure_feedback_policy_risk_gated"
                : "low_score";
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason, score, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy });
            return null;
        }
        diagnostics.push({ relPath: doc.relPath, skipped: false, score, pathCondition, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy });
        return {
            ...doc,
            pathCondition,
            score,
            postCompactUsage,
            workerContextPressureRecall,
            workerContextPressureUsage,
            workerContextPressureFeedbackPolicy,
            requiredRecall,
            snippet: extractSnippet(doc.body, queryTokens, Number(options.snippetChars || options.snippet_chars || 800)),
        };
    }).filter(Boolean).sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);
    const recalled = scored.slice(0, Math.max(1, Number(options.max || options.limit || exports.GROUP_TYPED_MEMORY_MAX_RECALL)));
    return {
        schema: "ccm-group-typed-memory-recall-v1",
        ignored: false,
        reason: "",
        indexFile: index.file,
        memoryDir: index.dir,
        recalled,
        surfaced: recalled.map((item) => item.relPath),
        candidateCount: index.docs.length,
        targetPaths,
        conditionalMatched: diagnostics.filter((item) => item.pathCondition?.conditional && item.pathCondition?.matched).length,
        conditionalSkipped: diagnostics.filter((item) => item.reason === "path_condition_miss").length,
        postCompactUsageScoring: {
            schema: "ccm-group-typed-memory-post-compact-usage-scoring-v1",
            hint_count: postCompactUsageHints.length,
            matched_count: diagnostics.filter((item) => Array.isArray(item.postCompactUsage?.matched) && item.postCompactUsage.matched.length).length,
            boosted_count: diagnostics.filter((item) => Number(item.postCompactUsage?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.postCompactUsage?.adjustment || 0) < 0).length,
        },
        workerContextPressureScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-scoring-v1",
            active: workerContextPressureSignals.active === true,
            signal_count: workerContextPressureSignals.signal_count || 0,
            active_signal_count: workerContextPressureSignals.active_signal_count || 0,
            suppressed_signal_count: workerContextPressureSignals.suppressed_signal_count || 0,
            pressure_status: workerContextPressureSignals.pressure_status || "",
            max_pressure: workerContextPressureSignals.max_pressure || 0,
            min_free_tokens: workerContextPressureSignals.min_free_tokens || 0,
            ptl_emergency: workerContextPressureSignals.ptl_emergency === true,
            repeated_compact_failure: workerContextPressureSignals.repeated_compact_failure === true,
            pressure_doc_count: diagnostics.filter((item) => item.workerContextPressureRecall?.pressure_doc).length,
            boosted_count: diagnostics.filter((item) => Number(item.workerContextPressureRecall?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureRecall?.adjustment || 0) < 0).length,
            signals: workerContextPressureSignals.signals || [],
        },
        workerContextPressureUsageScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-usage-scoring-v1",
            hint_count: workerContextPressureUsageHints.length,
            stale_hint_count: workerContextPressureUsageHints.filter((item) => item.recommendation === "stale_pressure_recall_history").length,
            cross_group_hint_count: workerContextPressureUsageHints.filter((item) => item.hint_scope === "cross_group_project").length,
            matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.length).length,
            stale_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.recommendation === "stale_pressure_recall_history")).length,
            cross_group_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.hint_scope === "cross_group_project")).length,
            repair_hint_count: workerContextPressureUsageHints.filter((item) => item.repair_open === true).length,
            repair_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.repair_open === true)).length,
            disputed_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.provenance_status === "disputed_under_repair")).length,
            boosted_count: diagnostics.filter((item) => Number(item.workerContextPressureUsage?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureUsage?.adjustment || 0) < 0).length,
        },
        workerContextPressureFeedbackPolicyScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-provenance-feedback-recall-risk-scoring-v1",
            active: pressureProvenanceDispatchFeedbackPolicy.active === true,
            disabled: pressureProvenanceDispatchFeedbackPolicy.disabled === true,
            agent_type: pressureProvenanceDispatchFeedbackPolicy.agentType || pressureProvenanceDispatchFeedbackPolicy.agent_type || "unknown",
            target_project: pressureProvenanceDispatchFeedbackPolicy.targetProject || pressureProvenanceDispatchFeedbackPolicy.target_project || "",
            action: pressureProvenanceDispatchFeedbackPolicy.action || "",
            severity: pressureProvenanceDispatchFeedbackPolicy.severity || "",
            policy_row_count: Array.isArray(pressureProvenanceDispatchFeedbackPolicy.policyRows) ? pressureProvenanceDispatchFeedbackPolicy.policyRows.length : 0,
            risk_doc_count: diagnostics.filter((item) => item.workerContextPressureFeedbackPolicy?.risk_doc === true).length,
            repair_first_count: diagnostics.filter((item) => item.workerContextPressureFeedbackPolicy?.repair_first === true).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureFeedbackPolicy?.adjustment || 0) < 0).length,
            risk_gated_count: diagnostics.filter((item) => item.reason === "pressure_feedback_policy_risk_gated").length,
        },
        diagnostics: diagnostics.slice(-40),
    };
}
function renderGroupTypedMemoryRecall(recall) {
    if (!recall)
        return "";
    if (recall.ignored)
        return "类型化长期记忆：用户要求本轮忽略记忆，按空 MEMORY.md 处理。";
    const docs = Array.isArray(recall.recalled) ? recall.recalled : [];
    if (!docs.length)
        return "";
    const feedbackScoring = recall.workerContextPressureFeedbackPolicyScoring || recall.worker_context_pressure_feedback_policy_scoring || {};
    const feedbackHint = feedbackScoring.active
        ? `；pressure feedback policy gating risk ${feedbackScoring.risk_doc_count || 0}/gated ${feedbackScoring.risk_gated_count || 0}/repair-first ${feedbackScoring.repair_first_count || 0}`
        : "";
    const lines = [
        `类型化长期记忆（MEMORY.md 索引召回，路径条件匹配 ${recall.conditionalMatched || 0}、跳过 ${recall.conditionalSkipped || 0}${recall.workerContextPressureScoring?.active ? `；上下文压力召回 ${recall.workerContextPressureScoring.boosted_count || 0}` : ""}${feedbackHint}；使用前如涉及文件/函数/flag 必须再核验当前仓库）：`,
    ];
    for (const doc of docs) {
        const pathHint = doc.pathCondition?.conditional ? `；paths ${doc.pathCondition.matchedPaths?.join(",") || "matched"}` : "";
        const usageHint = Array.isArray(doc.postCompactUsage?.matched) && doc.postCompactUsage.matched.length
            ? `；post-compact usage ${doc.postCompactUsage.adjustment > 0 ? "+" : ""}${doc.postCompactUsage.adjustment}`
            : "";
        const pressureHint = Array.isArray(doc.workerContextPressureRecall?.matched) && doc.workerContextPressureRecall.matched.length && Number(doc.workerContextPressureRecall.adjustment || 0) > 0
            ? `；pressure recall +${doc.workerContextPressureRecall.adjustment}`
            : "";
        const pressureUsageHint = Array.isArray(doc.workerContextPressureUsage?.matched) && doc.workerContextPressureUsage.matched.length
            ? `；pressure usage ${doc.workerContextPressureUsage.adjustment > 0 ? "+" : ""}${doc.workerContextPressureUsage.adjustment}`
            : "";
        const pressureRepair = Array.isArray(doc.workerContextPressureUsage?.matched)
            ? doc.workerContextPressureUsage.matched.find((match) => match.repair_open === true)
            : null;
        const pressureRepairHint = pressureRepair
            ? `；pressure repair ${pressureRepair.repair_gap_type || "gap"}:${pressureRepair.repair_status || "pending"}`
            : "";
        const feedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
        const feedbackPolicyHint = feedbackPolicy.active && feedbackPolicy.risk_doc
            ? `；pressure feedback policy ${feedbackPolicy.repair_first ? "repair-first" : `${feedbackPolicy.adjustment > 0 ? "+" : ""}${feedbackPolicy.adjustment}`}`
            : "";
        const crossGroupProvenance = !pressureRepair && Array.isArray(doc.workerContextPressureUsage?.matched)
            ? doc.workerContextPressureUsage.matched.find((match) => match.provenance_status === "cross_group_project_assist")
            : null;
        const provenanceHint = crossGroupProvenance ? "；provenance cross_group_project_assist" : "";
        lines.push(`- [${doc.type}] ${doc.name}（score ${doc.score}，${doc.relPath}${pathHint}${usageHint}${pressureHint}${pressureUsageHint}${pressureRepairHint}${feedbackPolicyHint}${provenanceHint}）：${doc.description || ""}`);
        if (doc.snippet)
            lines.push(`  ${compactText(doc.snippet, 700).replace(/\n/g, "\n  ")}`);
    }
    return lines.join("\n");
}
function runGroupTypedMemoryIndexSelfTest() {
    const groupId = `typed-memory-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        const sync = syncGroupTypedMemoryFromGroupMemory(groupId, {
            goal: "实现支付回调，必须保留 IDEMPOTENCY_TYPED_SENTINEL",
            persistentRequirements: [{ messageId: "u1", text: "必须保留 IDEMPOTENCY_TYPED_SENTINEL，不能跳过验签。" }],
            decisions: [{ decision: "使用 webhook idempotency key", reason: "避免重复入账" }],
            blocked: [{ project: "api", reason: "验签测试失败" }],
            factAnchors: [{ id: "f1", type: "user_requirement", messageId: "u1", text: "支付回调依赖 src/pay.ts" }],
            compaction: { postCompactReinject: { hasCandidates: true, files: [{ value: "src/pay.ts", sourceMessageId: "a1" }], verification: [{ value: "npm run check", sourceMessageId: "a2" }] } },
            messageDigest: "群聊会话压缩摘要：支付回调仍在进行。",
        });
        const recall = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", {});
        const ledgerBefore = getAlreadySurfacedGroupTypedMemory(groupId, "api");
        recordGroupTypedMemoryRecall(groupId, "api", recall, "支付回调 IDEMPOTENCY_TYPED_SENTINEL");
        const ledgerAfter = getAlreadySurfacedGroupTypedMemory(groupId, "api");
        const deduped = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", { alreadySurfaced: ledgerAfter });
        const ignored = buildGroupTypedMemoryRecall(groupId, "本轮请忽略记忆，只看当前任务", {});
        const rendered = renderGroupTypedMemoryRecall(recall);
        const checks = {
            indexCreated: fs.existsSync(sync.index.file) && fs.readFileSync(sync.index.file, "utf-8").includes("MEMORY.md"),
            fourTypeDocsCreated: sync.index.docs.some((item) => item.type === "user")
                && sync.index.docs.some((item) => item.type === "project")
                && sync.index.docs.some((item) => item.type === "feedback")
                && sync.index.docs.some((item) => item.type === "reference"),
            recallFindsSentinel: recall.recalled.some((item) => `${item.name}\n${item.snippet}`.includes("IDEMPOTENCY_TYPED_SENTINEL")),
            recallFindsFile: JSON.stringify(recall.recalled).includes("src/pay.ts"),
            recallLedgerStartsEmpty: ledgerBefore.length === 0,
            recallLedgerRecordsSurfaced: ledgerAfter.length >= recall.surfaced.length && ledgerAfter.length > 0,
            alreadySurfacedDedupesRecall: deduped.recalled.length < recall.recalled.length,
            ignoreMemoryHonored: ignored.ignored === true && ignored.recalled.length === 0,
            renderedMentionsVerification: rendered.includes("类型化长期记忆") && rendered.includes("npm run check"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, indexFile: sync.index.file, recalled: recall.recalled.map((item) => item.relPath) };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactUsageScoringSelfTest() {
    const groupId = `typed-memory-post-compact-usage-scoring-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "post-compact-useful-candidate",
            name: "Recovered useful candidate",
            description: "恢复候选任务中多次被 used / verified 的文件。",
            source: "selftest:post-compact-usage",
            body: "RECOVERED_USEFUL_SENTINEL：src/recovered.ts 是压缩后恢复候选，历史回执 used/verified 后应提高 MEMORY.md 召回优先级。",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "post-compact-ignored-candidate",
            name: "Recovered ignored candidate",
            description: "恢复候选任务中多次被 ignored 的旧文件。",
            source: "selftest:post-compact-usage",
            body: "RECOVERED_IGNORED_SENTINEL：src/ignored.ts 是历史多次 ignored 的压缩恢复候选，除非当前任务强相关，否则应被降权。",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "post-compact-neutral-candidate",
            name: "Neutral project memory",
            description: "普通恢复候选任务背景。",
            source: "selftest:post-compact-usage",
            body: "RECOVERED_NEUTRAL_SENTINEL：普通项目背景，不带候选使用账本信号。",
        });
        const recall = buildGroupTypedMemoryRecall(groupId, "继续恢复候选任务", {
            max: 5,
            postCompactCandidateUsage: {
                useful_candidates: [{
                        candidate_id: "pcrc_useful",
                        value: "src/recovered.ts",
                        recommendation: "promote_recall",
                        used_count: 2,
                        verified_count: 1,
                    }],
                ignored_candidates: [{
                        candidate_id: "pcrc_ignored",
                        value: "src/ignored.ts",
                        recommendation: "deprioritize_or_distill",
                        ignored_count: 3,
                    }],
            },
        });
        const rendered = renderGroupTypedMemoryRecall(recall);
        const useful = recall.recalled.find((item) => item.relPath.includes("post-compact-useful-candidate"));
        const ignored = recall.recalled.find((item) => item.relPath.includes("post-compact-ignored-candidate"));
        const checks = {
            usefulCandidateRecalled: !!useful
                && String(JSON.stringify(useful)).includes("RECOVERED_USEFUL_SENTINEL"),
            usefulCandidateBoosted: Number(useful?.postCompactUsage?.adjustment || 0) > 0
                && useful.postCompactUsage.matched?.some((item) => item.recommendation === "promote_recall"),
            ignoredCandidateDeprioritized: !ignored
                && recall.diagnostics?.some((item) => item.relPath.includes("post-compact-ignored-candidate")
                    && Number(item.postCompactUsage?.adjustment || 0) < 0),
            recallSummaryCountsUsageScoring: recall.postCompactUsageScoring?.hint_count === 2
                && recall.postCompactUsageScoring?.boosted_count >= 1
                && recall.postCompactUsageScoring?.deprioritized_count >= 1,
            renderedShowsUsageAdjustment: rendered.includes("post-compact usage +")
                && rendered.includes("RECOVERED_USEFUL_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            scoring: recall.postCompactUsageScoring,
            recalled: recall.recalled.map((item) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryWorkerContextPressureRecallSelfTest() {
    const groupId = `typed-memory-worker-context-pressure-recall-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-usage-pressure-discipline",
            name: "WorkerContextPacket context usage pressure discipline",
            description: "Recall only when WorkerContextPacket context pressure is active.",
            source: "auto:context-usage-repair-distillation",
            body: [
                "PRESSURE_CONTEXT_USAGE_SENTINEL",
                "When context_usage.status is compact_recommended, critical, or over_budget, keep Context usage budget visible.",
                "Target free_tokens>=autocompact_buffer_tokens before child-Agent dispatch.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "worker-context-compact-strategy-memory",
            name: "WorkerContextPacket compact strategy memory",
            description: "Recall compact strategy only under pressure.",
            source: "auto:compact-strategy-memory-distillation",
            body: [
                "PRESSURE_COMPACT_STRATEGY_SENTINEL",
                "Prefer metadata_partial_compact categories with positive free_token_delta and task_hash_unchanged=true.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-ptl-emergency-downgrade",
            name: "WorkerContextPacket PTL emergency downgrade discipline",
            description: "Recall PTL emergency budgets only for repeated compact failure.",
            source: "auto:ptl-emergency-downgrade-distillation",
            body: [
                "PRESSURE_PTL_EMERGENCY_SENTINEL",
                "PTL emergency downgrade uses maxTaskChars and maxRenderedChars when repeated compact failure blocks dispatch.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "worker-context-old-ignore-memory",
            name: "WorkerContextPacket stale pressure recall memory",
            description: "Old ignored pressure recall feedback should decay before future scoring.",
            source: "selftest",
            body: [
                "PRESSURE_STALE_USAGE_SENTINEL",
                "worker-context-compact-strategy stale pressure recall feedback should not permanently suppress future typed memory recall.",
                "metadata_partial_compact guidance can become stale when child Agent receipts stop referencing it.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "normal-payment-memory",
            name: "Normal payment memory",
            description: "Ordinary task memory should win when no WorkerContextPacket pressure exists.",
            source: "selftest",
            body: "NORMAL_PRESSURE_RECALL_SENTINEL：普通支付回调任务背景，不需要上下文预算修复。",
        });
        const query = "继续 NORMAL_PRESSURE_RECALL_SENTINEL 普通支付回调";
        const noPressure = buildGroupTypedMemoryRecall(groupId, query, { max: 6 });
        const pressure = buildGroupTypedMemoryRecall(groupId, query, {
            max: 6,
            workerContextPacketContextUsage: {
                schema: "ccm-worker-context-usage-v1",
                status: "over_budget",
                pressure: 104,
                total_tokens: 93_800,
                max_tokens: 90_000,
                free_tokens: -16_800,
                autocompact_buffer_tokens: 13_000,
                top_categories: [{ id: "typed_memory_recall", tokens: 18_000 }],
            },
        });
        const ptl = buildGroupTypedMemoryRecall(groupId, query, {
            max: 6,
            ptlEmergency: {
                engaged: true,
                emergency_level: "critical",
                blocked_outcome_count: 3,
                task_compacted_blocked_count: 1,
                reason: "WorkerContextPacket repeated compact failure requires PTL emergency downgrade.",
            },
        });
        const usageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject: "api",
            taskId: "pressure-recall-usage-task",
            executionId: "pressure-recall-usage-exec",
            rows: [
                { target_project: "api", agent: "api", rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "used", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-1" },
                { target_project: "api", agent: "api", rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "verified", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-2" },
                { target_project: "api", agent: "api", rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-3" },
                { target_project: "api", agent: "api", rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-usage-4" },
            ],
            generatedAt: "2026-07-09T00:00:00.000Z",
        });
        const usageSummary = buildGroupTypedMemoryPressureRecallUsageSummary(groupId, { targetProject: "api" });
        const staleUsageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject: "api",
            taskId: "pressure-recall-stale-usage-task",
            executionId: "pressure-recall-stale-usage-exec",
            rows: [
                { target_project: "api", agent: "api", rel_path: "worker-context-old-ignore-memory.md", name: "WorkerContextPacket stale pressure recall memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-stale-1" },
                { target_project: "api", agent: "api", rel_path: "worker-context-old-ignore-memory.md", name: "WorkerContextPacket stale pressure recall memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-stale-2" },
            ],
            generatedAt: "2026-03-01T00:00:00.000Z",
        });
        const staleUsageSummary = buildGroupTypedMemoryPressureRecallUsageSummary(groupId, {
            targetProject: "api",
            nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
        });
        const pressureAfterUsage = buildGroupTypedMemoryRecall(groupId, query, {
            max: 6,
            targetProject: "api",
            nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
            workerContextPacketContextUsage: {
                schema: "ccm-worker-context-usage-v1",
                status: "over_budget",
                pressure: 104,
                total_tokens: 93_800,
                max_tokens: 90_000,
                free_tokens: -16_800,
                autocompact_buffer_tokens: 13_000,
            },
        });
        const pressureAfterStaleUsage = buildGroupTypedMemoryRecall(groupId, "PRESSURE_STALE_USAGE_SENTINEL worker context over_budget", {
            max: 8,
            targetProject: "api",
            nowMs: Date.parse("2026-07-09T00:00:00.000Z"),
            workerContextPacketContextUsage: {
                schema: "ccm-worker-context-usage-v1",
                status: "over_budget",
                pressure: 104,
                total_tokens: 93_800,
                max_tokens: 90_000,
                free_tokens: -16_800,
                autocompact_buffer_tokens: 13_000,
            },
        });
        const rendered = renderGroupTypedMemoryRecall(pressure);
        const relsNoPressure = (noPressure.recalled || []).map((item) => item.relPath);
        const pressureUsage = pressure.recalled.find((item) => item.relPath === "worker-context-usage-pressure-discipline.md");
        const pressureStrategy = pressure.recalled.find((item) => item.relPath === "worker-context-compact-strategy-memory.md");
        const pressurePtl = ptl.recalled.find((item) => item.relPath === "worker-context-ptl-emergency-downgrade.md");
        const afterUsageDoc = pressureAfterUsage.recalled.find((item) => item.relPath === "worker-context-usage-pressure-discipline.md");
        const afterIgnoredStrategy = pressureAfterUsage.recalled.find((item) => item.relPath === "worker-context-compact-strategy-memory.md")
            || pressureAfterUsage.diagnostics.find((item) => item.relPath === "worker-context-compact-strategy-memory.md");
        const staleIgnoredDoc = pressureAfterStaleUsage.diagnostics.find((item) => item.relPath === "worker-context-old-ignore-memory.md")
            || pressureAfterStaleUsage.recalled.find((item) => item.relPath === "worker-context-old-ignore-memory.md");
        const checks = {
            noPressureDoesNotPolluteNormalRecall: relsNoPressure.includes("normal-payment-memory.md")
                && !relsNoPressure.includes("worker-context-usage-pressure-discipline.md")
                && !relsNoPressure.includes("worker-context-compact-strategy-memory.md")
                && !relsNoPressure.includes("worker-context-ptl-emergency-downgrade.md")
                && Number(noPressure.workerContextPressureScoring?.deprioritized_count || 0) >= 3,
            overBudgetBoostsUsagePressureMemory: !!pressureUsage
                && Number(pressureUsage.workerContextPressureRecall?.adjustment || 0) > 0
                && JSON.stringify(pressureUsage).includes("PRESSURE_CONTEXT_USAGE_SENTINEL"),
            overBudgetBoostsCompactStrategyMemory: !!pressureStrategy
                && Number(pressureStrategy.workerContextPressureRecall?.adjustment || 0) > 0
                && JSON.stringify(pressureStrategy).includes("PRESSURE_COMPACT_STRATEGY_SENTINEL"),
            ptlEmergencyBoostsDowngradeMemory: !!pressurePtl
                && Number(pressurePtl.workerContextPressureRecall?.adjustment || 0) > 0
                && pressurePtl.workerContextPressureRecall?.ptl_emergency === true,
            pressureScoringSummarized: pressure.workerContextPressureScoring?.active === true
                && pressure.workerContextPressureScoring?.pressure_status === "over_budget"
                && pressure.workerContextPressureScoring?.boosted_count >= 2,
            usageLedgerFeedsFuturePressureRecall: usageRecord?.recorded_count === 4
                && usageSummary.totals?.used === 1
                && usageSummary.totals?.verified === 1
                && usageSummary.totals?.ignored === 2
                && Number(afterUsageDoc?.workerContextPressureUsage?.adjustment || 0) > 0
                && Number(afterIgnoredStrategy?.workerContextPressureUsage?.adjustment || 0) < 0
                && pressureAfterUsage.workerContextPressureUsageScoring?.boosted_count >= 1
                && pressureAfterUsage.workerContextPressureUsageScoring?.deprioritized_count >= 1,
            staleUsageFeedbackDecaysBeforeScoring: staleUsageRecord?.recorded_count === 2
                && staleUsageSummary.totals?.ignored === 4
                && Number(staleUsageSummary.weighted_totals?.ignored || 0) < Number(staleUsageSummary.totals?.ignored || 0)
                && Number(staleUsageSummary.aging?.stale_entry_count || 0) >= 2
                && (staleUsageSummary.stale_pressure_memories || []).some((item) => item.rel_path === "worker-context-old-ignore-memory.md")
                && staleIgnoredDoc?.workerContextPressureUsage?.matched?.some((match) => match.recommendation === "stale_pressure_recall_history" && Number(match.delta || 0) === 0)
                && Number(staleIgnoredDoc?.workerContextPressureUsage?.adjustment || 0) === 0
                && Number(pressureAfterStaleUsage.workerContextPressureUsageScoring?.stale_hint_count || 0) >= 1
                && Number(pressureAfterStaleUsage.workerContextPressureUsageScoring?.stale_matched_count || 0) >= 1,
            renderedShowsPressureRecall: rendered.includes("上下文压力召回")
                && rendered.includes("pressure recall +")
                && rendered.includes("PRESSURE_CONTEXT_USAGE_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            noPressure: {
                scoring: noPressure.workerContextPressureScoring,
                recalled: relsNoPressure,
            },
            pressure: {
                scoring: pressure.workerContextPressureScoring,
                recalled: pressure.recalled.map((item) => ({ relPath: item.relPath, score: item.score, workerContextPressureRecall: item.workerContextPressureRecall })),
            },
            ptl: {
                scoring: ptl.workerContextPressureScoring,
                recalled: ptl.recalled.map((item) => ({ relPath: item.relPath, score: item.score, workerContextPressureRecall: item.workerContextPressureRecall })),
            },
            usage: {
                record: usageRecord,
                summary: usageSummary,
                staleRecord: staleUsageRecord,
                staleSummary: staleUsageSummary,
                scoring: pressureAfterUsage.workerContextPressureUsageScoring,
                staleScoring: pressureAfterStaleUsage.workerContextPressureUsageScoring,
            },
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest() {
    const sourceGroupId = `typed-memory-cross-group-pressure-source-${process.pid}-${Date.now().toString(36)}`;
    const targetGroupId = `typed-memory-cross-group-pressure-target-${process.pid}-${Date.now().toString(36)}`;
    const dirs = [getGroupTypedMemoryDir(sourceGroupId), getGroupTypedMemoryDir(targetGroupId)];
    const nowMs = Date.parse("2026-07-09T23:10:00.000Z");
    const pressureUsage = {
        schema: "ccm-worker-context-usage-v1",
        status: "over_budget",
        pressure: 105,
        total_tokens: 94_500,
        max_tokens: 90_000,
        free_tokens: -17_500,
        autocompact_buffer_tokens: 13_000,
    };
    const findDoc = (recall, relPath) => (recall.recalled || []).find((item) => item.relPath === relPath)
        || (recall.diagnostics || []).find((item) => item.relPath === relPath)
        || {};
    try {
        upsertGroupTypedMemoryDocument(targetGroupId, {
            type: "feedback",
            slug: "worker-context-usage-pressure-discipline",
            name: "WorkerContextPacket context usage pressure discipline",
            description: "Cross-group pressure usage should promote this pressure memory only for the same project.",
            source: "selftest:cross-group-pressure-usage",
            body: [
                "CROSS_GROUP_PRESSURE_USAGE_SENTINEL",
                "When WorkerContextPacket context_usage is over_budget, keep free_tokens and autocompact_buffer_tokens visible before dispatch.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(targetGroupId, {
            type: "reference",
            slug: "worker-context-compact-strategy-memory",
            name: "WorkerContextPacket compact strategy memory",
            description: "Cross-group ignored pressure usage should deprioritize this memory.",
            source: "selftest:cross-group-pressure-usage",
            body: [
                "CROSS_GROUP_PRESSURE_IGNORED_SENTINEL",
                "metadata_partial_compact strategy memory can be deprioritized when child receipts repeatedly ignored it.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(targetGroupId, {
            type: "project",
            slug: "normal-cross-project-memory",
            name: "Normal cross project memory",
            description: "Ordinary target project task memory.",
            source: "selftest:cross-group-pressure-usage",
            body: "NORMAL_CROSS_GROUP_PRESSURE_SENTINEL：普通项目记忆，用来确认跨群聊压力提示只在压力路径补强。",
        });
        const sourceRecord = recordGroupTypedMemoryPressureRecallUsageLedger(sourceGroupId, {
            targetProject: "api",
            taskId: "cross-group-pressure-usage-source-task",
            executionId: "cross-group-pressure-usage-source-exec",
            agent: "api",
            generatedAt: "2026-07-09T23:09:00.000Z",
            rows: [
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "used", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-used" },
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "verified", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-verified" },
                { rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-ignored-1" },
                { rel_path: "worker-context-compact-strategy-memory.md", name: "WorkerContextPacket compact strategy memory", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-cross-pressure-ignored-2" },
            ],
        });
        const crossSummary = buildGroupTypedMemoryPressureRecallUsageProjectSummary(targetGroupId, {
            targetProject: "api",
            groupIds: [sourceGroupId],
            nowMs,
        });
        const crossRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
            max: 8,
            targetProject: "api",
            nowMs,
            workerContextPacketContextUsage: pressureUsage,
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
        });
        const wrongProjectRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
            max: 8,
            targetProject: "web",
            nowMs,
            workerContextPacketContextUsage: pressureUsage,
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
        });
        const promotedDoc = findDoc(crossRecall, "worker-context-usage-pressure-discipline.md");
        const ignoredDoc = findDoc(crossRecall, "worker-context-compact-strategy-memory.md");
        const localRecord = recordGroupTypedMemoryPressureRecallUsageLedger(targetGroupId, {
            targetProject: "api",
            taskId: "cross-group-pressure-usage-local-task",
            executionId: "cross-group-pressure-usage-local-exec",
            agent: "api",
            generatedAt: "2026-07-09T23:09:30.000Z",
            rows: [
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-1" },
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-2" },
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-local-pressure-ignored-3" },
            ],
        });
        const localOverrideRecall = buildGroupTypedMemoryRecall(targetGroupId, "继续普通项目任务 NORMAL_CROSS_GROUP_PRESSURE_SENTINEL", {
            max: 8,
            targetProject: "api",
            nowMs,
            workerContextPacketContextUsage: pressureUsage,
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
        });
        const localOverrideDoc = findDoc(localOverrideRecall, "worker-context-usage-pressure-discipline.md");
        const localOverrideMatches = localOverrideDoc.workerContextPressureUsage?.matched || [];
        const checks = {
            sourceLedgerRecorded: sourceRecord?.recorded_count === 4,
            projectSummaryReadsOnlySourceGroup: crossSummary.source === "cross_group_project_pressure_recall_usage"
                && crossSummary.source_group_count === 1
                && crossSummary.entry_count === 4
                && crossSummary.target_project === "api"
                && (crossSummary.source_groups || []).some((item) => item.groupId === sourceGroupId),
            crossGroupHintsPromoteSameProjectPressureMemory: Number(crossRecall.workerContextPressureUsageScoring?.cross_group_hint_count || 0) >= 2
                && Number(crossRecall.workerContextPressureUsageScoring?.cross_group_matched_count || 0) >= 2
                && promotedDoc.workerContextPressureUsage?.matched?.some((match) => match.hint_scope === "cross_group_project"
                    && match.recommendation === "promote_pressure_recall"
                    && Number(match.delta || 0) > 0
                    && match.group_ids?.includes(sourceGroupId)),
            crossGroupHintsCanDeprioritizeIgnoredPressureMemory: ignoredDoc.workerContextPressureUsage?.matched?.some((match) => match.hint_scope === "cross_group_project"
                && match.recommendation === "deprioritize_pressure_recall"
                && Number(match.delta || 0) < 0),
            targetProjectIsolationBlocksWrongProjectHints: Number(wrongProjectRecall.workerContextPressureUsageScoring?.cross_group_hint_count || 0) === 0
                && Number(wrongProjectRecall.workerContextPressureUsageScoring?.cross_group_matched_count || 0) === 0,
            localGroupUsageOverridesSameDocCrossGroupHint: localRecord?.recorded_count === 3
                && localOverrideMatches.some((match) => match.hint_scope === "local_group" && match.recommendation === "deprioritize_pressure_recall")
                && !localOverrideMatches.some((match) => match.hint_scope === "cross_group_project"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            crossSummary: {
                source_group_count: crossSummary.source_group_count || 0,
                entry_count: crossSummary.entry_count || 0,
                weighted_totals: crossSummary.weighted_totals || {},
                rows: crossSummary.rows || [],
            },
            crossRecall: {
                scoring: crossRecall.workerContextPressureUsageScoring,
                promotedDoc: promotedDoc.workerContextPressureUsage || null,
                ignoredDoc: ignoredDoc.workerContextPressureUsage || null,
            },
            localOverride: {
                scoring: localOverrideRecall.workerContextPressureUsageScoring,
                usageDocMatches: localOverrideMatches,
            },
        };
    }
    finally {
        for (const dir of dirs) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest() {
    const groupId = `typed-memory-pressure-repair-provenance-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const repairFile = getGroupPressureRecallUsageRepairWorkItemsFile(groupId);
    const nowMs = Date.parse("2026-07-09T23:58:00.000Z");
    const targetProject = "phase131-pressure-project";
    try {
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-usage-pressure-discipline",
            name: "WorkerContextPacket context usage pressure discipline",
            description: "Repair provenance must be visible when pressure usage recommendations are disputed.",
            source: "selftest:pressure-repair-provenance",
            body: [
                "PRESSURE_REPAIR_PROVENANCE_SENTINEL",
                "When WorkerContextPacket context_usage is over_budget, check whether the pressure memory is trusted or under repair before following it.",
            ].join("\n"),
        });
        const usageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject,
            taskId: "pressure-repair-provenance-task",
            executionId: "pressure-repair-provenance-execution",
            agent: "api",
            generatedAt: "2026-07-09T23:57:00.000Z",
            rows: [
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-repair-ignored-1" },
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-pressure-repair-ignored-2" },
            ],
        });
        writeJsonAtomic(repairFile, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId,
            file: repairFile,
            items: [{
                    id: "cgpru-repair-provenance-selftest",
                    work_item_id: "cgpru-repair-provenance-selftest",
                    source: "cross_group_pressure_recall_usage_repair",
                    component: "cross_group_pressure_recall_usage",
                    status: "pending",
                    priority: "high",
                    target_project: targetProject,
                    repair_target: "worker-context-usage-pressure-discipline.md",
                    cross_group_pressure_recall_usage_gap_type: "recommendation_conflict",
                    cross_group_pressure_recall_usage_rel_path: "worker-context-usage-pressure-discipline.md",
                    cross_group_pressure_recall_usage_reason: "selftest: local deprioritize_pressure_recall but cross-group promote_pressure_recall",
                    local_recommendation: "deprioritize_pressure_recall",
                    cross_group_recommendation: "promote_pressure_recall",
                    source_group_count: 1,
                    source_groups: [{ groupId: "source-pressure-repair-provenance", entry_count: 2 }],
                    shouldCreateRealTask: false,
                    updatedAt: "2026-07-09T23:57:30.000Z",
                }],
            stats: { total: 1, openItemCount: 1, pendingCount: 1 },
            updatedAt: "2026-07-09T23:57:30.000Z",
        });
        const recall = buildGroupTypedMemoryRecall(groupId, "继续 WorkerContextPacket over_budget PRESSURE_REPAIR_PROVENANCE_SENTINEL", {
            max: 6,
            targetProject,
            nowMs,
            workerContextPacketContextUsage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: "wcp-pressure-repair-provenance",
                project: targetProject,
                status: "over_budget",
                pressure: 112,
                total_tokens: 101_000,
                max_tokens: 90_000,
                free_tokens: -24_000,
                autocompact_buffer_tokens: 13_000,
            },
        });
        const doc = (recall.recalled || []).find((item) => item.relPath === "worker-context-usage-pressure-discipline.md")
            || (recall.diagnostics || []).find((item) => item.relPath === "worker-context-usage-pressure-discipline.md")
            || {};
        const matches = doc.workerContextPressureUsage?.matched || [];
        const rendered = renderGroupTypedMemoryRecall(recall);
        const repairMatch = matches.find((match) => match.repair_open === true);
        const checks = {
            usageLedgerRecorded: usageRecord?.recorded_count === 2,
            repairHintMatchedDoc: repairMatch?.repair_work_item_id === "cgpru-repair-provenance-selftest"
                && repairMatch.provenance_status === "disputed_under_repair"
                && repairMatch.repair_gap_type === "recommendation_conflict"
                && repairMatch.repair_local_recommendation === "deprioritize_pressure_recall"
                && repairMatch.repair_cross_group_recommendation === "promote_pressure_recall",
            scoringCountsRepair: Number(recall.workerContextPressureUsageScoring?.repair_hint_count || 0) >= 1
                && Number(recall.workerContextPressureUsageScoring?.repair_matched_count || 0) >= 1
                && Number(recall.workerContextPressureUsageScoring?.disputed_matched_count || 0) >= 1,
            renderedCarriesRepairProvenance: rendered.includes("pressure repair recommendation_conflict:pending")
                && rendered.includes("PRESSURE_REPAIR_PROVENANCE_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            scoring: recall.workerContextPressureUsageScoring,
            doc: {
                relPath: doc.relPath || doc.rel_path || "",
                score: doc.score || 0,
                workerContextPressureUsage: doc.workerContextPressureUsage || null,
            },
            rendered,
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        for (const file of [repairFile, `${repairFile}.bak`]) {
            try {
                if (fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runGroupTypedMemoryLoadPlanSelfTest() {
    const groupId = `typed-memory-load-plan-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "aaa-main-project",
            name: "Main project memory",
            description: "Project memory that includes another typed memory file.",
            source: "selftest",
            body: [
                "# Main Project Memory",
                "LOAD_PLAN_MAIN_SENTINEL",
                "@zzz-included-project.md",
                "@missing-memory.md",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "zzz-included-project",
            name: "Included project memory",
            description: "Included memory must load before its parent.",
            source: "selftest",
            body: "LOAD_PLAN_INCLUDE_SENTINEL",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "cycle-a",
            name: "Cycle A",
            description: "Cycle source A",
            source: "selftest",
            body: "@cycle-b.md",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "cycle-b",
            name: "Cycle B",
            description: "Cycle source B",
            source: "selftest",
            body: "@cycle-a.md",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "user",
            slug: "zz-user-requirements",
            name: "User requirements",
            description: "Highest priority user memory.",
            source: "selftest",
            body: "LOAD_PLAN_USER_SENTINEL must win when memory conflicts.",
        });
        const plan = buildGroupTypedMemoryLoadPlan(groupId, {});
        const rendered = renderGroupTypedMemoryLoadPlan(plan);
        const entries = Array.isArray(plan.entries) ? plan.entries : [];
        const byRel = new Map(entries.map((entry) => [entry.relPath, entry]));
        const included = byRel.get("zzz-included-project.md") || {};
        const parent = byRel.get("aaa-main-project.md") || {};
        const user = byRel.get("zz-user-requirements.md") || {};
        const referencePriority = plan.priorityTiers.reference;
        const projectPriority = plan.priorityTiers.project;
        const feedbackPriority = plan.priorityTiers.feedback;
        const userPriority = plan.priorityTiers.user;
        const checks = {
            schema: plan.schema === "ccm-group-typed-memory-load-plan-v1",
            entrypointFirst: entries[0]?.relPath === exports.GROUP_TYPED_MEMORY_ENTRYPOINT && entries[0]?.kind === "entrypoint",
            priorityTierOrdering: referencePriority < projectPriority && projectPriority < feedbackPriority && feedbackPriority < userPriority,
            includeLoadsBeforeParent: Number(included.loadOrder) < Number(parent.loadOrder)
                && included.parentRelPath === "aaa-main-project.md",
            missingIncludeAudited: plan.issues.some((issue) => issue.type === "missing_include" && String(issue.ref || "").includes("missing-memory.md")),
            cycleAudited: plan.issues.some((issue) => issue.type === "circular_include"),
            userMemoryHighestPriority: Number(user.priority || 0) === userPriority
                && Number(user.loadOrder || 0) > Number(parent.loadOrder || 0),
            boundedEntries: plan.entryCount <= plan.maxEntries && plan.totalBytes > 0 && plan.estimatedTokens > 0,
            renderedMentionsPlan: rendered.includes("类型化 MEMORY.md 加载计划")
                && rendered.includes("entrypoint < reference < project < feedback < user"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, plan: { status: plan.status, entryCount: plan.entryCount, issues: plan.issues.map((issue) => issue.type) } };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPathConditionSelfTest() {
    const groupId = `typed-memory-path-condition-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    try {
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "pay-path-rule",
            name: "Payment callback path rule",
            description: "Only applies to payment callback files.",
            source: "selftest",
            paths: ["src/pay.ts", "src/payment/**/*.ts"],
            body: "PATH_CONDITION_PAY_SENTINEL: 支付回调必须验签并保留幂等键。",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "search-path-rule",
            name: "Search path rule",
            description: "Only applies to search files.",
            source: "selftest",
            paths: ["src/search/**/*.ts"],
            body: "PATH_CONDITION_SEARCH_SENTINEL: 搜索索引刷新需要单独验证。",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "project",
            slug: "general-project",
            name: "General project memory",
            description: "Unconditional memory should still be recallable by query.",
            source: "selftest",
            body: "PATH_CONDITION_GENERAL_SENTINEL: 通用项目记忆。",
        });
        const payRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts 支付回调 PATH_CONDITION_PAY_SENTINEL", { max: 8 });
        const searchRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/search/index.ts 搜索索引 PATH_CONDITION_SEARCH_SENTINEL", { max: 8 });
        const unrelatedRecall = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md 文档任务 PATH_CONDITION", { max: 8 });
        const payPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
        const unrelatedPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["docs/readme.md"] });
        const rendered = renderGroupTypedMemoryRecall(payRecall);
        const payEntries = JSON.stringify(payPlan.entries || []);
        const unrelatedEntries = JSON.stringify(unrelatedPlan.entries || []);
        const checks = {
            pathsPersistedInFrontmatter: fs.readFileSync(path.join(dir, "pay-path-rule.md"), "utf-8").includes("\"src/pay.ts\""),
            payRecallIncludesPayRule: JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL"),
            payRecallSkipsSearchRule: !JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
            searchRecallIncludesSearchRule: JSON.stringify(searchRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
            unrelatedSkipsConditionalRules: !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL")
                && !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
            diagnosticsRecordPathMiss: unrelatedRecall.diagnostics.some((item) => item.reason === "path_condition_miss"),
            loadPlanIncludesMatchedConditional: payEntries.includes("pay-path-rule.md") && !payEntries.includes("search-path-rule.md"),
            loadPlanSkipsUnmatchedConditionals: !unrelatedEntries.includes("pay-path-rule.md") && !unrelatedEntries.includes("search-path-rule.md"),
            loadPlanCountsConditionalSkips: unrelatedPlan.conditionalSkipped >= 2 && payPlan.conditionalMatched >= 1,
            renderedMentionsPathCondition: rendered.includes("路径条件匹配") && rendered.includes("src/pay.ts"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            payRecall: { surfaced: payRecall.surfaced, conditionalMatched: payRecall.conditionalMatched, conditionalSkipped: payRecall.conditionalSkipped },
            payPlan: { conditionalMatched: payPlan.conditionalMatched, conditionalSkipped: payPlan.conditionalSkipped },
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupProjectMemoryImportSelfTest() {
    const groupId = `project-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const projectRoot = path.join(utils_1.CCM_DIR, "tmp-project-memory-import-selftest", groupId);
    try {
        fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
        fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
            "# Project Instructions",
            "@./docs/project-extra.md",
            "@./docs/missing-project-extra.md",
            "<!-- @./docs/comment-hidden.md -->",
            "PROJECT_MEMORY_IMPORT_ROOT_SENTINEL: all child Agents must preserve project instructions.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, "docs", "project-extra.md"), [
            "# Project Extra Include",
            "PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL: imported @include content must reach child Agent typed memory.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, "docs", "comment-hidden.md"), [
            "# Hidden Include",
            "PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL should not be imported from an HTML comment.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, ".claude", "CLAUDE.md"), [
            "# Dot Claude Instructions",
            "PROJECT_MEMORY_IMPORT_DOT_SENTINEL: dot-claude instructions are project memory.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "pay.md"), [
            "---",
            "name: \"Pay Rule\"",
            "description: \"Payment callback rule\"",
            "paths: [\"src/pay.ts\", \"src/payment/**/*.ts\"]",
            "---",
            "PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL: src/pay.ts requires signature verification.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), [
            "# Local Instructions",
            "PROJECT_MEMORY_IMPORT_LOCAL_SENTINEL: local private instruction imported for CCM context.",
        ].join("\n"), "utf-8");
        const discovery = discoverProjectMemoryFiles(projectRoot, {});
        const imported = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
        const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
        const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL", { max: 10 });
        const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
        const plan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const checks = {
            discoversClaudeFiles: discovery.discoveredCount === 4
                && discovery.files.some((item) => item.relPath === "CLAUDE.md")
                && discovery.files.some((item) => item.relPath === ".claude/CLAUDE.md")
                && discovery.files.some((item) => item.relPath === ".claude/rules/pay.md")
                && discovery.files.some((item) => item.relPath === "CLAUDE.local.md"),
            importsTypedDocs: imported.importedCount === 5
                && docs.some(item => String(item.source || "").includes("project-memory:api:project:CLAUDE.md"))
                && docs.some(item => String(item.source || "").includes("project-memory:api:project_rule:.claude/rules/pay.md")),
            importsClaudeIncludes: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
                && Number(imported.includeAudit.importedIncludeCount || 0) === 1
                && JSON.stringify(includeRecall.recalled || []).includes("PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL")
                && !JSON.stringify(docs).includes("PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL"),
            missingIncludeAudited: (imported.issues || []).some((item) => item.type === "missing_include" && String(item.ref || "").includes("missing-project-extra.md")),
            preservesPathFrontmatter: docs.some(item => item.relPath.includes("pay") && (item.paths || []).includes("src/pay.ts")),
            recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL"),
            unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL")
                && unrelated.diagnostics.some((item) => item.reason === "path_condition_miss"),
            loadPlanIncludesImportedRule: JSON.stringify(plan.entries || []).includes(".claude/rules/pay.md")
                && Number(plan.conditionalMatched || 0) >= 1,
            indexLinksImportedDocs: indexText.includes("Project Rule: .claude/rules/pay.md")
                && indexText.includes("Project Memory: CLAUDE.md"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
            imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
            recalled: recall.surfaced,
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(projectRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupGlobalClaudeMemoryImportSelfTest() {
    const groupId = `global-claude-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-global-claude-memory-import-selftest", groupId);
    const userRoot = path.join(root, "user-claude");
    const managedRoot = path.join(root, "managed-claude");
    try {
        fs.mkdirSync(path.join(userRoot, "rules"), { recursive: true });
        fs.mkdirSync(path.join(managedRoot, ".claude", "rules"), { recursive: true });
        fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), [
            "# User Claude Memory",
            "@../user-external.md",
            "GLOBAL_CLAUDE_USER_SENTINEL: 所有项目子 Agent 都要保留用户全局偏好。",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(root, "user-external.md"), [
            "# User External Include",
            "GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL: user Claude memory may include external text files.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(userRoot, "rules", "pay.md"), [
            "---",
            "name: \"User Pay Rule\"",
            "paths: [\"src/pay.ts\"]",
            "---",
            "GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL: src/pay.ts 必须先检查用户级支付规则。",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), [
            "# Managed Claude Memory",
            "@../managed-external.md",
            "GLOBAL_CLAUDE_MANAGED_SENTINEL: managed policy memory imported.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(root, "managed-external.md"), [
            "# Managed External Include",
            "GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL should be skipped unless external includes are approved.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(managedRoot, ".claude", "rules", "security.md"), [
            "---",
            "name: \"Managed Security Rule\"",
            "paths: [\"src/**/*.ts\"]",
            "---",
            "GLOBAL_CLAUDE_MANAGED_SECURITY_SENTINEL: TypeScript files require security review.",
        ].join("\n"), "utf-8");
        const discovery = discoverGlobalClaudeMemoryFiles({ userRoot, managedRoot });
        const imported = importGlobalClaudeMemoryToGroupTypedMemory(groupId, { userRoot, managedRoot });
        const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
        const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL", { max: 10 });
        const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const checks = {
            discoversUserAndManaged: discovery.discoveredCount === 4
                && discovery.files.some((item) => item.scope === "user" && item.kind === "user")
                && discovery.files.some((item) => item.scope === "managed" && item.kind === "managed"),
            importsTypedDocs: imported.importedCount === 5
                && docs.some(item => String(item.source || "").includes("global-claude-memory:user:user:CLAUDE.md"))
                && docs.some(item => String(item.source || "").includes("global-claude-memory:managed:managed:CLAUDE.md")),
            importsUserExternalInclude: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
                && Number(imported.includeAudit.importedIncludeCount || 0) === 1
                && JSON.stringify(includeRecall.recalled || []).includes("GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL"),
            skipsManagedExternalInclude: (imported.issues || []).some((item) => item.type === "external_include_skipped" && String(item.ref || "").includes("managed-external.md"))
                && !JSON.stringify(docs).includes("GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL"),
            userMemoryHasHighPriorityType: docs.some(item => item.type === "user" && String(item.body || "").includes("GLOBAL_CLAUDE_USER_SENTINEL")),
            managedMemoryIsReference: docs.some(item => item.type === "reference" && String(item.body || "").includes("GLOBAL_CLAUDE_MANAGED_SENTINEL")),
            preservesRulePaths: docs.some(item => String(item.source || "").includes("rules/pay.md") && (item.paths || []).includes("src/pay.ts")),
            recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL"),
            unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL")
                && unrelated.diagnostics.some((item) => item.reason === "path_condition_miss"),
            indexLinksGlobalDocs: indexText.includes("User Claude Memory: CLAUDE.md")
                && indexText.includes("Managed Claude Memory: CLAUDE.md"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
            imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
            recalled: recall.surfaced,
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupClaudeMemoryExternalIncludeApprovalSelfTest() {
    const groupId = `claude-external-include-approval-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-claude-external-include-approval-selftest", groupId);
    const projectRoot = path.join(root, "project");
    const externalFile = path.join(root, "approved-external.md");
    try {
        fs.mkdirSync(projectRoot, { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
            "# Project With External Include",
            "@../approved-external.md",
            "EXTERNAL_INCLUDE_APPROVAL_ROOT_SENTINEL: root project memory stays imported.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(externalFile, [
            "# Approved External Include",
            "EXTERNAL_INCLUDE_APPROVAL_SENTINEL: approved external include reaches typed memory.",
        ].join("\n"), "utf-8");
        const first = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
        const firstDocs = scanGroupTypedMemoryDocuments(groupId);
        const firstApproval = first.includeAudit?.externalIncludeApproval || {};
        const marked = markGroupClaudeMemoryExternalIncludeWarningShown(groupId, {
            includes: firstApproval.pendingExternalIncludes || [],
            actor: "selftest",
        });
        const afterWarning = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
        const afterWarningApproval = afterWarning.includeAudit?.externalIncludeApproval || {};
        const approved = approveGroupClaudeMemoryExternalInclude(groupId, {
            includes: firstApproval.pendingExternalIncludes || [{ path: externalFile, parent: path.join(projectRoot, "CLAUDE.md"), scope: "project", kind: "project" }],
            approvedBy: "selftest",
        });
        const second = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
        const recall = buildGroupTypedMemoryRecall(groupId, "继续 EXTERNAL_INCLUDE_APPROVAL_SENTINEL", { max: 10 });
        const secondDocs = scanGroupTypedMemoryDocuments(groupId);
        const secondApproval = second.includeAudit?.externalIncludeApproval || {};
        const checks = {
            firstWarnsAndSkips: firstApproval.schema === "ccm-claude-memory-external-include-approval-v1"
                && firstApproval.pendingCount === 1
                && firstApproval.shouldShowWarning === true
                && (first.issues || []).some((item) => item.type === "external_include_skipped" && item.approvalRequired === true)
                && !JSON.stringify(firstDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
            warningShownSuppressesRepeatPrompt: marked.hasExternalIncludesWarningShown === true
                && afterWarningApproval.pendingCount === 1
                && afterWarningApproval.shouldShowWarning === false,
            approvalLedgerPersists: approved.approved.some((item) => item.path === normalizeExternalIncludeApprovalPath(externalFile))
                && fs.existsSync(getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId)),
            approvedExternalImports: secondApproval.pendingCount === 0
                && secondApproval.approvedCount === 1
                && Number(second.includeAudit?.importedIncludeCount || 0) === 1
                && JSON.stringify(secondDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
            recallFindsApprovedExternalInclude: JSON.stringify(recall.recalled || []).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { importedCount: first.importedCount, approval: firstApproval },
            second: { importedCount: second.importedCount, approval: secondApproval },
            recalled: recall.surfaced,
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupClaudeMemorySettingSourcePolicySelfTest() {
    const groupId = `claude-setting-source-policy-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const root = path.join(utils_1.CCM_DIR, "tmp-claude-setting-source-policy-selftest", groupId);
    const projectRoot = path.join(root, "project");
    const userRoot = path.join(root, "user-claude");
    const managedRoot = path.join(root, "managed-claude");
    try {
        fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
        fs.mkdirSync(userRoot, { recursive: true });
        fs.mkdirSync(managedRoot, { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "SETTING_SOURCE_PROJECT_SENTINEL: project source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "rule.md"), "SETTING_SOURCE_PROJECT_RULE_SENTINEL: project rule enabled.\n", "utf-8");
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), "SETTING_SOURCE_LOCAL_SENTINEL: local source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), "SETTING_SOURCE_USER_SENTINEL: user source enabled.\n", "utf-8");
        fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), "SETTING_SOURCE_MANAGED_SENTINEL: managed policy source always enabled.\n", "utf-8");
        const defaultPolicy = buildClaudeMemorySettingSourcePolicy({});
        const isolatedPolicy = buildClaudeMemorySettingSourcePolicy({ settingSources: "" });
        const projectDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "project" });
        const localDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "local" });
        const isolatedProjectDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "" });
        const isolatedGlobal = importGlobalClaudeMemoryToGroupTypedMemory(groupId, { userRoot, managedRoot, settingSources: "" });
        const isolatedRecall = buildGroupTypedMemoryRecall(groupId, "SETTING_SOURCE_MANAGED_SENTINEL SETTING_SOURCE_USER_SENTINEL", { max: 10 });
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const checks = {
            defaultEnablesEditableAndAlwaysOn: defaultPolicy.includeUser === true
                && defaultPolicy.includeProject === true
                && defaultPolicy.includeLocal === true
                && defaultPolicy.includeManaged === true
                && defaultPolicy.includeFlagSettings === true,
            emptySettingSourcesEnterIsolationButKeepManaged: isolatedPolicy.isolationMode === true
                && isolatedPolicy.includeUser === false
                && isolatedPolicy.includeProject === false
                && isolatedPolicy.includeLocal === false
                && isolatedPolicy.includeManaged === true,
            projectOnlySkipsLocal: projectDiscovery.settingSourcePolicy?.enabled?.includes("projectSettings")
                && projectDiscovery.discoveredCount === 2
                && projectDiscovery.files.some((item) => item.relPath === "CLAUDE.md")
                && projectDiscovery.files.some((item) => item.relPath === ".claude/rules/rule.md")
                && !projectDiscovery.files.some((item) => item.relPath === "CLAUDE.local.md"),
            localOnlySkipsProject: localDiscovery.discoveredCount === 1
                && localDiscovery.files.some((item) => item.relPath === "CLAUDE.local.md")
                && !localDiscovery.files.some((item) => item.relPath === "CLAUDE.md"),
            isolatedProjectSkipsProjectAndLocal: isolatedProjectDiscovery.discoveredCount === 0
                && isolatedProjectDiscovery.settingSourcePolicy?.isolationMode === true,
            isolatedGlobalImportsManagedOnly: isolatedGlobal.settingSourcePolicy?.isolationMode === true
                && isolatedGlobal.includeUser === false
                && isolatedGlobal.includeManaged === true
                && isolatedGlobal.importedCount === 1
                && JSON.stringify(docs).includes("SETTING_SOURCE_MANAGED_SENTINEL")
                && !JSON.stringify(docs).includes("SETTING_SOURCE_USER_SENTINEL"),
            recallFindsManagedButNotUser: JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_MANAGED_SENTINEL")
                && !JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_USER_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            defaultPolicy,
            isolatedPolicy,
            projectDiscovery: { discoveredCount: projectDiscovery.discoveredCount, files: projectDiscovery.files.map((item) => item.relPath) },
            isolatedGlobal: { importedCount: isolatedGlobal.importedCount, includeUser: isolatedGlobal.includeUser, includeManaged: isolatedGlobal.includeManaged },
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(root, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupInstructionsLoadedHookPipelineSelfTest() {
    const groupId = `instructions-loaded-hook-selftest-${process.pid}-${Date.now().toString(36)}`;
    const typedDir = getGroupTypedMemoryDir(groupId);
    const projectRoot = path.join(utils_1.CCM_DIR, "tmp-instructions-loaded-hook-selftest", groupId);
    const seen = [];
    const unregisterGood = registerGroupMemoryInstructionsLoadedHook((input) => {
        seen.push({ ...input });
        return { observed: input.file_path, reason: input.load_reason };
    });
    const unregisterFailing = registerGroupMemoryInstructionsLoadedHook(() => {
        throw new Error("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL");
    });
    try {
        fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
        fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
            "# Hook Project Memory",
            "@./docs/hook-include.md",
            "INSTRUCTIONS_LOADED_HOOK_ROOT_SENTINEL: root memory imported.",
        ].join("\n"), "utf-8");
        fs.writeFileSync(path.join(projectRoot, "docs", "hook-include.md"), [
            "# Hook Include",
            "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL: include memory imported.",
        ].join("\n"), "utf-8");
        const imported = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, {
            project: "api",
            instructionsLoadReason: "session_start",
        });
        const hookSummary = imported.instructionsLoadedHooks || {};
        const ledger = loadGroupClaudeInstructionsLoadedHookLedger(groupId);
        const recall = buildGroupTypedMemoryRecall(groupId, "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL", { max: 10 });
        const renderedPlan = renderGroupTypedMemoryLoadPlan(buildGroupTypedMemoryLoadPlan(groupId, {}));
        const checks = {
            hooksRegistered: hasGroupMemoryInstructionsLoadedHook() === true,
            hookSummaryRecordsEvents: hookSummary.schema === "ccm-claude-instructions-loaded-hook-import-summary-v1"
                && hookSummary.eventCount === 2
                && hookSummary.firedCount === 4
                && hookSummary.failureCount === 2
                && fs.existsSync(hookSummary.ledgerFile),
            goodHookSawTopLevelAndInclude: seen.length === 2
                && seen.some(item => item.memory_type === "Project" && item.load_reason === "session_start" && String(item.file_path || "").endsWith("CLAUDE.md"))
                && seen.some(item => item.memory_type === "Project" && item.load_reason === "include" && String(item.parent_file_path || "").endsWith("CLAUDE.md")),
            ledgerPersistsRows: Array.isArray(ledger.entries)
                && ledger.entries.length >= 2
                && ledger.entries.every((entry) => Array.isArray(entry.rows) && entry.rows.length === 2)
                && JSON.stringify(ledger.entries).includes("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL"),
            importContinuesAfterHookFailure: imported.importedCount === 2
                && JSON.stringify(recall.recalled || []).includes("INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL"),
            typedLoadPlanStillWorks: renderedPlan.includes("类型化 MEMORY.md 加载计划"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            hookSummary: { eventCount: hookSummary.eventCount, firedCount: hookSummary.firedCount, failureCount: hookSummary.failureCount },
            seen: seen.map(item => ({ memory_type: item.memory_type, load_reason: item.load_reason, parent_file_path: item.parent_file_path })),
        };
    }
    finally {
        unregisterGood();
        unregisterFailing();
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            fs.rmSync(projectRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryLogDistillationSelfTest() {
    const groupId = `typed-memory-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const messages = [
        {
            id: "ld-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期记住 LOG_DISTILL_SENTINEL_20260707，支付回调不能跳过验签。",
        },
        {
            id: "ld-a1",
            role: "assistant",
            agent: "coordinator",
            dispatchPolicy: { action: "delegate", reason: "使用 api-agent 修改 src/pay.ts 并运行 npm run check" },
            assignments: [{ project: "api", task: "实现支付回调验签" }],
            content: "决定使用 webhook idempotency key，涉及 src/pay.ts。",
        },
        {
            id: "ld-a2",
            role: "assistant",
            agent: "api-agent",
            task_id: "ld-task",
            content: "执行失败：npm run check failed，src/pay.ts 签名校验异常，需要继续修复。Skill:typescript-audit",
            receipt: { status: "failed", taskId: "ld-task", verification: ["npm run check failed"] },
        },
        {
            id: "ld-a3",
            role: "assistant",
            agent: "api-agent",
            task_id: "ld-task",
            content: "修复 src/pay.ts 后 npm run check passed。",
            receipt: { status: "done", taskId: "ld-task", summary: "支付回调验签修复", verification: ["npm run check passed"] },
        },
    ];
    const originalMessages = JSON.stringify(messages);
    try {
        const first = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest" });
        const second = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest-repeat" });
        const recall = buildGroupTypedMemoryRecall(groupId, "LOG_DISTILL_SENTINEL_20260707 src/pay.ts npm run check failed", { disableLedger: true, max: 8 });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const rendered = renderGroupTypedMemoryRecall(recall);
        const checks = {
            distillationCreatedFacts: first.newFactCount > 0 && first.writeCount >= 4,
            repeatDoesNotAddDuplicates: second.newFactCount === 0 && second.updatedFactCount >= first.newFactCount,
            qualityReportRecorded: first.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1"
                && typeof first.quality.score === "number",
            ledgerPersistsFacts: Object.values(ledger.facts || {}).some((bucket) => Object.keys(bucket || {}).length > 0),
            fourTypedDocsCreated: docs.some(item => item.relPath === "distilled-log-user-requirements.md")
                && docs.some(item => item.relPath === "distilled-log-project-context.md")
                && docs.some(item => item.relPath === "distilled-log-feedback-failures.md")
                && docs.some(item => item.relPath === "distilled-log-reference-artifacts.md"),
            indexLinksDistilledDocs: indexText.includes("distilled-log-user-requirements.md") && indexText.includes("distilled-log-reference-artifacts.md"),
            recallFindsSentinelAndFile: JSON.stringify(recall.recalled).includes("LOG_DISTILL_SENTINEL_20260707")
                && JSON.stringify(recall.recalled).includes("src/pay.ts"),
            recallFindsFailureAndVerification: JSON.stringify(recall.recalled).includes("npm run check failed")
                && JSON.stringify(recall.recalled).includes("npm run check passed"),
            renderedMentionsDistilledMemory: rendered.includes("类型化长期记忆") && rendered.includes("Distilled"),
            rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { newFactCount: first.newFactCount, writeCount: first.writeCount },
            second: { newFactCount: second.newFactCount, updatedFactCount: second.updatedFactCount },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
    const groupId = `typed-memory-post-compact-usage-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const usage = {
        ignored_candidates: [{
                candidate_id: "pcrc_stale_recovered",
                value: "src/stale-recovered.ts",
                recommendation: "deprioritize_or_distill",
                ignored_count: 4,
                used_count: 0,
                verified_count: 0,
            }],
        missing_usage_candidates: [{
                candidate_id: "pcrc_missing_usage",
                value: "npm run stale-check",
                recommendation: "require_usage_receipt",
                mentioned_count: 2,
            }],
    };
    const messages = [{
            id: "pcud-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期保留 USAGE_DISTILLATION_SENTINEL，但旧恢复候选 src/stale-recovered.ts 已经被多次忽略。",
        }];
    try {
        const distillation = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "usage distillation selftest" }, {
            reason: "post-compact-usage-distillation-selftest",
            postCompactCandidateUsage: usage,
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const archive = docs.find(item => item.relPath === "post-compact-candidate-usage-archive.md");
        const archiveText = archive ? fs.readFileSync(archive.file, "utf-8") : "";
        const recall = buildGroupTypedMemoryRecall(groupId, "src/stale-recovered.ts stale recovered candidate", {
            max: 8,
            postCompactCandidateUsage: usage,
        });
        const checks = {
            archiveDocWritten: !!archive
                && archiveText.includes("Post-Compact Candidate Usage Archive")
                && archiveText.includes("src/stale-recovered.ts")
                && archiveText.includes("npm run stale-check"),
            distillationReportsArchive: distillation.postCompactUsageArchive?.archived_count === 2
                && distillation.writes?.some((item) => item.slug === "post-compact-candidate-usage-archive"),
            ledgerPersistsArchive: ledger.postCompactUsageArchive?.archived_count === 2
                && JSON.stringify(ledger.postCompactUsageArchive?.rows || []).includes("pcrc_stale_recovered"),
            recallDeprioritizesArchive: recall.diagnostics?.some((item) => item.relPath === "post-compact-candidate-usage-archive.md"
                && Number(item.postCompactUsage?.adjustment || 0) < 0),
            recallScoringCountsArchive: recall.postCompactUsageScoring?.hint_count === 2
                && recall.postCompactUsageScoring?.deprioritized_count >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            archive: distillation.postCompactUsageArchive,
            recalled: recall.recalled.map((item) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-provider-reproof-receipt-consumption-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const rows = [
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-used",
            brief_id: "brief-provider-reproof-consumption-used",
            work_item_id: "work-provider-reproof-consumption-used",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-used",
            receipt_status: "done",
            replay_repair_consumption_status: "used",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL 使用 WorkerContextPacket provider re-proof brief 定位 request-provider-reproof-consumption-used。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            request_patch_checksum: "request-provider-reproof-consumption-used",
            runner_request_id: "runner-provider-reproof-consumption-used",
            task_agent_session_id: "tas-provider-reproof-consumption-used",
            memory_context_snapshot_id: "snapshot-provider-reproof-consumption-used",
            execution_id: "execution-provider-reproof-consumption-used",
        },
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-strong",
            brief_id: "brief-provider-reproof-consumption-strong",
            work_item_id: "work-provider-reproof-consumption-strong",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-strong",
            receipt_status: "done",
            replay_repair_consumption_status: "strong",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_STRONG_CLAIM_SENTINEL 子 Agent 声称 strong，但仍需 native provider proof ledger。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            request_patch_checksum: "request-provider-reproof-consumption-strong",
            runner_request_id: "runner-provider-reproof-consumption-strong",
        },
        {
            groupId,
            timeline_binding_id: "timeline-provider-reproof-consumption-ignored",
            brief_id: "brief-provider-reproof-consumption-ignored",
            work_item_id: "work-provider-reproof-consumption-ignored",
            source: "api_microcompact_native_apply_provider_reproof",
            project: "api",
            task_id: "task-provider-reproof-consumption-ignored",
            receipt_status: "done",
            replay_repair_consumption_status: "ignored",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL stale provider re-proof brief 被子 Agent 忽略。",
            provider_reproof_status: "needed",
            provider_reproof_reason: "superseded_candidate",
            request_patch_checksum: "request-provider-reproof-consumption-ignored",
            runner_request_id: "runner-provider-reproof-consumption-ignored",
        },
    ];
    try {
        const first = distillProviderReproofReceiptConsumptionToTypedMemory(groupId, { rows }, {
            reason: "provider-reproof-receipt-consumption-selftest",
            updatedAt: "2026-07-08T12:00:00.000Z",
        });
        const second = distillProviderReproofReceiptConsumptionToTypedMemory(groupId, { rows }, {
            reason: "provider-reproof-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-08T12:01:00.000Z",
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL request-provider-reproof-consumption-used", { disableLedger: true, forceMemory: true, max: 8 });
        const cautionRecall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL request-provider-reproof-consumption-ignored", { disableLedger: true, forceMemory: true, max: 8 });
        const recallText = JSON.stringify(recall.recalled || []);
        const cautionText = JSON.stringify(cautionRecall.recalled || []);
        const archiveRows = ledger.providerReproofReceiptConsumptionArchive?.rows || [];
        const checks = {
            archiveCountsRows: first.archivedCount === 3
                && first.promotedCount === 2
                && first.cautionCount === 1
                && first.strongReceiptClaimCount === 1,
            repeatDoesNotDuplicateRows: second.archivedCount === 3 && second.newRowCount === 0,
            ledgerPersistsArchive: ledger.providerReproofReceiptConsumptionArchive?.archived_count === 3
                && archiveRows.some((row) => row.strong_receipt_claim_only === true),
            typedDocsWritten: docs.some(item => item.relPath === "provider-reproof-receipt-consumption-recall.md" && item.type === "reference")
                && docs.some(item => item.relPath === "provider-reproof-receipt-consumption-cautions.md" && item.type === "feedback"),
            indexLinksProviderDocs: indexText.includes("provider-reproof-receipt-consumption-recall.md")
                && indexText.includes("provider-reproof-receipt-consumption-cautions.md"),
            promotedRecallFindsUsedRow: recallText.includes("PROVIDER_REPROOF_CONSUMPTION_USED_SENTINEL")
                && recallText.includes("request-provider-reproof-consumption-used"),
            cautionRecallIsFeedbackMemory: cautionRecall.recalled.some((item) => item.relPath === "provider-reproof-receipt-consumption-cautions.md" && item.type === "feedback")
                && cautionText.includes("PROVIDER_REPROOF_CONSUMPTION_IGNORED_SENTINEL"),
            strongClaimWarnsNotNativeProof: fs.readFileSync(path.join(dir, "provider-reproof-receipt-consumption-recall.md"), "utf-8")
                .includes("receipt strong is a consumption claim only"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                promotedCount: first.promotedCount,
                cautionCount: first.cautionCount,
                strongReceiptClaimCount: first.strongReceiptClaimCount,
            },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            recalled: recall.recalled.map((item) => item.relPath),
            cautionRecalled: cautionRecall.recalled.map((item) => `${item.type}:${item.relPath}`),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-provider-ranking-compact-repair-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const row = {
        groupId,
        timeline_binding_id: "timeline-provider-ranking-compact-repair-receipt",
        brief_id: "brief-provider-ranking-compact-repair-receipt",
        work_item_id: "work-provider-ranking-compact-repair-receipt",
        source: "worker_context_provider_ranking_provenance_compact_repair",
        project: "api",
        task_id: "task-provider-ranking-compact-repair-receipt",
        receipt_status: "completed",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        replay_repair_consumption_reason: "PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL verified provider ranking compact repair consumed typed MEMORY.md row provider-switch-execution:phase165-typed-memory.",
        provider_switch_decision_receipt_id: "provider-switch-decision:phase165-typed-memory",
        provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase165",
        provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
        provider_ranking_provenance_row_ids: ["provider-switch-execution:phase165-typed-memory"],
        provider_ranking_provenance_preserved: true,
        provider_ranking_provenance_receipt_consumption_verified: true,
        provider_ranking_provenance_repair_status: "completed",
        provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
        worker_context_packet_id: "wcp-provider-ranking-compact-repair-receipt",
        task_agent_session_id: "tas-provider-ranking-compact-repair-receipt",
        memory_context_snapshot_id: "snapshot-provider-ranking-compact-repair-receipt",
        execution_id: "execution-provider-ranking-compact-repair-receipt",
    };
    try {
        const first = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row] }, {
            reason: "provider-ranking-compact-repair-receipt-consumption-selftest",
            updatedAt: "2026-07-10T17:40:00.000Z",
        });
        const second = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row] }, {
            reason: "provider-ranking-compact-repair-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-10T17:41:00.000Z",
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const docFile = path.join(dir, "provider-ranking-provenance-compact-repair-receipt-memory.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL provider-switch-execution:phase165-typed-memory provider-switch-decision:phase165-typed-memory", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const archiveRows = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive?.rows || [];
        const checks = {
            archiveCountsVerifiedReceipt: first.archivedCount === 1
                && first.verifiedCount === 1
                && first.preservedCount === 1
                && first.relPathCount === 1
                && first.rowIdCount === 1,
            repeatDoesNotDuplicateRows: second.archivedCount === 1 && second.newRowCount === 0,
            ledgerPersistsArchive: ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive?.archived_count === 1
                && archiveRows.some((item) => item.provider_switch_decision_receipt_id === "provider-switch-decision:phase165-typed-memory"),
            typedDocWritten: docs.some(item => item.relPath === "provider-ranking-provenance-compact-repair-receipt-memory.md" && item.type === "reference")
                && docText.includes("PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL")
                && docText.includes("provider-switch-execution:phase165-typed-memory"),
            indexLinksTypedDoc: indexText.includes("provider-ranking-provenance-compact-repair-receipt-memory.md"),
            recallFindsVerifiedRepair: recallText.includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && recallText.includes("PROVIDER_RANKING_COMPACT_REPAIR_RECEIPT_SENTINEL"),
            authorizationBoundaryPreserved: /ranking evidence only, not authorization/i.test(docText)
                && /do not authorize provider switches|Never use this memory as provider-switch authority/i.test(docText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                verifiedCount: first.verifiedCount,
                preservedCount: first.preservedCount,
                relPathCount: first.relPathCount,
                rowIdCount: first.rowIdCount,
            },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest() {
    const groupId = `typed-memory-post-compact-reinjection-repair-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const row = {
        groupId,
        timeline_binding_id: "replay-repair-brief-timeline:phase179-distillation",
        brief_id: "replay-repair-dispatch-brief:phase179-distillation",
        work_item_id: "post-compact-reinjection-repair:phase179-distillation",
        source: "compact_boundary_replay_repair",
        component: "post_compact_reinject",
        project: "api",
        task_id: "task-phase179-distillation",
        assignment_id: "assignment-phase179-distillation",
        dispatch_key: "dispatch-phase179-distillation",
        reinjection_gate_id: "pcrg-phase179-distillation",
        post_compact_candidate_id: "pcrc-phase179-distillation",
        post_compact_candidate_kind: "file",
        post_compact_candidate_value: "src/phase179-distillation-memory.ts",
        post_compact_candidate_source_message_id: "message-phase179-distillation",
        post_compact_reinjection_receipt_usage_state: "verified",
        post_compact_reinjection_receipt_reason: "PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL re-read current source before accepting the recovered candidate.",
        post_compact_reinjection_current_source_verified: true,
        post_compact_reinjection_memory_receipt_matched: true,
        post_compact_reinjection_task_session_matched: true,
        post_compact_reinjection_native_session_matched: true,
        post_compact_reinjection_receipt_verified: true,
        receipt_status: "done",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        worker_context_packet_id: "wcp-phase179-distillation",
        worker_handoff_id: "handoff-phase179-distillation",
        memory_context_snapshot_id: "snapshot-phase179-distillation",
        memory_context_snapshot_checksum: "snapshot-checksum-phase179-distillation",
        task_agent_session_id: "task-agent-session-phase179-distillation",
        native_session_id: "native-session-phase179-distillation",
        execution_id: "execution-phase179-distillation",
        event_types: ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"],
        completion_source: "post_compact_reinjection_replay_repair_receipt_consumption",
        resolution_reason: "post_compact_reinjection_repair_receipt_verified",
        completed_at: "2026-07-10T23:20:00.000Z",
    };
    const ignoredRow = {
        ...row,
        timeline_binding_id: "replay-repair-brief-timeline:phase179-distillation-ignored",
        brief_id: "replay-repair-dispatch-brief:phase179-distillation-ignored",
        work_item_id: "post-compact-reinjection-repair:phase179-distillation-ignored",
        task_id: "task-phase179-distillation-ignored",
        assignment_id: "assignment-phase179-distillation-ignored",
        dispatch_key: "dispatch-phase179-distillation-ignored",
        reinjection_gate_id: "pcrg-phase179-distillation-ignored",
        post_compact_candidate_id: "pcrc-phase179-distillation-ignored",
        post_compact_candidate_value: "src/phase179-distillation-ignored.ts",
        post_compact_candidate_source_message_id: "message-phase179-distillation-ignored",
        post_compact_reinjection_receipt_usage_state: "ignored",
        post_compact_reinjection_receipt_reason: "PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL candidate was unrelated to the bound task.",
        post_compact_reinjection_current_source_verified: false,
        worker_context_packet_id: "wcp-phase179-distillation-ignored",
        worker_handoff_id: "handoff-phase179-distillation-ignored",
        memory_context_snapshot_id: "snapshot-phase179-distillation-ignored",
        memory_context_snapshot_checksum: "snapshot-checksum-phase179-distillation-ignored",
        task_agent_session_id: "task-agent-session-phase179-distillation-ignored",
        native_session_id: "native-session-phase179-distillation-ignored",
        execution_id: "execution-phase179-distillation-ignored",
    };
    try {
        const first = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row, ignoredRow] }, {
            reason: "post-compact-reinjection-repair-receipt-consumption-selftest",
            updatedAt: "2026-07-10T23:20:00.000Z",
        });
        const second = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row, ignoredRow] }, {
            reason: "post-compact-reinjection-repair-receipt-consumption-selftest-repeat",
            updatedAt: "2026-07-10T23:20:00.000Z",
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const docFile = path.join(dir, "post-compact-reinjection-repair-receipt-memory.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const cautionFile = path.join(dir, "post-compact-reinjection-repair-receipt-cautions.md");
        const cautionText = fs.readFileSync(cautionFile, "utf-8");
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const recall = buildGroupTypedMemoryRecall(groupId, [
            "PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL",
            "pcrg-phase179-distillation",
            "pcrc-phase179-distillation",
            "native-session-phase179-distillation",
        ].join(" "), {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const archive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
        const archiveRows = Array.isArray(archive.rows) ? archive.rows : [];
        const checks = {
            archiveCountsVerifiedCompletion: first.archivedCount === 2
                && first.restoredCount === 1
                && first.cautionCount === 1
                && first.verifiedCount === 1
                && first.ignoredCount === 1
                && first.currentSourceVerifiedCount === 1
                && first.taskSessionCount === 2
                && first.nativeSessionCount === 2,
            repeatIsIdempotent: second.archivedCount === 2
                && second.newRowCount === 0
                && second.updatedRowCount === 2,
            ledgerPersistsExactIdentity: archive.archived_count === 2
                && archiveRows.some((item) => item.reinjection_gate_id === "pcrg-phase179-distillation"
                    && item.post_compact_candidate_id === "pcrc-phase179-distillation"
                    && item.task_agent_session_id === "task-agent-session-phase179-distillation"
                    && item.native_session_id === "native-session-phase179-distillation"),
            typedReferenceWritten: docs.some(item => item.relPath === "post-compact-reinjection-repair-receipt-memory.md" && item.type === "reference")
                && docText.includes("PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL")
                && docText.includes("post_compact_reinjection_replay_repair_receipt_consumption")
                && docText.includes("post_compact_reinjection_repair_receipt_verified"),
            ignoredCompletionStaysFeedback: docs.some(item => item.relPath === "post-compact-reinjection-repair-receipt-cautions.md" && item.type === "feedback")
                && cautionText.includes("PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL")
                && cautionText.includes("[ignored]")
                && !docText.includes("PHASE179_POST_COMPACT_REINJECTION_IGNORED_SENTINEL"),
            indexLinksTypedMemory: indexText.includes("post-compact-reinjection-repair-receipt-memory.md"),
            recallFindsVerifiedCompletion: recallText.includes("post-compact-reinjection-repair-receipt-memory.md")
                && recallText.includes("PHASE179_POST_COMPACT_REINJECTION_TYPED_MEMORY_SENTINEL"),
            freshnessBoundaryPreserved: /historical repair completion is recovery evidence, not permanent repository truth/i.test(docText)
                && /Future use must reverify the current source/i.test(docText)
                && /historical repair completion is recovery evidence, not permanent repository truth/i.test(cautionText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: {
                archivedCount: first.archivedCount,
                restoredCount: first.restoredCount,
                cautionCount: first.cautionCount,
                verifiedCount: first.verifiedCount,
                ignoredCount: first.ignoredCount,
                taskSessionCount: first.taskSessionCount,
                nativeSessionCount: first.nativeSessionCount,
            },
            second: {
                archivedCount: second.archivedCount,
                newRowCount: second.newRowCount,
                updatedRowCount: second.updatedRowCount,
            },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest() {
    const suffix = `${process.pid}-${Date.now().toString(36)}`;
    const groupId = `typed-memory-completion-preservation-closure-${suffix}`;
    const otherGroupId = `${groupId}-other`;
    const dir = getGroupTypedMemoryDir(groupId);
    const otherDir = getGroupTypedMemoryDir(otherGroupId);
    const item = {
        group_id: groupId,
        source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair",
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: "post-compact-completion-preservation-repair:PHASE186",
        assignment_id: "phase186-assignment",
        dispatch_key: "phase186-dispatch",
        worker_context_packet_id: "phase186-failed-packet",
        binding_id: "phase186-failed-binding",
        compact_retry_id: "phase186-failed-retry",
        compact_outcome_id: "phase186-failed-outcome",
        compact_hook_run_id: "phase186-failed-hook",
        corrected_compact_retry_id: "phase186-corrected-retry",
        corrected_compact_outcome_id: "phase186-corrected-outcome",
        corrected_compact_hook_run_id: "phase186-corrected-hook",
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: ["post-compact-receipt-memory-usage-repair:PHASE186"],
        completion_preservation_timeline_binding_ids: ["replay-repair-brief-timeline:PHASE186"],
        completion_preservation_historical_task_agent_session_ids: ["phase186-original-task-session"],
        completion_preservation_historical_native_session_ids: ["phase186-original-native-session"],
        completion_preservation_current_session_binding_id: "phase186-closure-binding",
        completion_preservation_current_task_agent_session_id: "phase186-closure-task-session",
        completion_preservation_current_native_session_id: "phase186-closure-native-session",
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: "phase186-failed-retry",
            failed_outcome_id: "phase186-failed-outcome",
            corrected_retry_id: "phase186-corrected-retry",
            corrected_outcome_id: "phase186-corrected-outcome",
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: "2026-07-12T06:50:00.000Z",
        },
        completedAt: "2026-07-12T06:50:00.000Z",
    };
    try {
        const first = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [item] }, {
            reason: "phase186-distillation-selftest",
            updatedAt: "2026-07-12T06:51:00.000Z",
        });
        const second = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [item] }, {
            reason: "phase186-distillation-selftest-repeat",
            updatedAt: "2026-07-12T06:52:00.000Z",
        });
        const crossGroup = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(otherGroupId, { rows: [item] }, {
            reason: "phase186-cross-group-isolation-selftest",
            updatedAt: "2026-07-12T06:53:00.000Z",
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const otherLedger = readGroupTypedMemoryDistillationLedger(otherGroupId);
        const docFile = path.join(dir, "post-compact-completion-memory-preservation-repair-closures.md");
        const docText = fs.readFileSync(docFile, "utf-8");
        const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
        const recall = buildGroupTypedMemoryRecall(groupId, "phase186-failed-outcome phase186-corrected-outcome completion memory preservation authority boundary", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const rows = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
        const otherRows = otherLedger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
        const checks = {
            archiveStoresVerifiedClosure: first.archivedCount === 1
                && first.verifiedCount === 1
                && first.failedOutcomeCount === 1
                && first.correctedOutcomeCount === 1,
            repeatIsIdempotent: second.archivedCount === 1 && second.newRowCount === 0 && second.updatedRowCount === 1,
            ledgerKeepsExactIdentity: rows.length === 1
                && rows[0].failed_outcome_id === "phase186-failed-outcome"
                && rows[0].corrected_outcome_id === "phase186-corrected-outcome"
                && rows[0].completion_work_item_ids.includes("post-compact-receipt-memory-usage-repair:PHASE186")
                && rows[0].completion_timeline_binding_ids.includes("replay-repair-brief-timeline:PHASE186"),
            typedDocAndIndexWritten: fs.existsSync(docFile)
                && indexText.includes("post-compact-completion-memory-preservation-repair-closures.md")
                && docText.includes("phase186-failed-outcome")
                && docText.includes("phase186-corrected-outcome"),
            freshnessAndAuthorityBoundaryPersisted: /historical repair completion is recovery evidence, not permanent repository truth/i.test(docText)
                && /never authorize that future session|Never use this history as current repository truth/i.test(docText)
                && /current-source|current source/i.test(docText),
            recallFindsClosure: recallText.includes("post-compact-completion-memory-preservation-repair-closures.md")
                && recallText.includes("phase186-corrected-outcome"),
            crossGroupIsolation: crossGroup.archivedCount === 0 && otherRows.length === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { archivedCount: first.archivedCount, verifiedCount: first.verifiedCount, newRowCount: first.newRowCount },
            second: { archivedCount: second.archivedCount, newRowCount: second.newRowCount, updatedRowCount: second.updatedRowCount },
            crossGroup: { archivedCount: crossGroup.archivedCount },
            recalled: (recall.recalled || []).map((row) => row.relPath),
        };
    }
    finally {
        for (const target of [dir, otherDir]) {
            try {
                fs.rmSync(target, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runGroupTypedMemoryDistillationQualitySelfTest() {
    const groupId = `typed-memory-quality-selftest-${process.pid}-${Date.now().toString(36)}`;
    const dir = getGroupTypedMemoryDir(groupId);
    const missingPath = "src/missing-distillation-quality.ts";
    const messages = [
        {
            id: "dq-u0",
            role: "user",
            target: "coordinator",
            content: "必须长期保留 DISTILL_QUALITY_SENTINEL_20260707，并核验 package.json 与 src/missing-distillation-quality.ts。",
        },
        {
            id: "dq-a1",
            role: "assistant",
            agent: "quality-agent",
            task_id: "quality-task",
            content: "完成 quality-task，已查看 package.json。",
            receipt: { status: "done", taskId: "quality-task", summary: "完成 package.json 检查" },
        },
        {
            id: "dq-a2",
            role: "assistant",
            agent: "quality-agent",
            task_id: "quality-task",
            content: `执行失败：quality-task blocked，${missingPath} 不存在，需要继续修复。`,
            receipt: { status: "failed", taskId: "quality-task", summary: "missing path" },
        },
    ];
    try {
        const distillation = distillGroupMessagesToTypedMemory(groupId, messages, {}, { reason: "quality-selftest", projectRoot: process.cwd() });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const quality = distillation.quality || {};
        const fileCheck = (quality.checks || []).find((check) => check.id === "file_path_claims_checked") || {};
        const contradictionCheck = (quality.checks || []).find((check) => check.id === "no_unresolved_status_contradictions") || {};
        const sourceCheck = (quality.checks || []).find((check) => check.id === "source_message_links_preserved") || {};
        const checks = {
            qualityReportCreated: quality.schema === "ccm-group-typed-memory-distillation-quality-v1",
            qualityStoredInLedger: ledger.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1",
            stalePathDetected: quality.stalePathCount > 0 && fileCheck.pass === false && JSON.stringify(fileCheck.gaps || []).includes(missingPath),
            existingPathNotFlagged: !JSON.stringify(fileCheck.gaps || []).includes("package.json ->"),
            contradictionDetected: quality.contradictionCount > 0 && contradictionCheck.pass === false && JSON.stringify(contradictionCheck.gaps || []).includes("quality-task"),
            sourceLinksPreserved: sourceCheck.pass === true,
            qualityStatusNotPass: quality.status === "degraded" || quality.status === "failed",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            quality: {
                score: quality.score,
                status: quality.status,
                stalePathCount: quality.stalePathCount,
                contradictionCount: quality.contradictionCount,
            },
        };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=group-memory-index.js.map