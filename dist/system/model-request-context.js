"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statelessModelRequestContext = statelessModelRequestContext;
exports.resolveModelRequestContext = resolveModelRequestContext;
exports.attachModelRequestContext = attachModelRequestContext;
exports.modelCacheContextProjection = modelCacheContextProjection;
const crypto_1 = require("crypto");
const cache_validation_budget_1 = require("./cache-validation-budget");
const digest = (value) => (0, crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
const singletonPurposes = new Set(['music_assistant', 'music_conversation', 'knowledge_rag_answer', 'web_fetch_summarizer', 'global_code_review', 'connectivity_probe', 'unified_model_connectivity']);
const identityError = (code) => Object.assign(new Error(code), { code });
const identityValue = (value) => typeof value === 'string' && value.length > 0 && value.length <= 240 && !/[\x00-\x1f]/.test(value);
function statelessModelRequestContext(config, input) {
    return resolveModelRequestContext(config, { modelRequestContext: {
            ...input, requestClass: 'auxiliary', executionOrigin: (0, cache_validation_budget_1.currentCacheValidationBinding)()?.executionOrigin || config.executionOrigin || (process.env.CCM_MODEL_EXECUTION_ORIGIN === 'test' ? 'test' : process.env.CCM_MODEL_EXECUTION_ORIGIN === 'probe' ? 'probe' : 'business'),
            bindingMode: 'stateless', ownerId: String(config.userId || config.user_id || 'local-user'), credentialBoundaryChecksum: '',
        } }).context;
}
/** Normalize trusted caller metadata only. Never infer identity from prompt text. */
function resolveModelRequestContext(config = {}, options = {}) {
    const legacy = options.providerContextCache || options.provider_context_cache;
    const tracking = options.promptCacheTracking || options.prompt_cache_tracking;
    const attribution = options.requestAttribution || legacy?.requestAttribution || config.requestAttribution;
    const explicit = options.modelRequestContext;
    if (legacy && (tracking?.groupSessionId || tracking?.group_session_id)) {
        if (legacy.scope !== 'group' || String(legacy.scopeId) !== String(tracking.groupId || tracking.group_id)
            || legacy.sessionId !== (tracking.groupSessionId || tracking.group_session_id))
            throw identityError('CCM_MODEL_REQUEST_IDENTITY_CONFLICT');
    }
    const bound = legacy || (tracking?.groupSessionId || tracking?.group_session_id ? {
        scope: 'group', scopeId: tracking.groupId || tracking.group_id, sessionId: tracking.groupSessionId || tracking.group_session_id,
        source: tracking.source || 'group_main_model',
    } : config.contextEngineSessionId ? {
        scope: config.contextEngineScope || 'other', scopeId: config.contextEngineScopeId || config.contextEngineSessionId,
        sessionId: config.contextEngineSessionId, source: config.contextEngineSource || 'unified_model_consumer',
        generation: config.contextEngineGeneration, boundaryGeneration: config.contextEngineBoundaryGeneration,
    } : null);
    const credentialBoundaryChecksum = digest({ endpoint: config.apiUrl || '', model: config.model || '',
        credential: digest(config.apiKey || config.api_key || ''), profile: config.credentialProfileId || config.credential_profile_id || '',
        owner: config.userId || config.user_id || 'local-user' });
    if (explicit) {
        if (!identityValue(explicit.purpose) || !identityValue(explicit.scope) || !identityValue(explicit.scopeId)
            || !identityValue(explicit.ownerId) || !['foreground_main', 'auxiliary', 'probe'].includes(explicit.requestClass)
            || !['business', 'test', 'probe', 'unknown'].includes(explicit.executionOrigin)
            || !['session', 'stateless'].includes(explicit.bindingMode)
            || (explicit.bindingMode === 'session' && !identityValue(explicit.sessionId))
            || (explicit.bindingMode === 'stateless' && explicit.sessionId != null))
            throw identityError('CCM_MODEL_REQUEST_IDENTITY_REQUIRED');
        if (explicit.credentialBoundaryChecksum && explicit.credentialBoundaryChecksum !== credentialBoundaryChecksum)
            throw identityError('CCM_MODEL_CREDENTIAL_IDENTITY_MISMATCH');
        const configuredOwner = config.userId || config.user_id;
        if (configuredOwner && explicit.ownerId !== configuredOwner)
            throw identityError('CCM_MODEL_OWNER_IDENTITY_MISMATCH');
        for (const identity of [bound, attribution ? { scope: attribution.scope, scopeId: attribution.scopeId, sessionId: attribution.exactSessionId } : null]) {
            if (!identity)
                continue;
            for (const field of ['scope', 'scopeId', 'sessionId'])
                if (identity[field] && explicit[field] && identity[field] !== explicit[field])
                    throw identityError('CCM_MODEL_REQUEST_IDENTITY_CONFLICT');
        }
        const context = { ...explicit, credentialBoundaryChecksum };
        const binding = bound || { scope: context.scope, scopeId: context.scopeId,
            sessionId: context.sessionId || `stateless:${digest({ purpose: context.purpose, owner: context.ownerId, boundary: credentialBoundaryChecksum })}`,
            source: context.purpose, requestClass: context.requestClass };
        return { context, binding, preserveWire: !bound };
    }
    const purpose = String(attribution?.purpose || bound?.source || tracking?.source || 'unrecorded');
    if (bound && attribution?.scope) {
        // Historical semantic decisions use a test_agent audit role and their real
        // project/group affinity for cache ownership. This is a declared mapping.
        const semanticRole = ['test_agent', 'music'].includes(attribution.scope) && purpose.startsWith('semantic_')
            && String(bound.scopeId) === String(attribution.scopeId) && bound.sessionId === attribution.exactSessionId;
        const testPlannerTaskRole = purpose === 'semantic_test_agent_plan' && attribution.scope === 'test_agent'
            && bound.source === purpose && bound.scope === 'project'
            && bound.cacheAffinity?.agentRole === 'test_agent' && ['test_plan', 'test_plan_repair'].includes(bound.cacheAffinity.stage)
            && bound.cacheAffinity.scope === bound.scope && bound.cacheAffinity.scopeId === bound.scopeId
            && bound.cacheAffinity.taskId === attribution.scopeId && bound.cacheAffinity.exactSessionId === attribution.exactSessionId
            && bound.sessionId === attribution.exactSessionId;
        const declaredMapping = purpose === 'music_conversation' && bound.scope === 'music' && bound.scopeId === 'music-agent'
            && attribution.scope === 'workspace' && attribution.scopeId === 'workspace' && bound.sessionId === attribution.exactSessionId
            || purpose === 'global_code_review' && bound.scope === 'workspace' && bound.scopeId === 'workspace'
                && attribution.scope === 'global' && attribution.scopeId === 'global' && bound.sessionId === attribution.exactSessionId
            || ['project_source_selection', 'project_source_synthesis'].includes(purpose)
                && bound.source === `semantic_${purpose}` && bound.scope === 'project';
        if (!semanticRole && !testPlannerTaskRole && !declaredMapping && (bound.scope !== attribution.scope || String(bound.scopeId) !== String(attribution.scopeId)
            || attribution.exactSessionId && bound.sessionId !== attribution.exactSessionId))
            throw identityError('CCM_MODEL_REQUEST_IDENTITY_CONFLICT');
    }
    const scope = bound?.scope || attribution?.scope;
    const scopeId = bound?.scopeId || attribution?.scopeId;
    const sessionId = bound?.sessionId || attribution?.exactSessionId;
    if (bound && (!identityValue(scope) || !identityValue(scopeId) || !identityValue(sessionId)))
        throw identityError('CCM_MODEL_REQUEST_IDENTITY_REQUIRED');
    if (!scope || !scopeId || !sessionId)
        return { context: null, binding: bound, preserveWire: !bound };
    const requestClass = attribution?.requestClass || bound?.requestClass
        || (bound?.cacheAffinity?.stage === 'main_tool_loop' ? 'foreground_main' : 'auxiliary');
    const origin = (0, cache_validation_budget_1.currentCacheValidationBinding)()?.executionOrigin || options.executionOrigin || config.executionOrigin || process.env.CCM_MODEL_EXECUTION_ORIGIN;
    const context = {
        purpose, requestClass, executionOrigin: origin === 'test' ? 'test' : origin === 'probe' || requestClass === 'probe' ? 'probe' : origin === 'unknown' ? 'unknown' : 'business',
        bindingMode: singletonPurposes.has(purpose) ? 'stateless' : 'session', scope, scopeId,
        ...(singletonPurposes.has(purpose) ? {} : { sessionId }), ownerId: String(config.userId || config.user_id || 'local-user'), credentialBoundaryChecksum,
    };
    return { context, binding: bound || { scope, scopeId, sessionId, source: purpose, requestClass }, preserveWire: !bound };
}
function attachModelRequestContext(config, options) {
    const resolved = resolveModelRequestContext(config, options);
    return { ...options, ...(resolved.context ? { modelRequestContext: resolved.context } : {}),
        _modelCacheBinding: resolved.binding, _modelCachePreserveWire: resolved.preserveWire,
        cachePreparationStatus: resolved.context ? 'pending' : 'unattributed' };
}
function modelCacheContextProjection(options) {
    const context = options?.modelRequestContext;
    return { execution_origin: context?.executionOrigin || 'unknown', binding_mode: context?.bindingMode || 'unattributed',
        cache_preparation_status: options?.cachePreparationStatus || 'unattributed',
        cache_eligibility: options?._modelCacheEligibility?.status || 'unknown',
        cache_eligibility_reason: options?._modelCacheEligibility?.reason || 'provider_conditions_unknown',
        contentStored: false };
}
//# sourceMappingURL=model-request-context.js.map