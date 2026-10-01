"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDouyinAgentTool = executeDouyinAgentTool;
const douyin_media_jobs_1 = require("./douyin-media-jobs");
const douyin_presentation_1 = require("./douyin-presentation");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
async function executeDouyinAgentTool(name, args, confirmed = true) {
    args = args || {};
    const media = { douyin_download_video: 'download_video', douyin_download_images: 'download_aweme_images', douyin_ocr_images: 'ocr_aweme_images', douyin_transcribe: 'transcribe_video', douyin_batch_transcribe: 'batch_transcribe' };
    if (media[name]) {
        const input = name === 'douyin_batch_transcribe' ? { keyword: args.keyword, count: args.count ?? 3, sort_type: args.sort_type ?? 1 } : { aweme_id: args.aweme_id };
        return { success: true, source: 'douyin-mcp', result: { job: (0, douyin_media_jobs_1.createDouyinMediaJob)(media[name], input, confirmed) } };
    }
    const douyinArgs = args || {};
    let result;
    switch (name) {
        case "douyin_check_login_status":
            result = { logged_in: await (0, douyin_mcp_bridge_1.douyinMcpCheckLogin)(), status: (0, douyin_mcp_bridge_1.douyinMcpStatus)() };
            break;
        case "douyin_search":
            result = await (0, douyin_mcp_bridge_1.douyinMcpSearch)(douyinArgs.keyword, douyinArgs.count, { offset: douyinArgs.offset, count: douyinArgs.count, searchChannel: douyinArgs.search_channel, sortType: douyinArgs.sort_type, publishTime: douyinArgs.publish_time });
            break;
        case "douyin_video_detail":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoDetail)(douyinArgs.aweme_id);
            break;
        case "douyin_video_comments":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoComments)(douyinArgs.aweme_id, douyinArgs.cursor, douyinArgs.count, douyinArgs.source_keyword);
            break;
        case "douyin_video_live_comments":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetVideoLiveComments)(douyinArgs.aweme_id, douyinArgs.since_time, douyinArgs.count, douyinArgs.source_keyword);
            break;
        case "douyin_comment_replies":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetSubComments)(douyinArgs.comment_id, douyinArgs.cursor, douyinArgs.count, douyinArgs.source_keyword);
            break;
        case "douyin_user_info":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetUserInfo)(douyinArgs.sec_user_id);
            break;
        case "douyin_user_posts":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetUserPosts)(douyinArgs.sec_user_id, douyinArgs.max_cursor, douyinArgs.count);
            break;
        case "douyin_homefeed":
            result = await (0, douyin_mcp_bridge_1.douyinMcpGetHomefeed)(douyinArgs.tag, douyinArgs.count, douyinArgs.refresh_index);
            break;
        case "douyin_resolve_share":
            result = await (0, douyin_mcp_bridge_1.douyinMcpResolveShareUrl)(douyinArgs.share_url);
            break;
        case "douyin_logout":
            result = await (0, douyin_mcp_bridge_1.revokeDouyinMcpLogin)();
            break;
        default: throw new Error(`未支持的抖音 Agent 工具：${name}`);
    }
    const presentationTools = { douyin_video_detail: 'get_video_detail', douyin_video_comments: 'get_video_comments', douyin_video_live_comments: 'get_video_live_comments', douyin_comment_replies: 'get_sub_comments', douyin_user_info: 'get_user_info', douyin_user_posts: 'get_user_posts', douyin_homefeed: 'get_homefeed', douyin_resolve_share: 'resolve_share_url' };
    return { success: true, source: "douyin-mcp", result: presentationTools[name] ? (0, douyin_presentation_1.douyinPublicResult)(presentationTools[name], result) : result };
}
//# sourceMappingURL=douyin-agent-tools.js.map