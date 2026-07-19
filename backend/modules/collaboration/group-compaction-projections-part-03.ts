// Behavior-freeze split from group-compaction-projections.ts (part 3/4).
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

import {
  ConversationSummary,
  FactAnchor,
  GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
  GROUP_API_MICROCOMPACT_CLEARABLE_USES,
  GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA,
  GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS,
  GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS,
  GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION,
  GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION,
  GROUP_COMPACTION_SUMMARY_BINARY_MARKER,
  GROUP_COMPACTION_SUMMARY_DOCUMENT_MARKER,
  GROUP_COMPACTION_SUMMARY_IMAGE_MARKER,
  GROUP_COMPACTION_SUMMARY_INPUT_PROJECTION_VERSION,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_COMPACT_TRIGGER_TOKENS,
  GROUP_FACT_ANCHOR_LIMIT,
  GROUP_FILE_UNCHANGED_STUB_PREFIX,
  GROUP_MEMORY_COMPACTION_VERSION,
  GROUP_MICRO_COMPACT_MAX_RECORDS,
  GROUP_MICRO_COMPACT_VERSION,
  GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT,
  GROUP_PARTIAL_COMPACT_VERSION,
  GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION,
  GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION,
  GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS,
  GROUP_POST_COMPACT_FILE_BUDGET,
  GROUP_POST_COMPACT_FILE_RESTORE_DEDUP_VERSION,
  GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS,
  GROUP_POST_COMPACT_INVOKED_SKILL_ATTACHMENT_VERSION,
  GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS,
  GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION,
  GROUP_POST_COMPACT_PLAN_ATTACHMENT_VERSION,
  GROUP_POST_COMPACT_PLAN_MAX_TOKENS,
  GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION,
  GROUP_POST_COMPACT_REINJECT_VERSION,
  GROUP_POST_COMPACT_SKILL_BUDGET,
  GROUP_POST_COMPACT_TASK_STATUS_BUDGET,
  GROUP_POST_COMPACT_TASK_STATUS_PROJECTION_VERSION,
  GROUP_POST_COMPACT_VERIFICATION_BUDGET,
  GROUP_PRESERVED_SEGMENT_VERSION,
  GROUP_SESSION_MEMORY_API_INVARIANT_CLOSURE_VERSION,
  GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_SECTION_TOKENS,
  GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_TOTAL_TOKENS,
  GROUP_SESSION_MEMORY_COMPACT_PROJECTION_VERSION,
  GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION,
  GROUP_TIME_BASED_MC_CLEARED_MESSAGE,
  GROUP_TIME_BASED_MICRO_COMPACT_VERSION,
  GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE,
  GROUP_TIME_BASED_THINKING_PROJECTION_VERSION,
  GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE,
  GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION,
  GROUP_TRUE_POST_COMPACT_PAYLOAD_VERSION,
  GroupMemoryQualityCheck,
  GroupMemoryQualityReport,
  GroupMemoryQualitySeverity,
  groupPostCompactCleanupAuditChecksum,
  verifyGroupPostCompactSessionStateResetReceipt,
} from "./group-compaction-receipts";

import {
  compactText,
  estimateGroupTextTokens,
  messageActor,
  messageContent,
  messageIdentity,
  renderMessageContentValue,
  stringArray,
  uniqueStrings,
} from "./group-compaction-projections-part-01";

import {
  extractFiles,
  extractRuntimeSkillFacts,
  extractVerificationFacts,
  messageContentBlocks,
} from "./group-compaction-projections-part-02";

export function messageTimestampMs(message: any) {
  const raw = message?.timestamp || message?.time || message?.created_at || message?.updated_at || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isGroupMicroCompactableMessage(message: any, includeUser = false) {
  if (!message) return false;
  if (!includeUser && message.role === "user") return false;
  if (messageContent(message)) return true;
  const artifacts = extractPostCompactArtifacts(message);
  return !!(artifacts.files.length || artifacts.skills.length || artifacts.verification.length || artifacts.blockers.length);
}

export function resolveGroupTimeBasedMicroCompact(messages: any[], options: any = {}, includeUser = false) {
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

export function extractPostCompactArtifacts(message: any) {
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

export function postCompactTaskStatusReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function normalizePostCompactTaskStatus(value: any) {
  const status = String(value || "").trim().toLowerCase();
  if (["in_progress", "executing", "spawning", "ready", "prompt_accepted", "open", "active"].includes(status)) return "running";
  if (["done", "success", "succeeded"].includes(status)) return "completed";
  if (["error"].includes(status)) return "failed";
  return status;
}

export function postCompactTaskUpdatedAtMs(task: any) {
  const raw = task?.updated_at || task?.updatedAt || task?.completed_at || task?.completedAt || task?.created_at || task?.createdAt || "";
  const parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function postCompactTaskWasRetrieved(task: any) {
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

export function normalizePostCompactReadPath(value: any) {
  const clean = String(value || "").trim().replace(/^["']|["']$/g, "");
  if (!clean) return "";
  const normalized = path.posix.normalize(clean.replace(/\\/g, "/"));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function postCompactMessageBlocks(message: any) {
  const content = message?.content ?? message?.message?.content;
  return Array.isArray(content) ? content : [];
}

export function collectPreservedReadPaths(messages: any[] = []) {
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

export function postCompactFileRestoreDedupReceiptChecksum(receipt: any) {
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

export function invokedSkillAttachmentReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function invokedSkillNameAndHash(value: any) {
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

export function collectExactSessionInvokedSkills(messages: any[] = []) {
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

export function isPathWithin(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function currentControlledSkillBody(skillName: string, catalog: any[]) {
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

export function truncateSkillBodyToTokens(body: string, maxTokens: number) {
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

export function truncatePostCompactBodyPreservingEdges(body: string, maxTokens: number) {
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

export function postCompactPlanAttachmentReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function postCompactPlanObject(task: any) {
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

export function postCompactPlanTaskId(task: any) {
  return String(task?.id || task?.task_id || task?.taskId || "").trim();
}

export function postCompactPlanTaskStatus(task: any) {
  return normalizePostCompactTaskStatus(task?.status || task?.execution_state || task?.executionState || "pending") || "pending";
}

export function postCompactPlanTaskIsTerminal(task: any) {
  return task?.archived === true || ["completed", "failed", "cancelled", "archived"].includes(postCompactPlanTaskStatus(task));
}

export function postCompactPlanConfirmationState(task: any, plan: any) {
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

export function compactPostCompactPlanBody(body: string) {
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

export function postCompactDynamicContextDeltaReceiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function dynamicContextTextHash(value: any) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

export function normalizeDynamicContextRows(values: any, kind: "line" | "block") {
  const rows = new Map<string, any>();
  for (const raw of Array.isArray(values) ? values : []) {
    const name = String(raw?.name || raw?.targetId || raw?.target_id || raw?.agentType || raw?.agent_type || "").trim();
    const text = String(raw?.[kind] || raw?.text || raw?.description || raw?.instructions || "").trim();
    if (!name || !text) continue;
    rows.set(name, { name, text, hash: dynamicContextTextHash(text) });
  }
  return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function collectToolReferenceNames(value: any, names: Set<string>, depth = 0) {
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

export function buildPreCompactLoadedToolState(catalogTools: any[], messages: any[], carriedValues: any[] = []) {
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

export function collectDynamicContextDeltaAttachments(values: any[]) {
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

export function reconstructDynamicContextAnnouncements(attachments: any[]) {
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
