import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFileSync } from "child_process";
import { buildTestAgentExecutionPlan } from "../test-agent/execution-plan";
import { listTestAgentArtifactCatalogForTasks } from "../test-agent/artifact-retention";
import { invokeTestAgentHandoff } from "../test-agent/invocation";
import { buildTestAgentWorkOrderFromHandoff, TestAgentHandoff } from "../test-agent/work-order-builder";
import { InternalMcpTaskContext } from "./internal-mcp-runtime";
import { appendInternalMcpTaskJournal, getBoundInternalMcpTask, internalMcpTaskPayload } from "./internal-mcp-task-store";
import { resolveGroupTestTargets, resolveTargetStorageStatePath, ResolvedGroupTestTarget } from "../modules/collaboration/group-test-targets";

const ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "test-acceptance");
const DELIVERY_ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "delivery-workspaces");

type InternalMcpTestDeliveryBinding = {
  workspace_id: string;
  project: string;
  branch: string;
  commit: string;
};

export type InternalMcpTestRun = {
  schema: "ccm-internal-mcp-test-run-v1";
  run_id: string;
  task_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  status: "planned" | "running" | "completed" | "failed";
  context: InternalMcpTaskContext;
  handoff: TestAgentHandoff;
  work_order: any;
  plan: any;
  warnings: string[];
  delivery_bindings?: InternalMcpTestDeliveryBinding[];
  pid?: number;
  invocation_result?: any;
  error?: string;
};

function safe(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}

function runDir(taskId: string) {
  return path.join(ROOT, safe(taskId));
}

export function internalMcpTestRunFile(taskId: string, runId: string) {
  return path.join(runDir(taskId), `${safe(runId)}.json`);
}

function atomicWrite(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  if (fs.existsSync(file)) fs.unlinkSync(file);
  fs.renameSync(temp, file);
}

export function readInternalMcpTestRun(taskId: string, runId = "") {
  const dir = runDir(taskId);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(file => file.endsWith(".json")).map(file => path.join(dir, file)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const file = runId ? internalMcpTestRunFile(taskId, runId) : files[0];
  if (!file || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) as InternalMcpTestRun; } catch { return null; }
}

function selectProjectBindings(context: InternalMcpTaskContext, requested: string[] = []) {
  const available = (context.projects?.length ? context.projects : [{ name: context.project, workDir: context.baseWorkDir || context.workDir }]).filter(project => project.name && project.workDir && fs.existsSync(project.workDir));
  const wanted = new Set(requested.map(String).filter(Boolean));
  const selected = wanted.size ? available.filter(project => wanted.has(project.name)) : available;
  if (!selected.length) throw new Error("没有找到当前群聊任务允许交给 TestAgent 的项目工作目录");
  if (wanted.size && selected.length !== wanted.size) throw new Error("请求包含未绑定到当前任务的测试项目");
  return selected;
}

function runGit(cwd: string, args: string[]) {
  try {
    return String(execFileSync("git", args, { cwd, encoding: "utf-8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })).trim();
  } catch (error: any) {
    throw new Error(String(error?.stderr || error?.message || "Git 状态读取失败").trim());
  }
}

function samePath(left: string, right: string) {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}

function resolveDeliveryBindings(context: InternalMcpTaskContext, workspaceIds: string[], requestedProjects: string[]) {
  if (!workspaceIds.length) return { projects: selectProjectBindings(context, requestedProjects), deliveryBindings: [] as InternalMcpTestDeliveryBinding[] };
  if (context.role !== "group-main-agent") throw new Error("只有群聊主 Agent 能把交付工作区交给 TestAgent 验收");
  const available = selectProjectBindings(context);
  const allowedByName = new Map(available.map(project => [project.name, project]));
  const uniqueIds = [...new Set(workspaceIds.map(value => safe(value)).filter(Boolean))];
  if (uniqueIds.length !== workspaceIds.length) throw new Error("TestAgent 验收工作区包含空值或重复项");
  const records = uniqueIds.map(id => {
    const file = path.join(DELIVERY_ROOT, safe(context.taskId), `${id}.json`);
    if (!fs.existsSync(file)) throw new Error(`交付工作区不存在：${id}`);
    let record: any;
    try { record = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { throw new Error(`交付工作区记录损坏：${id}`); }
    if (record.id !== id || record.task_id !== context.taskId || context.groupId && record.group_id !== context.groupId) throw new Error(`交付工作区不属于当前任务：${id}`);
    if (record.status !== "committed" || !/^[a-f0-9]{40}$/i.test(String(record.commit || ""))) throw new Error(`交付工作区尚未形成可验收提交：${id}`);
    const base = allowedByName.get(String(record.project || ""));
    if (!base) throw new Error(`交付工作区项目不在当前任务允许范围：${record.project || id}`);
    const worktreePath = path.resolve(String(record.worktree_path || ""));
    if (!fs.existsSync(worktreePath) || !fs.statSync(worktreePath).isDirectory()) throw new Error(`交付 worktree 不存在：${id}`);
    const baseRepo = path.resolve(runGit(base.workDir, ["rev-parse", "--show-toplevel"]));
    if (!samePath(baseRepo, String(record.repo_root || ""))) throw new Error(`交付工作区仓库绑定不一致：${id}`);
    if (!samePath(runGit(worktreePath, ["rev-parse", "--show-toplevel"]), worktreePath)) throw new Error(`交付 worktree 路径绑定不一致：${id}`);
    if (runGit(worktreePath, ["branch", "--show-current"]) !== record.branch) throw new Error(`交付 worktree 分支已变化：${id}`);
    if (runGit(worktreePath, ["rev-parse", "HEAD"]) !== record.commit) throw new Error(`交付 worktree HEAD 与待验收提交不一致：${id}`);
    if (runGit(worktreePath, ["status", "--porcelain"])) throw new Error(`交付 worktree 仍有未提交改动：${id}`);
    const changedFiles = runGit(worktreePath, ["diff-tree", "--no-commit-id", "--name-only", "-r", record.commit]).split(/\r?\n/).filter(Boolean);
    return {
      project: { ...base, workDir: worktreePath, changedFiles },
      delivery: { workspace_id: id, project: record.project, branch: record.branch, commit: record.commit } as InternalMcpTestDeliveryBinding,
    };
  });
  const projectNames = records.map(row => row.delivery.project);
  if (new Set(projectNames).size !== projectNames.length) throw new Error("一次验收不能为同一项目绑定多个交付工作区");
  const wanted = new Set(requestedProjects.map(String).filter(Boolean));
  if (wanted.size && (wanted.size !== projectNames.length || projectNames.some(name => !wanted.has(name)))) throw new Error("验收项目与交付工作区不一致");
  return { projects: records.map(row => row.project), deliveryBindings: records.map(row => row.delivery) };
}

function targetUrl(target: ResolvedGroupTestTarget) {
  const base = String(target.baseUrl || "").replace(/\/+$/, "");
  const route = String(target.auth.loginPath || "").trim();
  if (!base || !route || /^https?:\/\//i.test(route)) return /^https?:\/\//i.test(route) ? route : base;
  return `${base}/${route.replace(/^\/+/, "")}`;
}

function targetAgentSummary(target: ResolvedGroupTestTarget) {
  return [
    `Configured test target: ${target.name}`,
    `Base project: ${target.project}`,
    `Target kind: ${target.kind}`,
    `Environment: ${target.environment || "default"}`,
    `Base URL: ${target.baseUrl || "not configured"}`,
    `Authentication mode: ${target.auth.mode}`,
    target.auth.mode === "credentials"
      ? `Authentication fields (values are runtime-only): ${target.auth.fields.map(field => `${field.label}:${field.envName}:${field.inputLabel || field.label}`).join(", ")}`
      : "",
    target.notes ? `Target notes: ${target.notes}` : "",
    target.kind === "native_app" ? "Native application automation requires an explicitly configured native driver; do not claim browser evidence for it." : "",
  ].filter(Boolean).join("\n");
}

function configuredBrowserChecks(target: ResolvedGroupTestTarget, workDir: string) {
  if (!target.baseUrl || target.kind === "api" || target.kind === "native_app") return [];
  const auth = target.auth;
  if (auth.mode === "credentials") {
    const actions: any[] = auth.fields.map(field => ({
      type: "fill",
      label: field.inputLabel || field.label,
      valueEnv: field.envName,
    }));
    if (auth.submitLabel) actions.push({ type: "click", role: "button", name: auth.submitLabel, verifyEffect: true });
    const assertions: any[] = [];
    if (auth.successText) assertions.push({ type: "text", text: auth.successText });
    if (auth.successUrlIncludes) assertions.push({ type: "urlIncludes", text: auth.successUrlIncludes });
    if (!assertions.length && auth.loginPath) assertions.push({ type: "urlNotIncludes", text: auth.loginPath });
    return [{
      name: `${target.name} 登录验证`,
      url: targetUrl(target),
      actions,
      assertions,
      screenshot: false,
      context: { testTargetId: target.id, authenticationConfiguredBy: "group-test-target" },
    }];
  }
  if (auth.mode === "storage_state") {
    resolveTargetStorageStatePath(workDir, auth.storageStatePath);
    return [{
      name: `${target.name} 已登录状态验证`,
      url: target.baseUrl,
      storageStatePath: auth.storageStatePath,
      assertions: [{ type: "pageNotBlank" }],
      screenshot: false,
      context: { testTargetId: target.id, authenticationConfiguredBy: "group-test-target" },
    }];
  }
  if (auth.mode === "existing_session") {
    return [{
      name: `${target.name} 已有浏览器会话验证`,
      url: target.baseUrl,
      authentication: { mode: "existing_session", provider: auth.existingSessionProvider, evidencePolicy: "minimal" },
      assertions: [{ type: "pageNotBlank" }],
      screenshot: false,
      context: { testTargetId: target.id, authenticationConfiguredBy: "group-test-target" },
    }];
  }
  return [];
}

function buildConfiguredTargetProjects(context: InternalMcpTaskContext, projectBindings: any[], input: any, completedTasks: string[]) {
  const selectedIds = Array.isArray(input.test_target_ids) ? input.test_target_ids.map(String).filter(Boolean) : [];
  const configured = context.groupId
    ? resolveGroupTestTargets(context.groupId, projectBindings.map(project => project.name), selectedIds)
    : [];
  if (selectedIds.some(id => !configured.some(target => target.id === id))) {
    throw new Error("所选测试目标未启用或不属于当前验收项目");
  }
  const byProject = new Map<string, ResolvedGroupTestTarget[]>();
  for (const target of configured) {
    const rows = byProject.get(target.project) || [];
    rows.push(target);
    byProject.set(target.project, rows);
  }
  const bindings: any[] = [];
  const projects: any[] = [];
  for (const project of projectBindings) {
    const targets = byProject.get(project.name) || [];
    const expanded = targets.length ? targets : [null];
    expanded.forEach((target, targetIndex) => {
      const name = target ? `${project.name} [${target.name}]` : project.name;
      const configuredCommands = target?.verificationCommands || [];
      const projectCommands = targetIndex === 0
        ? (Array.isArray(input.verification_commands) && projectBindings.length === 1
          ? internalMcpTaskPayload.cleanList(input.verification_commands, 30, 300)
          : internalMcpTaskPayload.cleanList(project.verificationCommands || [], 30, 300))
        : [];
      projects.push({
        name,
        workDir: project.workDir,
        targetUrl: internalMcpTaskPayload.cleanText(target?.baseUrl || input.target_url || project.targetUrl, 500),
        devServerCommand: internalMcpTaskPayload.cleanText(target?.startupCommand || "", 500),
        verificationCommands: [...new Set([...projectCommands, ...configuredCommands])],
        browserChecks: target ? configuredBrowserChecks(target, project.workDir) : [],
        changedFiles: internalMcpTaskPayload.cleanList(input.changed_files?.length ? input.changed_files : project.changedFiles || [], 200, 400),
        completedTasks,
        agentSummary: [
          internalMcpTaskPayload.cleanText(input.summary || "群聊主 Agent 请求独立验收当前交付候选", 1000),
          target ? targetAgentSummary(target) : "",
        ].filter(Boolean).join("\n"),
      });
      if (target) bindings.push({
        handoffProjectName: name,
        baseProject: project.name,
        targetId: target.id,
        targetChecksum: target.checksum,
      });
    });
  }
  return { projects, bindings };
}

function runtimeTargetEnvironments(state: InternalMcpTestRun) {
  const bindings = Array.isArray(state.handoff?.metadata?.testTargetBindings) ? state.handoff.metadata.testTargetBindings : [];
  if (!bindings.length) return {};
  const targetIds = bindings.map((binding: any) => String(binding.targetId || "")).filter(Boolean);
  const resolved = resolveGroupTestTargets(state.group_id, [], targetIds);
  const byId = new Map<string, ResolvedGroupTestTarget>(resolved.map(target => [target.id, target]));
  return Object.fromEntries(bindings.map((binding: any) => {
    const target = byId.get(String(binding.targetId || ""));
    if (!target || target.checksum !== binding.targetChecksum) throw new Error(`测试目标配置已变化，请重新创建验收计划：${binding.targetId}`);
    return [String(binding.handoffProjectName || ""), { ...target.env }];
  }));
}

export function createInternalMcpTestRun(context: InternalMcpTaskContext, input: any = {}) {
  const task = getBoundInternalMcpTask(context);
  const requestedProjects = Array.isArray(input.projects) ? input.projects.map(String).filter(Boolean) : [];
  const resolvedBindings = resolveDeliveryBindings(context, Array.isArray(input.workspace_ids) ? input.workspace_ids.map(String).filter(Boolean) : [], requestedProjects);
  const projectBindings = resolvedBindings.projects;
  const runId = `test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const acceptanceCriteria = internalMcpTaskPayload.cleanList(input.acceptance_criteria?.length ? input.acceptance_criteria : task.acceptance_criteria || task.acceptanceCriteria, 80, 1000);
  const completedTasks = internalMcpTaskPayload.cleanList(input.completed_tasks || [], 80, 800);
  const targetProjects = buildConfiguredTargetProjects(context, projectBindings, input, completedTasks);
  const handoff: TestAgentHandoff = {
    id: runId,
    taskId: context.taskId,
    groupId: context.groupId,
    issuedBy: context.role,
    originalUserGoal: internalMcpTaskPayload.cleanText(task.business_goal || task.description || task.title, 2400),
    acceptanceCriteria,
    completedTasks,
    requiredChecks: internalMcpTaskPayload.cleanList(input.required_checks || [], 50, 100),
    projects: targetProjects.projects,
    options: {
      verificationOnly: true,
      browserProvider: ["auto", "playwright", "mcp", "none"].includes(input.browser_provider) ? input.browser_provider : "auto",
      autoDiscoverVerificationCommands: input.auto_discover !== false,
      collectBrowserArtifacts: input.collect_browser_artifacts !== false,
      requireAdversarialProbe: input.require_adversarial_probe !== false,
      agenticPlanning: true,
      ...(input.adversarial_probe_waiver ? { adversarialProbeWaiver: internalMcpTaskPayload.cleanText(input.adversarial_probe_waiver, 800) } : {}),
    },
    metadata: { source: "ccm-internal-test-acceptance-mcp", taskAgentSessionId: context.taskAgentSessionId || "", requestedByProject: context.project, deliveryWorkspaces: resolvedBindings.deliveryBindings, testTargetBindings: targetProjects.bindings },
    completedByProjectAgents: projectBindings.map(project => project.name),
  };
  const built = buildTestAgentWorkOrderFromHandoff(handoff);
  const plan = buildTestAgentExecutionPlan(built.workOrder);
  const now = new Date().toISOString();
  const state: InternalMcpTestRun = { schema: "ccm-internal-mcp-test-run-v1", run_id: runId, task_id: context.taskId, group_id: context.groupId, created_at: now, updated_at: now, status: "planned", context, handoff, work_order: built.workOrder, plan, warnings: built.warnings, delivery_bindings: resolvedBindings.deliveryBindings };
  atomicWrite(internalMcpTestRunFile(context.taskId, runId), state);
  appendInternalMcpTaskJournal(context, "test", { run_id: runId, status: "planned", projects: projectBindings.map(project => project.name), plan_summary: plan.summary }, { type: "internal_mcp_test_plan_created", title: "TestAgent 验收计划已创建", detail: `将独立验证 ${projectBindings.map(project => project.name).join("、")}`, status: plan.valid ? "active" : "warning", phase: "test" });
  return state;
}

export function markInternalMcpTestRunStarted(state: InternalMcpTestRun, pid: number) {
  const next = { ...state, status: "running" as const, pid, updated_at: new Date().toISOString() };
  atomicWrite(internalMcpTestRunFile(state.task_id, state.run_id), next);
  appendInternalMcpTaskJournal(state.context, "test", { run_id: state.run_id, status: "running" }, { type: "internal_mcp_test_run_started", title: "TestAgent 开始独立验收", detail: `验收运行 ${state.run_id} 已启动`, status: "active", phase: "test" });
  return next;
}

export function attachInternalMcpTestRunPid(state: InternalMcpTestRun, pid: number) {
  const current = readInternalMcpTestRun(state.task_id, state.run_id);
  if (!current || current.status !== "running") return current || state;
  const next = { ...current, pid, updated_at: new Date().toISOString() };
  atomicWrite(internalMcpTestRunFile(state.task_id, state.run_id), next);
  return next;
}

export async function executeInternalMcpTestRunFile(file: string) {
  const resolved = path.resolve(file);
  const root = path.resolve(ROOT);
  if (!(resolved === root || resolved.startsWith(root + path.sep)) || !fs.existsSync(resolved)) throw new Error("TestAgent 运行文件不在受控目录");
  const state = JSON.parse(fs.readFileSync(resolved, "utf-8")) as InternalMcpTestRun;
  const running = { ...state, status: "running" as const, updated_at: new Date().toISOString(), pid: process.pid };
  atomicWrite(resolved, running);
  try {
    const result = await invokeTestAgentHandoff(state.handoff, { runtimeProjectEnvironments: runtimeTargetEnvironments(state) });
    const completed: InternalMcpTestRun = { ...running, status: "completed", updated_at: new Date().toISOString(), invocation_result: result, error: "" };
    atomicWrite(resolved, completed);
    appendInternalMcpTaskJournal(state.context, "test", { run_id: state.run_id, status: "completed", outcome: result.outcome, recommendation: result.recommendation, can_accept: result.canAccept === true }, { type: "internal_mcp_test_run_completed", title: "TestAgent 独立验收完成", detail: result.canAccept ? "验收证据完整，可以进入主 Agent 最终判断" : result.error || result.report?.summary || "验收发现缺口，需要返工或人工判断", status: result.canAccept ? "passed" : "warning", phase: "test" });
    return completed;
  } catch (error: any) {
    const failed: InternalMcpTestRun = { ...running, status: "failed", updated_at: new Date().toISOString(), error: error?.message || String(error) };
    atomicWrite(resolved, failed);
    appendInternalMcpTaskJournal(state.context, "test", { run_id: state.run_id, status: "failed", error: failed.error }, { type: "internal_mcp_test_run_failed", title: "TestAgent 独立验收失败", detail: failed.error || "TestAgent 运行失败", status: "failed", phase: "test" });
    return failed;
  }
}

export function publicInternalMcpTestRun(state: InternalMcpTestRun | null) {
  if (!state) return null;
  const result = state.invocation_result || {};
  return {
    schema: state.schema,
    run_id: state.run_id,
    task_id: state.task_id,
    status: state.status,
    created_at: state.created_at,
    updated_at: state.updated_at,
    plan_valid: state.plan?.valid === true,
    plan_summary: state.plan?.summary || {},
    projects: state.plan?.projects?.map((project: any) => ({ name: project.name, commands: project.commands?.length || 0, browser_checks: project.browserChecks?.length || 0, http_checks: project.httpChecks?.length || 0 })) || [],
    delivery_bindings: state.delivery_bindings || [],
    warnings: state.warnings || [],
    outcome: result.outcome || "",
    recommendation: result.recommendation || "",
    can_accept: result.canAccept === true,
    error: internalMcpTaskPayload.cleanText(state.error || result.error, 1000),
    report: result.report ? { id: result.report.id, status: result.report.status, summary: internalMcpTaskPayload.cleanText(result.report.summary, 1400), recommendation: result.report.recommendation, started_at: result.report.startedAt, finished_at: result.report.finishedAt } : null,
    verdict: result.verdict ? { id: result.verdict.id, status: result.verdict.status, recommendation: result.verdict.recommendation, canAccept: result.verdict.canAccept, summary: internalMcpTaskPayload.cleanText(result.verdict.summary, 1400), reasons: internalMcpTaskPayload.cleanList(result.verdict.reasons, 30, 700) } : null,
    artifact_verification: result.artifactVerification ? { status: result.artifactVerification.status, summary: result.artifactVerification.summary } : null,
  };
}

export function internalMcpTestEvidence(taskId: string) {
  return listTestAgentArtifactCatalogForTasks([taskId]).map(run => ({ ...run, artifacts: run.artifacts.map(artifact => ({ ...artifact })) }));
}
