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
exports.admitTaskDispatchTurn = admitTaskDispatchTurn;
exports.reconcileTaskDispatchTurns = reconcileTaskDispatchTurns;
exports.startWebConversationTurnRecoveryForServer = startWebConversationTurnRecoveryForServer;
exports.stopWebConversationTurnRecoveryForServer = stopWebConversationTurnRecoveryForServer;
exports.handleConversationTurnControlApi = handleConversationTurnControlApi;
exports.runConversationTurnControlSelfTest = runConversationTurnControlSelfTest;
const crypto = __importStar(require("crypto"));
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
const STORE_FILE = process.env.CCM_CONVERSATION_TURN_FILE || path.join(utils_1.CCM_DIR, "conversation-turn-control.json");
const MAX_RECORDS = 800;
const TERMINAL_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(["queued", "sending"]);
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
function requireExpectedRevision(turn, expected) {
    if (expected == null || expected === "")
        return;
    if (turn.revision !== Number(expected))
        throw queueConflict();
}
function emitTurnChanged(turn, operation) {
    (0, runtime_events_1.publishRuntimeEvent)("system", "conversation.turn.changed", {
        id: turn.id,
        taskId: turn.task_id,
        sessionId: turn.conversation_id,
        source: turn.source,
        status: turn.status,
        operation,
        revision: turn.revision,
    });
}
function publicTurnProjection(turn, position = 0, viewerUserId = "", viewerRole = "") {
    const messagePreview = String(turn.message || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240);
    const attachmentRefs = turn.attachments.map((item) => ({
        id: String(item?.id || item?.attachment_id || item?.attachmentId || ""),
        name: String(item?.name || item?.filename || "").slice(0, 160),
        size: Math.max(0, Number(item?.size || 0)),
        checksum: String(item?.checksum || "").slice(0, 128),
        contentType: String(item?.contentType || item?.content_type || "application/octet-stream").slice(0, 120),
        url: item?.id ? `/api/conversation-turns/attachment?turn_id=${encodeURIComponent(turn.id)}&attachment_id=${encodeURIComponent(String(item.id))}` : "",
    })).filter((item) => item.id || item.name);
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
        messagePreview,
        attachmentRefs,
        position,
        retry_count: turn.retry_count,
        recovery_count: turn.recovery_count,
        error: String(turn.error || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 240),
        created_at: turn.created_at,
        updated_at: turn.updated_at,
        contentStored: false,
        canMutate: viewerRole === "admin" || !turn.owner_id || (!!viewerUserId && turn.owner_id === viewerUserId),
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
    if ((!scope || !conversationId) && payload?.id) {
        turn = exports.conversationTurnControl.listInternal({ limit: 500 }).turns.find((item) => item.id === String(payload.id));
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
            status: (["queued", "applied", "sending", "completed", "failed", "cancelled"].includes(status) ? status : "queued"),
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
                if (turn.status !== "sending" || turn.kind === "task_dispatch")
                    return turn;
                recovered += 1;
                return {
                    ...turn,
                    status: "queued",
                    revision: turn.revision + 1,
                    recovery_count: turn.recovery_count + 1,
                    error: "服务重启后已恢复到待发送队列",
                    updated_at: at,
                    claimed_at: "",
                    lease_id: "",
                    lease_expires_at: "",
                    checkpoint: "recovered",
                };
            });
            return store.turns;
        });
        return { recovered, turns };
    }
    enqueue(input) {
        const scope = normalizeScope(input?.scope);
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        const message = String(input?.message || "").trim();
        const attachments = Array.isArray(input?.attachments) ? input.attachments : [];
        if (!conversationId)
            throw new Error("缺少会话 ID");
        if (!message && attachments.length === 0)
            throw new Error("消息和附件不能同时为空");
        const mode = normalizeMode(input?.mode);
        const requestId = String(input?.request_id || input?.requestId || crypto.randomUUID()).trim();
        return this.mutate((store) => {
            const duplicate = store.turns.find((turn) => turn.scope === scope
                && turn.conversation_id === conversationId
                && turn.request_id === requestId);
            if (duplicate)
                return { turn: duplicate, duplicate: true };
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
                task_id: String(input?.task_id || input?.taskId || input?.metadata?.task_id || ""),
                mission_id: String(input?.mission_id || input?.missionId || input?.metadata?.mission_id || ""),
                occurrence_id: String(input?.occurrence_id || input?.occurrenceId || input?.metadata?.occurrence_id || ""),
                owner_id: String(input?.owner_id || input?.ownerId || ""),
                message,
                attachments,
                status: "queued",
                active_run_id: String(input?.active_run_id || input?.activeRunId || ""),
                metadata: input?.metadata && typeof input.metadata === "object" ? input.metadata : {},
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
            };
            store.turns.push(turn);
            emitTurnChanged(turn, "enqueue");
            return { turn, duplicate: false };
        });
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
                    item.status = "queued";
                    item.revision += 1;
                    item.recovery_count += 1;
                    item.error = "执行租约过期，已恢复到原队列";
                    item.claimed_at = "";
                    item.lease_id = "";
                    item.lease_expires_at = "";
                    item.checkpoint = "lease_recovered";
                    item.updated_at = nowIso();
                }
            }
            const active = store.turns.find((item) => item.scope === scope
                && item.conversation_id === conversationId
                && item.status === "sending"
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
            requireExpectedRevision(turn, input?.revision ?? input?.expected_revision ?? input?.expectedRevision);
            turn.status = "sending";
            turn.revision += 1;
            turn.active_run_id = String(input?.active_run_id || input?.activeRunId || turn.active_run_id || "");
            turn.claimed_at = nowIso();
            turn.updated_at = turn.claimed_at;
            turn.lease_id = `lease_${crypto.randomBytes(12).toString("hex")}`;
            turn.lease_expires_at = new Date(Date.now() + Math.max(15_000, Math.min(15 * 60_000, Number(input?.lease_ms || input?.leaseMs || 13 * 60_000)))).toISOString();
            turn.checkpoint = "claimed";
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
    defer(id, reason = "当前会话仍在执行，已保留到原队列", expectedRevision) {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === String(id || ""));
            if (!turn)
                throw new Error("队列消息不存在");
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
    cancel(id, reason = "用户取消了这条排队消息", expectedRevision) {
        return this.settle({ id, status: "cancelled", error: reason, revision: expectedRevision });
    }
    guide(id, expectedRevision) {
        return this.mutate((store) => {
            const index = store.turns.findIndex((item) => item.id === id);
            if (index < 0)
                throw new Error("队列消息不存在");
            const turn = store.turns[index];
            requireExpectedRevision(turn, expectedRevision);
            if (turn.status !== "queued")
                throw new Error("只有等待发送的消息可以引导当前工作");
            turn.mode = "steer";
            turn.revision += 1;
            turn.metadata = { ...turn.metadata, requested_mode: "steer" };
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
    retry(id, expectedRevision) {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            requireExpectedRevision(turn, expectedRevision);
            if (!TERMINAL_STATUSES.has(turn.status))
                throw new Error("这条消息当前不需要重试");
            turn.status = "queued";
            turn.revision += 1;
            turn.retry_count += 1;
            turn.error = "";
            turn.result = null;
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
    heartbeat(input) {
        const id = String(input?.id || "").trim();
        const leaseId = String(input?.lease_id || input?.leaseId || "").trim();
        if (!id || !leaseId)
            throw new Error("缺少队列消息或租约 ID");
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn || turn.status !== "sending" || turn.lease_id !== leaseId)
                throw new Error("队列执行租约已失效");
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
    if (current?.kind === "task_dispatch" && current.task_id) {
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === String(current.task_id));
        const taskStatus = String(task?.status || "pending").toLowerCase();
        if (task && !["pending", "queued", "waiting_dependency", "waiting"].includes(taskStatus)) {
            const error = new Error("任务已经开始执行，请从任务卡安全停止");
            error.code = "TASK_ALREADY_STARTED";
            error.statusCode = 409;
            throw error;
        }
    }
    const turn = exports.conversationTurnControl.cancel(id, payload?.reason, payload?.revision);
    if (turn.kind === "task_dispatch" && turn.task_id) {
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
    const source = task?.cron_job_id || task?.cron_occurrence_id || rawSource === "schedule" || rawSource === "cron"
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
        occurrence_id: task?.cron_occurrence_id || "",
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
let webConversationTurnRecoveryTimer = null;
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
    const activeStatuses = new Set(["pending", "queued", "in_progress", "running", "executing", "verifying", "reviewing", "reworking", "blocked", "waiting", "waiting_user", "interrupted", "recovering"]);
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
async function postQueuedConversationTurn(baseUrl, turn) {
    const identity = turnConversationIdentity(turn);
    if (!identity)
        throw new Error("排队消息缺少目标会话");
    const files = (turn.attachments || []).filter((item) => item?.savedPath && fs.existsSync(String(item.savedPath)));
    if (identity.scope === "project") {
        const pathname = "/api/send-stream";
        return fetch(`${baseUrl}${pathname}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname) },
            body: JSON.stringify({
                project: identity.resourceId,
                session_id: identity.sessionId,
                message: turn.message,
                files,
                parent_run_id: turn.metadata?.parent_run_id || turn.metadata?.continuation_task_id || "",
                source: "web",
            }),
        });
    }
    const pathname = "/api/groups/send?stream=1";
    if (files.length) {
        const form = new FormData();
        form.append("group_id", identity.resourceId);
        form.append("group_session_id", identity.sessionId);
        form.append("message", turn.message);
        form.append("client_message_id", turn.request_id);
        form.append("message_mode", String(turn.metadata?.message_mode || "conversation"));
        for (const file of files) {
            const blob = new Blob([fs.readFileSync(String(file.savedPath))], { type: String(file.contentType || "application/octet-stream") });
            form.append("files", blob, String(file.name || file.filename || "附件"));
        }
        return fetch(`${baseUrl}${pathname}`, { method: "POST", headers: (0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname), body: form });
    }
    return fetch(`${baseUrl}${pathname}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("server-recovery", "POST", pathname) },
        body: JSON.stringify({
            group_id: identity.resourceId,
            group_session_id: identity.sessionId,
            message: turn.message,
            client_message_id: turn.request_id,
            message_mode: String(turn.metadata?.message_mode || "conversation"),
        }),
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
                if (response.status === 409) {
                    exports.conversationTurnControl.defer(turn.id, "当前任务仍占用会话，已保留原队列位置");
                    break;
                }
                if (!response.ok || /\"type\"\s*:\s*\"error\"/.test(body))
                    throw new Error(`会话消息处理失败（HTTP ${response.status}）`);
                exports.conversationTurnControl.settle({ id: turn.id, status: "completed", result: { delivered: true } });
            }
            catch (error) {
                exports.conversationTurnControl.settle({ id: turn.id, status: "failed", error: error?.message || String(error) });
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
    const tick = () => {
        const queued = exports.conversationTurnControl.listInternal({ statuses: "queued", limit: 500 }).turns
            .filter((turn) => turn.kind === "user_message" && turn.source === "web" && ["project", "group"].includes(turn.scope));
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
    if (pathname === "/api/conversation-turns/enqueue" && req.method === "POST"
        && String(req.headers["content-type"] || "").includes("multipart/form-data")) {
        void (0, secure_multipart_1.parseSecureMultipartRequest)(req, { maxFiles: 10 }).then((multipart) => {
            try {
                const payload = normalizeHttpEnqueuePayload(req, JSON.parse(String(multipart.fields.payload || "{}")));
                if (!authorizeTurnMutation(req, res, payload)) {
                    (0, secure_multipart_1.cleanupSecureMultipartFiles)(multipart.files);
                    return;
                }
                const result = exports.conversationTurnControl.enqueue({ ...payload, attachments: adoptQueuedAttachments(multipart.files) });
                (0, utils_1.sendJson)(res, { success: true, ...result, turn: publicTurnProjection(result.turn) });
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
            const result = exports.conversationTurnControl.enqueue(normalizeHttpEnqueuePayload(req, payload));
            return { ...result, turn: publicTurnProjection(result.turn) };
        },
        "/api/conversation-turns/claim": (payload) => ({ turn: publicClaimProjection(exports.conversationTurnControl.claim(payload)) }),
        "/api/conversation-turns/settle": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.settle(payload)) }),
        "/api/conversation-turns/heartbeat": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.heartbeat(payload)) }),
        "/api/conversation-turns/defer": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.defer(String(payload?.id || ""), payload?.reason, payload?.revision)) }),
        "/api/conversation-turns/cancel": (payload) => {
            const result = cancelConversationTurn(payload);
            return { turn: publicTurnProjection(result.turn) };
        },
        "/api/conversation-turns/guide": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.guide(String(payload?.id || ""), payload?.revision)) }),
        "/api/conversation-turns/retry": (payload) => ({ turn: publicTurnProjection(exports.conversationTurnControl.retry(String(payload?.id || ""), payload?.revision)) }),
    };
    const operation = operations[pathname];
    if (!operation || req.method !== "POST")
        return false;
    readRequestBody(req).then((payload) => {
        if (!authorizeTurnMutation(req, res, payload))
            return;
        const result = operation(payload);
        (0, utils_1.sendJson)(res, { success: true, ...result });
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
        const reclaimed = store.claim({ scope: "group", conversation_id: "g1:s1" });
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
        const checks = {
            idempotentEnqueue: duplicate.duplicate && duplicate.turn.id === first.turn.id && rows.length === 3,
            fifoClaim: claimed?.id === first.turn.id && reclaimed?.id === first.turn.id,
            guidedTurnPromoted: guided.mode === "steer"
                && guided.metadata.requested_mode === "steer"
                && guidedClaim?.id === third.turn.id,
            restartRecovery: recovered.recovered === 1 && reclaimed?.recovery_count === 1,
            terminalStates: rows.find((item) => item.id === first.turn.id)?.status === "completed"
                && rows.find((item) => item.id === third.turn.id)?.status === "completed"
                && rows.find((item) => item.id === second.turn.id)?.status === "cancelled",
            persistedSchema: (0, atomic_json_file_1.readJsonWithBackup)(file, null)?.schema === "ccm-conversation-turn-control-v2",
            safeAttachmentProjection: attached.turn.id === publicAttached?.id
                && publicAttached?.attachmentRefs?.[0]?.name === "说明.txt"
                && !JSON.stringify(publicAttached).includes("PRIVATE_QUEUE_ATTACHMENT"),
            completedAttachmentCleanup: !fs.existsSync(attachmentPath),
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