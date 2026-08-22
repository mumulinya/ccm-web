import * as crypto from "crypto";
import { buildUnifiedRecoveryContext, type UnifiedCompactionScope } from "./unified-session-compaction";
import type { CcmUnifiedSessionSummaryV1, UnifiedCompactionSnapshot } from "./unified-session-compaction-types";

function checksum(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function buildUnifiedRecoveryAttachment(input: {
  snapshot: UnifiedCompactionSnapshot;
  summary: CcmUnifiedSessionSummaryV1;
}) {
  const snapshot = input.snapshot;
  const taskBindings = [
    ...(Array.isArray(snapshot.recoveryContext?.taskBindings) ? snapshot.recoveryContext.taskBindings : []),
    ...(Array.isArray(snapshot.recoveryContext?.tasks) ? snapshot.recoveryContext.tasks : []),
  ];
  const planBindings = Array.isArray(snapshot.recoveryContext?.planBindings) ? snapshot.recoveryContext.planBindings : [];
  const base = buildUnifiedRecoveryContext({
    scope: snapshot.scope,
    exactSessionId: snapshot.exactSessionId,
    taskBindings,
    planBindings,
    fileReferences: input.summary.fileReferences,
    verificationEvidence: input.summary.verificationEvidence,
    pendingActions: [...input.summary.pendingWork, ...input.summary.nextActions],
    permissionBoundary: String(snapshot.recoveryContext?.permissionBoundary || `${snapshot.scope}:${snapshot.exactSessionId}`),
  });
  const taskTimeline = snapshot.taskTimeline ? {
    currentTaskId: String(snapshot.taskTimeline.currentTaskId || ""),
    spanChecksum: String(snapshot.taskTimeline.span?.checksum || ""),
    startSequence: Number(snapshot.taskTimeline.span?.startSequence || 0),
    endSequence: snapshot.taskTimeline.span?.endSequence == null ? undefined : Number(snapshot.taskTimeline.span.endSequence),
    latestCheckpointSequence: Number(snapshot.taskTimeline.latestCheckpointSequence || snapshot.taskTimeline.span?.latestSequence || 0),
    priorTaskCount: Array.isArray(snapshot.taskTimeline.priorTaskSummaries) ? snapshot.taskTimeline.priorTaskSummaries.length : 0,
    contentStored: false,
  } : null;
  return {
    schema: "ccm-unified-recovery-attachment-v1",
    scope: snapshot.scope,
    exactSessionId: snapshot.exactSessionId,
    unifiedRecoveryContext: base,
    taskTimeline,
    provider: snapshot.providerUsage ? {
      provider: String(snapshot.providerUsage?.provider || ""),
      model: String(snapshot.providerUsage?.model || ""),
      checksum: checksum({ provider: snapshot.providerUsage?.provider, model: snapshot.providerUsage?.model }),
    } : null,
    skills: Array.isArray(snapshot.contextComponents?.skills) ? snapshot.contextComponents.skills.map((item: any) => ({ name: String(item?.name || item), checksum: String(item?.checksum || "") })).slice(-64) : [],
    mcp: Array.isArray(snapshot.contextComponents?.mcp) ? snapshot.contextComponents.mcp.map((item: any) => ({ name: String(item?.name || item), checksum: String(item?.checksum || "") })).slice(-64) : [],
    attachmentReferences: input.summary.attachmentReferences.slice(-64),
    contentStored: false,
    checksum: checksum({ base, taskTimeline, provider: snapshot.providerUsage, skills: snapshot.contextComponents?.skills, mcp: snapshot.contextComponents?.mcp, attachments: input.summary.attachmentReferences }),
  };
}

export function verifyUnifiedRecoveryAttachment(value: any, expected: { scope?: UnifiedCompactionScope; exactSessionId?: string } = {}) {
  const issues = [
    value?.schema !== "ccm-unified-recovery-attachment-v1" ? "schema_invalid" : "",
    expected.scope && value?.scope !== expected.scope ? "scope_mismatch" : "",
    expected.exactSessionId && value?.exactSessionId !== expected.exactSessionId ? "session_mismatch" : "",
    value?.contentStored !== false ? "content_storage_forbidden" : "",
    value?.unifiedRecoveryContext?.contentStored !== false ? "nested_content_storage_forbidden" : "",
  ].filter(Boolean);
  return { valid: issues.length === 0, issues };
}
