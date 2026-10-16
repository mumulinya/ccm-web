"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentVideo = presentVideo;
exports.videoMetadata = videoMetadata;
const artwork_1 = require("./artwork");
const bilibili_account_1 = require("./bilibili-account");
const douyin_mcp_bridge_1 = require("../douyin-mcp-bridge");
// 展示数据保留来源身份，只有执行播放/下载时才使用短期授权凭证。
function presentVideo(owner, provider, row) {
    const id = String(row.sourceId || row.bvid || row.awemeId || row.media?.sourceId || '');
    const duration = typeof row.duration === 'number' ? `${Math.floor(row.duration / 60)}:${String(Math.floor(row.duration % 60)).padStart(2, '0')}` : row.duration;
    const artwork = row.pic || row.cover || row.posterUrl || row.coverUrl || row.media?.posterUrl || row.media?.coverUrl || row.media?.cover || '';
    return { ...row, type: provider, sourceId: id, ...(provider === 'bilibili' ? { bvid: id } : { awemeId: id }), videoJobId: row.videoJobId || row.media?.videoJobId || undefined, title: String(row.title || id || row.filename || '视频').slice(0, 300), author: String(row.author || row.artist || row.media?.artist || '').slice(0, 150), duration, posterUrl: (0, artwork_1.registerVideoArtwork)(owner, provider, id, artwork), width: Number(row.width || row.dimension?.width || row.media?.width || 0), height: Number(row.height || row.dimension?.height || row.media?.height || 0) };
}
async function videoMetadata(owner, provider, id) {
    if (!(provider === 'bilibili' ? /^BV[a-zA-Z0-9]{10}$/ : /^\d{10,24}$/).test(id))
        throw new Error('视频身份无效');
    if (provider === 'bilibili') {
        const data = await (0, bilibili_account_1.biliRead)(owner, '/x/web-interface/view', { bvid: id });
        if (data.bvid !== id)
            throw new Error('B站返回了不同视频身份');
        return presentVideo(owner, provider, { bvid: id, title: data.title, author: data.owner?.name, pic: data.pic, duration: data.duration, dimension: data.dimension });
    }
    const raw = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoDetail)(id), row = (0, douyin_mcp_bridge_1.normalizeDouyinRows)(raw).find(item => item.awemeId === id);
    if (!row)
        throw new Error('抖音未返回对应视频资料');
    return presentVideo(owner, provider, row);
}
//# sourceMappingURL=presentation.js.map