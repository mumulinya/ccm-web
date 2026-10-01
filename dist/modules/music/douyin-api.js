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
exports.handleDouyinApi = handleDouyinApi;
const utils_1 = require("../../core/utils");
const douyin_media_jobs_1 = require("./douyin-media-jobs");
const douyin_media_jobs_2 = require("./douyin-media-jobs");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const douyin_presentation_1 = require("./douyin-presentation");
const search_results_1 = require("./search-results");
const douyin_1 = require("./douyin");
const platform_http_1 = require("./platform-http");
const douyin_mcp_bridge_1 = require("./douyin-mcp-bridge");
function readMusicJsonBody(req, maxBytes = 64 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error("请求内容过大"));
                req.destroy();
                return;
            }
            chunks.push(Buffer.from(chunk));
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}"));
            }
            catch {
                reject(new Error("请求内容不是有效 JSON"));
            }
        });
        req.on("error", reject);
    });
}
function handleDouyinApi(pathname, req, res, parsed) {
    if (!pathname.startsWith("/api/music/platforms/douyin/"))
        return false;
    const artifact = pathname.match(/^\/api\/music\/platforms\/douyin\/jobs\/(dy_[\da-f-]{36})\/files\/(\d+)$/);
    if (artifact && req.method === 'GET') {
        try {
            const file = (0, douyin_media_jobs_2.resolveDouyinJobArtifact)(artifact[1], Number(artifact[2]));
            res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Content-Length': fs.statSync(file).size, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}` });
            fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, 404);
        }
        return true;
    }
    const sendMcpResult = (promise, fallback = "抖音 MCP 调用失败") => {
        promise.then(result => (0, utils_1.sendJson)(res, { success: true, result }))
            .catch((error) => {
            const detail = (0, platform_http_1.publicMusicPlatformError)(error);
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || fallback, state: error?.douyinState || detail.status, retryable: detail.retryable }, detail.retryable ? 503 : 422);
        });
        return true;
    };
    if (pathname === "/api/music/platforms/douyin/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, status: (0, douyin_1.douyinPlatformStatus)() });
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/capabilities" && req.method === "GET") {
        (0, douyin_mcp_bridge_1.douyinMcpCapabilities)().then(capabilities => (0, utils_1.sendJson)(res, { success: true, capabilities, status: (0, douyin_1.douyinPlatformStatus)() }))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, capabilities: [], error: error?.message || "读取抖音能力失败", status: (0, douyin_1.douyinPlatformStatus)() }, 503));
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/auth/start" && req.method === "POST") {
        (0, douyin_1.startDouyinLogin)()
            .then(status => (0, utils_1.sendJson)(res, { success: true, status }, 202))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "无法启动抖音登录" }, 503));
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/auth" && req.method === "DELETE") {
        (0, douyin_1.revokeDouyinLogin)()
            .then(status => (0, utils_1.sendJson)(res, { success: true, status }))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "清除抖音登录失败" }, 400));
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/runtime/prepare" && req.method === "POST") {
        (0, douyin_1.prepareDouyinMediaRuntime)()
            .then(runtime => (0, utils_1.sendJson)(res, { success: true, runtime, status: (0, douyin_1.douyinPlatformStatus)() }))
            .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "抖音媒体解析器准备失败", status: (0, douyin_1.douyinPlatformStatus)() }, 503));
        return true;
    }
    if (pathname === "/api/music/platforms/douyin/login-qrcode" && req.method === "POST")
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetLoginQrcode)(), "启动抖音二维码登录失败");
    if (pathname === "/api/music/platforms/douyin/search" && req.method === "POST") {
        readMusicJsonBody(req).then(body => sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpSearchPage)(body.keyword || body.q || "", {
            offset: body.offset,
            count: body.count,
            searchChannel: body.search_channel || body.searchChannel,
            sortType: body.sort_type ?? body.sortType,
            publishTime: body.publish_time ?? body.publishTime,
        }).then(page => ({ ...page, items: (0, search_results_1.signSearchResults)('douyin', body.keyword || body.q || '', page.items, 20) })), "抖音 MCP 搜索失败")).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "请求不是有效 JSON" }, 400));
        return true;
    }
    const videoDetailMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/videos\/([^/]+)$/);
    if (videoDetailMatch && req.method === "GET")
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetVideoDetail)(decodeURIComponent(videoDetailMatch[1])).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_video_detail', raw)), "获取抖音视频详情失败");
    const commentsMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/videos\/([^/]+)\/comments$/);
    if (commentsMatch && req.method === "GET") {
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetVideoComments)(decodeURIComponent(commentsMatch[1]), parsed.query.cursor, parsed.query.count, parsed.query.q).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_video_comments', raw)), "获取抖音评论失败");
    }
    const liveCommentsMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/videos\/([^/]+)\/live-comments$/);
    if (liveCommentsMatch && req.method === "GET") {
        const since = Number(parsed.query.since_time || 0), count = Number(parsed.query.count || 20);
        if (!Number.isSafeInteger(since) || since < 0 || since > 4_000_000_000 || !Number.isSafeInteger(count) || count < 1 || count > 50)
            return (0, utils_1.sendJson)(res, { success: false, error: '实时评论参数无效' }, 400);
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetVideoLiveComments)(decodeURIComponent(liveCommentsMatch[1]), since, count, parsed.query.q).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_video_live_comments', raw)), "获取抖音实时评论失败");
    }
    const subCommentsMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/comments\/([^/]+)\/replies$/);
    if (subCommentsMatch && req.method === "GET") {
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetSubComments)(decodeURIComponent(subCommentsMatch[1]), parsed.query.cursor, parsed.query.count, parsed.query.q).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_sub_comments', raw)), "获取抖音评论回复失败");
    }
    if (pathname === "/api/music/platforms/douyin/user" && req.method === "GET")
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetUserInfo)(parsed.query.sec_user_id || parsed.query.id).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_user_info', raw)), "获取抖音用户资料失败");
    if (pathname === "/api/music/platforms/douyin/user/posts" && req.method === "GET")
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetUserPosts)(parsed.query.sec_user_id || parsed.query.id, parsed.query.max_cursor, parsed.query.count).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_user_posts', raw)), "获取抖音用户作品失败");
    if (pathname === "/api/music/platforms/douyin/homefeed" && req.method === "GET")
        return sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpGetHomefeed)(parsed.query.tag, parsed.query.count, parsed.query.refresh_index).then(raw => (0, douyin_presentation_1.douyinPublicResult)('get_homefeed', raw)), "获取抖音推荐失败");
    if (pathname === "/api/music/platforms/douyin/resolve-share" && req.method === "POST") {
        readMusicJsonBody(req).then(body => sendMcpResult((0, douyin_mcp_bridge_1.douyinMcpResolveShareUrl)(body.share_url || body.url || "").then(raw => (0, douyin_presentation_1.douyinPublicResult)('resolve_share_url', raw)), "解析抖音分享链接失败")).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "请求不是有效 JSON" }, 400));
        return true;
    }
    const mediaTools = { download: 'download_video', images: 'download_aweme_images', ocr: 'ocr_aweme_images', transcribe: 'transcribe_video', 'batch-transcribe': 'batch_transcribe' };
    const mediaMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/media\/([\w-]+)$/);
    if (mediaMatch && mediaTools[mediaMatch[1]] && req.method === "POST") {
        readMusicJsonBody(req).then(body => {
            if (body.subdir || body.save_dir)
                throw new Error("保存目录由 CCM 管理");
            const tool = mediaTools[mediaMatch[1]];
            const args = tool === 'batch_transcribe' ? { keyword: body.keyword, count: body.count ?? 3, sort_type: body.sort_type ?? 1 } : { aweme_id: body.aweme_id || body.awemeId };
            (0, utils_1.sendJson)(res, { success: true, job: (0, douyin_media_jobs_1.createDouyinMediaJob)(tool, args) }, 202);
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === '/api/music/platforms/douyin/jobs' && req.method === 'GET') {
        try {
            (0, utils_1.sendJson)(res, { success: true, jobs: (0, douyin_media_jobs_1.listDouyinMediaJobs)() });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, 500);
        }
        return true;
    }
    const jobMatch = pathname.match(/^\/api\/music\/platforms\/douyin\/jobs\/(dy_[\da-f-]{36})(?:\/(confirm|cancel|retry))?$/);
    if (jobMatch && (req.method === 'POST' && jobMatch[2] || req.method === 'DELETE' && !jobMatch[2])) {
        try {
            (0, utils_1.sendJson)(res, { success: true, job: (0, douyin_media_jobs_1.controlDouyinMediaJob)(jobMatch[1], req.method === 'DELETE' ? 'remove' : jobMatch[2]) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
        }
        return true;
    }
    return false;
}
//# sourceMappingURL=douyin-api.js.map