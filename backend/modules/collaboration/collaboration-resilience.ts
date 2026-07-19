import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { classifyExecutionFailure } from "../../agents/execution-kernel";
import { normalizeAgentRuntimeId, type AgentRuntimeId } from "../../agents/runtime";
import { prepareChildAgentWorkDir } from "../../agents/worktree";

const RUNTIME_COMMANDS: Record<string, string[]> = {
  claudecode: ["claude"],
  codex: ["codex"],
  cursor: ["cursor-agent", "agent"],
  gemini: ["gemini"],
  qoder: ["qodercli"],
};

const DEFAULT_FALLBACK_ORDER: Record<string, AgentRuntimeId[]> = {
  claudecode: ["codex", "cursor"],
  codex: ["claudecode", "cursor"],
  cursor: ["codex", "claudecode"],
  gemini: ["codex", "claudecode", "cursor"],
  qoder: ["codex", "claudecode", "cursor"],
};

function unique<T>(items: T[]) { return Array.from(new Set(items)); }

function commandExistsOnPath(command: string) {
  const raw = String(command || "").trim();
  if (!raw) return false;
  const hasPath = raw.includes("/") || raw.includes("\\");
  const directories = hasPath ? [""] : unique([process.cwd(), ...String(process.env.PATH || "").split(path.delimiter).map(item => item.trim().replace(/^"|"$/g, "")).filter(Boolean)]);
  const extensions = process.platform === "win32"
    ? (path.extname(raw) ? [""] : String(process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean))
    : [""];
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = hasPath ? `${raw}${extension}` : path.join(directory, `${raw}${extension}`);
      try {
        const stat = fs.statSync(candidate);
        if (!stat.isFile()) continue;
        if (process.platform === "win32") return true;
        fs.accessSync(candidate, fs.constants.X_OK);
        return true;
      } catch {}
    }
  }
  return false;
}

export function isRuntimeCommandAvailable(agentType: string) {
  const runtime = normalizeAgentRuntimeId(agentType);
  const commands = RUNTIME_COMMANDS[runtime] || [];
  return commands.some(commandExistsOnPath);
}

export function buildRuntimeRecoveryCandidates(primary: string, configured: any = [], availability: (runtime: string) => boolean = isRuntimeCommandAvailable) {
  const normalizedPrimary = normalizeAgentRuntimeId(primary);
  const explicit = (Array.isArray(configured) ? configured : String(configured || "").split(/[;,\s]+/))
    .map(item => normalizeAgentRuntimeId(String(item || "")))
    .filter(item => item !== normalizedPrimary);
  const ordered = unique([normalizedPrimary, ...explicit, ...(DEFAULT_FALLBACK_ORDER[normalizedPrimary] || [])]);
  return ordered.filter((runtime, index) => index === 0 || availability(runtime));
}

export function shouldSwitchRuntime(error: any) {
  const failure = classifyExecutionFailure(error);
  const runtimeFailureSignal = /Agent Runner|Agent 错误|Agent 进程退出|spawn|exitCode|command not found|not recognized|ENOENT|ECONNREFUSED|401|403|429|unauthorized|invalid api key|authentication|provider|网关|响应超时/i.test(failure.message);
  const permissionDriftSignal = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|所有文件写入.{0,16}(?:拦截|阻止)|无法写入(?:文件|项目)|workspace_write.{0,24}read_only/i.test(failure.message);
  return {
    ...failure,
    permissionDrift: permissionDriftSignal,
    switchRuntime: permissionDriftSignal || ((failure.recoverable || (failure.failureClass === "unknown" && runtimeFailureSignal))
      && ["timeout", "auth", "provider", "gateway_routing", "infra", "tool_runtime", "mcp_startup", "mcp_handshake", "plugin_startup", "unknown"].includes(failure.failureClass)),
  };
}

export function buildRuntimeRecoveryPrompt(input: { originalPrompt: string; previousOutput?: string; previousReceipt?: any; failure?: any; fromRuntime: string; toRuntime: string; attempt: number }) {
  const failure = shouldSwitchRuntime(input.failure || input.previousOutput || "运行时失败");
  const receipt = input.previousReceipt ? JSON.stringify(input.previousReceipt, null, 2).slice(0, 5000) : "无可用结构化回执";
  return [
    `[CCM 执行器恢复｜第 ${input.attempt} 次尝试]`,
    `上一执行器：${input.fromRuntime}`,
    `当前执行器：${input.toRuntime}`,
    `失败分类：${failure.failureClass}`,
    `失败原因：${failure.message.slice(0, 1200)}`,
    "",
    "恢复规则：",
    "- 这是同一任务的续跑，不是新任务；先核对工作区已有修改和上一轮回执，禁止从零重复实现。",
    "- 已存在且正确的文件修改必须保留；只补齐失败点、缺口和验证。",
    "- 最后重新提交完整 CCM_AGENT_RECEIPT，并注明本轮使用了执行器切换恢复。",
    "",
    "上一轮结构化回执：",
    receipt,
    input.previousOutput ? `\n上一轮输出摘要：\n${String(input.previousOutput).slice(-5000)}` : "",
    "",
    "原始任务：",
    input.originalPrompt,
  ].filter(Boolean).join("\n");
}

function normalizeScope(value: any) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/\*\*?$/g, "").replace(/\*+$/g, "").replace(/\/$/, "");
}

export function inferTaskPathScopes(task: string) {
  const scopes = new Set<string>();
  const text = String(task || "");
  const pattern = /(?:^|[\s`'"（(])((?:src|app|apps|backend|frontend|server|client|packages|modules|components|pages|api|lib|test|tests)[\\/][a-zA-Z0-9._@+\-/\\*]+)/g;
  for (const match of text.matchAll(pattern)) {
    const value = normalizeScope(match[1].replace(/[),，。；;：:]+$/g, ""));
    if (value) scopes.add(value);
  }
  return Array.from(scopes).slice(0, 30);
}

function getRepoKey(workDir: string) {
  let current = path.resolve(String(workDir || process.cwd()));
  try { if (fs.statSync(current).isFile()) current = path.dirname(current); } catch {}
  while (true) {
    if (fs.existsSync(path.join(current, ".git"))) return current.toLowerCase();
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(String(workDir || process.cwd())).toLowerCase();
    current = parent;
  }
}

function scopesOverlap(left: string[], right: string[]) {
  if (!left.length || !right.length) return true;
  return left.some(a => right.some(b => !a || !b || a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)));
}

export type ConflictLaneInput = {
  key: string;
  project: string;
  task: string;
  workDir: string;
  writablePaths?: string[];
  /** Verification-only lanes (e.g. native TestAgent) serialize after writers on the same repo. */
  verificationOnly?: boolean;
};

export function buildCollaborationConflictPlan(inputs: ConflictLaneInput[], requestedOrder = "parallel") {
  const lanes = inputs.map((input, index) => ({
    ...input,
    index,
    verificationOnly: input.verificationOnly === true,
    repoKey: getRepoKey(input.workDir),
    scopes: unique([
      ...(input.writablePaths || []).map(normalizeScope).filter(Boolean),
      ...(input.verificationOnly ? [] : inferTaskPathScopes(input.task)),
    ]),
  }));
  const parent = lanes.map((_, index) => index);
  const find = (index: number): number => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (a: number, b: number) => { const pa = find(a); const pb = find(b); if (pa !== pb) parent[pb] = pa; };
  const conflicts: any[] = [];
  for (let i = 0; i < lanes.length; i++) {
    for (let j = i + 1; j < lanes.length; j++) {
      const left = lanes[i];
      const right = lanes[j];
      if (left.repoKey !== right.repoKey) continue;
      const writeVerifyOverlap = left.verificationOnly !== right.verificationOnly;
      const overlap = left.project === right.project
        || scopesOverlap(left.scopes, right.scopes)
        || writeVerifyOverlap;
      if (!overlap) continue;
      join(i, j);
      conflicts.push({
        projects: [left.project, right.project],
        reason: writeVerifyOverlap
          ? "同一仓库上实现 Agent 与 TestAgent 写验可能冲突，已改为先写后验串行"
          : left.project === right.project
            ? "同一项目收到多个并发工作单"
            : "多个 Agent 指向同一仓库且修改范围可能重叠",
        scopes: unique([...left.scopes, ...right.scopes]),
        repoKey: left.repoKey,
        writeVerifyOverlap,
      });
    }
  }
  const clusterIds = new Map<number, string>();
  const plannedLanes = lanes.map((lane, index) => {
    const root = find(index);
    const members = lanes.filter((_, itemIndex) => find(itemIndex) === root);
    if (members.length < 2) {
      return {
        ...lane,
        conflictWorkspaceKey: "",
        conflictGroup: "",
        mergeOwner: true,
        runAfterWriters: lane.verificationOnly === true,
      };
    }
    if (!clusterIds.has(root)) clusterIds.set(root, `conflict-${crypto.createHash("sha1").update(`${lane.repoKey}:${root}`).digest("hex").slice(0, 10)}`);
    const conflictGroup = clusterIds.get(root)!;
    const writers = members.filter(item => !item.verificationOnly);
    const mergeOwnerIndex = (writers[0] || members[0]).index;
    return {
      ...lane,
      // Verification-only lanes must not join shared writable worktrees.
      conflictWorkspaceKey: lane.verificationOnly ? "" : conflictGroup,
      conflictGroup,
      mergeOwner: mergeOwnerIndex === index,
      runAfterWriters: lane.verificationOnly === true && writers.length > 0,
    };
  });
  return {
    requestedOrder,
    effectiveOrder: conflicts.length && requestedOrder === "parallel" ? "sequential" : requestedOrder,
    conflicts,
    lanes: plannedLanes,
    protected: conflicts.length > 0,
  };
}

/** Stable order: writers first, then verification-only (TestAgent) lanes in the same conflict group. */
export function orderMentionsForConflictPlan(mentions: any[], conflictPlan: { lanes?: any[] } = {}) {
  const lanes = Array.isArray(conflictPlan?.lanes) ? conflictPlan.lanes : [];
  const isVerifyLane = (mention: any, lane: any) => {
    // Prefer flags already stamped on the mention; lane index is only a fallback
    // before stamping (and must not be used after mentions were reordered).
    if (mention && ("verificationOnly" in mention || "runAfterWriters" in mention)) {
      return mention.verificationOnly === true || mention.runAfterWriters === true;
    }
    return lane?.verificationOnly === true || lane?.runAfterWriters === true;
  };
  return mentions
    .map((mention, index) => ({ mention, index, lane: lanes[index] || null }))
    .sort((left, right) => {
      const leftGroup = String(left.mention?.conflictGroup || left.lane?.conflictGroup || "");
      const rightGroup = String(right.mention?.conflictGroup || right.lane?.conflictGroup || "");
      if (leftGroup && leftGroup === rightGroup) {
        const leftVerify = isVerifyLane(left.mention, left.lane) ? 1 : 0;
        const rightVerify = isVerifyLane(right.mention, right.lane) ? 1 : 0;
        if (leftVerify !== rightVerify) return leftVerify - rightVerify;
      } else if (!leftGroup && !rightGroup) {
        const leftVerify = isVerifyLane(left.mention, left.lane) ? 1 : 0;
        const rightVerify = isVerifyLane(right.mention, right.lane) ? 1 : 0;
        if (leftVerify !== rightVerify) return leftVerify - rightVerify;
      }
      return left.index - right.index;
    })
    .map(item => item.mention);
}

export function runCollaborationResilienceSelfTest() {
  const candidates = buildRuntimeRecoveryCandidates("cursor", ["codex"], runtime => ["codex", "claudecode"].includes(runtime));
  const conflict = buildCollaborationConflictPlan([
    { key: "a", project: "frontend-a", task: "修改 src/payment/index.ts", workDir: process.cwd(), writablePaths: ["src/payment"] },
    { key: "b", project: "frontend-b", task: "调整 src/payment/form.ts", workDir: process.cwd(), writablePaths: ["src/payment"] },
  ], "parallel");
  const separate = buildCollaborationConflictPlan([
    { key: "a", project: "a", task: "修改 src/a.ts", workDir: path.join(process.cwd(), "a") },
    { key: "b", project: "b", task: "修改 src/b.ts", workDir: path.join(process.cwd(), "b") },
  ], "parallel");
  const writeVerify = buildCollaborationConflictPlan([
    { key: "writer", project: "demo-app", task: "修改 src/api.ts", workDir: process.cwd(), writablePaths: ["src"] },
    { key: "tester", project: "test-agent", task: "独立复核", workDir: process.cwd(), verificationOnly: true },
  ], "parallel");
  const tagged = writeVerify.lanes.map((lane: any) => ({
    targetName: lane.project,
    conflictGroup: lane.conflictGroup,
    verificationOnly: lane.verificationOnly === true,
    runAfterWriters: lane.runAfterWriters === true,
  }));
  // Put verifier first intentionally; ordering must still prefer the writer.
  const ordered = orderMentionsForConflictPlan([tagged[1], tagged[0]], writeVerify);
  const checks = {
    keepsPrimaryRuntimeFirst: candidates[0] === "cursor",
    usesConfiguredFallbackNext: candidates[1] === "codex",
    classifiesProviderFailureForSwitch: shouldSwitchRuntime("provider API 429 unavailable").switchRuntime,
    nonzeroExitSwitchesWithoutReadableStderr: shouldSwitchRuntime("Agent 进程退出：������").switchRuntime,
    permissionDriftForcesSessionRecovery: shouldSwitchRuntime("sandbox read-only: all writes blocked by policy").switchRuntime && shouldSwitchRuntime("sandbox read-only: all writes blocked by policy").permissionDrift,
    authenticationFailureSwitchesRuntime: shouldSwitchRuntime("401 Unauthorized: Invalid API Key").switchRuntime,
    serializesOverlappingRepoLanes: conflict.protected && conflict.effectiveOrder === "sequential" && conflict.lanes.every(item => !!item.conflictWorkspaceKey),
    keepsSeparateReposParallel: !separate.protected && separate.effectiveOrder === "parallel",
    serializesSameRepoWriteThenVerify: writeVerify.protected
      && writeVerify.effectiveOrder === "sequential"
      && writeVerify.lanes.some(item => item.verificationOnly && !item.conflictWorkspaceKey && item.runAfterWriters)
      && ordered[0]?.targetName === "demo-app"
      && ordered[1]?.targetName === "test-agent",
    recoveryPromptPreservesOriginalTask: buildRuntimeRecoveryPrompt({ originalPrompt: "实现支付功能", fromRuntime: "cursor", toRuntime: "codex", attempt: 2, failure: "provider unavailable" }).includes("实现支付功能"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

export function runCollaborationResilienceIntegrationSelfTest() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-resilience-"));
  const git = (args: string[], cwd = repo) => {
    const result = spawnSync("git", args, { cwd, encoding: "utf-8", windowsHide: true });
    if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || "git failed"));
    return String(result.stdout || "").trim();
  };
  let worktreePath = "";
  let worktreeBranch = "";
  try {
    git(["init"]);
    git(["config", "user.email", "ccm-resilience@example.invalid"]);
    git(["config", "user.name", "CCM Resilience Test"]);
    fs.mkdirSync(path.join(repo, "src", "payment"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src", "payment", "base.ts"), "export const base = true;\n", "utf-8");
    git(["add", "."]);
    git(["commit", "-m", "initial"]);
    const plan = buildCollaborationConflictPlan([
      { key: "one", project: "agent-a", task: "修改 src/payment/base.ts", workDir: repo, writablePaths: ["src/payment"] },
      { key: "two", project: "agent-b", task: "修改 src/payment/form.ts", workDir: repo, writablePaths: ["src/payment"] },
    ], "parallel");
    const key = plan.lanes[0].conflictWorkspaceKey;
    const first = prepareChildAgentWorkDir(repo, { mode: "worktree", failClosed: true, taskId: "resilience-test", agentName: key, sourceProject: "coordinator", reuseKey: key });
    worktreePath = first.worktreePath || "";
    worktreeBranch = first.worktreeBranch || "";
    fs.writeFileSync(path.join(first.workDir, "src", "payment", "first.ts"), "export const first = true;\n", "utf-8");
    const second = prepareChildAgentWorkDir(repo, { mode: "worktree", failClosed: true, taskId: "resilience-test", agentName: key, sourceProject: "coordinator", reuseKey: key });
    const checks = {
      conflictBecomesSequential: plan.effectiveOrder === "sequential",
      agentsShareConflictWorktree: first.workDir === second.workDir && second.reused === true,
      downstreamSeesUpstreamChanges: fs.existsSync(path.join(second.workDir, "src", "payment", "first.ts")),
      singleMergeOwner: plan.lanes.filter(item => item.mergeOwner).length === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    if (worktreePath) spawnSync("git", ["worktree", "remove", "--force", worktreePath], { cwd: repo, windowsHide: true, stdio: "ignore" });
    if (worktreeBranch) spawnSync("git", ["branch", "-D", worktreeBranch], { cwd: repo, windowsHide: true, stdio: "ignore" });
    try { fs.rmSync(repo, { recursive: true, force: true }); } catch {}
  }
}
