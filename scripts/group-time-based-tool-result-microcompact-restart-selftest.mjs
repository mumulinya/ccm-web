import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE318_RESULT=";

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
  for (let index = 0; index < 8; index += 1) {
    const toolId = `phase318-read-${index}`;
    messages.push({
      id: `phase318-assistant-${index}`,
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      timestamp: new Date(base + index * 60_000).toISOString(),
      content: [{ type: "tool_use", id: toolId, name: index === 7 ? "CustomUnsafeTool" : "Read", input: { file_path: `src/phase318-${index}.ts` } }],
    });
    messages.push({
      id: `phase318-result-${index}`,
      group_session_id: groupSessionId,
      role: "user",
      target: "group-main",
      timestamp: new Date(base + index * 60_000 + 1000).toISOString(),
      content: [{ type: "tool_result", tool_use_id: toolId, content: `PHASE318_TOOL_RESULT_${index} ${"old tool output ".repeat(120)}` }],
    });
  }
  messages.push({
    id: "phase318-current-request",
    group_session_id: groupSessionId,
    role: "user",
    target: "all",
    timestamp: new Date(base + 3 * 60 * 60_000).toISOString(),
    content: "Continue the current task using exact group memory.",
  });
  return messages;
}

function childCreate(fixtureFile) {
  const { compact, memory, storage, orchestrator, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase318-time-mc-${nonce}`;
  const groupSessionId = `gcs_phase318_${nonce}`;
  const siblingSessionId = `gcs_phase318_sibling_${nonce}`;
  const base = Date.parse("2026-07-15T00:00:00.000Z");
  const now = "2026-07-15T03:00:00.000Z";
  const messages = fixtureMessages(groupSessionId, base);
  const originalJson = JSON.stringify(messages);

  orchestrator.saveOrchestratorConfig({
    timeBasedMicrocompactEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
    timeBasedMicrocompactKeepRecent: 3,
  });
  storage.saveGroupMessages(groupId, messages, groupSessionId);
  storage.saveGroupMessages(groupId, fixtureMessages(siblingSessionId, base), siblingSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase318 exact-session time microcompact", decisions: [] }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase318 sibling must remain independent", decisions: [] }, siblingSessionId);

  const direct = compact.buildGroupTimeBasedToolResultProjection(messages, {
    groupId,
    groupSessionId,
    querySource: "group_main_thread:selftest",
    enabled: true,
    gapThresholdMinutes: 60,
    keepRecent: 3,
    now,
  });
  const directText = JSON.stringify(direct.messages);
  const verification = compact.verifyGroupTimeBasedToolResultProjectionReceipt(direct.receipt, { groupId, groupSessionId });
  const underThreshold = compact.buildGroupTimeBasedToolResultProjection(messages, {
    groupId, groupSessionId, querySource: "group_main_thread:selftest", enabled: true, gapThresholdMinutes: 240, keepRecent: 3, now,
  });
  const wrongSource = compact.buildGroupTimeBasedToolResultProjection(messages, {
    groupId, groupSessionId, querySource: "subagent", enabled: true, gapThresholdMinutes: 60, keepRecent: 3, now,
  });
  const legacySession = compact.buildGroupTimeBasedToolResultProjection(messages, {
    groupId, groupSessionId: "default", querySource: "group_main_thread:selftest", enabled: true, gapThresholdMinutes: 60, keepRecent: 3, now,
  });
  const keepFloor = compact.buildGroupTimeBasedToolResultProjection(messages, {
    groupId, groupSessionId, querySource: "group_main_thread:selftest", enabled: true, gapThresholdMinutes: 60, keepRecent: -2, now,
  });
  const tampered = { ...direct.receipt, tokens_saved: direct.receipt.tokens_saved + 1 };

  const mainPacket = memory.buildGroupContextPacket(groupId, {
    groupSessionId,
    recentLimit: 40,
    fullCount: 20,
    timeBasedMicrocompactEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
    timeBasedMicrocompactKeepRecent: 3,
    now,
  });
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "Implement phase318", {
    groupSessionId,
    taskId: `task-phase318-${nonce}`,
    taskAgentSessionId: `tas_phase318_${nonce}`,
    timeBasedMicrocompactEnabled: true,
    timeBasedMicrocompactGapMinutes: 60,
    timeBasedMicrocompactKeepRecent: 3,
    now,
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const persistedReceipt = persisted.compaction?.timeBasedToolResultProjection || null;
  const detail = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`);
  const centerMicro = detail.postCompactUsage?.timeBasedToolResultMicrocompact || {};
  const siblingMemory = memory.loadGroupMemory(groupId, siblingSessionId);
  const rawAfter = storage.getGroupMessages(groupId, groupSessionId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");

  const checks = {
    oldCompactableResultsCleared: direct.applied === true
      && direct.receipt.cleared_tool_result_count === 4
      && [0, 1, 2, 3].every(index => !directText.includes(`PHASE318_TOOL_RESULT_${index}`)),
    latestCompactableResultsKept: [4, 5, 6].every(index => directText.includes(`PHASE318_TOOL_RESULT_${index}`)),
    unsupportedToolResultKept: directText.includes("PHASE318_TOOL_RESULT_7"),
    receiptExactAndValid: verification.valid === true
      && direct.receipt.group_session_id === groupSessionId
      && direct.receipt.raw_transcript_preserved === true
      && direct.receipt.tokens_saved > 0,
    receiptBodyFree: !JSON.stringify(direct.receipt).includes("PHASE318_TOOL_RESULT_")
      && !JSON.stringify(direct.receipt).includes("old tool output"),
    tamperedReceiptRejected: compact.verifyGroupTimeBasedToolResultProjectionReceipt(tampered).valid === false,
    underThresholdDoesNotClear: underThreshold.applied === false && JSON.stringify(underThreshold.messages) === originalJson,
    subagentSourceDoesNotClear: wrongSource.applied === false && wrongSource.receipt.reason === "main_thread_source_required",
    legacySessionDoesNotClear: legacySession.applied === false && legacySession.receipt.reason === "exact_group_session_required",
    keepRecentFloorIsOne: keepFloor.receipt.keep_recent === 1,
    mainAgentPromptUsesProjection: mainPacket.includes(compact.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE)
      && mainPacket.includes("raw_transcript_preserved=true")
      && !mainPacket.includes("PHASE318_TOOL_RESULT_0"),
    childMemoryUsesSameProjection: childBundle.compaction?.timeBasedToolResultProjection?.status === "applied"
      && childBundle.resume_context?.text?.includes(compact.GROUP_TIME_BASED_TOOL_RESULT_CLEARED_MESSAGE)
      && !childBundle.resume_context?.text?.includes("PHASE318_TOOL_RESULT_0"),
    rawTranscriptUntouched: JSON.stringify(rawAfter) === originalJson,
    receiptPersistsInExactMemory: persistedReceipt?.status === "applied"
      && compact.verifyGroupTimeBasedToolResultProjectionReceipt(persistedReceipt, { groupId, groupSessionId }).valid === true,
    siblingSessionUnaffected: !siblingMemory.compaction?.timeBasedToolResultProjection,
    memoryCenterShowsVerifiedRun: centerMicro.status === "applied"
      && centerMicro.receiptValid === true
      && centerMicro.groupSessionId === groupSessionId,
    memoryCenterSettingsAndPanelPresent: uiSource.includes("timeBasedMicrocompactEnabled")
      && uiSource.includes("Time-based Tool Result Microcompact")
      && uiSource.includes("空闲触发间隔（分钟）"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, groupSessionId, siblingSessionId }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, orchestrator, center } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const config = orchestrator.loadOrchestratorConfig();
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const receipt = persisted.compaction?.timeBasedToolResultProjection || null;
  const detail = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`);
  const centerMicro = detail.postCompactUsage?.timeBasedToolResultMicrocompact || {};
  const sibling = memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId);
  const checks = {
    settingsSurviveRestart: config.timeBasedMicrocompactEnabled === true
      && config.timeBasedMicrocompactGapMinutes === 60
      && config.timeBasedMicrocompactKeepRecent === 3,
    receiptSurvivesRestart: receipt?.status === "applied"
      && compact.verifyGroupTimeBasedToolResultProjectionReceipt(receipt, { groupId: fixture.groupId, groupSessionId: fixture.groupSessionId }).valid === true,
    memoryCenterSurvivesRestart: centerMicro.status === "applied" && centerMicro.receiptValid === true,
    siblingStillIndependent: !sibling.compaction?.timeBasedToolResultProjection,
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
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase318-time-microcompact-"));
  const fixtureFile = path.join(tempHome, "phase318-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase318-time-based-tool-result-microcompact-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
