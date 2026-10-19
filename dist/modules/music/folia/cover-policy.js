"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaCoverTarget = foliaCoverTarget;
// 音乐封面的可信来源规则；资料保存与实际读取共用，禁止写入任意网络目标。
function foliaCoverTarget(value) {
    const url = new URL(value), host = url.hostname.toLowerCase();
    const bodian = /^img\d+\.(?:kwcdn\.)?kuwo\.cn$/.test(host) && /\.(?:jpe?g|png|webp|gif|avif)$/i.test(url.pathname);
    if ((url.protocol !== 'https:' && !(bodian && url.protocol === 'http:')) || url.username || url.password || url.port || !(/^[ps][1-9]\d?\.music\.126\.net$/.test(host) || ['y.gtimg.cn', 'imge.kugou.com', 'imgessl.kugou.com', 'singerimg.kugou.com', 'c1.kgimg.com'].includes(host) || /^p[1-9]\d?\.kgimg\.com$/.test(host) || bodian))
        throw Error('封面来源未授权');
    return url;
}
//# sourceMappingURL=cover-policy.js.map