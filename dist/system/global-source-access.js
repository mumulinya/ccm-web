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
exports.globalSourcePersistence = exports.globalSourceModelPayload = exports.globalSourceToolSchema = exports.isGlobalSourceTool = exports.GLOBAL_SOURCE_TOOLS = void 0;
exports.sourceAccessPrincipal = sourceAccessPrincipal;
exports.bindGlobalSourceIdentity = bindGlobalSourceIdentity;
exports.effectiveSourcePrincipal = effectiveSourcePrincipal;
exports.assertGlobalSourceProjectAccess = assertGlobalSourceProjectAccess;
exports.assertGlobalSourceToolRequest = assertGlobalSourceToolRequest;
exports.authorizedProjectSourceOperation = authorizedProjectSourceOperation;
exports.directSourceSummary = directSourceSummary;
exports.executeGlobalSourceTool = executeGlobalSourceTool;
exports.hydrateGlobalSourceObservations = hydrateGlobalSourceObservations;
exports.hydrateGlobalSourceMessages = hydrateGlobalSourceMessages;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const access_policy_1 = require("../modules/system/access-policy");
const readonly_performance_service_1 = require("./readonly-performance-service");
const fs = __importStar(require("fs"));
const transient_model_content_1 = require("./transient-model-content");
const global_source_model_content_1 = require("./global-source-model-content");
const global_source_model_content_2 = require("./global-source-model-content");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
var global_source_model_content_3 = require("./global-source-model-content");
Object.defineProperty(exports, "GLOBAL_SOURCE_TOOLS", { enumerable: true, get: function () { return global_source_model_content_3.GLOBAL_SOURCE_TOOLS; } });
Object.defineProperty(exports, "isGlobalSourceTool", { enumerable: true, get: function () { return global_source_model_content_3.isGlobalSourceTool; } });
Object.defineProperty(exports, "globalSourceToolSchema", { enumerable: true, get: function () { return global_source_model_content_3.globalSourceToolSchema; } });
Object.defineProperty(exports, "globalSourceModelPayload", { enumerable: true, get: function () { return global_source_model_content_3.globalSourceModelPayload; } });
Object.defineProperty(exports, "globalSourcePersistence", { enumerable: true, get: function () { return global_source_model_content_3.globalSourcePersistence; } });
function sourceAccessPrincipal(run, current) {
    if (current)
        return { kind: current.kind, id: String(current.userId || current.id || current.caller || ''), userId: String(current.userId || current.id || ''), role: current.role };
    if (run.source_access_principal)
        return run.source_access_principal;
    const principal = (run.write_authorization_receipt || run.writeAuthorizationReceipt)?.principal;
    return principal ? { ...principal, userId: principal.id } : null;
}
function bindGlobalSourceIdentity(run, principal, sourceMessageId) {
    if (principal && !run.source_access_principal)
        run.source_access_principal = sourceAccessPrincipal(run, principal);
    if (sourceMessageId && !run.source_message_id)
        run.source_message_id = sourceMessageId;
}
function effectiveSourcePrincipal(principal) {
    if (!principal || !['browser', 'internal', 'feishu'].includes(principal.kind))
        throw new Error('SOURCE_PRINCIPAL_REQUIRED');
    if (principal.kind === 'internal')
        return principal;
    const identity = String(principal.userId || principal.id || '');
    let role = principal.role;
    if (principal.kind === 'browser') {
        const user = require('../modules/system/local-auth').listActiveLocalAuthUsers().find(row => row.id === identity);
        if (!user)
            throw new Error('SOURCE_PRINCIPAL_INACTIVE');
        role = user.role;
    }
    else {
        const access = require('../modules/collaboration/feishu-access').resolveFeishuUserAccess({ open_id: identity, user_id: identity });
        if (!access.allowed)
            throw new Error('SOURCE_PRINCIPAL_INACTIVE');
        role = access.role;
    }
    return { ...principal, userId: identity, role };
}
function assertGlobalSourceProjectAccess(principal, project) {
    const current = effectiveSourcePrincipal(principal);
    if (current.kind !== 'internal' && current.role !== 'admin' && !(0, access_policy_1.hasResourceAccess)(current.userId, current.role, 'project', project, 'use'))
        throw new Error('SOURCE_PROJECT_ACCESS_DENIED');
}
function rootFor(project) {
    const config = (0, db_1.getConfigs)().find(row => row.name === project);
    const root = config && (0, db_1.getConfigInfo)(config.path)?.[0]?.workDir;
    if (!root)
        throw new Error('SOURCE_PROJECT_NOT_CONFIGURED');
    return path.resolve(root);
}
function assertGlobalSourceToolRequest(name, args, run, current) {
    if (!(0, global_source_model_content_2.isGlobalSourceTool)(name))
        return;
    const schema = (0, global_source_model_content_2.globalSourceToolSchema)(name);
    if (!args || schema.required.some(key => !Object.hasOwn(args, key)) || Object.keys(args).some(key => !Object.hasOwn(schema.properties, key)))
        throw new Error('SOURCE_ARGUMENTS_INVALID');
    for (const [key, value] of Object.entries(args)) {
        const type = schema.properties[key].type;
        if (type === 'string' && typeof value !== 'string' || type === 'array' && !Array.isArray(value))
            throw new Error('SOURCE_ARGUMENTS_INVALID');
    }
    if (args.paths?.some(value => typeof value !== 'string'))
        throw new Error('SOURCE_ARGUMENTS_INVALID');
    if (args.files?.some(value => !value || typeof value.path !== 'string' || Object.keys(value).some(key => !['path', 'startLine', 'endLine'].includes(key))))
        throw new Error('SOURCE_ARGUMENTS_INVALID');
    assertGlobalSourceProjectAccess(sourceAccessPrincipal(run, current), String(args.project || ''));
}
async function authorizedProjectSourceOperation(project, operation, args, principal, signal) {
    assertGlobalSourceProjectAccess(principal, project);
    const actualRoot = async (configured) => { try {
        return await fs.promises.realpath(configured);
    }
    catch {
        throw new Error('SOURCE_PROJECT_DIRECTORY_UNAVAILABLE');
    } };
    const configuredRoot = rootFor(project), root = await actualRoot(configuredRoot);
    const result = await (0, readonly_performance_service_1.readProjectSourcesOffThread)(project, root, operation, args, signal);
    assertGlobalSourceProjectAccess(principal, project);
    if (configuredRoot !== rootFor(project) || root !== await actualRoot(configuredRoot))
        throw new Error('SOURCE_PROJECT_ROOT_CHANGED');
    return result;
}
function directSourceSummary(run, toolName, args, result) {
    const toolCallId = `${run.id}:${crypto.createHash('sha256').update(toolName + ':' + JSON.stringify(args)).digest('hex').slice(0, 24)}`;
    return { accessId: `gsrc_${crypto.createHash('sha256').update(toolCallId).digest('hex').slice(0, 24)}`, mode: 'direct', status: toolName !== 'read_project_sources' ? 'located' : result.truncated ? 'partial' : 'completed',
        runId: run.id, sourceMessageId: run.source_message_id || '', toolCallId, projectIds: [args.project],
        evidenceRefs: result.evidenceRefs || result.matches || [], missingEvidenceSummaries: result.truncated || result.manifestTruncated ? ['读取或清单存在截断，请按范围继续核对'] : [],
        availableActions: ['continue_with_current', 'supplement_check', 'provide_clarification', 'promote_to_development'], revision: 1, durationMs: result.durationMs, contentStored: false };
}
async function executeGlobalSourceTool(name, args, run, principal, signal) {
    assertGlobalSourceToolRequest(name, args, run, principal);
    const actor = sourceAccessPrincipal(run, principal);
    const operation = name === 'list_project_sources' ? 'list' : name === 'search_project_sources' ? 'search' : 'read';
    const result = await authorizedProjectSourceOperation(String(args.project || ''), operation, args, actor, signal);
    const { files, ...metadata } = result;
    const observation = { ...metadata, schema: 'ccm-global-project-source-result-v1',
        files: files?.map(({ content, ...ref }) => ref), sourceAccess: directSourceSummary(run, name, args, result) };
    return files?.some(file => typeof file.content === 'string')
        ? (0, transient_model_content_1.attachTransientModelBlocks)(observation, [{ type: 'text', text: JSON.stringify({ kind: 'current_authorized_source', files }) }]) : observation;
}
/** Rehydrate after restart and recheck authorization/version before every model call. */
async function hydrateGlobalSourceObservations(run) {
    for (const step of run.steps || []) {
        const value = step.observation;
        if (step.tool?.name !== 'read_project_sources' || value?.schema !== 'ccm-global-project-source-result-v1')
            continue;
        const fresh = await authorizedProjectSourceOperation(value.project, 'read', { files: (value.evidenceRefs || []).map(row => ({ path: row.path, startLine: row.startLine, endLine: row.endLine })) }, sourceAccessPrincipal(run));
        const valid = fresh.evidenceRefs.every(ref => value.evidenceRefs.some(old => old.path === ref.path && old.checksum === ref.checksum));
        const publicValue = (0, global_source_model_content_1.globalSourcePersistence)(value);
        step.observation = (0, transient_model_content_1.attachTransientModelBlocks)({ ...publicValue, freshness: valid ? 'verified' : 'stale' }, [{ type: 'text', text: valid
                    ? JSON.stringify({ kind: 'current_authorized_source', files: fresh.files }) : JSON.stringify({ source_state: 'stale', project: value.project, reason: '源码已变化，必须重新读取后才能核对实现' }) }]);
    }
}
async function hydrateGlobalSourceMessages(messages, run) {
    const actor = sourceAccessPrincipal(run);
    async function visit(value) {
        if (value && ['system', 'developer'].includes(value.role))
            return value;
        if (value?.role === 'user') {
            if (!Array.isArray(value.content))
                return value;
            return { ...value, content: await Promise.all(value.content.map(part => part?.type === 'tool_result' || part?.functionResponse ? visit(part) : part)) };
        }
        if (typeof value === 'string' && value.includes('ccm-global-project-source-result-v1')) {
            try {
                return (0, workspace_model_result_projection_1.stableModelJson)(await visit(JSON.parse(value)));
            }
            catch (error) {
                if (error instanceof SyntaxError)
                    return value;
                throw error;
            }
        }
        if (value?.schema === 'ccm-global-project-source-result-v1') {
            if (!value.evidenceRefs?.length || value.sourceAccess?.mode !== 'direct')
                return value;
            const sourceRun = require('../agents/global/global-agent-run-store').getGlobalAgentRun(value.sourceAccess.runId);
            require('./global-source-summary').assertSourceRunRead(sourceRun, actor);
            const original = sourceRun.steps.find(step => (0, global_source_model_content_2.isGlobalSourceTool)(step.tool?.name) && step.observation?.sourceAccess?.accessId === value.sourceAccess.accessId)?.observation;
            const delegatedRefs = require('./global-source-summary').buildSourceAccessSummaries(sourceRun).filter(row => row.mode === 'delegated').flatMap(row => row.evidenceRefs);
            const delegatedProof = value.evidenceRefs.every(ref => delegatedRefs.some(old => old.project === value.project && old.path === ref.path && old.checksum === ref.checksum && old.startLine === ref.startLine && old.endLine === ref.endLine));
            if (!(original && original.project === value.project && (0, workspace_model_result_projection_1.stableModelJson)(original.evidenceRefs) === (0, workspace_model_result_projection_1.stableModelJson)(value.evidenceRefs)) && !delegatedProof)
                throw new Error('SOURCE_REFERENCE_INVALID');
            const fresh = await authorizedProjectSourceOperation(value.project, 'read', { files: value.evidenceRefs.map(ref => ({ path: ref.path, startLine: ref.startLine, endLine: ref.endLine })) }, actor);
            const verified = fresh.evidenceRefs.every(ref => value.evidenceRefs.some(old => old.path === ref.path && old.checksum === ref.checksum));
            return { ...(0, global_source_model_content_1.globalSourcePersistence)(value), ...(verified ? {} : { freshness: 'stale' }), sourceContent: verified
                    ? [JSON.stringify({ kind: 'current_authorized_source', files: fresh.files })] : [] };
        }
        if (Array.isArray(value))
            return Promise.all(value.map(visit));
        if (value && typeof value === 'object')
            return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, row]) => [key, await visit(row)])));
        return value;
    }
    const hydrated = await visit(messages);
    const { transferModelReplaySource } = require('../agents/session-model-checkpoint');
    return transferModelReplaySource(hydrated, messages);
}
//# sourceMappingURL=global-source-access.js.map