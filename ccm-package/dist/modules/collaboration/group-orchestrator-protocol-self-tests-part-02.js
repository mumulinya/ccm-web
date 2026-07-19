"use strict";
// Behavior-freeze split from group-orchestrator-protocol-self-tests.ts (part 2/2).
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
exports.runWorkerContextMetadataPartialCompactPolicySelfTest = runWorkerContextMetadataPartialCompactPolicySelfTest;
exports.runWorkerContextCompactOutcomeLedgerSelfTest = runWorkerContextCompactOutcomeLedgerSelfTest;
exports.runWorkerContextCompactStrategyMemorySelfTest = runWorkerContextCompactStrategyMemorySelfTest;
exports.runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest;
exports.runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest = runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest;
const fs = __importStar(require("fs"));
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
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
//# sourceMappingURL=group-orchestrator-protocol-self-tests-part-02.js.map