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
exports.updateDouyinSettings = updateDouyinSettings;
exports.douyinVideoUrl = douyinVideoUrl;
exports.startDouyinBrowserLogin = startDouyinBrowserLogin;
exports.revokeDouyinBrowserLogin = revokeDouyinBrowserLogin;
exports.douyinSearch = douyinSearch;
exports.prepareDouyinMediaRuntime = prepareDouyinMediaRuntime;
exports.resolveDouyinMediaInput = resolveDouyinMediaInput;
exports.douyinPlatformStatus = douyinPlatformStatus;
exports.runDouyinMusicSelfTest = runDouyinMusicSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const credential_store_1 = require("../../core/credential-store");
const utils_1 = require("../../core/utils");
const managed_process_tree_1 = require("../../system/managed-process-tree");
const platform_http_1 = require("./platform-http");
const DOUYIN_HOME = "https://www.douyin.com/";
const DOUYIN_SEARCH_API = "https://open.douyin.com/dy_open_api/v2/search/video/";
const DOUYIN_TOKEN_API = "https://open.douyin.com/oauth/client_token/";
const DOUYIN_AUTH_COOKIE_NAMES = new Set(["sessionid", "sessionid_ss", "sid_guard"]);
const YTDLP_VERSION = "2026.06.09";
const YTDLP_ROOT = path.join(utils_1.CCM_DIR, "resources", "yt-dlp", YTDLP_VERSION);
const YTDLP_RELEASE = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}`;
const YTDLP_ASSETS = {
    "win32-x64": { name: "yt-dlp.exe", checksum: "3a48cb955d55c8821b60ccbdbbc6f61bc958f2f3d3b7ad5eaf3d83a543293a27" },
    "win32-arm64": { name: "yt-dlp_arm64.exe", checksum: "847583f91bb6d26479c1dc9643c2f4b8857a90b40d619da97b0cfabccb9138d0" },
    "linux-x64": { name: "yt-dlp_linux", checksum: "bf8aac79b72287a6d2043074415132558b43743a8f9461a22b0141e90f16ce66" },
    "linux-arm64": { name: "yt-dlp_linux_aarch64", checksum: "cabd246445bdfde0eda0dfe68bbe90354be83f3fdbbf077df11a2ea55f41cdbd" },
    "darwin-x64": { name: "yt-dlp_macos", checksum: "b82c3626952e6c14eaf654cc565866775ffd0b9ffb7021628ac59b42c2f4f244" },
    "darwin-arm64": { name: "yt-dlp_macos", checksum: "b82c3626952e6c14eaf654cc565866775ffd0b9ffb7021628ac59b42c2f4f244" },
};
let activeBrowserLogin = null;
let browserLoginStartPromise = null;
let officialTokenCache = null;
let runtimePreparePromise = null;
let lastBrowserLoginError = "";
// 串行锁：避免统一搜索与单独抖音搜索同时启动多个 Chromium 实例
let browserSearchLock = null;
let runtimePreparation = {
    state: "idle", downloadedBytes: 0, totalBytes: 0,
    startedAt: "", updatedAt: "", error: "",
};
function cleanText(value, limit = 200) {
    return String(value || "").replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}
function settings() {
    const value = (0, db_1.loadMusicConfig)()?.douyin || {};
    return {
        compatibilityEnabled: value.compatibilityEnabled !== false,
        officialClientKey: cleanText(value.officialClientKey, 160),
        officialClientSecretRef: (0, credential_store_1.isCredentialReference)(value.officialClientSecretRef) ? value.officialClientSecretRef : "",
        browserStorageRef: (0, credential_store_1.isCredentialReference)(value.browserStorageRef) ? value.browserStorageRef : "",
        browserAuthenticatedAt: cleanText(value.browserAuthenticatedAt, 64),
    };
}
function persistSettings(update) {
    const config = (0, db_1.loadMusicConfig)();
    config.douyin = { ...(config.douyin || {}), ...update };
    (0, db_1.saveMusicConfig)(config);
    return settings();
}
function updateDouyinSettings(input) {
    const current = settings();
    const update = {};
    if (input.compatibilityEnabled !== undefined)
        update.compatibilityEnabled = input.compatibilityEnabled === true;
    if (input.officialClientKey !== undefined)
        update.officialClientKey = cleanText(input.officialClientKey, 160);
    const secret = String(input.officialClientSecret || "").trim();
    if (secret) {
        if (current.officialClientSecretRef)
            (0, credential_store_1.deleteCredential)(current.officialClientSecretRef);
        update.officialClientSecretRef = (0, credential_store_1.protectCredential)("music-douyin", "official-client-secret", secret);
    }
    if (input.clearOfficialSecret === true && current.officialClientSecretRef) {
        (0, credential_store_1.deleteCredential)(current.officialClientSecretRef);
        update.officialClientSecretRef = "";
    }
    officialTokenCache = null;
    return persistSettings(update);
}
function officialSecret(value = settings()) {
    if (!value.officialClientSecretRef)
        return "";
    try {
        return (0, credential_store_1.resolveCredential)(value.officialClientSecretRef);
    }
    catch {
        return "";
    }
}
function browserStorage(value = settings()) {
    if (!value.browserStorageRef)
        return null;
    try {
        return JSON.parse((0, credential_store_1.resolveCredential)(value.browserStorageRef));
    }
    catch {
        return null;
    }
}
function hasAuthenticatedCookie(storage) {
    return Array.isArray(storage?.cookies) && storage.cookies.some((cookie) => DOUYIN_AUTH_COOKIE_NAMES.has(String(cookie?.name || "").toLowerCase()) && String(cookie?.value || ""));
}
function canonicalAwemeId(value) {
    const id = String(value || "").trim();
    if (!/^\d{10,24}$/.test(id))
        throw new Error("抖音视频ID无效");
    return id;
}
function douyinVideoUrl(awemeId) {
    return `https://www.douyin.com/video/${canonicalAwemeId(awemeId)}`;
}
function secondsToDuration(value) {
    const raw = Number(value || 0);
    const seconds = raw > 10_000 ? Math.round(raw / 1_000) : Math.round(raw);
    if (!seconds)
        return undefined;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function normalizeOfficialResult(item) {
    const id = String(item?.item_id || item?.aweme_id || item?.video_id || "").trim();
    if (!/^\d{10,24}$/.test(id))
        return null;
    return {
        awemeId: id,
        title: cleanText(item?.title || item?.desc || id),
        author: cleanText(item?.nickname || item?.author?.nickname || "抖音作者"),
        duration: secondsToDuration(item?.duration || item?.video?.duration),
        pic: String(item?.cover || item?.video?.cover?.url_list?.[0] || "").slice(0, 2_000),
        play: Number(item?.statistics?.play_count || item?.statistics?.digg_count || 0),
        shareUrl: douyinVideoUrl(id),
        searchChannel: "official",
        downloadable: true,
    };
}
async function officialAccessToken(config) {
    const secret = officialSecret(config);
    if (!config.officialClientKey || !secret)
        throw new platform_http_1.MusicPlatformHttpError("抖音官方搜索尚未配置", "rejected");
    if (officialTokenCache && officialTokenCache.clientKey === config.officialClientKey && officialTokenCache.expiresAt > Date.now() + 60_000)
        return officialTokenCache.token;
    const body = new URLSearchParams({ client_key: config.officialClientKey, client_secret: secret, grant_type: "client_credential" }).toString();
    const payload = await (0, platform_http_1.musicPlatformJson)({
        url: DOUYIN_TOKEN_API,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        allowedHosts: ["open.douyin.com"],
        timeoutMs: 15_000,
        retries: 1,
    });
    const token = String(payload?.data?.access_token || payload?.access_token || "");
    if (!token)
        throw new platform_http_1.MusicPlatformHttpError(cleanText(payload?.message || payload?.data?.description || "抖音官方Token获取失败", 300), "rejected");
    const expires = Math.max(300, Number(payload?.data?.expires_in || payload?.expires_in || 7_200));
    officialTokenCache = { token, expiresAt: Date.now() + expires * 1_000, clientKey: config.officialClientKey };
    return token;
}
async function searchOfficial(keyword, limit) {
    const config = settings();
    const token = await officialAccessToken(config);
    const url = new URL(DOUYIN_SEARCH_API);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("count", String(Math.max(1, Math.min(20, limit))));
    url.searchParams.set("cursor", "0");
    const deviceId = crypto.randomBytes(8).readBigUInt64BE() & 0x7fffffffffffffffn;
    url.searchParams.set("device_id", deviceId.toString());
    const payload = await (0, platform_http_1.musicPlatformJson)({
        url: url.toString(),
        headers: { "access-token": token, "Content-Type": "application/json" },
        allowedHosts: ["open.douyin.com"],
        timeoutMs: 15_000,
        retries: 1,
    });
    const errorCode = Number(payload?.err_no || payload?.data?.error_code || 0);
    if (errorCode) {
        const error = new Error(cleanText(payload?.err_msg || payload?.data?.description || `抖音官方搜索失败 (${errorCode})`, 300));
        error.douyinState = [28001014, 28001018, 28001019].includes(errorCode) ? "capability_unavailable" : "unavailable";
        throw error;
    }
    const rows = payload?.data?.data?.video_list || payload?.data?.video_list || payload?.data?.list || [];
    return (Array.isArray(rows) ? rows : []).map(normalizeOfficialResult).filter(Boolean).slice(0, limit);
}
async function launchBrowser(headless) {
    const playwright = require("playwright");
    const attempts = [{}, { channel: "msedge" }, { channel: "chrome" }];
    const errors = [];
    for (const options of attempts) {
        try {
            return await playwright.chromium.launch({ headless, timeout: 15_000, ...options });
        }
        catch (error) {
            errors.push(cleanText(error?.message, 240));
        }
    }
    throw new Error(`未找到可用的Edge/Chrome浏览器：${errors.join(" | ")}`);
}
function closeActiveLogin() {
    const active = activeBrowserLogin;
    activeBrowserLogin = null;
    if (!active)
        return;
    if (active.timer)
        clearInterval(active.timer);
    if (active.timeout)
        clearTimeout(active.timeout);
    void active.browser?.close?.().catch(() => { });
}
function failActiveLogin(message) {
    const active = activeBrowserLogin;
    if (!active)
        return;
    lastBrowserLoginError = cleanText(message, 300);
    if (active.timer)
        clearInterval(active.timer);
    if (active.timeout)
        clearTimeout(active.timeout);
    active.state = "failed";
    active.error = lastBrowserLoginError;
    activeBrowserLogin = null;
    void active.browser?.close?.().catch(() => { });
}
async function startDouyinBrowserLogin() {
    const config = settings();
    if (!config.compatibilityEnabled)
        throw new Error("抖音浏览器兼容通道已关闭");
    if (activeBrowserLogin && activeBrowserLogin.state === "waiting")
        return douyinPlatformStatus();
    if (browserLoginStartPromise)
        return browserLoginStartPromise;
    browserLoginStartPromise = (async () => {
        closeActiveLogin();
        lastBrowserLoginError = "";
        const browser = await launchBrowser(false);
        try {
            const context = await browser.newContext({ locale: "zh-CN" });
            const page = await context.newPage();
            const login = { browser, context, page, startedAt: new Date().toISOString(), state: "waiting" };
            activeBrowserLogin = login;
            await page.goto(DOUYIN_HOME, { waitUntil: "domcontentloaded", timeout: 30_000 });
            const poll = async () => {
                const active = activeBrowserLogin;
                if (!active || active !== login || active.state !== "waiting")
                    return;
                try {
                    const storage = await active.context.storageState();
                    if (!hasAuthenticatedCookie(storage))
                        return;
                    const old = settings();
                    if (old.browserStorageRef)
                        (0, credential_store_1.deleteCredential)(old.browserStorageRef);
                    persistSettings({
                        browserStorageRef: (0, credential_store_1.protectCredential)("music-douyin", "browser-storage", JSON.stringify(storage)),
                        browserAuthenticatedAt: new Date().toISOString(),
                    });
                    active.state = "authenticated";
                    closeActiveLogin();
                }
                catch (error) {
                    failActiveLogin(error?.message || "抖音登录状态读取失败");
                }
            };
            login.timer = setInterval(() => void poll(), 1_500);
            login.timer.unref?.();
            login.timeout = setTimeout(() => {
                if (activeBrowserLogin === login && login.state === "waiting")
                    failActiveLogin("抖音网页登录等待超时，请重新打开登录页");
            }, 10 * 60_000);
            login.timeout.unref?.();
            void poll();
            return douyinPlatformStatus();
        }
        catch (error) {
            if (activeBrowserLogin?.browser === browser)
                activeBrowserLogin = null;
            await browser.close().catch(() => { });
            throw error;
        }
    })();
    try {
        return await browserLoginStartPromise;
    }
    finally {
        browserLoginStartPromise = null;
    }
}
function revokeDouyinBrowserLogin() {
    closeActiveLogin();
    lastBrowserLoginError = "";
    const config = settings();
    if (config.browserStorageRef)
        (0, credential_store_1.deleteCredential)(config.browserStorageRef);
    persistSettings({ browserStorageRef: "", browserAuthenticatedAt: "" });
    return douyinPlatformStatus();
}
function collectAwemeObjects(value, output, depth = 0) {
    if (!value || depth > 8 || output.length >= 50)
        return;
    if (Array.isArray(value)) {
        for (const item of value.slice(0, 100))
            collectAwemeObjects(item, output, depth + 1);
        return;
    }
    if (typeof value !== "object")
        return;
    if (value.aweme_id || value.item_id)
        output.push(value);
    for (const child of Object.values(value).slice(0, 100))
        collectAwemeObjects(child, output, depth + 1);
}
function normalizeBrowserObject(item) {
    const normalized = normalizeOfficialResult(item);
    return normalized ? { ...normalized, searchChannel: "browser" } : null;
}
async function searchBrowser(keyword, limit) {
    const storage = browserStorage();
    const browser = await launchBrowser(true);
    const context = await browser.newContext({
        ...(storage && hasAuthenticatedCookie(storage) ? { storageState: storage } : {}),
        locale: "zh-CN",
    });
    const page = await context.newPage();
    const captured = [];
    page.on("response", async (response) => {
        try {
            const url = String(response.url?.() || "");
            if (!/search|aweme|discover/i.test(url))
                return;
            if (!String(response.headers?.()["content-type"] || "").includes("json"))
                return;
            const body = await response.body();
            if (body.length > 2 * 1024 * 1024)
                return;
            collectAwemeObjects(JSON.parse(body.toString("utf8")), captured);
        }
        catch { }
    });
    try {
        await page.goto(`https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=video`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(3_000);
        const pageState = await page.evaluate(() => {
            const pageDocument = globalThis.document;
            const text = String(pageDocument?.body?.innerText || "").slice(0, 6_000);
            const links = Array.from(pageDocument?.querySelectorAll?.('a[href*="/video/"]') || []).slice(0, 50).map((anchor) => {
                const href = String(anchor.href || anchor.getAttribute("href") || "");
                const container = anchor.closest("li, article, [data-e2e], div") || anchor;
                const image = container.querySelector?.("img");
                return { href, text: String(container.innerText || anchor.innerText || "").slice(0, 500), pic: String(image?.src || "") };
            });
            return { title: String(pageDocument?.title || "").slice(0, 200), text, links };
        });
        if (/验证码|访问过于频繁|安全验证|完成验证|verify/i.test(`${pageState.title || ""} ${pageState.text || ""}`)) {
            const error = new Error("抖音触发了安全验证，请稍后重新登录或重试");
            error.douyinState = "risk_controlled";
            throw error;
        }
        if (/登录后查看|登录抖音|扫码登录/.test(pageState.text) && !captured.length && !(pageState.links || []).length) {
            const error = new Error("当前公开搜索被抖音要求登录，可登录后重试");
            error.douyinState = "login_required";
            throw error;
        }
        const map = new Map();
        for (const item of captured) {
            const row = normalizeBrowserObject(item);
            if (row)
                map.set(row.awemeId, row);
        }
        for (const link of pageState.links || []) {
            const id = String(link.href || "").match(/\/video\/(\d{10,24})/)?.[1];
            if (!id || map.has(id))
                continue;
            const lines = String(link.text || "").split(/\n+/).map(value => cleanText(value, 240)).filter(Boolean);
            map.set(id, {
                awemeId: id,
                title: lines[0] || id,
                author: lines[1] || "抖音作者",
                pic: String(link.pic || "").slice(0, 2_000),
                shareUrl: douyinVideoUrl(id),
                searchChannel: "browser",
                downloadable: true,
            });
        }
        return Array.from(map.values()).slice(0, limit);
    }
    finally {
        await browser.close().catch(() => { });
    }
}
async function douyinSearch(keyword, limit = 12) {
    const query = cleanText(keyword, 120);
    if (!query)
        return [];
    const config = settings();
    // 1. 官方接口优先
    if (config.officialClientKey && officialSecret(config)) {
        try {
            return await searchOfficial(query, limit);
        }
        catch (officialError) {
            // capability_unavailable / unavailable / timeout → 降级到浏览器；rejected 直接抛出
            const state = String(officialError?.douyinState || (officialError instanceof platform_http_1.MusicPlatformHttpError ? officialError.status : ""));
            if (state === "rejected")
                throw officialError;
            // 其余错误降级，不再暴露官方失败
        }
    }
    // 2. 浏览器兼容通道（匿名或登录增强）
    if (config.compatibilityEnabled) {
        // 串行锁：最多只允许一个并发浏览器搜索，避免多个 Chromium 实例同时启动
        if (browserSearchLock) {
            try {
                return await browserSearchLock;
            }
            catch { /* 前一次失败，重新搜索 */ }
        }
        browserSearchLock = searchBrowser(query, limit);
        try {
            return await browserSearchLock;
        }
        finally {
            browserSearchLock = null;
        }
    }
    // 3. 两个通道都不可用
    const error = new Error("抖音搜索需要配置官方能力或开启浏览器兼容通道");
    error.douyinState = "capability_unavailable";
    throw error;
}
function runtimeAsset() {
    return YTDLP_ASSETS[`${process.platform}-${process.arch}`] || null;
}
function managedRuntimePath() {
    const asset = runtimeAsset();
    return asset ? path.join(YTDLP_ROOT, asset.name) : "";
}
function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}
function existingYtDlpPath() {
    const explicit = String(process.env.CCM_YTDLP_PATH || "").trim();
    if (explicit && fs.existsSync(explicit))
        return explicit;
    const managed = managedRuntimePath();
    if (managed && fs.existsSync(managed))
        return managed;
    return "";
}
async function runManagedProcess(command, args, timeoutMs, env = process.env, signal) {
    if (signal?.aborted)
        throw new Error("抖音媒体解析已取消");
    const child = (0, child_process_1.spawn)(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout = `${stdout}${chunk}`.slice(-4 * 1024 * 1024); });
    child.stderr.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-16_000); });
    const code = await new Promise((resolve, reject) => {
        let settled = false;
        let timer;
        const finish = (callback) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            callback();
        };
        const abort = () => {
            void (0, managed_process_tree_1.terminateManagedProcessTree)(child);
            finish(() => reject(new Error("抖音媒体解析已取消")));
        };
        timer = setTimeout(() => {
            void (0, managed_process_tree_1.terminateManagedProcessTree)(child);
            finish(() => reject(new Error("抖音媒体解析超时")));
        }, timeoutMs);
        signal?.addEventListener("abort", abort, { once: true });
        child.once("error", error => finish(() => reject(error)));
        child.once("close", value => finish(() => resolve(value)));
    });
    if (code !== 0)
        throw new Error(cleanText(stderr || `yt-dlp退出码 ${code}`, 800));
    return { stdout, stderr };
}
async function prepareDouyinMediaRuntime() {
    if (runtimePreparePromise)
        return runtimePreparePromise;
    runtimePreparePromise = (async () => {
        const startedAt = new Date().toISOString();
        runtimePreparation = { state: "verifying", downloadedBytes: 0, totalBytes: 0, startedAt, updatedAt: startedAt, error: "" };
        const existing = existingYtDlpPath();
        if (existing) {
            const version = cleanText((await runManagedProcess(existing, ["--ignore-config", "--version"], 15_000)).stdout, 60);
            runtimePreparation = { ...runtimePreparation, state: "ready", updatedAt: new Date().toISOString() };
            return { ready: true, path: existing, version, managed: existing === managedRuntimePath() };
        }
        const asset = runtimeAsset();
        if (!asset)
            throw new Error(`当前平台暂不支持自动准备yt-dlp：${process.platform}-${process.arch}`);
        runtimePreparation = { ...runtimePreparation, state: "downloading", updatedAt: new Date().toISOString() };
        const response = await (0, platform_http_1.musicPlatformRequest)({
            url: `${YTDLP_RELEASE}/${asset.name}`,
            allowedHosts: ["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"],
            timeoutMs: 30_000,
            maxBytes: 64 * 1024 * 1024,
            retries: 1,
        });
        runtimePreparation = { ...runtimePreparation, state: "verifying", downloadedBytes: response.buffer.length, totalBytes: response.buffer.length, updatedAt: new Date().toISOString() };
        if (sha256(response.buffer) !== asset.checksum)
            throw new Error("yt-dlp下载校验失败，未启用该文件");
        fs.mkdirSync(YTDLP_ROOT, { recursive: true });
        const target = managedRuntimePath();
        const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(temp, response.buffer, { mode: 0o700 });
        fs.renameSync(temp, target);
        try {
            fs.chmodSync(target, 0o700);
        }
        catch { }
        const version = cleanText((await runManagedProcess(target, ["--ignore-config", "--version"], 15_000)).stdout, 60);
        runtimePreparation = { ...runtimePreparation, state: "ready", updatedAt: new Date().toISOString() };
        return { ready: true, path: target, version, managed: true };
    })().catch((error) => {
        runtimePreparation = { ...runtimePreparation, state: "failed", error: cleanText(error?.message || "抖音媒体解析器准备失败", 300), updatedAt: new Date().toISOString() };
        throw error;
    }).finally(() => { runtimePreparePromise = null; });
    return runtimePreparePromise;
}
function netscapeCookieFile(storage) {
    const cookies = Array.isArray(storage?.cookies) ? storage.cookies.filter((cookie) => String(cookie.domain || "").includes("douyin.com")) : [];
    if (!cookies.length)
        return "";
    const dir = path.join(utils_1.CCM_DIR, "private", "music-runtime");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `douyin-cookies-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.txt`);
    const rows = ["# Netscape HTTP Cookie File", ...cookies.map((cookie) => [
            cookie.domain,
            String(cookie.domain || "").startsWith(".") ? "TRUE" : "FALSE",
            cookie.path || "/",
            cookie.secure ? "TRUE" : "FALSE",
            Math.max(0, Math.floor(Number(cookie.expires || 0))),
            cookie.name,
            cookie.value,
        ].join("\t"))];
    fs.writeFileSync(file, rows.join(os.EOL), { encoding: "utf8", mode: 0o600 });
    try {
        fs.chmodSync(file, 0o600);
    }
    catch { }
    return file;
}
async function resolveDouyinMediaInput(awemeId, options = {}) {
    const id = canonicalAwemeId(awemeId);
    const runtime = await prepareDouyinMediaRuntime();
    const cookieFile = netscapeCookieFile(browserStorage());
    try {
        const args = ["--ignore-config", "--no-playlist", "--no-warnings", "--dump-single-json", "--skip-download", "--no-check-formats"];
        if (cookieFile)
            args.push("--cookies", cookieFile);
        args.push("--", douyinVideoUrl(id));
        const result = await runManagedProcess(runtime.path, args, 60_000, { ...process.env, YTDLP_NO_PLUGINS: "1" }, options.signal);
        const payload = JSON.parse(result.stdout);
        if (payload?.is_live)
            throw new Error("暂不支持将抖音直播转换为本地音乐");
        if (payload?.availability && !["public", "unlisted"].includes(String(payload.availability)))
            throw new Error("该抖音视频不是可公开访问内容");
        const formats = Array.isArray(payload?.formats) ? payload.formats : [];
        const selected = formats.filter((item) => item?.url).sort((a, b) => {
            const aAudio = a.acodec && a.acodec !== "none" ? 1 : 0;
            const bAudio = b.acodec && b.acodec !== "none" ? 1 : 0;
            return bAudio - aAudio || Number(b.abr || b.tbr || 0) - Number(a.abr || a.tbr || 0);
        })[0];
        const url = String(payload?.url || selected?.url || "");
        if (!url || !/^https?:\/\//i.test(url))
            throw new Error("抖音视频没有返回可转换的公开媒体地址");
        const rawHeaders = payload?.http_headers || selected?.http_headers || {};
        const headers = {};
        for (const key of ["User-Agent", "Referer", "Origin"]) {
            if (rawHeaders[key])
                headers[key] = cleanText(rawHeaders[key], 500);
        }
        if (!headers["User-Agent"])
            headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
        if (!headers.Referer)
            headers.Referer = douyinVideoUrl(id);
        return { url, headers, title: cleanText(payload?.title, 200), durationSeconds: Number(payload?.duration || 0), resolverVersion: runtime.version };
    }
    finally {
        if (cookieFile)
            try {
                fs.unlinkSync(cookieFile);
            }
            catch { }
    }
}
function douyinPlatformStatus() {
    const config = settings();
    const storage = browserStorage(config);
    const runtime = existingYtDlpPath();
    const authenticated = hasAuthenticatedCookie(storage);
    const officialConfigured = !!config.officialClientKey && !!officialSecret(config);
    const browserAvailable = config.compatibilityEnabled;
    const searchEnabled = officialConfigured || browserAvailable;
    const searchMode = officialConfigured && browserAvailable ? "official+browser"
        : officialConfigured ? "official"
            : browserAvailable ? "browser"
                : "disabled";
    return {
        schema: "ccm-douyin-music-status-v1",
        official: {
            configured: officialConfigured,
            clientKey: config.officialClientKey,
            secretProtected: !!config.officialClientSecretRef,
        },
        browser: {
            compatibilityEnabled: config.compatibilityEnabled,
            authenticated,
            authenticatedAt: config.browserAuthenticatedAt || null,
            loginState: activeBrowserLogin?.state || (authenticated ? "authenticated" : "idle"),
            loginStartedAt: activeBrowserLogin?.startedAt || null,
            error: activeBrowserLogin?.error || lastBrowserLoginError || null,
        },
        runtime: {
            ready: !!runtime,
            managed: !!runtime && runtime === managedRuntimePath(),
            version: YTDLP_VERSION,
            platformSupported: !!runtimeAsset() || !!runtime,
            preparation: runtimePreparation,
        },
        search: {
            enabled: searchEnabled,
            mode: searchMode,
            anonymousSupported: browserAvailable,
            authenticatedEnhancement: authenticated,
        },
    };
}
function runDouyinMusicSelfTest() {
    const row = normalizeOfficialResult({ item_id: "7471252140422401337", title: "测试歌曲", nickname: "测试作者", duration: 65_000 });
    if (!row || row.awemeId !== "7471252140422401337" || row.duration !== "1:05")
        throw new Error("抖音结果标准化失败");
    let rejected = false;
    try {
        douyinVideoUrl("https://evil.example/video/1");
    }
    catch {
        rejected = true;
    }
    if (!rejected)
        throw new Error("抖音视频ID边界未拒绝任意URL");
    return { ok: true, source: "douyin", runtimeVersion: YTDLP_VERSION };
}
//# sourceMappingURL=douyin.js.map