import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const extraction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-extraction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase227-extraction-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_${Date.now().toString(36)}_extraction`;
const scopeId = `${groupId}--${sessionId}`;
const initialMessages = [
  { id: "phase227-user-1", role: "user", content: "建立隔离 Session Memory 提取事务。" },
  { id: "phase227-assistant-1", role: "assistant", content: "第一轮完成。" },
];
const nextMessages = [...initialMessages, { id: "phase227-assistant-2", role: "assistant", content: "第二轮完成。" }];
const thirdMessages = [...nextMessages, { id: "phase227-assistant-3", role: "assistant", content: "第三轮完成。" }];

function commitSnapshot(memoryState, cadenceDecision, options = {}) {
  return extraction.runGroupSessionMemoryExtractionTransaction(scopeId, extractionContext => {
    const prepared = memory.buildGroupSessionMemorySnapshot(scopeId, memoryState, {
      reason: "phase227_transaction_selftest",
      cadenceDecision,
      extractionTransaction: {
        schema: "ccm-group-session-memory-extraction-transaction-v1",
        status: "prepared",
        leaseId: extractionContext.lease?.leaseId || "",
        fencingToken: Number(extractionContext.lease?.fencingToken || 0),
        recovered: extractionContext.recovered === true,
        startedAt: extractionContext.state?.startedAt || "",
      },
    });
    return {
      schema: "ccm-group-session-memory-extraction-staged-commit-v1",
      commit: () => memory.commitGroupSessionMemorySnapshot(prepared),
    };
  }, options);
}

try {
  const initialDue = memory.evaluateGroupSessionMemoryUpdateCadence(initialMessages, {}, { currentContextTokens: 10000 });
  const initialMemory = {
    ...memory.createEmptyGroupMemory(groupId, sessionId),
    persistentRequirements: ["PHASE227_EXTRACTION_SENTINEL 必须原子提交。"],
  };
  memory.saveGroupMemory(groupId, initialMemory, sessionId, {
    sessionMemoryCadenceDecision: memory.evaluateGroupSessionMemoryUpdateCadence(initialMessages, {}, { currentContextTokens: 1 }),
  });
  commitSnapshot(initialMemory, initialDue);
  const first = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const firstState = extraction.readGroupSessionMemoryExtractionState(scopeId);
  const firstLease = extraction.inspectGroupSessionMemoryExtractionLease(scopeId);

  const secondDue = memory.evaluateGroupSessionMemoryUpdateCadence(nextMessages, first, { currentContextTokens: 15000 });
  const holder = extraction.acquireGroupSessionMemoryExtractionLease(scopeId);
  const busyResult = commitSnapshot({
    ...memory.loadGroupMemory(groupId, sessionId),
    persistentRequirements: ["BUSY_WRITE_MUST_NOT_COMMIT"],
  }, secondDue);
  const afterBusy = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  extraction.releaseGroupSessionMemoryExtractionLease(holder.handle, "selftest_busy_holder_released");

  const failedResult = commitSnapshot({
    ...memory.loadGroupMemory(groupId, sessionId),
    persistentRequirements: ["FAILED_WRITE_MUST_NOT_COMMIT"],
  }, secondDue, { failBeforeCommit: true });
  const afterFailure = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const failedState = extraction.readGroupSessionMemoryExtractionState(scopeId);
  const failedReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const failedRow = failedReport.groups.find(row => row.groupSessionId === sessionId);

  const retryDue = memory.evaluateGroupSessionMemoryUpdateCadence(nextMessages, afterFailure, { currentContextTokens: 15000 });
  commitSnapshot({
    ...memory.loadGroupMemory(groupId, sessionId),
    persistentRequirements: ["PHASE227_EXTRACTION_SENTINEL 必须原子提交。", "失败后重试成功。"],
  }, retryDue);
  const afterRetry = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const retryState = extraction.readGroupSessionMemoryExtractionState(scopeId);

  const staleHandle = extraction.acquireGroupSessionMemoryExtractionLease(scopeId, {
    ownerPid: 999999,
    at: "2026-07-13T04:00:00.000Z",
    ttlMs: 5000,
  });
  fs.closeSync(staleHandle.handle.fd);
  staleHandle.handle.released = true;
  const staleInspection = extraction.inspectGroupSessionMemoryExtractionLease(scopeId, { at: "2026-07-13T04:01:00.000Z" });
  const thirdDue = memory.evaluateGroupSessionMemoryUpdateCadence(thirdMessages, afterRetry, { currentContextTokens: 20000 });
  commitSnapshot({
    ...memory.loadGroupMemory(groupId, sessionId),
    persistentRequirements: ["PHASE227_EXTRACTION_SENTINEL 必须原子提交。", "stale lease recovery 成功。"],
  }, thirdDue);
  const afterRecovery = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const recoveredState = extraction.readGroupSessionMemoryExtractionState(scopeId);

  const waitHolder = extraction.acquireGroupSessionMemoryExtractionLease(scopeId);
  const waitResult = await extraction.waitForGroupSessionMemoryExtraction(scopeId, { timeoutMs: 60, pollMs: 20 });
  extraction.releaseGroupSessionMemoryExtractionLease(waitHolder.handle, "selftest_wait_timeout_released");
  const finalReport = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const finalRow = finalReport.groups.find(row => row.groupSessionId === sessionId);

  const checks = {
    successfulExtractionCommitsCursorAndState: first.updateCadence?.extractionCount === 1 && firstState.status === "completed" && firstState.completed === 1 && first.extractionTransaction?.status === "completed",
    successfulExtractionReleasesHotLease: firstLease.present === false,
    concurrentExtractionFailsBusyWithoutCommit: holder.acquired === true && busyResult.status === "lease_busy" && afterBusy.markdownChecksum === first.markdownChecksum && afterBusy.updateCadence?.extractionCount === 1,
    injectedFailureDoesNotAdvanceCursor: failedResult.status === "failed" && afterFailure.markdownChecksum === first.markdownChecksum && afterFailure.updateCadence?.tokensAtLastExtraction === 10000 && afterFailure.updateCadence?.extractionCount === 1,
    failureIsDurablyAudited: failedState.status === "failed" && failedState.failed === 1 && failedState.lastError.includes("injected_session_memory_extraction_failure_before_commit") && failedRow?.extractionFailed === true && failedRow?.status === "warn",
    failedExtractionCanRetry: retryDue.shouldExtract === true && afterRetry.updateCadence?.extractionCount === 2 && afterRetry.updateCadence?.tokensAtLastExtraction === 15000 && retryState.status === "completed" && retryState.completed === 2,
    deadOwnerLeaseIsDetectedStale: staleHandle.acquired === true && staleInspection.stale === true && staleInspection.active === false,
    staleLeaseRecoveryUsesHigherFence: afterRecovery.updateCadence?.extractionCount === 3 && afterRecovery.extractionTransaction?.recovered === true && recoveredState.recovered >= 1 && recoveredState.lastFencingToken > retryState.lastFencingToken,
    waitApiTimesOutOnActiveExtraction: waitHolder.acquired === true && waitResult.timedOut === true && waitResult.completed === false,
    finalFleetShowsRecoveredHealthyState: finalRow?.status === "warn" && finalRow?.modelExtractionPending === true && finalRow?.extractionStatus === "completed" && finalRow?.extractionRecoveredCount >= 1 && finalReport.overall?.staleExtractionCount === 0 && finalReport.overall?.activeExtractionCount === 0,
    noLegacyDefaultScopeCreated: finalReport.overall?.legacyDefaultSessionCount === 0 && !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, firstState, busyResult, afterBusy, afterFailure, failedState, failedRow, afterRetry, retryState, staleInspection, afterRecovery, recoveredState, waitResult, finalRow }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, extractionState: recoveredState, fleet: finalReport.overall }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
}
