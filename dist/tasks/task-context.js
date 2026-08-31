"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskTimelineIdentity = taskTimelineIdentity;
exports.buildTaskContextCapsule = buildTaskContextCapsule;
exports.createTaskSessionBinding = createTaskSessionBinding;
exports.refreshTaskContext = refreshTaskContext;
exports.addTaskFileEvidence = addTaskFileEvidence;
exports.projectTaskContext = projectTaskContext;
const crypto = __importStar(require("crypto"));
const db_1 = require("../core/db");
const session_task_timeline_1 = require("./session-task-timeline");
function text(value, max = 1000) { return String(value ?? "").trim().slice(0, max); }
function uniq(value, max = 100) { return [...new Set((Array.isArray(value) ? value : []).map(item => text(item, 500)).filter(Boolean))].slice(0, max); }
function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function scopeForTask(task) {
    const channel = text(task?.source_channel || task?.request_origin || task?.workflow_meta?.intake?.source, 40).toLowerCase();
    if (channel.includes("feishu"))
        return "feishu";
    if (text(task?.group_id))
        return "group";
    if (text(task?.target_project || task?.project_session_id))
        return "project";
    return "global";
}
function scopeIdForTask(task, scope) {
    if (scope === "group")
        return text(task?.group_id);
    if (scope === "project")
        return text(task?.target_project);
    if (scope === "feishu")
        return text(task?.target_id || task?.source_conversation_ref?.scopeId || "global");
    return "global";
}
function sourceSessionId(task) {
    return text(task?.exact_session_id || task?.group_session_id || task?.project_session_id || task?.origin_session_id || task?.source_conversation_ref?.exactSessionId);
}
function taskTimelineIdentity(task) {
    const scope = scopeForTask(task);
    const active = text(task?.active_execution_session_id || task?.execution_session_id || task?.recovery_user_session?.activeSessionId);
    return { scope, scopeId: scopeIdForTask(task, scope), exactSessionId: active || sourceSessionId(task) };
}
function stringList(value) {
    if (Array.isArray(value))
        return uniq(value);
    const s = text(value, 2000);
    return s ? [s] : [];
}
function arrayValue(value) { return Array.isArray(value) ? value : []; }
function latestKnownAttempt(task, previous) {
    const workItemAttempts = (Array.isArray(task?.work_items) ? task.work_items : [])
        .map((item) => Number(item?.attempt || item?.latest_attempt || item?.latestAttempt || 0));
    const timelineAttempts = (Array.isArray(previous?.timelineSpans) ? previous.timelineSpans : [])
        .flatMap(span => Array.isArray(span?.attemptSpans) ? span.attemptSpans : [])
        .map(item => Number(item?.attempt || 0));
    return Math.max(0, Number(task?.execution_attempt || 0), Number(task?.attempt || 0), Number(previous?.latestAttempt || 0), ...workItemAttempts, ...timelineAttempts);
}
function workItemsFor(task) {
    const rows = Array.isArray(task?.work_items) ? task.work_items : [];
    return rows.slice(0, 200).map((item) => ({
        workItemId: text(item?.id || item?.workItemId || item?.work_item_id),
        ...(text(item?.plan_step_id || item?.planStepId) ? { stepId: text(item?.plan_step_id || item?.planStepId) } : {}),
        project: text(item?.target || item?.project || task?.target_project),
        files: uniq(item?.files || item?.allowed_files || item?.allowedFiles),
        status: text(item?.status || item?.receipt_status || "pending", 60),
        latestAttempt: Math.max(0, Number(item?.attempt || item?.latest_attempt || task?.execution_attempt || task?.attempt || 0)),
        completed: item?.completed === true || ["done", "completed", "accepted"].includes(text(item?.status, 40).toLowerCase()),
        agentSessionIds: uniq(item?.agent_session_ids || item?.agentSessionIds || item?.session_ids),
    })).filter((item) => item.workItemId);
}
function checksumWithoutChecksum(value) { const copy = { ...value }; delete copy.checksum; return digest(copy); }
function buildTaskContextCapsule(task, previous, reason = "task_created") {
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
    const existingBindings = Array.isArray(previous?.sessionBindings) ? previous.sessionBindings : [];
    const sourceBinding = existingBindings.find(item => item.role === "source") || (exactSessionId ? createTaskSessionBinding({ task, taskId: text(task?.id), attempt: 0, role: "source", exactSessionId, scope, scopeId, createdForRecovery: false, reason: "original_reused", revision: Math.max(0, Number(previous?.revision || 0) + 1) }) : null);
    const bindings = sourceBinding ? [sourceBinding, ...existingBindings.filter(item => item !== sourceBinding)] : existingBindings;
    const completed = workItemsFor(task).filter(item => item.completed).map(item => item.workItemId);
    const pending = workItemsFor(task).filter(item => !item.completed).map(item => item.workItemId);
    const timelineSpans = (Array.isArray(previous?.timelineSpans) ? previous.timelineSpans : []);
    const activeTimelineSessionId = taskTimelineIdentity(task).exactSessionId;
    const currentSpan = [...timelineSpans].reverse().find(item => item.taskId === text(task?.id) && (!activeTimelineSessionId || item.exactSessionId === activeTimelineSessionId))
        || [...timelineSpans].reverse().find(item => item.taskId === text(task?.id))
        || timelineSpans.at(-1);
    const status = !text(task?.id) || !scopeId || !goal ? "incomplete" : (task?.status === "drifted" ? "drifted" : "ready");
    const base = {
        schema: "ccm-task-context-capsule-v1", taskId: text(task?.id), scope, scopeId,
        sourceSession: {
            exactSessionId,
            triggerMessageId: text(task?.target_message_id || task?.origin_message_id || task?.source_conversation_ref?.messageId),
            sourceMessageIds: uniq([...(previous?.sourceSession?.sourceMessageIds || []), task?.target_message_id, task?.origin_message_id, ...(Array.isArray(task?.source_message_ids) ? task.source_message_ids : [])]),
            sourceAttachmentRefs: uniq([...(previous?.sourceSession?.sourceAttachmentRefs || []), ...(Array.isArray(task?.source_attachments) ? task.source_attachments.map((x) => x?.id || x?.checksum || x?.name) : [])]),
            boundarySequence: Math.max(0, Number(task?.transcript_boundary_sequence || task?.boundary_sequence || previous?.sourceSession?.boundarySequence || 0)),
            transcriptChecksum: text(task?.transcript_checksum || task?.source_transcript_checksum || previous?.sourceSession?.transcriptChecksum, 160),
        },
        intent: { goal, corrections: uniq([...(previous?.intent?.corrections || []), ...(Array.isArray(task?.corrections) ? task.corrections : [])]), decisions: uniq([...(previous?.intent?.decisions || []), ...(Array.isArray(task?.decisions) ? task.decisions : [])]), acceptanceCriteria: criteria, exclusions: uniq([...(previous?.intent?.exclusions || []), ...(Array.isArray(task?.exclusions) ? task.exclusions : [])]) },
        authorization: { projects: uniq([...(previous?.authorization?.projects || []), task?.target_project]), allowedPaths: uniq(task?.allowed_paths || task?.allowedPaths || previous?.authorization?.allowedPaths), forbiddenPaths: uniq(task?.forbidden_paths || task?.forbiddenPaths || previous?.authorization?.forbiddenPaths), permissionSnapshotChecksum: text(task?.conversation_permission_snapshot?.checksum || task?.permission_snapshot_checksum || previous?.authorization?.permissionSnapshotChecksum, 160) },
        ...(plan ? { plan } : {}), ...(dispatchContract ? { dispatchContract } : {}), workItems: workItemsFor(task), fileEvidence: Array.isArray(previous?.fileEvidence) ? previous.fileEvidence : [],
        workspace: { manifestChecksum: text(task?.workspace_manifest_checksum || task?.interruption_receipt?.workspace_checksum || previous?.workspace?.manifestChecksum, 160), worktreeBindings: Array.isArray(task?.worktree_bindings) ? task.worktree_bindings : (previous?.workspace?.worktreeBindings || []) },
        completedWork: uniq([...(previous?.completedWork || []), ...arrayValue(task?.completed_work), ...completed]), pendingWork: uniq([...(arrayValue(task?.pending_work)), ...pending]),
        fileChangeEvidenceIds: uniq([...(previous?.fileChangeEvidenceIds || []), ...arrayValue(task?.file_change_evidence_ids || task?.fileChangeEvidenceIds)]), verificationEvidenceIds: uniq([...(previous?.verificationEvidenceIds || []), ...arrayValue(task?.verification_evidence_ids || task?.verificationEvidenceIds), ...arrayValue(task?.terminal_decision?.evidence_registry?.evidenceIds)]), unresolvedToolCallIds: uniq(arrayValue(task?.unresolved_tool_call_ids || task?.unresolvedToolCallIds || previous?.unresolvedToolCallIds)), blockers: uniq([...(previous?.blockers || []), ...arrayValue(task?.blockers || task?.blocking_reasons)]), sessionBindings: bindings, generation: Math.max(0, Number(task?.generation || task?.project_session_generation || previous?.generation || 0)), latestAttempt: latestKnownAttempt(task, previous), revision: Math.max(1, Number(previous?.revision || 0) + 1), status, updatedAt: now, contentStored: false,
        timelineSpans,
        ...(currentSpan ? { activeSpanId: currentSpan.status === "open" ? currentSpan.spanId : undefined, startMarkerId: currentSpan.startMarkerId, endMarkerId: currentSpan.endMarkerId, startSequence: currentSpan.startSequence, endSequence: currentSpan.endSequence } : {}),
        appliedCursors: Array.isArray(previous?.appliedCursors) ? previous.appliedCursors : [],
        latestCheckpointSequence: Math.max(0, Number(task?.latest_checkpoint_sequence || task?.latestCheckpointSequence || previous?.latestCheckpointSequence || currentSpan?.latestSequence || 0)), taskContextSource: "session_timeline",
    };
    const result = { ...base, checksum: checksumWithoutChecksum(base) };
    return result;
}
function createTaskSessionBinding(input) {
    const raw = { schema: "ccm-task-session-binding-v1", taskId: input.taskId, attempt: input.attempt, role: input.role, scope: input.scope, scopeId: input.scopeId, exactSessionId: input.exactSessionId, ...(input.originalSessionId ? { originalSessionId: input.originalSessionId } : {}), createdForRecovery: input.createdForRecovery, status: "active", ...(input.reason ? { reason: input.reason } : {}), taskContextRevision: input.revision, createdAt: new Date().toISOString(), contentStored: false };
    return { ...raw, bindingChecksum: checksumWithoutChecksum(raw) };
}
function refreshTaskContext(task, reason = "task_updated") { return buildTaskContextCapsule(task, task?.task_context || null, reason); }
function addTaskFileEvidence(taskId, evidence, expectedRevision) {
    const task = (0, db_1.getTaskById)(text(taskId));
    if (!task)
        throw new Error("任务不存在");
    const item = { evidenceId: text(evidence?.evidenceId || evidence?.id || `fe_${digest(evidence).slice(0, 20)}`), project: text(evidence?.project || task.target_project), path: text(evidence?.path, 500), checksum: text(evidence?.checksum, 160), readRanges: Array.isArray(evidence?.readRanges || evidence?.read_ranges) ? (evidence.readRanges || evidence.read_ranges).slice(0, 40).map((range) => ({ start: Math.max(0, Number(range?.start || 0)), end: Math.max(0, Number(range?.end || 0)) })) : [], purpose: text(evidence?.purpose || "file_read", 240), workItemIds: uniq(evidence?.workItemIds || evidence?.work_item_ids), contentStored: false };
    const identity = taskTimelineIdentity(task);
    if (!identity.exactSessionId)
        throw new Error("任务缺少精确会话身份，不能记录文件证据");
    const committed = (0, session_task_timeline_1.persistTaskMutationWithTimelineAtomically)({
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
            return { ...context, fileEvidence: [...(context.fileEvidence || []).filter((entry) => entry.evidenceId !== item.evidenceId), item].slice(-500) };
        },
    });
    return committed.task;
}
function projectTaskContext(task) {
    const context = task?.task_context;
    if (!context || typeof context !== "object")
        return null;
    return { schema: context.schema, taskId: text(context.taskId), scope: context.scope, scopeId: text(context.scopeId), sourceSessionId: text(context.sourceSession?.exactSessionId), activeSessionId: text([...context.sessionBindings || []].reverse().find((x) => x.status === "active" && x.role !== "source")?.exactSessionId || context.sourceSession?.exactSessionId), revision: Math.max(0, Number(context.revision || 0)), checksum: text(context.checksum, 160), status: context.status, pendingWorkItemCount: Array.isArray(context.pendingWork) ? context.pendingWork.length : 0, completedWorkItemCount: Array.isArray(context.completedWork) ? context.completedWork.length : 0, fileEvidenceCount: Array.isArray(context.fileEvidence) ? context.fileEvidence.length : 0, timelineSpans: Array.isArray(context.timelineSpans) ? context.timelineSpans.map((span) => ({ spanId: span.spanId, taskId: span.taskId, exactSessionId: span.exactSessionId, startSequence: span.startSequence, endSequence: span.endSequence, status: span.status, checksum: span.checksum })) : [], activeSpanId: text(context.activeSpanId, 180), appliedCursors: Array.isArray(context.appliedCursors) ? context.appliedCursors.map((cursor) => ({ spanId: cursor.spanId, exactSessionId: cursor.exactSessionId, sequence: Number(cursor.sequence || 0), eventChecksum: text(cursor.eventChecksum, 160) })) : [], startMarkerId: text(context.startMarkerId, 180), endMarkerId: text(context.endMarkerId, 180), latestCheckpointSequence: Math.max(0, Number(context.latestCheckpointSequence || 0)), taskContextSource: context.taskContextSource || "session_timeline", sessionBindings: (Array.isArray(context.sessionBindings) ? context.sessionBindings : []).map((x) => ({ role: x.role, scope: x.scope, exactSessionId: x.exactSessionId, status: x.status, attempt: x.attempt, createdForRecovery: x.createdForRecovery, reason: x.reason })), contentStored: false };
}
//# sourceMappingURL=task-context.js.map