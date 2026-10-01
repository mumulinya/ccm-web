"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelToolBody = modelToolBody;
exports.modelToolTokens = modelToolTokens;
exports.toModelToolResult = toModelToolResult;
exports.executionModelToolResult = executionModelToolResult;
exports.globalModelToolObservation = globalModelToolObservation;
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const context_budget_1 = require("../system/context-budget");
const workspace_model_body_1 = require("../tools/workspace-model-body");
const model_tool_attachments_1 = require("./model-tool-attachments");
// Only CCM runtime envelopes may be unwrapped. Business payloads can legally
// contain output/result/modelOutput fields and must remain intact.
function runtimeEnvelope(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        && typeof value.name === "string" && typeof value.toolKind === "string"
        && typeof value.ok === "boolean" && (typeof value.source === "string" || typeof value.itemName === "string");
}
function modelToolBody(row) {
    if (row?.modelOutput !== undefined)
        return row.modelOutput;
    let body = row?.output !== undefined ? row.output : row?.rawOutput;
    const seen = new Set();
    while (runtimeEnvelope(body) && !seen.has(body)) {
        seen.add(body);
        if (body.modelOutput !== undefined)
            return body.modelOutput;
        body = body.output !== undefined ? body.output : body.rawOutput;
    }
    return body;
}
function modelToolTokens(row) {
    const body = (0, workspace_model_body_1.compactWorkspaceModelBody)(modelToolBody(row));
    return (0, context_budget_1.estimateTextTokens)(typeof body === "string" ? body : JSON.stringify((0, workspace_model_result_projection_1.canonicalModelValue)(body ?? null)));
}
function toModelToolResult(row, callId, name = row?.name || "unknown") {
    const body = (0, workspace_model_result_projection_1.canonicalModelValue)((0, workspace_model_body_1.compactWorkspaceModelBody)(modelToolBody(row)));
    const auditReceipt = row?.auditReceipt || (runtimeEnvelope(row?.output) ? row.output.auditReceipt : undefined);
    const attachments = (0, model_tool_attachments_1.modelToolAttachments)(row);
    return {
        callId, name, ok: row?.ok !== false,
        output: body, modelOutput: body,
        ...(auditReceipt ? { auditReceipt } : {}),
        ...(attachments.length ? { modelAttachments: attachments } : {}),
        ...(row?.error ? { error: row.error } : {}),
        ...(row?.reason ? { reason: row.reason } : {}),
    };
}
/** The outer observation/error pair belongs to the execution ledger, not the tool. */
function executionModelToolResult(event) {
    const record = event.modelContent !== undefined ? event.modelContent : event.payload;
    const wrapped = record && typeof record === 'object' && Object.hasOwn(record, 'observation')
        && Object.keys(record).every(key => ['observation', 'error'].includes(key));
    const observation = wrapped ? record.observation : record;
    const output = runtimeEnvelope(observation) ? modelToolBody(observation) : globalModelToolObservation(observation);
    return toModelToolResult({ output, ok: event.status !== 'error' && !(wrapped && record.error) && !(runtimeEnvelope(observation) && observation.ok === false),
        error: (wrapped && record.error) || (runtimeEnvelope(observation) && observation.error) || undefined }, event.toolCallId, event.toolName);
}
/** Global tools also return business observations, not just runtime rows. */
function globalModelToolObservation(observation) {
    if (runtimeEnvelope(observation))
        return modelToolBody(observation);
    if (!observation || typeof observation !== "object" || Array.isArray(observation))
        return observation;
    const result = runtimeEnvelope(observation.result) ? modelToolBody(observation.result) : observation.result;
    const audit = observation.auditReceipt?.schema === "ccm-workspace-tool-audit-v1";
    const nestedAudit = result?.auditReceipt?.schema === "ccm-workspace-tool-audit-v1";
    const next = { ...observation };
    if (audit)
        delete next.auditReceipt;
    if (result !== observation.result || nestedAudit) {
        next.result = (0, workspace_model_body_1.compactWorkspaceModelBody)(nestedAudit ? { ...result } : result);
        if (nestedAudit)
            delete next.result.auditReceipt;
    }
    return next;
}
//# sourceMappingURL=model-tool-result.js.map