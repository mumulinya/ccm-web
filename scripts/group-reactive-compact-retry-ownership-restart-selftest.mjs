import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "group-reactive-compact-retry-ownership-selftest");
const home = path.join(scratch, "home");
const moduleFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-reactive-compact-retry-ownership.js");
const orchestratorFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js");
const llmClientFile = path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator-llm-client.js");
const groupId = "phase303-reactive-ownership";
const sessionA = "gcs_phase303_a";
const sessionB = "gcs_phase303_b";
const sessionC = "gcs_phase303_corrupt";
const rawSentinel = "PHASE303_PRIVATE_CONTEXT_BODY_MUST_NOT_PERSIST";
const require = createRequire(import.meta.url);

function childEnv() {
  return { ...process.env, HOME: home, USERPROFILE: home, CCM_SELFTEST_HOME: home };
}

function parseResult(stdout) {
  const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
  return JSON.parse(lines.at(-1) || "{}");
}

function runChild(action, payload = {}) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", action, JSON.stringify(payload)], {
    cwd: root,
    env: childEnv(),
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.status !== 0) throw new Error(`${action} failed (${result.status}): ${result.stderr || result.stdout}`);
  return parseResult(result.stdout);
}

async function startHoldingClaim(payload) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--child", "hold", JSON.stringify(payload)], {
    cwd: root,
    env: childEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += String(chunk); });
  const first = await new Promise((resolve, reject) => {
    let buffered = "";
    const timer = setTimeout(() => reject(new Error(`hold timeout: ${stderr}`)), 10_000);
    child.stdout.on("data", chunk => {
      buffered += String(chunk);
      const newline = buffered.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timer);
      resolve(JSON.parse(buffered.slice(0, newline)));
    });
    child.once("error", reject);
    child.once("exit", code => {
      if (code !== null && code !== 0) reject(new Error(`hold exited ${code}: ${stderr}`));
    });
  });
  return { child, first };
}

if (process.argv[2] === "--child") {
  const action = process.argv[3];
  const payload = JSON.parse(process.argv[4] || "{}");
  const api = require(moduleFile);
  if (action === "claim" || action === "hold") {
    const result = api.claimGroupReactiveCompactRetry(payload);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (action === "hold") await new Promise(resolve => setTimeout(resolve, 60_000));
  } else if (action === "complete") {
    process.stdout.write(`${JSON.stringify(api.completeGroupReactiveCompactRetry(payload))}\n`);
  } else if (action === "read") {
    process.stdout.write(`${JSON.stringify(api.readGroupReactiveCompactRetryOwnership(payload.groupId, payload.groupSessionId))}\n`);
  } else if (action === "delete") {
    process.stdout.write(`${JSON.stringify(api.deleteGroupReactiveCompactRetryOwnership(payload.groupId, payload.groupSessionId))}\n`);
  } else if (action === "worker") {
    const orchestrator = require(orchestratorFile);
    const result = orchestrator.runCodedGroupOrchestrator({
      group: {
        id: payload.groupId,
        members: [
          { project: "coordinator", role: "coordinator" },
          { project: "api", agent: "codex" },
        ],
      },
      groupSessionId: payload.groupSessionId,
      message: `请在 api 项目实现 PHASE303_WORKER_GCS_SENTINEL 并运行验证。${" context".repeat(3200)}`,
      workerContextUsageOptions: { maxTokens: 1800, autoCompactBufferTokens: 120 },
      workerContextRetryOptions: { maxTaskChars: 1800 },
    });
    const assignment = (result.assignments || []).find(row => row.project === "api") || {};
    process.stdout.write(`${JSON.stringify({
      assignment_group_session_id: assignment.group_session_id || "",
      packet_group_session_id: assignment.worker_context_packet?.group_session_id || "",
      retry_status: assignment.context_compaction_retry?.status || "",
      packet_id: assignment.worker_context_packet?.packet_id || "",
    })}\n`);
  } else if (action === "integration") {
    const configDir = path.join(home, ".cc-connect");
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, "group-orchestrator-config.json"), JSON.stringify({
      enabled: true,
      format: "openai-compatible",
      apiUrl: "http://phase303.invalid/v1",
      apiKey: "phase303-test-key",
      model: "phase303-test-model",
      fallbackToRules: false,
    }), "utf8");
    const llmClient = require(llmClientFile);
    let calls = 0;
    llmClient.callOpenAiCompatibleJson = async () => {
      calls += 1;
      if (calls === 1) throw new Error("HTTP 413: prompt too long");
      return {
        intent: "implementation",
        summary: "实现 Phase 303 reactive compact ownership integration",
        domains: ["backend"],
        deliverables: ["verified retry ownership"],
        constraints: [],
        missingInfo: [],
        shouldDelegate: true,
        executionOrder: "parallel",
        dispatchPolicy: { action: "delegate", requiresConfirmation: false, reason: "integration test" },
        targets: [{ project: "api", task: "实现 PHASE303_REACTIVE_INTEGRATION_SENTINEL 并验证。", reason: "backend" }],
      };
    };
    const orchestrator = require(orchestratorFile);
    const result = await orchestrator.runGroupOrchestrator({
      group: {
        id: payload.groupId,
        members: [
          { project: "coordinator", role: "coordinator" },
          { project: "api", agent: "codex" },
        ],
      },
      groupSessionId: payload.groupSessionId,
      contextId: payload.contextId,
      source: "phase303-integration",
      message: "请实现并验证 Phase 303 reactive compact ownership integration。",
      context: `PHASE303_CONTEXT_HEAD\n${"context pressure ".repeat(7000)}\nPHASE303_CONTEXT_TAIL`,
    });
    process.stdout.write(`${JSON.stringify({
      calls,
      runtime: result.runtime || "",
      context_recovery_type: result.contextRecovery?.type || "",
      ownership_status: result.contextRecovery?.ownership?.status || "",
      ownership_acquired: result.contextRecovery?.ownership?.acquired === true,
      completion_accepted: result.contextRecovery?.ownership?.completion_accepted === true,
      assignment_group_session_id: result.assignments?.[0]?.group_session_id || "",
    })}\n`);
  } else {
    throw new Error(`unknown child action: ${action}`);
  }
  process.exit(0);
}

fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });

const epochCrash = "ctx_phase303_crash_epoch";
const firstClaim = runChild("claim", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  requestFingerprint: rawSentinel,
  contextChecksum: rawSentinel,
  inputChars: 3_000_000,
  claimId: "claim_phase303_dead_owner",
});
const reclaimed = runChild("claim", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: "claim_phase303_recovered_owner",
});
const staleCompletion = runChild("complete", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: firstClaim.entry?.claim_id,
  fencingToken: firstClaim.entry?.fencing_token,
  outcome: "recovered",
});
const acceptedCompletion = runChild("complete", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: reclaimed.entry?.claim_id,
  fencingToken: reclaimed.entry?.fencing_token,
  outcome: "recovered",
  outputChars: 48_000,
});
const duplicate = runChild("claim", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: "claim_phase303_duplicate",
});

const epochBusy = "ctx_phase303_busy_epoch";
const holding = await startHoldingClaim({
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochBusy,
  claimId: "claim_phase303_live_owner",
});
const busy = runChild("claim", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochBusy,
  claimId: "claim_phase303_competing_owner",
});
holding.child.kill();
await new Promise(resolve => holding.child.once("exit", resolve));
const afterCrash = runChild("claim", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochBusy,
  claimId: "claim_phase303_after_crash",
});
runChild("complete", {
  groupId,
  groupSessionId: sessionA,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochBusy,
  claimId: afterCrash.entry?.claim_id,
  fencingToken: afterCrash.entry?.fencing_token,
  outcome: "failed",
  errorClass: "PromptTooLong",
  error: rawSentinel,
});

const siblingClaim = runChild("claim", {
  groupId,
  groupSessionId: sessionB,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: "claim_phase303_sibling",
});
runChild("complete", {
  groupId,
  groupSessionId: sessionB,
  channel: "group_main_prompt_too_long",
  retryEpoch: epochCrash,
  claimId: siblingClaim.entry?.claim_id,
  fencingToken: siblingClaim.entry?.fencing_token,
  outcome: "recovered",
});

const corruptClaim = runChild("claim", {
  groupId,
  groupSessionId: sessionC,
  channel: "group_main_prompt_too_long",
  retryEpoch: "ctx_phase303_corrupt",
  claimId: "claim_phase303_corrupt",
});
runChild("complete", {
  groupId,
  groupSessionId: sessionC,
  channel: "group_main_prompt_too_long",
  retryEpoch: "ctx_phase303_corrupt",
  claimId: corruptClaim.entry?.claim_id,
  fencingToken: corruptClaim.entry?.fencing_token,
  outcome: "recovered",
});
const corruptFile = corruptClaim.ledger?.file;
fs.writeFileSync(corruptFile, "{corrupt-primary", "utf8");
const corruptRead = runChild("read", { groupId, groupSessionId: sessionC });
const worker = runChild("worker", { groupId, groupSessionId: sessionA });
const integrationSession = "gcs_phase303_integration";
const integrationContextId = "ctx_phase303_integration_epoch";
const integrationRecovered = runChild("integration", { groupId, groupSessionId: integrationSession, contextId: integrationContextId });
const integrationDuplicate = runChild("integration", { groupId, groupSessionId: integrationSession, contextId: integrationContextId });
const finalA = runChild("read", { groupId, groupSessionId: sessionA });
const rawLedger = fs.readFileSync(finalA.file, "utf8");
const deleted = runChild("delete", { groupId, groupSessionId: sessionA });
const afterDelete = runChild("read", { groupId, groupSessionId: sessionA });

const checks = {
  firstClaimAcquired: firstClaim.status === "acquired" && firstClaim.acquired === true,
  deadOwnerReclaimedAfterRestart: reclaimed.status === "recovered_claim" && reclaimed.reclaimed === true,
  fencingTokenAdvanced: Number(reclaimed.entry?.fencing_token || 0) > Number(firstClaim.entry?.fencing_token || 0),
  staleCompletionRejected: staleCompletion.status === "stale_rejected" && staleCompletion.accepted === false,
  recoveredCompletionAccepted: acceptedCompletion.status === "recovered" && acceptedCompletion.accepted === true,
  sameEpochSingleShot: duplicate.status === "already_attempted" && duplicate.acquired === false,
  liveOwnerBlocksCompetitor: holding.first.status === "acquired" && busy.status === "busy" && busy.acquired === false,
  crashedLiveOwnerCanRecover: afterCrash.status === "recovered_claim" && afterCrash.acquired === true,
  siblingSessionIsolated: siblingClaim.status === "acquired" && siblingClaim.entry?.fencing_token === 1,
  validBackupFailsClosed: corruptRead.state === "fail_closed" && corruptRead.blocked === true && corruptRead.recovered_from_backup === true,
  workerPacketBindsExactSession: worker.assignment_group_session_id === sessionA && worker.packet_group_session_id === sessionA && !!worker.packet_id,
  mainAgentPtlRetryClaimsAndSettles: integrationRecovered.calls === 2
    && integrationRecovered.context_recovery_type === "reactive-compact"
    && integrationRecovered.ownership_status === "recovered"
    && integrationRecovered.ownership_acquired === true
    && integrationRecovered.completion_accepted === true
    && integrationRecovered.assignment_group_session_id === integrationSession,
  mainAgentPtlRetryDoesNotReplayAfterRestart: integrationDuplicate.calls === 1
    && integrationDuplicate.context_recovery_type === "reactive-compact-not-retried"
    && integrationDuplicate.ownership_status === "already_attempted"
    && integrationDuplicate.ownership_acquired === false,
  ledgerBodyFree: !rawLedger.includes(rawSentinel) && !rawLedger.includes("3_000_000"),
  sessionDeleteRemovesLedger: Number(deleted.deleted || 0) >= 1 && afterDelete.totals?.total === 0 && afterDelete.blocked === false,
};
const report = {
  pass: Object.values(checks).every(Boolean),
  checks,
  evidence: {
    first_fence: firstClaim.entry?.fencing_token || 0,
    recovered_fence: reclaimed.entry?.fencing_token || 0,
    busy_status: busy.status,
    duplicate_status: duplicate.status,
    corrupt_status: corruptRead.state,
    worker,
    integration_recovered: integrationRecovered,
    integration_duplicate: integrationDuplicate,
    final_totals: finalA.totals,
    deleted: deleted.deleted || 0,
  },
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
