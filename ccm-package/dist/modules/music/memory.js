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
exports.__musicMemoryTestHooks = exports.MUSIC_AGENT_SINGLETON_ID = exports.MUSIC_AGENT_MEMORY_SCHEMA = exports.MUSIC_AGENT_MEMORY_FILE = void 0;
exports.loadMusicAgentMemory = loadMusicAgentMemory;
exports.buildMusicAgentModelContext = buildMusicAgentModelContext;
exports.appendMusicAgentMessage = appendMusicAgentMessage;
exports.prepareMusicAgentTurn = prepareMusicAgentTurn;
exports.compactMusicAgentMemoryWithModel = compactMusicAgentMemoryWithModel;
exports.scheduleMusicLongTermMemoryExtraction = scheduleMusicLongTermMemoryExtraction;
exports.recordMusicAgentAssistantTurn = recordMusicAgentAssistantTurn;
exports.clearMusicAgentConversation = clearMusicAgentConversation;
exports.getPublicMusicAgentMemory = getPublicMusicAgentMemory;
exports.handleMusicMemoryApi = handleMusicMemoryApi;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const context_budget_1 = require("../../system/context-budget");
const session_memory_window_1 = require("../../system/session-memory-window");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const group_compaction_engine_part_01_1 = require("../collaboration/group-compaction-engine-part-01");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
exports.MUSIC_AGENT_MEMORY_FILE = path.join(utils_1.CCM_DIR, "music-agent-memory.json");
exports.MUSIC_AGENT_MEMORY_SCHEMA = "ccm-music-agent-memory-v1";
exports.MUSIC_AGENT_SINGLETON_ID = "music-agent";
const compactions = new Map();
const longTermExtractions = new Map();
function nowIso() {
    return new Date().toISOString();
}
function id(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}
function checksum(value) {
    return (0, session_compaction_core_1.sessionCompactionChecksum)(value);
}
function emptyLongTermMemory() {
    return {
        schema: "ccm-music-long-term-memory-v1",
        preferences: [],
        dislikes: [],
        favoriteArtists: [],
        favoriteGenres: [],
        listeningContexts: [],
        playbackPreferences: [],
        updatedAt: "",
        sourceMessageIds: [],
        extractionSource: "model",
    };
}
function emptyStore() {
    return {
        schema: exports.MUSIC_AGENT_MEMORY_SCHEMA,
        singletonId: exports.MUSIC_AGENT_SINGLETON_ID,
        transcript: [],
        compaction: null,
        longTermMemory: emptyLongTermMemory(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
}
function normalizeMessage(value) {
    const role = ["assistant", "agent"].includes(String(value?.role || "")) ? "assistant" : "user";
    return {
        id: String(value?.id || id("music_msg")),
        role,
        content: String(value?.content || "").trim(),
        timestamp: String(value?.timestamp || value?.time || nowIso()),
        ...(value?.action ? { action: value.action } : {}),
        ...(Array.isArray(value?.results) ? { results: value.results.slice(0, 20) } : {}),
    };
}
function normalizeStore(value) {
    const source = value?.schema === exports.MUSIC_AGENT_MEMORY_SCHEMA ? value : emptyStore();
    return {
        ...emptyStore(),
        ...source,
        schema: exports.MUSIC_AGENT_MEMORY_SCHEMA,
        singletonId: exports.MUSIC_AGENT_SINGLETON_ID,
        transcript: (Array.isArray(source.transcript) ? source.transcript : []).map(normalizeMessage).filter((message) => message.content),
        longTermMemory: { ...emptyLongTermMemory(), ...(source.longTermMemory || source.long_term_memory || {}) },
    };
}
function loadMusicAgentMemory() {
    return normalizeStore((0, atomic_json_file_1.readJsonWithBackup)(exports.MUSIC_AGENT_MEMORY_FILE, emptyStore()));
}
function saveMusicAgentMemory(value) {
    (0, atomic_json_file_1.writeJsonAtomic)(exports.MUSIC_AGENT_MEMORY_FILE, { ...normalizeStore(value), updatedAt: nowIso() });
}
function mutateStore(operation) {
    return (0, atomic_json_file_1.withFileLock)(exports.MUSIC_AGENT_MEMORY_FILE, () => {
        const store = loadMusicAgentMemory();
        const result = operation(store);
        saveMusicAgentMemory(store);
        return result;
    });
}
function compactionState(store) {
    return (0, session_compaction_core_1.normalizeSessionCompactionState)(store?.compaction?.v2 || store?.compaction || {}, {
        scope: "music",
        sessionId: exports.MUSIC_AGENT_SINGLETON_ID,
    });
}
function normalizeStringArray(value, max = 40) {
    return [...new Set((Array.isArray(value) ? value : []).map(item => String(item || "").trim()).filter(Boolean))].slice(-max);
}
function normalizeSummary(value, sourceMessageIds) {
    const source = value && typeof value === "object" ? value : {};
    return {
        schema: "ccm-music-session-summary-v1",
        userRequests: normalizeStringArray(source.userRequests || source.user_requests, 30),
        preferences: normalizeStringArray(source.preferences, 30),
        dislikes: normalizeStringArray(source.dislikes, 30),
        artistsAndGenres: normalizeStringArray(source.artistsAndGenres || source.artists_and_genres, 30),
        playbackDecisions: normalizeStringArray(source.playbackDecisions || source.playback_decisions, 30),
        unresolved: normalizeStringArray(source.unresolved, 20),
        latestContext: String(source.latestContext || source.latest_context || "").trim().slice(0, 3000),
        sourceMessageIds,
    };
}
function validSummary(value) {
    return !!value && typeof value === "object"
        && Array.isArray(value.userRequests)
        && Array.isArray(value.preferences)
        && Array.isArray(value.dislikes)
        && Array.isArray(value.artistsAndGenres)
        && Array.isArray(value.playbackDecisions)
        && Array.isArray(value.unresolved)
        && typeof value.latestContext === "string";
}
function activeSummaryVerified(store, state = compactionState(store)) {
    const summary = state.activeSummary || null;
    if (!summary)
        return null;
    if (!state.activeSummaryChecksum || state.activeSummaryChecksum !== checksum(summary)) {
        throw new Error("音乐 Agent 正式摘要 checksum 校验失败");
    }
    return summary;
}
function buildMusicAgentModelContext(currentRequest = "") {
    const store = loadMusicAgentMemory();
    const state = compactionState(store);
    const summary = activeSummaryVerified(store, state);
    const transcript = store.transcript;
    const pendingMatches = currentRequest && transcript.at(-1)?.role === "user" && transcript.at(-1)?.content === String(currentRequest).trim();
    const history = pendingMatches ? transcript.slice(0, -1) : transcript;
    const floorIndex = summary ? Math.max(0, state.lastCompactedIndex + 1) : 0;
    const recentWindow = summary ? (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(history, { floorIndex }) : {
        startIndex: 0,
        preservedTokenCount: history.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(message.content), 0),
        preservedTextMessageCount: history.length,
        preservedMessageCount: history.length,
    };
    const visibleMessages = summary ? history.slice(recentWindow.startIndex) : history;
    const capacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)((0, group_orchestrator_config_1.loadOrchestratorConfig)());
    const payload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
        scope: "music",
        sessionId: exports.MUSIC_AGENT_SINGLETON_ID,
        system: { role: "music-agent", model: (0, group_orchestrator_config_1.loadOrchestratorConfig)().model || "" },
        activeSummary: summary,
        recentMessages: visibleMessages,
        currentRequest,
        recoveryContext: { longTermMemory: store.longTermMemory },
    });
    const measurement = (0, session_compaction_core_1.measureSessionContextTokens)({
        scope: "music",
        sessionId: exports.MUSIC_AGENT_SINGLETON_ID,
        messages: visibleMessages,
        activeSummary: summary,
        latestProviderUsage: state.latestProviderUsage,
        modelVisiblePayload: payload,
        boundaryGeneration: state.boundaryGeneration,
    });
    return {
        schema: "ccm-music-agent-model-context-v1",
        mode: summary ? "canonical_summary_recent_raw" : "precompact_full_raw",
        summary,
        summaryChecksum: summary ? checksum(summary) : "",
        visibleMessages,
        archiveMessages: summary ? history.slice(0, recentWindow.startIndex) : [],
        longTermMemory: store.longTermMemory,
        transcriptMessageCount: transcript.length,
        recentWindow,
        modelVisiblePayload: payload,
        tokenMeasurement: measurement,
        modelContextCapacity: capacity,
        autoCompactThreshold: Number(capacity.autoCompactThreshold || 0),
        boundaryGeneration: state.boundaryGeneration,
        consecutiveFailures: state.consecutiveFailures,
        circuitOpen: (0, session_compaction_core_1.sessionCompactionCircuitOpen)(state),
    };
}
function appendMusicAgentMessage(role, content, extras = {}) {
    const text = String(content || "").trim();
    if (!text)
        return null;
    return mutateStore(store => {
        const message = normalizeMessage({ ...extras, role, content: text });
        store.transcript.push(message);
        store.transcript = store.transcript.slice(-5000);
        return message;
    });
}
function renderContinuity(context) {
    return [
        context.summary ? `当前音乐对话正式摘要：${JSON.stringify(context.summary)}` : "当前音乐对话尚未压缩，已提供全部原始历史。",
        `长期音乐偏好：${JSON.stringify(context.longTermMemory)}`,
    ].join("\n\n");
}
async function prepareMusicAgentTurn(message, mode = "cloud") {
    const text = String(message || "").trim();
    if (!text)
        throw new Error("缺少音乐助手消息");
    const before = buildMusicAgentModelContext(text);
    if (before.tokenMeasurement.activeTokens >= before.autoCompactThreshold) {
        await compactMusicAgentMemoryWithModel({ reason: "auto_model", currentRequest: text });
        const rebuilt = buildMusicAgentModelContext(text);
        if (rebuilt.tokenMeasurement.activeTokens >= rebuilt.autoCompactThreshold) {
            throw new Error(`音乐 Agent 上下文仍超过自动压缩线：${rebuilt.tokenMeasurement.activeTokens}/${rebuilt.autoCompactThreshold}`);
        }
    }
    appendMusicAgentMessage("user", text, { mode });
    const context = buildMusicAgentModelContext("");
    return {
        ...context,
        continuityText: renderContinuity(context),
        messages: context.visibleMessages.map((item) => ({ role: item.role, content: item.content })),
    };
}
async function compactMusicAgentMemoryWithModel(options = {}) {
    const existing = compactions.get(exports.MUSIC_AGENT_SINGLETON_ID);
    if (existing)
        return existing;
    const operation = (async () => {
        const store = loadMusicAgentMemory();
        let state = compactionState(store);
        const previousSummary = activeSummaryVerified(store, state);
        const transcript = store.transcript;
        const capacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)((0, group_orchestrator_config_1.loadOrchestratorConfig)());
        const threshold = Math.max(1, Number(options.threshold || capacity.autoCompactThreshold || 0));
        const context = buildMusicAgentModelContext(options.currentRequest || "");
        const beforeTokens = context.tokenMeasurement.activeTokens;
        if (!options.force && beforeTokens < threshold)
            return { compacted: false, reason: "below_threshold", beforeTokens, threshold };
        if ((0, session_compaction_core_1.sessionCompactionCircuitOpen)(state) && !options.force)
            return { compacted: false, reason: "circuit_breaker", consecutiveFailures: state.consecutiveFailures };
        const startIndex = Math.max(0, state.lastCompactedIndex + 1);
        const recentWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(transcript, { floorIndex: startIndex });
        const keepStart = recentWindow.startIndex;
        const segment = transcript.slice(startIndex, keepStart);
        if (!segment.length)
            return { compacted: false, reason: "nothing_to_compact", beforeTokens, threshold };
        const sourceMessageIds = segment.map((message) => message.id);
        const preHooks = await (0, session_compaction_core_1.runSessionCompactionHooks)("pre_compact", { scope: "music", sessionId: exports.MUSIC_AGENT_SINGLETON_ID, previousSummary, trigger: options.force ? "manual" : "auto" });
        const system = [
            "你是 CCM 音乐 Agent 对话压缩器。只输出 JSON，不要 Markdown。",
            "摘要用于继续同一个音乐助手上下文，必须合并上一轮摘要，不得覆盖仍有效的偏好、厌恶、点歌要求和未完成事项。",
            "不要把一次播放行为编造成长期偏好，不要编造歌曲、歌手或播放结果。",
            "字段固定为 userRequests,preferences,dislikes,artistsAndGenres,playbackDecisions,unresolved,latestContext。",
        ].join("\n");
        const basePayload = {
            previousSummary,
            previousSummaryChecksum: state.activeSummaryChecksum,
            longTermMemory: store.longTermMemory,
            hookResults: preHooks,
            timeline: segment.map((message) => ({ id: message.id, role: message.role, content: message.content, timestamp: message.timestamp })),
        };
        const invoke = options.modelCall || (async (request) => (0, group_compaction_engine_part_01_1.callCompactionModel)((0, group_orchestrator_config_1.loadOrchestratorConfig)(), request.system, request.user, 8_000));
        let timeline = basePayload.timeline;
        let attempts = 0;
        let candidate = null;
        let result = null;
        let lastError = null;
        while (attempts < 4) {
            try {
                result = await invoke({ system, user: JSON.stringify({ ...basePayload, timeline }), attempt: attempts + 1 });
                const rawSummary = result?.summary || result;
                if (!rawSummary || typeof rawSummary !== "object" || !Object.keys(rawSummary).length)
                    throw new Error("音乐 Agent 模型未返回摘要");
                candidate = normalizeSummary(rawSummary, sourceMessageIds);
                if (!validSummary(candidate))
                    throw new Error("音乐 Agent 模型摘要结构无效");
                break;
            }
            catch (error) {
                lastError = error;
                if (!(0, group_compaction_engine_part_01_1.isGroupCompactionPromptTooLongError)(error) || attempts >= 3)
                    break;
                const peeled = (0, session_memory_window_1.peelOldestCompleteConversationRound)(timeline);
                if (!peeled.peeled)
                    break;
                timeline = peeled.messages;
                attempts += 1;
            }
        }
        if (!validSummary(candidate))
            throw lastError || new Error("音乐 Agent 模型摘要不可用");
        const preservedMessages = transcript.slice(keepStart);
        const boundaryMarker = (0, session_compaction_core_1.buildSessionCompactionBoundaryMarker)({
            scope: "music",
            sessionId: exports.MUSIC_AGENT_SINGLETON_ID,
            generation: state.boundaryGeneration + 1,
            summarizedThroughMessageId: segment.at(-1)?.id || "",
            previousSummaryChecksum: state.activeSummaryChecksum,
            preservedMessageIds: preservedMessages.map((message) => message.id),
        });
        const sessionStartHooks = await (0, session_compaction_core_1.runSessionCompactionHooks)("session_start", { scope: "music", sessionId: exports.MUSIC_AGENT_SINGLETON_ID, summary: candidate, previousSummary, longTermMemory: store.longTermMemory });
        const postPayload = (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "music",
            sessionId: exports.MUSIC_AGENT_SINGLETON_ID,
            system: { role: "music-agent", model: (0, group_orchestrator_config_1.loadOrchestratorConfig)().model || "" },
            activeSummary: candidate,
            recentMessages: preservedMessages,
            currentRequest: options.currentRequest || null,
            recoveryContext: { boundaryMarker, longTermMemory: store.longTermMemory },
            hookResults: sessionStartHooks,
        });
        const postGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: postPayload, threshold });
        if (!postGate.providerCallAllowed)
            throw new Error(`音乐 Agent 压缩后仍超过阈值：${postPayload.totalTokens}/${threshold}`);
        const sourceTranscriptChecksum = checksum(transcript.map((message) => [message.id, message.role, message.content]));
        mutateStore(latest => {
            const latestChecksum = checksum(latest.transcript.map((message) => [message.id, message.role, message.content]));
            if (latestChecksum !== sourceTranscriptChecksum)
                throw new Error("音乐 Agent 对话在压缩期间发生变化，拒绝提交旧摘要");
            state = (0, session_compaction_core_1.resetSessionCompactionFailures)({
                ...state,
                activeSummary: candidate,
                activeSummaryChecksum: checksum(candidate),
                previousSummaryChecksum: state.activeSummaryChecksum,
                lastCompactedIndex: keepStart - 1,
                lastCompactedMessageId: segment.at(-1)?.id || "",
                preservedRecentMessageIds: preservedMessages.map((message) => message.id),
                preservedRecentTokens: recentWindow.preservedTokenCount,
                preservedRecentTextMessageCount: recentWindow.preservedTextMessageCount,
                latestProviderUsage: null,
                tokenMeasurement: context.tokenMeasurement,
                postCompactGate: postGate,
                lastCompactedAt: nowIso(),
                boundaryGeneration: state.boundaryGeneration + 1,
                modelVisiblePayloadChecksum: postPayload.payloadChecksum,
                fixedContextChecksum: postPayload.fixedContextChecksum,
                boundaryMarker,
                preservedSegmentChecksum: checksum(preservedMessages.map((message) => message.id)),
                recoveryContextTokens: postPayload.tokenBreakdown.recoveryContext,
                hookResultTokens: postPayload.tokenBreakdown.hookResults,
                ptlRecoveryAttempts: attempts,
            });
            latest.compaction = {
                schema: "ccm-music-agent-compaction-v1",
                summarySource: "model",
                activeSummary: candidate,
                activeSummaryChecksum: checksum(candidate),
                previousSummaryChecksum: state.previousSummaryChecksum,
                boundaryGeneration: state.boundaryGeneration,
                boundaryMarker,
                lastCompactedIndex: state.lastCompactedIndex,
                lastCompactedMessageId: state.lastCompactedMessageId,
                preservedRecentMessageIds: state.preservedRecentMessageIds,
                beforeTokens,
                afterTokens: postPayload.totalTokens,
                autoCompactThreshold: threshold,
                postCompactGate: postGate,
                archives: [...(Array.isArray(latest.compaction?.archives) ? latest.compaction.archives : []), {
                        id: id("music_compact"),
                        sourceMessageIds,
                        summaryChecksum: checksum(candidate),
                        previousSummaryChecksum: state.previousSummaryChecksum,
                        createdAt: nowIso(),
                    }].slice(-100),
                v2: state,
            };
        });
        const response = { compacted: true, summarySource: "model", beforeTokens, afterTokens: postPayload.totalTokens, threshold, boundaryGeneration: state.boundaryGeneration, postCompactGate: postGate };
        await (0, session_compaction_core_1.runSessionCompactionHooks)("post_compact", { scope: "music", sessionId: exports.MUSIC_AGENT_SINGLETON_ID, result: response });
        return response;
    })().catch(error => {
        mutateStore(store => {
            const failed = (0, session_compaction_core_1.recordSessionCompactionFailure)(compactionState(store), error);
            store.compaction = { ...(store.compaction || {}), consecutiveFailures: failed.consecutiveFailures, lastFailureAt: failed.lastFailureAt, lastError: failed.lastError, v2: failed };
        });
        throw error;
    }).finally(() => compactions.delete(exports.MUSIC_AGENT_SINGLETON_ID));
    compactions.set(exports.MUSIC_AGENT_SINGLETON_ID, operation);
    return operation;
}
function shouldExtractLongTerm(userMessage) {
    return /喜欢|不喜欢|讨厌|偏好|最爱|常听|以后|默认|总是|不要|别再|歌手|曲风|风格|模式|音量/.test(String(userMessage || ""));
}
function mergeLongTerm(existing, candidate, sourceMessageIds) {
    const mergeField = (current, added, removed, max) => {
        const removals = new Set(normalizeStringArray(removed, max).map(item => item.toLowerCase()));
        return normalizeStringArray([...(current || []), ...(added || [])], max)
            .filter(item => !removals.has(item.toLowerCase()));
    };
    return {
        ...emptyLongTermMemory(),
        preferences: mergeField(existing.preferences, candidate.preferences, candidate.removePreferences || candidate.remove_preferences, 60),
        dislikes: mergeField(existing.dislikes, candidate.dislikes, candidate.removeDislikes || candidate.remove_dislikes, 60),
        favoriteArtists: mergeField(existing.favoriteArtists, candidate.favoriteArtists || candidate.favorite_artists, candidate.removeFavoriteArtists || candidate.remove_favorite_artists, 50),
        favoriteGenres: mergeField(existing.favoriteGenres, candidate.favoriteGenres || candidate.favorite_genres, candidate.removeFavoriteGenres || candidate.remove_favorite_genres, 50),
        listeningContexts: mergeField(existing.listeningContexts, candidate.listeningContexts || candidate.listening_contexts, candidate.removeListeningContexts || candidate.remove_listening_contexts, 50),
        playbackPreferences: mergeField(existing.playbackPreferences, candidate.playbackPreferences || candidate.playback_preferences, candidate.removePlaybackPreferences || candidate.remove_playback_preferences, 50),
        updatedAt: nowIso(),
        sourceMessageIds: normalizeStringArray([...(existing.sourceMessageIds || []), ...sourceMessageIds], 200),
        extractionSource: "model",
    };
}
function scheduleMusicLongTermMemoryExtraction(userMessage, assistantMessage, sourceMessageIds = []) {
    if (!shouldExtractLongTerm(userMessage))
        return { scheduled: false, reason: "no_long_term_signal" };
    if (longTermExtractions.has(exports.MUSIC_AGENT_SINGLETON_ID))
        return { scheduled: false, reason: "already_in_flight" };
    const job = (async () => {
        const store = loadMusicAgentMemory();
        const system = [
            "你是 CCM 音乐长期记忆提取器。只输出 JSON，不要 Markdown。",
            "只保留用户明确表达、跨后续点歌仍有价值的偏好。一次播放或一次搜索不等于长期偏好。",
            "不得根据助手推荐猜测用户喜好，不得编造。没有长期内容时所有数组为空。",
            "支持用户纠正旧偏好；删除字段为 removePreferences,removeDislikes,removeFavoriteArtists,removeFavoriteGenres,removeListeningContexts,removePlaybackPreferences。",
            "新增字段为 preferences,dislikes,favoriteArtists,favoriteGenres,listeningContexts,playbackPreferences。所有字段都是字符串数组。",
        ].join("\n");
        const result = await (0, group_compaction_engine_part_01_1.callCompactionModel)((0, group_orchestrator_config_1.loadOrchestratorConfig)(), system, JSON.stringify({ existing: store.longTermMemory, userMessage, assistantMessage }), 2_000);
        const candidate = result?.summary || result;
        if (!candidate || typeof candidate !== "object")
            throw new Error("音乐长期记忆模型结果无效");
        mutateStore(latest => {
            latest.longTermMemory = mergeLongTerm(latest.longTermMemory || emptyLongTermMemory(), candidate, sourceMessageIds);
        });
        return { updated: true };
    })().catch(error => ({ updated: false, error: String(error?.message || error) })).finally(() => longTermExtractions.delete(exports.MUSIC_AGENT_SINGLETON_ID));
    longTermExtractions.set(exports.MUSIC_AGENT_SINGLETON_ID, job);
    return { scheduled: true, reason: "model_extraction_scheduled" };
}
function recordMusicAgentAssistantTurn(content, input = {}) {
    const assistant = appendMusicAgentMessage("assistant", content, { action: input.action, results: input.results });
    if (!assistant)
        return null;
    const store = loadMusicAgentMemory();
    const user = [...store.transcript].reverse().find((message) => message.role === "user" && (!input.userMessageId || message.id === input.userMessageId));
    if (user)
        scheduleMusicLongTermMemoryExtraction(user.content, assistant.content, [user.id, assistant.id]);
    return assistant;
}
function clearMusicAgentConversation(options = {}) {
    return mutateStore(store => {
        store.transcript = [];
        store.compaction = null;
        if (options.includeLongTerm)
            store.longTermMemory = emptyLongTermMemory();
        return { cleared: true, longTermCleared: !!options.includeLongTerm };
    });
}
function getPublicMusicAgentMemory() {
    const store = loadMusicAgentMemory();
    const context = buildMusicAgentModelContext("");
    return {
        schema: exports.MUSIC_AGENT_MEMORY_SCHEMA,
        singleton: true,
        messages: store.transcript,
        longTermMemory: store.longTermMemory,
        compaction: store.compaction,
        context: {
            mode: context.mode,
            currentTokens: context.tokenMeasurement.activeTokens,
            autoCompactThreshold: context.autoCompactThreshold,
            modelContextCapacity: context.modelContextCapacity,
            boundaryGeneration: context.boundaryGeneration,
            consecutiveFailures: context.consecutiveFailures,
            circuitOpen: context.circuitOpen,
            summarySource: context.summary ? "model" : "none",
        },
    };
}
function collectBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function handleMusicMemoryApi(pathname, req, res) {
    if (pathname === "/api/music/memory" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, memory: getPublicMusicAgentMemory() });
        return true;
    }
    if (pathname === "/api/music/memory" && req.method === "DELETE") {
        void collectBody(req).then(body => (0, utils_1.sendJson)(res, { success: true, ...clearMusicAgentConversation({ includeLongTerm: body.includeLongTerm === true }) })).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
        return true;
    }
    if (pathname === "/api/music/memory/assistant" && req.method === "POST") {
        void collectBody(req).then(body => {
            const message = recordMusicAgentAssistantTurn(String(body.content || ""), { action: body.action, results: body.results, userMessageId: body.userMessageId });
            (0, utils_1.sendJson)(res, { success: !!message, message, memory: getPublicMusicAgentMemory() });
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
        return true;
    }
    if (pathname === "/api/music/memory/compact" && req.method === "POST") {
        void collectBody(req).then(body => compactMusicAgentMemoryWithModel({ force: true, reason: "manual", currentRequest: body.instructions || "" })).then(result => (0, utils_1.sendJson)(res, { success: true, result, memory: getPublicMusicAgentMemory() })).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 409));
        return true;
    }
    return false;
}
exports.__musicMemoryTestHooks = {
    emptyStore,
    normalizeStore,
    normalizeSummary,
    validSummary,
    mergeLongTerm,
    shouldExtractLongTerm,
};
//# sourceMappingURL=memory.js.map