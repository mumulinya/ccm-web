"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaCoverTarget = void 0;
exports.sendFoliaCover = sendFoliaCover;
const cover_reader_1 = require("./cover-reader");
const cover_settings_1 = require("./cover-settings");
const cover_policy_1 = require("./cover-policy");
var cover_policy_2 = require("./cover-policy");
Object.defineProperty(exports, "foliaCoverTarget", { enumerable: true, get: function () { return cover_policy_2.foliaCoverTarget; } });
// 封面经既有媒体网络边界读取，不转发账号凭据，也不允许任意 URL。
async function sendFoliaCover(value, res, owner = 'workspace') {
    const url = (0, cover_policy_1.foliaCoverTarget)(value);
    const result = await (0, cover_reader_1.readFoliaCover)(url, (0, cover_settings_1.readFoliaCoverSettings)(owner).neteaseRelay === 'wsrv').catch(error => {
        if (error.message.includes('备用图片读取'))
            throw Object.assign(error, { statusCode: 502 });
        if (!error.status)
            throw error;
        const platform = url.hostname.endsWith('126.net') ? '网易云' : url.hostname === 'y.gtimg.cn' ? 'QQ 音乐' : url.hostname.endsWith('.kuwo.cn') ? '波点' : '酷狗';
        const reason = error.status === 'timeout' ? '连接超时' : /ECONNRESET|socket|reset/i.test(error.message) ? '连接被重置' : '请求失败';
        throw Object.assign(new Error(`${platform}图片 CDN ${reason}，请检查本机网络与 DNS 后重试；重新登录不能修复 CDN 连接。`), { statusCode: 502 });
    });
    const mime = String(result.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (result.statusCode !== 200 || !/^image\/(jpeg|png|webp|gif|avif)$/.test(mime))
        throw new Error('音乐平台未返回有效封面');
    res.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=3600', 'X-CCM-Cover-Reader': result.coverReader || 'direct' });
    res.end(result.buffer);
}
//# sourceMappingURL=cover.js.map