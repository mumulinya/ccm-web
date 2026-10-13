"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertSourceRunRead = assertSourceRunRead;
exports.buildSourceAccessSummaries = buildSourceAccessSummaries;
exports.handleGlobalSourceAccessApi = handleGlobalSourceAccessApi;
const global_agent_run_store_1 = require("../agents/global/global-agent-run-store");
const delegated_inquiry_projections_1 = require("./delegated-inquiry-projections");
const global_source_access_1 = require("./global-source-access");
const api_access_control_1 = require("../modules/system/api-access-control");
const utils_1 = require("../core/utils");
const access_policy_1 = require("../modules/system/access-policy");
const global_source_model_content_1 = require("./global-source-model-content");
function assertSourceRunRead(run, principal) {
    if (!run)
        throw Object.assign(new Error('SOURCE_RUN_NOT_FOUND'), { status: 404 });
    principal = (0, global_source_access_1.effectiveSourcePrincipal)(principal);
    if (principal?.kind === 'internal' || principal?.role === 'admin')
        return;
    const owner = (0, global_source_access_1.sourceAccessPrincipal)(run);
    if (!principal || !owner || principal.kind !== owner.kind || String(principal.userId || principal.id || '') !== String(owner.userId || owner.id || '')) {
        throw Object.assign(new Error('SOURCE_RUN_ACCESS_DENIED'), { status: 403 });
    }
}
function buildSourceAccessSummaries(run) {
    const records = new Map();
    for (const step of run?.steps || []) {
        const observation = step.observation;
        if ((0, global_source_model_content_1.isGlobalSourceTool)(step.tool?.name) && observation?.sourceAccess?.runId === run.id) {
            const row = observation.sourceAccess;
            records.set(row.accessId, { ...row, status: observation.freshness === 'stale' ? 'stale' : row.status });
            continue;
        }
        if (!['request_project_source_inquiry', 'request_group_source_inquiry'].includes(step.tool?.name))
            continue;
        const snapshot = observation?.inquiry_projection;
        if (!snapshot?.inquiryId)
            continue;
        const latest = (0, delegated_inquiry_projections_1.getDelegatedInquiryProjection)(snapshot.inquiryId);
        const item = latest?.sourceRunId === run.id ? latest : snapshot;
        if (item.sourceSessionId !== run.session_id || (item.sourceRunId && item.sourceRunId !== run.id))
            continue;
        const refs = item.evidenceRefs || (observation.planningEvidenceEntries || []).map(row => ({ project: row.project, path: row.path, checksum: row.checksum, evidenceId: row.evidenceId, verified: true, kind: 'source_read' }));
        records.set(item.inquiryId, { accessId: item.inquiryId, inquiryId: item.inquiryId, mode: 'delegated', status: item.status,
            runId: run.id, sourceMessageId: item.sourceMessageId || run.turn_id || run.id,
            toolCallId: item.toolCallId || step.toolCallId || step.tool?.signature || `${run.id}:${step.index}`,
            projectIds: [...new Set([...refs.map(row => row.project), ...(item.targetScope === 'project' ? [item.targetId] : item.requestedProjectIds || [])].filter(Boolean))], evidenceRefs: refs,
            missingEvidenceSummaries: item.missingEvidenceSummaries || [], availableActions: item.availableActions || [],
            revision: item.revision, conclusionSummary: item.conclusionSummary, ...(item.evidenceRevisions ? { evidenceRevisions: item.evidenceRevisions } : {}) });
    }
    for (const update of run?.source_access_updates || []) {
        const previous = records.get(update.projection?.accessId);
        if (previous?.mode === 'direct' && update.projection.runId === run.id)
            records.set(previous.accessId, { ...update.projection,
                evidenceRevisions: [...(previous.evidenceRevisions || []), { revision: previous.revision, status: previous.status, evidenceRefs: previous.evidenceRefs }].slice(-20) });
    }
    return [...records.values()];
}
function handleGlobalSourceAccessApi(pathname, req, res, parsed) {
    if (pathname !== '/api/global-agent/source-access' || req.method !== 'GET')
        return false;
    void (async () => {
        try {
            const run = (0, global_agent_run_store_1.getGlobalAgentRun)(String(parsed?.query?.run_id || ''));
            const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
            assertSourceRunRead(run, principal);
            const summaries = buildSourceAccessSummaries(run);
            for (const summary of summaries) {
                for (const project of summary.projectIds)
                    (0, global_source_access_1.assertGlobalSourceProjectAccess)(principal, project);
                const delegated = summary.inquiryId && (0, delegated_inquiry_projections_1.getDelegatedInquiryProjection)(summary.inquiryId);
                if (delegated?.targetScope === 'group' && principal?.kind !== 'internal' && !(0, access_policy_1.hasResourceAccess)(String(principal?.userId || ''), principal?.role, 'group', delegated.targetId, 'use'))
                    throw Object.assign(new Error('SOURCE_GROUP_ACCESS_DENIED'), { status: 403 });
                for (const project of [...new Set(summary.evidenceRefs.filter(ref => ref.verified).map(ref => ref.project))]) {
                    const oldRefs = summary.evidenceRefs.filter(ref => ref.verified && ref.project === project);
                    try {
                        for (let offset = 0; offset < oldRefs.length; offset += 12) {
                            const batch = oldRefs.slice(offset, offset + 12);
                            const fresh = await (0, global_source_access_1.authorizedProjectSourceOperation)(project, 'read', { files: batch.map(ref => ({ path: ref.path, startLine: ref.startLine, endLine: ref.endLine })) }, principal);
                            if (!fresh.evidenceRefs.every(ref => batch.some(old => old.path === ref.path && old.checksum === ref.checksum))) {
                                summary.status = 'stale';
                                summary.missingEvidenceSummaries = [...summary.missingEvidenceSummaries, '源码已变化，历史证据需要重新核对'];
                                break;
                            }
                        }
                    }
                    catch (error) {
                        if (/SOURCE_(?:PRINCIPAL|PROJECT_ACCESS)/.test(error.message))
                            throw error;
                        summary.status = 'stale';
                        summary.missingEvidenceSummaries = [...summary.missingEvidenceSummaries, '源码已不可读取，历史证据不能证明当前实现'];
                    }
                }
            }
            res.setHeader('Cache-Control', 'no-store');
            (0, utils_1.sendJson)(res, { success: true, runId: run.id, sourceAccess: summaries });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message }, error.status || 403);
        }
    })();
    return true;
}
//# sourceMappingURL=global-source-summary.js.map