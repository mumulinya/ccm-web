"use strict";
// group-memory-context.ts — merged from 7 part files (behavior-freeze merge).
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
exports.buildExactGroupSessionModelContextProjection = exports.buildExactGroupSessionModelContextPacket = exports.buildChildParentSessionContextProjection = exports.buildChildParentSessionContextPacket = void 0;
exports.buildChildAgentTypeSummary = buildChildAgentTypeSummary;
exports.verifyGroupSessionMemoryFactSupersessionGraphForContext = verifyGroupSessionMemoryFactSupersessionGraphForContext;
exports.buildChildAgentSessionBinding = buildChildAgentSessionBinding;
exports.renderGroupPostCompactInvokedSkillAttachments = renderGroupPostCompactInvokedSkillAttachments;
exports.renderGroupPostCompactPlanAttachment = renderGroupPostCompactPlanAttachment;
exports.renderGroupPostCompactDynamicContextDelta = renderGroupPostCompactDynamicContextDelta;
exports.buildGroupMemoryContext = buildGroupMemoryContext;
exports.prepareGroupMemoryResumeProjection = prepareGroupMemoryResumeProjection;
exports.normalizePostCompactReinjectionRows = normalizePostCompactReinjectionRows;
exports.buildGroupMemoryPostCompactReinjectionGate = buildGroupMemoryPostCompactReinjectionGate;
exports.normalizeDynamicContextToolScope = normalizeDynamicContextToolScope;
exports.buildGroupPostCompactDynamicContextCatalog = buildGroupPostCompactDynamicContextCatalog;
exports.scheduleGroupMemoryAutoCompaction = scheduleGroupMemoryAutoCompaction;
exports.runGroupMemoryAutoCompactionNow = runGroupMemoryAutoCompactionNow;
exports.ensureGroupMemoryAutoCompactionHook = ensureGroupMemoryAutoCompactionHook;
exports.pressureMemoryProvenanceDisciplineStatus = pressureMemoryProvenanceDisciplineStatus;
exports.pressureMemoryProvenanceDisciplineUnderRepair = pressureMemoryProvenanceDisciplineUnderRepair;
exports.buildPressureMemoryProvenanceReceiptDiscipline = buildPressureMemoryProvenanceReceiptDiscipline;
exports.buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall = buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall;
exports.isPostCompactReinjectionRepairReceiptRecallQuery = isPostCompactReinjectionRepairReceiptRecallQuery;
exports.buildPostCompactReinjectionRepairReceiptWorkerContextRecall = buildPostCompactReinjectionRepairReceiptWorkerContextRecall;
exports.buildAgentMemoryContextBundle = buildAgentMemoryContextBundle;
exports.buildAgentMemoryContextBundleWithManifestSelection = buildAgentMemoryContextBundleWithManifestSelection;
exports.renderGroupMemoryContextBundle = renderGroupMemoryContextBundle;
exports.buildGlobalGroupMemoryContext = buildGlobalGroupMemoryContext;
exports.renderGlobalGroupMemoryContextBundle = renderGlobalGroupMemoryContextBundle;
exports.buildGroupContextPacket = buildGroupContextPacket;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const context_budget_1 = require("../../system/context-budget");
const tool_manager_1 = require("../../tools/tool-manager");
const runtime_1 = require("../../agents/runtime");
const group_runtime_memory_admission_1 = require("./group-runtime-memory-admission");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const storage_1 = require("./storage");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
const memory_1 = require("../../agents/global/memory");
const group_post_turn_summary_1 = require("./group-post-turn-summary");
const group_compact_head_1 = require("./group-compact-head");
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const provider_native_compact_session_capacity_1 = require("./provider-native-compact-session-capacity");
const group_memory_auto_compact_circuit_breaker_1 = require("./group-memory-auto-compact-circuit-breaker");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_agent_memory_packet_1 = require("./group-agent-memory-packet");
const group_compact_file_references_1 = require("./group-compact-file-references");
const group_global_memory_arbitration_1 = require("./group-global-memory-arbitration");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_auto_compact_hook_state_1 = require("./group-memory-auto-compact-hook-state");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
const group_tool_continuity_1 = require("./group-tool-continuity");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
const group_compaction_activity_1 = require("./group-compaction-activity");
const session_memory_window_1 = require("../../system/session-memory-window");
// ===== merged from group-memory-context-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function buildChildAgentTypeSummary(memory = {}) {
    const typeMap = new Map();
    const normalize = (value) => {
        const raw = String(value || "").trim().toLowerCase();
        if (!raw)
            return "unknown";
        if (/(claude|claudecode|claude-code|cc\b)/i.test(raw))
            return "claudecode";
        if (/cursor/i.test(raw))
            return "cursor";
        if (/codex/i.test(raw))
            return "codex";
        return raw.replace(/[^a-z0-9._:-]+/g, "-").slice(0, 80) || "unknown";
    };
    const add = (project, agentType, source = "memory") => {
        const targetProject = String(project || "").trim();
        if (!targetProject)
            return;
        const type = normalize(agentType || targetProject);
        const row = typeMap.get(type) || { agentType: type, targetCount: 0, targets: [] };
        if (!row.targets.some((item) => item.targetProject === targetProject)) {
            row.targetCount++;
            row.targets.push({ targetProject, source, rawAgentType: String(agentType || "").trim() });
        }
        typeMap.set(type, row);
    };
    for (const [project, agentMemory] of Object.entries(memory?.agentMemories || {})) {
        add(project, agentMemory?.agentType || agentMemory?.agent_type || agentMemory?.agent || "", "agent_memory");
    }
    for (const entry of Array.isArray(memory?.workerLedger) ? memory.workerLedger.slice(-30) : []) {
        add(entry.project || entry.target_project || entry.agent, entry.agentType || entry.agent_type || entry.runner || "", "worker_ledger");
    }
    const rows = Array.from(typeMap.values()).sort((a, b) => String(a.agentType).localeCompare(String(b.agentType)));
    if (!rows.length)
        return null;
    return {
        schema: "ccm-child-agent-type-summary-v1",
        agentTypeCount: rows.length,
        targetCount: rows.reduce((sum, row) => sum + Number(row.targetCount || 0), 0),
        rows
    };
}
function verifyGroupSessionMemoryFactSupersessionGraphForContext(graph) {
    if (!graph?.checksum || graph.schema !== "ccm-group-session-memory-fact-supersession-graph-v1")
        return false;
    const payload = { ...graph };
    delete payload.checksum;
    if ((0, group_memory_shared_1.hashSessionMemoryText)(JSON.stringify(payload), 64) !== String(graph.checksum || ""))
        return false;
    const facts = Array.isArray(graph.facts) ? graph.facts : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const factById = new Map(facts.map((fact) => [String(fact.factId || ""), fact]));
    return edges.every((edge) => {
        const oldFact = factById.get(String(edge.oldFactId || ""));
        return !!oldFact
            && oldFact.status === "superseded"
            && String(oldFact.factChecksum || "") === String(edge.oldFactChecksum || "")
            && String(oldFact.supersessionEdgeId || "") === String(edge.edgeId || "")
            && !!String(edge.sourceMessageId || "").trim()
            && !!String(edge.replacementText || "").trim()
            && (0, group_memory_shared_1.hashSessionMemoryText)(edge.replacementText, 32) === String(edge.newFactChecksum || "")
            && (0, group_memory_shared_1.hashSessionMemoryText)(edge.sourceMessageText, 32) === String(edge.sourceMessageChecksum || "");
    });
}
function buildChildAgentSessionBinding(groupId, targetProject, task = "", options = {}) {
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const taskId = String(options.taskId || options.task_id || options.task?.id || "").trim();
    const traceId = String(options.traceId || options.trace_id || options.task?.trace_id || options.task?.traceId || "").trim();
    const taskAgentSessionId = String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionRecordId || options.session_record_id || "").trim();
    const nativeSessionId = String(options.nativeSessionId || options.native_session_id || "").trim();
    const agentType = String(options.agentType || options.agent_type || "").trim();
    const executionId = String(options.executionId || options.execution_id || "").trim();
    const parentRunId = String(options.parentRunId || options.parent_run_id || options.globalRunId || options.global_run_id || "").trim();
    const turn = Number(options.taskAgentSessionTurn || options.task_agent_session_turn || options.sessionTurn || options.session_turn || 0);
    const bindingId = `csm:${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        groupSessionId,
        targetProject,
        taskId,
        taskAgentSessionId,
        nativeSessionId,
        agentType,
        executionId,
        parentRunId,
        task ? (0, group_memory_shared_1.hashSessionMemoryText)(task, 12) : "",
    ])).digest("hex").slice(0, 14)}`;
    return {
        schema: "ccm-child-agent-memory-session-binding-v1",
        binding_id: bindingId,
        group_id: groupId,
        group_session_id: groupSessionId,
        target_project: targetProject,
        task_id: taskId,
        trace_id: traceId,
        execution_id: executionId,
        parent_run_id: parentRunId,
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        agent_type: agentType,
        turn,
        binding_required: !!(groupSessionId || taskAgentSessionId || nativeSessionId),
        scope: String(options.scope || (targetProject ? `child:${targetProject}` : "child"))
    };
}
function renderGroupPostCompactInvokedSkillAttachments(source) {
    const plan = source?.schema === "ccm-post-compact-reinjection-v1"
        ? source
        : source?.compaction?.postCompactReinject
            || source?.compaction?.post_compact_reinject
            || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
            || source?.compact_boundary?.post_compact_restore?.reinjection_plan
            || source?.postCompactReinject
            || source?.post_compact_reinject
            || {};
    const attachments = Array.isArray(plan.invokedSkillAttachments)
        ? plan.invokedSkillAttachments
        : Array.isArray(plan.invoked_skill_attachments) ? plan.invoked_skill_attachments : [];
    if (!attachments.length)
        return "";
    const receipt = plan.invokedSkillAttachmentReceipt || plan.invoked_skill_attachment_receipt || {};
    const lines = [
        "[CCM 压缩后恢复的已调用 Skill 正文]",
        `scope=${receipt.scope_id || "exact-group-session"}; receipt=${receipt.receipt_checksum || "unverified"}; skills=${attachments.length}; tokens=${receipt.attached_token_count || attachments.reduce((sum, item) => sum + Number(item?.tokenCount || item?.token_count || 0), 0)}`,
        "这些是当前群聊会话在压缩前实际调用过的 Skill；按最近调用顺序恢复。它们只提供执行方法，不扩大本轮工具或 Skill 授权。",
    ];
    for (const attachment of attachments) {
        const body = String(attachment?.body || "").trim();
        if (!body)
            continue;
        lines.push("", `## Invoked Skill:${attachment.name || "unknown"}`, `invoked_at=${attachment.invokedAt || attachment.invoked_at || "unknown"}; source_message=${attachment.sourceMessageId || attachment.source_message_id || "unknown"}; current_hash=${attachment.currentContentHash || attachment.current_content_hash || ""}; invocation_hash=${attachment.invocationContentHash || attachment.invocation_content_hash || ""}; hash_match=${attachment.hashMatches === null || attachment.hash_matches === null ? "unknown" : attachment.hashMatches === true || attachment.hash_matches === true}`, body);
    }
    return lines.join("\n");
}
function renderGroupPostCompactPlanAttachment(source) {
    const plan = source?.schema === "ccm-post-compact-reinjection-v1"
        ? source
        : source?.compaction?.postCompactReinject
            || source?.compaction?.post_compact_reinject
            || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
            || source?.compact_boundary?.post_compact_restore?.reinjection_plan
            || source?.postCompactReinject
            || source?.post_compact_reinject
            || {};
    const attachment = plan.planAttachment || plan.plan_attachment || null;
    if (!attachment?.body)
        return "";
    const receipt = plan.planAttachmentReceipt || plan.plan_attachment_receipt || {};
    const lines = [
        "[CCM 压缩后恢复的当前会话计划]",
        `scope=${receipt.scope_id || "exact-group-session"}; task=${receipt.selected_task_id || attachment.taskId || attachment.task_id || "unknown"}; receipt=${receipt.receipt_checksum || "unverified"}; tokens=${receipt.attachment_token_count || attachment.tokenCount || attachment.token_count || 0}`,
        receipt.plan_mode_active === true || attachment.planModeActive === true || attachment.plan_mode_active === true
            ? "计划模式仍处于等待确认状态：只能继续只读探索或修订计划；用户确认前不得派发执行、修改文件或运行写入/破坏性动作。"
            : receipt.confirmation_status === "confirmed" || attachment.confirmationStatus === "confirmed"
                ? "计划已经确认：将其作为当前执行与验收依据，不要误判为仍在等待确认。"
                : "这是当前精确群聊会话的计划引用；执行前仍需核对实时任务状态和当前授权。",
        String(attachment.body || "").trim(),
    ];
    return lines.join("\n");
}
function renderGroupPostCompactDynamicContextDelta(source) {
    const plan = source?.schema === "ccm-post-compact-reinjection-v1"
        ? source
        : source?.compaction?.postCompactReinject
            || source?.compaction?.post_compact_reinject
            || source?.compactBoundary?.post_compact_restore?.reinjectionPlan
            || source?.compact_boundary?.post_compact_restore?.reinjection_plan
            || source?.postCompactReinject
            || source?.post_compact_reinject
            || {};
    const attachment = plan.dynamicContextDeltaAttachment || plan.dynamic_context_delta_attachment || null;
    if (!attachment?.body)
        return "";
    const receipt = plan.dynamicContextDeltaReceipt || plan.dynamic_context_delta_receipt || {};
    return [
        "[CCM 压缩后动态运行上下文差异]",
        `scope=${receipt.scope_id || "exact-group-session"}; mode=${receipt.scan_mode || attachment.scanMode || "full"}; receipt=${receipt.receipt_checksum || "unverified"}; tokens=${receipt.attachment_token_count || attachment.tokenCount || 0}`,
        "工具、Agent 和 MCP instructions 只按当前授权与连接状态恢复；removed 项不得继续调用，附件本身不扩大权限。",
        String(attachment.body || "").trim(),
    ].join("\n");
}
function buildGroupMemoryContext(memory) {
    const modelRuntime = (0, group_runtime_memory_admission_1.modelVisibleGroupRuntimeState)(memory);
    const groupSessionMemoryScopeId = memory?.groupSessionId && memory.groupSessionId !== "default"
        ? `${memory.groupId || ""}--${memory.groupSessionId}`
        : memory?.groupId || "";
    const sessionMemory = (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(groupSessionMemoryScopeId);
    const canonicalSessionMemory = (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(sessionMemory);
    if (!memory || (!memory.goal && !memory.summary && !memory.messageDigest && !memory.conversationSummary && !canonicalSessionMemory && !memory.toolContinuity?.schema && !memory.compaction?.postCompactReinject?.invokedSkillAttachments?.length && !memory.compaction?.postCompactReinject?.planAttachment && !memory.compaction?.postCompactReinject?.dynamicContextDeltaAttachment && !modelRuntime.decisions.length && !memory.completed?.length && !memory.blocked?.length && !memory.workerLedger?.length && !Object.keys(memory.agentMemories || {}).length && !memory.openQuestions?.length && !modelRuntime.nextActions.length)) {
        return "";
    }
    const lines = [
        "群聊协作记忆（主 Agent 必须参考，避免重复派发和遗忘上下文）：",
        `- 原始/当前目标：${memory.goal || "未记录"}`,
        `- 当前阶段：${memory.currentPhase || "idle"}`,
    ];
    if (memory.summary)
        lines.push(`- 压缩摘要：${(0, group_memory_shared_1.compactMemoryText)(memory.summary, 900)}`);
    if (memory.messageDigest)
        lines.push(`- 群聊旧消息压缩：${(0, group_memory_shared_1.compactMemoryText)(memory.messageDigest, 900)}`);
    const invokedSkillAttachmentText = renderGroupPostCompactInvokedSkillAttachments(memory);
    if (invokedSkillAttachmentText)
        lines.push(invokedSkillAttachmentText);
    const planAttachmentText = renderGroupPostCompactPlanAttachment(memory);
    if (planAttachmentText)
        lines.push(planAttachmentText);
    const dynamicContextDeltaText = renderGroupPostCompactDynamicContextDelta(memory);
    if (dynamicContextDeltaText)
        lines.push(dynamicContextDeltaText);
    if (canonicalSessionMemory) {
        lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；该文件是压缩后主/子 Agent 可重注入的会话级短记忆。`);
        const cadence = sessionMemory.updateCadence || sessionMemory.update_cadence || {};
        if (cadence.schema) {
            lines.push(`- Session Memory 更新节奏：${cadence.status || "unknown"}；cursor=${cadence.lastExtractionCursorStatus || "legacy"}；advance=${cadence.cursorAdvanceStatus || "legacy"}；delta=${cadence.tokensSinceLastExtraction || 0} tokens；toolCalls=${cadence.toolCallsSinceLastExtraction || 0}；scan=${cadence.toolCallScanMessageCount || 0} messages。`);
            if (cadence.cursorAdvanceStatus === "held_tool_use_boundary")
                lines.push(`- 本轮 Session Memory 已更新，但抽取游标保持在 ${cadence.cursorAfter || cadence.cursorBefore || "session-start"}，原因：最后一个 assistant turn 仍含工具调用；后续项目子 Agent 必须保留完整 tool_use/tool_result 边界。`);
        }
    }
    const sessionMemorySelection = memory.compaction?.sessionMemoryCompactSelection
        || memory.compactBoundary?.sessionMemoryCompactSelection
        || memory.messageCompression?.sessionMemoryCompactSelection;
    if (sessionMemorySelection?.schema === "ccm-group-session-memory-compact-selection-v1") {
        const closure = sessionMemorySelection.api_invariant_closure || {};
        lines.push(`- Session Memory 压缩选择：${sessionMemorySelection.status || "unknown"}；cursor=${sessionMemorySelection.cursor_status || "unknown"}；保留 ${sessionMemorySelection.preserved_message_count || 0} 条 / 约 ${sessionMemorySelection.preserved_token_estimate || 0} tokens；API invariant closure=${closure.pass === true ? `pass(+${closure.expanded_message_count || 0})` : closure.schema ? "fail" : "unknown"}；compaction API called=${sessionMemorySelection.compaction_api_called === true}${sessionMemorySelection.fallback_reason ? `；fallback=${sessionMemorySelection.fallback_reason}` : ""}。`);
        if (sessionMemorySelection.template_empty_checked === true) {
            lines.push(`- Session Memory 模板空状态：scope=${sessionMemorySelection.template_scope_id || "unknown"}；source=${sessionMemorySelection.template_source || "unknown"}；sections=${sessionMemorySelection.template_section_count || 0}；templateOnly=${sessionMemorySelection.template_only === true}；checksum=${sessionMemorySelection.template_checksum || "unknown"}。只有包含模板之外的实际内容时才允许 compact 复用。`);
        }
    }
    const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : (0, group_tool_continuity_1.readGroupToolContinuitySnapshotSummary)(memory.groupId || "");
    if (toolContinuity?.schema && ((0, group_memory_shared_1.hasToolGrantSet)(toolContinuity.allowedTools) || (0, group_memory_shared_1.hasToolGrantSet)(toolContinuity.requested) || (toolContinuity.invokedSkills || []).length || toolContinuity.markdownExists)) {
        lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；allowed MCP ${(toolContinuity.allowedTools?.mcp || []).length}/Skill ${(toolContinuity.allowedTools?.skill || []).length}；invokedSkill ${(toolContinuity.invokedSkills || []).length}；只恢复工具上下文，不扩大授权，真实派发仍以当前 runtime tool gate 为准。`);
    }
    if (memory.compactBoundary) {
        const boundary = memory.compactBoundary;
        const budget = boundary.context_budget || {};
        lines.push(`- 群聊压缩边界：${boundary.summarizedFromMessageId || ""} -> ${boundary.summarizedThroughMessageId || ""}；保留 ${boundary.preservedMessageIds?.length || 0} 条锚点；压缩前 ${boundary.preCompactTokenCount || 0} tokens，压缩后 ${boundary.postCompactTokenCount || 0} tokens，压力 ${budget.pressure ?? 0}%。`);
        if (boundary.preservedSegment?.schema) {
            lines.push(`- 保留窗口：preservedSegment 保留 ${boundary.preservedSegment.preservedMessageCount || 0} 条 / 约 ${boundary.preservedSegment.preservedTokenEstimate || 0} tokens / ${boundary.preservedSegment.preservedTextBlockMessageCount || 0} 条文本消息；首条 ${boundary.preservedSegment.firstPreservedMessageId || "unknown"}。`);
        }
    }
    if (memory.messageCompression?.compressedMessages)
        lines.push(`- 压缩状态：共 ${memory.messageCompression.totalMessages || 0} 条消息，旧消息压缩 ${memory.messageCompression.compressedMessages || 0} 条，近期原文 ${memory.messageCompression.recentLimit || 0} 条。`);
    const resumeBaseline = memory.compaction?.resumeEffectiveTokenBaseline || memory.messageCompression?.resumeEffectiveTokenBaseline;
    if (resumeBaseline?.schema && (0, group_memory_shared_1.validateGroupMemoryResumeEffectiveTokenBaseline)(resumeBaseline)) {
        lines.push(`- 恢复后有效上下文：raw ${resumeBaseline.rawTranscriptTokens || 0} tokens；省略旧正文 ${resumeBaseline.omittedRawTokens || 0}；重放 snip 删除 ${resumeBaseline.snipRemovedMessageCount || 0} 条 / 约 ${resumeBaseline.snipRemovedTokenEstimate || 0} tokens；摘要 ${resumeBaseline.summaryTokens || 0} + 投影 ${resumeBaseline.projectedMessageTokens || 0} = effective ${resumeBaseline.effectiveContextTokens || 0}；排除旧 provider usage ${resumeBaseline.staleProviderUsageTokensExcluded || 0}。`);
    }
    const pressureWarning = memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning;
    if (pressureWarning?.schema) {
        lines.push(`- 上下文压力：${pressureWarning.level || "unknown"}；使用约 ${pressureWarning.tokenUsage || 0} tokens，距 auto-compact ${pressureWarning.percentLeft ?? "unknown"}%；建议 ${pressureWarning.recommendation || "continue"}${pressureWarning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
    }
    const addList = (title, items, mapper) => {
        if (!items?.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of items.slice(-6))
            lines.push(`  - ${mapper(item)}`);
    };
    addList("关键决策", modelRuntime.decisions, (item) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`);
    addList("已完成", memory.completed || [], (item) => `${item.project || "unknown"}：${item.summary || ""}`);
    addList("阻塞/未完成", memory.blocked || [], (item) => `${item.project || "unknown"}：${item.reason || ""}`);
    const postCompactTaskStatuses = memory.compaction?.postCompactReinject?.taskStatuses
        || memory.compactBoundary?.post_compact_restore?.reinjectionPlan?.taskStatuses
        || [];
    addList("压缩后子任务状态", postCompactTaskStatuses, (item) => item.value || `${item.task_id || item.taskId || "unknown"} [${item.status || "unknown"}] ${item.description || item.delta_summary || ""}`);
    addList("Worker scratchpad", memory.workerLedger || [], (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`);
    addList("开放问题", memory.openQuestions || [], (item) => String(item.question || item));
    addList("下一步", modelRuntime.nextActions, (item) => String(item.action || item));
    return lines.join("\n");
}
function prepareGroupMemoryResumeProjection(groupId, groupSessionId, allMessages, storedMemory, options = {}) {
    const projectionOptions = {
        groupId,
        sessionId: groupSessionId,
        messages: allMessages,
        memory: storedMemory
    };
    const compactionConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.config || options.compactionConfig || options.compaction_config || {});
    const modelSummaryRequired = String(compactionConfig.memoryCompactionMode || "").toLowerCase() === "model-required";
    const storedSummarySource = String(storedMemory?.compaction?.summarySource || storedMemory?.compactBoundary?.summarySource || "");
    const requiresModelSummaryMigration = modelSummaryRequired
        && !!storedMemory?.compactBoundary?.id
        && storedSummarySource !== "model";
    const before = (0, group_memory_boundary_journal_1.buildGroupMemoryResumeProjection)(projectionOptions);
    const recoveryRequired = before.status === "fail_closed_rebuild_required" || requiresModelSummaryMigration;
    let recoveryRotation = null;
    let memoryBase = storedMemory;
    if (recoveryRequired) {
        if (before.reason === "boundary_journal_invalid") {
            recoveryRotation = (0, group_memory_boundary_journal_1.quarantineInvalidGroupMemoryBoundaryJournal)(groupId, groupSessionId);
        }
        else if (before.reason === "memory_boundary_missing") {
            recoveryRotation = (0, group_memory_boundary_journal_1.retireGroupMemoryBoundaryJournal)(groupId, groupSessionId);
        }
        const recoveryReason = requiresModelSummaryMigration ? "model_summary_migration_required" : before.reason;
        memoryBase = (0, group_memory_shared_1.clearUntrustedGroupCompactionState)(storedMemory, recoveryReason);
        if (requiresModelSummaryMigration && groupSessionId.startsWith("gcs_")) {
            scheduleGroupMemoryAutoCompaction(groupId, {
                sessionId: groupSessionId,
                force: true,
                rebuild: true,
                reason: "model_summary_migration",
            });
        }
    }
    const beforeBaseline = (0, group_memory_shared_1.buildGroupMemoryResumeEffectiveTokenBaseline)(before, memoryBase, allMessages, options);
    const canReuseVerifiedProjection = !recoveryRequired
        && beforeBaseline
        && (0, group_memory_shared_1.validateGroupMemoryResumeEffectiveTokenBaseline)(beforeBaseline)
        && beforeBaseline.pressureWarning?.flags?.isAboveAutoCompactThreshold !== true;
    let memory;
    let projection;
    let resumeBaseline = null;
    let sessionMemoryCadenceDecision = null;
    let skippedFullSnapshotRefresh = false;
    if (canReuseVerifiedProjection) {
        const persisted = (0, group_memory_storage_1.persistGroupMemoryResumeEffectiveTokenBaseline)(groupId, groupSessionId, allMessages, memoryBase, before, options);
        memory = persisted.memory;
        projection = before;
        resumeBaseline = persisted.baseline;
        sessionMemoryCadenceDecision = persisted.cadenceDecision;
        skippedFullSnapshotRefresh = true;
    }
    else {
        memory = (0, group_session_memory_snapshot_1.refreshGroupConversationMemorySnapshot)(groupId, allMessages, memoryBase, {
            ...options,
            config: compactionConfig,
            modelSummaryRequired,
            groupSessionId
        });
        projection = (0, group_memory_boundary_journal_1.buildGroupMemoryResumeProjection)({
            groupId,
            sessionId: groupSessionId,
            messages: allMessages,
            memory
        });
        if (projection.status === "verified") {
            const persisted = (0, group_memory_storage_1.persistGroupMemoryResumeEffectiveTokenBaseline)(groupId, groupSessionId, allMessages, memory, projection, options);
            memory = persisted.memory;
            resumeBaseline = persisted.baseline;
            sessionMemoryCadenceDecision = persisted.cadenceDecision;
        }
    }
    if (!memory?.compactBoundary && projection.status === "fail_closed_rebuild_required") {
        recoveryRotation = (0, group_memory_boundary_journal_1.retireGroupMemoryBoundaryJournal)(groupId, groupSessionId);
        projection = (0, group_memory_boundary_journal_1.buildGroupMemoryResumeProjection)({
            groupId,
            sessionId: groupSessionId,
            messages: allMessages,
            memory
        });
    }
    let compactHeadRecovery = null;
    if (projection.status === "verified" && memory?.compactBoundary?.id) {
        try {
            compactHeadRecovery = (0, group_compact_head_1.reconcileGroupCompactHeadFromMemory)({ groupId, groupSessionId, memory });
        }
        catch (error) {
            compactHeadRecovery = {
                schema: "ccm-group-compact-head-restart-recovery-v1",
                version: 1,
                groupId,
                groupSessionId,
                boundaryId: String(memory?.compactBoundary?.id || ""),
                status: "failed",
                recovered: false,
                issues: [(0, group_memory_shared_1.compactMemoryText)(error?.message || error, 300)]
            };
        }
    }
    const compactHeadIsCurrent = ["current", "recovered"].includes(String(compactHeadRecovery?.status || ""));
    const recoveredCompactHead = compactHeadIsCurrent
        ? compactHeadRecovery?.head || (groupSessionId.startsWith("gcs_") ? (0, group_compact_head_1.readGroupCompactHead)(groupId, groupSessionId) : null)
        : null;
    const providerNativeCompactSessionCapacityReconciliation = recoveredCompactHead
        ? (0, provider_native_compact_session_capacity_1.reconcileProviderNativeCompactSessionCapacityReset)({
            groupId,
            groupSessionId,
            compactHead: recoveredCompactHead,
            reason: compactHeadRecovery?.status === "recovered"
                ? "restart_reconcile_recovered_compact_head"
                : "resume_reconcile_current_compact_head"
        })
        : compactHeadRecovery && !compactHeadIsCurrent
            ? {
                schema: "ccm-provider-native-compact-session-capacity-reconciliation-v1",
                version: 1,
                group_id: groupId,
                group_session_id: groupSessionId,
                status: "fail_closed",
                recovered: false,
                idempotent: false,
                issues: Array.isArray(compactHeadRecovery.issues) ? compactHeadRecovery.issues.slice(0, 8) : ["compact_head_not_current"]
            }
            : null;
    const proof = (0, group_memory_boundary_journal_1.recordGroupMemoryResumeProjectionProof)(projection, {
        recovered: recoveryRequired,
        recoveryReason: recoveryRequired ? before.reason : "",
        priorStatus: before.status,
        priorReason: before.reason,
        resumeBaseline,
        compactHeadRecovery,
        providerNativeCompactSessionCapacityReconciliation
    });
    return {
        schema: "ccm-group-memory-resume-preparation-v1",
        groupId,
        groupSessionId,
        memory,
        projection,
        proof,
        resumeBaseline,
        sessionMemoryCadenceDecision,
        skippedFullSnapshotRefresh,
        compactHeadRecovery,
        providerNativeCompactSessionCapacityReconciliation,
        recovered: recoveryRequired,
        recoveryReason: recoveryRequired ? before.reason : "",
        recoveryRotation
    };
}
function normalizePostCompactReinjectionRows(plan = {}) {
    const normalize = (kind, rows) => (Array.isArray(rows) ? rows : [])
        .map((row) => {
        const value = (0, group_memory_shared_1.compactMemoryText)(row?.value || row, 260);
        const sourceMessageId = String(row?.sourceMessageId || row?.source_message_id || "");
        const candidateId = String(row?.candidate_id || row?.candidateId || "")
            || `pcrc_${crypto.createHash("sha256").update(JSON.stringify([kind, value, sourceMessageId])).digest("hex").slice(0, 12)}`;
        return {
            candidate_id: candidateId,
            kind,
            value,
            sourceMessageId,
            actor: String(row?.actor || ""),
            taskId: String(row?.taskId || row?.task_id || "")
        };
    })
        .filter((row) => row.value);
    return [
        ...normalize("file", plan.files),
        ...normalize("skill", plan.skills),
        ...normalize("verification", plan.verification),
        ...normalize("blocker", plan.blockers),
        ...normalize("task_status", plan.taskStatuses || plan.task_statuses),
    ];
}
function buildGroupMemoryPostCompactReinjectionGate(input = {}) {
    const plan = input.postCompactReinject || input.post_compact_reinject || input.reinjectionPlan || input.reinjection_plan || {};
    const candidates = normalizePostCompactReinjectionRows(plan);
    if (!candidates.length && plan.hasCandidates !== true)
        return null;
    const recoveryAudit = input.postCompactRecoveryAudit || input.post_compact_recovery_audit || {};
    const summaryChecksum = String(input.summaryChecksum
        || input.summary_checksum
        || recoveryAudit.summaryChecksum
        || recoveryAudit.summary_checksum
        || "");
    const generatedAt = input.generatedAt || input.generated_at || new Date().toISOString();
    const targetProject = String(input.targetProject || input.target_project || "");
    const groupId = String(input.groupId || input.group_id || "");
    const gateId = `pcrg_${crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        summaryChecksum,
        candidates.map((item) => [item.kind, item.value, item.sourceMessageId]),
    ])).digest("hex").slice(0, 18)}`;
    const status = recoveryAudit.status === "failed"
        ? "recovery_audit_failed"
        : recoveryAudit.status === "degraded"
            ? "degraded_reinject"
            : "required";
    return {
        schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
        version: group_memory_shared_1.GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION,
        reinjection_gate_id: gateId,
        group_id: groupId,
        target_project: targetProject,
        scope: String(input.scope || (targetProject ? `child:${targetProject}` : "child")),
        generated_at: generatedAt,
        status,
        action: status === "recovery_audit_failed"
            ? "verify_raw_transcript_before_using_reinjection_candidates"
            : "review_reinjection_candidates_before_execution",
        candidate_count: candidates.length,
        candidates: candidates.slice(0, 24),
        post_compact_recovery_audit: {
            status: recoveryAudit.status || "",
            pass: recoveryAudit.pass === true,
            action: recoveryAudit.action || "",
            boundary_id: recoveryAudit.boundaryId || recoveryAudit.boundary_id || "",
            summary_checksum: summaryChecksum,
            transcript_path: recoveryAudit.transcriptPath || recoveryAudit.transcript_path || ""
        },
        receipt_contract: {
            memory_used_should_reference_gate: true,
            memory_ignored_should_reference_gate: true,
            required_receipt_fields: ["memoryUsed", "memoryIgnored", "postCompactCandidateUsage"],
            required_reference: gateId,
            required_candidate_reference: "all_candidate_ids_or_structured_candidate_usage_rows",
            required_candidate_usage_state: "each_candidate_must_be_used_ignored_or_verified",
            candidate_ids: candidates.map((item) => item.candidate_id).slice(0, 24),
            note: "子 Agent 回执必须在 memoryUsed 或 memoryIgnored 中引用该 reinjection gate，并在 postCompactCandidateUsage 中逐条声明每个候选 used / ignored / verified。"
        }
    };
}
function normalizeDynamicContextToolScope(value = {}) {
    const unique = (items, prefix = "") => Array.from(new Set((Array.isArray(items) ? items : [])
        .map(item => String(item || "").trim())
        .filter(Boolean)
        .map(item => prefix && item.toLowerCase().startsWith(prefix) ? item.slice(prefix.length) : item)));
    return {
        mcp: unique(value.mcp),
        skill: unique(value.skill, "skill:")
    };
}
function buildGroupPostCompactDynamicContextCatalog(groupId, memory = {}, options = {}) {
    const group = options.group || (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(groupId || "")) || null;
    const grants = options.allowedTools
        || options.allowed_tools
        || group?.tools
        || memory?.toolContinuity?.allowedTools
        || memory?.toolContinuity?.allowed_tools
        || { mcp: [], skill: [] };
    const scope = normalizeDynamicContextToolScope(grants);
    const toolCatalog = tool_manager_1.toolManager.getPostCompactDynamicToolCatalog(scope);
    const runtimeMap = new Map((0, runtime_1.getPublicAgentRuntimes)().map(runtime => [runtime.id, runtime]));
    const projectConfigs = (0, db_1.loadProjectConfigs)();
    const configuredProjects = new Set((Array.isArray(projectConfigs) ? projectConfigs : []).map((config) => String(config?.name || "")).filter(Boolean));
    const members = Array.isArray(group?.members) ? group.members : [];
    const agents = members
        .filter((member) => member?.role !== "coordinator" && String(member?.project || "") !== "coordinator")
        .filter((member) => configuredProjects.has(String(member?.project || "")) || options.includeUnconfiguredAgents === true)
        .map((member) => {
        const project = String(member?.project || "").trim();
        const agentType = (0, runtime_1.normalizeAgentRuntimeId)(member?.agent || "claudecode");
        const runtime = runtimeMap.get(agentType);
        const role = String(member?.role || "project agent").trim();
        return {
            name: project,
            project,
            agentType,
            line: `${project} (${agentType}${runtime?.label ? ` / ${runtime.label}` : ""}): ${role}; dispatch is limited to this configured group member`
        };
    })
        .filter((item) => !!item.name)
        .sort((left, right) => left.name.localeCompare(right.name));
    return {
        schema: "ccm-group-post-compact-dynamic-context-catalog-v1",
        groupId: String(groupId || ""),
        tools: toolCatalog.tools,
        skills: toolCatalog.skills,
        mcpInstructions: toolCatalog.mcpInstructions,
        agents
    };
}
function scheduleGroupMemoryAutoCompaction(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { scheduled: false, reason: "missing_group_id" };
    const sessionId = String(options.sessionId || options.session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!sessionId.startsWith("gcs_"))
        return { scheduled: false, reason: "legacy_default_session_rejected", groupId: id, sessionId };
    const circuitBreaker = (0, group_memory_auto_compact_circuit_breaker_1.readGroupMemoryAutoCompactCircuitBreaker)(id, sessionId);
    if (circuitBreaker.blocked === true && options.force !== true) {
        return { scheduled: false, reason: "auto_compact_circuit_breaker_open", groupId: id, sessionId, circuitBreaker };
    }
    const scopeKey = `${id}::${sessionId}`;
    if (group_memory_shared_1.groupMemoryAutoCompactTimers.has(scopeKey)) {
        clearTimeout(group_memory_shared_1.groupMemoryAutoCompactTimers.get(scopeKey));
    }
    const delayMs = Math.max(0, Number(options.delayMs ?? group_memory_shared_1.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS));
    const timer = setTimeout(() => {
        group_memory_shared_1.groupMemoryAutoCompactTimers.delete(scopeKey);
        void runGroupMemoryAutoCompactionNow(id, { ...options, sessionId });
    }, delayMs);
    group_memory_shared_1.groupMemoryAutoCompactTimers.set(scopeKey, timer);
    return { scheduled: true, groupId: id, sessionId, delayMs };
}
async function runGroupMemoryAutoCompactionNow(groupId, options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        return { success: false, compacted: false, reason: "missing_group_id" };
    const sessionId = String(options.sessionId || options.session_id || (0, storage_1.getActiveGroupChatSessionId)(id));
    if (!sessionId.startsWith("gcs_"))
        return { success: false, compacted: false, reason: "legacy_default_session_rejected", groupId: id, sessionId };
    const initialCircuitBreaker = (0, group_memory_auto_compact_circuit_breaker_1.readGroupMemoryAutoCompactCircuitBreaker)(id, sessionId);
    if (initialCircuitBreaker.blocked === true && options.force !== true) {
        return { success: true, compacted: false, skipped: true, reason: "auto_compact_circuit_breaker_open", groupId: id, sessionId, circuitBreaker: initialCircuitBreaker };
    }
    const typedMemoryScopeId = `${id}--${sessionId}`;
    const scopeKey = `${id}::${sessionId}`;
    if (group_memory_shared_1.groupMemoryAutoCompactTimers.has(scopeKey)) {
        clearTimeout(group_memory_shared_1.groupMemoryAutoCompactTimers.get(scopeKey));
        group_memory_shared_1.groupMemoryAutoCompactTimers.delete(scopeKey);
    }
    if (group_memory_shared_1.groupMemoryAutoCompactRunning.has(scopeKey)) {
        group_memory_shared_1.groupMemoryAutoCompactPending.add(scopeKey);
        return { success: true, compacted: false, scheduled: true, reason: "already_running" };
    }
    const lifecycleHead = (0, group_session_lifecycle_head_1.ensureGroupSessionLifecycleHead)(id, sessionId, { reason: "group_memory_compaction_started" }).head;
    const compactionLifecycleFence = {
        required: true,
        groupId: id,
        groupSessionId: sessionId,
        lifecycleGeneration: Number(lifecycleHead?.generation || 0),
        lifecycleStatus: String(lifecycleHead?.status || ""),
        lifecycleHeadId: String(lifecycleHead?.lifecycle_head_id || ""),
        lifecycleHeadChecksum: String(lifecycleHead?.head_checksum || ""),
    };
    const initialLifecycleValidation = (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleRuntimeFence)(compactionLifecycleFence);
    if (!initialLifecycleValidation.valid) {
        return {
            success: false,
            compacted: false,
            reason: "session_lifecycle_stale",
            error: `group compaction session lifecycle fence is stale: ${initialLifecycleValidation.issues.join(",")}`,
            lifecycleValidation: initialLifecycleValidation,
        };
    }
    const startedAt = new Date().toISOString();
    const autoCompactAttemptId = `acba_${crypto.createHash("sha256").update(`${id}\0${sessionId}\0${startedAt}\0${options.messageId || ""}\0${options.reason || ""}`).digest("hex").slice(0, 24)}`;
    const activityLeaseMs = Math.max(1_000, Number(options.config?.compactionActivityLeaseMs || options.config?.compaction_activity_lease_ms || 90_000));
    const activityAdmission = (0, group_compaction_activity_1.startGroupCompactionActivity)({
        lifecycleFence: compactionLifecycleFence,
        operationId: autoCompactAttemptId,
        reason: options.reason || "message_append",
        stage: "starting",
        leaseMs: activityLeaseMs,
    });
    if (!activityAdmission.started) {
        return {
            success: activityAdmission.busy === true,
            compacted: false,
            scheduled: activityAdmission.busy === true,
            reason: activityAdmission.reason,
            compactionActivity: activityAdmission,
            lifecycleValidation: activityAdmission.lifecycleValidation || initialLifecycleValidation,
        };
    }
    group_memory_shared_1.groupMemoryAutoCompactRunning.add(scopeKey);
    const compactionAbortController = new AbortController();
    const cancellationPollMs = Math.max(25, Math.min(Number(options.config?.compactionCancellationPollMs
        || options.config?.compaction_cancellation_poll_ms
        || 500), 5_000));
    let compactionWasCancelled = false;
    const cancellationPoll = setInterval(() => {
        try {
            (0, group_compaction_activity_1.assertGroupCompactionNotCancelled)({ groupId: id, groupSessionId: sessionId, operationId: autoCompactAttemptId });
        }
        catch (error) {
            if (error?.code === "GROUP_COMPACTION_CANCELLED" && !compactionAbortController.signal.aborted) {
                compactionAbortController.abort(error);
            }
        }
    }, cancellationPollMs);
    cancellationPoll.unref?.();
    try {
        const messages = (0, storage_1.getGroupMessages)(id, sessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
        const memory = (0, group_memory_storage_1.loadGroupMemory)(id, sessionId);
        const loadedConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.config || {});
        const config = {
            ...loadedConfig,
            compactionLifecycleFence,
            compactionActivityOperationId: autoCompactAttemptId,
            compactionAbortSignal: compactionAbortController.signal,
            onCompactionActivity: ({ stage } = {}) => (0, group_compaction_activity_1.pulseGroupCompactionActivity)({
                lifecycleFence: compactionLifecycleFence,
                operationId: autoCompactAttemptId,
                stage: stage || "running",
                leaseMs: activityLeaseMs,
            }),
            postCompactDynamicContextCatalog: buildGroupPostCompactDynamicContextCatalog(id, memory, {
                allowedTools: loadedConfig?.postCompactDynamicContextAllowedTools
            })
        };
        const modelCompactionEnabled = (0, group_memory_shared_1.isGroupModelCompactionEnabled)(config);
        const previousSummarySource = String(memory?.compaction?.summarySource || "");
        const rebuild = options.rebuild === true || (modelCompactionEnabled && previousSummarySource === "deterministic-sync");
        const force = options.force === true;
        const compactRunner = typeof options.compactGroupConversationMemory === "function"
            ? options.compactGroupConversationMemory
            : group_memory_compaction_1.compactGroupConversationMemory;
        const result = await compactRunner({
            groupId: id,
            groupSessionId: sessionId,
            messages,
            memory,
            config,
            transcriptPath: (0, storage_1.getGroupChatSessionMessagesFile)(id, sessionId),
            activeTasks: (0, db_1.loadTasks)(),
            force,
            rebuild
        });
        if (typeof options.beforeCompactionCommit === "function") {
            await options.beforeCompactionCommit({
                groupId: id,
                groupSessionId: sessionId,
                operationId: autoCompactAttemptId,
                compacted: result.compacted === true,
                boundaryId: result.boundary?.id || "",
            });
        }
        const committed = (0, group_session_lifecycle_head_1.withGroupSessionLifecycleCommitFence)(compactionLifecycleFence, ({ validation: commitLifecycleValidation }) => {
            return (0, group_compaction_activity_1.withGroupCompactionActivityCommitFence)({
                groupId: id,
                groupSessionId: sessionId,
                operationId: autoCompactAttemptId,
                status: result.compacted ? "completed" : "skipped",
                reason: result.compacted ? "compact_commit_completed" : "compact_not_required",
                boundaryId: result.boundary?.id || "",
                compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
            }, () => {
                const lifecycleCommitProof = result.compacted === true && result.boundary?.id && result.compactTransactionReceipt?.receipt_checksum
                    ? (0, group_session_lifecycle_head_1.buildGroupCompactionLifecycleCommitProof)({
                        fence: compactionLifecycleFence,
                        validation: commitLifecycleValidation,
                        boundaryId: result.boundary.id,
                        compactTransactionReceiptChecksum: result.compactTransactionReceipt.receipt_checksum,
                        committedAt: new Date().toISOString(),
                    })
                    : null;
                if (lifecycleCommitProof) {
                    result.boundary.compactionLifecycleCommitProof = lifecycleCommitProof;
                    result.boundary.compactMetadata = { ...(result.boundary.compactMetadata || {}), compactionLifecycleCommitProof: lifecycleCommitProof };
                    result.boundary.post_compact_restore = { ...(result.boundary.post_compact_restore || {}), compactionLifecycleCommitProof: lifecycleCommitProof };
                }
                const rawNextMemory = result.memory || memory;
                const nextMemory = lifecycleCommitProof
                    ? { ...rawNextMemory, compactBoundary: result.boundary, compaction: { ...(rawNextMemory.compaction || {}), compactionLifecycleCommitProof: lifecycleCommitProof } }
                    : rawNextMemory;
                const providerCapacityResetReason = force
                    ? `explicit_group_compact:${options.reason || "manual"}`
                    : `automatic_group_compact:${options.reason || "message_append"}`;
                const providerNativeCompactSessionCapacityResetIntent = result.compacted === true && !!result.boundary?.id
                    ? {
                        schema: "ccm-provider-native-compact-session-capacity-reset-intent-v1",
                        version: 1,
                        group_id: id,
                        group_session_id: sessionId,
                        boundary_id: String(result.boundary.id || ""),
                        compact_transaction_receipt_checksum: String(result.compactTransactionReceipt?.receipt_checksum || ""),
                        reason: providerCapacityResetReason,
                        requested_at: String(result.boundary.createdAt || new Date().toISOString())
                    }
                    : null;
                const background = (0, group_memory_shared_1.buildBackgroundCompactionState)({
                    status: result.compacted ? "compacted" : "skipped",
                    reason: options.reason || "message_append",
                    messageId: options.messageId || "",
                    compacted: result.compacted,
                    modelCompactionEnabled,
                    rebuild,
                    force,
                    boundaryId: result.boundary?.id || "",
                    summarizedThroughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
                    keepIndex: result.keepIndex || 0,
                    messageCount: messages.length,
                    typedMemoryScopeId,
                    startedAt,
                    completedAt: new Date().toISOString()
                });
                const logDistillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemory)(typedMemoryScopeId, messages, nextMemory, {
                    reason: `auto_compaction:${background.reason || "message_append"}`,
                    throughMessageId: result.boundary?.summarizedThroughMessageId || nextMemory?.compaction?.lastCompactedMessageId || "",
                    maxMessages: options.distillMaxMessages || options.distill_max_messages
                });
                const memoryBeforePostCompactState = {
                    ...nextMemory,
                    longTermLogDistillation: logDistillation,
                    compaction: {
                        ...(nextMemory?.compaction || {}),
                        background,
                        logDistillation,
                        providerNativeCompactSessionCapacityResetIntent
                    }
                };
                const compactHead = sessionId.startsWith("gcs_") && result.compacted && result.compactTransactionReceipt
                    ? (0, group_compact_head_1.commitGroupCompactHead)({ groupId: id, groupSessionId: sessionId, compactTransactionReceipt: result.compactTransactionReceipt })
                    : null;
                let providerNativeCompactSessionCapacityReset = null;
                if (result.compacted === true && !!result.boundary?.id && compactHead?.head) {
                    try {
                        providerNativeCompactSessionCapacityReset = (0, provider_native_compact_session_capacity_1.resetProviderNativeCompactSessionCapacity)({
                            groupId: id,
                            groupSessionId: sessionId,
                            compactHead: compactHead.head,
                            boundaryId: result.boundary.id,
                            compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
                            reason: providerCapacityResetReason,
                            resetAt: result.boundary.createdAt || new Date().toISOString()
                        });
                    }
                    catch (error) {
                        providerNativeCompactSessionCapacityReset = {
                            schema: "ccm-provider-native-compact-session-capacity-reset-v1",
                            reset: false,
                            idempotent: false,
                            status: "pending_reconciliation",
                            group_id: id,
                            group_session_id: sessionId,
                            boundary_id: String(result.boundary.id || ""),
                            compact_head_id: String(compactHead.head?.head_id || ""),
                            compact_head_generation: Number(compactHead.head?.generation || 0),
                            reason: (0, group_memory_shared_1.compactMemoryText)(error?.message || error, 300)
                        };
                    }
                }
                const circuitBreaker = result.compacted === true && !!result.boundary?.id && !!compactHead?.head
                    ? (0, group_memory_auto_compact_circuit_breaker_1.recordGroupMemoryAutoCompactCircuitBreakerOutcome)({
                        groupId: id,
                        groupSessionId: sessionId,
                        attemptId: autoCompactAttemptId,
                        outcome: "success",
                        reason: options.force === true ? "manual_compact_succeeded" : "auto_compact_succeeded",
                        at: background.completedAt
                    })
                    : (0, group_memory_auto_compact_circuit_breaker_1.readGroupMemoryAutoCompactCircuitBreaker)(id, sessionId);
                const postCompactSessionStateReset = result.compacted === true && !!result.boundary?.id
                    ? (0, group_memory_compaction_1.buildGroupPostCompactSessionStateResetReceipt)({
                        groupId: id,
                        groupSessionId: sessionId,
                        boundary: result.boundary,
                        summaryChecksum: result.memory?.compaction?.summaryChecksum || "",
                        compactTransactionReceiptChecksum: result.compactTransactionReceipt?.receipt_checksum || "",
                        sessionMemoryCompactSelection: result.sessionMemoryCompactSelection,
                        previousReceipt: memory?.compaction?.postCompactSessionStateReset || null,
                        contextPressureWarning: result.contextPressureWarning,
                        circuitBreakerBefore: initialCircuitBreaker,
                        circuitBreakerAfter: circuitBreaker,
                        providerNativeCompactSessionCapacityReset,
                        completedAt: background.completedAt
                    })
                    : null;
                const promptCacheCompactionNotification = postCompactSessionStateReset
                    ? (0, group_prompt_cache_break_detection_1.notifyGroupPromptCacheCompaction)({
                        groupId: id,
                        groupSessionId: sessionId,
                        boundaryId: result.boundary.id,
                        resetReceiptChecksum: postCompactSessionStateReset.receipt_checksum,
                        generation: postCompactSessionStateReset.cache_read_baseline?.generation,
                        notifiedAt: background.completedAt
                    })
                    : null;
                const boundaryWithPostCompactState = postCompactSessionStateReset
                    ? {
                        ...(result.boundary || {}),
                        postCompactSessionStateReset,
                        promptCacheCompactionNotification,
                        compactMetadata: {
                            ...(result.boundary?.compactMetadata || {}),
                            postCompactSessionStateReset,
                            promptCacheCompactionNotification
                        },
                        post_compact_restore: {
                            ...(result.boundary?.post_compact_restore || {}),
                            postCompactSessionStateReset,
                            promptCacheCompactionNotification
                        }
                    }
                    : result.boundary || memoryBeforePostCompactState.compactBoundary || null;
                const memoryWithPostCompactState = {
                    ...memoryBeforePostCompactState,
                    compactBoundary: boundaryWithPostCompactState,
                    compaction: {
                        ...(memoryBeforePostCompactState?.compaction || {}),
                        providerNativeCompactSessionCapacityReset,
                        autoCompactCircuitBreaker: {
                            schema: circuitBreaker.schema,
                            state: circuitBreaker.state,
                            consecutiveFailures: Number(circuitBreaker.consecutive_failures || 0),
                            maxConsecutiveFailures: Number(circuitBreaker.max_consecutive_failures || 3),
                            lastSuccessAt: circuitBreaker.last_success_at || "",
                            ledgerChecksum: circuitBreaker.ledger_checksum || ""
                        },
                        postCompactSessionStateReset,
                        promptCacheCompactionNotification
                    },
                    messageCompression: {
                        ...(memoryBeforePostCompactState?.messageCompression || {}),
                        postCompactSessionStateReset,
                        promptCacheCompactionNotification
                    }
                };
                const saved = (0, group_memory_storage_1.saveGroupMemory)(id, memoryWithPostCompactState, sessionId);
                return { success: true, compacted: !!result.compacted, boundary: boundaryWithPostCompactState, keepIndex: result.keepIndex, background, memory: saved, compactHead, typedMemoryScopeId, logDistillation, providerNativeCompactSessionCapacityReset, postCompactSessionStateReset, promptCacheCompactionNotification, circuitBreaker, lifecycleValidation: commitLifecycleValidation, lifecycleCommitProof };
            });
        });
        return { ...committed.value, compactionActivity: committed.compactionActivity };
    }
    catch (error) {
        if (error?.code === "GROUP_COMPACTION_CANCELLED" || compactionAbortController.signal.aborted) {
            compactionWasCancelled = true;
            const cancellation = error?.code === "GROUP_COMPACTION_CANCELLED"
                ? error
                : compactionAbortController.signal.reason || error;
            const compactionActivity = (0, group_compaction_activity_1.finishGroupCompactionActivity)({
                groupId: id,
                groupSessionId: sessionId,
                operationId: autoCompactAttemptId,
                status: "cancelled",
                reason: "exact_session_compaction_cancelled",
            });
            return {
                success: false,
                compacted: false,
                cancelled: true,
                reason: "compaction_cancelled",
                cancelRequestId: String(cancellation?.cancelRequestId || ""),
                cancelRequestedAt: String(cancellation?.cancelRequestedAt || ""),
                compactionActivity,
            };
        }
        if (error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE") {
            const compactionActivity = (0, group_compaction_activity_1.finishGroupCompactionActivity)({
                groupId: id,
                groupSessionId: sessionId,
                operationId: autoCompactAttemptId,
                status: "session_lifecycle_stale",
                reason: error?.message || "session lifecycle changed during compact",
            });
            return {
                success: false,
                compacted: false,
                reason: "session_lifecycle_stale",
                error: (0, group_memory_shared_1.compactMemoryText)(error?.message || error, 500),
                lifecycleValidation: error?.lifecycleValidation || null,
                lifecycleStage: String(error?.compactionLifecycleStage || "commit"),
                compactionActivity,
            };
        }
        const memory = (0, group_memory_storage_1.loadGroupMemory)(id, sessionId);
        const background = (0, group_memory_shared_1.buildBackgroundCompactionState)({
            status: "failed",
            reason: options.reason || "message_append",
            messageId: options.messageId || "",
            typedMemoryScopeId,
            error: error?.message || String(error),
            startedAt,
            completedAt: new Date().toISOString()
        });
        const circuitBreaker = options.force === true
            ? (0, group_memory_auto_compact_circuit_breaker_1.readGroupMemoryAutoCompactCircuitBreaker)(id, sessionId)
            : (0, group_memory_auto_compact_circuit_breaker_1.recordGroupMemoryAutoCompactCircuitBreakerOutcome)({
                groupId: id,
                groupSessionId: sessionId,
                attemptId: autoCompactAttemptId,
                outcome: "failure",
                reason: "auto_compact_failed",
                errorClass: error?.name || error?.code || "Error",
                error: error?.message || String(error),
                at: background.completedAt
            });
        (0, group_memory_storage_1.saveGroupMemory)(id, {
            ...memory,
            compaction: {
                ...(memory?.compaction || {}),
                background,
                autoCompactCircuitBreaker: {
                    schema: circuitBreaker.schema,
                    state: circuitBreaker.state,
                    consecutiveFailures: Number(circuitBreaker.consecutive_failures || 0),
                    maxConsecutiveFailures: Number(circuitBreaker.max_consecutive_failures || 3),
                    openedAt: circuitBreaker.opened_at || "",
                    ledgerChecksum: circuitBreaker.ledger_checksum || ""
                },
                health: "degraded",
                lastFailure: background.error,
                lastFailureAt: background.completedAt
            }
        }, sessionId);
        const compactionActivity = (0, group_compaction_activity_1.finishGroupCompactionActivity)({
            groupId: id,
            groupSessionId: sessionId,
            operationId: autoCompactAttemptId,
            status: "failed",
            reason: background.error,
        });
        return { success: false, compacted: false, error: background.error, background, circuitBreaker, compactionActivity };
    }
    finally {
        clearInterval(cancellationPoll);
        group_memory_shared_1.groupMemoryAutoCompactRunning.delete(scopeKey);
        if (compactionWasCancelled)
            group_memory_shared_1.groupMemoryAutoCompactPending.delete(scopeKey);
        else if (group_memory_shared_1.groupMemoryAutoCompactPending.has(scopeKey)) {
            group_memory_shared_1.groupMemoryAutoCompactPending.delete(scopeKey);
            scheduleGroupMemoryAutoCompaction(id, { reason: "pending_after_run", delayMs: group_memory_shared_1.GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS, sessionId });
        }
    }
}
function ensureGroupMemoryAutoCompactionHook() {
    if (group_memory_auto_compact_hook_state_1.groupMemoryAutoCompactHookRegistered)
        return { registered: true, already: true };
    (0, storage_1.registerGroupMessageAppendHook)((groupId, message) => {
        const sessionId = String(message?.group_session_id || message?.groupSessionId || "");
        if (!sessionId.startsWith("gcs_"))
            return;
        (0, group_post_turn_summary_1.recordGroupPostTurnSummary)(groupId, sessionId, message);
        scheduleGroupMemoryAutoCompaction(groupId, {
            reason: "message_append",
            messageId: String(message?.id || ""),
            sessionId
        });
    });
    (0, group_memory_auto_compact_hook_state_1.markGroupMemoryAutoCompactHookRegistered)();
    return { registered: true, already: false };
}
function pressureMemoryProvenanceDisciplineStatus(value) {
    return String(value || "").trim().toLowerCase();
}
function pressureMemoryProvenanceDisciplineUnderRepair(value = {}) {
    const provenance = pressureMemoryProvenanceDisciplineStatus(value.provenance_status || value.provenanceStatus);
    return provenance === "disputed_under_repair"
        || provenance === "stale_evidence_under_repair"
        || !!String(value.repair_work_item_id || value.repairWorkItemId || value.work_item_id || value.workItemId || "").trim()
        || value.repair_open === true
        || value.repairOpen === true;
}
function buildPressureMemoryProvenanceReceiptDiscipline(input = {}, options = {}) {
    const recall = input.recall || input.typedMemoryRecall || input.typed_memory_recall || input || {};
    const recalled = [
        ...(Array.isArray(recall.recalled) ? recall.recalled : []),
        ...(Array.isArray(recall.docs) ? recall.docs : []),
        ...(Array.isArray(recall.entries) ? recall.entries : []),
        ...(Array.isArray(recall.diagnostics) ? recall.diagnostics : []),
    ];
    const rows = [];
    const seen = new Set();
    for (const doc of recalled) {
        const matches = [
            ...(Array.isArray(doc.workerContextPressureUsage?.matched) ? doc.workerContextPressureUsage.matched : []),
            ...(Array.isArray(doc.worker_context_pressure_usage?.matched) ? doc.worker_context_pressure_usage.matched : []),
            ...(Array.isArray(doc.pressure_usage_matches || doc.pressureUsageMatches) ? (doc.pressure_usage_matches || doc.pressureUsageMatches) : []),
        ];
        const candidates = matches.length ? matches : [doc];
        for (const match of candidates) {
            const provenanceStatus = pressureMemoryProvenanceDisciplineStatus(match.provenance_status || match.provenanceStatus || doc.provenance_status || doc.provenanceStatus);
            const repairWorkItemId = String(match.repair_work_item_id || match.repairWorkItemId || doc.repair_work_item_id || doc.repairWorkItemId || "").trim();
            const repairStatus = pressureMemoryProvenanceDisciplineStatus(match.repair_status || match.repairStatus || doc.repair_status || doc.repairStatus || "pending");
            const repairGapType = String(match.repair_gap_type || match.repairGapType || doc.repair_gap_type || doc.repairGapType || "pressure_repair_provenance").trim();
            const requiresReceipt = doc.requires_memory_provenance_usage === true
                || doc.requiresMemoryProvenanceUsage === true
                || pressureMemoryProvenanceDisciplineUnderRepair(match)
                || pressureMemoryProvenanceDisciplineUnderRepair(doc);
            if (!requiresReceipt && !provenanceStatus && !repairWorkItemId)
                continue;
            const relPath = String(match.rel_path || match.relPath || doc.relPath || doc.rel_path || "").trim();
            const name = String(match.name || doc.name || relPath || "pressure MEMORY.md").trim();
            const key = `${relPath.toLowerCase()}|${name.toLowerCase()}|${repairWorkItemId.toLowerCase()}|${provenanceStatus}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            rows.push({
                relPath,
                rel_path: relPath,
                name,
                targetProject: String(match.target_project || match.targetProject || doc.targetProject || doc.target_project || options.targetProject || options.target_project || "").trim(),
                pressureStatus: String(doc.pressure_status || doc.pressureStatus || recall.pressure_status || recall.pressureStatus || options.pressureStatus || options.pressure_status || "").trim(),
                provenanceStatus: provenanceStatus || "under_repair",
                provenance_status: provenanceStatus || "under_repair",
                repairWorkItemId,
                repair_work_item_id: repairWorkItemId,
                repairStatus,
                repair_status: repairStatus,
                repairGapType,
                repair_gap_type: repairGapType,
                currentSourceVerifiedRequired: ["disputed_under_repair", "stale_evidence_under_repair", "under_repair"].includes(provenanceStatus || "under_repair") || !!repairWorkItemId
            });
        }
    }
    const limitedRows = rows.slice(0, Math.max(1, Number(options.maxRows || options.max_rows || 8)));
    const exampleRows = limitedRows.slice(0, 4).map((row) => ({
        relPath: row.relPath || row.name || "unknown",
        usageState: "used",
        provenanceStatus: row.provenanceStatus || "under_repair",
        repairWorkItemId: row.repairWorkItemId || "unknown",
        repairStatus: row.repairStatus || "pending",
        repairGapType: row.repairGapType || "pressure_repair_provenance",
        currentSourceVerified: true
    }));
    return {
        schema: "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1",
        version: 1,
        active: limitedRows.length > 0,
        source: "typed_memory_pressure_repair_provenance",
        targetProject: String(options.targetProject || options.target_project || "").trim(),
        generatedAt: String(options.generatedAt || options.generated_at || new Date().toISOString()),
        docCount: limitedRows.length,
        requiredFields: ["relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"],
        currentSourceVerifiedRule: "used/verified disputed_under_repair or stale_evidence_under_repair pressure memory requires currentSourceVerified=true",
        rows: limitedRows,
        exampleRows
    };
}
function buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall(groupId, task = "", memory = {}, options = {}) {
    const disabled = options.disableProviderRankingCompactRepairReceiptRecall === true
        || options.disable_provider_ranking_compact_repair_receipt_recall === true;
    const empty = {
        schema: "ccm-provider-ranking-provenance-compact-repair-receipt-worker-context-recall-v1",
        version: 1,
        active: false,
        disabled,
        reason: disabled ? "disabled" : "no_verified_archive",
        docRelPath: group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
        archivedCount: 0,
        verifiedCount: 0,
        preservedCount: 0,
        receiptCount: 0,
        relPathCount: 0,
        rowIdCount: 0,
        taskMatched: false,
        recalledThisTurn: false,
        repeatableRelPaths: [],
        targetPaths: [],
        queryAppend: "",
        authorizationBoundary: "provider switch execution history is ranking evidence only, not authorization; require a fresh valid provider switch decision receipt for every explicit switch",
        memoryUsageReceiptDocRelPaths: [],
        memoryUsageReceiptDisciplineRelPaths: [],
        memoryUsageReceiptDisciplineRequired: false,
        memoryUsageReceiptDisciplineRecalledThisTurn: false,
        rows: []
    };
    if (disabled)
        return empty;
    let archive = {};
    let usageArchive = {};
    try {
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        archive = ledger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
        usageArchive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
    }
    catch {
        archive = {};
        usageArchive = {};
    }
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const usageRows = Array.isArray(usageArchive.rows) ? usageArchive.rows : [];
    const archivedCount = Number(archive.archived_count || rows.length || 0) + Number(usageArchive.archived_count || usageRows.length || 0);
    const taskMatched = (0, group_memory_shared_1.isProviderRankingProvenanceCompactRepairReceiptRecallQuery)([
        task,
        memory.goal,
        memory.currentPhase,
        memory.messageDigest,
        options.providerSwitchDecisionReceipt,
        options.provider_switch_decision_receipt,
    ].map((item) => typeof item === "string" ? item : JSON.stringify(item || "")).join("\n"));
    if (archivedCount <= 0) {
        return {
            ...empty,
            reason: taskMatched ? "task_matched_but_no_verified_archive" : "no_verified_archive",
            taskMatched
        };
    }
    const recentRows = rows.slice(-8);
    const recentUsageRows = usageRows.slice(-8);
    const typedRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        archive.typed_memory_rel_paths,
        ...recentRows.map((row) => row.typed_memory_rel_paths || row.provider_ranking_provenance_rel_paths),
    ], 20);
    const usageDocRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        usageArchive.doc_rel_paths,
        ...recentUsageRows.map((row) => row.doc_rel_paths || row.provider_ranking_provenance_rel_paths),
    ], 20);
    const typedRowIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        archive.typed_memory_row_ids,
        ...recentRows.map((row) => row.typed_memory_row_ids || row.provider_ranking_provenance_row_ids),
    ], 24);
    const receiptIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.provider_switch_decision_receipt_id), 12);
    const receiptChecksums = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.provider_switch_decision_receipt_checksum), 12);
    const rowReasons = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.reason), 8)
        .map((item) => (0, group_memory_shared_1.compactMemoryText)(item, 260));
    const queryAppend = [
        "provider ranking provenance compact repair receipt typed MEMORY.md",
        group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
        group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
        "provider-switch-execution-memory.md",
        "replayRepairDispatchBriefUsage verified provider_ranking_provenance_preserved provider_ranking_provenance_compact",
        "provider ranking memory usage receipt discipline memoryUsed memoryIgnored usageState",
        "provider switch decision receipt checksum typed MEMORY.md rel paths row ids",
        "ranking evidence only, not authorization",
        "fresh valid provider switch decision receipt",
        ...typedRelPaths,
        ...usageDocRelPaths,
        ...typedRowIds,
        ...receiptIds,
        ...receiptChecksums,
        ...rowReasons,
    ].filter(Boolean).join("\n");
    return {
        ...empty,
        active: true,
        reason: taskMatched ? "task_matched_verified_archive" : "verified_archive_available",
        archivedCount,
        verifiedCount: Number(archive.verified_count || 0),
        preservedCount: Number(archive.preserved_count || 0),
        receiptCount: Number(archive.receipt_count || receiptIds.length || 0),
        relPathCount: Number(archive.rel_path_count || typedRelPaths.length || 0),
        rowIdCount: Number(archive.row_id_count || typedRowIds.length || 0),
        taskMatched,
        repeatableRelPaths: [
            group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
            group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
        ],
        targetPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
            group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
            ...typedRelPaths,
            ...usageDocRelPaths,
        ], 24),
        queryAppend: (0, group_memory_shared_1.compactMemoryText)(queryAppend, 4200),
        typedMemoryRelPaths: typedRelPaths,
        memoryUsageReceiptDocRelPaths: usageDocRelPaths,
        memoryUsageReceiptDisciplineRelPaths: [group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH],
        memoryUsageReceiptDisciplineRequired: usageRows.length > 0,
        typedMemoryRowIds: typedRowIds,
        receiptIds,
        receiptChecksums,
        rows: recentRows.map((row) => ({
            row_id: row.row_id || "",
            brief_id: row.brief_id || "",
            work_item_id: row.work_item_id || "",
            task_id: row.task_id || "",
            project: row.project || "",
            provider_switch_decision_receipt_id: row.provider_switch_decision_receipt_id || "",
            provider_switch_decision_receipt_checksum: row.provider_switch_decision_receipt_checksum || "",
            typed_memory_rel_paths: Array.isArray(row.typed_memory_rel_paths) ? row.typed_memory_rel_paths.slice(0, 8) : [],
            typed_memory_row_ids: Array.isArray(row.typed_memory_row_ids) ? row.typed_memory_row_ids.slice(0, 8) : []
        }))
    };
}
function isPostCompactReinjectionRepairReceiptRecallQuery(value, rows = []) {
    const text = String(value || "").toLowerCase();
    if (/post[-_\s]?compact|reinjection|reinject|recovered candidate|repair receipt|recovery evidence|current source|压缩后|重注入|恢复候选|修复回执|当前源/.test(text)) {
        return true;
    }
    return rows.some((row) => [
        row.reinjection_gate_id,
        row.post_compact_candidate_id,
        row.post_compact_candidate_value,
        row.post_compact_candidate_source_message_id,
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && text.includes(normalized);
    }));
}
// ===== merged from group-memory-context-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function buildPostCompactReinjectionRepairReceiptWorkerContextRecall(groupId, task = "", memory = {}, options = {}) {
    const disabled = options.disablePostCompactReinjectionRepairReceiptRecall === true
        || options.disable_post_compact_reinjection_repair_receipt_recall === true;
    const empty = {
        schema: "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1",
        version: 1,
        active: false,
        disabled,
        reason: disabled ? "disabled" : "no_verified_archive",
        archivedCount: 0,
        restoredCount: 0,
        cautionCount: 0,
        usedCount: 0,
        verifiedCount: 0,
        ignoredCount: 0,
        completionArchivedCount: 0,
        completionVerifiedCount: 0,
        preservationClosureArchivedCount: 0,
        preservationClosureVerifiedCount: 0,
        preservationClosureFeedbackConflict: null,
        preservationClosureFeedbackConflictActive: false,
        taskMatched: false,
        recalledThisTurn: false,
        docRelPaths: [],
        repeatableRelPaths: [],
        targetPaths: [],
        gateIds: [],
        candidateIds: [],
        completionWorkItemIds: [],
        completionTimelineBindingIds: [],
        completionOriginalWorkerContextPacketIds: [],
        preservationRepairWorkItemIds: [],
        preservationFailedRetryIds: [],
        preservationFailedOutcomeIds: [],
        preservationCorrectedRetryIds: [],
        preservationCorrectedOutcomeIds: [],
        taskAgentSessionIds: [],
        nativeSessionIds: [],
        originalTaskAgentSessionIds: [],
        originalNativeSessionIds: [],
        repairTaskAgentSessionIds: [],
        repairNativeSessionIds: [],
        queryAppend: "",
        freshnessBoundary: "historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source",
        requiredReceiptFields: ["memoryUsed", "memoryIgnored"],
        rows: []
    };
    if (disabled)
        return empty;
    let archive = {};
    let completionArchive = {};
    let preservationClosureArchive = {};
    let preservationClosureConflictResolutionArchive = {};
    let archiveReadError = "";
    try {
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        archive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
        completionArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
        preservationClosureArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
        preservationClosureConflictResolutionArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
    }
    catch (error) {
        archive = {};
        completionArchive = {};
        preservationClosureArchive = {};
        preservationClosureConflictResolutionArchive = {};
        archiveReadError = (0, group_memory_shared_1.compactMemoryText)(error?.message || error || "typed memory distillation ledger read failed", 500);
    }
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const completionRows = Array.isArray(completionArchive.rows) ? completionArchive.rows : [];
    const preservationClosureRows = Array.isArray(preservationClosureArchive.rows) ? preservationClosureArchive.rows : [];
    const preservationClosureConflictResolutionRows = Array.isArray(preservationClosureConflictResolutionArchive.rows) ? preservationClosureConflictResolutionArchive.rows : [];
    const repairArchivedCount = Number(archive.archived_count || rows.length || 0);
    const completionArchivedCount = Number(completionArchive.archived_count || completionRows.length || 0);
    const preservationClosureArchivedCount = Number(preservationClosureArchive.archived_count || preservationClosureRows.length || 0);
    const preservationClosureConflictResolutionArchivedCount = Number(preservationClosureConflictResolutionArchive.archived_count || preservationClosureConflictResolutionRows.length || 0);
    const archivedCount = repairArchivedCount + completionArchivedCount + preservationClosureArchivedCount + preservationClosureConflictResolutionArchivedCount;
    if (archivedCount <= 0)
        return archiveReadError ? { ...empty, reason: "archive_read_failed", archiveReadError } : empty;
    const recentRows = rows.slice(-12);
    const recentCompletionRows = completionRows.slice(-12);
    const recentPreservationClosureRows = preservationClosureRows.slice(-12);
    const taskText = [
        task,
        memory.goal,
        memory.currentPhase,
        memory.messageDigest,
        options.targetPaths,
        options.target_paths,
    ].map((item) => typeof item === "string" ? item : JSON.stringify(item || "")).join("\n");
    const preservationClosureUsageFeedback = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureUsageSummary)(groupId, {
        targetProject: options.targetProject || options.target_project || "",
        task,
        ignoredThreshold: options.postCompactClosureIgnoredThreshold || options.post_compact_closure_ignored_threshold || 2,
        postCompactClosureUsageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays || options.post_compact_closure_usage_half_life_days,
        postCompactClosureUsageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays || options.post_compact_closure_usage_stale_after_days,
        taskFamilyRelevanceThreshold: options.postCompactClosureTaskFamilyRelevanceThreshold || options.post_compact_closure_task_family_relevance_threshold,
        now: options.now || options.generatedAt || options.generated_at
    });
    const preservationClosureFeedbackConflict = preservationClosureUsageFeedback.feedbackConflict || null;
    const preservationClosureConflictResolution = preservationClosureUsageFeedback.feedbackConflictResolution || null;
    const preservationClosureConflictResolutionEntryId = String(preservationClosureConflictResolution?.resolution_entry_id || "");
    const recalledPreservationClosureConflictResolutionRows = preservationClosureConflictResolutionEntryId
        ? preservationClosureConflictResolutionRows.filter((row) => row.resolution_entry_id === preservationClosureConflictResolutionEntryId).slice(-4)
        : [];
    const effectivePreservationClosureConflictResolutionArchivedCount = recalledPreservationClosureConflictResolutionRows.length;
    const exactPreservationClosureIdentityMatched = recentPreservationClosureRows.some((row) => [
        row.work_item_id,
        row.failed_retry_id,
        row.failed_outcome_id,
        row.corrected_retry_id,
        row.corrected_outcome_id,
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && taskText.toLowerCase().includes(normalized);
    }));
    const preservationClosureRecallSuppressed = [
        "deprioritize_closure_recall",
        "require_receipt_repair_before_reuse",
    ].includes(String(preservationClosureUsageFeedback.recommendation || "")) && !exactPreservationClosureIdentityMatched;
    const recalledPreservationClosureRows = preservationClosureRecallSuppressed ? [] : recentPreservationClosureRows;
    const effectivePreservationClosureArchivedCount = preservationClosureRecallSuppressed ? 0 : preservationClosureArchivedCount;
    const taskMatched = options.forcePostCompactReinjectionRepairReceiptRecall === true
        || options.force_post_compact_reinjection_repair_receipt_recall === true
        || options.forcePostCompactReceiptMemoryUsageRepairCompletionRecall === true
        || options.force_post_compact_receipt_memory_usage_repair_completion_recall === true
        || options.forcePostCompactCompletionMemoryPreservationRepairClosureRecall === true
        || options.force_post_compact_completion_memory_preservation_repair_closure_recall === true
        || isPostCompactReinjectionRepairReceiptRecallQuery(taskText, recentRows)
        || (0, group_memory_shared_1.isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery)(taskText, recentCompletionRows)
        || (0, group_memory_shared_1.isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery)(taskText, recalledPreservationClosureRows);
    const restoredCount = Number(archive.restored_count || rows.filter((row) => row.category !== "caution").length || 0);
    const cautionCount = Number(archive.caution_count || rows.filter((row) => row.category === "caution").length || 0);
    const docRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        restoredCount > 0 ? group_memory_shared_1.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH : "",
        cautionCount > 0 ? group_memory_shared_1.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH : "",
        completionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
        effectivePreservationClosureArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
        effectivePreservationClosureConflictResolutionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
    ], 5);
    if (repairArchivedCount + completionArchivedCount + effectivePreservationClosureArchivedCount + effectivePreservationClosureConflictResolutionArchivedCount <= 0) {
        return {
            ...empty,
            reason: preservationClosureRecallSuppressed ? "closure_recall_deprioritized_by_usage_feedback" : "no_recallable_verified_archive",
            archivedCount,
            preservationClosureArchivedCount,
            preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
            preservationClosureRecallSuppressed,
            exactPreservationClosureIdentityMatched,
            preservationClosureUsageFeedback,
            preservationClosureFeedbackConflict,
            preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
            preservationClosureConflictResolution,
            preservationClosureConflictResolutionArchivedCount,
            immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0
        };
    }
    if (!taskMatched) {
        return {
            ...empty,
            reason: "verified_archive_available_but_task_not_matched",
            archivedCount,
            restoredCount,
            cautionCount,
            usedCount: Number(archive.used_count || 0),
            verifiedCount: Number(archive.verified_count || 0),
            ignoredCount: Number(archive.ignored_count || 0),
            completionArchivedCount,
            completionVerifiedCount: Number(completionArchive.verified_count || 0),
            preservationClosureArchivedCount,
            preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
            preservationClosureRecallSuppressed,
            exactPreservationClosureIdentityMatched,
            preservationClosureUsageFeedback,
            preservationClosureFeedbackConflict,
            preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
            preservationClosureConflictResolution,
            preservationClosureConflictResolutionArchivedCount,
            immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
            taskMatched: false,
            docRelPaths
        };
    }
    const gateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.reinjection_gate_id), 16);
    const candidateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_id), 16);
    const candidateValues = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_value), 16);
    const sourceMessageIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_source_message_id), 16);
    const taskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.task_agent_session_id), 16);
    const nativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.native_session_id), 16);
    const completionWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.work_item_id), 16);
    const completionTimelineBindingIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.timeline_binding_id), 16);
    const completionOriginalWorkerContextPacketIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_worker_context_packet_id), 16);
    const preservationRepairWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.work_item_id), 16);
    const preservationFailedRetryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.failed_retry_id), 16);
    const preservationFailedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.failed_outcome_id), 16);
    const preservationCorrectedRetryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.corrected_retry_id), 16);
    const preservationCorrectedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.corrected_outcome_id), 16);
    const preservationCompletionDocRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_doc_rel_paths || []), 16);
    const preservationCompletionWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_work_item_ids || []), 24);
    const preservationCompletionTimelineBindingIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_timeline_binding_ids || []), 24);
    const originalTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_task_agent_session_id), 16);
    const originalNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_native_session_id), 16);
    const repairTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.repair_task_agent_session_id), 16);
    const repairNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.repair_native_session_id), 16);
    const preservationHistoricalTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => [
        ...(Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids : []),
        row.current_task_agent_session_id,
    ]), 24);
    const preservationHistoricalNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => [
        ...(Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids : []),
        row.current_native_session_id,
    ]), 24);
    const preservationConflictResolutionEntryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.resolution_entry_id), 16);
    const preservationConflictResolutionTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.task_agent_session_id), 16);
    const preservationConflictResolutionNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.native_session_id), 16);
    const rowIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        recentRows.map((row) => row.row_id),
        recentCompletionRows.map((row) => row.row_id),
        recalledPreservationClosureRows.map((row) => row.row_id),
        recalledPreservationClosureConflictResolutionRows.map((row) => row.row_id),
    ], 24);
    const queryAppend = [
        "post-compact reinjection repair receipt typed MEMORY.md",
        ...docRelPaths,
        "postCompactCandidateUsage memoryUsed memoryIgnored currentSourceVerified",
        "historical repair completion is recovery evidence, not permanent repository truth",
        "future use must reverify the current source",
        completionArchivedCount > 0 ? "corrected receipt completion memory per-session memoryUsed memoryIgnored" : "",
        preservationClosureArchivedCount > 0 ? "post-compact completion memory preservation repair closure newer corrected retry outcome exact identity current-session authority" : "",
        ...gateIds,
        ...candidateIds,
        ...candidateValues,
        ...sourceMessageIds,
        ...completionWorkItemIds,
        ...completionTimelineBindingIds,
        ...completionOriginalWorkerContextPacketIds,
        ...preservationRepairWorkItemIds,
        ...preservationFailedRetryIds,
        ...preservationFailedOutcomeIds,
        ...preservationCorrectedRetryIds,
        ...preservationCorrectedOutcomeIds,
        ...preservationCompletionWorkItemIds,
        ...preservationCompletionTimelineBindingIds,
        ...preservationConflictResolutionEntryIds,
        ...rowIds,
    ].filter(Boolean).join("\n");
    return {
        ...empty,
        active: true,
        reason: "task_matched_verified_archive",
        archivedCount,
        restoredCount,
        cautionCount,
        usedCount: Number(archive.used_count || 0),
        verifiedCount: Number(archive.verified_count || 0),
        ignoredCount: Number(archive.ignored_count || 0),
        completionArchivedCount,
        completionVerifiedCount: Number(completionArchive.verified_count || 0),
        preservationClosureArchivedCount,
        preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
        preservationClosureRecallSuppressed,
        exactPreservationClosureIdentityMatched,
        preservationClosureUsageFeedback,
        preservationClosureFeedbackConflict,
        preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
        preservationClosureConflictResolution,
        preservationClosureConflictResolutionArchivedCount,
        preservationClosureConflictResolutionEntryIds: preservationConflictResolutionEntryIds,
        immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
        currentSourceVerifiedCount: Number(archive.current_source_verified_count || 0),
        taskMatched: true,
        docRelPaths,
        repeatableRelPaths: docRelPaths,
        targetPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            ...docRelPaths,
            ...candidateValues,
        ], 24),
        gateIds,
        candidateIds,
        candidateValues,
        sourceMessageIds,
        completionWorkItemIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([completionWorkItemIds, preservationRepairWorkItemIds, preservationCompletionWorkItemIds], 32),
        completionTimelineBindingIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([completionTimelineBindingIds, preservationCompletionTimelineBindingIds], 32),
        completionOriginalWorkerContextPacketIds,
        completionDocRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            completionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
            preservationClosureArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
            effectivePreservationClosureConflictResolutionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
            preservationCompletionDocRelPaths,
        ], 24),
        preservationRepairWorkItemIds,
        preservationFailedRetryIds,
        preservationFailedOutcomeIds,
        preservationCorrectedRetryIds,
        preservationCorrectedOutcomeIds,
        taskAgentSessionIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([taskAgentSessionIds, originalTaskAgentSessionIds, repairTaskAgentSessionIds, preservationHistoricalTaskAgentSessionIds, preservationConflictResolutionTaskAgentSessionIds], 32),
        nativeSessionIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([nativeSessionIds, originalNativeSessionIds, repairNativeSessionIds, preservationHistoricalNativeSessionIds, preservationConflictResolutionNativeSessionIds], 32),
        originalTaskAgentSessionIds,
        originalNativeSessionIds,
        repairTaskAgentSessionIds,
        repairNativeSessionIds,
        preservationHistoricalTaskAgentSessionIds,
        preservationHistoricalNativeSessionIds,
        rowIds,
        queryAppend: (0, group_memory_shared_1.compactMemoryText)(queryAppend, 4200),
        rows: [
            ...recentRows.map((row) => ({
                row_kind: "reinjection_repair_receipt",
                row_id: row.row_id || "",
                timeline_binding_id: row.timeline_binding_id || "",
                brief_id: row.brief_id || "",
                work_item_id: row.work_item_id || "",
                reinjection_gate_id: row.reinjection_gate_id || "",
                post_compact_candidate_id: row.post_compact_candidate_id || "",
                post_compact_candidate_kind: row.post_compact_candidate_kind || "",
                post_compact_candidate_value: row.post_compact_candidate_value || "",
                post_compact_candidate_source_message_id: row.post_compact_candidate_source_message_id || "",
                usage_state: row.usage_state || "",
                current_source_verified: row.current_source_verified === true,
                historical_task_agent_session_id: row.task_agent_session_id || "",
                historical_native_session_id: row.native_session_id || "",
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recentCompletionRows.map((row) => ({
                row_kind: "receipt_memory_usage_repair_completion",
                row_id: row.row_id || "",
                timeline_binding_id: row.timeline_binding_id || "",
                brief_id: row.brief_id || "",
                work_item_id: row.work_item_id || "",
                original_worker_context_packet_id: row.original_worker_context_packet_id || "",
                required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
                coverage_rows: Array.isArray(row.coverage_rows) ? row.coverage_rows.slice(0, 8) : [],
                historical_task_agent_session_id: row.original_task_agent_session_id || "",
                historical_native_session_id: row.original_native_session_id || "",
                repair_task_agent_session_id: row.repair_task_agent_session_id || "",
                repair_native_session_id: row.repair_native_session_id || "",
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recalledPreservationClosureRows.map((row) => ({
                row_kind: "completion_memory_preservation_repair_closure",
                row_id: row.row_id || "",
                work_item_id: row.work_item_id || "",
                failed_retry_id: row.failed_retry_id || "",
                failed_outcome_id: row.failed_outcome_id || "",
                corrected_retry_id: row.corrected_retry_id || "",
                corrected_outcome_id: row.corrected_outcome_id || "",
                completion_doc_rel_paths: Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths.slice(0, 8) : [],
                required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
                completion_work_item_ids: Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids.slice(0, 12) : [],
                completion_timeline_binding_ids: Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids.slice(0, 12) : [],
                historical_task_agent_session_ids: Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids.slice(0, 12) : [],
                historical_native_session_ids: Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids.slice(0, 12) : [],
                historical_task_agent_session_id: row.current_task_agent_session_id || "",
                historical_native_session_id: row.current_native_session_id || "",
                exact_identity_restored: row.exact_identity_restored === true,
                current_session_boundary_restored: row.current_session_boundary_restored === true,
                historical_sessions_remain_evidence_only: row.historical_sessions_remain_evidence_only === true,
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recalledPreservationClosureConflictResolutionRows.map((row) => ({
                row_kind: "completion_memory_preservation_closure_conflict_resolution",
                row_id: row.row_id || "",
                resolution_entry_id: row.resolution_entry_id || "",
                task_family_key: row.task_family_key || "",
                resolution_usage_state: row.resolution_usage_state || "",
                current_source_verified: row.current_source_verified === true,
                reason: row.reason || "",
                historical_task_agent_session_id: row.task_agent_session_id || "",
                historical_native_session_id: row.native_session_id || "",
                parent_conflict_fingerprint: row.parent_conflict_fingerprint || "",
                reversible: row.reversible === true,
                historical_branches_preserved: row.historical_branches_preserved === true,
                historical_majority_authorization_allowed: false
            })),
        ].slice(-28)
    };
}
// ===== merged from group-memory-context-part-03-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function buildAgentMemoryContextBundle(groupId, targetProject, task = "", options = {}) {
    const project = (0, group_memory_shared_1.normalizeAgentMemoryProject)(targetProject);
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(task, options);
    const generatedAt = new Date().toISOString();
    const sessionBinding = buildChildAgentSessionBinding(groupId, project, task, { ...options, generatedAt });
    let compactHead = groupSessionId.startsWith("gcs_") ? (0, group_compact_head_1.readGroupCompactHead)(groupId, groupSessionId) : null;
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-group-memory-context-v1",
            version: 1,
            group_id: groupId,
            group_session_id: groupSessionId,
            target_project: project,
            task_query: (0, group_memory_shared_1.compactMemoryText)(task, 900),
            generated_at: generatedAt,
            session_binding: sessionBinding,
            compact_head: compactHead,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_platform_memory",
                use: "must_not_use_memory",
                boundary: "current_task_only",
                raw_recovery: "disabled for this turn unless the user explicitly asks to restore memory"
            },
            compaction: {},
            group_state: {
                goal: "",
                currentPhase: "memory_ignored",
                summaryText: "",
                decisions: [],
                openQuestions: [],
                nextActions: [],
                persistentRequirements: [],
                factAnchors: [],
                typedMemory: {
                    sync: null,
                    recall: {
                        schema: "ccm-group-typed-memory-recall-v1",
                        ignored: true,
                        reason: "user_requested_ignore_memory",
                        indexFile: "",
                        memoryDir: (0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId),
                        recalled: [],
                        surfaced: []
                    }
                }
            },
            target_agent_memory: {},
            related_work: {},
            relevant_historical_evidence: "",
            raw_sources: {
                group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId),
                group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
                group_typed_memory_dir: (0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId)
            }
        };
        bundle.dispatch_freshness_gate = (0, group_compact_file_references_1.buildGroupMemoryDispatchFreshnessGate)({
            groupId,
            targetProject: project,
            scope: `child:${project}`,
            generatedAt,
            memoryIgnored: true
        });
        const rendered = renderGroupMemoryContextBundle(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || 6000));
        return bundle;
    }
    const allMessages = (0, storage_1.getGroupMessages)(groupId, groupSessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const postTurnSummaryBackfill = (0, group_post_turn_summary_1.backfillGroupPostTurnSummaries)(groupId, groupSessionId, allMessages, { maxMessages: 500 });
    const postTurnSummaryLedger = postTurnSummaryBackfill.ledger || (0, group_post_turn_summary_1.readGroupPostTurnSummaries)(groupId, groupSessionId, { limit: 20 });
    const resumePreparation = prepareGroupMemoryResumeProjection(groupId, groupSessionId, allMessages, (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId), {
        groupSessionId,
        recentLimit: options.recentLimit || options.recent_limit || 12,
        olderLimit: options.olderLimit || options.older_limit || 30,
        minKeepMessages: options.minKeepMessages || options.min_keep_messages,
        minKeepTokens: options.minKeepTokens || options.min_keep_tokens,
        maxKeepTokens: options.maxKeepTokens || options.max_keep_tokens,
        apiMicrocompactTargetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
        apiMicrocompactMaxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens
    });
    let memory = resumePreparation.memory;
    compactHead = resumePreparation.compactHeadRecovery?.head || (groupSessionId.startsWith("gcs_") ? (0, group_compact_head_1.readGroupCompactHead)(groupId, groupSessionId) : null);
    const typedMemoryRecallLedgerScope = (0, group_agent_memory_packet_1.buildChildTypedMemoryRecallLedgerScope)(project, sessionBinding, memory, options);
    const postTurnSummaryDeliveryCapsule = (0, group_post_turn_summary_1.buildGroupPostTurnSummaryDeliveryCapsule)({
        groupId,
        groupSessionId,
        taskId: sessionBinding.task_id,
        targetProject: project,
        taskAgentSessionId: sessionBinding.task_agent_session_id,
        nativeSessionId: sessionBinding.native_session_id,
        executionId: sessionBinding.execution_id,
        attemptSequence: sessionBinding.turn,
        invocationKind: options.invocationKind || options.invocation_kind || (Number(sessionBinding.turn || 0) > 1 ? "resume" : "spawn"),
        invocationEdgeId: options.invocationEdgeId || options.invocation_edge_id || "",
        parentInvocationEdgeId: options.parentInvocationEdgeId || options.parent_invocation_edge_id || "",
        rootInvocationEdgeId: options.rootInvocationEdgeId || options.root_invocation_edge_id || "",
        branchId: options.branchId || options.branch_id || "",
        parentBranchId: options.parentBranchId || options.parent_branch_id || "",
        branchKind: options.branchKind || options.branch_kind || "main",
        expectedLineageHeadChecksum: options.expectedLineageHeadChecksum || options.expected_lineage_head_checksum || "",
        compactEpoch: typedMemoryRecallLedgerScope.compactEpoch,
        generatedAt,
        ledger: postTurnSummaryLedger,
        limit: 6
    });
    const taskAgentInvocationLineage = options.invocationEdgeId || options.invocation_edge_id ? {
        schema: "ccm-task-agent-invocation-lineage-binding-v1",
        invocation_edge_id: String(options.invocationEdgeId || options.invocation_edge_id || ""),
        parent_invocation_edge_id: String(options.parentInvocationEdgeId || options.parent_invocation_edge_id || ""),
        root_invocation_edge_id: String(options.rootInvocationEdgeId || options.root_invocation_edge_id || ""),
        branch_id: String(options.branchId || options.branch_id || ""),
        parent_branch_id: String(options.parentBranchId || options.parent_branch_id || ""),
        branch_kind: String(options.branchKind || options.branch_kind || "main"),
        expected_lineage_head_checksum: String(options.expectedLineageHeadChecksum || options.expected_lineage_head_checksum || ""),
        capsule_checksum: String(postTurnSummaryDeliveryCapsule?.capsule_checksum || "")
    } : null;
    const selectedPostTurnSummaryIds = new Set((postTurnSummaryDeliveryCapsule?.selected_summaries || []).map((row) => String(row.summary_id || "")));
    const deliveredPostTurnSummaries = (Array.isArray(postTurnSummaryLedger?.latest) ? postTurnSummaryLedger.latest : [])
        .filter((row) => !postTurnSummaryDeliveryCapsule || selectedPostTurnSummaryIds.has(String(row.summary_id || "")))
        .slice(postTurnSummaryDeliveryCapsule ? -6 : -8);
    const resumeProjection = resumePreparation.projection || {};
    const rawProjectedMessages = resumeProjection.useProjection === true
        ? (resumeProjection.projectedMessages || [])
        : allMessages;
    const timeBasedMicrocompactConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.compactionConfig || options.compaction_config || {});
    const timeBasedToolResultProjection = (0, group_memory_compaction_1.buildGroupTimeBasedToolResultProjection)(rawProjectedMessages, {
        groupId,
        groupSessionId,
        querySource: "group_main_thread:child_memory_projection",
        enabled: options.timeBasedMicrocompactEnabled ?? options.time_based_microcompact_enabled ?? timeBasedMicrocompactConfig.timeBasedMicrocompactEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        keepRecent: options.timeBasedMicrocompactKeepRecent || options.time_based_microcompact_keep_recent || timeBasedMicrocompactConfig.timeBasedMicrocompactKeepRecent,
        now: options.now
    });
    const childCompactEpoch = (0, group_memory_compaction_1.buildGroupCompactEpoch)(String(memory.compactBoundary?.boundaryId
        || memory.compactBoundary?.boundary_id
        || memory.compaction?.boundaryId
        || memory.compaction?.boundary_id
        || ""));
    const timeBasedThinkingProjection = (0, group_memory_compaction_1.buildGroupTimeBasedThinkingProjection)(timeBasedToolResultProjection.messages, {
        groupId,
        groupSessionId,
        compactEpoch: childCompactEpoch,
        querySource: "group_main_thread:child_memory_projection",
        enabled: options.timeBasedThinkingClearEnabled ?? options.time_based_thinking_clear_enabled ?? timeBasedMicrocompactConfig.timeBasedThinkingClearEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        priorReceipt: memory.compaction?.timeBasedThinkingProjection || memory.messageCompression?.timeBasedThinkingProjection || null,
        isRedactThinkingActive: options.isRedactThinkingActive === true || options.is_redact_thinking_active === true,
        now: options.now
    });
    const projectedMessages = timeBasedThinkingProjection.messages;
    if (timeBasedToolResultProjection.applied) {
        memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
            ...memory,
            compaction: {
                ...(memory.compaction || {}),
                timeBasedToolResultProjection: timeBasedToolResultProjection.receipt
            },
            messageCompression: {
                ...(memory.messageCompression || {}),
                timeBasedToolResultProjection: timeBasedToolResultProjection.receipt
            }
        }, groupSessionId);
    }
    if (timeBasedThinkingProjection.shouldPersist) {
        memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
            ...memory,
            compaction: {
                ...(memory.compaction || {}),
                timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
            },
            messageCompression: {
                ...(memory.messageCompression || {}),
                timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
            }
        }, groupSessionId);
    }
    const agentMemory = { ...(0, group_memory_shared_1.createEmptyAgentMemory)(project), ...((memory.agentMemories || {})[project] || {}) };
    const ownCompleted = (memory.completed || []).filter((item) => item.project === project).slice(-4);
    const otherCompleted = (memory.completed || []).filter((item) => item.project !== project).slice(-4);
    const ownBlocked = (memory.blocked || []).filter((item) => item.project === project).slice(-4);
    const globalBlocked = (memory.blocked || []).filter((item) => item.project !== project).slice(-3);
    const relatedLedger = (memory.workerLedger || []).filter((item) => item.project !== project).slice(-5);
    const boundaryIndex = resumeProjection.useProjection === true ? -1 : (0, group_memory_shared_1.getCompactBoundaryIndex)(memory, projectedMessages);
    const postCompactReinjectionGate = buildGroupMemoryPostCompactReinjectionGate({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        postCompactReinject: memory.compaction?.postCompactReinject || memory.compactBoundary?.post_compact_restore?.reinjectionPlan || null,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null,
        summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || ""
    });
    const postCompactCandidateUsage = (0, group_compact_file_references_1.buildGroupPostCompactCandidateUsageSummary)(groupId, {
        groupSessionId,
        targetProject: project,
        candidates: postCompactReinjectionGate?.candidates || []
    });
    const typedMemoryPressureRecallOptions = {
        groupMemory: memory,
        workerContextPacketContextUsage: options.workerContextPacketContextUsage
            || options.worker_context_packet_context_usage
            || options.contextUsage
            || options.context_usage
            || null,
        workerContextPressure: options.workerContextPressure
            || options.worker_context_pressure
            || options.contextPressure
            || options.context_pressure
            || memory.compaction?.contextPressureWarning
            || memory.compaction?.context_pressure_warning
            || memory.compaction?.compactWarning
            || memory.compaction?.compact_warning
            || memory.messageCompression?.contextPressureWarning
            || memory.messageCompression?.context_pressure_warning
            || null,
        compactStrategyPressure: options.compactStrategyPressure
            || options.compact_strategy_pressure
            || memory.compaction?.compactStrategyDecision
            || memory.compaction?.compact_strategy_decision
            || memory.compactBoundary?.compactStrategyDecision
            || memory.compactBoundary?.compact_strategy_decision
            || memory.messageCompression?.compactStrategyDecision
            || memory.messageCompression?.compact_strategy_decision
            || null,
        ptlEmergency: options.ptlEmergency
            || options.ptl_emergency
            || memory.compaction?.ptlEmergency
            || memory.compaction?.ptl_emergency
            || memory.compactBoundary?.ptlEmergency
            || memory.compactBoundary?.ptl_emergency
            || memory.compactBoundary?.post_compact_restore?.ptlEmergency
            || memory.compactBoundary?.post_compact_restore?.ptl_emergency
            || null,
        contextCompactionRetry: options.contextCompactionRetry || options.context_compaction_retry || null,
        crossGroupPressureRecallUsageGroupIds: options.crossGroupPressureRecallUsageGroupIds
            || options.cross_group_pressure_recall_usage_group_ids
            || options.crossGroupIds
            || options.cross_group_ids,
        maxCrossGroupPressureRecallUsageGroups: options.maxCrossGroupPressureRecallUsageGroups
            || options.max_cross_group_pressure_recall_usage_groups,
        disableCrossGroupPressureRecallUsage: options.disableCrossGroupPressureRecallUsage
            || options.disable_cross_group_pressure_recall_usage,
        workerContextPressureRecallUsageRepairHints: options.workerContextPressureRecallUsageRepairHints
            || options.worker_context_pressure_recall_usage_repair_hints,
        disablePressureRecallUsageRepairHints: options.disablePressureRecallUsageRepairHints
            || options.disable_pressure_recall_usage_repair_hints
    };
    const projectMemoryRoot = (0, group_memory_shared_1.resolveGroupProjectMemoryRoot)(project, options);
    const typedLogDistillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemoryUntilCaughtUp)(typedMemoryScopeId, allMessages, memory, {
        reason: "context_bundle",
        maxMessages: options.distillMaxMessages || options.distill_max_messages,
        maxCatchUpBatches: options.distillMaxCatchUpBatches || options.distill_max_catch_up_batches,
        postCompactCandidateUsage,
        projectRoot: projectMemoryRoot
    });
    const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
        ? null
        : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(typedMemoryScopeId, {
            settingSources: options.settingSources ?? options.setting_sources,
            includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
            includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
            userRoot: options.claudeUserRoot || options.claude_user_root,
            managedRoot: options.claudeManagedRoot || options.claude_managed_root,
            maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
            maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files
        });
    const projectMemoryImport = projectMemoryRoot
        ? (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(typedMemoryScopeId, projectMemoryRoot, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files
        })
        : null;
    const typedMemorySync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(typedMemoryScopeId, memory);
    const providerRankingCompactRepairReceiptRecall = buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall(typedMemoryScopeId, task, memory, options);
    const postCompactReinjectionRepairReceiptRecall = buildPostCompactReinjectionRepairReceiptWorkerContextRecall(typedMemoryScopeId, task, memory, options);
    const typedMemoryRecallQuery = [
        task,
        memory.goal,
        project,
        providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.queryAppend : "",
        postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.queryAppend : "",
    ].filter(Boolean).join("\n");
    const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(typedMemoryRecallQuery, [
        ...(Array.isArray(options.targetPaths || options.target_paths) ? (options.targetPaths || options.target_paths) : []),
        ...(agentMemory.frequentFiles || []),
        ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.targetPaths || [] : []),
        ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.targetPaths || [] : []),
    ]);
    const typedMemoryLoadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(typedMemoryScopeId, {
        maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
        query: typedMemoryRecallQuery,
        targetPaths: typedMemoryTargetPaths
    });
    const recentTools = [
        ...(Array.isArray(options.recentTools || options.recent_tools) ? (options.recentTools || options.recent_tools) : []),
        ...(agentMemory.recentReceipts || []).flatMap((item) => [
            ...(Array.isArray(item.memoryUsed) ? item.memoryUsed : []),
            ...(Array.isArray(item.verification) ? item.verification : []),
        ]),
    ].map((item) => String(item || "").replace(/^Skill\s*[:：]\s*/i, "")).filter(Boolean).slice(-12);
    const ledgerAlreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(typedMemoryScopeId, typedMemoryRecallLedgerScope.scope);
    const explicitAlreadySurfaced = options.alreadySurfacedMemory || options.already_surfaced_memory || [];
    const repeatableRecallRelPaths = new Set([
        ...(providerRankingCompactRepairReceiptRecall.repeatableRelPaths || []),
        ...(postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || []),
    ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const alreadySurfacedForRecall = [...ledgerAlreadySurfaced, ...explicitAlreadySurfaced]
        .filter((item) => !repeatableRecallRelPaths.has(String(item || "").trim().toLowerCase()));
    const preliminaryPressureProvenanceDispatchFeedbackPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        generatedAt,
        frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
        recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
        disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
        disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy
    });
    const typedMemoryRecall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(typedMemoryScopeId, typedMemoryRecallQuery, {
        alreadySurfaced: alreadySurfacedForRecall,
        requiredRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.repeatableRelPaths || [] : []),
            ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || [] : []),
        ], 16),
        recentTools,
        targetPaths: typedMemoryTargetPaths,
        targetProject: project,
        postCompactCandidateUsage,
        pressureProvenanceDispatchFeedbackPolicy: preliminaryPressureProvenanceDispatchFeedbackPolicy,
        typedMemoryManifestSelection: options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null,
        ...typedMemoryPressureRecallOptions,
        max: Number(options.maxTypedMemory || options.max_typed_memory || 5)
    });
    const globalAgentMemoryRecall = (0, group_global_memory_arbitration_1.buildChildGlobalAgentMemoryContext)([task, memory.goal, memory.currentPhase, project].filter(Boolean).join("\n"), {
        ...options,
        groupId,
        targetProject: project,
        generatedAt,
        groupMemory: memory,
        groupMessages: allMessages,
        typedMemoryRecall
    });
    const globalMemoryArbitrationLedger = (0, group_global_memory_arbitration_1.recordGroupGlobalMemoryArbitrationLedger)(groupId, {
        generatedAt,
        targetProject: project,
        task,
        globalAgentMemoryRecall
    });
    const globalMemoryArbitrationDistillation = (0, group_global_memory_arbitration_1.distillGroupGlobalMemoryArbitrationToTypedMemory)(typedMemoryScopeId, {
        generatedAt,
        threshold: options.globalMemoryArbitrationDistillationThreshold || options.global_memory_arbitration_distillation_threshold || 2
    });
    const effectiveGlobalMemoryArbitrationLedger = globalMemoryArbitrationDistillation?.summary?.schema
        ? globalMemoryArbitrationDistillation.summary
        : globalMemoryArbitrationLedger;
    const effectiveTypedMemorySync = globalMemoryArbitrationDistillation?.index?.schema
        ? { ...typedMemorySync, index: globalMemoryArbitrationDistillation.index }
        : typedMemorySync;
    const effectiveTypedMemoryLoadPlan = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(typedMemoryScopeId, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: typedMemoryRecallQuery,
            targetPaths: typedMemoryTargetPaths
        })
        : typedMemoryLoadPlan;
    const effectiveTypedMemoryRecall = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryRecall)(typedMemoryScopeId, typedMemoryRecallQuery, {
            alreadySurfaced: alreadySurfacedForRecall,
            requiredRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
                ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.repeatableRelPaths || [] : []),
                ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || [] : []),
            ], 16),
            recentTools,
            targetPaths: typedMemoryTargetPaths,
            targetProject: project,
            postCompactCandidateUsage,
            pressureProvenanceDispatchFeedbackPolicy: preliminaryPressureProvenanceDispatchFeedbackPolicy,
            typedMemoryManifestSelection: options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null,
            ...typedMemoryPressureRecallOptions,
            max: Number(options.maxTypedMemory || options.max_typed_memory || 5)
        })
        : typedMemoryRecall;
    const typedMemoryDeliveryConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)();
    const typedMemoryRecallScopeStatsBefore = (0, group_memory_index_1.getGroupTypedMemoryRecallScopeStats)(typedMemoryScopeId, typedMemoryRecallLedgerScope.scope);
    const typedMemoryDeliveryCapsule = (0, group_agent_memory_packet_1.buildChildTypedMemoryDeliveryCapsule)({
        groupId,
        groupSessionId,
        targetProject: project,
        taskId: sessionBinding.task_id || options.taskId || options.task_id || "",
        taskAgentSessionId: sessionBinding.task_agent_session_id || options.taskAgentSessionId || options.task_agent_session_id || "",
        ledgerScope: typedMemoryRecallLedgerScope,
        recall: effectiveTypedMemoryRecall
    }, {
        maxDocuments: options.maxTypedMemoryDeliveryDocuments
            ?? options.max_typed_memory_delivery_documents
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxDocuments,
        maxBytesPerDocument: options.maxTypedMemoryDeliveryBytesPerDocument
            ?? options.max_typed_memory_delivery_bytes_per_document
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxBytesPerDocument,
        maxLinesPerDocument: options.maxTypedMemoryDeliveryLinesPerDocument
            ?? options.max_typed_memory_delivery_lines_per_document
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxLinesPerDocument,
        maxSessionBytes: options.maxTypedMemoryDeliverySessionBytes
            ?? options.max_typed_memory_delivery_session_bytes
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxSessionBytes,
        maxTokens: options.maxTypedMemoryDeliveryTokens
            ?? options.max_typed_memory_delivery_tokens
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxTokens,
        modelContextWindow: options.modelContextWindow
            || options.model_context_window
            || options.workerModelContextWindow
            || options.worker_model_context_window
            || options.task?.modelContextWindow
            || options.task?.model_context_window
            || typedMemoryDeliveryConfig.modelContextWindow
            || 200_000,
        sessionDeliveredBytes: typedMemoryRecallScopeStatsBefore.deliveredBytes
    });
    const typedMemoryDeliveryLease = (0, runtime_kernel_1.buildWorkerTypedMemoryDeliveryLease)(typedMemoryDeliveryCapsule, {
        query: typedMemoryRecallQuery,
        attemptSequence: options.taskAgentSessionTurn || options.task_agent_session_turn || 0,
        generatedAt
    });
    const deliveredTypedMemoryRelPaths = typedMemoryDeliveryCapsule.delivered_rel_paths || [];
    const deliveredTypedMemoryRelPathSet = new Set(deliveredTypedMemoryRelPaths.map((item) => String(item || "").toLowerCase()));
    const deliveredEffectiveTypedMemoryRecall = {
        ...effectiveTypedMemoryRecall,
        recalled: (effectiveTypedMemoryRecall.recalled || []).filter((doc) => deliveredTypedMemoryRelPathSet.has(String(doc.relPath || doc.rel_path || "").toLowerCase())),
        surfaced: deliveredTypedMemoryRelPaths,
        deliveryBudget: typedMemoryDeliveryCapsule.budget,
        budgetExhausted: typedMemoryDeliveryCapsule.budget_exhausted === true
    };
    const effectiveProviderRankingCompactRepairReceiptRecall = {
        ...providerRankingCompactRepairReceiptRecall,
        recalledThisTurn: providerRankingCompactRepairReceiptRecall.active === true
            && (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH),
        surfacedRelPaths: (deliveredEffectiveTypedMemoryRecall.surfaced || []).filter((item) => [
            group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
            group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
        ].includes(String(item || "").toLowerCase())),
        memoryUsageReceiptDisciplineRecalledThisTurn: providerRankingCompactRepairReceiptRecall.active === true
            && (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH)
    };
    const effectivePostCompactReinjectionRepairReceiptRecall = {
        ...postCompactReinjectionRepairReceiptRecall,
        recalledThisTurn: postCompactReinjectionRepairReceiptRecall.active === true
            && (postCompactReinjectionRepairReceiptRecall.docRelPaths || []).some((relPath) => (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === String(relPath || "").toLowerCase())),
        surfacedRelPaths: (deliveredEffectiveTypedMemoryRecall.surfaced || []).filter((item) => (postCompactReinjectionRepairReceiptRecall.docRelPaths || []).some((relPath) => String(item || "").toLowerCase() === String(relPath || "").toLowerCase()))
    };
    const pressureMemoryProvenanceReceiptDiscipline = buildPressureMemoryProvenanceReceiptDiscipline({ recall: deliveredEffectiveTypedMemoryRecall }, { targetProject: project, generatedAt });
    const pressureProvenanceDispatchFeedbackPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        generatedAt,
        pressureMemoryProvenanceReceiptDiscipline,
        frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
        recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
        disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
        disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy
    });
    const typedMemoryLedger = (0, group_memory_index_1.readGroupTypedMemoryRecallLedger)(typedMemoryScopeId);
    const typedMemoryRecallScopeStatsAfter = typedMemoryRecallScopeStatsBefore;
    const sourceManifest = (0, group_compact_file_references_1.buildGroupMemorySourceManifest)(groupId, {
        generatedAt,
        groupSessionId,
        typedMemorySync: effectiveTypedMemorySync,
        typedLogDistillation,
        typedMemoryLedger,
        globalAgentMemoryRecall,
        globalMemoryArbitrationLedger: effectiveGlobalMemoryArbitrationLedger
    });
    const memoryReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
        || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && Number(projectMemoryImport?.importedCount || 0) > 0 ? "memory_file_import"
            : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                : Number(projectMemoryImport?.importedCount || 0) > 0 ? "project_memory_import"
                    : Number(globalAgentMemoryRecall?.itemCount || 0) > 0 ? "global_agent_memory_recall"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "context_bundle");
    const memoryReloadAudit = (0, group_compact_file_references_1.recordGroupMemoryReloadAudit)(groupId, {
        generatedAt,
        groupSessionId,
        scope: `child:${project}`,
        contextKind: "child_agent",
        reason: memoryReloadReason,
        sourceManifest,
        loadPlan: effectiveTypedMemoryLoadPlan,
        globalClaudeMemoryImport,
        globalAgentMemoryRecall,
        projectMemoryImport,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null
    });
    const dispatchFreshnessGate = (0, group_compact_file_references_1.buildGroupMemoryDispatchFreshnessGate)({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        sourceManifest,
        reloadAudit: memoryReloadAudit
    });
    const postCompactDispatchMarker = (0, group_compact_file_references_1.recordGroupPostCompactFirstDispatchMarker)(groupId, {
        groupSessionId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        compactBoundary: memory.compactBoundary || null,
        compaction: memory.compaction || null,
        postCompactReinjectionGate,
        disablePostCompactDispatchLedger: options.disablePostCompactDispatchLedger || options.disable_post_compact_dispatch_ledger
    });
    const relevantHistoricalEvidence = (0, group_memory_compaction_1.buildRelevantHistoricalGroupContext)(projectedMessages, boundaryIndex, [task, memory.goal, project].filter(Boolean).join("\n"), { maxMessages: 6, maxChars: Number(options.maxEvidenceChars || 7000) });
    const summaryText = memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null);
    const formalSummarySource = String(memory.compaction?.summarySource || "").toLowerCase();
    const formalSummaryAvailable = ["model", "session-memory", "session_memory"].includes(formalSummarySource)
        && !!memory.conversationSummary;
    const dedicatedParentSessionContext = options.dedicatedParentSessionContext === true
        || options.dedicated_parent_session_context === true;
    const continuityFloorIndex = Math.max(0, boundaryIndex + 1);
    const continuityWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(projectedMessages, { floorIndex: continuityFloorIndex });
    const continuityRecentMessages = projectedMessages.slice(continuityWindow.startIndex).map((message, index) => ({
        id: String(message?.id || message?.uuid || `recent-${continuityWindow.startIndex + index}`),
        role: String(message?.role || message?.type || "user"),
        content: message?.content ?? message?.message?.content ?? "",
        timestamp: String(message?.timestamp || message?.created_at || message?.createdAt || ""),
    }));
    const formalSessionContinuity = formalSummaryAvailable ? {
        schema: "ccm-parent-session-continuity-v2",
        scope: "group",
        group_id: groupId,
        group_session_id: groupSessionId,
        summary_source: formalSummarySource,
        summary_checksum: String(memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || ""),
        summary: memory.conversationSummary || null,
        session_memory: (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(memory.sessionMemory) ? memory.sessionMemory : null,
        recent_messages: continuityRecentMessages,
        recent_window: continuityWindow,
        boundary_generation: Number(memory.compactBoundary?.generation || memory.compaction?.boundaryGeneration || 0),
    } : null;
    const persistedSessionMemorySnapshot = memory.sessionMemory?.schema ? memory.sessionMemory : (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(typedMemoryScopeId);
    const persistedSupersessionGraph = persistedSessionMemorySnapshot?.factSupersessionGraph
        || persistedSessionMemorySnapshot?.modelExtractionReceipt?.factSupersessionGraph
        || persistedSessionMemorySnapshot?.modelMergeQuality?.factSupersessionGraph
        || null;
    const persistedSupersessionGraphValid = verifyGroupSessionMemoryFactSupersessionGraphForContext(persistedSupersessionGraph);
    const { factSupersessionGraph: _auditGraph, modelExtractionReceipt: persistedModelReceipt, modelMergeQuality: persistedMergeQuality, modelExtractionReplayEvidence: persistedReplayEvidence, ...sessionMemoryCore } = persistedSessionMemorySnapshot || {};
    const { factSupersessionGraph: _receiptGraph, mergeQuality: receiptMergeQuality, ...modelReceiptCore } = persistedModelReceipt || {};
    const { factSupersessionGraph: _receiptMergeGraph, ...receiptMergeCore } = receiptMergeQuality || {};
    const { factSupersessionGraph: _mergeGraph, ...mergeQualityCore } = persistedMergeQuality || {};
    const replayEvidenceValid = (0, group_agent_memory_packet_1.verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext)(persistedReplayEvidence);
    const projectedModelReceipt = persistedModelReceipt ? {
        schema: String(modelReceiptCore.schema || ""),
        version: Number(modelReceiptCore.version || 0),
        status: String(modelReceiptCore.status || ""),
        executionId: String(modelReceiptCore.executionId || ""),
        groupId: String(modelReceiptCore.groupId || ""),
        groupSessionId: String(modelReceiptCore.groupSessionId || ""),
        scopeId: String(modelReceiptCore.scopeId || ""),
        completedAt: String(modelReceiptCore.completedAt || ""),
        model: String(modelReceiptCore.model || ""),
        markdownChecksum: String(modelReceiptCore.markdownChecksum || ""),
        sectionEvidenceChecksum: String(modelReceiptCore.sectionEvidenceChecksum || ""),
        factSupersessionGraphChecksum: String(modelReceiptCore.factSupersessionGraphChecksum || ""),
        fencingToken: Number(modelReceiptCore.fencingToken || 0),
        checksum: String(modelReceiptCore.checksum || ""),
        requestAudit: modelReceiptCore.requestAudit ? {
            sourceTranscriptChecksum: String(modelReceiptCore.requestAudit.sourceTranscriptChecksum || ""),
            sourceFirstMessageId: String(modelReceiptCore.requestAudit.sourceFirstMessageId || ""),
            sourceLastMessageId: String(modelReceiptCore.requestAudit.sourceLastMessageId || ""),
            sourceMessageCount: Number(modelReceiptCore.requestAudit.sourceMessageCount || 0),
            sourceMessageIds: Array.isArray(modelReceiptCore.requestAudit.sourceMessageIds) ? modelReceiptCore.requestAudit.sourceMessageIds.slice(0, 240) : []
        } : null,
        mergeQuality: receiptMergeQuality ? {
            pass: receiptMergeCore.pass === true,
            outputMarkdownChecksum: String(receiptMergeCore.outputMarkdownChecksum || ""),
            factSupersessionGraphChecksum: String(receiptMergeCore.factSupersessionGraphChecksum || ""),
            activeFactCount: Number(receiptMergeCore.activeFactCount || 0),
            supersededFactCount: Number(receiptMergeCore.supersededFactCount || 0),
            unjustifiedLostFactCount: Number(receiptMergeCore.unjustifiedLostFactCount || 0)
        } : null
    } : null;
    const sessionMemorySnapshot = (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(persistedSessionMemorySnapshot) ? {
        ...sessionMemoryCore,
        modelExtractionReceipt: projectedModelReceipt,
        modelExtractionReplayEvidence: persistedReplayEvidence?.schema ? {
            schema: String(persistedReplayEvidence.schema || ""),
            version: Number(persistedReplayEvidence.version || 0),
            scopeId: String(persistedReplayEvidence.scopeId || ""),
            executionId: String(persistedReplayEvidence.executionId || ""),
            receiptChecksum: String(persistedReplayEvidence.receiptChecksum || ""),
            historyHeadChecksum: String(persistedReplayEvidence.historyHeadChecksum || ""),
            historyIntegrityValid: persistedReplayEvidence.historyIntegrityValid === true,
            replayExecutionId: String(persistedReplayEvidence.replayExecutionId || ""),
            replayStatus: String(persistedReplayEvidence.replayStatus || ""),
            replayPass: persistedReplayEvidence.replayPass === true,
            factSupersessionGraphChecksum: String(persistedReplayEvidence.factSupersessionGraphChecksum || ""),
            generatedAt: String(persistedReplayEvidence.generatedAt || ""),
            checksum: String(persistedReplayEvidence.checksum || ""),
            checksumValid: replayEvidenceValid
        } : null,
        modelMergeQuality: persistedMergeQuality ? mergeQualityCore : null,
        factSupersession: persistedSupersessionGraph?.schema ? {
            schema: "ccm-group-session-memory-active-fact-projection-v1",
            version: 1,
            graphChecksum: String(persistedSupersessionGraph.checksum || ""),
            graphValid: persistedSupersessionGraphValid,
            activeFactCount: Number(persistedSupersessionGraph.activeFactCount || 0),
            supersededFactCount: Number(persistedSupersessionGraph.supersededFactCount || 0),
            unjustifiedLostFactCount: Number(persistedSupersessionGraph.unjustifiedLostFactCount || 0),
            activeFacts: (persistedSupersessionGraphValid && Array.isArray(persistedSupersessionGraph.activeFacts) ? persistedSupersessionGraph.activeFacts : []).map((fact) => ({
                factId: String(fact.factId || ""),
                factChecksum: String(fact.factChecksum || ""),
                type: String(fact.type || ""),
                text: String(fact.text || ""),
                source: String(fact.source || ""),
                sourceMessageId: String(fact.sourceMessageId || "")
            })).slice(0, 120)
        } : null
    } : persistedSessionMemorySnapshot;
    const toolContinuitySnapshot = memory.toolContinuity?.schema ? memory.toolContinuity : (0, group_tool_continuity_1.readGroupToolContinuitySnapshotSummary)(typedMemoryScopeId);
    const replayRepairLedger = (0, group_memory_storage_1.readGroupReplayRepairLedgerSummary)(groupId, groupSessionId);
    const replayRepairWorkItems = (0, group_memory_storage_1.readGroupReplayRepairWorkItemsSummary)(groupId, groupSessionId);
    const replayRepairDispatchCandidates = (0, group_memory_storage_1.readGroupReplayRepairDispatchCandidatesSummary)(groupId, 12, groupSessionId);
    const boundaryHistory = (0, group_memory_shared_1.buildGroupCompactBoundaryHistorySummary)(memory);
    const childAgentTypes = buildChildAgentTypeSummary(memory);
    const storedApiMicroCompactEditPlan = memory.compaction?.apiMicroCompactEditPlan
        || memory.compactBoundary?.apiMicroCompactEditPlan
        || memory.compactBoundary?.post_compact_restore?.apiMicroCompactEditPlan
        || memory.messageCompression?.apiMicroCompactEditPlan
        || null;
    const runtimeCapabilities = options.runtimeCapabilities
        || options.runtime_capabilities
        || options.task?.runtimeCapabilities
        || options.task?.runtime_capabilities
        || options.task?.workflow_meta?.runtime_capabilities
        || {};
    const providerNativeCompactSessionCapacityReconciliation = resumePreparation.providerNativeCompactSessionCapacityReconciliation || null;
    const providerNativeCompactSessionCapacityReady = !providerNativeCompactSessionCapacityReconciliation
        || ["current", "recovered", "not_applicable"].includes(String(providerNativeCompactSessionCapacityReconciliation.status || ""));
    const providerNativeCompactSessionCapacity = providerNativeCompactSessionCapacityReady
        ? (0, provider_native_compact_session_capacity_1.consumeProviderNativeCompactSessionCapacity)({
            groupId,
            groupSessionId,
            taskAgentSessionId: sessionBinding?.task_agent_session_id || "",
            nativeSessionId: sessionBinding?.native_session_id || "",
            rawActiveTokens: Number(storedApiMicroCompactEditPlan?.activeTokens || storedApiMicroCompactEditPlan?.active_tokens || 0),
            consumedAt: generatedAt
        })
        : null;
    const providerNativeCompactSessionGenerationFence = providerNativeCompactSessionCapacityReady
        ? (0, provider_native_compact_session_capacity_1.getProviderNativeCompactSessionGenerationFence)({
            groupId,
            groupSessionId,
            taskAgentSessionId: sessionBinding?.task_agent_session_id || "",
            nativeSessionId: sessionBinding?.native_session_id || ""
        })
        : null;
    const apiMicrocompactNativeApplyPlan = (0, group_memory_compaction_1.buildGroupApiMicrocompactNativeApplyPlan)(storedApiMicroCompactEditPlan || {}, {
        groupId,
        groupSessionId,
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        transport: options.agentTransport || options.agent_transport || options.transport || runtimeCapabilities.transport,
        provider: options.agentProvider || options.agent_provider || options.provider || runtimeCapabilities.provider,
        supportsApiContextManagement: options.supportsApiContextManagement === true
            || options.supports_api_context_management === true
            || runtimeCapabilities.supportsApiContextManagement === true
            || runtimeCapabilities.supports_api_context_management === true,
        nativeApiRequestLayer: options.nativeApiRequestLayer === true
            || options.native_api_request_layer === true
            || runtimeCapabilities.nativeApiRequestLayer === true
            || runtimeCapabilities.native_api_request_layer === true,
        contextManagementBetaHeaderEnabled: options.contextManagementBetaHeaderEnabled === true
            || options.context_management_beta_header_enabled === true
            || runtimeCapabilities.contextManagementBetaHeaderEnabled === true
            || runtimeCapabilities.context_management_beta_header_enabled === true,
        betaHeaders: options.betaHeaders || options.beta_headers || runtimeCapabilities.betaHeaders || runtimeCapabilities.beta_headers,
        featureEnabled: providerNativeCompactSessionCapacityReady
            && options.apiMicrocompactNativeApplyEnabled !== false
            && options.api_microcompact_native_apply_enabled !== false,
        sessionBinding,
        executionId: options.executionId || options.execution_id || sessionBinding?.execution_id || "",
        runnerRequestId: options.runnerRequestId || options.runner_request_id || options.externalRunnerRequestId || options.external_runner_request_id || "",
        memoryContextSnapshotId: options.memoryContextSnapshotId || options.memory_context_snapshot_id || "",
        memoryContextSnapshotChecksum: options.memoryContextSnapshotChecksum || options.memory_context_snapshot_checksum || "",
        providerNativeCompactSessionCapacity,
        providerNativeCompactSessionGenerationFence,
        now: generatedAt
    });
    const apiMicrocompactNativeApplyProofLedger = (0, group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyProofSummary)(groupId, {
        groupSessionId,
        targetProject: project,
        planChecksums: [storedApiMicroCompactEditPlan?.planChecksum || storedApiMicroCompactEditPlan?.plan_checksum || ""].filter(Boolean)
    });
    const storedPostCompactReinject = memory.compaction?.postCompactReinject
        || memory.compactBoundary?.post_compact_restore?.reinjectionPlan
        || null;
    const liveDynamicContextDelta = groupSessionId.startsWith("gcs_")
        ? (0, group_memory_compaction_1.buildGroupPostCompactDynamicContextDeltaProjection)(buildGroupPostCompactDynamicContextCatalog(groupId, memory, options), {
            groupId,
            groupSessionId,
            scanMode: "full",
            preCompactLoadedToolNames: memory.compaction?.postCompactReinject?.dynamicContextDeltaReceipt?.loaded_tool_state?.carried_names
                || memory.compactBoundary?.compactMetadata?.preCompactDiscoveredTools
                || memory.compaction?.preCompactDiscoveredTools
                || [],
            now: generatedAt
        })
        : null;
    const effectivePostCompactReinject = storedPostCompactReinject || liveDynamicContextDelta
        ? {
            ...(storedPostCompactReinject || {
                schema: "ccm-post-compact-reinjection-v1",
                version: 1,
                strategy: "restore_dynamic_runtime_context_for_new_child_session"
            }),
            dynamicContextDeltaAttachment: liveDynamicContextDelta?.attachment || null,
            dynamicContextDeltaReceipt: liveDynamicContextDelta?.receipt || null
        }
        : null;
    const modelVisibleRuntime = (0, group_runtime_memory_admission_1.modelVisibleGroupRuntimeState)(memory);
    const bundle = {
        schema: "ccm-group-memory-context-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        target_project: project,
        task_query: (0, group_memory_shared_1.compactMemoryText)(task, 900),
        generated_at: generatedAt,
        parent_session_delivery: {
            schema: "ccm-child-parent-session-delivery-policy-v1",
            mode: formalSummaryAvailable ? "canonical_summary_recent_raw" : "precompact_full_raw",
            canonical_summary_available: formalSummaryAvailable,
            dedicated_parent_session_context: dedicatedParentSessionContext,
            suppress_local_digest: dedicatedParentSessionContext,
            suppress_bounded_resume_context: dedicatedParentSessionContext,
        },
        session_binding: sessionBinding,
        compact_head: compactHead,
        pressure_memory_provenance_receipt_discipline: pressureMemoryProvenanceReceiptDiscipline.active ? pressureMemoryProvenanceReceiptDiscipline : null,
        pressure_provenance_dispatch_feedback_policy: pressureProvenanceDispatchFeedbackPolicy.active ? pressureProvenanceDispatchFeedbackPolicy : null,
        memory_policy: {
            priority: "platform_group_memory_over_third_party_cli_session",
            use: "must_consider",
            boundary: "current_group_session_summary_recent_window_raw_evidence",
            cross_session_memory_allowed: false,
            raw_recovery: "group-messages JSON keeps raw transcript; request message id if more source text is needed"
        },
        compaction: {
            version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
            strategy: memory.messageCompression?.strategy || "cc-session-memory-v3-sync",
            health: memory.compaction?.health || "",
            quality: memory.compaction?.quality || null,
            qualityScore: Number(memory.compaction?.quality?.score || 0),
            qualityStatus: memory.compaction?.quality?.status || "",
            driftDetected: memory.compaction?.quality?.drift?.detected === true || memory.compaction?.driftDetected === true,
            downgradedByQualityGate: memory.compaction?.downgradedByQualityGate === true,
            qualityDowngradeReason: memory.compaction?.qualityDowngradeReason || memory.compaction?.quality?.downgrade_reason || "",
            microCompact: memory.compaction?.microCompact || memory.compactBoundary?.post_compact_restore?.microCompact || null,
            timeBasedToolResultProjection: timeBasedToolResultProjection.receipt,
            timeBasedThinkingProjection: timeBasedThinkingProjection.receipt,
            postCompactReinject: effectivePostCompactReinject,
            partialCompact: memory.compaction?.partialCompact || memory.compactBoundary?.partialCompact || null,
            partialSegments: memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || [],
            ptlEmergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || memory.compactBoundary?.post_compact_restore?.ptlEmergency || null,
            ptlRecovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || memory.compactBoundary?.post_compact_restore?.ptlRecovery || null,
            truePostCompactPayloadBudget: memory.compaction?.truePostCompactPayloadBudget
                || memory.messageCompression?.truePostCompactPayloadBudget
                || memory.compactBoundary?.truePostCompactPayloadBudget
                || memory.compactBoundary?.post_compact_restore?.truePostCompactPayloadBudget
                || null,
            postCompactPayloadGate: memory.compaction?.postCompactPayloadGate
                || memory.messageCompression?.postCompactPayloadGate
                || memory.compactBoundary?.postCompactPayloadGate
                || memory.compactBoundary?.post_compact_restore?.postCompactPayloadGate
                || null,
            compactStrategyDecision: memory.compaction?.compactStrategyDecision
                || memory.compactBoundary?.compactStrategyDecision
                || memory.compactBoundary?.post_compact_restore?.strategyDecision
                || memory.messageCompression?.compactStrategyDecision
                || null,
            compactTransactionReceipt: memory.compaction?.compactTransactionReceipt
                || memory.compactBoundary?.compactTransactionReceipt
                || memory.compactBoundary?.post_compact_restore?.compactTransactionReceipt
                || null,
            postCompactMessageOrderReceipt: memory.compaction?.postCompactMessageOrderReceipt
                || memory.messageCompression?.postCompactMessageOrderReceipt
                || memory.compactBoundary?.postCompactMessageOrderReceipt
                || memory.compactBoundary?.post_compact_restore?.messageOrderReceipt
                || null,
            compactLineage: memory.compaction?.compactLineage
                || memory.messageCompression?.compactLineage
                || memory.compactBoundary?.compactLineage
                || memory.compactBoundary?.compactMetadata?.compactLineage
                || memory.compactBoundary?.post_compact_restore?.compactLineage
                || null,
            compactionUsage: memory.compaction?.compactionUsage
                || memory.messageCompression?.compactionUsage
                || memory.compactBoundary?.compactionUsage
                || memory.compactBoundary?.compactMetadata?.compactionUsage
                || memory.compactBoundary?.post_compact_restore?.compactionUsage
                || null,
            postCompactSessionStateReset: memory.compaction?.postCompactSessionStateReset
                || memory.messageCompression?.postCompactSessionStateReset
                || memory.compactBoundary?.postCompactSessionStateReset
                || memory.compactBoundary?.compactMetadata?.postCompactSessionStateReset
                || memory.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
                || null,
            promptCacheCompactionNotification: memory.compaction?.promptCacheCompactionNotification
                || memory.messageCompression?.promptCacheCompactionNotification
                || memory.compactBoundary?.promptCacheCompactionNotification
                || memory.compactBoundary?.post_compact_restore?.promptCacheCompactionNotification
                || null,
            promptCacheBreakDetection: groupSessionId.startsWith("gcs_")
                ? (0, group_prompt_cache_break_detection_1.readGroupPromptCacheBreakDetection)(groupId, groupSessionId)
                : null,
            apiMicroCompactEditPlan: storedApiMicroCompactEditPlan,
            apiMicrocompactNativeApplyPlan,
            apiMicrocompactNativeApplyProofLedger,
            providerNativeCompactSessionCapacity,
            providerNativeCompactSessionGenerationFence,
            providerNativeCompactSessionCapacityReconciliation,
            compactedMessageCount: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
            preservedRecentMessages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
            lastCompactedMessageId: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
            lastCompactedAt: memory.compaction?.lastCompactedAt || memory.messageCompression?.lastCompressedAt || "",
            summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || "",
            sessionMemory: sessionMemorySnapshot,
            toolContinuity: toolContinuitySnapshot,
            boundary: memory.compactBoundary || null,
            boundaryHistory,
            contextPressureWarning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
            preCompactWarning: memory.compaction?.preCompactWarning || null,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null,
            postCompactCleanupAudit: memory.compaction?.postCompactCleanupAudit
                || memory.compactBoundary?.post_compact_restore?.cleanupAudit
                || memory.messageCompression?.postCompactCleanupAudit
                || null,
            hookLedger: memory.compaction?.hookLedger || null,
            replayRepairPlan: memory.compaction?.replayRepairPlan || memory.compaction?.replay_repair_plan || null,
            replayRepairLedger,
            replayRepairWorkItems,
            replayRepairDispatchCandidates,
            childAgentTypes,
            resumeProjection: {
                schema: resumeProjection.schema || "",
                status: resumeProjection.status || "unknown",
                reason: resumeProjection.reason || "",
                verified: resumeProjection.verified === true,
                useProjection: resumeProjection.useProjection === true,
                recovered: resumePreparation.recovered === true,
                recoveryReason: resumePreparation.recoveryReason || "",
                boundary: resumeProjection.boundary || null,
                journal: resumeProjection.journal || null,
                proof: resumePreparation.proof || null,
                rawMessageCount: Number(resumeProjection.rawMessageCount ?? allMessages.length),
                omittedMessageCount: Number(resumeProjection.omittedMessageCount || 0),
                snipOmittedMessageCount: Number(resumeProjection.snipOmittedMessageCount || 0),
                totalOmittedMessageCount: Number(resumeProjection.totalOmittedMessageCount || resumeProjection.omittedMessageCount || 0),
                preservedMessageCount: Number(resumeProjection.preservedMessageCount || resumeProjection.preservedMessages?.length || 0),
                messagesAfterBoundaryCount: Number(resumeProjection.messagesAfterBoundaryCount || resumeProjection.messagesAfterBoundary?.length || 0),
                projectedMessageCount: Number(resumeProjection.projectedMessageCount || projectedMessages.length),
                snipReplay: resumeProjection.snipReplay || null,
                roundTripConsistency: resumeProjection.roundTripConsistency || null,
                compactHeadRecovery: resumePreparation.compactHeadRecovery || null,
                effectiveTokenBaseline: resumePreparation.resumeBaseline || memory.compaction?.resumeEffectiveTokenBaseline || null,
                projectionChecksum: resumeProjection.projectionChecksum || ""
            }
        },
        group_state: {
            goal: memory.goal || "",
            currentPhase: memory.currentPhase || "idle",
            summaryText,
            decisions: modelVisibleRuntime.decisions.slice(-6),
            openQuestions: (memory.openQuestions || []).slice(-4),
            nextActions: modelVisibleRuntime.nextActions.slice(-4),
            persistentRequirements: (memory.persistentRequirements || []).slice(-8),
            factAnchors: modelVisibleRuntime.factAnchors.slice(-8),
            postTurnSummaries: {
                schema: postTurnSummaryLedger?.schema || "",
                valid: postTurnSummaryLedger?.valid === true,
                eventCount: Number(postTurnSummaryLedger?.eventCount || 0),
                summaryCount: Number(postTurnSummaryLedger?.summaryCount || 0),
                headChecksum: String(postTurnSummaryLedger?.headChecksum || ""),
                archiveCount: Number(postTurnSummaryLedger?.archiveCount || 0),
                deliveryCapsule: postTurnSummaryDeliveryCapsule ? {
                    schema: "ccm-group-post-turn-summary-delivery-capsule-projection-v1",
                    capsuleChecksum: postTurnSummaryDeliveryCapsule.capsule_checksum,
                    taskAgentSessionId: postTurnSummaryDeliveryCapsule.task_agent_session_id,
                    attemptSequence: postTurnSummaryDeliveryCapsule.attempt_sequence,
                    invocationKind: postTurnSummaryDeliveryCapsule.invocation_kind,
                    compactEpoch: postTurnSummaryDeliveryCapsule.compact_epoch,
                    ledgerHeadChecksum: postTurnSummaryDeliveryCapsule.ledger_head_checksum,
                    selectedCount: postTurnSummaryDeliveryCapsule.selected_count
                } : null,
                latest: deliveredPostTurnSummaries.map((row) => ({
                    summaryId: String(row.summary_id || ""),
                    summarizesMessageId: String(row.summarizes_message_id || ""),
                    messageChecksum: String(row.message_checksum || ""),
                    eventChecksum: String(row.event_checksum || ""),
                    sequence: Number(row.sequence || 0),
                    taskId: String(row.task_id || ""),
                    agent: String(row.agent || ""),
                    statusCategory: String(row.status_category || ""),
                    isNoteworthy: row.is_noteworthy === true,
                    title: (0, group_memory_shared_1.compactMemoryText)(row.title || "", 140),
                    description: (0, group_memory_shared_1.compactMemoryText)(row.description || "", 500),
                    recentAction: (0, group_memory_shared_1.compactMemoryText)(row.recent_action || "", 300),
                    needsAction: (0, group_memory_shared_1.compactMemoryText)(row.needs_action || "", 300),
                    artifactUrls: Array.isArray(row.artifact_urls) ? row.artifact_urls.slice(0, 8) : [],
                    generatedAt: String(row.generated_at || "")
                }))
            },
            typedMemory: {
                distillation: typedLogDistillation,
                arbitrationDistillation: globalMemoryArbitrationDistillation,
                sync: {
                    indexFile: effectiveTypedMemorySync.index.file,
                    memoryDir: effectiveTypedMemorySync.index.dir,
                    docs: effectiveTypedMemorySync.index.docs.length,
                    lineCount: effectiveTypedMemorySync.index.lineCount,
                    bytes: effectiveTypedMemorySync.index.bytes
                },
                globalClaudeMemoryImport,
                projectMemoryImport,
                loadPlan: effectiveTypedMemoryLoadPlan,
                recallQuery: typedMemoryRecallQuery,
                recentTools,
                targetPaths: typedMemoryTargetPaths,
                recall: deliveredEffectiveTypedMemoryRecall,
                deliveryCapsule: typedMemoryDeliveryCapsule,
                deliveryLease: typedMemoryDeliveryLease,
                providerRankingCompactRepairReceiptRecall: effectiveProviderRankingCompactRepairReceiptRecall,
                postCompactReinjectionRepairReceiptRecall: effectivePostCompactReinjectionRepairReceiptRecall,
                pressureProvenanceReceiptDiscipline: pressureMemoryProvenanceReceiptDiscipline.active ? pressureMemoryProvenanceReceiptDiscipline : null,
                pressureProvenanceDispatchFeedbackPolicy: pressureProvenanceDispatchFeedbackPolicy.active ? pressureProvenanceDispatchFeedbackPolicy : null,
                ledger: {
                    file: typedMemoryLedger.file,
                    scope: typedMemoryRecallLedgerScope.scope,
                    scopeKind: typedMemoryRecallLedgerScope.scopeKind,
                    taskAgentSessionId: typedMemoryRecallLedgerScope.taskAgentSessionId,
                    taskId: typedMemoryRecallLedgerScope.taskId,
                    compactEpoch: typedMemoryRecallLedgerScope.compactEpoch,
                    sessionBound: typedMemoryRecallLedgerScope.sessionBound,
                    alreadySurfaced: ledgerAlreadySurfaced.slice(-20),
                    recordedThisTurn: [],
                    pendingThisTurn: typedMemoryDeliveryCapsule.delivered_rel_paths || [],
                    deliveryStatsBefore: typedMemoryRecallScopeStatsBefore,
                    deliveryStatsAfter: typedMemoryRecallScopeStatsAfter
                }
            }
        },
        source_manifest: sourceManifest,
        memory_reload_audit: memoryReloadAudit,
        global_agent_memory: globalAgentMemoryRecall,
        global_memory_health_gate: globalAgentMemoryRecall?.memory_health_gate || null,
        global_memory_arbitration_ledger: effectiveGlobalMemoryArbitrationLedger,
        dispatch_freshness_gate: dispatchFreshnessGate,
        post_compact_reinjection_gate: postCompactReinjectionGate,
        post_compact_dispatch_marker: postCompactDispatchMarker,
        post_compact_candidate_usage: postCompactCandidateUsage,
        target_agent_memory: {
            ...agentMemory,
            recentReceipts: (agentMemory.recentReceipts || []).slice(-8),
            frequentFiles: (agentMemory.frequentFiles || []).slice(-12),
            verificationHints: (agentMemory.verificationHints || []).slice(-8),
            blockers: (agentMemory.blockers || []).slice(-8),
            needs: (agentMemory.needs || []).slice(-8)
        },
        related_work: {
            ownCompleted,
            otherCompleted,
            ownBlocked,
            globalBlocked,
            relatedLedger
        },
        resume_context: {
            schema: "ccm-group-memory-resume-context-v1",
            status: resumeProjection.status || "unknown",
            verified: resumeProjection.verified === true,
            projectedMessageCount: Number(resumeProjection.projectedMessageCount || projectedMessages.length),
            text: (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_compaction_1.buildBoundedRecentGroupContext)(projectedMessages, Math.min(8, Math.max(3, Number(options.fullCount || options.full_count || 6)))), Number(options.maxResumeContextChars || options.max_resume_context_chars || 4200)),
            timeBasedToolResultProjection: timeBasedToolResultProjection.receipt,
            timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
        },
        session_continuity: formalSessionContinuity,
        relevant_historical_evidence: relevantHistoricalEvidence,
        raw_sources: {
            group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId),
            group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
            group_typed_memory_index_file: effectiveTypedMemorySync.index.file,
            group_typed_memory_dir: effectiveTypedMemorySync.index.dir,
            group_typed_memory_distillation_ledger_file: typedLogDistillation.ledgerFile || "",
            group_typed_memory_recall_ledger_file: typedMemoryLedger.file || "",
            global_agent_memory_file: globalAgentMemoryRecall?.file || memory_1.GLOBAL_AGENT_MEMORY_FILE,
            group_global_memory_arbitration_ledger_file: Number(effectiveGlobalMemoryArbitrationLedger?.entryCount || 0) > 0
                ? (effectiveGlobalMemoryArbitrationLedger?.file || (0, group_global_memory_arbitration_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId))
                : "",
            global_memory_cross_group_arbitration_dir: (Number(globalAgentMemoryRecall?.crossGroupSuppression?.suppressedCount || 0) > 0 || Number(globalAgentMemoryRecall?.crossGroupSuppression?.advisoryCount || 0) > 0)
                ? (globalAgentMemoryRecall?.crossGroupSuppression?.sourceDir || group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
                : "",
            group_memory_reload_ledger_file: memoryReloadAudit.ledgerFile || "",
            group_post_compact_dispatch_ledger_file: postCompactDispatchMarker?.ledger_file || (0, group_memory_storage_1.getGroupPostCompactDispatchLedgerFile)(groupId, groupSessionId),
            group_post_compact_candidate_usage_ledger_file: postCompactCandidateUsage.ledger_file || (0, group_compact_file_references_1.getGroupPostCompactCandidateUsageLedgerFile)(groupId, groupSessionId),
            group_api_microcompact_native_apply_proof_ledger_file: apiMicrocompactNativeApplyProofLedger.ledger_file || (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId, groupSessionId),
            group_api_microcompact_native_apply_request_telemetry_ledger_file: apiMicrocompactNativeApplyProofLedger.request_telemetry?.ledger_file || (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId, groupSessionId),
            provider_native_compact_execution_receipt_ledger_file: apiMicrocompactNativeApplyProofLedger.platform_execution_receipts?.ledger_file || (0, provider_native_compact_execution_receipt_1.getProviderNativeCompactExecutionReceiptLedgerFile)(groupId, groupSessionId),
            group_replay_repair_ledger_file: replayRepairLedger?.file || (0, group_memory_storage_1.getGroupReplayRepairLedgerFile)(groupId, groupSessionId),
            group_replay_repair_work_items_file: replayRepairWorkItems?.file || (0, group_memory_storage_1.getGroupReplayRepairWorkItemsFile)(groupId, groupSessionId),
            group_session_memory_snapshot_file: sessionMemorySnapshot?.snapshotFile || (0, group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile)(typedMemoryScopeId),
            group_session_memory_summary_file: sessionMemorySnapshot?.summaryFile || (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(typedMemoryScopeId),
            group_tool_continuity_snapshot_file: toolContinuitySnapshot?.snapshotFile || (0, group_tool_continuity_1.getGroupToolContinuitySnapshotFile)(typedMemoryScopeId),
            group_tool_continuity_summary_file: toolContinuitySnapshot?.summaryFile || (0, group_tool_continuity_1.getGroupToolContinuityMarkdownFile)(typedMemoryScopeId),
            group_compact_boundary_journal_file: (0, group_memory_boundary_journal_1.getGroupMemoryBoundaryJournalFile)(groupId, groupSessionId),
            group_resume_projection_proof_file: (0, group_memory_boundary_journal_1.getGroupMemoryResumeProofFile)(groupId, groupSessionId),
            group_post_turn_summary_ledger_file: (0, group_post_turn_summary_1.getGroupPostTurnSummaryLedgerFile)(groupId, groupSessionId),
            project_memory_root: projectMemoryRoot
        },
        typed_memory_recall: deliveredEffectiveTypedMemoryRecall,
        typedMemoryRecall: deliveredEffectiveTypedMemoryRecall,
        typed_memory_delivery_capsule: typedMemoryDeliveryCapsule,
        typedMemoryDeliveryCapsule,
        typed_memory_delivery_lease: typedMemoryDeliveryLease,
        typedMemoryDeliveryLease,
        post_turn_summary_delivery_capsule: postTurnSummaryDeliveryCapsule,
        postTurnSummaryDeliveryCapsule,
        task_agent_invocation_lineage: taskAgentInvocationLineage,
        taskAgentInvocationLineage,
        typed_memory_load_plan: effectiveTypedMemoryLoadPlan,
        typedMemoryLoadPlan: effectiveTypedMemoryLoadPlan,
        provider_ranking_compact_repair_receipt_recall: effectiveProviderRankingCompactRepairReceiptRecall,
        post_compact_reinjection_repair_receipt_recall: effectivePostCompactReinjectionRepairReceiptRecall,
        global_agent_memory_recall: globalAgentMemoryRecall,
        globalAgentMemoryRecall
    };
    const compactReferenceScopeId = typedMemoryScopeId;
    bundle.compact_file_references = (0, group_compact_file_references_1.buildGroupCompactFileReferences)(compactReferenceScopeId, {
        generatedAt,
        sourceManifest,
        sessionMemory: sessionMemorySnapshot,
        toolContinuity: toolContinuitySnapshot,
        typedMemory: bundle.group_state?.typedMemory || {},
        rawSources: bundle.raw_sources || {}
    });
    bundle.compact_file_reference_read_plan = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlan)(compactReferenceScopeId, bundle.compact_file_references, {
        generatedAt,
        maxEntries: 10
    });
    const historicalReadPlanRows = (0, group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRows)(compactReferenceScopeId, bundle.compact_file_reference_read_plan);
    const compactFileReferenceReadPlanForFreshness = {
        ...bundle.compact_file_reference_read_plan,
        entries: historicalReadPlanRows.rows,
        plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
        sourceReferenceCount: historicalReadPlanRows.rows.length
    };
    bundle.compact_file_reference_read_plan_freshness = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanFreshness)(compactReferenceScopeId, compactFileReferenceReadPlanForFreshness);
    bundle.compact_file_reference_read_plan_revalidation_gate = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlanRevalidationGate)(compactReferenceScopeId, bundle.compact_file_reference_read_plan_freshness, {
        generatedAt,
        targetProject: project,
        scope: `child:${project}`,
        sessionBinding
    });
    (0, group_compact_file_references_1.recordGroupCompactFileReferenceSurfacing)(compactReferenceScopeId, bundle.compact_file_references, {
        generatedAt,
        scope: `child:${project}`,
        targetProject: project,
        task,
        sessionBinding,
        readPlan: bundle.compact_file_reference_read_plan,
        readPlanRevalidationGate: bundle.compact_file_reference_read_plan_revalidation_gate
    });
    bundle.compact_file_reference_read_plan_access = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanAccess)(compactReferenceScopeId, bundle.compact_file_reference_read_plan, memory);
    bundle.compact_file_reference_access = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceAccess)(compactReferenceScopeId, bundle.compact_file_references, memory);
    const invokedSkillPlan = bundle.compaction?.postCompactReinject || {};
    bundle.invoked_skill_attachments = Array.isArray(invokedSkillPlan.invokedSkillAttachments) ? invokedSkillPlan.invokedSkillAttachments : [];
    bundle.invoked_skill_attachment_receipt = invokedSkillPlan.invokedSkillAttachmentReceipt || null;
    bundle.invoked_skill_attachment_text = renderGroupPostCompactInvokedSkillAttachments(invokedSkillPlan);
    bundle.plan_attachment = invokedSkillPlan.planAttachment || null;
    bundle.plan_attachment_receipt = invokedSkillPlan.planAttachmentReceipt || null;
    bundle.plan_attachment_text = renderGroupPostCompactPlanAttachment(invokedSkillPlan);
    bundle.dynamic_context_delta_attachment = invokedSkillPlan.dynamicContextDeltaAttachment || null;
    bundle.dynamic_context_delta_receipt = invokedSkillPlan.dynamicContextDeltaReceipt || null;
    bundle.dynamic_context_delta_text = renderGroupPostCompactDynamicContextDelta(invokedSkillPlan);
    const renderedWithReferences = renderGroupMemoryContextBundle(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: renderedWithReferences, maxChars: 36_000, maxTokens: 90_000 });
    const payloadGate = bundle.compaction?.postCompactPayloadGate || {};
    const requestedRenderedChars = Number(options.maxRenderedChars || 14_000);
    const payloadSafeRenderedChars = payloadGate.status === "recompact_required"
        ? Math.max(3000, Number(payloadGate.safe_render_chars || 6000))
        : requestedRenderedChars;
    bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(renderedWithReferences, Math.min(requestedRenderedChars, payloadSafeRenderedChars));
    return bundle;
}
// ===== merged from group-memory-context-part-03-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
async function buildAgentMemoryContextBundleWithManifestSelection(groupId, targetProject, task = "", options = {}) {
    const requestedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const requireExactGroupSession = options.requireExactGroupSession === true || options.require_exact_group_session === true;
    if (requireExactGroupSession && !requestedGroupSessionId.startsWith("gcs_")) {
        throw new Error("项目子 Agent 记忆上下文缺少精确群聊会话绑定");
    }
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(task, options))
        return buildAgentMemoryContextBundle(groupId, targetProject, task, options);
    const suppliedSelection = options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null;
    if (suppliedSelection)
        return buildAgentMemoryContextBundle(groupId, targetProject, task, options);
    const groupSessionId = requestedGroupSessionId || String((0, storage_1.getActiveGroupChatSessionId)(groupId));
    if (!groupSessionId.startsWith("gcs_"))
        return buildAgentMemoryContextBundle(groupId, targetProject, task, options);
    const bootstrap = buildAgentMemoryContextBundle(groupId, targetProject, task, {
        ...options,
        manifestSelectorBootstrap: true
    });
    const typedMemory = bootstrap.group_state?.typedMemory || {};
    const scopeId = `${groupId}--${groupSessionId}`;
    const selection = await (0, group_memory_index_1.selectGroupTypedMemoryManifest)(scopeId, String(typedMemory.recallQuery || task || ""), {
        groupId,
        groupSessionId,
        targetProject,
        taskId: options.taskId || options.task_id || "",
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        alreadySurfaced: typedMemory.ledger?.alreadySurfaced || [],
        targetPaths: typedMemory.targetPaths || options.targetPaths || options.target_paths || [],
        recentTools: typedMemory.recentTools || options.recentTools || options.recent_tools || [],
        executor: options.manifestSelectorExecutor || options.manifest_selector_executor,
        signal: options.signal,
        recordDecision: options.recordManifestSelectorDecision !== false && options.record_manifest_selector_decision !== false
    });
    const bundle = buildAgentMemoryContextBundle(groupId, targetProject, task, {
        ...options,
        typedMemoryManifestSelection: selection
    });
    const recall = bundle.typedMemoryRecall || bundle.typed_memory_recall || bundle.group_state?.typedMemory?.recall || null;
    const capsule = bundle.typedMemoryDeliveryCapsule || bundle.typed_memory_delivery_capsule || bundle.group_state?.typedMemory?.deliveryCapsule || null;
    const recalledBeforeDeliveryBudget = [...new Set([
            ...(recall?.recalled || []).map((row) => row.relPath),
            ...(capsule?.skipped_rel_paths || []),
        ].map((item) => String(item || "")).filter(Boolean))];
    const selectorOutcome = (0, group_memory_index_1.recordGroupTypedMemoryManifestSelectorOutcome)(scopeId, selection, {
        stage: "attached",
        recalledRelPaths: recalledBeforeDeliveryBudget,
        attachedRelPaths: capsule?.delivered_rel_paths || [],
        capsuleChecksum: capsule?.capsule_checksum || "",
        deliveryLeaseId: bundle.typedMemoryDeliveryLease?.lease_id || bundle.typed_memory_delivery_lease?.lease_id || "",
        taskId: options.taskId || options.task_id || "",
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        targetProject,
        recordOutcome: options.recordManifestSelectorDecision !== false && options.record_manifest_selector_decision !== false
    });
    bundle.typed_memory_manifest_selection = selection;
    bundle.typedMemoryManifestSelection = selection;
    bundle.typed_memory_manifest_selector_outcome = selectorOutcome;
    bundle.typedMemoryManifestSelectorOutcome = selectorOutcome;
    return bundle;
}
// ===== merged from group-memory-context-part-04-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function renderGroupMemoryContextBundle(bundle) {
    if (!bundle)
        return "";
    if (typeof bundle === "string")
        return bundle;
    const agentMemory = bundle.target_agent_memory || {};
    const groupState = bundle.group_state || {};
    const postTurnSummaries = groupState.postTurnSummaries || groupState.post_turn_summaries || {};
    const postTurnSummaryDeliveryCapsule = bundle.post_turn_summary_delivery_capsule
        || bundle.postTurnSummaryDeliveryCapsule
        || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(postTurnSummaries)
        || null;
    const taskAgentInvocationLineage = bundle.task_agent_invocation_lineage || bundle.taskAgentInvocationLineage || null;
    const compaction = bundle.compaction || {};
    const resumeProjection = compaction.resumeProjection || compaction.resume_projection || {};
    const resumeContext = bundle.resume_context || bundle.resumeContext || {};
    const parentSessionDelivery = bundle.parent_session_delivery || bundle.parentSessionDelivery || {};
    const related = bundle.related_work || {};
    const typedMemory = groupState.typedMemory || {};
    const providerRankingCompactRepairReceiptRecall = typedMemory.providerRankingCompactRepairReceiptRecall
        || typedMemory.provider_ranking_compact_repair_receipt_recall
        || bundle.provider_ranking_compact_repair_receipt_recall
        || bundle.providerRankingCompactRepairReceiptRecall
        || {};
    const postCompactReinjectionRepairReceiptRecall = typedMemory.postCompactReinjectionRepairReceiptRecall
        || typedMemory.post_compact_reinjection_repair_receipt_recall
        || bundle.post_compact_reinjection_repair_receipt_recall
        || bundle.postCompactReinjectionRepairReceiptRecall
        || {};
    const globalAgentMemory = bundle.global_agent_memory || bundle.globalAgentMemory || {};
    const globalMemoryHealthGate = bundle.global_memory_health_gate || bundle.globalMemoryHealthGate || globalAgentMemory.memory_health_gate || globalAgentMemory.memoryHealthGate || {};
    const globalMemoryArbitrationLedger = bundle.global_memory_arbitration_ledger || bundle.globalMemoryArbitrationLedger || {};
    const sessionBinding = bundle.session_binding || bundle.sessionBinding || {};
    const sourceManifest = bundle.source_manifest || {};
    const reloadAudit = bundle.memory_reload_audit || {};
    const dispatchGate = bundle.dispatch_freshness_gate || {};
    const reinjectionGate = bundle.post_compact_reinjection_gate || {};
    const postCompactDispatchMarker = bundle.post_compact_dispatch_marker || bundle.postCompactDispatchMarker || {};
    const postCompactCandidateUsage = bundle.post_compact_candidate_usage || bundle.postCompactCandidateUsage || {};
    const replayRepairPlan = bundle.replay_repair_plan || bundle.replayRepairPlan || compaction.replayRepairPlan || compaction.replay_repair_plan || {};
    const replayRepairLedger = bundle.replay_repair_ledger || bundle.replayRepairLedger || compaction.replayRepairLedger || compaction.replay_repair_ledger || {};
    const replayRepairWorkItems = bundle.replay_repair_work_items || bundle.replayRepairWorkItems || compaction.replayRepairWorkItems || compaction.replay_repair_work_items || {};
    const replayRepairDispatchCandidates = bundle.replay_repair_dispatch_candidates || bundle.replayRepairDispatchCandidates || compaction.replayRepairDispatchCandidates || compaction.replay_repair_dispatch_candidates || {};
    const pressureProvenanceDispatchFeedbackPolicy = bundle.pressure_provenance_dispatch_feedback_policy
        || bundle.pressureProvenanceDispatchFeedbackPolicy
        || typedMemory.pressureProvenanceDispatchFeedbackPolicy
        || typedMemory.pressure_provenance_dispatch_feedback_policy
        || {};
    const sessionMemory = bundle.session_memory || bundle.sessionMemory || compaction.sessionMemory || compaction.session_memory || {};
    const toolContinuity = bundle.tool_continuity || bundle.toolContinuity || compaction.toolContinuity || compaction.tool_continuity || {};
    const compactStrategyDecision = compaction.compactStrategyDecision
        || compaction.compact_strategy_decision
        || compaction.boundary?.compactStrategyDecision
        || compaction.boundary?.post_compact_restore?.strategyDecision
        || {};
    const apiMicroCompactEditPlan = compaction.apiMicroCompactEditPlan
        || compaction.api_microcompact_edit_plan
        || compaction.boundary?.apiMicroCompactEditPlan
        || compaction.boundary?.post_compact_restore?.apiMicroCompactEditPlan
        || {};
    const apiMicrocompactNativeApplyPlan = compaction.apiMicrocompactNativeApplyPlan
        || compaction.api_microcompact_native_apply_plan
        || apiMicroCompactEditPlan.nativeApplyPlan
        || apiMicroCompactEditPlan.native_apply_plan
        || {};
    const apiMicrocompactNativeApplyProofLedger = compaction.apiMicrocompactNativeApplyProofLedger
        || compaction.api_microcompact_native_apply_proof_ledger
        || bundle.api_microcompact_native_apply_proof_ledger
        || bundle.apiMicrocompactNativeApplyProofLedger
        || {};
    const providerNativeCompactSessionCapacity = compaction.providerNativeCompactSessionCapacity
        || compaction.provider_native_compact_session_capacity
        || bundle.providerNativeCompactSessionCapacity
        || bundle.provider_native_compact_session_capacity
        || {};
    const providerNativeCompactSessionGenerationFence = compaction.providerNativeCompactSessionGenerationFence
        || compaction.provider_native_compact_session_generation_fence
        || bundle.providerNativeCompactSessionGenerationFence
        || bundle.provider_native_compact_session_generation_fence
        || {};
    const providerNativeCompactSessionCapacityReconciliation = compaction.providerNativeCompactSessionCapacityReconciliation
        || compaction.provider_native_compact_session_capacity_reconciliation
        || bundle.providerNativeCompactSessionCapacityReconciliation
        || bundle.provider_native_compact_session_capacity_reconciliation
        || {};
    const truePostCompactPayloadBudget = compaction.truePostCompactPayloadBudget
        || compaction.true_post_compact_payload_budget
        || bundle.truePostCompactPayloadBudget
        || bundle.true_post_compact_payload_budget
        || {};
    const postCompactPayloadGate = compaction.postCompactPayloadGate
        || compaction.post_compact_payload_gate
        || bundle.postCompactPayloadGate
        || bundle.post_compact_payload_gate
        || {};
    const postCompactMessageOrderReceipt = compaction.postCompactMessageOrderReceipt
        || compaction.post_compact_message_order_receipt
        || compaction.boundary?.postCompactMessageOrderReceipt
        || compaction.boundary?.post_compact_restore?.messageOrderReceipt
        || {};
    const postCompactMessageOrderVerification = postCompactMessageOrderReceipt.schema
        ? (0, group_memory_compaction_1.verifyGroupPostCompactMessageOrderReceipt)(postCompactMessageOrderReceipt, {
            groupId: bundle.group_id,
            groupSessionId: bundle.group_session_id,
            boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
            summaryChecksum: compaction.summaryChecksum || ""
        })
        : null;
    const compactLineage = compaction.compactLineage
        || compaction.compact_lineage
        || compaction.boundary?.compactLineage
        || compaction.boundary?.compactMetadata?.compactLineage
        || compaction.boundary?.post_compact_restore?.compactLineage
        || {};
    const compactLineageVerification = compactLineage.schema
        ? (0, group_memory_compaction_1.verifyGroupCompactLineage)(compactLineage, {
            groupId: bundle.group_id,
            groupSessionId: bundle.group_session_id,
            boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || ""
        })
        : null;
    const compactionUsage = compaction.compactionUsage
        || compaction.compaction_usage
        || compaction.boundary?.compactionUsage
        || compaction.boundary?.compactMetadata?.compactionUsage
        || compaction.boundary?.post_compact_restore?.compactionUsage
        || {};
    const compactionUsageVerification = compactionUsage.schema
        ? (0, group_memory_compaction_1.verifyGroupCompactionModelUsageReceipt)(compactionUsage, {
            groupId: bundle.group_id,
            groupSessionId: bundle.group_session_id
        })
        : null;
    const postCompactSessionStateReset = compaction.postCompactSessionStateReset
        || compaction.post_compact_session_state_reset
        || compaction.boundary?.postCompactSessionStateReset
        || compaction.boundary?.compactMetadata?.postCompactSessionStateReset
        || compaction.boundary?.post_compact_restore?.postCompactSessionStateReset
        || {};
    const postCompactSessionStateResetVerification = postCompactSessionStateReset.schema
        ? (0, group_memory_compaction_1.verifyGroupPostCompactSessionStateResetReceipt)(postCompactSessionStateReset, {
            groupId: bundle.group_id,
            groupSessionId: bundle.group_session_id,
            boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
            summaryChecksum: compaction.summaryChecksum || ""
        })
        : null;
    const promptCacheCompactionNotification = compaction.promptCacheCompactionNotification
        || compaction.prompt_cache_compaction_notification
        || compaction.boundary?.promptCacheCompactionNotification
        || compaction.boundary?.post_compact_restore?.promptCacheCompactionNotification
        || {};
    const promptCacheCompactionNotificationVerification = promptCacheCompactionNotification.schema
        ? (0, group_prompt_cache_break_detection_1.verifyGroupPromptCacheCompactionNotification)(promptCacheCompactionNotification, {
            groupId: bundle.group_id,
            groupSessionId: bundle.group_session_id,
            boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
            resetReceiptChecksum: postCompactSessionStateReset.receipt_checksum || ""
        })
        : null;
    const promptCacheBreakDetection = compaction.promptCacheBreakDetection
        || compaction.prompt_cache_break_detection
        || {};
    const compactFileReferences = bundle.compact_file_references || bundle.compactFileReferences || {};
    const compactFileReferenceReadPlan = bundle.compact_file_reference_read_plan || bundle.compactFileReferenceReadPlan || {};
    const compactFileReferenceReadPlanAccess = bundle.compact_file_reference_read_plan_access || bundle.compactFileReferenceReadPlanAccess || {};
    const compactFileReferenceReadPlanFreshness = bundle.compact_file_reference_read_plan_freshness || bundle.compactFileReferenceReadPlanFreshness || {};
    const compactFileReferenceReadPlanRevalidationGate = bundle.compact_file_reference_read_plan_revalidation_gate || bundle.compactFileReferenceReadPlanRevalidationGate || {};
    const compactFileReferenceAccess = bundle.compact_file_reference_access || bundle.compactFileReferenceAccess || {};
    const pressureMemoryProvenanceReceiptDiscipline = bundle.pressure_memory_provenance_receipt_discipline
        || bundle.pressureMemoryProvenanceReceiptDiscipline
        || typedMemory.pressureProvenanceReceiptDiscipline
        || typedMemory.pressure_provenance_receipt_discipline
        || buildPressureMemoryProvenanceReceiptDiscipline({ recall: typedMemory.recall || {} }, { targetProject: bundle.target_project || "" });
    const typedPressureRepairMatches = Array.isArray(pressureMemoryProvenanceReceiptDiscipline.rows)
        ? pressureMemoryProvenanceReceiptDiscipline.rows.slice(0, 4).map((row) => ({
            relPath: row.relPath || row.rel_path || "",
            status: row.repairStatus || row.repair_status || "pending",
            gapType: row.repairGapType || row.repair_gap_type || "gap",
            workItemId: row.repairWorkItemId || row.repair_work_item_id || "",
            provenanceStatus: row.provenanceStatus || row.provenance_status || ""
        }))
        : [];
    if (bundle.memory_policy?.ignored === true) {
        return [
            "子 Agent 受控记忆包（平台生成，本轮用户要求忽略记忆）：",
            `- 目标子 Agent：${bundle.target_project || "unknown"}`,
            `- 群聊会话：group_id=${bundle.group_id || "unknown"}；group_session_id=${bundle.group_session_id || "unknown"}；binding=${sessionBinding.binding_id || "unbound"}。`,
            "- 记忆使用：本轮按空 MEMORY.md / 空群聊记忆处理；不要引用、比较、应用或提及任何历史记忆内容。",
            "- 上下文边界：只使用本轮任务文本、用户本轮显式提供的内容、当前仓库实时检查结果和你本轮实际执行得到的证据。",
            dispatchGate.schema ? `- 记忆派发门禁：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "memory_ignored"}；action=${dispatchGate.action || "do_not_use_platform_memory"}；回执 memoryIgnored 必须声明该 gate 被用户忽略。` : "",
            bundle.task_query ? `- 你本次任务：${bundle.task_query}` : "",
            "- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；memoryIgnored 必须声明 user_requested_ignore_memory；memoryContextUsage 必须回传 bindingId/groupSessionId 并写 usageState=ignored；不能编造未执行的验证或文件修改。",
        ].filter(Boolean).join("\n");
    }
    const lines = [
        "子 Agent 受控记忆包（平台生成，优先级高于第三方 CLI 自带历史）：",
        `- 目标子 Agent：${bundle.target_project || "unknown"}`,
        `- 群聊会话：group_id=${bundle.group_id || "unknown"}；group_session_id=${bundle.group_session_id || "unknown"}；binding=${sessionBinding.binding_id || "unbound"}。`,
        `- 群聊目标：${groupState.goal || "未记录"}`,
        `- 当前阶段：${groupState.currentPhase || "idle"}`,
        "- 记忆边界：你每轮执行都可能是新的第三方 CLI 会话；必须把本包当作当前任务上下文，不要假定 Claude Code/Cursor/Codex 内部 session 记得旧群聊。",
        "- 上下文策略：旧消息已被 CCM 压缩为摘要；近期消息保留原文窗口；本包如附带“压缩前原文证据”，该证据优先于摘要。",
    ];
    const invokedSkillAttachmentText = String(bundle.invoked_skill_attachment_text || bundle.invokedSkillAttachmentText || renderGroupPostCompactInvokedSkillAttachments(compaction.postCompactReinject || {})).trim();
    const planAttachmentText = String(bundle.plan_attachment_text || bundle.planAttachmentText || renderGroupPostCompactPlanAttachment(compaction.postCompactReinject || {})).trim();
    const dynamicContextDeltaText = String(bundle.dynamic_context_delta_text || bundle.dynamicContextDeltaText || renderGroupPostCompactDynamicContextDelta(compaction.postCompactReinject || {})).trim();
    const deferredPostCompactHookLines = [];
    if (postCompactMessageOrderVerification) {
        lines.push(`- 压缩后消息顺序凭证：status=${postCompactMessageOrderVerification.valid ? "verified" : "fail_closed"}；order=${(postCompactMessageOrderReceipt.order || []).join(" -> ") || "missing"}；receipt=${postCompactMessageOrderReceipt.receipt_checksum || "missing"}。`);
        if (!postCompactMessageOrderVerification.valid) {
            lines.push(`- 压缩后消息顺序门禁：${postCompactMessageOrderVerification.issues.join(",") || "verification_failed"}；不得把附件或 Hook 结果视为已验证的压缩恢复上下文。`);
        }
    }
    if (compactLineageVerification) {
        lines.push(`- Compact lineage：status=${compactLineageVerification.valid ? "verified" : "fail_closed"}；trigger=${compactLineage.trigger || "unknown"}；epoch=${compactLineage.compact_epoch || "unknown"}；turn=${compactLineage.compact_turn_id || "unknown"}；previous=${compactLineage.previous_compact_turn_id || "none"}；turnsSincePrevious=${compactLineage.turns_since_previous_compact ?? -1}；recompact=${compactLineage.is_recompaction_in_chain === true}。`);
        if (!compactLineageVerification.valid) {
            lines.push(`- Compact lineage 门禁：${compactLineageVerification.issues.join(",") || "verification_failed"}；不得依据该 lineage 判断重压缩代际或容量信用。`);
        }
    }
    if (compactionUsageVerification) {
        lines.push(`- Compaction model usage：status=${compactionUsageVerification.valid ? compactionUsage.status || "verified" : "fail_closed"}；provider=${compactionUsage.provider || "unknown"}；model=${compactionUsage.model || "unknown"}；input=${compactionUsage.input_tokens || 0}；output=${compactionUsage.output_tokens || 0}；cacheRead=${compactionUsage.cache_read_input_tokens || 0}；cacheCreate=${compactionUsage.cache_creation_input_tokens || 0}；total=${compactionUsage.accounted_total_tokens || 0}；estimatedInput=${compactionUsage.estimated_input_tokens || 0}。`);
        if (!compactionUsageVerification.valid) {
            lines.push(`- Compaction usage 门禁：${compactionUsageVerification.issues.join(",") || "verification_failed"}；不得把该用量作为模型容量、成本或 provider 可靠性证据。`);
        }
    }
    if (postCompactSessionStateResetVerification) {
        const reset = postCompactSessionStateReset;
        lines.push(`- 压缩后会话状态重置：status=${postCompactSessionStateResetVerification.valid ? "verified" : "fail_closed"}；path=${reset.compact_path || "unknown"}；generation=${reset.post_compact_mark?.generation || 0}；durableCursor=${reset.durable_boundary_cursor?.message_id || "missing"}；providerCursor=${reset.provider_active_cursor?.status || "missing"}；cache=${reset.cache_read_baseline?.status || "missing"}；warning=${reset.compact_warning?.status || "missing"}；failures=${reset.auto_compact_failure_state?.consecutive_failures ?? "unknown"}。`);
        if (!postCompactSessionStateResetVerification.valid) {
            lines.push(`- 压缩后会话状态门禁：${postCompactSessionStateResetVerification.issues.join(",") || "verification_failed"}；不得沿用旧 provider cursor 或旧 cache baseline。`);
        }
    }
    if (promptCacheCompactionNotificationVerification) {
        lines.push(`- Prompt cache 压缩通知：status=${promptCacheCompactionNotificationVerification.valid ? "verified" : "fail_closed"}；generation=${promptCacheCompactionNotification.baseline_generation || 0}；baseline=${promptCacheCompactionNotification.baseline_status || "unknown"}；receipt=${promptCacheCompactionNotification.receipt_checksum || "missing"}。`);
    }
    if (promptCacheBreakDetection.schema) {
        const event = promptCacheBreakDetection.last_event || {};
        const deletion = promptCacheBreakDetection.pending_cache_deletion?.notification || {};
        lines.push(`- Prompt cache 运行时：status=${promptCacheBreakDetection.status || "unknown"}；calls=${promptCacheBreakDetection.call_count || 0}；breaks=${promptCacheBreakDetection.cache_break_count || 0}；promptStates=${promptCacheBreakDetection.prompt_state_call_count || 0}；generation=${promptCacheBreakDetection.baseline_generation || 0}；last=${event.classification || (promptCacheBreakDetection.pending_post_compaction ? "post_compaction_pending" : deletion.schema ? "cache_deletion_pending" : "none")}；reason=${event.cache_break_reason || "none"}；promptChanged=${event.prompt_changed === true}；promptCauses=${Array.isArray(event.prompt_change_causes) && event.prompt_change_causes.length ? event.prompt_change_causes.join(",") : "none"}；postCompact=${event.is_post_compaction === true}；microcompactDeletion=${deletion.schema ? "pending" : event.cache_deletion_applied === true ? "consumed" : "none"}；executionReceipt=${deletion.execution_receipt_id || event.microcompact_execution_receipt_id || "none"}。`);
    }
    const criticalPostCompactTaskStatuses = (Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates : [])
        .filter((candidate) => candidate.kind === "task_status")
        .slice(0, 12);
    if (criticalPostCompactTaskStatuses.length) {
        lines.push("- 压缩后子任务状态（避免重复派发；执行前按 task_id 核对当前状态）：");
        for (const candidate of criticalPostCompactTaskStatuses) {
            lines.push(`  - candidate_id=${candidate.candidate_id || ""}；${candidate.value || ""}`);
        }
    }
    const criticalPostCompactFiles = (Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates : [])
        .filter((candidate) => candidate.kind === "file")
        .slice(0, 5);
    if (criticalPostCompactFiles.length) {
        lines.push("- 压缩后文件恢复候选（已与 preserved tail 完整 Read 去重；使用前读取当前文件）：");
        for (const candidate of criticalPostCompactFiles) {
            lines.push(`  - candidate_id=${candidate.candidate_id || ""}；file=${candidate.value || ""}`);
        }
    }
    if (truePostCompactPayloadBudget.schema) {
        const components = truePostCompactPayloadBudget.components || {};
        lines.push(`- True post-compact payload：tokens=${truePostCompactPayloadBudget.true_post_compact_token_count || 0}/${truePostCompactPayloadBudget.trigger_tokens || 0}；summary=${components.summary || 0}；recent=${components.recent_window || 0}；reinjection=${components.reinjection || 0}；session/tool=${Number(components.session_memory_restore || 0) + Number(components.tool_continuity_restore || 0)}；nextTurnRetrigger=${truePostCompactPayloadBudget.will_retrigger_next_turn === true}。`);
    }
    if (postCompactPayloadGate.schema) {
        lines.push(`- 压缩后 payload 门禁：status=${postCompactPayloadGate.status || "unknown"}；action=${postCompactPayloadGate.action || "unknown"}；prePTL=${postCompactPayloadGate.pre_ptl_token_count || 0}；final=${postCompactPayloadGate.true_post_compact_token_count || 0}；ptl=${postCompactPayloadGate.ptl_applied === true}。`);
    }
    if (providerNativeCompactSessionCapacityReconciliation.schema) {
        lines.push(`- Provider compact generation 对账：status=${providerNativeCompactSessionCapacityReconciliation.status || "unknown"}；boundary=${providerNativeCompactSessionCapacityReconciliation.boundary_id || "none"}；compactHeadGeneration=${providerNativeCompactSessionCapacityReconciliation.compact_head_generation || 0}；capacityGeneration=${providerNativeCompactSessionCapacityReconciliation.generation || 0}；recovered=${providerNativeCompactSessionCapacityReconciliation.recovered === true}。`);
        if (["failed", "fail_closed"].includes(String(providerNativeCompactSessionCapacityReconciliation.status || ""))) {
            lines.push("- Provider compact 安全门禁：generation 对账未通过，本轮不得应用 provider-native context_management；只能按 advisory 执行并等待下一次有效对账。");
        }
    }
    if (providerNativeCompactSessionGenerationFence.schema) {
        lines.push(`- Provider compact generation fence：generation=${providerNativeCompactSessionGenerationFence.generation || 1}；lastReset=${providerNativeCompactSessionGenerationFence.last_reset_id || "none"}；旧 generation 的晚到 Provider outcome 不得恢复容量信用或 sticky beta。`);
    }
    if (postTurnSummaries.schema) {
        if (postTurnSummaries.valid !== true) {
            lines.push("- 最近逐轮摘要账本：完整性校验失败，本轮不得使用该账本；仅使用原始会话窗口、Session Memory 和当前源码证据。");
        }
        else {
            const turnRows = Array.isArray(postTurnSummaries.latest) ? postTurnSummaries.latest.slice(-6) : [];
            if (turnRows.length) {
                if (postTurnSummaryDeliveryCapsule?.capsule_checksum) {
                    lines.push(`- 逐轮摘要交付凭证：capsule_checksum=${postTurnSummaryDeliveryCapsule.capsule_checksum}；task_agent_session_id=${postTurnSummaryDeliveryCapsule.task_agent_session_id || ""}；attempt=${postTurnSummaryDeliveryCapsule.attempt_sequence || 0}；invocation=${postTurnSummaryDeliveryCapsule.invocation_kind || ""}；invocation_edge=${postTurnSummaryDeliveryCapsule.invocation_edge_id || ""}；parent_edge=${postTurnSummaryDeliveryCapsule.parent_invocation_edge_id || ""}；branch=${postTurnSummaryDeliveryCapsule.branch_id || ""}/${postTurnSummaryDeliveryCapsule.branch_kind || ""}；lineage_head=${postTurnSummaryDeliveryCapsule.expected_lineage_head_checksum || ""}；compact_epoch=${postTurnSummaryDeliveryCapsule.compact_epoch || ""}；ledger_head=${postTurnSummaryDeliveryCapsule.ledger_head_checksum || ""}。`);
                    lines.push("- 逐轮摘要回执：最终 CCM_AGENT_RECEIPT 必须引用上述 capsule_checksum；不得把该凭证用于其他群聊、gcs_* 会话或 tas_* 会话。");
                }
                lines.push("- 最近逐轮摘要（绑定原始 assistant message，不替代当前源码）：");
                for (const row of turnRows) {
                    const details = [
                        row.title ? (0, group_memory_shared_1.compactMemoryText)(row.title, 140) : "",
                        row.recentAction ? `recent_action=${(0, group_memory_shared_1.compactMemoryText)(row.recentAction, 220)}` : "",
                        row.needsAction ? `needs_action=${(0, group_memory_shared_1.compactMemoryText)(row.needsAction, 220)}` : "",
                        Array.isArray(row.artifactUrls) && row.artifactUrls.length ? `artifacts=${row.artifactUrls.slice(0, 4).join(",")}` : "",
                    ].filter(Boolean).join("；");
                    lines.push(`  - [${row.statusCategory || "completed"}] ${row.agent || "group-main-agent"} / ${row.summarizesMessageId || "unknown"}：${details || "该轮无额外摘要"}`);
                }
            }
        }
    }
    if (taskAgentInvocationLineage?.invocation_edge_id) {
        lines.push(`- Task Agent invocation lineage：edge=${taskAgentInvocationLineage.invocation_edge_id}；parent=${taskAgentInvocationLineage.parent_invocation_edge_id || "root"}；root=${taskAgentInvocationLineage.root_invocation_edge_id || taskAgentInvocationLineage.invocation_edge_id}；branch=${taskAgentInvocationLineage.branch_id || ""}/${taskAgentInvocationLineage.branch_kind || "main"}；expected_head=${taskAgentInvocationLineage.expected_lineage_head_checksum || "root"}。`);
        lines.push("- 本轮回执与 runner request 只能提交到上述 invocation edge；不得跨 group、gcs_*、tas_* 或 branch 复用。 ");
    }
    if (resumeProjection.schema) {
        lines.push(`- durable resume projection：status=${resumeProjection.status || "unknown"}；verified=${resumeProjection.verified === true}；recovered=${resumeProjection.recovered === true}；raw=${resumeProjection.rawMessageCount || 0}；prefix_omitted=${resumeProjection.omittedMessageCount || 0}；snip_omitted=${resumeProjection.snipOmittedMessageCount || 0}；projected=${resumeProjection.projectedMessageCount || 0}；boundary=${resumeProjection.boundary?.boundaryId || "none"}；proof=${resumeProjection.proof?.proofId || "none"}。`);
        if (resumeProjection.snipReplay?.applied) {
            lines.push(`- durable snip replay：markers=${resumeProjection.snipReplay.markerCount || 0}；removed=${resumeProjection.snipReplay.removedMessageCount || 0}；relinked=${resumeProjection.snipReplay.relinkedMessageCount || 0}；tokens_freed~${resumeProjection.snipReplay.removedTokenEstimate || 0}；checksum=${resumeProjection.snipReplay.removalChecksum || "none"}；原始 transcript 未修改。`);
        }
        if (resumeProjection.roundTripConsistency?.schema) {
            lines.push(`- resume round-trip consistency：status=${resumeProjection.roundTripConsistency.status || "unknown"}；expected=${resumeProjection.roundTripConsistency.expectedActiveMessageCount || 0}；actual=${resumeProjection.roundTripConsistency.actualActiveMessageCount || 0}；delta=${resumeProjection.roundTripConsistency.delta || 0}；checksum=${resumeProjection.roundTripConsistency.checksum || "none"}。`);
        }
        if (resumeProjection.compactHeadRecovery?.schema) {
            lines.push(`- compact-head restart recovery：status=${resumeProjection.compactHeadRecovery.status || "unknown"}；recovered=${resumeProjection.compactHeadRecovery.recovered === true}；prior_generation=${resumeProjection.compactHeadRecovery.priorHeadGeneration || 0}；current_generation=${resumeProjection.compactHeadRecovery.head?.generation || 0}。`);
        }
        if (resumeProjection.status === "fail_closed_rebuild_required") {
            lines.push("- 恢复门禁：压缩边界未通过验证，本轮只能使用当前会话完整 raw transcript 重建结果；不得按可疑旧边界剪枝。 ");
        }
    }
    if (bundle.task_query)
        lines.push(`- 你本次任务：${bundle.task_query}`);
    if (typedPressureRepairMatches.length) {
        const primary = typedPressureRepairMatches[0];
        lines.push(`- pressure repair ${primary.gapType}:${primary.status}：typed MEMORY.md pressure provenance under repair；docs=${typedPressureRepairMatches.map((item) => item.relPath).filter(Boolean).join(",") || "unknown"}；work_item=${primary.workItemId || "unknown"}；provenance=${primary.provenanceStatus || "under_repair"}。`);
        lines.push("- pressure provenance pre-dispatch discipline：CCM_AGENT_RECEIPT.memoryProvenanceUsage 必须逐条声明 relPath、usageState、provenanceStatus、repairWorkItemId、repairStatus、repairGapType、currentSourceVerified；使用 disputed/stale-under-repair 记忆时必须先重读/核验当前源并声明 currentSourceVerified=true。");
        const examples = Array.isArray(pressureMemoryProvenanceReceiptDiscipline.exampleRows) ? pressureMemoryProvenanceReceiptDiscipline.exampleRows : [];
        if (examples.length) {
            lines.push(`- memoryProvenanceUsage 示例：${(0, group_memory_shared_1.compactMemoryText)(JSON.stringify(examples.slice(0, 2)), 900)}`);
        }
    }
    if (providerRankingCompactRepairReceiptRecall.active === true) {
        const relPaths = Array.isArray(providerRankingCompactRepairReceiptRecall.typedMemoryRelPaths || providerRankingCompactRepairReceiptRecall.typed_memory_rel_paths)
            ? (providerRankingCompactRepairReceiptRecall.typedMemoryRelPaths || providerRankingCompactRepairReceiptRecall.typed_memory_rel_paths).slice(0, 6)
            : [];
        const rowIds = Array.isArray(providerRankingCompactRepairReceiptRecall.typedMemoryRowIds || providerRankingCompactRepairReceiptRecall.typed_memory_row_ids)
            ? (providerRankingCompactRepairReceiptRecall.typedMemoryRowIds || providerRankingCompactRepairReceiptRecall.typed_memory_row_ids).slice(0, 6)
            : [];
        const receiptDisciplineRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            providerRankingCompactRepairReceiptRecall.memoryUsageReceiptDisciplineRelPaths,
            providerRankingCompactRepairReceiptRecall.memory_usage_receipt_discipline_rel_paths,
            providerRankingCompactRepairReceiptRecall.targetPaths,
            providerRankingCompactRepairReceiptRecall.target_paths,
        ], 12).filter((item) => item === group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH);
        lines.push(`- provider ranking compact repair receipt memory：doc=${providerRankingCompactRepairReceiptRecall.docRelPath || group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH}；archived=${providerRankingCompactRepairReceiptRecall.archivedCount || providerRankingCompactRepairReceiptRecall.archived_count || 0}；recalled=${providerRankingCompactRepairReceiptRecall.recalledThisTurn === true}；reason=${providerRankingCompactRepairReceiptRecall.reason || "verified_archive_available"}。`);
        lines.push("- provider switch boundary：provider switch execution history is ranking evidence only, not authorization；future explicit provider switches still require a fresh valid provider switch decision receipt/checksum/local authority/task compatibility.");
        if (receiptDisciplineRelPaths.length) {
            lines.push(`- provider ranking memory usage receipt discipline：docs=${receiptDisciplineRelPaths.join("、")}；最终 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 必须引用已浮现的 receipt discipline doc，声明 usageState，并继续写明 ranking evidence only, not authorization 与 fresh valid provider switch decision receipt 要求。`);
        }
        if (relPaths.length || rowIds.length) {
            lines.push(`  - compact-safe provenance anchors：relPaths=${relPaths.join("、") || "none"}；rowIds=${rowIds.join("、") || "none"}。`);
        }
    }
    if (postCompactReinjectionRepairReceiptRecall.active === true) {
        const docRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            postCompactReinjectionRepairReceiptRecall.surfacedRelPaths,
            postCompactReinjectionRepairReceiptRecall.docRelPaths,
            postCompactReinjectionRepairReceiptRecall.doc_rel_paths,
        ], 6);
        const gateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            postCompactReinjectionRepairReceiptRecall.gateIds,
            postCompactReinjectionRepairReceiptRecall.gate_ids,
        ], 6);
        const candidateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            postCompactReinjectionRepairReceiptRecall.candidateIds,
            postCompactReinjectionRepairReceiptRecall.candidate_ids,
        ], 6);
        const failedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            postCompactReinjectionRepairReceiptRecall.preservationFailedOutcomeIds,
            postCompactReinjectionRepairReceiptRecall.preservation_failed_outcome_ids,
        ], 6);
        const correctedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            postCompactReinjectionRepairReceiptRecall.preservationCorrectedOutcomeIds,
            postCompactReinjectionRepairReceiptRecall.preservation_corrected_outcome_ids,
        ], 6);
        lines.push(`- post-compact reinjection repair receipt memory：docs=${docRelPaths.join("、") || group_memory_shared_1.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH}；archived=${postCompactReinjectionRepairReceiptRecall.archivedCount || postCompactReinjectionRepairReceiptRecall.archived_count || 0}；recalled=${postCompactReinjectionRepairReceiptRecall.recalledThisTurn === true}；reason=${postCompactReinjectionRepairReceiptRecall.reason || "task_matched_verified_archive"}。`);
        if (postCompactReinjectionRepairReceiptRecall.preservationClosureUsageFeedback?.schema) {
            const feedback = postCompactReinjectionRepairReceiptRecall.preservationClosureUsageFeedback;
            lines.push(`- closure memory usage feedback：recommendation=${feedback.recommendation || "neutral_reverify_current_source"}；used=${feedback.usedCount || 0}；verified=${feedback.verifiedCount || 0}；ignored=${feedback.ignoredCount || 0}；weightedIgnored=${feedback.weightedIgnoredCount || 0}；confidence=${feedback.evidenceConfidence || 0}/${feedback.evidenceConfidenceThreshold || 0}；independentSessions=${feedback.independentSessionCount || 0}；correlatedDuplicates=${feedback.correlatedDuplicateCount || 0}；providers=${feedback.distinctProviderCount || 0}；receiptSources=${feedback.distinctReceiptSourceCount || 0}；matchedTaskFamilyEntries=${feedback.matchedEntryCount || 0}；unrelatedEntries=${feedback.unrelatedEntryCount || 0}；halfLifeDays=${feedback.aging?.half_life_days || 0}；stale=${feedback.staleCount || 0}；immutableClosureHistoryPreserved=${feedback.immutableClosureHistoryPreserved === true}。`);
            if (feedback.feedbackConflict?.active === true) {
                const conflict = feedback.feedbackConflict;
                lines.push(`- closure feedback conflict：state=${conflict.arbitration_state || "contradictory_reverify_current_session"}；positiveWeight=${conflict.positive?.weighted_evidence || 0}；ignoredWeight=${conflict.ignored?.weighted_evidence || 0}；ratio=${conflict.conflict_ratio || 0}；historicalMajorityAuthorizationAllowed=false。本次新会话必须重新读取当前源码并独立判断 memoryUsed/memoryIgnored，不能按历史多数自动升权或降权。`);
            }
            if (feedback.feedbackConflictResolution?.active === true) {
                const resolution = feedback.feedbackConflictResolution;
                lines.push(`- closure conflict resolution：state=${resolution.state || "resolved"}；usageState=${resolution.resolution_usage_state || ""}；resolutionEntry=${resolution.resolution_entry_id || ""}；historicalSession=${resolution.task_agent_session_id || ""}/${resolution.native_session_id || ""}；reversible=${resolution.reversible === true}；historicalBranchesPreserved=${resolution.historical_branches_preserved === true}。该结果仅是同任务族排序证据，本次新会话仍须重新核验当前源码。`);
            }
        }
        lines.push("- freshness boundary：historical repair completion is recovery evidence, not permanent repository truth；future use must reverify the current source before accepting a recovered candidate.");
        lines.push("- receipt requirement：最终 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 必须引用每个 surfaced receipt MEMORY.md；verified 必须同时提交 typedMemoryUsage.currentSourceEvidence（file_read、项目内 sourcePath、当前文件完整 SHA-256），只有平台复算匹配后才成立；无证明的 verified 会降为 used，ignored 必须写 reason。");
        if (gateIds.length || candidateIds.length) {
            lines.push(`  - historical repair identities：reinjection_gate_ids=${gateIds.join("、") || "none"}；candidate_ids=${candidateIds.join("、") || "none"}。`);
        }
        if (failedOutcomeIds.length || correctedOutcomeIds.length) {
            lines.push(`  - completion-memory preservation closure：failed_outcomes=${failedOutcomeIds.join("、") || "none"}；corrected_outcomes=${correctedOutcomeIds.join("、") || "none"}；该历史只用于恢复与去重，不能替代当前仓库核验。`);
        }
    }
    if (pressureProvenanceDispatchFeedbackPolicy?.active === true) {
        const rows = Array.isArray(pressureProvenanceDispatchFeedbackPolicy.policyRows) ? pressureProvenanceDispatchFeedbackPolicy.policyRows : [];
        const primary = rows[0] || {};
        const recoveryHint = Number(primary.recovery_credit || 0) > 0
            ? `；恢复抵扣=${primary.recovery_credit || 0}；有效违约=${primary.effective_violation_count ?? primary.violation_count ?? 0}`
            : "";
        const relapseHint = primary.relapsed ? `；恢复后复发=${primary.post_recovery_violation_count || 0}` : "";
        lines.push(`- pressure provenance dispatch feedback policy：agentType=${pressureProvenanceDispatchFeedbackPolicy.agentType || "unknown"}；project=${pressureProvenanceDispatchFeedbackPolicy.targetProject || bundle.target_project || "unknown"}；severity=${pressureProvenanceDispatchFeedbackPolicy.severity || "medium"}；历史违约=${primary.violation_count || 0}${recoveryHint}${relapseHint}；action=${pressureProvenanceDispatchFeedbackPolicy.action || "strengthen_pressure_memory_provenance_receipt_contract"}。`);
        lines.push("- 派发反馈要求：该执行器/项目历史上收到 pre-dispatch pressure provenance discipline 后仍遗漏过 memoryProvenanceUsage 或 currentSourceVerified；本轮 ACK 必须确认回执合同，最终 CCM_AGENT_RECEIPT 必须包含 memoryProvenanceUsage（无 pressure 记忆也要说明为空/未使用原因），主 Agent 关闭前必须复核。");
        if (Array.isArray(pressureProvenanceDispatchFeedbackPolicy.gapCodes) && pressureProvenanceDispatchFeedbackPolicy.gapCodes.length) {
            lines.push(`- 历史来源回执缺口：${pressureProvenanceDispatchFeedbackPolicy.gapCodes.slice(0, 6).join("、")}。`);
        }
    }
    if (sessionBinding.schema) {
        lines.push(`- 子 Agent 会话绑定：binding=${sessionBinding.binding_id || ""}；task=${sessionBinding.task_id || "unknown"}；session=${sessionBinding.task_agent_session_id || "unbound"}；native=${sessionBinding.native_session_id || "pending"}；turn=${sessionBinding.turn || 0}；executor=${sessionBinding.agent_type || "unknown"}；回执中的记忆使用声明应绑定本任务会话。`);
    }
    if (globalMemoryHealthGate.schema) {
        lines.push(`- Global Agent memory health gate：gate=${globalMemoryHealthGate.gate_id || ""}；status=${globalMemoryHealthGate.status || "unknown"}；active=${globalMemoryHealthGate.active_contamination_count || 0}；residue=${globalMemoryHealthGate.residue_contamination_count || 0}；action=${globalMemoryHealthGate.action || "unknown"}。`);
        if (globalMemoryHealthGate.status === "fail") {
            lines.push("- 全局记忆健康门阻断：active Global Agent memory 含自测污染或扫描失败；本轮不得使用 global_agent_memory 内容，只能使用当前群聊记忆、typed MEMORY.md、当前任务文本和实时仓库检查。回执 memoryIgnored 必须引用该 gate。");
        }
        else if (globalMemoryHealthGate.status === "warn") {
            lines.push("- 全局记忆健康门提示：active Global Agent memory 干净，但目录仍有历史自测残留；可使用 active 记忆，涉及文件/状态/授权时仍必须读取当前源并在 globalMemoryUsage 说明核验。");
        }
        else {
            lines.push("- 全局记忆健康门通过：active Global Agent memory 未发现自测污染；仍按历史上下文处理，当前源优先。");
        }
    }
    if (globalAgentMemory.schema && Number(globalAgentMemory.itemCount || 0) > 0) {
        const arbitration = globalAgentMemory.arbitration || {};
        const crossGroupSuppression = globalAgentMemory.crossGroupSuppression || {};
        lines.push(`- 全局 Agent 长期记忆召回：${globalAgentMemory.itemCount || 0} 条；source=${globalAgentMemory.file || "global-agent-memory"}；arbitration=${arbitration.status || "unknown"}；demoted=${arbitration.demotedCount || 0}；conflict=${arbitration.conflictCount || 0}；cross_group_suppressed=${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0}；这些是跨群聊/跨会话约束或历史结论，只能作为当前任务上下文，涉及文件、任务状态、授权边界时必须读取当前真实状态复核。`);
        if (Number(arbitration.demotedCount || 0) > 0 || Number(arbitration.conflictCount || 0) > 0) {
            lines.push("- 全局记忆仲裁规则：如果下方 global_memory_id 标记为 demoted/conflict，必须以本群聊更新证据或 typed MEMORY.md 为准；该全局记忆只作背景线索，不能直接应用。");
        }
        lines.push("- 全局记忆回执规则：回复 CCM_AGENT_RECEIPT 时必须填写 globalMemoryUsage，逐条声明本轮看到的 global_memory_id 是 used / ignored / verified / background / advisory；带 semantic_risk、demoted/conflict 或 cross_group_suppression 的记忆若被使用，必须声明 currentSourceVerified=true 和 semanticRiskAcknowledged/crossGroupSuppression。");
        if (Number(arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0) > 0) {
            lines.push(`- 跨群聊全局记忆抑制：${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0} 条全局记忆已在其他群聊仲裁账本中被降权/冲突；source=${crossGroupSuppression.sourceDir || "group-global-memory-arbitration"}；这些条目只能作为 background，必须按当前群聊证据、typed MEMORY.md 和实时仓库状态复核后再行动。`);
        }
        if (Number(crossGroupSuppression.advisoryCount || 0) > 0) {
            lines.push(`- 跨群聊抑制新鲜度：${crossGroupSuppression.advisoryCount || 0} 条跨群聊抑制已降级为 advisory；superseded=${crossGroupSuppression.supersededCount || 0}；decayed=${crossGroupSuppression.decayedCount || 0}；新 Global Agent 记忆或过旧 ledger 不应继续阻断当前上下文，但仍可作为排查线索。`);
        }
        if (globalAgentMemory.boundary?.archiveId) {
            const boundary = globalAgentMemory.boundary || {};
            const budget = boundary.context_budget || {};
            lines.push(`  - 全局记忆压缩边界：archive=${boundary.archiveId || ""}；recent=${boundary.preservedMessageCount || 0}；pressure=${budget.pressure ?? "unknown"}%。`);
        }
        for (const item of Array.isArray(globalAgentMemory.items) ? globalAgentMemory.items.slice(0, 5) : []) {
            const source = item.source || {};
            const itemArbitration = item.arbitration || {};
            const cross = item.crossGroupSuppression || itemArbitration.crossGroupSuppression || {};
            const messageIds = Array.isArray(source.messageIds) && source.messageIds.length ? `；messages=${source.messageIds.join(",")}` : "";
            const mission = source.missionId ? `；mission=${source.missionId}` : "";
            const semanticRisk = itemArbitration.semanticRisk || {};
            const semanticRiskText = Number(itemArbitration.semanticRiskScore || semanticRisk.score || 0) > 0
                ? ` semantic_risk=${itemArbitration.semanticRiskScore || semanticRisk.score};semantic=${semanticRisk.level || "unknown"};reasons=${(itemArbitration.semanticReasons || semanticRisk.reasons || []).slice(0, 4).join(",")}`
                : "";
            lines.push(`  - global_memory_id=${item.id || ""}；[${item.type || "memory"} score ${item.score ?? "?"} ${itemArbitration.status || "active"}${semanticRiskText}] ${item.text || ""}${item.howToApply ? `；apply=${item.howToApply}` : ""}；session=${source.sessionId || ""}${mission}${messageIds}`);
            if (cross.suppressed === true) {
                lines.push(`    - cross_group_suppression=background_only；groups=${cross.groupCount || 0}；conflict_groups=${cross.conflictGroupCount || 0}；occurrences=${cross.totalOccurrenceCount || 0}；action=${cross.action || "verify_current_group_before_use"}`);
            }
            else if (cross.advisory === true) {
                const freshness = cross.freshness || {};
                lines.push(`    - cross_group_suppression=advisory；reason=${cross.reason || ""}；superseded=${freshness.supersededByNewerGlobalMemory === true}；decayed=${freshness.decayedToAdvisory === true}；global_updated=${freshness.globalUpdatedAt || ""}；latest_cross_group_evidence=${freshness.latestEvidenceAt || ""}`);
            }
            for (const evidence of Array.isArray(itemArbitration.decisiveEvidence) ? itemArbitration.decisiveEvidence.slice(0, 2) : []) {
                const evidenceLabel = String(evidence.source || "").startsWith("cross_group") ? "cross_group_evidence" : "local_evidence";
                const evidenceSemantic = Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0) > 0
                    ? `；semantic_risk=${evidence.semanticRiskScore || evidence.semanticRisk?.score}；semantic_reasons=${(evidence.semanticReasons || evidence.semanticRisk?.reasons || []).slice(0, 4).join(",")}`
                    : "";
                lines.push(`    - ${evidenceLabel}=${evidence.source || "group"}${evidence.messageId ? `#${evidence.messageId}` : ""}；${evidence.conflict ? "conflict" : "newer"}${evidenceSemantic}；${evidence.text || ""}`);
            }
        }
    }
    if (globalMemoryArbitrationLedger.schema && Number(globalMemoryArbitrationLedger.entryCount || 0) > 0) {
        lines.push(`- 全局/群聊记忆仲裁账本：file=${globalMemoryArbitrationLedger.file || ""}；entries=${globalMemoryArbitrationLedger.entryCount || 0}；conflicts=${globalMemoryArbitrationLedger.conflictCount || 0}；repeated=${globalMemoryArbitrationLedger.repeatedConflictCount || 0}；若本轮任务涉及被降权全局记忆，应以本群聊证据和 typed MEMORY.md 为准，并可将重复冲突蒸馏为 typed memory。`);
    }
    if (typedMemory.arbitrationDistillation?.schema && typedMemory.arbitrationDistillation.skipped !== true) {
        const write = typedMemory.arbitrationDistillation.write || {};
        lines.push(`- 全局记忆仲裁蒸馏：candidate=${typedMemory.arbitrationDistillation.candidateCount || 0}；typed=${write.file || "typed-memory"}；changed=${write.changed === true}；重复全局冲突已沉淀为 typed MEMORY.md，后续子 Agent 应优先按该本群聊规则召回。`);
    }
    if (compaction.compactedMessageCount) {
        lines.push(`- 压缩边界：已压缩 ${compaction.compactedMessageCount} 条，保留近期 ${compaction.preservedRecentMessages || 0} 条；策略 ${compaction.strategy || "unknown"}；健康状态 ${compaction.health || "unknown"}。`);
        if (compaction.lastCompactedMessageId)
            lines.push(`- 最近压缩至 message id：${compaction.lastCompactedMessageId}${compaction.summaryChecksum ? `；摘要校验 ${compaction.summaryChecksum}` : ""}`);
    }
    if (compaction.boundary?.preservedSegment?.schema) {
        const segment = compaction.boundary.preservedSegment;
        lines.push(`- CC 风格保留窗口：preservedSegment 保留 ${segment.preservedMessageCount || 0} 条原文、约 ${segment.preservedTokenEstimate || 0} tokens、${segment.preservedTextBlockMessageCount || 0} 条文本消息；首尾 ${segment.firstPreservedMessageId || "unknown"} -> ${segment.lastPreservedMessageId || "unknown"}。`);
    }
    if (compaction.boundaryHistory?.schema) {
        const history = compaction.boundaryHistory;
        const latest = history.latest || {};
        lines.push(`- 历史压缩边界：保留 ${history.boundaryCount || 0} 个 compact boundaries；最新 ${latest.summaryChecksum || latest.summarizedThroughMessageId || latest.id || "unknown"}；历史边界用于 Memory Center 多边界 replay，必要时可按 raw messages 回溯旧摘要。`);
    }
    if ((0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(sessionMemory)) {
        lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；snapshot=${sessionMemory.snapshotFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；hasSummary=${sessionMemory.hasSummary !== false}。`);
        const cadence = sessionMemory.updateCadence || sessionMemory.update_cadence || {};
        if (cadence.schema) {
            lines.push(`- Session Memory 更新节奏：${cadence.status || "unknown"}；lastExtractionCursor=${cadence.lastExtractionCursorStatus || "legacy"}；advance=${cadence.cursorAdvanceStatus || "legacy"}；delta=${cadence.tokensSinceLastExtraction || 0} tokens；toolCalls=${cadence.toolCallsSinceLastExtraction || 0}；扫描消息=${cadence.toolCallScanMessageCount || 0}。游标缺失时不得把整段历史工具调用误算为新增量。`);
            if (cadence.cursorAdvanceStatus === "held_tool_use_boundary")
                lines.push(`- 本轮 Session Memory 已完成更新，但游标因最后一个 assistant turn 含工具调用而保持在 ${cadence.cursorAfter || cadence.cursorBefore || "session-start"}；项目子 Agent 继续接收完整工具调用边界。`);
        }
        if (sessionMemory.markdownExcerpt) {
            lines.push(`  - Session Memory 摘要片段：${(0, group_memory_shared_1.compactMemoryText)(sessionMemory.markdownExcerpt, 620)}`);
        }
        const activeFactProjection = sessionMemory.factSupersession || sessionMemory.fact_supersession || {};
        const activeReplacementFacts = (Array.isArray(activeFactProjection.activeFacts) ? activeFactProjection.activeFacts : [])
            .filter((fact) => fact.source === "explicit_replacement")
            .slice(0, 12);
        if (activeFactProjection.schema) {
            lines.push(`- Session Memory 事实替代图：graph=${activeFactProjection.graphChecksum || ""}；valid=${activeFactProjection.graphValid === true}；active=${activeFactProjection.activeFactCount || 0}；superseded=${activeFactProjection.supersededFactCount || 0}；unjustified_lost=${activeFactProjection.unjustifiedLostFactCount || 0}。子 Agent 只能使用 active facts，不得恢复已替代旧事实。`);
        }
        const modelReplayEvidence = sessionMemory.modelExtractionReplayEvidence || sessionMemory.model_extraction_replay_evidence || {};
        if (modelReplayEvidence.schema) {
            lines.push(`- Session Memory 模型提取交付证据：execution=${modelReplayEvidence.executionId || ""}；receipt=${modelReplayEvidence.receiptChecksum || ""}；history_head=${modelReplayEvidence.historyHeadChecksum || ""}；replay=${modelReplayEvidence.replayStatus || ""}；replay_execution=${modelReplayEvidence.replayExecutionId || ""}；valid=${modelReplayEvidence.checksumValid === true && modelReplayEvidence.historyIntegrityValid === true && modelReplayEvidence.replayPass === true}。memoryContextUsage 必须原样回传 execution、replay 和 fact graph checksum。`);
        }
        if (activeReplacementFacts.length) {
            lines.push(`  - 当前有效替代事实：${activeReplacementFacts.map((fact) => `${fact.factId}:${fact.factChecksum}:message=${fact.sourceMessageId}:${(0, group_memory_shared_1.compactMemoryText)(fact.text, 240)}`).join("；")}`);
        }
        lines.push(`- Session Memory 回执绑定：memoryContextUsage.bindingId=${sessionBinding.binding_id || ""}；groupSessionId=${bundle.group_session_id || ""}；sessionMemoryChecksum=${sessionMemory.markdownChecksum || ""}；modelExtractionExecutionId=${modelReplayEvidence.executionId || ""}；modelExtractionReplayStatus=${modelReplayEvidence.replayStatus || ""}；factSupersessionGraphChecksum=${activeFactProjection.graphChecksum || ""}；必须由子 Agent 原样回传并声明 used/verified/ignored。`);
        const sectionEvidence = sessionMemory.sectionEvidence || sessionMemory.section_evidence || {};
        const evidenceRows = Array.isArray(sectionEvidence.sections) ? sectionEvidence.sections.slice(0, 12) : [];
        if (evidenceRows.length) {
            lines.push(`- Session Memory 章节证据（used/verified 时 memoryFactCitations 必须引用）：${evidenceRows.map((item) => `${item.evidenceId || item.evidence_id}:${item.section || "section"}:${item.sectionChecksum || item.section_checksum}:${item.sourceTranscriptChecksum || item.source_transcript_checksum || sectionEvidence.sourceTranscriptChecksum || ""}:messages=${(item.sourceMessageIds || item.source_message_ids || sectionEvidence.sourceMessageIds || []).slice(0, 12).join(",")}`).join("；")}`);
        }
    }
    else {
        lines.push(`- Session Memory 尚未达到初始化阈值：memoryContextUsage.bindingId=${sessionBinding.binding_id || ""}；groupSessionId=${bundle.group_session_id || ""}；sessionMemoryChecksum 留空；仍需声明近期原文窗口是 used/verified/ignored。`);
    }
    if (toolContinuity.schema) {
        const allowed = toolContinuity.allowedTools || {};
        const requested = toolContinuity.requested || {};
        const synced = toolContinuity.synced || {};
        const missing = toolContinuity.missing || {};
        lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；snapshot=${toolContinuity.snapshotFile || "未记录"}；status=${toolContinuity.status || "empty"}；allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}；requested MCP ${(requested.mcp || []).length}/Skill ${(requested.skill || []).length}；synced MCP ${(synced.mcp || []).length}/Skill ${(synced.skill || []).length}；missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}。`);
        lines.push("- 工具/技能连续性使用边界：这里只恢复上下文和上次运行证据，不扩大授权；真实工具派发仍必须通过当前 runtime tool gate、MCP sync 和 authorization readiness。");
        if ((allowed.mcp || []).length || (allowed.skill || []).length) {
            lines.push(`  - 连续性工具线索：MCP ${(allowed.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(allowed.skill || []).slice(0, 8).join("、") || "无"}。`);
        }
        if (Array.isArray(toolContinuity.invokedSkills) && toolContinuity.invokedSkills.length) {
            lines.push(`  - 历史已调用 Skill：${toolContinuity.invokedSkills.slice(0, 8).map((item) => `${item.name || "unknown"}${item.contentHash ? `#${item.contentHash}` : ""}`).join("、")}`);
        }
        if ((missing.mcp || []).length || (missing.skill || []).length) {
            lines.push(`  - 工具缺口：MCP ${(missing.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(missing.skill || []).slice(0, 8).join("、") || "无"}；本轮不能假定缺失工具可用。`);
        }
    }
    if (compaction.childAgentTypes?.schema) {
        const types = compaction.childAgentTypes;
        lines.push(`- 子 Agent 类型矩阵：${types.agentTypeCount || 0} 类 / ${types.targetCount || 0} 个目标；Memory Center 会按 Claude Code / Cursor / Codex 等类型分别 replay，确保每种第三方新会话都收到群聊记忆上下文。`);
        for (const row of Array.isArray(types.rows) ? types.rows.slice(0, 5) : []) {
            lines.push(`  - ${row.agentType || "unknown"}：${row.targetCount || 0} 个目标（${(row.targets || []).slice(0, 4).map((item) => item.targetProject).filter(Boolean).join("、") || "unknown"}）`);
        }
    }
    if (compaction.contextPressureWarning?.schema) {
        const warning = compaction.contextPressureWarning;
        const thresholds = warning.thresholds || {};
        lines.push(`- 上下文压力预警：${warning.level || "unknown"}；使用约 ${warning.tokenUsage || 0} tokens，距 auto-compact 约 ${warning.percentLeft ?? "unknown"}%；建议 ${warning.recommendation || "continue"}；阈值 warning=${thresholds.warningThreshold || 0}, auto=${thresholds.autoCompactThreshold || 0}, blocking=${thresholds.blockingThreshold || 0}${warning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
    }
    if (sourceManifest.schema) {
        lines.push(`- 记忆源 manifest：${sourceManifest.status || "unknown"}；源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0} 个；最新源 ${sourceManifest.latestMtime || "unknown"}；manifest ${sourceManifest.manifestChecksum || ""}。`);
        if (Array.isArray(sourceManifest.missingRequired) && sourceManifest.missingRequired.length) {
            lines.push(`- 记忆源缺失：${sourceManifest.missingRequired.join("、")}；本轮必须按当前任务和实时检查补证据，不能假定缺失记忆存在。`);
        }
        if (Array.isArray(sourceManifest.changedAfterManifest) && sourceManifest.changedAfterManifest.length) {
            lines.push(`- 记忆源变化：${sourceManifest.changedAfterManifest.join("、")} 在 manifest 生成后变化；使用前需要重新读取对应源。`);
        }
    }
    if (compactFileReferences.schema && Array.isArray(compactFileReferences.references) && compactFileReferences.references.length) {
        lines.push(`- CC 风格 compact file references：${compactFileReferences.referenceCount || compactFileReferences.references.length} 个；missing=${compactFileReferences.missingCount || 0}；这些文件/目录在上次压缩或记忆构建前已作为上下文来源引用，但内容不会全部塞入本包。`);
        lines.push("- 文件引用使用规则：需要更多原文时，优先读取 raw_group_messages_json 或 typed MEMORY.md；读取前按当前任务判断相关性，读取后在回执 memoryUsed/memoryIgnored 中声明 reference_id 或路径。");
        for (const reference of compactFileReferences.references.slice(0, 10)) {
            lines.push(`  - reference_id=${reference.reference_id || ""}；${reference.type || "memory_source"}；${reference.displayPath || reference.path || ""}；exists=${reference.exists === true}；${reference.reason || ""}`);
        }
    }
    if (compactFileReferenceReadPlan.schema && Array.isArray(compactFileReferenceReadPlan.entries) && compactFileReferenceReadPlan.entries.length) {
        lines.push(`- compact file reference read plan：planned=${compactFileReferenceReadPlan.plannedCount || 0}/${compactFileReferenceReadPlan.sourceReferenceCount || 0}；sourceOfTruth=${compactFileReferenceReadPlan.hasSourceOfTruth === true}；summary=${compactFileReferenceReadPlan.hasCompactSummary === true}；mode=${compactFileReferenceReadPlan.policy?.mode || "read_on_demand"}。`);
        lines.push("- 读取计划规则：不要全量读取所有引用；只在当前任务需要更多原文、摘要冲突或需要核对 message id/typed MEMORY.md 时读取；读取或决定不读都要在 memoryUsed/memoryIgnored 引用 read_plan_id 或 reference_id。");
        for (const entry of compactFileReferenceReadPlan.entries.slice(0, 8)) {
            lines.push(`  - read_plan_id=${entry.read_plan_id || ""}；priority=${entry.priority || 0}；${entry.action || "read_if_needed"}；reference_id=${entry.reference_id || ""}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}；${entry.reason || ""}`);
        }
    }
    if (compactFileReferenceReadPlanAccess.schema) {
        lines.push(`- compact read plan access ledger：surfaced=${compactFileReferenceReadPlanAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceReadPlanAccess.mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；read_plan_id=${compactFileReferenceReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；ledger=${compactFileReferenceReadPlanAccess.ledger_file || "未记录"}。`);
    }
    if (compactFileReferenceReadPlanFreshness.schema) {
        lines.push(`- compact read plan source freshness：status=${compactFileReferenceReadPlanFreshness.status || "unknown"}；fresh=${compactFileReferenceReadPlanFreshness.freshCount || 0}/${compactFileReferenceReadPlanFreshness.checked || 0}；changed=${compactFileReferenceReadPlanFreshness.changedCount || 0}；unverifiable=${compactFileReferenceReadPlanFreshness.unverifiableCount || 0}。`);
        for (const row of Array.isArray(compactFileReferenceReadPlanFreshness.staleRows) ? compactFileReferenceReadPlanFreshness.staleRows.slice(0, 5) : []) {
            lines.push(`  - stale read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || "unknown"}；${row.path || ""}；使用前必须重新读取当前源并在 memoryUsed/memoryIgnored 声明。`);
        }
    }
    if (compactFileReferenceReadPlanRevalidationGate.schema && (Number(compactFileReferenceReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactFileReferenceReadPlanRevalidationGate.verification_count || 0) > 0)) {
        const gateSession = compactFileReferenceReadPlanRevalidationGate.session_binding || {};
        lines.push(`- compact read plan revalidation gate：gate=${compactFileReferenceReadPlanRevalidationGate.revalidation_gate_id || ""}；status=${compactFileReferenceReadPlanRevalidationGate.status || "unknown"}；required=${compactFileReferenceReadPlanRevalidationGate.required_count || 0}；verify=${compactFileReferenceReadPlanRevalidationGate.verification_count || 0}；session=${gateSession.task_agent_session_id || compactFileReferenceReadPlanRevalidationGate.task_agent_session_id || "unbound"}；action=${compactFileReferenceReadPlanRevalidationGate.action || "unknown"}。`);
        for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.required_entries) ? compactFileReferenceReadPlanRevalidationGate.required_entries.slice(0, 5) : []) {
            lines.push(`  - must re-read read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || row.freshness_status || "changed"}；${row.displayPath || row.path || ""}；使用任何旧摘要/记忆前先读取当前源，回执 memoryUsed/memoryIgnored 必须同时写 gate、read_plan_id 和 current source verified/re-read。`);
        }
        for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.verification_entries) ? compactFileReferenceReadPlanRevalidationGate.verification_entries.slice(0, 3) : []) {
            lines.push(`  - verify read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；fingerprint missing；${row.displayPath || row.path || ""}；使用前先核验当前源或在 memoryIgnored 说明不使用。`);
        }
    }
    if (compactFileReferenceAccess.schema) {
        lines.push(`- compact file reference access ledger：surfaced=${compactFileReferenceAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceAccess.mentioned_count || 0}/${compactFileReferenceAccess.reference_count || 0}；ledger=${compactFileReferenceAccess.ledger_file || "未记录"}；该指标用于 Memory Center 检查子 Agent 是否真的声明使用了压缩后文件引用。`);
    }
    if (reloadAudit.schema) {
        lines.push(`- 记忆 reload 审计：reason=${reloadAudit.reason || "unknown"}；action=${reloadAudit.cacheAction || "unknown"}；sourceChanged=${reloadAudit.sourceManifestChanged === true}；loadPlanChanged=${reloadAudit.loadPlanChanged === true}；scope=${reloadAudit.scope || "default"}。`);
        if (reloadAudit.sourceChangeTrigger?.triggered) {
            lines.push(`- 记忆源变更触发 reload：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}；ids=${(reloadAudit.sourceChangeTrigger.changedIds || []).slice(0, 6).join("、") || "unknown"}。`);
        }
    }
    if (dispatchGate.schema) {
        const gateSource = dispatchGate.source_manifest || {};
        const gateReload = dispatchGate.reload_audit || {};
        lines.push(`- 子 Agent 记忆派发新鲜度：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "unknown"}；action=${dispatchGate.action || "unknown"}；source=${gateSource.checksum || "unknown"}；reload=${gateReload.reason || "unknown"}；回执 memoryUsed/memoryIgnored 必须声明是否使用该 gate 的记忆包。`);
    }
    if (reinjectionGate.schema) {
        const audit = reinjectionGate.post_compact_recovery_audit || {};
        lines.push(`- 压缩后重注入门禁：gate=${reinjectionGate.reinjection_gate_id || ""}；status=${reinjectionGate.status || "required"}；候选 ${reinjectionGate.candidate_count || 0} 条；summary=${audit.summary_checksum || "unknown"}；回执 memoryUsed/memoryIgnored 必须引用该 gate，postCompactCandidateUsage 必须逐条声明每个候选 used / ignored / verified。`);
        for (const candidate of Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates.slice(0, 8) : []) {
            lines.push(`  - candidate_id=${candidate.candidate_id || ""}；${candidate.kind || "candidate"}：${candidate.value || ""}${candidate.sourceMessageId ? `（#${candidate.sourceMessageId}）` : ""}`);
        }
    }
    if (postCompactDispatchMarker.schema) {
        lines.push(`- 压缩后派发标记：marker=${postCompactDispatchMarker.marker_id || ""}；boundary=${postCompactDispatchMarker.boundary_id || ""}；sequence=${postCompactDispatchMarker.dispatch_sequence || 0}；first=${postCompactDispatchMarker.first_dispatch_after_compact === true}；summary=${postCompactDispatchMarker.summary_checksum || "unknown"}；这是对齐 Claude Code pendingPostCompaction 的群聊子 Agent 派发遥测。`);
        if (postCompactDispatchMarker.first_dispatch_after_compact === true) {
            lines.push("- 压缩后首次派发要求：本轮子 Agent 应把上方群聊记忆包视为压缩恢复后的第一跳上下文，优先核对重注入候选、摘要边界和近期原文窗口。");
        }
    }
    if (postCompactCandidateUsage.schema && postCompactCandidateUsage.has_history) {
        const totals = postCompactCandidateUsage.totals || {};
        lines.push(`- 压缩重注入候选使用账本：候选 ${postCompactCandidateUsage.candidate_count || 0} 条；used=${totals.used || 0} ignored=${totals.ignored || 0} verified=${totals.verified || 0} mentioned=${totals.mentioned || 0}；ledger=${postCompactCandidateUsage.ledger_file || "未记录"}。`);
        for (const row of Array.isArray(postCompactCandidateUsage.useful_candidates) ? postCompactCandidateUsage.useful_candidates.slice(0, 4) : []) {
            lines.push(`  - 历史有效候选 candidate_id=${row.candidate_id || ""}；${row.kind || "candidate"}：${row.value || ""}；used=${row.used_count || 0} verified=${row.verified_count || 0} ignored=${row.ignored_count || 0}；建议=${row.recommendation || "neutral_verify_current_context"}。`);
        }
        for (const row of Array.isArray(postCompactCandidateUsage.ignored_candidates) ? postCompactCandidateUsage.ignored_candidates.slice(0, 3) : []) {
            lines.push(`  - 历史多次忽略候选 candidate_id=${row.candidate_id || ""}；${row.value || ""}；ignored=${row.ignored_count || 0} used=${row.used_count || 0} verified=${row.verified_count || 0}；本轮仍需按当前任务核验，不要盲目采用。`);
        }
        if (Array.isArray(postCompactCandidateUsage.missing_usage_candidates) && postCompactCandidateUsage.missing_usage_candidates.length) {
            lines.push(`  - 历史缺使用状态候选：${postCompactCandidateUsage.missing_usage_candidates.slice(0, 4).map((row) => row.candidate_id || row.value).filter(Boolean).join("、")}；本轮回执必须明确 used / ignored / verified。`);
        }
    }
    if (compaction.postCompactRecoveryAudit?.schema) {
        const audit = compaction.postCompactRecoveryAudit;
        const failed = Array.isArray(audit.failedChecks) ? audit.failedChecks : [];
        const candidates = audit.candidateCounts || {};
        const candidateCount = Number(candidates.files || 0) + Number(candidates.skills || 0) + Number(candidates.verification || 0) + Number(candidates.blockers || 0) + Number(candidates.taskStatuses || candidates.task_statuses || 0);
        lines.push(`- 压缩后恢复审计：${audit.status || "unknown"}；通过 ${audit.passedChecks || 0}/${audit.checkCount || 0}；重注入候选 ${candidateCount} 条；raw transcript ${audit.transcriptPath || "未记录"}；动作 ${audit.action || "unknown"}。`);
        if (failed.length)
            lines.push(`- 压缩后恢复风险：${failed.slice(0, 5).join("、")}；需要优先按 raw transcript / typed MEMORY.md 回溯后再执行。`);
    }
    if (compaction.postCompactCleanupAudit?.schema) {
        const cleanup = compaction.postCompactCleanupAudit;
        const failed = Array.isArray(cleanup.failedChecks) ? cleanup.failedChecks : [];
        lines.push(`- 压缩后清理审计：${cleanup.status || "unknown"}；通过 ${cleanup.passedChecks || 0}/${cleanup.checkCount || 0}；mode=${cleanup.mode || "unknown"}；动作 ${cleanup.action || "unknown"}。`);
        lines.push(`- 清理边界：派生 microcompact/context packet 状态必须重建；invoked skills/tool continuity 不清除；candidate/replay/hook ledger 保留；raw=${cleanup.transcriptPath || "未记录"}。`);
        if (failed.length)
            lines.push(`- 压缩后清理风险：${failed.slice(0, 5).join("、")}；本轮子 Agent 需要先按 source manifest / raw transcript / typed MEMORY.md 重建上下文。`);
    }
    if (apiMicroCompactEditPlan.schema) {
        const counts = apiMicroCompactEditPlan.signalCounts || {};
        lines.push(`- API microcompact edit plan：planChecksum=${apiMicroCompactEditPlan.planChecksum || ""}；edits=${apiMicroCompactEditPlan.editCount || 0}；advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}；tokens=${apiMicroCompactEditPlan.activeTokens || 0}/${apiMicroCompactEditPlan.trigger?.value || apiMicroCompactEditPlan.maxInputTokens || 0}；thinking=${counts.thinkingBlocks || 0}；tool_use=${counts.toolUses || 0}；tool_result=${counts.toolResults || 0}。`);
        if (apiMicroCompactEditPlan.editCount > 0) {
            lines.push("- 支持 native API context management 的子 Agent 执行器可按该计划清理旧 thinking/tool result；不支持时只作为上下文压力提示，不得删除 CCM 群聊原文或 typed MEMORY.md。");
            lines.push("- API microcompact 回执规则：CCM_AGENT_RECEIPT.apiMicrocompactUsage 或 memoryUsed/memoryIgnored 必须引用 planChecksum，并声明 usageState=native_applied/advisory/ignored/not_supported；apiMicrocompactUsage 应绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；第三方 CLI 未实际调用 native API context-management 时不得写 native_applied。");
        }
    }
    if (apiMicrocompactNativeApplyPlan.schema) {
        const executor = apiMicrocompactNativeApplyPlan.executor || {};
        lines.push(`- API microcompact native apply：mode=${apiMicrocompactNativeApplyPlan.mode || "advisory_only"}；ready=${apiMicrocompactNativeApplyPlan.nativeApplyReady === true}；executor=${executor.agentType || "unknown"}/${executor.transport || "unknown"}；applyPlan=${apiMicrocompactNativeApplyPlan.applyPlanChecksum || ""}；session=${apiMicrocompactNativeApplyPlan.task_agent_session_id || "unbound"}。`);
        if (apiMicrocompactNativeApplyPlan.nativeApplyReady === true) {
            lines.push(`- Native request adapter 已就绪：把 requestPatch.body.context_management 合并到 provider API 请求，并携带 beta=${apiMicrocompactNativeApplyPlan.capability?.requiredBetaHeader || "context-management-2025-06-27"}；只有真实合并并发出请求后，回执才能声明 native_applied。`);
            lines.push("- Native apply 强证明规则：native_applied 还必须绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId，并在存在 runnerRequestId/externalRunnerRequestId 时能回查 execution.externalRunnerRequestIds；缺 session/snapshot/dispatch 绑定只能算弱证据。");
        }
        else {
            lines.push(`- Native apply 未就绪：${apiMicrocompactNativeApplyPlan.reason || "executor does not expose provider request body"}；本轮只能声明 advisory/ignored/not_supported，不能声称 native_applied。`);
        }
    }
    if (providerNativeCompactSessionCapacity.schema) {
        lines.push(`- Provider compact 会话容量：generation=${providerNativeCompactSessionCapacity.generation || 1}；taskSession=${providerNativeCompactSessionCapacity.task_agent_session_id || ""}；nativeSession=${providerNativeCompactSessionCapacity.native_session_id || ""}；basis=${providerNativeCompactSessionCapacity.token_basis || "unknown"}；raw=${providerNativeCompactSessionCapacity.raw_active_tokens || 0}；providerInput=${providerNativeCompactSessionCapacity.provider_response_input_tokens || 0}；latestCleared=${providerNativeCompactSessionCapacity.provider_cleared_input_tokens || 0}；effective=${providerNativeCompactSessionCapacity.effective_context_tokens || 0}；stickyBeta=${providerNativeCompactSessionCapacity.sticky_beta_latched === true}。`);
        lines.push("- 容量反馈边界：只采用该精确 Provider 子会话最新一次强回执，不跨群聊/子会话累加 cleared_input_tokens，也不修改 CCM 原始 transcript 或 typed MEMORY.md。");
    }
    if (apiMicrocompactNativeApplyProofLedger.schema && apiMicrocompactNativeApplyProofLedger.has_history) {
        const totals = apiMicrocompactNativeApplyProofLedger.totals || {};
        const telemetry = apiMicrocompactNativeApplyProofLedger.request_telemetry || {};
        const providerOutcomes = apiMicrocompactNativeApplyProofLedger.platform_execution_receipts?.totals || {};
        lines.push(`- API microcompact native apply proof ledger：status=${apiMicrocompactNativeApplyProofLedger.status || "unknown"}；verified=${totals.verified || 0} failed=${totals.failed || 0} advisory=${totals.advisory || 0} not_supported=${totals.not_supported || 0}；coverage=${apiMicrocompactNativeApplyProofLedger.proof_coverage_rate ?? "n/a"}%；telemetry strong=${telemetry.strong_verified_count || 0} matched=${telemetry.matched_verified_count || 0} adapter=${telemetry.adapter_matched_verified_count || 0} receipt=${telemetry.receipt_matched_verified_count || 0} receiptOnly=${telemetry.receipt_only_verified_count || 0} missing=${telemetry.missing_verified_count || 0} stale=${telemetry.stale_verified_count || 0} sessionBound=${telemetry.session_bound_verified_count || telemetry.session_bound_count || 0} dispatchBound=${telemetry.dispatch_bound_verified_count || telemetry.dispatch_bound_count || 0} runnerBound=${telemetry.runner_bound_verified_count || telemetry.runner_bound_count || 0}；ledger=${apiMicrocompactNativeApplyProofLedger.ledger_file || "未记录"}；requestTelemetry=${telemetry.ledger_file || "未记录"}。`);
        lines.push(`- Provider compact outcome：applied=${providerOutcomes.native_applied || 0} requestAcceptedOnly=${providerOutcomes.request_accepted || 0} noEdits=${providerOutcomes.no_edits_applied || 0} failed=${providerOutcomes.request_failed || 0} unverified=${providerOutcomes.unverified || 0}；只有 response.context_management.applied_edits 非空时才算 native_applied。`);
        for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.verified_entries) ? apiMicrocompactNativeApplyProofLedger.verified_entries.slice(0, 3) : []) {
            lines.push(`  - verified native_applied plan=${row.plan_checksum || ""}；requestPatch=${row.request_patch_checksum || row.receipt_request_patch_checksum || ""}；session=${row.task_agent_session_id || "unbound"}；snapshot=${row.memory_context_snapshot_id || "unknown"}；requestTelemetry=${row.request_telemetry_status || "unknown"}；该证明只说明历史 provider request 已带 context_management，本轮仍需按当前执行器真实发送情况重新落账。`);
        }
        for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.failed_entries) ? apiMicrocompactNativeApplyProofLedger.failed_entries.slice(0, 3) : []) {
            lines.push(`  - failed native_applied proof plan=${row.plan_checksum || ""}；requestPatch=${row.receipt_request_patch_checksum || row.request_patch_checksum || "missing"}；session=${row.receipt_task_agent_session_id || row.task_agent_session_id || "unbound"}；reason=${row.reason || "checksum/session/snapshot mismatch"}；不得把这类回执当作强 native apply 证明。`);
        }
    }
    if (compactStrategyDecision.schema) {
        const invariants = compactStrategyDecision.invariants || {};
        const failedInvariants = Object.entries(invariants)
            .filter(([, value]) => typeof value === "boolean" && value === false)
            .map(([key]) => key);
        lines.push(`- 压缩策略决策：mode=${compactStrategyDecision.mode || "unknown"}；summary=${compactStrategyDecision.summaryChecksum || "none"}；窗口 ${compactStrategyDecision.messagesToSummarize || 0} 条压缩 / ${compactStrategyDecision.keptMessages || 0} 条保留；token ${compactStrategyDecision.preCompactTokenCount || 0} -> ${compactStrategyDecision.postCompactTokenEstimate || 0}；原因 ${compactStrategyDecision.reason || "未记录"}。`);
        if (compactStrategyDecision.transcriptPath)
            lines.push(`- 压缩策略原文恢复：raw transcript=${compactStrategyDecision.transcriptPath}；如摘要与当前任务冲突，按 message id 回溯原文。`);
        if (failedInvariants.length) {
            lines.push(`- 压缩策略风险：${failedInvariants.slice(0, 5).join("、")} 未通过；执行前优先读取 raw transcript / 近期窗口核验。`);
        }
        else if (compactStrategyDecision.invariantPass === true) {
            lines.push("- 压缩策略 invariants：任务事务、工具结果对/思考块边界和保留窗口检查通过。");
        }
    }
    if (replayRepairPlan.schema && Number(replayRepairPlan.requiredActionCount || 0) > 0) {
        lines.push(`- Replay Gate 修复计划：status=${replayRepairPlan.status || "unknown"}；action=${replayRepairPlan.action || "unknown"}；待修复 ${replayRepairPlan.requiredActionCount || 0} 项；score=${replayRepairPlan.sourceReplay?.score ?? "unknown"}；下一轮执行前必须先补齐缺失记忆包字段并重新 replay。`);
        for (const action of Array.isArray(replayRepairPlan.actions) ? replayRepairPlan.actions.slice(0, 5) : []) {
            lines.push(`  - repair ${action.priority || "medium"}:${action.component || "replay"}；${action.title || "修复 replay 缺口"}；${action.instruction || ""}${action.expected ? `；expected=${action.expected}` : ""}`);
        }
    }
    if (replayRepairLedger.schema && Number(replayRepairLedger.attemptCount || 0) > 0) {
        lines.push(`- Replay Gate attempt ledger：attempts=${replayRepairLedger.attemptCount || 0}；openActions=${replayRepairLedger.openActionCount || 0}；latest=${replayRepairLedger.latestStatus || "unknown"}/${replayRepairLedger.latestScore ?? "unknown"}；ledger=${replayRepairLedger.file || "未记录"}。`);
        for (const attempt of Array.isArray(replayRepairLedger.recentAttempts) ? replayRepairLedger.recentAttempts.slice(0, 3) : []) {
            lines.push(`  - attempt ${attempt.status || "unknown"} score=${attempt.score ?? "unknown"} target=${attempt.target_project || "unknown"} actions=${attempt.required_action_count || 0} hash=${attempt.rendered_hash || attempt.attempt_id || ""}`);
        }
    }
    if (replayRepairWorkItems.schema && Number(replayRepairWorkItems.total || 0) > 0) {
        lines.push(`- Replay Repair pending work：open=${replayRepairWorkItems.openItemCount || 0}；pending=${replayRepairWorkItems.pendingCount || 0}；inProgress=${replayRepairWorkItems.inProgressCount || 0}；completed=${replayRepairWorkItems.completedCount || 0}；owner=group-main-agent；ledger=${replayRepairWorkItems.file || "未记录"}。`);
        for (const item of Array.isArray(replayRepairWorkItems.openItems) ? replayRepairWorkItems.openItems.slice(0, 5) : []) {
            const nativeProofBinding = [
                item.request_patch_checksum ? `request=${item.request_patch_checksum}` : "",
                item.request_telemetry_session_status ? `session=${item.request_telemetry_session_status}` : "",
                item.request_telemetry_dispatch_status ? `dispatch=${item.request_telemetry_dispatch_status}` : "",
                item.runner_request_id ? `runner=${item.runner_request_id}` : "",
            ].filter(Boolean).join("；");
            lines.push(`  - work ${item.priority || "medium"}:${item.component || "replay"}；${item.subject || "修复 replay 缺口"}；target=${item.repair_target || item.target_project || item.target || "memory-context"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；${item.instruction || ""}${item.expected ? `；expected=${item.expected}` : ""}`);
        }
    }
    if (replayRepairDispatchCandidates.schema && Number(replayRepairDispatchCandidates.candidateCount || 0) > 0) {
        lines.push(`- Main Agent replay repair dispatch candidates：候选 ${replayRepairDispatchCandidates.candidateCount || 0} 条；ready=${replayRepairDispatchCandidates.readyCount || 0}；dispatchMarked=${replayRepairDispatchCandidates.dispatchMarkedCount || 0}；shouldCreateRealTask=false；ledger=${replayRepairDispatchCandidates.file || "未记录"}。`);
        lines.push("  - 这些候选只说明主 Agent 可将 replay 修复整理成后续工作单；子 Agent 只有在本轮任务明确要求时才执行，不得自行创建额外任务。");
        for (const candidate of Array.isArray(replayRepairDispatchCandidates.candidates) ? replayRepairDispatchCandidates.candidates.slice(0, 5) : []) {
            const targetMatches = !candidate.targetProject || candidate.targetProject === bundle.target_project || candidate.dispatch_target === bundle.target_project;
            const nativeProofBinding = [
                candidate.proof_entry_id ? `proof=${candidate.proof_entry_id}` : "",
                candidate.request_patch_checksum ? `request=${candidate.request_patch_checksum}` : "",
                candidate.worker_context_packet_id ? `packet=${candidate.worker_context_packet_id}` : "",
                candidate.worker_context_packet_binding_id ? `packetBinding=${candidate.worker_context_packet_binding_id}` : "",
                candidate.worker_context_packet_memory_policy_reason ? `memoryPolicy=${candidate.worker_context_packet_memory_policy_reason}` : "",
                Array.isArray(candidate.pressure_memory_provenance_rel_paths) && candidate.pressure_memory_provenance_rel_paths.length ? `pressureDocs=${candidate.pressure_memory_provenance_rel_paths.slice(0, 4).join(",")}` : "",
                Array.isArray(candidate.pressure_memory_provenance_repair_work_item_ids) && candidate.pressure_memory_provenance_repair_work_item_ids.length ? `pressureRepair=${candidate.pressure_memory_provenance_repair_work_item_ids.slice(0, 4).join(",")}` : "",
                candidate.request_telemetry_source ? `source=${candidate.request_telemetry_source}` : "",
                candidate.request_telemetry_session_status ? `session=${candidate.request_telemetry_session_status}` : "",
                candidate.request_telemetry_dispatch_status ? `dispatch=${candidate.request_telemetry_dispatch_status}` : "",
                candidate.runner_request_id ? `runner=${candidate.runner_request_id}` : "",
            ].filter(Boolean).join("；");
            lines.push(`  - candidate=${candidate.candidate_id || ""}；${candidate.priority || "medium"}:${candidate.component || "replay"}；target=${candidate.dispatch_target || candidate.targetProject || candidate.repair_target || "memory-context"}${targetMatches ? "" : "（非本 Agent 目标，仅供主 Agent 协调参考）"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；action=${candidate.recommendedAction || "review"}；${candidate.instruction || candidate.expected || ""}`);
        }
    }
    if (compaction.hookLedger?.schema) {
        const hookLedger = compaction.hookLedger;
        const stats = hookLedger.stats || {};
        const pre = stats.pre || {};
        const post = stats.post || {};
        deferredPostCompactHookLines.push(`- 压缩 Hook Ledger：run=${hookLedger.hookRunId || "unknown"}；pre ${pre.ok || 0}/${pre.total || 0}；post ${post.ok || 0}/${post.total || 0}；failed=${stats.failed || 0}；ledger=${hookLedger.file || "未记录"}。`);
        for (const entry of Array.isArray(hookLedger.recentEntries) ? hookLedger.recentEntries.slice(-4) : []) {
            const summary = entry.result_summary || entry.resultSummary || {};
            const keys = Array.isArray(summary.keys) ? summary.keys.slice(0, 5).join(",") : "";
            const phase = entry.phase || "hook";
            const status = entry.ok === false || entry.status === "fail" ? "fail" : "ok";
            deferredPostCompactHookLines.push(`  - hook ${phase} ${status}；${entry.duration_ms || entry.durationMs || 0}ms${keys ? `；keys=${keys}` : ""}${entry.error ? `；error=${entry.error}` : ""}`);
        }
    }
    if (compaction.quality || compaction.qualityStatus || compaction.driftDetected || compaction.downgradedByQualityGate) {
        const rawScore = Number(compaction.qualityScore ?? compaction.quality?.score);
        const score = Number.isFinite(rawScore) ? `${rawScore}` : "未评分";
        const drift = compaction.driftDetected ? "发现漂移" : "未发现漂移";
        const downgrade = compaction.downgradedByQualityGate ? `；已降级：${compaction.qualityDowngradeReason || "quality_gate_failed"}` : "";
        lines.push(`- 记忆质量：${score}/${compaction.qualityStatus || "unknown"}；${drift}${downgrade}。`);
    }
    if (compaction.microCompact?.recordCount || compaction.microCompact?.compactedMessageCount) {
        lines.push(`- 局部压缩：micro-compact 记录 ${compaction.microCompact.recordCount || 0} 条，实际压缩 ${compaction.microCompact.compactedMessageCount || 0} 条，释放约 ${compaction.microCompact.tokensFreed || 0} tokens；原文仍在群聊消息 JSON，可按 message id 回溯。`);
        if (compaction.microCompact.timeBased?.triggered) {
            const timeBased = compaction.microCompact.timeBased;
            lines.push(`- 时间触发 micro-compact：距离最近 Agent 输出 ${timeBased.gapMinutes || 0} 分钟，超过阈值 ${timeBased.gapThresholdMinutes || 0} 分钟；清理旧输出 ${timeBased.clearedCount || 0} 条，保留最近 ${timeBased.keptCount || timeBased.keepRecent || 0} 条。`);
        }
    }
    if (compaction.partialCompact?.requested) {
        const state = compaction.partialCompact.enabled ? "已启用" : "已跳过";
        lines.push(`- 选择性压缩：partial compact ${state}；方向 ${compaction.partialCompact.direction || "unknown"}；边界 ${compaction.partialCompact.summarizedThroughMessageId || compaction.partialCompact.selectedMessageId || "未命中"}；后续原文仍保留。`);
    }
    if (Array.isArray(compaction.partialSegments) && compaction.partialSegments.length) {
        lines.push(`- 选择性压缩 sidecar：已记录 ${compaction.partialSegments.length} 个中段/后段摘要；这些摘要不推进主压缩边界，原文仍可按 message id 回溯。`);
        for (const segment of compaction.partialSegments.slice(-3)) {
            const range = segment.range || {};
            const quality = segment.quality?.score != null ? `；质量 ${segment.quality.score}/${segment.quality.status || "unknown"}` : "";
            lines.push(`  - ${segment.direction || "range"} #${range.fromMessageId || ""} -> #${range.throughMessageId || ""}，${range.messageCount || 0} 条${quality}${segment.summaryChecksum ? `；摘要校验 ${segment.summaryChecksum}` : ""}`);
        }
    }
    if (compaction.ptlEmergency?.engaged) {
        lines.push(`- PTL 紧急降级：${compaction.ptlEmergency.emergencyLevel || "unknown"}；原因 ${compaction.ptlEmergency.reason || "unknown"}；本轮使用更短摘要，原文仍可从 ${compaction.ptlEmergency.rawTranscriptPath || "群聊 transcript"} 和 message id 恢复。`);
    }
    if (compaction.ptlRecovery?.recovered) {
        lines.push(`- PTL 自动恢复：已恢复普通摘要预算；原因 ${compaction.ptlRecovery.reason || "unknown"}；恢复后摘要预算 ${compaction.ptlRecovery.restoredMessageDigestMaxChars || 14000} 字符，压力 ${compaction.ptlRecovery.contextBudgetPressure ?? "unknown"}%。`);
    }
    const reinject = compaction.postCompactReinject || {};
    const reinjectParts = [
        Array.isArray(reinject.files) && reinject.files.length ? `文件 ${reinject.files.length}` : "",
        Array.isArray(reinject.skills) && reinject.skills.length ? `技能 ${reinject.skills.length}` : "",
        Array.isArray(reinject.verification) && reinject.verification.length ? `验证 ${reinject.verification.length}` : "",
        Array.isArray(reinject.blockers) && reinject.blockers.length ? `阻塞 ${reinject.blockers.length}` : "",
        Array.isArray(reinject.taskStatuses) && reinject.taskStatuses.length ? `子任务状态 ${reinject.taskStatuses.length}` : "",
    ].filter(Boolean);
    if (reinjectParts.length) {
        lines.push(`- 压缩后重注入候选：${reinjectParts.join("、")}；这些是旧消息压缩后仍建议优先恢复到本轮任务上下文的线索。`);
    }
    if (typedMemory.globalClaudeMemoryImport?.schema) {
        const imported = typedMemory.globalClaudeMemoryImport;
        if (Number(imported.importedCount || 0) > 0 || (Array.isArray(imported.issues) && imported.issues.length)) {
            const includeAudit = imported.includeAudit || {};
            const externalApproval = includeAudit.externalIncludeApproval || {};
            const settingPolicy = imported.settingSourcePolicy || {};
            const includeText = includeAudit.schema
                ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
                : "";
            const sourceText = settingPolicy.schema
                ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
                : "";
            lines.push(`- 全局 Claude 记忆导入：${imported.status || "unknown"}；user=${imported.includeUser !== false} managed=${imported.includeManaged !== false}；发现 ${imported.discoveredCount || 0} 个，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
            if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
                lines.push(`- 全局 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
            }
            if (imported.instructionsLoadedHooks?.schema) {
                lines.push(`- 全局 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
            }
            if (Array.isArray(imported.issues) && imported.issues.length) {
                lines.push(`- 全局 Claude 记忆导入警告：${imported.issues.slice(0, 4).map((issue) => issue.type || issue.error || "issue").join("、")}。`);
            }
        }
    }
    if (typedMemory.projectMemoryImport?.schema) {
        const imported = typedMemory.projectMemoryImport;
        const includeAudit = imported.includeAudit || {};
        const externalApproval = includeAudit.externalIncludeApproval || {};
        const settingPolicy = imported.settingSourcePolicy || {};
        const includeText = includeAudit.schema
            ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
            : "";
        const sourceText = settingPolicy.schema
            ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
            : "";
        lines.push(`- 项目记忆导入：${imported.status || "unknown"}；从 ${imported.projectRoot || "未配置项目根"} 发现 ${imported.discoveredCount || 0} 个 Claude/规则记忆文件，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
        if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
            lines.push(`- 项目 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
        }
        if (imported.instructionsLoadedHooks?.schema) {
            lines.push(`- 项目 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
        }
        if (Array.isArray(imported.issues) && imported.issues.length) {
            lines.push(`- 项目记忆导入警告：${imported.issues.slice(0, 4).map((issue) => issue.type || issue.error || "issue").join("、")}。`);
        }
    }
    const typedLoadPlanText = (0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)(typedMemory.loadPlan);
    if (typedLoadPlanText)
        lines.push(typedLoadPlanText);
    if (typedMemory.sync?.indexFile) {
        lines.push(`- 类型化记忆索引：${typedMemory.sync.docs || 0} 条 Markdown 记忆，入口 ${typedMemory.sync.indexFile}。`);
    }
    if (typedMemory.ledger?.file) {
        const ledgerBoundary = typedMemory.ledger.scope
            ? `；scope=${typedMemory.ledger.scope}；sessionBound=${typedMemory.ledger.sessionBound === true}；compactEpoch=${typedMemory.ledger.compactEpoch || "precompact"}；只在同 task Agent session、同 compact epoch、同文档 checksum 内去重`
            : "";
        lines.push(`- 类型化记忆召回账本：本轮已记录 ${typedMemory.ledger.recordedThisTurn?.length || 0} 条 surfaced，历史去重候选 ${typedMemory.ledger.alreadySurfaced?.length || 0} 条${ledgerBoundary}。`);
    }
    if (typedMemory.distillation?.schema) {
        const admission = typedMemory.distillation.admission || {};
        lines.push(`- 长期日志蒸馏：原始候选 ${typedMemory.distillation.extractedCandidateCount ?? typedMemory.distillation.candidateCount ?? 0} 条，准入 ${typedMemory.distillation.candidateCount || 0} 条，拒绝 ${typedMemory.distillation.rejectedCandidateCount || 0} 条，清退旧噪声 ${typedMemory.distillation.evictedExistingFactCount || 0} 条；本轮新增 ${typedMemory.distillation.newFactCount || 0} 条，写入 ${typedMemory.distillation.writeCount || 0} 个 Markdown 记忆；ledger ${typedMemory.distillation.ledgerFile || "未记录"}。`);
        if (admission.schema) {
            lines.push(`- 长期记忆写入准入：${admission.admittedThisRun || 0}/${admission.evaluatedThisRun || 0} 通过；hard exclusion ${admission.hardExclusionThisRun || 0}；拒绝审计只保存 candidate/message/type/reason 元数据，不注入被拒绝正文。`);
            lines.push(`  - 正向确认：候选 ${admission.positiveConfirmationCandidateCount || 0}；准入 ${admission.positiveConfirmationAdmittedCount || 0}；拒绝 ${admission.positiveConfirmationRejectedCount || 0}；无效绑定 ${admission.positiveConfirmationInvalidBindingCount || 0}。只有绑定当前群聊会话内非显然 Assistant 做法并通过 checksum 的确认才可写入。`);
            lines.push(`  - 正向记忆生命周期：active ${admission.positiveFeedbackActiveCount || 0}；revoked ${admission.positiveFeedbackRevokedCount || 0}；superseded ${admission.positiveFeedbackSupersededCount || 0}；当前源证明 ${admission.positiveFeedbackCurrentSourceProofCount || 0}；本轮无效撤回 ${admission.positiveFeedbackLifecycleInvalidBindingThisRun || 0}。已撤回/替代做法不得恢复到子 Agent 上下文。`);
        }
        const quality = typedMemory.distillation.quality || {};
        if (quality.schema) {
            lines.push(`- 长期日志蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，状态矛盾 ${quality.contradictionCount || 0}；涉及文件/函数/flag 的记忆使用前必须核验当前仓库。`);
        }
    }
    const typedMemoryText = (0, group_memory_index_1.renderGroupTypedMemoryRecall)(typedMemory.recall);
    if (typedMemoryText)
        lines.push(typedMemoryText);
    if (typedMemory.recall?.workerContextPressureScoring?.active && Number(typedMemory.recall?.workerContextPressureScoring?.boosted_count || 0) > 0) {
        lines.push("- 上下文压力召回回执：本轮如使用或忽略 pressure recall typed MEMORY.md，CCM_AGENT_RECEIPT.memoryUsed/memoryIgnored 必须引用对应 relPath 或说明未使用原因。");
    }
    if (groupState.summaryText && parentSessionDelivery.suppress_local_digest !== true)
        lines.push(`- 群聊压缩摘要：\n${(0, group_memory_shared_1.compactPreserveLines)(groupState.summaryText, 3200)}`);
    if (resumeContext.text && parentSessionDelivery.suppress_bounded_resume_context !== true)
        lines.push(`- 已验证的会话恢复原文窗口：\n${resumeContext.text}`);
    const addList = (title, items, mapper, limit = 6) => {
        const list = (items || []).filter(Boolean).slice(-limit);
        if (!list.length)
            return;
        lines.push(`- ${title}：`);
        for (const item of list)
            lines.push(`  - ${mapper(item)}`);
    };
    addList("持久用户要求/验收约束", groupState.persistentRequirements || [], (item) => `#${item.messageId || ""} ${item.text || item}`, 6);
    addList("关键事实锚点", groupState.factAnchors || [], (item) => `#${item.messageId || ""} [${item.actor || item.type || ""}] ${item.text || item}`, 5);
    addList("关键决策", groupState.decisions || [], (item) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`, 6);
    addList("开放问题", groupState.openQuestions || [], (item) => String(item.question || item), 4);
    addList("下一步", groupState.nextActions || [], (item) => String(item.action || item), 4);
    if (agentMemory.stats?.totalReceipts) {
        lines.push(`- 子 Agent 记忆统计：总回执 ${agentMemory.stats.totalReceipts}，压缩 ${agentMemory.stats.compressedReceipts || 0}，近期保留 ${agentMemory.stats.recentReceipts || 0}。`);
    }
    if (agentMemory.summary)
        lines.push(`- 你的长期压缩摘要：${(0, group_memory_shared_1.compactMemoryText)(agentMemory.summary, 900)}`);
    addList("你的近期结构化回执", agentMemory.recentReceipts || [], (item) => (0, group_memory_shared_1.formatAgentMemoryReceipt)(item), 8);
    addList("你常涉及的文件", agentMemory.frequentFiles || [], (item) => String(item), 10);
    addList("你已有验证线索", agentMemory.verificationHints || [], (item) => String(item), 8);
    addList("你仍需处理的阻塞", [...(agentMemory.blockers || []), ...(agentMemory.needs || [])], (item) => String(item), 8);
    addList("你之前的完成记录", related.ownCompleted || [], (item) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`, 4);
    addList("其他 Agent 已完成", related.otherCompleted || [], (item) => `${item.project || "unknown"}：${item.summary || ""}`, 4);
    addList("其他 Agent 近期回执", related.relatedLedger || [], (item) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`, 5);
    addList("与你相关的阻塞", related.ownBlocked || [], (item) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`, 4);
    addList("全局阻塞", related.globalBlocked || [], (item) => `${item.project || "unknown"}：${item.reason || ""}`, 3);
    addList("应重注入的旧文件线索", reinject.files || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
    addList("应重注入的旧技能/工具线索", reinject.skills || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
    addList("应重注入的旧验证线索", reinject.verification || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
    addList("应重注入的旧阻塞线索", reinject.blockers || [], (item) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
    addList("压缩后子任务状态", reinject.taskStatuses || reinject.task_statuses || [], (item) => item.value || `${item.task_id || item.taskId || "unknown"} [${item.status || "unknown"}] ${item.description || item.delta_summary || ""}`, 12);
    if (bundle.relevant_historical_evidence)
        lines.push(bundle.relevant_historical_evidence);
    if (!postCompactMessageOrderVerification || postCompactMessageOrderVerification.valid) {
        if (invokedSkillAttachmentText)
            lines.push(invokedSkillAttachmentText);
        if (planAttachmentText)
            lines.push(planAttachmentText);
        if (dynamicContextDeltaText)
            lines.push(dynamicContextDeltaText);
        lines.push(...deferredPostCompactHookLines);
    }
    if (bundle.task_query)
        lines.push(`- 你本次任务：${bundle.task_query}`);
    lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改；必须用 memoryUsed / memoryIgnored 声明本轮是否使用了本记忆包、项目记忆、历史结论、共享文档或知识库；如本轮 surfaced MEMORY.md，必须用 typedMemoryUsage 覆盖每个 relPath 并逐项声明 used / ignored / verified 和 reason，不能声明未下发路径；verified 必须附可复算的 currentSourceEvidence；如存在 global_memory_id，必须用 globalMemoryUsage 逐条声明 used / ignored / verified / background / advisory；如存在 API microcompact edit plan，必须用 apiMicrocompactUsage 或 memoryUsed/memoryIgnored 声明 planChecksum 和 native_applied/advisory/ignored/not_supported，并绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；如存在 compact read plan revalidation gate，必须声明 gate/read_plan_id 以及是否已 re-read/current source verified；如存在压缩重注入候选，必须用 postCompactCandidateUsage 逐条声明 used / ignored / verified。");
    return lines.join("\n");
}
// ===== merged from group-memory-context-part-04-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function buildGlobalGroupMemoryContext(query = "", options = {}) {
    const groups = (Array.isArray(options.groups) ? options.groups : (0, storage_1.loadGroups)()).filter((group) => group?.id);
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options);
    const generatedAt = new Date().toISOString();
    const maxGroups = Math.max(1, Math.min(12, Number(options.maxGroups || options.max_groups || 6)));
    const maxTypedMemory = Math.max(1, Math.min(8, Number(options.maxTypedMemory || options.max_typed_memory || 3)));
    const sessionId = String(options.sessionId || options.session_id || "");
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-global-group-memory-context-v1",
            version: 1,
            generated_at: generatedAt,
            query: (0, group_memory_shared_1.compactMemoryText)(query, 900),
            session_id: sessionId,
            total_group_count: groups.length,
            selected_group_count: 0,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_group_memory",
                use: "must_not_use_group_memory",
                boundary: "current_global_agent_turn_only"
            },
            groups: []
        };
        const rendered = renderGlobalGroupMemoryContextBundle(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 5000));
        return bundle;
    }
    const candidates = groups.map((group, index) => {
        const messages = (0, storage_1.getGroupMessages)(group.id).filter((message) => !String(message?.content || "").startsWith("📤"));
        const memory = (0, group_memory_storage_1.loadGroupMemory)(group.id);
        const updatedAt = memory?.updated_at || (0, group_memory_shared_1.latestGroupMessageTimestamp)(messages) || "";
        return {
            group,
            messages,
            memory,
            index,
            updatedAt,
            score: (0, group_memory_shared_1.scoreGlobalGroupMemoryCandidate)(group, memory, messages, query)
        };
    }).sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        const byTime = Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        return Number.isFinite(byTime) && byTime !== 0 ? byTime : a.index - b.index;
    });
    const selected = candidates.slice(0, maxGroups);
    const contextGroups = selected.map((candidate) => {
        const group = candidate.group;
        const memory = candidate.memory;
        const messages = candidate.messages;
        const modelVisibleRuntime = (0, group_runtime_memory_admission_1.modelVisibleGroupRuntimeState)(memory);
        const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
            ? null
            : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(group.id, {
                settingSources: options.settingSources ?? options.setting_sources,
                includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
                includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
                userRoot: options.claudeUserRoot || options.claude_user_root,
                managedRoot: options.claudeManagedRoot || options.claude_managed_root,
                maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
                maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files
            });
        const projectMemoryImports = (0, group_memory_shared_1.importGroupProjectMemoriesForMembers)(group.id, group, options);
        const sync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(group.id, memory);
        const recallQuery = [query, group.name, group.id, memory.goal, memory.currentPhase].filter(Boolean).join("\n");
        const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(recallQuery, options.targetPaths || options.target_paths || []);
        const loadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(group.id, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: recallQuery,
            targetPaths: typedMemoryTargetPaths
        });
        const recallScope = String(options.recallScope || options.recall_scope || `global-agent:${sessionId || "default"}`);
        const alreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(group.id, recallScope, { limit: 160 });
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(group.id, recallQuery, {
            alreadySurfaced,
            targetPaths: typedMemoryTargetPaths,
            targetProject: options.targetProject || options.target_project || "",
            groupMemory: memory,
            workerContextPressure: options.workerContextPressure
                || options.worker_context_pressure
                || options.contextPressure
                || options.context_pressure
                || memory.compaction?.contextPressureWarning
                || memory.compaction?.context_pressure_warning
                || memory.compaction?.compactWarning
                || memory.compaction?.compact_warning
                || memory.messageCompression?.contextPressureWarning
                || memory.messageCompression?.context_pressure_warning
                || null,
            compactStrategyPressure: options.compactStrategyPressure
                || options.compact_strategy_pressure
                || memory.compaction?.compactStrategyDecision
                || memory.compaction?.compact_strategy_decision
                || memory.compactBoundary?.compactStrategyDecision
                || memory.compactBoundary?.compact_strategy_decision
                || memory.messageCompression?.compactStrategyDecision
                || memory.messageCompression?.compact_strategy_decision
                || null,
            ptlEmergency: options.ptlEmergency
                || options.ptl_emergency
                || memory.compaction?.ptlEmergency
                || memory.compaction?.ptl_emergency
                || memory.compactBoundary?.ptlEmergency
                || memory.compactBoundary?.ptl_emergency
                || memory.compactBoundary?.post_compact_restore?.ptlEmergency
                || memory.compactBoundary?.post_compact_restore?.ptl_emergency
                || null,
            max: maxTypedMemory,
            snippetChars: Number(options.snippetChars || options.snippet_chars || 650)
        });
        const ledger = (0, group_memory_index_1.recordGroupTypedMemoryRecall)(group.id, recallScope, recall, recallQuery, {
            disableLedger: options.disableLedger === true || options.disable_ledger === true
        });
        const distillationQuality = memory?.compaction?.logDistillation?.quality
            || memory?.longTermLogDistillation?.quality
            || (0, group_memory_index_1.evaluateGroupTypedMemoryDistillationQuality)(group.id, { projectRoot: options.projectRoot || options.project_root });
        const sourceManifest = (0, group_compact_file_references_1.buildGroupMemorySourceManifest)(group.id, {
            generatedAt,
            typedMemorySync: sync,
            typedMemoryLedger: ledger
        });
        const globalReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
            || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "memory_file_import"
                : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                    : projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "project_memory_import"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "global_context_bundle");
        const reloadAudit = (0, group_compact_file_references_1.recordGroupMemoryReloadAudit)(group.id, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`,
            contextKind: "global_agent",
            reason: globalReloadReason,
            sourceManifest,
            loadPlan,
            globalClaudeMemoryImport,
            projectMemoryImports,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null
        });
        const sessionMemory = memory.sessionMemory?.schema ? memory.sessionMemory : (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(group.id);
        const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : (0, group_tool_continuity_1.readGroupToolContinuitySnapshotSummary)(group.id);
        const rawSources = {
            group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(group.id),
            group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(group.id),
            group_typed_memory_dir: sync.index.dir,
            group_typed_memory_index_file: sync.index.file,
            group_typed_memory_recall_ledger_file: ledger.file,
            group_memory_reload_ledger_file: reloadAudit.ledgerFile,
            group_session_memory_snapshot_file: sessionMemory?.snapshotFile || (0, group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile)(group.id),
            group_session_memory_summary_file: sessionMemory?.summaryFile || (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(group.id),
            group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || (0, group_tool_continuity_1.getGroupToolContinuitySnapshotFile)(group.id),
            group_tool_continuity_summary_file: toolContinuity?.summaryFile || (0, group_tool_continuity_1.getGroupToolContinuityMarkdownFile)(group.id)
        };
        const compactFileReferences = (0, group_compact_file_references_1.buildGroupCompactFileReferences)(group.id, {
            generatedAt,
            sourceManifest,
            sessionMemory,
            toolContinuity,
            typedMemory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir
                }
            },
            rawSources
        });
        const compactFileReferenceReadPlan = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlan)(group.id, compactFileReferences, {
            generatedAt,
            maxEntries: 8
        });
        const historicalReadPlanRows = (0, group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRows)(group.id, compactFileReferenceReadPlan);
        const compactFileReferenceReadPlanForFreshness = {
            ...compactFileReferenceReadPlan,
            entries: historicalReadPlanRows.rows,
            plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
            sourceReferenceCount: historicalReadPlanRows.rows.length
        };
        const compactFileReferenceReadPlanFreshness = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanFreshness)(group.id, compactFileReferenceReadPlanForFreshness);
        const compactFileReferenceReadPlanRevalidationGate = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlanRevalidationGate)(group.id, compactFileReferenceReadPlanFreshness, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`
        });
        return {
            group_id: group.id,
            group_name: group.name || group.id,
            score: candidate.score,
            members: (0, group_memory_shared_1.normalizeGlobalGroupMemoryMembers)(group),
            message_window: {
                total_messages: messages.length,
                latest_message_at: (0, group_memory_shared_1.latestGroupMessageTimestamp)(messages)
            },
            memory_state: {
                goal: memory.goal || "",
                current_phase: memory.currentPhase || "idle",
                summary: (0, group_memory_shared_1.compactPreserveLines)(memory.messageDigest || memory.summary || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null), 2200),
                persistent_requirements: (memory.persistentRequirements || []).slice(-6),
                fact_anchors: modelVisibleRuntime.factAnchors.slice(-6),
                decisions: modelVisibleRuntime.decisions.slice(-5),
                completed: (memory.completed || []).slice(-5),
                blocked: (memory.blocked || []).slice(-5),
                open_questions: (memory.openQuestions || []).slice(-4),
                next_actions: modelVisibleRuntime.nextActions.slice(-4)
            },
            compaction: {
                version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
                health: memory.compaction?.health || "",
                quality: memory.compaction?.quality || null,
                quality_score: Number(memory.compaction?.quality?.score || 0),
                quality_status: memory.compaction?.quality?.status || "",
                compacted_message_count: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
                preserved_recent_messages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
                last_compacted_message_id: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
                preserved_segment: memory.compaction?.preservedSegment || memory.compactBoundary?.preservedSegment || null,
                context_pressure_warning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
                post_compact_recovery_audit: memory.compaction?.postCompactRecoveryAudit
                    || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                    || memory.messageCompression?.postCompactRecoveryAudit
                    || null,
                partial_segments: Array.isArray(memory.compaction?.partialSegments || memory.messageCompression?.partialSegments)
                    ? (memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || []).slice(-3)
                    : [],
                ptl_emergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || null,
                ptl_recovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || null,
                session_memory_compact_selection: memory.compaction?.sessionMemoryCompactSelection
                    || memory.compactBoundary?.sessionMemoryCompactSelection
                    || memory.messageCompression?.sessionMemoryCompactSelection
                    || null,
                post_compact_session_state_reset: memory.compaction?.postCompactSessionStateReset
                    || memory.compactBoundary?.postCompactSessionStateReset
                    || memory.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
                    || memory.messageCompression?.postCompactSessionStateReset
                    || null,
                session_memory: (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(sessionMemory) ? sessionMemory : null,
                tool_continuity: toolContinuity
            },
            typed_memory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir,
                    docs: sync.index.docs.length,
                    line_count: sync.index.lineCount,
                    bytes: sync.index.bytes
                },
                global_claude_memory_import: globalClaudeMemoryImport,
                project_memory_imports: projectMemoryImports,
                load_plan: loadPlan,
                target_paths: typedMemoryTargetPaths,
                recall,
                ledger: {
                    file: ledger.file,
                    scope: recallScope,
                    already_surfaced: alreadySurfaced.slice(-20),
                    recorded_this_turn: recall.surfaced || []
                },
                distillation_quality: distillationQuality
            },
            source_manifest: sourceManifest,
            memory_reload_audit: reloadAudit,
            compact_file_references: compactFileReferences,
            compact_file_reference_read_plan: compactFileReferenceReadPlan,
            compact_file_reference_read_plan_access: (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanAccess)(group.id, compactFileReferenceReadPlan, memory),
            compact_file_reference_read_plan_freshness: compactFileReferenceReadPlanFreshness,
            compact_file_reference_read_plan_revalidation_gate: compactFileReferenceReadPlanRevalidationGate,
            compact_file_reference_access: (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceAccess)(group.id, compactFileReferences, memory),
            raw_sources: rawSources
        };
    });
    const providerReliabilitySnapshotFile = options.providerReliabilitySnapshotFile || options.provider_reliability_snapshot_file;
    const providerReliabilitySnapshot = options.disableCrossGroupProviderReliability === true
        || options.disable_cross_group_provider_reliability === true
        || ((options.disableLedger === true || options.disable_ledger === true) && !providerReliabilitySnapshotFile && options.enableProviderReliabilitySnapshot !== true && options.enable_provider_reliability_snapshot !== true)
        ? null
        : (0, group_memory_index_1.getOrRefreshGlobalProviderDispatchReliabilitySnapshot)({
            snapshotFile: providerReliabilitySnapshotFile,
            ttlMs: options.providerReliabilitySnapshotTtlMs || options.provider_reliability_snapshot_ttl_ms,
            crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
            minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups || options.cross_group_provider_reliability_min_source_groups || options.minSourceGroups || options.min_source_groups || 2,
            providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || 14,
            nowMs: options.providerReliabilitySnapshotNowMs || options.provider_reliability_snapshot_now_ms,
            generatedAt
        });
    const bundle = {
        schema: "ccm-global-group-memory-context-v1",
        version: 1,
        generated_at: generatedAt,
        query: (0, group_memory_shared_1.compactMemoryText)(query, 900),
        session_id: sessionId,
        total_group_count: groups.length,
        selected_group_count: contextGroups.length,
        memory_policy: {
            priority: "group_memory_before_global_dispatch",
            use: "must_consider_relevant_groups",
            boundary: "bounded_multi_group_summary_typed_recall_raw_paths",
            raw_recovery: "group memory JSON, group messages JSON, and MEMORY.md typed docs remain the source of truth"
        },
        provider_reliability_snapshot: providerReliabilitySnapshot?.snapshot ? {
            snapshot_id: providerReliabilitySnapshot.snapshot.snapshot_id || "",
            generation_id: providerReliabilitySnapshot.snapshot.generation_id || "",
            snapshot_checksum: providerReliabilitySnapshot.snapshot.snapshot_checksum || "",
            status: providerReliabilitySnapshot.status || "",
            usable: providerReliabilitySnapshot.usable === true,
            refreshed: providerReliabilitySnapshot.refreshed === true,
            generated_at: providerReliabilitySnapshot.snapshot.generated_at || "",
            expires_at: providerReliabilitySnapshot.snapshot.expires_at || "",
            source_generation_checksum: providerReliabilitySnapshot.snapshot.source_provenance?.generation_checksum || "",
            guidance_only: true,
            local_policy_override_allowed: false,
            contains_private_memory: false
        } : null,
        provider_reliability_guidance: providerReliabilitySnapshot?.usable === true
            ? providerReliabilitySnapshot.snapshot?.signals || null
            : null,
        groups: contextGroups
    };
    const rendered = renderGlobalGroupMemoryContextBundle(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 48_000, maxTokens: 90_000 });
    bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 12_000));
    return bundle;
}
function renderGlobalGroupMemoryContextBundle(bundle) {
    if (!bundle)
        return "";
    if (typeof bundle === "string")
        return bundle;
    if (bundle.memory_policy?.ignored === true) {
        return [
            "全局 Agent 群聊记忆上下文（用户要求忽略记忆）：",
            "- 记忆使用：本轮不要读取、引用、比较或应用任何群聊历史记忆、typed MEMORY.md 或压缩摘要。",
            "- 上下文边界：只使用用户当前消息、实时工具观察和本轮显式输入。",
            bundle.query ? `- 当前查询：${bundle.query}` : "",
        ].filter(Boolean).join("\n");
    }
    const lines = [
        "全局 Agent 群聊记忆上下文（多群聊预算受控摘要）：",
        `- 选择群聊：${bundle.selected_group_count || 0}/${bundle.total_group_count || 0}`,
        "- 记忆边界：全局 Agent 在派发群聊或项目子 Agent 前必须先参考相关群聊记忆；第三方子 Agent 每次都可能是新会话，后续仍要把群聊记忆包随任务下发。",
        "- 使用策略：这里只放压缩摘要、typed MEMORY.md 召回、质量/边界和原始路径线索；涉及文件/函数/flag 的长期记忆必须按当前仓库重新核验。",
    ];
    if (bundle.query)
        lines.push(`- 当前查询：${bundle.query}`);
    const providerReliability = bundle.provider_reliability_guidance || bundle.providerReliabilityGuidance || null;
    if (providerReliability?.schema) {
        const snapshot = bundle.provider_reliability_snapshot || bundle.providerReliabilitySnapshot || {};
        lines.push(`- provider reliability snapshot：status=${snapshot.status || "missing"}；snapshot=${snapshot.snapshot_id || "none"}；generation=${snapshot.generation_id || "none"}；expires=${snapshot.expires_at || "unknown"}；checksum=${snapshot.snapshot_checksum || "missing"}。`);
        lines.push(`- 全局 provider reliability（脱敏聚合）：signals=${providerReliability.signal_count || 0}；actionable=${providerReliability.actionable_signal_count || 0}；highRisk=${providerReliability.high_risk_signal_count || 0}；guidanceOnly=${providerReliability.guidance_only === true}；localPolicyOverrideAllowed=${providerReliability.local_policy_override_allowed === true}。`);
        for (const signal of (providerReliability.signals || []).filter((item) => item.actionable).slice(0, 6)) {
            lines.push(`  - provider=${signal.agent_type || "unknown"}；risk=${signal.risk_status || "empty"}；score=${signal.risk_score || 0}；confidence=${signal.confidence || 0}；sourceGroups=${signal.source_group_count || 0}；recommendation=${signal.recommendation || "observe"}。`);
        }
        lines.push("  - 隐私/权限边界：不包含群 ID、项目名、记忆路径或回执证据；只能提示 sampling/provider preference，不能覆盖任一群聊的 local-first gate。 ");
    }
    const addList = (title, items, mapper, limit = 5) => {
        const list = (items || []).filter(Boolean).slice(-limit);
        if (!list.length)
            return;
        lines.push(`  - ${title}：`);
        for (const item of list)
            lines.push(`    - ${mapper(item)}`);
    };
    for (const item of bundle.groups || []) {
        const state = item.memory_state || {};
        const compaction = item.compaction || {};
        const typed = item.typed_memory || {};
        const quality = typed.distillation_quality || {};
        const sourceManifest = item.source_manifest || {};
        const reloadAudit = item.memory_reload_audit || {};
        const compactRefs = item.compact_file_references || item.compactFileReferences || {};
        const compactReadPlan = item.compact_file_reference_read_plan || item.compactFileReferenceReadPlan || {};
        const compactReadPlanAccess = item.compact_file_reference_read_plan_access || item.compactFileReferenceReadPlanAccess || {};
        const compactReadPlanFreshness = item.compact_file_reference_read_plan_freshness || item.compactFileReferenceReadPlanFreshness || {};
        const compactReadPlanRevalidationGate = item.compact_file_reference_read_plan_revalidation_gate || item.compactFileReferenceReadPlanRevalidationGate || {};
        const compactRefAccess = item.compact_file_reference_access || item.compactFileReferenceAccess || {};
        lines.push(`- 群聊 ${item.group_name || item.group_id}（${item.group_id}，score ${item.score || 0}）：`);
        if (item.members?.length)
            lines.push(`  - 成员：${item.members.map((member) => `${member.project || "unknown"}${member.agent ? `/${member.agent}` : ""}`).join("、")}`);
        lines.push(`  - 目标/阶段：${state.goal || "未记录"} / ${state.current_phase || "idle"}`);
        lines.push(`  - 消息窗口：${item.message_window?.total_messages || 0} 条；最近 ${item.message_window?.latest_message_at || "unknown"}`);
        lines.push(`  - 压缩：health=${compaction.health || "unknown"}，已压缩 ${compaction.compacted_message_count || 0}，保留近期 ${compaction.preserved_recent_messages || 0}，quality=${compaction.quality_score || 0}/${compaction.quality_status || "unknown"}`);
        if (compaction.last_compacted_message_id)
            lines.push(`  - 压缩边界：最近至 message id ${compaction.last_compacted_message_id}`);
        if (compaction.session_memory?.schema)
            lines.push(`  - CC 风格 Session Memory：summary=${compaction.session_memory.summaryFile || "未记录"}；checksum=${compaction.session_memory.markdownChecksum || "unknown"}；last=${compaction.session_memory.lastSummarizedMessageId || "recent-window"}`);
        if (compaction.session_memory_compact_selection?.schema) {
            const selection = compaction.session_memory_compact_selection;
            const closure = selection.api_invariant_closure || {};
            lines.push(`  - Session Memory compact selection：status=${selection.status || "unknown"}；cursor=${selection.cursor_status || "unknown"}/${selection.cursor_mode || "legacy"}；kept=${selection.preserved_message_count || 0}/${selection.preserved_token_estimate || 0} tokens；API closure=${closure.pass === true ? `pass(+${closure.expanded_message_count || 0})` : closure.schema ? "fail" : "unknown"}；API called=${selection.compaction_api_called === true}${selection.fallback_reason ? `；fallback=${selection.fallback_reason}` : ""}。`);
            const projection = selection.compact_projection || {};
            if (projection.schema)
                lines.push(`  - Session Memory compact 投影：${projection.original_token_estimate || 0} -> ${projection.projected_token_estimate || 0} tokens；截断 ${projection.truncated_section_count || 0}/${projection.section_count || 0} 节；预算 section=${projection.max_section_tokens || 0}/total=${projection.max_total_tokens || 0}；完整原文=${projection.summary_file || "unknown"}；原始文件保持不变。`);
        }
        if (compaction.post_compact_session_state_reset?.schema) {
            const reset = compaction.post_compact_session_state_reset;
            const verification = (0, group_memory_compaction_1.verifyGroupPostCompactSessionStateResetReceipt)(reset, {
                groupId: item.group_id,
                groupSessionId: reset.group_session_id,
                boundaryId: reset.boundary_id,
                summaryChecksum: reset.summary_checksum
            });
            lines.push(`  - Post-compact session reset：${verification.valid ? "verified" : "fail_closed"}；path=${reset.compact_path || "unknown"}；generation=${reset.post_compact_mark?.generation || 0}；provider cursor=${reset.provider_active_cursor?.status || "unknown"}；cache baseline=${reset.cache_read_baseline?.status || "unknown"}；failures=${reset.auto_compact_failure_state?.consecutive_failures ?? "unknown"}。`);
        }
        if (compaction.tool_continuity?.schema) {
            const continuity = compaction.tool_continuity || {};
            const allowed = continuity.allowedTools || {};
            const missing = continuity.missing || {};
            lines.push(`  - CC 风格工具/技能连续性：allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}，invokedSkill ${(continuity.invokedSkills || []).length}，missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}；只恢复上下文，不扩大授权，后续派发仍以当前 runtime tool gate 为准。`);
        }
        if (compaction.preserved_segment?.schema)
            lines.push(`  - preservedSegment：保留 ${compaction.preserved_segment.preservedMessageCount || 0} 条 / 约 ${compaction.preserved_segment.preservedTokenEstimate || 0} tokens；首尾 ${compaction.preserved_segment.firstPreservedMessageId || "unknown"} -> ${compaction.preserved_segment.lastPreservedMessageId || "unknown"}`);
        if (compaction.context_pressure_warning?.schema)
            lines.push(`  - context pressure：${compaction.context_pressure_warning.level || "unknown"}，使用 ${compaction.context_pressure_warning.tokenUsage || 0} tokens，剩余 ${compaction.context_pressure_warning.percentLeft ?? "unknown"}%，建议 ${compaction.context_pressure_warning.recommendation || "continue"}${compaction.context_pressure_warning.suppressed ? "（压缩后暂时抑制预警）" : ""}`);
        if (sourceManifest.schema)
            lines.push(`  - source manifest：${sourceManifest.status || "unknown"}，源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0}，manifest ${sourceManifest.manifestChecksum || ""}${sourceManifest.missingRequired?.length ? `，缺失 ${sourceManifest.missingRequired.join("、")}` : ""}`);
        if (compactRefs.schema)
            lines.push(`  - compact file references：${compactRefs.referenceCount || 0} 个，missing ${compactRefs.missingCount || 0}；raw messages / typed MEMORY.md / session summary 是压缩后恢复的可读来源。`);
        if (compactReadPlan.schema) {
            lines.push(`  - compact file reference read plan：planned=${compactReadPlan.plannedCount || 0}/${compactReadPlan.sourceReferenceCount || 0}，sourceOfTruth=${compactReadPlan.hasSourceOfTruth === true}，summary=${compactReadPlan.hasCompactSummary === true}；只在派发/核验需要时按优先级读取。`);
            for (const entry of Array.isArray(compactReadPlan.entries) ? compactReadPlan.entries.slice(0, 3) : []) {
                lines.push(`    - ${entry.read_plan_id || ""}：${entry.action || "read_if_needed"}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}`);
            }
        }
        if (compactReadPlanAccess.schema)
            lines.push(`  - compact read plan access：surfaced=${compactReadPlanAccess.ledger_entry_count || 0} mentioned=${compactReadPlanAccess.mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0} read_plan_id=${compactReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0}`);
        if (compactReadPlanFreshness.schema)
            lines.push(`  - compact read plan freshness：${compactReadPlanFreshness.status || "unknown"}，fresh=${compactReadPlanFreshness.freshCount || 0}/${compactReadPlanFreshness.checked || 0}，changed=${compactReadPlanFreshness.changedCount || 0}，unverifiable=${compactReadPlanFreshness.unverifiableCount || 0}`);
        if (compactReadPlanRevalidationGate.schema && (Number(compactReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactReadPlanRevalidationGate.verification_count || 0) > 0)) {
            lines.push(`  - compact read plan revalidation gate：gate=${compactReadPlanRevalidationGate.revalidation_gate_id || ""}，status=${compactReadPlanRevalidationGate.status || "unknown"}，required=${compactReadPlanRevalidationGate.required_count || 0}，verify=${compactReadPlanRevalidationGate.verification_count || 0}；派发子 Agent 前必须要求 stale read_plan_id 先 re-read/current source verified。`);
        }
        if (compactRefAccess.schema)
            lines.push(`  - compact file reference access：surfaced=${compactRefAccess.ledger_entry_count || 0} mentioned=${compactRefAccess.mentioned_count || 0}/${compactRefAccess.reference_count || 0}`);
        if (reloadAudit.schema)
            lines.push(`  - memory reload audit：reason=${reloadAudit.reason || "unknown"}，action=${reloadAudit.cacheAction || "unknown"}，sourceChanged=${reloadAudit.sourceManifestChanged === true}，scope=${reloadAudit.scope || "default"}`);
        if (reloadAudit.sourceChangeTrigger?.triggered)
            lines.push(`  - memory source change trigger：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}`);
        if (compaction.post_compact_recovery_audit?.schema)
            lines.push(`  - post-compact recovery audit：${compaction.post_compact_recovery_audit.status || "unknown"}，通过 ${compaction.post_compact_recovery_audit.passedChecks || 0}/${compaction.post_compact_recovery_audit.checkCount || 0}，动作 ${compaction.post_compact_recovery_audit.action || "unknown"}`);
        if (Array.isArray(compaction.partial_segments) && compaction.partial_segments.length)
            lines.push(`  - partial compact sidecar：${compaction.partial_segments.length} 个近期摘要段，不推进主边界。`);
        if (compaction.ptl_emergency?.engaged)
            lines.push(`  - PTL emergency：${compaction.ptl_emergency.emergencyLevel || "unknown"}，原因 ${compaction.ptl_emergency.reason || "unknown"}`);
        if (compaction.ptl_recovery?.recovered)
            lines.push(`  - PTL recovery：已恢复普通摘要预算，原因 ${compaction.ptl_recovery.reason || "unknown"}`);
        if (typed.sync?.index_file)
            lines.push(`  - typed MEMORY.md：${typed.sync.docs || 0} docs，入口 ${typed.sync.index_file}`);
        if (typed.global_claude_memory_import?.schema && Number(typed.global_claude_memory_import.importedCount || 0) > 0) {
            const includeAudit = typed.global_claude_memory_import.includeAudit || {};
            const settingPolicy = typed.global_claude_memory_import.settingSourcePolicy || {};
            lines.push(`  - global Claude memory import：导入 ${typed.global_claude_memory_import.importedCount || 0} 个 user/managed Claude typed docs${includeAudit.schema ? `，include ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0}/${includeAudit.skippedCount || 0}` : ""}${settingPolicy.schema ? `，sources=${(settingPolicy.enabled || []).join(",")}${settingPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (includeAudit.externalIncludeApproval?.pendingCount)
                lines.push(`  - global Claude external include approval：pending=${includeAudit.externalIncludeApproval.pendingCount} ledger=${includeAudit.externalIncludeApproval.ledgerFile || ""}`);
            if (typed.global_claude_memory_import.instructionsLoadedHooks?.schema)
                lines.push(`  - global Claude InstructionsLoaded hooks：events=${typed.global_claude_memory_import.instructionsLoadedHooks.eventCount || 0} fired=${typed.global_claude_memory_import.instructionsLoadedHooks.firedCount || 0} failed=${typed.global_claude_memory_import.instructionsLoadedHooks.failureCount || 0}`);
        }
        if (Array.isArray(typed.project_memory_imports) && typed.project_memory_imports.length) {
            const importedCount = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.importedCount || 0), 0);
            const includeImported = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.importedIncludeCount || item.includeAudit?.includedCount || 0), 0);
            const includeSkipped = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.skippedCount || 0), 0);
            const externalPending = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.externalIncludeApproval?.pendingCount || 0), 0);
            const firstPolicy = typed.project_memory_imports.find((item) => item.settingSourcePolicy?.schema)?.settingSourcePolicy || {};
            const hookEvents = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.eventCount || 0), 0);
            const hookFired = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.firedCount || 0), 0);
            const hookFailed = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.failureCount || 0), 0);
            lines.push(`  - project memory import：${typed.project_memory_imports.length} 个项目根，导入 ${importedCount} 个 Claude/规则 typed docs${includeImported || includeSkipped ? `，include ${includeImported}/${includeSkipped}` : ""}${firstPolicy.schema ? `，sources=${(firstPolicy.enabled || []).join(",")}${firstPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (externalPending)
                lines.push(`  - project Claude external include approval：pending=${externalPending}`);
            if (hookEvents)
                lines.push(`  - project Claude InstructionsLoaded hooks：events=${hookEvents} fired=${hookFired} failed=${hookFailed}`);
        }
        const loadPlanText = (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)(typed.load_plan), 1400);
        if (loadPlanText)
            lines.push(`  - ${loadPlanText.replace(/\n/g, "\n  ")}`);
        if (quality.schema)
            lines.push(`  - 蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，矛盾 ${quality.contradictionCount || 0}`);
        const recallText = (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_index_1.renderGroupTypedMemoryRecall)(typed.recall), 2200);
        if (recallText)
            lines.push(`  - ${recallText.replace(/\n/g, "\n  ")}`);
        if (state.summary)
            lines.push(`  - 群聊摘要：\n${(0, group_memory_shared_1.compactPreserveLines)(state.summary, 1800).replace(/^/gm, "    ")}`);
        addList("持久用户要求", state.persistent_requirements || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键事实锚点", state.fact_anchors || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键决策", state.decisions || [], (entry) => `${entry.decision || entry}${entry.reason ? `（${entry.reason}）` : ""}`, 4);
        addList("已完成", state.completed || [], (entry) => `${entry.project || "unknown"}：${entry.summary || ""}`, 4);
        addList("阻塞", state.blocked || [], (entry) => `${entry.project || "unknown"}：${entry.reason || ""}`, 4);
        addList("下一步", state.next_actions || [], (entry) => String(entry.action || entry), 4);
        lines.push(`  - 原始来源：memory=${item.raw_sources?.group_memory_file || ""}；messages=${item.raw_sources?.group_messages_file || ""}；typed=${item.raw_sources?.group_typed_memory_dir || ""}`);
    }
    return lines.join("\n");
}
// ===== merged from group-memory-context-part-05.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
var group_session_model_context_1 = require("./group-session-model-context");
Object.defineProperty(exports, "buildChildParentSessionContextPacket", { enumerable: true, get: function () { return group_session_model_context_1.buildChildParentSessionContextPacket; } });
Object.defineProperty(exports, "buildChildParentSessionContextProjection", { enumerable: true, get: function () { return group_session_model_context_1.buildChildParentSessionContextProjection; } });
Object.defineProperty(exports, "buildExactGroupSessionModelContextPacket", { enumerable: true, get: function () { return group_session_model_context_1.buildExactGroupSessionModelContextPacket; } });
Object.defineProperty(exports, "buildExactGroupSessionModelContextProjection", { enumerable: true, get: function () { return group_session_model_context_1.buildExactGroupSessionModelContextProjection; } });
function buildGroupContextPacket(groupId, options = {}) {
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
    const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
    const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
    const allMessages = (0, storage_1.getGroupMessages)(groupId, groupSessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const resumePreparation = prepareGroupMemoryResumeProjection(groupId, groupSessionId, allMessages, (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId), {
        groupSessionId,
        recentLimit,
        olderLimit
    });
    const snapshotMemory = resumePreparation.memory;
    const resumeProjection = resumePreparation.projection || {};
    const rawRecentMessages = resumeProjection.useProjection === true
        ? (resumeProjection.projectedMessages || [])
        : allMessages.slice(-recentLimit);
    const timeBasedMicrocompactConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.compactionConfig || options.compaction_config || {});
    const timeBasedToolResultProjection = (0, group_memory_compaction_1.buildGroupTimeBasedToolResultProjection)(rawRecentMessages, {
        groupId,
        groupSessionId,
        querySource: "group_main_thread:context_packet",
        enabled: options.timeBasedMicrocompactEnabled ?? options.time_based_microcompact_enabled ?? timeBasedMicrocompactConfig.timeBasedMicrocompactEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        keepRecent: options.timeBasedMicrocompactKeepRecent || options.time_based_microcompact_keep_recent || timeBasedMicrocompactConfig.timeBasedMicrocompactKeepRecent,
        now: options.now
    });
    const mainCompactEpoch = (0, group_memory_compaction_1.buildGroupCompactEpoch)(String(snapshotMemory.compactBoundary?.boundaryId
        || snapshotMemory.compactBoundary?.boundary_id
        || snapshotMemory.compaction?.boundaryId
        || snapshotMemory.compaction?.boundary_id
        || ""));
    const timeBasedThinkingProjection = (0, group_memory_compaction_1.buildGroupTimeBasedThinkingProjection)(timeBasedToolResultProjection.messages, {
        groupId,
        groupSessionId,
        compactEpoch: mainCompactEpoch,
        querySource: "group_main_thread:context_packet",
        enabled: options.timeBasedThinkingClearEnabled ?? options.time_based_thinking_clear_enabled ?? timeBasedMicrocompactConfig.timeBasedThinkingClearEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        priorReceipt: snapshotMemory.compaction?.timeBasedThinkingProjection || snapshotMemory.messageCompression?.timeBasedThinkingProjection || null,
        isRedactThinkingActive: options.isRedactThinkingActive === true || options.is_redact_thinking_active === true,
        now: options.now
    });
    const recentMessages = timeBasedThinkingProjection.messages;
    const olderMessages = resumeProjection.useProjection === true
        ? allMessages.slice(0, Number(resumeProjection.omittedMessageCount || 0))
        : allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
    const fallbackDigest = (0, group_memory_shared_1.buildCompressedGroupMessageDigest)(olderMessages, olderLimit);
    const digest = snapshotMemory.messageDigest || fallbackDigest;
    const compression = {
        enabled: true,
        strategy: snapshotMemory.messageCompression?.strategy || "cc-session-memory-v3-sync",
        recentLimit,
        olderLimit,
        totalMessages: allMessages.length,
        compressedMessages: snapshotMemory.messageCompression?.compressedMessages ?? olderMessages.length,
        recentMessages: recentMessages.length,
        preCompactTokenCount: snapshotMemory.messageCompression?.preCompactTokenCount || 0,
        postCompactTokenCount: snapshotMemory.messageCompression?.postCompactTokenCount || 0,
        lastCompressedAt: new Date().toISOString()
    };
    const memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
        ...snapshotMemory,
        messageDigest: digest,
        compaction: {
            ...(snapshotMemory.compaction || {}),
            ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
            ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {})
        },
        messageCompression: {
            ...compression,
            ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
            ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {})
        }
    }, groupSessionId, {
        sessionMemoryCadenceDecision: snapshotMemory.sessionMemory?.updateCadence || null
    });
    const sections = [buildGroupMemoryContext(memory)];
    if (resumeProjection.schema) {
        const resumeBaseline = resumePreparation.resumeBaseline || snapshotMemory.compaction?.resumeEffectiveTokenBaseline || null;
        sections.push([
            "会话恢复投影：",
            `- status=${resumeProjection.status || "unknown"}; verified=${resumeProjection.verified === true}; recovered=${resumePreparation.recovered === true}; raw=${allMessages.length}; prefix_omitted=${resumeProjection.omittedMessageCount || 0}; snip_omitted=${resumeProjection.snipOmittedMessageCount || 0}; projected=${resumeProjection.projectedMessageCount || recentMessages.length}`,
            `- boundary=${resumeProjection.boundary?.boundaryId || "none"}; journal=${resumeProjection.journal?.file || "none"}; proof=${resumePreparation.proof?.proofId || "none"}`,
            resumeProjection.roundTripConsistency?.schema
                ? `- round_trip status=${resumeProjection.roundTripConsistency.status || "unknown"}; expected=${resumeProjection.roundTripConsistency.expectedActiveMessageCount || 0}; actual=${resumeProjection.roundTripConsistency.actualActiveMessageCount || 0}; delta=${resumeProjection.roundTripConsistency.delta || 0}; checksum=${resumeProjection.roundTripConsistency.checksum || "none"}`
                : "",
            resumePreparation.compactHeadRecovery?.schema
                ? `- compact_head_recovery status=${resumePreparation.compactHeadRecovery.status || "unknown"}; recovered=${resumePreparation.compactHeadRecovery.recovered === true}; prior_generation=${resumePreparation.compactHeadRecovery.priorHeadGeneration || 0}; current_generation=${resumePreparation.compactHeadRecovery.head?.generation || 0}`
                : "",
            resumeBaseline?.schema
                ? `- tokens raw=${resumeBaseline.rawTranscriptTokens || 0}; prefix_omitted=${resumeBaseline.omittedRawTokens || 0}; snip_removed=${resumeBaseline.snipRemovedMessageCount || 0}/${resumeBaseline.snipRemovedTokenEstimate || 0}; summary=${resumeBaseline.summaryTokens || 0}; projected=${resumeBaseline.projectedMessageTokens || 0}; effective=${resumeBaseline.effectiveContextTokens || 0}; stale_usage_excluded=${resumeBaseline.staleProviderUsageTokensExcluded || 0}; baseline=${resumeBaseline.baselineId || "none"}`
                : "",
        ].join("\n"));
    }
    if (digest) {
        sections.push([
            "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
            digest,
        ].join("\n"));
    }
    if (recentMessages.length) {
        sections.push([
            `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
            (0, group_memory_compaction_1.buildBoundedRecentGroupContext)(recentMessages, fullCount),
        ].join("\n"));
    }
    if (timeBasedToolResultProjection.receipt.enabled) {
        const receipt = timeBasedToolResultProjection.receipt;
        sections.push(`时间触发 microcompact：status=${receipt.status}; gap=${receipt.gap_minutes}/${receipt.gap_threshold_minutes}min; tool_results cleared=${receipt.cleared_tool_result_count}, kept=${receipt.kept_tool_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
    }
    if (timeBasedThinkingProjection.receipt.enabled) {
        const receipt = timeBasedThinkingProjection.receipt;
        sections.push(`时间触发 thinking clear：status=${receipt.status}; latched=${receipt.latched === true}; compact_epoch=${receipt.compact_epoch}; thinking_turns cleared=${receipt.cleared_thinking_turn_count}, kept=${receipt.kept_thinking_turn_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
    }
    const rendered = sections.filter(Boolean).join("\n\n");
    const postCompactPayloadGate = memory.compaction?.postCompactPayloadGate
        || memory.messageCompression?.postCompactPayloadGate
        || memory.compactBoundary?.postCompactPayloadGate
        || memory.compactBoundary?.post_compact_restore?.postCompactPayloadGate
        || null;
    if (postCompactPayloadGate?.status !== "recompact_required")
        return rendered;
    return (0, group_memory_shared_1.compactPreserveLines)(rendered, Math.max(4000, Number(postCompactPayloadGate.safe_render_chars || 6000)));
}
//# sourceMappingURL=group-memory-context.js.map