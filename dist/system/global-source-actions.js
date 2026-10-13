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
exports.applyDirectSourceAction = applyDirectSourceAction;
exports.handleGlobalSourceActionApi = handleGlobalSourceActionApi;
const crypto = __importStar(require("crypto"));
const global_agent_run_store_1 = require("../agents/global/global-agent-run-store");
const global_source_summary_1 = require("./global-source-summary");
const global_source_access_1 = require("./global-source-access");
const api_access_control_1 = require("../modules/system/api-access-control");
const utils_1 = require("../core/utils");
const runtime_events_1 = require("./runtime-events");
const credential_store_1 = require("../core/credential-store");
const reliability_ledger_1 = require("./reliability-ledger");
const atomic_json_file_1 = require("../core/atomic-json-file");
const global_agent_run_store_2 = require("../agents/global/global-agent-run-store");
const active = new Set();
const fail = (code, status = 409) => Object.assign(new Error(code), { status });
/** Explicit user operations on read-only evidence never reopen a terminal execution. */
async function applyDirectSourceAction(payload, principal) {
    const run = (0, global_agent_run_store_1.getGlobalAgentRun)(String(payload.run_id || ''));
    (0, global_source_summary_1.assertSourceRunRead)(run, principal);
    const row = (0, global_source_summary_1.buildSourceAccessSummaries)(run).find(value => value.accessId === payload.access_id && value.mode === 'direct');
    if (!row)
        throw fail('SOURCE_ACCESS_NOT_FOUND', 404);
    for (const project of row.projectIds)
        (0, global_source_access_1.assertGlobalSourceProjectAccess)(principal, project);
    const key = String(payload.idempotency_key || '').slice(0, 180);
    if (!key)
        throw fail('SOURCE_ACTION_IDEMPOTENCY_REQUIRED', 400);
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify([row.accessId, payload.revision, payload.action, String(payload.clarification || '')])).digest('hex');
    const previous = (run.source_access_updates || []).find(value => value.idempotencyKey === key);
    if (previous) {
        if (previous.fingerprint !== fingerprint)
            throw fail('SOURCE_ACTION_IDEMPOTENCY_CONFLICT');
        return { replayed: true, projection: previous.projection, ...(previous.navigation ? { navigation: previous.navigation } : {}) };
    }
    if (!['completed', 'failed', 'cancelled'].includes(run.status))
        throw fail('SOURCE_RUN_STILL_ACTIVE');
    if (row.revision !== Number(payload.revision))
        throw fail('SOURCE_ACTION_REVISION_CONFLICT');
    if (!row.availableActions.includes(payload.action))
        throw fail('SOURCE_ACTION_NOT_ALLOWED', 400);
    if (active.has(run.id))
        throw fail('SOURCE_ACTION_IN_PROGRESS');
    const operationKey = `${run.id}:${key}`;
    const priorClaim = (0, reliability_ledger_1.getIdempotencyRecord)('global-source-action', operationKey);
    if (priorClaim?.metadata?.fingerprint && priorClaim.metadata.fingerprint !== fingerprint)
        throw fail('SOURCE_ACTION_IDEMPOTENCY_CONFLICT');
    const claim = (0, reliability_ledger_1.acquireIdempotency)({ scope: 'global-source-action', key: operationKey, traceId: run.trace_id, leaseMs: 120000,
        metadata: { fingerprint, runId: run.id, actorId: principal.userId || principal.id }, retryFailed: true });
    if (claim.record?.metadata?.fingerprint && claim.record.metadata.fingerprint !== fingerprint)
        throw fail('SOURCE_ACTION_IDEMPOTENCY_CONFLICT');
    if (!claim.acquired) {
        if (claim.record?.status === 'completed')
            return { ...claim.record.result, replayed: true };
        throw fail('SOURCE_ACTION_IN_PROGRESS');
    }
    active.add(run.id);
    try {
        let projection = { ...row, revision: row.revision + 1 }, navigation;
        if (payload.action === 'supplement_check') {
            const step = run.steps.find(value => value.observation?.sourceAccess?.accessId === row.accessId);
            if (!step)
                throw fail('SOURCE_REFERENCE_INVALID');
            const observation = await (0, global_source_access_1.executeGlobalSourceTool)(step.tool.name, step.tool.arguments, run, principal);
            projection = { ...observation.sourceAccess, toolCallId: row.toolCallId, revision: row.revision + 1 };
        }
        else {
            const clarification = (0, credential_store_1.redactSensitiveText)(String(payload.clarification || '')).trim().slice(0, 2000);
            if (payload.action === 'provide_clarification' && !clarification)
                throw fail('SOURCE_CLARIFICATION_REQUIRED', 400);
            const subject = (0, credential_store_1.redactSensitiveText)(String(run.original_user_message || run.user_message || '')).slice(0, 2000);
            navigation = { kind: 'navigate', tab: 'global-agent', context: { sessionId: run.session_id,
                    draftMessage: payload.action === 'promote_to_development'
                        ? `请把此前的只读询问转为正式开发需求：${subject}。请重新形成计划并等待确认，不直接开始开发。`
                        : `请继续回答此前的只读询问：${subject}。${clarification ? `用户补充：${clarification}。` : ''}请重新核验当前证据，明确未确认部分。` } };
        }
        // Recheck ownership/authorization after asynchronous file work, then merge.
        const result = (0, atomic_json_file_1.withFileLock)(global_agent_run_store_2.STORE_FILE, () => {
            (0, global_agent_run_store_2.invalidateGlobalAgentRunStoreCache)();
            const current = (0, global_agent_run_store_1.getGlobalAgentRun)(run.id);
            (0, global_source_summary_1.assertSourceRunRead)(current, principal);
            for (const project of row.projectIds)
                (0, global_source_access_1.assertGlobalSourceProjectAccess)(principal, project);
            const latest = (0, global_source_summary_1.buildSourceAccessSummaries)(current).find(value => value.accessId === row.accessId);
            if (latest?.revision !== row.revision)
                throw fail('SOURCE_ACTION_REVISION_CONFLICT');
            const record = { idempotencyKey: key, fingerprint, projection, ...(navigation ? { navigation } : {}),
                actorType: principal.kind, actorId: String(principal.userId || principal.id || ''), action: payload.action, createdAt: new Date().toISOString() };
            current.source_access_updates = [...(current.source_access_updates || []), record].slice(-120);
            (0, global_agent_run_store_1.saveRun)(current);
            return { replayed: false, projection, ...(navigation ? { navigation } : {}) };
        });
        (0, reliability_ledger_1.completeIdempotency)('global-source-action', operationKey, result);
        (0, runtime_events_1.publishRuntimeEvent)('global', 'global.source_access_action', { runId: run.id, traceId: run.trace_id, accessId: row.accessId, revision: projection.revision,
            action: payload.action, actorType: principal.kind, actorId: String(principal.userId || principal.id || '') });
        return result;
    }
    catch (error) {
        (0, reliability_ledger_1.failIdempotency)('global-source-action', operationKey, error);
        throw error;
    }
    finally {
        active.delete(run.id);
    }
}
function handleGlobalSourceActionApi(pathname, req, res) {
    if (pathname !== '/api/global-agent/source-access/action' || req.method !== 'POST')
        return false;
    void (async () => {
        try {
            let body = '';
            for await (const chunk of req) {
                body += chunk;
                if (body.length > 16000)
                    throw fail('SOURCE_REQUEST_TOO_LARGE', 413);
            }
            const result = await applyDirectSourceAction(JSON.parse(body || '{}'), (0, api_access_control_1.requestAccessPrincipal)(req));
            res.setHeader('Cache-Control', 'no-store');
            (0, utils_1.sendJson)(res, { success: true, ...result });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, error.status || 400);
        }
    })();
    return true;
}
//# sourceMappingURL=global-source-actions.js.map