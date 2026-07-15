import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase292-hook-session-isolation-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase292-hook-session-${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const ok = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };

function transcript(sessionId, sentinel) {
  return Array.from({ length: 18 }, (_, index) => ({
    id: `${sessionId}-${index}`,
    group_session_id: sessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    agent: index % 2 === 0 ? undefined : "api",
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0
      ? `只属于 ${sessionId} 的压缩约束 ${sentinel}，不得进入同群聊其他会话。`
      : `${sentinel} 压缩阶段 ${index} src/${sessionId}-${index}.ts ${"上下文".repeat(180)}`,
  }));
}

try {
  const sessionA = storage.createGroupChatSession(groupId, "Phase 292 A");
  const sessionB = storage.createGroupChatSession(groupId, "Phase 292 B");
  storage.saveGroupMessages(groupId, transcript(sessionA.id, "PHASE292_SESSION_A_ONLY"), sessionA.id);
  storage.saveGroupMessages(groupId, transcript(sessionB.id, "PHASE292_SESSION_B_ONLY"), sessionB.id);

  const resultA = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionA.id,
    force: true,
    rebuild: true,
    reason: "phase292-session-a",
    config: { memoryCompactionUseModel: false, minKeepMessages: 4, minKeepTokens: 1 },
  });
  const resultB = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionB.id,
    force: true,
    rebuild: true,
    reason: "phase292-session-b",
    config: { memoryCompactionUseModel: false, minKeepMessages: 4, minKeepTokens: 1 },
  });

  const fileA = compaction.getGroupMemoryCompactionHookLedgerFile(groupId, sessionA.id);
  const fileB = compaction.getGroupMemoryCompactionHookLedgerFile(groupId, sessionB.id);
  const ledgerA = compaction.readGroupMemoryCompactionHookLedger(groupId, sessionA.id);
  const ledgerB = compaction.readGroupMemoryCompactionHookLedger(groupId, sessionB.id);
  const legacy = compaction.readGroupMemoryCompactionHookLedger(groupId, "default");
  const memoryA = memory.loadGroupMemory(groupId, sessionA.id);
  const memoryB = memory.loadGroupMemory(groupId, sessionB.id);
  const receiptA = memoryA.compaction?.compactTransactionReceipt || {};
  const receiptB = memoryB.compaction?.compactTransactionReceipt || {};
  const diagnosticsA = center.buildGroupPostCompactUsageDiagnostics(groupId, memoryA, sessionA.id);
  const diagnosticsB = center.buildGroupPostCompactUsageDiagnostics(groupId, memoryB, sessionB.id);

  ok(resultA.success === true && resultA.compacted === true && resultB.success === true && resultB.compacted === true, "both exact sessions should compact");
  ok(fileA !== fileB && fileA.endsWith(`${sessionA.id}.json`) && fileB.endsWith(`${sessionB.id}.json`), "hook ledger files should be session scoped");
  ok(fs.existsSync(fileA) && fs.existsSync(fileB), "both hook ledger files should exist");
  equal(ledgerA.schema, "ccm-group-memory-compaction-hook-ledger-v2", "session A should use ledger v2");
  ok(ledgerA.scopeValid === true && ledgerB.scopeValid === true, "both ledger envelopes should validate");
  equal(ledgerA.scopeId, `${groupId}::${sessionA.id}`, "session A scope should be exact");
  equal(ledgerB.scopeId, `${groupId}::${sessionB.id}`, "session B scope should be exact");
  ok(ledgerA.entries.length >= 2 && ledgerA.entries.every(entry => entry.group_session_id === sessionA.id), "session A entries should stay in A");
  ok(ledgerB.entries.length >= 2 && ledgerB.entries.every(entry => entry.group_session_id === sessionB.id), "session B entries should stay in B");
  ok(!JSON.stringify(ledgerA).includes(sessionB.id) && !JSON.stringify(ledgerB).includes(sessionA.id), "serialized ledgers should not expose the sibling session");
  ok(legacy.scopeValid === false && legacy.entries.length === 0 && legacy.file === "", "legacy default reads should fail closed");
  ok(compaction.verifyGroupCompactTransactionReceipt(receiptA, { groupId, groupSessionId: sessionA.id }).valid === true, "session A receipt should bind A");
  ok(compaction.verifyGroupCompactTransactionReceipt(receiptB, { groupId, groupSessionId: sessionB.id }).valid === true, "session B receipt should bind B");
  ok(receiptA.schema === "ccm-group-memory-compact-transaction-receipt-v3" && receiptB.schema === receiptA.schema, "new receipts should bind exact-session cleanup audit v3");
  ok(receiptA.cleanup_audit_checksum === memoryA.compaction?.postCompactCleanupAudit?.audit_checksum, "session A receipt should bind cleanup audit checksum");
  ok(receiptB.cleanup_audit_checksum === memoryB.compaction?.postCompactCleanupAudit?.audit_checksum, "session B receipt should bind cleanup audit checksum");
  ok(receiptA.receipt_id !== receiptB.receipt_id && receiptA.compact_epoch !== receiptB.compact_epoch, "sibling sessions should have distinct receipt and compact epoch identities");
  const legacyReceipt = { ...receiptA, schema: "ccm-group-memory-compact-transaction-receipt-v1", version: 1 };
  legacyReceipt.receipt_id = `gctr_${crypto.createHash("sha256").update(`${legacyReceipt.group_id}\0${legacyReceipt.boundary_id}\0${legacyReceipt.hook_run_id}\0${legacyReceipt.committed_at}`).digest("hex").slice(0, 24)}`;
  delete legacyReceipt.receipt_checksum;
  legacyReceipt.receipt_checksum = crypto.createHash("sha256").update(JSON.stringify(legacyReceipt)).digest("hex");
  ok(compaction.verifyGroupCompactTransactionReceipt(legacyReceipt, { groupId, groupSessionId: sessionA.id }).valid === true, "exact-session v1 receipts should remain readable");
  equal(diagnosticsA?.compactionHooks?.scopeId, `${groupId}::${sessionA.id}`, "Memory Center A should read A hooks");
  equal(diagnosticsB?.compactionHooks?.scopeId, `${groupId}::${sessionB.id}`, "Memory Center B should read B hooks");
  ok(diagnosticsA?.compactionHooks?.scopeValid === true && diagnosticsB?.compactionHooks?.scopeValid === true, "Memory Center hook scopes should validate");
  equal(diagnosticsA?.compactionHooks?.file, fileA, "Memory Center A should expose only the A ledger file");
  equal(diagnosticsB?.compactionHooks?.file, fileB, "Memory Center B should expose only the B ledger file");

  const originalA = fs.readFileSync(fileA, "utf-8");
  const tampered = JSON.parse(originalA);
  tampered.entries.push({ ...tampered.entries[0], entry_id: "cross-session-tamper", group_session_id: sessionB.id });
  fs.writeFileSync(fileA, JSON.stringify(tampered, null, 2), "utf-8");
  const rejected = compaction.readGroupMemoryCompactionHookLedger(groupId, sessionA.id);
  ok(rejected.scopeValid === false && rejected.entries.length === 0, "mixed-session ledger should be rejected as a whole");
  ok(rejected.scopeIssues.includes("hook_ledger_mixed_session_entries") && rejected.rejectedEntryCount === 1, "mixed-session rejection should be diagnosed");
  fs.writeFileSync(fileA, originalA, "utf-8");
  fs.writeFileSync(fileA, "{not-json", "utf-8");
  const unreadable = compaction.readGroupMemoryCompactionHookLedger(groupId, sessionA.id);
  ok(unreadable.scopeValid === false && unreadable.entries.length === 0 && unreadable.scopeIssues.includes("hook_ledger_unreadable"), `unreadable ledger should fail closed: ${JSON.stringify(unreadable)}`);
  fs.writeFileSync(fileA, originalA, "utf-8");

  const legacyFile = path.join(tempRoot, ".cc-connect", "group-memory-compaction-hooks", `${groupId}.json`);
  fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
  fs.writeFileSync(legacyFile, JSON.stringify({ schema: "ccm-group-memory-compaction-hook-ledger-v1", entries: [{ group_id: groupId, secret: "LEGACY_GROUP_ONLY_MUST_BE_IGNORED" }] }), "utf-8");
  const rereadA = compaction.readGroupMemoryCompactionHookLedger(groupId, sessionA.id);
  ok(rereadA.scopeValid === true && !JSON.stringify(rereadA).includes("LEGACY_GROUP_ONLY_MUST_BE_IGNORED"), "legacy group-only ledger should not migrate into an exact session");

  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase292-compaction-hook-session-isolation-selftest-v1",
    checks,
    groupId,
    sessions: [sessionA.id, sessionB.id],
    ledgers: [fileA, fileB],
  }, null, 2)}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
