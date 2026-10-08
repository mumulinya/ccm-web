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
exports.adoptDouyinMcpCookie = adoptDouyinMcpCookie;
exports.callDouyinMcpTool = callDouyinMcpTool;
exports.douyinMcpCapabilities = douyinMcpCapabilities;
exports.douyinMcpGetVideoDetail = douyinMcpGetVideoDetail;
exports.douyinMcpGetVideoComments = douyinMcpGetVideoComments;
exports.douyinMcpGetVideoLiveComments = douyinMcpGetVideoLiveComments;
exports.douyinMcpGetSubComments = douyinMcpGetSubComments;
exports.douyinMcpGetUserInfo = douyinMcpGetUserInfo;
exports.douyinMcpGetUserPosts = douyinMcpGetUserPosts;
exports.douyinMcpGetHomefeed = douyinMcpGetHomefeed;
exports.douyinMcpGetLoginQrcode = douyinMcpGetLoginQrcode;
exports.douyinMcpResolveShareUrl = douyinMcpResolveShareUrl;
exports.douyinMcpDownloadVideo = douyinMcpDownloadVideo;
exports.isDouyinManagedMediaPath = isDouyinManagedMediaPath;
exports.douyinMcpDownloadImages = douyinMcpDownloadImages;
exports.douyinMcpOcrImages = douyinMcpOcrImages;
exports.douyinMcpTranscribeVideo = douyinMcpTranscribeVideo;
exports.douyinMcpBatchTranscribe = douyinMcpBatchTranscribe;
exports.normalizeDouyinRows = normalizeDouyinRows;
exports.douyinMcpStatus = douyinMcpStatus;
exports.douyinMcpCheckLogin = douyinMcpCheckLogin;
exports.douyinMcpSearchPage = douyinMcpSearchPage;
exports.douyinMcpSearch = douyinMcpSearch;
exports.startDouyinMcpLogin = startDouyinMcpLogin;
exports.revokeDouyinMcpLogin = revokeDouyinMcpLogin;
exports.runDouyinMcpBridgeSelfTest = runDouyinMcpBridgeSelfTest;
exports.closeDouyinMcpRuntime = closeDouyinMcpRuntime;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const credential_store_1 = require("../../core/credential-store");
const mcp_client_1 = require("../../tools/mcp-client");
const douyin_contract_1 = require("./douyin-contract");
const managed_process_tree_1 = require("../../system/managed-process-tree");
const COOKIE_REF_FIELD = "mcpCookieRef";
const runtimeRoot = path.join(utils_1.CCM_DIR, "private", "music-runtime");
const mediaRoot = path.join(utils_1.CCM_DIR, "media", "douyin");
const cookieFile = path.join(runtimeRoot, "douyin-mcp-cookies.txt");
const loginCookieFile = path.join(runtimeRoot, 'douyin-login-cookies.txt');
let client = null;
let clientRoot = "";
let clientRevision = '';
let connectPromise = null;
let lastError = "";
let login = null;
let loginStopping = null;
let probeCache = null;
let loginVerified = null;
let authGeneration = 0;
const mediaClients = new Set();
function clean(value, limit = 300) {
    return String(value || "")
        .replace(/((?:cookie|sessionid(?:_ss)?|msToken|token|authorization)\s*[=:]\s*)[^\s;]+/gi, "$1[redacted]")
        .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}
function mode() {
    const configured = (0, db_1.loadMusicConfig)()?.douyin?.mcpMode;
    const value = String(Object.prototype.hasOwnProperty.call(process.env, "CCM_DOUYIN_MCP") ? process.env.CCM_DOUYIN_MCP : configured || "auto").trim().toLowerCase();
    return value === "on" || value === "off" ? value : "auto";
}
function candidateRoots() {
    return Array.from(new Set([
        String(process.env.CCM_DOUYIN_MCP_ROOT || "").trim() ? path.resolve(String(process.env.CCM_DOUYIN_MCP_ROOT || "").trim()) : "",
        path.resolve(process.cwd(), "integrations", "douyin-mcp"),
        path.resolve(__dirname, "../../../../integrations/douyin-mcp"),
        path.resolve(__dirname, "../../../douyin-mcp"),
        path.resolve(process.cwd(), "ccm-package", "douyin-mcp"),
    ].filter(Boolean)));
}
function findRoot() {
    return candidateRoots().find(root => fs.existsSync(path.join(root, "main.py")) && fs.existsSync(path.join(root, "login.py"))) || "";
}
function hasCommand(command, args = ["--version"]) {
    try {
        return (0, child_process_1.spawnSync)(command, args, { stdio: "ignore", windowsHide: true, timeout: 4_000 }).status === 0;
    }
    catch {
        return false;
    }
}
function pythonAvailable() { return hasCommand("python", ["--version"]) || hasCommand("python3", ["--version"]); }
function inspect() {
    if (probeCache && probeCache.expires > Date.now())
        return probeCache.value;
    const root = findRoot();
    if (!root)
        return { root: "", uv: hasCommand("uv"), python: pythonAvailable(), files: false, playwright: "unknown", error: "未找到 douyin-mcp sidecar" };
    const uv = hasCommand("uv");
    const python = pythonAvailable();
    const files = ["main.py", "login.py", "pyproject.toml", "src/server.py"].every(name => fs.existsSync(path.join(root, name)));
    // Do not invoke `uv run` during a status request: it may resolve/download a
    // virtual environment and make the music page appear hung. The actual MCP
    // connection is the authoritative dependency check; this is only a cheap
    // local hint for the settings panel.
    let playwright = "unknown";
    try {
        playwright = hasCommand("python", ["-c", "import playwright"]) ? "ready" : "missing";
    }
    catch {
        playwright = "unknown";
    }
    const value = { root, uv, python, files, playwright, error: !uv ? "未找到 uv" : !files ? "sidecar 文件不完整" : undefined };
    probeCache = { value, expires: Date.now() + 30_000 };
    return value;
}
function cookieRef() {
    const value = (0, db_1.loadMusicConfig)()?.douyin?.[COOKIE_REF_FIELD];
    return (0, credential_store_1.isCredentialReference)(value) ? String(value) : "";
}
function asrSettings() {
    const value = (0, db_1.loadMusicConfig)()?.douyin || {};
    return {
        provider: String(value.asrProvider || "siliconflow").trim().toLowerCase(),
        apiUrl: String(value.asrApiUrl || "").trim().slice(0, 500),
        model: String(value.asrModel || "").trim().slice(0, 160),
        apiKeyRef: (0, credential_store_1.isCredentialReference)(value.asrApiKeyRef) ? String(value.asrApiKeyRef) : "",
    };
}
function asrApiKey(value = asrSettings()) {
    if (!value.apiKeyRef)
        return "";
    try {
        return (0, credential_store_1.resolveCredential)(value.apiKeyRef);
    }
    catch {
        return "";
    }
}
function effectiveAsrEnv() {
    const configured = asrSettings();
    const key = asrApiKey(configured);
    return {
        provider: String(process.env.ASR_PROVIDER || configured.provider || "siliconflow").trim().toLowerCase(),
        apiUrl: String(process.env.ASR_API_URL || configured.apiUrl || "").trim(),
        model: String(process.env.ASR_MODEL || configured.model || "").trim(),
        key: String(process.env.ASR_API_KEY || key || "").trim(),
    };
}
function materializeCookie() {
    const ref = cookieRef();
    if (!ref)
        return "";
    let value = "";
    try {
        value = (0, credential_store_1.resolveCredential)(ref);
    }
    catch {
        return "";
    }
    if (!value.trim())
        return "";
    fs.mkdirSync(runtimeRoot, { recursive: true });
    fs.writeFileSync(cookieFile, value, { encoding: "utf8", mode: 0o600 });
    try {
        fs.chmodSync(cookieFile, 0o600);
    }
    catch { }
    return cookieFile;
}
function adoptDouyinMcpCookie(storage) {
    if (mode() === "off" || cookieRef() || !Array.isArray(storage?.cookies))
        return false;
    const cookies = storage.cookies
        .filter((cookie) => String(cookie?.domain || "").includes("douyin.com") && String(cookie?.name || "") && String(cookie?.value || ""))
        .map((cookie) => `${String(cookie.name).trim()}=${String(cookie.value).trim()}`)
        .filter(Boolean);
    if (!cookies.length)
        return false;
    const config = (0, db_1.loadMusicConfig)();
    config.douyin = { ...(config.douyin || {}), [COOKIE_REF_FIELD]: (0, credential_store_1.protectCredential)("music-douyin", "mcp-cookie", cookies.join("; ")) };
    (0, db_1.saveMusicConfig)(config);
    return true;
}
function parseJsonText(value) {
    if (typeof value !== "string")
        return value;
    if (value.length > 4 * 1024 * 1024)
        return { success: false, error: "抖音 MCP 响应超过大小限制" };
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function unwrap(value) {
    if (!value)
        return value;
    if (value.structuredContent)
        return value.structuredContent;
    if (Array.isArray(value.content)) {
        for (const item of value.content)
            if (item?.text)
                return parseJsonText(item.text);
    }
    return parseJsonText(value);
}
const MCP_TOOL_DESCRIPTIONS = {
    check_login_status: { readOnly: true, description: "检查抖音登录状态" },
    logout: { readOnly: false, description: "清除抖音登录 Cookie" },
    search_videos: { readOnly: true, description: "按关键词搜索抖音视频" },
    get_video_detail: { readOnly: true, description: "获取抖音视频详情" },
    get_video_comments: { readOnly: true, description: "获取视频评论" },
    get_video_live_comments: { readOnly: true, description: "获取播放期间新增评论（轮询，不是时间轴弹幕）" },
    get_sub_comments: { readOnly: true, description: "获取评论回复" },
    get_user_info: { readOnly: true, description: "获取抖音用户资料" },
    get_user_posts: { readOnly: true, description: "获取用户发布的视频" },
    get_homefeed: { readOnly: true, description: "获取抖音推荐视频流" },
    get_login_qrcode: { readOnly: false, description: "启动兼容二维码登录流程" },
    resolve_share_url: { readOnly: true, description: "解析抖音分享链接" },
    download_video: { readOnly: false, description: "下载抖音视频" },
    download_aweme_images: { readOnly: false, description: "下载抖音图文图片" },
    ocr_aweme_images: { readOnly: false, description: "识别抖音图文中的文字" },
    transcribe_video: { readOnly: false, description: "转写抖音视频语音" },
    transcribe_audio: { readOnly: false, description: "转写 CCM 已缓存的抖音音频" },
    batch_transcribe: { readOnly: false, description: "批量搜索并转写视频" },
};
function managedMediaDir(value = "") {
    const relative = String(value || "").trim();
    const target = path.resolve(mediaRoot, relative || ".");
    const root = path.resolve(mediaRoot);
    if (target !== root && !target.startsWith(`${root}${path.sep}`))
        throw new Error("抖音媒体保存目录必须位于 CCM 管理目录内");
    let current = target;
    while (current !== path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
            throw new Error('抖音媒体目录不可使用符号链接或联接');
        current = path.dirname(current);
    }
    fs.mkdirSync(target, { recursive: true });
    return target;
}
function classifyMcpError(message) {
    const error = new Error(clean(message || "抖音 MCP 工具调用失败", 600));
    error.douyinState = /登录|cookie|session|未授权|unauthorized/i.test(error.message)
        ? "login_required"
        : /verify|验证|风控|安全验证|captcha/i.test(error.message)
            ? "risk_controlled"
            : /配置|未安装|不可用|not configured|not found/i.test(error.message)
                ? "capability_unavailable"
                : "unavailable";
    return error;
}
function sidecarEnv(outputSubdir = '') {
    const asr = effectiveAsrEnv();
    return {
        DOUYIN_COOKIE: "", DOUYIN_COOKIE_PATH: materializeCookie() || cookieFile,
        DOUYIN_DOWNLOAD_DIR: managedMediaDir(""),
        DOUYIN_TRANSCRIPT_DIR: managedMediaDir(outputSubdir || "transcripts"),
        CCM_DOUYIN_MANAGED: "1", PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8",
        ASR_PROVIDER: asr.provider,
        ...(asr.apiUrl ? { ASR_API_URL: asr.apiUrl } : {}),
        ...(asr.model ? { ASR_MODEL: asr.model } : {}),
        ...(asr.key ? { ASR_API_KEY: asr.key } : {}),
        ...(asr.provider === "siliconflow" && asr.key ? { SILICONFLOW_API_KEY: asr.key } : {}),
        ...(asr.provider === "openai" && asr.key ? { OPENAI_API_KEY: asr.key } : {}),
        ...(asr.provider === "volcengine" && asr.key ? { VOLCENGINE_API_KEY: asr.key } : {}),
    };
}
async function callDouyinMcpTool(name, input = {}, options = {}) {
    const args = (0, douyin_contract_1.validateDouyinArgs)(name, input);
    if (args.audio_path && !isDouyinManagedMediaPath(args.audio_path))
        throw new Error("音频路径必须位于 CCM 管理目录内");
    if (args.save_dir !== undefined)
        args.save_dir = managedMediaDir(String(args.save_dir));
    if (name === "get_login_qrcode")
        return await douyinMcpGetLoginQrcode();
    if (name === "logout")
        return await revokeDouyinMcpLogin();
    if (options.signal?.aborted)
        throw new Error("抖音任务已取消");
    if (mode() === 'off')
        throw classifyMcpError('抖音 MCP 已关闭');
    if (!cookieRef() || loginVerified === false)
        throw classifyMcpError("未登录抖音，请到设置中心登录");
    const isolated = douyin_contract_1.DOUYIN_MEDIA_TOOLS.has(name);
    const timeoutMs = Math.max(1_000, Math.min(1_800_000, Number(options.timeoutMs) || (isolated ? 900_000 : 120_000)));
    const root = findRoot();
    if (!root)
        throw classifyMcpError('抖音 MCP sidecar 不可用');
    const c = isolated ? new mcp_client_1.McpClient("uv", ["run", "--directory", root, "main.py"], sidecarEnv(options.outputSubdir), 120_000) : await ensureClient();
    if (!c || mode() === "off")
        throw classifyMcpError("抖音 MCP sidecar 不可用");
    if (isolated)
        mediaClients.add(c);
    const abort = () => { if (isolated)
        void c.disconnectTree(); };
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
        if (options.signal?.aborted)
            throw new Error("抖音任务已取消");
        if (isolated && !(await c.connect()))
            throw classifyMcpError("抖音媒体进程启动失败");
        if (options.signal?.aborted)
            throw new Error("抖音任务已取消");
        const result = (0, douyin_contract_1.unwrapDouyinResult)(await c.callTool(name, args, timeoutMs));
        if (options.signal?.aborted)
            throw new Error("抖音任务已取消");
        if (name === "check_login_status")
            loginVerified = result.logged_in === true;
        return result;
    }
    catch (error) {
        if (error.douyinState === "login_required")
            loginVerified = false;
        lastError = clean(error.message);
        throw error;
    }
    finally {
        options.signal?.removeEventListener("abort", abort);
        if (isolated) {
            await c.disconnectTree();
            mediaClients.delete(c);
        }
    }
}
async function douyinMcpCapabilities() {
    // Capability display must not start uv, a login process or a remote request.
    const probe = inspect();
    const registered = new Set((await client?.listTools() || []).map(item => item.name));
    const python = path.join(probe.root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const hasOcr = fs.existsSync(python) && hasCommand(python, ["-c", "import rapidocr_onnxruntime"]);
    const provider = String(process.env.ASR_PROVIDER || "siliconflow");
    const asr = effectiveAsrEnv();
    const hasAsr = asr.provider === "volcengine"
        ? !!((process.env.VOLCENGINE_APP_ID || process.env.VOLCENGINE_API_KEY) && (process.env.VOLCENGINE_ACCESS_TOKEN || process.env.VOLCENGINE_API_KEY || asr.key))
        : asr.provider === "siliconflow" ? !!(process.env.SILICONFLOW_API_KEY || asr.key)
            : asr.provider === "openai" ? !!(process.env.OPENAI_API_KEY || asr.key)
                : asr.provider === "custom" && !!(asr.key && asr.apiUrl);
    return Object.keys(MCP_TOOL_DESCRIPTIONS).map(name => {
        const needsOcr = name === "ocr_aweme_images";
        const needsAsr = name === "transcribe_video" || name === "transcribe_audio" || name === "batch_transcribe";
        const reason = mode() === "off" ? "抖音 MCP 已关闭"
            : !probe.root || !probe.uv || !probe.files ? "缺少 MCP 运行依赖"
                : needsAsr && !hasAsr ? "未配置 ASR 服务，请在音乐设置中填写服务商和密钥后重启服务"
                    : needsOcr && (!hasOcr || (process.env.OCR_PROVIDER || "rapidocr") !== "rapidocr") ? "未安装 OCR 可选依赖：uv sync --extra ocr"
                        : registered.size && !registered.has(name) ? "当前 MCP 未提供该工具"
                            : !["get_login_qrcode", "check_login_status", "logout"].includes(name) && (!cookieRef() || loginVerified === false) ? "请先登录抖音"
                                : "";
        return { name, available: !reason, reason, ...MCP_TOOL_DESCRIPTIONS[name] };
    });
}
const detailCache = new Map();
async function douyinMcpGetVideoDetail(awemeId) {
    const id = String(awemeId).trim();
    (0, douyin_contract_1.validateDouyinArgs)('get_video_detail', { aweme_id: id });
    const key = `${authGeneration}:${cookieRef()}:${id}`;
    const cached = detailCache.get(key);
    if (mode() !== 'off' && loginVerified !== false && cached?.expires > Date.now())
        return cached.value;
    const value = await callDouyinMcpTool("get_video_detail", { aweme_id: id });
    if (detailCache.size >= 100)
        detailCache.delete(detailCache.keys().next().value);
    detailCache.set(key, { expires: Date.now() + 60_000, value });
    return value;
}
async function douyinMcpGetVideoComments(awemeId, cursor = 0, count = 20, sourceKeyword = "") {
    return callDouyinMcpTool("get_video_comments", { aweme_id: String(awemeId).trim(), cursor: Math.max(0, Number(cursor) || 0), count: Math.max(1, Math.min(50, Number(count) || 20)), source_keyword: clean(sourceKeyword, 120) });
}
async function douyinMcpGetVideoLiveComments(awemeId, sinceTime = 0, count = 20, sourceKeyword = "") {
    return callDouyinMcpTool("get_video_live_comments", { aweme_id: String(awemeId).trim(), since_time: Math.max(0, Math.min(4_000_000_000, Number(sinceTime) || 0)), count: Math.max(1, Math.min(50, Number(count) || 20)), source_keyword: clean(sourceKeyword, 120) });
}
async function douyinMcpGetSubComments(commentId, cursor = 0, count = 20, sourceKeyword = "") {
    return callDouyinMcpTool("get_sub_comments", { comment_id: String(commentId).trim(), cursor: Math.max(0, Number(cursor) || 0), count: Math.max(1, Math.min(50, Number(count) || 20)), source_keyword: clean(sourceKeyword, 120) });
}
async function douyinMcpGetUserInfo(secUserId) {
    return callDouyinMcpTool("get_user_info", { sec_user_id: String(secUserId).trim() });
}
async function douyinMcpGetUserPosts(secUserId, maxCursor = "0", count = 18) {
    return callDouyinMcpTool("get_user_posts", { sec_user_id: String(secUserId).trim(), max_cursor: String(maxCursor || "0"), count: Math.max(1, Math.min(50, Number(count) || 18)) });
}
async function douyinMcpGetHomefeed(tag = "all", count = 20, refreshIndex = 0) {
    return callDouyinMcpTool("get_homefeed", { tag: clean(tag, 40) || "all", count: Math.max(1, Math.min(50, Number(count) || 20)), refresh_index: Math.max(0, Number(refreshIndex) || 0) });
}
async function douyinMcpGetLoginQrcode() {
    // Route through the single managed session; never launch an orphan terminal login.
    return { ...startDouyinMcpLogin(), mode: 'managed_browser', launched: true };
}
const DOUYIN_SHARE_HOSTS = new Set(["v.douyin.com", "www.douyin.com", "douyin.com", "m.douyin.com", "www.iesdouyin.com"]);
const DOUYIN_SHARE_URL_RE = /(?:(?:https?:\/\/)?(?:(?:v|www|m)\.douyin\.com|(?:www\.)?iesdouyin\.com)\/[^\s<>\[\]"']+)/i;
const DOUYIN_SHARE_ID_RE = /(?:\/video\/|\/note\/|[?&]aweme_id=)(\d{10,24})/i;
function extractPublicDouyinShare(value) {
    const original = String(value || "").trim();
    const match = original.match(DOUYIN_SHARE_URL_RE);
    const candidate = (match?.[0] || original).replace(/[。，！？；：、,.!?;:)】】}>》〉]+$/g, "");
    const normalized = candidate && !/^https?:\/\//i.test(candidate) ? `https://${candidate}` : candidate;
    const id = normalized.match(DOUYIN_SHARE_ID_RE)?.[1] || (/^\d{10,24}$/.test(normalized) ? normalized : "");
    return { original, normalized, id };
}
function validatePublicDouyinUrl(value) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error("抖音分享地址无效");
    }
    if (parsed.protocol !== "https:" || !DOUYIN_SHARE_HOSTS.has(parsed.hostname) || parsed.port || parsed.username || parsed.password)
        throw new Error("分享链接重定向到不允许的地址");
    return parsed;
}
async function resolvePublicDouyinShare(value) {
    const input = extractPublicDouyinShare(value);
    if (!input.normalized)
        throw new Error("未找到抖音分享链接");
    if (input.id)
        return input.id;
    let current = input.normalized;
    for (let attempt = 0; attempt < 6; attempt += 1) {
        validatePublicDouyinUrl(current);
        const response = await fetch(current, { redirect: "manual", headers: { "user-agent": "CCM/4.1 (+music-share-resolver)" } });
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location)
                throw new Error("抖音分享链接缺少重定向地址");
            current = new URL(location, current).toString();
            continue;
        }
        if (!response.ok)
            throw new Error(`抖音分享链接请求失败（HTTP ${response.status}）`);
        const id = current.match(DOUYIN_SHARE_ID_RE)?.[1] || "";
        if (id)
            return id;
        break;
    }
    throw new Error("无法从抖音分享地址解析视频 ID");
}
async function douyinMcpResolveShareUrl(shareUrl) {
    const value = String(shareUrl || "").trim();
    let awemeId = "";
    try {
        awemeId = await resolvePublicDouyinShare(value);
    }
    catch (error) {
        // A logged-in MCP can still handle provider-specific redirects that the
        // public resolver cannot inspect, while unauthenticated callers keep the
        // safe public error instead of silently treating the link as a keyword.
        if (cookieRef() && loginVerified !== false)
            return callDouyinMcpTool("resolve_share_url", { share_url: value.slice(0, 2_000) });
        throw error;
    }
    if (cookieRef() && loginVerified !== false) {
        try {
            return await callDouyinMcpTool("resolve_share_url", { share_url: value.slice(0, 2_000) });
        }
        catch { /* public identity is still enough to render a playable result */ }
    }
    // Resolving the public identity does not require a login. Details and media
    // operations remain behind the existing MCP authentication/risk controls.
    return { success: true, aweme_id: awemeId, video: { aweme_id: awemeId, desc: `抖音视频 ${awemeId}`, share_url: value.slice(0, 2_000) } };
}
async function douyinMcpDownloadVideo(awemeId, subdir = "videos", options = {}) {
    const directory = managedMediaDir(subdir);
    try {
        return await callDouyinMcpTool("download_video", { aweme_id: String(awemeId).trim(), save_dir: directory }, options);
    }
    catch (error) {
        // An interrupted Windows Python process cannot run its finally block.
        // Only delete the isolated UUID staging directory created for this request.
        if (/^staging\/[a-f\d-]{36}$/.test(subdir) && isDouyinManagedMediaPath(directory)) {
            try {
                fs.rmSync(directory, { recursive: true, force: true });
            }
            catch { }
        }
        throw error;
    }
}
function isDouyinManagedMediaPath(value) {
    const target = path.resolve(String(value || ""));
    const root = path.resolve(mediaRoot);
    if (!value || target === root || !target.startsWith(`${root}${path.sep}`))
        return false;
    let current = target;
    while (current !== path.dirname(current)) {
        if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
            return false;
        current = path.dirname(current);
    }
    return true;
}
async function douyinMcpDownloadImages(awemeId, subdir = "images") {
    return callDouyinMcpTool("download_aweme_images", { aweme_id: String(awemeId).trim(), save_dir: managedMediaDir(subdir) });
}
async function douyinMcpOcrImages(awemeId, subdir = "images") {
    return callDouyinMcpTool("ocr_aweme_images", { aweme_id: String(awemeId).trim(), save_dir: managedMediaDir(subdir) });
}
async function douyinMcpTranscribeVideo(awemeId) {
    return callDouyinMcpTool("transcribe_video", { aweme_id: String(awemeId).trim() });
}
async function douyinMcpBatchTranscribe(keyword, count = 3, sortType = 1) {
    return callDouyinMcpTool("batch_transcribe", { keyword: clean(keyword, 120), count: Math.max(1, Math.min(5, Number(count) || 3)), sort_type: [0, 1, 2].includes(Number(sortType)) ? Number(sortType) : 1 });
}
function collectObjects(value, out = [], depth = 0) {
    if (!value || depth > 8 || out.length >= 100)
        return out;
    if (Array.isArray(value)) {
        for (const item of value.slice(0, 100))
            collectObjects(item, out, depth + 1);
        return out;
    }
    if (typeof value !== "object")
        return out;
    // 只读取视频列表的已知容器，不将配乐/广告/统计中的 item_id 当成视频。
    const id = value.aweme_id || value.awemeId || value.item_id || value.video_id;
    if (id && (value.desc || value.title || value.video?.duration || value.video?.play_addr || value.video_duration)) {
        out.push(value);
        return out;
    }
    for (const key of ['data', 'aweme_list', 'aweme_detail', 'aweme_info', 'video', 'videos', 'items', 'results']) {
        collectObjects(value[key], out, depth + 1);
    }
    return out;
}
function duration(value) {
    const n = Number(value || 0);
    if (!n)
        return undefined;
    const seconds = n > 10_000 ? Math.round(n / 1_000) : Math.round(n);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function normalize(item) {
    const id = String(item?.aweme_id || item?.awemeId || item?.item_id || item?.video_id || item?.aweme_info?.aweme_id || "").trim();
    if (!/^\d{10,24}$/.test(id))
        return null;
    const aweme = item?.aweme_info || item;
    const authorInfo = (typeof aweme?.author === 'object' ? aweme.author : item?.author) || {};
    const title = clean(item?.title || item?.desc || aweme?.desc || id, 240);
    const author = clean(authorInfo?.nickname || item?.nickname || (typeof item?.author === 'string' ? item.author : '') || "抖音作者", 120);
    const pic = String(item?.cover || item?.cover_url || item?.video?.cover?.url_list?.[0] || item?.video?.origin_cover?.url_list?.[0] || aweme?.video?.cover?.url_list?.[0] || aweme?.image_list?.[0]?.url_list?.[0] || "").slice(0, 2_000);
    const milliseconds = Number(item?.video_duration ?? item?.video?.duration ?? aweme?.video?.duration ?? 0);
    const seconds = milliseconds ? Math.round(milliseconds / 1000) : Number(item?.duration || 0);
    return { awemeId: id, title, author, duration: seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : undefined, pic,
        musicId: clean(item?.music?.id || item?.music_id || aweme?.music?.id, 40), musicTitle: clean(item?.music?.title || item?.music_title || aweme?.music?.title, 200), musicAuthor: clean(item?.music?.author || item?.music_author || aweme?.music?.author, 120),
        secUserId: clean(authorInfo?.sec_uid || item?.sec_uid || aweme?.sec_uid, 200),
        play: Number(item?.statistics?.play_count || item?.digg_count || 0), shareUrl: `https://www.douyin.com/video/${id}`, searchChannel: "mcp", downloadable: true };
}
function normalizeDouyinRows(value) {
    const rows = collectObjects(value).map(normalize).filter(Boolean);
    return [...new Map(rows.map(row => [row.awemeId, row])).values()];
}
async function ensureClient() {
    const probe = inspect();
    if (!probe.root || !probe.uv || !probe.files || !cookieRef() || mode() === "off")
        return null;
    const revision = ['src/server.py', 'src/client.py', 'src/models.py', 'src/media_paths.py', 'src/video/audio.py', 'src/errors.py'].map(file => { try {
        const stat = fs.statSync(path.join(probe.root, file));
        return `${stat.mtimeMs}:${stat.size}`;
    }
    catch {
        return '';
    } }).join('|');
    if (client?.isConnected() && clientRoot === probe.root && clientRevision === revision)
        return client;
    if (connectPromise)
        return connectPromise;
    connectPromise = (async () => {
        if (client)
            await client.disconnectTree();
        client = null;
        const next = new mcp_client_1.McpClient("uv", ["run", "--directory", probe.root, "main.py"], sidecarEnv(), 120_000);
        if (!(await next.connect())) {
            lastError = clean(next.getDiagnostics().lastError || "douyin-mcp 连接失败");
            next.disconnect();
            return null;
        }
        client = next;
        clientRoot = probe.root;
        clientRevision = revision;
        lastError = "";
        return next;
    })().finally(() => { connectPromise = null; });
    return connectPromise;
}
function douyinMcpStatus() {
    const probe = inspect();
    return {
        enabled: mode() !== "off",
        mode: mode(),
        root: probe.root || null,
        commit: "ab9eb3b36cd47e9091e520f9a5faabf72f1f16e4",
        dependencies: { uv: probe.uv, python: probe.python, files: probe.files, playwright: probe.playwright },
        connected: !!client?.isConnected(),
        authenticated: !!cookieRef() && loginVerified !== false,
        verified: loginVerified === true,
        loginState: login?.state || (cookieRef() ? "authenticated" : "idle"),
        loginStartedAt: login?.startedAt || null,
        error: clean(login?.error || lastError, 300) || null,
        installHint: !probe.uv ? "安装 uv 后运行：uv sync --directory integrations/douyin-mcp" : !probe.files ? "sidecar 文件不完整，请重新安装 CCM" : null,
    };
}
async function douyinMcpCheckLogin() {
    if (!cookieRef())
        return false;
    try {
        const result = await callDouyinMcpTool("check_login_status", {});
        return result?.logged_in === true;
    }
    catch (error) {
        if (error.douyinState === 'login_required')
            return false;
        throw error;
    }
}
const searchCache = new Map();
const searchPending = new Map();
async function douyinMcpSearchPage(keyword, options = {}) {
    const args = (0, douyin_contract_1.validateDouyinArgs)('search_videos', {
        keyword: clean(keyword, 120), offset: options.offset ?? 0, count: options.count ?? 12,
        search_channel: options.searchChannel || 'video', sort_type: options.sortType ?? 0, publish_time: options.publishTime ?? 0,
    });
    const key = JSON.stringify([authGeneration, cookieRef(), args]);
    const cached = searchCache.get(key);
    if (mode() !== 'off' && loginVerified !== false && cached?.expires > Date.now())
        return cached.value;
    if (searchPending.has(key))
        return searchPending.get(key);
    const pending = (async () => {
        const raw = await callDouyinMcpTool('search_videos', args);
        const value = {
            items: normalizeDouyinRows(raw).slice(0, args.count),
            nextCursor: raw.cursor ?? raw.offset ?? null,
            hasMore: raw.has_more === true || Number(raw.has_more) === 1,
        };
        if (searchCache.size >= 60)
            searchCache.delete(searchCache.keys().next().value);
        searchCache.set(key, { expires: Date.now() + 30_000, value });
        return value;
    })().finally(() => searchPending.delete(key));
    searchPending.set(key, pending);
    return pending;
}
async function douyinMcpSearch(keyword, limit = 12, options = {}) {
    return (await douyinMcpSearchPage(keyword, { ...options, count: options.count ?? limit })).items;
}
function saveLoginCookie(raw) {
    if (!/(?:^|;\s*)sessionid(?:_ss)?=[^;\s]+/.test(raw.trim()))
        throw new Error('登录程序未返回有效会话，请重新扫码');
    const config = (0, db_1.loadMusicConfig)();
    const old = config.douyin?.[COOKIE_REF_FIELD];
    // Protect first: a failed write must not delete the previous credential.
    const ref = (0, credential_store_1.protectCredential)('music-douyin', 'mcp-cookie', raw);
    config.douyin = { ...(config.douyin || {}), [COOKIE_REF_FIELD]: ref };
    (0, db_1.saveMusicConfig)(config);
    if (old && old !== ref)
        (0, credential_store_1.deleteCredential)(old);
    try {
        fs.unlinkSync(loginCookieFile);
    }
    catch { }
}
function terminateLogin() {
    const current = login;
    login = null;
    if (!current)
        return;
    if (current.timer)
        clearInterval(current.timer);
    if (current.timeout)
        clearTimeout(current.timeout);
    if (current.process)
        loginStopping = (0, managed_process_tree_1.terminateManagedProcessTree)(current.process, { gracefulTimeoutMs: 500 }).finally(() => { loginStopping = null; });
}
function finishLogin(state, error = "") {
    if (!login)
        return;
    if (login.timer)
        clearInterval(login.timer);
    if (login.timeout)
        clearTimeout(login.timeout);
    login.state = state;
    loginVerified = state === 'authenticated' ? null : loginVerified;
    if (state === 'authenticated') {
        authGeneration++;
        materializeCookie();
        detailCache.clear();
        searchCache.clear();
        searchPending.clear();
    }
    login.error = error ? clean(error, 300) : undefined;
    if (login.process)
        loginStopping = (0, managed_process_tree_1.terminateManagedProcessTree)(login.process, { gracefulTimeoutMs: 500 }).finally(() => { loginStopping = null; });
    login.process = null;
}
function startDouyinMcpLogin() {
    if (mode() === "off")
        throw new Error("抖音 MCP 已关闭");
    if (loginStopping)
        throw new Error('上一登录窗口正在关闭，请稍后重试');
    const probe = inspect();
    if (!probe.root || !probe.uv || !probe.files)
        throw new Error("抖音 MCP 登录不可用，请先安装 uv 和 sidecar 依赖");
    if (login?.state === "waiting")
        return douyinMcpStatus();
    terminateLogin();
    lastError = "";
    fs.mkdirSync(runtimeRoot, { recursive: true });
    try {
        fs.unlinkSync(loginCookieFile);
    }
    catch { }
    const child = (0, child_process_1.spawn)("uv", ["run", "--directory", probe.root, "login.py"], {
        env: {
            ...process.env,
            DOUYIN_COOKIE_PATH: loginCookieFile,
            // Python inherits the Windows console code page when uv is launched by
            // the CCM service. Force UTF-8 so login.py's Chinese diagnostics cannot
            // crash before the browser is opened.
            PYTHONUTF8: "1",
            PYTHONIOENCODING: "utf-8",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });
    login = { process: child, startedAt: new Date().toISOString(), state: "waiting" };
    child.stdout?.on("data", () => { });
    child.stderr?.on("data", data => { lastError = clean(data.toString(), 300); });
    child.on("error", error => finishLogin("failed", error?.message || "无法启动抖音 MCP 登录"));
    child.on("exit", code => {
        if (login?.process !== child)
            return;
        if (fs.existsSync(loginCookieFile)) {
            try {
                const raw = fs.readFileSync(loginCookieFile, "utf8");
                saveLoginCookie(raw);
                finishLogin("authenticated");
            }
            catch (error) {
                finishLogin("failed", error?.message || "Cookie 保存失败");
            }
        }
        else {
            // A clean exit without a Cookie means the window was closed or the
            // login script could not complete. Never leave the UI stuck at waiting.
            finishLogin("failed", lastError || (code === 0 ? "登录窗口已关闭，尚未完成抖音登录" : "抖音 MCP 登录失败"));
        }
    });
    login.timer = setInterval(() => {
        if (login?.process !== child || login.state !== 'waiting' || !fs.existsSync(loginCookieFile))
            return;
        try {
            const raw = fs.readFileSync(loginCookieFile, 'utf8');
            // The writer may not yet have finished the file; incomplete data is not a login.
            if (!/(?:^|;\s*)sessionid(?:_ss)?=[^;\s]+/.test(raw.trim()))
                return;
            saveLoginCookie(raw);
            finishLogin('authenticated');
        }
        catch (error) {
            finishLogin('failed', error?.message || 'Cookie 保存失败');
        }
    }, 1_000);
    login.timer.unref?.();
    login.timeout = setTimeout(() => { if (login?.process === child && login.state === "waiting") {
        finishLogin("failed", "抖音 MCP 登录等待超时");
    } }, 10 * 60_000);
    login.timeout.unref?.();
    return douyinMcpStatus();
}
async function revokeDouyinMcpLogin() {
    authGeneration++;
    searchPending.clear();
    terminateLogin();
    if (loginStopping)
        await loginStopping;
    await Promise.all([...mediaClients].map(c => c.disconnectTree()));
    mediaClients.clear();
    loginVerified = null;
    if (client) {
        await client.disconnectTree();
        client = null;
    }
    const config = (0, db_1.loadMusicConfig)();
    const ref = config.douyin?.[COOKIE_REF_FIELD];
    if (ref)
        (0, credential_store_1.deleteCredential)(ref);
    config.douyin = { ...(config.douyin || {}), [COOKIE_REF_FIELD]: "" };
    (0, db_1.saveMusicConfig)(config);
    try {
        fs.unlinkSync(cookieFile);
    }
    catch { }
    try {
        fs.unlinkSync(loginCookieFile);
    }
    catch { }
    lastError = '';
    detailCache.clear();
    searchCache.clear();
    return douyinMcpStatus();
}
function runDouyinMcpBridgeSelfTest() {
    const root = findRoot();
    return { ok: true, rootFound: !!root, mode: mode(), status: douyinMcpStatus(), checksum: crypto.createHash("sha256").update("douyin-mcp").digest("hex").slice(0, 12) };
}
/** Release sidecars without logging out or changing encrypted credentials. */
async function closeDouyinMcpRuntime() {
    await Promise.all([...mediaClients].map(c => c.disconnectTree()));
    mediaClients.clear();
    if (client) {
        await client.disconnectTree();
        client = null;
    }
}
//# sourceMappingURL=douyin-mcp-bridge.js.map