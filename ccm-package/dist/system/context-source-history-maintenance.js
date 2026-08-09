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
exports.previewContextSourceMaintenance = previewContextSourceMaintenance;
exports.applyContextSourceMaintenance = applyContextSourceMaintenance;
exports.rollbackContextSourceMaintenance = rollbackContextSourceMaintenance;
exports.contextSourceHistoryMaintenanceSelfTest = contextSourceHistoryMaintenanceSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const context_budget_1 = require("./context-budget");
const main_agent_context_source_continuity_1 = require("./main-agent-context-source-continuity");
const context_source_tool_result_projection_1 = require("./context-source-tool-result-projection");
const reliability_ledger_1 = require("./reliability-ledger");
function globalTranscriptMaintenance() {
    return require("../agents/global/memory");
}
const ROOT = path.join(utils_1.CCM_DIR, "memory-control", "context-source-maintenance");
const PLAN_DIR = path.join(ROOT, "plans");
const JOB_DIR = path.join(ROOT, "jobs");
const LOCK_FILE = path.join(ROOT, "maintenance.lock");
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function cleanSegment(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._@-]+/g, "-").slice(0, 120);
}
function contained(root, ...segments) {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(root, ...segments);
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`))
        throw new Error("context_source_maintenance_path_outside_root");
    return resolved;
}
function normalizeIdentity(input) {
    const scope = String(input?.scope || "");
    const scopeId = String(input?.scopeId || input?.scope_id || "").trim();
    const sessionId = String(input?.sessionId || input?.session_id || "").trim();
    if (!["global", "project", "group"].includes(scope) || !scopeId || !sessionId)
        throw new Error("context_source_maintenance_exact_scope_session_required");
    return { scope, scopeId, sessionId, generation: Math.max(0, Math.floor(Number(input?.generation || 0))) };
}
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}
function fileChecksum(file) {
    return hash(fs.readFileSync(file));
}
function existingFiles(identity) {
    const candidates = [];
    if (identity.scope === "project") {
        candidates.push(contained(path.join(utils_1.CCM_DIR, "web-sessions"), identity.scopeId, `${identity.sessionId}.json`));
    }
    else if (identity.scope === "global") {
        candidates.push(path.join(utils_1.CCM_DIR, "global-agent-runs", "runs.json"), path.join(utils_1.CCM_DIR, "global-agent-runtime", "runs.json"), path.join(utils_1.CCM_DIR, "global-agent-history.json"), path.join(utils_1.CCM_DIR, "global-agent-memory", "memory.json"));
    }
    else {
        candidates.push(path.join(utils_1.GROUP_MESSAGES_DIR, "sessions", cleanSegment(identity.scopeId), `${cleanSegment(identity.sessionId)}.json`));
    }
    return [...new Set(candidates)].filter(file => fs.existsSync(file) && fs.statSync(file).isFile());
}
function belongsToExactSession(value, identity) {
    if (identity.scope === "project")
        return true;
    const text = JSON.stringify(value ?? null);
    if (!text.includes(identity.sessionId))
        return false;
    return identity.scope !== "group" || text.includes(identity.scopeId);
}
function projectPersistedSources(value, identity) {
    let changed = 0;
    let removedTokens = 0;
    let unresolved = 0;
    const visit = (current) => {
        if (Array.isArray(current))
            return current.map(visit);
        if (!current || typeof current !== "object")
            return current;
        if (!belongsToExactSession(current, identity) && (current.session_id || current.sessionId || current.exactSessionId))
            return current;
        const next = { ...current };
        const toolName = current.toolName || current.tool_name || current.tool?.name || current.tool || current.name || "";
        const sourceTool = (0, context_source_tool_result_projection_1.isContextSourceToolResult)(toolName, current);
        const fields = current.type === "tool_result" ? ["payload"]
            : current.type === "tool_completed" ? ["observation"]
                : ["observation", "rawOutput", "raw_output", "result", "output"];
        if (sourceTool) {
            let projectedAny = false;
            for (const field of fields) {
                if (current[field] === undefined)
                    continue;
                const projected = (0, context_source_tool_result_projection_1.projectContextSourceToolResultForPersistence)(toolName, current[field], current.arguments?.query || current.query || "");
                if (projected === current[field])
                    continue;
                removedTokens += Math.max(0, (0, context_budget_1.estimateTextTokens)(JSON.stringify(current[field])) - (0, context_budget_1.estimateTextTokens)(JSON.stringify(projected)));
                next[field] = projected;
                changed += 1;
                projectedAny = true;
            }
            if (!projectedAny)
                unresolved += 1;
        }
        for (const [key, nested] of Object.entries(next)) {
            if (fields.includes(key) && sourceTool)
                continue;
            next[key] = visit(nested);
        }
        return next;
    };
    const output = visit(value);
    return { output, changed, removedTokens, unresolved };
}
function projectMemoryFile(identity) {
    const dir = path.join(utils_1.CCM_DIR, "project-memory");
    if (!fs.existsSync(dir))
        return "";
    for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
        const file = path.join(dir, name);
        try {
            if (String(readJson(file)?.project || "") === identity.scopeId)
                return file;
        }
        catch { }
    }
    return "";
}
function promotionBackfillCandidates(identity) {
    const rows = [];
    if (identity.scope === "project") {
        const file = projectMemoryFile(identity);
        if (file) {
            const memory = readJson(file);
            for (const item of Array.isArray(memory?.durableMemories) ? memory.durableMemories : []) {
                if (String(item?.source?.sessionId || "") !== identity.sessionId)
                    continue;
                const sourceRefs = (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(item?.sourceRefs, item?.evidence);
                if (!sourceRefs.length)
                    continue;
                rows.push({ memoryKind: "project_durable_memory", memoryId: String(item.id || ""), admissionChecksum: hash(item?.taxonomy || item), sourceRefs });
            }
        }
    }
    else if (identity.scope === "group") {
        const dir = path.join(utils_1.CCM_DIR, "promoted-memory");
        if (fs.existsSync(dir))
            for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
                const store = readJson(path.join(dir, name));
                for (const entry of Array.isArray(store?.entries) ? store.entries : []) {
                    if (String(entry?.status || "active") !== "active")
                        continue;
                    if (!(entry?.sources || []).some((source) => String(source?.groupId || "") === identity.scopeId && String(source?.groupSessionId || "") === identity.sessionId))
                        continue;
                    const sourceRefs = (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(entry?.sourceRefs);
                    if (!sourceRefs.length)
                        continue;
                    rows.push({ memoryKind: "group_typed_memory", memoryId: String(entry.promotionId || ""), admissionChecksum: hash([entry.promotionId, entry.updatedAt, entry.sources]), sourceRefs });
                }
            }
    }
    return rows.filter(row => row.memoryId);
}
function exactGlobalRunIds(identity) {
    if (identity.scope !== "global")
        return [];
    const file = path.join(utils_1.CCM_DIR, "global-agent-runs", "runs.json");
    if (!fs.existsSync(file))
        return [];
    try {
        const store = readJson(file);
        return (Array.isArray(store?.runs) ? store.runs : []).filter((run) => String(run?.session_id || run?.sessionId || "") === identity.sessionId).map((run) => String(run?.id || "")).filter(Boolean);
    }
    catch {
        return [];
    }
}
function exactGlobalTraceIds(identity) {
    if (identity.scope !== "global")
        return [];
    const file = path.join(utils_1.CCM_DIR, "global-agent-runs", "runs.json");
    if (!fs.existsSync(file))
        return [];
    try {
        const store = readJson(file);
        return (Array.isArray(store?.runs) ? store.runs : []).filter((run) => String(run?.session_id || run?.sessionId || "") === identity.sessionId).map((run) => String(run?.trace_id || run?.traceId || "")).filter(Boolean);
    }
    catch {
        return [];
    }
}
function buildPlan(identity) {
    const files = existingFiles(identity).map(file => {
        const before = readJson(file);
        const projected = projectPersistedSources(before, identity);
        return {
            id: `mf_${hash(file).slice(0, 20)}`,
            file,
            fileChecksum: fileChecksum(file),
            changeCount: projected.changed,
            removedTokens: projected.removedTokens,
            unresolvedCount: projected.unresolved,
        };
    });
    const promotions = promotionBackfillCandidates(identity);
    const idempotency = (0, reliability_ledger_1.buildContextSourceIdempotencyMaintenancePlan)(exactGlobalRunIds(identity));
    const traceEvents = (0, reliability_ledger_1.buildContextSourceTraceMaintenancePlan)(exactGlobalTraceIds(identity));
    const globalTranscript = identity.scope === "global" ? globalTranscriptMaintenance().previewGlobalTranscriptContextSourceMaintenance(identity.sessionId) : null;
    const core = {
        schema: "ccm-context-source-maintenance-plan-v1",
        version: 1,
        identity,
        files,
        promotions,
        idempotency,
        traceEvents,
        globalTranscript,
        affectedRecordCount: files.reduce((sum, row) => sum + row.changeCount, 0) + idempotency.length + traceEvents.length + Number(globalTranscript?.changed || 0),
        estimatedRemovedBodyTokens: files.reduce((sum, row) => sum + row.removedTokens, 0) + idempotency.reduce((sum, row) => sum + Number(row.removedTokens || 0), 0) + traceEvents.reduce((sum, row) => sum + Number(row.removedTokens || 0), 0) + Number(globalTranscript?.removedTokens || 0),
        unresolvedCount: files.reduce((sum, row) => sum + row.unresolvedCount, 0),
        promotionBackfillCount: promotions.length,
        contentStored: false,
    };
    return { ...core, planChecksum: hash(core) };
}
function publicPlan(plan) {
    return {
        success: true,
        schema: plan.schema,
        identity: plan.identity,
        planChecksum: plan.planChecksum,
        affectedRecordCount: plan.affectedRecordCount,
        estimatedRemovedBodyTokens: plan.estimatedRemovedBodyTokens,
        promotionBackfillCount: plan.promotionBackfillCount,
        unresolvedCount: plan.unresolvedCount,
        files: plan.files.map((row) => ({ id: row.id, checksum: row.fileChecksum, changeCount: row.changeCount, removedTokens: row.removedTokens, unresolvedCount: row.unresolvedCount })),
        promotionIds: plan.promotions.map((row) => row.memoryId),
        idempotencyRecordCount: plan.idempotency.length,
        traceRecordCount: plan.traceEvents.length,
        encryptedTranscriptRecordCount: Number(plan.globalTranscript?.changed || 0),
        contentStored: false,
    };
}
function previewContextSourceMaintenance(input) {
    const identity = normalizeIdentity(input);
    const plan = buildPlan(identity);
    fs.mkdirSync(PLAN_DIR, { recursive: true });
    (0, atomic_json_file_1.writeJsonAtomic)(path.join(PLAN_DIR, `${plan.planChecksum}.json`), plan);
    return publicPlan(plan);
}
function applyContextSourceMaintenance(input) {
    const identity = normalizeIdentity(input);
    const planChecksum = String(input?.planChecksum || input?.plan_checksum || "").trim();
    const reason = String(input?.reason || "").trim();
    if (!planChecksum || !reason)
        throw new Error("context_source_maintenance_checksum_and_reason_required");
    return (0, atomic_json_file_1.withFileLock)(LOCK_FILE, () => {
        const planFile = path.join(PLAN_DIR, `${cleanSegment(planChecksum)}.json`);
        if (!fs.existsSync(planFile))
            throw new Error("context_source_maintenance_plan_missing");
        const plan = readJson(planFile);
        const { planChecksum: storedPlanChecksum, ...planCore } = plan;
        if (storedPlanChecksum !== planChecksum || hash(planCore) !== planChecksum)
            throw new Error("context_source_maintenance_plan_checksum_invalid");
        if (JSON.stringify(plan.identity) !== JSON.stringify(identity))
            throw new Error("context_source_maintenance_identity_mismatch");
        for (const row of plan.files)
            if (!fs.existsSync(row.file) || fileChecksum(row.file) !== row.fileChecksum)
                throw new Error(`context_source_maintenance_source_drift:${row.id}`);
        const currentIdempotency = (0, reliability_ledger_1.buildContextSourceIdempotencyMaintenancePlan)(exactGlobalRunIds(identity));
        if (hash(currentIdempotency.map((row) => [row.scope, row.keyChecksum, row.resultChecksum])) !== hash(plan.idempotency.map((row) => [row.scope, row.keyChecksum, row.resultChecksum])))
            throw new Error("context_source_maintenance_idempotency_drift");
        const currentTraceEvents = (0, reliability_ledger_1.buildContextSourceTraceMaintenancePlan)(exactGlobalTraceIds(identity));
        if (hash(currentTraceEvents.map((row) => [row.traceId, row.eventId, row.dataChecksum])) !== hash(plan.traceEvents.map((row) => [row.traceId, row.eventId, row.dataChecksum])))
            throw new Error("context_source_maintenance_trace_drift");
        const currentTranscript = identity.scope === "global" ? globalTranscriptMaintenance().previewGlobalTranscriptContextSourceMaintenance(identity.sessionId) : null;
        if (String(currentTranscript?.fileChecksum || "") !== String(plan.globalTranscript?.fileChecksum || ""))
            throw new Error("context_source_maintenance_global_transcript_drift");
        const jobId = `csm_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
        const backupDir = path.join(JOB_DIR, jobId, "backup");
        fs.mkdirSync(backupDir, { recursive: true });
        const backups = [];
        const idempotencyBackupFile = path.join(backupDir, "global-agent-tool-idempotency.json");
        const traceBackupFile = path.join(backupDir, "global-agent-trace-events.json");
        const transcriptBackupFile = path.join(backupDir, "global-transcript.enc.json");
        let idempotencyResult = { updated: 0, backupFile: "" };
        let traceResult = { updated: 0, backupFile: "" };
        let globalTranscriptResult = { updated: 0, backupFile: "", file: plan.globalTranscript?.file || "" };
        try {
            for (const row of plan.files) {
                const backup = path.join(backupDir, `${row.id}.json`);
                fs.copyFileSync(row.file, backup);
                backups.push({ id: row.id, originalFile: row.file, backupFile: backup, checksum: row.fileChecksum });
                const projected = projectPersistedSources(readJson(row.file), identity);
                (0, atomic_json_file_1.writeJsonAtomic)(row.file, projected.output);
            }
            idempotencyResult = plan.idempotency.length ? (0, reliability_ledger_1.applyContextSourceIdempotencyMaintenance)(plan.idempotency, idempotencyBackupFile) : idempotencyResult;
            traceResult = plan.traceEvents.length ? (0, reliability_ledger_1.applyContextSourceTraceMaintenance)(plan.traceEvents, traceBackupFile) : traceResult;
            globalTranscriptResult = plan.globalTranscript?.changed
                ? { ...globalTranscriptMaintenance().applyGlobalTranscriptContextSourceMaintenance(plan.globalTranscript, transcriptBackupFile), file: plan.globalTranscript?.file || "" }
                : globalTranscriptResult;
            const promotionResults = [];
            for (const candidate of plan.promotions) {
                try {
                    promotionResults.push({ memoryId: candidate.memoryId, ...(0, main_agent_context_source_continuity_1.promoteContextSourceReceipts)({
                            identity: { agentKind: identity.scope, scope: identity.scope, scopeId: identity.scopeId, exactSessionId: identity.sessionId, generation: identity.generation },
                            sourceRefs: candidate.sourceRefs,
                            memoryKind: candidate.memoryKind,
                            memoryId: candidate.memoryId,
                            admissionChecksum: candidate.admissionChecksum,
                        }) });
                }
                catch (error) {
                    promotionResults.push({ memoryId: candidate.memoryId, retryable: true, error: String(error?.message || error).slice(0, 500), contentStored: false });
                }
            }
            const manifest = {
                schema: "ccm-context-source-maintenance-job-v1",
                version: 1,
                jobId,
                identity,
                planChecksum,
                reason,
                actor: String(input?.actor || "memory-center"),
                status: "applied",
                backups,
                affectedRecordCount: plan.affectedRecordCount,
                estimatedRemovedBodyTokens: plan.estimatedRemovedBodyTokens,
                promotionResults,
                idempotencyResult,
                traceResult,
                globalTranscriptResult,
                appliedAt: new Date().toISOString(),
                contentStored: false,
            };
            (0, atomic_json_file_1.writeJsonAtomic)(path.join(JOB_DIR, jobId, "manifest.json"), manifest);
            return { success: true, jobId, status: manifest.status, affectedRecordCount: manifest.affectedRecordCount, estimatedRemovedBodyTokens: manifest.estimatedRemovedBodyTokens, promotionResults, idempotencyRecordCount: idempotencyResult.updated, traceRecordCount: traceResult.updated, encryptedTranscriptRecordCount: globalTranscriptResult.updated, contentStored: false };
        }
        catch (error) {
            try {
                if (fs.existsSync(transcriptBackupFile) && plan.globalTranscript?.file)
                    globalTranscriptMaintenance().rollbackGlobalTranscriptContextSourceMaintenance(plan.globalTranscript.file, transcriptBackupFile);
            }
            catch { }
            try {
                if (fs.existsSync(traceBackupFile))
                    (0, reliability_ledger_1.rollbackContextSourceTraceMaintenance)(traceBackupFile);
            }
            catch { }
            try {
                if (fs.existsSync(idempotencyBackupFile))
                    (0, reliability_ledger_1.rollbackContextSourceIdempotencyMaintenance)(idempotencyBackupFile);
            }
            catch { }
            for (const backup of backups)
                try {
                    if (fs.existsSync(backup.backupFile))
                        fs.copyFileSync(backup.backupFile, backup.originalFile);
                }
                catch { }
            (0, atomic_json_file_1.writeJsonAtomic)(path.join(JOB_DIR, jobId, "manifest.json"), { schema: "ccm-context-source-maintenance-job-v1", version: 1, jobId, identity, planChecksum, reason, actor: String(input?.actor || "memory-center"), status: "rolled_back_after_failure", error: String(error?.message || error).slice(0, 500), backups: backups.map(row => ({ ...row })), failedAt: new Date().toISOString(), contentStored: false });
            throw error;
        }
    }, { timeoutMs: 30_000 });
}
function rollbackContextSourceMaintenance(input) {
    const jobId = cleanSegment(input?.jobId || input?.job_id);
    const reason = String(input?.reason || "").trim();
    if (!jobId || !reason)
        throw new Error("context_source_maintenance_job_and_reason_required");
    return (0, atomic_json_file_1.withFileLock)(LOCK_FILE, () => {
        const manifestFile = path.join(JOB_DIR, jobId, "manifest.json");
        if (!fs.existsSync(manifestFile))
            throw new Error("context_source_maintenance_job_missing");
        const manifest = readJson(manifestFile);
        if (manifest.status === "rolled_back")
            return { success: true, jobId, status: "rolled_back", restoredFileCount: 0, idempotent: true, contentStored: false };
        let restoredFileCount = 0;
        for (const backup of manifest.backups || []) {
            if (!fs.existsSync(backup.backupFile))
                throw new Error(`context_source_maintenance_backup_missing:${backup.id}`);
            fs.copyFileSync(backup.backupFile, backup.originalFile);
            restoredFileCount += 1;
        }
        let restoredIdempotencyCount = 0;
        if (manifest.idempotencyResult?.backupFile && fs.existsSync(manifest.idempotencyResult.backupFile))
            restoredIdempotencyCount = (0, reliability_ledger_1.rollbackContextSourceIdempotencyMaintenance)(manifest.idempotencyResult.backupFile).restored;
        let restoredTraceCount = 0;
        if (manifest.traceResult?.backupFile && fs.existsSync(manifest.traceResult.backupFile))
            restoredTraceCount = (0, reliability_ledger_1.rollbackContextSourceTraceMaintenance)(manifest.traceResult.backupFile).restored;
        let restoredTranscriptCount = 0;
        if (manifest.globalTranscriptResult?.backupFile && manifest.globalTranscriptResult?.file)
            restoredTranscriptCount = globalTranscriptMaintenance().rollbackGlobalTranscriptContextSourceMaintenance(manifest.globalTranscriptResult.file, manifest.globalTranscriptResult.backupFile).restored;
        const next = { ...manifest, status: "rolled_back", rollbackReason: reason, rollbackActor: String(input?.actor || "memory-center"), rolledBackAt: new Date().toISOString() };
        (0, atomic_json_file_1.writeJsonAtomic)(manifestFile, next);
        return { success: true, jobId, status: next.status, restoredFileCount, restoredIdempotencyCount, restoredTraceCount, restoredTranscriptCount, contentStored: false };
    }, { timeoutMs: 30_000 });
}
function contextSourceHistoryMaintenanceSelfTest() {
    const projected = projectPersistedSources({ session_id: "s", events: [{ type: "tool_result", toolName: "query_knowledge", payload: { context: "BODY_SENTINEL", results: [{ filename: "a.md", citation: "a.md#0", text: "BODY_SENTINEL" }] } }] }, { scope: "global", scopeId: "global-agent", sessionId: "s", generation: 0 });
    return { pass: projected.changed === 1 && !JSON.stringify(projected.output).includes("BODY_SENTINEL"), projected: { changed: projected.changed, removedTokens: projected.removedTokens, unresolved: projected.unresolved } };
}
//# sourceMappingURL=context-source-history-maintenance.js.map