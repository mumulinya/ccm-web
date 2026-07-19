// Behavior-freeze split from group-compaction-projections.ts (part 1/4).
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
  createEmptyConversationSummary,
  messageContentBlocks,
} from "./group-compaction-projections-part-02";

import {
  buildDeterministicConversationSummary,
  normalizeSummary,
  renderConversationSummary,
} from "./group-compaction-projections-part-04";

export function compactText(value: any, max = 800) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const head = Math.max(1, Math.floor(max * 0.68));
  const tail = Math.max(1, max - head - 20);
  return `${text.slice(0, head)} …[已压缩]… ${text.slice(-tail)}`;
}

export function renderMessageContentValue(value: any): string {
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

export function messageContent(message: any) {
  return renderMessageContentValue(message?.content ?? message?.message?.content ?? message?.delivery_summary?.headline ?? message?.result ?? "").trim();
}

export function compactionSummaryInputProjectionChecksum(receipt: any) {
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

export type CompactionSummaryInputProjectionState = {
  imageBlocksStripped: number;
  documentBlocksStripped: number;
  binarySegmentsStripped: number;
};

export const GROUP_COMPACTION_IMAGE_BLOCK_TYPES = new Set(["image", "image_url", "input_image"]);

export const GROUP_COMPACTION_DOCUMENT_BLOCK_TYPES = new Set(["document", "input_file"]);

export const GROUP_COMPACTION_REINJECTED_ATTACHMENT_TYPES = new Set(["skill_discovery", "skill_listing"]);

export const GROUP_COMPACTION_BINARY_VALUE_KEYS = new Set(["data", "base64", "image_data", "file_data", "bytes"]);

export function sanitizeCompactionSummaryString(value: string, state: CompactionSummaryInputProjectionState, key = "") {
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

export function sanitizeCompactionSummaryValue(value: any, state: CompactionSummaryInputProjectionState, key = ""): any {
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

export function isReinjectedCompactionAttachment(message: any) {
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

export function messageIdentity(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

export function messageActor(message: any) {
  return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}

export function mergeUnique(existing: any[] = [], incoming: any[] = [], limit = 24, max = 700) {
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

export function mergeTaskStates(existing: any[] = [], incoming: any[] = [], limit = 30) {
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

export function stringArray(value: any, limit = 30) {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw.map((item: any) => typeof item === "string" ? item : item?.path || item?.file || item?.name || JSON.stringify(item))
    .map((item: any) => compactText(item, 300))
    .filter(Boolean)
    .slice(0, limit);
}

export function uniqueStrings(values: any[] = [], limit = 20) {
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

export function normalizedSearchTokens(value: any) {
  const text = String(value || "").toLowerCase();
  const tokens = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g)) tokens.add(match[0]);
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) tokens.add(chinese.slice(index, index + 2));
  return tokens;
}

export function isGroundedInSource(value: any, source: string) {
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

export function mergeSafeConversationSummary(previous: ConversationSummary, fallback: ConversationSummary, model: ConversationSummary | null, messages: any[]) {
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

export function validateSummaryPreservesFallback(summary: ConversationSummary, fallback: ConversationSummary) {
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

export function buildGroupMemoryQualitySource(messages: any[], memory: any = {}) {
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

export function extractRequirementNeedles(text: any) {
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

export function isRequirementRepresented(requirement: any, artifactText: string) {
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

export function extractBlockedTaskSignals(messages: any[]) {
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

export function addQualityCheck(checks: GroupMemoryQualityCheck[], check: Omit<GroupMemoryQualityCheck, "score">) {
  checks.push({ ...check, score: check.pass ? 100 : 0 });
}

export function qualityPenalty(severity: GroupMemoryQualitySeverity) {
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

export function extractFactAnchors(messages: any[]) {
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

export function mergeFactAnchors(existing: any[] = [], incoming: FactAnchor[] = []) {
  const result = new Map<string, FactAnchor>();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    if (!item?.id || !item?.text) continue;
    result.set(String(item.id), item as FactAnchor);
  }
  return [...result.values()].slice(-GROUP_FACT_ANCHOR_LIMIT);
}

export function extractPersistentRequirements(messages: any[]) {
  return extractFactAnchors(messages).filter(item =>
    item.type === "user_requirement"
    && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|must\b|never\b|always\b|do not\b|required?\b)/i.test(item.text)
  );
}

export function mergePersistentRequirements(existing: any[] = [], incoming: FactAnchor[] = []) {
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

export function messageHasText(message: any) {
  return !!messageContent(message);
}

export function groupMessageTaskId(message: any) {
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

export function groupProviderMessageId(message: any) {
  return String(
    message?.message?.id
      || message?.provider_message_id
      || message?.providerMessageId
      || message?.response_message_id
      || message?.responseMessageId
      || ""
  ).trim();
}

export function groupMessageToolUseIds(message: any) {
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

export function groupMessageToolResultIds(message: any) {
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

export function groupSessionMemoryApiInvariantClosureChecksum(receipt: any) {
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

export function groupSessionMemoryCompactSelectionChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.selection_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function groupSessionMemoryCompactProjectionChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.projection_checksum;
  delete payload.checksum_valid;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function splitGroupSessionMemoryMarkdownSections(markdown: string) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").trim().split("\n");
  if (!lines.length || (lines.length === 1 && !lines[0])) return [];
  const sections: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^#\s+/.test(line) && current.length) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) sections.push(current);
  return sections.map(section => section.join("\n").trim()).filter(Boolean);
}

export function truncateGroupSessionMemorySectionAtLineBoundary(section: string, maxTokens: number) {
  const text = String(section || "").trim();
  const originalTokens = estimateGroupTextTokens(text);
  if (originalTokens <= maxTokens) return { text, originalTokens, projectedTokens: originalTokens, truncated: false };
  const marker = "[... section truncated for length ...]";
  const lines = text.split("\n");
  const selected: string[] = [];
  if (/^#\s+/.test(lines[0] || "")) selected.push(lines.shift()!);
  for (const line of lines) {
    const candidate = [...selected, line, marker].join("\n").trim();
    if (estimateGroupTextTokens(candidate) > maxTokens) break;
    selected.push(line);
  }
  let projected = [...selected, marker].join("\n").trim();
  if (estimateGroupTextTokens(projected) > maxTokens) projected = marker;
  return {
    text: projected,
    originalTokens,
    projectedTokens: estimateGroupTextTokens(projected),
    truncated: true,
  };
}

export function buildGroupSessionMemoryCompactProjection(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const scopeId = String(input.scopeId || input.scope_id || `${groupId}--${groupSessionId}`);
  const summaryFile = String(input.summaryFile || input.summary_file || "");
  const markdown = String(input.markdown || "").replace(/\r\n?/g, "\n").trim();
  const maxSectionTokens = Math.max(250, Math.floor(Number(
    input.maxSectionTokens || input.max_section_tokens || GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_SECTION_TOKENS
  )));
  const maxTotalTokens = Math.max(maxSectionTokens, Math.floor(Number(
    input.maxTotalTokens || input.max_total_tokens || GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_TOTAL_TOKENS
  )));
  const sections = splitGroupSessionMemoryMarkdownSections(markdown);
  const projectedSections = sections.map(section => truncateGroupSessionMemorySectionAtLineBoundary(section, maxSectionTokens));
  const truncatedIndexes = new Set<number>();
  projectedSections.forEach((section, index) => { if (section.truncated) truncatedIndexes.add(index); });
  const initiallyProjected = projectedSections.map(section => section.text).join("\n\n").trim();
  const needsTotalTruncation = estimateGroupTextTokens(initiallyProjected) > maxTotalTokens;
  const needsSourceReference = truncatedIndexes.size > 0 || needsTotalTruncation;
  const sourceReference = needsSourceReference ? `> Full Session Memory: ${summaryFile}` : "";
  const sourceReferenceTokens = estimateGroupTextTokens(sourceReference);
  const contentBudget = Math.max(250, maxTotalTokens - sourceReferenceTokens);
  const selectedSections: string[] = [];
  let usedTokens = 0;
  let omittedSectionCount = 0;
  for (let index = 0; index < projectedSections.length; index += 1) {
    const section = projectedSections[index];
    const separatorTokens = selectedSections.length ? estimateGroupTextTokens("\n\n") : 0;
    if (usedTokens + separatorTokens + section.projectedTokens <= contentBudget) {
      selectedSections.push(section.text);
      usedTokens += separatorTokens + section.projectedTokens;
      continue;
    }
    const remainingTokens = Math.max(0, contentBudget - usedTokens - separatorTokens);
    if (remainingTokens >= 250) {
      const totalProjection = truncateGroupSessionMemorySectionAtLineBoundary(section.text, remainingTokens);
      selectedSections.push(totalProjection.text);
      truncatedIndexes.add(index);
    } else {
      omittedSectionCount += 1;
      truncatedIndexes.add(index);
    }
    for (let rest = index + 1; rest < projectedSections.length; rest += 1) {
      omittedSectionCount += 1;
      truncatedIndexes.add(rest);
    }
    break;
  }
  let projectedMarkdown = [sourceReference, selectedSections.join("\n\n")].filter(Boolean).join("\n\n").trim();
  if (estimateGroupTextTokens(projectedMarkdown) > maxTotalTokens) {
    const finalProjection = truncateGroupSessionMemorySectionAtLineBoundary(projectedMarkdown, maxTotalTokens);
    projectedMarkdown = finalProjection.text;
  }
  const originalChecksum = String(input.originalMarkdownChecksum || input.original_markdown_checksum
    || crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24));
  const projectedChecksum = crypto.createHash("sha256").update(projectedMarkdown).digest("hex").slice(0, 24);
  const payload: any = {
    schema: "ccm-group-session-memory-compact-projection-v1",
    version: GROUP_SESSION_MEMORY_COMPACT_PROJECTION_VERSION,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: scopeId,
    summary_file: summaryFile,
    original_markdown_checksum: originalChecksum,
    projected_markdown_checksum: projectedChecksum,
    section_count: sections.length,
    truncated_section_count: truncatedIndexes.size,
    omitted_section_count: omittedSectionCount,
    original_token_estimate: estimateGroupTextTokens(markdown),
    projected_token_estimate: estimateGroupTextTokens(projectedMarkdown),
    max_section_tokens: maxSectionTokens,
    max_total_tokens: maxTotalTokens,
    source_reference_included: needsSourceReference,
    original_source_unchanged: true,
    body_free: true,
    created_at: String(input.createdAt || input.created_at || new Date().toISOString()),
  };
  return {
    markdown: projectedMarkdown,
    receipt: { ...payload, projection_checksum: groupSessionMemoryCompactProjectionChecksum(payload) },
  };
}

export function verifyGroupSessionMemoryCompactProjection(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== "ccm-group-session-memory-compact-projection-v1"
    || Number(receipt?.version || 0) !== GROUP_SESSION_MEMORY_COMPACT_PROJECTION_VERSION) issues.push("session_memory_projection_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("session_memory_projection_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("session_memory_projection_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("session_memory_projection_scope_invalid");
  if (!String(receipt?.summary_file || "")) issues.push("session_memory_projection_summary_file_missing");
  if (!String(receipt?.original_markdown_checksum || "")) issues.push("session_memory_projection_original_checksum_missing");
  if (!String(receipt?.projected_markdown_checksum || "")) issues.push("session_memory_projection_projected_checksum_missing");
  if (Number(receipt?.max_section_tokens || 0) < 250) issues.push("session_memory_projection_section_budget_invalid");
  if (Number(receipt?.max_total_tokens || 0) < Number(receipt?.max_section_tokens || 0)) issues.push("session_memory_projection_total_budget_invalid");
  if (Number(receipt?.projected_token_estimate || 0) > Number(receipt?.max_total_tokens || 0)) issues.push("session_memory_projection_budget_exceeded");
  if (Number(receipt?.truncated_section_count || 0) > Number(receipt?.section_count || 0)) issues.push("session_memory_projection_section_count_invalid");
  if (Number(receipt?.truncated_section_count || 0) > 0 && receipt?.source_reference_included !== true) issues.push("session_memory_projection_source_reference_missing");
  if (receipt?.original_source_unchanged !== true || receipt?.body_free !== true) issues.push("session_memory_projection_body_free_boundary_invalid");
  if (String(receipt?.projection_checksum || "") !== groupSessionMemoryCompactProjectionChecksum(receipt)) issues.push("session_memory_projection_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("session_memory_projection_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("session_memory_projection_session_mismatch");
  if (expected.summaryFile && path.resolve(String(receipt?.summary_file || "")) !== path.resolve(String(expected.summaryFile))) issues.push("session_memory_projection_summary_file_mismatch");
  if (expected.originalMarkdownChecksum && String(receipt?.original_markdown_checksum || "") !== String(expected.originalMarkdownChecksum)) issues.push("session_memory_projection_original_checksum_mismatch");
  if (expected.projectedMarkdown) {
    const checksum = crypto.createHash("sha256").update(String(expected.projectedMarkdown)).digest("hex").slice(0, 24);
    if (checksum !== String(receipt?.projected_markdown_checksum || "")) issues.push("session_memory_projection_projected_checksum_mismatch");
  }
  return { valid: issues.length === 0, issues };
}
