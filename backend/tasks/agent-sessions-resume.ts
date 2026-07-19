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
  FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
  TaskAgentSession,
  capacityRevalidationCommitChecksum,
  capacityRevalidationGateChecksum,
  capacityRevalidationGroupSessionId,
  capacityRevalidationProofChecksum,
  createNativeSessionId,
  emptyFinalDispatchReactiveCompactCircuit,
  finalDispatchReactiveCompactCircuitChecksum,
  hashValue,
  loadStore,
  saveStore,
  sessionSnapshotContextWindow,
  validateCapacityRevalidationPacket,
  withTaskAgentSessionStoreLock
} from "./agent-sessions-shared";

export function openTaskAgentSession(input: {
  scopeId: string;
  taskId?: string;
  groupId: string;
  project: string;
  agentType: string;
}) {
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const runtime = normalizeAgentRuntimeId(input.agentType);
  const existing = [...store.sessions].reverse().find((item: TaskAgentSession) =>
    item.status === "open"
    && item.scopeId === input.scopeId
    && item.groupId === input.groupId
    && item.project === input.project
    && item.agentType === runtime
  );
  if (existing) {
    if (existing.resumeMode !== "native" && getAgentRuntime(runtime).capabilities.sessionResume && Number(existing.nativeCaptureFailures || 0) < 3) {
      existing.resumeMode = "native";
      existing.nativeSessionId = "";
      existing.nativeRecoveryAttempts = Number(existing.nativeRecoveryAttempts || 0) + 1;
      existing.lastNativeRecoveryAt = new Date().toISOString();
      existing.lastError = "正在重新尝试捕获原生 session ID";
      saveStore(store);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const session: TaskAgentSession = {
    id: `tas_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
    scopeId: String(input.scopeId || input.taskId || "").trim(),
    taskId: String(input.taskId || "").trim(),
    groupId: String(input.groupId || "").trim(),
    project: String(input.project || "").trim(),
    agentType: runtime,
    nativeSessionId: createNativeSessionId(runtime),
    resumeMode: getAgentRuntime(runtime).capabilities.sessionResume ? "native" : "scratchpad",
    status: "open",
    turnCount: 0,
    lastTurnSucceeded: null,
    createdAt: now,
    lastUsedAt: now,
    closedAt: "",
    closeReason: "",
    nativeCaptureFailures: 0,
    nativeRecoveryAttempts: 0,
    nativeSessionHistory: [],
    lastNativeRecoveryAt: "",
    lastError: "",
  };
  store.sessions.push(session);
  saveStore(store);
    return session;
  });
}


export function recordTaskAgentSessionTurn(sessionId: string, result: { nativeSessionId?: string; success?: boolean; error?: string; nativeSessionInvalid?: boolean; nativeContinuationUnverified?: boolean; nativeContinuationEvidence?: any; permissionDrift?: boolean; runtimeToolSnapshot?: any; modelCapabilityRecord?: any; nativeModelCapabilityRecord?: any } = {}) {
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === sessionId);
    if (index < 0) return null;
    const current = store.sessions[index];
    const next = advanceTaskAgentSession(current, result);
    store.sessions[index] = next;
    saveStore(store);
    return next;
  });
}


export function verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(state: any, expected: any = {}) {
  const issues: string[] = [];
  if (state?.schema !== "ccm-final-dispatch-reactive-compact-circuit-breaker-v1" || Number(state?.version || 0) !== 1) issues.push("final_dispatch_reactive_circuit_schema_invalid");
  if (!String(state?.group_id || "")) issues.push("final_dispatch_reactive_circuit_group_missing");
  if (!String(state?.group_session_id || "").startsWith("gcs_")) issues.push("final_dispatch_reactive_circuit_exact_group_session_missing");
  if (!String(state?.task_id || "")) issues.push("final_dispatch_reactive_circuit_task_missing");
  if (!String(state?.task_agent_session_id || "").startsWith("tas_")) issues.push("final_dispatch_reactive_circuit_task_session_missing");
  if (String(state?.scope_id || "") !== `${String(state?.group_id || "")}::${String(state?.group_session_id || "")}::${String(state?.task_id || "")}::${String(state?.task_agent_session_id || "")}`) issues.push("final_dispatch_reactive_circuit_scope_invalid");
  const failures = Number(state?.consecutive_failures || 0);
  if (!Number.isInteger(failures) || failures < 0 || failures > FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES) issues.push("final_dispatch_reactive_circuit_failure_count_invalid");
  if (!['closed', 'open'].includes(String(state?.state || ""))) issues.push("final_dispatch_reactive_circuit_state_invalid");
  if ((failures >= FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES) !== (state?.state === "open")) issues.push("final_dispatch_reactive_circuit_state_count_mismatch");
  for (const [field, value] of [
    ["group_id", expected.groupId || expected.group_id],
    ["group_session_id", expected.groupSessionId || expected.group_session_id],
    ["task_id", expected.taskId || expected.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
  ]) if (value && String(state?.[field] || "") !== String(value)) issues.push(`final_dispatch_reactive_circuit_${field}_mismatch`);
  if (String(state?.state_checksum || "") !== finalDispatchReactiveCompactCircuitChecksum(state)) issues.push("final_dispatch_reactive_circuit_checksum_invalid");
  return { valid: issues.length === 0, issues };
}


export function inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(sessionId: string, input: any = {}) {
  const session = loadStore().sessions.find((item: TaskAgentSession) => item.id === String(sessionId || ""));
  if (!session) return { state: "fail_closed", blocked: true, checksum_valid: false, issues: ["task_agent_session_missing"] };
  const groupSessionId = String(input.groupSessionId || input.group_session_id || session.finalDispatchReactiveCompactCircuitBreaker?.group_session_id || "");
  const raw = session.finalDispatchReactiveCompactCircuitBreaker || emptyFinalDispatchReactiveCompactCircuit(session, groupSessionId);
  const verification = verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(raw, {
    groupId: input.groupId || input.group_id || session.groupId,
    groupSessionId,
    taskId: input.taskId || input.task_id || session.taskId,
    taskAgentSessionId: session.id,
  });
  if (!verification.valid) return { ...raw, state: "fail_closed", blocked: true, checksum_valid: false, issues: verification.issues };
  return { ...raw, blocked: raw.state === "open", checksum_valid: true, issues: [] };
}


export function recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(sessionId: string, input: any = {}) {
  const id = String(sessionId || "").trim();
  const outcome = String(input.outcome || "").trim();
  const attemptId = String(input.attemptId || input.attempt_id || "").trim();
  if (!id || !attemptId || !["failure", "success"].includes(outcome)) throw new Error("final dispatch reactive compact circuit outcome requires session, attempt, and success/failure");
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === id);
    if (index < 0) throw new Error("task agent session missing for final dispatch reactive compact circuit");
    const session = store.sessions[index];
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    if (!groupSessionId.startsWith("gcs_")) throw new Error("final dispatch reactive compact circuit requires exact gcs_* session");
    const currentRaw = session.finalDispatchReactiveCompactCircuitBreaker || emptyFinalDispatchReactiveCompactCircuit(session, groupSessionId);
    const verification = verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(currentRaw, {
      groupId: input.groupId || input.group_id || session.groupId,
      groupSessionId,
      taskId: input.taskId || input.task_id || session.taskId,
      taskAgentSessionId: session.id,
    });
    if (!verification.valid && outcome !== "success") return { ...currentRaw, state: "fail_closed", blocked: true, checksum_valid: false, issues: verification.issues, recorded: false };
    if (verification.valid && currentRaw.last_attempt_id === attemptId) return { ...currentRaw, blocked: currentRaw.state === "open", checksum_valid: true, issues: [], recorded: false, idempotent: true };
    const now = String(input.at || input.recorded_at || new Date().toISOString());
    const previousFailures = verification.valid ? Number(currentRaw.consecutive_failures || 0) : FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES;
    const consecutiveFailures = outcome === "success" ? 0 : Math.min(FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES, previousFailures + 1);
    const state = consecutiveFailures >= FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES ? "open" : "closed";
    const event = {
      event_id: `fdrcbe_${hashValue([session.groupId, groupSessionId, session.taskId, session.id, attemptId, outcome], 24)}`,
      attempt_id: attemptId,
      outcome,
      reason: String(input.reason || (outcome === "success" ? "provider_accepted_recovered_prompt" : "reactive_compact_failed")).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
      error_fingerprint: input.error ? hashValue(String(input.error), 24) : "",
      consecutive_failures: consecutiveFailures,
      state,
      recorded_at: now,
    };
    const payload: any = {
      schema: "ccm-final-dispatch-reactive-compact-circuit-breaker-v1",
      version: 1,
      group_id: session.groupId,
      group_session_id: groupSessionId,
      task_id: session.taskId,
      task_agent_session_id: session.id,
      scope_id: `${session.groupId}::${groupSessionId}::${session.taskId}::${session.id}`,
      state,
      consecutive_failures: consecutiveFailures,
      max_consecutive_failures: FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
      revision: Number(currentRaw.revision || 0) + 1,
      opened_at: state === "open" ? String(currentRaw.opened_at || now) : "",
      last_failure_at: outcome === "failure" ? now : String(currentRaw.last_failure_at || ""),
      last_success_at: outcome === "success" ? now : String(currentRaw.last_success_at || ""),
      last_attempt_id: attemptId,
      recent_events: [...(Array.isArray(currentRaw.recent_events) ? currentRaw.recent_events : []), event].slice(-40),
      updated_at: now,
    };
    const saved = { ...payload, state_checksum: finalDispatchReactiveCompactCircuitChecksum(payload) };
    store.sessions[index] = {
      ...session,
      finalDispatchReactiveCompactCircuitBreaker: saved,
      compaction: {
        ...(session.compaction || {}),
        scope: "task_agent",
        sessionId: session.id,
        consecutiveFailures,
        lastFailureAt: outcome === "failure" ? now : "",
        lastError: outcome === "failure" ? String(input.error || input.reason || "reactive_compact_failed").slice(0, 800) : "",
      },
      lastUsedAt: now,
    };
    saveStore(store);
    return { ...saved, blocked: state === "open", checksum_valid: true, issues: [], recorded: true, idempotent: false };
  });
}


export function advanceTaskAgentSession(current: TaskAgentSession, result: { nativeSessionId?: string; success?: boolean; error?: string; nativeSessionInvalid?: boolean; nativeContinuationUnverified?: boolean; nativeContinuationEvidence?: any; permissionDrift?: boolean; runtimeToolSnapshot?: any; modelCapabilityRecord?: any; nativeModelCapabilityRecord?: any } = {}) {
  const errorText = String(result.error || "");
  const invalidNativeSession = result.nativeSessionInvalid === true || /(?:session|thread).*(?:not found|invalid|expired|不存在|无效|过期)|无法恢复.*(?:session|会话)/i.test(errorText);
  const nativeContinuationUnverified = result.nativeContinuationUnverified === true;
  const permissionDrift = result.permissionDrift === true;
  const continuationEvidence = result.nativeContinuationEvidence || null;
  const observedProviderContractId = String(continuationEvidence?.providerContractId || "").trim();
  const providerContractTrusted = continuationEvidence?.providerContractCurrentEvidenceVerified === true
    && continuationEvidence?.providerContractContinuityVerified === true
    && continuationEvidence?.nativeSessionReusable === true;
  const providerContractTransition = continuationEvidence?.providerContractTransition === true;
  const capturedNativeId = String(result.nativeSessionId || current.nativeSessionId || "").trim();
  const requiresCapturedId = current.resumeMode === "native"
    && getAgentRuntime(current.agentType).capabilities.sessionResume
    && normalizeAgentRuntimeId(current.agentType) !== "claudecode";
  const captureFailed = result.success !== false && requiresCapturedId && (!capturedNativeId || nativeContinuationUnverified);
  const previousIds = [...new Set([...(current.nativeSessionHistory || []), current.nativeSessionId].filter(Boolean))].slice(-10);
  const providerContractHistory = Array.isArray(current.providerContractHistory) ? current.providerContractHistory.slice(-19) : [];
  if (providerContractTrusted && observedProviderContractId && observedProviderContractId !== String(current.providerContractId || "")) {
    if (current.providerContractId) providerContractHistory.push({
      contractId: current.providerContractId,
      runtimeVersion: current.providerRuntimeVersion || "",
      runtimeIdentityChecksum: current.providerRuntimeIdentityChecksum || "",
      status: "superseded",
      at: new Date().toISOString(),
    });
  }
  const next: TaskAgentSession = {
    ...current,
    nativeSessionId: permissionDrift ? createNativeSessionId(current.agentType) : invalidNativeSession || captureFailed ? "" : capturedNativeId,
    resumeMode: permissionDrift ? "native" : captureFailed ? "scratchpad" : invalidNativeSession && getAgentRuntime(current.agentType).capabilities.sessionResume ? "native" : current.resumeMode,
    nativeCaptureFailures: Number(current.nativeCaptureFailures || 0) + (captureFailed ? 1 : 0),
    nativeRecoveryAttempts: Number(current.nativeRecoveryAttempts || 0) + (invalidNativeSession || permissionDrift ? 1 : 0),
    nativeSessionHistory: previousIds,
    lastNativeRecoveryAt: invalidNativeSession || permissionDrift ? new Date().toISOString() : current.lastNativeRecoveryAt || "",
    turnCount: permissionDrift ? 0 : Number(current.turnCount || 0) + 1,
    lastTurnSucceeded: result.success !== false,
    lastError: permissionDrift ? "检测到实际只读权限与可写任务声明不一致；已隔离旧 native session，下轮创建可写恢复会话" : invalidNativeSession ? "原生会话已失效，下轮将创建恢复会话并承接工作区" : result.success === false ? (errorText || "Agent 执行失败") : nativeContinuationUnverified ? "CLI 续接输出契约未验证，已安全降级为 scratchpad 续跑" : captureFailed ? "CLI 未返回原生 session ID，已安全降级为 scratchpad 续跑" : "",
    permissionDriftCount: Number(current.permissionDriftCount || 0) + (permissionDrift ? 1 : 0),
    lastPermissionDriftAt: permissionDrift ? new Date().toISOString() : current.lastPermissionDriftAt || "",
    providerContractId: providerContractTrusted && observedProviderContractId ? observedProviderContractId : current.providerContractId || "",
    pendingProviderContractId: providerContractTrusted
      ? ""
      : observedProviderContractId && observedProviderContractId !== String(current.providerContractId || "")
        ? observedProviderContractId
        : current.pendingProviderContractId || "",
    providerRuntimeVersion: continuationEvidence?.providerRuntimeVersion || current.providerRuntimeVersion || "",
    providerRuntimeIdentityChecksum: continuationEvidence?.providerRuntimeIdentityChecksum || current.providerRuntimeIdentityChecksum || "",
    providerContractHistory: providerContractHistory.slice(-20),
    lastProviderContractTransitionAt: providerContractTransition ? new Date().toISOString() : current.lastProviderContractTransitionAt || "",
    lastUsedAt: new Date().toISOString(),
  };
  const identityHistory = Array.isArray(current.modelIdentityHistory) ? current.modelIdentityHistory.slice(-19) : [];
  if ((permissionDrift || invalidNativeSession) && (current.modelId || current.capacityEvidenceChecksum)) {
    identityHistory.push({
      provider: current.agentType,
      model: current.modelId || "",
      contextWindow: Number(current.modelContextWindow || 0),
      evidenceChecksum: current.capacityEvidenceChecksum || "",
      nativeSessionId: current.nativeSessionId || "",
      status: "invalidated",
      reason: permissionDrift ? "permission_drift_new_native_session" : "native_session_invalid_or_expired",
      at: new Date().toISOString(),
    });
    next.modelId = "";
    next.modelContextWindow = 0;
    next.capacityEvidenceChecksum = "";
    next.modelCapabilitySource = "";
    next.modelCapabilityCheckedAt = "";
  }
  const capabilityRecord = result.modelCapabilityRecord || result.nativeModelCapabilityRecord || null;
  const capabilityEntry = capabilityRecord?.recorded === true ? capabilityRecord.entry || {} : {};
  if (capabilityRecord?.recorded === true && !permissionDrift && !invalidNativeSession) {
    next.modelId = String(capabilityEntry.model || current.modelId || "");
    next.modelContextWindow = Number(capabilityEntry.contextWindow || current.modelContextWindow || 0);
    next.capacityEvidenceChecksum = String(capabilityEntry.checksum || current.capacityEvidenceChecksum || "");
    next.modelCapabilitySource = String(capabilityEntry.source || current.modelCapabilitySource || "");
    next.modelCapabilityCheckedAt = String(capabilityEntry.checkedAt || new Date().toISOString());
    const identity = {
      provider: next.agentType,
      model: next.modelId || "",
      contextWindow: Number(next.modelContextWindow || 0),
      evidenceChecksum: next.capacityEvidenceChecksum || "",
      nativeSessionId: next.nativeSessionId || "",
      status: "verified",
      reason: "native_model_capability_receipt",
      at: next.modelCapabilityCheckedAt,
    };
    const last = identityHistory[identityHistory.length - 1];
    if (!last || last.evidenceChecksum !== identity.evidenceChecksum || last.nativeSessionId !== identity.nativeSessionId) identityHistory.push(identity);
  }
  next.modelIdentityHistory = identityHistory.slice(-20);
  if (result.runtimeToolSnapshot && typeof result.runtimeToolSnapshot === "object") {
    next.runtimeSnapshotId = String(result.runtimeToolSnapshot.snapshotId || current.runtimeSnapshotId || "");
    next.runtimeSnapshotPath = String(result.runtimeToolSnapshot.snapshotPath || current.runtimeSnapshotPath || "");
    next.mcpConfigPath = String(result.runtimeToolSnapshot.mcpConfigPath || current.mcpConfigPath || "");
    next.allowedTools = result.runtimeToolSnapshot.allowedTools || current.allowedTools || null;
    next.permissionRules = Array.isArray(result.runtimeToolSnapshot.permissionRules)
      ? result.runtimeToolSnapshot.permissionRules.slice(0, 50)
      : current.permissionRules || [];
    next.runtimeToolUpdatedAt = new Date().toISOString();
  }
  return next;
}


export function reopenTaskAgentSessions(taskId: string, reason = "用户在同一任务中继续修改") {
  const id = String(taskId || "").trim();
  if (!id) return [];
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const now = new Date().toISOString();
    const latestByLane = new Map<string, TaskAgentSession>();
    for (const session of store.sessions) {
      if (session.taskId !== id && session.scopeId !== id) continue;
      const key = `${session.groupId}::${session.project}::${session.agentType}`;
      const previous = latestByLane.get(key);
      if (!previous || String(session.lastUsedAt || session.createdAt) > String(previous.lastUsedAt || previous.createdAt)) latestByLane.set(key, session);
    }
    const ids = new Set(Array.from(latestByLane.values()).map(item => item.id));
    const reopened: TaskAgentSession[] = [];
    store.sessions = store.sessions.map((session: TaskAgentSession) => {
      if (!ids.has(session.id) || session.status === "open") return session;
      const next = { ...session, status: "open" as const, closedAt: "", closeReason: "", lastUsedAt: now, lastError: reason };
      reopened.push(next);
      return next;
    });
    if (reopened.length) saveStore(store);
    return reopened;
  });
}


export function getTaskAgentSessionOptions(session: TaskAgentSession) {
  return {
    sessionId: session.nativeSessionId,
    resumeSession: session.resumeMode === "native" && session.turnCount > 0 && !!session.nativeSessionId,
    persistSession: session.resumeMode === "native",
    expectedProviderContractId: session.pendingProviderContractId || session.providerContractId || "",
    providerContractId: session.providerContractId || "",
    providerRuntimeVersion: session.providerRuntimeVersion || "",
    runtimeSnapshotId: session.runtimeSnapshotId || "",
    mcpConfigPath: session.mcpConfigPath || "",
  };
}


export function getTaskAgentSessionContinuity(session: TaskAgentSession) {
  return {
    mode: session.resumeMode,
    native: session.resumeMode === "native" && !!session.nativeSessionId,
    degraded: session.resumeMode === "scratchpad" && getAgentRuntime(session.agentType).capabilities.sessionResume,
    reason: session.lastError || "",
    turnCount: session.turnCount,
    recoveryAttempts: Number(session.nativeRecoveryAttempts || 0),
    previousNativeSessionIds: session.nativeSessionHistory || [],
    runtimeSnapshotId: session.runtimeSnapshotId || "",
    mcpConfigPath: session.mcpConfigPath || "",
    runtimeToolUpdatedAt: session.runtimeToolUpdatedAt || "",
    providerContractId: session.providerContractId || "",
    pendingProviderContractId: session.pendingProviderContractId || "",
    providerRuntimeVersion: session.providerRuntimeVersion || "",
    providerContractHistory: session.providerContractHistory || [],
  };
}


export function listTaskAgentSessions(filter: { scopeId?: string; taskId?: string; groupId?: string; groupSessionId?: string; group_session_id?: string; project?: string; status?: string } = {}) {
  return loadStore().sessions.filter((item: TaskAgentSession) =>
    (!filter.scopeId || item.scopeId === filter.scopeId)
    && (!filter.taskId || item.taskId === filter.taskId)
    && (!filter.groupId || item.groupId === filter.groupId)
    && (!(filter.groupSessionId || filter.group_session_id) || item.groupSessionId === String(filter.groupSessionId || filter.group_session_id))
    && (!filter.project || item.project === filter.project)
    && (!filter.status || item.status === filter.status)
  );
}


export function markTaskAgentSessionsForCapacityDowngrade(input: any = {}) {
  const rawProvider = String(input.provider || input.agentType || input.agent_type || "").trim().toLowerCase();
  const runtime = AGENT_RUNTIMES.find(item => item.id === rawProvider || item.aliases.includes(rawProvider));
  if (!runtime) return { marked: 0, sessions: [], reason: "unsupported_provider" };
  const provider = runtime.id;
  const currentContextWindow = Math.max(0, Number(input.currentContextWindow || input.current_context_window || 0));
  if (!currentContextWindow) return { marked: 0, sessions: [] };
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const marked: any[] = [];
    const detectedAt = new Date().toISOString();
    store.sessions = store.sessions.map((session: TaskAgentSession) => {
      if (session.status !== "open" || normalizeAgentRuntimeId(session.agentType) !== provider) return session;
      const previousContextWindow = sessionSnapshotContextWindow(session);
      if (!previousContextWindow || previousContextWindow <= currentContextWindow) return session;
      const gate: any = {
        schema: "ccm-task-agent-session-capacity-downgrade-gate-v1",
        provider,
        model: String(input.model || ""),
        previous_context_window: previousContextWindow,
        current_context_window: currentContextWindow,
        previous_evidence_checksum: String(session.capacityEvidenceChecksum || input.previousEvidenceChecksum || ""),
        current_evidence_checksum: String(input.currentEvidenceChecksum || ""),
        action: "rebuild_and_recompact_before_next_dispatch",
        detected_at: detectedAt,
      };
      marked.push({ sessionId: session.id, taskId: session.taskId, groupId: session.groupId, project: session.project, gate });
      gate.gate_id = `tacdg_${hashValue([session.id, provider, previousContextWindow, currentContextWindow, detectedAt], 24)}`;
      gate.gate_checksum = hashValue(gate, 64);
      return {
        ...session,
        capacityRevalidationRequired: true,
        capacityDowngradeGate: gate,
        capacityRevalidationProof: null,
        capacityRevalidationCommitReceipt: null,
        lastUsedAt: detectedAt,
      };
    });
    if (marked.length) saveStore(store);
    return { marked: marked.length, sessions: marked };
  });
}


export function verifyTaskAgentSessionCapacityRevalidationProof(proof: any, session: TaskAgentSession | null = null) {
  const issues: string[] = [];
  if (proof?.schema !== "ccm-task-agent-session-capacity-revalidation-proof-v1" || Number(proof?.version || 0) !== 1) issues.push("proof_schema_invalid");
  if (String(proof?.proof_checksum || "") !== capacityRevalidationProofChecksum(proof)) issues.push("proof_checksum_invalid");
  if (!String(proof?.worker_context_packet_id || "")) issues.push("worker_context_packet_missing");
  if (!Number(proof?.packet_context_window || 0)) issues.push("packet_context_window_missing");
  if (String(proof?.context_usage_status || "") === "over_budget") issues.push("packet_context_still_over_budget");
  if (proof?.typed_memory_capsule_present === true) {
    if (!String(proof?.typed_memory_capsule_checksum || "")) issues.push("typed_memory_capsule_checksum_missing");
    if (!Number(proof?.typed_memory_capsule_context_window || 0)) issues.push("typed_memory_capsule_window_missing");
  }
  if (session) {
    if (String(proof?.task_agent_session_id || "") !== String(session.id || "")) issues.push("task_agent_session_mismatch");
    if (String(proof?.group_id || "") !== String(session.groupId || "")) issues.push("group_mismatch");
    if (String(proof?.task_id || "") !== String(session.taskId || "")) issues.push("task_mismatch");
    const gate = session.capacityDowngradeGate || null;
    if (String(proof?.capacity_downgrade_gate_checksum || "") !== capacityRevalidationGateChecksum(gate)) issues.push("capacity_downgrade_gate_mismatch");
    const targetWindow = Number(gate?.current_context_window || 0);
    if (targetWindow > 0 && Number(proof?.packet_context_window || 0) > targetWindow) issues.push("packet_capacity_not_revalidated");
  }
  return { valid: issues.length === 0, issues };
}


export function verifyTaskAgentSessionCapacityRevalidationCommitReceipt(receipt: any, proof: any = null) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-task-agent-session-capacity-revalidation-commit-v1" || Number(receipt?.version || 0) !== 1) issues.push("receipt_schema_invalid");
  if (String(receipt?.receipt_checksum || "") !== capacityRevalidationCommitChecksum(receipt)) issues.push("receipt_checksum_invalid");
  if (!String(receipt?.dispatch_witness_id || "")) issues.push("dispatch_witness_missing");
  if (proof && String(receipt?.capacity_revalidation_proof_checksum || "") !== String(proof?.proof_checksum || "")) issues.push("proof_checksum_mismatch");
  return { valid: issues.length === 0, issues };
}


export function prepareTaskAgentSessionCapacityRevalidation(sessionId: string, packet: any = {}) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((session: TaskAgentSession) => session.id === id);
    if (index < 0) return null;
    const current = store.sessions[index];
    if (current.capacityRevalidationRequired !== true) return { prepared: true, required: false, proof: null, session: current, reason: "capacity_revalidation_not_required" };
    const validated: any = validateCapacityRevalidationPacket(current, packet);
    if (!validated.valid) return { prepared: false, required: true, proof: null, session: current, reason: validated.reason };
    const typedMemoryCapsule = validated.typedMemoryCapsule;
    const capsuleBudget = typedMemoryCapsule?.budget || {};
    const groupSessionId = capacityRevalidationGroupSessionId(packet);
    const proof: any = {
      schema: "ccm-task-agent-session-capacity-revalidation-proof-v1",
      version: 1,
      proof_id: `tacrp_${hashValue([current.id, current.capacityDowngradeGate, packet.packet_id, typedMemoryCapsule?.capsule_checksum || ""], 24)}`,
      task_agent_session_id: current.id,
      group_id: current.groupId,
      group_session_id: groupSessionId,
      task_id: current.taskId,
      project: current.project,
      provider: normalizeAgentRuntimeId(current.agentType),
      capacity_downgrade_gate_id: String(current.capacityDowngradeGate?.gate_id || ""),
      capacity_downgrade_gate_checksum: capacityRevalidationGateChecksum(current.capacityDowngradeGate),
      worker_context_packet_id: String(packet.packet_id || ""),
      worker_context_memory_checksum: hashValue(packet.memory || {}, 64),
      packet_context_window: validated.contextWindow,
      packet_capacity_evidence_checksum: String(validated.capacity?.evidenceChecksum || ""),
      context_usage_status: validated.contextUsageStatus,
      typed_memory_capsule_present: typedMemoryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1",
      typed_memory_capsule_checksum: String(typedMemoryCapsule?.capsule_checksum || ""),
      typed_memory_capsule_context_window: Number(capsuleBudget.model_context_window || typedMemoryCapsule?.model_context_window || 0),
      typed_memory_capsule_effective_tokens: Number(capsuleBudget.effective_max_tokens || typedMemoryCapsule?.effective_max_tokens || 0),
      prepared_at: new Date().toISOString(),
      state: "prepared",
    };
    proof.proof_checksum = capacityRevalidationProofChecksum(proof);
    const next = { ...current, capacityRevalidationProof: proof, lastUsedAt: proof.prepared_at };
    store.sessions[index] = next;
    saveStore(store);
    if (groupSessionId.startsWith("gcs_")) tryRecordTaskAgentContinuationSoakEvent({
      groupId: current.groupId,
      groupSessionId,
      taskAgentSessionId: current.id,
      phase: "capacity_revalidation_prepared",
      status: "pending",
      eventKey: `capacity:prepared:${proof.proof_checksum}`,
      evidence: { capacityRevalidationProof: proof, invocation_edge_id: packet?.task_agent_invocation_lineage?.invocation_edge_id || "" },
      source: "capacity_runtime",
    });
    return { prepared: true, required: true, proof, session: next, reason: "packet_rebuilt_under_downgraded_capacity_prepared" };
  });
}


export function commitTaskAgentSessionCapacityRevalidation(sessionId: string, proof: any, dispatchWitness: any = {}) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((session: TaskAgentSession) => session.id === id);
    if (index < 0) return null;
    const current = store.sessions[index];
    if (current.capacityRevalidationRequired !== true) {
      const existing = current.capacityRevalidationCommitReceipt || null;
      return { acknowledged: !!existing, committed: !!existing, idempotent: true, receipt: existing, session: current, reason: existing ? "capacity_revalidation_already_committed" : "capacity_revalidation_not_required" };
    }
    const validation = verifyTaskAgentSessionCapacityRevalidationProof(proof, current);
    if (!validation.valid) return { acknowledged: false, committed: false, session: current, reason: validation.issues[0] || "capacity_revalidation_proof_invalid", issues: validation.issues };
    if (String(current.capacityRevalidationProof?.proof_checksum || "") !== String(proof?.proof_checksum || "")) {
      return { acknowledged: false, committed: false, session: current, reason: "capacity_revalidation_prepared_proof_mismatch" };
    }
    const walChecksum = String(dispatchWitness.typedMemoryDispatchWalRecordChecksum || dispatchWitness.typed_memory_dispatch_wal_record_checksum || "");
    const walState = String(dispatchWitness.typedMemoryDispatchWalState || dispatchWitness.typed_memory_dispatch_wal_state || "");
    const runnerRequestId = String(dispatchWitness.runnerRequestId || dispatchWitness.runner_request_id || "");
    const runnerStarted = dispatchWitness.runnerStarted === true || dispatchWitness.runner_started === true;
    const walStarted = !!walChecksum && ["dispatch_started", "runner_returned", "committed"].includes(walState);
    const runnerReturned = !!runnerRequestId && runnerStarted;
    if (!walStarted && !runnerReturned) {
      return { acknowledged: false, committed: false, session: current, reason: "durable_dispatch_witness_missing" };
    }
    const committedAt = new Date().toISOString();
    const receipt: any = {
      schema: "ccm-task-agent-session-capacity-revalidation-commit-v1",
      version: 1,
      receipt_id: `tacrc_${hashValue([proof.proof_checksum, walChecksum, walState, runnerRequestId, committedAt], 24)}`,
      task_agent_session_id: current.id,
      group_id: current.groupId,
      task_id: current.taskId,
      capacity_revalidation_proof_id: String(proof.proof_id || ""),
      capacity_revalidation_proof_checksum: String(proof.proof_checksum || ""),
      worker_context_packet_id: String(proof.worker_context_packet_id || ""),
      dispatch_witness_kind: walStarted ? "typed_memory_dispatch_wal" : "runner_returned",
      dispatch_witness_id: walStarted ? walChecksum : runnerRequestId,
      typed_memory_dispatch_wal_record_checksum: walChecksum,
      typed_memory_dispatch_wal_state: walState,
      runner_request_id: runnerRequestId,
      committed_at: committedAt,
    };
    receipt.receipt_checksum = capacityRevalidationCommitChecksum(receipt);
    const next = {
      ...current,
      modelContextWindow: Number(proof.packet_context_window || current.modelContextWindow || 0),
      capacityEvidenceChecksum: String(proof.packet_capacity_evidence_checksum || current.capacityEvidenceChecksum || ""),
      capacityRevalidationRequired: false,
      capacityDowngradeGate: null,
      capacityRevalidationProof: proof,
      capacityRevalidationCommitReceipt: receipt,
      lastUsedAt: committedAt,
    };
    store.sessions[index] = next;
    saveStore(store);
    const groupSessionId = String(proof?.group_session_id || "");
    if (groupSessionId.startsWith("gcs_")) tryRecordTaskAgentContinuationSoakEvent({
      groupId: current.groupId,
      groupSessionId,
      taskAgentSessionId: current.id,
      phase: "capacity_revalidation_committed",
      status: "committed",
      eventKey: `capacity:committed:${receipt.receipt_checksum}`,
      evidence: { capacityRevalidationProof: proof, capacityRevalidationCommitReceipt: receipt },
      source: "capacity_runtime",
    });
    return { acknowledged: true, committed: true, proof, receipt, session: next, reason: "packet_rebuilt_under_downgraded_capacity_committed" };
  });
}


export function acknowledgeTaskAgentSessionCapacityRevalidation(sessionId: string, packet: any = {}, dispatchWitness: any = {}) {
  const prepared = prepareTaskAgentSessionCapacityRevalidation(sessionId, packet);
  if (!prepared?.prepared || prepared.required !== true) {
    return { acknowledged: prepared?.prepared === true, committed: prepared?.required !== true, ...prepared };
  }
  return commitTaskAgentSessionCapacityRevalidation(sessionId, prepared.proof, dispatchWitness);
}


export function runTaskAgentSessionModelIdentitySelfTest() {
  const base: TaskAgentSession = {
    id: "tas-model-identity-selftest",
    scopeId: "task-model-identity-selftest",
    taskId: "task-model-identity-selftest",
    groupId: "group-model-identity-selftest",
    project: "project-model-identity-selftest",
    agentType: "codex",
    nativeSessionId: "thread-model-identity-selftest",
    resumeMode: "native",
    status: "open",
    turnCount: 1,
    lastTurnSucceeded: true,
    createdAt: "2026-07-12T00:00:00.000Z",
    lastUsedAt: "2026-07-12T00:00:00.000Z",
    closedAt: "",
    closeReason: "",
  };
  const next = advanceTaskAgentSession(base, {
    nativeSessionId: base.nativeSessionId,
    success: true,
    nativeModelCapabilityRecord: {
      recorded: true,
      entry: {
        model: "gpt-phase219",
        contextWindow: 516_000,
        checksum: "capacity-checksum-phase219",
        source: "native_executor_receipt",
        checkedAt: "2026-07-12T01:00:00.000Z",
      },
    },
  });
  const checks = {
    modelIdPersists: next.modelId === "gpt-phase219",
    contextWindowPersists: next.modelContextWindow === 516_000,
    evidenceChecksumPersists: next.capacityEvidenceChecksum === "capacity-checksum-phase219",
    sourceAndTimePersist: next.modelCapabilitySource === "native_executor_receipt" && next.modelCapabilityCheckedAt === "2026-07-12T01:00:00.000Z",
    nativeSessionContinuityPreserved: next.nativeSessionId === base.nativeSessionId && next.turnCount === 2,
    verifiedIdentityAddedToHistory: next.modelIdentityHistory?.some(item => item.status === "verified" && item.model === "gpt-phase219") === true,
  };
  const drifted = advanceTaskAgentSession(next, { success: false, permissionDrift: true, error: "sandbox read-only" });
  const driftChecks = {
    permissionDriftClearsActiveModel: drifted.modelId === "" && drifted.modelContextWindow === 0 && drifted.capacityEvidenceChecksum === "",
    permissionDriftArchivesIdentity: drifted.modelIdentityHistory?.some(item => item.status === "invalidated" && item.reason === "permission_drift_new_native_session" && item.model === "gpt-phase219") === true,
  };
  return { pass: Object.values({ ...checks, ...driftChecks }).every(Boolean), checks: { ...checks, ...driftChecks }, session: next, drifted };
}
