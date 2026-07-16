import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", `phase342-custom-prompt-${process.pid}-${Date.now().toString(36)}`);
const home = path.join(scratch, "home");
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
let model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = "phase342-group-a";
const siblingGroupId = "phase342-group-b";
const sessionId = storage.createGroupChatSession(groupId, "Phase 342 exact prompt").id;
const siblingSessionId = storage.createGroupChatSession(siblingGroupId, "Phase 342 inherited prompt").id;
const scopeId = `${groupId}--${sessionId}`;
const siblingScopeId = `${siblingGroupId}--${siblingSessionId}`;
const globalPrompt = "PHASE342_GLOBAL_SENTINEL {{scopeId}}; retain product decisions.";
const exactPrompt = "PHASE342_EXACT_SENTINEL {{groupId}}/{{groupSessionId}} at {{notesPath}}; current={{currentNotes}}";
const messages = [
  { id: "phase342-user", role: "user", content: "Keep PHASE342_USER_CONSTRAINT and finish the custom prompt work.", group_session_id: sessionId },
  { id: "phase342-assistant", role: "assistant", content: "Implemented the exact-session prompt profile.", group_session_id: sessionId },
];
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE342_MEMORY_${index}: verified.` : line)
  .join("\n")
  .trim();

try {
  const globalSaved = model.saveGroupSessionMemoryCustomPrompt("", globalPrompt);
  const inheritedBefore = model.readGroupSessionMemoryCustomPromptProfile(siblingScopeId);
  const exactSaved = model.saveGroupSessionMemoryCustomPrompt(scopeId, exactPrompt);
  const exactRead = model.readGroupSessionMemoryCustomPromptProfile(scopeId);
  const siblingRead = model.readGroupSessionMemoryCustomPromptProfile(siblingScopeId);
  const direct = model.buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes: model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE,
    messages,
    customInstructions: "PHASE342_DIRECT_SENTINEL",
    customPromptSource: "exact_session",
  });

  storage.saveGroupMessages(groupId, messages, sessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionId), sessionId);
  memory.persistGroupSessionMemoryCadenceObservation(scopeId, {
    schema: "ccm-group-session-memory-update-cadence-v1",
    version: 1,
    initialized: true,
    status: "waiting_update_tokens",
    shouldExtract: false,
    currentContextTokens: 0,
    tokensAtLastExtraction: 0,
    lastExtractionMessageId: "",
    extractionCount: 0,
    observedAt: "2026-07-16T02:00:00.000Z",
  });
  const previous = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const cadence = memory.evaluateGroupSessionMemoryUpdateCadence(messages, previous, { currentContextTokens: 10_000 });
  let capturedPrompt = "";
  const extraction = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    cadenceDecision: cadence,
    disableDirectMemoryWriteSuppression: true,
    disableTypedMemoryRetrySchedule: true,
    executor: async request => {
      capturedPrompt = request.prompt;
      return { output: `<session_memory>\n${validMarkdown}\n</session_memory>`, project: "phase342", agentType: "codex", model: "stub" };
    },
  });
  assert.equal(extraction.committed, true, JSON.stringify(extraction, null, 2));
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json"), "utf8"));

  const moduleFile = require.resolve(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
  delete require.cache[moduleFile];
  model = require(moduleFile);
  const restartedProfile = model.readGroupSessionMemoryCustomPromptProfile(scopeId);
  const replay = model.replayGroupSessionMemoryModelExtraction(scopeId, receipt.executionId);
  const reset = model.saveGroupSessionMemoryCustomPrompt(scopeId, "", { reset: true });
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId, siblingGroupId] });
  const row = fleet.groups.find(item => item.groupId === groupId && item.groupSessionId === sessionId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");

  const checks = {
    globalProfileSaved: globalSaved.source === "global" && globalSaved.global.present === true,
    siblingInheritsGlobal: inheritedBefore.source === "global" && inheritedBefore.content.includes("PHASE342_GLOBAL_SENTINEL"),
    exactOverrideSaved: exactSaved.source === "exact_session" && exactSaved.exactSession.present === true,
    exactOverrideIsolated: exactRead.content.includes("PHASE342_EXACT_SENTINEL") && siblingRead.content.includes("PHASE342_GLOBAL_SENTINEL") && !siblingRead.content.includes("PHASE342_EXACT_SENTINEL"),
    directPromptAudited: direct.prompt.includes("PHASE342_DIRECT_SENTINEL") && direct.audit.customPromptConfigured === true && direct.audit.customPromptSource === "exact_session",
    customPromptCountedInBudget: direct.audit.fixedInputTokens > 3500 && direct.audit.customPromptChars === "PHASE342_DIRECT_SENTINEL".length,
    executorReceivesExactPrompt: capturedPrompt.includes("PHASE342_EXACT_SENTINEL"),
    executorReceivesScopeSubstitution: capturedPrompt.includes(`${groupId}/${sessionId}`),
    executorReceivesNotesSubstitution: capturedPrompt.includes("current=# CCM Group Session Memory"),
    immutableEnvelopePresent: capturedPrompt.includes("cannot override the exact-session scope") && capturedPrompt.includes("Required template:"),
    receiptBindsPromptProfile: receipt.requestAudit.customPromptSource === "exact_session" && receipt.requestAudit.customPromptConfigured === true && !!receipt.requestAudit.customPromptChecksum,
    restartLoadsExactOverride: restartedProfile.source === "exact_session" && restartedProfile.checksum === exactSaved.checksum,
    signedReplayPasses: replay.pass === true && replay.checks.promptRebuildMatches === true && replay.checks.customPromptChecksumMatches === true,
    resetRestoresInheritance: reset.source === "global" && reset.exactSession.present === false && reset.content.includes("PHASE342_GLOBAL_SENTINEL"),
    memoryCenterRowVisible: row?.modelCustomPromptConfigured === true && row?.modelCustomPromptSource === "exact_session" && row?.modelCustomPromptChecksum === receipt.requestAudit.customPromptChecksum,
    memoryCenterFleetVisible: fleet.overall?.modelCustomPromptConfiguredSessionCount === 1 && fleet.overall?.modelCustomPromptExactSessionCount === 1,
    memoryCenterEditorPresent: uiSource.includes("session-memory-custom-prompt") && uiSource.includes("sessionMemoryPromptTarget") && uiSource.includes("精确会话覆盖"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, promptPrefix: capturedPrompt.slice(0, 3000), receiptAudit: receipt.requestAudit, replay, row, fleet: fleet.overall }, null, 2));
  process.stdout.write(`PHASE342_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
