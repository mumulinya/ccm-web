"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFoliaAi = runFoliaAi;
exports.testFoliaAi = testFoliaAi;
const llm_client_1 = require("../llm-client");
const state_1 = require("../state");
const ai_settings_1 = require("./ai-settings");
const ai_call_config_1 = require("./ai-call-config");
// 复用固定上游 AI 客户端与合同；端点和凭据仅由服务端保存的用户配置决定。
function boundFetch(config) {
    const expected = new URL(config.mode === 'gemini' ? 'https://generativelanguage.googleapis.com' : config.apiUrl);
    return async (input, init = {}) => {
        const target = new URL(String(input));
        if (target.origin !== expected.origin || config.mode === 'openai' && (target.pathname !== expected.pathname || target.search))
            throw Error('AI 请求目标与保存的端点不一致');
        const response = await fetch(target, { ...init, redirect: 'error', credentials: 'omit' });
        const chunks = [];
        let total = 0;
        for await (const chunk of response.body) {
            const bytes = Buffer.from(chunk);
            total += bytes.length;
            if (total > 8 * 1024 * 1024)
                throw Error('AI 响应过大');
            chunks.push(bytes);
        }
        return new Response(Buffer.concat(chunks), { status: response.status, headers: response.headers });
    };
}
function settings(config) {
    const values = { AI_PROVIDER: config.mode, OPENAI_API_URL: config.apiUrl, OPENAI_API_MODEL: config.model, OPENAI_API_TEMPERATURE: config.temperature, OPENAI_API_KEY: config.apiKey, GEMINI_API_KEY: config.apiKey };
    return { get: (name) => values[name] };
}
async function runFoliaAi(owner, prompt, options) {
    const config = (0, ai_settings_1.foliaAiRuntimeConfig)(owner);
    if (config.mode === 'ccm') {
        const scoped = (0, ai_call_config_1.foliaCcmAiCallConfig)((0, state_1.loadMusicAgentConfig)(), options.timeoutMs);
        const result = await (0, llm_client_1.callMusicLlm)(scoped, prompt, { ...options, retryTotalTimeoutMs: scoped.timeoutMs });
        if ((0, ai_settings_1.readFoliaAiConfig)(owner).revision !== config.revision)
            throw Error('AI 配置已变化，请重新操作');
        return result;
    }
    try {
        const client = require('./ai-runtime.cjs');
        const raw = await client.runAiJsonCompletion({ store: settings(config), systemPrompt: options.system, sourcePrompt: prompt,
            schema: options.schema, schemaName: options.schemaName, geminiResponseSchema: options.geminiSchema,
            maxTokens: options.maxTokens, timeoutMs: options.timeoutMs || 60000, disableReasoning: true, customFetch: boundFetch(config) });
        if ((0, ai_settings_1.readFoliaAiConfig)(owner).revision !== config.revision)
            throw Error('AI 配置已变化，请重新操作');
        return raw;
    }
    catch (error) {
        const reason = String(error.message || 'AI 请求失败');
        throw Error((config.apiKey ? reason.split(config.apiKey).join('[密钥已隐藏]') : reason).slice(0, 500));
    }
}
async function testFoliaAi(owner, input) {
    const config = (0, ai_settings_1.foliaAiRuntimeConfig)(owner, input);
    if (config.mode === 'ccm') {
        // 与主题生成采用相同的有界等待；慢响应不能误报为账号配置错误。
        try {
            const text = await (0, llm_client_1.callMusicLlm)((0, ai_call_config_1.foliaCcmAiCallConfig)((0, state_1.loadMusicAgentConfig)(), 60000), 'Reply OK.', { maxTokens: 16, timeoutMs: 60000, retryTotalTimeoutMs: 60000 });
            if ((0, ai_settings_1.readFoliaAiConfig)(owner).revision !== config.revision)
                throw Error('AI 配置已变化');
            return { ok: true, text: text.slice(0, 200), provider: 'ccm' };
        }
        catch (error) {
            const reason = String(error?.message || '');
            return { ok: false, error: /配置已变化/.test(reason) ? 'AI 配置已变化，请重新测试' : /timeout|timed out|超时/i.test(reason) ? 'CCM 模型响应超时，请稍后重试' : /503|overload|429/i.test(reason) ? 'CCM 模型服务繁忙，请稍后重试' : 'CCM 模型连接失败，请检查音乐助手模型配置及网络' };
        }
    }
    const result = await require('./ai-runtime.cjs').runAiConnectionTest({ provider: config.mode, apiUrl: config.apiUrl, apiKey: config.apiKey, model: config.model }, { customFetch: boundFetch(config), timeoutMs: 20000 });
    if ((0, ai_settings_1.readFoliaAiConfig)(owner).revision !== config.revision)
        throw Error('AI 配置已变化，请重新测试');
    return result;
}
//# sourceMappingURL=ai-runtime.js.map