import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { estimateTextTokens } from "../../system/context-budget";

export const GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION = 1;
export const GROUP_MEMORY_RESUME_PROJECTION_VERSION = 2;

const DEFAULT_ROOT = path.join(CCM_DIR, "group-memory-compact-boundaries");
const DEFAULT_LOCK_STALE_MS = 30_000;
const DEFAULT_LOCK_WAIT_MS = 2_000;

function cleanPart(value: any) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}

function sha256(value: any, length = 48) {
  const source = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf-8");
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, length);
}

function checksumObject(value: any, field = "rowChecksum", length = 48) {
  const source = { ...(value || {}) };
  delete source[field];
  return sha256(JSON.stringify(source), length);
}

function messageId(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

const STALE_PROVIDER_USAGE_FIELDS = [
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
];

function providerUsageTokens(usage: any) {
  if (!usage || typeof usage !== "object") return 0;
  return STALE_PROVIDER_USAGE_FIELDS.reduce((sum, field) => sum + Math.max(0, Number(usage[field] || 0)), 0);
}

function sanitizePreservedMessageUsage(message: any) {
  const topLevelTokens = providerUsageTokens(message?.usage);
  const nestedTokens = providerUsageTokens(message?.message?.usage);
  const tokens = topLevelTokens + nestedTokens;
  if (!tokens) return { message, sanitized: false, tokens: 0 };
  const zeroUsage = (usage: any) => STALE_PROVIDER_USAGE_FIELDS.reduce((next: any, field) => {
    next[field] = 0;
    return next;
  }, { ...(usage || {}) });
  return {
    message: {
      ...message,
      ...(message?.usage ? { usage: zeroUsage(message.usage) } : {}),
      ...(message?.message?.usage ? { message: { ...message.message, usage: zeroUsage(message.message.usage) } } : {}),
    },
    sanitized: true,
    tokens,
  };
}

function resumeMessageContent(message: any) {
  const content = message?.content ?? message?.message?.content ?? "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content || "");
  return content.map((block: any) => {
    if (typeof block === "string") return block;
    if (typeof block?.text === "string") return block.text;
    if (typeof block?.content === "string") return block.content;
    return JSON.stringify(block || {});
  }).join("\n");
}

function resumeMessageTokenEstimate(message: any) {
  return estimateTextTokens([
    message?.role || "",
    message?.agent || message?.target || "",
    resumeMessageContent(message),
    message?.assignments ? JSON.stringify(message.assignments) : "",
    message?.delivery_summary ? JSON.stringify(message.delivery_summary) : "",
  ].filter(Boolean).join("\n"));
}

function messageParentId(message: any) {
  return String(message?.parentUuid || message?.parent_uuid || message?.parentMessageId || message?.parent_message_id || "");
}

function withMessageParent(message: any, parentId: string | null) {
  if (Object.prototype.hasOwnProperty.call(message || {}, "parent_uuid")) return { ...message, parent_uuid: parentId };
  if (Object.prototype.hasOwnProperty.call(message || {}, "parentMessageId")) return { ...message, parentMessageId: parentId };
  if (Object.prototype.hasOwnProperty.call(message || {}, "parent_message_id")) return { ...message, parent_message_id: parentId };
  return { ...message, parentUuid: parentId };
}

function messageSnipMetadata(message: any) {
  return message?.snipMetadata
    || message?.snip_metadata
    || message?.compactMetadata?.snipMetadata
    || message?.compact_metadata?.snip_metadata
    || null;
}

export function buildGroupMemorySnipBoundaryMarker(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_snip_boundary_marker");
  const removedUuids = [...new Set([
    ...(Array.isArray(input.removedUuids) ? input.removedUuids : []),
    ...(Array.isArray(input.removed_uuids) ? input.removed_uuids : []),
    ...(Array.isArray(input.removedMessageIds) ? input.removedMessageIds : []),
    ...(Array.isArray(input.removed_message_ids) ? input.removed_message_ids : []),
  ].map((item: any) => String(item || "").trim()).filter(Boolean))].sort();
  if (!removedUuids.length) throw new Error("snip_boundary_removed_message_ids_required");
  const timestamp = String(input.timestamp || input.now || new Date().toISOString());
  const removedUuidsChecksum = sha256(JSON.stringify(removedUuids), 32);
  const markerIdentity = sha256(JSON.stringify([groupId, groupSessionId, removedUuidsChecksum, timestamp]), 20);
  return {
    id: String(input.id || `gmsnip_${markerIdentity}`),
    schema: "ccm-group-history-snip-boundary-v1",
    version: 1,
    type: "history_snip_boundary",
    role: "system",
    groupId,
    group_session_id: groupSessionId,
    parentUuid: input.parentUuid ?? input.parent_uuid ?? input.parentMessageId ?? input.parent_message_id ?? null,
    content: `[CCM history snip boundary: ${removedUuids.length} middle-range messages omitted from active resume context; raw transcript retained]`,
    snipMetadata: {
      schema: "ccm-group-history-snip-metadata-v1",
      version: 1,
      groupId,
      groupSessionId,
      removedUuids,
      removedUuidsChecksum,
      reason: String(input.reason || "history_snip"),
      createdAt: timestamp,
    },
    timestamp,
  };
}

function applyGroupMemoryResumeSnipRemovals(input: any) {
  const rawMessages = Array.isArray(input.rawMessages) ? input.rawMessages : [];
  const projectedMessages = Array.isArray(input.projectedMessages) ? input.projectedMessages : [];
  const memory = input.memory || {};
  const sessionId = String(input.sessionId || memory?.groupSessionId || "");
  if (!sessionId.startsWith("gcs_")) {
    return {
      messages: projectedMessages,
      removedIdSet: new Set<string>(),
      audit: {
        schema: "ccm-group-memory-resume-snip-replay-v1",
        version: 1,
        applied: false,
        sessionId,
        exactSessionRejected: true,
        markerCount: 0,
        legacyMarkerCount: 0,
        rejectedScopeMarkerCount: 0,
        checksumMismatchMarkerCount: 0,
        requestedRemovalCount: 0,
        removedMessageCount: 0,
        alreadyAbsentMessageCount: 0,
        relinkedMessageCount: 0,
        cycleBreakCount: 0,
        removedTokenEstimate: 0,
        removalChecksum: sha256("[]", 32),
      },
    };
  }
  const boundarySources = [
    ...(Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : []),
    ...(memory?.compactBoundary ? [memory.compactBoundary] : []),
  ];
  const sources = [...rawMessages, ...boundarySources];
  const removedIds = new Set<string>();
  let markerCount = 0;
  let legacyMarkerCount = 0;
  let rejectedScopeMarkerCount = 0;
  let checksumMismatchMarkerCount = 0;
  for (const source of sources) {
    const metadata = messageSnipMetadata(source);
    if (!metadata) continue;
    const declaredSessionId = String(
      metadata.groupSessionId
        || metadata.group_session_id
        || source?.groupSessionId
        || source?.group_session_id
        || ""
    );
    if (declaredSessionId && sessionId && declaredSessionId !== sessionId) {
      rejectedScopeMarkerCount += 1;
      continue;
    }
    const rows = metadata.removedUuids
      || metadata.removed_uuids
      || metadata.removedMessageIds
      || metadata.removed_message_ids;
    if (!Array.isArray(rows)) {
      legacyMarkerCount += 1;
      continue;
    }
    const normalized = [...new Set(rows.map((item: any) => String(item || "").trim()).filter(Boolean))].sort();
    const declaredChecksum = String(metadata.removedUuidsChecksum || metadata.removed_uuids_checksum || metadata.removedMessageIdsChecksum || metadata.removed_message_ids_checksum || "");
    const calculatedChecksum = sha256(JSON.stringify(normalized), 32);
    if (declaredChecksum && declaredChecksum !== calculatedChecksum) {
      checksumMismatchMarkerCount += 1;
      continue;
    }
    markerCount += 1;
    normalized.forEach(id => removedIds.add(id));
  }
  const removalChecksum = sha256(JSON.stringify([...removedIds].sort()), 32);
  if (!removedIds.size) {
    return {
      messages: projectedMessages,
      removedIdSet: removedIds,
      audit: {
        schema: "ccm-group-memory-resume-snip-replay-v1",
        version: 1,
        applied: false,
        sessionId,
        exactSessionRejected: false,
        markerCount,
        legacyMarkerCount,
        rejectedScopeMarkerCount,
        checksumMismatchMarkerCount,
        requestedRemovalCount: 0,
        removedMessageCount: 0,
        alreadyAbsentMessageCount: 0,
        relinkedMessageCount: 0,
        cycleBreakCount: 0,
        removedTokenEstimate: 0,
        removalChecksum,
      },
    };
  }

  const rawById = new Map<string, any>();
  rawMessages.forEach((message: any, index: number) => rawById.set(messageId(message, index), message));
  const removedActive = projectedMessages.filter((message: any, index: number) => removedIds.has(messageId(message, index)));
  let cycleBreakCount = 0;
  const resolvedParents = new Map<string, string | null>();
  const resolveParent = (start: string) => {
    if (resolvedParents.has(start)) return resolvedParents.get(start) ?? null;
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | null = start;
    while (current && removedIds.has(current)) {
      if (seen.has(current)) {
        current = null;
        cycleBreakCount += 1;
        break;
      }
      seen.add(current);
      path.push(current);
      const removedMessage = rawById.get(current);
      current = removedMessage ? (messageParentId(removedMessage) || null) : null;
    }
    path.forEach(id => resolvedParents.set(id, current));
    return current;
  };
  let relinkedMessageCount = 0;
  const messages = projectedMessages
    .filter((message: any, index: number) => !removedIds.has(messageId(message, index)))
    .map((message: any) => {
      const parentId = messageParentId(message);
      if (!parentId || !removedIds.has(parentId)) return message;
      relinkedMessageCount += 1;
      return withMessageParent(message, resolveParent(parentId));
    });
  return {
    messages,
    removedIdSet: removedIds,
    audit: {
      schema: "ccm-group-memory-resume-snip-replay-v1",
      version: 1,
      applied: removedActive.length > 0,
      sessionId,
      exactSessionRejected: false,
      markerCount,
      legacyMarkerCount,
      rejectedScopeMarkerCount,
      checksumMismatchMarkerCount,
      requestedRemovalCount: removedIds.size,
      removedMessageCount: removedActive.length,
      alreadyAbsentMessageCount: Math.max(0, removedIds.size - removedActive.length),
      relinkedMessageCount,
      cycleBreakCount,
      removedTokenEstimate: removedActive.reduce((sum: number, message: any) => sum + resumeMessageTokenEstimate(message), 0),
      removalChecksum,
    },
  };
}

function boundaryRoot(options: any = {}) {
  return String(options.rootDir || options.root_dir || DEFAULT_ROOT);
}

export function getGroupMemoryBoundaryJournalFile(groupId: string, sessionId: string, options: any = {}) {
  if (options.journalFile || options.journal_file) return String(options.journalFile || options.journal_file);
  return path.join(boundaryRoot(options), cleanPart(groupId), `${cleanPart(sessionId || "default")}.jsonl`);
}

export function getGroupMemoryResumeProofFile(groupId: string, sessionId: string, options: any = {}) {
  if (options.proofFile || options.proof_file) return String(options.proofFile || options.proof_file);
  return path.join(boundaryRoot(options), cleanPart(groupId), `${cleanPart(sessionId || "default")}.resume.jsonl`);
}

function getLockFile(groupId: string, sessionId: string, options: any = {}) {
  if (options.lockFile || options.lock_file) return String(options.lockFile || options.lock_file);
  return `${getGroupMemoryBoundaryJournalFile(groupId, sessionId, options)}.lock`;
}

function appendDurableJsonLine(file: string, row: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "a");
  try {
    fs.writeSync(fd, `${JSON.stringify(row)}\n`, undefined, "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function waitSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, ms));
}

function withJournalLock<T>(groupId: string, sessionId: string, options: any, work: () => T): T {
  const file = getLockFile(groupId, sessionId, options);
  const startedAt = Date.now();
  const waitMs = Math.max(50, Number(options.lockWaitMs || options.lock_wait_ms || DEFAULT_LOCK_WAIT_MS));
  const staleMs = Math.max(1_000, Number(options.lockStaleMs || options.lock_stale_ms || DEFAULT_LOCK_STALE_MS));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  while (true) {
    try {
      const fd = fs.openSync(file, "wx");
      try {
        fs.writeFileSync(fd, JSON.stringify({ schema: "ccm-group-memory-boundary-lock-v1", pid: process.pid, acquiredAt: new Date().toISOString() }), "utf-8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      break;
    } catch (error: any) {
      if (String(error?.code || "") !== "EEXIST") throw error;
      try {
        const stat = fs.statSync(file);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fs.unlinkSync(file);
          continue;
        }
      } catch {}
      if (Date.now() - startedAt >= waitMs) throw new Error(`compact boundary journal lock timeout: ${file}`);
      waitSync(25);
    }
  }
  try {
    return work();
  } finally {
    try { fs.unlinkSync(file); } catch {}
  }
}

function readChecksummedJsonLines(file: string, schema: string) {
  if (!fs.existsSync(file)) return { rows: [] as any[], invalidRows: [] as any[], lineCount: 0 };
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  const rows: any[] = [];
  const invalidRows: any[] = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const row = JSON.parse(line);
      const valid = row?.schema === schema
        && String(row.rowChecksum || "")
        && String(row.rowChecksum) === checksumObject(row);
      if (!valid) invalidRows.push({ line: index + 1, reason: row?.schema !== schema ? "schema_invalid" : "checksum_invalid" });
      else rows.push(row);
    } catch {
      invalidRows.push({ line: index + 1, reason: "json_invalid" });
    }
  });
  return { rows, invalidRows, lineCount: lines.filter(line => line.trim()).length };
}

export function readGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options: any = {}) {
  const file = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
  const parsed = readChecksummedJsonLines(file, "ccm-group-memory-compact-boundary-commit-v1");
  const commits = parsed.rows
    .filter(row => row.type === "boundary_commit")
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const latestCommit = commits[commits.length - 1] || null;
  const missing = !fs.existsSync(file);
  return {
    schema: "ccm-group-memory-boundary-journal-state-v1",
    version: GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION,
    groupId,
    sessionId: String(sessionId || "default"),
    file,
    missing,
    valid: !parsed.invalidRows.length,
    status: missing ? "missing" : parsed.invalidRows.length ? "invalid" : commits.length ? "committed" : "empty",
    commitCount: commits.length,
    lineCount: parsed.lineCount,
    invalidRows: parsed.invalidRows,
    latestCommit,
  };
}

export function calculateGroupMemorySummaryChecksum(memory: any) {
  if (memory?.conversationSummary != null) return sha256(JSON.stringify(memory.conversationSummary), 24);
  if (String(memory?.messageDigest || "").trim()) return sha256(String(memory.messageDigest), 24);
  return "";
}

function declaredSummaryChecksum(memory: any, boundary: any) {
  return String(
    memory?.compaction?.summaryChecksum
      || boundary?.summaryChecksum
      || boundary?.post_compact_restore?.summaryChecksum
      || boundary?.preservedSegment?.summaryChecksum
      || ""
  );
}

function compactLineageFromBoundary(boundary: any) {
  return boundary?.compactLineage
    || boundary?.compactMetadata?.compactLineage
    || boundary?.post_compact_restore?.compactLineage
    || null;
}

function calculatedCompactLineageChecksum(lineage: any) {
  if (!lineage?.schema) return "";
  const payload = { ...(lineage || {}) };
  delete payload.lineage_checksum;
  delete payload.checksum_valid;
  return sha256(JSON.stringify(payload), 64);
}

function compactionUsageFromBoundary(boundary: any) {
  return boundary?.compactionUsage
    || boundary?.compactMetadata?.compactionUsage
    || boundary?.post_compact_restore?.compactionUsage
    || null;
}

function calculatedCompactionUsageChecksum(usage: any) {
  if (!usage?.schema) return "";
  const payload = { ...(usage || {}) };
  delete payload.usage_checksum;
  delete payload.checksum_valid;
  return sha256(JSON.stringify(payload), 64);
}

function sessionMemoryCompactSelectionFromBoundary(boundary: any) {
  return boundary?.sessionMemoryCompactSelection
    || boundary?.compactMetadata?.sessionMemoryCompactSelection
    || boundary?.post_compact_restore?.sessionMemoryCompactSelection
    || null;
}

function calculatedSessionMemoryCompactSelectionChecksum(selection: any) {
  if (!selection?.schema) return "";
  const payload = { ...(selection || {}) };
  delete payload.selection_checksum;
  delete payload.checksum_valid;
  return sha256(JSON.stringify(payload), 64);
}

function postCompactSessionStateResetFromBoundary(boundary: any) {
  return boundary?.postCompactSessionStateReset
    || boundary?.compactMetadata?.postCompactSessionStateReset
    || boundary?.post_compact_restore?.postCompactSessionStateReset
    || null;
}

function calculatedPostCompactSessionStateResetChecksum(receipt: any) {
  if (!receipt?.schema) return "";
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return sha256(JSON.stringify(payload), 64);
}

function promptCacheCompactionNotificationFromBoundary(boundary: any) {
  return boundary?.promptCacheCompactionNotification
    || boundary?.compactMetadata?.promptCacheCompactionNotification
    || boundary?.post_compact_restore?.promptCacheCompactionNotification
    || null;
}

function calculatedPromptCacheCompactionNotificationChecksum(receipt: any) {
  if (!receipt?.schema) return "";
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return sha256(JSON.stringify(payload), 64);
}

function boundaryIdentity(boundary: any, summaryChecksum: string) {
  const segment = boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {};
  const identity: any = {
    boundaryId: String(boundary?.id || ""),
    summarizedThroughMessageId: String(boundary?.summarizedThroughMessageId || segment?.summarizedThroughMessageId || ""),
    firstPreservedMessageId: String(segment?.firstPreservedMessageId || ""),
    lastPreservedMessageId: String(segment?.lastPreservedMessageId || ""),
    preservedMessageCount: Number(segment?.preservedMessageCount || 0),
    summaryChecksum,
  };
  const hasAnchorContract = Number(segment?.version || 0) >= 2
    || !!(segment?.anchorMessageId || segment?.anchor_message_id || segment?.anchorKind || segment?.anchor_kind);
  if (hasAnchorContract) {
    identity.headMessageId = String(segment?.headMessageId || segment?.head_message_id || "");
    identity.anchorMessageId = String(segment?.anchorMessageId || segment?.anchor_message_id || "");
    identity.tailMessageId = String(segment?.tailMessageId || segment?.tail_message_id || "");
    identity.anchorKind = String(segment?.anchorKind || segment?.anchor_kind || "");
    identity.anchorMode = String(segment?.anchorMode || segment?.anchor_mode || "");
  }
  const compactLineage = compactLineageFromBoundary(boundary);
  if (compactLineage?.schema === "ccm-group-compact-lineage-v1") {
    identity.compactLineageChecksum = calculatedCompactLineageChecksum(compactLineage);
  }
  const compactionUsage = compactionUsageFromBoundary(boundary);
  if (compactionUsage?.schema === "ccm-group-compaction-model-usage-v1") {
    identity.compactionUsageChecksum = calculatedCompactionUsageChecksum(compactionUsage);
  }
  const sessionMemorySelection = sessionMemoryCompactSelectionFromBoundary(boundary);
  if (sessionMemorySelection?.schema === "ccm-group-session-memory-compact-selection-v1") {
    identity.sessionMemoryCompactSelectionChecksum = calculatedSessionMemoryCompactSelectionChecksum(sessionMemorySelection);
  }
  const postCompactSessionStateReset = postCompactSessionStateResetFromBoundary(boundary);
  if (postCompactSessionStateReset?.schema === "ccm-group-post-compact-session-state-reset-v1") {
    identity.postCompactSessionStateResetChecksum = calculatedPostCompactSessionStateResetChecksum(postCompactSessionStateReset);
  }
  const promptCacheNotification = promptCacheCompactionNotificationFromBoundary(boundary);
  if (promptCacheNotification?.schema === "ccm-group-prompt-cache-compaction-notification-v1") {
    identity.promptCacheCompactionNotificationChecksum = calculatedPromptCacheCompactionNotificationChecksum(promptCacheNotification);
  }
  return identity;
}

function buildBoundaryCommit(input: any, sequence: number, fencingToken: number) {
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const memory = input.memory || {};
  const boundary = input.boundary || memory.compactBoundary || null;
  if (!boundary?.id) throw new Error("compact boundary id is missing");
  const calculatedSummary = calculateGroupMemorySummaryChecksum(memory);
  const declaredSummary = declaredSummaryChecksum(memory, boundary);
  if (declaredSummary && calculatedSummary && declaredSummary !== calculatedSummary) {
    throw new Error(`compact summary checksum mismatch: declared=${declaredSummary}, calculated=${calculatedSummary}`);
  }
  const summaryChecksum = calculatedSummary || declaredSummary;
  const identity = boundaryIdentity(boundary, summaryChecksum);
  const compactLineage = compactLineageFromBoundary(boundary);
  if (compactLineage?.schema === "ccm-group-compact-lineage-v1") {
    const calculatedLineageChecksum = calculatedCompactLineageChecksum(compactLineage);
    if (String(compactLineage.lineage_checksum || "") !== calculatedLineageChecksum
      || String(compactLineage.group_id || "") !== String(input.groupId || memory.groupId || "")
      || String(compactLineage.group_session_id || "") !== String(input.sessionId || memory.groupSessionId || "")
      || String(compactLineage.boundary_id || "") !== String(boundary.id || "")) {
      throw new Error("compact lineage contract is invalid");
    }
  }
  const compactionUsage = compactionUsageFromBoundary(boundary);
  if (compactionUsage?.schema === "ccm-group-compaction-model-usage-v1") {
    const calculatedUsageChecksum = calculatedCompactionUsageChecksum(compactionUsage);
    if (String(compactionUsage.usage_checksum || "") !== calculatedUsageChecksum
      || String(compactionUsage.group_id || "") !== String(input.groupId || memory.groupId || "")
      || String(compactionUsage.group_session_id || "") !== String(input.sessionId || memory.groupSessionId || "")) {
      throw new Error("compaction model usage contract is invalid");
    }
  }
  const sessionMemorySelection = sessionMemoryCompactSelectionFromBoundary(boundary);
  if (sessionMemorySelection?.schema === "ccm-group-session-memory-compact-selection-v1") {
    const calculatedSelectionChecksum = calculatedSessionMemoryCompactSelectionChecksum(sessionMemorySelection);
    if (String(sessionMemorySelection.selection_checksum || "") !== calculatedSelectionChecksum
      || String(sessionMemorySelection.group_id || "") !== String(input.groupId || memory.groupId || "")
      || String(sessionMemorySelection.group_session_id || "") !== String(input.sessionId || memory.groupSessionId || "")
      || String(sessionMemorySelection.scope_id || "") !== `${String(input.groupId || memory.groupId || "")}--${String(input.sessionId || memory.groupSessionId || "")}`) {
      throw new Error("session memory compact selection contract is invalid");
    }
  }
  const postCompactSessionStateReset = postCompactSessionStateResetFromBoundary(boundary);
  if (postCompactSessionStateReset?.schema === "ccm-group-post-compact-session-state-reset-v1") {
    const calculatedResetChecksum = calculatedPostCompactSessionStateResetChecksum(postCompactSessionStateReset);
    if (String(postCompactSessionStateReset.receipt_checksum || "") !== calculatedResetChecksum
      || String(postCompactSessionStateReset.group_id || "") !== String(input.groupId || memory.groupId || "")
      || String(postCompactSessionStateReset.group_session_id || "") !== String(input.sessionId || memory.groupSessionId || "")
      || String(postCompactSessionStateReset.scope_id || "") !== `${String(input.groupId || memory.groupId || "")}--${String(input.sessionId || memory.groupSessionId || "")}`
      || String(postCompactSessionStateReset.boundary_id || "") !== String(boundary.id || "")) {
      throw new Error("post compact session state reset contract is invalid");
    }
  }
  const promptCacheNotification = promptCacheCompactionNotificationFromBoundary(boundary);
  if (promptCacheNotification?.schema === "ccm-group-prompt-cache-compaction-notification-v1") {
    const calculatedNotificationChecksum = calculatedPromptCacheCompactionNotificationChecksum(promptCacheNotification);
    if (String(promptCacheNotification.receipt_checksum || "") !== calculatedNotificationChecksum
      || String(promptCacheNotification.group_id || "") !== String(input.groupId || memory.groupId || "")
      || String(promptCacheNotification.group_session_id || "") !== String(input.sessionId || memory.groupSessionId || "")
      || String(promptCacheNotification.boundary_id || "") !== String(boundary.id || "")
      || String(promptCacheNotification.post_compact_session_state_reset_checksum || "") !== String(postCompactSessionStateReset?.receipt_checksum || "")
      || Number(promptCacheNotification.baseline_generation || 0) !== Number(postCompactSessionStateReset?.cache_read_baseline?.generation || 0)
      || String(promptCacheNotification.baseline_status || "") !== "reset_pending_next_api_success"
      || promptCacheNotification.body_free !== true) {
      throw new Error("prompt cache compaction notification contract is invalid");
    }
  }
  const hasAnchorContract = Object.prototype.hasOwnProperty.call(identity, "anchorMessageId");
  if (hasAnchorContract && (
    !identity.anchorMessageId
    || identity.headMessageId !== identity.firstPreservedMessageId
    || identity.tailMessageId !== identity.lastPreservedMessageId
    || identity.anchorMessageId !== String((boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {})?.summaryMessageId || "")
    || identity.anchorKind !== "compact_summary"
    || identity.anchorMode !== "suffix_preserving"
  )) {
    throw new Error("compact summary head/anchor/tail contract is invalid");
  }
  const throughIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === identity.summarizedThroughMessageId);
  const headIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === identity.firstPreservedMessageId);
  const tailIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === identity.lastPreservedMessageId);
  if (throughIndex < 0 || headIndex !== throughIndex + 1 || tailIndex < headIndex) {
    throw new Error("compact preserved segment is not contiguous with the raw transcript");
  }
  if (identity.preservedMessageCount !== tailIndex - headIndex + 1) {
    throw new Error("compact preserved segment count does not match the raw transcript");
  }
  const segment = boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {};
  const preservedIds = Array.isArray(segment.preservedMessageIds) ? segment.preservedMessageIds.map((item: any) => String(item)) : [];
  const prefix = messages.slice(0, tailIndex + 1);
  const raw = JSON.stringify(messages);
  const committedAt = String(input.now || new Date().toISOString());
  const core: any = {
    schema: "ccm-group-memory-compact-boundary-commit-v1",
    version: GROUP_MEMORY_BOUNDARY_JOURNAL_VERSION,
    type: "boundary_commit",
    groupId: String(input.groupId || memory.groupId || ""),
    sessionId: String(input.sessionId || memory.groupSessionId || "default"),
    commitId: `gmbc_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    sequence,
    fencingToken,
    ...identity,
    preservedMessageIds: preservedIds,
    omittedPreservedMessageIds: Number(segment.omittedPreservedMessageIds || 0),
    boundaryChecksum: sha256(JSON.stringify(identity), 32),
    transcript: {
      path: String(input.transcriptPath || input.transcript_path || segment.transcriptPath || ""),
      messageCount: messages.length,
      byteLength: Buffer.byteLength(raw, "utf-8"),
      checksum: sha256(raw, 32),
      prefixMessageCount: prefix.length,
      prefixChecksum: sha256(JSON.stringify(prefix), 32),
      summarizedThroughIndex: throughIndex,
      preservedHeadIndex: headIndex,
      preservedTailIndex: tailIndex,
    },
    committedAt,
    ownerPid: process.pid,
  };
  return { ...core, rowChecksum: checksumObject(core) };
}

export function commitGroupMemoryCompactBoundary(input: any) {
  const groupId = String(input.groupId || input.memory?.groupId || "").trim();
  const sessionId = String(input.sessionId || input.memory?.groupSessionId || "default").trim() || "default";
  const boundary = input.boundary || input.memory?.compactBoundary || null;
  if (!groupId || !boundary?.id || !boundary?.summarizedThroughMessageId) {
    return { committed: false, reason: "no_compact_boundary", groupId, sessionId };
  }
  return withJournalLock(groupId, sessionId, input, () => {
    const state = readGroupMemoryBoundaryJournal(groupId, sessionId, input);
    if (!state.valid) throw new Error(`compact boundary journal is invalid: ${state.file}`);
    const sequence = Number(state.latestCommit?.sequence || 0) + 1;
    const fencingToken = Number(state.latestCommit?.fencingToken || 0) + 1;
    const commit = buildBoundaryCommit(input, sequence, fencingToken);
    if (state.latestCommit
      && state.latestCommit.boundaryId === commit.boundaryId
      && state.latestCommit.boundaryChecksum === commit.boundaryChecksum
      && state.latestCommit.transcript?.prefixChecksum === commit.transcript?.prefixChecksum) {
      return { committed: false, reason: "already_committed", commit: state.latestCommit, journal: state };
    }
    appendDurableJsonLine(state.file, commit);
    return { committed: true, commit, journal: readGroupMemoryBoundaryJournal(groupId, sessionId, input) };
  });
}

function validationCheck(checks: any[], id: string, pass: boolean, evidence: any) {
  checks.push({ id, pass: !!pass, evidence: String(evidence ?? "") });
}

export function buildGroupMemoryResumeProjection(input: any) {
  const groupId = String(input.groupId || input.memory?.groupId || "").trim();
  const sessionId = String(input.sessionId || input.memory?.groupSessionId || "default").trim() || "default";
  const memory = input.memory || {};
  const messages = Array.isArray(input.messages) ? input.messages : [];
  const boundary = memory.compactBoundary || null;
  const journal = readGroupMemoryBoundaryJournal(groupId, sessionId, input);
  const generatedAt = String(input.now || new Date().toISOString());
  const fail = (reason: string, checks: any[] = []) => ({
    schema: "ccm-group-memory-resume-projection-v1",
    version: GROUP_MEMORY_RESUME_PROJECTION_VERSION,
    groupId,
    sessionId,
    status: "fail_closed_rebuild_required",
    reason,
    verified: false,
    useProjection: false,
    mustUseFullRawTranscript: true,
    checks,
    journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
    boundary: boundary ? boundaryIdentity(boundary, calculateGroupMemorySummaryChecksum(memory)) : null,
    projectedMessages: messages,
    preservedMessages: [],
    messagesAfterBoundary: [],
    omittedMessageCount: 0,
    generatedAt,
  });
  if (!boundary?.id) {
    if (journal.latestCommit) return fail("memory_boundary_missing");
    const snipReplay = applyGroupMemoryResumeSnipRemovals({ rawMessages: messages, projectedMessages: messages, memory, sessionId });
    const projectionCore: any = {
      schema: "ccm-group-memory-resume-projection-v1",
      version: GROUP_MEMORY_RESUME_PROJECTION_VERSION,
      groupId,
      sessionId,
      status: snipReplay.audit.applied ? "verified" : "no_boundary",
      reason: snipReplay.audit.applied ? "durable_snip_markers_replayed_without_compact_boundary" : messages.length ? "raw_transcript_only" : "empty_session",
      verified: true,
      useProjection: snipReplay.audit.applied,
      mustUseFullRawTranscript: !snipReplay.audit.applied,
      checks: [],
      journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
      boundary: null,
      rawMessageCount: messages.length,
      omittedMessageCount: 0,
      snipOmittedMessageCount: snipReplay.audit.removedMessageCount,
      totalOmittedMessageCount: snipReplay.audit.removedMessageCount,
      preservedMessageCount: snipReplay.messages.length,
      projectedMessageCount: snipReplay.messages.length,
      projectedMessageIds: snipReplay.messages.map(messageId),
      snipReplay: snipReplay.audit,
      generatedAt,
    };
    const projectionChecksum = sha256(JSON.stringify(projectionCore), 32);
    return {
      ...projectionCore,
      projectionChecksum,
      projectedMessages: snipReplay.messages,
      preservedMessages: snipReplay.messages,
      messagesAfterBoundary: [],
    };
  }
  if (!journal.valid) return fail("boundary_journal_invalid");
  if (!journal.latestCommit) return fail("boundary_commit_missing");
  const commit = journal.latestCommit;
  if (String(commit.boundaryId || "") !== String(boundary.id || "")) return fail("uncommitted_memory_boundary");

  const checks: any[] = [];
  const calculatedSummary = calculateGroupMemorySummaryChecksum(memory);
  const identity = boundaryIdentity(boundary, calculatedSummary);
  validationCheck(checks, "group_scope_matches", commit.groupId === groupId, `${commit.groupId}:${groupId}`);
  validationCheck(checks, "session_scope_matches", commit.sessionId === sessionId, `${commit.sessionId}:${sessionId}`);
  validationCheck(checks, "boundary_checksum_matches", commit.boundaryChecksum === sha256(JSON.stringify(identity), 32), commit.boundaryChecksum);
  validationCheck(checks, "summary_checksum_matches", !!calculatedSummary && commit.summaryChecksum === calculatedSummary, `${commit.summaryChecksum}:${calculatedSummary}`);
  validationCheck(checks, "summarized_through_matches", commit.summarizedThroughMessageId === identity.summarizedThroughMessageId, identity.summarizedThroughMessageId);
  validationCheck(checks, "preserved_head_matches", commit.firstPreservedMessageId === identity.firstPreservedMessageId, identity.firstPreservedMessageId);
  validationCheck(checks, "preserved_tail_matches", commit.lastPreservedMessageId === identity.lastPreservedMessageId, identity.lastPreservedMessageId);
  validationCheck(checks, "preserved_count_matches", Number(commit.preservedMessageCount || 0) === Number(identity.preservedMessageCount || 0), identity.preservedMessageCount);
  const compactLineage = compactLineageFromBoundary(boundary);
  if (compactLineage?.schema === "ccm-group-compact-lineage-v1") {
    const calculatedLineageChecksum = calculatedCompactLineageChecksum(compactLineage);
    validationCheck(checks, "compact_lineage_checksum_matches", String(compactLineage.lineage_checksum || "") === calculatedLineageChecksum, calculatedLineageChecksum);
    validationCheck(checks, "compact_lineage_boundary_matches", String(compactLineage.boundary_id || "") === String(boundary.id || ""), compactLineage.boundary_id || "");
    validationCheck(checks, "compact_lineage_group_matches", String(compactLineage.group_id || "") === groupId, compactLineage.group_id || "");
    validationCheck(checks, "compact_lineage_session_matches", String(compactLineage.group_session_id || "") === sessionId, compactLineage.group_session_id || "");
    validationCheck(checks, "compact_lineage_journal_matches", String(commit.compactLineageChecksum || "") === calculatedLineageChecksum, commit.compactLineageChecksum || "");
  }
  const compactionUsage = compactionUsageFromBoundary(boundary);
  if (compactionUsage?.schema === "ccm-group-compaction-model-usage-v1") {
    const calculatedUsageChecksum = calculatedCompactionUsageChecksum(compactionUsage);
    validationCheck(checks, "compaction_usage_checksum_matches", String(compactionUsage.usage_checksum || "") === calculatedUsageChecksum, calculatedUsageChecksum);
    validationCheck(checks, "compaction_usage_group_matches", String(compactionUsage.group_id || "") === groupId, compactionUsage.group_id || "");
    validationCheck(checks, "compaction_usage_session_matches", String(compactionUsage.group_session_id || "") === sessionId, compactionUsage.group_session_id || "");
    validationCheck(checks, "compaction_usage_journal_matches", String(commit.compactionUsageChecksum || "") === calculatedUsageChecksum, commit.compactionUsageChecksum || "");
  }
  const sessionMemorySelection = sessionMemoryCompactSelectionFromBoundary(boundary);
  if (sessionMemorySelection?.schema === "ccm-group-session-memory-compact-selection-v1") {
    const calculatedSelectionChecksum = calculatedSessionMemoryCompactSelectionChecksum(sessionMemorySelection);
    validationCheck(checks, "session_memory_selection_checksum_matches", String(sessionMemorySelection.selection_checksum || "") === calculatedSelectionChecksum, calculatedSelectionChecksum);
    validationCheck(checks, "session_memory_selection_group_matches", String(sessionMemorySelection.group_id || "") === groupId, sessionMemorySelection.group_id || "");
    validationCheck(checks, "session_memory_selection_session_matches", String(sessionMemorySelection.group_session_id || "") === sessionId, sessionMemorySelection.group_session_id || "");
    validationCheck(checks, "session_memory_selection_scope_matches", String(sessionMemorySelection.scope_id || "") === `${groupId}--${sessionId}`, sessionMemorySelection.scope_id || "");
    validationCheck(checks, "session_memory_selection_journal_matches", String(commit.sessionMemoryCompactSelectionChecksum || "") === calculatedSelectionChecksum, commit.sessionMemoryCompactSelectionChecksum || "");
  }
  const postCompactSessionStateReset = postCompactSessionStateResetFromBoundary(boundary);
  if (postCompactSessionStateReset?.schema === "ccm-group-post-compact-session-state-reset-v1") {
    const calculatedResetChecksum = calculatedPostCompactSessionStateResetChecksum(postCompactSessionStateReset);
    validationCheck(checks, "post_compact_session_state_reset_checksum_matches", String(postCompactSessionStateReset.receipt_checksum || "") === calculatedResetChecksum, calculatedResetChecksum);
    validationCheck(checks, "post_compact_session_state_reset_group_matches", String(postCompactSessionStateReset.group_id || "") === groupId, postCompactSessionStateReset.group_id || "");
    validationCheck(checks, "post_compact_session_state_reset_session_matches", String(postCompactSessionStateReset.group_session_id || "") === sessionId, postCompactSessionStateReset.group_session_id || "");
    validationCheck(checks, "post_compact_session_state_reset_boundary_matches", String(postCompactSessionStateReset.boundary_id || "") === String(boundary.id || ""), postCompactSessionStateReset.boundary_id || "");
    validationCheck(checks, "post_compact_session_state_reset_journal_matches", String(commit.postCompactSessionStateResetChecksum || "") === calculatedResetChecksum, commit.postCompactSessionStateResetChecksum || "");
  }
  const promptCacheNotification = promptCacheCompactionNotificationFromBoundary(boundary);
  if (promptCacheNotification?.schema === "ccm-group-prompt-cache-compaction-notification-v1") {
    const calculatedNotificationChecksum = calculatedPromptCacheCompactionNotificationChecksum(promptCacheNotification);
    validationCheck(checks, "prompt_cache_compaction_notification_checksum_matches", String(promptCacheNotification.receipt_checksum || "") === calculatedNotificationChecksum, calculatedNotificationChecksum);
    validationCheck(checks, "prompt_cache_compaction_notification_group_matches", String(promptCacheNotification.group_id || "") === groupId, promptCacheNotification.group_id || "");
    validationCheck(checks, "prompt_cache_compaction_notification_session_matches", String(promptCacheNotification.group_session_id || "") === sessionId, promptCacheNotification.group_session_id || "");
    validationCheck(checks, "prompt_cache_compaction_notification_boundary_matches", String(promptCacheNotification.boundary_id || "") === String(boundary.id || ""), promptCacheNotification.boundary_id || "");
    validationCheck(checks, "prompt_cache_compaction_notification_reset_matches", String(promptCacheNotification.post_compact_session_state_reset_checksum || "") === String(postCompactSessionStateReset?.receipt_checksum || ""), promptCacheNotification.post_compact_session_state_reset_checksum || "");
    validationCheck(checks, "prompt_cache_compaction_notification_generation_matches", Number(promptCacheNotification.baseline_generation || 0) === Number(postCompactSessionStateReset?.cache_read_baseline?.generation || 0), promptCacheNotification.baseline_generation || 0);
    validationCheck(checks, "prompt_cache_compaction_notification_pending_status_matches", String(promptCacheNotification.baseline_status || "") === "reset_pending_next_api_success", promptCacheNotification.baseline_status || "");
    validationCheck(checks, "prompt_cache_compaction_notification_body_free", promptCacheNotification.body_free === true, promptCacheNotification.body_free === true);
    validationCheck(checks, "prompt_cache_compaction_notification_journal_matches", String(commit.promptCacheCompactionNotificationChecksum || "") === calculatedNotificationChecksum, commit.promptCacheCompactionNotificationChecksum || "");
  }
  if (Object.prototype.hasOwnProperty.call(identity, "anchorMessageId")) {
    validationCheck(checks, "head_message_matches", commit.headMessageId === identity.headMessageId && identity.headMessageId === identity.firstPreservedMessageId, identity.headMessageId);
    validationCheck(checks, "summary_anchor_matches", commit.anchorMessageId === identity.anchorMessageId && identity.anchorMessageId === String((boundary?.preservedSegment || boundary?.post_compact_restore?.preservedSegment || {})?.summaryMessageId || ""), identity.anchorMessageId);
    validationCheck(checks, "tail_message_matches", commit.tailMessageId === identity.tailMessageId && identity.tailMessageId === identity.lastPreservedMessageId, identity.tailMessageId);
    validationCheck(checks, "anchor_kind_matches", commit.anchorKind === "compact_summary" && identity.anchorKind === "compact_summary", identity.anchorKind);
    validationCheck(checks, "anchor_mode_matches", commit.anchorMode === "suffix_preserving" && identity.anchorMode === "suffix_preserving", identity.anchorMode);
  }

  const throughIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === commit.summarizedThroughMessageId);
  const headIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === commit.firstPreservedMessageId);
  const tailIndex = messages.findIndex((message: any, index: number) => messageId(message, index) === commit.lastPreservedMessageId);
  validationCheck(checks, "summarized_through_present", throughIndex >= 0, throughIndex);
  validationCheck(checks, "preserved_head_present", headIndex >= 0, headIndex);
  validationCheck(checks, "preserved_tail_present", tailIndex >= 0, tailIndex);
  validationCheck(checks, "preserved_segment_contiguous", headIndex === throughIndex + 1 && tailIndex >= headIndex, `${throughIndex}:${headIndex}:${tailIndex}`);
  validationCheck(checks, "preserved_segment_length", tailIndex >= headIndex && tailIndex - headIndex + 1 === Number(commit.preservedMessageCount || 0), `${tailIndex - headIndex + 1}:${commit.preservedMessageCount}`);
  validationCheck(checks, "transcript_not_truncated", messages.length >= Number(commit.transcript?.messageCount || 0), `${messages.length}:${commit.transcript?.messageCount || 0}`);
  const prefix = tailIndex >= 0 ? messages.slice(0, tailIndex + 1) : [];
  validationCheck(checks, "committed_prefix_checksum", tailIndex >= 0 && sha256(JSON.stringify(prefix), 32) === String(commit.transcript?.prefixChecksum || ""), commit.transcript?.prefixChecksum || "");
  const declaredIds = Array.isArray(commit.preservedMessageIds) ? commit.preservedMessageIds.map((item: any) => String(item)) : [];
  const actualIds = tailIndex >= headIndex && headIndex >= 0 ? messages.slice(headIndex, tailIndex + 1).map(messageId) : [];
  validationCheck(checks, "preserved_id_suffix_matches", !declaredIds.length || JSON.stringify(actualIds.slice(-declaredIds.length)) === JSON.stringify(declaredIds), `${declaredIds.length}:${actualIds.length}`);
  const failedChecks = checks.filter(check => !check.pass).map(check => check.id);
  if (failedChecks.length) return fail(`projection_validation_failed:${failedChecks.join(",")}`, checks);

  const rawPreservedMessages = messages.slice(headIndex, tailIndex + 1);
  const sanitizedPreserved = rawPreservedMessages.map(sanitizePreservedMessageUsage);
  const preSnipPreservedMessages = sanitizedPreserved.map(item => item.message);
  const preSnipMessagesAfterBoundary = messages.slice(tailIndex + 1);
  const snipReplay = applyGroupMemoryResumeSnipRemovals({
    rawMessages: messages,
    projectedMessages: [...preSnipPreservedMessages, ...preSnipMessagesAfterBoundary],
    memory,
    sessionId,
  });
  const activeById = new Map(snipReplay.messages.map((message: any) => [messageId(message, 0), message]));
  const preservedMessages = preSnipPreservedMessages
    .map((message: any) => activeById.get(messageId(message, 0)))
    .filter(Boolean);
  const messagesAfterBoundary = preSnipMessagesAfterBoundary
    .map((message: any) => activeById.get(messageId(message, 0)))
    .filter(Boolean);
  const projectedMessages = snipReplay.messages;
  const staleProviderUsageTokensExcluded = sanitizedPreserved.reduce((sum, item) => sum + Number(item.tokens || 0), 0);
  const usageSanitizedMessageCount = sanitizedPreserved.filter(item => item.sanitized).length;
  const checkpointMessageCount = Math.max(0, Number(commit.transcript?.messageCount || 0));
  const appendedSinceCheckpoint = Math.max(0, messages.length - checkpointMessageCount);
  const expectedActiveMessageCount = Math.max(0, Number(commit.preservedMessageCount || 0) + appendedSinceCheckpoint - Number(snipReplay.audit.removedMessageCount || 0));
  const roundTripCore: any = {
    schema: "ccm-group-memory-resume-consistency-v1",
    version: 1,
    checkpointMessageCount,
    committedPreservedMessageCount: Number(commit.preservedMessageCount || 0),
    appendedSinceCheckpoint,
    replayedSnipRemovalCount: Number(snipReplay.audit.removedMessageCount || 0),
    expectedActiveMessageCount,
    actualActiveMessageCount: projectedMessages.length,
    delta: projectedMessages.length - expectedActiveMessageCount,
  };
  const roundTripConsistency = {
    ...roundTripCore,
    status: roundTripCore.delta === 0 ? "consistent" : "drift_detected",
    checksum: sha256(JSON.stringify(roundTripCore), 32),
  };
  const projectionCore: any = {
    schema: "ccm-group-memory-resume-projection-v1",
    version: GROUP_MEMORY_RESUME_PROJECTION_VERSION,
    groupId,
    sessionId,
    status: "verified",
    reason: "latest_committed_boundary_verified",
    verified: true,
    useProjection: true,
    mustUseFullRawTranscript: false,
    boundary: {
      commitId: commit.commitId,
      boundaryId: commit.boundaryId,
      sequence: commit.sequence,
      fencingToken: commit.fencingToken,
      summaryChecksum: commit.summaryChecksum,
      summarizedThroughMessageId: commit.summarizedThroughMessageId,
      firstPreservedMessageId: commit.firstPreservedMessageId,
      lastPreservedMessageId: commit.lastPreservedMessageId,
      headMessageId: commit.headMessageId || commit.firstPreservedMessageId,
      anchorMessageId: commit.anchorMessageId || "",
      tailMessageId: commit.tailMessageId || commit.lastPreservedMessageId,
      anchorKind: commit.anchorKind || "",
      anchorMode: commit.anchorMode || "",
      compactLineageChecksum: commit.compactLineageChecksum || "",
      compactionUsageChecksum: commit.compactionUsageChecksum || "",
      sessionMemoryCompactSelectionChecksum: commit.sessionMemoryCompactSelectionChecksum || "",
      postCompactSessionStateResetChecksum: commit.postCompactSessionStateResetChecksum || "",
      promptCacheCompactionNotificationChecksum: commit.promptCacheCompactionNotificationChecksum || "",
    },
    summaryText: String(memory.messageDigest || ""),
    rawMessageCount: messages.length,
    omittedMessageCount: headIndex,
    snipOmittedMessageCount: snipReplay.audit.removedMessageCount,
    totalOmittedMessageCount: headIndex + snipReplay.audit.removedMessageCount,
    committedPreservedMessageCount: preSnipPreservedMessages.length,
    preservedMessageCount: preservedMessages.length,
    committedMessagesAfterBoundaryCount: preSnipMessagesAfterBoundary.length,
    messagesAfterBoundaryCount: messagesAfterBoundary.length,
    projectedMessageCount: projectedMessages.length,
    projectedMessageIds: projectedMessages.map(messageId),
    preservedUsageSanitized: true,
    usageSanitizedMessageCount,
    staleProviderUsageTokensExcluded,
    snipReplay: snipReplay.audit,
    roundTripConsistency,
    checks,
    journal: { file: journal.file, status: journal.status, valid: journal.valid, commitCount: journal.commitCount, invalidRows: journal.invalidRows },
    generatedAt,
  };
  const projectionChecksum = sha256(JSON.stringify(projectionCore), 32);
  return { ...projectionCore, projectionChecksum, projectedMessages, preservedMessages, messagesAfterBoundary };
}

function compactProof(projection: any, input: any = {}) {
  const recovered = input.recovered === true;
  const resumeBaseline = input.resumeBaseline || input.resume_baseline || null;
  const core: any = {
    schema: "ccm-group-memory-resume-projection-proof-v1",
    version: GROUP_MEMORY_RESUME_PROJECTION_VERSION,
    type: "resume_projection",
    proofId: `gmrp_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    groupId: projection.groupId,
    sessionId: projection.sessionId,
    status: projection.status,
    reason: projection.reason,
    verified: projection.verified === true,
    recovered,
    recoveryReason: String(input.recoveryReason || input.recovery_reason || ""),
    priorStatus: String(input.priorStatus || input.prior_status || ""),
    priorReason: String(input.priorReason || input.prior_reason || ""),
    boundary: projection.boundary || null,
    journal: projection.journal || null,
    rawMessageCount: Number(projection.rawMessageCount ?? projection.projectedMessages?.length ?? 0),
    omittedMessageCount: Number(projection.omittedMessageCount || 0),
    snipOmittedMessageCount: Number(projection.snipOmittedMessageCount || 0),
    totalOmittedMessageCount: Number(projection.totalOmittedMessageCount || projection.omittedMessageCount || 0),
    preservedMessageCount: Number(projection.preservedMessageCount || projection.preservedMessages?.length || 0),
    messagesAfterBoundaryCount: Number(projection.messagesAfterBoundaryCount || projection.messagesAfterBoundary?.length || 0),
    projectedMessageCount: Number(projection.projectedMessageCount || projection.projectedMessages?.length || 0),
    preservedUsageSanitized: projection.preservedUsageSanitized === true,
    usageSanitizedMessageCount: Number(projection.usageSanitizedMessageCount || 0),
    staleProviderUsageTokensExcluded: Number(projection.staleProviderUsageTokensExcluded || 0),
    snipReplay: projection.snipReplay?.schema === "ccm-group-memory-resume-snip-replay-v1"
      ? projection.snipReplay
      : null,
    roundTripConsistency: projection.roundTripConsistency?.schema === "ccm-group-memory-resume-consistency-v1"
      ? projection.roundTripConsistency
      : null,
    compactHeadRecovery: input.compactHeadRecovery?.schema === "ccm-group-compact-head-restart-recovery-v1"
      ? {
        schema: input.compactHeadRecovery.schema,
        status: String(input.compactHeadRecovery.status || ""),
        recovered: input.compactHeadRecovery.recovered === true,
        boundaryId: String(input.compactHeadRecovery.boundaryId || ""),
        receiptChecksum: String(input.compactHeadRecovery.receiptChecksum || ""),
        priorHeadGeneration: Number(input.compactHeadRecovery.priorHeadGeneration || 0),
        headId: String(input.compactHeadRecovery.head?.head_id || ""),
        headGeneration: Number(input.compactHeadRecovery.head?.generation || 0),
        issues: Array.isArray(input.compactHeadRecovery.issues) ? input.compactHeadRecovery.issues.slice(0, 8) : [],
      }
      : null,
    providerNativeCompactSessionCapacityReconciliation:
      input.providerNativeCompactSessionCapacityReconciliation?.schema === "ccm-provider-native-compact-session-capacity-reconciliation-v1"
        ? {
          schema: input.providerNativeCompactSessionCapacityReconciliation.schema,
          status: String(input.providerNativeCompactSessionCapacityReconciliation.status || ""),
          recovered: input.providerNativeCompactSessionCapacityReconciliation.recovered === true,
          idempotent: input.providerNativeCompactSessionCapacityReconciliation.idempotent === true,
          boundaryId: String(input.providerNativeCompactSessionCapacityReconciliation.boundary_id || ""),
          compactHeadId: String(input.providerNativeCompactSessionCapacityReconciliation.compact_head_id || ""),
          compactHeadGeneration: Number(input.providerNativeCompactSessionCapacityReconciliation.compact_head_generation || 0),
          generation: Number(input.providerNativeCompactSessionCapacityReconciliation.generation || 0),
          resetId: String(input.providerNativeCompactSessionCapacityReconciliation.reset_id || ""),
          issues: Array.isArray(input.providerNativeCompactSessionCapacityReconciliation.issues)
            ? input.providerNativeCompactSessionCapacityReconciliation.issues.slice(0, 8)
            : [],
        }
        : null,
    resumeEffectiveTokenBaseline: resumeBaseline?.schema === "ccm-group-memory-resume-effective-token-baseline-v1"
      ? {
        schema: resumeBaseline.schema,
        baselineId: String(resumeBaseline.baselineId || ""),
        baselineChecksum: String(resumeBaseline.baselineChecksum || ""),
        rawTranscriptTokens: Number(resumeBaseline.rawTranscriptTokens || 0),
        omittedRawTokens: Number(resumeBaseline.omittedRawTokens || 0),
        summaryTokens: Number(resumeBaseline.summaryTokens || 0),
        projectedMessageTokens: Number(resumeBaseline.projectedMessageTokens || 0),
        effectiveContextTokens: Number(resumeBaseline.effectiveContextTokens || 0),
        staleProviderUsageTokensExcluded: Number(resumeBaseline.staleProviderUsageTokensExcluded || 0),
        snipRemovedMessageCount: Number(resumeBaseline.snipRemovedMessageCount || 0),
        snipRemovedTokenEstimate: Number(resumeBaseline.snipRemovedTokenEstimate || 0),
        snipRemovalChecksum: String(resumeBaseline.snipRemovalChecksum || ""),
      }
      : null,
    projectionChecksum: String(projection.projectionChecksum || ""),
    failedChecks: (projection.checks || []).filter((check: any) => !check.pass).map((check: any) => check.id),
    generatedAt: String(input.now || projection.generatedAt || new Date().toISOString()),
    ownerPid: process.pid,
  };
  return { ...core, rowChecksum: checksumObject(core) };
}

export function recordGroupMemoryResumeProjectionProof(projection: any, options: any = {}) {
  if (!projection?.groupId || !projection?.sessionId) return null;
  const file = getGroupMemoryResumeProofFile(projection.groupId, projection.sessionId, options);
  const proof = compactProof(projection, options);
  appendDurableJsonLine(file, proof);
  return { ...proof, file };
}

export function readGroupMemoryResumeProjectionProofs(groupId: string, sessionId: string, options: any = {}) {
  const file = getGroupMemoryResumeProofFile(groupId, sessionId, options);
  const parsed = readChecksummedJsonLines(file, "ccm-group-memory-resume-projection-proof-v1");
  return {
    schema: "ccm-group-memory-resume-projection-proof-ledger-v1",
    groupId,
    sessionId: String(sessionId || "default"),
    file,
    valid: !parsed.invalidRows.length,
    proofCount: parsed.rows.length,
    invalidRows: parsed.invalidRows,
    latestProof: parsed.rows[parsed.rows.length - 1] || null,
    recentProofs: parsed.rows.slice(-20),
  };
}

function rotateJournal(groupId: string, sessionId: string, reason: string, options: any = {}) {
  const file = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
  if (!fs.existsSync(file)) return { rotated: false, reason: "missing", file };
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const target = `${file}.${cleanPart(reason)}-${suffix}`;
  fs.renameSync(file, target);
  return { rotated: true, reason, file, target };
}

export function quarantineInvalidGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options: any = {}) {
  return withJournalLock(groupId, sessionId, options, () => rotateJournal(groupId, sessionId, "invalid", options));
}

export function retireGroupMemoryBoundaryJournal(groupId: string, sessionId: string, options: any = {}) {
  return withJournalLock(groupId, sessionId, options, () => rotateJournal(groupId, sessionId, "retired", options));
}

export function inspectGroupMemoryResumeProjection(input: any) {
  const projection = buildGroupMemoryResumeProjection(input);
  const proofs = readGroupMemoryResumeProjectionProofs(projection.groupId, projection.sessionId, input);
  const { projectedMessages, preservedMessages, messagesAfterBoundary, summaryText, ...summary } = projection;
  return { ...summary, summaryTextLength: String(summaryText || "").length, proofs };
}

export function deleteGroupMemoryBoundaryArtifacts(groupId: string, sessionId: string, options: any = {}) {
  const journalFile = getGroupMemoryBoundaryJournalFile(groupId, sessionId, options);
  const proofFile = getGroupMemoryResumeProofFile(groupId, sessionId, options);
  const files = [journalFile, proofFile, getLockFile(groupId, sessionId, options)];
  try {
    const dir = path.dirname(journalFile);
    const journalName = path.basename(journalFile);
    const proofName = path.basename(proofFile);
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(`${journalName}.`) || name.startsWith(`${proofName}.`)) files.push(path.join(dir, name));
    }
  } catch {}
  let deletedFiles = 0;
  for (const file of [...new Set(files)]) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        deletedFiles += 1;
      }
    } catch {}
  }
  return { schema: "ccm-group-memory-boundary-artifact-delete-v1", groupId, sessionId, deletedFiles, files, deletedAt: new Date().toISOString() };
}
