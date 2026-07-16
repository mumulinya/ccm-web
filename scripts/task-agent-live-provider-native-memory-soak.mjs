#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const nativeContinuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const receiptStore = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-receipt.js"));
const receiptRecovery = require(path.join(root, "ccm-package", "dist", "integrations", "memory-context-consumption-recovery.js"));
const internalMcp = require(path.join(root, "ccm-package", "dist", "integrations", "agent-internal-mcp.js"));
const runtimeToolSync = require(path.join(root, "ccm-package", "dist", "tools", "runtime-tool-sync.js"));
const reportStore = require(path.join(root, "ccm-package", "dist", "integrations", "live-provider-memory-soak-report-store.js"));

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const item = process.argv[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, "true");
  }
}

const live = args.get("live") === "true" || process.env.CCM_RUN_LIVE_PROVIDER_MEMORY_SOAK === "1";
const selectedProviders = String(args.get("providers") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_PROVIDERS || "claudecode,codex,cursor")
  .split(",")
  .map(item => runtime.normalizeAgentRuntimeId(item.trim()))
  .filter((item, index, all) => ["claudecode", "codex", "cursor"].includes(item) && all.indexOf(item) === index);
const timeoutMs = Math.max(5_000, Math.min(300_000, Number(args.get("timeout-ms") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_TIMEOUT_MS || 60_000)));
const maxBudgetUsd = String(args.get("max-budget-usd") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_MAX_BUDGET_USD || "0.10");
const codexModel = String(args.get("codex-model") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CODEX_MODEL || "gpt-5.4-mini");
const claudeModel = String(args.get("claude-model") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CLAUDE_MODEL || "sonnet");
const cursorModel = String(args.get("cursor-model") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_CURSOR_MODEL || "gpt-5.4-mini-none");
const fixtureAdapter = String(process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE || "").trim();
const codexReceiptRecoveryMode = args.get("codex-receipt-recovery") === "true" || process.env.CCM_LIVE_CODEX_MEMORY_RECEIPT_RECOVERY === "1";
const runId = `lpms_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
const requestedGroupId = String(args.get("group-id") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_GROUP_ID || "ccm-live-provider-memory-soak").trim();
const groupId = requestedGroupId.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "ccm-live-provider-memory-soak";
const requestedGroupSessionId = String(args.get("group-session-id") || process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_GROUP_SESSION_ID || "").trim();
if (requestedGroupSessionId && !/^gcs_[a-zA-Z0-9._-]{4,180}$/.test(requestedGroupSessionId)) throw new Error("live Provider memory soak group session must use gcs_* identity");
const groupSessionId = requestedGroupSessionId || `gcs_${runId}`;
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-live-provider-memory-soak-"));

function digest(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function treeChecksum(directory) {
  const rows = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, entry.name);
      const rel = path.relative(directory, file).replace(/\\/g, "/");
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) rows.push([rel, digest(fs.readFileSync(file))]);
    }
  };
  visit(directory);
  return digest(JSON.stringify(rows));
}

function terminateProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else {
    try { child.kill("SIGKILL"); } catch {}
  }
}

function runProcess(command, commandArgs, options = {}) {
  return new Promise(resolve => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let timer = null;
    let firstStdoutMs = 0;
    let firstStderrMs = 0;
    let child;
    try {
      child = spawn(command, commandArgs, {
        cwd: options.cwd,
        env: options.env || process.env,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      resolve({ code: -1, signal: "", stdout, stderr, timedOut: false, durationMs: Date.now() - startedAt, issue: "provider_process_spawn_failed" });
      return;
    }
    const finish = (code, signal, spawnError = "") => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        code: Number.isInteger(code) ? code : -1,
        signal: String(signal || ""),
        stdout,
        stderr,
        timedOut,
        durationMs: Date.now() - startedAt,
        firstStdoutMs,
        firstStderrMs,
        stdoutBytes: Buffer.byteLength(stdout),
        stderrBytes: Buffer.byteLength(stderr),
        issue: spawnError ? "provider_process_spawn_failed" : timedOut ? "provider_process_timeout" : code === 0 ? "" : "provider_process_failed",
      });
    };
    child.stdout.on("data", chunk => {
      if (!firstStdoutMs) firstStdoutMs = Date.now() - startedAt;
      if (stdout.length < 2 * 1024 * 1024) stdout += String(chunk);
    });
    child.stderr.on("data", chunk => {
      if (!firstStderrMs) firstStderrMs = Date.now() - startedAt;
      if (stderr.length < 512 * 1024) stderr += String(chunk);
    });
    child.on("error", error => finish(-1, "", error?.code || error?.message || "spawn_failed"));
    child.on("close", (code, signal) => finish(code, signal));
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
    timer = setTimeout(() => {
      timedOut = true;
      terminateProcessTree(child);
      setTimeout(() => finish(-1, "timeout"), 2_000).unref?.();
    }, options.timeoutMs || timeoutMs);
  });
}

function parseJsonLines(raw) {
  const values = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    try { values.push(JSON.parse(text)); } catch {}
  }
  return values;
}

function normalizeProviderOutput(provider, raw, requestedSessionId = "") {
  const values = parseJsonLines(raw);
  if (provider === "claudecode") {
    const result = values.reverse().find(value => typeof value?.result === "string") || null;
    return { text: String(result?.result || raw || "").trim(), sessionId: requestedSessionId };
  }
  if (provider === "cursor") {
    const result = [...values].reverse().find(value => value?.type === "result" || typeof value?.result === "string") || null;
    const session = [...values].reverse().find(value => value?.session_id || value?.sessionId) || null;
    return {
      text: String(result?.result || result?.message?.content || raw || "").trim(),
      sessionId: String(session?.session_id || session?.sessionId || ""),
    };
  }
  const session = values.find(value => value?.type === "thread.started" && value?.thread_id) || values.find(value => value?.thread_id);
  const messages = values.flatMap(value => {
    const item = value?.item || value?.message || null;
    return item?.type === "agent_message" && item?.text ? [String(item.text)] : [];
  });
  return { text: messages.join("\n").trim() || String(raw || "").trim(), sessionId: String(session?.thread_id || "") };
}

function buildProgressEvidence(provider, run, requestedSessionId = "") {
  const events = parseJsonLines(run?.stdout || "");
  const eventTypes = [...new Set(events.map(event => [event?.type, event?.subtype].filter(Boolean).join(":") || "untyped"))].slice(0, 20);
  const observedSessionId = provider === "codex"
    ? String(events.find(event => event?.thread_id)?.thread_id || "")
    : provider === "cursor"
      ? String(events.find(event => event?.session_id || event?.sessionId)?.session_id || events.find(event => event?.session_id || event?.sessionId)?.sessionId || "")
      : String(events.find(event => event?.session_id || event?.sessionId)?.session_id || events.find(event => event?.session_id || event?.sessionId)?.sessionId || requestedSessionId || "");
  const turnStarted = events.some(event => event?.type === "turn.started" || (event?.type === "system" && event?.subtype === "init"));
  const terminalObserved = events.some(event => ["result", "turn.completed", "turn.failed", "error"].includes(String(event?.type || "")));
  const modelOutputObserved = events.some(event => event?.type === "assistant" || event?.type === "result" || event?.item?.type === "agent_message");
  const apiRetryEvents = events.filter(event => event?.type === "system" && event?.subtype === "api_retry");
  const apiRetryCount = apiRetryEvents.length;
  const stage = terminalObserved ? "terminal"
    : modelOutputObserved ? "model_output"
      : apiRetryCount ? "api_retry"
        : turnStarted ? "turn_started"
          : observedSessionId ? "session_established"
            : Number(run?.firstStdoutMs || 0) > 0 ? "unclassified_output" : "process_started";
  return {
    parsedJsonEventCount: events.length,
    eventTypes,
    sessionEstablished: !!observedSessionId && (provider === "claudecode" ? events.length > 0 : true),
    sessionChecksum: digest(observedSessionId),
    turnStarted,
    terminalObserved,
    modelOutputObserved,
    apiRetryCount,
    lastApiRetryAttempt: Math.max(0, ...apiRetryEvents.map(event => Number(event?.attempt || 0))),
    stage,
    firstOutputObserved: Number(run?.firstStdoutMs || 0) > 0,
    firstOutputMs: Number(run?.firstStdoutMs || 0),
    stdoutBytes: Number(run?.stdoutBytes || 0),
    stderrBytes: Number(run?.stderrBytes || 0),
  };
}

function classifyProviderIssue(raw, fallback = "") {
  const text = String(raw || "").toLowerCase();
  if (text.includes("model is not supported") || text.includes("model is not available") || text.includes("unsupported model")) return "provider_model_unavailable";
  if (text.includes("unauthorized") || text.includes("authentication") || text.includes("not logged in") || text.includes("login required")) return "provider_auth_unavailable";
  if (text.includes("econn") || text.includes("network") || text.includes("connection") || text.includes("timed out")) return "provider_network_unavailable";
  return fallback;
}

function compactProgressEvidence(progress) {
  return {
    liveProviderMemoryProbeParsedEventCount: Number(progress?.parsedJsonEventCount || 0),
    liveProviderMemoryProbeEventTypes: Array.isArray(progress?.eventTypes) ? progress.eventTypes : [],
    liveProviderMemoryProbeSessionEstablished: progress?.sessionEstablished === true,
    liveProviderMemoryProbeTurnStarted: progress?.turnStarted === true,
    liveProviderMemoryProbeTerminalObserved: progress?.terminalObserved === true,
    liveProviderMemoryProbeModelOutputObserved: progress?.modelOutputObserved === true,
    liveProviderMemoryProbeApiRetryCount: Number(progress?.apiRetryCount || 0),
    liveProviderMemoryProbeLastApiRetryAttempt: Number(progress?.lastApiRetryAttempt || 0),
    liveProviderMemoryProbeProgressStage: String(progress?.stage || ""),
    liveProviderMemoryProbeFirstOutputObserved: progress?.firstOutputObserved === true,
    liveProviderMemoryProbeFirstOutputMs: Number(progress?.firstOutputMs || 0),
    liveProviderMemoryProbeStdoutBytes: Number(progress?.stdoutBytes || 0),
    liveProviderMemoryProbeStderrBytes: Number(progress?.stderrBytes || 0),
  };
}

function classifyTimedOutProgress(progress) {
  if (Number(progress?.apiRetryCount || 0) > 0) return "provider_api_retry_timeout";
  if (progress?.sessionEstablished !== true) return "provider_startup_timeout";
  if (progress?.modelOutputObserved === true) return "provider_terminal_timeout";
  return "provider_turn_timeout";
}

function prepareCodexHome() {
  const target = path.join(runRoot, "codex-home");
  fs.mkdirSync(target, { recursive: true });
  const auth = path.join(os.homedir(), ".codex", "auth.json");
  if (!fs.existsSync(auth)) return { home: target, available: false };
  fs.copyFileSync(auth, path.join(target, "auth.json"));
  return { home: target, available: true };
}

function prepareCodexReceiptRecoveryRuntime(workspace, taskAgentSessionId) {
  const taskId = `phase364-live-receipt-${runId}`;
  const project = "phase364-live-codex-receipt";
  const challenge = receiptStore.createMemoryContextConsumptionChallenge({
    groupId,
    groupSessionId,
    taskId,
    executionId: taskId,
    project,
    taskAgentSessionId,
    attempt: 1,
  });
  const receiptFile = receiptStore.memoryContextConsumptionReceiptFile(challenge.challenge_id);
  const servers = internalMcp.buildTaskBoundInternalMcpServers({
    taskId,
    groupId,
    groupSessionId,
    project,
    role: "project-child-agent",
    agentType: "codex",
    taskAgentSessionId,
    workDir: workspace,
    baseWorkDir: workspace,
    memoryReceiptChallenge: challenge,
    memoryReceiptFile: receiptFile,
  });
  const audit = runtimeToolSync.syncRuntimeToolsWithCatalog(
    workspace,
    "codex",
    { mcp: [], skill: [] },
    { mcpTools: [], skills: [], runtimeStorageRoot: path.join(runRoot, "receipt-runtime"), codexGateway: null },
    { internalMcpServers: servers },
  );
  return {
    taskId,
    project,
    challenge,
    receiptFile,
    audit,
    ready: audit?.mode !== "failed" && !!audit?.isolatedHomePath && fs.existsSync(String(audit?.mcpConfigPath || "")),
  };
}

function resolveProviderLaunch(provider, version) {
  if (fixtureAdapter) return { command: process.execPath, prefixArgs: [fixtureAdapter] };
  const paths = Array.isArray(version?.executablePaths) ? version.executablePaths : [];
  const shim = paths.find(item => String(item).toLowerCase().endsWith(".cmd")) || "";
  if (provider === "claudecode" && shim) {
    const executable = path.join(path.dirname(shim), "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
    if (fs.existsSync(executable)) return { command: executable, prefixArgs: [] };
  }
  if (provider === "codex") {
    if (shim) {
      const entry = path.join(path.dirname(shim), "node_modules", "@openai", "codex", "bin", "codex.js");
      if (fs.existsSync(entry)) return { command: process.execPath, prefixArgs: [entry] };
    }
    const executable = paths.find(item => String(item).toLowerCase().endsWith(".exe") && fs.existsSync(item));
    if (executable) return { command: executable, prefixArgs: [] };
  }
  if (provider === "cursor") {
    const versionName = String(version?.semanticVersion || version?.versionText || "").trim();
    const versionRoot = path.join(process.env.LOCALAPPDATA || "", "cursor-agent", "versions", versionName);
    const executable = path.join(versionRoot, "node.exe");
    const entry = path.join(versionRoot, "index.js");
    if (fs.existsSync(executable) && fs.existsSync(entry)) return { command: executable, prefixArgs: [entry] };
  }
  return { command: provider === "claudecode" ? "claude" : provider === "cursor" ? "agent" : "codex", prefixArgs: [] };
}

function providerInvocation(provider, stage, prompt, sessionId, workspace, codexHome, launch) {
  if (fixtureAdapter) {
    return { command: launch.command, args: [...launch.prefixArgs, provider, stage, sessionId, prompt], env: process.env };
  }
  if (provider === "claudecode") {
    const sessionArgs = stage === "initial" ? ["--session-id", sessionId] : ["--resume", sessionId];
    return {
      command: launch.command,
      args: [...launch.prefixArgs, "--safe-mode", "--permission-mode", "plan", "--model", claudeModel, "--disallowedTools", "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch", "--max-budget-usd", maxBudgetUsd, "--output-format", "stream-json", "--verbose", ...sessionArgs, "-p", prompt],
      env: process.env,
    };
  }
  if (provider === "cursor") {
    const resumeArgs = stage === "resume" ? ["--resume", sessionId] : [];
    return { command: launch.command, args: [...launch.prefixArgs, "-p", "--mode", "ask", "--model", cursorModel, "--output-format", "stream-json", "--trust", ...resumeArgs, prompt], env: process.env };
  }
  const resumeArgs = stage === "resume"
    ? ["resume", "-c", "sandbox_mode=\"read-only\"", "--model", codexModel, "--skip-git-repo-check", "--json", sessionId, "-"]
    : ["--sandbox", "read-only", "--model", codexModel, "--skip-git-repo-check", "--json", "-"];
  return { command: launch.command, args: [...launch.prefixArgs, "exec", ...resumeArgs], input: prompt, env: { ...process.env, CODEX_HOME: codexHome } };
}

function recordProbeEvent(provider, taskAgentSessionId, phase, status, evidence) {
  try {
    return soak.tryRecordTaskAgentContinuationSoakEvent({
      groupId,
      groupSessionId,
      taskAgentSessionId,
      phase,
      status,
      eventKey: `${runId}:${provider}:${phase}:${status}`,
      source: "live_provider_native_memory_soak",
      evidence: { provider, liveProviderMemoryProbeRunId: runId, ...evidence },
    });
  } catch (error) {
    return { recorded: false, error: error?.message || String(error) };
  }
}

async function runLiveCodexReceiptRecovery(input) {
  const runnerRequestId = `live-receipt-${runId}`;
  const initialContract = runtime.extractProviderOutputContractEvidence("codex", input.initialRun.stdout, { runtimeVersionSnapshot: input.version });
  const parentEvidence = nativeContinuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: "",
    returnedNativeSessionId: input.initial.sessionId,
    providerOutputContractEvidence: initialContract,
    providerRuntimeVersionSnapshot: input.version,
    nativeResumeRequested: false,
    runnerSuccess: input.initialRun.code === 0 && !input.initialRun.timedOut,
  });
  let recoveryRun = null;
  let recoveryProgress = null;
  let recoveryRawChecksum = "";
  const result = await receiptRecovery.recoverMemoryContextConsumptionReceipt({
    challenge: input.fixture.challenge,
    provider: "codex",
    runnerRequestId,
    groupId,
    groupSessionId,
    taskId: input.fixture.taskId,
    executionId: input.fixture.taskId,
    project: input.fixture.project,
    taskAgentSessionId: input.taskAgentSessionId,
    nativeContinuationEvidence: parentEvidence,
    providerRuntimeVersionSnapshot: input.version,
    trustedMemoryEnvelopeChecksum: digest(`live-envelope:${runId}`),
    trustedMemoryEnvelopeSourceChecksum: digest(`live-source:${runId}`),
    providerWorkCompleted: true,
  }, async request => {
    const invocation = providerInvocation("codex", "resume", request.prompt, input.initial.sessionId, input.workspace, input.codexHome, input.launch);
    recoveryRun = await runProcess(invocation.command, invocation.args, { cwd: input.workspace, env: invocation.env, input: invocation.input, timeoutMs });
    const raw = `${recoveryRun.stdout}\n${recoveryRun.stderr}`.trim();
    recoveryRawChecksum = digest(raw);
    recoveryProgress = buildProgressEvidence("codex", recoveryRun, input.initial.sessionId);
    const normalized = normalizeProviderOutput("codex", recoveryRun.stdout, input.initial.sessionId);
    const contract = runtime.extractProviderOutputContractEvidence("codex", recoveryRun.stdout, { runtimeVersionSnapshot: input.version });
    if (fixtureAdapter && process.env.CCM_LIVE_PROVIDER_MEMORY_SOAK_FIXTURE_RECEIPT === "1") {
      receiptStore.recordMemoryContextConsumptionReceipt({
        taskId: input.fixture.taskId,
        groupId,
        groupSessionId,
        project: input.fixture.project,
        role: "project-child-agent",
        agentType: "codex",
        taskAgentSessionId: input.taskAgentSessionId,
        nativeSessionId: input.initial.sessionId,
        memoryReceiptChallenge: input.fixture.challenge,
        memoryReceiptFile: input.fixture.receiptFile,
      }, { challenge_id: input.fixture.challenge.challenge_id });
    }
    return {
      success: recoveryRun.code === 0 && !recoveryRun.timedOut,
      exitCode: recoveryRun.code,
      output: normalized.text,
      nativeSessionId: normalized.sessionId,
      returnedNativeSessionId: normalized.sessionId,
      providerOutputContractEvidence: contract,
      providerRuntimeVersionSnapshot: input.version,
    };
  });
  const receipt = receiptStore.readMemoryContextConsumptionReceipt(input.fixture.challenge, {
    groupId,
    groupSessionId,
    taskId: input.fixture.taskId,
    executionId: input.fixture.taskId,
    project: input.fixture.project,
    taskAgentSessionId: input.taskAgentSessionId,
  });
  return { result, receipt, recoveryRun, recoveryProgress, recoveryRawChecksum, parentEvidence };
}

async function runProvider(provider, codexHome) {
  const workspace = path.join(runRoot, `workspace-${provider}`);
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(path.join(workspace, "probe-baseline.txt"), "CCM live provider memory probe baseline\n", "utf8");
  const workspaceBefore = treeChecksum(workspace);
  const sentinel = `CCM_PHASE363_${provider.toUpperCase()}_${crypto.randomBytes(12).toString("hex")}`;
  const sentinelChecksum = digest(sentinel);
  const requestedSessionId = provider === "claudecode" ? crypto.randomUUID() : "";
  const taskAgentSessionId = `tas_${runId}_${provider}`;
  const receiptFixture = codexReceiptRecoveryMode && provider === "codex"
    ? prepareCodexReceiptRecoveryRuntime(workspace, taskAgentSessionId)
    : null;
  if (receiptFixture?.ready) codexHome = String(receiptFixture.audit.isolatedHomePath || codexHome);
  const version = runtime.captureAgentRuntimeVersionSnapshot(provider);
  const launch = resolveProviderLaunch(provider, version);
  const providerModel = provider === "claudecode" ? claudeModel : provider === "cursor" ? cursorModel : codexModel;
  const baseEvidence = {
    liveProviderMemoryProbeAccountBacked: !fixtureAdapter,
    liveProviderMemoryProbeSentinelChecksum: sentinelChecksum,
    providerRuntimeVersion: String(version?.semanticVersion || version?.versionText || ""),
    providerRuntimeIdentityChecksum: String(version?.executableIdentityChecksum || ""),
    liveProviderMemoryProbeModel: providerModel,
    liveProviderMemoryProbeReceiptRecoveryRequired: !!receiptFixture,
  };
  recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_prepared", "prepared", { ...baseEvidence, liveProviderMemoryProbeStage: "prepared" });
  if (version?.status !== "ok" || (provider === "codex" && !fixtureAdapter && !codexHome) || (receiptFixture && !receiptFixture.ready)) {
    const issue = version?.status !== "ok" ? "provider_runtime_unavailable" : receiptFixture && !receiptFixture.ready ? "codex_receipt_runtime_unavailable" : "codex_auth_unavailable";
    recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_terminal", "unavailable", { ...baseEvidence, liveProviderMemoryProbeStage: "terminal", liveProviderMemoryProbeIssue: issue, liveProviderMemoryProbeWorkspaceUnchanged: true });
    return { provider, status: "unavailable", issue, version: baseEvidence.providerRuntimeVersion, model: providerModel, providerRuntimeIdentityChecksum: baseEvidence.providerRuntimeIdentityChecksum, sentinelChecksum, workspaceUnchanged: true };
  }

  const initialPrompt = receiptFixture
    ? `Trusted group-session memory probe. Remember this exact private sentinel and memory challenge for the immediately next turn: sentinel=${sentinel} challenge_id=${receiptFixture.challenge.challenge_id}. This is a controlled omission turn: do not call any MCP tool now. Reply only INITIAL_OK. Do not modify files.`
    : `No-tools memory continuity probe. Remember this exact private sentinel for the next turn: ${sentinel}. Reply only INITIAL_OK. Do not invoke tools and do not modify files.`;
  const initialInvocation = providerInvocation(provider, "initial", initialPrompt, requestedSessionId, workspace, codexHome, launch);
  const initialRun = await runProcess(initialInvocation.command, initialInvocation.args, { cwd: workspace, env: initialInvocation.env, input: initialInvocation.input, timeoutMs });
  const initialRaw = `${initialRun.stdout}\n${initialRun.stderr}`.trim();
  const initial = normalizeProviderOutput(provider, initialRun.stdout, requestedSessionId);
  const initialProgress = buildProgressEvidence(provider, initialRun, requestedSessionId);
  const initialStatus = initialRun.timedOut ? "timeout" : initialRun.code !== 0 ? "failed" : !initial.text.includes("INITIAL_OK") ? "initial_unverified" : !initial.sessionId ? "session_unverified" : "passed";
  const initialIssue = initialRun.timedOut
    ? classifyTimedOutProgress(initialProgress)
    : classifyProviderIssue(initialRaw, initialRun.issue || (initialStatus === "passed" ? "" : initialStatus));
  recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_initial", initialStatus, {
    ...baseEvidence,
    liveProviderMemoryProbeStage: "initial",
    liveProviderMemoryProbeSessionChecksum: digest(initial.sessionId),
    liveProviderMemoryProbeOutputChecksum: digest(initialRaw),
    liveProviderMemoryProbeTimedOut: initialRun.timedOut,
    liveProviderMemoryProbeDurationMs: initialRun.durationMs,
    liveProviderMemoryProbeIssue: initialIssue,
    ...compactProgressEvidence(initialProgress),
  });

  let terminalStatus = initialStatus;
  let issue = initialIssue;
  let resumeRun = null;
  let resumeProgress = null;
  let resumeOutputChecksum = "";
  let liveReceiptRecovery = null;
  if (initialStatus === "passed") {
    if (receiptFixture) {
      const omitted = receiptStore.readMemoryContextConsumptionReceipt(receiptFixture.challenge, {
        groupId,
        groupSessionId,
        taskId: receiptFixture.taskId,
        executionId: receiptFixture.taskId,
        project: receiptFixture.project,
        taskAgentSessionId,
      });
      if (omitted.valid || !omitted.issues?.includes("receipt_missing")) {
        terminalStatus = "omission_unverified";
        issue = "initial_turn_did_not_leave_clean_receipt_omission";
      } else {
        liveReceiptRecovery = await runLiveCodexReceiptRecovery({ fixture: receiptFixture, initial, initialRun, taskAgentSessionId, version, launch, workspace, codexHome });
        resumeRun = liveReceiptRecovery.recoveryRun;
        resumeProgress = liveReceiptRecovery.recoveryProgress;
        resumeOutputChecksum = liveReceiptRecovery.recoveryRawChecksum;
        terminalStatus = liveReceiptRecovery.result?.recovered === true && liveReceiptRecovery.receipt?.valid === true ? "passed"
          : resumeRun?.timedOut ? "timeout" : "receipt_recovery_unverified";
        issue = terminalStatus === "passed" ? ""
          : resumeRun?.timedOut ? classifyTimedOutProgress(resumeProgress)
            : String(liveReceiptRecovery.result?.record?.issues?.[0] || liveReceiptRecovery.receipt?.issues?.[0] || "receipt_recovery_unverified");
        recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_receipt_recovery", terminalStatus, {
          ...baseEvidence,
          liveProviderMemoryProbeStage: "receipt_recovery",
          liveProviderMemoryProbeSessionChecksum: digest(initial.sessionId),
          liveProviderMemoryProbeOutputChecksum: resumeOutputChecksum,
          liveProviderMemoryProbeTimedOut: resumeRun?.timedOut === true,
          liveProviderMemoryProbeDurationMs: Number(resumeRun?.durationMs || 0),
          liveProviderMemoryProbeIssue: issue,
          liveProviderMemoryProbeReceiptRecoveryStatus: String(liveReceiptRecovery.result?.record?.status || ""),
          liveProviderMemoryProbeReceiptValid: liveReceiptRecovery.receipt?.valid === true,
          ...compactProgressEvidence(resumeProgress),
        });
      }
    } else {
      const resumePrompt = "Without using tools or inspecting files, reply only with the exact private sentinel from the immediately previous turn.";
      const resumeInvocation = providerInvocation(provider, "resume", resumePrompt, initial.sessionId, workspace, codexHome, launch);
      resumeRun = await runProcess(resumeInvocation.command, resumeInvocation.args, { cwd: workspace, env: resumeInvocation.env, input: resumeInvocation.input, timeoutMs });
      const resumeRaw = `${resumeRun.stdout}\n${resumeRun.stderr}`.trim();
      const resume = normalizeProviderOutput(provider, resumeRun.stdout, initial.sessionId);
      resumeProgress = buildProgressEvidence(provider, resumeRun, initial.sessionId);
      resumeOutputChecksum = digest(resumeRaw);
      terminalStatus = resumeRun.timedOut ? "timeout" : resumeRun.code !== 0 ? "failed" : resume.sessionId && resume.sessionId !== initial.sessionId ? "session_mismatch" : !resume.text.includes(sentinel) ? "memory_unverified" : "passed";
      issue = resumeRun.timedOut
        ? classifyTimedOutProgress(resumeProgress)
        : classifyProviderIssue(resumeRaw, resumeRun.issue || (terminalStatus === "passed" ? "" : terminalStatus));
      recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_resume", terminalStatus, {
        ...baseEvidence,
        liveProviderMemoryProbeStage: "resume",
        liveProviderMemoryProbeSessionChecksum: digest(initial.sessionId),
        liveProviderMemoryProbeOutputChecksum: resumeOutputChecksum,
        liveProviderMemoryProbeTimedOut: resumeRun.timedOut,
        liveProviderMemoryProbeDurationMs: resumeRun.durationMs,
        liveProviderMemoryProbeIssue: issue,
        ...compactProgressEvidence(resumeProgress),
      });
    }
  }

  const workspaceAfter = treeChecksum(workspace);
  const workspaceUnchanged = workspaceBefore === workspaceAfter;
  if (!workspaceUnchanged && terminalStatus === "passed") {
    terminalStatus = "workspace_changed";
    issue = "provider_modified_probe_workspace";
  }
  recordProbeEvent(provider, taskAgentSessionId, "live_provider_memory_probe_terminal", terminalStatus, {
    ...baseEvidence,
    liveProviderMemoryProbeStage: "terminal",
    liveProviderMemoryProbeSessionChecksum: digest(initial.sessionId),
    liveProviderMemoryProbeOutputChecksum: resumeOutputChecksum || digest(initialRaw),
    liveProviderMemoryProbeTimedOut: initialRun.timedOut || resumeRun?.timedOut === true,
    liveProviderMemoryProbeDurationMs: initialRun.durationMs + Number(resumeRun?.durationMs || 0),
    liveProviderMemoryProbeWorkspaceUnchanged: workspaceUnchanged,
    liveProviderMemoryProbeIssue: issue,
    liveProviderMemoryProbeReceiptRecoveryStatus: String(liveReceiptRecovery?.result?.record?.status || ""),
    liveProviderMemoryProbeReceiptValid: liveReceiptRecovery?.receipt?.valid === true,
    ...compactProgressEvidence(resumeProgress || initialProgress),
  });
  return {
    provider,
    status: terminalStatus,
    issue,
    version: baseEvidence.providerRuntimeVersion,
    model: providerModel,
    providerRuntimeIdentityChecksum: baseEvidence.providerRuntimeIdentityChecksum,
    sentinelChecksum,
    sessionChecksum: digest(initial.sessionId),
    initial: { status: initialStatus, durationMs: initialRun.durationMs, timedOut: initialRun.timedOut, outputChecksum: digest(initialRaw), progress: initialProgress },
    resume: resumeRun ? { status: terminalStatus, durationMs: resumeRun.durationMs, timedOut: resumeRun.timedOut, outputChecksum: resumeOutputChecksum, progress: resumeProgress } : null,
    receiptRecovery: receiptFixture ? {
      required: true,
      challengeChecksum: digest(receiptFixture.challenge.challenge_id),
      cleanOmissionObserved: initialStatus === "passed" && !!liveReceiptRecovery,
      status: String(liveReceiptRecovery?.result?.record?.status || (terminalStatus === "omission_unverified" ? "omission_unverified" : "not_run")),
      recovered: liveReceiptRecovery?.result?.recovered === true,
      receiptValid: liveReceiptRecovery?.receipt?.valid === true,
      recoveryId: String(liveReceiptRecovery?.result?.record?.recovery_id || ""),
      recoverySignatureChecksum: digest(liveReceiptRecovery?.result?.record?.recovery_signature || ""),
      suppressTaskReplay: liveReceiptRecovery?.result?.record?.suppress_task_replay === true,
    } : null,
    workspaceUnchanged,
  };
}

const startedAt = new Date().toISOString();
const providerRows = [];
let codex = null;
try {
  if (!live && !fixtureAdapter) {
    console.error("Live Provider memory soak is disabled. Re-run with --live or CCM_RUN_LIVE_PROVIDER_MEMORY_SOAK=1.");
    process.exitCode = 2;
  } else {
    codex = prepareCodexHome();
    for (const provider of selectedProviders) providerRows.push(await runProvider(provider, codex.available ? codex.home : ""));
    const unsigned = {
      schema: "ccm-live-provider-native-memory-soak-report-v2",
      version: 2,
      runId,
      generatedAt: new Date().toISOString(),
      startedAt,
      accountBacked: !fixtureAdapter,
      groupId,
      groupSessionId,
      timeoutMs,
      providerCount: providerRows.length,
      passedCount: providerRows.filter(row => row.status === "passed").length,
      timeoutCount: providerRows.filter(row => row.status === "timeout").length,
      unavailableCount: providerRows.filter(row => row.status === "unavailable").length,
      failedCount: providerRows.filter(row => !["passed", "timeout", "unavailable"].includes(row.status)).length,
      providers: providerRows,
    };
    const report = { ...unsigned, reportChecksum: digest(JSON.stringify(canonical(unsigned))) };
    const reportFile = reportStore.commitLiveProviderMemorySoakReport(report, { kind: "single", fileName: `${runId}.json` });
    console.log(`PHASE363_LIVE_PROVIDER_MEMORY_SOAK=${JSON.stringify({ ...report, reportFile })}`);
    if (report.passedCount !== report.providerCount) process.exitCode = 1;
  }
} finally {
  fs.rmSync(runRoot, { recursive: true, force: true });
}
