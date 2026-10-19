"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAiEndpoint = void 0;
exports.normalizeFoliaAiEndpoint = normalizeFoliaAiEndpoint;
exports.readFoliaAiConfig = readFoliaAiConfig;
exports.saveFoliaAiConfig = saveFoliaAiConfig;
exports.foliaAiRuntimeConfig = foliaAiRuntimeConfig;
const accounts_1 = require("./accounts");
const credential_store_1 = require("../../../core/credential-store");
// Folia 专用 AI 配置与 CCM 模型模式分开；密钥只保存在当前用户的加密凭据库。
const provider = 'folia-ai';
exports.defaultAiEndpoint = 'https://api.openai.com/v1/chat/completions';
function normalizeFoliaAiEndpoint(input) {
    const url = new URL(input || exports.defaultAiEndpoint);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
        throw Error('AI 地址必须是不含凭据或查询参数的 HTTP/HTTPS 地址');
    const base = url.pathname.replace(/\/+$/, '');
    if (!base || base === '/')
        url.pathname = '/v1/chat/completions';
    else if (/\/v\d+$/.test(base))
        url.pathname = base + '/chat/completions';
    return url.href;
}
function readFoliaAiConfig(owner) {
    const state = (0, accounts_1.account)(owner, provider);
    return { mode: state.mode || 'ccm', apiUrl: state.apiUrl || exports.defaultAiEndpoint, model: state.model || '', temperature: state.temperature ?? .7,
        hasOpenAiKey: !!state.openaiKey, hasGeminiKey: !!state.geminiKey, revision: Number(state.revision || 0) };
}
function saveFoliaAiConfig(owner, input) {
    const previous = (0, accounts_1.account)(owner, provider);
    if (input.revision !== Number(previous.revision || 0))
        throw Object.assign(Error('AI 设置已在其他窗口修改，请刷新后重试'), { statusCode: 409 });
    if (!['ccm', 'openai', 'gemini'].includes(input.mode) || typeof input.apiUrl !== 'string' || input.apiUrl.length > 2048 || typeof input.model !== 'string' || input.model.length > 256 || !Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2)
        throw Error('AI 配置无效');
    const apiUrl = normalizeFoliaAiEndpoint(input.apiUrl);
    const fields = { mode: input.mode, apiUrl, model: input.model.trim(), temperature: input.temperature, revision: Number(previous.revision || 0) + 1 };
    for (const name of ['openai', 'gemini']) {
        const key = name + 'Key', typed = input[key];
        if (typed !== undefined && (typeof typed !== 'string' || typed.length > 4096 || /[\r\n]/.test(typed)))
            throw Error('AI 密钥无效');
        fields[key] = input['clear' + name + 'Key'] === true ? null : previous[key];
        if (name === 'openai' && apiUrl !== previous.apiUrl && !typed?.trim())
            fields[key] = null;
        if (typed?.trim())
            fields[key] = (0, credential_store_1.protectCredential)(`folia:${owner}:ai`, key, typed.trim());
    }
    if (input.mode !== 'ccm' && !fields[input.mode + 'Key'])
        throw Error('请输入所选 AI 服务的密钥；更改地址后需要重新配置密钥');
    (0, accounts_1.setAccount)(owner, provider, fields);
    return readFoliaAiConfig(owner);
}
function foliaAiRuntimeConfig(owner, draft) {
    const saved = (0, accounts_1.account)(owner, provider), config = readFoliaAiConfig(owner);
    if (!draft)
        return { ...config, apiKey: config.mode === 'ccm' ? '' : (0, credential_store_1.resolveCredential)(saved[config.mode + 'Key']) };
    if (!['ccm', 'openai', 'gemini'].includes(draft.mode))
        throw Error('AI 模式无效');
    const apiUrl = normalizeFoliaAiEndpoint(draft.apiUrl || exports.defaultAiEndpoint), key = draft.mode + 'Key', typed = draft[key];
    if (typed !== undefined && (typeof typed !== 'string' || typed.length > 4096 || /[\r\n]/.test(typed)))
        throw Error('AI 密钥无效');
    let apiKey = typeof typed === 'string' ? typed.trim() : '';
    if (!apiKey && saved[key] && (draft.mode !== 'openai' || apiUrl === saved.apiUrl))
        apiKey = (0, credential_store_1.resolveCredential)(saved[key]);
    if (draft.mode !== 'ccm' && !apiKey)
        throw Error('请输入此 AI 服务的密钥');
    return { ...config, mode: draft.mode, apiUrl, model: String(draft.model || '').slice(0, 256), apiKey };
}
//# sourceMappingURL=ai-settings.js.map