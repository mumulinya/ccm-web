"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renewPersonalVideoReference = renewPersonalVideoReference;
const library_1 = require("./library");
const search_results_1 = require("../search-results");
const presentation_1 = require("./presentation");
// 已知个人列表身份只更新当前账号代次的凭证；实际访问权限仍由官方播放读取验证。
function renewPersonalVideoReference(owner, provider, address) {
    (0, library_1.requireVideoSession)(owner, provider);
    const url = new URL(String(address || ''));
    const expected = provider === 'bilibili' ? 'www.bilibili.com' : 'www.douyin.com';
    if (url.protocol !== 'https:' || url.hostname !== expected || url.port || url.username || url.password)
        throw new Error('个人视频地址无效');
    const id = (provider === 'bilibili' ? /^\/video\/(BV[a-zA-Z0-9]{10})\/?$/ : /^\/video\/(\d{10,24})\/?$/).exec(url.pathname)?.[1];
    if (!id)
        throw new Error('个人视频身份无效');
    return { ...(0, presentation_1.presentVideo)(owner, provider, { sourceId: id, title: id }), requiresAuth: true,
        downloadToken: (0, search_results_1.issuePersonalVideoToken)(provider, id, id, '', owner) };
}
//# sourceMappingURL=personal-reference.js.map