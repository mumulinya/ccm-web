"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.douyinToolSchema = douyinToolSchema;
const douyin_contract_1 = require("./douyin-contract");
const names = {
    douyin_check_login_status: 'check_login_status', douyin_search: 'search_videos', douyin_video_detail: 'get_video_detail',
    douyin_video_comments: 'get_video_comments', douyin_comment_replies: 'get_sub_comments', douyin_user_info: 'get_user_info',
    douyin_user_posts: 'get_user_posts', douyin_homefeed: 'get_homefeed', douyin_resolve_share: 'resolve_share_url',
    douyin_download_video: 'download_video', douyin_download_images: 'download_aweme_images', douyin_ocr_images: 'ocr_aweme_images',
    douyin_transcribe: 'transcribe_video', douyin_batch_transcribe: 'batch_transcribe', douyin_logout: 'logout',
};
function douyinToolSchema(name, required = []) {
    const tool = names[name];
    if (!tool)
        return null;
    return {
        type: 'object', additionalProperties: false, required,
        properties: Object.fromEntries(douyin_contract_1.DOUYIN_TOOLS[tool].filter(key => key !== 'save_dir').map(key => [key, {
                type: ['offset', 'cursor', 'count', 'refresh_index', 'sort_type', 'publish_time'].includes(key) ? 'integer' : 'string',
                description: key === 'aweme_id' ? '抖音视频数字 ID，不可编造' : key === 'sec_user_id' ? '来自详情的 secUserId / sec_uid' : key,
                ...(key === 'sort_type' ? { enum: [0, 1, 2] } : key === 'publish_time' ? { enum: [0, 1, 7, 180] } : {}),
            }])),
    };
}
//# sourceMappingURL=douyin-tool-schema.js.map