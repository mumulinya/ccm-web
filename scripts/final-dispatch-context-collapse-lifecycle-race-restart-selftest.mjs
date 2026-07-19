import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = "CCM_PHASE391=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    collapse: require(dist("agents", "final-dispatch-context-collapse.js")),
    lifecycle: require(dist("modules", "collaboration", "group-session-lifecycle-head.js")),
  };
}

function buildContext(label) {
  return [
    ...Array.from({ length: 360 }, (_, index) => `${label}-history-${index}: ${"durable exact session detail ".repeat(6)}`),
    `${label}-LATEST: 必须保留当前 gcs 会话约束。`,
  ].join("\n");
}

function waitForBarrier(file) {
  const deadline = Date.now() + 30_000;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw new Error(`barrier timeout: ${file}`);
    Atomics.wait(sleeper, 0, 0, 10);
  }
}

function writeResult(value) {
  process.stdout.write(`${marker}${JSON.stringify(value)}\n`);
}

function readFixture(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function runSync(stage, home, fixtureFile, barrier = "") {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), stage, fixtureFile, barrier], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 120_000,
  });
  if (child.status !== 0) {
    process.stderr.write(child.stdout || "");
    process.stderr.write(child.stderr || "");
    process.exit(child.status || 1);
  }
  const line = String(child.stdout || "").split(/\r?\n/).find(row => row.startsWith(marker));
  if (!line) throw new Error(`missing result for ${stage}`);
  return JSON.parse(line.slice(marker.length));
}

function spawnRaceStage(stage, home, fixtureFile, barrier) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), stage, fixtureFile, barrier], {
      cwd: root,
      env: { ...process.env, HOME: home, USERPROFILE: home },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) return reject(new Error(`${stage} failed (${code}): ${stderr || stdout}`));
      const line = stdout.split(/\r?\n/).find(row => row.startsWith(marker));
      if (!line) return reject(new Error(`${stage} missing result: ${stdout}`));
      resolve(JSON.parse(line.slice(marker.length)));
    });
  });
}

function setupStage(fixtureFile) {
  const { collapse, lifecycle } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase391-group-${nonce}`;
  const deleteSession = `gcs_phase391_delete_${nonce}`;
  const archiveSession = `gcs_phase391_archive_${nonce}`;
  const activeSession = `gcs_phase391_active_${nonce}`;
  const otherSession = `gcs_phase391_other_${nonce}`;
  for (const groupSessionId of [deleteSession, archiveSession, activeSession, otherSession]) lifecycle.ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "phase391_setup" });
  const activeCommit = collapse.commitFinalDispatchContextCollapse({ groupId, groupSessionId: activeSession, taskId: `task-active-${nonce}`, taskAgentSessionId: `tas_active_${nonce}`, workerContextPacketId: `wcp_active_${nonce}`, sourceContext: buildContext("ACTIVE"), tokenBudget: 3_000, trigger: "preflight_threshold" });
  fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
  fs.writeFileSync(fixtureFile, JSON.stringify({ nonce, groupId, deleteSession, archiveSession, activeSession, otherSession }, null, 2), "utf8");
  const checks = {
    deleteLifecycleStartsActive: lifecycle.readGroupSessionLifecycleHead(groupId, deleteSession)?.status === "active",
    archiveLifecycleStartsActive: lifecycle.readGroupSessionLifecycleHead(groupId, archiveSession)?.status === "active",
    activeSiblingCollapseCommitted: activeCommit.applied === true && activeCommit.receipt.lifecycle_generation === 1,
    activeSiblingReceiptValid: collapse.verifyFinalDispatchContextCollapseReceipt(activeCommit.receipt, { groupId, groupSessionId: activeSession }).valid === true,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks));
  writeResult({ pass: true, checks: Object.keys(checks).length, ...checks });
}

function raceCommitStage(fixtureFile, barrierFile, kind) {
  const { collapse } = modules();
  const fixture = readFixture(fixtureFile);
  const session = kind === "delete" ? fixture.deleteSession : fixture.archiveSession;
  waitForBarrier(barrierFile);
  const result = collapse.commitFinalDispatchContextCollapse({
    groupId: fixture.groupId,
    groupSessionId: session,
    taskId: `task-${kind}-${fixture.nonce}`,
    taskAgentSessionId: `tas_${kind}_${fixture.nonce}`,
    workerContextPacketId: `wcp_${kind}_${fixture.nonce}`,
    sourceContext: buildContext(kind.toUpperCase()),
    tokenBudget: 3_000,
    trigger: "provider_prompt_too_long",
  });
  writeResult({ pass: true, applied: result.applied === true, reason: result.reason, receipt: result.receipt ? { lifecycle_generation: result.receipt.lifecycle_generation, lifecycle_head_checksum: result.receipt.lifecycle_head_checksum } : null });
}

function raceLifecycleStage(fixtureFile, barrierFile, kind) {
  const { collapse, lifecycle } = modules();
  const fixture = readFixture(fixtureFile);
  const session = kind === "delete" ? fixture.deleteSession : fixture.archiveSession;
  waitForBarrier(barrierFile);
  const transition = lifecycle.transitionGroupSessionLifecycleHead({ groupId: fixture.groupId, groupSessionId: session, status: kind === "delete" ? "deleted" : "archived", reason: `phase391_${kind}_race` });
  const cleanup = kind === "delete" ? collapse.deleteFinalDispatchContextCollapse(fixture.groupId, session) : { deleted: 0 };
  writeResult({ pass: true, status: transition.head.status, generation: transition.head.generation, deleted: cleanup.deleted });
}

function verifyStage(fixtureFile, raceResultsFile) {
  const { collapse, lifecycle } = modules();
  const fixture = readFixture(fixtureFile);
  const raceResults = JSON.parse(fs.readFileSync(raceResultsFile, "utf8"));
  const deletedHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.deleteSession);
  const archivedHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.archiveSession);
  const activeHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.activeSession);
  const deleteFile = collapse.getFinalDispatchContextCollapseFile(fixture.groupId, fixture.deleteSession);
  const deleteProjection = collapse.projectFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.deleteSession, sourceContext: buildContext("DELETE") });
  const archiveProjection = collapse.projectFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, sourceContext: buildContext("ARCHIVE") });
  const deletedLateCommit = collapse.commitFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.deleteSession, sourceContext: buildContext("DELETE-LATE"), tokenBudget: 3_000 });
  const archivedLateCommit = collapse.commitFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, sourceContext: buildContext("ARCHIVE-LATE"), tokenBudget: 3_000 });
  const activeProjection = collapse.projectFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.activeSession, sourceContext: `${buildContext("ACTIVE")}\nACTIVE-APPENDED` });
  const archiveLedgerBeforeRestore = collapse.readFinalDispatchContextCollapse(fixture.groupId, fixture.archiveSession);
  const restored = lifecycle.transitionGroupSessionLifecycleHead({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, status: "active", reason: "phase391_restore" });
  const staleGenerationProjection = collapse.projectFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, sourceContext: buildContext("ARCHIVE") });
  const restoredCommit = collapse.commitFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, taskId: `task-restored-${fixture.nonce}`, taskAgentSessionId: `tas_restored_${fixture.nonce}`, sourceContext: buildContext("ARCHIVE"), tokenBudget: 3_000, trigger: "preflight_threshold" });
  const productionSource = fs.readFileSync(path.join(root, "backend", "agents", "final-dispatch-context-collapse.ts"), "utf8");
  const lifecycleIndex = productionSource.indexOf("withGroupSessionLifecycleCommitFence(lifecycleFence");
  const collapseLockIndex = productionSource.indexOf("withFileLock(file", lifecycleIndex);
  const checks = {
    deleteRaceProcessesBothCompleted: raceResults.delete.commit.pass === true && raceResults.delete.lifecycle.status === "deleted",
    deleteTombstoneWinsFinalState: deletedHead?.status === "deleted" && deletedHead?.generation === 2,
    deletedCollapseCannotSurviveCleanup: !fs.existsSync(deleteFile) && !fs.existsSync(`${deleteFile}.bak`),
    deletedSessionCannotProject: deleteProjection.applied === false && deleteProjection.reason === "session_lifecycle_deleted",
    deletedSessionCannotLateCommit: deletedLateCommit.applied === false && deletedLateCommit.reason === "session_lifecycle_stale" && !fs.existsSync(deleteFile),
    archiveRaceProcessesBothCompleted: raceResults.archive.commit.pass === true && raceResults.archive.lifecycle.status === "archived",
    archiveHeadWinsFinalState: archivedHead?.status === "archived" && archivedHead?.generation === 2,
    archivedSessionCannotProject: archiveProjection.applied === false && archiveProjection.reason === "session_lifecycle_archived",
    archivedSessionCannotLateCommit: archivedLateCommit.applied === false && archivedLateCommit.reason === "session_lifecycle_stale",
    archiveRaceLedgerIsBoundToOldGeneration: archiveLedgerBeforeRestore.entries.every(entry => entry.lifecycle_generation === 1 && entry.lifecycle_status === "active"),
    activeSiblingRemainsCurrent: activeHead?.status === "active" && activeHead?.generation === 1,
    activeSiblingStillProjects: activeProjection.applied === true && activeProjection.context.includes("ACTIVE-APPENDED"),
    restoreAdvancesGeneration: restored.head.status === "active" && restored.head.generation === 3,
    oldGenerationDoesNotReplayAfterRestore: staleGenerationProjection.applied === false && staleGenerationProjection.reason === "no_matching_context_prefix",
    restoredGenerationCanCommitFreshProjection: restoredCommit.applied === true && restoredCommit.receipt.lifecycle_generation === 3 && restoredCommit.receipt.lifecycle_head_checksum === restored.head.head_checksum,
    receiptLifecycleBindingVerifies: collapse.verifyFinalDispatchContextCollapseReceipt(restoredCommit.receipt, { groupId: fixture.groupId, groupSessionId: fixture.archiveSession }).valid === true,
    memoryCenterSummaryTracksRestoredLifecycle: collapse.readFinalDispatchContextCollapse(fixture.groupId, fixture.archiveSession).lifecycle?.status === "active" && collapse.readFinalDispatchContextCollapse(fixture.groupId, fixture.archiveSession).lifecycle?.generation === 3,
    lockOrderingIsLifecycleThenCollapse: lifecycleIndex > 0 && collapseLockIndex > lifecycleIndex,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, raceResults, deletedHead, archivedHead, activeHead, archiveLedgerBeforeRestore, restored: restored.head, restoredReceipt: restoredCommit.receipt }, null, 2));
  writeResult({ pass: true, checks: Object.keys(checks).length, ...checks });
}

function restartStage(fixtureFile) {
  const { collapse, lifecycle } = modules();
  const fixture = readFixture(fixtureFile);
  const deletedHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.deleteSession);
  const restoredHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.archiveSession);
  const activeHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.activeSession);
  const restoredProjection = collapse.projectFinalDispatchContextCollapse({ groupId: fixture.groupId, groupSessionId: fixture.archiveSession, sourceContext: `${buildContext("ARCHIVE")}\nRESTART-TAIL` });
  const checks = {
    deletedTombstoneSurvivesRestart: deletedHead?.status === "deleted" && deletedHead?.generation === 2,
    deletedLedgerRemainsAbsentAfterRestart: !fs.existsSync(collapse.getFinalDispatchContextCollapseFile(fixture.groupId, fixture.deleteSession)),
    restoredGenerationSurvivesRestart: restoredHead?.status === "active" && restoredHead?.generation === 3,
    restoredProjectionSurvivesRestart: restoredProjection.applied === true && restoredProjection.receipt.lifecycle_generation === 3 && restoredProjection.context.includes("RESTART-TAIL"),
    activeSiblingLifecycleSurvivesRestart: activeHead?.status === "active" && activeHead?.generation === 1,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, deletedHead, restoredHead, activeHead, restoredProjection: restoredProjection.receipt }, null, 2));
  writeResult({ pass: true, checks: Object.keys(checks).length, ...checks });
}

const stage = process.argv[2] || "orchestrate";
if (stage === "setup") setupStage(process.argv[3]);
else if (stage === "race-commit-delete") raceCommitStage(process.argv[3], process.argv[4], "delete");
else if (stage === "race-delete") raceLifecycleStage(process.argv[3], process.argv[4], "delete");
else if (stage === "race-commit-archive") raceCommitStage(process.argv[3], process.argv[4], "archive");
else if (stage === "race-archive") raceLifecycleStage(process.argv[3], process.argv[4], "archive");
else if (stage === "verify") verifyStage(process.argv[3], process.argv[4]);
else if (stage === "restart") restartStage(process.argv[3]);
else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase391-context-collapse-lifecycle-"));
  const fixtureFile = path.join(home, ".cc-connect", "phase391-fixture.json");
  const raceResultsFile = path.join(home, ".cc-connect", "phase391-races.json");
  try {
    const setup = runSync("setup", home, fixtureFile);
    const deleteBarrier = path.join(home, "delete.barrier");
    const deleteCommitPromise = spawnRaceStage("race-commit-delete", home, fixtureFile, deleteBarrier);
    const deleteLifecyclePromise = spawnRaceStage("race-delete", home, fixtureFile, deleteBarrier);
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(deleteBarrier, "go", "utf8");
    const [deleteCommit, deleteLifecycle] = await Promise.all([deleteCommitPromise, deleteLifecyclePromise]);

    const archiveBarrier = path.join(home, "archive.barrier");
    const archiveCommitPromise = spawnRaceStage("race-commit-archive", home, fixtureFile, archiveBarrier);
    const archiveLifecyclePromise = spawnRaceStage("race-archive", home, fixtureFile, archiveBarrier);
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(archiveBarrier, "go", "utf8");
    const [archiveCommit, archiveLifecycle] = await Promise.all([archiveCommitPromise, archiveLifecyclePromise]);

    const raceResults = { delete: { commit: deleteCommit, lifecycle: deleteLifecycle }, archive: { commit: archiveCommit, lifecycle: archiveLifecycle } };
    fs.writeFileSync(raceResultsFile, JSON.stringify(raceResults, null, 2), "utf8");
    const verify = runSync("verify", home, fixtureFile, raceResultsFile);
    const restart = runSync("restart", home, fixtureFile);
    process.stdout.write(`${JSON.stringify({ pass: true, checks: setup.checks + verify.checks + restart.checks, setup, races: raceResults, verify, restart }, null, 2)}\n`);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
