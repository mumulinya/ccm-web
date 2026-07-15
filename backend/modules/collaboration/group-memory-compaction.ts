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
export const GROUP_COMPACT_MAX_ACTIVE_MESSAGES = 120;
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
export const GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION = 1;
export const GROUP_SESSION_MEMORY_API_INVARIANT_CLOSURE_VERSION = 1;
export const GROUP_POST_COMPACT_SESSION_STATE_RESET_VERSION = 1;
export const GROUP_TRUE_POST_COMPACT_PAYLOAD_VERSION = 1;
export const GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS = 5_000;
export const GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS = 13_000;
const GROUP_COMPACTION_HOOK_LEDGER_DIR = path.join(CCM_DIR, "group-memory-compaction-hooks");
const GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS = ["Bash", "Shell", "PowerShell", "Glob", "Grep", "Read", "FileRead", "WebFetch", "WebSearch"];
const GROUP_API_MICROCOMPACT_CLEARABLE_USES = ["Edit", "FileEdit", "Write", "FileWrite", "NotebookEdit"];

type ConversationSummary = {
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

type FactAnchor = {
  id: string;
  type: "user_requirement" | "dispatch_decision";
  messageId: string;
  text: string;
  timestamp: string;
  checksum: string;
};

type GroupMemoryQualitySeverity = "fatal" | "high" | "medium" | "low";

type GroupMemoryQualityCheck = {
  id: string;
  label: string;
  pass: boolean;
  severity: GroupMemoryQualitySeverity;
  score: number;
  detail: string;
  evidence?: string[];
  gaps?: string[];
};

type GroupMemoryQualityReport = {
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

type GroupMemoryCompactionHookPhase = "pre" | "post";
type GroupMemoryCompactionHook = (input: any) => any | Promise<any>;
const groupMemoryCompactionHooks: Record<GroupMemoryCompactionHookPhase, Set<GroupMemoryCompactionHook>> = {
  pre: new Set(),
  post: new Set(),
};

function groupCompactTransactionReceiptChecksum(receipt: any) {
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

function groupCompactLineageChecksum(lineage: any) {
  const payload = { ...(lineage || {}) };
  delete payload.lineage_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function groupCompactTurnId(groupId: string, groupSessionId: string, boundaryId: string) {
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

function groupCompactionModelUsageChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.usage_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function finiteUsageToken(value: any) {
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

function groupPostCompactMessageOrderReceiptChecksum(receipt: any) {
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

function groupPostCompactSessionStateResetChecksum(receipt: any) {
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

function cleanHookLedgerGroupId(groupId: string) {
  return String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-");
}

function exactHookLedgerSessionId(groupSessionId: string) {
  const id = String(groupSessionId || "").trim();
  return id.startsWith("gcs_") ? id : "";
}

export function getGroupMemoryCompactionHookLedgerFile(groupId: string, groupSessionId: string) {
  const id = String(groupId || "").trim();
  const sessionId = exactHookLedgerSessionId(groupSessionId);
  if (!id || !sessionId) throw new Error("exact_group_session_required_for_compaction_hook_ledger");
  return path.join(
    GROUP_COMPACTION_HOOK_LEDGER_DIR,
    cleanHookLedgerGroupId(id),
    `${cleanHookLedgerGroupId(sessionId)}.json`,
  );
}

function emptyHookLedger(groupId = "", groupSessionId = "", file = "", scopeIssues: string[] = []) {
  const sessionId = exactHookLedgerSessionId(groupSessionId);
  return {
    schema: "ccm-group-memory-compaction-hook-ledger-v2",
    version: GROUP_COMPACTION_HOOK_LEDGER_VERSION,
    groupId: String(groupId || ""),
    groupSessionId: sessionId,
    scopeId: sessionId ? `${String(groupId || "")}::${sessionId}` : "",
    scopeValid: scopeIssues.length === 0 && !!String(groupId || "") && !!sessionId,
    scopeIssues,
    rejectedEntryCount: 0,
    entries: [] as any[],
    stats: {},
    updatedAt: "",
    file,
  };
}

function readHookLedgerFile(file: string, groupId = "", groupSessionId = "") {
  const sessionId = exactHookLedgerSessionId(groupSessionId);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      const issues: string[] = [];
      if (parsed.schema !== "ccm-group-memory-compaction-hook-ledger-v2"
        || Number(parsed.version || 0) !== GROUP_COMPACTION_HOOK_LEDGER_VERSION) issues.push("hook_ledger_schema_invalid");
      if (String(parsed.groupId || "") !== String(groupId || "")) issues.push("hook_ledger_group_mismatch");
      if (String(parsed.groupSessionId || "") !== sessionId) issues.push("hook_ledger_group_session_mismatch");
      if (String(parsed.scopeId || "") !== `${String(groupId || "")}::${sessionId}`) issues.push("hook_ledger_scope_mismatch");
      const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const entries = rawEntries.filter((entry: any) => String(entry?.group_id || "") === String(groupId || "")
        && String(entry?.group_session_id || "") === sessionId);
      if (entries.length !== rawEntries.length) issues.push("hook_ledger_mixed_session_entries");
      return {
        schema: "ccm-group-memory-compaction-hook-ledger-v2",
        version: GROUP_COMPACTION_HOOK_LEDGER_VERSION,
        groupId: String(groupId || ""),
        groupSessionId: sessionId,
        scopeId: `${String(groupId || "")}::${sessionId}`,
        scopeValid: issues.length === 0,
        scopeIssues: issues,
        rejectedEntryCount: rawEntries.length - entries.length,
        entries: issues.length ? [] : entries,
        stats: issues.length ? {} : buildHookLedgerStats(entries),
        updatedAt: String(parsed.updatedAt || ""),
        file,
      };
    }
  } catch {
    return emptyHookLedger(groupId, sessionId, file, ["hook_ledger_unreadable"]);
  }
  return emptyHookLedger(groupId, sessionId, file);
}

function writeHookLedgerFile(file: string, ledger: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(ledger, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function hookResultSummary(result: any) {
  if (!result || typeof result !== "object") return {};
  const persistentRequirements = Array.isArray(result.persistentRequirements || result.mustKeep)
    ? (result.persistentRequirements || result.mustKeep)
    : [];
  const factAnchors = Array.isArray(result.factAnchors || result.anchors)
    ? (result.factAnchors || result.anchors)
    : [];
  const keys = Object.keys(result).filter(Boolean).slice(0, 16);
  return {
    keys,
    persistentRequirementCount: persistentRequirements.length,
    factAnchorCount: factAnchors.length,
    hasCandidates: Array.isArray(result.candidates) ? result.candidates.length > 0 : result.hasCandidates === true,
    checked: result.checked === true,
    text: compactText(result.summary || result.note || result.message || "", 420),
  };
}

function normalizeHookLedgerEntry(raw: any = {}) {
  return {
    entry_id: String(raw.entry_id || raw.entryId || `hook_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`),
    hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
    group_id: String(raw.group_id || raw.groupId || ""),
    group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
    phase: String(raw.phase || ""),
    hook_index: Number(raw.hook_index ?? raw.hookIndex ?? 0),
    ok: raw.ok === true,
    status: raw.ok === true ? "ok" : "fail",
    duration_ms: Number(raw.duration_ms || raw.durationMs || 0),
    error: compactText(raw.error || "", 500),
    result_summary: raw.result_summary || raw.resultSummary || hookResultSummary(raw.result),
    at: String(raw.at || ""),
    boundary_id: String(raw.boundary_id || raw.boundaryId || ""),
    summarized_through_message_id: String(raw.summarized_through_message_id || raw.summarizedThroughMessageId || ""),
    summary_checksum: String(raw.summary_checksum || raw.summaryChecksum || ""),
  };
}

function buildHookLedgerStats(entries: any[] = []) {
  const stats: any = {
    total: entries.length,
    pre: { total: 0, ok: 0, failed: 0, durationMs: 0 },
    post: { total: 0, ok: 0, failed: 0, durationMs: 0 },
    ok: 0,
    failed: 0,
    avgDurationMs: 0,
    latestAt: "",
  };
  for (const entry of entries) {
    const phase = entry.phase === "post" ? "post" : "pre";
    stats[phase].total++;
    stats[phase].durationMs += Number(entry.duration_ms || 0);
    if (entry.ok) {
      stats.ok++;
      stats[phase].ok++;
    } else {
      stats.failed++;
      stats[phase].failed++;
    }
    if (entry.at && (!stats.latestAt || String(entry.at) > stats.latestAt)) stats.latestAt = String(entry.at);
  }
  stats.avgDurationMs = entries.length ? Math.round(entries.reduce((sum, item) => sum + Number(item.duration_ms || 0), 0) / entries.length) : 0;
  for (const phase of ["pre", "post"]) {
    stats[phase].avgDurationMs = stats[phase].total ? Math.round(stats[phase].durationMs / stats[phase].total) : 0;
  }
  return stats;
}

function appendGroupMemoryCompactionHookLedgerEntries(groupId: string, groupSessionId: string, entries: any[] = []) {
  const sessionId = exactHookLedgerSessionId(groupSessionId);
  if (!sessionId) throw new Error("exact_group_session_required_for_compaction_hook_ledger");
  const normalized = entries.map(normalizeHookLedgerEntry).filter(entry => entry.group_id || groupId);
  if (!normalized.length) return readGroupMemoryCompactionHookLedger(groupId, sessionId);
  if (normalized.some(entry => entry.group_session_id && entry.group_session_id !== sessionId)) {
    throw new Error("compaction_hook_ledger_cross_session_entry_rejected");
  }
  const file = getGroupMemoryCompactionHookLedgerFile(groupId, sessionId);
  const ledger = readHookLedgerFile(file, groupId, sessionId);
  if (ledger.scopeValid === false && fs.existsSync(file)) throw new Error(`compaction_hook_ledger_scope_invalid:${ledger.scopeIssues.join(",")}`);
  const allEntries = [...(ledger.entries || []), ...normalized.map(entry => ({
    ...entry,
    group_id: entry.group_id || groupId,
    group_session_id: sessionId,
  }))].slice(-500);
  const next = {
    schema: "ccm-group-memory-compaction-hook-ledger-v2",
    version: GROUP_COMPACTION_HOOK_LEDGER_VERSION,
    groupId,
    groupSessionId: sessionId,
    scopeId: `${groupId}::${sessionId}`,
    scopeValid: true,
    scopeIssues: [] as string[],
    rejectedEntryCount: 0,
    entries: allEntries,
    stats: buildHookLedgerStats(allEntries),
    updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
  };
  writeHookLedgerFile(file, next);
  return { ...next, file };
}

export function readGroupMemoryCompactionHookLedger(groupId: string, groupSessionId: string) {
  const id = String(groupId || "").trim();
  const sessionId = exactHookLedgerSessionId(groupSessionId);
  if (!id || !sessionId) return emptyHookLedger(id, sessionId, "", ["exact_group_session_required"]);
  const file = getGroupMemoryCompactionHookLedgerFile(id, sessionId);
  const ledger = readHookLedgerFile(file, id, sessionId);
  return {
    ...ledger,
    file,
    stats: buildHookLedgerStats(Array.isArray(ledger.entries) ? ledger.entries : []),
  };
}

export function registerGroupMemoryCompactionHook(phase: GroupMemoryCompactionHookPhase, hook: GroupMemoryCompactionHook) {
  if (phase !== "pre" && phase !== "post") throw new Error(`Unsupported group memory compaction hook phase: ${phase}`);
  groupMemoryCompactionHooks[phase].add(hook);
  return () => groupMemoryCompactionHooks[phase].delete(hook);
}

async function runGroupMemoryCompactionHooks(phase: GroupMemoryCompactionHookPhase, input: any) {
  const results: any[] = [];
  const hooks = [...groupMemoryCompactionHooks[phase]];
  const hookRunId = String(input.hookRunId || input.hook_run_id || `gmch_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`);
  const ledgerEntries: any[] = [];
  if (!hooks.length) {
    const entry = normalizeHookLedgerEntry({
      hook_run_id: hookRunId,
      group_id: input.groupId,
      group_session_id: input.groupSessionId,
      phase,
      hook_index: -1,
      ok: true,
      duration_ms: 0,
      result_summary: { noHooksRegistered: true },
      at: new Date().toISOString(),
      boundary_id: input.boundary?.id || "",
      summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
      summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
    });
    if (input.groupId) appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), String(input.groupSessionId || ""), [entry]);
    return [{ ok: true, result: { noHooksRegistered: true }, hookRunId, ledgerEntry: entry }];
  }
  for (let index = 0; index < hooks.length; index += 1) {
    const hook = hooks[index];
    const started = Date.now();
    const at = new Date(started).toISOString();
    try {
      const result = await hook({ ...input, phase });
      const entry = normalizeHookLedgerEntry({
        hook_run_id: hookRunId,
        group_id: input.groupId,
        group_session_id: input.groupSessionId,
        phase,
        hook_index: index,
        ok: true,
        duration_ms: Date.now() - started,
        result_summary: hookResultSummary(result),
        at,
        boundary_id: input.boundary?.id || "",
        summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
        summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
      });
      ledgerEntries.push(entry);
      if (result) results.push({ ok: true, result, hookRunId, ledgerEntry: entry });
    } catch (error: any) {
      const entry = normalizeHookLedgerEntry({
        hook_run_id: hookRunId,
        group_id: input.groupId,
        group_session_id: input.groupSessionId,
        phase,
        hook_index: index,
        ok: false,
        duration_ms: Date.now() - started,
        error: compactText(error?.message || error, 400),
        at,
        boundary_id: input.boundary?.id || "",
        summarized_through_message_id: input.boundary?.summarizedThroughMessageId || "",
        summary_checksum: input.boundary?.summaryChecksum || input.summaryChecksum || "",
      });
      ledgerEntries.push(entry);
      results.push({ ok: false, error: entry.error, hookRunId, ledgerEntry: entry });
    }
  }
  if (ledgerEntries.length && input.groupId) appendGroupMemoryCompactionHookLedgerEntries(String(input.groupId), String(input.groupSessionId || ""), ledgerEntries);
  return results;
}

function compactText(value: any, max = 800) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const head = Math.max(1, Math.floor(max * 0.68));
  const tail = Math.max(1, max - head - 20);
  return `${text.slice(0, head)} …[已压缩]… ${text.slice(-tail)}`;
}

function renderMessageContentValue(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(renderMessageContentValue).filter(Boolean).join("\n");
  if (typeof value !== "object") return String(value);
  const type = String(value.type || "");
  if (type === "text") return String(value.text || "");
  if (type === "thinking" || type === "redacted_thinking") return String(value.thinking || value.data || "");
  if (type === "tool_use" || type === "server_tool_use") {
    const id = String(value.id || value.tool_use_id || value.toolUseId || "");
    const name = String(value.name || value.tool || value.tool_name || "tool");
    const input = value.input == null ? "" : ` ${JSON.stringify(value.input)}`;
    return `[tool_use ${name}${id ? ` #${id}` : ""}]${input}`;
  }
  if (type === "tool_result" || type === "web_search_tool_result") {
    const id = String(value.tool_use_id || value.toolUseId || value.id || "");
    return `[tool_result${id ? ` #${id}` : ""}] ${renderMessageContentValue(value.content ?? value.output ?? value.result ?? value.text)}`;
  }
  try { return JSON.stringify(value); } catch { return String(value); }
}

function messageContent(message: any) {
  return renderMessageContentValue(message?.content ?? message?.message?.content ?? message?.delivery_summary?.headline ?? message?.result ?? "").trim();
}

function compactionSummaryInputProjectionChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyGroupCompactionSummaryInputProjectionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-compaction-summary-input-projection-v1" || Number(receipt?.version || 0) !== GROUP_COMPACTION_SUMMARY_INPUT_PROJECTION_VERSION) issues.push("compaction_summary_input_schema_invalid");
  if (receipt?.summarizer_only !== true) issues.push("compaction_summary_input_scope_invalid");
  if (receipt?.raw_transcript_preserved !== true) issues.push("compaction_summary_input_raw_preservation_missing");
  if (Number(receipt?.source_message_count || 0) < Number(receipt?.projected_message_count || 0)) issues.push("compaction_summary_input_message_count_invalid");
  if (Number(receipt?.estimated_tokens_before || 0) < Number(receipt?.estimated_tokens_after || 0)) issues.push("compaction_summary_input_token_estimate_invalid");
  if (Number(receipt?.estimated_tokens_saved || 0) !== Math.max(0, Number(receipt?.estimated_tokens_before || 0) - Number(receipt?.estimated_tokens_after || 0))) issues.push("compaction_summary_input_saved_tokens_invalid");
  if (String(receipt?.receipt_checksum || "") !== compactionSummaryInputProjectionChecksum(receipt)) issues.push("compaction_summary_input_checksum_invalid");
  if (expected.sourceMessageCount !== undefined && Number(receipt?.source_message_count || 0) !== Number(expected.sourceMessageCount)) issues.push("compaction_summary_input_source_count_mismatch");
  return { valid: issues.length === 0, issues };
}

type CompactionSummaryInputProjectionState = {
  imageBlocksStripped: number;
  documentBlocksStripped: number;
  binarySegmentsStripped: number;
};

const GROUP_COMPACTION_IMAGE_BLOCK_TYPES = new Set(["image", "image_url", "input_image"]);
const GROUP_COMPACTION_DOCUMENT_BLOCK_TYPES = new Set(["document", "input_file"]);
const GROUP_COMPACTION_REINJECTED_ATTACHMENT_TYPES = new Set(["skill_discovery", "skill_listing"]);
const GROUP_COMPACTION_BINARY_VALUE_KEYS = new Set(["data", "base64", "image_data", "file_data", "bytes"]);

function sanitizeCompactionSummaryString(value: string, state: CompactionSummaryInputProjectionState, key = "") {
  let output = String(value || "");
  output = output.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]{64,}/gi, () => {
    state.binarySegmentsStripped += 1;
    return GROUP_COMPACTION_SUMMARY_IMAGE_MARKER;
  });
  output = output.replace(/data:(?:application\/pdf|application\/[a-z0-9.+-]+);base64,[a-z0-9+/=]{64,}/gi, () => {
    state.binarySegmentsStripped += 1;
    return GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER;
  });
  output = output.replace(/[a-z0-9+/]{256,}={0,2}/gi, () => {
    state.binarySegmentsStripped += 1;
    return GROUP_COMPACTION_SUMMARY_BINARY_MARKER;
  });
  if (GROUP_COMPACTION_BINARY_VALUE_KEYS.has(String(key || "").toLowerCase())
    && output.length >= 256
    && /^[a-z0-9+/=\s]+$/i.test(output)) {
    state.binarySegmentsStripped += 1;
    return GROUP_COMPACTION_SUMMARY_BINARY_MARKER;
  }
  return output;
}

function sanitizeCompactionSummaryValue(value: any, state: CompactionSummaryInputProjectionState, key = ""): any {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeCompactionSummaryString(value, state, key);
  if (Array.isArray(value)) return value.map(item => sanitizeCompactionSummaryValue(item, state));
  if (typeof value !== "object") return value;
  const type = String(value.type || "").toLowerCase();
  if (GROUP_COMPACTION_IMAGE_BLOCK_TYPES.has(type)) {
    state.imageBlocksStripped += 1;
    return { type: "text", text: GROUP_COMPACTION_SUMMARY_IMAGE_MARKER };
  }
  if (GROUP_COMPACTION_DOCUMENT_BLOCK_TYPES.has(type)) {
    state.documentBlocksStripped += 1;
    return { type: "text", text: GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER };
  }
  const next: any = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    next[entryKey] = sanitizeCompactionSummaryValue(entryValue, state, entryKey);
  }
  return next;
}

function isReinjectedCompactionAttachment(message: any) {
  if (String(message?.type || "").toLowerCase() !== "attachment") return false;
  const attachmentType = String(message?.attachment?.type || message?.attachment_type || message?.attachmentType || "").toLowerCase();
  return GROUP_COMPACTION_REINJECTED_ATTACHMENT_TYPES.has(attachmentType);
}

export function buildGroupCompactionSummaryInputProjection(messages: any[] = [], options: any = {}) {
  const state: CompactionSummaryInputProjectionState = {
    imageBlocksStripped: 0,
    documentBlocksStripped: 0,
    binarySegmentsStripped: 0,
  };
  const sourceMessages = Array.isArray(messages) ? messages : [];
  const stripReinjectedAttachments = options.stripReinjectedAttachments !== false && options.strip_reinjected_attachments !== false;
  let reinjectedAttachmentsStripped = 0;
  const projectedMessages = sourceMessages.flatMap((message: any) => {
    if (stripReinjectedAttachments && isReinjectedCompactionAttachment(message)) {
      reinjectedAttachmentsStripped += 1;
      return [];
    }
    return [sanitizeCompactionSummaryValue(message, state)];
  });
  const previousSummary = sanitizeCompactionSummaryValue(options.previousSummary || options.previous_summary || {}, state);
  const sanitizedFallbackSummary = sanitizeCompactionSummaryValue(options.fallbackSummary || options.fallback_summary || {}, state);
  const fallbackSummary = options.rebuildFallbackFromProjectedMessages === true || options.rebuild_fallback_from_projected_messages === true
    ? buildDeterministicConversationSummary(projectedMessages, options.memory || {}, previousSummary)
    : sanitizedFallbackSummary;
  const beforePayload = {
    messages: sourceMessages,
    previousSummary: options.previousSummary || options.previous_summary || {},
    fallbackSummary: options.fallbackSummary || options.fallback_summary || {},
  };
  const afterPayload = { messages: projectedMessages, previousSummary, fallbackSummary };
  const estimatedTokensBefore = estimateGroupTextTokens(JSON.stringify(beforePayload));
  const estimatedTokensAfter = estimateGroupTextTokens(JSON.stringify(afterPayload));
  const payload: any = {
    schema: "ccm-group-compaction-summary-input-projection-v1",
    version: GROUP_COMPACTION_SUMMARY_INPUT_PROJECTION_VERSION,
    summarizer_only: true,
    source_message_count: sourceMessages.length,
    projected_message_count: projectedMessages.length,
    image_blocks_stripped: state.imageBlocksStripped,
    document_blocks_stripped: state.documentBlocksStripped,
    binary_segments_stripped: state.binarySegmentsStripped,
    reinjected_attachments_stripped: reinjectedAttachmentsStripped,
    estimated_tokens_before: estimatedTokensBefore,
    estimated_tokens_after: estimatedTokensAfter,
    estimated_tokens_saved: Math.max(0, estimatedTokensBefore - estimatedTokensAfter),
    raw_transcript_preserved: true,
    image_marker: GROUP_COMPACTION_SUMMARY_IMAGE_MARKER,
    document_marker: GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER,
    binary_marker: GROUP_COMPACTION_SUMMARY_BINARY_MARKER,
  };
  const receipt = { ...payload, receipt_checksum: compactionSummaryInputProjectionChecksum(payload) };
  return { messages: projectedMessages, previousSummary, fallbackSummary, receipt };
}

function messageIdentity(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

function messageActor(message: any) {
  return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}

function mergeUnique(existing: any[] = [], incoming: any[] = [], limit = 24, max = 700) {
  const result = new Map<string, string>();
  for (const raw of [...existing, ...incoming]) {
    const value = compactText(raw, max);
    const key = value.toLowerCase();
    if (!value) continue;
    if (result.has(key)) result.delete(key);
    result.set(key, value);
  }
  return [...result.values()].slice(-limit);
}

function mergeTaskStates(existing: any[] = [], incoming: any[] = [], limit = 30) {
  const keyed = new Map<string, string>();
  const unkeyed: string[] = [];
  for (const raw of [...existing, ...incoming]) {
    const value = compactText(raw, 700);
    if (!value) continue;
    const match = value.match(/^\[([^\]]+)\]/);
    if (match) keyed.set(match[1], value);
    else unkeyed.push(value);
  }
  return [...unkeyed, ...keyed.values()].slice(-limit);
}

function stringArray(value: any, limit = 30) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw.map((item: any) => typeof item === "string" ? item : item?.path || item?.file || item?.name || JSON.stringify(item))
    .map((item: any) => compactText(item, 300))
    .filter(Boolean)
    .slice(0, limit);
}

function uniqueStrings(values: any[] = [], limit = 20) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = compactText(raw, 500);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function normalizedSearchTokens(value: any) {
  const text = String(value || "").toLowerCase();
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g)) tokens.add(match[0]);
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) tokens.add(chinese.slice(index, index + 2));
  return tokens;
}

function isGroundedInSource(value: any, source: string) {
  const item = compactText(value, 1200).toLowerCase();
  const corpus = String(source || "").toLowerCase();
  if (!item) return false;
  if (corpus.includes(item)) return true;
  const tokens = [...normalizedSearchTokens(item)];
  if (!tokens.length) return false;
  let matches = 0;
  for (const token of tokens) if (corpus.includes(token) && ++matches >= Math.min(3, Math.max(1, Math.ceil(tokens.length * 0.25)))) return true;
  return false;
}

function mergeSafeConversationSummary(previous: ConversationSummary, fallback: ConversationSummary, model: ConversationSummary | null, messages: any[]) {
  const source = messages.map(message => [messageContent(message), JSON.stringify(message?.assignments || []), JSON.stringify(message?.delivery_summary || {})].join("\n")).join("\n");
  const grounded = (items: any[] = []) => items.filter(item => isGroundedInSource(item, source));
  const safeModel = model || createEmptyConversationSummary();
  return {
    primaryRequest: fallback.primaryRequest || safeModel.primaryRequest || previous.primaryRequest,
    userMessages: mergeUnique(previous.userMessages, fallback.userMessages, 40, 900),
    keyConcepts: mergeUnique(previous.keyConcepts, [...grounded(safeModel.keyConcepts), ...fallback.keyConcepts], 24, 400),
    filesAndCode: mergeUnique(previous.filesAndCode, [...grounded(safeModel.filesAndCode), ...fallback.filesAndCode], 40, 500),
    errorsAndFixes: mergeUnique(previous.errorsAndFixes, [...grounded(safeModel.errorsAndFixes), ...fallback.errorsAndFixes], 30, 700),
    decisions: mergeUnique(previous.decisions, [...grounded(safeModel.decisions), ...fallback.decisions], 30, 700),
    completedWork: mergeUnique(previous.completedWork, [...grounded(safeModel.completedWork), ...fallback.completedWork], 30, 700),
    pendingTasks: mergeUnique(previous.pendingTasks, [...grounded(safeModel.pendingTasks), ...fallback.pendingTasks], 30, 700),
    currentWork: fallback.currentWork || safeModel.currentWork || previous.currentWork,
    nextStep: fallback.nextStep || safeModel.nextStep || previous.nextStep,
    participantState: mergeUnique(previous.participantState, [...grounded(safeModel.participantState), ...fallback.participantState], 20, 400),
    taskStates: mergeTaskStates(previous.taskStates, fallback.taskStates, 30),
  } as ConversationSummary;
}

function validateSummaryPreservesFallback(summary: ConversationSummary, fallback: ConversationSummary) {
  const missing: string[] = [];
  const arrayKeys: Array<keyof ConversationSummary> = [
    "userMessages", "filesAndCode", "errorsAndFixes", "decisions", "completedWork", "pendingTasks", "taskStates",
  ];
  for (const key of arrayKeys) {
    const actual = new Set((summary[key] as string[] || []).map(item => String(item)));
    for (const item of (fallback[key] as string[] || [])) if (!actual.has(String(item))) missing.push(`${String(key)}:${compactText(item, 120)}`);
  }
  if (fallback.primaryRequest && summary.primaryRequest !== fallback.primaryRequest) missing.push("primaryRequest");
  if (fallback.currentWork && summary.currentWork !== fallback.currentWork) missing.push("currentWork");
  if (fallback.nextStep && summary.nextStep !== fallback.nextStep) missing.push("nextStep");
  return { pass: missing.length === 0, missing: missing.slice(0, 30) };
}

function buildGroupMemoryQualitySource(messages: any[], memory: any = {}) {
  return [
    JSON.stringify(memory?.conversationSummary || {}),
    JSON.stringify((memory?.completed || []).slice(-40)),
    JSON.stringify((memory?.blocked || []).slice(-40)),
    JSON.stringify((memory?.workerLedger || []).slice(-80)),
    ...(messages || []).map((message: any) => [
      messageContent(message),
      JSON.stringify(message?.assignments || []),
      JSON.stringify(message?.receipt || {}),
      JSON.stringify(message?.delivery_summary || {}),
    ].join("\n")),
  ].join("\n");
}

function extractRequirementNeedles(text: any) {
  const raw = String(text || "");
  const needles = new Set<string>();
  for (const match of raw.matchAll(/[A-Z][A-Z0-9_:-]{5,}/g)) needles.add(match[0].toLowerCase());
  for (const match of raw.matchAll(/[A-Za-z0-9_.\/\\:-]{6,}/g)) {
    const token = match[0].toLowerCase();
    if (/^(must|never|always|required|should|please|cannot|without|memory|context)$/i.test(token)) continue;
    needles.add(token);
  }
  for (const match of raw.matchAll(/(?:必须|不得|不能|禁止|务必|只能|始终|不要|验收|约束)[^，。；\n]{2,60}/g)) {
    needles.add(match[0].toLowerCase());
  }
  return [...needles].slice(0, 24);
}

function isRequirementRepresented(requirement: any, artifactText: string) {
  const raw = compactText(requirement, 1200).toLowerCase();
  const artifact = String(artifactText || "").toLowerCase();
  if (!raw) return true;
  if (artifact.includes(raw)) return true;
  const prefix = raw.slice(0, Math.min(180, raw.length));
  if (prefix.length >= 24 && artifact.includes(prefix)) return true;
  const needles = extractRequirementNeedles(raw);
  if (!needles.length) return prefix.length >= 12 && artifact.includes(prefix.slice(0, 80));
  const hardNeedles = needles.filter(item => /[a-z0-9_:-]*[0-9_:-][a-z0-9_:-]*/i.test(item) && item.length >= 6);
  const required = hardNeedles.length ? hardNeedles : needles;
  let matched = 0;
  for (const needle of required) if (artifact.includes(needle) && ++matched >= Math.min(required.length, Math.max(1, Math.ceil(required.length * 0.66)))) return true;
  return false;
}

function extractBlockedTaskSignals(messages: any[]) {
  const signals: Array<{ taskId: string; text: string }> = [];
  for (let index = 0; index < (messages || []).length; index += 1) {
    const message = messages[index];
    const content = messageContent(message);
    const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
    const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
    const corpus = `${status}\n${content}`;
    if (taskId && /(失败|阻塞|未完成|超时|异常|需要|error|failed|blocked|timeout|needs_info|need info)/i.test(corpus)) {
      signals.push({ taskId, text: compactText(content || status, 220) });
    }
  }
  return signals.slice(-20);
}

function addQualityCheck(checks: GroupMemoryQualityCheck[], check: Omit<GroupMemoryQualityCheck, "score">) {
  checks.push({ ...check, score: check.pass ? 100 : 0 });
}

function qualityPenalty(severity: GroupMemoryQualitySeverity) {
  if (severity === "fatal") return 45;
  if (severity === "high") return 30;
  if (severity === "medium") return 16;
  return 8;
}

export function evaluateGroupMemorySummaryQuality(
  summary: ConversationSummary,
  fallback: ConversationSummary,
  messages: any[],
  memory: any = {},
  options: any = {}
): GroupMemoryQualityReport {
  const normalizedSummary = normalizeSummary(summary, createEmptyConversationSummary());
  const normalizedFallback = normalizeSummary(fallback, createEmptyConversationSummary());
  const checks: GroupMemoryQualityCheck[] = [];
  const fallbackValidation = validateSummaryPreservesFallback(normalizedSummary, normalizedFallback);
  addQualityCheck(checks, {
    id: "fallback_preserved",
    label: "结构化保底事实保留",
    pass: fallbackValidation.pass,
    severity: "fatal",
    detail: fallbackValidation.pass ? "摘要保留了确定性保底摘要中的关键字段。" : "摘要丢失了确定性保底摘要中的字段。",
    gaps: fallbackValidation.missing,
  });

  const persistedRequirements = Array.isArray(options.persistentRequirements)
    ? options.persistentRequirements
    : Array.isArray(memory?.persistentRequirements)
      ? memory.persistentRequirements
      : [];
  const incomingRequirements = extractPersistentRequirements(messages || []);
  const requirementMap = new Map<string, any>();
  for (const item of [...persistedRequirements, ...incomingRequirements]) {
    const text = compactText(item?.text || item, 1200);
    if (text) requirementMap.set(text.toLowerCase(), { ...item, text });
  }
  const artifactText = [
    JSON.stringify(normalizedSummary),
    renderConversationSummary(normalizedSummary, 20_000),
    ...(Array.isArray(options.factAnchors) ? options.factAnchors : []).map((item: any) => item?.text || item),
    ...persistedRequirements.map((item: any) => item?.text || item),
    ...incomingRequirements.map((item: any) => item?.text || item),
  ].join("\n");
  const requirementGaps = [...requirementMap.values()]
    .filter((item: any) => !isRequirementRepresented(item.text || item, artifactText))
    .map((item: any) => `#${item.messageId || item.id || "memory"} ${compactText(item.text || item, 160)}`)
    .slice(0, 20);
  addQualityCheck(checks, {
    id: "persistent_requirements_preserved",
    label: "持久用户约束可进入上下文",
    pass: requirementGaps.length === 0,
    severity: "fatal",
    detail: requirementGaps.length === 0 ? "硬约束可从摘要或持久事实锚点恢复。" : "存在硬约束无法从摘要或持久事实锚点恢复。",
    gaps: requirementGaps,
  });

  const sourceText = buildGroupMemoryQualitySource(messages || [], memory);
  const summaryConcernText = [
    normalizedSummary.errorsAndFixes.join("\n"),
    normalizedSummary.pendingTasks.join("\n"),
    normalizedSummary.taskStates.join("\n"),
    normalizedSummary.currentWork,
    normalizedSummary.nextStep,
  ].join("\n").toLowerCase();
  const blockedSignals = extractBlockedTaskSignals(messages || []);
  const blockedGaps = blockedSignals
    .filter(signal => !summaryConcernText.includes(signal.taskId.toLowerCase()))
    .map(signal => `[${signal.taskId}] ${signal.text}`)
    .slice(0, 12);
  addQualityCheck(checks, {
    id: "blocked_not_marked_completed",
    label: "阻塞任务没有被改写成完成",
    pass: blockedGaps.length === 0,
    severity: "high",
    detail: blockedGaps.length === 0 ? "带 task id 的失败/阻塞信号仍在摘要问题域中可见。" : "部分失败/阻塞任务在摘要问题域中不可见，可能被完成态覆盖。",
    gaps: blockedGaps,
  });

  const completionText = normalizedSummary.completedWork.join("\n");
  const sweepingCompletionClaims = normalizedSummary.completedWork
    .filter(item => /(全部完成|全部处理|已上线|上线生产|完全完成|all done|completed all|fully complete|released to production)/i.test(String(item || "")))
    .filter(item => !isGroundedInSource(item, sourceText))
    .map(item => compactText(item, 180))
    .slice(0, 12);
  addQualityCheck(checks, {
    id: "no_ungrounded_completion",
    label: "不写入无来源完成态",
    pass: sweepingCompletionClaims.length === 0,
    severity: "high",
    detail: sweepingCompletionClaims.length === 0 ? "没有发现未由原始消息支撑的全量完成/上线类结论。" : "摘要包含原始消息无法支撑的全量完成/上线类结论。",
    evidence: sweepingCompletionClaims,
  });

  const sourceHasText = (messages || []).some(message => messageContent(message));
  const summaryHasSignal = !![
    normalizedSummary.primaryRequest,
    normalizedSummary.currentWork,
    normalizedSummary.nextStep,
    normalizedSummary.userMessages.join("\n"),
    normalizedSummary.filesAndCode.join("\n"),
    normalizedSummary.errorsAndFixes.join("\n"),
    normalizedSummary.pendingTasks.join("\n"),
    normalizedSummary.taskStates.join("\n"),
  ].join("").trim();
  addQualityCheck(checks, {
    id: "summary_not_empty",
    label: "摘要没有空洞化",
    pass: !sourceHasText || summaryHasSignal,
    severity: "medium",
    detail: !sourceHasText || summaryHasSignal ? "压缩区间有可用摘要信号。" : "压缩区间有内容，但摘要几乎为空。",
  });

  const sourceHasBlocked = /(失败|阻塞|未完成|超时|异常|error|failed|blocked|timeout|needs_info)/i.test(sourceText);
  const summaryKeepsBlocked = /(失败|阻塞|未完成|超时|异常|error|failed|blocked|timeout|needs_info)/i.test(summaryConcernText);
  const sourceHasSweepingCompletion = /(全部完成|全部处理|已上线|上线生产|all done|completed all|released to production)/i.test(sourceText);
  const completionOverBlocked = sourceHasBlocked
    && !summaryKeepsBlocked
    && !sourceHasSweepingCompletion
    && /(全部完成|全部处理|已上线|上线生产|all done|completed all|released to production)/i.test(completionText);
  addQualityCheck(checks, {
    id: "no_completion_over_blockers",
    label: "阻塞事实不被全量完成覆盖",
    pass: !completionOverBlocked,
    severity: "high",
    detail: completionOverBlocked ? "源消息存在失败/阻塞，但摘要只表现为全量完成。" : "未发现阻塞事实被全量完成覆盖。",
  });

  const failedChecks = checks.filter(check => !check.pass);
  const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + qualityPenalty(check.severity), 0)));
  const driftReasons = failedChecks
    .filter(check => ["fallback_preserved", "blocked_not_marked_completed", "no_ungrounded_completion", "no_completion_over_blockers"].includes(check.id))
    .map(check => `${check.id}: ${check.detail}`)
    .slice(0, 8);
  const hardFailures = failedChecks.filter(check => check.severity === "fatal" || check.severity === "high");
  const downgradeRequired = hardFailures.length > 0 || score < 70;
  const pass = !downgradeRequired && score >= 80;
  return {
    schema: "ccm-group-memory-quality-v1",
    score,
    pass,
    status: pass ? "pass" : score >= 60 && !failedChecks.some(check => check.severity === "fatal") ? "degraded" : "failed",
    checks,
    drift: { detected: driftReasons.length > 0, reasons: driftReasons },
    downgrade_required: downgradeRequired,
    downgrade_reason: downgradeRequired ? failedChecks.map(check => check.id).join(", ") : "",
    evaluated_at: String(options.evaluatedAt || new Date().toISOString()),
  };
}

function extractFactAnchors(messages: any[]) {
  const anchors: FactAnchor[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const messageId = messageIdentity(message, index);
    const timestamp = String(message?.timestamp || message?.time || "");
    const add = (type: FactAnchor["type"], text: string) => {
      const bounded = compactText(text, 2000);
      if (!bounded) return;
      const checksum = crypto.createHash("sha256").update(`${type}\n${bounded}`).digest("hex").slice(0, 16);
      anchors.push({ id: `${messageId}:${type}`, type, messageId, text: bounded, timestamp, checksum });
    };
    if (message?.role === "user") add("user_requirement", messageContent(message));
    if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason) {
      add("dispatch_decision", `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || messageContent(message)}`);
    }
  }
  return anchors;
}

function mergeFactAnchors(existing: any[] = [], incoming: FactAnchor[] = []) {
  const result = new Map<string, FactAnchor>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    if (!item?.id || !item?.text) continue;
    result.set(String(item.id), item as FactAnchor);
  }
  return [...result.values()].slice(-GROUP_FACT_ANCHOR_LIMIT);
}

function extractPersistentRequirements(messages: any[]) {
  return extractFactAnchors(messages).filter(item =>
    item.type === "user_requirement"
    && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|must\b|never\b|always\b|do not\b|required?\b)/i.test(item.text)
  );
}

function mergePersistentRequirements(existing: any[] = [], incoming: FactAnchor[] = []) {
  const result = new Map<string, FactAnchor>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    if (!item?.id || !item?.text) continue;
    result.set(String(item.id), item as FactAnchor);
  }
  return [...result.values()].slice(-200);
}

export function estimateGroupTextTokens(value: any) {
  return estimateTextTokens(value);
}

export function estimateGroupMessageTokens(message: any) {
  return estimateGroupTextTokens([
    message?.role || "",
    message?.agent || message?.target || "",
    messageContent(message),
    message?.assignments ? JSON.stringify(message.assignments) : "",
    message?.delivery_summary ? JSON.stringify(message.delivery_summary) : "",
  ].filter(Boolean).join("\n"));
}

function messageHasText(message: any) {
  return !!messageContent(message);
}

function groupMessageTaskId(message: any) {
  return String(
    message?.task_id
      || message?.taskId
      || message?.receipt?.taskId
      || message?.receipt?.task_id
      || message?.delivery_summary?.task_id
      || message?.delivery_summary?.taskId
      || ""
  ).trim();
}

function groupProviderMessageId(message: any) {
  return String(
    message?.message?.id
      || message?.provider_message_id
      || message?.providerMessageId
      || message?.response_message_id
      || message?.responseMessageId
      || ""
  ).trim();
}

function groupMessageToolUseIds(message: any) {
  const ids = new Set<string>();
  for (const call of Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : []) {
    const id = String(call?.id || call?.tool_use_id || call?.toolUseId || "").trim();
    if (id) ids.add(id);
  }
  for (const block of messageContentBlocks(message)) {
    if (!["tool_use", "server_tool_use"].includes(String(block?.type || ""))) continue;
    const id = String(block?.id || block?.tool_use_id || block?.toolUseId || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

function groupMessageToolResultIds(message: any) {
  const ids = new Set<string>();
  for (const result of Array.isArray(message?.tool_results || message?.toolResults) ? (message.tool_results || message.toolResults) : []) {
    const id = String(result?.tool_use_id || result?.toolUseId || result?.id || "").trim();
    if (id) ids.add(id);
  }
  for (const block of messageContentBlocks(message)) {
    if (!["tool_result", "web_search_tool_result"].includes(String(block?.type || ""))) continue;
    const id = String(block?.tool_use_id || block?.toolUseId || block?.id || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

function groupSessionMemoryApiInvariantClosureChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyGroupSessionMemoryApiInvariantClosure(receipt: any) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-session-memory-api-invariant-closure-v1"
    || Number(receipt?.version || 0) !== GROUP_SESSION_MEMORY_API_INVARIANT_CLOSURE_VERSION) issues.push("session_memory_api_invariant_closure_schema_invalid");
  if (!Number.isFinite(Number(receipt?.original_keep_index)) || !Number.isFinite(Number(receipt?.adjusted_keep_index))) issues.push("session_memory_api_invariant_closure_index_invalid");
  if (Number(receipt?.adjusted_keep_index || 0) > Number(receipt?.original_keep_index || 0)) issues.push("session_memory_api_invariant_closure_direction_invalid");
  if (receipt?.pass !== true || (receipt?.unresolved_tool_use_ids || []).length || (receipt?.split_provider_message_ids || []).length || receipt?.split_task_transaction === true) issues.push("session_memory_api_invariant_closure_incomplete");
  if (receipt?.body_free !== true) issues.push("session_memory_api_invariant_closure_body_free_missing");
  if (String(receipt?.receipt_checksum || "") !== groupSessionMemoryApiInvariantClosureChecksum(receipt)) issues.push("session_memory_api_invariant_closure_checksum_invalid");
  return { valid: issues.length === 0, issues };
}

export function adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants(messages: any[], startIndex: number, options: any = {}) {
  const originalKeepIndex = Math.max(0, Math.min(messages.length, Number(startIndex || 0)));
  const floorIndex = Math.max(0, Math.min(originalKeepIndex, Number(options.floorIndex ?? 0)));
  let adjustedKeepIndex = originalKeepIndex;
  const includedToolUseIds = new Set<string>();
  const includedProviderMessageIds = new Set<string>();
  const includedTaskIds = new Set<string>();

  for (let pass = 0; pass < messages.length + 1; pass += 1) {
    const keptToolUseIds = new Set<string>();
    const keptToolResultIds = new Set<string>();
    const keptProviderMessageIds = new Set<string>();
    for (let index = adjustedKeepIndex; index < messages.length; index += 1) {
      for (const id of groupMessageToolUseIds(messages[index])) keptToolUseIds.add(id);
      for (const id of groupMessageToolResultIds(messages[index])) keptToolResultIds.add(id);
      const providerMessageId = groupProviderMessageId(messages[index]);
      if (providerMessageId) keptProviderMessageIds.add(providerMessageId);
    }
    const neededToolUseIds = new Set([...keptToolResultIds].filter(id => !keptToolUseIds.has(id)));
    let nextIndex = adjustedKeepIndex;
    for (let index = adjustedKeepIndex - 1; index >= floorIndex; index -= 1) {
      const toolUseIds = groupMessageToolUseIds(messages[index]);
      const matchedToolUseIds = [...toolUseIds].filter(id => neededToolUseIds.has(id));
      const providerMessageId = groupProviderMessageId(messages[index]);
      const providerFragmentRequired = !!providerMessageId && keptProviderMessageIds.has(providerMessageId);
      if (!matchedToolUseIds.length && !providerFragmentRequired) continue;
      nextIndex = index;
      for (const id of matchedToolUseIds) {
        neededToolUseIds.delete(id);
        includedToolUseIds.add(id);
      }
      if (providerFragmentRequired) includedProviderMessageIds.add(providerMessageId);
    }
    const firstTaskId = groupMessageTaskId(messages[nextIndex]);
    while (firstTaskId && nextIndex > floorIndex && groupMessageTaskId(messages[nextIndex - 1]) === firstTaskId) {
      nextIndex -= 1;
      includedTaskIds.add(firstTaskId);
    }
    if (nextIndex === adjustedKeepIndex) break;
    adjustedKeepIndex = nextIndex;
  }

  const keptToolUseIds = new Set<string>();
  const keptToolResultIds = new Set<string>();
  const keptProviderMessageIds = new Set<string>();
  const compactedProviderMessageIds = new Set<string>();
  for (let index = adjustedKeepIndex; index < messages.length; index += 1) {
    for (const id of groupMessageToolUseIds(messages[index])) keptToolUseIds.add(id);
    for (const id of groupMessageToolResultIds(messages[index])) keptToolResultIds.add(id);
    const providerMessageId = groupProviderMessageId(messages[index]);
    if (providerMessageId) keptProviderMessageIds.add(providerMessageId);
  }
  for (let index = floorIndex; index < adjustedKeepIndex; index += 1) {
    const providerMessageId = groupProviderMessageId(messages[index]);
    if (providerMessageId) compactedProviderMessageIds.add(providerMessageId);
  }
  const unresolvedToolUseIds = [...keptToolResultIds].filter(id => !keptToolUseIds.has(id));
  const splitProviderMessageIds = [...keptProviderMessageIds].filter(id => compactedProviderMessageIds.has(id));
  const firstKeptTaskId = groupMessageTaskId(messages[adjustedKeepIndex]);
  const previousTaskId = adjustedKeepIndex > floorIndex ? groupMessageTaskId(messages[adjustedKeepIndex - 1]) : "";
  const splitTaskTransaction = !!firstKeptTaskId && firstKeptTaskId === previousTaskId;
  for (let index = adjustedKeepIndex; index < originalKeepIndex; index += 1) {
    for (const id of groupMessageToolUseIds(messages[index])) includedToolUseIds.add(id);
    const providerMessageId = groupProviderMessageId(messages[index]);
    if (providerMessageId) includedProviderMessageIds.add(providerMessageId);
    const taskId = groupMessageTaskId(messages[index]);
    if (taskId) includedTaskIds.add(taskId);
  }
  const core: any = {
    schema: "ccm-group-session-memory-api-invariant-closure-v1",
    version: GROUP_SESSION_MEMORY_API_INVARIANT_CLOSURE_VERSION,
    original_keep_index: originalKeepIndex,
    adjusted_keep_index: adjustedKeepIndex,
    floor_index: floorIndex,
    expanded_message_count: Math.max(0, originalKeepIndex - adjustedKeepIndex),
    included_tool_use_ids: [...includedToolUseIds].slice(0, 40),
    included_provider_message_ids: [...includedProviderMessageIds].slice(0, 40),
    included_task_ids: [...includedTaskIds].slice(0, 40),
    unresolved_tool_use_ids: unresolvedToolUseIds.slice(0, 40),
    split_provider_message_ids: splitProviderMessageIds.slice(0, 40),
    split_task_transaction: splitTaskTransaction,
    pass: unresolvedToolUseIds.length === 0 && splitProviderMessageIds.length === 0 && !splitTaskTransaction,
    body_free: true,
  };
  const receipt = { ...core, receipt_checksum: groupSessionMemoryApiInvariantClosureChecksum(core) };
  return { keepIndex: adjustedKeepIndex, receipt };
}

/** Claude Code session-memory style retained window adapted to group messages:
 * keep 10K/5 text messages, cap near 40K, and preserve task transactions. */
export function calculateGroupMessagesToKeepIndex(messages: any[], options: any = {}) {
  if (!messages.length) return 0;
  const floorIndex = Math.max(0, Math.min(messages.length, Number(options.floorIndex || 0)));
  const minMessages = Math.max(1, Number(options.minMessages || GROUP_COMPACT_MIN_KEEP_MESSAGES));
  const minTokens = Math.max(1, Number(options.minTokens || GROUP_COMPACT_MIN_KEEP_TOKENS));
  const maxTokens = Math.max(minTokens, Number(options.maxTokens || GROUP_COMPACT_MAX_KEEP_TOKENS));
  let startIndex = messages.length;
  let totalTokens = 0;
  let textMessages = 0;

  for (let i = messages.length - 1; i >= floorIndex; i--) {
    const nextTokens = estimateGroupMessageTokens(messages[i]);
    if (textMessages >= minMessages && totalTokens >= minTokens && totalTokens + nextTokens > maxTokens) break;
    startIndex = i;
    totalTokens += nextTokens;
    if (messageHasText(messages[i])) textMessages++;
    if (textMessages >= minMessages && totalTokens >= minTokens) break;
  }

  const firstTaskId = groupMessageTaskId(messages[startIndex]);
  while (firstTaskId && startIndex > floorIndex && groupMessageTaskId(messages[startIndex - 1]) === firstTaskId) {
    startIndex--;
  }
  if (startIndex > floorIndex && messages[startIndex]?.role !== "user" && messages[startIndex - 1]?.role === "user") startIndex--;
  return startIndex;
}

/** Calculate the CC session-memory retained window from an extraction cursor. */
export function calculateGroupSessionMemoryMessagesToKeepIndex(messages: any[], lastSummarizedMessageId: string, options: any = {}) {
  const cursor = String(lastSummarizedMessageId || "").trim();
  if (!messages.length || !cursor) return -1;
  const lastSummarizedIndex = messages.findIndex((message: any, index: number) => messageIdentity(message, index) === cursor);
  if (lastSummarizedIndex < 0) return -1;
  const minMessages = Math.max(1, Number(options.minMessages || GROUP_COMPACT_MIN_KEEP_MESSAGES));
  const minTokens = Math.max(1, Number(options.minTokens || GROUP_COMPACT_MIN_KEEP_TOKENS));
  const maxTokens = Math.max(minTokens, Number(options.maxTokens || GROUP_COMPACT_MAX_KEEP_TOKENS));
  const floorIndex = Math.max(0, Math.min(lastSummarizedIndex + 1, Number(options.floorIndex ?? 0)));
  let startIndex = lastSummarizedIndex + 1;
  let totalTokens = 0;
  let textMessages = 0;
  for (let index = startIndex; index < messages.length; index += 1) {
    totalTokens += estimateGroupMessageTokens(messages[index]);
    if (messageHasText(messages[index])) textMessages += 1;
  }
  if (totalTokens < maxTokens && (totalTokens < minTokens || textMessages < minMessages)) {
    for (let index = startIndex - 1; index >= floorIndex; index -= 1) {
      totalTokens += estimateGroupMessageTokens(messages[index]);
      if (messageHasText(messages[index])) textMessages += 1;
      startIndex = index;
      if (totalTokens >= maxTokens || (totalTokens >= minTokens && textMessages >= minMessages)) break;
    }
  }
  if (options.skipInvariantClosure === true || options.skip_invariant_closure === true) return startIndex;
  return adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants(messages, startIndex, { floorIndex }).keepIndex;
}

function groupSessionMemoryCompactSelectionChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.selection_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildGroupSessionMemoryCompactSelectionReceipt(input: any = {}) {
  const selected = input.selected === true;
  const payload: any = {
    schema: "ccm-group-session-memory-compact-selection-v1",
    version: GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION,
    group_id: String(input.groupId || input.group_id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    scope_id: String(input.scopeId || input.scope_id || ""),
    status: selected ? "selected" : "fallback",
    selected,
    fallback_reason: selected ? "" : String(input.fallbackReason || input.fallback_reason || "session_memory_unavailable"),
    custom_instructions_present: input.customInstructionsPresent === true || input.custom_instructions_present === true,
    extraction_status: String(input.extractionStatus || input.extraction_status || "unknown"),
    extraction_wait_completed: input.extractionWaitCompleted === true || input.extraction_wait_completed === true,
    extraction_wait_timed_out: input.extractionWaitTimedOut === true || input.extraction_wait_timed_out === true,
    snapshot_file: String(input.snapshotFile || input.snapshot_file || ""),
    summary_file: String(input.summaryFile || input.summary_file || ""),
    snapshot_scope_matches: input.snapshotScopeMatches === true || input.snapshot_scope_matches === true,
    markdown_exists: input.markdownExists === true || input.markdown_exists === true,
    markdown_checksum_matches: input.markdownChecksumMatches === true || input.markdown_checksum_matches === true,
    declared_markdown_checksum: String(input.declaredMarkdownChecksum || input.declared_markdown_checksum || ""),
    actual_markdown_checksum: String(input.actualMarkdownChecksum || input.actual_markdown_checksum || ""),
    last_summarized_message_id: String(input.lastSummarizedMessageId || input.last_summarized_message_id || ""),
    cursor_status: String(input.cursorStatus || input.cursor_status || "unknown"),
    keep_index: Math.max(0, Number(input.keepIndex || input.keep_index || 0)),
    preserved_message_count: Math.max(0, Number(input.preservedMessageCount || input.preserved_message_count || 0)),
    preserved_token_estimate: Math.max(0, Number(input.preservedTokenEstimate || input.preserved_token_estimate || 0)),
    api_invariant_closure: input.apiInvariantClosure || input.api_invariant_closure || null,
    projected_post_compact_tokens: Math.max(0, Number(input.projectedPostCompactTokens || input.projected_post_compact_tokens || 0)),
    auto_compact_threshold: Math.max(0, Number(input.autoCompactThreshold || input.auto_compact_threshold || 0)),
    compaction_api_called: selected ? false : input.compactionApiCalled === true || input.compaction_api_called === true,
    usage_attribution: selected
      ? "not_applicable_session_memory_reused"
      : input.compactionApiCalled === true || input.compaction_api_called === true
        ? "compaction_model_call"
        : "traditional_deterministic_compaction",
    body_free: true,
    created_at: String(input.createdAt || input.created_at || new Date().toISOString()),
  };
  return { ...payload, selection_checksum: groupSessionMemoryCompactSelectionChecksum(payload) };
}

export function verifyGroupSessionMemoryCompactSelectionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-session-memory-compact-selection-v1"
    || Number(receipt?.version || 0) !== GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION) issues.push("session_memory_selection_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("session_memory_selection_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("session_memory_selection_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("session_memory_selection_scope_invalid");
  if (!['selected', 'fallback'].includes(String(receipt?.status || ""))) issues.push("session_memory_selection_status_invalid");
  if (receipt?.selected === true && String(receipt?.status || "") !== "selected") issues.push("session_memory_selection_selected_status_invalid");
  if (receipt?.selected === true && (!receipt?.markdown_checksum_matches || receipt?.cursor_status !== "resolved")) issues.push("session_memory_selection_unverified_source");
  if (receipt?.selected === true && !verifyGroupSessionMemoryApiInvariantClosure(receipt?.api_invariant_closure).valid) issues.push("session_memory_selection_api_invariant_closure_invalid");
  if (receipt?.selected === true && receipt?.compaction_api_called !== false) issues.push("session_memory_selection_api_call_invalid");
  if (receipt?.body_free !== true) issues.push("session_memory_selection_body_free_missing");
  if (String(receipt?.selection_checksum || "") !== groupSessionMemoryCompactSelectionChecksum(receipt)) issues.push("session_memory_selection_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("session_memory_selection_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("session_memory_selection_session_mismatch");
  return { valid: issues.length === 0, issues };
}

async function selectGroupSessionMemoryForCompact(input: any = {}) {
  const groupId = String(input.groupId || "").trim();
  const groupSessionId = String(input.groupSessionId || "").trim();
  const scopeId = `${groupId}--${groupSessionId}`;
  const cleanScope = scopeId.replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
  const expectedDir = path.join(CCM_DIR, "group-session-memory", cleanScope);
  const snapshotFile = path.join(expectedDir, "snapshot.json");
  const summaryFile = path.join(expectedDir, "summary.md");
  const config = input.config || {};
  const customInstructions = String(
    config.compactInstructions || config.compact_instructions
      || config.customCompactInstructions || config.custom_compact_instructions
      || ""
  ).trim();
  const base: any = {
    groupId,
    groupSessionId,
    scopeId,
    snapshotFile,
    summaryFile,
    customInstructionsPresent: !!customInstructions,
    autoCompactThreshold: input.triggerTokens,
    createdAt: input.now,
  };
  const fallback = (reason: string, extra: any = {}) => ({
    selected: false,
    markdown: "",
    keepIndex: Number(input.defaultKeepIndex || 0),
    receipt: buildGroupSessionMemoryCompactSelectionReceipt({ ...base, ...extra, fallbackReason: reason }),
  });
  if (config.sessionMemoryCompactEnabled === false || config.session_memory_compact_enabled === false) return fallback("disabled_by_configuration");
  if (input.primaryPartialCompact === true) return fallback("partial_compact_requested");
  if (customInstructions) return fallback("custom_instructions_present");

  const wait = await waitForGroupSessionMemoryExtraction(scopeId, {
    timeoutMs: Number(config.sessionMemoryCompactWaitTimeoutMs || config.session_memory_compact_wait_timeout_ms || 15_000),
    pollMs: Number(config.sessionMemoryCompactPollMs || config.session_memory_compact_poll_ms || 100),
  });
  const extraction = readGroupSessionMemoryExtractionState(scopeId);
  const waitFields = {
    extractionStatus: extraction.status || "unknown",
    extractionWaitCompleted: wait.completed === true,
    extractionWaitTimedOut: wait.timedOut === true,
  };
  if (wait.timedOut) return fallback("extraction_wait_timeout", waitFields);
  if (wait.status?.present && wait.status?.valid !== true) return fallback("extraction_lease_invalid", waitFields);

  let snapshot: any = null;
  let markdown = "";
  try { snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf-8")); } catch {}
  try { markdown = fs.readFileSync(summaryFile, "utf-8").trim(); } catch {}
  const declaredChecksum = String(snapshot?.markdownChecksum || "");
  const actualChecksum = markdown ? crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24) : "";
  const snapshotScopeMatches = String(snapshot?.groupId || "") === scopeId
    && path.resolve(String(snapshot?.snapshotFile || snapshotFile)) === path.resolve(snapshotFile)
    && path.resolve(String(snapshot?.summaryFile || summaryFile)) === path.resolve(summaryFile);
  const sourceFields = {
    ...waitFields,
    snapshotScopeMatches,
    markdownExists: !!markdown,
    markdownChecksumMatches: !!markdown && !!declaredChecksum && declaredChecksum === actualChecksum,
    declaredMarkdownChecksum: declaredChecksum,
    actualMarkdownChecksum: actualChecksum,
    lastSummarizedMessageId: snapshot?.lastSummarizedMessageId || "",
  };
  if (!snapshot) return fallback("snapshot_missing_or_invalid", sourceFields);
  if (!snapshotScopeMatches) return fallback("snapshot_scope_mismatch", sourceFields);
  if (!markdown) return fallback("summary_markdown_missing_or_empty", sourceFields);
  if (snapshot.hasSummary !== true) return fallback("session_memory_empty_template", sourceFields);
  if (!sourceFields.markdownChecksumMatches) return fallback("summary_markdown_checksum_mismatch", sourceFields);
  const currentPostCompactReset = input.memory?.compaction?.postCompactSessionStateReset
    || input.memory?.messageCompression?.postCompactSessionStateReset
    || input.memory?.compactBoundary?.postCompactSessionStateReset
    || input.memory?.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
    || null;
  if (currentPostCompactReset?.schema) {
    const currentResetVerification = verifyGroupPostCompactSessionStateResetReceipt(currentPostCompactReset, {
      groupId,
      groupSessionId,
      boundaryId: input.memory?.compactBoundary?.id || "",
      summaryChecksum: input.memory?.compaction?.summaryChecksum || "",
    });
    const snapshotReset = snapshot.postCompactSessionStateReset || null;
    const snapshotResetVerification = verifyGroupPostCompactSessionStateResetReceipt(snapshotReset, {
      groupId,
      groupSessionId,
      boundaryId: input.memory?.compactBoundary?.id || "",
      summaryChecksum: input.memory?.compaction?.summaryChecksum || "",
    });
    const resetMatches = currentResetVerification.valid
      && snapshotResetVerification.valid
      && String(snapshotReset?.receipt_checksum || "") === String(currentPostCompactReset.receipt_checksum || "")
      && Number(snapshot.extractionCursorGeneration || 0) === Number(currentPostCompactReset.session_memory_extraction_cursor?.generation || 0)
      && String(snapshot.providerActiveLastSummarizedMessageId || "") === ""
      && String(snapshot.providerActiveCursorStatus || "") === "cleared_after_compact";
    if (!resetMatches) return fallback("post_compact_session_state_reset_mismatch", sourceFields);
  }
  const cursor = String(snapshot.lastSummarizedMessageId || "").trim();
  if (!cursor) return fallback("last_summarized_cursor_missing", { ...sourceFields, cursorStatus: "missing" });
  const candidateKeepIndex = calculateGroupSessionMemoryMessagesToKeepIndex(input.messages || [], cursor, {
    ...(input.keepWindowOptions || {}),
    skipInvariantClosure: true,
  });
  if (candidateKeepIndex < 0) return fallback("last_summarized_cursor_not_found", { ...sourceFields, cursorStatus: "not_found" });
  const invariantClosure = adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants(
    input.messages || [],
    candidateKeepIndex,
    { floorIndex: input.keepWindowOptions?.floorIndex ?? 0 },
  );
  const keepIndex = invariantClosure.keepIndex;
  if (!verifyGroupSessionMemoryApiInvariantClosure(invariantClosure.receipt).valid) {
    return fallback("api_invariant_closure_unresolved", {
      ...sourceFields,
      cursorStatus: "resolved",
      keepIndex,
      apiInvariantClosure: invariantClosure.receipt,
    });
  }
  const keptMessages = (input.messages || []).slice(keepIndex);
  const projected = buildGroupTruePostCompactPayloadBudget({
    groupId,
    groupSessionId,
    triggerTokens: input.triggerTokens,
    summaryText: markdown,
    keptMessages,
    postCompactReinject: input.memory?.compaction?.postCompactReinject || null,
    persistentRequirements: input.memory?.persistentRequirements || [],
    factAnchors: input.memory?.factAnchors || [],
    sessionMemory: null,
    toolContinuity: input.memory?.toolContinuity || null,
  });
  const projectedTokens = Number(projected.true_post_compact_token_count || 0);
  const selectedFields = {
    ...sourceFields,
    cursorStatus: "resolved",
    keepIndex,
    preservedMessageCount: keptMessages.length,
    preservedTokenEstimate: keptMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0),
    apiInvariantClosure: invariantClosure.receipt,
    projectedPostCompactTokens: projectedTokens,
  };
  if (projected.will_retrigger_next_turn === true) return fallback("projected_payload_reaches_auto_compact_threshold", selectedFields);
  return {
    selected: true,
    markdown,
    keepIndex,
    snapshot,
    receipt: buildGroupSessionMemoryCompactSelectionReceipt({ ...base, ...selectedFields, selected: true }),
  };
}

export function buildGroupPreservedSegment(messages: any[], keepIndex: number, options: any = {}) {
  const safeKeepIndex = Math.max(0, Math.min((messages || []).length, Number(keepIndex || 0)));
  const preservedMessages = (messages || []).slice(safeKeepIndex);
  const preservedMessageIds = preservedMessages.map((message: any, index: number) => messageIdentity(message, safeKeepIndex + index));
  const tokenEstimate = preservedMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const textBlockMessageCount = preservedMessages.filter(messageHasText).length;
  const firstTaskId = groupMessageTaskId(messages?.[safeKeepIndex]);
  const firstTaskMessageCount = firstTaskId
    ? preservedMessages.filter((message: any) => groupMessageTaskId(message) === firstTaskId).length
    : 0;
  const protectedTaskTransaction = !!firstTaskId && firstTaskMessageCount > 1;
  const summarizedThroughMessageId = safeKeepIndex > 0 ? messageIdentity(messages[safeKeepIndex - 1], safeKeepIndex - 1) : "";
  const summaryChecksum = String(options.summaryChecksum || options.summary_checksum || "");
  const summaryMessageId = String(options.summaryMessageId || options.summary_message_id || (
    summaryChecksum && summarizedThroughMessageId
      ? `gcsum_${crypto.createHash("sha256")
        .update(`${options.groupId || options.group_id || options.scopeId || options.scope_id || "unscoped"}\n${summaryChecksum}\n${summarizedThroughMessageId}`)
        .digest("hex")
        .slice(0, 24)}`
      : ""
  ));
  const headMessageId = preservedMessageIds[0] || "";
  const tailMessageId = preservedMessageIds[preservedMessageIds.length - 1] || "";
  return {
    schema: "ccm-group-preserved-segment-v1",
    version: GROUP_PRESERVED_SEGMENT_VERSION,
    keepIndex: safeKeepIndex,
    floorIndex: Math.max(0, Number(options.floorIndex || 0)),
    preservedMessageCount: preservedMessages.length,
    preservedTextBlockMessageCount: textBlockMessageCount,
    preservedTokenEstimate: tokenEstimate,
    preservedMessageIds: preservedMessageIds.slice(-80),
    omittedPreservedMessageIds: Math.max(0, preservedMessageIds.length - 80),
    firstPreservedMessageId: headMessageId,
    lastPreservedMessageId: tailMessageId,
    summarizedThroughMessageId,
    summaryMessageId,
    summaryChecksum,
    headMessageId,
    anchorMessageId: summaryMessageId,
    tailMessageId,
    anchorKind: "compact_summary",
    anchorMode: "suffix_preserving",
    minTokens: Number(options.minTokens || options.min_tokens || GROUP_COMPACT_MIN_KEEP_TOKENS),
    minTextBlockMessages: Number(options.minMessages || options.min_messages || GROUP_COMPACT_MIN_KEEP_MESSAGES),
    maxTokens: Number(options.maxTokens || options.max_tokens || GROUP_COMPACT_MAX_KEEP_TOKENS),
    protectedTaskTransaction,
    firstPreservedTaskId: firstTaskId,
    transcriptPath: options.transcriptPath || options.transcript_path || "",
    createdAt: options.now || new Date().toISOString(),
  };
}

function messageContentBlocks(message: any) {
  const blocks: any[] = [];
  const visit = (value: any, depth = 0) => {
    if (depth > 4 || value == null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;
    if (value.type) blocks.push(value);
    if (Array.isArray(value.content)) visit(value.content, depth + 1);
    if (Array.isArray(value.blocks)) visit(value.blocks, depth + 1);
  };
  visit(message?.content);
  visit(message?.blocks);
  visit(message?.message?.content);
  return blocks;
}

function collectWindowBlockRefs(messages: any[], offset = 0) {
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();
  const thinkingMessageIds = new Set<string>();
  const rows: any[] = [];
  (messages || []).forEach((message, localIndex) => {
    const index = offset + localIndex;
    const messageId = messageIdentity(message, index);
    const providerMessageId = groupProviderMessageId(message);
    if (providerMessageId) thinkingMessageIds.add(providerMessageId);
    for (const id of groupMessageToolUseIds(message)) {
      toolUseIds.add(id);
      rows.push({ type: "tool_use", id, messageId, providerMessageId, index });
    }
    for (const id of groupMessageToolResultIds(message)) {
      toolResultIds.add(id);
      rows.push({ type: "tool_result", id, messageId, providerMessageId, index });
    }
    for (const block of messageContentBlocks(message)) {
      const type = String(block?.type || "");
      if (type === "tool_use" || type === "server_tool_use") {
        const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
        rows.push({ type, id, messageId, providerMessageId, index });
      } else if (type === "tool_result" || type === "web_search_tool_result") {
        const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
        rows.push({ type, id, messageId, providerMessageId, index });
      } else if (type === "thinking" || type === "redacted_thinking") {
        thinkingMessageIds.add(providerMessageId || messageId);
        rows.push({ type, id: providerMessageId || messageId, messageId, providerMessageId, index });
      }
    }
  });
  return { toolUseIds, toolResultIds, thinkingMessageIds, rows };
}

function collectApiMicroCompactSignals(messages: any[] = []) {
  const toolUseIds = new Set<string>();
  const toolResultIds = new Set<string>();
  const toolNames = new Set<string>();
  const resultToolNames = new Set<string>();
  let thinkingBlockCount = 0;
  let redactedThinkingBlockCount = 0;
  let toolUseBlockCount = 0;
  let toolResultBlockCount = 0;
  (messages || []).forEach((message: any, index: number) => {
    if (String(message?.role || "").toLowerCase() === "thinking") thinkingBlockCount += 1;
    const explicitToolCalls = Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : [];
    for (const call of explicitToolCalls) {
      const id = String(call?.id || call?.tool_use_id || call?.toolUseId || `tool-call-${index}`).trim();
      const name = String(call?.name || call?.function?.name || call?.tool || "").trim();
      if (id) toolUseIds.add(id);
      if (name) toolNames.add(name);
      toolUseBlockCount += 1;
    }
    const explicitResults = Array.isArray(message?.tool_results || message?.toolResults) ? (message.tool_results || message.toolResults) : [];
    for (const result of explicitResults) {
      const id = String(result?.tool_use_id || result?.toolUseId || result?.id || `tool-result-${index}`).trim();
      const name = String(result?.name || result?.tool || "").trim();
      if (id) toolResultIds.add(id);
      if (name) resultToolNames.add(name);
      toolResultBlockCount += 1;
    }
    for (const block of messageContentBlocks(message)) {
      const type = String(block?.type || "");
      if (type === "tool_use" || type === "server_tool_use") {
        const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
        const name = String(block.name || block.tool || block.tool_name || "").trim();
        if (id) toolUseIds.add(id);
        if (name) toolNames.add(name);
        toolUseBlockCount += 1;
      } else if (type === "tool_result" || type === "web_search_tool_result") {
        const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
        const name = String(block.name || block.tool || block.tool_name || "").trim();
        if (id) toolResultIds.add(id);
        if (name) resultToolNames.add(name);
        toolResultBlockCount += 1;
      } else if (type === "thinking") {
        thinkingBlockCount += 1;
      } else if (type === "redacted_thinking") {
        redactedThinkingBlockCount += 1;
      }
    }
  });
  return {
    toolUseIds: [...toolUseIds].slice(0, 60),
    toolResultIds: [...toolResultIds].slice(0, 60),
    toolNames: [...toolNames].slice(0, 30),
    resultToolNames: [...resultToolNames].slice(0, 30),
    toolUseBlockCount,
    toolResultBlockCount,
    thinkingBlockCount,
    redactedThinkingBlockCount,
    hasThinking: thinkingBlockCount > 0,
    hasToolUses: toolUseBlockCount > 0,
    hasToolResults: toolResultBlockCount > 0,
  };
}

const GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES = new Set([
  "read", "fileread", "bash", "shell", "powershell", "grep", "glob",
  "websearch", "webfetch", "edit", "fileedit", "write", "filewrite", "notebookedit",
]);

function normalizedToolName(value: any) {
  return String(value || "").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

function timeBasedToolResultReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyGroupTimeBasedToolResultProjectionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-time-based-tool-result-projection-v1" || Number(receipt?.version || 0) !== GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION) issues.push("time_based_tool_result_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("time_based_tool_result_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("time_based_tool_result_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`) issues.push("time_based_tool_result_scope_invalid");
  if (!["applied", "skipped"].includes(String(receipt?.status || ""))) issues.push("time_based_tool_result_status_invalid");
  if (Number(receipt?.keep_recent || 0) < 1) issues.push("time_based_tool_result_keep_recent_invalid");
  if (receipt?.raw_transcript_preserved !== true) issues.push("time_based_tool_result_raw_preservation_missing");
  if (receipt?.status === "applied" && Number(receipt?.cleared_tool_result_count || 0) < 1) issues.push("time_based_tool_result_clear_count_missing");
  if (receipt?.status === "applied" && Number(receipt?.tokens_saved || 0) < 1) issues.push("time_based_tool_result_tokens_saved_missing");
  if (String(receipt?.receipt_checksum || "") !== timeBasedToolResultReceiptChecksum(receipt)) issues.push("time_based_tool_result_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("time_based_tool_result_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("time_based_tool_result_session_mismatch");
  return { valid: issues.length === 0, issues };
}

function clearProjectedToolResultValue(value: any, clearIds: Set<string>, state: { tokensSaved: number; cleared: number }): any {
  if (Array.isArray(value)) return value.map(item => clearProjectedToolResultValue(item, clearIds, state));
  if (!value || typeof value !== "object") return value;
  const type = String(value.type || "");
  const id = String(value.tool_use_id || value.toolUseId || value.id || "").trim();
  if ((type === "tool_result" || type === "web_search_tool_result") && clearIds.has(id)) {
    const current = value.content ?? value.output ?? value.result ?? value.text ?? "";
    if (current === GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE) return value;
    state.tokensSaved += Math.max(0, estimateGroupTextTokens(renderMessageContentValue(current)) - estimateGroupTextTokens(GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE));
    state.cleared += 1;
    return { ...value, content: GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE, output: undefined, result: undefined, text: undefined };
  }
  const next: any = { ...value };
  if (Array.isArray(value.content) || value.content && typeof value.content === "object") next.content = clearProjectedToolResultValue(value.content, clearIds, state);
  if (Array.isArray(value.blocks)) next.blocks = clearProjectedToolResultValue(value.blocks, clearIds, state);
  return next;
}

export function buildGroupTimeBasedToolResultProjection(messages: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const enabled = options.enabled === true;
  const gapThresholdMinutes = Math.max(1, Math.min(10_080, Math.floor(Number(options.gapThresholdMinutes || options.gap_threshold_minutes || 60))));
  const keepRecent = Math.max(1, Math.min(100, Math.floor(Number(options.keepRecent || options.keep_recent || 5))));
  const querySource = String(options.querySource || options.query_source || "");
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const toolNamesById = new Map<string, string>();
  const compactableIds: string[] = [];
  for (const message of messages || []) {
    const explicitCalls = Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : [];
    for (const call of explicitCalls) {
      const id = String(call?.id || call?.tool_use_id || call?.toolUseId || "").trim();
      const name = String(call?.name || call?.function?.name || call?.tool || "").trim();
      if (id) toolNamesById.set(id, name);
    }
    for (const block of messageContentBlocks(message)) {
      const type = String(block?.type || "");
      if (type !== "tool_use" && type !== "server_tool_use") continue;
      const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
      const name = String(block.name || block.tool || block.tool_name || "").trim();
      if (id) toolNamesById.set(id, name);
    }
  }
  for (const [id, name] of toolNamesById) if (GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES.has(normalizedToolName(name))) compactableIds.push(id);
  const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || (!!message?.agent && message?.role !== "user"));
  const lastAssistantMs = messageTimestampMs(lastAssistant);
  const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
  const sourceAllowed = querySource === "group_main_thread" || querySource.startsWith("group_main_thread:");
  const exactSession = groupSessionId.startsWith("gcs_");
  const triggered = enabled && exactSession && sourceAllowed && !!lastAssistantMs && gapMinutes >= gapThresholdMinutes && compactableIds.length > keepRecent;
  const keepIds = new Set(compactableIds.slice(-keepRecent));
  const clearIds = new Set(triggered ? compactableIds.filter(id => !keepIds.has(id)) : []);
  const state = { tokensSaved: 0, cleared: 0 };
  const projectedMessages = clearIds.size ? (messages || []).map(message => {
    const next: any = { ...message };
    if (message?.content != null) next.content = clearProjectedToolResultValue(message.content, clearIds, state);
    if (message?.message?.content != null) next.message = { ...message.message, content: clearProjectedToolResultValue(message.message.content, clearIds, state) };
    if (Array.isArray(message?.blocks)) next.blocks = clearProjectedToolResultValue(message.blocks, clearIds, state);
    if (Array.isArray(message?.tool_results || message?.toolResults)) {
      const key = Array.isArray(message.tool_results) ? "tool_results" : "toolResults";
      next[key] = (message.tool_results || message.toolResults).map((result: any) => {
        const id = String(result?.tool_use_id || result?.toolUseId || result?.id || "").trim();
        if (!clearIds.has(id)) return result;
        const current = result.content ?? result.output ?? result.result ?? result.text ?? "";
        if (current === GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE) return result;
        state.tokensSaved += Math.max(0, estimateGroupTextTokens(renderMessageContentValue(current)) - estimateGroupTextTokens(GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE));
        state.cleared += 1;
        return { ...result, content: GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE, output: undefined, result: undefined, text: undefined };
      });
    }
    return next;
  }) : messages;
  const reason = !enabled ? "disabled"
    : !exactSession ? "exact_group_session_required"
      : !sourceAllowed ? "main_thread_source_required"
        : !lastAssistantMs ? "last_assistant_timestamp_missing"
          : gapMinutes < gapThresholdMinutes ? "gap_under_threshold"
            : compactableIds.length <= keepRecent ? "not_enough_compactable_tool_results"
              : state.cleared < 1 ? "matching_tool_results_missing"
                : "assistant_gap_exceeded_threshold";
  const payload: any = {
    schema: "ccm-group-time-based-tool-result-projection-v1",
    version: GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    query_source: querySource,
    enabled,
    status: triggered && state.cleared > 0 ? "applied" : "skipped",
    reason,
    gap_minutes: gapMinutes,
    gap_threshold_minutes: gapThresholdMinutes,
    keep_recent: keepRecent,
    compactable_tool_count: compactableIds.length,
    cleared_tool_result_count: state.cleared,
    kept_tool_count: Math.min(keepRecent, compactableIds.length),
    tokens_saved: state.tokensSaved,
    last_assistant_message_id: lastAssistant ? messageIdentity(lastAssistant, Math.max(0, (messages || []).indexOf(lastAssistant))) : "",
    last_assistant_at: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
    evaluated_at: new Date(nowMs).toISOString(),
    raw_transcript_preserved: true,
    cleared_content_marker: GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE,
    cleared_tool_ids: [...clearIds].slice(0, 100),
  };
  const receipt = { ...payload, receipt_checksum: timeBasedToolResultReceiptChecksum(payload) };
  return { messages: projectedMessages, receipt, applied: receipt.status === "applied" };
}

function timeBasedThinkingReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyGroupTimeBasedThinkingProjectionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-time-based-thinking-projection-v1" || Number(receipt?.version || 0) !== GROUP_TIME_BASED_THINKING_PROJECTION_VERSION) issues.push("time_based_thinking_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("time_based_thinking_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("time_based_thinking_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`) issues.push("time_based_thinking_scope_invalid");
  if (!String(receipt?.compact_epoch || "")) issues.push("time_based_thinking_compact_epoch_missing");
  if (!["applied", "latched", "skipped"].includes(String(receipt?.status || ""))) issues.push("time_based_thinking_status_invalid");
  if (Number(receipt?.keep_thinking_turns || 0) !== 1) issues.push("time_based_thinking_keep_invalid");
  if (receipt?.raw_transcript_preserved !== true) issues.push("time_based_thinking_raw_preservation_missing");
  if (receipt?.status === "applied" && receipt?.latched !== true) issues.push("time_based_thinking_applied_without_latch");
  if (receipt?.status === "applied" && Number(receipt?.cleared_thinking_turn_count || 0) < 1) issues.push("time_based_thinking_clear_count_missing");
  if (String(receipt?.receipt_checksum || "") !== timeBasedThinkingReceiptChecksum(receipt)) issues.push("time_based_thinking_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("time_based_thinking_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("time_based_thinking_session_mismatch");
  if (expected.compactEpoch && String(receipt?.compact_epoch || "") !== String(expected.compactEpoch)) issues.push("time_based_thinking_compact_epoch_mismatch");
  return { valid: issues.length === 0, issues };
}

function hasModelVisibleThinking(message: any) {
  if (String(message?.role || "").toLowerCase() === "thinking") return true;
  return messageContentBlocks(message).some(block => String(block?.type || "") === "thinking");
}

function clearProjectedThinkingValue(value: any, state: { tokensSaved: number; clearedBlocks: number }): any {
  if (Array.isArray(value)) return value.map(item => clearProjectedThinkingValue(item, state));
  if (!value || typeof value !== "object") return value;
  if (String(value.type || "") === "thinking") {
    const current = value.thinking ?? value.content ?? value.text ?? "";
    state.tokensSaved += Math.max(0, estimateGroupTextTokens(renderMessageContentValue(current)) - estimateGroupTextTokens(GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE));
    state.clearedBlocks += 1;
    return { type: "text", text: GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE };
  }
  const next: any = { ...value };
  if (Array.isArray(value.content) || value.content && typeof value.content === "object") next.content = clearProjectedThinkingValue(value.content, state);
  if (Array.isArray(value.blocks)) next.blocks = clearProjectedThinkingValue(value.blocks, state);
  return next;
}

export function buildGroupTimeBasedThinkingProjection(messages: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const compactEpoch = String(options.compactEpoch || options.compact_epoch || "precompact").trim() || "precompact";
  const enabled = options.enabled === true;
  const gapThresholdMinutes = Math.max(1, Math.min(10_080, Math.floor(Number(options.gapThresholdMinutes || options.gap_threshold_minutes || 60))));
  const querySource = String(options.querySource || options.query_source || "");
  const isRedactThinkingActive = options.isRedactThinkingActive === true || options.is_redact_thinking_active === true;
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const priorReceipt = options.priorReceipt || options.prior_receipt || null;
  const priorVerification = priorReceipt
    ? verifyGroupTimeBasedThinkingProjectionReceipt(priorReceipt, { groupId, groupSessionId })
    : { valid: false, issues: [] as string[] };
  const priorLatchSameEpoch = priorVerification.valid === true
    && priorReceipt?.latched === true
    && String(priorReceipt?.compact_epoch || "") === compactEpoch;
  const exactSession = groupSessionId.startsWith("gcs_");
  const sourceAllowed = querySource === "group_main_thread" || querySource.startsWith("group_main_thread:");
  const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || (!!message?.agent && message?.role !== "user"));
  const lastAssistantMs = messageTimestampMs(lastAssistant);
  const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
  const gapLatch = enabled && exactSession && sourceAllowed && !!lastAssistantMs && gapMinutes >= gapThresholdMinutes;
  const latched = enabled && exactSession && sourceAllowed && !isRedactThinkingActive && (priorLatchSameEpoch || gapLatch);
  const thinkingRows = (messages || []).map((message: any, index: number) => ({ message, index, id: messageIdentity(message, index) }))
    .filter(row => hasModelVisibleThinking(row.message));
  const keepThinkingMessageId = thinkingRows.length ? thinkingRows[thinkingRows.length - 1].id : "";
  const clearThinkingMessageIds = new Set(latched ? thinkingRows.slice(0, -1).map(row => row.id) : []);
  const state = { tokensSaved: 0, clearedBlocks: 0 };
  let clearedThinkingTurns = 0;
  const projectedMessages = clearThinkingMessageIds.size ? (messages || []).map((message: any, index: number) => {
    const messageId = messageIdentity(message, index);
    if (!clearThinkingMessageIds.has(messageId)) return message;
    clearedThinkingTurns += 1;
    const next: any = { ...message };
    if (String(message?.role || "").toLowerCase() === "thinking") {
      const current = message?.content ?? message?.thinking ?? "";
      state.tokensSaved += Math.max(0, estimateGroupTextTokens(renderMessageContentValue(current)) - estimateGroupTextTokens(GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE));
      state.clearedBlocks += 1;
      next.content = GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE;
      if ("thinking" in next) next.thinking = undefined;
    } else {
      if (message?.content != null) next.content = clearProjectedThinkingValue(message.content, state);
      if (message?.message?.content != null) next.message = { ...message.message, content: clearProjectedThinkingValue(message.message.content, state) };
      if (Array.isArray(message?.blocks)) next.blocks = clearProjectedThinkingValue(message.blocks, state);
    }
    return next;
  }) : messages;
  const resetByCompact = priorVerification.valid === true
    && priorReceipt?.latched === true
    && String(priorReceipt?.compact_epoch || "") !== compactEpoch;
  const reason = !enabled ? "disabled"
    : !exactSession ? "exact_group_session_required"
      : !sourceAllowed ? "main_thread_source_required"
        : isRedactThinkingActive ? "redacted_thinking_not_model_visible"
          : resetByCompact && !gapLatch ? "compact_epoch_changed_latch_reset"
            : !lastAssistantMs && !priorLatchSameEpoch ? "last_assistant_timestamp_missing"
              : !latched ? "gap_under_threshold"
                : gapLatch && !priorLatchSameEpoch ? "assistant_gap_exceeded_threshold_latched"
                  : "exact_session_latch_reused";
  const status = latched
    ? clearedThinkingTurns > 0 ? "applied" : "latched"
    : "skipped";
  const payload: any = {
    schema: "ccm-group-time-based-thinking-projection-v1",
    version: GROUP_TIME_BASED_THINKING_PROJECTION_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    query_source: querySource,
    compact_epoch: compactEpoch,
    enabled,
    status,
    reason,
    latched,
    newly_latched: gapLatch && !priorLatchSameEpoch,
    prior_latch_reused: priorLatchSameEpoch,
    reset_by_compact: resetByCompact,
    gap_minutes: gapMinutes,
    gap_threshold_minutes: gapThresholdMinutes,
    keep_thinking_turns: 1,
    thinking_turn_count: thinkingRows.length,
    cleared_thinking_turn_count: clearedThinkingTurns,
    cleared_thinking_block_count: state.clearedBlocks,
    kept_thinking_turn_count: thinkingRows.length ? 1 : 0,
    tokens_saved: state.tokensSaved,
    last_assistant_message_id: lastAssistant ? messageIdentity(lastAssistant, Math.max(0, (messages || []).indexOf(lastAssistant))) : "",
    last_assistant_at: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
    kept_thinking_message_id: keepThinkingMessageId,
    cleared_thinking_message_ids: [...clearThinkingMessageIds].slice(0, 100),
    evaluated_at: new Date(nowMs).toISOString(),
    raw_transcript_preserved: true,
    cleared_content_marker: GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE,
  };
  const receipt = { ...payload, receipt_checksum: timeBasedThinkingReceiptChecksum(payload) };
  return {
    messages: projectedMessages,
    receipt,
    applied: status === "applied",
    shouldPersist: enabled && (status === "applied" || receipt.newly_latched === true || resetByCompact),
  };
}

export function buildGroupApiMicroCompactEditPlan(messages: any[] = [], options: any = {}) {
  const maxInputTokens = Math.max(1, Number(options.maxInputTokens || options.max_input_tokens || GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS));
  const targetInputTokens = Math.max(1, Math.min(maxInputTokens, Number(options.targetInputTokens || options.target_input_tokens || GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS)));
  const clearAtLeastTokens = Math.max(0, maxInputTokens - targetInputTokens);
  const activeTokens = Number(options.activeTokens || options.active_tokens || (messages || []).reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0));
  const triggerValue = Math.max(targetInputTokens, Number(options.triggerTokens || options.trigger_tokens || maxInputTokens));
  const signals = collectApiMicroCompactSignals(messages);
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const latestMessageTime = Math.max(0, ...(messages || []).map((message: any) => Date.parse(String(message?.timestamp || message?.time || "")) || 0));
  const idleMinutes = Number.isFinite(Number(options.idleMinutes || options.idle_minutes))
    ? Number(options.idleMinutes || options.idle_minutes)
    : latestMessageTime > 0 ? Math.max(0, Math.round((nowMs - latestMessageTime) / 6000) / 10) : 0;
  const clearAllThinkingThresholdMinutes = Math.max(1, Number(options.clearAllThinkingAfterMinutes || options.clear_all_thinking_after_minutes || 60));
  const isRedactThinkingActive = options.isRedactThinkingActive === true || options.is_redact_thinking_active === true;
  const clearAllThinking = options.clearAllThinking === true || options.clear_all_thinking === true || idleMinutes >= clearAllThinkingThresholdMinutes;
  const force = options.force === true || options.recommend === true;
  const aboveTrigger = activeTokens >= triggerValue;
  const enableToolResultClearing = options.enableToolResultClearing !== false && options.enable_tool_result_clearing !== false;
  const enableToolUseClearing = options.enableToolUseClearing === true || options.enable_tool_use_clearing === true || force;
  const edits: any[] = [];
  const strategies: any[] = [];
  const addStrategy = (strategy: any, recommended: boolean, reason: string) => {
    const row = { ...strategy, recommended: recommended === true, reason };
    strategies.push(row);
    if (recommended) {
      const { recommended: _recommended, reason: _reason, ...apiShape } = row;
      edits.push(apiShape);
    }
  };
  if (signals.hasThinking && !isRedactThinkingActive) {
    addStrategy({
      type: "clear_thinking_20251015",
      keep: clearAllThinking ? { type: "thinking_turns", value: 1 } : "all",
    }, true, clearAllThinking ? "idle cache likely missed; keep only last thinking turn" : "preserve model-visible previous thinking blocks");
  }
  if (enableToolResultClearing && signals.hasToolResults) {
    addStrategy({
      type: "clear_tool_uses_20250919",
      trigger: { type: "input_tokens", value: triggerValue },
      clear_at_least: { type: "input_tokens", value: clearAtLeastTokens },
      clear_tool_inputs: GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
    }, force || aboveTrigger, aboveTrigger ? "input tokens exceed API microcompact trigger" : "tool results present but below trigger; keep as advisory until pressure rises");
  }
  if (enableToolUseClearing && signals.hasToolUses) {
    addStrategy({
      type: "clear_tool_uses_20250919",
      trigger: { type: "input_tokens", value: triggerValue },
      clear_at_least: { type: "input_tokens", value: clearAtLeastTokens },
      exclude_tools: GROUP_API_MICROCOMPACT_CLEARABLE_USES,
    }, force || aboveTrigger, "keep recent tool uses while preserving edit/write safety boundaries");
  }
  const config = edits.length ? { edits } : undefined;
  const base: any = {
    schema: "ccm-api-microcompact-edit-plan-v1",
    version: GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION,
    groupId: String(options.groupId || options.group_id || ""),
    targetProject: String(options.targetProject || options.target_project || ""),
    source: "claude-code-api-microcompact-compatible",
    advisoryOnly: options.advisoryOnly !== false && options.advisory_only !== false,
    canApplyNatively: options.canApplyNatively === true || options.can_apply_natively === true,
    activeTokens,
    maxInputTokens,
    targetInputTokens,
    clearAtLeastTokens,
    trigger: { type: "input_tokens", value: triggerValue },
    aboveTrigger,
    idleMinutes,
    clearAllThinking,
    clearAllThinkingThresholdMinutes,
    isRedactThinkingActive,
    signalCounts: {
      thinkingBlocks: signals.thinkingBlockCount,
      redactedThinkingBlocks: signals.redactedThinkingBlockCount,
      toolUses: signals.toolUseBlockCount,
      toolResults: signals.toolResultBlockCount,
    },
    toolNames: signals.toolNames,
    resultToolNames: signals.resultToolNames,
    clearableResultTools: GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
    clearableUseExcludeTools: GROUP_API_MICROCOMPACT_CLEARABLE_USES,
    strategies,
    contextManagement: config || null,
    editCount: edits.length,
    recommended: edits.length > 0,
    reason: edits.length
      ? "api context-management edits available for executor that supports native microcompact"
      : signals.hasThinking || signals.hasToolResults || signals.hasToolUses
        ? "signals present but edit trigger not reached"
        : "no thinking/tool context edit signals detected",
    createdAt: options.now || new Date().toISOString(),
  };
  const { createdAt: _createdAt, idleMinutes: _idleMinutes, ...planIdentity } = base;
  return {
    ...base,
    planChecksum: crypto.createHash("sha256").update(JSON.stringify(planIdentity)).digest("hex").slice(0, 24),
  };
}

export function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan: any = {}, options: any = {}) {
  const rawAgentType = String(options.agentType || options.agent_type || options.runtime || "unknown").trim().toLowerCase();
  const agentType = rawAgentType === "claude" ? "claudecode" : rawAgentType || "unknown";
  const apiRuntimes = new Set(["anthropic-api", "anthropic-sdk", "claude-api", "claude-sdk"]);
  const cliRuntimes = new Set(["claudecode", "cursor", "codex", "gemini", "qoder", "test-agent-native"]);
  const transport = String(
    options.transport
    || options.executorTransport
    || options.executor_transport
    || (apiRuntimes.has(agentType) ? "anthropic_api" : "cli")
  ).trim().toLowerCase();
  const provider = String(options.provider || options.apiProvider || options.api_provider || (transport.includes("anthropic") ? "anthropic" : "")).trim().toLowerCase();
  const betaHeaders = [
    ...(Array.isArray(options.betaHeaders || options.beta_headers) ? (options.betaHeaders || options.beta_headers) : []),
  ].map((item: any) => String(item || "").trim()).filter(Boolean);
  const providerSessionCapacity = options.providerNativeCompactSessionCapacity
    || options.provider_native_compact_session_capacity
    || null;
  const providerSessionGenerationFence = options.providerNativeCompactSessionGenerationFence
    || options.provider_native_compact_session_generation_fence
    || null;
  const providerCapacityValid = providerSessionCapacity?.schema === "ccm-provider-native-compact-session-capacity-v1"
    && String(providerSessionCapacity?.group_id || "") === String(options.groupId || options.group_id || apiEditPlan?.groupId || apiEditPlan?.group_id || "")
    && String(providerSessionCapacity?.group_session_id || "") === String(options.groupSessionId || options.group_session_id || options.sessionBinding?.group_session_id || options.session_binding?.group_session_id || "")
    && String(providerSessionCapacity?.task_agent_session_id || "") === String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionBinding?.task_agent_session_id || options.session_binding?.task_agent_session_id || "")
    && String(providerSessionCapacity?.native_session_id || "") === String(options.nativeSessionId || options.native_session_id || options.sessionBinding?.native_session_id || options.session_binding?.native_session_id || "");
  const providerClearedInputTokens = providerCapacityValid
    ? Math.max(0, Number(providerSessionCapacity.provider_cleared_input_tokens || 0))
    : 0;
  const rawActiveTokens = Math.max(0, Number(apiEditPlan?.activeTokens || apiEditPlan?.active_tokens || 0));
  const effectiveActiveTokens = providerCapacityValid && Number(providerSessionCapacity.effective_context_tokens || 0) > 0
    ? Number(providerSessionCapacity.effective_context_tokens || 0)
    : Math.max(0, rawActiveTokens - providerClearedInputTokens);
  const providerSessionCapacityGeneration = Math.max(1, Number(
    providerCapacityValid && providerSessionCapacity.generation
    || providerSessionGenerationFence?.generation
    || 1
  ));
  const planValid = apiEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1";
  const contextManagement = apiEditPlan?.contextManagement || apiEditPlan?.context_management || null;
  const planHasEdits = planValid && Array.isArray(contextManagement?.edits) && contextManagement.edits.length > 0;
  const explicitCapability = options.supportsApiContextManagement === true
    || options.supports_api_context_management === true
    || options.nativeContextManagement === true
    || options.native_context_management === true;
  const apiTransport = ["api", "anthropic_api", "anthropic-sdk", "claude_api", "provider_api"].includes(transport);
  const requestLayerAvailable = options.nativeApiRequestLayer === true
    || options.native_api_request_layer === true
    || (apiRuntimes.has(agentType) && apiTransport);
  const betaHeaderEnabled = options.contextManagementBetaHeaderEnabled === true
    || options.context_management_beta_header_enabled === true
    || betaHeaders.includes(GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA)
    || providerCapacityValid && providerSessionCapacity.sticky_beta_latched === true;
  const featureEnabled = options.enabled !== false && options.featureEnabled !== false && options.feature_enabled !== false;
  const cliAdvisoryBoundary = cliRuntimes.has(agentType) || transport === "cli" || transport === "external_cli";
  const providerSupportsContextManagement = ["anthropic", "anthropic-compatible", "claude"].includes(provider);
  const sessionBinding = options.sessionBinding || options.session_binding || null;
  const taskAgentSessionId = String(
    options.taskAgentSessionId
    || options.task_agent_session_id
    || sessionBinding?.task_agent_session_id
    || sessionBinding?.taskAgentSessionId
    || ""
  ).trim();
  const nativeSessionId = String(
    options.nativeSessionId
    || options.native_session_id
    || sessionBinding?.native_session_id
    || sessionBinding?.nativeSessionId
    || ""
  ).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || sessionBinding?.group_session_id || sessionBinding?.groupSessionId || "").trim();
  const executionId = String(options.executionId || options.execution_id || sessionBinding?.execution_id || sessionBinding?.executionId || "").trim();
  const runnerRequestId = String(options.runnerRequestId || options.runner_request_id || options.externalRunnerRequestId || options.external_runner_request_id || "").trim();
  const memoryContextSnapshotId = String(options.memoryContextSnapshotId || options.memory_context_snapshot_id || "").trim();
  const memoryContextSnapshotChecksum = String(options.memoryContextSnapshotChecksum || options.memory_context_snapshot_checksum || "").trim();
  const nativeApplyReady = planHasEdits
    && explicitCapability
    && requestLayerAvailable
    && apiTransport
    && providerSupportsContextManagement
    && betaHeaderEnabled
    && featureEnabled
    && !cliAdvisoryBoundary;
  const checks = [
    { id: "edit_plan_valid", pass: planValid, evidence: apiEditPlan?.schema || "missing" },
    { id: "context_management_edits_present", pass: planHasEdits, evidence: `edits=${contextManagement?.edits?.length || 0}` },
    { id: "executor_capability_declared", pass: explicitCapability, evidence: explicitCapability ? "supports_api_context_management" : "not_declared" },
    { id: "native_api_request_layer_available", pass: requestLayerAvailable, evidence: transport || "unknown" },
    { id: "api_transport_selected", pass: apiTransport && !cliAdvisoryBoundary, evidence: `${agentType}:${transport}` },
    { id: "provider_context_management_supported", pass: providerSupportsContextManagement, evidence: provider || "unknown" },
    { id: "context_management_beta_enabled", pass: betaHeaderEnabled, evidence: GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA },
    { id: "feature_enabled", pass: featureEnabled, evidence: featureEnabled ? "enabled" : "disabled" },
  ];
  const failedChecks = checks.filter(item => !item.pass).map(item => item.id);
  const requestPatch = nativeApplyReady ? {
    body: {
      context_management: contextManagement,
    },
    beta_headers: [GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA],
  } : null;
  const base: any = {
    schema: "ccm-api-microcompact-native-apply-plan-v1",
    version: GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION,
    groupId: String(options.groupId || options.group_id || apiEditPlan?.groupId || apiEditPlan?.group_id || ""),
    groupSessionId,
    group_session_id: groupSessionId,
    targetProject: String(options.targetProject || options.target_project || apiEditPlan?.targetProject || apiEditPlan?.target_project || ""),
    apiEditPlanChecksum: String(apiEditPlan?.planChecksum || apiEditPlan?.plan_checksum || ""),
    executor: {
      agentType,
      transport,
      provider,
      cli: cliAdvisoryBoundary,
    },
    capability: {
      supportsApiContextManagement: explicitCapability,
      nativeApiRequestLayer: requestLayerAvailable,
      contextManagementBetaHeaderEnabled: betaHeaderEnabled,
      requiredBetaHeader: GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA,
    },
    providerSessionCapacity: providerCapacityValid ? {
      schema: String(providerSessionCapacity.schema || ""),
      baselineChecksum: String(providerSessionCapacity.baseline_checksum || ""),
      sourceReceiptId: String(providerSessionCapacity.source_receipt_id || ""),
      sourceReceiptChecksum: String(providerSessionCapacity.source_receipt_checksum || ""),
      tokenBasis: String(providerSessionCapacity.token_basis || ""),
      rawActiveTokens,
      effectiveActiveTokens,
      providerClearedInputTokens,
      providerResponseInputTokens: Math.max(0, Number(providerSessionCapacity.provider_response_input_tokens || 0)),
      stickyBetaLatched: providerSessionCapacity.sticky_beta_latched === true,
      capacityFeedbackApplied: true,
      note: "context_management remains a per-request provider policy; capacity feedback does not mutate the local transcript",
    } : null,
    providerSessionCapacityGeneration,
    provider_session_capacity_generation: providerSessionCapacityGeneration,
    providerSessionGenerationFence: providerSessionGenerationFence?.schema === "ccm-provider-native-compact-session-generation-fence-v1" ? {
      schema: String(providerSessionGenerationFence.schema || ""),
      generation: providerSessionCapacityGeneration,
      lastResetId: String(providerSessionGenerationFence.last_reset_id || ""),
      lastResetAt: String(providerSessionGenerationFence.last_reset_at || ""),
      ledgerChecksum: String(providerSessionGenerationFence.ledger_checksum || ""),
      ledgerChecksumValid: providerSessionGenerationFence.ledger_checksum_valid === true,
    } : null,
    mode: nativeApplyReady ? "native_api_context_management" : "advisory_only",
    nativeApplyReady,
    advisoryOnly: !nativeApplyReady,
    requestPatch,
    requestPatchChecksum: requestPatch ? crypto.createHash("sha256").update(JSON.stringify(requestPatch)).digest("hex").slice(0, 24) : "",
    sessionBinding: sessionBinding?.schema ? sessionBinding : null,
    session_binding: sessionBinding?.schema ? sessionBinding : null,
    sessionBindingRequired: !!(taskAgentSessionId || nativeSessionId || memoryContextSnapshotId || memoryContextSnapshotChecksum),
    taskAgentSessionId,
    task_agent_session_id: taskAgentSessionId,
    nativeSessionId,
    native_session_id: nativeSessionId,
    executionId,
    execution_id: executionId,
    runnerRequestId,
    runner_request_id: runnerRequestId,
    memoryContextSnapshotId,
    memory_context_snapshot_id: memoryContextSnapshotId,
    memoryContextSnapshotChecksum,
    memory_context_snapshot_checksum: memoryContextSnapshotChecksum,
    receiptContract: {
      required_receipt_fields: ["apiMicrocompactUsage", "group_session_id", "task_agent_session_id", "native_session_id", "execution_id", "runner_request_id", "memory_context_snapshot_id", "memory_context_snapshot_checksum"],
      required_group_session_id: groupSessionId,
      required_plan_checksum: String(apiEditPlan?.planChecksum || apiEditPlan?.plan_checksum || ""),
      required_apply_plan_checksum: "",
      required_request_patch_checksum: "",
      required_task_agent_session_id: taskAgentSessionId,
      required_native_session_id: nativeSessionId,
      required_execution_id: executionId,
      required_runner_request_id: runnerRequestId,
      required_memory_context_snapshot_id: memoryContextSnapshotId,
      required_memory_context_snapshot_checksum: memoryContextSnapshotChecksum,
      receipt_should_match_session: !!(taskAgentSessionId || nativeSessionId),
      receipt_should_match_memory_context_snapshot: !!(memoryContextSnapshotId || memoryContextSnapshotChecksum),
      native_applied_requires_request_patch_checksum: nativeApplyReady,
    },
    checks,
    failedChecks,
    action: nativeApplyReady
      ? "merge_request_patch_into_provider_api_request"
      : "surface_edit_plan_as_context_pressure_advisory",
    reason: nativeApplyReady
      ? "executor exposes Anthropic API request construction with context-management beta enabled"
      : cliAdvisoryBoundary
        ? "external CLI executor does not expose provider request body; keep API microcompact advisory"
        : failedChecks.length
          ? `native apply readiness checks failed: ${failedChecks.join(",")}`
          : "native apply is not available",
    createdAt: options.now || new Date().toISOString(),
  };
  return {
    ...base,
    applyPlanChecksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
    receiptContract: {
      ...base.receiptContract,
      required_apply_plan_checksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
      required_request_patch_checksum: base.requestPatchChecksum,
    },
  };
}

export function verifyGroupApiMicrocompactNativeApplyPlan(plan: any = {}, expected: any = {}) {
  const issues: string[] = [];
  if (plan?.schema !== "ccm-api-microcompact-native-apply-plan-v1"
    || Number(plan?.version || 0) !== GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION) issues.push("schema");
  const { applyPlanChecksum: suppliedApplyPlanChecksum, ...planWithoutChecksum } = plan || {};
  const checksumBase = {
    ...planWithoutChecksum,
    receiptContract: {
      ...(planWithoutChecksum.receiptContract || {}),
      required_apply_plan_checksum: "",
      required_request_patch_checksum: "",
    },
  };
  const computedApplyPlanChecksum = crypto.createHash("sha256").update(JSON.stringify(checksumBase)).digest("hex").slice(0, 24);
  if (!suppliedApplyPlanChecksum || suppliedApplyPlanChecksum !== computedApplyPlanChecksum) issues.push("apply_plan_checksum");
  const requestPatch = plan.requestPatch || plan.request_patch || null;
  const computedRequestPatchChecksum = requestPatch
    ? crypto.createHash("sha256").update(JSON.stringify(requestPatch)).digest("hex").slice(0, 24)
    : "";
  if (String(plan.requestPatchChecksum || plan.request_patch_checksum || "") !== computedRequestPatchChecksum) issues.push("request_patch_checksum");
  if (String(plan.receiptContract?.required_apply_plan_checksum || "") !== String(suppliedApplyPlanChecksum || "")) issues.push("receipt_contract_apply_plan_checksum");
  if (String(plan.receiptContract?.required_request_patch_checksum || "") !== computedRequestPatchChecksum) issues.push("receipt_contract_request_patch_checksum");
  if (plan.nativeApplyReady === true) {
    if (plan.mode !== "native_api_context_management") issues.push("native_mode");
    if (!requestPatch?.body?.context_management) issues.push("context_management");
    if (!Array.isArray(requestPatch?.beta_headers) || !requestPatch.beta_headers.includes(GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA)) issues.push("context_management_beta");
    if (plan.executor?.cli === true || ["cli", "external_cli"].includes(String(plan.executor?.transport || ""))) issues.push("cli_native_boundary");
  } else if (requestPatch) {
    issues.push("advisory_request_patch");
  }
  const expectedBindings = [
    ["groupId", expected.groupId || expected.group_id, plan.groupId || plan.group_id],
    ["groupSessionId", expected.groupSessionId || expected.group_session_id, plan.groupSessionId || plan.group_session_id],
    ["taskAgentSessionId", expected.taskAgentSessionId || expected.task_agent_session_id, plan.taskAgentSessionId || plan.task_agent_session_id],
    ["nativeSessionId", expected.nativeSessionId || expected.native_session_id, plan.nativeSessionId || plan.native_session_id],
    ["executionId", expected.executionId || expected.execution_id, plan.executionId || plan.execution_id],
    ["runnerRequestId", expected.runnerRequestId || expected.runner_request_id, plan.runnerRequestId || plan.runner_request_id],
    ["memoryContextSnapshotId", expected.memoryContextSnapshotId || expected.memory_context_snapshot_id, plan.memoryContextSnapshotId || plan.memory_context_snapshot_id],
    ["memoryContextSnapshotChecksum", expected.memoryContextSnapshotChecksum || expected.memory_context_snapshot_checksum, plan.memoryContextSnapshotChecksum || plan.memory_context_snapshot_checksum],
  ];
  for (const [name, wanted, actual] of expectedBindings) {
    if (String(wanted || "").trim() && String(actual || "") !== String(wanted)) issues.push(`${name}_mismatch`);
  }
  return {
    valid: issues.length === 0,
    issues,
    computedApplyPlanChecksum,
    computedRequestPatchChecksum,
  };
}

function buildGroupCompactWindowInvariants(input: any = {}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const startIndex = Math.max(0, Math.min(messages.length, Number(input.startIndex || 0)));
  const keepIndex = Math.max(startIndex, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
  const compactedMessages = Array.isArray(input.messagesToCompact)
    ? input.messagesToCompact
    : messages.slice(startIndex, keepIndex);
  const keptMessages = Array.isArray(input.keptMessages)
    ? input.keptMessages
    : messages.slice(keepIndex);
  const compactedRefs = collectWindowBlockRefs(compactedMessages, startIndex);
  const keptRefs = collectWindowBlockRefs(keptMessages, keepIndex);
  const missingToolUses = [...keptRefs.toolResultIds].filter(id => !keptRefs.toolUseIds.has(id) && compactedRefs.toolUseIds.has(id));
  const splitThinkingMessageIds = [...keptRefs.thinkingMessageIds].filter(id => compactedRefs.thinkingMessageIds.has(id));
  const firstKeptTaskId = groupMessageTaskId(keptMessages[0]);
  const previousTaskId = keepIndex > startIndex ? groupMessageTaskId(messages[keepIndex - 1]) : "";
  const noSplitTaskTransactions = !firstKeptTaskId || firstKeptTaskId !== previousTaskId;
  const preservedSegment = input.preservedSegment || {};
  const preservedCount = Number(preservedSegment.preservedMessageCount || keptMessages.length || 0);
  const preservedTokens = Number(preservedSegment.preservedTokenEstimate || keptMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0));
  const minTokens = Number(preservedSegment.minTokens || input.minTokens || GROUP_COMPACT_MIN_KEEP_TOKENS);
  const minMessages = Number(preservedSegment.minTextBlockMessages || input.minMessages || GROUP_COMPACT_MIN_KEEP_MESSAGES);
  return {
    noSplitTaskTransactions,
    noSplitToolResultPairs: missingToolUses.length === 0,
    noSplitThinkingBlocks: splitThinkingMessageIds.length === 0,
    preservedRecentWindowRecorded: preservedSegment?.schema === "ccm-group-preserved-segment-v1" || keptMessages.length > 0,
    preservedTokenFloorSatisfied: preservedTokens >= Math.min(minTokens, Math.max(1, preservedTokens)),
    preservedMessageFloorSatisfied: preservedCount >= Math.min(minMessages, Math.max(1, preservedCount)),
    missingToolUseIds: missingToolUses.slice(0, 12),
    splitThinkingMessageIds: splitThinkingMessageIds.slice(0, 12),
    firstKeptTaskId,
    previousTaskId,
    compactedBlockCount: compactedRefs.rows.length,
    keptBlockCount: keptRefs.rows.length,
  };
}

export function buildGroupCompactStrategyDecision(input: any = {}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const keepIndex = Math.max(0, Math.min(messages.length, Number(input.keepIndex ?? messages.length)));
  const startIndex = Math.max(0, Math.min(keepIndex, Number(input.startIndex ?? Math.max(0, keepIndex - (Array.isArray(input.messagesToCompact) ? input.messagesToCompact.length : 0)))));
  const messagesToCompact = Array.isArray(input.messagesToCompact) ? input.messagesToCompact : messages.slice(startIndex, keepIndex);
  const keptMessages = Array.isArray(input.keptMessages) ? input.keptMessages : messages.slice(keepIndex);
  const partialCompact = input.partialCompact || null;
  const microCompact = input.microCompact || null;
  const ptlEmergency = input.ptlEmergency || null;
  const ptlRecovery = input.ptlRecovery || null;
  const compacted = input.compacted === true;
  const primaryCompact = input.primaryCompact !== false && messagesToCompact.length > 0;
  const preCompactTokenCount = Number(input.preCompactTokenCount || input.activeTokens || 0);
  const postCompactTokenEstimate = Number(input.postCompactTokenCount || input.postCompactTokenEstimate || 0);
  const triggerTokens = Number(input.triggerTokens || input.autoCompactThreshold || 0);
  const tokenPressurePercent = triggerTokens > 0
    ? Math.round((Number(input.activeTokens || preCompactTokenCount || 0) / triggerTokens) * 1000) / 10
    : null;
  const reasons: string[] = [];
  let mode = "normal_compact";
  if (!compacted) {
    mode = messagesToCompact.length <= 0 ? "recent_window_only" : "skip_below_threshold";
    reasons.push(messagesToCompact.length <= 0 ? "no eligible older messages beyond preserved window" : "below auto compact pressure threshold");
  } else if (input.sessionMemoryCompactSelection?.selected === true) {
    mode = "session_memory_reuse";
    reasons.push("verified exact-session Session Memory reused without a compaction API call");
  } else if (ptlEmergency?.engaged) {
    mode = "ptl_emergency";
    reasons.push(ptlEmergency.reason || "post compact token pressure still too high");
  } else if (ptlRecovery?.recovered) {
    mode = "ptl_recovery";
    reasons.push(ptlRecovery.reason || "previous PTL emergency recovered");
  } else if (partialCompact?.enabled && partialCompact?.sidecar === true && !primaryCompact) {
    mode = "partial_sidecar";
    reasons.push(partialCompact.reason || "manual partial sidecar keeps raw transcript unchanged");
  } else if (partialCompact?.enabled && partialCompact?.sidecar !== true) {
    mode = "partial_compact";
    reasons.push(partialCompact.reason || "manual partial compact selected a primary boundary");
  } else if (microCompact?.timeBased?.triggered || Number(microCompact?.compactedMessageCount || 0) > 0 || Number(microCompact?.tokensFreed || 0) > 0) {
    mode = "micro_compact";
    reasons.push(microCompact?.timeBased?.triggered ? "time based micro compact assisted primary summary" : "large agent output micro compact assisted primary summary");
  } else {
    reasons.push(input.force ? "manual compact requested" : input.reason || "auto compact selected session-memory style summary plus recent window");
  }
  if (input.force) reasons.push("force=true");
  if (input.preCompactWarning?.level) reasons.push(`pressure=${input.preCompactWarning.level}`);
  const preservedSegment = input.preservedSegment || (messages.length
    ? buildGroupPreservedSegment(messages, keepIndex, {
      floorIndex: startIndex,
      summaryChecksum: input.summaryChecksum || "",
      transcriptPath: input.transcriptPath || "",
      now: input.now,
    })
    : null);
  const invariants = buildGroupCompactWindowInvariants({
    messages,
    messagesToCompact,
    keptMessages,
    startIndex,
    keepIndex,
    preservedSegment,
  });
  const base: any = {
    schema: "ccm-group-compact-strategy-decision-v1",
    version: GROUP_COMPACT_STRATEGY_DECISION_VERSION,
    decisionId: String(input.decisionId || `gcsd_${crypto.createHash("sha1").update([
      input.groupId || "",
      input.now || "",
      mode,
      startIndex,
      keepIndex,
      messages.length,
      input.summaryChecksum || "",
    ].join(":")).digest("hex").slice(0, 16)}`),
    groupId: String(input.groupId || ""),
    mode,
    strategy: "cc-session-memory-v3-compatible",
    compacted,
    primaryCompact,
    reason: compactText(input.reason || reasons.filter(Boolean).join("; "), 700),
    reasons: reasons.filter(Boolean).map(item => compactText(item, 240)).slice(0, 8),
    startIndex,
    keepIndex,
    activeMessageCount: Number(input.activeMessageCount ?? Math.max(0, messages.length - startIndex)),
    messagesToSummarize: messagesToCompact.length,
    keptMessages: keptMessages.length,
    summarizedFromMessageId: messagesToCompact.length ? messageIdentity(messagesToCompact[0], startIndex) : "",
    summarizedThroughMessageId: messagesToCompact.length ? messageIdentity(messagesToCompact[messagesToCompact.length - 1], keepIndex - 1) : "",
    firstKeptMessageId: keptMessages.length ? messageIdentity(keptMessages[0], keepIndex) : "",
    lastKeptMessageId: keptMessages.length ? messageIdentity(keptMessages[keptMessages.length - 1], messages.length - 1) : "",
    preCompactTokenCount,
    postCompactTokenEstimate,
    truePostCompactPayloadBudget: input.truePostCompactPayloadBudget || input.true_post_compact_payload_budget || null,
    postCompactPayloadGate: input.postCompactPayloadGate || input.post_compact_payload_gate || null,
    activeTokensBeforeCompact: Number(input.activeTokens || preCompactTokenCount || 0),
    triggerTokens,
    tokenPressurePercent,
    reductionRatio: preCompactTokenCount > 0 && postCompactTokenEstimate > 0
      ? Math.round(Math.max(0, 1 - postCompactTokenEstimate / preCompactTokenCount) * 1000) / 1000
      : null,
    sessionMemoryAvailable: input.sessionMemoryAvailable === true || !!input.sessionMemory?.schema || !!input.memory?.sessionMemory?.schema,
    sessionMemoryCompactSelection: input.sessionMemoryCompactSelection || null,
    preservedSegment,
    microCompact: microCompact ? {
      schema: microCompact.schema || "",
      recordCount: Number(microCompact.recordCount || 0),
      compactedMessageCount: Number(microCompact.compactedMessageCount || 0),
      tokensFreed: Number(microCompact.tokensFreed || 0),
      timeBasedTriggered: microCompact.timeBased?.triggered === true,
      timeBasedClearedCount: Number(microCompact.timeBased?.clearedCount || 0),
    } : null,
    partialCompact: partialCompact ? {
      requested: partialCompact.requested === true,
      enabled: partialCompact.enabled === true,
      sidecar: partialCompact.sidecar === true,
      direction: partialCompact.direction || "",
      reason: partialCompact.reason || "",
      selectedMessageId: partialCompact.selectedMessageId || "",
      summarizedThroughMessageId: partialCompact.summarizedThroughMessageId || "",
    } : null,
    ptlEmergency: ptlEmergency ? {
      engaged: ptlEmergency.engaged === true,
      emergencyLevel: ptlEmergency.emergencyLevel || "",
      reason: ptlEmergency.reason || "",
      messageDigestMaxChars: Number(ptlEmergency.messageDigestMaxChars || 0),
    } : null,
    ptlRecovery: ptlRecovery ? {
      recovered: ptlRecovery.recovered === true,
      reason: ptlRecovery.reason || "",
      restoredMessageDigestMaxChars: Number(ptlRecovery.restoredMessageDigestMaxChars || 0),
      contextBudgetPressure: ptlRecovery.contextBudgetPressure ?? null,
    } : null,
    transcriptPath: String(input.transcriptPath || ""),
    summaryChecksum: String(input.summaryChecksum || ""),
    invariants,
    invariantPass: Object.entries(invariants)
      .filter(([, value]) => typeof value === "boolean")
      .every(([, value]) => value === true),
    createdAt: input.now || new Date().toISOString(),
  };
  return {
    ...base,
    decisionChecksum: crypto.createHash("sha256").update(JSON.stringify(base)).digest("hex").slice(0, 24),
  };
}

function resolvePartialCompactWindow(messages: any[], previousBoundaryIndex: number, options: any = {}) {
  const request = options?.partialCompact || options?.groupPartialCompact || null;
  if (!request) return null;
  const startIndex = Math.max(0, Math.min(messages.length, previousBoundaryIndex + 1));
  const direction = String(request.direction || request.mode || "up_to").toLowerCase().replace(/[-\s]+/g, "_");
  const selectedMessageId = compactText(request.messageId || request.throughMessageId || request.untilMessageId || "", 240);
  const base = {
    schema: "ccm-group-partial-compact-v1",
    version: GROUP_PARTIAL_COMPACT_VERSION,
    requested: true,
    enabled: false,
    supported: false,
    direction,
    startIndex,
    keepIndex: startIndex,
    selectedIndex: -1,
    selectedMessageId,
    sidecar: false,
    reason: compactText(request.reason || "", 500),
  };
  if (!messages.length) return { ...base, reason: base.reason || "empty_messages" };
  let selectedIndex = -1;
  if (selectedMessageId) {
    selectedIndex = messages.findIndex((message, index) => messageIdentity(message, index) === selectedMessageId);
  }
  const rawIndex = request.index ?? request.messageIndex ?? request.throughIndex ?? request.untilIndex;
  const numericIndex = Number(rawIndex);
  if (selectedIndex < 0 && Number.isFinite(numericIndex) && numericIndex >= 0 && numericIndex < messages.length) {
    selectedIndex = Math.trunc(numericIndex);
  }
  const findRangeIndex = (idKeys: string[], indexKeys: string[], fallback = -1) => {
    for (const key of idKeys) {
      const id = compactText(request[key], 240);
      if (!id) continue;
      const found = messages.findIndex((message, index) => messageIdentity(message, index) === id);
      if (found >= 0) return found;
    }
    for (const key of indexKeys) {
      const value = Number(request[key]);
      if (Number.isFinite(value) && value >= 0 && value < messages.length) return Math.trunc(value);
    }
    return fallback;
  };
  if (direction === "range" || direction === "from") {
    const rangeStart = findRangeIndex(["fromMessageId", "startMessageId", "messageId"], ["fromIndex", "startIndex", "index", "messageIndex"], selectedIndex);
    const rangeEnd = direction === "from"
      ? findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex"], messages.length - 1)
      : findRangeIndex(["throughMessageId", "untilMessageId", "toMessageId", "endMessageId", "messageId"], ["throughIndex", "untilIndex", "toIndex", "endIndex", "index", "messageIndex"], selectedIndex);
    if (rangeStart < 0 || rangeEnd < 0) return { ...base, reason: base.reason || "selected_message_not_found" };
    if (rangeEnd < rangeStart) {
      return {
        ...base,
        supported: true,
        selectedIndex: rangeStart,
        selectedMessageId: messageIdentity(messages[rangeStart], rangeStart),
        sidecar: true,
        reason: base.reason || "invalid_range_end_before_start",
      };
    }
    return {
      ...base,
      enabled: true,
      supported: true,
      sidecar: true,
      primaryWindow: false,
      direction,
      selectedIndex: rangeStart,
      selectedMessageId: messageIdentity(messages[rangeStart], rangeStart),
      rangeStartIndex: rangeStart,
      rangeEndIndex: rangeEnd,
      summarizedFromMessageId: messageIdentity(messages[rangeStart], rangeStart),
      summarizedThroughMessageId: messageIdentity(messages[rangeEnd], rangeEnd),
      summarizedMessageCount: rangeEnd - rangeStart + 1,
      keepIndex: startIndex,
      rawTranscriptUnmodified: true,
      reason: base.reason || `manual_partial_compact_${direction}_sidecar`,
    };
  }
  if (selectedIndex < 0) return { ...base, reason: base.reason || "selected_message_not_found" };
  const actualSelectedId = messageIdentity(messages[selectedIndex], selectedIndex);
  if (direction !== "up_to") {
    return {
      ...base,
      selectedIndex,
      selectedMessageId: actualSelectedId,
      reason: base.reason || `unsupported_direction_${direction}`,
    };
  }
  if (selectedIndex < startIndex) {
    return {
      ...base,
      selectedIndex,
      selectedMessageId: actualSelectedId,
      reason: base.reason || "selected_message_before_current_boundary",
    };
  }
  const keepIndex = selectedIndex + 1;
  return {
    ...base,
    enabled: true,
    supported: true,
    direction: "up_to",
    keepIndex,
    selectedIndex,
    selectedMessageId: actualSelectedId,
    summarizedFromMessageId: messages[startIndex] ? messageIdentity(messages[startIndex], startIndex) : "",
    summarizedThroughMessageId: actualSelectedId,
    preservedLaterMessageCount: Math.max(0, messages.length - keepIndex),
    reason: base.reason || "manual_partial_compact_up_to",
  };
}

function buildGroupPtlEmergencyPlan(input: any) {
  const config = input.config || {};
  const explicitlyEnabled = config.ptlEmergency === true
    || config.groupPtlEmergency === true
    || config.memoryPtlEmergency === true;
  const triggerTokens = Number(input.triggerTokens || 0);
  const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
  const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
  const pressure = Number(input.contextBudget?.pressure || 0);
  const shouldEngage = explicitlyEnabled || postRatio >= 0.95 || pressure >= 100;
  if (!shouldEngage) return null;
  const emergencyLevel = explicitlyEnabled
    ? "forced"
    : postRatio >= 1 || pressure >= 100
      ? "critical"
      : "high";
  const messageDigestMaxChars = emergencyLevel === "critical" ? 6000 : emergencyLevel === "high" ? 8000 : 7000;
  const compactedIds = (input.messagesToCompact || []).map((message: any, index: number) =>
    messageIdentity(message, Number(input.startIndex || 0) + index)
  );
  const condensedMessageIds = compactedIds.length > 50
    ? [...compactedIds.slice(0, 24), ...compactedIds.slice(-24)]
    : compactedIds;
  const reason = explicitlyEnabled
    ? "forced_by_config"
    : pressure >= 100
      ? "context_budget_pressure_exhausted"
      : "post_compact_tokens_near_trigger";
  return {
    schema: "ccm-group-ptl-emergency-v1",
    version: GROUP_PTL_EMERGENCY_VERSION,
    engaged: true,
    emergencyLevel,
    reason,
    activeTokensBeforeCompact: Number(input.activeTokens || 0),
    triggerTokens,
    preCompactTokenCount: Number(input.preCompactTokenCount || 0),
    postCompactTokenCount,
    postCompactRatio: Math.round(postRatio * 1000) / 1000,
    contextBudgetPressure: pressure,
    summaryRenderMaxChars: messageDigestMaxChars,
    messageDigestMaxChars,
    rawTranscriptPath: input.transcriptPath,
    rawTranscriptUnmodified: true,
    compactedRange: {
      fromMessageId: input.messagesToCompact?.length
        ? messageIdentity(input.messagesToCompact[0], Number(input.startIndex || 0))
        : "",
      throughMessageId: input.messagesToCompact?.length
        ? messageIdentity(input.messagesToCompact[input.messagesToCompact.length - 1], Number(input.keepIndex || 1) - 1)
        : "",
      messageCount: input.messagesToCompact?.length || 0,
    },
    condensedMessageIds,
    omittedCondensedMessageIds: Math.max(0, compactedIds.length - condensedMessageIds.length),
    preservedRecentMessageIds: (input.keptMessages || []).slice(-40).map((message: any, index: number) =>
      messageIdentity(message, Number(input.keepIndex || 0) + Math.max(0, (input.keptMessages || []).length - 40) + index)
    ),
    safeguards: [
      "raw_transcript_retained",
      "deterministic_summary_fallback",
      "quality_gate_checked",
      "fact_anchor_recovery",
      "typed_memory_recall_available",
    ],
    createdAt: input.now || new Date().toISOString(),
  };
}

export function buildGroupPtlRecoveryPlan(input: any = {}) {
  const previous = input.previousPtlEmergency || input.previous_ptl_emergency || null;
  if (!previous?.engaged) return null;
  if (input.currentPtlEmergency?.engaged) return null;
  const config = input.config || {};
  const pressure = Number(input.contextBudget?.pressure || 0);
  const triggerTokens = Number(input.triggerTokens || previous.triggerTokens || 0);
  const postCompactTokenCount = Number(input.postCompactTokenCount || 0);
  const postRatio = triggerTokens > 0 ? postCompactTokenCount / triggerTokens : 0;
  const pressureThreshold = Math.max(20, Math.min(95, Number(config.ptlRecoveryPressure || config.ptl_recovery_pressure || 72)));
  const ratioThreshold = Math.max(0.2, Math.min(0.95, Number(config.ptlRecoveryRatio || config.ptl_recovery_ratio || 0.82)));
  const explicitlyForced = config.ptlRecover === true || config.ptlRecovery === true || config.groupPtlRecovery === true;
  const safe = explicitlyForced || (pressure <= pressureThreshold && postRatio <= ratioThreshold && input.contextBudget?.compact_recommended !== true);
  if (!safe) return null;
  return {
    schema: "ccm-group-ptl-recovery-v1",
    version: GROUP_PTL_RECOVERY_VERSION,
    recovered: true,
    reason: explicitlyForced ? "forced_by_config" : "context_pressure_back_in_safe_band",
    previousEmergencyLevel: previous.emergencyLevel || "",
    previousEmergencyReason: previous.reason || "",
    previousMessageDigestMaxChars: Number(previous.messageDigestMaxChars || previous.summaryRenderMaxChars || 0),
    restoredMessageDigestMaxChars: Number(input.restoredMessageDigestMaxChars || 14_000),
    triggerTokens,
    postCompactTokenCount,
    postCompactRatio: Math.round(postRatio * 1000) / 1000,
    contextBudgetPressure: pressure,
    pressureThreshold,
    ratioThreshold,
    summaryChecksum: input.summaryChecksum || "",
    rawTranscriptPath: input.transcriptPath || previous.rawTranscriptPath || "",
    rawTranscriptUnmodified: true,
    recoveredAt: input.now || new Date().toISOString(),
  };
}

export function getGroupAutoCompactThreshold(config: any = {}) {
  const capacity = resolveGroupModelContextCapacity(config);
  const configuredThreshold = Number(
    config?.modelAutoCompactTokenLimit
      || config?.model_auto_compact_token_limit
      || config?.memoryAutoCompactTokenLimit
      || config?.memory_auto_compact_token_limit
      || 0
  );
  if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
    return Math.max(18_000, Math.min(Math.floor(configuredThreshold), capacity.effectiveContextWindow - GROUP_MANUAL_COMPACT_BUFFER_TOKENS));
  }
  return Math.max(18_000, capacity.effectiveContextWindow - GROUP_AUTOCOMPACT_BUFFER_TOKENS);
}

export function resolveGroupModelContextCapacity(config: any = {}) {
  const capabilities = config?.modelCapabilities || config?.model_capabilities || {};
  const providerCapability = Number(capabilities?.max_input_tokens || capabilities?.context_window || 0) > 0
    ? {
        source: "explicit_provider_capability",
        contextWindow: Number(capabilities.max_input_tokens || capabilities.context_window),
        maxOutputTokens: Number(capabilities.max_output_tokens || GROUP_CONTEXT_RESERVED_TOKENS),
        verified: capabilities.verified === true,
        checkedAt: capabilities.checked_at || capabilities.checkedAt,
        expiresAt: capabilities.expires_at || capabilities.expiresAt,
        evidenceId: capabilities.evidence_id || capabilities.evidenceId,
      }
    : null;
  const capacity = resolveTrustedModelContextCapacity({
    provider: config?.provider || config?.agentProvider || config?.format || "group-main-agent",
    model: config?.model || "",
    modelContextWindow: config?.modelContextWindow
      || config?.model_context_window
      || config?.memoryContextWindowTokens
      || config?.contextWindowTokens
      || process.env.CCM_GROUP_CONTEXT_WINDOW_TOKENS,
    modelMaxOutputTokens: config?.modelMaxOutputTokens
      || config?.model_max_output_tokens
      || config?.maxOutputTokens,
    capacityCheckedAt: config?.modelCapacityCheckedAt || config?.model_capacity_checked_at,
    providerCapability,
    nativeExecutorReceipt: config?.nativeModelCapabilityReceipt || config?.native_model_capability_receipt,
  });
  const legacyReserve = Number(config?.memoryReservedTokens || config?.memory_reserved_tokens || 0);
  if (!(legacyReserve > 0)) return capacity;
  const reservedOutputTokens = Math.min(capacity.contextWindow - 16_000, Math.max(0, legacyReserve));
  const effectiveContextWindow = Math.max(18_000, capacity.contextWindow - reservedOutputTokens);
  return {
    ...capacity,
    reservedOutputTokens,
    effectiveContextWindow,
    autoCompactBufferTokens: GROUP_AUTOCOMPACT_BUFFER_TOKENS,
    autoCompactThreshold: Math.max(18_000, effectiveContextWindow - GROUP_AUTOCOMPACT_BUFFER_TOKENS),
    reserveSource: "legacy_user_setting",
  };
}

export function getGroupEffectiveContextWindow(config: any = {}) {
  return resolveGroupModelContextCapacity(config).effectiveContextWindow;
}

export function calculateGroupCompactWarningState(input: any = {}) {
  const config = input.config || {};
  const tokenUsage = Math.max(0, Number(input.activeTokens ?? input.tokenUsage ?? input.token_usage ?? 0));
  const effectiveContextWindow = Number(input.effectiveContextWindow || input.effective_context_window || getGroupEffectiveContextWindow(config));
  const autoCompactThreshold = Math.max(1, Number(input.autoCompactThreshold || input.auto_compact_threshold || getGroupAutoCompactThreshold(config)));
  const warningBufferTokens = Number(config.groupWarningBufferTokens || config.warningBufferTokens || GROUP_WARNING_BUFFER_TOKENS);
  const errorBufferTokens = Number(config.groupErrorBufferTokens || config.errorBufferTokens || GROUP_ERROR_BUFFER_TOKENS);
  const manualCompactBufferTokens = Number(config.groupManualCompactBufferTokens || config.manualCompactBufferTokens || GROUP_MANUAL_COMPACT_BUFFER_TOKENS);
  const warningThreshold = Math.max(0, autoCompactThreshold - warningBufferTokens);
  const errorThreshold = Math.max(0, autoCompactThreshold - errorBufferTokens);
  const blockingOverride = Number(config.groupBlockingLimitTokens || config.blockingLimitTokens || process.env.CCM_GROUP_BLOCKING_LIMIT_TOKENS || 0);
  const blockingThreshold = blockingOverride > 0
    ? blockingOverride
    : Math.max(0, effectiveContextWindow - manualCompactBufferTokens);
  const percentLeft = Math.max(0, Math.round(((autoCompactThreshold - tokenUsage) / autoCompactThreshold) * 100));
  const isAboveWarningThreshold = tokenUsage >= warningThreshold;
  const isAboveErrorThreshold = tokenUsage >= errorThreshold;
  const isAboveAutoCompactThreshold = tokenUsage >= autoCompactThreshold;
  const isAtBlockingLimit = tokenUsage >= blockingThreshold;
  const suppressed = input.suppressed === true || input.suppress === true;
  const level = suppressed
    ? "suppressed"
    : isAtBlockingLimit
      ? "blocking"
      : isAboveAutoCompactThreshold
        ? "auto_compact"
        : isAboveErrorThreshold
          ? "error"
          : isAboveWarningThreshold
            ? "warning"
            : "ok";
  const recommendation = suppressed
    ? "suppress_warning_until_next_pressure_sample"
    : isAtBlockingLimit
      ? "block_new_context_until_compacted_or_ptl_recovered"
      : isAboveAutoCompactThreshold
        ? "auto_compact_now"
        : isAboveWarningThreshold
          ? "compact_soon_or_reduce_raw_context"
          : "continue";
  return {
    schema: "ccm-group-compact-warning-v1",
    version: 1,
    tokenUsage,
    activeMessageCount: Number(input.activeMessageCount || input.active_message_count || 0),
    percentLeft,
    level,
    recommendation,
    suppressed,
    suppressReason: suppressed ? compactText(input.suppressReason || input.suppress_reason || "post_compaction_warning_suppression", 240) : "",
    thresholds: {
      effectiveContextWindow,
      autoCompactThreshold,
      warningThreshold,
      errorThreshold,
      blockingThreshold,
      autoCompactBufferTokens: GROUP_AUTOCOMPACT_BUFFER_TOKENS,
      warningBufferTokens,
      errorBufferTokens,
      manualCompactBufferTokens,
    },
    flags: {
      isAboveWarningThreshold,
      isAboveErrorThreshold,
      isAboveAutoCompactThreshold,
      isAtBlockingLimit,
    },
    createdAt: input.now || new Date().toISOString(),
  };
}

function createEmptyConversationSummary(): ConversationSummary {
  return {
    primaryRequest: "",
    userMessages: [],
    keyConcepts: [],
    filesAndCode: [],
    errorsAndFixes: [],
    decisions: [],
    completedWork: [],
    pendingTasks: [],
    currentWork: "",
    nextStep: "",
    participantState: [],
    taskStates: [],
  };
}

function extractFiles(message: any) {
  const content = messageContent(message);
  const explicit = [
    ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
    ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
    ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
      ? message.delivery_summary.actual_file_changes.map((item: any) => item?.path || item?.file || item)
      : []),
  ];
  const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
  return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}

function extractRuntimeSkillFacts(message: any) {
  const facts: string[] = [];
  const actor = message?.agent || message?.role || "Agent";
  const add = (item: any) => {
    const name = typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name;
    const hash = typeof item === "object" && item?.contentHash ? `#${item.contentHash}` : "";
    if (name) facts.push(`${actor} 使用 Skill:${name}${hash}`);
  };
  for (const item of Array.isArray(message?.invokedSkills) ? message.invokedSkills : []) add(item);
  for (const item of Array.isArray(message?.receipt?.invokedSkills) ? message.receipt.invokedSkills : []) add(item);
  for (const item of Array.isArray(message?.delivery_summary?.runtime_tooling?.invoked_skills) ? message.delivery_summary.runtime_tooling.invoked_skills : []) add(item);
  for (const item of Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : []) if (/Skill\s*[:：]/i.test(String(item || ""))) add(item);
  return Array.from(new Set(facts)).slice(0, 12);
}

function extractVerificationFacts(message: any) {
  return uniqueStrings([
    ...stringArray(message?.verification, 12),
    ...stringArray(message?.tests, 12),
    ...stringArray(message?.receipt?.verification, 12),
    ...stringArray(message?.receipt?.tests, 12),
    ...stringArray(message?.delivery_summary?.verification_executed, 12),
    ...stringArray(message?.delivery_summary?.verification_failed, 12),
    ...stringArray(message?.delivery_summary?.verification_suggested, 12),
    ...stringArray(message?.delivery_summary?.verification_required_missing, 12),
  ], 16);
}

function extractMessageStatus(message: any) {
  return String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").trim();
}

function messageTimestampMs(message: any) {
  const raw = message?.timestamp || message?.time || message?.created_at || message?.updated_at || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isGroupMicroCompactableMessage(message: any, includeUser = false) {
  if (!message) return false;
  if (!includeUser && message.role === "user") return false;
  if (messageContent(message)) return true;
  const artifacts = extractPostCompactArtifacts(message);
  return !!(artifacts.files.length || artifacts.skills.length || artifacts.verification.length || artifacts.blockers.length);
}

function resolveGroupTimeBasedMicroCompact(messages: any[], options: any = {}, includeUser = false) {
  const raw = options.timeBased || options.time_based || options.timeBasedMicroCompact || options.time_based_micro_compact || {};
  const enabled = raw.enabled === true || options.timeBased === true || options.time_based === true || options.timeBasedMicroCompact === true;
  const thresholdMinutes = Math.max(1, Number(raw.gapThresholdMinutes || raw.gap_threshold_minutes || options.gapThresholdMinutes || options.gap_threshold_minutes || 60));
  const keepRecent = Math.max(1, Number(raw.keepRecent || raw.keep_recent || options.keepRecent || options.keep_recent || 5));
  const nowMs = Date.parse(String(raw.now || options.now || "")) || Date.now();
  const compactable = (messages || [])
    .map((message, index) => ({ message, index }))
    .filter(item => isGroupMicroCompactableMessage(item.message, includeUser));
  const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || message?.agent);
  const lastAssistantMs = messageTimestampMs(lastAssistant);
  const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
  const force = raw.force === true || options.forceTimeBased === true || options.force_time_based === true;
  const triggered = enabled && compactable.length > keepRecent && (force || (!!lastAssistantMs && gapMinutes >= thresholdMinutes));
  const keepSet = new Set(compactable.slice(-keepRecent).map(item => item.index));
  const clearSet = new Set(triggered ? compactable.filter(item => !keepSet.has(item.index)).map(item => item.index) : []);
  return {
    schema: "ccm-group-time-based-micro-compact-v1",
    version: GROUP_TIME_BASED_MICRO_COMPACT_VERSION,
    enabled,
    triggered,
    force,
    gapMinutes,
    gapThresholdMinutes: thresholdMinutes,
    keepRecent,
    compactableCount: compactable.length,
    clearedCount: clearSet.size,
    keptCount: Math.min(keepRecent, compactable.length),
    lastAssistantAt: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
    now: new Date(nowMs).toISOString(),
    clearSet,
    keepSet,
    reason: !enabled
      ? "disabled"
      : compactable.length <= keepRecent
        ? "not_enough_compactable_messages"
        : triggered
          ? force
            ? "forced"
            : "assistant_gap_exceeded_threshold"
          : "gap_under_threshold",
  };
}

function extractPostCompactArtifacts(message: any) {
  const delivery = message?.delivery_summary || {};
  const receipt = message?.receipt || {};
  const files = uniqueStrings([
    ...extractFiles(message),
    ...stringArray(receipt.filesChanged || receipt.files_changed || receipt.files, 16),
    ...stringArray(delivery.actual_file_changes, 16),
    ...stringArray(delivery.filesChanged || delivery.files_changed || delivery.files, 16),
  ], 18);
  const skills = uniqueStrings(extractRuntimeSkillFacts(message).map(item => item.replace(/^.*?Skill:/i, "")), 10);
  const verification = extractVerificationFacts(message);
  const blockers = uniqueStrings([
    ...stringArray(message?.blockers, 8),
    ...stringArray(message?.needs, 8),
    ...stringArray(receipt.blockers, 8),
    ...stringArray(receipt.needs, 8),
    ...stringArray(delivery.blockers, 8),
    ...stringArray(delivery.needs, 8),
  ], 12);
  return { files, skills, verification, blockers };
}

function postCompactTaskStatusReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizePostCompactTaskStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["in_progress", "executing", "spawning", "ready", "prompt_accepted", "open", "active"].includes(status)) return "running";
  if (["done", "success", "succeeded"].includes(status)) return "completed";
  if (["error"].includes(status)) return "failed";
  return status;
}

function postCompactTaskUpdatedAtMs(task: any) {
  const raw = task?.updated_at || task?.updatedAt || task?.completed_at || task?.completedAt || task?.created_at || task?.createdAt || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function postCompactTaskWasRetrieved(task: any) {
  return task?.retrieved === true
    || task?.result_retrieved === true
    || task?.resultRetrieved === true
    || task?.receipt_retrieved === true
    || task?.receiptRetrieved === true
    || !!String(task?.retrieved_at || task?.retrievedAt || "").trim();
}

export function verifyGroupPostCompactTaskStatusProjectionReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-task-status-projection-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_TASK_STATUS_PROJECTION_VERSION) issues.push("post_compact_task_status_schema_invalid");
  if (!String(receipt?.group_id || "").trim()) issues.push("post_compact_task_status_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_task_status_exact_session_missing");
  if (receipt?.raw_tasks_preserved !== true) issues.push("post_compact_task_status_raw_preservation_missing");
  if (receipt?.projection_only !== true) issues.push("post_compact_task_status_projection_scope_invalid");
  if (Number(receipt?.included_task_count || 0) > Number(receipt?.matched_task_count || 0)) issues.push("post_compact_task_status_count_invalid");
  if (Number(receipt?.running_task_count || 0)
    + Number(receipt?.completed_unretrieved_count || 0)
    + Number(receipt?.blocked_task_count || 0) > Number(receipt?.included_task_count || 0)) issues.push("post_compact_task_status_breakdown_invalid");
  if (!String(receipt?.projection_checksum || "").trim()) issues.push("post_compact_task_status_projection_checksum_missing");
  if (String(receipt?.receipt_checksum || "") !== postCompactTaskStatusReceiptChecksum(receipt)) issues.push("post_compact_task_status_receipt_checksum_invalid");
  if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || "")) issues.push("post_compact_task_status_group_mismatch");
  if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || "")) issues.push("post_compact_task_status_session_mismatch");
  if (expected.projectionChecksum !== undefined && String(receipt?.projection_checksum || "") !== String(expected.projectionChecksum || "")) issues.push("post_compact_task_status_projection_checksum_mismatch");
  return { valid: issues.length === 0, issues };
}

export function buildGroupPostCompactTaskStatusProjection(tasks: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_post_compact_task_status_projection");
  const currentTaskId = String(options.currentTaskId || options.current_task_id || "").trim();
  const budget = Math.max(1, Math.min(40, Number(options.taskStatusBudget || options.task_status_budget || GROUP_POST_COMPACT_TASK_STATUS_BUDGET)));
  const completedMaxAgeMs = Math.max(0, Number(options.completedMaxAgeMs || options.completed_max_age_ms || 24 * 60 * 60 * 1000));
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const counts = {
    source: Array.isArray(tasks) ? tasks.length : 0,
    matched: 0,
    excludedScope: 0,
    excludedPending: 0,
    excludedRetrieved: 0,
    excludedSelf: 0,
    excludedNonChild: 0,
    excludedStaleCompleted: 0,
  };
  const rows: any[] = [];
  for (const task of Array.isArray(tasks) ? tasks : []) {
    const taskGroupId = String(task?.group_id || task?.groupId || "").trim();
    const taskGroupSessionId = String(task?.group_session_id || task?.groupSessionId || "").trim();
    if (taskGroupId !== groupId || taskGroupSessionId !== groupSessionId) {
      counts.excludedScope += 1;
      continue;
    }
    counts.matched += 1;
    const taskId = String(task?.id || task?.task_id || task?.taskId || "").trim();
    if (currentTaskId && taskId === currentTaskId) {
      counts.excludedSelf += 1;
      continue;
    }
    const targetProject = String(task?.target_project || task?.targetProject || task?.project || task?.agent || "").trim();
    if (!targetProject) {
      counts.excludedNonChild += 1;
      continue;
    }
    const status = normalizePostCompactTaskStatus(task?.status || task?.execution_state || task?.executionState);
    if (!status || ["pending", "queued"].includes(status)) {
      counts.excludedPending += 1;
      continue;
    }
    if (postCompactTaskWasRetrieved(task)) {
      counts.excludedRetrieved += 1;
      continue;
    }
    const updatedAtMs = postCompactTaskUpdatedAtMs(task);
    if (["completed", "failed", "cancelled"].includes(status)
      && completedMaxAgeMs > 0
      && updatedAtMs > 0
      && nowMs - updatedAtMs > completedMaxAgeMs) {
      counts.excludedStaleCompleted += 1;
      continue;
    }
    const description = compactText(task?.description || task?.title || task?.task || "", 360);
    const deltaSummary = compactText(
      task?.progress?.summary
        || task?.progress_summary
        || task?.progressSummary
        || task?.delivery_summary?.headline
        || task?.deliverySummary?.headline
        || task?.receipt?.summary
        || task?.error
        || task?.last_error
        || "",
      360
    );
    const outputReference = compactText(
      task?.output_file_path
        || task?.outputFilePath
        || task?.result_file
        || task?.resultFile
        || task?.execution?.output_file_path
        || task?.execution?.outputFilePath
        || "",
      260
    );
    rows.push({
      task_id: taskId || `task-${rows.length + 1}`,
      target_project: targetProject,
      status,
      description,
      delta_summary: deltaSummary,
      output_reference: outputReference,
      task_agent_session_id: String(task?.task_agent_session_id || task?.taskAgentSessionId || ""),
      native_session_id: String(task?.native_session_id || task?.nativeSessionId || ""),
      updated_at: String(task?.updated_at || task?.updatedAt || task?.completed_at || task?.completedAt || ""),
      updated_at_ms: updatedAtMs,
    });
  }
  const selected = rows
    .sort((a, b) => Number(b.updated_at_ms || 0) - Number(a.updated_at_ms || 0) || String(a.task_id).localeCompare(String(b.task_id)))
    .slice(0, budget)
    .map((row: any) => {
      const value = [
        `task_id=${row.task_id}`,
        `project=${row.target_project}`,
        `status=${row.status}`,
        row.description ? `description=${row.description}` : "",
        row.delta_summary ? `progress=${row.delta_summary}` : "",
        row.output_reference ? `output=${row.output_reference}` : "",
      ].filter(Boolean).join("; ");
      const { updated_at_ms, ...safeRow } = row;
      return { ...safeRow, kind: "task_status", value };
    });
  const projectionChecksum = crypto.createHash("sha256").update(JSON.stringify(selected)).digest("hex");
  const payload: any = {
    schema: "ccm-group-post-compact-task-status-projection-v1",
    version: GROUP_POST_COMPACT_TASK_STATUS_PROJECTION_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    projection_only: true,
    raw_tasks_preserved: true,
    source_task_count: counts.source,
    matched_task_count: counts.matched,
    included_task_count: selected.length,
    running_task_count: selected.filter((row: any) => row.status === "running").length,
    completed_unretrieved_count: selected.filter((row: any) => row.status === "completed").length,
    blocked_task_count: selected.filter((row: any) => ["blocked", "failed", "needs_info", "partial"].includes(row.status)).length,
    excluded_scope_count: counts.excludedScope,
    excluded_pending_count: counts.excludedPending,
    excluded_retrieved_count: counts.excludedRetrieved,
    excluded_self_count: counts.excludedSelf,
    excluded_non_child_count: counts.excludedNonChild,
    excluded_stale_completed_count: counts.excludedStaleCompleted,
    budget,
    task_ids: selected.map((row: any) => row.task_id),
    projection_checksum: projectionChecksum,
    created_at: new Date(nowMs).toISOString(),
  };
  const receipt = { ...payload, receipt_checksum: postCompactTaskStatusReceiptChecksum(payload) };
  return { tasks: selected, receipt };
}

function normalizePostCompactReadPath(value: any) {
  const clean = String(value || "").trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  const normalized = path.posix.normalize(clean.replace(/\\/g, "/"));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function postCompactMessageBlocks(message: any) {
  const content = message?.content ?? message?.message?.content;
  return Array.isArray(content) ? content : [];
}

function collectPreservedReadPaths(messages: any[] = []) {
  const unchangedStubToolIds = new Set<string>();
  for (const message of Array.isArray(messages) ? messages : []) {
    for (const block of postCompactMessageBlocks(message)) {
      const type = String(block?.type || "").toLowerCase();
      if (type !== "tool_result" && type !== "web_search_tool_result") continue;
      const resultText = renderMessageContentValue(block?.content ?? block?.output ?? block?.result ?? block?.text).trim();
      if (!resultText.startsWith(GROUP_FILE_UNCHANGED_STUB_PREFIX)) continue;
      const toolUseId = String(block?.tool_use_id || block?.toolUseId || block?.id || "").trim();
      if (toolUseId) unchangedStubToolIds.add(toolUseId);
    }
  }
  const paths = new Set<string>();
  let readToolUseCount = 0;
  for (const message of Array.isArray(messages) ? messages : []) {
    for (const block of postCompactMessageBlocks(message)) {
      const type = String(block?.type || "").toLowerCase();
      const name = String(block?.name || block?.tool || block?.tool_name || "").trim().toLowerCase();
      if (!["tool_use", "server_tool_use"].includes(type) || !["read", "fileread", "file_read"].includes(name)) continue;
      readToolUseCount += 1;
      const toolUseId = String(block?.id || block?.tool_use_id || block?.toolUseId || "").trim();
      if (toolUseId && unchangedStubToolIds.has(toolUseId)) continue;
      const input = block?.input && typeof block.input === "object" ? block.input : {};
      const filePath = normalizePostCompactReadPath(input.file_path || input.filePath || input.path || "");
      if (filePath) paths.add(filePath);
    }
  }
  return { paths, readToolUseCount, unchangedStubToolIds };
}

function postCompactFileRestoreDedupReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function verifyGroupPostCompactFileRestoreDedupReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-file-restore-dedup-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_FILE_RESTORE_DEDUP_VERSION) issues.push("post_compact_file_restore_dedup_schema_invalid");
  if (!String(receipt?.group_id || "").trim()) issues.push("post_compact_file_restore_dedup_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_file_restore_dedup_exact_session_missing");
  if (receipt?.raw_transcript_preserved !== true) issues.push("post_compact_file_restore_dedup_raw_preservation_missing");
  if (receipt?.projection_only !== true) issues.push("post_compact_file_restore_dedup_projection_scope_invalid");
  if (Number(receipt?.deduped_file_candidate_count || 0) + Number(receipt?.eligible_file_candidate_count || 0) !== Number(receipt?.source_file_candidate_count || 0)) issues.push("post_compact_file_restore_dedup_candidate_count_invalid");
  if (Number(receipt?.restored_file_candidate_count || 0) > Number(receipt?.eligible_file_candidate_count || 0)) issues.push("post_compact_file_restore_dedup_budget_count_invalid");
  if (!String(receipt?.projection_checksum || "").trim()) issues.push("post_compact_file_restore_dedup_projection_checksum_missing");
  if (String(receipt?.receipt_checksum || "") !== postCompactFileRestoreDedupReceiptChecksum(receipt)) issues.push("post_compact_file_restore_dedup_receipt_checksum_invalid");
  if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || "")) issues.push("post_compact_file_restore_dedup_group_mismatch");
  if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || "")) issues.push("post_compact_file_restore_dedup_session_mismatch");
  if (expected.projectionChecksum !== undefined && String(receipt?.projection_checksum || "") !== String(expected.projectionChecksum || "")) issues.push("post_compact_file_restore_dedup_projection_checksum_mismatch");
  return { valid: issues.length === 0, issues };
}

export function buildGroupPostCompactFileRestoreDedupProjection(fileCandidates: any[] = [], preservedMessages: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_post_compact_file_restore_dedup");
  const fileBudget = Math.max(1, Number(options.fileBudget || options.file_budget || GROUP_POST_COMPACT_FILE_BUDGET));
  const preserved = collectPreservedReadPaths(preservedMessages);
  const deduped: any[] = [];
  const eligible: any[] = [];
  for (const row of Array.isArray(fileCandidates) ? fileCandidates : []) {
    const key = normalizePostCompactReadPath(row?.value || row);
    if (key && preserved.paths.has(key)) deduped.push(row);
    else eligible.push(row);
  }
  const restored = eligible.slice(-fileBudget);
  const projectionChecksum = crypto.createHash("sha256").update(JSON.stringify(restored.map((row: any) => [
    normalizePostCompactReadPath(row?.value || row),
    String(row?.sourceMessageId || row?.source_message_id || ""),
  ]))).digest("hex");
  const payload: any = {
    schema: "ccm-group-post-compact-file-restore-dedup-v1",
    version: GROUP_POST_COMPACT_FILE_RESTORE_DEDUP_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    projection_only: true,
    raw_transcript_preserved: true,
    source_file_candidate_count: Array.isArray(fileCandidates) ? fileCandidates.length : 0,
    preserved_message_count: Array.isArray(preservedMessages) ? preservedMessages.length : 0,
    preserved_read_tool_use_count: preserved.readToolUseCount,
    preserved_full_read_path_count: preserved.paths.size,
    unchanged_stub_exemption_count: preserved.unchangedStubToolIds.size,
    deduped_file_candidate_count: deduped.length,
    eligible_file_candidate_count: eligible.length,
    restored_file_candidate_count: restored.length,
    file_budget: fileBudget,
    deduped_path_hashes: deduped.map((row: any) => crypto.createHash("sha256").update(normalizePostCompactReadPath(row?.value || row)).digest("hex").slice(0, 16)).slice(0, 12),
    projection_checksum: projectionChecksum,
    created_at: String(options.now || new Date().toISOString()),
  };
  const receipt = { ...payload, receipt_checksum: postCompactFileRestoreDedupReceiptChecksum(payload) };
  return { files: restored, receipt };
}

function invokedSkillAttachmentReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function invokedSkillNameAndHash(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    const clean = value.trim().replace(/^Skill\s*[:：]\s*/i, "");
    if (!clean) return null;
    const match = clean.match(/^(.+?)#([a-f0-9]{6,128})$/i);
    return { name: String(match?.[1] || clean).trim(), contentHash: String(match?.[2] || "").trim() };
  }
  const name = String(value.name || value.skill || value.skillName || value.skill_name || "").trim().replace(/^Skill\s*[:：]\s*/i, "");
  if (!name) return null;
  return {
    name,
    contentHash: String(value.contentHash || value.content_hash || value.hash || value.checksum || "").trim(),
    invokedAt: String(value.invokedAt || value.invoked_at || value.timestamp || value.time || value.at || "").trim(),
  };
}

function collectExactSessionInvokedSkills(messages: any[] = []) {
  const rows: any[] = [];
  const add = (value: any, message: any, index: number, source: string, fallbackAt = "") => {
    const normalized = invokedSkillNameAndHash(value);
    if (!normalized?.name) return;
    const invokedAt = normalized.invokedAt || fallbackAt || String(message?.timestamp || message?.time || message?.created_at || message?.updated_at || "");
    rows.push({
      ...normalized,
      source,
      sourceMessageId: messageIdentity(message, index),
      actor: messageActor(message),
      invokedAt,
      invokedAtMs: Date.parse(invokedAt) || 0,
      sourceIndex: index,
      sequence: rows.length,
    });
  };
  const addList = (value: any, message: any, index: number, source: string, fallbackAt = "") => {
    for (const item of Array.isArray(value) ? value : []) add(item, message, index, source, fallbackAt);
  };
  for (let index = 0; index < (Array.isArray(messages) ? messages.length : 0); index += 1) {
    const message = messages[index] || {};
    addList(message.invokedSkills || message.invoked_skills, message, index, "message");
    addList(message.receipt?.invokedSkills || message.receipt?.invoked_skills, message, index, "receipt");
    addList(message.runtime_tooling?.invoked_skills || message.runtimeTooling?.invokedSkills, message, index, "runtime_tooling");
    addList(message.delivery_summary?.runtime_tooling?.invoked_skills || message.deliverySummary?.runtimeTooling?.invokedSkills, message, index, "delivery_summary");
    for (const item of Array.isArray(message.receipt?.memoryUsed || message.receipt?.memory_used) ? (message.receipt.memoryUsed || message.receipt.memory_used) : []) {
      if (/Skill\s*[:：]/i.test(String(item || ""))) add(item, message, index, "receipt_memory_used");
    }
    const events = [
      ...(Array.isArray(message.work_events) ? message.work_events : []),
      ...(Array.isArray(message.workEvents) ? message.workEvents : []),
      ...(Array.isArray(message.events) ? message.events : []),
      ...(Array.isArray(message.delivery_summary?.work_events) ? message.delivery_summary.work_events : []),
    ];
    for (const event of events) {
      const eventAt = String(event?.invoked_at || event?.invokedAt || event?.timestamp || event?.time || event?.at || "");
      addList(event?.invokedSkills || event?.invoked_skills || event?.data?.invokedSkills || event?.data?.invoked_skills, message, index, "work_event", eventAt);
      addList(event?.runtime_tooling?.invoked_skills || event?.runtimeTooling?.invokedSkills, message, index, "work_event_runtime_tooling", eventAt);
    }
  }
  const latest = new Map<string, any>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    const previous = latest.get(key);
    const rank = [row.invokedAtMs, row.sourceIndex, row.sequence];
    const previousRank = previous ? [previous.invokedAtMs, previous.sourceIndex, previous.sequence] : [-1, -1, -1];
    if (!previous || rank[0] > previousRank[0] || (rank[0] === previousRank[0] && (rank[1] > previousRank[1] || (rank[1] === previousRank[1] && rank[2] > previousRank[2])))) latest.set(key, row);
  }
  return [...latest.values()].sort((a, b) => b.invokedAtMs - a.invokedAtMs || b.sourceIndex - a.sourceIndex || b.sequence - a.sequence);
}

function isPathWithin(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function currentControlledSkillBody(skillName: string, catalog: any[]) {
  const normalizedName = String(skillName || "").trim();
  const skill = (Array.isArray(catalog) ? catalog : []).find((item: any) => String(item?.name || "").trim().toLowerCase() === normalizedName.toLowerCase());
  if (!skill) return { status: "catalog_missing", body: "", skill: null, sourcePath: "", sourceKind: "missing" };
  if (skill.enabled === false) return { status: "catalog_disabled", body: "", skill, sourcePath: "", sourceKind: "disabled" };
  let sourcePath = "";
  let sourceKind = "prompt";
  if (isCcmInternalSkillName(normalizedName)) {
    sourcePath = path.resolve(__dirname, "..", "..", "..", "templates", "skills", normalizedName.toLowerCase(), "SKILL.md");
    sourceKind = "ccm_internal_skill_md";
  } else {
    const packagePath = String(skill.packagePath || "").trim();
    const skillFile = String(skill.skillFile || skill.skill_file || "").trim();
    if (packagePath && isPathWithin(SKILL_PACKAGES_DIR, packagePath)) {
      sourcePath = path.join(path.resolve(packagePath), "SKILL.md");
      sourceKind = "managed_package_skill_md";
    } else if (skillFile && isPathWithin(SKILL_PACKAGES_DIR, skillFile)) {
      sourcePath = path.resolve(skillFile);
      sourceKind = "managed_skill_file";
    }
  }
  if (sourcePath) {
    try {
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return { status: "skill_file_missing", body: "", skill, sourcePath, sourceKind };
      if (fs.statSync(sourcePath).size > 1024 * 1024) return { status: "skill_file_too_large", body: "", skill, sourcePath, sourceKind };
      return { status: "loaded", body: fs.readFileSync(sourcePath, "utf-8").replace(/^\uFEFF/, ""), skill, sourcePath, sourceKind };
    } catch {
      return { status: "skill_file_read_failed", body: "", skill, sourcePath, sourceKind };
    }
  }
  const prompt = String(skill.prompt || "").trim();
  if (!prompt) return { status: "skill_body_missing", body: "", skill, sourcePath: "", sourceKind };
  const description = String(skill.description || "").replace(/[\r\n]+/g, " ").trim();
  return {
    status: "loaded",
    body: `---\nname: ${normalizedName}\ndescription: ${description}\n---\n\n${prompt}`,
    skill,
    sourcePath: "",
    sourceKind,
  };
}

function truncateSkillBodyToTokens(body: string, maxTokens: number) {
  const text = String(body || "");
  const originalTokens = estimateGroupTextTokens(text);
  if (originalTokens <= maxTokens) return { text, originalTokens, tokens: originalTokens, truncated: false };
  const marker = `\n\n[Skill content truncated to ${maxTokens} tokens by CCM post-compact budget]`;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (estimateGroupTextTokens(`${text.slice(0, middle).trimEnd()}${marker}`) <= maxTokens) low = middle;
    else high = middle - 1;
  }
  const truncatedText = `${text.slice(0, low).trimEnd()}${marker}`;
  return { text: truncatedText, originalTokens, tokens: estimateGroupTextTokens(truncatedText), truncated: true };
}

function truncatePostCompactBodyPreservingEdges(body: string, maxTokens: number) {
  const text = String(body || "");
  const originalTokens = estimateGroupTextTokens(text);
  if (originalTokens <= maxTokens) return { text, originalTokens, tokens: originalTokens, truncated: false };
  let low = 1000;
  let high = text.length;
  let selected = compactPreserveEdges(text, low);
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = compactPreserveEdges(text, middle);
    if (estimateGroupTextTokens(candidate) <= maxTokens) {
      selected = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return { text: selected, originalTokens, tokens: estimateGroupTextTokens(selected), truncated: true };
}

export function verifyGroupPostCompactInvokedSkillAttachmentReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-invoked-skill-attachment-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_INVOKED_SKILL_ATTACHMENT_VERSION) issues.push("post_compact_invoked_skill_attachment_schema_invalid");
  if (!String(receipt?.group_id || "").trim()) issues.push("post_compact_invoked_skill_attachment_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_invoked_skill_attachment_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`) issues.push("post_compact_invoked_skill_attachment_scope_invalid");
  if (receipt?.exact_session_only !== true || receipt?.cross_session_fallback_allowed !== false) issues.push("post_compact_invoked_skill_attachment_isolation_invalid");
  if (receipt?.body_free !== true) issues.push("post_compact_invoked_skill_attachment_receipt_body_policy_invalid");
  if (Number(receipt?.single_skill_max_tokens || 0) !== GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS) issues.push("post_compact_invoked_skill_attachment_single_budget_invalid");
  if (Number(receipt?.total_max_tokens || 0) !== GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS) issues.push("post_compact_invoked_skill_attachment_total_budget_invalid");
  if (Number(receipt?.attached_token_count || 0) > Number(receipt?.total_max_tokens || 0)) issues.push("post_compact_invoked_skill_attachment_budget_exceeded");
  const forbiddenKeys = new Set(["body", "content", "prompt", "markdown", "attachments", "attachment_bodies"]);
  const visit = (value: any): boolean => {
    if (!value || typeof value !== "object") return false;
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenKeys.has(String(key).toLowerCase())) return true;
      if (visit(nested)) return true;
    }
    return false;
  };
  if (visit(receipt)) issues.push("post_compact_invoked_skill_attachment_receipt_contains_body");
  if (String(receipt?.receipt_checksum || "") !== invokedSkillAttachmentReceiptChecksum(receipt)) issues.push("post_compact_invoked_skill_attachment_receipt_checksum_invalid");
  if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || "")) issues.push("post_compact_invoked_skill_attachment_group_mismatch");
  if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || "")) issues.push("post_compact_invoked_skill_attachment_session_mismatch");
  if (Array.isArray(expected.attachments)) {
    const manifest = expected.attachments.map((item: any) => ({
      name: String(item?.name || ""),
      current_content_hash: String(item?.currentContentHash || item?.current_content_hash || ""),
      invocation_content_hash: String(item?.invocationContentHash || item?.invocation_content_hash || ""),
      token_count: Number(item?.tokenCount || item?.token_count || 0),
      truncated: item?.truncated === true,
    }));
    const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    if (manifest.length !== Number(receipt?.attachment_count || 0)) issues.push("post_compact_invoked_skill_attachment_count_mismatch");
    if (manifestChecksum !== String(receipt?.attachment_manifest_checksum || "")) issues.push("post_compact_invoked_skill_attachment_manifest_mismatch");
    if (manifest.reduce((sum: number, item: any) => sum + item.token_count, 0) !== Number(receipt?.attached_token_count || 0)) issues.push("post_compact_invoked_skill_attachment_token_count_mismatch");
  }
  return { valid: issues.length === 0, issues };
}

export function buildGroupPostCompactInvokedSkillAttachmentProjection(messages: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_post_compact_invoked_skill_attachment");
  const singleSkillMaxTokens = Math.max(1, Math.min(GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS, Number(options.singleSkillMaxTokens || options.single_skill_max_tokens || GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS)));
  const totalMaxTokens = Math.max(1, Math.min(GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS, Number(options.totalMaxTokens || options.total_max_tokens || GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS)));
  const catalog = Array.isArray(options.skillCatalog || options.skill_catalog) ? (options.skillCatalog || options.skill_catalog) : loadSkills();
  const invocations = collectExactSessionInvokedSkills(messages);
  const attachments: any[] = [];
  const missingSkillNames: string[] = [];
  const driftSkillNames: string[] = [];
  let remainingTokens = totalMaxTokens;
  for (const invocation of invocations) {
    if (remainingTokens <= 0) break;
    const loaded = currentControlledSkillBody(invocation.name, catalog);
    if (loaded.status !== "loaded" || !loaded.body) {
      missingSkillNames.push(invocation.name);
      continue;
    }
    const currentContentHash = crypto.createHash("sha256").update(loaded.body).digest("hex");
    const catalogContentHash = String(loaded.skill?.contentHash || loaded.skill?.content_hash || "").trim();
    const invocationContentHash = String(invocation.contentHash || "").trim();
    const hashMatches = invocationContentHash
      ? [currentContentHash, catalogContentHash].filter(Boolean).some(value => value === invocationContentHash || value.startsWith(invocationContentHash) || invocationContentHash.startsWith(value))
      : null;
    if (hashMatches === false) driftSkillNames.push(invocation.name);
    const bounded = truncateSkillBodyToTokens(loaded.body, Math.min(singleSkillMaxTokens, remainingTokens));
    if (!bounded.text || bounded.tokens <= 0) continue;
    attachments.push({
      schema: "ccm-group-post-compact-invoked-skill-body-v1",
      name: invocation.name,
      body: bounded.text,
      currentContentHash,
      catalogContentHash,
      invocationContentHash,
      hashMatches,
      sourceKind: loaded.sourceKind,
      sourceMessageId: invocation.sourceMessageId,
      invocationSource: invocation.source,
      invokedAt: invocation.invokedAt,
      tokenCount: bounded.tokens,
      originalTokenCount: bounded.originalTokens,
      truncated: bounded.truncated,
    });
    remainingTokens -= bounded.tokens;
  }
  const manifest = attachments.map(item => ({
    name: item.name,
    current_content_hash: item.currentContentHash,
    invocation_content_hash: item.invocationContentHash,
    token_count: item.tokenCount,
    truncated: item.truncated,
  }));
  const payload: any = {
    schema: "ccm-group-post-compact-invoked-skill-attachment-v1",
    version: GROUP_POST_COMPACT_INVOKED_SKILL_ATTACHMENT_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    exact_session_only: true,
    cross_session_fallback_allowed: false,
    body_free: true,
    invocation_count: invocations.length,
    attachment_count: attachments.length,
    attached_token_count: attachments.reduce((sum, item) => sum + Number(item.tokenCount || 0), 0),
    single_skill_max_tokens: singleSkillMaxTokens,
    total_max_tokens: totalMaxTokens,
    truncated_skill_count: attachments.filter(item => item.truncated).length,
    catalog_drift_count: driftSkillNames.length,
    missing_skill_count: missingSkillNames.length,
    skill_names: attachments.map(item => item.name),
    current_content_hashes: attachments.map(item => item.currentContentHash),
    invocation_content_hashes: attachments.map(item => item.invocationContentHash),
    drift_skill_names: driftSkillNames,
    missing_skill_names: missingSkillNames,
    attachment_manifest_checksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
    created_at: String(options.now || new Date().toISOString()),
  };
  const receipt = { ...payload, receipt_checksum: invokedSkillAttachmentReceiptChecksum(payload) };
  return { attachments, receipt };
}

function postCompactPlanAttachmentReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function postCompactPlanObject(task: any) {
  const candidates = [
    ["workflow_meta.plan_mode", task?.workflow_meta?.plan_mode],
    ["workflow_meta.intake.plan_mode", task?.workflow_meta?.intake?.plan_mode],
    ["intake_draft", task?.intake_draft],
    ["plan_mode", task?.plan_mode],
    ["planMode", task?.planMode],
    ["plan", task?.plan],
  ];
  for (const [source, value] of candidates) {
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length) return { source, plan: value };
  }
  return null;
}

function postCompactPlanTaskId(task: any) {
  return String(task?.id || task?.task_id || task?.taskId || "").trim();
}

function postCompactPlanTaskStatus(task: any) {
  return normalizePostCompactTaskStatus(task?.status || task?.execution_state || task?.executionState || "pending") || "pending";
}

function postCompactPlanTaskIsTerminal(task: any) {
  return task?.archived === true || ["completed", "failed", "cancelled", "archived"].includes(postCompactPlanTaskStatus(task));
}

function postCompactPlanConfirmationState(task: any, plan: any) {
  const intakeState = String(task?.intake_state || task?.intakeState || "").trim().toLowerCase();
  const confirmationStatus = String(plan?.confirmation_status || plan?.confirmationStatus || "").trim().toLowerCase();
  const controlState = String(plan?.control_state || plan?.controlState || task?.workflow_meta?.project_mission?.control_state || "").trim().toLowerCase();
  const explicitlyConfirmed = intakeState === "confirmed"
    || confirmationStatus === "confirmed"
    || (!!String(plan?.confirmed_at || plan?.confirmedAt || plan?.accepted_at || plan?.acceptedAt || "").trim() && plan?.requires_confirmation !== true);
  const explicitTaskMode = String(
    (typeof task?.plan_mode === "string" ? task.plan_mode : "")
      || (typeof task?.planMode === "string" ? task.planMode : "")
      || task?.mode
      || task?.agent_mode
      || ""
  ).trim().toLowerCase();
  const awaiting = !explicitlyConfirmed && (
    intakeState === "awaiting_confirmation"
    || plan?.requires_confirmation === true
    || ["awaiting_confirmation", "plan_revision_requested", "revision_requested"].includes(controlState)
    || ["plan", "plan_mode", "planning"].includes(explicitTaskMode)
  );
  return {
    intakeState,
    confirmed: explicitlyConfirmed,
    planModeActive: awaiting,
    confirmationStatus: awaiting ? "awaiting_confirmation" : explicitlyConfirmed ? "confirmed" : "plan_reference",
  };
}

function compactPostCompactPlanBody(body: string) {
  const originalTokens = estimateGroupTextTokens(body);
  if (originalTokens <= GROUP_POST_COMPACT_PLAN_MAX_TOKENS) {
    return { text: body, originalTokens, tokens: originalTokens, truncated: false };
  }
  let low = 1_000;
  let high = body.length;
  let selected = compactPreserveEdges(body, low);
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = compactPreserveEdges(body, middle);
    if (estimateGroupTextTokens(candidate) <= GROUP_POST_COMPACT_PLAN_MAX_TOKENS) {
      selected = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return {
    text: selected,
    originalTokens,
    tokens: estimateGroupTextTokens(selected),
    truncated: true,
  };
}

export function verifyGroupPostCompactPlanAttachmentReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-plan-attachment-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_PLAN_ATTACHMENT_VERSION) issues.push("post_compact_plan_attachment_schema_invalid");
  if (!String(receipt?.group_id || "").trim()) issues.push("post_compact_plan_attachment_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_plan_attachment_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`) issues.push("post_compact_plan_attachment_scope_invalid");
  if (receipt?.exact_session_only !== true || receipt?.cross_session_fallback_allowed !== false) issues.push("post_compact_plan_attachment_isolation_invalid");
  if (receipt?.body_free !== true) issues.push("post_compact_plan_attachment_receipt_body_policy_invalid");
  if (Number(receipt?.max_plan_tokens || 0) !== GROUP_POST_COMPACT_PLAN_MAX_TOKENS) issues.push("post_compact_plan_attachment_budget_invalid");
  if (Number(receipt?.attachment_token_count || 0) > GROUP_POST_COMPACT_PLAN_MAX_TOKENS) issues.push("post_compact_plan_attachment_budget_exceeded");
  if (![0, 1].includes(Number(receipt?.attachment_count || 0))) issues.push("post_compact_plan_attachment_count_invalid");
  if (Number(receipt?.attachment_count || 0) === 1 && (!String(receipt?.selected_task_id || "") || !String(receipt?.plan_hash || "") || !String(receipt?.attachment_body_checksum || ""))) {
    issues.push("post_compact_plan_attachment_manifest_incomplete");
  }
  const forbiddenKeys = new Set(["body", "content", "plan", "plan_body", "plan_snapshot", "attachment"]);
  const visit = (value: any): boolean => {
    if (!value || typeof value !== "object") return false;
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenKeys.has(String(key).toLowerCase())) return true;
      if (visit(nested)) return true;
    }
    return false;
  };
  if (visit(receipt)) issues.push("post_compact_plan_attachment_receipt_contains_body");
  if (String(receipt?.receipt_checksum || "") !== postCompactPlanAttachmentReceiptChecksum(receipt)) issues.push("post_compact_plan_attachment_receipt_checksum_invalid");
  if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || "")) issues.push("post_compact_plan_attachment_group_mismatch");
  if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || "")) issues.push("post_compact_plan_attachment_session_mismatch");
  if (expected.attachment !== undefined) {
    const attachment = expected.attachment || null;
    const attachmentCount = attachment ? 1 : 0;
    const bodyChecksum = attachment ? crypto.createHash("sha256").update(String(attachment.body || "")).digest("hex") : "";
    const manifest = attachment ? {
      task_id: String(attachment.taskId || attachment.task_id || ""),
      plan_hash: String(attachment.planHash || attachment.plan_hash || ""),
      body_checksum: bodyChecksum,
      token_count: Number(attachment.tokenCount || attachment.token_count || 0),
      plan_mode_active: attachment.planModeActive === true || attachment.plan_mode_active === true,
      truncated: attachment.truncated === true,
    } : null;
    const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    if (attachmentCount !== Number(receipt?.attachment_count || 0)) issues.push("post_compact_plan_attachment_count_mismatch");
    if (manifestChecksum !== String(receipt?.attachment_manifest_checksum || "")) issues.push("post_compact_plan_attachment_manifest_mismatch");
    if (bodyChecksum !== String(receipt?.attachment_body_checksum || "")) issues.push("post_compact_plan_attachment_body_checksum_mismatch");
  }
  return { valid: issues.length === 0, issues };
}

export function buildGroupPostCompactPlanAttachmentProjection(tasks: any[] = [], options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_post_compact_plan_attachment");
  const sourceTasks = Array.isArray(tasks) ? tasks : [];
  const exactTasks = sourceTasks.filter((task: any) => String(task?.group_id || task?.groupId || "").trim() === groupId
    && String(task?.group_session_id || task?.groupSessionId || "").trim() === groupSessionId);
  const planRows = exactTasks.map((task: any) => ({ task, planSource: postCompactPlanObject(task) })).filter((row: any) => !!row.planSource);
  const activeRows = planRows.filter((row: any) => !postCompactPlanTaskIsTerminal(row.task));
  const explicitCurrentTaskId = String(options.currentTaskId || options.current_task_id || "").trim();
  const sessionMessages = Array.isArray(options.sessionMessages || options.session_messages) ? (options.sessionMessages || options.session_messages) : [];
  const recentMessageTaskIds = [...sessionMessages].reverse().map((message: any) => String(
    message?.task_id || message?.taskId || message?.receipt?.taskId || message?.receipt?.task_id || message?.delivery_summary?.task_id || ""
  ).trim()).filter(Boolean);
  let selectedRow: any = null;
  let selectionReason = "no_active_plan";
  if (explicitCurrentTaskId) {
    selectedRow = planRows.find((row: any) => postCompactPlanTaskId(row.task) === explicitCurrentTaskId) || null;
    if (selectedRow) selectionReason = "explicit_current_task";
  }
  if (!selectedRow) {
    for (const taskId of recentMessageTaskIds) {
      selectedRow = activeRows.find((row: any) => postCompactPlanTaskId(row.task) === taskId) || null;
      if (selectedRow) {
        selectionReason = "latest_session_message_task";
        break;
      }
    }
  }
  if (!selectedRow && activeRows.length) {
    selectedRow = [...activeRows].sort((a: any, b: any) => {
      const aState = postCompactPlanConfirmationState(a.task, a.planSource.plan);
      const bState = postCompactPlanConfirmationState(b.task, b.planSource.plan);
      return Number(bState.planModeActive) - Number(aState.planModeActive)
        || postCompactTaskUpdatedAtMs(b.task) - postCompactTaskUpdatedAtMs(a.task)
        || postCompactPlanTaskId(b.task).localeCompare(postCompactPlanTaskId(a.task));
    })[0];
    selectionReason = "latest_active_session_plan";
  }

  let attachment: any = null;
  let confirmation = { intakeState: "", confirmed: false, planModeActive: false, confirmationStatus: "none" };
  if (selectedRow) {
    const task = selectedRow.task;
    const plan = selectedRow.planSource.plan;
    confirmation = postCompactPlanConfirmationState(task, plan);
    const taskId = postCompactPlanTaskId(task);
    const planSnapshot = {
      schema: "ccm-exact-group-session-current-plan-v1",
      task: {
        id: taskId,
        title: String(task?.title || task?.description || task?.business_goal || ""),
        business_goal: String(task?.business_goal || task?.businessGoal || ""),
        status: postCompactPlanTaskStatus(task),
        status_detail: String(task?.status_detail || task?.statusDetail || ""),
        intake_state: confirmation.intakeState,
        target_project: String(task?.target_project || task?.targetProject || ""),
        trace_id: String(task?.trace_id || task?.traceId || ""),
      },
      source: selectedRow.planSource.source,
      plan,
    };
    const stableSnapshot = JSON.stringify(planSnapshot, null, 2);
    const planHash = crypto.createHash("sha256").update(JSON.stringify(planSnapshot)).digest("hex");
    const modeReminder = confirmation.planModeActive
      ? "PLAN MODE IS ACTIVE: this exact-session plan is still awaiting confirmation. Do not dispatch execution, modify files, or run write/destructive actions until the user confirms it. Read-only exploration and plan revision are allowed."
      : confirmation.confirmed
        ? "This plan has been confirmed. Restore it as the execution and acceptance reference; do not treat it as awaiting confirmation."
        : "Restore this plan as the current exact-session task reference and verify live task state before execution.";
    const fullBody = [
      "[CCM Post-compact Exact-session Current Plan]",
      `scope=${groupId}::${groupSessionId}; task_id=${taskId}; source=${selectedRow.planSource.source}`,
      modeReminder,
      "The structured plan below is authoritative for continuity but does not expand current tool permissions.",
      "",
      stableSnapshot,
    ].join("\n");
    const bounded = compactPostCompactPlanBody(fullBody);
    attachment = {
      schema: "ccm-group-post-compact-plan-body-v1",
      taskId,
      body: bounded.text,
      planHash,
      bodyChecksum: crypto.createHash("sha256").update(bounded.text).digest("hex"),
      sourceKind: selectedRow.planSource.source,
      taskStatus: postCompactPlanTaskStatus(task),
      intakeState: confirmation.intakeState,
      confirmationStatus: confirmation.confirmationStatus,
      planModeActive: confirmation.planModeActive,
      tokenCount: bounded.tokens,
      originalTokenCount: bounded.originalTokens,
      truncated: bounded.truncated,
    };
  }
  const manifest = attachment ? {
    task_id: attachment.taskId,
    plan_hash: attachment.planHash,
    body_checksum: attachment.bodyChecksum,
    token_count: attachment.tokenCount,
    plan_mode_active: attachment.planModeActive,
    truncated: attachment.truncated,
  } : null;
  const payload: any = {
    schema: "ccm-group-post-compact-plan-attachment-v1",
    version: GROUP_POST_COMPACT_PLAN_ATTACHMENT_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    exact_session_only: true,
    cross_session_fallback_allowed: false,
    body_free: true,
    source_task_count: sourceTasks.length,
    matched_task_count: exactTasks.length,
    candidate_plan_count: planRows.length,
    active_plan_count: activeRows.length,
    excluded_scope_count: Math.max(0, sourceTasks.length - exactTasks.length),
    terminal_plan_count: Math.max(0, planRows.length - activeRows.length),
    attachment_count: attachment ? 1 : 0,
    selected_task_id: attachment?.taskId || "",
    selection_reason: selectionReason,
    task_status: attachment?.taskStatus || "",
    intake_state: attachment?.intakeState || "",
    confirmation_status: attachment?.confirmationStatus || "none",
    plan_mode_active: attachment?.planModeActive === true,
    plan_hash: attachment?.planHash || "",
    attachment_body_checksum: attachment?.bodyChecksum || "",
    attachment_token_count: Number(attachment?.tokenCount || 0),
    original_token_count: Number(attachment?.originalTokenCount || 0),
    max_plan_tokens: GROUP_POST_COMPACT_PLAN_MAX_TOKENS,
    budget_source: "claude_code_POST_COMPACT_TOKEN_BUDGET",
    truncated: attachment?.truncated === true,
    attachment_manifest_checksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
    created_at: String(options.now || new Date().toISOString()),
  };
  const receipt = { ...payload, receipt_checksum: postCompactPlanAttachmentReceiptChecksum(payload) };
  return { attachment, receipt };
}

function postCompactDynamicContextDeltaReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function dynamicContextTextHash(value: any) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeDynamicContextRows(values: any, kind: "line" | "block") {
  const rows = new Map<string, any>();
  for (const raw of Array.isArray(values) ? values : []) {
    const name = String(raw?.name || raw?.targetId || raw?.target_id || raw?.agentType || raw?.agent_type || "").trim();
    const text = String(raw?.[kind] || raw?.text || raw?.description || raw?.instructions || "").trim();
    if (!name || !text) continue;
    rows.set(name, { name, text, hash: dynamicContextTextHash(text) });
  }
  return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function collectToolReferenceNames(value: any, names: Set<string>, depth = 0) {
  if (!value || depth > 8) return;
  if (Array.isArray(value)) {
    value.forEach(item => collectToolReferenceNames(item, names, depth + 1));
    return;
  }
  if (typeof value !== "object") return;
  const type = String(value.type || "").toLowerCase();
  if (["tool_use", "server_tool_use"].includes(type)) {
    const name = String(value.name || value.tool || value.tool_name || "").trim();
    if (name) names.add(name);
  }
  if (type === "tool_reference") {
    const name = String(value.tool_name || value.toolName || value.name || "").trim();
    if (name) names.add(name);
  }
  for (const key of ["content", "blocks", "items", "result", "tool_result", "toolResult"]) {
    if (value[key] !== undefined) collectToolReferenceNames(value[key], names, depth + 1);
  }
}

export function extractGroupPreCompactLoadedToolNames(messages: any[] = [], carriedValues: any[] = []) {
  const names = new Set<string>();
  const addNames = (values: any) => {
    for (const value of Array.isArray(values) ? values : []) {
      const name = String(value || "").trim();
      if (name) names.add(name);
    }
  };
  addNames(carriedValues);
  for (const message of messages || []) {
    addNames(message?.compactMetadata?.preCompactDiscoveredTools);
    addNames(message?.compact_metadata?.pre_compact_discovered_tools);
    addNames(message?.preCompactDiscoveredTools || message?.pre_compact_discovered_tools);
    addNames(message?.dynamicContextDeltaAttachment?.loadedToolState?.carriedNames);
    addNames(message?.dynamic_context_delta_attachment?.loaded_tool_state?.carried_names);
    const explicitCalls = Array.isArray(message?.tool_calls || message?.toolCalls)
      ? (message.tool_calls || message.toolCalls)
      : [];
    for (const call of explicitCalls) {
      const name = String(call?.name || call?.function?.name || call?.tool || call?.tool_name || "").trim();
      if (name) names.add(name);
    }
    collectToolReferenceNames(messageContentBlocks(message), names);
  }
  return [...names].sort();
}

function buildPreCompactLoadedToolState(catalogTools: any[], messages: any[], carriedValues: any[] = []) {
  const catalogRows = normalizeDynamicContextRows(catalogTools, "line");
  const current = new Map(catalogRows.map(row => [row.name, row]));
  const discoveredNames = extractGroupPreCompactLoadedToolNames(messages, carriedValues)
    .filter(name => current.has(name) || /^mcp__/i.test(name));
  const carried = discoveredNames.filter(name => current.has(name));
  const dropped = discoveredNames.filter(name => !current.has(name));
  return {
    schema: "ccm-group-post-compact-loaded-tool-state-v1",
    version: GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION,
    sourceCount: discoveredNames.length,
    carriedNames: carried,
    carriedHashes: carried.map(name => current.get(name)?.hash || ""),
    droppedNames: dropped,
  };
}

function collectDynamicContextDeltaAttachments(values: any[]) {
  const attachments: any[] = [];
  const add = (candidate: any) => {
    if (candidate?.schema === "ccm-group-post-compact-dynamic-context-delta-body-v1") attachments.push(candidate);
  };
  for (const value of values || []) {
    add(value);
    add(value?.attachment);
    add(value?.dynamicContextDeltaAttachment || value?.dynamic_context_delta_attachment);
    add(value?.postCompactDynamicContextDelta || value?.post_compact_dynamic_context_delta);
    add(value?.postCompactReinject?.dynamicContextDeltaAttachment || value?.post_compact_reinject?.dynamic_context_delta_attachment);
    for (const candidate of Array.isArray(value?.attachments) ? value.attachments : []) add(candidate);
  }
  return attachments;
}

function reconstructDynamicContextAnnouncements(attachments: any[]) {
  const createState = () => new Map<string, string>();
  const state = {
    deferredTools: createState(),
    agentListing: createState(),
    mcpInstructions: createState(),
  };
  const apply = (target: Map<string, string>, delta: any) => {
    const names = Array.isArray(delta?.addedNames) ? delta.addedNames : [];
    const hashes = Array.isArray(delta?.addedHashes) ? delta.addedHashes : [];
    names.forEach((name: any, index: number) => target.set(String(name || ""), String(hashes[index] || "")));
    for (const name of Array.isArray(delta?.removedNames) ? delta.removedNames : []) target.delete(String(name || ""));
  };
  for (const attachment of attachments || []) {
    apply(state.deferredTools, attachment?.deferredTools || attachment?.deferred_tools);
    apply(state.agentListing, attachment?.agentListing || attachment?.agent_listing);
    apply(state.mcpInstructions, attachment?.mcpInstructions || attachment?.mcp_instructions);
  }
  return state;
}

function buildDynamicContextCategory(rows: any[], announced: Map<string, string>) {
  const current = new Map(rows.map(row => [row.name, row]));
  const added = rows.filter(row => !announced.has(row.name) || (!!announced.get(row.name) && announced.get(row.name) !== row.hash));
  const removed = [...announced.keys()].filter(name => !current.has(name)).sort();
  return {
    addedNames: added.map(row => row.name),
    addedHashes: added.map(row => row.hash),
    addedTexts: added.map(row => row.text),
    removedNames: removed,
    isInitial: announced.size === 0,
  };
}

function dynamicContextAttachmentManifest(attachment: any) {
  if (!attachment) return null;
  const category = (value: any) => ({
    added_names: Array.isArray(value?.addedNames) ? value.addedNames : [],
    added_hashes: Array.isArray(value?.addedHashes) ? value.addedHashes : [],
    removed_names: Array.isArray(value?.removedNames) ? value.removedNames : [],
  });
  const manifest: any = {
    deferred_tools: category(attachment.deferredTools || attachment.deferred_tools),
    agent_listing: category(attachment.agentListing || attachment.agent_listing),
    mcp_instructions: category(attachment.mcpInstructions || attachment.mcp_instructions),
    body_checksum: dynamicContextTextHash(attachment.body || ""),
    token_count: Number(attachment.tokenCount || attachment.token_count || 0),
    truncated: attachment.truncated === true,
  };
  const loadedToolState = attachment.loadedToolState || attachment.loaded_tool_state;
  if (loadedToolState) {
    manifest.loaded_tool_state = {
      schema: String(attachment.loadedToolState?.schema || attachment.loaded_tool_state?.schema || ""),
      carried_names: Array.isArray(attachment.loadedToolState?.carriedNames)
        ? attachment.loadedToolState.carriedNames
        : Array.isArray(attachment.loaded_tool_state?.carried_names) ? attachment.loaded_tool_state.carried_names : [],
      carried_hashes: Array.isArray(attachment.loadedToolState?.carriedHashes)
        ? attachment.loadedToolState.carriedHashes
        : Array.isArray(attachment.loaded_tool_state?.carried_hashes) ? attachment.loaded_tool_state.carried_hashes : [],
      dropped_names: Array.isArray(attachment.loadedToolState?.droppedNames)
        ? attachment.loadedToolState.droppedNames
        : Array.isArray(attachment.loaded_tool_state?.dropped_names) ? attachment.loaded_tool_state.dropped_names : [],
    };
  }
  return manifest;
}

export function verifyGroupPostCompactDynamicContextDeltaReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-post-compact-dynamic-context-delta-v1"
    || Number(receipt?.version || 0) !== GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION) issues.push("post_compact_dynamic_context_delta_schema_invalid");
  if (!String(receipt?.group_id || "").trim()) issues.push("post_compact_dynamic_context_delta_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("post_compact_dynamic_context_delta_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`) issues.push("post_compact_dynamic_context_delta_scope_invalid");
  if (receipt?.exact_session_only !== true || receipt?.cross_session_fallback_allowed !== false) issues.push("post_compact_dynamic_context_delta_isolation_invalid");
  if (receipt?.body_free !== true) issues.push("post_compact_dynamic_context_delta_receipt_body_policy_invalid");
  if (!["full", "partial"].includes(String(receipt?.scan_mode || ""))) issues.push("post_compact_dynamic_context_delta_scan_mode_invalid");
  if (Number(receipt?.max_attachment_tokens || 0) !== GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS) issues.push("post_compact_dynamic_context_delta_budget_invalid");
  if (Number(receipt?.attachment_token_count || 0) > GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS) issues.push("post_compact_dynamic_context_delta_budget_exceeded");
  if (![0, 1].includes(Number(receipt?.attachment_count || 0))) issues.push("post_compact_dynamic_context_delta_attachment_count_invalid");
  const loadedToolState = receipt?.loaded_tool_state;
  if (loadedToolState !== undefined && loadedToolState !== null) {
    if (loadedToolState?.schema !== "ccm-group-post-compact-loaded-tool-state-v1"
      || Number(loadedToolState?.version || 0) !== GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION) issues.push("post_compact_loaded_tool_state_schema_invalid");
    const carriedNames = Array.isArray(loadedToolState?.carried_names) ? loadedToolState.carried_names.map((name: any) => String(name || "")) : [];
    const carriedHashes = Array.isArray(loadedToolState?.carried_hashes) ? loadedToolState.carried_hashes.map((hash: any) => String(hash || "")) : [];
    const droppedNames = Array.isArray(loadedToolState?.dropped_names) ? loadedToolState.dropped_names.map((name: any) => String(name || "")) : [];
    if (Number(loadedToolState?.carried_count || 0) !== carriedNames.length
      || carriedHashes.length !== carriedNames.length
      || Number(loadedToolState?.dropped_count || 0) !== droppedNames.length
      || Number(loadedToolState?.source_count || 0) !== carriedNames.length + droppedNames.length) issues.push("post_compact_loaded_tool_state_count_invalid");
    if (new Set(carriedNames).size !== carriedNames.length
      || new Set(droppedNames).size !== droppedNames.length
      || carriedNames.some((name: string) => droppedNames.includes(name))) issues.push("post_compact_loaded_tool_state_names_invalid");
    const stateChecksum = dynamicContextTextHash(JSON.stringify({ carried_names: carriedNames, carried_hashes: carriedHashes, dropped_names: droppedNames }));
    if (String(loadedToolState?.state_checksum || "") !== stateChecksum) issues.push("post_compact_loaded_tool_state_checksum_invalid");
  }
  const forbiddenKeys = new Set(["body", "content", "line", "lines", "block", "blocks", "description", "descriptions", "instructions", "addedtexts", "added_texts"]);
  const visit = (value: any): boolean => {
    if (!value || typeof value !== "object") return false;
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenKeys.has(String(key).toLowerCase())) return true;
      if (visit(nested)) return true;
    }
    return false;
  };
  if (visit(receipt)) issues.push("post_compact_dynamic_context_delta_receipt_contains_body");
  if (String(receipt?.receipt_checksum || "") !== postCompactDynamicContextDeltaReceiptChecksum(receipt)) issues.push("post_compact_dynamic_context_delta_receipt_checksum_invalid");
  if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || "")) issues.push("post_compact_dynamic_context_delta_group_mismatch");
  if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || "")) issues.push("post_compact_dynamic_context_delta_session_mismatch");
  if (expected.attachment !== undefined) {
    const attachment = expected.attachment || null;
    const manifest = dynamicContextAttachmentManifest(attachment);
    const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
    if (Number(receipt?.attachment_count || 0) !== (attachment ? 1 : 0)) issues.push("post_compact_dynamic_context_delta_attachment_count_mismatch");
    if (String(receipt?.attachment_manifest_checksum || "") !== manifestChecksum) issues.push("post_compact_dynamic_context_delta_manifest_mismatch");
    if (String(receipt?.attachment_body_checksum || "") !== (attachment ? dynamicContextTextHash(attachment.body || "") : "")) issues.push("post_compact_dynamic_context_delta_body_checksum_mismatch");
  }
  return { valid: issues.length === 0, issues };
}

export function buildGroupPostCompactDynamicContextDeltaProjection(catalog: any = {}, options: any = {}) {
  const groupId = String(options.groupId || options.group_id || "").trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_post_compact_dynamic_context_delta");
  const scanMode = String(options.scanMode || options.scan_mode || "full").toLowerCase() === "partial" ? "partial" : "full";
  const priorValues = scanMode === "partial" ? [
    ...(Array.isArray(options.preservedMessages || options.preserved_messages) ? (options.preservedMessages || options.preserved_messages) : []),
    ...(Array.isArray(options.priorAttachments || options.prior_attachments) ? (options.priorAttachments || options.prior_attachments) : []),
  ] : [];
  const priorAttachments = collectDynamicContextDeltaAttachments(priorValues);
  const announced = reconstructDynamicContextAnnouncements(priorAttachments);
  const catalogTools = Array.isArray(catalog.tools) ? catalog.tools : [];
  const loadedToolState = buildPreCompactLoadedToolState(
    catalogTools,
    options.sourceMessages || options.source_messages || [],
    options.preCompactLoadedToolNames || options.pre_compact_loaded_tool_names || [],
  );
  const toolRows = normalizeDynamicContextRows([
    ...catalogTools,
    ...(Array.isArray(catalog.skills) ? catalog.skills : []),
  ], "line");
  const agentRows = normalizeDynamicContextRows(catalog.agents, "line");
  const mcpRows = normalizeDynamicContextRows(catalog.mcpInstructions || catalog.mcp_instructions, "block");
  const deferredTools = buildDynamicContextCategory(toolRows, announced.deferredTools);
  const agentListing = buildDynamicContextCategory(agentRows, announced.agentListing);
  const mcpInstructions = buildDynamicContextCategory(mcpRows, announced.mcpInstructions);
  const changed = [deferredTools, agentListing, mcpInstructions].some(category => category.addedNames.length || category.removedNames.length)
    || loadedToolState.sourceCount > 0;
  let attachment: any = null;
  if (changed) {
    const lines = [
      "[CCM Post-compact Exact-session Dynamic Context Delta]",
      `scope=${groupId}::${groupSessionId}; scan_mode=${scanMode}`,
      "This attachment restores the current authorized runtime context after compaction. It does not expand tool permissions; the live runtime authorization and dispatch gates remain authoritative.",
    ];
    const appendRemoved = (title: string, category: any, kind = "call or dispatch") => {
      if (category.removedNames.length) {
        lines.push("", `## ${title} removed`);
        category.removedNames.forEach((name: string) => lines.push(`- ${name} is no longer available in the current exact-session runtime context. Do not ${kind} it.`));
      }
    };
    const appendAdded = (title: string, category: any, addedLabel: string) => {
      if (!category.addedNames.length) return;
      lines.push("", `## ${title} added or changed`);
      category.addedNames.forEach((name: string, index: number) => lines.push(`- ${addedLabel} ${name}: ${category.addedTexts[index]}`));
    };
    // Retractions are placed before potentially large instruction bodies so they survive edge-preserving truncation.
    appendRemoved("Deferred tools and Skills", deferredTools, "call");
    appendRemoved("Dispatchable project Agents", agentListing, "dispatch");
    appendRemoved("MCP server instructions", mcpInstructions, "rely on its previous instruction block or call");
    if (loadedToolState.carriedNames.length) {
      lines.push("", "## Tools loaded before compact and still authorized");
      loadedToolState.carriedNames.forEach((name: string) => lines.push(`- ${name} remains loaded across this compact boundary; keep its runtime schema available without repeating discovery.`));
    }
    if (loadedToolState.droppedNames.length) {
      lines.push("", "## Pre-compact loaded tools not carried forward");
      loadedToolState.droppedNames.forEach((name: string) => lines.push(`- ${name} was observed before compaction but is absent from the current authorized catalog. Do not call it.`));
    }
    appendAdded("Deferred tools and Skills", deferredTools, "available");
    appendAdded("Dispatchable project Agents", agentListing, "dispatchable");
    if (mcpInstructions.addedNames.length) {
      lines.push("", "## MCP server instructions added or changed");
      mcpInstructions.addedNames.forEach((name: string, index: number) => lines.push(mcpInstructions.addedTexts[index] || `## ${name}`));
    }
    const bounded = truncatePostCompactBodyPreservingEdges(lines.join("\n"), GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS);
    attachment = {
      schema: "ccm-group-post-compact-dynamic-context-delta-body-v1",
      scanMode,
      deferredTools: { ...deferredTools, addedLines: deferredTools.addedTexts, addedTexts: undefined },
      agentListing: { ...agentListing, addedLines: agentListing.addedTexts, addedTexts: undefined },
      mcpInstructions: { ...mcpInstructions, addedBlocks: mcpInstructions.addedTexts, addedTexts: undefined },
      loadedToolState,
      body: bounded.text,
      bodyChecksum: dynamicContextTextHash(bounded.text),
      tokenCount: bounded.tokens,
      originalTokenCount: bounded.originalTokens,
      truncated: bounded.truncated,
    };
  }
  const manifest = dynamicContextAttachmentManifest(attachment);
  const catalogManifest = {
    tools: toolRows.map(row => ({ name: row.name, hash: row.hash })),
    agents: agentRows.map(row => ({ name: row.name, hash: row.hash })),
    mcp_instructions: mcpRows.map(row => ({ name: row.name, hash: row.hash })),
  };
  const announcedManifest = {
    tools: [...announced.deferredTools.entries()].sort(),
    agents: [...announced.agentListing.entries()].sort(),
    mcp_instructions: [...announced.mcpInstructions.entries()].sort(),
  };
  const payload: any = {
    schema: "ccm-group-post-compact-dynamic-context-delta-v1",
    version: GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    exact_session_only: true,
    cross_session_fallback_allowed: false,
    body_free: true,
    scan_mode: scanMode,
    prior_attachment_count: priorAttachments.length,
    attachment_count: attachment ? 1 : 0,
    max_attachment_tokens: GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS,
    attachment_token_count: Number(attachment?.tokenCount || 0),
    original_token_count: Number(attachment?.originalTokenCount || 0),
    truncated: attachment?.truncated === true,
    deferred_tools: {
      current_count: toolRows.length,
      added_names: deferredTools.addedNames,
      added_hashes: deferredTools.addedHashes,
      removed_names: deferredTools.removedNames,
    },
    agent_listing: {
      current_count: agentRows.length,
      added_names: agentListing.addedNames,
      added_hashes: agentListing.addedHashes,
      removed_names: agentListing.removedNames,
    },
    mcp_instructions: {
      current_count: mcpRows.length,
      added_names: mcpInstructions.addedNames,
      added_hashes: mcpInstructions.addedHashes,
      removed_names: mcpInstructions.removedNames,
    },
    loaded_tool_state: {
      schema: loadedToolState.schema,
      version: loadedToolState.version,
      source_count: loadedToolState.sourceCount,
      carried_count: loadedToolState.carriedNames.length,
      carried_names: loadedToolState.carriedNames,
      carried_hashes: loadedToolState.carriedHashes,
      dropped_count: loadedToolState.droppedNames.length,
      dropped_names: loadedToolState.droppedNames,
      state_checksum: dynamicContextTextHash(JSON.stringify({
        carried_names: loadedToolState.carriedNames,
        carried_hashes: loadedToolState.carriedHashes,
        dropped_names: loadedToolState.droppedNames,
      })),
    },
    catalog_checksum: crypto.createHash("sha256").update(JSON.stringify(catalogManifest)).digest("hex"),
    announced_state_checksum: crypto.createHash("sha256").update(JSON.stringify(announcedManifest)).digest("hex"),
    attachment_body_checksum: attachment ? dynamicContextTextHash(attachment.body || "") : "",
    attachment_manifest_checksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
    created_at: String(options.now || new Date().toISOString()),
  };
  const receipt = { ...payload, receipt_checksum: postCompactDynamicContextDeltaReceiptChecksum(payload) };
  return { attachment, receipt };
}

export function buildGroupMicroCompactPlan(messages: any[], options: any = {}) {
  const maxChars = Math.max(600, Number(options.maxChars || options.max_chars || 1800));
  const includeUser = options.includeUser === true || options.include_user === true;
  const timeBased = resolveGroupTimeBasedMicroCompact(messages, options, includeUser);
  const records: any[] = [];
  let tokensBefore = 0;
  let tokensAfter = 0;
  for (let index = 0; index < (messages || []).length; index += 1) {
    const message = messages[index];
    if (!includeUser && message?.role === "user") continue;
    const content = messageContent(message);
    if (!content) continue;
    const compacted = microCompactText(content, maxChars);
    const artifacts = extractPostCompactArtifacts(message);
    const timeBasedCleared = timeBased.clearSet.has(index);
    const clearedText = `${GROUP_TIME_BASED_MC_CLEARED_MESSAGE} #${messageIdentity(message, index)}; raw transcript retained.`;
    const effectiveTokensAfter = timeBasedCleared ? estimateGroupTextTokens(clearedText) : compacted.tokens_after;
    tokensBefore += compacted.tokens_before;
    tokensAfter += effectiveTokensAfter;
    if (!timeBasedCleared && !compacted.compacted && !artifacts.files.length && !artifacts.skills.length && !artifacts.verification.length && !artifacts.blockers.length) continue;
    records.push({
      messageId: messageIdentity(message, index),
      index,
      role: message?.role || "",
      actor: messageActor(message),
      agent: message?.agent || "",
      taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
      status: extractMessageStatus(message),
      timestamp: String(message?.timestamp || message?.time || ""),
      compacted: timeBasedCleared || compacted.compacted,
      compactReason: timeBasedCleared ? "time_based_microcompact" : compacted.compacted ? "size_based_microcompact" : "artifact_index",
      timeBasedCleared,
      originalChars: compacted.original_chars,
      compactedChars: timeBasedCleared ? clearedText.length : compacted.compacted_chars,
      tokensBefore: compacted.tokens_before,
      tokensAfter: effectiveTokensAfter,
      tokensFreed: Math.max(0, compacted.tokens_before - effectiveTokensAfter),
      checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
      text: timeBasedCleared ? clearedText : compacted.compacted ? compacted.text : compactText(content, Math.min(maxChars, 900)),
      files: artifacts.files,
      skills: artifacts.skills,
      verification: artifacts.verification,
      blockers: artifacts.blockers,
    });
  }
  const boundedRecords = records.slice(-GROUP_MICRO_COMPACT_MAX_RECORDS);
  const compactedRecords = boundedRecords.filter(item => item.compacted);
  return {
    schema: "ccm-group-micro-compact-v1",
    version: GROUP_MICRO_COMPACT_VERSION,
    sourceMessageCount: (messages || []).length,
    recordCount: boundedRecords.length,
    compactedMessageCount: compactedRecords.length,
    tokensBefore,
    tokensAfter,
    tokensFreed: Math.max(0, tokensBefore - tokensAfter),
    maxChars,
    timeBased: {
      ...timeBased,
      clearSet: undefined,
      keepSet: undefined,
    },
    records: boundedRecords,
  };
}

export function buildPostCompactReinjectionPlan(messages: any[], microCompact: any = {}, options: any = {}) {
  const fileBudget = Math.max(1, Number(options.fileBudget || options.file_budget || GROUP_POST_COMPACT_FILE_BUDGET));
  const skillBudget = Math.max(1, Number(options.skillBudget || options.skill_budget || GROUP_POST_COMPACT_SKILL_BUDGET));
  const verificationBudget = Math.max(1, Number(options.verificationBudget || options.verification_budget || GROUP_POST_COMPACT_VERIFICATION_BUDGET));
  const taskStatusBudget = Math.max(1, Number(options.taskStatusBudget || options.task_status_budget || GROUP_POST_COMPACT_TASK_STATUS_BUDGET));
  const fileRows: any[] = [];
  const skillRows: any[] = [];
  const verificationRows: any[] = [];
  const blockerRows: any[] = [];
  const addRows = (rows: any[], values: string[], source: any, kind: string) => {
    for (const value of values || []) rows.push({
      value,
      sourceMessageId: source.messageId || source.id || "",
      actor: source.actor || "",
      taskId: source.taskId || "",
      status: source.status || "",
      kind,
    });
  };
  for (let index = 0; index < (messages || []).length; index += 1) {
    const message = messages[index];
    const source = {
      messageId: messageIdentity(message, index),
      actor: messageActor(message),
      taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
      status: extractMessageStatus(message),
    };
    const artifacts = extractPostCompactArtifacts(message);
    addRows(fileRows, artifacts.files, source, "file");
    addRows(skillRows, artifacts.skills, source, "skill");
    addRows(verificationRows, artifacts.verification, source, "verification");
    addRows(blockerRows, artifacts.blockers, source, "blocker");
  }
  for (const record of Array.isArray(microCompact?.records) ? microCompact.records : []) {
    addRows(fileRows, record.files || [], record, "file");
    addRows(skillRows, record.skills || [], record, "skill");
    addRows(verificationRows, record.verification || [], record, "verification");
    addRows(blockerRows, record.blockers || [], record, "blocker");
  }
  const uniqueRows = (rows: any[], limit: number) => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const row of rows.reverse()) {
      const key = String(row.value || "").toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.unshift(row);
      if (result.length >= limit) break;
    }
    return result;
  };
  const fileCandidates = uniqueRows(fileRows, Math.max(fileBudget, fileRows.length || fileBudget));
  const exactGroupId = String(options.groupId || options.group_id || "").trim();
  const exactGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  const preservedFileDedupProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
    ? buildGroupPostCompactFileRestoreDedupProjection(fileCandidates, options.preservedMessages || options.preserved_messages || [], {
      groupId: exactGroupId,
      groupSessionId: exactGroupSessionId,
      fileBudget,
      now: options.now,
    })
    : null;
  const invokedSkillAttachmentProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
    ? buildGroupPostCompactInvokedSkillAttachmentProjection(options.sessionMessages || options.session_messages || messages, {
      groupId: exactGroupId,
      groupSessionId: exactGroupSessionId,
      singleSkillMaxTokens: options.invokedSkillSingleMaxTokens || options.invoked_skill_single_max_tokens,
      totalMaxTokens: options.invokedSkillsTotalMaxTokens || options.invoked_skills_total_max_tokens,
      skillCatalog: options.skillCatalog || options.skill_catalog,
      now: options.now,
    })
    : null;
  const planAttachmentProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
    ? buildGroupPostCompactPlanAttachmentProjection(options.tasks || options.activeTasks || options.active_tasks || [], {
      groupId: exactGroupId,
      groupSessionId: exactGroupSessionId,
      currentTaskId: options.currentTaskId || options.current_task_id,
      sessionMessages: options.sessionMessages || options.session_messages || messages,
      now: options.now,
    })
    : null;
  const dynamicContextDeltaProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
    ? buildGroupPostCompactDynamicContextDeltaProjection(options.dynamicContextCatalog || options.dynamic_context_catalog || {}, {
      groupId: exactGroupId,
      groupSessionId: exactGroupSessionId,
      scanMode: options.dynamicContextScanMode || options.dynamic_context_scan_mode || "full",
      sourceMessages: options.sessionMessages || options.session_messages || messages,
      preCompactLoadedToolNames: options.preCompactLoadedToolNames || options.pre_compact_loaded_tool_names || [],
      preservedMessages: options.preservedMessages || options.preserved_messages || [],
      priorAttachments: options.priorDynamicContextAttachments || options.prior_dynamic_context_attachments || [],
      now: options.now,
    })
    : null;
  const files = preservedFileDedupProjection?.files || fileCandidates.slice(-fileBudget);
  const skills = uniqueRows(skillRows, skillBudget);
  const verification = uniqueRows(verificationRows, verificationBudget);
  const blockers = uniqueRows(blockerRows, verificationBudget);
  const taskStatusMap = new Map<string, any>();
  for (const row of Array.isArray(options.taskStatuses || options.task_statuses) ? (options.taskStatuses || options.task_statuses) : []) {
    const taskId = String(row?.task_id || row?.taskId || "").trim();
    const value = compactText(row?.value || "", 1200);
    if (!taskId || !value) continue;
    taskStatusMap.delete(taskId);
    taskStatusMap.set(taskId, { ...row, task_id: taskId, kind: "task_status", value });
  }
  const taskStatuses = [...taskStatusMap.values()].slice(-taskStatusBudget);
  return {
    schema: "ccm-post-compact-reinjection-v1",
    version: GROUP_POST_COMPACT_REINJECT_VERSION,
    strategy: "restore_artifact_hints_after_summary_compact",
    budgets: {
      files: fileBudget,
      skills: skillBudget,
      verification: verificationBudget,
      taskStatuses: taskStatusBudget,
      invokedSkillSingleTokens: GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS,
      invokedSkillsTotalTokens: GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS,
      currentPlanTokens: GROUP_POST_COMPACT_PLAN_MAX_TOKENS,
      dynamicContextTokens: GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS,
    },
    files,
    skills,
    verification,
    blockers,
    taskStatuses,
    preservedFileDedup: preservedFileDedupProjection?.receipt || null,
    invokedSkillAttachments: invokedSkillAttachmentProjection?.attachments || [],
    invokedSkillAttachmentReceipt: invokedSkillAttachmentProjection?.receipt || null,
    planAttachment: planAttachmentProjection?.attachment || null,
    planAttachmentReceipt: planAttachmentProjection?.receipt || null,
    dynamicContextDeltaAttachment: dynamicContextDeltaProjection?.attachment || null,
    dynamicContextDeltaReceipt: dynamicContextDeltaProjection?.receipt || null,
    hasCandidates: !!(files.length || skills.length || verification.length || blockers.length || taskStatuses.length || invokedSkillAttachmentProjection?.attachments?.length || planAttachmentProjection?.attachment || dynamicContextDeltaProjection?.attachment),
  };
}

export function buildGroupPostCompactRecoveryAudit(input: any = {}) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const boundary = input.boundary || {};
  const preservedSegment = input.preservedSegment || boundary.preservedSegment || boundary.post_compact_restore?.preservedSegment || null;
  const reinjectionPlan = input.postCompactReinject || boundary.post_compact_restore?.reinjectionPlan || null;
  const contextPressureWarning = input.contextPressureWarning || null;
  const contextBudget = input.contextBudget || boundary.context_budget || null;
  const transcriptPath = String(input.transcriptPath || boundary.post_compact_restore?.transcriptPath || "");
  const summaryChecksum = String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || "");
  const fromIndex = messages.findIndex((message: any, index: number) => messageIdentity(message, index) === boundary.summarizedFromMessageId);
  const throughIndex = messages.findIndex((message: any, index: number) => messageIdentity(message, index) === boundary.summarizedThroughMessageId);
  const keepIndex = Number(input.keepIndex ?? throughIndex + 1);
  const ptlEmergency = input.ptlEmergency || boundary.ptlEmergency || boundary.post_compact_restore?.ptlEmergency || null;
  const ptlRecovery = input.ptlRecovery || boundary.ptlRecovery || boundary.post_compact_restore?.ptlRecovery || null;
  const partialSidecarSegment = input.partialSidecarSegment || boundary.partialSidecarSegment || boundary.post_compact_restore?.partialSidecarSegment || null;
  const candidateCounts = {
    files: Array.isArray(reinjectionPlan?.files) ? reinjectionPlan.files.length : 0,
    skills: Array.isArray(reinjectionPlan?.skills) ? reinjectionPlan.skills.length : 0,
    verification: Array.isArray(reinjectionPlan?.verification) ? reinjectionPlan.verification.length : 0,
    blockers: Array.isArray(reinjectionPlan?.blockers) ? reinjectionPlan.blockers.length : 0,
    taskStatuses: Array.isArray(reinjectionPlan?.taskStatuses) ? reinjectionPlan.taskStatuses.length : 0,
  };
  const addCheck = (checks: any[], id: string, label: string, pass: boolean, severity: string, detail: string, evidence: any[] = []) => {
    checks.push({
      id,
      label,
      pass: pass === true,
      severity,
      detail: compactText(detail, 700),
      evidence: evidence.map(item => compactText(item, 260)).filter(Boolean).slice(0, 6),
    });
  };
  const checks: any[] = [];
  addCheck(checks, "raw_transcript_path_recorded", "raw transcript path recorded", !!transcriptPath, "fatal", transcriptPath ? `raw transcript: ${transcriptPath}` : "missing raw transcript path");
  addCheck(checks, "boundary_range_resolvable", "compacted boundary range resolvable", fromIndex >= 0 && throughIndex >= fromIndex, "fatal", `from=${boundary.summarizedFromMessageId || ""}(${fromIndex}) through=${boundary.summarizedThroughMessageId || ""}(${throughIndex})`);
  addCheck(checks, "compact_window_matches_keep_index", "compact window matches keep index", throughIndex >= 0 && keepIndex === throughIndex + 1, "high", `keepIndex=${keepIndex}, expected=${throughIndex + 1}`);
  addCheck(checks, "summary_checksum_present", "summary checksum present", summaryChecksum.length >= 12, "fatal", summaryChecksum ? `checksum=${summaryChecksum}` : "missing summary checksum");
  addCheck(checks, "summary_digest_available", "summary digest available", !!String(input.messageDigest || "").trim() || !!Object.keys(input.conversationSummary || {}).length, "high", "conversation summary can be rendered for child-agent packet");
  addCheck(checks, "preserved_segment_recorded", "preserved raw segment recorded", preservedSegment?.schema === "ccm-group-preserved-segment-v1" && Number(preservedSegment.preservedMessageCount || 0) > 0, "high", preservedSegment?.schema ? `preserved=${preservedSegment.preservedMessageCount || 0}, first=${preservedSegment.firstPreservedMessageId || ""}, last=${preservedSegment.lastPreservedMessageId || ""}` : "missing preservedSegment");
  addCheck(checks, "post_compact_reinject_plan_recorded", "post compact reinjection plan recorded", reinjectionPlan?.schema === "ccm-post-compact-reinjection-v1", "high", reinjectionPlan?.schema ? `candidates=${candidateCounts.files + candidateCounts.skills + candidateCounts.verification + candidateCounts.blockers + candidateCounts.taskStatuses}` : "missing reinjection plan");
  addCheck(checks, "context_budget_recorded", "context budget recorded", Number(contextBudget?.estimated_tokens || 0) > 0 && Number(contextBudget?.max_tokens || 0) > 0, "medium", `estimated=${contextBudget?.estimated_tokens || 0}, max=${contextBudget?.max_tokens || 0}, pressure=${contextBudget?.pressure ?? ""}`);
  addCheck(checks, "post_compact_warning_suppressed", "post compact warning suppressed until next sample", contextPressureWarning?.schema === "ccm-group-compact-warning-v1" && contextPressureWarning.suppressed === true, "medium", contextPressureWarning?.schema ? `level=${contextPressureWarning.level || ""}, suppressed=${contextPressureWarning.suppressed === true}` : "missing context pressure warning");
  addCheck(checks, "ptl_state_consistent", "PTL emergency and recovery are mutually exclusive", !(ptlEmergency?.engaged && ptlRecovery?.recovered), "fatal", `emergency=${ptlEmergency?.engaged === true}, recovery=${ptlRecovery?.recovered === true}`);
  addCheck(checks, "partial_sidecar_raw_contract", "partial sidecar keeps raw transcript contract", !partialSidecarSegment || partialSidecarSegment.rawTranscriptUnmodified === true, "medium", partialSidecarSegment ? `sidecar=${partialSidecarSegment.id || ""}, rawUnmodified=${partialSidecarSegment.rawTranscriptUnmodified === true}` : "no partial sidecar");
  const failed = checks.filter(check => !check.pass);
  const fatalFailed = failed.some(check => check.severity === "fatal");
  const highFailed = failed.some(check => check.severity === "high");
  const status = fatalFailed ? "failed" : highFailed || failed.length ? "degraded" : "pass";
  return {
    schema: "ccm-post-compact-recovery-audit-v1",
    version: GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION,
    status,
    pass: status === "pass",
    action: status === "pass"
      ? "safe_to_inject_child_agent_memory_packet"
      : status === "degraded"
        ? "inject_with_raw_recovery_warning"
        : "repair_or_rebuild_memory_before_dispatch",
    createdAt: input.now || new Date().toISOString(),
    groupId: String(input.groupId || ""),
    boundaryId: String(boundary.id || ""),
    summarizedFromMessageId: String(boundary.summarizedFromMessageId || ""),
    summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || ""),
    compactedMessageCount: Number(boundary.summarizedMessageCount || 0),
    keepIndex,
    messageCount: messages.length,
    keptRecentMessageCount: Math.max(0, messages.length - keepIndex),
    summaryChecksum,
    transcriptPath,
    candidateCounts,
    cleanupPolicy: {
      resetDerivedCompactState: true,
      childAgentIsolation: "child_agent_compact_or_session_restart_must_not_clobber_group_or_global_memory_state",
      nextDispatchContext: "derive_fresh_memory_packet_from_saved_group_memory_and_raw_transcript_paths",
    },
    checks,
    failedChecks: failed.map(check => check.id),
    passedChecks: checks.length - failed.length,
    checkCount: checks.length,
  };
}

export function buildGroupPostCompactCleanupAudit(input: any = {}) {
  const boundary = input.boundary || {};
  const restore = boundary.post_compact_restore || {};
  const groupId = String(input.groupId || "");
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "");
  const partialSidecarOnly = input.partialSidecarOnly === true;
  const scopeId = groupId && groupSessionId ? `${groupId}::${groupSessionId}` : "";
  const compactSource = {
    kind: "group_main_agent",
    querySource: `group_main:${scopeId}`,
    mainThreadEquivalent: true,
    taskAgentSessionId: "",
    nativeSessionId: "",
  };
  const cleanupScope = {
    kind: partialSidecarOnly ? "exact_group_session_partial_sidecar" : "exact_group_session_and_descendant_provider_state",
    groupId,
    groupSessionId,
    scopeId,
    allowsExactGroupSessionReset: !partialSidecarOnly,
    allowsDescendantProviderReset: !partialSidecarOnly,
    allowsOtherGroupSessionReset: false,
    allowsGlobalReset: false,
  };
  const microCompact = input.microCompact || restore.microCompact || null;
  const reinjectionPlan = input.postCompactReinject || restore.reinjectionPlan || null;
  const recoveryAudit = input.postCompactRecoveryAudit || restore.recoveryAudit || null;
  const compactStrategyDecision = input.compactStrategyDecision || restore.strategyDecision || boundary.compactStrategyDecision || null;
  const apiMicroCompactEditPlan = input.apiMicroCompactEditPlan || restore.apiMicroCompactEditPlan || boundary.apiMicroCompactEditPlan || null;
  const transcriptPath = String(input.transcriptPath || restore.transcriptPath || compactStrategyDecision?.transcriptPath || "");
  const preservedSegment = input.preservedSegment || restore.preservedSegment || compactStrategyDecision?.preservedSegment || null;
  const skillHints = uniqueStrings([
    ...stringArray((reinjectionPlan?.skills || []).map((item: any) => item.value || item.name || item), 20),
    ...(Array.isArray(microCompact?.records) ? microCompact.records.flatMap((record: any) => stringArray(record.skills || [], 8)) : []),
  ], 24);
  const checks: any[] = [];
  const addCheck = (id: string, label: string, pass: boolean, severity: string, detail: string, evidence: any[] = []) => {
    checks.push({
      id,
      label,
      pass: pass === true,
      severity,
      detail: compactText(detail, 700),
      evidence: evidence.map(item => compactText(item, 260)).filter(Boolean).slice(0, 6),
    });
  };
  addCheck(
    "exact_group_session_bound",
    "cleanup is bound to one exact group session",
    !!groupId && groupSessionId.startsWith("gcs_") && scopeId === `${groupId}::${groupSessionId}`,
    "fatal",
    scopeId || "missing exact group-session scope"
  );
  addCheck(
    "main_agent_source_qualified",
    "cleanup source is the group main Agent",
    compactSource.kind === "group_main_agent" && compactSource.mainThreadEquivalent === true,
    "fatal",
    `${compactSource.kind}; querySource=${compactSource.querySource}`
  );
  addCheck(
    "cross_scope_reset_forbidden",
    "cleanup cannot reset other group sessions or global Agent state",
    cleanupScope.allowsOtherGroupSessionReset === false && cleanupScope.allowsGlobalReset === false,
    "fatal",
    `otherGroupSession=${cleanupScope.allowsOtherGroupSessionReset}; global=${cleanupScope.allowsGlobalReset}`
  );
  addCheck(
    "microcompact_tracking_reset_policy",
    "microcompact tracking reset policy recorded",
    !!microCompact?.schema || Number(microCompact?.recordCount || 0) === 0,
    "medium",
    microCompact?.schema
      ? `microCompact=${microCompact.schema}; records=${microCompact.recordCount || 0}; compacted=${microCompact.compactedMessageCount || 0}`
      : "no microcompact records; cleanup policy still records reset boundary"
  );
  addCheck(
    "raw_transcript_preserved",
    "raw transcript preserved before cleanup",
    !!transcriptPath,
    "fatal",
    transcriptPath ? `raw transcript=${transcriptPath}` : "missing raw transcript path"
  );
  addCheck(
    "child_context_packets_rebuilt",
    "child context packets must be rebuilt after compact",
    true,
    "high",
    "next child Agent dispatch derives a fresh memory packet from group memory, source manifest, gates, and raw transcript"
  );
  addCheck(
    "invoked_skills_preserved",
    "invoked skills are preserved across cleanup",
    true,
    "high",
    skillHints.length
      ? `preserved skill hints: ${skillHints.slice(0, 6).join(", ")}`
      : "no invoked skill hints detected; cleanup policy intentionally does not clear skill continuity snapshots"
  );
  addCheck(
    "recovery_audit_linked",
    "cleanup is linked to recovery audit",
    recoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1" || input.partialSidecarOnly === true,
    "high",
    recoveryAudit?.schema
      ? `recovery=${recoveryAudit.status || "unknown"}; action=${recoveryAudit.action || ""}`
      : input.partialSidecarOnly === true
        ? "partial sidecar only; primary recovery audit not required"
        : "missing post compact recovery audit"
  );
  addCheck(
    "strategy_decision_linked",
    "cleanup is linked to strategy decision",
    compactStrategyDecision?.schema === "ccm-group-compact-strategy-decision-v1",
    "high",
    compactStrategyDecision?.schema
      ? `mode=${compactStrategyDecision.mode || "unknown"}; decision=${compactStrategyDecision.decisionId || ""}`
      : "missing compact strategy decision"
  );
  addCheck(
    "api_microcompact_edit_plan_recorded",
    "API microcompact edit plan recorded",
    apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1" || input.partialSidecarOnly === true,
    "medium",
    apiMicroCompactEditPlan?.schema
      ? `edits=${apiMicroCompactEditPlan.editCount || 0}; advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}; trigger=${apiMicroCompactEditPlan.trigger?.value || ""}`
      : input.partialSidecarOnly === true
        ? "partial sidecar only; primary API context edit plan not required"
        : "missing API microcompact edit plan"
  );
  addCheck(
    "preserved_segment_survives_cleanup",
    "preserved segment survives cleanup",
    preservedSegment?.schema === "ccm-group-preserved-segment-v1" || input.partialSidecarOnly === true,
    "high",
    preservedSegment?.schema
      ? `preserved=${preservedSegment.preservedMessageCount || 0}; first=${preservedSegment.firstPreservedMessageId || ""}; last=${preservedSegment.lastPreservedMessageId || ""}`
      : input.partialSidecarOnly === true
        ? "partial sidecar keeps raw transcript unchanged"
        : "missing preserved segment"
  );
  const failed = checks.filter(check => !check.pass);
  const fatalFailed = failed.some(check => check.severity === "fatal");
  const highFailed = failed.some(check => check.severity === "high");
  const status = fatalFailed ? "failed" : highFailed || failed.length ? "degraded" : "pass";
  const cleanupActions = [
    {
      id: "reset_microcompact_tracking",
      action: partialSidecarOnly ? "retain_derived_state_without_primary_boundary" : "reset_exact_group_session_derived_microcompact_state",
      status: partialSidecarOnly ? "not_applicable" : "recorded",
      evidence: microCompact?.schema || "no_microcompact_records",
    },
    {
      id: "rebuild_child_context_packets",
      action: "derive_fresh_child_agent_memory_context_after_compact",
      status: "required",
      evidence: compactStrategyDecision?.decisionId || boundary.id || "",
    },
    {
      id: "preserve_skill_continuity",
      action: "do_not_clear_invoked_skill_or_tool_continuity_snapshots",
      status: "recorded",
      evidence: skillHints.slice(0, 8),
    },
    {
      id: "preserve_raw_recovery_sources",
      action: "keep_group_messages_json_and_typed_memory_as_source_of_truth",
      status: transcriptPath ? "recorded" : "missing",
      evidence: transcriptPath,
    },
    {
      id: "do_not_delete_ledgers",
      action: "candidate_usage_replay_hook_and_dispatch_ledgers_are_retained_for_audit",
      status: "recorded",
      evidence: input.hookRunId || input.groupId || "",
    },
    {
      id: "record_api_context_management_plan",
      action: "surface_clear_thinking_and_tool_result_edit_plan_to_supported_child_executors",
      status: apiMicroCompactEditPlan?.schema ? "recorded" : "missing",
      evidence: apiMicroCompactEditPlan?.planChecksum || "",
    },
  ];
  const payload: any = {
    schema: "ccm-post-compact-cleanup-audit-v2",
    version: GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION,
    status,
    pass: status === "pass",
    action: status === "pass"
      ? "cleanup_recorded_and_safe_to_dispatch_fresh_child_context"
      : status === "degraded"
        ? "dispatch_with_cleanup_warning_and_rebuild_context"
        : "repair_cleanup_contract_before_dispatch",
    createdAt: input.now || new Date().toISOString(),
    groupId,
    groupSessionId,
    scopeId,
    compactSource,
    cleanupScope,
    boundaryId: String(boundary.id || ""),
    compactStrategyDecisionId: String(compactStrategyDecision?.decisionId || ""),
    apiMicroCompactEditPlanId: String(apiMicroCompactEditPlan?.planChecksum || ""),
    mode: String(compactStrategyDecision?.mode || ""),
    transcriptPath,
    summaryChecksum: String(input.summaryChecksum || restore.summaryChecksum || compactStrategyDecision?.summaryChecksum || ""),
    partialSidecarOnly,
    preserveInvokedSkills: true,
    preserveToolContinuity: true,
    resetDerivedCompactState: !partialSidecarOnly,
    childAgentIsolation: "child_provider_compact_may_only_reset_its_exact_tas_native_scope_and_must_not_clobber_group_or_global_memory",
    sourceOfTruth: "group memory json + group messages transcript + typed MEMORY.md sidecars",
    skillHints,
    apiMicroCompactEditPlan,
    cleanupActions,
    checks,
    failedChecks: failed.map(check => check.id),
    passedChecks: checks.length - failed.length,
    checkCount: checks.length,
  };
  return { ...payload, audit_checksum: groupPostCompactCleanupAuditChecksum(payload) };
}

function buildGroupPartialCompactSidecarSegment(input: any) {
  const partial = input.partialCompact || {};
  if (!partial?.enabled || !partial?.sidecar) return null;
  const start = Math.max(0, Math.min((input.messages || []).length, Number(partial.rangeStartIndex ?? partial.selectedIndex ?? 0)));
  const end = Math.max(start, Math.min((input.messages || []).length - 1, Number(partial.rangeEndIndex ?? partial.selectedIndex ?? start)));
  const messagesToSummarize = (input.messages || []).slice(start, end + 1);
  if (!messagesToSummarize.length) return null;
  const fallback = buildDeterministicConversationSummary(messagesToSummarize, input.memory || {}, createEmptyConversationSummary());
  const validation = validateSummaryPreservesFallback(fallback, fallback);
  const factAnchors = mergeFactAnchors([], extractFactAnchors(messagesToSummarize));
  const persistentRequirements = mergePersistentRequirements([], extractPersistentRequirements(messagesToSummarize));
  const quality = evaluateGroupMemorySummaryQuality(fallback, fallback, messagesToSummarize, input.memory || {}, {
    evaluatedAt: input.now,
    factAnchors,
    persistentRequirements,
  });
  const microCompact = buildGroupMicroCompactPlan(messagesToSummarize, input.config?.microCompact || input.config?.groupMicroCompact || {});
  const reinjectionPlan = buildPostCompactReinjectionPlan(messagesToSummarize, microCompact, {
    ...(input.config?.postCompactReinject || {}),
    groupId: input.groupId,
    groupSessionId: input.groupSessionId,
    sessionMessages: input.messages || [],
    preservedMessages: [
      ...(input.messages || []).slice(0, start),
      ...(input.messages || []).slice(end + 1),
    ],
    taskStatuses: input.postCompactTaskStatuses || input.post_compact_task_statuses || [],
    tasks: input.activeTasks || input.active_tasks || [],
    currentTaskId: input.currentTaskId || input.current_task_id || input.config?.currentTaskId || input.config?.current_task_id,
    dynamicContextCatalog: input.config?.postCompactDynamicContextCatalog || input.config?.post_compact_dynamic_context_catalog || {},
    dynamicContextScanMode: "partial",
    preCompactLoadedToolNames: [
      ...(input.memory?.compactBoundary?.compactMetadata?.preCompactDiscoveredTools || []),
      ...(input.memory?.compaction?.preCompactDiscoveredTools || []),
    ],
    priorDynamicContextAttachments: [
      input.memory?.compaction?.postCompactReinject?.dynamicContextDeltaAttachment,
      input.memory?.compactBoundary?.post_compact_restore?.reinjectionPlan?.dynamicContextDeltaAttachment,
    ].filter(Boolean),
    now: input.now,
  });
  const sourceTokens = messagesToSummarize.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0);
  const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(fallback)).digest("hex").slice(0, 24);
  const segmentKey = crypto.createHash("sha256").update([
    partial.direction,
    partial.summarizedFromMessageId,
    partial.summarizedThroughMessageId,
    summaryChecksum,
  ].join("\n")).digest("hex").slice(0, 20);
  return {
    schema: "ccm-group-partial-compact-segment-v1",
    version: GROUP_PARTIAL_COMPACT_VERSION,
    id: `partial-${segmentKey}`,
    direction: partial.direction,
    sidecar: true,
    range: {
      startIndex: start,
      endIndex: end,
      fromMessageId: messageIdentity(messagesToSummarize[0], start),
      throughMessageId: messageIdentity(messagesToSummarize[messagesToSummarize.length - 1], end),
      messageCount: messagesToSummarize.length,
    },
    sourceTokens,
    summary: fallback,
    messageDigest: renderConversationSummary(fallback, Number(input.config?.partialSegmentDigestChars || 6000)),
    summaryChecksum,
    validation,
    quality: {
      score: quality.score,
      status: quality.status,
      pass: quality.pass,
      driftDetected: quality.drift.detected,
    },
    microCompact,
    reinjectionPlan,
    factAnchors,
    persistentRequirements,
    rawTranscriptPath: input.transcriptPath,
    rawTranscriptUnmodified: true,
    reason: compactText(partial.reason || "", 500),
    createdAt: input.now || new Date().toISOString(),
  };
}

function mergeGroupPartialCompactSegments(existing: any[] = [], incoming: any = null, limit = GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT) {
  const keyed = new Map<string, any>();
  for (const segment of Array.isArray(existing) ? existing : []) {
    const key = segment?.id || `${segment?.range?.fromMessageId || ""}:${segment?.range?.throughMessageId || ""}:${segment?.summaryChecksum || ""}`;
    if (!key) continue;
    keyed.set(String(key), segment);
  }
  if (incoming) {
    const key = incoming.id || `${incoming?.range?.fromMessageId || ""}:${incoming?.range?.throughMessageId || ""}:${incoming?.summaryChecksum || ""}`;
    if (key) {
      keyed.delete(String(key));
      keyed.set(String(key), incoming);
    }
  }
  return [...keyed.values()].slice(-limit);
}

function buildPartialSidecarOnlyMemory(input: any) {
  const previousState = input.memory?.compaction || {};
  const partialSegments = mergeGroupPartialCompactSegments(previousState.partialSegments, input.partialSegment);
  const compactStrategyDecision = input.compactStrategyDecision || previousState.compactStrategyDecision || null;
  const postCompactCleanupAudit = input.postCompactCleanupAudit || previousState.postCompactCleanupAudit || null;
  const apiMicroCompactEditPlan = input.apiMicroCompactEditPlan || previousState.apiMicroCompactEditPlan || null;
  return {
    ...input.memory,
    factAnchors: mergeFactAnchors(input.memory?.factAnchors, Array.isArray(input.partialSegment?.factAnchors) ? input.partialSegment.factAnchors : []),
    persistentRequirements: mergePersistentRequirements(input.memory?.persistentRequirements, Array.isArray(input.partialSegment?.persistentRequirements) ? input.partialSegment.persistentRequirements : []),
    compaction: {
      ...previousState,
      version: GROUP_MEMORY_COMPACTION_VERSION,
      enabled: true,
      health: previousState.health || "partial_sidecar",
      partialCompact: input.partialCompact,
      partialSegments,
      lastPartialCompactedAt: input.now,
      lastPartialSegmentId: input.partialSegment?.id || "",
      transcriptPath: input.transcriptPath,
      compactStrategyDecision,
      postCompactCleanupAudit,
      postCompactTaskStatusProjection: input.postCompactTaskStatusProjection || previousState.postCompactTaskStatusProjection || null,
      apiMicroCompactEditPlan,
    },
    messageCompression: {
      ...(input.memory?.messageCompression || {}),
      enabled: true,
      strategy: "cc-session-memory-v3+partial-sidecar",
      totalMessages: (input.messages || []).length,
      partialCompact: input.partialCompact,
      partialSegments: partialSegments.slice(-GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
      compactStrategyDecision,
      postCompactCleanupAudit,
      postCompactTaskStatusProjection: input.postCompactTaskStatusProjection || input.memory?.messageCompression?.postCompactTaskStatusProjection || null,
      apiMicroCompactEditPlan,
      lastCompressedAt: input.now,
    },
  };
}

function normalizeHookAnchor(raw: any, index: number, type: FactAnchor["type"] = "user_requirement"): FactAnchor | null {
  const text = compactText(raw?.text || raw?.requirement || raw?.value || raw, 2000);
  if (!text) return null;
  const messageId = String(raw?.messageId || raw?.message_id || `hook-${index}`);
  return {
    id: String(raw?.id || `${messageId}:${type}`),
    type: String(raw?.type || type) === "dispatch_decision" ? "dispatch_decision" : "user_requirement",
    messageId,
    text,
    timestamp: String(raw?.timestamp || raw?.time || ""),
    checksum: crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16),
  };
}

function extractHookAnchors(results: any[], key: string, type: FactAnchor["type"]) {
  const anchors: FactAnchor[] = [];
  for (const entry of results || []) {
    const result = entry?.result || {};
    const values = [
      ...(Array.isArray(result?.[key]) ? result[key] : []),
      ...(key === "persistentRequirements" && Array.isArray(result?.mustKeep) ? result.mustKeep : []),
      ...(key === "factAnchors" && Array.isArray(result?.anchors) ? result.anchors : []),
    ];
    values.forEach((item, index) => {
      const anchor = normalizeHookAnchor(item, anchors.length + index, type);
      if (anchor) anchors.push(anchor);
    });
  }
  return anchors;
}

function memorySeed(memory: any) {
  const completed = (memory?.completed || []).slice(-12).map((item: any) => `${item.project || "unknown"}: ${item.summary || ""}`);
  const blocked = (memory?.blocked || []).slice(-10).map((item: any) => `${item.project || "unknown"}: ${item.reason || item.summary || ""}`);
  const decisions = (memory?.decisions || []).slice(-12).map((item: any) => `${item.decision || ""}${item.reason ? `（${item.reason}）` : ""}`);
  return { completed, blocked, decisions };
}

export function buildDeterministicConversationSummary(messages: any[], memory: any, previous: any = {}): ConversationSummary {
  const base = { ...createEmptyConversationSummary(), ...(previous || {}) } as ConversationSummary;
  const users: string[] = [];
  const files: string[] = [];
  const errors: string[] = [];
  const decisions: string[] = [];
  const completed: string[] = [];
  const pending: string[] = [];
  const participantState: string[] = [];
  const taskStates: string[] = [];
  const runtimeFacts: string[] = [];

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const id = messageIdentity(message, index);
    const actor = message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
    if (message?.role === "user") users.push(`#${id} ${compactText(content, 900)}`);
    files.push(...extractFiles(message));
    runtimeFacts.push(...extractRuntimeSkillFacts(message));
    if (/(错误|失败|异常|阻塞|超时|拒绝|error|failed|timeout|blocked)/i.test(content)) errors.push(`${actor}: ${compactText(content, 600)}`);
    if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
      decisions.push(`${actor}: ${message?.dispatchPolicy?.action || "delegate"}；${compactText(message?.dispatchPolicy?.reason || content, 500)}`);
      for (const assignment of message.assignments || []) {
        if (!["done", "complete", "completed", "success"].includes(String(assignment?.status || "").toLowerCase())) {
          pending.push(`${assignment?.project || assignment?.target || "unknown"}: ${compactText(assignment?.task || assignment?.reason || "待执行", 500)}`);
        }
      }
    }
    const receiptStatus = String(message?.receipt?.status || message?.delivery_summary?.status || "").toLowerCase();
    const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
    if (taskId && receiptStatus) taskStates.push(`[${taskId}] ${receiptStatus}；${actor}：${compactText(message?.receipt?.summary || message?.delivery_summary?.headline || content, 500)}`);
    if (["done", "complete", "completed", "success"].includes(receiptStatus) || message?.delivery_summary?.has_final_review) {
      completed.push(`${actor}: ${compactText(message?.delivery_summary?.headline || message?.receipt?.summary || content, 600)}`);
    }
    if (message?.agent) participantState.push(`${message.agent}: ${receiptStatus || message?.workflow?.phase || "最近有发言"}`);
  }

  const seed = memorySeed(memory);
  const latestUser = [...messages].reverse().find((item: any) => item?.role === "user" && messageContent(item));
  const latestMessage = [...messages].reverse().find((item: any) => messageContent(item));
  const nextAction = (memory?.nextActions || []).slice(-1)[0];
  return {
    primaryRequest: compactText(messageContent(latestUser) || base.primaryRequest || memory?.goal, 1200),
    userMessages: mergeUnique(base.userMessages, users, 40, 900),
    keyConcepts: mergeUnique(base.keyConcepts, runtimeFacts, 24, 400),
    filesAndCode: mergeUnique(base.filesAndCode, files, 40, 500),
    errorsAndFixes: mergeUnique(base.errorsAndFixes, errors, 30, 700),
    decisions: mergeUnique(base.decisions, [...seed.decisions, ...decisions], 30, 700),
    completedWork: mergeUnique(base.completedWork, [...seed.completed, ...completed], 30, 700),
    pendingTasks: mergeUnique(base.pendingTasks, [...seed.blocked, ...pending], 30, 700),
    currentWork: compactText(messageContent(latestMessage) || base.currentWork, 1200),
    nextStep: compactText(nextAction?.action || nextAction || base.nextStep, 900),
    participantState: mergeUnique(base.participantState, participantState, 20, 400),
    taskStates: mergeTaskStates(base.taskStates, taskStates, 30),
  };
}

function normalizeSummary(value: any, fallback: ConversationSummary): ConversationSummary {
  const raw = value?.conversationSummary || value?.summary || value || {};
  return {
    primaryRequest: compactText(raw.primaryRequest || raw.primary_request || fallback.primaryRequest, 1200),
    userMessages: mergeUnique([], raw.userMessages || raw.user_messages || fallback.userMessages, 40, 900),
    keyConcepts: mergeUnique([], raw.keyConcepts || raw.key_concepts || fallback.keyConcepts, 24, 400),
    filesAndCode: mergeUnique([], raw.filesAndCode || raw.files_and_code || fallback.filesAndCode, 40, 500),
    errorsAndFixes: mergeUnique([], raw.errorsAndFixes || raw.errors_and_fixes || fallback.errorsAndFixes, 30, 700),
    decisions: mergeUnique([], raw.decisions || fallback.decisions, 30, 700),
    completedWork: mergeUnique([], raw.completedWork || raw.completed_work || fallback.completedWork, 30, 700),
    pendingTasks: mergeUnique([], raw.pendingTasks || raw.pending_tasks || fallback.pendingTasks, 30, 700),
    currentWork: compactText(raw.currentWork || raw.current_work || fallback.currentWork, 1200),
    nextStep: compactText(raw.nextStep || raw.next_step || fallback.nextStep, 900),
    participantState: mergeUnique([], raw.participantState || raw.participant_state || fallback.participantState, 20, 400),
    taskStates: mergeTaskStates([], raw.taskStates || raw.task_states || fallback.taskStates, 30),
  };
}

export function renderConversationSummary(summary: any, maxChars = 14_000) {
  if (!summary) return "";
  const normalized = normalizeSummary(summary, createEmptyConversationSummary());
  const lines = [
    "群聊会话压缩摘要（压缩边界前的历史）：",
    `- 用户当前/最近主目标：${normalized.primaryRequest || "未明确"}`,
  ];
  const add = (title: string, items: string[], limit = 10) => {
    if (!items?.length) return;
    lines.push(`- ${title}：`);
    for (const item of items.slice(-limit)) lines.push(`  - ${item}`);
  };
  add("用户历史要求", normalized.userMessages, 14);
  add("关键概念/约束", normalized.keyConcepts, 10);
  add("文件与代码", normalized.filesAndCode, 12);
  add("错误与修复", normalized.errorsAndFixes, 10);
  add("关键决策", normalized.decisions, 10);
  add("已完成工作", normalized.completedWork, 10);
  add("待办/阻塞", normalized.pendingTasks, 10);
  add("成员状态", normalized.participantState, 8);
  add("最新任务状态（同一任务以最后一条为准）", normalized.taskStates, 12);
  if (normalized.currentWork) lines.push(`- 压缩前正在进行：${normalized.currentWork}`);
  if (normalized.nextStep) lines.push(`- 下一步：${normalized.nextStep}`);
  const text = lines.join("\n");
  if (text.length <= maxChars) return text;
  const head = Math.max(1, Math.floor(maxChars * 0.62));
  const tail = Math.max(1, maxChars - head - 36);
  return `${text.slice(0, head)}\n…[中间摘要已折叠，可回溯原始记录]…\n${text.slice(-tail)}`;
}

function buildCompactionTimeline(messages: any[]) {
  const userMessages = messages
    .filter((item: any) => item?.role === "user" && messageContent(item))
    .slice(-40)
    .map((item: any, index: number) => `${messageIdentity(item, index)} [用户 -> ${item?.target || "all"}] ${compactText(messageContent(item), 1000)}`);
  const timeline = messages.slice(-80).map((item: any, index: number) => {
    const actor = item?.role === "user" ? `用户 -> ${item?.target || "all"}` : item?.agent || item?.role || "Agent";
    return `${messageIdentity(item, index)} [${actor}] ${compactText(messageContent(item), 900)}`;
  });
  return { userMessages, timeline };
}

function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  return null;
}

function normalizeOpenAiUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/chat/completions`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}

function normalizeAnthropicUrl(value: string) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return `${base}/messages`;
  return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}

async function callCompactionModel(config: any, system: string, user: string, maxOutputTokens = GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS) {
  if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model) return null;
  const anthropic = config.format === "anthropic-compatible"
    || config.format === "auto" && String(config.apiUrl).toLowerCase().includes("anthropic")
    || /\/anthropic(?:\/|$)/i.test(String(config.apiUrl));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(10_000, Math.min(Number(config.timeoutMs) || 90_000, 120_000)));
  try {
    const response = await fetch(anthropic ? normalizeAnthropicUrl(config.apiUrl) : normalizeOpenAiUrl(config.apiUrl), {
      method: "POST",
      headers: anthropic
        ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
        : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
      body: JSON.stringify(anthropic ? {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        system,
        messages: [{ role: "user", content: user }],
      } : {
        model: config.model,
        max_tokens: maxOutputTokens,
        temperature: 0.1,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`memory compact HTTP ${response.status}: ${body.slice(0, 180)}`);
    const data = JSON.parse(body);
    const content = anthropic
      ? (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("")
      : data?.choices?.[0]?.message?.content || "";
    return {
      summary: extractJsonObject(content),
      usage: data?.usage || null,
      provider: anthropic ? "anthropic" : "openai",
      model: String(data?.model || config.model || ""),
      responseId: String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || ""),
      stopReason: String(anthropic ? data?.stop_reason || "" : data?.choices?.[0]?.finish_reason || ""),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function fitCompactionPromptToTokenBudget(system: string, user: string, maxInputTokens: number) {
  const initialTokens = estimateTextTokens(system) + estimateTextTokens(user);
  if (initialTokens <= maxInputTokens) return { user, initialTokens, finalTokens: initialTokens, clipped: false };
  let low = 256;
  let high = Math.max(low, user.length);
  let best = compactPreserveEdges(user, low, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = compactPreserveEdges(user, mid, "...[model-budget-clipped; deterministic summary and raw transcript remain recoverable]...");
    const tokens = estimateTextTokens(system) + estimateTextTokens(candidate);
    if (tokens <= maxInputTokens) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const finalTokens = estimateTextTokens(system) + estimateTextTokens(best);
  if (finalTokens > maxInputTokens) throw new Error(`memory compact request cannot fit model input budget: ${finalTokens}/${maxInputTokens}`);
  return { user: best, initialTokens, finalTokens, clipped: true };
}

export function buildGroupCompactionModelRequest(messages: any[], memory: any, fallback: ConversationSummary, config: any = {}) {
  const previous = memory?.conversationSummary || createEmptyConversationSummary();
  const summaryInputProjection = buildGroupCompactionSummaryInputProjection(messages, {
    previousSummary: previous,
    fallbackSummary: fallback,
    rebuildFallbackFromProjectedMessages: true,
    memory,
    stripReinjectedAttachments: config?.stripReinjectedCompactionAttachments !== false
      && config?.strip_reinjected_compaction_attachments !== false,
  });
  const timeline = buildCompactionTimeline(summaryInputProjection.messages);
  const system = `你是群聊 Agent 会话压缩器。只生成 JSON，不调用工具，不创建任务，不向任何 Agent 派发。
你的摘要会替代压缩边界之前的原始消息，因此必须保真并支持主 Agent 无缝续跑。
参考 Claude Code compaction：保留用户明确要求、意图变化、技术决策、文件/代码、错误与修复、已完成、未完成、当前工作和下一步。
必须合并旧摘要，不能因为新消息覆盖仍有效的旧约束；已完成与待办冲突时，以时间较新的证据为准。
不要编造文件变更、测试或完成状态。`;
  const candidateUser = `旧结构化摘要：
${JSON.stringify(summaryInputProjection.previousSummary)}

平台结构化保底摘要：
${JSON.stringify(summaryInputProjection.fallbackSummary)}

本次被压缩区间内的全部用户消息（已做长度保护）：
${timeline.userMessages.join("\n") || "无"}

本次被压缩区间的近期时间线：
${timeline.timeline.join("\n") || "无"}

返回以下 JSON，不要 Markdown：
{"primaryRequest":"","userMessages":[],"keyConcepts":[],"filesAndCode":[],"errorsAndFixes":[],"decisions":[],"completedWork":[],"pendingTasks":[],"currentWork":"","nextStep":"","participantState":[],"taskStates":[]}`;
  const capacity = resolveGroupModelContextCapacity(config);
  const maxOutputTokens = Math.max(1_000, Math.min(
    GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS,
    Number(config?.memoryCompactionMaxOutputTokens || config?.memory_compaction_max_output_tokens || GROUP_COMPACTION_MODEL_MAX_SUMMARY_TOKENS)
  ));
  const providerSafeInput = Math.max(8_000, capacity.contextWindow - maxOutputTokens - GROUP_COMPACTION_MODEL_INPUT_SAFETY_TOKENS);
  const configuredInputLimit = Number(config?.memoryCompactionMaxInputTokens || config?.memory_compaction_max_input_tokens || 0);
  const maxInputTokens = configuredInputLimit > 0
    ? Math.max(8_000, Math.min(providerSafeInput, configuredInputLimit))
    : providerSafeInput;
  const fitted = fitCompactionPromptToTokenBudget(system, candidateUser, maxInputTokens);
  return {
    system,
    user: fitted.user,
    maxOutputTokens,
    audit: {
      schema: "ccm-group-compaction-model-request-budget-v1",
      modelCapacity: capacity,
      maxInputTokens,
      maxOutputTokens,
      estimatedInputTokensBefore: fitted.initialTokens,
      estimatedInputTokens: fitted.finalTokens,
      withinBudget: fitted.finalTokens <= maxInputTokens,
      clipped: fitted.clipped,
      sourceMessageCount: messages.length,
      recentTimelineMessageLimit: 80,
      userMessageLimit: 40,
      sourceStrategy: "deterministic_full_history_aggregate_plus_bounded_recent_evidence",
      rawTranscriptPreserved: true,
      summaryInputProjection: summaryInputProjection.receipt,
    },
  };
}

async function summarizeWithModel(messages: any[], memory: any, fallback: ConversationSummary, config: any) {
  const request = buildGroupCompactionModelRequest(messages, memory, fallback, config);
  try {
    const result = await callCompactionModel(config, request.system, request.user, request.maxOutputTokens);
    const compactionUsage = buildGroupCompactionModelUsageReceipt({
      groupId: config?.groupId || config?.group_id || "",
      groupSessionId: config?.groupSessionId || config?.group_session_id || "",
      usage: result?.usage,
      provider: result?.provider || (config?.format === "anthropic-compatible" ? "anthropic" : "openai"),
      model: result?.model || config?.model || "",
      responseId: result?.responseId || "",
      stopReason: result?.stopReason || "",
      requestAudit: request.audit,
      status: result?.usage ? "reported" : "unreported",
    });
    return {
      summary: result?.summary ? normalizeSummary(result.summary, createEmptyConversationSummary()) : null,
      requestAudit: request.audit,
      compactionUsage,
    };
  } catch (error: any) {
    error.compactionRequestAudit = request.audit;
    error.compactionUsage = buildGroupCompactionModelUsageReceipt({
      groupId: config?.groupId || config?.group_id || "",
      groupSessionId: config?.groupSessionId || config?.group_session_id || "",
      provider: config?.format === "anthropic-compatible" ? "anthropic" : "openai",
      model: config?.model || "",
      requestAudit: request.audit,
      status: "failed",
    });
    throw error;
  }
}

export function buildBoundedRecentGroupContext(messages: any[], fullCount = 5) {
  const rows = (messages || []).map((message: any, index: number) => {
    const who = message?.role === "user" ? `[用户 -> ${message?.target || "all"}]` : `[${message?.agent || message?.role || "Agent"}]`;
    const isFull = index >= messages.length - fullCount;
    const max = message?.role === "user" ? (isFull ? 5000 : 1200) : (isFull ? 6000 : 900);
    const compacted = microCompactText(messageContent(message), max);
    const content = compacted.text;
    const originalLength = messageContent(message).length;
    const suffix = compacted.compacted ? `\n[该消息原文 ${originalLength} 字符，已做 micro-compact；可按 #${messageIdentity(message, index)} 回溯]` : "";
    return `${who} ${content}${suffix}`;
  });
  return rows.join("\n");
}

export function buildGroupTruePostCompactPayloadBudget(input: any = {}) {
  const triggerTokens = Math.max(1, Number(input.triggerTokens || input.autoCompactThreshold || GROUP_COMPACT_TRIGGER_TOKENS));
  const summaryText = String(input.summaryText || input.messageDigest || "");
  const recentContext = buildBoundedRecentGroupContext(
    Array.isArray(input.keptMessages) ? input.keptMessages : [],
    Math.max(3, Number(input.fullCount || 5)),
  );
  const components = {
    summary: estimateGroupTextTokens(summaryText),
    recent_window: estimateGroupTextTokens(recentContext),
    reinjection: estimateGroupTextTokens(JSON.stringify(input.postCompactReinject || input.post_compact_reinject || {})),
    persistent_memory: estimateGroupTextTokens(JSON.stringify({
      persistentRequirements: Array.isArray(input.persistentRequirements) ? input.persistentRequirements.slice(-12) : [],
      factAnchors: Array.isArray(input.factAnchors) ? input.factAnchors.slice(-12) : [],
    })),
    session_memory_restore: input.sessionMemory || input.session_memory
      ? estimateGroupTextTokens(JSON.stringify(input.sessionMemory || input.session_memory))
      : 0,
    tool_continuity_restore: estimateGroupTextTokens(JSON.stringify(input.toolContinuity || input.tool_continuity || {})),
  };
  const payloadProjection = {
    summaryText,
    recentContext,
    postCompactReinject: input.postCompactReinject || input.post_compact_reinject || null,
    persistentRequirements: Array.isArray(input.persistentRequirements) ? input.persistentRequirements.slice(-12) : [],
    factAnchors: Array.isArray(input.factAnchors) ? input.factAnchors.slice(-12) : [],
    sessionMemory: input.sessionMemory || input.session_memory || null,
    toolContinuity: input.toolContinuity || input.tool_continuity || null,
  };
  const contextBudget = buildContextBudget({
    context: payloadProjection,
    maxChars: Math.max(48_000, triggerTokens * 4),
    maxTokens: triggerTokens,
  });
  const truePostCompactTokenCount = Number(contextBudget.estimated_tokens || 0);
  const willRetriggerNextTurn = truePostCompactTokenCount >= triggerTokens;
  const core = {
    schema: "ccm-group-true-post-compact-payload-budget-v1",
    version: GROUP_TRUE_POST_COMPACT_PAYLOAD_VERSION,
    group_id: String(input.groupId || input.group_id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    trigger_tokens: triggerTokens,
    true_post_compact_token_count: truePostCompactTokenCount,
    will_retrigger_next_turn: willRetriggerNextTurn,
    status: willRetriggerNextTurn ? "recompact_required" : "ready",
    components,
    context_budget: contextBudget,
  };
  return {
    ...core,
    payload_checksum: crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0, 24),
  };
}

export function buildRelevantHistoricalGroupContext(messages: any[], boundaryIndex: number, query: string, options: any = {}) {
  if (boundaryIndex < 0 || !messages?.length) return "";
  const queryTokens = [...normalizedSearchTokens(query)].slice(0, 120);
  if (!queryTokens.length) return "";
  const maxMessages = Math.max(1, Math.min(10, Number(options.maxMessages || 6)));
  const maxChars = Math.max(1000, Math.min(12_000, Number(options.maxChars || 6000)));
  const ranked: Array<{ index: number; score: number; message: any }> = [];
  for (let index = 0; index <= boundaryIndex; index += 1) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const corpus = content.toLowerCase();
    let score = 0;
    for (const token of queryTokens) if (corpus.includes(token)) score += token.length >= 4 ? 3 : 1;
    if (!score) continue;
    if (message?.role === "user") score += 4;
    if (message?.dispatchPolicy || message?.delivery_summary || message?.receipt) score += 2;
    if (/(错误|失败|阻塞|error|failed|blocked|\.(?:ts|js|vue|java|py|go|rs)\b)/i.test(content)) score += 1;
    ranked.push({ index, score, message });
  }
  const selected = ranked.sort((a, b) => b.score - a.score || b.index - a.index).slice(0, maxMessages).sort((a, b) => a.index - b.index);
  if (!selected.length) return "";
  const lines = ["按当前任务自动回溯到的压缩前原文证据（原文优先于摘要）："];
  let used = lines[0].length;
  for (const item of selected) {
    const actor = item.message?.role === "user" ? `用户 -> ${item.message?.target || "all"}` : item.message?.agent || item.message?.role || "Agent";
    const row = `- #${messageIdentity(item.message, item.index)} [${actor}] ${compactText(messageContent(item.message), 1400)}`;
    if (used + row.length > maxChars) break;
    lines.push(row);
    used += row.length;
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

export async function compactGroupConversationMemory(input: {
  groupId: string;
  groupSessionId?: string;
  messages: any[];
  memory: any;
  config?: any;
  transcriptPath: string;
  force?: boolean;
  rebuild?: boolean;
  partialCompact?: any;
  activeTasks?: any[];
}) {
  const groupId = String(input.groupId || "").trim();
  const groupSessionId = exactHookLedgerSessionId(String(input.groupSessionId || ""));
  if (!groupId || !groupSessionId) throw new Error("exact_group_session_required_for_group_memory_compaction");
  const messages = input.messages || [];
  const memory = input.memory || {};
  const previousState = memory.compaction || {};
  const previousVersion = Number(previousState.version || 0);
  const requiresVersionMigration = previousVersion > 0 && previousVersion < GROUP_MEMORY_COMPACTION_VERSION;
  const requiresValidationRepair = !!input.force && String(previousState.summarySource || "") === "structured-validation-fallback";
  const requiresMetadataRepair = !!input.force && !previousState.modelMode;
  const requiresExplicitRebuild = !!input.rebuild;
  const lastBoundaryId = requiresVersionMigration || requiresValidationRepair || requiresMetadataRepair || requiresExplicitRebuild ? "" : String(previousState.lastCompactedMessageId || "");
  let summarizedThroughIndex = lastBoundaryId ? messages.findIndex((message: any, index: number) => messageIdentity(message, index) === lastBoundaryId) : -1;
  if (lastBoundaryId && summarizedThroughIndex < 0) summarizedThroughIndex = -1;

  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const postCompactTaskStatusProjection = buildGroupPostCompactTaskStatusProjection(input.activeTasks || [], {
    groupId,
    groupSessionId,
    currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
    taskStatusBudget: input.config?.postCompactReinject?.taskStatusBudget || input.config?.postCompactReinject?.task_status_budget,
    completedMaxAgeMs: input.config?.postCompactReinject?.completedMaxAgeMs || input.config?.postCompactReinject?.completed_max_age_ms,
    now,
  });
  const partialCompact: any = resolvePartialCompactWindow(messages, summarizedThroughIndex, {
    ...(input.config || {}),
    partialCompact: input.partialCompact || input.config?.partialCompact,
  });
  const partialSidecarSegment = partialCompact?.sidecar
    ? buildGroupPartialCompactSidecarSegment({
      groupId: input.groupId,
      groupSessionId,
      messages,
      memory,
      partialCompact,
      transcriptPath: input.transcriptPath,
      config: input.config,
      postCompactTaskStatuses: postCompactTaskStatusProjection.tasks,
      activeTasks: input.activeTasks || [],
      currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
      now,
    })
    : null;
  const keepWindowOptions = {
    floorIndex: summarizedThroughIndex + 1,
    minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || GROUP_COMPACT_MIN_KEEP_MESSAGES,
    minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || GROUP_COMPACT_MIN_KEEP_TOKENS,
    maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || GROUP_COMPACT_MAX_KEEP_TOKENS,
  };
  const defaultKeepIndex = calculateGroupMessagesToKeepIndex(messages, keepWindowOptions);
  const primaryPartialCompact = partialCompact?.enabled === true && partialCompact?.sidecar !== true;
  let keepIndex = primaryPartialCompact ? partialCompact.keepIndex : defaultKeepIndex;
  let messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
  let sourceTokens = messagesToCompact.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  let keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const previousSummaryTokens = estimateGroupTextTokens(JSON.stringify(memory.conversationSummary || {}));
  const activeTokens = sourceTokens + keptActiveTokens + previousSummaryTokens;
  const triggerTokens = getGroupAutoCompactThreshold(input.config);
  const activeMessageCount = messages.length - summarizedThroughIndex - 1;
  const preCompactWarning = calculateGroupCompactWarningState({
    activeTokens,
    activeMessageCount,
    autoCompactThreshold: triggerTokens,
    config: input.config,
    now,
  });
  const warningOnlyMemory = {
    ...memory,
    compaction: {
      ...(previousState || {}),
      version: GROUP_MEMORY_COMPACTION_VERSION,
      enabled: true,
      contextPressureWarning: preCompactWarning,
      compactWarning: preCompactWarning,
      lastPressureSampleAt: now,
    },
    messageCompression: {
      ...(memory?.messageCompression || {}),
      contextPressureWarning: preCompactWarning,
    },
  };
  const shouldCompactPrimary = !!input.force
    || primaryPartialCompact
    || preCompactWarning.flags.isAboveAutoCompactThreshold
    || activeMessageCount >= GROUP_COMPACT_MAX_ACTIVE_MESSAGES;
  let sessionMemoryCompactSelection: any = null;
  let selectedSessionMemoryMarkdown = "";
  if (shouldCompactPrimary && messagesToCompact.length > 0) {
    const selection = await selectGroupSessionMemoryForCompact({
      groupId,
      groupSessionId,
      messages,
      memory,
      config: input.config,
      primaryPartialCompact,
      defaultKeepIndex,
      keepWindowOptions,
      triggerTokens,
      now,
    });
    sessionMemoryCompactSelection = selection.receipt;
    if (selection.selected === true) {
      keepIndex = selection.keepIndex;
      messagesToCompact = messages.slice(summarizedThroughIndex + 1, keepIndex);
      sourceTokens = messagesToCompact.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
      keptActiveTokens = messages.slice(keepIndex).reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
      selectedSessionMemoryMarkdown = selection.markdown;
    }
  }
  const buildStrategyDecision = (overrides: any = {}) => buildGroupCompactStrategyDecision({
    groupId: input.groupId,
    messages,
    messagesToCompact,
    keptMessages: messages.slice(keepIndex),
    memory,
    startIndex: summarizedThroughIndex + 1,
    keepIndex,
    compacted: false,
    primaryCompact: shouldCompactPrimary && messagesToCompact.length > 0,
    partialCompact,
    partialSidecarSegment,
    preCompactWarning,
    activeTokens,
    activeMessageCount,
    triggerTokens,
    preCompactTokenCount: messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0),
    transcriptPath: input.transcriptPath,
    force: input.force,
    now,
    ...overrides,
  });
  if ((!shouldCompactPrimary || !messagesToCompact.length) && partialSidecarSegment) {
    const compactStrategyDecision = buildStrategyDecision({
      compacted: true,
      primaryCompact: false,
      reason: partialCompact?.reason || "partial sidecar only; primary compact skipped",
    });
    const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
      groupId: input.groupId,
      activeTokens,
      targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
      maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
      force: input.force,
      now,
    });
    const postCompactCleanupAudit = buildGroupPostCompactCleanupAudit({
      groupId: input.groupId,
      groupSessionId,
      boundary: {
        id: partialSidecarSegment.id || "",
        type: "partial-sidecar",
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        post_compact_restore: {
          strategyDecision: compactStrategyDecision,
          apiMicroCompactEditPlan,
          transcriptPath: input.transcriptPath,
          microCompact: partialSidecarSegment.microCompact || null,
          reinjectionPlan: partialSidecarSegment.reinjectionPlan || null,
        },
      },
      compactStrategyDecision,
      apiMicroCompactEditPlan,
      microCompact: partialSidecarSegment.microCompact || null,
      postCompactReinject: partialSidecarSegment.reinjectionPlan || null,
      transcriptPath: input.transcriptPath,
      summaryChecksum: partialSidecarSegment.summaryChecksum || "",
      partialSidecarOnly: true,
      now,
    });
    const nextMemory = buildPartialSidecarOnlyMemory({
      memory,
      messages,
      partialCompact,
      partialSegment: partialSidecarSegment,
      transcriptPath: input.transcriptPath,
      now,
      compactStrategyDecision,
      postCompactCleanupAudit,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      apiMicroCompactEditPlan,
    });
    return { compacted: true, partialCompacted: true, memory: nextMemory, keepIndex, partialCompact, partialSegment: partialSidecarSegment, compactStrategyDecision, postCompactCleanupAudit, postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt, apiMicroCompactEditPlan };
  }
  if (!shouldCompactPrimary || !messagesToCompact.length) {
    const compactStrategyDecision = buildStrategyDecision({
      compacted: false,
      primaryCompact: false,
      reason: !messagesToCompact.length ? "recent window only; no eligible older messages" : "context pressure below compact threshold",
    });
    const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
      groupId: input.groupId,
      activeTokens,
      targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
      maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
      force: input.force,
      now,
    });
    const nextMemory = {
      ...warningOnlyMemory,
      compaction: {
        ...(warningOnlyMemory.compaction || {}),
        compactStrategyDecision,
        apiMicroCompactEditPlan,
      },
      messageCompression: {
        ...(warningOnlyMemory.messageCompression || {}),
        compactStrategyDecision,
        apiMicroCompactEditPlan,
      },
    };
    return { compacted: false, memory: nextMemory, keepIndex, partialCompact, contextPressureWarning: preCompactWarning, compactStrategyDecision, apiMicroCompactEditPlan };
  }

  const failures = Number(previousState.consecutiveFailures || 0);
  const compactionHookRunId = `gmch_${Date.now().toString(36)}_${crypto.createHash("sha1").update(`${input.groupId || ""}:${groupSessionId}:${now}:${messages.length}`).digest("hex").slice(0, 8)}`;
  const preHookResults = await runGroupMemoryCompactionHooks("pre", {
    hookRunId: compactionHookRunId,
    groupId: input.groupId,
    groupSessionId,
    messages,
    messagesToCompact,
    memory,
    keepIndex,
    partialCompact,
    summarizedThroughIndex,
    sourceTokens,
    activeTokens,
  });
  const hookFactAnchors = extractHookAnchors(preHookResults, "factAnchors", "dispatch_decision");
  const hookPersistentRequirements = extractHookAnchors(preHookResults, "persistentRequirements", "user_requirement");
  const previousSummary = normalizeSummary(memory.conversationSummary || {}, createEmptyConversationSummary());
  const hookMemory = hookPersistentRequirements.length
    ? { ...memory, persistentRequirements: mergePersistentRequirements(memory.persistentRequirements, hookPersistentRequirements) }
    : memory;
  const fallback = buildDeterministicConversationSummary(messagesToCompact, hookMemory, previousSummary);
  let conversationSummary = fallback;
  let summarySource = "structured";
  let failure = "";
  let modelRequestAudit: any = null;
  let compactionUsage: any = null;
  let validation = validateSummaryPreservesFallback(conversationSummary, fallback);
  let rejectedModelValidation: any = null;
  const lastFailureAtMs = Date.parse(String(previousState.lastFailureAt || "")) || 0;
  const retryWindowExpired = lastFailureAtMs > 0 && nowMs - lastFailureAtMs >= GROUP_COMPACT_MODEL_RETRY_MS;
  const modelCompactionEnabled = input.config?.memoryCompactionUseModel === true
    || String(input.config?.memoryCompactionMode || "").toLowerCase() === "hybrid";
  if (sessionMemoryCompactSelection?.selected === true) summarySource = "session-memory";
  const shouldAttemptModel = sessionMemoryCompactSelection?.selected !== true
    && modelCompactionEnabled
    && (failures < GROUP_COMPACT_MAX_FAILURES || retryWindowExpired);
  if (shouldAttemptModel) {
    try {
      const modelResult = await summarizeWithModel(messagesToCompact, memory, fallback, {
        ...(input.config || {}),
        groupId,
        groupSessionId,
      });
      const modelSummary = modelResult.summary;
      modelRequestAudit = modelResult.requestAudit;
      compactionUsage = modelResult.compactionUsage;
      if (modelSummary) {
        conversationSummary = mergeSafeConversationSummary(previousSummary, fallback, modelSummary, messagesToCompact);
        summarySource = "hybrid";
        validation = validateSummaryPreservesFallback(conversationSummary, fallback);
        if (!validation.pass) {
          rejectedModelValidation = validation;
          conversationSummary = fallback;
          summarySource = "structured-validation-fallback";
          validation = validateSummaryPreservesFallback(conversationSummary, fallback);
        }
      }
    } catch (error: any) {
      modelRequestAudit = error?.compactionRequestAudit || modelRequestAudit;
      compactionUsage = error?.compactionUsage || compactionUsage;
      failure = compactText(error?.message || error, 400);
    }
  }
  if (sessionMemoryCompactSelection?.schema && sessionMemoryCompactSelection.selected !== true) {
    sessionMemoryCompactSelection = buildGroupSessionMemoryCompactSelectionReceipt({
      ...sessionMemoryCompactSelection,
      selected: false,
      fallbackReason: sessionMemoryCompactSelection.fallback_reason,
      compactionApiCalled: shouldAttemptModel,
      createdAt: now,
    });
  }

  const compactedFactAnchors = extractFactAnchors(messagesToCompact);
  const nextFactAnchors = mergeFactAnchors(memory.factAnchors, [
    ...compactedFactAnchors,
    ...hookFactAnchors,
    ...(Array.isArray(partialSidecarSegment?.factAnchors) ? partialSidecarSegment.factAnchors : []),
  ]);
  const nextPersistentRequirements = mergePersistentRequirements(memory.persistentRequirements, [
    ...extractPersistentRequirements(messagesToCompact),
    ...hookPersistentRequirements,
    ...(Array.isArray(partialSidecarSegment?.persistentRequirements) ? partialSidecarSegment.persistentRequirements : []),
  ]);
  let quality = evaluateGroupMemorySummaryQuality(conversationSummary, fallback, messagesToCompact, memory, {
    evaluatedAt: now,
    factAnchors: nextFactAnchors,
    persistentRequirements: nextPersistentRequirements,
  });
  let downgradedByQualityGate = false;
  let qualityDowngradeReason = "";
  if (quality.downgrade_required && summarySource === "hybrid") {
    const rejectedByQuality = {
      summarySource,
      validation,
      quality,
    };
    rejectedModelValidation = rejectedModelValidation
      ? { previous: rejectedModelValidation, qualityGate: rejectedByQuality }
      : rejectedByQuality;
    downgradedByQualityGate = true;
    qualityDowngradeReason = quality.downgrade_reason || "quality_gate_failed";
    failure = failure || qualityDowngradeReason;
    conversationSummary = fallback;
    summarySource = "structured-quality-fallback";
    validation = validateSummaryPreservesFallback(conversationSummary, fallback);
    quality = evaluateGroupMemorySummaryQuality(conversationSummary, fallback, messagesToCompact, memory, {
      evaluatedAt: now,
      factAnchors: nextFactAnchors,
      persistentRequirements: nextPersistentRequirements,
      downgradedFrom: rejectedByQuality.summarySource,
    });
  }

  const boundaryMessage = messages[keepIndex - 1];
  const keptMessages = messages.slice(keepIndex);
  const microCompact = buildGroupMicroCompactPlan(messagesToCompact, input.config?.microCompact || input.config?.groupMicroCompact || {});
  const postCompactReinject = buildPostCompactReinjectionPlan(messagesToCompact, microCompact, {
    ...(input.config?.postCompactReinject || {}),
    groupId,
    groupSessionId,
    sessionMessages: messages,
    preservedMessages: keptMessages,
    taskStatuses: postCompactTaskStatusProjection.tasks,
    tasks: input.activeTasks || [],
    currentTaskId: input.config?.currentTaskId || input.config?.current_task_id,
    dynamicContextCatalog: input.config?.postCompactDynamicContextCatalog || input.config?.post_compact_dynamic_context_catalog || {},
    dynamicContextScanMode: primaryPartialCompact ? "partial" : "full",
    preCompactLoadedToolNames: [
      ...(memory?.compactBoundary?.compactMetadata?.preCompactDiscoveredTools || []),
      ...(previousState?.preCompactDiscoveredTools || []),
    ],
    now,
  });
  const preCompactTokenCount = messages.reduce((sum, message) => sum + estimateGroupMessageTokens(message), 0);
  const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
  const initialMessageDigest = sessionMemoryCompactSelection?.selected === true
    ? selectedSessionMemoryMarkdown
    : renderConversationSummary(conversationSummary, 14_000);
  const prePtlPostCompactPayloadBudget = buildGroupTruePostCompactPayloadBudget({
    groupId: input.groupId,
    groupSessionId,
    triggerTokens,
    summaryText: initialMessageDigest,
    keptMessages,
    postCompactReinject,
    persistentRequirements: nextPersistentRequirements,
    factAnchors: nextFactAnchors,
    sessionMemory: sessionMemoryCompactSelection?.selected === true ? null : memory.sessionMemory,
    toolContinuity: memory.toolContinuity,
  });
  const prePtlPostCompactTokenCount = Number(prePtlPostCompactPayloadBudget.true_post_compact_token_count || 0);
  const ptlEmergency = buildGroupPtlEmergencyPlan({
    groupId: input.groupId,
    messages,
    messagesToCompact,
    keptMessages,
    startIndex: summarizedThroughIndex + 1,
    keepIndex,
    conversationSummary,
    triggerTokens,
    activeTokens,
    preCompactTokenCount,
    postCompactTokenCount: prePtlPostCompactTokenCount,
    contextBudget: prePtlPostCompactPayloadBudget.context_budget,
    transcriptPath: input.transcriptPath,
    config: input.config,
    now,
  });
  let messageDigest = sessionMemoryCompactSelection?.selected === true
    ? selectedSessionMemoryMarkdown
    : renderConversationSummary(conversationSummary, ptlEmergency?.messageDigestMaxChars || 14_000);
  let postCompactPayloadBudget = buildGroupTruePostCompactPayloadBudget({
    groupId: input.groupId,
    groupSessionId,
    triggerTokens,
    summaryText: messageDigest,
    keptMessages,
    postCompactReinject,
    persistentRequirements: nextPersistentRequirements,
    factAnchors: nextFactAnchors,
    sessionMemory: sessionMemoryCompactSelection?.selected === true ? null : memory.sessionMemory,
    toolContinuity: memory.toolContinuity,
  });
  if (sessionMemoryCompactSelection?.selected === true && postCompactPayloadBudget.will_retrigger_next_turn === true) {
    sessionMemoryCompactSelection = buildGroupSessionMemoryCompactSelectionReceipt({
      ...sessionMemoryCompactSelection,
      selected: false,
      fallbackReason: "true_post_compact_payload_reaches_auto_compact_threshold",
      projectedPostCompactTokens: postCompactPayloadBudget.true_post_compact_token_count,
      createdAt: now,
    });
    summarySource = "structured-session-memory-threshold-fallback";
    messageDigest = renderConversationSummary(conversationSummary, ptlEmergency?.messageDigestMaxChars || 14_000);
    postCompactPayloadBudget = buildGroupTruePostCompactPayloadBudget({
      groupId: input.groupId,
      groupSessionId,
      triggerTokens,
      summaryText: messageDigest,
      keptMessages,
      postCompactReinject,
      persistentRequirements: nextPersistentRequirements,
      factAnchors: nextFactAnchors,
      sessionMemory: memory.sessionMemory,
      toolContinuity: memory.toolContinuity,
    });
  }
  if (sessionMemoryCompactSelection?.schema) {
    sessionMemoryCompactSelection = buildGroupSessionMemoryCompactSelectionReceipt({
      ...sessionMemoryCompactSelection,
      selected: sessionMemoryCompactSelection.selected === true,
      fallbackReason: sessionMemoryCompactSelection.fallback_reason,
      compactionApiCalled: sessionMemoryCompactSelection.compaction_api_called === true,
      projectedPostCompactTokens: postCompactPayloadBudget.true_post_compact_token_count,
      createdAt: now,
    });
  }
  const postCompactTokenCount = Number(postCompactPayloadBudget.true_post_compact_token_count || 0);
  const postCompactPayloadGate = {
    schema: "ccm-group-post-compact-payload-gate-v1",
    group_id: String(input.groupId || ""),
    group_session_id: groupSessionId,
    status: postCompactPayloadBudget.will_retrigger_next_turn === true
      ? "recompact_required"
      : ptlEmergency?.engaged ? "ptl_reduced" : "ready",
    action: postCompactPayloadBudget.will_retrigger_next_turn === true
      ? "reduce_restored_context_before_child_dispatch"
      : "dispatch_ready",
    trigger_tokens: triggerTokens,
    pre_ptl_token_count: prePtlPostCompactTokenCount,
    true_post_compact_token_count: postCompactTokenCount,
    ptl_applied: ptlEmergency?.engaged === true,
    safe_render_chars: postCompactPayloadBudget.will_retrigger_next_turn === true ? 6000 : 14_000,
    payload_checksum: postCompactPayloadBudget.payload_checksum,
  };
  const postCompactWarning = calculateGroupCompactWarningState({
    activeTokens: postCompactTokenCount,
    activeMessageCount: keptMessages.length,
    autoCompactThreshold: triggerTokens,
    config: input.config,
    suppressed: postCompactPayloadGate.status !== "recompact_required",
    suppressReason: postCompactPayloadGate.status !== "recompact_required"
      ? "post_compaction_until_next_group_memory_pressure_sample"
      : "",
    now,
  });
  const reductionRatio = preCompactTokenCount > 0 ? Math.max(0, 1 - postCompactTokenCount / preCompactTokenCount) : 0;
  const pressurePercent = triggerTokens > 0 ? Math.round((activeTokens / triggerTokens) * 1000) / 10 : 0;
  const contextBudget = {
    ...postCompactPayloadBudget.context_budget,
    pre_ptl_estimated_tokens: prePtlPostCompactTokenCount,
    true_post_compact_token_count: postCompactTokenCount,
    will_retrigger_next_turn: postCompactPayloadBudget.will_retrigger_next_turn === true,
    payload_checksum: postCompactPayloadBudget.payload_checksum,
  };
  const ptlRecovery = buildGroupPtlRecoveryPlan({
    previousPtlEmergency: previousState.ptlEmergency,
    currentPtlEmergency: ptlEmergency,
    contextBudget,
    triggerTokens,
    postCompactTokenCount,
    restoredMessageDigestMaxChars: 14_000,
    summaryChecksum,
    transcriptPath: input.transcriptPath,
    config: input.config,
    now,
  });
  const effectiveContextBudget = ptlEmergency
    ? {
      ...contextBudget,
      ptl_emergency: {
        schema: ptlEmergency.schema,
        emergencyLevel: ptlEmergency.emergencyLevel,
        reason: ptlEmergency.reason,
        messageDigestMaxChars: ptlEmergency.messageDigestMaxChars,
      },
    }
    : ptlRecovery
      ? {
        ...contextBudget,
        ptl_recovery: {
          schema: ptlRecovery.schema,
          reason: ptlRecovery.reason,
          restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
          contextBudgetPressure: ptlRecovery.contextBudgetPressure,
        },
      }
    : contextBudget;
  const previousThrashCount = Number(previousState.thrashCount || 0);
  const thrashCount = reductionRatio < 0.2 ? previousThrashCount + 1 : 0;
  const health = postCompactPayloadGate.status === "recompact_required"
    ? "recompact_required"
    : ptlEmergency
    ? "ptl_emergency"
    : ptlRecovery
      ? "healthy"
    : !validation.pass || !quality.pass
    ? quality.status === "failed" ? "failed" : "degraded"
    : thrashCount >= 3 ? "thrashing" : "healthy";
  const preservedSegment = buildGroupPreservedSegment(messages, keepIndex, {
    groupId: input.groupId,
    floorIndex: summarizedThroughIndex + 1,
    minMessages: input.config?.minKeepMessages || input.config?.min_keep_messages || GROUP_COMPACT_MIN_KEEP_MESSAGES,
    minTokens: input.config?.minKeepTokens || input.config?.min_keep_tokens || GROUP_COMPACT_MIN_KEEP_TOKENS,
    maxTokens: input.config?.maxKeepTokens || input.config?.max_keep_tokens || GROUP_COMPACT_MAX_KEEP_TOKENS,
    summaryChecksum,
    transcriptPath: input.transcriptPath,
    now,
  });
  const compactStrategyDecision = buildStrategyDecision({
    compacted: true,
    primaryCompact: true,
    keptMessages,
    microCompact,
    postCompactReinject,
    ptlEmergency,
    ptlRecovery,
    truePostCompactPayloadBudget: postCompactPayloadBudget,
    postCompactPayloadGate,
    sessionMemoryCompactSelection,
    preservedSegment,
    preCompactTokenCount,
    postCompactTokenCount,
    summaryChecksum,
    reason: primaryPartialCompact
      ? partialCompact?.reason || "manual partial compact selected primary boundary"
      : input.force
        ? "manual compact requested"
        : "auto compact selected session-memory style summary plus recent window",
  });
  const apiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan(messages, {
    groupId: input.groupId,
    activeTokens: preCompactTokenCount,
    targetInputTokens: input.config?.apiMicrocompactTargetInputTokens || input.config?.api_microcompact_target_input_tokens,
    maxInputTokens: input.config?.apiMicrocompactMaxInputTokens || input.config?.api_microcompact_max_input_tokens,
    force: input.force,
    now,
  });
  const preCompactDiscoveredTools = Array.isArray(postCompactReinject?.dynamicContextDeltaReceipt?.loaded_tool_state?.carried_names)
    ? postCompactReinject.dynamicContextDeltaReceipt.loaded_tool_state.carried_names
    : [];
  const previousBoundary = memory?.compactBoundary?.id
    ? memory.compactBoundary
    : Array.isArray(previousState.boundaries) ? previousState.boundaries.at(-1) || null : null;
  const previousTotalMessagesSeen = Number(previousState.totalMessagesSeen || 0);
  const lineageCheckpointKnown = !!previousBoundary?.id
    && previousTotalMessagesSeen > 0
    && previousTotalMessagesSeen <= messages.length;
  const messagesSincePreviousCompact = lineageCheckpointKnown ? messages.slice(previousTotalMessagesSeen) : [];
  const turnsSincePreviousCompact = messagesSincePreviousCompact.filter((message: any) => {
    if (message?.isMeta === true || String(message?.role || message?.type || "") !== "user") return false;
    const content = message?.content ?? message?.message?.content;
    return !(Array.isArray(content) && content.length > 0 && content.every((block: any) => block?.type === "tool_result"));
  }).length;
  const compactTrigger = primaryPartialCompact || input.force ? "manual" : "auto";
  const boundary: any = {
    id: `compact-${Date.now().toString(36)}-${crypto.createHash("sha256").update(`${input.groupId || ""}\0${groupSessionId}\0${now}\0${messageIdentity(boundaryMessage, keepIndex - 1)}`).digest("hex").slice(0, 10)}`,
    type: primaryPartialCompact ? "partial-up-to" : input.force ? "manual" : "auto",
    summarizedFromMessageId: messageIdentity(messages[summarizedThroughIndex + 1], summarizedThroughIndex + 1),
    summarizedThroughMessageId: messageIdentity(boundaryMessage, keepIndex - 1),
    summarizedMessageCount: messagesToCompact.length,
    preservedMessageIds: keptMessages.slice(-40).map((message, index) => messageIdentity(message, keepIndex + index)),
    compactMetadata: {
      trigger: compactTrigger,
      preTokens: preCompactTokenCount,
      messagesSummarized: messagesToCompact.length,
      preCompactDiscoveredTools,
      compactionUsage,
      sessionMemoryCompactSelection,
      preservedSegment: {
        headUuid: String(preservedSegment?.headMessageId || preservedSegment?.firstPreservedMessageId || ""),
        anchorUuid: String(preservedSegment?.anchorMessageId || preservedSegment?.summaryMessageId || ""),
        tailUuid: String(preservedSegment?.tailMessageId || preservedSegment?.lastPreservedMessageId || ""),
      },
    },
    preservedSegment,
    preCompactTokenCount,
    postCompactTokenCount,
    prePtlPostCompactTokenCount,
    truePostCompactPayloadBudget: postCompactPayloadBudget,
    postCompactPayloadGate,
    compactStrategyDecision,
    apiMicroCompactEditPlan,
    postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
    post_compact_restore: {
      strategy: "conversation_summary_recent_reinject",
      preservedMessageIds: keptMessages.slice(-20).map((message, index) => messageIdentity(message, keepIndex + index)),
      preservedSegment,
      strategyDecision: compactStrategyDecision,
      apiMicroCompactEditPlan,
      summaryChecksum,
      preCompactDiscoveredTools,
      transcriptPath: input.transcriptPath,
      microCompact,
      reinjectionPlan: postCompactReinject,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      partialSidecarSegment,
      ptlEmergency,
      ptlRecovery,
      truePostCompactPayloadBudget: postCompactPayloadBudget,
      postCompactPayloadGate,
      compactionUsage,
      sessionMemoryCompactSelection,
      recoveryAudit: null as any,
      cleanupAudit: null as any,
    },
    context_budget: effectiveContextBudget,
    partialCompact,
    partialSidecarSegment,
    ptlEmergency,
    ptlRecovery,
    summarySource,
    modelRequestAudit,
    compactionUsage,
    sessionMemoryCompactSelection,
    quality: {
      score: quality.score,
      status: quality.status,
      driftDetected: quality.drift.detected,
      downgradedByQualityGate,
    },
    createdAt: now,
  };
  const compactLineage = buildGroupCompactLineage({
    groupId: input.groupId,
    groupSessionId,
    boundary,
    previousBoundary,
    checkpointKnown: lineageCheckpointKnown,
    turnsSincePreviousCompact,
    newMessageCountSincePreviousCompact: messagesSincePreviousCompact.length,
    trigger: compactTrigger,
    querySource: `group_main:${String(input.groupId || "")}::${groupSessionId}`,
    messagesSummarized: messagesToCompact.length,
    preCompactTokens: preCompactTokenCount,
    truePostCompactTokens: postCompactTokenCount,
    autoCompactThreshold: triggerTokens,
    willRetriggerNextTurn: postCompactPayloadBudget.will_retrigger_next_turn === true,
  });
  boundary.compactLineage = compactLineage;
  boundary.compactMetadata.compactLineage = compactLineage;
  boundary.post_compact_restore.compactLineage = compactLineage;
  const postCompactRecoveryAudit = buildGroupPostCompactRecoveryAudit({
    groupId: input.groupId,
    messages,
    boundary,
    keepIndex,
    conversationSummary,
    messageDigest,
    summaryChecksum,
    transcriptPath: input.transcriptPath,
    preservedSegment,
    postCompactReinject,
    microCompact,
    contextPressureWarning: postCompactWarning,
    contextBudget: effectiveContextBudget,
    partialSidecarSegment,
    ptlEmergency,
    ptlRecovery,
    truePostCompactPayloadBudget: postCompactPayloadBudget,
    postCompactPayloadGate,
    now,
  });
  boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
  const postHookResults = await runGroupMemoryCompactionHooks("post", {
    hookRunId: compactionHookRunId,
    groupId: input.groupId,
    groupSessionId,
    messages,
    messagesToCompact,
    keptMessages,
    memory,
    conversationSummary,
    fallback,
    validation,
    quality,
    boundary,
    microCompact,
    postCompactReinject,
    postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
    partialCompact,
    partialSidecarSegment,
    ptlEmergency,
    ptlRecovery,
    summaryChecksum,
    compactStrategyDecision,
    truePostCompactPayloadBudget: postCompactPayloadBudget,
    postCompactPayloadGate,
  });
  const postCompactMessageOrderReceipt = buildGroupPostCompactMessageOrderReceipt({
    groupId: input.groupId,
    groupSessionId,
    boundary,
    summaryChecksum,
    preservedSegment,
    postCompactReinject,
    postHookResults,
    hookRunId: compactionHookRunId,
  });
  boundary.postCompactMessageOrderReceipt = postCompactMessageOrderReceipt;
  boundary.post_compact_restore.messageOrderReceipt = postCompactMessageOrderReceipt;
  const postCompactCleanupAudit = buildGroupPostCompactCleanupAudit({
    groupId: input.groupId,
    groupSessionId,
    boundary,
    compactStrategyDecision,
    apiMicroCompactEditPlan,
    postCompactRecoveryAudit,
    microCompact,
    postCompactReinject,
    preservedSegment,
    transcriptPath: input.transcriptPath,
    summaryChecksum,
    hookRunId: compactionHookRunId,
    now,
  });
  boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
  const latestHookLedger = readGroupMemoryCompactionHookLedger(String(input.groupId || ""), groupSessionId);
  const compactTransactionReceipt = buildGroupCompactTransactionReceipt({
    groupId: input.groupId,
    groupSessionId,
    boundary,
    summaryChecksum,
    hookRunId: compactionHookRunId,
    preHookResults,
    postHookResults,
    transcriptPath: input.transcriptPath,
    createdAt: now,
  });
  boundary.compactTransactionReceipt = compactTransactionReceipt;
  boundary.post_compact_restore.compactTransactionReceipt = compactTransactionReceipt;
  const totalCompacted = requiresExplicitRebuild
    ? keepIndex
    : Math.max(Number(previousState.compactedMessageCount || 0) + messagesToCompact.length, keepIndex);
  const partialSegments = mergeGroupPartialCompactSegments(previousState.partialSegments, partialSidecarSegment);
  const nextMemory = {
    ...memory,
    conversationSummary,
    factAnchors: nextFactAnchors,
    persistentRequirements: nextPersistentRequirements,
    messageDigest,
    compactBoundary: boundary,
    compaction: {
      version: GROUP_MEMORY_COMPACTION_VERSION,
      rebuiltAt: requiresExplicitRebuild ? now : String(previousState.rebuiltAt || ""),
      migratedFromVersion: requiresVersionMigration ? previousVersion : Number(previousState.migratedFromVersion || 0),
      enabled: true,
      lastCompactedMessageId: boundary.summarizedThroughMessageId,
      lastCompactedAt: now,
      compactedMessageCount: totalCompacted,
      totalMessagesSeen: messages.length,
      preservedRecentMessages: keptMessages.length,
      preCompactTokenCount,
      postCompactTokenCount,
      prePtlPostCompactTokenCount,
      truePostCompactPayloadBudget: postCompactPayloadBudget,
      postCompactPayloadGate,
      context_budget: effectiveContextBudget,
      activeTokensBeforeCompact: activeTokens,
      triggerTokens,
      pressurePercent,
      contextPressureWarning: postCompactWarning,
      compactWarning: postCompactWarning,
      preCompactWarning,
      postCompactRecoveryAudit,
      postCompactCleanupAudit,
      summarySource,
      modelMode: sessionMemoryCompactSelection?.selected === true
        ? "session-memory-reused"
        : modelCompactionEnabled ? "hybrid-opt-in" : "session-memory-first",
      modelAttempted: shouldAttemptModel,
      modelRequestAudit,
      compactionUsage,
      sessionMemoryCompactSelection,
      summaryChecksum,
      compactTransactionReceipt,
      postCompactMessageOrderReceipt,
      compactLineage,
      deterministicFactsPreserved: true,
      validation,
      qualityGateVersion: quality.schema,
      quality,
      downgradedByQualityGate,
      qualityDowngradeReason,
      driftDetected: quality.drift.detected,
      microCompact,
      postCompactReinject,
      preCompactDiscoveredTools,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      partialCompact,
      partialSegments,
      lastPartialCompactedAt: partialSidecarSegment ? now : String(previousState.lastPartialCompactedAt || ""),
      lastPartialSegmentId: partialSidecarSegment?.id || String(previousState.lastPartialSegmentId || ""),
      ptlEmergency,
      ptlRecovery,
      preservedSegment,
      compactStrategyDecision,
      apiMicroCompactEditPlan,
      hookResults: {
        pre: preHookResults.slice(-20),
        post: postHookResults.slice(-20),
      },
      hookLedger: {
        schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
        hookRunId: compactionHookRunId,
        file: latestHookLedger.file,
        stats: latestHookLedger.stats,
        recentEntries: (Array.isArray(latestHookLedger.entries) ? latestHookLedger.entries : [])
          .filter((entry: any) => entry.hook_run_id === compactionHookRunId)
          .slice(-20),
      },
      rejectedModelValidation,
      reductionRatio,
      thrashCount,
      health,
      consecutiveFailures: !modelCompactionEnabled || summarySource === "hybrid" ? 0 : Math.min(GROUP_COMPACT_MAX_FAILURES, failures + (failure ? 1 : 0)),
      lastFailure: modelCompactionEnabled ? failure : "",
      lastFailureAt: modelCompactionEnabled ? (failure ? now : String(previousState.lastFailureAt || "")) : "",
      nextModelRetryAt: modelCompactionEnabled && failure && failures + 1 >= GROUP_COMPACT_MAX_FAILURES
        ? new Date(nowMs + GROUP_COMPACT_MODEL_RETRY_MS).toISOString()
        : "",
      transcriptPath: input.transcriptPath,
      boundaries: [...(Array.isArray(previousState.boundaries) ? previousState.boundaries : []), boundary].slice(-8),
    },
    messageCompression: {
      enabled: true,
      strategy: "cc-session-memory-v3+micro-compact",
      totalMessages: messages.length,
      compressedMessages: totalCompacted,
      recentMessages: keptMessages.length,
      recentLimit: keptMessages.length,
      olderLimit: totalCompacted,
      preCompactTokenCount,
      postCompactTokenCount,
      prePtlPostCompactTokenCount,
      truePostCompactPayloadBudget: postCompactPayloadBudget,
      postCompactPayloadGate,
      microCompactTokensFreed: microCompact.tokensFreed,
      partialCompact,
      partialSegments: partialSegments.slice(-GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
      ptlEmergency,
      ptlRecovery,
      preservedSegment,
      postCompactRecoveryAudit,
      postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
      compactStrategyDecision,
      apiMicroCompactEditPlan,
      postCompactCleanupAudit,
      compactTransactionReceipt,
      postCompactMessageOrderReceipt,
      compactLineage,
      compactionUsage,
      sessionMemoryCompactSelection,
      contextPressureWarning: postCompactWarning,
      lastCompressedAt: now,
    },
  };
  return { compacted: true, memory: nextMemory, boundary, keepIndex, contextPressureWarning: postCompactWarning, preCompactWarning, postCompactRecoveryAudit, postCompactCleanupAudit, postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt, compactStrategyDecision, apiMicroCompactEditPlan, compactTransactionReceipt, postCompactMessageOrderReceipt, compactLineage, compactionUsage, sessionMemoryCompactSelection, truePostCompactPayloadBudget: postCompactPayloadBudget, postCompactPayloadGate };
}

export async function runGroupMemoryPreservedSegmentSelfTest() {
  const messages = [
    ...Array.from({ length: 24 }, (_, index) => ({
      id: `ps-old-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      target: index % 2 === 0 ? "coordinator" : undefined,
      agent: index % 2 === 1 ? "worker" : undefined,
      content: `preserved segment old message ${index} ${"上下文".repeat(40)}`,
    })),
    {
      id: "ps-task-user",
      role: "user",
      target: "coordinator",
      task_id: "preserved-task",
      content: "必须保留 PRESERVED_SEGMENT_SENTINEL，给 api 子 Agent 继续处理 src/preserved.ts。",
    },
    {
      id: "ps-task-result",
      role: "assistant",
      agent: "api",
      receipt: { status: "failed", taskId: "preserved-task", summary: "PRESERVED_SEGMENT_SENTINEL 仍需继续修复" },
      content: "api 回执：PRESERVED_SEGMENT_SENTINEL 失败，src/preserved.ts 还需要继续处理。",
    },
  ];
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 1, minTokens: 1, maxTokens: 5000 });
  const segment = buildGroupPreservedSegment(messages, keepIndex, {
    minMessages: 1,
    minTokens: 1,
    maxTokens: 5000,
    summaryChecksum: "preserved-segment-selftest",
    transcriptPath: "preserved-segment-raw.json",
    now: "2026-07-07T00:00:00.000Z",
  });
  const result: any = await compactGroupConversationMemory({
    groupId: "preserved-segment-self-test",
    groupSessionId: "gcs_preserved_segment_selftest",
    messages,
    memory: { goal: "preserved segment selftest", compaction: {} },
    transcriptPath: "preserved-segment-raw.json",
    force: true,
    config: { minKeepMessages: 1, minKeepTokens: 1, maxKeepTokens: 5000 },
  });
  const boundarySegment = result.boundary?.preservedSegment || {};
  const checks = {
    keepIndexExpandedToTaskStart: keepIndex === 24 && messages[keepIndex]?.id === "ps-task-user",
    taskTransactionProtected: segment.protectedTaskTransaction === true
      && segment.firstPreservedMessageId === "ps-task-user"
      && segment.lastPreservedMessageId === "ps-task-result",
    segmentRecordsBudget: segment.preservedTokenEstimate > 0
      && segment.minTextBlockMessages === 1
      && segment.maxTokens === 5000,
    compactBoundaryCarriesSegment: result.compacted === true
      && boundarySegment.schema === "ccm-group-preserved-segment-v1"
      && boundarySegment.firstPreservedMessageId === "ps-task-user"
      && boundarySegment.lastPreservedMessageId === "ps-task-result",
    postCompactRestoreCarriesSegment: result.boundary?.post_compact_restore?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    memoryCarriesSegment: result.memory?.compaction?.preservedSegment?.schema === "ccm-group-preserved-segment-v1"
      && result.memory?.messageCompression?.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    rawTranscriptUntouched: messages[24].content.includes("PRESERVED_SEGMENT_SENTINEL") && messages.length === 26,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, segment, boundarySegment };
}

export async function runGroupMemoryPostCompactRecoveryAuditSelfTest() {
  const messages = Array.from({ length: 46 }, (_, index) => ({
    id: `audit-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "audit-worker" : undefined,
    task_id: index >= 10 && index <= 18 ? "audit-task" : undefined,
    content: index === 0
      ? "必须保留 RECOVERY_AUDIT_SENTINEL_20260707，压缩后子 Agent 仍要拿到恢复审计。"
      : index === 11
        ? "audit-worker 修改 src/recovery-audit.ts，执行 npm run check passed。"
        : `恢复审计测试消息 ${index} src/audit-${index}.ts ${"上下文".repeat(160)}`,
    receipt: index === 11 ? {
      status: "done",
      taskId: "audit-task",
      summary: "完成 recovery audit",
      filesChanged: ["src/recovery-audit.ts"],
      verification: ["npm run check passed"],
    } : undefined,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "post-compact-recovery-audit-self-test",
    groupSessionId: "gcs_post_compact_recovery_selftest",
    messages,
    memory: { goal: "压缩后恢复审计自测" },
    config: { memoryCompactionUseModel: false, minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 3200 },
    transcriptPath: "post-compact-recovery-audit-raw.json",
    force: true,
  });
  const audit = result.memory?.compaction?.postCompactRecoveryAudit || {};
  const boundaryAudit = result.boundary?.post_compact_restore?.recoveryAudit || {};
  const messageCompressionAudit = result.memory?.messageCompression?.postCompactRecoveryAudit || {};
  const checkById = new Map<string, any>((audit.checks || []).map((check: any) => [check.id, check]));
  const candidateCounts = audit.candidateCounts || {};
  const candidateTotal = ["files", "skills", "verification", "blockers"].reduce((sum, key) => sum + Number(candidateCounts[key] || 0), 0);
  const checks = {
    compacted: result.compacted === true,
    auditRecordedInCompaction: audit.schema === "ccm-post-compact-recovery-audit-v1" && audit.status === "pass" && audit.pass === true,
    auditRecordedInBoundary: boundaryAudit.schema === "ccm-post-compact-recovery-audit-v1" && boundaryAudit.summaryChecksum === audit.summaryChecksum,
    auditRecordedInMessageCompression: messageCompressionAudit.schema === "ccm-post-compact-recovery-audit-v1",
    boundaryRangeResolvable: checkById.get("boundary_range_resolvable")?.pass === true
      && checkById.get("compact_window_matches_keep_index")?.pass === true,
    rawTranscriptRecoverable: checkById.get("raw_transcript_path_recorded")?.pass === true
      && audit.transcriptPath === "post-compact-recovery-audit-raw.json",
    preservedAndReinjectReady: checkById.get("preserved_segment_recorded")?.pass === true
      && checkById.get("post_compact_reinject_plan_recorded")?.pass === true
      && candidateTotal > 0,
    warningSuppressedAfterCompact: checkById.get("post_compact_warning_suppressed")?.pass === true,
    childAgentActionSafe: audit.action === "safe_to_inject_child_agent_memory_packet"
      && String(audit.cleanupPolicy?.childAgentIsolation || "").includes("child_agent"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return { pass: Object.values(checks).every(Boolean), checks, audit };
}

export function runGroupMemoryCompactWarningSelfTest() {
  const config = {
    memoryContextWindowTokens: 80_000,
    memoryReservedTokens: 20_000,
    groupWarningBufferTokens: 20_000,
    groupErrorBufferTokens: 10_000,
    groupManualCompactBufferTokens: 3_000,
  };
  const ok = calculateGroupCompactWarningState({ activeTokens: 10_000, config, now: "2026-07-07T00:00:00.000Z" });
  const warning = calculateGroupCompactWarningState({ activeTokens: 30_000, config, now: "2026-07-07T00:00:00.000Z" });
  const error = calculateGroupCompactWarningState({ activeTokens: 40_000, config, now: "2026-07-07T00:00:00.000Z" });
  const autoCompact = calculateGroupCompactWarningState({ activeTokens: 48_000, config, activeMessageCount: 120, now: "2026-07-07T00:00:00.000Z" });
  const blocking = calculateGroupCompactWarningState({ activeTokens: 58_000, config, now: "2026-07-07T00:00:00.000Z" });
  const suppressed = calculateGroupCompactWarningState({
    activeTokens: 20_000,
    config,
    suppressed: true,
    suppressReason: "selftest_post_compaction",
    now: "2026-07-07T00:00:00.000Z",
  });
  const checks = {
    effectiveWindowMatchesCcStyleBudget: getGroupEffectiveContextWindow(config) === 60_000,
    autoThresholdMatchesBuffer: getGroupAutoCompactThreshold(config) === 47_000,
    okLevel: ok.level === "ok" && ok.flags.isAboveWarningThreshold === false,
    warningLevel: warning.level === "warning" && warning.flags.isAboveWarningThreshold === true && warning.flags.isAboveErrorThreshold === false,
    errorLevel: error.level === "error" && error.flags.isAboveErrorThreshold === true && error.flags.isAboveAutoCompactThreshold === false,
    autoCompactLevel: autoCompact.level === "auto_compact" && autoCompact.flags.isAboveAutoCompactThreshold === true,
    blockingLevel: blocking.level === "blocking" && blocking.flags.isAtBlockingLimit === true,
    suppressedLevel: suppressed.level === "suppressed" && suppressed.suppressed === true && suppressed.recommendation.includes("suppress"),
    thresholdsRecorded: warning.thresholds.warningThreshold === 27_000
      && warning.thresholds.errorThreshold === 37_000
      && warning.thresholds.blockingThreshold === 57_000,
  };
  return { pass: Object.values(checks).every(Boolean), checks, states: { ok, warning, error, autoCompact, blocking, suppressed } };
}

export function runGroupMemoryCompactionSelfTest() {
  const messages: any[] = [];
  for (let i = 0; i < 36; i++) {
    messages.push({ id: `u${i}`, role: "user", target: "coordinator", content: i === 0 ? "实现订单审核并保留权限校验" : `用户补充要求 ${i}` });
    messages.push({ id: `a${i}`, role: "assistant", agent: "backend", content: i === 10 ? "执行失败：mvn test 超时，需要修复" : `处理进度 ${i}，文件 src/order-${i}.ts`, receipt: i < 30 ? { status: "done", summary: `完成 ${i}` } : undefined });
  }
  const keepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const boundaryKeepIndex = calculateGroupMessagesToKeepIndex(messages, { floorIndex: 60, minMessages: 8, minTokens: 500, maxTokens: 1800 });
  const compacted = messages.slice(0, keepIndex);
  const kept = messages.slice(keepIndex);
  const summary = buildDeterministicConversationSummary(compacted, { goal: "实现订单审核", decisions: [], completed: [], blocked: [], nextActions: [{ action: "继续测试" }] });
  const bounded = buildBoundedRecentGroupContext([{ id: "large", role: "assistant", agent: "worker", content: "x".repeat(20_000) }], 1);
  const retrieval = buildRelevantHistoricalGroupContext(messages, Math.max(0, keepIndex - 1), "订单审核 权限校验");
  const unsafeModel = { ...createEmptyConversationSummary(), filesAndCode: ["src/fake-hallucination.ts"], completedWork: ["已经上线生产"] };
  const safeMerged = mergeSafeConversationSummary(createEmptyConversationSummary(), summary, unsafeModel, compacted);
  const anchors = extractFactAnchors(compacted);
  const checks = {
    keepsRecentMessages: kept.length >= 8,
    compactsOlderMessages: compacted.length > 0,
    preservesUserIntent: summary.userMessages.some(item => item.includes("实现订单审核")),
    preservesErrors: summary.errorsAndFixes.some(item => item.includes("mvn test")),
    preservesFiles: summary.filesAndCode.some(item => item.includes("src/order-")),
    preservesNextStep: summary.nextStep.includes("继续测试"),
    microCompactsLargeOutput: bounded.length < 8_000 && bounded.includes("micro-compact"),
    rawTranscriptUntouched: messages[0].content === "实现订单审核并保留权限校验" && messages.length === 72,
    neverCrossesPreviousBoundary: boundaryKeepIndex >= 60,
    retrievesCompressedOriginalEvidence: retrieval.includes("#u0") && retrieval.includes("权限校验"),
    rejectsUngroundedModelClaims: !safeMerged.filesAndCode.includes("src/fake-hallucination.ts") && !safeMerged.completedWork.includes("已经上线生产"),
    preservesDeterministicFacts: safeMerged.filesAndCode.some(item => item.includes("src/order-")) && safeMerged.userMessages.some(item => item.includes("权限校验")),
    storesChecksummedUserAnchors: anchors.some(item => item.messageId === "u0" && item.type === "user_requirement" && item.checksum.length === 16),
    adaptiveThresholdMatchesDefaultBudget: getGroupAutoCompactThreshold({}) === GROUP_COMPACT_TRIGGER_TOKENS,
  };
  return { pass: Object.values(checks).every(Boolean), checks, keepIndex, keptMessages: kept.length, compactedMessages: compacted.length };
}

export function runGroupMemoryModelCapacitySelfTest() {
  const defaultCapacity = resolveGroupModelContextCapacity({});
  const preset516 = {
    modelContextWindow: 516_000,
    modelAutoCompactTokenLimit: 460_000,
  };
  const preset1m = {
    model_context_window: 1_000_000,
    model_auto_compact_token_limit: 900_000,
  };
  const sentinel = "MODEL_CAPACITY_3MB_SENTINEL";
  const largeContent = `${sentinel}:${"上下文容量证据".repeat(220_000)}`;
  const messages: any[] = [
    { id: "large-3mb", role: "user", content: largeContent },
    { id: "tail", role: "assistant", content: "继续执行并保留原始记录" },
  ];
  const fallback = buildDeterministicConversationSummary(messages, { goal: sentinel });
  const request = buildGroupCompactionModelRequest(messages, {}, fallback, {
    model: "small-window-selftest",
    modelContextWindow: 64_000,
    modelMaxOutputTokens: 8_000,
  });
  const checks = {
    ccDefaultUsesTwentyKSummaryReserve: defaultCapacity.contextWindow === 200_000
      && defaultCapacity.reservedOutputTokens === 20_000
      && defaultCapacity.effectiveContextWindow === 180_000,
    ccDefaultAutoCompactThresholdIs167k: getGroupAutoCompactThreshold({}) === 167_000,
    preset516IsApplied: getGroupEffectiveContextWindow(preset516) === 496_000
      && getGroupAutoCompactThreshold(preset516) === 460_000,
    preset1mIsApplied: getGroupEffectiveContextWindow(preset1m) === 980_000
      && getGroupAutoCompactThreshold(preset1m) === 900_000,
    threeMbSourceIsNeverSentWhole: request.audit.estimatedInputTokensBefore < estimateTextTokens(largeContent)
      && request.audit.estimatedInputTokens <= request.audit.maxInputTokens,
    requestCarriesCapacityProof: request.audit.schema === "ccm-group-compaction-model-request-budget-v1"
      && request.audit.withinBudget === true
      && request.audit.rawTranscriptPreserved === true,
    originalMemoryRemainsUntouched: messages[0].content.length === largeContent.length
      && messages[0].content.startsWith(sentinel),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    defaultCapacity,
    preset516Threshold: getGroupAutoCompactThreshold(preset516),
    preset1mThreshold: getGroupAutoCompactThreshold(preset1m),
    requestAudit: request.audit,
    sourceChars: largeContent.length,
  };
}

export async function runGroupCompactStrategyDecisionSelfTest() {
  const messages: any[] = [];
  for (let i = 0; i < 28; i++) {
    messages.push({
      id: `csd-user-${i}`,
      role: "user",
      target: "coordinator",
      task_id: `csd-task-${Math.floor(i / 2)}`,
      content: i === 0
        ? "必须保留 COMPACT_STRATEGY_DECISION_SENTINEL，子 Agent 新会话要知道本次为什么压缩。"
        : `压缩策略决策用户消息 ${i} src/strategy-${i}.ts ${"上下文".repeat(25)}`,
    });
    messages.push({
      id: `csd-agent-${i}`,
      role: "assistant",
      agent: "api",
      task_id: `csd-task-${Math.floor(i / 2)}`,
      content: `api 输出 ${i}，涉及 src/strategy-${i}.ts，npm run check ${"执行结果".repeat(30)}`,
      receipt: { status: "done", taskId: `csd-task-${Math.floor(i / 2)}`, filesChanged: [`src/strategy-${i}.ts`], verification: ["npm run check"] },
    });
  }
  const directKeepIndex = calculateGroupMessagesToKeepIndex(messages, { minMessages: 2, minTokens: 1, maxTokens: 1400 });
  const directMicro = buildGroupMicroCompactPlan(messages.slice(0, directKeepIndex), { maxChars: 900 });
  const directPreserved = buildGroupPreservedSegment(messages, directKeepIndex, {
    minMessages: 2,
    minTokens: 1,
    maxTokens: 1400,
    summaryChecksum: "compact-strategy-direct-summary",
    transcriptPath: "compact-strategy-direct-raw.json",
    now: "2026-07-08T00:00:00.000Z",
  });
  const directDecision = buildGroupCompactStrategyDecision({
    groupId: "compact-strategy-direct",
    messages,
    messagesToCompact: messages.slice(0, directKeepIndex),
    keptMessages: messages.slice(directKeepIndex),
    keepIndex: directKeepIndex,
    compacted: true,
    primaryCompact: true,
    microCompact: directMicro,
    preservedSegment: directPreserved,
    preCompactTokenCount: 9000,
    postCompactTokenCount: 1800,
    summaryChecksum: "compact-strategy-direct-summary",
    transcriptPath: "compact-strategy-direct-raw.json",
    reason: "selftest direct strategy decision",
    now: "2026-07-08T00:00:00.000Z",
  });
  const compacted: any = await compactGroupConversationMemory({
    groupId: `compact-strategy-selftest-${process.pid}`,
    groupSessionId: "gcs_compact_strategy_selftest",
    messages,
    memory: { goal: "compact strategy decision selftest", compaction: {} },
    transcriptPath: "compact-strategy-selftest-raw.json",
    force: true,
    config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1400, microCompact: { maxChars: 900 } },
  });
  const decision = compacted.memory?.compaction?.compactStrategyDecision || {};
  const boundaryDecision = compacted.boundary?.post_compact_restore?.strategyDecision || {};
  const checks = {
    directDecisionHasSchema: directDecision.schema === "ccm-group-compact-strategy-decision-v1"
      && directDecision.mode
      && directDecision.transcriptPath === "compact-strategy-direct-raw.json",
    directDecisionRecordsWindow: directDecision.messagesToSummarize === directKeepIndex
      && directDecision.keptMessages === messages.length - directKeepIndex
      && directDecision.preservedSegment?.schema === "ccm-group-preserved-segment-v1",
    directDecisionPassesInvariants: directDecision.invariantPass === true
      && directDecision.invariants?.noSplitTaskTransactions === true
      && directDecision.invariants?.noSplitToolResultPairs === true,
    compactResultCarriesDecision: decision.schema === "ccm-group-compact-strategy-decision-v1"
      && decision.compacted === true
      && decision.summaryChecksum === compacted.memory?.compaction?.summaryChecksum,
    boundaryCarriesDecision: boundaryDecision.decisionChecksum === decision.decisionChecksum
      && compacted.boundary?.compactStrategyDecision?.decisionChecksum === decision.decisionChecksum,
    decisionMentionsCcStyleMode: ["normal_compact", "micro_compact", "partial_compact", "ptl_emergency", "ptl_recovery"].includes(decision.mode)
      && decision.strategy === "cc-session-memory-v3-compatible",
  };
  return { pass: Object.values(checks).every(Boolean), checks, decision: { mode: decision.mode, invariantPass: decision.invariantPass, decisionChecksum: decision.decisionChecksum } };
}

export async function runGroupPostCompactCleanupAuditSelfTest() {
  const groupId = `post-compact-cleanup-selftest-${process.pid}`;
  const groupSessionId = "gcs_post_compact_cleanup_selftest";
  const messages: any[] = [];
  for (let i = 0; i < 20; i++) {
    messages.push({
      id: `pcca-user-${i}`,
      role: "user",
      target: "coordinator",
      content: i === 0
        ? "必须保留 POST_COMPACT_CLEANUP_SENTINEL，压缩后不能清掉 skill/tool continuity。"
        : `cleanup audit 用户消息 ${i} src/cleanup-${i}.ts ${"上下文".repeat(30)}`,
    });
    messages.push({
      id: `pcca-agent-${i}`,
      role: "assistant",
      agent: "api",
      task_id: `pcca-task-${i}`,
      content: `Skill:typescript-audit#cleanup-${i}\napi cleanup 输出 ${i}，文件 src/cleanup-${i}.ts，npm run check ${"日志".repeat(40)}`,
      invokedSkills: [{ name: "typescript-audit", contentHash: `cleanup-${i}` }],
      receipt: { status: "done", filesChanged: [`src/cleanup-${i}.ts`], verification: ["npm run check"] },
    });
  }
  const result: any = await compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages,
    memory: { goal: "post compact cleanup audit selftest", compaction: {} },
    transcriptPath: "post-compact-cleanup-selftest-raw.json",
    force: true,
    config: { minKeepMessages: 2, minKeepTokens: 1, maxKeepTokens: 1600, microCompact: { maxChars: 900 } },
  });
  const audit = result.memory?.compaction?.postCompactCleanupAudit || {};
  const boundaryAudit = result.boundary?.post_compact_restore?.cleanupAudit || {};
  const messageCompressionAudit = result.memory?.messageCompression?.postCompactCleanupAudit || {};
  const receipt = result.compactTransactionReceipt || result.memory?.compaction?.compactTransactionReceipt || {};
  const actionIds = (audit.cleanupActions || []).map((item: any) => item.id);
  const checkById = new Map<string, any>((audit.checks || []).map((check: any) => [check.id, check]));
  const auditVerification = verifyGroupPostCompactCleanupAudit(audit, { groupId, groupSessionId, boundaryId: result.boundary?.id });
  const receiptVerification = verifyGroupCompactTransactionReceipt(receipt, {
    groupId,
    groupSessionId,
    boundaryId: result.boundary?.id,
    cleanupAuditChecksum: audit.audit_checksum,
  });
  const tamperedAudit = {
    ...audit,
    groupSessionId: "gcs_post_compact_cleanup_other",
    scopeId: `${groupId}::gcs_post_compact_cleanup_other`,
    compactSource: {
      ...(audit.compactSource || {}),
      querySource: `group_main:${groupId}::gcs_post_compact_cleanup_other`,
    },
    cleanupScope: {
      ...(audit.cleanupScope || {}),
      groupSessionId: "gcs_post_compact_cleanup_other",
      scopeId: `${groupId}::gcs_post_compact_cleanup_other`,
    },
  };
  tamperedAudit.audit_checksum = groupPostCompactCleanupAuditChecksum(tamperedAudit);
  const crossSessionVerification = verifyGroupPostCompactCleanupAudit(tamperedAudit, { groupId, groupSessionId, boundaryId: result.boundary?.id });
  const reboundReceiptVerification = verifyGroupCompactTransactionReceipt(receipt, {
    groupId,
    groupSessionId,
    boundaryId: result.boundary?.id,
    cleanupAuditChecksum: tamperedAudit.audit_checksum,
  });
  const checks = {
    cleanupAuditHasSchema: audit.schema === "ccm-post-compact-cleanup-audit-v2"
      && audit.status === "pass"
      && audit.action === "cleanup_recorded_and_safe_to_dispatch_fresh_child_context",
    cleanupAuditBindsExactMainAgentSession: auditVerification.valid === true
      && audit.groupSessionId === groupSessionId
      && audit.scopeId === `${groupId}::${groupSessionId}`
      && audit.compactSource?.kind === "group_main_agent"
      && audit.cleanupScope?.allowsOtherGroupSessionReset === false
      && audit.cleanupScope?.allowsGlobalReset === false,
    cleanupAuditRecordedEverywhere: boundaryAudit.schema === audit.schema
      && boundaryAudit.summaryChecksum === audit.summaryChecksum
      && messageCompressionAudit.schema === audit.schema,
    cleanupLinksStrategyAndRecovery: checkById.get("strategy_decision_linked")?.pass === true
      && checkById.get("recovery_audit_linked")?.pass === true
      && audit.compactStrategyDecisionId === result.memory?.compaction?.compactStrategyDecision?.decisionId,
    cleanupPreservesRawTranscript: checkById.get("raw_transcript_preserved")?.pass === true
      && audit.transcriptPath === "post-compact-cleanup-selftest-raw.json",
    cleanupPreservesSkillAndToolContinuity: audit.preserveInvokedSkills === true
      && audit.preserveToolContinuity === true
      && checkById.get("invoked_skills_preserved")?.pass === true,
    cleanupActionsCoverCcStyleState: ["reset_microcompact_tracking", "rebuild_child_context_packets", "preserve_skill_continuity", "preserve_raw_recovery_sources", "do_not_delete_ledgers"].every(id => actionIds.includes(id)),
    cleanupDoesNotMutateRawMessages: messages[0].content.includes("POST_COMPACT_CLEANUP_SENTINEL")
      && messages.length === 40,
    compactReceiptBindsCleanupAuditChecksum: receipt.schema === "ccm-group-memory-compact-transaction-receipt-v3"
      && receipt.cleanup_audit_checksum === audit.audit_checksum
      && receiptVerification.valid === true,
    crossSessionAuditCopyFailsClosed: crossSessionVerification.valid === false
      && crossSessionVerification.issues.includes("post_compact_cleanup_group_session_mismatch"),
    recomputedTamperedAuditCannotRebindReceipt: reboundReceiptVerification.valid === false
      && reboundReceiptVerification.issues.includes("compact_transaction_cleanup_audit_mismatch"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, audit: { status: audit.status, actionIds, failedChecks: audit.failedChecks || [] } };
}

export async function runGroupApiMicroCompactEditPlanSelfTest() {
  const messages: any[] = [
    {
      id: "api-mc-thinking",
      role: "assistant",
      agent: "api",
      timestamp: "2026-07-08T03:00:00.000Z",
      content: [
        { type: "thinking", thinking: "API_MICROCOMPACT_THINKING_SENTINEL" },
        { type: "tool_use", id: "tool-read-1", name: "Read", input: { file_path: "src/api-microcompact.ts" } },
      ],
    },
    {
      id: "api-mc-tool-result",
      role: "user",
      timestamp: "2026-07-08T03:01:00.000Z",
      content: [
        { type: "tool_result", tool_use_id: "tool-read-1", content: "src/api-microcompact.ts\nAPI_MICROCOMPACT_TOOL_RESULT_SENTINEL" },
      ],
    },
    ...Array.from({ length: 28 }, (_, index) => ({
      id: `api-mc-${index}`,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "api" : undefined,
      target: index % 2 ? undefined : "coordinator",
      content: `API microcompact edit plan 自测 ${index}，src/api-microcompact-${index}.ts ${"上下文".repeat(40)}`,
    })),
  ];
  const direct = buildGroupApiMicroCompactEditPlan(messages, {
    groupId: "api-microcompact-direct",
    activeTokens: 220_000,
    force: true,
    now: "2026-07-08T04:30:00.000Z",
  });
  const compacted: any = await compactGroupConversationMemory({
    groupId: `api-microcompact-selftest-${process.pid}`,
    groupSessionId: "gcs_api_microcompact_selftest",
    messages,
    memory: { goal: "api microcompact edit plan selftest", compaction: {} },
    transcriptPath: "api-microcompact-selftest-raw.json",
    force: true,
    config: {
      minKeepMessages: 2,
      minKeepTokens: 1,
      maxKeepTokens: 1600,
      apiMicrocompactMaxInputTokens: 1000,
      apiMicrocompactTargetInputTokens: 400,
    },
  });
  const plan = compacted.memory?.compaction?.apiMicroCompactEditPlan || {};
  const boundaryPlan = compacted.boundary?.post_compact_restore?.apiMicroCompactEditPlan || {};
  const editTypes = (direct.contextManagement?.edits || []).map((edit: any) => edit.type);
  const checks = {
    directPlanHasSchema: direct.schema === "ccm-api-microcompact-edit-plan-v1"
      && direct.source === "claude-code-api-microcompact-compatible"
      && direct.planChecksum,
    directPlanIncludesThinkingEdit: editTypes.includes("clear_thinking_20251015")
      && direct.signalCounts.thinkingBlocks >= 1,
    directPlanIncludesToolEdit: editTypes.includes("clear_tool_uses_20250919")
      && direct.signalCounts.toolUses >= 1
      && direct.signalCounts.toolResults >= 1,
    compactResultCarriesPlan: plan.schema === "ccm-api-microcompact-edit-plan-v1"
      && plan.editCount > 0
      && plan.contextManagement?.edits?.length === plan.editCount,
    boundaryAndCleanupCarryPlan: boundaryPlan.planChecksum === plan.planChecksum
      && compacted.memory?.compaction?.postCompactCleanupAudit?.apiMicroCompactEditPlanId === plan.planChecksum,
    planIsAdvisoryForThirdPartyCli: plan.advisoryOnly === true
      && plan.canApplyNatively === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks, plan: { editCount: plan.editCount, checksum: plan.planChecksum, signalCounts: plan.signalCounts } };
}

export function runGroupApiMicrocompactNativeApplyPlanSelfTest() {
  const editPlan = buildGroupApiMicroCompactEditPlan([
    {
      id: "native-apply-thinking",
      role: "assistant",
      content: [{ type: "thinking", thinking: "NATIVE_APPLY_THINKING_SENTINEL" }],
    },
    {
      id: "native-apply-tool",
      role: "assistant",
      content: [{ type: "tool_use", id: "native-read", name: "Read", input: { file_path: "src/native.ts" } }],
    },
    {
      id: "native-apply-result",
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "native-read", content: "native apply result" }],
    },
  ], {
    groupId: "native-apply-selftest",
    targetProject: "api",
    activeTokens: 220000,
    force: true,
    now: "2026-07-08T07:00:00.000Z",
  });
  const cli = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claudecode",
    transport: "cli",
    now: "2026-07-08T07:01:00.000Z",
  });
  const native = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claude-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    contextManagementBetaHeaderEnabled: true,
    sessionBinding: {
      schema: "ccm-child-agent-memory-session-binding-v1",
      binding_id: "csm-native-apply-selftest",
      task_agent_session_id: "tas-native-apply-selftest",
      native_session_id: "native-native-apply-selftest",
    },
    now: "2026-07-08T07:02:00.000Z",
  });
  const missingBeta = buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
    agentType: "claude-api",
    transport: "anthropic_api",
    provider: "anthropic",
    supportsApiContextManagement: true,
    nativeApiRequestLayer: true,
    now: "2026-07-08T07:03:00.000Z",
  });
  const checks = {
    cliStaysAdvisory: cli.schema === "ccm-api-microcompact-native-apply-plan-v1"
      && cli.mode === "advisory_only"
      && cli.nativeApplyReady === false
      && cli.requestPatch === null
      && cli.executor.cli === true,
    nativeApiBuildsRealRequestPatch: native.mode === "native_api_context_management"
      && native.nativeApplyReady === true
      && native.requestPatch?.body?.context_management?.edits?.length === editPlan.editCount
      && native.requestPatch?.beta_headers?.includes(GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA),
    nativePatchLinksEditPlan: native.apiEditPlanChecksum === editPlan.planChecksum
      && native.requestPatchChecksum
      && native.applyPlanChecksum,
    nativePatchBindsChildAgentSession: native.task_agent_session_id === "tas-native-apply-selftest"
      && native.sessionBindingRequired === true
      && native.receiptContract?.required_task_agent_session_id === "tas-native-apply-selftest"
      && native.receiptContract?.required_apply_plan_checksum === native.applyPlanChecksum,
    missingBetaFailsClosed: missingBeta.nativeApplyReady === false
      && missingBeta.failedChecks.includes("context_management_beta_enabled")
      && missingBeta.requestPatch === null,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    cli: { mode: cli.mode, reason: cli.reason, failedChecks: cli.failedChecks },
    native: { mode: native.mode, requestPatch: native.requestPatch, checksum: native.applyPlanChecksum },
    missingBeta: { mode: missingBeta.mode, failedChecks: missingBeta.failedChecks },
  };
}

export function runGroupMemoryQualityGateSelfTest() {
  const messages: any[] = [
    {
      id: "q-user-0",
      role: "user",
      target: "coordinator",
      content: "必须保留 HARD_MEMORY_SENTINEL_20260707，不能在测试失败时声明全部完成。",
    },
    {
      id: "q-worker-0",
      role: "assistant",
      agent: "backend",
      task_id: "quality-task-1",
      content: "执行失败：vitest timeout，quality-task-1 blocked，需要继续修复。",
      receipt: { status: "failed", taskId: "quality-task-1", summary: "vitest timeout" },
    },
  ];
  const fallback = buildDeterministicConversationSummary(messages, {
    goal: "质量门禁自测",
    nextActions: [{ action: "继续修复 quality-task-1" }],
  });
  const persistentRequirements = mergePersistentRequirements([], extractPersistentRequirements(messages));
  const factAnchors = mergeFactAnchors([], extractFactAnchors(messages));
  const good = evaluateGroupMemorySummaryQuality(fallback, fallback, messages, {}, { persistentRequirements, factAnchors });
  const bad: ConversationSummary = {
    ...fallback,
    userMessages: [],
    errorsAndFixes: [],
    pendingTasks: [],
    taskStates: [],
    currentWork: "released to production PROD_RELEASE_999",
    nextStep: "",
    completedWork: mergeUnique(fallback.completedWork, ["released to production PROD_RELEASE_999"], 30, 700),
  };
  const badQuality = evaluateGroupMemorySummaryQuality(bad, fallback, messages, {}, { persistentRequirements, factAnchors });
  const checks = {
    goodSummaryPasses: good.pass === true && good.score >= 80,
    goodSummaryPreservesSentinel: JSON.stringify(fallback).includes("HARD_MEMORY_SENTINEL_20260707"),
    badSummaryFails: badQuality.pass === false && badQuality.downgrade_required === true,
    driftDetected: badQuality.drift.detected === true,
    missingFallbackDetected: badQuality.checks.some(check => check.id === "fallback_preserved" && check.pass === false),
    ungroundedCompletionDetected: badQuality.checks.some(check => check.id === "no_ungrounded_completion" && check.pass === false),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    good: { score: good.score, status: good.status },
    bad: { score: badQuality.score, status: badQuality.status, downgrade_reason: badQuality.downgrade_reason },
  };
}

export function runGroupMemoryMicroCompactSelfTest() {
  const longOutput = [
    "构建输出开始",
    "src/payment/callback.ts",
    "Skill:typescript-audit#abc123",
    "npm run check passed",
    "x".repeat(12_000),
    "构建输出结束 MICRO_COMPACT_TAIL_SENTINEL",
  ].join("\n");
  const messages: any[] = [
    {
      id: "mc-user-0",
      role: "user",
      content: "实现支付回调。",
    },
    {
      id: "mc-agent-0",
      role: "assistant",
      agent: "payment-agent",
      task_id: "mc-task",
      content: longOutput,
      invokedSkills: [{ name: "typescript-audit", contentHash: "abc123" }],
      receipt: {
        status: "done",
        filesChanged: ["src/payment/callback.ts"],
        verification: ["npm run check passed"],
      },
    },
  ];
  const micro = buildGroupMicroCompactPlan(messages, { maxChars: 1400 });
  const reinject = buildPostCompactReinjectionPlan(messages, micro);
  const checks = {
    compactedLongAgentOutput: micro.compactedMessageCount === 1 && micro.tokensFreed > 0,
    preservesTailSentinel: JSON.stringify(micro.records).includes("MICRO_COMPACT_TAIL_SENTINEL"),
    recordsChecksum: String(micro.records?.[0]?.checksum || "").length === 16,
    reinjectsFile: reinject.files.some((item: any) => String(item.value || "").includes("src/payment/callback.ts")),
    reinjectsSkill: reinject.skills.some((item: any) => String(item.value || "").includes("typescript-audit")),
    reinjectsVerification: reinject.verification.some((item: any) => String(item.value || "").includes("npm run check")),
  };
  return { pass: Object.values(checks).every(Boolean), checks, micro: { recordCount: micro.recordCount, compactedMessageCount: micro.compactedMessageCount, tokensFreed: micro.tokensFreed }, reinject };
}

export function runGroupMemoryTimeBasedMicroCompactSelfTest() {
  const base = Date.parse("2026-07-07T00:00:00.000Z");
  const messages = Array.from({ length: 8 }, (_, index) => ({
    id: `tb-${index}`,
    role: "assistant",
    agent: "worker",
    timestamp: new Date(base + index * 60_000).toISOString(),
    task_id: `tb-task-${index}`,
    content: `time based micro compact output ${index} src/time-${index}.ts npm run check ${"结果".repeat(40)}`,
    receipt: {
      status: index % 3 === 0 ? "failed" : "done",
      taskId: `tb-task-${index}`,
      summary: `time based result ${index}`,
      verification: ["npm run check"],
      filesChanged: [`src/time-${index}.ts`],
    },
  }));
  const plan = buildGroupMicroCompactPlan(messages, {
    timeBased: {
      enabled: true,
      gapThresholdMinutes: 60,
      keepRecent: 3,
      now: "2026-07-07T02:30:00.000Z",
    },
    maxChars: 5000,
  });
  const notTriggered = buildGroupMicroCompactPlan(messages, {
    timeBased: {
      enabled: true,
      gapThresholdMinutes: 240,
      keepRecent: 3,
      now: "2026-07-07T02:30:00.000Z",
    },
    maxChars: 5000,
  });
  const cleared = (plan.records || []).filter((record: any) => record.timeBasedCleared);
  const keptIds = new Set(messages.slice(-3).map((message: any) => message.id));
  const checks = {
    timeBasedTriggered: plan.timeBased?.triggered === true && plan.timeBased.reason === "assistant_gap_exceeded_threshold",
    clearsOldButKeepsRecent: cleared.length === 5 && cleared.every((record: any) => !keptIds.has(record.messageId)),
    preservesArtifactHints: JSON.stringify(plan.records || []).includes("src/time-0.ts") && JSON.stringify(plan.records || []).includes("npm run check"),
    recordsClearedPlaceholder: cleared.every((record: any) => String(record.text || "").includes(GROUP_TIME_BASED_MC_CLEARED_MESSAGE)),
    freesTokens: Number(plan.tokensFreed || 0) > 0 && Number(plan.tokensAfter || 0) < Number(plan.tokensBefore || 0),
    notTriggeredWhenGapBelowThreshold: notTriggered.timeBased?.triggered === false && (notTriggered.records || []).every((record: any) => record.timeBasedCleared !== true),
    rawTranscriptUntouched: messages[0].content.includes("time based micro compact output 0") && messages.length === 8,
  };
  return { pass: Object.values(checks).every(Boolean), checks, timeBased: plan.timeBased, cleared: cleared.map((record: any) => record.messageId) };
}

export async function runGroupMemoryCompactionHookSelfTest() {
  const groupId = `hook-self-test-${process.pid}-${Date.now().toString(36)}`;
  const groupSessionId = "gcs_hook_selftest";
  const ledgerFile = getGroupMemoryCompactionHookLedgerFile(groupId, groupSessionId);
  const messages = Array.from({ length: 90 }, (_, index) => ({
    id: `hook-${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "hook-agent" : undefined,
    content: index === 1
      ? `Agent 输出 ${"x".repeat(6000)} src/hook-memory.ts`
      : `hook 测试消息 ${index} ${"内容".repeat(520)}`,
  }));
  const unregisterPre = registerGroupMemoryCompactionHook("pre", input => ({
    mustKeep: [{ id: "hook-must-keep", messageId: "hook-pre", text: `必须保留 HOOK_SENTINEL_${input.groupId}` }],
    factAnchors: [{ id: "hook-anchor", type: "dispatch_decision", messageId: "hook-pre", text: "hook 注入调度事实" }],
  }));
  const unregisterPost = registerGroupMemoryCompactionHook("post", input => ({
    checked: input.quality?.pass === true,
    microRecords: input.microCompact?.recordCount || 0,
  }));
  try {
    const result: any = await compactGroupConversationMemory({
      groupId,
      groupSessionId,
      messages,
      memory: { goal: "hook 自测" },
      config: { memoryCompactionUseModel: false },
      transcriptPath: "hook-raw.json",
      force: true,
    });
    const checks = {
      compacted: result.compacted === true,
      preHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.pre) && result.memory.compaction.hookResults.pre.length >= 1,
      postHookRecorded: Array.isArray(result.memory?.compaction?.hookResults?.post) && result.memory.compaction.hookResults.post.length >= 1,
      hookRequirementPersisted: (result.memory?.persistentRequirements || []).some((item: any) => String(item.text || "").includes(`HOOK_SENTINEL_${groupId}`)),
      hookFactAnchorPersisted: (result.memory?.factAnchors || []).some((item: any) => String(item.text || "").includes("hook 注入调度事实")),
      microCompactStored: Number(result.memory?.compaction?.microCompact?.recordCount || 0) > 0,
      reinjectionStored: result.memory?.compaction?.postCompactReinject?.hasCandidates === true,
      hookLedgerStored: result.memory?.compaction?.hookLedger?.schema === "ccm-group-memory-compaction-hook-ledger-summary-v1"
        && result.memory.compaction.hookLedger?.recentEntries?.some((entry: any) => entry.phase === "pre")
        && result.memory.compaction.hookLedger?.recentEntries?.some((entry: any) => entry.phase === "post"),
      hookLedgerReadable: readGroupMemoryCompactionHookLedger(groupId, groupSessionId).entries?.length >= 2
        && readGroupMemoryCompactionHookLedger(groupId, groupSessionId).stats?.pre?.ok >= 1
        && readGroupMemoryCompactionHookLedger(groupId, groupSessionId).stats?.post?.ok >= 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    unregisterPre();
    unregisterPost();
    try { if (fs.existsSync(ledgerFile)) fs.unlinkSync(ledgerFile); } catch {}
  }
}

export async function runGroupMemoryPartialCompactSelfTest() {
  const messages = Array.from({ length: 60 }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "partial-agent" : undefined,
    content: index === 0
      ? "必须保留 PARTIAL_COMPACT_SENTINEL_20260707，并只压缩到指定边界。"
      : `partial compact 阶段 ${index} src/partial-${index}.ts ${"上下文".repeat(220)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "partial-compact-self-test",
    groupSessionId: "gcs_partial_compact_selftest",
    messages,
    memory: { goal: "选择性压缩自测" },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "partial-raw.json",
    partialCompact: { direction: "up_to", messageId: "m30", reason: "selftest selected boundary" },
  });
  const checks = {
    compacted: result.compacted === true,
    boundaryIsPartial: result.boundary?.type === "partial-up-to",
    compactedThroughSelected: result.boundary?.summarizedThroughMessageId === "m30" && result.memory?.compaction?.lastCompactedMessageId === "m30",
    laterMessagesRemainRaw: result.keepIndex === 31 && messages[result.keepIndex]?.id === "m31" && result.boundary?.preservedMessageIds?.includes("m31"),
    partialMetadataRecorded: result.memory?.compaction?.partialCompact?.schema === "ccm-group-partial-compact-v1"
      && result.memory.compaction.partialCompact.enabled === true
      && result.memory.compaction.partialCompact.direction === "up_to",
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PARTIAL_COMPACT_SENTINEL_20260707"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    keepIndex: result.keepIndex,
    boundary: result.boundary,
  };
}

export async function runGroupMemoryPartialCompactSidecarSelfTest() {
  const messages = Array.from({ length: 48 }, (_, index) => ({
    id: `s${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "sidecar-agent" : undefined,
    content: index === 20
      ? "必须保留 PARTIAL_SIDECAR_SENTINEL_20260707，并只作为 sidecar 中段摘要，不推进主压缩边界。"
      : index === 24
        ? "执行失败：sidecar-task blocked，src/sidecar.ts 需要继续修复。"
        : `partial sidecar 阶段 ${index} src/sidecar-${index}.ts`,
    task_id: index >= 20 && index <= 30 ? "sidecar-task" : undefined,
    receipt: index === 24 ? { status: "failed", taskId: "sidecar-task", summary: "sidecar blocked" } : undefined,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "partial-sidecar-self-test",
    groupSessionId: "gcs_partial_sidecar_selftest",
    messages,
    memory: {
      goal: "选择性 sidecar 压缩自测",
      compaction: {
        version: GROUP_MEMORY_COMPACTION_VERSION,
        lastCompactedMessageId: "s5",
        compactedMessageCount: 6,
      },
    },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "partial-sidecar-raw.json",
    partialCompact: { direction: "range", fromMessageId: "s20", throughMessageId: "s30", reason: "selftest sidecar range" },
  });
  const segment = result.memory?.compaction?.partialSegments?.[0] || {};
  const cleanupAudit = result.postCompactCleanupAudit || result.memory?.compaction?.postCompactCleanupAudit || {};
  const cleanupVerification = verifyGroupPostCompactCleanupAudit(cleanupAudit, {
    groupId: "partial-sidecar-self-test",
    groupSessionId: "gcs_partial_sidecar_selftest",
    boundaryId: segment.id,
  });
  const checks = {
    sidecarCompacted: result.compacted === true && result.partialCompacted === true,
    primaryBoundaryUnchanged: !result.boundary && result.memory?.compaction?.lastCompactedMessageId === "s5"
      && Number(result.memory?.compaction?.compactedMessageCount || 0) === 6,
    sidecarMetadataRecorded: segment.schema === "ccm-group-partial-compact-segment-v1"
      && segment.direction === "range"
      && segment.range?.fromMessageId === "s20"
      && segment.range?.throughMessageId === "s30",
    sidecarSummaryPreservesSentinel: JSON.stringify(segment.summary || {}).includes("PARTIAL_SIDECAR_SENTINEL_20260707")
      && String(segment.messageDigest || "").includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
    sidecarQualityPasses: segment.quality?.pass === true && Number(segment.quality?.score || 0) >= 80,
    sidecarReinjectsFile: JSON.stringify(segment.reinjectionPlan || {}).includes("src/sidecar-"),
    sidecarFactMerged: JSON.stringify(result.memory?.persistentRequirements || []).includes("PARTIAL_SIDECAR_SENTINEL_20260707"),
    sidecarCleanupDoesNotResetPrimaryDerivedState: cleanupVerification.valid === true
      && cleanupAudit.partialSidecarOnly === true
      && cleanupAudit.resetDerivedCompactState === false
      && cleanupAudit.cleanupScope?.allowsExactGroupSessionReset === false
      && cleanupAudit.cleanupScope?.allowsDescendantProviderReset === false,
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    partialSegment: segment,
  };
}

export async function runGroupMemoryPtlEmergencySelfTest() {
  const messages = Array.from({ length: 70 }, (_, index) => ({
    id: `ptl-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "ptl-agent" : undefined,
    content: index === 0
      ? "必须保留 PTL_SENTINEL_20260707，PTL 紧急降级不得修改原始消息。"
      : `PTL 压力阶段 ${index} src/ptl-${index}.ts ${"高压上下文".repeat(280)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const result: any = await compactGroupConversationMemory({
    groupId: "ptl-emergency-self-test",
    groupSessionId: "gcs_ptl_emergency_selftest",
    messages,
    memory: { goal: "PTL 紧急降级自测" },
    config: { memoryCompactionUseModel: false, ptlEmergency: true },
    transcriptPath: "ptl-raw.json",
    force: true,
  });
  const maxDigest = Number(result.memory?.compaction?.ptlEmergency?.messageDigestMaxChars || 0);
  const checks = {
    compacted: result.compacted === true,
    ptlRecordedInCompaction: result.memory?.compaction?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
      && result.memory.compaction.ptlEmergency.engaged === true,
    ptlRecordedInBoundary: result.boundary?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1"
      && result.boundary.ptlEmergency.rawTranscriptUnmodified === true,
    ptlRecordedInMessageCompression: result.memory?.messageCompression?.ptlEmergency?.schema === "ccm-group-ptl-emergency-v1",
    healthDowngraded: result.memory?.compaction?.health === "ptl_emergency",
    digestIsBounded: maxDigest > 0 && String(result.memory?.messageDigest || "").length <= maxDigest + 200,
    qualityStillPasses: result.memory?.compaction?.quality?.pass === true,
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_SENTINEL_20260707"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    ptlEmergency: result.memory?.compaction?.ptlEmergency,
  };
}

export async function runGroupMemoryPtlRecoverySelfTest() {
  const messages = Array.from({ length: 52 }, (_, index) => ({
    id: `ptlr-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "coordinator" : undefined,
    agent: index % 2 === 1 ? "ptl-recovery-agent" : undefined,
    content: index === 0
      ? "必须保留 PTL_RECOVERY_SENTINEL_20260707，压力恢复后应退出紧急摘要。"
      : `PTL recovery 阶段 ${index} src/ptl-recovery-${index}.ts ${"恢复上下文".repeat(80)}`,
  }));
  const previousEmergency = {
    schema: "ccm-group-ptl-emergency-v1",
    version: GROUP_PTL_EMERGENCY_VERSION,
    engaged: true,
    emergencyLevel: "critical",
    reason: "previous_context_pressure_exhausted",
    triggerTokens: GROUP_COMPACT_TRIGGER_TOKENS,
    messageDigestMaxChars: 700,
    rawTranscriptPath: "ptl-recovery-raw.json",
  };
  const result: any = await compactGroupConversationMemory({
    groupId: "ptl-recovery-self-test",
    groupSessionId: "gcs_ptl_recovery_selftest",
    messages,
    memory: {
      goal: "PTL 自动恢复自测",
      compaction: {
        version: GROUP_MEMORY_COMPACTION_VERSION,
        ptlEmergency: previousEmergency,
        health: "ptl_emergency",
      },
    },
    config: { memoryCompactionUseModel: false },
    transcriptPath: "ptl-recovery-raw.json",
    force: true,
  });
  const recovery = result.memory?.compaction?.ptlRecovery || {};
  const checks = {
    compacted: result.compacted === true,
    recoveryRecorded: recovery.schema === "ccm-group-ptl-recovery-v1" && recovery.recovered === true,
    emergencyCleared: !result.memory?.compaction?.ptlEmergency && !result.memory?.messageCompression?.ptlEmergency,
    healthHealthy: result.memory?.compaction?.health === "healthy",
    digestRestoredAboveEmergencyBudget: String(result.memory?.messageDigest || "").length > previousEmergency.messageDigestMaxChars,
    recoveryStoredInBoundaryBudget: result.boundary?.context_budget?.ptl_recovery?.schema === "ccm-group-ptl-recovery-v1",
    summaryPreservesSentinel: JSON.stringify(result.memory?.conversationSummary || {}).includes("PTL_RECOVERY_SENTINEL_20260707"),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    recovery,
  };
}

export async function runGroupMemoryCompactionIntegrationSelfTest() {
  const messages = Array.from({ length: 70 }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: index === 0
      ? "实现支付回调，必须保留幂等校验"
      : index === 20
        ? "Error: signature mismatch in src/pay.ts"
        : `阶段 ${index} ${"内容".repeat(250)}`,
  }));
  const originalMessages = JSON.stringify(messages);
  const first: any = await compactGroupConversationMemory({
    groupId: "compaction-self-test",
    groupSessionId: "gcs_compaction_selftest",
    messages,
    memory: { goal: "支付回调", nextActions: [{ action: "继续验签测试" }] },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const appended = messages.concat(Array.from({ length: 30 }, (_, index) => ({
    id: `n${index}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "worker" : undefined,
    content: `新增阶段 ${index} ${"x".repeat(1000)}`,
  })));
  const second: any = first.compacted
    ? await compactGroupConversationMemory({
      groupId: "compaction-self-test",
      groupSessionId: "gcs_compaction_selftest",
      messages: appended,
      memory: first.memory,
      config: {},
      transcriptPath: "raw.json",
      force: true,
    })
    : { compacted: false };
  const migrated: any = await compactGroupConversationMemory({
    groupId: "compaction-migration-self-test",
    groupSessionId: "gcs_compaction_migration_selftest",
    messages,
    memory: { compaction: { version: 2, lastCompactedMessageId: "m60" } },
    config: {},
    transcriptPath: "raw.json",
    force: true,
  });
  const expectedSecondStart = first.compacted ? messages[first.keepIndex]?.id : "";
  const checks = {
    actualAsyncCompaction: !!first.compacted,
    structuredFallbackWithoutModel: first.memory?.compaction?.summarySource === "structured",
    qualityGatePassed: first.memory?.compaction?.quality?.pass === true,
    microCompactRecorded: first.memory?.compaction?.microCompact?.schema === "ccm-group-micro-compact-v1",
    postCompactReinjectRecorded: first.memory?.compaction?.postCompactReinject?.schema === "ccm-post-compact-reinjection-v1",
    fallbackPreservesUserIntent: !!first.memory?.conversationSummary?.userMessages?.length,
    rawMessagesRemainImmutable: JSON.stringify(messages) === originalMessages,
    incrementalSecondCompaction: !!second.compacted,
    nextBoundaryStartsAfterPrevious: second.boundary?.summarizedFromMessageId === expectedSecondStart,
    postCompactRestoreAnchorsRecorded: Array.isArray(first.boundary?.post_compact_restore?.preservedMessageIds) && first.boundary.post_compact_restore.preservedMessageIds.length > 0,
    legacyVersionRebuildsFromRawTranscript: migrated.memory?.compaction?.version === GROUP_MEMORY_COMPACTION_VERSION
      && migrated.memory?.compaction?.migratedFromVersion === 2
      && migrated.boundary?.summarizedFromMessageId === "m0",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

export async function runGroupMemoryCompactionStressSelfTest() {
  const messages: any[] = [];
  let memory: any = { goal: "长期维护支付审计链路", nextActions: [{ action: "继续完成当前任务" }] };
  let lastBoundaryIndex = -1;
  let boundariesAdvance = true;
  let validationsPass = true;
  let checksumsPresent = true;
  let reductionsHealthy = true;
  for (let round = 0; round < 12; round += 1) {
    for (let offset = 0; offset < 100; offset += 1) {
      const index = round * 100 + offset;
      const role = index % 2 === 0 ? "user" : "assistant";
      const taskId = `stress-task-${Math.floor(index / 40)}`;
      const content = index === 0
        ? "必须保留审计日志，任何压缩都不得删除 AUDIT_SENTINEL_73921"
        : index === 640
          ? "新的约束：支付回调必须使用幂等键 IDEMPOTENCY_V2"
          : `${role === "user" ? "用户要求" : "Agent进度"} ${index}，处理 src/payment/module-${index}.ts，${"上下文".repeat(180)}`;
      messages.push({
        id: `stress-${index}`,
        role,
        agent: role === "assistant" ? "payment-agent" : undefined,
        target: role === "user" ? "coordinator" : undefined,
        task_id: taskId,
        content,
        receipt: role === "assistant" ? { status: index % 40 === 39 ? "done" : "partial", summary: `任务阶段 ${index}` } : undefined,
      });
    }
    const result: any = await compactGroupConversationMemory({
      groupId: "compaction-stress-test",
      groupSessionId: "gcs_compaction_stress_selftest",
      messages,
      memory,
      config: {},
      transcriptPath: "stress-raw.json",
      force: true,
    });
    if (!result.compacted) {
      boundariesAdvance = false;
      break;
    }
    const boundaryIndex = messages.findIndex(item => item.id === result.boundary?.summarizedThroughMessageId);
    boundariesAdvance = boundariesAdvance && boundaryIndex > lastBoundaryIndex;
    lastBoundaryIndex = boundaryIndex;
    validationsPass = validationsPass && result.memory?.compaction?.validation?.pass === true;
    validationsPass = validationsPass && result.memory?.compaction?.quality?.pass === true;
    checksumsPresent = checksumsPresent && String(result.memory?.compaction?.summaryChecksum || "").length === 24;
    reductionsHealthy = reductionsHealthy && Number(result.memory?.compaction?.reductionRatio || 0) > 0.2;
    memory = result.memory;
  }
  const retrieval = buildRelevantHistoricalGroupContext(messages, lastBoundaryIndex, "审计日志 AUDIT_SENTINEL_73921");
  const persistent = Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [];
  const checks = {
    handlesTwelveIncrementalCompactions: boundariesAdvance && Number(memory?.compaction?.compactedMessageCount || 0) > 1000,
    summaryValidationNeverDrifts: validationsPass,
    everySummaryHasIntegrityChecksum: checksumsPresent,
    compactionActuallyReleasesContext: reductionsHealthy,
    persistentRequirementSurvives: persistent.some((item: any) => String(item.text || "").includes("AUDIT_SENTINEL_73921"))
      && persistent.some((item: any) => String(item.text || "").includes("IDEMPOTENCY_V2")),
    oldRawEvidenceIsAutomaticallyRetrievable: retrieval.includes("#stress-0") && retrieval.includes("AUDIT_SENTINEL_73921"),
    rawTranscriptRemainsUntouched: messages[0]?.content.includes("AUDIT_SENTINEL_73921") && messages.length === 1200,
    boundaryHistoryIsBounded: Array.isArray(memory?.compaction?.boundaries) && memory.compaction.boundaries.length <= 8,
  };
  return { pass: Object.values(checks).every(Boolean), checks, finalBoundaryIndex: lastBoundaryIndex };
}
