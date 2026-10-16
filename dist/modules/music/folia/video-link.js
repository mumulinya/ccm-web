"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFoliaBilibili = resolveFoliaBilibili;
const platform_http_1 = require("../platform-http");
const bilibili_1 = require("../bilibili");
const search_results_1 = require("../search-results");
async function resolveFoliaBilibili(input) {
    const value = String(input.address || input.bvid || '').trim();
    let bvid = value;
    if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid)) {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'].includes(url.hostname))
            throw new Error('请输入 B站完整视频链接或 BV 号');
        bvid = /^\/video\/(BV[a-zA-Z0-9]{10})(?:\/|$)/.exec(url.pathname)?.[1] || '';
    }
    if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid))
        throw new Error('B站链接缺少有效 BV 号');
    try {
        const data = await (0, platform_http_1.musicPlatformJson)({ url: 'https://api.bilibili.com/x/web-interface/view?bvid=' + bvid, allowedHosts: ['api.bilibili.com'], headers: { 'User-Agent': bilibili_1.BILI_UA, Referer: 'https://www.bilibili.com/', Cookie: (0, bilibili_1.getBiliCookieHeader)() } });
        if (data.code !== 0 || !data.data?.bvid)
            throw new Error(data.message || 'B站视频不存在或不可用');
        return (0, search_results_1.signSearchResults)('bilibili', bvid, [{ bvid, title: data.data.title, author: data.data.owner?.name, pic: data.data.pic, duration: data.data.duration }])[0];
    }
    catch (error) {
        // B站 may return 412 to the metadata endpoint while the public web player
        // still works. Keep the stable BV identity so the playback resolver can
        // use its browser fallback and refresh personal tokens after re-login.
        if (/412|precondition|风控|risk/i.test(String(error?.message || ''))) {
            return (0, search_results_1.signSearchResults)('bilibili', bvid, [{ bvid, title: bvid, author: 'B站视频' }])[0];
        }
        throw error;
    }
}
//# sourceMappingURL=video-link.js.map