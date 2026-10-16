"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleVideoWorkspaceApi = handleVideoWorkspaceApi;
const stream_playback_sessions_1 = require("../stream-playback-sessions");
const list_cache_1 = require("./list-cache");
const douyin_library_session_1 = require("./douyin-library-session");
const recommendations_1 = require("./recommendations");
const performance_1 = require("./performance");
const utils_1 = require("../../../core/utils");
const authorization_1 = require("../folia/authorization");
const local_library_1 = require("./local-library");
const accounts_store_1 = require("./accounts-store");
const account_login_1 = require("./account-login");
const library_1 = require("./library");
const presentation_1 = require("./presentation");
const artwork_1 = require("./artwork");
const bilibili_1 = require("../bilibili");
const bilibili_account_1 = require("./bilibili-account");
const douyin_1 = require("../douyin");
const search_results_1 = require("../search-results");
const video_link_1 = require("../folia/video-link");
const douyin_mcp_bridge_1 = require("../douyin-mcp-bridge");
const video_playback_jobs_1 = require("../video-playback-jobs");
const personal_reference_1 = require("./personal-reference");
// 所有新账号/个人内容接口复用 CCM 鉴权与写权限，用户身份只取服务端上下文。
async function body(req) { const chunks = []; let size = 0; for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096)
        throw new Error('请求内容过大');
    chunks.push(Buffer.from(chunk));
} return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
function handleVideoWorkspaceApi(pathname, req, res) {
    if (!pathname.startsWith('/api/music/video/'))
        return false;
    const owner = (0, accounts_store_1.videoOwner)(), url = new URL(req.url, 'http://ccm.local'), route = pathname.slice('/api/music/video'.length);
    const controller = new AbortController();
    res.once('close', () => { if (!res.writableEnded)
        controller.abort(); });
    void (async () => {
        if (route === '/prewarm' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            await (0, stream_playback_sessions_1.prewarmVideoInput)(await body(req), controller.signal);
            return (0, utils_1.sendJson)(res, { success: true, expiresIn: 60 });
        }
        if (route === '/performance' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, metrics: (0, performance_1.videoPerformance)() });
        if (route === '/performance' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await body(req);
            if (!['first_frame', 'buffer_event', 'buffer_wait'].includes(input.stage) || !Number.isFinite(input.ms) || input.ms < 0 || input.ms > 3600000)
                throw new Error('计时数据无效');
            (0, performance_1.videoTiming)(input.stage, input.provider, Date.now() - input.ms, input.hit === true);
            return (0, utils_1.sendJson)(res, { success: true });
        }
        if (route === '/downloads' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, jobs: (0, video_playback_jobs_1.listMusicVideoJobs)().filter(row => ['bilibili', 'douyin'].includes(row.source)) });
        if (route === '/downloads' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await body(req);
            return (0, utils_1.sendJson)(res, { success: true, job: (0, video_playback_jobs_1.createMusicVideoJob)((0, accounts_store_1.videoProvider)(input.source), input.downloadToken) }, 202);
        }
        const download = /^\/downloads\/(mv_[a-f\d-]{36})\/(cancel|retry)$/.exec(route);
        if (download && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, { success: true, job: (0, video_playback_jobs_1.controlMusicVideoJob)(download[1], download[2]) });
        }
        if (route === '/search' && req.method === 'GET') {
            const provider = (0, accounts_store_1.videoProvider)(url.searchParams.get('provider')), query = (url.searchParams.get('q') || '').trim();
            if (!query || query.length > 300)
                throw new Error('搜索内容无效');
            const data = await (0, list_cache_1.cachedVideoList)(owner, provider, ['search', query], async () => ({ items: provider === 'bilibili' ? await (0, bilibili_1.biliSearch)(query) : await (0, douyin_1.douyinSearch)(query, 20) }), { force: url.searchParams.get('refresh') === '1', signal: controller.signal });
            return (0, utils_1.sendJson)(res, { success: true, cache: data.cache, items: (0, search_results_1.signSearchResults)(provider, query, data.items, 20).map(row => (0, presentation_1.presentVideo)(owner, provider, row)) });
        }
        if (route === '/resolve' && req.method === 'POST') {
            const input = await body(req), provider = (0, accounts_store_1.videoProvider)(input.provider);
            if (input.requiresAuth)
                return (0, utils_1.sendJson)(res, { success: true, item: (0, personal_reference_1.renewPersonalVideoReference)(owner, provider, input.address) });
            let item;
            if (provider === 'bilibili')
                item = await (0, video_link_1.resolveFoliaBilibili)(input);
            else {
                let rows = [];
                try {
                    const raw = await (0, douyin_mcp_bridge_1.douyinMcpResolveShareUrl)(String(input.address || ''));
                    rows = (0, douyin_mcp_bridge_1.normalizeDouyinRows)(raw);
                }
                catch (error) {
                    if (!input.requiresAuth)
                        throw error;
                }
                if (!rows.length && input.requiresAuth) {
                    const id = String(input.address || '').match(/(?:douyin\.com\/(?:video|note)\/)(\d{10,24})/i)?.[1] || '';
                    if (id)
                        rows = [{ awemeId: id, title: id, author: '抖音视频' }];
                }
                if (!rows.length)
                    throw new Error('抖音未返回有效视频身份');
                item = (0, search_results_1.signSearchResults)(provider, '', rows, 1)[0];
            }
            const presented = (0, presentation_1.presentVideo)(owner, provider, item);
            return (0, utils_1.sendJson)(res, { success: true, item: input.requiresAuth ? { ...presented, requiresAuth: true, downloadToken: (0, search_results_1.issuePersonalVideoToken)(provider, presented.sourceId, presented.title, presented.author, owner) } : presented });
        }
        const accounts = /^\/accounts(?:\/(bilibili|douyin)(?:\/(start|cancel|verify|qrcode))?)?$/.exec(route);
        if (accounts) {
            if (!accounts[1] && req.method === 'GET') {
                const rows = [];
                for (const value of ['bilibili', 'douyin']) {
                    const provider = (0, accounts_store_1.videoProvider)(value);
                    let state = (0, account_login_1.videoAccountStatus)(owner, provider);
                    if (provider === 'bilibili' && state.status === 'authenticated' && !state.profile?.avatar) {
                        try {
                            await (0, bilibili_account_1.refreshBiliProfile)(owner);
                            state = (0, account_login_1.videoAccountStatus)(owner, provider);
                        }
                        catch { }
                    }
                    rows.push({ ...state, profile: state.profile ? { ...state.profile, avatar: (0, artwork_1.registerVideoArtwork)(owner, provider, 'avatar', state.profile.avatar) } : null, capabilities: library_1.videoCollections[provider].map(item => ({ ...item, ...((0, accounts_store_1.videoAccount)(owner, provider).capabilities?.[item.id] || { state: 'unverified' }) })) });
                }
                return (0, utils_1.sendJson)(res, { success: true, accounts: rows });
            }
            const provider = (0, accounts_store_1.videoProvider)(accounts[1]), action = accounts[2];
            if (action === 'qrcode' && req.method === 'GET') {
                const image = (0, account_login_1.videoQr)(owner, provider, url.searchParams.get('attemptId') || '');
                if (!image)
                    return (0, utils_1.sendJson)(res, { success: false, error: '平台正在生成二维码；需要时可打开官方窗口完成登录' }, 202);
                res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
                return res.end(Buffer.from(image.split(',')[1], 'base64'));
            }
            (0, authorization_1.requireFoliaWrite)(req);
            if (action === 'start' && req.method === 'POST') {
                (0, list_cache_1.clearVideoListCache)(owner, provider);
                const input = await body(req);
                const state = await (0, account_login_1.startVideoLogin)(owner, provider, input.refresh === true, input.visible === true);
                return (0, utils_1.sendJson)(res, { success: true, account: state });
            }
            if (action === 'cancel' && req.method === 'POST') {
                const input = await body(req);
                return (0, utils_1.sendJson)(res, { success: true, account: await (0, account_login_1.cancelVideoLogin)(owner, provider, input.attemptId) });
            }
            if (action === 'verify' && req.method === 'POST')
                return (0, utils_1.sendJson)(res, { success: true, account: await (0, account_login_1.verifyVideoAccount)(owner, provider) });
            if (!action && req.method === 'DELETE') {
                (0, list_cache_1.clearVideoListCache)(owner, provider);
                return (0, utils_1.sendJson)(res, { success: true, account: await (0, account_login_1.logoutVideo)(owner, provider) });
            }
        }
        if (route === '/catalog' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, items: (0, local_library_1.downloadedVideoLibrary)(owner) });
        if (route === '/metadata' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, item: await (0, presentation_1.videoMetadata)(owner, (0, accounts_store_1.videoProvider)(url.searchParams.get('provider')), url.searchParams.get('sourceId') || '') });
        if (route === '/cover' && req.method === 'GET') {
            const provider = (0, accounts_store_1.videoProvider)(url.searchParams.get('provider')), id = url.searchParams.get('sourceId') || '';
            return (0, artwork_1.sendVideoArtwork)(owner, provider, id, res);
        }
        const collection = /^\/library\/(bilibili|douyin)\/([a-z]+)$/.exec(route);
        if (collection && req.method === 'GET') {
            const provider = (0, accounts_store_1.videoProvider)(collection[1]), kind = collection[2], epoch = (0, accounts_store_1.videoEpoch)(owner, provider);
            if (!library_1.videoCollections[provider].some(item => item.id === kind))
                throw new Error('未知平台列表');
            const rawCursor = url.searchParams.get('cursor') || '', cursor = provider === 'douyin' && rawCursor === '0' ? '' : rawCursor, folder = url.searchParams.get('folder') || '';
            (0, library_1.requireVideoSession)(owner, provider);
            if (provider === 'douyin' && kind !== 'recommend' && cursor)
                (0, douyin_library_session_1.validDouyinCursor)(owner, kind, cursor);
            const force = url.searchParams.get('refresh') === '1';
            try {
                const data = kind === 'recommend' ? await (0, recommendations_1.readVideoRecommendations)(owner, provider, url.searchParams.get('batchId') || '', cursor, force, controller.signal) : await (0, list_cache_1.cachedVideoList)(owner, provider, [kind, cursor, folder], signal => provider === 'bilibili' ? (0, library_1.readBiliLibrary)(owner, kind, cursor, folder, force, signal) : (0, library_1.readDouyinLibrary)(owner, kind, cursor, signal, force), { force, signal: controller.signal });
                if ((0, accounts_store_1.videoEpoch)(owner, provider) !== epoch)
                    throw Object.assign(new Error('账号已变化，请刷新列表'), { statusCode: 409 });
                const state = (0, accounts_store_1.videoAccount)(owner, provider);
                if (state.capabilities?.[kind]?.state !== 'available' || Date.now() - Number(state.capabilities?.[kind]?.checkedAt || 0) > 60000)
                    (0, accounts_store_1.writeVideoAccount)(owner, provider, { capabilities: { ...state.capabilities, [kind]: { state: 'available', checkedAt: Date.now() } } });
                return (0, utils_1.sendJson)(res, { success: true, ...data, items: data.items.map(row => { const item = (0, presentation_1.presentVideo)(owner, provider, row); return { ...item, requiresAuth: true, downloadToken: (0, search_results_1.issuePersonalVideoToken)(provider, item.sourceId, item.title, item.author, owner) }; }) });
            }
            catch (error) {
                if (error.name !== 'AbortError' && (0, accounts_store_1.videoEpoch)(owner, provider) === epoch) {
                    const state = (0, accounts_store_1.videoAccount)(owner, provider);
                    (0, accounts_store_1.writeVideoAccount)(owner, provider, { ...(error.state === 'login_required' ? { status: 'expired' } : {}), capabilities: { ...state.capabilities, [kind]: { state: error.state || 'unavailable', error: String(error.message).slice(0, 250) } } });
                }
                throw error;
            }
        }
        (0, utils_1.sendJson)(res, { success: false, error: '视频工作区接口不存在' }, 404);
    })().catch(error => { if (!res.headersSent)
        (0, utils_1.sendJson)(res, { success: false, error: String(error.message || '视频平台请求失败').slice(0, 350), state: error.state || 'unavailable' }, error.statusCode || 400);
    else
        res.destroy(); });
    return true;
}
//# sourceMappingURL=api.js.map