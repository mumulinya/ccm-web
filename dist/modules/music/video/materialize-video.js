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
exports.materializeBrowserVideo = materializeBrowserVideo;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
// 优先保留平台原始 H.264/AAC；只对浏览器不支持的编码执行一次兼容转换。
const execute = (0, util_1.promisify)(child_process_1.execFile);
async function materializeBrowserVideo(input, target, headers, signal) {
    const remote = /^https?:\/\//i.test(input);
    const inputArgs = remote ? ['-rw_timeout', '15000000', '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '3',
        '-headers', Object.entries(headers).map(([key, value]) => `${key}: ${String(value).replace(/[\r\n]/g, ' ')}`).join('\r\n') + '\r\n', '-i', input] : ['-i', input];
    const common = { windowsHide: true, timeout: 15 * 60_000, maxBuffer: 1024 * 1024, signal };
    await execute('ffmpeg', ['-nostdin', '-y', ...inputArgs, '-map', '0:v:0', '-map', '0:a?', '-c', 'copy', '-movflags', '+faststart', target], common);
    const { stdout } = await execute('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', target], { ...common, timeout: 30_000 });
    const streams = JSON.parse(stdout).streams || [], video = streams.find((row) => row.codec_type === 'video');
    if (!video)
        throw new Error('下载结果没有有效视频画面');
    const compatible = video.codec_name === 'h264' && ['yuv420p', 'yuvj420p'].includes(video.pix_fmt) && streams.filter((row) => row.codec_type === 'audio').every((row) => row.codec_name === 'aac');
    if (compatible)
        return;
    const converted = target + '.compatible.mp4';
    try {
        await execute('ffmpeg', ['-nostdin', '-y', '-threads', '2', '-filter_threads', '1', '-i', target, '-map', '0:v:0', '-map', '0:a?',
            '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', converted], common);
        fs.renameSync(converted, target);
    }
    finally {
        if (fs.existsSync(converted))
            fs.unlinkSync(converted);
    }
}
//# sourceMappingURL=materialize-video.js.map