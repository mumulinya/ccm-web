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
exports.inspectGroupSessionMemoryModelExtractionArtifactRetention = inspectGroupSessionMemoryModelExtractionArtifactRetention;
exports.runGroupSessionMemoryModelExtractionArtifactRetention = runGroupSessionMemoryModelExtractionArtifactRetention;
exports.runAutomaticExtractionArtifactRetention = runAutomaticExtractionArtifactRetention;
exports.getGroupSessionMemoryTypedMemoryRetryFile = getGroupSessionMemoryTypedMemoryRetryFile;
exports.readGroupSessionMemoryTypedMemoryRetryState = readGroupSessionMemoryTypedMemoryRetryState;
exports.scheduleGroupSessionMemoryTypedMemoryRetry = scheduleGroupSessionMemoryTypedMemoryRetry;
exports.persistFailedGroupSessionModelExtractionTypedMemoryCommit = persistFailedGroupSessionModelExtractionTypedMemoryCommit;
exports.retryGroupSessionModelExtractionTypedMemory = retryGroupSessionModelExtractionTypedMemory;
exports.recoverPendingGroupSessionMemoryTypedMemoryRetries = recoverPendingGroupSessionMemoryTypedMemoryRetries;
exports.validateGroupSessionMemoryModelOutput = validateGroupSessionMemoryModelOutput;
exports.verifyGroupSessionMemoryFactSupersessionGraph = verifyGroupSessionMemoryFactSupersessionGraph;
exports.analyzeGroupSessionMemoryModelMergeQuality = analyzeGroupSessionMemoryModelMergeQuality;
exports.replayGroupSessionMemoryModelExtraction = replayGroupSessionMemoryModelExtraction;
exports.resolveGroupSessionMemoryReplayCurrentNotes = resolveGroupSessionMemoryReplayCurrentNotes;
exports.recoverPendingGroupSessionMemoryModelExtractions = recoverPendingGroupSessionMemoryModelExtractions;
exports.configureGroupSessionMemoryModelExecutor = configureGroupSessionMemoryModelExecutor;
// Behavior-freeze split from group-session-memory-model-extraction.ts (part 2/3).
const group_session_memory_model_extraction_part_01_1 = require("./group-session-memory-model-extraction-part-01");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const memory_1 = require("./memory");
const group_session_memory_extraction_1 = require("./group-session-memory-extraction");
const group_memory_index_1 = require("./group-memory-index");
const group_session_memory_customization_1 = require("./group-session-memory-customization");
const group_session_memory_model_extraction_part_01_2 = require("./group-session-memory-model-extraction-part-01");
const group_session_memory_model_extraction_part_03_1 = require("./group-session-memory-model-extraction-part-03");
function buildExtractionArtifactRetentionPlan(scopeId, options = {}) {
    const policy = (0, group_session_memory_model_extraction_part_01_2.resolveExtractionArtifactRetentionPolicy)(options);
    const nowMs = Date.parse(String(options.at || "")) || Date.now();
    const history = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionHistory)(scopeId, { maxRows: 100_000 });
    const hotArtifacts = (0, group_session_memory_model_extraction_part_01_2.listHotExtractionArtifacts)(scopeId);
    const byExecution = new Map();
    for (const event of history.rows || []) {
        const executionId = String(event?.executionId || "");
        if (!executionId)
            continue;
        const row = byExecution.get(executionId) || { executionId, events: [], sequence: 0, atMs: 0, status: "" };
        row.events.push(event);
        row.sequence = Math.max(row.sequence, Number(event.sequence || 0));
        row.atMs = Math.max(row.atMs, Date.parse(String(event.completedAt || event.failedAt || event.at || event.startedAt || "")) || 0);
        row.status = String(event.status || row.status || "");
        byExecution.set(executionId, row);
    }
    for (const artifact of hotArtifacts) {
        const row = byExecution.get(artifact.executionId) || {
            executionId: artifact.executionId,
            events: [],
            sequence: 0,
            atMs: artifact.modifiedAtMs,
            status: "untracked",
        };
        row.atMs = Math.max(row.atMs, artifact.modifiedAtMs);
        row.artifacts = [...(row.artifacts || []), artifact];
        byExecution.set(artifact.executionId, row);
    }
    const executions = [...byExecution.values()].filter(row => Array.isArray(row.artifacts) && row.artifacts.length > 0);
    const activeIds = new Set();
    for (const row of executions) {
        const statuses = new Set(row.events.map((event) => String(event.status || "")));
        const lastStatus = String(row.events[row.events.length - 1]?.status || row.status || "");
        row.status = lastStatus;
        row.terminal = ["committed", "failed", "deferred"].includes(lastStatus);
        if (statuses.has("attempt_started") && !["committed", "failed", "deferred"].includes(lastStatus))
            activeIds.add(row.executionId);
    }
    const terminal = executions.filter(row => row.terminal).sort((a, b) => a.sequence - b.sequence || a.atMs - b.atMs || a.executionId.localeCompare(b.executionId));
    const protectedIds = (0, group_session_memory_model_extraction_part_01_2.readCurrentExtractionReceiptExecutionIds)(scopeId);
    for (const id of activeIds)
        protectedIds.add(id);
    const latestCommitted = [...terminal].reverse().find(row => row.status === "committed");
    const latestFailed = [...terminal].reverse().find(row => row.status === "failed");
    if (latestCommitted)
        protectedIds.add(latestCommitted.executionId);
    if (latestFailed)
        protectedIds.add(latestFailed.executionId);
    const newestIds = new Set(terminal.slice(-policy.hotExecutionLimit).map(row => row.executionId));
    const cutoffMs = nowMs - policy.maxAgeDays * 24 * 60 * 60_000;
    const candidateReasons = new Map();
    const addCandidate = (row, reason) => {
        if (protectedIds.has(row.executionId) || activeIds.has(row.executionId) || row.status === "untracked")
            return;
        const reasons = candidateReasons.get(row.executionId) || new Set();
        reasons.add(reason);
        candidateReasons.set(row.executionId, reasons);
    };
    for (const row of terminal) {
        if (!newestIds.has(row.executionId))
            addCandidate(row, "execution_count");
        if (row.atMs > 0 && row.atMs < cutoffMs)
            addCandidate(row, "age");
    }
    const hotBytes = hotArtifacts.reduce((sum, row) => sum + Number(row.bytes || 0), 0);
    let projectedHotBytes = hotBytes;
    for (const row of terminal) {
        if (!candidateReasons.has(row.executionId))
            continue;
        projectedHotBytes -= (row.artifacts || []).reduce((sum, artifact) => sum + Number(artifact.bytes || 0), 0);
    }
    if (projectedHotBytes > policy.maxHotBytes) {
        for (const row of terminal) {
            if (projectedHotBytes <= policy.maxHotBytes)
                break;
            if (protectedIds.has(row.executionId) || activeIds.has(row.executionId))
                continue;
            if (!candidateReasons.has(row.executionId)) {
                addCandidate(row, "byte_capacity");
                if (candidateReasons.has(row.executionId)) {
                    projectedHotBytes -= (row.artifacts || []).reduce((sum, artifact) => sum + Number(artifact.bytes || 0), 0);
                }
            }
        }
    }
    const candidates = terminal.filter(row => candidateReasons.has(row.executionId)).map(row => ({
        executionId: row.executionId,
        status: row.status,
        terminalAt: row.atMs ? new Date(row.atMs).toISOString() : "",
        sequence: row.sequence,
        reasons: [...(candidateReasons.get(row.executionId) || [])],
        artifactCount: row.artifacts.length,
        bytes: row.artifacts.reduce((sum, artifact) => sum + Number(artifact.bytes || 0), 0),
        artifacts: row.artifacts,
    }));
    const candidateBytes = candidates.reduce((sum, row) => sum + row.bytes, 0);
    const untracked = executions.filter(row => row.status === "untracked");
    return {
        schema: "ccm-group-session-memory-model-extraction-artifact-retention-plan-v1",
        version: 1,
        scopeId,
        policy,
        generatedAt: new Date(nowMs).toISOString(),
        historyIntegrityValid: history.integrityValid === true,
        historyEventCount: history.totalCount,
        hotArtifactCount: hotArtifacts.length,
        hotExecutionCount: executions.length,
        hotBytes,
        projectedHotArtifactCount: Math.max(0, hotArtifacts.length - candidates.reduce((sum, row) => sum + row.artifactCount, 0)),
        projectedHotExecutionCount: Math.max(0, executions.length - candidates.length),
        projectedHotBytes: Math.max(0, hotBytes - candidateBytes),
        candidateExecutionCount: candidates.length,
        candidateArtifactCount: candidates.reduce((sum, row) => sum + row.artifactCount, 0),
        candidateBytes,
        protectedExecutionIds: [...protectedIds].sort(),
        activeExecutionIds: [...activeIds].sort(),
        untrackedArtifactExecutionIds: untracked.map(row => row.executionId).sort(),
        candidates,
    };
}
function inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeId, options = {}) {
    const plan = buildExtractionArtifactRetentionPlan(scopeId, options);
    const retention = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifactRetentionManifest)(scopeId, { verifyArtifacts: true });
    const capacityExceeded = plan.projectedHotBytes > plan.policy.maxHotBytes;
    const status = retention.valid !== true || plan.historyIntegrityValid !== true
        ? "fail"
        : capacityExceeded || plan.untrackedArtifactExecutionIds.length > 0 || plan.candidateExecutionCount > 0
            ? "warn"
            : plan.hotArtifactCount || retention.archivedArtifactCount ? "ok" : "empty";
    return {
        ...plan,
        schema: "ccm-group-session-memory-model-extraction-artifact-retention-inspection-v1",
        version: 1,
        scopeId,
        status,
        capacityExceeded,
        manifest: {
            file: retention.file,
            present: retention.present,
            valid: retention.valid,
            checksumValid: retention.checksumValid,
            bindingValid: retention.bindingValid,
            entriesValid: retention.entriesValid,
            artifactsValid: retention.artifactsValid,
            invalidArtifactCount: Number(retention.invalidArtifactCount || 0),
            generation: Number(retention.manifest?.generation || 0),
        },
        archivedArtifactCount: Number(retention.archivedArtifactCount || 0),
        archivedExecutionCount: Number(retention.archivedExecutionCount || 0),
        archivedBytes: Number(retention.archivedBytes || 0),
    };
}
function runGroupSessionMemoryModelExtractionArtifactRetention(scopeId, options = {}) {
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const cleanScopeId = String(scopeId || "").trim();
    if (!/^[A-Za-z0-9._-]{1,180}--gcs_[A-Za-z0-9._-]{1,180}$/.test(cleanScopeId)
        || cleanScopeId.includes(".."))
        throw new Error("independent_group_session_memory_scope_required");
    scopeId = cleanScopeId;
    return (0, group_session_memory_model_extraction_part_01_2.withArtifactRetentionLock)(scopeId, () => {
        const before = inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeId, options);
        if (before.historyIntegrityValid !== true)
            throw new Error(`session_memory_model_history_integrity_invalid:${scopeId}`);
        if (before.manifest.valid !== true)
            throw new Error(`session_memory_model_artifact_retention_integrity_invalid:${scopeId}`);
        if (dryRun)
            return { ...before, schema: "ccm-group-session-memory-model-extraction-artifact-retention-result-v1", dryRun: true, archivedThisRun: 0 };
        const priorState = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifactRetentionManifest)(scopeId, { verifyArtifacts: true });
        const entriesByKey = new Map((priorState.entries || []).map((entry) => [`${entry.executionId}:${entry.kind}`, entry]));
        const archivedAt = String(options.at || new Date().toISOString());
        const staged = [];
        for (const candidate of before.candidates || []) {
            for (const artifactRow of candidate.artifacts || []) {
                const kind = String(artifactRow.kind || "");
                const sourceFile = String(artifactRow.file || "");
                const checked = (0, group_session_memory_model_extraction_part_01_2.readExtractionArtifactFile)(sourceFile, scopeId, candidate.executionId, kind);
                if (checked.valid !== true)
                    throw new Error(`session_memory_model_hot_artifact_invalid:${candidate.executionId}:${kind}`);
                const archiveFile = (0, group_session_memory_model_extraction_part_01_2.extractionArtifactArchiveFile)(scopeId, candidate.executionId, kind);
                const compressed = fs.readFileSync(sourceFile);
                if (fs.existsSync(archiveFile)) {
                    const existing = fs.readFileSync(archiveFile);
                    if ((0, group_session_memory_model_extraction_part_01_2.fileChecksum)(existing) !== (0, group_session_memory_model_extraction_part_01_2.fileChecksum)(compressed)) {
                        throw new Error(`session_memory_model_archive_collision:${candidate.executionId}:${kind}`);
                    }
                }
                else {
                    (0, group_session_memory_model_extraction_part_01_2.writeBufferAtomic)(archiveFile, compressed);
                }
                const archived = (0, group_session_memory_model_extraction_part_01_2.readExtractionArtifactFile)(archiveFile, scopeId, candidate.executionId, kind);
                if (archived.valid !== true
                    || archived.compressedChecksum !== checked.compressedChecksum
                    || String(archived.artifact?.checksum || "") !== String(checked.artifact?.checksum || "")) {
                    throw new Error(`session_memory_model_archive_verification_failed:${candidate.executionId}:${kind}`);
                }
                const manifestEntry = {
                    executionId: candidate.executionId,
                    kind,
                    terminalStatus: candidate.status,
                    terminalAt: candidate.terminalAt,
                    sequence: candidate.sequence,
                    reasons: candidate.reasons,
                    artifactChecksum: String(archived.artifact?.checksum || ""),
                    compressedChecksum: String(archived.compressedChecksum || ""),
                    compressedBytes: Number(archived.compressedBytes || 0),
                    originalFile: sourceFile,
                    archiveFile,
                    archivedAt,
                };
                entriesByKey.set(`${candidate.executionId}:${kind}`, manifestEntry);
                staged.push({ sourceFile, archiveFile, ...manifestEntry });
            }
        }
        if (staged.length > 0) {
            const entries = [...entriesByKey.values()].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)
                || String(a.executionId || "").localeCompare(String(b.executionId || ""))
                || String(a.kind || "").localeCompare(String(b.kind || "")));
            const core = {
                schema: "ccm-group-session-memory-model-extraction-artifact-retention-manifest-v1",
                version: 1,
                scopeId,
                generation: Number(priorState.manifest?.generation || 0) + 1,
                policy: before.policy,
                entryCount: entries.length,
                executionCount: new Set(entries.map((entry) => entry.executionId)).size,
                archivedBytes: entries.reduce((sum, entry) => sum + Number(entry.compressedBytes || 0), 0),
                entries,
                updatedAt: archivedAt,
            };
            (0, group_session_memory_model_extraction_part_01_2.writeJsonAtomic)((0, group_session_memory_model_extraction_part_01_2.getGroupSessionMemoryModelExtractionArtifactRetentionManifestFile)(scopeId), {
                ...core,
                checksum: (0, group_session_memory_model_extraction_part_01_2.extractionArtifactRetentionManifestChecksum)(core),
            });
            const committed = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifactRetentionManifest)(scopeId, { verifyArtifacts: true });
            if (committed.valid !== true)
                throw new Error(`session_memory_model_artifact_retention_commit_invalid:${scopeId}`);
            for (const row of staged) {
                try {
                    fs.unlinkSync(row.sourceFile);
                }
                catch { }
            }
        }
        const after = inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeId, options);
        return {
            ...after,
            schema: "ccm-group-session-memory-model-extraction-artifact-retention-result-v1",
            dryRun: false,
            archivedThisRun: staged.length,
            archivedExecutionThisRun: new Set(staged.map(row => row.executionId)).size,
            archivedBytesThisRun: staged.reduce((sum, row) => sum + Number(row.compressedBytes || 0), 0),
        };
    });
}
function runAutomaticExtractionArtifactRetention(scopeId) {
    try {
        const policy = (0, group_session_memory_model_extraction_part_01_2.resolveExtractionArtifactRetentionPolicy)();
        if (!policy.autoArchiveEnabled)
            return null;
        return runGroupSessionMemoryModelExtractionArtifactRetention(scopeId, { ...policy, dryRun: false });
    }
    catch (error) {
        return { status: "failed", error: String(error?.message || error || "") };
    }
}
function getGroupSessionMemoryTypedMemoryRetryFile(scopeId) {
    const id = String(scopeId || "").trim();
    if (!/^[A-Za-z0-9._-]{1,180}--gcs_[A-Za-z0-9._-]{1,180}$/.test(id) || id.includes("..")) {
        throw new Error("independent_group_session_memory_scope_required");
    }
    return path.join(utils_1.CCM_DIR, "group-session-memory", id, "typed-memory-commit-retry.json");
}
function typedMemoryRetryEntryChecksum(entry) {
    const payload = { ...(entry || {}) };
    delete payload.checksum;
    return (0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify(payload), 64);
}
function typedMemoryRetryLedgerChecksum(ledger) {
    const payload = { ...(ledger || {}) };
    delete payload.checksum;
    delete payload.file;
    delete payload.valid;
    return (0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify(payload), 64);
}
function readGroupSessionMemoryTypedMemoryRetryState(scopeId) {
    const file = getGroupSessionMemoryTypedMemoryRetryFile(scopeId);
    if (!fs.existsSync(file)) {
        return {
            schema: "ccm-group-session-model-extraction-typed-memory-retry-ledger-v1",
            version: 1,
            scopeId,
            entries: [],
            updatedAt: "",
            checksum: "",
            file,
            present: false,
            valid: true,
        };
    }
    const ledger = (() => {
        try {
            return JSON.parse(fs.readFileSync(file, "utf-8"));
        }
        catch {
            return null;
        }
    })();
    const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
    const bindingValid = ledger?.schema === "ccm-group-session-model-extraction-typed-memory-retry-ledger-v1"
        && Number(ledger?.version || 0) === 1
        && String(ledger?.scopeId || "") === String(scopeId || "");
    const entriesValid = entries.every((entry) => !!String(entry?.executionId || "")
        && typedMemoryRetryEntryChecksum(entry) === String(entry?.checksum || ""));
    const checksumValid = !!String(ledger?.checksum || "")
        && typedMemoryRetryLedgerChecksum(ledger) === String(ledger.checksum || "");
    return { ...(ledger || {}), entries, file, present: true, bindingValid, entriesValid, checksumValid, valid: bindingValid && entriesValid && checksumValid };
}
function writeGroupSessionMemoryTypedMemoryRetryState(scopeId, entries, updatedAt = new Date().toISOString()) {
    const file = getGroupSessionMemoryTypedMemoryRetryFile(scopeId);
    const bounded = entries
        .map(entry => {
        const core = { ...(entry || {}) };
        delete core.checksum;
        return { ...core, checksum: typedMemoryRetryEntryChecksum(core) };
    })
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
        .slice(-100);
    const core = {
        schema: "ccm-group-session-model-extraction-typed-memory-retry-ledger-v1",
        version: 1,
        scopeId,
        entries: bounded,
        pendingCount: bounded.filter(entry => entry.status === "pending").length,
        completedCount: bounded.filter(entry => entry.status === "completed").length,
        exhaustedCount: bounded.filter(entry => entry.status === "exhausted").length,
        updatedAt,
    };
    const ledger = { ...core, checksum: typedMemoryRetryLedgerChecksum(core) };
    (0, group_session_memory_model_extraction_part_01_2.writeJsonAtomic)(file, ledger);
    return { ...ledger, file, present: true, valid: true };
}
function upsertGroupSessionMemoryTypedMemoryRetry(scopeId, input) {
    const state = readGroupSessionMemoryTypedMemoryRetryState(scopeId);
    if (state.valid !== true)
        throw new Error(`typed_memory_retry_ledger_invalid:${scopeId}`);
    const executionId = String(input.executionId || "");
    const existing = (state.entries || []).find((entry) => String(entry.executionId || "") === executionId) || null;
    const at = String(input.at || new Date().toISOString());
    const next = {
        schema: "ccm-group-session-model-extraction-typed-memory-retry-entry-v1",
        version: 1,
        executionId,
        scopeId,
        status: String(input.status || existing?.status || "pending"),
        attempts: Number(input.attempts ?? existing?.attempts ?? 0),
        maxAttempts: group_session_memory_model_extraction_part_01_2.TYPED_MEMORY_RETRY_MAX_ATTEMPTS,
        receiptChecksum: String(input.receiptChecksum ?? existing?.receiptChecksum ?? ""),
        requestArtifactChecksum: String(input.requestArtifactChecksum ?? existing?.requestArtifactChecksum ?? ""),
        resultArtifactChecksum: String(input.resultArtifactChecksum ?? existing?.resultArtifactChecksum ?? ""),
        graphChecksum: String(input.graphChecksum ?? existing?.graphChecksum ?? ""),
        archiveChecksum: String(input.archiveChecksum ?? existing?.archiveChecksum ?? ""),
        admittedCount: Number(input.admittedCount ?? existing?.admittedCount ?? 0),
        rejectedCount: Number(input.rejectedCount ?? existing?.rejectedCount ?? 0),
        lastError: String(input.lastError ?? existing?.lastError ?? "").slice(0, 1000),
        nextRetryAt: String(input.nextRetryAt ?? existing?.nextRetryAt ?? ""),
        createdAt: String(existing?.createdAt || input.createdAt || at),
        lastAttemptAt: String(input.lastAttemptAt ?? existing?.lastAttemptAt ?? ""),
        completedAt: String(input.completedAt ?? existing?.completedAt ?? ""),
        updatedAt: at,
    };
    const entries = [...(state.entries || []).filter((entry) => String(entry.executionId || "") !== executionId), next];
    return writeGroupSessionMemoryTypedMemoryRetryState(scopeId, entries, at);
}
function typedMemoryRetryDelay(attempts) {
    return Math.min(group_session_memory_model_extraction_part_01_2.TYPED_MEMORY_RETRY_MAX_DELAY_MS, group_session_memory_model_extraction_part_01_2.TYPED_MEMORY_RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attempts - 1)));
}
function scheduleGroupSessionMemoryTypedMemoryRetry(scopeId, executionId, options = {}) {
    const key = `${scopeId}::${executionId}`;
    const existing = group_session_memory_model_extraction_part_01_2.typedMemoryRetryTimers.get(key);
    if (existing)
        clearTimeout(existing);
    const delayMs = Math.max(0, Number(options.delayMs ?? options.delay_ms ?? group_session_memory_model_extraction_part_01_2.TYPED_MEMORY_RETRY_BASE_DELAY_MS));
    const timer = setTimeout(() => {
        group_session_memory_model_extraction_part_01_2.typedMemoryRetryTimers.delete(key);
        const state = readGroupSessionMemoryTypedMemoryRetryState(scopeId);
        const entry = state.valid === true
            ? state.entries.find((row) => String(row.executionId || "") === String(executionId || "") && row.status === "pending")
            : null;
        if (!entry)
            return;
        retryGroupSessionModelExtractionTypedMemory(scopeId, executionId, { reason: "scheduled_retry" });
    }, delayMs);
    timer.unref?.();
    group_session_memory_model_extraction_part_01_2.typedMemoryRetryTimers.set(key, timer);
    return { scheduled: true, scopeId, executionId, delayMs };
}
function persistFailedGroupSessionModelExtractionTypedMemoryCommit(scopeId, input, options = {}) {
    const attempts = Number(input.attempts || 0);
    const delayMs = typedMemoryRetryDelay(Math.max(1, attempts + 1));
    const at = String(input.failedAt || new Date().toISOString());
    const nextRetryAt = new Date((Date.parse(at) || Date.now()) + delayMs).toISOString();
    const state = upsertGroupSessionMemoryTypedMemoryRetry(scopeId, {
        executionId: input.executionId,
        status: "pending",
        attempts,
        receiptChecksum: input.receiptChecksum,
        requestArtifactChecksum: input.requestArtifactChecksum,
        resultArtifactChecksum: input.resultArtifactChecksum,
        graphChecksum: input.graphChecksum,
        lastError: input.error,
        nextRetryAt,
        at,
    });
    if (options.schedule !== false)
        scheduleGroupSessionMemoryTypedMemoryRetry(scopeId, input.executionId, { delayMs });
    return { state, nextRetryAt, retryInMs: delayMs };
}
function retryGroupSessionModelExtractionTypedMemory(scopeId, executionId, options = {}) {
    const key = `${scopeId}::${executionId}`;
    if (group_session_memory_model_extraction_part_01_2.typedMemoryRetryRunning.has(key))
        return { committed: false, status: "retry_already_running", scopeId, executionId };
    const state = readGroupSessionMemoryTypedMemoryRetryState(scopeId);
    if (state.valid !== true)
        return { committed: false, status: "retry_ledger_invalid", scopeId, executionId };
    const entry = (state.entries || []).find((row) => String(row.executionId || "") === String(executionId || ""));
    if (!entry)
        return { committed: false, status: "retry_entry_missing", scopeId, executionId };
    if (entry.status === "completed")
        return { committed: true, status: "already_completed", scopeId, executionId, archiveChecksum: entry.archiveChecksum };
    if (entry.status === "exhausted" && options.force !== true)
        return { committed: false, status: "retry_exhausted", scopeId, executionId };
    group_session_memory_model_extraction_part_01_2.typedMemoryRetryRunning.add(key);
    const attemptedAt = String(options.at || new Date().toISOString());
    const attempts = Number(entry.attempts || 0) + 1;
    try {
        const request = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "request");
        const result = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifact)(scopeId, executionId, "result");
        const receipt = result.artifact?.receipt || null;
        const markdown = String(result.artifact?.validated?.markdown || "");
        if (request.valid !== true || result.valid !== true || result.artifact?.status !== "committed" || !receipt || !markdown) {
            throw new Error("typed_memory_retry_artifact_or_committed_receipt_invalid");
        }
        if (entry.receiptChecksum && String(receipt.checksum || "") !== String(entry.receiptChecksum || "")) {
            throw new Error("typed_memory_retry_receipt_checksum_changed");
        }
        if (entry.requestArtifactChecksum && String(request.artifact?.checksum || "") !== String(entry.requestArtifactChecksum || "")) {
            throw new Error("typed_memory_retry_request_artifact_checksum_changed");
        }
        if (entry.resultArtifactChecksum && String(result.artifact?.checksum || "") !== String(entry.resultArtifactChecksum || "")) {
            throw new Error("typed_memory_retry_result_artifact_checksum_changed");
        }
        const commit = (0, group_memory_index_1.distillGroupSessionModelExtractionToTypedMemory)(scopeId, {
            receipt,
            factSupersessionGraph: receipt.factSupersessionGraph,
            transcript: String(request.artifact?.transcript || ""),
            markdown,
            requestArtifact: request,
            resultArtifact: result,
            extractionFencingToken: Number(receipt.fencingToken || 0),
        }, {
            reason: String(options.reason || "artifact_only_retry"),
            at: attemptedAt,
            __modelExtractionTypedMemoryFailAfterSnapshot: options.__modelExtractionTypedMemoryFailAfterSnapshot === true,
        });
        upsertGroupSessionMemoryTypedMemoryRetry(scopeId, {
            executionId,
            status: "completed",
            attempts,
            archiveChecksum: commit.archiveChecksum,
            admittedCount: commit.admittedCount,
            rejectedCount: commit.rejectedCount,
            lastError: "",
            nextRetryAt: "",
            lastAttemptAt: attemptedAt,
            completedAt: attemptedAt,
            at: attemptedAt,
        });
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
            status: "typed_memory_commit_recovered",
            executionId,
            scopeId,
            attempts,
            archiveChecksum: String(commit.archiveChecksum || ""),
            admittedCount: Number(commit.admittedCount || 0),
            rejectedCount: Number(commit.rejectedCount || 0),
            retryMode: "artifact_only_no_model",
        });
        return { ...commit, status: "recovered", retryAttempts: attempts, modelInvoked: false };
    }
    catch (error) {
        const exhausted = attempts >= group_session_memory_model_extraction_part_01_2.TYPED_MEMORY_RETRY_MAX_ATTEMPTS;
        const delayMs = typedMemoryRetryDelay(attempts);
        const nextRetryAt = exhausted ? "" : new Date((Date.parse(attemptedAt) || Date.now()) + delayMs).toISOString();
        upsertGroupSessionMemoryTypedMemoryRetry(scopeId, {
            executionId,
            status: exhausted ? "exhausted" : "pending",
            attempts,
            lastError: String(error?.message || error || "typed memory retry failed"),
            nextRetryAt,
            lastAttemptAt: attemptedAt,
            at: attemptedAt,
        });
        (0, group_session_memory_model_extraction_part_01_2.appendGroupSessionMemoryModelExtractionHistory)(scopeId, {
            status: exhausted ? "typed_memory_commit_retry_exhausted" : "typed_memory_commit_retry_failed",
            executionId,
            scopeId,
            attempts,
            error: String(error?.message || error || "").slice(0, 1000),
            nextRetryAt,
            retryMode: "artifact_only_no_model",
        });
        if (!exhausted && options.schedule !== false)
            scheduleGroupSessionMemoryTypedMemoryRetry(scopeId, executionId, { delayMs });
        return { committed: false, status: exhausted ? "retry_exhausted" : "retry_failed", scopeId, executionId, attempts, nextRetryAt, retryInMs: exhausted ? 0 : delayMs, error: String(error?.message || error || "") };
    }
    finally {
        group_session_memory_model_extraction_part_01_2.typedMemoryRetryRunning.delete(key);
    }
}
function recoverPendingGroupSessionMemoryTypedMemoryRetries(options = {}) {
    const root = path.join(utils_1.CCM_DIR, "group-session-memory");
    let dirs = [];
    try {
        dirs = fs.readdirSync(root, { withFileTypes: true });
    }
    catch { }
    const pending = [];
    for (const dir of dirs) {
        if (!dir.isDirectory() || !/^[A-Za-z0-9._-]{1,180}--gcs_[A-Za-z0-9._-]{1,180}$/.test(dir.name))
            continue;
        let state;
        try {
            state = readGroupSessionMemoryTypedMemoryRetryState(dir.name);
        }
        catch {
            continue;
        }
        if (state.valid !== true)
            continue;
        for (const entry of state.entries || [])
            if (entry.status === "pending")
                pending.push({ scopeId: dir.name, ...entry });
    }
    const results = [];
    const nowMs = Date.parse(String(options.at || "")) || Date.now();
    for (const entry of pending) {
        if (options.runNow === true || options.run_now === true) {
            results.push(retryGroupSessionModelExtractionTypedMemory(entry.scopeId, entry.executionId, { ...options, reason: "startup_recovery" }));
            continue;
        }
        const retryAtMs = Date.parse(String(entry.nextRetryAt || "")) || nowMs;
        results.push(scheduleGroupSessionMemoryTypedMemoryRetry(entry.scopeId, entry.executionId, { delayMs: Math.max(100, retryAtMs - nowMs) }));
    }
    return { schema: "ccm-group-session-model-extraction-typed-memory-retry-recovery-v1", pendingCount: pending.length, recoveredCount: results.filter(row => row.committed === true).length, scheduledCount: results.filter(row => row.scheduled === true).length, pending, results };
}
function extractSessionMemoryBlock(output) {
    const raw = String(output || "").trim();
    const tagged = raw.match(/<session_memory>\s*([\s\S]*?)\s*<\/session_memory>/i);
    if (tagged)
        return tagged[1].trim();
    const fenced = raw.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
    return fenced ? fenced[1].trim() : raw;
}
function validateGroupSessionMemoryModelOutput(output, requiredTemplate = group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE) {
    const markdown = extractSessionMemoryBlock(output);
    const templateContract = (0, group_session_memory_customization_1.parseGroupSessionMemoryTemplate)(requiredTemplate);
    const headers = markdown.split(/\r?\n/).filter(line => /^#{1,6}\s+/.test(line));
    const expectedHeaders = templateContract.sections.map(([header]) => header);
    const structureValid = headers.length === expectedHeaders.length
        && headers.every((header, index) => header === expectedHeaders[index]);
    const descriptionsValid = templateContract.sections.every(([header, description]) => {
        const index = markdown.indexOf(`${header}\n${description}`);
        return index >= 0;
    });
    const contentOnly = templateContract.sections.reduce((text, [header, description]) => text.replace(header, "").replace(description, ""), markdown).replace(/\s+/g, "").trim();
    if (!structureValid)
        throw new Error("session_memory_model_output_template_headers_invalid");
    if (!descriptionsValid)
        throw new Error("session_memory_model_output_template_descriptions_invalid");
    if (!contentOnly)
        throw new Error("session_memory_model_output_empty");
    const bounded = (0, memory_1.enforceGroupSessionMemoryBudget)(markdown);
    if (bounded.after.status === "over_budget")
        throw new Error("session_memory_model_output_budget_invalid");
    return {
        markdown: bounded.markdown,
        markdownChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(bounded.markdown, 24),
        outputChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(output, 32),
        budget: bounded.after,
        budgetEnforced: bounded.wasTruncated,
        truncatedSections: bounded.truncatedSections,
        templateChecksum: templateContract.checksum,
        templateSectionCount: templateContract.sectionCount,
    };
}
function normalizeMergeAnchor(value) {
    return String(value || "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(/[`*]/g, "")
        .replace(/^_+|_+$/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
}
function extractMergeAnchors(markdown, requiredTemplate = group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE) {
    const text = String(markdown || "");
    const anchors = [];
    const descriptions = new Set((0, group_session_memory_customization_1.parseGroupSessionMemoryTemplate)(requiredTemplate).sections.map(([, description]) => String(description)));
    for (const line of text.split(/\r?\n/)) {
        const raw = String(line || "").trim();
        if (!raw || raw.startsWith("#") || descriptions.has(raw))
            continue;
        const normalized = normalizeMergeAnchor(raw);
        if (!normalized || normalized.length < 4)
            continue;
        if (/(?:必须|禁止|不可|不得|不要|务必|始终|只能|不能|must\b|never\b|always\b|required\b|do not\b)/i.test(normalized)) {
            anchors.push({ type: "constraint", value: normalized });
        }
        else if (/(?:TODO|FIXME|待办|待处理|未完成|下一步|pending|unresolved|next step)/i.test(normalized)) {
            anchors.push({ type: "unresolved", value: normalized });
        }
    }
    for (const match of text.matchAll(/`([^`\r\n]{2,160})`/g)) {
        const value = normalizeMergeAnchor(match[1]);
        if (value)
            anchors.push({ type: "symbol", value });
    }
    for (const match of text.matchAll(/(?:[A-Za-z]:[\\/]|(?:\.{0,2}[\\/])?)[A-Za-z0-9_.@ -]+(?:[\\/][A-Za-z0-9_.@ -]+)+\.[A-Za-z0-9]{1,12}/g)) {
        const value = normalizeMergeAnchor(match[0]);
        if (value)
            anchors.push({ type: "path", value });
    }
    const seen = new Set();
    return anchors.filter(anchor => {
        const key = `${anchor.type}:${anchor.value.toLowerCase()}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 120);
}
function supersessionGraphChecksum(graph) {
    const payload = { ...(graph || {}) };
    delete payload.checksum;
    return (0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify(payload), 64);
}
function verifyGroupSessionMemoryFactSupersessionGraph(graph) {
    if (!graph?.checksum || graph.schema !== "ccm-group-session-memory-fact-supersession-graph-v1")
        return false;
    if (supersessionGraphChecksum(graph) !== String(graph.checksum || ""))
        return false;
    const facts = Array.isArray(graph.facts) ? graph.facts : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const factById = new Map(facts.map((fact) => [String(fact.factId || ""), fact]));
    const edgesValid = edges.every((edge) => {
        const oldFact = factById.get(String(edge.oldFactId || ""));
        return !!oldFact
            && oldFact.status === "superseded"
            && String(oldFact.factChecksum || "") === String(edge.oldFactChecksum || "")
            && String(oldFact.supersessionEdgeId || "") === String(edge.edgeId || "")
            && !!String(edge.sourceMessageId || "").trim()
            && !!String(edge.replacementText || "").trim()
            && (0, group_session_memory_model_extraction_part_01_2.hashText)(edge.replacementText, 32) === String(edge.newFactChecksum || "")
            && (0, group_session_memory_model_extraction_part_01_2.hashText)(edge.sourceMessageText, 32) === String(edge.sourceMessageChecksum || "");
    });
    if (!edgesValid)
        return false;
    const edgeByNewChecksum = new Map(edges.map((edge) => [String(edge.newFactChecksum || ""), edge]));
    const activeFacts = Array.isArray(graph.activeFacts) ? graph.activeFacts : [];
    return activeFacts.every((fact) => {
        const source = String(fact?.source || "");
        if (source === "retained_session_memory") {
            const stored = factById.get(String(fact.factId || ""));
            return !!stored && stored.status === "retained"
                && String(stored.factChecksum || "") === String(fact.factChecksum || "");
        }
        if (source === "explicit_replacement") {
            const edge = edgeByNewChecksum.get(String(fact.factChecksum || ""));
            return !!edge && String(edge.sourceMessageId || "") === String(fact.sourceMessageId || "")
                && String(edge.replacementText || "") === String(fact.text || "");
        }
        if (source === "model_confirmed_source") {
            const stored = factById.get(String(fact.factId || ""));
            return !!stored
                && stored.status === "model_confirmed"
                && ["constraint", "replacement"].includes(String(fact.type || ""))
                && String(stored.factChecksum || "") === String(fact.factChecksum || "")
                && String(stored.sourceMessageId || "") === String(fact.sourceMessageId || "")
                && (0, group_session_memory_model_extraction_part_01_2.hashText)(stored.sourceMessageText, 32) === String(stored.sourceMessageChecksum || "")
                && (0, group_session_memory_model_extraction_part_01_2.hashText)(fact.text, 32) === String(fact.factChecksum || "");
        }
        return false;
    });
}
function parseSupersessionSourceRows(sourceText) {
    try {
        const parsed = JSON.parse(String(sourceText || ""));
        if (!Array.isArray(parsed))
            return [];
        return parsed.map((row, index) => ({
            id: String(row?.id || row?.messageId || row?.message_id || ""),
            index,
            role: String(row?.role || row?.type || "unknown").toLowerCase(),
            content: String(row?.content || ""),
        })).filter((row) => row.id && row.content);
    }
    catch {
        return [];
    }
}
function supersessionReferenceTokens(value) {
    const generic = new Set([
        "必须保留", "必须使用", "不能使用", "不得使用", "不要使用", "用户要求", "下一步", "未完成",
        "required", "always", "never", "must", "pending", "unresolved",
    ]);
    return Array.from(new Set(String(value || "").match(/[A-Za-z_][A-Za-z0-9_.:/\\-]{3,}|[\u4e00-\u9fff]{4,}/g) || [])).filter(token => !generic.has(token.toLowerCase())).sort((a, b) => b.length - a.length).slice(0, 12);
}
function extractReplacementText(content) {
    const match = String(content || "").match(/(?:改为|替换为|更新为|变更为|instead(?:\s+use)?|replaced?\s+with|use\s+instead)\s*[:：]?\s*([^\r\n]{2,500})/i);
    return String(match?.[1] || "").replace(/<[^>]+>/g, "").trim().replace(/[。；;]+$/, "").slice(0, 500);
}
function modelConfirmedSourceFacts(sourceRows, markdown) {
    const outputComparable = String(markdown || "").replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();
    const candidates = [];
    for (const row of sourceRows) {
        if (row.role !== "user")
            continue;
        const fragments = String(row.content || "")
            .split(/\r?\n|(?<=[。！？!?;；])\s*/)
            .map(fragment => normalizeMergeAnchor(fragment).replace(/[。！？!?;；]+$/, "").trim())
            .filter(fragment => fragment.length >= 4 && fragment.length <= 500);
        for (const fragment of fragments) {
            const correction = /(?:纠正|更正|取消|不再|改为|替换为|更新为|已废弃|supersed|correction|no longer|instead|replace)/i.test(fragment);
            const constraint = /(?:必须|禁止|不可|不得|不要|务必|始终|只能|不能|长期|每次|must\b|never\b|always\b|required\b|do not\b)/i.test(fragment);
            const ephemeral = /(?:当前状态|这一次|本次进度|刚刚完成|待办|待处理|未完成|下一步|pending|unresolved|next step)/i.test(fragment);
            let text = fragment;
            let type = "constraint";
            if (correction) {
                const replacement = extractReplacementText(fragment);
                if (!replacement)
                    continue;
                text = normalizeMergeAnchor(replacement);
                type = "replacement";
            }
            else if (!constraint || ephemeral) {
                continue;
            }
            const comparable = normalizeMergeAnchor(text).toLowerCase();
            if (!comparable || !outputComparable.includes(comparable))
                continue;
            const factChecksum = (0, group_session_memory_model_extraction_part_01_2.hashText)(text, 32);
            candidates.push({
                factId: `gsmf_${factChecksum.slice(0, 20)}`,
                factChecksum,
                type,
                text,
                status: "model_confirmed",
                source: "model_confirmed_source",
                sourceMessageId: row.id,
                sourceMessageIndex: row.index,
                sourceMessageChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(row.content, 32),
                sourceMessageText: row.content,
            });
        }
    }
    const seen = new Set();
    return candidates.filter(fact => {
        const key = `${fact.type}:${normalizeMergeAnchor(fact.text).toLowerCase()}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 80);
}
function findFactSupersessionEdge(anchor, sourceRows, outputComparable) {
    const tokens = supersessionReferenceTokens(String(anchor.value || ""));
    for (let index = sourceRows.length - 1; index >= 0; index -= 1) {
        const row = sourceRows[index];
        if (!/(?:纠正|更正|取消|不再|改为|替换为|更新为|已废弃|supersed|correction|no longer|instead|replace)/i.test(row.content))
            continue;
        const rowComparable = normalizeMergeAnchor(row.content).toLowerCase();
        const referencesOldFact = tokens.length
            ? tokens.some(token => rowComparable.includes(token.toLowerCase()))
            : rowComparable.includes(normalizeMergeAnchor(anchor.value).toLowerCase());
        if (!referencesOldFact)
            continue;
        const replacementText = extractReplacementText(row.content);
        const replacementComparable = normalizeMergeAnchor(replacementText).toLowerCase();
        if (!replacementComparable || !outputComparable.includes(replacementComparable))
            continue;
        const oldFactChecksum = (0, group_session_memory_model_extraction_part_01_2.hashText)(`${anchor.type}\0${anchor.value}`, 32);
        const newFactChecksum = (0, group_session_memory_model_extraction_part_01_2.hashText)(replacementText, 32);
        const sourceMessageChecksum = (0, group_session_memory_model_extraction_part_01_2.hashText)(row.content, 32);
        const edgeCore = {
            oldFactId: `gsmf_${oldFactChecksum.slice(0, 20)}`,
            oldFactChecksum,
            newFactChecksum,
            sourceMessageId: row.id,
            sourceMessageIndex: row.index,
            sourceMessageChecksum,
            sourceMessageText: row.content,
            replacementText,
            relation: "explicit_replacement",
        };
        return { ...edgeCore, edgeId: `gsmse_${(0, group_session_memory_model_extraction_part_01_2.hashText)(JSON.stringify(edgeCore), 24)}` };
    }
    return null;
}
function buildFactSupersessionGraph(input = {}) {
    const currentNotes = String(input.currentNotes || "");
    const markdown = String(input.markdown || "");
    const anchors = Array.isArray(input.anchors) ? input.anchors : extractMergeAnchors(currentNotes);
    const outputComparable = markdown.replace(/[`*]/g, "").replace(/\s+/g, " ").toLowerCase();
    const sourceRows = parseSupersessionSourceRows(String(input.sourceText || ""));
    const confirmedFacts = modelConfirmedSourceFacts(sourceRows, markdown);
    const edges = [];
    const facts = anchors.map((anchor) => {
        const factChecksum = (0, group_session_memory_model_extraction_part_01_2.hashText)(`${anchor.type}\0${anchor.value}`, 32);
        const factId = `gsmf_${factChecksum.slice(0, 20)}`;
        const retained = outputComparable.includes(String(anchor.value || "").toLowerCase());
        const edge = retained ? null : findFactSupersessionEdge(anchor, sourceRows, outputComparable);
        if (edge)
            edges.push(edge);
        return {
            factId,
            factChecksum,
            type: anchor.type,
            text: anchor.value,
            status: retained ? "retained" : edge ? "superseded" : "unjustified_lost",
            supersessionEdgeId: edge?.edgeId || "",
        };
    });
    const activeFacts = [
        ...facts.filter((fact) => fact.status === "retained").map((fact) => ({
            factId: fact.factId,
            factChecksum: fact.factChecksum,
            type: fact.type,
            text: fact.text,
            source: "retained_session_memory",
        })),
        ...edges.map(edge => ({
            factId: `gsmf_${edge.newFactChecksum.slice(0, 20)}`,
            factChecksum: edge.newFactChecksum,
            type: "replacement",
            text: edge.replacementText,
            source: "explicit_replacement",
            sourceMessageId: edge.sourceMessageId,
            supersedesFactId: edge.oldFactId,
        })),
        ...confirmedFacts.map(fact => ({
            factId: fact.factId,
            factChecksum: fact.factChecksum,
            type: fact.type,
            text: fact.text,
            source: fact.source,
            sourceMessageId: fact.sourceMessageId,
            sourceMessageIndex: fact.sourceMessageIndex,
            sourceMessageChecksum: fact.sourceMessageChecksum,
        })),
    ];
    const dedupedActiveFacts = Array.from(new Map(activeFacts.map((fact) => [
        `${fact.type}:${normalizeMergeAnchor(fact.text).toLowerCase()}`,
        fact,
    ])).values());
    const allFacts = [...facts, ...confirmedFacts];
    const core = {
        schema: "ccm-group-session-memory-fact-supersession-graph-v1",
        version: 1,
        currentNotesChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(currentNotes, 32),
        outputMarkdownChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(markdown, 24),
        sourceTranscriptChecksum: String(input.sourceTranscriptChecksum || ""),
        sourceMessageCount: sourceRows.length,
        factCount: allFacts.length,
        retainedFactCount: facts.filter((fact) => fact.status === "retained").length,
        supersededFactCount: facts.filter((fact) => fact.status === "superseded").length,
        unjustifiedLostFactCount: facts.filter((fact) => fact.status === "unjustified_lost").length,
        unjustifiedLostConstraintCount: facts.filter((fact) => fact.type === "constraint" && fact.status === "unjustified_lost").length,
        modelConfirmedFactCount: confirmedFacts.length,
        activeFactCount: dedupedActiveFacts.length,
        facts: allFacts,
        edges,
        activeFacts: dedupedActiveFacts,
    };
    return { ...core, checksum: supersessionGraphChecksum(core) };
}
function sessionSectionContent(markdown, header, description) {
    const start = String(markdown || "").indexOf(`${header}\n${description}`);
    if (start < 0)
        return "";
    const contentStart = start + header.length + 1 + description.length;
    const nextHeader = String(markdown || "").indexOf("\n# ", contentStart);
    return String(markdown || "").slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}
function analyzeGroupSessionMemoryModelMergeQuality(input = {}) {
    const currentNotes = String(input.currentNotes || "");
    const markdown = String(input.markdown || "");
    const sourceText = String(input.sourceText || "");
    const templateContract = (0, group_session_memory_customization_1.parseGroupSessionMemoryTemplate)(input.requiredTemplate || input.required_template || group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE);
    const sectionRows = templateContract.sections.map(([header, description]) => {
        const section = header.slice(2);
        const content = sessionSectionContent(markdown, header, description);
        return { section, contentChars: content.length, empty: !content.replace(/[-*\s]/g, "") };
    });
    const requiredSections = new Set(["Current State", "Task specification", "Worklog"]);
    const missingRequiredSections = sectionRows.filter(row => requiredSections.has(row.section) && row.empty).map(row => row.section);
    const anchors = extractMergeAnchors(currentNotes, templateContract.template);
    const outputComparable = markdown
        .replace(/[`*]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
    const factSupersessionGraph = buildFactSupersessionGraph({
        currentNotes,
        markdown,
        sourceText,
        sourceTranscriptChecksum: input.sourceTranscriptChecksum,
        anchors,
    });
    const factById = new Map((factSupersessionGraph.facts || []).map((fact) => [fact.factId, fact]));
    const evaluatedAnchors = anchors.map(anchor => {
        const factId = `gsmf_${(0, group_session_memory_model_extraction_part_01_2.hashText)(`${anchor.type}\0${anchor.value}`, 32).slice(0, 20)}`;
        const fact = factById.get(factId);
        return { ...anchor, factId, retained: fact?.status === "retained", superseded: fact?.status === "superseded", status: fact?.status || "unjustified_lost" };
    });
    const retainedAnchors = evaluatedAnchors.filter(anchor => anchor.retained);
    const supersededAnchors = evaluatedAnchors.filter(anchor => anchor.superseded);
    const lostAnchors = evaluatedAnchors.filter(anchor => !anchor.retained && !anchor.superseded);
    const lostConstraints = lostAnchors.filter(anchor => anchor.type === "constraint");
    const correctionSignal = /(?:用户.{0,12}(?:纠正|更正|取消|改为)|不再|替换为|已废弃|supersed|correction|no longer|instead)/i.test(sourceText);
    const anchorRetentionPercent = anchors.length ? Math.round((retainedAnchors.length / anchors.length) * 1000) / 10 : 100;
    const populatedSectionPercent = Math.round(((sectionRows.length - sectionRows.filter(row => row.empty).length) / sectionRows.length) * 1000) / 10;
    const justifiedPercent = anchors.length ? Math.round(((retainedAnchors.length + supersededAnchors.length) / anchors.length) * 1000) / 10 : 100;
    const severeAnchorLoss = anchors.length >= 4 && justifiedPercent < 50;
    const constraintLoss = lostConstraints.length > 0;
    const pass = missingRequiredSections.length === 0 && !severeAnchorLoss && !constraintLoss;
    const score = Math.max(0, Math.min(100, Math.round((40 + populatedSectionPercent * 0.3 + anchorRetentionPercent * 0.3) * 10) / 10));
    return {
        schema: "ccm-group-session-memory-model-merge-quality-v2",
        version: 2,
        status: pass ? (lostAnchors.length ? "warn" : "ok") : "fail",
        pass,
        score,
        currentNotesChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(currentNotes, 32),
        outputMarkdownChecksum: (0, group_session_memory_model_extraction_part_01_2.hashText)(markdown, 24),
        sourceTranscriptChecksum: String(input.sourceTranscriptChecksum || ""),
        templateChecksum: templateContract.checksum,
        templateSectionCount: templateContract.sectionCount,
        correctionSignal,
        sectionCount: sectionRows.length,
        populatedSectionPercent,
        missingRequiredSections,
        anchorCount: anchors.length,
        retainedAnchorCount: retainedAnchors.length,
        supersededAnchorCount: supersededAnchors.length,
        lostAnchorCount: lostAnchors.length,
        anchorRetentionPercent,
        anchorJustifiedPercent: justifiedPercent,
        lostConstraintCount: lostConstraints.length,
        factSupersessionGraph,
        factSupersessionGraphChecksum: factSupersessionGraph.checksum,
        factSupersessionGraphValid: verifyGroupSessionMemoryFactSupersessionGraph(factSupersessionGraph),
        anchors: evaluatedAnchors.slice(0, 120),
        lostAnchors: lostAnchors.slice(0, 40),
    };
}
function replayGroupSessionMemoryModelExtraction(scopeId, executionId) {
    const id = (0, group_session_memory_model_extraction_part_01_2.safeExtractionExecutionId)(executionId);
    const history = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionHistory)(scopeId, { maxRows: 2000 });
    const events = history.rows.filter((event) => String(event.executionId || "") === id);
    const attempt = events.find((event) => event.status === "attempt_started") || null;
    const terminal = [...events].reverse().find((event) => ["committed", "failed"].includes(String(event.status || ""))) || null;
    const request = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifact)(scopeId, id, "request");
    const result = (0, group_session_memory_model_extraction_part_01_2.readGroupSessionMemoryModelExtractionArtifact)(scopeId, id, "result");
    const requestArtifact = request.artifact || {};
    const resultArtifact = result.artifact || {};
    const replayedPrompt = request.valid
        ? (0, group_session_memory_model_extraction_part_01_2.renderGroupSessionMemoryModelExtractionPrompt)(String(requestArtifact.currentNotes || ""), String(requestArtifact.transcript || "[]"), String(requestArtifact.existingMemoryManifest || ""), String(requestArtifact.customInstructions || ""), String(requestArtifact.requiredTemplate || group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE))
        : "";
    const promptChecksum = replayedPrompt ? (0, group_session_memory_model_extraction_part_01_2.hashText)(replayedPrompt, 32) : "";
    const rawOutput = String(resultArtifact.rawOutput || "");
    const embeddedReceipt = resultArtifact.receipt || null;
    const expectedMergeQualityCurrentNotesChecksum = String(embeddedReceipt?.mergeQualityInput?.currentNotesChecksum
        || embeddedReceipt?.mergeQuality?.currentNotesChecksum
        || terminal?.mergeQuality?.currentNotesChecksum
        || "");
    const replayMergeQualityInput = resolveGroupSessionMemoryReplayCurrentNotes(String(requestArtifact.currentNotes || ""), expectedMergeQualityCurrentNotesChecksum);
    let validation = null;
    let validationError = "";
    let mergeQuality = null;
    if (rawOutput) {
        try {
            validation = validateGroupSessionMemoryModelOutput(rawOutput, String(requestArtifact.requiredTemplate || group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE));
            mergeQuality = analyzeGroupSessionMemoryModelMergeQuality({
                currentNotes: replayMergeQualityInput.currentNotes,
                markdown: validation.markdown,
                sourceText: String(requestArtifact.transcript || ""),
                sourceTranscriptChecksum: String(requestArtifact.requestAudit?.sourceTranscriptChecksum || ""),
                requiredTemplate: String(requestArtifact.requiredTemplate || group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE),
            });
        }
        catch (error) {
            validationError = String(error?.message || error || "");
        }
    }
    const currentSnapshot = (0, memory_1.readGroupSessionMemorySnapshotSummary)(scopeId) || {};
    const currentSnapshotReceipt = currentSnapshot.modelExtractionReceipt || null;
    const isCurrentSnapshotExecution = String(currentSnapshotReceipt?.executionId || "") === id;
    const terminalStatus = String(terminal?.status || "");
    const checks = {
        historyIntegrity: history.integrityValid === true,
        attemptPresent: !!attempt,
        terminalPresent: !!terminal,
        requestArtifactValid: request.valid === true,
        requestArtifactBoundToAttempt: !!attempt
            && String(attempt.requestArtifactChecksum || "") === String(requestArtifact.checksum || "")
            && String(attempt.requestArtifactFile || "") === String(request.file || ""),
        promptRebuildMatches: !!promptChecksum
            && promptChecksum === String(requestArtifact.requestAudit?.promptChecksum || "")
            && promptChecksum === String(attempt?.requestAudit?.promptChecksum || ""),
        customPromptChecksumMatches: String(requestArtifact.requestAudit?.customPromptChecksum || "")
            === (requestArtifact.customInstructions ? (0, group_session_memory_model_extraction_part_01_2.hashText)(String(requestArtifact.customInstructions), 32) : ""),
        customTemplateChecksumMatches: (!requestArtifact.requestAudit?.customTemplateChecksum && !requestArtifact.requiredTemplate)
            || String(requestArtifact.requestAudit?.customTemplateChecksum || "")
                === (0, group_session_memory_customization_1.parseGroupSessionMemoryTemplate)(String(requestArtifact.requiredTemplate || group_session_memory_customization_1.GROUP_SESSION_MEMORY_MODEL_TEMPLATE)).checksum,
        resultArtifactValid: result.valid === true,
        resultArtifactBoundToTerminal: !!terminal
            && String(terminal.resultArtifactChecksum || "") === String(resultArtifact.checksum || "")
            && String(terminal.resultArtifactFile || "") === String(result.file || ""),
        rawOutputChecksumMatches: String(resultArtifact.outputChecksum || "") === (rawOutput ? (0, group_session_memory_model_extraction_part_01_2.hashText)(rawOutput, 32) : ""),
        terminalStatusMatches: terminalStatus === String(resultArtifact.status || ""),
        receiptChecksumValid: !!embeddedReceipt && (0, group_session_memory_model_extraction_part_01_2.verifyGroupSessionMemoryModelExtractionReceipt)(embeddedReceipt),
        receiptBoundToTerminal: !!embeddedReceipt
            && String(terminal?.receiptChecksum || "") === String(embeddedReceipt.checksum || "")
            && String(embeddedReceipt.executionId || "") === id
            && String(embeddedReceipt.scopeId || "") === String(scopeId || ""),
        currentNotesChecksumMatchesRequestAudit: (0, group_session_memory_model_extraction_part_01_2.hashText)(String(requestArtifact.currentNotes || ""), 32)
            === String(requestArtifact.requestAudit?.currentNotesChecksum || ""),
    };
    if (terminalStatus === "committed") {
        checks.mergeQualityInputChecksumMatchesReceipt = replayMergeQualityInput.checksumMatches === true;
        checks.mergeQualityInputEvidenceMatchesReceipt = !embeddedReceipt?.mergeQualityInput || (String(embeddedReceipt.mergeQualityInput.currentNotesChecksum || "") === expectedMergeQualityCurrentNotesChecksum
            && String(embeddedReceipt.mergeQualityInput.canonicalization || "") === "trim");
        checks.currentSnapshotCursorMatchesReceipt = !isCurrentSnapshotExecution || (String(currentSnapshot.updateCadence?.lastExtractionMessageId || "") === String(embeddedReceipt?.cursorAfter?.lastExtractionMessageId || "")
            && String(currentSnapshot.updateCadence?.cursorAdvanceStatus || "legacy") === String(embeddedReceipt?.cursorAdvanceStatus || "legacy")
            && (currentSnapshot.updateCadence?.cursorAdvanceSafe === true) === (embeddedReceipt?.cursorAdvanceSafe === true));
        checks.outputRevalidates = !!validation && !validationError;
        checks.templateReceiptMatches = !embeddedReceipt?.templateChecksum || (String(validation?.templateChecksum || "") === String(embeddedReceipt.templateChecksum || "")
            && Number(validation?.templateSectionCount || 0) === Number(embeddedReceipt.templateSectionCount || 0));
        checks.markdownChecksumMatches = !!validation
            && String(validation.markdownChecksum || "") === String(terminal?.markdownChecksum || "")
            && String(validation.markdownChecksum || "") === String(embeddedReceipt?.markdownChecksum || "");
        checks.mergeQualityReplays = mergeQuality?.pass === true
            && String(mergeQuality.outputMarkdownChecksum || "") === String(terminal?.mergeQuality?.outputMarkdownChecksum || "")
            && Number(mergeQuality.anchorRetentionPercent || 0) === Number(terminal?.mergeQuality?.anchorRetentionPercent || 0);
        checks.factSupersessionGraphValid = verifyGroupSessionMemoryFactSupersessionGraph(mergeQuality?.factSupersessionGraph)
            && verifyGroupSessionMemoryFactSupersessionGraph(embeddedReceipt?.factSupersessionGraph);
        checks.factSupersessionGraphReplays = String(mergeQuality?.factSupersessionGraphChecksum || "")
            === String(terminal?.factSupersessionGraphChecksum || terminal?.mergeQuality?.factSupersessionGraphChecksum || "")
            && String(mergeQuality?.factSupersessionGraphChecksum || "")
                === String(embeddedReceipt?.factSupersessionGraphChecksum || "");
    }
    else if (terminalStatus === "failed") {
        checks.failureClassMatches = String(resultArtifact.failureClass || "") === String(terminal?.failureClass || "")
            && String(embeddedReceipt?.failureClass || "") === String(terminal?.failureClass || "");
        checks.failedOutputDoesNotClaimCommit = String(embeddedReceipt?.status || "") === "failed";
    }
    const pass = Object.values(checks).every(Boolean);
    return {
        schema: "ccm-group-session-memory-model-extraction-replay-v1",
        version: 1,
        scopeId,
        executionId: id,
        status: pass ? "verified" : terminal ? "fail" : "pending",
        pass,
        checks,
        mergeQualityInput: {
            mode: replayMergeQualityInput.mode,
            checksum: replayMergeQualityInput.checksum,
            expectedChecksum: replayMergeQualityInput.expectedChecksum,
            checksumMatches: replayMergeQualityInput.checksumMatches,
            legacyCompatible: replayMergeQualityInput.legacyCompatible,
        },
        history: {
            file: history.file,
            headFile: history.headFile,
            integrityValid: history.integrityValid,
            checksumInvalidCount: history.checksumInvalidCount,
            chainInvalidCount: history.chainInvalidCount,
            headMatches: history.headMatches,
        },
        attempt,
        terminal,
        request: {
            file: request.file,
            storageFile: request.storageFile || request.file,
            tier: request.tier || "missing",
            valid: request.valid,
            checksum: requestArtifact.checksum || "",
            compressedBytes: request.compressedBytes || 0,
            estimatedInputTokens: requestArtifact.requestAudit?.estimatedInputTokens || 0,
            inputBudgetStatus: requestArtifact.requestAudit?.inputBudgetStatus || "",
        },
        result: {
            file: result.file,
            storageFile: result.storageFile || result.file,
            tier: result.tier || "missing",
            valid: result.valid,
            checksum: resultArtifact.checksum || "",
            compressedBytes: result.compressedBytes || 0,
            status: resultArtifact.status || "",
            validationError,
            replayedMergeQuality: mergeQuality,
        },
    };
}
function resolveGroupSessionMemoryReplayCurrentNotes(currentNotes, expectedChecksum = "") {
    const canonical = String(currentNotes || "");
    const expected = String(expectedChecksum || "");
    const candidates = [
        { mode: "canonical_request", currentNotes: canonical },
        { mode: "legacy_trailing_lf", currentNotes: `${canonical}\n` },
        { mode: "legacy_trailing_crlf", currentNotes: `${canonical}\r\n` },
    ];
    const unique = Array.from(new Map(candidates.map(candidate => [(0, group_session_memory_model_extraction_part_01_2.hashText)(candidate.currentNotes, 32), candidate])).entries())
        .map(([checksum, candidate]) => ({ ...candidate, checksum }));
    const selected = (expected ? unique.find(candidate => candidate.checksum === expected) : unique[0]) || unique[0];
    return {
        ...selected,
        expectedChecksum: expected,
        checksumMatches: !expected || selected.checksum === expected,
        legacyCompatible: selected.mode !== "canonical_request" && selected.checksum === expected,
    };
}
function listPendingGroupSessionMemoryModelExtractions() {
    const root = path.join(utils_1.CCM_DIR, "group-memory-sessions");
    const rows = [];
    let groupDirs = [];
    try {
        groupDirs = fs.readdirSync(root, { withFileTypes: true });
    }
    catch {
        return rows;
    }
    for (const groupDir of groupDirs) {
        if (!groupDir.isDirectory())
            continue;
        const groupId = groupDir.name;
        let files = [];
        try {
            files = fs.readdirSync(path.join(root, groupId), { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const file of files) {
            if (!file.isFile() || !file.name.endsWith(".json"))
                continue;
            const groupSessionId = file.name.slice(0, -5);
            if (!groupSessionId || groupSessionId === "default")
                continue;
            const scopeId = `${groupId}--${groupSessionId}`;
            const snapshot = (0, memory_1.readGroupSessionMemorySnapshotSummary)(scopeId) || {};
            const state = (0, group_session_memory_extraction_1.readGroupSessionMemoryExtractionState)(scopeId);
            const cadenceStatus = String(snapshot.updateCadence?.status || "");
            if (cadenceStatus === "model_extraction_due" || String(state.status || "") === "failed") {
                rows.push({ groupId, groupSessionId, scopeId, cadenceStatus, extractionStatus: String(state.status || "idle"), nextRetryAt: String(state.nextRetryAt || "") });
            }
        }
    }
    return rows;
}
function recoverPendingGroupSessionMemoryModelExtractions(options = {}) {
    if (!group_session_memory_model_extraction_part_01_2.configuredExecutor)
        return { configured: false, pendingCount: 0, scheduledCount: 0, rows: [] };
    const nowMs = Date.parse(String(options.at || "")) || Date.now();
    const rows = listPendingGroupSessionMemoryModelExtractions();
    let scheduledCount = 0;
    for (const row of rows) {
        const retryAtMs = Date.parse(row.nextRetryAt) || 0;
        const delayMs = Math.max(Number(options.delayMs ?? options.delay_ms ?? 100), retryAtMs > nowMs ? retryAtMs - nowMs : 100);
        const scheduled = (0, group_session_memory_model_extraction_part_03_1.scheduleGroupSessionMemoryModelExtraction)(row.groupId, {
            groupSessionId: row.groupSessionId,
            delayMs,
            reason: "model_executor_ready_recovery",
        });
        if (scheduled.scheduled)
            scheduledCount += 1;
    }
    return { configured: true, pendingCount: rows.length, scheduledCount, rows };
}
function configureGroupSessionMemoryModelExecutor(executor) {
    const wasConfigured = typeof group_session_memory_model_extraction_part_01_2.configuredExecutor === "function";
    (0, group_session_memory_model_extraction_part_01_1.setConfiguredExecutor)(typeof executor === "function" ? executor : null);
    const shouldRecover = !wasConfigured && !!group_session_memory_model_extraction_part_01_2.configuredExecutor;
    if (shouldRecover) {
        const timer = setTimeout(() => {
            try {
                recoverPendingGroupSessionMemoryModelExtractions();
            }
            catch { }
            try {
                recoverPendingGroupSessionMemoryTypedMemoryRetries();
            }
            catch { }
        }, 0);
        timer.unref?.();
    }
    return { configured: !!group_session_memory_model_extraction_part_01_2.configuredExecutor, recoveryScheduled: shouldRecover };
}
//# sourceMappingURL=group-session-memory-model-extraction-part-02.js.map