"use strict";
// group-memory-shared.ts — merged from 2 part files (behavior-freeze merge).
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
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT = exports.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS = exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH = exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH = exports.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH = exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH = exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH = exports.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH = exports.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH = exports.markGroupMemoryAutoCompactHookRegistered = exports.isGroupMemoryAutoCompactHookRegistered = exports.groupMemoryAutoCompactHookRegistered = exports.groupMemoryAutoCompactPending = exports.groupMemoryAutoCompactRunning = exports.groupMemoryAutoCompactTimers = exports.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = exports.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = exports.GROUP_COMPACT_FILE_REFERENCE_DIR = exports.GROUP_TOOL_CONTINUITY_DIR = exports.GROUP_SESSION_MEMORY_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = exports.GROUP_MEMORY_REPLAY_REPAIR_DIR = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR = exports.GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR = exports.GROUP_MEMORY_RELOAD_DIR = exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = exports.GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = exports.GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES = exports.GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT = exports.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS = exports.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS = exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION = exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION = exports.GROUP_SESSION_SCOPED_MEMORY_DIR = exports.GROUP_MEMORY_DIR = void 0;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES = exports.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT = void 0;
exports.cleanGroupMemoryScopePart = cleanGroupMemoryScopePart;
exports.getGroupSessionMemoryScopeId = getGroupSessionMemoryScopeId;
exports.buildGroupCompactBoundaryHistorySummary = buildGroupCompactBoundaryHistorySummary;
exports.uniqueByKey = uniqueByKey;
exports.compactMemoryText = compactMemoryText;
exports.compactPreserveLines = compactPreserveLines;
exports.hashSessionMemoryText = hashSessionMemoryText;
exports.writeTextAtomic = writeTextAtomic;
exports.writeJsonAtomic = writeJsonAtomic;
exports.memoryTextsMayConflict = memoryTextsMayConflict;
exports.intersectionValues = intersectionValues;
exports.groupSessionMemoryToolCallCount = groupSessionMemoryToolCallCount;
exports.inspectGroupSessionMemoryToolCallsSince = inspectGroupSessionMemoryToolCallsSince;
exports.groupSessionMemoryLastAssistantTurnHasToolCalls = groupSessionMemoryLastAssistantTurnHasToolCalls;
exports.resolveGroupSessionMemoryExtractionCursor = resolveGroupSessionMemoryExtractionCursor;
exports.renderGroupSessionMemoryMarkdown = renderGroupSessionMemoryMarkdown;
exports.mergeToolGrantSets = mergeToolGrantSets;
exports.countToolGrantSet = countToolGrantSet;
exports.hasToolGrantSet = hasToolGrantSet;
exports.extractToolGrantSet = extractToolGrantSet;
exports.compactReferenceFingerprint = compactReferenceFingerprint;
exports.summarizeMemoryItems = summarizeMemoryItems;
exports.compressGroupMemory = compressGroupMemory;
exports.normalizeAgentMemoryProject = normalizeAgentMemoryProject;
exports.resolveGroupProjectMemoryRoot = resolveGroupProjectMemoryRoot;
exports.formatAgentMemoryReceipt = formatAgentMemoryReceipt;
exports.createEmptyAgentMemory = createEmptyAgentMemory;
exports.normalizeAgentMemories = normalizeAgentMemories;
exports.removeSessionDirectoryWithin = removeSessionDirectoryWithin;
exports.getMemoryMessageContent = getMemoryMessageContent;
exports.getMemoryMessageIdentity = getMemoryMessageIdentity;
exports.getMemoryMessageActor = getMemoryMessageActor;
exports.anchorChecksum = anchorChecksum;
exports.buildFactAnchor = buildFactAnchor;
exports.mergeFactAnchorList = mergeFactAnchorList;
exports.extractGroupFactAnchors = extractGroupFactAnchors;
exports.extractPersistentRequirementsFromAnchors = extractPersistentRequirementsFromAnchors;
exports.getCompactBoundaryIndex = getCompactBoundaryIndex;
exports.clearUntrustedGroupCompactionState = clearUntrustedGroupCompactionState;
exports.appendGroupMemorySnipBoundaryMarker = appendGroupMemorySnipBoundaryMarker;
exports.buildGroupMemoryResumeEffectiveTokenBaseline = buildGroupMemoryResumeEffectiveTokenBaseline;
exports.validateGroupMemoryResumeEffectiveTokenBaseline = validateGroupMemoryResumeEffectiveTokenBaseline;
exports.getGroupMessagesFileHint = getGroupMessagesFileHint;
exports.buildGroupMemorySourceEntry = buildGroupMemorySourceEntry;
exports.readGroupMemoryReloadLedger = readGroupMemoryReloadLedger;
exports.writeGroupMemoryReloadLedger = writeGroupMemoryReloadLedger;
exports.readGroupPostCompactDispatchLedger = readGroupPostCompactDispatchLedger;
exports.writeGroupPostCompactDispatchLedger = writeGroupPostCompactDispatchLedger;
exports.normalizePostCompactUsageState = normalizePostCompactUsageState;
exports.usageRecommendationForStats = usageRecommendationForStats;
exports.stableApiMicrocompactJson = stableApiMicrocompactJson;
exports.stableApiMicrocompactChecksum = stableApiMicrocompactChecksum;
exports.apiMicrocompactHeaderValue = apiMicrocompactHeaderValue;
exports.apiMicrocompactBetaHeadersFromHeaders = apiMicrocompactBetaHeadersFromHeaders;
exports.uniqueApiMicrocompactStrings = uniqueApiMicrocompactStrings;
exports.buildStableSourceFingerprint = buildStableSourceFingerprint;
exports.resolvePostCompactBoundaryMarkerParts = resolvePostCompactBoundaryMarkerParts;
exports.loadGroupMemoryCompactionConfig = loadGroupMemoryCompactionConfig;
exports.isGroupModelCompactionEnabled = isGroupModelCompactionEnabled;
exports.buildBackgroundCompactionState = buildBackgroundCompactionState;
exports.uniqueProviderRankingCompactRepairRecallStrings = uniqueProviderRankingCompactRepairRecallStrings;
exports.isProviderRankingProvenanceCompactRepairReceiptRecallQuery = isProviderRankingProvenanceCompactRepairReceiptRecallQuery;
exports.isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery = isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery;
exports.isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery = isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery;
exports.findMemoryArtifactBySchema = findMemoryArtifactBySchema;
exports.runnerRequestHasDurableReturnEvidence = runnerRequestHasDurableReturnEvidence;
exports.tokenizeGlobalGroupMemoryQuery = tokenizeGlobalGroupMemoryQuery;
exports.globalGroupMemoryCorpus = globalGroupMemoryCorpus;
exports.scoreGlobalGroupMemoryCandidate = scoreGlobalGroupMemoryCandidate;
exports.latestGroupMessageTimestamp = latestGroupMessageTimestamp;
exports.normalizeGlobalGroupMemoryMembers = normalizeGlobalGroupMemoryMembers;
exports.importGroupProjectMemoriesForMembers = importGroupProjectMemoriesForMembers;
exports.getGroupMessageMemoryWho = getGroupMessageMemoryWho;
exports.buildGroupMessageMemoryLine = buildGroupMessageMemoryLine;
exports.buildCompressedGroupMessageDigest = buildCompressedGroupMessageDigest;
exports.normalizeMemoryStringArray = normalizeMemoryStringArray;
exports.normalizeWorkerLedgerItem = normalizeWorkerLedgerItem;
exports.findLatestWorkerLedger = findLatestWorkerLedger;
exports.appendWorkerLedger = appendWorkerLedger;
exports.updateGroupMemory = updateGroupMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const tool_authorization_1 = require("../../tools/tool-authorization");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
const execution_kernel_1 = require("../../agents/execution-kernel");
const direct_dispatch_spool_1 = require("../../agents/direct-dispatch-spool");
const group_agent_memory_packet_1 = require("./group-agent-memory-packet");
const group_compact_file_references_1 = require("./group-compact-file-references");
const group_global_memory_arbitration_1 = require("./group-global-memory-arbitration");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
// ===== merged from group-memory-shared-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
exports.GROUP_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory");
exports.GROUP_SESSION_SCOPED_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory-sessions");
exports.GROUP_MEMORY_SOURCE_MANIFEST_VERSION = 1;
exports.GROUP_MEMORY_RELOAD_AUDIT_VERSION = 1;
exports.GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = 1;
exports.GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = 1;
exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = 1;
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
exports.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = 3;
exports.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS = 2_000;
exports.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS = 12_000;
exports.GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT = 10_000;
exports.GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES = 5_000;
exports.GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
exports.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = 1;
exports.GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = 1;
exports.GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = 1;
exports.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = 1;
exports.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = 1;
exports.GROUP_MEMORY_RELOAD_DIR = path.join(utils_1.CCM_DIR, "group-memory-reload");
exports.GROUP_MEMORY_POST_COMPACT_DISPATCH_DIR = path.join(utils_1.CCM_DIR, "group-memory-post-compact-dispatch");
exports.GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR = path.join(utils_1.CCM_DIR, "group-memory-post-compact-candidate-usage");
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-proof");
exports.GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR = path.join(utils_1.CCM_DIR, "group-api-microcompact-native-apply-request-telemetry");
exports.GROUP_MEMORY_REPLAY_REPAIR_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair");
exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-work-items");
exports.GROUP_SESSION_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-session-memory");
exports.GROUP_TOOL_CONTINUITY_DIR = path.join(utils_1.CCM_DIR, "group-tool-continuity");
exports.GROUP_COMPACT_FILE_REFERENCE_DIR = path.join(utils_1.CCM_DIR, "group-memory-file-references");
exports.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR = path.join(utils_1.CCM_DIR, "group-global-memory-arbitration");
function cleanGroupMemoryScopePart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}
function getGroupSessionMemoryScopeId(groupId, sessionId = "") {
    const cleanSessionId = String(sessionId || "").trim();
    return !cleanSessionId || cleanSessionId === "default" ? groupId : `${groupId}--${cleanSessionId}`;
}
function buildGroupCompactBoundaryHistorySummary(memory = {}) {
    const boundaries = Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : [];
    if (!boundaries.length)
        return null;
    const rows = boundaries.slice(-8).map((boundary, index) => ({
        index,
        id: String(boundary.id || boundary.boundary_id || boundary.summaryChecksum || boundary.summary_checksum || boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || `boundary-${index}`),
        summaryChecksum: String(boundary.summaryChecksum || boundary.summary_checksum || ""),
        summarizedThroughMessageId: String(boundary.summarizedThroughMessageId || boundary.summarized_through_message_id || ""),
        compactedMessageCount: Number(boundary.summarizedMessageCount || boundary.summarized_message_count || boundary.compactedMessageCount || boundary.compacted_message_count || 0),
        preCompactTokenCount: Number(boundary.preCompactTokenCount || boundary.pre_compact_token_count || 0),
        postCompactTokenCount: Number(boundary.postCompactTokenCount || boundary.post_compact_token_count || 0),
    }));
    return {
        schema: "ccm-compact-boundary-history-summary-v1",
        boundaryCount: rows.length,
        latest: rows[rows.length - 1] || null,
        rows,
    };
}
function uniqueByKey(items, keyFn, limit = 20) {
    const seen = new Set();
    const result = [];
    for (const item of [...(items || [])].reverse()) {
        const key = keyFn(item);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.unshift(item);
    }
    return result.slice(-limit);
}
function compactMemoryText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function compactPreserveLines(value, max = 2200) {
    const text = String(value || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map(line => line.replace(/[ \t]+$/g, ""))
        .join("\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();
    return text.length > max ? `${text.slice(0, max)}\n…（已截断）` : text;
}
function hashSessionMemoryText(value, length = 16) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}
function writeTextAtomic(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, text, "utf-8");
    fs.renameSync(temp, file);
}
function writeJsonAtomic(file, value) {
    writeTextAtomic(file, JSON.stringify(value, null, 2));
}
function memoryTextsMayConflict(globalText, localText) {
    return (0, group_global_memory_arbitration_1.scoreMemorySemanticContradiction)(globalText, localText).conflict === true;
}
function intersectionValues(a = [], b = []) {
    const right = new Set(b);
    return a.filter(value => right.has(value));
}
function groupSessionMemoryToolCallCount(message = {}) {
    const direct = [message.tool_calls, message.toolCalls, message.tool_uses, message.toolUses]
        .filter(Array.isArray)
        .reduce((sum, rows) => sum + rows.length, 0);
    const content = Array.isArray(message?.content)
        ? message.content
        : Array.isArray(message?.message?.content) ? message.message.content : [];
    return direct + content.filter((block) => String(block?.type || "").toLowerCase() === "tool_use").length;
}
function inspectGroupSessionMemoryToolCallsSince(messages, sinceMessageId = "") {
    const rows = Array.isArray(messages) ? messages : [];
    const start = sinceMessageId
        ? rows.findIndex((message, index) => getMemoryMessageIdentity(message, index) === sinceMessageId)
        : -1;
    if (sinceMessageId && start < 0) {
        return {
            count: 0,
            cursorStatus: "not_found",
            cursorIndex: -1,
            scannedMessageCount: 0,
        };
    }
    const scanned = rows.slice(Math.max(0, start + 1));
    return {
        count: scanned.reduce((sum, message) => sum + groupSessionMemoryToolCallCount(message), 0),
        cursorStatus: sinceMessageId ? "resolved" : "not_set",
        cursorIndex: start,
        scannedMessageCount: scanned.length,
    };
}
function groupSessionMemoryLastAssistantTurnHasToolCalls(messages) {
    const rows = Array.isArray(messages) ? messages : [];
    for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index];
        if (String(row?.role || row?.type || "").toLowerCase() === "assistant")
            return groupSessionMemoryToolCallCount(row) > 0;
    }
    return false;
}
function resolveGroupSessionMemoryExtractionCursor(cadenceDecision = {}) {
    const shouldExtract = cadenceDecision.shouldExtract === true;
    const cursorBefore = String(cadenceDecision.lastExtractionMessageId || cadenceDecision.last_extraction_message_id || "");
    const cursorAdvanceSafe = cadenceDecision.lastAssistantTurnHasToolCalls !== true;
    const cursorAfter = shouldExtract && cursorAdvanceSafe
        ? String(cadenceDecision.lastObservedMessageId || cadenceDecision.last_observed_message_id || cursorBefore)
        : cursorBefore;
    const cursorAdvanceStatus = !shouldExtract
        ? "not_extracted"
        : cursorAdvanceSafe ? "advanced" : "held_tool_use_boundary";
    return {
        cursorAdvanceStatus,
        cursorAdvanceSafe,
        cursorBefore,
        cursorAfter,
        cursorHeldReason: cursorAdvanceStatus === "held_tool_use_boundary"
            ? "last_assistant_turn_has_tool_calls"
            : "",
    };
}
function renderGroupSessionMemoryMarkdown(groupId, memory = {}) {
    const compaction = memory.compaction || {};
    const compression = memory.messageCompression || {};
    const boundary = memory.compactBoundary || {};
    const summaryText = compactPreserveLines(memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null), 5200);
    const lines = [
        "# CCM Group Session Memory",
        "",
        `- groupId: ${groupId}`,
        `- generatedAt: ${new Date().toISOString()}`,
        `- strategy: ${compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"}`,
        `- lastSummarizedMessageId: ${compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""}`,
        `- summaryChecksum: ${compaction.summaryChecksum || boundary.summaryChecksum || ""}`,
        `- compactedMessages: ${Number(compaction.compactedMessageCount || compression.compressedMessages || 0)}`,
        `- preservedRecentMessages: ${Number(compaction.preservedRecentMessages || compression.recentMessages || 0)}`,
        "",
        "## Goal",
        memory.goal || "未记录",
        "",
        "## Session Summary",
        summaryText || "暂无压缩摘要；当前群聊仍处于近期原文窗口。",
    ];
    const addList = (title, items, mapper, limit = 10) => {
        const rows = (Array.isArray(items) ? items : []).slice(-limit).map(mapper).filter(Boolean);
        if (!rows.length)
            return;
        lines.push("", `## ${title}`);
        for (const row of rows)
            lines.push(`- ${compactPreserveLines(row, 420)}`);
    };
    addList("Persistent Requirements", memory.persistentRequirements || [], (item) => item.text || item.value || String(item || ""), 16);
    addList("Fact Anchors", memory.factAnchors || [], (item) => item.text || item.value || String(item || ""), 16);
    addList("Decisions", memory.decisions || [], (item) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 10);
    addList("Worker State", memory.workerLedger || [], (item) => `${item.project || item.agent || "unknown"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 12);
    addList("Open Questions", memory.openQuestions || [], (item) => item.question || String(item || ""), 8);
    addList("Next Actions", memory.nextActions || [], (item) => item.action || String(item || ""), 8);
    lines.push("", "## Use Policy", "- Treat this file as the compacted session memory for this group chat.", "- Child Agent sessions may be fresh third-party CLI sessions; inject this summary together with recent raw messages.", "- If the user asks to ignore memory, behave as if this file were empty and declare memoryIgnored in the receipt.");
    return (0, group_session_memory_snapshot_1.enforceGroupSessionMemoryBudget)(lines.join("\n")).markdown;
}
function mergeToolGrantSets(...sets) {
    const merged = { mcp: new Set(), skill: new Set() };
    for (const set of sets || []) {
        let normalized = { mcp: [], skill: [] };
        try {
            normalized = (0, tool_authorization_1.normalizeToolAuthorization)(set || {});
        }
        catch { }
        for (const value of normalized.mcp || [])
            merged.mcp.add(String(value || "").trim());
        for (const value of normalized.skill || [])
            merged.skill.add(String(value || "").trim());
    }
    return {
        mcp: Array.from(merged.mcp).filter(Boolean).slice(0, 120),
        skill: Array.from(merged.skill).filter(Boolean).slice(0, 120),
    };
}
function countToolGrantSet(set = {}) {
    return (Array.isArray(set.mcp) ? set.mcp.length : 0) + (Array.isArray(set.skill) ? set.skill.length : 0);
}
function hasToolGrantSet(set = {}) {
    return countToolGrantSet(set) > 0;
}
function extractToolGrantSet(value = {}) {
    return mergeToolGrantSets(value?.allowedTools || value?.allowed_tools || value?.tools || value);
}
function compactReferenceFingerprint(references = []) {
    return hashSessionMemoryText((references || []).map((item) => ({
        id: item.reference_id,
        path: (0, group_compact_file_references_1.normalizeCompactFileReferencePath)(item.path || ""),
        checksum: item.checksum || "",
    })), 16);
}
function summarizeMemoryItems(title, items, mapper) {
    const values = (items || []).map(mapper).filter(Boolean);
    if (!values.length)
        return "";
    return `${title}: ${values.join("；")}`;
}
function compressGroupMemory(memory) {
    const next = { ...(memory || {}) };
    const summaryParts = [];
    const compressList = (key, keep = 8, title = key, mapper = (item) => JSON.stringify(item)) => {
        const items = Array.isArray(next[key]) ? next[key] : [];
        if (items.length <= keep)
            return;
        const oldItems = items.slice(0, Math.max(0, items.length - keep));
        next[key] = items.slice(-keep);
        const summary = summarizeMemoryItems(title, oldItems, mapper);
        if (summary)
            summaryParts.push(summary);
    };
    compressList("decisions", 8, "历史决策", (item) => `${item.decision}${item.reason ? `(${item.reason})` : ""}`);
    compressList("completed", 10, "历史完成", (item) => `${item.project || "unknown"}:${item.summary || ""}`);
    compressList("blocked", 8, "历史阻塞", (item) => `${item.project || "unknown"}:${item.reason || ""}`);
    compressList("workerLedger", 18, "历史 Worker 通知", (item) => `${item.project || "unknown"}:${item.status || ""}:${item.summary || ""}`);
    if (!next.agentMemories || !Object.keys(next.agentMemories || {}).length) {
        next.agentMemories = normalizeAgentMemories({}, next.workerLedger || []);
    }
    compressList("openQuestions", 6, "历史问题", (item) => String(item.question || item));
    compressList("nextActions", 6, "历史下一步", (item) => String(item.action || item));
    const mergedSummary = [next.summary || "", ...summaryParts].filter(Boolean).join(" | ");
    next.summary = compactMemoryText(mergedSummary, 1800);
    return next;
}
function normalizeAgentMemoryProject(project) {
    return String(project || "").trim() || "unknown";
}
function resolveGroupProjectMemoryRoot(project, options = {}) {
    const explicit = options.projectRoot || options.project_root || options.workDir || options.work_dir;
    if (explicit)
        return path.resolve(String(explicit));
    try {
        const workDir = (0, utils_1.getWorkDirForProject)(project);
        return workDir ? path.resolve(String(workDir)) : "";
    }
    catch {
        return "";
    }
}
function formatAgentMemoryReceipt(item) {
    return [
        `[${item.status || item.receiptStatus || "unknown"}]`,
        item.summary || "无摘要",
        item.filesChanged?.length ? `文件：${item.filesChanged.slice(0, 6).join("、")}` : "",
        item.verification?.length ? `验证：${item.verification.slice(0, 4).join("、")}` : "",
        item.blockers?.length ? `阻塞：${item.blockers.slice(0, 3).join("、")}` : "",
        item.needs?.length ? `需要：${item.needs.slice(0, 3).join("、")}` : "",
    ].filter(Boolean).join("；");
}
function createEmptyAgentMemory(project) {
    return {
        project: normalizeAgentMemoryProject(project),
        summary: "",
        recentReceipts: [],
        frequentFiles: [],
        verificationHints: [],
        blockers: [],
        needs: [],
        stats: { totalReceipts: 0, compressedReceipts: 0, recentReceipts: 0, lastUpdatedAt: "" },
    };
}
function normalizeAgentMemories(agentMemories = {}, workerLedger = []) {
    let next = { ...(agentMemories || {}) };
    for (const item of workerLedger || [])
        next = (0, group_agent_memory_packet_1.upsertAgentMemory)(next, item);
    return next;
}
function removeSessionDirectoryWithin(root, target) {
    const safeRoot = path.resolve(root);
    const safeTarget = path.resolve(target);
    if (safeTarget === safeRoot || !safeTarget.startsWith(`${safeRoot}${path.sep}`))
        throw new Error(`unsafe session artifact path: ${safeTarget}`);
    if (!fs.existsSync(safeTarget))
        return 0;
    let deleted = 0;
    for (const entry of fs.readdirSync(safeTarget, { withFileTypes: true })) {
        const child = path.join(safeTarget, entry.name);
        if (entry.isDirectory())
            deleted += removeSessionDirectoryWithin(root, child);
        else {
            fs.unlinkSync(child);
            deleted += 1;
        }
    }
    fs.rmdirSync(safeTarget);
    return deleted;
}
function getMemoryMessageContent(message) {
    return String(message?.content || message?.delivery_summary?.headline || message?.receipt?.summary || "").trim();
}
function getMemoryMessageIdentity(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function getMemoryMessageActor(message) {
    if (message?.role === "user")
        return `用户 -> ${message?.target || "all"}`;
    return message?.agent || message?.role || "Agent";
}
function anchorChecksum(type, text) {
    return crypto.createHash("sha256").update(`${type}\n${text}`).digest("hex").slice(0, 16);
}
function buildFactAnchor(message, index, type, text) {
    const compacted = compactPreserveLines(text, 1600);
    if (!compacted)
        return null;
    const messageId = getMemoryMessageIdentity(message, index);
    return {
        id: `${messageId}:${type}`,
        type,
        messageId,
        actor: getMemoryMessageActor(message),
        text: compacted,
        timestamp: String(message?.timestamp || message?.time || ""),
        checksum: anchorChecksum(type, compacted),
    };
}
function mergeFactAnchorList(existing = [], incoming = [], limit = 300) {
    const merged = new Map();
    for (const item of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
        const text = String(item?.text || "").trim();
        if (!text)
            continue;
        const type = String(item?.type || "legacy_memory");
        const sourceId = String(item?.messageId || item?.source?.messageId || item?.source?.sessionId || "legacy");
        const id = String(item?.id || `${sourceId}:${type}:${anchorChecksum(type, text)}`);
        merged.set(id, { ...item, id, text });
    }
    return [...merged.values()].slice(-limit);
}
function extractGroupFactAnchors(messages) {
    const anchors = [];
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        const content = getMemoryMessageContent(message);
        if (!content)
            continue;
        if (message?.role === "user") {
            const anchor = buildFactAnchor(message, index, "user_requirement", content);
            if (anchor)
                anchors.push(anchor);
        }
        if (message?.dispatchPolicy?.action || message?.dispatchPolicy?.reason || Array.isArray(message?.assignments) && message.assignments.length) {
            const anchor = buildFactAnchor(message, index, "dispatch_decision", `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`);
            if (anchor)
                anchors.push(anchor);
        }
    }
    return anchors;
}
function extractPersistentRequirementsFromAnchors(anchors) {
    return (anchors || []).filter((item) => item?.type === "user_requirement"
        && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|保留|优先|must\b|never\b|always\b|do not\b|required?\b)/i.test(String(item.text || ""))).slice(-120);
}
function getCompactBoundaryIndex(memory, messages) {
    const boundaryId = String(memory?.compactBoundary?.summarizedThroughMessageId
        || memory?.compaction?.lastCompactedMessageId
        || "");
    if (!boundaryId)
        return -1;
    return (messages || []).findIndex((message, index) => getMemoryMessageIdentity(message, index) === boundaryId);
}
function clearUntrustedGroupCompactionState(memory, reason) {
    const now = new Date().toISOString();
    return {
        ...(memory || {}),
        conversationSummary: null,
        messageDigest: "",
        compactBoundary: null,
        compaction: {
            version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
            enabled: true,
            health: "recovering",
            boundaries: [],
            compactedMessageCount: 0,
            preservedRecentMessages: 0,
            lastCompactedMessageId: "",
            summaryChecksum: "",
            resumeRecovery: {
                schema: "ccm-group-memory-resume-recovery-v1",
                status: "rebuilding_from_full_raw_transcript",
                reason,
                startedAt: now,
            },
        },
        messageCompression: {
            ...(memory?.messageCompression || {}),
            compressedMessages: 0,
            lastCompressedAt: "",
            preservedSegment: null,
        },
    };
}
function appendGroupMemorySnipBoundaryMarker(groupId, groupSessionId, removedMessageIds, options = {}) {
    const id = String(groupId || "").trim();
    const sessionId = String(groupSessionId || "").trim();
    if (!id || !sessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_snip_boundary_append");
    const messages = (0, storage_1.getGroupMessages)(id, sessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const existingIds = new Set(messages.map((message, index) => getMemoryMessageIdentity(message, index)));
    const requestedIds = [...new Set((Array.isArray(removedMessageIds) ? removedMessageIds : [])
            .map(item => String(item || "").trim()).filter(Boolean))];
    const missingIds = requestedIds.filter(messageId => !existingIds.has(messageId));
    if (!requestedIds.length)
        throw new Error("snip_boundary_removed_message_ids_required");
    if (missingIds.length && options.allowMissing !== true && options.allow_missing !== true) {
        throw new Error(`snip_boundary_message_ids_not_found:${missingIds.slice(0, 8).join(",")}`);
    }
    const effectiveIds = options.allowMissing === true || options.allow_missing === true
        ? requestedIds.filter(messageId => existingIds.has(messageId))
        : requestedIds;
    if (!effectiveIds.length)
        throw new Error("snip_boundary_has_no_existing_message_ids");
    const parentMessage = messages[messages.length - 1] || null;
    const marker = (0, group_memory_boundary_journal_1.buildGroupMemorySnipBoundaryMarker)({
        ...options,
        groupId: id,
        groupSessionId: sessionId,
        removedMessageIds: effectiveIds,
        parentUuid: options.parentUuid
            || options.parent_uuid
            || (parentMessage ? getMemoryMessageIdentity(parentMessage, messages.length - 1) : null),
    });
    const appended = (0, storage_1.appendGroupMessage)(id, marker);
    return {
        schema: "ccm-group-history-snip-boundary-append-v1",
        version: 1,
        groupId: id,
        groupSessionId: sessionId,
        appended: true,
        marker: appended,
        removedMessageCount: effectiveIds.length,
        missingMessageCount: missingIds.length,
        removalChecksum: marker.snipMetadata.removedUuidsChecksum,
    };
}
function buildGroupMemoryResumeEffectiveTokenBaseline(projection, memory, allMessages, options = {}) {
    if (projection?.status !== "verified" || projection?.useProjection !== true)
        return null;
    const rawMessages = (allMessages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    const projectedMessages = Array.isArray(projection.projectedMessages) ? projection.projectedMessages : [];
    const omittedMessageCount = Math.max(0, Math.min(rawMessages.length, Number(projection.omittedMessageCount || 0)));
    const rawTranscriptTokens = rawMessages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const omittedRawTokens = rawMessages.slice(0, omittedMessageCount)
        .reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const projectedMessageTokens = projectedMessages
        .reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const summaryText = String(memory?.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory?.conversationSummary || null) || "");
    const summaryTokens = (0, group_memory_compaction_1.estimateGroupTextTokens)(summaryText);
    const effectiveContextTokens = summaryTokens + projectedMessageTokens;
    const pressureWarning = (0, group_memory_compaction_1.calculateGroupCompactWarningState)({
        activeTokens: effectiveContextTokens,
        activeMessageCount: projectedMessages.length,
        autoCompactThreshold: options.autoCompactThreshold || options.auto_compact_threshold,
        config: options.config || options,
    });
    const core = {
        schema: "ccm-group-memory-resume-effective-token-baseline-v1",
        version: 1,
        groupId: String(projection.groupId || memory?.groupId || ""),
        groupSessionId: String(projection.sessionId || memory?.groupSessionId || ""),
        boundaryId: String(projection.boundary?.boundaryId || ""),
        summaryChecksum: String(projection.boundary?.summaryChecksum || memory?.compaction?.summaryChecksum || ""),
        projectionChecksum: String(projection.projectionChecksum || ""),
        rawMessageCount: rawMessages.length,
        omittedMessageCount,
        snipOmittedMessageCount: Math.max(0, Number(projection.snipOmittedMessageCount || 0)),
        totalOmittedMessageCount: Math.max(0, Number(projection.totalOmittedMessageCount || omittedMessageCount)),
        projectedMessageCount: projectedMessages.length,
        rawTranscriptTokens,
        omittedRawTokens,
        projectedMessageTokens,
        summaryTokens,
        effectiveContextTokens,
        tokenSavings: Math.max(0, rawTranscriptTokens - effectiveContextTokens),
        staleProviderUsageTokensExcluded: Math.max(0, Number(projection.staleProviderUsageTokensExcluded || 0)),
        usageSanitizedMessageCount: Math.max(0, Number(projection.usageSanitizedMessageCount || 0)),
        snipRemovedMessageCount: Math.max(0, Number(projection.snipReplay?.removedMessageCount || 0)),
        snipRemovedTokenEstimate: Math.max(0, Number(projection.snipReplay?.removedTokenEstimate || 0)),
        snipRelinkedMessageCount: Math.max(0, Number(projection.snipReplay?.relinkedMessageCount || 0)),
        snipRemovalChecksum: String(projection.snipReplay?.removalChecksum || ""),
        resumeConsistencyDelta: Number(projection.roundTripConsistency?.delta || 0),
        resumeConsistencyChecksum: String(projection.roundTripConsistency?.checksum || ""),
        calculation: "effective_context_tokens=summary_tokens+projected_message_tokens; committed_prefix_raw_tokens, replayed_snip_ranges, and preserved_provider_usage_are_excluded",
        pressureWarning,
    };
    const baselineChecksum = crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0, 32);
    return {
        ...core,
        baselineId: `gmrb_${baselineChecksum.slice(0, 20)}`,
        baselineChecksum,
        observedAt: String(options.now || new Date().toISOString()),
    };
}
function validateGroupMemoryResumeEffectiveTokenBaseline(baseline) {
    if (baseline?.schema !== "ccm-group-memory-resume-effective-token-baseline-v1")
        return false;
    const { baselineId, baselineChecksum, observedAt, ...core } = baseline || {};
    const calculated = crypto.createHash("sha256").update(JSON.stringify(core)).digest("hex").slice(0, 32);
    return String(baselineChecksum || "") === calculated
        && String(baselineId || "") === `gmrb_${calculated.slice(0, 20)}`;
}
function getGroupMessagesFileHint(groupId, sessionId = "") {
    return (0, storage_1.getGroupChatSessionMessagesFile)(groupId, sessionId);
}
function buildGroupMemorySourceEntry(id, sourcePath, purpose, extra = {}) {
    const file = String(sourcePath || "");
    const entry = {
        id,
        purpose,
        path: file,
        exists: false,
        kind: "missing",
        bytes: 0,
        mtimeMs: 0,
        mtime: "",
        checksum: "",
        checksumMode: "",
        status: file ? "missing" : "missing_path",
        ...extra,
    };
    if (!file)
        return entry;
    try {
        const stat = fs.statSync(file);
        entry.exists = true;
        entry.bytes = stat.size;
        entry.mtimeMs = Math.round(stat.mtimeMs);
        entry.mtime = stat.mtime.toISOString();
        if (stat.isDirectory()) {
            entry.kind = "directory";
            const names = fs.readdirSync(file).filter(Boolean).sort();
            entry.childCount = names.length;
            entry.checksum = crypto.createHash("sha256").update(names.join("\n")).digest("hex").slice(0, 24);
            entry.checksumMode = "directory_listing";
        }
        else if (stat.isFile()) {
            entry.kind = "file";
            const digest = (0, group_memory_storage_1.hashGroupMemoryFileWindow)(file, stat);
            entry.checksum = digest.checksum;
            entry.checksumMode = digest.checksumMode;
            entry.lineCount = digest.lineCount;
        }
        else {
            entry.kind = "other";
            entry.checksum = crypto.createHash("sha256").update(`${stat.size}:${stat.mtimeMs}`).digest("hex").slice(0, 24);
            entry.checksumMode = "stat";
        }
        entry.status = "present";
    }
    catch (error) {
        entry.status = "unreadable";
        entry.error = compactMemoryText(error?.message || error, 260);
    }
    return entry;
}
function readGroupMemoryReloadLedger(groupId, sessionId = "") {
    const file = (0, group_memory_storage_1.getGroupMemoryReloadLedgerFile)(groupId, sessionId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    }
    catch {
        return {
            schema: "ccm-group-memory-reload-ledger-v1",
            version: 1,
            groupId,
            groupSessionId: String(sessionId || "default"),
            file,
            scopes: {},
            entries: [],
            updatedAt: "",
        };
    }
}
function writeGroupMemoryReloadLedger(groupId, ledger, sessionId = "") {
    const file = (0, group_memory_storage_1.getGroupMemoryReloadLedgerFile)(groupId, sessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-memory-reload-ledger-v1",
        version: 1,
        groupId,
        groupSessionId: String(sessionId || "default"),
        scopes: ledger.scopes || {},
        entries: (ledger.entries || []).slice(-120),
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readGroupPostCompactDispatchLedger(groupId, sessionId = "") {
    const file = (0, group_memory_storage_1.getGroupPostCompactDispatchLedgerFile)(groupId, sessionId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            scopes: parsed?.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        };
    }
    catch {
        return {
            schema: "ccm-group-post-compact-dispatch-ledger-v1",
            version: 1,
            groupId,
            groupSessionId: String(sessionId || "default"),
            file,
            scopes: {},
            entries: [],
            updatedAt: "",
        };
    }
}
function writeGroupPostCompactDispatchLedger(groupId, ledger, sessionId = "") {
    const file = (0, group_memory_storage_1.getGroupPostCompactDispatchLedgerFile)(groupId, sessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({
        schema: "ccm-group-post-compact-dispatch-ledger-v1",
        version: 1,
        groupId,
        groupSessionId: String(sessionId || "default"),
        scopes: ledger.scopes || {},
        entries: (ledger.entries || []).slice(-160),
        updatedAt: ledger.updatedAt || new Date().toISOString(),
    }, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function normalizePostCompactUsageState(value) {
    const state = String(value || "").toLowerCase().trim();
    if (["used", "ignored", "verified", "mentioned"].includes(state))
        return state;
    if (state === "checked" || state === "reviewed" || state === "validated")
        return "verified";
    if (state === "skipped" || state === "unused" || state === "not_used")
        return "ignored";
    return "";
}
function usageRecommendationForStats(stats = {}) {
    const used = Number(stats.used_count || 0);
    const verified = Number(stats.verified_count || 0);
    const ignored = Number(stats.ignored_count || 0);
    const mentioned = Number(stats.mentioned_count || 0);
    if (used + verified >= ignored + mentioned + 2)
        return "promote_recall";
    if (ignored >= used + verified + 2)
        return "deprioritize_or_distill";
    if (mentioned > 0 && used + verified + ignored === 0)
        return "require_usage_receipt";
    return "neutral_verify_current_context";
}
function stableApiMicrocompactJson(value) {
    if (value === undefined)
        return "null";
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(item => stableApiMicrocompactJson(item)).join(",")}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableApiMicrocompactJson(value[key])}`).join(",")}}`;
}
function stableApiMicrocompactChecksum(value, length = 24) {
    return crypto.createHash("sha256").update(stableApiMicrocompactJson(value)).digest("hex").slice(0, length);
}
function apiMicrocompactHeaderValue(headers, name) {
    if (!headers)
        return "";
    const wanted = String(name || "").toLowerCase();
    if (typeof headers.get === "function") {
        try {
            return String(headers.get(name) || headers.get(wanted) || "");
        }
        catch { }
    }
    if (Array.isArray(headers)) {
        const match = headers.find((row) => String(row?.[0] || "").toLowerCase() === wanted);
        return String(match?.[1] || "");
    }
    if (typeof headers === "object") {
        const key = Object.keys(headers).find(item => item.toLowerCase() === wanted);
        return key ? String(headers[key] || "") : "";
    }
    return "";
}
function apiMicrocompactBetaHeadersFromHeaders(headers) {
    const raw = [
        apiMicrocompactHeaderValue(headers, "anthropic-beta"),
        apiMicrocompactHeaderValue(headers, "x-anthropic-beta"),
    ].filter(Boolean).join(",");
    return raw.split(",").map(item => item.trim()).filter(Boolean);
}
function uniqueApiMicrocompactStrings(...values) {
    const seen = new Set();
    const result = [];
    for (const value of values.flat(Infinity)) {
        const text = String(value || "").trim();
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        result.push(text);
    }
    return result;
}
function buildStableSourceFingerprint(sourceManifest = {}) {
    const entries = Array.isArray(sourceManifest.entries) ? sourceManifest.entries : [];
    const stable = entries.map((entry) => ({
        id: entry.id,
        purpose: entry.purpose,
        path: entry.path,
        exists: entry.exists === true,
        kind: entry.kind || "",
        bytes: Number(entry.bytes || 0),
        lineCount: Number(entry.lineCount || 0),
        childCount: Number(entry.childCount || 0),
    }));
    return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 24);
}
// ===== merged from group-memory-shared-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function resolvePostCompactBoundaryMarkerParts(groupId, input = {}) {
    const compaction = input.compaction || {};
    const boundary = input.compactBoundary || input.compact_boundary || compaction.boundary || {};
    const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
    const recoveryAudit = input.postCompactRecoveryAudit
        || input.post_compact_recovery_audit
        || gate.post_compact_recovery_audit
        || gate.postCompactRecoveryAudit
        || {};
    const rawBoundaryId = String(input.rawBoundaryId
        || input.raw_boundary_id
        || boundary.id
        || recoveryAudit.boundaryId
        || recoveryAudit.boundary_id
        || "");
    const summarizedThroughMessageId = String(input.lastCompactedMessageId
        || input.last_compacted_message_id
        || compaction.lastCompactedMessageId
        || compaction.last_compacted_message_id
        || boundary.summarizedThroughMessageId
        || boundary.summarized_through_message_id
        || "");
    const summaryChecksum = String(input.summaryChecksum
        || input.summary_checksum
        || compaction.summaryChecksum
        || compaction.summary_checksum
        || boundary.summaryChecksum
        || boundary.summary_checksum
        || recoveryAudit.summaryChecksum
        || recoveryAudit.summary_checksum
        || gate.summary_checksum
        || "");
    const compactedMessageCount = Number(input.compactedMessageCount
        || input.compacted_message_count
        || compaction.compactedMessageCount
        || compaction.compacted_message_count
        || boundary.summarizedMessageCount
        || boundary.summarized_message_count
        || 0);
    const hasPostCompactBoundary = !!(rawBoundaryId || summarizedThroughMessageId || summaryChecksum)
        && (compactedMessageCount > 0 || !!gate?.schema || !!compaction.postCompactReinject || !!compaction.post_compact_reinject);
    if (!hasPostCompactBoundary)
        return null;
    const boundaryId = `pcb_${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        summarizedThroughMessageId,
        summaryChecksum,
        rawBoundaryId && !summarizedThroughMessageId ? rawBoundaryId : "",
    ])).digest("hex").slice(0, 18)}`;
    return {
        boundaryId,
        rawBoundaryId,
        summarizedThroughMessageId,
        summaryChecksum,
        compactedMessageCount,
    };
}
exports.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS = Math.max(250, Number(process.env.CCM_GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS || 2500));
exports.groupMemoryAutoCompactTimers = new Map();
exports.groupMemoryAutoCompactRunning = new Set();
exports.groupMemoryAutoCompactPending = new Set();
var group_memory_auto_compact_hook_state_1 = require("./group-memory-auto-compact-hook-state");
Object.defineProperty(exports, "groupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.groupMemoryAutoCompactHookRegistered; } });
Object.defineProperty(exports, "isGroupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.isGroupMemoryAutoCompactHookRegistered; } });
Object.defineProperty(exports, "markGroupMemoryAutoCompactHookRegistered", { enumerable: true, get: function () { return group_memory_auto_compact_hook_state_1.markGroupMemoryAutoCompactHookRegistered; } });
function loadGroupMemoryCompactionConfig(overrides = {}) {
    let config = {};
    try {
        const mod = require("./group-orchestrator");
        if (typeof mod.loadOrchestratorConfig === "function")
            config = mod.loadOrchestratorConfig();
    }
    catch { }
    return { ...(config || {}), ...(overrides || {}) };
}
function isGroupModelCompactionEnabled(config) {
    return config?.memoryCompactionUseModel === true
        || ["hybrid", "model-required"].includes(String(config?.memoryCompactionMode || "").toLowerCase());
}
function buildBackgroundCompactionState(input = {}) {
    return {
        status: String(input.status || "unknown"),
        reason: String(input.reason || ""),
        messageId: String(input.messageId || ""),
        compacted: input.compacted === true,
        modelCompactionEnabled: input.modelCompactionEnabled === true,
        rebuild: input.rebuild === true,
        force: input.force === true,
        boundaryId: String(input.boundaryId || ""),
        summarizedThroughMessageId: String(input.summarizedThroughMessageId || ""),
        keepIndex: Number(input.keepIndex || 0),
        messageCount: Number(input.messageCount || 0),
        typedMemoryScopeId: String(input.typedMemoryScopeId || input.typed_memory_scope_id || ""),
        error: compactMemoryText(input.error || "", 500),
        startedAt: String(input.startedAt || ""),
        completedAt: String(input.completedAt || new Date().toISOString()),
    };
}
// Defer until the current require graph finishes so context ↔ shared cycles don't see incomplete exports.
setImmediate(() => {
    try {
        const { ensureGroupMemoryAutoCompactionHook } = require("./group-memory-context");
        if (typeof ensureGroupMemoryAutoCompactionHook !== "function") {
            console.warn("[group-memory] ensureGroupMemoryAutoCompactionHook unavailable during module init");
            return;
        }
        const result = ensureGroupMemoryAutoCompactionHook();
        if (!result || result.registered !== true) {
            console.warn("[group-memory] auto-compact hook registration returned unexpected result", result);
        }
    }
    catch (err) {
        console.warn("[group-memory] auto-compact hook registration failed:", err?.message || String(err || "unknown error"));
    }
});
exports.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH = "provider-ranking-provenance-compact-repair-receipt-memory.md";
exports.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH = "provider-ranking-memory-usage-receipt-discipline.md";
exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH = "post-compact-reinjection-repair-receipt-memory.md";
exports.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH = "post-compact-reinjection-repair-receipt-cautions.md";
exports.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH = "post-compact-receipt-memory-usage-repair-completions.md";
exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH = "post-compact-completion-memory-preservation-repair-closures.md";
exports.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
function uniqueProviderRankingCompactRepairRecallStrings(values = [], limit = 40) {
    const seen = new Set();
    const result = [];
    for (const raw of values.flatMap((value) => Array.isArray(value) ? value : [value])) {
        const value = String(raw || "").trim();
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= limit)
            break;
    }
    return result;
}
function isProviderRankingProvenanceCompactRepairReceiptRecallQuery(value) {
    const text = String(value || "").toLowerCase();
    return /provider[-_\s]?ranking|provider switch|provider-switch|provider_switch|provenance|compact repair|compact[-_\s]?repair|replayrepairdispatchbriefusage|replay repair dispatch|ranking evidence|fresh valid provider switch|供应商|提供商|排序|来源|压缩.*修复|修复.*压缩/.test(text);
}
function isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery(value, rows = []) {
    const text = String(value || "").toLowerCase();
    if (/corrected[-_\s]?receipt|receipt[-_\s]?memory[-_\s]?usage|memoryused|memoryignored|current source|recovery evidence|回执修复|记忆使用|当前源|恢复证据/.test(text)) {
        return true;
    }
    return rows.some((row) => [
        row.work_item_id,
        row.brief_id,
        row.timeline_binding_id,
        row.original_worker_context_packet_id,
        ...(Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths : []),
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && text.includes(normalized);
    }));
}
function isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery(value, rows = []) {
    const text = String(value || "").toLowerCase();
    if (/completion[-_\s]?memory|compact[-_\s]?preservation|corrected[-_\s]?(retry|outcome)|exact identity|authority boundary|压缩.*保全|保全.*修复|纠正.*结果|会话权限/.test(text)) {
        return true;
    }
    return rows.some((row) => [
        row.work_item_id,
        row.failed_retry_id,
        row.failed_outcome_id,
        row.corrected_retry_id,
        row.corrected_outcome_id,
        ...(Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths : []),
        ...(Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids : []),
        ...(Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids : []),
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && text.includes(normalized);
    }));
}
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_DOCUMENTS = 5;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_BYTES_PER_DOCUMENT = 4096;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_LINES_PER_DOCUMENT = 200;
exports.TYPED_MEMORY_DELIVERY_HARD_MAX_SESSION_BYTES = 60 * 1024;
function findMemoryArtifactBySchema(value, schema, seen = new Set()) {
    if (!value || typeof value !== "object" || seen.has(value))
        return null;
    seen.add(value);
    if (value.schema === schema)
        return value;
    for (const nested of Array.isArray(value) ? value : Object.values(value)) {
        const found = findMemoryArtifactBySchema(nested, schema, seen);
        if (found)
            return found;
    }
    return null;
}
function runnerRequestHasDurableReturnEvidence(record) {
    const runnerRequestId = String(record.runner_request_id || "");
    if (!runnerRequestId)
        return true;
    const requestFile = path.join(utils_1.CCM_DIR, "agent-runner", "requests", `${runnerRequestId}.json`);
    const resultFile = path.join(utils_1.CCM_DIR, "agent-runner", "results", `${runnerRequestId}.json`);
    if (!fs.existsSync(requestFile) || !fs.existsSync(resultFile))
        return false;
    try {
        const request = JSON.parse(fs.readFileSync(requestFile, "utf-8"));
        const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
        if (String(request.id || "") !== runnerRequestId || String(result.id || "") !== runnerRequestId)
            return false;
        if (request.schema === direct_dispatch_spool_1.DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA && (0, direct_dispatch_spool_1.validateDirectAgentDispatchPair)(request, result).valid !== true)
            return false;
        if (String(request.taskAgentSessionId || "") !== String(record.task_agent_session_id || ""))
            return false;
        if (String(request.groupId || "") !== String(record.group_id || ""))
            return false;
        const execution = record.execution_id ? (0, execution_kernel_1.loadExecution)(String(record.execution_id)) : null;
        return !execution || (execution.externalRunnerRequestIds || []).includes(runnerRequestId);
    }
    catch {
        return false;
    }
}
function tokenizeGlobalGroupMemoryQuery(value) {
    const text = String(value || "").toLowerCase();
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        tokens.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        tokens.add(chinese.slice(index, index + 2));
    return [...tokens].slice(0, 120);
}
function globalGroupMemoryCorpus(group, memory) {
    const members = (group?.members || []).map((member) => [member.project, member.agent, member.platform].filter(Boolean).join(":")).join(" ");
    const listText = (items = [], mapper = (item) => JSON.stringify(item)) => (items || []).slice(-12).map(mapper).join("\n");
    return [
        group?.id,
        group?.name,
        members,
        memory?.goal,
        memory?.currentPhase,
        memory?.summary,
        memory?.messageDigest,
        listText(memory?.persistentRequirements || [], (item) => item.text || item),
        listText(memory?.factAnchors || [], (item) => item.text || item),
        listText(memory?.decisions || [], (item) => item.decision || item),
        listText(memory?.completed || [], (item) => `${item.project || ""} ${item.summary || ""}`),
        listText(memory?.blocked || [], (item) => `${item.project || ""} ${item.reason || ""}`),
        listText(memory?.nextActions || [], (item) => item.action || item),
    ].filter(Boolean).join("\n").toLowerCase();
}
function scoreGlobalGroupMemoryCandidate(group, memory, messages, query = "") {
    const queryTokens = tokenizeGlobalGroupMemoryQuery(query);
    let score = 0;
    const corpus = globalGroupMemoryCorpus(group, memory);
    if (!queryTokens.length)
        score += 1;
    for (const token of queryTokens) {
        if (!token)
            continue;
        if (corpus.includes(token))
            score += token.length >= 5 ? 3 : 1;
    }
    if (String(group?.id || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.id).toLowerCase()))
        score += 8;
    if (String(group?.name || "").toLowerCase() && String(query || "").toLowerCase().includes(String(group.name).toLowerCase()))
        score += 8;
    if ((memory?.blocked || []).length)
        score += 2;
    if ((memory?.nextActions || []).length)
        score += 2;
    if ((memory?.persistentRequirements || []).length)
        score += 2;
    if ((memory?.completed || []).length)
        score += 1;
    if ((messages || []).length)
        score += 1;
    return score;
}
function latestGroupMessageTimestamp(messages = []) {
    for (const message of [...(messages || [])].reverse()) {
        const value = String(message?.timestamp || message?.time || message?.created_at || "");
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed))
            return value;
    }
    return "";
}
function normalizeGlobalGroupMemoryMembers(group) {
    return (group?.members || []).slice(0, 12).map((member) => ({
        project: member.project,
        agent: member.agent,
        platform: member.platform || "",
    }));
}
function importGroupProjectMemoriesForMembers(groupId, group, options = {}) {
    const rootsByProject = options.projectRoots || options.project_roots || {};
    const imports = [];
    const seen = new Set();
    for (const member of (group?.members || []).slice(0, Number(options.maxProjectMemoryImportMembers || options.max_project_memory_import_members || 6))) {
        const project = normalizeAgentMemoryProject(member?.project || "");
        if (!project || project === "coordinator" || project === "unknown")
            continue;
        const explicit = member?.projectRoot || member?.project_root || member?.workDir || member?.work_dir || rootsByProject[project];
        const root = explicit ? path.resolve(String(explicit)) : resolveGroupProjectMemoryRoot(project, {});
        if (!root || seen.has(root.toLowerCase()))
            continue;
        seen.add(root.toLowerCase());
        imports.push((0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(groupId, root, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files,
        }));
    }
    return imports;
}
function getGroupMessageMemoryWho(message) {
    if (message?.role === "user")
        return `[用户 -> ${message.target || "all"}]`;
    if (message?.role === "thinking")
        return "[系统思考]";
    return `[${message?.agent || "Agent"}]`;
}
function buildGroupMessageMemoryLine(message, max = 260) {
    const time = message?.timestamp ? String(message.timestamp).slice(0, 19).replace("T", " ") : "unknown-time";
    const id = message?.id ? `#${message.id}` : "#local";
    const who = getGroupMessageMemoryWho(message);
    const content = compactMemoryText(message?.content || message?.delivery_summary?.headline || "", max);
    const extras = [];
    if (Array.isArray(message?.assignments) && message.assignments.length) {
        extras.push(`派发:${message.assignments.slice(0, 4).map((item) => `${item.project || item.target || "unknown"}:${item.status || "pending"}`).join(",")}`);
    }
    if (message?.fileChanges?.count)
        extras.push(`文件变更:${message.fileChanges.count}`);
    if (message?.delivery_summary?.headline)
        extras.push(`交付:${compactMemoryText(message.delivery_summary.headline, 120)}`);
    return `- ${time} ${id} ${who} ${content}${extras.length ? `（${extras.join("；")}）` : ""}`;
}
function buildCompressedGroupMessageDigest(messages, limit = 30) {
    const source = (messages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    if (!source.length)
        return "";
    const omitted = Math.max(0, source.length - limit);
    const lines = source.slice(-limit).map((message) => buildGroupMessageMemoryLine(message, 220));
    if (omitted > 0)
        lines.unshift(`- 更早 ${omitted} 条旧消息已进一步折叠，仅保留在原始群聊记录中，可按 message id 回溯。`);
    return lines.join("\n");
}
function normalizeMemoryStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function normalizeWorkerLedgerItem(item = {}) {
    return {
        time: item.time || new Date().toISOString(),
        taskId: String(item.taskId || item.task_id || "").trim(),
        project: String(item.project || item.agent || "").trim(),
        status: String(item.status || "").trim(),
        receiptStatus: String(item.receiptStatus || item.receipt_status || "").trim(),
        summary: compactMemoryText(item.summary || "", 320),
        filesChanged: Array.isArray(item.filesChanged || item.files_changed) ? (item.filesChanged || item.files_changed).slice(0, 12) : [],
        verification: Array.isArray(item.verification) ? item.verification.slice(0, 12) : [],
        blockers: Array.isArray(item.blockers) ? item.blockers.slice(0, 12) : [],
        needs: Array.isArray(item.needs) ? item.needs.slice(0, 12) : [],
        memoryUsed: normalizeMemoryStringArray(item.memoryUsed || item.memory_used).slice(0, 12),
        memoryIgnored: normalizeMemoryStringArray(item.memoryIgnored || item.memory_ignored).slice(0, 12),
    };
}
function findLatestWorkerLedger(memory, project) {
    const target = String(project || "").trim();
    if (!target)
        return null;
    return [...(memory?.workerLedger || [])].reverse().find((item) => item.project === target) || null;
}
function appendWorkerLedger(memory, item) {
    const normalized = normalizeWorkerLedgerItem(item);
    if (!normalized.project && !normalized.summary)
        return memory;
    return {
        ...(memory || {}),
        workerLedger: uniqueByKey([...(memory?.workerLedger || []), normalized], (x) => [
            x.taskId || "",
            x.project || "",
            x.status || "",
            x.summary || "",
        ].join("|"), 40),
    };
}
function updateGroupMemory(groupId, patch = {}) {
    const sessionId = String(patch.groupSessionId || patch.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const memory = (0, group_memory_storage_1.loadGroupMemory)(groupId, sessionId);
    const next = { ...memory };
    if (patch.goal && !next.goal)
        next.goal = compactMemoryText(patch.goal, 500);
    if (patch.currentPhase)
        next.currentPhase = patch.currentPhase;
    if (patch.decision) {
        next.decisions = uniqueByKey([...(next.decisions || []), {
                time: new Date().toISOString(),
                decision: compactMemoryText(patch.decision, 260),
                reason: compactMemoryText(patch.reason || "", 220),
            }], (item) => `${item.decision}|${item.reason}`, 20);
    }
    if (patch.completed) {
        const item = patch.completed;
        next.completed = uniqueByKey([...(next.completed || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                summary: compactMemoryText(item.summary || "", 260),
                filesChanged: item.filesChanged || [],
                verification: item.verification || [],
            }], (x) => `${x.project}|${x.summary}`, 30);
        next.blocked = (next.blocked || []).filter((x) => x.project !== item.project);
    }
    if (patch.blocked) {
        const item = patch.blocked;
        next.blocked = uniqueByKey([...(next.blocked || []), {
                time: new Date().toISOString(),
                project: item.project || "",
                reason: compactMemoryText(item.reason || "", 260),
                needs: item.needs || [],
            }], (x) => `${x.project}|${x.reason}`, 30);
    }
    if (patch.messageDigest) {
        next.messageDigest = compactMemoryText([next.messageDigest || "", patch.messageDigest].filter(Boolean).join(" | "), 2400);
    }
    if (patch.messageCompression) {
        next.messageCompression = { ...(next.messageCompression || {}), ...(patch.messageCompression || {}) };
    }
    if (patch.workerLedger || patch.workerNotification) {
        const item = patch.workerLedger || patch.workerNotification;
        const merged = appendWorkerLedger(next, item);
        next.workerLedger = merged.workerLedger || [];
        next.agentMemories = (0, group_agent_memory_packet_1.upsertAgentMemory)(next.agentMemories || {}, item);
    }
    if (patch.openQuestion) {
        next.openQuestions = uniqueByKey([...(next.openQuestions || []), {
                time: new Date().toISOString(),
                question: compactMemoryText(patch.openQuestion, 260),
            }], (x) => x.question, 20);
    }
    if (patch.nextAction) {
        next.nextActions = uniqueByKey([...(next.nextActions || []), {
                time: new Date().toISOString(),
                action: compactMemoryText(patch.nextAction, 260),
            }], (x) => x.action, 20);
    }
    return (0, group_memory_storage_1.saveGroupMemory)(groupId, next, sessionId);
}
//# sourceMappingURL=group-memory-shared.js.map