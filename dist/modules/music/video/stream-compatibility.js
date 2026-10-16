"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compatibleStreamInput = compatibleStreamInput;
const child_process_1 = require("child_process");
const util_1 = require("util");
// 仅未知编码探测流头，不下载整片；已知 H.264/AAC 直接封装。
const execute = (0, util_1.promisify)(child_process_1.execFile);
async function compatibleStreamInput(input, signal) {
    if (input.videoCodec === 'h264' && ['aac', 'none'].includes(input.audioCodec))
        return { ...input, copyCompatible: true };
    const inspect = async (url) => {
        const args = ['-v', 'error', '-rw_timeout', '10000000', '-analyzeduration', '1000000', '-probesize', '262144'];
        if (input.headers)
            args.push('-headers', Object.entries(input.headers).map(([key, value]) => `${key}: ${String(value).replace(/[\r\n]/g, ' ')}`).join('\r\n') + '\r\n');
        args.push('-i', url, '-show_streams', '-of', 'json');
        const { stdout } = await execute('ffprobe', args, { windowsHide: true, signal, timeout: 12000, maxBuffer: 262144 });
        return JSON.parse(stdout).streams || [];
    };
    try {
        const streams = await inspect(input.video || input.input), audio = input.audio ? await inspect(input.audio) : streams;
        const video = streams.find((row) => row.codec_type === 'video');
        return { ...input, copyCompatible: video?.codec_name === 'h264' && ['yuv420p', 'yuvj420p'].includes(video.pix_fmt) && audio.filter((row) => row.codec_type === 'audio').every((row) => row.codec_name === 'aac') };
    }
    catch (error) {
        if (signal.aborted)
            throw error;
        return { ...input, copyCompatible: false };
    }
}
//# sourceMappingURL=stream-compatibility.js.map