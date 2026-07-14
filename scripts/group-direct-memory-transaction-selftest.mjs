import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase270-direct-memory-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;
const scopeA = `group-phase270-${nonce}--gcs_phase270_a_${nonce}`;
const scopeB = `group-phase270-${nonce}--gcs_phase270_b_${nonce}`;

function directMessage(scope, id, action, content, overrides = {}) {
  const memoryAction = typed.buildGroupDirectMemoryAction(scope, {
    action,
    messageId: id,
    content,
    ...overrides,
  });
  return {
    id,
    role: "user",
    content,
    timestamp: new Date().toISOString(),
    memory_direct_action: memoryAction,
  };
}

function allFacts(ledger) {
  return Object.values(ledger.facts || {}).flatMap(bucket => Object.values(bucket || {}));
}

function receipt(ledger, requestId) {
  return (ledger.directMemory?.receipts || []).find(row => row.requestId === requestId);
}

try {
  const textOne = "所有后续支付回调都必须先验证签名，再检查幂等键。";
  const rememberOne = directMessage(scopeA, "p270-a1", "remember", textOne);
  const first = typed.commitGroupDirectMemoryAction(scopeA, [rememberOne], {
    requestId: rememberOne.memory_direct_action.requestId,
  });
  assert.equal(first.committed, true);
  assert.equal(first.receipt.status, "committed");
  assert.match(first.receipt.memoryId, /^gmem_/);

  const duplicate = directMessage(scopeA, "p270-a2", "remember", textOne);
  typed.commitGroupDirectMemoryAction(scopeA, [rememberOne, duplicate], {
    requestId: duplicate.memory_direct_action.requestId,
  });
  let ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(receipt(ledgerA, duplicate.memory_direct_action.requestId).status, "duplicate");
  assert.equal(allFacts(ledgerA).filter(fact => fact.text === textOne).length, 1);

  const textTwo = "支付模块的长期验收规则要求保留原始审计编号。";
  const textThree = "支付模块的长期验收规则要求失败时保留完整错误码。";
  const rememberTwo = directMessage(scopeA, "p270-a3", "remember", textTwo);
  const rememberThree = directMessage(scopeA, "p270-a4", "remember", textThree);
  typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeA, [rememberOne, duplicate, rememberTwo, rememberThree], {}, { maxCatchUpBatches: 32 });
  ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  const memoryOneId = allFacts(ledgerA).find(fact => fact.text === textOne).memoryId;

  const ambiguousForget = directMessage(scopeA, "p270-a5", "forget", "支付模块的长期验收规则");
  typed.distillGroupMessagesToTypedMemoryUntilCaughtUp(scopeA, [rememberOne, duplicate, rememberTwo, rememberThree, ambiguousForget], {}, { maxCatchUpBatches: 32 });
  ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(receipt(ledgerA, ambiguousForget.memory_direct_action.requestId).reason, "forget_target_ambiguous");
  assert.equal(allFacts(ledgerA).some(fact => fact.text === textTwo), true);
  assert.equal(allFacts(ledgerA).some(fact => fact.text === textThree), true);

  const uniqueForget = directMessage(scopeA, "p270-a6", "forget", memoryOneId, { targetMemoryId: memoryOneId });
  const allMessages = [rememberOne, duplicate, rememberTwo, rememberThree, ambiguousForget, uniqueForget];
  typed.commitGroupDirectMemoryAction(scopeA, allMessages, { requestId: uniqueForget.memory_direct_action.requestId });
  ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(receipt(ledgerA, uniqueForget.memory_direct_action.requestId).status, "committed");
  assert.equal(allFacts(ledgerA).some(fact => fact.text === textOne), false);
  assert.ok(ledgerA.directMemory.tombstones.some(row => row.memoryId === memoryOneId));

  typed.distillGroupMessagesToTypedMemory(scopeA, allMessages, {}, { forceDistillationRescan: true, reason: "phase270-replay" });
  ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
  assert.equal(allFacts(ledgerA).some(fact => fact.text === textOne), false);

  const crossScopeForget = directMessage(scopeB, "p270-b1", "forget", memoryOneId, { targetMemoryId: memoryOneId });
  typed.commitGroupDirectMemoryAction(scopeB, [crossScopeForget], { requestId: crossScopeForget.memory_direct_action.requestId });
  const ledgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
  assert.equal(receipt(ledgerB, crossScopeForget.memory_direct_action.requestId).reason, "forget_target_not_found");
  assert.equal(JSON.stringify(ledgerB).includes(textTwo), false);

  const tampered = directMessage(scopeB, "p270-b2", "remember", "篡改请求不得写入。", {});
  tampered.memory_direct_action.requestChecksum = "0".repeat(64);
  typed.distillGroupMessagesToTypedMemory(scopeB, [crossScopeForget, tampered], {}, { reason: "phase270-tamper" });
  const ledgerBAfterTamper = typed.readGroupTypedMemoryDistillationLedger(scopeB);
  assert.equal(receipt(ledgerBAfterTamper, tampered.memory_direct_action.requestId).reason, "direct_memory_request_checksum_mismatch");
  assert.equal(allFacts(ledgerBAfterTamper).some(fact => fact.text === "篡改请求不得写入。"), false);

  const indexText = fs.readFileSync(typed.getGroupTypedMemoryIndexFile(scopeA), "utf8");
  const userDoc = fs.readFileSync(path.join(typed.getGroupTypedMemoryDir(scopeA), "distilled-log-user-requirements.md"), "utf8");
  assert.equal(indexText.includes("distilled-log-user-requirements.md"), true);
  assert.equal(userDoc.includes(textOne), false);
  assert.equal(userDoc.includes(textTwo), true);

  const promptRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes: model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE,
    existingMemoryManifest: indexText,
    messages: [{ id: "prompt-1", role: "user", content: "普通会话增量" }],
  });
  assert.equal(promptRequest.prompt.includes("<existing_typed_memory_manifest>"), true);
  assert.equal(promptRequest.prompt.includes("distilled-log-user-requirements.md"), true);
  assert.equal(promptRequest.audit.existingMemoryManifestChars > 0, true);
  assert.equal(promptRequest.replayMaterial.existingMemoryManifest, indexText.trim().slice(0, 12_000));

  const checks = {
    explicitRememberCommitsCurrentScope: first.receipt.status === "committed" && first.receipt.memoryId.startsWith("gmem_"),
    duplicateRememberReusesStableFact: allFacts(ledgerA).filter(fact => fact.text === textOne).length === 0
      && receipt(ledgerA, duplicate.memory_direct_action.requestId).status === "duplicate",
    ambiguousForgetDoesNotGuess: receipt(ledgerA, ambiguousForget.memory_direct_action.requestId).reason === "forget_target_ambiguous",
    uniqueForgetCreatesTombstone: ledgerA.directMemory.tombstones.some(row => row.memoryId === memoryOneId),
    forcedRescanDoesNotResurrectForgottenMemory: !allFacts(ledgerA).some(fact => fact.text === textOne),
    crossSessionForgetCannotReachOtherScope: receipt(ledgerB, crossScopeForget.memory_direct_action.requestId).reason === "forget_target_not_found",
    tamperedDirectRequestRejected: receipt(ledgerBAfterTamper, tampered.memory_direct_action.requestId).reason === "direct_memory_request_checksum_mismatch",
    memoryDocumentAndIndexRemainConsistent: indexText.includes("distilled-log-user-requirements.md") && !userDoc.includes(textOne) && userDoc.includes(textTwo),
    modelExtractionReceivesBoundedExistingManifest: promptRequest.prompt.includes("<existing_typed_memory_manifest>")
      && promptRequest.audit.existingMemoryManifestChars > 0,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase270-direct-memory-transaction-selftest-v1", checks }, null, 2)}\n`);
} finally {
  for (const scope of [scopeA, scopeB]) {
    try { fs.rmSync(typed.getGroupTypedMemoryDir(scope), { recursive: true, force: true }); } catch {}
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
