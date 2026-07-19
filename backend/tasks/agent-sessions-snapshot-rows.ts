// Behavior-freeze extraction: memory snapshot row builder.
// Behavior-freeze snapshot row builder.
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { AGENT_RUNTIMES, getAgentRuntime, normalizeAgentRuntimeId } from "../agents/runtime";
import {
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
  TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
  TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA,
  TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA,
  TaskAgentMemoryContextSnapshotRef,
  TaskAgentSession,
  capacityRevalidationGroupSessionId,
  extractGroupSessionMemoryBinding,
  finalDispatchReactiveCompactCircuitChecksum,
  getMemorySnapshotSyncCommitFile,
  hasMeaningfulMemoryContext,
  memoryPromptInjectionProofChecksum,
  memorySnapshotSyncChecksum,
  memorySnapshotSyncCommitChecksum,
  pathIsInsideMemorySnapshotDir,
  safeReadJson,
  verifyMemoryContextDeliveryReceiptChecksum,
  verifyMemoryContextSnapshotChecksum,
  verifyTaskAgentMemoryContinuationBaselineDelivery,
  verifyTaskAgentMemoryPromptInjectionProof,
  verifyTaskAgentMemorySnapshotSyncCommit,
  verifyTaskAgentMemorySnapshotSyncDecision
} from "./agent-sessions-shared";

export function buildTaskAgentMemorySnapshotRow(input: {
  session?: TaskAgentSession | null;
  ref?: TaskAgentMemoryContextSnapshotRef | null;
  loaded?: any;
  actualFile?: string;
  source: "session_ref" | "orphan_file";
  latestRank?: number | null;
  policy: { staleDays: number; retentionDays: number; keepLatestPerSession: number };
  nowMs: number;
}) {
  const loaded = input.loaded || null;
  const loadedSession = loaded?.session || {};
  const session = input.session || null;
  const actualFile = String(input.actualFile || input.ref?.snapshotPath || loaded?.snapshot_file || "").trim();
  const fileExists = !!actualFile && fs.existsSync(actualFile);
  const stat = (() => {
    try { return fileExists ? fs.statSync(actualFile) : null; } catch { return null; }
  })();
  const generatedAt = String(loaded?.generated_at || input.ref?.generatedAt || (stat ? stat.mtime.toISOString() : "") || "").trim();
  const generatedMs = Date.parse(generatedAt || "");
  const ageMs = Number.isFinite(generatedMs) ? Math.max(0, input.nowMs - generatedMs) : stat ? Math.max(0, input.nowMs - stat.mtimeMs) : null;
  const ageDays = ageMs === null ? null : Math.round((ageMs / (24 * 60 * 60 * 1000)) * 10) / 10;
  const context = loaded?.context || {};
  const memoryContext = context.memory_context || context.worker_context_packet?.memory || null;
  const groupMemoryContext = memoryContext?.group_memory || memoryContext?.groupMemory || memoryContext || {};
  const postTurnSummaryState = groupMemoryContext?.group_state?.postTurnSummaries || groupMemoryContext?.group_state?.post_turn_summaries || {};
  const postTurnSummaryExpected = groupMemoryContext?.memory_policy?.ignored !== true
    && Array.isArray(postTurnSummaryState.latest)
    && postTurnSummaryState.latest.length > 0
    && String(loadedSession.id || input.session?.id || "").startsWith("tas_");
  const postTurnSummaryCapsuleInput = context.post_turn_summary_delivery_capsule
    || context.worker_context_packet?.post_turn_summary_delivery_capsule
    || extractGroupPostTurnSummaryDeliveryCapsule(memoryContext || null);
  const invocationLineage = context.task_agent_invocation_lineage || context.worker_context_packet?.task_agent_invocation_lineage || null;
  const postTurnSummaryCapsule = validateGroupPostTurnSummaryDeliveryCapsule(postTurnSummaryCapsuleInput, {
    expectedBinding: {
      group_id: String(loadedSession.group_id || input.session?.groupId || ""),
      task_id: String(loadedSession.task_id || input.session?.taskId || ""),
      target_project: String(loadedSession.project || input.session?.project || ""),
      task_agent_session_id: String(loadedSession.id || input.session?.id || ""),
      native_session_id: String(loadedSession.native_session_id || input.session?.nativeSessionId || ""),
      attempt_sequence: Number(loadedSession.turn || 0),
      invocation_kind: Number(loadedSession.turn || 0) > 1 ? "resume" : "spawn",
      ...(invocationLineage?.invocation_edge_id ? {
        invocation_edge_id: invocationLineage.invocation_edge_id,
        parent_invocation_edge_id: invocationLineage.parent_invocation_edge_id || "",
        root_invocation_edge_id: invocationLineage.root_invocation_edge_id || "",
        branch_id: invocationLineage.branch_id || "",
        parent_branch_id: invocationLineage.parent_branch_id || "",
        branch_kind: invocationLineage.branch_kind || "main",
        expected_lineage_head_checksum: invocationLineage.expected_lineage_head_checksum || "",
      } : {}),
    },
  });
  const postTurnSummaryCapsulePresent = !!postTurnSummaryCapsuleInput?.schema;
  const postTurnSummaryCapsuleValid = postTurnSummaryCapsule?.trusted_for_delivery === true;
  const postTurnSummaryCapsulePromptBound = context.post_turn_summary_capsule_prompt_bound === true;
  const snapshotCompactEpoch = String(groupMemoryContext?.group_state?.typedMemory?.ledger?.compactEpoch || groupMemoryContext?.group_state?.typed_memory?.ledger?.compact_epoch || "");
  const postTurnSummaryCapsuleCompactEpochBound = !postTurnSummaryCapsulePresent || !snapshotCompactEpoch
    || String(postTurnSummaryCapsule?.compact_epoch || "") === snapshotCompactEpoch;
  const snapshotLedgerHead = String(postTurnSummaryState.headChecksum || postTurnSummaryState.head_checksum || "");
  const postTurnSummaryCapsuleLedgerHeadBound = !postTurnSummaryCapsulePresent || !snapshotLedgerHead
    || String(postTurnSummaryCapsule?.ledger_head_checksum || "") === snapshotLedgerHead;
  const snapshotSummaryIds = new Set((Array.isArray(postTurnSummaryState.latest) ? postTurnSummaryState.latest : []).map((row: any) => String(row.summaryId || row.summary_id || "")));
  const postTurnSummaryCapsuleSelectionBound = !postTurnSummaryCapsulePresent
    || (postTurnSummaryCapsule?.selected_summaries || []).every((row: any) => snapshotSummaryIds.has(String(row.summary_id || "")));
  const invocationEdgeId = String(invocationLineage?.invocation_edge_id || postTurnSummaryCapsule?.invocation_edge_id || input.ref?.invocationEdgeId || "");
  const invocationEdge = (() => {
    if (!invocationEdgeId) return null;
    try {
      const ledger = readTaskAgentInvocationLineage(
        String(loadedSession.group_id || input.session?.groupId || ""),
        String(postTurnSummaryCapsule?.group_session_id || groupMemoryContext?.group_session_id || ""),
        String(loadedSession.id || input.session?.id || "")
      );
      return ledger.edges.find((edge: any) => edge.invocation_edge_id === invocationEdgeId) || null;
    } catch { return null; }
  })();
  const invocationLineageExpected = !!postTurnSummaryCapsule?.invocation_edge_id;
  const invocationLineageBound = !invocationLineageExpected || !!invocationLineage
    && invocationEdgeId === String(postTurnSummaryCapsule?.invocation_edge_id || "")
    && String(invocationLineage.branch_id || "") === String(postTurnSummaryCapsule?.branch_id || "")
    && String(invocationLineage.parent_invocation_edge_id || "") === String(postTurnSummaryCapsule?.parent_invocation_edge_id || "");
  const invocationLedgerBound = !invocationLineageExpected || !!invocationEdge
    && invocationEdge.group_id === String(loadedSession.group_id || input.session?.groupId || "")
    && invocationEdge.group_session_id === String(postTurnSummaryCapsule?.group_session_id || "")
    && invocationEdge.task_agent_session_id === String(loadedSession.id || input.session?.id || "")
    && invocationEdge.task_id === String(loadedSession.task_id || input.session?.taskId || "")
    && invocationEdge.target_project === String(loadedSession.project || input.session?.project || "");
  const groupSessionMemoryBinding = context.group_session_memory_binding || extractGroupSessionMemoryBinding(memoryContext || {});
  const memorySnapshotSync = context.memory_snapshot_sync || null;
  const memorySnapshotSyncPresent = memorySnapshotSync?.schema === TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA;
  const memorySnapshotSyncVerification = memorySnapshotSyncPresent
    ? verifyTaskAgentMemorySnapshotSyncDecision(memorySnapshotSync, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || session?.id || ""),
      targetProject: String(loadedSession.project || session?.project || ""),
      currentMemoryContextChecksum: String(context.memory_context_checksum || ""),
    })
    : { valid: false, issues: ["memory_snapshot_sync_missing"], action: "" };
  const memoryEntrySync = context.memory_entry_sync || taskAgentMemoryEntrySyncPlan(memoryContext);
  const memoryEntrySyncPresent = !!memoryEntrySync?.schema;
  const memoryEntrySyncVerification = memoryEntrySyncPresent
    ? verifyTaskAgentMemoryEntrySyncPlan(memoryEntrySync, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || session?.id || ""),
      targetProject: String(loadedSession.project || session?.project || ""),
      sourceMemoryContextChecksum: taskAgentMemorySemanticChecksum(memoryContext),
    })
    : { valid: false, issues: ["memory_entry_sync_missing"], mode: "" };
  const memoryEntryManifest = memoryEntrySync?.current_manifest || null;
  const rebuiltMemoryEntryManifest = memoryEntrySyncPresent ? buildTaskAgentMemoryEntryManifest(stripTaskAgentMemoryEntrySync(memoryContext)) : null;
  const memoryEntryManifestCurrent = memoryEntrySyncPresent
    && String(memoryEntryManifest?.manifest_checksum || "") === String(rebuiltMemoryEntryManifest?.manifest_checksum || "");
  const memoryPromptInjectionProof = context.memory_prompt_injection_proof || null;
  const memoryPromptInjectionProofPresent = memoryPromptInjectionProof?.schema === TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA;
  const memoryPromptInjectionVerification = memoryPromptInjectionProofPresent
    ? verifyTaskAgentMemoryPromptInjectionProof(memoryPromptInjectionProof, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || session?.id || ""),
      targetProject: String(loadedSession.project || session?.project || ""),
      memoryContextChecksum: String(context.memory_context_checksum || ""),
      syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
      renderedPromptChecksum: String(context.rendered_prompt_checksum || ""),
    })
    : {
      valid: false,
      issues: ["memory_prompt_injection_proof_missing"],
      deliveryReady: false,
      promptBound: false,
      projectionPresent: false,
      injectionRequired: false,
      enforcementRequired: false,
      trustedEnvelopeRequired: false,
      trustedEnvelopePresent: false,
      trustedEnvelopeValid: false,
      trustedEnvelopeBound: false,
      status: "missing",
    };
  const finalDispatchPayloadGate = context.final_dispatch_payload_gate
    || context.worker_context_packet?.final_dispatch_payload_gate
    || null;
  const finalDispatchPayloadGatePresent = finalDispatchPayloadGate?.schema === "ccm-final-worker-dispatch-payload-gate-v1";
  const finalDispatchPayloadGateVerification = finalDispatchPayloadGatePresent
    ? verifyFinalWorkerDispatchPayloadGate(finalDispatchPayloadGate, {
      groupId: String(loadedSession.group_id || input.session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
      taskId: String(loadedSession.task_id || input.session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || input.session?.id || ""),
      workerContextPacketId: String(context.worker_context_packet_id || context.worker_context_packet?.packet_id || ""),
    })
    : { valid: false, issues: ["final_dispatch_payload_gate_missing"] };
  const providerContextUsageBaseline = session?.providerContextUsageBaseline || null;
  const providerContextUsageBaselinePresent = providerContextUsageBaseline?.schema === "ccm-final-dispatch-provider-usage-baseline-v1";
  const providerContextUsageBaselineIdentity = {
    groupId: String(loadedSession.group_id || session?.groupId || ""),
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
    taskId: String(loadedSession.task_id || session?.taskId || ""),
    taskAgentSessionId: String(loadedSession.id || session?.id || ""),
    provider: String(finalDispatchPayloadGate?.provider || session?.agentType || ""),
    model: String(finalDispatchPayloadGate?.model || session?.modelId || ""),
    ...(String(finalDispatchPayloadGate?.provider_contract_id || session?.providerContractId || "").trim()
      ? { providerContractId: String(finalDispatchPayloadGate?.provider_contract_id || session?.providerContractId || "") }
      : {}),
    ...(String(finalDispatchPayloadGate?.provider_runtime_version || session?.providerRuntimeVersion || "").trim()
      ? { providerRuntimeVersion: String(finalDispatchPayloadGate?.provider_runtime_version || session?.providerRuntimeVersion || "") }
      : {}),
  };
  const providerContextUsageBaselineIntegrityVerification = providerContextUsageBaselinePresent
    ? verifyFinalDispatchProviderUsageBaseline(providerContextUsageBaseline, {
      groupId: providerContextUsageBaselineIdentity.groupId,
      groupSessionId: providerContextUsageBaselineIdentity.groupSessionId,
      taskId: providerContextUsageBaselineIdentity.taskId,
      taskAgentSessionId: providerContextUsageBaselineIdentity.taskAgentSessionId,
    })
    : { valid: false, issues: [] as string[] };
  const providerContextUsageBaselineVerification = providerContextUsageBaselinePresent
    ? verifyFinalDispatchProviderUsageBaseline(providerContextUsageBaseline, {
      ...providerContextUsageBaselineIdentity,
      compactEpoch: String(groupSessionMemoryBinding?.compactEpoch || "precompact"),
      compactHeadId: String(groupSessionMemoryBinding?.compactHeadId || ""),
      compactHeadGeneration: Number(groupSessionMemoryBinding?.compactHeadGeneration || 0),
      compactHeadChecksum: String(groupSessionMemoryBinding?.compactHeadChecksum || ""),
    })
    : { valid: false, issues: [] as string[] };
  const providerContextUsageBaselineStale = providerContextUsageBaselineIntegrityVerification.valid === true
    && providerContextUsageBaselineVerification.valid !== true;
  const providerContextUsageBaselineStaleAfterCompact = providerContextUsageBaselineStale
    && providerContextUsageBaselineVerification.issues.some((issue: string) => issue.includes("source_compact_"));
  const finalDispatchPromptBound = finalDispatchPayloadGatePresent
    && String(finalDispatchPayloadGate.prompt_checksum || "") === String(context.final_dispatch_prompt_checksum || "")
    && Number(finalDispatchPayloadGate.estimated_total_input_tokens || 0) === Number(context.final_dispatch_prompt_tokens || 0)
    && Number(finalDispatchPayloadGate.prompt_chars || 0) === Number(context.final_dispatch_prompt_chars || 0);
  const finalDispatchStatus = String(finalDispatchPayloadGate?.status || "missing");
  const finalDispatchReactiveCompact = context.final_dispatch_reactive_compact
    || context.worker_context_packet?.final_dispatch_reactive_compact
    || null;
  const finalDispatchContextCollapse = finalDispatchReactiveCompact?.context_collapse || null;
  const finalDispatchReactiveCompactPresent = finalDispatchReactiveCompact?.schema === "ccm-final-dispatch-reactive-compact-v1";
  const finalDispatchReactiveCompactVerification = finalDispatchReactiveCompactPresent
    ? verifyFinalDispatchReactiveCompactReceipt(finalDispatchReactiveCompact, {
      groupId: String(loadedSession.group_id || input.session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
      taskId: String(loadedSession.task_id || input.session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || input.session?.id || ""),
      workerContextPacketId: String(context.worker_context_packet_id || context.worker_context_packet?.packet_id || ""),
    })
    : { valid: true, issues: [] };
  const finalDispatchReactiveCompactBound = !finalDispatchReactiveCompactPresent
    || String(finalDispatchReactiveCompact.recovered_prompt_checksum || "") === String(finalDispatchPayloadGate?.prompt_checksum || "")
    && Number(finalDispatchReactiveCompact.recovered_prompt_tokens || 0) === Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0)
    && (finalDispatchReactiveCompact.status !== "recovered" || finalDispatchStatus === "ready");
  const finalDispatchReactiveCompactCircuitBreaker = session?.finalDispatchReactiveCompactCircuitBreaker || null;
  const finalDispatchReactiveCompactCircuitBreakerPresent = finalDispatchReactiveCompactCircuitBreaker?.schema === "ccm-final-dispatch-reactive-compact-circuit-breaker-v1";
  const finalDispatchReactiveCompactCircuitBreakerVerification = finalDispatchReactiveCompactCircuitBreakerPresent
    ? require("./agent-sessions-resume").verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(finalDispatchReactiveCompactCircuitBreaker, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(finalDispatchPayloadGate?.group_session_id || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: String(loadedSession.id || session?.id || ""),
    })
    : { valid: true, issues: [] };
  const finalDispatchLineageProofRequired = finalDispatchStatus === "ready" && !!invocationEdgeId;
  const finalDispatchLineageProofValid = !finalDispatchLineageProofRequired || !!invocationEdge
    && invocationEdge.final_dispatch_payload_gate_dispatch_valid === true
    && String(invocationEdge.final_dispatch_payload_gate_checksum || "") === String(finalDispatchPayloadGate?.gate_checksum || "");
  const gateIds = Array.isArray(context.gate_ids || input.ref?.gateIds)
    ? (context.gate_ids || input.ref?.gateIds).map((id: any) => String(id || "").trim()).filter(Boolean)
    : [];
  const workerContextPacketId = String(context.worker_context_packet_id || input.ref?.workerContextPacketId || "").trim();
  const snapshotId = String(loaded?.snapshot_id || input.ref?.snapshotId || path.basename(actualFile || "", ".json") || "").trim();
  const sessionId = String(loadedSession.id || session?.id || "").trim();
  const expectedSessionId = String(session?.id || "").trim();
  const sessionBound = input.source === "session_ref"
    ? !!expectedSessionId && (!loaded || String(loadedSession.id || "") === expectedSessionId)
    : false;
  const schemaOk = loaded?.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA;
  const checksumMatches = !!loaded && verifyMemoryContextSnapshotChecksum(loaded);
  const memoryContextPresent = hasMeaningfulMemoryContext(memoryContext);
  const deliveryReceiptFile = String(
    input.ref?.deliveryReceiptPath
    || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.memoryContextDeliveryReceiptPath : "")
    || ""
  ).trim();
  const deliveryReceipt = deliveryReceiptFile ? safeReadJson(deliveryReceiptFile, null) : null;
  const deliveryReceiptChecksumValid = !!deliveryReceipt && verifyMemoryContextDeliveryReceiptChecksum(deliveryReceipt);
  const providerMemoryTransportUsage = deliveryReceipt?.providerMemoryTransportUsage || null;
  const providerMemoryTransportUsagePresent = !!providerMemoryTransportUsage?.schema;
  const providerMemoryTransportUsageVerification = providerMemoryTransportUsagePresent
    ? verifyTaskAgentMemoryTransportUsageReceipt(providerMemoryTransportUsage, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: sessionId,
      targetProject: String(loadedSession.project || session?.project || ""),
      snapshotId,
      snapshotChecksum: String(loaded?.checksum || input.ref?.checksum || ""),
      runnerRequestId: String(deliveryReceipt?.runnerRequestId || ""),
      provider: String(deliveryReceipt?.runtime || session?.agentType || ""),
      nativeSessionId: String(deliveryReceipt?.nativeSessionId || ""),
      transportMode: String(memoryEntrySync?.transport_mode || "legacy"),
    })
    : { valid: false, issues: ["memory_transport_usage_missing"] };
  const memoryContinuationBaselineVerification = deliveryReceipt
    ? verifyTaskAgentMemoryContinuationBaselineDelivery(loaded, {
      runtime: deliveryReceipt.runtime,
      nativeSessionId: deliveryReceipt.nativeSessionId,
      runnerRequestId: deliveryReceipt.runnerRequestId,
      nativeContinuationEvidence: deliveryReceipt.nativeContinuationEvidence,
    })
    : {
      required: String(memorySnapshotSync?.action || "") === "none"
        && memorySnapshotSync?.continuation_baseline_required === true
        && memoryPromptInjectionVerification.promptBound !== true,
      valid: false,
      status: "missing_delivery_receipt",
      issues: ["delivery_receipt_missing"],
      evidenceChecksum: "",
    };
  const deliverySnapshotBound = !!deliveryReceipt
    && String(deliveryReceipt.memoryContextSnapshotId || "") === snapshotId
    && String(deliveryReceipt.memoryContextSnapshotChecksum || "") === String(loaded?.checksum || input.ref?.checksum || "")
    && String(deliveryReceipt.taskAgentSessionId || "") === sessionId;
  const deliveryGroupSessionBound = !deliveryReceipt || !groupSessionMemoryBinding?.scopeId
    || String(deliveryReceipt.groupSessionMemoryBinding?.scopeId || "") === String(groupSessionMemoryBinding.scopeId || "")
      && String(deliveryReceipt.groupSessionMemoryBinding?.checksum || "") === String(groupSessionMemoryBinding.checksum || "");
  const memoryContextDelivered = deliveryReceipt?.delivered === true
    && deliveryReceipt?.status === "delivered"
    && deliveryReceiptChecksumValid
    && deliverySnapshotBound
    && deliveryGroupSessionBound;
  const latestDeliveryAttemptReceiptFile = String(
    input.ref?.latestDeliveryAttemptReceiptPath
    || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.latestMemoryContextDeliveryAttemptReceiptPath : "")
    || ""
  ).trim();
  const latestDeliveryAttemptReceipt = latestDeliveryAttemptReceiptFile
    ? safeReadJson(latestDeliveryAttemptReceiptFile, null)
    : null;
  const latestDeliveryAttemptPresent = !!latestDeliveryAttemptReceiptFile;
  const latestDeliveryAttemptValid = !!latestDeliveryAttemptReceipt
    && verifyMemoryContextDeliveryReceiptChecksum(latestDeliveryAttemptReceipt)
    && String(latestDeliveryAttemptReceipt.receiptId || "") === String(input.ref?.latestDeliveryAttemptReceiptId || latestDeliveryAttemptReceipt.receiptId || "")
    && String(latestDeliveryAttemptReceipt.checksum || "") === String(input.ref?.latestDeliveryAttemptReceiptChecksum || latestDeliveryAttemptReceipt.checksum || "")
    && String(latestDeliveryAttemptReceipt.taskAgentSessionId || "") === sessionId
    && String(latestDeliveryAttemptReceipt.memoryContextSnapshotId || "") === snapshotId
    && String(latestDeliveryAttemptReceipt.memoryContextSnapshotChecksum || "") === String(loaded?.checksum || input.ref?.checksum || "");
  const memorySnapshotSyncCommitFile = String(
    input.ref?.memorySnapshotSyncCommitPath
    || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.memorySnapshotSyncCommitPath : "")
    || (sessionId && snapshotId ? getMemorySnapshotSyncCommitFile(sessionId, snapshotId) : "")
  ).trim();
  const memorySnapshotSyncCommitPresent = !!memorySnapshotSyncCommitFile && fs.existsSync(memorySnapshotSyncCommitFile);
  const memorySnapshotSyncCommit = memorySnapshotSyncCommitPresent
    ? safeReadJson(memorySnapshotSyncCommitFile, null)
    : null;
  const memorySnapshotSyncCommitVerification = memorySnapshotSyncCommitPresent
    ? verifyTaskAgentMemorySnapshotSyncCommit(memorySnapshotSyncCommit, {
      groupId: String(loadedSession.group_id || session?.groupId || ""),
      groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
      taskId: String(loadedSession.task_id || session?.taskId || ""),
      taskAgentSessionId: sessionId,
      targetProject: String(loadedSession.project || session?.project || ""),
      snapshotId,
      snapshotChecksum: String(loaded?.checksum || input.ref?.checksum || ""),
      syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
      syncAction: String(memorySnapshotSync?.action || ""),
      memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
      deliveryReceiptId: String(deliveryReceipt?.receiptId || ""),
      deliveryReceiptChecksum: String(deliveryReceipt?.checksum || ""),
    })
    : { valid: false, issues: ["sync_commit_missing"], committed: false, status: "pending" };
  const memorySnapshotSyncCommitRefBound = !input.ref?.memorySnapshotSyncCommitChecksum
    || String(input.ref.memorySnapshotSyncCommitChecksum) === String(memorySnapshotSyncCommit?.commit_checksum || "");
  const memorySnapshotSyncCommitValid = memorySnapshotSyncCommitPresent
    && memorySnapshotSyncCommitVerification.valid === true
    && memorySnapshotSyncCommitRefBound;
  const memorySnapshotSyncCommitted = memorySnapshotSyncCommitValid
    && memorySnapshotSyncCommitVerification.committed === true
    && memoryContextDelivered;
  const memorySnapshotSyncLateFailurePreserved = memorySnapshotSyncCommitted
    && latestDeliveryAttemptValid
    && String(latestDeliveryAttemptReceipt?.receiptId || "") !== String(deliveryReceipt?.receiptId || "")
    && latestDeliveryAttemptReceipt?.delivered !== true;
  const compactHeadFenceRequired = groupSessionMemoryBinding?.compactHeadFenceRequired === true;
  const compactHeadFenceValid = deliveryReceipt
    ? deliveryReceipt.compactHeadFenceValid === true
    : groupSessionMemoryBinding?.compactHeadFenceValid === true;
  const sessionLifecycleFenceRequired = String(groupSessionMemoryBinding?.groupSessionId || "").startsWith("gcs_");
  const sessionLifecycleValidation = sessionLifecycleFenceRequired
    ? validateGroupSessionLifecycleBinding({
      groupId: groupSessionMemoryBinding.groupId,
      groupSessionId: groupSessionMemoryBinding.groupSessionId,
      lifecycleStatus: groupSessionMemoryBinding.sessionLifecycleStatus,
      lifecycleGeneration: groupSessionMemoryBinding.sessionLifecycleGeneration,
      lifecycleHeadId: groupSessionMemoryBinding.sessionLifecycleHeadId,
      lifecycleHeadChecksum: groupSessionMemoryBinding.sessionLifecycleHeadChecksum,
    })
    : { valid: true, status: "exempt", issues: [] };
  const sessionLifecycleFenceValid = sessionLifecycleValidation.valid === true
    && (!deliveryReceipt || deliveryReceipt.sessionLifecycleFenceValid === true);
  const stale = ageDays !== null && ageDays >= input.policy.staleDays;
  const latestRank = input.latestRank ?? null;
  const latestForSession = latestRank === 0;
  const retentionExpired = ageDays !== null && ageDays >= input.policy.retentionDays;
  const prunable = fileExists
    && pathIsInsideMemorySnapshotDir(actualFile)
    && !latestForSession
    && (input.source === "orphan_file" || (latestRank !== null && latestRank >= input.policy.keepLatestPerSession && retentionExpired));
  const hardGaps: any[] = [];
  const warningGaps: any[] = [];
  if (!fileExists) hardGaps.push({ reason: "快照文件缺失" });
  if (fileExists && !loaded) hardGaps.push({ reason: "快照 JSON 无法读取" });
  if (loaded && !schemaOk) hardGaps.push({ reason: "快照 schema 不匹配" });
  if (loaded && !checksumMatches) hardGaps.push({ reason: "快照 checksum 不匹配" });
  if (input.source === "session_ref" && !sessionBound) hardGaps.push({ reason: "快照未绑定到实际 task Agent session" });
  if (loaded && !memoryContextPresent) hardGaps.push({ reason: "快照缺少可注入 memory_context" });
  if (loaded && !workerContextPacketId) hardGaps.push({ reason: "快照缺少 worker context packet id" });
  if (loaded && postTurnSummaryExpected && !postTurnSummaryCapsulePresent) hardGaps.push({ reason: "快照注入了逐轮摘要但缺少 delivery capsule" });
  if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleValid) hardGaps.push({ reason: `逐轮摘要 delivery capsule 无效：${(postTurnSummaryCapsule?.validation_issues || []).join(",") || "unknown"}` });
  if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsulePromptBound) hardGaps.push({ reason: "逐轮摘要 delivery capsule checksum 未绑定 rendered prompt" });
  if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleCompactEpochBound) hardGaps.push({ reason: "逐轮摘要 delivery capsule compact epoch 与快照记忆不一致" });
  if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleLedgerHeadBound) hardGaps.push({ reason: "逐轮摘要 delivery capsule ledger head 与快照记忆不一致" });
  if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleSelectionBound) hardGaps.push({ reason: "逐轮摘要 delivery capsule 选择集未完整绑定快照摘要" });
  if (loaded && invocationLineageExpected && !invocationLineageBound) hardGaps.push({ reason: "快照 invocation lineage 与摘要胶囊不一致" });
  if (loaded && invocationLineageExpected && !invocationLedgerBound) hardGaps.push({ reason: "快照 invocation edge 在 durable lineage ledger 中缺失或身份不一致" });
  if (loaded && finalDispatchPayloadGatePresent && !finalDispatchPayloadGateVerification.valid) hardGaps.push({ reason: `最终 prompt 容量 gate 无效：${finalDispatchPayloadGateVerification.issues.join(",") || "unknown"}` });
  if (loaded && providerContextUsageBaselinePresent && !providerContextUsageBaselineIntegrityVerification.valid) hardGaps.push({ reason: `Provider usage 下一轮基线无效：${providerContextUsageBaselineIntegrityVerification.issues.join(",") || "unknown"}` });
  if (loaded && providerContextUsageBaselineStale) warningGaps.push({ reason: `Provider usage 下一轮基线已过期：${providerContextUsageBaselineVerification.issues.join(",") || "identity_or_lineage_changed"}` });
  if (loaded && finalDispatchPayloadGatePresent && !finalDispatchPromptBound) hardGaps.push({ reason: "最终 prompt 容量 gate 未绑定快照 checksum/token/字符计量" });
  if (loaded && finalDispatchReactiveCompactPresent && (!finalDispatchReactiveCompactVerification.valid || !finalDispatchReactiveCompactBound)) hardGaps.push({ reason: `最终 prompt reactive compact receipt 无效：${finalDispatchReactiveCompactVerification.issues.join(",") || "gate_binding_mismatch"}` });
  if (loaded && finalDispatchReactiveCompactCircuitBreakerPresent && !finalDispatchReactiveCompactCircuitBreakerVerification.valid) hardGaps.push({ reason: `最终 prompt reactive compact 断路器无效：${finalDispatchReactiveCompactCircuitBreakerVerification.issues.join(",") || "unknown"}` });
  if (loaded && finalDispatchLineageProofRequired && !finalDispatchLineageProofValid) hardGaps.push({ reason: "最终 prompt 容量 gate 缺少 lineage 派发前验证证明" });
  if (loaded && memorySnapshotSyncPresent && !memorySnapshotSyncVerification.valid) hardGaps.push({ reason: `task Agent memory snapshot sync 无效：${memorySnapshotSyncVerification.issues.join(",") || "unknown"}` });
  if (loaded && memoryEntrySyncPresent && (!memoryEntrySyncVerification.valid || !memoryEntryManifestCurrent)) hardGaps.push({ reason: `task Agent memory entry sync 无效：${[...memoryEntrySyncVerification.issues, ...(!memoryEntryManifestCurrent ? ["current_manifest_stale"] : [])].join(",") || "unknown"}` });
  if (loaded && memoryPromptInjectionProofPresent && !memoryPromptInjectionVerification.valid) hardGaps.push({ reason: `task Agent memory prompt injection proof 无效：${memoryPromptInjectionVerification.issues.join(",") || "unknown"}` });
  if (loaded && memorySnapshotSyncPresent && memorySnapshotSyncCommitPresent && !memorySnapshotSyncCommitValid) hardGaps.push({ reason: `task Agent memory snapshot sync commit 无效：${[...memorySnapshotSyncCommitVerification.issues, ...(!memorySnapshotSyncCommitRefBound ? ["session_ref_checksum_mismatch"] : [])].join(",") || "unknown"}` });
  if (loaded && memorySnapshotSyncPresent && memorySnapshotSyncCommitValid && !memorySnapshotSyncCommitted) hardGaps.push({ reason: `task Agent memory snapshot sync commit 被拒绝：${memorySnapshotSyncCommit?.delivery_status || memorySnapshotSyncCommit?.status || "unknown"}` });
  if (deliveryReceipt && !deliveryReceiptChecksumValid) hardGaps.push({ reason: "runner memory delivery receipt checksum 不匹配" });
  if (deliveryReceipt && providerMemoryTransportUsagePresent && !providerMemoryTransportUsageVerification.valid) hardGaps.push({ reason: `Provider memory transport usage 无效：${providerMemoryTransportUsageVerification.issues.join(",") || "unknown"}` });
  if (deliveryReceipt && !deliverySnapshotBound) hardGaps.push({ reason: "runner memory delivery receipt 未绑定当前 task Agent snapshot/session" });
  if (deliveryReceipt && !deliveryGroupSessionBound) hardGaps.push({ reason: "runner memory delivery receipt 群聊会话 scope/checksum 不匹配" });
  if (deliveryReceipt && memoryContinuationBaselineVerification.required && !memoryContinuationBaselineVerification.valid) {
    hardGaps.push({ reason: `runner memory continuation baseline 未经原生续接证明：${memoryContinuationBaselineVerification.issues.join(",") || "unknown"}` });
  }
  if (deliveryReceipt && compactHeadFenceRequired && !compactHeadFenceValid) hardGaps.push({ reason: `runner compact head 已过期：${(deliveryReceipt.compactHeadFenceIssues || []).join(",") || deliveryReceipt.compactHeadFenceStatus || "stale"}` });
  if (sessionLifecycleFenceRequired && !sessionLifecycleFenceValid) hardGaps.push({ reason: `群聊会话生命周期已变化：${(sessionLifecycleValidation.issues || []).join(",") || sessionLifecycleValidation.status || "stale"}` });
  if (deliveryReceipt && deliveryReceipt.delivered !== true) hardGaps.push({ reason: `runner memory delivery 失败：${deliveryReceipt.promptBindingMode || deliveryReceipt.status || "unknown"}` });
  if (latestDeliveryAttemptPresent && !latestDeliveryAttemptValid) hardGaps.push({ reason: "最新 runner memory delivery attempt 证据无效" });
  if (input.source === "session_ref" && !deliveryReceipt) warningGaps.push({ reason: "快照尚无 runner memory delivery receipt" });
  if (deliveryReceipt && !providerMemoryTransportUsagePresent) warningGaps.push({ reason: "runner memory delivery receipt 缺少 Provider transport usage（旧回执兼容）" });
  if (loaded && !memoryPromptInjectionProofPresent) warningGaps.push({ reason: "快照缺少 memory prompt injection proof（旧快照兼容）" });
  if (loaded && !memoryEntrySyncPresent) warningGaps.push({ reason: "快照缺少 per-entry memory sync manifest（旧快照兼容）" });
  if (loaded && memoryPromptInjectionProofPresent && memoryPromptInjectionVerification.injectionRequired && !memoryPromptInjectionVerification.projectionPresent) warningGaps.push({ reason: "memory injection projection 未提供，无法证明最终 prompt 包含群聊记忆" });
  if (loaded && memorySnapshotSyncPresent && !memorySnapshotSyncCommitPresent) warningGaps.push({ reason: "task Agent memory snapshot sync 已准备，等待 delivery commit" });
  if (memorySnapshotSyncLateFailurePreserved) warningGaps.push({ reason: `已保留成功记忆基线；后续 Provider 重试失败：${latestDeliveryAttemptReceipt?.status || "unknown"}` });
  if (loaded && !gateIds.length) warningGaps.push({ reason: "快照未捕获 memory gate ids" });
  if (loaded && !finalDispatchPayloadGatePresent) warningGaps.push({ reason: "快照缺少最终 Provider prompt 容量 gate（旧快照兼容）" });
  if (loaded && finalDispatchStatus === "recompact_required") warningGaps.push({ reason: "最终 Provider prompt 已被容量 gate 拦截，必须重建或重新压缩" });
  if (input.source === "orphan_file") warningGaps.push({ reason: "快照文件未被 task-agent-sessions 索引引用" });
  if (stale) warningGaps.push({ reason: `快照超过 ${input.policy.staleDays} 天未刷新` });
  const gaps = [...hardGaps, ...warningGaps];
  const status = hardGaps.length ? "fail" : warningGaps.length ? "warn" : "ok";
  return {
    schema: "ccm-task-agent-memory-context-snapshot-inventory-row-v1",
    source: input.source,
    status,
    snapshotId,
    snapshotFile: actualFile,
    declaredSnapshotFile: String(loaded?.snapshot_file || "").trim(),
    checksum: String(loaded?.checksum || input.ref?.checksum || "").trim(),
    checksumMatches,
    generatedAt,
    ageDays,
    stale,
    prunable,
    latestForSession,
    latestRank,
    sessionId,
    expectedSessionId,
    taskId: String(loadedSession.task_id || session?.taskId || "").trim(),
    scopeId: String(loadedSession.scope_id || session?.scopeId || "").trim(),
    groupId: String(loadedSession.group_id || session?.groupId || "").trim(),
    project: String(loadedSession.project || session?.project || "").trim(),
    agentType: String(loadedSession.agent_type || session?.agentType || "").trim(),
    nativeSessionId: String(loadedSession.native_session_id || session?.nativeSessionId || "").trim(),
    resumeMode: String(loadedSession.resume_mode || session?.resumeMode || "").trim(),
    workerContextPacketId,
    workerHandoffId: String(context.worker_handoff_id || input.ref?.workerHandoffId || "").trim(),
    gateIds,
    gateCount: gateIds.length,
    fileExists,
    readable: !!loaded,
    schemaOk,
    sessionBound,
    memoryContextPresent,
    groupSessionMemoryBinding,
    groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || finalDispatchPayloadGate?.group_session_id || capacityRevalidationGroupSessionId(context.worker_context_packet || {}) || ""),
    groupSessionScopeId: String(groupSessionMemoryBinding?.scopeId || (finalDispatchPayloadGate?.group_session_id ? `${String(loadedSession.group_id || session?.groupId || "")}::${String(finalDispatchPayloadGate.group_session_id)}` : "")),
    sessionMemoryChecksum: String(groupSessionMemoryBinding?.sessionMemoryChecksum || ""),
    sessionMemoryHasSummary: groupSessionMemoryBinding?.sessionMemoryHasSummary === true,
    memorySnapshotSyncPresent,
    memorySnapshotSyncValid: memorySnapshotSyncPresent && memorySnapshotSyncVerification.valid === true,
    memorySnapshotSyncAction: String(memorySnapshotSync?.action || "legacy"),
    memorySnapshotSyncReason: String(memorySnapshotSync?.reason || "legacy_snapshot"),
    memorySnapshotSyncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
    memorySnapshotSyncPreviousSnapshotId: String(memorySnapshotSync?.previous_snapshot_id || ""),
    memorySnapshotSyncPreviousTrusted: memorySnapshotSync?.previous_snapshot_trusted === true,
    memorySnapshotSyncMemoryInjectionRequired: memorySnapshotSync?.memory_injection_required === true,
    memorySnapshotSyncIssues: memorySnapshotSyncVerification.issues,
    memoryEntrySyncPresent,
    memoryEntrySyncValid: memoryEntrySyncPresent && memoryEntrySyncVerification.valid === true && memoryEntryManifestCurrent,
    memoryEntrySyncMode: String(memoryEntrySync?.transport_mode || "legacy"),
    memoryEntrySyncPlanChecksum: String(memoryEntrySync?.plan_checksum || ""),
    memoryEntryManifestChecksum: String(memoryEntryManifest?.manifest_checksum || ""),
    memoryEntryPreviousManifestChecksum: String(memoryEntrySync?.previous_manifest_checksum || ""),
    memoryEntryChangedCount: Number(memoryEntrySync?.changed_entry_count || 0),
    memoryEntryRemovedCount: Number(memoryEntrySync?.removed_entry_count || 0),
    memoryEntryRenderLeaseId: String(memoryEntrySync?.render_lease_id || ""),
    memoryEntryRenderFencingToken: Number(memoryEntrySync?.render_fencing_token || 0),
    memoryEntryRenderLeaseOwnerPid: Number(memoryEntrySync?.render_lease_owner_pid || 0),
    memoryEntryRenderLeaseAcquiredAt: String(memoryEntrySync?.render_lease_acquired_at || ""),
    memoryEntryRenderLeaseExpiresAt: String(memoryEntrySync?.render_lease_expires_at || ""),
    memoryEntryRecoveredStaleLeaseId: String(memoryEntrySync?.recovered_stale_lease_id || ""),
    memoryEntrySyncIssues: [...memoryEntrySyncVerification.issues, ...(!memoryEntryManifestCurrent && memoryEntrySyncPresent ? ["current_manifest_stale"] : [])],
    memoryPromptInjectionProofPresent,
    memoryPromptInjectionProofValid: memoryPromptInjectionProofPresent && memoryPromptInjectionVerification.valid === true,
    memoryPromptInjectionProofStatus: String(memoryPromptInjectionProof?.status || "legacy"),
    memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
    memoryPromptInjectionEnforced: memoryPromptInjectionProof?.enforcement_required === true,
    memoryPromptInjectionRequired: memoryPromptInjectionProof?.memory_injection_required === true,
    memoryPromptInjectionProjectionPresent: memoryPromptInjectionVerification.projectionPresent === true,
    memoryPromptInjectionPromptBound: memoryPromptInjectionVerification.promptBound === true,
    memoryPromptInjectionDeliveryReady: memoryPromptInjectionVerification.deliveryReady === true,
    memoryPromptInjectionIssues: memoryPromptInjectionVerification.issues,
    memoryTrustedEnvelopeRequired: memoryPromptInjectionVerification.trustedEnvelopeRequired === true,
    memoryTrustedEnvelopePresent: memoryPromptInjectionVerification.trustedEnvelopePresent === true,
    memoryTrustedEnvelopeValid: memoryPromptInjectionVerification.trustedEnvelopeValid === true,
    memoryTrustedEnvelopeBound: memoryPromptInjectionVerification.trustedEnvelopeBound === true,
    memoryTrustedEnvelopeChecksum: String(memoryPromptInjectionProof?.trusted_envelope_checksum || ""),
    memoryTrustedEnvelopeSourceChecksum: String(memoryPromptInjectionProof?.trusted_envelope_source_checksum || ""),
    memoryTrustedEnvelopeIssues: Array.isArray(memoryPromptInjectionProof?.trusted_envelope_issues) ? memoryPromptInjectionProof.trusted_envelope_issues : [],
    memoryContinuationBaselineRequired: memoryContinuationBaselineVerification.required === true,
    memoryContinuationBaselineValid: memoryContinuationBaselineVerification.valid === true,
    memoryContinuationBaselineStatus: String(memoryContinuationBaselineVerification.status || ""),
    memoryContinuationBaselineIssues: memoryContinuationBaselineVerification.issues,
    memoryContinuationEvidenceChecksum: String(memoryContinuationBaselineVerification.evidenceChecksum || ""),
    providerMemoryChannelRequired: deliveryReceipt?.providerMemoryChannelRequired === true,
    providerMemoryChannelAcknowledgementRequired: deliveryReceipt?.providerMemoryChannelAcknowledgementRequired === true,
    providerMemoryChannelAcknowledged: deliveryReceipt?.providerMemoryChannelAcknowledged === true,
    providerMemoryChannelAcknowledgementStatus: String(deliveryReceipt?.providerMemoryChannelAcknowledgementStatus || ""),
    providerMemoryChannelAcknowledgementPolicy: String(deliveryReceipt?.providerMemoryChannelAcknowledgementPolicy || ""),
    providerMemoryChannelValid: deliveryReceipt?.providerMemoryChannelValid === true,
    providerMemoryChannelStatus: String(deliveryReceipt?.providerMemoryChannelStatus || ""),
    providerMemoryChannel: String(deliveryReceipt?.providerMemoryChannel || "none"),
    providerMemoryAuthorityRole: String(deliveryReceipt?.providerMemoryAuthorityRole || "none"),
    providerMemoryNativeSystemPrompt: deliveryReceipt?.providerMemoryNativeSystemPrompt === true,
    providerMemoryNativeDeveloperInstructions: deliveryReceipt?.providerMemoryNativeDeveloperInstructions === true,
    providerMemoryUserPromptFallback: deliveryReceipt?.providerMemoryUserPromptFallback === true,
    providerMemoryChannelEvidenceChecksum: String(deliveryReceipt?.providerMemoryChannelEvidenceChecksum || ""),
    providerMemoryChannelIssues: Array.isArray(deliveryReceipt?.providerMemoryChannelIssues) ? deliveryReceipt.providerMemoryChannelIssues : [],
    memoryContextConsumptionReceiptRequired: deliveryReceipt?.memoryContextConsumptionReceiptRequired === true,
    memoryContextConsumptionReceiptValid: deliveryReceipt?.memoryContextConsumptionReceiptValid === true,
    memoryContextConsumptionReceiptStatus: String(deliveryReceipt?.memoryContextConsumptionReceiptStatus || ""),
    memoryContextConsumptionChallengeId: String(deliveryReceipt?.memoryContextConsumptionChallengeId || loaded?.context?.memory_context_consumption_challenge?.challenge_id || ""),
    memoryContextConsumptionReceiptSignature: String(deliveryReceipt?.memoryContextConsumptionReceiptSignature || ""),
    memoryContextConsumptionReceiptIssues: Array.isArray(deliveryReceipt?.memoryContextConsumptionReceiptIssues) ? deliveryReceipt.memoryContextConsumptionReceiptIssues : [],
    memoryContextConsumptionRecoveryPresent: deliveryReceipt?.memoryContextConsumptionRecoveryPresent === true,
    memoryContextConsumptionRecoveryValid: deliveryReceipt?.memoryContextConsumptionRecoveryValid === true,
    memoryContextConsumptionRecoveryStatus: String(deliveryReceipt?.memoryContextConsumptionRecoveryStatus || "not_needed"),
    memoryContextConsumptionRecoveryId: String(deliveryReceipt?.memoryContextConsumptionRecoveryId || ""),
    memoryContextConsumptionRecoveryIssues: Array.isArray(deliveryReceipt?.memoryContextConsumptionRecoveryIssues) ? deliveryReceipt.memoryContextConsumptionRecoveryIssues : [],
    providerMemoryTransportUsagePresent,
    providerMemoryTransportUsageReceipt: providerMemoryTransportUsage,
    providerMemoryTransportUsageValid: providerMemoryTransportUsagePresent && providerMemoryTransportUsageVerification.valid === true,
    providerMemoryTransportUsageStatus: String(providerMemoryTransportUsage?.status || "missing"),
    providerMemoryTransportUsageReported: providerMemoryTransportUsage?.reported === true,
    providerMemoryTransportUsageChecksum: String(providerMemoryTransportUsage?.usage_checksum || ""),
    providerMemoryTransportUsageIssues: providerMemoryTransportUsageVerification.issues,
    providerMemoryTransportInputTokens: Number(providerMemoryTransportUsage?.input_tokens || 0),
    providerMemoryTransportDirectInputTokens: Number(providerMemoryTransportUsage?.direct_input_tokens || 0),
    providerMemoryTransportOutputTokens: Number(providerMemoryTransportUsage?.output_tokens || 0),
    providerMemoryTransportCacheReadTokens: Number(providerMemoryTransportUsage?.cache_read_input_tokens || 0),
    providerMemoryTransportCacheCreationTokens: Number(providerMemoryTransportUsage?.cache_creation_input_tokens || 0),
    providerMemoryTransportCacheReadIncludedInInput: providerMemoryTransportUsage?.cache_read_included_in_input === true,
    providerMemoryTransportProviderTotalTokens: Number(providerMemoryTransportUsage?.provider_total_tokens || 0),
    providerMemoryTransportAccountedTotalTokens: Number(providerMemoryTransportUsage?.accounted_total_tokens || 0),
    providerMemoryTransportCacheHitRatio: providerMemoryTransportUsage?.cache_hit_ratio ?? null,
    providerMemoryTransportEstimatedTokens: Number(providerMemoryTransportUsage?.memory_transport_estimated_tokens || 0),
    providerMemoryTransportFinalPromptEstimatedTokens: Number(providerMemoryTransportUsage?.final_prompt_estimated_tokens || 0),
    providerMemoryTransportMode: String(providerMemoryTransportUsage?.transport_mode || memoryEntrySync?.transport_mode || "legacy"),
    providerMemoryTransportProvider: String(providerMemoryTransportUsage?.provider || deliveryReceipt?.runtime || ""),
    providerMemoryTransportModel: String(providerMemoryTransportUsage?.model || ""),
    providerMemoryTransportRuntimeVersion: String(providerMemoryTransportUsage?.provider_runtime_version || ""),
    providerMemoryTransportRuntimeIdentityChecksum: String(providerMemoryTransportUsage?.provider_runtime_identity_checksum || ""),
    providerMemoryTransportContractId: String(providerMemoryTransportUsage?.provider_contract_id || ""),
    providerMemoryTransportUsageProvenance: providerMemoryTransportUsage?.usage_provenance || null,
    providerMemoryTransportTaskFamilyKey: String(providerMemoryTransportUsage?.task_family_key || ""),
    providerMemoryTransportFinalPromptSizeBucket: String(providerMemoryTransportUsage?.final_prompt_size_bucket || "missing"),
    providerMemoryTransportObservedAt: String(providerMemoryTransportUsage?.observed_at || ""),
    memorySnapshotSyncCommitPath: memorySnapshotSyncCommitFile,
    memorySnapshotSyncCommitPresent,
    memorySnapshotSyncCommitValid,
    memorySnapshotSyncCommitted,
    memorySnapshotSyncCommitStatus: String(memorySnapshotSyncCommit?.status || (memorySnapshotSyncCommitPresent ? "invalid" : "pending")),
    memorySnapshotSyncCommitChecksum: String(memorySnapshotSyncCommit?.commit_checksum || ""),
    memorySnapshotSyncCommitIssues: [
      ...memorySnapshotSyncCommitVerification.issues,
      ...(!memorySnapshotSyncCommitRefBound ? ["session_ref_checksum_mismatch"] : []),
    ],
    latestDeliveryAttemptReceiptId: String(latestDeliveryAttemptReceipt?.receiptId || input.ref?.latestDeliveryAttemptReceiptId || ""),
    latestDeliveryAttemptReceiptFile,
    latestDeliveryAttemptStatus: String(latestDeliveryAttemptReceipt?.status || input.ref?.latestDeliveryAttemptStatus || ""),
    latestDeliveryAttemptAt: String(latestDeliveryAttemptReceipt?.deliveredAt || input.ref?.latestDeliveryAttemptAt || ""),
    latestDeliveryAttemptPresent,
    latestDeliveryAttemptValid,
    memorySnapshotSyncLateFailurePreserved,
    postTurnSummaryExpected,
    postTurnSummaryCapsulePresent,
    postTurnSummaryCapsuleValid,
    postTurnSummaryCapsulePromptBound,
    postTurnSummaryCapsuleChecksum: String(postTurnSummaryCapsule?.capsule_checksum || ""),
    postTurnSummaryCapsuleSessionBound: postTurnSummaryCapsule?.binding_valid === true,
    postTurnSummaryCapsuleCompactEpoch: String(postTurnSummaryCapsule?.compact_epoch || ""),
    postTurnSummaryCapsuleCompactEpochBound,
    postTurnSummaryCapsuleLedgerHeadChecksum: String(postTurnSummaryCapsule?.ledger_head_checksum || ""),
    postTurnSummaryCapsuleLedgerHeadBound,
    postTurnSummaryCapsuleSelectionBound,
    postTurnSummaryCapsuleSelectedCount: Number(postTurnSummaryCapsule?.selected_count || 0),
    invocationLineageExpected,
    invocationLineageBound,
    invocationLedgerBound,
    invocationEdgeId,
    invocationParentEdgeId: String(invocationLineage?.parent_invocation_edge_id || ""),
    invocationRootEdgeId: String(invocationLineage?.root_invocation_edge_id || ""),
    invocationBranchId: String(invocationLineage?.branch_id || ""),
    invocationBranchKind: String(invocationLineage?.branch_kind || ""),
    invocationEdgeStatus: String(invocationEdge?.status || ""),
    finalDispatchPayloadGatePresent,
    finalDispatchPayloadGateValid: finalDispatchPayloadGateVerification.valid === true && finalDispatchPromptBound,
    finalDispatchPayloadGateIssues: finalDispatchPayloadGateVerification.issues,
    finalDispatchPayloadGateId: String(finalDispatchPayloadGate?.gate_id || ""),
    finalDispatchPayloadGateChecksum: String(finalDispatchPayloadGate?.gate_checksum || ""),
    finalDispatchStatus,
    finalDispatchProvider: String(finalDispatchPayloadGate?.provider || ""),
    finalDispatchModel: String(finalDispatchPayloadGate?.model || ""),
    finalDispatchModelContextWindow: Number(finalDispatchPayloadGate?.model_context_window || 0),
    finalDispatchReservedOutputTokens: Number(finalDispatchPayloadGate?.reserved_output_tokens || 0),
    finalDispatchEffectiveContextWindow: Number(finalDispatchPayloadGate?.effective_context_window || 0),
    finalDispatchAutoCompactBufferTokens: Number(finalDispatchPayloadGate?.auto_compact_buffer_tokens || 0),
    finalDispatchEstimatedPromptTokens: Number(finalDispatchPayloadGate?.estimated_prompt_tokens || 0),
    finalDispatchProviderEnvelopeTokens: Number(finalDispatchPayloadGate?.provider_envelope_tokens || 0),
    finalDispatchPromptTokens: Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0),
    finalDispatchModelVisibleInputTokens: Number(finalDispatchPayloadGate?.model_visible_input_tokens || finalDispatchPayloadGate?.estimated_total_input_tokens || 0),
    finalDispatchTokenBasis: String(finalDispatchPayloadGate?.token_basis || "estimated_final_prompt"),
    finalDispatchProviderUsageBaselineStatus: String(finalDispatchPayloadGate?.provider_usage_baseline_status || "estimated"),
    finalDispatchProviderUsageBaselineBiasTokens: Number(finalDispatchPayloadGate?.provider_usage_baseline_bias_tokens || 0),
    finalDispatchProviderUsageBaselineChecksum: String(finalDispatchPayloadGate?.provider_usage_baseline?.baseline_checksum || ""),
    providerContextUsageBaselinePresent,
    providerContextUsageBaselineValid: providerContextUsageBaselinePresent && providerContextUsageBaselineVerification.valid === true,
    providerContextUsageBaselineStatus: providerContextUsageBaselinePresent
      ? providerContextUsageBaselineVerification.valid
        ? "provider_observed"
        : providerContextUsageBaselineStaleAfterCompact
          ? "stale_after_compact"
          : providerContextUsageBaselineStale ? "stale_identity" : "invalid"
      : "estimated",
    providerContextUsageBaselineBiasTokens: providerContextUsageBaselineVerification.valid ? Number(providerContextUsageBaseline?.positive_drift_tokens || 0) : 0,
    providerContextUsageBaselineChecksum: String(providerContextUsageBaseline?.baseline_checksum || ""),
    finalDispatchPromptChars: Number(finalDispatchPayloadGate?.prompt_chars || 0),
    finalDispatchAutoCompactThreshold: Number(finalDispatchPayloadGate?.auto_compact_threshold || 0),
    finalDispatchRemainingTokens: Number(finalDispatchPayloadGate?.remaining_tokens_before_auto_compact || 0),
    finalDispatchPromptChecksum: String(finalDispatchPayloadGate?.prompt_checksum || ""),
    finalDispatchCapacitySource: String(finalDispatchPayloadGate?.capacity_source || ""),
    finalDispatchCapacityEvidenceChecksum: String(finalDispatchPayloadGate?.capacity_evidence_checksum || ""),
    finalDispatchCheckedAt: String(finalDispatchPayloadGate?.checked_at || context.final_dispatch_gate_attached_at || ""),
    finalDispatchPromptBound,
    finalDispatchProviderCallAllowed: finalDispatchPayloadGate?.provider_call_allowed === true,
    finalDispatchReactiveCompactPresent,
    finalDispatchReactiveCompactValid: finalDispatchReactiveCompactVerification.valid === true && finalDispatchReactiveCompactBound,
    finalDispatchReactiveCompactStatus: String(finalDispatchReactiveCompact?.status || ""),
    finalDispatchReactiveCompactReceiptId: String(finalDispatchReactiveCompact?.receipt_id || ""),
    finalDispatchReactiveCompactOriginalTokens: Number(finalDispatchReactiveCompact?.original_prompt_tokens || 0),
    finalDispatchReactiveCompactRecoveredTokens: Number(finalDispatchReactiveCompact?.recovered_prompt_tokens || 0),
    finalDispatchReactiveCompactContextBudgetTokens: Number(finalDispatchReactiveCompact?.recent_context_budget_tokens || 0),
    finalDispatchReactiveCompactOmittedLines: Number(finalDispatchReactiveCompact?.omitted_context_lines || 0),
    finalDispatchRecoveryStages: Array.isArray(finalDispatchReactiveCompact?.recovery_stages) ? finalDispatchReactiveCompact.recovery_stages.slice(0, 8) : [],
    finalDispatchContextCollapsePresent: finalDispatchContextCollapse?.schema === "ccm-final-dispatch-context-collapse-receipt-v1",
    finalDispatchContextCollapseMode: String(finalDispatchContextCollapse?.mode || ""),
    finalDispatchContextCollapseEntryId: String(finalDispatchContextCollapse?.entry_id || ""),
    finalDispatchContextCollapseLifecycleGeneration: Number(finalDispatchContextCollapse?.lifecycle_generation || 0),
    finalDispatchContextCollapseOriginalTokens: Number(finalDispatchContextCollapse?.original_tokens || 0),
    finalDispatchContextCollapseProjectedTokens: Number(finalDispatchContextCollapse?.projected_tokens || 0),
    finalDispatchReactiveCompactBound,
    finalDispatchReactiveCompactCircuitBreakerPresent,
    finalDispatchReactiveCompactCircuitBreakerValid: finalDispatchReactiveCompactCircuitBreakerVerification.valid === true,
    finalDispatchReactiveCompactCircuitState: String(finalDispatchReactiveCompactCircuitBreaker?.state || ""),
    finalDispatchReactiveCompactCircuitBlocked: finalDispatchReactiveCompactCircuitBreaker?.state === "open",
    finalDispatchReactiveCompactCircuitFailures: Number(finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0),
    finalDispatchReactiveCompactCircuitRevision: Number(finalDispatchReactiveCompactCircuitBreaker?.revision || 0),
    finalDispatchReactiveCompactCircuitChecksum: String(finalDispatchReactiveCompactCircuitBreaker?.state_checksum || ""),
    finalDispatchLineageProofRequired,
    finalDispatchLineageProofValid,
    postTurnSummaryCapsuleInvocationKind: String(postTurnSummaryCapsule?.invocation_kind || ""),
    deliveryReceiptId: String(deliveryReceipt?.receiptId || input.ref?.deliveryReceiptId || ""),
    deliveryReceiptFile,
    deliveryReceiptChecksumValid,
    deliverySnapshotBound,
    deliveryGroupSessionBound,
    memoryContextDelivered,
    deliveryStatus: String(deliveryReceipt?.status || input.ref?.deliveryStatus || "missing"),
    deliveryPromptBindingMode: String(deliveryReceipt?.promptBindingMode || ""),
    compactHeadFenceRequired,
    compactHeadFenceValid,
    compactHeadGeneration: Number(deliveryReceipt?.compactHeadGeneration || groupSessionMemoryBinding?.compactHeadGeneration || 0),
    compactHeadFenceStatus: String(deliveryReceipt?.compactHeadFenceStatus || groupSessionMemoryBinding?.compactHeadFenceStatus || ""),
    sessionLifecycleFenceRequired,
    sessionLifecycleFenceValid,
    sessionLifecycleGeneration: Number(deliveryReceipt?.sessionLifecycleGeneration || groupSessionMemoryBinding?.sessionLifecycleGeneration || 0),
    sessionLifecycleFenceStatus: String(deliveryReceipt?.sessionLifecycleFenceStatus || sessionLifecycleValidation.status || ""),
    sessionLifecycleStatus: String(deliveryReceipt?.sessionLifecycleStatus || groupSessionMemoryBinding?.sessionLifecycleStatus || ""),
    deliveredAt: String(deliveryReceipt?.deliveredAt || input.ref?.deliveredAt || ""),
    renderedPromptChecksum: String(context.rendered_prompt_checksum || "").trim(),
    gaps,
  };
}
