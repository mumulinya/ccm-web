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
exports.runMusicAgentIntentSelfTest = runMusicAgentIntentSelfTest;
exports.handleMusicApi = handleMusicApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
const group_orchestrator_1 = require("./group-orchestrator");
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
const MUSIC_REMOTE_COMMAND_FILE = path.join(utils_1.CCM_DIR, "music-remote-command.json");
if (!fs.existsSync(MUSIC_DIR))
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
function saveMusicRemoteCommand(command) {
    const payload = {
        id: `music_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        created_at: new Date().toISOString(),
        consumed: false,
        ...command,
    };
    fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(payload, null, 2), "utf-8");
    return payload;
}
function loadMusicRemoteCommand() {
    try {
        if (!fs.existsSync(MUSIC_REMOTE_COMMAND_FILE))
            return null;
        return JSON.parse(fs.readFileSync(MUSIC_REMOTE_COMMAND_FILE, "utf-8"));
    }
    catch {
        return null;
    }
}
function loadMusicAgentConfig() {
    const llm = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const music = (0, db_1.loadMusicConfig)();
    return {
        ...llm,
        proxy: music.proxy || "",
    };
}
function publicMusicAgentConfig() {
    const config = loadMusicAgentConfig();
    return {
        ...(0, group_orchestrator_1.publicOrchestratorConfig)(config),
        source: "orchestrator",
        sourceLabel: "系统设置 / 统一大模型配置",
    };
}
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
async function neteaseSearch(keyword) {
    try {
        const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(keyword)}&type=1&limit=20`;
        const searchRes = await fetch(searchUrl, {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://music.163.com/",
                "Content-Type": "application/x-www-form-urlencoded",
            }
        });
        const data = await searchRes.json();
        const songs = data?.result?.songs || [];
        const results = songs.map((song) => {
            const artists = (song.artists || [])
                .map((a) => a.name)
                .filter((name) => name && name !== "undefined" && name !== "null")
                .join("/");
            const album = song.album?.name || "";
            const durationMs = song.duration || 0;
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            const durationStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
            const picUrl = song.album?.picUrl || "";
            return {
                songId: song.id,
                title: song.name || "",
                artist: artists || "未知艺术家",
                album,
                duration: durationStr,
                pic: picUrl ? picUrl + "?param=120y120" : "",
            };
        });
        console.log("[NeteaseSearch] found", results.length, "results for:", keyword);
        return results;
    }
    catch (e) {
        console.log("[NeteaseSearch] error:", e.message);
        return [];
    }
}
async function getBiliAudioUrl(bvid) {
    await ensureBuvid3();
    await ensureWbiKey();
    const params = { bvid };
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
    if (viewData?.code !== 0) {
        throw new Error(`获取视频信息失败: ${viewData?.message || "未知错误"}`);
    }
    const cid = viewData?.data?.cid;
    if (!cid) {
        throw new Error("视频不存在或未能获取到播放标志 cid");
    }
    const playParams = {
        bvid,
        cid: String(cid),
        qn: "16",
        fnver: "0",
        fnval: "16",
        otype: "json"
    };
    const playQs = signBiliParams(playParams);
    const playUrl = `https://api.bilibili.com/x/player/wbi/playurl?${playQs}`;
    const playRes = await fetch(playUrl, {
        headers: {
            "User-Agent": BILI_UA,
            "Referer": "https://www.bilibili.com/",
            "Cookie": `buvid3=${buvid3}`,
            "Accept": "application/json, text/plain, */*"
        }
    });
    const playData = await playRes.json();
    if (playData?.code !== 0) {
        throw new Error(`获取播放地址失败: ${playData?.message || "未知错误"}`);
    }
    const audioList = playData?.data?.dash?.audio;
    if (!audioList || audioList.length === 0) {
        throw new Error("未找到对应的音频流直链");
    }
    return audioList[0].baseUrl || audioList[0].backupUrl[0];
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
function getMp3Cover(filePath) {
    try {
        const fd = fs.openSync(filePath, "r");
        const stat = fs.fstatSync(fd);
        const tagSizeHeader = Buffer.alloc(10);
        fs.readSync(fd, tagSizeHeader, 0, 10, 0);
        if (tagSizeHeader.toString("ascii", 0, 3) !== "ID3") {
            fs.closeSync(fd);
            return null;
        }
        const version = tagSizeHeader[3];
        const tagSize = (tagSizeHeader[6] << 21) | (tagSizeHeader[7] << 14) | (tagSizeHeader[8] << 7) | tagSizeHeader[9];
        const tagBuffer = Buffer.alloc(tagSize);
        fs.readSync(fd, tagBuffer, 0, tagSize, 10);
        fs.closeSync(fd);
        let offset = 0;
        while (offset < tagSize - 10) {
            let frameId = "";
            if (version === 2) {
                frameId = tagBuffer.toString("ascii", offset, offset + 3);
            }
            else {
                frameId = tagBuffer.toString("ascii", offset, offset + 4);
            }
            if (!frameId || frameId[0] === "\0" || /[^A-Z0-9]/.test(frameId)) {
                break;
            }
            let frameSize = 0;
            let headerSize = 0;
            if (version === 2) {
                frameSize = (tagBuffer[offset + 3] << 16) | (tagBuffer[offset + 4] << 8) | tagBuffer[offset + 5];
                headerSize = 6;
            }
            else if (version === 3) {
                frameSize = tagBuffer.readUInt32BE(offset + 4);
                headerSize = 10;
            }
            else if (version === 4) {
                const b0 = tagBuffer[offset + 4];
                const b1 = tagBuffer[offset + 5];
                const b2 = tagBuffer[offset + 6];
                const b3 = tagBuffer[offset + 7];
                frameSize = (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
                headerSize = 10;
            }
            if (frameSize <= 0 || offset + headerSize + frameSize > tagSize) {
                break;
            }
            const isAPIC = frameId === "APIC" || frameId === "PIC";
            if (isAPIC) {
                const frameContent = tagBuffer.subarray(offset + headerSize, offset + headerSize + frameSize);
                let mimeType = "";
                let pictureDataOffset = 0;
                if (frameId === "APIC") {
                    const encoding = frameContent[0];
                    let mimeEnd = 1;
                    while (mimeEnd < frameContent.length && frameContent[mimeEnd] !== 0) {
                        mimeEnd++;
                    }
                    mimeType = frameContent.toString("ascii", 1, mimeEnd);
                    let descStart = mimeEnd + 2;
                    let descEnd = descStart;
                    if (encoding === 1 || encoding === 2) {
                        while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
                            descEnd += 2;
                        }
                        pictureDataOffset = descEnd + 2;
                    }
                    else {
                        while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
                            descEnd++;
                        }
                        pictureDataOffset = descEnd + 1;
                    }
                }
                else {
                    const encoding = frameContent[0];
                    const imageFormat = frameContent.toString("ascii", 1, 4);
                    mimeType = imageFormat === "PNG" ? "image/png" : "image/jpeg";
                    let descStart = 5;
                    let descEnd = descStart;
                    if (encoding === 1) {
                        while (descEnd < frameContent.length - 1 && !(frameContent[descEnd] === 0 && frameContent[descEnd + 1] === 0)) {
                            descEnd += 2;
                        }
                        pictureDataOffset = descEnd + 2;
                    }
                    else {
                        while (descEnd < frameContent.length && frameContent[descEnd] !== 0) {
                            descEnd++;
                        }
                        pictureDataOffset = descEnd + 1;
                    }
                }
                const pictureData = frameContent.subarray(pictureDataOffset);
                return { mimeType, data: pictureData };
            }
            offset += headerSize + frameSize;
        }
    }
    catch (e) {
        console.error("[GetMp3Cover] error:", e);
    }
    return null;
}
const downloadingPaths = new Set();
let activeCoverDownloads = 0;
const MAX_CONCURRENT_COVER_DOWNLOADS = 1;
async function downloadCoverInBackground(cachePath) {
    if (downloadingPaths.has(cachePath))
        return;
    downloadingPaths.add(cachePath);
    try {
        for (const url of ["http://www.dmoe.cc/random.php", "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images", "http://t.alcy.cc/acg", "http://api.amrno.com/api/acg"]) {
            try {
                const resp = await fetch(url, {
                    signal: AbortSignal.timeout(5000)
                });
                if (resp.ok) {
                    const buffer = Buffer.from(await resp.arrayBuffer());
                    fs.writeFileSync(cachePath, buffer);
                    break;
                }
            }
            catch { }
        }
    }
    catch { }
    finally {
        downloadingPaths.delete(cachePath);
    }
}
function searchLocalMusic(keyword) {
    const q = keyword.toLowerCase();
    return fs.readdirSync(MUSIC_DIR)
        .filter(f => /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f))
        .filter(f => f.toLowerCase().includes(q))
        .map((f, i) => {
        const stat = fs.statSync(path.join(MUSIC_DIR, f));
        const { artist, title, bvid } = parseMusicFilename(f);
        return { id: i, filename: f, title, artist, bvid, pic: `/api/music/cover?file=${encodeURIComponent(f)}`, size: stat.size };
    });
}
const RANDOM_MUSIC_KEYWORD = "__random__";
function extractMusicIntent(msg) {
    const lower = msg.toLowerCase();
    const playMatch = msg.match(/(?:播放|放一首?|听一首?|来一首?|来点|来些|我想听|我要听|想听)(.*)/);
    if (playMatch)
        return { type: "play", keyword: normalizeMusicActionKeyword(playMatch[1].trim(), true) };
    const searchMatch = msg.match(/(?:搜索|找|查找|有没有)(.+)/);
    if (searchMatch)
        return { type: "search", keyword: searchMatch[1].trim() };
    if (/(?:转换|转码|下载|转成|转为)/.test(lower))
        return { type: "convert", keyword: "" };
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
        return RANDOM_MUSIC_KEYWORD;
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
    const rawKeyword = String(value?.keyword || value?.query || value?.song || (type === "play_music" || type === "search_music" ? fallback.keyword : "") || "").trim();
    return {
        type,
        keyword: type === "play_music"
            ? normalizeMusicActionKeyword(rawKeyword, true)
            : normalizeMusicActionKeyword(rawKeyword, false),
        mode: mode || "cloud",
        source,
        confidence: Math.max(0, Math.min(1, Number(value?.confidence ?? (source === "agent" ? 0.75 : 0.45)) || 0)),
        reason: String(value?.reason || (source === "agent" ? "音乐 Agent 结构化决策" : "模型动作识别失败，使用后端兜底")).slice(0, 500),
    };
}
function normalizeOpenAiChatUrl(apiUrl) {
    const base = String(apiUrl || "").replace(/\/$/, "");
    if (base.includes("/chat/completions"))
        return base;
    if (base.endsWith("/v1"))
        return `${base}/chat/completions`;
    if (base.includes("/v1/"))
        return base;
    return `${base}/v1/chat/completions`;
}
function normalizeAnthropicMessagesUrl(apiUrl) {
    const base = String(apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
    if (base.endsWith("/v1/messages"))
        return base;
    if (base.endsWith("/v1"))
        return `${base}/messages`;
    return `${base}/v1/messages`;
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
    const apiUrl = String(cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
    const format = String(cfg.format || "auto");
    const isAnthropicCompat = format === "anthropic"
        || format === "anthropic-compatible"
        || (format === "auto" && (apiUrl.includes("anthropic") || apiUrl.endsWith("/anthropic")));
    try {
        if (isAnthropicCompat) {
            const response = await fetch(normalizeAnthropicMessagesUrl(apiUrl), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": cfg.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: cfg.model,
                    max_tokens: 220,
                    temperature: 0,
                    system,
                    messages: [{ role: "user", content: user }],
                }),
                signal: AbortSignal.timeout(8000),
            });
            const text = await response.text();
            if (!response.ok)
                throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
            const data = JSON.parse(text);
            const content = (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("").trim();
            const parsed = extractJsonObject(content);
            if (!parsed)
                throw new Error("模型未返回 JSON 动作");
            return normalizeMusicAgentAction(parsed, message, mode, "agent");
        }
        const response = await fetch(normalizeOpenAiChatUrl(apiUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${cfg.apiKey}`,
            },
            body: JSON.stringify({
                model: cfg.model,
                temperature: 0,
                max_tokens: 220,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user },
                ],
            }),
            signal: AbortSignal.timeout(8000),
        });
        const text = await response.text();
        if (!response.ok)
            throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
        const data = JSON.parse(text);
        const content = data?.choices?.[0]?.message?.content || "";
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
        const results = await biliSearch(toolInput.keyword || "");
        return results.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} - ${r.author} (${r.duration}) [BV: ${r.bvid}]`).join("\n") || "没有找到相关结果";
    }
    if (toolName === "search_local") {
        const results = searchLocalMusic(toolInput.keyword || "");
        return results.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n") || "本地没有找到相关音乐";
    }
    if (toolName === "search_netease") {
        const results = await neteaseSearch(toolInput.keyword || "");
        return results.slice(0, 8).map((r, i) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n") || "网易云没有找到相关音乐";
    }
    return "未知工具";
}
async function callClaudeAgent(cfg, system, messages, res, chatMode) {
    const apiUrl = (cfg.apiUrl || "https://api.anthropic.com").replace(/\/$/, "");
    const format = String(cfg.format || "auto");
    const isAnthropicCompat = format === "anthropic"
        || format === "anthropic-compatible"
        || (format === "auto" && (apiUrl.includes("anthropic") || apiUrl.endsWith("/anthropic")));
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
    const fetchUrl = apiUrl.endsWith("/v1/messages")
        ? apiUrl
        : apiUrl.endsWith("/v1")
            ? `${apiUrl}/messages`
            : `${apiUrl}/v1/messages`;
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
function runMusicAgentIntentSelfTest() {
    const playSpecific = normalizeMusicAgentAction({ action: "play_music", keyword: "周杰伦 晴天", confidence: 0.93 }, "我想听周杰伦的晴天", "cloud", "agent");
    const playRandom = normalizeMusicAgentAction({}, "播放音乐", "cloud", "fallback");
    const searchOnly = normalizeMusicAgentAction({ action: "search_music", keyword: "轻音乐", confidence: 0.9 }, "搜索轻音乐", "cloud", "agent");
    const questionOnly = normalizeMusicAgentAction({}, "歌词怎么显示？", "cloud", "fallback");
    const checks = {
        agentPlayAction: playSpecific.type === "play_music" && playSpecific.keyword === "周杰伦 晴天" && playSpecific.source === "agent",
        genericPlayBecomesRandom: playRandom.type === "play_music" && playRandom.keyword === RANDOM_MUSIC_KEYWORD,
        fallbackPlayRequiresNoAutoplay: playRandom.source === "fallback",
        searchDoesNotAutoplay: searchOnly.type === "search_music" && searchOnly.keyword === "轻音乐",
        questionDoesNotAutoplay: questionOnly.type !== "play_music",
    };
    return { pass: Object.values(checks).every(Boolean), checks, samples: { playSpecific, playRandom, searchOnly, questionOnly } };
}
function handleMusicApi(pathname, req, res, parsed, ctx) {
    if (!pathname.startsWith("/api/music"))
        return false;
    if (pathname === "/api/music/remote-command" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const keyword = String(payload.keyword || payload.query || "").trim();
                if (!keyword)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少音乐关键词" }, 400);
                const command = saveMusicRemoteCommand({ type: "play", keyword, source: payload.source || "global-agent" });
                (0, utils_1.sendJson)(res, { success: true, command });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "创建音乐播放指令失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/remote-command" && req.method === "GET") {
        const command = loadMusicRemoteCommand();
        (0, utils_1.sendJson)(res, { success: true, command: command && !command.consumed ? command : null });
        return true;
    }
    if (pathname === "/api/music/remote-command/consume" && req.method === "POST") {
        const command = loadMusicRemoteCommand();
        if (command) {
            command.consumed = true;
            command.consumed_at = new Date().toISOString();
            fs.writeFileSync(MUSIC_REMOTE_COMMAND_FILE, JSON.stringify(command, null, 2), "utf-8");
        }
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
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
                return { id: i, filename: f, title, artist, bvid, pic: `/api/music/cover?file=${encodeURIComponent(f)}`, size: stat.size, modified: stat.mtime.toISOString() };
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
    if (pathname === "/api/music/search-netease" && req.method === "GET") {
        const query = parsed.query.q || "";
        if (!query) {
            (0, utils_1.sendJson)(res, { success: true, results: [] });
            return true;
        }
        neteaseSearch(query).then(results => {
            (0, utils_1.sendJson)(res, { success: true, results });
        }).catch((e) => {
            (0, utils_1.sendJson)(res, { success: false, error: e.message });
        });
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
        req.on("end", async () => {
            try {
                const { bvid, title, author } = JSON.parse(body);
                if (!bvid)
                    return (0, utils_1.sendJson)(res, { error: "缺少 bvid" }, 400);
                const safeName = `${author || "unknown"} - ${title || bvid} [${bvid}]`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
                const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
                if (fs.existsSync(outputFile))
                    return (0, utils_1.sendJson)(res, { success: true, message: "文件已存在" });
                let audioUrl;
                try {
                    audioUrl = await getBiliAudioUrl(bvid);
                }
                catch (e) {
                    return (0, utils_1.sendJson)(res, { success: false, error: `解析失败: ${e.message}` });
                }
                const headers = `User-Agent: ${BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`;
                const child = (0, child_process_1.spawn)("ffmpeg", [
                    "-headers", headers,
                    "-i", audioUrl,
                    "-y",
                    "-q:a", "0",
                    outputFile
                ], { stdio: "ignore", windowsHide: true });
                child.on("close", (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile) });
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: false, error: "下载转码失败，请确保安装了 ffmpeg" });
                    }
                });
                child.on("error", () => {
                    (0, utils_1.sendJson)(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            config: publicMusicAgentConfig()
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
                if (updates.proxy !== undefined)
                    cfg.proxy = updates.proxy;
                (0, db_1.saveMusicConfig)(cfg);
                (0, utils_1.sendJson)(res, { success: true, config: publicMusicAgentConfig() });
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
        req.on("end", async () => {
            try {
                const { message, mode: chatMode, history } = JSON.parse(body);
                const cfg = loadMusicAgentConfig();
                if (!cfg.enabled) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先在系统设置启用统一大模型配置" });
                }
                if (!cfg.apiKey) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写 API Key" });
                }
                if (!cfg.model) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "请先到系统设置 → 统一大模型配置 中填写模型名称" });
                }
                const systemPrompt = `你是一个音乐助手 Agent。用户会告诉你想听什么音乐，你需要帮助他们搜索和推荐。

你有三个工具可用：
1. search_bilibili(keyword) - 搜索B站视频
2. search_local(keyword) - 搜索本地音乐库
3. search_netease(keyword) - 搜索网易云音乐

当前模式: \${chatMode === "local" ? "本地模式（搜索本地曲库）" : chatMode === "netease" ? "网易云模式（搜索网易云音乐）" : "B站模式（搜索B站并转码）"}

## 推荐输出格式（严格遵守）
当你向用户推荐歌曲时，先用自然语言简要介绍，然后 **必须** 将曲目放在独立的 \`\`\`tracks 代码块中。格式如下：

### B站模式：
\`\`\`tracks
[
  {"bvid":"BV1xxxxx","title":"视频标题","author":"UP主","duration":"4:32"}
]
\`\`\`

### 网易云模式：
\`\`\`tracks
[
  {"songId":12345,"title":"歌曲名","artist":"歌手名","duration":"4:32"}
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
2. 数据必须是合法 JSON 数组，必须从工具返回的结果中提取字段（不要编造或修改 uri、bvid、filename、songId 等核心标识）。
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
                const agentAction = await classifyMusicAgentAction(cfg, message, chatMode, history || []);
                writeSse(res, {
                    type: "music_action",
                    action: agentAction,
                    intent: agentAction.type,
                    keyword: agentAction.keyword,
                });
                const intent = {
                    type: agentAction.type === "play_music" ? "play" : agentAction.type === "search_music" ? "search" : agentAction.type === "convert_music" ? "convert" : "help",
                    keyword: agentAction.keyword,
                };
                let toolContext = "";
                if (intent.type === "search" || intent.type === "play") {
                    if (chatMode === "local") {
                        const localResults = searchLocalMusic(intent.keyword);
                        toolContext = `\n\n[工具结果] 本地搜索 "${intent.keyword}" 找到 ${localResults.length} 首：\n${localResults.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} - ${t.artist} (文件: ${t.filename})`).join("\n")}`;
                        messages[messages.length - 1].content += toolContext;
                        await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                    }
                    else if (chatMode === "netease") {
                        neteaseSearch(intent.keyword).then((neteaseResults) => {
                            toolContext = `\n\n[工具结果] 网易云搜索 "${intent.keyword}" 找到 ${neteaseResults.length} 个结果：\n${neteaseResults.slice(0, 8).map((r, i) => `${i + 1}. ${r.title} - ${(r.artist && r.artist !== "undefined" && r.artist !== "null" ? r.artist : "") || "未知歌手"} (${r.duration}) [ID: ${r.songId}]`).join("\n")}`;
                            messages[messages.length - 1].content += toolContext;
                            callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                        }).catch(() => {
                            messages[messages.length - 1].content += "\n\n[工具结果] 网易云搜索失败";
                            callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                        });
                        return;
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
                    await callClaudeAgent(cfg, systemPrompt, messages, res, chatMode);
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === AI 歌曲金句接口 ===
    if (pathname === "/api/music/song-quote" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const cleanTitle = String(title).toLowerCase();
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (cfg.enabled && cfg.apiKey && cfg.model) {
                    try {
                        const prompt = `你是一个音乐感悟助手。请根据歌曲"${title}"（歌手：${artist || "未知"}），用一句话写出听这首歌时的心情感悟，要有诗意，20字以内，不要引号。`;
                        const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
                            body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 60, temperature: 0.9 }),
                            signal: AbortSignal.timeout(8000)
                        });
                        const llmData = await llmRes.json();
                        const quote = llmData?.choices?.[0]?.message?.content?.trim();
                        if (quote)
                            return (0, utils_1.sendJson)(res, { success: true, quote });
                    }
                    catch (_) { }
                }
                // Fallback
                const GENERAL_QUOTES = [
                    "音符流淌的瞬间，世界突然变得温柔了起来。",
                    "愿这首歌的旋律，能轻轻抚平你心底所有的褶皱。",
                    "有些话说不出，但音乐已帮你唱完了所有的思绪。",
                    "在旋律的缝隙里，藏着对生活最真挚的热爱与期待。",
                    "音乐是心灵的避难所，今晚就在这旋律中安心放空吧。",
                    "每一个跃动的音符，都是时间写给你的无声情书。",
                    "任凭窗外风雨飘摇，耳机里永远有属于你的晴空。",
                    "生活虽有颠簸，但音乐总会在合适的角落给你拥抱。",
                    "沉浸在旋律里，让那些疲惫在温柔的歌声中渐渐消散。",
                    "每一首歌都是一个漂流瓶，恰好在这个瞬间被你拾起。"
                ];
                (0, utils_1.sendJson)(res, { success: true, quote: GENERAL_QUOTES[Math.floor(Math.random() * GENERAL_QUOTES.length)] });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    // === 歌曲封面同源代理（支持 MP3 解析与二次元哈希缓存） ===
    if (pathname === "/api/music/cover" && req.method === "GET") {
        const filename = parsed.query.file;
        if (filename && filename.includes("..")) {
            res.writeHead(400);
            res.end("Bad Request");
            return true;
        }
        // 如果没有传入具体的文件名，说明是在获取弹幕头像，直接给它返回随机二次元图片！
        if (!filename) {
            (async () => {
                let success = false;
                let imgBuffer = null;
                let mimeType = "image/jpeg";
                // 从公开的随机动漫图片 API 中抓取
                for (const url of ["http://www.dmoe.cc/random.php", "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images", "http://t.alcy.cc/acg", "http://api.amrno.com/api/acg"]) {
                    try {
                        const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
                        if (resp.ok) {
                            imgBuffer = Buffer.from(await resp.arrayBuffer());
                            mimeType = resp.headers.get("content-type") || "image/jpeg";
                            success = true;
                            break;
                        }
                    }
                    catch (e) { }
                }
                if (success && imgBuffer) {
                    res.writeHead(200, {
                        "Content-Type": mimeType,
                        "Content-Length": imgBuffer.length,
                        "Cache-Control": "no-cache"
                    });
                    res.end(imgBuffer);
                }
                else {
                    // 如果网络抓取均失败，我们读取默认的主页底图 room_window_bg.png 作为 fallback 头像，保证 100% 绝对不裂图！
                    const defaultPath = path.join(utils_1.PUBLIC_DIR, "room_window_bg.png");
                    if (fs.existsSync(defaultPath)) {
                        const buffer = fs.readFileSync(defaultPath);
                        res.writeHead(200, { "Content-Type": "image/png", "Content-Length": buffer.length });
                        res.end(buffer);
                    }
                    else {
                        res.writeHead(404);
                        res.end("Not Found");
                    }
                }
            })();
            return true;
        }
        const filePath = path.join(MUSIC_DIR, filename);
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not Found");
            return true;
        }
        const COVERS_CACHE_DIR = path.join(MUSIC_DIR, ".covers");
        if (!fs.existsSync(COVERS_CACHE_DIR)) {
            fs.mkdirSync(COVERS_CACHE_DIR, { recursive: true });
        }
        const hash = crypto.createHash("md5").update(filename).digest("hex");
        const cachePath = path.join(COVERS_CACHE_DIR, `${hash}.jpg`);
        if (fs.existsSync(cachePath)) {
            const buffer = fs.readFileSync(cachePath);
            res.writeHead(200, {
                "Content-Type": "image/jpeg",
                "Content-Length": buffer.length,
                "Cache-Control": "public, max-age=31536000"
            });
            res.end(buffer);
            return true;
        }
        (async () => {
            const cfg = (0, db_1.loadMusicConfig)();
            let oldHttpProxy = process.env.HTTP_PROXY;
            let oldHttpsProxy = process.env.HTTPS_PROXY;
            if (cfg.proxy) {
                process.env.HTTP_PROXY = cfg.proxy;
                process.env.HTTPS_PROXY = cfg.proxy;
            }
            const cleanProxy = () => {
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
            };
            const fallbackToDefault = () => {
                cleanProxy();
                const animeCoversDir = path.join(utils_1.PUBLIC_DIR, "anime_covers");
                if (fs.existsSync(animeCoversDir)) {
                    const files = fs.readdirSync(animeCoversDir).filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
                    if (files.length > 0) {
                        let sum = 0;
                        for (let i = 0; i < hash.length; i++) {
                            sum += hash.charCodeAt(i);
                        }
                        const index = sum % files.length;
                        const chosenFile = files[index];
                        const animePath = path.join(animeCoversDir, chosenFile);
                        if (fs.existsSync(animePath)) {
                            const buffer = fs.readFileSync(animePath);
                            try {
                                fs.writeFileSync(cachePath, buffer);
                            }
                            catch (e) {
                                // Ignore cache write error
                            }
                            res.writeHead(200, {
                                "Content-Type": chosenFile.endsWith(".png") ? "image/png" : "image/jpeg",
                                "Content-Length": buffer.length,
                                "Cache-Control": "public, max-age=31536000"
                            });
                            res.end(buffer);
                            return;
                        }
                    }
                }
                const defaultPath = path.join(utils_1.PUBLIC_DIR, "room_window_bg.png");
                if (fs.existsSync(defaultPath)) {
                    const buffer = fs.readFileSync(defaultPath);
                    res.writeHead(200, {
                        "Content-Type": "image/png",
                        "Content-Length": buffer.length,
                        "Cache-Control": "public, max-age=60"
                    });
                    res.end(buffer);
                }
                else {
                    res.writeHead(404);
                    res.end("Not Found");
                }
            };
            try {
                let success = false;
                let imgBuffer = null;
                let mimeType = "image/jpeg";
                for (const url of ["http://www.dmoe.cc/random.php", "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images", "http://t.alcy.cc/acg", "http://api.amrno.com/api/acg"]) {
                    try {
                        const resp = await fetch(url, {
                            signal: AbortSignal.timeout(4500)
                        });
                        if (resp.ok) {
                            imgBuffer = Buffer.from(await resp.arrayBuffer());
                            mimeType = resp.headers.get("content-type") || "image/jpeg";
                            success = true;
                            break;
                        }
                    }
                    catch (e) {
                        // 忽略单次连接失败
                    }
                }
                if (success && imgBuffer) {
                    fs.writeFileSync(cachePath, imgBuffer);
                    cleanProxy();
                    res.writeHead(200, {
                        "Content-Type": mimeType,
                        "Content-Length": imgBuffer.length,
                        "Cache-Control": "public, max-age=31536000"
                    });
                    res.end(imgBuffer);
                }
                else {
                    fallbackToDefault();
                }
            }
            catch (err) {
                fallbackToDefault();
            }
        })();
        return true;
    }
    // === 代理获取天气接口（三级高可用容灾版） ===
    if (pathname === "/api/music/weather" && req.method === "GET") {
        const lat = parsed.query.lat;
        const lon = parsed.query.lon;
        (async () => {
            const cfg = (0, db_1.loadMusicConfig)();
            let oldHttpProxy = process.env.HTTP_PROXY;
            let oldHttpsProxy = process.env.HTTPS_PROXY;
            if (cfg.proxy) {
                process.env.HTTP_PROXY = cfg.proxy;
                process.env.HTTPS_PROXY = cfg.proxy;
            }
            const cleanProxy = () => {
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
            };
            const isHealthy = (str) => {
                if (!str)
                    return false;
                const s = str.trim();
                return s.length > 0 && s.length <= 25 && !s.includes("<") && !s.includes("{") && !s.includes("style");
            };
            const translateWeather = (raw) => {
                let cleaned = raw.trim().replace(/\+/g, "");
                const weatherMap = {
                    "partly cloudy": "多云",
                    "cloudy": "多云",
                    "sunny": "晴",
                    "clear": "晴",
                    "overcast": "阴",
                    "light rain": "小雨",
                    "heavy rain": "大雨",
                    "rain": "雨",
                    "snow": "雪",
                    "smoky haze": "霾",
                    "haze": "霾",
                    "fog": "雾",
                    "mist": "雾",
                    "windy": "有风",
                    "thunderstorm": "雷阵雨"
                };
                let translated = cleaned;
                for (const eng of Object.keys(weatherMap)) {
                    const reg = new RegExp(eng, "gi");
                    translated = translated.replace(reg, weatherMap[eng]);
                }
                return translated;
            };
            // 封装阶段3的国内 IP + 科大讯飞高精度天气逻辑
            const fetchDomesticWeather = async () => {
                try {
                    const ipResp = await fetch("http://ip-api.com/json/?lang=zh-CN", {
                        signal: AbortSignal.timeout(3000)
                    });
                    const ipData = await ipResp.json();
                    if (ipData && ipData.status === "success" && ipData.city) {
                        const city = ipData.city.replace(/市$/, "");
                        const weatherUrl = `http://autodev.openspeech.cn/api/v1/weather?openId=12345678&city=${encodeURIComponent(city)}`;
                        const wResp = await fetch(weatherUrl, {
                            signal: AbortSignal.timeout(3000)
                        });
                        const wData = await wResp.json();
                        if (wData && wData.code === 0 && wData.data && wData.data.list && wData.data.list.length > 0) {
                            const item = wData.data.list[0];
                            const wText = item.weather || "";
                            const tempText = (item.temp && item.temp !== 0) ? `${item.temp}°C` : `${item.low}~${item.high}°C`;
                            const result = `${wText} ${tempText}`.trim();
                            if (isHealthy(result)) {
                                return result;
                            }
                        }
                    }
                }
                catch (err) {
                    console.warn("[Weather Proxy] Domestic IP weather failed:", err.message);
                }
                return null;
            };
            // 封装 wttr.in 天气逻辑
            const fetchWttrWeather = async (useHttps = true) => {
                try {
                    let url = useHttps ? "https://wttr.in/?m&format=%C+%t&lang=zh" : "http://wttr.in/?m&format=%C+%t&lang=zh";
                    if (lat && lon) {
                        url = useHttps ? `https://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh` : `http://wttr.in/${lat},${lon}?m&format=%C+%t&lang=zh`;
                    }
                    const resp = await fetch(url, {
                        headers: { "User-Agent": "curl/8.4.0" },
                        signal: AbortSignal.timeout(3500)
                    });
                    const text = await resp.text();
                    const translated = translateWeather(text);
                    if (isHealthy(translated)) {
                        return translated;
                    }
                }
                catch (err) {
                    console.warn(`[Weather Proxy] wttr.in (${useHttps ? "HTTPS" : "HTTP"}) failed:`, err.message);
                }
                return null;
            };
            // === 气象定位分流控制 ===
            if (lat && lon) {
                // 如果有 GPS 经纬度：优先走 wttr.in 经纬度精准天气
                let result = await fetchWttrWeather(true);
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
                result = await fetchWttrWeather(false);
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
                result = await fetchDomesticWeather();
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
            }
            else {
                // 如果没有 GPS 经纬度（依靠 IP 定位）：优先走国内 IP 定位 + 科大讯飞精确市级天气（防范梯子/IP 粗识别偏移）
                let result = await fetchDomesticWeather();
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
                result = await fetchWttrWeather(true);
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
                result = await fetchWttrWeather(false);
                if (result) {
                    cleanProxy();
                    return (0, utils_1.sendJson)(res, { success: true, weather: result });
                }
            }
            cleanProxy();
            (0, utils_1.sendJson)(res, { success: false, error: "所有天气接口获取均失败" });
        })();
        return true;
    }
    if (pathname === "/api/music/song-emotion" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const emotionLabels = ["惬意", "治愈", "温柔", "怀念", "放空", "舒缓", "思念", "平静", "动感", "感动"];
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (cfg.enabled && cfg.apiKey && cfg.model) {
                    try {
                        const prompt = `你是一个音乐情绪分析助手。根据歌曲名"${title}"（歌手：${artist || "未知"}），从以下标签选一个最符合的情绪，只输出标签本身：${emotionLabels.join("、")}`;
                        const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
                            body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 20, temperature: 0.7 }),
                            signal: AbortSignal.timeout(8000)
                        });
                        const llmData = await llmRes.json();
                        const raw = llmData?.choices?.[0]?.message?.content?.trim() || "";
                        const matched = emotionLabels.find(e => raw.includes(e));
                        if (matched)
                            return (0, utils_1.sendJson)(res, { success: true, emotion: matched });
                    }
                    catch (_) { }
                }
                const t = String(title).toLowerCase();
                let fallback = "惬意";
                if (t.includes("晚安") || t.includes("夜"))
                    fallback = "舒缓";
                else if (t.includes("思念") || t.includes("想你"))
                    fallback = "思念";
                else if (t.includes("再见") || t.includes("离别"))
                    fallback = "怀念";
                else if (t.includes("治愈") || t.includes("温暖"))
                    fallback = "治愈";
                else if (t.includes("快乐") || t.includes("开心"))
                    fallback = "动感";
                else
                    fallback = emotionLabels[Math.floor(Math.random() * emotionLabels.length)];
                (0, utils_1.sendJson)(res, { success: true, emotion: fallback });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    // === AI 歌曲金句接口 ===
    if (pathname === "/api/music/song-quote" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (cfg.enabled && cfg.apiKey && cfg.model) {
                    try {
                        const prompt = `你是一个音乐感悟助手。根据歌曲"${title}"（歌手：${artist || "未知"}），用一句话写出听这首歌的心情感悟，要有诗意，20字以内，不要引号。`;
                        const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
                            body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 60, temperature: 0.9 }),
                            signal: AbortSignal.timeout(8000)
                        });
                        const llmData = await llmRes.json();
                        const quote = llmData?.choices?.[0]?.message?.content?.trim();
                        if (quote)
                            return (0, utils_1.sendJson)(res, { success: true, quote });
                    }
                    catch (_) { }
                }
                const QUOTES = [
                    "音符流淌的瞬间，世界突然变得温柔了起来。",
                    "愿这首歌的旋律，能轻轻抚平你心底所有的褶皱。",
                    "有些话说不出，但音乐已帮你唱完了所有的思绪。",
                    "在旋律的缝隙里，藏着对生活最真挚的热爱与期待。",
                    "音乐是心灵的避难所，今晚就在这旋律中安心放空吧。",
                    "每一个跃动的音符，都是时间写给你的无声情书。",
                    "任凭窗外风雨飘摇，耳机里永远有属于你的晴空。",
                    "生活虽有颠簸，但音乐总会在合适的角落给你拥抱。",
                    "沉浸在旋律里，让那些疲惫在温柔的歌声中渐渐消散。",
                    "每一首歌都是一个漂流瓶，恰好在这个瞬间被你拾起。"
                ];
                (0, utils_1.sendJson)(res, { success: true, quote: QUOTES[Math.floor(Math.random() * QUOTES.length)] });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    // === 歌曲情绪分析接口 ===
    if (pathname === "/api/music/song-emotion" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { title, artist } = JSON.parse(body);
                if (!title) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "Missing title" }, 400);
                }
                const emotionLabels = ["惬意", "治愈", "温柔", "怀念", "放空", "舒缓", "思念", "平静", "动感", "感动"];
                const cfg = (0, group_orchestrator_1.loadOrchestratorConfig)();
                if (cfg.enabled && cfg.apiKey && cfg.model) {
                    try {
                        const prompt = `你是音乐情绪分析助手。根据歌曲名"${title}"（歌手：${artist || "未知"}），从以下标签选一个最符合的情绪，只输出标签本身，不要解释：${emotionLabels.join("、")}`;
                        const llmRes = await fetch(cfg.apiUrl + "/chat/completions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
                            body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: prompt }], max_tokens: 20, temperature: 0.7 }),
                            signal: AbortSignal.timeout(8000)
                        });
                        const llmData = await llmRes.json();
                        const raw = llmData?.choices?.[0]?.message?.content?.trim() || "";
                        const matched = emotionLabels.find(e => raw.includes(e));
                        if (matched)
                            return (0, utils_1.sendJson)(res, { success: true, emotion: matched });
                    }
                    catch (_) { }
                }
                const t = String(title).toLowerCase();
                let fallback = "惬意";
                if (t.includes("晚安") || t.includes("夜"))
                    fallback = "舒缓";
                else if (t.includes("思念") || t.includes("想你"))
                    fallback = "思念";
                else if (t.includes("再见") || t.includes("离别"))
                    fallback = "怀念";
                else if (t.includes("治愈") || t.includes("温暖"))
                    fallback = "治愈";
                else if (t.includes("快乐") || t.includes("开心"))
                    fallback = "动感";
                else
                    fallback = emotionLabels[Math.floor(Math.random() * emotionLabels.length)];
                (0, utils_1.sendJson)(res, { success: true, emotion: fallback });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
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
                const action = normalizeMusicAgentAction({ action: intent.type === "play" ? "play_music" : intent.type === "search" ? "search_music" : intent.type === "convert" ? "convert_music" : "none", keyword: intent.keyword }, message, chatMode, "simple-fallback");
                const result = { intent: intent.type, keyword: intent.keyword, action };
                if (intent.type === "search") {
                    if (chatMode === "local") {
                        const localResults = searchLocalMusic(intent.keyword);
                        result.localResults = localResults;
                        result.reply = localResults.length > 0
                            ? `在本地找到 ${localResults.length} 首匹配的音乐：`
                            : `本地没有找到"${intent.keyword}"相关音乐，试试切换到 B站模式？`;
                        (0, utils_1.sendJson)(res, { success: true, ...result });
                    }
                    else if (chatMode === "netease") {
                        neteaseSearch(intent.keyword).then((neteaseResults) => {
                            result.neteaseResults = neteaseResults;
                            result.reply = neteaseResults.length > 0
                                ? `在网易云找到 ${neteaseResults.length} 个相关结果：`
                                : `网易云没有找到"${intent.keyword}"相关的结果，换个关键词试试？`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch((e) => {
                            result.reply = `搜索出错: ${e.message}`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
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
                    else if (chatMode === "netease") {
                        neteaseSearch(intent.keyword).then((neteaseResults) => {
                            result.neteaseResults = neteaseResults.slice(0, 5);
                            result.reply = neteaseResults.length > 0
                                ? `找到以下结果，点击下载播放：`
                                : `没有找到相关结果`;
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        }).catch(() => {
                            result.reply = "搜索出错";
                            (0, utils_1.sendJson)(res, { success: true, ...result });
                        });
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
        const title = parsed.query.title;
        const artist = parsed.query.artist;
        if (!bvid && !title)
            return (0, utils_1.sendJson)(res, { error: "缺少 bvid 或 title" }, 400);
        (async () => {
            if (bvid) {
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
            }
            else {
                try {
                    const query = `${artist || ""} ${title}`.trim();
                    console.log("[NeteaseComments] searching for:", query);
                    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=5`;
                    const searchRes = await fetch(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://music.163.com/",
                        }
                    });
                    const searchData = await searchRes.json();
                    const songs = searchData?.result?.songs || [];
                    if (songs.length === 0) {
                        return (0, utils_1.sendJson)(res, { success: true, danmaku: [] });
                    }
                    const songId = songs[0].id;
                    // 并发请求多页，获取更多评论（共 5 页，每页最多 40 条，累计最多 200 条评论 + 热评）
                    const limit = 40;
                    const offsets = [0, 40, 80, 120, 160];
                    const promises = offsets.map(offset => {
                        const commentsUrl = `https://music.163.com/api/v1/resource/comments/R_SO_4_${songId}?limit=${limit}&offset=${offset}`;
                        return fetch(commentsUrl, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                "Referer": "https://music.163.com/",
                            }
                        }).then(r => r.json()).catch(() => ({}));
                    });
                    const results = await Promise.all(promises);
                    let allHotComments = [];
                    let allStandardComments = [];
                    for (const data of results) {
                        const d = data;
                        if (d?.hotComments) {
                            allHotComments = allHotComments.concat(d.hotComments);
                        }
                        if (d?.comments) {
                            allStandardComments = allStandardComments.concat(d.comments);
                        }
                    }
                    // 对热评和最新评论去重
                    const uniqueHotMap = new Map();
                    for (const c of allHotComments) {
                        if (c?.commentId)
                            uniqueHotMap.set(c.commentId, c);
                    }
                    const hotComments = Array.from(uniqueHotMap.values());
                    const uniqueStandardMap = new Map();
                    for (const c of allStandardComments) {
                        if (c?.commentId && !uniqueHotMap.has(c.commentId)) {
                            uniqueStandardMap.set(c.commentId, c);
                        }
                    }
                    const standardComments = Array.from(uniqueStandardMap.values());
                    const allComments = [...hotComments, ...standardComments];
                    const items = [];
                    const duration = 240;
                    // 上限调高到 200 条，弹幕更加饱满热闹
                    const maxComments = Math.min(allComments.length, 200);
                    for (let i = 0; i < maxComments; i++) {
                        const c = allComments[i];
                        const username = c.user?.nickname || "网易云用户";
                        const message = (c.content || "").replace(/\s+/g, " ").trim();
                        if (!message)
                            continue;
                        const shortMsg = message.length > 80 ? message.substring(0, 80) + "..." : message;
                        const isHot = i < hotComments.length;
                        const content = isHot ? `💬 [网易云热评] ${username}: ${shortMsg}` : `💬 [评论] ${username}: ${shortMsg}`;
                        // 采用更加随机且紧凑的散布方式，使弹幕不会死板地等距出现，而是产生密集的弹幕云效果
                        const time = 3 + Math.random() * (duration - 13);
                        const color = isHot ? "#ff4d4f" : "#a6a6a6";
                        items.push({
                            time,
                            content,
                            type: 1,
                            color
                        });
                    }
                    console.log("[NeteaseComments] loaded", items.length, "comments for songId:", songId);
                    (0, utils_1.sendJson)(res, { success: true, danmaku: items });
                }
                catch (e) {
                    console.error("[NeteaseComments] error:", e.message);
                    (0, utils_1.sendJson)(res, { success: false, error: e.message });
                }
            }
        })();
        return true;
    }
    if (pathname === "/api/music/convert-netease" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { songId, title, artist } = JSON.parse(body);
                if (!songId)
                    return (0, utils_1.sendJson)(res, { error: "缺少 songId" }, 400);
                const safeName = `${artist || "unknown"} - ${title || songId}`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
                const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
                if (fs.existsSync(outputFile))
                    return (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile), message: "文件已存在" });
                const audioUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
                const child = (0, child_process_1.spawn)("ffmpeg", [
                    "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: https://music.163.com/\r\n",
                    "-i", audioUrl,
                    "-y",
                    "-q:a", "0",
                    "-loglevel", "error",
                    outputFile
                ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
                let stderr = "";
                child.stderr?.on("data", (d) => { stderr += d.toString(); });
                child.on("close", (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        const stat = fs.statSync(outputFile);
                        if (stat.size > 1024) {
                            (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile) });
                        }
                        else {
                            try {
                                fs.unlinkSync(outputFile);
                            }
                            catch { }
                            (0, utils_1.sendJson)(res, { success: false, error: "该歌曲可能需要VIP或已下架，无法获取音频" });
                        }
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: false, error: stderr.substring(0, 200) || "下载转码失败" });
                    }
                });
                child.on("error", () => {
                    (0, utils_1.sendJson)(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/music/convert" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { bvid, title, author } = JSON.parse(body);
                if (!bvid)
                    return (0, utils_1.sendJson)(res, { error: "缺少 bvid" }, 400);
                const safeName = `${author || "unknown"} - ${title || bvid} [${bvid}]`.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
                const outputFile = path.join(MUSIC_DIR, `${safeName}.mp3`);
                if (fs.existsSync(outputFile))
                    return (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile), message: "文件已存在" });
                let audioUrl;
                try {
                    audioUrl = await getBiliAudioUrl(bvid);
                }
                catch (e) {
                    return (0, utils_1.sendJson)(res, { success: false, error: `解析失败: ${e.message}` });
                }
                const headers = `User-Agent: ${BILI_UA}\r\nReferer: https://www.bilibili.com/\r\n`;
                const child = (0, child_process_1.spawn)("ffmpeg", [
                    "-headers", headers,
                    "-i", audioUrl,
                    "-y",
                    "-q:a", "0",
                    outputFile
                ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
                let stderr = "";
                child.stderr?.on("data", (d) => { stderr += d.toString(); });
                child.on("close", (code) => {
                    if (code === 0 && fs.existsSync(outputFile)) {
                        (0, utils_1.sendJson)(res, { success: true, filename: path.basename(outputFile) });
                    }
                    else {
                        (0, utils_1.sendJson)(res, { success: false, error: stderr.substring(0, 200) || "下载转码失败" });
                    }
                });
                child.on("error", () => {
                    (0, utils_1.sendJson)(res, { success: false, error: "ffmpeg 未安装或未加入环境变量" });
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