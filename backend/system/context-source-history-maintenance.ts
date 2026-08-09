import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, GROUP_MESSAGES_DIR } from "../core/utils";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { estimateTextTokens } from "./context-budget";
import {
  extractStructuredContextSourceRefs,
  promoteContextSourceReceipts,
  type ContextSourceMemoryKind,
} from "./main-agent-context-source-continuity";
import { isContextSourceToolResult, projectContextSourceToolResultForPersistence } from "./context-source-tool-result-projection";
import {
  applyContextSourceIdempotencyMaintenance,
  applyContextSourceTraceMaintenance,
  buildContextSourceIdempotencyMaintenancePlan,
  buildContextSourceTraceMaintenancePlan,
  rollbackContextSourceIdempotencyMaintenance,
  rollbackContextSourceTraceMaintenance,
} from "./reliability-ledger";

function globalTranscriptMaintenance() {
  return require("../agents/global/memory") as typeof import("../agents/global/memory");
}

type MaintenanceScope = "global" | "project" | "group";
type ExactIdentity = { scope: MaintenanceScope; scopeId: string; sessionId: string; generation: number };

const ROOT = path.join(CCM_DIR, "memory-control", "context-source-maintenance");
const PLAN_DIR = path.join(ROOT, "plans");
const JOB_DIR = path.join(ROOT, "jobs");
const LOCK_FILE = path.join(ROOT, "maintenance.lock");

function hash(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function cleanSegment(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._@-]+/g, "-").slice(0, 120);
}

function contained(root: string, ...segments: string[]) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, ...segments);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error("context_source_maintenance_path_outside_root");
  return resolved;
}

function normalizeIdentity(input: any): ExactIdentity {
  const scope = String(input?.scope || "") as MaintenanceScope;
  const scopeId = String(input?.scopeId || input?.scope_id || "").trim();
  const sessionId = String(input?.sessionId || input?.session_id || "").trim();
  if (!(["global", "project", "group"] as string[]).includes(scope) || !scopeId || !sessionId) throw new Error("context_source_maintenance_exact_scope_session_required");
  return { scope, scopeId, sessionId, generation: Math.max(0, Math.floor(Number(input?.generation || 0))) };
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fileChecksum(file: string) {
  return hash(fs.readFileSync(file));
}

function existingFiles(identity: ExactIdentity) {
  const candidates: string[] = [];
  if (identity.scope === "project") {
    candidates.push(contained(path.join(CCM_DIR, "web-sessions"), identity.scopeId, `${identity.sessionId}.json`));
  } else if (identity.scope === "global") {
    candidates.push(
      path.join(CCM_DIR, "global-agent-runs", "runs.json"),
      path.join(CCM_DIR, "global-agent-runtime", "runs.json"),
      path.join(CCM_DIR, "global-agent-history.json"),
      path.join(CCM_DIR, "global-agent-memory", "memory.json"),
    );
  } else {
    candidates.push(path.join(GROUP_MESSAGES_DIR, "sessions", cleanSegment(identity.scopeId), `${cleanSegment(identity.sessionId)}.json`));
  }
  return [...new Set(candidates)].filter(file => fs.existsSync(file) && fs.statSync(file).isFile());
}

function belongsToExactSession(value: any, identity: ExactIdentity) {
  if (identity.scope === "project") return true;
  const text = JSON.stringify(value ?? null);
  if (!text.includes(identity.sessionId)) return false;
  return identity.scope !== "group" || text.includes(identity.scopeId);
}

function projectPersistedSources(value: any, identity: ExactIdentity) {
  let changed = 0;
  let removedTokens = 0;
  let unresolved = 0;
  const visit = (current: any): any => {
    if (Array.isArray(current)) return current.map(visit);
    if (!current || typeof current !== "object") return current;
    if (!belongsToExactSession(current, identity) && (current.session_id || current.sessionId || current.exactSessionId)) return current;
    const next: any = { ...current };
    const toolName = current.toolName || current.tool_name || current.tool?.name || current.tool || current.name || "";
    const sourceTool = isContextSourceToolResult(toolName, current);
    const fields = current.type === "tool_result" ? ["payload"]
      : current.type === "tool_completed" ? ["observation"]
        : ["observation", "rawOutput", "raw_output", "result", "output"];
    if (sourceTool) {
      let projectedAny = false;
      for (const field of fields) {
        if (current[field] === undefined) continue;
        const projected = projectContextSourceToolResultForPersistence(toolName, current[field], current.arguments?.query || current.query || "");
        if (projected === current[field]) continue;
        removedTokens += Math.max(0, estimateTextTokens(JSON.stringify(current[field])) - estimateTextTokens(JSON.stringify(projected)));
        next[field] = projected;
        changed += 1;
        projectedAny = true;
      }
      if (!projectedAny) unresolved += 1;
    }
    for (const [key, nested] of Object.entries(next)) {
      if (fields.includes(key) && sourceTool) continue;
      next[key] = visit(nested);
    }
    return next;
  };
  const output = visit(value);
  return { output, changed, removedTokens, unresolved };
}

function projectMemoryFile(identity: ExactIdentity) {
  const dir = path.join(CCM_DIR, "project-memory");
  if (!fs.existsSync(dir)) return "";
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
    const file = path.join(dir, name);
    try { if (String(readJson(file)?.project || "") === identity.scopeId) return file; } catch {}
  }
  return "";
}

function promotionBackfillCandidates(identity: ExactIdentity) {
  const rows: any[] = [];
  if (identity.scope === "project") {
    const file = projectMemoryFile(identity);
    if (file) {
      const memory = readJson(file);
      for (const item of Array.isArray(memory?.durableMemories) ? memory.durableMemories : []) {
        if (String(item?.source?.sessionId || "") !== identity.sessionId) continue;
        const sourceRefs = extractStructuredContextSourceRefs(item?.sourceRefs, item?.evidence);
        if (!sourceRefs.length) continue;
        rows.push({ memoryKind: "project_durable_memory" as ContextSourceMemoryKind, memoryId: String(item.id || ""), admissionChecksum: hash(item?.taxonomy || item), sourceRefs });
      }
    }
  } else if (identity.scope === "group") {
    const dir = path.join(CCM_DIR, "promoted-memory");
    if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
      const store = readJson(path.join(dir, name));
      for (const entry of Array.isArray(store?.entries) ? store.entries : []) {
        if (String(entry?.status || "active") !== "active") continue;
        if (!(entry?.sources || []).some((source: any) => String(source?.groupId || "") === identity.scopeId && String(source?.groupSessionId || "") === identity.sessionId)) continue;
        const sourceRefs = extractStructuredContextSourceRefs(entry?.sourceRefs);
        if (!sourceRefs.length) continue;
        rows.push({ memoryKind: "group_typed_memory" as ContextSourceMemoryKind, memoryId: String(entry.promotionId || ""), admissionChecksum: hash([entry.promotionId, entry.updatedAt, entry.sources]), sourceRefs });
      }
    }
  }
  return rows.filter(row => row.memoryId);
}

function exactGlobalRunIds(identity: ExactIdentity) {
  if (identity.scope !== "global") return [];
  const file = path.join(CCM_DIR, "global-agent-runs", "runs.json");
  if (!fs.existsSync(file)) return [];
  try {
    const store = readJson(file);
    return (Array.isArray(store?.runs) ? store.runs : []).filter((run: any) => String(run?.session_id || run?.sessionId || "") === identity.sessionId).map((run: any) => String(run?.id || "")).filter(Boolean);
  } catch { return []; }
}

function exactGlobalTraceIds(identity: ExactIdentity) {
  if (identity.scope !== "global") return [];
  const file = path.join(CCM_DIR, "global-agent-runs", "runs.json");
  if (!fs.existsSync(file)) return [];
  try {
    const store = readJson(file);
    return (Array.isArray(store?.runs) ? store.runs : []).filter((run: any) => String(run?.session_id || run?.sessionId || "") === identity.sessionId).map((run: any) => String(run?.trace_id || run?.traceId || "")).filter(Boolean);
  } catch { return []; }
}

function buildPlan(identity: ExactIdentity) {
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
  const idempotency = buildContextSourceIdempotencyMaintenancePlan(exactGlobalRunIds(identity));
  const traceEvents = buildContextSourceTraceMaintenancePlan(exactGlobalTraceIds(identity));
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
    estimatedRemovedBodyTokens: files.reduce((sum, row) => sum + row.removedTokens, 0) + idempotency.reduce((sum: number, row: any) => sum + Number(row.removedTokens || 0), 0) + traceEvents.reduce((sum: number, row: any) => sum + Number(row.removedTokens || 0), 0) + Number(globalTranscript?.removedTokens || 0),
    unresolvedCount: files.reduce((sum, row) => sum + row.unresolvedCount, 0),
    promotionBackfillCount: promotions.length,
    contentStored: false,
  };
  return { ...core, planChecksum: hash(core) };
}

function publicPlan(plan: any) {
  return {
    success: true,
    schema: plan.schema,
    identity: plan.identity,
    planChecksum: plan.planChecksum,
    affectedRecordCount: plan.affectedRecordCount,
    estimatedRemovedBodyTokens: plan.estimatedRemovedBodyTokens,
    promotionBackfillCount: plan.promotionBackfillCount,
    unresolvedCount: plan.unresolvedCount,
    files: plan.files.map((row: any) => ({ id: row.id, checksum: row.fileChecksum, changeCount: row.changeCount, removedTokens: row.removedTokens, unresolvedCount: row.unresolvedCount })),
    promotionIds: plan.promotions.map((row: any) => row.memoryId),
    idempotencyRecordCount: plan.idempotency.length,
    traceRecordCount: plan.traceEvents.length,
    encryptedTranscriptRecordCount: Number(plan.globalTranscript?.changed || 0),
    contentStored: false,
  };
}

export function previewContextSourceMaintenance(input: any) {
  const identity = normalizeIdentity(input);
  const plan = buildPlan(identity);
  fs.mkdirSync(PLAN_DIR, { recursive: true });
  writeJsonAtomic(path.join(PLAN_DIR, `${plan.planChecksum}.json`), plan);
  return publicPlan(plan);
}

export function applyContextSourceMaintenance(input: any) {
  const identity = normalizeIdentity(input);
  const planChecksum = String(input?.planChecksum || input?.plan_checksum || "").trim();
  const reason = String(input?.reason || "").trim();
  if (!planChecksum || !reason) throw new Error("context_source_maintenance_checksum_and_reason_required");
  return withFileLock(LOCK_FILE, () => {
    const planFile = path.join(PLAN_DIR, `${cleanSegment(planChecksum)}.json`);
    if (!fs.existsSync(planFile)) throw new Error("context_source_maintenance_plan_missing");
    const plan = readJson(planFile);
    const { planChecksum: storedPlanChecksum, ...planCore } = plan;
    if (storedPlanChecksum !== planChecksum || hash(planCore) !== planChecksum) throw new Error("context_source_maintenance_plan_checksum_invalid");
    if (JSON.stringify(plan.identity) !== JSON.stringify(identity)) throw new Error("context_source_maintenance_identity_mismatch");
    for (const row of plan.files) if (!fs.existsSync(row.file) || fileChecksum(row.file) !== row.fileChecksum) throw new Error(`context_source_maintenance_source_drift:${row.id}`);
    const currentIdempotency = buildContextSourceIdempotencyMaintenancePlan(exactGlobalRunIds(identity));
    if (hash(currentIdempotency.map((row: any) => [row.scope, row.keyChecksum, row.resultChecksum])) !== hash(plan.idempotency.map((row: any) => [row.scope, row.keyChecksum, row.resultChecksum]))) throw new Error("context_source_maintenance_idempotency_drift");
    const currentTraceEvents = buildContextSourceTraceMaintenancePlan(exactGlobalTraceIds(identity));
    if (hash(currentTraceEvents.map((row: any) => [row.traceId, row.eventId, row.dataChecksum])) !== hash(plan.traceEvents.map((row: any) => [row.traceId, row.eventId, row.dataChecksum]))) throw new Error("context_source_maintenance_trace_drift");
    const currentTranscript = identity.scope === "global" ? globalTranscriptMaintenance().previewGlobalTranscriptContextSourceMaintenance(identity.sessionId) : null;
    if (String(currentTranscript?.fileChecksum || "") !== String(plan.globalTranscript?.fileChecksum || "")) throw new Error("context_source_maintenance_global_transcript_drift");
    const jobId = `csm_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const backupDir = path.join(JOB_DIR, jobId, "backup");
    fs.mkdirSync(backupDir, { recursive: true });
    const backups: any[] = [];
    const idempotencyBackupFile = path.join(backupDir, "global-agent-tool-idempotency.json");
    const traceBackupFile = path.join(backupDir, "global-agent-trace-events.json");
    const transcriptBackupFile = path.join(backupDir, "global-transcript.enc.json");
    let idempotencyResult: any = { updated: 0, backupFile: "" };
    let traceResult: any = { updated: 0, backupFile: "" };
    let globalTranscriptResult: any = { updated: 0, backupFile: "", file: plan.globalTranscript?.file || "" };
    try {
      for (const row of plan.files) {
        const backup = path.join(backupDir, `${row.id}.json`);
        fs.copyFileSync(row.file, backup);
        backups.push({ id: row.id, originalFile: row.file, backupFile: backup, checksum: row.fileChecksum });
        const projected = projectPersistedSources(readJson(row.file), identity);
        writeJsonAtomic(row.file, projected.output);
      }
      idempotencyResult = plan.idempotency.length ? applyContextSourceIdempotencyMaintenance(plan.idempotency, idempotencyBackupFile) : idempotencyResult;
      traceResult = plan.traceEvents.length ? applyContextSourceTraceMaintenance(plan.traceEvents, traceBackupFile) : traceResult;
      globalTranscriptResult = plan.globalTranscript?.changed
        ? { ...globalTranscriptMaintenance().applyGlobalTranscriptContextSourceMaintenance(plan.globalTranscript, transcriptBackupFile), file: plan.globalTranscript?.file || "" }
        : globalTranscriptResult;
      const promotionResults: any[] = [];
      for (const candidate of plan.promotions) {
        try {
          promotionResults.push({ memoryId: candidate.memoryId, ...promoteContextSourceReceipts({
            identity: { agentKind: identity.scope, scope: identity.scope, scopeId: identity.scopeId, exactSessionId: identity.sessionId, generation: identity.generation } as any,
            sourceRefs: candidate.sourceRefs,
            memoryKind: candidate.memoryKind,
            memoryId: candidate.memoryId,
            admissionChecksum: candidate.admissionChecksum,
          }) });
        } catch (error: any) {
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
      writeJsonAtomic(path.join(JOB_DIR, jobId, "manifest.json"), manifest);
      return { success: true, jobId, status: manifest.status, affectedRecordCount: manifest.affectedRecordCount, estimatedRemovedBodyTokens: manifest.estimatedRemovedBodyTokens, promotionResults, idempotencyRecordCount: idempotencyResult.updated, traceRecordCount: traceResult.updated, encryptedTranscriptRecordCount: globalTranscriptResult.updated, contentStored: false };
    } catch (error: any) {
      try { if (fs.existsSync(transcriptBackupFile) && plan.globalTranscript?.file) globalTranscriptMaintenance().rollbackGlobalTranscriptContextSourceMaintenance(plan.globalTranscript.file, transcriptBackupFile); } catch {}
      try { if (fs.existsSync(traceBackupFile)) rollbackContextSourceTraceMaintenance(traceBackupFile); } catch {}
      try { if (fs.existsSync(idempotencyBackupFile)) rollbackContextSourceIdempotencyMaintenance(idempotencyBackupFile); } catch {}
      for (const backup of backups) try { if (fs.existsSync(backup.backupFile)) fs.copyFileSync(backup.backupFile, backup.originalFile); } catch {}
      writeJsonAtomic(path.join(JOB_DIR, jobId, "manifest.json"), { schema: "ccm-context-source-maintenance-job-v1", version: 1, jobId, identity, planChecksum, reason, actor: String(input?.actor || "memory-center"), status: "rolled_back_after_failure", error: String(error?.message || error).slice(0, 500), backups: backups.map(row => ({ ...row })), failedAt: new Date().toISOString(), contentStored: false });
      throw error;
    }
  }, { timeoutMs: 30_000 });
}

export function rollbackContextSourceMaintenance(input: any) {
  const jobId = cleanSegment(input?.jobId || input?.job_id);
  const reason = String(input?.reason || "").trim();
  if (!jobId || !reason) throw new Error("context_source_maintenance_job_and_reason_required");
  return withFileLock(LOCK_FILE, () => {
    const manifestFile = path.join(JOB_DIR, jobId, "manifest.json");
    if (!fs.existsSync(manifestFile)) throw new Error("context_source_maintenance_job_missing");
    const manifest = readJson(manifestFile);
    if (manifest.status === "rolled_back") return { success: true, jobId, status: "rolled_back", restoredFileCount: 0, idempotent: true, contentStored: false };
    let restoredFileCount = 0;
    for (const backup of manifest.backups || []) {
      if (!fs.existsSync(backup.backupFile)) throw new Error(`context_source_maintenance_backup_missing:${backup.id}`);
      fs.copyFileSync(backup.backupFile, backup.originalFile);
      restoredFileCount += 1;
    }
    let restoredIdempotencyCount = 0;
    if (manifest.idempotencyResult?.backupFile && fs.existsSync(manifest.idempotencyResult.backupFile)) restoredIdempotencyCount = rollbackContextSourceIdempotencyMaintenance(manifest.idempotencyResult.backupFile).restored;
    let restoredTraceCount = 0;
    if (manifest.traceResult?.backupFile && fs.existsSync(manifest.traceResult.backupFile)) restoredTraceCount = rollbackContextSourceTraceMaintenance(manifest.traceResult.backupFile).restored;
    let restoredTranscriptCount = 0;
    if (manifest.globalTranscriptResult?.backupFile && manifest.globalTranscriptResult?.file) restoredTranscriptCount = globalTranscriptMaintenance().rollbackGlobalTranscriptContextSourceMaintenance(manifest.globalTranscriptResult.file, manifest.globalTranscriptResult.backupFile).restored;
    const next = { ...manifest, status: "rolled_back", rollbackReason: reason, rollbackActor: String(input?.actor || "memory-center"), rolledBackAt: new Date().toISOString() };
    writeJsonAtomic(manifestFile, next);
    return { success: true, jobId, status: next.status, restoredFileCount, restoredIdempotencyCount, restoredTraceCount, restoredTranscriptCount, contentStored: false };
  }, { timeoutMs: 30_000 });
}

export function contextSourceHistoryMaintenanceSelfTest() {
  const projected = projectPersistedSources({ session_id: "s", events: [{ type: "tool_result", toolName: "query_knowledge", payload: { context: "BODY_SENTINEL", results: [{ filename: "a.md", citation: "a.md#0", text: "BODY_SENTINEL" }] } }] }, { scope: "global", scopeId: "global-agent", sessionId: "s", generation: 0 });
  return { pass: projected.changed === 1 && !JSON.stringify(projected.output).includes("BODY_SENTINEL"), projected: { changed: projected.changed, removedTokens: projected.removedTokens, unresolved: projected.unresolved } };
}
