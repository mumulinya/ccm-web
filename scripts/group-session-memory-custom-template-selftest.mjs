import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", `phase343-custom-template-${process.pid}-${Date.now().toString(36)}`);
const home = path.join(scratch, "home");
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
let model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const compact = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = "phase343-group-a";
const siblingGroupId = "phase343-group-b";
const sessionId = storage.createGroupChatSession(groupId, "Phase 343 exact template").id;
const siblingSessionId = storage.createGroupChatSession(siblingGroupId, "Phase 343 inherited template").id;
const scopeId = `${groupId}--${sessionId}`;
const siblingScopeId = `${siblingGroupId}--${siblingSessionId}`;
const globalTemplate = `# Session Focus
_The central objective and success condition._

# Current State
_Active work, pending tasks, and immediate next steps._

# Worklog
_Terse chronological implementation and verification record._`;
const exactTemplate = `# Session Name
_A precise title for this exact group conversation._

# Current State
_Active work, blockers, and immediate next actions._

# Corrections
_User corrections, failed approaches, and superseded decisions._

# Worklog
_Terse chronological implementation and verification record._`;
const exactMarkdown = `# Session Name
_A precise title for this exact group conversation._
- Phase 343 exact custom template

# Current State
_Active work, blockers, and immediate next actions._
- Custom template extraction is complete.

# Corrections
_User corrections, failed approaches, and superseded decisions._
- Preserve exact-session isolation.

# Worklog
_Terse chronological implementation and verification record._
- Built, replayed, and compact-projected the custom structure.`;
const messages = [
  { id: "phase343-user", role: "user", content: "Use the exact custom Session Memory structure and preserve isolation.", group_session_id: sessionId },
  { id: "phase343-assistant", role: "assistant", content: "Implemented and verified the custom structure.", group_session_id: sessionId },
];

try {
  const globalSaved = model.saveGroupSessionMemoryCustomTemplate("", globalTemplate);
  const inheritedBefore = model.readGroupSessionMemoryCustomTemplateProfile(siblingScopeId);
  const exactSaved = model.saveGroupSessionMemoryCustomTemplate(scopeId, exactTemplate);
  const siblingRead = model.readGroupSessionMemoryCustomTemplateProfile(siblingScopeId);
  const parsed = model.parseGroupSessionMemoryTemplate(exactTemplate);
  const direct = model.buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes: exactTemplate,
    messages,
    requiredTemplate: exactTemplate,
    customTemplateSource: "exact_session",
  });
  const validated = model.validateGroupSessionMemoryModelOutput(`<session_memory>\n${exactMarkdown}\n</session_memory>`, exactTemplate);
  const quality = model.analyzeGroupSessionMemoryModelMergeQuality({
    currentNotes: exactTemplate,
    markdown: validated.markdown,
    sourceText: JSON.stringify(messages),
    sourceTranscriptChecksum: direct.audit.sourceTranscriptChecksum,
    requiredTemplate: exactTemplate,
  });
  let defaultRejected = false;
  let nestedRejected = false;
  let descriptionRejected = false;
  try { model.validateGroupSessionMemoryModelOutput(`<session_memory>\n${exactMarkdown}\n</session_memory>`); } catch { defaultRejected = true; }
  try { model.parseGroupSessionMemoryTemplate("# Root\n_Description_\n## Nested\n_Text_"); } catch { nestedRejected = true; }
  try { model.parseGroupSessionMemoryTemplate("# Root\nDescription without italics"); } catch { descriptionRejected = true; }

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
    observedAt: "2026-07-16T03:00:00.000Z",
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
      return { output: `<session_memory>\n${exactMarkdown}\n</session_memory>`, project: "phase343", agentType: "codex", model: "stub" };
    },
  });
  assert.equal(extraction.committed, true, JSON.stringify(extraction, null, 2));
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json"), "utf8"));
  const projection = compact.buildGroupSessionMemoryCompactProjection({
    groupId,
    groupSessionId: sessionId,
    summaryFile: snapshot.summaryFile,
    markdown: fs.readFileSync(snapshot.summaryFile, "utf8"),
    originalMarkdownChecksum: snapshot.markdownChecksum,
    maxSectionTokens: 2000,
    maxTotalTokens: 12000,
  });
  const projectionVerification = compact.verifyGroupSessionMemoryCompactProjection(projection.receipt, {
    groupId,
    groupSessionId: sessionId,
    summaryFile: snapshot.summaryFile,
    originalMarkdownChecksum: snapshot.markdownChecksum,
    projectedMarkdown: projection.markdown,
  });

  const moduleFile = require.resolve(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
  delete require.cache[moduleFile];
  model = require(moduleFile);
  const restartedProfile = model.readGroupSessionMemoryCustomTemplateProfile(scopeId);
  const replay = model.replayGroupSessionMemoryModelExtraction(scopeId, receipt.executionId);
  const reset = model.saveGroupSessionMemoryCustomTemplate(scopeId, "", { reset: true });
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId, siblingGroupId] });
  const row = fleet.groups.find(item => item.groupId === groupId && item.groupSessionId === sessionId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");

  const checks = {
    globalTemplateSaved: globalSaved.source === "global" && globalSaved.sectionCount === 3,
    siblingInheritsGlobal: inheritedBefore.source === "global" && inheritedBefore.checksum === globalSaved.checksum,
    exactOverrideSaved: exactSaved.source === "exact_session" && exactSaved.sectionCount === 4,
    exactOverrideIsolated: siblingRead.source === "global" && siblingRead.checksum !== exactSaved.checksum,
    templateParserStable: parsed.sectionCount === 4 && parsed.sections[2][0] === "# Corrections",
    invalidStructuresRejected: nestedRejected && descriptionRejected,
    promptUsesDynamicContract: direct.prompt.includes("exactly the 4 configured section headers") && direct.prompt.includes("# Corrections") && !direct.prompt.includes("# Task specification"),
    templateCountedInBudget: direct.audit.fixedInputTokens > 3500 && direct.audit.customTemplateSectionCount === 4,
    customOutputValidates: validated.templateChecksum === parsed.checksum && validated.templateSectionCount === 4,
    defaultTemplateRejectsCustomOutput: defaultRejected,
    dynamicMergeQualityPasses: quality.pass === true && quality.sectionCount === 4 && quality.templateChecksum === parsed.checksum,
    executorReceivesExactTemplate: capturedPrompt.includes("# Corrections") && capturedPrompt.includes("exactly the 4 configured section headers"),
    receiptBindsTemplate: receipt.requestAudit.customTemplateSource === "exact_session" && receipt.templateChecksum === parsed.checksum && receipt.templateSectionCount === 4,
    compactProjectionPreservesCustomSections: projection.receipt.section_count === 4 && projection.markdown.includes("# Corrections") && projectionVerification.valid === true,
    restartLoadsExactTemplate: restartedProfile.source === "exact_session" && restartedProfile.checksum === exactSaved.checksum,
    signedReplayPasses: replay.pass === true && replay.checks.customTemplateChecksumMatches === true && replay.checks.templateReceiptMatches === true,
    resetRestoresGlobalInheritance: reset.source === "global" && reset.sectionCount === 3 && reset.exactSession.present === false,
    memoryCenterRowVisible: row?.modelCustomTemplateConfigured === true && row?.modelCustomTemplateSource === "exact_session" && row?.modelCustomTemplateSectionCount === 4,
    memoryCenterFleetVisible: fleet.overall?.modelCustomTemplateConfiguredSessionCount === 1 && fleet.overall?.modelCustomTemplateExactSessionCount === 1,
    memoryCenterEditorPresent: uiSource.includes("session-memory-custom-template") && uiSource.includes("sessionMemoryTemplateContent") && uiSource.includes("保存模板"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, directAudit: direct.audit, receipt, replay, projection: projection.receipt, row, fleet: fleet.overall }, null, 2));
  process.stdout.write(`PHASE343_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
