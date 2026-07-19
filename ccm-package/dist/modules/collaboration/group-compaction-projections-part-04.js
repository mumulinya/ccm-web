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
exports.buildDynamicContextCategory = buildDynamicContextCategory;
exports.dynamicContextAttachmentManifest = dynamicContextAttachmentManifest;
exports.verifyGroupPostCompactDynamicContextDeltaReceipt = verifyGroupPostCompactDynamicContextDeltaReceipt;
exports.buildGroupPostCompactDynamicContextDeltaProjection = buildGroupPostCompactDynamicContextDeltaProjection;
exports.buildGroupMicroCompactPlan = buildGroupMicroCompactPlan;
exports.buildPostCompactReinjectionPlan = buildPostCompactReinjectionPlan;
exports.buildGroupPostCompactRecoveryAudit = buildGroupPostCompactRecoveryAudit;
exports.buildGroupPostCompactCleanupAudit = buildGroupPostCompactCleanupAudit;
exports.buildGroupPartialCompactSidecarSegment = buildGroupPartialCompactSidecarSegment;
exports.mergeGroupPartialCompactSegments = mergeGroupPartialCompactSegments;
exports.buildPartialSidecarOnlyMemory = buildPartialSidecarOnlyMemory;
exports.memorySeed = memorySeed;
exports.buildDeterministicConversationSummary = buildDeterministicConversationSummary;
exports.normalizeSummary = normalizeSummary;
exports.renderConversationSummary = renderConversationSummary;
exports.buildBoundedRecentGroupContext = buildBoundedRecentGroupContext;
exports.buildGroupTruePostCompactPayloadBudget = buildGroupTruePostCompactPayloadBudget;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_compaction_receipts_1 = require("./group-compaction-receipts");
const group_compaction_projections_part_01_1 = require("./group-compaction-projections-part-01");
const group_compaction_projections_part_02_1 = require("./group-compaction-projections-part-02");
const group_compaction_projections_part_03_1 = require("./group-compaction-projections-part-03");
function buildDynamicContextCategory(rows, announced) {
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
function dynamicContextAttachmentManifest(attachment) {
    if (!attachment)
        return null;
    const category = (value) => ({
        added_names: Array.isArray(value?.addedNames) ? value.addedNames : [],
        added_hashes: Array.isArray(value?.addedHashes) ? value.addedHashes : [],
        removed_names: Array.isArray(value?.removedNames) ? value.removedNames : [],
    });
    const manifest = {
        deferred_tools: category(attachment.deferredTools || attachment.deferred_tools),
        agent_listing: category(attachment.agentListing || attachment.agent_listing),
        mcp_instructions: category(attachment.mcpInstructions || attachment.mcp_instructions),
        body_checksum: (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(attachment.body || ""),
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
function verifyGroupPostCompactDynamicContextDeltaReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== "ccm-group-post-compact-dynamic-context-delta-v1"
        || Number(receipt?.version || 0) !== group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION)
        issues.push("post_compact_dynamic_context_delta_schema_invalid");
    if (!String(receipt?.group_id || "").trim())
        issues.push("post_compact_dynamic_context_delta_group_missing");
    if (!String(receipt?.group_session_id || "").startsWith("gcs_"))
        issues.push("post_compact_dynamic_context_delta_exact_session_missing");
    if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}::${String(receipt?.group_session_id || "")}`)
        issues.push("post_compact_dynamic_context_delta_scope_invalid");
    if (receipt?.exact_session_only !== true || receipt?.cross_session_fallback_allowed !== false)
        issues.push("post_compact_dynamic_context_delta_isolation_invalid");
    if (receipt?.body_free !== true)
        issues.push("post_compact_dynamic_context_delta_receipt_body_policy_invalid");
    if (!["full", "partial"].includes(String(receipt?.scan_mode || "")))
        issues.push("post_compact_dynamic_context_delta_scan_mode_invalid");
    if (Number(receipt?.max_attachment_tokens || 0) !== group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS)
        issues.push("post_compact_dynamic_context_delta_budget_invalid");
    if (Number(receipt?.attachment_token_count || 0) > group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS)
        issues.push("post_compact_dynamic_context_delta_budget_exceeded");
    if (![0, 1].includes(Number(receipt?.attachment_count || 0)))
        issues.push("post_compact_dynamic_context_delta_attachment_count_invalid");
    const loadedToolState = receipt?.loaded_tool_state;
    if (loadedToolState !== undefined && loadedToolState !== null) {
        if (loadedToolState?.schema !== "ccm-group-post-compact-loaded-tool-state-v1"
            || Number(loadedToolState?.version || 0) !== group_compaction_receipts_1.GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION)
            issues.push("post_compact_loaded_tool_state_schema_invalid");
        const carriedNames = Array.isArray(loadedToolState?.carried_names) ? loadedToolState.carried_names.map((name) => String(name || "")) : [];
        const carriedHashes = Array.isArray(loadedToolState?.carried_hashes) ? loadedToolState.carried_hashes.map((hash) => String(hash || "")) : [];
        const droppedNames = Array.isArray(loadedToolState?.dropped_names) ? loadedToolState.dropped_names.map((name) => String(name || "")) : [];
        if (Number(loadedToolState?.carried_count || 0) !== carriedNames.length
            || carriedHashes.length !== carriedNames.length
            || Number(loadedToolState?.dropped_count || 0) !== droppedNames.length
            || Number(loadedToolState?.source_count || 0) !== carriedNames.length + droppedNames.length)
            issues.push("post_compact_loaded_tool_state_count_invalid");
        if (new Set(carriedNames).size !== carriedNames.length
            || new Set(droppedNames).size !== droppedNames.length
            || carriedNames.some((name) => droppedNames.includes(name)))
            issues.push("post_compact_loaded_tool_state_names_invalid");
        const stateChecksum = (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(JSON.stringify({ carried_names: carriedNames, carried_hashes: carriedHashes, dropped_names: droppedNames }));
        if (String(loadedToolState?.state_checksum || "") !== stateChecksum)
            issues.push("post_compact_loaded_tool_state_checksum_invalid");
    }
    const forbiddenKeys = new Set(["body", "content", "line", "lines", "block", "blocks", "description", "descriptions", "instructions", "addedtexts", "added_texts"]);
    const visit = (value) => {
        if (!value || typeof value !== "object")
            return false;
        for (const [key, nested] of Object.entries(value)) {
            if (forbiddenKeys.has(String(key).toLowerCase()))
                return true;
            if (visit(nested))
                return true;
        }
        return false;
    };
    if (visit(receipt))
        issues.push("post_compact_dynamic_context_delta_receipt_contains_body");
    if (String(receipt?.receipt_checksum || "") !== (0, group_compaction_projections_part_03_1.postCompactDynamicContextDeltaReceiptChecksum)(receipt))
        issues.push("post_compact_dynamic_context_delta_receipt_checksum_invalid");
    if (expected.groupId !== undefined && String(receipt?.group_id || "") !== String(expected.groupId || ""))
        issues.push("post_compact_dynamic_context_delta_group_mismatch");
    if (expected.groupSessionId !== undefined && String(receipt?.group_session_id || "") !== String(expected.groupSessionId || ""))
        issues.push("post_compact_dynamic_context_delta_session_mismatch");
    if (expected.attachment !== undefined) {
        const attachment = expected.attachment || null;
        const manifest = dynamicContextAttachmentManifest(attachment);
        const manifestChecksum = crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
        if (Number(receipt?.attachment_count || 0) !== (attachment ? 1 : 0))
            issues.push("post_compact_dynamic_context_delta_attachment_count_mismatch");
        if (String(receipt?.attachment_manifest_checksum || "") !== manifestChecksum)
            issues.push("post_compact_dynamic_context_delta_manifest_mismatch");
        if (String(receipt?.attachment_body_checksum || "") !== (attachment ? (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(attachment.body || "") : ""))
            issues.push("post_compact_dynamic_context_delta_body_checksum_mismatch");
    }
    return { valid: issues.length === 0, issues };
}
function buildGroupPostCompactDynamicContextDeltaProjection(catalog = {}, options = {}) {
    const groupId = String(options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        throw new Error("exact_group_session_required_for_post_compact_dynamic_context_delta");
    const scanMode = String(options.scanMode || options.scan_mode || "full").toLowerCase() === "partial" ? "partial" : "full";
    const priorValues = scanMode === "partial" ? [
        ...(Array.isArray(options.preservedMessages || options.preserved_messages) ? (options.preservedMessages || options.preserved_messages) : []),
        ...(Array.isArray(options.priorAttachments || options.prior_attachments) ? (options.priorAttachments || options.prior_attachments) : []),
    ] : [];
    const priorAttachments = (0, group_compaction_projections_part_03_1.collectDynamicContextDeltaAttachments)(priorValues);
    const announced = (0, group_compaction_projections_part_03_1.reconstructDynamicContextAnnouncements)(priorAttachments);
    const catalogTools = Array.isArray(catalog.tools) ? catalog.tools : [];
    const loadedToolState = (0, group_compaction_projections_part_03_1.buildPreCompactLoadedToolState)(catalogTools, options.sourceMessages || options.source_messages || [], options.preCompactLoadedToolNames || options.pre_compact_loaded_tool_names || []);
    const toolRows = (0, group_compaction_projections_part_03_1.normalizeDynamicContextRows)([
        ...catalogTools,
        ...(Array.isArray(catalog.skills) ? catalog.skills : []),
    ], "line");
    const agentRows = (0, group_compaction_projections_part_03_1.normalizeDynamicContextRows)(catalog.agents, "line");
    const mcpRows = (0, group_compaction_projections_part_03_1.normalizeDynamicContextRows)(catalog.mcpInstructions || catalog.mcp_instructions, "block");
    const deferredTools = buildDynamicContextCategory(toolRows, announced.deferredTools);
    const agentListing = buildDynamicContextCategory(agentRows, announced.agentListing);
    const mcpInstructions = buildDynamicContextCategory(mcpRows, announced.mcpInstructions);
    const changed = [deferredTools, agentListing, mcpInstructions].some(category => category.addedNames.length || category.removedNames.length)
        || loadedToolState.sourceCount > 0;
    let attachment = null;
    if (changed) {
        const lines = [
            "[CCM Post-compact Exact-session Dynamic Context Delta]",
            `scope=${groupId}::${groupSessionId}; scan_mode=${scanMode}`,
            "This attachment restores the current authorized runtime context after compaction. It does not expand tool permissions; the live runtime authorization and dispatch gates remain authoritative.",
        ];
        const appendRemoved = (title, category, kind = "call or dispatch") => {
            if (category.removedNames.length) {
                lines.push("", `## ${title} removed`);
                category.removedNames.forEach((name) => lines.push(`- ${name} is no longer available in the current exact-session runtime context. Do not ${kind} it.`));
            }
        };
        const appendAdded = (title, category, addedLabel) => {
            if (!category.addedNames.length)
                return;
            lines.push("", `## ${title} added or changed`);
            category.addedNames.forEach((name, index) => lines.push(`- ${addedLabel} ${name}: ${category.addedTexts[index]}`));
        };
        // Retractions are placed before potentially large instruction bodies so they survive edge-preserving truncation.
        appendRemoved("Deferred tools and Skills", deferredTools, "call");
        appendRemoved("Dispatchable project Agents", agentListing, "dispatch");
        appendRemoved("MCP server instructions", mcpInstructions, "rely on its previous instruction block or call");
        if (loadedToolState.carriedNames.length) {
            lines.push("", "## Tools loaded before compact and still authorized");
            loadedToolState.carriedNames.forEach((name) => lines.push(`- ${name} remains loaded across this compact boundary; keep its runtime schema available without repeating discovery.`));
        }
        if (loadedToolState.droppedNames.length) {
            lines.push("", "## Pre-compact loaded tools not carried forward");
            loadedToolState.droppedNames.forEach((name) => lines.push(`- ${name} was observed before compaction but is absent from the current authorized catalog. Do not call it.`));
        }
        appendAdded("Deferred tools and Skills", deferredTools, "available");
        appendAdded("Dispatchable project Agents", agentListing, "dispatchable");
        if (mcpInstructions.addedNames.length) {
            lines.push("", "## MCP server instructions added or changed");
            mcpInstructions.addedNames.forEach((name, index) => lines.push(mcpInstructions.addedTexts[index] || `## ${name}`));
        }
        const bounded = (0, group_compaction_projections_part_03_1.truncatePostCompactBodyPreservingEdges)(lines.join("\n"), group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS);
        attachment = {
            schema: "ccm-group-post-compact-dynamic-context-delta-body-v1",
            scanMode,
            deferredTools: { ...deferredTools, addedLines: deferredTools.addedTexts, addedTexts: undefined },
            agentListing: { ...agentListing, addedLines: agentListing.addedTexts, addedTexts: undefined },
            mcpInstructions: { ...mcpInstructions, addedBlocks: mcpInstructions.addedTexts, addedTexts: undefined },
            loadedToolState,
            body: bounded.text,
            bodyChecksum: (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(bounded.text),
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
    const payload = {
        schema: "ccm-group-post-compact-dynamic-context-delta-v1",
        version: group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_DELTA_VERSION,
        group_id: groupId,
        group_session_id: groupSessionId,
        scope_id: `${groupId}::${groupSessionId}`,
        exact_session_only: true,
        cross_session_fallback_allowed: false,
        body_free: true,
        scan_mode: scanMode,
        prior_attachment_count: priorAttachments.length,
        attachment_count: attachment ? 1 : 0,
        max_attachment_tokens: group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS,
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
            state_checksum: (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(JSON.stringify({
                carried_names: loadedToolState.carriedNames,
                carried_hashes: loadedToolState.carriedHashes,
                dropped_names: loadedToolState.droppedNames,
            })),
        },
        catalog_checksum: crypto.createHash("sha256").update(JSON.stringify(catalogManifest)).digest("hex"),
        announced_state_checksum: crypto.createHash("sha256").update(JSON.stringify(announcedManifest)).digest("hex"),
        attachment_body_checksum: attachment ? (0, group_compaction_projections_part_03_1.dynamicContextTextHash)(attachment.body || "") : "",
        attachment_manifest_checksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
        created_at: String(options.now || new Date().toISOString()),
    };
    const receipt = { ...payload, receipt_checksum: (0, group_compaction_projections_part_03_1.postCompactDynamicContextDeltaReceiptChecksum)(payload) };
    return { attachment, receipt };
}
function buildGroupMicroCompactPlan(messages, options = {}) {
    const maxChars = Math.max(600, Number(options.maxChars || options.max_chars || 1800));
    const includeUser = options.includeUser === true || options.include_user === true;
    const timeBased = (0, group_compaction_projections_part_03_1.resolveGroupTimeBasedMicroCompact)(messages, options, includeUser);
    const records = [];
    let tokensBefore = 0;
    let tokensAfter = 0;
    for (let index = 0; index < (messages || []).length; index += 1) {
        const message = messages[index];
        if (!includeUser && message?.role === "user")
            continue;
        const content = (0, group_compaction_projections_part_01_1.messageContent)(message);
        if (!content)
            continue;
        const compacted = (0, context_budget_1.microCompactText)(content, maxChars);
        const artifacts = (0, group_compaction_projections_part_03_1.extractPostCompactArtifacts)(message);
        const timeBasedCleared = timeBased.clearSet.has(index);
        const clearedText = `${group_compaction_receipts_1.GROUP_TIME_BASED_MC_CLEARED_MESSAGE} #${(0, group_compaction_projections_part_01_1.messageIdentity)(message, index)}; raw transcript retained.`;
        const effectiveTokensAfter = timeBasedCleared ? (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(clearedText) : compacted.tokens_after;
        tokensBefore += compacted.tokens_before;
        tokensAfter += effectiveTokensAfter;
        if (!timeBasedCleared && !compacted.compacted && !artifacts.files.length && !artifacts.skills.length && !artifacts.verification.length && !artifacts.blockers.length)
            continue;
        records.push({
            messageId: (0, group_compaction_projections_part_01_1.messageIdentity)(message, index),
            index,
            role: message?.role || "",
            actor: (0, group_compaction_projections_part_01_1.messageActor)(message),
            agent: message?.agent || "",
            taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
            status: (0, group_compaction_projections_part_02_1.extractMessageStatus)(message),
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
            text: timeBasedCleared ? clearedText : compacted.compacted ? compacted.text : (0, group_compaction_projections_part_01_1.compactText)(content, Math.min(maxChars, 900)),
            files: artifacts.files,
            skills: artifacts.skills,
            verification: artifacts.verification,
            blockers: artifacts.blockers,
        });
    }
    const boundedRecords = records.slice(-group_compaction_receipts_1.GROUP_MICRO_COMPACT_MAX_RECORDS);
    const compactedRecords = boundedRecords.filter(item => item.compacted);
    return {
        schema: "ccm-group-micro-compact-v1",
        version: group_compaction_receipts_1.GROUP_MICRO_COMPACT_VERSION,
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
function buildPostCompactReinjectionPlan(messages, microCompact = {}, options = {}) {
    const fileBudget = Math.max(1, Number(options.fileBudget || options.file_budget || group_compaction_receipts_1.GROUP_POST_COMPACT_FILE_BUDGET));
    const skillBudget = Math.max(1, Number(options.skillBudget || options.skill_budget || group_compaction_receipts_1.GROUP_POST_COMPACT_SKILL_BUDGET));
    const verificationBudget = Math.max(1, Number(options.verificationBudget || options.verification_budget || group_compaction_receipts_1.GROUP_POST_COMPACT_VERIFICATION_BUDGET));
    const taskStatusBudget = Math.max(1, Number(options.taskStatusBudget || options.task_status_budget || group_compaction_receipts_1.GROUP_POST_COMPACT_TASK_STATUS_BUDGET));
    const fileRows = [];
    const skillRows = [];
    const verificationRows = [];
    const blockerRows = [];
    const addRows = (rows, values, source, kind) => {
        for (const value of values || [])
            rows.push({
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
            messageId: (0, group_compaction_projections_part_01_1.messageIdentity)(message, index),
            actor: (0, group_compaction_projections_part_01_1.messageActor)(message),
            taskId: message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "",
            status: (0, group_compaction_projections_part_02_1.extractMessageStatus)(message),
        };
        const artifacts = (0, group_compaction_projections_part_03_1.extractPostCompactArtifacts)(message);
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
    const uniqueRows = (rows, limit) => {
        const seen = new Set();
        const result = [];
        for (const row of rows.reverse()) {
            const key = String(row.value || "").toLowerCase();
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            result.unshift(row);
            if (result.length >= limit)
                break;
        }
        return result;
    };
    const fileCandidates = uniqueRows(fileRows, Math.max(fileBudget, fileRows.length || fileBudget));
    const exactGroupId = String(options.groupId || options.group_id || "").trim();
    const exactGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const preservedFileDedupProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
        ? (0, group_compaction_projections_part_03_1.buildGroupPostCompactFileRestoreDedupProjection)(fileCandidates, options.preservedMessages || options.preserved_messages || [], {
            groupId: exactGroupId,
            groupSessionId: exactGroupSessionId,
            fileBudget,
            now: options.now,
        })
        : null;
    const invokedSkillAttachmentProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
        ? (0, group_compaction_projections_part_03_1.buildGroupPostCompactInvokedSkillAttachmentProjection)(options.sessionMessages || options.session_messages || messages, {
            groupId: exactGroupId,
            groupSessionId: exactGroupSessionId,
            singleSkillMaxTokens: options.invokedSkillSingleMaxTokens || options.invoked_skill_single_max_tokens,
            totalMaxTokens: options.invokedSkillsTotalMaxTokens || options.invoked_skills_total_max_tokens,
            skillCatalog: options.skillCatalog || options.skill_catalog,
            now: options.now,
        })
        : null;
    const planAttachmentProjection = exactGroupId && exactGroupSessionId.startsWith("gcs_")
        ? (0, group_compaction_projections_part_03_1.buildGroupPostCompactPlanAttachmentProjection)(options.tasks || options.activeTasks || options.active_tasks || [], {
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
    const taskStatusMap = new Map();
    for (const row of Array.isArray(options.taskStatuses || options.task_statuses) ? (options.taskStatuses || options.task_statuses) : []) {
        const taskId = String(row?.task_id || row?.taskId || "").trim();
        const value = (0, group_compaction_projections_part_01_1.compactText)(row?.value || "", 1200);
        if (!taskId || !value)
            continue;
        taskStatusMap.delete(taskId);
        taskStatusMap.set(taskId, { ...row, task_id: taskId, kind: "task_status", value });
    }
    const taskStatuses = [...taskStatusMap.values()].slice(-taskStatusBudget);
    return {
        schema: "ccm-post-compact-reinjection-v1",
        version: group_compaction_receipts_1.GROUP_POST_COMPACT_REINJECT_VERSION,
        strategy: "restore_artifact_hints_after_summary_compact",
        budgets: {
            files: fileBudget,
            skills: skillBudget,
            verification: verificationBudget,
            taskStatuses: taskStatusBudget,
            invokedSkillSingleTokens: group_compaction_receipts_1.GROUP_POST_COMPACT_INVOKED_SKILL_MAX_TOKENS,
            invokedSkillsTotalTokens: group_compaction_receipts_1.GROUP_POST_COMPACT_INVOKED_SKILLS_TOTAL_MAX_TOKENS,
            currentPlanTokens: group_compaction_receipts_1.GROUP_POST_COMPACT_PLAN_MAX_TOKENS,
            dynamicContextTokens: group_compaction_receipts_1.GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS,
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
function buildGroupPostCompactRecoveryAudit(input = {}) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const boundary = input.boundary || {};
    const preservedSegment = input.preservedSegment || boundary.preservedSegment || boundary.post_compact_restore?.preservedSegment || null;
    const reinjectionPlan = input.postCompactReinject || boundary.post_compact_restore?.reinjectionPlan || null;
    const contextPressureWarning = input.contextPressureWarning || null;
    const contextBudget = input.contextBudget || boundary.context_budget || null;
    const transcriptPath = String(input.transcriptPath || boundary.post_compact_restore?.transcriptPath || "");
    const summaryChecksum = String(input.summaryChecksum || boundary.post_compact_restore?.summaryChecksum || "");
    const fromIndex = messages.findIndex((message, index) => (0, group_compaction_projections_part_01_1.messageIdentity)(message, index) === boundary.summarizedFromMessageId);
    const throughIndex = messages.findIndex((message, index) => (0, group_compaction_projections_part_01_1.messageIdentity)(message, index) === boundary.summarizedThroughMessageId);
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
    const addCheck = (checks, id, label, pass, severity, detail, evidence = []) => {
        checks.push({
            id,
            label,
            pass: pass === true,
            severity,
            detail: (0, group_compaction_projections_part_01_1.compactText)(detail, 700),
            evidence: evidence.map(item => (0, group_compaction_projections_part_01_1.compactText)(item, 260)).filter(Boolean).slice(0, 6),
        });
    };
    const checks = [];
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
        version: group_compaction_receipts_1.GROUP_POST_COMPACT_RECOVERY_AUDIT_VERSION,
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
function buildGroupPostCompactCleanupAudit(input = {}) {
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
    const skillHints = (0, group_compaction_projections_part_01_1.uniqueStrings)([
        ...(0, group_compaction_projections_part_01_1.stringArray)((reinjectionPlan?.skills || []).map((item) => item.value || item.name || item), 20),
        ...(Array.isArray(microCompact?.records) ? microCompact.records.flatMap((record) => (0, group_compaction_projections_part_01_1.stringArray)(record.skills || [], 8)) : []),
    ], 24);
    const checks = [];
    const addCheck = (id, label, pass, severity, detail, evidence = []) => {
        checks.push({
            id,
            label,
            pass: pass === true,
            severity,
            detail: (0, group_compaction_projections_part_01_1.compactText)(detail, 700),
            evidence: evidence.map(item => (0, group_compaction_projections_part_01_1.compactText)(item, 260)).filter(Boolean).slice(0, 6),
        });
    };
    addCheck("exact_group_session_bound", "cleanup is bound to one exact group session", !!groupId && groupSessionId.startsWith("gcs_") && scopeId === `${groupId}::${groupSessionId}`, "fatal", scopeId || "missing exact group-session scope");
    addCheck("main_agent_source_qualified", "cleanup source is the group main Agent", compactSource.kind === "group_main_agent" && compactSource.mainThreadEquivalent === true, "fatal", `${compactSource.kind}; querySource=${compactSource.querySource}`);
    addCheck("cross_scope_reset_forbidden", "cleanup cannot reset other group sessions or global Agent state", cleanupScope.allowsOtherGroupSessionReset === false && cleanupScope.allowsGlobalReset === false, "fatal", `otherGroupSession=${cleanupScope.allowsOtherGroupSessionReset}; global=${cleanupScope.allowsGlobalReset}`);
    addCheck("microcompact_tracking_reset_policy", "microcompact tracking reset policy recorded", !!microCompact?.schema || Number(microCompact?.recordCount || 0) === 0, "medium", microCompact?.schema
        ? `microCompact=${microCompact.schema}; records=${microCompact.recordCount || 0}; compacted=${microCompact.compactedMessageCount || 0}`
        : "no microcompact records; cleanup policy still records reset boundary");
    addCheck("raw_transcript_preserved", "raw transcript preserved before cleanup", !!transcriptPath, "fatal", transcriptPath ? `raw transcript=${transcriptPath}` : "missing raw transcript path");
    addCheck("child_context_packets_rebuilt", "child context packets must be rebuilt after compact", true, "high", "next child Agent dispatch derives a fresh memory packet from group memory, source manifest, gates, and raw transcript");
    addCheck("invoked_skills_preserved", "invoked skills are preserved across cleanup", true, "high", skillHints.length
        ? `preserved skill hints: ${skillHints.slice(0, 6).join(", ")}`
        : "no invoked skill hints detected; cleanup policy intentionally does not clear skill continuity snapshots");
    addCheck("recovery_audit_linked", "cleanup is linked to recovery audit", recoveryAudit?.schema === "ccm-post-compact-recovery-audit-v1" || input.partialSidecarOnly === true, "high", recoveryAudit?.schema
        ? `recovery=${recoveryAudit.status || "unknown"}; action=${recoveryAudit.action || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar only; primary recovery audit not required"
            : "missing post compact recovery audit");
    addCheck("strategy_decision_linked", "cleanup is linked to strategy decision", compactStrategyDecision?.schema === "ccm-group-compact-strategy-decision-v1", "high", compactStrategyDecision?.schema
        ? `mode=${compactStrategyDecision.mode || "unknown"}; decision=${compactStrategyDecision.decisionId || ""}`
        : "missing compact strategy decision");
    addCheck("api_microcompact_edit_plan_recorded", "API microcompact edit plan recorded", apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1" || input.partialSidecarOnly === true, "medium", apiMicroCompactEditPlan?.schema
        ? `edits=${apiMicroCompactEditPlan.editCount || 0}; advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}; trigger=${apiMicroCompactEditPlan.trigger?.value || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar only; primary API context edit plan not required"
            : "missing API microcompact edit plan");
    addCheck("preserved_segment_survives_cleanup", "preserved segment survives cleanup", preservedSegment?.schema === "ccm-group-preserved-segment-v1" || input.partialSidecarOnly === true, "high", preservedSegment?.schema
        ? `preserved=${preservedSegment.preservedMessageCount || 0}; first=${preservedSegment.firstPreservedMessageId || ""}; last=${preservedSegment.lastPreservedMessageId || ""}`
        : input.partialSidecarOnly === true
            ? "partial sidecar keeps raw transcript unchanged"
            : "missing preserved segment");
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
    const payload = {
        schema: "ccm-post-compact-cleanup-audit-v2",
        version: group_compaction_receipts_1.GROUP_POST_COMPACT_CLEANUP_AUDIT_VERSION,
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
    return { ...payload, audit_checksum: (0, group_compaction_receipts_1.groupPostCompactCleanupAuditChecksum)(payload) };
}
function buildGroupPartialCompactSidecarSegment(input) {
    const partial = input.partialCompact || {};
    if (!partial?.enabled || !partial?.sidecar)
        return null;
    const start = Math.max(0, Math.min((input.messages || []).length, Number(partial.rangeStartIndex ?? partial.selectedIndex ?? 0)));
    const end = Math.max(start, Math.min((input.messages || []).length - 1, Number(partial.rangeEndIndex ?? partial.selectedIndex ?? start)));
    const messagesToSummarize = (input.messages || []).slice(start, end + 1);
    if (!messagesToSummarize.length)
        return null;
    const fallback = buildDeterministicConversationSummary(messagesToSummarize, input.memory || {}, (0, group_compaction_projections_part_02_1.createEmptyConversationSummary)());
    const validation = (0, group_compaction_projections_part_01_1.validateSummaryPreservesFallback)(fallback, fallback);
    const factAnchors = (0, group_compaction_projections_part_01_1.mergeFactAnchors)([], (0, group_compaction_projections_part_01_1.extractFactAnchors)(messagesToSummarize));
    const persistentRequirements = (0, group_compaction_projections_part_01_1.mergePersistentRequirements)([], (0, group_compaction_projections_part_01_1.extractPersistentRequirements)(messagesToSummarize));
    const quality = (0, group_compaction_projections_part_01_1.evaluateGroupMemorySummaryQuality)(fallback, fallback, messagesToSummarize, input.memory || {}, {
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
    const sourceTokens = messagesToSummarize.reduce((sum, message) => sum + (0, group_compaction_projections_part_01_1.estimateGroupMessageTokens)(message), 0);
    const summaryChecksum = crypto.createHash("sha256").update(JSON.stringify(fallback)).digest("hex").slice(0, 24);
    const segmentKey = crypto.createHash("sha256").update([
        partial.direction,
        partial.summarizedFromMessageId,
        partial.summarizedThroughMessageId,
        summaryChecksum,
    ].join("\n")).digest("hex").slice(0, 20);
    return {
        schema: "ccm-group-partial-compact-segment-v1",
        version: group_compaction_receipts_1.GROUP_PARTIAL_COMPACT_VERSION,
        id: `partial-${segmentKey}`,
        direction: partial.direction,
        sidecar: true,
        range: {
            startIndex: start,
            endIndex: end,
            fromMessageId: (0, group_compaction_projections_part_01_1.messageIdentity)(messagesToSummarize[0], start),
            throughMessageId: (0, group_compaction_projections_part_01_1.messageIdentity)(messagesToSummarize[messagesToSummarize.length - 1], end),
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
        reason: (0, group_compaction_projections_part_01_1.compactText)(partial.reason || "", 500),
        createdAt: input.now || new Date().toISOString(),
    };
}
function mergeGroupPartialCompactSegments(existing = [], incoming = null, limit = group_compaction_receipts_1.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT) {
    const keyed = new Map();
    for (const segment of Array.isArray(existing) ? existing : []) {
        const key = segment?.id || `${segment?.range?.fromMessageId || ""}:${segment?.range?.throughMessageId || ""}:${segment?.summaryChecksum || ""}`;
        if (!key)
            continue;
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
function buildPartialSidecarOnlyMemory(input) {
    const previousState = input.memory?.compaction || {};
    const partialSegments = mergeGroupPartialCompactSegments(previousState.partialSegments, input.partialSegment);
    const compactStrategyDecision = input.compactStrategyDecision || previousState.compactStrategyDecision || null;
    const postCompactCleanupAudit = input.postCompactCleanupAudit || previousState.postCompactCleanupAudit || null;
    const apiMicroCompactEditPlan = input.apiMicroCompactEditPlan || previousState.apiMicroCompactEditPlan || null;
    return {
        ...input.memory,
        factAnchors: (0, group_compaction_projections_part_01_1.mergeFactAnchors)(input.memory?.factAnchors, Array.isArray(input.partialSegment?.factAnchors) ? input.partialSegment.factAnchors : []),
        persistentRequirements: (0, group_compaction_projections_part_01_1.mergePersistentRequirements)(input.memory?.persistentRequirements, Array.isArray(input.partialSegment?.persistentRequirements) ? input.partialSegment.persistentRequirements : []),
        compaction: {
            ...previousState,
            version: group_compaction_receipts_1.GROUP_MEMORY_COMPACTION_VERSION,
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
            partialSegments: partialSegments.slice(-group_compaction_receipts_1.GROUP_PARTIAL_COMPACT_SEGMENT_LIMIT),
            compactStrategyDecision,
            postCompactCleanupAudit,
            postCompactTaskStatusProjection: input.postCompactTaskStatusProjection || input.memory?.messageCompression?.postCompactTaskStatusProjection || null,
            apiMicroCompactEditPlan,
            lastCompressedAt: input.now,
        },
    };
}
function memorySeed(memory) {
    const completed = (memory?.completed || []).slice(-12).map((item) => `${item.project || "unknown"}: ${item.summary || ""}`);
    const blocked = (memory?.blocked || []).slice(-10).map((item) => `${item.project || "unknown"}: ${item.reason || item.summary || ""}`);
    const decisions = (memory?.decisions || []).slice(-12).map((item) => `${item.decision || ""}${item.reason ? `（${item.reason}）` : ""}`);
    return { completed, blocked, decisions };
}
function buildDeterministicConversationSummary(messages, memory, previous = {}) {
    const base = { ...(0, group_compaction_projections_part_02_1.createEmptyConversationSummary)(), ...(previous || {}) };
    const users = [];
    const files = [];
    const errors = [];
    const decisions = [];
    const completed = [];
    const pending = [];
    const participantState = [];
    const taskStates = [];
    const runtimeFacts = [];
    for (let index = 0; index < messages.length; index++) {
        const message = messages[index];
        const content = (0, group_compaction_projections_part_01_1.messageContent)(message);
        if (!content)
            continue;
        const id = (0, group_compaction_projections_part_01_1.messageIdentity)(message, index);
        const actor = message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
        if (message?.role === "user")
            users.push(`#${id} ${(0, group_compaction_projections_part_01_1.compactText)(content, 900)}`);
        files.push(...(0, group_compaction_projections_part_02_1.extractFiles)(message));
        runtimeFacts.push(...(0, group_compaction_projections_part_02_1.extractRuntimeSkillFacts)(message));
        if (/(错误|失败|异常|阻塞|超时|拒绝|error|failed|timeout|blocked)/i.test(content))
            errors.push(`${actor}: ${(0, group_compaction_projections_part_01_1.compactText)(content, 600)}`);
        if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
            decisions.push(`${actor}: ${message?.dispatchPolicy?.action || "delegate"}；${(0, group_compaction_projections_part_01_1.compactText)(message?.dispatchPolicy?.reason || content, 500)}`);
            for (const assignment of message.assignments || []) {
                if (!["done", "complete", "completed", "success"].includes(String(assignment?.status || "").toLowerCase())) {
                    pending.push(`${assignment?.project || assignment?.target || "unknown"}: ${(0, group_compaction_projections_part_01_1.compactText)(assignment?.task || assignment?.reason || "待执行", 500)}`);
                }
            }
        }
        const receiptStatus = String(message?.receipt?.status || message?.delivery_summary?.status || "").toLowerCase();
        const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
        if (taskId && receiptStatus)
            taskStates.push(`[${taskId}] ${receiptStatus}；${actor}：${(0, group_compaction_projections_part_01_1.compactText)(message?.receipt?.summary || message?.delivery_summary?.headline || content, 500)}`);
        if (["done", "complete", "completed", "success"].includes(receiptStatus) || message?.delivery_summary?.has_final_review) {
            completed.push(`${actor}: ${(0, group_compaction_projections_part_01_1.compactText)(message?.delivery_summary?.headline || message?.receipt?.summary || content, 600)}`);
        }
        if (message?.agent)
            participantState.push(`${message.agent}: ${receiptStatus || message?.workflow?.phase || "最近有发言"}`);
    }
    const seed = memorySeed(memory);
    const latestUser = [...messages].reverse().find((item) => item?.role === "user" && (0, group_compaction_projections_part_01_1.messageContent)(item));
    const latestMessage = [...messages].reverse().find((item) => (0, group_compaction_projections_part_01_1.messageContent)(item));
    const nextAction = (memory?.nextActions || []).slice(-1)[0];
    return {
        primaryRequest: (0, group_compaction_projections_part_01_1.compactText)((0, group_compaction_projections_part_01_1.messageContent)(latestUser) || base.primaryRequest || memory?.goal, 1200),
        userMessages: (0, group_compaction_projections_part_01_1.mergeUnique)(base.userMessages, users, 40, 900),
        keyConcepts: (0, group_compaction_projections_part_01_1.mergeUnique)(base.keyConcepts, runtimeFacts, 24, 400),
        filesAndCode: (0, group_compaction_projections_part_01_1.mergeUnique)(base.filesAndCode, files, 40, 500),
        errorsAndFixes: (0, group_compaction_projections_part_01_1.mergeUnique)(base.errorsAndFixes, errors, 30, 700),
        decisions: (0, group_compaction_projections_part_01_1.mergeUnique)(base.decisions, [...seed.decisions, ...decisions], 30, 700),
        completedWork: (0, group_compaction_projections_part_01_1.mergeUnique)(base.completedWork, [...seed.completed, ...completed], 30, 700),
        pendingTasks: (0, group_compaction_projections_part_01_1.mergeUnique)(base.pendingTasks, [...seed.blocked, ...pending], 30, 700),
        currentWork: (0, group_compaction_projections_part_01_1.compactText)((0, group_compaction_projections_part_01_1.messageContent)(latestMessage) || base.currentWork, 1200),
        nextStep: (0, group_compaction_projections_part_01_1.compactText)(nextAction?.action || nextAction || base.nextStep, 900),
        participantState: (0, group_compaction_projections_part_01_1.mergeUnique)(base.participantState, participantState, 20, 400),
        taskStates: (0, group_compaction_projections_part_01_1.mergeTaskStates)(base.taskStates, taskStates, 30),
    };
}
function normalizeSummary(value, fallback) {
    const raw = value?.conversationSummary || value?.summary || value || {};
    return {
        primaryRequest: (0, group_compaction_projections_part_01_1.compactText)(raw.primaryRequest || raw.primary_request || fallback.primaryRequest, 1200),
        userMessages: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.userMessages || raw.user_messages || fallback.userMessages, 40, 900),
        keyConcepts: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.keyConcepts || raw.key_concepts || fallback.keyConcepts, 24, 400),
        filesAndCode: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.filesAndCode || raw.files_and_code || fallback.filesAndCode, 40, 500),
        errorsAndFixes: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.errorsAndFixes || raw.errors_and_fixes || fallback.errorsAndFixes, 30, 700),
        decisions: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.decisions || fallback.decisions, 30, 700),
        completedWork: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.completedWork || raw.completed_work || fallback.completedWork, 30, 700),
        pendingTasks: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.pendingTasks || raw.pending_tasks || fallback.pendingTasks, 30, 700),
        currentWork: (0, group_compaction_projections_part_01_1.compactText)(raw.currentWork || raw.current_work || fallback.currentWork, 1200),
        nextStep: (0, group_compaction_projections_part_01_1.compactText)(raw.nextStep || raw.next_step || fallback.nextStep, 900),
        participantState: (0, group_compaction_projections_part_01_1.mergeUnique)([], raw.participantState || raw.participant_state || fallback.participantState, 20, 400),
        taskStates: (0, group_compaction_projections_part_01_1.mergeTaskStates)([], raw.taskStates || raw.task_states || fallback.taskStates, 30),
    };
}
function renderConversationSummary(summary, maxChars = 14_000) {
    if (!summary)
        return "";
    const normalized = normalizeSummary(summary, (0, group_compaction_projections_part_02_1.createEmptyConversationSummary)());
    const lines = [
        "群聊会话压缩摘要（压缩边界前的历史）：",
        `- 用户当前/最近主目标：${normalized.primaryRequest || "未明确"}`,
    ];
    const add = (title, items, limit = 10) => {
        if (!items?.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items.slice(-limit))
            lines.push(`  - ${item}`);
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
    if (normalized.currentWork)
        lines.push(`- 压缩前正在进行：${normalized.currentWork}`);
    if (normalized.nextStep)
        lines.push(`- 下一步：${normalized.nextStep}`);
    const text = lines.join("\n");
    if (text.length <= maxChars)
        return text;
    const head = Math.max(1, Math.floor(maxChars * 0.62));
    const tail = Math.max(1, maxChars - head - 36);
    return `${text.slice(0, head)}\n…[中间摘要已折叠，可回溯原始记录]…\n${text.slice(-tail)}`;
}
function buildBoundedRecentGroupContext(messages, fullCount = 5) {
    const rows = (messages || []).map((message, index) => {
        const who = message?.role === "user" ? `[用户 -> ${message?.target || "all"}]` : `[${message?.agent || message?.role || "Agent"}]`;
        const isFull = index >= messages.length - fullCount;
        const max = message?.role === "user" ? (isFull ? 5000 : 1200) : (isFull ? 6000 : 900);
        const compacted = (0, context_budget_1.microCompactText)((0, group_compaction_projections_part_01_1.messageContent)(message), max);
        const content = compacted.text;
        const originalLength = (0, group_compaction_projections_part_01_1.messageContent)(message).length;
        const suffix = compacted.compacted ? `\n[该消息原文 ${originalLength} 字符，已做 micro-compact；可按 #${(0, group_compaction_projections_part_01_1.messageIdentity)(message, index)} 回溯]` : "";
        return `${who} ${content}${suffix}`;
    });
    return rows.join("\n");
}
function buildGroupTruePostCompactPayloadBudget(input = {}) {
    const triggerTokens = Math.max(1, Number(input.triggerTokens || input.autoCompactThreshold || group_compaction_receipts_1.GROUP_COMPACT_TRIGGER_TOKENS));
    const summaryText = String(input.summaryText || input.messageDigest || "");
    const recentContext = buildBoundedRecentGroupContext(Array.isArray(input.keptMessages) ? input.keptMessages : [], Math.max(3, Number(input.fullCount || 5)));
    const components = {
        summary: (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(summaryText),
        recent_window: (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(recentContext),
        reinjection: (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(JSON.stringify(input.postCompactReinject || input.post_compact_reinject || {})),
        persistent_memory: (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(JSON.stringify({
            persistentRequirements: Array.isArray(input.persistentRequirements) ? input.persistentRequirements.slice(-12) : [],
            factAnchors: Array.isArray(input.factAnchors) ? input.factAnchors.slice(-12) : [],
        })),
        session_memory_restore: input.sessionMemory || input.session_memory
            ? (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(JSON.stringify(input.sessionMemory || input.session_memory))
            : 0,
        tool_continuity_restore: (0, group_compaction_projections_part_01_1.estimateGroupTextTokens)(JSON.stringify(input.toolContinuity || input.tool_continuity || {})),
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
    const contextBudget = (0, context_budget_1.buildContextBudget)({
        context: payloadProjection,
        maxChars: Math.max(48_000, triggerTokens * 4),
        maxTokens: triggerTokens,
    });
    const truePostCompactTokenCount = Number(contextBudget.estimated_tokens || 0);
    const willRetriggerNextTurn = truePostCompactTokenCount >= triggerTokens;
    const core = {
        schema: "ccm-group-true-post-compact-payload-budget-v1",
        version: group_compaction_receipts_1.GROUP_TRUE_POST_COMPACT_PAYLOAD_VERSION,
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
//# sourceMappingURL=group-compaction-projections-part-04.js.map