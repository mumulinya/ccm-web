// Behavior-freeze split from agent-sessions-shared.ts (part 1/2).

// Behavior-freeze shared store/types/helpers for agent-sessions.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { AGENT_RUNTIMES, getAgentRuntime, normalizeAgentRuntimeId } from "../agents/runtime";
import { verifyFinalWorkerDispatchPayloadGate } from "../agents/final-dispatch-payload-gate";
import { verifyFinalDispatchReactiveCompactReceipt } from "../agents/final-dispatch-reactive-compact";
import { verifyNativeSessionContinuationEvidence } from "../agents/native-continuation";
import {
  trustedMemorySourceChecksum,
  verifyTrustedMemoryPromptEnvelope,
} from "../agents/trusted-memory-prompt-envelope";
import { verifyProviderMemoryChannelEvidence } from "../agents/provider-memory-channel";
import {
  readMemoryContextConsumptionReceipt,
  removeMemoryContextConsumptionReceiptIfUnreferenced,
} from "../integrations/memory-context-consumption-receipt";
import {
  removeMemoryContextConsumptionRecoveryIfUnreferenced,
  verifyMemoryContextConsumptionRecovery,
} from "../integrations/memory-context-consumption-recovery";
import { CCM_DIR } from "../core/utils";
import {
  extractGroupPostTurnSummaryDeliveryCapsule,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "../modules/collaboration/group-post-turn-summary";
import { verifyGroupCompactTransactionReceipt } from "../modules/collaboration/group-memory-compaction";
import { validateGroupCompactHeadBinding } from "../modules/collaboration/group-compact-head";
import {
  ensureGroupSessionLifecycleHead,
  validateGroupSessionLifecycleBinding,
} from "../modules/collaboration/group-session-lifecycle-head";
import { readTaskAgentInvocationLineage } from "./task-agent-invocation-lineage";
import { tryRecordTaskAgentContinuationSoakEvent } from "./task-agent-continuation-soak";
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
  status: "open" | "closed";
  turnCount: number;
  lastTurnSucceeded: boolean | null;
  createdAt: string;
  lastUsedAt: string;
  closedAt: string;
  closeReason: string;
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
  const sessions = (store.sessions || [])
    .sort((a: any, b: any) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)))
    .slice(-MAX_SESSION_RECORDS);
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
  const lock = acquireTaskAgentSessionStoreLock();
  try {
    return operation();
  } finally {
    releaseTaskAgentSessionStoreLock(lock);
  }
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
