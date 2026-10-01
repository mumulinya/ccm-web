"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOUYIN_MEDIA_TOOLS = exports.DOUYIN_TOOLS = void 0;
exports.validateDouyinArgs = validateDouyinArgs;
exports.unwrapDouyinResult = unwrapDouyinResult;
// Stable CCM boundary: validate before contacting the Python sidecar.
exports.DOUYIN_TOOLS = {
    check_login_status: [], logout: [], get_login_qrcode: [],
    search_videos: ['keyword', 'offset', 'count', 'search_channel', 'sort_type', 'publish_time'],
    get_video_detail: ['aweme_id'], get_video_comments: ['aweme_id', 'cursor', 'count', 'source_keyword'], get_video_live_comments: ['aweme_id', 'since_time', 'count', 'source_keyword'],
    get_sub_comments: ['comment_id', 'cursor', 'count', 'source_keyword'],
    get_user_info: ['sec_user_id'], get_user_posts: ['sec_user_id', 'max_cursor', 'count'],
    get_homefeed: ['tag', 'count', 'refresh_index'], resolve_share_url: ['share_url'],
    download_video: ['aweme_id', 'save_dir'], download_aweme_images: ['aweme_id', 'save_dir'],
    ocr_aweme_images: ['aweme_id', 'save_dir'], transcribe_video: ['aweme_id'],
    batch_transcribe: ['keyword', 'count', 'sort_type'],
};
exports.DOUYIN_MEDIA_TOOLS = new Set(['download_video', 'download_aweme_images', 'ocr_aweme_images', 'transcribe_video', 'batch_transcribe']);
function validateDouyinArgs(name, input = {}) {
    if (!Object.prototype.hasOwnProperty.call(exports.DOUYIN_TOOLS, name))
        throw new Error('未注册的抖音工具');
    const args = {};
    const fields = exports.DOUYIN_TOOLS[name];
    for (const key of Object.keys(input)) {
        if (!fields.includes(key))
            throw new Error(`抖音工具不接受参数 ${key}`);
        if (input[key] !== undefined)
            args[key] = input[key];
    }
    for (const field of ['aweme_id', 'comment_id']) {
        if (!fields.includes(field))
            continue;
        if (!/^\d{10,24}$/.test(String(args[field] || '')))
            throw new Error(`${field} 必须是有效的数字 ID`);
        args[field] = String(args[field]);
    }
    if (fields.includes('sec_user_id') && !/^MS4wLjABAAAA[\w-]{8,200}$/.test(String(args.sec_user_id || '')))
        throw new Error('用户安全 ID 无效');
    if (fields.includes('keyword') && (typeof args.keyword !== 'string' || !args.keyword.trim() || args.keyword.length > 120))
        throw new Error('搜索词不能为空或超过 120 字');
    for (const field of ['offset', 'cursor', 'since_time', 'count', 'refresh_index']) {
        if (args[field] === undefined)
            continue;
        const n = Number(args[field]);
        const max = field === 'count' ? name === 'batch_transcribe' ? 5 : name === 'search_videos' ? 20 : 50 : 1e15;
        if (!Number.isSafeInteger(n) || n < (field === 'count' ? 1 : 0) || n > max)
            throw new Error(`${field} 超出允许范围`);
        args[field] = n;
    }
    for (const [key, values] of Object.entries({ sort_type: [0, 1, 2], publish_time: [0, 1, 7, 180] })) {
        if (args[key] !== undefined && !values.includes(Number(args[key])))
            throw new Error(`${key} 无效`);
    }
    if (args.search_channel && !['video', 'general'].includes(args.search_channel))
        throw new Error('当前音乐接口仅支持视频/综合搜索');
    if (args.max_cursor !== undefined && !/^\d{1,20}$/.test(String(args.max_cursor)))
        throw new Error('作品分页游标无效');
    if (args.tag && !['all', 'knowledge', 'sports', 'auto', 'anime', 'game', 'movie', 'life_vlog', 'travel', 'mini_drama', 'food', 'agriculture', 'music', 'animal', 'parenting', 'fashion'].includes(args.tag))
        throw new Error('推荐分类无效');
    if (args.source_keyword !== undefined)
        args.source_keyword = String(args.source_keyword).slice(0, 120);
    if (fields.includes('share_url')) {
        let url;
        try {
            url = new URL(String(args.share_url));
        }
        catch {
            throw new Error('抖音分享链接无效');
        }
        if (url.protocol !== 'https:' || !['v.douyin.com', 'www.douyin.com', 'douyin.com'].includes(url.hostname) || url.port || url.username || url.password)
            throw new Error('仅支持 HTTPS 抖音分享链接');
        args.share_url = url.href;
    }
    return args;
}
function unwrapDouyinResult(raw) {
    let result = raw?.structuredContent;
    if (result == null) {
        const value = raw?.content?.filter((item) => item.type === 'text').map((item) => item.text).join('\n');
        try {
            result = value ? JSON.parse(value) : raw;
        }
        catch {
            result = value;
        }
    }
    const message = typeof result === 'string' ? result : result?.error || result?.message || '';
    if (raw?.isError || result?.success === false || (result?.status_code != null && Number(result.status_code) !== 0) || result?._verify_check_warning || result?.search_nil_info?.search_nil_type === 'verify_check') {
        const error = new Error(String(result?._verify_check_warning || result?.status_msg || message || '抖音 MCP 请求失败').replace(/((?:cookie|sessionid|token|authorization)\s*[:=]\s*)[^\s;]+/gi, '$1[redacted]').slice(0, 600));
        const kind = result?.error_type || '';
        error.category = result?.category;
        error.stage = result?.stage;
        error.systemCode = result?.system_code;
        error.douyinState = ['path_error', 'disk_error'].includes(error.category) ? 'unavailable'
            : /VerificationRequired|verify|风控|验证码/.test(kind + error.message) ? 'risk_controlled'
                : /CookieExpired|登录|Cookie已失效/.test(kind + error.message) ? 'login_required'
                    : /NotConfigured|未配置|未安装/.test(kind + error.message) ? 'capability_unavailable'
                        : /timeout|超时/i.test(error.message) ? 'timeout' : 'unavailable';
        if (!error.category && /HTTP|Connect|Network|Timeout|数据获取失败|网络/.test(kind + error.message))
            error.category = 'network_error';
        throw error;
    }
    if (!result || typeof result !== 'object')
        throw new Error('抖音 MCP 未返回有效结构化结果');
    if (JSON.stringify(result).length > 8 * 1024 * 1024)
        throw new Error('抖音 MCP 响应超过大小限制');
    return result;
}
//# sourceMappingURL=douyin-contract.js.map