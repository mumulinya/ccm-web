// Behavior-freeze extraction from agent-sessions.ts.
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

import {
  STORE_BACKUP_FILE,
  STORE_FILE,
  TaskAgentSession,
  loadStore,
  memorySnapshotSyncCommitChecksum,
  normalizeMemorySnapshotRefs,
  normalizeSnapshotFileKey,
  pathIsInsideMemorySnapshotDir,
  purgeMemoryContextSnapshotsForSession,
  saveStore,
  withTaskAgentSessionStoreLock
} from "./agent-sessions-shared";

import {
  buildTaskAgentMemoryContextSnapshotInventory
} from "./agent-sessions-inventory";

export function closeTaskAgentSessions(input: { scopeId?: string; taskId?: string; groupId?: string }, reason = "主 Agent 已完成最终验收") {
  if (!String(input.scopeId || "").trim() && !String(input.taskId || "").trim()) return [];
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const now = new Date().toISOString();
    const closed: TaskAgentSession[] = [];
    store.sessions = store.sessions.map((item: TaskAgentSession) => {
      const matches = item.status === "open"
        && (!input.scopeId || item.scopeId === input.scopeId)
        && (!input.taskId || item.taskId === input.taskId)
        && (!input.groupId || item.groupId === input.groupId);
      if (!matches) return item;
      const next: TaskAgentSession = { ...item, status: "closed", closedAt: now, closeReason: reason, lastUsedAt: now };
      closed.push(next);
      return next;
    });
    if (closed.length) saveStore(store);
    return closed;
  });
}


export function pruneTaskAgentMemoryContextSnapshots(options: any = {}) {
  const dryRun = options.dryRun !== false && options.dry_run !== false;
  const inventory = buildTaskAgentMemoryContextSnapshotInventory(options);
  const candidates = (inventory.prunableRows || []).filter((row: any) => row.fileExists && row.snapshotFile && pathIsInsideMemorySnapshotDir(row.snapshotFile));
  const pruned: any[] = [];
  const skipped: any[] = [];
  const prunedMemoryReceiptChallengeIds = new Set<string>();
  for (const row of candidates) {
    if (dryRun) {
      pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: true, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
      continue;
    }
    try {
      if (/^mcrc_[a-f0-9]{28}$/.test(String(row.memoryContextConsumptionChallengeId || ""))) {
        prunedMemoryReceiptChallengeIds.add(String(row.memoryContextConsumptionChallengeId));
      }
      fs.rmSync(row.snapshotFile, { force: true });
      if (row.deliveryReceiptFile && pathIsInsideMemorySnapshotDir(row.deliveryReceiptFile)) fs.rmSync(row.deliveryReceiptFile, { force: true });
      if (row.latestDeliveryAttemptReceiptFile && pathIsInsideMemorySnapshotDir(row.latestDeliveryAttemptReceiptFile)) fs.rmSync(row.latestDeliveryAttemptReceiptFile, { force: true });
      if (row.memorySnapshotSyncCommitPath && pathIsInsideMemorySnapshotDir(row.memorySnapshotSyncCommitPath)) fs.rmSync(row.memorySnapshotSyncCommitPath, { force: true });
      pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: false, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
      try {
        const dir = path.dirname(row.snapshotFile);
        if (pathIsInsideMemorySnapshotDir(dir) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch {}
    } catch (error: any) {
      skipped.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, reason: error?.message || String(error) });
    }
  }
  if (!dryRun && pruned.length) {
    const prunedIds = new Set(pruned.map(row => String(row.snapshotId || "")).filter(Boolean));
    const prunedFiles = new Set(pruned.map(row => normalizeSnapshotFileKey(row.snapshotFile)).filter(Boolean));
    withTaskAgentSessionStoreLock(() => {
      const store = loadStore();
      store.sessions = store.sessions.map((session: TaskAgentSession) => {
        const refs = normalizeMemorySnapshotRefs(session.memoryContextSnapshots).filter(ref =>
          !prunedIds.has(ref.snapshotId)
          && !prunedFiles.has(normalizeSnapshotFileKey(ref.snapshotPath))
        );
        const currentPruned = prunedIds.has(String(session.memoryContextSnapshotId || ""))
          || prunedFiles.has(normalizeSnapshotFileKey(session.memoryContextSnapshotPath || ""));
        if (!currentPruned && refs.length === normalizeMemorySnapshotRefs(session.memoryContextSnapshots).length) return session;
        const latest = [...refs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))[0] || null;
        return {
          ...session,
          memoryContextSnapshotId: latest?.snapshotId || "",
          memoryContextSnapshotPath: latest?.snapshotPath || "",
          memoryContextSnapshotChecksum: latest?.checksum || "",
          memoryContextPacketId: latest?.workerContextPacketId || "",
          memoryContextSnapshotAt: latest?.generatedAt || "",
          memoryContextDeliveryReceiptId: latest?.deliveryReceiptId || "",
          memoryContextDeliveryReceiptPath: latest?.deliveryReceiptPath || "",
          memoryContextDeliveryReceiptChecksum: latest?.deliveryReceiptChecksum || "",
          memoryContextDeliveryStatus: latest?.deliveryStatus || "",
          memoryContextDeliveredAt: latest?.deliveredAt || "",
          latestMemoryContextDeliveryAttemptReceiptId: latest?.latestDeliveryAttemptReceiptId || "",
          latestMemoryContextDeliveryAttemptReceiptPath: latest?.latestDeliveryAttemptReceiptPath || "",
          latestMemoryContextDeliveryAttemptReceiptChecksum: latest?.latestDeliveryAttemptReceiptChecksum || "",
          latestMemoryContextDeliveryAttemptStatus: latest?.latestDeliveryAttemptStatus || "",
          latestMemoryContextDeliveryAttemptAt: latest?.latestDeliveryAttemptAt || "",
          memorySnapshotSyncCommitPath: latest?.memorySnapshotSyncCommitPath || "",
          memorySnapshotSyncCommitChecksum: latest?.memorySnapshotSyncCommitChecksum || "",
          memorySnapshotSyncCommitStatus: latest?.memorySnapshotSyncCommitStatus || "",
          memorySnapshotSyncCommittedAt: latest?.memorySnapshotSyncCommittedAt || "",
          memoryContextSnapshots: refs,
        };
      });
      saveStore(store);
    });
    for (const challengeId of prunedMemoryReceiptChallengeIds) removeMemoryContextConsumptionReceiptIfUnreferenced(challengeId);
    for (const challengeId of prunedMemoryReceiptChallengeIds) removeMemoryContextConsumptionRecoveryIfUnreferenced(challengeId);
  }
  return {
    schema: "ccm-task-agent-memory-context-snapshot-retention-result-v1",
    generatedAt: new Date().toISOString(),
    dryRun,
    policy: inventory.policy,
    before: inventory.summary,
    candidateCount: candidates.length,
    prunedCount: pruned.length,
    skippedCount: skipped.length,
    pruned,
    skipped,
  };
}


export function purgeTaskAgentSessions(taskId: string) {
  const id = String(taskId || "").trim();
  if (!id) return [];
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const removed = store.sessions.filter((item: TaskAgentSession) => item.taskId === id || item.scopeId === id);
    if (!removed.length) return [];
    store.sessions = store.sessions.filter((item: TaskAgentSession) => item.taskId !== id && item.scopeId !== id);
    for (const session of removed) purgeMemoryContextSnapshotsForSession(session.id);
    saveStore(store);
    // A purged session must not be recoverable from the store backup.
    try { fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE); } catch {}
    return removed;
  });
}


export function reconcileTaskAgentSessions(tasks: any[], nowMs = Date.now()) {
  const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task: any) => [String(task.id || ""), task]));
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const closed: TaskAgentSession[] = [];
    const now = new Date(nowMs).toISOString();
    store.sessions = store.sessions.map((session: TaskAgentSession) => {
      if (session.status !== "open") return session;
      const task: any = taskMap.get(session.taskId || session.scopeId);
      const inactiveMs = nowMs - Date.parse(session.lastUsedAt || session.createdAt || now);
      const terminal = !task || task.archived || task.deleted_at || ["done", "cancelled", "archived"].includes(String(task.status || ""));
      const abandoned = inactiveMs > 30 * 24 * 60 * 60 * 1000 && String(task?.status || "") !== "in_progress";
      if (!terminal && !abandoned) return session;
      const next = { ...session, status: "closed" as const, closedAt: now, lastUsedAt: now, closeReason: terminal ? "任务已终态、归档或不存在，自动关闭残留会话" : "会话超过 30 天未使用，自动关闭" };
      closed.push(next);
      return next;
    });
    if (closed.length) saveStore(store);
    return { closed: closed.length, sessions: closed };
  });
}


export function shouldCloseTaskAgentSessions(input: { taskId?: string; reviewStatus?: string; taskStatus?: string }) {
  const hasPersistentTask = !!String(input.taskId || "").trim();
  const terminalStatuses = new Set(["done", "cancelled", "archived", "deleted"]);
  return hasPersistentTask
    ? terminalStatuses.has(String(input.taskStatus || ""))
    : String(input.reviewStatus || "") === "complete";
}

