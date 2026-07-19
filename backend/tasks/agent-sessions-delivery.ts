// Behavior-freeze extraction: memory context delivery receipts.
// Behavior-freeze extraction from agent-sessions.ts.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { AGENT_RUNTIMES, getAgentRuntime, normalizeAgentRuntimeId } from "../agents/runtime";
import {
  buildFinalDispatchProviderUsageBaseline,
  verifyFinalDispatchProviderUsageBaseline,
  verifyFinalWorkerDispatchPayloadGate,
} from "../agents/final-dispatch-payload-gate";
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
  normalizeSessionCompactionState,
  normalizeSessionProviderUsage,
} from "../system/session-compaction-core";
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
  MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION,
  TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA,
  TaskAgentSession,
  extractGroupSessionMemoryBinding,
  getMemoryContextSnapshotDir,
  getMemorySnapshotSyncCommitFile,
  hashValue,
  loadStore,
  memoryPromptInjectionProofChecksum,
  memorySnapshotSyncCommitChecksum,
  normalizeMemorySnapshotRefs,
  safeReadJson,
  saveStore,
  verifyMemoryContextDeliveryReceiptChecksum,
  verifyMemoryContextSnapshotChecksum,
  verifyTaskAgentMemoryContinuationBaselineDelivery,
  verifyTaskAgentMemoryPromptInjectionProof,
  verifyTaskAgentMemorySnapshotSyncCommit,
  verifyTaskAgentMemorySnapshotSyncDecision,
  withTaskAgentSessionStoreLock,
  writeJsonAtomic
} from "./agent-sessions-shared";


export function recordTaskAgentMemoryContextDelivery(sessionId: string, input: {
  snapshotId?: string;
  renderedPrompt?: string;
  snapshotRenderedPrompt?: string;
  executionId?: string;
  traceId?: string;
  runtime?: string;
  attempt?: number;
  nativeSessionId?: string;
  runnerRequestId?: string;
  dispatched?: boolean;
  executionSucceeded?: boolean;
  output?: string;
  fileChanges?: any;
  nativeContinuationEvidence?: any;
  runnerStarted?: boolean;
  recoveryOutcome?: string;
  invocationEdgeId?: string;
  providerMemoryChannelEvidence?: any;
  memoryContextConsumptionReceipt?: any;
  memoryContextConsumptionRecovery?: any;
  providerUsage?: any;
  providerModel?: string;
  model?: string;
  providerContractId?: string;
  providerRuntimeVersion?: string;
  providerRuntimeIdentityChecksum?: string;
  providerUsageProvenance?: any;
  taskFamilyKey?: string;
} = {}) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return withTaskAgentSessionStoreLock(() => {
    const store = loadStore();
    const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === id);
    if (index < 0) return null;
    const current = store.sessions[index];
  const snapshotId = String(input.snapshotId || current.memoryContextSnapshotId || "").trim();
  const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
  const refIndex = refs.findIndex(ref => ref.snapshotId === snapshotId);
  const ref = refIndex >= 0 ? refs[refIndex] : null;
  const snapshotFile = String(ref?.snapshotPath || current.memoryContextSnapshotPath || "").trim();
  const snapshot = safeReadJson(snapshotFile, null);
  if (!snapshot || !verifyMemoryContextSnapshotChecksum(snapshot)) return null;
  const actualPrompt = String(input.renderedPrompt || "");
  const snapshotPrompt = String(input.snapshotRenderedPrompt || "");
  const declaredSnapshotPromptChecksum = String(snapshot.context?.rendered_prompt_checksum || "").trim();
  const snapshotPromptChecksum = snapshotPrompt ? hashValue(snapshotPrompt) : "";
  const basePromptMatchesSnapshot = !!snapshotPrompt && snapshotPromptChecksum === declaredSnapshotPromptChecksum;
  const promptBindingMode = basePromptMatchesSnapshot
    ? actualPrompt === snapshotPrompt ? "exact" : actualPrompt.includes(snapshotPrompt) ? "contains_snapshot_prompt" : "mismatch"
    : "snapshot_prompt_unverified";
  const delivered = input.dispatched !== false
    && basePromptMatchesSnapshot
    && (promptBindingMode === "exact" || promptBindingMode === "contains_snapshot_prompt");
  const deliveredAt = new Date().toISOString();
  const receiptId = `tamdr_${hashValue([id, snapshotId, input.executionId || "", input.attempt || 0, deliveredAt].join("\0"), 20)}`;
  const receiptFile = path.join(getMemoryContextSnapshotDir(id), `${snapshotId}.${receiptId}.delivery.json`);
  const groupSessionMemoryBinding = snapshot.context?.group_session_memory_binding || extractGroupSessionMemoryBinding(snapshot.context?.memory_context || {});
  const finalDispatchPayloadGate = snapshot.context?.final_dispatch_payload_gate
    || snapshot.context?.worker_context_packet?.final_dispatch_payload_gate
    || null;
  const finalDispatchPayloadGateVerification = finalDispatchPayloadGate
    ? verifyFinalWorkerDispatchPayloadGate(finalDispatchPayloadGate, {
      renderedPrompt: actualPrompt,
      groupId: snapshot.session?.group_id || current.groupId || "",
      groupSessionId: groupSessionMemoryBinding?.groupSessionId || "",
      taskId: snapshot.session?.task_id || current.taskId || "",
      taskAgentSessionId: id,
      workerContextPacketId: snapshot.context?.worker_context_packet_id || snapshot.context?.worker_context_packet?.packet_id || current.memoryContextPacketId || "",
    })
    : { valid: false, issues: ["final_dispatch_payload_gate_missing"] };
  const providerModel = String(input.providerModel || input.model || (finalDispatchPayloadGateVerification.valid ? finalDispatchPayloadGate?.model : "") || current.modelId || "");
  const finalPromptEstimatedTokens = finalDispatchPayloadGateVerification.valid
    ? Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0)
    : Math.ceil(actualPrompt.length / 4);
  const compactTransactionReceiptRequired = groupSessionMemoryBinding?.compactTransactionReceiptRequired === true;
  const compactTransactionReceiptValid = groupSessionMemoryBinding?.compactTransactionReceiptValid === true;
  const compactHeadValidation = groupSessionMemoryBinding?.compactHeadFenceRequired === true
    ? validateGroupCompactHeadBinding({
      groupId: groupSessionMemoryBinding.groupId,
      groupSessionId: groupSessionMemoryBinding.groupSessionId,
      compactEpoch: groupSessionMemoryBinding.compactEpoch,
      compactTransactionReceiptChecksum: groupSessionMemoryBinding.compactTransactionReceiptChecksum,
      compactTransactionBoundaryId: groupSessionMemoryBinding.compactTransactionBoundaryId,
      compactHeadGeneration: groupSessionMemoryBinding.compactHeadGeneration,
      compactHeadId: groupSessionMemoryBinding.compactHeadId,
      compactHeadChecksum: groupSessionMemoryBinding.compactHeadChecksum,
    })
    : { valid: true, status: "exempt", issues: [], expected: null };
  const compactHeadFenceValid = compactHeadValidation.valid === true;
  const deliveryGroupSessionId = String(groupSessionMemoryBinding?.groupSessionId || "");
  const sessionLifecycleFenceRequired = deliveryGroupSessionId.startsWith("gcs_");
  const sessionLifecycleValidation = sessionLifecycleFenceRequired
    ? validateGroupSessionLifecycleBinding({
      groupId: groupSessionMemoryBinding.groupId,
      groupSessionId: groupSessionMemoryBinding.groupSessionId,
      lifecycleStatus: groupSessionMemoryBinding.sessionLifecycleStatus,
      lifecycleGeneration: groupSessionMemoryBinding.sessionLifecycleGeneration,
      lifecycleHeadId: groupSessionMemoryBinding.sessionLifecycleHeadId,
      lifecycleHeadChecksum: groupSessionMemoryBinding.sessionLifecycleHeadChecksum,
    })
    : { valid: true, status: "exempt", issues: [], expected: null };
  const sessionLifecycleFenceValid = sessionLifecycleValidation.valid === true;
  const memoryEvidenceReady = (!groupSessionMemoryBinding || groupSessionMemoryBinding.deliveryReady !== false)
    && compactHeadFenceValid
    && sessionLifecycleFenceValid;
  const continuationBaseline = verifyTaskAgentMemoryContinuationBaselineDelivery(snapshot, input);
  const memoryPromptInjectionProof = snapshot.context?.memory_prompt_injection_proof || null;
  const providerMemoryChannelRequired = memoryPromptInjectionProof?.trusted_envelope_bound === true;
  const providerMemoryChannelAcknowledgementRequired = providerMemoryChannelRequired
    && snapshot.context?.provider_memory_channel_acknowledgement_required === true;
  const memoryContextConsumptionReceiptRequired = providerMemoryChannelRequired
    && snapshot.context?.memory_context_consumption_receipt_required === true;
  const memoryContextConsumptionChallenge = snapshot.context?.memory_context_consumption_challenge || null;
  const memoryContextConsumptionVerification = memoryContextConsumptionReceiptRequired
    ? readMemoryContextConsumptionReceipt(memoryContextConsumptionChallenge, {
        groupId: snapshot.session?.group_id || current.groupId || "",
        groupSessionId: groupSessionMemoryBinding?.groupSessionId || "",
        taskId: snapshot.session?.task_id || current.taskId || "",
        executionId: snapshot.context?.execution_id || "",
        project: snapshot.session?.project || current.project || "",
        taskAgentSessionId: id,
      })
    : { valid: true, issues: [], receipt: null, receiptSignature: "" };
  if (memoryContextConsumptionReceiptRequired
    && String(input.memoryContextConsumptionReceipt?.receipt_signature || "") !== String(memoryContextConsumptionVerification.receiptSignature || "")) {
    memoryContextConsumptionVerification.valid = false;
    memoryContextConsumptionVerification.issues = [...new Set([...(memoryContextConsumptionVerification.issues || []), "receipt_attempt_binding_mismatch"])];
  }
  const memoryContextConsumptionRecoveryVerification = input.memoryContextConsumptionRecovery
    ? verifyMemoryContextConsumptionRecovery(input.memoryContextConsumptionRecovery, {
        challengeId: memoryContextConsumptionChallenge?.challenge_id || "",
        runnerRequestId: input.runnerRequestId || "",
        groupId: snapshot.session?.group_id || current.groupId || "",
        groupSessionId: groupSessionMemoryBinding?.groupSessionId || "",
        taskId: snapshot.session?.task_id || current.taskId || "",
        executionId: snapshot.context?.execution_id || "",
        project: snapshot.session?.project || current.project || "",
        taskAgentSessionId: id,
        provider: input.runtime || current.agentType || "",
      })
    : { valid: true, issues: [] };
  if (memoryContextConsumptionReceiptRequired && input.memoryContextConsumptionRecovery
    && (!memoryContextConsumptionRecoveryVerification.valid || input.memoryContextConsumptionRecovery.status !== "recovered")) {
    memoryContextConsumptionVerification.valid = false;
    memoryContextConsumptionVerification.issues = [...new Set([
      ...(memoryContextConsumptionVerification.issues || []),
      ...memoryContextConsumptionRecoveryVerification.issues,
      ...(input.memoryContextConsumptionRecovery.status === "recovered" ? [] : ["memory_context_consumption_recovery_unresolved"]),
    ])];
  }
  const providerMemoryChannelVerification = providerMemoryChannelRequired
    ? verifyProviderMemoryChannelEvidence(input.providerMemoryChannelEvidence, {
        provider: input.runtime || current.agentType || "",
        originalPrompt: actualPrompt,
        envelopeChecksum: String(memoryPromptInjectionProof?.trusted_envelope_checksum || ""),
        sourceChecksum: String(memoryPromptInjectionProof?.trusted_envelope_source_checksum || ""),
        runnerRequestId: String(input.runnerRequestId || ""),
        required: true,
        requireAcknowledgement: providerMemoryChannelAcknowledgementRequired,
        providerOutputContractEvidence: input.nativeContinuationEvidence?.providerOutputContractEvidence || null,
        nativeContinuationEvidence: input.nativeContinuationEvidence || null,
        executionSucceeded: input.executionSucceeded !== false,
      })
    : { valid: true, issues: [], required: false, status: "not_required", channel: "none", authorityRole: "none", nativeSystemPrompt: false, nativeDeveloperInstructions: false, fallbackUserPrompt: false, acknowledgementRequired: false, acknowledgementStatus: "not_required", acknowledged: false, acknowledgementPolicy: "" };
  const memoryDeliveryEvidenceReady = memoryEvidenceReady
    && continuationBaseline.valid
    && providerMemoryChannelVerification.valid
    && memoryContextConsumptionVerification.valid;
  const fileChangeRows = (Array.isArray(input.fileChanges?.files)
    ? input.fileChanges.files
    : Array.isArray(input.fileChanges) ? input.fileChanges : [])
    .map((item: any) => ({
      path: String(item?.path || item?.file || "").trim(),
      status: String(item?.statusKind || item?.status || item?.statusText || "changed").trim(),
      diffChecksum: item?.diff ? hashValue(item.diff, 32) : "",
    }))
    .filter((item: any) => item.path)
    .slice(0, 80);
  const fileChangeChecksum = fileChangeRows.length ? hashValue(fileChangeRows, 64) : "";
  const outputChecksum = input.output ? hashValue(String(input.output)) : "";
  const runnerStarted = input.runnerStarted !== undefined ? input.runnerStarted === true : input.dispatched !== false;
  const memoryEntryPlan = snapshot.context?.memory_entry_sync || taskAgentMemoryEntrySyncPlan(snapshot.context?.memory_context || null);
  const memoryTransportMode = String(memoryEntryPlan?.transport_mode || "legacy");
  const providerMemoryTransportUsage = deliveryGroupSessionId.startsWith("gcs_") ? buildTaskAgentMemoryTransportUsageReceipt({
    usage: input.providerUsage,
    executionSucceeded: input.executionSucceeded !== false,
    groupId: String(snapshot.session?.group_id || current.groupId || ""),
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: String(snapshot.session?.task_id || current.taskId || ""),
    taskAgentSessionId: id,
    targetProject: String(snapshot.session?.project || current.project || ""),
    taskText: String(snapshot.context?.worker_context_packet?.task || snapshot.context?.worker_context_packet?.goal || ""),
    taskFamilyKey: String(input.taskFamilyKey || snapshot.context?.worker_context_packet?.task_family_key || snapshot.context?.worker_context_packet?.taskFamilyKey || ""),
    snapshotId,
    snapshotChecksum: String(snapshot.checksum || ""),
    runnerRequestId: String(input.runnerRequestId || ""),
    nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || ""),
    provider: input.runtime || current.agentType || "",
    model: providerModel,
    providerContractId: String(input.providerContractId || input.nativeContinuationEvidence?.providerContractId || current.providerContractId || ""),
    providerRuntimeVersion: String(input.providerRuntimeVersion || input.nativeContinuationEvidence?.providerRuntimeVersion || current.providerRuntimeVersion || ""),
    providerRuntimeIdentityChecksum: String(input.providerRuntimeIdentityChecksum || input.nativeContinuationEvidence?.providerRuntimeIdentityChecksum || current.providerRuntimeIdentityChecksum || ""),
    providerUsageProvenance: input.providerUsageProvenance || input.providerUsage?.provenance || null,
    transportMode: memoryTransportMode,
    planChecksum: String(memoryEntryPlan?.plan_checksum || ""),
    manifestChecksum: String(memoryEntryPlan?.current_manifest?.manifest_checksum || ""),
    finalPromptEstimatedTokens,
    memoryTransportEstimatedTokens: Math.ceil(Number(memoryPromptInjectionProof?.rendered_memory_chars || 0) / 4),
    observedAt: deliveredAt,
  }) : null;
  const providerMemoryTransportUsageVerification = providerMemoryTransportUsage ? verifyTaskAgentMemoryTransportUsageReceipt(providerMemoryTransportUsage, {
    groupId: String(snapshot.session?.group_id || current.groupId || ""),
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: String(snapshot.session?.task_id || current.taskId || ""),
    taskAgentSessionId: id,
    targetProject: String(snapshot.session?.project || current.project || ""),
    snapshotId,
    snapshotChecksum: String(snapshot.checksum || ""),
    runnerRequestId: String(input.runnerRequestId || ""),
    provider: input.runtime || current.agentType || "",
    nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || ""),
    transportMode: memoryTransportMode,
  }) : { valid: true, issues: [] };
  if (!providerMemoryTransportUsageVerification.valid) {
    throw new Error(`task Agent memory transport usage receipt invalid: ${providerMemoryTransportUsageVerification.issues.join(",")}`);
  }
  const providerContextUsageReported = providerMemoryTransportUsage?.status === "reported"
    && providerMemoryTransportUsage?.reported === true;
  const providerContextUsageBaselineAdmissionIssues: string[] = [];
  if (providerContextUsageReported) {
    if (!providerModel.trim()) providerContextUsageBaselineAdmissionIssues.push("provider_model_missing");
    if (!delivered) providerContextUsageBaselineAdmissionIssues.push("delivery_prompt_not_bound");
    if (!memoryDeliveryEvidenceReady) providerContextUsageBaselineAdmissionIssues.push("memory_delivery_evidence_not_ready");
    if (input.executionSucceeded === false) providerContextUsageBaselineAdmissionIssues.push("provider_execution_failed");
    if (!runnerStarted) providerContextUsageBaselineAdmissionIssues.push("runner_not_started");
    if (!finalDispatchPayloadGateVerification.valid || finalDispatchPayloadGate?.provider_call_allowed !== true) providerContextUsageBaselineAdmissionIssues.push("final_dispatch_gate_not_admitted");
    if (snapshotId !== String(current.memoryContextSnapshotId || "")) providerContextUsageBaselineAdmissionIssues.push("delivery_snapshot_not_current");
    if (!compactHeadFenceValid) providerContextUsageBaselineAdmissionIssues.push("compact_head_stale");
    if (!sessionLifecycleFenceValid) providerContextUsageBaselineAdmissionIssues.push("session_lifecycle_stale");
  }
  const providerContextUsageBaselineCandidate = providerContextUsageReported
    && providerContextUsageBaselineAdmissionIssues.length === 0
    ? buildFinalDispatchProviderUsageBaseline({
      usage: providerMemoryTransportUsage,
      groupId: String(snapshot.session?.group_id || current.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(snapshot.session?.task_id || current.taskId || ""),
      taskAgentSessionId: id,
      provider: input.runtime || current.agentType || "",
      model: providerModel,
      providerContractId: String(providerMemoryTransportUsage.provider_contract_id || ""),
      providerRuntimeVersion: String(providerMemoryTransportUsage.provider_runtime_version || ""),
      groupSessionMemoryBinding,
    })
    : null;
  const providerContextUsageBaselineVerification = providerContextUsageBaselineCandidate
    ? verifyFinalDispatchProviderUsageBaseline(providerContextUsageBaselineCandidate, {
      groupId: String(snapshot.session?.group_id || current.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(snapshot.session?.task_id || current.taskId || ""),
      taskAgentSessionId: id,
      provider: input.runtime || current.agentType || "",
      model: providerModel,
      ...(String(providerMemoryTransportUsage?.provider_contract_id || "").trim() ? { providerContractId: providerMemoryTransportUsage.provider_contract_id } : {}),
      ...(String(providerMemoryTransportUsage?.provider_runtime_version || "").trim() ? { providerRuntimeVersion: providerMemoryTransportUsage.provider_runtime_version } : {}),
      compactEpoch: String(groupSessionMemoryBinding?.compactEpoch || "precompact"),
      compactHeadId: String(groupSessionMemoryBinding?.compactHeadId || ""),
      compactHeadGeneration: Number(groupSessionMemoryBinding?.compactHeadGeneration || 0),
      compactHeadChecksum: String(groupSessionMemoryBinding?.compactHeadChecksum || ""),
    })
    : { valid: false, issues: [] as string[] };
  if (providerContextUsageBaselineCandidate && !providerContextUsageBaselineVerification.valid) {
    throw new Error(`task Agent provider context usage baseline invalid: ${providerContextUsageBaselineVerification.issues.join(",")}`);
  }
  const previousProviderContextUsageBaselineVerification = current.providerContextUsageBaseline
    ? verifyFinalDispatchProviderUsageBaseline(current.providerContextUsageBaseline, {
      groupId: String(snapshot.session?.group_id || current.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(snapshot.session?.task_id || current.taskId || ""),
      taskAgentSessionId: id,
    })
    : { valid: false };
  const providerContextUsageBaseline = providerContextUsageBaselineVerification.valid
    ? providerContextUsageBaselineCandidate
    : previousProviderContextUsageBaselineVerification.valid ? current.providerContextUsageBaseline : null;
  const taskArtifactProven = delivered
    && memoryDeliveryEvidenceReady
    && input.executionSucceeded !== false
    && runnerStarted
    && !!String(input.runnerRequestId || "").trim()
    && !!outputChecksum
    && fileChangeRows.length > 0;
  const payload = {
    schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
    version: 2,
    receiptId,
    source: "ccm_runner_dispatch_witness",
    status: delivered && memoryDeliveryEvidenceReady
      ? "delivered"
      : !sessionLifecycleFenceValid
        ? "session_lifecycle_stale"
        : !compactHeadFenceValid
          ? "compact_head_stale"
          : !continuationBaseline.valid
            ? "continuation_baseline_unverified"
            : !providerMemoryChannelVerification.valid
              ? "provider_memory_channel_unverified"
            : !memoryContextConsumptionVerification.valid
              ? "memory_context_consumption_unverified"
            : "binding_failed",
    delivered: delivered && memoryDeliveryEvidenceReady,
    deliveredAt,
    taskAgentSessionId: id,
    taskId: String(snapshot.session?.task_id || current.taskId || "").trim(),
    groupId: String(snapshot.session?.group_id || current.groupId || "").trim(),
    project: String(snapshot.session?.project || current.project || "").trim(),
    runtime: normalizeAgentRuntimeId(input.runtime || current.agentType || ""),
    nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
    executionId: String(input.executionId || snapshot.context?.execution_id || "").trim(),
    traceId: String(input.traceId || snapshot.context?.trace_id || "").trim(),
    attempt: Math.max(1, Number(input.attempt || 1)),
    runnerRequestId: String(input.runnerRequestId || "").trim(),
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotChecksum: String(snapshot.checksum || "").trim(),
    memoryContextChecksum: String(snapshot.context?.memory_context_checksum || "").trim(),
    workerContextPacketId: String(snapshot.context?.worker_context_packet_id || "").trim(),
    groupSessionMemoryBinding: groupSessionMemoryBinding || null,
    groupSessionMemoryBindingChecksum: String(groupSessionMemoryBinding?.checksum || ""),
    modelExtractionEvidenceValid: groupSessionMemoryBinding?.modelExtractionEvidenceValid !== false,
    compactEpoch: String(groupSessionMemoryBinding?.compactEpoch || "precompact"),
    compactTransactionReceiptRequired,
    compactTransactionReceiptValid,
    compactTransactionReceiptId: String(groupSessionMemoryBinding?.compactTransactionReceiptId || ""),
    compactTransactionBoundaryId: String(groupSessionMemoryBinding?.compactTransactionBoundaryId || ""),
    compactTransactionReceiptChecksum: String(groupSessionMemoryBinding?.compactTransactionReceiptChecksum || ""),
    compactHeadFenceRequired: groupSessionMemoryBinding?.compactHeadFenceRequired === true,
    compactHeadFenceValid,
    compactHeadFenceStatus: compactHeadValidation.status,
    compactHeadFenceIssues: compactHeadValidation.issues,
    compactHeadId: String(groupSessionMemoryBinding?.compactHeadId || ""),
    compactHeadGeneration: Number(groupSessionMemoryBinding?.compactHeadGeneration || 0),
    compactHeadChecksum: String(groupSessionMemoryBinding?.compactHeadChecksum || ""),
    currentCompactHead: compactHeadValidation.expected,
    sessionLifecycleFenceRequired,
    sessionLifecycleFenceValid,
    sessionLifecycleFenceStatus: sessionLifecycleValidation.status,
    sessionLifecycleFenceIssues: sessionLifecycleValidation.issues,
    sessionLifecycleHeadId: String(groupSessionMemoryBinding?.sessionLifecycleHeadId || ""),
    sessionLifecycleGeneration: Number(groupSessionMemoryBinding?.sessionLifecycleGeneration || 0),
    sessionLifecycleStatus: String(groupSessionMemoryBinding?.sessionLifecycleStatus || ""),
    sessionLifecycleHeadChecksum: String(groupSessionMemoryBinding?.sessionLifecycleHeadChecksum || ""),
    currentSessionLifecycleHead: sessionLifecycleValidation.expected,
    snapshotRenderedPromptChecksum: declaredSnapshotPromptChecksum,
    actualRenderedPromptChecksum: hashValue(actualPrompt),
    promptBindingMode,
    executionSucceeded: input.executionSucceeded !== false,
    outputChecksum,
    runnerStarted,
    fileChangeCount: fileChangeRows.length,
    fileChangeChecksum,
    fileChangePaths: fileChangeRows.map((item: any) => item.path),
    taskArtifactProven,
    providerContractId: String(input.nativeContinuationEvidence?.providerContractId || ""),
    providerRuntimeVersion: String(input.nativeContinuationEvidence?.providerRuntimeVersion || ""),
    providerMemoryTransportUsage,
    providerMemoryTransportUsageChecksum: String(providerMemoryTransportUsage?.usage_checksum || ""),
    providerContextUsageBaseline,
    providerContextUsageBaselineChecksum: String(providerContextUsageBaseline?.baseline_checksum || ""),
    providerContextUsageBaselineAdmitted: providerContextUsageBaselineVerification.valid,
    memoryContinuationBaselineRequired: continuationBaseline.required,
    memoryContinuationBaselineValid: continuationBaseline.valid,
    memoryContinuationBaselineStatus: continuationBaseline.status,
    memoryContinuationBaselineIssues: continuationBaseline.issues,
    memoryContinuationEvidenceChecksum: continuationBaseline.evidenceChecksum,
    nativeContinuationEvidence: continuationBaseline.required ? input.nativeContinuationEvidence || null : null,
    providerMemoryChannelRequired,
    providerMemoryChannelAcknowledgementRequired,
    providerMemoryChannelAcknowledged: providerMemoryChannelVerification.acknowledged,
    providerMemoryChannelAcknowledgementStatus: providerMemoryChannelVerification.acknowledgementStatus,
    providerMemoryChannelAcknowledgementPolicy: providerMemoryChannelVerification.acknowledgementPolicy,
    providerMemoryChannelValid: providerMemoryChannelVerification.valid,
    providerMemoryChannelStatus: providerMemoryChannelVerification.status,
    providerMemoryChannel: providerMemoryChannelVerification.channel,
    providerMemoryAuthorityRole: providerMemoryChannelVerification.authorityRole,
    providerMemoryNativeSystemPrompt: providerMemoryChannelVerification.nativeSystemPrompt,
    providerMemoryNativeDeveloperInstructions: providerMemoryChannelVerification.nativeDeveloperInstructions,
    providerMemoryUserPromptFallback: providerMemoryChannelVerification.fallbackUserPrompt,
    providerMemoryChannelIssues: providerMemoryChannelVerification.issues,
    providerMemoryChannelEvidenceChecksum: String(input.providerMemoryChannelEvidence?.evidence_checksum || ""),
    providerMemoryChannelEvidence: providerMemoryChannelRequired ? input.providerMemoryChannelEvidence || null : null,
    memoryContextConsumptionReceiptRequired,
    memoryContextConsumptionReceiptValid: memoryContextConsumptionVerification.valid,
    memoryContextConsumptionReceiptStatus: memoryContextConsumptionVerification.valid ? (memoryContextConsumptionReceiptRequired ? "loaded" : "not_required") : "unverified",
    memoryContextConsumptionReceiptIssues: memoryContextConsumptionVerification.issues || [],
    memoryContextConsumptionChallengeId: String(memoryContextConsumptionChallenge?.challenge_id || ""),
    memoryContextConsumptionReceiptSignature: String(memoryContextConsumptionVerification.receiptSignature || ""),
    memoryContextConsumptionReceipt: memoryContextConsumptionReceiptRequired ? memoryContextConsumptionVerification.receipt || null : null,
    memoryContextConsumptionRecoveryPresent: !!input.memoryContextConsumptionRecovery,
    memoryContextConsumptionRecoveryValid: memoryContextConsumptionRecoveryVerification.valid,
    memoryContextConsumptionRecoveryStatus: String(input.memoryContextConsumptionRecovery?.status || "not_needed"),
    memoryContextConsumptionRecoveryId: String(input.memoryContextConsumptionRecovery?.recovery_id || ""),
    memoryContextConsumptionRecoveryIssues: memoryContextConsumptionRecoveryVerification.issues || [],
    memoryContextConsumptionRecovery: input.memoryContextConsumptionRecovery || null,
  };
  const receipt = { ...payload, checksum: hashValue(payload, 64), receiptFile };
  writeJsonAtomic(receiptFile, receipt);
  const memorySnapshotSync = snapshot.context?.memory_snapshot_sync || null;
  const memorySnapshotSyncVerification = verifyTaskAgentMemorySnapshotSyncDecision(memorySnapshotSync, {
    groupId: String(snapshot.session?.group_id || current.groupId || ""),
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: String(snapshot.session?.task_id || current.taskId || ""),
    taskAgentSessionId: id,
    targetProject: String(snapshot.session?.project || current.project || ""),
    currentMemoryContextChecksum: String(snapshot.context?.memory_context_checksum || ""),
  });
  const memoryPromptInjectionVerification = verifyTaskAgentMemoryPromptInjectionProof(memoryPromptInjectionProof, {
    groupId: String(snapshot.session?.group_id || current.groupId || ""),
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: String(snapshot.session?.task_id || current.taskId || ""),
    taskAgentSessionId: id,
    targetProject: String(snapshot.session?.project || current.project || ""),
    memoryContextChecksum: String(snapshot.context?.memory_context_checksum || ""),
    syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
    renderedPromptChecksum: String(snapshot.context?.rendered_prompt_checksum || ""),
  });
  const syncCommitted = receipt.delivered === true
    && memorySnapshotSyncVerification.valid === true
    && memoryPromptInjectionVerification.valid === true
    && memoryPromptInjectionVerification.deliveryReady === true;
  const syncCommitFile = getMemorySnapshotSyncCommitFile(id, snapshotId);
  const existingCanonicalReceipt = ref?.deliveryReceiptPath
    ? safeReadJson(ref.deliveryReceiptPath, null)
    : null;
  const existingCanonicalReceiptValid = !!existingCanonicalReceipt
    && verifyMemoryContextDeliveryReceiptChecksum(existingCanonicalReceipt)
    && existingCanonicalReceipt.delivered === true
    && String(existingCanonicalReceipt.status || "") === "delivered"
    && String(existingCanonicalReceipt.receiptId || "") === String(ref?.deliveryReceiptId || "")
    && String(existingCanonicalReceipt.checksum || "") === String(ref?.deliveryReceiptChecksum || "")
    && String(existingCanonicalReceipt.taskAgentSessionId || "") === id
    && String(existingCanonicalReceipt.taskId || "") === String(snapshot.session?.task_id || current.taskId || "")
    && String(existingCanonicalReceipt.groupId || "") === String(snapshot.session?.group_id || current.groupId || "")
    && String(existingCanonicalReceipt.project || "") === String(snapshot.session?.project || current.project || "")
    && String(existingCanonicalReceipt.memoryContextSnapshotId || "") === snapshotId
    && String(existingCanonicalReceipt.memoryContextSnapshotChecksum || "") === String(snapshot.checksum || "");
  const existingSyncCommit = fs.existsSync(syncCommitFile) ? safeReadJson(syncCommitFile, null) : null;
  const existingSyncCommitVerification = existingCanonicalReceiptValid
    ? verifyTaskAgentMemorySnapshotSyncCommit(existingSyncCommit, {
      groupId: String(snapshot.session?.group_id || current.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(snapshot.session?.task_id || current.taskId || ""),
      taskAgentSessionId: id,
      targetProject: String(snapshot.session?.project || current.project || ""),
      snapshotId,
      snapshotChecksum: String(snapshot.checksum || ""),
      syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
      syncAction: String(memorySnapshotSync?.action || ""),
      memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
      deliveryReceiptId: String(existingCanonicalReceipt?.receiptId || ""),
      deliveryReceiptChecksum: String(existingCanonicalReceipt?.checksum || ""),
    })
    : { valid: false, committed: false };
  const preserveExistingCommittedBaseline = existingSyncCommitVerification.valid === true
    && existingSyncCommitVerification.committed === true
    && String(ref?.memorySnapshotSyncCommitChecksum || "") === String(existingSyncCommit?.commit_checksum || "");
  const syncCommitPayload = {
    schema: TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA,
    version: 1,
    status: syncCommitted ? "committed" : "rejected",
    committed: syncCommitted,
    group_id: String(snapshot.session?.group_id || current.groupId || ""),
    group_session_id: String(groupSessionMemoryBinding?.groupSessionId || ""),
    task_id: String(snapshot.session?.task_id || current.taskId || ""),
    task_agent_session_id: id,
    target_project: String(snapshot.session?.project || current.project || ""),
    snapshot_id: snapshotId,
    snapshot_checksum: String(snapshot.checksum || ""),
    sync_checksum: String(memorySnapshotSync?.sync_checksum || ""),
    sync_action: String(memorySnapshotSync?.action || ""),
    memory_prompt_injection_proof_checksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
    delivery_receipt_id: receiptId,
    delivery_receipt_checksum: receipt.checksum,
    delivery_status: receipt.status,
    committed_at: syncCommitted ? deliveredAt : "",
    rejected_at: syncCommitted ? "" : deliveredAt,
  };
  const syncCommitCandidate = {
    ...syncCommitPayload,
    commit_checksum: memorySnapshotSyncCommitChecksum(syncCommitPayload),
    commit_file: syncCommitFile,
  };
  const syncCommitVerification = verifyTaskAgentMemorySnapshotSyncCommit(syncCommitCandidate, {
    groupId: syncCommitCandidate.group_id,
    groupSessionId: syncCommitCandidate.group_session_id,
    taskId: syncCommitCandidate.task_id,
    taskAgentSessionId: id,
    targetProject: syncCommitCandidate.target_project,
    snapshotId,
    snapshotChecksum: syncCommitCandidate.snapshot_checksum,
    syncChecksum: syncCommitCandidate.sync_checksum,
    syncAction: syncCommitCandidate.sync_action,
    memoryPromptInjectionProofChecksum: syncCommitCandidate.memory_prompt_injection_proof_checksum,
    deliveryReceiptId: receiptId,
    deliveryReceiptChecksum: receipt.checksum,
  });
  if (!syncCommitVerification.valid) {
    throw new Error(`task Agent memory snapshot sync commit invalid: ${syncCommitVerification.issues.join(",")}`);
  }
  const syncCommit = preserveExistingCommittedBaseline ? existingSyncCommit : syncCommitCandidate;
  const syncCommitDisposition = preserveExistingCommittedBaseline
    ? "preserved_committed"
    : syncCommitted ? "committed" : "rejected";
  if (!preserveExistingCommittedBaseline) writeJsonAtomic(syncCommitFile, syncCommitCandidate);
  const canonicalReceipt = preserveExistingCommittedBaseline ? existingCanonicalReceipt : receipt;
  const nextRef = {
    ...(ref || {
      snapshotId,
      snapshotPath: snapshotFile,
      checksum: String(snapshot.checksum || ""),
      generatedAt: String(snapshot.generated_at || ""),
    }),
    deliveryReceiptId: String(canonicalReceipt?.receiptId || ""),
    deliveryReceiptPath: String(canonicalReceipt?.receiptFile || ""),
    deliveryReceiptChecksum: String(canonicalReceipt?.checksum || ""),
    deliveryStatus: String(canonicalReceipt?.status || ""),
    deliveredAt: String(canonicalReceipt?.deliveredAt || ""),
    latestDeliveryAttemptReceiptId: receiptId,
    latestDeliveryAttemptReceiptPath: receiptFile,
    latestDeliveryAttemptReceiptChecksum: receipt.checksum,
    latestDeliveryAttemptStatus: receipt.status,
    latestDeliveryAttemptAt: deliveredAt,
    memorySnapshotSyncCommitPath: syncCommitFile,
    memorySnapshotSyncCommitChecksum: syncCommit.commit_checksum,
    memorySnapshotSyncCommitStatus: syncCommit.status as "committed" | "rejected",
    memorySnapshotSyncCommittedAt: String(syncCommit?.committed_at || syncCommit?.rejected_at || ""),
  };
  if (refIndex >= 0) refs[refIndex] = nextRef;
  else refs.push(nextRef);
  const activeSnapshotRef = refs.find(item => item.snapshotId === String(current.memoryContextSnapshotId || "")) || nextRef;
  const workerMemory = snapshot.context?.worker_context_packet?.memory || snapshot.context?.memory_context || {};
  const groupMemory = workerMemory?.group_memory || workerMemory?.groupMemory || workerMemory;
  const parentContinuity = groupMemory?.session_continuity || groupMemory?.sessionContinuity || null;
  const previousCompaction = normalizeSessionCompactionState(current.compaction || {}, { scope: "task_agent", sessionId: id });
  const normalizedUsage = normalizeSessionProviderUsage(providerContextUsageBaseline ? {
    ...providerContextUsageBaseline,
    scope: "task_agent",
    sessionId: id,
    provider: input.runtime || current.agentType || "",
    model: providerModel,
    generation: Number(parentContinuity?.boundary_generation || previousCompaction.boundaryGeneration || 0),
    boundaryGeneration: Number(parentContinuity?.boundary_generation || previousCompaction.boundaryGeneration || 0),
    anchorMessageId: String(input.executionId || input.runnerRequestId || receiptId),
  } : null);
  const taskCompaction = {
    ...previousCompaction,
    activeSummary: parentContinuity?.summary || previousCompaction.activeSummary || null,
    activeSummaryChecksum: String(parentContinuity?.summary_checksum || previousCompaction.activeSummaryChecksum || ""),
    preservedRecentMessageIds: Array.isArray(parentContinuity?.recent_messages) ? parentContinuity.recent_messages.map((message: any) => String(message?.id || "")) : previousCompaction.preservedRecentMessageIds,
    preservedRecentTokens: Number(parentContinuity?.recent_window?.preservedTokenCount || previousCompaction.preservedRecentTokens || 0),
    preservedRecentTextMessageCount: Number(parentContinuity?.recent_window?.preservedTextMessageCount || previousCompaction.preservedRecentTextMessageCount || 0),
    latestProviderUsage: normalizedUsage || previousCompaction.latestProviderUsage,
    tokenMeasurement: {
      schema: "ccm-session-context-token-measurement-v2",
      method: finalDispatchPayloadGateVerification.valid ? "final_provider_payload_gate" : "full_prompt_estimate",
      activeTokens: finalPromptEstimatedTokens,
      baselineValid: !!normalizedUsage,
      provider: input.runtime || current.agentType || "",
      model: providerModel,
    },
    sessionMemoryState: parentContinuity?.session_memory || previousCompaction.sessionMemoryState || null,
    postCompactGate: finalDispatchPayloadGateVerification.valid ? finalDispatchPayloadGate : previousCompaction.postCompactGate,
    consecutiveFailures: Number(current.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || previousCompaction.consecutiveFailures || 0),
    boundaryGeneration: Number(parentContinuity?.boundary_generation || previousCompaction.boundaryGeneration || 0),
  };
  const next: TaskAgentSession = {
    ...current,
    memoryContextDeliveryReceiptId: String(activeSnapshotRef?.deliveryReceiptId || ""),
    memoryContextDeliveryReceiptPath: String(activeSnapshotRef?.deliveryReceiptPath || ""),
    memoryContextDeliveryReceiptChecksum: String(activeSnapshotRef?.deliveryReceiptChecksum || ""),
    memoryContextDeliveryStatus: String(activeSnapshotRef?.deliveryStatus || ""),
    memoryContextDeliveredAt: String(activeSnapshotRef?.deliveredAt || ""),
    latestMemoryContextDeliveryAttemptReceiptId: receiptId,
    latestMemoryContextDeliveryAttemptReceiptPath: receiptFile,
    latestMemoryContextDeliveryAttemptReceiptChecksum: receipt.checksum,
    latestMemoryContextDeliveryAttemptStatus: receipt.status,
    latestMemoryContextDeliveryAttemptAt: deliveredAt,
    memorySnapshotSyncCommitPath: String(activeSnapshotRef?.memorySnapshotSyncCommitPath || ""),
    memorySnapshotSyncCommitChecksum: String(activeSnapshotRef?.memorySnapshotSyncCommitChecksum || ""),
    memorySnapshotSyncCommitStatus: activeSnapshotRef?.memorySnapshotSyncCommitStatus,
    memorySnapshotSyncCommittedAt: String(activeSnapshotRef?.memorySnapshotSyncCommittedAt || ""),
    providerContextUsageBaseline,
    compaction: taskCompaction,
    memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
    lastUsedAt: deliveredAt,
  };
  store.sessions[index] = next;
  saveStore(store);
  const groupSessionId = String(groupSessionMemoryBinding?.groupSessionId || "");
  const invocationEdgeId = String(input.invocationEdgeId || snapshot.context?.invocation_edge_id || "");
  const invocationEdge = groupSessionId.startsWith("gcs_") && invocationEdgeId
    ? readTaskAgentInvocationLineage(String(receipt.groupId || current.groupId || ""), groupSessionId, id)
      .edges.find((edge: any) => edge.invocation_edge_id === invocationEdgeId) || null
    : null;
  if (groupSessionId.startsWith("gcs_") && receipt.runnerRequestId) tryRecordTaskAgentContinuationSoakEvent({
    groupId: String(receipt.groupId || current.groupId || ""),
    groupSessionId,
    taskAgentSessionId: id,
    phase: "task_artifact_committed",
    status: taskArtifactProven ? "proven" : "observed",
    eventKey: `task-artifact:${receipt.checksum}`,
    evidence: {
      invocation_edge_id: invocationEdgeId,
      runner_request_id: receipt.runnerRequestId,
      memory_context_snapshot_id: snapshotId,
      worker_context_packet_id: String(invocationEdge?.worker_context_packet_id || receipt.workerContextPacketId || ""),
      compact_epoch: String(invocationEdge?.compact_epoch || "precompact"),
      nativeContinuationEvidence: input.nativeContinuationEvidence || null,
      recovery_outcome: String(input.recoveryOutcome || ""),
      taskArtifactEvidence: {
        taskArtifactProven,
        taskOutputChecksum: outputChecksum,
        fileChangeCount: fileChangeRows.length,
        fileChangeChecksum,
        fileChangePaths: fileChangeRows.map((item: any) => item.path),
        memoryDeliveryReceiptChecksum: receipt.checksum,
        memoryPromptChecksum: receipt.actualRenderedPromptChecksum,
        memoryContextChecksum: receipt.memoryContextChecksum,
        groupSessionMemoryBindingChecksum: receipt.groupSessionMemoryBindingChecksum,
        compactTransactionReceiptChecksum: receipt.compactTransactionReceiptChecksum,
        compactTransactionReceiptValid: receipt.compactTransactionReceiptValid,
        compactTransactionBoundaryId: receipt.compactTransactionBoundaryId,
        compactHeadFenceValid: receipt.compactHeadFenceValid,
        compactHeadGeneration: receipt.compactHeadGeneration,
        compactHeadChecksum: receipt.compactHeadChecksum,
        sessionLifecycleFenceValid: receipt.sessionLifecycleFenceValid,
        sessionLifecycleGeneration: receipt.sessionLifecycleGeneration,
        sessionLifecycleHeadChecksum: receipt.sessionLifecycleHeadChecksum,
      },
    },
    source: "task_agent_memory_delivery",
  });
    return { session: next, receipt, ref: nextRef, syncCommit, syncCommitDisposition };
  });
}


export function readTaskAgentMemoryContextDeliveryReceipt(file: string) {
  const receipt = safeReadJson(String(file || ""), null);
  if (!receipt) return null;
  return { ...receipt, checksumValid: verifyMemoryContextDeliveryReceiptChecksum(receipt) };
}
