import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { CCM_DIR } from "../../core/utils";
import type { TestAgentInvocationResult } from "../../test-agent/invocation";
import { verifyTestAgentArtifactManifestFile } from "../../test-agent/artifact-verifier";

export type TestAgentRunnerMode = "plan" | "invocation";
export type TestAgentRunnerStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";

export interface TestAgentSourceProjectBinding {
  name: string;
  workDir: string;
  realWorkDir: string;
  gitHead: string;
  gitStatusHash: string;
  declaredFiles: string[];
  declaredFileHash: string;
  fingerprint: string;
}

export interface TestAgentSourceBinding {
  schema: "ccm-test-agent-source-binding-v1";
  capturedAt: string;
  fingerprint: string;
  projects: TestAgentSourceProjectBinding[];
}

export interface TestAgentRunnerRecord {
  schema: "ccm-test-agent-runner-record-v1";
  id: string;
  key: string;
  mode: TestAgentRunnerMode;
  taskId: string;
  groupId: string;
  handoffId: string;
  handoffHash: string;
  status: TestAgentRunnerStatus;
  pid: number;
  createdAt: string;
  startedAt: string;
  heartbeatAt: string;
  finishedAt: string;
  deadlineAt: string;
  timeoutMs: number;
  handoffPath: string;
  stdoutPath: string;
  stderrPath: string;
  exitCode: number | null;
  signal: string;
  error: string;
  cancelledReason: string;
  recoveredAfterRestart: boolean;
  sourceBefore: TestAgentSourceBinding;
  sourceAfter?: TestAgentSourceBinding;
  sourceStable?: boolean;
  result?: any;
}

export interface RunTestAgentJobInput {
  mode: TestAgentRunnerMode;
  handoff: any;
  taskId?: string;
  groupId?: string;
  timeoutMs?: number;
  idempotencyKey?: string;
  allowedWorkDirs?: string[];
}

export interface TestAgentRunnerResult {
  schema: "ccm-test-agent-runner-result-v1";
  record: TestAgentRunnerRecord;
  plan?: any;
  invocation?: TestAgentInvocationResult;
  stdout: string;
  stderr: string;
  reused: boolean;
}

const RUN_DIR = path.join(CCM_DIR, "test-agent-runs");
const HANDOFF_DIR = path.join(CCM_DIR, "test-agent-handoffs");
const activeByKey = new Map<string, Promise<TestAgentRunnerResult>>();
const activeChildren = new Map<string, { child: ChildProcess; record: TestAgentRunnerRecord }>();
const purgedRunIds = new Set<string>();

function nowIso() {
  return new Date().toISOString();
}

function ensureDirs() {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.mkdirSync(HANDOFF_DIR, { recursive: true });
}

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

function hash(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}

function safeId(value: any, fallback: string) {
  return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || fallback;
}

function recordFile(id: string) {
  return path.join(RUN_DIR, `${safeId(id, "test-agent-run")}.json`);
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(3).toString("hex")}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  let lastError: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      fs.renameSync(temp, file);
      return;
    } catch (error: any) {
      lastError = error;
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch {}
      }
    }
  }
  try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
  throw lastError || new Error(`Unable to persist TestAgent runner record: ${file}`);
}

function saveRecord(record: TestAgentRunnerRecord) {
  if (purgedRunIds.has(record.id)) return;
  writeJsonAtomic(recordFile(record.id), record);
}

function loadRecords() {
  ensureDirs();
  return fs.readdirSync(RUN_DIR)
    .filter(file => file.endsWith(".json"))
    .map(file => {
      try { return JSON.parse(fs.readFileSync(path.join(RUN_DIR, file), "utf-8")) as TestAgentRunnerRecord; } catch { return null; }
    })
    .filter((item): item is TestAgentRunnerRecord => !!item && item.schema === "ccm-test-agent-runner-record-v1");
}

export function listTestAgentRunnerRecords(options: { taskIds?: string[]; limit?: number } = {}) {
  const taskIds = new Set((options.taskIds || []).map(item => String(item || "").trim()).filter(Boolean));
  const limit = Math.max(1, Math.min(2000, Number(options.limit || 500)));
  return loadRecords()
    .filter(record => !taskIds.size || taskIds.has(record.taskId))
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, limit);
}

/** Test-only helper: persist a runner record without registering activeChildren (orphan simulation). */
export function upsertTestAgentRunnerRecordForSelfTest( partial: Partial<TestAgentRunnerRecord> & { id: string; taskId: string }) {
  ensureDirs();
  const now = nowIso();
  const record: TestAgentRunnerRecord = {
    schema: "ccm-test-agent-runner-record-v1",
    id: partial.id,
    key: partial.key || partial.id,
    mode: partial.mode || "invocation",
    taskId: partial.taskId,
    groupId: partial.groupId || "",
    handoffId: partial.handoffId || "",
    handoffHash: partial.handoffHash || "",
    status: partial.status || "running",
    pid: Number(partial.pid || 0),
    createdAt: partial.createdAt || now,
    startedAt: partial.startedAt || now,
    heartbeatAt: partial.heartbeatAt || now,
    finishedAt: partial.finishedAt || "",
    deadlineAt: partial.deadlineAt || "",
    timeoutMs: Number(partial.timeoutMs || 60_000),
    handoffPath: partial.handoffPath || "",
    stdoutPath: partial.stdoutPath || "",
    stderrPath: partial.stderrPath || "",
    exitCode: partial.exitCode === undefined ? null : partial.exitCode,
    signal: partial.signal || "",
    error: partial.error || "",
    cancelledReason: partial.cancelledReason || "",
    recoveredAfterRestart: partial.recoveredAfterRestart === true,
    sourceBefore: partial.sourceBefore || {
      schema: "ccm-test-agent-source-binding-v1",
      capturedAt: now,
      fingerprint: "self-test",
      projects: [],
    },
    ...(partial.sourceAfter ? { sourceAfter: partial.sourceAfter } : {}),
    ...(partial.sourceStable !== undefined ? { sourceStable: partial.sourceStable } : {}),
    ...(partial.result ? { result: partial.result } : {}),
  };
  saveRecord(record);
  return record;
}

export function getTestAgentRunnerRecordForSelfTest(id: string) {
  const safe = safeId(id, "");
  if (!safe) return null;
  return loadRecords().find(record => record.id === id || record.id === safe) || null;
}

function readLimited(file: string, max = 32 * 1024 * 1024) {
  if (!file || !fs.existsSync(file)) return "";
  const stat = fs.statSync(file);
  const size = Math.min(stat.size, max);
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(size);
    fs.readSync(fd, buffer, 0, size, Math.max(0, stat.size - size));
    return buffer.toString("utf-8");
  } finally {
    fs.closeSync(fd);
  }
}

function parseResult(mode: TestAgentRunnerMode, stdout: string) {
  try {
    const parsed = JSON.parse(String(stdout || "").trim());
    if (mode === "plan" && parsed?.schema === "ccm-test-agent-execution-plan-v1") return parsed;
    if (mode === "invocation" && parsed?.schema === "ccm-test-agent-invocation-result-v1") return parsed;
  } catch {}
  return null;
}

function refreshInvocationArtifactVerification(result: any) {
  if (result?.schema !== "ccm-test-agent-invocation-result-v1") return result;
  const manifestPath = String(result?.report?.metadata?.artifactFiles?.manifestPath || result?.artifactVerification?.manifestPath || "");
  if (!manifestPath) return result;
  try {
    const verification = verifyTestAgentArtifactManifestFile(manifestPath);
    result.artifactVerification = verification;
    if (verification.status !== "passed") {
      result.status = "runtime_error";
      result.canAccept = false;
      result.outputValidation = {
        valid: false,
        errors: [{ severity: "error", code: "test_agent_cached_artifact_verification_failed", message: "Cached TestAgent artifacts no longer pass integrity verification." }],
        warnings: result.outputValidation?.warnings || [],
      };
      result.error = "Cached TestAgent artifacts changed after the original invocation.";
    }
  } catch (error: any) {
    result.status = "runtime_error";
    result.canAccept = false;
    result.outputValidation = {
      valid: false,
      errors: [{ severity: "error", code: "test_agent_cached_artifact_verification_error", message: error.message || String(error) }],
      warnings: result.outputValidation?.warnings || [],
    };
    result.error = "Cached TestAgent artifacts could not be reverified.";
  }
  return result;
}

function gitValue(workDir: string, args: string[], maxBuffer = 8 * 1024 * 1024) {
  try {
    const result = spawnSync("git", ["-C", workDir, ...args], { encoding: "utf-8", windowsHide: true, timeout: 8000, maxBuffer });
    return result.status === 0 ? String(result.stdout || "").trim() : "";
  } catch {
    return "";
  }
}

function declaredFileHash(project: any, realWorkDir: string) {
  const files: string[] = [...new Set<string>((project?.changedFiles || project?.changed_files || []).map((item: any) => String(item)).filter(Boolean))].sort();
  const digest = crypto.createHash("sha256");
  for (const relative of files.slice(0, 200)) {
    const file = path.resolve(realWorkDir, relative);
    const rel = path.relative(realWorkDir, file);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;
    digest.update(relative);
    try {
      const stat = fs.statSync(file);
      digest.update(`${stat.size}:${stat.mtimeMs}`);
      if (stat.isFile() && stat.size <= 25 * 1024 * 1024) digest.update(fs.readFileSync(file));
    } catch {
      digest.update("missing");
    }
  }
  return digest.digest("hex");
}

export function captureTestAgentSourceBinding(handoff: any): TestAgentSourceBinding {
  const projects = (Array.isArray(handoff?.projects) ? handoff.projects : handoff?.project ? [handoff.project] : [])
    .map((project: any, index: number): TestAgentSourceProjectBinding => {
      const workDir = path.resolve(String(project?.workDir || project?.work_dir || process.cwd()));
      let realWorkDir = workDir;
      try { realWorkDir = fs.realpathSync(workDir); } catch {}
      const gitHead = gitValue(realWorkDir, ["rev-parse", "HEAD"]);
      const gitStatus = gitValue(realWorkDir, ["status", "--porcelain=v1", "--untracked-files=all"]);
      const gitStatusHash = hash(gitStatus);
      const declaredFiles = [...new Set((project?.changedFiles || project?.changed_files || []).map(String).filter(Boolean))].sort() as string[];
      const fileHash = declaredFileHash(project, realWorkDir);
      return {
        name: String(project?.name || `project-${index + 1}`),
        workDir,
        realWorkDir,
        gitHead,
        gitStatusHash,
        declaredFiles,
        declaredFileHash: fileHash,
        fingerprint: hash({ realWorkDir: realWorkDir.toLowerCase(), gitHead, gitStatusHash, fileHash }),
      };
    });
  return {
    schema: "ccm-test-agent-source-binding-v1",
    capturedAt: nowIso(),
    fingerprint: hash(projects.map(project => project.fingerprint)),
    projects,
  };
}

function processAlive(pid: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function killProcessTree(pid: number) {
  if (!pid) return;
  if (process.platform === "win32") {
    try { spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { windowsHide: true, stdio: "ignore", timeout: 10000 }); } catch {}
    return;
  }
  try { process.kill(-pid, "SIGTERM"); } catch { try { process.kill(pid, "SIGTERM"); } catch {} }
}

function resolveCliPath() {
  const candidates = [
    path.resolve(__dirname, "../../test-agent/cli.js"),
    path.join(CCM_DIR, "ccm-package", "dist", "test-agent", "cli.js"),
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}

function writeHandoff(handoff: any) {
  ensureDirs();
  const id = safeId(handoff?.id, "test-agent-handoff");
  const file = path.join(HANDOFF_DIR, `${id}-${hash(handoff).slice(0, 16)}.handoff.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, `${JSON.stringify(handoff, null, 2)}\n`, "utf-8");
  return file;
}

function resultFromRecord(record: TestAgentRunnerRecord, reused: boolean): TestAgentRunnerResult {
  const stdout = readLimited(record.stdoutPath);
  const stderr = readLimited(record.stderrPath);
  const result = record.mode === "invocation"
    ? refreshInvocationArtifactVerification(record.result || parseResult(record.mode, stdout))
    : record.result || parseResult(record.mode, stdout);
  return {
    schema: "ccm-test-agent-runner-result-v1",
    record: { ...record, result },
    ...(record.mode === "plan" ? { plan: result } : { invocation: result }),
    stdout,
    stderr,
    reused,
  };
}

async function waitForRecoveredRecord(record: TestAgentRunnerRecord) {
  while (processAlive(record.pid) && Date.now() < Date.parse(record.deadlineAt)) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (processAlive(record.pid)) {
    killProcessTree(record.pid);
    record.error = `TestAgent ${record.mode} timed out after ${record.timeoutMs}ms.`;
    record.status = "failed";
  }
  const stdout = readLimited(record.stdoutPath);
  const parsed = parseResult(record.mode, stdout);
  record.sourceAfter = captureTestAgentSourceBinding({ projects: record.sourceBefore.projects.map(item => ({ name: item.name, workDir: item.realWorkDir, changedFiles: item.declaredFiles })) });
  record.sourceStable = record.sourceBefore.fingerprint === record.sourceAfter.fingerprint;
  record.result = parsed;
  record.finishedAt = nowIso();
  record.heartbeatAt = record.finishedAt;
  record.recoveredAfterRestart = true;
  if (record.status !== "failed" && record.status !== "cancelled") {
    const exitOk = record.exitCode === 0 || record.exitCode === null;
    // Recovered waiters rarely know exitCode; require parsed contract and no kill/timeout failure.
    record.status = parsed && exitOk ? "completed" : "interrupted";
    if (parsed && record.exitCode !== 0 && record.exitCode !== null) {
      record.status = "failed";
      record.error = record.error || `TestAgent process exited with code ${record.exitCode}.`;
    }
  }
  if (!parsed && !record.error) record.error = "TestAgent process ended without a contract-valid result.";
  saveRecord(record);
  const result = resultFromRecord(record, true);
  purgedRunIds.delete(record.id);
  return result;
}

function finalizeRecord(record: TestAgentRunnerRecord, status: TestAgentRunnerStatus, exitCode: number | null, signal: string, error = "") {
  const stdout = readLimited(record.stdoutPath);
  const parsed = parseResult(record.mode, stdout);
  record.exitCode = exitCode;
  record.signal = signal;
  record.error = error || (!parsed ? "TestAgent process did not return the expected result contract." : "");
  record.result = parsed;
  record.sourceAfter = captureTestAgentSourceBinding({ projects: record.sourceBefore.projects.map(item => ({ name: item.name, workDir: item.realWorkDir, changedFiles: item.declaredFiles })) });
  record.sourceStable = record.sourceBefore.fingerprint === record.sourceAfter.fingerprint;
  if (status === "cancelled") {
    record.status = "cancelled";
  } else if (parsed && exitCode === 0) {
    record.status = "completed";
  } else if (status === "interrupted") {
    record.status = "interrupted";
  } else {
    record.status = "failed";
    if (parsed && exitCode !== 0 && exitCode !== null && !record.error) {
      record.error = `TestAgent process exited with code ${exitCode}.`;
    }
  }
  record.finishedAt = nowIso();
  record.heartbeatAt = record.finishedAt;
  saveRecord(record);
  return resultFromRecord(record, false);
}

async function startJob(input: RunTestAgentJobInput, key: string): Promise<TestAgentRunnerResult> {
  ensureDirs();
  const sourceBefore = captureTestAgentSourceBinding(input.handoff);
  const handoffHash = hash(input.handoff);
  const id = `tar_${hash(key).slice(0, 24)}`;
  const handoffPath = writeHandoff(input.handoff);
  const timeoutMs = Math.max(30_000, Number(input.timeoutMs || (input.mode === "plan" ? 120_000 : 900_000)));
  const createdAt = nowIso();
  const stdoutPath = path.join(RUN_DIR, `${id}.stdout.json`);
  const stderrPath = path.join(RUN_DIR, `${id}.stderr.log`);
  const record: TestAgentRunnerRecord = {
    schema: "ccm-test-agent-runner-record-v1",
    id,
    key,
    mode: input.mode,
    taskId: String(input.taskId || input.handoff?.taskId || input.handoff?.task_id || ""),
    groupId: String(input.groupId || input.handoff?.groupId || input.handoff?.group_id || ""),
    handoffId: String(input.handoff?.id || ""),
    handoffHash,
    status: "queued",
    pid: 0,
    createdAt,
    startedAt: "",
    heartbeatAt: createdAt,
    finishedAt: "",
    deadlineAt: new Date(Date.now() + timeoutMs).toISOString(),
    timeoutMs,
    handoffPath,
    stdoutPath,
    stderrPath,
    exitCode: null,
    signal: "",
    error: "",
    cancelledReason: "",
    recoveredAfterRestart: false,
    sourceBefore,
  };
  saveRecord(record);

  const outFd = fs.openSync(stdoutPath, "w");
  const errFd = fs.openSync(stderrPath, "w");
  const cliArgs = [
    resolveCliPath(),
    "--from-handoff",
    handoffPath,
    ...(input.mode === "plan" ? ["--plan-only", "--json"] : ["--invocation-json", "--json"]),
  ];
  const child = spawn(process.execPath, cliArgs, {
    cwd: CCM_DIR,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", outFd, errFd],
    env: {
      ...process.env,
      CCM_TEST_AGENT_ALLOWED_WORK_DIRS: JSON.stringify((input.allowedWorkDirs || []).map(item => path.resolve(item))),
      CCM_TEST_AGENT_RUNNER_ID: id,
    },
  });
  fs.closeSync(outFd);
  fs.closeSync(errFd);
  record.pid = child.pid || 0;
  record.status = "running";
  record.startedAt = nowIso();
  record.heartbeatAt = record.startedAt;
  saveRecord(record);
  activeChildren.set(id, { child, record });

  return new Promise(resolve => {
    let settled = false;
    const finish = (status: TestAgentRunnerStatus, exitCode: number | null, signal = "", error = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearInterval(heartbeat);
      activeChildren.delete(id);
      try {
        resolve(finalizeRecord(record, status, exitCode, signal, error));
      } finally {
        purgedRunIds.delete(id);
      }
    };
    const heartbeat = setInterval(() => {
      record.heartbeatAt = nowIso();
      try { saveRecord(record); } catch {}
    }, 5000);
    heartbeat.unref?.();
    const timeout = setTimeout(() => {
      killProcessTree(record.pid);
      finish("failed", null, "", `TestAgent ${input.mode} timed out after ${timeoutMs}ms.`);
    }, timeoutMs);
    timeout.unref?.();
    child.on("error", error => finish("failed", null, "", error.message));
    child.on("close", (code, signal) => {
      const cancelled = record.status === "cancelled";
      finish(cancelled ? "cancelled" : code === null && !signal ? "interrupted" : "failed", code, String(signal || ""));
    });
  });
}

export async function runTestAgentCliJob(input: RunTestAgentJobInput): Promise<TestAgentRunnerResult> {
  const source = captureTestAgentSourceBinding(input.handoff);
  const key = hash({
    mode: input.mode,
    taskId: input.taskId || input.handoff?.taskId || input.handoff?.task_id || "",
    groupId: input.groupId || input.handoff?.groupId || input.handoff?.group_id || "",
    handoff: input.handoff,
    source: source.fingerprint,
    idempotencyKey: input.idempotencyKey || "",
  });
  const active = activeByKey.get(key);
  if (active) return active;

  const existing = loadRecords().filter(record => record.key === key).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  // Reuse completed or failed terminal records that still have a contract result.
  // Failed often means canAccept=false (CLI exit 1), not a missing invocation payload.
  if (
    existing?.result
    && existing.sourceStable !== false
    && (existing.status === "completed" || existing.status === "failed")
  ) {
    return resultFromRecord(existing, true);
  }
  if (existing?.status === "running" && processAlive(existing.pid)) {
    const recovered = waitForRecoveredRecord(existing);
    activeByKey.set(key, recovered);
    try { return await recovered; } finally { activeByKey.delete(key); }
  }

  const promise = startJob(input, key);
  activeByKey.set(key, promise);
  try { return await promise; } finally { activeByKey.delete(key); }
}

export function cancelTestAgentRunsForTask(taskId: string, reason = "Task cancelled") {
  const cancelled: string[] = [];
  const markCancelled = (record: TestAgentRunnerRecord) => {
    if (cancelled.includes(record.id)) return;
    record.status = "cancelled";
    record.cancelledReason = reason;
    record.heartbeatAt = nowIso();
    record.finishedAt = record.finishedAt || nowIso();
    saveRecord(record);
    if (record.pid) killProcessTree(record.pid);
    cancelled.push(record.id);
  };
  for (const { record } of activeChildren.values()) {
    if (record.taskId !== taskId || record.status !== "running") continue;
    markCancelled(record);
  }
  // Also kill orphaned running records after server restart (not in activeChildren).
  for (const record of loadRecords()) {
    if (record.taskId !== taskId || record.status !== "running") continue;
    markCancelled(record);
  }
  return cancelled;
}

export function reconcileTestAgentRunnerRecords() {
  const records = loadRecords();
  let interrupted = 0;
  let running = 0;
  for (const record of records) {
    if (record.status !== "running") continue;
    if (processAlive(record.pid)) {
      running += 1;
      continue;
    }
    const parsed = parseResult(record.mode, readLimited(record.stdoutPath));
    record.result = parsed;
    // Dead process after restart: only completed when contract-valid AND prior exit was success.
    const exitOk = record.exitCode === 0;
    record.status = parsed && exitOk ? "completed" : "interrupted";
    record.error = parsed && exitOk
      ? ""
      : (record.error || (parsed
        ? `TestAgent process ended with exit code ${record.exitCode ?? "unknown"}.`
        : "TestAgent process ended before the server could collect a valid result."));
    record.finishedAt = record.finishedAt || nowIso();
    record.heartbeatAt = record.finishedAt;
    record.recoveredAfterRestart = true;
    saveRecord(record);
    interrupted += record.status === "interrupted" ? 1 : 0;
  }
  const retention = pruneTestAgentRunnerRecords();
  return { schema: "ccm-test-agent-runner-reconciliation-v1", total: records.length, running, interrupted, retention };
}

function removeRunnerRecordFiles(record: TestAgentRunnerRecord, remaining: TestAgentRunnerRecord[]) {
  const files = [recordFile(record.id), record.stdoutPath, record.stderrPath];
  if (record.handoffPath && !remaining.some(item => item.id !== record.id && item.handoffPath === record.handoffPath)) files.push(record.handoffPath);
  let removed = 0;
  for (const file of files) {
    if (!file) continue;
    const resolved = path.resolve(file);
    const inOwnedRoot = [RUN_DIR, HANDOFF_DIR].some(root => {
      const relative = path.relative(root, resolved);
      return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    });
    if (!inOwnedRoot) continue;
    try { if (fs.existsSync(resolved)) { fs.unlinkSync(resolved); removed += 1; } } catch {}
  }
  return removed;
}

export function pruneTestAgentRunnerRecords(options: { retentionDays?: number; maxRecords?: number } = {}) {
  const records = loadRecords().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const retentionDays = Math.max(1, Number(options.retentionDays || process.env.CCM_TEST_AGENT_RUN_RETENTION_DAYS || 14));
  const maxRecords = Math.max(20, Number(options.maxRecords || process.env.CCM_TEST_AGENT_RUN_MAX_RECORDS || 500));
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60_000;
  const removable = records.filter((record, index) =>
    record.status !== "running"
    && (index >= maxRecords || Date.parse(record.finishedAt || record.createdAt) < cutoff)
  );
  const removableIds = new Set(removable.map(record => record.id));
  const remaining = records.filter(record => !removableIds.has(record.id));
  let removedFiles = 0;
  for (const record of removable) removedFiles += removeRunnerRecordFiles(record, remaining);
  return { schema: "ccm-test-agent-runner-retention-v1", scanned: records.length, removedRecords: removable.length, removedFiles };
}

export function purgeTestAgentRunnerRecordsForTask(taskId: string) {
  const records = loadRecords();
  const matching = records.filter(record => record.taskId === taskId);
  const matchingIds = new Set(matching.map(record => record.id));
  const remaining = records.filter(record => !matchingIds.has(record.id));
  for (const record of matching) purgedRunIds.add(record.id);
  cancelTestAgentRunsForTask(taskId, "Task permanently purged");
  for (const record of matching) {
    if (record.status !== "running" || activeChildren.has(record.id)) continue;
    record.status = "cancelled";
    record.cancelledReason = "Task permanently purged";
    killProcessTree(record.pid);
  }
  let removedFiles = 0;
  for (const record of matching) removedFiles += removeRunnerRecordFiles(record, remaining);
  return { schema: "ccm-test-agent-runner-task-purge-v1", taskId, removedRecords: matching.length, removedFiles };
}

export function runTestAgentRunnerSelfTest() {
  const handoff = {
    id: "runner-selftest",
    taskId: "runner-selftest-task",
    groupId: "runner-selftest-group",
    projects: [{ name: "selftest", workDir: process.cwd(), changedFiles: [] }],
  };
  const first = captureTestAgentSourceBinding(handoff);
  const second = captureTestAgentSourceBinding(handoff);
  return {
    pass: first.fingerprint === second.fingerprint && first.projects.length === 1,
    stableSourceFingerprint: first.fingerprint === second.fingerprint,
    recordsReconcile: !!reconcileTestAgentRunnerRecords().schema,
  };
}
