import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "worker-context-compact-session-strategy-isolation-selftest");
const home = path.join(scratch, "home");
const orchestratorFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js");
const memoryFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js");
const groupId = "phase304-worker-compact-session";
const sessionA = "gcs_phase304_a";
const sessionB = "gcs_phase304_b";
const sentinel = "PHASE304_PRIVATE_TASK_BODY_MUST_NOT_PERSIST";
const require = createRequire(import.meta.url);

function childEnv() {
  return { ...process.env, HOME: home, USERPROFILE: home, CCM_SELFTEST_HOME: home };
}

function parseResult(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines.at(-1) || "{}");
}

function childArgs(action, payload = {}) {
  return [fileURLToPath(import.meta.url), "--child", action, JSON.stringify(payload)];
}

function runChild(action, payload = {}) {
  const result = spawnSync(process.execPath, childArgs(action, payload), {
    cwd: root,
    env: childEnv(),
    encoding: "utf8",
    timeout: 45_000,
  });
  if (result.status !== 0) throw new Error(`${action} failed (${result.status}): ${result.stderr || result.stdout}`);
  return parseResult(result.stdout);
}

function runChildAsync(action, payload = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, childArgs(action, payload), {
      cwd: root,
      env: childEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${action} timed out: ${stderr}`));
    }, 45_000);
    child.stdout.on("data", chunk => { stdout += String(chunk); });
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.once("error", reject);
    child.once("exit", code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${action} failed (${code}): ${stderr || stdout}`));
      else resolve(parseResult(stdout));
    });
  });
}

if (process.argv[2] === "--child") {
  const action = process.argv[3];
  const payload = JSON.parse(process.argv[4] || "{}");
  const orchestrator = require(orchestratorFile);
  if (action === "worker") {
    const input = {
      group: {
        id: payload.groupId,
        members: [
          { project: "coordinator", role: "coordinator" },
          { project: "api", agent: "codex" },
        ],
      },
      message: `请在 api 项目实现 ${payload.label || "phase304"}，${sentinel}，并运行验证。${" context pressure".repeat(3400)}`,
      workerContextUsageOptions: { maxTokens: 1800, autoCompactBufferTokens: 120 },
      workerContextRetryOptions: { maxTaskChars: 1800 },
    };
    if (payload.groupSessionId) input.groupSessionId = payload.groupSessionId;
    const result = orchestrator.runCodedGroupOrchestrator(input);
    const assignment = (result.assignments || []).find(row => row.project === "api") || {};
    process.stdout.write(`${JSON.stringify({
      group_session_id: assignment.group_session_id || "",
      packet_group_session_id: assignment.worker_context_packet?.group_session_id || "",
      retry_status: assignment.context_compaction_retry?.status || "",
      ptl_engaged: assignment.context_compaction_retry?.ptl_emergency_hint?.engaged === true,
    })}\n`);
  } else if (action === "read") {
    const hook = orchestrator.readWorkerContextCompactHookLedgerForCoordinator(payload.groupId, payload.groupSessionId || "");
    const outcome = orchestrator.readWorkerContextCompactOutcomeLedgerForCoordinator(payload.groupId, payload.groupSessionId || "");
    const strategy = orchestrator.readWorkerContextCompactStrategyMemoryForCoordinator(payload.groupId, payload.groupSessionId || "");
    const ptl = orchestrator.readWorkerContextPtlEmergencyHintForCoordinator(payload.groupId, payload.groupSessionId || "");
    const summary = payload.groupSessionId
      ? orchestrator.readWorkerContextCompactSessionArtifactsForCoordinator(payload.groupId, payload.groupSessionId)
      : null;
    process.stdout.write(`${JSON.stringify({ hook, outcome, strategy, ptl, summary })}\n`);
  } else if (action === "delete") {
    const memory = require(memoryFile);
    process.stdout.write(`${JSON.stringify(memory.deleteGroupSessionMemoryArtifacts(payload.groupId, payload.groupSessionId))}\n`);
  } else {
    throw new Error(`unknown child action: ${action}`);
  }
  process.exit(0);
}

fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });

const blockedRuns = [1, 2, 3].map(index => runChild("worker", {
  groupId,
  groupSessionId: sessionA,
  label: `session-a-${index}`,
}));
const sessionAAfterFailures = runChild("read", { groupId, groupSessionId: sessionA });
const sessionBBeforeWork = runChild("read", { groupId, groupSessionId: sessionB });
const legacyRun = runChild("worker", { groupId, label: "legacy-unscoped" });
const legacyLedger = runChild("read", { groupId });
const sessionAAfterLegacy = runChild("read", { groupId, groupSessionId: sessionA });

const beforeConcurrent = Number(sessionAAfterLegacy.outcome?.stats?.total || 0);
const concurrentRuns = await Promise.all([
  runChildAsync("worker", { groupId, groupSessionId: sessionA, label: "concurrent-one" }),
  runChildAsync("worker", { groupId, groupSessionId: sessionA, label: "concurrent-two" }),
]);
const sessionAAfterConcurrent = runChild("read", { groupId, groupSessionId: sessionA });

const roots = [
  "group-memory-worker-context-compact-hooks",
  "group-memory-worker-context-compact-outcomes",
  "group-memory-worker-context-compact-strategies",
  "group-memory-worker-context-ptl-emergencies",
].map(name => path.join(home, ".cc-connect", name));
const rawFiles = roots.flatMap(dir => fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath || entry.path, entry.name))
  : []);
const rawText = rawFiles.map(file => fs.readFileSync(file, "utf8")).join("\n");

const deletion = runChild("delete", { groupId, groupSessionId: sessionA });
const sessionAAfterDelete = runChild("read", { groupId, groupSessionId: sessionA });
const sessionBAfterDelete = runChild("read", { groupId, groupSessionId: sessionB });

const exactEntries = sessionAAfterConcurrent.outcome?.entries || [];
const exactHooks = sessionAAfterConcurrent.hook?.entries || [];
const checks = {
  productionWorkersBindExactSession: blockedRuns.every(row => row.group_session_id === sessionA && row.packet_group_session_id === sessionA),
  repeatedFailuresEngageSessionPtl: blockedRuns.every(row => row.retry_status === "blocked")
    && sessionAAfterFailures.ptl?.engaged === true
    && Number(sessionAAfterFailures.ptl?.blocked_outcome_count || 0) >= 2,
  siblingSessionStartsEmpty: Number(sessionBBeforeWork.outcome?.stats?.total || 0) === 0
    && sessionBBeforeWork.ptl?.engaged === false
    && Number(sessionBBeforeWork.strategy?.sample_count || 0) === 0,
  legacyScopeRemainsSeparate: legacyRun.group_session_id === ""
    && Number(legacyLedger.outcome?.stats?.total || 0) === 1
    && Number(sessionAAfterLegacy.outcome?.stats?.total || 0) === Number(sessionAAfterFailures.outcome?.stats?.total || 0),
  exactSessionUsesDistinctFiles: sessionAAfterFailures.hook?.file !== legacyLedger.hook?.file
    && sessionAAfterFailures.outcome?.file !== legacyLedger.outcome?.file
    && sessionAAfterFailures.strategy?.file !== legacyLedger.strategy?.file
    && sessionAAfterFailures.ptl?.file !== legacyLedger.ptl?.file,
  concurrentProcessesDoNotLoseOutcomes: Number(sessionAAfterConcurrent.outcome?.stats?.total || 0) === beforeConcurrent + 2,
  concurrentProcessesDoNotLoseHooks: Number(sessionAAfterConcurrent.hook?.stats?.total || 0) === Number(sessionAAfterLegacy.hook?.stats?.total || 0) + 4,
  concurrentWorkersRemainSessionBound: concurrentRuns.every(row => row.group_session_id === sessionA && row.packet_group_session_id === sessionA),
  everyExactOutcomeBindsSession: exactEntries.length >= 5 && exactEntries.every(entry => entry.group_id === groupId && entry.group_session_id === sessionA),
  everyExactHookBindsSession: exactHooks.length >= 10 && exactHooks.every(entry => entry.group_id === groupId && entry.group_session_id === sessionA),
  summaryExposesExactScope: sessionAAfterConcurrent.summary?.status === "ok"
    && sessionAAfterConcurrent.summary?.groupSessionId === sessionA
    && sessionAAfterConcurrent.summary?.ptlEmergency?.engaged === true,
  ledgersRemainBodyFree: !rawText.includes(sentinel),
  sessionDeletionRemovesFourArtifactFamilies: Number(deletion.workerContextCompactSessionArtifacts?.deleted || 0) >= 4
    && Number(sessionAAfterDelete.outcome?.stats?.total || 0) === 0
    && Number(sessionAAfterDelete.hook?.stats?.total || 0) === 0,
  deletingSessionDoesNotTouchSibling: Number(sessionBAfterDelete.outcome?.stats?.total || 0) === 0
    && sessionBAfterDelete.outcome?.file === sessionBBeforeWork.outcome?.file,
};

const pass = Object.values(checks).every(Boolean);
const output = {
  pass,
  checks,
  evidence: {
    sessionA: {
      outcomeFile: sessionAAfterConcurrent.outcome?.file,
      outcomeTotal: sessionAAfterConcurrent.outcome?.stats?.total,
      hookTotal: sessionAAfterConcurrent.hook?.stats?.total,
      ptlLevel: sessionAAfterConcurrent.ptl?.emergency_level,
      strategySamples: sessionAAfterConcurrent.strategy?.sample_count,
    },
    sessionB: {
      outcomeFile: sessionBBeforeWork.outcome?.file,
      outcomeTotal: sessionBBeforeWork.outcome?.stats?.total,
      ptlEngaged: sessionBBeforeWork.ptl?.engaged,
    },
    legacy: {
      outcomeFile: legacyLedger.outcome?.file,
      outcomeTotal: legacyLedger.outcome?.stats?.total,
    },
    deleted: deletion.workerContextCompactSessionArtifacts?.deleted || 0,
    rawFileCount: rawFiles.length,
  },
};

fs.rmSync(scratch, { recursive: true, force: true });
console.log(JSON.stringify(output, null, 2));
if (!pass) process.exit(1);
