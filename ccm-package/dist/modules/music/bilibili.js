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
exports.BILI_UA = void 0;
exports.ensureBuvid3 = ensureBuvid3;
exports.ensureWbiKey = ensureWbiKey;
exports.signBiliParams = signBiliParams;
exports.biliSearch = biliSearch;
exports.getBiliAudioUrl = getBiliAudioUrl;
exports.getBiliCookieHeader = getBiliCookieHeader;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
// B站相关常量与模块级变量
exports.BILI_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
let wbiMixinKey = "";
let wbiCacheTime = 0;
let buvid3 = "";
const WBI_MIXIN_TABLE = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
];
function getMixinKey(orig) {
    return WBI_MIXIN_TABLE.map(n => orig[n]).join("").substring(0, 32);
}
async function ensureBuvid3() {
    if (buvid3)
        return buvid3;
    try {
        const res = await fetch("https://www.bilibili.com", {
            method: "GET",
            headers: { "User-Agent": exports.BILI_UA },
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
            headers: { "User-Agent": exports.BILI_UA, "Referer": "https://www.bilibili.com", "Cookie": `buvid3=${buvid3}` }
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
                    "User-Agent": exports.BILI_UA,
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
async function getBiliAudioUrl(bvid) {
    await ensureBuvid3();
    await ensureWbiKey();
    const params = { bvid };
    const signedQs = signBiliParams(params);
    const viewUrl = `https://api.bilibili.com/x/web-interface/view?${signedQs}`;
    const viewRes = await fetch(viewUrl, {
        headers: {
            "User-Agent": exports.BILI_UA,
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
            "User-Agent": exports.BILI_UA,
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
function getBiliCookieHeader() {
    return `buvid3=${buvid3}`;
}
//# sourceMappingURL=bilibili.js.map