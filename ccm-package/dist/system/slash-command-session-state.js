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
exports.GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED = void 0;
exports.conversationPlanModeSupported = conversationPlanModeSupported;
exports.readSlashCommandSessionState = readSlashCommandSessionState;
exports.exitSlashCommandSessionPlanMode = exitSlashCommandSessionPlanMode;
exports.renderSlashCommandSessionDirective = renderSlashCommandSessionDirective;
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const STATE_FILE = path.join(utils_1.CCM_DIR, "slash-command-conversation-state.json");
exports.GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED = "全局会话不支持 Plan 模式。全局 Agent 不读取项目代码；实现计划请到群聊或项目主 Agent 会话。";
function conversationPlanModeSupported(scope) {
    return scope === "project" || scope === "group";
}
function sessionKey(scope, scopeId, exactSessionId) {
    const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
    return `${scope}:${normalizedScopeId}:${String(exactSessionId || "").trim()}`;
}
function readSlashCommandSessionState(scope, scopeId, exactSessionId) {
    const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
    const sessionId = String(exactSessionId || "").trim();
    if (!sessionId || !normalizedScopeId)
        return { revision: 0, generation: 0, preferences: {}, planMode: { enabled: false } };
    const store = (0, atomic_json_file_1.readJsonWithBackup)(STATE_FILE, { sessions: {} });
    const state = store.sessions?.[sessionKey(scope, scopeId, sessionId)] || {};
    return {
        revision: Math.max(0, Number(state.revision || 0)),
        generation: Math.max(0, Number(state.generation || 0)),
        preferences: state.preferences && typeof state.preferences === "object" ? state.preferences : {},
        planMode: state.planMode && typeof state.planMode === "object" ? state.planMode : { enabled: false },
    };
}
function exitSlashCommandSessionPlanMode(scope, scopeId, exactSessionId) {
    const sessionId = String(exactSessionId || "").trim();
    const normalizedScopeId = scope === "global" ? "global" : String(scopeId || "").trim();
    if (!sessionId || !normalizedScopeId)
        return { exited: false };
    const current = readSlashCommandSessionState(scope, scopeId, sessionId);
    if (current.planMode?.enabled !== true) {
        return { exited: false, alreadyAgent: true, revision: current.revision, generation: current.generation };
    }
    return (0, atomic_json_file_1.withFileLock)(STATE_FILE, () => {
        const store = (0, atomic_json_file_1.readJsonWithBackup)(STATE_FILE, { sessions: {} });
        store.sessions = store.sessions && typeof store.sessions === "object" ? store.sessions : {};
        const key = sessionKey(scope, scopeId, sessionId);
        const previous = store.sessions[key] || { revision: 0, generation: 0 };
        const now = new Date().toISOString();
        const planMode = {
            enabled: false,
            planId: String(previous.planMode?.planId || ""),
            description: String(previous.planMode?.description || ""),
            exitedAt: now,
            updatedAt: now,
        };
        const next = { ...previous, planMode, revision: Number(previous.revision || 0) + 1, updatedAt: now };
        store.sessions[key] = next;
        store.revision = Number(store.revision || 0) + 1;
        store.updatedAt = now;
        (0, atomic_json_file_1.writeJsonAtomic)(STATE_FILE, store);
        return { exited: true, revision: next.revision, generation: Number(next.generation || 0), planMode };
    });
}
function renderSlashCommandSessionDirective(scope, scopeId, exactSessionId) {
    const state = readSlashCommandSessionState(scope, scopeId, exactSessionId);
    const lines = [];
    if (conversationPlanModeSupported(scope) && state.planMode?.enabled === true) {
        lines.push("当前精确会话处于 Plan Mode：只允许分析、读取和制定计划，鼓励只读探索后必须调用 ccm_present_plan 出卡，不得派发写任务、修改代码或执行有副作用操作。", state.planMode.description ? `Plan Mode 目标：${String(state.planMode.description).slice(0, 4000)}` : "");
    }
    const style = String(state.preferences?.outputStyle || "").trim();
    if (style)
        lines.push(`当前会话输出风格=${style}：concise=简洁直接，balanced=平衡，detailed=充分展开；不覆盖安全与证据要求。`);
    return lines.filter(Boolean).join("\n");
}
//# sourceMappingURL=slash-command-session-state.js.map