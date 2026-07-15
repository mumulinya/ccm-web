import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { recordProviderNativeCompactSessionOutcome } from "./provider-native-compact-session-capacity";

export const PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION = 2;
export const PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA = "ccm-provider-native-compact-execution-receipt-v2";
export const PROVIDER_NATIVE_COMPACT_EXECUTION_LEDGER_SCHEMA = "ccm-provider-native-compact-execution-ledger-v2";
const LEGACY_PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA = "ccm-provider-native-compact-execution-receipt-v1";

const ROOT = path.join(CCM_DIR, "provider-native-compact-execution-receipts");
const REQUIRED_CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27";

function cleanScopePart(value: any) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}

function stableJson(value: any): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function checksum(value: any, length = 64) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex").slice(0, length);
}

function planChecksum(value: any, length = 24) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}

function stringList(...values: any[]) {
  return Array.from(new Set(values.flat(Infinity).map(value => String(value || "").trim()).filter(Boolean)));
}

function headerValue(headers: any, name: string) {
  if (!headers) return "";
  const wanted = String(name || "").toLowerCase();
  if (typeof headers.get === "function") {
    try { return String(headers.get(name) || headers.get(wanted) || ""); } catch {}
  }
  if (Array.isArray(headers)) {
    const match = headers.find((row: any) => String(row?.[0] || "").toLowerCase() === wanted);
    return String(match?.[1] || "");
  }
  if (typeof headers === "object") {
    const key = Object.keys(headers).find(item => item.toLowerCase() === wanted);
    return key ? String(headers[key] || "") : "";
  }
  return "";
}

function betaHeaders(input: any, requestPatch: any) {
  return stringList(
    input.betaHeaders || input.beta_headers || [],
    requestPatch?.beta_headers || requestPatch?.betaHeaders || [],
    headerValue(input.headers || input.requestHeaders || input.request_headers, "anthropic-beta").split(","),
    headerValue(input.headers || input.requestHeaders || input.request_headers, "x-anthropic-beta").split(","),
  );
}

function receiptIdentity(receipt: any) {
  const { receipt_checksum: _checksum, ...identity } = receipt || {};
  return identity;
}

function sanitizedEndpoint(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().slice(0, 260);
  } catch {
    return raw.split(/[?#]/, 1)[0].slice(0, 260);
  }
}

function summarizeAppliedEdits(value: any) {
  return (Array.isArray(value) ? value : []).map((edit: any) => ({
    type: String(edit?.type || "").trim(),
    cleared_thinking_turns: Math.max(0, Number(edit?.cleared_thinking_turns || edit?.clearedThinkingTurns || 0)),
    cleared_tool_uses: Math.max(0, Number(edit?.cleared_tool_uses || edit?.clearedToolUses || 0)),
    cleared_input_tokens: Math.max(0, Number(edit?.cleared_input_tokens || edit?.clearedInputTokens || 0)),
  })).filter((edit: any) => edit.type).slice(0, 24);
}

function responseUsageTokens(providerResponse: any) {
  const usage = providerResponse?.usage && typeof providerResponse.usage === "object" ? providerResponse.usage : {};
  const finite = (value: any) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  };
  const directInput = Math.max(finite(usage.input_tokens), finite(usage.inputTokens));
  const cacheCreation = Math.max(finite(usage.cache_creation_input_tokens), finite(usage.cacheCreationInputTokens));
  const cacheRead = Math.max(finite(usage.cache_read_input_tokens), finite(usage.cacheReadInputTokens));
  return {
    input: directInput + cacheCreation + cacheRead,
    output: Math.max(finite(usage.output_tokens), finite(usage.outputTokens)),
  };
}

export function getProviderNativeCompactExecutionReceiptLedgerFile(groupId: string, groupSessionId = "") {
  const sessionId = String(groupSessionId || "default").trim() || "default";
  if (sessionId === "default") return path.join(ROOT, `${cleanScopePart(groupId)}.json`);
  return path.join(ROOT, cleanScopePart(groupId), `${cleanScopePart(sessionId)}.json`);
}

export function verifyProviderNativeCompactExecutionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  const receiptVersion = Number(receipt?.version || 0);
  const supportedSchema = receipt?.schema === PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA && receiptVersion === PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION
    || receipt?.schema === LEGACY_PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA && receiptVersion === 1;
  if (!supportedSchema) issues.push("schema");
  const expectedChecksum = checksum(receiptIdentity(receipt));
  if (!receipt?.receipt_checksum || receipt.receipt_checksum !== expectedChecksum) issues.push("receipt_checksum");
  const bindings = [
    ["group_id", expected.groupId || expected.group_id],
    ["group_session_id", expected.groupSessionId || expected.group_session_id],
    ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
    ["native_session_id", expected.nativeSessionId || expected.native_session_id],
    ["execution_id", expected.executionId || expected.execution_id],
    ["runner_request_id", expected.runnerRequestId || expected.runner_request_id],
    ["memory_context_snapshot_id", expected.memoryContextSnapshotId || expected.memory_context_snapshot_id],
    ["memory_context_snapshot_checksum", expected.memoryContextSnapshotChecksum || expected.memory_context_snapshot_checksum],
    ["plan_checksum", expected.planChecksum || expected.plan_checksum],
    ["apply_plan_checksum", expected.applyPlanChecksum || expected.apply_plan_checksum],
    ["request_patch_checksum", expected.requestPatchChecksum || expected.request_patch_checksum],
    ["capacity_generation", expected.capacityGeneration || expected.capacity_generation],
  ];
  for (const [field, wanted] of bindings) {
    if (String(wanted || "").trim() && String(receipt?.[field] || "") !== String(wanted)) issues.push(field);
  }
  if (receipt?.status === "native_applied" && receiptVersion >= 2) {
    if (receipt?.strong_proof !== true) issues.push("native_applied_without_strong_proof");
    if (receipt?.provider_outcome_verified !== true) issues.push("native_applied_without_provider_outcome");
    if (Number(receipt?.applied_edit_count || 0) < 1) issues.push("native_applied_without_applied_edits");
  }
  return { valid: issues.length === 0, issues, expected_checksum: expectedChecksum };
}

export function buildProviderNativeCompactExecutionReceipt(input: any = {}) {
  const plan = input.apiMicrocompactNativeApplyPlan
    || input.api_microcompact_native_apply_plan
    || input.nativeApplyPlan
    || input.native_apply_plan
    || {};
  const requestPatch = input.requestPatch || input.request_patch || plan.requestPatch || plan.request_patch || null;
  const requestBody = input.requestBody || input.request_body || {};
  const expectedContextManagement = requestPatch?.body?.context_management || null;
  const actualContextManagement = requestBody?.context_management || null;
  const betas = betaHeaders(input, requestPatch);
  const groupId = String(input.groupId || input.group_id || plan.groupId || plan.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || plan.groupSessionId || plan.group_session_id || "").trim();
  const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || plan.taskAgentSessionId || plan.task_agent_session_id || "").trim();
  const nativeSessionId = String(input.nativeSessionId || input.native_session_id || plan.nativeSessionId || plan.native_session_id || "").trim();
  const executionId = String(input.executionId || input.execution_id || plan.executionId || plan.execution_id || "").trim();
  const runnerRequestId = String(input.runnerRequestId || input.runner_request_id || input.externalRunnerRequestId || input.external_runner_request_id || plan.runnerRequestId || plan.runner_request_id || "").trim();
  const snapshotId = String(input.memoryContextSnapshotId || input.memory_context_snapshot_id || plan.memoryContextSnapshotId || plan.memory_context_snapshot_id || "").trim();
  const snapshotChecksum = String(input.memoryContextSnapshotChecksum || input.memory_context_snapshot_checksum || plan.memoryContextSnapshotChecksum || plan.memory_context_snapshot_checksum || "").trim();
  const capacityGeneration = Math.max(1, Number(
    input.capacityGeneration
    || input.capacity_generation
    || plan.providerSessionCapacityGeneration
    || plan.provider_session_capacity_generation
    || 1
  ));
  const expectedRequestPatchChecksum = String(plan.requestPatchChecksum || plan.request_patch_checksum || "").trim();
  const computedRequestPatchChecksum = requestPatch ? planChecksum(requestPatch) : "";
  const responseStatus = Number(input.responseStatus || input.response_status || input.httpStatus || input.http_status || 0);
  const providerRequestId = String(input.requestId || input.request_id || input.providerRequestId || input.provider_request_id || "").trim();
  const provider = String(input.provider || plan.executor?.provider || plan.provider || "").trim().toLowerCase();
  const transport = String(input.transport || plan.executor?.transport || plan.transport || "").trim().toLowerCase();
  const error = String(input.error || input.errorMessage || input.error_message || "").trim().slice(0, 500);
  const responseParseError = String(input.responseParseError || input.response_parse_error || "").trim().slice(0, 300);
  const requestAccepted = input.ok === true && responseStatus >= 200 && responseStatus < 300;
  const providerResponse = input.providerResponse || input.provider_response || input.responseBody || input.response_body || {};
  const responseContextManagement = input.providerResponseContextManagement
    || input.provider_response_context_management
    || providerResponse?.context_management
    || providerResponse?.contextManagement
    || null;
  const providerUsage = responseUsageTokens(providerResponse);
  const responseAppliedEditsDeclared = !!responseContextManagement && Array.isArray(responseContextManagement.applied_edits || responseContextManagement.appliedEdits);
  const appliedEdits = summarizeAppliedEdits(responseContextManagement?.applied_edits || responseContextManagement?.appliedEdits || []);
  const providerOutcomeVerified = requestAccepted && responseAppliedEditsDeclared && appliedEdits.length > 0;
  const nativeRequest = plan.nativeApplyReady === true
    && plan.mode === "native_api_context_management"
    && provider === "anthropic"
    && ["anthropic_api", "anthropic-sdk", "claude_api", "provider_api", "api"].includes(transport);
  const planBindings = {
    groupId: String(plan.groupId || plan.group_id || "").trim(),
    groupSessionId: String(plan.groupSessionId || plan.group_session_id || "").trim(),
    taskAgentSessionId: String(plan.taskAgentSessionId || plan.task_agent_session_id || "").trim(),
    nativeSessionId: String(plan.nativeSessionId || plan.native_session_id || "").trim(),
    executionId: String(plan.executionId || plan.execution_id || "").trim(),
    runnerRequestId: String(plan.runnerRequestId || plan.runner_request_id || "").trim(),
    snapshotId: String(plan.memoryContextSnapshotId || plan.memory_context_snapshot_id || "").trim(),
    snapshotChecksum: String(plan.memoryContextSnapshotChecksum || plan.memory_context_snapshot_checksum || "").trim(),
  };
  const gaps = [
    !groupId ? "group_id" : "",
    !groupSessionId ? "group_session_id" : "",
    !taskAgentSessionId ? "task_agent_session_id" : "",
    !nativeSessionId ? "native_session_id" : "",
    !executionId ? "execution_id" : "",
    !runnerRequestId ? "runner_request_id" : "",
    !snapshotId ? "memory_context_snapshot_id" : "",
    !snapshotChecksum ? "memory_context_snapshot_checksum" : "",
    !String(plan.apiEditPlanChecksum || plan.api_edit_plan_checksum || "").trim() ? "plan_checksum" : "",
    !String(plan.applyPlanChecksum || plan.apply_plan_checksum || "").trim() ? "apply_plan_checksum" : "",
    !expectedRequestPatchChecksum ? "request_patch_checksum" : "",
    expectedRequestPatchChecksum && computedRequestPatchChecksum !== expectedRequestPatchChecksum ? "request_patch_checksum_mismatch" : "",
    !actualContextManagement ? "context_management" : "",
    actualContextManagement && expectedContextManagement && checksum(actualContextManagement) !== checksum(expectedContextManagement) ? "context_management_mismatch" : "",
    !betas.includes(REQUIRED_CONTEXT_MANAGEMENT_BETA) ? "context_management_beta" : "",
    !String(input.model || "").trim() ? "model" : "",
    !String(input.endpoint || input.url || input.apiUrl || input.api_url || "").trim() ? "endpoint" : "",
    !providerRequestId ? "provider_request_id" : "",
    !requestAccepted ? "provider_request_not_accepted" : "",
    planBindings.groupId && planBindings.groupId !== groupId ? "group_id_mismatch" : "",
    planBindings.groupSessionId && planBindings.groupSessionId !== groupSessionId ? "group_session_id_mismatch" : "",
    planBindings.taskAgentSessionId && planBindings.taskAgentSessionId !== taskAgentSessionId ? "task_agent_session_id_mismatch" : "",
    planBindings.nativeSessionId && planBindings.nativeSessionId !== nativeSessionId ? "native_session_id_mismatch" : "",
    planBindings.executionId && planBindings.executionId !== executionId ? "execution_id_mismatch" : "",
    planBindings.runnerRequestId && planBindings.runnerRequestId !== runnerRequestId ? "runner_request_id_mismatch" : "",
    planBindings.snapshotId && planBindings.snapshotId !== snapshotId ? "memory_context_snapshot_id_mismatch" : "",
    planBindings.snapshotChecksum && planBindings.snapshotChecksum !== snapshotChecksum ? "memory_context_snapshot_checksum_mismatch" : "",
  ].filter(Boolean);
  const cliBoundary = plan?.executor?.cli === true || ["cli", "external_cli"].includes(transport);
  const requestContractComplete = gaps.length === 0;
  const status = cliBoundary || plan.advisoryOnly === true
    ? "advisory_only"
    : error || input.ok === false || (responseStatus > 0 && !requestAccepted)
      ? "request_failed"
      : nativeRequest && requestContractComplete && providerOutcomeVerified
        ? "native_applied"
        : nativeRequest && requestContractComplete && requestAccepted && responseAppliedEditsDeclared
          ? "no_edits_applied"
          : nativeRequest && requestContractComplete && requestAccepted
            ? "request_accepted"
        : "unverified";
  const sentAt = String(input.sentAt || input.sent_at || new Date().toISOString());
  const acceptedAt = requestAccepted ? String(input.acceptedAt || input.accepted_at || new Date().toISOString()) : "";
  const base: any = {
    schema: PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA,
    version: PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION,
    status,
    strong_proof: status === "native_applied",
    provider_outcome_verified: providerOutcomeVerified,
    telemetry_source: "native_request_adapter",
    group_id: groupId,
    group_session_id: groupSessionId || "default",
    target_project: String(input.targetProject || input.target_project || plan.targetProject || plan.target_project || "").trim(),
    task_id: String(input.taskId || input.task_id || "").trim(),
    task_agent_session_id: taskAgentSessionId,
    native_session_id: nativeSessionId,
    execution_id: executionId,
    runner_request_id: runnerRequestId,
    memory_context_snapshot_id: snapshotId,
    memory_context_snapshot_checksum: snapshotChecksum,
    capacity_generation: capacityGeneration,
    plan_checksum: String(plan.apiEditPlanChecksum || plan.api_edit_plan_checksum || "").trim(),
    apply_plan_checksum: String(plan.applyPlanChecksum || plan.apply_plan_checksum || "").trim(),
    request_patch_checksum: expectedRequestPatchChecksum,
    computed_request_patch_checksum: computedRequestPatchChecksum,
    request_body_checksum: checksum(requestBody, 24),
    context_management_checksum: actualContextManagement ? checksum(actualContextManagement, 24) : "",
    context_management_edit_count: Number(actualContextManagement?.edits?.length || 0),
    beta_headers: betas.slice(0, 12),
    provider,
    transport,
    model: String(input.model || "").trim(),
    endpoint: sanitizedEndpoint(input.endpoint || input.url || input.apiUrl || input.api_url || ""),
    method: String(input.method || "POST").trim().toUpperCase(),
    response_status: responseStatus,
    provider_request_id: providerRequestId,
    provider_response_context_management_checksum: responseContextManagement ? checksum(responseContextManagement, 24) : "",
    provider_response_applied_edits_declared: responseAppliedEditsDeclared,
    provider_response_parse_error: responseParseError,
    provider_response_input_tokens: providerUsage.input,
    provider_response_output_tokens: providerUsage.output,
    applied_edit_count: appliedEdits.length,
    applied_edits: appliedEdits,
    cleared_input_tokens: appliedEdits.reduce((sum: number, edit: any) => sum + Number(edit.cleared_input_tokens || 0), 0),
    cleared_thinking_turns: appliedEdits.reduce((sum: number, edit: any) => sum + Number(edit.cleared_thinking_turns || 0), 0),
    cleared_tool_uses: appliedEdits.reduce((sum: number, edit: any) => sum + Number(edit.cleared_tool_uses || 0), 0),
    sent_at: sentAt,
    accepted_at: acceptedAt,
    validation: {
      request_patch_checksum_matched: !!expectedRequestPatchChecksum && computedRequestPatchChecksum === expectedRequestPatchChecksum,
      context_management_matched: !!actualContextManagement && !!expectedContextManagement && checksum(actualContextManagement) === checksum(expectedContextManagement),
      beta_header_matched: betas.includes(REQUIRED_CONTEXT_MANAGEMENT_BETA),
      provider_request_accepted: requestAccepted,
      provider_response_outcome_present: responseAppliedEditsDeclared,
      provider_response_applied_edit_count: appliedEdits.length,
      exact_binding_complete: gaps.filter(gap => !["provider_request_not_accepted", "provider_request_id", "model", "endpoint", "context_management", "context_management_beta", "context_management_mismatch", "request_patch_checksum_mismatch"].includes(gap)).length === 0,
      gaps,
    },
    failure_reason: error
      || (status === "unverified" ? `missing_or_mismatched:${gaps.join(",")}` : "")
      || (status === "request_accepted" ? responseParseError ? `provider_response_parse_error:${responseParseError}` : "provider_response_outcome_missing" : "")
      || (status === "no_edits_applied" ? "provider_reported_no_applied_edits" : ""),
    created_at: new Date().toISOString(),
  };
  const receiptId = `pncer_${checksum({
    groupId,
    groupSessionId: base.group_session_id,
    executionId,
    runnerRequestId,
    requestBodyChecksum: base.request_body_checksum,
    providerRequestId,
    sentAt,
  }, 24)}`;
  const receipt = { ...base, receipt_id: receiptId, receipt_checksum: "" };
  receipt.receipt_checksum = checksum(receiptIdentity(receipt));
  return receipt;
}

export function readProviderNativeCompactExecutionReceiptLedger(groupId: string, groupSessionId = "") {
  const file = getProviderNativeCompactExecutionReceiptLedgerFile(groupId, groupSessionId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return { ...parsed, file, entries };
  } catch {
    return {
      schema: PROVIDER_NATIVE_COMPACT_EXECUTION_LEDGER_SCHEMA,
      version: PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION,
      groupId,
      groupSessionId: String(groupSessionId || "default"),
      file,
      entries: [],
      totals: { native_applied: 0, request_accepted: 0, no_edits_applied: 0, advisory_only: 0, not_supported: 0, request_failed: 0, unverified: 0, invalid: 0, total: 0 },
      updatedAt: "",
    };
  }
}

export function recordProviderNativeCompactExecutionReceipt(input: any = {}) {
  const receipt = [PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA, LEGACY_PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_SCHEMA].includes(String(input?.schema || ""))
    ? input
    : buildProviderNativeCompactExecutionReceipt(input);
  const verification = verifyProviderNativeCompactExecutionReceipt(receipt);
  if (!verification.valid) return { recorded: false, verification, receipt };
  const groupId = String(receipt.group_id || "").trim();
  const groupSessionId = String(receipt.group_session_id || "default").trim() || "default";
  if (!groupId) return { recorded: false, verification: { valid: false, issues: ["group_id"] }, receipt };
  const file = getProviderNativeCompactExecutionReceiptLedgerFile(groupId, groupSessionId);
  const recorded = withFileLock(file, () => {
    const ledger = readProviderNativeCompactExecutionReceiptLedger(groupId, groupSessionId);
    const entryMap = new Map((ledger.entries || []).map((entry: any) => [entry.receipt_id, entry]));
    const existed = entryMap.has(receipt.receipt_id);
    entryMap.set(receipt.receipt_id, receipt);
    const entries = Array.from(entryMap.values()).sort((a: any, b: any) => String(a.sent_at || "").localeCompare(String(b.sent_at || ""))).slice(-320);
    const totals = entries.reduce((acc: any, entry: any) => {
      const valid = verifyProviderNativeCompactExecutionReceipt(entry).valid;
      const status = valid ? String(entry.status || "unverified") : "invalid";
      acc[status] = Number(acc[status] || 0) + 1;
      acc.total += 1;
      return acc;
    }, { native_applied: 0, request_accepted: 0, no_edits_applied: 0, advisory_only: 0, not_supported: 0, request_failed: 0, unverified: 0, invalid: 0, total: 0 });
    writeJsonAtomic(file, {
      schema: PROVIDER_NATIVE_COMPACT_EXECUTION_LEDGER_SCHEMA,
      version: PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION,
      groupId,
      groupSessionId,
      entries,
      totals,
      updatedAt: new Date().toISOString(),
    });
    return { recorded: !existed, updated: existed, file, receipt, totals, verification };
  });
  let sessionCapacityOutcome: any = null;
  try { sessionCapacityOutcome = recordProviderNativeCompactSessionOutcome(receipt); } catch {}
  return { ...recorded, sessionCapacityOutcome };
}

export function buildProviderNativeCompactExecutionReceiptSummary(groupId: string, options: any = {}) {
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "default");
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const planChecksums = new Set((Array.isArray(options.planChecksums || options.plan_checksums) ? (options.planChecksums || options.plan_checksums) : [])
    .map((value: any) => String(value || "").trim()).filter(Boolean));
  const ledger = readProviderNativeCompactExecutionReceiptLedger(groupId, groupSessionId);
  const entries = (ledger.entries || [])
    .filter((entry: any) => !targetProject || String(entry.target_project || "").trim().toLowerCase() === targetProject)
    .filter((entry: any) => !planChecksums.size || planChecksums.has(String(entry.plan_checksum || "")))
    .map((entry: any) => {
      const checksumValid = verifyProviderNativeCompactExecutionReceipt(entry).valid;
      const legacyAcceptedOnly = Number(entry.version || 0) < 2 && entry.status === "native_applied";
      return {
        ...entry,
        status: legacyAcceptedOnly ? "request_accepted" : entry.status,
        strong_proof: legacyAcceptedOnly ? false : entry.strong_proof === true,
        provider_outcome_verified: legacyAcceptedOnly ? false : entry.provider_outcome_verified === true,
        legacy_status: legacyAcceptedOnly ? "native_applied" : "",
        legacy_request_accepted_only: legacyAcceptedOnly,
        checksum_valid: checksumValid,
      };
    });
  const totals = entries.reduce((acc: any, entry: any) => {
    const status = entry.checksum_valid ? String(entry.status || "unverified") : "invalid";
    acc[status] = Number(acc[status] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { native_applied: 0, request_accepted: 0, no_edits_applied: 0, advisory_only: 0, not_supported: 0, request_failed: 0, unverified: 0, invalid: 0, total: 0 });
  const status = totals.invalid || totals.request_failed
    ? "fail"
    : totals.unverified || totals.request_accepted
      ? "warn"
      : totals.native_applied
        ? "ok"
        : totals.no_edits_applied || totals.advisory_only || totals.not_supported
          ? "advisory"
          : "empty";
  return {
    schema: "ccm-provider-native-compact-execution-receipt-summary-v1",
    version: PROVIDER_NATIVE_COMPACT_EXECUTION_RECEIPT_VERSION,
    groupId,
    groupSessionId,
    target_project: targetProject,
    ledger_file: ledger.file,
    status,
    entry_count: entries.length,
    totals,
    entries,
    native_applied_entries: entries.filter((entry: any) => entry.status === "native_applied" && entry.checksum_valid).slice(-12).reverse(),
    failed_entries: entries.filter((entry: any) => ["request_failed", "unverified"].includes(entry.status) || !entry.checksum_valid).slice(-12).reverse(),
    accepted_unverified_entries: entries.filter((entry: any) => entry.status === "request_accepted").slice(-12).reverse(),
    advisory_entries: entries.filter((entry: any) => ["no_edits_applied", "advisory_only", "not_supported"].includes(entry.status)).slice(-12).reverse(),
    recent_entries: entries.slice(-20).reverse(),
    updatedAt: ledger.updatedAt || "",
  };
}
