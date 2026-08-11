import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { CCM_DIR } from "../../core/utils";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const LEASE_DIR = path.join(CCM_DIR, "git-operation-leases");

export interface GitRepositoryIdentityV2 {
  schema: "ccm-git-repository-identity-v2";
  project_id: string;
  work_dir: string;
  repository_root: string;
  git_common_dir: string;
  head: string;
  branch: string;
  remote_fingerprint: string;
  checksum: string;
}

export interface GitWorkspaceSnapshotV2 {
  schema: "ccm-git-workspace-snapshot-v2";
  repository: GitRepositoryIdentityV2;
  status_checksum: string;
  index_checksum: string;
  worktree_content_checksum: string;
  checksum: string;
  captured_at: string;
}

export interface GitMutationLeaseV1 {
  schema: "ccm-git-mutation-lease-v1";
  lease_id: string;
  repository_checksum: string;
  operation: string;
  owner_pid: number;
  acquired_at: string;
  expires_at: string;
  file: string;
}

export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

export function gitChecksum(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}

export function sanitizeGitDiagnostic(value: any, max = 2_000) {
  return String(value || "Git 操作失败")
    .replace(/(https?:\/\/)[^/@\s]+@/gi, "$1")
    .replace(/([?&](?:access_token|auth_token|token|key|password)=)[^&\s]+/gi, "$1[已隐藏]")
    .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, "$1[已隐藏]")
    .replace(/[\0\r]+/g, " ")
    .trim()
    .slice(0, max);
}

function terminateProcessTree(child: any) {
  const pid = Number(child?.pid || 0);
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      const killer = spawn("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      killer.unref();
    } catch { try { child.kill(); } catch {} }
    return;
  }
  try { process.kill(-pid, "SIGTERM"); } catch { try { child.kill("SIGTERM"); } catch {} }
}

export function runGitCommand(workDir: string, args: string[], options: {
  timeoutMs?: number;
  maxOutputBytes?: number;
  input?: string | Buffer;
  signal?: AbortSignal;
  env?: Record<string, string>;
  remote?: boolean;
} = {}): Promise<GitCommandResult> {
  return new Promise((resolve, reject) => {
    const timeoutMs = Math.max(1_000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
    const maxOutputBytes = Math.max(64 * 1024, Number(options.maxOutputBytes || DEFAULT_MAX_OUTPUT_BYTES));
    const remoteArgs = options.remote ? ["-c", "credential.interactive=never", ...args] : args;
    const child = spawn("git", remoteArgs, {
      cwd: workDir,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GCM_INTERACTIVE: "Never",
        GCM_MODAL_PROMPT: "false",
        GIT_ASKPASS: "",
        SSH_ASKPASS: "",
        GIT_HTTP_LOW_SPEED_LIMIT: "1",
        GIT_HTTP_LOW_SPEED_TIME: "20",
        GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || "ssh -o BatchMode=yes -o ConnectTimeout=15 -o ConnectionAttempts=1",
        ...(options.env || {}),
      },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let failureCode = "";
    let settled = false;
    const fail = (message: string, code: string, error?: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      const failure: any = new Error(message);
      failure.gitErrorCode = code;
      failure.stdout = Buffer.concat(stdout).toString("utf-8");
      failure.stderr = Buffer.concat(stderr).toString("utf-8");
      failure.cause = error;
      reject(failure);
    };
    const append = (target: Buffer[], chunk: any) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk || ""));
      outputBytes += buffer.length;
      if (outputBytes > maxOutputBytes && !failureCode) {
        failureCode = "output_exceeded";
        terminateProcessTree(child);
        return;
      }
      target.push(buffer);
    };
    child.stdout?.on("data", chunk => append(stdout, chunk));
    child.stderr?.on("data", chunk => append(stderr, chunk));
    const onAbort = () => {
      failureCode = "aborted";
      terminateProcessTree(child);
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      failureCode = "timeout";
      terminateProcessTree(child);
    }, timeoutMs);
    child.once("error", error => fail(`无法启动 Git：${error.message}`, "spawn_failed", error));
    child.once("close", code => {
      if (settled) return;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      const stdoutText = Buffer.concat(stdout).toString("utf-8");
      const stderrText = Buffer.concat(stderr).toString("utf-8");
      if (failureCode) return fail(failureCode === "timeout" ? "Git 操作超时" : failureCode === "aborted" ? "Git 操作已取消" : "Git 输出超过安全限制", failureCode);
      if (code !== 0) {
        const error: any = new Error(`Git 操作失败（退出码 ${code ?? "unknown"}）`);
        error.stdout = stdoutText;
        error.stderr = stderrText;
        error.gitErrorCode = "command_failed";
        settled = true;
        reject(error);
        return;
      }
      settled = true;
      resolve({ stdout: stdoutText, stderr: stderrText, exitCode: Number(code || 0) });
    });
    if (options.input !== undefined) child.stdin?.end(options.input);
  });
}

export async function tryGitCommand(workDir: string, args: string[], options: any = {}) {
  try {
    const result = await runGitCommand(workDir, args, options);
    return { ok: true, output: result.stdout.trim(), error: "" };
  } catch (error: any) {
    return { ok: false, output: "", error: sanitizeGitDiagnostic(error?.stderr || error?.message) };
  }
}

function within(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function normalizeGitRepoPath(filePath: any) {
  return String(filePath ?? "").replace(/\\/g, "/");
}

export function resolveSafeRepositoryPath(workDir: string, filePath: any, options: { allowLeafSymlink?: boolean } = {}) {
  const normalized = normalizeGitRepoPath(filePath);
  if (!normalized || normalized.includes("\0") || path.isAbsolute(normalized) || normalized.split("/").includes("..")) throw new Error("非法文件路径");
  const lexicalRoot = path.resolve(workDir);
  const realRoot = fs.realpathSync.native(lexicalRoot);
  const parts = normalized.split("/").filter(Boolean);
  let current = lexicalRoot;
  let leafSymlink = false;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      const isLeaf = index === parts.length - 1;
      if (!isLeaf || options.allowLeafSymlink !== true) throw new Error("文件路径包含不允许跟随的符号链接或目录联接");
      leafSymlink = true;
      continue;
    }
    const realCurrent = fs.realpathSync.native(current);
    if (!within(realRoot, realCurrent)) throw new Error("文件真实路径不在项目仓库内");
  }
  const absolute = path.resolve(lexicalRoot, ...parts);
  if (!within(lexicalRoot, absolute)) throw new Error("文件不在项目目录内");
  return { normalized, absolute, realRoot, leafSymlink };
}

async function hashFile(file: string) {
  return new Promise<string>((resolve, reject) => {
    const digest = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("data", chunk => digest.update(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(digest.digest("hex")));
  });
}

export async function captureRepositoryIdentity(workDir: string, projectId = ""): Promise<GitRepositoryIdentityV2> {
  const top = (await runGitCommand(workDir, ["rev-parse", "--show-toplevel"])).stdout.trim();
  const repositoryRoot = fs.realpathSync.native(path.resolve(top));
  const commonRaw = (await runGitCommand(repositoryRoot, ["rev-parse", "--git-common-dir"])).stdout.trim();
  const commonLexical = path.isAbsolute(commonRaw) ? commonRaw : path.resolve(repositoryRoot, commonRaw);
  const gitCommonDir = fs.realpathSync.native(commonLexical);
  const head = (await tryGitCommand(repositoryRoot, ["rev-parse", "--verify", "HEAD"])).output;
  const branch = (await tryGitCommand(repositoryRoot, ["branch", "--show-current"])).output || "detached HEAD";
  const remote = (await tryGitCommand(repositoryRoot, ["remote", "get-url", "origin"])).output;
  const base = {
    schema: "ccm-git-repository-identity-v2" as const,
    project_id: projectId,
    work_dir: path.resolve(workDir),
    repository_root: repositoryRoot,
    git_common_dir: gitCommonDir,
    head,
    branch,
    remote_fingerprint: remote ? gitChecksum(remote.replace(/(https?:\/\/)[^/@\s]+@/i, "$1")) : "",
  };
  return { ...base, checksum: gitChecksum(base) };
}

export async function captureWorkspaceSnapshot(workDir: string, projectId = "", statusRaw?: string): Promise<GitWorkspaceSnapshotV2 & { status_raw: string }> {
  const repository = await captureRepositoryIdentity(workDir, projectId);
  const raw = statusRaw === undefined
    // Ask Git for individual untracked files. With `normal`, an untracked
    // directory is returned as one directory entry and file evidence rejects
    // it because evidence and diff operations are file-scoped.
    ? (await runGitCommand(repository.repository_root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])).stdout
    : statusRaw;
  const indexPathRaw = (await tryGitCommand(repository.repository_root, ["rev-parse", "--git-path", "index"])).output;
  const indexPath = indexPathRaw ? (path.isAbsolute(indexPathRaw) ? indexPathRaw : path.resolve(repository.repository_root, indexPathRaw)) : "";
  let indexChecksum = "missing";
  try { if (indexPath && fs.existsSync(indexPath)) indexChecksum = await hashFile(indexPath); } catch { indexChecksum = "unreadable"; }
  const records = raw.split("\0");
  const changedPaths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const statusCode = record.slice(0, 2);
    const currentPath = record.slice(3);
    if (currentPath) changedPaths.push(currentPath);
    if (/R|C/.test(statusCode)) {
      const originalPath = String(records[index + 1] || "");
      if (originalPath) changedPaths.push(originalPath);
      index += 1;
    }
  }
  const worktreeEvidence = await captureFileEvidence(repository.repository_root, changedPaths);
  const worktreeContentChecksum = gitChecksum(worktreeEvidence);
  const base = {
    schema: "ccm-git-workspace-snapshot-v2" as const,
    repository,
    status_checksum: gitChecksum(raw),
    index_checksum: indexChecksum,
    worktree_content_checksum: worktreeContentChecksum,
    captured_at: new Date().toISOString(),
  };
  return { ...base, checksum: gitChecksum({ repository: repository.checksum, status: base.status_checksum, index: indexChecksum, worktree: worktreeContentChecksum }), status_raw: raw };
}

export async function captureFileEvidence(workDir: string, files: any[]) {
  const values = Array.from(new Set((files || []).map(normalizeGitRepoPath).filter(Boolean))) as string[];
  const results: any[] = new Array(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(8, Math.max(1, values.length)) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      const value = values[index];
    const safe = resolveSafeRepositoryPath(workDir, value, { allowLeafSymlink: true });
    if (!fs.existsSync(safe.absolute)) {
      results[index] = { path: safe.normalized, state: "missing", checksum: gitChecksum("missing") };
      continue;
    }
    const stat = fs.lstatSync(safe.absolute);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(safe.absolute);
      results[index] = { path: safe.normalized, state: "symlink", size: Buffer.byteLength(target), checksum: gitChecksum(`symlink:${target}`) };
      continue;
    }
    if (!stat.isFile()) throw new Error(`不支持读取非普通文件：${safe.normalized}`);
    results[index] = { path: safe.normalized, state: "file", size: stat.size, checksum: await hashFile(safe.absolute) };
    }
  });
  await Promise.all(workers);
  return results;
}

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function leaseFile(repository: GitRepositoryIdentityV2) {
  fs.mkdirSync(LEASE_DIR, { recursive: true });
  return path.join(LEASE_DIR, `${gitChecksum(repository.git_common_dir.toLowerCase()).slice(0, 32)}.json`);
}

function readLease(file: string): any {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}

export async function acquireGitMutationLease(repository: GitRepositoryIdentityV2, operation: string, leaseMs = 5 * 60_000): Promise<GitMutationLeaseV1> {
  const file = leaseFile(repository);
  const existing = readLease(file);
  if (existing) {
    const active = Date.parse(existing.expires_at || 0) > Date.now() && (String(existing.hostname || "") !== require("os").hostname() || processAlive(Number(existing.owner_pid || 0)));
    if (active) {
      const error: any = new Error(`仓库正在执行${existing.operation || "其他Git操作"}`);
      error.gitErrorCode = "repository_busy";
      error.lease = existing;
      throw error;
    }
    try { fs.unlinkSync(file); } catch {}
  }
  const lease: GitMutationLeaseV1 & { hostname: string } = {
    schema: "ccm-git-mutation-lease-v1",
    lease_id: crypto.randomBytes(16).toString("hex"),
    repository_checksum: repository.checksum,
    operation,
    owner_pid: process.pid,
    hostname: require("os").hostname(),
    acquired_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + Math.max(30_000, leaseMs)).toISOString(),
    file,
  };
  try {
    const handle = await fs.promises.open(file, "wx", 0o600);
    try { await handle.writeFile(`${JSON.stringify(lease)}\n`, "utf-8"); await handle.sync(); } finally { await handle.close(); }
  } catch (error: any) {
    const current = readLease(file);
    const busy: any = new Error(`仓库正在执行${current?.operation || "其他Git操作"}`);
    busy.gitErrorCode = "repository_busy";
    busy.lease = current;
    throw busy;
  }
  return lease;
}

export async function releaseGitMutationLease(lease: GitMutationLeaseV1) {
  const current = readLease(lease.file);
  if (!current || current.lease_id !== lease.lease_id || Number(current.owner_pid || 0) !== process.pid) return false;
  try { await fs.promises.unlink(lease.file); return true; } catch { return false; }
}

export async function withGitMutationLease<T>(workDir: string, projectId: string, operation: string, callback: (context: { repository: GitRepositoryIdentityV2; lease: GitMutationLeaseV1; before: GitWorkspaceSnapshotV2 & { status_raw: string } }) => Promise<T>) {
  const before = await captureWorkspaceSnapshot(workDir, projectId);
  const lease = await acquireGitMutationLease(before.repository, operation);
  try {
    const lockedBefore = await captureWorkspaceSnapshot(workDir, projectId);
    return await callback({ repository: lockedBefore.repository, lease, before: lockedBefore });
  } finally {
    await releaseGitMutationLease(lease);
  }
}

export function assertExpectedWorkspaceSnapshot(expected: any, actual: GitWorkspaceSnapshotV2) {
  const value = String(expected || "").trim();
  if (!value) return;
  if (value !== actual.checksum) {
    const error: any = new Error("Git工作区已发生变化，请刷新后重新确认");
    error.gitErrorCode = "state_drift";
    error.expected = value;
    error.actual = actual.checksum;
    throw error;
  }
}

export async function buildGitMutationReceipt(input: {
  projectId: string;
  operation: string;
  before: GitWorkspaceSnapshotV2;
  after: GitWorkspaceSnapshotV2;
  files?: string[];
  actor?: string;
  outcome?: string;
}) {
  const evidence = await captureFileEvidence(input.after.repository.repository_root, input.files || []);
  const base = {
    schema: "ccm-git-mutation-receipt-v2",
    project_id: input.projectId,
    operation: input.operation,
    actor: String(input.actor || "user"),
    outcome: String(input.outcome || "completed"),
    before_snapshot_checksum: input.before.checksum,
    after_snapshot_checksum: input.after.checksum,
    base_head: input.before.repository.head,
    result_head: input.after.repository.head,
    files: evidence,
    completed_at: new Date().toISOString(),
  };
  return { ...base, checksum: gitChecksum(base) };
}

export function cleanupStaleGitMutationLeases() {
  fs.mkdirSync(LEASE_DIR, { recursive: true });
  let removed = 0;
  for (const name of fs.readdirSync(LEASE_DIR)) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(LEASE_DIR, name);
    const lease = readLease(file);
    if (lease && Date.parse(lease.expires_at || 0) > Date.now() && processAlive(Number(lease.owner_pid || 0))) continue;
    try { fs.unlinkSync(file); removed += 1; } catch {}
  }
  return removed;
}
