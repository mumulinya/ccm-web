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
exports.readLocalMusicLyrics = readLocalMusicLyrics;
exports.writeLocalMusicLyrics = writeLocalMusicLyrics;
exports.sendLocalMusicCover = sendLocalMusicCover;
exports.writeLocalMusicCover = writeLocalMusicCover;
exports.streamLocalMusic = streamLocalMusic;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const music_catalog_1 = require("../music-catalog");
const workspace_catalog_1 = require("./workspace-catalog");
const video_stream_1 = require("../video-stream");
// 本地歌词、封面读取不依赖在线账号。缺失资源保持明确状态，不拼接其他歌曲的资料。
const { parseFile } = require('music-metadata');
const cache = new Map();
const MAX_LYRICS = 512 * 1024, MAX_COVER = 8 * 1024 * 1024;
function safeAudio(filename) { const safe = (0, music_catalog_1.resolveSafeMusicFile)(filename); (0, workspace_catalog_1.requireMusicFilename)(safe.filename); return safe; }
function sidecar(file, root, maxBytes) {
    if (!fs.existsSync(file))
        return null;
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes || path.dirname(fs.realpathSync(file)) !== root)
        throw new Error('附属文件超出曲库边界或大小限制');
    return fs.readFileSync(file);
}
async function metadata(safe) {
    const stamp = `${safe.stat.size}:${safe.stat.mtimeMs}`, old = cache.get(safe.filePath);
    if (old?.stamp === stamp)
        return old.value;
    const value = await parseFile(safe.filePath, { duration: false });
    if (cache.size >= 32)
        cache.delete(cache.keys().next().value);
    cache.set(safe.filePath, { stamp, value });
    return value;
}
const timestamp = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
async function readLocalMusicLyrics(filename, formatOrder = 'lrc,vtt,ttml,qrc,yrc,krc') {
    const safe = safeAudio(filename), base = safe.filePath.replace(/\.[^.]+$/, '');
    const supported = ['lrc', 'vtt', 'ttml', 'qrc', 'yrc', 'krc'];
    const formats = ['fia', ...new Set([...String(formatOrder).split(',').filter(value => supported.includes(value)), ...supported])];
    for (const format of formats) {
        const raw = sidecar(base + '.' + format, safe.root, MAX_LYRICS);
        if (!raw)
            continue;
        const translation = sidecar(base + '.t.lrc', safe.root, MAX_LYRICS);
        // 二进制 KRC 与旧编码由 Folia 的原生解码器处理；UTF-8 LRC 保留兼容响应。
        const encoded = format === 'krc' || raw.includes(0) || !require('buffer').isUtf8(raw);
        return { success: true, source: 'local-' + format, format, encoding: encoded ? 'base64' : 'utf8', lyric: encoded ? raw.toString('base64') : raw.toString('utf8').replace(/^\uFEFF/, ''), translation: translation?.toString('utf8'), status: 'ready' };
    }
    const tags = (await metadata(safe)).common?.lyrics || [];
    for (const tag of tags) {
        const synced = tag.timeStampFormat === 2 && tag.syncText?.length ? tag.syncText.filter((line) => Number.isFinite(line.timestamp) && line.timestamp >= 0).map((line) => `[${timestamp(line.timestamp)}]${line.text}`).join('\n') : '';
        const lyric = synced || tag.text || (typeof tag === 'string' ? tag : '');
        if (lyric && Buffer.byteLength(lyric) <= MAX_LYRICS)
            return { success: true, source: 'embedded', format: 'lrc', lyric, status: 'ready' };
    }
    return { success: true, source: 'none', lyric: '', status: 'missing', message: '此文件没有内嵌或同名歌词；可在 Folia 歌词设置导入或匹配。' };
}
function writeLocalMusicLyrics(filename, lyric, format = 'lrc') {
    const safe = safeAudio(filename);
    if (!['lrc', 'vtt', 'ttml', 'qrc', 'yrc', 'krc', 'fia'].includes(format))
        throw new Error('不支持的歌词格式');
    if (typeof lyric !== 'string' || !lyric.trim() || Buffer.byteLength(lyric) > MAX_LYRICS)
        throw new Error('歌词文件为空或超过 512 KB');
    const file = safe.filePath.replace(/\.[^.]+$/, '.' + format);
    sidecar(file, safe.root, MAX_LYRICS);
    // 同目录原子替换，不覆盖音频文件。
    const temporary = file + '.ccm-' + require('crypto').randomUUID();
    try {
        fs.writeFileSync(temporary, lyric, { flag: 'wx' });
        fs.renameSync(temporary, file);
    }
    finally {
        if (fs.existsSync(temporary))
            fs.unlinkSync(temporary);
    }
    return { success: true };
}
async function sendLocalMusicCover(filename, res) {
    const safe = safeAudio(filename), base = safe.filePath.replace(/\.[^.]+$/, '');
    let data, mime = '', source = 'placeholder';
    for (const [ext, type] of [['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
        const image = sidecar(base + '.' + ext, safe.root, MAX_COVER);
        if (image) {
            data = image;
            mime = type;
            source = 'sidecar';
            break;
        }
    }
    if (!data) {
        const picture = (await metadata(safe)).common?.picture?.find((p) => /^image\/(jpeg|png|webp)$/.test(p.format) && p.data?.length <= MAX_COVER);
        if (picture) {
            data = Buffer.from(picture.data);
            mime = picture.format;
            source = 'embedded';
        }
    }
    if (!data) {
        mime = 'image/svg+xml';
        data = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#323655"/><stop offset="1" stop-color="#121a29"/></linearGradient></defs><rect width="600" height="600" rx="36" fill="url(#g)"/><circle cx="300" cy="300" r="145" fill="none" stroke="#b8adf2" stroke-opacity=".4" stroke-width="2"/><circle cx="300" cy="300" r="105" fill="none" stroke="#b8adf2" stroke-opacity=".2" stroke-width="26"/><circle cx="300" cy="300" r="35" fill="#b8adf2"/><text x="300" y="520" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#a3acc5">CCM · LOCAL MUSIC</text></svg>');
    }
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length, 'Cache-Control': 'private, no-cache', 'X-Content-Type-Options': 'nosniff', 'X-CCM-Cover-Source': source });
    res.end(data);
}
function writeLocalMusicCover(filename, content, extension) {
    const safe = safeAudio(filename), mime = extension === 'jpeg' ? 'jpg' : extension;
    if (!['jpg', 'png', 'webp'].includes(mime) || typeof content !== 'string' || content.length > Math.ceil(MAX_COVER * 4 / 3) + 4)
        throw new Error('封面格式或大小不受支持');
    const data = Buffer.from(content, 'base64');
    const valid = mime === 'jpg' ? data[0] === 255 && data[1] === 216 && data[2] === 255 : mime === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
    if (!valid || data.length > MAX_COVER)
        throw new Error('封面内容无效或超过 8 MB');
    const file = safe.filePath.replace(/\.[^.]+$/, '.' + mime), temporary = file + '.ccm-' + require('crypto').randomUUID();
    sidecar(file, safe.root, MAX_COVER);
    try {
        fs.writeFileSync(temporary, data, { flag: 'wx' });
        fs.renameSync(temporary, file);
    }
    finally {
        if (fs.existsSync(temporary))
            fs.unlinkSync(temporary);
    }
    return { success: true };
}
function streamLocalMusic(filename, req, res) {
    const safe = safeAudio(filename), mime = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.aac': 'audio/aac' };
    return (0, video_stream_1.streamMusicVideo)(req, res, safe.filePath, mime[path.extname(safe.filePath).toLowerCase()]);
}
//# sourceMappingURL=local-assets.js.map