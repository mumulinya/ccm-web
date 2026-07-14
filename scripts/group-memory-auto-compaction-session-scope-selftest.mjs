import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase275-auto-compact-session-scope-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `group-phase275-${process.pid}-${Date.now().toString(36)}`;

function transcript(sessionId, sentinel) {
  return [
    {
      id: `${sessionId}-user`,
      role: "user",
      group_session_id: sessionId,
      timestamp: new Date().toISOString(),
      content: `长期必须只在当前群聊会话保留 ${sentinel}，以后每次匹配任务都应用，因为跨会话混用会造成错误。`,
      memory_admission: {
        future_applicable: true,
        requested_by_user: true,
        why: "Cross-session memory leakage would apply the wrong durable rule.",
        how_to_apply: "Apply only when the owning group session identity matches.",
      },
    },
    {
      id: `${sessionId}-assistant`,
      role: "assistant",
      group_session_id: sessionId,
      timestamp: new Date().toISOString(),
      content: `已记录 ${sentinel}。`,
    },
  ];
}

try {
  const sessionA = storage.createGroupChatSession(groupId, "Phase 275 A");
  const sessionB = storage.createGroupChatSession(groupId, "Phase 275 B");
  const scopeA = `${groupId}--${sessionA.id}`;
  const scopeB = `${groupId}--${sessionB.id}`;
  const sentinelA = "PHASE275_SESSION_A_ONLY";
  const sentinelB = "PHASE275_SESSION_B_ONLY";
  storage.saveGroupMessages(groupId, transcript(sessionA.id, sentinelA), sessionA.id);
  storage.saveGroupMessages(groupId, transcript(sessionB.id, sentinelB), sessionB.id);

  const resultA = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionA.id,
    force: true,
    rebuild: true,
    reason: "phase275-session-a",
    config: { memoryCompactionUseModel: false },
  });
  const resultB = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionB.id,
    force: true,
    rebuild: true,
    reason: "phase275-session-b",
    config: { memoryCompactionUseModel: false },
  });
  const legacyResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: "default",
    force: true,
  });
  const legacySchedule = memory.scheduleGroupMemoryAutoCompaction(groupId, { sessionId: "default", delayMs: 0 });

  const indexA = fs.readFileSync(typed.getGroupTypedMemoryIndexFile(scopeA), "utf-8");
  const indexB = fs.readFileSync(typed.getGroupTypedMemoryIndexFile(scopeB), "utf-8");
  const docsA = fs.readdirSync(typed.getGroupTypedMemoryDir(scopeA))
    .filter(name => name.endsWith(".md"))
    .map(name => fs.readFileSync(path.join(typed.getGroupTypedMemoryDir(scopeA), name), "utf-8"))
    .join("\n");
  const docsB = fs.readdirSync(typed.getGroupTypedMemoryDir(scopeB))
    .filter(name => name.endsWith(".md"))
    .map(name => fs.readFileSync(path.join(typed.getGroupTypedMemoryDir(scopeB), name), "utf-8"))
    .join("\n");
  const memoryA = memory.loadGroupMemory(groupId, sessionA.id);
  const memoryB = memory.loadGroupMemory(groupId, sessionB.id);
  const bareGroupDir = typed.getGroupTypedMemoryDir(groupId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const fleetA = fleet.groups.find(row => row.modelExtractionScopeId === scopeA);
  const fleetB = fleet.groups.find(row => row.modelExtractionScopeId === scopeB);

  const checks = {
    bothCompactionsSucceed: resultA.success === true && resultB.success === true,
    resultScopesBindExactSessions: resultA.typedMemoryScopeId === scopeA && resultB.typedMemoryScopeId === scopeB,
    backgroundScopesPersist: memoryA.compaction?.background?.typedMemoryScopeId === scopeA
      && memoryB.compaction?.background?.typedMemoryScopeId === scopeB,
    ledgerScopesBindExactSessions: typed.readGroupTypedMemoryDistillationLedger(scopeA).groupId === scopeA
      && typed.readGroupTypedMemoryDistillationLedger(scopeB).groupId === scopeB,
    sessionAOwnsOnlyA: docsA.includes(sentinelA) && !docsA.includes(sentinelB),
    sessionBOwnsOnlyB: docsB.includes(sentinelB) && !docsB.includes(sentinelA),
    independentIndexesCreated: indexA.includes("distilled-log-user-requirements.md")
      && indexB.includes("distilled-log-user-requirements.md"),
    noBareGroupMemoryCreated: !fs.existsSync(bareGroupDir),
    legacyExecutionRejected: legacyResult.reason === "legacy_default_session_rejected" && legacyResult.success === false,
    legacySchedulingRejected: legacySchedule.reason === "legacy_default_session_rejected" && legacySchedule.scheduled === false,
    memoryCenterVerifiesBothScopes: fleetA?.autoCompactionTypedMemoryScopeValid === true
      && fleetB?.autoCompactionTypedMemoryScopeValid === true
      && fleet.overall.autoCompactionScopeInvalidCount === 0,
    rawTranscriptsRemainIsolated: storage.getGroupMessages(groupId, sessionA.id)[0].content.includes(sentinelA)
      && !storage.getGroupMessages(groupId, sessionA.id)[0].content.includes(sentinelB)
      && storage.getGroupMessages(groupId, sessionB.id)[0].content.includes(sentinelB),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase275-group-memory-auto-compaction-session-scope-selftest-v1",
    checks,
    scopes: [scopeA, scopeB],
    candidates: [resultA.logDistillation?.candidateCount || 0, resultB.logDistillation?.candidateCount || 0],
  }, null, 2)}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
