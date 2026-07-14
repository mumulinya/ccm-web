import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase277-distillation-preflight-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `group-phase277-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_phase277_${process.pid}_${Date.now().toString(36)}`;
const otherSessionId = `gcs_phase277_other_${process.pid}`;
const scopeId = `${groupId}--${sessionId}`;
const otherScopeId = `${groupId}--${otherSessionId}`;
const messages = [
  { id: "phase277-user-1", role: "user", content: "请记住：PHASE277_PREFLIGHT_SENTINEL 是本会话长期验收要求。" },
  { id: "phase277-assistant-1", role: "assistant", content: "已确认长期保留 PHASE277_PREFLIGHT_SENTINEL。" },
];

function mtime(file) {
  return fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
}

try {
  const first = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeId, messages, {}, { reason: "phase277-first" });
  const transactionStateFile = typed.getGroupTypedMemoryDistillationTransactionStateFile(scopeId);
  const stateMtimeAfterFirst = mtime(transactionStateFile);
  const probe = typed.inspectGroupTypedMemoryDistillationWork(scopeId, messages);
  const second = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeId, messages, {}, { reason: "phase277-no-change" });
  const stateMtimeAfterSecond = mtime(transactionStateFile);

  const extendedMessages = [
    ...messages,
    { id: "phase277-user-2", role: "user", content: "另外必须长期保留 PHASE277_NEW_MESSAGE_SENTINEL。" },
  ];
  const pendingProbe = typed.inspectGroupTypedMemoryDistillationWork(scopeId, extendedMessages);
  const third = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeId, extendedMessages, {}, { reason: "phase277-new-message" });
  const stateMtimeAfterThird = mtime(transactionStateFile);
  const recall = typed.buildGroupTypedMemoryRecall(scopeId, "PHASE277_NEW_MESSAGE_SENTINEL", { max: 5 });

  const otherProbe = typed.inspectGroupTypedMemoryDistillationWork(otherScopeId, []);
  const otherSkip = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(otherScopeId, [], {}, { reason: "phase277-other-empty" });
  const otherStateFile = typed.getGroupTypedMemoryDistillationTransactionStateFile(otherScopeId);

  const forcedProbe = typed.inspectGroupTypedMemoryDistillationWork(scopeId, extendedMessages, { forceDistillationRescan: true });
  const forced = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeId, extendedMessages, {}, {
    reason: "phase277-force-rescan",
    forceDistillationRescan: true,
  });
  storage.saveGroupMessages(groupId, extendedMessages, sessionId);
  const centerDiagnostics = center.buildGroupPostCompactUsageDiagnostics(groupId, { groupSessionId: sessionId }, sessionId);

  const checks = {
    initialRunCommitsThroughTransaction: first.skipped === false
      && first.transaction?.status === "completed"
      && first.transaction?.committed === true
      && stateMtimeAfterFirst > 0,
    caughtUpProbeSkipsBeforeLock: probe.runRequired === false
      && probe.reason === "no_new_messages_after_committed_cursor"
      && probe.lockRequired === false
      && probe.pendingMessageCount === 0,
    caughtUpDistillationIsZeroWrite: second.skipped === true
      && second.reason === "no_new_messages_after_committed_cursor"
      && second.transaction?.status === "preflight_skipped"
      && second.transaction?.lockAcquired === false
      && second.writeCount === 0,
    caughtUpSkipDoesNotTouchTransactionState: stateMtimeAfterSecond === stateMtimeAfterFirst,
    newMessageReopensGate: pendingProbe.runRequired === true
      && pendingProbe.pendingMessageCount === 1
      && third.skipped === false
      && third.preflight?.lockAcquired === true
      && third.transaction?.status === "completed"
      && stateMtimeAfterThird >= stateMtimeAfterSecond,
    newMessageBecomesRecallable: recall.recalled.some(row => row.body.includes("PHASE277_NEW_MESSAGE_SENTINEL")),
    emptyOtherSessionNeverCreatesTransactionState: otherProbe.runRequired === false
      && otherSkip.transaction?.status === "preflight_skipped"
      && !fs.existsSync(otherStateFile),
    forceRescanStillAcquiresTransaction: forcedProbe.runRequired === true
      && forcedProbe.forceRescan === true
      && forced.transaction?.status === "completed",
    memoryCenterShowsCurrentSessionPreflight: centerDiagnostics.groupSessionId === sessionId
      && centerDiagnostics.typedMemory?.distillationPreflight?.runRequired === false
      && centerDiagnostics.typedMemory?.distillationPreflight?.pendingMessageCount === 0
      && centerDiagnostics.typedMemory?.distillationPreflight?.lockRequired === false,
    terminalJournalDoesNotCountAsRecoveryWork: (() => {
      const artifact = typed.inspectGroupTypedMemoryArtifactTransaction(scopeId);
      return artifact.present === true
        && artifact.valid === true
        && artifact.journal?.status === "committed"
        && !fs.existsSync(typed.getGroupTypedMemoryDistillationLockFile(scopeId))
        && !fs.existsSync(typed.getGroupTypedMemoryArtifactTransactionStageRoot(scopeId));
    })(),
  };
  if (!Object.values(checks).every(Boolean)) {
    process.stderr.write(`${JSON.stringify({
      checks,
      probe,
      secondTransaction: second.transaction,
      pendingProbe,
      forcedTransaction: forced.transaction,
      residuals: {
        lock: fs.existsSync(typed.getGroupTypedMemoryDistillationLockFile(scopeId)),
        journal: fs.existsSync(typed.getGroupTypedMemoryArtifactTransactionJournalFile(scopeId)),
        stage: fs.existsSync(typed.getGroupTypedMemoryArtifactTransactionStageRoot(scopeId)),
      },
    }, null, 2)}\n`);
  }
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase277-group-typed-memory-distillation-preflight-selftest-v1",
    scopeId,
    checks,
    caughtUpPreflight: probe,
    pendingPreflight: pendingProbe,
  }, null, 2)}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
