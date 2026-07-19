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
  DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION,
  DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS,
  DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS,
  MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION,
  MEMORY_CONTEXT_SNAPSHOT_DIR,
  MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS,
  MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS,
  MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS,
  MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES,
  MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA,
  MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT,
  MEMORY_ENTRY_RENDER_LEASE_TTL_MS,
  TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
  TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA,
  TaskAgentMemoryContextSnapshotRef,
  TaskAgentSession,
  capacityRevalidationGroupSessionId,
  collectMemoryContextGateIds,
  createTaskAgentMemoryPromptInjectionProof,
  createTaskAgentMemorySnapshotSyncDecision,
  extractGroupSessionMemoryBinding,
  getMemoryContextSnapshotDir,
  getMemorySnapshotSyncCommitFile,
  hashValue,
  listMemoryContextSnapshotFilesOnDisk,
  loadStore,
  memoryEntryRenderContentionChecksum,
  memoryPromptInjectionProofChecksum,
  memorySnapshotSyncChecksum,
  memorySnapshotSyncCommitChecksum,
  normalizeMemorySnapshotRefs,
  normalizeSnapshotFileKey,
  processIsAlive,
  recordTaskAgentMemoryEntryRenderContention,
  renderedMemoryProjection,
  safeReadJson,
  saveStore,
  sleepForStoreLock,
  taskAgentMemorySnapshotMatchesFilter,
  verifyMemoryContextDeliveryReceiptChecksum,
  verifyMemoryContextSnapshotChecksum,
  verifyTaskAgentMemoryContinuationBaselineDelivery,
  verifyTaskAgentMemoryPromptInjectionProof,
  verifyTaskAgentMemorySnapshotSyncCommit,
  verifyTaskAgentMemorySnapshotSyncDecision,
  withTaskAgentSessionStoreLock,
  writeJsonAtomic
} from "./agent-sessions-shared";

import {
  buildTaskAgentMemorySnapshotRow,
} from "./agent-sessions-snapshot-rows";

export function prepareTaskAgentMemoryEntrySyncContext(sessionId: string, memoryContextInput: any) {
  const id = String(sessionId || "").trim();
  if (!id || !memoryContextInput || typeof memoryContextInput !== "object") return { memoryContext: memoryContextInput, plan: null, prepared: false };
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const session = store.sessions.find((item: TaskAgentSession) => item.id === id);
    if (!session) return { memoryContext: memoryContextInput, plan: null, prepared: false };
    const binding = extractGroupSessionMemoryBinding(memoryContextInput || {});
    const groupSessionId = String(binding?.groupSessionId || "");
    if (!groupSessionId.startsWith("gcs_")) return { memoryContext: memoryContextInput, plan: null, prepared: false };
    if (session.groupSessionId?.startsWith("gcs_") && session.groupSessionId !== groupSessionId) {
      const error: any = new Error(`task Agent memory entry sync belongs to another group session: ${session.groupSessionId} -> ${groupSessionId}`);
      error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
      throw error;
    }
    const preparedAtMs = Date.now();
    const sourceMemoryContextChecksum = taskAgentMemorySemanticChecksum(memoryContextInput);
    const existingRenderLease = session.memoryEntrySyncRenderLease || null;
    const existingLeaseExpiresMs = Date.parse(String(existingRenderLease?.expires_at || ""));
    const existingLeaseActive = existingRenderLease?.status === "prepared"
      && Number.isFinite(existingLeaseExpiresMs)
      && existingLeaseExpiresMs > preparedAtMs
      && processIsAlive(Number(existingRenderLease?.owner_pid || 0));
    if (existingLeaseActive
      && (Number(existingRenderLease.owner_pid || 0) !== process.pid
        || String(existingRenderLease.source_memory_context_checksum || "") !== sourceMemoryContextChecksum)) {
      const error: any = new Error(`task Agent memory entry render lease is busy: ${existingRenderLease.lease_id || "unknown"}`);
      error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY";
      error.leaseId = String(existingRenderLease.lease_id || "");
      error.fencingToken = Number(existingRenderLease.fencing_token || 0);
      error.ownerPid = Number(existingRenderLease.owner_pid || 0);
      error.leaseExpiresAt = String(existingRenderLease.expires_at || "");
      throw error;
    }
    const refs = normalizeMemorySnapshotRefs(session.memoryContextSnapshots);
    const previousRef = refs.length ? refs[refs.length - 1] : null;
    const previousSnapshot = previousRef?.snapshotPath ? safeReadJson(previousRef.snapshotPath, null) : null;
    const previousOuterTrusted = !!previousSnapshot
      && previousSnapshot.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA
      && verifyMemoryContextSnapshotChecksum(previousSnapshot)
      && String(previousSnapshot?.session?.id || "") === session.id
      && String(previousSnapshot?.session?.group_id || "") === session.groupId
      && String(previousSnapshot?.session?.task_id || "") === session.taskId
      && String(previousSnapshot?.session?.project || "") === session.project
      && String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || "") === groupSessionId;
    const previousMemoryContext = previousSnapshot?.context?.memory_context || null;
    const previousSemanticChecksum = previousOuterTrusted ? taskAgentMemorySemanticChecksum(previousMemoryContext) : "";
    const previousSync = previousSnapshot?.context?.memory_snapshot_sync || null;
    const previousSyncVerification = previousOuterTrusted ? verifyTaskAgentMemorySnapshotSyncDecision(previousSync, {
      groupId: session.groupId,
      groupSessionId,
      taskId: session.taskId,
      taskAgentSessionId: session.id,
      targetProject: session.project,
      currentMemoryContextChecksum: previousSemanticChecksum,
    }) : { valid: false };
    const previousProof = previousSnapshot?.context?.memory_prompt_injection_proof || null;
    const previousProofVerification = previousOuterTrusted && previousSyncVerification.valid === true
      ? verifyTaskAgentMemoryPromptInjectionProof(previousProof, {
        groupId: session.groupId,
        groupSessionId,
        taskId: session.taskId,
        taskAgentSessionId: session.id,
        targetProject: session.project,
        memoryContextChecksum: previousSemanticChecksum,
        syncChecksum: String(previousSync?.sync_checksum || ""),
        renderedPromptChecksum: String(previousSnapshot?.context?.rendered_prompt_checksum || ""),
      })
      : { valid: false, deliveryReady: false };
    const previousReceipt = previousRef?.deliveryReceiptPath ? safeReadJson(previousRef.deliveryReceiptPath, null) : null;
    const previousReceiptTrusted = !!previousReceipt
      && verifyMemoryContextDeliveryReceiptChecksum(previousReceipt)
      && previousReceipt.delivered === true
      && String(previousReceipt.status || "") === "delivered"
      && String(previousReceipt.receiptId || "") === String(previousRef?.deliveryReceiptId || "")
      && String(previousReceipt.checksum || "") === String(previousRef?.deliveryReceiptChecksum || "")
      && String(previousReceipt.taskAgentSessionId || "") === session.id
      && String(previousReceipt.memoryContextSnapshotId || "") === String(previousSnapshot?.snapshot_id || "")
      && String(previousReceipt.memoryContextSnapshotChecksum || "") === String(previousSnapshot?.checksum || "");
    const previousCommitFile = String(previousRef?.memorySnapshotSyncCommitPath || (previousRef?.snapshotId ? getMemorySnapshotSyncCommitFile(session.id, previousRef.snapshotId) : ""));
    const previousCommit = previousCommitFile ? safeReadJson(previousCommitFile, null) : null;
    const previousCommitVerification = previousReceiptTrusted && previousProofVerification.valid === true && previousProofVerification.deliveryReady === true
      ? verifyTaskAgentMemorySnapshotSyncCommit(previousCommit, {
        groupId: session.groupId,
        groupSessionId,
        taskId: session.taskId,
        taskAgentSessionId: session.id,
        targetProject: session.project,
        snapshotId: String(previousSnapshot?.snapshot_id || ""),
        snapshotChecksum: String(previousSnapshot?.checksum || ""),
        syncChecksum: String(previousSync?.sync_checksum || ""),
        syncAction: String(previousSync?.action || ""),
        memoryPromptInjectionProofChecksum: String(previousProof?.proof_checksum || ""),
        deliveryReceiptId: String(previousReceipt?.receiptId || ""),
        deliveryReceiptChecksum: String(previousReceipt?.checksum || ""),
      })
      : { valid: false, committed: false };
    const previousEntryPlan = previousSnapshot?.context?.memory_entry_sync || taskAgentMemoryEntrySyncPlan(previousMemoryContext);
    const previousManifest = previousEntryPlan?.current_manifest || null;
    const previousManifestVerification = previousManifest ? verifyTaskAgentMemoryEntryManifest(previousManifest, {
      groupId: session.groupId,
      groupSessionId,
      sourceMemoryContextChecksum: previousSemanticChecksum,
    }) : { valid: false };
    const previousTrusted = previousOuterTrusted
      && previousSyncVerification.valid === true
      && previousProofVerification.valid === true
      && previousProofVerification.deliveryReady === true
      && previousReceiptTrusted
      && previousCommitVerification.valid === true
      && previousCommitVerification.committed === true
      && previousManifestVerification.valid === true;
    const reuseRenderLease = existingLeaseActive
      && Number(existingRenderLease.owner_pid || 0) === process.pid
      && String(existingRenderLease.source_memory_context_checksum || "") === sourceMemoryContextChecksum
      && String(existingRenderLease.base_snapshot_id || "") === String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || "")
      && String(existingRenderLease.base_snapshot_checksum || "") === String(previousSnapshot?.checksum || previousRef?.checksum || "");
    const staleRenderLeaseRecovered = !!existingRenderLease
      && existingRenderLease.status === "prepared"
      && !reuseRenderLease;
    const renderFencingToken = reuseRenderLease
      ? Number(existingRenderLease.fencing_token || 0)
      : Math.max(Number(session.memoryEntrySyncRenderFencingToken || 0), Number(existingRenderLease?.fencing_token || 0)) + 1;
    const renderLease = reuseRenderLease ? existingRenderLease : {
      schema: "ccm-task-agent-memory-entry-render-lease-v1",
      version: 1,
      lease_id: `tamerl_${crypto.randomBytes(12).toString("hex")}`,
      fencing_token: renderFencingToken,
      owner_pid: process.pid,
      status: "prepared",
      group_id: session.groupId,
      group_session_id: groupSessionId,
      task_id: session.taskId,
      task_agent_session_id: session.id,
      target_project: session.project,
      source_memory_context_checksum: sourceMemoryContextChecksum,
      base_snapshot_id: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
      base_snapshot_checksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
      base_manifest_checksum: previousTrusted ? String(previousManifest?.manifest_checksum || "") : "",
      acquired_at: new Date(preparedAtMs).toISOString(),
      expires_at: new Date(preparedAtMs + MEMORY_ENTRY_RENDER_LEASE_TTL_MS).toISOString(),
      recovered_stale_lease_id: staleRenderLeaseRecovered ? String(existingRenderLease?.lease_id || "") : "",
    };
    const plan = buildTaskAgentMemoryEntrySyncPlan({
      memory: memoryContextInput,
      groupId: session.groupId,
      groupSessionId,
      taskId: session.taskId,
      taskAgentSessionId: session.id,
      targetProject: session.project,
      previousSnapshotId: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
      previousSnapshotChecksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
      previousManifest,
      previousTrusted,
      renderLease,
    });
    const sealedRenderLease = {
      ...renderLease,
      plan_checksum: plan.plan_checksum,
      manifest_checksum: String(plan.current_manifest?.manifest_checksum || ""),
      transport_mode: plan.transport_mode,
    };
    const previousHistory = Array.isArray(session.memoryEntrySyncRenderLeaseHistory) ? session.memoryEntrySyncRenderLeaseHistory : [];
    if (!reuseRenderLease && existingRenderLease?.lease_id) {
      session.memoryEntrySyncRenderLeaseHistory = [...previousHistory, existingRenderLease].slice(-MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT);
    }
    if (!session.groupSessionId && groupSessionId.startsWith("gcs_")) session.groupSessionId = groupSessionId;
    session.memoryEntrySyncRenderLease = sealedRenderLease;
    session.memoryEntrySyncRenderFencingToken = renderFencingToken;
    session.memoryEntrySyncRenderLeaseTakeoverCount = Number(session.memoryEntrySyncRenderLeaseTakeoverCount || 0) + (staleRenderLeaseRecovered ? 1 : 0);
    session.lastUsedAt = new Date(preparedAtMs).toISOString();
    saveStore(store);
    return {
      memoryContext: attachTaskAgentMemoryEntrySyncPlan(memoryContextInput, plan),
      plan,
      prepared: true,
      previousBaselineTrusted: previousTrusted,
      renderLease: sealedRenderLease,
      renderLeaseReused: reuseRenderLease,
      staleRenderLeaseRecovered,
    };
  });
}


export function verifyTaskAgentMemoryEntryRenderContentionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA) issues.push("render_contention_schema_invalid");
  if (Number(receipt?.version || 0) !== 1) issues.push("render_contention_version_invalid");
  if (!new Set(["resolved", "timeout", "same_process"]).has(String(receipt?.status || ""))) issues.push("render_contention_status_invalid");
  if (String(receipt?.contention_checksum || "") !== memoryEntryRenderContentionChecksum(receipt)) issues.push("render_contention_checksum_invalid");
  const bindings: Array<[string, any, any]> = [
    ["group_id", expected.groupId, receipt?.group_id],
    ["group_session_id", expected.groupSessionId, receipt?.group_session_id],
    ["task_id", expected.taskId, receipt?.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId, receipt?.task_agent_session_id],
    ["target_project", expected.targetProject, receipt?.target_project],
  ];
  for (const [field, wanted, actual] of bindings) if (wanted !== undefined && String(wanted || "") !== String(actual || "")) issues.push(`render_contention_${field}_mismatch`);
  if (!Number.isInteger(Number(receipt?.contender_pid || 0)) || Number(receipt?.contender_pid || 0) <= 0) issues.push("render_contention_contender_pid_invalid");
  if (!/^tamerl_[a-f0-9]{24}$/.test(String(receipt?.blocked_lease_id || ""))) issues.push("render_contention_blocked_lease_invalid");
  if (!Number.isInteger(Number(receipt?.blocked_fencing_token || 0)) || Number(receipt?.blocked_fencing_token || 0) <= 0) issues.push("render_contention_fencing_token_invalid");
  if (!Number.isInteger(Number(receipt?.blocked_owner_pid || 0)) || Number(receipt?.blocked_owner_pid || 0) <= 0) issues.push("render_contention_owner_pid_invalid");
  if (!Number.isInteger(Number(receipt?.retries ?? -1)) || Number(receipt?.retries ?? -1) < 0 || Number(receipt?.retries || 0) > 5) issues.push("render_contention_retries_invalid");
  if (!Number.isInteger(Number(receipt?.waited_ms ?? -1)) || Number(receipt?.waited_ms ?? -1) < 0) issues.push("render_contention_wait_invalid");
  if (!/^[a-f0-9]{64}$/.test(String(receipt?.source_memory_context_checksum || ""))) issues.push("render_contention_source_checksum_invalid");
  if (!Number.isFinite(Date.parse(String(receipt?.observed_at || "")))) issues.push("render_contention_observed_at_invalid");
  if (receipt?.status === "same_process" && (Number(receipt?.retries || 0) !== 0 || Number(receipt?.waited_ms || 0) !== 0)) issues.push("render_contention_same_process_wait_invalid");
  return { valid: issues.length === 0, issues: [...new Set(issues)], status: String(receipt?.status || "") };
}


export function prepareTaskAgentMemoryEntrySyncContextWithRetry(sessionId: string, memoryContextInput: any, options: {
  maxConflictRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
} = {}) {
  const maxConflictRetries = Math.min(5, Math.max(0, Math.floor(Number(options.maxConflictRetries ?? MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES))));
  const baseDelayMs = Math.min(1_000, Math.max(1, Math.floor(Number(options.baseDelayMs ?? MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS))));
  const maxDelayMs = Math.min(2_000, Math.max(baseDelayMs, Math.floor(Number(options.maxDelayMs ?? MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS))));
  const jitterMs = Math.min(500, Math.max(0, Math.floor(Number(options.jitterMs ?? MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS))));
  const sourceMemoryContextChecksum = taskAgentMemorySemanticChecksum(memoryContextInput || {});
  let retries = 0;
  let waitedMs = 0;
  let firstConflict: any = null;
  while (true) {
    try {
      const prepared = prepareTaskAgentMemoryEntrySyncContext(sessionId, memoryContextInput);
      if (!firstConflict) return prepared;
      const contention = recordTaskAgentMemoryEntryRenderContention(sessionId, {
        status: "resolved",
        retries,
        waitedMs,
        blockedLeaseId: firstConflict.leaseId,
        blockedFencingToken: firstConflict.fencingToken,
        blockedOwnerPid: firstConflict.ownerPid,
        sourceMemoryContextChecksum,
      });
      return { ...prepared, renderContention: contention };
    } catch (error: any) {
      if (error?.code !== "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY") throw error;
      firstConflict ||= error;
      const sameProcess = Number(error.ownerPid || 0) === process.pid;
      if (sameProcess || retries >= maxConflictRetries) {
        const status = sameProcess ? "same_process" : "timeout";
        const contention = recordTaskAgentMemoryEntryRenderContention(sessionId, {
          status,
          retries,
          waitedMs,
          blockedLeaseId: firstConflict.leaseId,
          blockedFencingToken: firstConflict.fencingToken,
          blockedOwnerPid: firstConflict.ownerPid,
          sourceMemoryContextChecksum,
        });
        error.renderContentionStatus = status;
        error.renderContentionRetries = retries;
        error.renderContentionWaitedMs = waitedMs;
        error.renderContentionReceipt = contention;
        throw error;
      }
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** retries));
      const delayMs = exponentialDelay + (jitterMs > 0 ? crypto.randomInt(0, jitterMs + 1) : 0);
      sleepForStoreLock(delayMs);
      waitedMs += delayMs;
      retries += 1;
    }
  }
}


export function bindTaskAgentMemoryContextSnapshot(sessionId: string, input: {
  taskId?: string;
  groupId?: string;
  project?: string;
  agentType?: string;
  nativeSessionId?: string;
  turn?: number;
  executionId?: string;
  traceId?: string;
  workerContextPacket?: any;
  workerHandoff?: any;
  workerHandoffSummary?: any;
  memoryContext?: any;
  renderedHandoff?: string;
  renderedPrompt?: string;
  renderedMemoryContext?: string;
  requireMemoryPromptInjectionProof?: boolean;
  requireTrustedMemoryPromptEnvelope?: boolean;
  requireProviderMemoryChannelAcknowledgement?: boolean;
  requireMemoryContextConsumptionReceipt?: boolean;
  memoryContextConsumptionChallenge?: any;
  runtimeToolSnapshot?: any;
  invocationLineage?: any;
} = {}) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === id);
    if (index < 0) return null;
    const current = store.sessions[index];
  const packet = input.workerContextPacket || input.workerHandoff?.worker_context_packet || input.workerHandoff?.workerContextPacket || {};
  const packetMemory = packet.memory || input.workerHandoff?.references?.memory_context || input.workerHandoff?.references?.memoryContext || null;
  const memoryContext = taskAgentMemoryEntrySyncPlan(packetMemory)
    ? packetMemory
    : input.memoryContext || packetMemory || null;
  const groupSessionMemoryBinding = extractGroupSessionMemoryBinding(memoryContext || {});
  const workerHandoffId = String(input.workerHandoff?.handoff_id || input.workerHandoff?.handoffId || input.workerHandoffSummary?.handoff_id || input.workerHandoffSummary?.handoffId || "").trim();
  const workerContextPacketId = String(packet?.packet_id || packet?.packetId || input.workerHandoffSummary?.packet_id || input.workerHandoffSummary?.packetId || "").trim();
  const generatedAt = new Date().toISOString();
  const turn = Number(input.turn || current.turnCount + 1 || 0);
  const memoryContextChecksum = taskAgentMemorySemanticChecksum(memoryContext || {});
  const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
  const memoryEntrySync = taskAgentMemoryEntrySyncPlan(memoryContext);
  const memoryEntryTransport = taskAgentMemoryTransport(memoryContext);
  const rejectCurrentMemoryEntryRenderLease = (reason: string) => {
    const lease = current.memoryEntrySyncRenderLease || null;
    if (!lease || String(lease.lease_id || "") !== String(memoryEntrySync?.render_lease_id || "")
      || Number(lease.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0)) return;
    current.memoryEntrySyncRenderLease = {
      ...lease,
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    };
    current.lastUsedAt = new Date().toISOString();
    store.sessions[index] = current;
    saveStore(store);
  };
  if (memoryEntrySync && !memoryEntryTransport.valid) {
    rejectCurrentMemoryEntryRenderLease(`plan_invalid:${memoryEntryTransport.issues.join(",")}`);
    const error: any = new Error(`task Agent memory entry sync plan invalid: ${memoryEntryTransport.issues.join(",")}`);
    error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_INVALID";
    throw error;
  }
  const effectiveRenderedMemoryContext = memoryEntryTransport.mode === "delta"
    ? memoryEntryTransport.text
    : memoryEntryTransport.mode === "continuation"
      ? ""
      : String(input.renderedMemoryContext || "");
  const renderedProjection = renderedMemoryProjection(memoryContext, effectiveRenderedMemoryContext);
  const trustedEnvelopeRequired = input.requireTrustedMemoryPromptEnvelope === true;
  const trustedEnvelope = verifyTrustedMemoryPromptEnvelope(String(input.renderedPrompt || ""), {
    ...(renderedProjection.text ? { projection: renderedProjection.text } : {}),
    sourceChecksum: trustedMemorySourceChecksum(memoryContext || {}),
  });
  const fullMemoryProjectionInjected = !!renderedProjection.text
    && (trustedEnvelopeRequired
      ? trustedEnvelope.valid
      : String(input.renderedPrompt || "").includes(renderedProjection.text));
  const memorySnapshotSync = createTaskAgentMemorySnapshotSyncDecision({
    session: current,
    refs,
    groupSessionMemoryBinding,
    currentMemoryContextChecksum: memoryContextChecksum,
    generatedAt,
    turn,
    fullMemoryProjectionInjected: memoryEntryTransport.mode === "delta" ? false : fullMemoryProjectionInjected,
    enforcementRequired: input.requireMemoryPromptInjectionProof === true,
  });
  if (memoryEntrySync) {
    const currentManifest = buildTaskAgentMemoryEntryManifest(stripTaskAgentMemoryEntrySync(memoryContext));
    const entryVerification = verifyTaskAgentMemoryEntrySyncPlan(memoryEntrySync, {
      groupId: current.groupId,
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: current.taskId,
      taskAgentSessionId: current.id,
      targetProject: current.project,
      sourceMemoryContextChecksum: memoryContextChecksum,
    });
    const entryIssues = [...entryVerification.issues];
    const currentRenderLease = current.memoryEntrySyncRenderLease || null;
    const renderLeaseExpiresMs = Date.parse(String(currentRenderLease?.expires_at || ""));
    if (currentRenderLease?.schema !== "ccm-task-agent-memory-entry-render-lease-v1") entryIssues.push("entry_sync_render_lease_missing");
    if (String(currentRenderLease?.status || "") !== "prepared") entryIssues.push("entry_sync_render_lease_not_prepared");
    if (String(currentRenderLease?.lease_id || "") !== String(memoryEntrySync?.render_lease_id || "")) entryIssues.push("entry_sync_render_lease_id_stale");
    if (Number(currentRenderLease?.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0)) entryIssues.push("entry_sync_render_fencing_token_stale");
    if (Number(memoryEntrySync?.render_lease_owner_pid || 0) !== process.pid || Number(currentRenderLease?.owner_pid || 0) !== process.pid) entryIssues.push("entry_sync_render_lease_owner_mismatch");
    if (!Number.isFinite(renderLeaseExpiresMs) || renderLeaseExpiresMs <= Date.now()) entryIssues.push("entry_sync_render_lease_expired");
    if (String(currentRenderLease?.source_memory_context_checksum || "") !== memoryContextChecksum) entryIssues.push("entry_sync_render_lease_source_mismatch");
    if (String(currentRenderLease?.plan_checksum || "") !== String(memoryEntrySync?.plan_checksum || "")) entryIssues.push("entry_sync_render_lease_plan_mismatch");
    if (String(currentRenderLease?.manifest_checksum || "") !== String(memoryEntrySync?.current_manifest?.manifest_checksum || "")) entryIssues.push("entry_sync_render_lease_manifest_mismatch");
    if (String(currentRenderLease?.base_snapshot_id || "") !== String(memoryEntrySync?.previous_snapshot_id || "")) entryIssues.push("entry_sync_render_lease_base_snapshot_mismatch");
    if (String(currentRenderLease?.base_manifest_checksum || "") !== String(memoryEntrySync?.previous_manifest_checksum || "")) entryIssues.push("entry_sync_render_lease_base_manifest_mismatch");
    if (String(memoryEntrySync?.current_manifest?.manifest_checksum || "") !== String(currentManifest.manifest_checksum || "")) entryIssues.push("entry_sync_current_manifest_stale");
    if (memoryEntryTransport.mode !== "full" && String(memoryEntrySync?.previous_snapshot_id || "") !== String(memorySnapshotSync?.previous_snapshot_id || "")) entryIssues.push("entry_sync_previous_snapshot_stale");
    const compatible = (memorySnapshotSync.action === "initialize" && memoryEntryTransport.mode === "full")
      || (memorySnapshotSync.action === "none" && memoryEntryTransport.mode === "continuation")
      || (memorySnapshotSync.action === "prompt_update" && ["full", "delta"].includes(memoryEntryTransport.mode));
    if (!compatible) entryIssues.push("entry_sync_snapshot_action_mismatch");
    if (entryIssues.length) {
      rejectCurrentMemoryEntryRenderLease(`bind_stale:${[...new Set(entryIssues)].join(",")}`);
      const error: any = new Error(`task Agent memory entry sync changed before snapshot bind: ${[...new Set(entryIssues)].join(",")}`);
      error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_STALE";
      throw error;
    }
  }
  const memoryPromptInjectionProof = createTaskAgentMemoryPromptInjectionProof({
    session: current,
    groupSessionMemoryBinding,
    memoryContext,
    memoryContextChecksum,
    memorySnapshotSync,
    renderedPrompt: String(input.renderedPrompt || ""),
    renderedMemoryContext: effectiveRenderedMemoryContext,
    enforcementRequired: input.requireMemoryPromptInjectionProof === true,
    trustedEnvelopeRequired,
    generatedAt,
  });
  const gateIds = Array.from(collectMemoryContextGateIds({
    worker_context_packet: packet,
    worker_handoff: input.workerHandoff || null,
    memory_context: memoryContext,
  })).slice(0, 100);
  const postTurnSummaryCapsuleInput = packet?.post_turn_summary_delivery_capsule
    || packet?.postTurnSummaryDeliveryCapsule
    || extractGroupPostTurnSummaryDeliveryCapsule(memoryContext || packet || null);
  const postTurnSummaryCapsule = validateGroupPostTurnSummaryDeliveryCapsule(postTurnSummaryCapsuleInput, {
    expectedBinding: {
      group_id: String(input.groupId || current.groupId || ""),
      task_id: String(input.taskId || current.taskId || ""),
      target_project: String(input.project || current.project || ""),
      task_agent_session_id: current.id,
      native_session_id: String(input.nativeSessionId || current.nativeSessionId || ""),
      execution_id: String(input.executionId || ""),
      attempt_sequence: turn,
      invocation_kind: turn > 1 ? "resume" : "spawn",
      ...(input.invocationLineage?.invocation_edge_id ? {
        invocation_edge_id: input.invocationLineage.invocation_edge_id,
        parent_invocation_edge_id: input.invocationLineage.parent_invocation_edge_id || "",
        root_invocation_edge_id: input.invocationLineage.root_invocation_edge_id || "",
        branch_id: input.invocationLineage.branch_id || "",
        parent_branch_id: input.invocationLineage.parent_branch_id || "",
        branch_kind: input.invocationLineage.branch_kind || "main",
        expected_lineage_head_checksum: input.invocationLineage.expected_lineage_head_checksum || "",
      } : {}),
    },
    renderedPrompt: input.renderedPrompt || "",
  });
  const snapshotSeed = [
    current.id,
    input.taskId || current.taskId,
    input.groupId || current.groupId,
    input.project || current.project,
    input.executionId || "",
    workerContextPacketId,
    turn,
    generatedAt,
  ].join("\0");
  const snapshotId = `tams_${hashValue(snapshotSeed, 18)}`;
  const snapshotFile = path.join(getMemoryContextSnapshotDir(current.id), `${snapshotId}.json`);
  const payloadWithoutChecksum = {
    schema: TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    session: {
      id: current.id,
      scope_id: current.scopeId,
      task_id: String(input.taskId || current.taskId || "").trim(),
      group_id: String(input.groupId || current.groupId || "").trim(),
      project: String(input.project || current.project || "").trim(),
      agent_type: normalizeAgentRuntimeId(input.agentType || current.agentType || ""),
      native_session_id: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
      turn,
      resume_mode: current.resumeMode,
    },
    context: {
      execution_id: String(input.executionId || "").trim(),
      trace_id: String(input.traceId || "").trim(),
      worker_context_packet_id: workerContextPacketId,
      worker_handoff_id: workerHandoffId,
      worker_context_packet: packet || null,
      worker_handoff_summary: input.workerHandoffSummary || null,
      memory_context: memoryContext || null,
      memory_context_checksum: memoryContextChecksum,
      memory_entry_sync: memoryEntrySync || null,
      group_session_memory_binding: groupSessionMemoryBinding,
      memory_snapshot_sync: memorySnapshotSync,
      memory_prompt_injection_proof: memoryPromptInjectionProof,
      provider_memory_channel_acknowledgement_required: input.requireProviderMemoryChannelAcknowledgement === true,
      memory_context_consumption_receipt_required: input.requireMemoryContextConsumptionReceipt === true,
      memory_context_consumption_challenge: input.memoryContextConsumptionChallenge || null,
      post_turn_summary_delivery_capsule: postTurnSummaryCapsule,
      post_turn_summary_capsule_checksum: String(postTurnSummaryCapsule?.capsule_checksum || ""),
      post_turn_summary_capsule_prompt_bound: postTurnSummaryCapsule?.prompt_bound === true,
      post_turn_summary_capsule_selected_count: Number(postTurnSummaryCapsule?.selected_count || 0),
      post_turn_summary_capsule_ledger_head_checksum: String(postTurnSummaryCapsule?.ledger_head_checksum || ""),
      task_agent_invocation_lineage: input.invocationLineage || packet?.task_agent_invocation_lineage || null,
      invocation_edge_id: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
      invocation_branch_id: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
      rendered_handoff_checksum: input.renderedHandoff ? hashValue(input.renderedHandoff) : "",
      rendered_prompt_checksum: input.renderedPrompt ? hashValue(input.renderedPrompt) : "",
      rendered_prompt_excerpt: input.renderedPrompt ? String(input.renderedPrompt).slice(0, 4000) : "",
      runtime_tool_snapshot: input.runtimeToolSnapshot || null,
      gate_ids: gateIds,
    },
  };
  const checksum = hashValue(JSON.parse(JSON.stringify(payloadWithoutChecksum)));
  const snapshot = {
    ...payloadWithoutChecksum,
    checksum,
    snapshot_file: snapshotFile,
  };
  writeJsonAtomic(snapshotFile, snapshot);
  const ref: TaskAgentMemoryContextSnapshotRef = {
    snapshotId,
    snapshotPath: snapshotFile,
    checksum,
    workerContextPacketId,
    workerHandoffId,
    gateIds,
    generatedAt,
    invocationEdgeId: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
    branchId: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
    memorySnapshotSyncAction: memorySnapshotSync.action,
    memorySnapshotSyncChecksum: memorySnapshotSync.sync_checksum,
    memorySnapshotSyncedFromId: memorySnapshotSync.previous_snapshot_id,
  };
  refs.push(ref);
  const next: TaskAgentSession = {
    ...current,
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || current.groupSessionId || ""),
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotPath: snapshotFile,
    memoryContextSnapshotChecksum: checksum,
    memoryContextPacketId: workerContextPacketId,
    memoryContextSnapshotAt: generatedAt,
    memoryContextDeliveryReceiptId: "",
    memoryContextDeliveryReceiptPath: "",
    memoryContextDeliveryReceiptChecksum: "",
    memoryContextDeliveryStatus: "pending",
    memoryContextDeliveredAt: "",
    latestMemoryContextDeliveryAttemptReceiptId: "",
    latestMemoryContextDeliveryAttemptReceiptPath: "",
    latestMemoryContextDeliveryAttemptReceiptChecksum: "",
    latestMemoryContextDeliveryAttemptStatus: "pending",
    latestMemoryContextDeliveryAttemptAt: "",
    memorySnapshotSyncCommitPath: "",
    memorySnapshotSyncCommitChecksum: "",
    memorySnapshotSyncCommitStatus: "pending",
    memorySnapshotSyncCommittedAt: "",
    memoryEntrySyncRenderLease: memoryEntrySync ? {
      ...current.memoryEntrySyncRenderLease,
      status: "bound",
      bound_at: generatedAt,
      bound_snapshot_id: snapshotId,
      bound_snapshot_checksum: checksum,
    } : current.memoryEntrySyncRenderLease,
    memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
    lastUsedAt: generatedAt,
  };
  store.sessions[index] = next;
  saveStore(store);
    return { session: next, snapshot, ref };
  });
}


export function attachTaskAgentFinalDispatchPayloadGate(sessionId: string, input: {
  snapshotId?: string;
  finalDispatchPayloadGate?: any;
  final_dispatch_payload_gate?: any;
  finalDispatchReactiveCompact?: any;
  final_dispatch_reactive_compact?: any;
  renderedPrompt?: string;
  rendered_prompt?: string;
} = {}) {
  const id = String(sessionId || "").trim();
  const requestedSnapshotId = String(input.snapshotId || "").trim();
  const gate = input.finalDispatchPayloadGate || input.final_dispatch_payload_gate || null;
  const reactiveCompact = input.finalDispatchReactiveCompact || input.final_dispatch_reactive_compact || null;
  const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
  if (!id || !gate || !renderedPrompt) return { updated: false, reason: "missing_final_dispatch_binding_input" };
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === id);
    if (index < 0) return { updated: false, reason: "task_agent_session_missing" };
    const current = store.sessions[index];
    const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
    const ref = refs.find(item => item.snapshotId === (requestedSnapshotId || current.memoryContextSnapshotId))
      || refs.find(item => item.snapshotId === current.memoryContextSnapshotId);
    const snapshotFile = String(ref?.snapshotPath || current.memoryContextSnapshotPath || "").trim();
    const snapshot = safeReadJson(snapshotFile, null);
    if (!snapshot || !verifyMemoryContextSnapshotChecksum(snapshot)) return { updated: false, reason: "memory_context_snapshot_invalid" };
    const context = snapshot.context || {};
    const packet = context.worker_context_packet || {};
    const verification = verifyFinalWorkerDispatchPayloadGate(gate, {
      renderedPrompt,
      groupId: snapshot.session?.group_id || current.groupId,
      groupSessionId: capacityRevalidationGroupSessionId(packet),
      taskId: snapshot.session?.task_id || current.taskId,
      taskAgentSessionId: snapshot.session?.id || current.id,
      workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
    });
    if (!verification.valid) return { updated: false, reason: "final_dispatch_payload_gate_invalid", issues: verification.issues };
    const reactiveCompactVerification = reactiveCompact ? verifyFinalDispatchReactiveCompactReceipt(reactiveCompact, {
      groupId: snapshot.session?.group_id || current.groupId,
      groupSessionId: capacityRevalidationGroupSessionId(packet),
      taskId: snapshot.session?.task_id || current.taskId,
      taskAgentSessionId: snapshot.session?.id || current.id,
      workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
    }) : { valid: true, issues: [] };
    if (!reactiveCompactVerification.valid) return { updated: false, reason: "final_dispatch_reactive_compact_invalid", issues: reactiveCompactVerification.issues };
    let memoryPromptInjectionProof: any = null;
    try {
      memoryPromptInjectionProof = createTaskAgentMemoryPromptInjectionProof({
        session: current,
        groupSessionMemoryBinding: context.group_session_memory_binding || extractGroupSessionMemoryBinding(context.memory_context || {}),
        memoryContext: context.memory_context || null,
        memoryContextChecksum: String(context.memory_context_checksum || ""),
        memorySnapshotSync: context.memory_snapshot_sync || null,
        renderedPrompt,
        enforcementRequired: context.memory_prompt_injection_proof?.enforcement_required === true,
        trustedEnvelopeRequired: context.memory_prompt_injection_proof?.trusted_envelope_required === true,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      return { updated: false, reason: "memory_prompt_injection_required", issues: error?.issues || [error?.message || String(error)] };
    }
    const nextWithoutChecksum = {
      ...snapshot,
      context: {
        ...context,
        worker_context_packet: {
          ...packet,
          final_dispatch_payload_gate: gate,
          ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
        },
        final_dispatch_payload_gate: gate,
        ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
        final_dispatch_prompt_checksum: String(gate.prompt_checksum || ""),
        final_dispatch_prompt_tokens: Number(gate.estimated_total_input_tokens || 0),
        final_dispatch_prompt_chars: Number(gate.prompt_chars || renderedPrompt.length),
        final_dispatch_gate_attached_at: new Date().toISOString(),
        rendered_prompt_checksum: hashValue(renderedPrompt),
        rendered_prompt_excerpt: renderedPrompt.slice(0, 4000),
        memory_prompt_injection_proof: memoryPromptInjectionProof,
      },
    };
    delete nextWithoutChecksum.checksum;
    delete nextWithoutChecksum.snapshot_file;
    const serializedPayload = JSON.parse(JSON.stringify(nextWithoutChecksum));
    const checksum = hashValue(serializedPayload);
    const nextSnapshot = { ...serializedPayload, checksum, snapshot_file: snapshotFile };
    writeJsonAtomic(snapshotFile, nextSnapshot);
    const nextRefs = refs.map(item => item.snapshotId === snapshot.snapshot_id ? { ...item, checksum } : item);
    const nextSession: TaskAgentSession = {
      ...current,
      memoryContextSnapshotChecksum: current.memoryContextSnapshotId === snapshot.snapshot_id ? checksum : current.memoryContextSnapshotChecksum,
      memoryContextSnapshots: nextRefs,
      lastUsedAt: new Date().toISOString(),
    };
    store.sessions[index] = nextSession;
    saveStore(store);
    return { updated: true, session: nextSession, snapshot: nextSnapshot, gate, verification, reactiveCompact, reactiveCompactVerification };
  });
}

