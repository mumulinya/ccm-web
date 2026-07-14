import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const modelFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js");
const model = require(modelFile);
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = `phase233-artifact-retention-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_retention_a`;
const sessionB = `gcs_${Date.now().toString(36)}_retention_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const marker = "PHASE233_ARCHIVE_BODY_MUST_NOT_REACH_GLOBAL_AGENT";
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- ${marker}_${index}` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

function cleanupSession(sessionId) {
  memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId);
  const messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
}

function cleanupEmptyParents() {
  const parents = [
    path.dirname(memory.getGroupMemoryFile(groupId, sessionA)),
    path.dirname(storage.getGroupChatSessionMessagesFile(groupId, sessionA)),
  ];
  for (const dir of parents) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    } catch {}
  }
}

async function runSuccessfulExtraction(sessionId, sequence) {
  return model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    force: true,
    respectBackoff: false,
    executor: async request => ({
      output: validOutput,
      project: "phase233-retention-stub",
      agentType: "codex",
      nativeSessionId: `phase233-${sequence}-${request.executionId}`,
    }),
  });
}

function runRetentionProcess() {
  const code = `const m=require(${JSON.stringify(modelFile)});const r=m.runGroupSessionMemoryModelExtractionArtifactRetention(${JSON.stringify(scopeA)},{dryRun:false,hotExecutionLimit:2,maxHotMb:10240,maxAgeDays:3650});process.stdout.write(JSON.stringify({status:r.status,archived:r.archivedThisRun}));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: root, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", codeValue => codeValue === 0 ? resolve(stdout) : reject(new Error(`retention child ${codeValue}: ${stderr}`)));
  });
}

try {
  const messagesA = [{ id: "phase233-a-1", role: "user", content: `${marker} ${"会话 A 证据。".repeat(80)}`, group_session_id: sessionA }];
  const messagesB = [{ id: "phase233-b-1", role: "user", content: "PHASE233_SESSION_B_ISOLATED", group_session_id: sessionB }];
  storage.saveGroupMessages(groupId, messagesA, sessionA);
  storage.saveGroupMessages(groupId, messagesB, sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const successes = [];
  for (let index = 0; index < 6; index += 1) successes.push(await runSuccessfulExtraction(sessionA, index));
  const failed = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: async () => "invalid phase233 model output",
  });
  const successB = await runSuccessfulExtraction(sessionB, "b");
  assert.equal(successes.every(row => row.committed === true), true);
  assert.equal(failed.status, "failed");
  assert.equal(successB.committed, true);

  const preview = model.runGroupSessionMemoryModelExtractionArtifactRetention(scopeA, {
    dryRun: true,
    hotExecutionLimit: 2,
    maxHotMb: 10240,
    maxAgeDays: 3650,
  });
  const interruptedCandidate = preview.candidates[0];
  assert.ok(interruptedCandidate);
  const interruptedArtifact = interruptedCandidate.artifacts[0];
  const archiveDir = path.join(path.dirname(model.getGroupSessionMemoryModelExtractionArtifactRetentionManifestFile(scopeA)), "model-extraction-artifact-archive");
  const preCopiedArchive = path.join(archiveDir, path.basename(interruptedArtifact.file));
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.copyFileSync(interruptedArtifact.file, preCopiedArchive);

  const applied = model.runGroupSessionMemoryModelExtractionArtifactRetention(scopeA, {
    dryRun: false,
    hotExecutionLimit: 2,
    maxHotMb: 10240,
    maxAgeDays: 3650,
  });
  const manifestState = model.readGroupSessionMemoryModelExtractionArtifactRetentionManifest(scopeA, { verifyArtifacts: true });
  const archivedExecutionId = successes[0].executionId;
  const archivedRequest = model.readGroupSessionMemoryModelExtractionArtifact(scopeA, archivedExecutionId, "request");
  const archivedReplay = model.replayGroupSessionMemoryModelExtraction(scopeA, archivedExecutionId);
  const latestFailureRequest = model.readGroupSessionMemoryModelExtractionArtifact(scopeA, failed.executionId, "request");
  const latestSuccessRequest = model.readGroupSessionMemoryModelExtractionArtifact(scopeA, successes.at(-1).executionId, "request");
  const scopeBBefore = model.inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeB);

  const archiveEntry = manifestState.entries.find(row => row.executionId === archivedExecutionId && row.kind === "request");
  const archiveOriginal = fs.readFileSync(archiveEntry.archiveFile);
  fs.writeFileSync(archiveEntry.archiveFile, Buffer.from("tampered archive"));
  const tamperedArchive = model.readGroupSessionMemoryModelExtractionArtifact(scopeA, archivedExecutionId, "request");
  fs.writeFileSync(archiveEntry.archiveFile, archiveOriginal);

  const manifestFile = model.getGroupSessionMemoryModelExtractionArtifactRetentionManifestFile(scopeA);
  const manifestOriginal = fs.readFileSync(manifestFile, "utf-8");
  const tamperedManifestJson = JSON.parse(manifestOriginal);
  tamperedManifestJson.entries[0].compressedBytes += 1;
  fs.writeFileSync(manifestFile, `${JSON.stringify(tamperedManifestJson, null, 2)}\n`, "utf-8");
  const tamperedManifest = model.inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeA);
  fs.writeFileSync(manifestFile, manifestOriginal, "utf-8");

  for (let index = 6; index < 10; index += 1) successes.push(await runSuccessfulExtraction(sessionA, index));
  await Promise.all([runRetentionProcess(), runRetentionProcess()]);
  const afterConcurrent = model.inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeA, {
    hotExecutionLimit: 2,
    maxHotMb: 10240,
    maxAgeDays: 3650,
  });
  const scopeBAfter = model.inspectGroupSessionMemoryModelExtractionArtifactRetention(scopeB);
  const globalContext = memory.buildGlobalGroupMemoryContext("route only");

  const checks = {
    previewFindsOldExecutions: preview.dryRun === true && preview.candidateExecutionCount >= 4,
    copyFirstInterruptionRecovers: applied.archivedThisRun > 0 && !fs.existsSync(interruptedArtifact.file) && fs.existsSync(preCopiedArchive),
    manifestBindsArchiveChecksums: manifestState.valid === true && manifestState.archivedExecutionCount >= 4 && manifestState.archivedBytes > 0,
    newestSuccessAndFailureRemainHot: latestSuccessRequest.tier === "hot" && latestFailureRequest.tier === "hot",
    archivedArtifactReadsFromColdTier: archivedRequest.valid === true && archivedRequest.tier === "archive" && archivedRequest.storageFile === archiveEntry.archiveFile,
    replayWorksFromArchive: archivedReplay.pass === true && archivedReplay.request.tier === "archive" && archivedReplay.result.tier === "archive",
    tamperedArchiveFailsClosed: tamperedArchive.valid === false && tamperedArchive.tier === "archive",
    tamperedManifestFailsClosed: tamperedManifest.status === "fail" && tamperedManifest.manifest.valid === false,
    concurrentRetentionIsIdempotent: afterConcurrent.manifest.valid === true && afterConcurrent.candidateExecutionCount === 0,
    otherSessionIsUntouched: scopeBBefore.hotArtifactCount === scopeBAfter.hotArtifactCount && scopeBAfter.archivedArtifactCount === 0,
    globalAgentGetsNoArtifactBodyOrPath: !JSON.stringify(globalContext).includes(marker) && !JSON.stringify(globalContext).includes("model-extraction-artifact-archive"),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, preview, applied, manifestState, archivedReplay, afterConcurrent, scopeBBefore, scopeBAfter }, null, 2));

  const archiveRoot = path.dirname(manifestFile);
  cleanupSession(sessionA);
  cleanupSession(sessionB);
  cleanupEmptyParents();
  checks.sessionDeletionRemovesHotColdManifestAndLocks = !fs.existsSync(archiveRoot)
    && !fs.existsSync(model.getGroupSessionMemoryModelExtractionArtifactRetentionManifestFile(scopeA));
  assert.equal(checks.sessionDeletionRemovesHotColdManifestAndLocks, true);
  process.stdout.write(`${JSON.stringify({ pass: true, checks, archived: manifestState.archivedArtifactCount }, null, 2)}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { cleanupSession(sessionA); } catch {}
  try { cleanupSession(sessionB); } catch {}
  cleanupEmptyParents();
}
