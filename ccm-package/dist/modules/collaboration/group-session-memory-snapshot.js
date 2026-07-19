"use strict";
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.getGroupSessionMemorySnapshotFile = getGroupSessionMemorySnapshotFile;
exports.groupSessionMemorySectionTokenLimit = groupSessionMemorySectionTokenLimit;
exports.splitGroupSessionMemorySections = splitGroupSessionMemorySections;
exports.truncateGroupSessionMemorySection = truncateGroupSessionMemorySection;
exports.analyzeGroupSessionMemoryBudget = analyzeGroupSessionMemoryBudget;
exports.evaluateGroupSessionMemoryUpdateCadence = evaluateGroupSessionMemoryUpdateCadence;
exports.enforceGroupSessionMemoryBudget = enforceGroupSessionMemoryBudget;
exports.buildGroupSessionMemorySectionEvidence = buildGroupSessionMemorySectionEvidence;
exports.buildGroupSessionMemorySnapshot = buildGroupSessionMemorySnapshot;
exports.summarizeGroupSessionMemorySnapshot = summarizeGroupSessionMemorySnapshot;
exports.persistGroupSessionMemorySnapshot = persistGroupSessionMemorySnapshot;
exports.commitGroupSessionMemorySnapshot = commitGroupSessionMemorySnapshot;
exports.persistGroupSessionMemoryCadenceObservation = persistGroupSessionMemoryCadenceObservation;
exports.readGroupSessionMemorySnapshotSummary = readGroupSessionMemorySnapshotSummary;
exports.refreshGroupConversationMemorySnapshot = refreshGroupConversationMemorySnapshot;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const context_budget_1 = require("../../system/context-budget");
const group_memory_compaction_1 = require("./group-memory-compaction");
const storage_1 = require("./storage");
const group_memory_context_1 = require("./group-memory-context");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
function getGroupSessionMemorySnapshotFile(groupId) {
    return path.join((0, group_memory_storage_1.getGroupSessionMemoryDir)(groupId), "snapshot.json");
}
function groupSessionMemorySectionTokenLimit(header) {
    const normalized = String(header || "").replace(/^#+\s*/, "").trim().toLowerCase();
    if (normalized === "ccm group session memory")
        return 600;
    if (normalized === "goal")
        return 900;
    if (normalized === "session summary")
        return group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS;
    if (normalized === "persistent requirements")
        return 1_600;
    if (normalized === "fact anchors")
        return 1_400;
    if (normalized === "decisions" || normalized === "worker state")
        return 1_200;
    if (normalized === "open questions")
        return 800;
    if (normalized === "next actions")
        return 1_000;
    if (normalized === "use policy")
        return 700;
    return Math.min(800, group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS);
}
function splitGroupSessionMemorySections(markdown) {
    const sections = [];
    let current = { header: "", lines: [] };
    for (const line of String(markdown || "").split("\n")) {
        if (/^#{1,2}\s+/.test(line)) {
            if (current.header || current.lines.some(item => item.trim()))
                sections.push(current);
            current = { header: line, lines: [] };
        }
        else {
            current.lines.push(line);
        }
    }
    if (current.header || current.lines.some(item => item.trim()))
        sections.push(current);
    return sections;
}
function truncateGroupSessionMemorySection(section, maxTokens) {
    const marker = "[... section truncated for session memory budget; raw transcript remains authoritative ...]";
    const original = [section.header, ...section.lines].filter((line, index) => index > 0 || !!line).join("\n").trim();
    const tokensBefore = (0, group_memory_compaction_1.estimateGroupTextTokens)(original);
    if (tokensBefore <= maxTokens) {
        return { text: original, truncated: false, tokensBefore, tokensAfter: tokensBefore };
    }
    const kept = section.header ? [section.header] : [];
    for (const line of section.lines) {
        const candidate = [...kept, line, marker].join("\n").trim();
        if ((0, group_memory_compaction_1.estimateGroupTextTokens)(candidate) <= maxTokens) {
            kept.push(line);
            continue;
        }
        let low = 0;
        let high = line.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            const partial = [...kept, line.slice(0, middle), marker].join("\n").trim();
            if ((0, group_memory_compaction_1.estimateGroupTextTokens)(partial) <= maxTokens)
                low = middle;
            else
                high = middle - 1;
        }
        if (low > 0)
            kept.push(line.slice(0, low).trimEnd());
        break;
    }
    kept.push(marker);
    const text = kept.join("\n").trim();
    return { text, truncated: true, tokensBefore, tokensAfter: (0, group_memory_compaction_1.estimateGroupTextTokens)(text) };
}
function analyzeGroupSessionMemoryBudget(markdown) {
    const sections = splitGroupSessionMemorySections(markdown).map(section => {
        const text = [section.header, ...section.lines].filter((line, index) => index > 0 || !!line).join("\n").trim();
        const tokens = text ? (0, group_memory_compaction_1.estimateGroupTextTokens)(text) : 0;
        return {
            header: section.header || "preamble",
            tokens,
            maxTokens: group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
            overBudget: tokens > group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
        };
    });
    const totalTokens = String(markdown || "").trim() ? (0, group_memory_compaction_1.estimateGroupTextTokens)(markdown) : 0;
    const oversizedSections = sections.filter(section => section.overBudget);
    const totalUtilizationPercent = Math.round(totalTokens / group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS * 1000) / 10;
    const maxSectionUtilizationPercent = sections.length
        ? Math.round(Math.max(...sections.map(section => section.tokens / group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS)) * 1000) / 10
        : 0;
    const status = totalTokens > group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS || oversizedSections.length
        ? "over_budget"
        : totalUtilizationPercent >= 90 || maxSectionUtilizationPercent >= 90
            ? "near_budget"
            : totalTokens > 0 ? "ok" : "empty";
    return {
        schema: "ccm-group-session-memory-budget-v1",
        version: 1,
        status,
        estimator: "ccm-model-context-conservative-ascii-cjk-v1",
        ccParitySource: "Claude Code SessionMemory MAX_SECTION_LENGTH=2000 MAX_TOTAL_SESSION_MEMORY_TOKENS=12000",
        totalTokens,
        maxTotalTokens: group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS,
        totalUtilizationPercent,
        maxSectionTokens: group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS,
        maxSectionUtilizationPercent,
        sectionCount: sections.length,
        oversizedSectionCount: oversizedSections.length,
        oversizedSections,
        sections,
    };
}
function evaluateGroupSessionMemoryUpdateCadence(messages, previousSnapshot = {}, options = {}) {
    const rows = Array.isArray(messages) ? messages : [];
    const previous = previousSnapshot?.updateCadence || previousSnapshot?.update_cadence || {};
    const minimumMessageTokensToInit = Math.max(1, Number(options.minimumMessageTokensToInit || options.minimum_message_tokens_to_init || previous.minimumMessageTokensToInit || group_memory_shared_1.GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT));
    const minimumTokensBetweenUpdate = Math.max(1, Number(options.minimumTokensBetweenUpdate || options.minimum_tokens_between_update || previous.minimumTokensBetweenUpdate || group_memory_shared_1.GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES));
    const toolCallsBetweenUpdates = Math.max(1, Number(options.toolCallsBetweenUpdates || options.tool_calls_between_updates || previous.toolCallsBetweenUpdates || group_memory_shared_1.GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES));
    const currentContextTokens = Math.max(0, Number(options.currentContextTokens || options.current_context_tokens || rows.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0)));
    const initialized = previous.initialized === true || currentContextTokens >= minimumMessageTokensToInit;
    const tokensAtLastExtraction = Math.max(0, Number(previous.tokensAtLastExtraction || 0));
    const tokensSinceLastExtraction = currentContextTokens - tokensAtLastExtraction;
    const lastExtractionMessageId = String(previous.lastExtractionMessageId || previous.last_extraction_message_id || "");
    const toolCallScan = (0, group_memory_shared_1.inspectGroupSessionMemoryToolCallsSince)(rows, lastExtractionMessageId);
    const toolCallsSinceLastExtraction = toolCallScan.count;
    const lastAssistantTurnHasToolCalls = (0, group_memory_shared_1.groupSessionMemoryLastAssistantTurnHasToolCalls)(rows);
    const tokenThresholdMet = initialized && tokensSinceLastExtraction >= minimumTokensBetweenUpdate;
    const toolCallThresholdMet = toolCallsSinceLastExtraction >= toolCallsBetweenUpdates;
    const naturalBreak = !lastAssistantTurnHasToolCalls;
    const shouldExtract = tokenThresholdMet && (toolCallThresholdMet || naturalBreak);
    const lastMessageId = rows.length ? (0, group_memory_shared_1.getMemoryMessageIdentity)(rows[rows.length - 1], rows.length - 1) : "";
    const status = shouldExtract
        ? "extraction_due"
        : !initialized ? "waiting_initialization_tokens"
            : !tokenThresholdMet ? "waiting_update_tokens"
                : toolCallScan.cursorStatus === "not_found" ? "waiting_natural_break_after_cursor_miss"
                    : "waiting_tool_calls_or_natural_break";
    return {
        schema: "ccm-group-session-memory-update-cadence-v1",
        version: 1,
        ccParitySource: "Claude Code SessionMemory minimumMessageTokensToInit=10000 minimumTokensBetweenUpdate=5000 toolCallsBetweenUpdates=3",
        minimumMessageTokensToInit,
        minimumTokensBetweenUpdate,
        toolCallsBetweenUpdates,
        initialized,
        status,
        shouldExtract,
        currentContextTokens,
        tokensAtLastExtraction,
        tokensSinceLastExtraction,
        toolCallsSinceLastExtraction,
        lastAssistantTurnHasToolCalls,
        tokenThresholdMet,
        toolCallThresholdMet,
        naturalBreak,
        lastObservedMessageId: lastMessageId,
        lastExtractionMessageId,
        lastExtractionCursorStatus: toolCallScan.cursorStatus,
        lastExtractionCursorIndex: toolCallScan.cursorIndex,
        toolCallScanMessageCount: toolCallScan.scannedMessageCount,
        extractionCount: Math.max(0, Number(previous.extractionCount || 0)),
        lastExtractedAt: String(previous.lastExtractedAt || ""),
        observedAt: String(options.now || new Date().toISOString()),
    };
}
function enforceGroupSessionMemoryBudget(markdown) {
    const before = analyzeGroupSessionMemoryBudget(markdown);
    const truncatedSections = [];
    const renderedSections = splitGroupSessionMemorySections(markdown).map(section => {
        const limit = Math.min(group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS, groupSessionMemorySectionTokenLimit(section.header));
        const result = truncateGroupSessionMemorySection(section, limit);
        if (result.truncated)
            truncatedSections.push(section.header || "preamble");
        return result.text;
    });
    let bounded = renderedSections.filter(Boolean).join("\n\n").trim();
    if ((0, group_memory_compaction_1.estimateGroupTextTokens)(bounded) > group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS) {
        const whole = truncateGroupSessionMemorySection({ header: "", lines: bounded.split("\n") }, group_memory_shared_1.GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS);
        bounded = whole.text;
        truncatedSections.push("total");
    }
    return {
        markdown: bounded,
        wasTruncated: truncatedSections.length > 0,
        truncatedSections: [...new Set(truncatedSections)],
        before,
        after: analyzeGroupSessionMemoryBudget(bounded),
    };
}
function buildGroupSessionMemorySectionEvidence(markdown, source = {}) {
    const text = String(markdown || "").trim();
    const markdownChecksum = (0, group_memory_shared_1.hashSessionMemoryText)(text, 24);
    const matches = Array.from(text.matchAll(/^# ([^\r\n]+)\r?$/gm));
    const sourceTranscriptChecksum = String(source.sourceTranscriptChecksum || source.source_transcript_checksum || "").trim();
    const sourceFirstMessageId = String(source.sourceFirstMessageId || source.source_first_message_id || "").trim();
    const sourceLastMessageId = String(source.sourceLastMessageId || source.source_last_message_id || "").trim();
    const sourceMessageCount = Math.max(0, Number(source.sourceMessageCount || source.source_message_count || 0));
    const sourceMessageIds = Array.from(new Set((Array.isArray(source.sourceMessageIds || source.source_message_ids) ? (source.sourceMessageIds || source.source_message_ids) : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean))).slice(0, 240);
    const sourceType = String(source.sourceType || source.source_type || (sourceTranscriptChecksum ? "model_transcript_range" : "deterministic_memory_snapshot"));
    const sections = matches.map((match, index) => {
        const start = Number(match.index || 0);
        const end = index + 1 < matches.length ? Number(matches[index + 1].index || text.length) : text.length;
        const section = String(match[1] || "").trim();
        const sectionMarkdown = text.slice(start, end).trim();
        const sectionChecksum = (0, group_memory_shared_1.hashSessionMemoryText)(sectionMarkdown, 24);
        const evidenceSeed = [markdownChecksum, section, sectionChecksum, sourceTranscriptChecksum, sourceFirstMessageId, sourceLastMessageId].join("\0");
        return {
            evidenceId: `gsmse_${(0, group_memory_shared_1.hashSessionMemoryText)(evidenceSeed, 20)}`,
            section,
            sectionIndex: index + 1,
            sectionChecksum,
            sourceTranscriptChecksum,
            sourceFirstMessageId,
            sourceLastMessageId,
            sourceMessageCount,
            sourceMessageIds,
        };
    });
    const payload = {
        schema: "ccm-group-session-memory-section-evidence-v1",
        version: 1,
        sourceType,
        markdownChecksum,
        sourceTranscriptChecksum,
        sourceFirstMessageId,
        sourceLastMessageId,
        sourceMessageCount,
        sourceMessageIds,
        sections,
    };
    return { ...payload, checksum: (0, group_memory_shared_1.hashSessionMemoryText)(JSON.stringify(payload), 32) };
}
function buildGroupSessionMemorySnapshot(groupId, memory = {}, options = {}) {
    const markdownFile = (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(groupId);
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const modelMarkdown = String(options.sessionMemoryModelMarkdown || options.session_memory_model_markdown || options.markdown || "").trim();
    const boundedMarkdown = enforceGroupSessionMemoryBudget(modelMarkdown || (0, group_memory_shared_1.renderGroupSessionMemoryMarkdown)(groupId, memory));
    const markdown = boundedMarkdown.markdown;
    const budget = analyzeGroupSessionMemoryBudget(markdown);
    const compaction = memory.compaction || {};
    const compression = memory.messageCompression || {};
    const boundary = memory.compactBoundary || {};
    const summaryText = String(memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null) || "");
    const semanticSummary = {
        goal: String(memory.goal || ""),
        summary: String(memory.summary || ""),
        messageDigest: summaryText,
        persistentRequirements: Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : [],
        factAnchors: Array.isArray(memory.factAnchors) ? memory.factAnchors : [],
        decisions: Array.isArray(memory.decisions) ? memory.decisions : [],
        workerLedger: Array.isArray(memory.workerLedger) ? memory.workerLedger : [],
        openQuestions: Array.isArray(memory.openQuestions) ? memory.openQuestions : [],
        nextActions: Array.isArray(memory.nextActions) ? memory.nextActions : [],
    };
    const hasSummary = !!modelMarkdown || Object.values(semanticSummary).some(value => Array.isArray(value) ? value.length > 0 : !!String(value || "").trim());
    const semanticSummaryChecksum = (0, group_memory_shared_1.hashSessionMemoryText)(JSON.stringify(semanticSummary), 24);
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const cadenceInput = options.cadenceDecision || options.cadence_decision || memory?.sessionMemory?.updateCadence || {};
    const cursorAdvance = (0, group_memory_shared_1.resolveGroupSessionMemoryExtractionCursor)(cadenceInput);
    const updateCadence = cadenceInput?.schema
        ? {
            ...cadenceInput,
            ...cursorAdvance,
            status: cadenceInput.shouldExtract === true ? "extracted" : cadenceInput.status,
            shouldExtract: false,
            extractedThisObservation: cadenceInput.shouldExtract === true,
            tokensAtLastExtraction: cadenceInput.shouldExtract === true ? Number(cadenceInput.currentContextTokens || 0) : Number(cadenceInput.tokensAtLastExtraction || 0),
            lastExtractionMessageId: cursorAdvance.cursorAfter,
            extractionCount: Math.max(0, Number(cadenceInput.extractionCount || 0)) + (cadenceInput.shouldExtract === true ? 1 : 0),
            lastExtractedAt: cadenceInput.shouldExtract === true ? generatedAt : String(cadenceInput.lastExtractedAt || ""),
        }
        : null;
    const extractionInput = options.extractionTransaction || options.extraction_transaction || null;
    const extractionTransaction = extractionInput?.schema
        ? {
            ...extractionInput,
            status: "completed",
            committedAt: generatedAt,
        }
        : memory?.sessionMemory?.extractionTransaction || null;
    const modelExtractionReceipt = options.modelExtractionReceipt || options.model_extraction_receipt || null;
    const modelMergeQuality = options.modelMergeQuality || options.model_merge_quality || modelExtractionReceipt?.mergeQuality || null;
    const factSupersessionGraph = options.factSupersessionGraph
        || options.fact_supersession_graph
        || modelExtractionReceipt?.factSupersessionGraph
        || modelMergeQuality?.factSupersessionGraph
        || null;
    const extractionMethod = modelMarkdown ? "forked_model_session_memory" : "deterministic_structured_fallback";
    const postCompactSessionStateReset = compaction.postCompactSessionStateReset
        || compression.postCompactSessionStateReset
        || boundary.postCompactSessionStateReset
        || boundary.post_compact_restore?.postCompactSessionStateReset
        || null;
    const postCompactSessionStateResetVerification = postCompactSessionStateReset?.schema
        ? (0, group_memory_compaction_1.verifyGroupPostCompactSessionStateResetReceipt)(postCompactSessionStateReset, {
            groupId: memory.groupId,
            groupSessionId: memory.groupSessionId,
            boundaryId: boundary.id,
            summaryChecksum: compaction.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || "",
        })
        : null;
    const extractionCursor = postCompactSessionStateResetVerification?.valid === true
        ? String(postCompactSessionStateReset.session_memory_extraction_cursor?.message_id || "")
        : String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || "");
    const sectionEvidence = options.sectionEvidence || options.section_evidence || buildGroupSessionMemorySectionEvidence(markdown, {
        sourceType: modelMarkdown ? "model_transcript_range" : "deterministic_memory_snapshot",
        sourceTranscriptChecksum: modelExtractionReceipt?.requestAudit?.sourceTranscriptChecksum || semanticSummaryChecksum,
        sourceFirstMessageId: modelExtractionReceipt?.requestAudit?.sourceFirstMessageId || "",
        sourceLastMessageId: modelExtractionReceipt?.requestAudit?.sourceLastMessageId || String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""),
        sourceMessageCount: modelExtractionReceipt?.requestAudit?.sourceMessageCount || 0,
        sourceMessageIds: modelExtractionReceipt?.requestAudit?.sourceMessageIds || [],
    });
    return {
        schema: "ccm-group-session-memory-snapshot-v1",
        version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
        groupId,
        generatedAt,
        reason: String(options.reason || "save_group_memory"),
        strategy: modelMarkdown ? "cc-session-memory-forked-model-v1" : String(compression.strategy || compaction.modelMode || "cc-session-memory-v3-sync"),
        extractionMethod,
        modelExtracted: !!modelMarkdown,
        deterministicFallback: !modelMarkdown,
        modelExtractionReceipt,
        modelMergeQuality,
        factSupersessionGraph,
        sectionEvidence,
        budgetEnforcement: {
            wasTruncated: boundedMarkdown.wasTruncated,
            truncatedSections: boundedMarkdown.truncatedSections,
            before: boundedMarkdown.before,
            after: boundedMarkdown.after,
        },
        summaryFile: markdownFile,
        snapshotFile,
        lastSummarizedMessageId: extractionCursor,
        durableBoundaryMessageId: String(compaction.lastCompactedMessageId || boundary.summarizedThroughMessageId || ""),
        providerActiveLastSummarizedMessageId: postCompactSessionStateResetVerification?.valid === true ? "" : extractionCursor,
        providerActiveCursorStatus: postCompactSessionStateResetVerification?.valid === true ? "cleared_after_compact" : "legacy_shared_cursor",
        extractionCursorGeneration: Math.max(0, Number(postCompactSessionStateReset?.session_memory_extraction_cursor?.generation || 0)),
        postCompactSessionStateReset,
        postCompactSessionStateResetValid: postCompactSessionStateResetVerification?.valid === true,
        postCompactSessionStateResetIssues: postCompactSessionStateResetVerification?.issues || [],
        summaryChecksum: String(compaction.summaryChecksum || boundary.summaryChecksum || semanticSummaryChecksum),
        markdownChecksum: (0, group_memory_shared_1.hashSessionMemoryText)(markdown, 24),
        markdownChars: markdown.length,
        markdownTokens: budget.totalTokens,
        memoryBudget: budget,
        updateCadence,
        extractionTransaction,
        hasSummary,
        compactedMessageCount: Number(compaction.compactedMessageCount || compression.compressedMessages || 0),
        preservedRecentMessages: Number(compaction.preservedRecentMessages || compression.recentMessages || 0),
        preCompactTokenCount: Number(compaction.preCompactTokenCount || compression.preCompactTokenCount || 0),
        postCompactTokenCount: Number(compaction.postCompactTokenCount || compression.postCompactTokenCount || 0),
        health: String(compaction.health || ""),
        contextPressureWarning: compaction.contextPressureWarning || compression.contextPressureWarning || null,
        markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(markdown, 1200),
        markdown,
    };
}
function summarizeGroupSessionMemorySnapshot(snapshot = {}) {
    if (!snapshot?.schema)
        return null;
    const { markdown, ...rest } = snapshot;
    return {
        ...rest,
        markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(snapshot.markdownExcerpt || markdown || "", 1200),
    };
}
function persistGroupSessionMemorySnapshot(groupId, memory = {}, options = {}) {
    const snapshot = buildGroupSessionMemorySnapshot(groupId, memory, options);
    return commitGroupSessionMemorySnapshot(snapshot);
}
function commitGroupSessionMemorySnapshot(snapshot = {}) {
    if (!snapshot?.schema || !snapshot?.summaryFile || !snapshot?.snapshotFile) {
        throw new Error("invalid_group_session_memory_snapshot_commit");
    }
    (0, group_memory_shared_1.writeTextAtomic)(snapshot.summaryFile, snapshot.markdown);
    (0, group_memory_shared_1.writeJsonAtomic)(snapshot.snapshotFile, summarizeGroupSessionMemorySnapshot(snapshot));
    return summarizeGroupSessionMemorySnapshot(snapshot);
}
function persistGroupSessionMemoryCadenceObservation(groupId, cadenceDecision = {}) {
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const summaryFile = (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(groupId);
    let previous = null;
    try {
        if (fs.existsSync(snapshotFile))
            previous = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
    }
    catch { }
    const next = {
        ...(previous?.schema === "ccm-group-session-memory-snapshot-v1" ? previous : {
            schema: "ccm-group-session-memory-snapshot-v1",
            version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            generatedAt: "",
            hasSummary: false,
            markdownChars: 0,
            markdownTokens: 0,
        }),
        version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
        snapshotFile,
        summaryFile,
        updateCadence: { ...cadenceDecision, shouldExtract: false },
        cadenceUpdatedAt: String(cadenceDecision.observedAt || new Date().toISOString()),
    };
    (0, group_memory_shared_1.writeJsonAtomic)(snapshotFile, next);
    return summarizeGroupSessionMemorySnapshot(next);
}
function readGroupSessionMemorySnapshotSummary(groupId) {
    const snapshotFile = getGroupSessionMemorySnapshotFile(groupId);
    const summaryFile = (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
        const markdown = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : "";
        const memoryBudget = analyzeGroupSessionMemoryBudget(markdown);
        return {
            ...parsed,
            schema: "ccm-group-session-memory-snapshot-v1",
            version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: markdown ? (0, group_memory_shared_1.hashSessionMemoryText)(markdown, 24) === parsed.markdownChecksum : false,
            markdownChars: markdown.length,
            markdownTokens: memoryBudget.totalTokens,
            memoryBudget,
            markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    catch {
        let markdown = "";
        try {
            if (fs.existsSync(summaryFile))
                markdown = fs.readFileSync(summaryFile, "utf-8");
        }
        catch { }
        const memoryBudget = analyzeGroupSessionMemoryBudget(markdown);
        return {
            schema: "ccm-group-session-memory-snapshot-v1",
            version: group_memory_shared_1.GROUP_SESSION_MEMORY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: false,
            markdownChars: markdown.length,
            markdownTokens: memoryBudget.totalTokens,
            memoryBudget,
            hasSummary: false,
            generatedAt: "",
        };
    }
}
function refreshGroupConversationMemorySnapshot(groupId, allMessages, memory, options = {}) {
    const groupSessionId = String(options.groupSessionId || options.group_session_id || memory?.groupSessionId || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const sessionMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || memory?.messageCompression?.recentLimit || 12));
    const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || memory?.messageCompression?.olderLimit || 30));
    const messages = (allMessages || []).filter((message) => !String(message?.content || "").startsWith("📤"));
    const minKeepMessages = Math.max(group_memory_compaction_1.GROUP_COMPACT_MIN_KEEP_MESSAGES, Number(options.minKeepMessages || options.min_keep_messages || recentLimit));
    const minKeepTokens = Math.max(1, Number(options.minKeepTokens || options.min_keep_tokens || group_memory_compaction_1.GROUP_COMPACT_MIN_KEEP_TOKENS));
    const maxKeepTokens = Math.max(minKeepTokens, Number(options.maxKeepTokens || options.max_keep_tokens || group_memory_compaction_1.GROUP_COMPACT_MAX_KEEP_TOKENS));
    const keepIndex = (0, group_memory_compaction_1.calculateGroupMessagesToKeepIndex)(messages, {
        floorIndex: 0,
        minMessages: minKeepMessages,
        minTokens: minKeepTokens,
        maxTokens: maxKeepTokens,
    });
    const messagesToSummarize = messages.slice(0, keepIndex);
    const keptMessages = messages.slice(keepIndex);
    const activeTokenEstimate = messages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const sessionMemoryCadenceDecision = evaluateGroupSessionMemoryUpdateCadence(messages, readGroupSessionMemorySnapshotSummary(sessionMemoryScopeId) || memory?.sessionMemory || {}, { ...options, currentContextTokens: activeTokenEstimate });
    const currentPressureWarning = (0, group_memory_compaction_1.calculateGroupCompactWarningState)({
        activeTokens: activeTokenEstimate,
        activeMessageCount: messages.length,
        config: options.config || options,
    });
    const anchors = (0, group_memory_shared_1.extractGroupFactAnchors)(messagesToSummarize);
    const persistentRequirements = (0, group_memory_shared_1.mergeFactAnchorList)(memory?.persistentRequirements || [], (0, group_memory_shared_1.extractPersistentRequirementsFromAnchors)(anchors), 160);
    const modelSummaryRequired = options.modelSummaryRequired === true
        || String(options.config?.memoryCompactionMode || options.config?.memory_compaction_mode || "").toLowerCase() === "model-required";
    if (!messagesToSummarize.length || modelSummaryRequired) {
        const now = new Date().toISOString();
        const hasCommittedCompactBoundary = !!memory?.compactBoundary?.id;
        const compactStrategyDecision = (0, group_memory_compaction_1.buildGroupCompactStrategyDecision)({
            groupId,
            messages,
            messagesToCompact: [],
            keptMessages: messages,
            keepIndex,
            compacted: false,
            primaryCompact: false,
            preCompactWarning: currentPressureWarning,
            activeTokens: activeTokenEstimate,
            activeMessageCount: messages.length,
            preCompactTokenCount: activeTokenEstimate,
            postCompactTokenCount: activeTokenEstimate,
            transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
            reason: modelSummaryRequired
                ? "model summary required; local sync compaction disabled"
                : "recent window only; no sync snapshot compaction needed",
            now,
        });
        const apiMicroCompactEditPlan = (0, group_memory_compaction_1.buildGroupApiMicroCompactEditPlan)(messages, {
            groupId,
            activeTokens: activeTokenEstimate,
            targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
            maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
            now,
        });
        return (0, group_memory_storage_1.saveGroupMemory)(groupId, {
            ...memory,
            conversationSummary: hasCommittedCompactBoundary ? (memory?.conversationSummary || null) : null,
            messageDigest: hasCommittedCompactBoundary ? String(memory?.messageDigest || "") : "",
            compactBoundary: hasCommittedCompactBoundary ? memory.compactBoundary : null,
            compaction: {
                ...(memory?.compaction || {}),
                version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
                enabled: true,
                health: hasCommittedCompactBoundary
                    ? String(memory?.compaction?.health || "healthy")
                    : messages.length ? "recent-window-only" : "empty",
                compactedMessageCount: hasCommittedCompactBoundary
                    ? Number(memory?.compaction?.compactedMessageCount || memory?.compactBoundary?.summarizedMessageCount || 0)
                    : 0,
                totalMessagesSeen: messages.length,
                preservedRecentMessages: messages.length,
                lastCompactedMessageId: hasCommittedCompactBoundary
                    ? String(memory?.compaction?.lastCompactedMessageId || memory?.compactBoundary?.summarizedThroughMessageId || "")
                    : "",
                contextPressureWarning: currentPressureWarning,
                compactWarning: currentPressureWarning,
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                lastPressureSampleAt: now,
            },
            factAnchors: (0, group_memory_shared_1.mergeFactAnchorList)(memory?.factAnchors || [], (0, group_memory_shared_1.extractGroupFactAnchors)(messages), 300),
            persistentRequirements,
            messageCompression: {
                ...(memory?.messageCompression || {}),
                enabled: true,
                strategy: "cc-session-memory-v3-sync",
                configuredRecentLimit: recentLimit,
                recentLimit: messages.length,
                olderLimit,
                totalMessages: messages.length,
                compressedMessages: hasCommittedCompactBoundary
                    ? Number(memory?.messageCompression?.compressedMessages || memory?.compaction?.compactedMessageCount || memory?.compactBoundary?.summarizedMessageCount || 0)
                    : 0,
                recentMessages: messages.length,
                contextPressureWarning: currentPressureWarning,
                compactStrategyDecision,
                apiMicroCompactEditPlan,
                lastCompressedAt: now,
            },
        }, groupSessionId, { sessionMemoryCadenceDecision });
    }
    const conversationSummary = (0, group_memory_compaction_1.buildDeterministicConversationSummary)(messagesToSummarize, memory, memory?.conversationSummary || {});
    const now = new Date().toISOString();
    const currentTasks = (0, db_1.loadTasks)();
    const postCompactTaskStatusProjection = (0, group_memory_compaction_1.buildGroupPostCompactTaskStatusProjection)(currentTasks, {
        groupId,
        groupSessionId,
        taskStatusBudget: options.postCompactReinject?.taskStatusBudget || options.postCompactReinject?.task_status_budget,
        completedMaxAgeMs: options.postCompactReinject?.completedMaxAgeMs || options.postCompactReinject?.completed_max_age_ms,
        now,
    });
    const microCompact = (0, group_memory_compaction_1.buildGroupMicroCompactPlan)(messagesToSummarize);
    const postCompactReinject = (0, group_memory_compaction_1.buildPostCompactReinjectionPlan)(messagesToSummarize, microCompact, {
        groupId,
        groupSessionId,
        sessionMessages: messages,
        preservedMessages: keptMessages,
        taskStatuses: postCompactTaskStatusProjection.tasks,
        tasks: currentTasks,
        currentTaskId: options.currentTaskId || options.current_task_id,
        dynamicContextCatalog: (0, group_memory_context_1.buildGroupPostCompactDynamicContextCatalog)(groupId, memory, options),
        dynamicContextScanMode: "full",
        now,
    });
    const preCompactTokenCount = messages.reduce((sum, message) => sum + (0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 0);
    const postCompactTokenCount = (0, group_memory_compaction_1.estimateGroupTextTokens)(JSON.stringify(conversationSummary))
        + keptMessages.reduce((sum, message) => sum + Math.min((0, group_memory_compaction_1.estimateGroupMessageTokens)(message), 2500), 0);
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(conversationSummary)).digest("hex").slice(0, 24);
    const postCompactWarning = (0, group_memory_compaction_1.calculateGroupCompactWarningState)({
        activeTokens: postCompactTokenCount,
        activeMessageCount: keptMessages.length,
        config: options.config || options,
        suppressed: true,
        suppressReason: "post_sync_compaction_until_next_group_memory_pressure_sample",
        now,
    });
    const baseContextBudget = (0, context_budget_1.buildContextBudget)({
        context: {
            conversationSummary,
            microCompact: {
                compactedMessageCount: microCompact.compactedMessageCount,
                tokensFreed: microCompact.tokensFreed,
                records: (microCompact.records || []).slice(-12),
            },
            postCompactReinject,
            keptRecent: keptMessages.map((message) => (0, group_memory_shared_1.getMemoryMessageContent)(message)),
        },
        maxChars: 48_000,
        maxTokens: 90_000,
    });
    const previousPtlEmergency = memory?.compaction?.ptlEmergency
        || memory?.compactBoundary?.ptlEmergency
        || memory?.messageCompression?.ptlEmergency
        || null;
    const ptlRecovery = (0, group_memory_compaction_1.buildGroupPtlRecoveryPlan)({
        previousPtlEmergency,
        currentPtlEmergency: null,
        contextBudget: baseContextBudget,
        triggerTokens: previousPtlEmergency?.triggerTokens || baseContextBudget.max_tokens,
        postCompactTokenCount,
        restoredMessageDigestMaxChars: 14_000,
        summaryChecksum,
        transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
        config: options.config || options,
        now,
    });
    const activePtlEmergency = ptlRecovery ? null : previousPtlEmergency;
    const messageDigest = (0, group_memory_compaction_1.renderConversationSummary)(conversationSummary, activePtlEmergency?.messageDigestMaxChars || 14_000);
    const effectiveContextBudget = ptlRecovery
        ? {
            ...baseContextBudget,
            ptl_recovery: {
                schema: ptlRecovery.schema,
                reason: ptlRecovery.reason,
                restoredMessageDigestMaxChars: ptlRecovery.restoredMessageDigestMaxChars,
                contextBudgetPressure: ptlRecovery.contextBudgetPressure,
            },
        }
        : activePtlEmergency
            ? {
                ...baseContextBudget,
                ptl_emergency: {
                    schema: activePtlEmergency.schema,
                    emergencyLevel: activePtlEmergency.emergencyLevel,
                    reason: activePtlEmergency.reason,
                    messageDigestMaxChars: activePtlEmergency.messageDigestMaxChars,
                },
            }
            : baseContextBudget;
    const boundaryThrough = messagesToSummarize[messagesToSummarize.length - 1];
    const preservedSegment = (0, group_memory_compaction_1.buildGroupPreservedSegment)(messages, keepIndex, {
        groupId,
        floorIndex: 0,
        minMessages: minKeepMessages,
        minTokens: minKeepTokens,
        maxTokens: maxKeepTokens,
        summaryChecksum,
        transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
        now,
    });
    const compactStrategyDecision = (0, group_memory_compaction_1.buildGroupCompactStrategyDecision)({
        groupId,
        messages,
        messagesToCompact: messagesToSummarize,
        keptMessages,
        keepIndex,
        compacted: true,
        primaryCompact: true,
        microCompact,
        ptlRecovery,
        preservedSegment,
        preCompactWarning: currentPressureWarning,
        activeTokens: activeTokenEstimate,
        activeMessageCount: messages.length,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
        reason: "sync snapshot compact selected session-memory style summary plus recent window",
        now,
    });
    const apiMicroCompactEditPlan = (0, group_memory_compaction_1.buildGroupApiMicroCompactEditPlan)(messages, {
        groupId,
        activeTokens: preCompactTokenCount,
        targetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
        maxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens,
        now,
    });
    let boundary = {
        id: `compact-sync-${Date.now().toString(36)}`,
        type: "sync-context",
        summarizedFromMessageId: (0, group_memory_shared_1.getMemoryMessageIdentity)(messagesToSummarize[0], 0),
        summarizedThroughMessageId: (0, group_memory_shared_1.getMemoryMessageIdentity)(boundaryThrough, keepIndex - 1),
        summarizedMessageCount: messagesToSummarize.length,
        preservedMessageIds: keptMessages.slice(-40).map((message, index) => (0, group_memory_shared_1.getMemoryMessageIdentity)(message, keepIndex + index)),
        preservedSegment,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        post_compact_restore: {
            strategy: "conversation_summary_recent_reinject",
            preservedMessageIds: keptMessages.slice(-20).map((message, index) => (0, group_memory_shared_1.getMemoryMessageIdentity)(message, keepIndex + index)),
            preservedSegment,
            strategyDecision: compactStrategyDecision,
            apiMicroCompactEditPlan,
            transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
            microCompact,
            reinjectionPlan: postCompactReinject,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            ptlRecovery,
            recoveryAudit: null,
            cleanupAudit: null,
        },
        context_budget: effectiveContextBudget,
        summarySource: "deterministic-sync",
        createdAt: now,
    };
    const previousBoundary = memory?.compactBoundary || null;
    const previousSegment = previousBoundary?.preservedSegment || previousBoundary?.post_compact_restore?.preservedSegment || null;
    if (previousBoundary?.id
        && String(previousBoundary.summarizedThroughMessageId || "") === String(boundary.summarizedThroughMessageId || "")
        && String(memory?.compaction?.summaryChecksum || previousBoundary?.summaryChecksum || previousSegment?.summaryChecksum || "") === summaryChecksum
        && previousSegment?.schema === "ccm-group-preserved-segment-v1") {
        boundary = {
            ...boundary,
            id: previousBoundary.id,
            createdAt: previousBoundary.createdAt || boundary.createdAt,
            refreshedAt: now,
            preservedMessageIds: previousBoundary.preservedMessageIds || boundary.preservedMessageIds,
            preservedSegment: previousSegment,
            post_compact_restore: {
                ...(boundary.post_compact_restore || {}),
                preservedMessageIds: previousBoundary?.post_compact_restore?.preservedMessageIds || boundary.post_compact_restore?.preservedMessageIds,
                preservedSegment: previousSegment,
            },
        };
    }
    const postCompactRecoveryAudit = (0, group_memory_compaction_1.buildGroupPostCompactRecoveryAudit)({
        groupId,
        messages,
        boundary,
        keepIndex,
        conversationSummary,
        messageDigest,
        summaryChecksum,
        transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
        preservedSegment,
        postCompactReinject,
        microCompact,
        contextPressureWarning: postCompactWarning,
        contextBudget: effectiveContextBudget,
        ptlRecovery,
        now,
    });
    boundary.post_compact_restore.recoveryAudit = postCompactRecoveryAudit;
    const postCompactCleanupAudit = (0, group_memory_compaction_1.buildGroupPostCompactCleanupAudit)({
        groupId,
        groupSessionId,
        boundary,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        microCompact,
        postCompactReinject,
        postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
        preservedSegment,
        transcriptPath: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
        summaryChecksum,
        now,
    });
    boundary.post_compact_restore.cleanupAudit = postCompactCleanupAudit;
    const compaction = {
        ...(memory?.compaction || {}),
        version: group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
        enabled: true,
        lastCompactedMessageId: boundary.summarizedThroughMessageId,
        lastCompactedAt: now,
        compactedMessageCount: messagesToSummarize.length,
        totalMessagesSeen: messages.length,
        preservedRecentMessages: keptMessages.length,
        preCompactTokenCount,
        postCompactTokenCount,
        summaryChecksum,
        summarySource: "deterministic-sync",
        modelMode: "session-memory-first",
        deterministicFactsPreserved: true,
        health: ptlRecovery
            ? "healthy"
            : activePtlEmergency?.engaged
                ? "ptl_emergency"
                : postCompactTokenCount < preCompactTokenCount ? "healthy" : "watch",
        context_budget: boundary.context_budget,
        microCompact,
        postCompactReinject,
        postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
        ptlEmergency: activePtlEmergency,
        ptlRecovery,
        preservedSegment,
        compactStrategyDecision,
        apiMicroCompactEditPlan,
        postCompactRecoveryAudit,
        postCompactCleanupAudit,
        contextPressureWarning: postCompactWarning,
        compactWarning: postCompactWarning,
        preCompactWarning: currentPressureWarning,
        lastPressureSampleAt: now,
        boundaries: [...(Array.isArray(memory?.compaction?.boundaries) ? memory.compaction.boundaries : []), boundary].slice(-8),
    };
    return (0, group_memory_storage_1.saveGroupMemory)(groupId, {
        ...memory,
        conversationSummary,
        messageDigest,
        compactBoundary: boundary,
        compaction,
        factAnchors: (0, group_memory_shared_1.mergeFactAnchorList)(memory?.factAnchors || [], anchors, 300),
        persistentRequirements,
        messageCompression: {
            enabled: true,
            strategy: "cc-session-memory-v3-sync",
            configuredRecentLimit: recentLimit,
            recentLimit: keptMessages.length,
            olderLimit,
            totalMessages: messages.length,
            compressedMessages: messagesToSummarize.length,
            recentMessages: keptMessages.length,
            preCompactTokenCount,
            postCompactTokenCount,
            microCompactTokensFreed: microCompact.tokensFreed,
            ptlEmergency: activePtlEmergency,
            ptlRecovery,
            preservedSegment,
            compactStrategyDecision,
            apiMicroCompactEditPlan,
            postCompactRecoveryAudit,
            postCompactCleanupAudit,
            postCompactTaskStatusProjection: postCompactTaskStatusProjection.receipt,
            contextPressureWarning: postCompactWarning,
            lastCompressedAt: now,
        },
    }, groupSessionId, { sessionMemoryCadenceDecision });
}
//# sourceMappingURL=group-session-memory-snapshot.js.map