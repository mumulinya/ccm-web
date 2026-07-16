import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "task-agent-live-provider-native-memory-soak.mjs");
const multiGroupScript = path.join(root, "scripts", "task-agent-live-multi-group-memory-soak.mjs");
const multiGroupFleetAuditScript = path.join(root, "scripts", "task-agent-live-multi-group-memory-fleet-audit.mjs");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-provider-memory-soak-selftest-"));
const fixture = path.join(home, "provider-fixture.mjs");
const stateFile = path.join(home, "fixture-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function parseReport(stdout) {
  const line = String(stdout || "").split(/\r?\n/).find(item => item.startsWith("PHASE363_LIVE_PROVIDER_MEMORY_SOAK="));
  if (!line) throw new Error(`Phase 363 report missing:\n${stdout}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

function parseMultiGroupReport(stdout) {
  const line = String(stdout || "").split(/\r?\n/).find(item => item.startsWith("PHASE365_LIVE_MULTI_GROUP_MEMORY_SOAK="));
  if (!line) throw new Error(`Phase 365 multi-group report missing:\n${stdout}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

function parseMultiGroupFleetReport(stdout) {
  const line = String(stdout || "").split(/\r?\n/).find(item => item.startsWith("PHASE365_LIVE_MULTI_GROUP_MEMORY_FLEET="));
  if (!line) throw new Error(`Phase 365 fleet report missing:\n${stdout}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

fs.writeFileSync(fixture, String.raw`import fs from "node:fs";
const [provider, stage, requestedSessionId, prompt] = process.argv.slice(2);
const stateFile = process.env.CCM_PHASE363_FIXTURE_STATE;
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {};
if (process.env.CCM_PHASE363_FIXTURE_MODE === "timeout") await new Promise(resolve => setTimeout(resolve, 60_000));
const sessionId = requestedSessionId || state[provider]?.sessionId || "session-phase363-" + provider;
if (stage === "initial") {
  const sentinel = String(prompt || "").match(/CCM_PHASE363_[A-Z]+_[a-f0-9]+/)?.[0] || "";
  state[provider] = { sessionId, sentinel };
  fs.writeFileSync(stateFile, JSON.stringify(state), "utf8");
}
const text = stage === "initial" ? "INITIAL_OK" : state[provider]?.sentinel || "MISSING";
if (provider === "claudecode") {
  console.log(JSON.stringify({ type: "system", subtype: "init", session_id: sessionId }));
  console.log(JSON.stringify({ type: "result", result: text, session_id: sessionId }));
}
else if (provider === "cursor") {
  console.log(JSON.stringify({ type: "system", subtype: "init", session_id: sessionId }));
  console.log(JSON.stringify({ type: "result", subtype: "success", result: text, session_id: sessionId }));
}
else {
  console.log(JSON.stringify({ type: "thread.started", thread_id: sessionId }));
  console.log(JSON.stringify({ type: "turn.started" }));
  console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text } }));
  console.log(JSON.stringify({ type: "turn.completed" }));
}
`, "utf8");

const baseEnv = {
  ...process.env,
  HOME: home,
  USERPROFILE: home,
  CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE: fixture,
  CCM_PHASE363_FIXTURE_STATE: stateFile,
  CCM_CONTINUATION_SOAK_EPOCH: "svc_phase363_selftest",
};

try {
  const success = spawnSync(process.execPath, [script, "--providers", "claudecode,codex,cursor", "--timeout-ms", "10000"], {
    cwd: root,
    env: baseEnv,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  equal(success.status, 0, success.stderr || success.stdout);
  const report = parseReport(success.stdout);
  equal(report.schema, "ccm-live-provider-native-memory-soak-report-v2", "report schema should be stable");
  equal(report.accountBacked, false, "fixture evidence must not claim an account-backed call");
  equal(report.providerCount, 3, "all three providers should be covered");
  equal(report.passedCount, 3, "all three deterministic same-session recalls should pass");
  equal(report.timeoutCount, 0, "successful fixture should not time out");
  ok(report.providers.every(row => row.workspaceUnchanged), "probe workspaces should remain unchanged");
  ok(report.providers.every(row => row.sessionChecksum && row.sentinelChecksum), "body-free session and sentinel checksums should be retained");
  ok(report.providers.every(row => row.initial?.status === "passed" && row.resume?.status === "passed"), "both native-session turns should pass");
  ok(report.providers.every(row => row.initial?.progress?.sessionEstablished), "stream evidence should prove session establishment");
  ok(report.providers.every(row => row.initial?.progress?.turnStarted), "stream evidence should prove turn start");
  ok(report.providers.every(row => row.initial?.progress?.terminalObserved), "stream evidence should prove terminal output");
  ok(report.providers.every(row => row.initial?.progress?.firstOutputObserved), "stream evidence should retain first-output timing");
  ok(report.providers.every(row => row.initial?.progress?.modelOutputObserved), "stream evidence should distinguish model output from system initialization");
  ok(report.providers.every(row => row.initial?.progress?.stage === "terminal"), "passing stream evidence should reach the terminal stage");
  const { reportChecksum, reportFile, ...unsignedWithFile } = report;
  delete unsignedWithFile.reportFile;
  equal(reportChecksum, digest(JSON.stringify(canonical(unsignedWithFile))), "report checksum should verify");
  ok(fs.existsSync(reportFile), "durable report should exist");
  const durable = fs.readFileSync(reportFile, "utf8");
  ok(!durable.includes("CCM_PHASE363_CLAUDE_") && !durable.includes("CCM_PHASE363_CODEX_") && !durable.includes("CCM_PHASE363_CURSOR_"), "durable report must remain body-free");
  const ledgers = path.join(home, ".cc-connect", "task-agent-continuation-soak");
  const ledgerFiles = fs.readdirSync(ledgers).filter(item => item.endsWith(".jsonl"));
  equal(ledgerFiles.length, 3, "each task-agent provider should have an isolated hash-chain ledger");
  const ledgerText = ledgerFiles.map(item => fs.readFileSync(path.join(ledgers, item), "utf8")).join("\n");
  const ledgerEvents = ledgerText.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  equal(ledgerEvents.filter(event => event.phase === "live_provider_memory_probe_terminal").length, 3, "each provider ledger should close with a terminal event");
  ok(!ledgerText.includes("CCM_PHASE363_"), "continuation ledgers must not contain memory bodies");
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  const require = createRequire(import.meta.url);
  const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const aggregate = soak.buildTaskAgentContinuationSoakReport({ groupId: report.groupId, groupSessionId: report.groupSessionId });
  equal(aggregate.overall.liveProviderMemoryProbeTerminalCount, 3, "production aggregation should retain all terminal probes");
  equal(aggregate.overall.liveProviderMemoryProbePassedCount, 3, "production aggregation should count passing native recall");
  equal(aggregate.overall.liveProviderMemoryProbeTimeoutCount, 0, "passing aggregation should have no timeout");
  equal(aggregate.overall.liveProviderMemoryProbeProviderCount, 3, "production aggregation should expose all Providers");
  equal(aggregate.overall.liveProviderMemoryProbeProviderVersionCount, 3, "production aggregation should expose all installed versions");
  equal(aggregate.overall.liveProviderMemoryProbeModelCount, 3, "production aggregation should expose selected Provider models");
  equal(aggregate.overall.liveProviderMemoryProbeSessionEstablishedCount, 3, "production aggregation should expose session establishment");
  equal(aggregate.overall.liveProviderMemoryProbeTurnStartedCount, 3, "production aggregation should expose started turns");
  equal(aggregate.overall.liveProviderMemoryProbeFirstOutputCount, 3, "production aggregation should expose first output");
  equal(aggregate.overall.liveProviderMemoryProbeTerminalObservedCount, 3, "production aggregation should expose terminal stream events");
  equal(aggregate.overall.liveProviderMemoryProbeModelOutputCount, 3, "production aggregation should expose model output");
  equal(aggregate.overall.liveProviderMemoryProbeApiRetryEventCount, 0, "passing fixture should not contain API retries");
  equal(aggregate.overall.liveProviderMemoryProbeWorkspaceChangedCount, 0, "production aggregation should retain zero workspace mutations");
  const memoryReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: report.groupId });
  equal(memoryReport.overall.continuationSoakLiveProviderMemoryProbePassedCount, 3, "Memory Center should expose passing live recall probes");
  equal(memoryReport.overall.continuationSoakLiveProviderMemoryProbeProviderCount, 3, "Memory Center should expose live Provider coverage");
  equal(memoryReport.overall.continuationSoakLiveProviderMemoryProbeSessionEstablishedCount, 3, "Memory Center should expose established live sessions");
  equal(memoryReport.overall.continuationSoakLiveProviderMemoryProbeFirstOutputCount, 3, "Memory Center should expose first-output progress");

  const receiptRecovery = spawnSync(process.execPath, [script, "--providers", "codex", "--timeout-ms", "10000", "--codex-receipt-recovery"], {
    cwd: root,
    env: { ...baseEnv, CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE_RECEIPT: "1" },
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  equal(receiptRecovery.status, 0, receiptRecovery.stderr || receiptRecovery.stdout);
  const receiptReport = parseReport(receiptRecovery.stdout);
  equal(receiptReport.passedCount, 1, "controlled Codex receipt recovery should pass");
  equal(receiptReport.providers[0].receiptRecovery.cleanOmissionObserved, true, "receipt recovery should start from a clean omission");
  equal(receiptReport.providers[0].receiptRecovery.status, "recovered", "production recovery record should commit recovered");
  equal(receiptReport.providers[0].receiptRecovery.receiptValid, true, "model-side receipt should verify");
  equal(receiptReport.providers[0].receiptRecovery.suppressTaskReplay, false, "successful narrow recovery should not suppress completion");
  ok(!receiptRecovery.stdout.includes("mcrc_"), "body-free live report must not reveal the challenge id");
  const receiptAggregate = soak.buildTaskAgentContinuationSoakReport({ groupId: receiptReport.groupId, groupSessionId: receiptReport.groupSessionId });
  equal(receiptAggregate.overall.liveProviderMemoryProbeReceiptRecoveryRequiredCount, 1, "production aggregation should expose required receipt recovery");
  equal(receiptAggregate.overall.liveProviderMemoryProbeReceiptRecoveryPassedCount, 1, "production aggregation should expose passing receipt recovery");
  const receiptMemoryReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: receiptReport.groupId });
  equal(receiptMemoryReport.overall.continuationSoakLiveProviderMemoryProbeReceiptRecoveryPassedCount, 1, "Memory Center should expose passing live receipt recovery");

  const multiGroup = spawnSync(process.execPath, [multiGroupScript, "--groups", "3", "--concurrency", "2", "--timeout-ms", "10000", "--group-prefix", "phase365-selftest-group"], {
    cwd: root,
    env: { ...baseEnv, CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE_RECEIPT: "1" },
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  equal(multiGroup.status, 0, multiGroup.stderr || multiGroup.stdout);
  const multiReport = parseMultiGroupReport(multiGroup.stdout);
  equal(multiReport.schema, "ccm-live-provider-multi-group-memory-soak-report-v1", "multi-group report schema should be stable");
  equal(multiReport.requestedGroupCount, 3, "multi-group harness should run three groups");
  equal(multiReport.passedCount, 3, "all isolated group recoveries should pass");
  equal(multiReport.failedCount, 0, "isolated group run should have no failed group");
  equal(multiReport.isolationValid, true, "multi-group identity and memory checksums should remain isolated");
  equal(multiReport.uniqueGroupIds, 3, "all group ids should be unique");
  equal(multiReport.uniqueGroupSessions, 3, "all gcs identities should be unique");
  equal(multiReport.uniqueSentinels, 3, "all memory sentinels should be unique");
  equal(multiReport.uniqueChallenges, 3, "all receipt challenges should be unique");
  ok(multiReport.groups.every(row => row.status === "passed" && row.receiptValid && row.continuationValidChainCount === 1 && row.recoveryInventoryCount === 1), "each group should close its own receipt, chain, and recovery inventory");
  ok(!multiGroup.stdout.includes("mcrc_"), "multi-group report must remain challenge-body-free");
  const { reportChecksum: multiChecksum, reportFile: multiReportFile, ...multiUnsignedWithFile } = multiReport;
  delete multiUnsignedWithFile.reportFile;
  equal(multiChecksum, digest(JSON.stringify(canonical(multiUnsignedWithFile))), "multi-group report checksum should verify");
  ok(fs.existsSync(multiReportFile), "multi-group durable report should exist");
  const fleetAudit = spawnSync(process.execPath, [multiGroupFleetAuditScript, "--minimum-passing-groups", "3", "--group-prefix", "phase365-selftest-group"], {
    cwd: root,
    env: baseEnv,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  equal(fleetAudit.status, 0, fleetAudit.stderr || fleetAudit.stdout);
  const fleetReport = parseMultiGroupFleetReport(fleetAudit.stdout);
  equal(fleetReport.passingGroupCount, 3, "fleet audit should independently preserve three passing groups");
  equal(fleetReport.failedObservationCount, 0, "deterministic fleet should have no failed observation");
  equal(fleetReport.staleOrInvalidCount, 0, "deterministic fleet should have no stale proof");
  equal(fleetReport.passingIsolationValid, true, "fleet passing groups should remain identity-isolated");
  equal(fleetReport.gatePassed, true, "fleet minimum passing-group gate should pass");
  ok(fleetReport.groups.every(row => row.currentValid && row.receiptRecoveryPassedCount === 1), "fleet audit should re-read each current continuation and recovery proof");
  const { reportChecksum: fleetChecksum, reportFile: fleetReportFile, ...fleetUnsignedWithFile } = fleetReport;
  delete fleetUnsignedWithFile.reportFile;
  equal(fleetChecksum, digest(JSON.stringify(canonical(fleetUnsignedWithFile))), "fleet report checksum should verify");
  ok(fs.existsSync(fleetReportFile), "fleet durable report should exist");
  const fleetMemoryReport = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: multiReport.groups[0].groupId });
  equal(fleetMemoryReport.overall.liveProviderMultiGroupFleetPassingGroupCount, 3, "Memory Center should expose passing multi-group fleet count");
  equal(fleetMemoryReport.overall.liveProviderMultiGroupFleetFailedObservationCount, 0, "Memory Center should expose fleet failure count");
  equal(fleetMemoryReport.overall.liveProviderMultiGroupFleetStaleOrInvalidCount, 0, "Memory Center should expose stale fleet proofs");
  equal(fleetMemoryReport.overall.liveProviderMultiGroupFleetIsolationValid, true, "Memory Center should expose fleet isolation state");

  const timeout = spawnSync(process.execPath, [script, "--providers", "cursor", "--timeout-ms", "5000"], {
    cwd: root,
    env: { ...baseEnv, CCM_PHASE363_FIXTURE_MODE: "timeout" },
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  equal(timeout.status, 1, "a timed-out live probe must fail closed");
  const timeoutReport = parseReport(timeout.stdout);
  equal(timeoutReport.timeoutCount, 1, "timeout should be explicit in the durable report");
  equal(timeoutReport.passedCount, 0, "timeout must never count as memory recall success");
  equal(timeoutReport.providers[0].workspaceUnchanged, true, "timeout cleanup should preserve the workspace");
  ok(timeoutReport.providers[0].initial.timedOut, "the exact timed-out turn should be retained");
  equal(timeoutReport.providers[0].issue, "provider_startup_timeout", "no-output timeout should be classified at startup");
  const timeoutAggregate = soak.buildTaskAgentContinuationSoakReport({ groupId: timeoutReport.groupId, groupSessionId: timeoutReport.groupSessionId });
  equal(timeoutAggregate.overall.liveProviderMemoryProbeTimeoutCount, 1, "production aggregation should count the fail-closed timeout");
  equal(timeoutAggregate.overall.liveProviderMemoryProbeStartupTimeoutCount, 1, "production aggregation should expose startup timeout stage");
  equal(timeoutAggregate.overall.liveProviderMemoryProbeApiRetryTimeoutCount, 0, "startup timeout should not be mislabeled as API retry timeout");

  console.log(JSON.stringify({ pass: true, checks, providers: report.providerCount, timeoutFailClosed: true }, null, 2));
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
