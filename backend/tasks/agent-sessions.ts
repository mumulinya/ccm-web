// Public compatibility facade. Implementations live in focused modules.
export {
  FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
  TaskAgentMemoryContextSnapshotRef,
  TaskAgentSession,
  verifyTaskAgentMemorySnapshotSyncDecision,
  verifyTaskAgentMemoryPromptInjectionProof,
  verifyTaskAgentMemorySnapshotSyncCommit,
  verifyMemoryContextDeliveryReceiptChecksum
} from "./agent-sessions-shared";
export {
  prepareTaskAgentMemoryEntrySyncContext,
  verifyTaskAgentMemoryEntryRenderContentionReceipt,
  prepareTaskAgentMemoryEntrySyncContextWithRetry,
  bindTaskAgentMemoryContextSnapshot,
  attachTaskAgentFinalDispatchPayloadGate
} from "./agent-sessions-bind";
export {
  recordTaskAgentMemoryContextDelivery,
  readTaskAgentMemoryContextDeliveryReceipt,
} from "./agent-sessions-delivery";
export {
  listTaskAgentMemoryContextSnapshots,
  buildTaskAgentMemoryContextSnapshotInventory,
} from "./agent-sessions-inventory";
export {
  TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES,
  TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA,
  buildTaskAgentMemoryTransportUsageCohortReport,
  verifyTaskAgentMemoryTransportUsageCohortReport,
} from "./task-agent-memory-transport-usage-cohorts";
export {
  openTaskAgentSession,
  recordTaskAgentSessionTurn,
  verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
  inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
  recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome,
  advanceTaskAgentSession,
  reopenTaskAgentSessions,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
  listTaskAgentSessions,
  markTaskAgentSessionsForCapacityDowngrade,
  verifyTaskAgentSessionCapacityRevalidationProof,
  verifyTaskAgentSessionCapacityRevalidationCommitReceipt,
  prepareTaskAgentSessionCapacityRevalidation,
  commitTaskAgentSessionCapacityRevalidation,
  acknowledgeTaskAgentSessionCapacityRevalidation,
  runTaskAgentSessionModelIdentitySelfTest
} from "./agent-sessions-resume";
export {
  closeTaskAgentSessions,
  pruneTaskAgentMemoryContextSnapshots,
  purgeTaskAgentSessions,
  reconcileTaskAgentSessions,
  shouldCloseTaskAgentSessions
} from "./agent-sessions-purge";

import * as crypto from "crypto";
import * as fs from "fs";
import { getAgentRuntime } from "../agents/runtime";
import type { TaskAgentSession } from "./agent-sessions-shared";
import {
  openTaskAgentSession,
  advanceTaskAgentSession,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
} from "./agent-sessions-resume";
import { bindTaskAgentMemoryContextSnapshot } from "./agent-sessions-bind";
import { listTaskAgentMemoryContextSnapshots } from "./agent-sessions-inventory";
import { purgeTaskAgentSessions, shouldCloseTaskAgentSessions } from "./agent-sessions-purge";

export function runTaskAgentSessionSelfTest() {
  const claude = {
    nativeSessionId: crypto.randomUUID(),
    resumeMode: "native",
    turnCount: 1,
  } as TaskAgentSession;
  const options = getTaskAgentSessionOptions(claude);
  const cursorWithoutCapturedId = advanceTaskAgentSession({ ...claude, id: "cursor-test", agentType: "cursor", nativeSessionId: "", turnCount: 0 } as TaskAgentSession, { success: true });
  const codexWithCapturedId = advanceTaskAgentSession({ ...claude, id: "codex-test", agentType: "codex", nativeSessionId: "", turnCount: 0 } as TaskAgentSession, { success: true, nativeSessionId: "codex-thread-1" });
  const invalidCursor = advanceTaskAgentSession({ ...claude, id: "cursor-invalid", agentType: "cursor", nativeSessionId: "cursor-thread-old", turnCount: 2 } as TaskAgentSession, { success: false, error: "session not found" });
  const runtimeSnapshotSession = advanceTaskAgentSession({ ...claude, id: "runtime-snapshot", agentType: "claudecode", nativeSessionId: "claude-session", turnCount: 1 } as TaskAgentSession, {
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
      cursorUsesNativeContinuation: getAgentRuntime("cursor").capabilities.sessionResume,
      persistentTaskWaitsForDoneState: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
      persistentTaskClosesAfterDoneState: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
      persistentTaskKeepsSessionOnFailed: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "failed" }),
      persistentTaskKeepsSessionOnPaused: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "paused" }),
      persistentTaskClosesAfterCancelled: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "cancelled" }),
      persistentTaskClosesAfterArchived: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "archived" }),
      conversationalTaskClosesAfterReview: shouldCloseTaskAgentSessions({ reviewStatus: "complete" }),
      missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
      capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && getTaskAgentSessionOptions(codexWithCapturedId).resumeSession,
      invalidNativeSessionCreatesRecoveryPath: invalidCursor.resumeMode === "native" && invalidCursor.nativeSessionId === "" && invalidCursor.nativeSessionHistory?.includes("cursor-thread-old") && invalidCursor.nativeRecoveryAttempts === 1,
      runtimeSnapshotPersistsAcrossTurns: runtimeSnapshotSession.runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionOptions(runtimeSnapshotSession).runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionContinuity(runtimeSnapshotSession).mcpConfigPath === "/tmp/mcp.json",
      permissionDriftRebuildsNativeSession: (() => {
        const drifted = advanceTaskAgentSession({ ...claude, id: "codex-drift", agentType: "codex", nativeSessionId: "codex-readonly", turnCount: 3 } as TaskAgentSession, { success: false, error: "sandbox read-only", permissionDrift: true });
        return drifted.resumeMode === "native" && drifted.nativeSessionId === "" && drifted.turnCount === 0 && drifted.nativeSessionHistory?.includes("codex-readonly") && drifted.permissionDriftCount === 1;
      })(),
      taskAgentMemoryContextSnapshotBindsSession: (() => {
        const taskId = `task-agent-memory-snapshot-selftest-${process.pid}-${Date.now().toString(36)}`;
        try {
          const session = openTaskAgentSession({
            scopeId: taskId,
            taskId,
            groupId: "group-agent-memory-snapshot-selftest",
            project: "frontend",
            agentType: "codex",
          });
          const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
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
          const listed = listTaskAgentMemoryContextSnapshots({ taskId });
          const loaded = listed.find((item: any) => item.snapshot_id === bound?.snapshot?.snapshot_id);
          return !!bound?.session.memoryContextSnapshotId
            && !!bound?.snapshot.snapshot_file
            && fs.existsSync(bound.snapshot.snapshot_file)
            && loaded?.context?.worker_context_packet_id === "wcp_agent_memory_snapshot_selftest"
            && loaded?.context?.gate_ids?.includes("gmd_agent_memory_snapshot_selftest")
            && loaded?.session?.id === session.id;
        } finally {
          purgeTaskAgentSessions(taskId);
        }
      })(),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
