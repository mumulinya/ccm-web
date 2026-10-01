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
exports.cachedNeteaseMv = cachedNeteaseMv;
exports.rememberNeteaseMv = rememberNeteaseMv;
exports.neteaseJson = neteaseJson;
exports.resolveNeteaseMv = resolveNeteaseMv;
exports.neteaseVideoIdentity = neteaseVideoIdentity;
exports.getNeteaseMvInput = getNeteaseMvInput;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const platform_http_1 = require("./platform-http");
// Song and MV identities must never share the same cache key.
const file = path.join(utils_1.CCM_DIR, 'music-netease-mv-links.json');
let links;
function all() {
    if (!links) {
        try {
            links = JSON.parse(fs.readFileSync(file, 'utf8'));
        }
        catch {
            links = {};
        }
    }
    return links;
}
function cachedNeteaseMv(songId) { return all()[songId]?.mvId || null; }
function rememberNeteaseMv(songId, mv) {
    if (!/^\d+$/.test(songId) || mv === undefined)
        return;
    const mvId = /^\d+$/.test(String(mv)) && Number(mv) > 0 ? String(mv) : null;
    all()[songId] = { mvId, checkedAt: Date.now() };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(links), { mode: 0o600 });
    fs.renameSync(file + '.tmp', file);
}
async function neteaseJson(url) {
    const data = await (0, platform_http_1.musicPlatformJson)({ url, headers: { Referer: 'https://music.163.com/', 'User-Agent': 'Mozilla/5.0' }, timeoutMs: 10000, maxBytes: 2 * 1024 * 1024, retries: 1 });
    if ([-460, -462].includes(data?.code))
        throw Object.assign(new Error('网易云要求人工安全验证，请在网易云完成验证后重试；已有歌曲音频可继续播放'), { category: 'risk_control' });
    if (data?.code === 301)
        throw Object.assign(new Error('网易云当前内容需要登录后访问；已有歌曲音频可继续播放'), { category: 'login_required' });
    return data;
}
async function resolveNeteaseMv(songId) {
    if (!/^\d{1,20}$/.test(songId))
        throw new Error('无效网易云歌曲 ID');
    const existing = all()[songId];
    if (existing && Date.now() - existing.checkedAt < 3600_000)
        return existing.mvId;
    const data = await neteaseJson(`https://music.163.com/api/song/detail?ids=${encodeURIComponent(JSON.stringify([songId]))}`);
    const song = data?.songs?.find((s) => String(s.id) === songId);
    if (!song)
        throw new Error('歌曲不可访问，暂时无法确认关联 MV');
    rememberNeteaseMv(songId, song.mvid ?? song.mv ?? 0);
    return cachedNeteaseMv(songId);
}
function neteaseVideoIdentity(songId) {
    const mvId = cachedNeteaseMv(songId);
    if (!mvId)
        throw Object.assign(new Error('此歌曲暂无关联 MV'), { category: 'unsupported_stream' });
    return `mv:${mvId}`;
}
async function getNeteaseMvInput(identity) {
    if (!/^mv:\d{1,20}$/.test(identity))
        throw new Error('无效 MV 身份');
    const data = await neteaseJson(`https://music.163.com/api/mv/detail?id=${identity.slice(3)}&type=mp4`);
    const detail = data?.data;
    const urls = detail?.brs || {};
    const raw = Object.keys(urls).sort((a, b) => Number(b) - Number(a)).map(k => urls[k]).find(Boolean);
    if (!raw)
        throw Object.assign(new Error('MV 已下架或当前地区、账号无权访问'), { category: 'unsupported_stream' });
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:' || url.username || url.password || url.port || !['music.126.net', 'music.163.com', 'vod.126.net'].some(d => url.hostname === d || url.hostname.endsWith('.' + d)))
        throw new Error('MV 返回了不支持的媒体地址');
    return { input: url.href, headers: { Referer: 'https://music.163.com/' }, duration: Number(detail.duration || 0) / 1000 };
}
//# sourceMappingURL=netease-mv.js.map