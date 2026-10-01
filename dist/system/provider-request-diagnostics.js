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
exports.withRequestDiagnostics = withRequestDiagnostics;
exports.mainRequestAttribution = mainRequestAttribution;
exports.startProviderAttempt = startProviderAttempt;
exports.auditedProviderFetch = auditedProviderFetch;
exports.providerAttemptResponse = providerAttemptResponse;
exports.providerAttemptUsage = providerAttemptUsage;
exports.providerAttemptWireReuseEvidence = providerAttemptWireReuseEvidence;
exports.finishProviderAttempt = finishProviderAttempt;
exports.readProviderRequestDiagnostics = readProviderRequestDiagnostics;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const provider_wire_evidence_1 = require("./provider-wire-evidence");
const conversation_attempt_1 = require("../agents/conversation-attempt");
const provider_request_cache_fields_1 = require("./provider-request-cache-fields");
const provider_usage_1 = require("./provider-usage");
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const key = Symbol('ccm-request-audit');
const safe = (value) => String(value || '').replace(/[\0\r\n\t]/g, ' ').slice(0, 240);
const digest = (value, length = 16) => (0, crypto_1.createHash)('sha256').update(String(value || '')).digest('hex').slice(0, length);
const activeWarmupProfiles = new Map();
const warmupProfileKey = (route, snapshot, cacheFields) => digest(JSON.stringify({
    route,
    layout: snapshot?.layoutVersion || '',
    publicInstructionChecksum: snapshot?.publicInstructionChecksum || '',
    publicToolProfileChecksum: snapshot?.publicToolProfileChecksum || '',
    promptCacheKeyChecksum: cacheFields?.promptCacheKeyChecksum || '',
}));
function releaseWarmupProfile(row) {
    const key = String(row?.warmupProfileChecksum || '');
    if (!key)
        return;
    const count = Math.max(0, Number(activeWarmupProfiles.get(key) || 0) - 1);
    if (count > 0)
        activeWarmupProfiles.set(key, count);
    else
        activeWarmupProfiles.delete(key);
}
const endpointFingerprint = (endpoint) => {
    try {
        const url = new URL(String(endpoint || ''));
        return digest(`${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`);
    }
    catch {
        return digest(String(endpoint || ''));
    }
};
const responseHeader = (response, name) => {
    try {
        return safe(response?.headers?.get?.(name) || response?.headers?.[name] || '');
    }
    catch {
        return '';
    }
};
const providerRouteEvidence = (response) => {
    // Keep upstream routing evidence opaque. Raw headers can contain IPs,
    // internal hostnames, or request metadata and must not enter receipts.
    const names = [
        'x-request-id', 'request-id', 'x-cache', 'x-cache-hits', 'x-served-by',
        'x-upstream', 'x-upstream-host', 'x-upstream-address', 'x-envoy-upstream-service-time',
        'via', 'server', 'cf-ray', 'traceparent', 'x-amzn-trace-id',
    ];
    const values = names.map(name => [name, responseHeader(response, name)]).filter(([, value]) => value);
    if (!values.length)
        return { providerRouteFingerprint: '', providerNodeFingerprint: '', providerRouteHeaderCount: 0 };
    const serialized = values.map(([name, value]) => `${name}:${value}`).join('|');
    // Request identifiers and tracing IDs are intentionally excluded: they are
    // unique per call and would make a stable upstream node look different.
    const nodeValues = values.filter(([name]) => /cache|served|upstream|via|server|envoy/i.test(name)
        && !/request-id|traceparent|trace-id|cf-ray/i.test(name));
    return {
        providerRouteFingerprint: digest(serialized),
        providerNodeFingerprint: digest(nodeValues.map(([name, value]) => `${name}:${value}`).join('|')),
        providerRouteHeaderCount: values.length,
    };
};
const cacheDir = () => path.join(utils_1.CCM_DIR, 'provider-context-cache');
const publicAgentRole = (value) => ['project_main', 'group_main', 'global_main'].includes(String(value || '').trim().toLowerCase())
    ? 'main_agent' : String(value || '').trim().toLowerCase();
const append = (row) => { try {
    require('./provider-neutral-context-cache').appendProviderDiagnosticReceipt(row);
}
catch { } };
function withRequestDiagnostics(options, config) {
    return options[key] ? options : { ...options,
        ...(config?.requestAttribution && !options.requestAttribution ? { requestAttribution: config.requestAttribution } : {}),
        ...(config?.contextEngineSessionId && !config?.requestAttribution && !options.requestAttribution && !options.providerContextCache ? {
            requestAttribution: { scope: config.contextEngineScope, scopeId: config.contextEngineScopeId,
                exactSessionId: config.contextEngineSessionId, purpose: config.contextEngineSource || 'unrecorded', requestClass: 'auxiliary' },
        } : {}), [key]: { logicalCallId: (0, crypto_1.randomUUID)(), attempt: 0 } };
}
function attribution(options) {
    const binding = options.providerContextCache || options.provider_context_cache || {};
    const explicit = options.requestAttribution || binding.requestAttribution;
    const tracking = options.promptCacheTracking || options.prompt_cache_tracking || {};
    const scope = explicit?.scope || binding.scope || (tracking.groupId ? 'group' : '');
    const scopeId = explicit?.scope ? explicit.scopeId : binding.scopeId || tracking.groupId;
    const session = explicit?.scope ? explicit.exactSessionId : binding.sessionId || tracking.groupSessionId;
    const affinity = binding.cacheAffinity;
    return { purpose: safe(explicit?.purpose || binding.source || tracking.source || affinity?.stage || 'unrecorded'),
        requestClass: explicit?.requestClass || (affinity?.stage === 'main_tool_loop' ? 'foreground_main' : scope && session ? 'auxiliary' : 'unattributed'),
        ...(scope && scopeId && session ? { scope: safe(scope), scopeId: safe(scopeId), exactSessionId: safe(session) } : {}),
        ...(explicit?.turnId || binding.auditTurnKey ? { turnId: safe(explicit?.turnId || binding.auditTurnKey) } : {}),
        ...(explicit?.trace_id ? { trace_id: safe(explicit.trace_id) } : {}) };
}
function mainRequestAttribution(input) {
    const binding = (0, conversation_attempt_1.currentConversationAttemptBinding)(input.scope, input.scope === 'global' ? input.exactSessionId : `${input.scopeId}:${input.exactSessionId}`);
    return { purpose: 'main_tool_loop', requestClass: 'foreground_main', scope: input.scope,
        scopeId: input.scopeId, exactSessionId: input.exactSessionId,
        turnId: input.providerContextCache?.auditTurnKey, trace_id: input.checkpointIdentity?.trace_id || binding?.current()?.metadata?.trace_id };
}
function rows() {
    try {
        const dir = cacheDir();
        // A request can start in one ledger generation and finish after another
        // generation has been rotated. Scan every retained generation so the
        // terminal receipt is paired with its started receipt instead of leaving
        // a stale `started` row as the latest evidence.
        const files = fs.readdirSync(dir).filter(name => /^receipts(?:-\d+)?\.jsonl$/.test(name))
            .sort((a, b) => a === 'receipts.jsonl' ? -1 : b === 'receipts.jsonl' ? 1 : b.localeCompare(a));
        const result = new Map();
        const startOrder = new Map();
        let lineOrder = 0;
        for (const file of files) {
            const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n').reverse();
            for (const line of lines) {
                if (!line.includes('ccm-provider-request-attempt-v1'))
                    continue;
                try {
                    const row = JSON.parse(line);
                    if (row.schema !== 'ccm-provider-request-attempt-v1')
                        continue;
                    const requestId = String(row.requestId || '');
                    if (!requestId)
                        continue;
                    const existing = result.get(requestId);
                    // Prefer a terminal event over its earlier `started` event even
                    // when the two records crossed a file-rotation boundary. If there
                    // are duplicate terminal records, keep the one with the newest
                    // completion timestamp.
                    if (!existing
                        || (TERMINAL_STATUSES.has(String(row.status)) && !TERMINAL_STATUSES.has(String(existing.status)))
                        || (TERMINAL_STATUSES.has(String(row.status)) && TERMINAL_STATUSES.has(String(existing.status))
                            && String(row.completedAt || row.startedAt || '') > String(existing.completedAt || existing.startedAt || ''))) {
                        result.set(requestId, row);
                    }
                    if (row.status === 'started' && !startOrder.has(requestId))
                        startOrder.set(requestId, lineOrder);
                    lineOrder++;
                }
                catch { }
            }
        }
        return [...result.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)
            || (startOrder.get(a.requestId) ?? Number.MAX_SAFE_INTEGER) - (startOrder.get(b.requestId) ?? Number.MAX_SAFE_INTEGER)
            || String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    }
    catch {
        return [];
    }
}
const same = (a, b) => a.scope === b.scope && a.scopeId === b.scopeId && a.exactSessionId === (b.exactSessionId || b.sessionId);
function startProviderAttempt(options, config, body, protocol, endpoint) {
    const state = options[key] ||= { logicalCallId: (0, crypto_1.randomUUID)(), attempt: 0 };
    if (state.active)
        finishProviderAttempt(options, { ok: false, error: { code: 'superseded_by_retry' } });
    state.completedDiagnostic = undefined;
    const owner = attribution(options);
    const wireMessages = options._providerCacheWireMessages || options.messages;
    const layout = String(options._providerCacheTranscript?.wireLayoutVersion
        || wireMessages?.find((row) => row.prefixLayoutVersion)?.prefixLayoutVersion
        || 'legacy');
    const snapshot = (0, provider_wire_evidence_1.snapshotProviderWire)(body, protocol, layout, wireMessages);
    snapshot.publicParts = (0, provider_wire_evidence_1.publicProviderWireParts)(body, wireMessages);
    if (snapshot.publicParts.length)
        snapshot.publicParts.unshift(...snapshot.parts.filter(part => part.kind === 'tools'));
    const contextPlan = options._providerContextPlan || {};
    snapshot.publicPrefixChecksum = String(contextPlan.publicStablePrefixChecksum || '');
    snapshot.publicInstructionChecksum = String(contextPlan.publicInstructionChecksum || '');
    snapshot.publicInstructionTokens = Math.max(0, Number(contextPlan.publicInstructionTokens || 0));
    snapshot.publicInstructionBlockCount = Math.max(0, Number(contextPlan.publicInstructionBlockCount || 0));
    snapshot.publicPrefixContiguous = contextPlan.publicPrefixContiguous === true;
    snapshot.publicToolProfileChecksum = String(contextPlan.publicToolProfileChecksum || '');
    snapshot.publicToolSchemaChecksum = String(contextPlan.publicToolSchemaChecksum || '');
    snapshot.publicToolSchemaVersion = String(contextPlan.publicToolSchemaVersion || '');
    snapshot.publicProfileVersion = String(contextPlan.publicProfileVersion || '');
    const cacheFields = (0, provider_request_cache_fields_1.actualProviderCacheFields)(body);
    const actualEndpointFingerprint = endpointFingerprint(endpoint || config.apiUrl || '');
    const route = (0, crypto_1.createHash)('sha256').update(JSON.stringify([actualEndpointFingerprint, config.apiUrl || '', config.model || body.model || '', config.apiKey || '',
        config.userId || config.user_id || 'local-user', config.credentialProfileId || config.credential_profile_id || '', cacheDir()])).digest('hex');
    const history = rows();
    const agentRole = safe(options.providerContextCache?.cacheAffinity?.agentRole || owner.requestClass);
    const previous = owner.exactSessionId ? history.find(row => same(row.attribution, owner)
        && row.attribution.purpose === owner.purpose && row.protocol === protocol && row.route === route && row.model === String(config.model || body.model || '')) : undefined;
    // Public-prefix evidence may compare different project/group/global scopes
    // when the provider, model, credential boundary and agent role match. The
    // private session history is still compared separately and never shared.
    const publicPrevious = owner.exactSessionId && snapshot.publicParts.length ? history.find(row => TERMINAL_STATUSES.has(String(row.status))
        && row.attribution.exactSessionId !== owner.exactSessionId
        && row.attribution.purpose === owner.purpose && publicAgentRole(row.agentRole) === publicAgentRole(agentRole)
        && row.protocol === protocol && row.route === route
        && row.snapshot?.layoutVersion === snapshot.layoutVersion
        && String(row.snapshot?.publicPrefixChecksum || row.snapshot?.prefixLayers?.workspacePublicChecksum || '')
            === String(snapshot.publicPrefixChecksum || snapshot.prefixLayers?.workspacePublicChecksum || '')
        && row.snapshot?.publicToolProfileChecksum === snapshot.publicToolProfileChecksum
        && row.snapshot?.publicToolSchemaChecksum === snapshot.publicToolSchemaChecksum
        && row.snapshot?.publicToolSchemaVersion === snapshot.publicToolSchemaVersion
        && row.snapshot?.publicProfileVersion === snapshot.publicProfileVersion
        && row.snapshot?.publicInstructionChecksum === snapshot.publicInstructionChecksum
        && row.snapshot?.publicPrefixContiguous === snapshot.publicPrefixContiguous
        && (0, provider_wire_evidence_1.comparePublicProviderWire)(row.snapshot, snapshot).comparison === 'unchanged'
        && !!cacheFields.promptCacheKeyChecksum
        && row.cacheFieldEvidence?.promptCacheKeyChecksum === cacheFields.promptCacheKeyChecksum) : undefined;
    snapshot.crossSessionComparable = !!publicPrevious;
    const warmupProfileChecksum = warmupProfileKey(route, snapshot, cacheFields);
    const activeWarmupCount = Number(activeWarmupProfiles.get(warmupProfileChecksum) || 0);
    const isFirstLocalRequest = !previous;
    const concurrentWarmupDetected = isFirstLocalRequest && activeWarmupCount > 0;
    const warmStartKind = previous
        ? 'same_session_append'
        : concurrentWarmupDetected
            ? 'concurrent_cross_session_warmup'
            : publicPrevious
                ? 'cross_session_candidate'
                : 'local_first_request';
    if (isFirstLocalRequest)
        activeWarmupProfiles.set(warmupProfileChecksum, activeWarmupCount + 1);
    const row = { schema: 'ccm-provider-request-attempt-v1', requestId: (0, crypto_1.randomUUID)(), logicalCallId: state.logicalCallId,
        attempt: ++state.attempt, attribution: owner, protocol, model: safe(config.model || body.model), startedAt: new Date().toISOString(), status: 'started',
        snapshot, route, endpointFingerprint: actualEndpointFingerprint, agentRole, cacheKeyScope: String(contextPlan.automaticCacheOptimization?.cacheKeyScope || 'conversation_branch'), warmStartKind, concurrentWarmupDetected,
        warmupProfileChecksum, cacheFieldEvidence: cacheFields, wireReuseEvidence: { ...(0, provider_wire_evidence_1.compareProviderWire)(previous?.snapshot, snapshot),
            crossSessionComparable: !!publicPrevious,
            comparedRequestId: previous?.requestId, comparedRequestStatus: previous?.status,
            comparedProtocol: previous?.protocol, comparedModel: previous?.model, comparedRoute: previous?.route,
            comparedPurpose: previous?.attribution?.purpose,
            publicPrefix: (0, provider_wire_evidence_1.comparePublicProviderWire)(publicPrevious?.snapshot, snapshot) }, contentStored: false };
    state.active = row;
    append(row);
    return row;
}
async function auditedProviderFetch(fetcher, endpoint, init, meta) {
    if (!meta)
        return fetcher(endpoint, init);
    let body;
    try {
        body = JSON.parse(init.body);
    }
    catch {
        body = {};
    }
    try {
        startProviderAttempt(meta.options, meta.config, body, meta.protocol, endpoint);
    }
    catch { }
    try {
        const response = await fetcher(endpoint, init);
        providerAttemptResponse(meta.options, response);
        return response;
    }
    catch (error) {
        const completed = finishProviderAttempt(meta.options, { ok: false, error });
        // Fetch already closed this physical attempt. Deliver its evidence once
        // to the outer context receipt, without writing or charging it again.
        if (meta.options[key])
            meta.options[key].completedDiagnostic = completed;
        throw error;
    }
}
function providerAttemptResponse(options, response) {
    const row = options[key]?.active;
    if (row) {
        row.httpStatus = Number(response.status || 0);
        row.providerRequestId = safe(response.headers?.get?.('x-request-id') || response.headers?.get?.('request-id'));
        Object.assign(row, providerRouteEvidence(response));
    }
}
function providerAttemptUsage(options, usage) {
    const row = options[key]?.active;
    if (row && usage?.reported)
        row.observedUsage = usage;
}
/**
 * Read the wire comparison captured when the active physical attempt started.
 * The model response is finalized after this point, so callers that classify
 * Provider reuse must use this snapshot rather than reconstructing a second
 * comparison from the completion receipt.
 */
function providerAttemptWireReuseEvidence(options) {
    return options?.[key]?.active?.wireReuseEvidence || null;
}
function finishProviderAttempt(options, result) {
    const state = options[key];
    const row = state?.active;
    if (!row) {
        const completed = state?.completedDiagnostic || null;
        if (state)
            state.completedDiagnostic = undefined;
        return completed;
    }
    const usage = result.usage || row.observedUsage;
    delete row.observedUsage;
    releaseWarmupProfile(row);
    const normalizedUsage = (0, provider_usage_1.normalizeProviderUsage)(usage || {}, row.protocol);
    const reported = normalizedUsage.reported;
    const direct = reported ? normalizedUsage.directInputTokens : null;
    const cached = reported ? normalizedUsage.cacheReadInputTokens : null;
    const creation = reported ? normalizedUsage.cacheCreationInputTokens : null;
    Object.assign(row, { completedAt: new Date().toISOString(), status: result.ok ? 'completed' : result.error?.name === 'AbortError' ? 'cancelled' : 'failed',
        providerRequestId: safe(result.providerRequestId || row.providerRequestId),
        usageReported: reported, directInputTokens: direct, cacheReadInputTokens: cached, cacheCreationInputTokens: creation,
        totalInputTokens: reported ? direct + cached + creation : null, outputTokens: reported ? normalizedUsage.outputTokens : null,
        reportedCostUsd: reported && Number(usage.costUsd ?? usage.totalCostUsd) > 0 ? (usage.costUsd ?? usage.totalCostUsd) : null,
        errorCode: result.ok ? undefined : safe(result.error?.code || result.error?.name || 'request_failed') });
    if (result.cacheReuse && typeof result.cacheReuse === 'object') {
        Object.assign(row, {
            providerCacheReuseClass: safe(result.cacheReuse.providerCacheReuseClass),
            providerCacheCandidateTokens: Math.max(0, Number(result.cacheReuse.providerCacheCandidateTokens || 0)),
            providerCacheMatchedTokens: Math.max(0, Number(result.cacheReuse.providerCacheMatchedTokens || 0)),
            providerCachePartialReason: safe(result.cacheReuse.providerCachePartialReason),
            providerCacheComparableEvidence: result.cacheReuse.providerCacheComparableEvidence === true,
            toolSchemaChecksum: safe(result.cacheReuse.toolSchemaChecksum),
            toolSchemaVersion: safe(result.cacheReuse.toolSchemaVersion || "v1"),
            toolSchemaPrefixEligible: result.cacheReuse.toolSchemaPrefixEligible === true,
            providerCacheColdStart: result.cacheReuse.providerCacheColdStart === true,
            providerCacheCandidateSource: safe(result.cacheReuse.providerCacheCandidateSource),
        });
    }
    append(row);
    state.active = undefined;
    return { requestAttribution: row.attribution, wireReuseEvidence: row.wireReuseEvidence,
        warmStartKind: row.warmStartKind,
        concurrentWarmupDetected: row.concurrentWarmupDetected === true,
        warmupProfileChecksum: row.warmupProfileChecksum,
        requestAttemptId: row.requestId, logicalCallId: row.logicalCallId, attempt: row.attempt,
        actualCacheFields: row.cacheFieldEvidence,
        ...(reported ? { usage: { ...usage, ...normalizedUsage } } : {}), providerRequestId: row.providerRequestId,
        ...(row.providerCacheReuseClass ? { cacheReuse: {
                providerCacheReuseClass: row.providerCacheReuseClass,
                providerCacheCandidateTokens: row.providerCacheCandidateTokens,
                providerCacheMatchedTokens: row.providerCacheMatchedTokens,
                providerCachePartialReason: row.providerCachePartialReason,
                providerCacheComparableEvidence: row.providerCacheComparableEvidence === true,
                toolSchemaChecksum: row.toolSchemaChecksum,
                toolSchemaVersion: row.toolSchemaVersion,
                toolSchemaPrefixEligible: row.toolSchemaPrefixEligible === true,
            } } : {}) };
}
function readProviderRequestDiagnostics(binding) {
    const selected = rows().filter(row => !binding || same(row.attribution, binding)).slice(0, 50);
    const recentRequests = selected.map(({ snapshot, ...row }) => ({
        ...row,
        wireLayoutVersion: String(snapshot?.layoutVersion || row.wireLayoutVersion || ""),
        publicPrefixChecksum: String(snapshot?.publicPrefixChecksum || ''),
        publicInstructionChecksum: String(snapshot?.publicInstructionChecksum || ''),
        publicInstructionTokens: Number(snapshot?.publicInstructionTokens || 0),
        publicInstructionBlockCount: Number(snapshot?.publicInstructionBlockCount || 0),
        publicPrefixContiguous: snapshot?.publicPrefixContiguous === true,
        publicToolProfileChecksum: String(snapshot?.publicToolProfileChecksum || ''),
        publicToolSchemaChecksum: String(snapshot?.publicToolSchemaChecksum || ''),
        publicToolSchemaVersion: String(snapshot?.publicToolSchemaVersion || ''),
        publicProfileVersion: String(snapshot?.publicProfileVersion || ''),
        crossSessionComparable: snapshot?.crossSessionComparable === true || row.wireReuseEvidence?.crossSessionComparable === true,
        firstPrivateDifference: String(row.wireReuseEvidence?.publicPrefix?.firstChangedSegment
            || row.wireReuseEvidence?.firstChangedSegment || row.wireReuseEvidence?.firstDivergenceKind || ''),
        routeKeyChecksum: (0, crypto_1.createHash)('sha256').update(String(row.route || '')).digest('hex').slice(0, 16),
        endpointFingerprint: String(row.endpointFingerprint || ''),
        providerRouteFingerprint: String(row.providerRouteFingerprint || ''),
        providerNodeFingerprint: String(row.providerNodeFingerprint || ''),
        providerRouteHeaderCount: Number(row.providerRouteHeaderCount || 0),
    }));
    const terminalRows = selected.filter(row => TERMINAL_STATUSES.has(String(row.status)));
    const byRequestId = new Map(terminalRows.map(row => [String(row.requestId), row]));
    // Compare the request against the exact request id captured at start time.
    // Array adjacency is not reliable when retries, auxiliary calls, or
    // rotated ledgers interleave between two foreground requests.
    const adjacentComparisons = terminalRows.map(current => {
        const evidence = current.wireReuseEvidence || {};
        const comparedRequestId = String(evidence.comparedRequestId || '');
        const previous = comparedRequestId ? byRequestId.get(comparedRequestId) : undefined;
        const comparisonValidated = !!previous
            && TERMINAL_STATUSES.has(String(current.status))
            && TERMINAL_STATUSES.has(String(previous.status))
            && (!evidence.comparedRequestStatus || String(evidence.comparedRequestStatus) === String(previous.status))
            && (!evidence.comparedProtocol || String(evidence.comparedProtocol) === String(previous.protocol))
            && (!evidence.comparedModel || String(evidence.comparedModel) === String(previous.model))
            && (!evidence.comparedRoute || String(evidence.comparedRoute) === String(previous.route))
            && (!evidence.comparedPurpose || String(evidence.comparedPurpose) === String(previous.attribution?.purpose));
        return {
            currentRequestId: current.requestId,
            previousRequestId: comparedRequestId || null,
            currentStartedAt: current.startedAt,
            previousStartedAt: previous?.startedAt || null,
            currentStatus: current.status,
            previousStatus: previous?.status || evidence.comparedRequestStatus || null,
            comparisonProtocol: evidence.comparedProtocol || null,
            comparisonModel: evidence.comparedModel || null,
            comparisonRouteValidated: !evidence.comparedRoute || !!previous && String(evidence.comparedRoute) === String(previous.route),
            comparisonPurposeValidated: !evidence.comparedPurpose || !!previous && String(evidence.comparedPurpose) === String(previous.attribution?.purpose),
            comparisonValidated,
            sameLogicalCall: comparisonValidated && current.logicalCallId === previous.logicalCallId,
            comparison: comparisonValidated ? (evidence.comparison || 'no_comparison') : 'no_comparison',
            firstChangedSegment: comparisonValidated ? (evidence.firstChangedSegment || evidence.firstDivergenceKind || '') : '',
            matchingPrefixBytesLowerBound: comparisonValidated ? Number(evidence.matchingPrefixBytesLowerBound || 0) : 0,
            matchingPrefixTokensEstimate: comparisonValidated ? Number(evidence.matchingPrefixTokensEstimate || 0) : 0,
            currentCacheReadInputTokens: current.cacheReadInputTokens ?? null,
            previousCacheReadInputTokens: previous?.cacheReadInputTokens ?? null,
            currentProviderCacheReuseClass: current.providerCacheReuseClass || 'unreported',
            previousProviderCacheReuseClass: previous?.providerCacheReuseClass || 'unreported',
            currentProviderNodeFingerprint: String(current.providerNodeFingerprint || ''),
            previousProviderNodeFingerprint: String(previous?.providerNodeFingerprint || ''),
            providerNodeChanged: !!current.providerNodeFingerprint && !!previous?.providerNodeFingerprint
                && String(current.providerNodeFingerprint) !== String(previous.providerNodeFingerprint),
            currentBreakpointChecksums: Array.isArray(current.snapshot?.breakpointChecksums) ? current.snapshot.breakpointChecksums.slice(0, 4) : [],
            previousBreakpointChecksums: Array.isArray(previous?.snapshot?.breakpointChecksums) ? (previous?.snapshot).breakpointChecksums.slice(0, 4) : [],
            contentStored: false,
        };
    }).filter(item => item.previousRequestId).slice(0, 12);
    const summarize = (items) => ({ attempts: items.length, logicalCalls: new Set(items.map(row => row.logicalCallId)).size,
        reportedAttempts: items.filter(row => row.usageReported).length,
        totalInputTokens: items.reduce((sum, row) => sum + Number(row.totalInputTokens || 0), 0),
        cacheReadInputTokens: items.reduce((sum, row) => sum + Number(row.cacheReadInputTokens || 0), 0),
        fullReuseRequests: items.filter(row => row.providerCacheReuseClass === 'full_reuse').length,
        partialReuseRequests: items.filter(row => row.providerCacheReuseClass === 'partial_reuse').length,
        baselineOnlyRequests: items.filter(row => row.providerCacheReuseClass === 'baseline_only').length,
        missRequests: items.filter(row => row.providerCacheReuseClass === 'miss').length });
    return { recentRequests, adjacentComparisons, requestGroups: { main: summarize(terminalRows.filter(row => row.attribution.requestClass === 'foreground_main')),
            auxiliary: summarize(terminalRows.filter(row => row.attribution.requestClass === 'auxiliary')),
            probe: summarize(terminalRows.filter(row => row.attribution.requestClass === 'probe')),
            unattributed: summarize(terminalRows.filter(row => row.attribution.requestClass === 'unattributed')) }, contentStored: false };
}
//# sourceMappingURL=provider-request-diagnostics.js.map