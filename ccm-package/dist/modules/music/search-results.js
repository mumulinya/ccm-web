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
exports.signSearchResults = signSearchResults;
exports.verifyDownloadToken = verifyDownloadToken;
exports.issueDownloadToken = issueDownloadToken;
exports.extractMusicConvertTarget = extractMusicConvertTarget;
exports.runMusicSearchResultSelfTest = runMusicSearchResultSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const SECRET_FILE = path.join(utils_1.CCM_DIR, "music-download-token-secret");
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
function loadSecret() {
    try {
        if (fs.existsSync(SECRET_FILE))
            return fs.readFileSync(SECRET_FILE);
        fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
        const secret = crypto.randomBytes(32);
        fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
        return secret;
    }
    catch {
        return Buffer.from(`${utils_1.CCM_DIR}:music-download-token`, "utf-8");
    }
}
const TOKEN_SECRET = loadSecret();
function normalized(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/<[^>]*>/g, "")
        .replace(/[\s\-_/·・()（）[\]【】'"“”‘’.,，。:：]+/g, "");
}
function scoreResult(query, result, source) {
    const q = normalized(query);
    const terms = String(query || "").split(/[\s\-_/·・]+/).map(normalized).filter(Boolean);
    const title = normalized(result.title);
    const artist = normalized(source === "netease" ? result.artist : result.author);
    const album = normalized(result.album);
    let score = 0;
    if (title === q)
        score += 120;
    else if (title.startsWith(q))
        score += 80;
    else if (title.includes(q))
        score += 55;
    if (artist === q)
        score += 70;
    else if (artist.includes(q) || q.includes(artist))
        score += 35;
    if (album && (album === q || album.includes(q)))
        score += 20;
    const titleExactTerm = terms.some(term => title === term);
    const artistExactTerm = terms.some(term => artist === term || artist.split(/[&、,，/]+/).includes(term));
    if (terms.length > 1 && titleExactTerm && artistExactTerm)
        score += 150;
    for (const term of terms) {
        if (title.includes(term))
            score += 12;
        if (artist.includes(term))
            score += 8;
    }
    const requestsVariant = /live|现场|翻唱|cover|伴奏|remix|纯音乐/i.test(query);
    if (!requestsVariant && /live|现场|翻唱|cover|伴奏|remix|纯音乐/i.test(`${result.title} ${result.album || ""}`))
        score -= 30;
    if (source === "bilibili")
        score += Math.min(15, Math.log10(Math.max(1, Number(result.play) || 1)) * 3);
    return score;
}
function tokenFor(payload) {
    const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
}
function signSearchResults(source, query, results, limit = 8) {
    return (results || [])
        .filter(result => source === "netease" ? result?.songId : result?.bvid)
        .map((result, index) => ({ result, index, score: scoreResult(query, result, source) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .slice(0, Math.max(1, Math.min(20, limit)))
        .map(({ result }) => {
        const sourceId = String(source === "netease" ? result.songId : result.bvid);
        const artist = String(source === "netease" ? result.artist || "未知艺术家" : result.author || "未知UP主");
        const payload = {
            v: 1,
            source,
            sourceId,
            title: String(result.title || sourceId).slice(0, 200),
            artist: artist.slice(0, 200),
            exp: Date.now() + TOKEN_TTL_MS,
        };
        return { ...result, type: source, downloadToken: tokenFor(payload) };
    });
}
function verifyDownloadToken(token, expectedSource) {
    const [encoded, signature, extra] = String(token || "").split(".");
    if (!encoded || !signature || extra)
        throw new Error("下载凭证无效，请重新搜索后再试");
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(encoded).digest();
    let supplied;
    try {
        supplied = Buffer.from(signature, "base64url");
    }
    catch {
        throw new Error("下载凭证无效，请重新搜索后再试");
    }
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied))
        throw new Error("下载凭证无效，请重新搜索后再试");
    let payload;
    try {
        payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    }
    catch {
        throw new Error("下载凭证内容无效");
    }
    if (payload.v !== 1 || !payload.sourceId || payload.exp < Date.now())
        throw new Error("下载凭证已过期，请重新搜索后再试");
    if (expectedSource && payload.source !== expectedSource)
        throw new Error("下载来源与凭证不匹配");
    return payload;
}
function issueDownloadToken(source, sourceId, title, artist) {
    const payload = {
        v: 1,
        source,
        sourceId: String(sourceId || "").trim(),
        title: String(title || sourceId || "music").slice(0, 200),
        artist: String(artist || "未知").slice(0, 200),
        exp: Date.now() + TOKEN_TTL_MS,
    };
    if (!payload.sourceId)
        throw new Error("缺少转码目标 ID");
    return tokenFor(payload);
}
function extractMusicConvertTarget(message, keyword = "") {
    const text = `${keyword || ""} ${message || ""}`;
    const bvid = text.match(/BV[\w]+/i)?.[0];
    if (bvid) {
        return {
            source: "bilibili",
            sourceId: bvid,
            title: bvid,
            artist: "B站转码",
        };
    }
    const songId = text.match(/(?:song\?id=|id[=：:\s#]|网易云\s*[#]?)(\d{5,})/i)?.[1] ||
        text.match(/\b(\d{6,})\b/)?.[1];
    if (songId) {
        return {
            source: "netease",
            sourceId: songId,
            title: `netease-${songId}`,
            artist: "网易云转码",
        };
    }
    return null;
}
function runMusicSearchResultSelfTest() {
    const signed = signSearchResults("netease", "晴天 周杰伦", [
        { songId: 2, title: "晴天（Live）", artist: "其他歌手", album: "现场" },
        { songId: 1, title: "晴天", artist: "周杰伦", album: "叶惠美" },
    ]);
    if (String(signed[0]?.songId) !== "1")
        throw new Error("精确搜索结果没有排在首位");
    const verified = verifyDownloadToken(signed[0].downloadToken, "netease");
    if (verified.sourceId !== "1")
        throw new Error("下载令牌未绑定真实搜索结果");
    let rejected = false;
    try {
        verifyDownloadToken(`${signed[0].downloadToken}x`, "netease");
    }
    catch {
        rejected = true;
    }
    if (!rejected)
        throw new Error("篡改后的下载令牌未被拒绝");
    return { ok: true, first: signed[0].title };
}
//# sourceMappingURL=search-results.js.map