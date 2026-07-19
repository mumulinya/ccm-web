import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = "CCM_PHASE390=";

function buildContext(label) {
  return [
    ...Array.from({ length: 520 }, (_, index) => `${label}-history-${String(index).padStart(4, "0")}: ${"implementation detail ".repeat(7)}`),
    `${label}-LATEST-CONSTRAINT: 必须只使用所属 gcs 会话记忆。`,
    `${label}-LATEST-TASK: continue the exact child Agent task.`,
  ].join("\n");
}

function runChild(stage, home, fixtureFile) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), stage, fixtureFile], {
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
  if (!line) throw new Error(`missing Phase 390 child result for ${stage}`);
  return JSON.parse(line.slice(marker.length));
}

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    collapse: require(dist("agents", "final-dispatch-context-collapse.js")),
    reactive: require(dist("agents", "final-dispatch-reactive-compact.js")),
  };
}

function createStage(fixtureFile) {
  const { collapse, reactive } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase390-group-${nonce}`;
  const siblingGroupId = `phase390-other-${nonce}`;
  const sessionA = `gcs_phase390_a_${nonce}`;
  const sessionB = `gcs_phase390_b_${nonce}`;
  const sessionC = `gcs_phase390_c_${nonce}`;
  const taskSessionA = `tas_phase390_a_${nonce}`;
  const taskSessionB = `tas_phase390_b_${nonce}`;
  const sourceA = buildContext("A");
  const sourceB = buildContext("B");
  const identityA = { groupId, groupSessionId: sessionA, taskId: `task-a-${nonce}`, taskAgentSessionId: taskSessionA, workerContextPacketId: `wcp-a-${nonce}` };
  const identityB = { groupId, groupSessionId: sessionB, taskId: `task-b-${nonce}`, taskAgentSessionId: taskSessionB, workerContextPacketId: `wcp-b-${nonce}` };
  const identityC = { groupId, groupSessionId: sessionC, taskId: `task-c-${nonce}`, taskAgentSessionId: `tas_phase390_c_${nonce}`, workerContextPacketId: `wcp-c-${nonce}` };

  const committedA = collapse.commitFinalDispatchContextCollapse({ ...identityA, sourceContext: sourceA, tokenBudget: 4_000, trigger: "preflight_threshold", at: "2026-07-17T13:00:00.000Z" });
  const verificationA = collapse.verifyFinalDispatchContextCollapseReceipt(committedA.receipt, identityA);
  const replayA = collapse.projectFinalDispatchContextCollapse({ ...identityA, sourceContext: sourceA, at: "2026-07-17T13:01:00.000Z" });
  const appendedA = collapse.projectFinalDispatchContextCollapse({ ...identityA, sourceContext: `${sourceA}\nA-NEW-TAIL-AFTER-COMMIT`, at: "2026-07-17T13:02:00.000Z" });
  const siblingBeforeCommit = collapse.projectFinalDispatchContextCollapse({ ...identityB, sourceContext: sourceB });
  const otherGroupProjection = collapse.projectFinalDispatchContextCollapse({ ...identityA, groupId: siblingGroupId, sourceContext: sourceA });
  const committedB = collapse.commitFinalDispatchContextCollapse({ ...identityB, sourceContext: sourceB, tokenBudget: 3_500, trigger: "provider_prompt_too_long", at: "2026-07-17T13:03:00.000Z" });
  const strongerA = collapse.commitFinalDispatchContextCollapse({ ...identityA, sourceContext: sourceA, tokenBudget: 2_500, trigger: "provider_prompt_too_long", forceNew: true, at: "2026-07-17T13:04:00.000Z" });
  const ledgerA = collapse.readFinalDispatchContextCollapse(groupId, sessionA);
  const ledgerB = collapse.readFinalDispatchContextCollapse(groupId, sessionB);
  for (let index = 0; index < 30; index += 1) {
    collapse.commitFinalDispatchContextCollapse({ ...identityC, sourceContext: buildContext(`C${index}`), tokenBudget: 4_000, trigger: "preflight_threshold", at: new Date(Date.parse("2026-07-17T14:00:00.000Z") + index * 1_000).toISOString() });
  }
  const ledgerC = collapse.readFinalDispatchContextCollapse(groupId, sessionC);
  const ledgerCBytes = fs.statSync(collapse.getFinalDispatchContextCollapseFile(groupId, sessionC)).size;

  const capacity = {
    provider: "codex",
    model: "phase390-small-window",
    contextWindow: 16_000,
    reservedOutputTokens: 4_000,
    effectiveContextWindow: 12_000,
    autoCompactBufferTokens: 2_000,
    autoCompactThreshold: 10_000,
    source: "phase390_selftest",
    evidenceChecksum: "phase390-capacity",
  };
  const renderPrompt = context => `FIXED-PHASE390-CONTRACT\n${context}\nCURRENT-PHASE390-TASK`;
  const originalPrompt = renderPrompt(sourceB);
  const workerHandoff = { worker_context_packet: { packet_id: identityB.workerContextPacketId, group_session_id: sessionB, task_id: identityB.taskId, model_context_capacity: capacity } };
  const recovered = reactive.recoverFinalWorkerDispatchPayload({
    ...identityB,
    workerHandoff,
    provider: "codex",
    model: capacity.model,
    renderedPrompt: originalPrompt,
    recentContext: sourceB,
    renderPrompt,
    forceReactiveCompact: true,
  });
  const reactiveVerification = reactive.verifyFinalDispatchReactiveCompactReceipt(recovered.receipt, identityB);

  const sourceFile = collapse.getFinalDispatchContextCollapseFile(groupId, sessionA);
  fs.copyFileSync(sourceFile, `${sourceFile}.bak`);
  fs.writeFileSync(sourceFile, "{corrupt", "utf8");
  const failClosedA = collapse.readFinalDispatchContextCollapse(groupId, sessionA);
  const blockedProjectionA = collapse.projectFinalDispatchContextCollapse({ ...identityA, sourceContext: sourceA });

  const productionSource = fs.readFileSync(path.join(root, "backend", "agents", "final-dispatch-reactive-compact.ts"), "utf8");
  const lifecycleSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "group-memory-storage.ts"), "utf8");
  const commitIndex = productionSource.indexOf("commitFinalDispatchContextCollapse({");
  const projectionIndex = productionSource.indexOf("projectFinalDispatchRecentContext(contextForProjection", commitIndex);
  const checks = {
    exactSessionCommitReducesContext: committedA.applied === true && committedA.receipt.mode === "committed" && committedA.receipt.projected_tokens < committedA.receipt.original_tokens,
    durableProjectionUsesCcSectionBudget: committedA.receipt.projection_token_budget <= 2_000 && ledgerA.entries.every(entry => entry.projection_token_budget <= 2_000),
    exactSessionRetentionIsBounded: ledgerC.entries.length === 24 && ledgerC.totals.committed === 24,
    durableLedgerStaysSubMegabyte: ledgerCBytes < 512 * 1024,
    receiptIsValidAndBodyFree: verificationA.valid === true && !JSON.stringify(committedA.receipt).includes("A-history-") && !JSON.stringify(committedA.receipt).includes("A-LATEST-TASK"),
    latestTailAndConstraintRemainInModelView: committedA.context.includes("A-LATEST-CONSTRAINT") && committedA.context.includes("A-LATEST-TASK"),
    committedSpanReplaysWithoutRewrite: replayA.applied === true && replayA.receipt.mode === "reused" && replayA.context === committedA.context,
    appendedTailReusesCommittedPrefix: appendedA.applied === true && appendedA.context.includes("A-NEW-TAIL-AFTER-COMMIT"),
    siblingSessionStartsEmpty: siblingBeforeCommit.applied === false && siblingBeforeCommit.ledger.entries.length === 0,
    siblingGroupCannotReuseProjection: otherGroupProjection.applied === false && otherGroupProjection.ledger.entries.length === 0,
    siblingSessionCommitsIndependently: committedB.applied === true && ledgerB.entries.length === 1 && ledgerB.group_session_id === sessionB,
    strongerCollapseCreatesNewRevision: strongerA.applied === true && ledgerA.entries.length === 2 && ledgerA.revision === 2,
    ledgerChecksumsVerify: collapse.verifyFinalDispatchContextCollapseLedger(ledgerA, identityA).valid === true && collapse.verifyFinalDispatchContextCollapseLedger(ledgerB, identityB).valid === true,
    reactivePipelineUsesDurableCollapseFirst: recovered.recovered === true && recovered.receipt.context_collapse?.status === "applied" && recovered.receipt.recovery_stages?.[0] === "durable_context_collapse",
    reactiveReceiptVerifiesNestedCollapse: reactiveVerification.valid === true,
    corruptPrimaryFailsClosed: failClosedA.blocked === true && failClosedA.state === "fail_closed" && failClosedA.recovered_from_backup === true,
    failClosedLedgerCannotProject: blockedProjectionA.applied === false && blockedProjectionA.reason === "context_collapse_fail_closed",
    productionOrdersCollapseBeforeProjection: commitIndex > 0 && projectionIndex > commitIndex,
    sessionLifecycleDeletesCollapseLedger: lifecycleSource.includes("deleteFinalDispatchContextCollapse") && lifecycleSource.includes("finalDispatchContextCollapseArtifacts"),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, committedA: committedA.receipt, recovered: recovered.receipt, failClosedA }, null, 2));
  fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
  fs.writeFileSync(fixtureFile, JSON.stringify({ groupId, sessionB, identityB, nonce }, null, 2), "utf8");
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, checks: Object.keys(checks).length, ...checks })}\n`);
}

function restartStage(fixtureFile) {
  const { collapse } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const sourceB = buildContext("B");
  const ledger = collapse.readFinalDispatchContextCollapse(fixture.groupId, fixture.sessionB);
  const replay = collapse.projectFinalDispatchContextCollapse({ ...fixture.identityB, sourceContext: `${sourceB}\nB-RESTART-TAIL`, at: "2026-07-17T13:10:00.000Z" });
  const file = collapse.getFinalDispatchContextCollapseFile(fixture.groupId, fixture.sessionB);
  const deleted = collapse.deleteFinalDispatchContextCollapse(fixture.groupId, fixture.sessionB);
  const checks = {
    exactSessionLedgerSurvivesRestart: ledger.blocked === false && ledger.entries.length === 1 && ledger.group_session_id === fixture.sessionB,
    restartChecksumRemainsValid: collapse.verifyFinalDispatchContextCollapseLedger(ledger, fixture.identityB).valid === true,
    restartProjectionReplaysCommittedPrefix: replay.applied === true && replay.receipt.mode === "reused" && replay.context.includes("B-RESTART-TAIL"),
    restartReceiptRemainsExactAndValid: collapse.verifyFinalDispatchContextCollapseReceipt(replay.receipt, fixture.identityB).valid === true,
    lifecycleDeletionRemovesPrimaryAndBackup: deleted.deleted >= 1 && !fs.existsSync(file) && !fs.existsSync(`${file}.bak`),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, ledger, replay: replay.receipt, deleted }, null, 2));
  process.stdout.write(`${marker}${JSON.stringify({ pass: true, checks: Object.keys(checks).length, ...checks })}\n`);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "create") createStage(process.argv[3]);
else if (stage === "restart") restartStage(process.argv[3]);
else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase390-context-collapse-"));
  const fixtureFile = path.join(home, ".cc-connect", "phase390-fixture.json");
  try {
    const create = runChild("create", home, fixtureFile);
    const restart = runChild("restart", home, fixtureFile);
    process.stdout.write(`${JSON.stringify({ pass: true, checks: create.checks + restart.checks, create, restart }, null, 2)}\n`);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
