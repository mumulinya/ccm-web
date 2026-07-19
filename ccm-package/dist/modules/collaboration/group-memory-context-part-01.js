"use strict";
// Behavior-freeze split from group-memory-context.ts (part 1/5).
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
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const tool_manager_1 = require("../../tools/tool-manager");
const runtime_1 = require("../../agents/runtime");
const group_runtime_memory_admission_1 = require("./group-runtime-memory-admission");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
const group_post_turn_summary_1 = require("./group-post-turn-summary");
const group_compact_head_1 = require("./group-compact-head");
const provider_native_compact_session_capacity_1 = require("./provider-native-compact-session-capacity");
const group_memory_auto_compact_circuit_breaker_1 = require("./group-memory-auto-compact-circuit-breaker");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_auto_compact_hook_state_1 = require("./group-memory-auto-compact-hook-state");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
const group_tool_continuity_1 = require("./group-tool-continuity");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
const group_compaction_activity_1 = require("./group-compaction-activity");
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
//# sourceMappingURL=group-memory-context-part-01.js.map