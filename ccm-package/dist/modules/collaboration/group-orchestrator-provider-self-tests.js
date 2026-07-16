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
exports.runWorkerContextProviderReliabilitySnapshotRankingSelfTest = runWorkerContextProviderReliabilitySnapshotRankingSelfTest;
exports.runWorkerContextProviderSwitchExecutionRankingSelfTest = runWorkerContextProviderSwitchExecutionRankingSelfTest;
exports.runWorkerContextProviderSwitchDecisionReceiptSelfTest = runWorkerContextProviderSwitchDecisionReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest = runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
function runWorkerContextProviderReliabilitySnapshotRankingSelfTest() {
    const sourceGroupA = `worker-context-provider-snapshot-source-a-${process.pid}-${Date.now()}`;
    const sourceGroupB = `worker-context-provider-snapshot-source-b-${process.pid}-${Date.now()}`;
    const targetGroup = `worker-context-provider-snapshot-target-${process.pid}-${Date.now()}`;
    const sourceTypedDirA = (0, group_memory_index_1.getGroupTypedMemoryDir)(sourceGroupA);
    const sourceTypedDirB = (0, group_memory_index_1.getGroupTypedMemoryDir)(sourceGroupB);
    const targetTypedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(targetGroup);
    const snapshotFile = path.join(group_orchestrator_1.CCM_DIR, "global-provider-reliability", `phase156-selftest-${process.pid}-${Date.now()}.json`);
    const targetProject = "api";
    const nowAt = "2026-07-10T08:00:00.000Z";
    const nowMs = Date.parse(nowAt);
    try {
        const { distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory, getOrRefreshGlobalProviderDispatchReliabilitySnapshot, readGlobalProviderDispatchReliabilitySnapshot, writeGlobalProviderDispatchReliabilitySnapshot, } = require("./group-memory-index");
        const validation = (groupId, project, agentType, id, status, at) => ({
            schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
            validation_id: id,
            groupId,
            project,
            agent_type: agentType,
            binding_id: `binding-${id}`,
            execution_id: `execution-${id}`,
            receipt_status: "done",
            status,
            contract_satisfied: status === "passed",
            repair_work_item_id: `repair-${id}`,
            contract: {
                rel_paths: [`private-${project}-${agentType}.md`],
                followup_work_item_ids: [`private-followup-${id}`],
                override_ids: [`private-override-${id}`],
            },
            gaps: status === "failed" ? [{ code: "missing_private_evidence", reason: "private receipt detail" }] : [],
            receipt: { memoryProvenanceUsage: [{ reason: "private receipt detail", currentSourceVerified: status === "passed" }] },
            at,
        });
        const seedSource = (groupId, project, suffix, atOffsetMinutes) => {
            const rows = [
                { validation: validation(groupId, project, "codex", `${suffix}-codex-failed-1`, "failed", new Date(nowMs - (atOffsetMinutes + 2) * 60_000).toISOString()) },
                { validation: validation(groupId, project, "codex", `${suffix}-codex-failed-2`, "failed", new Date(nowMs - (atOffsetMinutes + 1) * 60_000).toISOString()) },
                { validation: validation(groupId, project, "cursor", `${suffix}-cursor-passed`, "passed", new Date(nowMs - atOffsetMinutes * 60_000).toISOString()) },
            ];
            distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, { rows }, {
                updatedAt: new Date(nowMs - atOffsetMinutes * 60_000).toISOString(),
            });
        };
        seedSource(sourceGroupA, "private-source-a", "source-a", 10);
        seedSource(sourceGroupB, "private-source-b", "source-b", 5);
        const snapshotOptions = {
            snapshotFile,
            ttlMs: 5 * 60_000,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            nowMs,
            generatedAt: nowAt,
        };
        const written = writeGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
        const fresh = readGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
        const policy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject,
            agentType: "codex",
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
        });
        const advisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(targetGroup, targetProject, "codex", policy, {
            group: {
                id: targetGroup,
                members: [{
                        project: targetProject,
                        agent: "codex",
                        providerCandidates: [
                            { agent_type: "cursor", project: targetProject, configured: true },
                            { agent_type: "claude-code", project: "web", configured: true },
                        ],
                    }],
            },
            providerCandidates: [
                { agent_type: "cursor", project: targetProject, configured: true },
                { agent_type: "unconfigured-runner", project: targetProject, configured: false },
            ],
            providerReliabilitySnapshotFile: snapshotFile,
            providerReliabilitySnapshotTtlMs: 5 * 60_000,
            providerReliabilitySnapshotNowMs: nowMs,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            crossGroupProviderReliabilityMinSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
        }) || {};
        const packet = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project: targetProject }] },
            project: targetProject,
            agentType: "codex",
            task: "Phase 156 snapshot-backed configured provider ranking selftest.",
            pressureProvenanceDispatchFeedbackPolicy: policy,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 50000, autoCompactBufferTokens: 120 },
        });
        const assignment = {
            scopeId: targetGroup,
            project: targetProject,
            agentType: "codex",
            assignmentId: "assignment-phase156-provider-ranking",
            dispatchKey: "dispatch-phase156-provider-ranking",
        };
        const gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(assignment, packet);
        const decision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(assignment, packet, gate, { at: nowAt });
        const expired = readGlobalProviderDispatchReliabilitySnapshot({
            ...snapshotOptions,
            nowMs: nowMs + 5 * 60_000 + 1,
            allowBackupRecovery: false,
        });
        const originalText = fs.readFileSync(snapshotFile, "utf-8");
        const tamperedPayload = JSON.parse(originalText);
        tamperedPayload.signals.signals[0].risk_score = 0;
        fs.writeFileSync(snapshotFile, JSON.stringify(tamperedPayload, null, 2), "utf-8");
        const tampered = readGlobalProviderDispatchReliabilitySnapshot({
            ...snapshotOptions,
            allowBackupRecovery: false,
        });
        fs.writeFileSync(snapshotFile, originalText, "utf-8");
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupB, {
            rows: [{
                    validation: validation(sourceGroupB, "private-source-b", "cursor", "source-b-cursor-new-pass", "passed", "2026-07-10T07:59:00.000Z"),
                }],
        }, { updatedAt: "2026-07-10T07:59:00.000Z" });
        const staleGeneration = readGlobalProviderDispatchReliabilitySnapshot({
            ...snapshotOptions,
            allowBackupRecovery: false,
        });
        const refreshed = getOrRefreshGlobalProviderDispatchReliabilitySnapshot({
            ...snapshotOptions,
            allowBackupRecovery: false,
        });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(targetGroup, {
            rows: [
                { validation: validation(targetGroup, targetProject, "codex", "target-codex-local-failed-1", "failed", "2026-07-10T07:58:00.000Z") },
                { validation: validation(targetGroup, targetProject, "codex", "target-codex-local-failed-2", "failed", "2026-07-10T07:59:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T07:59:00.000Z" });
        const localPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject,
            agentType: "codex",
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            generatedAt: nowAt,
        });
        const localAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(targetGroup, targetProject, "codex", localPolicy, {
            providerCandidates: [{ agent_type: "cursor", project: targetProject, configured: true }],
            providerReliabilitySnapshotFile: snapshotFile,
            providerReliabilitySnapshotNowMs: nowMs,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            crossGroupProviderReliabilityMinSourceGroups: 2,
        }) || {};
        const localPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project: targetProject }] },
            project: targetProject,
            agentType: "codex",
            task: "Phase 156 local hold remains authoritative even with safer alternatives.",
            pressureProvenanceDispatchFeedbackPolicy: localPolicy,
            pressureProvenanceProviderDispatchAdvisory: localAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const localGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)({
            ...assignment,
            assignmentId: "assignment-phase156-local-hold",
            dispatchKey: "dispatch-phase156-local-hold",
        }, localPacket);
        const alternatives = advisory.safer_alternatives || [];
        const checks = {
            snapshotIsFreshAndChecksummed: fresh.usable === true
                && fresh.status === "fresh"
                && written.snapshot_checksum === fresh.snapshot?.snapshot_checksum
                && written.payload_checksum === fresh.snapshot?.payload_checksum
                && String(written.generation_id || "").startsWith("provider-reliability-generation:"),
            expiredSnapshotIsRejected: expired.usable === false
                && expired.status === "expired"
                && expired.validation?.gaps?.includes("expired"),
            tamperedSnapshotIsRejected: tampered.usable === false
                && tampered.status === "tampered"
                && (tampered.validation?.gaps || []).some((gap) => gap.includes("checksum")),
            sourceGenerationChangeInvalidatesSnapshot: staleGeneration.usable === false
                && staleGeneration.status === "stale_source_generation"
                && staleGeneration.validation?.source_generation_matches === false,
            staleSnapshotRefreshesToFreshGeneration: refreshed.usable === true
                && refreshed.status === "fresh"
                && refreshed.refreshed === true
                && refreshed.previous_status === "stale_source_generation",
            onlyExplicitSameProjectCandidateIsRanked: alternatives.length === 1
                && alternatives[0].agent_type === "cursor"
                && alternatives[0].project === targetProject
                && alternatives[0].safer_than_selected === true
                && !JSON.stringify(alternatives).includes("unconfigured-runner")
                && !JSON.stringify(alternatives).includes("claude-code"),
            rankingDoesNotAutoSwitchCurrentAssignment: advisory.selected_candidate?.agent_type === "codex"
                && decision.selected_provider?.agent_type === "codex"
                && decision.action === "dispatch_with_receipt_sampling"
                && gate.dispatch_ready === true,
            localHoldRemainsAuthoritativeWithAlternative: localPolicy.active === true
                && localAdvisory.selected_candidate?.agent_type === "codex"
                && localAdvisory.safer_alternative_count >= 1
                && localGate.dispatch_ready === false
                && localGate.provider_dispatch_hold === true,
            workerPacketRendersSnapshotAndAlternative: (0, runtime_kernel_1.renderWorkerContextPacket)(packet).includes("Safer alternatives")
                && (0, runtime_kernel_1.renderWorkerContextPacket)(packet).includes("snapshot"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            snapshot: {
                snapshot_id: fresh.snapshot?.snapshot_id || "",
                status: fresh.status,
                expires_at: fresh.snapshot?.expires_at || "",
                generation_id: fresh.snapshot?.generation_id || "",
            },
            ranking: {
                selected: advisory.selected_candidate?.agent_type || "",
                alternatives: alternatives.map((item) => ({
                    agent_type: item.agent_type,
                    local_health_status: item.local_health_status,
                    global_risk_status: item.global_risk_status,
                    composite_rank: item.composite_rank,
                })),
                dispatch_ready: gate.dispatch_ready,
            },
            local: {
                selected: localAdvisory.selected_candidate?.agent_type || "",
                alternative_count: localAdvisory.safer_alternative_count || 0,
                dispatch_ready: localGate.dispatch_ready,
            },
        };
    }
    finally {
        for (const dir of [sourceTypedDirA, sourceTypedDirB, targetTypedDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        for (const file of [snapshotFile, `${snapshotFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextProviderSwitchExecutionRankingSelfTest() {
    const groupId = `worker-context-provider-switch-execution-ranking-${process.pid}-${Date.now()}`;
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const snapshotFile = path.join(group_orchestrator_1.CCM_DIR, "global-provider-reliability", `phase159-selftest-${process.pid}-${Date.now()}.json`);
    const compactHookFile = (0, group_orchestrator_1.getWorkerContextCompactHookLedgerFileForCoordinator)(groupId);
    const compactOutcomeFile = (0, group_orchestrator_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId);
    const project = "api";
    const nowAt = "2026-07-10T10:00:00.000Z";
    const nowMs = Date.parse(nowAt);
    const oldMismatchAt = "2026-06-26T10:00:00.000Z";
    const currentProvider = "codex";
    const saferProvider = "cursor";
    const riskyProvider = "windsurf";
    try {
        const { writeGlobalProviderDispatchReliabilitySnapshot } = require("./group-memory-index");
        writeGlobalProviderDispatchReliabilitySnapshot({
            snapshotFile,
            ttlMs: 5 * 60_000,
            crossGroupProviderReliabilityGroupIds: [groupId],
            minSourceGroups: 1,
            providerReliabilityHalfLifeDays: 14,
            nowMs,
            generatedAt: nowAt,
            allowBackupRecovery: false,
        });
        const execution = (expectedProvider, actualProvider, suffix, at) => ({
            schema: "ccm-provider-switch-execution-receipt-v1",
            groupId,
            project,
            expected_provider: expectedProvider,
            actually_executed_provider: actualProvider,
            provider_switch_decision_receipt_id: `provider-switch-decision:phase159-${suffix}`,
            provider_switch_decision_receipt_checksum: `phase159-checksum-${suffix}`,
            execution_receipt_id: `provider-switch-execution:phase159-${suffix}`,
            task_agent_session_id: `tas-phase159-${suffix}`,
            native_session_id: `native-phase159-${suffix}`,
            execution_id: `execution-phase159-${suffix}`,
            receipt_status: "done",
            approved_switch: true,
            system_attested: true,
            child_declared: true,
            final_child_receipt_present: true,
            status: "failed",
            executed_as_approved: false,
            gaps: ["executed_provider_mismatch"],
            reason: `Phase 159 ${expectedProvider} expected but ${actualProvider} executed.`,
            at,
        });
        (0, group_memory_index_1.distillProviderSwitchExecutionToTypedMemory)(groupId, {
            rows: [
                execution(saferProvider, currentProvider, "candidate-old-mismatch", oldMismatchAt),
            ],
        }, {
            updatedAt: oldMismatchAt,
        });
        (0, group_memory_index_1.distillProviderSwitchExecutionToTypedMemory)(groupId, {
            rows: [
                execution(currentProvider, saferProvider, "selected-recent-mismatch", nowAt),
                execution(riskyProvider, currentProvider, "candidate-recent-mismatch", nowAt),
            ],
        }, {
            updatedAt: nowAt,
        });
        const policy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
            targetProject: project,
            agentType: currentProvider,
            providerSwitchExecutionMismatchThreshold: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
            nowMs,
            disableCrossGroupProviderReliability: true,
        });
        const advisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(groupId, project, currentProvider, policy, {
            group: {
                id: groupId,
                members: [{
                        project,
                        agent: currentProvider,
                        providerCandidates: [
                            { agent_type: saferProvider, project, configured: true },
                            { agent_type: riskyProvider, project, configured: true },
                            { agent_type: "wrong-project-runner", project: "web", configured: true },
                        ],
                    }],
            },
            providerCandidates: [
                { agent_type: saferProvider, project, configured: true },
                { agent_type: riskyProvider, project, configured: true },
                { agent_type: "unconfigured-runner", project, configured: false },
            ],
            providerReliabilitySnapshotFile: snapshotFile,
            providerReliabilitySnapshotTtlMs: 5 * 60_000,
            providerReliabilitySnapshotNowMs: nowMs,
            crossGroupProviderReliabilityGroupIds: [groupId],
            crossGroupProviderReliabilityMinSourceGroups: 1,
            providerReliabilityHalfLifeDays: 14,
            providerSwitchExecutionMismatchThreshold: 2,
            generatedAt: nowAt,
        }) || {};
        const packet = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project }] },
            project,
            agentType: currentProvider,
            task: "Phase 159 provider switch execution decayed ranking selftest.",
            pressureProvenanceDispatchFeedbackPolicy: policy,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const assignment = {
            scopeId: groupId,
            project,
            agentType: currentProvider,
            assignmentId: "assignment-phase159-provider-switch-execution-ranking",
            dispatchKey: "dispatch-phase159-provider-switch-execution-ranking",
        };
        const gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(assignment, packet);
        const decision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(assignment, packet, gate, { at: nowAt });
        const selected = advisory.selected_candidate || {};
        const rankedCandidates = advisory.ranked_provider_candidates || [];
        const alternatives = advisory.safer_alternatives || [];
        const saferAlternative = alternatives.find((item) => item.agent_type === saferProvider) || {};
        const riskyAlternative = alternatives.find((item) => item.agent_type === riskyProvider) || {};
        const policyRow = (policy.policyRows || [])[0] || {};
        const rendered = (0, runtime_kernel_1.renderWorkerContextPacket)(packet);
        const switchReceipt = (0, group_orchestrator_1.buildProviderSwitchDecisionReceiptForCoordinator)(groupId, {
            ...assignment,
            worker_context_packet: packet,
        }, {
            requested_agent_type: saferProvider,
            compatibility_confirmed: true,
            compatibility_evidence: ["cursor remains explicitly configured for the api project and has lower decayed provider switch execution risk"],
            reason: "Phase 160 provider ranking provenance selftest",
            authority: {
                kind: "local_user",
                authority_id: "phase160-provider-ranking-provenance-authority",
                approved: true,
                local_policy_authority: true,
                allow_switch_away_from_held_provider: true,
            },
        }, {
            verifySnapshot: false,
            nowMs,
            at: nowAt,
        });
        const receiptPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project }] },
            project,
            agentType: saferProvider,
            task: "Phase 160 provider ranking provenance receipt rendering selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            providerSwitchDecisionReceipt: switchReceipt,
            contextUsageOptions: { maxTokens: 50000, autoCompactBufferTokens: 120 },
        });
        const receiptRendered = (0, runtime_kernel_1.renderWorkerContextPacket)(receiptPacket);
        const compactAnalysis = {
            summary: "Phase 161 provider ranking provenance compact retry preservation selftest",
            constraints: Array.from({ length: 10 }, (_, index) => `PROVIDER_RANKING_PROVENANCE_COMPACT_CONSTRAINT_${index}: ${"provider provenance ".repeat(180)}`),
            documentFindings: Array.from({ length: 14 }, (_, index) => `docs/provider-ranking-provenance-${index}.md: ${"compact proof ".repeat(180)}`),
        };
        const compactAssignment = {
            ...assignment,
            agentType: saferProvider,
            agent_type: saferProvider,
            assignmentId: "assignment-phase161-provider-ranking-provenance-compact",
            dispatchKey: "dispatch-phase161-provider-ranking-provenance-compact",
            task: "Phase 161 provider ranking provenance compact retry selftest.",
        };
        const compactOptions = {
            group: { id: groupId, members: [{ project, agent: saferProvider }] },
            analysis: compactAnalysis,
            providerSwitchDecisionReceipt: switchReceipt,
            disableCrossGroupProviderReliability: true,
            providerReliabilityHalfLifeDays: 14,
            providerSwitchExecutionMismatchThreshold: 2,
            nowMs,
            generatedAt: nowAt,
            workerContextUsageOptions: { maxTokens: 9000, autoCompactBufferTokens: 120 },
            workerContextRetryOptions: {
                metadata: {
                    maxCategories: 1,
                    maxItems: 4,
                    maxStringChars: 160,
                },
                maxTaskChars: 1800,
            },
        };
        const compactInitialPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(compactAssignment, "", [], compactOptions);
        const compactInitialGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(compactAssignment, compactInitialPacket);
        const compactRetry = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(compactAssignment, "", [], compactInitialPacket, compactInitialGate, compactOptions);
        const compactRetryReceipt = compactRetry.packet?.provider_switch_decision_receipt || {};
        const compactRetryProvenancePreservation = compactRetry.retry?.provider_ranking_provenance_preservation
            || compactRetry.packet?.context_compaction_retry?.provider_ranking_provenance_preservation
            || {};
        const compactOutcomeLedger = (0, group_orchestrator_1.readWorkerContextCompactOutcomeLedgerForCoordinator)(groupId);
        const compactOutcome = (compactOutcomeLedger.entries || []).find((item) => item.retry_id === (compactRetry.retry?.retry_id || compactRetry.packet?.context_compaction_retry?.retry_id || "")
            || item.hook_run_id === (compactRetry.retry?.compact_hook_run_id || compactRetry.packet?.context_compaction_retry?.compact_hook_run_id || "")) || {};
        const compactRetryRendered = (0, runtime_kernel_1.renderWorkerContextPacket)(compactRetry.packet);
        const checks = {
            policyCarriesDecayedExecutionRisk: Number(policyRow.provider_switch_execution_weighted_risk_score || 0) > 0
                && Number(policyRow.provider_switch_execution_decayed_mismatch_score || 0) > 0
                && Number(policyRow.provider_switch_execution_half_life_days || 0) === 14,
            policyCarriesTypedMemoryProvenance: Array.isArray(policyRow.provider_switch_execution_row_ids)
                && policyRow.provider_switch_execution_row_ids.some((id) => String(id || "").startsWith("provider-switch-execution:"))
                && Array.isArray(policyRow.provider_switch_execution_memory_rel_paths)
                && policyRow.provider_switch_execution_memory_rel_paths.includes("provider-switch-execution-memory.md"),
            rankingUsesExecutionDecayForSaferAlternative: saferAlternative.agent_type === saferProvider
                && Number(saferAlternative.local_execution_rank_penalty || 0) < Number(selected.local_execution_rank_penalty || 0)
                && Number(saferAlternative.composite_rank || 0) < Number(selected.composite_rank || 0),
            advisoryCarriesCompactSafeRankingProvenance: selected.provider_ranking_provenance?.compact_safe === true
                && selected.provider_ranking_provenance?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
                && selected.provider_ranking_provenance?.typed_memory_row_ids?.some((id) => String(id || "").startsWith("provider-switch-execution:"))
                && saferAlternative.provider_ranking_provenance?.compact_safe === true
                && saferAlternative.provider_ranking_provenance?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md"),
            equallyRecentMismatchIsNotPreferred: !riskyAlternative.agent_type,
            rankingDoesNotAutoSwitchCurrentAssignment: selected.agent_type === currentProvider
                && decision.selected_provider?.agent_type === currentProvider
                && decision.action !== "switch_provider"
                && gate.provider_dispatch_hold !== true,
            renderedPacketShowsRankingProvenance: rendered.includes("Provider switch execution history")
                && rendered.includes("rank=")
                && rendered.includes("execPenalty=")
                && rendered.includes("Provider ranking provenance")
                && rendered.includes("provider-switch-execution-memory.md")
                && rendered.includes("Current assignment is unchanged"),
            switchReceiptPreservesRankingProvenance: switchReceipt.valid === true
                && switchReceipt.provider_ranking_provenance?.requested_candidate?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
                && switchReceipt.provider_ranking_provenance?.requested_candidate?.typed_memory_row_ids?.some((id) => String(id || "").startsWith("provider-switch-execution:"))
                && receiptRendered.includes("Ranking provenance")
                && receiptRendered.includes("provider-switch-execution-memory.md"),
            compactRetryPreservesProviderRankingProvenance: compactInitialGate.dispatch_ready === false
                && compactRetry.gate?.dispatch_ready !== false
                && compactRetry.retry?.schema === "ccm-worker-context-compaction-retry-v1"
                && compactRetryProvenancePreservation.required === true
                && compactRetryProvenancePreservation.preserved === true
                && compactRetryProvenancePreservation.before?.provider_switch_decision_receipt_id === switchReceipt.receipt_id
                && compactRetryProvenancePreservation.after?.provider_switch_decision_receipt_id === switchReceipt.receipt_id
                && compactRetryProvenancePreservation.after?.typed_memory_rel_paths?.includes("provider-switch-execution-memory.md")
                && compactRetryReceipt.receipt_id === switchReceipt.receipt_id
                && compactRetryReceipt.receipt_checksum === switchReceipt.receipt_checksum,
            compactOutcomeLedgerCarriesProviderRankingProvenance: compactOutcome.provider_ranking_provenance_preservation?.required === true
                && compactOutcome.provider_ranking_provenance_preservation?.preserved === true
                && compactOutcome.provider_ranking_provenance_preserved === true
                && Number(compactOutcomeLedger.stats?.providerRankingProvenanceRequired || 0) >= 1
                && Number(compactOutcomeLedger.stats?.providerRankingProvenancePreserved || 0) >= 1,
            compactRenderedPacketStillShowsRankingProvenance: compactRetryRendered.includes("Ranking provenance")
                && compactRetryRendered.includes("provider-switch-execution-memory.md")
                && compactRetryRendered.includes(switchReceipt.receipt_id),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            selected: {
                agent_type: selected.agent_type || "",
                composite_rank: selected.composite_rank || 0,
                local_execution_rank_penalty: selected.local_execution_rank_penalty || 0,
                weighted_risk_score: selected.provider_switch_execution_weighted_risk_score || 0,
            },
            alternatives: alternatives.map((item) => ({
                agent_type: item.agent_type,
                composite_rank: item.composite_rank,
                selected_composite_rank: item.selected_composite_rank,
                local_execution_rank_penalty: item.local_execution_rank_penalty,
                weighted_risk_score: item.provider_switch_execution_weighted_risk_score,
                provenance: item.provider_ranking_provenance,
            })),
            rankedCandidates: rankedCandidates.map((item) => ({
                agent_type: item.agent_type,
                local_health_status: item.local_health_status,
                local_dispatch_policy: item.local_dispatch_policy,
                composite_rank: item.composite_rank,
                selected_composite_rank: item.selected_composite_rank,
                safer_than_selected: item.safer_than_selected,
                local_execution_rank_penalty: item.local_execution_rank_penalty,
                weighted_risk_score: item.provider_switch_execution_weighted_risk_score,
            })),
            decision: {
                action: decision.action || "",
                selected_provider: decision.selected_provider?.agent_type || "",
                dispatch_ready: gate.dispatch_ready,
            },
            switchReceipt: {
                valid: switchReceipt.valid === true,
                status: switchReceipt.status || "",
                requested_provider: switchReceipt.new_provider?.agent_type || "",
                provenance: switchReceipt.provider_ranking_provenance?.requested_candidate || null,
            },
            compactRetry: {
                status: compactRetry.retry?.status || "",
                method: compactRetry.retry?.method || "",
                dispatch_ready: compactRetry.gate?.dispatch_ready !== false,
                gate_reason: compactRetry.gate?.reason || "",
                pressure_status: compactRetry.gate?.pressure_status || "",
                provider_dispatch_hold: compactRetry.gate?.provider_dispatch_hold === true,
                total_tokens: compactRetry.packet?.context_usage?.total_tokens || 0,
                max_tokens: compactRetry.packet?.context_usage?.max_tokens || 0,
                free_tokens: compactRetry.packet?.context_usage?.free_tokens || 0,
                provider_ranking_provenance_required: compactRetryProvenancePreservation.required === true,
                provider_ranking_provenance_preserved: compactRetryProvenancePreservation.preserved === true,
                outcome_provider_ranking_provenance_preserved: compactOutcome.provider_ranking_provenance_preserved === true,
            },
        };
    }
    finally {
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        for (const file of [snapshotFile, `${snapshotFile}.bak`, compactHookFile, `${compactHookFile}.bak`, compactOutcomeFile, `${compactOutcomeFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextProviderSwitchDecisionReceiptSelfTest() {
    const sourceGroup = `worker-context-provider-switch-source-${process.pid}-${Date.now()}`;
    const targetGroup = `worker-context-provider-switch-target-${process.pid}-${Date.now()}`;
    const sourceTypedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(sourceGroup);
    const targetTypedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(targetGroup);
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(targetGroup);
    const snapshotFile = path.join(group_orchestrator_1.CCM_DIR, "global-provider-reliability", `phase157-selftest-${process.pid}-${Date.now()}.json`);
    const project = "api";
    const oldProvider = "codex";
    const newProvider = "cursor";
    const nowAt = "2026-07-10T09:00:00.000Z";
    const nowMs = Date.parse(nowAt);
    const snapshotOptions = {
        snapshotFile,
        ttlMs: 5 * 60_000,
        crossGroupProviderReliabilityGroupIds: [sourceGroup],
        minSourceGroups: 1,
        nowMs,
        generatedAt: nowAt,
        allowBackupRecovery: false,
    };
    try {
        const { buildGroupTypedMemoryRecall, distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory, readGroupTypedMemoryDistillationLedger, writeGlobalProviderDispatchReliabilitySnapshot, } = require("./group-memory-index");
        const snapshot = writeGlobalProviderDispatchReliabilitySnapshot(snapshotOptions);
        const snapshotRef = {
            schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
            snapshot_id: snapshot.snapshot_id,
            generation_id: snapshot.generation_id,
            snapshot_checksum: snapshot.snapshot_checksum,
            payload_checksum: snapshot.payload_checksum,
            status: "fresh",
            usable: true,
            generated_at: snapshot.generated_at,
            expires_at: snapshot.expires_at,
            source_generation_checksum: snapshot.source_provenance?.generation_checksum || "",
            guidance_only: true,
            local_policy_override_allowed: false,
            contains_private_memory: false,
        };
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            version: 1,
            groupId: targetGroup,
            project,
            agent_type: oldProvider,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                project,
                agent_type: oldProvider,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
            },
            provider_reliability_snapshot: snapshotRef,
            safer_alternative_count: 1,
            safer_alternatives: [{
                    schema: "ccm-provider-dispatch-safer-alternative-v1",
                    agent_type: newProvider,
                    project,
                    configured: true,
                    local_health_status: "healthy",
                    local_dispatch_policy: "preferred",
                    global_risk_status: "low",
                    global_risk_score: 0,
                    composite_rank: 8,
                    selected_composite_rank: 20,
                    safer_than_selected: true,
                    snapshot_id: snapshot.snapshot_id,
                    snapshot_checksum: snapshot.snapshot_checksum,
                    snapshot_status: "fresh",
                }],
        };
        const packet = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project }] },
            project,
            agentType: oldProvider,
            task: "Phase 157 provider switch decision receipt selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const baseAssignment = {
            scopeId: targetGroup,
            project,
            agentType: oldProvider,
            agent_type: oldProvider,
            assignmentId: "assignment-phase157-provider-switch-match",
            dispatchKey: "dispatch-phase157-provider-switch-match",
            taskFingerprint: "phase157 provider switch match",
            task: "Phase 157 provider switch decision receipt selftest.",
            worker_context_packet: packet,
        };
        const gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, packet);
        baseAssignment.worker_context_pre_dispatch_gate = gate;
        const request = {
            requested_agent_type: newProvider,
            compatibility_confirmed: true,
            compatibility_evidence: ["cursor supports this repository task and required toolchain"],
            reason: "use the ranked safer provider for this task",
            authority: {
                kind: "task_runtime_override",
                authority_id: "task-runtime-override-phase157",
                approved: true,
                local_policy_authority: true,
                allow_switch_away_from_held_provider: true,
                reason: "explicit local task authority",
            },
        };
        const receipt = (0, group_orchestrator_1.buildProviderSwitchDecisionReceiptForCoordinator)(targetGroup, baseAssignment, request, {
            ...snapshotOptions,
            at: nowAt,
        });
        const rehash = (value) => {
            const next = JSON.parse(JSON.stringify(value));
            next.receipt_checksum = (0, group_orchestrator_1.providerSwitchDecisionReceiptChecksumForCoordinator)(next);
            return next;
        };
        const expiredValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(receipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
            nowMs: Date.parse(snapshot.expires_at) + 1,
        });
        const tamperedReceipt = JSON.parse(JSON.stringify(receipt));
        tamperedReceipt.new_provider.agent_type = "claude-code";
        const tamperedValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(tamperedReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const projectMismatchReceipt = rehash({
            ...receipt,
            new_provider: { ...receipt.new_provider, project: "web" },
            task_compatibility: { ...receipt.task_compatibility, project_match: false },
        });
        const projectMismatchValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(projectMismatchReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const unconfiguredReceipt = rehash({
            ...receipt,
            new_provider: { ...receipt.new_provider, configured: false },
        });
        const unconfiguredValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(unconfiguredReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const missingCompatibilityReceipt = rehash({
            ...receipt,
            task_compatibility: { ...receipt.task_compatibility, confirmed: false, evidence: [] },
        });
        const missingCompatibilityValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(missingCompatibilityReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const missingAuthorityReceipt = rehash({
            ...receipt,
            authority: {
                ...receipt.authority,
                kind: "cross_group_reliability_guidance",
                approved: false,
                local_policy_authority: false,
            },
        });
        const missingAuthorityValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(missingAuthorityReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const heldWithoutPermissionReceipt = rehash({
            ...receipt,
            old_provider: { ...receipt.old_provider, local_hold: true, local_dispatch_policy: "hold_until_repair" },
            authority: { ...receipt.authority, allow_switch_away_from_held_provider: false },
        });
        const heldWithoutPermissionValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(heldWithoutPermissionReceipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const crossGroupValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(receipt, {
            ...snapshotOptions,
            groupId: `${targetGroup}-wrong`,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const switchedPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project }] },
            project,
            agentType: newProvider,
            task: baseAssignment.task,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            providerSwitchDecisionReceipt: receipt,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const switchedAssignment = {
            ...baseAssignment,
            original_agent_type: oldProvider,
            agentType: newProvider,
            agent_type: newProvider,
            provider_switch_decision_receipt: receipt,
            worker_context_packet: switchedPacket,
        };
        switchedAssignment.worker_context_pre_dispatch_gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(switchedAssignment, switchedPacket);
        switchedAssignment.worker_context_provider_dispatch_decision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(switchedAssignment, switchedPacket, switchedAssignment.worker_context_pre_dispatch_gate, { at: nowAt });
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(targetGroup, switchedAssignment, { at: nowAt });
        const rejectedProjectBinding = (0, group_orchestrator_1.recordWorkerContextProviderSwitchSessionBindingForCoordinator)(targetGroup, {
            assignment_id: switchedAssignment.assignmentId,
            dispatch_key: switchedAssignment.dispatchKey,
            provider_switch_decision_receipt: receipt,
            project: "web",
            agent_type: newProvider,
            task_agent_session_id: "tas-phase157-match",
            native_session_id: "native-phase157-match",
            execution_id: "execution-phase157-match",
        }, snapshotOptions);
        const matchedSessionBinding = (0, group_orchestrator_1.recordWorkerContextProviderSwitchSessionBindingForCoordinator)(targetGroup, {
            assignment_id: switchedAssignment.assignmentId,
            dispatch_key: switchedAssignment.dispatchKey,
            provider_switch_decision_receipt: receipt,
            project,
            agent_type: newProvider,
            task_agent_session_id: "tas-phase157-match",
            native_session_id: "native-phase157-match",
            execution_id: "execution-phase157-match",
        }, snapshotOptions);
        const matchedExecution = (0, group_orchestrator_1.recordWorkerContextProviderSwitchExecutionReceiptForCoordinator)(targetGroup, {
            assignment_id: switchedAssignment.assignmentId,
            dispatch_key: switchedAssignment.dispatchKey,
            project,
            executed_provider: newProvider,
            task_agent_session_id: "tas-phase157-match",
            native_session_id: "native-phase157-match",
            execution_id: "execution-phase157-match",
            receipt_status: "done",
            receipt: {
                status: "done",
                providerSwitchExecution: {
                    decisionReceiptId: receipt.receipt_id,
                    expectedProvider: newProvider,
                    executedProvider: newProvider,
                    taskAgentSessionId: "tas-phase157-match",
                    nativeSessionId: "native-phase157-match",
                    executionId: "execution-phase157-match",
                    usageState: "executed",
                    reason: "executed with the approved provider",
                },
            },
        }, snapshotOptions);
        const mismatchAssignmentBase = {
            ...baseAssignment,
            assignmentId: "assignment-phase157-provider-switch-mismatch",
            dispatchKey: "dispatch-phase157-provider-switch-mismatch",
            taskFingerprint: "phase157 provider switch mismatch",
        };
        const mismatchReceipt = (0, group_orchestrator_1.buildProviderSwitchDecisionReceiptForCoordinator)(targetGroup, mismatchAssignmentBase, request, {
            ...snapshotOptions,
            at: nowAt,
        });
        const mismatchPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project }] },
            project,
            agentType: newProvider,
            task: mismatchAssignmentBase.task,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            providerSwitchDecisionReceipt: mismatchReceipt,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const mismatchAssignment = {
            ...mismatchAssignmentBase,
            original_agent_type: oldProvider,
            agentType: newProvider,
            agent_type: newProvider,
            provider_switch_decision_receipt: mismatchReceipt,
            worker_context_packet: mismatchPacket,
        };
        mismatchAssignment.worker_context_pre_dispatch_gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(mismatchAssignment, mismatchPacket);
        mismatchAssignment.worker_context_provider_dispatch_decision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(mismatchAssignment, mismatchPacket, mismatchAssignment.worker_context_pre_dispatch_gate, { at: nowAt });
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(targetGroup, mismatchAssignment, { at: nowAt });
        (0, group_orchestrator_1.recordWorkerContextProviderSwitchSessionBindingForCoordinator)(targetGroup, {
            assignment_id: mismatchAssignment.assignmentId,
            dispatch_key: mismatchAssignment.dispatchKey,
            provider_switch_decision_receipt: mismatchReceipt,
            project,
            agent_type: newProvider,
            task_agent_session_id: "tas-phase157-mismatch",
            native_session_id: "native-phase157-mismatch",
            execution_id: "execution-phase157-mismatch",
        }, snapshotOptions);
        const mismatchedExecution = (0, group_orchestrator_1.recordWorkerContextProviderSwitchExecutionReceiptForCoordinator)(targetGroup, {
            assignment_id: mismatchAssignment.assignmentId,
            dispatch_key: mismatchAssignment.dispatchKey,
            project,
            executed_provider: oldProvider,
            task_agent_session_id: "tas-phase157-mismatch",
            native_session_id: "native-phase157-mismatch",
            execution_id: "execution-phase157-mismatch",
            receipt_status: "done",
            receipt: {
                status: "done",
                providerSwitchExecution: {
                    decisionReceiptId: mismatchReceipt.receipt_id,
                    expectedProvider: newProvider,
                    executedProvider: oldProvider,
                    taskAgentSessionId: "tas-phase157-mismatch",
                    nativeSessionId: "native-phase157-mismatch",
                    executionId: "execution-phase157-mismatch",
                    usageState: "mismatch",
                    reason: "runtime fallback executed with the original provider",
                },
            },
        }, snapshotOptions);
        const advisedOnlyAssignment = {
            ...baseAssignment,
            assignmentId: "assignment-phase157-provider-advised-only",
            dispatchKey: "dispatch-phase157-provider-advised-only",
            taskFingerprint: "phase157 provider advised only",
        };
        advisedOnlyAssignment.worker_context_pre_dispatch_gate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(advisedOnlyAssignment, packet);
        advisedOnlyAssignment.worker_context_provider_dispatch_decision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(advisedOnlyAssignment, packet, advisedOnlyAssignment.worker_context_pre_dispatch_gate, { at: nowAt });
        (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(targetGroup, advisedOnlyAssignment, { at: nowAt });
        const largeTask = [
            "Phase 157 provider switch receipt compact retry preservation.",
            "PROVIDER_SWITCH_COMPACT_BLOCK ".repeat(1600),
            "The approved provider switch receipt must remain in the final WorkerContextPacket.",
        ].join("\n");
        const largeAssignment = {
            ...switchedAssignment,
            assignmentId: "assignment-phase157-provider-switch-compact",
            dispatchKey: "dispatch-phase157-provider-switch-compact",
            task: largeTask,
        };
        const largePacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(largeAssignment, "", [], {
            group: { id: targetGroup, members: [{ project, agent: newProvider }] },
            providerSwitchDecisionReceipt: receipt,
            workerContextUsageOptions: { maxTokens: 2200, autoCompactBufferTokens: 120 },
        });
        const largeGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(largeAssignment, largePacket);
        const compactRetry = (0, group_orchestrator_1.maybeRetryWorkerContextPacketCompactionForCoordinator)(largeAssignment, "", [], largePacket, largeGate, {
            group: { id: targetGroup, members: [{ project, agent: newProvider }] },
            providerSwitchDecisionReceipt: receipt,
            workerContextUsageOptions: { maxTokens: 2200, autoCompactBufferTokens: 120 },
            workerContextRetryOptions: { maxTaskChars: 1400 },
        });
        const compactRetryDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(largeAssignment, compactRetry.packet, compactRetry.gate, { at: nowAt });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroup, {
            rows: [{
                    validation: {
                        schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
                        validation_id: "phase157-source-generation-change",
                        groupId: sourceGroup,
                        project: "private-source-project",
                        agent_type: newProvider,
                        binding_id: "binding-phase157-source-generation-change",
                        execution_id: "execution-phase157-source-generation-change",
                        receipt_status: "done",
                        status: "passed",
                        contract_satisfied: true,
                        contract: { rel_paths: ["private-source-evidence.md"] },
                        gaps: [],
                        at: "2026-07-10T09:01:00.000Z",
                    },
                }],
        }, { updatedAt: "2026-07-10T09:01:00.000Z" });
        const staleValidation = (0, group_orchestrator_1.validateProviderSwitchDecisionReceiptForCoordinator)(receipt, {
            ...snapshotOptions,
            groupId: targetGroup,
            project,
            assignmentId: baseAssignment.assignmentId,
            dispatchKey: baseAssignment.dispatchKey,
        });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(targetGroup);
        const typedLedger = readGroupTypedMemoryDistillationLedger(targetGroup);
        const providerSwitchExecutionArchive = typedLedger.providerSwitchExecutionArchive || {};
        const providerSwitchExecutionRecall = buildGroupTypedMemoryRecall(targetGroup, [
            "Phase 158 provider switch execution typed memory",
            "execution-phase157-mismatch",
            "runtime fallback executed with the original provider",
            "provider switch execution mismatch history",
        ].join("\n"), {
            disableLedger: true,
            forceMemory: true,
            max: 8,
            snippetChars: 320,
        });
        const providerSwitchExecutionPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject: project,
            agentType: newProvider,
            providerSwitchExecutionMismatchThreshold: 1,
            generatedAt: nowAt,
            disableCrossGroupProviderReliability: true,
        });
        const matchedEntry = (ledger.entries || []).find((entry) => entry.assignment_id === switchedAssignment.assignmentId) || {};
        const mismatchEntry = (ledger.entries || []).find((entry) => entry.assignment_id === mismatchAssignment.assignmentId) || {};
        const advisedEntry = (ledger.entries || []).find((entry) => entry.assignment_id === advisedOnlyAssignment.assignmentId) || {};
        const checks = {
            validSwitchIsApprovedAndChecksummed: receipt.valid === true
                && receipt.status === "approved"
                && receipt.old_provider?.agent_type === oldProvider
                && receipt.new_provider?.agent_type === newProvider
                && receipt.validation?.snapshot_status === "fresh",
            expiredSnapshotRejectsReceipt: expiredValidation.valid === false
                && expiredValidation.gaps.some((gap) => gap === "snapshot_expired" || gap.includes("snapshot_read_expired")),
            tamperedReceiptIsRejected: tamperedValidation.valid === false
                && tamperedValidation.gaps.includes("receipt_checksum"),
            staleSourceGenerationRejectsReceipt: staleValidation.valid === false
                && staleValidation.gaps.some((gap) => gap.includes("stale_source_generation")),
            projectAndGroupMismatchAreRejected: projectMismatchValidation.gaps.includes("candidate_project_mismatch")
                && crossGroupValidation.gaps.includes("group_id_mismatch"),
            unconfiguredCandidateIsRejected: unconfiguredValidation.gaps.includes("candidate_not_configured"),
            compatibilityEvidenceIsRequired: missingCompatibilityValidation.gaps.includes("task_compatibility_not_confirmed")
                && missingCompatibilityValidation.gaps.includes("task_compatibility_evidence_missing"),
            localAuthorityIsRequired: missingAuthorityValidation.gaps.includes("authority_not_approved")
                && missingAuthorityValidation.gaps.includes("local_policy_authority_missing"),
            heldProviderNeedsExplicitSwitchPermission: heldWithoutPermissionValidation.gaps.includes("held_provider_switch_not_authorized"),
            sessionBindingRejectsWrongProjectThenBindsActualSession: rejectedProjectBinding?.status === "rejected"
                && rejectedProjectBinding?.gaps?.includes("project_mismatch")
                && matchedSessionBinding?.status === "bound"
                && matchedSessionBinding?.task_agent_session_id === "tas-phase157-match",
            matchedExecutionIsSystemAttested: matchedExecution?.status === "passed"
                && matchedExecution?.executed_as_approved === true
                && matchedExecution?.system_attested === true
                && matchedExecution?.child_declared === true,
            runtimeFallbackMismatchIsNotDisguisedAsApprovedExecution: mismatchedExecution?.status === "failed"
                && mismatchedExecution?.executed_as_approved === false
                && mismatchedExecution?.gaps?.includes("executed_provider_mismatch")
                && mismatchedExecution?.actually_executed_provider === oldProvider,
            ledgerSeparatesAdvisedApprovedAndExecutedStates: advisedEntry.provider_switch_ledger_state?.advised_alternative === true
                && advisedEntry.provider_switch_ledger_state?.approved_switch === false
                && !advisedEntry.provider_switch_ledger_state?.actually_executed_provider
                && matchedEntry.provider_switch_ledger_state?.approved_switch === true
                && matchedEntry.provider_switch_ledger_state?.actually_executed_provider === newProvider
                && mismatchEntry.provider_switch_ledger_state?.approved_switch === true
                && mismatchEntry.provider_switch_ledger_state?.actually_executed_provider === oldProvider
                && Number(ledger.providerSwitchAdvisedCount || 0) === 3
                && Number(ledger.providerSwitchApprovedCount || 0) === 2
                && Number(ledger.providerSwitchSessionBoundCount || 0) === 2
                && Number(ledger.providerSwitchExecutedCount || 0) === 2
                && Number(ledger.providerSwitchExecutionPassedCount || 0) === 1
                && Number(ledger.providerSwitchExecutionFailedCount || 0) === 1,
            compactRetryPreservesDecisionReceipt: largeGate.dispatch_ready === false
                && compactRetry.packet?.provider_switch_decision_receipt?.receipt_id === receipt.receipt_id
                && compactRetry.packet?.provider_switch_decision_receipt?.receipt_checksum === receipt.receipt_checksum
                && (0, runtime_kernel_1.renderWorkerContextPacket)(compactRetry.packet || {}).includes(receipt.receipt_id)
                && compactRetryDecision.advised_alternative === true
                && compactRetryDecision.approved_switch === true,
            providerSwitchExecutionDistillsToTypedMemory: providerSwitchExecutionArchive.schema === "ccm-provider-switch-execution-distillation-v1"
                && Number(providerSwitchExecutionArchive.executed_count || 0) === 2
                && Number(providerSwitchExecutionArchive.passed_count || 0) === 1
                && Number(providerSwitchExecutionArchive.failed_count || 0) === 1
                && Number(providerSwitchExecutionArchive.mismatch_count || 0) === 1
                && matchedExecution?.typed_memory_distillation?.writeCount >= 1
                && mismatchedExecution?.typed_memory_distillation?.writeCount >= 1,
            providerSwitchExecutionTypedMemoryIsRecallable: JSON.stringify(providerSwitchExecutionRecall.recalled || []).includes("provider-switch-execution-memory.md")
                && JSON.stringify(providerSwitchExecutionRecall.recalled || []).includes("Provider switch execution"),
            providerSwitchExecutionPolicySeesMismatchHistory: providerSwitchExecutionPolicy.action === "hold_provider_after_repeated_provider_switch_execution_mismatches"
                && providerSwitchExecutionPolicy.active === true
                && Number(providerSwitchExecutionPolicy.providerSwitchExecutionMismatchCount || 0) === 1
                && providerSwitchExecutionPolicy.policyRows?.[0]?.provider_switch_execution_mismatch_escalated === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receipt: {
                receipt_id: receipt.receipt_id || "",
                status: receipt.status || "",
                snapshot_id: receipt.provider_reliability_snapshot?.snapshot_id || "",
                old_provider: receipt.old_provider?.agent_type || "",
                new_provider: receipt.new_provider?.agent_type || "",
            },
            sessionBinding: matchedSessionBinding,
            matchedExecution,
            mismatchedExecution,
            ledger: {
                providerSwitchAdvisedCount: ledger.providerSwitchAdvisedCount || 0,
                providerSwitchApprovedCount: ledger.providerSwitchApprovedCount || 0,
                providerSwitchSessionBoundCount: ledger.providerSwitchSessionBoundCount || 0,
                providerSwitchExecutedCount: ledger.providerSwitchExecutedCount || 0,
                providerSwitchExecutionPassedCount: ledger.providerSwitchExecutionPassedCount || 0,
                providerSwitchExecutionFailedCount: ledger.providerSwitchExecutionFailedCount || 0,
            },
            typedMemory: {
                archiveSchema: providerSwitchExecutionArchive.schema || "",
                executedCount: providerSwitchExecutionArchive.executed_count || 0,
                passedCount: providerSwitchExecutionArchive.passed_count || 0,
                failedCount: providerSwitchExecutionArchive.failed_count || 0,
                mismatchCount: providerSwitchExecutionArchive.mismatch_count || 0,
                recallCount: Array.isArray(providerSwitchExecutionRecall.recalled) ? providerSwitchExecutionRecall.recalled.length : 0,
                policyAction: providerSwitchExecutionPolicy.action || "",
            },
            compactRetry: {
                status: compactRetry.retry?.status || "",
                receipt_id: compactRetry.packet?.provider_switch_decision_receipt?.receipt_id || "",
                usage_status: compactRetry.packet?.context_usage?.status || "",
            },
        };
    }
    finally {
        for (const dir of [sourceTypedDir, targetTypedDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        for (const file of [snapshotFile, `${snapshotFile}.bak`, bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
    const groupId = `worker-context-pressure-provenance-provider-dispatch-decision-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-decision.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase146-initial-missing-usage",
                    binding_id: "binding-phase146-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase146-initial-current-source-gap",
                    binding_id: "binding-phase146-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T03:20:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase146-recovery-1",
                    binding_id: "binding-phase146-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase146-recovery-2",
                    binding_id: "binding-phase146-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T03:20:01.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase146-relapse-missing-usage",
                    binding_id: "binding-phase146-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T03:20:02.000Z",
        });
        const activeAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证 pressure provenance provider dispatch decision ledger 会记录 hold 决策。", "selftest pressure provenance provider dispatch decision", "", { group, workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 } });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase146-post-relapse-recovery",
                    binding_id: "binding-phase146-post-relapse-recovery",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T03:20:03.000Z",
        });
        const recoveredAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证 pressure provenance provider dispatch decision ledger 会记录恢复后的 sampling 放行决策。", "selftest pressure provenance provider dispatch decision recovered", "", { group, workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 } });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const activeBinding = (ledger.entries || []).find((entry) => entry.assignment_id === activeAssignment.assignmentId) || {};
        const recoveredBinding = (ledger.entries || []).find((entry) => entry.assignment_id === recoveredAssignment.assignmentId) || {};
        const activeDecision = activeBinding.worker_context_provider_dispatch_decision || {};
        const recoveredDecision = recoveredBinding.worker_context_provider_dispatch_decision || {};
        const checks = {
            activeAssignmentStoresDecision: activeAssignment.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1"
                && activeAssignment.worker_context_provider_dispatch_decision?.action === "hold_until_repair",
            activeDecisionHoldsCriticalProvider: activeDecision.action === "hold_until_repair"
                && activeDecision.provider_dispatch_hold === true
                && activeDecision.dispatch_ready === false
                && activeDecision.should_create_real_task === false
                && activeDecision.health_status === "critical",
            activeNeedsPressureRepair: Array.isArray(activeAssignment.needs)
                && activeAssignment.needs.some((item) => String(item || "").includes("pressure provenance provider repair/recovery")),
            bindingLedgerPersistsDecision: activeBinding.worker_context_provider_dispatch_decision?.decision_id
                && activeBinding.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true,
            recoveredDecisionAllowsReceiptSampling: recoveredDecision.action === "dispatch_with_receipt_sampling"
                && recoveredDecision.dispatch_ready === true
                && recoveredDecision.requires_receipt_sampling === true
                && recoveredDecision.health_status === "monitor",
            ledgerCountersTrackProviderDecisions: Number(ledger.providerDispatchDecisionCount || 0) >= 2
                && Number(ledger.providerDispatchHoldDecisionCount || 0) >= 1
                && Number(ledger.providerDispatchReadyDecisionCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            active: {
                action: activeDecision.action || "",
                dispatch_ready: activeDecision.dispatch_ready,
                provider_dispatch_hold: activeDecision.provider_dispatch_hold,
                health_status: activeDecision.health_status || "",
                reason: activeDecision.reason || "",
            },
            recovered: {
                action: recoveredDecision.action || "",
                dispatch_ready: recoveredDecision.dispatch_ready,
                requires_receipt_sampling: recoveredDecision.requires_receipt_sampling === true,
                health_status: recoveredDecision.health_status || "",
            },
            ledger: {
                providerDispatchDecisionCount: ledger.providerDispatchDecisionCount || 0,
                providerDispatchHoldDecisionCount: ledger.providerDispatchHoldDecisionCount || 0,
                providerDispatchReadyDecisionCount: ledger.providerDispatchReadyDecisionCount || 0,
            },
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
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
    const groupId = `worker-context-pressure-provenance-provider-dispatch-override-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-initial-missing-usage",
                    binding_id: "binding-phase147-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase147-initial-current-source-gap",
                    binding_id: "binding-phase147-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T03:40:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-recovery-1",
                    binding_id: "binding-phase147-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase147-recovery-2",
                    binding_id: "binding-phase147-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T03:40:01.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-relapse-missing-usage",
                    binding_id: "binding-phase147-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T03:40:02.000Z",
        });
        const invalidOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            reason: "Phase 147 invalid override is missing risk acceptance.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
        };
        const invalidAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证无效 provider dispatch override 不会绕过 hold。", "selftest invalid provider override", "", {
            group,
            providerDispatchOverride: invalidOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const validOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            risk_accepted: true,
            acknowledges_repair_required: true,
            reason: "Phase 147 selftest explicitly accepts temporary provider risk and requires follow-up repair.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
            approved_at: "2026-07-10T03:40:03.000Z",
        };
        const validAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证有效 provider dispatch override receipt 可以一次性放行。", "selftest valid provider override", "", {
            group,
            providerDispatchOverride: validOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const invalidBinding = (ledger.entries || []).find((entry) => entry.assignment_id === invalidAssignment.assignmentId) || {};
        const validBinding = (ledger.entries || []).find((entry) => entry.assignment_id === validAssignment.assignmentId) || {};
        const invalidDecision = invalidBinding.worker_context_provider_dispatch_decision || {};
        const validDecision = validBinding.worker_context_provider_dispatch_decision || {};
        const checks = {
            invalidOverrideDoesNotBypassHold: invalidAssignment.dispatch_ready === false
                && invalidAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold === true
                && invalidAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold_overridden !== true
                && invalidDecision.action === "hold_until_repair"
                && invalidDecision.provider_dispatch_override_receipt?.valid === false,
            validOverrideDispatchesOnce: validAssignment.dispatch_ready === true
                && validAssignment.status === "pending"
                && validAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold === true
                && validAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold_overridden === true
                && validAssignment.worker_context_pre_dispatch_gate?.next_step === "dispatch_child_agent_with_provider_override_receipt",
            validDecisionCarriesOverrideReceipt: validDecision.action === "dispatch_with_provider_override"
                && validDecision.dispatch_ready === true
                && validDecision.should_create_real_task === true
                && validDecision.provider_dispatch_hold === true
                && validDecision.provider_dispatch_hold_overridden === true
                && validDecision.requires_repair_followup === true
                && validDecision.provider_dispatch_override_receipt?.valid === true,
            bindingLedgerPersistsOverride: validBinding.worker_context_provider_dispatch_override_receipt?.valid === true
                && validBinding.worker_context_provider_dispatch_decision?.provider_dispatch_override_receipt?.approved_by === "local-user",
            ledgerCountersTrackOverride: Number(ledger.providerDispatchDecisionCount || 0) >= 2
                && Number(ledger.providerDispatchHoldDecisionCount || 0) >= 1
                && Number(ledger.providerDispatchOverrideDecisionCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            invalid: {
                action: invalidDecision.action || "",
                dispatch_ready: invalidDecision.dispatch_ready,
                override_valid: invalidDecision.provider_dispatch_override_receipt?.valid === true,
                gaps: invalidDecision.provider_dispatch_override_receipt?.gaps || [],
            },
            valid: {
                action: validDecision.action || "",
                dispatch_ready: validDecision.dispatch_ready,
                override_valid: validDecision.provider_dispatch_override_receipt?.valid === true,
                next_step: validAssignment.worker_context_pre_dispatch_gate?.next_step || "",
            },
            ledger: {
                providerDispatchDecisionCount: ledger.providerDispatchDecisionCount || 0,
                providerDispatchHoldDecisionCount: ledger.providerDispatchHoldDecisionCount || 0,
                providerDispatchOverrideDecisionCount: ledger.providerDispatchOverrideDecisionCount || 0,
            },
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
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
    const groupId = `worker-context-pressure-provenance-provider-dispatch-override-completion-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const workItemsFile = (0, group_orchestrator_1.getReplayRepairWorkItemsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-completion.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-initial-missing-usage",
                    binding_id: "binding-phase148-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase148-initial-current-source-gap",
                    binding_id: "binding-phase148-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T04:00:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-recovery-1",
                    binding_id: "binding-phase148-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase148-recovery-2",
                    binding_id: "binding-phase148-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T04:00:01.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-relapse-missing-usage",
                    binding_id: "binding-phase148-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T04:00:02.000Z",
        });
        const validOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            risk_accepted: true,
            acknowledges_repair_required: true,
            reason: "Phase 148 selftest accepts one provider override and requires completion follow-up.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
            approved_at: "2026-07-10T04:00:03.000Z",
        };
        const assignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证 provider dispatch override completion 会关闭 follow-up repair work item。", "selftest provider override completion", "", {
            group,
            providerDispatchOverride: validOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const initialLedger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const initialBinding = (initialLedger.entries || []).find((entry) => entry.assignment_id === assignment.assignmentId) || {};
        const followupRef = initialBinding.worker_context_provider_dispatch_override_followup_repair || {};
        const workItemLedgerBefore = (0, group_orchestrator_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
        const workItemBefore = (workItemLedgerBefore.items || []).find((item) => (item.work_item_id || item.id) === followupRef.work_item_id) || {};
        const receipt = {
            status: "done",
            summary: "provider override completion supplied verified pressure provenance follow-up",
            memoryProvenanceUsage: [{
                    relPath,
                    usageState: "verified",
                    repairStatus: "completed",
                    repairGapType: "provider_dispatch_override_followup",
                    currentSourceVerified: true,
                    reason: "Phase 148 selftest verified current source after override dispatch.",
                }],
        };
        const completion = (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideCompletionForCoordinator)(groupId, {
            assignment_id: assignment.assignmentId,
            dispatch_key: assignment.dispatchKey,
            worker_context_packet_id: assignment.worker_context_packet?.packet_id || "",
            task_id: "task-phase148-provider-override-completion",
            worker_handoff_id: "handoff-phase148-provider-override-completion",
            task_agent_session_id: "tas-phase148-provider-override-completion",
            native_session_id: "native-phase148-provider-override-completion",
            execution_id: "execution-phase148-provider-override-completion",
            memory_context_snapshot_id: "snapshot-phase148-provider-override-completion",
            memory_context_snapshot_checksum: "snapshot-checksum-phase148-provider-override-completion",
            receipt_status: "done",
            receipt,
        }, { at: "2026-07-10T04:00:04.000Z" }) || {};
        const finalLedger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const finalBinding = (finalLedger.entries || []).find((entry) => entry.assignment_id === assignment.assignmentId) || {};
        const workItemLedgerAfter = (0, group_orchestrator_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
        const workItemAfter = (workItemLedgerAfter.items || []).find((item) => (item.work_item_id || item.id) === followupRef.work_item_id) || {};
        const checks = {
            overrideDispatchCreatesFollowupWorkItem: assignment.dispatch_ready === true
                && initialBinding.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override"
                && followupRef.work_item_id
                && (0, group_orchestrator_1.replayRepairWorkItemOpenForCoordinator)(workItemBefore.status),
            completionRequiresVerifiedMemoryProvenanceUsage: completion.completion_ok === true
                && completion.memory_provenance_usage_count === 1
                && completion.current_source_verified_count === 1
                && completion.followup_repair_work_item_completion?.closed === 1,
            bindingLedgerPersistsCompletion: finalBinding.worker_context_provider_dispatch_override_completion?.completion_ok === true
                && finalBinding.worker_context_provider_dispatch_override_completion?.task_agent_session_id === "tas-phase148-provider-override-completion"
                && Number(finalLedger.providerDispatchOverrideCompletionCount || 0) >= 1,
            followupRepairWorkItemClosed: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemAfter.status) === "completed"
                && workItemAfter.completion_source === "provider_dispatch_override_completion_receipt"
                && workItemAfter.provider_dispatch_override_completion?.completion_id === completion.completion_id,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            followup: {
                work_item_id: followupRef.work_item_id || "",
                before_status: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemBefore.status),
                after_status: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemAfter.status),
            },
            completion: {
                status: completion.status || "",
                completion_ok: completion.completion_ok === true,
                memory_provenance_usage_count: completion.memory_provenance_usage_count || 0,
                current_source_verified_count: completion.current_source_verified_count || 0,
            },
            ledger: {
                providerDispatchOverrideCompletionCount: finalLedger.providerDispatchOverrideCompletionCount || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
//# sourceMappingURL=group-orchestrator-provider-self-tests.js.map