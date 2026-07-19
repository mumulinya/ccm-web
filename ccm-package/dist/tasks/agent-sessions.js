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
exports.shouldCloseTaskAgentSessions = exports.reconcileTaskAgentSessions = exports.purgeTaskAgentSessions = exports.pruneTaskAgentMemoryContextSnapshots = exports.closeTaskAgentSessions = exports.runTaskAgentSessionModelIdentitySelfTest = exports.acknowledgeTaskAgentSessionCapacityRevalidation = exports.commitTaskAgentSessionCapacityRevalidation = exports.prepareTaskAgentSessionCapacityRevalidation = exports.verifyTaskAgentSessionCapacityRevalidationCommitReceipt = exports.verifyTaskAgentSessionCapacityRevalidationProof = exports.markTaskAgentSessionsForCapacityDowngrade = exports.listTaskAgentSessions = exports.getTaskAgentSessionContinuity = exports.getTaskAgentSessionOptions = exports.reopenTaskAgentSessions = exports.advanceTaskAgentSession = exports.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome = exports.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker = exports.verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker = exports.recordTaskAgentSessionTurn = exports.openTaskAgentSession = exports.verifyTaskAgentMemoryTransportUsageCohortReport = exports.buildTaskAgentMemoryTransportUsageCohortReport = exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA = exports.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES = exports.buildTaskAgentMemoryContextSnapshotInventory = exports.listTaskAgentMemoryContextSnapshots = exports.readTaskAgentMemoryContextDeliveryReceipt = exports.recordTaskAgentMemoryContextDelivery = exports.attachTaskAgentFinalDispatchPayloadGate = exports.bindTaskAgentMemoryContextSnapshot = exports.prepareTaskAgentMemoryEntrySyncContextWithRetry = exports.verifyTaskAgentMemoryEntryRenderContentionReceipt = exports.prepareTaskAgentMemoryEntrySyncContext = exports.verifyMemoryContextDeliveryReceiptChecksum = exports.verifyTaskAgentMemorySnapshotSyncCommit = exports.verifyTaskAgentMemoryPromptInjectionProof = exports.verifyTaskAgentMemorySnapshotSyncDecision = exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = void 0;
exports.runTaskAgentSessionSelfTest = runTaskAgentSessionSelfTest;
// Public compatibility facade. Implementations live in focused modules.
var agent_sessions_shared_1 = require("./agent-sessions-shared");
Object.defineProperty(exports, "FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES", { enumerable: true, get: function () { return agent_sessions_shared_1.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES; } });
Object.defineProperty(exports, "verifyTaskAgentMemorySnapshotSyncDecision", { enumerable: true, get: function () { return agent_sessions_shared_1.verifyTaskAgentMemorySnapshotSyncDecision; } });
Object.defineProperty(exports, "verifyTaskAgentMemoryPromptInjectionProof", { enumerable: true, get: function () { return agent_sessions_shared_1.verifyTaskAgentMemoryPromptInjectionProof; } });
Object.defineProperty(exports, "verifyTaskAgentMemorySnapshotSyncCommit", { enumerable: true, get: function () { return agent_sessions_shared_1.verifyTaskAgentMemorySnapshotSyncCommit; } });
Object.defineProperty(exports, "verifyMemoryContextDeliveryReceiptChecksum", { enumerable: true, get: function () { return agent_sessions_shared_1.verifyMemoryContextDeliveryReceiptChecksum; } });
var agent_sessions_bind_1 = require("./agent-sessions-bind");
Object.defineProperty(exports, "prepareTaskAgentMemoryEntrySyncContext", { enumerable: true, get: function () { return agent_sessions_bind_1.prepareTaskAgentMemoryEntrySyncContext; } });
Object.defineProperty(exports, "verifyTaskAgentMemoryEntryRenderContentionReceipt", { enumerable: true, get: function () { return agent_sessions_bind_1.verifyTaskAgentMemoryEntryRenderContentionReceipt; } });
Object.defineProperty(exports, "prepareTaskAgentMemoryEntrySyncContextWithRetry", { enumerable: true, get: function () { return agent_sessions_bind_1.prepareTaskAgentMemoryEntrySyncContextWithRetry; } });
Object.defineProperty(exports, "bindTaskAgentMemoryContextSnapshot", { enumerable: true, get: function () { return agent_sessions_bind_1.bindTaskAgentMemoryContextSnapshot; } });
Object.defineProperty(exports, "attachTaskAgentFinalDispatchPayloadGate", { enumerable: true, get: function () { return agent_sessions_bind_1.attachTaskAgentFinalDispatchPayloadGate; } });
var agent_sessions_delivery_1 = require("./agent-sessions-delivery");
Object.defineProperty(exports, "recordTaskAgentMemoryContextDelivery", { enumerable: true, get: function () { return agent_sessions_delivery_1.recordTaskAgentMemoryContextDelivery; } });
Object.defineProperty(exports, "readTaskAgentMemoryContextDeliveryReceipt", { enumerable: true, get: function () { return agent_sessions_delivery_1.readTaskAgentMemoryContextDeliveryReceipt; } });
var agent_sessions_inventory_1 = require("./agent-sessions-inventory");
Object.defineProperty(exports, "listTaskAgentMemoryContextSnapshots", { enumerable: true, get: function () { return agent_sessions_inventory_1.listTaskAgentMemoryContextSnapshots; } });
Object.defineProperty(exports, "buildTaskAgentMemoryContextSnapshotInventory", { enumerable: true, get: function () { return agent_sessions_inventory_1.buildTaskAgentMemoryContextSnapshotInventory; } });
var task_agent_memory_transport_usage_cohorts_1 = require("./task-agent-memory-transport-usage-cohorts");
Object.defineProperty(exports, "TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES", { enumerable: true, get: function () { return task_agent_memory_transport_usage_cohorts_1.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES; } });
Object.defineProperty(exports, "TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA", { enumerable: true, get: function () { return task_agent_memory_transport_usage_cohorts_1.TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA; } });
Object.defineProperty(exports, "buildTaskAgentMemoryTransportUsageCohortReport", { enumerable: true, get: function () { return task_agent_memory_transport_usage_cohorts_1.buildTaskAgentMemoryTransportUsageCohortReport; } });
Object.defineProperty(exports, "verifyTaskAgentMemoryTransportUsageCohortReport", { enumerable: true, get: function () { return task_agent_memory_transport_usage_cohorts_1.verifyTaskAgentMemoryTransportUsageCohortReport; } });
var agent_sessions_resume_1 = require("./agent-sessions-resume");
Object.defineProperty(exports, "openTaskAgentSession", { enumerable: true, get: function () { return agent_sessions_resume_1.openTaskAgentSession; } });
Object.defineProperty(exports, "recordTaskAgentSessionTurn", { enumerable: true, get: function () { return agent_sessions_resume_1.recordTaskAgentSessionTurn; } });
Object.defineProperty(exports, "verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker", { enumerable: true, get: function () { return agent_sessions_resume_1.verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker; } });
Object.defineProperty(exports, "inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker", { enumerable: true, get: function () { return agent_sessions_resume_1.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker; } });
Object.defineProperty(exports, "recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome", { enumerable: true, get: function () { return agent_sessions_resume_1.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome; } });
Object.defineProperty(exports, "advanceTaskAgentSession", { enumerable: true, get: function () { return agent_sessions_resume_1.advanceTaskAgentSession; } });
Object.defineProperty(exports, "reopenTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_resume_1.reopenTaskAgentSessions; } });
Object.defineProperty(exports, "getTaskAgentSessionOptions", { enumerable: true, get: function () { return agent_sessions_resume_1.getTaskAgentSessionOptions; } });
Object.defineProperty(exports, "getTaskAgentSessionContinuity", { enumerable: true, get: function () { return agent_sessions_resume_1.getTaskAgentSessionContinuity; } });
Object.defineProperty(exports, "listTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_resume_1.listTaskAgentSessions; } });
Object.defineProperty(exports, "markTaskAgentSessionsForCapacityDowngrade", { enumerable: true, get: function () { return agent_sessions_resume_1.markTaskAgentSessionsForCapacityDowngrade; } });
Object.defineProperty(exports, "verifyTaskAgentSessionCapacityRevalidationProof", { enumerable: true, get: function () { return agent_sessions_resume_1.verifyTaskAgentSessionCapacityRevalidationProof; } });
Object.defineProperty(exports, "verifyTaskAgentSessionCapacityRevalidationCommitReceipt", { enumerable: true, get: function () { return agent_sessions_resume_1.verifyTaskAgentSessionCapacityRevalidationCommitReceipt; } });
Object.defineProperty(exports, "prepareTaskAgentSessionCapacityRevalidation", { enumerable: true, get: function () { return agent_sessions_resume_1.prepareTaskAgentSessionCapacityRevalidation; } });
Object.defineProperty(exports, "commitTaskAgentSessionCapacityRevalidation", { enumerable: true, get: function () { return agent_sessions_resume_1.commitTaskAgentSessionCapacityRevalidation; } });
Object.defineProperty(exports, "acknowledgeTaskAgentSessionCapacityRevalidation", { enumerable: true, get: function () { return agent_sessions_resume_1.acknowledgeTaskAgentSessionCapacityRevalidation; } });
Object.defineProperty(exports, "runTaskAgentSessionModelIdentitySelfTest", { enumerable: true, get: function () { return agent_sessions_resume_1.runTaskAgentSessionModelIdentitySelfTest; } });
var agent_sessions_purge_1 = require("./agent-sessions-purge");
Object.defineProperty(exports, "closeTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_purge_1.closeTaskAgentSessions; } });
Object.defineProperty(exports, "pruneTaskAgentMemoryContextSnapshots", { enumerable: true, get: function () { return agent_sessions_purge_1.pruneTaskAgentMemoryContextSnapshots; } });
Object.defineProperty(exports, "purgeTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_purge_1.purgeTaskAgentSessions; } });
Object.defineProperty(exports, "reconcileTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_purge_1.reconcileTaskAgentSessions; } });
Object.defineProperty(exports, "shouldCloseTaskAgentSessions", { enumerable: true, get: function () { return agent_sessions_purge_1.shouldCloseTaskAgentSessions; } });
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const runtime_1 = require("../agents/runtime");
const agent_sessions_resume_2 = require("./agent-sessions-resume");
const agent_sessions_bind_2 = require("./agent-sessions-bind");
const agent_sessions_inventory_2 = require("./agent-sessions-inventory");
const agent_sessions_purge_2 = require("./agent-sessions-purge");
function runTaskAgentSessionSelfTest() {
    const claude = {
        nativeSessionId: crypto.randomUUID(),
        resumeMode: "native",
        turnCount: 1,
    };
    const options = (0, agent_sessions_resume_2.getTaskAgentSessionOptions)(claude);
    const cursorWithoutCapturedId = (0, agent_sessions_resume_2.advanceTaskAgentSession)({ ...claude, id: "cursor-test", agentType: "cursor", nativeSessionId: "", turnCount: 0 }, { success: true });
    const codexWithCapturedId = (0, agent_sessions_resume_2.advanceTaskAgentSession)({ ...claude, id: "codex-test", agentType: "codex", nativeSessionId: "", turnCount: 0 }, { success: true, nativeSessionId: "codex-thread-1" });
    const invalidCursor = (0, agent_sessions_resume_2.advanceTaskAgentSession)({ ...claude, id: "cursor-invalid", agentType: "cursor", nativeSessionId: "cursor-thread-old", turnCount: 2 }, { success: false, error: "session not found" });
    const runtimeSnapshotSession = (0, agent_sessions_resume_2.advanceTaskAgentSession)({ ...claude, id: "runtime-snapshot", agentType: "claudecode", nativeSessionId: "claude-session", turnCount: 1 }, {
        success: true,
        runtimeToolSnapshot: {
            snapshotId: "snap-runtime",
            snapshotPath: "/tmp/runtime-tool-snapshot.json",
            mcpConfigPath: "/tmp/mcp.json",
            allowedTools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
            permissionRules: [{ rule: "mcp__ccm__payments__createInvoice" }],
        },
    });
    const checks = {
        persistsNativeSession: options.persistSession,
        resumesAfterFirstTurn: options.resumeSession,
        preservesNativeId: options.sessionId === claude.nativeSessionId,
        cursorUsesNativeContinuation: (0, runtime_1.getAgentRuntime)("cursor").capabilities.sessionResume,
        persistentTaskWaitsForDoneState: !(0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
        persistentTaskClosesAfterDoneState: (0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
        persistentTaskKeepsSessionOnFailed: !(0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "complete", taskStatus: "failed" }),
        persistentTaskKeepsSessionOnPaused: !(0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "complete", taskStatus: "paused" }),
        persistentTaskClosesAfterCancelled: (0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "cancelled" }),
        persistentTaskClosesAfterArchived: (0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "archived" }),
        conversationalTaskClosesAfterReview: (0, agent_sessions_purge_2.shouldCloseTaskAgentSessions)({ reviewStatus: "complete" }),
        missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
        capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && (0, agent_sessions_resume_2.getTaskAgentSessionOptions)(codexWithCapturedId).resumeSession,
        invalidNativeSessionCreatesRecoveryPath: invalidCursor.resumeMode === "native" && invalidCursor.nativeSessionId === "" && invalidCursor.nativeSessionHistory?.includes("cursor-thread-old") && invalidCursor.nativeRecoveryAttempts === 1,
        runtimeSnapshotPersistsAcrossTurns: runtimeSnapshotSession.runtimeSnapshotId === "snap-runtime" && (0, agent_sessions_resume_2.getTaskAgentSessionOptions)(runtimeSnapshotSession).runtimeSnapshotId === "snap-runtime" && (0, agent_sessions_resume_2.getTaskAgentSessionContinuity)(runtimeSnapshotSession).mcpConfigPath === "/tmp/mcp.json",
        permissionDriftRebuildsNativeSession: (() => {
            const drifted = (0, agent_sessions_resume_2.advanceTaskAgentSession)({ ...claude, id: "codex-drift", agentType: "codex", nativeSessionId: "codex-readonly", turnCount: 3 }, { success: false, error: "sandbox read-only", permissionDrift: true });
            return drifted.resumeMode === "native" && drifted.nativeSessionId === "" && drifted.turnCount === 0 && drifted.nativeSessionHistory?.includes("codex-readonly") && drifted.permissionDriftCount === 1;
        })(),
        taskAgentMemoryContextSnapshotBindsSession: (() => {
            const taskId = `task-agent-memory-snapshot-selftest-${process.pid}-${Date.now().toString(36)}`;
            try {
                const session = (0, agent_sessions_resume_2.openTaskAgentSession)({
                    scopeId: taskId,
                    taskId,
                    groupId: "group-agent-memory-snapshot-selftest",
                    project: "frontend",
                    agentType: "codex",
                });
                const bound = (0, agent_sessions_bind_2.bindTaskAgentMemoryContextSnapshot)(session.id, {
                    taskId,
                    groupId: "group-agent-memory-snapshot-selftest",
                    project: "frontend",
                    agentType: "codex",
                    nativeSessionId: "codex-native-memory-selftest",
                    turn: 1,
                    executionId: "exec-agent-memory-snapshot-selftest",
                    traceId: "trace-agent-memory-snapshot-selftest",
                    workerContextPacket: {
                        packet_id: "wcp_agent_memory_snapshot_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            target_project: "frontend",
                            dispatch_freshness_gate: {
                                schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
                                dispatch_gate_id: "gmd_agent_memory_snapshot_selftest",
                            },
                        },
                    },
                    renderedPrompt: "prompt contains injected worker memory",
                });
                const listed = (0, agent_sessions_inventory_2.listTaskAgentMemoryContextSnapshots)({ taskId });
                const loaded = listed.find((item) => item.snapshot_id === bound?.snapshot?.snapshot_id);
                return !!bound?.session.memoryContextSnapshotId
                    && !!bound?.snapshot.snapshot_file
                    && fs.existsSync(bound.snapshot.snapshot_file)
                    && loaded?.context?.worker_context_packet_id === "wcp_agent_memory_snapshot_selftest"
                    && loaded?.context?.gate_ids?.includes("gmd_agent_memory_snapshot_selftest")
                    && loaded?.session?.id === session.id;
            }
            finally {
                (0, agent_sessions_purge_2.purgeTaskAgentSessions)(taskId);
            }
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=agent-sessions.js.map