"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANDOM_MUSIC_KEYWORD = void 0;
exports.resolveMusicIntentDecisionV2 = resolveMusicIntentDecisionV2;
exports.resolveMusicPlaybackRequestFallback = resolveMusicPlaybackRequestFallback;
exports.resolveMusicPlaybackRequest = resolveMusicPlaybackRequest;
exports.extractMusicIntent = extractMusicIntent;
exports.normalizeMusicAgentAction = normalizeMusicAgentAction;
exports.normalizeMusicAgentMessages = normalizeMusicAgentMessages;
exports.classifyMusicAgentAction = classifyMusicAgentAction;
exports.getMusicHelpText = getMusicHelpText;
exports.writeSse = writeSse;
exports.callClaudeAgent = callClaudeAgent;
exports.runMusicAgentIntentSelfTest = runMusicAgentIntentSelfTest;
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
const semantic_decision_runtime_1 = require("../../system/semantic-decision-runtime");
exports.RANDOM_MUSIC_KEYWORD = "__random__";
function normalizeMusicSourceMode(value) {
    const mode = String(value || "").trim().toLowerCase();
    if (mode === "local")
        return "local";
    if (mode === "netease")
        return "netease";
    if (mode === "bilibili")
        return "bilibili";
    if (mode === "douyin")
        return "douyin";
    return "auto";
}
function validateMusicIntentDecision(value, requestText, mode) {
    const actions = new Set(["none", "search", "play", "convert"]);
    const strategies = new Set(["none", "exact_song", "artist_random", "mood_recommendation", "genre_recommendation", "random"]);
    const action = String(value?.action || "").trim().toLowerCase();
    const strategy = String(value?.strategy || (action === "play" ? "" : "none")).trim().toLowerCase();
    if (!actions.has(action))
        throw new Error("模型返回了无效音乐动作");
    if (!strategies.has(strategy))
        throw new Error("模型返回了无效音乐播放策略");
    if (action === "play" && strategy === "none")
        throw new Error("播放动作缺少播放策略");
    if (action !== "play" && strategy !== "none")
        throw new Error("非播放动作不能携带播放策略");
    const artist = String(value?.artist || "").trim().slice(0, 100);
    const mood = String(value?.mood || "").trim().slice(0, 100);
    const genre = String(value?.genre || "").trim().slice(0, 100);
    let searchQuery = String(value?.searchQuery || value?.search_query || "").trim().slice(0, 160);
    if (strategy === "random")
        searchQuery = exports.RANDOM_MUSIC_KEYWORD;
    if (["play", "search", "convert"].includes(action) && !searchQuery)
        searchQuery = artist || genre;
    if (["play", "search", "convert"].includes(action) && !searchQuery)
        throw new Error("模型没有返回可执行的音乐搜索条件");
    return {
        schema: "ccm-music-intent-decision-v2",
        action: action,
        strategy: strategy,
        originalRequest: String(requestText || "").trim().slice(0, 2_000),
        searchQuery,
        artist,
        mood,
        genre,
        sourceMode: normalizeMusicSourceMode(value?.sourceMode || mode),
        randomize: strategy === "artist_random" || strategy === "mood_recommendation" || strategy === "genre_recommendation" || strategy === "random",
        strictMatch: strategy === "exact_song",
        confidence: Math.max(0, Math.min(1, Number(value?.confidence || 0))),
        reason: String(value?.reason || "统一大模型已生成音乐意图").trim().slice(0, 500),
    };
}
async function resolveMusicIntentDecisionV2(input) {
    const message = String(input.message || "").trim();
    if (!message)
        throw new Error("音乐请求不能为空");
    const mode = normalizeMusicSourceMode(input.mode);
    const recent = normalizeMusicAgentMessages(input.history || [], "", 8).map(item => ({
        role: item.role,
        content: item.content.slice(0, 800),
    }));
    const system = `你是 CCM 音乐意图决策器。只输出 JSON，不要 Markdown。
动作只能是 none、search、play、convert。播放策略只能是 exact_song、artist_random、mood_recommendation、genre_recommendation、random；非播放动作 strategy 必须是 none。
- 明确歌曲名：play + exact_song。
- 只指定歌手：play + artist_random，不能猜固定歌曲。
- 心情、活动或场景：play + mood_recommendation，生成简短可搜索主题。
- 曲风、语言或类型：play + genre_recommendation。
- 没有限制且明确要求播放：play + random，searchQuery 为 __random__。
- 只要求查找、推荐列表或询问有没有：search。
- 下载、转码或转换：convert。
- 闲聊、歌词问题、播放器说明：none。
sourceMode 默认必须为 auto；只有用户在当前消息中明确指定“本地、网易、B站或抖音”时才返回 local、netease、bilibili 或 douyin。
页面当前浏览标签不是来源限制，不得据此缩小AI点歌来源。
返回：{"action":"none|search|play|convert","strategy":"none|exact_song|artist_random|mood_recommendation|genre_recommendation|random","searchQuery":"","artist":"","mood":"","genre":"","sourceMode":"auto|local|netease|bilibili|douyin","confidence":0.0,"reason":""}`;
    const result = await (0, semantic_decision_runtime_1.runSemanticDecision)({
        kind: "music_intent",
        identity: {
            scope: "music",
            scopeId: "music-agent",
            sessionId: String(input.sessionId || "music-singleton"),
            ...(input.requestId ? { taskId: String(input.requestId) } : {}),
        },
        system,
        input: { message, mode, recent },
        config: input.config,
        maxTokens: 500,
        validate: (value) => validateMusicIntentDecision(value, message, mode),
        confidence: value => value.confidence,
    });
    return { ...result.value, semanticDecisionReceipt: result.receipt };
}
function resolveMusicPlaybackRequestFallback(requestText, keyword = "") {
    void requestText;
    void keyword;
    throw new Error("本地音乐语义兜底已停用；必须使用 resolveMusicPlaybackRequest 的模型决策");
}
function normalizeMusicPlaybackPlan(value, requestText, keyword = "", source = "model") {
    const allowed = new Set(["exact_song", "artist_random", "mood_recommendation", "genre_recommendation", "random"]);
    if (!allowed.has(value?.strategy))
        throw new Error("模型返回了无效音乐播放策略");
    const strategy = value.strategy;
    const artist = String(value?.artist || "").trim().slice(0, 100);
    const mood = String(value?.mood || "").trim().slice(0, 100);
    const genre = String(value?.genre || "").trim().slice(0, 100);
    let searchQuery = String(value?.searchQuery || value?.search_query || "").trim().slice(0, 160);
    if (strategy === "random")
        searchQuery = exports.RANDOM_MUSIC_KEYWORD;
    if (!searchQuery)
        searchQuery = artist || genre;
    if (!searchQuery)
        throw new Error("模型没有返回可执行的音乐搜索条件");
    return {
        schema: "ccm-music-playback-plan-v1",
        strategy,
        originalRequest: String(requestText || keyword || "").trim(),
        searchQuery,
        artist,
        mood,
        genre,
        randomize: strategy !== "exact_song",
        strictMatch: strategy === "exact_song",
        source,
        reason: String(value?.reason || "统一大模型已选择音乐播放策略").trim().slice(0, 300),
    };
}
async function resolveMusicPlaybackRequest(cfg, requestText, keyword = "") {
    try {
        const decision = await resolveMusicIntentDecisionV2({ config: cfg, message: requestText || keyword, mode: "auto" });
        if (decision.action !== "play" || decision.strategy === "none")
            throw new Error("模型没有确认这是播放请求");
        return normalizeMusicPlaybackPlan(decision, requestText, keyword, "model");
    }
    catch (error) {
        throw new Error(`统一大模型无法选择音乐播放策略：${error?.message || error}`);
    }
}
function extractMusicIntent(msg) {
    void msg;
    throw new Error("本地音乐意图识别已停用；必须调用 classifyMusicAgentAction");
}
function normalizeMusicActionKeyword(keyword, randomIfGeneric = false) {
    void randomIfGeneric;
    const cleaned = String(keyword || "")
        .replace(/[，。！？、]/g, " ")
        .trim();
    return cleaned;
}
function extractJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced)
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    return null;
}
function normalizeMusicAgentAction(value, message, mode, source = "agent") {
    const rawType = String(value?.action || value?.type || value?.intent || "").trim().toLowerCase();
    const type = ["play_music", "play"].includes(rawType)
        ? "play_music"
        : ["search_music", "search"].includes(rawType)
            ? "search_music"
            : ["convert_music", "convert", "download"].includes(rawType)
                ? "convert_music"
                : rawType === "none" || rawType === "help" || rawType === "chat"
                    ? "none"
                    : "none";
    const rawKeyword = String(value?.keyword || value?.query || value?.song || "").trim();
    void message;
    if (["play_music", "search_music", "convert_music"].includes(type) && !rawKeyword) {
        throw new Error("模型没有返回音乐动作所需的 keyword");
    }
    return {
        type,
        keyword: type === "play_music"
            ? normalizeMusicActionKeyword(rawKeyword, true)
            : type === "convert_music"
                ? String(rawKeyword || "").trim()
                : normalizeMusicActionKeyword(rawKeyword, false),
        mode: mode || "cloud",
        source,
        confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? (source === "agent" ? 0.75 : 0)) || 0)),
        reason: String(value?.reason || (source === "agent" ? "音乐 Agent 结构化决策" : "未获得模型语义决策")).slice(0, 500),
    };
}
function shouldUseAnthropicMusicApi(config) {
    return String(config?.format || "").trim().toLowerCase() === "anthropic" || (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config);
}
function musicMessageText(content) {
    if (typeof content === "string")
        return content.trim();
    if (Array.isArray(content)) {
        return content
            .map((part) => {
            if (typeof part === "string")
                return part;
            if (part?.type === "text" || part?.type === "input_text" || part?.type === "output_text")
                return part.text || "";
            return typeof part?.content === "string" ? part.content : "";
        })
            .filter(Boolean)
            .join("\n")
            .trim();
    }
    if (content && typeof content === "object") {
        if (typeof content.text === "string")
            return content.text.trim();
        if (typeof content.content === "string")
            return content.content.trim();
    }
    return "";
}
function normalizeMusicAgentMessages(history = [], currentMessage = "", limit = 10) {
    const normalized = [];
    for (const item of Array.isArray(history) ? history.slice(-Math.max(limit * 2, limit)) : []) {
        const role = item?.role === "operator" || item?.role === "user"
            ? "user"
            : item?.role === "agent" || item?.role === "assistant"
                ? "assistant"
                : null;
        const content = musicMessageText(item?.content);
        if (!role || !content)
            continue;
        const previous = normalized[normalized.length - 1];
        if (previous?.role === role)
            previous.content = `${previous.content}\n\n${content}`;
        else
            normalized.push({ role, content });
    }
    const current = musicMessageText(currentMessage);
    while (current && normalized.at(-1)?.role === "user" && normalized.at(-1)?.content === current)
        normalized.pop();
    if (current) {
        const previous = normalized[normalized.length - 1];
        if (previous?.role === "user")
            previous.content = `${previous.content}\n\n${current}`;
        else
            normalized.push({ role: "user", content: current });
    }
    const result = normalized.slice(-Math.max(1, limit));
    while (result[0]?.role === "assistant")
        result.shift();
    return result;
}
async function classifyMusicAgentAction(cfg, message, mode, history = []) {
    try {
        const decision = await resolveMusicIntentDecisionV2({ config: cfg, message, mode, history });
        const actionType = decision.action === "play"
            ? "play_music"
            : decision.action === "search"
                ? "search_music"
                : decision.action === "convert"
                    ? "convert_music"
                    : "none";
        return {
            type: actionType,
            keyword: decision.searchQuery,
            mode: mode || "cloud",
            source: "agent",
            confidence: decision.confidence,
            reason: decision.reason,
            playbackPlan: decision.action === "play" ? {
                schema: "ccm-music-playback-plan-v1",
                strategy: decision.strategy,
                originalRequest: decision.originalRequest,
                searchQuery: decision.searchQuery,
                artist: decision.artist,
                mood: decision.mood,
                genre: decision.genre,
                randomize: decision.randomize,
                strictMatch: decision.strictMatch,
                source: "model",
                reason: decision.reason,
            } : null,
            intentDecision: decision,
            semanticDecisionReceipt: decision.semanticDecisionReceipt,
        };
    }
    catch (error) {
        return {
            type: "none",
            keyword: "",
            mode: mode || "cloud",
            source: "model_unavailable",
            confidence: 0,
            reason: "统一大模型无法可靠识别音乐动作",
            error: error?.message || String(error),
        };
    }
}
function getMusicHelpText(chatMode) {
    if (chatMode === "local") {
        return `🎵 本地音乐助手\n\n你可以说：\n• "播放 周杰伦" - 搜索并播放\n• "搜索 轻音乐" - 搜索本地曲库\n• "来首钢琴曲" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录`;
    }
    if (chatMode === "netease") {
        return `🎵 网易音乐助手\n\n你可以说：\n• "我想听周杰伦的歌" - 搜索网易\n• "搜索 轻音乐" - 搜索网易音乐\n• "来首适合学习的音乐" - 智能推荐\n\n点击搜索结果可一键下载为本地 MP3`;
    }
    return `🎵 B站音乐助手\n\n你可以说：\n• "我想听周杰伦的歌" - 搜索B站\n• "搜索 轻音乐" - 搜索B站视频\n• "来首适合编程的音乐" - 智能推荐\n\n点击搜索结果可一键转码为本地 MP3`;
}
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    catch { }
}
async function callClaudeAgent(cfg, system, messages, res, _chatMode, _options = {}) {
    const isAnthropicCompat = shouldUseAnthropicMusicApi(cfg);
    try {
        const normalized = normalizeMusicAgentMessages(messages, "", 20);
        const text = isAnthropicCompat
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(cfg, {
                system,
                messages: normalized,
                maxTokens: 1_024,
                temperature: 0.2,
                defaultTimeoutMs: Number(cfg?.timeoutMs || 120_000),
                retryScope: "music_conversation",
                providerContextCache: { scope: "music", scopeId: "music-agent", sessionId: "music-singleton", source: "music_conversation" },
            })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(cfg, {
                messages: [{ role: "system", content: system }, ...normalized],
                maxTokens: 1_024,
                temperature: 0.2,
                defaultTimeoutMs: Number(cfg?.timeoutMs || 120_000),
                retryScope: "music_conversation",
                providerContextCache: { scope: "music", scopeId: "music-agent", sessionId: "music-singleton", source: "music_conversation" },
            });
        writeSse(res, { type: "text", text });
        writeSse(res, { type: "done" });
        res.end();
    }
    catch (error) {
        writeSse(res, { type: "error", text: error?.message || "音乐助手暂时不可用" });
        writeSse(res, { type: "done" });
        res.end();
    }
}
function runMusicAgentIntentSelfTest() {
    const { runMusicRemoteCommandQueueSelfTest } = require("./state");
    const playSpecific = normalizeMusicAgentAction({ action: "play_music", keyword: "周杰伦 晴天", confidence: 0.93 }, "我想听周杰伦的晴天", "cloud", "agent");
    const playRandom = normalizeMusicAgentAction({ action: "play_music", keyword: exports.RANDOM_MUSIC_KEYWORD, confidence: 0.9 }, "播放音乐", "cloud", "agent");
    const searchOnly = normalizeMusicAgentAction({ action: "search_music", keyword: "轻音乐", confidence: 0.9 }, "搜索轻音乐", "cloud", "agent");
    const questionOnly = normalizeMusicAgentAction({ action: "none", confidence: 0.9 }, "歌词怎么显示？", "cloud", "agent");
    const normalizedHistory = normalizeMusicAgentMessages([
        { role: "agent", content: "欢迎使用音乐助手" },
        { role: "operator", content: "播放晴天" },
        { role: "agent", content: "" },
    ], "播放晴天");
    const structuredHistory = normalizeMusicAgentMessages([
        { role: "operator", content: [{ type: "input_text", text: "搜索轻音乐" }] },
        { role: "agent", content: [{ type: "output_text", text: "找到一些结果" }] },
    ], "继续推荐");
    const queueSelfTest = runMusicRemoteCommandQueueSelfTest();
    const exactPlan = normalizeMusicPlaybackPlan({ strategy: "exact_song", searchQuery: "周杰伦 晴天", reason: "模型识别明确歌曲" }, "播放周杰伦的晴天", "周杰伦 晴天", "model");
    const sadPlan = normalizeMusicPlaybackPlan({ strategy: "mood_recommendation", searchQuery: "治愈 温柔", mood: "难过", reason: "模型识别情绪" }, "我心情不好，给我播放一首歌", exports.RANDOM_MUSIC_KEYWORD, "model");
    const happyPlan = normalizeMusicPlaybackPlan({ strategy: "mood_recommendation", searchQuery: "欢快 庆祝", mood: "开心", reason: "模型识别情绪" }, "我今天心情很好，放首歌吧", exports.RANDOM_MUSIC_KEYWORD, "model");
    const artistPlan = normalizeMusicPlaybackPlan({ strategy: "artist_random", searchQuery: "周杰伦", artist: "周杰伦", reason: "模型识别歌手" }, "播放周杰伦的歌", "周杰伦", "model");
    const genrePlan = normalizeMusicPlaybackPlan({ strategy: "genre_recommendation", searchQuery: "摇滚", genre: "摇滚", reason: "模型识别曲风" }, "来一首摇滚音乐", "摇滚", "model");
    const playMusicSpec = (() => {
        try {
            const { GLOBAL_AGENT_TOOL_SPECS } = require("../../agents/global/loop");
            return (GLOBAL_AGENT_TOOL_SPECS || []).find((item) => item.name === "play_music");
        }
        catch {
            return null;
        }
    })();
    const checks = {
        agentPlayAction: playSpecific.type === "play_music" && playSpecific.keyword === "周杰伦 晴天" && playSpecific.source === "agent",
        genericPlayBecomesRandom: playRandom.type === "play_music" && playRandom.keyword === exports.RANDOM_MUSIC_KEYWORD,
        modelPlayRequiresNoLocalFallback: playRandom.source === "agent",
        searchDoesNotAutoplay: searchOnly.type === "search_music" && searchOnly.keyword === "轻音乐",
        questionDoesNotAutoplay: questionOnly.type !== "play_music",
        emptyPendingMessageRemoved: normalizedHistory.every(item => item.content.trim().length > 0),
        currentMessageNotDuplicated: normalizedHistory.filter(item => item.content.includes("播放晴天")).length === 1,
        conversationStartsWithUser: normalizedHistory[0]?.role === "user",
        structuredTextContentSupported: structuredHistory.map(item => item.content).join("|") === "搜索轻音乐|找到一些结果|继续推荐",
        openAiBaseUrlUsesUnifiedEndpoint: (0, group_orchestrator_llm_client_1.normalizeChatCompletionsUrl)("https://provider.example") === "https://provider.example/v1/chat/completions",
        anthropicBaseUrlUsesUnifiedEndpoint: (0, group_orchestrator_llm_client_1.normalizeAnthropicMessagesUrl)("https://provider.example") === "https://provider.example/v1/messages",
        remoteCommandQueue: queueSelfTest.success === true,
        remoteCommandKeepsOriginalRequest: queueSelfTest.checks?.requestTextPreserved === true,
        exactSongStaysStrict: exactPlan.strategy === "exact_song" && exactPlan.strictMatch === true,
        sadMoodBeatsRandomKeyword: sadPlan.strategy === "mood_recommendation" && sadPlan.searchQuery.includes("治愈"),
        happyMoodRecommendation: happyPlan.strategy === "mood_recommendation" && happyPlan.searchQuery.includes("欢快"),
        artistOnlyRandomizes: artistPlan.strategy === "artist_random" && artistPlan.artist === "周杰伦" && artistPlan.randomize === true,
        genreRecommendation: genrePlan.strategy === "genre_recommendation" && genrePlan.genre === "摇滚",
        playMusicIsReadRisk: !playMusicSpec || playMusicSpec.risk === "read",
    };
    return { pass: Object.values(checks).every(Boolean), checks, samples: { playSpecific, playRandom, searchOnly, questionOnly, normalizedHistory, structuredHistory, queueSelfTest } };
}
//# sourceMappingURL=agent.js.map