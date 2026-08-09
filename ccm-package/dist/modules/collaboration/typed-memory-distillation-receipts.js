"use strict";
// typed-memory-distillation-receipts.ts — merged from 5 part files (behavior-freeze merge).
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
exports.postCompactCompletionMemoryPreservationClosureReceiptSourceReliability = postCompactCompletionMemoryPreservationClosureReceiptSourceReliability;
exports.getGroupTypedMemoryDistillationLedgerFile = getGroupTypedMemoryDistillationLedgerFile;
exports.getGroupTypedMemoryDistillationLockFile = getGroupTypedMemoryDistillationLockFile;
exports.getGroupTypedMemoryDistillationTransactionStateFile = getGroupTypedMemoryDistillationTransactionStateFile;
exports.groupTypedMemoryDistillationLockChecksum = groupTypedMemoryDistillationLockChecksum;
exports.groupTypedMemoryDistillationStateChecksum = groupTypedMemoryDistillationStateChecksum;
exports.typedMemoryDistillationProcessAlive = typedMemoryDistillationProcessAlive;
exports.typedMemoryDistillationWait = typedMemoryDistillationWait;
exports.inspectGroupTypedMemoryDistillationLock = inspectGroupTypedMemoryDistillationLock;
exports.readGroupTypedMemoryDistillationTransactionState = readGroupTypedMemoryDistillationTransactionState;
exports.writeGroupTypedMemoryDistillationTransactionState = writeGroupTypedMemoryDistillationTransactionState;
exports.nextGroupTypedMemoryDistillationFencingToken = nextGroupTypedMemoryDistillationFencingToken;
exports.writeGroupTypedMemoryDistillationLockHandle = writeGroupTypedMemoryDistillationLockHandle;
exports.acquireGroupTypedMemoryDistillationLock = acquireGroupTypedMemoryDistillationLock;
exports.verifyGroupTypedMemoryDistillationLock = verifyGroupTypedMemoryDistillationLock;
exports.renewGroupTypedMemoryDistillationLock = renewGroupTypedMemoryDistillationLock;
exports.releaseGroupTypedMemoryDistillationLock = releaseGroupTypedMemoryDistillationLock;
exports.runGroupTypedMemoryDistillationMutation = runGroupTypedMemoryDistillationMutation;
exports.extractGroupLogPositiveFeedbackLifecycleRequests = extractGroupLogPositiveFeedbackLifecycleRequests;
exports.positiveFeedbackLifecycleEventChecksum = positiveFeedbackLifecycleEventChecksum;
exports.applyGroupPositiveFeedbackLifecycle = applyGroupPositiveFeedbackLifecycle;
exports.groupLogDistillationAdmission = groupLogDistillationAdmission;
exports.addDistilledCandidate = addDistilledCandidate;
exports.extractGroupLogDistillationCandidates = extractGroupLogDistillationCandidates;
exports.applyGroupLogDistillationAdmission = applyGroupLogDistillationAdmission;
exports.filterExistingDistilledFactsByAdmission = filterExistingDistilledFactsByAdmission;
exports.buildGroupLogDistillationAdmissionLedger = buildGroupLogDistillationAdmissionLedger;
exports.readGroupTypedMemoryDistillationLedger = readGroupTypedMemoryDistillationLedger;
exports.pruneDistilledFacts = pruneDistilledFacts;
exports.renderDistilledMemoryBody = renderDistilledMemoryBody;
exports.preservedGroupTypedMemoryDistillationArchives = preservedGroupTypedMemoryDistillationArchives;
exports.modelExtractionTypedArchiveChecksum = modelExtractionTypedArchiveChecksum;
exports.modelExtractionReceiptChecksum = modelExtractionReceiptChecksum;
exports.modelExtractionArtifactChecksum = modelExtractionArtifactChecksum;
exports.modelExtractionGraphChecksum = modelExtractionGraphChecksum;
exports.modelExtractionEvidenceComparable = modelExtractionEvidenceComparable;
exports.verifyModelExtractionGraphForTypedMemory = verifyModelExtractionGraphForTypedMemory;
exports.validateModelExtractionTypedMemoryInput = validateModelExtractionTypedMemoryInput;
exports.modelExtractionTopicConceptProfile = modelExtractionTopicConceptProfile;
exports.modelExtractionTopicConcepts = modelExtractionTopicConcepts;
exports.modelExtractionTopicSimilarity = modelExtractionTopicSimilarity;
exports.modelExtractionTopicDisplayConcept = modelExtractionTopicDisplayConcept;
exports.modelExtractionTopicSlug = modelExtractionTopicSlug;
exports.buildGroupSessionModelExtractionTypedMemoryTopics = buildGroupSessionModelExtractionTypedMemoryTopics;
exports.renderModelExtractionTypedMemoryBody = renderModelExtractionTypedMemoryBody;
exports.distillGroupSessionModelExtractionToTypedMemory = distillGroupSessionModelExtractionToTypedMemory;
exports.normalizeProviderReproofReceiptConsumptionStatus = normalizeProviderReproofReceiptConsumptionStatus;
exports.providerReproofReceiptConsumptionCategory = providerReproofReceiptConsumptionCategory;
exports.providerReproofReceiptConsumptionRecommendation = providerReproofReceiptConsumptionRecommendation;
exports.providerReproofReceiptConsumptionRowId = providerReproofReceiptConsumptionRowId;
exports.providerReproofReceiptConsumptionInputRows = providerReproofReceiptConsumptionInputRows;
exports.normalizeProviderReproofReceiptConsumptionRows = normalizeProviderReproofReceiptConsumptionRows;
exports.mergeProviderReproofReceiptConsumptionRows = mergeProviderReproofReceiptConsumptionRows;
exports.renderProviderReproofReceiptConsumptionBody = renderProviderReproofReceiptConsumptionBody;
exports.providerReproofReceiptConsumptionArchive = providerReproofReceiptConsumptionArchive;
exports.distillProviderReproofReceiptConsumptionToTypedMemory = distillProviderReproofReceiptConsumptionToTypedMemory;
exports.providerRankingProvenanceCompactRepairReceiptConsumptionInputRows = providerRankingProvenanceCompactRepairReceiptConsumptionInputRows;
exports.providerRankingProvenanceStringList = providerRankingProvenanceStringList;
exports.providerRankingProvenanceCompactRepairReceiptConsumptionRowId = providerRankingProvenanceCompactRepairReceiptConsumptionRowId;
exports.normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows = normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows;
exports.mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows = mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows;
exports.providerRankingProvenanceCompactRepairReceiptConsumptionArchive = providerRankingProvenanceCompactRepairReceiptConsumptionArchive;
exports.renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody = renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody;
exports.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory;
exports.postCompactReinjectionRepairReceiptConsumptionInputRows = postCompactReinjectionRepairReceiptConsumptionInputRows;
exports.normalizePostCompactReinjectionRepairReceiptUsageState = normalizePostCompactReinjectionRepairReceiptUsageState;
exports.postCompactReinjectionRepairReceiptConsumptionRowId = postCompactReinjectionRepairReceiptConsumptionRowId;
exports.normalizePostCompactReinjectionRepairReceiptConsumptionRows = normalizePostCompactReinjectionRepairReceiptConsumptionRows;
exports.mergePostCompactReinjectionRepairReceiptConsumptionRows = mergePostCompactReinjectionRepairReceiptConsumptionRows;
exports.postCompactReinjectionRepairReceiptConsumptionArchive = postCompactReinjectionRepairReceiptConsumptionArchive;
exports.renderPostCompactReinjectionRepairReceiptConsumptionBody = renderPostCompactReinjectionRepairReceiptConsumptionBody;
exports.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory;
exports.postCompactReceiptMemoryUsageRepairCompletionInputRows = postCompactReceiptMemoryUsageRepairCompletionInputRows;
exports.postCompactReceiptMemoryUsageRepairCompletionRowId = postCompactReceiptMemoryUsageRepairCompletionRowId;
exports.normalizePostCompactReceiptMemoryUsageRepairCompletionRows = normalizePostCompactReceiptMemoryUsageRepairCompletionRows;
exports.mergePostCompactReceiptMemoryUsageRepairCompletionRows = mergePostCompactReceiptMemoryUsageRepairCompletionRows;
exports.postCompactReceiptMemoryUsageRepairCompletionArchive = postCompactReceiptMemoryUsageRepairCompletionArchive;
exports.renderPostCompactReceiptMemoryUsageRepairCompletionBody = renderPostCompactReceiptMemoryUsageRepairCompletionBody;
exports.distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory;
exports.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile;
exports.conflictResolutionMaintenanceNotificationReceiptChecksum = conflictResolutionMaintenanceNotificationReceiptChecksum;
exports.readConflictResolutionMaintenanceNotificationReceiptLedger = readConflictResolutionMaintenanceNotificationReceiptLedger;
exports.writeConflictResolutionMaintenanceNotificationReceiptLedger = writeConflictResolutionMaintenanceNotificationReceiptLedger;
exports.createConflictResolutionMaintenanceNotificationReceipt = createConflictResolutionMaintenanceNotificationReceipt;
exports.inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum;
exports.readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger;
exports.writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger = writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger;
exports.mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger = mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile;
exports.cleanupCommitRepairResolutionReceiptChecksum = cleanupCommitRepairResolutionReceiptChecksum;
exports.cleanupCommitRepairResolutionReceiptStateChecksum = cleanupCommitRepairResolutionReceiptStateChecksum;
exports.writeCleanupCommitRepairResolutionReceipts = writeCleanupCommitRepairResolutionReceipts;
exports.cleanupCommitRepairResolutionReceiptLedgerValid = cleanupCommitRepairResolutionReceiptLedgerValid;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt;
exports.revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt;
exports.conflictResolutionGcApprovalReceiptChecksum = conflictResolutionGcApprovalReceiptChecksum;
exports.createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt;
exports.executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt;
exports.distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory;
exports.providerRankingMemoryUsageReceiptRepairInputRows = providerRankingMemoryUsageReceiptRepairInputRows;
exports.providerRankingMemoryUsageReceiptRepairRowId = providerRankingMemoryUsageReceiptRepairRowId;
exports.normalizeProviderRankingMemoryUsageReceiptRepairRows = normalizeProviderRankingMemoryUsageReceiptRepairRows;
exports.mergeProviderRankingMemoryUsageReceiptRepairRows = mergeProviderRankingMemoryUsageReceiptRepairRows;
exports.providerRankingMemoryUsageReceiptRepairArchive = providerRankingMemoryUsageReceiptRepairArchive;
exports.renderProviderRankingMemoryUsageReceiptRepairBody = renderProviderRankingMemoryUsageReceiptRepairBody;
exports.distillProviderRankingMemoryUsageReceiptRepairToTypedMemory = distillProviderRankingMemoryUsageReceiptRepairToTypedMemory;
exports.providerDispatchOverrideFollowupInputRows = providerDispatchOverrideFollowupInputRows;
exports.providerDispatchOverrideFollowupDecision = providerDispatchOverrideFollowupDecision;
exports.providerDispatchOverrideFollowupReceipt = providerDispatchOverrideFollowupReceipt;
exports.providerDispatchOverrideFollowupCompletion = providerDispatchOverrideFollowupCompletion;
exports.providerDispatchOverrideFollowupRepair = providerDispatchOverrideFollowupRepair;
exports.providerDispatchOverrideFollowupUsageRows = providerDispatchOverrideFollowupUsageRows;
exports.providerDispatchOverrideFollowupRowId = providerDispatchOverrideFollowupRowId;
exports.normalizeProviderDispatchOverrideFollowupRows = normalizeProviderDispatchOverrideFollowupRows;
exports.mergeProviderDispatchOverrideFollowupRows = mergeProviderDispatchOverrideFollowupRows;
exports.pressureProvenanceProviderDispatchOverrideFollowupArchive = pressureProvenanceProviderDispatchOverrideFollowupArchive;
exports.renderPressureProvenanceProviderDispatchOverrideFollowupBody = renderPressureProvenanceProviderDispatchOverrideFollowupBody;
exports.distillProviderDispatchOverrideFollowupToTypedMemory = distillProviderDispatchOverrideFollowupToTypedMemory;
exports.providerSwitchExecutionInputRows = providerSwitchExecutionInputRows;
exports.providerSwitchExecutionReceiptFromInput = providerSwitchExecutionReceiptFromInput;
exports.providerSwitchDecisionReceiptFromInput = providerSwitchDecisionReceiptFromInput;
exports.providerSwitchExecutionSessionBindingFromInput = providerSwitchExecutionSessionBindingFromInput;
exports.providerSwitchExecutionRowId = providerSwitchExecutionRowId;
exports.normalizeProviderSwitchExecutionRows = normalizeProviderSwitchExecutionRows;
exports.mergeProviderSwitchExecutionRows = mergeProviderSwitchExecutionRows;
exports.providerSwitchExecutionArchive = providerSwitchExecutionArchive;
exports.renderProviderSwitchExecutionBody = renderProviderSwitchExecutionBody;
exports.distillProviderSwitchExecutionToTypedMemory = distillProviderSwitchExecutionToTypedMemory;
exports.providerDispatchOverrideFollowupReceiptValidationInputRows = providerDispatchOverrideFollowupReceiptValidationInputRows;
exports.providerDispatchOverrideFollowupReceiptValidationRowId = providerDispatchOverrideFollowupReceiptValidationRowId;
exports.normalizeProviderDispatchOverrideFollowupReceiptValidationRows = normalizeProviderDispatchOverrideFollowupReceiptValidationRows;
exports.mergeProviderDispatchOverrideFollowupReceiptValidationRows = mergeProviderDispatchOverrideFollowupReceiptValidationRows;
exports.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive = pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive;
exports.renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody = renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody;
exports.distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory = distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory;
exports.ignoreMemoryReceiptRepairInputRows = ignoreMemoryReceiptRepairInputRows;
exports.ignoreMemoryReceiptRepairRowId = ignoreMemoryReceiptRepairRowId;
exports.normalizeIgnoreMemoryReceiptRepairRows = normalizeIgnoreMemoryReceiptRepairRows;
exports.mergeIgnoreMemoryReceiptRepairRows = mergeIgnoreMemoryReceiptRepairRows;
exports.ignoreMemoryReceiptRepairArchive = ignoreMemoryReceiptRepairArchive;
exports.renderIgnoreMemoryReceiptRepairBody = renderIgnoreMemoryReceiptRepairBody;
exports.distillIgnoreMemoryReceiptRepairToTypedMemory = distillIgnoreMemoryReceiptRepairToTypedMemory;
exports.pressureMemoryProvenanceReceiptRepairInputRows = pressureMemoryProvenanceReceiptRepairInputRows;
exports.pressureMemoryProvenanceReceiptRepairRowId = pressureMemoryProvenanceReceiptRepairRowId;
exports.normalizePressureMemoryProvenanceReceiptRepairRows = normalizePressureMemoryProvenanceReceiptRepairRows;
exports.mergePressureMemoryProvenanceReceiptRepairRows = mergePressureMemoryProvenanceReceiptRepairRows;
exports.pressureMemoryProvenanceReceiptRepairArchive = pressureMemoryProvenanceReceiptRepairArchive;
exports.renderPressureMemoryProvenanceReceiptRepairBody = renderPressureMemoryProvenanceReceiptRepairBody;
exports.distillPressureMemoryProvenanceReceiptRepairToTypedMemory = distillPressureMemoryProvenanceReceiptRepairToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceToTypedMemory = distillPressureProvenancePreDispatchComplianceToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory = distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory;
exports.summarizeProviderDispatchOverrideFollowupPolicyAttributions = summarizeProviderDispatchOverrideFollowupPolicyAttributions;
exports.summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions = summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions;
exports.summarizeProviderSwitchExecutionPolicyAttributions = summarizeProviderSwitchExecutionPolicyAttributions;
exports.scoreProviderSwitchExecutionRows = scoreProviderSwitchExecutionRows;
exports.providerDispatchReliabilityNowMs = providerDispatchReliabilityNowMs;
exports.providerDispatchReliabilityRound = providerDispatchReliabilityRound;
exports.providerDispatchReliabilityDecayWeight = providerDispatchReliabilityDecayWeight;
exports.scoreProviderDispatchReliabilityRows = scoreProviderDispatchReliabilityRows;
exports.listProviderDispatchReliabilityDistillationLedgers = listProviderDispatchReliabilityDistillationLedgers;
exports.loadProviderDispatchReliabilitySources = loadProviderDispatchReliabilitySources;
exports.buildProviderDispatchReliabilitySignalFromSources = buildProviderDispatchReliabilitySignalFromSources;
exports.buildCrossGroupProviderDispatchReliabilitySignal = buildCrossGroupProviderDispatchReliabilitySignal;
exports.providerDispatchReliabilitySourceProvenance = providerDispatchReliabilitySourceProvenance;
exports.buildGlobalProviderDispatchReliabilitySignals = buildGlobalProviderDispatchReliabilitySignals;
exports.getGlobalProviderDispatchReliabilitySnapshotFile = getGlobalProviderDispatchReliabilitySnapshotFile;
exports.globalProviderDispatchReliabilitySnapshotPayloadChecksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum;
exports.globalProviderDispatchReliabilitySnapshotChecksum = globalProviderDispatchReliabilitySnapshotChecksum;
exports.writeGlobalProviderDispatchReliabilitySnapshot = writeGlobalProviderDispatchReliabilitySnapshot;
exports.validateGlobalProviderDispatchReliabilitySnapshot = validateGlobalProviderDispatchReliabilitySnapshot;
exports.readGlobalProviderDispatchReliabilitySnapshot = readGlobalProviderDispatchReliabilitySnapshot;
exports.getOrRefreshGlobalProviderDispatchReliabilitySnapshot = getOrRefreshGlobalProviderDispatchReliabilitySnapshot;
exports.contextUsageRepairInputRows = contextUsageRepairInputRows;
exports.contextUsageRepairRowId = contextUsageRepairRowId;
exports.normalizeContextUsageRepairStatus = normalizeContextUsageRepairStatus;
exports.normalizeContextUsageRepairRows = normalizeContextUsageRepairRows;
exports.mergeContextUsageRepairRows = mergeContextUsageRepairRows;
exports.contextUsageRepairArchive = contextUsageRepairArchive;
exports.renderContextUsageRepairBody = renderContextUsageRepairBody;
exports.distillContextUsageRepairToTypedMemory = distillContextUsageRepairToTypedMemory;
exports.compactStrategyInputStrategy = compactStrategyInputStrategy;
exports.compactStrategyInputOutcomes = compactStrategyInputOutcomes;
exports.normalizeCompactStrategyCategories = normalizeCompactStrategyCategories;
exports.normalizeCompactStrategyOutcomeRows = normalizeCompactStrategyOutcomeRows;
exports.compactStrategyTypedArchive = compactStrategyTypedArchive;
exports.renderCompactStrategyReferenceBody = renderCompactStrategyReferenceBody;
exports.renderCompactStrategyCautionBody = renderCompactStrategyCautionBody;
exports.distillCompactStrategyToTypedMemory = distillCompactStrategyToTypedMemory;
exports.normalizePtlEmergencyHintForTypedMemory = normalizePtlEmergencyHintForTypedMemory;
exports.normalizePtlEmergencyOutcomeRows = normalizePtlEmergencyOutcomeRows;
exports.ptlEmergencyTypedArchive = ptlEmergencyTypedArchive;
exports.renderPtlEmergencyTypedBody = renderPtlEmergencyTypedBody;
exports.distillPtlEmergencyDowngradeToTypedMemory = distillPtlEmergencyDowngradeToTypedMemory;
exports.addDistillationQualityCheck = addDistillationQualityCheck;
exports.distillationQualityPenalty = distillationQualityPenalty;
exports.collectDistilledFacts = collectDistilledFacts;
exports.evaluateGroupTypedMemoryDistillationQuality = evaluateGroupTypedMemoryDistillationQuality;
exports.groupTypedMemoryDistillationArchiveFingerprint = groupTypedMemoryDistillationArchiveFingerprint;
exports.buildGroupTypedMemoryDistillationWorkState = buildGroupTypedMemoryDistillationWorkState;
exports.inspectGroupTypedMemoryDistillationWork = inspectGroupTypedMemoryDistillationWork;
exports.distillGroupMessagesToTypedMemoryUnlocked = distillGroupMessagesToTypedMemoryUnlocked;
exports.distillGroupMessagesToTypedMemory = distillGroupMessagesToTypedMemory;
exports.distillGroupMessagesToTypedMemoryUntilCaughtUp = distillGroupMessagesToTypedMemoryUntilCaughtUp;
exports.buildGroupSessionModelExtractionTopicRecallIndex = buildGroupSessionModelExtractionTopicRecallIndex;
exports.scoreGroupSessionModelExtractionTopicRecall = scoreGroupSessionModelExtractionTopicRecall;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const main_agent_context_source_continuity_1 = require("../../system/main-agent-context-source-continuity");
const utils_1 = require("../../core/utils");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
// ===== merged from typed-memory-distillation-receipts-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
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
        reliability: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(Math.max(0.1, Math.min(1, reliability)), 4),
    };
}
function getGroupTypedMemoryDistillationLedgerFile(groupId) {
    return require("./group-memory-distillation").getGroupTypedMemoryDistillationLedgerFile(groupId);
}
function getGroupTypedMemoryDistillationLockFile(groupId) {
    return require("./group-memory-distillation").getGroupTypedMemoryDistillationLockFile(groupId);
}
function getGroupTypedMemoryDistillationTransactionStateFile(groupId) {
    return require("./group-memory-distillation").getGroupTypedMemoryDistillationTransactionStateFile(groupId);
}
function groupTypedMemoryDistillationLockChecksum(lock = {}) {
    return (0, typed_memory_shared_1.checksum)({
        schema: lock.schema || "",
        version: Number(lock.version || 0),
        groupId: lock.groupId || "",
        leaseId: lock.leaseId || "",
        fencingToken: Number(lock.fencingToken || 0),
        ownerPid: Number(lock.ownerPid || 0),
        ownerHostname: lock.ownerHostname || "",
        status: lock.status || "",
        acquiredAt: lock.acquiredAt || "",
        renewedAt: lock.renewedAt || "",
        expiresAt: lock.expiresAt || "",
        renewalCount: Number(lock.renewalCount || 0),
    }, 64);
}
function groupTypedMemoryDistillationStateChecksum(state = {}) {
    return (0, typed_memory_shared_1.checksum)({
        schema: state.schema || "",
        version: Number(state.version || 0),
        groupId: state.groupId || "",
        status: state.status || "",
        mutationKind: state.mutationKind || "",
        mutationKinds: Array.isArray(state.mutationKinds) ? state.mutationKinds.map(String) : [],
        lastMutationKind: state.lastMutationKind || "",
        leaseId: state.leaseId || "",
        fencingToken: Number(state.fencingToken || 0),
        lastFencingToken: Number(state.lastFencingToken || 0),
        lastCommittedFencingToken: Number(state.lastCommittedFencingToken || 0),
        recoveredLeaseCount: Number(state.recoveredLeaseCount || 0),
        waitedMs: Number(state.waitedMs || 0),
        writeCount: Number(state.writeCount || 0),
        startedAt: state.startedAt || "",
        completedAt: state.completedAt || "",
        failedAt: state.failedAt || "",
        error: state.error || "",
        updatedAt: state.updatedAt || "",
    }, 64);
}
function typedMemoryDistillationProcessAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function typedMemoryDistillationWait(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return;
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, Math.floor(ms)));
    }
    catch { }
}
function inspectGroupTypedMemoryDistillationLock(groupId, options = {}) {
    return require("./group-memory-distillation").inspectGroupTypedMemoryDistillationLock(groupId, options);
}
function readGroupTypedMemoryDistillationTransactionState(groupId) {
    return require("./group-memory-distillation").readGroupTypedMemoryDistillationTransactionState(groupId);
}
function writeGroupTypedMemoryDistillationTransactionState(groupId, value) {
    const file = getGroupTypedMemoryDistillationTransactionStateFile(groupId);
    const state = {
        schema: "ccm-group-typed-memory-distillation-transaction-state-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        ...value,
    };
    state.stateChecksum = groupTypedMemoryDistillationStateChecksum(state);
    (0, typed_memory_shared_1.writeJsonAtomic)(file, state);
    return { ...state, file };
}
function nextGroupTypedMemoryDistillationFencingToken(groupId, abandonedLock = null) {
    const state = readGroupTypedMemoryDistillationTransactionState(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(getGroupTypedMemoryDistillationLedgerFile(groupId), {});
    const timestampFloor = Date.now() * 1000 + Math.abs(process.pid % 1000);
    return Math.max(timestampFloor, Number(state.valid ? state.state?.lastFencingToken || state.state?.fencingToken || 0 : 0) + 1, Number(ledger?.distillationMutation?.fencingToken || ledger?.distillationTransaction?.fencingToken || 0) + 1, Number(abandonedLock?.fencingToken || 0) + 1);
}
function writeGroupTypedMemoryDistillationLockHandle(handle, patch = {}) {
    const lock = { ...handle.lock, ...patch };
    delete lock.lockChecksum;
    lock.lockChecksum = groupTypedMemoryDistillationLockChecksum(lock);
    fs.ftruncateSync(handle.fd, 0);
    fs.writeSync(handle.fd, JSON.stringify(lock, null, 2), 0, "utf-8");
    fs.fsyncSync(handle.fd);
    handle.lock = lock;
    return lock;
}
function acquireGroupTypedMemoryDistillationLock(groupId, options = {}) {
    const file = getGroupTypedMemoryDistillationLockFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const maxWaitMs = Math.max(0, Math.min(30_000, Number(options.transactionMaxWaitMs ?? options.transaction_max_wait_ms ?? 10_000)));
    const ttlMs = Math.max(10_000, Math.min(10 * 60_000, Number(options.transactionTtlMs ?? options.transaction_ttl_ms ?? 120_000)));
    const corruptGraceMs = Math.max(250, Math.min(30_000, Number(options.transactionCorruptGraceMs ?? options.transaction_corrupt_grace_ms ?? 5_000)));
    let waitedMs = 0;
    let recoveredLeaseCount = 0;
    let abandonedLock = null;
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const status = inspectGroupTypedMemoryDistillationLock(groupId);
        if (status.present) {
            if (status.active || (!status.valid && status.ageMs < corruptGraceMs)) {
                if (waitedMs >= maxWaitMs)
                    return { acquired: false, reason: status.active ? "distillation_lock_busy" : "distillation_lock_corrupt_grace", waitedMs, status };
                const waitMs = Math.min(maxWaitMs - waitedMs, Math.max(5, Math.min(100, 5 * Math.pow(1.35, Math.min(attempt, 20)))));
                typedMemoryDistillationWait(waitMs);
                waitedMs += waitMs;
                continue;
            }
            abandonedLock = status.lock;
            const archive = `${file}.abandoned.${(0, typed_memory_shared_1.checksum)([status.lock?.leaseId || "invalid", Date.now(), crypto.randomBytes(4).toString("hex")], 20)}`;
            try {
                fs.renameSync(file, archive);
                recoveredLeaseCount += 1;
                (0, typed_memory_ledgers_1.pruneCleanupMetadataArchives)(path.dirname(file), `${path.basename(file)}.abandoned.`, 32);
            }
            catch {
                continue;
            }
        }
        let fd = -1;
        try {
            fd = fs.openSync(file, "wx+");
            const acquiredAt = (0, typed_memory_shared_1.now)();
            const fencingToken = nextGroupTypedMemoryDistillationFencingToken(groupId, abandonedLock);
            const leaseId = `gtmdl_${(0, typed_memory_shared_1.checksum)([groupId, fencingToken, process.pid, crypto.randomBytes(12).toString("hex")], 32)}`;
            const handle = {
                fd,
                file,
                released: false,
                waitedMs,
                recoveredLeaseCount,
                ttlMs,
                lock: {
                    schema: "ccm-group-typed-memory-distillation-lock-v1",
                    version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
                    groupId,
                    leaseId,
                    fencingToken,
                    ownerPid: process.pid,
                    ownerHostname: os.hostname(),
                    status: "active",
                    acquiredAt,
                    renewedAt: acquiredAt,
                    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
                    renewalCount: 0,
                },
            };
            writeGroupTypedMemoryDistillationLockHandle(handle);
            const priorState = readGroupTypedMemoryDistillationTransactionState(groupId);
            writeGroupTypedMemoryDistillationTransactionState(groupId, {
                status: "in_progress",
                mutationKind: String(options.mutationKind || options.mutation_kind || ""),
                mutationKinds: (0, typed_memory_shared_1.uniqueStrings)([options.mutationKind || options.mutation_kind].filter(Boolean).map(String), 32),
                leaseId,
                fencingToken,
                lastFencingToken: fencingToken,
                lastCommittedFencingToken: Number(priorState.valid ? priorState.state?.lastCommittedFencingToken || 0 : 0),
                recoveredLeaseCount: Number(priorState.valid ? priorState.state?.recoveredLeaseCount || 0 : 0) + recoveredLeaseCount,
                waitedMs,
                writeCount: 0,
                startedAt: acquiredAt,
                completedAt: "",
                failedAt: "",
                error: "",
                updatedAt: acquiredAt,
            });
            return { acquired: true, handle, lock: handle.lock, waitedMs, recoveredLeaseCount };
        }
        catch (error) {
            if (fd >= 0)
                try {
                    fs.closeSync(fd);
                }
                catch { }
            if (error?.code === "EEXIST")
                continue;
            return { acquired: false, reason: "distillation_lock_acquire_failed", waitedMs, error: String(error?.message || error) };
        }
    }
    return { acquired: false, reason: "distillation_lock_contended", waitedMs };
}
function verifyGroupTypedMemoryDistillationLock(handle) {
    if (!handle || handle.released === true || Number(handle.fd) < 0)
        return { owned: false, reason: "lock_handle_unavailable" };
    const status = inspectGroupTypedMemoryDistillationLock(String(handle.lock?.groupId || ""), { file: handle.file });
    const owned = status.valid === true
        && status.active === true
        && String(status.lock?.leaseId || "") === String(handle.lock?.leaseId || "")
        && Number(status.lock?.fencingToken || 0) === Number(handle.lock?.fencingToken || 0);
    return { owned, reason: owned ? "owned" : status.present ? "lock_replaced_or_invalid" : "lock_missing", status };
}
function renewGroupTypedMemoryDistillationLock(handle) {
    const before = verifyGroupTypedMemoryDistillationLock(handle);
    if (!before.owned)
        return { renewed: false, reason: before.reason, verification: before };
    const renewedAt = (0, typed_memory_shared_1.now)();
    writeGroupTypedMemoryDistillationLockHandle(handle, {
        renewedAt,
        expiresAt: new Date(Date.now() + Number(handle.ttlMs || 120_000)).toISOString(),
        renewalCount: Number(handle.lock?.renewalCount || 0) + 1,
    });
    const after = verifyGroupTypedMemoryDistillationLock(handle);
    return { renewed: after.owned, reason: after.owned ? "renewed" : after.reason, verification: after, lock: handle.lock };
}
function releaseGroupTypedMemoryDistillationLock(handle, finalStatus = "completed") {
    if (!handle || handle.released === true || Number(handle.fd) < 0)
        return false;
    const releasedAt = (0, typed_memory_shared_1.now)();
    try {
        writeGroupTypedMemoryDistillationLockHandle(handle, {
            status: "released",
            releasedAt,
            expiresAt: releasedAt,
            finalStatus,
        });
    }
    catch { }
    try {
        fs.closeSync(handle.fd);
    }
    catch { }
    handle.fd = -1;
    handle.released = true;
    const current = (0, typed_memory_shared_1.readJson)(handle.file, null);
    if (current?.leaseId === handle.lock?.leaseId && Number(current?.fencingToken || 0) === Number(handle.lock?.fencingToken || 0)) {
        try {
            fs.unlinkSync(handle.file);
        }
        catch { }
    }
    return true;
}
function runGroupTypedMemoryDistillationMutation(groupId, mutationKind, options, operation) {
    return require("./group-memory-distillation").runGroupTypedMemoryDistillationMutation(groupId, mutationKind, options, operation);
}
function extractGroupLogPositiveFeedbackLifecycleRequests(groupId, messages = []) {
    const requests = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if ((0, typed_memory_index_build_1.normalizeGroupDirectMemoryRequest)(groupId, message, index))
            continue;
        const content = (0, typed_memory_shared_1.messageContent)(message);
        const requested = (0, typed_memory_shared_1.normalizeGroupLogMemoryRevocation)(message);
        const explicit = requested.revoked === true || typed_memory_shared_1.GROUP_LOG_POSITIVE_REVOCATION_PATTERN.test(content);
        if (message?.role !== "user" || !explicit)
            continue;
        let inferred = null;
        if (!requested.targetConfirmationMessageId && !requested.targetApproachMessageId) {
            for (let cursor = index - 1; cursor >= Math.max(0, index - 12); cursor -= 1) {
                const candidate = (0, typed_memory_shared_1.buildGroupLogPositiveConfirmationCandidate)(groupId, messages, cursor);
                if (!candidate)
                    continue;
                const admission = groupLogDistillationAdmission({
                    category: "feedback",
                    type: "validated_approach",
                    text: candidate.text,
                    memoryAdmission: candidate.memoryAdmission,
                    confirmation: candidate.confirmation,
                });
                if (admission.admitted) {
                    inferred = candidate.confirmation;
                    break;
                }
            }
        }
        const admission = (0, typed_memory_shared_1.normalizeGroupLogMemoryAdmission)(message);
        const reason = requested.reason
            || admission.why
            || (typed_memory_shared_1.GROUP_LOG_RATIONALE_PATTERN.test(content) ? (0, typed_memory_shared_1.compactText)(content, 500) : "");
        requests.push({
            schema: "ccm-group-positive-feedback-lifecycle-request-v1",
            revocationMessageId: (0, typed_memory_shared_1.messageIdentity)(message, index),
            sourceIndex: index,
            targetConfirmationMessageId: requested.targetConfirmationMessageId || inferred?.confirmationMessageId || "",
            targetApproachMessageId: requested.targetApproachMessageId || inferred?.targetMessageId || "",
            targetApproachChecksum: requested.targetApproachChecksum || inferred?.targetMessageChecksum || "",
            claimedGroupSessionScopeId: requested.groupSessionScopeId,
            scopeMatches: !requested.groupSessionScopeId || requested.groupSessionScopeId === groupId,
            reason,
            replacementRule: requested.replacementRule,
            howToApply: requested.howToApply || admission.howToApply || "",
            currentSourceEvidence: requested.currentSourceEvidence,
            bindingMode: inferred ? "adjacent_confirmation" : "explicit_lifecycle_binding",
        });
    }
    return requests;
}
function positiveFeedbackLifecycleEventChecksum(event) {
    return (0, typed_memory_shared_1.checksum)([
        event.schema,
        event.groupId,
        event.eventId,
        event.action,
        event.targetFactId,
        event.targetConfirmationMessageId,
        event.targetApproachMessageId,
        event.targetApproachChecksum,
        event.revocationMessageId,
        event.replacementFactId,
        event.replacementMessageId,
        event.reason,
        event.evidenceTier,
        event.currentSourceProof?.proofId || "",
        event.revokedAt,
    ], 64);
}
function applyGroupPositiveFeedbackLifecycle(groupId, facts, requests = [], previous = {}, options = {}) {
    const events = new Map();
    for (const raw of Array.isArray(previous?.events) ? previous.events : []) {
        if (!raw?.eventId)
            continue;
        const expected = positiveFeedbackLifecycleEventChecksum(raw);
        if (raw.eventChecksum === expected)
            events.set(String(raw.eventId), raw);
    }
    const observations = new Map();
    for (const raw of Array.isArray(previous?.observations) ? previous.observations : []) {
        if (raw?.observationId)
            observations.set(String(raw.observationId), raw);
    }
    const feedbackFacts = facts.feedback || {};
    let appliedThisRun = 0;
    let rejectedThisRun = 0;
    let invalidBindingThisRun = 0;
    const observeRejection = (request, reason) => {
        rejectedThisRun += 1;
        if (/(?:target|scope|checksum|proof|binding)/.test(reason))
            invalidBindingThisRun += 1;
        const observationId = (0, typed_memory_shared_1.checksum)([request.revocationMessageId, reason], 24);
        const prior = observations.get(observationId);
        observations.set(observationId, {
            observationId,
            revocationMessageId: String(request.revocationMessageId || ""),
            reason,
            firstSeenAt: prior?.firstSeenAt || options.updatedAt || (0, typed_memory_shared_1.now)(),
            lastSeenAt: options.updatedAt || (0, typed_memory_shared_1.now)(),
            count: Number(prior?.count || 0) + 1,
        });
    };
    for (const request of requests.sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
        const priorEvent = [...events.values()].find((event) => event.revocationMessageId === request.revocationMessageId);
        if (priorEvent) {
            const replayedTarget = Object.entries(feedbackFacts).find(([, fact]) => fact?.id === priorEvent.targetFactId);
            if (replayedTarget)
                delete feedbackFacts[replayedTarget[0]];
            continue;
        }
        if (request.scopeMatches !== true) {
            observeRejection(request, "positive_feedback_revocation_scope_mismatch");
            continue;
        }
        if (!request.targetConfirmationMessageId && !request.targetApproachMessageId) {
            observeRejection(request, "positive_feedback_revocation_target_binding_missing");
            continue;
        }
        const matches = Object.entries(feedbackFacts).filter(([, fact]) => {
            if (fact?.type !== "validated_approach")
                return false;
            const binding = fact?.confirmation || {};
            if (request.targetConfirmationMessageId && binding.confirmationMessageId !== request.targetConfirmationMessageId)
                return false;
            if (request.targetApproachMessageId && binding.targetMessageId !== request.targetApproachMessageId)
                return false;
            return true;
        });
        if (matches.length !== 1) {
            observeRejection(request, matches.length ? "positive_feedback_revocation_target_ambiguous" : "positive_feedback_revocation_target_missing");
            continue;
        }
        const [targetKey, targetFact] = matches[0];
        const targetChecksum = String(targetFact?.confirmation?.targetMessageChecksum || "");
        if (!/^[a-f0-9]{64}$/.test(targetChecksum)) {
            observeRejection(request, "positive_feedback_revocation_target_checksum_unproven");
            continue;
        }
        if (request.targetApproachChecksum && request.targetApproachChecksum !== targetChecksum) {
            observeRejection(request, "positive_feedback_revocation_checksum_mismatch");
            continue;
        }
        if (!request.reason) {
            observeRejection(request, "positive_feedback_revocation_reason_missing");
            continue;
        }
        const currentSourceProof = (0, typed_memory_shared_1.verifyGroupLogLifecycleCurrentSourceEvidence)(request.currentSourceEvidence, String(options.projectRoot || ""));
        if (request.currentSourceEvidence && currentSourceProof.valid !== true) {
            observeRejection(request, `positive_feedback_revocation_source_proof_${currentSourceProof.status}`);
            continue;
        }
        const replacementEntry = Object.entries(feedbackFacts).find(([, fact]) => fact?.type === "user_correction"
            && fact?.messageId === request.revocationMessageId
            && (!request.replacementRule || (0, typed_memory_shared_1.compactText)(fact?.text || "", 900) === request.replacementRule));
        const replacementFact = replacementEntry?.[1] || null;
        const action = replacementFact ? "superseded" : "revoked";
        const eventId = `pfl_${(0, typed_memory_shared_1.checksum)([groupId, request.revocationMessageId, targetFact.id || targetKey, targetChecksum], 28)}`;
        const revokedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
        const event = {
            schema: "ccm-group-positive-feedback-lifecycle-event-v1",
            version: typed_memory_shared_1.GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
            groupId,
            eventId,
            action,
            targetFactId: String(targetFact.id || targetKey),
            targetConfirmationMessageId: String(targetFact.confirmation?.confirmationMessageId || ""),
            targetApproachMessageId: String(targetFact.confirmation?.targetMessageId || ""),
            targetApproachChecksum: targetChecksum,
            revocationMessageId: request.revocationMessageId,
            bindingMode: request.bindingMode,
            reason: request.reason,
            replacementFactId: String(replacementFact?.id || ""),
            replacementMessageId: String(replacementFact?.messageId || ""),
            evidenceTier: currentSourceProof.valid === true ? "system_current_source_file_proof" : "bound_user_revocation",
            currentSourceProof: currentSourceProof.valid === true ? currentSourceProof : null,
            revokedAt,
        };
        event.eventChecksum = positiveFeedbackLifecycleEventChecksum(event);
        events.set(eventId, event);
        delete feedbackFacts[targetKey];
        appliedThisRun += 1;
    }
    const boundedEvents = [...events.values()]
        .sort((a, b) => String(a.revokedAt || "").localeCompare(String(b.revokedAt || "")))
        .slice(-500);
    const boundedObservations = [...observations.values()]
        .sort((a, b) => String(a.lastSeenAt || "").localeCompare(String(b.lastSeenAt || "")))
        .slice(-500);
    const activeValidatedCount = Object.values(feedbackFacts).filter((fact) => fact?.type === "validated_approach").length;
    return {
        facts,
        lifecycle: {
            schema: "ccm-group-positive-feedback-lifecycle-v1",
            version: typed_memory_shared_1.GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
            groupId,
            activeValidatedCount,
            revokedCount: boundedEvents.filter((event) => event.action === "revoked").length,
            supersededCount: boundedEvents.filter((event) => event.action === "superseded").length,
            currentSourceProofCount: boundedEvents.filter((event) => event.evidenceTier === "system_current_source_file_proof").length,
            eventCount: boundedEvents.length,
            observationCount: boundedObservations.length,
            appliedThisRun,
            rejectedThisRun,
            invalidBindingThisRun,
            events: boundedEvents,
            observations: boundedObservations,
            updatedAt: options.updatedAt || (0, typed_memory_shared_1.now)(),
        },
    };
}
function groupLogDistillationAdmission(candidate) {
    const text = String(candidate?.text || "");
    const structured = candidate?.memoryAdmission || {};
    const activityNoise = typed_memory_shared_1.GROUP_LOG_ACTIVITY_NOISE_PATTERN.test(text);
    const ephemeral = typed_memory_shared_1.GROUP_LOG_EPHEMERAL_PATTERN.test(text);
    const durable = structured.futureApplicable === true || typed_memory_shared_1.GROUP_LOG_DURABLE_PATTERN.test(text);
    const nonObvious = structured.surprising === true || structured.nonObvious === true || typed_memory_shared_1.GROUP_LOG_NON_OBVIOUS_PATTERN.test(text);
    const rationale = String(structured.why || "").trim() || (typed_memory_shared_1.GROUP_LOG_RATIONALE_PATTERN.test(text) ? (0, typed_memory_shared_1.compactText)(text, 420) : "");
    const howToApply = String(structured.howToApply || "").trim();
    const type = String(candidate?.type || "");
    const category = (0, typed_memory_shared_1.normalizeMemoryType)(candidate?.category);
    const reject = (reason, hardExclusion = false) => ({
        admitted: false,
        reason,
        hardExclusion,
        durable,
        nonObvious,
        hasRationale: !!rationale,
        confidence: 0,
        why: "",
        howToApply: "",
    });
    const admit = (reason, confidence, defaultHow) => ({
        admitted: true,
        reason,
        hardExclusion: false,
        durable,
        nonObvious,
        hasRationale: !!rationale,
        confidence,
        why: rationale || (category === "user" ? "The user marked this rule as durable across conversations." : ""),
        howToApply: howToApply || defaultHow,
    });
    if (candidate?.directMemory?.requestId && candidate?.sourceRole === "user" && type === "explicit_remember") {
        return admit("explicit_user_remember", 1, "Apply only inside this group session unless the user explicitly forgets or supersedes it.");
    }
    if (activityNoise)
        return reject("activity_log_noise", true);
    if (["completed_work", "assignment"].includes(type))
        return reject("ephemeral_task_activity", true);
    if (["files", "skills", "verification"].includes(type))
        return reject("derivable_current_project_state", true);
    if (ephemeral && !durable)
        return reject("ephemeral_current_task_state", true);
    if (category === "user" && type === "requirement") {
        return durable
            ? admit("durable_user_rule", 0.9, "Apply this rule to future matching group tasks unless the user supersedes it.")
            : reject("missing_cross_session_durability");
    }
    if (category === "feedback" && type === "user_correction") {
        return durable && nonObvious && !!rationale
            ? admit("non_obvious_user_feedback", 0.95, "Apply the corrected approach to future matching work and preserve the stated reason.")
            : reject("feedback_missing_non_obvious_reason_or_future_scope");
    }
    if (category === "feedback" && type === "validated_approach") {
        const binding = candidate?.confirmation || {};
        if (binding?.schema !== "ccm-group-positive-feedback-binding-v1" || binding.explicit !== true) {
            return reject("positive_confirmation_missing_binding");
        }
        if (binding.targetFound !== true || binding.targetSourceRole !== "assistant") {
            return reject("positive_confirmation_target_missing_or_not_assistant");
        }
        if (binding.scopeMatches !== true)
            return reject("positive_confirmation_scope_mismatch", true);
        if (binding.checksumMatches !== true)
            return reject("positive_confirmation_checksum_mismatch", true);
        if (binding.targetEligible !== true || !durable || !nonObvious || !rationale || !howToApply) {
            return reject("positive_confirmation_target_not_durable_non_obvious_or_explained");
        }
        return admit("validated_non_obvious_approach", 0.95, howToApply);
    }
    if (category === "feedback" && type === "failure_or_blocker") {
        const recurring = /(?:反复|多次|再次|累计|recurring|repeated|again|\b[2-9]\d*\s+times?\b)/i.test(text);
        return durable && nonObvious && !!rationale && recurring
            ? admit("recurring_non_obvious_failure", 0.8, "Use this as a prevention rule for future matching tasks; verify current repository state first.")
            : reject("one_off_failure_or_blocker");
    }
    if (category === "project" && ["technical_decision", "dispatch_decision"].includes(type)) {
        return durable && nonObvious && !!rationale
            ? admit("non_obvious_project_motivation", 0.8, "Use the motivation when judging future scope; verify current implementation before acting.")
            : reject("project_decision_missing_non_obvious_reason_or_future_scope");
    }
    if (category === "reference" && type === "external_resource") {
        return typed_memory_shared_1.GROUP_LOG_RESOURCE_PURPOSE_PATTERN.test(text)
            ? admit("external_resource_with_purpose", 0.85, "Consult this resource when its stated purpose matches the current task.")
            : reject("external_resource_missing_purpose");
    }
    return reject("unsupported_long_term_memory_shape");
}
function addDistilledCandidate(candidates, category, type, message, index, text, overrides = {}) {
    const bounded = (0, typed_memory_shared_1.compactText)(text, 900);
    if (!bounded)
        return;
    const messageId = (0, typed_memory_shared_1.messageIdentity)(message, index);
    const actor = (0, typed_memory_shared_1.messageActor)(message);
    const key = (0, typed_memory_shared_1.checksum)([category, type, messageId, bounded], 24);
    candidates.push({
        id: key,
        category,
        type,
        messageId,
        sourceIndex: Number(message?.__typedMemorySourceIndex ?? index),
        actor,
        sourceRole: String(message?.role || ""),
        timestamp: String(message?.timestamp || message?.time || ""),
        text: bounded,
        checksum: key,
        memoryAdmission: overrides.memoryAdmission || (0, typed_memory_shared_1.normalizeGroupLogMemoryAdmission)(message),
        sourceRefs: (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(overrides.sourceRefs, overrides.source_refs, message?.sourceRefs, message?.source_refs, message?.contextSourceRefs, message?.context_source_refs, message?.citations, message?.evidence, bounded),
        ...(overrides.confirmation ? { confirmation: overrides.confirmation } : {}),
    });
}
function extractGroupLogDistillationCandidates(groupId, messages = []) {
    const candidates = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        // Explicit remember/forget is committed by the direct-memory transaction below.
        // Keeping it out of heuristic extraction prevents a second, differently keyed fact.
        if ((0, typed_memory_index_build_1.normalizeGroupDirectMemoryRequest)(groupId, message, index))
            continue;
        const content = (0, typed_memory_shared_1.messageContent)(message);
        if (!content)
            continue;
        const actor = (0, typed_memory_shared_1.messageActor)(message);
        const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
        const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
        const revocation = (0, typed_memory_shared_1.normalizeGroupLogMemoryRevocation)(message);
        const lifecycleSignal = message?.role === "user" && (revocation.revoked === true || typed_memory_shared_1.GROUP_LOG_POSITIVE_REVOCATION_PATTERN.test(content));
        if (message?.role === "user" && revocation.replacementRule) {
            const replacementAdmission = (0, typed_memory_shared_1.normalizeGroupLogMemoryAdmission)(message);
            addDistilledCandidate(candidates, "feedback", "user_correction", message, index, revocation.replacementRule, {
                memoryAdmission: {
                    ...replacementAdmission,
                    futureApplicable: true,
                    why: revocation.reason || replacementAdmission.why,
                    howToApply: revocation.howToApply || replacementAdmission.howToApply,
                    requestedByUser: true,
                },
            });
        }
        if (message?.role === "user" && !lifecycleSignal && !revocation.replacementRule && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|目标|长期|撤回|不再|改为|must\b|never\b|always\b|do not\b|no longer\b|instead\b|required?\b)/i.test(content)) {
            const correction = typed_memory_shared_1.GROUP_LOG_USER_CORRECTION_PATTERN.test(content);
            addDistilledCandidate(candidates, correction ? "feedback" : "user", correction ? "user_correction" : "requirement", message, index, content);
        }
        const positiveConfirmation = (0, typed_memory_shared_1.buildGroupLogPositiveConfirmationCandidate)(groupId, messages, index);
        if (positiveConfirmation) {
            addDistilledCandidate(candidates, "feedback", "validated_approach", message, index, positiveConfirmation.text, positiveConfirmation);
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
        const files = (0, typed_memory_shared_1.uniqueStrings)((0, typed_memory_shared_1.extractMessageFiles)(message), 12);
        if (files.length)
            addDistilledCandidate(candidates, "reference", "files", message, index, `${actor}: ${files.join(", ")} | ${(0, typed_memory_shared_1.compactText)(content, 300)}`);
        const skills = (0, typed_memory_shared_1.uniqueStrings)((0, typed_memory_shared_1.extractMessageSkills)(message), 10);
        if (skills.length)
            addDistilledCandidate(candidates, "reference", "skills", message, index, `${actor}: ${skills.map(item => `Skill:${item}`).join(", ")}`);
        const verification = (0, typed_memory_shared_1.uniqueStrings)((0, typed_memory_shared_1.extractMessageVerification)(message), 10);
        if (verification.length)
            addDistilledCandidate(candidates, "reference", "verification", message, index, `${actor}: ${verification.join(", ")}`);
        if (typed_memory_shared_1.GROUP_LOG_EXTERNAL_RESOURCE_PATTERN.test(content)) {
            addDistilledCandidate(candidates, "reference", "external_resource", message, index, content);
        }
    }
    return candidates;
}
function applyGroupLogDistillationAdmission(candidates = []) {
    const admitted = [];
    const rejected = [];
    for (const candidate of candidates) {
        const admission = groupLogDistillationAdmission(candidate);
        const row = { ...candidate, admission };
        if (admission.admitted)
            admitted.push(row);
        else
            rejected.push(row);
    }
    return { admitted, rejected };
}
function filterExistingDistilledFactsByAdmission(facts = {}) {
    const admittedFacts = {};
    const rejected = [];
    for (const category of ["user", "project", "feedback", "reference"]) {
        admittedFacts[category] = {};
        for (const [key, fact] of Object.entries(facts?.[category] || {})) {
            const admission = groupLogDistillationAdmission({ ...fact, category });
            if (admission.admitted)
                admittedFacts[category][key] = { ...fact, category, admission, count: 1 };
            else
                rejected.push({ ...fact, category, admission });
        }
    }
    return { admittedFacts, rejected };
}
function buildGroupLogDistillationAdmissionLedger(previous = {}, admitted = [], rejected = [], evicted = [], updatedAt = (0, typed_memory_shared_1.now)()) {
    const observations = new Map();
    for (const row of Array.isArray(previous?.observations) ? previous.observations : []) {
        if (row?.observationId)
            observations.set(String(row.observationId), { ...row, count: 1 });
    }
    for (const row of [...rejected, ...evicted]) {
        const reason = String(row?.admission?.reason || "rejected");
        const observationId = (0, typed_memory_shared_1.checksum)([row?.checksum || row?.id || "", reason], 24);
        const prior = observations.get(observationId);
        observations.set(observationId, {
            observationId,
            candidateId: String(row?.id || row?.checksum || ""),
            messageId: String(row?.messageId || ""),
            category: (0, typed_memory_shared_1.normalizeMemoryType)(row?.category),
            type: String(row?.type || ""),
            reason,
            hardExclusion: row?.admission?.hardExclusion === true,
            firstSeenAt: prior?.firstSeenAt || updatedAt,
            lastSeenAt: updatedAt,
            count: prior ? Math.max(1, Number(prior.count || 1)) : 1,
            evictedExistingFact: evicted.includes(row),
        });
    }
    const bounded = [...observations.values()]
        .sort((a, b) => String(a.lastSeenAt || "").localeCompare(String(b.lastSeenAt || "")))
        .slice(-500);
    const reasonCounts = {};
    for (const row of bounded)
        reasonCounts[row.reason] = Number(reasonCounts[row.reason] || 0) + Number(row.count || 0);
    const confirmationCandidates = [...admitted, ...rejected].filter(row => row?.type === "validated_approach");
    return {
        schema: "ccm-group-typed-memory-write-admission-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION,
        evaluatedThisRun: admitted.length + rejected.length,
        admittedThisRun: admitted.length,
        rejectedThisRun: rejected.length,
        evictedExistingFactCount: evicted.length,
        hardExclusionThisRun: rejected.filter(row => row?.admission?.hardExclusion === true).length,
        positiveConfirmationCandidateCount: confirmationCandidates.length,
        positiveConfirmationAdmittedCount: admitted.filter(row => row?.type === "validated_approach").length,
        positiveConfirmationRejectedCount: rejected.filter(row => row?.type === "validated_approach").length,
        positiveConfirmationInvalidBindingCount: rejected.filter(row => row?.type === "validated_approach" && /(?:binding|target|scope|checksum)/.test(String(row?.admission?.reason || ""))).length,
        admittedByCategory: admitted.reduce((acc, row) => {
            const category = (0, typed_memory_shared_1.normalizeMemoryType)(row.category);
            acc[category] = Number(acc[category] || 0) + 1;
            return acc;
        }, {}),
        reasonCounts,
        observationCount: bounded.length,
        observations: bounded,
        updatedAt,
    };
}
function readGroupTypedMemoryDistillationLedger(groupId) {
    return require("./group-memory-distillation").readGroupTypedMemoryDistillationLedger(groupId);
}
function pruneDistilledFacts(facts = {}, perTypeLimit = typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT) {
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
        `Generated by CCM long-term group-log distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "Each fact keeps its source message id so a future agent can recover the raw transcript before trusting file/function/flag claims.",
        "",
        "## Distilled Facts",
    ];
    for (const fact of facts) {
        const source = `#${fact.messageId || ""}`;
        const kind = fact.type ? `[${fact.type}] ` : "";
        const actor = fact.actor ? `${fact.actor}: ` : "";
        lines.push(`- ${source} ${kind}${actor}${(0, typed_memory_shared_1.compactText)(fact.text, 900)}`);
        if (fact?.memoryId)
            lines.push(`  - **Memory ID:** ${(0, typed_memory_shared_1.compactText)(fact.memoryId, 180)}`);
        if (fact?.confirmation?.targetMessageId)
            lines.push(`  - **Validated approach:** #${(0, typed_memory_shared_1.compactText)(fact.confirmation.targetMessageId, 160)} (${fact.confirmation.bindingMode || "bound"})`);
        if (fact?.admission?.why)
            lines.push(`  - **Why:** ${(0, typed_memory_shared_1.compactText)(fact.admission.why, 420)}`);
        if (fact?.admission?.howToApply)
            lines.push(`  - **How to apply:** ${(0, typed_memory_shared_1.compactText)(fact.admission.howToApply, 420)}`);
    }
    return lines.join("\n").trim() + "\n";
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
        "modelExtractionTypedMemoryArchive",
        "positiveFeedbackLifecycle",
    ];
    const out = {};
    for (const key of keys) {
        const value = ledgers.map((ledger) => ledger?.[key]).find((candidate) => candidate?.schema);
        if (value?.schema)
            out[key] = value;
    }
    return out;
}
function modelExtractionTypedArchiveChecksum(archive) {
    const payload = { ...(archive || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function modelExtractionReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.checksum;
    delete payload.receiptFile;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function modelExtractionArtifactChecksum(artifact) {
    const payload = { ...(artifact || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function modelExtractionGraphChecksum(graph) {
    const payload = { ...(graph || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function modelExtractionEvidenceComparable(value) {
    return String(value || "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/[`*]/g, "")
        .replace(/^_+|_+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
function verifyModelExtractionGraphForTypedMemory(graph) {
    if (graph?.schema !== "ccm-group-session-memory-fact-supersession-graph-v1"
        || !graph?.checksum
        || modelExtractionGraphChecksum(graph) !== String(graph.checksum || ""))
        return false;
    const facts = Array.isArray(graph.facts) ? graph.facts : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const factById = new Map(facts.map((fact) => [String(fact.factId || ""), fact]));
    return edges.every((edge) => {
        const oldFact = factById.get(String(edge.oldFactId || ""));
        return !!oldFact
            && oldFact.status === "superseded"
            && String(oldFact.factChecksum || "") === String(edge.oldFactChecksum || "")
            && String(oldFact.supersessionEdgeId || "") === String(edge.edgeId || "")
            && !!String(edge.sourceMessageId || "")
            && (0, typed_memory_shared_1.checksum)(edge.replacementText, 32) === String(edge.newFactChecksum || "")
            && (0, typed_memory_shared_1.checksum)(edge.sourceMessageText, 32) === String(edge.sourceMessageChecksum || "");
    });
}
function validateModelExtractionTypedMemoryInput(scopeId, input) {
    if (!(0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId))
        throw new Error("model_extraction_typed_memory_requires_exact_group_gcs_scope");
    const separator = scopeId.lastIndexOf("--gcs_");
    const groupId = scopeId.slice(0, separator);
    const groupSessionId = scopeId.slice(separator + 2);
    const receipt = input?.receipt || {};
    const graph = input?.factSupersessionGraph || receipt.factSupersessionGraph || {};
    const transcript = String(input?.transcript || "");
    const markdown = String(input?.markdown || "");
    const requestArtifact = input?.requestArtifact?.artifact || input?.requestArtifact || {};
    const resultArtifact = input?.resultArtifact?.artifact || input?.resultArtifact || {};
    if (receipt.schema !== "ccm-group-session-memory-model-extraction-receipt-v1"
        || receipt.status !== "committed"
        || modelExtractionReceiptChecksum(receipt) !== String(receipt.checksum || "")) {
        throw new Error("model_extraction_typed_memory_receipt_invalid");
    }
    if (String(receipt.groupId || "") !== groupId
        || String(receipt.groupSessionId || "") !== groupSessionId
        || String(receipt.scopeId || "") !== scopeId
        || !String(receipt.executionId || "")
        || Number(receipt.fencingToken || 0) <= 0) {
        throw new Error("model_extraction_typed_memory_receipt_scope_or_fence_invalid");
    }
    const expectedReceiptFile = path.resolve(utils_1.CCM_DIR, "group-session-memory", scopeId, "model-extraction-receipt.json");
    if (path.resolve(String(receipt.receiptFile || "")) !== expectedReceiptFile) {
        throw new Error("model_extraction_typed_memory_receipt_file_binding_invalid");
    }
    const persistedReceipt = (0, typed_memory_shared_1.readJson)(expectedReceiptFile, null);
    const currentReceiptValid = !!persistedReceipt
        && String(persistedReceipt.checksum || "") === String(receipt.checksum || "")
        && modelExtractionReceiptChecksum(persistedReceipt) === String(persistedReceipt.checksum || "");
    const resultArtifactValid = resultArtifact.schema === "ccm-group-session-memory-model-extraction-result-artifact-v1"
        && resultArtifact.status === "committed"
        && String(resultArtifact.scopeId || "") === scopeId
        && String(resultArtifact.executionId || "") === String(receipt.executionId || "")
        && String(resultArtifact.kind || "") === "result"
        && modelExtractionArtifactChecksum(resultArtifact) === String(resultArtifact.checksum || "")
        && String(resultArtifact.receipt?.checksum || "") === String(receipt.checksum || "")
        && modelExtractionReceiptChecksum(resultArtifact.receipt) === String(receipt.checksum || "")
        && String(resultArtifact.validated?.markdown || "") === markdown;
    if (!currentReceiptValid && !resultArtifactValid) {
        throw new Error("model_extraction_typed_memory_committed_receipt_missing_or_changed");
    }
    if (!verifyModelExtractionGraphForTypedMemory(graph)
        || String(receipt.factSupersessionGraphChecksum || "") !== String(graph.checksum || "")
        || String(graph.sourceTranscriptChecksum || "") !== String(receipt.requestAudit?.sourceTranscriptChecksum || "")
        || String(graph.outputMarkdownChecksum || "") !== (0, typed_memory_shared_1.checksum)(markdown, 24)
        || String(receipt.markdownChecksum || "") !== (0, typed_memory_shared_1.checksum)(markdown, 24)) {
        throw new Error("model_extraction_typed_memory_graph_or_markdown_binding_invalid");
    }
    let sourceRows = [];
    try {
        sourceRows = JSON.parse(transcript);
    }
    catch { }
    if (!Array.isArray(sourceRows)
        || (0, typed_memory_shared_1.checksum)(JSON.stringify(sourceRows), 32) !== String(receipt.requestAudit?.sourceTranscriptChecksum || "")) {
        throw new Error("model_extraction_typed_memory_transcript_checksum_invalid");
    }
    if (requestArtifact.schema !== "ccm-group-session-memory-model-extraction-request-artifact-v1"
        || String(requestArtifact.scopeId || "") !== scopeId
        || String(requestArtifact.executionId || "") !== String(receipt.executionId || "")
        || String(requestArtifact.transcript || "") !== transcript
        || String(requestArtifact.checksum || "") !== String(receipt.requestArtifactChecksum || "")
        || modelExtractionArtifactChecksum(requestArtifact) !== String(requestArtifact.checksum || "")
        || Number(requestArtifact.fencingToken || 0) !== Number(receipt.fencingToken || 0)) {
        throw new Error("model_extraction_typed_memory_request_artifact_invalid");
    }
    const expectedFence = Number(input?.extractionFencingToken || input?.extraction_fencing_token || 0);
    if (expectedFence > 0 && expectedFence !== Number(receipt.fencingToken || 0)) {
        throw new Error("model_extraction_typed_memory_extraction_fence_mismatch");
    }
    return { groupId, groupSessionId, receipt, graph, transcript, sourceRows, markdown, requestArtifact, resultArtifact, currentReceiptValid, resultArtifactValid };
}
function modelExtractionTopicConceptProfile(value) {
    const text = String(value || "").normalize("NFKC").replace(/https?:\/\/\S+/gi, " ");
    const semanticText = text.replace(/[_-]+/g, " ");
    const cjkCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const latinCharCount = (text.match(/[A-Za-z]/g) || []).length;
    const language = cjkCharCount >= 4 ? "cjk" : latinCharCount >= 4 ? "latin" : "unknown";
    const canonical = typed_memory_shared_1.MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS.filter(([, pattern]) => pattern.test(semanticText)).map(([concept]) => concept);
    const rawTokens = text.match(/[A-Z][A-Z0-9_]{3,}|[A-Za-z][A-Za-z0-9_-]{3,}|[\u4e00-\u9fff]{2,16}/g) || [];
    const lexical = [];
    const seen = new Set(canonical);
    for (const token of rawTokens) {
        let normalized = token.toLowerCase().replace(/^_+|_+$/g, "");
        normalized = normalized.replace(/^(?:必须长期使用|必须长期保留|必须长期记住|请长期记住|用户要求|长期使用|长期保留|长期记住)+/, "");
        if (!normalized || normalized.length < 2 || typed_memory_shared_1.MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS.has(normalized) || seen.has(normalized))
            continue;
        if (/^(?:phase\d+|current|future|matching|apply|inside|unless|policy|value_?\d*)$/.test(normalized))
            continue;
        if (/^[\u4e00-\u9fff]+$/.test(normalized) && /^(?:这个|那个|这样|如此|事情|内容|规则|要求)$/.test(normalized))
            continue;
        seen.add(normalized);
        lexical.push(normalized.slice(0, 80));
        if (lexical.length >= 12)
            break;
    }
    const identifierCount = lexical.filter(token => /[_\d]/.test(token) || /^[a-z][a-z0-9_-]{4,}$/i.test(token)).length;
    const cjkCount = lexical.filter(token => /^[\u4e00-\u9fff]+$/.test(token)).length;
    const confidence = canonical.length >= 2
        ? 0.95
        : canonical.length === 1 && lexical.length > 0
            ? 0.86
            : canonical.length === 1
                ? 0.72
                : identifierCount > 0
                    ? 0.78
                    : cjkCount > 0
                        ? 0.6
                        : lexical.length > 0
                            ? 0.56
                            : 0.2;
    return {
        concepts: (0, typed_memory_shared_1.uniqueStrings)([...canonical, ...lexical], 16),
        canonicalConcepts: canonical,
        lexicalConcepts: lexical,
        confidence,
        lowConfidence: confidence < typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE,
        language,
    };
}
function modelExtractionTopicConcepts(value) {
    return modelExtractionTopicConceptProfile(value).concepts;
}
function modelExtractionTopicSimilarity(left = [], right = []) {
    if (!left.length || !right.length)
        return 0;
    const a = new Set(left);
    const b = new Set(right);
    let overlap = 0;
    for (const item of a)
        if (b.has(item))
            overlap += 1;
    if (!overlap)
        return 0;
    const canonicalOverlap = [...a].filter(item => item.startsWith("domain_") && b.has(item)).length;
    const overlapCoefficient = overlap / Math.max(1, Math.min(a.size, b.size));
    const jaccard = overlap / Math.max(1, new Set([...a, ...b]).size);
    return Math.min(1, canonicalOverlap > 0
        ? 0.64 + Math.min(0.2, canonicalOverlap * 0.1) + (jaccard * 0.16)
        : (overlapCoefficient * 0.55) + (jaccard * 0.45));
}
function modelExtractionTopicDisplayConcept(concepts, category, topicId) {
    const preferred = concepts.find(concept => /[a-z0-9]/i.test(concept)) || concepts[0] || topicId.slice(-8);
    return `${category === "feedback" ? "Corrections" : "User constraints"}: ${preferred.replace(/[_-]+/g, " ")}`;
}
function modelExtractionTopicSlug(category, concepts, topicId) {
    const readable = concepts.find(concept => /^[a-z0-9][a-z0-9_-]{2,48}$/i.test(concept)) || "topic";
    return (0, typed_memory_shared_1.safeSegment)(`model-${category}-${readable}-${(0, typed_memory_shared_1.checksum)(topicId, 8)}`, `model-${category}-${(0, typed_memory_shared_1.checksum)(topicId, 12)}`).toLowerCase();
}
function buildGroupSessionModelExtractionTypedMemoryTopics(factsInput = {}, previousTopicsInput = {}, options = {}) {
    const at = String(options.at || (0, typed_memory_shared_1.now)());
    const maxPerCategory = Math.max(2, Math.min(100, Number(options.maxTopicsPerCategory || options.max_topics_per_category || typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY)));
    const facts = Object.fromEntries(Object.entries(factsInput || {}).map(([key, fact]) => [key, { ...fact }]));
    const previousTopics = Object.fromEntries(Object.entries(previousTopicsInput || {})
        .filter(([, topic]) => topic?.schema === "ccm-group-session-model-extraction-topic-v1")
        .map(([topicId, topic]) => {
        const normalizedConcepts = modelExtractionTopicConceptProfile((topic.concepts || []).join(" ")).concepts;
        return [topicId, { ...topic, concepts: (0, typed_memory_shared_1.uniqueStrings)([...(topic.concepts || []), ...normalizedConcepts], 20) }];
    }));
    for (const fact of Object.values(facts)) {
        const priorTopic = previousTopics[String(fact?.topicId || "")];
        if (!priorTopic || fact?.status !== "active")
            continue;
        const profile = modelExtractionTopicConceptProfile(fact.text);
        priorTopic.concepts = (0, typed_memory_shared_1.uniqueStrings)([...(priorTopic.concepts || []), ...profile.concepts], 20);
        priorTopic.languages = (0, typed_memory_shared_1.uniqueStrings)([...(priorTopic.languages || []), profile.language].filter(language => language !== "unknown"), 4);
        priorTopic.assignmentVersion = typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
    }
    const topicAliases = new Map();
    const priorRows = Object.values(previousTopics).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.topicId || "").localeCompare(String(b.topicId || "")));
    for (const topic of priorRows) {
        if (topic.status === "merged" && previousTopics[String(topic.mergedIntoTopicId || "")]) {
            topicAliases.set(topic.topicId, String(topic.mergedIntoTopicId));
        }
    }
    for (let index = 0; index < priorRows.length; index += 1) {
        const topic = priorRows[index];
        if (topicAliases.has(topic.topicId) || ["retired", "merged"].includes(String(topic.status || "")) || /_(?:general|unclassified)$/.test(String(topic.topicId || "")))
            continue;
        for (let cursor = index + 1; cursor < priorRows.length; cursor += 1) {
            const candidate = priorRows[cursor];
            if (candidate.category !== topic.category
                || topicAliases.has(candidate.topicId)
                || ["retired", "merged"].includes(String(candidate.status || ""))
                || /_(?:general|unclassified)$/.test(String(candidate.topicId || "")))
                continue;
            if (modelExtractionTopicSimilarity(topic.concepts || [], candidate.concepts || []) >= typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY) {
                topicAliases.set(candidate.topicId, topic.topicId);
            }
        }
    }
    const topics = new Map();
    for (const topic of priorRows) {
        const canonical = topicAliases.get(topic.topicId);
        if (canonical)
            continue;
        topics.set(topic.topicId, { ...topic, factChecksums: [], status: topic.status === "retired" ? "retired" : "inactive" });
    }
    let createdTopicCount = 0;
    let reusedTopicCount = 0;
    let lowConfidenceFactCount = 0;
    const activeFacts = Object.entries(facts)
        .filter(([, fact]) => fact?.status === "active" && ["user", "feedback"].includes(String(fact?.category || "")))
        .sort((a, b) => String(a[1].firstCommittedAt || "").localeCompare(String(b[1].firstCommittedAt || "")) || String(a[0]).localeCompare(String(b[0])));
    for (const [factChecksum, fact] of activeFacts) {
        const category = String(fact.category || "user");
        const profile = modelExtractionTopicConceptProfile(fact.text);
        const concepts = profile.concepts;
        const originalTopicId = String(fact.topicId || "");
        const priorTopicId = topicAliases.get(originalTopicId) || originalTopicId;
        let topic = null;
        let strategy = "new_semantic_topic";
        let similarityScore = 0;
        let crossLanguageReuse = false;
        if (profile.lowConfidence) {
            lowConfidenceFactCount += 1;
            const topicId = `met_${category}_unclassified`;
            topic = topics.get(topicId);
            if (!topic) {
                topic = {
                    schema: "ccm-group-session-model-extraction-topic-v1",
                    version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                    assignmentVersion: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                    topicId,
                    category,
                    name: category === "feedback" ? "Corrections: unclassified" : "User constraints: unclassified",
                    slug: `model-${category}-unclassified`,
                    concepts: ["unclassified"],
                    createdAt: at,
                    factChecksums: [],
                };
                topics.set(topicId, topic);
                createdTopicCount += 1;
            }
            else {
                reusedTopicCount += 1;
            }
            strategy = "low_confidence_unclassified";
        }
        else {
            topic = priorTopicId ? topics.get(priorTopicId) : null;
            if (topic && topic.category !== category)
                topic = null;
            if (topic) {
                strategy = topicAliases.has(originalTopicId) ? "historical_topic_rebalanced" : "stable_topic_reuse";
                similarityScore = modelExtractionTopicSimilarity(concepts, topic.concepts || []);
            }
        }
        if (!topic && !profile.lowConfidence) {
            const candidates = [...topics.values()]
                .filter(row => row.category === category && !["retired", "merged"].includes(String(row.status || "")) && !/_(?:general|unclassified)$/.test(String(row.topicId || "")))
                .map(row => ({ row, score: modelExtractionTopicSimilarity(concepts, row.concepts || []) }))
                .filter(item => item.score >= typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY)
                .sort((a, b) => b.score - a.score || String(a.row.createdAt || "").localeCompare(String(b.row.createdAt || "")));
            topic = candidates[0]?.row || null;
            if (topic) {
                similarityScore = candidates[0].score;
                strategy = "semantic_similarity_reuse";
                reusedTopicCount += 1;
                const topicCanonical = new Set((topic.concepts || []).filter((concept) => concept.startsWith("domain_")));
                const lexicalOverlap = profile.lexicalConcepts.some((concept) => (topic.concepts || []).includes(concept));
                const topicLanguages = new Set(topic.languages || []);
                crossLanguageReuse = !lexicalOverlap
                    && profile.language !== "unknown"
                    && topicLanguages.size > 0
                    && !topicLanguages.has(profile.language)
                    && profile.canonicalConcepts.some((concept) => topicCanonical.has(concept));
            }
        }
        if (!topic) {
            const categoryTopics = [...topics.values()].filter(row => row.category === category && row.status !== "retired");
            // Reserve one bounded slot for the deterministic overflow topic.
            if (categoryTopics.length >= maxPerCategory - 1) {
                const topicId = `met_${category}_general`;
                topic = topics.get(topicId);
                if (!topic) {
                    topic = {
                        schema: "ccm-group-session-model-extraction-topic-v1",
                        version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                        assignmentVersion: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                        topicId,
                        category,
                        name: category === "feedback" ? "Corrections: consolidated" : "User constraints: consolidated",
                        slug: `model-${category}-consolidated`,
                        concepts: ["consolidated"],
                        createdAt: at,
                        factChecksums: [],
                    };
                    topics.set(topicId, topic);
                    createdTopicCount += 1;
                }
                strategy = "capacity_consolidated";
            }
            else {
                const identityConcepts = concepts.length ? concepts.slice(0, 4) : [(0, typed_memory_shared_1.checksum)(fact.text, 12)];
                let topicId = `met_${(0, typed_memory_shared_1.checksum)([category, identityConcepts], 20)}`;
                let collision = 0;
                while (topics.has(topicId)) {
                    collision += 1;
                    topicId = `met_${(0, typed_memory_shared_1.checksum)([category, identityConcepts, collision], 20)}`;
                }
                topic = {
                    schema: "ccm-group-session-model-extraction-topic-v1",
                    version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                    assignmentVersion: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                    topicId,
                    category,
                    name: modelExtractionTopicDisplayConcept(identityConcepts, category, topicId),
                    slug: modelExtractionTopicSlug(category, identityConcepts, topicId),
                    concepts: identityConcepts,
                    createdAt: at,
                    factChecksums: [],
                };
                topics.set(topicId, topic);
                createdTopicCount += 1;
            }
        }
        else if (!["low_confidence_unclassified", "semantic_similarity_reuse"].includes(strategy)) {
            reusedTopicCount += 1;
        }
        topic.status = "active";
        delete topic.retiredAt;
        delete topic.mergedIntoTopicId;
        topic.updatedAt = at;
        topic.assignmentVersion = typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
        topic.concepts = (0, typed_memory_shared_1.uniqueStrings)([...(topic.concepts || []), ...concepts], 20);
        topic.languages = (0, typed_memory_shared_1.uniqueStrings)([...(topic.languages || []), profile.language].filter(language => language !== "unknown"), 4);
        topic.factChecksums = [...new Set([...(topic.factChecksums || []), factChecksum])];
        const rebalancedNow = !!originalTopicId && originalTopicId !== topic.topicId;
        const rebalanced = rebalancedNow || fact.topicAssignment?.rebalanced === true;
        facts[factChecksum] = {
            ...fact,
            topicId: topic.topicId,
            topicSlug: topic.slug,
            topicAssignment: {
                schema: "ccm-group-session-model-extraction-topic-assignment-v1",
                version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                strategy,
                confidence: profile.confidence,
                similarityScore: Number(similarityScore.toFixed(4)),
                lowConfidence: profile.lowConfidence,
                rebalanced,
                rebalancedFromTopicId: rebalancedNow ? originalTopicId : String(fact.topicAssignment?.rebalancedFromTopicId || ""),
                crossLanguageReuse: crossLanguageReuse || fact.topicAssignment?.crossLanguageReuse === true,
                initialStrategy: String(fact.topicAssignment?.initialStrategy || fact.topicAssignment?.strategy || strategy),
                language: profile.language,
                concepts: profile.concepts,
                firstAssignedAt: String(fact.topicAssignment?.firstAssignedAt || fact.topicAssignment?.assignedAt || at),
                assignedAt: at,
            },
        };
    }
    for (const category of ["user", "feedback"]) {
        const generalTopicId = `met_${category}_general`;
        const unclassifiedTopicId = `met_${category}_unclassified`;
        const regularTopics = [...topics.values()]
            .filter(topic => topic.category === category
            && topic.status === "active"
            && ![generalTopicId, unclassifiedTopicId].includes(topic.topicId)
            && (topic.factChecksums || []).length > 0)
            .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.topicId || "").localeCompare(String(b.topicId || "")));
        const unclassifiedActive = Number((topics.get(unclassifiedTopicId)?.factChecksums || []).length > 0);
        const generalAlreadyActive = Number((topics.get(generalTopicId)?.factChecksums || []).length > 0);
        const currentRegularLimit = Math.max(0, maxPerCategory - unclassifiedActive - generalAlreadyActive);
        if (regularTopics.length <= currentRegularLimit)
            continue;
        let generalTopic = topics.get(generalTopicId);
        if (!generalTopic) {
            generalTopic = {
                schema: "ccm-group-session-model-extraction-topic-v1",
                version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                assignmentVersion: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
                topicId: generalTopicId,
                category,
                name: category === "feedback" ? "Corrections: consolidated" : "User constraints: consolidated",
                slug: `model-${category}-consolidated`,
                concepts: ["consolidated"],
                createdAt: at,
                factChecksums: [],
            };
            topics.set(generalTopicId, generalTopic);
            createdTopicCount += 1;
        }
        generalTopic.status = "active";
        generalTopic.updatedAt = at;
        generalTopic.assignmentVersion = typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
        delete generalTopic.retiredAt;
        const boundedRegularLimit = Math.max(0, maxPerCategory - unclassifiedActive - 1);
        for (const overflowTopic of regularTopics.slice(boundedRegularLimit)) {
            for (const factChecksum of overflowTopic.factChecksums || []) {
                generalTopic.factChecksums = [...new Set([...(generalTopic.factChecksums || []), factChecksum])];
                if (facts[factChecksum]) {
                    const assignment = facts[factChecksum].topicAssignment || {};
                    facts[factChecksum] = {
                        ...facts[factChecksum],
                        topicId: generalTopic.topicId,
                        topicSlug: generalTopic.slug,
                        topicAssignment: {
                            ...assignment,
                            strategy: "capacity_rebalanced",
                            rebalanced: true,
                            rebalancedFromTopicId: String(assignment.rebalancedFromTopicId || overflowTopic.topicId),
                            initialStrategy: String(assignment.initialStrategy || assignment.strategy || "capacity_rebalanced"),
                            assignedAt: at,
                        },
                    };
                }
            }
            generalTopic.concepts = (0, typed_memory_shared_1.uniqueStrings)([...(generalTopic.concepts || []), ...(overflowTopic.concepts || [])], 20);
            overflowTopic.factChecksums = [];
            overflowTopic.updatedAt = at;
        }
    }
    for (const topic of topics.values()) {
        const topicFacts = (topic.factChecksums || []).map((factChecksum) => facts[factChecksum]).filter(Boolean);
        if (!topicFacts.length)
            continue;
        const confidences = topicFacts.map((fact) => Number(fact.topicAssignment?.confidence || 0));
        topic.assignmentVersion = typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION;
        topic.meanAssignmentConfidence = Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(4));
        topic.lowConfidenceFactCount = topicFacts.filter((fact) => fact.topicAssignment?.lowConfidence === true).length;
        topic.rebalancedFactCount = topicFacts.filter((fact) => fact.topicAssignment?.rebalanced === true).length;
    }
    for (const [topicId, topic] of topics.entries()) {
        if ((topic.factChecksums || []).length > 0)
            continue;
        topic.status = "retired";
        topic.retiredAt = topic.retiredAt || at;
        topics.set(topicId, topic);
    }
    for (const [retiredId, canonicalId] of topicAliases.entries()) {
        const prior = previousTopics[retiredId];
        if (!prior)
            continue;
        topics.set(retiredId, { ...prior, status: "merged", mergedIntoTopicId: canonicalId, factChecksums: [], retiredAt: at, updatedAt: at });
    }
    const activeTopicCount = [...topics.values()].filter(topic => topic.status === "active").length;
    const retiredTopicCount = [...topics.values()].filter(topic => topic.status === "retired").length;
    const consolidatedFactCount = [...topics.values()]
        .filter(topic => topic.status === "active" && topic.topicId === `met_${topic.category}_general`)
        .reduce((sum, topic) => sum + Number(topic.factChecksums?.length || 0), 0);
    const unclassifiedFactCount = [...topics.values()]
        .filter(topic => topic.status === "active" && topic.topicId === `met_${topic.category}_unclassified`)
        .reduce((sum, topic) => sum + Number(topic.factChecksums?.length || 0), 0);
    const activeAssignmentFacts = Object.values(facts).filter((fact) => fact?.status === "active");
    const rebalancedFactCount = activeAssignmentFacts.filter((fact) => fact.topicAssignment?.rebalanced === true).length;
    const crossLanguageReuseCount = activeAssignmentFacts.filter((fact) => fact.topicAssignment?.crossLanguageReuse === true).length;
    return {
        schema: "ccm-group-session-model-extraction-topic-lifecycle-v1",
        version: typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION,
        facts,
        topics: Object.fromEntries([...topics.entries()]
            .sort((a, b) => Number(a[1].status === "active") - Number(b[1].status === "active") || String(a[1].updatedAt || a[1].createdAt || "").localeCompare(String(b[1].updatedAt || b[1].createdAt || "")))
            .slice(-200)),
        activeTopicCount,
        retiredTopicCount,
        mergedTopicCount: topicAliases.size,
        createdTopicCount,
        reusedTopicCount,
        consolidatedFactCount,
        unclassifiedFactCount,
        lowConfidenceFactCount,
        rebalancedFactCount,
        crossLanguageReuseCount,
        maxTopicsPerCategory: maxPerCategory,
        updatedAt: at,
    };
}
function renderModelExtractionTypedMemoryBody(title, facts, updatedAt) {
    const lines = [
        `# ${title}`,
        "",
        `Committed from evidence-bound model extraction proposals at ${updatedAt}.`,
        "Only active facts with an exact raw user-message source are rendered. Superseded facts remain in the audit ledger but are not injected.",
        "",
        "## Active Facts",
    ];
    for (const fact of facts) {
        lines.push(`- #${fact.sourceMessageId} ${(0, typed_memory_shared_1.compactText)(fact.text, 900)}`);
        lines.push(`  - **Evidence:** execution=${fact.executionId}; receipt=${fact.receiptChecksum}; graph=${fact.graphChecksum}`);
    }
    return `${lines.join("\n").trim()}\n`;
}
function distillGroupSessionModelExtractionToTypedMemory(scopeId, input, options = {}) {
    return require("./group-memory-distillation").distillGroupSessionModelExtractionToTypedMemory(scopeId, input, options);
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
// ===== merged from typed-memory-distillation-receipts-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function providerReproofReceiptConsumptionRowId(row = {}) {
    return `provider-reproof-receipt:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
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
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
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
            version: typed_memory_shared_1.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
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
            reason: (0, typed_memory_shared_1.compactText)(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.replay_repair_consumption_reason || raw?.reason || raw?.summary || "", 700),
            receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim(),
            provider_reproof_status: String(entry.provider_reproof_status || entry.providerReproofStatus || raw?.provider_reproof_status || "").trim(),
            provider_reproof_reason: (0, typed_memory_shared_1.compactText)(entry.provider_reproof_reason || entry.providerReproofReason || raw?.provider_reproof_reason || "", 500),
            reproof_candidate_id: String(entry.reproof_candidate_id || entry.reproofCandidateId || raw?.reproof_candidate_id || "").trim(),
            original_work_item_id: String(entry.original_work_item_id || entry.originalWorkItemId || raw?.original_work_item_id || "").trim(),
            original_timeline_binding_id: String(entry.original_timeline_binding_id || entry.originalTimelineBindingId || raw?.original_timeline_binding_id || "").trim(),
            request_patch_checksum: String(entry.request_patch_checksum || entry.requestPatchChecksum || raw?.request_patch_checksum || "").trim(),
            runner_request_id: String(entry.runner_request_id || entry.runnerRequestId || raw?.runner_request_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
            memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
            execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        row.recommendation = providerReproofReceiptConsumptionRecommendation(row);
        return { ...row, row_id: providerReproofReceiptConsumptionRowId(row), strong_receipt_claim_only: status === "strong" };
    }).filter((row) => row.dispatch_source === "api_microcompact_native_apply_provider_reproof")
        .filter((row) => ["strong", "used", "verified", "ignored", "blocked"].includes(row.status));
}
function mergeProviderReproofReceiptConsumptionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
        `Generated by CCM provider re-proof receipt consumption distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped provider re-proof feedback.",
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
            lines.push(`  Reason: ${(0, typed_memory_shared_1.compactText)(row.reason, 700).replace(/\n/g, " ")}`);
        if (row.provider_reproof_reason)
            lines.push(`  Provider re-proof reason: ${(0, typed_memory_shared_1.compactText)(row.provider_reproof_reason, 400).replace(/\n/g, " ")}`);
        if (row.strong_receipt_claim_only)
            lines.push("  Note: receipt strong is a consumption claim only; require native provider proof ledger before closure.");
    }
    return lines.join("\n").trim() + "\n";
}
function providerReproofReceiptConsumptionArchive(rows = [], options = {}) {
    return require("./group-memory-distillation").providerReproofReceiptConsumptionArchive(rows, options);
}
function distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input, options);
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
    return (0, typed_memory_shared_1.uniqueStrings)(values.flatMap(value => {
        if (Array.isArray(value))
            return value;
        if (value === undefined || value === null || value === "")
            return [];
        return [value];
    }).map((item) => String(item || "").trim()).filter(Boolean), 48);
}
function providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row = {}) {
    return `provider-ranking-compact-repair-receipt:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
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
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
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
            version: typed_memory_shared_1.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
            timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || raw?.work_item_id || "").trim(),
            task_id: String(entry.task_id || entry.taskId || raw?.task_id || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            dispatch_source: source,
            status,
            consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.replay_repair_consumption_source || raw?.consumption_source || "").trim(),
            consumption_state: String(entry.replay_repair_consumption_state || entry.replayRepairConsumptionState || raw?.replay_repair_consumption_state || raw?.usage_state || raw?.usageState || "").trim(),
            reason: (0, typed_memory_shared_1.compactText)(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.reason || raw?.summary || "", 900),
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
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    return require("./group-memory-distillation").providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows, options);
}
function renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Provider Ranking Provenance Compact Repair Receipt Memory",
        "",
        `Generated by CCM provider ranking provenance compact repair receipt distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped provider ranking repair feedback.",
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
            lines.push(`  Receipt reason: ${(0, typed_memory_shared_1.compactText)(row.reason, 700).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- For future compact retries, keep provider ranking provenance compact-safe by preserving typed MEMORY.md rel paths, row ids, and the matching provider switch decision receipt checksum in the WorkerContextPacket and compact outcome ledger.");
    lines.push("- Never use this memory as provider-switch authority; require a fresh valid provider switch decision receipt for each explicit switch.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input, options);
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
    ].map((row) => ({
        ...row,
        groupId: row.groupId || row.group_id || group.groupId || group.group_id || "",
        groupSessionId: row.groupSessionId || row.group_session_id || group.groupSessionId || group.group_session_id || "",
    })));
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
    return `post-compact-reinjection-repair-receipt:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
        row.groupSessionId,
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
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
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
            version: typed_memory_shared_1.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
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
            post_compact_candidate_value: (0, typed_memory_shared_1.compactText)(entry.post_compact_candidate_value || entry.postCompactCandidateValue || raw?.post_compact_candidate_value || workItem.post_compact_candidate_value || "", 1200),
            post_compact_candidate_source_message_id: String(entry.post_compact_candidate_source_message_id || entry.postCompactCandidateSourceMessageId || raw?.post_compact_candidate_source_message_id || workItem.post_compact_candidate_source_message_id || "").trim(),
            usage_state: usageState,
            category: usageState === "ignored" ? "caution" : "restored",
            current_source_verified: entry.post_compact_reinjection_current_source_verified === true
                || entry.postCompactReinjectionCurrentSourceVerified === true
                || raw?.current_source_verified === true
                || raw?.currentSourceVerified === true,
            receipt_reason: (0, typed_memory_shared_1.compactText)(entry.post_compact_reinjection_receipt_reason || entry.postCompactReinjectionReceiptReason || raw?.receipt_reason || raw?.reason || "", 900),
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
            event_types: (0, typed_memory_shared_1.uniqueStrings)(Array.isArray(entry.event_types) ? entry.event_types : Array.isArray(raw?.event_types) ? raw.event_types : [], 24),
            completion_source: completionSource,
            resolution_reason: resolutionReason,
            completed_at: String(raw?.completed_at || raw?.completedAt || workItem.completedAt || workItem.completed_at || entry.completed_at || entry.updated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    return require("./group-memory-distillation").postCompactReinjectionRepairReceiptConsumptionArchive(rows, options);
}
function renderPostCompactReinjectionRepairReceiptConsumptionBody(title, rows = [], options = {}) {
    const lines = [
        `# ${title}`,
        "",
        `Generated by CCM post-compact reinjection repair receipt distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped post-compact reinjection feedback.",
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
            lines.push(`  Receipt reason: ${(0, typed_memory_shared_1.compactText)(row.receipt_reason, 900).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Recall this memory to avoid reopening an already-proven identical repair without evidence.");
    lines.push("- Before injecting the candidate into a future child Agent session, re-read or revalidate the current repository/source state and obtain a new usage receipt for that session.");
    return lines.join("\n").trim() + "\n";
}
function distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input, options);
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
    return `post-compact-receipt-memory-usage-repair-completion:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
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
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
    const requiredEvents = ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"];
    return postCompactReceiptMemoryUsageRepairCompletionInputRows(input).map((raw, index) => {
        const item = raw?.work_item || raw?.workItem || raw?.item || raw || {};
        const entry = raw?.entry || raw?.binding || raw?.timeline_binding || item.replay_repair_timeline_binding || raw || {};
        const proof = raw?.proof || item.post_compact_receipt_memory_usage_repair_receipt || entry.post_compact_receipt_memory_usage_repair_receipt || {};
        const requiredDocRelPaths = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(proof.required_doc_rel_paths) ? proof.required_doc_rel_paths : []),
            ...(Array.isArray(proof.requiredDocRelPaths) ? proof.requiredDocRelPaths : []),
            ...(Array.isArray(entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
            ...(Array.isArray(item.post_compact_receipt_memory_required_doc_rel_paths) ? item.post_compact_receipt_memory_required_doc_rel_paths : []),
        ], 40);
        const coveredDocRelPaths = (0, typed_memory_shared_1.uniqueStrings)([
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
            reason: (0, typed_memory_shared_1.compactText)(coverage.reason || coverage.ignored_reason || coverage.ignoredReason || "", 700),
        })).filter((coverage) => coverage.rel_path);
        const eventTypes = (0, typed_memory_shared_1.uniqueStrings)([
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
            version: typed_memory_shared_1.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || entry.groupId || entry.group_id || item.groupId || item.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || item.groupSessionId || item.group_session_id || "").trim(),
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
            original_gap_codes: (0, typed_memory_shared_1.uniqueStrings)([
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
            completed_at: String(proof.completed_at || item.completedAt || item.completed_at || raw?.completed_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    return {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
        version: typed_memory_shared_1.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
        archived_count: rows.length,
        verified_count: rows.filter((row) => row.receipt_verified === true).length,
        original_session_count: (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => [row.original_task_agent_session_id, row.original_native_session_id]).filter(Boolean), 480).length,
        repair_session_count: (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => [row.repair_task_agent_session_id, row.repair_native_session_id]).filter(Boolean), 480).length,
        required_doc_count: (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => row.required_doc_rel_paths || []), 240).length,
        rows,
        updatedAt,
    };
}
function renderPostCompactReceiptMemoryUsageRepairCompletionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Receipt Memory Usage Repair Completions",
        "",
        `Generated by CCM corrected-receipt completion distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped corrected-receipt completion feedback.",
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
            lines.push(`  Memory doc: ${coverage.rel_path}; usageState=${coverage.usage_state}; currentSourceVerified=${coverage.current_source_verified === true}; ignoredReasonCovered=${coverage.ignored_reason_covered === true}; compliant=${coverage.compliant === true}${coverage.reason ? `; reason=${(0, typed_memory_shared_1.compactText)(coverage.reason, 500).replace(/\n/g, " ")}` : ""}.`);
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
    return require("./group-memory-distillation").distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input, options);
}
function distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
}
function conflictResolutionMaintenanceNotificationReceiptChecksum(receipt = {}) {
    return (0, typed_memory_shared_1.checksum)({
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
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        ...(0, typed_memory_ledgers_1.conflictResolutionMaintenanceScopeMetadata)(groupId),
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
        ...(0, typed_memory_ledgers_1.conflictResolutionMaintenanceScopeMetadata)(groupId),
        entries: entries.slice(-320),
        receipt_count: Math.min(entries.length, 320),
        updated_at: at,
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file };
}
function createConflictResolutionMaintenanceNotificationReceipt(groupId, kind, input = {}) {
    const at = String(input.at || input.issuedAt || input.issued_at || (0, typed_memory_shared_1.now)());
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
    const notificationLedger = (0, typed_memory_shared_1.readJson)((0, typed_memory_ledgers_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile)(groupId), {});
    const notification = (Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [])
        .find((entry) => String(entry.notification_id || "") === notificationId) || null;
    if (!notification)
        throw new Error("maintenance notification not found");
    if (String(notification.group_id || "") !== groupId)
        throw new Error("maintenance notification group mismatch");
    if (String(notification.audience || "") !== audience)
        throw new Error("maintenance notification audience mismatch");
    const state = (0, typed_memory_ledgers_1.conflictResolutionMaintenanceState)(groupId, {
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
        receipt_id: `conflict-resolution-maintenance-notification-${kind}:${(0, typed_memory_shared_1.checksum)([groupId, audience, notificationId, state.state_fingerprint, actorId, sessionId, at], 24)}`,
        receipt_kind: kind,
        group_id: groupId,
        ...(0, typed_memory_ledgers_1.conflictResolutionMaintenanceScopeMetadata)(groupId),
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
function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, options = {}) {
    return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
}
function conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt = {}) {
    return (0, typed_memory_shared_1.checksum)({
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
function conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        group_id: value.group_id || "",
        revision: Number(value.revision || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({
            receipt_id: entry.receipt_id || "",
            receipt_checksum: entry.receipt_checksum || "",
            consumed: entry.consumed === true,
            consumed_at: entry.consumed_at || "",
            revoked: entry.revoked === true,
            revoked_at: entry.revoked_at || "",
            execution_id: entry.execution_id || "",
            execution_checksum: entry.execution_checksum || "",
            execution_fencing_token: Number(entry.execution_fencing_token || 0),
        })),
    }, 48);
}
function readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
    const ledger = (0, typed_memory_shared_1.readJson)(file, {});
    const revision = Number(ledger.revision || 0);
    const ledgerChecksum = String(ledger.ledger_checksum || "");
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
        version: 1,
        group_id: groupId,
        entries: Array.isArray(ledger.entries) ? ledger.entries : [],
        revision,
        previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
        ledger_checksum: ledgerChecksum,
        ledger_checksum_valid: (!ledgerChecksum && revision === 0) || (!!ledgerChecksum && ledgerChecksum === conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(ledger)),
        file,
    };
}
function writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, entries, at, options = {}) {
    return (0, typed_memory_ledgers_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
        const current = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
        if (!current.ledger_checksum_valid)
            throw new Error("cleanup_receipt_ledger_checksum_invalid");
        if (options.expectedRevision !== undefined && Number(options.expectedRevision) !== Number(current.revision || 0))
            throw new Error("cleanup_receipt_ledger_revision_conflict");
        if (options.expectedLedgerChecksum !== undefined && String(options.expectedLedgerChecksum || "") !== String(current.ledger_checksum || ""))
            throw new Error("cleanup_receipt_ledger_revision_conflict");
        const open = entries.filter((entry) => entry.consumed !== true && entry.revoked !== true);
        const terminal = entries.filter((entry) => entry.consumed === true || entry.revoked === true).slice(-160);
        const value = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
            version: 1,
            group_id: groupId,
            revision: Number(current.revision || 0) + 1,
            previous_ledger_checksum: current.ledger_checksum || "",
            entries: [...open, ...terminal],
            open_receipt_count: open.length,
            consumed_receipt_count: terminal.filter((entry) => entry.consumed === true).length,
            updated_at: at,
        };
        value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(value);
        if (!(0, typed_memory_ledgers_1.cleanupGroupLedgerLockHeld)(groupId, groupLedgerLockHandle))
            throw new Error("cleanup_group_ledger_lock_lost");
        (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
        return { ...value, file };
    });
}
function mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, at, mutate, options = {}) {
    return (0, typed_memory_ledgers_1.withCleanupGroupLedgerLock)(groupId, at, options, groupLedgerLockHandle => {
        const current = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
        if (!current.ledger_checksum_valid)
            throw new Error("cleanup_receipt_ledger_checksum_invalid");
        const entries = mutate([...current.entries], current);
        return writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, entries, at, {
            ...options,
            groupLedgerLockHandle,
            expectedRevision: current.revision,
            expectedLedgerChecksum: current.ledger_checksum,
        });
    });
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
}
function cleanupCommitRepairResolutionReceiptChecksum(receipt = {}) {
    return (0, typed_memory_shared_1.checksum)({
        receipt_id: receipt.receipt_id || "", group_id: receipt.group_id || "", work_item_id: receipt.work_item_id || "", transaction_id: receipt.transaction_id || "",
        work_item_checksum: receipt.work_item_checksum || "", quarantine_evidence_checksum: receipt.quarantine_evidence_checksum || "", resolution_action: receipt.resolution_action || "",
        actor_role: receipt.actor_role || "", actor_id: receipt.actor_id || "", reason: receipt.reason || "", issued_at: receipt.issued_at || "", expires_at: receipt.expires_at || "", single_use: receipt.single_use === true,
    }, 48);
}
function cleanupCommitRepairResolutionReceiptStateChecksum(receipt = {}) {
    return (0, typed_memory_shared_1.checksum)({
        receipt_checksum: receipt.receipt_checksum || "",
        consumed: receipt.consumed === true,
        consumed_at: receipt.consumed_at || "",
    }, 48);
}
function writeCleanupCommitRepairResolutionReceipts(groupId, entries, at) {
    return require("./group-memory-maintenance").writeCleanupCommitRepairResolutionReceipts(groupId, entries, at);
}
function cleanupCommitRepairResolutionReceiptLedgerValid(ledger, groupId) {
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    return String(ledger?.group_id || "") === groupId
        && entries.every((entry) => entry.receipt_checksum === cleanupCommitRepairResolutionReceiptChecksum(entry)
            && entry.receipt_state_checksum === cleanupCommitRepairResolutionReceiptStateChecksum(entry))
        && ledger?.ledger_checksum === (0, typed_memory_shared_1.checksum)(entries.map((entry) => entry.receipt_state_checksum || ""), 48);
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input);
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input);
}
function revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}
function conflictResolutionGcApprovalReceiptChecksum(receipt = {}) {
    return (0, typed_memory_shared_1.checksum)({
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
function createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input);
}
function executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input = {}) {
    return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input);
}
function distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input, options);
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
    return `provider-ranking-memory-usage-receipt-repair:${(0, typed_memory_shared_1.checksum)([
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
    const forcedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
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
            version: typed_memory_shared_1.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            groupSessionId: String(entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || forcedGroupSessionId || "").trim(),
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
            reason: (0, typed_memory_shared_1.compactText)(entry.reason || entry.source_reason || entry.description || entry.instruction || raw?.reason || gapCodes.join("; ") || "provider ranking memory usage receipt repair required", 1000),
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "Corrected CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored cites provider-ranking-provenance-compact-repair-receipt-memory.md and preserves the authorization boundary.", 900),
            prompt_patch: (0, typed_memory_shared_1.compactText)(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1500),
            worker_task: (0, typed_memory_shared_1.compactText)(entry.worker_task || entry.workerTask || raw?.worker_task || "", 1800),
            has_memory_used_prompt: /memoryUsed/i.test(text),
            has_memory_ignored_prompt: /memoryIgnored/i.test(text),
            has_usage_state_prompt: /usageState|usage_state/i.test(text),
            has_authorization_boundary_prompt: /ranking evidence only, not authorization/i.test(text),
            has_fresh_receipt_prompt: /fresh valid provider switch decision receipt/i.test(text),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerRankingMemoryUsageReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => !forcedGroupSessionId || row.groupSessionId === forcedGroupSessionId)
        .filter((row) => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair"
        || row.component === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_contract"
        || /provider ranking.*memory usage|memoryUsed|memoryIgnored|fresh valid provider switch decision receipt|ranking evidence only, not authorization/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}\n${row.worker_task}`));
}
function mergeProviderRankingMemoryUsageReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const docRelPaths = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.doc_rel_paths) ? row.doc_rel_paths : []), 80);
    return {
        schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
        `Generated by CCM provider ranking memory usage receipt repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped provider ranking receipt-discipline feedback.",
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
            lines.push(`  Evidence: ${(0, typed_memory_shared_1.compactText)(row.reason, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input, options);
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
// ===== merged from typed-memory-distillation-receipts-part-03.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
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
    return `provider-dispatch-override-followup:${(0, typed_memory_shared_1.checksum)([
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
            version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
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
            override_reason: (0, typed_memory_shared_1.compactText)(overrideReceipt.reason || overrideReceipt.override_reason || overrideReceipt.overrideReason || raw?.override_reason || "", 700),
            completion_reason: (0, typed_memory_shared_1.compactText)(completion.reason || raw?.reason || "", 700),
            rel_paths: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.relPath || usage.rel_path || usage.path || usage.file).filter(Boolean), 16),
            repair_statuses: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.repairStatus || usage.repair_status).filter(Boolean), 8),
            repair_gap_types: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.repairGapType || usage.repair_gap_type).filter(Boolean), 8),
            usage_states: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.usageState || usage.usage_state).filter(Boolean), 8),
            usage_reasons: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.reason || usage.summary || usage.note).filter(Boolean), 8),
            dispatch_policy: String(decision.dispatch_policy || decision.dispatchPolicy || decision.action || "").trim(),
            health_status: String(decision.advisory_health_status || decision.health_status || decision.healthStatus || entry.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.health_status || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || completion.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(completion.at || entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerDispatchOverrideFollowupRowId(row) };
    }).filter((row) => row.completion_ok === true)
        .filter((row) => row.memory_provenance_usage_count > 0 && row.all_current_source_verified === true);
}
function mergeProviderDispatchOverrideFollowupRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
        current.rel_paths = (0, typed_memory_shared_1.uniqueStrings)([...(current.rel_paths || []), ...(Array.isArray(row.rel_paths) ? row.rel_paths : [])], 20);
        current.followup_work_item_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.followup_work_item_ids || []), row.followup_work_item_id].filter(Boolean), 20);
        current.override_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.override_ids || []), row.override_id].filter(Boolean), 20);
        const completedAt = String(row.last_seen_at || row.first_seen_at || "");
        current.first_completed_at = current.first_completed_at
            ? [current.first_completed_at, completedAt].filter(Boolean).sort()[0]
            : completedAt;
        current.last_completed_at = [current.last_completed_at, completedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()]
        .sort((a, b) => Number(b.completed_count || 0) - Number(a.completed_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    const relPaths = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
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
        `Generated by CCM provider dispatch override follow-up distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
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
            lines.push(`  Usage evidence: ${row.usage_reasons.slice(0, 4).map((item) => (0, typed_memory_shared_1.compactText)(item, 500).replace(/\n/g, " ")).join(" | ")}`);
        if (row.override_reason)
            lines.push(`  Override reason: ${(0, typed_memory_shared_1.compactText)(row.override_reason, 500).replace(/\n/g, " ")}`);
        if (row.completion_reason)
            lines.push(`  Completion reason: ${(0, typed_memory_shared_1.compactText)(row.completion_reason, 500).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Treat these rows as repaired history and cautionary context for the same agentType/project. If a new provider advisory says hold_until_repair, do not bypass it just because an older override was later repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input, options);
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
    return `provider-switch-execution:${(0, typed_memory_shared_1.checksum)([
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
        const gaps = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(executionReceipt.gaps) ? executionReceipt.gaps : []),
            ...(Array.isArray(raw.gaps) ? raw.gaps : []),
        ], 24);
        const status = String(executionReceipt.status || raw.status || "").trim().toLowerCase() === "passed"
            || executionReceipt.executed_as_approved === true
            ? "passed"
            : "failed";
        const mismatch = gaps.includes("executed_provider_mismatch")
            || (!!expectedProvider && !!actualProvider && expectedProvider.toLowerCase() !== actualProvider.toLowerCase());
        const at = String(executionReceipt.at || raw.at || entry.at || options.updatedAt || (0, typed_memory_shared_1.now)());
        const row = {
            schema: "ccm-provider-switch-execution-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
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
            reason: (0, typed_memory_shared_1.compactText)(raw.reason || executionReceipt.reason || executionReceipt.child_declaration?.reason || "", 500),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
        current.actual_providers = (0, typed_memory_shared_1.uniqueStrings)([...(current.actual_providers || []), row.actually_executed_provider].filter(Boolean), 12);
        current.execution_receipt_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.execution_receipt_ids || []), row.execution_receipt_id].filter(Boolean), 24);
        current.decision_receipt_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.decision_receipt_ids || []), row.provider_switch_decision_receipt_id].filter(Boolean), 24);
        current.task_agent_session_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.task_agent_session_ids || []), row.task_agent_session_id].filter(Boolean), 24);
        current.row_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.row_ids || []), row.row_id].filter(Boolean), 32);
        current.memory_rel_paths = (0, typed_memory_shared_1.uniqueStrings)([...(current.memory_rel_paths || []), "provider-switch-execution-memory.md"], 8);
        current.gap_codes = (0, typed_memory_shared_1.uniqueStrings)([...(current.gap_codes || []), ...(Array.isArray(row.gaps) ? row.gaps : [])], 32);
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
        version: typed_memory_shared_1.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
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
        `Generated by CCM provider switch execution distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
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
            lines.push(`  Reason: ${(0, typed_memory_shared_1.compactText)(row.reason, 400).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use these rows as local execution feedback for the same expected provider and project. Passed history is monitoring evidence only; repeated mismatch history should require receipt sampling or a hold until the runner binding is repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderSwitchExecutionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderSwitchExecutionToTypedMemory(groupId, input, options);
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
    return `provider-dispatch-override-followup-receipt-validation:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
        row.validation_id,
        row.binding_id,
        row.execution_id,
        row.attempt_status,
    ], 24)}`;
}
function normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
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
        const attemptAt = String(validation.at || validation.validated_at || validation.validatedAt || raw?.at || entry.at || options.updatedAt || (0, typed_memory_shared_1.now)());
        const row = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || validation.groupId || validation.group_id || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || validation.groupSessionId || validation.group_session_id || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
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
            required_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(contract.rel_paths || contract.relPaths || [], 24),
            required_followup_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(contract.followup_work_item_ids || contract.followupWorkItemIds || [], 24),
            required_override_ids: (0, typed_memory_shared_1.uniqueStrings)(contract.override_ids || contract.overrideIds || [], 24),
            gap_codes: (0, typed_memory_shared_1.uniqueStrings)(gaps.map((gap) => gap.code || gap.gap_code || gap.gapCode).filter(Boolean), 24),
            gap_reasons: (0, typed_memory_shared_1.uniqueStrings)(gaps.map((gap) => gap.reason || gap.message).filter(Boolean), 16),
            receipt_evidence_reasons: (0, typed_memory_shared_1.uniqueStrings)(receiptEvidenceRows.map((row) => row.reason || row.summary || row.note).filter(Boolean), 16),
            memory_provenance_usage_count: Number(validation.memory_provenance_usage_count || validation.memoryProvenanceUsageCount || 0),
            provider_override_followup_reverified_row_count: Number(validation.provider_override_followup_reverified_row_count || validation.providerOverrideFollowupReverifiedRowCount || 0),
            current_source_verified_count: Number(validation.current_source_verified_count || validation.currentSourceVerifiedCount || 0),
            reason: (0, typed_memory_shared_1.compactText)(validation.reason || raw?.reason || "", 700),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
            validation_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.map((row) => row.validation_id).filter(Boolean), 32),
            repair_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.map((row) => row.repair_work_item_id).filter(Boolean), 24),
            rel_paths: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_rel_paths || []), 32),
            followup_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_followup_work_item_ids || []), 32),
            override_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_override_ids || []), 32),
            gap_codes: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.gap_codes || []), 32),
        };
    }).sort((a, b) => Number(b.consecutive_failure_count || 0) - Number(a.consecutive_failure_count || 0) || Number(b.failed_count || 0) - Number(a.failed_count || 0));
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
        sourceGroupId: String(options.sourceGroupId || options.source_group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId: String(options.groupSessionId || options.group_session_id || "").trim(),
        exactSession: !!String(options.groupSessionId || options.group_session_id || "").trim(),
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
        `Generated by CCM corrected-receipt validation distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped provider validation memory.",
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
            lines.push(`  Receipt evidence: ${row.receipt_evidence_reasons.slice(0, 4).map((item) => (0, typed_memory_shared_1.compactText)(item, 500).replace(/\n/g, " ")).join(" | ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use the latest consecutive failure streak for the active gate, but never delete older failures or successful repairs from audit history.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input, options);
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
    return `ignore-memory-receipt-repair:${(0, typed_memory_shared_1.checksum)([
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
        const gaps = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(entry.gaps) ? entry.gaps : []),
            ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
        ].map((gap) => typeof gap === "string" ? gap : gap?.reason || gap?.type || JSON.stringify(gap)), 16);
        const reason = (0, typed_memory_shared_1.compactText)(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gaps.join("; ")
            || "ignore-memory receipt repair required", 900);
        const row = {
            schema: "ccm-ignore-memory-receipt-repair-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryIgnored includes user_requested_ignore_memory; memoryUsed empty for platform memory", 700),
            prompt_patch: (0, typed_memory_shared_1.compactText)(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1200),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: ignoreMemoryReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_ignore_memory_receipt_repair" || row.component === "worker_context_ignore_memory_receipt_contract" || /ignore-memory|memoryIgnored|user_requested_ignore_memory/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}`));
}
function mergeIgnoreMemoryReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    return {
        schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
        `Generated by CCM ignore-memory receipt repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
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
            lines.push(`  Evidence: ${(0, typed_memory_shared_1.compactText)(row.reason, 650).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input, options);
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
function pressureMemoryProvenanceReceiptRepairRowId(row = {}) {
    return `pressure-memory-provenance-receipt-repair:${(0, typed_memory_shared_1.checksum)([
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
        const recoveryDocs = (0, typed_memory_recall_1.pressureMemoryProvenanceRowsFromRawRecovery)(entry);
        const gapCodes = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_gap_codes, entry.pressureMemoryProvenanceGapCodes, recoveryDocs.map((doc) => doc.repair_gap_type).filter(Boolean), Array.isArray(entry.gaps) ? entry.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [], Array.isArray(raw?.gaps) ? raw.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : []);
        const relPaths = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_rel_paths, entry.pressureMemoryProvenanceRelPaths, recoveryDocs.map((doc) => doc.rel_path || doc.relPath).filter(Boolean), entry.repair_target && String(entry.repair_target).endsWith(".md") ? entry.repair_target : "");
        const repairIds = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_repair_work_item_ids, entry.pressureMemoryProvenanceRepairWorkItemIds, recoveryDocs.map((doc) => doc.repair_work_item_id || doc.repairWorkItemId).filter(Boolean));
        const provenanceStatuses = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.provenance_status, entry.provenanceStatus, recoveryDocs.map((doc) => doc.provenance_status || doc.provenanceStatus).filter(Boolean));
        const reason = (0, typed_memory_shared_1.compactText)(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gapCodes.join("; ")
            || "pressure memory provenance receipt repair required", 1000);
        const row = {
            schema: "ccm-pressure-memory-provenance-receipt-repair-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryProvenanceUsage covers pressure repair memory and marks currentSourceVerified=true when disputed/stale memory is used", 850),
            prompt_patch: (0, typed_memory_shared_1.compactText)(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1400),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const relPaths = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    const repairIds = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []), 80);
    const provenanceStatuses = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.provenance_statuses) ? row.provenance_statuses : []), 20);
    return {
        schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
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
        `Generated by CCM pressure memory provenance receipt repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
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
            lines.push(`  Evidence: ${(0, typed_memory_shared_1.compactText)(row.reason, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input, options);
}
function distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input, options);
}
function distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input, options);
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
        relPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.rel_paths || row.relPaths) ? (row.rel_paths || row.relPaths) : []), 16),
        followupWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.followup_work_item_ids || row.followupWorkItemIds) ? (row.followup_work_item_ids || row.followupWorkItemIds) : []), 16),
        overrideIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.override_ids || row.overrideIds) ? (row.override_ids || row.overrideIds) : []), 16),
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
        validationIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.validation_ids || row.validationIds || []), 32),
        repairWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.repair_work_item_ids || row.repairWorkItemIds || []), 24),
        relPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.rel_paths || row.relPaths || []), 32),
        followupWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.followup_work_item_ids || row.followupWorkItemIds || []), 32),
        overrideIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.override_ids || row.overrideIds || []), 32),
        gapCodes: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
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
        actualProviders: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.actual_providers || row.actualProviders || []), 24),
        lastExecutedAt: String(latest.last_executed_at || latest.lastExecutedAt || ""),
        lastFailedAt: attributions.map((row) => row.last_failed_at || row.lastFailedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        lastPassedAt: attributions.map((row) => row.last_passed_at || row.lastPassedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        executionReceiptIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.execution_receipt_ids || row.executionReceiptIds || []), 24),
        decisionReceiptIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.decision_receipt_ids || row.decisionReceiptIds || []), 24),
        taskAgentSessionIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.task_agent_session_ids || row.taskAgentSessionIds || []), 24),
        rowIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.row_ids || row.rowIds || []), 32),
        memoryRelPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.memory_rel_paths || row.memoryRelPaths || []), 8),
        gapCodes: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
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
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
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
    const halfLifeDays = Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS)));
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
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
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
        .flatMap((item) => [String(item || "").trim().toLowerCase(), (0, typed_memory_shared_1.safeSegment)(item).toLowerCase()])
        .filter(Boolean));
    const maxGroups = Math.max(1, Math.min(200, Number(options.maxGroups || options.max_groups || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS)));
    const maxLedgersPerGroup = Math.max(1, Math.min(100, Number(options.maxLedgersPerGroup || options.max_ledgers_per_group || 24)));
    const candidates = (() => {
        try {
            return fs.readdirSync(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => ({ groupId: entry.name, file: path.join(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, entry.name, typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER) }));
        }
        catch {
            return [];
        }
    })();
    const explicitKeys = new Set(explicitGroupIds.flatMap((item) => [item.toLowerCase(), (0, typed_memory_shared_1.safeSegment)(item).toLowerCase()]));
    const sortedCandidates = candidates
        .filter((item) => {
        if (!explicitKeys.size)
            return true;
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        return explicitKeys.has(String(item.groupId || "").toLowerCase())
            || explicitKeys.has(identity.rootGroupId.toLowerCase())
            || explicitKeys.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase());
    })
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
        .filter((item) => {
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        return !excluded.has(String(item.groupId || "").toLowerCase())
            && !excluded.has(identity.rootGroupId.toLowerCase())
            && !excluded.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase());
    })
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0));
    const selected = [];
    const selectedRootGroups = new Set();
    const selectedLedgersPerGroup = new Map();
    for (const item of sortedCandidates) {
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        const rootKey = identity.rootGroupId.toLowerCase();
        const isNewRoot = !selectedRootGroups.has(rootKey);
        if (isNewRoot && selectedRootGroups.size >= maxGroups)
            continue;
        if (Number(selectedLedgersPerGroup.get(rootKey) || 0) >= maxLedgersPerGroup)
            continue;
        selectedRootGroups.add(rootKey);
        selectedLedgersPerGroup.set(rootKey, Number(selectedLedgersPerGroup.get(rootKey) || 0) + 1);
        selected.push(item);
    }
    return selected;
}
// ===== merged from typed-memory-distillation-receipts-part-04.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function loadProviderDispatchReliabilitySources(options = {}) {
    const targetGroupId = String(options.targetGroupId || options.target_group_id || options.groupId || options.group_id || "").trim();
    const targetKeys = new Set([targetGroupId, (0, typed_memory_shared_1.safeSegment)(targetGroupId)].map(item => item.toLowerCase()).filter(Boolean));
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
            const parsed = (0, typed_memory_shared_1.readJson)(item.file, {});
            const ledgerGroupId = String(parsed.groupId || parsed.group_id || item.groupId || "").trim();
            const archive = parsed.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
            const rows = Array.isArray(archive.rows) ? archive.rows : [];
            if (!rows.length)
                continue;
            const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(ledgerGroupId || item.groupId, {
                ...parsed,
                sourceGroupId: parsed.sourceGroupId || parsed.source_group_id || archive.sourceGroupId || archive.source_group_id || rows[0]?.groupId || rows[0]?.group_id || "",
                groupSessionId: parsed.groupSessionId || parsed.group_session_id || archive.groupSessionId || archive.group_session_id || rows[0]?.groupSessionId || rows[0]?.group_session_id || "",
            });
            if (targetKeys.has(identity.rootGroupId.toLowerCase()) || targetKeys.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase()))
                continue;
            sources.push({
                sourceKey: (0, typed_memory_shared_1.checksum)([ledgerGroupId || item.groupId, item.file], 18),
                sourceRootGroupKey: identity.rootGroupKey,
                sourceSessionKey: identity.sourceSessionKey,
                exactSession: identity.exactSession,
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
    const minFreshSourceGroups = Math.max(1, Number(options.minFreshSourceGroups || options.min_fresh_source_groups || minSourceGroups));
    const minSourceWeightedEvidence = Math.max(0.01, Number(options.minSourceWeightedEvidence || options.min_source_weighted_evidence || 0.25));
    const minWeightedEvidence = Math.max(0.01, Number(options.minWeightedEvidence || options.min_weighted_evidence || 0.5));
    const maxSourceGroupEvidenceShare = Math.max(0.5, Math.min(1, Number(options.maxSourceGroupEvidenceShare || options.max_source_group_evidence_share || 0.8)));
    const matchingSources = (sources || []).map((source) => {
        const rows = (Array.isArray(source.rows) ? source.rows : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        const attributions = (Array.isArray(source.attributions) ? source.attributions : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        return { ...source, rows, attributions };
    }).filter((source) => source.rows.length > 0);
    const score = scoreProviderDispatchReliabilityRows(matchingSources.flatMap((source) => source.rows), options);
    const groupedSources = new Map();
    for (const source of matchingSources) {
        const key = String(source.sourceRootGroupKey || source.sourceKey || "");
        groupedSources.set(key, [...(groupedSources.get(key) || []), source]);
    }
    const groupScores = [...groupedSources.entries()].map(([sourceRootGroupKey, groupSources]) => ({
        sourceRootGroupKey,
        sources: groupSources,
        score: scoreProviderDispatchReliabilityRows(groupSources.flatMap((source) => source.rows), options),
        activeFailure: groupSources.some((source) => source.attributions.some((row) => Number(row.consecutive_failure_count || row.consecutiveFailureCount || 0) >= failureThreshold)),
    }));
    const sourceGroupCount = groupScores.length;
    const sourceSessionCount = new Set(matchingSources.map((source) => source.sourceSessionKey || source.sourceKey).filter(Boolean)).size;
    const sourceLedgerCount = matchingSources.length;
    const freshSourceGroupCount = groupScores.filter(item => item.score.weightedEvidence >= minSourceWeightedEvidence).length;
    const activeFailureSourceCount = groupScores.filter(item => item.activeFailure).length;
    const maxObservedSourceGroupEvidence = Math.max(0, ...groupScores.map(item => Number(item.score.weightedEvidence || 0)));
    const maxObservedSourceGroupEvidenceShare = score.weightedEvidence > 0
        ? providerDispatchReliabilityRound(maxObservedSourceGroupEvidence / score.weightedEvidence)
        : 0;
    const promotionStatus = !score.attemptCount
        ? "empty"
        : sourceGroupCount < minSourceGroups
            ? "insufficient_independent_group_diversity"
            : freshSourceGroupCount < minFreshSourceGroups
                ? "insufficient_fresh_group_diversity"
                : score.weightedEvidence < minWeightedEvidence
                    ? "insufficient_decayed_evidence"
                    : maxObservedSourceGroupEvidenceShare > maxSourceGroupEvidenceShare
                        ? "single_group_evidence_dominance"
                        : "eligible_guidance";
    const actionable = promotionStatus === "eligible_guidance";
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
        source_session_count: sourceSessionCount,
        source_ledger_count: sourceLedgerCount,
        fresh_source_group_count: freshSourceGroupCount,
        active_failure_source_count: activeFailureSourceCount,
        half_life_days: score.halfLifeDays,
        recovery_credit: score.recoveryCredit,
        minimum_source_groups: minSourceGroups,
        promotion_contract: {
            schema: "ccm-provider-reliability-cross-session-promotion-contract-v1",
            status: promotionStatus,
            exact_session_evidence_preserved: matchingSources.some((source) => source.exactSession === true),
            distinct_root_groups_required: minSourceGroups,
            distinct_root_groups_observed: sourceGroupCount,
            distinct_source_sessions_observed: sourceSessionCount,
            source_ledgers_observed: sourceLedgerCount,
            fresh_root_groups_required: minFreshSourceGroups,
            fresh_root_groups_observed: freshSourceGroupCount,
            minimum_source_weighted_evidence: minSourceWeightedEvidence,
            minimum_total_weighted_evidence: minWeightedEvidence,
            maximum_single_group_evidence_share: maxSourceGroupEvidenceShare,
            observed_maximum_single_group_evidence_share: maxObservedSourceGroupEvidenceShare,
            time_decay_applied: true,
            privacy_redaction_required: true,
            same_group_sessions_count_as_one_group: true,
        },
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
        source_root_group_key: source.sourceRootGroupKey || source.sourceKey || "",
        source_session_key: source.sourceSessionKey || source.sourceKey || "",
        exact_session: source.exactSession === true,
        updated_at: source.updatedAt || "",
        attempt_count: Array.isArray(source.rows) ? source.rows.length : 0,
        content_checksum: (0, typed_memory_shared_1.checksum)((source.rows || []).map((row) => ({
            row_id: row.row_id || "",
            attempt_status: row.attempt_status || "",
            attempt_at: row.attempt_at || "",
            agent_type: row.agent_type || "",
        })), 32),
    })).sort((a, b) => String(a.source_key || "").localeCompare(String(b.source_key || "")));
    const sourceGroupCount = new Set(rows.map((row) => row.source_root_group_key).filter(Boolean)).size;
    const sourceSessionCount = new Set(rows.map((row) => row.source_session_key).filter(Boolean)).size;
    const totalAttempts = rows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0);
    const attemptsByGroup = new Map();
    for (const row of rows)
        attemptsByGroup.set(row.source_root_group_key, Number(attemptsByGroup.get(row.source_root_group_key) || 0) + Number(row.attempt_count || 0));
    const maxGroupAttemptShare = totalAttempts > 0 ? Math.max(0, ...attemptsByGroup.values()) / totalAttempts : 0;
    return {
        schema: "ccm-provider-dispatch-reliability-source-provenance-v1",
        source_ledger_count: rows.length,
        source_group_count: sourceGroupCount,
        source_session_count: sourceSessionCount,
        exact_session_ledger_count: rows.filter((row) => row.exact_session).length,
        attempt_count: totalAttempts,
        maximum_group_attempt_share: providerDispatchReliabilityRound(maxGroupAttemptShare),
        latest_source_updated_at: rows.map((row) => row.updated_at).filter(Boolean).sort().slice(-1)[0] || "",
        generation_checksum: (0, typed_memory_shared_1.checksum)(rows, 40),
        source_group_diversity_checksum: (0, typed_memory_shared_1.checksum)([...attemptsByGroup.keys()].sort(), 32),
        source_keys_hashed: true,
        group_ids_included: false,
        project_names_included: false,
        private_evidence_included: false,
    };
}
function buildGlobalProviderDispatchReliabilitySignals(options = {}) {
    const sources = loadProviderDispatchReliabilitySources({ ...options, targetGroupId: "" });
    const agentTypes = (0, typed_memory_shared_1.uniqueStrings)(sources.flatMap((source) => source.rows.map((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase()).filter(Boolean)), 64);
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
    return String(options.snapshotFile || options.snapshot_file || path.join(typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR, "snapshot.json"));
}
function globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshot = {}) {
    return (0, typed_memory_shared_1.checksum)({
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
    return (0, typed_memory_shared_1.checksum)(comparable, 48);
}
function writeGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const file = getGlobalProviderDispatchReliabilitySnapshotFile(options);
    const generatedAtMs = providerDispatchReliabilityNowMs(options);
    const ttlMs = Math.max(30_000, Math.min(24 * 60 * 60 * 1000, Number(options.ttlMs || options.ttl_ms || typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS)));
    const signals = buildGlobalProviderDispatchReliabilitySignals({
        ...options,
        generatedAt: new Date(generatedAtMs).toISOString(),
        nowMs: generatedAtMs,
    });
    const sourceProvenance = signals.source_provenance || {};
    const snapshotBase = {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-v1",
        version: typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION,
        snapshot_id: `provider-reliability-snapshot:${(0, typed_memory_shared_1.checksum)([
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
    (0, typed_memory_shared_1.writeJsonAtomic)(file, snapshotBase);
    return { ...snapshotBase, file };
}
function validateGlobalProviderDispatchReliabilitySnapshot(snapshot = {}, options = {}) {
    const nowMs = providerDispatchReliabilityNowMs(options);
    const gaps = [];
    if (snapshot.schema !== "ccm-global-provider-dispatch-reliability-snapshot-v1")
        gaps.push("schema");
    if (Number(snapshot.version || 0) !== typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION)
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
        const snapshot = (0, typed_memory_shared_1.readJson)(candidate.file, null);
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
    return `context-usage-repair:${(0, typed_memory_shared_1.checksum)([
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
            version: typed_memory_shared_1.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
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
                suggestion: (0, typed_memory_shared_1.compactText)(item.suggestion || item.instruction || item.reason || "", 360),
            })),
            instruction: (0, typed_memory_shared_1.compactText)(entry.instruction || raw?.instruction || "", 1200),
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "context_usage.status<=warn; free_tokens>=autocompact_buffer_tokens; rendered Context usage budget present", 700),
            reason: (0, typed_memory_shared_1.compactText)(entry.source_reason || entry.description || raw?.reason || raw?.source_reason || "", 700),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: contextUsageRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_packet_context_usage_repair" || /context usage|Context usage budget|free_tokens|autocompact_buffer|typed MEMORY/i.test(`${row.reason}\n${row.instruction}\n${row.expected}`));
}
function mergeContextUsageRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const overBudgetRows = rows.filter((row) => row.usage_status === "over_budget");
    const criticalRows = rows.filter((row) => row.usage_status === "critical");
    const compactRows = rows.filter((row) => row.usage_status === "compact_recommended");
    return {
        schema: "ccm-context-usage-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
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
        `Generated by CCM context usage repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
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
            lines.push(`  Suggested reductions: ${(0, typed_memory_shared_1.compactText)(reductions, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillContextUsageRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillContextUsageRepairToTypedMemory(groupId, input, options);
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
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-compact-strategy-outcome-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            groupSessionId: String(entry.groupSessionId || entry.group_session_id || fallbackGroupSessionId || "").trim(),
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
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `compact-strategy-outcome:${(0, typed_memory_shared_1.checksum)([
                row.groupId,
                row.groupSessionId,
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
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const categories = normalizeCompactStrategyCategories(strategy);
    const preferred = Array.isArray(strategy.preferred_categories || strategy.preferredCategories)
        ? (strategy.preferred_categories || strategy.preferredCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "prefer").map((item) => item.category);
    const avoid = Array.isArray(strategy.avoid_categories || strategy.avoidCategories)
        ? (strategy.avoid_categories || strategy.avoidCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "avoid").map((item) => item.category);
    const groupSessionId = String(strategy.groupSessionId || strategy.group_session_id || options.groupSessionId || options.group_session_id || "").trim();
    const outcomeRows = normalizeCompactStrategyOutcomeRows(outcomes, {
        ...options,
        groupId: strategy.groupId || strategy.group_id,
        groupSessionId,
    });
    return {
        schema: "ccm-compact-strategy-typed-memory-distillation-v1",
        version: typed_memory_shared_1.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(strategy.groupId || strategy.group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId,
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
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped compact strategy memory.",
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
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped compact strategy memory.",
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
    return require("./group-memory-distillation").distillCompactStrategyToTypedMemory(groupId, input, options);
}
function normalizePtlEmergencyHintForTypedMemory(input = {}, options = {}) {
    const raw = input.hint || input.ptlEmergencyHint || input.ptl_emergency_hint || input || {};
    const retryOptions = raw.recommended_retry_options || raw.recommendedRetryOptions || {};
    return {
        schema: "ccm-ptl-emergency-typed-memory-hint-v1",
        version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(raw.groupId || raw.group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId: String(raw.groupSessionId || raw.group_session_id || options.groupSessionId || options.group_session_id || "").trim(),
        hint_id: String(raw.hint_id || raw.hintId || "").trim(),
        engaged: raw.engaged === true,
        emergency_level: String(raw.emergency_level || raw.emergencyLevel || (raw.engaged ? "warning" : "none")).trim(),
        reason: (0, typed_memory_shared_1.compactText)(raw.reason || "", 900),
        blocked_outcome_count: Number(raw.blocked_outcome_count || raw.blockedOutcomeCount || 0),
        task_compacted_blocked_count: Number(raw.task_compacted_blocked_count || raw.taskCompactedBlockedCount || 0),
        repeated_failed_categories: (0, typed_memory_shared_1.uniqueStrings)((Array.isArray(raw.repeated_failed_categories || raw.repeatedFailedCategories)
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
        generated_at: String(raw.generated_at || raw.generatedAt || options.updatedAt || (0, typed_memory_shared_1.now)()),
    };
}
function normalizePtlEmergencyOutcomeRows(rows = [], options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || "").trim();
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-ptl-emergency-typed-memory-outcome-row-v1",
            version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            groupSessionId: String(entry.groupSessionId || entry.group_session_id || fallbackGroupSessionId || "").trim(),
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
            selected_categories: (0, typed_memory_shared_1.uniqueStrings)(categories, 20),
            partial_omitted_chars: Number(entry.partial_omitted_chars || entry.partialOmittedChars || entry.omitted_chars || 0),
            distillation_candidate: entry.distillation_candidate !== false,
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `ptl-emergency-outcome:${(0, typed_memory_shared_1.checksum)([
                row.groupId,
                row.groupSessionId,
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
                : [], { ...options, groupId, groupSessionId: hint.groupSessionId || options.groupSessionId || options.group_session_id || "" });
    const failedCategories = (0, typed_memory_shared_1.uniqueStrings)([
        ...(hint.repeated_failed_categories || []),
        ...outcomeRows.flatMap((row) => row.selected_categories || []),
    ], 40);
    return {
        schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
        version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        groupSessionId: hint.groupSessionId || String(options.groupSessionId || options.group_session_id || ""),
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
        updatedAt: String(options.updatedAt || (0, typed_memory_shared_1.now)()),
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
        `Generated by CCM PTL emergency typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped PTL emergency memory.",
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
    return require("./group-memory-distillation").distillPtlEmergencyDowngradeToTypedMemory(groupId, input, options);
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
function evaluateGroupTypedMemoryDistillationQuality(groupId, options = {}) {
    return require("./group-memory-distillation").evaluateGroupTypedMemoryDistillationQuality(groupId, options);
}
function groupTypedMemoryDistillationArchiveFingerprint(archive = {}) {
    return (0, typed_memory_shared_1.checksum)((Array.isArray(archive?.rows) ? archive.rows : []).map((row) => [
        row?.candidate_id || "",
        row?.value || "",
        row?.recommendation || "",
        Number(row?.used_count || 0),
        Number(row?.verified_count || 0),
        Number(row?.ignored_count || 0),
        Number(row?.mentioned_count || 0),
    ]), 40);
}
function buildGroupTypedMemoryDistillationWorkState(groupId, messages = [], options = {}) {
    const maxMessages = Math.max(1, Math.min(5000, Number(options.maxMessages || options.max_messages || typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES)));
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const eligibleRows = (messages || [])
        .filter(message => !String(message?.content || "").startsWith("📤"))
        .map((message, index) => ({ message, index, id: (0, typed_memory_shared_1.messageIdentity)(message, index) }));
    const previousCursorMessageId = String(ledger.distillationCursor?.lastCommittedMessageId
        || ledger.distillation_cursor?.last_committed_message_id
        || ledger.lastDistilledMessageId
        || "");
    const cursorIndex = previousCursorMessageId
        ? eligibleRows.findIndex(row => row.id === previousCursorMessageId)
        : -1;
    const forceRescan = options.forceDistillationRescan === true || options.force_distillation_rescan === true;
    const cursorMissing = !!previousCursorMessageId && cursorIndex < 0;
    const pendingRows = forceRescan || !previousCursorMessageId || cursorMissing
        ? eligibleRows
        : eligibleRows.slice(cursorIndex + 1);
    const selectedRows = pendingRows.slice(0, maxMessages);
    const existingAdmission = filterExistingDistilledFactsByAdmission(ledger.facts || {});
    const inflatedFactCount = Object.values(ledger.facts || {}).reduce((total, bucket) => total + Object.values(bucket || {}).filter((fact) => Number(fact?.count || 1) > 1).length, 0);
    const inflatedAdmissionObservationCount = (Array.isArray(ledger.admission?.observations) ? ledger.admission.observations : [])
        .filter((row) => Number(row?.count || 1) > 1).length;
    const postCompactUsageArchive = (0, typed_memory_shared_1.buildPostCompactCandidateUsageArchive)(options);
    const previousPostCompactUsageArchive = ledger.postCompactUsageArchive || {};
    const postCompactUsageArchiveChanged = postCompactUsageArchive.archived_count > 0
        && groupTypedMemoryDistillationArchiveFingerprint(postCompactUsageArchive) !== groupTypedMemoryDistillationArchiveFingerprint(previousPostCompactUsageArchive);
    const transactionState = readGroupTypedMemoryDistillationTransactionState(groupId);
    const artifactTransaction = (0, typed_memory_index_build_1.inspectGroupTypedMemoryArtifactTransaction)(groupId);
    const artifactStagePresent = fs.existsSync((0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionStageRoot)(groupId));
    const artifactRecoveryRequired = artifactTransaction.present
        && (!artifactTransaction.valid || String(artifactTransaction.journal?.status || "") === "prepared" || artifactStagePresent);
    const recoveryReasons = [
        fs.existsSync(getGroupTypedMemoryDistillationLockFile(groupId)) ? "distillation_lock_present" : "",
        artifactRecoveryRequired
            ? !artifactTransaction.valid
                ? "artifact_journal_corrupt"
                : String(artifactTransaction.journal?.status || "") === "prepared"
                    ? "artifact_journal_prepared"
                    : "artifact_stage_present"
            : "",
        transactionState.valid && ["started", "in_progress", "failed"].includes(String(transactionState.state?.status || ""))
            ? `transaction_state_${String(transactionState.state?.status || "unknown")}`
            : "",
    ].filter(Boolean);
    const maintenanceReasons = [
        existingAdmission.rejected.length > 0 ? "inadmissible_existing_facts" : "",
        postCompactUsageArchiveChanged ? "post_compact_usage_archive_changed" : "",
        inflatedFactCount > 0 ? "inflated_fact_counts" : "",
        inflatedAdmissionObservationCount > 0 ? "inflated_admission_observations" : "",
    ].filter(Boolean);
    const disabled = options.disabled === true || options.disableDistillation === true || options.disable_distillation === true;
    const runRequired = recoveryReasons.length > 0
        || (!disabled && (forceRescan || pendingRows.length > 0 || maintenanceReasons.length > 0));
    return {
        ledger,
        eligibleRows,
        previousCursorMessageId,
        cursorIndex,
        forceRescan,
        cursorMissing,
        pendingRows,
        selectedRows,
        existingAdmission,
        inflatedFactCount,
        inflatedAdmissionObservationCount,
        postCompactUsageArchive,
        postCompactUsageArchiveChanged,
        artifactTransaction,
        artifactStagePresent,
        recoveryReasons,
        maintenanceReasons,
        disabled,
        runRequired,
        maxMessages,
    };
}
function inspectGroupTypedMemoryDistillationWork(groupId, messages = [], options = {}) {
    return require("./group-memory-distillation").inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
}
// ===== merged from typed-memory-distillation-receipts-part-05.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function distillGroupMessagesToTypedMemoryUnlocked(groupId, messages = [], memory = {}, options = {}) {
    if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
        return { schema: "ccm-group-typed-memory-distillation-v1", version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION, groupId, skipped: true, reason: "disabled" };
    }
    const updatedAt = (0, typed_memory_shared_1.now)();
    const workState = buildGroupTypedMemoryDistillationWorkState(groupId, messages, options);
    const { ledger, eligibleRows, previousCursorMessageId, cursorIndex, forceRescan, cursorMissing, pendingRows, selectedRows, existingAdmission, inflatedFactCount, inflatedAdmissionObservationCount, postCompactUsageArchive, } = workState;
    const sourceMessages = selectedRows.map(row => ({ ...row.message, __typedMemorySourceIndex: row.index }));
    const cursorAudit = {
        schema: "ccm-group-typed-memory-distillation-cursor-v1",
        previousCommittedMessageId: previousCursorMessageId,
        lastCommittedMessageId: selectedRows[selectedRows.length - 1]?.id || previousCursorMessageId,
        cursorFound: !previousCursorMessageId || cursorIndex >= 0,
        cursorMissingFallback: cursorMissing,
        forceRescan,
        eligibleMessageCount: eligibleRows.length,
        pendingMessageCount: pendingRows.length,
        processedMessageCount: selectedRows.length,
        remainingMessageCount: Math.max(0, pendingRows.length - selectedRows.length),
        batchLimited: pendingRows.length > selectedRows.length,
        committedAt: updatedAt,
    };
    const directRequests = sourceMessages
        .map((message, index) => (0, typed_memory_index_build_1.normalizeGroupDirectMemoryRequest)(groupId, message, index))
        .filter(Boolean);
    const extractedCandidates = extractGroupLogDistillationCandidates(groupId, sourceMessages);
    const lifecycleRequests = extractGroupLogPositiveFeedbackLifecycleRequests(groupId, sourceMessages);
    const admissionResult = applyGroupLogDistillationAdmission(extractedCandidates);
    const candidates = admissionResult.admitted;
    const maintenanceRequired = existingAdmission.rejected.length > 0
        || workState.postCompactUsageArchiveChanged
        || inflatedFactCount > 0
        || inflatedAdmissionObservationCount > 0;
    if (!sourceMessages.length && !maintenanceRequired && !forceRescan) {
        return {
            schema: "ccm-group-typed-memory-distillation-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId,
            skipped: true,
            reason: "no_new_messages_after_committed_cursor",
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
            cursor: { ...cursorAudit, committedAt: String(ledger.distillationCursor?.committedAt || ledger.lastDistilledAt || "") },
            lastDistilledMessageId: previousCursorMessageId,
            distilledAt: String(ledger.lastDistilledAt || ledger.updatedAt || ""),
        };
    }
    let facts = { ...existingAdmission.admittedFacts };
    const admissionBase = buildGroupLogDistillationAdmissionLedger(ledger.admission, candidates, admissionResult.rejected, existingAdmission.rejected, updatedAt);
    let newFactCount = 0;
    let updatedFactCount = 0;
    for (const candidate of candidates) {
        const type = (0, typed_memory_shared_1.normalizeMemoryType)(candidate.category);
        const bucket = facts[type] || {};
        const previous = bucket[candidate.checksum];
        bucket[candidate.checksum] = {
            ...candidate,
            firstSeenAt: previous?.firstSeenAt || updatedAt,
            lastSeenAt: updatedAt,
            count: previous ? Math.max(1, Number(previous.count || 1)) : 1,
        };
        facts[type] = bucket;
        if (previous)
            updatedFactCount += 1;
        else
            newFactCount += 1;
    }
    const tombstoneFiltered = (0, typed_memory_index_build_1.filterFactsByDirectMemoryTombstones)(facts, ledger.directMemory);
    facts = tombstoneFiltered.facts;
    const directApplied = (0, typed_memory_index_build_1.applyGroupDirectMemoryRequests)(groupId, facts, directRequests, ledger.directMemory, updatedAt);
    facts = directApplied.facts;
    const directMemory = {
        ...directApplied.ledger,
        tombstoneSuppressedFactCountThisRun: tombstoneFiltered.suppressedCount,
    };
    const lifecycleApplied = applyGroupPositiveFeedbackLifecycle(groupId, facts, lifecycleRequests, ledger.positiveFeedbackLifecycle, { updatedAt, projectRoot: String(options.projectRoot || options.project_root || "") });
    facts = lifecycleApplied.facts;
    const positiveFeedbackLifecycle = lifecycleApplied.lifecycle;
    const admission = {
        ...admissionBase,
        positiveFeedbackActiveCount: Number(positiveFeedbackLifecycle.activeValidatedCount || 0),
        positiveFeedbackRevokedCount: Number(positiveFeedbackLifecycle.revokedCount || 0),
        positiveFeedbackSupersededCount: Number(positiveFeedbackLifecycle.supersededCount || 0),
        positiveFeedbackLifecycleRejectedThisRun: Number(positiveFeedbackLifecycle.rejectedThisRun || 0),
        positiveFeedbackLifecycleInvalidBindingThisRun: Number(positiveFeedbackLifecycle.invalidBindingThisRun || 0),
        positiveFeedbackCurrentSourceProofCount: Number(positiveFeedbackLifecycle.currentSourceProofCount || 0),
    };
    const prunedFacts = pruneDistilledFacts(facts, Number(options.perTypeLimit || options.per_type_limit || typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT));
    const lastMessageId = cursorAudit.lastCommittedMessageId;
    const transaction = options.__distillationTransaction || null;
    if (transaction?.handle) {
        const renewed = renewGroupTypedMemoryDistillationLock(transaction.handle);
        if (!renewed.renewed)
            throw new Error(`typed_memory_distillation_lock_lost_before_document_commit:${renewed.reason}`);
    }
    const distillationTransaction = transaction?.handle ? {
        schema: "ccm-group-typed-memory-distillation-transaction-commit-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
        groupId,
        leaseId: String(transaction.handle.lock?.leaseId || ""),
        fencingToken: Number(transaction.handle.lock?.fencingToken || 0),
        ownerPid: Number(transaction.handle.lock?.ownerPid || 0),
        ownerHostname: String(transaction.handle.lock?.ownerHostname || ""),
        acquiredAt: String(transaction.handle.lock?.acquiredAt || ""),
        renewedAt: String(transaction.handle.lock?.renewedAt || ""),
        waitedMs: Number(transaction.handle.waitedMs || 0),
        recoveredLeaseCount: Number(transaction.handle.recoveredLeaseCount || 0),
        committedAt: updatedAt,
        lastCommittedMessageId: lastMessageId,
    } : null;
    const writes = [];
    const removals = [];
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
            description: "Non-obvious project motivations with durable future impact distilled from the group transcript.",
            title: "Distilled Group-Log Project Context",
        },
        {
            type: "feedback",
            slug: "distilled-log-feedback-failures",
            name: "Distilled group-log feedback, validated approaches and failures",
            description: "Durable user corrections, bound positive confirmations and recurring non-obvious failures distilled from the group transcript.",
            title: "Distilled Group-Log Feedback, Validated Approaches And Failures",
        },
        {
            type: "reference",
            slug: "distilled-log-reference-artifacts",
            name: "Distilled group-log reference artifacts",
            description: "External resources and their future lookup purpose distilled from the group transcript.",
            title: "Distilled Group-Log Reference Artifacts",
        },
    ];
    for (const spec of docSpecs) {
        const bucket = Object.values(prunedFacts[spec.type] || {}).sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0));
        if (!bucket.length) {
            const staleFile = path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), `${(0, typed_memory_shared_1.safeSegment)(spec.slug)}.md`);
            if (fs.existsSync(staleFile)) {
                try {
                    const mutation = typed_memory_shared_1.activeGroupTypedMemoryDistillationMutations.get(groupId);
                    const removed = mutation?.handle
                        ? (0, typed_memory_shared_1.stageGroupTypedMemoryArtifactRemoval)(mutation, staleFile)
                        : (() => { fs.unlinkSync(staleFile); return true; })();
                    removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed, reason: "no_admitted_facts" });
                }
                catch (error) {
                    removals.push({ file: staleFile, slug: spec.slug, type: spec.type, removed: false, reason: "no_admitted_facts", error: (0, typed_memory_shared_1.compactText)(error?.message || error, 300) });
                }
            }
            continue;
        }
        writes.push((0, typed_memory_index_build_1.upsertGroupTypedMemoryDocument)(groupId, {
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
        writes.push((0, typed_memory_index_build_1.upsertGroupTypedMemoryDocument)(groupId, {
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
    const index = (0, typed_memory_index_build_1.buildGroupTypedMemoryIndex)(groupId);
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        extractedCandidateCount: extractedCandidates.length,
        rejectedCandidateCount: admissionResult.rejected.length,
        newFactCount,
        updatedFactCount,
        lastDistilledMessageId: lastMessageId,
        lastDistilledAt: updatedAt,
        distillationCursor: cursorAudit,
        cumulativeProcessedMessageCount: Number(ledger.cumulativeProcessedMessageCount || 0) + sourceMessages.length,
        duplicateInflationRepair: {
            schema: "ccm-group-typed-memory-distillation-duplicate-inflation-repair-v1",
            repairedFactCount: inflatedFactCount,
            repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
            repairedAt: updatedAt,
        },
        ...preservedGroupTypedMemoryDistillationArchives(ledger),
        facts: prunedFacts,
        admission,
        positiveFeedbackLifecycle,
        directMemory,
        ...(distillationTransaction ? { distillationTransaction } : {}),
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
            updatedAt,
        },
        updatedAt,
    });
    const quality = evaluateGroupTypedMemoryDistillationQuality(groupId, {
        projectRoot: options.projectRoot || options.project_root,
    });
    const persistedLedger = readGroupTypedMemoryDistillationLedger(groupId);
    if (transaction?.handle) {
        const renewed = renewGroupTypedMemoryDistillationLock(transaction.handle);
        if (!renewed.renewed)
            throw new Error(`typed_memory_distillation_lock_lost_before_quality_commit:${renewed.reason}`);
        if (distillationTransaction)
            distillationTransaction.renewedAt = String(transaction.handle.lock?.renewedAt || distillationTransaction.renewedAt);
    }
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, {
        schema: "ccm-group-typed-memory-distillation-ledger-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        extractedCandidateCount: extractedCandidates.length,
        rejectedCandidateCount: admissionResult.rejected.length,
        newFactCount,
        updatedFactCount,
        lastDistilledMessageId: lastMessageId,
        lastDistilledAt: updatedAt,
        distillationCursor: cursorAudit,
        cumulativeProcessedMessageCount: Number(persistedLedger.cumulativeProcessedMessageCount || ledger.cumulativeProcessedMessageCount || 0),
        duplicateInflationRepair: persistedLedger.duplicateInflationRepair || {
            schema: "ccm-group-typed-memory-distillation-duplicate-inflation-repair-v1",
            repairedFactCount: inflatedFactCount,
            repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
            repairedAt: updatedAt,
        },
        ...preservedGroupTypedMemoryDistillationArchives(persistedLedger, ledger),
        facts: persistedLedger.facts || prunedFacts,
        admission: persistedLedger.admission || admission,
        positiveFeedbackLifecycle: persistedLedger.positiveFeedbackLifecycle || positiveFeedbackLifecycle,
        directMemory: persistedLedger.directMemory || directMemory,
        ...(distillationTransaction ? { distillationTransaction } : {}),
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
            updatedAt,
        },
        quality,
        updatedAt,
    });
    return {
        schema: "ccm-group-typed-memory-distillation-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        skipped: false,
        reason: (0, typed_memory_shared_1.compactText)(options.reason || "", 220),
        ledgerFile: ledger.file,
        sourceMessageCount: sourceMessages.length,
        candidateCount: candidates.length,
        extractedCandidateCount: extractedCandidates.length,
        rejectedCandidateCount: admissionResult.rejected.length,
        evictedExistingFactCount: existingAdmission.rejected.length,
        newFactCount,
        updatedFactCount,
        writeCount: writes.length,
        removalCount: removals.filter(item => item.removed === true).length,
        writes,
        removals,
        index,
        quality,
        admission: persistedLedger.admission || admission,
        positiveFeedbackLifecycle: persistedLedger.positiveFeedbackLifecycle || positiveFeedbackLifecycle,
        directMemory: persistedLedger.directMemory || directMemory,
        distillationTransaction,
        postCompactUsageArchive: {
            schema: postCompactUsageArchive.schema,
            archived_count: postCompactUsageArchive.archived_count,
            rows: postCompactUsageArchive.rows,
        },
        cursor: cursorAudit,
        duplicateInflationRepair: {
            repairedFactCount: inflatedFactCount,
            repairedAdmissionObservationCount: inflatedAdmissionObservationCount,
        },
        lastDistilledMessageId: lastMessageId,
        distilledAt: updatedAt,
    };
}
function distillGroupMessagesToTypedMemory(groupId, messages = [], memory = {}, options = {}) {
    return require("./group-memory-distillation").distillGroupMessagesToTypedMemory(groupId, messages, memory, options);
}
function distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages = [], memory = {}, options = {}) {
    return require("./group-memory-distillation").distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages, memory, options);
}
function buildGroupSessionModelExtractionTopicRecallIndex(groupId) {
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const archive = ledger.modelExtractionTypedMemoryArchive || null;
    const valid = !!archive
        && archive.schema === "ccm-group-session-model-extraction-typed-memory-archive-v1"
        && modelExtractionTypedArchiveChecksum(archive) === String(archive.checksum || "");
    const byRelPath = new Map();
    if (valid) {
        for (const topic of Object.values(archive.topics || {})) {
            if (topic?.status !== "active")
                continue;
            for (const slug of topic.docSlugs || []) {
                byRelPath.set(`${String(slug || "").toLowerCase()}.md`, topic);
            }
        }
    }
    return {
        schema: "ccm-group-session-model-extraction-topic-recall-index-v1",
        valid,
        archivePresent: !!archive,
        archiveChecksum: String(archive?.checksum || ""),
        byRelPath,
    };
}
function scoreGroupSessionModelExtractionTopicRecall(doc, topic, query, queryTokens) {
    if (!topic)
        return null;
    const queryProfile = modelExtractionTopicConceptProfile(query);
    const similarity = modelExtractionTopicSimilarity(queryProfile.concepts, topic.concepts || []);
    const factText = String(doc.body || "").split("\n")
        .filter(line => /^- #/.test(line.trim()))
        .join("\n")
        .toLowerCase();
    const genericTokens = new Set(["continue", "project", "task", "memory", "session", "agent", "继续", "任务", "项目", "记忆", "会话"]);
    const matchedTokens = queryTokens.filter(token => !genericTokens.has(token) && factText.includes(token));
    const latinMatches = matchedTokens.filter(token => /[a-z0-9_]/i.test(token) && token.length >= 5);
    const cjkMatches = matchedTokens.filter(token => /^[\u3400-\u9fff]+$/.test(token));
    const strongLexicalMatch = latinMatches.length > 0 || cjkMatches.length >= 2;
    const unclassified = /_unclassified$/.test(String(topic.topicId || ""));
    const semanticMatch = !unclassified && similarity >= typed_memory_shared_1.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY;
    const eligible = semanticMatch || strongLexicalMatch;
    const adjustment = semanticMatch
        ? Math.max(8, Math.round(similarity * 24))
        : strongLexicalMatch
            ? Math.min(14, 4 + latinMatches.length * 3 + cjkMatches.length)
            : -12;
    return {
        schema: "ccm-group-session-model-extraction-topic-recall-score-v1",
        topicId: String(topic.topicId || ""),
        topicSlug: String(topic.slug || ""),
        assignmentVersion: Number(topic.assignmentVersion || topic.version || 0),
        similarity: Number(similarity.toFixed(4)),
        queryConcepts: queryProfile.concepts,
        topicConcepts: topic.concepts || [],
        matchedTokens: (0, typed_memory_shared_1.uniqueStrings)(matchedTokens, 24),
        semanticMatch,
        strongLexicalMatch,
        unclassified,
        meanAssignmentConfidence: Number(topic.meanAssignmentConfidence || 0),
        lowConfidenceFactCount: Number(topic.lowConfidenceFactCount || 0),
        eligible,
        adjustment,
    };
}
//# sourceMappingURL=typed-memory-distillation-receipts.js.map