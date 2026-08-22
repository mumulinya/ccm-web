import * as crypto from "crypto";
import { getTaskById } from "../core/db";
import { persistTaskMutationWithTimelineAtomically, type CcmTaskTimelineCursorV1, type CcmTaskTimelineSpanV1 } from "./session-task-timeline";

export type CcmTaskScope = "global" | "group" | "project" | "feishu";

export type CcmTaskSessionBindingV1 = {
  schema: "ccm-task-session-binding-v1";
  taskId: string;
  attempt: number;
  role: "source" | "active_execution" | "recovery";
  scope: CcmTaskScope;
  scopeId: string;
  exactSessionId: string;
  originalSessionId?: string;
  createdForRecovery: boolean;
  status: "active" | "released" | "deleted" | "unavailable";
  reason?: "original_reused" | "original_missing" | "original_archived" | "session_busy" | "permission_changed";
  taskContextRevision: number;
  bindingChecksum: string;
  createdAt: string;
  releasedAt?: string;
  contentStored: false;
};

export type CcmTaskContextCapsuleV1 = {
  schema: "ccm-task-context-capsule-v1";
  taskId: string;
  scope: CcmTaskScope;
  scopeId: string;
  sourceSession: {
    exactSessionId: string;
    triggerMessageId: string;
    sourceMessageIds: string[];
    sourceAttachmentRefs: string[];
    boundarySequence: number;
    transcriptChecksum: string;
  };
  intent: {
    goal: string;
    corrections: string[];
    decisions: string[];
    acceptanceCriteria: string[];
    exclusions: string[];
  };
  authorization: {
    projects: string[];
    allowedPaths: string[];
    forbiddenPaths: string[];
    permissionSnapshotChecksum: string;
  };
  plan?: { planId: string; revision: number; checksum: string };
  dispatchContract?: { contractId: string; checksum: string };
  workItems: Array<{
    workItemId: string;
    stepId?: string;
    project: string;
    files: string[];
    status: string;
    latestAttempt: number;
    completed: boolean;
    agentSessionIds: string[];
  }>;
  fileEvidence: Array<{
    evidenceId: string;
    project: string;
    path: string;
    checksum: string;
    readRanges: Array<{ start: number; end: number }>;
    purpose: string;
    workItemIds: string[];
    contentStored: false;
  }>;
  workspace: { manifestChecksum: string; worktreeBindings: unknown[] };
  completedWork: string[];
  pendingWork: string[];
  fileChangeEvidenceIds: string[];
  verificationEvidenceIds: string[];
  unresolvedToolCallIds: string[];
  blockers: string[];
  timelineSpans: CcmTaskTimelineSpanV1[];
  activeSpanId?: string;
  appliedCursors: CcmTaskTimelineCursorV1[];
  startMarkerId?: string;
  endMarkerId?: string;
  startSequence?: number;
  endSequence?: number;
  latestCheckpointSequence: number;
  taskContextSource: "session_timeline";
  sessionBindings: CcmTaskSessionBindingV1[];
  generation: number;
  latestAttempt: number;
  revision: number;
  checksum: string;
  status: "ready" | "incomplete" | "drifted" | "locked";
  updatedAt: string;
  contentStored: false;
};

function text(value: unknown, max = 1000) { return String(value ?? "").trim().slice(0, max); }
function uniq(value: unknown, max = 100) { return [...new Set((Array.isArray(value) ? value : []).map(item => text(item, 500)).filter(Boolean))].slice(0, max); }
function digest(value: unknown) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function scopeForTask(task: any): CcmTaskScope {
  const channel = text(task?.source_channel || task?.request_origin || task?.workflow_meta?.intake?.source, 40).toLowerCase();
  if (channel.includes("feishu")) return "feishu";
  if (text(task?.group_id)) return "group";
  if (text(task?.target_project || task?.project_session_id)) return "project";
  return "global";
}
function scopeIdForTask(task: any, scope: CcmTaskScope) {
  if (scope === "group") return text(task?.group_id);
  if (scope === "project") return text(task?.target_project);
  if (scope === "feishu") return text(task?.target_id || task?.source_conversation_ref?.scopeId || "global");
  return "global";
}
function sourceSessionId(task: any) {
  return text(task?.exact_session_id || task?.group_session_id || task?.project_session_id || task?.origin_session_id || task?.source_conversation_ref?.exactSessionId);
}

export function taskTimelineIdentity(task: any) {
  const scope = scopeForTask(task);
  const active = text(task?.active_execution_session_id || task?.execution_session_id || task?.recovery_user_session?.activeSessionId);
  return { scope, scopeId: scopeIdForTask(task, scope), exactSessionId: active || sourceSessionId(task) };
}
function stringList(value: unknown) {
  if (Array.isArray(value)) return uniq(value);
  const s = text(value, 2000);
  return s ? [s] : [];
}
function arrayValue(value: unknown) { return Array.isArray(value) ? value : []; }
function latestKnownAttempt(task: any, previous?: CcmTaskContextCapsuleV1 | null) {
  const workItemAttempts = (Array.isArray(task?.work_items) ? task.work_items : [])
    .map((item: any) => Number(item?.attempt || item?.latest_attempt || item?.latestAttempt || 0));
  const timelineAttempts = (Array.isArray(previous?.timelineSpans) ? previous!.timelineSpans : [])
    .flatMap(span => Array.isArray(span?.attemptSpans) ? span.attemptSpans : [])
    .map(item => Number(item?.attempt || 0));
  return Math.max(
    0,
    Number(task?.execution_attempt || 0),
    Number(task?.attempt || 0),
    Number(previous?.latestAttempt || 0),
    ...workItemAttempts,
    ...timelineAttempts,
  );
}
function workItemsFor(task: any) {
  const rows = Array.isArray(task?.work_items) ? task.work_items : [];
  return rows.slice(0, 200).map((item: any) => ({
    workItemId: text(item?.id || item?.workItemId || item?.work_item_id),
    ...(text(item?.plan_step_id || item?.planStepId) ? { stepId: text(item?.plan_step_id || item?.planStepId) } : {}),
    project: text(item?.target || item?.project || task?.target_project),
    files: uniq(item?.files || item?.allowed_files || item?.allowedFiles),
    status: text(item?.status || item?.receipt_status || "pending", 60),
    latestAttempt: Math.max(0, Number(item?.attempt || item?.latest_attempt || task?.execution_attempt || task?.attempt || 0)),
    completed: item?.completed === true || ["done", "completed", "accepted"].includes(text(item?.status, 40).toLowerCase()),
    agentSessionIds: uniq(item?.agent_session_ids || item?.agentSessionIds || item?.session_ids),
  })).filter((item: any) => item.workItemId);
}
function checksumWithoutChecksum(value: any) { const copy = { ...value }; delete copy.checksum; return digest(copy); }

export function buildTaskContextCapsule(task: any, previous?: CcmTaskContextCapsuleV1 | null, reason = "task_created"): CcmTaskContextCapsuleV1 {
  const now = new Date().toISOString();
  const scope = scopeForTask(task);
  const scopeId = scopeIdForTask(task, scope);
  const exactSessionId = sourceSessionId(task) || text(previous?.sourceSession?.exactSessionId);
  const goal = text(task?.business_goal || task?.description || task?.title, 4000);
  const criteria = stringList(task?.acceptance_criteria || task?.acceptanceCriteria || task?.acceptance_evidence_plan);
  const plan = task?.plan_dispatch_contract?.planId || task?.workflow_meta?.presentedPlan?.planId || task?.workflow_meta?.project_main_plan?.planId
    ? {
      planId: text(task?.plan_dispatch_contract?.planId || task?.workflow_meta?.presentedPlan?.planId || task?.workflow_meta?.project_main_plan?.planId),
      revision: Math.max(0, Number(task?.plan_dispatch_contract?.planRevision || task?.workflow_meta?.presentedPlan?.revision || task?.workflow_meta?.project_main_plan?.revision || 0)),
      checksum: text(task?.plan_dispatch_contract?.planChecksum || task?.workflow_meta?.presentedPlan?.checksum || task?.workflow_meta?.project_main_plan?.checksum, 160),
    } : previous?.plan;
  const dispatchContract = task?.plan_dispatch_contract?.contractId || task?.workflow_meta?.plan_dispatch_contract?.contractId
    ? { contractId: text(task?.plan_dispatch_contract?.contractId || task?.workflow_meta?.plan_dispatch_contract?.contractId), checksum: text(task?.plan_dispatch_contract?.contractChecksum || task?.workflow_meta?.plan_dispatch_contract?.contractChecksum, 160) }
    : previous?.dispatchContract;
  const existingBindings = Array.isArray(previous?.sessionBindings) ? previous!.sessionBindings : [];
  const sourceBinding = existingBindings.find(item => item.role === "source") || (exactSessionId ? createTaskSessionBinding({ task, taskId: text(task?.id), attempt: 0, role: "source", exactSessionId, scope, scopeId, createdForRecovery: false, reason: "original_reused", revision: Math.max(0, Number(previous?.revision || 0) + 1) }) : null);
  const bindings = sourceBinding ? [sourceBinding, ...existingBindings.filter(item => item !== sourceBinding)] : existingBindings;
  const completed = workItemsFor(task).filter(item => item.completed).map(item => item.workItemId);
  const pending = workItemsFor(task).filter(item => !item.completed).map(item => item.workItemId);
  const timelineSpans = (Array.isArray(previous?.timelineSpans) ? previous!.timelineSpans : []) as CcmTaskTimelineSpanV1[];
  const activeTimelineSessionId = taskTimelineIdentity(task).exactSessionId;
  const currentSpan = [...timelineSpans].reverse().find(item => item.taskId === text(task?.id) && (!activeTimelineSessionId || item.exactSessionId === activeTimelineSessionId))
    || [...timelineSpans].reverse().find(item => item.taskId === text(task?.id))
    || timelineSpans.at(-1);
  const status = !text(task?.id) || !scopeId || !goal ? "incomplete" : (task?.status === "drifted" ? "drifted" : "ready");
  const base: Omit<CcmTaskContextCapsuleV1, "checksum"> = {
    schema: "ccm-task-context-capsule-v1", taskId: text(task?.id), scope, scopeId,
    sourceSession: {
      exactSessionId,
      triggerMessageId: text(task?.target_message_id || task?.origin_message_id || task?.source_conversation_ref?.messageId),
      sourceMessageIds: uniq([...(previous?.sourceSession?.sourceMessageIds || []), task?.target_message_id, task?.origin_message_id, ...(Array.isArray(task?.source_message_ids) ? task.source_message_ids : [])]),
      sourceAttachmentRefs: uniq([...(previous?.sourceSession?.sourceAttachmentRefs || []), ...(Array.isArray(task?.source_attachments) ? task.source_attachments.map((x: any) => x?.id || x?.checksum || x?.name) : [])]),
      boundarySequence: Math.max(0, Number(task?.transcript_boundary_sequence || task?.boundary_sequence || previous?.sourceSession?.boundarySequence || 0)),
      transcriptChecksum: text(task?.transcript_checksum || task?.source_transcript_checksum || previous?.sourceSession?.transcriptChecksum, 160),
    },
    intent: { goal, corrections: uniq([...(previous?.intent?.corrections || []), ...(Array.isArray(task?.corrections) ? task.corrections : [])]), decisions: uniq([...(previous?.intent?.decisions || []), ...(Array.isArray(task?.decisions) ? task.decisions : [])]), acceptanceCriteria: criteria, exclusions: uniq([...(previous?.intent?.exclusions || []), ...(Array.isArray(task?.exclusions) ? task.exclusions : [])]) },
    authorization: { projects: uniq([...(previous?.authorization?.projects || []), task?.target_project]), allowedPaths: uniq(task?.allowed_paths || task?.allowedPaths || previous?.authorization?.allowedPaths), forbiddenPaths: uniq(task?.forbidden_paths || task?.forbiddenPaths || previous?.authorization?.forbiddenPaths), permissionSnapshotChecksum: text(task?.conversation_permission_snapshot?.checksum || task?.permission_snapshot_checksum || previous?.authorization?.permissionSnapshotChecksum, 160) },
    ...(plan ? { plan } : {}), ...(dispatchContract ? { dispatchContract } : {}), workItems: workItemsFor(task), fileEvidence: Array.isArray(previous?.fileEvidence) ? previous!.fileEvidence : [],
    workspace: { manifestChecksum: text(task?.workspace_manifest_checksum || task?.interruption_receipt?.workspace_checksum || previous?.workspace?.manifestChecksum, 160), worktreeBindings: Array.isArray(task?.worktree_bindings) ? task.worktree_bindings : (previous?.workspace?.worktreeBindings || []) },
    completedWork: uniq([...(previous?.completedWork || []), ...arrayValue(task?.completed_work), ...completed]), pendingWork: uniq([...(arrayValue(task?.pending_work)), ...pending]),
    fileChangeEvidenceIds: uniq([...(previous?.fileChangeEvidenceIds || []), ...arrayValue(task?.file_change_evidence_ids || task?.fileChangeEvidenceIds)]), verificationEvidenceIds: uniq([...(previous?.verificationEvidenceIds || []), ...arrayValue(task?.verification_evidence_ids || task?.verificationEvidenceIds), ...arrayValue(task?.terminal_decision?.evidence_registry?.evidenceIds)]), unresolvedToolCallIds: uniq(arrayValue(task?.unresolved_tool_call_ids || task?.unresolvedToolCallIds || previous?.unresolvedToolCallIds)), blockers: uniq([...(previous?.blockers || []), ...arrayValue(task?.blockers || task?.blocking_reasons)]), sessionBindings: bindings, generation: Math.max(0, Number(task?.generation || task?.project_session_generation || previous?.generation || 0)), latestAttempt: latestKnownAttempt(task, previous), revision: Math.max(1, Number(previous?.revision || 0) + 1), status, updatedAt: now, contentStored: false,
    timelineSpans,
    ...(currentSpan ? { activeSpanId: currentSpan.status === "open" ? currentSpan.spanId : undefined, startMarkerId: currentSpan.startMarkerId, endMarkerId: currentSpan.endMarkerId, startSequence: currentSpan.startSequence, endSequence: currentSpan.endSequence } : {}),
    appliedCursors: Array.isArray(previous?.appliedCursors) ? previous!.appliedCursors : [],
    latestCheckpointSequence: Math.max(0, Number(task?.latest_checkpoint_sequence || task?.latestCheckpointSequence || previous?.latestCheckpointSequence || currentSpan?.latestSequence || 0)), taskContextSource: "session_timeline" as const,
  };
  const result = { ...base, checksum: checksumWithoutChecksum(base) } as CcmTaskContextCapsuleV1;
  return result;
}

export function createTaskSessionBinding(input: { task: any; taskId: string; attempt: number; role: CcmTaskSessionBindingV1["role"]; scope: CcmTaskScope; scopeId: string; exactSessionId: string; createdForRecovery: boolean; originalSessionId?: string; reason?: CcmTaskSessionBindingV1["reason"]; revision: number; }) {
  const raw: Omit<CcmTaskSessionBindingV1, "bindingChecksum"> = { schema: "ccm-task-session-binding-v1", taskId: input.taskId, attempt: input.attempt, role: input.role, scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId, ...(input.originalSessionId ? { originalSessionId: input.originalSessionId } : {}), createdForRecovery: input.createdForRecovery, status: "active", ...(input.reason ? { reason: input.reason } : {}), taskContextRevision: input.revision, createdAt: new Date().toISOString(), contentStored: false };
  return { ...raw, bindingChecksum: checksumWithoutChecksum(raw) } as CcmTaskSessionBindingV1;
}

export function refreshTaskContext(task: any, reason = "task_updated") { return buildTaskContextCapsule(task, task?.task_context || null, reason); }

export function addTaskFileEvidence(taskId: string, evidence: any, expectedRevision?: number) {
  const task = getTaskById(text(taskId)); if (!task) throw new Error("任务不存在");
  const item = { evidenceId: text(evidence?.evidenceId || evidence?.id || `fe_${digest(evidence).slice(0, 20)}`), project: text(evidence?.project || task.target_project), path: text(evidence?.path, 500), checksum: text(evidence?.checksum, 160), readRanges: Array.isArray(evidence?.readRanges || evidence?.read_ranges) ? (evidence.readRanges || evidence.read_ranges).slice(0, 40).map((range: any) => ({ start: Math.max(0, Number(range?.start || 0)), end: Math.max(0, Number(range?.end || 0)) })) : [], purpose: text(evidence?.purpose || "file_read", 240), workItemIds: uniq(evidence?.workItemIds || evidence?.work_item_ids), contentStored: false as const };
  const identity = taskTimelineIdentity(task);
  if (!identity.exactSessionId) throw new Error("任务缺少精确会话身份，不能记录文件证据");
  const committed = persistTaskMutationWithTimelineAtomically({
    task,
    expectedTaskRevision: expectedRevision,
    exactSessionId: identity.exactSessionId,
    scope: identity.scope,
    scopeId: identity.scopeId,
    type: "file_read",
    eventId: `file_read:${text(taskId, 120)}:${item.evidenceId}`,
    idempotencyKey: `file_read:${text(taskId, 120)}:${item.evidenceId}`,
    workItemId: item.workItemIds[0],
    generation: Number(task.generation || 0),
    attempt: Number(task.execution_attempt || task.attempt || 1),
    leaseId: text(task.lease_id || task.leaseId, 160),
    payloadRef: item.evidenceId,
    contextReason: "file_evidence",
    buildContext: (taskForContext, previousContext) => {
      const context = buildTaskContextCapsule(taskForContext, previousContext, "file_evidence");
      return { ...context, fileEvidence: [...(context.fileEvidence || []).filter((entry: any) => entry.evidenceId !== item.evidenceId), item].slice(-500) };
    },
  });
  return committed.task;
}

export function projectTaskContext(task: any) {
  const context = task?.task_context; if (!context || typeof context !== "object") return null;
  return { schema: context.schema, taskId: text(context.taskId), scope: context.scope, scopeId: text(context.scopeId), sourceSessionId: text(context.sourceSession?.exactSessionId), activeSessionId: text([...context.sessionBindings || []].reverse().find((x: any) => x.status === "active" && x.role !== "source")?.exactSessionId || context.sourceSession?.exactSessionId), revision: Math.max(0, Number(context.revision || 0)), checksum: text(context.checksum, 160), status: context.status, pendingWorkItemCount: Array.isArray(context.pendingWork) ? context.pendingWork.length : 0, completedWorkItemCount: Array.isArray(context.completedWork) ? context.completedWork.length : 0, fileEvidenceCount: Array.isArray(context.fileEvidence) ? context.fileEvidence.length : 0, timelineSpans: Array.isArray(context.timelineSpans) ? context.timelineSpans.map((span: any) => ({ spanId: span.spanId, taskId: span.taskId, exactSessionId: span.exactSessionId, startSequence: span.startSequence, endSequence: span.endSequence, status: span.status, checksum: span.checksum })) : [], activeSpanId: text(context.activeSpanId, 180), appliedCursors: Array.isArray(context.appliedCursors) ? context.appliedCursors.map((cursor: any) => ({ spanId: cursor.spanId, exactSessionId: cursor.exactSessionId, sequence: Number(cursor.sequence || 0), eventChecksum: text(cursor.eventChecksum, 160) })) : [], startMarkerId: text(context.startMarkerId, 180), endMarkerId: text(context.endMarkerId, 180), latestCheckpointSequence: Math.max(0, Number(context.latestCheckpointSequence || 0)), taskContextSource: context.taskContextSource || "session_timeline", sessionBindings: (Array.isArray(context.sessionBindings) ? context.sessionBindings : []).map((x: any) => ({ role: x.role, scope: x.scope, exactSessionId: x.exactSessionId, status: x.status, attempt: x.attempt, createdForRecovery: x.createdForRecovery, reason: x.reason })) , contentStored: false };
}
