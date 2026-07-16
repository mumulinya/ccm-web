"use strict";
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
exports.runWorkerContextPreDispatchGateSelfTest = runWorkerContextPreDispatchGateSelfTest;
exports.runWorkerContextCompactionRetrySelfTest = runWorkerContextCompactionRetrySelfTest;
exports.runWorkerContextMemoryFirstCompactionRetrySelfTest = runWorkerContextMemoryFirstCompactionRetrySelfTest;
exports.runWorkerContextPartialCompactionRetrySelfTest = runWorkerContextPartialCompactionRetrySelfTest;
exports.runWorkerContextMetadataPartialCompactionRetrySelfTest = runWorkerContextMetadataPartialCompactionRetrySelfTest;
exports.runWorkerContextMetadataPartialCompactPolicySelfTest = runWorkerContextMetadataPartialCompactPolicySelfTest;
exports.runWorkerContextCompactOutcomeLedgerSelfTest = runWorkerContextCompactOutcomeLedgerSelfTest;
exports.runWorkerContextCompactStrategyMemorySelfTest = runWorkerContextCompactStrategyMemorySelfTest;
exports.runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest;
exports.runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest;
exports.runWorkerContextPtlEmergencyDowngradeSelfTest = runWorkerContextPtlEmergencyDowngradeSelfTest;
exports.runWorkerContextCompletionMemoryCompactionPreservationSelfTest = runWorkerContextCompletionMemoryCompactionPreservationSelfTest;
exports.runWorkerContextIgnoreMemoryPolicySelfTest = runWorkerContextIgnoreMemoryPolicySelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchGateSelfTest = runWorkerContextPressureProvenanceProviderDispatchGateSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest;
exports.runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest = runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest;
exports.runWorkerContextProviderReliabilitySnapshotRankingSelfTest = runWorkerContextProviderReliabilitySnapshotRankingSelfTest;
exports.runWorkerContextProviderSwitchExecutionRankingSelfTest = runWorkerContextProviderSwitchExecutionRankingSelfTest;
exports.runWorkerContextProviderSwitchDecisionReceiptSelfTest = runWorkerContextProviderSwitchDecisionReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest = runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest;
exports.getWorkerContextCompactHookLedgerFileForCoordinator = getWorkerContextCompactHookLedgerFileForCoordinator;
exports.getWorkerContextCompactOutcomeLedgerFileForCoordinator = getWorkerContextCompactOutcomeLedgerFileForCoordinator;
exports.getWorkerContextCompactStrategyMemoryFileForCoordinator = getWorkerContextCompactStrategyMemoryFileForCoordinator;
exports.getWorkerContextPtlEmergencyHintFileForCoordinator = getWorkerContextPtlEmergencyHintFileForCoordinator;
exports.readWorkerContextCompactHookLedgerForCoordinator = readWorkerContextCompactHookLedgerForCoordinator;
exports.readWorkerContextCompactStrategyMemoryForCoordinator = readWorkerContextCompactStrategyMemoryForCoordinator;
exports.readWorkerContextPtlEmergencyHintForCoordinator = readWorkerContextPtlEmergencyHintForCoordinator;
exports.readWorkerContextCompactOutcomeLedgerForCoordinator = readWorkerContextCompactOutcomeLedgerForCoordinator;
exports.compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator = compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator;
exports.readWorkerContextCompactSessionArtifactsForCoordinator = readWorkerContextCompactSessionArtifactsForCoordinator;
exports.deleteWorkerContextCompactSessionArtifactsForCoordinator = deleteWorkerContextCompactSessionArtifactsForCoordinator;
exports.buildWorkerContextMetadataPartialCompactPolicyForCoordinator = buildWorkerContextMetadataPartialCompactPolicyForCoordinator;
exports.buildWorkerContextPacketForAssignment = buildWorkerContextPacketForAssignment;
exports.validateProviderSwitchDecisionReceiptForCoordinator = validateProviderSwitchDecisionReceiptForCoordinator;
exports.buildProviderSwitchDecisionReceiptForCoordinator = buildProviderSwitchDecisionReceiptForCoordinator;
exports.maybeRetryWorkerContextPacketCompactionForCoordinator = maybeRetryWorkerContextPacketCompactionForCoordinator;
exports.buildWorkerContextPreDispatchGateForCoordinator = buildWorkerContextPreDispatchGateForCoordinator;
exports.buildWorkerContextProviderDispatchDecisionForCoordinator = buildWorkerContextProviderDispatchDecisionForCoordinator;
exports.recordWorkerContextPacketAssignmentBindingForCoordinator = recordWorkerContextPacketAssignmentBindingForCoordinator;
exports.recordWorkerContextProviderSwitchSessionBindingForCoordinator = recordWorkerContextProviderSwitchSessionBindingForCoordinator;
exports.recordWorkerContextProviderSwitchExecutionReceiptForCoordinator = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator;
exports.recordWorkerContextProviderDispatchOverrideCompletionForCoordinator = recordWorkerContextProviderDispatchOverrideCompletionForCoordinator;
exports.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator;
const fs = __importStar(require("fs"));
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_memory_index_1 = require("./group-memory-index");
const model_capability_cache_1 = require("./model-capability-cache");
const group_orchestrator_1 = require("./group-orchestrator");
function runWorkerContextPreDispatchGateSelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextPreDispatchGateSelfTest();
}
function runWorkerContextCompactionRetrySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactionRetrySelfTest();
}
function runWorkerContextMemoryFirstCompactionRetrySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextMemoryFirstCompactionRetrySelfTest();
}
function runWorkerContextPartialCompactionRetrySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactionRetrySelfTest();
}
function runWorkerContextMetadataPartialCompactionRetrySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextMetadataPartialCompactionRetrySelfTest();
}
function runWorkerContextMetadataPartialCompactPolicySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextMetadataPartialCompactPolicySelfTest();
}
function runWorkerContextCompactOutcomeLedgerSelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactOutcomeLedgerSelfTest();
}
function runWorkerContextCompactStrategyMemorySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextCompactStrategyMemorySelfTest();
}
function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest();
}
function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest();
}
function runWorkerContextPtlEmergencyDowngradeSelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextPtlEmergencyDowngradeSelfTest();
}
function runWorkerContextCompletionMemoryCompactionPreservationSelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
}
function runWorkerContextIgnoreMemoryPolicySelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextIgnoreMemoryPolicySelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextPressureProvenanceProviderDispatchGateSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest();
}
function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest();
}
function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest();
}
function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
    return require("./group-orchestrator-memory-self-tests").runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest();
}
function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderReliabilitySnapshotRankingSelfTest();
}
function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderSwitchExecutionRankingSelfTest();
}
function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextProviderSwitchDecisionReceiptSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
    return require("./group-orchestrator-provider-self-tests").runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest();
}
function getWorkerContextCompactHookLedgerFileForCoordinator(groupId, groupSessionId = "") {
    return (0, group_orchestrator_1.getWorkerContextCompactScopedFileForCoordinator)(group_orchestrator_1.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR, groupId, groupSessionId);
}
function getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId = "") {
    return (0, group_orchestrator_1.getWorkerContextCompactScopedFileForCoordinator)(group_orchestrator_1.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR, groupId, groupSessionId);
}
function getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId = "") {
    return (0, group_orchestrator_1.getWorkerContextCompactScopedFileForCoordinator)(group_orchestrator_1.GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR, groupId, groupSessionId);
}
function getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId = "") {
    return (0, group_orchestrator_1.getWorkerContextCompactScopedFileForCoordinator)(group_orchestrator_1.GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR, groupId, groupSessionId);
}
function readWorkerContextCompactHookLedgerForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const file = getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId);
    const loaded = (0, group_orchestrator_1.readJsonWithBackupForCoordinator)(file, "ccm-worker-context-compact-hook-ledger-v1");
    if (loaded.value) {
        const entries = (Array.isArray(loaded.value.entries) ? loaded.value.entries.map(group_orchestrator_1.normalizeWorkerContextCompactHookEntryForCoordinator) : [])
            .filter((entry) => !exactSessionId || entry.group_id === groupId && entry.group_session_id === exactSessionId);
        return {
            ...loaded.value,
            groupId,
            groupSessionId: exactSessionId,
            scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
            file,
            recoveredFromBackup: loaded.recoveredFromBackup,
            entries,
            stats: (0, group_orchestrator_1.buildWorkerContextCompactHookStatsForCoordinator)(entries),
        };
    }
    return {
        schema: "ccm-worker-context-compact-hook-ledger-v1",
        version: 1,
        groupId,
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
        file,
        entries: [],
        stats: (0, group_orchestrator_1.buildWorkerContextCompactHookStatsForCoordinator)([]),
        updatedAt: "",
    };
}
function readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const file = getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, exactSessionId);
    const loaded = (0, group_orchestrator_1.readJsonWithBackupForCoordinator)(file, "ccm-worker-context-compact-strategy-memory-v1");
    if (loaded.value) {
        const storedSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(loaded.value.groupSessionId || loaded.value.group_session_id || "");
        if (exactSessionId && storedSessionId !== exactSessionId) {
            loaded.value = null;
        }
    }
    if (loaded.value) {
        const normalized = (0, group_orchestrator_1.normalizeWorkerContextCompactStrategyMemoryForCoordinator)({ ...loaded.value, file }, groupId, exactSessionId);
        return { ...normalized, recoveredFromBackup: loaded.recoveredFromBackup };
    }
    const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
    if (Array.isArray(outcomeLedger.entries) && outcomeLedger.entries.length) {
        return (0, group_orchestrator_1.writeWorkerContextCompactStrategyMemoryForCoordinator)(groupId, outcomeLedger.entries, {
            groupSessionId: exactSessionId,
            sourceLedgerFile: outcomeLedger.file,
            sourceLedgerUpdatedAt: outcomeLedger.updatedAt || outcomeLedger.stats?.latestAt || "",
        });
    }
    return (0, group_orchestrator_1.normalizeWorkerContextCompactStrategyMemoryForCoordinator)({
        groupId,
        groupSessionId: exactSessionId,
        file,
        source_ledger_file: getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId),
        sample_count: 0,
        categories: [],
    }, groupId, exactSessionId);
}
function readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const file = getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, exactSessionId);
    const loaded = (0, group_orchestrator_1.readJsonWithBackupForCoordinator)(file, "ccm-worker-context-ptl-emergency-hint-v1");
    if (loaded.value) {
        const storedSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(loaded.value.groupSessionId || loaded.value.group_session_id || "");
        if (exactSessionId && storedSessionId !== exactSessionId) {
            loaded.value = null;
        }
    }
    if (loaded.value) {
        const normalized = (0, group_orchestrator_1.normalizeWorkerContextPtlEmergencyHintForCoordinator)({ ...loaded.value, file }, groupId, exactSessionId);
        return { ...normalized, recoveredFromBackup: loaded.recoveredFromBackup };
    }
    const outcomeLedger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
    const strategy = readWorkerContextCompactStrategyMemoryForCoordinator(groupId, exactSessionId);
    return (0, group_orchestrator_1.writeWorkerContextPtlEmergencyHintForCoordinator)(groupId, outcomeLedger.entries || [], strategy, {
        groupSessionId: exactSessionId,
        sourceLedgerFile: outcomeLedger.file,
        sourceStrategyFile: strategy.file,
        sourceLedgerUpdatedAt: outcomeLedger.updatedAt || outcomeLedger.stats?.latestAt || "",
    });
}
function readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const file = getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId);
    const loaded = (0, group_orchestrator_1.readJsonWithBackupForCoordinator)(file, "ccm-worker-context-compact-outcome-ledger-v1");
    if (loaded.value) {
        const entries = (Array.isArray(loaded.value.entries) ? loaded.value.entries.map(group_orchestrator_1.normalizeWorkerContextCompactOutcomeEntryForCoordinator) : [])
            .filter((entry) => !exactSessionId || entry.group_id === groupId && entry.group_session_id === exactSessionId);
        return {
            ...loaded.value,
            groupId,
            groupSessionId: exactSessionId,
            scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
            file,
            recoveredFromBackup: loaded.recoveredFromBackup,
            entries,
            stats: (0, group_orchestrator_1.buildWorkerContextCompactOutcomeStatsForCoordinator)(entries),
        };
    }
    return {
        schema: "ccm-worker-context-compact-outcome-ledger-v1",
        version: 1,
        groupId,
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
        file,
        entries: [],
        stats: (0, group_orchestrator_1.buildWorkerContextCompactOutcomeStatsForCoordinator)([]),
        updatedAt: "",
    };
}
function compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId, options = {}) {
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || "");
    const ledger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId);
    const retained = (0, group_orchestrator_1.retainWorkerContextCompactOutcomeEntriesForCoordinator)(groupId, ledger.entries || [], {
        groupSessionId,
        at: options.at || options.generatedAt || options.generated_at || new Date().toISOString(),
        recentLimit: options.recentLimit || options.recent_limit,
    });
    const next = {
        ...ledger,
        schema: "ccm-worker-context-compact-outcome-ledger-v1",
        version: 1,
        groupId,
        groupSessionId,
        scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, groupSessionId),
        entries: retained.entries,
        stats: (0, group_orchestrator_1.buildWorkerContextCompactOutcomeStatsForCoordinator)(retained.entries),
        retention: retained.retention,
        updatedAt: options.at || options.generatedAt || options.generated_at || new Date().toISOString(),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file || getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId), next);
    return next;
}
function readWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId) {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    if (!exactSessionId) {
        return {
            schema: "ccm-worker-context-compact-session-artifacts-v1",
            status: "exact_group_session_required",
            groupId,
            groupSessionId: "",
            scopeId: String(groupId || ""),
            hook: null,
            outcome: null,
            strategy: null,
            ptlEmergency: null,
        };
    }
    const hook = readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
    const outcome = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
    const strategy = readWorkerContextCompactStrategyMemoryForCoordinator(groupId, exactSessionId);
    const ptlEmergency = readWorkerContextPtlEmergencyHintForCoordinator(groupId, exactSessionId);
    return {
        schema: "ccm-worker-context-compact-session-artifacts-v1",
        status: "ok",
        groupId,
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
        hook: {
            file: hook.file,
            entries: Number(hook.stats?.total || hook.entries?.length || 0),
            recoveredFromBackup: hook.recoveredFromBackup === true,
        },
        outcome: {
            file: outcome.file,
            entries: Number(outcome.stats?.total || outcome.entries?.length || 0),
            recovered: Number(outcome.stats?.recovered || 0),
            blocked: Number(outcome.stats?.blocked || 0),
            recoveredFromBackup: outcome.recoveredFromBackup === true,
        },
        strategy: {
            file: strategy.file,
            sampleCount: Number(strategy.sample_count || 0),
            preferredCategories: strategy.preferred_categories || [],
            avoidCategories: strategy.avoid_categories || [],
            recoveredFromBackup: strategy.recoveredFromBackup === true,
        },
        ptlEmergency: {
            file: ptlEmergency.file,
            engaged: ptlEmergency.engaged === true,
            emergencyLevel: ptlEmergency.emergency_level || "none",
            blockedOutcomeCount: Number(ptlEmergency.blocked_outcome_count || 0),
            recoveredFromBackup: ptlEmergency.recoveredFromBackup === true,
        },
    };
}
function deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId) {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    if (!exactSessionId)
        return { deleted: 0, status: "exact_group_session_required" };
    const files = [
        getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId),
        getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, exactSessionId),
        getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, exactSessionId),
        getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, exactSessionId),
        (0, group_orchestrator_1.getReplayRepairDispatchPlansFileForCoordinator)(groupId, exactSessionId),
    ];
    let deleted = 0;
    for (const file of files.flatMap(item => [item, `${item}.bak`])) {
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                deleted += 1;
            }
        }
        catch { }
    }
    return {
        schema: "ccm-worker-context-compact-session-artifact-delete-v1",
        status: "deleted",
        groupId,
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
        deleted,
    };
}
function buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet = {}, options = {}) {
    const supported = new Set(["constraints_and_documents", "contract_injections", "dependencies"]);
    const usage = packet.context_usage || packet.contextUsage || {};
    const topCategories = Array.isArray(usage.top_categories || usage.topCategories)
        ? (usage.top_categories || usage.topCategories)
        : [];
    const maxCategories = Math.max(1, Number(options.maxCategories || options.max_categories || 3));
    const minTokens = Math.max(0, Number(options.minCategoryTokens || options.min_category_tokens || 1));
    const rawStrategy = options.compactOutcomeStrategyMemory
        || options.compact_outcome_strategy_memory
        || options.compactStrategyMemory
        || options.compact_strategy_memory
        || options.strategyMemory
        || options.strategy_memory
        || null;
    const compactStrategyMemory = rawStrategy?.schema === "ccm-worker-context-compact-strategy-memory-v1"
        && (Number(rawStrategy.sample_count || rawStrategy.sampleCount || 0) > 0 || (Array.isArray(rawStrategy.categories) && rawStrategy.categories.length > 0))
        ? (0, group_orchestrator_1.normalizeWorkerContextCompactStrategyMemoryForCoordinator)(rawStrategy)
        : null;
    const pressureRecallUsageSummary = (0, group_orchestrator_1.workerContextPressureRecallUsageSummaryForCompactPolicy)({
        ...options,
        project: options.project || packet.project || "",
    });
    const pressureRecallUsageBias = (0, group_orchestrator_1.workerContextCompactStrategyPressureUsageBiasForCoordinator)(pressureRecallUsageSummary);
    const strategyByCategory = new Map((compactStrategyMemory?.categories || []).map((item) => [String(item.category || ""), item]));
    const preferredStrategyCategories = new Set(compactStrategyMemory?.preferred_categories || []);
    const candidates = topCategories
        .map((item, index) => {
        const category = String(item.id || item.category_id || item.categoryId || "");
        const strategy = strategyByCategory.get(category) || {};
        const strategyScore = Number(strategy.strategy_score || 0);
        const pressureUsageAdjustment = pressureRecallUsageBias.active && preferredStrategyCategories.has(category)
            ? Math.min(Number(pressureRecallUsageBias.category_adjustment_cap || 0), Math.max(0, Math.round(strategyScore * 0.55)))
            : 0;
        const candidate = {
            category,
            tokens: Number(item.tokens || 0),
            chars: Number(item.chars || 0),
            rank: index + 1,
            selection_score: Number(item.tokens || 0) + pressureUsageAdjustment,
            pressure_recall_usage_adjustment: pressureUsageAdjustment,
        };
        if (compactStrategyMemory?.schema) {
            candidate.strategy_score = strategyScore;
            candidate.strategy_recovery_rate = Number(strategy.recovery_rate || 0);
            candidate.strategy_avg_free_token_delta = Number(strategy.avg_free_token_delta || 0);
            candidate.strategy_recommendation = String(strategy.recommendation || "");
            candidate.strategy_preferred = preferredStrategyCategories.has(category);
        }
        return candidate;
    })
        .filter((item) => supported.has(item.category) && item.tokens >= minTokens)
        .sort((a, b) => Number(b.selection_score ?? b.tokens ?? 0) - Number(a.selection_score ?? a.tokens ?? 0)
        || Number(b.tokens || 0) - Number(a.tokens || 0)
        || Number(b.strategy_score || 0) - Number(a.strategy_score || 0)
        || Number(b.chars || 0) - Number(a.chars || 0))
        .slice(0, maxCategories);
    const availableFallbackCategories = [
        (Array.isArray(packet.constraints) && packet.constraints.length) || (Array.isArray(packet.document_findings) && packet.document_findings.length) ? "constraints_and_documents" : "",
        Array.isArray(packet.contract_injections) && packet.contract_injections.length ? "contract_injections" : "",
        Array.isArray(packet.dependencies) && packet.dependencies.length ? "dependencies" : "",
    ].filter(Boolean);
    const strategyPreferredFallback = (compactStrategyMemory?.preferred_categories || [])
        .filter((category) => availableFallbackCategories.includes(category));
    const fallbackCategories = [...new Set([...strategyPreferredFallback, ...availableFallbackCategories])];
    const selectedCategories = candidates.length
        ? candidates.map((item) => item.category)
        : fallbackCategories.slice(0, maxCategories);
    const skippedCategories = fallbackCategories.filter((category) => !selectedCategories.includes(category));
    const compactStrategySummary = compactStrategyMemory?.schema ? {
        schema: compactStrategyMemory.schema,
        strategy_id: compactStrategyMemory.strategy_id || "",
        source_ledger_file: compactStrategyMemory.source_ledger_file || "",
        sample_count: Number(compactStrategyMemory.sample_count || 0),
        preferred_categories: compactStrategyMemory.preferred_categories || [],
        avoid_categories: compactStrategyMemory.avoid_categories || [],
    } : null;
    const pressureRecallUsageSummaryRef = pressureRecallUsageSummary?.schema && (pressureRecallUsageSummary.has_history === true || Number(pressureRecallUsageSummary.memory_count || 0) > 0) ? {
        schema: pressureRecallUsageSummary.schema,
        source: pressureRecallUsageSummary.source || "",
        ledger_file: pressureRecallUsageSummary.ledger_file || "",
        target_project: pressureRecallUsageSummary.target_project || "",
        source_group_count: Number(pressureRecallUsageSummary.source_group_count || 0),
        source_groups: Array.isArray(pressureRecallUsageSummary.source_groups)
            ? pressureRecallUsageSummary.source_groups.slice(0, 8).map((item) => ({
                groupId: item.groupId || item.group_id || "",
                entry_count: Number(item.entry_count || 0),
                updatedAt: item.updatedAt || item.updated_at || "",
            }))
            : undefined,
        weighted_totals: pressureRecallUsageSummary.weighted_totals || {},
        aging: pressureRecallUsageSummary.aging ? {
            stale_entry_count: pressureRecallUsageSummary.aging.stale_entry_count || 0,
            fresh_entry_count: pressureRecallUsageSummary.aging.fresh_entry_count || 0,
            stale_memory_count: pressureRecallUsageSummary.aging.stale_memory_count || 0,
        } : undefined,
    } : null;
    return {
        schema: "ccm-worker-context-partial-compact-policy-v1",
        method: pressureRecallUsageBias.active
            ? "usage_top_category_pressure_with_outcome_strategy_and_pressure_recall_usage"
            : compactStrategySummary ? "usage_top_category_pressure_with_outcome_strategy" : "usage_top_category_pressure",
        source: [
            "worker_context_usage.top_categories",
            compactStrategySummary ? "compact_outcome_strategy_memory" : "",
            pressureRecallUsageBias.active ? "pressure_recall_usage_weighted_feedback" : "",
        ].filter(Boolean).join("+"),
        supported_categories: [...supported],
        selected_categories: selectedCategories,
        skipped_categories: skippedCategories,
        selected_count: selectedCategories.length,
        max_categories: maxCategories,
        min_category_tokens: minTokens,
        candidates,
        compact_strategy_memory: compactStrategySummary || undefined,
        pressure_recall_usage_strategy_bias: pressureRecallUsageBias.active || pressureRecallUsageBias.suppressed || pressureRecallUsageBias.stale
            ? pressureRecallUsageBias
            : undefined,
        pressure_recall_usage_summary: pressureRecallUsageSummaryRef || undefined,
        fallback_used: candidates.length === 0 && selectedCategories.length > 0,
        reason: selectedCategories.length
            ? `Selected ${selectedCategories.join(",")} from WorkerContextPacket context_usage top categories before task compaction${compactStrategySummary ? " with compact outcome strategy memory" : ""}${pressureRecallUsageBias.active ? " and pressure recall usage feedback." : compactStrategySummary ? "." : "."}`
            : "No supported metadata category was present in WorkerContextPacket context_usage top categories.",
        generated_at: new Date().toISOString(),
    };
}
function buildWorkerContextPacketForAssignment(baseAssignment, dependsOn, replayRepairDispatchBriefs, options = {}) {
    const dependencies = Array.isArray(options.workerContextDependencies || options.worker_context_dependencies)
        ? (options.workerContextDependencies || options.worker_context_dependencies)
        : dependsOn ? [{ project: dependsOn, reason: "前置依赖" }] : [];
    const memory = options.memory || options.workerMemory || options.worker_memory || null;
    const memoryPolicy = options.memoryPolicy || options.memory_policy || (memory && typeof memory === "object" ? (memory.memory_policy || memory.memoryPolicy) : null) || null;
    const groupId = String(baseAssignment.scopeId || options.group?.id || options.groupId || options.group_id || "").trim();
    const groupSessionId = String(baseAssignment.groupSessionId || baseAssignment.group_session_id || options.groupSessionId || options.group_session_id || "").trim();
    const agentType = String(baseAssignment.agentType || baseAssignment.agent_type || options.agentType || options.agent_type || "unknown").trim() || "unknown";
    const model = String(baseAssignment.model || baseAssignment.model_id || options.model || options.modelId || options.model_id || "").trim();
    const configuredCapabilities = options.workerModelCapabilities || options.worker_model_capabilities || {};
    const providerCapability = options.providerCapability
        || options.provider_capability
        || configuredCapabilities[`${agentType}::${model}`]
        || configuredCapabilities[agentType]
        || null;
    const modelContextCapacity = (0, model_capability_cache_1.resolveTrustedModelContextCapacity)({
        provider: agentType,
        model,
        providerCapability,
        nativeExecutorReceipt: options.nativeModelCapabilityReceipt || options.native_model_capability_receipt,
        userSetting: options.workerModelContextWindow || options.worker_model_context_window
            ? {
                source: "user_setting",
                contextWindow: options.workerModelContextWindow || options.worker_model_context_window,
                maxOutputTokens: options.workerModelMaxOutputTokens || options.worker_model_max_output_tokens,
                checkedAt: options.workerModelCapacityCheckedAt || options.worker_model_capacity_checked_at,
            }
            : null,
    });
    const requestedContextUsageOptions = options.workerContextUsageOptions || options.worker_context_usage_options || {};
    const workerContextUsageOptions = {
        maxTokens: modelContextCapacity.effectiveContextWindow,
        reservedOutputTokens: modelContextCapacity.reservedOutputTokens,
        autoCompactBufferTokens: modelContextCapacity.autoCompactBufferTokens,
        capacityProvenance: modelContextCapacity,
        ...requestedContextUsageOptions,
    };
    const cleanupCommitRepairContext = groupId
        ? (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairContext)(groupId, "project-child-agent", {
            assignmentId: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
            project: baseAssignment.project || "",
            agentType,
            childSessionId: baseAssignment.childSessionId || baseAssignment.child_session_id || options.childSessionId || options.child_session_id || "",
        })
        : null;
    const pressureProvenanceDispatchFeedbackPolicy = groupId ? (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
        targetProject: baseAssignment.project,
        agentType,
        pressureMemoryProvenanceReceiptDiscipline: memory?.pressure_memory_provenance_receipt_discipline
            || memory?.pressureMemoryProvenanceReceiptDiscipline
            || memory?.group_state?.typedMemory?.pressureProvenanceReceiptDiscipline
            || null,
        frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
        recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
        providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold
            || options.provider_override_followup_receipt_validation_failure_threshold,
        crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds
            || options.cross_group_provider_reliability_group_ids,
        providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays
            || options.provider_reliability_half_life_days,
        minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups
            || options.cross_group_provider_reliability_min_source_groups,
        disableCrossGroupProviderReliability: options.disableCrossGroupProviderReliability
            || options.disable_cross_group_provider_reliability,
        disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
        disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy,
    }) : null;
    const pressureProvenanceProviderDispatchAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(groupId, baseAssignment.project, agentType, pressureProvenanceDispatchFeedbackPolicy, options);
    return (0, runtime_kernel_1.buildWorkerContextPacket)({
        group: options.group || null,
        groupSessionId,
        group_session_id: groupSessionId,
        project: baseAssignment.project,
        task: baseAssignment.task,
        agentType,
        analysis: baseAssignment.analysis || options.analysis || null,
        dependencies,
        contractInjections: baseAssignment.contractInjections || baseAssignment.contract_injections || options.contractInjections || options.contract_injections || [],
        replayRepairDispatchBriefs,
        cleanupCommitRepairContext: cleanupCommitRepairContext?.brief_count > 0 ? cleanupCommitRepairContext : null,
        memory,
        memoryPolicy,
        pressureProvenanceDispatchFeedbackPolicy,
        pressureProvenanceProviderDispatchAdvisory,
        providerSwitchDecisionReceipt: options.providerSwitchDecisionReceipt || options.provider_switch_decision_receipt || null,
        modelContextCapacity,
        contextUsageOptions: workerContextUsageOptions,
    });
}
function validateProviderSwitchDecisionReceiptForCoordinator(receipt = {}, options = {}) {
    const gaps = [];
    const oldProvider = receipt.old_provider || receipt.oldProvider || {};
    const newProvider = receipt.new_provider || receipt.newProvider || {};
    const snapshotRef = receipt.provider_reliability_snapshot || receipt.providerReliabilitySnapshot || {};
    const compatibility = receipt.task_compatibility || receipt.taskCompatibility || {};
    const authority = (0, group_orchestrator_1.normalizeProviderSwitchAuthorityForCoordinator)(receipt.authority || {});
    const receiptGroupId = String(receipt.groupId || receipt.group_id || "").trim();
    const expectedGroupId = String(options.groupId || options.group_id || options.expectedGroupId || options.expected_group_id || "").trim();
    const expectedProject = String(options.project || options.expectedProject || options.expected_project || "").trim();
    const expectedAssignmentId = String(options.assignmentId || options.assignment_id || options.expectedAssignmentId || options.expected_assignment_id || "").trim();
    const expectedDispatchKey = String(options.dispatchKey || options.dispatch_key || options.expectedDispatchKey || options.expected_dispatch_key || "").trim();
    const expectedChecksum = (0, group_orchestrator_1.providerSwitchDecisionReceiptChecksumForCoordinator)(receipt);
    if (receipt.schema !== "ccm-provider-switch-decision-receipt-v1")
        gaps.push("schema");
    if (!receipt.receipt_id)
        gaps.push("receipt_id");
    if (!receiptGroupId)
        gaps.push("group_id");
    if (!receipt.project)
        gaps.push("project");
    if (expectedGroupId && receiptGroupId !== expectedGroupId)
        gaps.push("group_id_mismatch");
    if (expectedProject && String(receipt.project || "").trim().toLowerCase() !== expectedProject.toLowerCase())
        gaps.push("project_mismatch");
    if (expectedAssignmentId && String(receipt.assignment_id || receipt.assignmentId || "").trim() !== expectedAssignmentId)
        gaps.push("assignment_id_mismatch");
    if (expectedDispatchKey && String(receipt.dispatch_key || receipt.dispatchKey || "").trim() !== expectedDispatchKey)
        gaps.push("dispatch_key_mismatch");
    if (receipt.status !== "approved")
        gaps.push("status_not_approved");
    if (!receipt.receipt_checksum || receipt.receipt_checksum !== expectedChecksum)
        gaps.push("receipt_checksum");
    if (!oldProvider.agent_type || !newProvider.agent_type)
        gaps.push("provider_identity");
    if (String(oldProvider.agent_type || "").toLowerCase() === String(newProvider.agent_type || "").toLowerCase())
        gaps.push("provider_unchanged");
    if (newProvider.configured !== true)
        gaps.push("candidate_not_configured");
    if (String(newProvider.project || "").trim().toLowerCase() !== String(receipt.project || "").trim().toLowerCase())
        gaps.push("candidate_project_mismatch");
    if (newProvider.safer_than_selected !== true)
        gaps.push("candidate_not_ranked_safer");
    if (newProvider.local_hold === true || newProvider.local_dispatch_policy === "hold_until_repair")
        gaps.push("candidate_local_hold");
    if (compatibility.confirmed !== true)
        gaps.push("task_compatibility_not_confirmed");
    if (!Array.isArray(compatibility.evidence) || compatibility.evidence.length === 0)
        gaps.push("task_compatibility_evidence_missing");
    if (!authority.approved)
        gaps.push("authority_not_approved");
    if (!authority.local_policy_authority)
        gaps.push("local_policy_authority_missing");
    if (oldProvider.local_hold === true && authority.allow_switch_away_from_held_provider !== true)
        gaps.push("held_provider_switch_not_authorized");
    if (snapshotRef.status !== "fresh" || snapshotRef.usable !== true)
        gaps.push("snapshot_not_fresh");
    if (!snapshotRef.snapshot_id || !snapshotRef.snapshot_checksum || !snapshotRef.generation_id)
        gaps.push("snapshot_identity_missing");
    const expiresMs = Date.parse(String(snapshotRef.expires_at || ""));
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    if (!Number.isFinite(expiresMs) || expiresMs <= nowMs)
        gaps.push("snapshot_expired");
    let snapshotRead = null;
    if (options.verifySnapshot !== false && options.verify_snapshot !== false) {
        snapshotRead = (0, group_memory_index_1.readGlobalProviderDispatchReliabilitySnapshot)({
            snapshotFile: options.snapshotFile || options.snapshot_file,
            crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
            minSourceGroups: options.minSourceGroups || options.min_source_groups,
            providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days,
            providerOverrideFollowupReceiptValidationFailureThreshold: options.providerOverrideFollowupReceiptValidationFailureThreshold
                || options.provider_override_followup_receipt_validation_failure_threshold,
            nowMs,
            allowBackupRecovery: options.allowBackupRecovery,
            verifySourceGeneration: options.verifySourceGeneration,
        });
        if (snapshotRead.usable !== true || snapshotRead.status !== "fresh")
            gaps.push(`snapshot_read_${snapshotRead.status || "invalid"}`);
        if (snapshotRead.snapshot?.snapshot_id !== snapshotRef.snapshot_id)
            gaps.push("snapshot_id_mismatch");
        if (snapshotRead.snapshot?.snapshot_checksum !== snapshotRef.snapshot_checksum)
            gaps.push("snapshot_checksum_mismatch");
        if (snapshotRead.snapshot?.generation_id !== snapshotRef.generation_id)
            gaps.push("snapshot_generation_mismatch");
    }
    const valid = gaps.length === 0;
    return {
        schema: "ccm-provider-switch-decision-receipt-validation-v1",
        valid,
        status: valid ? "approved" : "rejected",
        gaps: (0, group_orchestrator_1.uniqueCoordinatorStrings)(gaps),
        snapshot_status: snapshotRead?.status || snapshotRef.status || "missing",
        checked_at: new Date(nowMs).toISOString(),
    };
}
function buildProviderSwitchDecisionReceiptForCoordinator(groupId, assignment = {}, requestValue = {}, options = {}) {
    const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
    const gate = assignment.worker_context_pre_dispatch_gate
        || assignment.workerContextPreDispatchGate
        || buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
    const advisory = packet.pressure_provenance_provider_dispatch_advisory
        || packet.pressureProvenanceProviderDispatchAdvisory
        || gate.pressure_provenance_provider_dispatch_advisory
        || gate.pressureProvenanceProviderDispatchAdvisory
        || {};
    const request = (0, group_orchestrator_1.normalizeProviderSwitchRequestForCoordinator)(requestValue);
    const selected = advisory.selected_candidate || advisory.selectedCandidate || {};
    const alternatives = Array.isArray(advisory.safer_alternatives || advisory.saferAlternatives)
        ? (advisory.safer_alternatives || advisory.saferAlternatives)
        : [];
    const rankedCandidates = Array.isArray(advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
        ? (advisory.ranked_provider_candidates || advisory.rankedProviderCandidates)
        : [];
    const candidate = alternatives.find((item) => String(item.agent_type || item.agentType || "").trim().toLowerCase() === request.requested_agent_type.toLowerCase()) || {};
    const snapshot = advisory.provider_reliability_snapshot || advisory.providerReliabilitySnapshot || {};
    const project = String(assignment.project || packet.project || advisory.project || candidate.project || "").trim();
    const oldAgentType = String(assignment.original_agent_type
        || assignment.originalAgentType
        || assignment.agentType
        || assignment.agent_type
        || packet.agent_type
        || selected.agent_type
        || selected.agentType
        || "").trim();
    const decidedAt = String(options.at || options.generatedAt || options.generated_at || new Date().toISOString());
    const receiptBase = {
        schema: "ccm-provider-switch-decision-receipt-v1",
        version: 1,
        receipt_id: `provider-switch-decision:${(0, group_orchestrator_1.hashCoordinator)([
            groupId,
            assignment.assignmentId || assignment.assignment_id || "",
            assignment.dispatchKey || assignment.dispatch_key || "",
            packet.packet_id || "",
            oldAgentType,
            request.requested_agent_type,
            snapshot.snapshot_id || "",
        ], 18)}`,
        groupId,
        project,
        source: "group_main_agent_ranked_provider_switch_approval",
        status: "approved",
        assignment_id: assignment.assignmentId || assignment.assignment_id || "",
        dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
        task_id: packet.task_id || assignment.taskId || assignment.task_id || "",
        task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || (0, group_orchestrator_1.hashCoordinator)(String(assignment.task || packet.task || ""), 24),
        advisory_worker_context_packet_id: packet.packet_id || "",
        old_provider: {
            agent_type: oldAgentType,
            project,
            local_hold: gate.provider_dispatch_hold === true || selected.should_hold_dispatch === true || selected.dispatch_policy === "hold_until_repair",
            local_health_status: selected.health_status || selected.healthStatus || advisory.health_status || "",
            local_dispatch_policy: selected.dispatch_policy || selected.dispatchPolicy || advisory.dispatch_policy || "",
            local_execution_rank_penalty: Number(selected.local_execution_rank_penalty || selected.localExecutionRankPenalty || 0),
            composite_rank: Number(selected.composite_rank || selected.compositeRank || 0),
            provider_ranking_provenance: selected.provider_ranking_provenance || selected.providerRankingProvenance || null,
        },
        new_provider: {
            agent_type: request.requested_agent_type,
            project: candidate.project || project,
            configured: candidate.configured === true,
            safer_than_selected: candidate.safer_than_selected === true,
            local_hold: candidate.local_dispatch_policy === "hold_until_repair"
                || ["critical", "warning"].includes(String(candidate.local_health_status || "")),
            local_health_status: candidate.local_health_status || "",
            local_dispatch_policy: candidate.local_dispatch_policy || "",
            global_risk_status: candidate.global_risk_status || "",
            global_risk_score: Number(candidate.global_risk_score || 0),
            local_execution_rank_penalty: Number(candidate.local_execution_rank_penalty || candidate.localExecutionRankPenalty || 0),
            provider_switch_execution_risk_score: Number(candidate.provider_switch_execution_risk_score || candidate.providerSwitchExecutionRiskScore || 0),
            provider_switch_execution_risk_confidence: Number(candidate.provider_switch_execution_risk_confidence || candidate.providerSwitchExecutionRiskConfidence || 0),
            composite_rank: Number(candidate.composite_rank || 0),
            selected_composite_rank: Number(candidate.selected_composite_rank || 0),
            provider_ranking_provenance: candidate.provider_ranking_provenance || candidate.providerRankingProvenance || null,
        },
        provider_ranking_provenance: {
            schema: "ccm-provider-switch-decision-ranking-provenance-v1",
            source: "worker_context_packet_provider_dispatch_advisory",
            compact_safe: true,
            selected: selected.provider_ranking_provenance || selected.providerRankingProvenance || null,
            requested_candidate: candidate.provider_ranking_provenance || candidate.providerRankingProvenance || null,
            ranked_provider_candidate_count: rankedCandidates.length,
            ranked_provider_candidates: rankedCandidates.slice(0, 8).map((item) => ({
                agent_type: item.agent_type || item.agentType || "",
                project: item.project || "",
                composite_rank: Number(item.composite_rank || item.compositeRank || 0),
                selected_composite_rank: Number(item.selected_composite_rank || item.selectedCompositeRank || 0),
                local_execution_rank_penalty: Number(item.local_execution_rank_penalty || item.localExecutionRankPenalty || 0),
                provider_switch_execution_weighted_risk_score: Number(item.provider_switch_execution_weighted_risk_score || item.providerSwitchExecutionWeightedRiskScore || 0),
                typed_memory_rel_paths: Array.isArray(item.provider_ranking_provenance?.typed_memory_rel_paths || item.providerRankingProvenance?.typedMemoryRelPaths)
                    ? (item.provider_ranking_provenance?.typed_memory_rel_paths || item.providerRankingProvenance?.typedMemoryRelPaths).slice(0, 6)
                    : [],
                typed_memory_row_ids: Array.isArray(item.provider_ranking_provenance?.typed_memory_row_ids || item.providerRankingProvenance?.typedMemoryRowIds)
                    ? (item.provider_ranking_provenance?.typed_memory_row_ids || item.providerRankingProvenance?.typedMemoryRowIds).slice(0, 8)
                    : [],
            })),
            boundary: "ranking evidence only; requires explicit fresh provider switch receipt for execution",
        },
        provider_reliability_snapshot: {
            schema: "ccm-provider-switch-snapshot-ref-v1",
            snapshot_id: snapshot.snapshot_id || candidate.snapshot_id || "",
            snapshot_checksum: snapshot.snapshot_checksum || candidate.snapshot_checksum || "",
            generation_id: snapshot.generation_id || "",
            status: snapshot.status || candidate.snapshot_status || "",
            usable: snapshot.usable === true,
            generated_at: snapshot.generated_at || "",
            expires_at: snapshot.expires_at || "",
            source_generation_checksum: snapshot.source_generation_checksum || "",
        },
        task_compatibility: {
            confirmed: request.compatibility_confirmed,
            evidence: request.compatibility_evidence,
            project_match: String(candidate.project || "").trim().toLowerCase() === project.toLowerCase(),
            task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || (0, group_orchestrator_1.hashCoordinator)(String(assignment.task || packet.task || ""), 24),
        },
        authority: request.authority,
        switch_reason: request.reason,
        advised_alternative: !!candidate.agent_type,
        approved_switch: true,
        actual_execution_expected: request.requested_agent_type,
        decided_at: decidedAt,
    };
    receiptBase.receipt_checksum = (0, group_orchestrator_1.providerSwitchDecisionReceiptChecksumForCoordinator)(receiptBase);
    const validation = validateProviderSwitchDecisionReceiptForCoordinator(receiptBase, {
        ...options,
        groupId,
        project,
        assignmentId: assignment.assignmentId || assignment.assignment_id || "",
        dispatchKey: assignment.dispatchKey || assignment.dispatch_key || "",
        nowMs: options.nowMs || options.now_ms || Date.parse(decidedAt) || Date.now(),
    });
    if (validation.valid) {
        return {
            ...receiptBase,
            valid: true,
            gaps: [],
            validation,
        };
    }
    const rejected = {
        ...receiptBase,
        status: "rejected",
        approved_switch: false,
    };
    rejected.receipt_checksum = (0, group_orchestrator_1.providerSwitchDecisionReceiptChecksumForCoordinator)(rejected);
    return {
        ...rejected,
        valid: false,
        gaps: validation.gaps,
        validation: {
            ...validation,
            valid: false,
            status: "rejected",
        },
    };
}
function maybeRetryWorkerContextPacketCompactionForCoordinator(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialPacket, initialGate, options = {}) {
    const retryEnabled = options.autoWorkerContextCompactRetry !== false && options.auto_worker_context_compact_retry !== false;
    if (!retryEnabled || initialGate?.dispatch_ready !== false || (initialGate?.provider_dispatch_hold === true && initialGate?.pressure_status !== "over_budget")) {
        return {
            task: baseAssignment.task,
            packet: initialPacket,
            gate: initialGate,
            retry: null,
        };
    }
    const rawRetryOptions = options.workerContextRetryOptions || options.worker_context_retry_options || {};
    let activeReplayRepairDispatchBriefs = replayRepairDispatchBriefs;
    const partialCompactionSummaries = [];
    const originalMemory = options.memory || options.workerMemory || options.worker_memory || null;
    const groupId = String(baseAssignment.scopeId || options.group?.id || options.groupId || options.group_id || "conversation");
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(baseAssignment.groupSessionId
        || baseAssignment.group_session_id
        || initialPacket?.group_session_id
        || initialPacket?.groupSessionId
        || options.groupSessionId
        || options.group_session_id
        || "");
    const originalPacketForProvenance = initialPacket;
    const strategyMemoryDisabled = rawRetryOptions.disableCompactStrategyMemory === true
        || rawRetryOptions.disable_compact_strategy_memory === true
        || options.disableCompactStrategyMemory === true
        || options.disable_compact_strategy_memory === true;
    const compactStrategyMemory = strategyMemoryDisabled ? null : readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId);
    const pressureRecallUsageStrategyDisabled = rawRetryOptions.disablePressureRecallUsageStrategy === true
        || rawRetryOptions.disable_pressure_recall_usage_strategy === true
        || options.disablePressureRecallUsageStrategy === true
        || options.disable_pressure_recall_usage_strategy === true;
    const pressureRecallUsageSummaryRaw = pressureRecallUsageStrategyDisabled ? null : (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageSummary)(groupId, {
        targetProject: baseAssignment.project || "",
        nowMs: rawRetryOptions.nowMs || rawRetryOptions.now_ms || options.nowMs || options.now_ms,
        now: rawRetryOptions.now || options.now,
        generatedAt: rawRetryOptions.generatedAt || rawRetryOptions.generated_at || options.generatedAt || options.generated_at,
        usageHalfLifeDays: rawRetryOptions.usageHalfLifeDays || rawRetryOptions.usage_half_life_days || options.usageHalfLifeDays || options.usage_half_life_days,
        usageStaleAfterDays: rawRetryOptions.usageStaleAfterDays || rawRetryOptions.usage_stale_after_days || options.usageStaleAfterDays || options.usage_stale_after_days,
        disableUsageAging: rawRetryOptions.disableUsageAging || rawRetryOptions.disable_usage_aging || options.disableUsageAging || options.disable_usage_aging,
    });
    const pressureRecallUsageSummary = pressureRecallUsageSummaryRaw?.has_history === true || Number(pressureRecallUsageSummaryRaw?.memory_count || 0) > 0
        ? pressureRecallUsageSummaryRaw
        : pressureRecallUsageStrategyDisabled ? null : (() => {
            const crossGroupSummary = (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageProjectSummary)(groupId, {
                targetProject: baseAssignment.project || "",
                nowMs: rawRetryOptions.nowMs || rawRetryOptions.now_ms || options.nowMs || options.now_ms,
                now: rawRetryOptions.now || options.now,
                generatedAt: rawRetryOptions.generatedAt || rawRetryOptions.generated_at || options.generatedAt || options.generated_at,
                usageHalfLifeDays: rawRetryOptions.usageHalfLifeDays || rawRetryOptions.usage_half_life_days || options.usageHalfLifeDays || options.usage_half_life_days,
                usageStaleAfterDays: rawRetryOptions.usageStaleAfterDays || rawRetryOptions.usage_stale_after_days || options.usageStaleAfterDays || options.usage_stale_after_days,
                disableUsageAging: rawRetryOptions.disableUsageAging || rawRetryOptions.disable_usage_aging || options.disableUsageAging || options.disable_usage_aging,
                groupIds: rawRetryOptions.crossGroupPressureRecallUsageGroupIds
                    || rawRetryOptions.cross_group_pressure_recall_usage_group_ids
                    || options.crossGroupPressureRecallUsageGroupIds
                    || options.cross_group_pressure_recall_usage_group_ids
                    || options.crossGroupIds
                    || options.cross_group_ids,
                maxGroups: rawRetryOptions.maxCrossGroupPressureRecallUsageGroups || rawRetryOptions.max_cross_group_pressure_recall_usage_groups || options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
            });
            return crossGroupSummary?.has_history === true || Number(crossGroupSummary?.memory_count || 0) > 0 ? crossGroupSummary : null;
        })();
    const ptlEmergencyHint = readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId);
    const retryOptions = ptlEmergencyHint.engaged
        ? (0, group_orchestrator_1.mergeWorkerContextRetryOptionsForCoordinator)(rawRetryOptions, ptlEmergencyHint.recommended_retry_options || {})
        : rawRetryOptions;
    const compactHookRunId = `wcch_${(0, group_orchestrator_1.hashCoordinator)([
        groupId,
        groupSessionId,
        baseAssignment.assignmentId || baseAssignment.assignment_id || "",
        initialPacket.packet_id || "",
        "worker-context-compact-retry",
    ], 16)}`;
    (0, group_orchestrator_1.appendWorkerContextCompactHookEntriesForCoordinator)(groupId, [{
            group_session_id: groupSessionId,
            hook_run_id: compactHookRunId,
            phase: "pre",
            assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
            dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
            project: baseAssignment.project || "",
            from_packet_id: initialPacket.packet_id || "",
            method: "worker_context_memory_first_retry",
            memory_first: true,
            initial_usage_status: initialPacket.context_usage?.status || "",
            dispatch_ready: false,
            result_summary: {
                over_budget: initialGate?.dispatch_ready === false,
                total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
                max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
                free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
                memory_present: !!originalMemory,
                task_chars: String(baseAssignment.task || "").length,
                ptl_emergency_engaged: ptlEmergencyHint.engaged === true,
                ptl_emergency_level: ptlEmergencyHint.engaged ? ptlEmergencyHint.emergency_level : "",
            },
            at: new Date().toISOString(),
        }], groupSessionId);
    const recordPostHook = (packet = initialPacket, gate = initialGate, retry = null, summary = {}) => {
        const at = new Date().toISOString();
        const providerRankingProvenancePreservation = retry?.provider_ranking_provenance_preservation
            || retry?.providerRankingProvenancePreservation
            || summary.provider_ranking_provenance_preservation
            || summary.providerRankingProvenancePreservation
            || (0, group_orchestrator_1.buildProviderRankingProvenancePreservationForCoordinator)(originalPacketForProvenance, packet, {
                retry_id: retry?.retry_id || retry?.retryId || "",
            });
        const completionMemoryPreservation = retry?.post_compact_receipt_memory_usage_repair_completion_preservation
            || retry?.postCompactReceiptMemoryUsageRepairCompletionPreservation
            || summary.post_compact_receipt_memory_usage_repair_completion_preservation
            || summary.postCompactReceiptMemoryUsageRepairCompletionPreservation
            || (0, group_orchestrator_1.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(originalPacketForProvenance, packet, {
                retry_id: retry?.retry_id || retry?.retryId || "",
            });
        const hookLedger = (0, group_orchestrator_1.appendWorkerContextCompactHookEntriesForCoordinator)(groupId, [{
                group_session_id: groupSessionId,
                hook_run_id: compactHookRunId,
                phase: "post",
                assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
                dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
                project: baseAssignment.project || "",
                from_packet_id: initialPacket.packet_id || "",
                retry_packet_id: packet?.packet_id || retry?.retry_packet_id || "",
                method: retry?.method || summary.method || "worker_context_memory_first_retry",
                memory_first: retry?.memory_first === true || summary.memory_first === true,
                initial_usage_status: initialPacket.context_usage?.status || "",
                final_usage_status: packet?.context_usage?.status || retry?.retry_usage_status || "",
                dispatch_ready: gate?.dispatch_ready !== false,
                ok: gate?.dispatch_ready !== false,
                status: gate?.dispatch_ready === false ? "blocked" : "ok",
                result_summary: {
                    retry_status: retry?.status || summary.retry_status || "",
                    auto_retry_status: gate?.auto_retry_status || retry?.status || "",
                    total_tokens: Number(packet?.context_usage?.total_tokens || 0),
                    max_tokens: Number(packet?.context_usage?.max_tokens || 0),
                    free_tokens: Number(packet?.context_usage?.free_tokens || 0),
                    memory_reinjection_status: packet?.memory_reinjection_proof?.status || "",
                    memory_hash_matches_compaction: packet?.memory_reinjection_proof?.hash_matches_compaction === true,
                    omitted_chars: Number(retry?.omitted_chars || 0),
                    ptl_emergency_engaged: retry?.ptl_emergency_hint?.engaged === true || retry?.ptlEmergencyHint?.engaged === true,
                    ptl_emergency_level: retry?.ptl_emergency_hint?.emergency_level || retry?.ptlEmergencyHint?.emergencyLevel || "",
                    provider_ranking_provenance_preserved: providerRankingProvenancePreservation?.preserved === true,
                    completion_memory_preservation_required: completionMemoryPreservation?.required === true,
                    completion_memory_preserved: completionMemoryPreservation?.preserved === true,
                    ...summary,
                },
                at,
            }], groupSessionId);
        const retryObj = retry || {};
        const partialCompaction = retryObj.partial_compaction || retryObj.partialCompaction || null;
        const partialItems = Array.isArray(retryObj.partial_compactions || retryObj.partialCompactions)
            ? (retryObj.partial_compactions || retryObj.partialCompactions)
            : partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1" && Array.isArray(partialCompaction.items)
                ? partialCompaction.items
                : partialCompaction?.schema ? [partialCompaction] : [];
        const partialPolicy = retryObj.partial_compact_policy
            || retryObj.partialCompactPolicy
            || partialCompaction?.partial_compact_policy
            || partialCompaction?.partialCompactPolicy
            || partialItems.find((item) => item?.partial_compact_policy || item?.partialCompactPolicy)?.partial_compact_policy
            || partialItems.find((item) => item?.partial_compact_policy || item?.partialCompactPolicy)?.partialCompactPolicy
            || null;
        const partialCategories = partialItems.flatMap((item) => Array.isArray(item?.categories) ? item.categories : [item?.category]).map((item) => String(item || "")).filter(Boolean);
        const ptlHint = retryObj.ptl_emergency_hint || retryObj.ptlEmergencyHint || summary.ptl_emergency_hint || summary.ptlEmergencyHint || null;
        const fromTotalTokens = Number(retryObj.from_total_tokens || initialPacket.context_usage?.total_tokens || 0);
        const retryTotalTokens = Number(retryObj.retry_total_tokens || packet?.context_usage?.total_tokens || 0);
        const fromFreeTokens = Number(retryObj.from_free_tokens || initialPacket.context_usage?.free_tokens || 0);
        const retryFreeTokens = Number(retryObj.retry_free_tokens || packet?.context_usage?.free_tokens || 0);
        if (retryObj.schema || summary.retry_status) {
            (0, group_orchestrator_1.appendWorkerContextCompactOutcomeEntriesForCoordinator)(groupId, [{
                    group_id: groupId,
                    group_session_id: groupSessionId,
                    assignment_id: baseAssignment.assignmentId || baseAssignment.assignment_id || "",
                    dispatch_key: baseAssignment.dispatchKey || baseAssignment.dispatch_key || "",
                    project: baseAssignment.project || "",
                    hook_run_id: compactHookRunId,
                    retry_id: retryObj.retry_id || retryObj.retryId || "",
                    method: retryObj.method || summary.method || "",
                    status: retryObj.status || summary.retry_status || (gate?.dispatch_ready === false ? "blocked" : "recovered"),
                    dispatch_ready: gate?.dispatch_ready !== false,
                    from_packet_id: retryObj.from_packet_id || initialPacket.packet_id || "",
                    retry_packet_id: retryObj.retry_packet_id || packet?.packet_id || "",
                    initial_usage_status: initialPacket.context_usage?.status || retryObj.from_usage_status || "",
                    final_usage_status: packet?.context_usage?.status || retryObj.retry_usage_status || "",
                    from_total_tokens: fromTotalTokens,
                    retry_total_tokens: retryTotalTokens,
                    from_free_tokens: fromFreeTokens,
                    retry_free_tokens: retryFreeTokens,
                    token_delta: fromTotalTokens - retryTotalTokens,
                    free_token_delta: retryFreeTokens - fromFreeTokens,
                    memory_first: retryObj.memory_first === true || summary.memory_first === true,
                    partial_compact: retryObj.partial_compact === true || summary.partial_compact === true,
                    task_compacted: summary.task_compacted === true || (!!retryObj.original_task_hash && !!retryObj.compacted_task_hash && retryObj.original_task_hash !== retryObj.compacted_task_hash),
                    task_hash_unchanged: !!retryObj.original_task_hash && retryObj.original_task_hash === retryObj.compacted_task_hash,
                    partial_compaction_categories: partialCategories.length ? partialCategories : summary.partial_compaction_categories || [],
                    partial_compact_policy: partialPolicy,
                    ptl_emergency_hint: ptlHint,
                    omitted_chars: Number(retryObj.omitted_chars || 0),
                    memory_omitted_chars: Number(retryObj.memory_compaction?.omitted_chars || retryObj.memoryCompaction?.omitted_chars || 0),
                    partial_omitted_chars: partialCompaction?.schema === "ccm-worker-context-partial-compaction-set-v1"
                        ? Number(partialCompaction.omitted_chars || 0)
                        : partialItems.reduce((sum, item) => sum + Number(item?.omitted_chars || 0), 0),
                    original_task_hash: retryObj.original_task_hash || "",
                    compacted_task_hash: retryObj.compacted_task_hash || "",
                    provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
                    provider_ranking_provenance_preserved: providerRankingProvenancePreservation?.preserved === true,
                    post_compact_receipt_memory_usage_repair_completion_preservation: completionMemoryPreservation,
                    post_compact_receipt_memory_usage_repair_completion_preserved: completionMemoryPreservation?.preserved === true,
                    at,
                }], groupSessionId);
        }
        return hookLedger;
    };
    const memoryCompact = (0, runtime_kernel_1.compactWorkerContextMemoryForRetry)(originalMemory, retryOptions.memory || retryOptions.memoryOptions || {});
    if (memoryCompact.compacted) {
        const memoryRetryOptions = { ...options, memory: memoryCompact.memory };
        const memoryRetryAssignment = { ...baseAssignment };
        const memoryRetryBasePacket = buildWorkerContextPacketForAssignment(memoryRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, memoryRetryOptions);
        const memoryRetryProvenancePreservation = (0, group_orchestrator_1.buildProviderRankingProvenancePreservationForCoordinator)(originalPacketForProvenance, memoryRetryBasePacket);
        const memoryRetryCompletionPreservation = (0, group_orchestrator_1.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(originalPacketForProvenance, memoryRetryBasePacket);
        const memoryRetryBase = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: `worker-context-retry:${(0, group_orchestrator_1.hashCoordinator)([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, memoryRetryBasePacket.packet_id, "memory-first"], 14)}`,
            method: "memory_first_deterministic_context_compaction",
            status: "attempted",
            from_packet_id: initialPacket.packet_id || "",
            retry_packet_id: memoryRetryBasePacket.packet_id || "",
            from_usage_status: initialPacket.context_usage?.status || "",
            from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
            from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
            from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
            compact_hook_run_id: compactHookRunId,
            memory_first: true,
            memory_compaction: memoryCompact.summary,
            ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
            original_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            compacted_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            original_task_chars: String(baseAssignment.task || "").length,
            compacted_task_chars: String(baseAssignment.task || "").length,
            omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0),
            critical_line_count: 0,
            preserved_receipt_contract: true,
            provider_ranking_provenance_preservation: memoryRetryProvenancePreservation,
            provider_ranking_provenance_preserved: memoryRetryProvenancePreservation.preserved === true,
            ...(memoryRetryCompletionPreservation.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: memoryRetryCompletionPreservation,
                post_compact_receipt_memory_usage_repair_completion_preserved: memoryRetryCompletionPreservation.preserved === true,
            } : {}),
            generated_at: new Date().toISOString(),
        };
        let memoryRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...memoryRetryBasePacket,
            context_compaction_retry: memoryRetryBase,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        let memoryRetryGate = buildWorkerContextPreDispatchGateForCoordinator(memoryRetryAssignment, memoryRetryPacket);
        const memoryRetry = {
            ...memoryRetryBase,
            provider_ranking_provenance_preservation: {
                ...memoryRetryBase.provider_ranking_provenance_preservation,
                retry_id: memoryRetryBase.retry_id,
            },
            ...(memoryRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: {
                    ...memoryRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
                    retry_id: memoryRetryBase.retry_id,
                },
            } : {}),
            status: memoryRetryGate.dispatch_ready === false ? "blocked" : "recovered",
            retry_usage_status: memoryRetryPacket.context_usage?.status || "",
            retry_total_tokens: Number(memoryRetryPacket.context_usage?.total_tokens || 0),
            retry_max_tokens: Number(memoryRetryPacket.context_usage?.max_tokens || 0),
            retry_free_tokens: Number(memoryRetryPacket.context_usage?.free_tokens || 0),
            recovered_dispatch_ready: memoryRetryGate.dispatch_ready !== false,
        };
        memoryRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...memoryRetryPacket,
            context_compaction_retry: memoryRetry,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        memoryRetryGate = buildWorkerContextPreDispatchGateForCoordinator(memoryRetryAssignment, memoryRetryPacket);
        if (memoryRetryGate.dispatch_ready !== false) {
            recordPostHook(memoryRetryPacket, memoryRetryGate, memoryRetryPacket.context_compaction_retry || memoryRetry, {
                retry_status: "recovered",
                memory_first_recovered: true,
            });
            return {
                task: baseAssignment.task,
                packet: memoryRetryPacket,
                gate: {
                    ...memoryRetryGate,
                    context_compaction_retry: memoryRetryPacket.context_compaction_retry || memoryRetry,
                    auto_retry_status: "recovered",
                },
                retry: memoryRetryPacket.context_compaction_retry || memoryRetry,
            };
        }
        initialPacket = memoryRetryPacket;
        initialGate = memoryRetryGate;
        options = memoryRetryOptions;
    }
    const replayBriefPartialCompact = (0, group_orchestrator_1.compactReplayRepairDispatchBriefsForWorkerContextRetry)(activeReplayRepairDispatchBriefs, retryOptions.replayRepairDispatchBriefs || retryOptions.replay_repair_dispatch_briefs || retryOptions.partialCompact || retryOptions.partial_compact || {});
    if (replayBriefPartialCompact.compacted) {
        activeReplayRepairDispatchBriefs = replayBriefPartialCompact.briefs;
        partialCompactionSummaries.push(replayBriefPartialCompact.summary);
        const partialRetryAssignment = { ...baseAssignment };
        const partialRetryBasePacket = buildWorkerContextPacketForAssignment(partialRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
        const partialRetryProvenancePreservation = (0, group_orchestrator_1.buildProviderRankingProvenancePreservationForCoordinator)(originalPacketForProvenance, partialRetryBasePacket);
        const partialRetryCompletionPreservation = (0, group_orchestrator_1.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(originalPacketForProvenance, partialRetryBasePacket);
        const partialRetryBase = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: `worker-context-retry:${(0, group_orchestrator_1.hashCoordinator)([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, partialRetryBasePacket.packet_id, "replay-brief-partial"], 14)}`,
            method: (0, group_orchestrator_1.workerContextPartialCompactMethodForCoordinator)(memoryCompact.compacted === true, [replayBriefPartialCompact.summary], false),
            status: "attempted",
            from_packet_id: initialPacket.packet_id || "",
            retry_packet_id: partialRetryBasePacket.packet_id || "",
            from_usage_status: initialPacket.context_usage?.status || "",
            from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
            from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
            from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
            compact_hook_run_id: compactHookRunId,
            memory_first: memoryCompact.compacted === true,
            memory_compaction: memoryCompact.summary || null,
            partial_compact: true,
            partial_compaction: replayBriefPartialCompact.summary,
            partial_compactions: [replayBriefPartialCompact.summary],
            ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
            original_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            compacted_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            original_task_chars: String(baseAssignment.task || "").length,
            compacted_task_chars: String(baseAssignment.task || "").length,
            omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0) + Number(replayBriefPartialCompact.summary?.omitted_chars || 0),
            critical_line_count: 0,
            preserved_receipt_contract: true,
            provider_ranking_provenance_preservation: partialRetryProvenancePreservation,
            provider_ranking_provenance_preserved: partialRetryProvenancePreservation.preserved === true,
            ...(partialRetryCompletionPreservation.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: partialRetryCompletionPreservation,
                post_compact_receipt_memory_usage_repair_completion_preserved: partialRetryCompletionPreservation.preserved === true,
            } : {}),
            generated_at: new Date().toISOString(),
        };
        let partialRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...partialRetryBasePacket,
            context_compaction_retry: partialRetryBase,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        let partialRetryGate = buildWorkerContextPreDispatchGateForCoordinator(partialRetryAssignment, partialRetryPacket);
        const partialRetry = {
            ...partialRetryBase,
            provider_ranking_provenance_preservation: {
                ...partialRetryBase.provider_ranking_provenance_preservation,
                retry_id: partialRetryBase.retry_id,
            },
            ...(partialRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: {
                    ...partialRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
                    retry_id: partialRetryBase.retry_id,
                },
            } : {}),
            status: partialRetryGate.dispatch_ready === false ? "blocked" : "recovered",
            retry_usage_status: partialRetryPacket.context_usage?.status || "",
            retry_total_tokens: Number(partialRetryPacket.context_usage?.total_tokens || 0),
            retry_max_tokens: Number(partialRetryPacket.context_usage?.max_tokens || 0),
            retry_free_tokens: Number(partialRetryPacket.context_usage?.free_tokens || 0),
            recovered_dispatch_ready: partialRetryGate.dispatch_ready !== false,
        };
        partialRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...partialRetryPacket,
            context_compaction_retry: partialRetry,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        partialRetryGate = buildWorkerContextPreDispatchGateForCoordinator(partialRetryAssignment, partialRetryPacket);
        if (partialRetryGate.dispatch_ready !== false) {
            recordPostHook(partialRetryPacket, partialRetryGate, partialRetryPacket.context_compaction_retry || partialRetry, {
                retry_status: "recovered",
                partial_compact: true,
                partial_compaction_category: replayBriefPartialCompact.summary?.category || "",
            });
            return {
                task: baseAssignment.task,
                packet: partialRetryPacket,
                gate: {
                    ...partialRetryGate,
                    context_compaction_retry: partialRetryPacket.context_compaction_retry || partialRetry,
                    auto_retry_status: "recovered",
                },
                retry: partialRetryPacket.context_compaction_retry || partialRetry,
            };
        }
        initialPacket = partialRetryPacket;
        initialGate = partialRetryGate;
    }
    const metadataPartialCompact = (0, group_orchestrator_1.compactWorkerContextMetadataCategoriesForRetry)(initialPacket, options, {
        ...(retryOptions.metadata || retryOptions.metadataPartialCompact || retryOptions.metadata_partial_compact || retryOptions.partialCompact || retryOptions.partial_compact || {}),
        compactOutcomeStrategyMemory: compactStrategyMemory,
        pressureRecallUsageSummary,
        groupId,
        targetProject: baseAssignment.project || "",
    });
    if (metadataPartialCompact.compacted) {
        options = metadataPartialCompact.options;
        partialCompactionSummaries.push(metadataPartialCompact.summary);
        const metadataRetryAssignment = { ...baseAssignment };
        const metadataRetryBasePacket = buildWorkerContextPacketForAssignment(metadataRetryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
        const metadataRetryProvenancePreservation = (0, group_orchestrator_1.buildProviderRankingProvenancePreservationForCoordinator)(originalPacketForProvenance, metadataRetryBasePacket);
        const metadataRetryCompletionPreservation = (0, group_orchestrator_1.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(originalPacketForProvenance, metadataRetryBasePacket);
        const partialCompaction = (0, group_orchestrator_1.combineWorkerContextPartialCompactionSummariesForCoordinator)(partialCompactionSummaries);
        const metadataRetryBase = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: `worker-context-retry:${(0, group_orchestrator_1.hashCoordinator)([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, metadataRetryBasePacket.packet_id, "metadata-partial"], 14)}`,
            method: (0, group_orchestrator_1.workerContextPartialCompactMethodForCoordinator)(memoryCompact.compacted === true, partialCompactionSummaries, false),
            status: "attempted",
            from_packet_id: initialPacket.packet_id || "",
            retry_packet_id: metadataRetryBasePacket.packet_id || "",
            from_usage_status: initialPacket.context_usage?.status || "",
            from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
            from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
            from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
            compact_hook_run_id: compactHookRunId,
            memory_first: memoryCompact.compacted === true,
            memory_compaction: memoryCompact.summary || null,
            partial_compact: true,
            partial_compaction: partialCompaction,
            partial_compactions: [...partialCompactionSummaries],
            partial_compact_policy: metadataPartialCompact.policy || metadataPartialCompact.summary?.partial_compact_policy || null,
            compact_strategy_memory: metadataPartialCompact.policy?.compact_strategy_memory || undefined,
            ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
            original_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            compacted_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
            original_task_chars: String(baseAssignment.task || "").length,
            compacted_task_chars: String(baseAssignment.task || "").length,
            omitted_chars: Number(memoryCompact.summary?.omitted_chars || 0)
                + partialCompactionSummaries.reduce((sum, item) => sum + Number(item?.omitted_chars || 0), 0),
            critical_line_count: 0,
            preserved_receipt_contract: true,
            provider_ranking_provenance_preservation: metadataRetryProvenancePreservation,
            provider_ranking_provenance_preserved: metadataRetryProvenancePreservation.preserved === true,
            ...(metadataRetryCompletionPreservation.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: metadataRetryCompletionPreservation,
                post_compact_receipt_memory_usage_repair_completion_preserved: metadataRetryCompletionPreservation.preserved === true,
            } : {}),
            generated_at: new Date().toISOString(),
        };
        let metadataRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...metadataRetryBasePacket,
            context_compaction_retry: metadataRetryBase,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        let metadataRetryGate = buildWorkerContextPreDispatchGateForCoordinator(metadataRetryAssignment, metadataRetryPacket);
        const metadataRetry = {
            ...metadataRetryBase,
            provider_ranking_provenance_preservation: {
                ...metadataRetryBase.provider_ranking_provenance_preservation,
                retry_id: metadataRetryBase.retry_id,
            },
            ...(metadataRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
                post_compact_receipt_memory_usage_repair_completion_preservation: {
                    ...metadataRetryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
                    retry_id: metadataRetryBase.retry_id,
                },
            } : {}),
            status: metadataRetryGate.dispatch_ready === false ? "blocked" : "recovered",
            retry_usage_status: metadataRetryPacket.context_usage?.status || "",
            retry_total_tokens: Number(metadataRetryPacket.context_usage?.total_tokens || 0),
            retry_max_tokens: Number(metadataRetryPacket.context_usage?.max_tokens || 0),
            retry_free_tokens: Number(metadataRetryPacket.context_usage?.free_tokens || 0),
            recovered_dispatch_ready: metadataRetryGate.dispatch_ready !== false,
        };
        metadataRetryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...metadataRetryPacket,
            context_compaction_retry: metadataRetry,
        }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
        metadataRetryGate = buildWorkerContextPreDispatchGateForCoordinator(metadataRetryAssignment, metadataRetryPacket);
        if (metadataRetryGate.dispatch_ready !== false) {
            recordPostHook(metadataRetryPacket, metadataRetryGate, metadataRetryPacket.context_compaction_retry || metadataRetry, {
                retry_status: "recovered",
                partial_compact: true,
                partial_compaction_category: metadataPartialCompact.summary?.category || "",
                partial_compaction_categories: partialCompactionSummaries.flatMap((item) => item?.categories || [item?.category]).filter(Boolean),
                partial_compact_policy_selected: metadataPartialCompact.policy?.selected_categories || [],
                partial_compact_policy_skipped: metadataPartialCompact.policy?.skipped_categories || [],
                compact_strategy_preferred: metadataPartialCompact.policy?.compact_strategy_memory?.preferred_categories || [],
            });
            return {
                task: baseAssignment.task,
                packet: metadataRetryPacket,
                gate: {
                    ...metadataRetryGate,
                    context_compaction_retry: metadataRetryPacket.context_compaction_retry || metadataRetry,
                    auto_retry_status: "recovered",
                },
                retry: metadataRetryPacket.context_compaction_retry || metadataRetry,
            };
        }
        initialPacket = metadataRetryPacket;
        initialGate = metadataRetryGate;
    }
    const compactedTask = (0, group_orchestrator_1.compactWorkerContextTaskForRetry)(baseAssignment.task, retryOptions);
    if (!compactedTask.compacted) {
        const partialSummaryForNoTask = (0, group_orchestrator_1.combineWorkerContextPartialCompactionSummariesForCoordinator)(partialCompactionSummaries);
        recordPostHook(initialPacket, initialGate, null, {
            retry_status: "blocked",
            method: partialSummaryForNoTask
                ? memoryCompact.compacted
                    ? "memory_first_partial_no_task_compaction_available"
                    : "partial_no_task_compaction_available"
                : memoryCompact.compacted ? "memory_first_no_task_compaction_available" : "no_compaction_available",
            memory_first: memoryCompact.compacted === true,
            partial_compact: !!partialSummaryForNoTask,
            partial_compaction_category: partialSummaryForNoTask?.category || "",
        });
        return {
            task: baseAssignment.task,
            packet: initialPacket,
            gate: initialGate,
            retry: null,
        };
    }
    const retryAssignment = { ...baseAssignment, task: compactedTask.text };
    const retryBasePacket = buildWorkerContextPacketForAssignment(retryAssignment, dependsOn, activeReplayRepairDispatchBriefs, options);
    const retryProvenancePreservation = (0, group_orchestrator_1.buildProviderRankingProvenancePreservationForCoordinator)(originalPacketForProvenance, retryBasePacket);
    const retryCompletionPreservation = (0, group_orchestrator_1.buildPostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(originalPacketForProvenance, retryBasePacket);
    const taskPartialCompaction = (0, group_orchestrator_1.combineWorkerContextPartialCompactionSummariesForCoordinator)(partialCompactionSummaries);
    const taskRetryMethod = (0, group_orchestrator_1.workerContextPartialCompactMethodForCoordinator)(memoryCompact.compacted === true, partialCompactionSummaries, true);
    const retryBase = {
        schema: "ccm-worker-context-compaction-retry-v1",
        retry_id: `worker-context-retry:${(0, group_orchestrator_1.hashCoordinator)([baseAssignment.scopeId, baseAssignment.assignmentId, initialPacket.packet_id, retryBasePacket.packet_id], 14)}`,
        method: taskRetryMethod,
        status: "attempted",
        from_packet_id: initialPacket.packet_id || "",
        retry_packet_id: retryBasePacket.packet_id || "",
        from_usage_status: initialPacket.context_usage?.status || "",
        from_total_tokens: Number(initialPacket.context_usage?.total_tokens || 0),
        from_max_tokens: Number(initialPacket.context_usage?.max_tokens || 0),
        from_free_tokens: Number(initialPacket.context_usage?.free_tokens || 0),
        compact_hook_run_id: compactHookRunId,
        memory_first: memoryCompact.compacted === true,
        memory_compaction: memoryCompact.summary || null,
        partial_compact: !!taskPartialCompaction,
        partial_compaction: taskPartialCompaction,
        partial_compactions: [...partialCompactionSummaries],
        partial_compact_policy: taskPartialCompaction?.partial_compact_policy
            || (Array.isArray(taskPartialCompaction?.items) ? taskPartialCompaction.items.find((item) => item?.partial_compact_policy)?.partial_compact_policy : null)
            || null,
        ptl_emergency_hint: ptlEmergencyHint.engaged ? ptlEmergencyHint : undefined,
        original_task_hash: (0, group_orchestrator_1.hashCoordinator)(baseAssignment.task || "", 24),
        compacted_task_hash: (0, group_orchestrator_1.hashCoordinator)(compactedTask.text || "", 24),
        original_task_chars: compactedTask.originalChars,
        compacted_task_chars: compactedTask.compactedChars,
        omitted_chars: compactedTask.omittedChars
            + Number(memoryCompact.summary?.omitted_chars || 0)
            + partialCompactionSummaries.reduce((sum, item) => sum + Number(item?.omitted_chars || 0), 0),
        critical_line_count: compactedTask.criticalLines.length,
        preserved_receipt_contract: true,
        provider_ranking_provenance_preservation: retryProvenancePreservation,
        provider_ranking_provenance_preserved: retryProvenancePreservation.preserved === true,
        ...(retryCompletionPreservation.required ? {
            post_compact_receipt_memory_usage_repair_completion_preservation: retryCompletionPreservation,
            post_compact_receipt_memory_usage_repair_completion_preserved: retryCompletionPreservation.preserved === true,
        } : {}),
        generated_at: new Date().toISOString(),
    };
    let retryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
        ...retryBasePacket,
        context_compaction_retry: retryBase,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    let retryGate = buildWorkerContextPreDispatchGateForCoordinator(retryAssignment, retryPacket);
    const retry = {
        ...retryBase,
        provider_ranking_provenance_preservation: {
            ...retryBase.provider_ranking_provenance_preservation,
            retry_id: retryBase.retry_id,
        },
        ...(retryBase.post_compact_receipt_memory_usage_repair_completion_preservation?.required ? {
            post_compact_receipt_memory_usage_repair_completion_preservation: {
                ...retryBase.post_compact_receipt_memory_usage_repair_completion_preservation,
                retry_id: retryBase.retry_id,
            },
        } : {}),
        status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
        retry_usage_status: retryPacket.context_usage?.status || "",
        retry_total_tokens: Number(retryPacket.context_usage?.total_tokens || 0),
        retry_max_tokens: Number(retryPacket.context_usage?.max_tokens || 0),
        retry_free_tokens: Number(retryPacket.context_usage?.free_tokens || 0),
        recovered_dispatch_ready: retryGate.dispatch_ready !== false,
    };
    retryPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
        ...retryPacket,
        context_compaction_retry: retry,
    }, options.workerContextUsageOptions || options.worker_context_usage_options || {});
    retryGate = buildWorkerContextPreDispatchGateForCoordinator(retryAssignment, retryPacket);
    recordPostHook(retryPacket, retryGate, retryPacket.context_compaction_retry || retry, {
        retry_status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
        task_compacted: true,
        partial_compact: !!taskPartialCompaction,
        partial_compaction_category: taskPartialCompaction?.category || "",
        partial_compaction_categories: partialCompactionSummaries.flatMap((item) => item?.categories || [item?.category]).filter(Boolean),
    });
    return {
        task: compactedTask.text,
        packet: retryPacket,
        gate: {
            ...retryGate,
            context_compaction_retry: retryPacket.context_compaction_retry || retry,
            auto_retry_status: retryGate.dispatch_ready === false ? "blocked" : "recovered",
        },
        retry: retryPacket.context_compaction_retry || retry,
    };
}
function buildWorkerContextPreDispatchGateForCoordinator(assignment = {}, packet = {}) {
    const usage = packet.context_usage || packet.contextUsage || {};
    const retry = packet.context_compaction_retry || packet.contextCompactionRetry || null;
    const providerAdvisory = packet.pressure_provenance_provider_dispatch_advisory
        || packet.pressureProvenanceProviderDispatchAdvisory
        || null;
    const selectedProvider = providerAdvisory?.selected_candidate
        || providerAdvisory?.selectedCandidate
        || {};
    const pressureStatus = (0, group_orchestrator_1.workerContextUsagePressureStatusForCoordinator)(usage);
    const overBudget = pressureStatus === "over_budget";
    const completionMemoryPreservation = (0, group_orchestrator_1.normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(retry?.post_compact_receipt_memory_usage_repair_completion_preservation
        || retry?.postCompactReceiptMemoryUsageRepairCompletionPreservation
        || null);
    const completionMemoryPreservationBlocked = completionMemoryPreservation?.required === true
        && completionMemoryPreservation?.preserved !== true;
    const providerHold = providerAdvisory?.should_hold_dispatch === true
        || providerAdvisory?.shouldHoldDispatch === true
        || selectedProvider?.should_hold_dispatch === true
        || selectedProvider?.shouldHoldDispatch === true
        || String(selectedProvider?.dispatch_policy || selectedProvider?.dispatchPolicy || providerAdvisory?.dispatch_policy || providerAdvisory?.dispatchPolicy || "") === "hold_until_repair";
    const providerOverrideReceipt = (0, group_orchestrator_1.normalizeProviderDispatchOverrideReceiptForCoordinator)((0, group_orchestrator_1.rawProviderDispatchOverrideForCoordinator)(assignment, packet), {
        groupId: assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || "",
        project: assignment.project || packet.project || providerAdvisory?.project || selectedProvider.project || "",
        agentType: assignment.agentType || assignment.agent_type || packet.agent_type || packet.agentType || selectedProvider.agent_type || selectedProvider.agentType || providerAdvisory?.agent_type || providerAdvisory?.agentType || "",
        healthStatus: selectedProvider?.health_status || selectedProvider?.healthStatus || providerAdvisory?.health_status || providerAdvisory?.healthStatus || "",
        dispatchPolicy: selectedProvider?.dispatch_policy || selectedProvider?.dispatchPolicy || providerAdvisory?.dispatch_policy || providerAdvisory?.dispatchPolicy || "",
    });
    const providerHoldOverridden = providerHold && providerOverrideReceipt?.valid === true;
    const providerHoldBlocked = providerHold && !providerHoldOverridden;
    const blocked = overBudget || providerHoldBlocked || completionMemoryPreservationBlocked;
    const compactRecommended = !!pressureStatus;
    const topCategories = (0, group_orchestrator_1.workerContextUsageTopCategoriesForCoordinator)(usage);
    const suggestedReductions = Array.isArray(usage.suggested_reductions || usage.suggestedReductions)
        ? (usage.suggested_reductions || usage.suggestedReductions).slice(0, 8)
        : [];
    const packetId = String(packet.packet_id || "").trim();
    const gateId = `worker-context-pre-dispatch:${(0, group_orchestrator_1.hashCoordinator)([
        assignment.scopeId || assignment.scope_id || "",
        assignment.assignmentId || assignment.assignment_id || "",
        assignment.dispatchKey || assignment.dispatch_key || "",
        packetId,
    ], 14)}`;
    return {
        schema: "ccm-worker-context-pre-dispatch-gate-v1",
        gate_id: gateId,
        gateId,
        assignment_id: assignment.assignmentId || assignment.assignment_id || "",
        dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
        project: assignment.project || "",
        worker_context_packet_id: packetId,
        usage_status: usage.status || "",
        pressure_status: pressureStatus || usage.status || "ok",
        dispatch_ready: !blocked,
        dispatchReady: !blocked,
        blocked,
        compact_recommended: compactRecommended,
        must_repair_before_dispatch: blocked,
        completion_memory_preservation_blocked: completionMemoryPreservationBlocked,
        completion_memory_preservation: completionMemoryPreservation,
        provider_dispatch_hold: providerHold,
        provider_dispatch_hold_blocked: providerHoldBlocked,
        provider_dispatch_hold_overridden: providerHoldOverridden,
        provider_dispatch_override_receipt: providerOverrideReceipt,
        provider_dispatch_override_required_followup_repair: providerHoldOverridden,
        provider_dispatch_override_followup_history: selectedProvider?.provider_override_followup_repaired === true ? {
            repaired: true,
            repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
            last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
            fresh_after_last_violation: selectedProvider.provider_override_followup_fresh_after_last_violation === true,
            rel_paths: Array.isArray(selectedProvider.provider_override_followup_rel_paths) ? selectedProvider.provider_override_followup_rel_paths.slice(0, 8) : [],
            followup_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_work_item_ids) ? selectedProvider.provider_override_followup_work_item_ids.slice(0, 8) : [],
            override_ids: Array.isArray(selectedProvider.provider_override_followup_override_ids) ? selectedProvider.provider_override_followup_override_ids.slice(0, 8) : [],
        } : null,
        provider_dispatch_override_followup_receipt_validation_history: Number(selectedProvider?.provider_override_followup_receipt_validation_attempt_count || 0) > 0 ? {
            attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
            failed_count: Number(selectedProvider.provider_override_followup_receipt_validation_failed_count || 0),
            passed_count: Number(selectedProvider.provider_override_followup_receipt_validation_passed_count || 0),
            consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
            latest_status: selectedProvider.provider_override_followup_receipt_validation_latest_status || "",
            escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
            repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
            last_failed_at: selectedProvider.provider_override_followup_receipt_validation_last_failed_at || "",
            last_passed_at: selectedProvider.provider_override_followup_receipt_validation_last_passed_at || "",
            validation_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_ids) ? selectedProvider.provider_override_followup_receipt_validation_ids.slice(0, 8) : [],
            repair_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_repair_work_item_ids) ? selectedProvider.provider_override_followup_receipt_validation_repair_work_item_ids.slice(0, 8) : [],
            gap_codes: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_gap_codes) ? selectedProvider.provider_override_followup_receipt_validation_gap_codes.slice(0, 8) : [],
        } : null,
        cross_group_provider_reliability_guidance: selectedProvider?.cross_group_provider_reliability_actionable === true ? {
            schema: "ccm-cross-group-provider-dispatch-reliability-gate-guidance-v1",
            agent_type: selectedProvider.agent_type || selectedProvider.agentType || packet.agent_type || packet.agentType || "unknown",
            risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
            risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
            confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
            source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
            guidance_only: true,
            local_policy_override_allowed: false,
            contains_private_memory: false,
        } : null,
        pressure_provenance_provider_dispatch_advisory: providerAdvisory,
        reason: providerHoldBlocked
            ? `Pressure provenance provider dispatch hold: agentType=${selectedProvider.agent_type || selectedProvider.agentType || packet.agent_type || "unknown"} project=${assignment.project || packet.project || "unknown"} health=${selectedProvider.health_status || selectedProvider.healthStatus || providerAdvisory?.health_status || "critical"}; repair/recovery required before child dispatch.`
            : providerHoldOverridden
                ? `Pressure provenance provider dispatch hold overridden by approved receipt ${providerOverrideReceipt?.override_id || ""}; follow-up repair/recovery remains required.`
                : overBudget
                    ? `WorkerContextPacket over budget before child dispatch: ${Number(usage.total_tokens || 0)}/${Number(usage.max_tokens || 0)} tokens, free=${Number(usage.free_tokens || 0)}.`
                    : compactRecommended
                        ? `WorkerContextPacket ${pressureStatus}; compact recommended before this packet grows further.`
                        : "WorkerContextPacket context usage is within pre-dispatch budget.",
        repair_source: providerHoldBlocked ? "worker_context_pressure_provenance_feedback_provider_dispatch_advisory" : overBudget ? "worker_context_packet_context_usage_repair" : "",
        context_compaction_retry: retry,
        auto_retry_status: retry?.status || "",
        next_step: providerHoldBlocked
            ? "repair_pressure_provenance_provider_before_child_dispatch"
            : providerHoldOverridden
                ? "dispatch_child_agent_with_provider_override_receipt"
                : overBudget
                    ? "compact_worker_context_packet_before_child_dispatch"
                    : compactRecommended
                        ? "prefer_compact_before_large_followup"
                        : "dispatch_child_agent",
        total_tokens: Number(usage.total_tokens || 0),
        max_tokens: Number(usage.max_tokens || 0),
        free_tokens: Number(usage.free_tokens || 0),
        pressure: Number(usage.pressure || 0),
        autocompact_buffer_tokens: Number(usage.autocompact_buffer_tokens || 0),
        top_categories: topCategories,
        suggested_reductions: suggestedReductions,
        generated_at: new Date().toISOString(),
    };
}
function buildWorkerContextProviderDispatchDecisionForCoordinator(assignment = {}, packet = {}, gate = {}, options = {}) {
    const providerAdvisory = gate.pressure_provenance_provider_dispatch_advisory
        || gate.pressureProvenanceProviderDispatchAdvisory
        || packet.pressure_provenance_provider_dispatch_advisory
        || packet.pressureProvenanceProviderDispatchAdvisory
        || null;
    const selectedProvider = providerAdvisory?.selected_candidate
        || providerAdvisory?.selectedCandidate
        || {};
    const providerSwitchDecisionReceipt = assignment.provider_switch_decision_receipt
        || assignment.providerSwitchDecisionReceipt
        || packet.provider_switch_decision_receipt
        || packet.providerSwitchDecisionReceipt
        || null;
    const advisedAlternative = Number(providerAdvisory?.safer_alternative_count || providerAdvisory?.saferAlternativeCount || 0) > 0
        || (Array.isArray(providerAdvisory?.safer_alternatives || providerAdvisory?.saferAlternatives)
            && (providerAdvisory?.safer_alternatives || providerAdvisory?.saferAlternatives).length > 0)
        || providerSwitchDecisionReceipt?.advised_alternative === true;
    const approvedProviderSwitch = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1"
        && providerSwitchDecisionReceipt.valid === true
        && providerSwitchDecisionReceipt.status === "approved";
    const project = String(assignment.project || packet.project || providerAdvisory?.project || selectedProvider.project || "unknown").trim() || "unknown";
    const agentType = String(assignment.agentType
        || assignment.agent_type
        || assignment.executor
        || assignment.runner
        || packet.agent_type
        || packet.agentType
        || selectedProvider.agent_type
        || selectedProvider.agentType
        || providerAdvisory?.agent_type
        || providerAdvisory?.agentType
        || "unknown").trim() || "unknown";
    const dispatchPolicy = String(selectedProvider.dispatch_policy
        || selectedProvider.dispatchPolicy
        || providerAdvisory?.dispatch_policy
        || providerAdvisory?.dispatchPolicy
        || (gate.provider_dispatch_hold === true ? "hold_until_repair" : "normal_dispatch")).trim() || "normal_dispatch";
    const healthStatus = String(selectedProvider.health_status
        || selectedProvider.healthStatus
        || providerAdvisory?.health_status
        || providerAdvisory?.healthStatus
        || "").trim();
    const providerHold = gate.provider_dispatch_hold === true
        || providerAdvisory?.should_hold_dispatch === true
        || providerAdvisory?.shouldHoldDispatch === true
        || selectedProvider.should_hold_dispatch === true
        || selectedProvider.shouldHoldDispatch === true
        || dispatchPolicy === "hold_until_repair";
    const providerHoldOverridden = gate.provider_dispatch_hold_overridden === true
        || gate.providerDispatchHoldOverridden === true;
    const providerHoldBlocked = providerHold && !providerHoldOverridden;
    const dispatchReady = gate.dispatch_ready !== false && !providerHoldBlocked;
    const overrideReceipt = gate.provider_dispatch_override_receipt
        || gate.providerDispatchOverrideReceipt
        || (0, group_orchestrator_1.normalizeProviderDispatchOverrideReceiptForCoordinator)((0, group_orchestrator_1.rawProviderDispatchOverrideForCoordinator)(assignment, packet), {
            groupId: assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || options.groupId || options.group_id || "",
            project,
            agentType,
            healthStatus,
            dispatchPolicy,
        });
    const action = approvedProviderSwitch && dispatchReady
        ? "dispatch_with_provider_switch"
        : providerHoldOverridden && dispatchReady
            ? "dispatch_with_provider_override"
            : providerHoldBlocked
                ? "hold_until_repair"
                : gate.dispatch_ready === false
                    ? "hold_for_context_repair"
                    : dispatchPolicy === "allow_with_receipt_sampling"
                        ? "dispatch_with_receipt_sampling"
                        : dispatchPolicy === "strict_review_before_dispatch"
                            ? "strict_review_before_dispatch"
                            : dispatchPolicy === "allow_with_monitoring"
                                ? "dispatch_with_monitoring"
                                : "dispatch";
    const groupId = String(assignment.scopeId || assignment.scope_id || providerAdvisory?.groupId || providerAdvisory?.group_id || options.groupId || options.group_id || "").trim();
    const at = String(options.at || new Date().toISOString());
    const decisionId = `provider-dispatch-decision:${(0, group_orchestrator_1.hashCoordinator)([
        groupId,
        assignment.assignmentId || assignment.assignment_id || "",
        assignment.dispatchKey || assignment.dispatch_key || "",
        packet.packet_id || "",
        agentType,
        project,
        providerSwitchDecisionReceipt?.receipt_id || "",
    ], 14)}`;
    const openRepairItemIds = Array.isArray(selectedProvider.current_open_repair_item_ids || selectedProvider.currentOpenRepairItemIds)
        ? (selectedProvider.current_open_repair_item_ids || selectedProvider.currentOpenRepairItemIds).slice(0, 8)
        : [];
    return {
        schema: "ccm-worker-context-provider-dispatch-decision-v1",
        version: 1,
        decision_id: decisionId,
        groupId,
        source: "group_main_agent_pre_dispatch_provider_decision",
        project,
        agent_type: agentType,
        selected_provider: {
            project,
            agent_type: agentType,
            health_status: healthStatus,
            dispatch_policy: dispatchPolicy,
            configured: true,
            provider_override_followup_repaired: selectedProvider.provider_override_followup_repaired === true,
            provider_override_followup_repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
            provider_override_followup_last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
            provider_override_followup_receipt_validation_attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
            provider_override_followup_receipt_validation_consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
            provider_override_followup_receipt_validation_escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
            provider_override_followup_receipt_validation_repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
            cross_group_provider_reliability_actionable: selectedProvider.cross_group_provider_reliability_actionable === true,
            cross_group_provider_reliability_risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
            cross_group_provider_reliability_risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
            cross_group_provider_reliability_confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
            cross_group_provider_reliability_source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
            provider_reliability_snapshot_id: selectedProvider.provider_reliability_snapshot_id || "",
            provider_reliability_snapshot_checksum: selectedProvider.provider_reliability_snapshot_checksum || "",
            provider_reliability_snapshot_status: selectedProvider.provider_reliability_snapshot_status || "",
        },
        assignment_id: assignment.assignmentId || assignment.assignment_id || "",
        dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
        worker_context_packet_id: packet.packet_id || "",
        pre_dispatch_gate_id: gate.gate_id || gate.gateId || "",
        advisory_present: !!providerAdvisory?.schema,
        pressure_provenance_provider_dispatch_advisory: providerAdvisory?.schema ? providerAdvisory : null,
        health_status: healthStatus,
        dispatch_policy: dispatchPolicy,
        action,
        decision: action,
        dispatch_ready: dispatchReady,
        dispatchReady,
        should_create_real_task: dispatchReady,
        provider_dispatch_hold: providerHold,
        provider_dispatch_hold_blocked: providerHoldBlocked,
        provider_dispatch_hold_overridden: providerHoldOverridden,
        requires_repair_before_dispatch: providerHoldBlocked || (gate.dispatch_ready === false && !!gate.repair_source),
        requires_repair_followup: providerHoldOverridden,
        requires_receipt_sampling: dispatchPolicy === "allow_with_receipt_sampling",
        safer_alternative_count: Number(providerAdvisory?.safer_alternative_count || 0),
        safer_alternatives: Array.isArray(providerAdvisory?.safer_alternatives) ? providerAdvisory.safer_alternatives.slice(0, 6) : [],
        provider_reliability_snapshot: providerAdvisory?.provider_reliability_snapshot || null,
        auto_switch_provider_allowed: false,
        provider_switch_decision_receipt: providerSwitchDecisionReceipt,
        advised_alternative: advisedAlternative,
        approved_switch: approvedProviderSwitch,
        actually_executed_provider: "",
        repair_source: gate.repair_source || (providerHoldBlocked ? "worker_context_pressure_provenance_feedback_provider_dispatch_advisory" : ""),
        next_step: approvedProviderSwitch
            ? "dispatch_child_agent_with_provider_switch_receipt"
            : gate.next_step || (providerHold ? "repair_pressure_provenance_provider_before_child_dispatch" : "dispatch_child_agent"),
        reason: approvedProviderSwitch
            ? `Approved provider switch ${providerSwitchDecisionReceipt.old_provider?.agent_type || "unknown"} -> ${providerSwitchDecisionReceipt.new_provider?.agent_type || agentType} using fresh snapshot ${providerSwitchDecisionReceipt.provider_reliability_snapshot?.snapshot_id || "unknown"}.`
            : gate.reason || providerAdvisory?.recommendation || "",
        evidence: {
            advisory_schema: providerAdvisory?.schema || "",
            source_policy_action: providerAdvisory?.source_policy_action || providerAdvisory?.sourcePolicyAction || "",
            source_policy_severity: providerAdvisory?.source_policy_severity || providerAdvisory?.sourcePolicySeverity || "",
            open_repair_item_ids: openRepairItemIds,
            provider_override_followup_repaired: selectedProvider.provider_override_followup_repaired === true,
            provider_override_followup_repaired_count: Number(selectedProvider.provider_override_followup_repaired_count || 0),
            provider_override_followup_last_completed_at: selectedProvider.provider_override_followup_last_completed_at || "",
            provider_override_followup_fresh_after_last_violation: selectedProvider.provider_override_followup_fresh_after_last_violation === true,
            provider_override_followup_work_item_ids: Array.isArray(selectedProvider.provider_override_followup_work_item_ids) ? selectedProvider.provider_override_followup_work_item_ids.slice(0, 8) : [],
            provider_override_followup_receipt_validation_attempt_count: Number(selectedProvider.provider_override_followup_receipt_validation_attempt_count || 0),
            provider_override_followup_receipt_validation_failed_count: Number(selectedProvider.provider_override_followup_receipt_validation_failed_count || 0),
            provider_override_followup_receipt_validation_passed_count: Number(selectedProvider.provider_override_followup_receipt_validation_passed_count || 0),
            provider_override_followup_receipt_validation_consecutive_failure_count: Number(selectedProvider.provider_override_followup_receipt_validation_consecutive_failure_count || 0),
            provider_override_followup_receipt_validation_escalated: selectedProvider.provider_override_followup_receipt_validation_escalated === true,
            provider_override_followup_receipt_validation_repair_verified: selectedProvider.provider_override_followup_receipt_validation_repair_verified === true,
            provider_override_followup_receipt_validation_ids: Array.isArray(selectedProvider.provider_override_followup_receipt_validation_ids) ? selectedProvider.provider_override_followup_receipt_validation_ids.slice(0, 8) : [],
            cross_group_provider_reliability_actionable: selectedProvider.cross_group_provider_reliability_actionable === true,
            cross_group_provider_reliability_risk_status: selectedProvider.cross_group_provider_reliability_risk_status || "empty",
            cross_group_provider_reliability_risk_score: Number(selectedProvider.cross_group_provider_reliability_risk_score || 0),
            cross_group_provider_reliability_confidence: Number(selectedProvider.cross_group_provider_reliability_confidence || 0),
            cross_group_provider_reliability_source_group_count: Number(selectedProvider.cross_group_provider_reliability_source_group_count || 0),
            cross_group_provider_reliability_guidance_only: selectedProvider.cross_group_provider_reliability_guidance?.guidance_only === true,
            cross_group_provider_reliability_local_policy_override_allowed: selectedProvider.cross_group_provider_reliability_guidance?.local_policy_override_allowed === true,
            provider_reliability_snapshot_id: selectedProvider.provider_reliability_snapshot_id || "",
            provider_reliability_snapshot_checksum: selectedProvider.provider_reliability_snapshot_checksum || "",
            provider_reliability_snapshot_status: selectedProvider.provider_reliability_snapshot_status || "",
            provider_reliability_snapshot_generation_id: selectedProvider.provider_reliability_snapshot_generation_id || "",
            safer_alternative_count: Number(providerAdvisory?.safer_alternative_count || 0),
            safer_alternative_agent_types: Array.isArray(providerAdvisory?.safer_alternatives)
                ? providerAdvisory.safer_alternatives.map((candidate) => candidate.agent_type || "").filter(Boolean).slice(0, 6)
                : [],
            auto_switch_provider_allowed: false,
            provider_switch_decision_receipt_id: providerSwitchDecisionReceipt?.receipt_id || "",
            provider_switch_decision_receipt_checksum: providerSwitchDecisionReceipt?.receipt_checksum || "",
            advised_alternative: advisedAlternative,
            approved_switch: approvedProviderSwitch,
            actually_executed_provider: "",
            pre_dispatch_gate_dispatch_ready: gate.dispatch_ready !== false,
            pre_dispatch_gate_repair_source: gate.repair_source || "",
        },
        provider_dispatch_override_receipt: overrideReceipt,
        override: overrideReceipt || options.override || assignment.provider_dispatch_override || assignment.providerDispatchOverride || null,
        generated_at: at,
    };
}
function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, assignment = {}, options = {}) {
    const packet = assignment.worker_context_packet || assignment.workerContextPacket || {};
    if (!groupId || !assignment?.project || !packet?.packet_id)
        return null;
    const at = String(options.at || new Date().toISOString());
    const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const gate = assignment.worker_context_pre_dispatch_gate
        || assignment.workerContextPreDispatchGate
        || buildWorkerContextPreDispatchGateForCoordinator(assignment, packet);
    const providerDispatchDecision = assignment.worker_context_provider_dispatch_decision
        || assignment.workerContextProviderDispatchDecision
        || assignment.provider_dispatch_decision
        || assignment.providerDispatchDecision
        || buildWorkerContextProviderDispatchDecisionForCoordinator(assignment, packet, gate, { at });
    let rendered = "";
    try {
        rendered = (0, runtime_kernel_1.renderWorkerContextPacket)(packet);
    }
    catch { }
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(assignment.groupSessionId
        || assignment.group_session_id
        || packet.groupSessionId
        || packet.group_session_id
        || packet.memory?.session_binding?.group_session_id
        || packet.memory?.sessionBinding?.groupSessionId
        || "");
    const bindingId = `worker-context-packet-assignment:${(0, group_orchestrator_1.hashCoordinator)([
        groupId,
        groupSessionId,
        assignment.assignmentId || assignment.assignment_id || "",
        assignment.dispatchKey || assignment.dispatch_key || "",
        packet.packet_id || "",
    ], 14)}`;
    let entry = {
        schema: "ccm-worker-context-packet-assignment-binding-v1",
        binding_id: bindingId,
        groupId,
        groupSessionId,
        group_session_id: groupSessionId,
        source: "worker_context_packet_pre_dispatch_gate",
        project: assignment.project || "",
        agent_type: assignment.agentType || assignment.agent_type || assignment.executor || assignment.runner || packet.agent_type || packet.agentType || packet.memory?.session_binding?.agent_type || packet.memory?.sessionBinding?.agentType || "unknown",
        assignment_id: assignment.assignmentId || assignment.assignment_id || "",
        dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
        task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || "",
        worker_context_packet_id: packet.packet_id || "",
        worker_context_packet_context_usage: packet.context_usage || packet.contextUsage || null,
        worker_context_packet_memory_policy: packet.memory_policy || packet.memoryPolicy || null,
        worker_context_packet_acceptance: packet.acceptance || null,
        worker_context_packet_pressure_memory_provenance_receipt_discipline: packet.pressure_memory_provenance_receipt_discipline || packet.pressureMemoryProvenanceReceiptDiscipline || null,
        worker_context_packet_pressure_provenance_dispatch_feedback_policy: packet.pressure_provenance_dispatch_feedback_policy || packet.pressureProvenanceDispatchFeedbackPolicy || null,
        worker_context_packet_pressure_provenance_provider_dispatch_advisory: packet.pressure_provenance_provider_dispatch_advisory || packet.pressureProvenanceProviderDispatchAdvisory || null,
        worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract: packet.pressure_provenance_provider_dispatch_override_followup_receipt_contract || packet.pressureProvenanceProviderDispatchOverrideFollowupReceiptContract || null,
        worker_context_provider_dispatch_decision: providerDispatchDecision,
        provider_dispatch_decision: providerDispatchDecision,
        worker_context_provider_switch_decision_receipt: assignment.provider_switch_decision_receipt
            || assignment.providerSwitchDecisionReceipt
            || packet.provider_switch_decision_receipt
            || packet.providerSwitchDecisionReceipt
            || providerDispatchDecision?.provider_switch_decision_receipt
            || null,
        provider_switch_decision_receipt: assignment.provider_switch_decision_receipt
            || assignment.providerSwitchDecisionReceipt
            || packet.provider_switch_decision_receipt
            || packet.providerSwitchDecisionReceipt
            || providerDispatchDecision?.provider_switch_decision_receipt
            || null,
        provider_switch_ledger_state: {
            advised_alternative: providerDispatchDecision?.advised_alternative === true,
            approved_switch: providerDispatchDecision?.approved_switch === true,
            actually_executed_provider: "",
        },
        worker_context_provider_dispatch_override_receipt: providerDispatchDecision?.provider_dispatch_override_receipt || providerDispatchDecision?.override || null,
        worker_context_packet_compaction_retry: packet.context_compaction_retry || packet.contextCompactionRetry || null,
        worker_context_packet_partial_compaction: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compaction
            || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompaction
            || null,
        worker_context_packet_partial_compact_policy: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compact_policy
            || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompactPolicy
            || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partial_compaction?.partial_compact_policy
            || (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.partialCompaction?.partialCompactPolicy
            || null,
        worker_context_packet_compact_hook_run_id: (packet.context_compaction_retry || packet.contextCompactionRetry || {})?.compact_hook_run_id || "",
        worker_context_packet_memory_reinjection_proof: packet.memory_reinjection_proof || packet.memoryReinjectionProof || null,
        worker_context_packet_typed_memory_pressure_recall: (0, group_orchestrator_1.summarizeWorkerContextPacketTypedMemoryPressureRecallForCoordinator)(packet),
        worker_context_pre_dispatch_gate: gate,
        dispatch_ready: gate.dispatch_ready !== false,
        dispatchReady: gate.dispatch_ready !== false,
        worker_context_packet_render_probe: {
            packet_id: packet.packet_id || "",
            rendered_flags: {
                has_context_usage_budget: rendered.includes("Context usage budget"),
                has_worker_context_packet: rendered.includes("WorkerContextPacket"),
                has_platform_memory: rendered.includes("平台记忆"),
                has_memory_policy: rendered.includes("Memory policy"),
                has_memory_ignored_policy: rendered.includes("Memory policy：ignored") || rendered.includes("memoryIgnored"),
                has_memory_reinjection_proof: rendered.includes("Memory reinjection proof"),
                has_pressure_memory_provenance_receipt_discipline: rendered.includes("Pressure memory provenance receipt discipline"),
                has_pressure_provenance_dispatch_feedback_policy: rendered.includes("Pressure provenance dispatch feedback policy"),
                has_pressure_provenance_provider_dispatch_advisory: rendered.includes("Pressure provenance provider dispatch advisory"),
                has_provider_switch_decision_receipt: rendered.includes("Provider switch decision receipt"),
                has_pressure_provenance_provider_dispatch_override_followup_receipt_contract: rendered.includes("Provider dispatch override follow-up receipt contract"),
                has_memory_provenance_usage_example: rendered.includes("memoryProvenanceUsage"),
                has_memory_compaction_hash: !!(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash)
                    && rendered.includes(packet.memory_reinjection_proof?.expected_compacted_memory_hash || packet.memoryReinjectionProof?.expectedCompactedMemoryHash || ""),
                has_memory_context_compact_marker: rendered.includes("memory-context-compact"),
                has_partial_compaction: rendered.includes("partial_compaction="),
            },
            rendered_excerpt: (0, group_orchestrator_1.compactText)(rendered, 1200),
        },
        should_create_real_task: gate.dispatch_ready !== false,
        at,
    };
    const overrideFollowup = (0, group_orchestrator_1.syncProviderDispatchOverrideFollowupRepairWorkItemForCoordinator)(groupId, entry, at);
    if (overrideFollowup) {
        entry = {
            ...entry,
            worker_context_provider_dispatch_override_followup_repair: overrideFollowup,
            provider_dispatch_override_followup_repair_work_item: overrideFollowup,
        };
    }
    const existingIndex = entries.findIndex((item) => item.binding_id === bindingId);
    if (existingIndex >= 0)
        entries[existingIndex] = { ...entries[existingIndex], ...entry, first_seen_at: entries[existingIndex].first_seen_at || entries[existingIndex].at || at, at };
    else
        entries.push({ ...entry, first_seen_at: at });
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        nativeBindingCount: entries.filter((item) => (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(item.source)).length,
        workerContextPacketBindingCount: entries.filter((item) => item.worker_context_packet_id).length,
        preDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.schema === "ccm-worker-context-pre-dispatch-gate-v1").length,
        blockedPreDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false).length,
        providerDispatchDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1").length,
        providerDispatchHoldDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "hold_until_repair").length,
        providerDispatchReadyDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.dispatch_ready === true).length,
        providerDispatchOverrideDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override").length,
        providerDispatchOverrideFollowupRepairCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_repair?.work_item_id).length,
        providerDispatchOverrideCompletionCount: entries.filter((item) => item.worker_context_provider_dispatch_override_completion?.completion_ok === true).length,
        providerDispatchOverrideFollowupReceiptContractCount: entries.filter((item) => item.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true).length,
        ...(0, group_orchestrator_1.providerSwitchBindingLedgerCountersForCoordinator)(entries),
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    return entry;
}
function recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, input = {}, options = {}) {
    if (!groupId)
        return null;
    const at = String(options.at || input.at || new Date().toISOString());
    const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const index = (0, group_orchestrator_1.findWorkerContextBindingIndexForCoordinator)(entries, input);
    if (index < 0)
        return null;
    const entry = entries[index];
    const receipt = input.provider_switch_decision_receipt
        || input.providerSwitchDecisionReceipt
        || entry.worker_context_provider_switch_decision_receipt
        || entry.provider_switch_decision_receipt
        || {};
    if (receipt.schema !== "ccm-provider-switch-decision-receipt-v1")
        return null;
    const expectedProvider = String(receipt.new_provider?.agent_type || receipt.newProvider?.agentType || "").trim();
    const actualProvider = String(input.agent_type || input.agentType || input.provider || input.runner || "").trim();
    const taskAgentSessionId = String(input.task_agent_session_id || input.taskAgentSessionId || "").trim();
    const nativeSessionId = String(input.native_session_id || input.nativeSessionId || "").trim();
    const validation = validateProviderSwitchDecisionReceiptForCoordinator(receipt, {
        ...options,
        groupId,
        project: input.project || entry.project || "",
        assignmentId: input.assignment_id || input.assignmentId || entry.assignment_id || "",
        dispatchKey: input.dispatch_key || input.dispatchKey || entry.dispatch_key || "",
        nowMs: options.nowMs || options.now_ms || Date.parse(at) || Date.now(),
    });
    const gaps = [
        ...validation.gaps,
        !taskAgentSessionId ? "task_agent_session_id_missing" : "",
        actualProvider.toLowerCase() !== expectedProvider.toLowerCase() ? "session_provider_mismatch" : "",
        String(input.project || entry.project || "").trim().toLowerCase() !== String(receipt.project || "").trim().toLowerCase() ? "session_project_mismatch" : "",
    ].filter(Boolean);
    const binding = {
        schema: "ccm-provider-switch-child-session-binding-v1",
        binding_id: `provider-switch-session:${(0, group_orchestrator_1.hashCoordinator)([
            receipt.receipt_id || "",
            taskAgentSessionId,
            nativeSessionId,
            input.execution_id || input.executionId || "",
        ], 16)}`,
        provider_switch_decision_receipt_id: receipt.receipt_id || "",
        provider_switch_decision_receipt_checksum: receipt.receipt_checksum || "",
        groupId,
        project: receipt.project || entry.project || "",
        expected_provider: expectedProvider,
        session_provider: actualProvider,
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        execution_id: input.execution_id || input.executionId || "",
        worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
        status: gaps.length ? "rejected" : "bound",
        valid: gaps.length === 0,
        gaps: (0, group_orchestrator_1.uniqueCoordinatorStrings)(gaps),
        validation,
        bound_at: at,
    };
    entries[index] = {
        ...entry,
        worker_context_provider_switch_session_binding: binding,
        provider_switch_session_binding: binding,
        task_agent_session_id: taskAgentSessionId || entry.task_agent_session_id || "",
        native_session_id: nativeSessionId || entry.native_session_id || "",
        execution_id: input.execution_id || input.executionId || entry.execution_id || "",
        at,
    };
    const next = {
        ...ledger,
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: ledger.version || 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        ...(0, group_orchestrator_1.providerSwitchBindingLedgerCountersForCoordinator)(entries),
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    return binding;
}
function recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, input = {}, options = {}) {
    if (!groupId)
        return null;
    const at = String(options.at || input.at || new Date().toISOString());
    const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const index = (0, group_orchestrator_1.findWorkerContextBindingIndexForCoordinator)(entries, input);
    if (index < 0)
        return null;
    const entry = entries[index];
    const decisionReceipt = entry.worker_context_provider_switch_decision_receipt
        || entry.provider_switch_decision_receipt
        || input.provider_switch_decision_receipt
        || input.providerSwitchDecisionReceipt
        || {};
    if (decisionReceipt.schema !== "ccm-provider-switch-decision-receipt-v1")
        return null;
    const sessionBinding = entry.worker_context_provider_switch_session_binding
        || entry.provider_switch_session_binding
        || {};
    const finalReceipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
    const rawChildSwitchExecution = finalReceipt.providerSwitchExecution
        || finalReceipt.provider_switch_execution
        || finalReceipt.providerSwitchExecutionReceipt
        || finalReceipt.provider_switch_execution_receipt
        || null;
    const childSwitchExecution = Array.isArray(rawChildSwitchExecution)
        ? rawChildSwitchExecution[rawChildSwitchExecution.length - 1] || null
        : rawChildSwitchExecution;
    const expectedProvider = String(decisionReceipt.new_provider?.agent_type || decisionReceipt.newProvider?.agentType || "").trim();
    const actualProvider = String(input.executed_provider || input.executedProvider || input.agent_type || input.agentType || finalReceipt.agent_type || finalReceipt.agentType || "").trim();
    const taskAgentSessionId = String(input.task_agent_session_id || input.taskAgentSessionId || finalReceipt.task_agent_session_id || finalReceipt.taskAgentSessionId || "").trim();
    const nativeSessionId = String(input.native_session_id || input.nativeSessionId || finalReceipt.native_session_id || finalReceipt.nativeSessionId || "").trim();
    const executionId = String(input.execution_id || input.executionId || finalReceipt.execution_id || finalReceipt.executionId || "").trim();
    const receiptStatus = String(input.receipt_status || input.receiptStatus || finalReceipt.status || "").trim().toLowerCase();
    const childDecisionReceiptId = String(childSwitchExecution?.decisionReceiptId || childSwitchExecution?.decision_receipt_id || childSwitchExecution?.providerSwitchDecisionReceiptId || childSwitchExecution?.provider_switch_decision_receipt_id || "").trim();
    const childExpectedProvider = String(childSwitchExecution?.expectedProvider || childSwitchExecution?.expected_provider || childSwitchExecution?.approvedProvider || childSwitchExecution?.approved_provider || "").trim();
    const childExecutedProvider = String(childSwitchExecution?.executedProvider || childSwitchExecution?.executed_provider || childSwitchExecution?.actualProvider || childSwitchExecution?.actual_provider || "").trim();
    const childTaskAgentSessionId = String(childSwitchExecution?.taskAgentSessionId || childSwitchExecution?.task_agent_session_id || "").trim();
    const childNativeSessionId = String(childSwitchExecution?.nativeSessionId || childSwitchExecution?.native_session_id || "").trim();
    const childExecutionId = String(childSwitchExecution?.executionId || childSwitchExecution?.execution_id || "").trim();
    const childUsageState = String(childSwitchExecution?.usageState || childSwitchExecution?.usage_state || childSwitchExecution?.status || "").trim().toLowerCase();
    const actualMatchesExpected = actualProvider.toLowerCase() === expectedProvider.toLowerCase();
    const decisionValidation = validateProviderSwitchDecisionReceiptForCoordinator(decisionReceipt, {
        ...options,
        verifySnapshot: false,
        groupId,
        project: input.project || entry.project || "",
        assignmentId: input.assignment_id || input.assignmentId || entry.assignment_id || "",
        dispatchKey: input.dispatch_key || input.dispatchKey || entry.dispatch_key || "",
        nowMs: Date.parse(String(decisionReceipt.decided_at || "")) || Date.now(),
    });
    const gaps = [
        ...decisionValidation.gaps,
        sessionBinding.status !== "bound" ? "approved_switch_session_not_bound" : "",
        !finalReceipt || typeof finalReceipt !== "object" || Object.keys(finalReceipt).length === 0 ? "final_child_receipt_missing" : "",
        !childSwitchExecution || typeof childSwitchExecution !== "object" ? "provider_switch_execution_declaration_missing" : "",
        childSwitchExecution && childDecisionReceiptId !== String(decisionReceipt.receipt_id || "") ? "declared_decision_receipt_id_mismatch" : "",
        childSwitchExecution && childExpectedProvider.toLowerCase() !== expectedProvider.toLowerCase() ? "declared_expected_provider_mismatch" : "",
        childSwitchExecution && childExecutedProvider.toLowerCase() !== actualProvider.toLowerCase() ? "declared_executed_provider_mismatch" : "",
        childSwitchExecution && childTaskAgentSessionId !== taskAgentSessionId ? "declared_task_agent_session_id_mismatch" : "",
        childSwitchExecution && nativeSessionId && childNativeSessionId !== nativeSessionId ? "declared_native_session_id_mismatch" : "",
        childSwitchExecution && childExecutionId !== executionId ? "declared_execution_id_mismatch" : "",
        childSwitchExecution && childUsageState !== (actualMatchesExpected ? "executed" : "mismatch") ? "declared_usage_state_mismatch" : "",
        !actualMatchesExpected ? "executed_provider_mismatch" : "",
        !taskAgentSessionId ? "task_agent_session_id_missing" : "",
        sessionBinding.task_agent_session_id && sessionBinding.task_agent_session_id !== taskAgentSessionId ? "task_agent_session_id_mismatch" : "",
        sessionBinding.native_session_id && nativeSessionId && sessionBinding.native_session_id !== nativeSessionId ? "native_session_id_mismatch" : "",
        !executionId ? "execution_id_missing" : "",
    ].filter(Boolean);
    const executionReceipt = {
        schema: "ccm-provider-switch-execution-receipt-v1",
        execution_receipt_id: `provider-switch-execution:${(0, group_orchestrator_1.hashCoordinator)([
            decisionReceipt.receipt_id || "",
            taskAgentSessionId,
            executionId,
            actualProvider,
        ], 18)}`,
        provider_switch_decision_receipt_id: decisionReceipt.receipt_id || "",
        provider_switch_decision_receipt_checksum: decisionReceipt.receipt_checksum || "",
        groupId,
        project: decisionReceipt.project || entry.project || "",
        advised_alternative: decisionReceipt.advised_alternative === true,
        approved_switch: decisionReceipt.approved_switch === true && decisionValidation.valid,
        expected_provider: expectedProvider,
        actually_executed_provider: actualProvider,
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        execution_id: executionId,
        worker_context_packet_id: entry.worker_context_packet_id || "",
        receipt_status: receiptStatus,
        system_attested: true,
        child_declared: !!childSwitchExecution && typeof childSwitchExecution === "object",
        child_declaration: childSwitchExecution && typeof childSwitchExecution === "object" ? {
            decision_receipt_id: childDecisionReceiptId,
            expected_provider: childExpectedProvider,
            executed_provider: childExecutedProvider,
            task_agent_session_id: childTaskAgentSessionId,
            native_session_id: childNativeSessionId,
            execution_id: childExecutionId,
            usage_state: childUsageState,
        } : null,
        status: gaps.length ? "failed" : "passed",
        executed_as_approved: gaps.length === 0,
        gaps: (0, group_orchestrator_1.uniqueCoordinatorStrings)(gaps),
        final_child_receipt_present: !!finalReceipt && typeof finalReceipt === "object" && Object.keys(finalReceipt).length > 0,
        at,
    };
    entries[index] = {
        ...entry,
        worker_context_provider_switch_execution_receipt: executionReceipt,
        provider_switch_execution_receipt: executionReceipt,
        provider_switch_ledger_state: {
            advised_alternative: decisionReceipt.advised_alternative === true,
            approved_switch: decisionReceipt.approved_switch === true && decisionValidation.valid,
            actually_executed_provider: actualProvider,
        },
        worker_context_packet_receipt: finalReceipt,
        receipt_status: receiptStatus,
        task_agent_session_id: taskAgentSessionId || entry.task_agent_session_id || "",
        native_session_id: nativeSessionId || entry.native_session_id || "",
        execution_id: executionId || entry.execution_id || "",
        at,
    };
    const next = {
        ...ledger,
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: ledger.version || 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        ...(0, group_orchestrator_1.providerSwitchBindingLedgerCountersForCoordinator)(entries),
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    let typedMemoryDistillation = null;
    try {
        typedMemoryDistillation = (0, group_memory_index_1.distillProviderSwitchExecutionToTypedMemory)(groupId, {
            rows: [entries[index]],
        }, {
            reason: "worker-context-provider-switch-execution-receipt",
            updatedAt: at,
            ...(options.providerSwitchExecutionDistillationOptions || options.provider_switch_execution_distillation_options || {}),
        });
    }
    catch (error) {
        typedMemoryDistillation = {
            schema: "ccm-provider-switch-execution-distillation-error-v1",
            status: "failed",
            reason: (0, group_orchestrator_1.compactText)(error?.message || String(error || ""), 500),
        };
    }
    return {
        ...executionReceipt,
        typed_memory_distillation: typedMemoryDistillation,
    };
}
function recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, input = {}, options = {}) {
    if (!groupId)
        return null;
    const at = String(options.at || input.at || new Date().toISOString());
    const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const bindingId = String(input.binding_id || input.bindingId || "").trim();
    const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
    const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
    const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
    const index = entries.findIndex((entry) => {
        if (bindingId && String(entry.binding_id || "") === bindingId)
            return true;
        if (assignmentId && String(entry.assignment_id || "") === assignmentId)
            return true;
        if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey)
            return true;
        return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
    });
    if (index < 0)
        return null;
    const entry = entries[index];
    const decision = entry.worker_context_provider_dispatch_decision || entry.provider_dispatch_decision || {};
    if (decision.action !== "dispatch_with_provider_override")
        return null;
    const completion = (0, group_orchestrator_1.buildProviderDispatchOverrideCompletionForCoordinator)(entry, input, at);
    const closure = (0, group_orchestrator_1.closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator)(groupId, completion, at);
    const nextEntry = {
        ...entry,
        worker_context_provider_dispatch_override_completion: {
            ...completion,
            followup_repair_work_item_completion: closure,
        },
        provider_dispatch_override_completion: {
            ...completion,
            followup_repair_work_item_completion: closure,
        },
        provider_dispatch_override_completion_status: completion.status,
        provider_dispatch_override_completion_at: at,
        at,
    };
    entries[index] = nextEntry;
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: ledger.version || 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        nativeBindingCount: entries.filter((item) => (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(item.source)).length,
        workerContextPacketBindingCount: entries.filter((item) => item.worker_context_packet_id).length,
        preDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.schema === "ccm-worker-context-pre-dispatch-gate-v1").length,
        blockedPreDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false).length,
        providerDispatchDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1").length,
        providerDispatchHoldDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "hold_until_repair").length,
        providerDispatchReadyDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.dispatch_ready === true).length,
        providerDispatchOverrideDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override").length,
        providerDispatchOverrideFollowupRepairCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_repair?.work_item_id).length,
        providerDispatchOverrideCompletionCount: entries.filter((item) => item.worker_context_provider_dispatch_override_completion?.completion_ok === true).length,
        providerDispatchOverrideFollowupReceiptContractCount: entries.filter((item) => item.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true).length,
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    return nextEntry.worker_context_provider_dispatch_override_completion;
}
function recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, input = {}, options = {}) {
    if (!groupId)
        return null;
    const at = String(options.at || input.at || new Date().toISOString());
    const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const bindingId = String(input.binding_id || input.bindingId || "").trim();
    const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
    const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
    const packetId = String(input.worker_context_packet_id || input.workerContextPacketId || "").trim();
    const index = entries.findIndex((entry) => {
        if (bindingId && String(entry.binding_id || "") === bindingId)
            return true;
        if (assignmentId && String(entry.assignment_id || "") === assignmentId)
            return true;
        if (dispatchKey && String(entry.dispatch_key || "") === dispatchKey)
            return true;
        return !!packetId && String(entry.worker_context_packet_id || "") === packetId;
    });
    if (index < 0)
        return null;
    const entry = entries[index];
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(input.groupSessionId || input.group_session_id || entry.groupSessionId || entry.group_session_id || "");
    const typedMemoryScopeId = groupSessionId ? `${groupId}--${groupSessionId}` : groupId;
    const validationBase = (0, group_orchestrator_1.buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator)(entry, input, at);
    const repairWorkItem = (0, group_orchestrator_1.syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator)(groupId, entry, validationBase, at);
    const validationDraft = {
        ...validationBase,
        repair_work_item: repairWorkItem,
        repair_work_item_id: repairWorkItem?.work_item_id || "",
        repair_work_item_status: repairWorkItem?.status || "",
    };
    let typedMemoryDistillation = null;
    let typedMemoryDistillationError = "";
    try {
        typedMemoryDistillation = (0, group_memory_index_1.distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory)(typedMemoryScopeId, {
            rows: [{
                    entry: {
                        ...entry,
                        task_id: input.task_id || input.taskId || entry.task_id || "",
                        worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || entry.worker_handoff_id || "",
                        task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || entry.task_agent_session_id || "",
                        native_session_id: input.native_session_id || input.nativeSessionId || entry.native_session_id || "",
                        execution_id: input.execution_id || input.executionId || entry.execution_id || "",
                        groupSessionId,
                        group_session_id: groupSessionId,
                        at,
                    },
                    validation: { ...validationDraft, groupId, groupSessionId, group_session_id: groupSessionId },
                }],
        }, {
            reason: "group-orchestrator-provider-dispatch-override-followup-receipt-validation",
            sourceGroupId: groupId,
            groupSessionId,
            updatedAt: at,
        });
    }
    catch (error) {
        typedMemoryDistillationError = String(error?.message || error || "provider override follow-up receipt validation distillation failed");
    }
    const validation = {
        ...validationDraft,
        typed_memory_distillation: typedMemoryDistillation ? {
            schema: typedMemoryDistillation.schema || "",
            archived_count: Number(typedMemoryDistillation.archivedCount || 0),
            attempt_count: Number(typedMemoryDistillation.attemptCount || 0),
            failed_count: Number(typedMemoryDistillation.failedCount || 0),
            passed_count: Number(typedMemoryDistillation.passedCount || 0),
            attribution_count: Number(typedMemoryDistillation.attributionCount || 0),
            write_count: Number(typedMemoryDistillation.writeCount || 0),
            ledger_file: typedMemoryDistillation.ledgerFile || "",
        } : null,
        typed_memory_distillation_error: typedMemoryDistillationError,
    };
    const nextEntry = {
        ...entry,
        groupSessionId,
        group_session_id: groupSessionId,
        worker_context_provider_dispatch_override_followup_receipt_contract_validation: validation,
        provider_dispatch_override_followup_receipt_contract_validation: validation,
        provider_dispatch_override_followup_receipt_contract_validation_status: validation.status,
        provider_dispatch_override_followup_receipt_contract_validation_at: at,
        worker_context_packet_receipt: input.receipt || input.ccm_receipt || input.delivery_summary || entry.worker_context_packet_receipt || null,
        receipt_status: validation.receipt_status || entry.receipt_status || "",
        task_id: input.task_id || input.taskId || entry.task_id || "",
        worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || entry.worker_handoff_id || "",
        task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || entry.task_agent_session_id || "",
        native_session_id: input.native_session_id || input.nativeSessionId || entry.native_session_id || "",
        execution_id: input.execution_id || input.executionId || entry.execution_id || "",
        at,
    };
    entries[index] = nextEntry;
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: ledger.version || 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        nativeBindingCount: entries.filter((item) => (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(item.source)).length,
        workerContextPacketBindingCount: entries.filter((item) => item.worker_context_packet_id).length,
        preDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.schema === "ccm-worker-context-pre-dispatch-gate-v1").length,
        blockedPreDispatchGateCount: entries.filter((item) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false).length,
        providerDispatchDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1").length,
        providerDispatchHoldDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "hold_until_repair").length,
        providerDispatchReadyDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.dispatch_ready === true).length,
        providerDispatchOverrideDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override").length,
        providerDispatchOverrideFollowupRepairCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_repair?.work_item_id).length,
        providerDispatchOverrideCompletionCount: entries.filter((item) => item.worker_context_provider_dispatch_override_completion?.completion_ok === true).length,
        providerDispatchOverrideFollowupReceiptContractCount: entries.filter((item) => item.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true).length,
        providerDispatchOverrideFollowupReceiptContractValidationCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.schema === "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1").length,
        providerDispatchOverrideFollowupReceiptContractValidationPassedCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.contract_satisfied === true).length,
        providerDispatchOverrideFollowupReceiptContractValidationFailedCount: entries.filter((item) => item.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.status === "failed").length,
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    return validation;
}
//# sourceMappingURL=group-orchestrator-worker-context.js.map