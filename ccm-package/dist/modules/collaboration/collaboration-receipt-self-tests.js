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
exports.runMemoryDispatchGateReceiptValidationSelfTest = runMemoryDispatchGateReceiptValidationSelfTest;
exports.runPressureMemoryProvenanceReceiptUsageSelfTest = runPressureMemoryProvenanceReceiptUsageSelfTest;
exports.runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest = runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest;
exports.runGlobalMemoryUsageReceiptValidationSelfTest = runGlobalMemoryUsageReceiptValidationSelfTest;
exports.runGlobalMemoryHealthGateReceiptValidationSelfTest = runGlobalMemoryHealthGateReceiptValidationSelfTest;
exports.runReadPlanRevalidationGateReceiptValidationSelfTest = runReadPlanRevalidationGateReceiptValidationSelfTest;
exports.runApiMicrocompactReceiptValidationSelfTest = runApiMicrocompactReceiptValidationSelfTest;
exports.runPostCompactReinjectionGateReceiptValidationSelfTest = runPostCompactReinjectionGateReceiptValidationSelfTest;
exports.runPostCompactDispatchMarkerVisibleSelfTest = runPostCompactDispatchMarkerVisibleSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const group_memory_index_1 = require("./group-memory-index");
const agent_receipts_1 = require("./agent-receipts");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const collaboration_1 = require("./collaboration");
function runMemoryDispatchGateReceiptValidationSelfTest() {
    const gate = {
        schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
        dispatch_gate_id: "gmd_receipt_gate_selftest",
        group_id: "group-receipt-gate-selftest",
        target_project: "frontend",
        scope: "child:frontend",
        status: "fresh_reloaded",
        action: "use_reloaded_context",
        source_manifest: { checksum: "receipt-gate-source" },
        reload_audit: { reason: "memory_source_changed" },
    };
    const task = {
        title: "记忆 gate 回执自测",
        workflow_type: "daily_dev",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_receipt_gate_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            dispatch_freshness_gate: gate,
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成记忆 gate 回执验证改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证记忆 gate 回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用平台群聊记忆，dispatch_gate_id=gmd_receipt_gate_selftest"],
        memoryIgnored: [],
    };
    const missingGateReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用平台群聊记忆，但未引用 gate id"],
        memoryIgnored: [],
    };
    const ignoredGateReceipt = {
        ...baseReceipt,
        memoryUsed: [],
        memoryIgnored: ["未使用平台记忆，dispatch_gate_id=gmd_receipt_gate_selftest；原因：本轮只核验当前文件"],
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const missingGateQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingGateReceipt);
    const ignoredQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, ignoredGateReceipt);
    const missingGateSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingGateReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesGate: goodQuality.pass === true
            && goodQuality.memory_gate?.pass === true
            && goodQuality.grade === "good",
        ignoredReceiptCanSatisfyGate: ignoredQuality.pass === true
            && ignoredQuality.memory_gate?.pass === true
            && ignoredQuality.grade === "good",
        missingGateHardFailsQuality: missingGateQuality.pass === false
            && missingGateQuality.grade !== "good"
            && missingGateQuality.memory_gate?.missing_gate_ids?.includes("gmd_receipt_gate_selftest")
            && missingGateQuality.missing.includes("引用记忆派发 gate"),
        deliverySummaryRecordsGate: missingGateSummary.memory_dispatch_gate_count === 1
            && missingGateSummary.memory_gate_receipt_passed === false
            && missingGateSummary.memory_gate_receipt_rows?.[0]?.memory_gate?.missing_gate_ids?.includes("gmd_receipt_gate_selftest"),
        acceptanceGateBlocksMissingGate: missingGateSummary.acceptance_gate_passed === false
            && missingGateSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "memory_gate_receipt"),
        goodDeliverySummaryPassesGate: goodSummary.memory_gate_receipt_passed === true
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, memoryGate: goodQuality.memory_gate },
        missing: { score: missingGateQuality.score, grade: missingGateQuality.grade, memoryGate: missingGateQuality.memory_gate },
    };
}
function runPressureMemoryProvenanceReceiptUsageSelfTest() {
    const groupId = `pressure-memory-provenance-receipt-${process.pid}-${Date.now().toString(36)}`;
    const targetProject = "phase132-pressure-project";
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
    try {
        const relPath = "worker-context-usage-pressure-discipline.md";
        const repairWorkItemId = "cgpru-phase132-repair-selftest";
        const task = {
            id: "phase132-pressure-provenance-task",
            group_id: groupId,
            target_project: targetProject,
            worker_context_packet: {
                packet_id: "wcp-phase132-pressure-provenance",
                project: targetProject,
                memory: {
                    schema: "ccm-group-memory-context-v1",
                    group_id: groupId,
                    target_project: targetProject,
                    group_state: {
                        typedMemory: {
                            recall: {
                                schema: "ccm-group-typed-memory-recall-v1",
                                ignored: false,
                                workerContextPressureScoring: {
                                    schema: "ccm-group-typed-memory-worker-context-pressure-scoring-v1",
                                    active: true,
                                    pressure_status: "over_budget",
                                },
                                recalled: [{
                                        relPath,
                                        name: "WorkerContextPacket context usage pressure discipline",
                                        type: "feedback",
                                        source: "selftest:phase132",
                                        score: 18,
                                        workerContextPressureRecall: {
                                            adjustment: 7,
                                            pressure_status: "over_budget",
                                            kinds: ["context_usage_pressure"],
                                        },
                                        workerContextPressureUsage: {
                                            adjustment: -9,
                                            matched: [{
                                                    rel_path: relPath,
                                                    recommendation: "deprioritize_pressure_recall",
                                                    provenance_status: "disputed_under_repair",
                                                    repair_open: true,
                                                    repair_work_item_id: repairWorkItemId,
                                                    repair_status: "pending",
                                                    repair_gap_type: "recommendation_conflict",
                                                }],
                                        },
                                    }],
                            },
                        },
                    },
                },
            },
        };
        const receipt = (0, agent_receipts_1.extractAgentReceipt)([
            "CCM_AGENT_RECEIPT",
            "```json",
            JSON.stringify({
                ccm_receipt: true,
                status: "done",
                summary: "使用 disputed pressure memory 前重读当前源并完成修复。",
                actions: ["核验 WorkerContextPacket pressure memory provenance"],
                filesChanged: [],
                verification: ["current source re-read before applying disputed memory"],
                blockers: [],
                needs: [],
                ack: {
                    understoodGoal: "验证 pressure memory provenance receipt",
                    plannedScope: ["memory provenance"],
                    forbiddenScope: [],
                    verificationPlan: ["current source re-read"],
                    unclear: [],
                },
                contractChanges: [],
                consumedInjectionIds: [],
                memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}; current source verified`],
                memoryIgnored: [],
                memoryProvenanceUsage: [{
                        relPath,
                        name: "WorkerContextPacket context usage pressure discipline",
                        usageState: "used",
                        provenanceStatus: "disputed_under_repair",
                        repairWorkItemId,
                        repairStatus: "pending",
                        repairGapType: "recommendation_conflict",
                        currentSourceVerified: true,
                        reason: "disputed pressure memory was used only after current source verification",
                    }],
            }),
            "```",
        ].join("\n"), targetProject);
        const rows = (0, collaboration_1.collectTaskTypedMemoryPressureRecallUsageRows)(task, [receipt], {});
        const record = (0, group_memory_index_1.recordGroupTypedMemoryPressureRecallUsageLedger)(groupId, {
            targetProject,
            taskId: task.id,
            executionId: "phase132-pressure-provenance-execution",
            rows,
            generatedAt: "2026-07-09T23:59:30.000Z",
        });
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryPressureRecallUsageLedger)(groupId);
        const entry = (ledger.entries || []).find((item) => item.rel_path === relPath) || {};
        const statKey = Object.keys(ledger.stats || {}).find(key => key.includes(relPath.toLowerCase())) || "";
        const stat = statKey ? ledger.stats[statKey] || {} : {};
        const checks = {
            receiptParserKeepsStructuredProvenance: receipt?.memoryProvenanceUsage?.[0]?.repairWorkItemId === repairWorkItemId
                && receipt.memoryProvenanceUsage[0].provenanceStatus === "disputed_under_repair",
            collectionPrefersStructuredProvenance: rows.length === 1
                && rows[0].usage_state === "verified"
                && rows[0].provenance_status === "disputed_under_repair"
                && rows[0].repair_work_item_id === repairWorkItemId
                && rows[0].current_source_verified === true,
            ledgerPersistsProvenance: record?.recorded_count === 1
                && entry.usage_state === "verified"
                && entry.provenance_status === "disputed_under_repair"
                && entry.repair_work_item_id === repairWorkItemId
                && entry.current_source_verified === true,
            statsAggregateProvenance: Array.isArray(stat.provenance_statuses)
                && stat.provenance_statuses.includes("disputed_under_repair")
                && Array.isArray(stat.repair_work_item_ids)
                && stat.repair_work_item_ids.includes(repairWorkItemId)
                && Number(stat.current_source_verified_count || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receipt: {
                memoryProvenanceUsage: receipt?.memoryProvenanceUsage || [],
            },
            rows,
            ledger: {
                entry,
                stat,
            },
        };
    }
    finally {
        try {
            fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest() {
    const taskId = `task-memory-context-snapshot-receipt-selftest-${process.pid}-${Date.now().toString(36)}`;
    const groupId = "group-memory-context-snapshot-receipt-selftest";
    const groupSessionId = `gcs_${Date.now().toString(36)}_snapshot_receipt`;
    try {
        const session = (0, agent_sessions_1.openTaskAgentSession)({
            scopeId: taskId,
            taskId,
            groupId,
            project: "frontend",
            agentType: "codex",
        });
        const dispatchGate = {
            schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
            dispatch_gate_id: "gmd_task_agent_snapshot_receipt_selftest",
            group_id: groupId,
            target_project: "frontend",
            scope: "child:frontend",
            status: "fresh_reloaded",
            action: "use_reloaded_context",
            source_manifest: { checksum: "task-agent-snapshot-source" },
            reload_audit: { reason: "session_bound_snapshot_selftest" },
        };
        const memoryContext = {
            schema: "ccm-group-memory-context-v1",
            group_id: groupId,
            group_session_id: groupSessionId,
            target_project: "frontend",
            session_binding: {
                schema: "ccm-child-agent-memory-session-binding-v1",
                binding_id: "csm:snapshot-receipt-selftest",
                task_agent_session_id: session.id,
            },
            memory_policy: { use: "must_consider" },
            compaction: {
                sessionMemory: {
                    schema: "ccm-group-session-memory-snapshot-v1",
                    snapshotFile: "group-session-memory/snapshot-receipt-selftest/snapshot.json",
                    summaryFile: "group-session-memory/snapshot-receipt-selftest/summary.md",
                    markdownChecksum: "session-memory-checksum-snapshot-receipt-selftest",
                    hasSummary: true,
                    sectionEvidence: {
                        schema: "ccm-group-session-memory-section-evidence-v1",
                        checksum: "section-evidence-bundle-snapshot-receipt-selftest",
                        sections: [{
                                evidenceId: "gsmse_snapshot_receipt_current_state",
                                section: "Current State",
                                sectionIndex: 2,
                                sectionChecksum: "section-checksum-snapshot-receipt-selftest",
                                sourceTranscriptChecksum: "transcript-checksum-snapshot-receipt-selftest",
                                sourceFirstMessageId: "msg-first-snapshot-receipt-selftest",
                                sourceLastMessageId: "msg-last-snapshot-receipt-selftest",
                                sourceMessageIds: ["msg-first-snapshot-receipt-selftest", "msg-last-snapshot-receipt-selftest"],
                            }],
                    },
                },
            },
            group_state: { goal: "TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SENTINEL" },
            dispatch_freshness_gate: dispatchGate,
        };
        const renderedPrompt = "prompt with session-bound memory snapshot";
        const bound = (0, agent_sessions_1.bindTaskAgentMemoryContextSnapshot)(session.id, {
            taskId,
            groupId,
            project: "frontend",
            agentType: "codex",
            nativeSessionId: "codex-native-snapshot-receipt-selftest",
            turn: 1,
            executionId: `${taskId}--frontend`,
            traceId: "trace-task-agent-snapshot-receipt-selftest",
            workerContextPacket: {
                packet_id: "wcp_task_agent_snapshot_receipt_selftest",
                memory: memoryContext,
            },
            memoryContext,
            workerHandoffSummary: {
                handoff_id: "wh_task_agent_snapshot_receipt_selftest",
                packet_id: "wcp_task_agent_snapshot_receipt_selftest",
            },
            renderedPrompt,
        });
        (0, agent_sessions_1.recordTaskAgentMemoryContextDelivery)(session.id, {
            snapshotId: bound?.snapshot?.snapshot_id || "",
            renderedPrompt,
            snapshotRenderedPrompt: renderedPrompt,
            executionId: `${taskId}--frontend`,
            traceId: "trace-task-agent-snapshot-receipt-selftest",
            runtime: "codex",
            nativeSessionId: "codex-native-snapshot-receipt-selftest",
            dispatched: true,
            executionSucceeded: true,
            output: "snapshot receipt selftest output",
        });
        const task = {
            id: taskId,
            title: "任务级 Agent 记忆快照回执自测",
            workflow_type: "daily_dev",
            assign_type: "group",
            target_project: "frontend",
            group_id: groupId,
            requires_code_changes: true,
            requires_verification: true,
            trace_id: "trace-task-agent-snapshot-receipt-selftest",
        };
        const baseReceipt = {
            agent: "frontend",
            status: "done",
            summary: "完成任务级记忆快照回执校验改动",
            actions: ["修改前端页面"],
            filesChanged: ["src/App.vue"],
            verification: ["npm test passed by external runner (exit 0)"],
            ack: {
                understoodGoal: "验证任务级记忆快照回执",
                plannedScope: ["src/App.vue"],
                forbiddenScope: ["无关模块"],
                verificationPlan: ["npm test"],
                unclear: [],
            },
            contractChanges: [],
            blockers: [],
            needs: [],
            memoryUsed: ["使用 session-bound memory dispatch_gate_id=gmd_task_agent_snapshot_receipt_selftest"],
            memoryIgnored: [],
            memoryContextUsage: {
                bindingId: "csm:snapshot-receipt-selftest",
                groupSessionId,
                sessionMemoryChecksum: "session-memory-checksum-snapshot-receipt-selftest",
                usageState: "used",
                reason: "使用了当前群聊会话 Session Memory。",
            },
            memoryFactCitations: [{
                    evidenceId: "gsmse_snapshot_receipt_current_state",
                    section: "Current State",
                    sectionChecksum: "section-checksum-snapshot-receipt-selftest",
                    sourceTranscriptChecksum: "transcript-checksum-snapshot-receipt-selftest",
                    sourceMessageIds: ["msg-last-snapshot-receipt-selftest"],
                    usage: "用当前状态章节确定本轮修改范围。",
                }],
        };
        const goodReceipt = {
            ...baseReceipt,
            task_agent_session_id: session.id,
            native_session_id: "codex-native-snapshot-receipt-selftest",
            memory_context_snapshot_id: bound?.snapshot?.snapshot_id || "",
            memory_context_snapshot_checksum: bound?.snapshot?.checksum || "",
            worker_context_packet_id: "wcp_task_agent_snapshot_receipt_selftest",
        };
        const wrongSessionReceipt = {
            ...baseReceipt,
            task_agent_session_id: "tas-wrong-session",
            native_session_id: "codex-native-snapshot-receipt-selftest",
        };
        const wrongCitationReceipt = {
            ...goodReceipt,
            memoryFactCitations: [{
                    ...goodReceipt.memoryFactCitations[0],
                    sectionChecksum: "forged-section-checksum",
                }],
        };
        const wrongSourceMessageReceipt = {
            ...goodReceipt,
            memoryFactCitations: [{
                    ...goodReceipt.memoryFactCitations[0],
                    sourceMessageIds: ["msg-from-another-session"],
                }],
        };
        const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
            status: "done",
            receipt: goodReceipt,
            review: { status: "complete", content: "主 Agent 复盘完成" },
            fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
        }, "waiting");
        const wrongSummary = (0, collaboration_1.buildDeliverySummary)(task, {
            status: "done",
            receipt: wrongSessionReceipt,
            review: { status: "complete", content: "主 Agent 复盘完成" },
            fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
        }, "waiting");
        const wrongCitationSummary = (0, collaboration_1.buildDeliverySummary)(task, {
            status: "done",
            receipt: wrongCitationReceipt,
            review: { status: "complete", content: "主 Agent 复盘完成" },
            fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
        }, "waiting");
        const wrongSourceMessageSummary = (0, collaboration_1.buildDeliverySummary)(task, {
            status: "done",
            receipt: wrongSourceMessageReceipt,
            review: { status: "complete", content: "主 Agent 复盘完成" },
            fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
        }, "waiting");
        const listed = (0, agent_sessions_1.listTaskAgentMemoryContextSnapshots)({ taskId });
        const goodSnapshotGate = goodSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
        const wrongSnapshotGate = wrongSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
        const wrongCitationGate = wrongCitationSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
        const wrongSourceMessageGate = wrongSourceMessageSummary.receipt_quality?.[0]?.task_agent_memory_snapshot || {};
        const checks = {
            snapshotPersistedOnSession: listed.length === 1
                && listed[0]?.context?.worker_context_packet_id === "wcp_task_agent_snapshot_receipt_selftest"
                && listed[0]?.context?.gate_ids?.includes("gmd_task_agent_snapshot_receipt_selftest"),
            deliverySummaryCollectsGateFromSessionSnapshot: goodSummary.memory_dispatch_gate_count === 1
                && goodSummary.memory_dispatch_gates?.[0]?.gate_id === "gmd_task_agent_snapshot_receipt_selftest",
            goodReceiptMatchesExactSnapshot: goodSnapshotGate.pass === true
                && goodSnapshotGate.matched_snapshot_ids?.includes(bound?.snapshot?.snapshot_id)
                && goodSummary.task_agent_memory_snapshot_receipt_passed === true
                && goodSnapshotGate.memory_fact_citations_required === true
                && goodSnapshotGate.memory_fact_citations_passed === true,
            goodDeliveryPassesMemoryGate: goodSummary.memory_gate_receipt_passed === true
                && goodSummary.receipt_quality_gate_passed === true,
            wrongSessionFailsSnapshotGate: wrongSnapshotGate.pass === false
                && wrongSnapshotGate.missing_snapshot_ids?.includes(bound?.snapshot?.snapshot_id)
                && wrongSummary.task_agent_memory_snapshot_receipt_passed === false,
            wrongSessionBlocksAcceptance: wrongSummary.acceptance_gate_passed === false
                && wrongSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "task_agent_memory_snapshot_receipt"),
            forgedFactCitationBlocksAcceptance: wrongCitationGate.pass === false
                && wrongCitationGate.memory_fact_citations_required === true
                && wrongCitationGate.memory_fact_citations_passed === false
                && wrongCitationSummary.acceptance_gate_passed === false,
            foreignSourceMessageCitationBlocksAcceptance: wrongSourceMessageGate.pass === false
                && wrongSourceMessageGate.rows?.[0]?.memory_fact_citations?.[0]?.source_message_ids_required === true
                && wrongSourceMessageGate.rows?.[0]?.memory_fact_citations?.[0]?.source_message_ids_match === false
                && wrongSourceMessageSummary.acceptance_gate_passed === false,
            runtimeKernelShowsSnapshotMismatch: wrongSummary.runtime_kernel?.task_agent_memory_context_snapshot?.status === "session_snapshot_mismatch",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            snapshot: (0, collaboration_1.summarizeTaskAgentMemoryContextSnapshot)(bound?.snapshot),
            good: goodSnapshotGate,
            wrong: wrongSnapshotGate,
            wrongCitation: wrongCitationGate,
            wrongSourceMessage: wrongSourceMessageGate,
        };
    }
    finally {
        (0, agent_sessions_1.purgeTaskAgentSessions)(taskId);
    }
}
function runGlobalMemoryUsageReceiptValidationSelfTest() {
    const globalMemoryRecall = {
        schema: "ccm-child-global-agent-memory-recall-v1",
        itemCount: 2,
        items: [{
                id: "gmi_receipt_semantic_selftest",
                type: "decision",
                text: "GLOBAL_MEMORY_RECEIPT_SENTINEL: src/global-receipt.ts 旧规则存在语义风险。",
                arbitration: {
                    status: "possible_conflict_with_newer_group_memory",
                    action: "do_not_apply_directly_treat_as_background",
                    demoted: true,
                    conflict: true,
                    semanticRiskScore: 92,
                    semanticRisk: { score: 92, level: "high", reasons: ["different_named_rule"] },
                    semanticReasons: ["different_named_rule"],
                },
            }, {
                id: "gmi_receipt_background_selftest",
                type: "fact",
                text: "GLOBAL_MEMORY_RECEIPT_BACKGROUND_SENTINEL: src/global-receipt.ts 跨群聊旧结论。",
                arbitration: {
                    status: "suppressed_by_cross_group_arbitration",
                    action: "do_not_apply_directly_treat_as_background_verify_current_group_and_sources",
                    demoted: true,
                    conflict: false,
                    crossGroupSuppressed: true,
                },
                crossGroupSuppression: {
                    suppressed: true,
                    advisory: false,
                    action: "treat_as_background_only_verify_current_group_before_use",
                    reason: "global_memory_conflicted_or_demoted_in_other_groups",
                },
            }],
    };
    const task = {
        id: "task-global-memory-receipt-selftest",
        title: "全局记忆使用回执自测",
        workflow_type: "daily_dev",
        assign_type: "group",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_global_memory_receipt_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            target_project: "frontend",
                            global_agent_memory: globalMemoryRecall,
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成全局记忆使用回执校验改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证全局记忆使用回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
        memoryUsed: ["使用全局记忆 gmi_receipt_semantic_selftest 前已核验当前源"],
        memoryIgnored: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        globalMemoryUsage: [
            {
                globalMemoryId: "gmi_receipt_semantic_selftest",
                usageState: "verified",
                currentSourceVerified: true,
                semanticRiskAcknowledged: true,
                reason: "已识别 semantic_risk，只在核验当前源后作为背景核对。",
            },
            {
                globalMemoryId: "gmi_receipt_background_selftest",
                usageState: "background",
                currentSourceVerified: true,
                crossGroupSuppression: "background_only",
                reason: "跨群聊 suppression 仅作背景，不直接应用。",
            },
        ],
    };
    const missingGlobalReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用了平台全局记忆，但未列出 global_memory_id"],
        globalMemoryUsage: [],
    };
    const unsafeBackgroundReceipt = {
        ...baseReceipt,
        globalMemoryUsage: [
            {
                globalMemoryId: "gmi_receipt_semantic_selftest",
                usageState: "verified",
                currentSourceVerified: true,
                semanticRiskAcknowledged: true,
                reason: "已核验当前源。",
            },
            {
                globalMemoryId: "gmi_receipt_background_selftest",
                usageState: "used",
                currentSourceVerified: false,
                crossGroupSuppression: "background_only",
                reason: "直接用了旧跨群聊记忆。",
            },
        ],
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const missingQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingGlobalReceipt);
    const unsafeQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, unsafeBackgroundReceipt);
    const missingSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingGlobalReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const unsafeSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: unsafeBackgroundReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesGlobalMemoryGate: goodQuality.pass === true
            && goodQuality.global_memory_gate?.pass === true
            && goodQuality.global_memory_gate?.verified_global_memory_ids?.includes("gmi_receipt_semantic_selftest")
            && goodQuality.global_memory_gate?.background_global_memory_ids?.includes("gmi_receipt_background_selftest"),
        missingGlobalMemoryHardFailsQuality: missingQuality.pass === false
            && missingQuality.global_memory_gate?.missing_global_memory_ids?.includes("gmi_receipt_semantic_selftest")
            && missingQuality.global_memory_gate?.missing_global_memory_ids?.includes("gmi_receipt_background_selftest")
            && missingQuality.missing.includes("声明全局记忆使用状态"),
        unsafeBackgroundUseHardFailsQuality: unsafeQuality.pass === false
            && unsafeQuality.global_memory_gate?.unsafe_used_global_memory_ids?.includes("gmi_receipt_background_selftest"),
        deliverySummaryRecordsMissingGlobalMemory: missingSummary.global_memory_receipt_gate_count === 1
            && missingSummary.global_memory_receipt_passed === false
            && missingSummary.global_memory_receipt_summary?.status === "missing_global_memory_reference",
        acceptanceGateBlocksMissingGlobalMemory: missingSummary.acceptance_gate_passed === false
            && missingSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "global_memory_receipt"),
        runtimeKernelShowsGlobalMemoryGap: missingSummary.runtime_kernel?.global_memory_receipt_gate?.status === "missing_global_memory_reference",
        unsafeSummaryShowsUnsafeUse: unsafeSummary.global_memory_receipt_summary?.status === "unsafe_global_memory_use"
            && unsafeSummary.runtime_kernel?.global_memory_receipt_gate?.unsafe_used_global_memory_ids?.includes("gmi_receipt_background_selftest"),
        goodDeliverySummaryPassesGate: goodSummary.global_memory_receipt_passed === true
            && goodSummary.global_memory_receipt_summary?.status === "passed"
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, globalMemoryGate: goodQuality.global_memory_gate },
        missing: { score: missingQuality.score, grade: missingQuality.grade, globalMemoryGate: missingQuality.global_memory_gate },
        unsafe: { score: unsafeQuality.score, grade: unsafeQuality.grade, globalMemoryGate: unsafeQuality.global_memory_gate },
    };
}
function runGlobalMemoryHealthGateReceiptValidationSelfTest() {
    const failHealthGate = {
        schema: "ccm-child-global-agent-memory-health-gate-v1",
        gate_id: "ggmh_receipt_health_fail_selftest",
        group_id: "group-global-memory-health-receipt-selftest",
        target_project: "frontend",
        status: "fail",
        pass: false,
        action: "block_global_agent_memory_recall",
        active_contamination_count: 1,
        residue_contamination_count: 0,
        policy: {
            fail_blocks_global_memory_recall: true,
            no_contaminated_preview_in_context: true,
        },
    };
    const warnHealthGate = {
        schema: "ccm-child-global-agent-memory-health-gate-v1",
        gate_id: "ggmh_receipt_health_warn_selftest",
        group_id: "group-global-memory-health-receipt-selftest",
        target_project: "frontend",
        status: "warn",
        pass: true,
        action: "use_active_global_memory_with_residue_warning",
        active_contamination_count: 0,
        residue_contamination_count: 2,
    };
    const task = {
        id: "task-global-memory-health-gate-receipt-selftest",
        title: "全局记忆健康门禁回执自测",
        workflow_type: "daily_dev",
        assign_type: "group",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_global_memory_health_receipt_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            target_project: "frontend",
                            global_memory_health_gate: failHealthGate,
                            global_agent_memory: {
                                schema: "ccm-child-global-agent-memory-recall-v1",
                                included: false,
                                healthBlocked: true,
                                reason: "global_agent_memory_health_gate_failed",
                                memory_health_gate: failHealthGate,
                                items: [],
                                itemCount: 0,
                            },
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成全局记忆健康门禁回执校验改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证全局记忆健康门禁回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
        memoryUsed: [],
        memoryIgnored: [],
        globalMemoryUsage: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        memoryIgnored: ["Global Agent memory health gate ggmh_receipt_health_fail_selftest 阻断，本轮未使用任何全局记忆。"],
    };
    const missingGateReceipt = {
        ...baseReceipt,
        memoryIgnored: ["未使用平台记忆，但没有引用健康门禁。"],
    };
    const unsafeUseReceipt = {
        ...baseReceipt,
        memoryUsed: ["错误使用了 Global Agent memory，即使 gate=ggmh_receipt_health_fail_selftest 已阻断。"],
        memoryIgnored: ["知道 ggmh_receipt_health_fail_selftest 存在。"],
        globalMemoryUsage: [{
                globalMemoryId: "gmi_blocked_health_selftest",
                usageState: "used",
                currentSourceVerified: false,
                reason: "错误声明用了被阻断的全局记忆。",
            }],
    };
    const warnReceipt = {
        ...baseReceipt,
        memoryUsed: ["Global Agent memory health gate ggmh_receipt_health_warn_selftest active memory clean；residue warning 已确认；current source verified。"],
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const missingQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingGateReceipt);
    const unsafeQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, unsafeUseReceipt);
    const warnQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, warnReceipt, { globalMemoryHealthGates: [{
                schema: "ccm-child-agent-global-memory-health-gate-receipt-gate-v1",
                gate_id: warnHealthGate.gate_id,
                target_project: "frontend",
                status: warnHealthGate.status,
                action: warnHealthGate.action,
                active_contamination_count: 0,
                residue_contamination_count: 2,
                required_action: "must_ack_residue_warning_before_global_memory_use",
                raw: warnHealthGate,
            }] });
    const missingSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingGateReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const unsafeSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: unsafeUseReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesHealthGate: goodQuality.pass === true
            && goodQuality.global_memory_health_gate?.pass === true
            && goodQuality.global_memory_health_gate?.fail_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
        missingHealthGateHardFailsQuality: missingQuality.pass === false
            && missingQuality.global_memory_health_gate?.missing_gate_ids?.includes("ggmh_receipt_health_fail_selftest")
            && missingQuality.global_memory_health_gate?.missing_ignore_gate_ids?.includes("ggmh_receipt_health_fail_selftest")
            && missingQuality.missing.includes("声明全局记忆健康门禁"),
        unsafeBlockedGlobalMemoryUseHardFails: unsafeQuality.pass === false
            && unsafeQuality.global_memory_health_gate?.blocked_global_memory_used_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
        warnGateRequiresAcknowledgement: warnQuality.pass === true
            && warnQuality.global_memory_health_gate?.warn_gate_ids?.includes("ggmh_receipt_health_warn_selftest"),
        deliverySummaryRecordsMissingHealthGate: missingSummary.global_memory_health_gate_count === 1
            && missingSummary.global_memory_health_gate_receipt_passed === false
            && missingSummary.global_memory_health_gate_summary?.status === "missing_blocked_memory_ignored",
        acceptanceGateBlocksMissingHealthGate: missingSummary.acceptance_gate_passed === false
            && missingSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "global_memory_health_gate_receipt"),
        runtimeKernelShowsHealthGateGap: missingSummary.runtime_kernel?.global_memory_health_gate?.status === "missing_blocked_memory_ignored",
        unsafeSummaryShowsBlockedMemoryUse: unsafeSummary.global_memory_health_gate_summary?.status === "blocked_global_memory_used"
            && unsafeSummary.runtime_kernel?.global_memory_health_gate?.blocked_global_memory_used_gate_ids?.includes("ggmh_receipt_health_fail_selftest"),
        goodDeliverySummaryPassesHealthGate: goodSummary.global_memory_health_gate_receipt_passed === true
            && goodSummary.global_memory_health_gate_summary?.status === "passed"
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, healthGate: goodQuality.global_memory_health_gate },
        missing: { score: missingQuality.score, grade: missingQuality.grade, healthGate: missingQuality.global_memory_health_gate },
        unsafe: { score: unsafeQuality.score, grade: unsafeQuality.grade, healthGate: unsafeQuality.global_memory_health_gate },
        warn: { score: warnQuality.score, grade: warnQuality.grade, healthGate: warnQuality.global_memory_health_gate },
    };
}
function runReadPlanRevalidationGateReceiptValidationSelfTest() {
    const gate = {
        schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1",
        revalidation_gate_id: "rprg_receipt_session_selftest",
        group_id: "group-read-plan-revalidation-receipt-selftest",
        target_project: "frontend",
        scope: "child:frontend",
        status: "required",
        action: "must_re_read_current_source_before_using_stale_compact_read_plan",
        required_count: 1,
        verification_count: 0,
        required_read_plan_ids: ["rprp_receipt_session_selftest"],
        required_entries: [{
                read_plan_id: "rprp_receipt_session_selftest",
                reference_id: "cfr_receipt_session_selftest",
                type: "raw_group_messages_json",
                action: "read_current_source_before_use",
                revalidation_action: "must_re_read_current_source",
                path: "groups/messages/group-read-plan-revalidation-receipt-selftest.json",
                freshness_status: "changed",
                changes: ["checksum"],
            }],
        receipt_contract: {
            required: true,
            must_reference_gate_id: true,
            must_reference_read_plan_ids: true,
            must_declare_current_source_verified: true,
            must_match_session_binding: true,
        },
        session_binding: {
            schema: "ccm-child-agent-memory-session-binding-v1",
            binding_id: "casb_receipt_session_selftest",
            group_id: "group-read-plan-revalidation-receipt-selftest",
            target_project: "frontend",
            task_id: "task-read-plan-revalidation-receipt",
            trace_id: "trace-read-plan-revalidation-receipt",
            execution_id: "exec-read-plan-revalidation-receipt",
            task_agent_session_id: "tas-read-plan-revalidation-good",
            native_session_id: "native-read-plan-revalidation-good",
            agent_type: "codex",
            turn: 2,
            binding_required: true,
        },
    };
    const task = {
        id: "task-read-plan-revalidation-receipt",
        title: "读取计划重读 gate 回执自测",
        workflow_type: "daily_dev",
        assign_type: "group",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        trace_id: "trace-read-plan-revalidation-receipt",
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_read_plan_revalidation_receipt",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            compact_file_reference_read_plan_revalidation_gate: gate,
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成读取计划重读 gate 回执验证改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        task_agent_session_id: "tas-read-plan-revalidation-good",
        native_session_id: "native-read-plan-revalidation-good",
        ack: {
            understoodGoal: "验证读取计划重读 gate 回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        memoryUsed: ["revalidation_gate_id=rprg_receipt_session_selftest；read_plan_id=rprp_receipt_session_selftest；re-read current source verified；path=groups/messages/group-read-plan-revalidation-receipt-selftest.json"],
        memoryIgnored: [],
    };
    const wrongSessionReceipt = {
        ...goodReceipt,
        task_agent_session_id: "tas-read-plan-revalidation-wrong",
        native_session_id: "native-read-plan-revalidation-good",
    };
    const missingCurrentSourceReceipt = {
        ...baseReceipt,
        summary: "完成 gate 回执验证改动",
        memoryUsed: ["revalidation_gate_id=rprg_receipt_session_selftest；read_plan_id=rprp_receipt_session_selftest"],
        memoryIgnored: [],
    };
    const boundShorthandReceipt = {
        ...baseReceipt,
        memoryUsed: ["readPlanRevalidation: 重新读取 src/App.vue 并确认当前源状态"],
        memoryIgnored: [],
    };
    const wrongSessionShorthandReceipt = {
        ...boundShorthandReceipt,
        task_agent_session_id: "tas-read-plan-revalidation-wrong",
    };
    const boundActionReceipt = {
        ...baseReceipt,
        summary: "返工修复完成，测试与构建均已通过",
        actions: ["读取 scripts/test.mjs 第 8 行确认 reviewRepairMarker 精确要求", "修改前端页面"],
        memoryUsed: [],
        memoryIgnored: [],
    };
    const wrongSessionActionReceipt = {
        ...boundActionReceipt,
        task_agent_session_id: "tas-read-plan-revalidation-wrong",
    };
    const boundDiffReceipt = {
        ...baseReceipt,
        summary: "目标文件修改完成，已检查最终差异",
        actions: ["修改 src/App.vue", "检查 git diff 确认目标变更精确"],
        memoryUsed: [],
        memoryIgnored: [],
    };
    const wrongSessionDiffReceipt = {
        ...boundDiffReceipt,
        task_agent_session_id: "tas-read-plan-revalidation-wrong",
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const wrongSessionQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, wrongSessionReceipt);
    const missingCurrentQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingCurrentSourceReceipt);
    const boundShorthandQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, boundShorthandReceipt);
    const wrongSessionShorthandQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, wrongSessionShorthandReceipt);
    const boundActionQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, boundActionReceipt);
    const wrongSessionActionQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, wrongSessionActionReceipt);
    const boundDiffQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, boundDiffReceipt);
    const wrongSessionDiffQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, wrongSessionDiffReceipt);
    const latestTurnGate = {
        ...gate,
        revalidation_gate_id: "rprg_receipt_session_latest_selftest",
        session_binding: { ...gate.session_binding, turn: 3 },
    };
    const latestTurnGateQuality = (0, collaboration_1.evaluateReceiptReadPlanRevalidationGate)(task, boundActionReceipt, {
        readPlanRevalidationGates: [
            { ...gate, gate_id: gate.revalidation_gate_id, task_agent_session_id: gate.session_binding.task_agent_session_id, native_session_id: gate.session_binding.native_session_id, turn: 2 },
            { ...latestTurnGate, gate_id: latestTurnGate.revalidation_gate_id, task_agent_session_id: latestTurnGate.session_binding.task_agent_session_id, native_session_id: latestTurnGate.session_binding.native_session_id, turn: 3 },
        ],
    });
    const wrongSessionSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: wrongSessionReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesGate: goodQuality.pass === true
            && goodQuality.read_plan_revalidation_gate?.pass === true
            && goodQuality.read_plan_revalidation_gate?.session_matched === true
            && goodQuality.grade === "good",
        wrongSessionHardFailsQuality: wrongSessionQuality.pass === false
            && wrongSessionQuality.read_plan_revalidation_gate?.session_matched === false
            && wrongSessionQuality.read_plan_revalidation_gate?.session_mismatch_gate_ids?.includes("rprg_receipt_session_selftest")
            && wrongSessionQuality.missing.includes("重读 stale read plan"),
        missingCurrentSourceHardFailsQuality: missingCurrentQuality.pass === false
            && missingCurrentQuality.read_plan_revalidation_gate?.current_source_verified === false,
        uniqueGateSessionBoundShorthandPasses: boundShorthandQuality.pass === true
            && boundShorthandQuality.read_plan_revalidation_gate?.pass === true
            && boundShorthandQuality.read_plan_revalidation_gate?.rows?.[0]?.declaration_binding === "unique_gate_session_bound_shorthand",
        shorthandStillFailsWrongSession: wrongSessionShorthandQuality.pass === false
            && wrongSessionShorthandQuality.read_plan_revalidation_gate?.session_matched === false,
        uniqueGateSessionBoundCurrentSourceActionPasses: boundActionQuality.pass === true
            && boundActionQuality.read_plan_revalidation_gate?.pass === true
            && boundActionQuality.read_plan_revalidation_gate?.rows?.[0]?.declaration_binding === "unique_gate_session_bound_current_source_action",
        currentSourceActionStillFailsWrongSession: wrongSessionActionQuality.pass === false
            && wrongSessionActionQuality.read_plan_revalidation_gate?.session_matched === false,
        boundCurrentDiffEvidencePasses: boundDiffQuality.pass === true
            && boundDiffQuality.read_plan_revalidation_gate?.pass === true,
        currentDiffEvidenceStillFailsWrongSession: wrongSessionDiffQuality.pass === false
            && wrongSessionDiffQuality.read_plan_revalidation_gate?.session_matched === false,
        latestSessionTurnSupersedesOlderReadPlanGate: latestTurnGateQuality.pass === true
            && latestTurnGateQuality.gate_ids?.length === 1
            && latestTurnGateQuality.gate_ids?.[0] === "rprg_receipt_session_latest_selftest",
        deliverySummaryRecordsGate: wrongSessionSummary.read_plan_revalidation_gate_count === 1
            && wrongSessionSummary.read_plan_revalidation_gate_receipt_passed === false
            && wrongSessionSummary.read_plan_revalidation_gate_summary?.status === "session_mismatch",
        acceptanceGateBlocksWrongSession: wrongSessionSummary.acceptance_gate_passed === false
            && wrongSessionSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "read_plan_revalidation_gate_receipt"),
        runtimeKernelShowsWrongSession: wrongSessionSummary.runtime_kernel?.read_plan_revalidation_gate?.status === "session_mismatch",
        goodDeliverySummaryPassesGate: goodSummary.read_plan_revalidation_gate_receipt_passed === true
            && goodSummary.read_plan_revalidation_gate_summary?.status === "passed"
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, readPlanRevalidationGate: goodQuality.read_plan_revalidation_gate },
        wrongSession: { score: wrongSessionQuality.score, grade: wrongSessionQuality.grade, readPlanRevalidationGate: wrongSessionQuality.read_plan_revalidation_gate },
        missingCurrentSource: { score: missingCurrentQuality.score, grade: missingCurrentQuality.grade, readPlanRevalidationGate: missingCurrentQuality.read_plan_revalidation_gate },
        boundShorthand: { score: boundShorthandQuality.score, grade: boundShorthandQuality.grade, readPlanRevalidationGate: boundShorthandQuality.read_plan_revalidation_gate },
    };
}
function runApiMicrocompactReceiptValidationSelfTest() {
    const plan = {
        schema: "ccm-api-microcompact-edit-plan-v1",
        planChecksum: "api_microcompact_receipt_selftest_plan",
        groupId: "group-api-microcompact-receipt-selftest",
        targetProject: "frontend",
        editCount: 2,
        recommended: true,
        advisoryOnly: true,
        canApplyNatively: false,
        activeTokens: 220000,
        trigger: { type: "input_tokens", value: 180000 },
        contextManagement: { edits: [{ type: "clear_thinking_20251015" }, { type: "clear_tool_uses_20250919" }] },
    };
    const advisoryNativeApplyPlan = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        applyPlanChecksum: "api_microcompact_receipt_selftest_advisory_apply",
        requestPatchChecksum: "",
        apiEditPlanChecksum: plan.planChecksum,
        mode: "advisory_only",
        nativeApplyReady: false,
        advisoryOnly: true,
        executor: { agentType: "claudecode", transport: "cli", provider: "anthropic", cli: true },
        capability: { requiredBetaHeader: "context-management-2025-06-27" },
        requestPatch: null,
    };
    const task = {
        title: "API microcompact 回执自测",
        workflow_type: "daily_dev",
        assign_type: "group",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_api_microcompact_receipt_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            compaction: {
                                apiMicroCompactEditPlan: plan,
                                apiMicrocompactNativeApplyPlan: advisoryNativeApplyPlan,
                            },
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成 API microcompact 回执验证改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证 API microcompact 回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        memoryUsed: [`API microcompact edit plan planChecksum=${plan.planChecksum} advisory context pressure only`],
        memoryIgnored: [],
        apiMicrocompactUsage: [{
                planChecksum: plan.planChecksum,
                usageState: "advisory",
                nativeApplied: false,
                advisoryOnly: true,
                reason: "third-party CLI does not expose native API context-management",
            }],
    };
    const missingReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用平台群聊记忆，但未声明 API microcompact plan"],
        memoryIgnored: [],
    };
    const unsafeReceipt = {
        ...baseReceipt,
        memoryUsed: [`API microcompact edit plan planChecksum=${plan.planChecksum} native applied`],
        memoryIgnored: [],
        apiMicrocompactUsage: [{
                planChecksum: plan.planChecksum,
                usageState: "native_applied",
                nativeApplied: true,
                advisoryOnly: false,
                reason: "incorrectly claims native apply for third-party CLI",
            }],
    };
    const ignoredReceipt = {
        ...baseReceipt,
        memoryUsed: [],
        memoryIgnored: [`api_microcompact_edit_plan planChecksum=${plan.planChecksum} not_supported by this CLI`],
        apiMicrocompactUsage: [{
                planChecksum: plan.planChecksum,
                usageState: "not_supported",
                nativeApplied: false,
                advisoryOnly: true,
                reason: "executor does not support native context-management",
            }],
    };
    const nativePlan = {
        ...plan,
        planChecksum: "api_microcompact_receipt_selftest_native_plan",
        targetProject: "api",
        advisoryOnly: false,
        canApplyNatively: true,
    };
    const nativeApplyPlan = {
        schema: "ccm-api-microcompact-native-apply-plan-v1",
        applyPlanChecksum: "api_microcompact_receipt_selftest_native_apply",
        requestPatchChecksum: "api_microcompact_receipt_selftest_request_patch",
        apiEditPlanChecksum: nativePlan.planChecksum,
        mode: "native_api_context_management",
        nativeApplyReady: true,
        advisoryOnly: false,
        executor: { agentType: "anthropic-api", transport: "anthropic_api", provider: "anthropic", cli: false },
        capability: { requiredBetaHeader: "context-management-2025-06-27" },
        requestPatch: {
            body: { context_management: nativePlan.contextManagement },
            beta_headers: ["context-management-2025-06-27"],
        },
    };
    const nativeTask = {
        ...task,
        target_project: "api",
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "api",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_api_microcompact_native_receipt_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            compaction: {
                                apiMicroCompactEditPlan: nativePlan,
                                apiMicrocompactNativeApplyPlan: nativeApplyPlan,
                            },
                        },
                    },
                },
            }],
    };
    const nativeReceipt = {
        ...baseReceipt,
        agent: "api",
        memoryUsed: [`API microcompact planChecksum=${nativePlan.planChecksum} native applied`],
        memoryIgnored: [],
        apiMicrocompactUsage: [{
                planChecksum: nativePlan.planChecksum,
                applyPlanChecksum: nativeApplyPlan.applyPlanChecksum,
                requestPatchChecksum: nativeApplyPlan.requestPatchChecksum,
                usageState: "native_applied",
                nativeApplied: true,
                reason: "provider request included context_management and required beta header",
            }],
    };
    const nativeMissingChecksumReceipt = {
        ...nativeReceipt,
        apiMicrocompactUsage: [{
                planChecksum: nativePlan.planChecksum,
                usageState: "native_applied",
                nativeApplied: true,
                reason: "native claim omits apply and request patch checksums",
            }],
    };
    const sessionBoundPlan = {
        ...plan,
        planChecksum: "api_microcompact_receipt_selftest_session_bound_plan",
        targetProject: "worker",
    };
    const sessionBoundApplyPlan = {
        ...advisoryNativeApplyPlan,
        apiEditPlanChecksum: sessionBoundPlan.planChecksum,
        applyPlanChecksum: "api_microcompact_receipt_selftest_session_bound_apply",
        task_agent_session_id: "tas-api-microcompact-bound",
        native_session_id: "native-api-microcompact-bound",
        memory_context_snapshot_id: "snapshot-api-microcompact-bound",
        memory_context_snapshot_checksum: "checksum-api-microcompact-bound",
        sessionBinding: {
            schema: "ccm-child-agent-memory-session-binding-v1",
            binding_id: "csm-api-microcompact-bound",
            task_agent_session_id: "tas-api-microcompact-bound",
            native_session_id: "native-api-microcompact-bound",
        },
    };
    const sessionBoundTask = {
        ...task,
        target_project: "worker",
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "worker",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_api_microcompact_session_bound_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            session_binding: sessionBoundApplyPlan.sessionBinding,
                            compaction: {
                                apiMicroCompactEditPlan: sessionBoundPlan,
                                apiMicrocompactNativeApplyPlan: sessionBoundApplyPlan,
                            },
                        },
                    },
                },
            }],
    };
    const sessionBoundReceipt = {
        ...baseReceipt,
        agent: "worker",
        task_agent_session_id: "tas-api-microcompact-bound",
        native_session_id: "native-api-microcompact-bound",
        memory_context_snapshot_id: "snapshot-api-microcompact-bound",
        memory_context_snapshot_checksum: "checksum-api-microcompact-bound",
        memoryUsed: [`api_microcompact_edit_plan planChecksum=${sessionBoundPlan.planChecksum} advisory session bound`],
        apiMicrocompactUsage: [{
                planChecksum: sessionBoundPlan.planChecksum,
                usageState: "advisory",
                nativeApplied: false,
                taskAgentSessionId: "tas-api-microcompact-bound",
                nativeSessionId: "native-api-microcompact-bound",
                memoryContextSnapshotId: "snapshot-api-microcompact-bound",
                memoryContextSnapshotChecksum: "checksum-api-microcompact-bound",
                reason: "advisory use bound to this child-agent session",
            }],
    };
    const wrongSessionReceipt = {
        ...sessionBoundReceipt,
        task_agent_session_id: "tas-api-microcompact-wrong",
        apiMicrocompactUsage: [{
                ...sessionBoundReceipt.apiMicrocompactUsage[0],
                taskAgentSessionId: "tas-api-microcompact-wrong",
                reason: "declares the plan from a different child-agent session",
            }],
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const missingQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingReceipt);
    const unsafeQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, unsafeReceipt);
    const ignoredQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, ignoredReceipt);
    const nativeQuality = (0, collaboration_1.scoreChildAgentReceipt)(nativeTask, nativeReceipt);
    const nativeMissingChecksumQuality = (0, collaboration_1.scoreChildAgentReceipt)(nativeTask, nativeMissingChecksumReceipt);
    const sessionBoundQuality = (0, collaboration_1.scoreChildAgentReceipt)(sessionBoundTask, sessionBoundReceipt);
    const wrongSessionQuality = (0, collaboration_1.scoreChildAgentReceipt)(sessionBoundTask, wrongSessionReceipt);
    const missingSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesApiMicrocompactGate: goodQuality.pass === true
            && goodQuality.api_microcompact?.pass === true
            && goodQuality.api_microcompact?.advisory_count === 1
            && goodQuality.grade === "good",
        ignoredReceiptPassesAsDeclaredNotSupported: ignoredQuality.pass === true
            && ignoredQuality.api_microcompact?.ignored_count === 1,
        missingReceiptHardFailsQuality: missingQuality.pass === false
            && missingQuality.api_microcompact?.missing_plan_checksums?.includes(plan.planChecksum)
            && missingQuality.missing.includes("声明 API microcompact 使用状态"),
        unsafeNativeApplyHardFailsQuality: unsafeQuality.pass === false
            && unsafeQuality.api_microcompact?.unsafe_native_applied_plan_checksums?.includes(plan.planChecksum),
        nativeApplyPassesWithBoundChecksums: nativeQuality.pass === true
            && nativeQuality.api_microcompact?.native_applied_count === 1
            && nativeQuality.api_microcompact?.rows?.[0]?.apply_plan_checksum_matched === true
            && nativeQuality.api_microcompact?.rows?.[0]?.request_patch_checksum_matched === true,
        nativeApplyMissingChecksumsHardFails: nativeMissingChecksumQuality.pass === false
            && nativeMissingChecksumQuality.api_microcompact?.unsafe_native_applied_plan_checksums?.includes(nativePlan.planChecksum),
        sessionBoundApiMicrocompactReceiptPasses: sessionBoundQuality.pass === true
            && sessionBoundQuality.api_microcompact?.rows?.[0]?.session_matched === true,
        wrongSessionApiMicrocompactReceiptFails: wrongSessionQuality.pass === false
            && wrongSessionQuality.api_microcompact?.session_mismatch_plan_checksums?.includes(sessionBoundPlan.planChecksum),
        deliverySummaryRecordsMissingApiMicrocompact: missingSummary.api_microcompact_edit_plan_count === 1
            && missingSummary.api_microcompact_receipt_passed === false
            && missingSummary.api_microcompact_receipt_summary?.status === "missing_usage_declaration",
        acceptanceGateBlocksMissingApiMicrocompact: missingSummary.acceptance_gate_passed === false
            && missingSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "api_microcompact_receipt"),
        runtimeKernelShowsApiMicrocompactGap: missingSummary.runtime_kernel?.api_microcompact_receipt?.status === "missing_usage_declaration",
        goodDeliverySummaryPassesApiMicrocompact: goodSummary.api_microcompact_receipt_passed === true
            && goodSummary.api_microcompact_receipt_summary?.status === "passed"
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, apiMicrocompact: goodQuality.api_microcompact },
        missing: { score: missingQuality.score, grade: missingQuality.grade, apiMicrocompact: missingQuality.api_microcompact },
        unsafe: { score: unsafeQuality.score, grade: unsafeQuality.grade, apiMicrocompact: unsafeQuality.api_microcompact },
        native: { score: nativeQuality.score, grade: nativeQuality.grade, apiMicrocompact: nativeQuality.api_microcompact },
        nativeMissingChecksum: { score: nativeMissingChecksumQuality.score, grade: nativeMissingChecksumQuality.grade, apiMicrocompact: nativeMissingChecksumQuality.api_microcompact },
        sessionBound: { score: sessionBoundQuality.score, grade: sessionBoundQuality.grade, apiMicrocompact: sessionBoundQuality.api_microcompact },
        wrongSession: { score: wrongSessionQuality.score, grade: wrongSessionQuality.grade, apiMicrocompact: wrongSessionQuality.api_microcompact },
        ignored: { score: ignoredQuality.score, grade: ignoredQuality.grade, apiMicrocompact: ignoredQuality.api_microcompact },
    };
}
function runPostCompactReinjectionGateReceiptValidationSelfTest() {
    const gate = {
        schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
        reinjection_gate_id: "pcrg_receipt_gate_selftest",
        group_id: "group-reinjection-gate-selftest",
        target_project: "frontend",
        scope: "child:frontend",
        status: "required",
        action: "review_reinjection_candidates_before_execution",
        candidate_count: 2,
        candidates: [
            { candidate_id: "pcrc_receipt_file", kind: "file", value: "src/payment/callback.ts", sourceMessageId: "old-1" },
            { candidate_id: "pcrc_receipt_check", kind: "verification", value: "npm run check", sourceMessageId: "old-2" },
        ],
        post_compact_recovery_audit: {
            status: "pass",
            pass: true,
            action: "safe_to_inject_child_agent_memory_packet",
            summary_checksum: "receipt-reinjection-summary",
            transcript_path: "reinjection-raw.json",
        },
    };
    const task = {
        title: "压缩后重注入 gate 回执自测",
        workflow_type: "daily_dev",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_reinjection_gate_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            post_compact_reinjection_gate: gate,
                        },
                    },
                },
            }],
    };
    const baseReceipt = {
        agent: "frontend",
        status: "done",
        summary: "完成压缩重注入 gate 回执验证改动",
        actions: ["修改前端页面"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证压缩后重注入 gate 回执",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        blockers: [],
        needs: [],
    };
    const goodReceipt = {
        ...baseReceipt,
        memoryUsed: [
            "使用 used candidate_id=pcrc_receipt_file；src/payment/callback.ts；reinjection_gate_id=pcrg_receipt_gate_selftest",
            "已验证 verified candidate_id=pcrc_receipt_check；npm run check；reinjection_gate_id=pcrg_receipt_gate_selftest",
        ],
        memoryIgnored: [],
    };
    const structuredGoodReceipt = {
        ...baseReceipt,
        memoryUsed: ["已读取压缩后重注入门禁 reinjection_gate_id=pcrg_receipt_gate_selftest"],
        memoryIgnored: [],
        postCompactCandidateUsage: [
            { gateId: "pcrg_receipt_gate_selftest", candidateId: "pcrc_receipt_file", usageState: "used", reason: "用于定位回调文件" },
            { gateId: "pcrg_receipt_gate_selftest", candidateId: "pcrc_receipt_check", usageState: "verified", reason: "已核验验证命令适用性" },
        ],
    };
    const missingGateReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用压缩前重注入候选 src/payment/callback.ts，但未引用 gate id"],
        memoryIgnored: [],
    };
    const missingCandidateReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用压缩前重注入候选；reinjection_gate_id=pcrg_receipt_gate_selftest"],
        memoryIgnored: [],
    };
    const missingUsageReceipt = {
        ...baseReceipt,
        memoryUsed: ["压缩前重注入候选 candidate_id=pcrc_receipt_file；src/payment/callback.ts；reinjection_gate_id=pcrg_receipt_gate_selftest"],
        memoryIgnored: [],
    };
    const partialUsageReceipt = {
        ...baseReceipt,
        memoryUsed: ["使用 used candidate_id=pcrc_receipt_file；src/payment/callback.ts；reinjection_gate_id=pcrg_receipt_gate_selftest"],
        memoryIgnored: [],
    };
    const ignoredGateReceipt = {
        ...baseReceipt,
        memoryUsed: [],
        memoryIgnored: ["未使用全部候选，reinjection_gate_id=pcrg_receipt_gate_selftest；原因：本轮只改当前 UI"],
    };
    const goodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, goodReceipt);
    const structuredGoodQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, structuredGoodReceipt);
    const missingGateQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingGateReceipt);
    const missingCandidateQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingCandidateReceipt);
    const missingUsageQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, missingUsageReceipt);
    const partialUsageQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, partialUsageReceipt);
    const ignoredQuality = (0, collaboration_1.scoreChildAgentReceipt)(task, ignoredGateReceipt);
    const missingGateSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingGateReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const goodSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: goodReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const missingUsageSummary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt: missingUsageReceipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const checks = {
        goodReceiptPassesGate: goodQuality.pass === true
            && goodQuality.post_compact_reinjection_gate?.pass === true
            && goodQuality.post_compact_reinjection_gate?.referenced_candidate_ids?.includes("pcrc_receipt_file")
            && goodQuality.post_compact_reinjection_gate?.used_candidate_ids?.includes("pcrc_receipt_file")
            && goodQuality.post_compact_reinjection_gate?.verified_candidate_ids?.includes("pcrc_receipt_check")
            && goodQuality.grade === "good",
        ignoredReceiptCanSatisfyGate: ignoredQuality.pass === true
            && ignoredQuality.post_compact_reinjection_gate?.pass === true
            && ignoredQuality.post_compact_reinjection_gate?.all_candidates_declared === true
            && ignoredQuality.post_compact_reinjection_gate?.ignored_candidate_ids?.includes("pcrc_receipt_file")
            && ignoredQuality.grade === "good",
        structuredCandidateUsagePassesGate: structuredGoodQuality.pass === true
            && structuredGoodQuality.post_compact_reinjection_gate?.pass === true
            && structuredGoodQuality.post_compact_reinjection_gate?.used_candidate_ids?.includes("pcrc_receipt_file")
            && structuredGoodQuality.post_compact_reinjection_gate?.verified_candidate_ids?.includes("pcrc_receipt_check"),
        partialCandidateUsageHardFailsStrictGate: partialUsageQuality.pass === false
            && partialUsageQuality.post_compact_reinjection_gate?.candidate_usage_strict_passed === false
            && partialUsageQuality.post_compact_reinjection_gate?.missing_candidate_usage_candidate_ids?.includes("pcrc_receipt_check"),
        missingGateHardFailsQuality: missingGateQuality.pass === false
            && missingGateQuality.grade !== "good"
            && missingGateQuality.post_compact_reinjection_gate?.missing_gate_ids?.includes("pcrg_receipt_gate_selftest")
            && missingGateQuality.missing.includes("引用压缩后重注入 gate"),
        missingCandidateHardFailsQuality: missingCandidateQuality.pass === false
            && missingCandidateQuality.grade !== "good"
            && missingCandidateQuality.post_compact_reinjection_gate?.missing_candidate_reference_gate_ids?.includes("pcrg_receipt_gate_selftest")
            && missingCandidateQuality.missing.includes("声明压缩重注入候选"),
        missingUsageHardFailsQuality: missingUsageQuality.pass === false
            && missingUsageQuality.grade !== "good"
            && missingUsageQuality.post_compact_reinjection_gate?.missing_candidate_usage_gate_ids?.includes("pcrg_receipt_gate_selftest")
            && missingUsageQuality.post_compact_reinjection_gate?.mentioned_only_candidate_ids?.includes("pcrc_receipt_file")
            && missingUsageQuality.missing.includes("声明候选使用状态"),
        deliverySummaryRecordsGate: missingGateSummary.post_compact_reinjection_gate_count === 1
            && missingGateSummary.post_compact_reinjection_gate_receipt_passed === false
            && missingGateSummary.post_compact_reinjection_gate_receipt_rows?.[0]?.post_compact_reinjection_gate?.missing_gate_ids?.includes("pcrg_receipt_gate_selftest"),
        acceptanceGateBlocksMissingGate: missingGateSummary.acceptance_gate_passed === false
            && missingGateSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "post_compact_reinjection_gate_receipt"),
        visibleSummaryRecordsCandidateCount: missingGateSummary.post_compact_reinjection_gate_summary?.candidate_count === 2
            && missingGateSummary.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_receipt_reference",
        visibleSummaryRecordsMissingUsage: missingUsageSummary.post_compact_reinjection_gate_summary?.status === "missing_candidate_usage"
            && missingUsageSummary.post_compact_reinjection_gate_summary?.missing_candidate_usage_gate_ids?.includes("pcrg_receipt_gate_selftest")
            && missingUsageSummary.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_candidate_usage",
        goodDeliverySummaryPassesGate: goodSummary.post_compact_reinjection_gate_receipt_passed === true
            && goodSummary.receipt_quality_gate_passed === true,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        good: { score: goodQuality.score, grade: goodQuality.grade, reinjectionGate: goodQuality.post_compact_reinjection_gate },
        structuredGood: { score: structuredGoodQuality.score, grade: structuredGoodQuality.grade, reinjectionGate: structuredGoodQuality.post_compact_reinjection_gate },
        missing: { score: missingGateQuality.score, grade: missingGateQuality.grade, reinjectionGate: missingGateQuality.post_compact_reinjection_gate },
        missingCandidate: { score: missingCandidateQuality.score, grade: missingCandidateQuality.grade, reinjectionGate: missingCandidateQuality.post_compact_reinjection_gate },
        missingUsage: { score: missingUsageQuality.score, grade: missingUsageQuality.grade, reinjectionGate: missingUsageQuality.post_compact_reinjection_gate },
        partialUsage: { score: partialUsageQuality.score, grade: partialUsageQuality.grade, reinjectionGate: partialUsageQuality.post_compact_reinjection_gate },
    };
}
function runPostCompactDispatchMarkerVisibleSelfTest() {
    const marker = {
        schema: "ccm-post-compact-first-dispatch-marker-v1",
        marker_id: "pcfd_visible_selftest",
        group_id: "group-post-compact-dispatch-visible-selftest",
        target_project: "frontend",
        scope: "child:frontend",
        boundary_id: "pcb_visible_selftest",
        raw_boundary_id: "compact-sync-visible",
        summarized_through_message_id: "old-7",
        summary_checksum: "visible-post-compact-summary",
        first_dispatch_after_compact: true,
        dispatch_sequence: 1,
        status: "first_dispatch_after_compact",
        action: "treat_reinjected_memory_as_fresh_recovered_context",
        reinjection_gate_id: "pcrg_visible_selftest",
        candidate_count: 2,
    };
    const task = {
        title: "压缩后派发 marker 可见性自测",
        workflow_type: "daily_dev",
        target_project: "frontend",
        requires_code_changes: true,
        requires_verification: true,
        workflow_timeline: [{
                type: "worker_handoff_ready",
                agent: "frontend",
                data: {
                    worker_context_packet: {
                        packet_id: "wcp_post_compact_dispatch_visible",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            post_compact_dispatch_marker: marker,
                        },
                    },
                },
            }],
    };
    const receipt = {
        agent: "frontend",
        status: "done",
        summary: "完成压缩后派发 marker 可见性验证改动",
        actions: ["修改前端任务卡"],
        filesChanged: ["src/App.vue"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "验证压缩后派发 marker 可见性",
            plannedScope: ["src/App.vue"],
            forbiddenScope: ["无关模块"],
            verificationPlan: ["npm test"],
            unclear: [],
        },
        contractChanges: [],
        memoryUsed: ["使用压缩恢复后首跳 marker=pcfd_visible_selftest"],
        memoryIgnored: [],
        blockers: [],
        needs: [],
    };
    const summary = (0, collaboration_1.buildDeliverySummary)(task, {
        status: "done",
        receipt,
        review: { status: "complete", content: "主 Agent 复盘完成" },
        fileChanges: { files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }], count: 1 },
    }, "waiting");
    const card = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: summary }, [], []);
    const checks = {
        summaryRecordsMarker: summary.post_compact_dispatch_marker_count === 1
            && summary.post_compact_dispatch_marker_summary?.status === "first_dispatch_after_compact"
            && summary.post_compact_dispatch_marker_summary?.first_dispatch_count === 1,
        runtimeKernelRecordsMarker: summary.runtime_kernel?.post_compact_dispatch_marker?.marker_ids?.includes("pcfd_visible_selftest")
            && summary.runtime_kernel?.post_compact_dispatch_marker?.status === "first_dispatch_after_compact",
        agentCoordinationRecordsMarker: card.agent_coordination?.post_compact_dispatch_marker_summary?.rows?.some((row) => row.marker_id === "pcfd_visible_selftest")
            && card.agent_coordination?.coordination_events?.some((event) => event.type === "post_compact_dispatch_marker"),
        taskCardRuntimeRecordsMarker: card.runtime_kernel?.post_compact_dispatch_marker?.marker_ids?.includes("pcfd_visible_selftest")
            && card.technical?.runtime_kernel?.post_compact_dispatch_marker?.first_dispatch_count === 1,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        markerSummary: summary.post_compact_dispatch_marker_summary,
    };
}
//# sourceMappingURL=collaboration-receipt-self-tests.js.map