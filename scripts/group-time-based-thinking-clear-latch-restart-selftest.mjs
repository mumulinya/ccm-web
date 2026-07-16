import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE319_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    orchestrator: require(dist("modules", "collaboration", "group-orchestrator.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function fixtureMessages(groupSessionId, base) {
  const messages = [];
  for (let index = 0; index < 4; index += 1) {
    messages.push({
      id: `phase319-assistant-${index}`,
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      timestamp: new Date(base + index * 60_000).toISOString(),
      content: [
        { type: "thinking", thinking: `PHASE319_THINKING_${index} ${"private reasoning ".repeat(100)}`, signature: `sig-${index}` },
        { type: "text", text: `PHASE319_VISIBLE_ANSWER_${index}` },
      ],
    });
    messages.push({
      id: `phase319-user-${index}`,
      group_session_id: groupSessionId,
      role: "user",
      target: "all",
      timestamp: new Date(base + index * 60_000 + 1000).toISOString(),
      content: `Continue phase319 step ${index}.`,
    });
  }
  return messages;
}

function childCreate(fixtureFile) {
  const { compact, memory, storage, orchestrator, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase319-thinking-${nonce}`;
  const groupSessionId = `gcs_phase319_${nonce}`;
  const siblingSessionId = `gcs_phase319_sibling_${nonce}`;
  const base = Date.parse("2026-07-15T00:00:00.000Z");
  const now = "2026-07-15T03:00:00.000Z";
  const recentNow = "2026-07-15T03:01:00.000Z";
  const messages = fixtureMessages(groupSessionId, base);
  const originalJson = JSON.stringify(messages);

  orchestrator.saveOrchestratorConfig({
    timeBasedThinkingClearEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
  });
  storage.saveGroupMessages(groupId, messages, groupSessionId);
  storage.saveGroupMessages(groupId, fixtureMessages(siblingSessionId, base), siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase319 thinking latch", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase319 sibling isolation", decisions: [] }, siblingSessionId);

  const direct = compact.buildGroupTimeBasedThinkingProjection(messages, {
    groupId,
    groupSessionId,
    compactEpoch: "precompact",
    querySource: "group_main_thread:selftest",
    enabled: true,
    gapThresholdMinutes: 60,
    now,
  });
  const directText = JSON.stringify(direct.messages);
  const verification = compact.verifyGroupTimeBasedThinkingProjectionReceipt(direct.receipt, {
    groupId,
    groupSessionId,
    compactEpoch: "precompact",
  });
  const recentMessages = [...messages, {
    id: "phase319-recent-assistant",
    group_session_id: groupSessionId,
    role: "assistant",
    agent: "group-main",
    timestamp: "2026-07-15T03:00:30.000Z",
    content: [
      { type: "thinking", thinking: "PHASE319_THINKING_RECENT keep this reasoning" },
      { type: "text", text: "Recent visible answer" },
    ],
  }];
  const reused = compact.buildGroupTimeBasedThinkingProjection(recentMessages, {
    groupId,
    groupSessionId,
    compactEpoch: "precompact",
    querySource: "group_main_thread:selftest",
    enabled: true,
    gapThresholdMinutes: 60,
    priorReceipt: direct.receipt,
    now: recentNow,
  });
  const compactReset = compact.buildGroupTimeBasedThinkingProjection(recentMessages, {
    groupId,
    groupSessionId,
    compactEpoch: "cmp_new_epoch",
    querySource: "group_main_thread:selftest",
    enabled: true,
    gapThresholdMinutes: 60,
    priorReceipt: direct.receipt,
    now: recentNow,
  });
  const tamperedPrior = { ...direct.receipt, compact_epoch: "precompact-tampered" };
  const tamperedReuse = compact.buildGroupTimeBasedThinkingProjection(recentMessages, {
    groupId,
    groupSessionId,
    compactEpoch: "precompact",
    querySource: "group_main_thread:selftest",
    enabled: true,
    gapThresholdMinutes: 60,
    priorReceipt: tamperedPrior,
    now: recentNow,
  });
  const wrongSource = compact.buildGroupTimeBasedThinkingProjection(messages, {
    groupId, groupSessionId, compactEpoch: "precompact", querySource: "subagent", enabled: true, gapThresholdMinutes: 60, now,
  });
  const legacySession = compact.buildGroupTimeBasedThinkingProjection(messages, {
    groupId, groupSessionId: "default", compactEpoch: "precompact", querySource: "group_main_thread:selftest", enabled: true, gapThresholdMinutes: 60, now,
  });
  const redacted = compact.buildGroupTimeBasedThinkingProjection(messages, {
    groupId, groupSessionId, compactEpoch: "precompact", querySource: "group_main_thread:selftest", enabled: true, gapThresholdMinutes: 60, isRedactThinkingActive: true, now,
  });

  const mainPacket = memory.buildGroupContextPacket(groupId, {
    groupSessionId,
    recentLimit: 30,
    fullCount: 20,
    timeBasedThinkingClearEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
    now,
  });
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Implement phase319", {
    groupSessionId,
    taskId: `task-phase319-${nonce}`,
    taskAgentSessionId: `tas_phase319_${nonce}`,
    timeBasedThinkingClearEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
    now,
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const persistedReceipt = persisted.compaction?.timeBasedThinkingProjection || null;
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerMicro = detail.postCompactUsage?.timeBasedThinkingMicrocompact || {};
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const rawAfter = storage.getGroupMessages(groupId, groupSessionId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");

  const checks = {
    cacheColdGapLatches: direct.receipt.latched === true && direct.receipt.newly_latched === true,
    oldThinkingTurnsCleared: direct.applied === true
      && direct.receipt.cleared_thinking_turn_count === 3
      && [0, 1, 2].every(index => !directText.includes(`PHASE319_THINKING_${index}`)),
    latestThinkingTurnKept: directText.includes("PHASE319_THINKING_3")
      && [0, 1, 2, 3].every(index => directText.includes(`PHASE319_VISIBLE_ANSWER_${index}`)),
    receiptExactValidAndBodyFree: verification.valid === true
      && direct.receipt.raw_transcript_preserved === true
      && !JSON.stringify(direct.receipt).includes("private reasoning")
      && !JSON.stringify(direct.receipt).includes("PHASE319_THINKING_"),
    tamperedReceiptRejected: compact.verifyGroupTimeBasedThinkingProjectionReceipt(tamperedPrior).valid === false,
    latchReusedUnderThreshold: reused.applied === true
      && reused.receipt.prior_latch_reused === true
      && reused.receipt.gap_minutes < 60
      && JSON.stringify(reused.messages).includes("PHASE319_THINKING_RECENT")
      && !JSON.stringify(reused.messages).includes("PHASE319_THINKING_3"),
    compactEpochResetsLatch: compactReset.applied === false
      && compactReset.receipt.reset_by_compact === true
      && compactReset.receipt.latched === false
      && JSON.stringify(compactReset.messages) === JSON.stringify(recentMessages),
    invalidPriorFailsClosed: tamperedReuse.applied === false
      && tamperedReuse.receipt.latched === false
      && JSON.stringify(tamperedReuse.messages) === JSON.stringify(recentMessages),
    wrongSourceDoesNotClear: wrongSource.applied === false && wrongSource.receipt.reason === "main_thread_source_required",
    legacySessionDoesNotClear: legacySession.applied === false && legacySession.receipt.reason === "exact_group_session_required",
    redactedThinkingDoesNotClear: redacted.applied === false && redacted.receipt.reason === "redacted_thinking_not_model_visible",
    mainAgentPromptUsesProjection: mainPacket.includes(compact.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE)
      && mainPacket.includes("thinking clear")
      && !mainPacket.includes("PHASE319_THINKING_0"),
    childMemoryUsesSameProjection: childBundle.compaction?.timeBasedThinkingProjection?.latched === true
      && childBundle.resume_context?.timeBasedThinkingProjection?.latched === true
      && childBundle.resume_context?.text?.includes(compact.GROUP_TIME_BASED_THINKING_CLEARED_MESSAGE)
      && !childBundle.resume_context?.text?.includes("PHASE319_THINKING_0"),
    rawTranscriptUntouched: JSON.stringify(rawAfter) === originalJson,
    receiptPersistsInExactMemory: persistedReceipt?.latched === true
      && compact.verifyGroupTimeBasedThinkingProjectionReceipt(persistedReceipt, { groupId, groupSessionId, compactEpoch: "precompact" }).valid === true,
    siblingSessionUnaffected: !siblingMemory.compaction?.timeBasedThinkingProjection,
    memoryCenterShowsVerifiedLatch: ["applied", "latched"].includes(centerMicro.status)
      && centerMicro.receiptValid === true
      && centerMicro.groupSessionId === groupSessionId,
    memoryCenterSettingsAndPanelPresent: uiSource.includes("timeBasedThinkingClearEnabled")
      && uiSource.includes("Time-based Thinking Clear Latch")
      && uiSource.includes("空闲后只保留最近思考"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, orchestrator, center, storage } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const config = orchestrator.loadOrchestratorConfig();
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const receipt = persisted.compaction?.timeBasedThinkingProjection || null;
  const messages = storage.getGroupMessages(fixture.groupId, fixture.groupSessionId);
  const recentMessages = [...messages, {
    id: "phase319-after-restart-assistant",
    group_session_id: fixture.groupSessionId,
    role: "assistant",
    agent: "group-main",
    timestamp: "2026-07-15T03:00:30.000Z",
    content: [{ type: "thinking", thinking: "PHASE319_AFTER_RESTART_KEEP" }, { type: "text", text: "visible" }],
  }];
  const reused = compact.buildGroupTimeBasedThinkingProjection(recentMessages, {
    groupId: fixture.groupId,
    groupSessionId: fixture.groupSessionId,
    compactEpoch: "precompact",
    querySource: "group_main_thread:restart",
    enabled: true,
    gapThresholdMinutes: 60,
    priorReceipt: receipt,
    now: "2026-07-15T03:01:00.000Z",
  });
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const centerMicro = detail.postCompactUsage?.timeBasedThinkingMicrocompact || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const checks = {
    settingSurvivesRestart: config.timeBasedThinkingClearEnabled === true && config.timeBasedMicrocompactGapMinutes === 60,
    receiptSurvivesRestart: receipt?.latched === true
      && compact.verifyGroupTimeBasedThinkingProjectionReceipt(receipt, { groupId: fixture.groupId, groupSessionId: fixture.groupSessionId, compactEpoch: "precompact" }).valid === true,
    latchActuallyReusedAfterRestart: reused.applied === true
      && reused.receipt.prior_latch_reused === true
      && reused.receipt.gap_minutes < 60
      && !JSON.stringify(reused.messages).includes("PHASE319_THINKING_3")
      && JSON.stringify(reused.messages).includes("PHASE319_AFTER_RESTART_KEEP"),
    memoryCenterSurvivesRestart: ["applied", "latched"].includes(centerMicro.status) && centerMicro.receiptValid === true,
    siblingStillIndependent: !sibling.compaction?.timeBasedThinkingProjection,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-create") {
  childCreate(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase319-thinking-latch-"));
  const fixtureFile = path.join(tempHome, "phase319-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase319-time-based-thinking-clear-latch-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
