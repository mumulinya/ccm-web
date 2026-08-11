// agent-sessions-shared.ts — merged from 2 part files (behavior-freeze merge).

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  AGENT_RUNTIMES,
  getAgentRuntime,
  normalizeAgentRuntimeId,
} from "../agents/runtime";
import {
  verifyFinalWorkerDispatchPayloadGate,
} from "../agents/final-dispatch-payload-gate";
import {
  verifyFinalDispatchReactiveCompactReceipt,
} from "../agents/final-dispatch-reactive-compact";
import {
  verifyNativeSessionContinuationEvidence,
} from "../agents/native-continuation";
import {
  trustedMemorySourceChecksum,
  verifyTrustedMemoryPromptEnvelope,
} from "../agents/trusted-memory-prompt-envelope";
import {
  verifyProviderMemoryChannelEvidence,
} from "../agents/provider-memory-channel";
import {
  readMemoryContextConsumptionReceipt,
  removeMemoryContextConsumptionReceiptIfUnreferenced,
} from "../integrations/memory-context-consumption-receipt";
import {
  removeMemoryContextConsumptionRecoveryIfUnreferenced,
  verifyMemoryContextConsumptionRecovery,
} from "../integrations/memory-context-consumption-recovery";
import {
  CCM_DIR,
} from "../core/utils";
import {
  withFileLock as withAtomicFileLock,
} from "../core/atomic-json-file";
import {
  extractGroupPostTurnSummaryDeliveryCapsule,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "../modules/collaboration/group-post-turn-summary";
import {
  verifyGroupCompactTransactionReceipt,
} from "../modules/collaboration/group-memory-compaction";
import {
  validateGroupCompactHeadBinding,
} from "../modules/collaboration/group-compact-head";
import {
  ensureGroupSessionLifecycleHead,
  validateGroupSessionLifecycleBinding,
} from "../modules/collaboration/group-session-lifecycle-head";
import {
  readTaskAgentInvocationLineage,
} from "./task-agent-invocation-lineage";
import {
  tryRecordTaskAgentContinuationSoakEvent,
} from "./task-agent-continuation-soak";
import {
  buildTaskAgentMemoryTransportUsageReceipt,
  verifyTaskAgentMemoryTransportUsageReceipt,
} from "./task-agent-memory-transport-usage";
import {
  attachTaskAgentMemoryEntrySyncPlan,
  buildTaskAgentMemoryEntryManifest,
  buildTaskAgentMemoryEntrySyncPlan,
  stripTaskAgentMemoryEntrySync,
  taskAgentMemoryEntrySyncPlan,
  taskAgentMemorySemanticChecksum,
  taskAgentMemoryTransport,
  verifyTaskAgentMemoryEntryManifest,
  verifyTaskAgentMemoryEntrySyncPlan,
} from "./task-agent-memory-entry-sync";

// ===== merged from agent-sessions-shared-part-01.ts =====

export const STORE_FILE = path.join(CCM_DIR, "task-agent-sessions.json");

export const STORE_BACKUP_FILE = `${STORE_FILE}.bak`;

export const STORE_LOCK_FILE = `${STORE_FILE}.lock`;

export const STORE_LOCK_TIMEOUT_MS = 15_000;

export const STORE_LOCK_STALE_MS = 60_000;

export const STORE_LOCK_RETRY_MS = 20;

export const MEMORY_CONTEXT_SNAPSHOT_DIR = path.join(CCM_DIR, "task-agent-memory-context-snapshots");

export const MAX_SESSION_RECORDS = 500;

export const MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION = 20;

export const TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA = "ccm-task-agent-memory-context-snapshot-v1";

export const TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA = "ccm-task-agent-memory-snapshot-sync-v1";

export const TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA = "ccm-task-agent-memory-snapshot-sync-commit-v1";

export const TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA = "ccm-task-agent-memory-prompt-injection-proof-v1";

export const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = 30;

export const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = 45;

export const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = 5;

export const MEMORY_ENTRY_RENDER_LEASE_TTL_MS = 120_000;

export const MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT = 20;

export const MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES = 2;

export const MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS = 80;

export const MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS = 240;

export const MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS = 40;

export const MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA = "ccm-task-agent-memory-entry-render-contention-v1";

export const FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;


export type TaskAgentMemoryContextSnapshotRef = {
  snapshotId: string;
  snapshotPath: string;
  checksum: string;
  workerContextPacketId?: string;
  workerHandoffId?: string;
  gateIds?: string[];
  deliveryReceiptId?: string;
  deliveryReceiptPath?: string;
  deliveryReceiptChecksum?: string;
  deliveryStatus?: string;
  deliveredAt?: string;
  latestDeliveryAttemptReceiptId?: string;
  latestDeliveryAttemptReceiptPath?: string;
  latestDeliveryAttemptReceiptChecksum?: string;
  latestDeliveryAttemptStatus?: string;
  latestDeliveryAttemptAt?: string;
  generatedAt: string;
  invocationEdgeId?: string;
  branchId?: string;
  memorySnapshotSyncAction?: "initialize" | "prompt_update" | "none";
  memorySnapshotSyncChecksum?: string;
  memorySnapshotSyncedFromId?: string;
  memorySnapshotSyncCommitPath?: string;
  memorySnapshotSyncCommitChecksum?: string;
  memorySnapshotSyncCommitStatus?: "committed" | "rejected";
  memorySnapshotSyncCommittedAt?: string;
};


export type TaskAgentSession = {
  id: string;
  scopeId: string;
  taskId: string;
  groupId: string;
  groupSessionId?: string;
  project: string;
  agentType: string;
  nativeSessionId: string;
  resumeMode: "native" | "scratchpad";
  status: "open" | "suspended" | "closed";
  turnCount: number;
  lastTurnSucceeded: boolean | null;
  createdAt: string;
  lastUsedAt: string;
  closedAt: string;
  closeReason: string;
  suspendedAt?: string;
  suspendReason?: string;
  nativeCaptureFailures?: number;
  nativeRecoveryAttempts?: number;
  nativeSessionHistory?: string[];
  lastNativeRecoveryAt?: string;
  lastError?: string;
  permissionDriftCount?: number;
  lastPermissionDriftAt?: string;
  runtimeSnapshotId?: string;
  runtimeSnapshotPath?: string;
  mcpConfigPath?: string;
  allowedTools?: any;
  permissionRules?: any[];
  runtimeToolUpdatedAt?: string;
  memoryContextSnapshotId?: string;
  memoryContextSnapshotPath?: string;
  memoryContextSnapshotChecksum?: string;
  memoryContextPacketId?: string;
  memoryContextSnapshotAt?: string;
  memoryContextSnapshots?: TaskAgentMemoryContextSnapshotRef[];
  memoryContextDeliveryReceiptId?: string;
  memoryContextDeliveryReceiptPath?: string;
  memoryContextDeliveryReceiptChecksum?: string;
  memoryContextDeliveryStatus?: string;
  memoryContextDeliveredAt?: string;
  latestMemoryContextDeliveryAttemptReceiptId?: string;
  latestMemoryContextDeliveryAttemptReceiptPath?: string;
  latestMemoryContextDeliveryAttemptReceiptChecksum?: string;
  latestMemoryContextDeliveryAttemptStatus?: string;
  latestMemoryContextDeliveryAttemptAt?: string;
  memorySnapshotSyncCommitPath?: string;
  memorySnapshotSyncCommitChecksum?: string;
  memorySnapshotSyncCommitStatus?: string;
  memorySnapshotSyncCommittedAt?: string;
  modelContextWindow?: number;
  capacityEvidenceChecksum?: string;
  capacityRevalidationRequired?: boolean;
  capacityDowngradeGate?: any;
  capacityRevalidationProof?: any;
  capacityRevalidationCommitReceipt?: any;
  modelId?: string;
  modelCapabilitySource?: string;
  modelCapabilityCheckedAt?: string;
  modelIdentityHistory?: any[];
  providerContractId?: string;
  /**
   * The durable third-party conversation is scoped to the visible parent
   * conversation, target project, and runtime. Task records remain separate
   * so receipts and leases cannot cross task boundaries.
   */
  continuityKey?: string;
  continuityScope?: "project" | "group" | "global";
  continuityExactSessionId?: string;
  continuityGeneration?: number;
  continuityMode?: "reused" | "fresh" | "isolated_branch";
  continuitySourceSessionId?: string;
  continuityBranchId?: string;
  pendingProviderContractId?: string;
  providerRuntimeVersion?: string;
  providerRuntimeIdentityChecksum?: string;
  providerContractHistory?: any[];
  lastProviderContractTransitionAt?: string;
  providerContextUsageBaseline?: any;
  finalDispatchReactiveCompactCircuitBreaker?: any;
  compaction?: any;
  memoryEntrySyncRenderLease?: any;
  memoryEntrySyncRenderLeaseHistory?: any[];
  memoryEntrySyncRenderFencingToken?: number;
  memoryEntrySyncRenderLeaseTakeoverCount?: number;
  memoryEntrySyncRenderContentionCount?: number;
  memoryEntrySyncRenderWaitResolvedCount?: number;
  memoryEntrySyncRenderWaitTimeoutCount?: number;
  memoryEntrySyncRenderSameProcessConflictCount?: number;
  memoryEntrySyncRenderWaitTotalMs?: number;
  memoryEntrySyncRenderLastContention?: any;
};


export function emptyStore() {
  return { version: 1, sessions: [] as TaskAgentSession[] };
}


export function loadStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return {
      version: 1,
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    };
  } catch {
    try {
      const recovered = JSON.parse(fs.readFileSync(STORE_BACKUP_FILE, "utf-8"));
      return { version: 1, sessions: Array.isArray(recovered?.sessions) ? recovered.sessions : [] };
    } catch { return emptyStore(); }
  }
}


export function saveStore(store: any) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const ordered = [...(store.sessions || [])]
    .sort((a: any, b: any) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)));
  const active = ordered.filter((item: any) => item.status === "open");
  const terminal = ordered.filter((item: any) => item.status !== "open");
  // Active sessions are execution state, not history. Never evict them merely
  // because the bounded historical store reached its retention limit.
  const sessions = [...terminal.slice(-Math.max(0, MAX_SESSION_RECORDS - active.length)), ...active]
    .sort((a: any, b: any) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)));
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  if (fs.existsSync(STORE_FILE)) {
    try {
      JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
      fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE);
    } catch {}
  }
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, sessions }, null, 2), "utf-8");
  fs.renameSync(tmp, STORE_FILE);
}


export function createNativeSessionId(agentType: string) {
  return normalizeAgentRuntimeId(agentType) === "claudecode" ? crypto.randomUUID() : "";
}


export function safeStringify(value: any) {
  const seen = new WeakSet<object>();
  return JSON.stringify(value || {}, (_key, item) => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    return item;
  });
}


export function hashValue(value: any, len = 24) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : safeStringify(value)).digest("hex").slice(0, len);
}

export function buildTaskAgentContinuityBinding(input: {
  scope: "project" | "group" | "global";
  scopeId: string;
  exactSessionId: string;
  project: string;
  agentType: string;
}) {
  const scope = input.scope;
  const scopeId = String(input.scopeId || "").trim();
  const exactSessionId = String(input.exactSessionId || "").trim();
  const project = String(input.project || "").trim();
  const agentType = normalizeAgentRuntimeId(input.agentType);
  if (!scopeId || !exactSessionId || !project || !agentType) return null;
  return {
    key: `tac_${hashValue([scope, scopeId, exactSessionId, project, agentType], 28)}`,
    scope,
    scopeId,
    exactSessionId,
    project,
    agentType,
  } as const;
}


export function safeReadJson(file: string, fallback: any = null) {
  try {
    if (!file || !fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}


export function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  fs.renameSync(tmp, file);
}


export type TaskAgentSessionStoreLock = {
  schema: "ccm-task-agent-session-store-lock-v1";
  token: string;
  pid: number;
  acquiredAt: string;
  expiresAt: string;
};


export const STORE_LOCK_WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));


export function sleepForStoreLock(ms: number) {
  Atomics.wait(STORE_LOCK_WAIT_ARRAY, 0, 0, Math.max(1, ms));
}


export function processIsAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: any) {
    return error?.code === "EPERM";
  }
}


export function readTaskAgentSessionStoreLock() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_LOCK_FILE, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed as TaskAgentSessionStoreLock : null;
  } catch {
    return null;
  }
}


export function removeStaleTaskAgentSessionStoreLock(nowMs = Date.now()) {
  if (!fs.existsSync(STORE_LOCK_FILE)) return false;
  const current = readTaskAgentSessionStoreLock();
  let stale = false;
  if (current) {
    const expiresAt = Date.parse(String(current.expiresAt || ""));
    stale = !processIsAlive(Number(current.pid || 0)) || (Number.isFinite(expiresAt) && expiresAt <= nowMs);
  } else {
    try {
      stale = nowMs - fs.statSync(STORE_LOCK_FILE).mtimeMs >= STORE_LOCK_STALE_MS;
    } catch {
      stale = true;
    }
  }
  if (!stale) return false;
  try {
    fs.rmSync(STORE_LOCK_FILE, { force: true });
    return true;
  } catch {
    return false;
  }
}


export function acquireTaskAgentSessionStoreLock(timeoutMs = STORE_LOCK_TIMEOUT_MS) {
  fs.mkdirSync(path.dirname(STORE_LOCK_FILE), { recursive: true });
  const deadline = Date.now() + Math.max(1, timeoutMs);
  while (Date.now() <= deadline) {
    const acquiredAtMs = Date.now();
    const lock: TaskAgentSessionStoreLock = {
      schema: "ccm-task-agent-session-store-lock-v1",
      token: crypto.randomBytes(16).toString("hex"),
      pid: process.pid,
      acquiredAt: new Date(acquiredAtMs).toISOString(),
      expiresAt: new Date(acquiredAtMs + STORE_LOCK_STALE_MS).toISOString(),
    };
    try {
      const fd = fs.openSync(STORE_LOCK_FILE, "wx", 0o600);
      try {
        fs.writeFileSync(fd, `${JSON.stringify(lock)}\n`, "utf-8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      return lock;
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      removeStaleTaskAgentSessionStoreLock();
      sleepForStoreLock(STORE_LOCK_RETRY_MS);
    }
  }
  const owner = readTaskAgentSessionStoreLock();
  throw new Error(`task Agent session store lock timeout${owner?.pid ? ` (owner pid ${owner.pid})` : ""}`);
}


export function releaseTaskAgentSessionStoreLock(lock: TaskAgentSessionStoreLock) {
  const current = readTaskAgentSessionStoreLock();
  if (!current || current.token !== lock.token || Number(current.pid || 0) !== process.pid) return false;
  try {
    fs.rmSync(STORE_LOCK_FILE, { force: true });
    return true;
  } catch {
    return false;
  }
}


export function withTaskAgentSessionStoreLock<T>(operation: () => T): T {
  return withAtomicFileLock(STORE_FILE, operation, {
    timeoutMs: STORE_LOCK_TIMEOUT_MS,
    retryMs: STORE_LOCK_RETRY_MS,
    staleMs: STORE_LOCK_STALE_MS,
  });
}


export function safeFileSegment(value: any, fallback = "unknown") {
  const text = String(value || "").trim().replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  return text || fallback;
}


export function getMemoryContextSnapshotDir(sessionId: string) {
  return path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, safeFileSegment(sessionId, "session"));
}


export function getMemorySnapshotSyncCommitFile(sessionId: string, snapshotId: string) {
  return path.join(getMemoryContextSnapshotDir(sessionId), `${safeFileSegment(snapshotId, "snapshot")}.sync.json`);
}


export function collectMemoryContextGateIds(value: any, out = new Set<string>()) {
  if (!value || typeof value !== "object") return out;
  const candidates = [
    value.dispatch_gate_id,
    value.dispatchGateId,
    value.reinjection_gate_id,
    value.reinjectionGateId,
    value.revalidation_gate_id,
    value.revalidationGateId,
    value.gate_id,
    value.gateId,
    value.marker_id,
    value.markerId,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) out.add(text);
  }
  for (const key of [
    "memory",
    "group_memory",
    "groupMemory",
    "global_agent_memory",
    "globalAgentMemory",
    "references",
    "worker_context_packet",
    "workerContextPacket",
    "memory_context",
    "memoryContext",
    "dispatch_freshness_gate",
    "global_memory_health_gate",
    "post_compact_reinjection_gate",
    "post_compact_dispatch_marker",
    "compact_file_reference_read_plan_revalidation_gate",
  ]) {
    collectMemoryContextGateIds(value[key], out);
  }
  if (Array.isArray(value.items)) {
    for (const item of value.items.slice(0, 80)) {
      const id = String(item?.id || item?.globalMemoryId || item?.global_memory_id || "").trim();
      if (id) out.add(id);
    }
  }
  if (Array.isArray(value.candidates)) {
    for (const item of value.candidates.slice(0, 80)) {
      const id = String(item?.candidate_id || item?.candidateId || "").trim();
      if (id) out.add(id);
    }
  }
  return out;
}


export function normalizeMemorySnapshotRefs(value: any): TaskAgentMemoryContextSnapshotRef[] {
  return (Array.isArray(value) ? value : []).map((item: any) => ({
    snapshotId: String(item?.snapshotId || item?.snapshot_id || "").trim(),
    snapshotPath: String(item?.snapshotPath || item?.snapshot_path || "").trim(),
    checksum: String(item?.checksum || item?.snapshotChecksum || item?.snapshot_checksum || "").trim(),
    workerContextPacketId: String(item?.workerContextPacketId || item?.worker_context_packet_id || "").trim(),
    workerHandoffId: String(item?.workerHandoffId || item?.worker_handoff_id || "").trim(),
    gateIds: Array.isArray(item?.gateIds || item?.gate_ids)
      ? (item.gateIds || item.gate_ids).map((id: any) => String(id || "").trim()).filter(Boolean).slice(0, 80)
      : [],
    deliveryReceiptId: String(item?.deliveryReceiptId || item?.delivery_receipt_id || "").trim(),
    deliveryReceiptPath: String(item?.deliveryReceiptPath || item?.delivery_receipt_path || "").trim(),
    deliveryReceiptChecksum: String(item?.deliveryReceiptChecksum || item?.delivery_receipt_checksum || "").trim(),
    deliveryStatus: String(item?.deliveryStatus || item?.delivery_status || "").trim(),
    deliveredAt: String(item?.deliveredAt || item?.delivered_at || "").trim(),
    latestDeliveryAttemptReceiptId: String(item?.latestDeliveryAttemptReceiptId || item?.latest_delivery_attempt_receipt_id || "").trim(),
    latestDeliveryAttemptReceiptPath: String(item?.latestDeliveryAttemptReceiptPath || item?.latest_delivery_attempt_receipt_path || "").trim(),
    latestDeliveryAttemptReceiptChecksum: String(item?.latestDeliveryAttemptReceiptChecksum || item?.latest_delivery_attempt_receipt_checksum || "").trim(),
    latestDeliveryAttemptStatus: String(item?.latestDeliveryAttemptStatus || item?.latest_delivery_attempt_status || "").trim(),
    latestDeliveryAttemptAt: String(item?.latestDeliveryAttemptAt || item?.latest_delivery_attempt_at || "").trim(),
    generatedAt: String(item?.generatedAt || item?.generated_at || "").trim(),
    memorySnapshotSyncAction: String(item?.memorySnapshotSyncAction || item?.memory_snapshot_sync_action || "").trim() as TaskAgentMemoryContextSnapshotRef["memorySnapshotSyncAction"],
    memorySnapshotSyncChecksum: String(item?.memorySnapshotSyncChecksum || item?.memory_snapshot_sync_checksum || "").trim(),
    memorySnapshotSyncedFromId: String(item?.memorySnapshotSyncedFromId || item?.memory_snapshot_synced_from_id || "").trim(),
    memorySnapshotSyncCommitPath: String(item?.memorySnapshotSyncCommitPath || item?.memory_snapshot_sync_commit_path || "").trim(),
    memorySnapshotSyncCommitChecksum: String(item?.memorySnapshotSyncCommitChecksum || item?.memory_snapshot_sync_commit_checksum || "").trim(),
    memorySnapshotSyncCommitStatus: String(item?.memorySnapshotSyncCommitStatus || item?.memory_snapshot_sync_commit_status || "").trim() as TaskAgentMemoryContextSnapshotRef["memorySnapshotSyncCommitStatus"],
    memorySnapshotSyncCommittedAt: String(item?.memorySnapshotSyncCommittedAt || item?.memory_snapshot_sync_committed_at || "").trim(),
  })).filter((item: TaskAgentMemoryContextSnapshotRef) => item.snapshotId || item.snapshotPath);
}


export function purgeMemoryContextSnapshotsForSession(sessionId: string) {
  const dir = getMemoryContextSnapshotDir(sessionId);
  const challengeIds = collectMemoryContextConsumptionChallengeIdsFromSnapshotDir(dir);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
  for (const challengeId of challengeIds) removeMemoryContextConsumptionReceiptIfUnreferenced(challengeId);
  for (const challengeId of challengeIds) removeMemoryContextConsumptionRecoveryIfUnreferenced(challengeId);
}


export function collectMemoryContextConsumptionChallengeIdsFromSnapshotDir(dir: string) {
  const ids = new Set<string>();
  try {
    if (!pathIsInsideMemorySnapshotDir(dir) || !fs.existsSync(dir)) return ids;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith(".delivery.json") || entry.name.endsWith(".sync.json")) continue;
      const snapshot = safeReadJson(path.join(dir, entry.name), null);
      const challengeId = String(snapshot?.context?.memory_context_consumption_challenge?.challenge_id || "");
      if (/^mcrc_[a-f0-9]{28}$/.test(challengeId)) ids.add(challengeId);
    }
  } catch {}
  return ids;
}


export function normalizeSnapshotFileKey(file: any) {
  try { return path.resolve(String(file || "")).toLowerCase(); } catch { return String(file || "").toLowerCase(); }
}


export function pathIsInsideMemorySnapshotDir(file: string) {
  try {
    const base = path.resolve(MEMORY_CONTEXT_SNAPSHOT_DIR).toLowerCase();
    const target = path.resolve(file).toLowerCase();
    return target === base || target.startsWith(`${base}${path.sep}`);
  } catch {
    return false;
  }
}


export function listMemoryContextSnapshotFilesOnDisk() {
  const files: { file: string; sessionId: string }[] = [];
  try {
    if (!fs.existsSync(MEMORY_CONTEXT_SNAPSHOT_DIR)) return files;
    for (const entry of fs.readdirSync(MEMORY_CONTEXT_SNAPSHOT_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sessionDir = path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, entry.name);
      for (const fileEntry of fs.readdirSync(sessionDir, { withFileTypes: true })) {
        if (fileEntry.isFile() && fileEntry.name.endsWith(".json") && !fileEntry.name.endsWith(".delivery.json") && !fileEntry.name.endsWith(".sync.json")) {
          files.push({ file: path.join(sessionDir, fileEntry.name), sessionId: entry.name });
        }
      }
    }
  } catch {}
  return files;
}


export function verifyMemoryContextSnapshotChecksum(snapshot: any) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const expected = String(snapshot.checksum || "").trim();
  if (!expected) return false;
  const payload = { ...snapshot };
  delete payload.checksum;
  delete payload.snapshot_file;
  if (hashValue(payload) === expected) return true;
  const aliasPayload = JSON.parse(JSON.stringify(payload));
  if (aliasPayload?.context?.worker_context_packet?.memory) {
    aliasPayload.context.memory_context = aliasPayload.context.worker_context_packet.memory;
    if (hashValue(aliasPayload) === expected) return true;
  }
  return false;
}


export function memorySnapshotSyncChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.sync_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return hashValue(payload, 64);
}


export function verifyTaskAgentMemorySnapshotSyncDecision(decision: any, expected: {
  groupId?: string;
  groupSessionId?: string;
  taskId?: string;
  taskAgentSessionId?: string;
  targetProject?: string;
  currentMemoryContextChecksum?: string;
} = {}) {
  const issues: string[] = [];
  const action = String(decision?.action || "");
  if (decision?.schema !== TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA) issues.push("schema_invalid");
  if (!Number.isFinite(Number(decision?.version)) || Number(decision.version) !== 1) issues.push("version_invalid");
  if (!["initialize", "prompt_update", "none"].includes(action)) issues.push("action_invalid");
  if (!String(decision?.sync_checksum || "") || memorySnapshotSyncChecksum(decision) !== String(decision.sync_checksum || "")) issues.push("checksum_invalid");
  const expectedBindings: Array<[string, any, any]> = [
    ["group_id", expected.groupId, decision?.group_id],
    ["group_session_id", expected.groupSessionId, decision?.group_session_id],
    ["task_id", expected.taskId, decision?.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId, decision?.task_agent_session_id],
    ["target_project", expected.targetProject, decision?.target_project],
    ["current_memory_context_checksum", expected.currentMemoryContextChecksum, decision?.current_memory_context_checksum],
  ];
  for (const [field, wanted, actual] of expectedBindings) {
    if (wanted !== undefined && String(wanted || "") !== String(actual || "")) issues.push(`${field}_mismatch`);
  }
  const previousId = String(decision?.previous_snapshot_id || "");
  const previousChecksum = String(decision?.previous_memory_context_checksum || "");
  const currentChecksum = String(decision?.current_memory_context_checksum || "");
  if (!currentChecksum) issues.push("current_memory_context_checksum_missing");
  if (action === "initialize" && previousId) issues.push("initialize_previous_snapshot_present");
  if (action === "none" && (!previousId || decision?.previous_snapshot_trusted !== true || !previousChecksum || previousChecksum !== currentChecksum)) {
    issues.push("none_without_trusted_equal_snapshot");
  }
  if (action === "none" && (decision?.previous_snapshot_committed !== true || !String(decision?.previous_sync_commit_checksum || ""))) {
    issues.push("none_without_committed_snapshot");
  }
  const continuationBaselineRequired = decision?.continuation_baseline_required === true;
  if (action === "none" && decision?.enforcement_required === true
    && decision?.full_memory_projection_injected !== true && !continuationBaselineRequired) {
    issues.push("none_without_injection_or_continuation");
  }
  if (action === "none" && continuationBaselineRequired && decision?.continuation_baseline_eligible !== true) issues.push("none_without_continuation_baseline");
  if (action === "none" && continuationBaselineRequired && (!String(decision?.continuation_native_session_id || "") || !String(decision?.continuation_provider || ""))) {
    issues.push("continuation_baseline_identity_missing");
  }
  if (action === "none" && continuationBaselineRequired && (!String(decision?.continuation_delivery_receipt_id || "") || !String(decision?.continuation_delivery_receipt_checksum || ""))) {
    issues.push("continuation_baseline_receipt_missing");
  }
  if (action === "prompt_update" && previousId && decision?.previous_snapshot_trusted === true && previousChecksum === currentChecksum
    && String(decision?.reason || "") !== "continuation_baseline_unavailable") {
    issues.push("prompt_update_without_change");
  }
  const previousGroupSessionId = String(decision?.previous_group_session_id || "");
  const currentGroupSessionId = String(decision?.group_session_id || "");
  if (previousGroupSessionId.startsWith("gcs_") && currentGroupSessionId.startsWith("gcs_") && previousGroupSessionId !== currentGroupSessionId) {
    issues.push("group_session_mismatch");
  }
  return { valid: issues.length === 0, issues, action };
}


export function memoryPromptInjectionProofChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.proof_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return hashValue(payload, 64);
}


export function renderedMemoryProjection(memoryContext: any, explicit: any = undefined) {
  if (explicit !== undefined) return { text: String(explicit || ""), source: "explicit_rendered_memory_context" };
  const groupMemory = memoryContext?.schema === "ccm-group-memory-context-v1"
    ? memoryContext
    : memoryContext?.group_memory?.schema === "ccm-group-memory-context-v1"
      ? memoryContext.group_memory
      : null;
  const rendered = String(groupMemory?.rendered_text || groupMemory?.renderedText || "");
  return { text: rendered, source: rendered ? "group_memory_rendered_text" : "unavailable" };
}


export function verifyTaskAgentMemoryPromptInjectionProof(proof: any, expected: {
  groupId?: string;
  groupSessionId?: string;
  taskId?: string;
  taskAgentSessionId?: string;
  targetProject?: string;
  memoryContextChecksum?: string;
  syncChecksum?: string;
  renderedPromptChecksum?: string;
} = {}) {
  const issues: string[] = [];
  if (proof?.schema !== TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA) issues.push("schema_invalid");
  if (Number(proof?.version || 0) !== 1) issues.push("version_invalid");
  if (!String(proof?.proof_checksum || "") || memoryPromptInjectionProofChecksum(proof) !== String(proof.proof_checksum || "")) issues.push("checksum_invalid");
  const bindings: Array<[string, any, any]> = [
    ["group_id", expected.groupId, proof?.group_id],
    ["group_session_id", expected.groupSessionId, proof?.group_session_id],
    ["task_id", expected.taskId, proof?.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId, proof?.task_agent_session_id],
    ["target_project", expected.targetProject, proof?.target_project],
    ["memory_context_checksum", expected.memoryContextChecksum, proof?.memory_context_checksum],
    ["sync_checksum", expected.syncChecksum, proof?.sync_checksum],
    ["rendered_prompt_checksum", expected.renderedPromptChecksum, proof?.rendered_prompt_checksum],
  ];
  for (const [field, wanted, actual] of bindings) {
    if (wanted !== undefined && String(wanted || "") !== String(actual || "")) issues.push(`${field}_mismatch`);
  }
  const projectionPresent = proof?.projection_present === true;
  const promptBound = proof?.prompt_bound === true;
  const injectionRequired = proof?.memory_injection_required === true;
  const enforcementRequired = proof?.enforcement_required === true;
  const trustedEnvelopeRequired = proof?.trusted_envelope_required === true;
  const trustedEnvelopePresent = proof?.trusted_envelope_present === true;
  const trustedEnvelopeValid = proof?.trusted_envelope_valid === true;
  const trustedEnvelopeBound = proof?.trusted_envelope_bound === true;
  if (promptBound && !projectionPresent) issues.push("prompt_bound_without_projection");
  if (projectionPresent && (!String(proof?.rendered_memory_checksum || "") || Number(proof?.rendered_memory_chars || 0) <= 0)) issues.push("projection_evidence_missing");
  if (trustedEnvelopeValid && !trustedEnvelopePresent) issues.push("trusted_envelope_valid_without_presence");
  if (trustedEnvelopeBound && (!trustedEnvelopeValid || !projectionPresent)) issues.push("trusted_envelope_bound_without_valid_projection");
  if (trustedEnvelopePresent && (!String(proof?.trusted_envelope_checksum || "") || !String(proof?.trusted_envelope_source_checksum || "") || Number(proof?.trusted_envelope_chars || 0) <= 0)) {
    issues.push("trusted_envelope_evidence_missing");
  }
  if (trustedEnvelopeRequired && trustedEnvelopePresent && !trustedEnvelopeValid) issues.push("trusted_envelope_invalid");
  if (trustedEnvelopeRequired && injectionRequired && !trustedEnvelopeBound) issues.push("required_trusted_envelope_unbound");
  if (trustedEnvelopeRequired && promptBound !== trustedEnvelopeBound) issues.push("prompt_binding_not_trusted_envelope_bound");
  if (enforcementRequired && injectionRequired && !promptBound) issues.push("required_projection_unbound");
  if (!String(proof?.sync_checksum || "") || !String(proof?.memory_context_checksum || "") || !String(proof?.rendered_prompt_checksum || "")) issues.push("binding_missing");
  return {
    valid: issues.length === 0,
    issues,
    promptBound,
    projectionPresent,
    injectionRequired,
    enforcementRequired,
    trustedEnvelopeRequired,
    trustedEnvelopePresent,
    trustedEnvelopeValid,
    trustedEnvelopeBound,
    deliveryReady: !enforcementRequired || !injectionRequired || (promptBound && (!trustedEnvelopeRequired || trustedEnvelopeBound)),
    status: String(proof?.status || ""),
  };
}


export function createTaskAgentMemoryPromptInjectionProof(input: {
  session: TaskAgentSession;
  groupSessionMemoryBinding: any;
  memoryContext: any;
  memoryContextChecksum: string;
  memorySnapshotSync: any;
  renderedPrompt: string;
  renderedMemoryContext?: string;
  enforcementRequired?: boolean;
  trustedEnvelopeRequired?: boolean;
  generatedAt: string;
}) {
  const projection = renderedMemoryProjection(input.memoryContext, input.renderedMemoryContext);
  const projectionPresent = !!projection.text;
  const expectedSourceChecksum = trustedMemorySourceChecksum(input.memoryContext || {});
  const trustedEnvelope = verifyTrustedMemoryPromptEnvelope(String(input.renderedPrompt || ""), {
    ...(projectionPresent ? { projection: projection.text } : {}),
    sourceChecksum: expectedSourceChecksum,
  });
  const trustedEnvelopeRequired = input.trustedEnvelopeRequired === true;
  const trustedEnvelopeBound = projectionPresent && trustedEnvelope.valid;
  const promptBound = projectionPresent && (trustedEnvelopeRequired
    ? trustedEnvelopeBound
    : String(input.renderedPrompt || "").includes(projection.text));
  const injectionRequired = input.memorySnapshotSync?.memory_injection_required === true;
  const enforcementRequired = input.enforcementRequired === true;
  const status = !projectionPresent
    ? injectionRequired ? "projection_unavailable" : "continuation_baseline"
    : promptBound
      ? injectionRequired ? "injected" : "redundant_full_injection"
      : injectionRequired ? "projection_missing_from_prompt" : "continuation_baseline";
  const payload = {
    schema: TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA,
    version: 1,
    status,
    group_id: input.session.groupId,
    group_session_id: String(input.groupSessionMemoryBinding?.groupSessionId || ""),
    task_id: input.session.taskId,
    task_agent_session_id: input.session.id,
    target_project: input.session.project,
    sync_checksum: String(input.memorySnapshotSync?.sync_checksum || ""),
    sync_action: String(input.memorySnapshotSync?.action || ""),
    memory_context_checksum: input.memoryContextChecksum,
    memory_injection_required: injectionRequired,
    enforcement_required: enforcementRequired,
    trusted_envelope_required: trustedEnvelopeRequired,
    trusted_envelope_present: trustedEnvelope.present,
    trusted_envelope_valid: trustedEnvelope.valid,
    trusted_envelope_bound: trustedEnvelopeBound,
    trusted_envelope_checksum: trustedEnvelope.contentChecksum,
    trusted_envelope_source_checksum: trustedEnvelope.sourceChecksum,
    trusted_envelope_chars: trustedEnvelope.contentChars,
    trusted_envelope_issues: trustedEnvelope.issues,
    projection_source: projection.source,
    projection_present: projectionPresent,
    rendered_memory_checksum: projectionPresent ? hashValue(projection.text, 64) : "",
    rendered_memory_chars: projection.text.length,
    rendered_prompt_checksum: hashValue(String(input.renderedPrompt || "")),
    prompt_bound: promptBound,
    checked_at: input.generatedAt,
  };
  const proof = { ...payload, proof_checksum: memoryPromptInjectionProofChecksum(payload) };
  const verification = verifyTaskAgentMemoryPromptInjectionProof(proof, {
    groupId: input.session.groupId,
    groupSessionId: String(input.groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: input.session.taskId,
    taskAgentSessionId: input.session.id,
    targetProject: input.session.project,
    memoryContextChecksum: input.memoryContextChecksum,
    syncChecksum: String(input.memorySnapshotSync?.sync_checksum || ""),
    renderedPromptChecksum: hashValue(String(input.renderedPrompt || "")),
  });
  if (!verification.valid) {
    const error: any = new Error(`task Agent memory prompt injection proof invalid: ${verification.issues.join(",")}`);
    error.code = "TASK_AGENT_MEMORY_PROMPT_INJECTION_REQUIRED";
    error.issues = verification.issues;
    throw error;
  }
  return proof;
}

// ===== merged from agent-sessions-shared-part-02.ts =====

export function memorySnapshotSyncCommitChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.commit_checksum;
  delete payload.commit_file;
  delete payload.checksum_valid;
  delete payload.issues;
  return hashValue(payload, 64);
}


export function verifyTaskAgentMemorySnapshotSyncCommit(commit: any, expected: {
  groupId?: string;
  groupSessionId?: string;
  taskId?: string;
  taskAgentSessionId?: string;
  targetProject?: string;
  snapshotId?: string;
  snapshotChecksum?: string;
  syncChecksum?: string;
  syncAction?: string;
  memoryPromptInjectionProofChecksum?: string;
  deliveryReceiptId?: string;
  deliveryReceiptChecksum?: string;
} = {}) {
  const issues: string[] = [];
  if (commit?.schema !== TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA) issues.push("schema_invalid");
  if (Number(commit?.version || 0) !== 1) issues.push("version_invalid");
  if (!String(commit?.commit_checksum || "") || memorySnapshotSyncCommitChecksum(commit) !== String(commit.commit_checksum || "")) issues.push("checksum_invalid");
  const bindings: Array<[string, any, any]> = [
    ["group_id", expected.groupId, commit?.group_id],
    ["group_session_id", expected.groupSessionId, commit?.group_session_id],
    ["task_id", expected.taskId, commit?.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId, commit?.task_agent_session_id],
    ["target_project", expected.targetProject, commit?.target_project],
    ["snapshot_id", expected.snapshotId, commit?.snapshot_id],
    ["snapshot_checksum", expected.snapshotChecksum, commit?.snapshot_checksum],
    ["sync_checksum", expected.syncChecksum, commit?.sync_checksum],
    ["sync_action", expected.syncAction, commit?.sync_action],
    ["memory_prompt_injection_proof_checksum", expected.memoryPromptInjectionProofChecksum, commit?.memory_prompt_injection_proof_checksum],
    ["delivery_receipt_id", expected.deliveryReceiptId, commit?.delivery_receipt_id],
    ["delivery_receipt_checksum", expected.deliveryReceiptChecksum, commit?.delivery_receipt_checksum],
  ];
  for (const [field, wanted, actual] of bindings) {
    if (wanted !== undefined && String(wanted || "") !== String(actual || "")) issues.push(`${field}_mismatch`);
  }
  const status = String(commit?.status || "");
  if (!["committed", "rejected"].includes(status)) issues.push("status_invalid");
  if (status === "committed" && commit?.committed !== true) issues.push("committed_flag_missing");
  if (status === "rejected" && commit?.committed === true) issues.push("rejected_marked_committed");
  if (commit?.committed === true && String(commit?.delivery_status || "") !== "delivered") issues.push("delivery_not_committed");
  if (commit?.committed === true && (!String(commit?.delivery_receipt_id || "") || !String(commit?.delivery_receipt_checksum || ""))) issues.push("delivery_receipt_missing");
  if (commit?.committed === true && !String(commit?.memory_prompt_injection_proof_checksum || "")) issues.push("memory_prompt_injection_proof_missing");
  if (!String(commit?.snapshot_id || "") || !String(commit?.snapshot_checksum || "") || !String(commit?.sync_checksum || "")) issues.push("snapshot_binding_missing");
  return { valid: issues.length === 0, issues, committed: commit?.committed === true, status };
}


export function createTaskAgentMemorySnapshotSyncDecision(input: {
  session: TaskAgentSession;
  refs: TaskAgentMemoryContextSnapshotRef[];
  groupSessionMemoryBinding: any;
  currentMemoryContextChecksum: string;
  generatedAt: string;
  turn: number;
  fullMemoryProjectionInjected?: boolean;
  enforcementRequired?: boolean;
}) {
  const groupSessionId = String(input.groupSessionMemoryBinding?.groupSessionId || "").trim();
  const boundGroupSessionId = String(input.session.groupSessionId || "").trim();
  if (boundGroupSessionId.startsWith("gcs_") && groupSessionId.startsWith("gcs_") && boundGroupSessionId !== groupSessionId) {
    const error: any = new Error(`task Agent memory snapshot cannot cross group sessions: ${boundGroupSessionId} -> ${groupSessionId}`);
    error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
    throw error;
  }

  const previousRef = input.refs.length ? input.refs[input.refs.length - 1] : null;
  const previousSnapshot = previousRef?.snapshotPath ? safeReadJson(previousRef.snapshotPath, null) : null;
  const previousSnapshotOuterTrusted = !!previousSnapshot
    && previousSnapshot.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA
    && verifyMemoryContextSnapshotChecksum(previousSnapshot)
    && String(previousSnapshot?.session?.id || "") === input.session.id
    && String(previousSnapshot?.session?.group_id || "") === input.session.groupId
    && String(previousSnapshot?.session?.task_id || "") === input.session.taskId
    && String(previousSnapshot?.session?.project || "") === input.session.project;
  const previousSnapshotSync = previousSnapshot?.context?.memory_snapshot_sync || null;
  const previousSnapshotSyncVerification = previousSnapshotOuterTrusted
    ? verifyTaskAgentMemorySnapshotSyncDecision(previousSnapshotSync, {
      groupId: input.session.groupId,
      groupSessionId: String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || ""),
      taskId: input.session.taskId,
      taskAgentSessionId: input.session.id,
      targetProject: input.session.project,
      currentMemoryContextChecksum: String(previousSnapshot?.context?.memory_context_checksum || ""),
    })
    : { valid: false };
  const previousMemoryPromptInjectionProof = previousSnapshot?.context?.memory_prompt_injection_proof || null;
  const previousMemoryPromptInjectionVerification = previousSnapshotOuterTrusted && previousSnapshotSyncVerification.valid === true
    ? verifyTaskAgentMemoryPromptInjectionProof(previousMemoryPromptInjectionProof, {
      groupId: input.session.groupId,
      groupSessionId: String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || ""),
      taskId: input.session.taskId,
      taskAgentSessionId: input.session.id,
      targetProject: input.session.project,
      memoryContextChecksum: String(previousSnapshot?.context?.memory_context_checksum || ""),
      syncChecksum: String(previousSnapshotSync?.sync_checksum || ""),
      renderedPromptChecksum: String(previousSnapshot?.context?.rendered_prompt_checksum || ""),
    })
    : { valid: false, deliveryReady: false };
  const previousGroupSessionId = previousSnapshotOuterTrusted
    ? String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || "").trim()
    : "";
  if (previousGroupSessionId.startsWith("gcs_") && groupSessionId.startsWith("gcs_") && previousGroupSessionId !== groupSessionId) {
    const error: any = new Error(`task Agent memory snapshot history belongs to another group session: ${previousGroupSessionId} -> ${groupSessionId}`);
    error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
    throw error;
  }

  const previousDeliveryReceipt = previousRef?.deliveryReceiptPath
    ? safeReadJson(previousRef.deliveryReceiptPath, null)
    : null;
  const previousDeliveryReceiptTrusted = !!previousDeliveryReceipt
    && verifyMemoryContextDeliveryReceiptChecksum(previousDeliveryReceipt)
    && previousDeliveryReceipt.delivered === true
    && String(previousDeliveryReceipt.status || "") === "delivered"
    && String(previousDeliveryReceipt.receiptId || "") === String(previousRef?.deliveryReceiptId || "")
    && String(previousDeliveryReceipt.checksum || "") === String(previousRef?.deliveryReceiptChecksum || "")
    && String(previousDeliveryReceipt.taskAgentSessionId || "") === input.session.id
    && String(previousDeliveryReceipt.memoryContextSnapshotId || "") === String(previousSnapshot?.snapshot_id || "")
    && String(previousDeliveryReceipt.memoryContextSnapshotChecksum || "") === String(previousSnapshot?.checksum || "");
  const previousSyncCommitFile = String(
    previousRef?.memorySnapshotSyncCommitPath
    || (previousRef?.snapshotId ? getMemorySnapshotSyncCommitFile(input.session.id, previousRef.snapshotId) : "")
  ).trim();
  const previousSyncCommit = previousSyncCommitFile ? safeReadJson(previousSyncCommitFile, null) : null;
  const previousSyncCommitVerification = previousSnapshotOuterTrusted
    && previousSnapshotSyncVerification.valid === true
    && previousMemoryPromptInjectionVerification.valid === true
    && previousMemoryPromptInjectionVerification.deliveryReady === true
    && previousDeliveryReceiptTrusted
    ? verifyTaskAgentMemorySnapshotSyncCommit(previousSyncCommit, {
      groupId: input.session.groupId,
      groupSessionId: previousGroupSessionId,
      taskId: input.session.taskId,
      taskAgentSessionId: input.session.id,
      targetProject: input.session.project,
      snapshotId: String(previousSnapshot?.snapshot_id || ""),
      snapshotChecksum: String(previousSnapshot?.checksum || ""),
      syncChecksum: String(previousSnapshotSync?.sync_checksum || ""),
      syncAction: String(previousSnapshotSync?.action || ""),
      memoryPromptInjectionProofChecksum: String(previousMemoryPromptInjectionProof?.proof_checksum || ""),
      deliveryReceiptId: String(previousDeliveryReceipt?.receiptId || ""),
      deliveryReceiptChecksum: String(previousDeliveryReceipt?.checksum || ""),
    })
    : { valid: false, committed: false, status: "" };
  const previousSnapshotCommitted = previousSyncCommitVerification.valid === true
    && previousSyncCommitVerification.committed === true;
  const previousSnapshotTrusted = previousSnapshotOuterTrusted
    && previousSnapshotSyncVerification.valid === true
    && previousMemoryPromptInjectionVerification.valid === true
    && previousMemoryPromptInjectionVerification.deliveryReady === true
    && previousDeliveryReceiptTrusted
    && previousSnapshotCommitted;

  const previousMemoryContextChecksum = previousSnapshotTrusted
    ? String(previousSnapshot?.context?.memory_context_checksum || "")
    : "";
  const continuationNativeSessionId = String(input.session.nativeSessionId || "").trim();
  const continuationProvider = normalizeAgentRuntimeId(input.session.agentType || "");
  const continuationBaselineEligible = previousSnapshotTrusted
    && previousMemoryContextChecksum === input.currentMemoryContextChecksum
    && input.session.resumeMode === "native"
    && Number(input.session.turnCount || 0) > 0
    && !!continuationNativeSessionId
    && getAgentRuntime(input.session.agentType).capabilities.sessionResume === true
    && normalizeAgentRuntimeId(previousDeliveryReceipt?.runtime || "") === continuationProvider
    && String(previousDeliveryReceipt?.nativeSessionId || "") === continuationNativeSessionId;
  const memoryContextUnchanged = previousSnapshotTrusted
    && previousMemoryContextChecksum === input.currentMemoryContextChecksum;
  const unchangedBaselineReusable = memoryContextUnchanged
    && (input.enforcementRequired !== true || input.fullMemoryProjectionInjected === true || continuationBaselineEligible);
  const action = !previousRef
    ? "initialize"
    : unchangedBaselineReusable
      ? "none"
      : "prompt_update";
  const reason = action === "initialize"
    ? "first_task_agent_memory_snapshot"
    : action === "none"
      ? "memory_context_unchanged"
      : previousSnapshotTrusted && previousMemoryContextChecksum === input.currentMemoryContextChecksum
        ? "continuation_baseline_unavailable"
      : previousSnapshotTrusted
        ? "memory_context_changed"
        : previousSnapshotOuterTrusted
          && previousSnapshotSyncVerification.valid === true
          && previousMemoryPromptInjectionVerification.valid === true
          && previousMemoryPromptInjectionVerification.deliveryReady === true
          ? "previous_snapshot_uncommitted"
          : "previous_snapshot_untrusted";
  const payload: any = {
    schema: TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA,
    version: 1,
    action,
    reason,
    group_id: input.session.groupId,
    group_session_id: groupSessionId,
    task_id: input.session.taskId,
    task_agent_session_id: input.session.id,
    target_project: input.session.project,
    turn: input.turn,
    checked_at: input.generatedAt,
    current_memory_context_checksum: input.currentMemoryContextChecksum,
    previous_snapshot_id: String(previousSnapshotTrusted ? previousSnapshot?.snapshot_id : previousRef?.snapshotId || ""),
    previous_snapshot_checksum: String(previousSnapshotTrusted ? previousSnapshot?.checksum : previousRef?.checksum || ""),
    previous_memory_context_checksum: previousMemoryContextChecksum,
    previous_group_session_id: previousGroupSessionId,
    previous_snapshot_trusted: previousSnapshotTrusted,
    previous_snapshot_committed: previousSnapshotCommitted,
    previous_sync_commit_checksum: String(previousSyncCommitVerification.valid ? previousSyncCommit?.commit_checksum || "" : ""),
    enforcement_required: input.enforcementRequired === true,
    full_memory_projection_injected: input.fullMemoryProjectionInjected === true,
    continuation_baseline_required: action === "none" && input.enforcementRequired === true && input.fullMemoryProjectionInjected !== true,
    continuation_baseline_eligible: continuationBaselineEligible,
    continuation_native_session_id: continuationBaselineEligible ? continuationNativeSessionId : "",
    continuation_provider: continuationBaselineEligible ? continuationProvider : "",
    continuation_provider_contract_id: continuationBaselineEligible ? String(input.session.providerContractId || "") : "",
    continuation_delivery_receipt_id: continuationBaselineEligible ? String(previousDeliveryReceipt?.receiptId || "") : "",
    continuation_delivery_receipt_checksum: continuationBaselineEligible ? String(previousDeliveryReceipt?.checksum || "") : "",
    memory_injection_required: action !== "none",
  };
  const decision = { ...payload, sync_checksum: memorySnapshotSyncChecksum(payload) };
  const verification = verifyTaskAgentMemorySnapshotSyncDecision(decision, {
    groupId: input.session.groupId,
    groupSessionId,
    taskId: input.session.taskId,
    taskAgentSessionId: input.session.id,
    targetProject: input.session.project,
    currentMemoryContextChecksum: input.currentMemoryContextChecksum,
  });
  if (!verification.valid) throw new Error(`task Agent memory snapshot sync decision invalid: ${verification.issues.join(",")}`);
  return decision;
}


export function hasMeaningfulMemoryContext(value: any) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
}


export function extractGroupSessionMemoryBinding(memoryContext: any = {}) {
  if (memoryContext?.schema === "ccm-third-party-memory-mcp-reference-v1") {
    const supplied = memoryContext.group_session_memory_binding || null;
    if (!supplied) return null;
    const payload = { ...supplied };
    const checksum = String(payload.checksum || "");
    delete payload.checksum;
    if (!checksum || hashValue(payload) !== checksum) {
      return { ...supplied, deliveryReady: false, compactHeadFenceValid: false, checksumValid: false, issues: ["mcp_reference_group_binding_checksum_invalid"] };
    }
    return { ...supplied, checksumValid: true };
  }
  const groupMemory = memoryContext?.schema === "ccm-group-memory-context-v1"
    ? memoryContext
    : memoryContext?.group_memory?.schema === "ccm-group-memory-context-v1"
      ? memoryContext.group_memory
      : null;
  if (!groupMemory) return null;
  const groupId = String(groupMemory.group_id || groupMemory.groupId || "").trim();
  const groupSessionId = String(groupMemory.group_session_id || groupMemory.groupSessionId || "").trim();
  const sessionMemory = groupMemory.compaction?.sessionMemory || groupMemory.compaction?.session_memory || null;
  const sectionEvidence = sessionMemory?.sectionEvidence || sessionMemory?.section_evidence || null;
  const modelReceipt = sessionMemory?.modelExtractionReceipt || sessionMemory?.model_extraction_receipt || null;
  const replayEvidence = sessionMemory?.modelExtractionReplayEvidence || sessionMemory?.model_extraction_replay_evidence || null;
  const factSupersession = sessionMemory?.factSupersession || sessionMemory?.fact_supersession || null;
  const sessionBinding = groupMemory.session_binding || groupMemory.sessionBinding || {};
  const compactTransactionReceipt = groupMemory.compaction?.compactTransactionReceipt
    || groupMemory.compaction?.compact_transaction_receipt
    || groupMemory.compactTransactionReceipt
    || groupMemory.compact_transaction_receipt
    || null;
  const compactEpoch = String(
    compactTransactionReceipt?.compact_epoch
    || groupMemory.group_state?.typedMemory?.ledger?.compactEpoch
    || groupMemory.group_state?.typed_memory?.ledger?.compact_epoch
    || "precompact"
  ).trim() || "precompact";
  const compactTransactionReceiptRequired = compactEpoch !== "precompact";
  const compactTransactionVerification = compactTransactionReceipt
    ? verifyGroupCompactTransactionReceipt(compactTransactionReceipt, { groupId, groupSessionId, compactEpoch })
    : { valid: false, issues: ["compact_transaction_receipt_missing"] };
  const compactHead = groupMemory.compact_head || groupMemory.compactHead || null;
  const compactHeadFenceRequired = groupSessionId.startsWith("gcs_")
    && groupMemory.memory_policy?.ignored !== true
    && groupMemory.memoryPolicy?.ignored !== true;
  const compactHeadValidation = compactHeadFenceRequired
    ? validateGroupCompactHeadBinding({
      groupId,
      groupSessionId,
      compactEpoch,
      compactTransactionReceiptChecksum: compactTransactionReceipt?.receipt_checksum || "",
      compactTransactionBoundaryId: compactTransactionReceipt?.boundary_id || "",
      compactHeadGeneration: Number(compactHead?.generation || 0),
      compactHeadId: String(compactHead?.head_id || ""),
      compactHeadChecksum: String(compactHead?.head_checksum || ""),
    })
    : { valid: true, status: "exempt", issues: [] };
  const sessionLifecycleFenceRequired = groupSessionId.startsWith("gcs_");
  let sessionLifecycleHead = groupMemory.session_lifecycle_head || groupMemory.sessionLifecycleHead || null;
  if (sessionLifecycleFenceRequired && !sessionLifecycleHead) {
    try {
      sessionLifecycleHead = ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "task_agent_snapshot_lazy_adopt" }).head;
    } catch {}
  }
  const sessionLifecycleValidation = sessionLifecycleFenceRequired
    ? validateGroupSessionLifecycleBinding({
      groupId,
      groupSessionId,
      lifecycleStatus: sessionLifecycleHead?.status,
      lifecycleGeneration: sessionLifecycleHead?.generation,
      lifecycleHeadId: sessionLifecycleHead?.lifecycle_head_id,
      lifecycleHeadChecksum: sessionLifecycleHead?.head_checksum,
    })
    : { valid: true, status: "exempt", issues: [] };
  const scopeId = groupSessionId === "default" || !groupSessionId ? groupId : `${groupId}--${groupSessionId}`;
  const replayEvidencePayload = replayEvidence ? { ...replayEvidence } : null;
  if (replayEvidencePayload) {
    delete replayEvidencePayload.checksum;
    delete replayEvidencePayload.checksumValid;
  }
  const replayEvidenceChecksumValid = !!replayEvidence?.checksum
    && replayEvidence?.checksumValid === true
    && hashValue(replayEvidencePayload || {}, 64) === String(replayEvidence.checksum || "");
  const modelExtractionExecutionId = String(replayEvidence?.executionId || modelReceipt?.executionId || "").trim();
  const modelExtractionReceiptChecksum = String(replayEvidence?.receiptChecksum || modelReceipt?.checksum || "").trim();
  const factSupersessionGraphChecksum = String(factSupersession?.graphChecksum || factSupersession?.graph_checksum || "").trim();
  const modelExtractionEvidenceRequired = String(modelReceipt?.status || "") === "committed" || !!modelExtractionExecutionId;
  const modelExtractionEvidenceValid = !modelExtractionEvidenceRequired || (
    replayEvidenceChecksumValid
    && replayEvidence?.historyIntegrityValid === true
    && replayEvidence?.replayPass === true
    && String(replayEvidence?.replayStatus || "") === "verified"
    && String(replayEvidence?.replayExecutionId || "") === modelExtractionExecutionId
    && modelExtractionReceiptChecksum === String(modelReceipt?.checksum || "")
    && String(replayEvidence?.factSupersessionGraphChecksum || "") === String(modelReceipt?.factSupersessionGraphChecksum || factSupersessionGraphChecksum)
    && (!factSupersessionGraphChecksum || factSupersession?.graphValid === true)
    && (!factSupersessionGraphChecksum || factSupersessionGraphChecksum === String(replayEvidence?.factSupersessionGraphChecksum || ""))
  );
  const activeFacts = factSupersession?.graphValid === true && Array.isArray(factSupersession?.activeFacts || factSupersession?.active_facts)
    ? (factSupersession.activeFacts || factSupersession.active_facts).slice(0, 120).map((fact: any) => ({
      factId: String(fact?.factId || fact?.fact_id || "").trim(),
      factChecksum: String(fact?.factChecksum || fact?.fact_checksum || "").trim(),
      sourceMessageId: String(fact?.sourceMessageId || fact?.source_message_id || "").trim(),
    })).filter((fact: any) => fact.factId && fact.factChecksum)
    : [];
  const binding = {
    schema: "ccm-task-agent-group-session-memory-binding-v2",
    version: 2,
    groupId,
    groupSessionId,
    scopeId,
    memoryBindingId: String(sessionBinding.binding_id || sessionBinding.bindingId || "").trim(),
    memoryPolicy: String(groupMemory.memory_policy?.use || groupMemory.memoryPolicy?.use || "").trim(),
    memoryIgnored: groupMemory.memory_policy?.ignored === true || groupMemory.memoryPolicy?.ignored === true,
    sessionMemoryAvailable: !!sessionMemory?.schema,
    sessionMemorySnapshotFile: String(sessionMemory?.snapshotFile || sessionMemory?.snapshot_file || "").trim(),
    sessionMemorySummaryFile: String(sessionMemory?.summaryFile || sessionMemory?.summary_file || "").trim(),
    sessionMemoryChecksum: String(sessionMemory?.markdownChecksum || sessionMemory?.markdown_checksum || "").trim(),
    sessionMemoryHasSummary: sessionMemory?.hasSummary === true || sessionMemory?.has_summary === true,
    sessionMemoryFencingToken: Number(sessionMemory?.extractionTransaction?.fencingToken || sessionMemory?.extraction_transaction?.fencing_token || 0),
    sessionMemorySectionEvidenceChecksum: String(sectionEvidence?.checksum || "").trim(),
    sessionMemorySectionEvidence: Array.isArray(sectionEvidence?.sections)
      ? sectionEvidence.sections.slice(0, 20).map((item: any) => ({
        evidenceId: String(item?.evidenceId || item?.evidence_id || "").trim(),
        section: String(item?.section || "").trim(),
        sectionIndex: Number(item?.sectionIndex || item?.section_index || 0),
        sectionChecksum: String(item?.sectionChecksum || item?.section_checksum || "").trim(),
        sourceTranscriptChecksum: String(item?.sourceTranscriptChecksum || item?.source_transcript_checksum || sectionEvidence?.sourceTranscriptChecksum || "").trim(),
        sourceFirstMessageId: String(item?.sourceFirstMessageId || item?.source_first_message_id || sectionEvidence?.sourceFirstMessageId || "").trim(),
        sourceLastMessageId: String(item?.sourceLastMessageId || item?.source_last_message_id || sectionEvidence?.sourceLastMessageId || "").trim(),
        sourceMessageIds: Array.from(new Set(
          (Array.isArray(item?.sourceMessageIds || item?.source_message_ids)
            ? (item.sourceMessageIds || item.source_message_ids)
            : sectionEvidence?.sourceMessageIds || [])
            .map((value: any) => String(value || "").trim())
            .filter(Boolean)
        )).slice(0, 240),
      })).filter((item: any) => item.evidenceId && item.sectionChecksum)
      : [],
    modelExtractionExecutionId,
    modelExtractionReceiptChecksum,
    modelExtractionHistoryHeadChecksum: String(replayEvidence?.historyHeadChecksum || "").trim(),
    modelExtractionReplayStatus: String(replayEvidence?.replayStatus || "").trim(),
    modelExtractionReplayExecutionId: String(replayEvidence?.replayExecutionId || "").trim(),
    modelExtractionReplayEvidenceChecksum: String(replayEvidence?.checksum || "").trim(),
    modelExtractionEvidenceRequired,
    modelExtractionEvidenceValid,
    factSupersessionGraphChecksum,
    factSupersessionGraphValid: factSupersession?.graphValid === true,
    activeFactChecksums: activeFacts.map((fact: any) => fact.factChecksum),
    activeFacts,
    compactEpoch,
    compactTransactionReceiptRequired,
    compactTransactionReceipt: compactTransactionReceipt || null,
    compactTransactionReceiptId: String(compactTransactionReceipt?.receipt_id || "").trim(),
    compactTransactionBoundaryId: String(compactTransactionReceipt?.boundary_id || "").trim(),
    compactTransactionReceiptChecksum: String(compactTransactionReceipt?.receipt_checksum || "").trim(),
    compactTransactionReceiptValid: compactTransactionVerification.valid === true,
    compactTransactionReceiptIssues: compactTransactionVerification.issues,
    compactHeadFenceRequired,
    compactHeadFenceValid: compactHeadValidation.valid === true,
    compactHeadFenceStatus: compactHeadValidation.status,
    compactHeadFenceIssues: compactHeadValidation.issues,
    compactHeadId: String(compactHead?.head_id || ""),
    compactHeadGeneration: Number(compactHead?.generation || 0),
    compactHeadChecksum: String(compactHead?.head_checksum || ""),
    sessionLifecycleFenceRequired,
    sessionLifecycleFenceValid: sessionLifecycleValidation.valid === true,
    sessionLifecycleFenceStatus: sessionLifecycleValidation.status,
    sessionLifecycleFenceIssues: sessionLifecycleValidation.issues,
    sessionLifecycleHeadId: String(sessionLifecycleHead?.lifecycle_head_id || ""),
    sessionLifecycleGeneration: Number(sessionLifecycleHead?.generation || 0),
    sessionLifecycleStatus: String(sessionLifecycleHead?.status || ""),
    sessionLifecycleHeadChecksum: String(sessionLifecycleHead?.head_checksum || ""),
    deliveryReady: modelExtractionEvidenceValid
      && (!compactTransactionReceiptRequired || compactTransactionVerification.valid === true)
      && compactHeadValidation.valid === true
      && sessionLifecycleValidation.valid === true,
  };
  return { ...binding, checksum: hashValue(binding) };
}


export function verifyMemoryContextDeliveryReceiptChecksum(receipt: any) {
  if (!receipt?.checksum) return false;
  const payload = { ...receipt };
  const expected = String(payload.checksum || "");
  delete payload.checksum;
  delete payload.receiptFile;
  return hashValue(payload, 64) === expected;
}


export function finalDispatchReactiveCompactCircuitChecksum(state: any) {
  const payload = { ...(state || {}) };
  delete payload.state_checksum;
  delete payload.checksum_valid;
  delete payload.blocked;
  delete payload.issues;
  return hashValue(payload, 64);
}


export function emptyFinalDispatchReactiveCompactCircuit(session: TaskAgentSession, groupSessionId = "") {
  const payload: any = {
    schema: "ccm-final-dispatch-reactive-compact-circuit-breaker-v1",
    version: 1,
    group_id: String(session.groupId || ""),
    group_session_id: String(groupSessionId || ""),
    task_id: String(session.taskId || ""),
    task_agent_session_id: String(session.id || ""),
    scope_id: `${String(session.groupId || "")}::${String(groupSessionId || "")}::${String(session.taskId || "")}::${String(session.id || "")}`,
    state: "closed",
    consecutive_failures: 0,
    max_consecutive_failures: FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
    revision: 0,
    opened_at: "",
    last_failure_at: "",
    last_success_at: "",
    last_attempt_id: "",
    recent_events: [],
    updated_at: "",
  };
  return { ...payload, state_checksum: finalDispatchReactiveCompactCircuitChecksum(payload) };
}


export function memoryEntryRenderContentionChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.contention_checksum;
  return hashValue(payload, 64);
}


export function recordTaskAgentMemoryEntryRenderContention(sessionId: string, input: {
  status: "resolved" | "timeout" | "same_process";
  retries: number;
  waitedMs: number;
  blockedLeaseId?: string;
  blockedFencingToken?: number;
  blockedOwnerPid?: number;
  sourceMemoryContextChecksum?: string;
}) {
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const session = store.sessions.find((item: TaskAgentSession) => item.id === sessionId);
    if (!session) return null;
    const observedAt = new Date().toISOString();
    const payload = {
      schema: MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA,
      version: 1,
      status: input.status,
      group_id: session.groupId,
      group_session_id: session.groupSessionId || "",
      task_id: session.taskId,
      task_agent_session_id: session.id,
      target_project: session.project,
      contender_pid: process.pid,
      blocked_lease_id: String(input.blockedLeaseId || ""),
      blocked_fencing_token: Number(input.blockedFencingToken || 0),
      blocked_owner_pid: Number(input.blockedOwnerPid || 0),
      retries: Math.max(0, Number(input.retries || 0)),
      waited_ms: Math.max(0, Number(input.waitedMs || 0)),
      source_memory_context_checksum: String(input.sourceMemoryContextChecksum || ""),
      observed_at: observedAt,
    };
    const receipt = { ...payload, contention_checksum: memoryEntryRenderContentionChecksum(payload) };
    session.memoryEntrySyncRenderContentionCount = Number(session.memoryEntrySyncRenderContentionCount || 0) + 1;
    session.memoryEntrySyncRenderWaitResolvedCount = Number(session.memoryEntrySyncRenderWaitResolvedCount || 0) + (input.status === "resolved" ? 1 : 0);
    session.memoryEntrySyncRenderWaitTimeoutCount = Number(session.memoryEntrySyncRenderWaitTimeoutCount || 0) + (input.status === "timeout" ? 1 : 0);
    session.memoryEntrySyncRenderSameProcessConflictCount = Number(session.memoryEntrySyncRenderSameProcessConflictCount || 0) + (input.status === "same_process" ? 1 : 0);
    session.memoryEntrySyncRenderWaitTotalMs = Number(session.memoryEntrySyncRenderWaitTotalMs || 0) + payload.waited_ms;
    session.memoryEntrySyncRenderLastContention = receipt;
    session.lastUsedAt = observedAt;
    saveStore(store);
    return receipt;
  });
}


export function verifyTaskAgentMemoryContinuationBaselineDelivery(snapshot: any, input: {
  runtime?: string;
  nativeSessionId?: string;
  runnerRequestId?: string;
  nativeContinuationEvidence?: any;
} = {}) {
  const sync = snapshot?.context?.memory_snapshot_sync || null;
  const injectionProof = snapshot?.context?.memory_prompt_injection_proof || null;
  const required = String(sync?.action || "") === "none"
    && sync?.continuation_baseline_required === true
    && injectionProof?.prompt_bound !== true;
  if (!required) {
    return {
      required: false,
      valid: true,
      status: injectionProof?.prompt_bound === true ? "full_prompt_injection" : "not_required",
      issues: [] as string[],
      evidenceChecksum: "",
    };
  }
  const issues: string[] = [];
  const evidence = input.nativeContinuationEvidence || null;
  const expectedNativeSessionId = String(sync?.continuation_native_session_id || "").trim();
  const expectedProvider = normalizeAgentRuntimeId(sync?.continuation_provider || input.runtime || "");
  const expectedProviderContractId = String(sync?.continuation_provider_contract_id || "").trim();
  const runnerRequestId = String(input.runnerRequestId || "").trim();
  if (sync?.continuation_baseline_eligible !== true) issues.push("continuation_baseline_not_eligible");
  if (!expectedNativeSessionId) issues.push("continuation_native_session_missing");
  if (!expectedProvider) issues.push("continuation_provider_missing");
  if (!runnerRequestId) issues.push("continuation_runner_request_missing");
  const verification = evidence ? verifyNativeSessionContinuationEvidence(evidence, {
    provider: expectedProvider,
    runnerRequestId,
    requestedNativeSessionId: expectedNativeSessionId,
    ...(expectedProviderContractId ? { expectedProviderContractId } : {}),
  }) : { valid: false, issues: ["native_continuation_evidence_missing"] };
  if (!verification.valid) issues.push(...verification.issues);
  if (evidence?.nativeResumeRequested !== true) issues.push("native_resume_not_requested");
  if (evidence?.nativeContinuationAcknowledged !== true) issues.push("native_continuation_not_acknowledged");
  if (evidence?.nativeSessionReusable !== true) issues.push("native_session_not_reusable");
  if (evidence?.providerContractContinuityVerified !== true) issues.push("provider_contract_continuity_unverified");
  if (evidence?.runnerSuccess !== true) issues.push("continuation_runner_failed");
  if (evidence?.nativeForkRequested === true) issues.push("native_fork_not_continuation");
  if (String(evidence?.requestedNativeSessionId || "") !== expectedNativeSessionId) issues.push("requested_native_session_mismatch");
  if (String(evidence?.effectiveNativeSessionId || "") !== expectedNativeSessionId) issues.push("effective_native_session_mismatch");
  if (String(input.nativeSessionId || expectedNativeSessionId) !== expectedNativeSessionId) issues.push("delivered_native_session_mismatch");
  return {
    required: true,
    valid: issues.length === 0,
    status: issues.length === 0 ? "acknowledged" : "unverified",
    issues: [...new Set(issues)],
    evidenceChecksum: String(evidence?.evidenceChecksum || ""),
  };
}


export function sessionSnapshotContextWindow(session: TaskAgentSession) {
  const snapshot = safeReadJson(String(session.memoryContextSnapshotPath || ""), null);
  return Number(
    session.modelContextWindow
    || snapshot?.context?.worker_context_packet?.model_context_capacity?.contextWindow
    || snapshot?.context?.worker_context_packet?.context_usage?.capacity_provenance?.contextWindow
    || 0
  );
}


export function capacityRevalidationGroupSessionId(packet: any = {}) {
  const memory = packet?.memory || packet?.worker_context_packet?.memory || {};
  const groupMemory = memory?.schema === "ccm-group-memory-context-v1"
    ? memory
    : memory?.group_memory?.schema === "ccm-group-memory-context-v1" ? memory.group_memory : {};
  return String(
    packet?.group_session_id
    || packet?.groupSessionId
    || groupMemory?.group_session_id
    || groupMemory?.groupSessionId
    || packet?.post_turn_summary_delivery_capsule?.group_session_id
    || "",
  ).trim();
}


export function capacityRevalidationGateChecksum(gate: any) {
  const payload = { ...(gate || {}) };
  delete payload.gate_checksum;
  return hashValue(payload, 64);
}


export function capacityRevalidationProofChecksum(proof: any) {
  const payload = { ...(proof || {}) };
  delete payload.proof_checksum;
  delete payload.checksum_valid;
  return hashValue(payload, 64);
}


export function capacityRevalidationCommitChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return hashValue(payload, 64);
}


export function validateCapacityRevalidationPacket(current: TaskAgentSession, packet: any = {}) {
  const capacity = packet?.model_context_capacity || packet?.context_usage?.capacity_provenance || {};
  const contextWindow = Number(capacity.contextWindow || 0);
  const targetWindow = Number(current.capacityDowngradeGate?.current_context_window || 0);
  if (!String(packet?.packet_id || "")) return { valid: false, reason: "worker_context_packet_missing" };
  if (!contextWindow || (targetWindow > 0 && contextWindow > targetWindow)) return { valid: false, reason: "packet_capacity_not_revalidated" };
  const contextUsageStatus = String(packet?.context_usage?.status || "unknown");
  const typedMemoryCapsule = packet?.typed_memory_delivery_capsule || packet?.typedMemoryDeliveryCapsule || null;
  if (typedMemoryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1") {
    const capsuleBudget = typedMemoryCapsule.budget || {};
    const capsuleWindow = Number(capsuleBudget.model_context_window || typedMemoryCapsule.model_context_window || 0);
    const configuredMaxTokens = Number(capsuleBudget.configured_max_tokens || typedMemoryCapsule.configured_max_tokens || 0);
    const effectiveMaxTokens = Number(capsuleBudget.effective_max_tokens || typedMemoryCapsule.effective_max_tokens || 0);
    const expectedEffectiveMaxTokens = Math.min(configuredMaxTokens, Math.max(1000, Math.floor(capsuleWindow * 0.02)));
    if (typedMemoryCapsule.trusted_for_delivery !== true
      || !capsuleWindow
      || (targetWindow > 0 && capsuleWindow > targetWindow)
      || effectiveMaxTokens !== expectedEffectiveMaxTokens) {
      return { valid: false, reason: "typed_memory_capsule_capacity_not_revalidated" };
    }
  }
  if (["critical", "over_budget"].includes(contextUsageStatus)) return { valid: false, reason: "packet_context_still_over_budget" };
  return { valid: true, capacity, contextWindow, contextUsageStatus, typedMemoryCapsule };
}


export function taskAgentMemorySnapshotMatchesFilter(row: any, filter: any = {}) {
  const session = row?.session || {};
  const context = row?.context || {};
  const groupSessionId = String(
    row?.groupSessionId
    || row?.group_session_id
    || session.groupSessionId
    || session.group_session_id
    || context.group_session_memory_binding?.groupSessionId
    || context.group_session_memory_binding?.group_session_id
    || context.worker_context_packet?.group_session_id
    || ""
  );
  return (!filter.sessionId || session.id === filter.sessionId)
    && (!filter.scopeId || session.scope_id === filter.scopeId || session.scopeId === filter.scopeId)
    && (!filter.taskId || session.task_id === filter.taskId || session.taskId === filter.taskId)
    && (!filter.groupId || session.group_id === filter.groupId || session.groupId === filter.groupId)
    && (!(filter.groupSessionId || filter.group_session_id) || groupSessionId === String(filter.groupSessionId || filter.group_session_id))
    && (!filter.project || session.project === filter.project)
    && (!filter.status || row.status === filter.status || session.status === filter.status);
}
