"use strict";
// Behavior-freeze split from typed-memory-index-build.ts (part 1/2).
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
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
const typed_memory_shape_trend_1 = require("./typed-memory-shape-trend");
const typed_memory_shared_1 = require("./typed-memory-shared");
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
//# sourceMappingURL=typed-memory-index-build-part-01.js.map