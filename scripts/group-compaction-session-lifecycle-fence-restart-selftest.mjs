import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const prefix = "PHASE386_STAGE_";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    lifecycle: require(dist("modules", "collaboration", "group-session-lifecycle-head.js")),
    compactHead: require(dist("modules", "collaboration", "group-compact-head.js")),
    circuit: require(dist("modules", "collaboration", "group-memory-auto-compact-circuit-breaker.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function messagesFor(groupSessionId, label) {
  return Array.from({ length: 34 }, (_, index) => ({
    id: `${label}-${index}`,
    group_session_id: groupSessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    target: index % 2 === 0 ? "all" : undefined,
    agent: index % 2 === 0 ? undefined : "group-main",
    timestamp: new Date(Date.parse("2026-07-17T06:00:00.000Z") + index * 60_000).toISOString(),
    content: `${label} exact-session compaction lifecycle requirement ${index}. Keep decisions, pending work, and src/${label}-${index}.ts. ${"context ".repeat(1200)}`,
  }));
}

function summaryResponse(label) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          primaryRequest: `Continue ${label}.`,
          userMessages: [],
          keyConcepts: ["exact-session lifecycle fence"],
          filesAndCode: [],
          errorsAndFixes: [],
          decisions: ["Do not commit compaction into archived or deleted sessions."],
          completedWork: [],
          pendingTasks: [`Verify ${label}.`],
          currentWork: `Continue ${label}.`,
          nextStep: `Verify ${label}.`,
          participantState: [],
          taskStates: [],
        }),
      },
    }],
    usage: { prompt_tokens: 1200, completion_tokens: 180, total_tokens: 1380 },
  };
}

async function createRaceServer(onRequest, label) {
  let requestCount = 0;
  let mutation = null;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      requestCount += 1;
      try {
        mutation = onRequest();
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(summaryResponse(label)));
      } catch (error) {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: String(error?.message || error) }));
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    server,
    port: server.address().port,
    state: () => ({ requestCount, mutation }),
  };
}

async function runCompaction(memory, groupId, groupSessionId, port, label) {
  return memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: groupSessionId,
    force: true,
    reason: `phase386_${label}`,
    config: {
      enabled: true,
      format: "openai-compatible",
      apiUrl: `http://127.0.0.1:${port}/v1`,
      apiKey: "phase386-local-fixture-key",
      model: "phase386-local-model",
      timeoutMs: 30_000,
      memoryCompactionUseModel: true,
      sessionMemoryCompactEnabled: false,
      modelContextWindow: 200_000,
      modelAutoCompactTokenLimit: 167_000,
      memoryCompactionMaxInputTokens: 120_000,
    },
  });
}

async function runWithServer(serverState, operation) {
  try {
    return await operation(serverState.port);
  } finally {
    await new Promise(resolve => serverState.server.close(resolve));
  }
}

function parseStage(output, stage) {
  const marker = `${prefix}${stage}=`;
  const line = String(output || "").split(/\r?\n/).find(row => row.startsWith(marker));
  if (!line) throw new Error(`missing ${marker}:\n${output}`);
  return JSON.parse(line.slice(marker.length));
}

async function createStage(stateFile) {
  const { memory, storage, lifecycle, compactHead, circuit, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase386-group-${nonce}`;
  const deletedSession = storage.createGroupChatSession(groupId, "Phase 386 delete race");
  const archivedSession = storage.createGroupChatSession(groupId, "Phase 386 archive race");
  const activeSession = storage.createGroupChatSession(groupId, "Phase 386 active sibling");
  for (const [session, label] of [[deletedSession, "deleted"], [archivedSession, "archived"], [activeSession, "active"]]) {
    storage.saveGroupMessages(groupId, messagesFor(session.id, label), session.id);
    memory.saveGroupMemory(groupId, { goal: `${label} lifecycle fence`, decisions: [{ decision: `${label}-baseline` }] }, session.id);
  }

  const deletedMemoryFile = memory.getGroupMemoryFile(groupId, deletedSession.id);
  const deletedRace = await createRaceServer(() => {
    const deletion = storage.deleteGroupChatSession(groupId, deletedSession.id, { force: true, reason: "phase386_delete_during_model_compact" });
    const artifacts = memory.deleteGroupSessionMemoryArtifacts(groupId, deletedSession.id);
    return { deletion, artifacts };
  }, "delete-race");
  const deletedResult = await runWithServer(deletedRace, port => runCompaction(memory, groupId, deletedSession.id, port, "delete_race"));

  const archivedMemoryFile = memory.getGroupMemoryFile(groupId, archivedSession.id);
  const archivedBefore = fs.readFileSync(archivedMemoryFile, "utf8");
  const archivedRace = await createRaceServer(() => storage.archiveGroupChatSession(groupId, archivedSession.id, true), "archive-race");
  const archivedResult = await runWithServer(archivedRace, port => runCompaction(memory, groupId, archivedSession.id, port, "archive_race"));
  const archivedAfter = fs.readFileSync(archivedMemoryFile, "utf8");

  const activeServer = await createRaceServer(() => ({ unchanged: true }), "active-sibling");
  const activeResult = await runWithServer(activeServer, port => runCompaction(memory, groupId, activeSession.id, port, "active_sibling"));
  const activeMemory = memory.loadGroupMemory(groupId, activeSession.id);

  const directHead = lifecycle.ensureGroupSessionLifecycleHead(groupId, activeSession.id).head;
  const validFence = {
    required: true,
    groupId,
    groupSessionId: activeSession.id,
    lifecycleGeneration: directHead.generation,
    lifecycleStatus: directHead.status,
    lifecycleHeadId: directHead.lifecycle_head_id,
    lifecycleHeadChecksum: directHead.head_checksum,
  };
  let callbackRan = false;
  const atomicValue = lifecycle.withGroupSessionLifecycleCommitFence(validFence, state => {
    callbackRan = true;
    return state.validation.status;
  });
  let forgedRejected = false;
  try {
    lifecycle.withGroupSessionLifecycleCommitFence({ ...validFence, lifecycleGeneration: directHead.generation - 1 }, () => "forged");
  } catch (error) {
    forgedRejected = error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
  }

  const checks = {
    deleteRaceReachedRealModel: deletedRace.state().requestCount === 1,
    deleteRaceRejectedStaleCommit: deletedResult.success === false
      && deletedResult.reason === "session_lifecycle_stale"
      && deletedResult.lifecycleValidation?.issues?.some(issue => /deleted|generation_stale|head_id_stale|checksum_stale/.test(issue)),
    deletedSessionRemainsTombstoned: lifecycle.readGroupSessionLifecycleHead(groupId, deletedSession.id)?.status === "deleted",
    deletedMemoryNotResurrected: !fs.existsSync(deletedMemoryFile),
    deletedCompactHeadNotCreated: compactHead.readGroupCompactHead(groupId, deletedSession.id) === null,
    deletedCircuitBreakerNotRecreated: !fs.existsSync(circuit.getGroupMemoryAutoCompactCircuitBreakerFile(groupId, deletedSession.id)),
    archiveRaceReachedRealModel: archivedRace.state().requestCount === 1,
    archiveRaceRejectedStaleCommit: archivedResult.success === false
      && archivedResult.reason === "session_lifecycle_stale"
      && archivedResult.lifecycleValidation?.issues?.some(issue => /archived|generation_stale|head_id_stale|checksum_stale/.test(issue)),
    archivedLifecycleRetained: lifecycle.readGroupSessionLifecycleHead(groupId, archivedSession.id)?.status === "archived",
    archivedMemoryByteStable: archivedAfter === archivedBefore,
    archivedCompactHeadNotCreated: compactHead.readGroupCompactHead(groupId, archivedSession.id) === null,
    activeSiblingReachedRealModel: activeServer.state().requestCount === 1,
    activeSiblingCompacted: activeResult.success === true && activeResult.compacted === true,
    activeSiblingLifecycleValidated: activeResult.lifecycleValidation?.valid === true,
    activeSiblingPersistedBoundary: !!activeMemory.compactBoundary?.id && !!compactHead.readGroupCompactHead(groupId, activeSession.id),
    activeSiblingCommitProofValid: lifecycle.verifyGroupCompactionLifecycleCommitProof(activeMemory.compaction?.compactionLifecycleCommitProof, {
      groupId,
      groupSessionId: activeSession.id,
      boundaryId: activeMemory.compactBoundary?.id,
      compactTransactionReceiptChecksum: activeMemory.compaction?.compactTransactionReceipt?.receipt_checksum,
    }).valid === true,
    scopesRemainIndependent: activeMemory.groupSessionId === activeSession.id
      && !fs.existsSync(deletedMemoryFile)
      && memory.loadGroupMemory(groupId, archivedSession.id).groupSessionId === archivedSession.id,
    atomicFenceRunsForCurrentGeneration: callbackRan && atomicValue === "current_active",
    forgedGenerationRejected: forgedRejected,
  };
  if (Object.values(checks).some(pass => pass !== true)) {
    console.error(JSON.stringify({
      deletedResult,
      deletedRace: deletedRace.state(),
      archivedResult,
      archivedRace: archivedRace.state(),
      activeResult,
      activeServer: activeServer.state(),
      checks,
    }, null, 2));
  }
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  fs.writeFileSync(stateFile, `${JSON.stringify({ groupId, deletedSessionId: deletedSession.id, archivedSessionId: archivedSession.id, activeSessionId: activeSession.id, activeBoundaryId: activeMemory.compactBoundary.id, checks: Object.keys(checks).length }, null, 2)}\n`, "utf8");
  console.log(`${prefix}create=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

function restartStage(stateFile) {
  const { memory, lifecycle, compactHead, circuit, center } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const deletedMemoryFile = memory.getGroupMemoryFile(state.groupId, state.deletedSessionId);
  const archivedMemory = memory.loadGroupMemory(state.groupId, state.archivedSessionId);
  const activeMemory = memory.loadGroupMemory(state.groupId, state.activeSessionId);
  const checks = {
    deletedTombstoneSurvivesRestart: lifecycle.readGroupSessionLifecycleHead(state.groupId, state.deletedSessionId)?.status === "deleted",
    deletedMemoryStillAbsentAfterRestart: !fs.existsSync(deletedMemoryFile),
    deletedCompactHeadStillAbsentAfterRestart: compactHead.readGroupCompactHead(state.groupId, state.deletedSessionId) === null,
    deletedCircuitStillAbsentAfterRestart: !fs.existsSync(circuit.getGroupMemoryAutoCompactCircuitBreakerFile(state.groupId, state.deletedSessionId)),
    archivedLifecycleSurvivesRestart: lifecycle.readGroupSessionLifecycleHead(state.groupId, state.archivedSessionId)?.status === "archived",
    archivedSessionStillUncompacted: !archivedMemory.compactBoundary?.id,
    activeLifecycleSurvivesRestart: lifecycle.readGroupSessionLifecycleHead(state.groupId, state.activeSessionId)?.status === "active",
    activeBoundarySurvivesRestart: activeMemory.compactBoundary?.id === state.activeBoundaryId,
    activeCompactHeadSurvivesRestart: compactHead.readGroupCompactHead(state.groupId, state.activeSessionId)?.boundary_id === state.activeBoundaryId,
    activeCommitProofSurvivesRestart: lifecycle.verifyGroupCompactionLifecycleCommitProof(activeMemory.compaction?.compactionLifecycleCommitProof, {
      groupId: state.groupId,
      groupSessionId: state.activeSessionId,
      boundaryId: state.activeBoundaryId,
      compactTransactionReceiptChecksum: activeMemory.compaction?.compactTransactionReceipt?.receipt_checksum,
    }).valid === true,
  };
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  console.log(`${prefix}restart=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

function runChild(stage, home, stateFile) {
  const result = spawnSync(process.execPath, [file, stage, stateFile], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${stage} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return parseStage(result.stdout, stage);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "create") {
  await createStage(process.argv[3]);
} else if (stage === "restart") {
  restartStage(process.argv[3]);
} else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase386-compaction-lifecycle-"));
  const stateFile = path.join(home, "phase386-state.json");
  try {
    const create = runChild("create", home, stateFile);
    const restart = runChild("restart", home, stateFile);
    console.log(JSON.stringify({ pass: true, checks: create.checks + restart.checks, create, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
