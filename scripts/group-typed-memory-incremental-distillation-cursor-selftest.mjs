import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase269-distillation-cursor-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const scopeA = `group-phase269-a-${nonce}--gcs_phase269_a_${nonce}`;
const scopeB = `group-phase269-b-${nonce}--gcs_phase269_b_${nonce}`;
const scopeMissing = `group-phase269-missing-${nonce}--gcs_phase269_missing_${nonce}`;
const scopeFailure = `group-phase269-failure-${nonce}--gcs_phase269_failure_${nonce}`;
const scopeCatchUp = `group-phase269-catchup-${nonce}--gcs_phase269_catchup_${nonce}`;

const messages = [
  { id: "p269-m1", role: "user", content: "必须长期记住 PHASE269_INCREMENTAL_A：支付回调不能跳过验签。" },
  { id: "p269-m2", role: "assistant", agent: "api", status: "done", content: "本轮普通活动已经完成。" },
  {
    id: "p269-m3",
    role: "assistant",
    agent: "coordinator",
    content: "未来支付回调采用稳定幂等键策略，因为历史重复回调会造成重复入账。",
    memoryAdmission: {
      nonObvious: true,
      futureApplicable: true,
      why: "重复回调曾造成重复入账。",
      howToApply: "后续支付回调先检查幂等键并核验当前实现。",
    },
  },
  { id: "p269-m4", role: "user", content: "不要再使用进程内时间做签名测试，必须改为可控时钟。" },
  { id: "p269-m5", role: "assistant", agent: "coordinator", content: "Grafana https://grafana.internal/d/payments 用于排查支付回调延迟。" },
];
const originalMessages = JSON.stringify(messages);

function allFacts(ledger) {
  return Object.values(ledger.facts || {}).flatMap(bucket => Object.values(bucket || {}));
}

function cleanup(scope) {
  try { fs.rmSync(typed.getGroupTypedMemoryDir(scope), { recursive: true, force: true }); } catch {}
}

try {
  const first = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase269-batch-1", maxMessages: 2 });
  const afterFirst = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(first.cursor.lastCommittedMessageId, "p269-m2");
  assert.equal(first.cursor.remainingMessageCount, 3);
  assert.equal(afterFirst.cumulativeProcessedMessageCount, 2);

  const second = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase269-batch-2", maxMessages: 2 });
  assert.equal(second.cursor.previousCommittedMessageId, "p269-m2");
  assert.equal(second.cursor.lastCommittedMessageId, "p269-m4");
  assert.equal(second.cursor.remainingMessageCount, 1);

  const third = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase269-batch-3", maxMessages: 2 });
  assert.equal(third.cursor.lastCommittedMessageId, "p269-m5");
  assert.equal(third.cursor.remainingMessageCount, 0);

  const noChange = typed.distillGroupMessagesToTypedMemory(scopeA, messages, {}, { reason: "phase269-no-change", maxMessages: 2 });
  assert.equal(noChange.skipped, true);
  assert.equal(noChange.reason, "no_new_messages_after_committed_cursor");
  assert.equal(noChange.sourceMessageCount, 0);
  assert.equal(noChange.writeCount, 0);

  const appended = [...messages, { id: "p269-m6", role: "user", content: "必须长期记住 PHASE269_INCREMENTAL_APPEND：新会话只读取自己的群会话记忆。" }];
  const appendRun = typed.distillGroupMessagesToTypedMemory(scopeA, appended, {}, { reason: "phase269-append", maxMessages: 2 });
  const afterAppend = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.deepEqual(appendRun.cursor.previousCommittedMessageId, "p269-m5");
  assert.equal(appendRun.sourceMessageCount, 1);
  assert.equal(appendRun.cursor.lastCommittedMessageId, "p269-m6");
  assert.equal(afterAppend.cumulativeProcessedMessageCount, 6);

  const forced = typed.distillGroupMessagesToTypedMemory(scopeA, appended, {}, {
    reason: "phase269-forced-retry",
    forceDistillationRescan: true,
  });
  const afterForced = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const factCounts = allFacts(afterForced).map(fact => Number(fact.count || 0));
  const rejectedObservationCounts = (afterForced.admission?.observations || []).map(row => Number(row.count || 0));
  assert.equal(forced.cursor.forceRescan, true);
  assert.equal(factCounts.every(count => count === 1), true);
  assert.equal(rejectedObservationCounts.every(count => count === 1), true);

  const legacyInflated = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  delete legacyInflated.file;
  const firstFact = allFacts(legacyInflated)[0];
  firstFact.count = 9;
  if (legacyInflated.admission?.observations?.[0]) legacyInflated.admission.observations[0].count = 7;
  fs.writeFileSync(typed.getGroupTypedMemoryDistillationLedgerFile(scopeA), `${JSON.stringify(legacyInflated, null, 2)}\n`, "utf8");
  const repairedInflation = typed.distillGroupMessagesToTypedMemory(scopeA, appended, {}, { reason: "phase269-repair-inflated-history" });
  const afterInflationRepair = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(allFacts(afterInflationRepair).every(fact => Number(fact.count || 0) === 1), true);
  assert.equal((afterInflationRepair.admission?.observations || []).every(row => Number(row.count || 0) === 1), true);
  assert.ok(repairedInflation.duplicateInflationRepair.repairedFactCount >= 1);
  assert.ok(repairedInflation.duplicateInflationRepair.repairedAdmissionObservationCount >= 1);

  typed.distillGroupMessagesToTypedMemory(scopeB, [
    { id: "p269-b1", role: "user", content: "必须长期记住 PHASE269_SESSION_B_ONLY：B 会话始终使用独立的验收清单。" },
  ], {}, { reason: "phase269-scope-b" });
  const scopeBText = JSON.stringify(typed.readGroupTypedMemoryDistillationLedger(scopeB));
  assert.equal(scopeBText.includes("PHASE269_SESSION_B_ONLY"), true);
  assert.equal(scopeBText.includes("PHASE269_INCREMENTAL_A"), false);

  typed.distillGroupMessagesToTypedMemory(scopeMissing, messages.slice(0, 2), {}, { reason: "phase269-missing-seed" });
  const recoveredMissing = typed.distillGroupMessagesToTypedMemory(scopeMissing, messages.slice(2, 5), {}, { reason: "phase269-missing-recovery" });
  assert.equal(recoveredMissing.cursor.cursorMissingFallback, true);
  assert.equal(recoveredMissing.sourceMessageCount, 3);
  assert.equal(recoveredMissing.cursor.lastCommittedMessageId, "p269-m5");

  const failureLedgerFile = typed.getGroupTypedMemoryDistillationLedgerFile(scopeFailure);
  fs.mkdirSync(failureLedgerFile, { recursive: true });
  assert.throws(() => typed.distillGroupMessagesToTypedMemory(scopeFailure, [messages[0]], {}, { reason: "phase269-write-failure" }));
  fs.rmSync(failureLedgerFile, { recursive: true, force: true });
  const afterFailure = typed.readGroupTypedMemoryDistillationLedger(scopeFailure);
  assert.equal(afterFailure.lastDistilledMessageId || "", "");
  assert.equal(afterFailure.distillationCursor || null, null);
  const recoveredWrite = typed.distillGroupMessagesToTypedMemory(scopeFailure, [messages[0]], {}, { reason: "phase269-write-retry" });
  assert.equal(recoveredWrite.cursor.lastCommittedMessageId, "p269-m1");

  const caughtUp = typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeCatchUp, messages, {}, {
    reason: "phase269-context-bundle-catch-up",
    maxMessages: 2,
    maxCatchUpBatches: 4,
  });
  const catchUpLedger = typed.readGroupTypedMemoryDistillationLedger(scopeCatchUp);
  assert.equal(caughtUp.catchUp.batchCount, 3);
  assert.equal(caughtUp.catchUp.complete, true);
  assert.equal(caughtUp.catchUp.remainingMessageCount, 0);
  assert.equal(caughtUp.sourceMessageCount, 5);
  assert.equal(catchUpLedger.lastDistilledMessageId, "p269-m5");

  const checks = {
    oldestPendingBatchProcessedFirst: first.cursor.lastCommittedMessageId === "p269-m2" && first.cursor.remainingMessageCount === 3,
    backlogAdvancesWithoutLoss: second.cursor.lastCommittedMessageId === "p269-m4" && third.cursor.lastCommittedMessageId === "p269-m5",
    identicalInputIsNoOp: noChange.skipped === true && noChange.writeCount === 0,
    appendedDeltaOnly: appendRun.sourceMessageCount === 1 && appendRun.cursor.previousCommittedMessageId === "p269-m5",
    cumulativeCursorAccounting: afterAppend.cumulativeProcessedMessageCount === 6,
    forcedRetryDoesNotInflateFacts: factCounts.length > 0 && factCounts.every(count => count === 1),
    forcedRetryDoesNotInflateRejections: rejectedObservationCounts.length > 0 && rejectedObservationCounts.every(count => count === 1),
    legacyDuplicateInflationRepaired: repairedInflation.duplicateInflationRepair.repairedFactCount >= 1
      && repairedInflation.duplicateInflationRepair.repairedAdmissionObservationCount >= 1
      && allFacts(afterInflationRepair).every(fact => Number(fact.count || 0) === 1),
    missingCursorFallsBackToAvailableTranscript: recoveredMissing.cursor.cursorMissingFallback === true && recoveredMissing.sourceMessageCount === 3,
    failedDurableCommitDoesNotAdvanceCursor: !afterFailure.lastDistilledMessageId && recoveredWrite.cursor.lastCommittedMessageId === "p269-m1",
    boundedCatchUpReachesLatestMessageBeforeRecall: caughtUp.catchUp.complete === true
      && caughtUp.catchUp.batchCount === 3
      && catchUpLedger.lastDistilledMessageId === "p269-m5",
    groupSessionCursorsStayIsolated: scopeBText.includes("PHASE269_SESSION_B_ONLY") && !scopeBText.includes("PHASE269_INCREMENTAL_A"),
    rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase269-incremental-distillation-cursor-selftest-v1", checks }, null, 2)}\n`);
} finally {
  for (const scope of [scopeA, scopeB, scopeMissing, scopeFailure, scopeCatchUp]) cleanup(scope);
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
