#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  CCM_DIR,
  UPLOAD_DIR,
  refreshEnvPath,
  createFileChangeSnapshot,
  getFileChanges,
} from "../core/utils";
import {
  buildAgentCommand,
  getAgentCommandLabel,
  normalizeAgentCommandOutput,
  normalizeAgentRuntimeId,
} from "./runtime";
import {
  getRuntimeExecutionEnv,
  getRuntimeToolCatalogRevision,
  probeRuntimeToolReadiness,
} from "../tools/runtime-tool-sync";
import { loadProjectConfigs } from "../core/db";
import { loadGroups } from "../modules/collaboration/storage";
import {
  classifyExecutionFailure,
  isSafeVerificationCommand,
  isTaskCancellationRequested,
  persistBoundedOutput,
  runManagedCommand,
  sanitizeExecutionEnv,
  transitionExecution,
} from "./execution-kernel";

const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
const REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
const HEARTBEAT_FILE = path.join(AGENT_RUNNER_DIR, "heartbeat.json");

function ensureDirs() {
  for (const dir of [AGENT_RUNNER_DIR, REQUESTS_DIR, RESULTS_DIR, UPLOAD_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function writeHeartbeat(status = "idle", detail = "") {
  ensureDirs();
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
    status,
    detail,
    pid: process.pid,
    updated_at: new Date().toISOString(),
  }, null, 2), "utf-8");
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJsonAtomic(file: string, data: any) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

function markRequest(file: string, patch: any) {
  const request = readJson(file);
  writeJsonAtomic(file, { ...request, ...patch, updated_at: new Date().toISOString() });
}

function normalizeVerificationCommands(value: any) {
  const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
  const seen = new Set<string>();
  const commands: string[] = [];
  for (const item of raw) {
    const command = String(item || "").trim();
    if (!command || seen.has(command)) continue;
    seen.add(command);
    commands.push(command);
  }
  return commands.slice(0, 8);
}

function getProjectVerificationCommands(projectName: string) {
  if (!projectName) return [];
  const configFile = path.join(CCM_DIR, "project-configs.json");
  if (!fs.existsSync(configFile)) return [];
  try {
    const configs = readJson(configFile);
    const config = configs?.[projectName] || {};
    return normalizeVerificationCommands(
      config.verification_commands
        || config.verificationCommands
        || config.test_commands
        || config.testCommands
        || config.check_commands
        || config.checkCommands
    );
  } catch {
    return [];
  }
}

function isAgentProbeRequest(request: any) {
  return /CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(String(request?.message || ""));
}

function normalizeToolSelection(tools: any = {}) {
  return {
    mcp: Array.isArray(tools?.mcp) ? tools.mcp.map((item: any) => String(item || "").trim()).filter(Boolean).sort() : [],
    skill: Array.isArray(tools?.skill) ? tools.skill.map((item: any) => String(item || "").trim()).filter(Boolean).sort() : [],
  };
}

function mergeToolSelections(...items: any[]) {
  const merged = { mcp: new Set<string>(), skill: new Set<string>() };
  for (const item of items) {
    const normalized = normalizeToolSelection(item);
    for (const name of normalized.mcp) merged.mcp.add(name);
    for (const name of normalized.skill) merged.skill.add(name);
  }
  return normalizeToolSelection({ mcp: Array.from(merged.mcp), skill: Array.from(merged.skill) });
}

function hasToolSelection(tools: any) {
  const normalized = normalizeToolSelection(tools);
  return normalized.mcp.length > 0 || normalized.skill.length > 0;
}

function sameToolSelection(left: any, right: any) {
  const a = normalizeToolSelection(left);
  const b = normalizeToolSelection(right);
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeGate(gate: any) {
  if (!gate || typeof gate !== "object") return null;
  return {
    ...gate,
    dispatchReady: gate.dispatchReady !== undefined ? gate.dispatchReady : gate.dispatch_ready,
    reason: String(gate.reason || gate.message || ""),
  };
}

function buildRunnerRuntimeToolGate(reason: string, blockers: any[] = [], sourceGate: any = null) {
  return {
    schema: "ccm-external-runner-runtime-tool-gate-v1",
    dispatchReady: false,
    status: "blocked",
    reason,
    blockers,
    source_gate: sourceGate || null,
    checkedAt: new Date().toISOString(),
  };
}

function readJsonSafe(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

function normalizeRuntimeToolSnapshot(request: any) {
  const raw = request?.runtimeToolSnapshot || request?.runtime_tool_snapshot || {};
  const allowedTools = normalizeToolSelection(raw.allowedTools || raw.allowed_tools || request?.allowedTools || request?.allowed_tools || {});
  const dispatchGate = normalizeGate(raw.dispatchGate || raw.dispatch_gate || request?.runtimeToolDispatchGate || request?.runtime_tool_dispatch_gate);
  const rawRuntime = String(raw.runtime || raw.agentType || raw.agent_type || raw.runtimeId || raw.runtime_id || "").trim();
  const requestRuntime = normalizeAgentRuntimeId(request?.agentType || request?.agent_type || "claudecode");
  return {
    ...raw,
    runtime: normalizeAgentRuntimeId(rawRuntime || requestRuntime),
    runtimeSource: rawRuntime ? "snapshot" : "request",
    snapshotId: String(raw.snapshotId || raw.snapshot_id || request?.runtimeToolSnapshotId || request?.runtime_tool_snapshot_id || ""),
    snapshotPath: String(raw.snapshotPath || raw.snapshot_path || request?.runtimeToolSnapshotPath || request?.runtime_tool_snapshot_path || ""),
    mcpConfigPath: String(raw.mcpConfigPath || raw.mcp_config_path || request?.mcpConfigPath || request?.mcp_config_path || ""),
    allowedTools,
    requested: normalizeToolSelection(raw.requested || allowedTools),
    permission_rules: Array.isArray(raw.permission_rules) ? raw.permission_rules : (Array.isArray(raw.permissionRules) ? raw.permissionRules : []),
    authorization_readiness: raw.authorization_readiness || raw.authorizationReadiness || request?.authorization_readiness || request?.authorizationReadiness || null,
    dispatch_gate: dispatchGate,
    catalogRevision: String(raw.catalogRevision || raw.catalog_revision || request?.catalogRevision || ""),
  };
}

function runtimeToolPayloadRequested(request: any, snapshot: any) {
  return request?.runtimeToolSnapshotRequired === true
    || !!snapshot?.snapshotPath
    || !!snapshot?.mcpConfigPath
    || !!request?.mcpConfigPath
    || hasToolSelection(snapshot?.allowedTools || request?.allowedTools);
}

function resolveRunnerMcpConfigPath(request: any, validation: any = null) {
  return String(
    validation?.runtimeToolSnapshot?.mcpConfigPath
      || validation?.runtimeToolSnapshot?.mcp_config_path
      || request?.mcpConfigPath
      || request?.mcp_config_path
      || "",
  ).trim();
}

function groupIdFromRequest(request: any) {
  const scope = request?.toolScope || request?.tool_scope || {};
  return String(request?.groupId || request?.group_id || scope.groupId || scope.group_id || "").trim();
}

function readCurrentToolScope(request: any) {
  const projectName = String(request?.projectName || "").trim();
  const groupId = groupIdFromRequest(request);
  if (!projectName) {
    return { ok: false, reason: "外部 Runner 请求缺少 projectName，无法复验 MCP/Skill 授权范围" };
  }
  const configs = loadProjectConfigs();
  const projectTools = normalizeToolSelection(configs?.[projectName]?.tools || {});
  if (!groupId) {
    return { ok: true, tools: projectTools, scope: { scope: "project", projectName } };
  }
  const group = loadGroups().find((item: any) => String(item?.id || "") === groupId);
  if (!group) {
    return { ok: false, reason: `群聊 ${groupId} 不存在或已删除，拒绝使用旧 MCP/Skill 快照` };
  }
  return {
    ok: true,
    tools: mergeToolSelections(group.tools || {}, projectTools),
    scope: { scope: "group-project", groupId, projectName },
  };
}

function validateRunnerToolScope(request: any, requestedTools: any, options: any = {}) {
  if (options.skipScopeValidation === true) return { ok: true, skipped: true };
  const current = typeof options.loadCurrentToolScope === "function"
    ? options.loadCurrentToolScope(request)
    : readCurrentToolScope(request);
  if (!current?.ok) return { ok: false, reason: current?.reason || "无法读取当前 MCP/Skill 授权范围", current };
  if (!sameToolSelection(current.tools, requestedTools)) {
    return {
      ok: false,
      reason: "当前项目/群聊 MCP/Skill 授权已变化，外部 Runner 拒绝使用排队时的旧快照",
      requested: normalizeToolSelection(requestedTools),
      current: normalizeToolSelection(current.tools),
      scope: current.scope || null,
    };
  }
  return { ok: true, current: normalizeToolSelection(current.tools), scope: current.scope || null };
}

export function validateExternalRunnerRuntimeToolGate(request: any, options: any = {}) {
  const snapshot = normalizeRuntimeToolSnapshot(request);
  if (!runtimeToolPayloadRequested(request, snapshot)) {
    return { ok: true, runtimeToolSnapshot: snapshot, runtimeToolDispatchGate: null };
  }

  const requestGate = normalizeGate(request?.runtimeToolDispatchGate || request?.runtime_tool_dispatch_gate || snapshot.dispatch_gate);
  if (requestGate?.dispatchReady === false) {
    const reason = requestGate.reason || "MCP/Skill 派发门禁未通过，外部 Runner 已拒绝启动";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, requestGate.blockers || [], requestGate),
    };
  }

  if (!snapshot.snapshotPath) {
    const reason = "外部 Runner 请求缺少 runtimeToolSnapshot.snapshotPath，无法复验 MCP/Skill 派发快照";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason),
    };
  }

  const persistedSnapshot = readJsonSafe(snapshot.snapshotPath);
  if (!persistedSnapshot) {
    const reason = `运行时授权快照不存在或无法解析：${snapshot.snapshotPath}`;
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason),
    };
  }
  const requestRuntime = normalizeAgentRuntimeId(request?.agentType || request?.agent_type || "claudecode");
  const payloadRuntime = normalizeAgentRuntimeId(snapshot.runtime || requestRuntime);
  const persistedRuntimeRaw = String(persistedSnapshot.runtime || persistedSnapshot.agentType || persistedSnapshot.agent_type || "").trim();
  const persistedRuntime = persistedRuntimeRaw ? normalizeAgentRuntimeId(persistedRuntimeRaw) : "";
  const runtimeBlockers: any[] = [];
  if (snapshot.runtimeSource === "snapshot" && payloadRuntime !== requestRuntime) {
    runtimeBlockers.push({ id: "payload_runtime", requested: requestRuntime, payload: payloadRuntime });
  }
  if (persistedRuntime && persistedRuntime !== requestRuntime) {
    runtimeBlockers.push({ id: "snapshot_runtime", requested: requestRuntime, persisted: persistedRuntime });
  }
  if (persistedRuntime && payloadRuntime !== persistedRuntime) {
    runtimeBlockers.push({ id: "payload_snapshot_runtime", payload: payloadRuntime, persisted: persistedRuntime });
  }
  if (runtimeBlockers.length) {
    const reason = `外部 Runner 请求运行时 ${requestRuntime} 与 MCP/Skill 快照运行时不一致，拒绝复用旧快照`;
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, runtimeBlockers),
    };
  }
  const persistedToolSource = persistedSnapshot.requested || persistedSnapshot.allowedTools || persistedSnapshot.allowed_tools || null;
  const requestedTools = normalizeToolSelection(persistedToolSource || snapshot.allowedTools || request?.allowedTools || request?.allowed_tools || {});
  const payloadTools = normalizeToolSelection(snapshot.allowedTools || request?.allowedTools || request?.allowed_tools || {});
  if (persistedToolSource && hasToolSelection(payloadTools) && !sameToolSelection(payloadTools, requestedTools)) {
    const reason = "外部 Runner 请求的 MCP/Skill 授权范围与持久化快照不一致，拒绝启动";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, [{
        id: "snapshot_requested_tools",
        requested: payloadTools,
        persisted: requestedTools,
      }]),
    };
  }
  const persistedSnapshotId = String(persistedSnapshot.snapshotId || persistedSnapshot.snapshot_id || "");
  if (snapshot.snapshotId && persistedSnapshotId && snapshot.snapshotId !== persistedSnapshotId) {
    const reason = `运行时授权快照已变化：请求 snapshot=${snapshot.snapshotId}，当前 snapshot=${persistedSnapshotId}`;
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, [{ id: "snapshot_id", requested: snapshot.snapshotId, current: persistedSnapshotId }]),
    };
  }
  const persistedGate = normalizeGate(persistedSnapshot.dispatch_gate || persistedSnapshot.dispatchGate);
  if (!persistedGate) {
    const reason = "运行时授权快照缺少 dispatch_gate，外部 Runner 已拒绝启动";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason),
    };
  }
  if (persistedGate.dispatchReady === false) {
    const reason = persistedGate.reason || "运行时授权快照门禁未通过，外部 Runner 已拒绝启动";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, persistedGate.blockers || [], persistedGate),
    };
  }

  const scopeCheck = validateRunnerToolScope(request, requestedTools, options);
  if (!scopeCheck.ok) {
    const reason = scopeCheck.reason || "当前 MCP/Skill 授权范围复验失败";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolScope: scopeCheck,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, [{ id: "authorization_scope", scope: scopeCheck }]),
    };
  }

  const audit = {
    ...persistedSnapshot,
    ...snapshot,
    runtime: persistedRuntime || payloadRuntime || requestRuntime,
    snapshotId: snapshot.snapshotId || persistedSnapshotId,
    snapshotPath: snapshot.snapshotPath,
    mcpConfigPath: snapshot.mcpConfigPath || persistedSnapshot.mcpConfigPath || request?.mcpConfigPath || "",
    requested: requestedTools,
    synced: persistedSnapshot.synced || snapshot.synced || requestedTools,
    missing: persistedSnapshot.missing || snapshot.missing || { mcp: [], skill: [] },
    authorization_readiness: snapshot.authorization_readiness || persistedSnapshot.authorization_readiness || null,
    dispatch_gate: persistedGate,
    catalogRevision: snapshot.catalogRevision || persistedSnapshot.catalogRevision || "",
  };
  const readiness = options.skipReadinessProbe === true ? null : probeRuntimeToolReadiness(audit, {
    deep: false,
    catalog: options.catalog,
    catalogRevision: options.catalogRevision,
  });
  if (readiness && readiness.deliveryReady !== true) {
    const failedChecks = (readiness.checks || [])
      .filter((check: any) => check && check.ok === false && check.id !== "cli_start")
      .map((check: any) => ({ id: check.id, detail: check.detail }));
    const reason = failedChecks.length
      ? `外部 Runner 运行时工具快照复验失败：${failedChecks.map((check: any) => `${check.id}: ${check.detail}`).join("；")}`
      : "外部 Runner 运行时工具快照复验失败";
    return {
      ok: false,
      reason,
      runtimeToolSnapshot: snapshot,
      runtimeToolReadiness: readiness,
      runtimeToolScope: scopeCheck,
      runtimeToolDispatchGate: buildRunnerRuntimeToolGate(reason, failedChecks),
    };
  }

  return {
    ok: true,
    runtimeToolSnapshot: { ...audit, dispatchGate: persistedGate, dispatch_gate: persistedGate },
    runtimeToolReadiness: readiness,
    runtimeToolScope: scopeCheck,
    runtimeToolDispatchGate: persistedGate,
  };
}

function writeRuntimeToolGateBlockedResult(file: string, resultFile: string, request: any, validation: any, executionId = "") {
  const reason = String(validation?.reason || "MCP/Skill 运行时授权复验失败，外部 Runner 已拒绝启动");
  const gate = validation?.runtimeToolDispatchGate || buildRunnerRuntimeToolGate(reason);
  writeJsonAtomic(resultFile, {
    id: request.id,
    success: false,
    blocked: true,
    runtimeToolDispatchBlocked: true,
    runtime_tool_dispatch_blocked: true,
    error: reason,
    output: reason,
    runtime_tool_dispatch_gate: gate,
    runtime_tool_snapshot: validation?.runtimeToolSnapshot || null,
    runtime_tool_readiness: validation?.runtimeToolReadiness || null,
    runtime_tool_scope: validation?.runtimeToolScope || null,
    runner: "node",
    completed_at: new Date().toISOString(),
  });
  markRequest(file, {
    status: "failed",
    completed_at: new Date().toISOString(),
    error: reason,
    runtime_tool_dispatch_gate: gate,
    runtime_tool_snapshot: validation?.runtimeToolSnapshot || null,
  });
  if (executionId) transitionExecution(executionId, "failed", reason, {
    runtime_tool_dispatch_gate: gate,
    runtime_tool_readiness: validation?.runtimeToolReadiness || null,
    runtime_tool_scope: validation?.runtimeToolScope || null,
  });
}

function buildCliAllowedTools(request: any): string[] {
  if (isAgentProbeRequest(request)) return [];
  const explicit = Array.isArray(request.cliAllowedTools)
    ? request.cliAllowedTools.map((item: any) => String(item || "").trim()).filter(Boolean)
    : [];
  const rules: string[] = explicit.length ? explicit : getProjectVerificationCommands(String(request.projectName || "")).flatMap(command => {
    const rule = `Bash(${command})`;
    return process.platform === "win32" ? [rule, `PowerShell(${command})`] : [rule];
  });
  return Array.from(new Set(rules));
}
async function runProjectVerificationCommands(projectName: string, workDir: string, timeoutMs: number, request: any) {
  const commands = getProjectVerificationCommands(projectName).filter(isSafeVerificationCommand);
  const results: any[] = [];
  const verification: string[] = [];
  const failed: string[] = [];
  if (!commands.length || !workDir) {
    return { ccm_runner_verification: true, status: "skipped", verification, failed, results };
  }

  const perCommandTimeout = Math.max(30000, Math.min(timeoutMs || 300000, 180000));
  for (const command of commands) {
    try {
      const managed = await runManagedCommand({
        taskId: String(request.taskId || request.id),
        executionId: String(request.executionId || ""),
        command,
        cwd: workDir,
        timeoutMs: perCommandTimeout,
        maxOutputBytes: 5 * 1024 * 1024,
        env: sanitizeExecutionEnv(getRuntimeExecutionEnv(request.agentType || "claudecode"), request.envAllowlist || []),
      });
      const item = { command, exitCode: 0, status: "passed", output: String(managed.stdout || "").slice(-4000) };
      results.push(item);
      verification.push(`${command} passed by external runner (exit 0)`);
    } catch (error: any) {
      const exitCode = error?.exitCode ?? error?.status ?? null;
      const output = String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000);
      const item = { command, exitCode, status: "failed", output };
      results.push(item);
      failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
    }
  }
  return {
    ccm_runner_verification: true,
    status: failed.length ? "failed" : "passed",
    verification,
    failed,
    results,
  };
}

function appendRunnerVerificationOutput(output: string, runnerVerification: any) {
  if (!runnerVerification || runnerVerification.status === "skipped") return output;
  return `${output || ""}\n\nCCM_RUNNER_VERIFICATION\n` + "```json\n" + JSON.stringify(runnerVerification, null, 2) + "\n```";
}

async function runRequest(file: string) {
  const request = readJson(file);
  if (!request?.id || ["done", "running", "failed", "cancelled", "expired"].includes(request.status)) return false;

  const createdAt = Date.parse(String(request.created_at || request.createdAt || ""));
  const requestAgeMs = Number.isFinite(createdAt) ? Date.now() - createdAt : 0;
  const staleAfterMs = Math.max(10 * 60 * 1000, Number(request.timeoutMs || 300000) + 60 * 1000);
  if (request.status === "pending" && requestAgeMs > staleAfterMs) {
    markRequest(file, { status: "expired", completed_at: new Date().toISOString(), error: "外部 Runner 请求已超过调用方等待窗口，安全跳过，避免恢复历史任务" });
    return true;
  }

  const resultFile = path.join(RESULTS_DIR, `${request.id}.json`);
  if (fs.existsSync(resultFile)) return false;
  const taskId = String(request.taskId || request.id);
  const executionId = String(request.executionId || "");
  const runtimeToolValidation = validateExternalRunnerRuntimeToolGate(request);
  if (!runtimeToolValidation.ok) {
    writeHeartbeat("blocked", runtimeToolValidation.reason || "runtime tool gate blocked");
    writeRuntimeToolGateBlockedResult(file, resultFile, request, runtimeToolValidation, executionId);
    writeHeartbeat("idle", "");
    return true;
  }
  if (request.status === "cancel_requested" || isTaskCancellationRequested(taskId)) {
    writeJsonAtomic(resultFile, { id: request.id, success: false, cancelled: true, error: request.cancel_reason || "任务已取消", completed_at: new Date().toISOString() });
    markRequest(file, { status: "cancelled", completed_at: new Date().toISOString() });
    if (executionId) transitionExecution(executionId, "cancelled", request.cancel_reason || "任务已取消");
    return true;
  }

  markRequest(file, { status: "running", runner_pid: process.pid, started_at: new Date().toISOString() });
  writeHeartbeat("running", `${request.projectName || "agent"} ${request.id}`);

  const msgFile = path.join(UPLOAD_DIR, `_runner_${request.id}.txt`);
  const workDir = request.workDir || process.cwd();
  const agentType = normalizeAgentRuntimeId(request.agentType || "claudecode");
  const command = getAgentCommandLabel(agentType);
  const timeoutMs = Number(request.timeoutMs || 300000);
  const changeSnapshot = workDir ? createFileChangeSnapshot(workDir) : null;
  const cliAllowedTools = buildCliAllowedTools(request);
  const effectiveMcpConfigPath = resolveRunnerMcpConfigPath(request, runtimeToolValidation);

  try {
    fs.writeFileSync(msgFile, String(request.message || ""), "utf-8");
    const managed = await runManagedCommand({
      taskId,
      executionId,
      command: buildAgentCommand(agentType, msgFile, {
      cliAllowedTools,
      mcpConfigPath: effectiveMcpConfigPath,
      ...(request.agentSession || {}),
      }),
      cwd: workDir,
      timeoutMs,
      maxOutputBytes: Number(request.maxOutputBytes || 2 * 1024 * 1024),
      env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), request.envAllowlist || []),
    });
    const normalizedOutput = normalizeAgentCommandOutput(agentType, String(managed.stdout || "").trim());
    const agentOutput = persistBoundedOutput(taskId, normalizedOutput.output, Number(request.maxContextOutputBytes || 256 * 1024)).content;
    const runnerVerification = isAgentProbeRequest(request) || request.skipVerification === true
      ? { ccm_runner_verification: true, status: "skipped", verification: [], failed: [], results: [] }
      : await runProjectVerificationCommands(request.projectName || "", workDir, timeoutMs, request);
    const output = appendRunnerVerificationOutput(agentOutput, runnerVerification);
    const fileChanges = getFileChanges(request.projectName || "", changeSnapshot);
    writeJsonAtomic(resultFile, {
      id: request.id,
      success: true,
      output,
      nativeSessionId: normalizedOutput.sessionId || request.agentSession?.sessionId || "",
      fileChanges,
      agentType,
      command: cliAllowedTools.length ? `${command} --allowed-tools ${cliAllowedTools.join(",")}` : command,
      mcpConfigPath: effectiveMcpConfigPath,
      runtimeToolSnapshot: runtimeToolValidation.runtimeToolSnapshot || null,
      cliAllowedTools,
      effectiveCliAllowedTools: cliAllowedTools.join(","),
      runnerVerification,
      runner: "node",
      completed_at: new Date().toISOString(),
    });
    markRequest(file, { status: "done", completed_at: new Date().toISOString() });
  } catch (error: any) {
    const failure = classifyExecutionFailure(error);
    const cancelled = failure.failureClass === "cancelled";
    const output = failure.failureClass === "timeout" ? "Agent 响应超时" : failure.message.slice(0, 4000);
    const fileChanges = getFileChanges(request.projectName || "", changeSnapshot);
    writeJsonAtomic(resultFile, {
      id: request.id,
      success: false,
      cancelled,
      failure,
      error: output || "Agent Runner 执行失败",
      output,
      fileChanges,
      agentType,
      command: cliAllowedTools.length ? `${command} --allowed-tools ${cliAllowedTools.join(",")}` : command,
      mcpConfigPath: effectiveMcpConfigPath,
      runtimeToolSnapshot: runtimeToolValidation.runtimeToolSnapshot || null,
      cliAllowedTools,
      effectiveCliAllowedTools: cliAllowedTools.join(","),
      exitCode: error?.status ?? null,
      runner: "node",
      completed_at: new Date().toISOString(),
    });
    markRequest(file, { status: cancelled ? "cancelled" : "failed", completed_at: new Date().toISOString(), error: output });
    if (executionId) transitionExecution(executionId, cancelled ? "cancelled" : "failed", output, { failure, failureClass: failure.failureClass });
  } finally {
    try { fs.unlinkSync(msgFile); } catch {}
    writeHeartbeat("idle", "");
  }
  return true;
}

export function runAgentRunnerSelfTest() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-runner-gate-"));
  try {
    const allowedTools = { mcp: [], skill: [] };
    const catalog = { mcpTools: [], skills: [] };
    const catalogRevision = getRuntimeToolCatalogRevision(catalog, allowedTools);
    const mcpConfigPath = path.join(tempDir, "mcp.json");
    const snapshotPath = path.join(tempDir, "runtime-tool-snapshot.json");
    const dispatchGate = {
      schema: "ccm-runtime-tool-dispatch-gate-v1",
      dispatchReady: true,
      status: "ready",
      reason: "",
      blockers: [],
    };
    const authorizationReadiness = {
      schema: "ccm-tool-authorization-readiness-v1",
      dispatchReady: true,
      status: "ready",
      requested: { mcp: 0, skill: 0 },
      available: { mcp: 0, skill: 0 },
      missing: { missing_mcp_servers: 0, missing_mcp_tools: 0, missing_skills: 0 },
      invalid_mcp_grants: 0,
    };
    fs.writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers: {} }, null, 2), "utf-8");
    fs.writeFileSync(snapshotPath, JSON.stringify({
      snapshotId: "runner-selftest",
      runtime: "claudecode",
      requested: allowedTools,
      synced: allowedTools,
      missing: allowedTools,
      permission_rules: [],
      authorization_readiness: authorizationReadiness,
      dispatch_gate: dispatchGate,
      catalogRevision,
      mcpConfigPath,
      generatedAt: new Date().toISOString(),
    }, null, 2), "utf-8");
    const baseRequest = {
      id: "runner-selftest",
      projectName: "runner-selftest",
      agentType: "claudecode",
      allowedTools,
      mcpConfigPath,
      runtimeToolSnapshotRequired: true,
      runtimeToolSnapshot: {
        snapshotId: "runner-selftest",
        snapshotPath,
        mcpConfigPath,
        allowedTools,
        authorizationReadiness,
        dispatchGate,
        catalogRevision,
      },
      runtimeToolDispatchGate: dispatchGate,
    };
    const ready = validateExternalRunnerRuntimeToolGate(baseRequest, { skipScopeValidation: true, catalog });
    const missingSnapshot = validateExternalRunnerRuntimeToolGate({
      ...baseRequest,
      runtimeToolSnapshot: { ...baseRequest.runtimeToolSnapshot, snapshotPath: path.join(tempDir, "missing.json") },
    }, { skipScopeValidation: true, catalog });
    const blockedGate = validateExternalRunnerRuntimeToolGate({
      ...baseRequest,
      runtimeToolDispatchGate: { ...dispatchGate, dispatchReady: false, reason: "blocked by selftest" },
    }, { skipScopeValidation: true, catalog });
    const scopeMismatch = validateExternalRunnerRuntimeToolGate({
      ...baseRequest,
      allowedTools: { mcp: ["payments"], skill: [] },
      runtimeToolSnapshot: { ...baseRequest.runtimeToolSnapshot, allowedTools: { mcp: ["payments"], skill: [] } },
    }, {
      catalog,
      loadCurrentToolScope: () => ({ ok: true, tools: { mcp: [], skill: [] }, scope: { scope: "project", projectName: "runner-selftest" } }),
    });
    const nonEmptyAllowedTools = { mcp: ["payments/createInvoice"], skill: ["release-notes"] };
    const nonEmptySnapshotPath = path.join(tempDir, "runtime-tool-snapshot-non-empty.json");
    const nonEmptyDispatchGate = { ...dispatchGate, reason: "non-empty tools ready" };
    const nonEmptyAuthorizationReadiness = {
      ...authorizationReadiness,
      requested: { mcp: 1, skill: 1 },
      available: { mcp: 1, skill: 1 },
    };
    fs.writeFileSync(nonEmptySnapshotPath, JSON.stringify({
      snapshotId: "runner-selftest-non-empty",
      runtime: "claudecode",
      requested: nonEmptyAllowedTools,
      synced: nonEmptyAllowedTools,
      missing: { mcp: [], skill: [] },
      permission_rules: [],
      authorization_readiness: nonEmptyAuthorizationReadiness,
      dispatch_gate: nonEmptyDispatchGate,
      catalogRevision: getRuntimeToolCatalogRevision(catalog, nonEmptyAllowedTools),
      mcpConfigPath,
      generatedAt: new Date().toISOString(),
    }, null, 2), "utf-8");
    const nonEmptyRequest = {
      ...baseRequest,
      id: "runner-selftest-non-empty",
      allowedTools: nonEmptyAllowedTools,
      runtimeToolSnapshot: {
        ...baseRequest.runtimeToolSnapshot,
        snapshotId: "runner-selftest-non-empty",
        snapshotPath: nonEmptySnapshotPath,
        allowedTools: nonEmptyAllowedTools,
        authorizationReadiness: nonEmptyAuthorizationReadiness,
        dispatchGate: nonEmptyDispatchGate,
        catalogRevision: getRuntimeToolCatalogRevision(catalog, nonEmptyAllowedTools),
      },
      runtimeToolDispatchGate: nonEmptyDispatchGate,
    };
    const nonEmptyScopeMatch = validateExternalRunnerRuntimeToolGate(nonEmptyRequest, {
      skipReadinessProbe: true,
      catalog,
      loadCurrentToolScope: () => ({ ok: true, tools: nonEmptyAllowedTools, scope: { scope: "project", projectName: "runner-selftest" } }),
    });
    const nonEmptyScopeDrift = validateExternalRunnerRuntimeToolGate(nonEmptyRequest, {
      skipReadinessProbe: true,
      catalog,
      loadCurrentToolScope: () => ({
        ok: true,
        tools: { mcp: ["payments/refundInvoice"], skill: ["security-audit"] },
        scope: { scope: "project", projectName: "runner-selftest" },
      }),
    });
    const persistedScopeFallbackRequest = {
      ...baseRequest,
      id: "runner-selftest-persisted-scope-fallback",
      allowedTools: undefined,
      runtimeToolSnapshot: {
        snapshotId: "runner-selftest-non-empty",
        snapshotPath: nonEmptySnapshotPath,
        mcpConfigPath,
        authorizationReadiness: nonEmptyAuthorizationReadiness,
        dispatchGate: nonEmptyDispatchGate,
        catalogRevision: getRuntimeToolCatalogRevision(catalog, nonEmptyAllowedTools),
      },
      runtimeToolDispatchGate: nonEmptyDispatchGate,
    };
    const persistedScopeFallback = validateExternalRunnerRuntimeToolGate(persistedScopeFallbackRequest, {
      skipReadinessProbe: true,
      catalog,
      loadCurrentToolScope: () => ({ ok: true, tools: nonEmptyAllowedTools, scope: { scope: "project", projectName: "runner-selftest" } }),
    });
    const forgedPayloadScope = validateExternalRunnerRuntimeToolGate({
      ...persistedScopeFallbackRequest,
      allowedTools: { mcp: ["payments/refundInvoice"], skill: ["security-audit"] },
      runtimeToolSnapshot: {
        ...persistedScopeFallbackRequest.runtimeToolSnapshot,
        allowedTools: { mcp: ["payments/refundInvoice"], skill: ["security-audit"] },
      },
    }, {
      skipReadinessProbe: true,
      catalog,
      loadCurrentToolScope: () => ({ ok: true, tools: nonEmptyAllowedTools, scope: { scope: "project", projectName: "runner-selftest" } }),
    });
    const writeLaunchSnapshot = (runtime: string, rootName: string, extras: any = {}) => {
      const runtimeRoot = path.join(tempDir, rootName);
      const configPath = extras.mcpConfigPath || path.join(runtimeRoot, runtime === "codex" ? "config.toml" : "mcp.json");
      const snapshotFile = path.join(runtimeRoot, "runtime-tool-snapshot.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, runtime === "codex" ? "# codex config\n" : JSON.stringify({ mcpServers: {} }, null, 2), "utf-8");
      fs.writeFileSync(snapshotFile, JSON.stringify({
        snapshotId: `runner-launch-${runtime}`,
        runtime,
        requested: allowedTools,
        synced: allowedTools,
        missing: allowedTools,
        permission_rules: [],
        authorization_readiness: authorizationReadiness,
        dispatch_gate: dispatchGate,
        catalogRevision,
        mcpConfigPath: configPath,
        ...extras,
        generatedAt: new Date().toISOString(),
      }, null, 2), "utf-8");
      return { runtimeRoot, configPath, snapshotFile };
    };
    const claudeLaunch = writeLaunchSnapshot("claudecode", "launch-claude");
    const cursorLaunchRoot = path.join(tempDir, "launch-cursor");
    const cursorPluginDir = path.join(cursorLaunchRoot, "plugin");
    const cursorMcpConfigPath = path.join(cursorPluginDir, ".mcp.json");
    const cursorHomePath = path.join(cursorLaunchRoot, "home");
    const cursorLaunch = writeLaunchSnapshot("cursor", "launch-cursor", {
      mcpConfigPath: cursorMcpConfigPath,
      pluginDirPath: cursorPluginDir,
      isolatedHomePath: cursorHomePath,
    });
    const codexHomePath = path.join(tempDir, "launch-codex");
    const codexLaunch = writeLaunchSnapshot("codex", "launch-codex", {
      isolatedHomePath: codexHomePath,
    });
    const launchRequest = (runtime: string, launch: any, extra: any = {}) => ({
      ...baseRequest,
      ...extra,
      id: `runner-launch-${runtime}`,
      agentType: runtime,
      mcpConfigPath: "",
      runtimeToolSnapshot: {
        snapshotId: `runner-launch-${runtime}`,
        snapshotPath: launch.snapshotFile,
        mcpConfigPath: launch.configPath,
        allowedTools,
        authorizationReadiness,
        dispatchGate,
        catalogRevision,
      },
      runtimeToolDispatchGate: dispatchGate,
    });
    const nestedOnlyClaudeRequest = launchRequest("claudecode", claudeLaunch);
    const nestedOnlyCursorRequest = launchRequest("cursor", cursorLaunch);
    const nestedOnlyCodexRequest = launchRequest("codex", codexLaunch);
    const mismatchedRuntimeRequest = launchRequest("claudecode", cursorLaunch, {
      id: "runner-launch-runtime-mismatch",
      runtimeToolSnapshot: {
        snapshotId: "runner-launch-cursor",
        snapshotPath: cursorLaunch.snapshotFile,
        mcpConfigPath: cursorLaunch.configPath,
        runtime: "cursor",
        allowedTools,
        authorizationReadiness,
        dispatchGate,
        catalogRevision,
      },
    });
    const nestedOnlyClaudeValidation = validateExternalRunnerRuntimeToolGate(nestedOnlyClaudeRequest, {
      skipScopeValidation: true,
      skipReadinessProbe: true,
      catalog,
    });
    const nestedOnlyCursorValidation = validateExternalRunnerRuntimeToolGate(nestedOnlyCursorRequest, {
      skipScopeValidation: true,
      skipReadinessProbe: true,
      catalog,
    });
    const nestedOnlyCodexValidation = validateExternalRunnerRuntimeToolGate(nestedOnlyCodexRequest, {
      skipScopeValidation: true,
      skipReadinessProbe: true,
      catalog,
    });
    const mismatchedRuntimeValidation = validateExternalRunnerRuntimeToolGate(mismatchedRuntimeRequest, {
      skipScopeValidation: true,
      skipReadinessProbe: true,
      catalog,
    });
    const nestedOnlyClaudeConfigPath = resolveRunnerMcpConfigPath(nestedOnlyClaudeRequest, nestedOnlyClaudeValidation);
    const nestedOnlyCursorConfigPath = resolveRunnerMcpConfigPath(nestedOnlyCursorRequest, nestedOnlyCursorValidation);
    const nestedOnlyCodexConfigPath = resolveRunnerMcpConfigPath(nestedOnlyCodexRequest, nestedOnlyCodexValidation);
    const nestedOnlyClaudeCommand = buildAgentCommand("claudecode", "prompt.txt", { mcpConfigPath: nestedOnlyClaudeConfigPath });
    const nestedOnlyCursorCommand = buildAgentCommand("cursor", "prompt.txt", { mcpConfigPath: nestedOnlyCursorConfigPath });
    const nestedOnlyCodexCommand = buildAgentCommand("codex", "prompt.txt", { mcpConfigPath: nestedOnlyCodexConfigPath });
    const decodePromptRunnerArgs = (command: string) => {
      const encoded = command.trim().split(/\s+/).pop() || "";
      try { return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8")); } catch { return []; }
    };
    const nestedOnlyCursorArgs = decodePromptRunnerArgs(nestedOnlyCursorCommand);
    return {
      pass: ready.ok === true
        && missingSnapshot.ok === false
        && blockedGate.ok === false
        && scopeMismatch.ok === false
        && nonEmptyScopeMatch.ok === true
        && nonEmptyScopeDrift.ok === false
        && persistedScopeFallback.ok === true
        && forgedPayloadScope.ok === false
        && nestedOnlyClaudeValidation.ok === true
        && nestedOnlyCursorValidation.ok === true
        && nestedOnlyCodexValidation.ok === true
        && mismatchedRuntimeValidation.ok === false
        && nestedOnlyClaudeConfigPath === claudeLaunch.configPath
        && nestedOnlyCursorConfigPath === cursorLaunch.configPath
        && nestedOnlyCodexConfigPath === codexLaunch.configPath
        && nestedOnlyClaudeCommand.includes("--mcp-config")
        && nestedOnlyClaudeCommand.includes(claudeLaunch.configPath)
        && nestedOnlyCursorCommand.includes("cli-prompt-runner.js")
        && nestedOnlyCursorArgs.includes("--plugin-dir")
        && nestedOnlyCursorArgs.includes(cursorPluginDir)
        && nestedOnlyCodexCommand.includes("CODEX_HOME")
        && nestedOnlyCodexCommand.includes(codexHomePath),
      checks: {
        runnerGateAcceptsFreshSnapshot: ready.ok === true,
        runnerGateBlocksMissingSnapshot: missingSnapshot.ok === false,
        runnerGateBlocksDispatchGate: blockedGate.ok === false,
        runnerGateBlocksScopeDrift: scopeMismatch.ok === false,
        runnerGateAcceptsMatchingNonEmptyScope: nonEmptyScopeMatch.ok === true
          && nonEmptyScopeMatch.runtimeToolScope?.current?.mcp?.includes("payments/createInvoice")
          && nonEmptyScopeMatch.runtimeToolScope?.current?.skill?.includes("release-notes"),
        runnerGateBlocksChangedMcpSkillScope: nonEmptyScopeDrift.ok === false
          && nonEmptyScopeDrift.runtimeToolScope?.requested?.mcp?.includes("payments/createInvoice")
          && nonEmptyScopeDrift.runtimeToolScope?.current?.mcp?.includes("payments/refundInvoice")
          && nonEmptyScopeDrift.runtimeToolScope?.requested?.skill?.includes("release-notes")
          && nonEmptyScopeDrift.runtimeToolScope?.current?.skill?.includes("security-audit"),
        runnerGateReportsAuthorizationScopeBlocker: nonEmptyScopeDrift.runtimeToolDispatchGate?.blockers?.some((item: any) => item.id === "authorization_scope") === true,
        runnerFallsBackToPersistedSnapshotScope: persistedScopeFallback.ok === true
          && persistedScopeFallback.runtimeToolScope?.current?.mcp?.includes("payments/createInvoice")
          && persistedScopeFallback.runtimeToolSnapshot?.requested?.mcp?.includes("payments/createInvoice")
          && persistedScopeFallback.runtimeToolSnapshot?.requested?.skill?.includes("release-notes"),
        runnerBlocksPayloadScopeForgery: forgedPayloadScope.ok === false
          && forgedPayloadScope.runtimeToolDispatchGate?.blockers?.some((item: any) => item.id === "snapshot_requested_tools") === true,
        runnerUsesSnapshotMcpConfigWhenTopLevelMissing: nestedOnlyClaudeValidation.ok === true
          && nestedOnlyCursorValidation.ok === true
          && nestedOnlyCodexValidation.ok === true
          && nestedOnlyClaudeConfigPath === claudeLaunch.configPath
          && nestedOnlyCursorConfigPath === cursorLaunch.configPath
          && nestedOnlyCodexConfigPath === codexLaunch.configPath,
        runnerLaunchesClaudeWithSnapshotMcpConfig: nestedOnlyClaudeCommand.includes("--mcp-config")
          && nestedOnlyClaudeCommand.includes(claudeLaunch.configPath),
        runnerLaunchesCursorWithSnapshotPluginDir: nestedOnlyCursorCommand.includes("cli-prompt-runner.js")
          && nestedOnlyCursorArgs.includes("--plugin-dir")
          && nestedOnlyCursorArgs.includes(cursorPluginDir),
        runnerLaunchesCodexWithSnapshotIsolatedHome: nestedOnlyCodexCommand.includes("CODEX_HOME")
          && nestedOnlyCodexCommand.includes(codexHomePath),
        runnerGateBlocksRuntimeSnapshotMismatch: mismatchedRuntimeValidation.ok === false
          && mismatchedRuntimeValidation.runtimeToolDispatchGate?.blockers?.some((item: any) => item.id === "payload_runtime" || item.id === "snapshot_runtime") === true,
      },
    };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

async function runOnce() {
  ensureDirs();
  writeHeartbeat("scanning", "");
  const files = fs.readdirSync(REQUESTS_DIR)
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(REQUESTS_DIR, file))
    .sort();
  let handled = 0;
  for (const file of files) {
    try {
      if (await runRequest(file)) handled++;
    } catch (error: any) {
      console.error(`[agent-runner] ${path.basename(file)} ${error.message}`);
    }
  }
  writeHeartbeat("idle", "");
  return handled;
}

async function main() {
  refreshEnvPath();
  ensureDirs();
  const watch = process.argv.includes("--watch");
  console.log(`[agent-runner] ${watch ? "watching" : "running once"} ${REQUESTS_DIR}`);
  if (!watch) {
    const handled = await runOnce();
    console.log(`[agent-runner] handled ${handled} request(s)`);
    return;
  }
  writeHeartbeat("idle", "");
  while (true) {
    await runOnce();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

if (require.main === module) {
  main().catch(error => {
    writeHeartbeat("failed", error.message || String(error));
    console.error(error);
    process.exitCode = 1;
  });
}
