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
exports.renderMemoryContextForWorker = renderMemoryContextForWorker;
exports.buildSelfContainedWorkerHandoff = buildSelfContainedWorkerHandoff;
exports.renderReceiptSchemaForWorker = renderReceiptSchemaForWorker;
exports.renderSelfContainedWorkerHandoff = renderSelfContainedWorkerHandoff;
exports.summarizeWorkerHandoffForUser = summarizeWorkerHandoffForUser;
exports.runWorkerHandoffSelfTest = runWorkerHandoffSelfTest;
const crypto = __importStar(require("crypto"));
const runtime_kernel_1 = require("./runtime-kernel");
const model_capability_cache_1 = require("../modules/collaboration/model-capability-cache");
const trusted_memory_prompt_envelope_1 = require("./trusted-memory-prompt-envelope");
const agent_sessions_1 = require("../tasks/agent-sessions");
const task_agent_memory_entry_sync_1 = require("../tasks/task-agent-memory-entry-sync");
function compact(value, max = 900) {
    const text = typeof value === "string" ? value : JSON.stringify(value || "");
    if (text.length <= max)
        return text;
    return `${text.slice(0, Math.ceil(max * 0.7))}\n...[truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.2))}`;
}
function hash(value, len = 14) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}
function stringList(value, limit = 12) {
    const raw = Array.isArray(value) ? value : value ? [value] : [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        const text = String(item || "").trim();
        if (!text || seen.has(text))
            continue;
        seen.add(text);
        out.push(text);
        if (out.length >= limit)
            break;
    }
    return out;
}
function normalizeDependency(item) {
    if (!item)
        return null;
    if (typeof item === "string")
        return { project: item, reason: "前置依赖" };
    const project = String(item.project || item.agent || item.name || item.dependsOn || item.depends_on || "").trim();
    const reason = String(item.reason || item.summary || item.detail || "前置依赖").trim();
    if (!project && !reason)
        return null;
    return { project, reason };
}
function extractMemoryText(value, max = 1200) {
    if (!value)
        return "";
    if (typeof value === "string")
        return compact(value, max);
    if (typeof value !== "object")
        return compact(value, max);
    if (value.rendered_text)
        return compact(value.rendered_text, max);
    if (value.renderedText)
        return compact(value.renderedText, max);
    if (value.schema === "ccm-worker-memory-context-v1") {
        return compact([
            extractMemoryText(value.group_memory, Math.max(1000, Math.floor(max * 0.78))),
            value.global_mission_memory || "",
        ].filter(Boolean).join("\n\n"), max);
    }
    if (value.schema === "ccm-group-memory-context-v1") {
        return compact([
            value.group_state?.summaryText || "",
            value.relevant_historical_evidence || "",
            value.target_agent_memory?.summary ? `子 Agent 摘要：${value.target_agent_memory.summary}` : "",
        ].filter(Boolean).join("\n\n"), max);
    }
    return compact(value, max);
}
function extractInvokedSkillAttachmentText(value) {
    if (!value || typeof value !== "object")
        return "";
    const direct = String(value.invoked_skill_attachment_text || value.invokedSkillAttachmentText || "").trim();
    if (direct)
        return direct;
    if (value.group_memory)
        return extractInvokedSkillAttachmentText(value.group_memory);
    if (value.groupMemory)
        return extractInvokedSkillAttachmentText(value.groupMemory);
    if (value.memory)
        return extractInvokedSkillAttachmentText(value.memory);
    return "";
}
function extractPlanAttachmentText(value) {
    if (!value || typeof value !== "object")
        return "";
    const direct = String(value.plan_attachment_text || value.planAttachmentText || "").trim();
    if (direct)
        return direct;
    if (value.group_memory)
        return extractPlanAttachmentText(value.group_memory);
    if (value.groupMemory)
        return extractPlanAttachmentText(value.groupMemory);
    if (value.memory)
        return extractPlanAttachmentText(value.memory);
    return "";
}
function extractDynamicContextDeltaText(value) {
    if (!value || typeof value !== "object")
        return "";
    const direct = String(value.dynamic_context_delta_text || value.dynamicContextDeltaText || "").trim();
    if (direct)
        return direct;
    if (value.group_memory)
        return extractDynamicContextDeltaText(value.group_memory);
    if (value.groupMemory)
        return extractDynamicContextDeltaText(value.groupMemory);
    if (value.memory)
        return extractDynamicContextDeltaText(value.memory);
    return "";
}
function extractMemoryConsumptionChallenge(value) {
    if (!value || typeof value !== "object")
        return null;
    const direct = value.memory_consumption_challenge || value.memoryConsumptionChallenge || null;
    if (direct?.schema === "ccm-memory-context-consumption-challenge-v1")
        return direct;
    if (value.group_memory)
        return extractMemoryConsumptionChallenge(value.group_memory);
    if (value.groupMemory)
        return extractMemoryConsumptionChallenge(value.groupMemory);
    if (value.memory)
        return extractMemoryConsumptionChallenge(value.memory);
    return null;
}
function renderMemoryConsumptionChallenge(challenge) {
    if (!challenge?.challenge_id)
        return "";
    return [
        "[CCM 模型侧记忆加载回执]",
        "- 开始执行任务前，必须调用内部 MCP server `ccm__knowledge_context` 的 `acknowledge_memory_context` 工具。",
        "- 若工作单涉及业务规范、历史文档、接口约定或明确要求查资料，使用同一 MCP 的 `search_knowledge` 检索；需要完整原文时调用 `read_knowledge_document`。",
        "- 引用知识库结论时保留 `[source:引用标识]`，不得把未读取或未命中的内容写成事实。",
        "- 项目内默认开发权限之外的操作，必须通过 `ccm__permission_broker.request_execution_permission` 申请；绑定命令的授权使用 `execute_approved_command`，非命令授权才调用 `consume_execution_permission`。",
        "- 权限状态不是 approved 时立即停止相关操作。发布、生产部署、强推、密钥、系统提权、项目外路径和破坏性数据库操作必须等待用户审批。",
        `- 工具参数：challenge_id=${challenge.challenge_id}`,
        "- 该调用只确认你已加载本轮受信记忆，不表示你同意或采用其中每一条；后续仍需在结构化回执中分别声明 used/ignored/verified。",
        "- 不得只在最终文本中复述 challenge；缺少真实 MCP tool receipt 时本轮交付不会提交。",
    ].join("\n");
}
function normalizeMemoryContext(value) {
    if (!value)
        return null;
    if (typeof value === "string") {
        return {
            schema: "ccm-memory-text-v1",
            summary: compact(value, 1200),
            rendered_text: compact(value, 6000),
        };
    }
    if (typeof value !== "object") {
        return { schema: "ccm-memory-value-v1", summary: compact(value, 1200) };
    }
    return {
        ...value,
        summary: value.summary || extractMemoryText(value, 1600),
        rendered_text: value.rendered_text || value.renderedText || extractMemoryText(value, 10_000),
    };
}
function extractMemoryFreshnessGate(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.dispatch_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1")
        return value.dispatch_freshness_gate;
    if (value.group_memory)
        return extractMemoryFreshnessGate(value.group_memory);
    if (value.memory)
        return extractMemoryFreshnessGate(value.memory);
    return null;
}
function extractPostCompactReinjectionGate(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.post_compact_reinjection_gate;
    if (value.postCompactReinjectionGate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.postCompactReinjectionGate;
    if (value.group_memory)
        return extractPostCompactReinjectionGate(value.group_memory);
    if (value.memory)
        return extractPostCompactReinjectionGate(value.memory);
    return null;
}
function extractPostCompactDispatchMarker(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.post_compact_dispatch_marker;
    if (value.postCompactDispatchMarker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.postCompactDispatchMarker;
    if (value.group_memory)
        return extractPostCompactDispatchMarker(value.group_memory);
    if (value.memory)
        return extractPostCompactDispatchMarker(value.memory);
    return null;
}
function extractReadPlanRevalidationGate(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.compact_file_reference_read_plan_revalidation_gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.compact_file_reference_read_plan_revalidation_gate;
    if (value.compactFileReferenceReadPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.compactFileReferenceReadPlanRevalidationGate;
    if (value.group_memory)
        return extractReadPlanRevalidationGate(value.group_memory);
    if (value.memory)
        return extractReadPlanRevalidationGate(value.memory);
    return null;
}
function extractGlobalMemoryHealthGate(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_memory_health_gate;
    if (value.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalMemoryHealthGate;
    if (value.global_agent_memory?.memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_agent_memory.memory_health_gate;
    if (value.globalAgentMemory?.memoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalAgentMemory.memoryHealthGate;
    if (value.group_memory)
        return extractGlobalMemoryHealthGate(value.group_memory);
    if (value.memory)
        return extractGlobalMemoryHealthGate(value.memory);
    return null;
}
function extractApiMicrocompactNativeApplyPlan(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.api_microcompact_native_apply_plan;
    if (value.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.apiMicrocompactNativeApplyPlan;
    if (value.compaction?.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.compaction.apiMicrocompactNativeApplyPlan;
    if (value.compaction?.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.compaction.api_microcompact_native_apply_plan;
    if (value.group_memory)
        return extractApiMicrocompactNativeApplyPlan(value.group_memory);
    if (value.groupMemory)
        return extractApiMicrocompactNativeApplyPlan(value.groupMemory);
    if (value.memory)
        return extractApiMicrocompactNativeApplyPlan(value.memory);
    return null;
}
function renderMemoryFreshnessGate(gate) {
    if (!gate?.schema)
        return "";
    return [
        `记忆派发门禁：gate=${gate.dispatch_gate_id || ""}`,
        `status=${gate.status || "unknown"}`,
        `action=${gate.action || "unknown"}`,
        gate.reload_audit?.reason ? `reload=${gate.reload_audit.reason}` : "",
        gate.source_manifest?.checksum ? `source=${gate.source_manifest.checksum}` : "",
        "回执 memoryUsed/memoryIgnored 必须声明该 gate 的使用情况。",
    ].filter(Boolean).join("；");
}
function renderPostCompactReinjectionGate(gate) {
    if (!gate?.schema)
        return "";
    const audit = gate.post_compact_recovery_audit || gate.postCompactRecoveryAudit || {};
    const candidateRefs = (Array.isArray(gate.candidates) ? gate.candidates : [])
        .map((item) => item.candidate_id || item.candidateId)
        .filter(Boolean)
        .slice(0, 6)
        .join("、");
    return [
        `压缩后重注入门禁：gate=${gate.reinjection_gate_id || ""}`,
        `status=${gate.status || "required"}`,
        `candidates=${gate.candidate_count || 0}`,
        candidateRefs ? `candidate_refs=${candidateRefs}` : "",
        audit.summary_checksum ? `summary=${audit.summary_checksum}` : "",
        "回执 memoryUsed/memoryIgnored 必须引用该 gate；postCompactCandidateUsage 必须逐条声明每个 candidate_id 的 used/ignored/verified。",
    ].filter(Boolean).join("；");
}
function renderPostCompactDispatchMarker(marker) {
    if (!marker?.schema)
        return "";
    return [
        `压缩后派发标记：marker=${marker.marker_id || ""}`,
        `boundary=${marker.boundary_id || ""}`,
        `sequence=${marker.dispatch_sequence || 0}`,
        `first=${marker.first_dispatch_after_compact === true}`,
        marker.summary_checksum ? `summary=${marker.summary_checksum}` : "",
        "这是压缩恢复后子 Agent 派发遥测；first=true 时按压缩后第一跳上下文处理。",
    ].filter(Boolean).join("；");
}
function renderReadPlanRevalidationGate(gate) {
    if (!gate?.schema)
        return "";
    const requiredIds = (Array.isArray(gate.required_read_plan_ids) ? gate.required_read_plan_ids : [])
        .slice(0, 8)
        .join("、");
    const session = gate.session_binding || {};
    return [
        `压缩读取计划重读门禁：gate=${gate.revalidation_gate_id || ""}`,
        `status=${gate.status || "unknown"}`,
        `required=${gate.required_count || 0}`,
        `verify=${gate.verification_count || 0}`,
        session.task_agent_session_id ? `session=${session.task_agent_session_id}` : "",
        session.native_session_id ? `native=${session.native_session_id}` : "",
        requiredIds ? `read_plan_ids=${requiredIds}` : "",
        "回执 memoryUsed/memoryIgnored 必须声明 gate、read_plan_id、当前源已重读/已验证，且应绑定本任务 Agent 会话。",
    ].filter(Boolean).join("；");
}
function renderGlobalMemoryHealthGate(gate) {
    if (!gate?.schema)
        return "";
    return [
        `Global Agent memory health gate：gate=${gate.gate_id || ""}`,
        `status=${gate.status || "unknown"}`,
        `active=${gate.active_contamination_count || 0}`,
        `residue=${gate.residue_contamination_count || 0}`,
        `action=${gate.action || "unknown"}`,
        gate.status === "fail"
            ? "active memory 不干净时不得使用 global_agent_memory；回执 memoryIgnored 必须引用该 gate。"
            : gate.status === "warn"
                ? "active memory 干净但有历史残留；使用全局记忆前仍需核验当前源。"
                : "active memory clean；全局记忆仍只作历史上下文，当前源优先。",
    ].filter(Boolean).join("；");
}
function renderApiMicrocompactNativeApplyPlan(plan) {
    if (!plan?.schema)
        return "";
    const executor = plan.executor || {};
    return [
        `API microcompact native apply：applyPlan=${plan.applyPlanChecksum || ""}`,
        `mode=${plan.mode || "advisory_only"}`,
        `ready=${plan.nativeApplyReady === true}`,
        `executor=${executor.agentType || "unknown"}/${executor.transport || "unknown"}`,
        plan.task_agent_session_id ? `session=${plan.task_agent_session_id}` : "",
        plan.memory_context_snapshot_id ? `snapshot=${plan.memory_context_snapshot_id}` : "",
        plan.nativeApplyReady === true
            ? `provider request 必须合并 requestPatch.body.context_management，并携带 beta=${plan.capability?.requiredBetaHeader || "context-management-2025-06-27"}`
            : `仅 advisory：${plan.reason || "native provider request layer unavailable"}`,
        "只有真实发送带 context_management 的 API 请求，并且回执匹配本轮 session/snapshot 后，才能声明 native_applied。",
        plan.nativeApplyReady === true
            ? "声明 native_applied 时还必须填写 apiMicrocompactNativeApplyRequestTelemetry，记录 requestPatchChecksum、requestBodyChecksum、betaHeaders、provider endpoint、session/snapshot 和 sentAt。"
            : "",
        plan.nativeApplyReady === true
            ? "强 native_applied 证明必须由 fresh native_request_adapter telemetry 支撑；agent_receipt 来源 telemetry 只能作为弱证据，不能单独证明 provider request 已真实合并。"
            : "",
    ].filter(Boolean).join("；");
}
function renderMemoryContextForWorker(memory) {
    if (!memory)
        return "";
    const transport = (0, task_agent_memory_entry_sync_1.taskAgentMemoryTransport)(memory);
    if (transport.present && !transport.valid)
        return `[CCM task-Agent memory entry sync invalid: ${transport.issues.join(",")}]`;
    if (transport.mode === "continuation")
        return "";
    if (transport.mode === "delta")
        return transport.text;
    const text = extractMemoryText(memory, 10_000);
    const invokedSkillAttachmentText = extractInvokedSkillAttachmentText(memory);
    const planAttachmentText = extractPlanAttachmentText(memory);
    const dynamicContextDeltaText = extractDynamicContextDeltaText(memory);
    const memoryConsumptionChallengeText = renderMemoryConsumptionChallenge(extractMemoryConsumptionChallenge(memory));
    if (!text && !invokedSkillAttachmentText && !planAttachmentText && !dynamicContextDeltaText && !memoryConsumptionChallengeText)
        return "";
    const schema = typeof memory === "object" ? String(memory.schema || "ccm-memory-context") : "ccm-memory-text";
    return [
        `schema: ${schema}`,
        typeof memory === "object" && memory.group_memory?.schema ? `group_memory_schema: ${memory.group_memory.schema}` : "",
        typeof memory === "object" && memory.group_id ? `group_id: ${memory.group_id}` : "",
        typeof memory === "object" && memory.target_project ? `target_project: ${memory.target_project}` : "",
        invokedSkillAttachmentText && !text.includes(invokedSkillAttachmentText) ? invokedSkillAttachmentText : "",
        planAttachmentText && !text.includes(planAttachmentText) ? planAttachmentText : "",
        dynamicContextDeltaText && !text.includes(dynamicContextDeltaText) ? dynamicContextDeltaText : "",
        memoryConsumptionChallengeText,
        text,
    ].filter(Boolean).join("\n");
}
function renderContinuationForWorker(continuation) {
    if (!continuation || typeof continuation !== "object")
        return "";
    const instructions = stringList(continuation.instructions || continuation.worker_instructions || continuation.workerInstructions, 10);
    const preserved = stringList(continuation.preserved_context || continuation.preservedContext, 8);
    const avoid = stringList(continuation.avoid || continuation.stop_doing || continuation.stopDoing, 8);
    const latest = continuation.latest_user_change || continuation.latestUserChange || continuation.message || continuation.reason || "";
    return [
        "Continuation / goal revision:",
        `- kind: ${continuation.kind_label || continuation.kind || "supplement"}`,
        continuation.route_label || continuation.routeLabel ? `- route: ${continuation.route_label || continuation.routeLabel}` : "",
        continuation.replan_required || continuation.replanRequired ? "- Revalidate the plan against the new goal before acting; do not blindly continue the old direction." : "",
        continuation.interrupt_current_run || continuation.interruptCurrentRun ? "- The previous potentially misaligned execution round was stopped by the main Agent; follow the new goal in this work package." : "",
        latest ? `- latest user change: ${compact(latest, 700)}` : "",
        continuation.current_goal || continuation.currentGoal ? `- current goal: ${compact(continuation.current_goal || continuation.currentGoal, 900)}` : "",
        continuation.previous_goal || continuation.previousGoal ? `- previous goal is context only; do not continue it: ${compact(continuation.previous_goal || continuation.previousGoal, 700)}` : "",
        instructions.length ? "Specific instructions:" : "",
        ...instructions.map(item => `- ${item}`),
        preserved.length ? "Context / evidence to preserve:" : "",
        ...preserved.map(item => `- ${item}`),
        avoid.length ? "Do not continue:" : "",
        ...avoid.map(item => `- ${item}`),
    ].filter(Boolean).join("\n");
}
function buildSelfContainedWorkerHandoff(input) {
    const project = String(input.project || "").trim();
    const task = String(input.task || "").trim();
    const dispatchContract = input.planDispatchContract || null;
    const explicitlySelectedWorkItem = dispatchContract?.workItems?.find((item) => String(item?.workItemId || "") === String(input.workItemId || "")) || null;
    const assignedWorkItems = explicitlySelectedWorkItem
        ? [explicitlySelectedWorkItem]
        : (dispatchContract?.workItems || []).filter((item) => String(item?.project || "") === project);
    const selectedWorkItem = assignedWorkItems[0] || null;
    const analysis = input.analysis || {};
    const userGoal = String(selectedWorkItem?.businessGoal || input.userGoal || analysis.summary || task || "").trim();
    const dependencies = (input.dependencies || []).map(normalizeDependency).filter(Boolean);
    const verificationHints = stringList(input.verificationHints, 8);
    const acceptance = assignedWorkItems.length
        ? [...new Set(assignedWorkItems.flatMap(item => item.acceptance || []))]
        : stringList(input.acceptance, 8);
    const allowedScope = stringList(input.allowedScope, 10);
    const forbiddenScope = stringList(input.forbiddenScope, 10);
    const expectedFiles = stringList(input.expectedFiles, 12);
    const documentFindings = stringList(analysis.documentFindings || analysis.document_findings, 10);
    const constraints = [...new Set([...(selectedWorkItem?.constraints || []), ...stringList(analysis.constraints, 10)])].slice(0, 20);
    const doneCriteria = stringList(input.doneCriteria, 10);
    let memoryContext = normalizeMemoryContext(input.memory);
    const memoryFreshnessGate = extractMemoryFreshnessGate(memoryContext);
    const postCompactReinjectionGate = extractPostCompactReinjectionGate(memoryContext);
    const postCompactDispatchMarker = extractPostCompactDispatchMarker(memoryContext);
    const readPlanRevalidationGate = extractReadPlanRevalidationGate(memoryContext);
    const globalMemoryHealthGate = extractGlobalMemoryHealthGate(memoryContext);
    const apiMicrocompactNativeApplyPlan = extractApiMicrocompactNativeApplyPlan(memoryContext);
    const modelContextCapacity = (0, model_capability_cache_1.resolveTrustedModelContextCapacity)({ provider: input.agentType || "unknown", model: input.model || "" });
    const typedMemoryCapacityRebudget = (0, runtime_kernel_1.rebuildWorkerTypedMemoryDeliveryForModelContext)(memoryContext, modelContextCapacity.contextWindow);
    if (typedMemoryCapacityRebudget.rebuilt === true)
        memoryContext = typedMemoryCapacityRebudget.memory;
    if (input.taskAgentSessionId && memoryContext) {
        const entrySync = (0, agent_sessions_1.prepareTaskAgentMemoryEntrySyncContextWithRetry)(input.taskAgentSessionId, memoryContext);
        if (entrySync.prepared === true)
            memoryContext = entrySync.memoryContext;
    }
    const memoryEntryTransport = (0, task_agent_memory_entry_sync_1.taskAgentMemoryTransport)(memoryContext);
    const contextUsageOptions = {
        maxTokens: modelContextCapacity.effectiveContextWindow,
        reservedOutputTokens: modelContextCapacity.reservedOutputTokens,
        autoCompactBufferTokens: modelContextCapacity.autoCompactBufferTokens,
        capacityProvenance: modelContextCapacity,
    };
    const previousCapacity = input.workerContextPacket?.model_context_capacity || input.workerContextPacket?.context_usage?.capacity_provenance || null;
    const capacityDowngrade = Number(previousCapacity?.contextWindow || 0) > Number(modelContextCapacity.contextWindow || 0);
    const capacityDowngradeGate = capacityDowngrade ? {
        schema: "ccm-worker-context-capacity-downgrade-gate-v1",
        previous_context_window: Number(previousCapacity.contextWindow || 0),
        current_context_window: Number(modelContextCapacity.contextWindow || 0),
        previous_evidence_checksum: String(previousCapacity.evidenceChecksum || ""),
        current_evidence_checksum: String(modelContextCapacity.evidenceChecksum || ""),
        action: "recompact_before_dispatch",
        generated_at: new Date().toISOString(),
    } : null;
    const previousPacket = input.workerContextPacket || null;
    const rebuiltPacket = !previousPacket || memoryContext ? (0, runtime_kernel_1.buildWorkerContextPacket)({
        group: input.group,
        project,
        task,
        agentType: input.agentType,
        analysis: {
            ...analysis,
            summary: userGoal,
            documentFindings,
            constraints,
        },
        traceId: input.traceId,
        taskId: input.taskId,
        dependencies: dependencies.length ? dependencies : previousPacket?.dependencies,
        contractInjections: input.contractInjections?.length ? input.contractInjections : previousPacket?.contract_injections,
        replayRepairDispatchBriefs: previousPacket?.replay_repair_dispatch_briefs,
        cleanupCommitRepairContext: previousPacket?.cleanup_commit_repair_context,
        memory: memoryContext,
        pressureMemoryProvenanceReceiptDiscipline: previousPacket?.pressure_memory_provenance_receipt_discipline,
        pressureProvenanceDispatchFeedbackPolicy: previousPacket?.pressure_provenance_dispatch_feedback_policy,
        pressureProvenanceProviderDispatchAdvisory: previousPacket?.pressure_provenance_provider_dispatch_advisory,
        pressureProvenanceProviderDispatchOverrideFollowupReceiptContract: previousPacket?.pressure_provenance_provider_dispatch_override_followup_receipt_contract,
        providerRankingCompactRepairReceiptMemoryContract: previousPacket?.provider_ranking_compact_repair_receipt_memory_contract,
        postCompactReinjectionRepairReceiptMemoryContract: previousPacket?.post_compact_reinjection_repair_receipt_memory_contract,
        providerSwitchDecisionReceipt: previousPacket?.provider_switch_decision_receipt,
        modelContextCapacity,
        contextUsageOptions,
        verification: {
            ...(previousPacket?.verification || {}),
            hints: verificationHints,
            acceptance,
            requires_code_changes: input.requiresCodeChanges !== false,
        },
    }) : null;
    let workerContextPacket = previousPacket && rebuiltPacket ? {
        ...previousPacket,
        ...rebuiltPacket,
        packet_id: `wcp_${hash([previousPacket.packet_id || "", rebuiltPacket.packet_id || "", "current-memory-rebound"], 14)}`,
        capacity_downgrade_gate: capacityDowngradeGate,
        memory_context_rebound: {
            schema: "ccm-worker-context-current-memory-rebound-v1",
            previous_packet_id: String(previousPacket.packet_id || ""),
            rebuilt_packet_id: String(rebuiltPacket.packet_id || ""),
            group_id: String(rebuiltPacket.group?.id || ""),
            group_session_id: String(rebuiltPacket.group_session_id || ""),
            task_id: String(rebuiltPacket.task_id || ""),
            task_agent_session_id: String(rebuiltPacket.task_agent_session_id || ""),
            reason: "current_assignment_memory_must_rebind_prebuilt_packet",
        },
    } : previousPacket ? {
        ...input.workerContextPacket,
        packet_id: `wcp_${hash([input.workerContextPacket.packet_id || "", modelContextCapacity.evidenceChecksum || modelContextCapacity.source, modelContextCapacity.contextWindow], 14)}`,
        model_context_capacity: modelContextCapacity,
        capacity_downgrade_gate: capacityDowngradeGate,
    } : rebuiltPacket;
    workerContextPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)(workerContextPacket, contextUsageOptions);
    if (typedMemoryCapacityRebudget.rebuilt === true) {
        workerContextPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
            ...workerContextPacket,
            typed_memory_capacity_rebudget: {
                schema: "ccm-worker-typed-memory-capacity-rebudget-v1",
                previous_model_context_window: typedMemoryCapacityRebudget.previous_model_context_window,
                current_model_context_window: typedMemoryCapacityRebudget.current_model_context_window,
                previous_capsule_checksum: typedMemoryCapacityRebudget.previous_capsule_checksum,
                current_capsule_checksum: typedMemoryCapacityRebudget.current_capsule_checksum,
                delivery_lease_id: typedMemoryCapacityRebudget.lease?.lease_id || "",
            },
        }, contextUsageOptions);
    }
    const overNewBudget = ["critical", "over_budget"].includes(String(workerContextPacket.context_usage?.status || ""));
    if ((capacityDowngrade || overNewBudget) && workerContextPacket.memory) {
        const compacted = (0, runtime_kernel_1.compactWorkerContextMemoryForRetry)(workerContextPacket.memory, {
            maxRenderedChars: capacityDowngrade ? 2200 : 3000,
            maxRecallItems: capacityDowngrade ? 5 : 8,
        });
        if (compacted.compacted) {
            workerContextPacket = (0, runtime_kernel_1.refreshWorkerContextPacketUsage)({
                ...workerContextPacket,
                memory: compacted.memory,
                context_compaction_retry: {
                    schema: "ccm-worker-context-capacity-downgrade-recompact-v1",
                    retry_id: `capacity-recompact:${workerContextPacket.packet_id}`,
                    method: "memory_first_capacity_revalidation",
                    memory_first: true,
                    reason: capacityDowngrade ? "trusted_model_capacity_decreased" : "worker_packet_exceeds_current_model_capacity",
                    previous_context_window: Number(previousCapacity?.contextWindow || 0),
                    current_context_window: Number(modelContextCapacity.contextWindow || 0),
                    memory_compaction: compacted.summary,
                    generated_at: new Date().toISOString(),
                },
            }, contextUsageOptions);
        }
    }
    const communicationEnvelope = input.communicationEnvelope ? {
        schema: "ccm-agent-communication-envelope-v2",
        messageId: String(input.communicationEnvelope.messageId || ""),
        correlationId: String(input.communicationEnvelope.correlationId || ""),
        taskId: String(input.communicationEnvelope.taskId || input.taskId || ""),
        workItemId: String(input.communicationEnvelope.workItemId || input.taskId || ""),
        scope: String(input.communicationEnvelope.scope || ""),
        scopeId: String(input.communicationEnvelope.scopeId || ""),
        exactSessionId: String(input.communicationEnvelope.exactSessionId || ""),
        generation: Number(input.communicationEnvelope.generation || 0),
        attempt: Math.max(1, Number(input.communicationEnvelope.attempt || 1)),
        leaseId: String(input.communicationEnvelope.leaseId || ""),
        senderAgentId: String(input.communicationEnvelope.senderAgentId || ""),
        receiverAgentId: String(input.communicationEnvelope.receiverAgentId || ""),
        deadlineAt: String(input.communicationEnvelope.deadlineAt || ""),
        payloadChecksum: String(input.communicationEnvelope.payloadChecksum || ""),
        contentStored: false,
    } : null;
    const assignedStepIds = assignedWorkItems.map(item => String(item.stepId || "")).filter(Boolean);
    const assignedAcceptanceCriterionIds = [...new Set(assignedWorkItems.flatMap(item => item.acceptanceCriterionIds || []))];
    const planBinding = {
        ...(String(input.planId || dispatchContract?.planId || "").trim() ? { planId: String(input.planId || dispatchContract?.planId || "").trim() } : {}),
        ...(Number(input.planRevision || dispatchContract?.planRevision || 0) > 0 ? { planRevision: Number(input.planRevision || dispatchContract?.planRevision || 0) } : {}),
        ...(String(input.planChecksum || dispatchContract?.planChecksum || "").trim() ? { planChecksum: String(input.planChecksum || dispatchContract?.planChecksum || "").trim() } : {}),
        ...(String(input.sourceManifestChecksum || dispatchContract?.sourceManifestChecksum || "").trim() ? { sourceManifestChecksum: String(input.sourceManifestChecksum || dispatchContract?.sourceManifestChecksum || "").trim() } : {}),
        ...(String(input.contractChecksum || selectedWorkItem?.contractChecksum || dispatchContract?.contractChecksum || "").trim() ? { contractChecksum: String(input.contractChecksum || selectedWorkItem?.contractChecksum || dispatchContract?.contractChecksum || "").trim() } : {}),
        ...(String(input.workItemId || selectedWorkItem?.workItemId || "").trim() ? { workItemId: String(input.workItemId || selectedWorkItem?.workItemId || "").trim() } : {}),
        ...(String(selectedWorkItem?.requirementId || dispatchContract?.requirementId || "").trim() ? { requirementId: String(selectedWorkItem?.requirementId || dispatchContract?.requirementId || "").trim() } : {}),
        ...(Number(selectedWorkItem?.requirementRevision || dispatchContract?.requirementRevision || 0) > 0 ? { requirementRevision: Number(selectedWorkItem?.requirementRevision || dispatchContract?.requirementRevision || 0) } : {}),
        ...(String(selectedWorkItem?.requirementChecksum || dispatchContract?.requirementChecksum || "").trim() ? { requirementChecksum: String(selectedWorkItem?.requirementChecksum || dispatchContract?.requirementChecksum || "").trim() } : {}),
        ...(String(selectedWorkItem?.stepId || "").trim() ? { stepId: String(selectedWorkItem?.stepId || "").trim() } : {}),
        ...(assignedStepIds.length ? { stepIds: assignedStepIds } : {}),
        ...(assignedAcceptanceCriterionIds.length ? { acceptanceCriterionIds: assignedAcceptanceCriterionIds } : {}),
        contentStored: false,
    };
    const boundCommunicationEnvelope = communicationEnvelope ? {
        ...communicationEnvelope,
        ...(planBinding.planId ? { planId: planBinding.planId } : {}),
        ...(planBinding.planRevision ? { planRevision: planBinding.planRevision } : {}),
        ...(planBinding.planChecksum ? { planChecksum: planBinding.planChecksum } : {}),
        ...(planBinding.contractChecksum ? { contractChecksum: planBinding.contractChecksum } : {}),
        ...(planBinding.sourceManifestChecksum ? { sourceManifestChecksum: planBinding.sourceManifestChecksum } : {}),
        ...(planBinding.requirementId ? { requirementId: planBinding.requirementId } : {}),
        ...(planBinding.requirementRevision ? { requirementRevision: planBinding.requirementRevision } : {}),
        ...(planBinding.requirementChecksum ? { requirementChecksum: planBinding.requirementChecksum } : {}),
        ...(planBinding.stepId ? { stepId: planBinding.stepId } : {}),
        ...(planBinding.stepIds ? { stepIds: planBinding.stepIds } : {}),
    } : null;
    const assignedWorkItemContracts = assignedWorkItems.map(item => ({
        title: item.title,
        objective: item.objective,
        businessGoal: item.businessGoal,
        requirementId: item.requirementId,
        requirementRevision: item.requirementRevision,
        requirementChecksum: item.requirementChecksum,
        planRevision: item.planRevision,
        planChecksum: item.planChecksum,
        stepId: item.stepId,
        project: item.project,
        files: item.files,
        dependsOn: item.dependsOn,
        parallelGroup: item.parallelGroup,
        allowedTools: item.allowedTools,
        forbiddenPaths: item.forbiddenPaths,
        constraints: item.constraints,
        exclusions: item.exclusions,
        acceptanceCriterionIds: item.acceptanceCriterionIds,
        acceptance: item.acceptance,
        verification: item.verification,
        worktree: item.worktree,
        executor: item.executor,
        timeoutMs: item.timeoutMs,
        maxAttempts: item.maxAttempts,
        contentStored: false,
    }));
    const handoff = {
        schema: "ccm-self-contained-worker-handoff-v2",
        handoff_id: `wh_${hash([project, task, input.traceId, input.taskId, workerContextPacket?.packet_id], 16)}`,
        project,
        source: String(input.source || "main Agent dispatch").trim(),
        reason: String(input.reason || "main Agent dispatch based on the user goal and project responsibility").trim(),
        user_goal: userGoal,
        task,
        work_dir: String(input.workDir || "").trim(),
        agent_type: String(input.agentType || "").trim(),
        communication_envelope: boundCommunicationEnvelope,
        worker_context_packet: workerContextPacket,
        plan_binding: planBinding,
        work_item_contract: assignedWorkItemContracts[0] || null,
        assigned_work_item_contracts: assignedWorkItemContracts,
        semantic_contract_binding: assignedWorkItems.length ? {
            requirementChecksum: selectedWorkItem?.requirementChecksum || dispatchContract?.requirementChecksum || "",
            planChecksum: selectedWorkItem?.planChecksum || dispatchContract?.planChecksum || "",
            stepId: assignedStepIds[0] || "",
            stepIds: assignedStepIds,
            acceptanceCriterionIds: assignedAcceptanceCriterionIds,
            contentStored: false,
        } : null,
        scope: {
            allowed: allowedScope.length ? allowedScope : [
                project ? `Work only within the ${project} responsibility and current work directory` : "Work only within the explicit scope of this work item",
                "Make only the minimum changes required to satisfy the goal",
            ],
            forbidden: forbiddenScope.length ? forbiddenScope : [
                "Do not modify unrelated modules",
                "Do not revert or overwrite existing user changes",
                "Do not invent unexecuted verification, file changes, or dependency conclusions",
            ],
            expected_files: expectedFiles,
            dependencies,
            continuation: input.continuation || null,
            advisory_only: input.advisoryOnly === true,
        },
        references: {
            document_findings: documentFindings,
            constraints,
            memory_context: memoryContext,
            memory_summary: memoryEntryTransport.mode === "delta"
                ? `per-entry delta: changed=${memoryEntryTransport.plan?.changed_entry_count || 0}; removed=${memoryEntryTransport.plan?.removed_entry_count || 0}; manifest=${memoryEntryTransport.plan?.current_manifest?.manifest_checksum || ""}`
                : memoryEntryTransport.mode === "continuation"
                    ? `native continuation baseline: manifest=${memoryEntryTransport.plan?.current_manifest?.manifest_checksum || ""}`
                    : memoryContext ? extractMemoryText(memoryContext, 1000) : "",
            contract_injections: Array.isArray(workerContextPacket?.contract_injections) ? workerContextPacket.contract_injections : [],
            memory_freshness_gate: memoryFreshnessGate,
            post_compact_reinjection_gate: postCompactReinjectionGate,
            post_compact_dispatch_marker: postCompactDispatchMarker,
            read_plan_revalidation_gate: readPlanRevalidationGate,
            global_memory_health_gate: globalMemoryHealthGate,
            api_microcompact_native_apply_plan: apiMicrocompactNativeApplyPlan,
        },
        verification: {
            required: input.requiresCodeChanges === false ? "说明产出和人工核验依据" : "运行与改动范围匹配的最小必要验证",
            hints: verificationHints,
            acceptance,
        },
        done_criteria: doneCriteria.length ? doneCriteria : [
            input.requiresCodeChanges === false ? "说明无需代码变更的原因、产出和依据" : "产生真实可捕获的文件/配置/文档变更",
            "回执列出实际执行动作、涉及文件、验证结果和仍有风险",
            "如有阻塞，明确需要谁补充什么，不能把阻塞写成完成",
        ],
        ack_gate: {
            required: true,
            fields: ["requirementChecksum", "planChecksum", "stepId", "stepIds", "understoodGoal", "acceptanceCriterionIds", "plannedScope", "forbiddenScope", "verificationPlan", "unclear"],
            rule: communicationEnvelope
                ? "实现或写入前必须通过 ccm__agent_communication.acknowledge_assignment 提交ACK；随后按心跳周期报告，最后只能 submit_result，正式终态由 CCM 验收生成。"
                : "实现或写入前必须先确认目标、范围、禁止范围和验证计划；不清楚时先 blocked/needs_info。",
        },
        receipt_schema: {
            marker: "CCM_AGENT_RECEIPT",
            required_fields: ["status", "summary", "actions", "filesChanged", "verification", "verificationResults", "blockers", "needs", "advisoryNeeds", "ack", "contractChanges", "consumedInjectionIds", "memoryUsed", "memoryIgnored", "typedMemoryUsage", "memoryContextUsage", "memoryFactCitations", "replayRepairDispatchBriefUsage", "apiMicrocompactUsage", "apiMicrocompactNativeApplyRequestTelemetry", "postCompactCandidateUsage"],
            status_values: ["done", "partial", "blocked", "failed", "needs_info"],
        },
        user_summary: {
            label: "工作单已补齐",
            text: "主 Agent 已把目标、范围、边界、验收和回执要求打包给子 Agent。",
            completeness: {
                has_goal: !!userGoal,
                has_scope: true,
                has_done_criteria: true,
                has_receipt_schema: true,
                has_ack_gate: true,
                has_agent_communication_v2: !!communicationEnvelope,
                has_memory_freshness_gate: !!memoryFreshnessGate,
                has_post_compact_reinjection_gate: !!postCompactReinjectionGate,
                has_post_compact_dispatch_marker: !!postCompactDispatchMarker,
                has_read_plan_revalidation_gate: !!readPlanRevalidationGate,
                has_global_memory_health_gate: !!globalMemoryHealthGate,
                has_api_microcompact_native_apply_plan: !!apiMicrocompactNativeApplyPlan,
            },
        },
    };
    return handoff;
}
function renderReceiptSchemaForWorker(handoff) {
    const fields = handoff?.receipt_schema?.required_fields || [];
    const providerRankingContract = handoff?.worker_context_packet?.provider_ranking_compact_repair_receipt_memory_contract
        || handoff?.worker_context_packet?.providerRankingCompactRepairReceiptMemoryContract
        || null;
    const postCompactReinjectionRepairReceiptMemoryContract = handoff?.worker_context_packet?.post_compact_reinjection_repair_receipt_memory_contract
        || handoff?.worker_context_packet?.postCompactReinjectionRepairReceiptMemoryContract
        || null;
    const memoryRecallTrustContract = handoff?.worker_context_packet?.memory_recall_trust_contract
        || handoff?.worker_context_packet?.memoryRecallTrustContract
        || null;
    return [
        "CCM_AGENT_RECEIPT JSON：",
        "这是返回给 CCM 的输出协议，不是项目文件。只能在最终响应或 ccm__agent_communication.submit_result 中返回；除非 Allowed scope 明确授权对应路径，否则禁止创建 CCM_AGENT_RECEIPT.md、ccm_agent_receipt.md 或任何其他回执文件。",
        "```json",
        JSON.stringify({
            ccm_receipt: true,
            status: "done | partial | blocked | failed | needs_info",
            summary: "一句话说明实际完成/确认了什么",
            task_agent_session_id: "本轮 CCM task Agent session id；如果工作包未提供则填空字符串",
            native_session_id: "第三方 CLI/IDE 原生 session id；没有则填空字符串",
            actions: ["实际执行的动作"],
            filesChanged: ["修改过的文件路径；没有修改填空数组"],
            verification: ["仅用于展示的验证名称或命令；不能编造未运行的测试"],
            verificationResults: [{ name: "检查名称", command: "实际执行命令；非命令检查可为空", status: "passed | failed | blocked | skipped | not_run", exitCode: 0, source: "agent | ccm_runner | browser | http", evidence: ["真实证据引用"] }],
            ack: {
                understoodGoal: "你理解的目标",
                plannedScope: ["准备处理的范围"],
                forbiddenScope: ["不会触碰的范围"],
                verificationPlan: ["计划或已执行的验证"],
                unclear: ["仍不清楚的问题；没有填空数组"],
            },
            contractChanges: ["如涉及接口/字段/schema/路由/类型/配置变化，改为对象数组；没有填空数组"],
            consumedInjectionIds: ["消费的 injection_id；没有填空数组"],
            memoryUsed: ["实际使用的记忆/文档/知识库；未使用填空数组"],
            memoryIgnored: ["没有使用或无法使用记忆的原因；没有填空数组"],
            typedMemoryUsage: [{
                    relPath: "本轮 WorkerContextPacket 中 surfaced MEMORY.md 的相对路径；每个 relPath 都要覆盖",
                    usageState: "used | verified | ignored",
                    currentSourceVerified: false,
                    currentSourceEvidence: {
                        evidenceType: "file_read",
                        sourcePath: "本轮实际重读的项目内文件路径",
                        sourceChecksum: "当前文件完整 SHA-256；CCM 会重新读取并复算",
                    },
                    conflictDetected: false,
                    conflictKind: "removed | renamed | behavior_changed | resource_changed；没有冲突填空字符串",
                    recommendedMemoryAction: "update | remove；没有冲突填空字符串",
                    conflictReason: "当前源码与该记忆冲突的具体原因；没有冲突填空字符串",
                    replacementMemory: "recommendedMemoryAction=update 时填写候选新规则；否则填空字符串",
                    reason: "说明采用、核验或忽略原因；ignored 必须写原因",
                }],
            memoryContextUsage: {
                bindingId: "上下文中的 session_binding.binding_id；没有则填空字符串",
                groupSessionId: "上下文中的 group_session_id；没有则填空字符串",
                sessionMemoryChecksum: "CC 风格 Session Memory markdown checksum；尚未初始化则填空字符串",
                modelExtractionExecutionId: "Session Memory 模型提取 execution id；没有则填空字符串",
                modelExtractionReplayStatus: "Session Memory 模型提取 replay status；没有则填空字符串",
                factSupersessionGraphChecksum: "Session Memory 事实替代图 checksum；没有则填空字符串",
                usageState: "used | verified | ignored",
                reason: "说明本轮如何使用或为什么忽略所属群聊会话记忆",
            },
            memoryFactCitations: [{
                    evidenceId: "sessionMemorySectionEvidence 中的 evidenceId；未使用 Session Memory 时填空数组",
                    section: "所使用的 Session Memory 章节名",
                    sectionChecksum: "该章节的 sectionChecksum",
                    sourceTranscriptChecksum: "该章节证据绑定的 sourceTranscriptChecksum",
                    sourceMessageIds: ["实际支持本条使用判断的 source message id；必须来自该章节允许列表"],
                    factId: "引用 active fact 时填写交付投影中的 factId；未引用 active fact 填空字符串",
                    factChecksum: "引用 active fact 时填写交付投影中的 factChecksum；未引用 active fact 填空字符串",
                    usage: "这条章节记忆具体影响了哪个判断、修改或验证",
                }],
            providerSwitchExecution: {
                decisionReceiptId: "Provider switch decision receipt id；没有 approved switch 填空字符串",
                expectedProvider: "approved new provider；没有填空字符串",
                executedProvider: "本轮实际执行 provider；没有填空字符串",
                taskAgentSessionId: "必须与本轮 task_agent_session_id 一致",
                nativeSessionId: "必须与本轮 native_session_id 一致；没有填空字符串",
                executionId: "本轮 execution id；没有填空字符串",
                usageState: "executed | mismatch | not_applicable",
                reason: "说明实际 runner 是否与 approved switch 一致",
            },
            memoryProvenanceUsage: [{
                    relPath: "typed MEMORY.md relPath；没有填空字符串",
                    name: "typed memory name；没有填空字符串",
                    usageState: "used | verified | ignored | mentioned",
                    provenanceStatus: "local_group_evidence | cross_group_project_assist | disputed_under_repair | stale_evidence_under_repair",
                    repairWorkItemId: "pressure repair work_item_id；没有填空字符串",
                    repairStatus: "pending | in_progress | blocked | completed | cancelled | empty",
                    repairGapType: "recommendation_conflict | stale_cross_group_only | empty",
                    currentSourceVerified: false,
                    reason: "说明如何使用/忽略该记忆，以及是否因 repair provenance 降权",
                }],
            replayRepairDispatchBriefUsage: [{
                    briefId: "Replay repair brief id；没有此 brief 填空字符串",
                    workItemId: "Replay repair work_item_id；没有此 brief 填空字符串",
                    usageState: "used | verified | ignored | blocked | strong",
                    providerReproofStatus: "needed | strong | blocked | ignored",
                    requestPatchChecksum: "API microcompact provider request patch checksum；没有填空字符串",
                    runnerRequestId: "runner request id；没有填空字符串",
                    reason: "说明本轮如何使用/忽略/阻塞该 replay repair brief",
                }],
            globalMemoryUsage: [{
                    globalMemoryId: "使用/忽略/核验过的 global_memory_id；没有全局记忆填空字符串",
                    usageState: "used | ignored | verified | background | advisory",
                    currentSourceVerified: false,
                    semanticRiskAcknowledged: false,
                    crossGroupSuppression: "background_only | advisory | none",
                    reason: "说明该全局记忆如何被使用、忽略或仅作背景",
                }],
            readPlanRevalidationUsage: [{
                    gateId: "读取计划重读 gate id；没有此 gate 填空字符串",
                    readPlanId: "stale read_plan_id；没有此 gate 填空字符串",
                    currentSourceVerified: true,
                    taskAgentSessionId: "必须与工作包 session_binding.task_agent_session_id 一致；没有则填空字符串",
                    nativeSessionId: "必须与工作包 session_binding.native_session_id 一致；没有则填空字符串",
                    reason: "已重读当前源，或说明未使用该 stale read plan",
                }],
            apiMicrocompactUsage: [{
                    planChecksum: "API microcompact edit plan checksum；没有此计划填空字符串",
                    applyPlanChecksum: "native apply plan checksum；advisory/不支持时可填空字符串",
                    requestPatchChecksum: "真实合并 provider requestPatch 后的 checksum；未 native_applied 时填空字符串",
                    usageState: "native_applied | advisory | ignored | not_supported",
                    nativeApplied: false,
                    advisoryOnly: true,
                    taskAgentSessionId: "必须与工作包 session_binding.task_agent_session_id 一致；没有则填空字符串",
                    nativeSessionId: "必须与工作包 session_binding.native_session_id 一致；没有则填空字符串",
                    memoryContextSnapshotId: "必须与本轮 memory_context_snapshot_id 一致；没有则填空字符串",
                    memoryContextSnapshotChecksum: "必须与本轮 memory_context_snapshot_checksum 一致；没有则填空字符串",
                    reason: "说明是否原生应用 API context-management；第三方 CLI 不支持时写 advisory 或 not_supported",
                }],
            apiMicrocompactNativeApplyRequestTelemetry: [{
                    planChecksum: "native_applied 的 API microcompact edit plan checksum；未 native_applied 时填空字符串",
                    applyPlanChecksum: "native apply plan checksum；未 native_applied 时填空字符串",
                    requestPatchChecksum: "真实合并 provider requestPatch 后的 checksum；未 native_applied 时填空字符串",
                    requestBodyChecksum: "发给 provider 的请求体稳定 checksum；不要粘贴完整请求体",
                    hasContextManagement: true,
                    betaHeaders: ["context-management-2025-06-27"],
                    provider: "anthropic | openai-compatible | other",
                    model: "实际请求模型；未知填空字符串",
                    endpoint: "provider endpoint；可脱敏",
                    method: "POST",
                    responseStatus: 200,
                    requestId: "provider request id / trace id；没有填空字符串",
                    taskAgentSessionId: "必须与 apiMicrocompactUsage 一致",
                    nativeSessionId: "必须与 apiMicrocompactUsage 一致",
                    memoryContextSnapshotId: "必须与 apiMicrocompactUsage 一致",
                    memoryContextSnapshotChecksum: "必须与 apiMicrocompactUsage 一致",
                    sentAt: "ISO 时间；真实发送 API 请求的时间",
                    telemetrySource: "native_request_adapter | agent_receipt",
                }],
            postCompactCandidateUsage: [{
                    gateId: "压缩后重注入 gate id；没有此 gate 填空字符串",
                    candidateId: "candidate_id",
                    usageState: "used | ignored | verified",
                    reason: "为什么使用、忽略或仅核验",
                }],
            blockers: ["阻塞点；没有填空数组"],
            needs: ["会阻塞任务、需要用户或其他 Agent 补充的内容；没有填空数组"],
            advisoryNeeds: ["不阻塞交付的可选建议；没有填空数组"],
        }, null, 2),
        "```",
        fields.length ? `必须包含字段：${fields.join("、")}` : "",
        "如果工作包包含 global_memory_id、semantic_risk 或 cross_group_suppression，回执 globalMemoryUsage 必须逐条声明该全局记忆是 used / ignored / verified / background / advisory；风险记忆若被使用必须声明 currentSourceVerified=true。",
        memoryRecallTrustContract?.receipt_required === true
            ? `本工作包包含 Memory recall trust contract；CCM_AGENT_RECEIPT.typedMemoryUsage 必须逐条覆盖 ${(memoryRecallTrustContract.required_rel_paths || []).join("、") || "所有 surfaced MEMORY.md"}。used/verified 必须提交可由平台复算的 currentSourceEvidence；ignored 必须写 reason。陈旧记忆 ${(memoryRecallTrustContract.stale_rel_paths || []).join("、") || "无"} 不得直接当作当前事实。若当前源码与记忆冲突，必须填写 conflictDetected/conflictKind/recommendedMemoryAction/conflictReason；update 还必须填写 replacementMemory。子 Agent 只能提交候选，不能直接改写或删除长期记忆。`
            : "",
        "如果工作包包含 global_memory_health_gate，回执 memoryUsed/memoryIgnored 必须引用 gate_id；当 gate status=fail 或 action=block_global_agent_memory_recall 时，必须在 memoryIgnored 说明未使用全局记忆，且不得在 globalMemoryUsage 声明 used。",
        "如果工作包或平台记忆出现 pressure repair / provenance / disputed_under_repair / stale_evidence_under_repair，回执 memoryProvenanceUsage 必须逐条声明 relPath、usageState、provenanceStatus、repairWorkItemId；若使用 disputed 记忆，必须 currentSourceVerified=true。",
        "如果工作包包含 Replay repair dispatch brief，回执 replayRepairDispatchBriefUsage 必须逐条引用 briefId/workItemId，并声明 used/verified/ignored/blocked/strong；provider re-proof 不能只靠口头 strong，仍需 native provider proof ledger 证明。",
        providerRankingContract?.active === true
            ? `如果工作包包含 Provider ranking compact repair receipt memory usage contract，回执 memoryUsed/memoryIgnored 必须引用 ${providerRankingContract.doc_rel_path || providerRankingContract.docRelPath || "provider-ranking-provenance-compact-repair-receipt-memory.md"}，并声明 used/verified/ignored/background；该历史只作 ranking evidence，不是 provider switch authorization，新的切换仍需 fresh valid provider switch decision receipt。`
            : "",
        postCompactReinjectionRepairReceiptMemoryContract?.active === true
            ? `如果工作包包含 Post-compact reinjection repair receipt memory usage contract，回执 memoryUsed/memoryIgnored 必须逐条引用 ${(postCompactReinjectionRepairReceiptMemoryContract.memory_receipt_required_doc_rel_paths || postCompactReinjectionRepairReceiptMemoryContract.doc_rel_paths || []).join("、") || "post-compact-reinjection-repair-receipt-memory.md"}；used/verified 必须 currentSourceVerified=true，ignored 必须写 reason；历史完成只作 recovery evidence，不是永久新鲜的仓库事实。`
            : "",
        postCompactReinjectionRepairReceiptMemoryContract?.corrected_receipt_completion_memory_active === true
            ? `如果包含 corrected-receipt completion memory，历史 original/repair task/native session 只作证据，不能替代当前会话；本轮回执必须绑定当前 task/native session，并逐条声明 ${(postCompactReinjectionRepairReceiptMemoryContract.corrected_receipt_completion_doc_rel_paths || []).join("、") || "post-compact-receipt-memory-usage-repair-completions.md"} 的 memoryUsed 或 memoryIgnored。`
            : "",
        "如果存在 read_plan_revalidation_gate，memoryUsed/memoryIgnored 或 readPlanRevalidationUsage 必须同时引用 gateId、readPlanId，并声明 currentSourceVerified=true；回执 session id 必须匹配工作包 session_binding。",
        "如果存在 API microcompact edit plan，回执 apiMicrocompactUsage 或 memoryUsed/memoryIgnored 必须引用 planChecksum，并声明 usageState=native_applied/advisory/ignored/not_supported；apiMicrocompactUsage 应绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；第三方 CLI 未实际调用 native API context-management 时不得声明 native_applied。",
        "回执 memoryContextUsage 必须由子 Agent 自己填写：原样回传上下文里的 session_binding.binding_id、group_session_id、Session Memory checksum、model extraction execution/replay status 和 fact supersession graph checksum，并声明 used/verified/ignored；这些字段不能由 CCM 在执行后代填，ignored 也必须绑定同一份交付证据。",
        "当 memoryContextUsage.usageState=used 或 verified 且上下文提供 sessionMemorySectionEvidence 时，memoryFactCitations 必须至少逐条引用一个真实 evidenceId，并原样回传 sectionChecksum/sourceTranscriptChecksum；证据含 sourceMessageIds 时还必须选择至少一个真实消息 ID，说明该章节如何影响本轮工作；引用 active fact 时还必须原样回传 factId/factChecksum，已被替代事实不会被接受；ignored 时必须为空数组。",
        "如果工作包包含 Provider switch decision receipt，回执 providerSwitchExecution 必须引用 decisionReceiptId，并声明 expectedProvider、executedProvider、taskAgentSessionId、nativeSessionId、executionId；CCM 会用实际 runner/session 做系统见证，字段不一致时该切换不能视为已执行。",
    ].filter(Boolean).join("\n");
}
function renderSelfContainedWorkerHandoff(handoff) {
    const packetText = (0, runtime_kernel_1.renderWorkerContextPacket)(handoff?.worker_context_packet || {});
    const dependencies = Array.isArray(handoff?.scope?.dependencies) && handoff.scope.dependencies.length
        ? handoff.scope.dependencies.map((item) => `- ${item.project || "依赖"}：${item.reason || "前置依赖"}`).join("\n")
        : "- 无明确前置依赖；按本工作单独立推进。";
    const contractInjections = Array.isArray(handoff?.references?.contract_injections) && handoff.references.contract_injections.length
        ? handoff.references.contract_injections.map((item) => `- injection_id=${item.injection_id}；${item.endpoint || "contract"}；${item.summary || ""}`).join("\n")
        : "- 无 contract injection。";
    const sourceMemoryContext = handoff?.references?.memory_context || handoff?.worker_context_packet?.memory || null;
    const memoryContext = renderMemoryContextForWorker(sourceMemoryContext);
    const trustedMemoryEnvelope = (0, trusted_memory_prompt_envelope_1.renderTrustedMemoryPromptEnvelope)(memoryContext, sourceMemoryContext);
    const memoryFreshnessGate = renderMemoryFreshnessGate(handoff?.references?.memory_freshness_gate || extractMemoryFreshnessGate(handoff?.worker_context_packet?.memory || null));
    const postCompactReinjectionGate = renderPostCompactReinjectionGate(handoff?.references?.post_compact_reinjection_gate || extractPostCompactReinjectionGate(handoff?.worker_context_packet?.memory || null));
    const postCompactDispatchMarker = renderPostCompactDispatchMarker(handoff?.references?.post_compact_dispatch_marker || extractPostCompactDispatchMarker(handoff?.worker_context_packet?.memory || null));
    const readPlanRevalidationGate = renderReadPlanRevalidationGate(handoff?.references?.read_plan_revalidation_gate || extractReadPlanRevalidationGate(handoff?.worker_context_packet?.memory || null));
    const globalMemoryHealthGate = renderGlobalMemoryHealthGate(handoff?.references?.global_memory_health_gate || extractGlobalMemoryHealthGate(handoff?.worker_context_packet?.memory || null));
    const apiMicrocompactNativeApplyPlan = renderApiMicrocompactNativeApplyPlan(handoff?.references?.api_microcompact_native_apply_plan || extractApiMicrocompactNativeApplyPlan(handoff?.worker_context_packet?.memory || null));
    return [
        "[CCM self-contained worker work package]",
        `schema: ${handoff?.schema || "ccm-self-contained-worker-handoff-v1"}`,
        `handoff_id: ${handoff?.handoff_id || ""}`,
        handoff?.communication_envelope?.messageId ? `communication_message_id: ${handoff.communication_envelope.messageId}` : "",
        "",
        "Principle: you do not have the complete user or main-Agent conversation. The content below is the complete context required for this assignment. Do not replace understanding with vague historical references; state your actual interpretation, actions, and evidence.",
        "",
        packetText,
        "",
        "Business requirement (authoritative; do not rewrite):",
        compact(handoff?.user_goal || handoff?.task || "", 1000),
        handoff?.plan_binding?.requirementId ? `- requirement: ${handoff.plan_binding.requirementId} revision=${handoff.plan_binding.requirementRevision} checksum=${handoff.plan_binding.requirementChecksum}` : "",
        ...(handoff?.work_item_contract?.constraints || []).map((item) => `- constraint: ${compact(item, 500)}`),
        ...(handoff?.work_item_contract?.exclusions || []).map((item) => `- excluded: ${compact(item, 500)}`),
        "",
        "Why this is assigned to you:",
        `- source: ${handoff?.source || "main Agent dispatch"}`,
        `- reason: ${handoff?.reason || "your project responsibility matches this work item"}`,
        handoff?.work_dir ? `- work directory: ${handoff.work_dir}` : "",
        handoff?.agent_type ? `- executor: ${handoff.agent_type}` : "",
        "",
        "Assigned plan steps (execute only the slices assigned to this project):",
        ...(handoff?.assigned_work_item_contracts?.length ? handoff.assigned_work_item_contracts : handoff?.work_item_contract ? [handoff.work_item_contract] : []).flatMap((item) => [
            `- step_id: ${item.stepId}`,
            `  title: ${compact(item.title, 240)}`,
            `  objective: ${compact(item.objective, 1800)}`,
            ...(item.acceptance || []).map((criterion, index) => `  acceptance[${item.acceptanceCriterionIds?.[index] || index + 1}]: ${compact(criterion, 800)}`),
        ]),
        handoff?.plan_binding?.planId ? "\nPlan dispatch binding:\n" + JSON.stringify(handoff.plan_binding) : "",
        handoff?.assigned_work_item_contracts?.length ? "\nCurrent assigned work-item contracts:\n" + JSON.stringify(handoff.assigned_work_item_contracts) : "",
        "",
        renderContinuationForWorker(handoff?.scope?.continuation || null),
        "",
        "Allowed scope:",
        ...(handoff?.scope?.allowed || []).map((item) => `- ${item}`),
        "",
        "Forbidden scope:",
        ...(handoff?.scope?.forbidden || []).map((item) => `- ${item}`),
        "",
        "Dependencies / other Agent outputs:",
        dependencies,
        "",
        "Document / constraint / contract evidence:",
        ...(handoff?.references?.document_findings || []).map((item) => `- ${compact(item, 260)}`),
        ...(handoff?.references?.constraints || []).map((item) => `- user constraint: ${compact(item, 260)}`),
        contractInjections,
        handoff?.references?.memory_summary ? `- memory summary: ${compact(handoff.references.memory_summary, 700)}` : "",
        "",
        "Platform memory / context:",
        memoryFreshnessGate,
        globalMemoryHealthGate,
        apiMicrocompactNativeApplyPlan,
        postCompactReinjectionGate,
        postCompactDispatchMarker,
        readPlanRevalidationGate,
        trustedMemoryEnvelope || "- No platform memory; act only on this work package, files, and current context.",
        "",
        "Completion criteria:",
        ...(handoff?.done_criteria || []).map((item) => `- ${item}`),
        "",
        "Verification requirements:",
        `- ${handoff?.verification?.required || "Run verification that matches the change scope."}`,
        ...(handoff?.verification?.hints || []).map((item) => `- suggested verification: ${item}`),
        ...(handoff?.verification?.acceptance || []).map((item) => `- acceptance criterion: ${item}`),
        "",
        "ACK gate：",
        `- ${handoff?.ack_gate?.rule || "Confirm the goal, scope, and verification plan before implementation."}`,
        `- fields: ${(handoff?.ack_gate?.fields || []).join(", ")}`,
        handoff?.communication_envelope?.messageId
            ? `- 通信身份：task=${handoff.communication_envelope.taskId} workItem=${handoff.communication_envelope.workItemId} session=${handoff.communication_envelope.exactSessionId} generation=${handoff.communication_envelope.generation} attempt=${handoff.communication_envelope.attempt} lease=${handoff.communication_envelope.leaseId}`
            : "",
        handoff?.plan_binding?.requirementChecksum
            ? `- ACK must echo requirement_checksum=${handoff.plan_binding.requirementChecksum}, plan_checksum=${handoff.plan_binding.planChecksum}, primary step_id=${handoff.plan_binding.stepId}, every step_id in step_ids=${JSON.stringify(handoff.plan_binding.stepIds || [handoff.plan_binding.stepId])}, and every acceptance_criterion_id.`
            : "",
        handoff?.communication_envelope?.messageId
            ? "- Use ccm__agent_communication: acknowledge_assignment first; heartbeat/report_progress during execution; request_coordination/request_review when another Agent is needed; submit_result on completion. Third-party Agents must not submit terminal themselves."
            : "",
        "",
        renderReceiptSchemaForWorker(handoff),
    ].filter(line => line !== "").join("\n");
}
function summarizeWorkerHandoffForUser(handoff) {
    return {
        schema: handoff?.schema || "ccm-self-contained-worker-handoff-v1",
        handoff_id: handoff?.handoff_id || "",
        project: handoff?.project || "",
        label: handoff?.user_summary?.label || "工作单已补齐",
        text: handoff?.user_summary?.text || "主 Agent 已补齐子 Agent 的目标、范围和验收要求。",
        packet_id: handoff?.worker_context_packet?.packet_id || "",
        completeness: handoff?.user_summary?.completeness || {},
    };
}
function runWorkerHandoffSelfTest() {
    const handoff = buildSelfContainedWorkerHandoff({
        project: "frontend",
        task: "在工单页面增加负责人筛选，并对接 GET /api/users?role=owner。",
        userGoal: "用户希望工单列表能按负责人筛选。",
        source: "群聊主 Agent",
        reason: "前端页面和接口消费归 frontend 负责",
        workDir: "C:/demo/frontend",
        agentType: "claudecode",
        traceId: "trace-selftest",
        taskId: "task-selftest",
        analysis: {
            documentFindings: ["GET /api/users?role=owner 返回负责人列表"],
            constraints: ["不改后端"],
        },
        dependencies: [{ project: "backend", reason: "接口契约提供方" }],
        contractInjections: [{ source_agent: "backend", target_agent: "frontend", endpoint: "GET /api/users?role=owner", summary: "返回负责人列表" }],
        memory: {
            schema: "ccm-group-memory-context-v1",
            group_id: "group-selftest",
            target_project: "frontend",
            rendered_text: "子 Agent 受控记忆包：历史要求是负责人筛选必须保留权限校验。",
            global_memory_health_gate: {
                schema: "ccm-child-global-agent-memory-health-gate-v1",
                gate_id: "ggmh_worker_handoff_selftest",
                status: "ok",
                action: "allow_global_agent_memory_recall",
                active_contamination_count: 0,
                residue_contamination_count: 0,
            },
            dispatch_freshness_gate: {
                schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
                dispatch_gate_id: "gmd_worker_handoff_selftest",
                status: "fresh_reloaded",
                action: "use_reloaded_context",
                source_manifest: { checksum: "worker-handoff-memory-source" },
                reload_audit: { reason: "memory_source_changed" },
            },
            post_compact_reinjection_gate: {
                schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
                reinjection_gate_id: "pcrg_worker_handoff_selftest",
                status: "required",
                candidate_count: 2,
                candidates: [
                    { candidate_id: "pcrc_worker_file", kind: "file", value: "src/owner-filter.ts" },
                    { candidate_id: "pcrc_worker_verification", kind: "verification", value: "npm run test" },
                ],
                post_compact_recovery_audit: { status: "pass", summary_checksum: "worker-handoff-summary" },
            },
            post_compact_dispatch_marker: {
                schema: "ccm-post-compact-first-dispatch-marker-v1",
                marker_id: "pcfd_worker_handoff_selftest",
                boundary_id: "pcb_worker_handoff_selftest",
                summary_checksum: "worker-handoff-summary",
                first_dispatch_after_compact: true,
                dispatch_sequence: 1,
            },
            compaction: { compactedMessageCount: 12, lastCompactedMessageId: "m12" },
        },
        verificationHints: ["npm run test"],
        acceptance: ["筛选后列表只显示对应负责人"],
        continuation: {
            schema: "ccm-worker-continuation-handoff-v1",
            kind: "revise_goal",
            kind_label: "目标调整",
            route_label: "先停止当前轮再重核计划",
            latest_user_change: "不要继续旧筛选方案，改成只保留负责人字段兼容。",
            current_goal: "只保留负责人字段兼容。",
            previous_goal: "旧筛选方案",
            replan_required: true,
            interrupt_current_run: true,
            instructions: ["以最新用户要求为准", "不要继续已停止执行轮中的旧方向"],
            preserved_context: ["已有验证证据：npm run test"],
            avoid: ["继续当前轮被停止前的旧实现方向"],
        },
    });
    const rendered = renderSelfContainedWorkerHandoff(handoff);
    const checks = {
        schema: handoff.schema === "ccm-self-contained-worker-handoff-v2",
        packet: !!handoff.worker_context_packet?.packet_id && rendered.includes("WorkerContextPacket"),
        selfContainedPrinciple: rendered.includes("you do not have the complete user or main-Agent conversation"),
        goalAndScope: rendered.includes("User goal:") && rendered.includes("Allowed scope:") && rendered.includes("Forbidden scope:"),
        doneAndVerification: rendered.includes("Completion criteria:") && rendered.includes("Verification requirements:"),
        ackAndReceipt: rendered.includes("ACK gate") && rendered.includes("CCM_AGENT_RECEIPT"),
        receiptIsOutputOnly: rendered.includes("不是项目文件") && rendered.includes("禁止创建 CCM_AGENT_RECEIPT.md"),
        dependencyAndInjection: rendered.includes("backend") && rendered.includes("injection_id"),
        memoryContextPreserved: handoff.worker_context_packet?.memory?.schema === "ccm-group-memory-context-v1" && rendered.includes("Platform memory / context:") && rendered.includes("负责人筛选必须保留权限校验"),
        globalMemoryHealthGatePreserved: handoff.references?.global_memory_health_gate?.gate_id === "ggmh_worker_handoff_selftest"
            && rendered.includes("Global Agent memory health gate")
            && rendered.includes("ggmh_worker_handoff_selftest"),
        memoryFreshnessGatePreserved: handoff.references?.memory_freshness_gate?.dispatch_gate_id === "gmd_worker_handoff_selftest"
            && rendered.includes("记忆派发门禁")
            && rendered.includes("memory_source_changed"),
        postCompactReinjectionGatePreserved: handoff.references?.post_compact_reinjection_gate?.reinjection_gate_id === "pcrg_worker_handoff_selftest"
            && rendered.includes("压缩后重注入门禁")
            && rendered.includes("pcrg_worker_handoff_selftest")
            && rendered.includes("pcrc_worker_file"),
        postCompactDispatchMarkerPreserved: handoff.references?.post_compact_dispatch_marker?.marker_id === "pcfd_worker_handoff_selftest"
            && rendered.includes("压缩后派发标记")
            && rendered.includes("pcfd_worker_handoff_selftest")
            && rendered.includes("first=true"),
        continuationHandoffRendered: handoff.scope?.continuation?.schema === "ccm-worker-continuation-handoff-v1"
            && rendered.includes("Continuation / goal revision:")
            && rendered.includes("先停止当前轮再重核计划")
            && rendered.includes("不要继续已停止执行轮中的旧方向")
            && rendered.includes("最新用户要求"),
        avoidsLazyDelegation: !/基于你的发现|based on your findings/i.test(rendered),
    };
    return { pass: Object.values(checks).every(Boolean), checks, handoff, rendered };
}
//# sourceMappingURL=worker-handoff.js.map