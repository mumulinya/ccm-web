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
exports.GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES = void 0;
exports.buildGroupSessionMemoryCompactSelectionReceipt = buildGroupSessionMemoryCompactSelectionReceipt;
exports.verifyGroupSessionMemoryCompactSelectionReceipt = verifyGroupSessionMemoryCompactSelectionReceipt;
exports.selectGroupSessionMemoryForCompact = selectGroupSessionMemoryForCompact;
exports.buildGroupPreservedSegment = buildGroupPreservedSegment;
exports.messageContentBlocks = messageContentBlocks;
exports.collectWindowBlockRefs = collectWindowBlockRefs;
exports.collectApiMicroCompactSignals = collectApiMicroCompactSignals;
exports.normalizedToolName = normalizedToolName;
exports.timeBasedToolResultReceiptChecksum = timeBasedToolResultReceiptChecksum;
exports.verifyGroupTimeBasedToolResultProjectionReceipt = verifyGroupTimeBasedToolResultProjectionReceipt;
exports.clearProjectedToolResultValue = clearProjectedToolResultValue;
exports.buildGroupTimeBasedToolResultProjection = buildGroupTimeBasedToolResultProjection;
exports.timeBasedThinkingReceiptChecksum = timeBasedThinkingReceiptChecksum;
exports.verifyGroupTimeBasedThinkingProjectionReceipt = verifyGroupTimeBasedThinkingProjectionReceipt;
exports.hasModelVisibleThinking = hasModelVisibleThinking;
exports.clearProjectedThinkingValue = clearProjectedThinkingValue;
exports.buildGroupTimeBasedThinkingProjection = buildGroupTimeBasedThinkingProjection;
exports.buildGroupApiMicroCompactEditPlan = buildGroupApiMicroCompactEditPlan;
exports.buildGroupApiMicrocompactNativeApplyPlan = buildGroupApiMicrocompactNativeApplyPlan;
exports.verifyGroupApiMicrocompactNativeApplyPlan = verifyGroupApiMicrocompactNativeApplyPlan;
exports.createEmptyConversationSummary = createEmptyConversationSummary;
exports.extractFiles = extractFiles;
exports.extractRuntimeSkillFacts = extractRuntimeSkillFacts;
exports.extractVerificationFacts = extractVerificationFacts;
exports.extractMessageStatus = extractMessageStatus;
// Behavior-freeze split from group-compaction-projections.ts (part 2/4).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const group_session_memory_extraction_1 = require("./group-session-memory-extraction");
const group_session_memory_customization_1 = require("./group-session-memory-customization");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_projections_part_01_1 = require("./group-compaction-projections-part-01");
const group_compaction_projections_part_03_1 = require("./group-compaction-projections-part-03");
const group_compaction_projections_part_04_1 = require("./group-compaction-projections-part-04");
function buildGroupSessionMemoryCompactSelectionReceipt(input = {}) {
    const selected = input.selected === true;
    const payload = {
        schema: "ccm-group-session-memory-compact-selection-v1",
        version: group_compaction_receipts_1.GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION,
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
    return { ...payload, selection_checksum: (0, group_compaction_projections_part_01_1.groupSessionMemoryCompactSelectionChecksum)(payload) };
}
function verifyGroupSessionMemoryCompactSelectionReceipt(receipt, expected = {}) {
    const issues = [];
    const version = Number(receipt?.version || 0);
    if (receipt?.schema !== "ccm-group-session-memory-compact-selection-v1"
        || ![1, group_compaction_receipts_1.GROUP_SESSION_MEMORY_COMPACT_SELECTION_VERSION].includes(version))
        issues.push("session_memory_selection_schema_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("session_memory_selection_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("session_memory_selection_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`)
        issues.push("session_memory_selection_scope_invalid");
    if (!['selected', 'fallback'].includes(String(receipt?.status || "")))
        issues.push("session_memory_selection_status_invalid");
    if (receipt?.selected === true && String(receipt?.status || "") !== "selected")
        issues.push("session_memory_selection_selected_status_invalid");
    if (receipt?.selected === true && (!receipt?.markdown_checksum_matches
        || !["resolved", "resumed_without_cursor"].includes(String(receipt?.cursor_status || ""))))
        issues.push("session_memory_selection_unverified_source");
    if (receipt?.selected === true && version >= 2) {
        if (receipt?.template_empty_checked !== true || receipt?.template_only === true)
            issues.push("session_memory_selection_template_empty_state_invalid");
        if (String(receipt?.template_scope_id || "") !== String(receipt?.scope_id || ""))
            issues.push("session_memory_selection_template_scope_invalid");
        if (!["default", "global", "exact_session"].includes(String(receipt?.template_source || "")))
            issues.push("session_memory_selection_template_source_invalid");
        if (!String(receipt?.template_checksum || "") || Number(receipt?.template_section_count || 0) < 1)
            issues.push("session_memory_selection_template_contract_missing");
    }
    if (version >= 2 && String(receipt?.fallback_reason || "") === "session_memory_empty_template"
        && (receipt?.template_empty_checked !== true || receipt?.template_only !== true))
        issues.push("session_memory_selection_empty_template_evidence_invalid");
    if (receipt?.selected === true && receipt?.cursor_status === "resumed_without_cursor") {
        if (receipt?.resumed_without_cursor !== true
            || String(receipt?.cursor_mode || "") !== "resumed_session_tail"
            || String(receipt?.last_summarized_message_id || "")
            || !String(receipt?.resume_seed_message_id || ""))
            issues.push("session_memory_selection_resumed_cursor_contract_invalid");
    }
    if (receipt?.selected === true && receipt?.cursor_status === "resolved"
        && receipt?.cursor_mode && receipt?.cursor_mode !== "snapshot_cursor")
        issues.push("session_memory_selection_cursor_mode_invalid");
    if (receipt?.selected === true && !(0, group_compaction_projections_part_01_1.verifyGroupSessionMemoryApiInvariantClosure)(receipt?.api_invariant_closure).valid)
        issues.push("session_memory_selection_api_invariant_closure_invalid");
    if (receipt?.selected === true && receipt?.compact_projection?.schema
        && !(0, group_compaction_projections_part_01_1.verifyGroupSessionMemoryCompactProjection)(receipt?.compact_projection, {
            groupId: receipt?.group_id,
            groupSessionId: receipt?.group_session_id,
            summaryFile: receipt?.summary_file,
            originalMarkdownChecksum: receipt?.actual_markdown_checksum,
        }).valid)
        issues.push("session_memory_selection_compact_projection_invalid");
    if (receipt?.selected === true && receipt?.compaction_api_called !== false)
        issues.push("session_memory_selection_api_call_invalid");
    if (receipt?.body_free !== true)
        issues.push("session_memory_selection_body_free_missing");
    if (String(receipt?.selection_checksum || "") !== (0, group_compaction_projections_part_01_1.groupSessionMemoryCompactSelectionChecksum)(receipt))
        issues.push("session_memory_selection_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("session_memory_selection_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("session_memory_selection_session_mismatch");
    return { valid: issues.length === 0, issues };
}
async function selectGroupSessionMemoryForCompact(input = {}) {
    const groupId = String(input.groupId || "").trim();
    const groupSessionId = String(input.groupSessionId || "").trim();
    const scopeId = `${groupId}--${groupSessionId}`;
    const cleanScope = scopeId.replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    const expectedDir = path.join(utils_1.CCM_DIR, "group-session-memory", cleanScope);
    const snapshotFile = path.join(expectedDir, "snapshot.json");
    const summaryFile = path.join(expectedDir, "summary.md");
    const config = input.config || {};
    const customInstructions = String(config.compactInstructions || config.compact_instructions
        || config.customCompactInstructions || config.custom_compact_instructions
        || "").trim();
    const base = {
        groupId,
        groupSessionId,
        scopeId,
        snapshotFile,
        summaryFile,
        customInstructionsPresent: !!customInstructions,
        autoCompactThreshold: input.triggerTokens,
        createdAt: input.now,
    };
    const fallback = (reason, extra = {}) => ({
        selected: false,
        markdown: "",
        keepIndex: Number(input.defaultKeepIndex || 0),
        receipt: buildGroupSessionMemoryCompactSelectionReceipt({ ...base, ...extra, fallbackReason: reason }),
    });
    if (config.sessionMemoryCompactEnabled === false || config.session_memory_compact_enabled === false)
        return fallback("disabled_by_configuration");
    if (input.primaryPartialCompact === true)
        return fallback("partial_compact_requested");
    if (customInstructions)
        return fallback("custom_instructions_present");
    const wait = await (0, group_session_memory_extraction_1.waitForGroupSessionMemoryExtraction)(scopeId, {
        timeoutMs: Number(config.sessionMemoryCompactWaitTimeoutMs || config.session_memory_compact_wait_timeout_ms || 15_000),
        pollMs: Number(config.sessionMemoryCompactPollMs || config.session_memory_compact_poll_ms || 100),
    });
    const extraction = (0, group_session_memory_extraction_1.readGroupSessionMemoryExtractionState)(scopeId);
    const waitFields = {
        extractionStatus: extraction.status || "unknown",
        extractionWaitCompleted: wait.completed === true,
        extractionWaitTimedOut: wait.timedOut === true,
    };
    if (wait.timedOut)
        return fallback("extraction_wait_timeout", waitFields);
    if (wait.status?.present && wait.status?.valid !== true)
        return fallback("extraction_lease_invalid", waitFields);
    let snapshot = null;
    let markdown = "";
    try {
        snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
    }
    catch { }
    try {
        markdown = fs.readFileSync(summaryFile, "utf-8").trim();
    }
    catch { }
    const templateState = (0, group_session_memory_customization_1.inspectGroupSessionMemoryTemplateState)(scopeId, markdown);
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
    if (!snapshot)
        return fallback("snapshot_missing_or_invalid", sourceFields);
    if (!snapshotScopeMatches)
        return fallback("snapshot_scope_mismatch", sourceFields);
    if (!markdown)
        return fallback("summary_markdown_missing_or_empty", sourceFields);
    if (!sourceFields.markdownChecksumMatches)
        return fallback("summary_markdown_checksum_mismatch", sourceFields);
    if (templateState.templateOnly)
        return fallback("session_memory_empty_template", sourceFields);
    if (snapshot.hasSummary !== true)
        return fallback("session_memory_snapshot_has_no_summary", sourceFields);
    const currentPostCompactReset = input.memory?.compaction?.postCompactSessionStateReset
        || input.memory?.messageCompression?.postCompactSessionStateReset
        || input.memory?.compactBoundary?.postCompactSessionStateReset
        || input.memory?.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
        || null;
    if (currentPostCompactReset?.schema) {
        const currentResetVerification = (0, group_compaction_receipts_1.verifyGroupPostCompactSessionStateResetReceipt)(currentPostCompactReset, {
            groupId,
            groupSessionId,
            boundaryId: input.memory?.compactBoundary?.id || "",
            summaryChecksum: input.memory?.compaction?.summaryChecksum || "",
        });
        const snapshotReset = snapshot.postCompactSessionStateReset || null;
        const snapshotResetVerification = (0, group_compaction_receipts_1.verifyGroupPostCompactSessionStateResetReceipt)(snapshotReset, {
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
        if (!resetMatches)
            return fallback("post_compact_session_state_reset_mismatch", sourceFields);
    }
    const cursor = String(snapshot.lastSummarizedMessageId || "").trim();
    const resumedWithoutCursor = !cursor;
    const resumeSeedMessageId = resumedWithoutCursor && (input.messages || []).length
        ? (0, group_compaction_projections_part_01_1.messageIdentity)((input.messages || [])[(input.messages || []).length - 1], (input.messages || []).length - 1)
        : "";
    if (resumedWithoutCursor && !resumeSeedMessageId) {
        return fallback("last_summarized_cursor_missing_and_no_resume_tail", {
            ...sourceFields,
            cursorStatus: "missing",
            cursorMode: "unavailable",
        });
    }
    const candidateKeepIndex = (0, group_compaction_projections_part_01_1.calculateGroupSessionMemoryMessagesToKeepIndex)(input.messages || [], cursor || resumeSeedMessageId, {
        ...(input.keepWindowOptions || {}),
        skipInvariantClosure: true,
    });
    if (candidateKeepIndex < 0)
        return fallback("last_summarized_cursor_not_found", {
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
    const invariantClosure = (0, group_compaction_projections_part_01_1.adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants)(input.messages || [], candidateKeepIndex, { floorIndex: input.keepWindowOptions?.floorIndex ?? 0 });
    const keepIndex = invariantClosure.keepIndex;
    if (!(0, group_compaction_projections_part_01_1.verifyGroupSessionMemoryApiInvariantClosure)(invariantClosure.receipt).valid) {
        return fallback("api_invariant_closure_unresolved", {
            ...sourceFields,
            ...cursorFields,
            keepIndex,
            apiInvariantClosure: invariantClosure.receipt,
        });
    }
    const keptMessages = (input.messages || []).slice(keepIndex);
    const compactProjection = (0, group_compaction_projections_part_01_1.buildGroupSessionMemoryCompactProjection)({
        groupId,
        groupSessionId,
        scopeId,
        summaryFile,
        markdown,
        originalMarkdownChecksum: actualChecksum,
        maxSectionTokens: config.sessionMemoryCompactMaxSectionTokens
            || config.session_memory_compact_max_section_tokens
            || group_compaction_receipts_1.GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_SECTION_TOKENS,
        maxTotalTokens: config.sessionMemoryCompactMaxTotalTokens
            || config.session_memory_compact_max_total_tokens
            || group_compaction_receipts_1.GROUP_SESSION_MEMORY_COMPACT_DEFAULT_MAX_TOTAL_TOKENS,
        createdAt: input.now,
    });
    const compactProjectionVerification = (0, group_compaction_projections_part_01_1.verifyGroupSessionMemoryCompactProjection)(compactProjection.receipt, {
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
    const projected = (0, group_compaction_projections_part_04_1.buildGroupTruePostCompactPayloadBudget)({
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
        preservedTokenEstimate: keptMessages.reduce((sum, message) => sum + (0, group_compaction_projections_part_01_1.estimateGroupMessageTokens)(message), 0),
        apiInvariantClosure: invariantClosure.receipt,
        compactProjection: compactProjection.receipt,
        projectedPostCompactTokens: projectedTokens,
    };
    if (projected.will_retrigger_next_turn === true)
        return fallback("projected_payload_reaches_auto_compact_threshold", selectedFields);
    return {
        selected: true,
        markdown: compactProjection.markdown,
        keepIndex,
        snapshot,
        receipt: buildGroupSessionMemoryCompactSelectionReceipt({ ...base, ...selectedFields, selected: true }),
    };
}
function buildGroupPreservedSegment(messages, keepIndex, options = {}) {
    const safeKeepIndex = Math.max(0, Math.min((messages || []).length, Number(keepIndex || 0)));
    const preservedMessages = (messages || []).slice(safeKeepIndex);
    const preservedMessageIds = preservedMessages.map((message, index) => (0, group_compaction_projections_part_01_1.messageIdentity)(message, safeKeepIndex + index));
    const tokenEstimate = preservedMessages.reduce((sum, message) => sum + (0, group_compaction_projections_part_01_1.estimateGroupMessageTokens)(message), 0);
    const textBlockMessageCount = preservedMessages.filter(group_compaction_projections_part_01_1.messageHasText).length;
    const firstTaskId = (0, group_compaction_projections_part_01_1.groupMessageTaskId)(messages?.[safeKeepIndex]);
    const firstTaskMessageCount = firstTaskId
        ? preservedMessages.filter((message) => (0, group_compaction_projections_part_01_1.groupMessageTaskId)(message) === firstTaskId).length
        : 0;
    const protectedTaskTransaction = !!firstTaskId && firstTaskMessageCount > 1;
    const summarizedThroughMessageId = safeKeepIndex > 0 ? (0, group_compaction_projections_part_01_1.messageIdentity)(messages[safeKeepIndex - 1], safeKeepIndex - 1) : "";
    const summaryChecksum = String(options.summaryChecksum || options.summary_checksum || "");
    const summaryMessageId = String(options.summaryMessageId || options.summary_message_id || (summaryChecksum && summarizedThroughMessageId
        ? `gcsum_${crypto.createHash("sha256")
            .update(`${options.groupId || options.group_id || options.scopeId || options.scope_id || "unscoped"}\n${summaryChecksum}\n${summarizedThroughMessageId}`)
            .digest("hex")
            .slice(0, 24)}`
        : ""));
    const headMessageId = preservedMessageIds[0] || "";
    const tailMessageId = preservedMessageIds[preservedMessageIds.length - 1] || "";
    return {
        schema: "ccm-group-preserved-segment-v1",
        version: group_compaction_receipts_1.GROUP_PRESERVED_SEGMENT_VERSION,
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
        minTokens: Number(options.minTokens || options.min_tokens || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_TOKENS),
        minTextBlockMessages: Number(options.minMessages || options.min_messages || group_compaction_receipts_1.GROUP_COMPACT_MIN_KEEP_MESSAGES),
        maxTokens: Number(options.maxTokens || options.max_tokens || group_compaction_receipts_1.GROUP_COMPACT_MAX_KEEP_TOKENS),
        protectedTaskTransaction,
        firstPreservedTaskId: firstTaskId,
        transcriptPath: options.transcriptPath || options.transcript_path || "",
        createdAt: options.now || new Date().toISOString(),
    };
}
function messageContentBlocks(message) {
    const blocks = [];
    const visit = (value, depth = 0) => {
        if (depth > 4 || value == null)
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item, depth + 1);
            return;
        }
        if (typeof value !== "object")
            return;
        if (value.type)
            blocks.push(value);
        if (Array.isArray(value.content))
            visit(value.content, depth + 1);
        if (Array.isArray(value.blocks))
            visit(value.blocks, depth + 1);
    };
    visit(message?.content);
    visit(message?.blocks);
    visit(message?.message?.content);
    return blocks;
}
function collectWindowBlockRefs(messages, offset = 0) {
    const toolUseIds = new Set();
    const toolResultIds = new Set();
    const thinkingMessageIds = new Set();
    const rows = [];
    (messages || []).forEach((message, localIndex) => {
        const index = offset + localIndex;
        const messageId = (0, group_compaction_projections_part_01_1.messageIdentity)(message, index);
        const providerMessageId = (0, group_compaction_projections_part_01_1.groupProviderMessageId)(message);
        if (providerMessageId)
            thinkingMessageIds.add(providerMessageId);
        for (const id of (0, group_compaction_projections_part_01_1.groupMessageToolUseIds)(message)) {
            toolUseIds.add(id);
            rows.push({ type: "tool_use", id, messageId, providerMessageId, index });
        }
        for (const id of (0, group_compaction_projections_part_01_1.groupMessageToolResultIds)(message)) {
            toolResultIds.add(id);
            rows.push({ type: "tool_result", id, messageId, providerMessageId, index });
        }
        for (const block of messageContentBlocks(message)) {
            const type = String(block?.type || "");
            if (type === "tool_use" || type === "server_tool_use") {
                const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
                rows.push({ type, id, messageId, providerMessageId, index });
            }
            else if (type === "tool_result" || type === "web_search_tool_result") {
                const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
                rows.push({ type, id, messageId, providerMessageId, index });
            }
            else if (type === "thinking" || type === "redacted_thinking") {
                thinkingMessageIds.add(providerMessageId || messageId);
                rows.push({ type, id: providerMessageId || messageId, messageId, providerMessageId, index });
            }
        }
    });
    return { toolUseIds, toolResultIds, thinkingMessageIds, rows };
}
function collectApiMicroCompactSignals(messages = []) {
    const toolUseIds = new Set();
    const toolResultIds = new Set();
    const toolNames = new Set();
    const resultToolNames = new Set();
    let thinkingBlockCount = 0;
    let redactedThinkingBlockCount = 0;
    let toolUseBlockCount = 0;
    let toolResultBlockCount = 0;
    (messages || []).forEach((message, index) => {
        if (String(message?.role || "").toLowerCase() === "thinking")
            thinkingBlockCount += 1;
        const explicitToolCalls = Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : [];
        for (const call of explicitToolCalls) {
            const id = String(call?.id || call?.tool_use_id || call?.toolUseId || `tool-call-${index}`).trim();
            const name = String(call?.name || call?.function?.name || call?.tool || "").trim();
            if (id)
                toolUseIds.add(id);
            if (name)
                toolNames.add(name);
            toolUseBlockCount += 1;
        }
        const explicitResults = Array.isArray(message?.tool_results || message?.toolResults) ? (message.tool_results || message.toolResults) : [];
        for (const result of explicitResults) {
            const id = String(result?.tool_use_id || result?.toolUseId || result?.id || `tool-result-${index}`).trim();
            const name = String(result?.name || result?.tool || "").trim();
            if (id)
                toolResultIds.add(id);
            if (name)
                resultToolNames.add(name);
            toolResultBlockCount += 1;
        }
        for (const block of messageContentBlocks(message)) {
            const type = String(block?.type || "");
            if (type === "tool_use" || type === "server_tool_use") {
                const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
                const name = String(block.name || block.tool || block.tool_name || "").trim();
                if (id)
                    toolUseIds.add(id);
                if (name)
                    toolNames.add(name);
                toolUseBlockCount += 1;
            }
            else if (type === "tool_result" || type === "web_search_tool_result") {
                const id = String(block.tool_use_id || block.toolUseId || block.id || "").trim();
                const name = String(block.name || block.tool || block.tool_name || "").trim();
                if (id)
                    toolResultIds.add(id);
                if (name)
                    resultToolNames.add(name);
                toolResultBlockCount += 1;
            }
            else if (type === "thinking") {
                thinkingBlockCount += 1;
            }
            else if (type === "redacted_thinking") {
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
exports.GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES = new Set([
    "read", "fileread", "bash", "shell", "powershell", "grep", "glob",
    "websearch", "webfetch", "edit", "fileedit", "write", "filewrite", "notebookedit",
]);
function normalizedToolName(value) {
    return String(value || "").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}
function timeBasedToolResultReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function verifyGroupTimeBasedToolResultProjectionReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== "ccm-group-time-based-tool-result-projection-v1" || Number(receipt?.version || 0) !== group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION)
        issues.push("time_based_tool_result_schema_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("time_based_tool_result_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("time_based_tool_result_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`)
        issues.push("time_based_tool_result_scope_invalid");
    if (!["applied", "skipped"].includes(String(receipt?.status || "")))
        issues.push("time_based_tool_result_status_invalid");
    if (Number(receipt?.keep_recent || 0) < 1)
        issues.push("time_based_tool_result_keep_recent_invalid");
    if (receipt?.raw_transcript_preserved !== true)
        issues.push("time_based_tool_result_raw_preservation_missing");
    if (receipt?.status === "applied" && Number(receipt?.cleared_tool_result_count || 0) < 1)
        issues.push("time_based_tool_result_clear_count_missing");
    if (receipt?.status === "applied" && Number(receipt?.tokens_saved || 0) < 1)
        issues.push("time_based_tool_result_tokens_saved_missing");
    if (String(receipt?.receipt_checksum || "") !== timeBasedToolResultReceiptChecksum(receipt))
        issues.push("time_based_tool_result_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("time_based_tool_result_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("time_based_tool_result_session_mismatch");
    return { valid: issues.length === 0, issues };
}
function clearProjectedToolResultValue(value, clearIds, state) {
    if (Array.isArray(value))
        return value.map(item => clearProjectedToolResultValue(item, clearIds, state));
    if (!value || typeof value !== "object")
        return value;
    const type = String(value.type || "");
    const id = String(value.tool_use_id || value.toolUseId || value.id || "").trim();
    if ((type === "tool_result" || type === "web_search_tool_result") && clearIds.has(id)) {
        const current = value.content ?? value.output ?? value.result ?? value.text ?? "";
        if (current === group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE)
            return value;
        state.tokensSaved += Math.max(0, (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)((0, group_compaction_projections_part_01_1.renderMessageContentValue)(current)) - (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE));
        state.cleared += 1;
        return { ...value, content: group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE, output: undefined, result: undefined, text: undefined };
    }
    const next = { ...value };
    if (Array.isArray(value.content) || value.content && typeof value.content === "object")
        next.content = clearProjectedToolResultValue(value.content, clearIds, state);
    if (Array.isArray(value.blocks))
        next.blocks = clearProjectedToolResultValue(value.blocks, clearIds, state);
    return next;
}
function buildGroupTimeBasedToolResultProjection(messages = [], options = {}) {
    const groupId = String(options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const enabled = options.enabled === true;
    const gapThresholdMinutes = Math.max(1, Math.min(10_080, Math.floor(Number(options.gapThresholdMinutes || options.gap_threshold_minutes || 60))));
    const keepRecent = Math.max(1, Math.min(100, Math.floor(Number(options.keepRecent || options.keep_recent || 5))));
    const querySource = String(options.querySource || options.query_source || "");
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const toolNamesById = new Map();
    const compactableIds = [];
    for (const message of messages || []) {
        const explicitCalls = Array.isArray(message?.tool_calls || message?.toolCalls) ? (message.tool_calls || message.toolCalls) : [];
        for (const call of explicitCalls) {
            const id = String(call?.id || call?.tool_use_id || call?.toolUseId || "").trim();
            const name = String(call?.name || call?.function?.name || call?.tool || "").trim();
            if (id)
                toolNamesById.set(id, name);
        }
        for (const block of messageContentBlocks(message)) {
            const type = String(block?.type || "");
            if (type !== "tool_use" && type !== "server_tool_use")
                continue;
            const id = String(block.id || block.tool_use_id || block.toolUseId || "").trim();
            const name = String(block.name || block.tool || block.tool_name || "").trim();
            if (id)
                toolNamesById.set(id, name);
        }
    }
    for (const [id, name] of toolNamesById)
        if (exports.GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES.has(normalizedToolName(name)))
            compactableIds.push(id);
    const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || (!!message?.agent && message?.role !== "user"));
    const lastAssistantMs = (0, group_compaction_projections_part_03_1.messageTimestampMs)(lastAssistant);
    const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
    const sourceAllowed = querySource === "group_main_thread" || querySource.startsWith("group_main_thread:");
    const exactSession = groupSessionId.startsWith("gcs_");
    const triggered = enabled && exactSession && sourceAllowed && !!lastAssistantMs && gapMinutes >= gapThresholdMinutes && compactableIds.length > keepRecent;
    const keepIds = new Set(compactableIds.slice(-keepRecent));
    const clearIds = new Set(triggered ? compactableIds.filter(id => !keepIds.has(id)) : []);
    const state = { tokensSaved: 0, cleared: 0 };
    const projectedMessages = clearIds.size ? (messages || []).map(message => {
        const next = { ...message };
        if (message?.content != null)
            next.content = clearProjectedToolResultValue(message.content, clearIds, state);
        if (message?.message?.content != null)
            next.message = { ...message.message, content: clearProjectedToolResultValue(message.message.content, clearIds, state) };
        if (Array.isArray(message?.blocks))
            next.blocks = clearProjectedToolResultValue(message.blocks, clearIds, state);
        if (Array.isArray(message?.tool_results || message?.toolResults)) {
            const key = Array.isArray(message.tool_results) ? "tool_results" : "toolResults";
            next[key] = (message.tool_results || message.toolResults).map((result) => {
                const id = String(result?.tool_use_id || result?.toolUseId || result?.id || "").trim();
                if (!clearIds.has(id))
                    return result;
                const current = result.content ?? result.output ?? result.result ?? result.text ?? "";
                if (current === group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE)
                    return result;
                state.tokensSaved += Math.max(0, (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)((0, group_compaction_projections_part_01_1.renderMessageContentValue)(current)) - (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE));
                state.cleared += 1;
                return { ...result, content: group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE, output: undefined, result: undefined, text: undefined };
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
    const payload = {
        schema: "ccm-group-time-based-tool-result-projection-v1",
        version: group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_PROJECTION_VERSION,
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
        last_assistant_message_id: lastAssistant ? (0, group_compaction_projections_part_01_1.messageIdentity)(lastAssistant, Math.max(0, (messages || []).indexOf(lastAssistant))) : "",
        last_assistant_at: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
        evaluated_at: new Date(nowMs).toISOString(),
        raw_transcript_preserved: true,
        cleared_content_marker: group_compaction_receipts_1.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE,
        cleared_tool_ids: [...clearIds].slice(0, 100),
    };
    const receipt = { ...payload, receipt_checksum: timeBasedToolResultReceiptChecksum(payload) };
    return { messages: projectedMessages, receipt, applied: receipt.status === "applied" };
}
function timeBasedThinkingReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function verifyGroupTimeBasedThinkingProjectionReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== "ccm-group-time-based-thinking-projection-v1" || Number(receipt?.version || 0) !== group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_PROJECTION_VERSION)
        issues.push("time_based_thinking_schema_invalid");
    if (!String(receipt?.group_id || ""))
        issues.push("time_based_thinking_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("time_based_thinking_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`)
        issues.push("time_based_thinking_scope_invalid");
    if (!String(receipt?.compact_epoch || ""))
        issues.push("time_based_thinking_compact_epoch_missing");
    if (!["applied", "latched", "skipped"].includes(String(receipt?.status || "")))
        issues.push("time_based_thinking_status_invalid");
    if (Number(receipt?.keep_thinking_turns || 0) !== 1)
        issues.push("time_based_thinking_keep_invalid");
    if (receipt?.raw_transcript_preserved !== true)
        issues.push("time_based_thinking_raw_preservation_missing");
    if (receipt?.status === "applied" && receipt?.latched !== true)
        issues.push("time_based_thinking_applied_without_latch");
    if (receipt?.status === "applied" && Number(receipt?.cleared_thinking_turn_count || 0) < 1)
        issues.push("time_based_thinking_clear_count_missing");
    if (String(receipt?.receipt_checksum || "") !== timeBasedThinkingReceiptChecksum(receipt))
        issues.push("time_based_thinking_checksum_invalid");
    if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId))
        issues.push("time_based_thinking_group_mismatch");
    if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId))
        issues.push("time_based_thinking_session_mismatch");
    if (expected.compactEpoch && String(receipt?.compact_epoch || "") !== String(expected.compactEpoch))
        issues.push("time_based_thinking_compact_epoch_mismatch");
    return { valid: issues.length === 0, issues };
}
function hasModelVisibleThinking(message) {
    if (String(message?.role || "").toLowerCase() === "thinking")
        return true;
    return messageContentBlocks(message).some(block => String(block?.type || "") === "thinking");
}
function clearProjectedThinkingValue(value, state) {
    if (Array.isArray(value))
        return value.map(item => clearProjectedThinkingValue(item, state));
    if (!value || typeof value !== "object")
        return value;
    if (String(value.type || "") === "thinking") {
        const current = value.thinking ?? value.content ?? value.text ?? "";
        state.tokensSaved += Math.max(0, (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)((0, group_compaction_projections_part_01_1.renderMessageContentValue)(current)) - (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE));
        state.clearedBlocks += 1;
        return { type: "text", text: group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE };
    }
    const next = { ...value };
    if (Array.isArray(value.content) || value.content && typeof value.content === "object")
        next.content = clearProjectedThinkingValue(value.content, state);
    if (Array.isArray(value.blocks))
        next.blocks = clearProjectedThinkingValue(value.blocks, state);
    return next;
}
function buildGroupTimeBasedThinkingProjection(messages = [], options = {}) {
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
        : { valid: false, issues: [] };
    const priorLatchSameEpoch = priorVerification.valid === true
        && priorReceipt?.latched === true
        && String(priorReceipt?.compact_epoch || "") === compactEpoch;
    const exactSession = groupSessionId.startsWith("gcs_");
    const sourceAllowed = querySource === "group_main_thread" || querySource.startsWith("group_main_thread:");
    const lastAssistant = [...(messages || [])].reverse().find(message => message?.role === "assistant" || (!!message?.agent && message?.role !== "user"));
    const lastAssistantMs = (0, group_compaction_projections_part_03_1.messageTimestampMs)(lastAssistant);
    const gapMinutes = lastAssistantMs ? Math.max(0, Math.round(((nowMs - lastAssistantMs) / 60_000) * 10) / 10) : 0;
    const gapLatch = enabled && exactSession && sourceAllowed && !!lastAssistantMs && gapMinutes >= gapThresholdMinutes;
    const latched = enabled && exactSession && sourceAllowed && !isRedactThinkingActive && (priorLatchSameEpoch || gapLatch);
    const thinkingRows = (messages || []).map((message, index) => ({ message, index, id: (0, group_compaction_projections_part_01_1.messageIdentity)(message, index) }))
        .filter(row => hasModelVisibleThinking(row.message));
    const keepThinkingMessageId = thinkingRows.length ? thinkingRows[thinkingRows.length - 1].id : "";
    const clearThinkingMessageIds = new Set(latched ? thinkingRows.slice(0, -1).map(row => row.id) : []);
    const state = { tokensSaved: 0, clearedBlocks: 0 };
    let clearedThinkingTurns = 0;
    const projectedMessages = clearThinkingMessageIds.size ? (messages || []).map((message, index) => {
        const messageId = (0, group_compaction_projections_part_01_1.messageIdentity)(message, index);
        if (!clearThinkingMessageIds.has(messageId))
            return message;
        clearedThinkingTurns += 1;
        const next = { ...message };
        if (String(message?.role || "").toLowerCase() === "thinking") {
            const current = message?.content ?? message?.thinking ?? "";
            state.tokensSaved += Math.max(0, (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)((0, group_compaction_projections_part_01_1.renderMessageContentValue)(current)) - (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE));
            state.clearedBlocks += 1;
            next.content = group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE;
            if ("thinking" in next)
                next.thinking = undefined;
        }
        else {
            if (message?.content != null)
                next.content = clearProjectedThinkingValue(message.content, state);
            if (message?.message?.content != null)
                next.message = { ...message.message, content: clearProjectedThinkingValue(message.message.content, state) };
            if (Array.isArray(message?.blocks))
                next.blocks = clearProjectedThinkingValue(message.blocks, state);
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
    const payload = {
        schema: "ccm-group-time-based-thinking-projection-v1",
        version: group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_PROJECTION_VERSION,
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
        last_assistant_message_id: lastAssistant ? (0, group_compaction_projections_part_01_1.messageIdentity)(lastAssistant, Math.max(0, (messages || []).indexOf(lastAssistant))) : "",
        last_assistant_at: lastAssistant ? String(lastAssistant.timestamp || lastAssistant.time || lastAssistant.created_at || "") : "",
        kept_thinking_message_id: keepThinkingMessageId,
        cleared_thinking_message_ids: [...clearThinkingMessageIds].slice(0, 100),
        evaluated_at: new Date(nowMs).toISOString(),
        raw_transcript_preserved: true,
        cleared_content_marker: group_compaction_receipts_1.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE,
    };
    const receipt = { ...payload, receipt_checksum: timeBasedThinkingReceiptChecksum(payload) };
    return {
        messages: projectedMessages,
        receipt,
        applied: status === "applied",
        shouldPersist: enabled && (status === "applied" || receipt.newly_latched === true || resetByCompact),
    };
}
function buildGroupApiMicroCompactEditPlan(messages = [], options = {}) {
    const maxInputTokens = Math.max(1, Number(options.maxInputTokens || options.max_input_tokens || group_compaction_receipts_1.GROUP_API_MICROCOMPACT_DEFAULT_MAX_INPUT_TOKENS));
    const targetInputTokens = Math.max(1, Math.min(maxInputTokens, Number(options.targetInputTokens || options.target_input_tokens || group_compaction_receipts_1.GROUP_API_MICROCOMPACT_DEFAULT_TARGET_INPUT_TOKENS)));
    const clearAtLeastTokens = Math.max(0, maxInputTokens - targetInputTokens);
    const activeTokens = Number(options.activeTokens || options.active_tokens || (messages || []).reduce((sum, message) => sum + (0, group_compaction_projections_part_01_1.estimateGroupMessageTokens)(message), 0));
    const triggerValue = Math.max(targetInputTokens, Number(options.triggerTokens || options.trigger_tokens || maxInputTokens));
    const signals = collectApiMicroCompactSignals(messages);
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const latestMessageTime = Math.max(0, ...(messages || []).map((message) => Date.parse(String(message?.timestamp || message?.time || "")) || 0));
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
    const edits = [];
    const strategies = [];
    const addStrategy = (strategy, recommended, reason) => {
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
            clear_tool_inputs: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
        }, force || aboveTrigger, aboveTrigger ? "input tokens exceed API microcompact trigger" : "tool results present but below trigger; keep as advisory until pressure rises");
    }
    if (enableToolUseClearing && signals.hasToolUses) {
        addStrategy({
            type: "clear_tool_uses_20250919",
            trigger: { type: "input_tokens", value: triggerValue },
            clear_at_least: { type: "input_tokens", value: clearAtLeastTokens },
            exclude_tools: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CLEARABLE_USES,
        }, force || aboveTrigger, "keep recent tool uses while preserving edit/write safety boundaries");
    }
    const config = edits.length ? { edits } : undefined;
    const base = {
        schema: "ccm-api-microcompact-edit-plan-v1",
        version: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_EDIT_PLAN_VERSION,
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
        clearableResultTools: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CLEARABLE_RESULTS,
        clearableUseExcludeTools: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CLEARABLE_USES,
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
function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan = {}, options = {}) {
    const rawAgentType = String(options.agentType || options.agent_type || options.runtime || "unknown").trim().toLowerCase();
    const agentType = rawAgentType === "claude" ? "claudecode" : rawAgentType || "unknown";
    const apiRuntimes = new Set(["anthropic-api", "anthropic-sdk", "claude-api", "claude-sdk"]);
    const cliRuntimes = new Set(["claudecode", "cursor", "codex", "gemini", "opencode", "qoder", "test-agent-native"]);
    const transport = String(options.transport
        || options.executorTransport
        || options.executor_transport
        || (apiRuntimes.has(agentType) ? "anthropic_api" : "cli")).trim().toLowerCase();
    const provider = String(options.provider || options.apiProvider || options.api_provider || (transport.includes("anthropic") ? "anthropic" : "")).trim().toLowerCase();
    const betaHeaders = [
        ...(Array.isArray(options.betaHeaders || options.beta_headers) ? (options.betaHeaders || options.beta_headers) : []),
    ].map((item) => String(item || "").trim()).filter(Boolean);
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
    const providerSessionCapacityGeneration = Math.max(1, Number(providerCapacityValid && providerSessionCapacity.generation
        || providerSessionGenerationFence?.generation
        || 1));
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
        || betaHeaders.includes(group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA)
        || providerCapacityValid && providerSessionCapacity.sticky_beta_latched === true;
    const featureEnabled = options.enabled !== false && options.featureEnabled !== false && options.feature_enabled !== false;
    const cliAdvisoryBoundary = cliRuntimes.has(agentType) || transport === "cli" || transport === "external_cli";
    const providerSupportsContextManagement = ["anthropic", "anthropic-compatible", "claude"].includes(provider);
    const sessionBinding = options.sessionBinding || options.session_binding || null;
    const taskAgentSessionId = String(options.taskAgentSessionId
        || options.task_agent_session_id
        || sessionBinding?.task_agent_session_id
        || sessionBinding?.taskAgentSessionId
        || "").trim();
    const nativeSessionId = String(options.nativeSessionId
        || options.native_session_id
        || sessionBinding?.native_session_id
        || sessionBinding?.nativeSessionId
        || "").trim();
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
        { id: "context_management_beta_enabled", pass: betaHeaderEnabled, evidence: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA },
        { id: "feature_enabled", pass: featureEnabled, evidence: featureEnabled ? "enabled" : "disabled" },
    ];
    const failedChecks = checks.filter(item => !item.pass).map(item => item.id);
    const requestPatch = nativeApplyReady ? {
        body: {
            context_management: contextManagement,
        },
        beta_headers: [group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA],
    } : null;
    const base = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        version: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION,
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
            requiredBetaHeader: group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA,
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
function verifyGroupApiMicrocompactNativeApplyPlan(plan = {}, expected = {}) {
    const issues = [];
    if (plan?.schema !== "ccm-api-microcompact-native-apply-plan-v1"
        || Number(plan?.version || 0) !== group_compaction_receipts_1.GROUP_API_MICROCOMPACT_NATIVE_APPLY_PLAN_VERSION)
        issues.push("schema");
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
    if (!suppliedApplyPlanChecksum || suppliedApplyPlanChecksum !== computedApplyPlanChecksum)
        issues.push("apply_plan_checksum");
    const requestPatch = plan.requestPatch || plan.request_patch || null;
    const computedRequestPatchChecksum = requestPatch
        ? crypto.createHash("sha256").update(JSON.stringify(requestPatch)).digest("hex").slice(0, 24)
        : "";
    if (String(plan.requestPatchChecksum || plan.request_patch_checksum || "") !== computedRequestPatchChecksum)
        issues.push("request_patch_checksum");
    if (String(plan.receiptContract?.required_apply_plan_checksum || "") !== String(suppliedApplyPlanChecksum || ""))
        issues.push("receipt_contract_apply_plan_checksum");
    if (String(plan.receiptContract?.required_request_patch_checksum || "") !== computedRequestPatchChecksum)
        issues.push("receipt_contract_request_patch_checksum");
    if (plan.nativeApplyReady === true) {
        if (plan.mode !== "native_api_context_management")
            issues.push("native_mode");
        if (!requestPatch?.body?.context_management)
            issues.push("context_management");
        if (!Array.isArray(requestPatch?.beta_headers) || !requestPatch.beta_headers.includes(group_compaction_receipts_1.GROUP_API_MICROCOMPACT_CONTEXT_MANAGEMENT_BETA))
            issues.push("context_management_beta");
        if (plan.executor?.cli === true || ["cli", "external_cli"].includes(String(plan.executor?.transport || "")))
            issues.push("cli_native_boundary");
    }
    else if (requestPatch) {
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
        if (String(wanted || "").trim() && String(actual || "") !== String(wanted))
            issues.push(`${name}_mismatch`);
    }
    return {
        valid: issues.length === 0,
        issues,
        computedApplyPlanChecksum,
        computedRequestPatchChecksum,
    };
}
function createEmptyConversationSummary() {
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
function extractFiles(message) {
    const content = (0, group_compaction_projections_part_01_1.messageContent)(message);
    const explicit = [
        ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
        ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
        ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
            ? message.delivery_summary.actual_file_changes.map((item) => item?.path || item?.file || item)
            : []),
    ];
    const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}
function extractRuntimeSkillFacts(message) {
    const facts = [];
    const actor = message?.agent || message?.role || "Agent";
    const add = (item) => {
        const name = typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name;
        const hash = typeof item === "object" && item?.contentHash ? `#${item.contentHash}` : "";
        if (name)
            facts.push(`${actor} 使用 Skill:${name}${hash}`);
    };
    for (const item of Array.isArray(message?.invokedSkills) ? message.invokedSkills : [])
        add(item);
    for (const item of Array.isArray(message?.receipt?.invokedSkills) ? message.receipt.invokedSkills : [])
        add(item);
    for (const item of Array.isArray(message?.delivery_summary?.runtime_tooling?.invoked_skills) ? message.delivery_summary.runtime_tooling.invoked_skills : [])
        add(item);
    for (const item of Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : [])
        if (/Skill\s*[:：]/i.test(String(item || "")))
            add(item);
    return Array.from(new Set(facts)).slice(0, 12);
}
function extractVerificationFacts(message) {
    return (0, group_compaction_projections_part_01_1.uniqueStrings)([
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.verification, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.tests, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.receipt?.verification, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.receipt?.tests, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.delivery_summary?.verification_executed, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.delivery_summary?.verification_failed, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.delivery_summary?.verification_suggested, 12),
        ...(0, group_compaction_projections_part_01_1.stringArray)(message?.delivery_summary?.verification_required_missing, 12),
    ], 16);
}
function extractMessageStatus(message) {
    return String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").trim();
}
//# sourceMappingURL=group-compaction-projections-part-02.js.map