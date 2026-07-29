"use strict";
// typed-memory-index-build.ts — merged from 2 part files (behavior-freeze merge).
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
exports.buildClaudeMemorySettingSourcePolicy = buildClaudeMemorySettingSourcePolicy;
exports.deriveGroupTypedMemoryTargetPaths = deriveGroupTypedMemoryTargetPaths;
exports.getGroupTypedMemoryIndexFile = getGroupTypedMemoryIndexFile;
exports.getGroupTypedMemoryArtifactTransactionJournalFile = getGroupTypedMemoryArtifactTransactionJournalFile;
exports.getGroupTypedMemoryArtifactTransactionStageRoot = getGroupTypedMemoryArtifactTransactionStageRoot;
exports.inspectGroupTypedMemoryArtifactTransaction = inspectGroupTypedMemoryArtifactTransaction;
exports.recoverGroupTypedMemoryArtifactTransaction = recoverGroupTypedMemoryArtifactTransaction;
exports.prepareGroupTypedMemoryArtifactTransaction = prepareGroupTypedMemoryArtifactTransaction;
exports.recoverGroupTypedMemoryArtifactTransactionsFleet = recoverGroupTypedMemoryArtifactTransactionsFleet;
exports.getGroupClaudeInstructionsLoadedHookLedgerFile = getGroupClaudeInstructionsLoadedHookLedgerFile;
exports.registerGroupMemoryInstructionsLoadedHook = registerGroupMemoryInstructionsLoadedHook;
exports.hasGroupMemoryInstructionsLoadedHook = hasGroupMemoryInstructionsLoadedHook;
exports.loadGroupClaudeInstructionsLoadedHookLedger = loadGroupClaudeInstructionsLoadedHookLedger;
exports.writeGroupClaudeInstructionsLoadedHookLedger = writeGroupClaudeInstructionsLoadedHookLedger;
exports.executeGroupMemoryInstructionsLoadedHooks = executeGroupMemoryInstructionsLoadedHooks;
exports.getGroupClaudeMemoryExternalIncludeApprovalLedgerFile = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile;
exports.normalizeExternalIncludeApprovalPath = normalizeExternalIncludeApprovalPath;
exports.externalIncludeApprovalKey = externalIncludeApprovalKey;
exports.loadGroupClaudeMemoryExternalIncludeApprovalLedger = loadGroupClaudeMemoryExternalIncludeApprovalLedger;
exports.writeGroupClaudeMemoryExternalIncludeApprovalLedger = writeGroupClaudeMemoryExternalIncludeApprovalLedger;
exports.approveGroupClaudeMemoryExternalInclude = approveGroupClaudeMemoryExternalInclude;
exports.markGroupClaudeMemoryExternalIncludeWarningShown = markGroupClaudeMemoryExternalIncludeWarningShown;
exports.upsertGroupTypedMemoryDocument = upsertGroupTypedMemoryDocument;
exports.projectMemoryRelPath = projectMemoryRelPath;
exports.executeInstructionsLoadedHooksForImportedClaudeMemory = executeInstructionsLoadedHooksForImportedClaudeMemory;
exports.discoverProjectMemoryFiles = discoverProjectMemoryFiles;
exports.importProjectMemoryFilesToGroupTypedMemory = importProjectMemoryFilesToGroupTypedMemory;
exports.defaultManagedClaudeMemoryRoot = defaultManagedClaudeMemoryRoot;
exports.defaultUserClaudeMemoryRoot = defaultUserClaudeMemoryRoot;
exports.discoverGlobalClaudeMemoryFiles = discoverGlobalClaudeMemoryFiles;
exports.importGlobalClaudeMemoryToGroupTypedMemory = importGlobalClaudeMemoryToGroupTypedMemory;
exports.scanGroupTypedMemoryDocumentsRaw = scanGroupTypedMemoryDocumentsRaw;
exports.scanGroupTypedMemoryDocuments = scanGroupTypedMemoryDocuments;
exports.buildGroupTypedMemoryIndex = buildGroupTypedMemoryIndex;
exports.isClaudeMemoryTextInclude = isClaudeMemoryTextInclude;
exports.resolveClaudeMemoryIncludePath = resolveClaudeMemoryIncludePath;
exports.neutralizeClaudeMemoryIncludeRefs = neutralizeClaudeMemoryIncludeRefs;
exports.claudeMemoryIncludeRelPath = claudeMemoryIncludeRelPath;
exports.buildClaudeMemoryIncludeExpansion = buildClaudeMemoryIncludeExpansion;
exports.buildTypedMemoryLoadEntry = buildTypedMemoryLoadEntry;
exports.buildGroupTypedMemoryLoadPlan = buildGroupTypedMemoryLoadPlan;
exports.renderGroupTypedMemoryLoadPlan = renderGroupTypedMemoryLoadPlan;
exports.normalizeDirectMemoryText = normalizeDirectMemoryText;
exports.normalizeGroupDirectMemoryRequest = normalizeGroupDirectMemoryRequest;
exports.directMemoryFactIdentity = directMemoryFactIdentity;
exports.directMemoryFactRows = directMemoryFactRows;
exports.applyGroupDirectMemoryRequests = applyGroupDirectMemoryRequests;
exports.filterFactsByDirectMemoryTombstones = filterFactsByDirectMemoryTombstones;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile;
exports.conflictResolutionColdArchiveManifestChecksum = conflictResolutionColdArchiveManifestChecksum;
exports.getConflictResolutionColdArchiveManifestGenerationsDir = getConflictResolutionColdArchiveManifestGenerationsDir;
exports.getConflictResolutionColdArchiveManifestGenerationFile = getConflictResolutionColdArchiveManifestGenerationFile;
exports.readConflictResolutionColdArchiveManifest = readConflictResolutionColdArchiveManifest;
exports.readPreviousConflictResolutionColdArchiveManifest = readPreviousConflictResolutionColdArchiveManifest;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration;
exports.buildGroupDirectMemoryAction = buildGroupDirectMemoryAction;
exports.commitGroupDirectMemoryAction = commitGroupDirectMemoryAction;
exports.syncGroupTypedMemoryFromGroupMemory = syncGroupTypedMemoryFromGroupMemory;
exports.groupTypedMemoryManifestSelectionChecksum = groupTypedMemoryManifestSelectionChecksum;
exports.groupTypedMemoryManifestSelectorCalibrationChecksum = groupTypedMemoryManifestSelectorCalibrationChecksum;
exports.getGroupTypedMemoryManifestSelectorDecisionDir = getGroupTypedMemoryManifestSelectorDecisionDir;
exports.getGroupTypedMemoryManifestSelectorOutcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir;
exports.getGroupTypedMemoryManifestSelectorConsumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir;
exports.groupTypedMemoryManifestSelectorOutcomeChecksum = groupTypedMemoryManifestSelectorOutcomeChecksum;
exports.verifyGroupTypedMemoryManifestSelectorOutcome = verifyGroupTypedMemoryManifestSelectorOutcome;
exports.recordGroupTypedMemoryManifestSelectorOutcome = recordGroupTypedMemoryManifestSelectorOutcome;
exports.groupTypedMemoryManifestSelectorConsumptionChecksum = groupTypedMemoryManifestSelectorConsumptionChecksum;
exports.readGroupTypedMemoryManifestSelectorChain = readGroupTypedMemoryManifestSelectorChain;
exports.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome = verifyGroupTypedMemoryManifestSelectorConsumptionOutcome;
exports.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes = recordGroupTypedMemoryManifestSelectorConsumptionOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorConsumption = summarizeGroupTypedMemoryManifestSelectorConsumption;
exports.verifyGroupTypedMemoryManifestSelectorCalibration = verifyGroupTypedMemoryManifestSelectorCalibration;
exports.buildGroupTypedMemoryManifestSelectorCalibration = buildGroupTypedMemoryManifestSelectorCalibration;
exports.groupTypedMemoryManifestSelectorAgeStats = groupTypedMemoryManifestSelectorAgeStats;
exports.recordGroupTypedMemoryManifestSelectorDecision = recordGroupTypedMemoryManifestSelectorDecision;
exports.verifyGroupTypedMemoryManifestSelection = verifyGroupTypedMemoryManifestSelection;
exports.configureGroupTypedMemoryManifestSelector = configureGroupTypedMemoryManifestSelector;
exports.buildGroupTypedMemoryManifest = buildGroupTypedMemoryManifest;
exports.parseGroupTypedMemoryManifestSelectorOutput = parseGroupTypedMemoryManifestSelectorOutput;
exports.finalizeGroupTypedMemoryManifestSelection = finalizeGroupTypedMemoryManifestSelection;
exports.selectGroupTypedMemoryManifest = selectGroupTypedMemoryManifest;
exports.summarizeGroupTypedMemoryManifestSelectorOutcomes = summarizeGroupTypedMemoryManifestSelectorOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorDecisions = summarizeGroupTypedMemoryManifestSelectorDecisions;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
const typed_memory_shape_trend_1 = require("./typed-memory-shape-trend");
const typed_memory_shared_1 = require("./typed-memory-shared");
// ===== merged from typed-memory-index-build-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function buildClaudeMemorySettingSourcePolicy(options = {}) {
    return require("./group-memory-loading").buildClaudeMemorySettingSourcePolicy(options);
}
function deriveGroupTypedMemoryTargetPaths(value, extra = []) {
    const text = String(value || "");
    const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql|css|scss|html))/g) || [];
    const result = [];
    const seen = new Set();
    for (const raw of [...extra, ...matched]) {
        const value = (0, typed_memory_shared_1.normalizeTargetPath)(raw);
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
function getGroupTypedMemoryIndexFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_ENTRYPOINT);
}
function getGroupTypedMemoryArtifactTransactionJournalFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL);
}
function getGroupTypedMemoryArtifactTransactionStageRoot(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR);
}
function inspectGroupTypedMemoryArtifactTransaction(groupId) {
    const file = getGroupTypedMemoryArtifactTransactionJournalFile(groupId);
    let journal = null;
    try {
        journal = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    if (!journal)
        return fs.existsSync(file)
            ? { file, present: true, valid: false, corrupt: true, journal: null }
            : { file, present: false, valid: true, corrupt: false, journal: null };
    const checksumValid = String(journal.journalChecksum || "") === (0, typed_memory_shared_1.groupTypedMemoryArtifactJournalChecksum)(journal);
    const identityValid = journal.schema === "ccm-group-typed-memory-artifact-transaction-v1"
        && Number(journal.version || 0) === 1
        && String(journal.groupId || "") === groupId
        && !!String(journal.leaseId || "")
        && Number(journal.fencingToken || 0) > 0;
    return { file, present: true, valid: checksumValid && identityValid, checksumValid, identityValid, corrupt: false, journal };
}
function recoverGroupTypedMemoryArtifactTransaction(groupId) {
    const inspected = inspectGroupTypedMemoryArtifactTransaction(groupId);
    if (!inspected.present)
        return { recovered: false, reason: "artifact_journal_absent" };
    if (!inspected.valid)
        throw new Error("typed_memory_artifact_journal_corrupt");
    const journal = inspected.journal;
    if (["committed", "recovered_rollforward", "recovered_rollback"].includes(String(journal.status || ""))) {
        (0, typed_memory_ledgers_1.cleanupGroupTypedMemoryArtifactStage)(groupId, String(journal.leaseId || ""));
        return { recovered: false, reason: "artifact_journal_terminal", status: journal.status };
    }
    if (journal.status !== "prepared")
        throw new Error(`typed_memory_artifact_journal_status_invalid:${journal.status || "missing"}`);
    const artifacts = Array.isArray(journal.artifacts) ? journal.artifacts : [];
    if (artifacts.length !== Number(journal.artifactCount || 0))
        throw new Error("typed_memory_artifact_journal_count_mismatch");
    let ledger = {};
    try {
        ledger = JSON.parse(fs.readFileSync((0, typed_memory_distillation_receipts_1.getGroupTypedMemoryDistillationLedgerFile)(groupId), "utf-8"));
    }
    catch { }
    const ledgerCommit = ledger?.distillationMutation || ledger?.distillationTransaction || {};
    const rollforward = Number(ledgerCommit.fencingToken || 0) === Number(journal.fencingToken || 0)
        && String(ledgerCommit.leaseId || "") === String(journal.leaseId || "");
    const ordered = [...artifacts].sort((a, b) => Number(a.commitOrder || 0) - Number(b.commitOrder || 0));
    const apply = rollforward ? ordered : [...ordered].reverse();
    for (const artifact of apply)
        (0, typed_memory_shared_1.applyGroupTypedMemoryArtifactVersion)(groupId, journal, artifact, rollforward ? "after" : "before");
    const verified = artifacts.every((artifact) => (0, typed_memory_shared_1.verifyGroupTypedMemoryArtifactVersion)(groupId, artifact, rollforward ? "after" : "before"));
    if (!verified)
        throw new Error("typed_memory_artifact_recovery_verification_failed");
    const recoveredAt = (0, typed_memory_shared_1.now)();
    const recovered = (0, typed_memory_shared_1.writeGroupTypedMemoryArtifactJournalRaw)(groupId, {
        ...journal,
        status: rollforward ? "recovered_rollforward" : "recovered_rollback",
        recoveredAt,
        recoveryAction: rollforward ? "rollforward_from_committed_ledger_fence" : "rollback_before_uncommitted_ledger_fence",
        stageCleanedAt: recoveredAt,
        updatedAt: recoveredAt,
    });
    (0, typed_memory_ledgers_1.cleanupGroupTypedMemoryArtifactStage)(groupId, String(journal.leaseId || ""));
    return { recovered: true, action: recovered.recoveryAction, journal: recovered };
}
function prepareGroupTypedMemoryArtifactTransaction(context) {
    const pending = [...(context.pendingArtifacts?.values() || [])];
    if (!pending.length)
        return null;
    const groupId = String(context.groupId || "");
    const leaseId = String(context.handle?.lock?.leaseId || "");
    const fencingToken = Number(context.handle?.lock?.fencingToken || 0);
    const stageDir = (0, typed_memory_shared_1.groupTypedMemoryArtifactStageDir)(groupId, leaseId);
    fs.mkdirSync(stageDir, { recursive: true });
    const sorted = pending.sort((a, b) => {
        const rank = (entry) => path.basename(entry.file) === typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER
            ? 2
            : path.basename(entry.file) === typed_memory_shared_1.GROUP_TYPED_MEMORY_ENTRYPOINT ? 1 : 0;
        return rank(a) - rank(b) || path.basename(a.file).localeCompare(path.basename(b.file));
    });
    const artifacts = sorted.map((entry, index) => {
        const target = (0, typed_memory_shared_1.groupTypedMemoryArtifactTarget)(groupId, path.basename(entry.file));
        const beforeExists = fs.existsSync(target);
        const before = beforeExists ? fs.readFileSync(target) : Buffer.alloc(0);
        const after = entry.delete === true ? Buffer.alloc(0) : Buffer.from(String(entry.content || ""), "utf-8");
        const beforeStage = beforeExists ? `before-${String(index).padStart(3, "0")}.bin` : "";
        const afterStage = entry.delete === true ? "" : `after-${String(index).padStart(3, "0")}.bin`;
        if (beforeExists)
            fs.writeFileSync(path.join(stageDir, beforeStage), before, { flush: true });
        if (entry.delete !== true)
            fs.writeFileSync(path.join(stageDir, afterStage), after, { flush: true });
        return {
            target: path.basename(target),
            beforeExists,
            beforeChecksum: beforeExists ? (0, typed_memory_shared_1.checksum)(before, 64) : "",
            beforeBytes: before.length,
            beforeStage,
            afterDelete: entry.delete === true,
            afterChecksum: entry.delete === true ? "" : (0, typed_memory_shared_1.checksum)(after, 64),
            afterBytes: after.length,
            afterStage,
            commitOrder: index,
        };
    });
    const preparedAt = (0, typed_memory_shared_1.now)();
    return (0, typed_memory_shared_1.writeGroupTypedMemoryArtifactJournalRaw)(groupId, {
        status: "prepared",
        leaseId,
        fencingToken,
        mutationKind: String(context.mutationKind || "unknown"),
        mutationKinds: (0, typed_memory_shared_1.uniqueStrings)((context.mutationKinds || [context.mutationKind]).map(String), 32),
        artifactCount: artifacts.length,
        artifacts,
        preparedAt,
        committedAt: "",
        recoveredAt: "",
        recoveryAction: "",
        stageCleanedAt: "",
        updatedAt: preparedAt,
    });
}
function recoverGroupTypedMemoryArtifactTransactionsFleet(options = {}) {
    const maxScopes = Math.max(1, Math.min(5000, Number(options.maxScopes || options.max_scopes || 1000)));
    let scopeIds = [];
    try {
        scopeIds = fs.readdirSync(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
            .filter(entry => entry.isDirectory() && /--gcs_[a-zA-Z0-9._-]+$/.test(entry.name))
            .map(entry => entry.name)
            .filter(scopeId => fs.existsSync(getGroupTypedMemoryArtifactTransactionJournalFile(scopeId)))
            .slice(0, maxScopes);
    }
    catch { }
    const rows = [];
    for (const groupId of scopeIds) {
        const inspected = inspectGroupTypedMemoryArtifactTransaction(groupId);
        const stagePresent = fs.existsSync(getGroupTypedMemoryArtifactTransactionStageRoot(groupId));
        if (!inspected.valid) {
            rows.push({ groupId, status: "failed", reason: "artifact_journal_corrupt", stagePresent });
            continue;
        }
        if (inspected.journal?.status !== "prepared" && !stagePresent) {
            rows.push({ groupId, status: "current", reason: "terminal_without_stage", stagePresent: false });
            continue;
        }
        try {
            const result = (0, typed_memory_distillation_receipts_1.runGroupTypedMemoryDistillationMutation)(groupId, "artifact_transaction_startup_recovery", {
                transactionMaxWaitMs: Number(options.transactionMaxWaitMs ?? options.transaction_max_wait_ms ?? 0),
            }, () => ({ schema: "ccm-group-typed-memory-artifact-startup-recovery-v1", groupId }));
            const recovery = result.distillationMutation?.artifactRecovery || {};
            rows.push({
                groupId,
                status: recovery.recovered === true ? "recovered" : "cleaned",
                action: String(recovery.action || ""),
                reason: String(recovery.reason || ""),
                fencingToken: Number(result.distillationMutation?.fencingToken || 0),
            });
        }
        catch (error) {
            rows.push({ groupId, status: "failed", reason: String(error?.code || "artifact_recovery_failed"), error: (0, typed_memory_shared_1.compactText)(error?.message || error, 800) });
        }
    }
    return {
        schema: "ccm-group-typed-memory-artifact-startup-recovery-fleet-v1",
        checked: scopeIds.length,
        recovered: rows.filter(row => row.status === "recovered").length,
        cleaned: rows.filter(row => row.status === "cleaned").length,
        current: rows.filter(row => row.status === "current").length,
        failed: rows.filter(row => row.status === "failed").length,
        rollbackCount: rows.filter(row => row.action === "rollback_before_uncommitted_ledger_fence").length,
        rollforwardCount: rows.filter(row => row.action === "rollforward_from_committed_ledger_fence").length,
        rows,
        recoveredAt: (0, typed_memory_shared_1.now)(),
    };
}
function getGroupClaudeInstructionsLoadedHookLedgerFile(groupId) {
    return require("./group-memory-loading").getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
}
function registerGroupMemoryInstructionsLoadedHook(hook) {
    return require("./group-memory-loading").registerGroupMemoryInstructionsLoadedHook(hook);
}
function hasGroupMemoryInstructionsLoadedHook() {
    return require("./group-memory-loading").hasGroupMemoryInstructionsLoadedHook();
}
function loadGroupClaudeInstructionsLoadedHookLedger(groupId) {
    return require("./group-memory-loading").loadGroupClaudeInstructionsLoadedHookLedger(groupId);
}
function writeGroupClaudeInstructionsLoadedHookLedger(groupId, ledger) {
    const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
    const value = {
        schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
        version: typed_memory_shared_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        entries: (Array.isArray(ledger?.entries) ? ledger.entries : []).slice(-300),
        updatedAt: (0, typed_memory_shared_1.now)(),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file };
}
function executeGroupMemoryInstructionsLoadedHooks(groupId, input = {}) {
    return require("./group-memory-loading").executeGroupMemoryInstructionsLoadedHooks(groupId, input);
}
function getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId) {
    return require("./group-memory-loading").getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
}
function normalizeExternalIncludeApprovalPath(file) {
    const text = String(file || "").trim();
    return text ? path.resolve(text).replace(/\\/g, "/") : "";
}
function externalIncludeApprovalKey(file) {
    return (0, typed_memory_shared_1.checksum)(normalizeExternalIncludeApprovalPath(file), 24);
}
function loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) {
    return require("./group-memory-loading").loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
}
function writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, ledger) {
    const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
    const value = {
        schema: "ccm-claude-memory-external-include-approval-ledger-v1",
        version: typed_memory_shared_1.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
        groupId,
        hasExternalIncludesApproved: ledger?.hasExternalIncludesApproved === true,
        hasExternalIncludesWarningShown: ledger?.hasExternalIncludesWarningShown === true,
        warningShownAt: String(ledger?.warningShownAt || ""),
        approved: (Array.isArray(ledger?.approved) ? ledger.approved : []).slice(-300),
        warnings: (Array.isArray(ledger?.warnings) ? ledger.warnings : []).slice(-80),
        updatedAt: (0, typed_memory_shared_1.now)(),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, value);
    return { ...value, file };
}
function approveGroupClaudeMemoryExternalInclude(groupId, input = {}) {
    return require("./group-memory-loading").approveGroupClaudeMemoryExternalInclude(groupId, input);
}
function markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input = {}) {
    return require("./group-memory-loading").markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input);
}
function upsertGroupTypedMemoryDocument(groupId, input) {
    const dir = (0, typed_memory_shared_1.ensureGroupTypedMemoryDir)(groupId);
    const type = (0, typed_memory_shared_1.normalizeMemoryType)(input.type);
    const name = (0, typed_memory_shared_1.markdownLinkTitle)(input.name || input.title || type);
    const slug = (0, typed_memory_shared_1.safeSegment)(input.slug || `${type}-${name.toLowerCase()}`, `${type}-memory`);
    const file = path.join(dir, `${slug}.md`);
    const beforeExists = fs.existsSync(file);
    let beforeContent = "";
    if (beforeExists) {
        try {
            beforeContent = fs.readFileSync(file, "utf-8");
        }
        catch { }
    }
    const content = (0, typed_memory_shared_1.renderMemoryDocument)({ ...input, type, name, groupId });
    const changed = (0, typed_memory_shared_1.writeTextAtomic)(file, content);
    let writeShapeTelemetry = null;
    let writeShapeTelemetryError = "";
    if ((0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(groupId)) {
        try {
            writeShapeTelemetry = (0, typed_memory_shape_trend_1.recordGroupTypedMemoryWriteShape)(groupId, {
                relPath: `${slug}.md`,
                memoryType: type,
                beforeExists,
                beforeContent,
                afterContent: content,
                changed,
                inputBody: String(input.body || input.content || ""),
                maxBodyChars: Number(input.maxBodyChars || 12_000),
                source: String(input.source || "manual"),
            });
        }
        catch (error) {
            writeShapeTelemetryError = (0, typed_memory_shared_1.compactText)(error?.message || error, 240);
        }
    }
    return { file, changed, slug, type, name, writeShapeTelemetry, writeShapeTelemetryError };
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
        version: typed_memory_shared_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
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
    return require("./group-memory-loading").discoverProjectMemoryFiles(projectRoot, options);
}
function importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options = {}) {
    return require("./group-memory-loading").importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options);
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
    return require("./group-memory-loading").discoverGlobalClaudeMemoryFiles(options);
}
function importGlobalClaudeMemoryToGroupTypedMemory(groupId, options = {}) {
    return require("./group-memory-loading").importGlobalClaudeMemoryToGroupTypedMemory(groupId, options);
}
function scanGroupTypedMemoryDocumentsRaw(groupId) {
    return (0, typed_memory_shared_1.listMemoryMarkdownFiles)(groupId).map(file => {
        const content = (0, typed_memory_shared_1.readGroupTypedMemoryArtifactText)(file);
        if (content === null)
            return null;
        const parsed = (0, typed_memory_shared_1.parseFrontmatter)(content);
        let stat = null;
        try {
            stat = fs.statSync(file);
        }
        catch { }
        return {
            file,
            relPath: path.basename(file),
            name: parsed.meta.name || path.basename(file, ".md"),
            description: parsed.meta.description || "",
            type: (0, typed_memory_shared_1.normalizeMemoryType)(parsed.meta.type),
            source: parsed.meta.source || "",
            paths: (0, typed_memory_shared_1.normalizePathGlobs)(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
            updatedAt: parsed.meta.updated_at || (stat ? stat.mtime.toISOString() : (0, typed_memory_shared_1.now)()),
            checksum: parsed.meta.checksum || (0, typed_memory_shared_1.checksum)(content, 24),
            body: parsed.body,
            mtimeMs: Number(stat?.mtimeMs || Date.now()),
            bytes: Buffer.byteLength(content, "utf-8"),
        };
    }).filter(Boolean).sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)));
}
function scanGroupTypedMemoryDocuments(groupId) {
    (0, typed_memory_shared_1.ensureGroupTypedMemoryArtifactReadConsistency)(groupId);
    const docs = scanGroupTypedMemoryDocumentsRaw(groupId);
    const ledger = (0, typed_memory_ledgers_1.readGroupTypedMemoryStaleCandidateLedger)(groupId);
    if (ledger.ledger_checksum_valid !== true)
        return [];
    const suppressed = new Set((ledger.resolution_events || [])
        .filter((event) => event.status === "applied" && ["update", "remove"].includes(String(event.action || "")))
        .map((event) => String(event.rel_path || "").toLowerCase())
        .filter(Boolean));
    return docs.filter(doc => !suppressed.has(String(doc.relPath || "").toLowerCase()));
}
function buildGroupTypedMemoryIndex(groupId) {
    const dir = (0, typed_memory_shared_1.ensureGroupTypedMemoryDir)(groupId);
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
            lines.push(`- [${(0, typed_memory_shared_1.markdownLinkTitle)(doc.name)}](${doc.relPath}) - ${(0, typed_memory_shared_1.compactText)(doc.description, 150)}`);
        lines.push("");
    }
    const content = lines.join("\n").trim() + "\n";
    const entrypointProjection = (0, typed_memory_shared_1.truncateGroupTypedMemoryEntrypointContent)(content);
    const file = path.join(dir, typed_memory_shared_1.GROUP_TYPED_MEMORY_ENTRYPOINT);
    const changed = (0, typed_memory_shared_1.writeTextAtomic)(file, content);
    return {
        file,
        dir,
        docs,
        changed,
        lineCount: content.trim().split("\n").length,
        bytes: Buffer.byteLength(content, "utf-8"),
        entrypointTruncation: {
            ...entrypointProjection,
            content: undefined,
        },
    };
}
function isClaudeMemoryTextInclude(file) {
    const ext = path.extname(String(file || "")).toLowerCase();
    return typed_memory_shared_1.CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS.has(ext);
}
function resolveClaudeMemoryIncludePath(baseFile, ref) {
    const cleaned = (0, typed_memory_shared_1.stripIncludePath)(ref);
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
            const cleaned = (0, typed_memory_shared_1.stripIncludePath)(ref);
            if (!cleaned || cleaned.startsWith("@") || /^[#%^&*()]+/.test(cleaned))
                return `${lead}@${ref}`;
            return `${lead}included:${cleaned}`;
        }));
    }
    return lines.join("\n");
}
function claudeMemoryIncludeRelPath(file, roots = []) {
    const resolved = path.resolve(file);
    const root = roots.find(item => item && (0, typed_memory_shared_1.isPathInside)(item, resolved));
    if (root) {
        const rel = path.relative(root, resolved).replace(/\\/g, "/");
        return rel || path.basename(resolved);
    }
    return `external/${(0, typed_memory_shared_1.checksum)(resolved, 10)}-${path.basename(resolved)}`;
}
function buildClaudeMemoryIncludeExpansion(sourceItems = [], options = {}) {
    const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || typed_memory_shared_1.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
    const groupId = String(options.groupId || options.group_id || "");
    const approvalLedger = options.externalIncludeApprovalLedger
        || options.external_include_approval_ledger
        || (groupId ? loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) : null);
    const approvedIncludeKeys = new Set((Array.isArray(approvalLedger?.approved) ? approvalLedger.approved : []).map((item) => String(item.key || "")).filter(Boolean));
    const baseKeys = new Set(sourceItems.map((item) => (0, typed_memory_shared_1.normalizeFileKey)(item.file || "")).filter(Boolean));
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
            detail: (0, typed_memory_shared_1.compactText)(issue.detail || "", 500),
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
        const refs = (0, typed_memory_shared_1.extractTypedMemoryIncludeRefs)(parentItem.body || "");
        for (const ref of refs) {
            const resolved = resolveClaudeMemoryIncludePath(parentFile, ref);
            if (!resolved)
                continue;
            const includeDepth = depth + 1;
            const key = (0, typed_memory_shared_1.normalizeFileKey)(resolved);
            const roots = rootsForItem(rootItem);
            const external = !roots.some(root => (0, typed_memory_shared_1.isPathInside)(root, resolved));
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
                const parsed = (0, typed_memory_shared_1.parseFrontmatter)(content);
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
                    description: parsed.meta.description || (0, typed_memory_shared_1.compactText)((parsed.body || content).split(/\n+/).find(Boolean) || "", 180),
                    paths: (0, typed_memory_shared_1.normalizePathGlobs)(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                    bytes: stat.size,
                    mtimeMs: stat.mtimeMs,
                    checksum: (0, typed_memory_shared_1.checksum)(content, 24),
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
        version: typed_memory_shared_1.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION,
        generatedAt: (0, typed_memory_shared_1.now)(),
        maxIncludeDepth,
        includedCount: files.length,
        skippedCount: issues.length,
        externalIncludeCount: pendingExternalIncludes.length + approvedExternalIncludes.length,
        externalIncludeApproval: {
            schema: "ccm-claude-memory-external-include-approval-v1",
            version: typed_memory_shared_1.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
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
function buildTypedMemoryLoadEntry(input) {
    const file = String(input.file || "");
    const stat = fs.statSync(file);
    const sourceContent = fs.readFileSync(file, "utf-8");
    const entrypointProjection = input.kind === "entrypoint"
        ? (0, typed_memory_shared_1.truncateGroupTypedMemoryEntrypointContent)(sourceContent)
        : null;
    const content = entrypointProjection?.content ?? sourceContent;
    const parsed = (0, typed_memory_shared_1.parseFrontmatter)(content);
    const type = input.kind === "entrypoint" ? "entrypoint" : (0, typed_memory_shared_1.normalizeMemoryType)(parsed.meta.type || input.type);
    const body = parsed.body || content;
    const includeRefs = (0, typed_memory_shared_1.extractTypedMemoryIncludeRefs)(body);
    const relPath = input.relPath || path.basename(file);
    const priority = input.kind === "entrypoint" ? 0 : (0, typed_memory_shared_1.groupTypedMemoryPriority)(type);
    const pathGlobs = (0, typed_memory_shared_1.normalizePathGlobs)(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || input.pathGlobs || []);
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
        pathCondition: input.pathCondition || (0, typed_memory_shared_1.evaluateTypedMemoryPathCondition)({ paths: pathGlobs }, input.targetPaths || []),
        priority,
        includeDepth: Number(input.depth || 0),
        parentRelPath: input.parentRelPath || "",
        loadReason: input.parentRelPath ? "include" : input.kind === "entrypoint" ? "entrypoint" : "typed_doc",
        includeRefs,
        mtimeMs: stat.mtimeMs,
        bytes: Buffer.byteLength(content, "utf-8"),
        sourceBytes: stat.size,
        sourceLineCount: sourceContent.trim() ? sourceContent.trim().split("\n").length : 0,
        checksum: (0, typed_memory_shared_1.checksum)(content, 24),
        sourceChecksum: (0, typed_memory_shared_1.checksum)(sourceContent, 24),
        estimatedTokens: Math.max(1, Math.ceil(Buffer.byteLength(content, "utf-8") / 4)),
        ...(entrypointProjection ? {
            entrypointTruncation: {
                ...entrypointProjection,
                content: undefined,
            },
        } : {}),
    };
}
function buildGroupTypedMemoryLoadPlan(groupId, options = {}) {
    return require("./group-memory-loading").buildGroupTypedMemoryLoadPlan(groupId, options);
}
function renderGroupTypedMemoryLoadPlan(plan) {
    return require("./group-memory-loading").renderGroupTypedMemoryLoadPlan(plan);
}
function normalizeDirectMemoryText(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}
function normalizeGroupDirectMemoryRequest(groupId, message, index = 0) {
    const raw = message?.memoryDirectAction || message?.memory_direct_action || null;
    if (!raw || typeof raw !== "object")
        return null;
    const action = String(raw.action || "").trim().toLowerCase();
    if (!["remember", "forget"].includes(action))
        return null;
    const messageId = (0, typed_memory_shared_1.messageIdentity)(message, index);
    const claimedScopeId = (0, typed_memory_shared_1.compactText)(raw.scopeId || raw.scope_id || "", 180);
    const content = (0, typed_memory_shared_1.compactText)(raw.content || raw.text || raw.query || (0, typed_memory_shared_1.messageContent)(message), 1800);
    const memoryType = (0, typed_memory_shared_1.normalizeMemoryType)(raw.memoryType || raw.memory_type || raw.type || "user");
    const targetMemoryId = (0, typed_memory_shared_1.compactText)(raw.targetMemoryId || raw.target_memory_id || raw.memoryId || raw.memory_id || "", 180);
    const requestId = (0, typed_memory_shared_1.compactText)(raw.requestId || raw.request_id || `gmdr_${(0, typed_memory_shared_1.checksum)([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
    const expectedChecksum = (0, typed_memory_shared_1.checksum)([typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
    const claimedChecksum = String(raw.requestChecksum || raw.request_checksum || "").trim().toLowerCase();
    return {
        schema: "ccm-group-direct-memory-request-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
        requestId,
        action,
        groupId,
        claimedScopeId,
        scopeMatches: !!claimedScopeId && claimedScopeId === groupId,
        sourceRole: String(message?.role || ""),
        messageId,
        sourceIndex: Number(message?.__typedMemorySourceIndex ?? index),
        content,
        normalizedContent: normalizeDirectMemoryText(content),
        memoryType,
        targetMemoryId,
        expectedChecksum,
        claimedChecksum,
        checksumMatches: !!claimedChecksum && claimedChecksum === expectedChecksum,
        requestedAt: String(message?.timestamp || message?.created_at || ""),
    };
}
function directMemoryFactIdentity(groupId, type, text) {
    const textChecksum = (0, typed_memory_shared_1.checksum)(normalizeDirectMemoryText(text), 64);
    return {
        factKey: (0, typed_memory_shared_1.checksum)(["direct-memory", groupId, type, textChecksum], 24),
        memoryId: `gmem_${(0, typed_memory_shared_1.checksum)([groupId, type, textChecksum], 28)}`,
        textChecksum,
    };
}
function directMemoryFactRows(facts = {}) {
    const rows = [];
    for (const type of ["user", "project", "feedback", "reference"]) {
        for (const [factKey, fact] of Object.entries(facts?.[type] || {})) {
            const derived = directMemoryFactIdentity(String(fact?.groupId || "legacy"), type, String(fact?.text || ""));
            const identity = {
                factKey,
                memoryId: String(fact?.memoryId || derived.memoryId),
                textChecksum: String(fact?.textChecksum || derived.textChecksum),
            };
            rows.push({ type, factKey, fact, ...identity });
        }
    }
    return rows;
}
// ===== merged from typed-memory-index-build-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function applyGroupDirectMemoryRequests(groupId, factsInput, requests = [], previous = {}, updatedAt = (0, typed_memory_shared_1.now)()) {
    const facts = {};
    for (const type of ["user", "project", "feedback", "reference"]) {
        facts[type] = { ...(factsInput?.[type] || {}) };
    }
    const receipts = new Map();
    for (const row of Array.isArray(previous?.receipts) ? previous.receipts : []) {
        if (row?.requestId)
            receipts.set(String(row.requestId), row);
    }
    const tombstones = new Map();
    for (const row of Array.isArray(previous?.tombstones) ? previous.tombstones : []) {
        if (row?.tombstoneId)
            tombstones.set(String(row.tombstoneId), row);
    }
    let rememberedThisRun = 0;
    let forgottenThisRun = 0;
    let duplicateThisRun = 0;
    let rejectedThisRun = 0;
    for (const request of [...requests].sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
        if (receipts.has(request.requestId)) {
            duplicateThisRun += 1;
            continue;
        }
        const base = {
            schema: "ccm-group-direct-memory-receipt-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
            requestId: request.requestId,
            action: request.action,
            groupId,
            messageId: request.messageId,
            sourceIndex: request.sourceIndex,
            requestChecksum: request.expectedChecksum,
            committedAt: updatedAt,
        };
        const reject = (reason, candidates = []) => {
            rejectedThisRun += 1;
            receipts.set(request.requestId, {
                ...base,
                status: "rejected",
                reason,
                candidateCount: candidates.length,
                candidates: candidates.slice(0, 12).map(row => ({
                    memoryId: row.memoryId,
                    type: row.type,
                    messageId: String(row.fact?.messageId || ""),
                    text: (0, typed_memory_shared_1.compactText)(row.fact?.text || "", 240),
                })),
            });
        };
        if (request.sourceRole !== "user") {
            reject("direct_memory_requires_user_message");
            continue;
        }
        if (!request.scopeMatches) {
            reject("direct_memory_scope_mismatch");
            continue;
        }
        if (!request.checksumMatches) {
            reject("direct_memory_request_checksum_mismatch");
            continue;
        }
        if (!request.content) {
            reject("direct_memory_content_required");
            continue;
        }
        if (request.action === "remember") {
            const identity = directMemoryFactIdentity(groupId, request.memoryType, request.content);
            const bucket = facts[request.memoryType] || {};
            const existing = bucket[identity.factKey];
            for (const [key, tombstone] of tombstones.entries()) {
                if (String(tombstone?.textChecksum || "") === identity.textChecksum)
                    tombstones.delete(key);
            }
            bucket[identity.factKey] = {
                id: identity.factKey,
                category: request.memoryType,
                type: "explicit_remember",
                groupId,
                memoryId: identity.memoryId,
                textChecksum: identity.textChecksum,
                messageId: request.messageId,
                sourceIndex: request.sourceIndex,
                actor: "用户 -> coordinator",
                sourceRole: "user",
                timestamp: request.requestedAt,
                text: request.content,
                checksum: identity.factKey,
                firstSeenAt: existing?.firstSeenAt || updatedAt,
                lastSeenAt: updatedAt,
                count: 1,
                directMemory: { requestId: request.requestId, requestChecksum: request.expectedChecksum },
                admission: {
                    admitted: true,
                    reason: "explicit_user_remember",
                    hardExclusion: false,
                    durable: true,
                    nonObvious: true,
                    hasRationale: true,
                    confidence: 1,
                    why: "The user explicitly requested this current group-session memory.",
                    howToApply: "Apply only inside this group session unless the user explicitly forgets or supersedes it.",
                },
            };
            facts[request.memoryType] = bucket;
            if (existing)
                duplicateThisRun += 1;
            else
                rememberedThisRun += 1;
            receipts.set(request.requestId, {
                ...base,
                status: existing ? "duplicate" : "committed",
                reason: existing ? "same_scoped_memory_already_exists" : "explicit_memory_committed",
                memoryId: identity.memoryId,
                memoryType: request.memoryType,
                textChecksum: identity.textChecksum,
            });
            continue;
        }
        const allRows = directMemoryFactRows(facts).map(row => {
            if (row.fact?.memoryId && row.fact?.textChecksum)
                return row;
            const derived = directMemoryFactIdentity(groupId, row.type, String(row.fact?.text || ""));
            return { ...row, memoryId: derived.memoryId, textChecksum: derived.textChecksum };
        });
        const target = normalizeDirectMemoryText(request.targetMemoryId || request.content);
        let matches = allRows.filter(row => [row.memoryId, row.factKey, row.fact?.id, row.fact?.checksum, row.fact?.messageId]
            .some(value => normalizeDirectMemoryText(value) === target));
        if (!matches.length) {
            matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text) === target);
        }
        if (!matches.length && target.length >= 8) {
            matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text).includes(target));
        }
        if (matches.length !== 1) {
            reject(matches.length ? "forget_target_ambiguous" : "forget_target_not_found", matches);
            continue;
        }
        const matched = matches[0];
        delete facts[matched.type][matched.factKey];
        const tombstoneId = `gmt_${(0, typed_memory_shared_1.checksum)([groupId, matched.memoryId, matched.factKey, request.requestId], 28)}`;
        tombstones.set(tombstoneId, {
            schema: "ccm-group-direct-memory-tombstone-v1",
            tombstoneId,
            groupId,
            memoryId: matched.memoryId,
            factKey: matched.factKey,
            textChecksum: matched.textChecksum || (0, typed_memory_shared_1.checksum)(normalizeDirectMemoryText(matched.fact?.text), 64),
            sourceMessageId: String(matched.fact?.messageId || ""),
            forgetMessageId: request.messageId,
            requestId: request.requestId,
            forgottenAt: updatedAt,
        });
        forgottenThisRun += 1;
        receipts.set(request.requestId, {
            ...base,
            status: "committed",
            reason: "explicit_memory_forgotten",
            memoryId: matched.memoryId,
            memoryType: matched.type,
            textChecksum: matched.textChecksum,
        });
    }
    const boundedReceipts = [...receipts.values()]
        .sort((a, b) => String(a.committedAt || "").localeCompare(String(b.committedAt || "")))
        .slice(-500);
    const boundedTombstones = [...tombstones.values()]
        .sort((a, b) => String(a.forgottenAt || "").localeCompare(String(b.forgottenAt || "")))
        .slice(-500);
    return {
        facts,
        ledger: {
            schema: "ccm-group-direct-memory-ledger-v1",
            version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
            groupId,
            evaluatedThisRun: requests.length,
            rememberedThisRun,
            forgottenThisRun,
            duplicateThisRun,
            rejectedThisRun,
            activeDirectMemoryCount: directMemoryFactRows(facts).filter(row => row.fact?.directMemory?.requestId).length,
            receiptCount: boundedReceipts.length,
            tombstoneCount: boundedTombstones.length,
            receipts: boundedReceipts,
            tombstones: boundedTombstones,
            updatedAt,
        },
    };
}
function filterFactsByDirectMemoryTombstones(facts, directMemory) {
    const blockedTextChecksums = new Set((Array.isArray(directMemory?.tombstones) ? directMemory.tombstones : [])
        .map((row) => String(row?.textChecksum || ""))
        .filter(Boolean));
    if (!blockedTextChecksums.size)
        return { facts, suppressedCount: 0 };
    const next = {};
    let suppressedCount = 0;
    for (const type of ["user", "project", "feedback", "reference"]) {
        next[type] = {};
        for (const [key, fact] of Object.entries(facts?.[type] || {})) {
            const textChecksum = String(fact?.textChecksum || (0, typed_memory_shared_1.checksum)(normalizeDirectMemoryText(fact?.text), 64));
            if (blockedTextChecksums.has(textChecksum)) {
                suppressedCount += 1;
                continue;
            }
            next[type][key] = fact;
        }
    }
    return { facts: next, suppressedCount };
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId) {
    return require("./group-memory-loading").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
}
function conflictResolutionColdArchiveManifestChecksum(manifest = {}) {
    return require("./group-memory-loading").conflictResolutionColdArchiveManifestChecksum(manifest);
}
function getConflictResolutionColdArchiveManifestGenerationsDir(groupId) {
    return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
}
function getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum) {
    return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum);
}
function readConflictResolutionColdArchiveManifest(groupId) {
    return require("./group-memory-loading").readConflictResolutionColdArchiveManifest(groupId);
}
function readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest = {}) {
    return require("./group-memory-loading").readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest);
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options = {}) {
    return require("./group-memory-loading").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options);
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options = {}) {
    return require("./group-memory-loading").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options);
}
function buildGroupDirectMemoryAction(groupId, input = {}) {
    const action = String(input.action || "").trim().toLowerCase();
    if (!["remember", "forget"].includes(action))
        throw new Error("unsupported_direct_memory_action");
    const messageId = (0, typed_memory_shared_1.compactText)(input.messageId || input.message_id || "", 180);
    if (!messageId)
        throw new Error("direct_memory_message_id_required");
    const content = (0, typed_memory_shared_1.compactText)(input.content || input.text || input.query || "", 1800);
    if (!content)
        throw new Error("direct_memory_content_required");
    const memoryType = (0, typed_memory_shared_1.normalizeMemoryType)(input.memoryType || input.memory_type || input.type || "user");
    const targetMemoryId = (0, typed_memory_shared_1.compactText)(input.targetMemoryId || input.target_memory_id || input.memoryId || input.memory_id || "", 180);
    const requestId = (0, typed_memory_shared_1.compactText)(input.requestId || input.request_id || `gmdr_${(0, typed_memory_shared_1.checksum)([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
    const requestChecksum = (0, typed_memory_shared_1.checksum)([typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
    return {
        schema: "ccm-group-direct-memory-action-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
        requestId,
        action,
        scopeId: groupId,
        content,
        memoryType,
        targetMemoryId,
        requestChecksum,
    };
}
function commitGroupDirectMemoryAction(groupId, messages = [], input = {}) {
    const requestId = String(input.requestId || input.request_id || "").trim();
    if (!requestId)
        throw new Error("direct_memory_request_id_required");
    const distillation = (0, typed_memory_distillation_receipts_1.distillGroupMessagesToTypedMemoryUntilCaughtUp)(groupId, messages, {}, {
        reason: String(input.reason || "direct-group-memory-action"),
        maxCatchUpBatches: Number(input.maxCatchUpBatches || input.max_catch_up_batches || 32),
    });
    const ledger = (0, typed_memory_distillation_receipts_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const receipt = (Array.isArray(ledger.directMemory?.receipts) ? ledger.directMemory.receipts : [])
        .find((row) => String(row?.requestId || "") === requestId) || null;
    return {
        schema: "ccm-group-direct-memory-commit-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
        groupId,
        requestId,
        committed: receipt?.status === "committed" || receipt?.status === "duplicate",
        receipt,
        directMemory: ledger.directMemory || null,
        distillation,
        index: buildGroupTypedMemoryIndex(groupId),
    };
}
function syncGroupTypedMemoryFromGroupMemory(groupId, memory = {}) {
    const updatedAt = (0, typed_memory_shared_1.now)();
    const goal = memory?.goal || memory?.summary || "";
    const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
    const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
    const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
    const confirmedFeedback = [
        ...(Array.isArray(memory?.feedback) ? memory.feedback : []),
        ...(Array.isArray(memory?.confirmedCorrections) ? memory.confirmedCorrections : []),
    ];
    const writes = [];
    const userBody = [
        "# User Requirements",
        goal ? `## Current Goal\n${(0, typed_memory_shared_1.compactText)(goal, 1200)}` : "",
        (0, typed_memory_shared_1.listLines)("Persistent Requirements", requirements, (item) => `#${item.messageId || item.id || ""} ${item.text || item}`, 24),
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
        goal ? `## Goal\n${(0, typed_memory_shared_1.compactText)(goal, 1200)}` : "",
        (0, typed_memory_shared_1.listLines)("Decisions", decisions, (item) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 16),
        (0, typed_memory_shared_1.listLines)("Next Actions", memory?.nextActions || [], (item) => item.action || item, 10),
        memory?.messageDigest ? `## Conversation Summary\n${(0, typed_memory_shared_1.compactText)(memory.messageDigest, 3000)}` : "",
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
        "# Confirmed Feedback And Corrections",
        (0, typed_memory_shared_1.listLines)("Reusable Corrections", confirmedFeedback, (item) => `${item.text || item.content || item.correction || item}`, 24),
    ].filter(Boolean).join("\n\n");
    if (confirmedFeedback.length)
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "confirmed-feedback",
            name: "Confirmed feedback and corrections",
            description: "Accepted reusable corrections and lessons. Raw failures and temporary worker status stay in task replay.",
            source: "auto:group-memory-json",
            updatedAt,
            body: feedbackBody,
        }));
    const referenceBody = [
        "# Stable Reference Anchors",
        (0, typed_memory_shared_1.listLines)("Fact Anchors", facts, (item) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
    ].filter(Boolean).join("\n\n");
    if (facts.length)
        writes.push(upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "reference-artifacts",
            name: "Stable reference anchors",
            description: "Non-derivable references and stable evidence anchors. Skills, MCP definitions, files and temporary verification remain dynamic session context.",
            source: "auto:group-memory-json",
            updatedAt,
            body: referenceBody,
        }));
    const index = buildGroupTypedMemoryIndex(groupId);
    return { schema: "ccm-group-typed-memory-sync-v1", version: typed_memory_shared_1.GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}
function groupTypedMemoryManifestSelectionChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.decisionFile;
    delete payload.recallShapeTelemetry;
    delete payload.recallShapeTelemetryFile;
    delete payload.recallShapeTelemetryError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function groupTypedMemoryManifestSelectorCalibrationChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function getGroupTypedMemoryManifestSelectorDecisionDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorDecisionDir(scopeId);
}
function getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
}
function getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId) {
    return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
}
function groupTypedMemoryManifestSelectorOutcomeChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.outcomeFile;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId = "", selection = null) {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId, selection);
}
function recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input = {}) {
    return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input);
}
function groupTypedMemoryManifestSelectorConsumptionChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.checksum;
    delete payload.consumptionFile;
    delete payload.valid;
    delete payload.idempotent;
    delete payload.trendContribution;
    delete payload.trendContributionError;
    return (0, typed_memory_shared_1.checksum)(JSON.stringify(payload), 64);
}
function readGroupTypedMemoryManifestSelectorChain(scopeId, requestId) {
    const decisionFile = path.join(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId), `${(0, typed_memory_shared_1.safeSegment)(requestId)}.json`);
    const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
    const attachedFile = path.join(outcomeDir, `${(0, typed_memory_shared_1.safeSegment)(requestId)}.attached.json`);
    const committedFile = path.join(outcomeDir, `${(0, typed_memory_shared_1.safeSegment)(requestId)}.committed.json`);
    let selection = null;
    let attached = null;
    let committed = null;
    try {
        selection = JSON.parse(fs.readFileSync(decisionFile, "utf-8"));
    }
    catch { }
    try {
        attached = JSON.parse(fs.readFileSync(attachedFile, "utf-8"));
    }
    catch { }
    try {
        committed = JSON.parse(fs.readFileSync(committedFile, "utf-8"));
    }
    catch { }
    const selectionValid = verifyGroupTypedMemoryManifestSelection(selection, scopeId).valid === true;
    const attachedValid = selectionValid && verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeId, selection).valid === true && attached.stage === "attached";
    const committedValid = attachedValid
        && verifyGroupTypedMemoryManifestSelectorOutcome(committed, scopeId, selection).valid === true
        && committed.stage === "committed"
        && String(committed.attachedOutcomeChecksum || "") === String(attached.checksum || "")
        && String(committed.capsuleChecksum || "") === String(attached.capsuleChecksum || "");
    return {
        valid: committedValid,
        selection,
        attached,
        committed,
        files: { decisionFile, attachedFile, committedFile },
    };
}
function verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId = "", committedOutcome = null) {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId, committedOutcome);
}
function recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input = {}) {
    return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input);
}
function summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options);
}
function verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId = "", expectedQueryChecksum = "") {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId, expectedQueryChecksum);
}
function buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options = {}) {
    return require("./group-memory-loading").buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options);
}
function groupTypedMemoryManifestSelectorAgeStats(candidates, nowMs) {
    const ages = candidates.map((candidate) => {
        const mtimeMs = Number(candidate?.mtimeMs || 0);
        return mtimeMs > 0 ? Math.max(0, (nowMs - mtimeMs) / 86_400_000) : 0;
    });
    if (!ages.length)
        return { newest: -1, oldest: -1, average: -1 };
    return {
        newest: Number(Math.min(...ages).toFixed(6)),
        oldest: Number(Math.max(...ages).toFixed(6)),
        average: Number((ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(6)),
    };
}
function recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision) {
    const dir = path.resolve(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.resolve(dir, `${(0, typed_memory_shared_1.safeSegment)(decision.requestId, `ms-${(0, typed_memory_shared_1.checksum)(decision, 16)}`)}.json`);
    if (path.dirname(file).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_manifest_selector_decision_path_invalid");
    (0, typed_memory_shared_1.writeTextAtomicRaw)(file, JSON.stringify(decision, null, 2));
    try {
        const files = fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".json"))
            .map(name => ({ name, file: path.resolve(dir, name), mtimeMs: fs.statSync(path.resolve(dir, name)).mtimeMs }))
            .filter(item => path.dirname(item.file).toLowerCase() === dir.toLowerCase())
            .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
        for (const item of files.slice(200)) {
            try {
                fs.unlinkSync(item.file);
            }
            catch { }
            const requestId = item.name.replace(/\.json$/i, "");
            const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
            for (const stage of ["attached", "committed"]) {
                try {
                    fs.unlinkSync(path.join(outcomeDir, `${requestId}.${stage}.json`));
                }
                catch { }
            }
            const consumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
            try {
                for (const name of fs.readdirSync(consumptionDir).filter(name => name.startsWith(`${requestId}.`) && name.endsWith(".json"))) {
                    try {
                        fs.unlinkSync(path.join(consumptionDir, name));
                    }
                    catch { }
                }
            }
            catch { }
            try {
                fs.unlinkSync(path.join((0, typed_memory_shape_trend_1.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId), `${requestId}.json`));
            }
            catch { }
        }
    }
    catch { }
    return file;
}
function verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId = "") {
    return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId);
}
function configureGroupTypedMemoryManifestSelector(executor) {
    return require("./group-memory-loading").configureGroupTypedMemoryManifestSelector(executor);
}
function buildGroupTypedMemoryManifest(scopeId, query, options = {}) {
    return require("./group-memory-loading").buildGroupTypedMemoryManifest(scopeId, query, options);
}
function parseGroupTypedMemoryManifestSelectorOutput(value) {
    if (Array.isArray(value?.selected_memories))
        return value.selected_memories;
    if (Array.isArray(value?.selectedMemories))
        return value.selectedMemories;
    const raw = String(value?.output ?? value?.text ?? value?.content ?? value ?? "").trim();
    if (!raw)
        return [];
    const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const candidates = [fenced, fenced.match(/\{[\s\S]*\}/)?.[0] || ""].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed?.selected_memories))
                return parsed.selected_memories;
            if (Array.isArray(parsed?.selectedMemories))
                return parsed.selectedMemories;
        }
        catch { }
    }
    throw new Error("manifest_selector_output_json_invalid");
}
function finalizeGroupTypedMemoryManifestSelection(scopeId, input, options = {}) {
    const core = {
        schema: "ccm-group-typed-memory-manifest-selection-v1",
        version: typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
        scopeId,
        requestId: String(input.requestId || `ms_${(0, typed_memory_shared_1.checksum)([scopeId, Date.now(), crypto.randomBytes(8).toString("hex")], 24)}`),
        status: String(input.status || "empty"),
        reason: String(input.reason || ""),
        selectorRan: input.selectorRan === true,
        shapeTelemetryExpected: input.shapeTelemetryExpected === true,
        queryChecksum: String(input.queryChecksum || ""),
        manifestChecksum: String(input.manifestChecksum || ""),
        candidateCount: Number(input.candidateCount || 0),
        selectedRelPaths: (0, typed_memory_shared_1.uniqueStrings)((input.selectedRelPaths || []).map(String), typed_memory_shared_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION),
        unknownFilenames: (0, typed_memory_shared_1.uniqueStrings)((input.unknownFilenames || []).map(String), 20),
        invalidFilenameCount: Number(input.invalidFilenameCount || 0),
        recentTools: (0, typed_memory_shared_1.uniqueStrings)((input.recentTools || []).map(String), 20),
        filterCounts: input.filterCounts || {},
        calibration: input.calibration || null,
        calibrationChecksum: String(input.calibrationChecksum || input.calibration?.checksum || ""),
        calibrationHintCount: Number(input.calibrationHintCount ?? input.calibration?.hintCount ?? 0),
        calibrationEvidenceCount: Number(input.calibrationEvidenceCount ?? input.calibration?.evidenceCount ?? 0),
        selectorProject: String(input.selectorProject || ""),
        selectorAgentType: String(input.selectorAgentType || ""),
        selectorModel: String(input.selectorModel || ""),
        startedAt: String(input.startedAt || ""),
        completedAt: String(input.completedAt || (0, typed_memory_shared_1.now)()),
    };
    const decision = { ...core, checksum: groupTypedMemoryManifestSelectionChecksum(core) };
    if (options.recordDecision !== false && (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        try {
            decision.decisionFile = recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision);
        }
        catch (error) {
            decision.recordError = (0, typed_memory_shared_1.compactText)(error?.message || error, 240);
        }
    }
    return decision;
}
async function selectGroupTypedMemoryManifest(scopeId, query, options = {}) {
    return require("./group-memory-loading").selectGroupTypedMemoryManifest(scopeId, query, options);
}
function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options);
}
function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options = {}) {
    return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options);
}
//# sourceMappingURL=typed-memory-index-build.js.map