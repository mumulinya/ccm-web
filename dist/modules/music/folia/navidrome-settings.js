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
exports.configureFoliaNavidrome = configureFoliaNavidrome;
exports.clearFoliaNavidrome = clearFoliaNavidrome;
exports.foliaNavidromePublicConfig = foliaNavidromePublicConfig;
const crypto = __importStar(require("crypto"));
const credential_store_1 = require("../../../core/credential-store");
const platform_http_1 = require("../platform-http");
const accounts_1 = require("./accounts");
// 原生设置先验证连接，成功后原子替换凭据；失败保留原实例与播放引用。
async function configureFoliaNavidrome(owner, input) {
    const url = new URL(input.baseUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw new Error('无效 Navidrome 地址');
    if (!input.username || !input.password)
        throw new Error('请填写用户名和密码');
    const baseUrl = url.toString().replace(/\/$/, ''), username = String(input.username), password = String(input.password);
    const target = new URL(baseUrl + '/rest/ping.view'), salt = crypto.randomBytes(12).toString('hex');
    for (const [key, value] of Object.entries({ u: username, t: crypto.createHash('md5').update(password + salt).digest('hex'), s: salt, v: '1.16.1', c: 'CCM-Folia', f: 'json' }))
        target.searchParams.set(key, value);
    const result = await (0, platform_http_1.musicPlatformJson)({ url: target.toString(), allowedHosts: [url.hostname] });
    if (result?.['subsonic-response']?.status !== 'ok')
        throw new Error('Navidrome 连接验证失败，请检查地址、用户名和密码');
    const instanceId = crypto.createHash('sha256').update(url.toString() + ':' + username).digest('hex').slice(0, 24);
    (0, accounts_1.setAccount)(owner, 'navidrome', { baseUrl, username, password: (0, credential_store_1.protectCredential)(`folia:${owner}:navidrome`, 'password', password), instanceId });
    return { success: true, instanceId, baseUrl, username };
}
function clearFoliaNavidrome(owner) {
    (0, accounts_1.setAccount)(owner, 'navidrome', { baseUrl: '', username: '', password: null, instanceId: null });
    return { success: true };
}
function foliaNavidromePublicConfig(owner) {
    const value = (0, accounts_1.account)(owner, 'navidrome');
    return value.baseUrl ? { baseUrl: value.baseUrl, username: value.username, instanceId: value.instanceId } : null;
}
//# sourceMappingURL=navidrome-settings.js.map