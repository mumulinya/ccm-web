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
exports.isHlsMediaName = exports.HLS_SEGMENT_SECONDS = void 0;
exports.createHlsPublication = createHlsPublication;
exports.hlsEncodingArgs = hlsEncodingArgs;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
exports.HLS_SEGMENT_SECONDS = 3;
const isHlsMediaName = (name) => /^(?:r[a-f0-9]{12}_)?(?:init\.mp4|segment_[0-9]{6}\.m4s)$/.test(name);
exports.isHlsMediaName = isHlsMediaName;
function readEntries(directory, filename) {
    if (!fs.existsSync(path.join(directory, filename)))
        return [];
    const entries = [];
    let init = '', duration = 0, discontinuity = false;
    for (const line of fs.readFileSync(path.join(directory, filename), 'utf8').split(/\r?\n/)) {
        if (line.startsWith('#EXT-X-MAP:'))
            init = /URI="([^"]+)"/.exec(line)?.[1] || '';
        else if (line.startsWith('#EXTINF:'))
            duration = Number(line.slice(8).split(',')[0]);
        else if (line === '#EXT-X-DISCONTINUITY')
            discontinuity = true;
        else if (line && !line.startsWith('#')) {
            if (!(0, exports.isHlsMediaName)(line) || !(0, exports.isHlsMediaName)(init) || !Number.isFinite(duration) || duration <= 0)
                break;
            if (![line, init].every(name => { try {
                const stat = fs.lstatSync(path.join(directory, name));
                return stat.isFile() && !stat.isSymbolicLink() && stat.size > 0;
            }
            catch {
                return false;
            } }))
                break;
            entries.push({ name: line, init, duration, discontinuity });
            duration = 0;
            discontinuity = false;
        }
    }
    return entries;
}
/** 每次重连单独命名；公开列表只追加完整分片，不覆盖播放器已读的字节。 */
function createHlsPublication(directory) {
    const prefix = `r${(0, crypto_1.randomBytes)(6).toString('hex')}_`;
    const base = readEntries(directory, 'manifest.m3u8');
    const resumeAt = base.reduce((sum, e) => sum + e.duration, 0);
    const playlist = `${prefix}manifest.m3u8`;
    let lastText = '';
    return {
        resumeAt, playlist, init: `${prefix}init.mp4`, segment: `${prefix}segment_%06d.m4s`,
        publish(complete = false) {
            const next = readEntries(directory, playlist);
            if (base.length && next.length)
                next[0].discontinuity = true;
            const entries = [...base, ...next];
            if (!entries.length)
                return { duration: 0, bytes: 0 };
            const target = Math.max(exports.HLS_SEGMENT_SECONDS, ...entries.map(e => Math.ceil(e.duration)));
            const lines = ['#EXTM3U', '#EXT-X-VERSION:7', `#EXT-X-TARGETDURATION:${target}`, '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-PLAYLIST-TYPE:EVENT'];
            let map = '';
            for (const entry of entries) {
                if (entry.discontinuity)
                    lines.push('#EXT-X-DISCONTINUITY');
                if (entry.init !== map) {
                    map = entry.init;
                    lines.push(`#EXT-X-MAP:URI="${map}"`);
                }
                lines.push(`#EXTINF:${entry.duration.toFixed(6)},`, entry.name);
            }
            if (complete)
                lines.push('#EXT-X-ENDLIST');
            const text = lines.join('\n') + '\n';
            if (text !== lastText) {
                const tmp = path.join(directory, 'manifest.m3u8.tmp');
                fs.writeFileSync(tmp, text);
                fs.renameSync(tmp, path.join(directory, 'manifest.m3u8'));
                lastText = text;
            }
            const names = new Set(entries.flatMap(e => [e.name, e.init]));
            return { duration: entries.reduce((sum, e) => sum + e.duration, 0), bytes: [...names].reduce((sum, name) => sum + fs.statSync(path.join(directory, name)).size, 0) };
        },
    };
}
function hlsEncodingArgs(mediaKind, input, publication) {
    const args = ['-nostdin', '-y'];
    const addInput = (url) => {
        if (/^https?:\/\//.test(url)) {
            args.push('-rw_timeout', '15000000', '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '8');
            if (input.headers && Object.keys(input.headers).length)
                args.push('-headers', Object.entries(input.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n');
        }
        args.push('-i', url);
    };
    addInput(mediaKind === 'audio' ? input.audio || input.input : input.video || input.input);
    if (mediaKind === 'video' && input.video && input.audio)
        addInput(input.audio);
    // 输出端精确裁掉已发布时间段；即使上游不支持 Range，也不重复拼接旧音视频。
    if (publication.resumeAt > 0)
        args.push('-ss', String(publication.resumeAt));
    if (mediaKind === 'video') {
        args.push('-map', '0:v:0', '-map', input.video && input.audio ? '1:a:0' : '0:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-flags', '+cgop', '-force_key_frames', `expr:gte(t,n_forced*${exports.HLS_SEGMENT_SECONDS})`, '-sc_threshold', '0', '-c:a', 'aac', '-b:a', '160k');
    }
    else {
        // B站音频模式直接使用音轨，不把 video/audio 对象误当成单流地址。
        args.push('-vn', '-c:a', 'aac', '-b:a', '192k');
    }
    return [...args, '-f', 'hls', '-hls_time', String(exports.HLS_SEGMENT_SECONDS), '-hls_playlist_type', 'event',
        '-hls_segment_type', 'fmp4', '-hls_flags', 'temp_file+independent_segments',
        '-hls_fmp4_init_filename', publication.init, '-hls_segment_filename', publication.segment,
        '-progress', 'pipe:1', '-nostats', publication.playlist];
}
//# sourceMappingURL=hls-publication.js.map