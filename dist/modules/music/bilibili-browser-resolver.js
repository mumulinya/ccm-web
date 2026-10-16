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
exports.resolveBiliPlaybackStreamsWithBrowser = resolveBiliPlaybackStreamsWithBrowser;
exports.selectBiliBrowserMedia = selectBiliBrowserMedia;
const fs = __importStar(require("fs"));
const playwright_1 = require("playwright");
const bilibili_1 = require("./bilibili");
const MEDIA_HOSTS = ["bilivideo.com", "bilivideo.cn", "akamaized.net"];
function isMediaUrl(value) {
    if (typeof value !== "string" || !/^https?:\/\//i.test(value))
        return false;
    try {
        const url = new URL(value);
        return !url.username && !url.password && !url.port && MEDIA_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    }
    catch {
        return false;
    }
}
function executablePath() {
    const candidates = [
        String(process.env.CCM_BROWSER_PATH || "").trim(),
        playwright_1.chromium.executablePath(),
        process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : "",
        process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : "",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
    ].filter(Boolean);
    return candidates.find((value) => fs.existsSync(value)) || "";
}
async function getBrowser() {
    const path = executablePath();
    if (!path)
        throw new Error("未找到可用于 B 站播放解析的 Chromium/Chrome");
    return playwright_1.chromium.launch({
        headless: true,
        executablePath: path,
        args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
    });
}
function splitCookieHeader(raw) {
    return raw.split(";").map((part) => part.trim()).map((part) => {
        const index = part.indexOf("=");
        if (index <= 0)
            return null;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        return name && value ? { name, value, domain: ".bilibili.com", path: "/" } : null;
    }).filter(Boolean);
}
/**
 * Bilibili currently returns HTTP 412 to server-side view/playurl calls while
 * its normal web player still receives signed DASH URLs. Resolve that same
 * public page in a local Chromium instance and only return signed media URLs.
 */
async function resolveBiliPlaybackStreamsWithBrowser(bvid) {
    const browser = await getBrowser();
    const context = await browser.newContext({ userAgent: bilibili_1.BILI_UA, viewport: { width: 1280, height: 800 } });
    const cookies = splitCookieHeader((0, bilibili_1.getBiliCookieHeader)());
    if (cookies.length)
        await context.addCookies(cookies);
    const page = await context.newPage();
    const captured = new Set();
    const capture = (url) => {
        if (!isMediaUrl(url) || !/\.m4s(?:\?|$)/i.test(url))
            return;
        captured.add(url);
    };
    page.on("request", (request) => capture(request.url()));
    try {
        await page.goto(`https://www.bilibili.com/video/${encodeURIComponent(bvid)}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.evaluate(() => {
            const video = globalThis.document.querySelector("video");
            if (video) {
                video.muted = true;
                void video.play().catch(() => undefined);
            }
        }).catch(() => undefined);
        await page.waitForTimeout(8_000);
        const resourceUrls = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
        resourceUrls.forEach(capture);
    }
    finally {
        await page.close().catch(() => undefined);
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
    }
    const urls = [...captured];
    const { audioUrl, videoUrl } = selectBiliBrowserMedia(urls);
    if (!videoUrl)
        throw new Error("B 站网页播放器未返回可用的视频流");
    const durationSeconds = await getDurationFromPage(bvid).catch(() => 0);
    return { audioUrl, videoUrl, durationSeconds, resolver: "browser" };
}
async function getDurationFromPage(_bvid) {
    // The duration is optional for playback and is intentionally not fetched in
    // a second page. FFmpeg/browser playback derives it from the media itself.
    return 0;
}
function isAudioSegment(url) {
    // Bilibili DASH audio format ids are 302xx; 100xxx and the remaining ids
    // are video representations (AVC/HEVC/AV1, depending on the account).
    return /-\d+-302\d+\.m4s(?:\?|$)/i.test(new URL(url).pathname);
}
function selectBiliBrowserMedia(urls) {
    const valid = urls.filter(isMediaUrl).filter((url) => /\.m4s(?:\?|$)/i.test(url));
    const audioUrl = valid.find(isAudioSegment);
    const videoUrl = valid.find((url) => url !== audioUrl && !isAudioSegment(url));
    return { audioUrl: audioUrl || "", videoUrl: videoUrl || "" };
}
//# sourceMappingURL=bilibili-browser-resolver.js.map