"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGlobalSourceFailure = recordGlobalSourceFailure;
const global_source_model_content_1 = require("./global-source-model-content");
const global_source_access_1 = require("./global-source-access");
const delegated_inquiry_projections_1 = require("./delegated-inquiry-projections");
function recordGlobalSourceFailure(run, call, error) {
    const direct = (0, global_source_model_content_1.isGlobalSourceTool)(call.name), delegated = ['request_project_source_inquiry', 'request_group_source_inquiry'].includes(call.name);
    if (!direct && !delegated)
        return;
    const reason = /^SOURCE_[A-Z_]+$/.test(error?.message || '') ? error.message : 'SOURCE_READ_FAILED';
    const observation = direct ? { schema: 'ccm-global-project-source-result-v1', project: call.arguments?.project,
        sourceAccess: { ...(0, global_source_access_1.directSourceSummary)(run, call.name, call.arguments || {}, {}), status: 'failed', missingEvidenceSummaries: [reason], availableActions: ['supplement_check', 'provide_clarification', 'promote_to_development'] } }
        : { inquiry_projection: (0, delegated_inquiry_projections_1.listDelegatedInquiryProjections)({ sourceSessionId: run.session_id, limit: 100 }).find(row => row.sourceRunId === run.id && row.status === 'failed') };
    run.steps = run.steps || [];
    run.steps.push({ index: run.steps.length + 1, at: new Date().toISOString(), state: 'investigate', message: '',
        tool: { name: call.name, arguments: call.arguments || {}, risk: 'read' }, toolCallId: call.id, observation });
}
//# sourceMappingURL=global-source-failure.js.map