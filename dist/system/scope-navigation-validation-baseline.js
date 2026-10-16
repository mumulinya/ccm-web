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
exports.captureNavigationValidationBaseline = captureNavigationValidationBaseline;
exports.captureNavigationPhaseBaseline = captureNavigationPhaseBaseline;
exports.captureNavigationScopeConfiguration = captureNavigationScopeConfiguration;
exports.establishNavigationValidationBaseline = establishNavigationValidationBaseline;
exports.sealNavigationValidation = sealNavigationValidation;
exports.verifyNavigationValidationBaseline = verifyNavigationValidationBaseline;
exports.checkNavigationValidationRequest = checkNavigationValidationRequest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const cache_validation_budget_1 = require("./cache-validation-budget");
const scope_navigation_contract_1 = require("./scope-navigation-contract");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const digest = (value) => (0, crypto_1.createHash)('sha256').update((0, scope_navigation_contract_1.stableNavigationJson)(value)).digest('hex');
const failure = (code) => Object.assign(new Error(code), { code });
/** Only summaries leave this function; neither source text nor credentials are persisted. */
function runtimeCodeDigest(root) {
    const result = [];
    const visit = (relative) => {
        const absolute = path.join(root, relative);
        if (!fs.existsSync(absolute))
            return;
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink())
            return;
        if (stat.isDirectory()) {
            for (const item of fs.readdirSync(absolute).sort())
                visit(path.join(relative, item));
        }
        else if (/\.(?:ts|js|mjs|json)$/.test(relative) && !relative.endsWith('.map'))
            result.push([relative.replace(/\\/g, '/'), (0, crypto_1.createHash)('sha256').update(fs.readFileSync(absolute)).digest('hex')]);
    };
    for (const item of ['backend', 'ccm-package/dist', 'scripts/scope-navigation-live-validation.mjs', 'scripts/scope-navigation-tls-check.mjs', 'package.json'])
        visit(item);
    return digest(result);
}
function captureNavigationValidationBaseline(config, scopeConfiguration, root = path.resolve(__dirname, '../../..')) {
    // Capture effective configuration including retry/transport settings as one opaque summary.
    return { schema: 'ccm-navigation-validation-baseline-v1', codeDigest: runtimeCodeDigest(root),
        contractVersion: scope_navigation_contract_1.SCOPE_NAVIGATION_CONTRACT, configurationDigest: digest(config),
        protocol: (0, provider_cache_protocol_1.resolveProviderTransport)(config).protocol, scopeConfigurationDigest: digest(scopeConfiguration), contentStored: false };
}
function captureNavigationPhaseBaseline(prepared, config) {
    return { scope: prepared.snapshot.scope, scopeId: prepared.snapshot.scopeId, contractVersion: prepared.snapshot.contractVersion,
        scanFingerprint: prepared.snapshot.scope === 'project' ? prepared.inputChecksum || null : null, inputDigest: prepared.snapshot.inputDigest,
        encodingDigest: digest([prepared.snapshot.system, prepared.snapshot.prompt]),
        executionIdentity: (0, scope_navigation_contract_1.navigationDigest)((0, scope_navigation_contract_1.scopeNavigationRequestOptions)(config, prepared.snapshot).providerContextCache.sessionId), contentStored: false };
}
function captureNavigationScopeConfiguration(projectId, groupId) {
    const group = require('../modules/collaboration/storage').loadGroups().find((row) => row.id === groupId);
    return { projectId, groupId, group: group ? { name: group.name, purpose: group.purpose || '', members: (group.members || []).map((row) => row.project).filter(Boolean).sort() } : null };
}
function establishNavigationValidationBaseline(id, phase, value) {
    let mismatch = false;
    (0, cache_validation_budget_1.mutateCacheValidationMetadata)(id, metadata => {
        const previous = metadata.validationBaselines?.[phase];
        if (metadata.validationSealed || previous && digest(previous) !== digest(value)) {
            mismatch = true;
            return metadata;
        }
        return { ...metadata, validationBaselines: { ...metadata.validationBaselines, [phase]: previous || value } };
    });
    if (mismatch)
        throw failure('CCM_CACHE_VALIDATION_BASELINE_CHANGED');
}
function sealNavigationValidation(id, reason, phase = 'controller') {
    (0, cache_validation_budget_1.mutateCacheValidationMetadata)(id, metadata => ({ ...metadata, validationSealed: true,
        baselineChanges: [...(metadata.baselineChanges || []), { at: new Date().toISOString(), phase, reason, contentStored: false }].slice(-100) }));
}
function verifyNavigationValidationBaseline(id, phase, actual, stage) {
    let reason = '';
    (0, cache_validation_budget_1.mutateCacheValidationMetadata)(id, metadata => {
        const expected = metadata.validationBaselines?.[phase];
        const changedFields = expected ? Object.keys(actual).filter(key => digest(expected[key]) !== digest(actual[key])) : ['missing_baseline'];
        if (metadata.validationSealed || changedFields.length) {
            reason = metadata.validationSealed ? 'validation_sealed' : changedFields.join(',');
            return { ...metadata, validationSealed: true, baselineChanges: [...(metadata.baselineChanges || []), { at: new Date().toISOString(), phase, stage, reason, contentStored: false }].slice(-100) };
        }
        return { ...metadata, baselineChecks: { ...metadata.baselineChecks, [phase]: { count: (metadata.baselineChecks?.[phase]?.count || 0) + 1, lastStage: stage, lastAt: new Date().toISOString(), matched: true } } };
    });
    if (reason)
        throw failure('CCM_CACHE_VALIDATION_BASELINE_CHANGED');
}
function checkNavigationValidationRequest(id, prepared, config, stage) {
    const run = (0, cache_validation_budget_1.readCacheValidationRun)(id);
    if (run?.metadata.baselinePolicy !== 'stable-v1')
        return;
    const scopeConfiguration = captureNavigationScopeConfiguration(run.metadata.projectId, run.metadata.groupId);
    verifyNavigationValidationBaseline(id, 'global', captureNavigationValidationBaseline(config, scopeConfiguration), stage);
    const phase = prepared.snapshot.scope;
    verifyNavigationValidationBaseline(id, phase, captureNavigationPhaseBaseline(prepared, config), stage);
}
//# sourceMappingURL=scope-navigation-validation-baseline.js.map