"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaLyricProxyRequest = foliaLyricProxyRequest;
exports.foliaLyricProxy = foliaLyricProxy;
const platform_http_1 = require("../platform-http");
// 原生 Folia 的公开搜索/歌词通道；平台登录及写操作仍走受管 provider。
const hosts = ['u.y.qq.com', 'c.y.qq.com', 'lyrics.kugou.com', 'mobilecdn.kugou.com', 'msearch.kugou.com', 'songsearch.kugou.com', 'gateway.kugou.com', 'complexsearch.kugou.com', 'mobiles.kugou.com', 'm.kugou.com', 'music.163.com', 'raw.githubusercontent.com'];
const publicHttpPaths = {
    'complexsearch.kugou.com': ['/v2/search/song'],
    'mobiles.kugou.com': ['/api/v3/search/song'],
    'lyrics.kugou.com': ['/download'],
};
const qqReadOperations = new Set(['music.search.SearchCgiService:DoSearchForQQMusicLite', 'music.musichallSong.PlayLyricInfo:GetPlayLyricInfo']);
const qqAnonymousComm = { ct: 11, cv: '1003006', v: '1003006', os_ver: '15', phonetype: '24122RKC7C', rom: 'Redmi/miro/miro:15/AE3A.240806.005/OS2.0.102.0.VOMCNXM:user/release-keys', tmeAppID: 'qqmusiclight', nettype: 'NETWORK_WIFI', udid: '0', uid: '0' };
function foliaLyricProxyRequest(req, body) {
    const value = new URL(req.url, 'http://ccm.local').searchParams.get('url') || '';
    const url = new URL(value);
    const method = req.method || 'GET';
    const publicHttp = url.protocol === 'http:' && method === 'GET' && publicHttpPaths[url.hostname]?.includes(url.pathname);
    if ((!publicHttp && url.protocol !== 'https:') || !hosts.includes(url.hostname) || url.username || url.password || url.port)
        throw new Error('歌词来源未授权');
    if (publicHttp && (url.searchParams.get('token') || (url.searchParams.has('userid') && url.searchParams.get('userid') !== '0') || ['cookie', 'password', 'access_token'].some(key => url.searchParams.has(key))))
        throw new Error('公开歌词通道不能传递账号凭据');
    if (method !== 'GET' && !(method === 'POST' && url.hostname === 'u.y.qq.com' && url.pathname === '/cgi-bin/musicu.fcg' && qqReadOperations.has(`${body?.request?.module}:${body?.request?.method}`)))
        throw new Error('公开歌词通道仅支持原生搜索与歌词读取');
    const headers = { 'Content-Type': 'application/json', 'User-Agent': 'okhttp/3.14.9' };
    if (url.hostname === 'u.y.qq.com')
        headers.Cookie = 'tmeLoginType=-1;';
    if (url.hostname.endsWith('.kugou.com')) {
        headers['User-Agent'] = `Android14-1070-11070-201-0-${url.pathname.includes('/search/song') ? 'SearchSong' : 'Lyric'}-wifi`;
        for (const key of ['kg-rec', 'kg-rc', 'kg-clienttimems', 'mid']) {
            const value = req.headers?.[key];
            if (typeof value === 'string' && value.length <= 128 && !/[\r\n\0]/.test(value))
                headers[key] = value;
        }
        if (url.hostname === 'complexsearch.kugou.com')
            headers['x-router'] = url.hostname;
    }
    // 只装配已校验的单个读取操作，不能夹带第二个批量平台写请求或账号 comm。
    const qqBody = method === 'POST' ? { comm: qqAnonymousComm, request: { module: body.request.module, method: body.request.method, param: body.request.param } } : undefined;
    return { url: url.toString(), allowedHosts: hosts, method, headers, ...(qqBody ? { body: JSON.stringify(qqBody) } : {}), maxBytes: 4 * 1024 * 1024 };
}
async function foliaLyricProxy(req, res, body) {
    const result = await (0, platform_http_1.musicPlatformRequest)(foliaLyricProxyRequest(req, body));
    const encoding = String(result.headers['content-encoding'] || '');
    res.writeHead(result.statusCode || 200, { 'Content-Type': result.headers['content-type'] || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(/^(gzip|deflate|br)$/.test(encoding) ? { 'Content-Encoding': encoding } : {}) });
    res.end(result.buffer);
}
//# sourceMappingURL=lyric-proxy.js.map