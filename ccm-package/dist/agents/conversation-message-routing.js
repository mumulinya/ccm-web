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
exports.CONVERSATION_AUTO_RESUME_CONFIDENCE = void 0;
exports.findRecoverableConversationTasks = findRecoverableConversationTasks;
exports.buildRecoverableTaskSummary = buildRecoverableTaskSummary;
exports.decideConversationMessageRoute = decideConversationMessageRoute;
exports.conversationRouteAuditChecksum = conversationRouteAuditChecksum;
exports.runConversationMessageRoutingSelfTest = runConversationMessageRoutingSelfTest;
const crypto = __importStar(require("crypto"));
const db_1 = require("../core/db");
// A recoverable task is already constrained to the same exact conversation,
// resource scope and a verifiable workspace. Requiring 0.85 here caused
// otherwise clear follow-ups to be sent back to the user too often. Keep a
// meaningful confidence gate, but reserve the choice card for genuinely
// ambiguous cases.
exports.CONVERSATION_AUTO_RESUME_CONFIDENCE = 0.72;
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
function findRecoverableConversationTasks(input) {
    const exactSessionId = text(input.exactSessionId);
    const scopeId = text(input.scopeId || (input.scope === "global" ? "global" : ""));
    if (!exactSessionId)
        return [];
    return ((0, db_1.loadTasks)() || [])
        .filter((task) => exactTaskSession(task, input.scope) === exactSessionId)
        .filter((task) => input.scope === "global" || taskScopeId(task, input.scope) === scopeId)
        .filter(isRecoverable)
        .sort((left, right) => updatedAt(right) - updatedAt(left));
}
function buildRecoverableTaskSummary(task) {
    if (!task)
        return null;
    return {
        taskId: text(task.id),
        title: text(task.title || task.business_goal || task.description).slice(0, 160),
        status: lower(task.status || task.acceptance_state || task.phase),
        generation: Math.max(0, Number(task.generation || task.execution_generation || 0)),
        targetProjects: Array.from(new Set([
            text(task.target_project || task.targetProject),
            ...(Array.isArray(task.target_projects || task.targetProjects) ? (task.target_projects || task.targetProjects).map(text) : []),
        ].filter(Boolean))),
        recoverable: true,
        contentStored: false,
    };
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
    const mode = lower(workflowDecision.mode);
    const continuationKind = lower(workflowDecision.continuationKind || workflowDecision.continuation_kind || "new_task");
    const confidence = Math.max(0, Math.min(1, Number(workflowDecision.confidence || 0)));
    const candidates = input.candidates || [];
    const candidate = candidates.length === 1 ? candidates[0] : null;
    if (["answer", "project_analysis"].includes(mode) && workflowDecision.actionRequired !== true) {
        return { decision: "answer", confidence, candidate: null, reason: text(workflowDecision.reason || "这条消息只需要回答") };
    }
    if (continuationKind === "new_task") {
        return { decision: "new_task", confidence, candidate: null, reason: text(workflowDecision.reason || "这是独立的新需求") };
    }
    // There is nothing to resume. Do not ask the user to distinguish between
    // an old task and a new task when no safe old-task candidate exists. The
    // current message remains authoritative: action requests start a new task,
    // while read-only/conversational requests stay as answers.
    if (candidates.length === 0) {
        const actionRequired = workflowDecision.actionRequired === true
            || workflowDecision.requiresCodeChanges === true
            || ["execute", "execute_direct", "plan_task", "decompose_epic"].includes(mode);
        return actionRequired
            ? { decision: "new_task", confidence, candidate: null, reason: text(workflowDecision.reason || "当前没有需要续接的旧任务，将按新需求处理") }
            : { decision: "answer", confidence, candidate: null, reason: text(workflowDecision.reason || "当前消息只需要直接回答") };
    }
    if (candidate && confidence >= exports.CONVERSATION_AUTO_RESUME_CONFIDENCE && !targetExpanded(workflowDecision, candidate)) {
        return {
            decision: continuationKind === "revise_goal" ? "revise_task" : "resume_task",
            confidence,
            candidate,
            reason: text(workflowDecision.reason || "消息与可恢复任务目标一致"),
        };
    }
    return {
        decision: "needs_user",
        confidence,
        candidate: candidate || candidates[0] || null,
        reason: candidates.length > 1
            ? "当前会话中存在多个可恢复任务，需要你确认这条消息的处理方式"
            : !candidate
                ? "这条消息像是续接要求，但当前没有唯一可安全恢复的任务"
                : targetExpanded(workflowDecision, candidate)
                    ? "这条消息扩大了原任务的项目范围，需要你确认是否作为新任务"
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
        thresholdResumes: decideConversationMessageRoute({ workflowDecision: decision(0.72), candidates: [candidate] }).decision === "resume_task",
        multipleCandidatesNeedUser: decideConversationMessageRoute({ workflowDecision: decision(0.99), candidates: [candidate, { ...candidate, id: "task-other" }] }).decision === "needs_user",
        expandedTargetNeedsUser: decideConversationMessageRoute({ workflowDecision: decision(0.99, { targetRefs: [{ scope: "project", scopeId: "project-b" }] }), candidates: [candidate] }).decision === "needs_user",
        explicitNewTaskStaysNew: decideConversationMessageRoute({ workflowDecision: decision(0.99, { continuationKind: "new_task" }), candidates: [candidate] }).decision === "new_task",
        answerDoesNotCreateTask: decideConversationMessageRoute({ workflowDecision: decision(0.99, { mode: "answer", actionRequired: false }), candidates: [candidate] }).decision === "answer",
        noCandidateActionStartsNewTask: decideConversationMessageRoute({ workflowDecision: decision(0.2), candidates: [] }).decision === "new_task",
        noCandidateReadOnlyAnswers: decideConversationMessageRoute({ workflowDecision: decision(0.2, { mode: "project_analysis", actionRequired: false }), candidates: [] }).decision === "answer",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=conversation-message-routing.js.map