import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const globalAgent = require(path.join(root, "ccm-package", "dist", "modules", "global", "global-agent.js"));

const groupId = `phase225-memory-budget-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_budget_a`;
const sessionB = `gcs_${Date.now().toString(36)}_budget_b`;
const sentinelA = `PHASE225_SESSION_A_${Date.now().toString(36)}`;
const sentinelB = `PHASE225_SESSION_B_${Date.now().toString(36)}`;

function sessionMemory(sessionId, sentinel, file) {
  return {
    ...memory.createEmptyGroupMemory(groupId, sessionId),
    goal: `验证 ${sessionId} 独立记忆`,
    currentPhase: "session-memory-budget-fleet-audit",
    messageDigest: `${sentinel}：继续修改 ${file}，保持群聊会话上下文隔离。`,
    persistentRequirements: [`每次项目子 Agent 新会话必须收到 ${sentinel}`],
    factAnchors: [{ fact: `${file} 属于 ${sessionId}`, source: "phase225-selftest" }],
    decisions: [{ decision: `只在 ${sessionId} 使用 ${file}` }],
    nextActions: [`检查 ${file}`],
    compaction: {
      enabled: true,
      health: "healthy",
      compactedMessageCount: 24,
      lastCompactedMessageId: `${sessionId}-message-24`,
      summaryChecksum: `${sessionId}-summary-checksum`,
    },
    messageCompression: { enabled: true, compressedMessages: 24, recentMessages: 6 },
  };
}

try {
  memory.saveGroupMemory(groupId, sessionMemory(sessionA, sentinelA, "src/session-a.ts"), sessionA);
  memory.saveGroupMemory(groupId, sessionMemory(sessionB, sentinelB, "src/session-b.ts"), sessionB);

  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const rows = report.groups || [];
  const rowA = rows.find(row => row.groupSessionId === sessionA);
  const rowB = rows.find(row => row.groupSessionId === sessionB);
  const snapshotA = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionA}`);
  const snapshotB = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionB}`);
  const oversized = memory.analyzeGroupSessionMemoryBudget(`## Session Summary\n${"上下文证据 ".repeat(5000)}`);
  const enforced = memory.enforceGroupSessionMemoryBudget(`## Session Summary\n${"上下文证据 ".repeat(5000)}`);
  const bundleA = memory.buildAgentMemoryContextBundle(groupId, "api", sentinelA, {
    groupSessionId: sessionA,
    includeGlobalClaudeMemory: false,
    maxRenderedChars: 30000,
  });
  const bundleB = memory.buildAgentMemoryContextBundle(groupId, "api", sentinelB, {
    groupSessionId: sessionB,
    includeGlobalClaudeMemory: false,
    maxRenderedChars: 30000,
  });
  const globalContext = globalAgent.buildAgenticContext(sentinelA, "", {
    groups: [{ id: groupId, name: "Phase 225", members: [{ project: "api", agent: "claude-code" }] }],
    recordDelivery: false,
  });
  const globalRendered = JSON.stringify(globalContext);
  const defaultMemoryFile = memory.getGroupMemoryFile(groupId, "default");

  const checks = {
    fleetEnumeratesBothSessions: report.overall?.sessionCount === 2 && !!rowA && !!rowB,
    fleetCreatesNoLegacyDefault: report.overall?.legacyDefaultSessionCount === 0 && !fs.existsSync(defaultMemoryFile),
    snapshotsStayWithinCcBudget: [rowA, rowB].every(row => row.budgetStatus === "ok" && row.markdownTokens <= 12000 && row.oversizedSectionCount === 0),
    snapshotsPersistBudgetEvidence: [snapshotA, snapshotB].every(snapshot => snapshot.version === 3 && snapshot.markdownTokens > 0 && snapshot.memoryBudget?.maxTotalTokens === 12000 && snapshot.memoryBudget?.maxSectionTokens === 2000),
    analyzerDetectsOversizedMemory: oversized.status === "over_budget" && oversized.totalTokens > 12000 && oversized.oversizedSectionCount === 1,
    enforcerRestoresCcBudget: enforced.wasTruncated === true && enforced.after.status !== "over_budget" && enforced.after.totalTokens <= 12000 && enforced.after.oversizedSectionCount === 0,
    childAgentsReceiveOnlyOwningSession: String(bundleA.rendered_text).includes(sentinelA) && !String(bundleA.rendered_text).includes(sentinelB) && String(bundleB.rendered_text).includes(sentinelB) && !String(bundleB.rendered_text).includes(sentinelA),
    globalAgentExcludesGroupSessionContent: !globalRendered.includes(sentinelA) && !Object.prototype.hasOwnProperty.call(globalContext, "group_memory_context") && globalContext.memory_context_boundary?.policy === "global_memory_only_group_session_content_excluded" && globalContext.memory_context_boundary?.group_session_context_included === false,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, report, oversized, enforced: { wasTruncated: enforced.wasTruncated, truncatedSections: enforced.truncatedSections, after: enforced.after } }, null, 2));

  const deletedA = memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
  const deletionChecks = {
    deletingSessionARemovesItsMemory: !fs.existsSync(memory.getGroupMemoryFile(groupId, sessionA)) && !fs.existsSync(snapshotA.snapshotFile) && !fs.existsSync(snapshotA.summaryFile),
    deletingSessionAKeepsSessionB: fs.existsSync(memory.getGroupMemoryFile(groupId, sessionB)) && fs.existsSync(snapshotB.snapshotFile) && fs.existsSync(snapshotB.summaryFile),
    fleetRetainsOnlySessionB: (() => {
      const after = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
      return after.overall?.sessionCount === 1 && after.groups?.[0]?.groupSessionId === sessionB;
    })(),
    deletionReportsArtifacts: deletedA.deletedFiles > 0,
  };
  assert.equal(Object.values(deletionChecks).every(Boolean), true, JSON.stringify({ deletionChecks, deletedA }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks: { ...checks, ...deletionChecks }, fleet: report.overall }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
}
