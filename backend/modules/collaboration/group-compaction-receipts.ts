import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { CCM_DIR } from "../../core/utils";
import { loadSkills, SKILL_PACKAGES_DIR } from "../../core/db";
import { isCcmInternalSkillName } from "../../skills/internal-skill-catalog";
import { buildContextBudget, compactPreserveEdges, estimateTextTokens, getAutoCompactThreshold, microCompactText } from "../../system/context-budget";
import { resolveTrustedModelContextCapacity } from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import { inspectGroupSessionMemoryTemplateState } from "./group-session-memory-customization";
import { recordGroupPromptCacheState, recordGroupPromptCacheUsage } from "./group-prompt-cache-break-detection";







export const GROUP_MEMORY_COMPACTION_VERSION = 3;






export const GROUP_COMPACT_TRIGGER_TOKENS = 167_000;






export const GROUP_COMPACT_MIN_KEEP_MESSAGES = 5;






export const GROUP_COMPACT_MIN_KEEP_TOKENS = 10_000;






export const GROUP_COMPACT_MAX_KEEP_TOKENS = 40_000;






export const GROUP_COMPACT_MAX_FAILURES = 3;






export const GROUP_COMPACT_MODEL_RETRY_MS = 15 * 60 * 1000;






export const GROUP_FACT_ANCHOR_LIMIT = 500;






export const GROUP_CONTEXT_WINDOW_DEFAULT = 200_000;






export const GROUP_CONTEXT_RESERVED_TOKENS = 20_000;






export const GROUP_AUTOCOMPACT_BUFFER_TOKENS = 13_000;






export const GROUP_WARNING_BUFFER_TOKENS = 20_000;






export const GROUP_ERROR_BUFFER_TOKENS = 20_000;






export const GROUP_MANUAL_COMPACT_BUFFER_TOKENS = 3_000;












export const GROUP_MICRO_COMPACT_VERSION = 1;






export const GROUP_MICRO_COMPACT_MAX_RECORDS = 80;






export const GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION = 1;






export const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION = 1;






export const GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS = 180_000;






export const GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS = 40_000;






export const GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA = "context-management-2025-06-27";






export const GROUP_TIME_BASED_MICRO_COMPACT_VERSION = 1;






export const GROUP_TIME_BASED_MC_CLEARED_MESSAGE = "[Old group Agent result content cleared]";






export const GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION = 1;






export const GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]";






export const GROUP_TIME_BASED_THINKING_PROJECTION_VERSION = 1;






export const GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE = "[Old thinking content cleared]";






export const GROUP_COMPACTION_SUMMARY_INPUT_PROJECTION_VERSION = 1;






export const GROUP_COMPACTION_SUMMARY_IMAGE_MARKER = "[image]";






export const GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER = "[document]";






export const GROUP_COMPACTION_SUMMARY_BINARY_MARKER = "[binary data removed]";






export const GROUP_POST_COMPACT_REINJECT_VERSION = 1;






export const GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION = 1;






export const GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION = 2;






export const GROUP_POST_COMPACT_FILE_BUDGET = 5;






export const GROUP_POST_COMPACT_SKILL_BUDGET = 5;






export const GROUP_POST_COMPACT_VERIFICATION_BUDGET = 8;






export const GROUP_POST_COMPACT_TASK_STATUS_PROJECTION_VERSION = 1;






export const GROUP_POST_COMPACT_TASK_STATUS_BUDGET = 12;






export const GROUP_POST_COMPACT_FILE_RESTORE_DEDUP_VERSION = 1;






export const GROUP_POST_COMPACT_INVOKED_SKILL_ATTACHMENT_VERSION = 1;






export const GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS = 5_000;






export const GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS = 25_000;






export const GROUP_POST_COMPACT_PLAN_ATTACHMENT_VERSION = 1;






export const GROUP_POST_COMPACT_PLAN_MAX_TOKENS = 50_000;






export const GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION = 1;






export const GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION = 1;






export const GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS = 20_000;






export const GROUP_FILE_UNCHANGED_STUB_PREFIX = "File unchanged since last read.";






export const GROUP_PARTIAL_COMPACT_VERSION = 1;






export const GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT = 12;






export const GROUP_PTL_EMERGENCY_VERSION = 1;






export const GROUP_PTL_RECOVERY_VERSION = 1;






export const GROUP_PRESERVED_SEGMENT_VERSION = 2;






export const GROUP_COMPACT_STRATEGY_DECISION_VERSION = 1;






export const GROUP_COMPACTION_HOOK_LEDGER_VERSION = 2;






export const GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION = 3;






export const GROUP_POST_COMPACT_MESSAGE_ORDER_VERSION = 1;






export const GROUP_COMPACT_LINEAGE_VERSION = 1;






export const GROUP_COMPACTION_MODEL_USAGE_VERSION = 1;






export const GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION = 2;






export const GROUP_SESSION_MEMORY_COMPACT_PROJECTION_VERSION = 1;






export const GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_SECTION_TOKENS = 2_000;






export const GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_TOTAL_TOKENS = 12_000;






export const GROUP_SESSION_MEMORY_API_INVARIANT_CLOSURE_VERSION = 1;






export const GROUP_POST_COMPACT_SESSION_STATE_RESET_VERSION = 1;






export const GROUP_TRUE_POST_COMPACT_PAYLOAD_VERSION = 1;






export const GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS = 20_000;






export const GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS = 13_000;






export const GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS = ["Bash", "Shell", "PowerShell", "Glob", "Grep", "Read", "FileRead", "WebFetch", "WebSearch"];






export const GROUP_API_MICROCOMPACT_CLEARABLE_USES = ["Edit", "FileEdit", "Write", "FileWrite", "NotebookEdit"];







export type ConversationSummary = {
  primaryRequest: string;
  userMessages: string[];
  keyConcepts: string[];
  filesAndCode: string[];
  errorsAndFixes: string[];
  decisions: string[];
  completedWork: string[];
  pendingTasks: string[];
  currentWork: string;
  nextStep: string;
  participantState: string[];
  taskStates: string[];
};







export type FactAnchor = {
  id: string;
  type: "user_requirement" | "dispatch_decision";
  messageId: string;
  text: string;
  timestamp: string;
  checksum: string;
};







export type GroupMemoryQualitySeverity = "fatal" | "high" | "medium" | "low";







export type GroupMemoryQualityCheck = {
  id: string;
  label: string;
  pass: boolean;
  severity: GroupMemoryQualitySeverity;
  score: number;
  detail: string;
  evidence?: string[];
  gaps?: string[];
};







export type GroupMemoryQualityReport = {
  schema: "ccm-group-memory-quality-v1";
  score: number;
  pass: boolean;
  status: "pass" | "degraded" | "failed";
  checks: GroupMemoryQualityCheck[];
  drift: { detected: boolean; reasons: string[] };
  downgrade_required: boolean;
  downgrade_reason: string;
  evaluated_at: string;
};







export function groupCompactTransactionReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







export function groupPostCompactCleanupAuditChecksum(audit: any) {
  const payload = { ...(audit || {}) };
  delete payload.audit_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







export function verifyGroupPostCompactCleanupAudit(audit: any, expected: any = {}) {
  const issues: string[] = [];
  const version = Number(audit?.version || 0);
  const legacy = audit?.schema === "ccm-post-compact-cleanup-audit-v1" && version === 1;
  const current = audit?.schema === "ccm-post-compact-cleanup-audit-v2" && version === GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION;
  if (!legacy && !current) issues.push("post_compact_cleanup_audit_schema_invalid");
  if (!String(audit?.groupId || "")) issues.push("post_compact_cleanup_group_missing");
  if (!String(audit?.boundaryId || "")) issues.push("post_compact_cleanup_boundary_missing");
  if (current) {
    if (!String(audit?.groupSessionId || "").startsWith("gcs_")) issues.push("post_compact_cleanup_exact_group_session_missing");
    if (String(audit?.scopeId || "") !== `${String(audit?.groupId || "")}::${String(audit?.groupSessionId || "")}`) issues.push("post_compact_cleanup_scope_invalid");
    if (String(audit?.compactSource?.kind || "") !== "group_main_agent") issues.push("post_compact_cleanup_source_invalid");
    if (audit?.compactSource?.mainThreadEquivalent !== true) issues.push("post_compact_cleanup_main_thread_equivalent_missing");
    if (String(audit?.compactSource?.querySource || "") !== `group_main:${String(audit?.scopeId || "")}`) issues.push("post_compact_cleanup_query_source_invalid");
    if (String(audit?.cleanupScope?.groupId || "") !== String(audit?.groupId || "")
      || String(audit?.cleanupScope?.groupSessionId || "") !== String(audit?.groupSessionId || "")
      || String(audit?.cleanupScope?.scopeId || "") !== String(audit?.scopeId || "")) issues.push("post_compact_cleanup_scope_binding_invalid");
    if (audit?.cleanupScope?.allowsGlobalReset !== false) issues.push("post_compact_cleanup_global_reset_not_forbidden");
    if (audit?.cleanupScope?.allowsOtherGroupSessionReset !== false) issues.push("post_compact_cleanup_cross_session_reset_not_forbidden");
    if (audit?.partialSidecarOnly === true && audit?.resetDerivedCompactState !== false) issues.push("post_compact_cleanup_partial_sidecar_reset_invalid");
    if (audit?.partialSidecarOnly !== true && audit?.resetDerivedCompactState !== true) issues.push("post_compact_cleanup_primary_reset_missing");
    if (String(audit?.audit_checksum || "") !== groupPostCompactCleanupAuditChecksum(audit)) issues.push("post_compact_cleanup_audit_checksum_invalid");
  }
  if (expected.groupId && String(audit?.groupId || "") !== String(expected.groupId)) issues.push("post_compact_cleanup_group_mismatch");
  if (expected.groupSessionId && String(audit?.groupSessionId || "") !== String(expected.groupSessionId)) issues.push("post_compact_cleanup_group_session_mismatch");
  if (expected.boundaryId && String(audit?.boundaryId || "") !== String(expected.boundaryId)) issues.push("post_compact_cleanup_boundary_mismatch");
  if (expected.auditChecksum && String(audit?.audit_checksum || "") !== String(expected.auditChecksum)) issues.push("post_compact_cleanup_checksum_mismatch");
  return { valid: issues.length === 0, issues, legacy, current };
}







export function buildGroupCompactEpoch(boundaryId: string) {
  const id = String(boundaryId || "").trim();
  return id ? `cmp_${crypto.createHash("sha256").update(id).digest("hex").slice(0, 16)}` : "precompact";
}







export function groupCompactLineageChecksum(lineage: any) {
  const payload = { ...(lineage || {}) };
  delete payload.lineage_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







export function groupCompactTurnId(groupId: string, groupSessionId: string, boundaryId: string) {
  const identity = `${String(groupId || "")}\0${String(groupSessionId || "")}\0${String(boundaryId || "")}`;
  return boundaryId ? `gct_${crypto.createHash("sha256").update(identity).digest("hex").slice(0, 24)}` : "";
}







export function buildGroupCompactLineage(input: any = {}) {
  const boundary = input.boundary || {};
  const previousBoundary = input.previousBoundary || input.previous_boundary || {};
  const groupId = String(input.groupId || input.group_id || "");
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
  const boundaryId = String(boundary.id || input.boundaryId || input.boundary_id || "");
  const previousBoundaryId = String(previousBoundary.id || input.previousBoundaryId || input.previous_boundary_id || "");
  const checkpointKnown = input.checkpointKnown === true || input.checkpoint_known === true;
  const turnsSincePreviousCompact = previousBoundaryId
    ? checkpointKnown ? Math.max(0, Number(input.turnsSincePreviousCompact || input.turns_since_previous_compact || 0)) : -1
    : -1;
  const newMessageCount = previousBoundaryId && checkpointKnown
    ? Math.max(0, Number(input.newMessageCountSincePreviousCompact || input.new_message_count_since_previous_compact || 0))
    : previousBoundaryId ? -1 : 0;
  const previousCompactTurnId = previousBoundaryId
    ? String(
      input.previousCompactTurnId
        || input.previous_compact_turn_id
        || previousBoundary.compactLineage?.compact_turn_id
        || previousBoundary.compactMetadata?.compactLineage?.compact_turn_id
        || groupCompactTurnId(groupId, groupSessionId, previousBoundaryId)
    )
    : "";
  const trigger = String(input.trigger || boundary.compactMetadata?.trigger || (boundary.type === "auto" ? "auto" : "manual"));
  const payload: any = {
    schema: "ccm-group-compact-lineage-v1",
    version: GROUP_COMPACT_LINEAGE_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    boundary_id: boundaryId,
    compact_epoch: buildGroupCompactEpoch(boundaryId),
    compact_turn_id: groupCompactTurnId(groupId, groupSessionId, boundaryId),
    trigger: trigger === "auto" ? "auto" : "manual",
    query_source: String(input.querySource || input.query_source || `group_main:${groupId}::${groupSessionId}`),
    previous_boundary_id: previousBoundaryId,
    previous_compact_epoch: previousBoundaryId ? buildGroupCompactEpoch(previousBoundaryId) : "",
    previous_compact_turn_id: previousCompactTurnId,
    checkpoint_basis: previousBoundaryId ? checkpointKnown ? "message_count_checkpoint" : "legacy_unknown" : "first_compact",
    turns_since_previous_compact: turnsSincePreviousCompact,
    new_message_count_since_previous_compact: newMessageCount,
    is_recompaction_in_chain: !!previousBoundaryId && checkpointKnown && turnsSincePreviousCompact === 0,
    messages_summarized: Number(input.messagesSummarized || input.messages_summarized || boundary.summarizedMessageCount || 0),
    pre_compact_tokens: Number(input.preCompactTokens || input.pre_compact_tokens || boundary.preCompactTokenCount || 0),
    true_post_compact_tokens: Number(input.truePostCompactTokens || input.true_post_compact_tokens || boundary.postCompactTokenCount || 0),
    auto_compact_threshold: Number(input.autoCompactThreshold || input.auto_compact_threshold || 0),
    will_retrigger_next_turn: input.willRetriggerNextTurn === true || input.will_retrigger_next_turn === true,
  };
  return { ...payload, lineage_checksum: groupCompactLineageChecksum(payload) };
}







export function verifyGroupCompactLineage(lineage: any, expected: any = {}) {
  const issues: string[] = [];
  if (lineage?.schema !== "ccm-group-compact-lineage-v1"
    || Number(lineage?.version || 0) !== GROUP_COMPACT_LINEAGE_VERSION) issues.push("compact_lineage_schema_invalid");
  if (!String(lineage?.group_id || "")) issues.push("compact_lineage_group_missing");
  if (!String(lineage?.group_session_id || "").startsWith("gcs_")) issues.push("compact_lineage_exact_session_missing");
  if (!String(lineage?.boundary_id || "")) issues.push("compact_lineage_boundary_missing");
  if (String(lineage?.compact_epoch || "") !== buildGroupCompactEpoch(String(lineage?.boundary_id || ""))) issues.push("compact_lineage_epoch_invalid");
  if (String(lineage?.compact_turn_id || "") !== groupCompactTurnId(String(lineage?.group_id || ""), String(lineage?.group_session_id || ""), String(lineage?.boundary_id || ""))) issues.push("compact_lineage_turn_id_invalid");
  if (!["manual", "auto"].includes(String(lineage?.trigger || ""))) issues.push("compact_lineage_trigger_invalid");
  if (String(lineage?.lineage_checksum || "") !== groupCompactLineageChecksum(lineage)) issues.push("compact_lineage_checksum_invalid");
  const previousBoundaryId = String(lineage?.previous_boundary_id || "");
  if (previousBoundaryId) {
    if (String(lineage?.previous_compact_epoch || "") !== buildGroupCompactEpoch(previousBoundaryId)) issues.push("compact_lineage_previous_epoch_invalid");
    if (!String(lineage?.previous_compact_turn_id || "")) issues.push("compact_lineage_previous_turn_missing");
    if (lineage?.checkpoint_basis === "message_count_checkpoint" && Number(lineage?.turns_since_previous_compact ?? -1) < 0) issues.push("compact_lineage_turn_count_invalid");
    if (lineage?.is_recompaction_in_chain === true && Number(lineage?.turns_since_previous_compact ?? -1) !== 0) issues.push("compact_lineage_recompaction_invalid");
  } else if (Number(lineage?.turns_since_previous_compact ?? -1) !== -1 || String(lineage?.previous_compact_turn_id || "")) {
    issues.push("compact_lineage_first_compact_invalid");
  }
  if (expected.groupId && String(lineage?.group_id || "") !== String(expected.groupId)) issues.push("compact_lineage_group_mismatch");
  if (expected.groupSessionId && String(lineage?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("compact_lineage_session_mismatch");
  if (expected.boundaryId && String(lineage?.boundary_id || "") !== String(expected.boundaryId)) issues.push("compact_lineage_boundary_mismatch");
  if (expected.previousBoundaryId !== undefined && previousBoundaryId !== String(expected.previousBoundaryId || "")) issues.push("compact_lineage_previous_boundary_mismatch");
  return { valid: issues.length === 0, issues };
}







export function groupCompactionModelUsageChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.usage_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







export function finiteUsageToken(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}







export function buildGroupCompactionModelUsageReceipt(input: any = {}) {
  const raw = input.usage && typeof input.usage === "object" ? input.usage : {};
  const provider = String(input.provider || "unknown").toLowerCase() === "anthropic" ? "anthropic" : "openai";
  const inputTokens = Math.max(
    finiteUsageToken(raw.input_tokens),
    finiteUsageToken(raw.inputTokens),
    finiteUsageToken(raw.prompt_tokens),
    finiteUsageToken(raw.promptTokens),
  );
  const outputTokens = Math.max(
    finiteUsageToken(raw.output_tokens),
    finiteUsageToken(raw.outputTokens),
    finiteUsageToken(raw.completion_tokens),
    finiteUsageToken(raw.completionTokens),
  );
  const cacheReadTokens = Math.max(
    finiteUsageToken(raw.cache_read_input_tokens),
    finiteUsageToken(raw.cacheReadInputTokens),
    finiteUsageToken(raw.prompt_tokens_details?.cached_tokens),
    finiteUsageToken(raw.promptTokensDetails?.cachedTokens),
  );
  const cacheCreationTokens = Math.max(
    finiteUsageToken(raw.cache_creation_input_tokens),
    finiteUsageToken(raw.cacheCreationInputTokens),
  );
  const rawTotalTokens = Math.max(finiteUsageToken(raw.total_tokens), finiteUsageToken(raw.totalTokens));
  const cacheReadIncludedInInput = provider === "openai"
    && cacheReadTokens > 0
    && !finiteUsageToken(raw.input_tokens)
    && !finiteUsageToken(raw.inputTokens);
  const calculatedTotalTokens = inputTokens + outputTokens + cacheCreationTokens + (cacheReadIncludedInInput ? 0 : cacheReadTokens);
  const accountedTotalTokens = rawTotalTokens || calculatedTotalTokens;
  const reported = inputTokens > 0 || outputTokens > 0 || cacheReadTokens > 0 || cacheCreationTokens > 0 || rawTotalTokens > 0;
  const estimatedInputTokens = Math.max(0, Number(input.requestAudit?.estimatedInputTokens || input.estimatedInputTokens || 0));
  const status = String(input.status || (reported ? "reported" : "unreported"));
  const payload: any = {
    schema: "ccm-group-compaction-model-usage-v1",
    version: GROUP_COMPACTION_MODEL_USAGE_VERSION,
    group_id: String(input.groupId || input.group_id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    provider,
    model: String(input.model || ""),
    status: ["reported", "unreported", "failed"].includes(status) ? status : reported ? "reported" : "unreported",
    reported,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_input_tokens: cacheReadTokens,
    cache_creation_input_tokens: cacheCreationTokens,
    cache_read_included_in_input: cacheReadIncludedInInput,
    provider_total_tokens: rawTotalTokens,
    accounted_total_tokens: accountedTotalTokens,
    estimated_input_tokens: estimatedInputTokens,
    input_estimate_delta: reported && inputTokens > 0 ? inputTokens - estimatedInputTokens : null,
    input_estimate_ratio: reported && inputTokens > 0 && estimatedInputTokens > 0
      ? Math.round((inputTokens / estimatedInputTokens) * 10_000) / 10_000
      : null,
    request_clipped: input.requestAudit?.clipped === true,
    response_id: String(input.responseId || input.response_id || ""),
    stop_reason: String(input.stopReason || input.stop_reason || ""),
    body_free: true,
  };
  return { ...payload, usage_checksum: groupCompactionModelUsageChecksum(payload) };
}







export function verifyGroupCompactionModelUsageReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-compaction-model-usage-v1"
    || Number(receipt?.version || 0) !== GROUP_COMPACTION_MODEL_USAGE_VERSION) issues.push("compaction_model_usage_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("compaction_model_usage_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("compaction_model_usage_exact_session_missing");
  if (!["reported", "unreported", "failed"].includes(String(receipt?.status || ""))) issues.push("compaction_model_usage_status_invalid");
  if (receipt?.body_free !== true) issues.push("compaction_model_usage_body_free_missing");
  if (Number(receipt?.accounted_total_tokens || 0) < Number(receipt?.input_tokens || 0) + Number(receipt?.output_tokens || 0)) issues.push("compaction_model_usage_total_invalid");
  if (String(receipt?.usage_checksum || "") !== groupCompactionModelUsageChecksum(receipt)) issues.push("compaction_model_usage_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("compaction_model_usage_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("compaction_model_usage_session_mismatch");
  if (expected.provider && String(receipt?.provider || "") !== String(expected.provider)) issues.push("compaction_model_usage_provider_mismatch");
  if (expected.model && String(receipt?.model || "") !== String(expected.model)) issues.push("compaction_model_usage_model_mismatch");
  return { valid: issues.length === 0, issues };
}







export function groupPostCompactMessageOrderReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







export function buildGroupPostCompactMessageOrderReceipt(input: any = {}) {
  const boundary = input.boundary || {};
  const reinjectionPlan = input.postCompactReinject
    || input.post_compact_reinject
    || boundary.post_compact_restore?.reinjectionPlan
    || {};
  const preservedSegment = input.preservedSegment || boundary.preservedSegment || boundary.post_compact_restore?.preservedSegment || {};
  const attachmentReceipts = [
    ["invoked_skills", reinjectionPlan.invokedSkillAttachmentReceipt || reinjectionPlan.invoked_skill_attachment_receipt],
    ["current_plan", reinjectionPlan.planAttachmentReceipt || reinjectionPlan.plan_attachment_receipt],
    ["dynamic_context", reinjectionPlan.dynamicContextDeltaReceipt || reinjectionPlan.dynamic_context_delta_receipt],
  ].map(([kind, receipt]: any[]) => ({
    kind,
    receipt_checksum: String(receipt?.receipt_checksum || ""),
    present: !!String(receipt?.receipt_checksum || ""),
  }));
  const postHookRows = (Array.isArray(input.postHookResults) ? input.postHookResults : []).map((row: any) => ({
    phase: String(row?.ledgerEntry?.phase || "post"),
    hook_index: Number(row?.ledgerEntry?.hook_index ?? -1),
    ok: row?.ok === true,
    boundary_id: String(row?.ledgerEntry?.boundary_id || boundary.id || ""),
    summary_checksum: String(row?.ledgerEntry?.summary_checksum || input.summaryChecksum || ""),
  }));
  const payload: any = {
    schema: "ccm-group-post-compact-message-order-receipt-v1",
    version: GROUP_POST_COMPACT_MESSAGE_ORDER_VERSION,
    group_id: String(input.groupId || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    boundary_id: String(boundary.id || ""),
    boundary_type: String(boundary.type || ""),
    compact_epoch: buildGroupCompactEpoch(String(boundary.id || "")),
    order: ["compact_boundary", "summary", "preserved_messages", "attachments", "post_compact_hooks"],
    summary_checksum: String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || ""),
    preserved_segment: {
      head_message_id: String(preservedSegment.headMessageId || preservedSegment.head_message_id || preservedSegment.firstPreservedMessageId || ""),
      anchor_message_id: String(preservedSegment.anchorMessageId || preservedSegment.anchor_message_id || preservedSegment.summaryMessageId || ""),
      tail_message_id: String(preservedSegment.tailMessageId || preservedSegment.tail_message_id || preservedSegment.lastPreservedMessageId || ""),
      checksum: Object.keys(preservedSegment).length
        ? crypto.createHash("sha256").update(JSON.stringify(preservedSegment)).digest("hex")
        : "",
    },
    attachment_receipts: attachmentReceipts,
    hook_run_id: String(input.hookRunId || ""),
    post_hook_result_count: postHookRows.length,
    post_hook_result_checksum: crypto.createHash("sha256").update(JSON.stringify(postHookRows)).digest("hex"),
  };
  return { ...payload, receipt_checksum: groupPostCompactMessageOrderReceiptChecksum(payload) };
}







export function verifyGroupPostCompactMessageOrderReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  const expectedOrder = ["compact_boundary", "summary", "preserved_messages", "attachments", "post_compact_hooks"];
  if (receipt?.schema !== "ccm-group-post-compact-message-order-receipt-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_MESSAGE_ORDER_VERSION) issues.push("post_compact_message_order_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("post_compact_message_order_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_message_order_exact_session_missing");
  if (!String(receipt?.boundary_id || "")) issues.push("post_compact_message_order_boundary_missing");
  if (JSON.stringify(receipt?.order || []) !== JSON.stringify(expectedOrder)) issues.push("post_compact_message_order_invalid");
  if (!String(receipt?.summary_checksum || "")) issues.push("post_compact_message_order_summary_missing");
  if (String(receipt?.compact_epoch || "") !== buildGroupCompactEpoch(String(receipt?.boundary_id || ""))) issues.push("post_compact_message_order_epoch_invalid");
  if (String(receipt?.receipt_checksum || "") !== groupPostCompactMessageOrderReceiptChecksum(receipt)) issues.push("post_compact_message_order_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("post_compact_message_order_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("post_compact_message_order_session_mismatch");
  if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId)) issues.push("post_compact_message_order_boundary_mismatch");
  if (expected.summaryChecksum && String(receipt?.summary_checksum || "") !== String(expected.summaryChecksum)) issues.push("post_compact_message_order_summary_mismatch");
  return { valid: issues.length === 0, issues };
}







export function groupPostCompactSessionStateResetChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}







/** Claude Code clears provider-active compact cursors and cache baselines after compact.
 * CCM keeps the raw-transcript boundary cursor durable and records the provider lifecycle separately. */
export function buildGroupPostCompactSessionStateResetReceipt(input: any = {}) {
  const boundary = input.boundary || {};
  const selection = input.sessionMemoryCompactSelection || input.session_memory_compact_selection || {};
  const previousReceipt = input.previousReceipt || input.previous_receipt || {};
  const providerReset = input.providerNativeCompactSessionCapacityReset
    || input.provider_native_compact_session_capacity_reset
    || {};
  const circuitBefore = input.circuitBreakerBefore || input.circuit_breaker_before || {};
  const circuitAfter = input.circuitBreakerAfter || input.circuit_breaker_after || {};
  const previousGeneration = Math.max(0, Number(
    previousReceipt?.cache_read_baseline?.generation
      || previousReceipt?.post_compact_mark?.generation
      || 0
  ));
  const generation = previousGeneration + 1;
  const durableCursor = String(
    input.durableBoundaryCursor
      || input.durable_boundary_cursor
      || boundary.summarizedThroughMessageId
      || ""
  );
  const compactTransactionReceiptChecksum = String(
    input.compactTransactionReceiptChecksum
      || input.compact_transaction_receipt_checksum
      || boundary.compactTransactionReceipt?.receipt_checksum
      || boundary.post_compact_restore?.compactTransactionReceipt?.receipt_checksum
      || ""
  );
  const warning = input.contextPressureWarning || input.context_pressure_warning || {};
  const compactPath = selection?.selected === true ? "session_memory_reuse" : "traditional";
  const payload: any = {
    schema: "ccm-group-post-compact-session-state-reset-v1",
    version: GROUP_POST_COMPACT_SESSION_STATE_RESET_VERSION,
    group_id: String(input.groupId || input.group_id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    scope_id: String(input.scopeId || input.scope_id || `${input.groupId || input.group_id || ""}--${input.groupSessionId || input.group_session_id || ""}`),
    boundary_id: String(boundary.id || input.boundaryId || input.boundary_id || ""),
    compact_epoch: buildGroupCompactEpoch(String(boundary.id || input.boundaryId || input.boundary_id || "")),
    summary_checksum: String(input.summaryChecksum || input.summary_checksum || boundary.post_compact_restore?.summaryChecksum || ""),
    compact_transaction_receipt_checksum: compactTransactionReceiptChecksum,
    compact_path: compactPath,
    durable_boundary_cursor: {
      status: "preserved",
      message_id: durableCursor,
    },
    provider_active_cursor: {
      status: "cleared",
      previous_message_id: String(selection.last_summarized_message_id || input.previousProviderCursor || input.previous_provider_cursor || ""),
      message_id: "",
    },
    session_memory_extraction_cursor: {
      status: "rebased_on_post_compact_snapshot",
      message_id: durableCursor,
      generation,
    },
    cache_read_baseline: {
      status: "reset",
      previous_generation: previousGeneration,
      generation,
    },
    compact_warning: {
      status: warning?.suppressed === true ? "suppressed" : "not_suppressed",
      suppressed: warning?.suppressed === true,
    },
    auto_compact_failure_state: {
      status: Number(circuitAfter.consecutive_failures || 0) === 0 ? "reset" : "not_reset",
      previous_consecutive_failures: Math.max(0, Number(circuitBefore.consecutive_failures || 0)),
      consecutive_failures: Math.max(0, Number(circuitAfter.consecutive_failures || 0)),
      ledger_checksum: String(circuitAfter.ledger_checksum || ""),
    },
    provider_capacity_reset: {
      status: String(providerReset.status || (providerReset.reset === true ? "reset" : "unknown")),
      reset: providerReset.reset === true || providerReset.idempotent === true,
      generation: Math.max(0, Number(providerReset.generation || 0)),
      reset_checksum: String(providerReset.reset_checksum || ""),
      compact_head_generation: Math.max(0, Number(providerReset.compact_head_generation || 0)),
    },
    post_compact_mark: {
      status: "marked",
      generation,
    },
    body_free: true,
    completed_at: String(input.completedAt || input.completed_at || new Date().toISOString()),
  };
  return { ...payload, receipt_checksum: groupPostCompactSessionStateResetChecksum(payload) };
}







export function verifyGroupPostCompactSessionStateResetReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-session-state-reset-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_SESSION_STATE_RESET_VERSION) issues.push("post_compact_session_state_reset_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("post_compact_session_state_reset_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_session_state_reset_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("post_compact_session_state_reset_scope_invalid");
  if (!String(receipt?.boundary_id || "")) issues.push("post_compact_session_state_reset_boundary_missing");
  if (String(receipt?.compact_epoch || "") !== buildGroupCompactEpoch(String(receipt?.boundary_id || ""))) issues.push("post_compact_session_state_reset_epoch_invalid");
  if (!String(receipt?.summary_checksum || "")) issues.push("post_compact_session_state_reset_summary_missing");
  if (!String(receipt?.compact_transaction_receipt_checksum || "")) issues.push("post_compact_session_state_reset_transaction_missing");
  if (!["session_memory_reuse", "traditional"].includes(String(receipt?.compact_path || ""))) issues.push("post_compact_session_state_reset_path_invalid");
  if (receipt?.durable_boundary_cursor?.status !== "preserved" || !String(receipt?.durable_boundary_cursor?.message_id || "")) issues.push("post_compact_session_state_reset_durable_cursor_invalid");
  if (receipt?.provider_active_cursor?.status !== "cleared" || String(receipt?.provider_active_cursor?.message_id || "")) issues.push("post_compact_session_state_reset_provider_cursor_not_cleared");
  if (receipt?.session_memory_extraction_cursor?.status !== "rebased_on_post_compact_snapshot"
    || String(receipt?.session_memory_extraction_cursor?.message_id || "") !== String(receipt?.durable_boundary_cursor?.message_id || "")) issues.push("post_compact_session_state_reset_extraction_cursor_invalid");
  const generation = Math.max(0, Number(receipt?.cache_read_baseline?.generation || 0));
  if (receipt?.cache_read_baseline?.status !== "reset"
    || generation !== Math.max(0, Number(receipt?.cache_read_baseline?.previous_generation || 0)) + 1) issues.push("post_compact_session_state_reset_cache_baseline_invalid");
  if (Number(receipt?.session_memory_extraction_cursor?.generation || 0) !== generation
    || receipt?.post_compact_mark?.status !== "marked"
    || Number(receipt?.post_compact_mark?.generation || 0) !== generation) issues.push("post_compact_session_state_reset_generation_invalid");
  if (receipt?.compact_warning?.suppressed !== true || receipt?.compact_warning?.status !== "suppressed") issues.push("post_compact_session_state_reset_warning_not_suppressed");
  if (receipt?.auto_compact_failure_state?.status !== "reset"
    || Number(receipt?.auto_compact_failure_state?.consecutive_failures || 0) !== 0) issues.push("post_compact_session_state_reset_failure_count_not_reset");
  if (receipt?.provider_capacity_reset?.reset !== true) issues.push("post_compact_session_state_reset_provider_capacity_not_reset");
  if (receipt?.body_free !== true) issues.push("post_compact_session_state_reset_body_free_missing");
  if (String(receipt?.receipt_checksum || "") !== groupPostCompactSessionStateResetChecksum(receipt)) issues.push("post_compact_session_state_reset_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("post_compact_session_state_reset_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("post_compact_session_state_reset_session_mismatch");
  if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId)) issues.push("post_compact_session_state_reset_boundary_mismatch");
  if (expected.summaryChecksum && String(receipt?.summary_checksum || "") !== String(expected.summaryChecksum)) issues.push("post_compact_session_state_reset_summary_mismatch");
  return { valid: issues.length === 0, issues };
}







export function verifyGroupCompactTransactionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  const receiptVersion = Number(receipt?.version || 0);
  const supportedSchema = (receipt?.schema === "ccm-group-memory-compact-transaction-receipt-v1" && receiptVersion === 1)
    || (receipt?.schema === "ccm-group-memory-compact-transaction-receipt-v2" && receiptVersion === 2)
    || (receipt?.schema === "ccm-group-memory-compact-transaction-receipt-v3" && receiptVersion === GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION);
  if (!supportedSchema) issues.push("compact_transaction_receipt_schema_invalid");
  const receiptIdentity = receiptVersion >= 2
    ? `${receipt?.group_id || ""}\0${receipt?.group_session_id || ""}\0${receipt?.boundary_id || ""}\0${receipt?.hook_run_id || ""}\0${receipt?.committed_at || ""}`
    : `${receipt?.group_id || ""}\0${receipt?.boundary_id || ""}\0${receipt?.hook_run_id || ""}\0${receipt?.committed_at || ""}`;
  const expectedReceiptId = `gctr_${crypto.createHash("sha256").update(receiptIdentity).digest("hex").slice(0, 24)}`;
  if (String(receipt?.receipt_id || "") !== expectedReceiptId) issues.push("compact_transaction_receipt_id_invalid");
  if (!String(receipt?.group_id || "")) issues.push("compact_transaction_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("compact_transaction_exact_group_session_missing");
  if (!String(receipt?.boundary_id || "")) issues.push("compact_transaction_boundary_missing");
  if (!String(receipt?.summary_checksum || "")) issues.push("compact_transaction_summary_missing");
  if (Number(receipt?.summarized_message_count || 0) < 1) issues.push("compact_transaction_range_empty");
  if (!String(receipt?.preserved_segment_checksum || "")) issues.push("compact_transaction_preserved_segment_missing");
  if (Number(receipt?.hook_failure_count || 0) > 0) issues.push("compact_transaction_hook_failure");
  if (receipt?.recovery_audit_passed !== true) issues.push("compact_transaction_recovery_audit_failed");
  if (receipt?.cleanup_audit_passed !== true) issues.push("compact_transaction_cleanup_audit_failed");
  if (receiptVersion >= 3 && !String(receipt?.cleanup_audit_checksum || "")) issues.push("compact_transaction_cleanup_audit_checksum_missing");
  if (!String(receipt?.transcript_path || "")) issues.push("compact_transaction_transcript_missing");
  if (String(receipt?.compact_epoch || "") !== buildGroupCompactEpoch(String(receipt?.boundary_id || ""))) issues.push("compact_transaction_epoch_invalid");
  if (String(receipt?.receipt_checksum || "") !== groupCompactTransactionReceiptChecksum(receipt)) issues.push("compact_transaction_receipt_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("compact_transaction_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("compact_transaction_group_session_mismatch");
  if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId)) issues.push("compact_transaction_boundary_mismatch");
  if (expected.compactEpoch && String(receipt?.compact_epoch || "") !== String(expected.compactEpoch)) issues.push("compact_transaction_epoch_mismatch");
  if (expected.summaryChecksum && String(receipt?.summary_checksum || "") !== String(expected.summaryChecksum)) issues.push("compact_transaction_summary_mismatch");
  if (expected.cleanupAuditChecksum && String(receipt?.cleanup_audit_checksum || "") !== String(expected.cleanupAuditChecksum)) issues.push("compact_transaction_cleanup_audit_mismatch");
  return { valid: issues.length === 0, issues };
}







export function buildGroupCompactTransactionReceipt(input: any = {}) {
  const boundary = input.boundary || {};
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
  const hookRows = [...(input.preHookResults || []), ...(input.postHookResults || [])].map((row: any) => ({
    phase: String(row?.ledgerEntry?.phase || ""),
    hook_index: Number(row?.ledgerEntry?.hook_index ?? -1),
    ok: row?.ok === true,
    boundary_id: String(row?.ledgerEntry?.boundary_id || ""),
    summary_checksum: String(row?.ledgerEntry?.summary_checksum || ""),
  }));
  const payload: any = {
    schema: "ccm-group-memory-compact-transaction-receipt-v3",
    version: GROUP_COMPACT_TRANSACTION_RECEIPT_VERSION,
    receipt_id: `gctr_${crypto.createHash("sha256").update(`${input.groupId || ""}\0${groupSessionId}\0${boundary.id || ""}\0${input.hookRunId || ""}\0${input.createdAt || boundary.createdAt || ""}`).digest("hex").slice(0, 24)}`,
    group_id: String(input.groupId || ""),
    group_session_id: groupSessionId,
    boundary_id: String(boundary.id || ""),
    boundary_type: String(boundary.type || ""),
    compact_epoch: buildGroupCompactEpoch(String(boundary.id || "")),
    summarized_from_message_id: String(boundary.summarizedFromMessageId || ""),
    summarized_through_message_id: String(boundary.summarizedThroughMessageId || ""),
    summarized_message_count: Number(boundary.summarizedMessageCount || 0),
    summary_checksum: String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || ""),
    pre_compact_token_count: Number(boundary.preCompactTokenCount || 0),
    post_compact_token_count: Number(boundary.postCompactTokenCount || 0),
    preserved_segment_checksum: boundary.preservedSegment
      ? crypto.createHash("sha256").update(JSON.stringify(boundary.preservedSegment)).digest("hex")
      : "",
    hook_run_id: String(input.hookRunId || ""),
    pre_hook_count: hookRows.filter(row => row.phase === "pre").length,
    post_hook_count: hookRows.filter(row => row.phase === "post").length,
    hook_failure_count: hookRows.filter(row => !row.ok).length,
    hook_evidence_checksum: crypto.createHash("sha256").update(JSON.stringify(hookRows)).digest("hex"),
    recovery_audit_passed: boundary.post_compact_restore?.recoveryAudit?.pass === true,
    cleanup_audit_passed: boundary.post_compact_restore?.cleanupAudit?.pass === true,
    cleanup_audit_checksum: String(boundary.post_compact_restore?.cleanupAudit?.audit_checksum || ""),
    transcript_path: String(input.transcriptPath || boundary.post_compact_restore?.transcriptPath || ""),
    committed_at: String(input.createdAt || boundary.createdAt || new Date().toISOString()),
  };
  return { ...payload, receipt_checksum: groupCompactTransactionReceiptChecksum(payload) };
}
