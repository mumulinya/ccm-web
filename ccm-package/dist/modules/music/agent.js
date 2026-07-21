"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANDOM_MUSIC_KEYWORD = void 0;
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
const bilibili_1 = require("./bilibili");
const netease_1 = require("./netease");
const library_1 = require("./library");
const group_orchestrator_llm_client_1 = require("../collaboration/group-orchestrator-llm-client");
exports.RANDOM_MUSIC_KEYWORD = "__random__";
const MOOD_PLAYBACK_RULES = [
    { pattern: /心情不好|不开心|难过|伤心|低落|失落|失恋|想哭|emo|郁闷|烦躁/i, mood: "低落", query: "治愈 温柔 放松" },
    { pattern: /心情很好|开心|高兴|快乐|兴奋|庆祝|元气满满/i, mood: "开心", query: "欢快 快乐 元气" },
    { pattern: /焦虑|紧张|压力|疲惫|很累|累了|放松|静一静/i, mood: "舒缓", query: "舒缓 放松 轻音乐" },
    { pattern: /睡觉|睡眠|失眠|助眠|晚安/i, mood: "助眠", query: "助眠 安静 轻音乐" },
    { pattern: /学习|写作业|看书|专注|工作|写代码|编程/i, mood: "专注", query: "专注 学习 轻音乐" },
    { pattern: /运动|健身|跑步|开车|提神/i, mood: "动感", query: "动感 节奏 提神" },
    { pattern: /浪漫|约会|表白|恋爱/i, mood: "浪漫", query: "浪漫 温柔 情歌" },
];
const MUSIC_GENRES = ["摇滚", "民谣", "古典", "爵士", "电子", "说唱", "嘻哈", "国风", "流行", "蓝调", "钢琴", "纯音乐", "轻音乐", "粤语", "日语", "英语", "华语"];
function cleanPlaybackSubject(value) {
    return String(value || "")
        .replace(/[，。！？、]/g, " ")
        .replace(/^(?:请|麻烦)?(?:你)?(?:帮我|给我)?\s*/g, "")
        .replace(/^(?:随机|随便|任意)?\s*(?:播放|放一首?|放|来一首?|来点|听一首?|听|我想听|我要听|想听)\s*/g, "")
        .replace(/(?:给我)?(?:播放|放一首?|来一首?|听一首?)\s*$/g, "")
        .replace(/\s*(?:吧|呗|呀|啊|可以吗|行吗)$/g, "")
        .trim();
}
function resolveMusicPlaybackRequestFallback(requestText, keyword = "") {
    const originalRequest = String(requestText || keyword || "").trim();
    const rawKeyword = String(keyword || "").trim();
    const generic = rawKeyword === exports.RANDOM_MUSIC_KEYWORD
        || /^(?:播放|放|听|来)(?:一首|点)?(?:音乐|歌曲|歌)?(?:吧|呗)?$/i.test(originalRequest)
        || /随机|随便|任意/.test(originalRequest);
    const base = {
        schema: "ccm-music-playback-plan-v1",
        originalRequest,
        artist: "",
        mood: "",
        genre: "",
        source: "fallback",
    };
    const moodRule = MOOD_PLAYBACK_RULES.find((item) => item.pattern.test(originalRequest));
    if (moodRule) {
        return { ...base, strategy: "mood_recommendation", searchQuery: moodRule.query, mood: moodRule.mood, randomize: true, strictMatch: false, reason: `根据${moodRule.mood}情绪推荐` };
    }
    const genre = MUSIC_GENRES.find((item) => originalRequest.includes(item)) || "";
    if (genre && /(?:来|放|播放|听|想听|推荐)/.test(originalRequest)) {
        return { ...base, strategy: "genre_recommendation", searchQuery: genre, genre, randomize: true, strictMatch: false, reason: `按${genre}风格选曲` };
    }
    if (generic) {
        return { ...base, strategy: "random", searchQuery: exports.RANDOM_MUSIC_KEYWORD, randomize: true, strictMatch: false, reason: "用户没有限定歌曲，随机播放" };
    }
    const artistOnlySource = cleanPlaybackSubject(originalRequest || rawKeyword);
    const artistMatch = artistOnlySource.match(/^(.+?)(?:的歌|的音乐|歌曲|音乐)$/)
        || originalRequest.match(/(?:播放|放|听|来一首|我想听|我要听)\s*([^，。！？]+?)(?:的歌|的音乐)(?:吧|呗|呀|啊)?$/);
    if (artistMatch?.[1]) {
        const artist = cleanPlaybackSubject(artistMatch[1]).replace(/(?:一首|一些|几首)$/g, "").trim();
        if (artist) {
            return { ...base, strategy: "artist_random", searchQuery: artist, artist, randomize: true, strictMatch: false, reason: `按歌手${artist}随机选曲` };
        }
    }
    const searchQuery = cleanPlaybackSubject(rawKeyword && rawKeyword !== exports.RANDOM_MUSIC_KEYWORD ? rawKeyword : originalRequest);
    if (!searchQuery) {
        return { ...base, strategy: "random", searchQuery: exports.RANDOM_MUSIC_KEYWORD, randomize: true, strictMatch: false, reason: "没有可用的点歌限定，随机播放" };
    }
    return { ...base, strategy: "exact_song", searchQuery, randomize: false, strictMatch: true, reason: "按明确歌名或歌手与歌名严格点歌" };
}
function normalizeMusicPlaybackPlan(value, requestText, keyword = "", source = "model") {
    const fallback = resolveMusicPlaybackRequestFallback(requestText, keyword);
    const allowed = new Set(["exact_song", "artist_random", "mood_recommendation", "genre_recommendation", "random"]);
    const strategy = allowed.has(value?.strategy) ? value.strategy : fallback.strategy;
    const artist = String(value?.artist || (strategy === "artist_random" ? fallback.artist : "")).trim().slice(0, 100);
    const mood = String(value?.mood || (strategy === "mood_recommendation" ? fallback.mood : "")).trim().slice(0, 100);
    const genre = String(value?.genre || (strategy === "genre_recommendation" ? fallback.genre : "")).trim().slice(0, 100);
    let searchQuery = String(value?.searchQuery || value?.search_query || "").trim().slice(0, 160);
    if (strategy === "random")
        searchQuery = exports.RANDOM_MUSIC_KEYWORD;
    if (!searchQuery)
        searchQuery = artist || genre || fallback.searchQuery;
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
        reason: String(value?.reason || fallback.reason).trim().slice(0, 300),
    };
}
async function resolveMusicPlaybackRequest(cfg, requestText, keyword = "") {
    const fallback = resolveMusicPlaybackRequestFallback(requestText, keyword);
    if (!cfg?.enabled || !cfg?.apiKey || !cfg?.model)
        return fallback;
    const system = `你是 CCM 音乐播放意图规划器。把用户请求转换成选歌策略，只输出 JSON，不要 Markdown。
策略只能是：
- exact_song：明确指定了歌曲名，必须严格匹配。
- artist_random：只指定歌手，没有指定歌曲，从该歌手作品中随机播放。
- mood_recommendation：用户描述心情、活动或场景，生成适合音乐搜索 API 的简短中文 searchQuery。
- genre_recommendation：只指定曲风、语言或音乐类型。
- random：没有任何限制，随机播放。
不得把“我心情不好”“适合写代码”等整句当成歌曲名。用户只说歌手的歌时不得猜一首固定歌名。
返回格式：{"strategy":"exact_song|artist_random|mood_recommendation|genre_recommendation|random","searchQuery":"","artist":"","mood":"","genre":"","reason":"一句话"}`;
    const user = `播放器已提取关键词：${keyword || "无"}\n用户完整原话：${requestText || keyword}`;
    try {
        const requestConfig = { ...cfg, timeoutMs: Math.min(8_000, Math.max(5_000, Number(cfg.timeoutMs) || 8_000)) };
        const content = shouldUseAnthropicMusicApi(requestConfig)
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(requestConfig, {
                system,
                messages: [{ role: "user", content: user }],
                maxTokens: 260,
                temperature: 0,
                defaultTimeoutMs: 8_000,
                httpErrorPrefix: "音乐播放意图识别失败",
            })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(requestConfig, {
                messages: [{ role: "system", content: system }, { role: "user", content: user }],
                maxTokens: 260,
                temperature: 0,
                defaultTimeoutMs: 8_000,
                httpErrorPrefix: "音乐播放意图识别失败",
            });
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error("模型未返回 JSON 播放计划");
        return normalizeMusicPlaybackPlan(parsed, requestText, keyword, "model");
    }
    catch (error) {
        return { ...fallback, reason: `${fallback.reason}；模型识别不可用：${error?.message || error}`.slice(0, 300) };
    }
}
function extractMusicIntent(msg) {
    const lower = msg.toLowerCase();
    const playMatch = msg.match(/(?:播放|放一首?|听一首?|来一首?|来点|来些|我想听|我要听|想听)(.*)/);
    if (playMatch)
        return { type: "play", keyword: normalizeMusicActionKeyword(playMatch[1].trim(), true) };
    const searchMatch = msg.match(/(?:搜索|找|查找|有没有)(.+)/);
    if (searchMatch)
        return { type: "search", keyword: searchMatch[1].trim() };
    if (/(?:转换|转码|下载|转成|转为)/.test(lower)) {
        const bvid = String(msg || "").match(/BV[\w]+/i)?.[0] || "";
        const songId = String(msg || "").match(/(?:song\?id=|id[=：:\s#]|网易云\s*[#]?)(\d{5,})/i)?.[1] ||
            String(msg || "").match(/\b(\d{6,})\b/)?.[1] ||
            "";
        return { type: "convert", keyword: bvid || songId || "" };
    }
    if (/[?？]|(?:怎么|如何|为什么|是什么|是啥|说明|介绍)/.test(msg))
        return { type: "help", keyword: "" };
    const cleaned = msg.replace(/[，。！？、]/g, " ").replace(/我想听|帮我找|推荐|一些|一点|的歌|的音乐|吧|呗|听听/g, "").trim();
    if (cleaned.length >= 2)
        return { type: "search", keyword: cleaned };
    return { type: "help", keyword: "" };
}
function normalizeMusicActionKeyword(keyword, randomIfGeneric = false) {
    const cleaned = String(keyword || "")
        .replace(/[，。！？、]/g, " ")
        .replace(/^(一下|下|首|点|些|一个|一首)\s*/g, "")
        .trim();
    if (randomIfGeneric && (!cleaned || /^(随机|随便|任意|音乐|歌曲|歌|听歌)$/i.test(cleaned)))
        return exports.RANDOM_MUSIC_KEYWORD;
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
    const fallback = extractMusicIntent(message);
    const type = ["play_music", "play"].includes(rawType)
        ? "play_music"
        : ["search_music", "search"].includes(rawType)
            ? "search_music"
            : ["convert_music", "convert", "download"].includes(rawType)
                ? "convert_music"
                : rawType === "none" || rawType === "help" || rawType === "chat"
                    ? "none"
                    : fallback.type === "play"
                        ? "play_music"
                        : fallback.type === "search"
                            ? "search_music"
                            : fallback.type === "convert"
                                ? "convert_music"
                                : "none";
    const rawKeyword = String(value?.keyword || value?.query || value?.song || (type === "play_music" || type === "search_music" || type === "convert_music" ? fallback.keyword : "") || "").trim();
    const convertFromMessage = type === "convert_music"
        ? (String(message || "").match(/BV[\w]+/i)?.[0]
            || String(message || "").match(/(?:song\?id=|id[=：:\s#]|网易云\s*[#]?)(\d{5,})/i)?.[1]
            || String(message || "").match(/\b(\d{6,})\b/)?.[1]
            || "")
        : "";
    return {
        type,
        keyword: type === "play_music"
            ? normalizeMusicActionKeyword(rawKeyword, true)
            : type === "convert_music"
                ? String(rawKeyword || convertFromMessage || "").trim()
                : normalizeMusicActionKeyword(rawKeyword, false),
        mode: mode || "cloud",
        source,
        confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? (source === "agent" ? 0.75 : 0.45)) || 0)),
        reason: String(value?.reason || (source === "agent" ? "音乐 Agent 结构化决策" : "模型动作识别失败，使用后端兜底")).slice(0, 500),
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
function normalizeAnthropicAgentMessages(messages = []) {
    return (Array.isArray(messages) ? messages : []).flatMap((item) => {
        const role = item?.role === "user" || item?.role === "assistant" ? item.role : null;
        if (!role)
            return [];
        if (!Array.isArray(item.content)) {
            const content = musicMessageText(item.content);
            return content ? [{ role, content }] : [];
        }
        const content = item.content.flatMap((part) => {
            if (part?.type === "tool_use" && part.id && part.name)
                return [{ ...part }];
            if (part?.type === "tool_result" && part.tool_use_id) {
                const toolContent = musicMessageText(part.content);
                return toolContent ? [{ ...part, content: toolContent }] : [];
            }
            const text = musicMessageText(part);
            return text ? [{ type: "text", text }] : [];
        });
        return content.length ? [{ role, content }] : [];
    });
}
function formatMusicAgentApiError(status, raw) {
    if (status === 401 || status === 403)
        return "统一大模型配置的密钥无效或没有访问权限，请到系统设置检查";
    if (status === 429)
        return "模型服务当前请求较多，请稍后再试";
    if (status === 400 && /content\[\d+\]\.text|content\[0\]\.text|required parameter.*text/i.test(raw)) {
        return "对话历史中存在无效消息，系统已自动清理，请重新发送一次";
    }
    if (status >= 500)
        return "模型服务暂时不可用，请稍后再试";
    return `音乐助手暂时无法完成请求（HTTP ${status}）`;
}
async function classifyMusicAgentAction(cfg, message, mode, history = []) {
    const system = `你是 CCM 音乐 Agent 的动作识别内核。你只判断用户最新消息是否需要触发播放器副作用。
只输出 JSON，不要 Markdown。
动作类型：
- play_music：用户明确要求播放/想听/来一首/点歌。keyword 是歌曲、歌手、风格或 "__random__"。
- search_music：用户只是搜索、查找、推荐或询问有没有，不自动播放。
- convert_music：用户要求转码、下载或转换。
- none：闲聊、说明、歌词展示、问题咨询或不需要播放器动作。
如果用户只说“播放音乐”“随便来一首”“听歌”，keyword 必须是 "__random__"。
返回格式：{"action":"play_music|search_music|convert_music|none","keyword":"","confidence":0.0,"reason":"一句话依据"}`;
    const recent = (history || []).slice(-6).map((msg) => `${msg.role === "agent" ? "assistant" : "user"}: ${String(msg.content || "").slice(0, 400)}`).join("\n");
    const user = `当前音乐模式：${mode || "cloud"}\n最近对话：\n${recent || "无"}\n\n用户最新消息：${message}`;
    try {
        const requestConfig = { ...cfg, timeoutMs: Math.min(8_000, Math.max(5_000, Number(cfg.timeoutMs) || 8_000)) };
        const messages = [{ role: "system", content: system }, { role: "user", content: user }];
        const content = shouldUseAnthropicMusicApi(requestConfig)
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(requestConfig, {
                system,
                messages: [{ role: "user", content: user }],
                maxTokens: 220,
                temperature: 0,
                defaultTimeoutMs: 8_000,
                httpErrorPrefix: "音乐动作识别失败",
            })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(requestConfig, {
                messages,
                maxTokens: 220,
                temperature: 0,
                defaultTimeoutMs: 8_000,
                httpErrorPrefix: "音乐动作识别失败",
            });
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error("模型未返回 JSON 动作");
        return normalizeMusicAgentAction(parsed, message, mode, "agent");
    }
    catch (error) {
        const fallback = normalizeMusicAgentAction({}, message, mode, "fallback");
        return { ...fallback, error: error?.message || String(error) };
    }
}
function getMusicHelpText(chatMode) {
    if (chatMode === "local") {
        return `🎵 本地音乐助手\n\n你可以说：\n• "播放 周杰伦" - 搜索并播放\n• "搜索 轻音乐" - 搜索本地曲库\n• "来首钢琴曲" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录`;
    }
    if (chatMode === "netease") {
        return `🎵 网易云音乐助手\n\n你可以说：\n• "我想听周杰伦的歌" - 搜索网易云\n• "搜索 轻音乐" - 搜索网易云音乐\n• "来首适合学习的音乐" - 智能推荐\n\n点击搜索结果可一键下载为本地 MP3`;
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
const AGENT_TOOLS_LIST = [
    {
        name: "search_bilibili",
        description: "搜索B站视频。当用户想听音乐、看视频时使用此工具搜索。",
        input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
    },
    {
        name: "search_local",
        description: "搜索本地音乐库。当用户想播放本地已有的音乐时使用。",
        input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
    },
    {
        name: "search_netease",
        description: "搜索网易云音乐。当用户想从网易云搜索歌曲时使用此工具。",
        input_schema: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] }
    }
];
async function execToolCall(toolName, toolInput) {
    if (toolName === "search_bilibili") {
        const results = await (0, bilibili_1.biliSearch)(toolInput.keyword || "");
        return results.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n") || "没有找到相关结果";
    }
    if (toolName === "search_local") {
        const results = (0, library_1.searchLocalMusic)(toolInput.keyword || "");
        return results.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n") || "本地没有找到相关音乐";
    }
    if (toolName === "search_netease") {
        const results = await (0, netease_1.neteaseSearch)(toolInput.keyword || "");
        return results.slice(0, 8).map((r, i) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n") || "网易云没有找到相关音乐";
    }
    return "未知工具";
}
async function callClaudeAgent(cfg, system, messages, res, chatMode) {
    const isAnthropicCompat = shouldUseAnthropicMusicApi(cfg);
    const isOpenAICompat = !isAnthropicCompat;
    const tools = chatMode === "local"
        ? AGENT_TOOLS_LIST.filter((t) => t.name === "search_local")
        : chatMode === "netease"
            ? AGENT_TOOLS_LIST.filter((t) => t.name === "search_netease" || t.name === "search_local")
            : AGENT_TOOLS_LIST;
    if (isOpenAICompat) {
        await callOpenAICompat(cfg, system, messages, tools, res);
    }
    else {
        await callAnthropicNative(cfg, system, messages, tools, res);
    }
}
async function callOpenAICompat(cfg, system, messages, tools, res) {
    const model = cfg.model || "claude-sonnet-4-20250514";
    const fetchUrl = (0, group_orchestrator_llm_client_1.normalizeChatCompletionsUrl)(cfg.apiUrl);
    const toolDesc = tools.map(t => `- ${t.name}: ${t.description}`).join("\n");
    const enhancedSystem = system + `\n\n可用工具：\n${toolDesc}\n\n当你需要搜索时，输出格式：\n<tool_call>\n{"name": "工具名", "arguments": {"keyword": "关键词"}}\n</tool_call>\n\n搜索结果会自动返回给你，然后你再回复用户。`;
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`,
    };
    const openaiMessages = [{ role: "system", content: enhancedSystem }, ...normalizeMusicAgentMessages(messages, "", 20)];
    const body = JSON.stringify({ model, max_tokens: 1024, messages: openaiMessages, stream: true });
    try {
        const apiRes = await (0, group_orchestrator_llm_client_1.fetchWithNodeHttpFallback)(fetchUrl, { method: "POST", headers, body });
        if (!apiRes.ok) {
            const t = await apiRes.text();
            console.error(`[MusicAgent] OpenAI-compatible API ${apiRes.status}: ${t.substring(0, 500)}`);
            res.write(`data: ${JSON.stringify({ type: "error", text: formatMusicAgentApiError(apiRes.status, t) })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
            return;
        }
        const reader = apiRes.body?.getReader();
        if (!reader)
            return;
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        const read = () => reader.read().then(({ done, value }) => {
            if (done) {
                const toolMatch = fullText.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
                if (toolMatch) {
                    try {
                        const toolCall = JSON.parse(toolMatch[1]);
                        const toolName = toolCall.name;
                        const toolArgs = toolCall.arguments || {};
                        res.write(`data: ${JSON.stringify({ type: "tool_call", name: toolName, args: toolArgs })}\n\n`);
                        execToolCall(toolName, toolArgs).then(toolResult => {
                            res.write(`data: ${JSON.stringify({ type: "tool_result", name: toolName, result: toolResult })}\n\n`);
                            const newMessages = [...messages,
                                { role: "assistant", content: fullText },
                                { role: "user", content: `[工具结果: ${toolName}]\n${toolResult}\n\n请根据搜索结果回复用户。` }
                            ];
                            callOpenAICompat(cfg, system, newMessages, [], res);
                        });
                        return;
                    }
                    catch { }
                }
                res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                res.end();
                return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                if (!line.startsWith("data: "))
                    continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]")
                    continue;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices?.[0]?.delta?.content) {
                        const text = parsed.choices[0].delta.content;
                        fullText += text;
                        res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
                    }
                }
                catch { }
            }
            return read();
        });
        await read();
    }
    catch (e) {
        res.write(`data: ${JSON.stringify({ type: "error", text: `连接失败: ${e.message}` })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
    }
}
async function callAnthropicNative(cfg, system, messages, tools, res) {
    const model = cfg.model || "claude-sonnet-4-20250514";
    const fetchUrl = (0, group_orchestrator_llm_client_1.normalizeAnthropicMessagesUrl)(cfg.apiUrl || "https://api.anthropic.com");
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
    };
    const toolDefs = tools.length > 0 ? { tools } : {};
    const body = JSON.stringify({ model, max_tokens: 1024, system, messages: normalizeAnthropicAgentMessages(messages), stream: true, ...toolDefs });
    try {
        const apiRes = await (0, group_orchestrator_llm_client_1.fetchWithNodeHttpFallback)(fetchUrl, { method: "POST", headers, body });
        if (!apiRes.ok) {
            const t = await apiRes.text();
            console.error(`[MusicAgent] Anthropic API ${apiRes.status}: ${t.substring(0, 500)}`);
            res.write(`data: ${JSON.stringify({ type: "error", text: formatMusicAgentApiError(apiRes.status, t) })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
            return;
        }
        const reader = apiRes.body?.getReader();
        if (!reader)
            return;
        const decoder = new TextDecoder();
        let buffer = "";
        let toolCallId = "";
        let toolName = "";
        let toolInputJson = "";
        const read = () => reader.read().then(({ done, value }) => {
            if (done) {
                if (toolName && toolInputJson) {
                    try {
                        const toolInput = JSON.parse(toolInputJson);
                        res.write(`data: ${JSON.stringify({ type: "tool_call", name: toolName, args: toolInput })}\n\n`);
                        execToolCall(toolName, toolInput).then(toolResult => {
                            res.write(`data: ${JSON.stringify({ type: "tool_result", name: toolName, result: toolResult })}\n\n`);
                            const newMessages = [
                                ...messages,
                                { role: "assistant", content: [{ type: "tool_use", id: toolCallId, name: toolName, input: toolInput }] },
                                { role: "user", content: [{ type: "tool_result", tool_use_id: toolCallId, content: toolResult }] }
                            ];
                            callAnthropicNative(cfg, system, newMessages, tools, res);
                        });
                    }
                    catch { }
                    return;
                }
                res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                res.end();
                return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                if (!line.startsWith("data: "))
                    continue;
                const data = line.slice(6).trim();
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") {
                        toolCallId = parsed.content_block.id;
                        toolName = parsed.content_block.name;
                        toolInputJson = "";
                    }
                    if (parsed.type === "content_block_delta") {
                        if (parsed.delta?.type === "input_json_delta") {
                            toolInputJson += parsed.delta.partial_json || "";
                        }
                        if (parsed.delta?.text) {
                            res.write(`data: ${JSON.stringify({ type: "text", text: parsed.delta.text })}\n\n`);
                        }
                    }
                }
                catch { }
            }
            return read();
        });
        await read();
    }
    catch (e) {
        res.write(`data: ${JSON.stringify({ type: "error", text: `连接失败: ${e.message}` })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
    }
}
function runMusicAgentIntentSelfTest() {
    const { runMusicRemoteCommandQueueSelfTest } = require("./state");
    const playSpecific = normalizeMusicAgentAction({ action: "play_music", keyword: "周杰伦 晴天", confidence: 0.93 }, "我想听周杰伦的晴天", "cloud", "agent");
    const playRandom = normalizeMusicAgentAction({}, "播放音乐", "cloud", "fallback");
    const searchOnly = normalizeMusicAgentAction({ action: "search_music", keyword: "轻音乐", confidence: 0.9 }, "搜索轻音乐", "cloud", "agent");
    const questionOnly = normalizeMusicAgentAction({}, "歌词怎么显示？", "cloud", "fallback");
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
    const exactPlan = resolveMusicPlaybackRequestFallback("播放周杰伦的晴天", "周杰伦 晴天");
    const sadPlan = resolveMusicPlaybackRequestFallback("我心情不好，给我播放一首歌", exports.RANDOM_MUSIC_KEYWORD);
    const happyPlan = resolveMusicPlaybackRequestFallback("我今天心情很好，放首歌吧", exports.RANDOM_MUSIC_KEYWORD);
    const artistPlan = resolveMusicPlaybackRequestFallback("播放周杰伦的歌", "周杰伦");
    const genrePlan = resolveMusicPlaybackRequestFallback("来一首摇滚音乐", "摇滚");
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
        fallbackPlayRequiresNoAutoplay: playRandom.source === "fallback",
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