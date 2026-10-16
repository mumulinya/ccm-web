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
exports.account = account;
exports.setAccount = setAccount;
exports.hideProviderSecrets = hideProviderSecrets;
exports.foliaSessionReferences = foliaSessionReferences;
exports.redactFoliaResponse = redactFoliaResponse;
exports.revealProviderValue = revealProviderValue;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../../core/utils");
const credential_store_1 = require("../../../core/credential-store");
// 音源凭据只保存在 CCM 加密仓库；浏览器仅收到不透明引用。
const file = path.join(utils_1.CCM_DIR, 'folia-accounts.json');
function read() { try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
catch (e) {
    if (e.code === 'ENOENT')
        return {};
    throw e;
} }
function save(data) { fs.mkdirSync(path.dirname(file), { recursive: true }); const temp = file + '.' + process.pid + '.tmp'; fs.writeFileSync(temp, JSON.stringify(data), { mode: 0o600 }); fs.renameSync(temp, file); }
function account(owner, provider) { return read()[`${owner}:${provider}`] || {}; }
function setAccount(owner, provider, fields) { const data = read(), key = `${owner}:${provider}`; data[key] = { ...data[key], ...fields }; save(data); return data[key]; }
function hideValue(owner, provider, value, cookie = false, cookieHint = 'cookie') {
    const current = account(owner, provider), digest = crypto.createHash('sha256').update(value).digest('hex');
    const marker = current.secretDigests?.[digest] || 'ccm_folia_' + crypto.randomBytes(18).toString('hex');
    if (!current.secrets?.[marker] || cookie)
        setAccount(owner, provider, { secrets: { ...current.secrets, [marker]: current.secrets?.[marker] || (0, credential_store_1.protectCredential)(`folia:${owner}:${provider}`, marker, value) }, secretDigests: { ...current.secretDigests, [digest]: marker }, ...(cookie ? { ...(cookieHint === 'cookie' ? { cookieMarker: marker } : {}), sessionHints: { ...current.sessionHints, [cookieHint]: provider === 'qq' ? 'qqmusic_session=' + marker : marker } } : {}) });
    return marker;
}
function hideProviderSecrets(owner, provider, input, cookieHint = 'cookie') {
    if (Array.isArray(input))
        return input.map(value => hideProviderSecrets(owner, provider, value, cookieHint));
    if (!input || typeof input !== 'object')
        return input;
    return Object.fromEntries(Object.entries(input).map(([key, value]) => {
        if (/^(cookie|token|access_token|refresh_token|password|passwordHash|dfid)$/i.test(key)) {
            if (key === 'cookie' && Array.isArray(value)) {
                const cookies = value.filter(item => typeof item === 'string');
                if (cookies.length) {
                    const current = account(owner, provider), pairs = new Map();
                    const old = current.cookieMarker ? String(revealProviderValue(owner, provider, current.cookieMarker)).split(';') : [];
                    for (const item of [...old, ...cookies.map(item => item.split(';')[0])]) {
                        const equal = item.indexOf('=');
                        if (equal > 0)
                            pairs.set(item.slice(0, equal).trim(), item.slice(equal + 1).trim());
                    }
                    hideValue(owner, provider, [...pairs].map(([name, secret]) => name + '=' + secret).join('; '), true, cookieHint);
                }
                return [key, cookies.map(item => { const equal = item.indexOf('='); return equal < 0 ? hideValue(owner, provider, item) : item.slice(0, equal + 1) + hideValue(owner, provider, item.slice(equal + 1)); })];
            }
            if (typeof value === 'string' && value) {
                const marker = hideValue(owner, provider, value, key === 'cookie', cookieHint);
                if (provider === 'kugou' && ['token', 'dfid'].includes(key)) {
                    const state = account(owner, provider);
                    setAccount(owner, provider, { sessionHints: { ...state.sessionHints, [key]: marker } });
                }
                return [key, key === 'cookie' && provider === 'qq' ? 'qqmusic_session=' + marker : marker];
            }
            if (Array.isArray(value))
                return [key, value.map(item => typeof item === 'string' ? hideValue(owner, provider, item) : hideProviderSecrets(owner, provider, item))];
        }
        if (provider === 'kugou' && key === 'userid' && (typeof value === 'string' || typeof value === 'number')) {
            const state = account(owner, provider);
            setAccount(owner, provider, { sessionHints: { ...state.sessionHints, userid: String(value) } });
        }
        return [key, hideProviderSecrets(owner, provider, value, cookieHint)];
    }));
}
function foliaSessionReferences(owner) {
    return Object.fromEntries(['netease', 'qq', 'kugou'].map(provider => { const state = account(owner, provider); const hints = { ...state.sessionHints, ...(state.cookieMarker ? { cookie: provider === 'qq' ? 'qqmusic_session=' + state.cookieMarker : state.cookieMarker } : {}) }; return [provider, Object.fromEntries(['cookie', 'anonymous_cookie', 'token', 'dfid', 'userid'].flatMap(key => typeof hints[key] === 'string' ? [[key, hints[key]]] : []))]; }));
}
function redactFoliaResponse(input) {
    if (Array.isArray(input))
        return input.map(redactFoliaResponse);
    if (!input || typeof input !== 'object')
        return input;
    return Object.fromEntries(Object.entries(input).filter(([key]) => !/^(cookie|token|access_token|refresh_token|password|passwordHash|dfid)$/i.test(key)).map(([key, value]) => [key, redactFoliaResponse(value)]));
}
function revealProviderValue(owner, provider, value) {
    if (typeof value === 'string') {
        return value.replace(/ccm_folia_[a-f0-9]{36}/g, marker => { const reference = account(owner, provider).secrets?.[marker]; if (!reference)
            throw new Error('音源会话已过期'); return (0, credential_store_1.resolveCredential)(reference); });
    }
    if (Array.isArray(value))
        return value.map(item => revealProviderValue(owner, provider, item));
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revealProviderValue(owner, provider, item)]));
    return value;
}
//# sourceMappingURL=accounts.js.map