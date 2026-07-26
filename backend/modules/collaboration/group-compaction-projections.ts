// group-compaction-projections.ts — merged from 4 part files (behavior-freeze merge).

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  CCM_DIR,
} from "../../core/utils";
import {
  loadSkills,
  SKILL_PACKAGES_DIR,
} from "../../core/db";
import {
  isCcmInternalSkillName,
} from "../../skills/internal-skill-catalog";
import {
  buildContextBudget,
  compactPreserveEdges,
  estimateTextTokens,
  getAutoCompactThreshold,
  microCompactText,
} from "../../system/context-budget";
import {
  resolveTrustedModelContextCapacity,
} from "./model-capability-cache";
import {
  readGroupSessionMemoryExtractionState,
  waitForGroupSessionMemoryExtraction,
} from "./group-session-memory-extraction";
import {
  inspectGroupSessionMemoryTemplateState,
} from "./group-session-memory-customization";
import {
  recordGroupPromptCacheState,
  recordGroupPromptCacheUsage,
} from "./group-prompt-cache-break-detection";
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

// ===== merged from group-compaction-projections-part-01.ts =====

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

// ===== merged from group-compaction-projections-part-02.ts =====

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
    template_empty_checked: input.templateEmptyChecked === true || input.template_empty_checked === true,
    template_only: input.templateOnly === true || input.template_only === true,
    template_scope_id: String(input.templateScopeId || input.template_scope_id || ""),
    template_source: String(input.templateSource || input.template_source || ""),
    template_checksum: String(input.templateChecksum || input.template_checksum || ""),
    template_section_count: Math.max(0, Number(input.templateSectionCount || input.template_section_count || 0)),
    last_summarized_message_id: String(input.lastSummarizedMessageId || input.last_summarized_message_id || ""),
    cursor_status: String(input.cursorStatus || input.cursor_status || "unknown"),
    cursor_mode: String(input.cursorMode || input.cursor_mode
      || (String(input.cursorStatus || input.cursor_status || "") === "resolved" ? "snapshot_cursor" : "unknown")),
    resumed_without_cursor: input.resumedWithoutCursor === true || input.resumed_without_cursor === true,
    resume_seed_message_id: String(input.resumeSeedMessageId || input.resume_seed_message_id || ""),
    keep_index: Math.max(0, Number(input.keepIndex || input.keep_index || 0)),
    preserved_message_count: Math.max(0, Number(input.preservedMessageCount || input.preserved_message_count || 0)),
    preserved_token_estimate: Math.max(0, Number(input.preservedTokenEstimate || input.preserved_token_estimate || 0)),
    api_invariant_closure: input.apiInvariantClosure || input.api_invariant_closure || null,
    compact_projection: input.compactProjection || input.compact_projection || null,
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
  const version = Number(receipt?.version || 0);
  if (receipt?.schema !== "ccm-group-session-memory-compact-selection-v1"
    || ![1, GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION].includes(version)) issues.push("session_memory_selection_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("session_memory_selection_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("session_memory_selection_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("session_memory_selection_scope_invalid");
  if (!['selected', 'fallback'].includes(String(receipt?.status || ""))) issues.push("session_memory_selection_status_invalid");
  if (receipt?.selected === true && String(receipt?.status || "") !== "selected") issues.push("session_memory_selection_selected_status_invalid");
  if (receipt?.selected === true && (!receipt?.markdown_checksum_matches
    || !["resolved", "resumed_without_cursor"].includes(String(receipt?.cursor_status || "")))) issues.push("session_memory_selection_unverified_source");
  if (receipt?.selected === true && version >= 2) {
    if (receipt?.template_empty_checked !== true || receipt?.template_only === true) issues.push("session_memory_selection_template_empty_state_invalid");
    if (String(receipt?.template_scope_id || "") !== String(receipt?.scope_id || "")) issues.push("session_memory_selection_template_scope_invalid");
    if (!["default", "global", "exact_session"].includes(String(receipt?.template_source || ""))) issues.push("session_memory_selection_template_source_invalid");
    if (!String(receipt?.template_checksum || "") || Number(receipt?.template_section_count || 0) < 1) issues.push("session_memory_selection_template_contract_missing");
  }
  if (version >= 2 && String(receipt?.fallback_reason || "") === "session_memory_empty_template"
    && (receipt?.template_empty_checked !== true || receipt?.template_only !== true)) issues.push("session_memory_selection_empty_template_evidence_invalid");
  if (receipt?.selected === true && receipt?.cursor_status === "resumed_without_cursor") {
    if (receipt?.resumed_without_cursor !== true
      || String(receipt?.cursor_mode || "") !== "resumed_session_tail"
      || String(receipt?.last_summarized_message_id || "")
      || !String(receipt?.resume_seed_message_id || "")) issues.push("session_memory_selection_resumed_cursor_contract_invalid");
  }
  if (receipt?.selected === true && receipt?.cursor_status === "resolved"
    && receipt?.cursor_mode && receipt?.cursor_mode !== "snapshot_cursor") issues.push("session_memory_selection_cursor_mode_invalid");
  if (receipt?.selected === true && !verifyGroupSessionMemoryApiInvariantClosure(receipt?.api_invariant_closure).valid) issues.push("session_memory_selection_api_invariant_closure_invalid");
  if (receipt?.selected === true && receipt?.compact_projection?.schema
    && !verifyGroupSessionMemoryCompactProjection(receipt?.compact_projection, {
      groupId: receipt?.group_id,
      groupSessionId: receipt?.group_session_id,
      summaryFile: receipt?.summary_file,
      originalMarkdownChecksum: receipt?.actual_markdown_checksum,
    }).valid) issues.push("session_memory_selection_compact_projection_invalid");
  if (receipt?.selected === true && receipt?.compaction_api_called !== false) issues.push("session_memory_selection_api_call_invalid");
  if (receipt?.body_free !== true) issues.push("session_memory_selection_body_free_missing");
  if (String(receipt?.selection_checksum || "") !== groupSessionMemoryCompactSelectionChecksum(receipt)) issues.push("session_memory_selection_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("session_memory_selection_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("session_memory_selection_session_mismatch");
  return { valid: issues.length === 0, issues };
}

export async function selectGroupSessionMemoryForCompact(input: any = {}) {
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
  const templateState = inspectGroupSessionMemoryTemplateState(scopeId, markdown);
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
    templateEmptyChecked: templateState.checked,
    templateOnly: templateState.templateOnly,
    templateScopeId: templateState.scopeId,
    templateSource: templateState.source,
    templateChecksum: templateState.checksum,
    templateSectionCount: templateState.sectionCount,
    lastSummarizedMessageId: snapshot?.lastSummarizedMessageId || "",
  };
  if (!snapshot) return fallback("snapshot_missing_or_invalid", sourceFields);
  if (!snapshotScopeMatches) return fallback("snapshot_scope_mismatch", sourceFields);
  if (!markdown) return fallback("summary_markdown_missing_or_empty", sourceFields);
  if (!sourceFields.markdownChecksumMatches) return fallback("summary_markdown_checksum_mismatch", sourceFields);
  if (templateState.templateOnly) return fallback("session_memory_empty_template", sourceFields);
  if (snapshot.hasSummary !== true) return fallback("session_memory_snapshot_has_no_summary", sourceFields);
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
  const resumedWithoutCursor = !cursor;
  const resumeSeedMessageId = resumedWithoutCursor && (input.messages || []).length
    ? messageIdentity((input.messages || [])[(input.messages || []).length - 1], (input.messages || []).length - 1)
    : "";
  if (resumedWithoutCursor && !resumeSeedMessageId) {
    return fallback("last_summarized_cursor_missing_and_no_resume_tail", {
      ...sourceFields,
      cursorStatus: "missing",
      cursorMode: "unavailable",
    });
  }
  const candidateKeepIndex = calculateGroupSessionMemoryMessagesToKeepIndex(input.messages || [], cursor || resumeSeedMessageId, {
    ...(input.keepWindowOptions || {}),
    skipInvariantClosure: true,
  });
  if (candidateKeepIndex < 0) return fallback("last_summarized_cursor_not_found", {
    ...sourceFields,
    cursorStatus: "not_found",
    cursorMode: cursor ? "snapshot_cursor" : "resumed_session_tail",
    resumedWithoutCursor,
    resumeSeedMessageId,
  });
  const cursorFields = {
    cursorStatus: resumedWithoutCursor ? "resumed_without_cursor" : "resolved",
    cursorMode: resumedWithoutCursor ? "resumed_session_tail" : "snapshot_cursor",
    resumedWithoutCursor,
    resumeSeedMessageId,
  };
  const invariantClosure = adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants(
    input.messages || [],
    candidateKeepIndex,
    { floorIndex: input.keepWindowOptions?.floorIndex ?? 0 },
  );
  const keepIndex = invariantClosure.keepIndex;
  if (!verifyGroupSessionMemoryApiInvariantClosure(invariantClosure.receipt).valid) {
    return fallback("api_invariant_closure_unresolved", {
      ...sourceFields,
      ...cursorFields,
      keepIndex,
      apiInvariantClosure: invariantClosure.receipt,
    });
  }
  const keptMessages = (input.messages || []).slice(keepIndex);
  const compactProjection = buildGroupSessionMemoryCompactProjection({
    groupId,
    groupSessionId,
    scopeId,
    summaryFile,
    markdown,
    originalMarkdownChecksum: actualChecksum,
    maxSectionTokens: config.sessionMemoryCompactMaxSectionTokens
      || config.session_memory_compact_max_section_tokens
      || GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_SECTION_TOKENS,
    maxTotalTokens: config.sessionMemoryCompactMaxTotalTokens
      || config.session_memory_compact_max_total_tokens
      || GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_TOTAL_TOKENS,
    createdAt: input.now,
  });
  const compactProjectionVerification = verifyGroupSessionMemoryCompactProjection(compactProjection.receipt, {
    groupId,
    groupSessionId,
    summaryFile,
    originalMarkdownChecksum: actualChecksum,
    projectedMarkdown: compactProjection.markdown,
  });
  if (!compactProjectionVerification.valid) {
    return fallback("compact_projection_invalid", {
      ...sourceFields,
      ...cursorFields,
      keepIndex,
      apiInvariantClosure: invariantClosure.receipt,
      compactProjection: compactProjection.receipt,
    });
  }
  const projected = buildGroupTruePostCompactPayloadBudget({
    groupId,
    groupSessionId,
    triggerTokens: input.triggerTokens,
    summaryText: compactProjection.markdown,
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
    ...cursorFields,
    keepIndex,
    preservedMessageCount: keptMessages.length,
    preservedTokenEstimate: keptMessages.reduce((sum: number, message: any) => sum + estimateGroupMessageTokens(message), 0),
    apiInvariantClosure: invariantClosure.receipt,
    compactProjection: compactProjection.receipt,
    projectedPostCompactTokens: projectedTokens,
  };
  if (projected.will_retrigger_next_turn === true) return fallback("projected_payload_reaches_auto_compact_threshold", selectedFields);
  return {
    selected: true,
    markdown: compactProjection.markdown,
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

export function messageContentBlocks(message: any) {
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

export function collectWindowBlockRefs(messages: any[], offset = 0) {
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

export function collectApiMicroCompactSignals(messages: any[] = []) {
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

export const GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES = new Set([
  "read", "fileread", "bash", "shell", "powershell", "grep", "glob",
  "websearch", "webfetch", "edit", "fileedit", "write", "filewrite", "notebookedit",
]);

export function normalizedToolName(value: any) {
  return String(value || "").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

export function timeBasedToolResultReceiptChecksum(receipt: any) {
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

export function clearProjectedToolResultValue(value: any, clearIds: Set<string>, state: { tokensSaved: number; cleared: number }): any {
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

export function timeBasedThinkingReceiptChecksum(receipt: any) {
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

export function hasModelVisibleThinking(message: any) {
  if (String(message?.role || "").toLowerCase() === "thinking") return true;
  return messageContentBlocks(message).some(block => String(block?.type || "") === "thinking");
}

export function clearProjectedThinkingValue(value: any, state: { tokensSaved: number; clearedBlocks: number }): any {
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
  const cliRuntimes = new Set(["claudecode", "cursor", "codex", "gemini", "opencode", "qoder", "test-agent-native"]);
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

export function createEmptyConversationSummary(): ConversationSummary {
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

export function extractFiles(message: any) {
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

export function extractRuntimeSkillFacts(message: any) {
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

export function extractVerificationFacts(message: any) {
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

export function extractMessageStatus(message: any) {
  return String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").trim();
}

// ===== merged from group-compaction-projections-part-03.ts =====

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

// ===== merged from group-compaction-projections-part-04.ts =====

export function buildDynamicContextCategory(rows: any[], announced: Map<string, string>) {
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

export function dynamicContextAttachmentManifest(attachment: any) {
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

export function buildGroupPartialCompactSidecarSegment(input: any) {
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

export function mergeGroupPartialCompactSegments(existing: any[] = [], incoming: any = null, limit = GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT) {
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

export function buildPartialSidecarOnlyMemory(input: any) {
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

export function memorySeed(memory: any) {
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

export function normalizeSummary(value: any, fallback: ConversationSummary): ConversationSummary {
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
