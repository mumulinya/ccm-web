import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase278-model-typed-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_typed_a`;
const sessionB = `gcs_${Date.now().toString(36)}_typed_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const oldRule = "必须长期使用 PHASE278_OLD_SESSION_RULE";
const newRule = "必须长期使用 PHASE278_NEW_SESSION_RULE";
const failedTypedRule = "必须长期启用 PHASE278_FAILURE_SNAPSHOT_RULE";

function renderMarkdown(extraLines = []) {
  const populated = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
    .split("\n")
    .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE278_BASE_${index}` : line)
    .join("\n");
  const marker = "_What did the user ask to build? Any design decisions or other explanatory context_";
  return populated.replace(marker, `${marker}\n${extraLines.map(line => `- ${line}`).join("\n")}`).trim();
}

function output(markdown) {
  return `<session_memory>\n${markdown}\n</session_memory>`;
}

function cleanup(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
}

try {
  const firstMarkdown = renderMarkdown([
    oldRule,
    "TODO PHASE278_EPHEMERAL_NEXT_STEP",
    "Inspect `PHASE278_DERIVABLE_SYMBOL` in C:/phase278/derivable/source.ts",
  ]);
  const firstMessages = [
    { id: "phase278-user-rule", role: "user", content: `${oldRule}。`, group_session_id: sessionA },
    { id: "phase278-assistant-ack", role: "assistant", content: "已记录当前会话规则。", group_session_id: sessionA },
  ];
  storage.saveGroupMessages(groupId, firstMessages, sessionA);
  storage.saveGroupMessages(groupId, [{ id: "phase278-b", role: "user", content: "PHASE278_SESSION_B_ONLY", group_session_id: sessionB }], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async () => ({ output: output(firstMarkdown), project: "phase278-stub", agentType: "codex" }),
  });
  const firstRecall = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE278_OLD_SESSION_RULE", { max: 8 });
  const isolatedRecall = typed.buildGroupTypedMemoryRecall(scopeB, "PHASE278_OLD_SESSION_RULE", { max: 8 });

  const correction = {
    id: "phase278-user-correction",
    role: "user",
    content: `用户更正：${oldRule} 不再适用，改为 ${newRule}。`,
    group_session_id: sessionA,
  };
  storage.saveGroupMessages(groupId, [...firstMessages, correction], sessionA);
  const secondMarkdown = renderMarkdown([
    newRule,
    "TODO PHASE278_EPHEMERAL_NEXT_STEP",
    "Inspect `PHASE278_DERIVABLE_SYMBOL` in C:/phase278/derivable/source.ts",
  ]);
  const second = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => ({ output: output(secondMarkdown), project: "phase278-stub", agentType: "codex" }),
  });
  const secondReceipt = second.value?.receipt;
  const secondGraph = secondReceipt?.factSupersessionGraph;
  const duplicate = typed.distillGroupSessionModelExtractionToTypedMemory(scopeA, {
    receipt: secondReceipt,
    factSupersessionGraph: secondGraph,
    transcript: second.requestArtifact?.artifact?.transcript,
    markdown: secondMarkdown,
    requestArtifact: second.requestArtifact,
    extractionFencingToken: secondReceipt?.fencingToken,
  });
  const tamperedReceipt = { ...secondReceipt, scopeId: scopeB };
  assert.throws(() => typed.distillGroupSessionModelExtractionToTypedMemory(scopeA, {
    receipt: tamperedReceipt,
    factSupersessionGraph: secondGraph,
    transcript: second.requestArtifact?.artifact?.transcript,
    markdown: secondMarkdown,
    requestArtifact: second.requestArtifact,
  }), /receipt_invalid|scope_or_fence_invalid/);

  const ledgerAfterSecond = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const archiveAfterSecond = ledgerAfterSecond.modelExtractionTypedMemoryArchive;
  const activeAfterSecond = Object.values(archiveAfterSecond?.facts || {}).filter(fact => fact.status === "active");
  const supersededAfterSecond = Object.values(archiveAfterSecond?.facts || {}).filter(fact => fact.status === "superseded");
  const recallAfterSecond = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE278_NEW_SESSION_RULE", { max: 8 });
  const oldRecallAfterSecond = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE278_OLD_SESSION_RULE", { max: 8 });

  const failureMessage = { id: "phase278-failure-rule", role: "user", content: `${failedTypedRule}。`, group_session_id: sessionA };
  storage.saveGroupMessages(groupId, [...firstMessages, correction, failureMessage], sessionA);
  const failureMarkdown = renderMarkdown([
    newRule,
    failedTypedRule,
    "TODO PHASE278_EPHEMERAL_NEXT_STEP",
    "Inspect `PHASE278_DERIVABLE_SYMBOL` in C:/phase278/derivable/source.ts",
  ]);
  const snapshotBeforeFailure = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const typedFailure = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    __modelExtractionTypedMemoryFailAfterSnapshot: true,
    executor: async () => ({ output: output(failureMarkdown), project: "phase278-stub", agentType: "codex" }),
  });
  const snapshotAfterFailure = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const ledgerAfterFailure = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const row = report.groups?.[0] || {};

  const checks = {
    durableConstraintCommitted: first.committed === true
      && first.typedMemoryCommit?.committed === true
      && first.typedMemoryCommit?.admittedCount >= 1
      && JSON.stringify(firstRecall.recalled || []).includes("PHASE278_OLD_SESSION_RULE"),
    exactSessionIsolation: !JSON.stringify(isolatedRecall).includes("PHASE278_OLD_SESSION_RULE")
      && !fs.existsSync(path.join(typed.getGroupTypedMemoryDir(scopeB), "model-extracted-user-constraints.md")),
    unsupportedFactsRejected: second.typedMemoryCommit?.rejectedCount >= 2
      && JSON.stringify(second.typedMemoryCommit?.rejections || []).includes("ephemeral_or_derivable_fact_shape"),
    receiptScopeTamperingFailsClosed: true,
    duplicateExtractionDoesNotDuplicateFact: duplicate.committed === true
      && duplicate.duplicateCount >= 1
      && activeAfterSecond.filter(fact => fact.text.includes("PHASE278_NEW_SESSION_RULE")).length === 1,
    supersessionStopsOldRecall: second.typedMemoryCommit?.supersededCount >= 1
      && supersededAfterSecond.some(fact => fact.text.includes("PHASE278_OLD_SESSION_RULE"))
      && activeAfterSecond.some(fact => fact.text.includes("PHASE278_NEW_SESSION_RULE"))
      && JSON.stringify(recallAfterSecond.recalled || []).includes("PHASE278_NEW_SESSION_RULE")
      && !JSON.stringify(oldRecallAfterSecond.recalled || []).includes("PHASE278_OLD_SESSION_RULE"),
    typedFailurePreservesCommittedSnapshot: typedFailure.committed === true
      && typedFailure.typedMemoryCommit?.status === "failed_retriable"
      && snapshotAfterFailure.markdownChecksum !== snapshotBeforeFailure.markdownChecksum
      && snapshotAfterFailure.markdownExcerpt.includes("PHASE278_FAILURE_SNAPSHOT_RULE")
      && !JSON.stringify(ledgerAfterFailure.modelExtractionTypedMemoryArchive || {}).includes("PHASE278_FAILURE_SNAPSHOT_RULE"),
    memoryCenterShowsAdmissionMetadata: row.modelExtractionTypedMemoryArchivePresent === true
      && row.modelExtractionTypedMemoryArchiveValid === true
      && row.modelExtractionTypedMemoryActiveFactCount >= 1
      && row.modelExtractionTypedMemorySupersededFactCount >= 1,
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, second, duplicate, archiveAfterSecond, typedFailure, row }, null, 2));
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanup(sessionA);
  cleanup(sessionB);
}
