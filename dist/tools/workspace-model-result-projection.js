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
exports.canonicalModelValue = canonicalModelValue;
exports.stableModelJson = stableModelJson;
exports.aggregateWorkspaceModelAuditReceipts = aggregateWorkspaceModelAuditReceipts;
exports.projectWorkspaceToolResultForModel = projectWorkspaceToolResultForModel;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../system/context-budget");
const workspace_model_body_1 = require("./workspace-model-body");
const workspace_directory_model_body_1 = require("./workspace-directory-model-body");
const WORKSPACE_ENVELOPE_SCHEMA = "ccm-workspace-tool-envelope-v3";
// These keys are execution diagnostics, not file evidence. They are removed
// from the model-visible projection while the original receipt remains
// available to UI/audit callers.
const VOLATILE_KEYS = new Set([
    "durationMs", "duration_ms", "toolCallId", "tool_call_id", "callId", "call_id",
    "startedAt", "started_at", "createdAt", "created_at", "updatedAt", "updated_at", "timestamp",
    "output_tokens", "outputTokens", "workspaceBudget", "workspace_budget",
    "source", "scope", "loaded", "reason", "runId", "run_id",
    "result_checksum", "resultChecksum",
    "tool_usage_policy_version", "search_scope", "search_scope_explicit", "search_scope_too_broad", "scope_too_broad",
    "requested_result_count", "returned_result_count", "omitted_result_count", "respect_gitignore",
    "excluded_directory_count", "delegation_recommended", "duplicate_call_suppressed",
    "ignore_policy", "ignore_degraded_reason", "explicit_scope_override", "ccm_generated_workspace_detected",
]);
/**
 * Produce the exact object shape that is serialized into model messages.
 * Arrays are intentionally left in their source order because line and search
 * result order is evidence; plain-object keys are sorted for cache stability.
 */
function canonicalModelValue(value) {
    if (Array.isArray(value))
        return value.map(canonicalModelValue);
    if (!value || typeof value !== "object")
        return value;
    const prototype = Object.getPrototypeOf(value);
    // Keep special values (Buffer, Date, provider SDK objects) intact so their
    // normal JSON representation is not changed by the projection.
    if (prototype !== Object.prototype && prototype !== null)
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalModelValue(value[key])]));
}
function stableModelJson(value) {
    try {
        return JSON.stringify(canonicalModelValue(value ?? null));
    }
    catch {
        return JSON.stringify(String(value ?? ""));
    }
}
function checksum(value) {
    return crypto.createHash("sha256").update(stableModelJson(value)).digest("hex");
}
function stripVolatile(value, removed, path = "") {
    if (Array.isArray(value))
        return value.map((item, index) => stripVolatile(item, removed, `${path}[${index}]`));
    if (!value || typeof value !== "object")
        return value;
    const result = {};
    for (const key of Object.keys(value)) {
        if (VOLATILE_KEYS.has(key)) {
            removed.push(path ? `${path}.${key}` : key);
            continue;
        }
        result[key] = key === 'modelPayload' && value.schema === WORKSPACE_ENVELOPE_SCHEMA
            ? stripVolatile(value[key], removed, path ? `${path}.${key}` : key)
            : value[key];
    }
    return result;
}
function unwrapWorkspacePayload(value) {
    if (value?.schema === WORKSPACE_ENVELOPE_SCHEMA && value.modelPayload !== undefined)
        return value.modelPayload;
    return value;
}
function aggregateWorkspaceModelAuditReceipts(values) {
    const receipts = (Array.isArray(values) ? values : [])
        .map(value => value?.auditReceipt || value)
        .filter(value => value && typeof value === "object" && value.schema === "ccm-workspace-tool-audit-v1");
    const checksums = receipts.map(value => String(value.stable_model_payload_checksum || "")).filter(Boolean).sort();
    return {
        model_visible_tokens: receipts.reduce((sum, value) => sum + Math.max(0, Number(value.model_visible_tokens || value.modelVisibleTokens || 0)), 0),
        audit_only_tokens: receipts.reduce((sum, value) => sum + Math.max(0, Number(value.audit_only_tokens || 0)), 0),
        stripped_dynamic_field_count: receipts.reduce((sum, value) => sum + Math.max(0, Number(value.stripped_dynamic_field_count || 0)), 0),
        stable_model_payload_checksum: checksum(checksums),
        provider_cache_hit_ratio: null,
        tool_count: receipts.length,
    };
}
function projectWorkspaceToolResultForModel(value, workspaceToolName) {
    const strippedFields = [];
    // Strip the envelope first so volatile fields on either the envelope or the
    // nested model payload are accounted for, then expose the stable payload.
    const stableEnvelope = stripVolatile(value, strippedFields);
    const payload = unwrapWorkspacePayload(stableEnvelope);
    const modelOutput = canonicalModelValue((0, workspace_model_body_1.compactWorkspaceModelBody)(workspaceToolName === 'list_directory'
        ? (0, workspace_directory_model_body_1.compactWorkspaceDirectoryModelBody)(payload) : payload));
    const sourceJson = stableModelJson(value);
    const modelJson = stableModelJson(modelOutput);
    const unwrappedSource = unwrapWorkspacePayload(value);
    const diagnosticSource = unwrappedSource && typeof unwrappedSource === "object" ? unwrappedSource : {};
    const originalTokens = (0, context_budget_1.estimateTextTokens)(sourceJson);
    const modelVisibleTokens = (0, context_budget_1.estimateTextTokens)(modelJson);
    return {
        modelOutput,
        auditReceipt: {
            schema: "ccm-workspace-tool-audit-v1",
            sourceChecksum: checksum(value),
            modelVisibleChecksum: checksum(modelOutput),
            originalTokens,
            modelVisibleTokens,
            strippedFields,
            model_visible_tokens: modelVisibleTokens,
            audit_only_tokens: Math.max(0, originalTokens - modelVisibleTokens),
            stripped_dynamic_field_count: strippedFields.length,
            stable_model_payload_checksum: checksum(modelOutput),
            provider_cache_hit_ratio: null,
            ...(diagnosticSource.tool_usage_policy_version ? { tool_usage_policy_version: String(diagnosticSource.tool_usage_policy_version) } : {}),
            ...(diagnosticSource.search_scope ? { search_scope: String(diagnosticSource.search_scope) } : {}),
            ...(typeof diagnosticSource.search_scope_explicit === "boolean" ? { search_scope_explicit: diagnosticSource.search_scope_explicit } : {}),
            ...(typeof diagnosticSource.scope_too_broad === "boolean" ? { search_scope_too_broad: diagnosticSource.scope_too_broad } : {}),
            ...(Number.isFinite(Number(diagnosticSource.requested_result_count)) ? { requested_result_count: Number(diagnosticSource.requested_result_count) } : {}),
            ...(Number.isFinite(Number(diagnosticSource.returned_result_count)) ? { returned_result_count: Number(diagnosticSource.returned_result_count) } : {}),
            ...(Number.isFinite(Number(diagnosticSource.omitted_result_count)) ? { omitted_result_count: Number(diagnosticSource.omitted_result_count) } : {}),
            ...(typeof diagnosticSource.respect_gitignore === "boolean" ? { respect_gitignore: diagnosticSource.respect_gitignore } : {}),
            ...(Number.isFinite(Number(diagnosticSource.excluded_directory_count)) ? { excluded_directory_count: Number(diagnosticSource.excluded_directory_count) } : {}),
            ...(typeof diagnosticSource.delegation_recommended === "boolean" ? { delegation_recommended: diagnosticSource.delegation_recommended } : {}),
            ...(["native", "degraded", "disabled"].includes(String(diagnosticSource.ignore_policy || "")) ? { ignore_policy: diagnosticSource.ignore_policy } : {}),
            ...(diagnosticSource.ignore_degraded_reason ? { ignore_degraded_reason: String(diagnosticSource.ignore_degraded_reason) } : {}),
            contentStored: false,
        },
    };
}
//# sourceMappingURL=workspace-model-result-projection.js.map