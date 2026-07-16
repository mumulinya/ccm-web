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
    const gate = restored.compaction?.postCompactPayloadGate;
    const budget = restored.compaction?.truePostCompactPayloadBudget;
    const childBundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(
      fixture.groupId,
      "phase314-project",
      "继续执行压缩后的任务",
      {
        groupSessionId: fixture.sessionA,
        requireExactGroupSession: true,
        recordManifestSelectorDecision: false,
      },
    );
    const mainAgentContext = memory.buildGroupContextPacket(fixture.groupId, {
      groupSessionId: fixture.sessionA,
      recentLimit: 12,
      olderLimit: 30,
      fullCount: 5,
    });
    const siblingBundle = await memory.buildAgentMemoryContextBundleWithManifestSelection(
      fixture.groupId,
      "phase314-project",
      "兄弟会话任务",
      {
        groupSessionId: fixture.sessionB,
        requireExactGroupSession: true,
        recordManifestSelectorDecision: false,
      },
    );
    const scopeId = `${fixture.groupId}::${fixture.sessionA}`;
    const memoryCenterDetail = memoryCenter.getMemoryCenterScope("group", scopeId);
    const memoryCenterPayload = memoryCenterDetail.postCompactUsage?.truePostCompactPayload;
    const memoryCenterSummaryPayload = memoryCenterDetail.summary?.truePostCompactPayload;
    const memoryCenterOverview = memoryCenter.buildMemoryCenterOverview();
    const memoryCenterFleetRow = (memoryCenterOverview.truePostCompactPayloadFleetReport?.rows || [])
      .find((row) => row.groupId === fixture.groupId && row.groupSessionId === fixture.sessionA);
    const memoryCenterUi = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
    const checks = {
      durableGateSurvivesRestart: gate?.schema === "ccm-group-post-compact-payload-gate-v1"
        && gate.status === "recompact_required",
      durableBudgetSurvivesRestart: budget?.schema === "ccm-group-true-post-compact-payload-budget-v1"
        && budget.payload_checksum === gate.payload_checksum,
      childBundleProjectsGate: childBundle.compaction?.postCompactPayloadGate?.status === "recompact_required",
      childBundleUsesSafeRenderBudget: String(childBundle.rendered_text || "").length <= Number(gate.safe_render_chars || 6000) + 32
        && String(childBundle.rendered_text || "").length < 7000,
      mainAgentContextUsesSafeRenderBudget: mainAgentContext.length <= Number(gate.safe_render_chars || 6000) + 32
        && mainAgentContext.length < 7000,
      siblingSessionDoesNotInheritGate: !siblingBundle.compaction?.postCompactPayloadGate,
      exactSessionIdentityRetained: childBundle.group_session_id === fixture.sessionA
        && siblingBundle.group_session_id === fixture.sessionB,
      memoryCenterDetailProjectsTruePayload: memoryCenterPayload?.schema === "ccm-memory-center-true-post-compact-payload-overview-v1"
        && memoryCenterPayload.gateStatus === "recompact_required"
        && memoryCenterPayload.truePostCompactTokenCount === gate.true_post_compact_token_count
        && memoryCenterPayload.components?.recentWindow > memoryCenterPayload.components?.summary,
      memoryCenterSummaryProjectsTruePayload: memoryCenterSummaryPayload?.payloadChecksum === gate.payload_checksum
        && memoryCenterSummaryPayload.groupSessionId === fixture.sessionA,
      memoryCenterOverviewProjectsExactSessionGate: memoryCenterOverview.truePostCompactPayloadFleetReport?.schema === "ccm-memory-center-true-post-compact-payload-fleet-report-v1"
        && memoryCenterOverview.truePostCompactPayloadFleetReport?.overall?.recompactRequiredCount === 1
        && memoryCenterFleetRow?.scopeId === scopeId
        && memoryCenterFleetRow?.gateStatus === "recompact_required",
      memoryCenterUiRendersPayloadAndGate: memoryCenterUi.includes("真实压缩后载荷")
        && memoryCenterUi.includes("payload.truePostCompactTokenCount")
        && memoryCenterUi.includes("truePostCompactPayload.gateStatus")
        && memoryCenterUi.includes("components.sessionMemoryRestore"),
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
  const result = await compaction.compactGroupConversationMemory({
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
  memory.saveGroupMemory(groupId, result.memory, sessionA.id);

  const budget = result.truePostCompactPayloadBudget;
  const gate = result.postCompactPayloadGate;
  const checks = {
    syntheticReinjectionIsCounted: synthetic.components.reinjection > synthetic.components.summary
      && synthetic.will_retrigger_next_turn === true,
    compactProducesTruePayloadBudget: result.compacted === true
      && budget?.schema === "ccm-group-true-post-compact-payload-budget-v1",
    actualRecentWindowIsCounted: Number(budget.components?.recent_window || 0) > Number(budget.components?.summary || 0),
    ptlUsesFullPayloadNotSummaryOnly: result.memory.compaction?.ptlEmergency?.engaged === true
      && result.memory.compaction.prePtlPostCompactTokenCount >= 18_000,
    finalTokenCountUsesTruePayload: result.boundary.postCompactTokenCount === budget.true_post_compact_token_count
      && result.memory.compaction.postCompactTokenCount === budget.true_post_compact_token_count,
    secondThresholdGateFailsClosed: gate?.status === "recompact_required"
      && gate.action === "reduce_restored_context_before_child_dispatch"
      && gate.true_post_compact_token_count >= gate.trigger_tokens,
    compactArtifactsCarryGate: result.boundary.postCompactPayloadGate?.payload_checksum === gate.payload_checksum
      && result.memory.messageCompression?.postCompactPayloadGate?.status === "recompact_required",
    rawTranscriptRemainsUntouched: storage.getGroupMessages(groupId, sessionA.id).length === messages.length
      && storage.getGroupMessages(groupId, sessionA.id).at(-1)?.content === messages.at(-1)?.content,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, budget, gate }, null, 2));
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, sessionA: sessionA.id, sessionB: sessionB.id }, null, 2));
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
