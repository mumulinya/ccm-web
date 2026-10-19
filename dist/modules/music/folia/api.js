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
exports.foliaOwner = foliaOwner;
exports.handleFoliaApi = handleFoliaApi;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../../../core/utils");
const server_static_1 = require("../../../server-static");
const library_1 = require("./library");
const accounts_1 = require("./accounts");
const login_fence_1 = require("./login-fence");
const proxy_1 = require("./proxy");
const workspace_catalog_1 = require("./workspace-catalog");
const local_assets_1 = require("./local-assets");
const stream_1 = require("stream");
const state_1 = require("../state");
const auxiliary_1 = require("./auxiliary");
const authorization_1 = require("./authorization");
const video_link_1 = require("./video-link");
const provider_status_1 = require("./provider-status");
const cover_1 = require("./cover");
const api_1 = require("../video/api");
const cover_settings_1 = require("./cover-settings");
const bodian_1 = require("./bodian");
const navidrome_settings_1 = require("./navidrome-settings");
const sync_settings_1 = require("./sync-settings");
const ai_settings_1 = require("./ai-settings");
const ai_runtime_1 = require("./ai-runtime");
// 独立路由模块，现有 music.ts 只负责装配。
async function jsonBody(req, maxBytes = 1024 * 1024) {
    let total = 0;
    const chunks = [];
    for await (const chunk of req) {
        total += chunk.length;
        if (total > maxBytes)
            throw Object.assign(new Error('请求过大'), { statusCode: 413 });
        chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function foliaOwner(req) { return String(req.ccmAuth?.userId || 'workspace'); }
function handleFoliaApi(pathname, req, res) {
    if ((0, api_1.handleVideoWorkspaceApi)(pathname, req, res))
        return true;
    if (!pathname.startsWith('/api/music/folia/'))
        return false;
    void (async () => {
        const owner = foliaOwner(req), route = pathname.slice('/api/music/folia'.length), parsed = new URL(req.url, 'http://ccm.local');
        if (route === '/ai/config' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { config: (0, ai_settings_1.readFoliaAiConfig)(owner) });
        if (route === '/ai/config' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, { config: (0, ai_settings_1.saveFoliaAiConfig)(owner, await jsonBody(req, 32768)) });
        }
        if (route === '/ai/test' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, await (0, ai_runtime_1.testFoliaAi)(owner, await jsonBody(req, 32768)));
        }
        if (route === '/sync/config' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { config: (0, sync_settings_1.readFoliaSyncConfig)(owner) });
        if (route === '/sync/config' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, { config: (0, sync_settings_1.saveFoliaSyncConfig)(owner, await jsonBody(req, 32768)) });
        }
        if (route === '/sync/request' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, await (0, sync_settings_1.requestFoliaSync)(owner, await jsonBody(req, 4 * 1024 * 1024)));
        }
        if (route === '/sync/test' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, await (0, sync_settings_1.requestFoliaSync)(owner, await jsonBody(req, 32768), fetch, true));
        }
        if (route === '/bodian' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, await (0, bodian_1.requestFoliaBodian)(owner, await jsonBody(req, 32768)));
        }
        if (route === '/cover' && req.method === 'GET')
            return (0, cover_1.sendFoliaCover)(parsed.searchParams.get('url') || '', res, owner);
        if (route === '/cover-settings' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, settings: (0, cover_settings_1.readFoliaCoverSettings)(owner) });
        if (route === '/cover-settings' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, { success: true, settings: (0, cover_settings_1.saveFoliaCoverSettings)(owner, await jsonBody(req, 4096)) });
        }
        if (route === '/session-references' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, sessions: (0, accounts_1.foliaSessionReferences)(owner) });
        if (route === '/login/cancel' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await jsonBody(req);
            if (input.provider === 'bodian') {
                const result = await (0, bodian_1.requestFoliaBodian)(owner, { operation: 'login_qr_cancel', params: { key: input.key || '' } });
                return (0, utils_1.sendJson)(res, { success: result.ok });
            }
            return (0, utils_1.sendJson)(res, (0, login_fence_1.cancelFoliaLogin)(owner, input.provider, input));
        }
        if (route === '/login/clear' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await jsonBody(req);
            if (input.provider === 'bodian') {
                await (0, bodian_1.requestFoliaBodian)(owner, { operation: 'logout' });
                return (0, utils_1.sendJson)(res, { success: true });
            }
            if (!['netease', 'qq', 'kugou'].includes(input.provider))
                throw new Error('不支持的账号音源');
            (0, login_fence_1.clearFoliaSession)(owner, input.provider);
            return (0, utils_1.sendJson)(res, { success: true });
        }
        if (route === '/video/resolve' && req.method === 'POST')
            return (0, utils_1.sendJson)(res, { success: true, item: await (0, video_link_1.resolveFoliaBilibili)(await jsonBody(req)) });
        if (route === '/lyric-proxy' && ['GET', 'POST'].includes(req.method))
            return (0, auxiliary_1.foliaLyricProxy)(req, res, req.method === 'POST' ? await jsonBody(req) : undefined);
        if (['/generate-theme', '/generate-theme_openai'].includes(route) && req.method === 'POST')
            return (0, utils_1.sendJson)(res, await (0, auxiliary_1.foliaTheme)(await jsonBody(req), owner));
        if (route === '/segment-lyrics' && req.method === 'POST')
            return (0, utils_1.sendJson)(res, await (0, auxiliary_1.foliaSegmentLyrics)(await jsonBody(req), owner));
        if (route === '/library' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, state: (0, workspace_catalog_1.musicLibraryProjection)((0, library_1.readFoliaLibrary)(owner)) });
        if (route === '/library' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, { success: true, state: (0, workspace_catalog_1.musicLibraryProjection)((0, library_1.updateFoliaLibrary)(owner, await jsonBody(req))) });
        }
        if (route === '/catalog' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, tracks: (0, workspace_catalog_1.queryWorkspaceCatalog)('music', parsed.searchParams.get('q') || '') });
        if (route === '/video/catalog' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, { success: true, tracks: (0, workspace_catalog_1.queryWorkspaceCatalog)('video', parsed.searchParams.get('q') || '') });
        if (route === '/local/lyrics' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, await (0, local_assets_1.readLocalMusicLyrics)(parsed.searchParams.get('filename'), parsed.searchParams.get('formats') || undefined));
        if (route === '/local/lyrics' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await jsonBody(req);
            return (0, utils_1.sendJson)(res, (0, local_assets_1.writeLocalMusicLyrics)(input.filename, input.lyric, input.format));
        }
        if (route === '/local/cover' && req.method === 'GET')
            return (0, local_assets_1.sendLocalMusicCover)(parsed.searchParams.get('filename'), res);
        if (route === '/local/cover' && req.method === 'PUT') {
            (0, authorization_1.requireFoliaWrite)(req);
            const input = await jsonBody(req, 12 * 1024 * 1024);
            return (0, utils_1.sendJson)(res, (0, local_assets_1.writeLocalMusicCover)(input.filename, input.content, input.extension));
        }
        if (route === '/local/stream' && ['GET', 'HEAD'].includes(req.method))
            return (0, local_assets_1.streamLocalMusic)(parsed.searchParams.get('filename'), req, res);
        if (route === '/providers' && req.method === 'GET')
            return (0, utils_1.sendJson)(res, (0, provider_status_1.foliaProviderStatus)(owner));
        const commandMatch = /^\/commands\/([^/]+)\/decision$/.exec(route);
        if (commandMatch && req.method === 'GET') {
            if (req.ccmAuth?.kind === 'browser' && !['admin', 'operator'].includes(req.ccmAuth.role))
                return (0, utils_1.sendJson)(res, { success: false, error: '需要播放操作权限' }, 403);
            const command = (0, state_1.listMusicRemoteCommands)().find(item => item.id === commandMatch[1] && ['claimed', 'playing'].includes(item.status));
            if (!command?.decision)
                return (0, utils_1.sendJson)(res, { success: false, error: '播放命令已失效' }, 409);
            return (0, utils_1.sendJson)(res, { success: true, decision: command.decision });
        }
        if (route === '/runtime-config.js' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
            return res.end('window.__CCM_FOLIA__=' + JSON.stringify({ embedded: true, owner, sessions: (0, accounts_1.foliaSessionReferences)(owner), navidrome: !!(0, accounts_1.account)(owner, 'navidrome').baseUrl, navidromeInstance: (0, accounts_1.account)(owner, 'navidrome').instanceId || 'default', navidromeConfig: (0, navidrome_settings_1.foliaNavidromePublicConfig)(owner) }) + ';window.__FOLIA_RUNTIME_CONFIG__={aiProvider:"openai"};');
        }
        if (route === '/navidrome/config' && req.method === 'POST') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, await (0, navidrome_settings_1.configureFoliaNavidrome)(owner, await jsonBody(req)));
        }
        if (route === '/navidrome/config' && req.method === 'DELETE') {
            (0, authorization_1.requireFoliaWrite)(req);
            return (0, utils_1.sendJson)(res, (0, navidrome_settings_1.clearFoliaNavidrome)(owner));
        }
        const nav = /^\/navidrome\/instances\/([a-zA-Z0-9_-]{1,160})\/rest\/([a-zA-Z0-9.]+)$/.exec(route);
        if (nav && req.method === 'GET') {
            (0, proxy_1.requireFoliaNavidromeInstance)(owner, nav[1]);
            if ((0, authorization_1.providerOperationWrites)('/' + nav[2], 'navidrome'))
                (0, authorization_1.requireFoliaWrite)(req);
            if (['stream', 'stream.view', 'getCoverArt', 'getCoverArt.view'].includes(nav[2])) {
                const { target } = await (0, proxy_1.requestFoliaNavidrome)(owner, nav[2], parsed.searchParams);
                const response = await fetch(target, { headers: req.headers.range ? { Range: req.headers.range } : {}, signal: AbortSignal.timeout(30_000), redirect: 'error' });
                res.writeHead(response.status, Object.fromEntries(['content-type', 'content-length', 'content-range', 'accept-ranges'].flatMap(key => response.headers.has(key) ? [[key, response.headers.get(key)]] : [])));
                if (response.body) {
                    const stream = stream_1.Readable.fromWeb(response.body);
                    res.on('close', () => stream.destroy());
                    stream.on('error', () => res.destroy());
                    stream.pipe(res);
                }
                else
                    res.end();
                return;
            }
            return (0, utils_1.sendJson)(res, await (0, proxy_1.readFoliaNavidrome)(owner, nav[2], parsed.searchParams));
        }
        const provider = /^\/providers\/(netease|qq|kugou)(\/.*)$/.exec(route);
        if (provider && ['GET', 'POST'].includes(req.method)) {
            if ((0, authorization_1.providerOperationWrites)(provider[2], provider[1]))
                (0, authorization_1.requireFoliaWrite)(req);
            return (0, proxy_1.proxyFoliaProvider)(owner, provider[1], provider[2], req, res, req.method === 'POST' ? await jsonBody(req) : undefined);
        }
        if (route === '/source' && req.method === 'GET') {
            const file = path.resolve(__dirname, '../../../../source/ccm-folia-source.tar.gz');
            if (!fs.existsSync(file))
                return (0, utils_1.sendJson)(res, { success: false, error: '当前为开发环境；完整源码见仓库，发布构建会生成源码包' }, 404);
            return (0, server_static_1.sendFile)(res, file, req);
        }
        (0, utils_1.sendJson)(res, { success: false, error: '接口不存在' }, 404);
    })().catch(error => { if (!res.headersSent)
        (0, utils_1.sendJson)(res, { success: false, error: error.message, ...(error.state ? { state: (0, workspace_catalog_1.musicLibraryProjection)(error.state) } : {}) }, error.statusCode || 400);
    else
        res.destroy(); });
    return true;
}
//# sourceMappingURL=api.js.map