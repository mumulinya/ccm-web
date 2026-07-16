"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalAgentHistoryRuntime = createGlobalAgentHistoryRuntime;
const fs_1 = __importDefault(require("fs"));
// Persistent Web/Feishu conversation history and session routing.
function createGlobalAgentHistoryRuntime(deps) {
    const { GLOBAL_AGENT_HISTORY_FILE, GLOBAL_AGENT_HISTORY_LIMIT, GLOBAL_AGENT_SESSION_LIMIT, buildGlobalVisibleReplyContent, ingestGlobalAgentConversation, writeGlobalJsonAtomic } = deps;
    const GLOBAL_AGENT_HISTORY_METADATA_KEYS = [
        "type",
        "source",
        "files",
        "agenticRun",
        "agentic_run",
        "globalMission",
        "global_mission",
        "globalMissionChildren",
        "global_mission_children",
        "globalMissionSupervisor",
        "global_mission_supervisor",
        "progressCheckpoints",
        "progress_checkpoints",
        "final_delivery_report",
        "finalDeliveryReport",
        "delivery_report",
        "deliveryReport",
        "display_stream",
        "displayStream",
        "workchain",
        "technical",
        "technical_content",
        "technicalContent",
        "trace_id",
        "mission_id",
        "run_id",
        "finalNotified",
    ];
    function truncateGlobalHistoryValue(value, maxChars = 80_000) {
        if (value === undefined)
            return undefined;
        if (typeof value === "string")
            return value.length > maxChars ? value.slice(0, maxChars) : value;
        if (typeof value === "number" || typeof value === "boolean" || value === null)
            return value;
        try {
            const json = JSON.stringify(value);
            if (json.length <= maxChars)
                return value;
            return { truncated: true, preview: json.slice(0, maxChars), original_chars: json.length };
        }
        catch {
            return null;
        }
    }
    function pickGlobalAgentHistoryMetadata(message) {
        const metadata = {};
        for (const key of GLOBAL_AGENT_HISTORY_METADATA_KEYS) {
            if (message?.[key] !== undefined) {
                const value = truncateGlobalHistoryValue(message[key]);
                if (value !== undefined)
                    metadata[key] = value;
            }
        }
        return metadata;
    }
    function normalizeGlobalAgentMessage(item) {
        if (!item || !["user", "assistant"].includes(String(item.role || "")) || !String(item.content || "").trim())
            return null;
        const role = String(item.role);
        const rawContent = String(item.content || "").slice(0, 8000);
        const visible = role === "assistant"
            ? buildGlobalVisibleReplyContent({ value: rawContent, rawSource: item.technical_content || item.technicalContent || rawContent, fallback: "回复已整理，技术细节已放入技术详情。", max: 8000 })
            : { text: rawContent, technical_content: "" };
        const metadata = pickGlobalAgentHistoryMetadata(item);
        if (role === "assistant" && visible.technical_content && !metadata.technical_content)
            metadata.technical_content = visible.technical_content;
        return {
            ...metadata,
            role,
            content: visible.text,
            timestamp: item.timestamp || new Date().toISOString(),
        };
    }
    function normalizeGlobalAgentMessages(messages = []) {
        return messages
            .map((item) => normalizeGlobalAgentMessage(item))
            .filter(Boolean)
            .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
    }
    function globalAgentHistoryMessageKey(message) {
        return [
            String(message?.role || ""),
            String(message?.timestamp || ""),
            String(message?.content || ""),
        ].join("\u0001");
    }
    function mergeGlobalAgentMessages(existing = [], incoming = []) {
        const seen = new Set();
        const byKey = new Map();
        const candidates = [...(existing || []), ...(incoming || [])]
            .map((item) => normalizeGlobalAgentMessage(item))
            .filter(Boolean);
        for (const message of candidates) {
            const key = globalAgentHistoryMessageKey(message);
            const previous = byKey.get(key);
            byKey.set(key, previous ? { ...previous, ...pickGlobalAgentHistoryMetadata(message), role: previous.role, content: previous.content, timestamp: previous.timestamp } : message);
        }
        const merged = [];
        for (const message of byKey.values()) {
            const key = globalAgentHistoryMessageKey(message);
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push(message);
        }
        return merged
            .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
            .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
    }
    function runGlobalAgentHistorySyncSelfTest() {
        const timestamp = "2026-07-07T10:00:00.000Z";
        const completedRun = {
            id: "run-history-sync",
            status: "completed",
            final_reply: "登录修复已完成。",
            final_delivery_report: {
                schema: "ccm-main-agent-delivery-report-v1",
                headline: "登录修复已完成。",
                status: "done",
                files: ["src/Login.vue"],
                verification: ["npm test"],
            },
            display_stream: {
                schema: "ccm-streamlined-display-v2",
                delivery_report: {
                    schema: "ccm-main-agent-delivery-report-v1",
                    headline: "登录修复已完成。",
                },
            },
        };
        const normalized = normalizeGlobalAgentMessages([{
                role: "assistant",
                content: "登录修复已完成。",
                timestamp,
                type: "global_agent_result",
                agenticRun: completedRun,
                progress_checkpoints: { items: [{ label: "任务交付完成", status: "done" }] },
            }])[0];
        const protocolNormalized = normalizeGlobalAgentMessages([{
                role: "assistant",
                content: "CCM_AGENT_RECEIPT status=done trace_id=trace-secret <task-notification>raw payload</task-notification>",
                timestamp,
            }])[0];
        const artifactNormalized = normalizeGlobalAgentMessages([{
                role: "assistant",
                content: "TestAgent report: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/report.md; manifest: C:/Users/admin/.cc-connect/test-agent-artifacts/run-1/artifact-manifest.json",
                timestamp,
            }])[0];
        const merged = mergeGlobalAgentMessages([{ role: "assistant", content: "登录修复已完成。", timestamp }], [normalized])[0];
        const checks = {
            preservesType: normalized?.type === "global_agent_result",
            preservesRun: normalized?.agenticRun?.id === "run-history-sync",
            preservesDeliveryReport: normalized?.agenticRun?.final_delivery_report?.headline === "登录修复已完成。",
            mergesRicherMetadata: merged?.agenticRun?.final_delivery_report?.files?.includes("src/Login.vue"),
            preservesProgressCheckpoints: merged?.progress_checkpoints?.items?.[0]?.label === "任务交付完成",
            sanitizesProtocolContent: !String(protocolNormalized?.content || "").includes("CCM_AGENT_RECEIPT")
                && String(protocolNormalized?.technical_content || "").includes("CCM_AGENT_RECEIPT"),
            sanitizesArtifactPathContent: !/test-agent-artifacts|artifact-manifest\.json|report\.md/i.test(String(artifactNormalized?.content || ""))
                && String(artifactNormalized?.technical_content || "").includes("artifact-manifest.json"),
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    function loadGlobalAgentHistoryStore() {
        try {
            if (fs_1.default.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
                const data = JSON.parse(fs_1.default.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8"));
                return { sessions: [], ...data };
            }
        }
        catch { }
        try {
            const recovered = JSON.parse(fs_1.default.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8"));
            return { sessions: [], ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
        }
        catch { }
        return { current_session_id: "", sessions: [] };
    }
    function saveGlobalAgentHistoryStore(store) {
        const sessions = Array.isArray(store.sessions) ? store.sessions : [];
        store.sessions = sessions
            .map((session) => ({
            ...session,
            messages: normalizeGlobalAgentMessages(session.messages || []),
            updatedAt: session.updatedAt || new Date().toISOString(),
        }))
            .filter((session) => session.id && session.messages.length > 0)
            .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
            .slice(0, GLOBAL_AGENT_SESSION_LIMIT);
        writeGlobalJsonAtomic(GLOBAL_AGENT_HISTORY_FILE, store);
    }
    function reconcileGlobalAgentWebHistory(store, payload) {
        const incomingSessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        const preservedSessions = (Array.isArray(store.sessions) ? store.sessions : [])
            .filter((session) => session.source !== "web");
        const existingWebSessions = new Map((Array.isArray(store.sessions) ? store.sessions : [])
            .filter((session) => session.source === "web")
            .map((session) => [String(session.id), session]));
        const webSessions = [];
        for (const session of incomingSessions) {
            const id = String(session.id || "").trim();
            if (!id)
                continue;
            const existing = existingWebSessions.get(id);
            const incomingMessages = Array.isArray(session.messages) ? session.messages : [];
            const lastMessageAt = incomingMessages[incomingMessages.length - 1]?.timestamp || "";
            webSessions.push({
                id,
                name: session.name || existing?.name || "全局 Agent 会话",
                source: "web",
                createdAt: existing?.createdAt || session.createdAt || new Date().toISOString(),
                updatedAt: session.updatedAt || session.updated_at || lastMessageAt || existing?.updatedAt || new Date().toISOString(),
                messages: mergeGlobalAgentMessages(existing?.messages || [], incomingMessages),
            });
        }
        const sessions = [...webSessions, ...preservedSessions];
        const requestedCurrentId = String(payload.currentSessionId || "").trim();
        const currentSessionId = webSessions.some((session) => session.id === requestedCurrentId)
            ? requestedCurrentId
            : webSessions
                .slice()
                .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0]?.id || "";
        return { ...store, sessions, current_session_id: currentSessionId };
    }
    function syncGlobalAgentWebHistory(payload) {
        const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        const store = loadGlobalAgentHistoryStore();
        for (const session of sessions) {
            const id = String(session.id || "").trim();
            if (!id)
                continue;
            try {
                ingestGlobalAgentConversation({ sessionId: id, source: "web", messages: session.messages || [] });
            }
            catch (error) {
                console.warn(`[全局记忆] Web 会话写入失败 (${id})：${error?.message || error}`);
            }
        }
        const reconciled = reconcileGlobalAgentWebHistory(store, payload);
        saveGlobalAgentHistoryStore(reconciled);
        return reconciled;
    }
    function getBaseGlobalAgentMessages(store) {
        const sessions = Array.isArray(store.sessions) ? store.sessions : [];
        const current = sessions.find((item) => item.id === store.current_session_id && item.source !== "feishu")
            || sessions.find((item) => item.source === "web")
            || sessions[0];
        return normalizeGlobalAgentMessages(current?.messages || []);
    }
    function getGlobalAgentConversationMessages(sessionId) {
        const store = loadGlobalAgentHistoryStore();
        const existing = (store.sessions || []).find((item) => item.id === sessionId);
        if (existing)
            return normalizeGlobalAgentMessages(existing.messages || []);
        return getBaseGlobalAgentMessages(store);
    }
    function appendGlobalAgentConversationMessage(sessionId, role, content, source = "feishu") {
        const store = loadGlobalAgentHistoryStore();
        const sessions = Array.isArray(store.sessions) ? store.sessions : [];
        let session = sessions.find((item) => item.id === sessionId);
        if (!session) {
            session = {
                id: sessionId,
                name: source === "feishu" ? "飞书全局 Agent" : "全局 Agent 会话",
                source,
                createdAt: new Date().toISOString(),
                messages: getBaseGlobalAgentMessages(store),
            };
            sessions.unshift(session);
        }
        const message = { role, content, timestamp: new Date().toISOString(), source };
        try {
            ingestGlobalAgentConversation({ sessionId, source, messages: [message] });
        }
        catch (error) {
            console.warn(`[全局记忆] 会话消息写入失败 (${sessionId})：${error?.message || error}`);
        }
        session.messages = normalizeGlobalAgentMessages([...(session.messages || []), message]);
        session.updatedAt = new Date().toISOString();
        store.sessions = sessions;
        saveGlobalAgentHistoryStore(store);
    }
    function buildFeishuConversationId(payload) {
        const raw = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || payload?.message?.session_id || payload?.data?.session_id || "default";
        return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
    }
    function resolveFeishuGlobalAgentSessionId(payload, store = loadGlobalAgentHistoryStore()) {
        const explicitConversationId = String(payload?.ccm_conversation_id || payload?.ccmConversationId || "").trim();
        if (explicitConversationId)
            return explicitConversationId;
        const sessions = Array.isArray(store.sessions) ? store.sessions : [];
        const webSessions = sessions.filter((session) => session.source === "web" && session.id);
        const currentSessionId = String(store.current_session_id || "").trim();
        const current = webSessions.find((session) => String(session.id) === currentSessionId);
        if (current)
            return String(current.id);
        const recent = webSessions
            .slice()
            .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))[0];
        return recent ? String(recent.id) : buildFeishuConversationId(payload);
    }
    function runFeishuGlobalAgentSessionRoutingSelfTest() {
        const oldWeb = { id: "session-deleted", source: "web", updatedAt: "2026-07-01T00:00:00.000Z", messages: [{ role: "user", content: "old" }] };
        const recentWeb = { id: "session-recent", source: "web", updatedAt: "2026-07-12T08:00:00.000Z", messages: [{ role: "user", content: "recent" }] };
        const currentWeb = { id: "session-current", source: "web", updatedAt: "2026-07-11T08:00:00.000Z", messages: [{ role: "user", content: "current" }] };
        const staleStore = { current_session_id: oldWeb.id, sessions: [oldWeb, currentWeb, recentWeb] };
        const reconciled = reconcileGlobalAgentWebHistory(staleStore, { sessions: [currentWeb, recentWeb], currentSessionId: recentWeb.id });
        const checks = {
            removesDeletedWebSession: !reconciled.sessions.some((session) => session.id === oldWeb.id),
            usesValidCurrentSession: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, reconciled) === recentWeb.id,
            fallsBackToMostRecentWebSession: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, { ...reconciled, current_session_id: "missing" }) === recentWeb.id,
            onlyUsesAcpSessionWithoutWebHistory: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, { current_session_id: "", sessions: [] }) === "feishu:acp-bound",
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    return {
        runGlobalAgentHistorySyncSelfTest,
        mergeGlobalAgentMessages,
        loadGlobalAgentHistoryStore,
        syncGlobalAgentWebHistory,
        getGlobalAgentConversationMessages,
        appendGlobalAgentConversationMessage,
        resolveFeishuGlobalAgentSessionId,
        runFeishuGlobalAgentSessionRoutingSelfTest,
    };
}
//# sourceMappingURL=global-agent-history.js.map