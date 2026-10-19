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
exports.ExtensionOAuthProvider = void 0;
exports.extensionOAuthProvider = extensionOAuthProvider;
exports.extensionOAuthConnectionIdentity = extensionOAuthConnectionIdentity;
exports.startExtensionOAuth = startExtensionOAuth;
exports.finishExtensionOAuth = finishExtensionOAuth;
exports.disconnectExtensionOAuth = disconnectExtensionOAuth;
exports.extensionOAuthStatus = extensionOAuthStatus;
require("../core/runtime-paths");
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const auth_js_1 = require("@modelcontextprotocol/sdk/client/auth.js");
const credential_store_1 = require("../core/credential-store");
const atomic_json_file_1 = require("../core/atomic-json-file");
const extension_state_1 = require("./extension-state");
const secure_public_network_1 = require("./secure-public-network");
const file = path.join(extension_state_1.EXTENSIONS_ROOT, "oauth.json");
function readAll() { return (0, atomic_json_file_1.readJsonWithBackup)(file, {}); }
function read(name) {
    const ref = readAll()[(0, extension_state_1.extensionHash)(name)];
    return ref ? JSON.parse((0, credential_store_1.resolveCredential)(ref)) : undefined;
}
function saveUnlocked(value) {
    const rows = readAll();
    rows[(0, extension_state_1.extensionHash)(value.server)] = (0, credential_store_1.protectCredential)(`extension-oauth:${value.server}`, "state", JSON.stringify({ ...value, updatedAt: new Date().toISOString() }));
    (0, atomic_json_file_1.writeJsonAtomic)(file, rows);
}
function save(value) { (0, atomic_json_file_1.withFileLock)(file, () => saveUnlocked(value)); }
class ExtensionOAuthProvider {
    name;
    redirect;
    epoch;
    constructor(name, redirect) {
        this.name = name;
        this.redirect = redirect;
        this.epoch = read(name)?.epoch;
    }
    get data() { const value = read(this.name); if (!value || value.epoch !== this.epoch)
        throw new Error("扩展连接已换代，请重新连接账号"); return value; }
    get redirectUrl() { return this.data.redirectUrl; }
    get clientMetadata() {
        return { client_name: "CCM", redirect_uris: [this.redirectUrl],
            grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" };
    }
    state() { return this.data.state || ""; }
    clientInformation() { return this.data.client; }
    saveClientInformation(client) { save({ ...this.data, client }); }
    tokens() { return this.data.tokens; }
    saveTokens(tokens) {
        const current = this.data;
        save({ ...current, tokens: { ...tokens, refresh_token: tokens.refresh_token || current.tokens?.refresh_token },
            status: "connected", authorizationUrl: undefined, state: undefined, verifier: undefined });
    }
    async redirectToAuthorization(url) {
        await (0, secure_public_network_1.resolveSafePublicHttpsUrl)(url.origin + url.pathname);
        if (!this.redirect)
            throw new Error("MCP 需要重新登录，请到扩展中心连接账号");
        save({ ...this.data, authorizationUrl: url.toString(), status: "waiting" });
        await this.redirect(url);
    }
    saveCodeVerifier(verifier) { save({ ...this.data, verifier }); }
    codeVerifier() { const value = this.data.verifier; if (!value)
        throw new Error("OAuth 登录已失效，请重新连接"); return value; }
    invalidateCredentials(scope) {
        const current = this.data;
        if (["all", "tokens"].includes(scope))
            current.tokens = undefined;
        if (["all", "client"].includes(scope))
            current.client = undefined;
        if (["all", "verifier"].includes(scope))
            current.verifier = undefined;
        save({ ...current, status: "auth_required" });
    }
}
exports.ExtensionOAuthProvider = ExtensionOAuthProvider;
function extensionOAuthProvider(server, url) {
    const value = server ? read(server) : undefined;
    return value && (!url || value.url === url) && value.status !== "disconnected" ? new ExtensionOAuthProvider(server) : undefined;
}
// Internal connection identity; token refresh keeps the same epoch, while a
// new login/disconnect must replace any transport holding the old provider.
function extensionOAuthConnectionIdentity(server) {
    const value = read(server);
    return value ? (0, extension_state_1.extensionHash)([value.url, value.epoch]) : "";
}
async function startExtensionOAuth(config, redirectUrl, principal, fetchFn = secure_public_network_1.securePublicFetch) {
    if (!config?.url)
        throw new Error("只有远程 MCP 支持 OAuth 连接");
    await (0, secure_public_network_1.resolveSafePublicHttpsUrl)(config.url);
    const previous = read(config.name);
    const state = crypto.randomBytes(32).toString("base64url");
    const epoch = crypto.randomUUID();
    save({ server: config.name, url: config.url, redirectUrl, client: previous?.url === config.url ? previous.client : undefined,
        tokens: undefined, epoch, state, owner: principal.userId, session: principal.sessionId, expiresAt: Date.now() + 10 * 60_000, status: "starting" });
    let authorizationUrl = "";
    const provider = new ExtensionOAuthProvider(config.name, async (url) => { authorizationUrl = url.toString(); });
    try {
        await (0, auth_js_1.auth)(provider, { serverUrl: config.url, fetchFn });
        return { server: config.name, status: read(config.name)?.status, authorizationUrl };
    }
    catch (error) {
        const current = read(config.name);
        if (current?.epoch === epoch)
            save({ ...current, state: undefined, verifier: undefined, status: "failed" });
        throw error;
    }
}
async function finishExtensionOAuth(query, principal, fetchFn = secure_public_network_1.securePublicFetch) {
    const state = String(query.state || "");
    const found = (0, atomic_json_file_1.withFileLock)(file, () => {
        const value = Object.values(readAll()).map(ref => JSON.parse((0, credential_store_1.resolveCredential)(ref)))
            .find(row => row.state && row.state.length === state.length && crypto.timingSafeEqual(Buffer.from(row.state), Buffer.from(state)));
        if (!value || value.owner !== principal.userId || value.session !== principal.sessionId || value.expiresAt < Date.now() || value.status !== "waiting") {
            throw Object.assign(new Error("OAuth 登录状态无效或已过期，请重新连接"), { code: "EXTENSION_OAUTH_STATE_INVALID", statusCode: 409 });
        }
        saveUnlocked({ ...value, status: "exchanging" });
        return value;
    });
    try {
        if (query.error || !query.code)
            throw new Error("登录已取消或未完成授权");
        await (0, auth_js_1.auth)(new ExtensionOAuthProvider(found.server), { serverUrl: found.url, authorizationCode: String(query.code), fetchFn });
        return { server: found.server, status: "connected" };
    }
    catch (error) {
        const current = read(found.server);
        if (current?.epoch === found.epoch)
            save({ ...current, state: undefined, verifier: undefined, status: "auth_required" });
        throw error;
    }
}
function disconnectExtensionOAuth(server) {
    const current = read(server);
    if (current)
        save({ ...current, epoch: crypto.randomUUID(), tokens: undefined, verifier: undefined, state: undefined, authorizationUrl: undefined, status: "disconnected" });
}
function extensionOAuthStatus(server, url) {
    const value = read(server);
    if (value && url && value.url !== url)
        return { server, status: "auth_required", configured: false, updatedAt: value.updatedAt || "" };
    return { server, status: value?.status || "not_configured", configured: !!value?.tokens,
        updatedAt: value?.updatedAt || "" };
}
//# sourceMappingURL=extension-oauth.js.map