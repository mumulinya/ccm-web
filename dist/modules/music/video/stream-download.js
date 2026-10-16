"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.produceVideoForDownload = produceVideoForDownload;
const stream_playback_sessions_1 = require("../stream-playback-sessions");
// 下载消费者与前台播放各持独立引用；只传入已经核验的服务端 job。
async function produceVideoForDownload(job, signal, onProgress) {
    const session = (0, stream_playback_sessions_1.createDownloadStream)(job);
    if (!session.sessionId)
        return session;
    const id = session.sessionId;
    const cancelled = () => { try {
        (0, stream_playback_sessions_1.cancelStreamSession)(id);
    }
    catch { } };
    signal.addEventListener('abort', cancelled, { once: true });
    try {
        for (;;) {
            if (signal.aborted)
                throw Object.assign(new Error('下载已取消'), { name: 'AbortError' });
            const state = (0, stream_playback_sessions_1.getStreamSession)(id);
            if (state.status === 'completed')
                return state;
            if (['failed', 'cancelled'].includes(state.status))
                throw Object.assign(new Error(state.error || '视频下载失败'), { category: state.errorKind });
            onProgress(state.durationSeconds ? Math.min(99, Math.round(state.bufferedDuration / state.durationSeconds * 100)) : 0);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    finally {
        signal.removeEventListener('abort', cancelled);
        cancelled();
    }
}
//# sourceMappingURL=stream-download.js.map