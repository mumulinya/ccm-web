"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaProviderStatus = foliaProviderStatus;
const accounts_1 = require("./accounts");
const runtime_1 = require("./runtime");
function foliaProviderStatus(owner) {
    return { success: true, runtime: (0, runtime_1.foliaRuntimeStatus)(), providers: ['local', 'netease', 'qq', 'kugou', 'navidrome'].map(provider => {
            const state = (0, accounts_1.account)(owner, provider);
            return { provider, configured: provider !== 'navidrome' || !!state.baseUrl, hasSession: !!state.cookieMarker || !!state.sessionHints?.token || provider === 'navidrome' && !!state.password, profile: state.profile || null, checkedAt: state.authenticatedAt || null, sessionStatus: state.authenticatedAt ? '会话已保存，连接时核验' : provider === 'local' ? '无需登录' : provider === 'navidrome' && state.password ? '已配置，连接时核验' : '未登录', instanceId: state.instanceId || 'default', capabilities: { search: true, playback: true, lyrics: true, ccmPlaylists: true, platformPlaylists: provider !== 'local', platformMutations: ['netease', 'kugou', 'navidrome'].includes(provider) } };
        }) };
}
//# sourceMappingURL=provider-status.js.map