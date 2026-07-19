import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.includes("--child")) {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  const compaction = require(dist("modules", "collaboration", "group-memory-compaction.js"));
  const memory = require(dist("modules", "collaboration", "memory.js"));
  const storage = require(dist("modules", "collaboration", "storage.js"));
  const memoryCenter = require(dist("modules", "knowledge", "memory-control-center.js"));
  const fixtureFile = path.join(os.homedir(), ".cc-connect", "phase314-true-payload-fixture.json");

  if (process.argv.includes("--verify-restart")) {
    const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
    const restored = memory.loadGroupMemory(fixture.groupId, fixture.sessionA);
    const checks = {
      rejectedCandidateNotCommittedAfterRestart: !restored.compactBoundary?.id
        && !restored.compaction?.lastCompactedMessageId
        && !restored.compaction?.postCompactPayloadGate,
      rawTranscriptSurvivesRestart: storage.getGroupMessages(fixture.groupId, fixture.sessionA).length === fixture.messageCount,
      siblingTranscriptIsolated: storage.getGroupMessages(fixture.groupId, fixture.sessionB).length === 1
        && storage.getGroupMessages(fixture.groupId, fixture.sessionB)[0]?.content === "PHASE314_SIBLING_ONLY",
    };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase314-true-post-compact-payload-restart-selftest-v1", checks }, null, 2)}\n`);
    process.exit(0);
  }

  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase314-true-payload-${nonce}`;
  storage.saveGroups([{ id: groupId, name: "Phase 314", members: [] }]);
  const sessionA = storage.createGroupChatSession(groupId, "超限会话");
  const sessionB = storage.createGroupChatSession(groupId, "兄弟会话");
  const messages = Array.from({ length: 44 }, (_, index) => ({
    id: `phase314-message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "all" : undefined,
    agent: index % 2 === 1 ? "phase314-project" : undefined,
    content: index >= 38
      ? `PHASE314_RECENT_${index} ${"近期恢复上下文".repeat(520)}`
      : `PHASE314_OLD_${index} ${"旧消息压缩材料".repeat(180)}`,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    group_session_id: sessionA.id,
  }));
  storage.saveGroupMessages(groupId, messages, sessionA.id);
  storage.saveGroupMessages(groupId, [{
    id: "phase314-sibling",
    role: "user",
    content: "PHASE314_SIBLING_ONLY",
    timestamp: new Date().toISOString(),
    group_session_id: sessionB.id,
  }], sessionB.id);

  const synthetic = compaction.buildGroupTruePostCompactPayloadBudget({
    groupId,
    groupSessionId: sessionA.id,
    triggerTokens: 18_000,
    summaryText: "small summary",
    keptMessages: [],
    postCompactReinject: { files: [{ path: "large-restore.md", content: "R".repeat(90_000) }] },
  });
  let rejected = null;
  try {
    await compaction.compactGroupConversationMemory({
      groupId,
      groupSessionId: sessionA.id,
      messages,
      memory: { groupId, groupSessionId: sessionA.id, goal: "验证 true post-compact payload" },
      config: {
        modelContextWindow: 32_000,
        modelAutoCompactTokenLimit: 18_000,
        memoryCompactionUseModel: false,
        minKeepMessages: 5,
        minKeepTokens: 10_000,
        maxKeepTokens: 40_000,
      },
      transcriptPath: storage.getGroupChatSessionMessagesFile(groupId, sessionA.id),
      force: true,
    });
  } catch (error) {
    rejected = error;
  }
  const gate = rejected?.postCompactPayloadGate;
  const checks = {
    syntheticReinjectionIsCounted: synthetic.components.reinjection > synthetic.components.summary
      && synthetic.will_retrigger_next_turn === true,
    compactCandidateRejected: rejected?.code === "GROUP_POST_COMPACT_THRESHOLD_EXCEEDED",
    secondThresholdGateFailsClosed: gate?.status === "recompact_required"
      && gate.action === "reduce_restored_context_before_child_dispatch"
      && gate.true_post_compact_token_count >= gate.trigger_tokens,
    compactBoundaryNotCommitted: !memory.loadGroupMemory(groupId, sessionA.id).compactBoundary?.id,
    rawTranscriptRemainsUntouched: storage.getGroupMessages(groupId, sessionA.id).length === messages.length
      && storage.getGroupMessages(groupId, sessionA.id).at(-1)?.content === messages.at(-1)?.content,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, gate }, null, 2));
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, sessionA: sessionA.id, sessionB: sessionB.id, messageCount: messages.length }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase314-true-post-compact-payload-selftest-v1", checks, tokens: { prePtl: gate.pre_ptl_token_count, final: gate.true_post_compact_token_count, trigger: gate.trigger_tokens } }, null, 2)}\n`);
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase314-true-payload-"));
try {
  for (const mode of [["--child"], ["--child", "--verify-restart"]]) {
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...mode], {
      cwd: root,
      env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
      encoding: "utf8",
      timeout: 120_000,
    });
    if (child.status !== 0) {
      process.stderr.write(child.stdout || "");
      process.stderr.write(child.stderr || "");
      process.exit(child.status || 1);
    }
    process.stdout.write(child.stdout);
  }
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
