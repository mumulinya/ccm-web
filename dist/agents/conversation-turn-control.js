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
exports.conversationTurnControl = exports.ConversationTurnControlStore = void 0;
exports.registerGlobalConversationPauseDispatcher = registerGlobalConversationPauseDispatcher;
exports.admitTaskDispatchTurn = admitTaskDispatchTurn;
exports.reconcileTaskDispatchTurns = reconcileTaskDispatchTurns;
exports.startWebConversationTurnRecoveryForServer = startWebConversationTurnRecoveryForServer;
exports.stopWebConversationTurnRecoveryForServer = stopWebConversationTurnRecoveryForServer;
exports.handleConversationTurnControlApi = handleConversationTurnControlApi;
exports.runConversationTurnControlSelfTest = runConversationTurnControlSelfTest;
const crypto = __importStar(require("crypto"));
const conversation_turn_observation_api_1 = require("./conversation-turn-observation-api");
const project_queued_turn_request_1 = require("./project-queued-turn-request");
const project_conversation_intake_1 = require("./project-conversation-intake");
const conversation_attempt_1 = require("./conversation-attempt");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const db_1 = require("../core/db");
const runtime_events_1 = require("../system/runtime-events");
const secure_multipart_1 = require("../system/secure-multipart");
const access_policy_1 = require("../modules/system/access-policy");
const internal_api_auth_1 = require("../modules/system/internal-api-auth");
const project_session_agent_binding_1 = require("../modules/projects/project-session-agent-binding");
const storage_1 = require("../modules/collaboration/storage");
const api_access_control_1 = require("../modules/system/api-access-control");
const conversation_event_journal_1 = require("./conversation-event-journal");
const task_conversation_binding_1 = require("./task-conversation-binding");
const STORE_FILE = process.env.CCM_CONVERSATION_TURN_FILE || path.join(utils_1.CCM_DIR, "conversation-turn-control.json");
const MAX_RECORDS = 800;
const TERMINAL_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["queued", "sending", "pausing", "paused", "resuming", "needs_route"]);
let globalPauseDispatcher = null;
function registerGlobalConversationPauseDispatcher(dispatcher) {
    globalPauseDispatcher = dispatcher;
}
const TERMINAL_STATUSES = new Set(["applied", "completed", "failed", "cancelled"]);
function nowIso() {
    return new Date().toISOString();
}
function normalizeScope(value) {
    const scope = String(value || "").trim().toLowerCase();
    if (["global", "group", "project", "feishu"].includes(scope))
        return scope;
    throw new Error("不支持的会话范围");
}
function normalizeMode(value) {
    const mode = String(value || "queue").trim().toLowerCase();
    if (mode === "steer" || mode === "queue")
        return mode;
    throw new Error("消息模式必须是 steer 或 queue");
}
function normalizeKind(value) {
    return String(value || "user_message").trim() === "task_dispatch" ? "task_dispatch" : "user_message";
}
function normalizeSource(value) {
    const source = String(value || "web").trim().toLowerCase();
    return (["web", "workbench", "global_agent", "schedule"].includes(source) ? source : "web");
}
function queueConflict(message = "队列状态已经变化，请刷新后重试") {
    const error = new Error(message);
    error.code = "QUEUE_REVISION_CONFLICT";
    error.statusCode = 409;
    return error;
}
function steerConflict(message = "当前没有可追加的活动执行，请改为排队等待") {
    const error = new Error(message);
    error.code = "STEER_TARGET_UNAVAILABLE";
    error.statusCode = 409;
    return error;
}
function guideError(code, message, statusCode = 409) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}
function validateGuideContinuationTask(turn, continuationTaskId) {
    const taskId = String(continuationTaskId || "").trim();
    if (!taskId)
        return null;
    if (!["group", "project"].includes(turn.scope)) {
        throw guideError("GUIDE_TARGET_SCOPE_MISMATCH", "当前会话不支持绑定项目任务");
    }
    const task = ((0, db_1.loadTasks)() || []).find((item) => String(item?.id || "") === taskId);
    if (!task)
        throw guideError("GUIDE_TARGET_STALE", "要继续的任务已经不存在，请重新选择处理方式");
    const terminal = ["done", "completed", "success", "accepted", "cancelled", "canceled", "archived"]
        .includes(String(task?.status || "").trim().toLowerCase())
        || ["accepted", "terminal_gate_passed"].includes(String(task?.acceptance_state || task?.acceptanceState || "").trim().toLowerCase())
        || task?.archived === true
        || Boolean(task?.deleted_at || task?.deletedAt);
    if (terminal)
        throw guideError("GUIDE_TARGET_STALE", "要继续的任务已经结束，请作为新任务或普通问题处理");
    const separator = turn.conversation_id.indexOf(":");
    const scopeId = separator >= 0 ? turn.conversation_id.slice(0, separator) : turn.conversation_id;
    const exactSessionId = separator >= 0 ? turn.conversation_id.slice(separator + 1) : "";
    const taskScopeId = turn.scope === "group"
        ? String(task?.group_id || task?.groupId || "")
        : String(task?.target_project || task?.targetProject || task?.project || "");
    const taskSessionId = turn.scope === "group"
        ? String(task?.group_session_id || task?.groupSessionId || "")
        : String(task?.project_session_id || task?.projectSessionId || "");
    if (!scopeId || !exactSessionId || taskScopeId !== scopeId || taskSessionId !== exactSessionId) {
        throw guideError("GUIDE_TARGET_SCOPE_MISMATCH", "要继续的任务不属于当前会话");
    }
    return task;
}
function requireExpectedRevision(turn, expected) {
    if (expected == null || expected === "")
        return;
    if (turn.revision !== Number(expected))
        throw queueConflict();
}
function emitTurnChanged(turn, operation) {
    const turnId = turn.id;
    const attemptId = (0, conversation_attempt_1.conversationAttemptId)(turn);
    const status = turn.status;
    const messageId = String(turn.metadata?.original_message_id || turn.request_id || "");
    queueMicrotask(() => {
        try {
            (0, conversation_event_journal_1.appendConversationEvent)(turnId, attemptId, {
                type: ["completed", "failed", "cancelled"].includes(status) ? "execution_terminal" : "turn_status",
                status, operation, message_id: messageId,
            });
        }
        catch (error) {
            console.warn(`[会话事件] ${turnId}: ${error?.message || error}`);
        }
    });
    (0, runtime_events_1.publishRuntimeEvent)("system", "conversation.turn.changed", {
        id: turn.id,
        taskId: turn.task_id,
        sessionId: turn.conversation_id,
        source: turn.source,
        status: turn.status,
        message_id: String(turn.metadata?.original_message_id || turn.request_id || ''),
        operation,
        revision: turn.revision,
        attempt_id: (0, conversation_attempt_1.conversationAttemptId)(turn),
        scope: turn.scope,
    });
}
function normalizeRouting(input) {
    if (!input || typeof input !== "object")
        return null;
    const decision = String(input.decision || "needs_user");
    if (!["answer", "new_task", "resume_task", "revise_task", "needs_user"].includes(decision))
        return null;
    const selectedChoice = String(input.selectedChoice || input.selected_choice || "");
    const routeKindByDecision = {
        answer: "answer_only",
        new_task: "start_new_task",
        resume_task: "resume_existing_task",
        revise_task: "revise_existing_task",
        needs_user: "needs_user",
    };
    const rawRouteKind = String(input.routeKind || input.route_kind || routeKindByDecision[decision] || "needs_user");
    const routeKind = (["answer_only", "continue_current_session", "resume_existing_task", "revise_existing_task", "start_new_task", "needs_user"].includes(rawRouteKind)
        ? rawRouteKind : routeKindByDecision[decision]);
    const confidence = Math.max(0, Math.min(1, Number(input.confidence || 0)));
    const confidenceBand = confidence >= 0.85 ? "high" : confidence >= 0.72 ? "medium" : "low";
    const rawContinuationKind = String(input.continuationKind || input.continuation_kind || (decision === "new_task" || decision === "answer" ? "new_task" : decision === "revise_task" ? "revise_goal" : "supplement"));
    return {
        decision: decision,
        routeKind,
        candidateTaskId: String(input.candidateTaskId || input.candidate_task_id || ""),
        candidateTaskIds: Array.from(new Set((Array.isArray(input.candidateTaskIds || input.candidate_task_ids)
            ? (input.candidateTaskIds || input.candidate_task_ids) : [input.candidateTaskId || input.candidate_task_id])
            .map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 12),
        candidateSummaries: (Array.isArray(input.candidateSummaries || input.candidate_summaries)
            ? (input.candidateSummaries || input.candidate_summaries) : []).slice(0, 6).map((item) => ({
            taskId: String(item?.taskId || item?.task_id || ""),
            title: String(item?.title || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 160),
            status: String(item?.status || "").slice(0, 40),
            ...(["active", "recoverable", "completed"].includes(String(item?.candidateKind || item?.candidate_kind || "")) ? { candidateKind: String(item.candidateKind || item.candidate_kind) } : {}),
            ...(item?.phase ? { phase: String(item.phase).slice(0, 80) } : {}),
            ...(Number.isFinite(Number(item?.attempt)) ? { attempt: Math.max(0, Number(item.attempt)) } : {}),
            ...(typeof item?.hasIncompleteWorkItems === "boolean" ? { hasIncompleteWorkItems: item.hasIncompleteWorkItems } : {}),
            ...(Array.isArray(item?.targetProjects) ? { targetProjects: item.targetProjects.map((project) => String(project || "")).filter(Boolean).slice(0, 8) } : {}),
            contentStored: false,
        })).filter((item) => item.taskId),
        activeTaskId: String(input.activeTaskId || input.active_task_id || ""),
        exactSessionId: String(input.exactSessionId || input.exact_session_id || ""),
        scope: (["global", "group", "project", "feishu"].includes(String(input.scope || "")) ? String(input.scope) : "global"),
        confidence,
        confidenceBand: (["high", "medium", "low"].includes(String(input.confidenceBand || input.confidence_band || "")) ? String(input.confidenceBand || input.confidence_band) : confidenceBand),
        continuationKind: (["new_task", "supplement", "revise_goal"].includes(rawContinuationKind) ? rawContinuationKind : "new_task"),
        reason: String(input.reason || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240),
        bindingChecksum: String(input.bindingChecksum || input.binding_checksum || ""),
        ...(selectedChoice ? { selectedChoice: selectedChoice } : {}),
        ...(input.source ? { source: String(input.source) } : {}),
        contentStored: false,
    };
}
function routeBindingChecksum(turn, candidateTaskId, candidateTaskIds) {
    return crypto.createHash("sha256").update(JSON.stringify({
        turnId: turn.id,
        requestId: turn.request_id,
        scope: turn.scope,
        conversationId: turn.conversation_id,
        candidateTaskId,
        ...(candidateTaskIds ? { candidateTaskIds: Array.from(new Set(candidateTaskIds.filter(Boolean))).sort() } : {}),
        messageChecksum: crypto.createHash("sha256").update(turn.message).digest("hex"),
    })).digest("hex");
}
function publicTurnProjection(turn, position = 0, viewerUserId = "", viewerRole = "") {
    const messagePreview = String(turn.message || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
    const attachmentRefs = turn.attachments.map((item) => ({
        id: String(item?.id || item?.attachment_id || item?.attachmentId || ""),
        name: String(item?.name || item?.filename || "").slice(0, 160),
        size: Math.max(0, Number(item?.size || 0)),
        checksum: String(item?.checksum || "").slice(0, 128),
        contentType: String(item?.contentType || item?.content_type || item?.mimeType || "application/octet-stream").slice(0, 120),
        url: item?.id ? `/api/conversation-turns/attachment?turn_id=${encodeURIComponent(turn.id)}&attachment_id=${encodeURIComponent(String(item.id))}` : "",
    })).filter((item) => item.id || item.name);
    const status = String(turn.status || "").toLowerCase();
    const attemptId = (0, conversation_attempt_1.conversationAttemptId)(turn);
    const failed = status === "failed";
    const paused = ["paused", "interrupted"].includes(status);
    const active = ["queued", "sending", "pausing", "resuming"].includes(status);
    const availableActions = (0, conversation_attempt_1.conversationTurnActions)(turn, viewerRole === "admin" || !turn.owner_id || (!!viewerUserId && turn.owner_id === viewerUserId));
    return {
        id: turn.id,
        revision: turn.revision,
        scope: turn.scope,
        conversation_id: turn.conversation_id,
        kind: turn.kind,
        source: turn.source,
        task_id: turn.task_id,
        mission_id: turn.mission_id,
        occurrence_id: turn.occurrence_id,
        mode: turn.mode,
        status: turn.status,
        conversation_state: failed ? "failed" : paused ? "paused" : active ? "running" : ["completed", "cancelled"].includes(status) ? "completed" : "idle",
        execution_state: status,
        attempt_id: attemptId,
        ...(turn.active_run_id ? { active_run_id: String(turn.active_run_id) } : {}),
        available_actions: availableActions,
        messagePreview,
        message_id: String(turn.metadata?.original_message_id || turn.request_id || ""),
        attachmentRefs,
        position,
        retry_count: turn.retry_count,
        recovery_count: turn.recovery_count,
        error: String(turn.error || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240),
        created_at: turn.created_at,
        updated_at: turn.updated_at,
        contentStored: false,
        canMutate: viewerRole === "admin" || !turn.owner_id || (!!viewerUserId && turn.owner_id === viewerUserId),
        ...(turn.metadata?.continuation_task_id ? { continuation_task_id: String(turn.metadata.continuation_task_id) } : {}),
        ...(turn.metadata?.conversation_control ? { conversationControl: { ...turn.metadata.conversation_control, contentStored: false } } : {}),
        ...(turn.routing ? { routing: { ...turn.routing, contentStored: false } } : {}),
    };
}
function editableTurnProjection(turn, viewerUserId = "", viewerRole = "") {
    const projection = publicTurnProjection(turn, 0, viewerUserId, viewerRole);
    return {
        ...projection,
        message: String(turn.message || ""),
        contentStored: false,
    };
}
function adoptQueuedAttachments(files) {
    return (files || []).map((file) => {
        const savedPath = String(file?.savedPath || "");
        const content = fs.readFileSync(savedPath);
        return {
            id: `qatt_${crypto.randomBytes(12).toString("hex")}`,
            name: String(file?.filename || "附件").slice(0, 160),
            filename: String(file?.filename || "附件").slice(0, 160),
            size: Math.max(0, Number(file?.size || content.length)),
            checksum: crypto.createHash("sha256").update(content).digest("hex"),
            contentType: String(file?.contentType || "application/octet-stream").slice(0, 120),
            savedPath,
        };
    });
}
function cleanupTurnAttachments(turn) {
    (0, secure_multipart_1.cleanupSecureMultipartFiles)((turn.attachments || []).map((item) => ({ savedPath: item?.savedPath || item?.path || "" })));
}
function publicClaimProjection(turn) {
    if (!turn)
        return null;
    const safeMetadataKeys = [
        "project", "session_id", "parent_run_id", "continuation_task_id", "requested_mode",
        "group_id", "group_session_id", "message_mode", "target_refs",
        "resolved_route", "resolved_candidate_task_id", "route_source",
        "direct_execution", "original_message_id",
    ];
    const metadata = Object.fromEntries(safeMetadataKeys
        .filter((key) => turn.metadata?.[key] != null)
        .map((key) => [key, turn.metadata[key]]));
    return {
        ...publicTurnProjection(turn),
        message: turn.message,
        metadata,
    };
}
function authorizeConversationAccess(req, res, scope, conversationId, required = "use") {
    const normalizedScope = String(scope || "").toLowerCase();
    const id = String(conversationId || "").split(":")[0];
    if (normalizedScope === "project" && id)
        return (0, access_policy_1.authorizeResource)(req, res, "project", id, required);
    if (normalizedScope === "group" && id)
        return (0, access_policy_1.authorizeResource)(req, res, "group", id, required);
    return true;
}
function authorizeTurnMutation(req, res, payload) {
    let scope = payload?.scope;
    let conversationId = payload?.conversation_id || payload?.conversationId;
    let turn;
    if (payload?.id) {
        turn = exports.conversationTurnControl.getInternal(String(payload.id));
        scope = turn?.scope;
        conversationId = turn?.conversation_id;
    }
    const required = turn?.kind === "task_dispatch" && String(payload?.operation || "cancel") === "cancel" ? "manage" : "use";
    if (!authorizeConversationAccess(req, res, scope, conversationId, required))
        return false;
    const principal = req?.ccmAuth;
    if (turn?.kind === "user_message" && turn.owner_id && principal?.kind === "browser"
        && principal.role !== "admin" && turn.owner_id !== principal.userId) {
        (0, utils_1.sendJson)(res, { success: false, error: "只能操作自己提交的待处理消息", code: "QUEUE_OWNER_CONFLICT" }, 403);
        return false;
    }
    return true;
}
function normalizeHttpEnqueuePayload(req, payload) {
    const principal = req?.ccmAuth;
    if (principal?.kind !== "browser")
        return payload;
    return {
        ...payload,
        kind: "user_message",
        source: "web",
        task_id: "",
        mission_id: "",
        occurrence_id: "",
        owner_id: String(principal.userId || ""),
    };
}
function emptyStore() {
    return { schema: "ccm-conversation-turn-control-v2", generation: 0, updated_at: nowIso(), turns: [] };
}
function normalizeRecord(input) {
    try {
        const scope = normalizeScope(input?.scope);
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        const id = String(input?.id || "").trim();
        if (!conversationId || !id)
            return null;
        const status = String(input?.status || "queued");
        return {
            id,
            revision: Math.max(1, Math.floor(Number(input?.revision || 1))),
            request_id: String(input?.request_id || input?.requestId || id),
            scope,
            conversation_id: conversationId,
            mode: normalizeMode(input?.mode),
            kind: normalizeKind(input?.kind),
            source: normalizeSource(input?.source),
            task_id: String(input?.task_id || input?.taskId || input?.metadata?.task_id || ""),
            mission_id: String(input?.mission_id || input?.missionId || input?.metadata?.mission_id || ""),
            occurrence_id: String(input?.occurrence_id || input?.occurrenceId || input?.metadata?.occurrence_id || ""),
            owner_id: String(input?.owner_id || input?.ownerId || ""),
            message: String(input?.message || ""),
            attachments: Array.isArray(input?.attachments) ? input.attachments : [],
            status: (["queued", "sending", "pausing", "paused", "resuming", "interrupted", "needs_route", "applied", "completed", "failed", "cancelled"].includes(status) ? status : "queued"),
            active_run_id: String(input?.active_run_id || input?.activeRunId || ""),
            metadata: input?.metadata && typeof input.metadata === "object" ? input.metadata : {},
            retry_count: Math.max(0, Number(input?.retry_count || input?.retryCount || 0)),
            recovery_count: Math.max(0, Number(input?.recovery_count || input?.recoveryCount || 0)),
            error: String(input?.error || ""),
            result: input?.result ?? null,
            created_at: String(input?.created_at || input?.createdAt || nowIso()),
            updated_at: String(input?.updated_at || input?.updatedAt || input?.created_at || nowIso()),
            claimed_at: String(input?.claimed_at || input?.claimedAt || ""),
            settled_at: String(input?.settled_at || input?.settledAt || ""),
            lease_id: String(input?.lease_id || input?.leaseId || ""),
            lease_expires_at: String(input?.lease_expires_at || input?.leaseExpiresAt || ""),
            run_id: String(input?.run_id || input?.runId || input?.active_run_id || input?.activeRunId || ""),
            checkpoint: String(input?.checkpoint || "queued"),
            semantic_decision_receipt: input?.semantic_decision_receipt || input?.semanticDecisionReceipt || null,
            routing: normalizeRouting({ ...(input?.routing || {}), scope, exactSessionId: conversationId }),
        };
    }
    catch {
        return null;
    }
}
function compactTurns(turns) {
    const cutoff = Date.now() - TERMINAL_RETENTION_MS;
    const retained = turns.filter((turn) => {
        if (!TERMINAL_STATUSES.has(turn.status))
            return true;
        const settledAt = Date.parse(turn.settled_at || turn.updated_at || turn.created_at);
        const keep = !Number.isFinite(settledAt) || settledAt >= cutoff;
        if (!keep)
            cleanupTurnAttachments(turn);
        return keep;
    });
    if (retained.length <= MAX_RECORDS)
        return retained;
    const active = retained.filter((turn) => ACTIVE_STATUSES.has(turn.status));
    const terminal = retained.filter((turn) => !ACTIVE_STATUSES.has(turn.status));
    const terminalStart = Math.max(0, terminal.length - Math.max(0, MAX_RECORDS - active.length));
    terminal.slice(0, terminalStart).forEach(cleanupTurnAttachments);
    return [...active, ...terminal.slice(terminalStart)];
}
class ConversationTurnControlStore {
    file;
    constructor(file = STORE_FILE) {
        this.file = file;
    }
    read() {
        const raw = (0, atomic_json_file_1.readJsonWithBackup)(this.file, emptyStore());
        return {
            schema: "ccm-conversation-turn-control-v2",
            generation: Math.max(0, Number(raw?.generation || 0)),
            updated_at: String(raw?.updated_at || nowIso()),
            turns: (Array.isArray(raw?.turns) ? raw.turns : []).map(normalizeRecord).filter(Boolean),
        };
    }
    mutate(operation) {
        return (0, atomic_json_file_1.withFileLock)(this.file, () => {
            const store = this.read();
            const result = operation(store);
            store.generation += 1;
            store.updated_at = nowIso();
            store.turns = compactTurns(store.turns);
            (0, atomic_json_file_1.writeJsonAtomic)(this.file, store);
            return result;
        });
    }
    recoverInterrupted() {
        let recovered = 0;
        const turns = this.mutate((store) => {
            const at = nowIso();
            store.turns = store.turns.map((turn) => {
                if (!["sending", "pausing", "resuming"].includes(turn.status) || turn.kind === "task_dispatch")
                    return turn;
                recovered += 1;
                return {
                    ...turn,
                    status: "interrupted",
                    revision: turn.revision + 1,
                    error: "服务重启中断了本次执行，请核对执行结果后重试",
                    updated_at: at,
                    claimed_at: "",
                    lease_id: "",
                    lease_expires_at: "",
                    checkpoint: "recovery_required",
                };
            });
            return store.turns;
        });
        return { recovered, turns };
    }
    enqueue(input, beforeAdmit, options = {}) {
        const scope = normalizeScope(input?.scope);
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        const message = String(input?.message || "").trim();
        const attachments = Array.isArray(input?.attachments) ? input.attachments : [];
        if (!conversationId)
            throw new Error("缺少会话 ID");
        if (!message && attachments.length === 0)
            throw new Error("消息和附件不能同时为空");
        const mode = normalizeMode(input?.mode);
        const newTopic = input?.metadata?.new_topic === true;
        const pendingTask = !newTopic && mode === "queue" && !input?.metadata?.continuation_task_id
            ? (0, task_conversation_binding_1.pendingTaskForConversation)(scope, conversationId) : null;
        const requestId = String(input?.request_id || input?.requestId || crypto.randomUUID()).trim();
        const result = this.mutate((store) => {
            const duplicate = store.turns.find((turn) => turn.scope === scope
                && turn.conversation_id === conversationId
                && turn.request_id === requestId);
            if (duplicate)
                return { turn: duplicate, duplicate: true };
            if (mode === "steer") {
                const active = store.turns
                    .filter((turn) => turn.scope === scope && turn.conversation_id === conversationId
                    && ["sending", "pausing", "resuming"].includes(turn.status)
                    && turn.kind === "user_message")
                    .sort((left, right) => Date.parse(right.updated_at || right.created_at) - Date.parse(left.updated_at || left.created_at))[0];
                const activeRunId = String(input?.active_run_id || input?.activeRunId || "");
                const attemptId = String(input?.attempt_id || input?.attemptId || "");
                if (!active || !activeRunId || active.active_run_id !== activeRunId)
                    throw steerConflict();
                if (!attemptId || attemptId !== (0, conversation_attempt_1.conversationAttemptId)(active))
                    throw steerConflict("当前执行身份已经变化，请刷新后重试");
            }
            const at = nowIso();
            const turn = {
                id: `cturn_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
                revision: 1,
                request_id: requestId,
                scope,
                conversation_id: conversationId,
                mode,
                kind: normalizeKind(input?.kind),
                source: normalizeSource(input?.source),
                task_id: String(input?.task_id || input?.taskId || input?.metadata?.task_id || pendingTask?.id || ""),
                mission_id: String(input?.mission_id || input?.missionId || input?.metadata?.mission_id || ""),
                occurrence_id: String(input?.occurrence_id || input?.occurrenceId || input?.metadata?.occurrence_id || ""),
                owner_id: String(input?.owner_id || input?.ownerId || ""),
                message,
                attachments,
                status: "queued",
                active_run_id: String(input?.active_run_id || input?.activeRunId || ""),
                metadata: {
                    ...(input?.metadata && typeof input.metadata === "object" ? input.metadata : {}),
                    ...(pendingTask ? { discussion_task_id: pendingTask.id } : {}),
                    ...(newTopic ? { resolved_route: "start_new_task", discussion_task_id: "" } : {}),
                    ...(mode === "steer" ? {
                        requested_mode: "steer",
                        steer_attempt_id: String(input?.attempt_id || input?.attemptId || ""),
                    } : {}),
                },
                retry_count: 0,
                recovery_count: 0,
                error: "",
                result: null,
                created_at: at,
                updated_at: at,
                claimed_at: "",
                settled_at: "",
                lease_id: "",
                lease_expires_at: "",
                run_id: "",
                checkpoint: "queued",
                semantic_decision_receipt: input?.semantic_decision_receipt || input?.semanticDecisionReceipt || null,
                routing: null,
            };
            // Project history persistence is performed after releasing this lock.
            // Mark it pending so the executor cannot claim a turn whose user message
            // has not reached the authoritative session history yet.
            if (beforeAdmit && options.deferBeforeAdmit && scope === "project" && turn.source === "web" && turn.kind === "user_message") {
                turn.metadata.intake_persistence = "pending";
            }
            else if (beforeAdmit) {
                beforeAdmit(turn);
            }
            store.turns.push(turn);
            emitTurnChanged(turn, "enqueue");
            return { turn, duplicate: false };
        });
        if (!result.duplicate && beforeAdmit && options.deferBeforeAdmit && result.turn.metadata?.intake_persistence === "pending") {
            const queuedTurn = result.turn;
            queueMicrotask(() => {
                try {
                    beforeAdmit(queuedTurn);
                    this.markIntakePersistence(queuedTurn.id, queuedTurn.revision, "ready");
                }
                catch (error) {
                    this.markIntakePersistence(queuedTurn.id, queuedTurn.revision, "failed", error?.message || String(error));
                }
            });
        }
        return result;
    }
    edit(input, beforeCommit, options = {}) {
        const id = String(input?.id || "").trim();
        if (!id)
            throw new Error("缺少队列消息 ID");
        const result = this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            if (turn.status !== "queued")
                throw queueConflict("这条消息已经开始处理，不能再编辑");
            if (turn.kind !== "user_message")
                throw queueConflict("任务派发消息不能在队列中编辑");
            const message = String(input?.message ?? "").trim();
            if (!message && turn.attachments.length === 0)
                throw new Error("消息和附件不能同时为空");
            if (message === turn.message)
                throw queueConflict("消息内容没有变化");
            const metadata = { ...(turn.metadata || {}) };
            delete metadata.resolved_route;
            delete metadata.resolved_candidate_task_id;
            delete metadata.route_source;
            delete metadata.resolvedRoute;
            delete metadata.resolvedCandidateTaskId;
            delete metadata.routeSource;
            turn.message = message;
            turn.revision += 1;
            turn.routing = null;
            turn.metadata = metadata;
            if (beforeCommit && options.deferBeforeCommit && turn.scope === "project" && turn.source === "web") {
                turn.metadata.intake_persistence = "pending";
            }
            else if (beforeCommit) {
                beforeCommit(turn);
            }
            turn.error = "";
            turn.updated_at = nowIso();
            turn.checkpoint = "edited";
            emitTurnChanged(turn, "edit");
            return turn;
        });
        if (beforeCommit && options.deferBeforeCommit && result?.scope === "project" && result.metadata?.intake_persistence === "pending") {
            const editedTurn = result;
            queueMicrotask(() => {
                try {
                    beforeCommit(editedTurn);
                    this.markIntakePersistence(editedTurn.id, editedTurn.revision, "ready");
                }
                catch (error) {
                    this.markIntakePersistence(editedTurn.id, editedTurn.revision, "failed", error?.message || String(error));
                }
            });
        }
        return result;
    }
    list(input = {}) {
        const scope = input?.scope ? normalizeScope(input.scope) : null;
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        const statuses = new Set(String(input?.statuses || input?.status || "")
            .split(",").map((value) => value.trim()).filter(Boolean));
        const limit = Math.max(1, Math.min(500, Number(input?.limit || 120)));
        const store = this.read();
        const filtered = store.turns.filter((turn) => (!scope || turn.scope === scope)
            && (!conversationId || turn.conversation_id === conversationId)
            && (!statuses.size || statuses.has(turn.status)));
        const queuePositions = new Map();
        const turns = filtered.slice(-limit).map((turn) => {
            const key = `${turn.scope}\u0000${turn.conversation_id}`;
            let position = 0;
            if (turn.status === "queued") {
                position = (queuePositions.get(key) || 0) + 1;
                queuePositions.set(key, position);
            }
            return publicTurnProjection(turn, position, String(input?._viewer_user_id || ""), String(input?._viewer_role || ""));
        });
        return { generation: store.generation, updated_at: store.updated_at, turns };
    }
    /** Server-only view used by queue executors. Never return this projection from an HTTP API. */
    listInternal(input = {}) {
        const scope = input?.scope ? normalizeScope(input.scope) : null;
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        const statuses = new Set(String(input?.statuses || input?.status || "")
            .split(",").map((value) => value.trim()).filter(Boolean));
        const limit = Math.max(1, Math.min(500, Number(input?.limit || 120)));
        const store = this.read();
        const turns = store.turns.filter((turn) => (!scope || turn.scope === scope)
            && (!conversationId || turn.conversation_id === conversationId)
            && (!statuses.size || statuses.has(turn.status)))
            .slice(-limit);
        return { generation: store.generation, updated_at: store.updated_at, turns };
    }
    getInternal(id) {
        const turnId = String(id || "").trim();
        if (!turnId)
            return null;
        return this.read().turns.find((item) => item.id === turnId) || null;
    }
    /** Conditionally finalize asynchronous project-history intake. */
    markIntakePersistence(id, expectedRevision, state, error = "") {
        return this.mutate((store) => {
            const turn = store.turns.find(item => item.id === String(id || ""));
            if (!turn || turn.revision !== Number(expectedRevision || 0))
                return null;
            if (turn.metadata?.intake_persistence !== "pending")
                return turn;
            turn.metadata = { ...(turn.metadata || {}), intake_persistence: state };
            turn.error = state === "failed" ? String(error || "项目消息写入会话历史失败") : "";
            turn.updated_at = nowIso();
            turn.checkpoint = state === "ready" ? "intake_ready" : "intake_failed";
            if (state === "failed")
                turn.status = "failed";
            emitTurnChanged(turn, `intake_${state}`);
            return turn;
        });
    }
    control(input) {
        const id = String(input?.id || "").trim();
        const action = String(input?.action || "").trim().toLowerCase();
        if (!id || !["pause", "resume"].includes(action))
            throw new Error("缺少有效的会话回合控制动作");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn || turn.kind !== "user_message")
                throw new Error("普通会话回合不存在");
            (0, conversation_attempt_1.requireConversationAttempt)(turn, input);
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            const current = turn.status;
            if (action === "pause") {
                if (!["sending", "resuming", "pausing"].includes(current))
                    throw queueConflict("当前普通会话不在可暂停状态");
                turn.status = "pausing";
                turn.metadata = {
                    ...(turn.metadata || {}),
                    conversation_control: {
                        state: "pausing",
                        requested_at: nowIso(),
                        resumable: false,
                        contentStored: false,
                    },
                };
            }
            else {
                if (!["paused", "interrupted"].includes(current))
                    throw queueConflict("当前普通会话不在可恢复状态");
                // A resumed ordinary turn is queued for the existing executor to
                // claim again.  The metadata keeps the user-visible resuming state
                // until the next claim, without creating a second user message.
                turn.status = "queued";
                turn.recovery_count += 1;
                turn.lease_id = "";
                turn.lease_expires_at = "";
                turn.metadata = { ...(turn.metadata || {}), conversation_control: { ...(turn.metadata?.conversation_control || {}), state: "resuming", resumable: true, contentStored: false } };
            }
            turn.revision += 1;
            turn.updated_at = nowIso();
            emitTurnChanged(turn, action);
            return turn;
        });
    }
    pauseAtBoundary(id, attemptId, checkpoint) {
        return this.mutate((store) => {
            const turn = store.turns.find(item => item.id === id);
            if (!turn)
                throw (0, conversation_attempt_1.attemptConflict)();
            (0, conversation_attempt_1.requireConversationAttempt)(turn, { attempt_id: attemptId }, true);
            if (turn.status !== "pausing")
                return turn;
            turn.status = "paused";
            turn.checkpoint = checkpoint;
            turn.revision += 1;
            turn.updated_at = nowIso();
            turn.lease_id = "";
            turn.lease_expires_at = "";
            turn.metadata = { ...(turn.metadata || {}), conversation_control: {
                    ...(turn.metadata?.conversation_control || {}), state: "paused", stage: checkpoint,
                    checkpointRevision: turn.revision, resumable: true, contentStored: false,
                } };
            emitTurnChanged(turn, "pause_confirmed");
            return turn;
        });
    }
    claim(input) {
        const scope = normalizeScope(input?.scope);
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        if (!conversationId)
            throw new Error("缺少会话 ID");
        return this.mutate((store) => {
            const atMs = Date.now();
            for (const item of store.turns) {
                if (item.scope !== scope || item.conversation_id !== conversationId || item.status !== "sending")
                    continue;
                if (item.lease_expires_at && Date.parse(item.lease_expires_at) <= atMs) {
                    item.status = "interrupted";
                    item.revision += 1;
                    item.error = "执行租约过期，需核对副作用后再继续";
                    item.claimed_at = "";
                    item.lease_id = "";
                    item.lease_expires_at = "";
                    item.checkpoint = "recovery_required";
                    item.updated_at = nowIso();
                    emitTurnChanged(item, "lease_expired");
                }
            }
            const active = store.turns.find((item) => item.scope === scope
                && item.conversation_id === conversationId
                && ["sending", "pausing", "resuming", "needs_route"].includes(item.status)
                && item.kind === "user_message");
            if (active)
                return null;
            const requestedId = String(input?.id || "").trim();
            const turn = store.turns.find((item) => item.scope === scope
                && item.conversation_id === conversationId
                && item.status === "queued"
                && item.kind === "user_message"
                && (!requestedId || item.id === requestedId));
            if (!turn)
                return null;
            if (turn.metadata?.intake_persistence === "pending")
                return null;
            if (turn.metadata?.intake_persistence === "failed") {
                throw queueConflict("消息尚未成功写入会话历史，请重试发送");
            }
            (0, conversation_attempt_1.requireConversationAttempt)(turn, input);
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            const continuationTaskId = String(turn.metadata?.continuation_task_id || "").trim();
            if (continuationTaskId) {
                try {
                    validateGuideContinuationTask(turn, continuationTaskId);
                }
                catch (error) {
                    if (!["GUIDE_TARGET_STALE", "GUIDE_TARGET_SCOPE_MISMATCH"].includes(String(error?.code || "")))
                        throw error;
                    const metadata = { ...(turn.metadata || {}) };
                    delete metadata.continuation_task_id;
                    metadata.requested_mode = "queue";
                    turn.mode = "queue";
                    turn.status = "needs_route";
                    turn.revision += 1;
                    turn.routing = normalizeRouting({
                        decision: "needs_user",
                        routeKind: "needs_user",
                        candidateTaskId: "",
                        candidateTaskIds: [],
                        candidateSummaries: [],
                        activeTaskId: "",
                        exactSessionId: turn.conversation_id,
                        scope: turn.scope,
                        continuationKind: "new_task",
                        confidence: 0,
                        reason: error?.message || "原任务已不可继续，请选择如何处理这条消息",
                        bindingChecksum: routeBindingChecksum(turn, "", []),
                        source: "recovery_preflight",
                    });
                    turn.metadata = metadata;
                    turn.error = error?.message || "原任务已不可继续";
                    turn.updated_at = nowIso();
                    turn.claimed_at = "";
                    turn.lease_id = "";
                    turn.lease_expires_at = "";
                    turn.checkpoint = "guide_target_stale";
                    emitTurnChanged(turn, "guide_target_stale");
                    return null;
                }
            }
            turn.status = "sending";
            turn.revision += 1;
            turn.active_run_id = String(input?.active_run_id || input?.activeRunId || turn.active_run_id || "");
            turn.claimed_at = nowIso();
            turn.updated_at = turn.claimed_at;
            turn.lease_id = `lease_${crypto.randomBytes(12).toString("hex")}`;
            turn.lease_expires_at = new Date(Date.now() + Math.max(15_000, Math.min(15 * 60_000, Number(input?.lease_ms || input?.leaseMs || 13 * 60_000)))).toISOString();
            turn.checkpoint = "claimed";
            if (turn.metadata?.conversation_control?.state === "resuming") {
                turn.metadata = {
                    ...(turn.metadata || {}),
                    conversation_control: { ...(turn.metadata.conversation_control || {}), state: "running", stage: "provider_request", contentStored: false },
                };
            }
            turn.error = "";
            emitTurnChanged(turn, "claim");
            return turn;
        });
    }
    settle(input) {
        const id = String(input?.id || "").trim();
        const status = String(input?.status || "completed");
        if (!id)
            throw new Error("缺少队列消息 ID");
        if (!["applied", "completed", "failed", "cancelled"].includes(status))
            throw new Error("无效的完成状态");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            if ((0, conversation_attempt_1.validateConversationSettlement)(turn, { ...input, status }))
                return turn;
            if (!input?.attempt_id)
                requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            if (turn.status === "cancelled" && status !== "cancelled")
                throw new Error("已取消的消息不能再次完成");
            const at = nowIso();
            turn.status = status;
            turn.revision += 1;
            turn.error = String(input?.error || "");
            turn.result = input?.result ?? turn.result;
            turn.active_run_id = String(input?.active_run_id || input?.activeRunId || turn.active_run_id || "");
            turn.run_id = String(input?.run_id || input?.runId || turn.run_id || turn.active_run_id || "");
            turn.checkpoint = String(input?.checkpoint || status);
            if (input?.semantic_decision_receipt || input?.semanticDecisionReceipt)
                turn.semantic_decision_receipt = input.semantic_decision_receipt || input.semanticDecisionReceipt;
            turn.updated_at = at;
            turn.settled_at = at;
            turn.lease_id = "";
            turn.lease_expires_at = "";
            if (["applied", "completed", "cancelled"].includes(status))
                cleanupTurnAttachments(turn);
            emitTurnChanged(turn, "settle");
            return turn;
        });
    }
    defer(id, reason = "当前会话仍在执行，已保留到原队列", expectedRevision, attemptId = "") {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === String(id || ""));
            if (!turn)
                throw new Error("队列消息不存在");
            if (attemptId)
                (0, conversation_attempt_1.requireConversationAttempt)(turn, { attempt_id: attemptId }, true);
            requireExpectedRevision(turn, expectedRevision);
            if (turn.status !== "sending")
                throw new Error("只有已领取的消息可以退回队列");
            turn.status = "queued";
            turn.revision += 1;
            turn.error = String(reason || "");
            turn.updated_at = nowIso();
            turn.claimed_at = "";
            turn.lease_id = "";
            turn.lease_expires_at = "";
            turn.checkpoint = "deferred";
            emitTurnChanged(turn, "defer");
            return turn;
        });
    }
    requireRoute(input) {
        const id = String(input?.id || "").trim();
        if (!id)
            throw new Error("缺少队列消息 ID");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            (0, conversation_attempt_1.requireConversationAttempt)(turn, input);
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            if (!["sending", "needs_route"].includes(turn.status))
                throw queueConflict("这条消息当前不能进入路由确认");
            if (turn.kind !== "user_message")
                throw new Error("正式派发任务不参加消息意图确认");
            const candidateTaskId = String(input?.routing?.candidateTaskId || input?.routing?.candidate_task_id || "");
            const candidateTaskIds = Array.from(new Set((Array.isArray(input?.routing?.candidateTaskIds || input?.routing?.candidate_task_ids)
                ? (input.routing.candidateTaskIds || input.routing.candidate_task_ids) : [candidateTaskId])
                .map((item) => String(item || "").trim()).filter(Boolean)));
            const checksum = routeBindingChecksum(turn, candidateTaskId, candidateTaskIds);
            turn.status = "needs_route";
            turn.revision += 1;
            turn.routing = normalizeRouting({
                ...(input?.routing || {}),
                decision: "needs_user",
                candidateTaskId,
                candidateTaskIds,
                scope: turn.scope,
                exactSessionId: turn.conversation_id,
                bindingChecksum: checksum,
                source: "model",
            });
            turn.error = "";
            turn.updated_at = nowIso();
            turn.lease_id = "";
            turn.lease_expires_at = "";
            turn.checkpoint = "needs_route";
            emitTurnChanged(turn, "require_route");
            return turn;
        });
    }
    resolveRoute(input) {
        const id = String(input?.id || "").trim();
        const choice = String(input?.choice || "");
        if (!id)
            throw new Error("缺少队列消息 ID");
        if (!["continue_original", "start_new_task", "answer_only"].includes(String(choice)))
            throw new Error("无效的消息处理方式");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            if (turn.status !== "needs_route" || !turn.routing)
                throw queueConflict("这条消息已不再等待处理方式确认");
            const checksum = String(input?.bindingChecksum || input?.binding_checksum || "");
            if (!checksum || checksum !== turn.routing.bindingChecksum)
                throw queueConflict("消息与候选任务已经变化，请重新确认");
            const expected = routeBindingChecksum(turn, turn.routing.candidateTaskId, turn.routing.candidateTaskIds || []);
            const legacyExpected = routeBindingChecksum(turn, turn.routing.candidateTaskId);
            if (expected !== checksum && legacyExpected !== checksum)
                throw queueConflict("消息绑定校验失败，请重新确认");
            const requestedCandidateTaskId = String(input?.candidateTaskId || input?.candidate_task_id || turn.routing.candidateTaskId || "");
            if (choice === "continue_original") {
                const allowedCandidates = new Set(turn.routing.candidateTaskIds?.length ? turn.routing.candidateTaskIds : [turn.routing.candidateTaskId].filter(Boolean));
                if (!requestedCandidateTaskId || !allowedCandidates.has(requestedCandidateTaskId))
                    throw queueConflict("候选任务已变化，请重新确认");
            }
            turn.status = "queued";
            turn.revision += 1;
            const routeKind = choice === "answer_only" ? "answer_only"
                : choice === "start_new_task" ? "start_new_task"
                    : turn.routing.continuationKind === "revise_goal" ? "revise_existing_task"
                        : turn.routing.candidateSummaries.find(item => item.taskId === requestedCandidateTaskId)?.candidateKind === "active"
                            ? "continue_current_session" : "resume_existing_task";
            const decision = choice === "answer_only" ? "answer"
                : choice === "start_new_task" ? "new_task"
                    : routeKind === "revise_existing_task" ? "revise_task" : "resume_task";
            turn.routing = { ...turn.routing, decision, routeKind, candidateTaskId: requestedCandidateTaskId, activeTaskId: routeKind === "continue_current_session" ? requestedCandidateTaskId : "", selectedChoice: choice, source: "explicit_user_choice", contentStored: false };
            turn.metadata = {
                ...turn.metadata,
                resolved_route: choice,
                resolved_candidate_task_id: requestedCandidateTaskId,
                route_source: "explicit_user_choice",
            };
            turn.updated_at = nowIso();
            turn.claimed_at = "";
            turn.settled_at = "";
            turn.checkpoint = "route_resolved";
            emitTurnChanged(turn, "resolve_route");
            return turn;
        });
    }
    resolveIntent(input) {
        const id = String(input?.id || "").trim();
        const action = String(input?.action || "send").trim().toLowerCase();
        const message = String(input?.message || "").trim();
        const intentChoice = String(input?.intent_choice || input?.intentChoice || "").trim().toLowerCase();
        if (!id)
            throw new Error("缺少队列消息 ID");
        if (!["resume", "steer", "send"].includes(action))
            throw new Error("无效的恢复操作");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            (0, conversation_attempt_1.requireConversationAttempt)(turn, input);
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            const attemptId = String(turn.attempt_id || `${turn.id}:${turn.retry_count || 0}`);
            const binding = crypto.createHash("sha256").update(`${turn.id}|${turn.revision}|${attemptId}|${turn.scope}|${turn.conversation_id}`).digest("hex");
            const active = ["sending", "pausing", "resuming"].includes(turn.status);
            let decision = "new_turn";
            if (action === "steer")
                decision = "steer_original";
            else if (action === "resume" && !message)
                decision = "resume_original";
            else if (action === "resume" && message) {
                if (["supplement", "continue_original", "resume_original"].includes(intentChoice))
                    decision = "resume_with_instruction";
                else if (["new_task", "start_new_task", "answer_only"].includes(intentChoice))
                    decision = "new_turn";
                else {
                    // A typed Continue is ambiguous until the user explicitly chooses
                    // whether the text supplements the interrupted task or starts a new
                    // turn. Reuse the existing route card and do not send anything yet.
                    decision = "needs_route";
                    if (turn.status !== "needs_route") {
                        turn.status = "needs_route";
                        turn.revision += 1;
                        turn.routing = turn.routing || {
                            decision: "needs_user",
                            routeKind: "needs_user",
                            candidateTaskId: String(turn.metadata?.continuation_task_id || turn.task_id || ""),
                            candidateTaskIds: [],
                            candidateSummaries: [],
                            activeTaskId: String(turn.task_id || ""),
                            exactSessionId: String(turn.conversation_id || "").split(":").slice(1).join(":"),
                            scope: turn.scope,
                            confidence: 0,
                            confidenceBand: "low",
                            continuationKind: "supplement",
                            reason: "请确认这段输入是补充原任务，还是新问题",
                            bindingChecksum: routeBindingChecksum(turn, String(turn.metadata?.continuation_task_id || turn.task_id || "")),
                            source: "recovery_preflight",
                            contentStored: false,
                        };
                    }
                }
            }
            else if (action === "send" && active)
                decision = "queue";
            const parentRunId = decision === "steer_original" || decision === "resume_original"
                ? String(turn.active_run_id || turn.run_id || turn.metadata?.parent_run_id || "") : "";
            turn.metadata = {
                ...(turn.metadata || {}),
                intent_decision: decision,
                intent_source: "backend_rule",
                intent_message: message,
                ...(intentChoice ? { intent_choice: intentChoice } : {}),
                intent_binding_checksum: binding,
            };
            turn.updated_at = nowIso();
            emitTurnChanged(turn, "resolve_intent");
            return {
                decision,
                conversation_turn_id: decision === "new_turn" ? "" : turn.id,
                ...(decision === "resume_original" || decision === "resume_with_instruction" || decision === "steer_original" ? { attempt_id: attemptId } : {}),
                ...(parentRunId ? { parent_run_id: parentRunId } : {}),
                source: "backend_rule",
                binding_checksum: binding,
                message,
                ...(decision === "needs_route" ? { candidate_summaries: turn.routing?.candidateSummaries || [] } : {}),
                ...(intentChoice ? { intent_choice: intentChoice } : {}),
            };
        });
    }
    cancel(id, reason = "用户取消了这条排队消息", expectedRevision) {
        return this.settle({ id, status: "cancelled", error: reason, revision: expectedRevision });
    }
    dismissFailed(id, reason = "用户删除了这条失败消息", expectedRevision) {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === String(id || ""));
            if (!turn)
                throw new Error("队列消息不存在");
            requireExpectedRevision(turn, expectedRevision);
            if (turn.status !== "failed")
                throw queueConflict("只有处理失败的消息可以从当前队列中删除");
            const at = nowIso();
            turn.status = "cancelled";
            turn.revision += 1;
            turn.error = String(reason || "用户删除了这条失败消息");
            turn.metadata = { ...turn.metadata, dismissed_by_user: true };
            turn.updated_at = at;
            turn.settled_at = at;
            turn.claimed_at = "";
            turn.lease_id = "";
            turn.lease_expires_at = "";
            turn.checkpoint = "dismissed";
            cleanupTurnAttachments(turn);
            emitTurnChanged(turn, "dismiss");
            return turn;
        });
    }
    guide(input, expectedRevision) {
        const payload = typeof input === "string" ? { id: input, revision: expectedRevision } : (input || {});
        const id = String(payload?.id || "").trim();
        const continuationTaskId = String(payload?.continuationTaskId || payload?.continuation_task_id || "").trim();
        if (!id)
            throw guideError("GUIDE_NOT_ALLOWED", "缺少队列消息 ID", 400);
        return this.mutate((store) => {
            const index = store.turns.findIndex((item) => item.id === id);
            if (index < 0)
                throw new Error("队列消息不存在");
            const turn = store.turns[index];
            requireExpectedRevision(turn, payload?.revision ?? payload?.expected_revision ?? payload?.expectedRevision);
            if (turn.status !== "queued" || turn.kind !== "user_message") {
                throw guideError("GUIDE_NOT_ALLOWED", "只有尚未处理的普通排队消息可以引导当前工作");
            }
            validateGuideContinuationTask(turn, continuationTaskId);
            const metadata = { ...(turn.metadata || {}) };
            delete metadata.resolved_route;
            delete metadata.resolved_candidate_task_id;
            delete metadata.route_source;
            delete metadata.resolvedRoute;
            delete metadata.resolvedCandidateTaskId;
            delete metadata.routeSource;
            if (continuationTaskId)
                metadata.continuation_task_id = continuationTaskId;
            else
                delete metadata.continuation_task_id;
            metadata.requested_mode = "steer";
            turn.mode = "steer";
            turn.revision += 1;
            turn.metadata = metadata;
            turn.routing = null;
            turn.error = "";
            turn.checkpoint = continuationTaskId ? "guided_to_task" : "guided_to_conversation";
            turn.updated_at = nowIso();
            store.turns.splice(index, 1);
            const firstQueuedIndex = store.turns.findIndex((item) => item.scope === turn.scope
                && item.conversation_id === turn.conversation_id
                && item.status === "queued");
            store.turns.splice(firstQueuedIndex >= 0 ? firstQueuedIndex : Math.min(index, store.turns.length), 0, turn);
            emitTurnChanged(turn, "guide");
            return turn;
        });
    }
    retry(id, expectedRevision, attemptId) {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            (0, conversation_attempt_1.requireConversationAttempt)(turn, { attempt_id: attemptId });
            requireExpectedRevision(turn, expectedRevision);
            // A retry is a recovery action for the latest failed attempt only.
            // Completed/cancelled projections must remain immutable, and a failure
            // explicitly dismissed by the user must not silently reappear.
            if (turn.status !== "failed" || turn.metadata?.dismissed_by_user === true) {
                throw new Error("这条消息当前不需要重试");
            }
            turn.status = "queued";
            turn.revision += 1;
            turn.retry_count += 1;
            turn.error = "";
            turn.result = null;
            turn.routing = null;
            turn.updated_at = nowIso();
            turn.claimed_at = "";
            turn.settled_at = "";
            turn.lease_id = "";
            turn.lease_expires_at = "";
            turn.checkpoint = "retried";
            emitTurnChanged(turn, "retry");
            return turn;
        });
    }
    rememberAction(id, key, action, attemptId) {
        return this.mutate(store => {
            const turn = store.turns.find(item => item.id === id);
            if (!turn)
                throw new Error("会话回合不存在");
            const receipts = Array.isArray(turn.metadata?.action_receipts) ? turn.metadata.action_receipts : [];
            turn.metadata = { ...turn.metadata, action_receipts: [...receipts, { key, action, attempt_id: attemptId }].slice(-20) };
            return turn;
        });
    }
    heartbeat(input) {
        const id = String(input?.id || "").trim();
        const leaseId = String(input?.lease_id || input?.leaseId || "").trim();
        if (!id || !leaseId)
            throw new Error("缺少队列消息或租约 ID");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn || turn.status !== "sending" || turn.lease_id !== leaseId)
                throw new Error("队列执行租约已失效");
            (0, conversation_attempt_1.requireConversationAttempt)(turn, input);
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            turn.revision += 1;
            turn.lease_expires_at = new Date(Date.now() + Math.max(15_000, Math.min(15 * 60_000, Number(input?.lease_ms || input?.leaseMs || 13 * 60_000)))).toISOString();
            turn.updated_at = nowIso();
            turn.checkpoint = String(input?.checkpoint || turn.checkpoint || "running");
            if (input?.run_id || input?.runId) {
                turn.run_id = String(input.run_id || input.runId);
                turn.active_run_id = turn.run_id;
            }
            emitTurnChanged(turn, "heartbeat");
            return turn;
        });
    }
    syncTaskDispatch(task) {
        const taskId = String(task?.id || "").trim();
        if (!taskId)
            return null;
        const rawStatus = String(task?.status || "pending").toLowerCase();
        const nextStatus = ["done", "completed", "success", "accepted"].includes(rawStatus)
            ? "completed"
            : ["failed", "error"].includes(rawStatus)
                ? "failed"
                : ["cancelled", "canceled", "archived"].includes(rawStatus)
                    ? "cancelled"
                    : ["in_progress", "running", "executing", "verifying", "reviewing", "reworking", "blocked", "waiting", "needs_user"].includes(rawStatus)
                        ? "sending"
                        : "queued";
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.kind === "task_dispatch" && item.task_id === taskId);
            if (turn?.metadata?.dismissed_by_user === true)
                return turn;
            if (!turn || turn.status === nextStatus)
                return turn || null;
            turn.status = nextStatus;
            turn.revision += 1;
            turn.updated_at = nowIso();
            turn.checkpoint = `task_${rawStatus}`;
            if (TERMINAL_STATUSES.has(nextStatus)) {
                turn.settled_at = turn.updated_at;
                turn.lease_id = "";
                turn.lease_expires_at = "";
            }
            emitTurnChanged(turn, "task_sync");
            return turn;
        });
    }
}
exports.ConversationTurnControlStore = ConversationTurnControlStore;
exports.conversationTurnControl = new ConversationTurnControlStore();
function cancelConversationTurn(payload) {
    const id = String(payload?.id || "");
    const current = exports.conversationTurnControl.list({ limit: 500 }).turns.find((turn) => turn.id === id);
    const dismissFailedProjection = current?.status === "failed";
    if (current?.kind === "task_dispatch" && current.task_id && !dismissFailedProjection) {
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === String(current.task_id));
        const taskStatus = String(task?.status || "pending").toLowerCase();
        if (task && !["pending", "queued", "waiting_dependency", "waiting"].includes(taskStatus)) {
            const error = new Error("任务已经开始执行，请从任务卡安全停止");
            error.code = "TASK_ALREADY_STARTED";
            error.statusCode = 409;
            throw error;
        }
    }
    const turn = dismissFailedProjection
        ? exports.conversationTurnControl.dismissFailed(id, payload?.reason, payload?.revision)
        : exports.conversationTurnControl.cancel(id, payload?.reason, payload?.revision);
    if (turn.kind === "task_dispatch" && turn.task_id && !dismissFailedProjection) {
        (0, db_1.updateTaskById)(turn.task_id, {
            status: "cancelled",
            status_detail: String(payload?.reason || "用户取消尚未开始的会话排队任务"),
            queue_state: "cancelled",
            queue_position: 0,
        });
    }
    return { turn };
}
function taskDispatchIdentity(task) {
    const project = String(task?.target_project || task?.project || "").trim();
    const projectSession = String(task?.project_session_id || task?.projectSessionId || "").trim();
    const group = String(task?.group_id || task?.groupId || "").trim();
    const groupSession = String(task?.group_session_id || task?.groupSessionId || "").trim();
    const rawSource = String(task?.automation_task_source || task?.source_channel || task?.source || "").toLowerCase();
    const source = task?.automation_definition_id || rawSource === "schedule" || rawSource === "cron" || rawSource === "automation"
        ? "schedule"
        : rawSource === "global_agent" || task?.mission_id || task?.global_mission_id
            ? "global_agent"
            : ["workbench", "requirement_pool", "requirement-pool"].includes(rawSource)
                ? "workbench"
                : "web";
    if (source === "web")
        return null;
    if (project && projectSession)
        return { scope: "project", conversationId: `${project}:${projectSession}`, source };
    if (group && groupSession)
        return { scope: "group", conversationId: `${group}:${groupSession}`, source };
    return null;
}
function admitTaskDispatchTurn(task) {
    const identity = taskDispatchIdentity(task);
    const taskId = String(task?.id || "").trim();
    if (!identity || !taskId)
        return null;
    const status = String(task?.status || "pending").toLowerCase();
    if (["done", "completed", "failed", "cancelled", "canceled", "archived"].includes(status))
        return null;
    const existing = exports.conversationTurnControl.list({ scope: identity.scope, conversation_id: identity.conversationId, limit: 500 }).turns
        .find((turn) => turn.kind === "task_dispatch" && turn.task_id === taskId);
    const turn = existing || exports.conversationTurnControl.enqueue({
        scope: identity.scope,
        conversation_id: identity.conversationId,
        kind: "task_dispatch",
        source: identity.source,
        task_id: taskId,
        mission_id: task?.mission_id || task?.global_mission_id || "",
        occurrence_id: task?.automation_occurrence_id || "",
        mode: "queue",
        message: String(task?.title || task?.goal || "待处理任务").slice(0, 2_000),
        request_id: `task-dispatch:${taskId}`,
        metadata: { task_id: taskId },
    }).turn;
    exports.conversationTurnControl.syncTaskDispatch(task);
    return turn;
}
function reconcileTaskDispatchTurns() {
    let admitted = 0;
    for (const task of (0, db_1.loadTasks)()) {
        try {
            if (admitTaskDispatchTurn(task))
                admitted += 1;
            exports.conversationTurnControl.syncTaskDispatch(task);
        }
        catch { }
    }
    return { admitted };
}
(0, runtime_events_1.subscribeRuntimeEventListener)(["task"], (event) => {
    if (event.type === "tasks.changed") {
        reconcileTaskDispatchTurns();
        return;
    }
    if (event.type !== "task.changed")
        return;
    const taskId = String(event.data?.taskId || event.data?.task_id || "");
    if (!taskId)
        return;
    const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === taskId);
    if (!task)
        return;
    try {
        admitTaskDispatchTurn(task);
        exports.conversationTurnControl.syncTaskDispatch(task);
    }
    catch { }
});
const drainingWebConversationTurns = new Set();
const recoveringProjectIntakes = new Set();
let webConversationTurnRecoveryTimer = null;
let webConversationRecoveryBaseUrl = "";
function turnConversationIdentity(turn) {
    if (turn.scope === "project") {
        const project = String(turn.metadata?.project || turn.conversation_id.split(":")[0] || "");
        const sessionId = String(turn.metadata?.session_id || turn.conversation_id.slice(project.length + 1) || "");
        return { scope: "project", resourceId: project, sessionId };
    }
    if (turn.scope === "group") {
        const groupId = String(turn.metadata?.group_id || turn.conversation_id.split(":")[0] || "");
        const sessionId = String(turn.metadata?.group_session_id || turn.conversation_id.slice(groupId.length + 1) || "");
        return { scope: "group", resourceId: groupId, sessionId };
    }
    return null;
}
function conversationTaskOccupiesSlot(identity) {
    if (identity.scope === "project" && (0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(identity.resourceId, identity.sessionId))
        return true;
    if (identity.scope === "group") {
        const latest = [...((0, storage_1.getGroupMessages)(identity.resourceId, identity.sessionId) || [])]
            .reverse().find((message) => ["user", "assistant"].includes(String(message?.role || "")));
        if (latest?.role === "user")
            return true;
    }
    // Only states that own an execution slot may block a queued conversation
    // turn.  `waiting_user`, `blocked`, and `interrupted` are persisted task
    // states but do not represent an active provider/agent execution; treating
    // them as busy can leave ordinary messages queued until a later unrelated
    // event (observed as multi-minute or multi-hour delivery delays).
    const activeStatuses = new Set(["pending", "queued", "in_progress", "running", "executing", "verifying", "reviewing", "reworking", "recovering"]);
    return (0, db_1.loadTasks)().some((task) => {
        if (!activeStatuses.has(String(task?.status || "pending").toLowerCase()))
            return false;
        if (identity.scope === "project")
            return String(task?.target_project || "") === identity.resourceId
                && String(task?.project_session_id || "") === identity.sessionId;
        return String(task?.group_id || "") === identity.resourceId
            && String(task?.group_session_id || "") === identity.sessionId;
    });
}
async function postQueuedConversationTurn(baseUrl, turn, signal) {
    const identity = turnConversationIdentity(turn);
    if (!identity)
        throw new Error("排队消息缺少目标会话");
    const files = (turn.attachments || []).filter((item) => item?.savedPath && fs.existsSync(String(item.savedPath)));
    const continuationTaskId = String(turn.metadata?.continuation_task_id || "").trim();
    const directedFields = turn.metadata?.directed_input_fields && typeof turn.metadata.directed_input_fields === "object"
        ? turn.metadata.directed_input_fields : {};
    if (identity.scope === "project") {
        const pathname = "/api/send-stream";
        return fetch(`${baseUrl}${pathname}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Conversation-Attempt-ID": (0, conversation_attempt_1.conversationAttemptId)(turn), ...(0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname) },
            body: JSON.stringify((0, project_queued_turn_request_1.projectQueuedTurnRequest)(turn, identity, files)), signal,
        });
    }
    const pathname = "/api/groups/send?stream=1";
    if (files.length) {
        const form = new FormData();
        form.append("group_id", identity.resourceId);
        form.append("group_session_id", identity.sessionId);
        form.append("message", turn.message);
        form.append("client_message_id", turn.request_id);
        form.append("message_mode", continuationTaskId ? "project_task" : String(turn.metadata?.message_mode || "conversation"));
        form.append("conversation_turn_id", turn.id);
        if (turn.task_id)
            form.append("discussion_task_id", turn.task_id);
        if (turn.metadata?.new_topic === true)
            form.append("new_topic", "true");
        form.append("attempt_id", (0, conversation_attempt_1.conversationAttemptId)(turn));
        if (continuationTaskId) {
            form.append("continuation_task_id", continuationTaskId);
            form.append("continuation_kind", "supplement");
            form.append("interrupt_current_run", "false");
        }
        form.append("resolved_route", String(turn.metadata?.resolved_route || ""));
        form.append("resolved_candidate_task_id", String(turn.metadata?.resolved_candidate_task_id || ""));
        for (const [field, value] of Object.entries(directedFields))
            form.append(field, String(value || ""));
        for (const file of files) {
            const blob = new Blob([fs.readFileSync(String(file.savedPath))], { type: String(file.contentType || "application/octet-stream") });
            form.append("files", blob, String(file.name || file.filename || "附件"));
        }
        return fetch(`${baseUrl}${pathname}`, { method: "POST", headers: (0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname), body: form, signal });
    }
    return fetch(`${baseUrl}${pathname}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname) },
        body: JSON.stringify({
            group_id: identity.resourceId,
            group_session_id: identity.sessionId,
            message: turn.message,
            client_message_id: turn.request_id,
            message_mode: continuationTaskId ? "project_task" : String(turn.metadata?.message_mode || "conversation"),
            conversation_turn_id: turn.id,
            discussion_task_id: turn.task_id,
            new_topic: turn.metadata?.new_topic === true,
            attempt_id: (0, conversation_attempt_1.conversationAttemptId)(turn),
            ...(continuationTaskId ? {
                continuation_task_id: continuationTaskId,
                continuation_kind: "supplement",
                interrupt_current_run: false,
            } : {}),
            resolved_route: turn.metadata?.resolved_route || "",
            resolved_candidate_task_id: turn.metadata?.resolved_candidate_task_id || "",
            ...directedFields,
        }), signal,
    });
}
async function drainWebConversationTurns(baseUrl, seed) {
    const identity = turnConversationIdentity(seed);
    if (!identity || drainingWebConversationTurns.has(seed.conversation_id))
        return;
    drainingWebConversationTurns.add(seed.conversation_id);
    try {
        while (!conversationTaskOccupiesSlot(identity)) {
            const turn = exports.conversationTurnControl.claim({ scope: identity.scope, conversation_id: seed.conversation_id });
            if (!turn)
                break;
            try {
                const response = await postQueuedConversationTurn(baseUrl, turn);
                const body = await response.text();
                if (exports.conversationTurnControl.getInternal(turn.id)?.status === "paused" || body.includes("CONVERSATION_PAUSED"))
                    break;
                if (response.status === 409) {
                    exports.conversationTurnControl.defer(turn.id, "当前任务仍占用会话，已保留原队列位置");
                    break;
                }
                if (!response.ok || /\"type\"\s*:\s*\"error\"/.test(body))
                    throw new Error(`会话消息处理失败（HTTP ${response.status}）`);
                if (/\"type\"\s*:\s*\"route_required\"/.test(body))
                    break;
                exports.conversationTurnControl.settle({ id: turn.id, attempt_id: (0, conversation_attempt_1.conversationAttemptId)(turn), status: "completed", result: { delivered: true } });
            }
            catch (error) {
                if (exports.conversationTurnControl.getInternal(turn.id)?.status === "paused")
                    break;
                exports.conversationTurnControl.settle({ id: turn.id, attempt_id: (0, conversation_attempt_1.conversationAttemptId)(turn), status: "failed", error: error?.message || String(error) });
            }
        }
    }
    finally {
        drainingWebConversationTurns.delete(seed.conversation_id);
    }
}
function startWebConversationTurnRecoveryForServer(baseUrl) {
    if (webConversationTurnRecoveryTimer)
        return { started: false };
    webConversationRecoveryBaseUrl = baseUrl;
    const tick = () => {
        const pendingIntakes = exports.conversationTurnControl.listInternal({ statuses: "queued", limit: 500 }).turns
            .filter((turn) => turn.scope === "project" && turn.source === "web" && turn.metadata?.intake_persistence === "pending");
        for (const turn of pendingIntakes) {
            if (recoveringProjectIntakes.has(turn.id))
                continue;
            recoveringProjectIntakes.add(turn.id);
            queueMicrotask(() => {
                try {
                    (0, project_conversation_intake_1.persistProjectConversationIntake)(turn);
                    exports.conversationTurnControl.markIntakePersistence(turn.id, turn.revision, "ready");
                }
                catch (error) {
                    exports.conversationTurnControl.markIntakePersistence(turn.id, turn.revision, "failed", error?.message || String(error));
                }
                finally {
                    recoveringProjectIntakes.delete(turn.id);
                }
            });
        }
        const queued = exports.conversationTurnControl.listInternal({ statuses: "queued", limit: 500 }).turns
            .filter((turn) => turn.kind === "user_message" && turn.source === "web" && ["project", "group"].includes(turn.scope)
            && turn.metadata?.intake_persistence !== "pending" && turn.metadata?.intake_persistence !== "failed");
        const firstByConversation = new Map();
        for (const turn of queued)
            if (!firstByConversation.has(turn.conversation_id))
                firstByConversation.set(turn.conversation_id, turn);
        for (const turn of firstByConversation.values())
            void drainWebConversationTurns(baseUrl, turn);
    };
    tick();
    webConversationTurnRecoveryTimer = setInterval(tick, 3_000);
    webConversationTurnRecoveryTimer.unref?.();
    return { started: true };
}
function stopWebConversationTurnRecoveryForServer() {
    if (webConversationTurnRecoveryTimer)
        clearInterval(webConversationTurnRecoveryTimer);
    webConversationTurnRecoveryTimer = null;
    webConversationRecoveryBaseUrl = "";
}
function wakeWebConversationTurn(turn) {
    if (!webConversationRecoveryBaseUrl || !["project", "group"].includes(turn.scope))
        return;
    setImmediate(() => void drainWebConversationTurns(webConversationRecoveryBaseUrl, turn));
}
function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on("end", () => {
            try {
                const text = Buffer.concat(chunks).toString("utf-8");
                resolve(text ? JSON.parse(text) : {});
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function handleConversationTurnControlApi(pathname, req, res, parsed) {
    const eventRoute = /^\/api\/conversation-turns\/([^/]+)\/events$/.exec(pathname);
    if (eventRoute && req.method === "GET") {
        const turn = exports.conversationTurnControl.getInternal(decodeURIComponent(eventRoute[1]));
        if (!turn)
            return (0, utils_1.sendJson)(res, { success: false, error: "会话回合不存在" }, 404);
        if (!authorizeTurnMutation(req, res, { id: turn.id }))
            return true;
        const attemptId = String(parsed?.query?.attempt_id || parsed?.query?.attemptId || "");
        if (!attemptId || !attemptId.startsWith(`${turn.id}:`))
            return (0, utils_1.sendJson)(res, { success: false, error: "执行尝试身份不匹配" }, 409);
        const after = Math.max(0, Math.floor(Number(parsed?.query?.after || req.headers["last-event-id"] || 0)));
        const terminal = attemptId !== (0, conversation_attempt_1.conversationAttemptId)(turn) || ["completed", "failed", "cancelled", "applied"].includes(turn.status);
        (0, conversation_event_journal_1.streamConversationEvents)(res, turn.id, attemptId, after, terminal);
        return true;
    }
    const actionRoute = /^\/api\/conversation-turns\/([^/]+)\/actions$/.exec(pathname);
    if (actionRoute && req.method === "POST") {
        void readRequestBody(req).then(payload => {
            const id = decodeURIComponent(actionRoute[1]);
            if (!authorizeTurnMutation(req, res, { id }))
                return;
            const action = String(payload?.action || "");
            const attemptId = String(payload?.attempt_id || "");
            const key = String(payload?.idempotency_key || "");
            if (!key || !attemptId || !["pause", "resume", "retry"].includes(action))
                throw Object.assign(new Error("缺少有效的控制动作或幂等身份"), { statusCode: 400 });
            const current = exports.conversationTurnControl.getInternal(id);
            if (!current)
                throw Object.assign(new Error("会话回合不存在"), { statusCode: 404 });
            const receipt = (Array.isArray(current.metadata?.action_receipts) ? current.metadata.action_receipts : [])
                .find((item) => item.key === key);
            if (receipt) {
                if (receipt.action !== action || receipt.attempt_id !== attemptId)
                    throw queueConflict("控制请求身份冲突");
                return (0, utils_1.sendJson)(res, { success: true, duplicate: true, turn: publicTurnProjection(current) });
            }
            if ((0, conversation_attempt_1.conversationAttemptId)(current) !== attemptId)
                throw queueConflict("这次执行已变化，请刷新后再操作");
            const updated = action === "retry"
                ? exports.conversationTurnControl.retry(id, current.revision, attemptId)
                : exports.conversationTurnControl.control({ id, action, revision: current.revision, attempt_id: attemptId });
            exports.conversationTurnControl.rememberAction(id, key, action, attemptId);
            (0, utils_1.sendJson)(res, { success: true, turn: publicTurnProjection(updated) });
            if (action === "pause" && updated.scope === "global")
                globalPauseDispatcher?.(updated);
            if (["resume", "retry"].includes(action))
                wakeWebConversationTurn(updated);
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error), code: error?.code || "CONVERSATION_ACTION_FAILED" }, Number(error?.statusCode || 409)));
        return true;
    }
    if (pathname === "/api/conversation-turns/submit" && req.method === "POST") {
        const submit = (payload, attachments = []) => {
            const normalized = normalizeHttpEnqueuePayload(req, { ...payload, attachments });
            if (!authorizeTurnMutation(req, res, normalized))
                return;
            if (normalized.scope === "global") {
                const metadata = normalized.metadata && typeof normalized.metadata === "object" ? normalized.metadata : {};
                const context = metadata.global_context_v2 && typeof metadata.global_context_v2 === "object" ? metadata.global_context_v2 : {};
                normalized.metadata = { ...metadata, global_context_v2: {
                        message: String(context.message || normalized.message || ""),
                        original_message: String(normalized.message || ""),
                        history: Array.isArray(context.history) ? context.history : [],
                        source: "web",
                        clarification_run_id: String(context.clarification_run_id || ""),
                        requested_target_refs: Array.isArray(context.requested_target_refs) ? context.requested_target_refs : [],
                        read_only: (0, api_access_control_1.requestIsReadOnly)(req),
                        principal: req.ccmAuth || null,
                    } };
            }
            const result = exports.conversationTurnControl.enqueue(normalized, project_conversation_intake_1.persistProjectConversationIntake);
            const turn = result.turn;
            const attemptId = (0, conversation_attempt_1.conversationAttemptId)(turn);
            (0, utils_1.sendJson)(res, { success: true, duplicate: result.duplicate, turn: publicTurnProjection(turn), turn_id: turn.id, attempt_id: attemptId });
            if (!result.duplicate)
                wakeWebConversationTurn(turn);
        };
        if (String(req.headers["content-type"] || "").includes("multipart/form-data")) {
            void (0, secure_multipart_1.parseSecureMultipartRequest)(req, { maxFiles: 10 }).then(multipart => {
                try {
                    submit(JSON.parse(String(multipart.fields.payload || "{}")), adoptQueuedAttachments(multipart.files));
                }
                catch (error) {
                    (0, secure_multipart_1.cleanupSecureMultipartFiles)(multipart.files);
                    throw error;
                }
            }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, Number(error?.statusCode || 400)));
        }
        else {
            void readRequestBody(req).then(payload => submit(payload, Array.isArray(payload?.attachments) ? payload.attachments : []))
                .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, Number(error?.statusCode || 400)));
        }
        return true;
    }
    if ((0, conversation_turn_observation_api_1.handleConversationTurnObservationApi)(pathname, req, res, parsed, {
        get: id => exports.conversationTurnControl.getInternal(id), authorize: authorizeTurnMutation,
        project: (turn, userId, role) => ({ ...publicClaimProjection(turn), ...publicTurnProjection(turn, 0, userId, role) }),
    }))
        return true;
    if (pathname === "/api/conversation-turns/attachment" && req.method === "GET") {
        const turnId = String(parsed?.query?.turn_id || "");
        const attachmentId = String(parsed?.query?.attachment_id || "");
        const turn = exports.conversationTurnControl.listInternal({ limit: 500 }).turns.find((item) => item.id === turnId);
        if (turn && !authorizeConversationAccess(req, res, turn.scope, turn.conversation_id))
            return true;
        const attachment = turn?.attachments?.find((item) => String(item?.id || "") === attachmentId);
        const savedPath = String(attachment?.savedPath || "");
        if (!turn || !attachment || !savedPath || !fs.existsSync(savedPath) || ["cancelled", "completed", "applied"].includes(turn.status)) {
            return (0, utils_1.sendJson)(res, { success: false, error: "排队附件不存在或已失效" }, 404);
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", String(attachment.contentType || "application/octet-stream"));
        res.setHeader("Content-Length", String(Math.max(0, Number(attachment.size || fs.statSync(savedPath).size))));
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(String(attachment.name || "attachment"))}`);
        fs.createReadStream(savedPath).pipe(res);
        return true;
    }
    if (pathname === "/api/conversation-turns" && req.method === "GET") {
        try {
            if (!authorizeConversationAccess(req, res, parsed?.query?.scope, parsed?.query?.conversation_id || parsed?.query?.conversationId))
                return true;
            const principal = req?.ccmAuth;
            const listing = exports.conversationTurnControl.list({
                ...(parsed?.query || {}),
                _viewer_user_id: principal?.kind === "browser" ? principal.userId : "",
                _viewer_role: principal?.kind === "browser" ? principal.role : "",
            });
            if (principal?.kind === "browser" && principal.role !== "admin") {
                listing.turns = listing.turns.map((turn) => {
                    if (turn.kind !== "task_dispatch")
                        return turn;
                    const resourceId = String(turn.conversation_id || "").split(":")[0];
                    const resourceType = turn.scope === "project" ? "project" : turn.scope === "group" ? "group" : null;
                    return {
                        ...turn,
                        canMutate: !!resourceType && (0, access_policy_1.hasResourceAccess)(principal.userId, principal.role, resourceType, resourceId, "manage"),
                    };
                });
            }
            return (0, utils_1.sendJson)(res, { success: true, ...listing });
        }
        catch (error) {
            return (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
        }
    }
    if (pathname === "/api/conversation-turns/detail" && req.method === "GET") {
        try {
            const id = String(parsed?.query?.id || "").trim();
            if (!id)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少队列消息 ID" }, 400);
            if (!authorizeTurnMutation(req, res, { id, operation: "edit" }))
                return true;
            const turn = exports.conversationTurnControl.getInternal(id);
            if (!turn)
                return (0, utils_1.sendJson)(res, { success: false, error: "队列消息不存在" }, 404);
            if (turn.status !== "queued" || turn.kind !== "user_message") {
                return (0, utils_1.sendJson)(res, { success: false, error: "只有尚未处理的普通排队消息可以编辑", code: "QUEUE_EDIT_NOT_ALLOWED" }, 409);
            }
            const principal = req?.ccmAuth;
            res.setHeader("Cache-Control", "private, no-store");
            return (0, utils_1.sendJson)(res, {
                success: true,
                turn: editableTurnProjection(turn, principal?.kind === "browser" ? String(principal.userId || "") : "", principal?.kind === "browser" ? String(principal.role || "") : ""),
            });
        }
        catch (error) {
            return (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error), ...(error?.code ? { code: error.code } : {}) }, Number(error?.statusCode || 400));
        }
    }
    if (pathname === "/api/conversation-turns/enqueue" && req.method === "POST"
        && String(req.headers["content-type"] || "").includes("multipart/form-data")) {
        void (0, secure_multipart_1.parseSecureMultipartRequest)(req, { maxFiles: 10 }).then((multipart) => {
            try {
                const payload = normalizeHttpEnqueuePayload(req, JSON.parse(String(multipart.fields.payload || "{}")));
                if (!authorizeTurnMutation(req, res, payload)) {
                    (0, secure_multipart_1.cleanupSecureMultipartFiles)(multipart.files);
                    return;
                }
                const result = exports.conversationTurnControl.enqueue({ ...payload, attachments: adoptQueuedAttachments(multipart.files) }, project_conversation_intake_1.persistProjectConversationIntake, { deferBeforeAdmit: true });
                (0, utils_1.sendJson)(res, { success: true, ...(0, conversation_attempt_1.projectConversationMutationResult)(exports.conversationTurnControl, { ...result, turn: publicTurnProjection(result.turn) }, req.ccmAuth) });
            }
            catch (error) {
                (0, secure_multipart_1.cleanupSecureMultipartFiles)(multipart.files);
                throw error;
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "排队附件上传失败" }, 400));
        return true;
    }
    const operations = {
        "/api/conversation-turns/enqueue": (payload) => {
            const result = exports.conversationTurnControl.enqueue(normalizeHttpEnqueuePayload(req, payload), project_conversation_intake_1.persistProjectConversationIntake, { deferBeforeAdmit: true });
            return { ...result, turn: publicTurnProjection(result.turn) };
        },
        "/api/conversation-turns/claim": (payload) => {
            // Project intake is persisted by the enqueue microtask or recovery
            // ticker. Never synchronously read/write the full session transcript
            // from the claim request; large histories must not delay admission.
            return { turn: publicClaimProjection(exports.conversationTurnControl.claim(payload)) };
        },
        "/api/conversation-turns/settle": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.settle(payload)) }),
        "/api/conversation-turns/heartbeat": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.heartbeat(payload)) }),
        "/api/conversation-turns/control": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.control(payload)) }),
        "/api/conversation-turns/defer": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.defer(String(payload?.id || ""), payload?.reason, payload?.revision, payload?.attempt_id)) }),
        "/api/conversation-turns/cancel": (payload) => {
            const result = cancelConversationTurn(payload);
            return { turn: publicTurnProjection(result.turn) };
        },
        "/api/conversation-turns/guide": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.guide(payload)) }),
        "/api/conversation-turns/retry": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.retry(String(payload?.id || ""), payload?.revision, payload?.attempt_id)) }),
        "/api/conversation-turns/edit": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.edit(payload, turn => (0, project_conversation_intake_1.persistProjectConversationIntake)(turn, true), { deferBeforeCommit: true })) }),
        "/api/conversation-turns/resolve-route": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.resolveRoute(payload)) }),
        "/api/conversation-turns/resolve-intent": (payload) => ({ decision: exports.conversationTurnControl.resolveIntent(payload) }),
    };
    const operation = operations[pathname];
    if (!operation || req.method !== "POST")
        return false;
    readRequestBody(req).then((payload) => {
        if (!authorizeTurnMutation(req, res, payload))
            return;
        (0, conversation_attempt_1.validateConversationMutation)(exports.conversationTurnControl, pathname, payload);
        const result = operation(payload);
        (0, utils_1.sendJson)(res, { success: true, ...(0, conversation_attempt_1.projectConversationMutationResult)(exports.conversationTurnControl, result, req.ccmAuth) });
    }).catch((error) => (0, utils_1.sendJson)(res, {
        success: false,
        error: error?.message || String(error),
        ...(error?.code ? { code: error.code } : {}),
    }, Number(error?.statusCode || 400)));
    return true;
}
function runConversationTurnControlSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-turn-control-"));
    const file = path.join(dir, "turns.json");
    try {
        const store = new ConversationTurnControlStore(file);
        const first = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "第一条", request_id: "r1" });
        const duplicate = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "不应重复", request_id: "r1" });
        const claimed = store.claim({ scope: "group", conversation_id: "g1:s1" });
        const second = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "第二条", request_id: "r2" });
        const third = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "第三条", request_id: "r3" });
        const guided = store.guide(third.turn.id);
        const recovered = new ConversationTurnControlStore(file).recoverInterrupted();
        const recoveredTurn = store.getInternal(first.turn.id);
        const recoveryRequired = recoveredTurn?.status === "interrupted" && recoveredTurn?.checkpoint === "recovery_required";
        const resumed = store.control({ id: first.turn.id, action: "resume", revision: recoveredTurn?.revision, attempt_id: (0, conversation_attempt_1.conversationAttemptId)(recoveredTurn) });
        const reclaimed = store.claim({ scope: "group", conversation_id: "g1:s1", id: resumed.id, revision: resumed.revision, attempt_id: (0, conversation_attempt_1.conversationAttemptId)(resumed) });
        store.settle({ id: reclaimed?.id, status: "completed", result: { ok: true } });
        const guidedClaim = store.claim({ scope: "group", conversation_id: "g1:s1" });
        store.settle({ id: guidedClaim?.id, status: "completed", result: { guided: true } });
        store.cancel(second.turn.id);
        const rows = store.list({ scope: "group", conversation_id: "g1:s1" }).turns;
        const attachmentPath = path.join(dir, "PRIVATE_QUEUE_ATTACHMENT.txt");
        fs.writeFileSync(attachmentPath, "attachment fixture", "utf8");
        const attached = store.enqueue({
            scope: "project",
            conversation_id: "p1:s1",
            mode: "queue",
            message: "带附件的消息",
            request_id: "attachment-r1",
            attachments: [{ id: "qatt_fixture", name: "说明.txt", size: 18, checksum: "fixture", contentType: "text/plain", savedPath: attachmentPath }],
        });
        const publicAttached = store.list({ scope: "project", conversation_id: "p1:s1" }).turns[0];
        const claimedAttached = store.claim({ scope: "project", conversation_id: "p1:s1" });
        store.settle({ id: claimedAttached?.id, status: "completed" });
        const routed = store.enqueue({ scope: "project", conversation_id: "p2:s1", mode: "queue", message: "继续完善这个功能", request_id: "route-r1" });
        const routedClaim = store.claim({ scope: "project", conversation_id: "p2:s1" });
        const needsRoute = store.requireRoute({
            id: routedClaim?.id,
            revision: routedClaim?.revision,
            routing: { candidateTaskId: "task_candidate", confidence: 0.62, reason: "既可能续接，也可能是独立需求" },
        });
        const blockedClaim = store.claim({ scope: "project", conversation_id: "p2:s1" });
        let staleRouteConflict = false;
        try {
            store.resolveRoute({ id: needsRoute.id, revision: needsRoute.revision, choice: "start_new_task", bindingChecksum: "stale" });
        }
        catch (error) {
            staleRouteConflict = error?.code === "QUEUE_REVISION_CONFLICT";
        }
        const resolvedRoute = store.resolveRoute({
            id: needsRoute.id,
            revision: needsRoute.revision,
            choice: "start_new_task",
            bindingChecksum: needsRoute.routing?.bindingChecksum,
        });
        const routedReclaim = store.claim({ scope: "project", conversation_id: "p2:s1", id: resolvedRoute.id, revision: resolvedRoute.revision });
        store.settle({ id: routedReclaim?.id, status: "completed" });
        const conversation = store.enqueue({ scope: "global", conversation_id: "g-session", mode: "queue", message: "只读问答", request_id: "conversation-r1", metadata: { direct_execution: true } });
        const conversationClaim = store.claim({ scope: "global", conversation_id: "g-session" });
        const conversationPausing = store.control({ id: conversationClaim?.id, action: "pause", revision: conversationClaim?.revision });
        const conversationPaused = store.pauseAtBoundary(conversationPausing.id, (0, conversation_attempt_1.conversationAttemptId)(conversationPausing), "provider_request");
        const conversationResuming = store.control({ id: conversationPaused.id, action: "resume", revision: conversationPaused.revision });
        const conversationReclaimed = store.claim({ scope: "global", conversation_id: "g-session", id: conversationResuming.id, revision: conversationResuming.revision });
        const checks = {
            idempotentEnqueue: duplicate.duplicate && duplicate.turn.id === first.turn.id && rows.length === 3,
            fifoClaim: claimed?.id === first.turn.id && reclaimed?.id === first.turn.id,
            guidedTurnPromoted: guided.mode === "steer"
                && guided.metadata.requested_mode === "steer"
                && guidedClaim?.id === third.turn.id,
            restartRecovery: recovered.recovered === 1 && recoveryRequired,
            terminalStates: rows.find((item) => item.id === first.turn.id)?.status === "completed"
                && rows.find((item) => item.id === third.turn.id)?.status === "completed"
                && rows.find((item) => item.id === second.turn.id)?.status === "cancelled",
            persistedSchema: (0, atomic_json_file_1.readJsonWithBackup)(file, null)?.schema === "ccm-conversation-turn-control-v2",
            safeAttachmentProjection: attached.turn.id === publicAttached?.id
                && publicAttached?.attachmentRefs?.[0]?.name === "说明.txt"
                && !JSON.stringify(publicAttached).includes("PRIVATE_QUEUE_ATTACHMENT"),
            completedAttachmentCleanup: !fs.existsSync(attachmentPath),
            ambiguousRouteBlocksQueue: routed.turn.id === needsRoute.id && needsRoute.status === "needs_route" && !blockedClaim,
            explicitRouteResolution: resolvedRoute.status === "queued"
                && resolvedRoute.routing?.selectedChoice === "start_new_task"
                && routedReclaim?.metadata?.resolved_route === "start_new_task",
            routeBindingProtected: staleRouteConflict,
            ordinaryConversationPauseResume: conversationClaim?.status === "sending"
                && conversationPausing.status === "pausing"
                && conversationPaused.status === "paused"
                && conversationResuming.status === "queued"
                && conversationReclaimed?.status === "sending"
                && conversationReclaimed?.id === conversation.turn.id,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=conversation-turn-control.js.map