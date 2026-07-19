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
exports.WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES = exports.DOCUMENT_FINDING_PATTERN = void 0;
exports.extractDocumentFindingsFromText = extractDocumentFindingsFromText;
exports.getLazyRagQueryKnowledgeBase = getLazyRagQueryKnowledgeBase;
exports.normalizeRagTag = normalizeRagTag;
exports.buildGroupRagTags = buildGroupRagTags;
exports.extractRagCitations = extractRagCitations;
exports.buildGroupRagQuery = buildGroupRagQuery;
exports.buildGroupRagContext = buildGroupRagContext;
exports.withGroupRagContext = withGroupRagContext;
exports.extractCodedDocumentFindings = extractCodedDocumentFindings;
exports.mergeDocumentFindings = mergeDocumentFindings;
exports.buildDocumentAwareAnalysis = buildDocumentAwareAnalysis;
exports.buildCoordinatorPlanText = buildCoordinatorPlanText;
exports.buildSelfContainedWorkerTask = buildSelfContainedWorkerTask;
exports.inferCodedExecutionPlan = inferCodedExecutionPlan;
exports.buildAssignment = buildAssignment;
exports.buildAssignmentsFromTargets = buildAssignmentsFromTargets;
exports.buildDispatchPolicy = buildDispatchPolicy;
exports.isBroadDevelopmentRequest = isBroadDevelopmentRequest;
exports.inferCodedDispatchPolicy = inferCodedDispatchPolicy;
exports.normalizeDispatchPolicy = normalizeDispatchPolicy;
exports.runCodedGroupOrchestrator = runCodedGroupOrchestrator;
exports.runCoordinatorProtocolSelfTest = runCoordinatorProtocolSelfTest;
exports.runWorkerContextPreDispatchGateSelfTest = runWorkerContextPreDispatchGateSelfTest;
exports.runWorkerContextCompactionRetrySelfTest = runWorkerContextCompactionRetrySelfTest;
exports.runWorkerContextMemoryFirstCompactionRetrySelfTest = runWorkerContextMemoryFirstCompactionRetrySelfTest;
exports.runWorkerContextPartialCompactionRetrySelfTest = runWorkerContextPartialCompactionRetrySelfTest;
exports.runWorkerContextMetadataPartialCompactionRetrySelfTest = runWorkerContextMetadataPartialCompactionRetrySelfTest;
exports.runWorkerContextMetadataPartialCompactPolicySelfTest = runWorkerContextMetadataPartialCompactPolicySelfTest;
exports.runWorkerContextCompactOutcomeLedgerSelfTest = runWorkerContextCompactOutcomeLedgerSelfTest;
exports.runWorkerContextCompactStrategyMemorySelfTest = runWorkerContextCompactStrategyMemorySelfTest;
exports.runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest;
exports.runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest;
exports.runWorkerContextPtlEmergencyDowngradeSelfTest = runWorkerContextPtlEmergencyDowngradeSelfTest;
exports.runWorkerContextCompletionMemoryCompactionPreservationSelfTest = runWorkerContextCompletionMemoryCompactionPreservationSelfTest;
exports.runWorkerContextIgnoreMemoryPolicySelfTest = runWorkerContextIgnoreMemoryPolicySelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchGateSelfTest = runWorkerContextPressureProvenanceProviderDispatchGateSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest;
exports.runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest = runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest;
exports.runWorkerContextProviderReliabilitySnapshotRankingSelfTest = runWorkerContextProviderReliabilitySnapshotRankingSelfTest;
exports.runWorkerContextProviderSwitchExecutionRankingSelfTest = runWorkerContextProviderSwitchExecutionRankingSelfTest;
exports.runWorkerContextProviderSwitchDecisionReceiptSelfTest = runWorkerContextProviderSwitchDecisionReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest = runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest;
exports.buildCodedCoordinatorSummary = buildCodedCoordinatorSummary;
exports.buildAllowedProjectBrief = buildAllowedProjectBrief;
exports.getReplayRepairWorkItemsFileForCoordinator = getReplayRepairWorkItemsFileForCoordinator;
exports.getReplayRepairDispatchPlansFileForCoordinator = getReplayRepairDispatchPlansFileForCoordinator;
exports.getReplayRepairDispatchBindingsFileForCoordinator = getReplayRepairDispatchBindingsFileForCoordinator;
exports.getReplayRepairDispatchTimelineBindingsFileForCoordinator = getReplayRepairDispatchTimelineBindingsFileForCoordinator;
exports.normalizeWorkerContextCompactGroupSessionIdForCoordinator = normalizeWorkerContextCompactGroupSessionIdForCoordinator;
exports.safeWorkerContextCompactScopeSegmentForCoordinator = safeWorkerContextCompactScopeSegmentForCoordinator;
exports.getWorkerContextCompactScopedFileForCoordinator = getWorkerContextCompactScopedFileForCoordinator;
exports.getWorkerContextCompactHookLedgerFileForCoordinator = getWorkerContextCompactHookLedgerFileForCoordinator;
exports.getWorkerContextCompactOutcomeLedgerFileForCoordinator = getWorkerContextCompactOutcomeLedgerFileForCoordinator;
exports.getWorkerContextCompactStrategyMemoryFileForCoordinator = getWorkerContextCompactStrategyMemoryFileForCoordinator;
exports.getWorkerContextPtlEmergencyHintFileForCoordinator = getWorkerContextPtlEmergencyHintFileForCoordinator;
exports.writeJsonAtomicForCoordinator = writeJsonAtomicForCoordinator;
exports.readJsonWithBackupForCoordinator = readJsonWithBackupForCoordinator;
exports.workerContextCompactScopeIdForCoordinator = workerContextCompactScopeIdForCoordinator;
exports.hashCoordinator = hashCoordinator;
exports.normalizeWorkerContextCompactHookEntryForCoordinator = normalizeWorkerContextCompactHookEntryForCoordinator;
exports.buildWorkerContextCompactHookStatsForCoordinator = buildWorkerContextCompactHookStatsForCoordinator;
exports.readWorkerContextCompactHookLedgerForCoordinator = readWorkerContextCompactHookLedgerForCoordinator;
exports.appendWorkerContextCompactHookEntriesForCoordinator = appendWorkerContextCompactHookEntriesForCoordinator;
exports.normalizeWorkerContextCompactOutcomeEntryForCoordinator = normalizeWorkerContextCompactOutcomeEntryForCoordinator;
exports.buildWorkerContextCompactOutcomeStatsForCoordinator = buildWorkerContextCompactOutcomeStatsForCoordinator;
// Behavior-freeze split from group-orchestrator-coded.ts (part 1/5).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_orchestrator_routing_1 = require("./group-orchestrator-routing");
const group_orchestrator_prompts_1 = require("./group-orchestrator-prompts");
const group_orchestrator_coded_part_02_1 = require("./group-orchestrator-coded-part-02");
const group_orchestrator_coded_part_03_1 = require("./group-orchestrator-coded-part-03");
const group_orchestrator_coded_part_05_1 = require("./group-orchestrator-coded-part-05");
exports.DOCUMENT_FINDING_PATTERN = /接口|api|endpoint|路径|字段|入参|出参|参数|返回|状态|流转|验收|权限|鉴权|页面|按钮|流程|规则|错误码|PRD|prd|需求|文档|acceptance|schema|GET\s+|POST\s+|PUT\s+|PATCH\s+|DELETE\s+|\/api\//i;
function extractDocumentFindingsFromText(value, sourceLabel = "", limit = 8) {
    const text = String(value || "").replace(/\r/g, "");
    if (!text.trim())
        return [];
    const lines = text
        .split("\n")
        .map(line => line.replace(/^\s*[-*]\s+/, "").trim())
        .filter(Boolean);
    const findings = [];
    const seen = new Set();
    for (const line of lines) {
        if (!exports.DOCUMENT_FINDING_PATTERN.test(line))
            continue;
        const compacted = (0, group_orchestrator_prompts_1.compactText)(line.replace(/\s*\|\s*/g, " | "), 220);
        const finding = sourceLabel ? `${sourceLabel}: ${compacted}` : compacted;
        const key = finding.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        findings.push(finding);
        if (findings.length >= limit)
            break;
    }
    return findings;
}
function getLazyRagQueryKnowledgeBase() {
    try {
        // 避免 group-orchestrator.ts 与 rag.ts 顶层循环 import；运行时懒加载即可。
        const mod = require("../knowledge/rag");
        return typeof mod.queryKnowledgeBase === "function" ? mod.queryKnowledgeBase : null;
    }
    catch {
        return null;
    }
}
function normalizeRagTag(value) {
    const text = String(value || "").trim();
    if (!text)
        return "";
    return text.startsWith("#") ? text : `#${text}`;
}
function buildGroupRagTags(group) {
    const normalized = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(group);
    const members = (0, group_orchestrator_routing_1.getRoutableMembers)(normalized);
    return Array.from(new Set([
        normalizeRagTag("group-chat"),
        normalizeRagTag(normalized.id),
        normalizeRagTag(normalized.name),
        normalized.id ? normalizeRagTag(`group:${normalized.id}`) : "",
        ...members.map((member) => normalizeRagTag(member.project)),
        ...members.map((member) => normalizeRagTag(`project:${member.project}`)),
    ].filter(Boolean)));
}
function extractRagCitations(text) {
    const citations = new Set();
    for (const match of String(text || "").matchAll(/来源文件:\s*([^\s)]+(?:#\d+)?)/g)) {
        if (match[1])
            citations.add(match[1]);
    }
    return Array.from(citations).slice(0, 8);
}
function buildGroupRagQuery(group, input) {
    const members = (0, group_orchestrator_routing_1.getRoutableMembers)(group).map((member) => member.project).filter(Boolean).join(" ");
    return [
        input.message || "",
        input.sharedFilesContext || "",
        members ? `群聊项目：${members}` : "",
    ].filter(Boolean).join("\n").slice(0, 4000);
}
function buildGroupRagContext(group, input) {
    const queryKnowledgeBase = getLazyRagQueryKnowledgeBase();
    if (!queryKnowledgeBase || !String(input.message || "").trim())
        return { context: "", citations: [], scoped: false };
    const query = buildGroupRagQuery(group, input);
    const tags = buildGroupRagTags(group);
    let scoped = "";
    try {
        scoped = tags.length ? queryKnowledgeBase(query, 4, tags) : "";
    }
    catch { }
    let general = "";
    if (!scoped) {
        try {
            general = queryKnowledgeBase(query, 3);
        }
        catch { }
    }
    const matched = scoped || general;
    if (!matched)
        return { context: "", citations: [], scoped: false };
    const citations = extractRagCitations(matched);
    return {
        context: [
            `检索方式：${scoped ? "群聊/项目标签优先" : "全局兜底"}`,
            citations.length ? `引用：${citations.join("、")}` : "",
            "",
            matched,
        ].filter(Boolean).join("\n"),
        citations,
        scoped: !!scoped,
    };
}
function withGroupRagContext(input) {
    if (input.ragContext !== undefined)
        return input;
    const rag = buildGroupRagContext(input.group, input);
    return {
        ...input,
        ragContext: rag.context,
        ragCitations: rag.citations,
        ragScoped: rag.scoped,
    };
}
function extractCodedDocumentFindings(input) {
    const findings = [
        ...extractDocumentFindingsFromText(input.message, "用户需求", 4),
        ...extractDocumentFindingsFromText(input.context, "群聊上下文", 4),
        ...extractDocumentFindingsFromText(input.sharedFilesContext, "共享文档", 8),
        ...extractDocumentFindingsFromText(input.ragContext, "知识库", 8),
    ];
    const seen = new Set();
    return findings.filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 10);
}
function mergeDocumentFindings(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        const values = Array.isArray(group) ? group : [];
        for (const value of values) {
            const item = String(value || "").trim();
            if (!item)
                continue;
            const key = item.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push(item);
            if (merged.length >= 12)
                return merged;
        }
    }
    return merged;
}
function buildDocumentAwareAnalysis(group, input) {
    const documentContext = [input.context || "", input.sharedFilesContext || "", input.ragContext || ""].filter(Boolean).join("\n");
    const baseAnalysis = (0, group_orchestrator_routing_1.analyzeRequirement)(group, input.message || "", documentContext);
    const documentFindings = extractCodedDocumentFindings(input);
    const provisionalAnalysis = {
        ...baseAnalysis,
        documentFindings,
        ragContext: input.ragContext ? {
            citations: Array.isArray(input.ragCitations) ? input.ragCitations : extractRagCitations(input.ragContext),
            scoped: !!input.ragScoped,
            injected: true,
        } : null,
    };
    return {
        ...baseAnalysis,
        documentFindings,
        ragContext: provisionalAnalysis.ragContext,
        coordinationStrategy: (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(provisionalAnalysis, Array.isArray(baseAnalysis.domains) ? baseAnalysis.domains.length : 0),
        constraints: [
            ...(baseAnalysis.constraints || []),
            documentFindings.length ? "需要按业务/接口文档中的字段、规则和验收点执行" : "",
        ].filter(Boolean),
        needsCoordination: baseAnalysis.needsCoordination || documentFindings.length > 0,
        confidence: documentFindings.length ? Math.max(baseAnalysis.confidence || 0, 0.72) : baseAnalysis.confidence,
    };
}
function buildCoordinatorPlanText(plan) {
    if (!plan?.phases?.length)
        return "";
    const lines = ["主 Agent 计划："];
    for (const phase of plan.phases)
        lines.push(`- ${phase}`);
    if (plan.missingInfo?.length)
        lines.push(`- 已识别缺口：${plan.missingInfo.join("；")}`);
    return lines.join("\n");
}
function buildSelfContainedWorkerTask(project, rawTask, analysis, options = {}) {
    const task = String(rawTask || "").trim();
    const reason = String(options.reason || "").trim();
    const dependsOn = String(options.dependsOn || "").trim();
    const documentFindings = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.filter(Boolean) : [];
    const constraints = Array.isArray(analysis?.constraints) ? analysis.constraints.filter(Boolean) : [];
    const missingInfo = Array.isArray(analysis?.missingInfo) ? analysis.missingInfo.filter(Boolean) : [];
    const deliverables = Array.isArray(analysis?.deliverables) && analysis.deliverables.length
        ? analysis.deliverables
        : ["结论、实际动作、文件变更和验证记录"];
    const coordinationStrategy = String(options.coordinationStrategy || analysis?.coordinationStrategy || (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(analysis, 1));
    const alreadyStructured = /主 Agent 工作单|需求理解|交付物|验证要求|CCM_AGENT_RECEIPT/i.test(task);
    if (alreadyStructured)
        return task;
    const workerContextPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
        group: options.group || null,
        project,
        task: task || analysis?.raw || "根据主 Agent 的需求理解完成本项目相关工作。",
        analysis,
        traceId: options.traceId || options.trace_id || "",
        taskId: options.taskId || options.task_id || "",
        dependencies: dependsOn ? [{ project: dependsOn, reason: "前置依赖" }] : [],
        contractInjections: Array.isArray(options.contractInjections) ? options.contractInjections : [],
        memory: options.memory || null,
        verification: options.verification || null,
    });
    const lines = [
        `主 Agent 工作单：${project}`,
        (0, runtime_kernel_1.renderWorkerContextPacket)(workerContextPacket),
        "",
        `- 需求理解：${analysis?.summary || (0, group_orchestrator_prompts_1.compactText)(analysis?.raw || task, 260)}`,
        `- 你的职责：只处理 ${project} 项目职责范围内的代码、配置、文档或验证；不要越权修改其他项目。`,
        reason ? `- 派发原因：${reason}` : "",
        dependsOn ? `- 依赖关系：先参考 ${dependsOn} 的结论；如果前置结果未到，请说明等待项或可先做的独立检查。` : "",
        coordinationStrategy === "research_synthesis_implementation_verification"
            ? "- 协调协议：按 Claude Code Coordinator/Worker 思路执行。主 Agent 已先理解并计划；你负责本项目 Research/Implementation/Verification，把事实和证据交回主 Agent 综合验收。不要把理解责任再推给其他 Agent。"
            : "- 协调协议：这是主 Agent 派给你的自包含工作单；直接按本项目职责执行并提交证据。",
        `- 本次任务：${task || analysis?.raw || "根据主 Agent 的需求理解完成本项目相关工作。"}`,
        documentFindings.length ? `- 文档依据/验收关注：${documentFindings.slice(0, 6).map((item) => (0, group_orchestrator_prompts_1.compactText)(String(item), 180)).join("；")}` : "",
        constraints.length ? `- 用户约束：${constraints.join("；")}` : "",
        missingInfo.length ? `- 已知缺口/风险：${missingInfo.join("；")}；能在项目内确认的先确认，不能确认的写入 blockers/needs。` : "",
        `- 交付物：${deliverables.join("；")}`,
        "- 禁止空泛回复：不要只写“按文档实现”“根据前置结果处理”。必须说明你实际检查了什么、修改了什么、验证了什么，或为什么被阻塞。",
        "- 验证要求：运行与你改动范围匹配的最小必要验证；未运行的验证必须明确写成建议，不能伪造成已执行。",
        "- 回执要求：最后必须追加 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs。",
    ].filter(Boolean);
    return lines.join("\n");
}
function inferCodedExecutionPlan(message, analysis, routed) {
    const documentText = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.join("\n") : "";
    const text = [
        message || analysis?.raw || "",
        analysis?.contextSignal || "",
        documentText,
    ].filter(Boolean).join("\n").toLowerCase();
    const hasBackend = (routed || []).some((item) => (0, group_orchestrator_routing_1.memberKind)(item.member) === "backend");
    const hasFrontend = (routed || []).some((item) => (0, group_orchestrator_routing_1.memberKind)(item.member) === "frontend");
    const needsBackendFirst = hasBackend && hasFrontend && /接口|api|字段|契约|联调|对接|入参|出参|endpoint|schema|后端.*前端|前端.*后端/i.test(text);
    const needsSequential = !needsBackendFirst
        && routed.length > 1
        && /先.+再|然后|依赖|步骤|流程|迁移|分阶段|串行|sequential/i.test(text);
    const executionOrder = needsBackendFirst ? "backend_first" : needsSequential ? "sequential" : "parallel";
    const firstBackend = needsBackendFirst
        ? routed.find((item) => (0, group_orchestrator_routing_1.memberKind)(item.member) === "backend")?.member?.project || ""
        : "";
    const plannedRouted = (routed || []).map((item) => ({
        ...item,
        dependsOn: item.dependsOn || (firstBackend && (0, group_orchestrator_routing_1.memberKind)(item.member) === "frontend" ? firstBackend : ""),
        reason: item.reason || (needsBackendFirst && (0, group_orchestrator_routing_1.memberKind)(item.member) === "frontend"
            ? `前端对接依赖 ${firstBackend} 先确认接口契约`
            : needsBackendFirst && (0, group_orchestrator_routing_1.memberKind)(item.member) === "backend"
                ? "接口/字段/联调类需求需要先确认后端契约"
                : needsSequential
                    ? "该需求存在步骤或依赖关系，按顺序推进"
                    : "规则主 Agent 根据需求范围和项目职责派发"),
    }));
    return { executionOrder, routed: plannedRouted };
}
function buildAssignment(member, task, reason = "", dependsOn = "", options = {}) {
    const groupId = String(options.group?.id || options.groupId || options.group_id || "").trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const project = String(member?.project || "").trim();
    const agentType = String(member?.agentType || member?.agent_type || member?.agent || member?.executor || member?.runner || options.agentType || options.agent_type || "unknown").trim() || "unknown";
    const providerDispatchOverride = member?.providerDispatchOverride
        || member?.provider_dispatch_override
        || member?.pressureProvenanceProviderDispatchOverride
        || member?.pressure_provenance_provider_dispatch_override
        || options.providerDispatchOverride
        || options.provider_dispatch_override
        || options.pressureProvenanceProviderDispatchOverride
        || options.pressure_provenance_provider_dispatch_override
        || null;
    const taskText = String(task || "").trim();
    const taskFingerprint = (0, group_orchestrator_prompts_1.compactText)(taskText, 240).toLowerCase().replace(/[`*_#>\[\]{}()（）【】]+/g, " ").replace(/[，。；、,.;:：\-—\s]+/g, " ").trim().slice(0, 220);
    const dispatchKey = [groupId || "conversation", "coordinator", project || "unknown", taskFingerprint].filter(Boolean).join("|");
    const baseAssignment = {
        project,
        task: taskText,
        reason: String(reason || "").trim(),
        dependsOn: String(dependsOn || "").trim(),
        taskFingerprint,
        dispatchKey,
        assignmentId: [project || "unknown", dispatchKey, "initial", 1].filter(Boolean).join("::"),
        attempt: 1,
        sourceProject: "coordinator",
        scopeId: groupId || "conversation",
        groupSessionId,
        group_session_id: groupSessionId,
        agentType,
        agent_type: agentType,
        provider_dispatch_override: providerDispatchOverride,
        providerDispatchOverride: providerDispatchOverride,
    };
    const briefMatch = groupId ? (0, group_orchestrator_coded_part_05_1.findReplayRepairDispatchBriefForAssignment)(groupId, baseAssignment) : null;
    const replayRepairDispatchBriefs = briefMatch?.brief ? [{
            brief_id: briefMatch.brief.brief_id || "",
            work_item_id: briefMatch.brief.work_item_id || "",
            source: briefMatch.brief.source || "",
            target_project: briefMatch.brief.target_project || baseAssignment.project,
            proof_entry_id: briefMatch.brief.proof_entry_id || "",
            request_patch_checksum: briefMatch.brief.request_patch_checksum || "",
            worker_context_packet_id: briefMatch.brief.worker_context_packet_id || "",
            worker_context_packet_binding_id: briefMatch.brief.worker_context_packet_binding_id || briefMatch.brief.binding_id || "",
            worker_context_packet_memory_policy_reason: briefMatch.brief.worker_context_packet_memory_policy_reason || "",
            binding_id: briefMatch.brief.binding_id || briefMatch.brief.worker_context_packet_binding_id || "",
            source_assignment_id: briefMatch.brief.assignment_id || "",
            source_dispatch_key: briefMatch.brief.dispatch_key || "",
            provider_reproof_status: briefMatch.brief.provider_reproof_status || "",
            provider_reproof_reason: briefMatch.brief.provider_reproof_reason || "",
            reproof_candidate_id: briefMatch.brief.reproof_candidate_id || "",
            timeline_binding_id: briefMatch.brief.timeline_binding_id || "",
            original_work_item_id: briefMatch.brief.original_work_item_id || "",
            request_telemetry_session_status: briefMatch.brief.request_telemetry_session_status || "",
            request_telemetry_dispatch_status: briefMatch.brief.request_telemetry_dispatch_status || "",
            runner_request_id: briefMatch.brief.runner_request_id || "",
            execution_id: briefMatch.brief.execution_id || "",
            should_create_real_task: false,
        }] : [];
    const initialWorkerContextPacket = (0, group_orchestrator_coded_part_02_1.buildWorkerContextPacketForAssignment)(baseAssignment, dependsOn, replayRepairDispatchBriefs, options);
    const initialPreDispatchGate = (0, group_orchestrator_coded_part_03_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, initialWorkerContextPacket);
    const retryResult = (0, group_orchestrator_coded_part_03_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(baseAssignment, dependsOn, replayRepairDispatchBriefs, initialWorkerContextPacket, initialPreDispatchGate, options);
    const providerSwitchRequest = (0, group_orchestrator_coded_part_03_1.providerSwitchRequestForAssignmentForCoordinator)(member, project, options);
    const providerSwitchDecisionReceipt = providerSwitchRequest
        ? (0, group_orchestrator_coded_part_03_1.buildProviderSwitchDecisionReceiptForCoordinator)(groupId, {
            ...baseAssignment,
            task: retryResult.task,
            worker_context_packet: retryResult.packet,
            worker_context_pre_dispatch_gate: retryResult.gate,
        }, providerSwitchRequest, options)
        : null;
    const effectiveBaseAssignment = providerSwitchDecisionReceipt?.valid === true
        ? {
            ...baseAssignment,
            original_agent_type: agentType,
            originalAgentType: agentType,
            agentType: providerSwitchDecisionReceipt.new_provider?.agent_type || agentType,
            agent_type: providerSwitchDecisionReceipt.new_provider?.agent_type || agentType,
        }
        : baseAssignment;
    const switchedPacket = providerSwitchDecisionReceipt?.valid === true
        ? (0, group_orchestrator_coded_part_02_1.buildWorkerContextPacketForAssignment)(effectiveBaseAssignment, dependsOn, replayRepairDispatchBriefs, {
            ...options,
            providerSwitchDecisionReceipt,
        })
        : retryResult.packet;
    const switchedGate = providerSwitchDecisionReceipt?.valid === true
        ? (0, group_orchestrator_coded_part_03_1.buildWorkerContextPreDispatchGateForCoordinator)(effectiveBaseAssignment, switchedPacket)
        : retryResult.gate;
    const effectiveRetryResult = providerSwitchDecisionReceipt?.valid === true
        ? (0, group_orchestrator_coded_part_03_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(effectiveBaseAssignment, dependsOn, replayRepairDispatchBriefs, switchedPacket, switchedGate, { ...options, providerSwitchDecisionReceipt })
        : retryResult;
    const workerContextPacket = effectiveRetryResult.packet;
    const preDispatchGate = effectiveRetryResult.gate;
    const providerDispatchDecision = (0, group_orchestrator_coded_part_03_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(effectiveBaseAssignment, workerContextPacket, preDispatchGate);
    const needs = preDispatchGate.dispatch_ready === false
        ? [
            preDispatchGate.provider_dispatch_hold === true ? "先完成 pressure provenance provider repair/recovery，再启动第三方子 Agent 会话" : "",
            preDispatchGate.pressure_status === "over_budget" ? "先压缩 WorkerContextPacket 到预算内，再启动第三方子 Agent 会话" : "",
        ].filter(Boolean)
        : [];
    const assignment = {
        ...effectiveBaseAssignment,
        task: effectiveRetryResult.task,
        original_task_hash: effectiveRetryResult.retry ? effectiveRetryResult.retry.original_task_hash : "",
        context_compaction_retry: effectiveRetryResult.retry,
        status: preDispatchGate.dispatch_ready === false ? "blocked" : "pending",
        dispatchReady: preDispatchGate.dispatch_ready !== false,
        dispatch_ready: preDispatchGate.dispatch_ready !== false,
        worker_context_pre_dispatch_gate: preDispatchGate,
        workerContextPreDispatchGate: preDispatchGate,
        blockers: preDispatchGate.dispatch_ready === false ? [preDispatchGate.reason] : [],
        needs,
        worker_context_provider_dispatch_decision: providerDispatchDecision,
        provider_dispatch_decision: providerDispatchDecision,
        provider_switch_decision_receipt: providerSwitchDecisionReceipt,
        providerSwitchDecisionReceipt: providerSwitchDecisionReceipt,
        provider_switch_request: providerSwitchRequest,
        worker_context_packet: workerContextPacket,
    };
    if (groupId)
        (0, group_orchestrator_coded_part_03_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment);
    if (briefMatch?.brief) {
        assignment.replay_repair_dispatch_brief = {
            ...replayRepairDispatchBriefs[0],
            match_score: Number(briefMatch.match_score || 0),
            matched_by: Array.isArray(briefMatch.matched_by) ? briefMatch.matched_by : [],
            binding_policy: "attach_when_assignment_matches_ready_replay_repair_dispatch_brief",
        };
        const binding = (0, group_orchestrator_coded_part_05_1.recordReplayRepairDispatchBriefAssignmentBinding)(groupId, assignment, briefMatch);
        if (binding)
            assignment.replay_repair_dispatch_brief.binding_id = binding.binding_id;
    }
    return assignment;
}
function buildAssignmentsFromTargets(targets, options = {}) {
    return (targets || [])
        .map((item) => buildAssignment(item.member, item.task, item.reason, item.dependsOn, {
        ...options,
        providerSwitchRequest: item.providerSwitchRequest || item.provider_switch_request || options.providerSwitchRequest || options.provider_switch_request || null,
    }))
        .filter((item) => item.project && item.task);
}
function buildDispatchPolicy(action, reason, analysis, options = {}) {
    return {
        action,
        reason: reason || "",
        requiresConfirmation: !!options.requiresConfirmation,
        risk: options.risk || "",
        nextStep: options.nextStep || "",
        confidence: typeof analysis?.confidence === "number" ? analysis.confidence : 0,
    };
}
function isBroadDevelopmentRequest(message, analysis = {}) {
    const text = String(message || analysis?.raw || "").toLowerCase();
    return !!analysis?.needsCoordination
        && ["implementation", "planning", "bugfix"].includes(String(analysis?.intent || ""))
        && ((0, group_orchestrator_routing_1.containsAny)(text, group_orchestrator_routing_1.BROAD_HINTS) || /业务|需求|文档|prd|实现|开发|功能|模块/i.test(String(message || analysis?.raw || "")));
}
function inferCodedDispatchPolicy(group, message, analysis, targets) {
    if ((0, group_orchestrator_routing_1.isSimpleMessage)(message) || analysis.intent === "greeting") {
        return buildDispatchPolicy("direct_answer", "简单寒暄或确认消息，不需要调用项目 Agent。", analysis, {
            nextStep: "直接回复用户",
        });
    }
    if (!(0, group_orchestrator_routing_1.isExplicitExecutionRequest)(message)) {
        return buildDispatchPolicy("direct_answer", "用户没有要求执行或修改，主 Agent 直接回答，不创建开发任务。", analysis, {
            nextStep: "直接回答用户",
        });
    }
    if ((0, group_orchestrator_routing_1.getRoutableMembers)(group).length === 0) {
        return buildDispatchPolicy("hold", "当前群聊没有可分派的项目 Agent。", analysis, {
            risk: "无法执行项目级排查或修改",
            nextStep: "请先添加群聊成员",
        });
    }
    const broadDevelopmentRequest = isBroadDevelopmentRequest(message, analysis);
    if (targets.length === 0 || (analysis.missingInfo?.length && analysis.confidence < 0.72 && !broadDevelopmentRequest)) {
        return buildDispatchPolicy("ask_user", analysis.missingInfo?.[0] || "需求范围不够明确，先问用户补充关键信息。", analysis, {
            risk: "信息不足时派发会导致子 Agent 空转或误改",
            nextStep: "向用户追问一个关键问题",
        });
    }
    const risky = /删除|清空|重置|迁移|生产|线上|支付|权限|密钥|token|数据库|drop|delete|reset/i.test(message);
    return buildDispatchPolicy("delegate", broadDevelopmentRequest
        ? "业务开发需求需要项目 Agent 先按职责判断并落地处理。"
        : targets.length > 1 ? "需要多个项目 Agent 协作处理。" : "需要项目 Agent 查看代码或项目上下文。", analysis, {
        requiresConfirmation: risky,
        risk: risky ? "包含高风险操作，建议用户确认后再执行具体修改。" : (broadDevelopmentRequest && analysis.missingInfo?.length ? analysis.missingInfo.join("；") : ""),
        nextStep: risky ? "先展示派发计划并等待确认" : "立即派发给对应子 Agent",
    });
}
function normalizeDispatchPolicy(parsed, analysis, targets) {
    const rawAction = String(parsed?.dispatchPolicy?.action || parsed?.dispatchAction || "").trim();
    const allowed = new Set(["direct_answer", "ask_user", "delegate", "hold"]);
    const parsedRequiresConfirmation = !!(parsed?.dispatchPolicy?.requiresConfirmation || parsed?.requiresConfirmation);
    const action = allowed.has(rawAction)
        ? rawAction
        : targets.length > 0 ? "delegate" : analysis.missingInfo?.length ? "ask_user" : "direct_answer";
    const reason = String(parsed?.dispatchPolicy?.reason || parsed?.dispatchReason || "").trim();
    return buildDispatchPolicy(action, reason, analysis, {
        requiresConfirmation: parsedRequiresConfirmation,
        risk: String(parsed?.dispatchPolicy?.risk || parsed?.risk || "").trim(),
        nextStep: String(parsed?.dispatchPolicy?.nextStep || parsed?.nextStep || (action === "delegate" ? "立即派发给对应子 Agent" : "")).trim(),
    });
}
function runCodedGroupOrchestrator(input) {
    const group = (0, group_orchestrator_routing_1.normalizeGroupOrchestrator)(input.group);
    const coordinator = (0, group_orchestrator_routing_1.getCoordinatorMember)(group);
    const analysis = buildDocumentAwareAnalysis(group, input);
    const routed = (0, group_orchestrator_routing_1.routeMembers)(group, input.message, analysis);
    const members = (0, group_orchestrator_routing_1.getRoutableMembers)(group);
    // 优化1：简单消息直接给出自然回复，不展示结构化分析
    if ((0, group_orchestrator_routing_1.isSimpleMessage)(input.message)) {
        const memberNames = members.length ? members.map((m) => m.project).join("、") : "暂无";
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
        let friendlyReply = "";
        if (analysis.intent === "greeting") {
            friendlyReply = `你好！我是群聊协调者，可以帮你把任务分配给 ${memberNames}。直接说你想做什么就行 😊`;
        }
        else {
            friendlyReply = `收到！如果有具体需求可以直接说，我会安排 ${memberNames} 来处理。`;
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
            content: friendlyReply,
        };
    }
    if (!(0, group_orchestrator_routing_1.isExplicitExecutionRequest)(input.message)) {
        const memberNames = members.length ? members.map((m) => m.project).join("、") : "暂无已绑定项目";
        const projectOverview = members.length
            ? members.map((member) => {
                const kind = (0, group_orchestrator_routing_1.memberKind)(member);
                const role = kind === "frontend" ? "前端/客户端" : kind === "backend" ? "后端/API" : "项目模块";
                return `- ${member.project}：${role}`;
            }).join("\n")
            : "- 当前还没有绑定项目 Agent";
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
        const ragFindings = (Array.isArray(analysis.documentFindings) ? analysis.documentFindings : [])
            .filter((item) => /^知识库:/.test(String(item || "")))
            .slice(0, 5);
        const ragCitations = analysis.ragContext?.citations || [];
        const ragAnswer = ragFindings.length
            ? [
                "",
                "我先查了本地知识库，相关参考：",
                ...ragFindings.map((item) => `- ${(0, group_orchestrator_prompts_1.compactText)(item.replace(/^知识库:\s*/, ""), 220)}`),
                ragCitations.length ? `引用：${ragCitations.join("、")}` : "",
            ].filter(Boolean).join("\n")
            : "";
        const projectContextFindings = (Array.isArray(analysis.documentFindings) ? analysis.documentFindings : [])
            .filter((item) => !/^知识库:/.test(String(item || "")))
            .slice(0, 8);
        const projectContextAnswer = projectContextFindings.length
            ? [
                "",
                "我读取了当前只读项目上下文，关键信息：",
                ...projectContextFindings.map((item) => `- ${(0, group_orchestrator_prompts_1.compactText)(String(item).replace(/^共享文档:\s*/, ""), 240)}`),
            ].join("\n")
            : "";
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis: { ...analysis, needsCoordination: false },
            dispatchPolicy,
            content: `这是一个信息咨询/项目分析，我不会创建开发任务、分派子 Agent 或修改文件。${projectContextAnswer}${ragAnswer}\n\n当前群聊关联项目：${memberNames}\n${projectOverview}\n\n从成员职责和只读上下文看，这是一个由上述项目共同组成的协作开发空间；需要更具体的架构、技术栈、目录或功能说明时，我会优先基于群聊记忆、项目资料和知识库回答。`,
        };
    }
    if (members.length === 0) {
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
            content: [
                "需求理解：",
                ...(0, group_orchestrator_routing_1.formatRequirementUnderstanding)(analysis).map(line => `- ${line}`),
                "",
                "判断：当前群聊还没有可分派的项目 Agent。",
                "",
                "当前结论/等待项：请先在群聊成员里添加项目 Agent，然后我再负责协调分配。"
            ].join("\n"),
        };
    }
    if (routed.length === 0) {
        const memberNames = members.map((m) => m.project).join("、");
        const question = analysis.missingInfo[0] || "这是前端、后端、联调还是排查任务";
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, routed);
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
            content: `我大致理解了你的需求，不过还需要你补充一下：**${question}**\n\n当前可协调成员：${memberNames}`,
        };
    }
    const executionPlan = inferCodedExecutionPlan(input.message, analysis, routed);
    const executionOrder = executionPlan.executionOrder;
    const coordinationStrategy = (0, group_orchestrator_routing_1.inferCoordinatorStrategy)(analysis, executionPlan.routed.length);
    analysis.coordinationStrategy = coordinationStrategy;
    const plannedRouted = executionPlan.routed.map((item) => ({
        ...item,
        task: buildSelfContainedWorkerTask(item.member.project, item.task || input.message, analysis, {
            group,
            reason: item.reason || "规则主 Agent 根据需求范围和项目职责派发",
            dependsOn: item.dependsOn || "",
            coordinationStrategy,
        }),
    }));
    const plan = (0, group_orchestrator_routing_1.buildCoordinatorPlan)(group, analysis, plannedRouted, executionOrder, coordinationStrategy);
    const delegated = plannedRouted.map(item => item.member.project);
    const assignments = buildAssignmentsFromTargets(plannedRouted, {
        group,
        analysis,
        groupSessionId: input.groupSessionId || input.group_session_id || "",
        workerContextUsageOptions: input.workerContextUsageOptions || null,
        autoWorkerContextCompactRetry: input.autoWorkerContextCompactRetry,
        workerContextRetryOptions: input.workerContextRetryOptions || null,
        providerSwitchRequests: input.providerSwitchRequests || input.provider_switch_requests || null,
    });
    const blockedAssignments = assignments.filter((item) => item.worker_context_pre_dispatch_gate?.dispatch_ready === false || item.dispatchReady === false || item.dispatch_ready === false);
    const delegationLines = blockedAssignments.length
        ? assignments.map((item) => {
            const gate = item.worker_context_pre_dispatch_gate || {};
            const prefix = gate.dispatch_ready === false ? "派发前暂停" : "可派发";
            return `- ${item.project}：${prefix}；${gate.reason || (0, group_orchestrator_prompts_1.compactText)(item.task || "", 180)}`;
        })
        : plannedRouted.map(item => (0, group_orchestrator_routing_1.buildVisibleAssignmentLine)(item));
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, plannedRouted);
    const finalDispatchPolicy = blockedAssignments.length
        ? {
            ...dispatchPolicy,
            action: "hold",
            requiresConfirmation: true,
            reason: `WorkerContextPacket 派发前上下文预算阻断：${blockedAssignments.map((item) => item.project).join("、")}`,
            risk: "worker_context_packet_over_budget",
            nextStep: "先执行 worker_context_packet_context_usage_repair，重新生成预算内 WorkerContextPacket 后再派发子 Agent",
        }
        : dispatchPolicy;
    return {
        agent: coordinator.project,
        delegated,
        assignments,
        executionOrder,
        coordinationStrategy,
        analysis,
        coordinationPlan: plan,
        dispatchPolicy: finalDispatchPolicy,
        content: [
            blockedAssignments.length
                ? `我已经形成派发计划，但 ${blockedAssignments.map((item) => item.project).join("、")} 的 WorkerContextPacket 超出上下文预算，已触发派发前 gate，暂不启动第三方子 Agent 会话。`
                : `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            buildCoordinatorPlanText(plan),
            "",
            ...delegationLines,
            "",
            `等他们回复后我会做汇总 📋`
        ].join("\n"),
    };
}
function runCoordinatorProtocolSelfTest() {
    return require("./group-orchestrator-protocol-self-tests").runCoordinatorProtocolSelfTest();
}
function runWorkerContextPreDispatchGateSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPreDispatchGateSelfTest();
}
function runWorkerContextCompactionRetrySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextCompactionRetrySelfTest();
}
function runWorkerContextMemoryFirstCompactionRetrySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextMemoryFirstCompactionRetrySelfTest();
}
function runWorkerContextPartialCompactionRetrySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactionRetrySelfTest();
}
function runWorkerContextMetadataPartialCompactionRetrySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextMetadataPartialCompactionRetrySelfTest();
}
function runWorkerContextMetadataPartialCompactPolicySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextMetadataPartialCompactPolicySelfTest();
}
function runWorkerContextCompactOutcomeLedgerSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextCompactOutcomeLedgerSelfTest();
}
function runWorkerContextCompactStrategyMemorySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextCompactStrategyMemorySelfTest();
}
function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest();
}
function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest();
}
function runWorkerContextPtlEmergencyDowngradeSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPtlEmergencyDowngradeSelfTest();
}
function runWorkerContextCompletionMemoryCompactionPreservationSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
}
function runWorkerContextIgnoreMemoryPolicySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextIgnoreMemoryPolicySelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchGateSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest();
}
function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest();
}
function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest();
}
function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest();
}
function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextProviderReliabilitySnapshotRankingSelfTest();
}
function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextProviderSwitchExecutionRankingSelfTest();
}
function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextProviderSwitchDecisionReceiptSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest();
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
    return require("./group-orchestrator-worker-context").runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest();
}
function buildCodedCoordinatorSummary(group, outputs) {
    const coordinator = (0, group_orchestrator_routing_1.getCoordinatorMember)(group);
    const rows = (0, group_orchestrator_prompts_1.buildCodedCoordinatorNotificationRows)(outputs || []);
    if (rows.length === 0)
        return null;
    const gaps = Array.from(new Set(rows.flatMap((item) => item.gaps || []))).slice(0, 6);
    const blockedCount = rows.filter((item) => (item.gaps || []).length > 0).length;
    const nextAction = gaps.length
        ? `主 Agent 会先处理：${gaps.join("；")}。`
        : "主 Agent 会把这些结果纳入验收，并整理最终总结。";
    const lines = [
        "协调汇总：",
        `- 子 Agent 结果：${rows.length} 条，${blockedCount ? `${blockedCount} 条需要继续处理` : "当前没有发现明显阻塞"}。`,
        ...rows.slice(0, 6).map((item) => {
            const summary = item.summary || item.result || `${item.agent} 已返回结果。`;
            const gapText = (item.gaps || []).length ? ` 需要继续：${item.gaps.join("、")}。` : "";
            return `- ${item.agent}：${item.status_label}。${summary}${gapText}`;
        }),
        `- 下一步：${nextAction}`,
    ];
    return {
        agent: coordinator.project,
        content: lines.join("\n"),
        structured_summary: {
            schema: "ccm-coded-coordinator-notification-digest-v1",
            rows,
            gaps,
            next_action: nextAction,
        },
    };
}
function buildAllowedProjectBrief(group) {
    return (0, group_orchestrator_routing_1.getRoutableMembers)(group).map((m) => {
        const kind = (0, group_orchestrator_routing_1.memberKind)(m);
        return `- ${m.project}: ${kind === "frontend" ? "前端/客户端/UI/交互" : kind === "backend" ? "后端/API/服务/数据" : "通用项目 Agent"}，底层 Agent: ${m.agent || "未指定"}`;
    }).join("\n");
}
function getReplayRepairWorkItemsFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-replay-repair").getReplayRepairWorkItemsFileForCoordinator(groupId, groupSessionId);
}
function getReplayRepairDispatchPlansFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-replay-repair").getReplayRepairDispatchPlansFileForCoordinator(groupId, groupSessionId);
}
function getReplayRepairDispatchBindingsFileForCoordinator(groupId) {
    return require("./group-orchestrator-replay-repair").getReplayRepairDispatchBindingsFileForCoordinator(groupId);
}
function getReplayRepairDispatchTimelineBindingsFileForCoordinator(groupId) {
    const safe = String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    return path.join(group_orchestrator_routing_1.GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR, `${safe}.json`);
}
function normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId = "") {
    const value = String(groupSessionId || "").trim();
    return value.startsWith("gcs_") ? value : "";
}
function safeWorkerContextCompactScopeSegmentForCoordinator(value, fallback = "unknown") {
    return String(value || fallback).replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || fallback;
}
function getWorkerContextCompactScopedFileForCoordinator(root, groupId, groupSessionId = "") {
    const safeGroup = safeWorkerContextCompactScopeSegmentForCoordinator(groupId);
    const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
    if (!exactSessionId)
        return path.join(root, `${safeGroup}.json`);
    return path.join(root, safeGroup, `${safeWorkerContextCompactScopeSegmentForCoordinator(exactSessionId, "gcs_unknown")}.json`);
}
function getWorkerContextCompactHookLedgerFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").getWorkerContextCompactHookLedgerFileForCoordinator(groupId, groupSessionId);
}
function getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").getWorkerContextCompactOutcomeLedgerFileForCoordinator(groupId, groupSessionId);
}
function getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").getWorkerContextCompactStrategyMemoryFileForCoordinator(groupId, groupSessionId);
}
function getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").getWorkerContextPtlEmergencyHintFileForCoordinator(groupId, groupSessionId);
}
function writeJsonAtomicForCoordinator(file, value) {
    (0, atomic_json_file_1.writeJsonAtomic)(file, value);
}
function readJsonWithBackupForCoordinator(file, schema) {
    for (const [candidate, recoveredFromBackup] of [[file, false], [`${file}.bak`, true]]) {
        try {
            const value = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            if (value?.schema === schema)
                return { value, recoveredFromBackup };
        }
        catch { }
    }
    return { value: null, recoveredFromBackup: false };
}
function workerContextCompactScopeIdForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
    return exactSessionId ? `${groupId}::${exactSessionId}` : String(groupId || "");
}
function hashCoordinator(value, length = 16) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}
function normalizeWorkerContextCompactHookEntryForCoordinator(raw = {}) {
    const ok = raw.ok !== false && String(raw.status || "ok") !== "fail";
    return {
        schema: "ccm-worker-context-compact-hook-entry-v1",
        entry_id: String(raw.entry_id || raw.entryId || `wcch-entry:${hashCoordinator([raw.hook_run_id, raw.phase, raw.assignment_id, raw.retry_packet_id, Date.now(), Math.random()], 14)}`),
        hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
        group_id: String(raw.group_id || raw.groupId || ""),
        group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
        phase: String(raw.phase || "") === "post" ? "post" : "pre",
        ok,
        status: ok ? String(raw.status || "ok") : "fail",
        assignment_id: String(raw.assignment_id || raw.assignmentId || ""),
        dispatch_key: String(raw.dispatch_key || raw.dispatchKey || ""),
        project: String(raw.project || ""),
        from_packet_id: String(raw.from_packet_id || raw.fromPacketId || ""),
        retry_packet_id: String(raw.retry_packet_id || raw.retryPacketId || ""),
        method: String(raw.method || ""),
        memory_first: raw.memory_first === true || raw.memoryFirst === true,
        initial_usage_status: String(raw.initial_usage_status || raw.initialUsageStatus || ""),
        final_usage_status: String(raw.final_usage_status || raw.finalUsageStatus || ""),
        dispatch_ready: raw.dispatch_ready === false || raw.dispatchReady === false ? false : true,
        result_summary: raw.result_summary || raw.resultSummary || {},
        error: (0, group_orchestrator_prompts_1.compactText)(raw.error || "", 500),
        at: String(raw.at || new Date().toISOString()),
    };
}
function buildWorkerContextCompactHookStatsForCoordinator(entries = []) {
    const stats = {
        total: entries.length,
        ok: 0,
        failed: 0,
        pre: { total: 0, ok: 0, failed: 0 },
        post: { total: 0, ok: 0, failed: 0 },
        latestAt: "",
    };
    for (const entry of entries) {
        const phase = entry.phase === "post" ? "post" : "pre";
        stats[phase].total++;
        if (entry.ok === false || entry.status === "fail") {
            stats.failed++;
            stats[phase].failed++;
        }
        else {
            stats.ok++;
            stats[phase].ok++;
        }
        if (entry.at && (!stats.latestAt || String(entry.at) > stats.latestAt))
            stats.latestAt = String(entry.at);
    }
    return stats;
}
function readWorkerContextCompactHookLedgerForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").readWorkerContextCompactHookLedgerForCoordinator(groupId, groupSessionId);
}
function appendWorkerContextCompactHookEntriesForCoordinator(groupId, entries = [], groupSessionId = "") {
    const exactSessionId = normalizeWorkerContextCompactGroupSessionIdForCoordinator(groupSessionId);
    const normalized = entries
        .map((entry) => normalizeWorkerContextCompactHookEntryForCoordinator({
        ...entry,
        group_id: entry.group_id || groupId,
        group_session_id: exactSessionId || "",
    }))
        .filter((entry) => entry.group_id === groupId && (!exactSessionId || entry.group_session_id === exactSessionId));
    if (!normalized.length)
        return readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
    const file = getWorkerContextCompactHookLedgerFileForCoordinator(groupId, exactSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readWorkerContextCompactHookLedgerForCoordinator(groupId, exactSessionId);
        const nextEntries = [...(ledger.entries || []), ...normalized].slice(-500);
        const next = {
            schema: "ccm-worker-context-compact-hook-ledger-v1",
            version: 1,
            groupId,
            groupSessionId: exactSessionId,
            scopeId: workerContextCompactScopeIdForCoordinator(groupId, exactSessionId),
            file,
            entries: nextEntries,
            stats: buildWorkerContextCompactHookStatsForCoordinator(nextEntries),
            updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
        };
        writeJsonAtomicForCoordinator(file, next);
        return next;
    });
}
function normalizeWorkerContextCompactOutcomeEntryForCoordinator(raw = {}) {
    const status = String(raw.status || raw.retry_status || raw.retryStatus || "").trim() || (raw.dispatch_ready === false || raw.dispatchReady === false ? "blocked" : "recovered");
    const partialPolicy = raw.partial_compact_policy || raw.partialCompactPolicy || {};
    const ptlHint = raw.ptl_emergency_hint || raw.ptlEmergencyHint || null;
    const providerRankingProvenancePreservation = (0, group_orchestrator_coded_part_03_1.normalizeProviderRankingProvenancePreservationForCoordinator)(raw.provider_ranking_provenance_preservation || raw.providerRankingProvenancePreservation || null);
    const completionMemoryPreservation = (0, group_orchestrator_coded_part_03_1.normalizePostCompactReceiptMemoryUsageRepairCompletionPreservationForCoordinator)(raw.post_compact_receipt_memory_usage_repair_completion_preservation
        || raw.postCompactReceiptMemoryUsageRepairCompletionPreservation
        || null);
    const selectedCategories = Array.isArray(partialPolicy.selected_categories || partialPolicy.selectedCategories)
        ? (partialPolicy.selected_categories || partialPolicy.selectedCategories).map((item) => String(item || "")).filter(Boolean)
        : [];
    const skippedCategories = Array.isArray(partialPolicy.skipped_categories || partialPolicy.skippedCategories)
        ? (partialPolicy.skipped_categories || partialPolicy.skippedCategories).map((item) => String(item || "")).filter(Boolean)
        : [];
    const compactStrategyMemory = partialPolicy.compact_strategy_memory || partialPolicy.compactStrategyMemory || null;
    const pressureRecallUsageBias = partialPolicy.pressure_recall_usage_strategy_bias || partialPolicy.pressureRecallUsageStrategyBias || null;
    const pressureRecallUsageSummary = partialPolicy.pressure_recall_usage_summary || partialPolicy.pressureRecallUsageSummary || null;
    return {
        schema: "ccm-worker-context-compact-outcome-entry-v1",
        outcome_id: String(raw.outcome_id || raw.outcomeId || `wcco:${hashCoordinator([raw.group_id, raw.assignment_id, raw.retry_id, raw.retry_packet_id, raw.at || Date.now()], 14)}`),
        group_id: String(raw.group_id || raw.groupId || ""),
        group_session_id: String(raw.group_session_id || raw.groupSessionId || ""),
        assignment_id: String(raw.assignment_id || raw.assignmentId || ""),
        dispatch_key: String(raw.dispatch_key || raw.dispatchKey || ""),
        project: String(raw.project || ""),
        hook_run_id: String(raw.hook_run_id || raw.hookRunId || ""),
        retry_id: String(raw.retry_id || raw.retryId || ""),
        method: String(raw.method || ""),
        status,
        dispatch_ready: raw.dispatch_ready === false || raw.dispatchReady === false ? false : true,
        from_packet_id: String(raw.from_packet_id || raw.fromPacketId || ""),
        retry_packet_id: String(raw.retry_packet_id || raw.retryPacketId || ""),
        initial_usage_status: String(raw.initial_usage_status || raw.initialUsageStatus || ""),
        final_usage_status: String(raw.final_usage_status || raw.finalUsageStatus || ""),
        from_total_tokens: Number(raw.from_total_tokens || raw.fromTotalTokens || 0),
        retry_total_tokens: Number(raw.retry_total_tokens || raw.retryTotalTokens || 0),
        from_free_tokens: Number(raw.from_free_tokens || raw.fromFreeTokens || 0),
        retry_free_tokens: Number(raw.retry_free_tokens || raw.retryFreeTokens || 0),
        token_delta: Number(raw.token_delta || raw.tokenDelta || 0),
        free_token_delta: Number(raw.free_token_delta || raw.freeTokenDelta || 0),
        memory_first: raw.memory_first === true || raw.memoryFirst === true,
        partial_compact: raw.partial_compact === true || raw.partialCompact === true,
        task_compacted: raw.task_compacted === true || raw.taskCompacted === true,
        task_hash_unchanged: raw.task_hash_unchanged === true || raw.taskHashUnchanged === true,
        partial_compaction_categories: Array.isArray(raw.partial_compaction_categories || raw.partialCompactionCategories)
            ? (raw.partial_compaction_categories || raw.partialCompactionCategories).map((item) => String(item || "")).filter(Boolean)
            : [],
        partial_compact_policy: partialPolicy?.schema ? {
            schema: partialPolicy.schema,
            method: partialPolicy.method || "",
            selected_categories: selectedCategories,
            skipped_categories: skippedCategories,
            max_categories: Number(partialPolicy.max_categories || partialPolicy.maxCategories || 0),
            fallback_used: partialPolicy.fallback_used === true || partialPolicy.fallbackUsed === true,
            compact_strategy_memory: compactStrategyMemory?.schema ? {
                schema: String(compactStrategyMemory.schema || ""),
                strategy_id: String(compactStrategyMemory.strategy_id || compactStrategyMemory.strategyId || ""),
                source_ledger_file: String(compactStrategyMemory.source_ledger_file || compactStrategyMemory.sourceLedgerFile || ""),
                sample_count: Number(compactStrategyMemory.sample_count || compactStrategyMemory.sampleCount || 0),
                preferred_categories: Array.isArray(compactStrategyMemory.preferred_categories || compactStrategyMemory.preferredCategories)
                    ? (compactStrategyMemory.preferred_categories || compactStrategyMemory.preferredCategories).map((item) => String(item || "")).filter(Boolean)
                    : [],
                avoid_categories: Array.isArray(compactStrategyMemory.avoid_categories || compactStrategyMemory.avoidCategories)
                    ? (compactStrategyMemory.avoid_categories || compactStrategyMemory.avoidCategories).map((item) => String(item || "")).filter(Boolean)
                    : [],
            } : null,
            pressure_recall_usage_strategy_bias: pressureRecallUsageBias?.schema ? {
                schema: String(pressureRecallUsageBias.schema || ""),
                active: pressureRecallUsageBias.active === true,
                suppressed: pressureRecallUsageBias.suppressed === true,
                stale: pressureRecallUsageBias.stale === true,
                recommendation: String(pressureRecallUsageBias.recommendation || ""),
                trust_score: Number(pressureRecallUsageBias.trust_score || 0),
                category_adjustment_cap: Number(pressureRecallUsageBias.category_adjustment_cap || 0),
                weighted_used_count: Number(pressureRecallUsageBias.weighted_used_count || 0),
                weighted_verified_count: Number(pressureRecallUsageBias.weighted_verified_count || 0),
                weighted_ignored_count: Number(pressureRecallUsageBias.weighted_ignored_count || 0),
                stale_count: Number(pressureRecallUsageBias.stale_count || 0),
                fresh_count: Number(pressureRecallUsageBias.fresh_count || 0),
                summary_ledger_file: String(pressureRecallUsageBias.summary_ledger_file || ""),
            } : null,
            pressure_recall_usage_summary: pressureRecallUsageSummary?.schema ? {
                schema: String(pressureRecallUsageSummary.schema || ""),
                ledger_file: String(pressureRecallUsageSummary.ledger_file || ""),
                target_project: String(pressureRecallUsageSummary.target_project || ""),
                weighted_totals: pressureRecallUsageSummary.weighted_totals || {},
            } : null,
        } : null,
        ptl_emergency_hint: ptlHint?.schema ? (0, group_orchestrator_coded_part_02_1.normalizeWorkerContextPtlEmergencyHintForCoordinator)(ptlHint, raw.group_id || raw.groupId || "", raw.group_session_id || raw.groupSessionId || "") : null,
        omitted_chars: Number(raw.omitted_chars || raw.omittedChars || 0),
        memory_omitted_chars: Number(raw.memory_omitted_chars || raw.memoryOmittedChars || 0),
        partial_omitted_chars: Number(raw.partial_omitted_chars || raw.partialOmittedChars || 0),
        original_task_hash: String(raw.original_task_hash || raw.originalTaskHash || ""),
        compacted_task_hash: String(raw.compacted_task_hash || raw.compactedTaskHash || ""),
        provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
        provider_ranking_provenance_preserved: providerRankingProvenancePreservation
            ? providerRankingProvenancePreservation.preserved === true
            : raw.provider_ranking_provenance_preserved === true || raw.providerRankingProvenancePreserved === true,
        post_compact_receipt_memory_usage_repair_completion_preservation: completionMemoryPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: completionMemoryPreservation
            ? completionMemoryPreservation.preserved === true
            : raw.post_compact_receipt_memory_usage_repair_completion_preserved === true || raw.postCompactReceiptMemoryUsageRepairCompletionPreserved === true,
        source: String(raw.source || "worker_context_packet_compaction_retry"),
        distillation_candidate: raw.distillation_candidate === false || raw.distillationCandidate === false ? false : true,
        at: String(raw.at || new Date().toISOString()),
    };
}
function buildWorkerContextCompactOutcomeStatsForCoordinator(entries = []) {
    const recovered = entries.filter((item) => item.status === "recovered" || item.dispatch_ready === true);
    const blocked = entries.filter((item) => item.status === "blocked" || item.dispatch_ready === false);
    const partialPolicyRows = entries.filter((item) => item.partial_compact_policy?.schema === "ccm-worker-context-partial-compact-policy-v1");
    const selectedCounts = {};
    for (const entry of partialPolicyRows) {
        for (const category of entry.partial_compact_policy?.selected_categories || []) {
            selectedCounts[category] = Number(selectedCounts[category] || 0) + 1;
        }
    }
    return {
        total: entries.length,
        recovered: recovered.length,
        blocked: blocked.length,
        memoryFirst: entries.filter((item) => item.memory_first === true).length,
        partialCompact: entries.filter((item) => item.partial_compact === true).length,
        partialCompactPolicy: partialPolicyRows.length,
        taskCompacted: entries.filter((item) => item.task_compacted === true).length,
        taskPreserved: entries.filter((item) => item.task_hash_unchanged === true).length,
        providerRankingProvenanceRequired: entries.filter((item) => item.provider_ranking_provenance_preservation?.required === true).length,
        providerRankingProvenancePreserved: entries.filter((item) => item.provider_ranking_provenance_preservation?.required === true && item.provider_ranking_provenance_preservation?.preserved === true).length,
        completionMemoryPreservationRequired: entries.filter((item) => item.post_compact_receipt_memory_usage_repair_completion_preservation?.required === true).length,
        completionMemoryPreserved: entries.filter((item) => item.post_compact_receipt_memory_usage_repair_completion_preservation?.required === true && item.post_compact_receipt_memory_usage_repair_completion_preservation?.preserved === true).length,
        totalOmittedChars: entries.reduce((sum, item) => sum + Number(item.omitted_chars || 0), 0),
        partialOmittedChars: entries.reduce((sum, item) => sum + Number(item.partial_omitted_chars || 0), 0),
        selectedCategoryCounts: selectedCounts,
        latestAt: entries.reduce((latest, item) => item.at && (!latest || item.at > latest) ? item.at : latest, ""),
    };
}
exports.WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES = [
    "constraints_and_documents",
    "contract_injections",
    "dependencies",
];
//# sourceMappingURL=group-orchestrator-coded-part-01.js.map