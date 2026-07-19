"use strict";
// Behavior-freeze split from runtime-kernel.ts (part 3/3).
// Runtime kernel self-tests.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentRuntimeKernelSelfTest = runAgentRuntimeKernelSelfTest;
exports.runWorkerContextUsageSelfTest = runWorkerContextUsageSelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest;
const runtime_kernel_part_02_1 = require("./runtime-kernel-part-02");
function runAgentRuntimeKernelSelfTest() {
    const read = (0, runtime_kernel_part_02_1.recordAgentRuntimeLifecycle)({ scope: "global", action: "inspect_system", risk: "read", status: "ok", data: { result: { ok: true } } });
    const high = (0, runtime_kernel_part_02_1.recordAgentRuntimeLifecycle)({ scope: "global", action: "delete_task", risk: "high", status: "blocked" });
    const packet = (0, runtime_kernel_part_02_1.buildWorkerContextPacket)({
        project: "frontend",
        task: "适配接口字段",
        analysis: { summary: "前后端契约变更", documentFindings: ["POST /api/demo 新增 name"], constraints: ["不改后端"] },
        contractInjections: [{ source_agent: "backend", target_agent: "frontend", endpoint: "POST /api/demo", summary: "新增 name 字段" }],
        memory: { schema: "ccm-group-memory-context-v1", group_id: "g1", target_project: "frontend", rendered_text: "群聊记忆：必须兼容旧字段。" },
    });
    const rendered = (0, runtime_kernel_part_02_1.renderWorkerContextPacket)(packet);
    const replay = (0, runtime_kernel_part_02_1.buildTraceReplaySuite)(3);
    const checks = {
        readAllowed: read.permission.allowed === true,
        highRiskAsks: high.permission.needs_confirmation === true,
        contextBudgetComputed: packet.context_budget.estimated_tokens > 0,
        contextUsageComputed: packet.context_usage?.schema === "ccm-worker-context-usage-v1"
            && packet.context_usage?.categories?.some((item) => item.id === "group_memory_rendered" && Number(item.tokens || 0) > 0)
            && packet.context_usage?.categories?.some((item) => item.id === "memory_reinjection_proof" && Number(item.tokens || 0) > 0)
            && packet.context_usage?.categories?.some((item) => item.id === "free_space")
            && packet.context_usage?.categories?.some((item) => item.id === "autocompact_buffer"),
        workerPacketHasMemoryReinjectionProof: packet.memory_reinjection_proof?.schema === "ccm-worker-context-memory-reinjection-proof-v1"
            && packet.memory_reinjection_proof?.status === "injected"
            && rendered.includes("Memory reinjection proof"),
        workerPacketHasAckGate: rendered.includes("ACK gate"),
        workerPacketRendersContextUsage: rendered.includes("Context usage budget"),
        workerPacketRendersMemory: rendered.includes("平台记忆") && rendered.includes("必须兼容旧字段"),
        contractInjectionHasId: packet.contract_injections[0]?.injection_id,
        replaySuiteShape: Array.isArray(replay.replays),
    };
    return { pass: Object.values(checks).every(Boolean), checks, read, high, packet, replay };
}
function runWorkerContextUsageSelfTest() {
    const packet = (0, runtime_kernel_part_02_1.buildWorkerContextPacket)({
        group: { id: "context-usage-group", name: "Context Usage", members: [{ project: "api" }] },
        project: "api",
        taskId: "context-usage-task",
        traceId: "trace-context-usage",
        task: "修复 CONTEXT_USAGE_SENTINEL，并使用 provider re-proof brief。",
        analysis: {
            summary: "Context usage budget selftest",
            constraints: ["必须保留 CONTEXT_USAGE_SENTINEL"],
            documentFindings: ["src/context-usage.ts"],
        },
        replayRepairDispatchBriefs: [{
                brief_id: "brief-context-usage",
                work_item_id: "work-context-usage",
                source: "api_microcompact_native_apply_provider_reproof",
                provider_reproof_status: "needed",
                provider_reproof_reason: "missing_native_request_adapter_telemetry",
                request_patch_checksum: "request-context-usage",
                runner_request_id: "runner-context-usage",
                should_create_real_task: false,
            }],
        memory: {
            schema: "ccm-group-memory-context-v1",
            group_id: "context-usage-group",
            target_project: "api",
            rendered_text: "类型化长期记忆（MEMORY.md）：CONTEXT_USAGE_SENTINEL src/context-usage.ts",
            typed_memory_recall: {
                recalled: [{ relPath: "context-usage.md", type: "reference", snippet: "CONTEXT_USAGE_SENTINEL" }],
            },
        },
        verification: { hints: ["npm run check"] },
    });
    const rendered = (0, runtime_kernel_part_02_1.renderWorkerContextPacket)(packet);
    const categories = new Map((packet.context_usage?.categories || []).map((item) => [item.id, item]));
    const checks = {
        schema: packet.context_usage?.schema === "ccm-worker-context-usage-v1",
        categorizesTaskAndMemory: Number(categories.get("task_goal")?.tokens || 0) > 0
            && Number(categories.get("group_memory_rendered")?.tokens || 0) > 0,
        categorizesReplayBrief: Number(categories.get("replay_repair_dispatch_briefs")?.tokens || 0) > 0,
        categorizesTypedRecall: Number(categories.get("typed_memory_recall")?.tokens || 0) > 0,
        categorizesMemoryReinjectionProof: Number(categories.get("memory_reinjection_proof")?.tokens || 0) > 0,
        keepsBudgetBuffers: categories.has("free_space")
            && Number(categories.get("autocompact_buffer")?.tokens || 0) > 0,
        suggestsReductions: Array.isArray(packet.context_usage?.suggested_reductions),
        statusOk: ["ok", "warn", "compact_recommended", "critical", "over_budget"].includes(String(packet.context_usage?.status || "")),
        renderedMentionsUsage: rendered.includes("Context usage budget")
            && rendered.includes("Replay repair dispatch briefs")
            && rendered.includes("Autocompact buffer"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        usage: {
            status: packet.context_usage?.status,
            total_tokens: packet.context_usage?.total_tokens,
            free_tokens: packet.context_usage?.free_tokens,
            top_categories: packet.context_usage?.top_categories,
        },
    };
}
function runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest() {
    const advisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId: "runtime-provider-override-followup-contract",
        project: "api",
        agent_type: "codex",
        health_status: "monitor",
        dispatch_policy: "allow_with_receipt_sampling",
        should_hold_dispatch: false,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId: "runtime-provider-override-followup-contract",
            project: "api",
            agent_type: "codex",
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            provider_override_followup_repaired: true,
            provider_override_followup_repaired_count: 1,
            provider_override_followup_memory_provenance_usage_count: 1,
            provider_override_followup_current_source_verified_count: 1,
            provider_override_followup_last_completed_at: "2026-07-10T04:31:00.000Z",
            provider_override_followup_fresh_after_last_violation: true,
            provider_override_followup_rel_paths: ["pressure-provider-dispatch-override-followup-pre-dispatch-memory.md"],
            provider_override_followup_work_item_ids: ["work-provider-override-followup-runtime"],
            provider_override_followup_override_ids: ["provider-dispatch-override:runtime"],
        },
    };
    const packet = (0, runtime_kernel_part_02_1.buildWorkerContextPacket)({
        group: { id: "runtime-provider-override-followup-contract", members: [{ project: "api" }] },
        project: "api",
        agentType: "codex",
        task: "验证 provider override follow-up repaired-history sampling contract。",
        pressureProvenanceProviderDispatchAdvisory: advisory,
        contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
    });
    const rendered = (0, runtime_kernel_part_02_1.renderWorkerContextPacket)(packet);
    const categories = new Map((packet.context_usage?.categories || []).map((item) => [item.id, item]));
    const contract = packet.pressure_provenance_provider_dispatch_override_followup_receipt_contract || {};
    const checks = {
        packetCarriesContract: contract.schema === "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1"
            && contract.active === true
            && contract.provider_override_followup_repaired === true
            && contract.sampling_required === true,
        acceptanceRequiresSamplingReceipt: packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_sampling_required === true
            && packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_receipt_required === true
            && packet.acceptance?.provider_dispatch_override_followup_history_reverification_required === true
            && packet.acceptance?.memory_provenance_usage_required === true,
        usageCategorizesContract: Number(categories.get("pressure_provenance_provider_dispatch_override_followup_receipt_contract")?.tokens || 0) > 0
            && categories.get("pressure_provenance_provider_dispatch_override_followup_receipt_contract")?.required === true,
        renderedShowsContract: rendered.includes("Provider dispatch override follow-up receipt contract")
            && rendered.includes("providerDispatchOverrideFollowupHistoryReverified")
            && rendered.includes("pressure-provider-dispatch-override-followup-pre-dispatch-memory.md")
            && rendered.includes("work-provider-override-followup-runtime"),
        advisoryDoesNotHold: packet.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === false
            && packet.acceptance?.pressure_provenance_provider_dispatch_hold_required === false,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        contract: {
            schema: contract.schema || "",
            active: contract.active === true,
            rel_paths: contract.rel_paths || [],
            followup_work_item_ids: contract.followup_work_item_ids || [],
        },
        acceptance: packet.acceptance,
    };
}
//# sourceMappingURL=runtime-kernel-part-03.js.map