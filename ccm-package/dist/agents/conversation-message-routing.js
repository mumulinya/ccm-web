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
exports.CONVERSATION_AUTO_RESUME_CONFIDENCE = exports.CONVERSATION_CANDIDATE_CONFIDENCE = void 0;
exports.findConversationTaskCandidates = findConversationTaskCandidates;
exports.findRecoverableConversationTasks = findRecoverableConversationTasks;
exports.buildRecoverableTaskSummary = buildRecoverableTaskSummary;
exports.bindConversationRouteToWorkflowDecision = bindConversationRouteToWorkflowDecision;
exports.decideConversationMessageRoute = decideConversationMessageRoute;
exports.conversationRouteAuditChecksum = conversationRouteAuditChecksum;
exports.runConversationMessageRoutingSelfTest = runConversationMessageRoutingSelfTest;
const crypto = __importStar(require("crypto"));
const db_1 = require("../core/db");
// Routing is intentionally split into a high-confidence automatic path and a
// medium-confidence choice card. The old 0.72-only gate made write follow-ups
// too eager to resume an old task; 0.72 remains useful as the lower bound for
// showing a candidate, while writes require 0.85 to resume automatically.
exports.CONVERSATION_CANDIDATE_CONFIDENCE = 0.72;
exports.CONVERSATION_AUTO_RESUME_CONFIDENCE = 0.85;
function text(value) {
    return String(value ?? "").trim();
}
function lower(value) {
    return text(value).toLowerCase();
}
function updatedAt(task) {
    return Date.parse(task?.updated_at || task?.updatedAt || task?.created_at || task?.createdAt || "") || 0;
}
function exactTaskSession(task, scope) {
    if (scope === "project")
        return text(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId || task?.origin_session_id || task?.originSessionId);
    if (scope === "group")
        return text(task?.group_session_id || task?.groupSessionId || task?.exact_session_id || task?.exactSessionId || task?.origin_session_id || task?.originSessionId);
    return text(task?.exact_session_id || task?.exactSessionId || task?.origin_session_id || task?.originSessionId || task?.session_id || task?.sessionId);
}
function taskScopeId(task, scope) {
    if (scope === "project")
        return text(task?.target_project || task?.targetProject || task?.project || task?.project_id || task?.projectId);
    if (scope === "group")
        return text(task?.group_id || task?.groupId || task?.scope_id || task?.scopeId);
    return "global";
}
function isExplicitlyAbandoned(task) {
    const status = lower(task?.status);
    const reason = lower(task?.cancel_reason || task?.cancelReason || task?.status_detail || task?.statusDetail);
    return ["cancelled", "canceled", "archived"].includes(status)
        || reason.includes("用户停止")
        || reason.includes("明确停止")
        || task?.abandoned === true;
}
function isRecoverable(task) {
    if (!task || isExplicitlyAbandoned(task))
        return false;
    const status = lower(task.status);
    const acceptance = lower(task.acceptance_state || task.acceptanceState);
    const phase = lower(task.phase || task.status_detail || task.statusDetail);
    const receipt = task.interruption_receipt || task.interruptionReceipt || {};
    if (receipt?.recoverable === true)
        return true;
    if (acceptance === "recovery_required")
        return true;
    return ["failed", "interrupted"].includes(status)
        || ["failed", "interrupted", "recovery_required"].includes(phase);
}
const ACTIVE_TASK_STATUSES = new Set([
    "pending", "queued", "in_progress", "running", "executing", "verifying",
    "reviewing", "reworking", "awaiting_review", "awaiting_test_agent",
    "test_agent_running", "main_agent_accepting", "waiting", "waiting_user",
    "recovering", "paused",
]);
function taskStatus(task) {
    return lower(task?.status || task?.acceptance_state || task?.phase);
}
function isCompletedTask(task) {
    return ["completed", "done"].includes(lower(task?.status))
        || ["accepted", "done", "terminal_gate_passed"].includes(lower(task?.acceptance_state));
}
function isActiveTask(task) {
    return !isExplicitlyAbandoned(task)
        && !isCompletedTask(task)
        && ACTIVE_TASK_STATUSES.has(taskStatus(task));
}
function candidateKind(task) {
    if (isCompletedTask(task))
        return "completed";
    if (isActiveTask(task))
        return "active";
    return "recoverable";
}
function candidateRank(kind) {
    return kind === "active" ? 0 : kind === "recoverable" ? 1 : 2;
}
function findConversationTaskCandidates(input) {
    const exactSessionId = text(input.exactSessionId);
    const scopeId = text(input.scopeId || (input.scope === "global" || input.scope === "feishu" ? "global" : ""));
    if (!exactSessionId)
        return [];
    return ((0, db_1.loadTasks)() || [])
        .filter((task) => exactTaskSession(task, input.scope) === exactSessionId)
        .filter((task) => input.scope === "global" || input.scope === "feishu" || taskScopeId(task, input.scope) === scopeId)
        .filter((task) => isActiveTask(task) || isRecoverable(task) || (input.includeCompleted !== false && isCompletedTask(task)))
        .sort((left, right) => {
        const rank = candidateRank(candidateKind(left)) - candidateRank(candidateKind(right));
        return rank || updatedAt(right) - updatedAt(left);
    });
}
function findRecoverableConversationTasks(input) {
    return findConversationTaskCandidates({ ...input, includeCompleted: false })
        .filter((task) => !isActiveTask(task));
}
function buildRecoverableTaskSummary(task) {
    if (!task)
        return null;
    return {
        taskId: text(task.id),
        title: text(task.title || task.business_goal || task.description).slice(0, 160),
        status: lower(task.status || task.acceptance_state || task.phase),
        generation: Math.max(0, Number(task.generation || task.execution_generation || 0)),
        candidateKind: candidateKind(task),
        phase: text(task.phase || task.acceptance_state || task.status_detail || task.status),
        attempt: Math.max(0, Number(task.attempt || task.execution_attempt || 0)),
        hasIncompleteWorkItems: Array.isArray(task.work_items)
            ? task.work_items.some((item) => !["completed", "skipped"].includes(lower(item?.status)))
            : undefined,
        targetProjects: Array.from(new Set([
            text(task.target_project || task.targetProject),
            ...(Array.isArray(task.target_projects || task.targetProjects) ? (task.target_projects || task.targetProjects).map(text) : []),
        ].filter(Boolean))),
        recoverable: true,
        contentStored: false,
    };
}
function bindConversationRouteToWorkflowDecision(workflowDecision, route, candidate, source = "model") {
    if (!workflowDecision || !candidate)
        return workflowDecision;
    const taskId = text(candidate.id || candidate.taskId || candidate.task_id);
    if (!taskId)
        return workflowDecision;
    workflowDecision.conversationRouteKind = text(route?.routeKind || route?.route_kind || "resume_existing_task");
    workflowDecision.continuationTaskId = taskId;
    workflowDecision.conversationRouteSource = source;
    workflowDecision.conversationRouteBinding = {
        schema: "ccm-conversation-route-binding-v2",
        taskId,
        routeKind: workflowDecision.conversationRouteKind,
        exactSessionId: text(route?.exactSessionId || route?.exact_session_id),
        scope: text(route?.scope || "global"),
        source,
        contentStored: false,
    };
    return workflowDecision;
}
function targetExpanded(workflowDecision, candidate) {
    const candidateProjects = new Set(buildRecoverableTaskSummary(candidate)?.targetProjects || []);
    const requestedProjects = (Array.isArray(workflowDecision?.targetRefs) ? workflowDecision.targetRefs : [])
        .filter((item) => lower(item?.scope) === "project")
        .map((item) => text(item?.scopeId || item?.scope_id || item?.id))
        .filter(Boolean);
    return requestedProjects.some((project) => !candidateProjects.has(project));
}
function decideConversationMessageRoute(input) {
    const workflowDecision = input.workflowDecision || {};
    const continuationKind = lower(workflowDecision.continuationKind || workflowDecision.continuation_kind || "new_task");
    const confidence = Math.max(0, Math.min(1, Number(workflowDecision.confidence || 0)));
    const candidates = input.candidates || [];
    const groupedCandidates = {
        active: candidates.filter((item) => candidateKind(item) === "active"),
        recoverable: candidates.filter((item) => candidateKind(item) === "recoverable"),
        completed: candidates.filter((item) => candidateKind(item) === "completed"),
    };
    const eligibleCandidates = groupedCandidates.active.length
        ? groupedCandidates.active
        : groupedCandidates.recoverable.length ? groupedCandidates.recoverable : groupedCandidates.completed;
    const candidate = eligibleCandidates.length === 1 ? eligibleCandidates[0] : null;
    const candidateSummary = candidate ? buildRecoverableTaskSummary(candidate) : null;
    const candidateSummaries = eligibleCandidates.slice(0, 6).map(buildRecoverableTaskSummary).filter(Boolean);
    const confidenceBand = confidence >= exports.CONVERSATION_AUTO_RESUME_CONFIDENCE
        ? "high"
        : confidence >= exports.CONVERSATION_CANDIDATE_CONFIDENCE ? "medium" : "low";
    const base = {
        routeKind: "needs_user",
        source: "model",
        candidateTaskId: candidate ? text(candidate.id) : "",
        candidateTaskIds: eligibleCandidates.map((item) => text(item?.id)).filter(Boolean).slice(0, 12),
        candidateSummaries,
        activeTaskId: candidateSummary?.candidateKind === "active" ? text(candidate?.id) : "",
        exactSessionId: text(input.exactSessionId),
        scope: input.scope || "global",
        confidence,
        confidenceBand,
        continuationKind: continuationKind,
        contentStored: false,
    };
    if (workflowDecision.actionRequired !== true && workflowDecision.requiresCodeChanges !== true) {
        return { ...base, routeKind: "answer_only", decision: "answer", confidence, candidate: null, reason: text(workflowDecision.reason || "这条消息只需要回答") };
    }
    if (continuationKind === "new_task") {
        return { ...base, routeKind: "start_new_task", decision: "new_task", confidence, candidate: null, reason: text(workflowDecision.reason || "这是独立的新需求") };
    }
    // A supplement/revision without a candidate is an ambiguous continuation.
    // Do not silently create a second write task for phrases such as
    // "继续一下" or "完成这个功能" when there is no session anchor.
    if (eligibleCandidates.length === 0) {
        return {
            ...base,
            routeKind: "needs_user",
            decision: "needs_user",
            candidate: null,
            reason: text(workflowDecision.reason || "这条消息像是续接要求，但当前会话没有可安全续接的任务；请确认是新任务还是继续原任务"),
        };
    }
    if (candidate && targetExpanded(workflowDecision, candidate)) {
        return {
            ...base,
            decision: "needs_user",
            candidate,
            reason: "这条消息扩大了原任务的项目范围，需要你确认是否作为新任务",
        };
    }
    if (candidate && candidateSummary?.candidateKind === "completed"
        && continuationKind !== "revise_goal" && candidateSummary.hasIncompleteWorkItems !== true) {
        return {
            ...base,
            decision: "needs_user",
            candidate,
            reason: "最近任务已经正式交付且没有未完成工作项；请确认是返工原任务还是创建新任务",
        };
    }
    if (candidate && confidence >= exports.CONVERSATION_AUTO_RESUME_CONFIDENCE) {
        const kind = candidateSummary?.candidateKind;
        const revising = continuationKind === "revise_goal";
        const routeKind = revising
            ? "revise_existing_task"
            : kind === "active" ? "continue_current_session" : "resume_existing_task";
        return {
            ...base,
            routeKind,
            decision: revising ? "revise_task" : "resume_task",
            confidence,
            candidate,
            reason: text(workflowDecision.reason || "消息与可恢复任务目标一致"),
        };
    }
    return {
        ...base,
        routeKind: "needs_user",
        decision: "needs_user",
        confidence,
        candidate: candidate || candidates[0] || null,
        reason: eligibleCandidates.length > 1
            ? "当前会话中存在多个可恢复任务，需要你确认这条消息的处理方式"
            : !candidate
                ? "这条消息像是续接要求，但当前没有唯一可安全恢复的任务"
                : targetExpanded(workflowDecision, candidate)
                    ? "这条消息扩大了原任务的项目范围，需要你确认是否作为新任务"
                    : confidenceBand === "medium"
                        ? "这条消息与当前任务有关，但写入续接置信度处于确认区间"
                        : "这条消息与可恢复任务有关，但继续原目标还是开始新需求仍不够明确",
    };
}
function conversationRouteAuditChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex");
}
function runConversationMessageRoutingSelfTest() {
    const candidate = {
        id: "task-recoverable",
        target_project: "project-a",
        status: "interrupted",
        title: "恢复原任务",
    };
    const decision = (confidence, extra = {}) => ({
        mode: "execute",
        actionRequired: true,
        continuationKind: "supplement",
        confidence,
        targetRefs: [{ scope: "project", scopeId: "project-a" }],
        ...extra,
    });
    const checks = {
        belowThresholdNeedsUser: decideConversationMessageRoute({ workflowDecision: decision(0.719), candidates: [candidate] }).decision === "needs_user",
        mediumConfidenceNeedsUser: decideConversationMessageRoute({ workflowDecision: decision(0.72), candidates: [candidate] }).decision === "needs_user",
        highConfidenceResumes: decideConversationMessageRoute({ workflowDecision: decision(0.85), candidates: [candidate] }).decision === "resume_task",
        multipleCandidatesNeedUser: decideConversationMessageRoute({ workflowDecision: decision(0.99), candidates: [candidate, { ...candidate, id: "task-other" }] }).decision === "needs_user",
        expandedTargetNeedsUser: decideConversationMessageRoute({ workflowDecision: decision(0.99, { targetRefs: [{ scope: "project", scopeId: "project-b" }] }), candidates: [candidate] }).decision === "needs_user",
        explicitNewTaskStaysNew: decideConversationMessageRoute({ workflowDecision: decision(0.99, { continuationKind: "new_task" }), candidates: [candidate] }).decision === "new_task",
        answerDoesNotCreateTask: decideConversationMessageRoute({ workflowDecision: decision(0.99, { actionRequired: false, requiresCodeChanges: false }), candidates: [candidate] }).decision === "answer",
        noCandidateContinuationNeedsUser: decideConversationMessageRoute({ workflowDecision: decision(0.99), candidates: [] }).decision === "needs_user",
        explicitNewTaskStartsNewTask: decideConversationMessageRoute({ workflowDecision: decision(0.99, { continuationKind: "new_task" }), candidates: [] }).decision === "new_task",
        noCandidateReadOnlyAnswers: decideConversationMessageRoute({ workflowDecision: decision(0.2, { actionRequired: false, requiresCodeChanges: false }), candidates: [] }).decision === "answer",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=conversation-message-routing.js.map