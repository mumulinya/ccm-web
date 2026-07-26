"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGlobalAgentHistoryRuntime = createGlobalAgentHistoryRuntime;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const global_agent_attachments_1 = require("./global-agent-attachments");
// Persistent Web/Feishu conversation history and session routing.
function createGlobalAgentHistoryRuntime(deps) {
    const { GLOBAL_AGENT_HISTORY_FILE, GLOBAL_AGENT_HISTORY_LIMIT, GLOBAL_AGENT_SESSION_LIMIT, buildGlobalVisibleReplyContent, ingestGlobalAgentConversation, writeGlobalJsonAtomic } = deps;
    const onSessionTitleChanged = typeof deps.onSessionTitleChanged === "function"
        ? deps.onSessionTitleChanged
        : () => { };
    const generateSessionTitle = typeof deps.generateSessionTitle === "function"
        ? deps.generateSessionTitle
        : async () => ({ title: "", source: "skipped" });
    const isSessionTitlePlaceholder = typeof deps.isSessionTitlePlaceholder === "function"
        ? deps.isSessionTitlePlaceholder
        : (title, origin = "") => String(origin || "").toLowerCase() !== "manual"
            && ["", "新会话", "新建飞书会话", "默认会话", "全局 Agent 会话", "飞书全局 Agent"].includes(String(title || "").trim());
    const isMeaningfulSessionTitleInput = typeof deps.isMeaningfulSessionTitleInput === "function"
        ? deps.isMeaningfulSessionTitleInput
        : (value) => /\p{L}/u.test(String(value || ""));
    const globalSessionTitleJobs = new Map();
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
                const value = key === "files"
                    ? (0, global_agent_attachments_1.sanitizeGlobalHistoryAttachments)(message[key], message?.role)
                    : truncateGlobalHistoryValue(message[key]);
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
                return {
                    ...data,
                    sessions: (Array.isArray(data.sessions) ? data.sessions : []).map((session) => ({
                        ...session,
                        messages: normalizeGlobalAgentMessages(session.messages || []),
                    })),
                };
            }
        }
        catch { }
        try {
            const recovered = JSON.parse(fs_1.default.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8"));
            return {
                ...recovered,
                sessions: (Array.isArray(recovered.sessions) ? recovered.sessions : []).map((session) => ({
                    ...session,
                    messages: normalizeGlobalAgentMessages(session.messages || []),
                })),
                storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() },
            };
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
    function scheduleGlobalSessionAutoTitle(sessionId) {
        const existingJob = globalSessionTitleJobs.get(sessionId);
        if (existingJob)
            return existingJob;
        const job = (async () => {
            const store = loadGlobalAgentHistoryStore();
            const session = (store.sessions || []).find((item) => String(item.id) === sessionId);
            if (!session || !isSessionTitlePlaceholder(session.name, session.titleOrigin))
                return { renamed: false, reason: "title_already_set", session };
            const messages = normalizeGlobalAgentMessages(session.messages || []);
            const userIndex = messages.findIndex((message) => message.role === "user"
                && (isMeaningfulSessionTitleInput(message.content) || (message.files || []).length));
            if (userIndex < 0)
                return { renamed: false, reason: "user_message_missing", session };
            const userMessage = messages[userIndex];
            const assistantMessage = messages.slice(userIndex + 1).find((message) => message.role === "assistant" && String(message.content || "").trim());
            if (!assistantMessage)
                return { renamed: false, reason: "assistant_reply_missing", session };
            const generated = await generateSessionTitle({
                scope: "global",
                userMessage: String(userMessage.content || ""),
                assistantMessage: String(assistantMessage.content || ""),
                attachmentNames: (userMessage.files || []).map((file) => String(file?.name || "")).filter(Boolean),
            });
            if (!generated?.title)
                return { renamed: false, reason: "title_input_skipped", generated };
            const latestStore = loadGlobalAgentHistoryStore();
            const current = (latestStore.sessions || []).find((item) => String(item.id) === sessionId);
            if (!current || !isSessionTitlePlaceholder(current.name, current.titleOrigin))
                return { renamed: false, reason: "title_changed_during_generation", session: current };
            current.name = generated.title;
            current.titleOrigin = generated.source === "model" ? "model" : "fallback";
            current.titleGeneratedAt = new Date().toISOString();
            current.updatedAt = current.titleGeneratedAt;
            saveGlobalAgentHistoryStore(latestStore);
            onSessionTitleChanged(current);
            return { renamed: true, session: current, generated };
        })().finally(() => globalSessionTitleJobs.delete(sessionId));
        globalSessionTitleJobs.set(sessionId, job);
        return job;
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
            const incomingName = String(session.name || "").trim();
            const existingName = String(existing?.name || "").trim();
            const keepExistingTitle = !!existingName
                && !isSessionTitlePlaceholder(existingName, existing?.titleOrigin)
                && isSessionTitlePlaceholder(incomingName, session.titleOrigin);
            const resolvedName = keepExistingTitle ? existingName : incomingName || existingName || "全局 Agent 会话";
            webSessions.push({
                id,
                name: resolvedName,
                titleOrigin: keepExistingTitle ? existing?.titleOrigin : session.titleOrigin || existing?.titleOrigin || (isSessionTitlePlaceholder(resolvedName) ? "placeholder" : "manual"),
                titleGeneratedAt: keepExistingTitle ? existing?.titleGeneratedAt || "" : session.titleGeneratedAt || existing?.titleGeneratedAt || "",
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
        const sessions = (Array.isArray(payload.sessions) ? payload.sessions : [])
            .filter((session) => String(session?.source || "web").toLowerCase() === "web");
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
        const reconciled = reconcileGlobalAgentWebHistory(store, { ...payload, sessions });
        saveGlobalAgentHistoryStore(reconciled);
        for (const session of reconciled.sessions || []) {
            if (String(session.source || "") !== "web")
                continue;
            void scheduleGlobalSessionAutoTitle(String(session.id || "")).catch((error) => {
                console.warn(`[全局会话] 自动命名失败 (${session.id})：${error?.message || error}`);
            });
        }
        return reconciled;
    }
    function createGlobalAgentConversationSession(input = {}) {
        const source = String(input.source || "web").toLowerCase() === "feishu" ? "feishu" : "web";
        const now = new Date().toISOString();
        const id = source === "feishu"
            ? `feishu:manual:${crypto_1.default.randomBytes(10).toString("hex")}`
            : `session_${Date.now()}_${crypto_1.default.randomBytes(4).toString("hex")}`;
        const name = String(input.name || (source === "feishu" ? "新建飞书会话" : "新会话")).trim().slice(0, 80)
            || (source === "feishu" ? "新建飞书会话" : "新会话");
        const welcome = String(input.welcome || (source === "feishu"
            ? "飞书会话已创建。绑定飞书目标后，该目标的新消息和回复会在此会话中连续保存。"
            : "全局 Agent 会话已创建。"));
        const session = {
            id,
            name,
            titleOrigin: isSessionTitlePlaceholder(name) ? "placeholder" : "manual",
            source,
            createdAt: now,
            updatedAt: now,
            messages: [{ role: "assistant", content: welcome, timestamp: now, source }],
        };
        const store = loadGlobalAgentHistoryStore();
        store.sessions = [session, ...(store.sessions || [])];
        if (source === "web")
            store.current_session_id = id;
        saveGlobalAgentHistoryStore(store);
        return session;
    }
    function deleteGlobalAgentConversationSession(sessionId, expectedSource = "") {
        const id = String(sessionId || "").trim();
        if (!id)
            throw new Error("缺少全局会话 ID");
        const source = String(expectedSource || "").trim().toLowerCase();
        const store = loadGlobalAgentHistoryStore();
        const session = (store.sessions || []).find((item) => String(item.id || "") === id);
        if (!session)
            return { deleted: false, session: null };
        if (source && String(session.source || "web").toLowerCase() !== source) {
            throw new Error("会话来源与删除请求不匹配");
        }
        store.sessions = (store.sessions || []).filter((item) => String(item.id || "") !== id);
        if (String(store.current_session_id || "") === id) {
            store.current_session_id = (store.sessions || []).find((item) => String(item.source || "web") === "web")?.id || "";
        }
        saveGlobalAgentHistoryStore(store);
        return { deleted: true, session };
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
        if (String(sessionId || "").startsWith("feishu:"))
            return [];
        return getBaseGlobalAgentMessages(store);
    }
    function appendGlobalAgentConversationMessage(sessionId, role, content, source = "feishu") {
        const store = loadGlobalAgentHistoryStore();
        const sessions = Array.isArray(store.sessions) ? store.sessions : [];
        let session = sessions.find((item) => item.id === sessionId);
        if (!session) {
            session = {
                id: sessionId,
                name: source === "feishu" ? "新建飞书会话" : "全局 Agent 会话",
                titleOrigin: "placeholder",
                source,
                createdAt: new Date().toISOString(),
                messages: source === "feishu" ? [] : getBaseGlobalAgentMessages(store),
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
        if (role === "assistant") {
            void scheduleGlobalSessionAutoTitle(sessionId).catch((error) => {
                console.warn(`[全局会话] 自动命名失败 (${sessionId})：${error?.message || error}`);
            });
        }
    }
    function buildFeishuConversationId(payload) {
        const message = payload?.event?.message || payload?.message || {};
        const sender = payload?.event?.sender?.sender_id || payload?.sender || {};
        const chatId = String(message.chat_id || payload?.chat_id || payload?.chatId || "").trim();
        const openId = String(sender.open_id || payload?.open_id || payload?.openId || "").trim();
        const nativeSession = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || message.session_id || payload?.data?.session_id || "default";
        const raw = chatId ? `${chatId}:${openId || "chat"}` : nativeSession;
        return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
    }
    function resolveFeishuGlobalAgentSessionId(payload, store = loadGlobalAgentHistoryStore()) {
        const explicitConversationId = String(payload?.ccm_conversation_id || payload?.ccmConversationId || "").trim();
        if (explicitConversationId && explicitConversationId.startsWith("feishu:"))
            return explicitConversationId;
        return buildFeishuConversationId(payload);
    }
    function runFeishuGlobalAgentSessionRoutingSelfTest() {
        const oldWeb = { id: "session-deleted", source: "web", updatedAt: "2026-07-01T00:00:00.000Z", messages: [{ role: "user", content: "old" }] };
        const recentWeb = { id: "session-recent", source: "web", updatedAt: "2026-07-12T08:00:00.000Z", messages: [{ role: "user", content: "recent" }] };
        const currentWeb = { id: "session-current", source: "web", updatedAt: "2026-07-11T08:00:00.000Z", messages: [{ role: "user", content: "current" }] };
        const staleStore = { current_session_id: oldWeb.id, sessions: [oldWeb, currentWeb, recentWeb] };
        const reconciled = reconcileGlobalAgentWebHistory(staleStore, { sessions: [currentWeb, recentWeb], currentSessionId: recentWeb.id });
        const checks = {
            removesDeletedWebSession: !reconciled.sessions.some((session) => session.id === oldWeb.id),
            isolatesAcpSessionFromWebHistory: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, reconciled) === "feishu:acp-bound",
            ignoresRecentWebSessionFallback: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, { ...reconciled, current_session_id: "missing" }) === "feishu:acp-bound",
            onlyUsesAcpSessionWithoutWebHistory: resolveFeishuGlobalAgentSessionId({ sessionId: "acp-bound" }, { current_session_id: "", sessions: [] }) === "feishu:acp-bound",
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    return {
        runGlobalAgentHistorySyncSelfTest,
        mergeGlobalAgentMessages,
        loadGlobalAgentHistoryStore,
        syncGlobalAgentWebHistory,
        createGlobalAgentConversationSession,
        deleteGlobalAgentConversationSession,
        getGlobalAgentConversationMessages,
        appendGlobalAgentConversationMessage,
        scheduleGlobalSessionAutoTitle,
        resolveFeishuGlobalAgentSessionId,
        runFeishuGlobalAgentSessionRoutingSelfTest,
    };
}
//# sourceMappingURL=global-agent-history.js.map