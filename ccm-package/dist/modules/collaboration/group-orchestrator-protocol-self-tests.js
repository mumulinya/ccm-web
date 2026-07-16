"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
const fs = __importStar(require("fs"));
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
function runCoordinatorProtocolSelfTest() {
    const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
        id: "coordinator-protocol-self-test",
        members: [
            { project: "coordinator", role: "coordinator" },
            { project: "backend-service", agent: "claudecode" },
            { project: "web-app", agent: "claudecode" },
        ],
    });
    const message = "按接口文档实现订单退款审核功能，后端提供审核接口，前端订单详情页增加审核入口，并完成验证。";
    const sharedFilesContext = [
        "[共享文档 refund-prd.md]",
        "接口：POST /api/refunds/:id/audit",
        "入参字段：approved(boolean), reason(string)",
        "状态流转：pending_review -> approved/rejected",
        "验收：后端校验权限并记录操作日志；前端订单详情页展示审核入口和结果提示。",
    ].join("\n");
    const result = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
        group,
        message,
        sharedFilesContext,
    });
    const shortDocResult = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
        group,
        message: "请按这个文档做。",
        sharedFilesContext,
    });
    const ragContext = [
        "检索方式：群聊/项目标签优先",
        "引用：refund-memory.md#0",
        "",
        "[知识库参考分片 #1 - 来源文件: refund-memory.md#0 (混合得分: 9.20；关键词: 8.10；向量: 0.34)]",
        "历史决策：退款审核必须记录操作日志；接口 POST /api/refunds/:id/audit 需要权限校验；验收要求包含前端结果提示。",
    ].join("\n");
    const ragResult = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
        group,
        message: "按之前退款审核的约定继续实现，并完成验证。",
        ragContext,
        ragCitations: ["refund-memory.md#0"],
        ragScoped: true,
    });
    const informationalResult = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
        group,
        message: "这个是一个什么项目？请介绍一下架构和主要功能。",
    });
    const informationalBoundaryPass = informationalResult.dispatchPolicy?.action === "direct_answer"
        && informationalResult.assignments?.length === 0
        && informationalResult.delegated?.length === 0;
    const llmParsedWithoutDocumentFindings = {
        intent: "implementation",
        summary: "实现订单退款审核功能",
        domains: ["backend", "frontend"],
        deliverables: ["后端接口", "前端审核入口", "验证记录"],
        constraints: [],
        missingInfo: [],
        shouldDelegate: true,
        executionOrder: "backend_first",
        reasoning: {
            knownFacts: ["接口 POST /api/refunds/:id/audit 已在共享文档定义"],
            assumptionsToVerify: ["当前后端尚未实现该接口"],
            verificationAssertions: ["权限校验、操作日志和前端结果提示均有真实证据"],
            dependencyRationale: ["前端对接依赖后端先确认接口契约"],
            replanTriggers: ["实际接口字段与文档不一致时重规划"],
        },
        targets: [
            { project: "backend-service", task: "实现退款审核接口并完成权限校验。", reason: "后端负责 API 和业务规则", dependsOn: "" },
            { project: "web-app", task: "在订单详情页增加退款审核入口并对接后端接口。", reason: "前端负责页面交互", dependsOn: "backend-service" },
        ],
    };
    const llmFallbackAnalysis = (0, group_orchestrator_1.buildDocumentAwareAnalysis)(group, { message, sharedFilesContext });
    const llmAnalysis = (0, group_orchestrator_1.normalizeLlmAnalysis)(llmParsedWithoutDocumentFindings, llmFallbackAnalysis);
    const llmTargets = (0, group_orchestrator_1.sanitizeLlmTargets)(group, llmParsedWithoutDocumentFindings, message, llmAnalysis, true);
    const llmDocumentGuardPass = llmTargets.length >= 2
        && llmAnalysis.documentFindings.some((item) => item.includes("/api/refunds"))
        && llmTargets.every((item) => String(item.task || "").includes("文档依据/验收关注") && String(item.task || "").includes("/api/refunds"));
    const semanticReasoningPass = llmAnalysis.reasoning.knownFacts.length === 1
        && llmAnalysis.reasoning.assumptionsToVerify.length === 1
        && llmAnalysis.reasoning.verificationAssertions.length === 1
        && llmAnalysis.reasoning.dependencyRationale[0].includes("接口契约")
        && llmAnalysis.reasoning.replanTriggers[0].includes("重规划");
    const assignments = Array.isArray(result.assignments) ? result.assignments : [];
    const taskChecks = assignments.map((assignment) => {
        const task = String(assignment.task || "");
        return {
            project: assignment.project,
            dependsOn: assignment.dependsOn || "",
            hasWorkerPacket: task.includes("主 Agent 工作单"),
            hasRuntimeWorkerContextPacket: task.includes("WorkerContextPacket") && task.includes("ACK gate"),
            hasStructuredWorkerPacket: !!assignment.worker_context_packet?.packet_id,
            hasUnderstanding: task.includes("需求理解"),
            hasVerification: task.includes("验证要求"),
            hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
            hasDocumentEvidence: task.includes("文档依据/验收关注") && task.includes("/api/refunds"),
            hasCoordinatorWorkerProtocol: task.includes("Claude Code Coordinator/Worker") && task.includes("Research/Implementation/Verification"),
            forbidsLazyDelegation: task.includes("禁止空泛回复"),
        };
    });
    const backendProject = assignments.find((item) => /cloud|api|server|backend|service|后端/i.test(String(item.project || "")))?.project || "";
    const frontendDependsOnBackend = !backendProject || taskChecks
        .filter((item) => /app|web|front|frontend|前端/i.test(String(item.project || "")))
        .every((item) => item.dependsOn === backendProject);
    const shortDocAssignments = Array.isArray(shortDocResult.assignments) ? shortDocResult.assignments : [];
    const shortDocBackendProject = shortDocAssignments.find((item) => /cloud|api|server|backend|service|后端/i.test(String(item.project || "")))?.project || "";
    const shortDocBackendFirstPass = shortDocResult.executionOrder === "backend_first"
        && shortDocAssignments.length >= 2
        && shortDocAssignments
            .filter((item) => /app|web|front|frontend|前端/i.test(String(item.project || "")))
            .every((item) => !shortDocBackendProject || item.dependsOn === shortDocBackendProject);
    const ragAssignments = Array.isArray(ragResult.assignments) ? ragResult.assignments : [];
    const ragInjectionPass = ragResult.analysis?.ragContext?.injected === true
        && ragResult.analysis?.ragContext?.citations?.includes("refund-memory.md#0")
        && ragResult.analysis?.documentFindings?.some((item) => item.includes("退款审核") || item.includes("/api/refunds"))
        && ragAssignments.length > 0
        && ragAssignments.every((item) => String(item.task || "").includes("文档依据/验收关注"));
    const reactiveContext = (0, group_orchestrator_1.buildReactiveCompactionContext)(`SUMMARY_START ${"a".repeat(80_000)} LATEST_USER_REQUIREMENT`);
    const reactiveCompactionPass = reactiveContext.length < 55_000
        && reactiveContext.includes("SUMMARY_START")
        && reactiveContext.includes("LATEST_USER_REQUIREMENT")
        && (0, group_orchestrator_1.isContextLimitError)(new Error("HTTP 413: prompt too long"));
    const structuredFallbackPolicyPass = !(0, group_orchestrator_1.isStructuredCoordinatorFallbackAllowed)({ source: "group-chat", message: "帮我优化一下项目" })
        && (0, group_orchestrator_1.isStructuredCoordinatorFallbackAllowed)({ source: "task", message: "【主 Agent 业务开发工作单】\n任务标题：退款审核\n业务目标：实现退款审核\n验收标准：接口和页面验证通过" });
    const sanitizedCoordinatorSummary = (0, group_orchestrator_1.sanitizeCoordinatorUserText)("web-app 的 <task-notification> 表示已经提交结果，但 CCM_AGENT_RECEIPT 缺少 verification，trace_id=abc。", "主 Agent 已整理子 Agent 的结果。", 500);
    const coordinatorUserSanitizerPass = !group_orchestrator_1.COORDINATOR_USER_INTERNAL_TEXT_PATTERN.test(sanitizedCoordinatorSummary)
        && sanitizedCoordinatorSummary.includes("web-app")
        && (sanitizedCoordinatorSummary.includes("结果") || sanitizedCoordinatorSummary.includes("主 Agent"));
    const codedNotificationSummary = (0, group_orchestrator_1.buildCodedCoordinatorSummary)(group, [
        [
            "<task-notification>",
            "<task-id>web-app</task-id>",
            "<status>completed</status>",
            "<receipt-status>done</receipt-status>",
            "<summary>完成订单详情页审核入口，已运行 npm test。</summary>",
            "<result>修改 OrderDetail.vue，npm test passed。</result>",
            "</task-notification>",
        ].join("\n"),
        [
            "<task-notification>",
            "<task-id>backend-service</task-id>",
            "<status>missing_receipt</status>",
            "<receipt-status>missing</receipt-status>",
            "<summary>Worker completed without CCM_AGENT_RECEIPT trace_id=hidden。</summary>",
            "<result>已处理接口入口，但缺少可验收说明。</result>",
            "</task-notification>",
        ].join("\n"),
    ]);
    const codedNotificationText = String(codedNotificationSummary?.content || "");
    const codedNotificationDigestPass = codedNotificationSummary?.structured_summary?.schema === "ccm-coded-coordinator-notification-digest-v1"
        && codedNotificationText.includes("web-app：已提交结果")
        && codedNotificationText.includes("backend-service：结果说明待补")
        && codedNotificationText.includes("补齐可验收的结果说明")
        && !codedNotificationText.includes("已收到 2 个子 Agent 回复")
        && !group_orchestrator_1.COORDINATOR_USER_INTERNAL_TEXT_PATTERN.test(codedNotificationText);
    const lazyFollowUp = (0, group_orchestrator_1.normalizeCoordinatorFollowUpTask)({
        project: "web-app",
        summary: "继续修复前端失败点",
        task: "基于你的发现继续修复一下。",
        reason: "validate.test.ts:58 断言失败，订单审核入口没有展示 rejected 状态。",
    }, "基于你的发现继续修复一下。", "validate.test.ts:58 断言失败，订单审核入口没有展示 rejected 状态。", "web-app", {
        gaps: ["缺少 validate.test.ts:58 失败断言的修复证据"],
        checks: [{ detail: "npm test failed at validate.test.ts:58", evidence: ["validate.test.ts:58 expected rejected label"] }],
        workerReviews: [{ project: "web-app", gaps: ["OrderDetail.vue 缺少 rejected 状态展示"], verification: ["npm test failed"] }],
    });
    const synthesizedFollowUp = (0, group_orchestrator_1.normalizeCoordinatorFollowUpTask)({
        project: "web-app",
        summary: "修复 rejected 展示",
        task: "修复 frontend/src/views/OrderDetail.vue 中退款审核 rejected 状态展示；validate.test.ts:58 当前断言失败。完成后运行 npm test，并提交结果说明。",
        reason: "前端 rejected 状态缺少可见提示。",
    }, "修复 frontend/src/views/OrderDetail.vue 中退款审核 rejected 状态展示；validate.test.ts:58 当前断言失败。完成后运行 npm test，并提交结果说明。", "前端 rejected 状态缺少可见提示。", "web-app");
    const followUpSpecQualityPass = lazyFollowUp.quality?.pass === false
        && lazyFollowUp.quality?.auto_enriched === true
        && lazyFollowUp.message.includes("validate.test.ts:58")
        && lazyFollowUp.message.includes("完成标准")
        && !/基于你的发现/.test(lazyFollowUp.message)
        && synthesizedFollowUp.quality?.pass === true;
    const pass = String(result.content || "").includes("主 Agent 计划")
        && Array.isArray(result.coordinationPlan?.phases)
        && result.coordinationPlan.phases.length >= 5
        && result.coordinationPlan.strategy === "research_synthesis_implementation_verification"
        && result.coordinationPlan.phases.some((phase) => phase.includes("研究与综合"))
        && assignments.length >= 2
        && result.executionOrder === "backend_first"
        && frontendDependsOnBackend
        && taskChecks.every((item) => item.hasWorkerPacket && item.hasRuntimeWorkerContextPacket && item.hasStructuredWorkerPacket && item.hasUnderstanding && item.hasVerification && item.hasReceipt && item.hasDocumentEvidence && item.hasCoordinatorWorkerProtocol && item.forbidsLazyDelegation)
        && llmDocumentGuardPass
        && semanticReasoningPass
        && shortDocBackendFirstPass
        && reactiveCompactionPass;
    const finalPass = pass && structuredFallbackPolicyPass && informationalBoundaryPass && ragInjectionPass && coordinatorUserSanitizerPass && codedNotificationDigestPass && followUpSpecQualityPass;
    return {
        pass: finalPass,
        contentHasPlan: String(result.content || "").includes("主 Agent 计划"),
        coordinationPlan: result.coordinationPlan || null,
        assignmentCount: assignments.length,
        assignments: assignments.map((item) => item.project),
        taskChecks,
        executionOrder: result.executionOrder || "",
        coordinationStrategy: result.coordinationStrategy || "",
        frontendDependsOnBackend,
        llmDocumentGuardPass,
        semanticReasoningPass,
        shortDocBackendFirstPass,
        shortDocExecutionOrder: shortDocResult.executionOrder || "",
        ragInjectionPass,
        ragCitations: ragResult.analysis?.ragContext?.citations || [],
        reactiveCompactionPass,
        structuredFallbackPolicyPass,
        informationalBoundaryPass,
        coordinatorUserSanitizerPass,
        codedNotificationDigestPass,
        followUpSpecQualityPass,
        lazyFollowUpQuality: lazyFollowUp.quality,
        lazyFollowUpMessage: lazyFollowUp.message,
        synthesizedFollowUpQuality: synthesizedFollowUp.quality,
        codedNotificationSummary,
        sanitizedCoordinatorSummary,
        documentFindings: Array.isArray(result.analysis?.documentFindings) ? result.analysis.documentFindings : [],
    };
}
function runWorkerContextPreDispatchGateSelfTest() {
    const groupId = `worker-context-pre-dispatch-gate-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "api", agent: "claude-code" },
            ],
        });
        const largeTask = [
            "请直接在 api 项目实现并修复 PRE_DISPATCH_GATE_SENTINEL，修改代码后运行 npm run check。",
            "需要携带一段很长的群聊上下文以触发 WorkerContextPacket over_budget。",
            "CONTEXT_BLOCK ".repeat(1400),
        ].join("\n");
        const assignment = (0, group_orchestrator_1.buildAssignment)({ project: "api", agent: "claude-code" }, largeTask, "selftest context budget gate", "", {
            group,
            autoWorkerContextCompactRetry: false,
            workerContextUsageOptions: {
                maxTokens: 1000,
                autoCompactBufferTokens: 120,
            },
        });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.source === "worker_context_packet_pre_dispatch_gate") || {};
        const gate = assignment.worker_context_pre_dispatch_gate || {};
        const result = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
            group,
            message: largeTask,
            context: "Phase 104 selftest: over-budget WorkerContextPacket must hold dispatch before child Agent launch.",
            autoWorkerContextCompactRetry: false,
            workerContextUsageOptions: {
                maxTokens: 1000,
                autoCompactBufferTokens: 120,
            },
        });
        const routedAssignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const checks = {
            assignmentGateBlocksOverBudget: gate.schema === "ccm-worker-context-pre-dispatch-gate-v1"
                && gate.dispatch_ready === false
                && gate.must_repair_before_dispatch === true
                && gate.pressure_status === "over_budget"
                && assignment.dispatchReady === false
                && assignment.status === "blocked",
            bindingLedgerPersistsGate: binding.schema === "ccm-worker-context-packet-assignment-binding-v1"
                && binding.worker_context_packet_id === assignment.worker_context_packet?.packet_id
                && binding.worker_context_pre_dispatch_gate?.dispatch_ready === false
                && binding.worker_context_packet_context_usage?.status === "over_budget",
            orchestratorHoldsBlockedDispatch: result.dispatchPolicy?.action === "hold"
                && result.dispatchPolicy?.risk === "worker_context_packet_over_budget"
                && routedAssignment.worker_context_pre_dispatch_gate?.dispatch_ready === false
                && !String(result.content || "").includes("@api"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            gate: {
                gate_id: gate.gate_id || "",
                dispatch_ready: gate.dispatch_ready,
                pressure_status: gate.pressure_status || "",
                total_tokens: gate.total_tokens || 0,
                max_tokens: gate.max_tokens || 0,
                free_tokens: gate.free_tokens || 0,
            },
            binding: {
                binding_id: binding.binding_id || "",
                source: binding.source || "",
                dispatch_ready: binding.dispatch_ready,
                usage_status: binding.worker_context_packet_context_usage?.status || "",
            },
            dispatchPolicy: result.dispatchPolicy,
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextCompactionRetrySelfTest() {
    const groupId = `worker-context-compaction-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "api", agent: "claude-code" },
            ],
        });
        const largeTask = [
            "请直接在 api 项目实现并修复 COMPACTION_RETRY_SENTINEL，修改代码后运行 npm run check。",
            "这段上下文很长，第一次 WorkerContextPacket 会 over_budget，但自动 compact retry 应该保留首尾和回执契约后恢复派发。",
            "CONTEXT_RETRY_BLOCK ".repeat(1600),
            "最后仍然必须输出 CCM_AGENT_RECEIPT，并说明验证结果。",
        ].join("\n");
        const result = (0, group_orchestrator_1.runCodedGroupOrchestrator)({
            group,
            message: largeTask,
            context: "Phase 105 selftest: over-budget WorkerContextPacket should compact/rerender and recover dispatch.",
            workerContextUsageOptions: {
                maxTokens: 4000,
                autoCompactBufferTokens: 300,
            },
            workerContextRetryOptions: {
                maxTaskChars: 2200,
            },
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const retry = assignment.context_compaction_retry || assignment.worker_context_packet?.context_compaction_retry || {};
        const gate = assignment.worker_context_pre_dispatch_gate || {};
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.assignment_id === assignment.assignmentId || item.assignment_id === assignment.assignment_id) || {};
        const checks = {
            retryRecoveredDispatch: retry.schema === "ccm-worker-context-compaction-retry-v1"
                && retry.status === "recovered"
                && retry.from_usage_status === "over_budget"
                && retry.retry_usage_status !== "over_budget"
                && retry.recovered_dispatch_ready === true,
            assignmentDispatchReadyAfterRetry: assignment.dispatchReady !== false
                && assignment.status === "pending"
                && gate.dispatch_ready !== false
                && gate.auto_retry_status === "recovered"
                && assignment.worker_context_packet?.context_usage?.status !== "over_budget",
            orchestratorStillDispatchesMention: result.dispatchPolicy?.action === "delegate"
                && String(result.content || "").includes("@api")
                && !String(result.dispatchPolicy?.risk || "").includes("worker_context_packet_over_budget"),
            bindingPersistsRetryProof: binding.source === "worker_context_packet_pre_dispatch_gate"
                && binding.worker_context_packet_context_usage?.status !== "over_budget"
                && binding.worker_context_pre_dispatch_gate?.auto_retry_status === "recovered"
                && binding.worker_context_packet_compaction_retry?.status === "recovered",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retry: {
                status: retry.status || "",
                from_usage_status: retry.from_usage_status || "",
                retry_usage_status: retry.retry_usage_status || "",
                original_task_chars: retry.original_task_chars || 0,
                compacted_task_chars: retry.compacted_task_chars || 0,
            },
            gate: {
                dispatch_ready: gate.dispatch_ready,
                auto_retry_status: gate.auto_retry_status || "",
                pressure_status: gate.pressure_status || "",
                total_tokens: gate.total_tokens || 0,
                max_tokens: gate.max_tokens || 0,
            },
            dispatchPolicy: result.dispatchPolicy,
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextMemoryFirstCompactionRetrySelfTest() {
    const groupId = `worker-context-memory-first-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const hookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "api", agent: "claude-code" },
            ],
        });
        const task = "请在 api 项目检查 MEMORY_FIRST_RETRY_SENTINEL，保持 CCM_AGENT_RECEIPT 和验证记录。";
        const memory = {
            schema: "ccm-group-memory-context-v1",
            group_id: groupId,
            target_project: "api",
            rendered_text: `MEMORY_FIRST_RETRY_SENTINEL\n${"重要群聊记忆片段 ".repeat(1800)}\n必须保留 receipt/verification 约束。`,
            typed_memory_recall: {
                recalled: Array.from({ length: 40 }, (_, index) => ({
                    relPath: `memory-${index}.md`,
                    type: "reference",
                    snippet: `typed recall ${index} ${"context ".repeat(20)}`,
                })),
            },
            global_memory: `global recall ${"mission ".repeat(1200)}`,
        };
        const assignment = (0, group_orchestrator_1.buildAssignment)({ project: "api", agent: "claude-code" }, task, "selftest memory-first compact retry", "", {
            group,
            memory,
            workerContextUsageOptions: {
                maxTokens: 3800,
                autoCompactBufferTokens: 120,
            },
            workerContextRetryOptions: {
                memory: {
                    maxRenderedChars: 900,
                    maxJsonChars: 600,
                    maxRecallItems: 3,
                },
                maxTaskChars: 2200,
            },
        });
        const retry = assignment.context_compaction_retry || assignment.worker_context_packet?.context_compaction_retry || {};
        const gate = assignment.worker_context_pre_dispatch_gate || {};
        const memoryProof = assignment.worker_context_packet?.memory_reinjection_proof || {};
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.assignment_id === assignment.assignmentId || item.assignment_id === assignment.assignment_id) || {};
        const hookLedger = (0, group_orchestrator_1.readWorkerContextCompactHookLedgerForCoordinator)(groupId);
        const hookRunId = String(retry.compact_hook_run_id || binding.worker_context_packet_compact_hook_run_id || "");
        const hookEntries = (hookLedger.entries || []).filter((item) => item.hook_run_id === hookRunId);
        const checks = {
            memoryFirstRetryRecovered: retry.schema === "ccm-worker-context-compaction-retry-v1"
                && retry.status === "recovered"
                && retry.memory_first === true
                && retry.method === "memory_first_deterministic_context_compaction"
                && retry.memory_compaction?.schema === "ccm-worker-context-memory-first-compaction-v1"
                && retry.from_usage_status === "over_budget"
                && retry.retry_usage_status !== "over_budget",
            taskWasNotCompacted: assignment.task === task
                && retry.original_task_hash === retry.compacted_task_hash
                && Number(retry.original_task_chars || 0) === Number(retry.compacted_task_chars || 0),
            dispatchReadyAfterMemoryRetry: assignment.dispatchReady !== false
                && gate.dispatch_ready !== false
                && gate.auto_retry_status === "recovered"
                && assignment.worker_context_packet?.context_usage?.status !== "over_budget",
            bindingPersistsMemoryRetry: binding.worker_context_packet_compaction_retry?.memory_first === true
                && binding.worker_context_packet_compaction_retry?.memory_compaction?.status === "compacted"
                && binding.worker_context_pre_dispatch_gate?.dispatch_ready !== false,
            memoryProofReinjectedCompactedMemory: memoryProof.schema === "ccm-worker-context-memory-reinjection-proof-v1"
                && memoryProof.status === "compacted_reinjected"
                && memoryProof.memory_first === true
                && memoryProof.hash_matches_compaction === true
                && memoryProof.packet_memory_hash === retry.memory_compaction?.compacted_memory_hash,
            bindingRenderProbeShowsMemoryProof: binding.worker_context_packet_memory_reinjection_proof?.status === "compacted_reinjected"
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_platform_memory === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_memory_reinjection_proof === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_memory_compaction_hash === true,
            compactHookLedgerRecordsPreAndPost: !!hookRunId
                && retry.compact_hook_run_id === hookRunId
                && hookEntries.some((item) => item.phase === "pre" && item.initial_usage_status === "over_budget")
                && hookEntries.some((item) => item.phase === "post" && item.final_usage_status !== "over_budget" && item.dispatch_ready === true)
                && binding.worker_context_packet_compact_hook_run_id === hookRunId,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retry: {
                status: retry.status || "",
                method: retry.method || "",
                memory_first: retry.memory_first === true,
                from_usage_status: retry.from_usage_status || "",
                retry_usage_status: retry.retry_usage_status || "",
                memory_omitted_chars: retry.memory_compaction?.omitted_chars || 0,
                memory_reinjection_status: memoryProof.status || "",
                compact_hook_run_id: retry.compact_hook_run_id || "",
            },
            hookLedger: {
                file: hookLedger.file || "",
                hook_run_id: hookRunId,
                entry_count: hookEntries.length,
                pre_count: hookEntries.filter((item) => item.phase === "pre").length,
                post_count: hookEntries.filter((item) => item.phase === "post").length,
            },
            gate: {
                dispatch_ready: gate.dispatch_ready,
                auto_retry_status: gate.auto_retry_status || "",
                pressure_status: gate.pressure_status || "",
                total_tokens: gate.total_tokens || 0,
                max_tokens: gate.max_tokens || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextPartialCompactionRetrySelfTest() {
    const groupId = `worker-context-partial-compaction-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const hookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "api", agent: "claude-code" },
            ],
        });
        const task = "请在 api 项目处理 PARTIAL_COMPACT_SENTINEL，并保留 replay repair 回执引用。";
        const replayRepairDispatchBriefs = [{
                brief_id: "brief-partial-compact-selftest",
                work_item_id: "work-item-partial-compact-selftest",
                source: "provider_reproof_repair",
                target_project: "api",
                proof_entry_id: "proof-entry-partial-compact-selftest",
                request_patch_checksum: "patch-checksum-partial-compact-selftest",
                provider_reproof_status: "needs_reproof",
                provider_reproof_reason: `PARTIAL_COMPACT_SENTINEL ${"native provider proof repair narrative ".repeat(1700)}必须保留 proof/request/runner/execution 证据。`,
                reproof_candidate_id: "candidate-partial-compact-selftest",
                timeline_binding_id: "timeline-partial-compact-selftest",
                original_work_item_id: "original-work-item-partial-compact-selftest",
                request_telemetry_session_status: "bound",
                request_telemetry_dispatch_status: "bound",
                runner_request_id: "runner-request-partial-compact-selftest",
                execution_id: "execution-partial-compact-selftest",
                required_receipt_reference: true,
                should_create_real_task: false,
            }];
        const baseAssignment = {
            project: "api",
            task,
            reason: "selftest replay brief partial compact retry",
            dependsOn: "",
            taskFingerprint: "partial-compact-selftest",
            dispatchKey: `${groupId}|coordinator|api|partial-compact-selftest`,
            assignmentId: `api::${groupId}|coordinator|api|partial-compact-selftest::initial::1`,
            attempt: 1,
            sourceProject: "coordinator",
            scopeId: groupId,
        };
        const options = {
            group,
            workerContextUsageOptions: {
                maxTokens: 3400,
                autoCompactBufferTokens: 120,
            },
            workerContextRetryOptions: {
                replayRepairDispatchBriefs: {
                    maxStringChars: 180,
                    maxIdChars: 140,
                },
                maxTaskChars: 2200,
            },
        };
        const initialPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", replayRepairDispatchBriefs, options);
        const initialGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, initialPacket);
        const result = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(baseAssignment, "", replayRepairDispatchBriefs, initialPacket, initialGate, options);
        const assignment = {
            ...baseAssignment,
            task: result.task,
            original_task_hash: result.retry ? result.retry.original_task_hash : "",
            context_compaction_retry: result.retry,
            status: result.gate.dispatch_ready === false ? "blocked" : "pending",
            dispatchReady: result.gate.dispatch_ready !== false,
            dispatch_ready: result.gate.dispatch_ready !== false,
            worker_context_pre_dispatch_gate: result.gate,
            workerContextPreDispatchGate: result.gate,
            blockers: result.gate.dispatch_ready === false ? [result.gate.reason] : [],
            worker_context_packet: result.packet,
        };
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment);
        const retry = result.retry || result.packet?.context_compaction_retry || {};
        const partial = retry.partial_compaction || retry.partialCompaction || {};
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)(result.packet);
        const finalBrief = Array.isArray(result.packet?.replay_repair_dispatch_briefs)
            ? result.packet.replay_repair_dispatch_briefs[0] || {}
            : {};
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.assignment_id === baseAssignment.assignmentId) || {};
        const hookLedger = (0, group_orchestrator_1.readWorkerContextCompactHookLedgerForCoordinator)(groupId);
        const hookRunId = String(retry.compact_hook_run_id || binding.worker_context_packet_compact_hook_run_id || "");
        const hookEntries = (hookLedger.entries || []).filter((item) => item.hook_run_id === hookRunId);
        const checks = {
            initialGateBlockedByReplayBrief: initialGate.dispatch_ready === false
                && initialPacket.context_usage?.status === "over_budget",
            partialRetryRecovered: retry.schema === "ccm-worker-context-compaction-retry-v1"
                && retry.status === "recovered"
                && retry.method === "replay_brief_partial_compact"
                && retry.partial_compact === true
                && partial.schema === "ccm-worker-context-replay-brief-partial-compaction-v1"
                && partial.category === "replay_repair_dispatch_briefs"
                && Number(partial.omitted_chars || 0) > 1000,
            taskWasNotCompacted: result.task === task
                && retry.original_task_hash === retry.compacted_task_hash
                && Number(retry.original_task_chars || 0) === Number(retry.compacted_task_chars || 0),
            replayBriefIdentifiersPreserved: finalBrief.brief_id === "brief-partial-compact-selftest"
                && finalBrief.work_item_id === "work-item-partial-compact-selftest"
                && finalBrief.proof_entry_id === "proof-entry-partial-compact-selftest"
                && finalBrief.request_patch_checksum === "patch-checksum-partial-compact-selftest"
                && finalBrief.runner_request_id === "runner-request-partial-compact-selftest"
                && finalBrief.execution_id === "execution-partial-compact-selftest"
                && finalBrief.should_create_real_task === false
                && finalBrief.required_receipt_reference === true
                && String(finalBrief.provider_reproof_reason || "").includes("PARTIAL_COMPACT_SENTINEL"),
            bindingPersistsPartialCompaction: binding.worker_context_packet_partial_compaction?.schema === "ccm-worker-context-replay-brief-partial-compaction-v1"
                && binding.worker_context_packet_compaction_retry?.partial_compact === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_partial_compaction === true,
            renderShowsPartialCompaction: rendered.includes("partial_compaction=replay_repair_dispatch_briefs")
                && rendered.includes("Replay repair dispatch brief"),
            compactHookLedgerRecordsPartialPost: !!hookRunId
                && hookEntries.some((item) => item.phase === "pre" && item.initial_usage_status === "over_budget")
                && hookEntries.some((item) => item.phase === "post"
                    && item.final_usage_status !== "over_budget"
                    && item.dispatch_ready === true
                    && item.result_summary?.partial_compact === true
                    && item.result_summary?.partial_compaction_category === "replay_repair_dispatch_briefs"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retry: {
                status: retry.status || "",
                method: retry.method || "",
                partial_compact: retry.partial_compact === true,
                partial_compaction_schema: partial.schema || "",
                partial_omitted_chars: partial.omitted_chars || 0,
                original_task_chars: retry.original_task_chars || 0,
                compacted_task_chars: retry.compacted_task_chars || 0,
            },
            hookLedger: {
                file: hookLedger.file || "",
                hook_run_id: hookRunId,
                entry_count: hookEntries.length,
            },
            gate: {
                dispatch_ready: result.gate.dispatch_ready,
                auto_retry_status: result.gate.auto_retry_status || "",
                total_tokens: result.gate.total_tokens || 0,
                max_tokens: result.gate.max_tokens || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextMetadataPartialCompactionRetrySelfTest() {
    const groupId = `worker-context-metadata-partial-compaction-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const hookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "frontend", agent: "cursor" },
            ],
        });
        const task = "请在 frontend 项目处理 METADATA_PARTIAL_SENTINEL，并保留 contract/dependency 回执。";
        const analysis = {
            summary: "验证 WorkerContextPacket metadata partial compact",
            constraints: Array.from({ length: 10 }, (_, index) => `METADATA_PARTIAL_SENTINEL constraint ${index}: ${"必须保留用户约束和验收边界 ".repeat(80)}`),
            documentFindings: Array.from({ length: 14 }, (_, index) => `docs/spec-${index}.md: ${"接口字段、页面交互、验收规则、历史决策 ".repeat(100)}`),
        };
        const contractInjections = Array.from({ length: 6 }, (_, index) => ({
            injection_id: `contract-metadata-partial-${index}`,
            source_agent: "backend",
            target_agent: "frontend",
            endpoint: `POST /api/metadata-partial/${index}`,
            summary: `METADATA_CONTRACT_SENTINEL ${index}: ${"contract change narrative ".repeat(500)}`,
            required_receipt_reference: true,
        }));
        const workerContextDependencies = Array.from({ length: 7 }, (_, index) => ({
            project: `dependency-${index}`,
            reason: `METADATA_DEPENDENCY_SENTINEL ${index}: ${"dependency blocker narrative ".repeat(520)}`,
            dependency_id: `dep-metadata-partial-${index}`,
            required_receipt_reference: true,
        }));
        const baseAssignment = {
            project: "frontend",
            task,
            reason: "selftest metadata partial compact retry",
            dependsOn: "",
            taskFingerprint: "metadata-partial-compact-selftest",
            dispatchKey: `${groupId}|coordinator|frontend|metadata-partial-compact-selftest`,
            assignmentId: `frontend::${groupId}|coordinator|frontend|metadata-partial-compact-selftest::initial::1`,
            attempt: 1,
            sourceProject: "coordinator",
            scopeId: groupId,
        };
        const options = {
            group,
            analysis,
            contractInjections,
            workerContextDependencies,
            workerContextUsageOptions: {
                maxTokens: 6400,
                autoCompactBufferTokens: 120,
            },
            workerContextRetryOptions: {
                metadata: {
                    maxItems: 4,
                    maxStringChars: 160,
                    maxContractItems: 4,
                    maxContractSummaryChars: 160,
                    maxDependencyReasonChars: 160,
                },
                maxTaskChars: 2200,
            },
        };
        const initialPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", [], options);
        const initialGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, initialPacket);
        const result = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(baseAssignment, "", [], initialPacket, initialGate, options);
        const assignment = {
            ...baseAssignment,
            task: result.task,
            original_task_hash: result.retry ? result.retry.original_task_hash : "",
            context_compaction_retry: result.retry,
            status: result.gate.dispatch_ready === false ? "blocked" : "pending",
            dispatchReady: result.gate.dispatch_ready !== false,
            dispatch_ready: result.gate.dispatch_ready !== false,
            worker_context_pre_dispatch_gate: result.gate,
            workerContextPreDispatchGate: result.gate,
            worker_context_packet: result.packet,
        };
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment);
        const retry = result.retry || result.packet?.context_compaction_retry || {};
        const partial = retry.partial_compaction || retry.partialCompaction || {};
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)(result.packet);
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.assignment_id === baseAssignment.assignmentId) || {};
        const hookLedger = (0, group_orchestrator_1.readWorkerContextCompactHookLedgerForCoordinator)(groupId);
        const hookRunId = String(retry.compact_hook_run_id || binding.worker_context_packet_compact_hook_run_id || "");
        const hookEntries = (hookLedger.entries || []).filter((item) => item.hook_run_id === hookRunId);
        const finalContract = result.packet?.contract_injections?.[0] || {};
        const finalDependency = result.packet?.dependencies?.[0] || {};
        const checks = {
            initialGateBlockedByMetadata: initialGate.dispatch_ready === false
                && initialPacket.context_usage?.status === "over_budget"
                && (initialPacket.context_usage?.top_categories || []).some((item) => ["constraints_and_documents", "contract_injections", "dependencies"].includes(item.id)),
            metadataRetryRecovered: retry.schema === "ccm-worker-context-compaction-retry-v1"
                && retry.status === "recovered"
                && retry.method === "metadata_partial_compact"
                && retry.partial_compact === true
                && partial.schema === "ccm-worker-context-metadata-partial-compaction-v1"
                && partial.category === "worker_context_metadata"
                && Number(partial.omitted_chars || 0) > 1000,
            taskWasNotCompacted: result.task === task
                && retry.original_task_hash === retry.compacted_task_hash
                && Number(retry.original_task_chars || 0) === Number(retry.compacted_task_chars || 0),
            metadataIdentifiersPreserved: finalContract.injection_id === "contract-metadata-partial-0"
                && finalContract.endpoint === "POST /api/metadata-partial/0"
                && finalContract.required_receipt_reference === true
                && finalDependency.project === "dependency-0"
                && finalDependency.dependency_id === "dep-metadata-partial-0"
                && Array.isArray(result.packet?.constraints)
                && result.packet.constraints[0]?.includes("METADATA_PARTIAL_SENTINEL"),
            bindingPersistsMetadataPartialCompaction: binding.worker_context_packet_partial_compaction?.schema === "ccm-worker-context-metadata-partial-compaction-v1"
                && binding.worker_context_packet_compaction_retry?.partial_compact === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_partial_compaction === true,
            renderShowsMetadataPartialCompaction: rendered.includes("partial_compaction=worker_context_metadata")
                && rendered.includes("contract injection"),
            compactHookLedgerRecordsMetadataPost: !!hookRunId
                && hookEntries.some((item) => item.phase === "pre" && item.initial_usage_status === "over_budget")
                && hookEntries.some((item) => item.phase === "post"
                    && item.final_usage_status !== "over_budget"
                    && item.dispatch_ready === true
                    && item.result_summary?.partial_compact === true
                    && item.result_summary?.partial_compaction_category === "worker_context_metadata"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retry: {
                status: retry.status || "",
                method: retry.method || "",
                partial_compact: retry.partial_compact === true,
                partial_compaction_schema: partial.schema || "",
                partial_omitted_chars: partial.omitted_chars || 0,
                original_task_chars: retry.original_task_chars || 0,
                compacted_task_chars: retry.compacted_task_chars || 0,
            },
            gate: {
                dispatch_ready: result.gate.dispatch_ready,
                auto_retry_status: result.gate.auto_retry_status || "",
                total_tokens: result.gate.total_tokens || 0,
                max_tokens: result.gate.max_tokens || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextMetadataPartialCompactPolicySelfTest() {
    const groupId = `worker-context-metadata-partial-compact-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const hookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "frontend", agent: "cursor" },
            ],
        });
        const task = "请在 frontend 项目处理 POLICY_PARTIAL_SENTINEL，并保留未被策略选中的上下文字段。";
        const analysis = {
            summary: "验证 WorkerContextPacket partial compact policy",
            constraints: Array.from({ length: 12 }, (_, index) => `POLICY_PARTIAL_SENTINEL constraint ${index}: ${"文档约束压力来源 ".repeat(160)}`),
            documentFindings: Array.from({ length: 16 }, (_, index) => `docs/policy-${index}.md: ${"验收规则字段页面交互历史决策 ".repeat(180)}`),
        };
        const contractInjections = [{
                injection_id: "contract-policy-unselected",
                source_agent: "backend",
                target_agent: "frontend",
                endpoint: "GET /api/policy-unselected",
                summary: "POLICY_CONTRACT_UNSELECTED_SHORT",
                required_receipt_reference: true,
            }];
        const workerContextDependencies = [{
                project: "api",
                reason: "POLICY_DEPENDENCY_UNSELECTED_SHORT",
                dependency_id: "dep-policy-unselected",
                required_receipt_reference: true,
            }];
        const baseAssignment = {
            project: "frontend",
            task,
            reason: "selftest metadata partial compact policy",
            dependsOn: "",
            taskFingerprint: "metadata-partial-compact-policy-selftest",
            dispatchKey: `${groupId}|coordinator|frontend|metadata-partial-compact-policy-selftest`,
            assignmentId: `frontend::${groupId}|coordinator|frontend|metadata-partial-compact-policy-selftest::initial::1`,
            attempt: 1,
            sourceProject: "coordinator",
            scopeId: groupId,
        };
        const options = {
            group,
            analysis,
            contractInjections,
            workerContextDependencies,
            workerContextUsageOptions: {
                maxTokens: 4200,
                autoCompactBufferTokens: 120,
            },
            workerContextRetryOptions: {
                disableCompactStrategyMemory: true,
                metadata: {
                    maxCategories: 1,
                    maxItems: 4,
                    maxStringChars: 150,
                },
                maxTaskChars: 2200,
            },
        };
        const initialPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", [], options);
        const initialGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, initialPacket);
        const result = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(baseAssignment, "", [], initialPacket, initialGate, options);
        const assignment = {
            ...baseAssignment,
            task: result.task,
            context_compaction_retry: result.retry,
            dispatchReady: result.gate.dispatch_ready !== false,
            dispatch_ready: result.gate.dispatch_ready !== false,
            worker_context_pre_dispatch_gate: result.gate,
            workerContextPreDispatchGate: result.gate,
            worker_context_packet: result.packet,
        };
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment);
        const retry = result.retry || result.packet?.context_compaction_retry || {};
        const partial = retry.partial_compaction || retry.partialCompaction || {};
        const policy = retry.partial_compact_policy || retry.partialCompactPolicy || partial.partial_compact_policy || {};
        const finalContract = result.packet?.contract_injections?.[0] || {};
        const finalDependency = result.packet?.dependencies?.[0] || {};
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)(result.packet);
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const binding = (ledger.entries || []).find((item) => item.assignment_id === baseAssignment.assignmentId) || {};
        const hookLedger = (0, group_orchestrator_1.readWorkerContextCompactHookLedgerForCoordinator)(groupId);
        const hookRunId = String(retry.compact_hook_run_id || binding.worker_context_packet_compact_hook_run_id || "");
        const hookEntries = (hookLedger.entries || []).filter((item) => item.hook_run_id === hookRunId);
        const checks = {
            initialTopCategoryIsMetadataDocs: initialGate.dispatch_ready === false
                && initialPacket.context_usage?.status === "over_budget"
                && (initialPacket.context_usage?.top_categories || [])[0]?.id === "constraints_and_documents",
            policySelectsOnlyDocs: retry.status === "recovered"
                && retry.method === "metadata_partial_compact"
                && policy.schema === "ccm-worker-context-partial-compact-policy-v1"
                && Array.isArray(policy.selected_categories)
                && policy.selected_categories.length === 1
                && policy.selected_categories[0] === "constraints_and_documents"
                && Array.isArray(policy.skipped_categories)
                && policy.skipped_categories.includes("contract_injections")
                && policy.skipped_categories.includes("dependencies"),
            partialSummaryMatchesPolicy: partial.schema === "ccm-worker-context-metadata-partial-compaction-v1"
                && Array.isArray(partial.categories)
                && partial.categories.length === 1
                && partial.categories[0] === "constraints_and_documents"
                && partial.partial_compact_policy?.selected_categories?.[0] === "constraints_and_documents",
            unselectedMetadataPreserved: finalContract.summary === "POLICY_CONTRACT_UNSELECTED_SHORT"
                && finalDependency.reason === "POLICY_DEPENDENCY_UNSELECTED_SHORT"
                && finalDependency.dependency_id === "dep-policy-unselected",
            taskWasNotCompacted: result.task === task
                && retry.original_task_hash === retry.compacted_task_hash,
            bindingAndRenderExposePolicy: binding.worker_context_packet_partial_compact_policy?.schema === "ccm-worker-context-partial-compact-policy-v1"
                && binding.worker_context_packet_partial_compact_policy?.selected_categories?.[0] === "constraints_and_documents"
                && rendered.includes("partial_compact_policy=constraints_and_documents"),
            hookRecordsPolicy: !!hookRunId
                && hookEntries.some((item) => item.phase === "post"
                    && item.dispatch_ready === true
                    && Array.isArray(item.result_summary?.partial_compact_policy_selected)
                    && item.result_summary.partial_compact_policy_selected[0] === "constraints_and_documents"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retry: {
                status: retry.status || "",
                method: retry.method || "",
                selected_categories: policy.selected_categories || [],
                skipped_categories: policy.skipped_categories || [],
                partial_categories: partial.categories || [],
            },
            gate: {
                dispatch_ready: result.gate.dispatch_ready,
                auto_retry_status: result.gate.auto_retry_status || "",
                total_tokens: result.gate.total_tokens || 0,
                max_tokens: result.gate.max_tokens || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextCompactOutcomeLedgerSelfTest() {
    const groupId = `worker-context-compact-outcome-ledger-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const hookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    const outcomeFile = (0, group_orchestrator_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId);
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: "frontend", agent: "cursor" },
            ],
        });
        const task = "请在 frontend 项目处理 OUTCOME_LEDGER_SENTINEL，保持任务正文不被压缩。";
        const analysis = {
            summary: "验证 WorkerContextPacket compact outcome ledger",
            constraints: Array.from({ length: 10 }, (_, index) => `OUTCOME_LEDGER_SENTINEL constraint ${index}: ${"长期策略样本 ".repeat(180)}`),
            documentFindings: Array.from({ length: 14 }, (_, index) => `docs/outcome-${index}.md: ${"压缩策略结果蒸馏依据 ".repeat(180)}`),
        };
        const baseAssignment = {
            project: "frontend",
            task,
            reason: "selftest compact outcome ledger",
            dependsOn: "",
            taskFingerprint: "compact-outcome-ledger-selftest",
            dispatchKey: `${groupId}|coordinator|frontend|compact-outcome-ledger-selftest`,
            assignmentId: `frontend::${groupId}|coordinator|frontend|compact-outcome-ledger-selftest::initial::1`,
            attempt: 1,
            sourceProject: "coordinator",
            scopeId: groupId,
        };
        const options = {
            group,
            analysis,
            workerContextUsageOptions: {
                maxTokens: 3800,
                autoCompactBufferTokens: 120,
            },
            workerContextRetryOptions: {
                metadata: {
                    maxCategories: 1,
                    maxItems: 4,
                    maxStringChars: 150,
                },
                maxTaskChars: 2200,
            },
        };
        const initialPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", [], options);
        const initialGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, initialPacket);
        const result = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(baseAssignment, "", [], initialPacket, initialGate, options);
        const assignment = {
            ...baseAssignment,
            task: result.task,
            context_compaction_retry: result.retry,
            dispatchReady: result.gate.dispatch_ready !== false,
            dispatch_ready: result.gate.dispatch_ready !== false,
            worker_context_pre_dispatch_gate: result.gate,
            workerContextPreDispatchGate: result.gate,
            worker_context_packet: result.packet,
        };
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment);
        const retry = result.retry || result.packet?.context_compaction_retry || {};
        const hookRunId = String(retry.compact_hook_run_id || "");
        const outcomeLedger = (0, group_orchestrator_1.readWorkerContextCompactOutcomeLedgerForCoordinator)(groupId);
        const outcome = (outcomeLedger.entries || []).find((item) => item.hook_run_id === hookRunId && item.assignment_id === baseAssignment.assignmentId) || {};
        const checks = {
            outcomeLedgerCreated: outcomeLedger.schema === "ccm-worker-context-compact-outcome-ledger-v1"
                && outcomeLedger.file === outcomeFile
                && Number(outcomeLedger.stats?.total || 0) >= 1,
            outcomeBindsRetryAndHook: outcome.hook_run_id === hookRunId
                && outcome.retry_id === retry.retry_id
                && outcome.method === "metadata_partial_compact"
                && outcome.status === "recovered"
                && outcome.dispatch_ready === true,
            outcomeRecordsPolicyDecision: outcome.partial_compact_policy?.schema === "ccm-worker-context-partial-compact-policy-v1"
                && outcome.partial_compact_policy?.selected_categories?.[0] === "constraints_and_documents"
                && Array.isArray(outcome.partial_compact_policy?.skipped_categories),
            outcomeRecordsRecoveryDelta: Number(outcome.token_delta || 0) > 0
                && Number(outcome.free_token_delta || 0) > 0
                && Number(outcome.partial_omitted_chars || 0) > 0,
            outcomeShowsTaskPreserved: outcome.task_hash_unchanged === true
                && outcome.task_compacted === false
                && result.task === task,
            statsAggregateOutcome: Number(outcomeLedger.stats?.partialCompactPolicy || 0) >= 1
                && Number(outcomeLedger.stats?.taskPreserved || 0) >= 1
                && Number(outcomeLedger.stats?.selectedCategoryCounts?.constraints_and_documents || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            outcome: {
                status: outcome.status || "",
                method: outcome.method || "",
                selected_categories: outcome.partial_compact_policy?.selected_categories || [],
                token_delta: outcome.token_delta || 0,
                free_token_delta: outcome.free_token_delta || 0,
                task_hash_unchanged: outcome.task_hash_unchanged === true,
            },
            stats: outcomeLedger.stats,
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`, outcomeFile, `${outcomeFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextCompactStrategyMemorySelfTest() {
    const groupId = `worker-context-compact-strategy-memory-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, group_orchestrator_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId);
    const strategyFile = (0, group_orchestrator_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(groupId);
    try {
        const dependencyPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["dependencies"],
            skipped_categories: ["constraints_and_documents"],
            max_categories: 1,
            fallback_used: false,
        };
        const constraintsPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T15:00:02.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-strategy-dependency",
                    group_id: groupId,
                    assignment_id: "assignment-strategy-dependency",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_total_tokens: 7000,
                    retry_total_tokens: 2400,
                    from_free_tokens: -3300,
                    retry_free_tokens: 1300,
                    token_delta: 4600,
                    free_token_delta: 4600,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["dependencies"],
                    partial_compact_policy: dependencyPolicy,
                    partial_omitted_chars: 18000,
                    distillation_candidate: true,
                    at: "2026-07-09T15:00:01.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-strategy-constraints",
                    group_id: groupId,
                    assignment_id: "assignment-strategy-constraints",
                    method: "metadata_partial_compact",
                    status: "blocked",
                    dispatch_ready: false,
                    from_total_tokens: 7100,
                    retry_total_tokens: 7000,
                    from_free_tokens: -3400,
                    retry_free_tokens: -3300,
                    token_delta: 100,
                    free_token_delta: 100,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: constraintsPolicy,
                    partial_omitted_chars: 600,
                    distillation_candidate: true,
                    at: "2026-07-09T15:00:02.000Z",
                },
            ],
        });
        const strategy = (0, group_orchestrator_1.readWorkerContextCompactStrategyMemoryForCoordinator)(groupId);
        const packet = {
            packet_id: "wcp-strategy-memory-selftest",
            project: "frontend",
            task: "验证 compact outcome strategy memory 会被下次 WorkerContextPacket policy 使用。",
            constraints: ["CONSTRAINT_STRATEGY_TIE"],
            document_findings: ["docs/strategy.md"],
            dependencies: [{ project: "backend", reason: "DEPENDENCY_STRATEGY_TIE", dependency_id: "dep-strategy" }],
            contract_injections: [],
            context_usage: {
                schema: "ccm-worker-context-usage-v1",
                top_categories: [
                    { id: "constraints_and_documents", tokens: 900, chars: 2700 },
                    { id: "dependencies", tokens: 900, chars: 2700 },
                ],
            },
        };
        const policy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
        });
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)({
            ...packet,
            group: { id: groupId, name: "", members: ["frontend"] },
            goal: "compact strategy memory selftest",
            memory: null,
            acceptance: {},
            context_compaction_retry: {
                schema: "ccm-worker-context-compaction-retry-v1",
                status: "recovered",
                method: "metadata_partial_compact",
                partial_compact_policy: policy,
                partial_compaction: {
                    schema: "ccm-worker-context-metadata-partial-compaction-v1",
                    category: "worker_context_metadata",
                    categories: policy.selected_categories,
                    omitted_chars: 18000,
                    preserved_fields: ["dependency.project", "dependency.reason"],
                    partial_compact_policy: policy,
                },
                preserved_receipt_contract: true,
            },
        });
        const dependencyStats = (strategy.categories || []).find((item) => item.category === "dependencies") || {};
        const checks = {
            strategyMemoryCreated: strategy.schema === "ccm-worker-context-compact-strategy-memory-v1"
                && strategy.file === strategyFile
                && Number(strategy.sample_count || 0) === 2,
            dependencyPreferredFromOutcome: strategy.preferred_categories?.[0] === "dependencies"
                && Number(dependencyStats.recovered || 0) === 1
                && Number(dependencyStats.avg_free_token_delta || 0) === 4600,
            policyUsesStrategyMemory: policy.method === "usage_top_category_pressure_with_outcome_strategy"
                && policy.compact_strategy_memory?.schema === "ccm-worker-context-compact-strategy-memory-v1",
            equalPressureSelectsPreferredCategory: policy.selected_categories?.[0] === "dependencies",
            workerPacketRendersStrategyMemory: rendered.includes("partial_compact_policy=dependencies")
                && rendered.includes("compact_strategy_memory=")
                && rendered.includes("preferred=dependencies"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            strategy: {
                preferred_categories: strategy.preferred_categories || [],
                avoid_categories: strategy.avoid_categories || [],
                sample_count: strategy.sample_count || 0,
                categories: strategy.categories || [],
            },
            policy: {
                method: policy.method || "",
                selected_categories: policy.selected_categories || [],
                compact_strategy_memory: policy.compact_strategy_memory || null,
            },
        };
    }
    finally {
        for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest() {
    const groupId = `worker-context-partial-compact-pressure-usage-strategy-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, group_orchestrator_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId);
    const strategyFile = (0, group_orchestrator_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(groupId);
    const usageFile = (0, group_memory_index_1.getGroupTypedMemoryPressureRecallUsageLedgerFile)(groupId);
    try {
        const dependencyPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["dependencies"],
            skipped_categories: ["constraints_and_documents"],
            max_categories: 1,
            fallback_used: false,
        };
        const constraintsPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T22:10:02.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-pressure-usage-strategy-dependencies",
                    group_id: groupId,
                    assignment_id: "assignment-pressure-usage-strategy-dependencies",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_total_tokens: 7600,
                    retry_total_tokens: 2500,
                    from_free_tokens: -3800,
                    retry_free_tokens: 1300,
                    token_delta: 5100,
                    free_token_delta: 5100,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["dependencies"],
                    partial_compact_policy: dependencyPolicy,
                    partial_omitted_chars: 21000,
                    distillation_candidate: true,
                    at: "2026-07-09T22:10:01.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-pressure-usage-strategy-constraints",
                    group_id: groupId,
                    assignment_id: "assignment-pressure-usage-strategy-constraints",
                    method: "metadata_partial_compact",
                    status: "blocked",
                    dispatch_ready: false,
                    from_total_tokens: 7600,
                    retry_total_tokens: 7400,
                    from_free_tokens: -3800,
                    retry_free_tokens: -3600,
                    token_delta: 200,
                    free_token_delta: 200,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: constraintsPolicy,
                    partial_omitted_chars: 900,
                    distillation_candidate: true,
                    at: "2026-07-09T22:10:02.000Z",
                },
            ],
        });
        const strategy = (0, group_orchestrator_1.readWorkerContextCompactStrategyMemoryForCoordinator)(groupId);
        const packet = {
            packet_id: "wcp-pressure-usage-strategy-selftest",
            project: "frontend",
            task: "验证 pressure recall usage feedback 会影响 partial compact policy category selection。",
            constraints: Array.from({ length: 10 }, (_, index) => `PRESSURE_USAGE_POLICY constraint ${index}: ${"文档约束 ".repeat(120)}`),
            document_findings: Array.from({ length: 8 }, (_, index) => `docs/pressure-policy-${index}.md: ${"验收依据 ".repeat(120)}`),
            dependencies: [{ project: "backend", reason: "PRESSURE_USAGE_POLICY dependency should be compacted by learned strategy", dependency_id: "dep-pressure-usage-policy" }],
            contract_injections: [],
            context_usage: {
                schema: "ccm-worker-context-usage-v1",
                top_categories: [
                    { id: "constraints_and_documents", tokens: 1000, chars: 3000 },
                    { id: "dependencies", tokens: 900, chars: 2700 },
                ],
            },
        };
        const baselinePolicy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
            disablePressureRecallUsageStrategy: true,
        });
        const usageRecord = (0, group_memory_index_1.recordGroupTypedMemoryPressureRecallUsageLedger)(groupId, {
            targetProject: "frontend",
            taskId: "pressure-usage-strategy-task",
            executionId: "pressure-usage-strategy-execution",
            agent: "frontend",
            generatedAt: "2026-07-09T22:10:03.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-pressure-usage-strategy-selftest",
                    pressure_status: "over_budget",
                    usage_state: "used",
                    direct_reference: true,
                    reason: "selftest: compact strategy pressure memory selected the recovered dependency compaction strategy",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-pressure-usage-strategy-selftest-verified",
                    pressure_status: "over_budget",
                    usage_state: "verified",
                    reason: "selftest: dependency strategy was verified as recovery path",
                },
            ],
        });
        const usageSummary = (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageSummary)(groupId, {
            targetProject: "frontend",
            nowMs: Date.parse("2026-07-09T22:10:04.000Z"),
        });
        const biasedPolicy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
            pressureRecallUsageSummary: usageSummary,
        });
        const dependencyCandidate = (biasedPolicy.candidates || []).find((item) => item.category === "dependencies") || {};
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)({
            ...packet,
            group: { id: groupId, name: "", members: ["frontend"] },
            goal: "pressure recall usage strategy selftest",
            memory: null,
            acceptance: {},
            context_compaction_retry: {
                schema: "ccm-worker-context-compaction-retry-v1",
                status: "recovered",
                method: "metadata_partial_compact",
                partial_compact_policy: biasedPolicy,
                partial_compaction: {
                    schema: "ccm-worker-context-metadata-partial-compaction-v1",
                    category: "worker_context_metadata",
                    categories: biasedPolicy.selected_categories,
                    omitted_chars: 21000,
                    preserved_fields: ["dependency.project", "dependency.reason"],
                    partial_compact_policy: biasedPolicy,
                },
                preserved_receipt_contract: true,
            },
        });
        const checks = {
            strategyMemoryPrefersDependencies: strategy.preferred_categories?.[0] === "dependencies",
            baselineStillFollowsTokenPressure: baselinePolicy.selected_categories?.[0] === "constraints_and_documents"
                && baselinePolicy.method === "usage_top_category_pressure_with_outcome_strategy",
            usageLedgerPromotesCompactStrategyMemory: usageRecord?.recorded_count === 2
                && usageSummary.weighted_totals?.used === 1
                && usageSummary.weighted_totals?.verified === 1
                && (usageSummary.useful_pressure_memories || []).some((item) => item.rel_path === "worker-context-compact-strategy-memory.md"),
            pressureUsageFeedbackChangesPolicy: biasedPolicy.method === "usage_top_category_pressure_with_outcome_strategy_and_pressure_recall_usage"
                && biasedPolicy.selected_categories?.[0] === "dependencies"
                && biasedPolicy.pressure_recall_usage_strategy_bias?.active === true
                && Number(dependencyCandidate.pressure_recall_usage_adjustment || 0) > 0
                && Number(dependencyCandidate.selection_score || 0) > 1000,
            renderedShowsPressureUsageBias: rendered.includes("partial_compact_policy=dependencies")
                && rendered.includes("compact_strategy_memory=")
                && rendered.includes("pressure_recall_usage_bias=promote_pressure_recall"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            baselinePolicy: {
                method: baselinePolicy.method || "",
                selected_categories: baselinePolicy.selected_categories || [],
            },
            biasedPolicy: {
                method: biasedPolicy.method || "",
                selected_categories: biasedPolicy.selected_categories || [],
                pressure_recall_usage_strategy_bias: biasedPolicy.pressure_recall_usage_strategy_bias || null,
                candidates: biasedPolicy.candidates || [],
            },
            usageSummary: {
                weighted_totals: usageSummary.weighted_totals || {},
                aging: usageSummary.aging || {},
            },
        };
    }
    finally {
        for (const file of [
            outcomeFile,
            `${outcomeFile}.bak`,
            strategyFile,
            `${strategyFile}.bak`,
            usageFile,
            `${usageFile}.bak`,
        ]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest() {
    const sourceGroupId = `worker-context-partial-compact-cross-pressure-source-${process.pid}-${Date.now()}`;
    const targetGroupId = `worker-context-partial-compact-cross-pressure-target-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, group_orchestrator_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(targetGroupId);
    const strategyFile = (0, group_orchestrator_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(targetGroupId);
    const sourceUsageFile = (0, group_memory_index_1.getGroupTypedMemoryPressureRecallUsageLedgerFile)(sourceGroupId);
    const targetUsageFile = (0, group_memory_index_1.getGroupTypedMemoryPressureRecallUsageLedgerFile)(targetGroupId);
    try {
        const dependencyPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["dependencies"],
            skipped_categories: ["constraints_and_documents"],
            max_categories: 1,
            fallback_used: false,
        };
        const constraintsPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId: targetGroupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T23:20:02.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-cross-pressure-usage-strategy-dependencies",
                    group_id: targetGroupId,
                    assignment_id: "assignment-cross-pressure-usage-strategy-dependencies",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_total_tokens: 7600,
                    retry_total_tokens: 2500,
                    from_free_tokens: -3800,
                    retry_free_tokens: 1300,
                    token_delta: 5100,
                    free_token_delta: 5100,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["dependencies"],
                    partial_compact_policy: dependencyPolicy,
                    partial_omitted_chars: 21000,
                    distillation_candidate: true,
                    at: "2026-07-09T23:20:01.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-cross-pressure-usage-strategy-constraints",
                    group_id: targetGroupId,
                    assignment_id: "assignment-cross-pressure-usage-strategy-constraints",
                    method: "metadata_partial_compact",
                    status: "blocked",
                    dispatch_ready: false,
                    from_total_tokens: 7600,
                    retry_total_tokens: 7400,
                    from_free_tokens: -3800,
                    retry_free_tokens: -3600,
                    token_delta: 200,
                    free_token_delta: 200,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: constraintsPolicy,
                    partial_omitted_chars: 900,
                    distillation_candidate: true,
                    at: "2026-07-09T23:20:02.000Z",
                },
            ],
        });
        const strategy = (0, group_orchestrator_1.readWorkerContextCompactStrategyMemoryForCoordinator)(targetGroupId);
        const packet = {
            packet_id: "wcp-cross-pressure-usage-strategy-selftest",
            project: "frontend",
            task: "验证跨群聊 pressure recall usage feedback 会影响 partial compact policy category selection。",
            constraints: Array.from({ length: 10 }, (_, index) => `CROSS_PRESSURE_USAGE_POLICY constraint ${index}: ${"文档约束 ".repeat(120)}`),
            document_findings: Array.from({ length: 8 }, (_, index) => `docs/cross-pressure-policy-${index}.md: ${"验收依据 ".repeat(120)}`),
            dependencies: [{ project: "backend", reason: "CROSS_PRESSURE_USAGE_POLICY dependency should be compacted by learned strategy", dependency_id: "dep-cross-pressure-usage-policy" }],
            contract_injections: [],
            context_usage: {
                schema: "ccm-worker-context-usage-v1",
                top_categories: [
                    { id: "constraints_and_documents", tokens: 1000, chars: 3000 },
                    { id: "dependencies", tokens: 900, chars: 2700 },
                ],
            },
        };
        const baselinePolicy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
            disablePressureRecallUsageStrategy: true,
        });
        const sourceRecord = (0, group_memory_index_1.recordGroupTypedMemoryPressureRecallUsageLedger)(sourceGroupId, {
            targetProject: "frontend",
            taskId: "cross-pressure-usage-strategy-task",
            executionId: "cross-pressure-usage-strategy-execution",
            agent: "frontend",
            generatedAt: "2026-07-09T23:20:03.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-usage-strategy-used",
                    pressure_status: "over_budget",
                    usage_state: "used",
                    direct_reference: true,
                    reason: "selftest: another group used compact strategy pressure memory for the same frontend project",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-usage-strategy-verified",
                    pressure_status: "over_budget",
                    usage_state: "verified",
                    reason: "selftest: another group verified the dependency strategy recovery path",
                },
            ],
        });
        const crossGroupSummary = (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageProjectSummary)(targetGroupId, {
            targetProject: "frontend",
            nowMs: Date.parse("2026-07-09T23:20:04.000Z"),
            groupIds: [sourceGroupId],
        });
        const crossBiasedPolicy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            groupId: targetGroupId,
            targetProject: "frontend",
            nowMs: Date.parse("2026-07-09T23:20:04.000Z"),
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
        });
        const wrongProjectPolicy = (0, group_orchestrator_1.buildWorkerContextMetadataPartialCompactPolicyForCoordinator)(packet, {
            groupId: targetGroupId,
            targetProject: "api",
            nowMs: Date.parse("2026-07-09T23:20:04.000Z"),
            maxCategories: 1,
            compactOutcomeStrategyMemory: strategy,
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
        });
        const dependencyCandidate = (crossBiasedPolicy.candidates || []).find((item) => item.category === "dependencies") || {};
        const checks = {
            targetHasNoLocalUsageLedger: !fs.existsSync(targetUsageFile),
            strategyMemoryStillPrefersDependencies: strategy.preferred_categories?.[0] === "dependencies",
            baselineStillFollowsTokenPressure: baselinePolicy.selected_categories?.[0] === "constraints_and_documents"
                && baselinePolicy.method === "usage_top_category_pressure_with_outcome_strategy",
            sourceLedgerFeedsCrossGroupSummary: sourceRecord?.recorded_count === 2
                && crossGroupSummary.source === "cross_group_project_pressure_recall_usage"
                && crossGroupSummary.source_group_count === 1
                && crossGroupSummary.entry_count === 2
                && (crossGroupSummary.useful_pressure_memories || []).some((item) => item.rel_path === "worker-context-compact-strategy-memory.md"),
            crossGroupUsageChangesPolicy: crossBiasedPolicy.method === "usage_top_category_pressure_with_outcome_strategy_and_pressure_recall_usage"
                && crossBiasedPolicy.selected_categories?.[0] === "dependencies"
                && crossBiasedPolicy.pressure_recall_usage_strategy_bias?.active === true
                && crossBiasedPolicy.pressure_recall_usage_strategy_bias?.summary_source === "cross_group_project_pressure_recall_usage"
                && crossBiasedPolicy.pressure_recall_usage_strategy_bias?.source_group_count === 1
                && crossBiasedPolicy.pressure_recall_usage_summary?.source === "cross_group_project_pressure_recall_usage"
                && crossBiasedPolicy.pressure_recall_usage_summary?.source_group_count === 1
                && Number(dependencyCandidate.pressure_recall_usage_adjustment || 0) > 0
                && Number(dependencyCandidate.selection_score || 0) > 1000,
            targetProjectIsolationBlocksWrongProjectStrategyBias: wrongProjectPolicy.selected_categories?.[0] === "constraints_and_documents"
                && wrongProjectPolicy.method === "usage_top_category_pressure_with_outcome_strategy"
                && !wrongProjectPolicy.pressure_recall_usage_strategy_bias,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            crossGroupSummary: {
                source_group_count: crossGroupSummary.source_group_count || 0,
                entry_count: crossGroupSummary.entry_count || 0,
                weighted_totals: crossGroupSummary.weighted_totals || {},
            },
            baselinePolicy: {
                method: baselinePolicy.method || "",
                selected_categories: baselinePolicy.selected_categories || [],
            },
            crossBiasedPolicy: {
                method: crossBiasedPolicy.method || "",
                selected_categories: crossBiasedPolicy.selected_categories || [],
                pressure_recall_usage_strategy_bias: crossBiasedPolicy.pressure_recall_usage_strategy_bias || null,
                pressure_recall_usage_summary: crossBiasedPolicy.pressure_recall_usage_summary || null,
                candidates: crossBiasedPolicy.candidates || [],
            },
            wrongProjectPolicy: {
                method: wrongProjectPolicy.method || "",
                selected_categories: wrongProjectPolicy.selected_categories || [],
            },
        };
    }
    finally {
        for (const file of [
            outcomeFile,
            `${outcomeFile}.bak`,
            strategyFile,
            `${strategyFile}.bak`,
            sourceUsageFile,
            `${sourceUsageFile}.bak`,
            targetUsageFile,
            `${targetUsageFile}.bak`,
        ]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=group-orchestrator-protocol-self-tests.js.map