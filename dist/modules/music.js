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
exports.handleMusicApi = handleMusicApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
// B站相关常量与模块级变量
const BILI_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
let wbiMixinKey = "";
let wbiCacheTime = 0;
let buvid3 = "";
const WBI_MIXIN_TABLE = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];
const MUSIC_DIR = path.join(utils_1.CCM_DIR, "music");
if (!fs.existsSync(MUSIC_DIR))
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
function getMixinKey(orig) {
    return WBI_MIXIN_TABLE.map(n => orig[n]).join("").substring(0, 32);
}
async function ensureBuvid3() {
    if (buvid3)
        return buvid3;
    try {
        const res = await fetch("https://www.bilibili.com", {
            method: "GET",
            headers: { "User-Agent": BILI_UA },
            redirect: "follow",
        });
        let cookieStrings = [];
        if (typeof res.headers.getSetCookie === "function") {
            cookieStrings = res.headers.getSetCookie();
        }
        else {
            const rawCookie = res.headers.get("set-cookie");
            if (rawCookie) {
                cookieStrings = rawCookie.split(/,\s*/);
            }
        }
        for (const c of cookieStrings) {
            const match = c.match(/buvid3=([^;]+)/);
            if (match) {
                buvid3 = match[1];
                console.log("[WBI] 获取 buvid3 成功:", buvid3);
                return buvid3;
            }
        }
    }
    catch (e) {
        console.log("[WBI] 获取 buvid3 失败:", e.message);
    }
    buvid3 = crypto.randomUUID() + "infoc";
    return buvid3;
}
async function refreshWbiKey() {
    try {
        await ensureBuvid3();
        const res = await fetch("https://api.bilibili.com/x/web-interface/nav", {
            headers: { "User-Agent": BILI_UA, "Referer": "https://www.bilibili.com", "Cookie": `buvid3=${buvid3}` }
        });
        const text = await res.text();
        if (!text.trim().startsWith("{")) {
            console.log("[WBI] nav 返回非 JSON:", text.substring(0, 80));
            return;
        }
        const data = JSON.parse(text);
        const img = data?.data?.wbi_img?.img_url || "";
        const sub = data?.data?.wbi_img?.sub_url || "";
        const imgKey = img.split("/").pop()?.split(".")[0] || "";
        const subKey = sub.split("/").pop()?.split(".")[0] || "";
        wbiMixinKey = getMixinKey(imgKey + subKey);
        wbiCacheTime = Date.now();
        console.log("[WBI] key 已刷新:", wbiMixinKey.substring(0, 8) + "...");
    }
    catch (e) {
        console.log("[WBI] 刷新失败:", e.message);
    }
}
async function ensureWbiKey() {
    if (!wbiMixinKey || Date.now() - wbiCacheTime > 12 * 60 * 60 * 1000) {
        await refreshWbiKey();
    }
}
function signBiliParams(params) {
    const wts = Math.floor(Date.now() / 1000);
    params.wts = String(wts);
    const sorted = Object.keys(params).sort().map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
    const hash = crypto.createHash("md5").update(sorted + wbiMixinKey).digest("hex");
    params.w_rid = hash;
    return Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
}
async function biliSearch(keyword) {
    try {
        await ensureBuvid3();
        await ensureWbiKey();
        const params = {
            search_type: "video",
            keyword: keyword,
            page: "1",
            order: "totalrank"
        };
        const signedQs = signBiliParams(params);
        const cfg = (0, db_1.loadMusicConfig)();
        let oldHttpProxy = process.env.HTTP_PROXY;
        let oldHttpsProxy = process.env.HTTPS_PROXY;
        if (cfg.proxy) {
            process.env.HTTP_PROXY = cfg.proxy;
            process.env.HTTPS_PROXY = cfg.proxy;
        }
        const url = `https://api.bilibili.com/x/web-interface/search/type?${signedQs}`;
        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": BILI_UA,
                    "Referer": "https://www.bilibili.com/",
                    "Cookie": `buvid3=${buvid3}`,
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    "Origin": "https://www.bilibili.com",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-site"
                }
            });
            if (cfg.proxy) {
                if (oldHttpProxy)
                    process.env.HTTP_PROXY = oldHttpProxy;
                else
                    delete process.env.HTTP_PROXY;
                if (oldHttpsProxy)
                    process.env.HTTPS_PROXY = oldHttpsProxy;
                else
                    delete process.env.HTTPS_PROXY;
            }
            const text = await res.text();
            if (!text.trim().startsWith("{")) {
                console.log("[BiliSearch] non-JSON:", text.substring(0, 100));
                return [];
            }
            const data = JSON.parse(text);
            if (data.code !== 0) {
                console.log("[BiliSearch] API error:", data.code, data.message);
                return [];
            }
            const resultList = data.data?.result;
            if (!Array.isArray(resultList)) {
                console.log("[BiliSearch] result is not an array");
                return [];
            }
            const results = resultList.map((item) => ({
                bvid: item.bvid,
                title: (item.title || "").replace(/<[^>]*>/g, ""),
                author: item.author || "",
                duration: item.duration || "",
                play: item.play || 0,
                pic: item.pic ? (item.pic.startsWith("//") ? "https:" + item.pic : item.pic) : "",
            }));
            console.log("[BiliSearch] found", results.length, "results");
            return results;
        }
        catch (err) {
            if (cfg.proxy) {
                if (oldHttpProxy)
                    process.env.HTTP_PROXY = oldHttpProxy;
                else
                    delete process.env.HTTP_PROXY;
                if (oldHttpsProxy)
                    process.env.HTTPS_PROXY = oldHttpsProxy;
                else
                    delete process.env.HTTPS_PROXY;
            }
            throw err;
        }
    }
    catch (e) {
        console.log("[BiliSearch] error:", e.message);
        return [];
    }
}
function parseMusicFilename(filename) {
    const name = filename.replace(/\.[^.]+$/, "");
    const bvidMatch = name.match(/(BV[\w]+)/i);
    const bvid = bvidMatch ? bvidMatch[1] : undefined;
    const cleaned = name.replace(/\[BV[\w]+\]/gi, "").replace(/BV[\w]+/gi, "").trim();
    const parts = cleaned.split(" - ");
    let artist = "未知艺术家", title = cleaned;
    if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
    }
    if (!title)
        title = name;
    return { artist, title, bvid };
}
function searchLocalMusic(keyword) {
    const q = keyword.toLowerCase();
    return fs.readdirSync(MUSIC_DIR)
        .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
        .filter(f => f.toLowerCase().includes(q))
        .map((f, i) => {
        const stat = fs.statSync(path.join(MUSIC_DIR, f));
        const { artist, title, bvid } = parseMusicFilename(f);
        return { id: i, filename: f, title, artist, bvid, size: stat.size };
    });
}
function extractMusicIntent(msg) {
    const lower = msg.toLowerCase();
    const playMatch = msg.match(/(?:播放|放一首?|听一首?|来一首?|来点|来些)(.+)/);
    if (playMatch)
        return { type: "play", keyword: playMatch[1].trim() };
    const searchMatch = msg.match(/(?:搜索|找|查找|有没有)(.+)/);
    if (searchMatch)
        return { type: "search", keyword: searchMatch[1].trim() };
    if (/(?:转换|转码|下载|转成|转为)/.test(lower))
        return { type: "convert", keyword: "" };
    const cleaned = msg.replace(/[，。！？、]/g, " ").replace(/我想听|帮我找|推荐|一些|一点|的歌|的音乐|吧|呗|听听/g, "").trim();
    if (cleaned.length >= 2)
        return { type: "search", keyword: cleaned };
    return { type: "help", keyword: "" };
}
function getMusicHelpText(chatMode) {
    if (chatMode === "local") {
        return `🎵 本地音乐助手\n\n你可以说：\n• "播放 周杰伦" - 搜索并播放\n• "搜索 轻音乐" - 搜索本地曲库\n• "来首钢琴曲" - 自然语言搜索\n\n将 MP3 文件放入 ~/.cc-connect/music/ 目录`;
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
    }
];
async function execToolCall(toolName, toolInput) {
    if (toolName === "search_bilibili") {
        const results = await biliSearch(toolInput.keyword || "");
        return results.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n") || "没有找到相关结果";
    }
    if (toolName === "search_local") {
        const results = searchLocalMusic(toolInput.keyword || "");
        return results.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n") || "本地没有找到相关音乐";
    }
    return "未知工具";
}
async function callClaudeAgent(cfg, system, messages, res, chatMode) {
    const apiUrl = (cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
    const isOpenAICompat = cfg.format === "openai" || (cfg.format !== "anthropic" && !(apiUrl.includes("anthropic") || apiUrl.endsWith("/anthropic")));
    const tools = chatMode === "local"
        ? AGENT_TOOLS_LIST.filter((t) => t.name === "search_local")
        : AGENT_TOOLS_LIST;
    if (isOpenAICompat) {
        await callOpenAICompat(cfg, system, messages, tools, res);
    }
    else {
        await callAnthropicNative(cfg, system, messages, tools, res);
    }
}
async function callOpenAICompat(cfg, system, messages, tools, res) {
    const apiUrl = (cfg.apiUrl || "").replace(/\/$/, "");
    const model = cfg.model || "claude-sonnet-4-20250514";
    let fetchUrl;
    if (apiUrl.includes("/chat/completions"))
        fetchUrl = apiUrl;
    else if (apiUrl.endsWith("/v1"))
        fetchUrl = `${apiUrl}/chat/completions`;
    else if (apiUrl.includes("/v1/"))
        fetchUrl = apiUrl;
    else
        fetchUrl = `${apiUrl}/v1/chat/completions`;
    const toolDesc = tools.map(t => `- ${t.name}: ${t.description}`).join("\n");
    const enhancedSystem = system + `\n\n可用工具：\n${toolDesc}\n\n当你需要搜索时，输出格式：\n<tool_call>\n{"name": "工具名", "arguments": {"keyword": "关键词"}}\n</tool_call>\n\n搜索结果会自动返回给你，然后你再回复用户。`;
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.apiKey}`,
    };
    const openaiMessages = [{ role: "system", content: enhancedSystem }, ...messages];
    const body = JSON.stringify({ model, max_tokens: 1024, messages: openaiMessages, stream: true });
    try {
        const apiRes = await fetch(fetchUrl, { method: "POST", headers, body });
        if (!apiRes.ok) {
            const t = await apiRes.text();
            res.write(`data: ${JSON.stringify({ type: "error", text: `API ${apiRes.status}: ${t.substring(0, 200)}` })}\n\n`);
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
    const apiUrl = (cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
    const model = cfg.model || "claude-sonnet-4-20250514";
    const fetchUrl = `${apiUrl}/v1/messages`;
    const headers = {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
    };
    const toolDefs = tools.length > 0 ? { tools } : {};
    const body = JSON.stringify({ model, max_tokens: 1024, system, messages, stream: true, ...toolDefs });
    try {
        const apiRes = await fetch(fetchUrl, { method: "POST", headers, body });
        if (!apiRes.ok) {
            const t = await apiRes.text();
            res.write(`data: ${JSON.stringify({ type: "error", text: `API ${apiRes.status}: ${t.substring(0, 200)}` })}\n\n`);
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
function handleMusicApi(pathname, req, res, parsed, ctx) {
    if (!pathname.startsWith("/api/music"))
        return false;
    if (pathname === "/api/music/pet-state" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, agent: ctx.getMusicPetAgent() });
        return true;
    }
    if (pathname === "/api/music/pet-state" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                ctx.setMusicPetState(data.state || "idle", data.detail || "", data.track || null);
                (0, utils_1.sendJson)(res, { success: true, agent: ctx.getMusicPetAgent() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/pet-speech" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                ctx.broadcastPetSpeech(ctx.MUSIC_PET_AGENT_NAME, {
                    role: data.role || "assistant",
                    text: data.text || "",
                    mode: data.mode || "replace",
                    final: !!data.final,
                    source: data.source || "music",
                });
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/list" && req.method === "GET") {
        try {
            const files = fs.readdirSync(MUSIC_DIR)
                .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
                .map((f, i) => {
                const stat = fs.statSync(path.join(MUSIC_DIR, f));
                const { artist, title, bvid } = parseMusicFilename(f);
                return { id: i, filename: f, title, artist, bvid, size: stat.size, modified: stat.mtime.toISOString() };
            })
                .sort((a, b) => a.title.localeCompare(b.title));
            (0, utils_1.sendJson)(res, { success: true, tracks: files });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: true, tracks: [] });
        }
        return true;
    }
    if (pathname === "/api/music/stream" && req.method === "GET") {
        const filename = parsed.query.file;
        if (!filename || filename.includes(".."))
            return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
        const filePath = path.join(MUSIC_DIR, filename);
        if (!fs.existsSync(filePath))
            return (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
            ".m4a": "audio/mp4", ".flac": "audio/flac", ".aac": "audio/aac"
        };
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                "Accept-Ranges": "bytes",
                "Content-Length": end - start + 1,
                "Content-Type": mimeTypes[ext] || "audio/mpeg",
                "Access-Control-Allow-Origin": "*",
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        }
        else {
            res.writeHead(200, {
                "Content-Length": stat.size,
                "Content-Type": mimeTypes[ext] || "audio/mpeg",
                "Access-Control-Allow-Origin": "*",
            });
            fs.createReadStream(filePath).pipe(res);
        }
        return true;
    }
    if (pathname === "/api/music/search" && req.method === "GET") {
        const query = parsed.query.q || "";
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, results: [] });
            return true;
        }
        biliSearch(query).then(results => {
            (0, utils_1.sendJson)(res, { success: true, results });
        }).catch((e) => {
            (0, utils_1.sendJson)(res, { success: false, error: e.message });
        });
        return true;
    }
    if (pathname === "/api/music/download" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { bvid, title, author } = JSON.parse(body);
                if (!bvid)
                    return (0, utils_1.sendJson)(res, { error: "缺少 bvid" }, 400);
                const safeName = `${author || "unknown"} - ${title || bvid}`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
                const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
                if (fs.existsSync(outputFile))
                    return (0, utils_1.sendJson)(res, { success: true, message: "文件已存在" });
                const url = `https://www.bilibili.com/video/${bvid}`;
                const child = (0, child_process_1.spawn)("yt-dlp", [
                    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "--referer", "https://www.bilibili.com/",
                    "--no-playlist",
                    "-f", "ba",
                    "-x", "--audio-format", "mp3", "--audio-quality", "0",
                    "-o", outputFile, url
                ], { stdio: "ignore", windowsHide: true });
                child.on("close", (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile) });
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: false, error: "下载失败，请确保已安装 yt-dlp 和 ffmpeg" });
                    }
                });
                child.on("error", () => {
                    (0, utils_1.sendJson)(res, { success: false, error: "yt-dlp 未安装，请先安装: pip install yt-dlp" });
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/config" && req.method === "GET") {
        const cfg = (0, db_1.loadMusicConfig)();
        (0, utils_1.sendJson)(res, {
            success: true,
            config: {
                apiUrl: cfg.apiUrl || "https://api.anthropic.com",
                model: cfg.model || "claude-sonnet-4-20250514",
                format: cfg.format || "auto",
                proxy: cfg.proxy || "",
                hasKey: !!cfg.apiKey,
            }
        });
        return true;
    }
    if (pathname === "/api/music/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const cfg = (0, db_1.loadMusicConfig)();
                if (updates.apiUrl !== undefined)
                    cfg.apiUrl = updates.apiUrl;
                if (updates.apiKey !== undefined && updates.apiKey !== "")
                    cfg.apiKey = updates.apiKey;
                if (updates.model !== undefined)
                    cfg.model = updates.model;
                if (updates.format !== undefined)
                    cfg.format = updates.format;
                if (updates.proxy !== undefined)
                    cfg.proxy = updates.proxy;
                (0, db_1.saveMusicConfig)(cfg);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/agent" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { message, mode: chatMode, history } = JSON.parse(body);
                const cfg = (0, db_1.loadMusicConfig)();
                if (!cfg.apiKey) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先配置 API Key（音乐播放器 → 设置）" });
                }
                const systemPrompt = `你是一个音乐助手 Agent。用户会告诉你想听什么音乐，你需要帮助他们搜索和推荐。

你有两个工具可用：
1. search_bilibili(keyword) - 搜索B站视频
2. search_local(keyword) - 搜索本地音乐库

当前模式: ${chatMode === "local" ? "本地模式（搜索本地曲库）" : "B站模式（搜索B站并转码）"}

## 推荐输出格式（严格遵守）
当你向用户推荐歌曲时，先用自然语言简要介绍，然后 **必须** 将曲目放在独立的 \`\`\`tracks 代码块中。格式如下：

### B站模式：
\`\`\`tracks
[
  {"bvid":"BV1xxxxx","title":"视频标题","author":"UP主","duration":"4:32"}
]
\`\`\`

### 本地模式：
\`\`\`tracks
[
  {"filename":"文件名.mp3","title":"歌曲名称","artist":"歌手"}
]
\`\`\`

关键规则：
1. 代码块标记必须用 \`\`\`tracks 开头，\`\`\` 结尾，各占独立一行。
2. 数据必须是合法 JSON 数组，必须从工具返回的结果中提取字段（不要编造或修改 uri、bvid、filename 等核心标识）。
3. 如果用户只是闲聊、提问，不需要输出 tracks 代码块。
4. 回复使用中文，简洁友好。`;
                const messages = [];
                for (const msg of (history || []).slice(-10)) {
                    if (msg.role === "operator")
                        messages.push({ role: "user", content: msg.content });
                    else if (msg.role === "agent")
                        messages.push({ role: "assistant", content: msg.content });
                }
                messages.push({ role: "user", content: message });
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                });
                const intent = extractMusicIntent(message);
                let toolContext = "";
                if (intent.type === "search" || intent.type === "play") {
                    if (chatMode === "local") {
                        const localResults = searchLocalMusic(intent.keyword);
                        toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
                        messages[messages.length - 1].content += toolContext;
                        callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                    }
                    else {
                        biliSearch(intent.keyword).then((biliResults) => {
                            toolContext = `\n\n[工具结果] B站搜索 "${intent.keyword}" 找到 ${biliResults.length} 个结果：\n${biliResults.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n")}`;
                            messages[messages.length - 1].content += toolContext;
                            callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                        }).catch(() => {
                            messages[messages.length - 1].content += "\n\n[工具结果] B站搜索失败";
                            callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                        });
                        return;
                    }
                }
                else {
                    callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/chat" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { message, mode: chatMode } = JSON.parse(body);
                const intent = extractMusicIntent(message);
                const result = { intent: intent.type, keyword: intent.keyword };
                if (intent.type === "search") {
                    if (chatMode === "local") {
                        const localResults = searchLocalMusic(intent.keyword);
                        result.localResults = localResults;
                        result.reply = localResults.length > 0
                            ? `在本地找到 ${localResults.length} 首匹配的音乐：`
                            : `本地没有找到"${intent.keyword}"相关音乐，试试切换到 B站模式？`;
                        (0, utils_1.sendJson)(res, { success: true, ...result });
                    }
                    else {
                        biliSearch(intent.keyword).then((biliResults) => {
                            result.biliResults = biliResults;
                            result.reply = biliResults.length > 0
                                ? `在B站找到 ${biliResults.length} 个相关结果：`
                                : `没有找到"${intent.keyword}"相关的结果，换个关键词试试？`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch((e) => {
                            result.reply = `搜索出错: ${e.message}`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                }
                else if (intent.type === "convert") {
                    result.reply = "请提供B站视频链接或BV号，我帮你转码。";
                    (0, utils_1.sendJson)(res, { success: true, ...result });
                }
                else if (intent.type === "play") {
                    if (chatMode === "local") {
                        const localResults = searchLocalMusic(intent.keyword);
                        result.localResults = localResults;
                        result.autoPlay = localResults.length > 0;
                        result.reply = localResults.length > 0
                            ? `找到并播放：${localResults[0].title}`
                            : `本地没有找到"${intent.keyword}"`;
                        (0, utils_1.sendJson)(res, { success: true, ...result });
                    }
                    else {
                        biliSearch(intent.keyword).then((biliResults) => {
                            result.biliResults = biliResults.slice(0, 3);
                            result.reply = biliResults.length > 0
                                ? `找到以下结果，点击转码播放：`
                                : `没有找到相关结果`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch(() => {
                            result.reply = "搜索出错";
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
                    }
                }
                else {
                    result.reply = getMusicHelpText(chatMode);
                    (0, utils_1.sendJson)(res, { success: true, ...result });
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/danmaku" && req.method === "GET") {
        const bvid = parsed.query.bvid;
        if (!bvid)
            return (0, utils_1.sendJson)(res, { error: "缺少 bvid" }, 400);
        (async () => {
            let oldHttpProxy = process.env.HTTP_PROXY;
            let oldHttpsProxy = process.env.HTTPS_PROXY;
            const cfg = (0, db_1.loadMusicConfig)();
            if (cfg.proxy) {
                process.env.HTTP_PROXY = cfg.proxy;
                process.env.HTTPS_PROXY = cfg.proxy;
            }
            try {
                await ensureBuvid3();
                await ensureWbiKey();
                const params = { bvid: bvid };
                const signedQs = signBiliParams(params);
                const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                const viewRes = await fetch(viewUrl, {
                    headers: {
                        "User-Agent": BILI_UA,
                        "Referer": "https://www.bilibili.com/",
                        "Cookie": `buvid3=${buvid3}`,
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                        "Origin": "https://www.bilibili.com",
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-site"
                    }
                });
                const viewData = await viewRes.json();
                const cid = viewData?.data?.cid;
                const aid = viewData?.data?.aid;
                const duration = viewData?.data?.duration || 300;
                if (!cid) {
                    if (cfg.proxy) {
                        if (oldHttpProxy)
                            process.env.HTTP_PROXY = oldHttpProxy;
                        else
                            delete process.env.HTTP_PROXY;
                        if (oldHttpsProxy)
                            process.env.HTTPS_PROXY = oldHttpsProxy;
                        else
                            delete process.env.HTTPS_PROXY;
                    }
                    return (0, utils_1.sendJson)(res, { success: true, danmaku: [] });
                }
                const dmRes = await fetch(`https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`, {
                    headers: {
                        "User-Agent": BILI_UA,
                        "Referer": "https://www.bilibili.com/",
                        "Cookie": `buvid3=${buvid3}`
                    }
                });
                const xml = await dmRes.text();
                let replies = [];
                if (aid) {
                    try {
                        const replyUrl = `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`;
                        const replyRes = await fetch(replyUrl, {
                            headers: {
                                "User-Agent": BILI_UA,
                                "Referer": "https://www.bilibili.com/",
                                "Cookie": `buvid3=${buvid3}`,
                                "Accept": "application/json, text/plain, */*",
                            }
                        });
                        const replyData = await replyRes.json();
                        if (replyData && replyData.code === 0 && replyData.data?.replies) {
                            replies = replyData.data.replies;
                        }
                    }
                    catch (replyErr) {
                        console.error("[Danmaku] Failed to fetch Bilibili replies:", replyErr);
                    }
                }
                if (cfg.proxy) {
                    if (oldHttpProxy)
                        process.env.HTTP_PROXY = oldHttpProxy;
                    else
                        delete process.env.HTTP_PROXY;
                    if (oldHttpsProxy)
                        process.env.HTTPS_PROXY = oldHttpsProxy;
                    else
                        delete process.env.HTTPS_PROXY;
                }
                const items = [];
                const regex = /<d p="([^"]*)"[^>]*>([^<]*)<\/d>/g;
                let match;
                while ((match = regex.exec(xml)) !== null) {
                    const attrs = match[1].split(",");
                    const time = parseFloat(attrs[0]);
                    const type = parseInt(attrs[1]) || 1;
                    const color = parseInt(attrs[3]) || 16777215;
                    const hexColor = "#" + color.toString(16).padStart(6, "0");
                    items.push({ time, content: match[2], type, color: hexColor });
                }
                if (replies && replies.length > 0) {
                    const maxReplies = Math.min(replies.length, 25);
                    const interval = Math.max(6, Math.floor(duration / (maxReplies + 1)));
                    for (let i = 0; i < maxReplies; i++) {
                        const r = replies[i];
                        const username = r.member?.uname || "路人";
                        const message = (r.content?.message || "").replace(/\s+/g, " ").trim();
                        if (!message)
                            continue;
                        const shortMsg = message.length > 60 ? message.substring(0, 60) + "..." : message;
                        const content = `💬 [热评] ${username}: ${shortMsg}`;
                        const time = 3 + i * interval + Math.random() * 2;
                        const color = "#ff9f43";
                        items.push({
                            time,
                            content,
                            type: 1,
                            color
                        });
                    }
                }
                (0, utils_1.sendJson)(res, { success: true, danmaku: items });
            }
            catch (e) {
                if (cfg.proxy) {
                    if (oldHttpProxy)
                        process.env.HTTP_PROXY = oldHttpProxy;
                    else
                        delete process.env.HTTP_PROXY;
                    if (oldHttpsProxy)
                        process.env.HTTPS_PROXY = oldHttpsProxy;
                    else
                        delete process.env.HTTPS_PROXY;
                }
                (0, utils_1.sendJson)(res, { success: false, error: e.message });
            }
        })();
        return true;
    }
    if (pathname === "/api/music/convert" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { bvid, title, author } = JSON.parse(body);
                if (!bvid)
                    return (0, utils_1.sendJson)(res, { error: "缺少 bvid" }, 400);
                const safeName = `${author || "unknown"} - ${title || bvid}`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
                const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
                if (fs.existsSync(outputFile))
                    return (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile), message: "文件已存在" });
                const url = `https://www.bilibili.com/video/${bvid}`;
                const child = (0, child_process_1.spawn)("yt-dlp", [
                    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "--referer", "https://www.bilibili.com/",
                    "--no-playlist",
                    "-f", "ba",
                    "-x", "--audio-format", "mp3", "--audio-quality", "0",
                    "-o", outputFile, url
                ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
                let stderr = "";
                child.stderr?.on("data", (d) => { stderr += d.toString(); });
                child.on("close", (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile) });
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: false, error: stderr.substring(0, 200) || "下载失败" });
                    }
                });
                child.on("error", () => {
                    (0, utils_1.sendJson)(res, { success: false, error: "yt-dlp 未安装，请先安装: pip install yt-dlp" });
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (!ct.includes("multipart/form-data"))
            return (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            try {
                const buffer = Buffer.concat(chunks);
                const boundaryMatch = ct.match(/boundary=(.+)/);
                if (!boundaryMatch)
                    return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                const boundary = boundaryMatch[1];
                const boundaryBuf = Buffer.from(`--${boundary}`);
                const parts = [];
                let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length + 2;
                while (true) {
                    const end = buffer.indexOf(boundaryBuf, start);
                    if (end === -1)
                        break;
                    parts.push(buffer.slice(start, end - 2));
                    start = end + boundaryBuf.length + 2;
                }
                const uploaded = [];
                for (const part of parts) {
                    const headerEnd = part.indexOf("\r\n\r\n");
                    if (headerEnd === -1)
                        continue;
                    const headerStr = part.slice(0, headerEnd).toString("utf-8");
                    const body = part.slice(headerEnd + 4);
                    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
                    if (filenameMatch && filenameMatch[1]) {
                        const filename = filenameMatch[1].replace(/[<>:"/\\|?*]/g, "_");
                        const ext = path.extname(filename).toLowerCase();
                        if ([".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"].includes(ext)) {
                            const filePath = path.join(MUSIC_DIR, filename);
                            fs.writeFileSync(filePath, body);
                            uploaded.push(filename);
                        }
                    }
                }
                (0, utils_1.sendJson)(res, { success: true, uploaded });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { filename } = JSON.parse(body);
                if (!filename || filename.includes(".."))
                    return (0, utils_1.sendJson)(res, { error: "无效文件名" }, 400);
                const filePath = path.join(MUSIC_DIR, filename);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
                fs.unlinkSync(filePath);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/lyric" && req.method === "GET") {
        const filename = parsed.query.filename;
        const bvid = parsed.query.bvid;
        function parseLrc(lrc) {
            const lines = lrc.split("\n");
            const result = [];
            for (const line of lines) {
                const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
                const text = line.replace(timeRegex, "").trim();
                if (!text)
                    continue;
                let match;
                while ((match = timeRegex.exec(line)) !== null) {
                    const min = parseInt(match[1]);
                    const sec = parseFloat(match[2]);
                    const time = min * 60 + sec;
                    result.push({ time, text });
                }
            }
            return result.sort((a, b) => a.time - b.time);
        }
        function cleanLyricText(raw) {
            return String(raw || "")
                .replace(/<[^>]*>/g, " ")
                .replace(/https?:\/\/\S+/g, " ")
                .replace(/BV[\w]+/gi, " ")
                .replace(/【[^】]*】/g, " ")
                .replace(/\[[^\]]*\]/g, " ")
                .replace(/（[^）]*）/g, " ")
                .replace(/\([^)]+\)/g, " ")
                .replace(/[《》「」『』]/g, " ")
                .replace(/[|｜_/]/g, " ")
                .replace(/(hi[-\s]?res|无损|高音质|极致修复|动态歌词|歌词纯享版|歌词版|纯享|完整版|现场版|live|cover|翻唱|mv|official|lyrics|lyric|audio|video|1080p|1080|4k|2k|hd)/gi, " ")
                .replace(/\s+/g, " ")
                .trim();
        }
        function pushQuery(target, value) {
            const query = cleanLyricText(value);
            if (query && query.length >= 2 && query.length <= 80)
                target.add(query);
        }
        function buildLyricQueries() {
            const queries = new Set();
            const title = String(parsed.query.title || "");
            const parsedFile = filename ? parseMusicFilename(String(filename)) : null;
            const rawTexts = [title, parsedFile?.title || "", String(filename || "")].filter(Boolean);
            for (const raw of rawTexts) {
                const quoted = String(raw).match(/[《「『](.{1,80}?)[》」』]/);
                if (quoted?.[1]) {
                    const song = quoted[1].trim();
                    const before = String(raw).slice(0, quoted.index).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
                    const after = String(raw).slice((quoted.index || 0) + quoted[0].length).replace(/【[^】]*】|\[[^\]]*\]|（[^）]*）|\([^)]+\)/g, " ").trim();
                    const artistAfter = after.replace(/^[-–—_:：\s]+/, "").split(/[-–—_:：|｜\s]/).filter(Boolean)[0] || "";
                    const artistBefore = before.split(/[-–—_:：|｜\s]/).filter(Boolean).pop() || "";
                    if (artistAfter)
                        pushQuery(queries, `${artistAfter} ${song}`);
                    if (artistBefore)
                        pushQuery(queries, `${artistBefore} ${song}`);
                    pushQuery(queries, song);
                }
                const dashParts = cleanLyricText(String(raw)).split(/\s*[-–—]\s*/).map((p) => p.trim()).filter(Boolean);
                if (dashParts.length >= 2) {
                    pushQuery(queries, `${dashParts[0]} ${dashParts.slice(1).join(" ")}`);
                    pushQuery(queries, `${dashParts[dashParts.length - 1]} ${dashParts.slice(0, -1).join(" ")}`);
                }
                pushQuery(queries, String(raw));
            }
            if (parsedFile?.artist && parsedFile.artist !== "未知艺术家") {
                pushQuery(queries, `${parsedFile.artist} ${parsedFile.title}`);
            }
            return Array.from(queries).slice(0, 6);
        }
        async function fetchNeteaseLyrics() {
            const queries = buildLyricQueries();
            for (const query of queries) {
                try {
                    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=10`;
                    const searchRes = await fetch(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        }
                    });
                    const searchData = await searchRes.json();
                    const songs = searchData?.result?.songs || [];
                    for (let i = 0; i < Math.min(songs.length, 10); i++) {
                        const songId = songs[i]?.id;
                        if (!songId)
                            continue;
                        try {
                            const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
                            const lyricRes = await fetch(lyricUrl, {
                                headers: {
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                    "Referer": "https://music.163.com/",
                                }
                            });
                            const lyricData = await lyricRes.json();
                            const rawLyric = lyricData?.lrc?.lyric;
                            if (rawLyric && /\[\d+:\d+(?:\.\d+)?\]/.test(rawLyric)) {
                                const lyrics = parseLrc(rawLyric);
                                if (lyrics.length > 0) {
                                    console.log(`[Lyric] matched Netease lyric by query "${query}" (ID: ${songId}), ${lyrics.length} lines`);
                                    return lyrics;
                                }
                            }
                        }
                        catch (singleErr) {
                            console.error(`[Lyric] Failed to fetch Netease lyric for song ID ${songId}:`, singleErr.message);
                        }
                    }
                }
                catch (neteaseErr) {
                    console.error(`[Lyric] Failed to search Netease lyrics by "${query}":`, neteaseErr.message);
                }
            }
            return null;
        }
        async function fetchBiliCcLyrics(targetBvid) {
            let oldHttpProxy = process.env.HTTP_PROXY;
            let oldHttpsProxy = process.env.HTTPS_PROXY;
            const cfg = (0, db_1.loadMusicConfig)();
            const restoreProxy = () => {
                if (!cfg.proxy)
                    return;
                if (oldHttpProxy)
                    process.env.HTTP_PROXY = oldHttpProxy;
                else
                    delete process.env.HTTP_PROXY;
                if (oldHttpsProxy)
                    process.env.HTTPS_PROXY = oldHttpsProxy;
                else
                    delete process.env.HTTPS_PROXY;
            };
            if (cfg.proxy) {
                process.env.HTTP_PROXY = cfg.proxy;
                process.env.HTTPS_PROXY = cfg.proxy;
            }
            try {
                await ensureBuvid3();
                await ensureWbiKey();
                const params = { bvid: targetBvid };
                const signedQs = signBiliParams(params);
                const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
                const viewRes = await fetch(viewUrl, {
                    headers: {
                        "User-Agent": BILI_UA,
                        "Referer": "https://www.bilibili.com/",
                        "Cookie": `buvid3=${buvid3}`,
                        "Accept": "application/json, text/plain, */*"
                    }
                });
                const viewData = await viewRes.json();
                const subtitles = viewData?.data?.subtitle?.list || [];
                for (const subtitle of subtitles) {
                    const subUrl = subtitle?.subtitle_url;
                    if (!subUrl)
                        continue;
                    const fullSubUrl = subUrl.startsWith("//") ? `https:${subUrl}` : subUrl;
                    const subRes = await fetch(fullSubUrl, {
                        headers: {
                            "User-Agent": BILI_UA,
                            "Referer": `https://www.bilibili.com/video/${targetBvid}`,
                        }
                    });
                    const subData = await subRes.json();
                    if (subData && Array.isArray(subData.body)) {
                        const lyrics = subData.body
                            .map((item) => ({
                            time: parseFloat(item.from),
                            text: String(item.content || "").trim()
                        }))
                            .filter((item) => Number.isFinite(item.time) && item.text)
                            .sort((a, b) => a.time - b.time);
                        if (lyrics.length > 0)
                            return lyrics;
                    }
                }
            }
            catch (biliErr) {
                console.error("[Lyric] Failed to fetch Bilibili subtitles:", biliErr.message);
            }
            finally {
                restoreProxy();
            }
            return null;
        }
        (async () => {
            if (filename) {
                try {
                    const safeFilename = String(filename);
                    if (safeFilename.includes("..") || /[\\/]/.test(safeFilename)) {
                        throw new Error("无效文件名");
                    }
                    const lrcName = safeFilename.replace(/\.[^.]+$/, ".lrc");
                    const lrcPath = path.join(MUSIC_DIR, lrcName);
                    if (fs.existsSync(lrcPath)) {
                        const lrcContent = fs.readFileSync(lrcPath, "utf-8");
                        const lyrics = parseLrc(lrcContent);
                        return (0, utils_1.sendJson)(res, { success: true, source: "local-lrc", lyrics });
                    }
                }
                catch (lrcErr) {
                    console.error("[Lyric] Failed to read local LRC:", lrcErr.message);
                }
            }
            if (bvid) {
                const biliLyrics = await fetchBiliCcLyrics(String(bvid));
                if (biliLyrics && biliLyrics.length > 0) {
                    return (0, utils_1.sendJson)(res, { success: true, source: "bili-cc", lyrics: biliLyrics });
                }
            }
            const neteaseLyrics = await fetchNeteaseLyrics();
            if (neteaseLyrics && neteaseLyrics.length > 0) {
                return (0, utils_1.sendJson)(res, { success: true, source: "netease", lyrics: neteaseLyrics });
            }
            return (0, utils_1.sendJson)(res, { success: true, source: "none", lyrics: [{ time: 0, text: "未检测到歌词字幕，听着旋律，静心聆听吧..." }] });
        })();
        return true;
    }
    return false;
}
//# sourceMappingURL=music.js.map