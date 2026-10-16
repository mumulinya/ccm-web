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
exports.fullStreamFallback = fullStreamFallback;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../../core/utils");
// 流式兼容失败后才使用完整文件兼容路径。调用方必须先等待流式生产进程退出。
async function fullStreamFallback(session, input, signal) {
    if (!/^ms_[a-f0-9-]{36}$/.test(session.sessionId))
        throw new Error('视频会话无效');
    const directory = path.join(utils_1.CCM_DIR, 'media', 'video-playback', `stream_${session.sessionId}`);
    await fs.promises.mkdir(directory, { recursive: true });
    const target = path.join(directory, 'video.mp4');
    const args = ['-nostdin', '-y', '-threads', '2', '-filter_threads', '1'];
    const add = (url) => { if (/^https?:/.test(url)) {
        args.push('-rw_timeout', '15000000');
        if (input.headers)
            args.push('-headers', Object.entries(input.headers).map(([key, value]) => `${key}: ${String(value).replace(/[\r\n]/g, ' ')}`).join('\r\n') + '\r\n');
    } args.push('-i', url); };
    add(input.video || input.input);
    if (input.video && input.audio)
        add(input.audio);
    args.push('-map', '0:v:0', '-map', input.video && input.audio ? '1:a:0' : '0:a?', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-movflags', '+faststart', target);
    await (0, util_1.promisify)(child_process_1.execFile)('ffmpeg', args, { signal, windowsHide: true, timeout: 30 * 60_000, maxBuffer: 1024 * 1024 });
    const { stdout } = await (0, util_1.promisify)(child_process_1.execFile)('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', target], { signal, windowsHide: true, timeout: 30000 });
    return { file: target, duration: Number(JSON.parse(stdout).format?.duration || session.durationSeconds || 0) };
}
//# sourceMappingURL=full-stream-fallback.js.map