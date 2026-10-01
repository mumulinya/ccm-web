"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.douyinPublicResult = douyinPublicResult;
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
const search_results_1 = require("./search-results");
function douyinPublicResult(tool, raw, query = '') {
    if (['search_videos', 'get_user_posts', 'get_homefeed'].includes(tool)) {
        const items = (0, search_results_1.signSearchResults)('douyin', query, (0, douyin_mcp_bridge_1.normalizeDouyinRows)(raw), 20);
        const page = raw?.metadata || (raw?.data && !Array.isArray(raw.data) ? raw.data : raw);
        const more = page?.has_more ?? raw?.has_more;
        return {
            items,
            nextCursor: page?.cursor ?? page?.max_cursor ?? page?.offset ?? null,
            hasMore: more == null ? tool === 'get_homefeed' && items.length > 0 : more === true || Number(more) === 1,
        };
    }
    if (['get_video_detail', 'resolve_share_url'].includes(tool)) {
        const row = (0, douyin_mcp_bridge_1.normalizeDouyinRows)(raw?.video || raw)[0];
        return {
            video: row ? (0, search_results_1.signSearchResults)('douyin', '', [row], 1)[0] : null,
            statistics: { likes: raw?.video?.liked_count, comments: raw?.video?.comment_count, shares: raw?.video?.share_count },
            imageCount: Number(raw?.video?.image_count || 0),
        };
    }
    if (['get_video_comments', 'get_video_live_comments', 'get_sub_comments'].includes(tool)) {
        return { items: (raw?.comments || []).map((c) => ({
                id: c.comment_id || c.cid, text: c.content || c.text || '', author: c.nickname || c.user?.nickname || '抖音用户',
                replyCount: Number(c.sub_comment_count || c.reply_comment_total || 0), createdAt: Number(c.create_time || 0),
            })), nextCursor: raw?.metadata?.cursor ?? raw?.cursor ?? null,
            hasMore: Number(raw?.metadata?.has_more ?? raw?.has_more) === 1, live: tool === 'get_video_live_comments', timebase: raw?.timebase || null, synchronized: raw?.synchronized === true, nextSinceTime: Number(raw?.next_since_time || 0) };
    }
    if (tool === 'get_user_info') {
        const u = raw?.user || {};
        return { user: { secUserId: u.sec_uid, name: u.nickname, description: u.desc || u.signature || '', followers: u.fans || u.follower_count || 0, posts: u.videos_count || u.video_count || u.aweme_count || 0 } };
    }
    return raw;
}
//# sourceMappingURL=douyin-presentation.js.map