"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigationDigest = exports.SCOPE_NAVIGATION_CONTRACT = void 0;
exports.stableNavigationJson = stableNavigationJson;
exports.buildScopeNavigationSnapshot = buildScopeNavigationSnapshot;
exports.scopeNavigationRequestOptions = scopeNavigationRequestOptions;
const crypto_1 = require("crypto");
const model_request_context_1 = require("./model-request-context");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
exports.SCOPE_NAVIGATION_CONTRACT = 'scope-navigation-v2';
const navigationDigest = (value) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
exports.navigationDigest = navigationDigest;
// 固定对象字段顺序；数组的业务顺序由调用方明确提供。
function stableNavigationJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableNavigationJson).join(',')}]`;
    if (value && typeof value === 'object')
        return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableNavigationJson(value[key])}`).join(',')}}`;
    return JSON.stringify(value ?? null);
}
function buildScopeNavigationSnapshot(input) {
    const blocks = [...input.blocks].sort((a, b) => String(a.path || a.projectId).localeCompare(String(b.path || b.projectId), 'en'));
    const identity = { scope: input.scope, scopeId: input.scopeId, contractVersion: exports.SCOPE_NAVIGATION_CONTRACT };
    const body = blocks.map(block => `资料块\n${stableNavigationJson({ path: block.path, projectId: block.projectId })}\n${block.content}\n资料校验\n${stableNavigationJson({ checksum: block.checksum })}`).join('\n\n');
    const { checksum: _triggerChecksum, ...semanticMetadata } = input.metadata || {};
    const inputDigest = (0, exports.navigationDigest)(stableNavigationJson({ identity, system: input.system,
        blocks: blocks.map(({ checksum: _checksum, ...block }) => block), metadata: semanticMetadata }));
    return Object.freeze({ ...identity, system: input.system, sourceCount: blocks.length, inputDigest,
        prompt: `作用域身份\n${stableNavigationJson(identity)}\n\n${body}\n\n变化元数据\n${stableNavigationJson(input.metadata)}` });
}
function scopeNavigationRequestOptions(config, snapshot) {
    const modelRequestContext = (0, model_request_context_1.statelessModelRequestContext)(config, { purpose: 'scope_navigation_generation', scope: snapshot.scope, scopeId: snapshot.scopeId });
    const identity = (0, exports.navigationDigest)({ owner: modelRequestContext.ownerId, boundary: modelRequestContext.credentialBoundaryChecksum,
        scope: snapshot.scope, scopeId: snapshot.scopeId, purpose: modelRequestContext.purpose,
        protocol: (0, provider_cache_protocol_1.resolveProviderTransport)(config).protocol, contract: snapshot.contractVersion,
        generationSettings: { temperature: 0.1, maxTokens: 5000, reasoningEffort: config.reasoningEffort || config.reasoning_effort || 'off',
            thinkingBudget: config.thinkingBudgetTokens || config.thinking_budget_tokens || 0 } });
    return { modelRequestContext, providerContextCache: { scope: snapshot.scope, scopeId: snapshot.scopeId,
            sessionId: `navigation:${identity}`, source: 'scope_navigation_generation', requestClass: 'auxiliary',
            // 独立后台身份，无会话历史；小于证据上限的资料不能被上下文管理器重写。
            adaptiveStablePrefix: false, enabled: true },
        system: snapshot.system, messages: [{ role: 'user', content: snapshot.prompt }],
        temperature: 0.1, maxTokens: 5000, timeoutMs: Math.min(120_000, Number(config.timeoutMs || 120_000)),
        retryAttempts: 2, invalidJsonMessage: '认知文档生成未返回有效 JSON' };
}
//# sourceMappingURL=scope-navigation-contract.js.map