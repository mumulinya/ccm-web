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
exports.handleConversationTurnControlApi = handleConversationTurnControlApi;
exports.runConversationTurnControlSelfTest = runConversationTurnControlSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const STORE_FILE = path.join(utils_1.CCM_DIR, "conversation-turn-control.json");
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
function emptyStore() {
    return { schema: "ccm-conversation-turn-control-v1", generation: 0, updated_at: nowIso(), turns: [] };
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
            request_id: String(input?.request_id || input?.requestId || id),
            scope,
            conversation_id: conversationId,
            mode: normalizeMode(input?.mode),
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
        return !Number.isFinite(settledAt) || settledAt >= cutoff;
    });
    if (retained.length <= MAX_RECORDS)
        return retained;
    const active = retained.filter((turn) => ACTIVE_STATUSES.has(turn.status));
    const terminal = retained.filter((turn) => !ACTIVE_STATUSES.has(turn.status));
    return [...active, ...terminal.slice(Math.max(0, terminal.length - Math.max(0, MAX_RECORDS - active.length)))];
}
class ConversationTurnControlStore {
    file;
    constructor(file = STORE_FILE) {
        this.file = file;
    }
    read() {
        const raw = (0, atomic_json_file_1.readJsonWithBackup)(this.file, emptyStore());
        return {
            schema: "ccm-conversation-turn-control-v1",
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
                if (turn.status !== "sending")
                    return turn;
                recovered += 1;
                return {
                    ...turn,
                    status: "queued",
                    recovery_count: turn.recovery_count + 1,
                    error: "服务重启后已恢复到待发送队列",
                    updated_at: at,
                    claimed_at: "",
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
                request_id: requestId,
                scope,
                conversation_id: conversationId,
                mode,
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
            };
            store.turns.push(turn);
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
            if (ACTIVE_STATUSES.has(turn.status)) {
                position = (queuePositions.get(key) || 0) + 1;
                queuePositions.set(key, position);
            }
            return { ...turn, position };
        });
        return { generation: store.generation, updated_at: store.updated_at, turns };
    }
    claim(input) {
        const scope = normalizeScope(input?.scope);
        const conversationId = String(input?.conversation_id || input?.conversationId || "").trim();
        if (!conversationId)
            throw new Error("缺少会话 ID");
        return this.mutate((store) => {
            const requestedId = String(input?.id || "").trim();
            const turn = store.turns.find((item) => item.scope === scope
                && item.conversation_id === conversationId
                && item.status === "queued"
                && (!requestedId || item.id === requestedId));
            if (!turn)
                return null;
            turn.status = "sending";
            turn.active_run_id = String(input?.active_run_id || input?.activeRunId || turn.active_run_id || "");
            turn.claimed_at = nowIso();
            turn.updated_at = turn.claimed_at;
            turn.error = "";
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
            if (turn.status === "cancelled" && status !== "cancelled")
                throw new Error("已取消的消息不能再次完成");
            const at = nowIso();
            turn.status = status;
            turn.error = String(input?.error || "");
            turn.result = input?.result ?? turn.result;
            turn.active_run_id = String(input?.active_run_id || input?.activeRunId || turn.active_run_id || "");
            turn.updated_at = at;
            turn.settled_at = at;
            return turn;
        });
    }
    cancel(id, reason = "用户取消了这条排队消息") {
        return this.settle({ id, status: "cancelled", error: reason });
    }
    retry(id) {
        return this.mutate((store) => {
            const turn = store.turns.find((item) => item.id === id);
            if (!turn)
                throw new Error("队列消息不存在");
            if (!TERMINAL_STATUSES.has(turn.status))
                throw new Error("这条消息当前不需要重试");
            turn.status = "queued";
            turn.retry_count += 1;
            turn.error = "";
            turn.result = null;
            turn.updated_at = nowIso();
            turn.claimed_at = "";
            turn.settled_at = "";
            return turn;
        });
    }
}
exports.ConversationTurnControlStore = ConversationTurnControlStore;
exports.conversationTurnControl = new ConversationTurnControlStore();
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
    if (pathname === "/api/conversation-turns" && req.method === "GET") {
        try {
            return (0, utils_1.sendJson)(res, { success: true, ...exports.conversationTurnControl.list(parsed?.query || {}) });
        }
        catch (error) {
            return (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
        }
    }
    const operations = {
        "/api/conversation-turns/enqueue": (payload) => exports.conversationTurnControl.enqueue(payload),
        "/api/conversation-turns/claim": (payload) => ({ turn: exports.conversationTurnControl.claim(payload) }),
        "/api/conversation-turns/settle": (payload) => ({ turn: exports.conversationTurnControl.settle(payload) }),
        "/api/conversation-turns/cancel": (payload) => ({ turn: exports.conversationTurnControl.cancel(String(payload?.id || ""), payload?.reason) }),
        "/api/conversation-turns/retry": (payload) => ({ turn: exports.conversationTurnControl.retry(String(payload?.id || "")) }),
    };
    const operation = operations[pathname];
    if (!operation || req.method !== "POST")
        return false;
    readRequestBody(req).then((payload) => {
        const result = operation(payload);
        (0, utils_1.sendJson)(res, { success: true, ...result });
    }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
    return true;
}
function runConversationTurnControlSelfTest() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-turn-control-"));
    const file = path.join(dir, "turns.json");
    try {
        const store = new ConversationTurnControlStore(file);
        const first = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "第一条", request_id: "r1" });
        const duplicate = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "不应重复", request_id: "r1" });
        const second = store.enqueue({ scope: "group", conversation_id: "g1:s1", mode: "queue", message: "第二条", request_id: "r2" });
        const claimed = store.claim({ scope: "group", conversation_id: "g1:s1" });
        const recovered = new ConversationTurnControlStore(file).recoverInterrupted();
        const reclaimed = store.claim({ scope: "group", conversation_id: "g1:s1" });
        store.settle({ id: reclaimed?.id, status: "completed", result: { ok: true } });
        store.cancel(second.turn.id);
        const rows = store.list({ scope: "group", conversation_id: "g1:s1" }).turns;
        const checks = {
            idempotentEnqueue: duplicate.duplicate && duplicate.turn.id === first.turn.id && rows.length === 2,
            fifoClaim: claimed?.id === first.turn.id && reclaimed?.id === first.turn.id,
            restartRecovery: recovered.recovered === 1 && reclaimed?.recovery_count === 1,
            terminalStates: rows.find((item) => item.id === first.turn.id)?.status === "completed"
                && rows.find((item) => item.id === second.turn.id)?.status === "cancelled",
            persistedSchema: (0, atomic_json_file_1.readJsonWithBackup)(file, null)?.schema === "ccm-conversation-turn-control-v1",
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