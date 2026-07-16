#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAgentRunnerSessionLifecycleFence = validateAgentRunnerSessionLifecycleFence;
exports.validateExternalRunnerRuntimeToolGate = validateExternalRunnerRuntimeToolGate;
exports.runAgentRunnerRequestFile = runAgentRunnerRequestFile;
exports.runAgentRunnerSelfTest = runAgentRunnerSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_1 = require("../core/utils");
const runtime_1 = require("./runtime");
const provider_tool_access_evidence_1 = require("./provider-tool-access-evidence");
const native_continuation_1 = require("./native-continuation");
const runtime_tool_sync_1 = require("../tools/runtime-tool-sync");
const db_1 = require("../core/db");
const storage_1 = require("../modules/collaboration/storage");
const execution_kernel_1 = require("./execution-kernel");
const group_session_lifecycle_head_1 = require("../modules/collaboration/group-session-lifecycle-head");
const provider_memory_channel_1 = require("./provider-memory-channel");
const memory_context_consumption_receipt_1 = require("../integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("../integrations/memory-context-consumption-recovery");
const AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
const REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
const HEARTBEAT_FILE = path.join(AGENT_RUNNER_DIR, "heartbeat.json");
function ensureDirs() {
    for (const dir of [AGENT_RUNNER_DIR, REQUESTS_DIR, RESULTS_DIR, utils_1.UPLOAD_DIR]) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
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
function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJsonAtomic(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, file);
}
function markRequest(file, patch) {
    const request = readJson(file);
    writeJsonAtomic(file, { ...request, ...patch, updated_at: new Date().toISOString() });
}
function validateAgentRunnerSessionLifecycleFence(request = {}) {
    const groupSessionId = String(request.groupSessionId || request.group_session_id || "").trim();
    const supplied = request.sessionLifecycleFence || request.session_lifecycle_fence || null;
    return (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleRuntimeFence)({
        ...(supplied || {}),
        required: supplied?.required === true || groupSessionId.startsWith("gcs_"),
        groupId: supplied?.groupId || supplied?.group_id || request.groupId || request.group_id || "",
        groupSessionId: supplied?.groupSessionId || supplied?.group_session_id || groupSessionId,
    });
}
function writeSessionLifecycleBlockedResult(file, resultFile, request, validation, executionId = "") {
    const reason = `群聊会话生命周期围栏失效：${validation.issues.join(", ") || validation.status || "unknown"}`;
    writeJsonAtomic(resultFile, {
        id: request.id,
        success: false,
        cancelled: true,
        sessionLifecycleStale: true,
        session_lifecycle_stale: true,
        sessionLifecycleValidation: validation,
        error: reason,
        completed_at: new Date().toISOString(),
    });
    markRequest(file, {
        status: "cancelled",
        session_lifecycle_stale: true,
        session_lifecycle_validation: validation,
        completed_at: new Date().toISOString(),
        error: reason,
    });
    if (executionId)
        (0, execution_kernel_1.transitionExecution)(executionId, "cancelled", reason, {
            cancellation: { reason, actor: "group-session-lifecycle-runner", requestedAt: new Date().toISOString() },
            session_lifecycle_validation: validation,
            status: "warning",
        });
}
function normalizeVerificationCommands(value) {
    const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
    const seen = new Set();
    const commands = [];
    for (const item of raw) {
        const command = String(item || "").trim();
        if (!command || seen.has(command))
            continue;
        seen.add(command);
        commands.push(command);
    }
    return commands.slice(0, 8);
}
function getProjectVerificationCommands(projectName) {
    if (!projectName)
        return [];
    const configFile = path.join(utils_1.CCM_DIR, "project-configs.json");
    if (!fs.existsSync(configFile))
        return [];
    try {
        const configs = readJson(configFile);
        const config = configs?.[projectName] || {};
        return normalizeVerificationCommands(config.verification_commands
            || config.verificationCommands
            || config.test_commands
            || config.testCommands
            || config.check_commands
            || config.checkCommands);
    }
    catch {
        return [];
    }
}
function isAgentProbeRequest(request) {
    return /CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(String(request?.message || ""));
}
function normalizeToolSelection(tools = {}) {
    return {
        mcp: Array.isArray(tools?.mcp) ? tools.mcp.map((item) => String(item || "").trim()).filter(Boolean).sort() : [],
        skill: Array.isArray(tools?.skill) ? tools.skill.map((item) => String(item || "").trim()).filter(Boolean).sort() : [],
    };
}
function mergeToolSelections(...items) {
    const merged = { mcp: new Set(), skill: new Set() };
    for (const item of items) {
        const normalized = normalizeToolSelection(item);
        for (const name of normalized.mcp)
            merged.mcp.add(name);
        for (const name of normalized.skill)
            merged.skill.add(name);
    }
    return normalizeToolSelection({ mcp: Array.from(merged.mcp), skill: Array.from(merged.skill) });
}
function hasToolSelection(tools) {
    const normalized = normalizeToolSelection(tools);
    return normalized.mcp.length > 0 || normalized.skill.length > 0;
}
function sameToolSelection(left, right) {
    const a = normalizeToolSelection(left);
    const b = normalizeToolSelection(right);
    return JSON.stringify(a) === JSON.stringify(b);
}
function normalizeGate(gate) {
    if (!gate || typeof gate !== "object")
        return null;
    return {
        ...gate,
        dispatchReady: gate.dispatchReady !== undefined ? gate.dispatchReady : gate.dispatch_ready,
        reason: String(gate.reason || gate.message || ""),
    };
}
function buildRunnerRuntimeToolGate(reason, blockers = [], sourceGate = null) {
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
function readJsonSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
    }
    catch {
        return null;
    }
}
function normalizeRuntimeToolSnapshot(request) {
    const raw = request?.runtimeToolSnapshot || request?.runtime_tool_snapshot || {};
    const allowedTools = normalizeToolSelection(raw.allowedTools || raw.allowed_tools || request?.allowedTools || request?.allowed_tools || {});
    const dispatchGate = normalizeGate(raw.dispatchGate || raw.dispatch_gate || request?.runtimeToolDispatchGate || request?.runtime_tool_dispatch_gate);
    const rawRuntime = String(raw.runtime || raw.agentType || raw.agent_type || raw.runtimeId || raw.runtime_id || "").trim();
    const requestRuntime = (0, runtime_1.normalizeAgentRuntimeId)(request?.agentType || request?.agent_type || "claudecode");
    return {
        ...raw,
        runtime: (0, runtime_1.normalizeAgentRuntimeId)(rawRuntime || requestRuntime),
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
function runtimeToolPayloadRequested(request, snapshot) {
    return request?.runtimeToolSnapshotRequired === true
        || !!snapshot?.snapshotPath
        || !!snapshot?.mcpConfigPath
        || !!request?.mcpConfigPath
        || hasToolSelection(snapshot?.allowedTools || request?.allowedTools);
}
function resolveRunnerMcpConfigPath(request, validation = null) {
    return String(validation?.runtimeToolSnapshot?.mcpConfigPath
        || validation?.runtimeToolSnapshot?.mcp_config_path
        || request?.mcpConfigPath
        || request?.mcp_config_path
        || "").trim();
}
function groupIdFromRequest(request) {
    const scope = request?.toolScope || request?.tool_scope || {};
    return String(request?.groupId || request?.group_id || scope.groupId || scope.group_id || "").trim();
}
function readCurrentToolScope(request) {
    const projectName = String(request?.projectName || "").trim();
    const groupId = groupIdFromRequest(request);
    if (!projectName) {
        return { ok: false, reason: "外部 Runner 请求缺少 projectName，无法复验 MCP/Skill 授权范围" };
    }
    const configs = (0, db_1.loadProjectConfigs)();
    const projectTools = normalizeToolSelection(configs?.[projectName]?.tools || {});
    if (!groupId) {
        return { ok: true, tools: projectTools, scope: { scope: "project", projectName } };
    }
    const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === groupId);
    if (!group) {
        return { ok: false, reason: `群聊 ${groupId} 不存在或已删除，拒绝使用旧 MCP/Skill 快照` };
    }
    return {
        ok: true,
        tools: mergeToolSelections(group.tools || {}, projectTools),
        scope: { scope: "group-project", groupId, projectName },
    };
}
function validateRunnerToolScope(request, requestedTools, options = {}) {
    if (options.skipScopeValidation === true)
        return { ok: true, skipped: true };
    const current = typeof options.loadCurrentToolScope === "function"
        ? options.loadCurrentToolScope(request)
        : readCurrentToolScope(request);
    if (!current?.ok)
        return { ok: false, reason: current?.reason || "无法读取当前 MCP/Skill 授权范围", current };
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
function validateExternalRunnerRuntimeToolGate(request, options = {}) {
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
    const requestRuntime = (0, runtime_1.normalizeAgentRuntimeId)(request?.agentType || request?.agent_type || "claudecode");
    const payloadRuntime = (0, runtime_1.normalizeAgentRuntimeId)(snapshot.runtime || requestRuntime);
    const persistedRuntimeRaw = String(persistedSnapshot.runtime || persistedSnapshot.agentType || persistedSnapshot.agent_type || "").trim();
    const persistedRuntime = persistedRuntimeRaw ? (0, runtime_1.normalizeAgentRuntimeId)(persistedRuntimeRaw) : "";
    const runtimeBlockers = [];
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
    const readiness = options.skipReadinessProbe === true ? null : (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, {
        deep: false,
        catalog: options.catalog,
        catalogRevision: options.catalogRevision,
    });
    if (readiness && readiness.deliveryReady !== true) {
        const failedChecks = (readiness.checks || [])
            .filter((check) => check && check.ok === false && check.id !== "cli_start")
            .map((check) => ({ id: check.id, detail: check.detail }));
        const reason = failedChecks.length
            ? `外部 Runner 运行时工具快照复验失败：${failedChecks.map((check) => `${check.id}: ${check.detail}`).join("；")}`
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
function writeRuntimeToolGateBlockedResult(file, resultFile, request, validation, executionId = "") {
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
    if (executionId)
        (0, execution_kernel_1.transitionExecution)(executionId, "failed", reason, {
            runtime_tool_dispatch_gate: gate,
            runtime_tool_readiness: validation?.runtimeToolReadiness || null,
            runtime_tool_scope: validation?.runtimeToolScope || null,
        });
}
function buildCliAllowedTools(request) {
    if (isAgentProbeRequest(request))
        return [];
    const explicit = Array.isArray(request.cliAllowedTools)
        ? request.cliAllowedTools.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const rules = explicit.length ? explicit : getProjectVerificationCommands(String(request.projectName || "")).flatMap(command => {
        const rule = `Bash(${command})`;
        return process.platform === "win32" ? [rule, `PowerShell(${command})`] : [rule];
    });
    return Array.from(new Set(rules));
}
async function runProjectVerificationCommands(projectName, workDir, timeoutMs, request) {
    const commands = getProjectVerificationCommands(projectName).filter(execution_kernel_1.isSafeVerificationCommand);
    const results = [];
    const verification = [];
    const failed = [];
    if (!commands.length || !workDir) {
        return { ccm_runner_verification: true, status: "skipped", verification, failed, results };
    }
    const perCommandTimeout = Math.max(30000, Math.min(timeoutMs || 300000, 180000));
    for (const command of commands) {
        try {
            const managed = await (0, execution_kernel_1.runManagedCommand)({
                taskId: String(request.taskId || request.id),
                executionId: String(request.executionId || ""),
                command,
                cwd: workDir,
                timeoutMs: perCommandTimeout,
                maxOutputBytes: 5 * 1024 * 1024,
                env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(request.agentType || "claudecode"), request.envAllowlist || []),
            });
            const item = { command, exitCode: 0, status: "passed", output: String(managed.stdout || "").slice(-4000) };
            results.push(item);
            verification.push(`${command} passed by external runner (exit 0)`);
        }
        catch (error) {
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
function appendRunnerVerificationOutput(output, runnerVerification) {
    if (!runnerVerification || runnerVerification.status === "skipped")
        return output;
    return `${output || ""}\n\nCCM_RUNNER_VERIFICATION\n` + "```json\n" + JSON.stringify(runnerVerification, null, 2) + "\n```";
}
async function runRequest(file) {
    const request = readJson(file);
    if (!request?.id || ["done", "running", "failed", "cancelled", "expired"].includes(request.status))
        return false;
    const createdAt = Date.parse(String(request.created_at || request.createdAt || ""));
    const requestAgeMs = Number.isFinite(createdAt) ? Date.now() - createdAt : 0;
    const staleAfterMs = Math.max(10 * 60 * 1000, Number(request.timeoutMs || 300000) + 60 * 1000);
    if (request.status === "pending" && requestAgeMs > staleAfterMs) {
        markRequest(file, { status: "expired", completed_at: new Date().toISOString(), error: "外部 Runner 请求已超过调用方等待窗口，安全跳过，避免恢复历史任务" });
        return true;
    }
    const resultFile = path.join(RESULTS_DIR, `${request.id}.json`);
    if (fs.existsSync(resultFile))
        return false;
    const taskId = String(request.taskId || request.id);
    const executionId = String(request.executionId || "");
    const initialSessionLifecycleValidation = validateAgentRunnerSessionLifecycleFence(request);
    if (!initialSessionLifecycleValidation.valid) {
        writeHeartbeat("blocked", "session lifecycle fence blocked");
        writeSessionLifecycleBlockedResult(file, resultFile, request, initialSessionLifecycleValidation, executionId);
        writeHeartbeat("idle", "");
        return true;
    }
    const runtimeToolValidation = validateExternalRunnerRuntimeToolGate(request);
    if (!runtimeToolValidation.ok) {
        writeHeartbeat("blocked", runtimeToolValidation.reason || "runtime tool gate blocked");
        writeRuntimeToolGateBlockedResult(file, resultFile, request, runtimeToolValidation, executionId);
        writeHeartbeat("idle", "");
        return true;
    }
    if (request.status === "cancel_requested" || (0, execution_kernel_1.isTaskCancellationRequested)(taskId)) {
        writeJsonAtomic(resultFile, { id: request.id, success: false, cancelled: true, error: request.cancel_reason || "任务已取消", completed_at: new Date().toISOString() });
        markRequest(file, { status: "cancelled", completed_at: new Date().toISOString() });
        if (executionId)
            (0, execution_kernel_1.transitionExecution)(executionId, "cancelled", request.cancel_reason || "任务已取消");
        return true;
    }
    markRequest(file, { status: "running", runner_pid: process.pid, started_at: new Date().toISOString() });
    writeHeartbeat("running", `${request.projectName || "agent"} ${request.id}`);
    const msgFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.txt`);
    const memorySystemPromptFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.memory-system.txt`);
    const memoryDeveloperInstructionsFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.memory-developer.txt`);
    const memoryReceiptRecoveryPromptFile = path.join(utils_1.UPLOAD_DIR, `_runner_${request.id}.memory-receipt-recovery.txt`);
    const workDir = request.workDir || process.cwd();
    const agentType = (0, runtime_1.normalizeAgentRuntimeId)(request.agentType || "claudecode");
    const command = (0, runtime_1.getAgentCommandLabel)(agentType);
    const timeoutMs = Number(request.timeoutMs || 300000);
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const cliAllowedTools = buildCliAllowedTools(request);
    const effectiveMcpConfigPath = resolveRunnerMcpConfigPath(request, runtimeToolValidation);
    const runtimeVersionSnapshot = (0, runtime_1.captureAgentRuntimeVersionSnapshot)(agentType);
    let providerMemoryChannelEvidence = null;
    let memoryContextConsumptionReceipt = null;
    let memoryContextConsumptionRecovery = null;
    let memoryReceiptRecoveryProviderOutput = "";
    let runtimeSessionLifecycleValidation = null;
    const lifecycleMonitor = initialSessionLifecycleValidation.required
        ? setInterval(() => {
            const validation = validateAgentRunnerSessionLifecycleFence(request);
            if (validation.valid || runtimeSessionLifecycleValidation)
                return;
            runtimeSessionLifecycleValidation = validation;
            const reason = `群聊会话生命周期已变化：${validation.issues.join(", ") || validation.status || "unknown"}`;
            try {
                (0, execution_kernel_1.requestTaskCancellation)(taskId, reason, "group-session-lifecycle-runner");
            }
            catch { }
        }, 100)
        : null;
    try {
        const providerMemoryChannel = (0, provider_memory_channel_1.prepareProviderMemoryChannel)(agentType, String(request.message || ""), {
            required: request.trustedMemoryProviderChannelRequired === true,
            envelopeChecksum: request.trustedMemoryEnvelopeChecksum || "",
            sourceChecksum: request.trustedMemoryEnvelopeSourceChecksum || "",
            runtimeVersionSnapshot,
        });
        if (!providerMemoryChannel.ready) {
            const error = new Error(`Provider memory channel blocked: ${providerMemoryChannel.issues.join(",")}`);
            error.code = "CCM_PROVIDER_MEMORY_CHANNEL_BLOCKED";
            throw error;
        }
        fs.writeFileSync(msgFile, providerMemoryChannel.userPrompt, "utf-8");
        if (providerMemoryChannel.systemPrompt)
            fs.writeFileSync(memorySystemPromptFile, providerMemoryChannel.systemPrompt, "utf-8");
        if (providerMemoryChannel.developerPrompt)
            fs.writeFileSync(memoryDeveloperInstructionsFile, providerMemoryChannel.developerPrompt, "utf-8");
        const providerCommand = (0, runtime_1.buildAgentCommand)(agentType, msgFile, {
            cliAllowedTools,
            mcpConfigPath: effectiveMcpConfigPath,
            appendSystemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
            developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
            ...(request.agentSession || {}),
        });
        providerMemoryChannelEvidence = (0, provider_memory_channel_1.bindProviderMemoryChannelLaunch)(providerMemoryChannel, {
            command: providerCommand,
            systemPromptFile: providerMemoryChannel.systemPrompt ? memorySystemPromptFile : "",
            developerInstructionsFile: providerMemoryChannel.developerPrompt ? memoryDeveloperInstructionsFile : "",
            runnerRequestId: request.id,
            runtimeVersionSnapshot,
        });
        if (request.trustedMemoryProviderChannelRequired === true && providerMemoryChannelEvidence.status !== "ready") {
            const error = new Error(`Provider memory channel launch unverified: ${providerMemoryChannelEvidence.issues.join(",")}`);
            error.code = "CCM_PROVIDER_MEMORY_CHANNEL_BLOCKED";
            throw error;
        }
        const managed = await (0, execution_kernel_1.runManagedCommand)({
            taskId,
            executionId,
            command: providerCommand,
            cwd: workDir,
            timeoutMs,
            maxOutputBytes: Number(request.maxOutputBytes || 2 * 1024 * 1024),
            env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), request.envAllowlist || []),
        });
        const normalizedOutput = (0, runtime_1.normalizeAgentCommandOutput)(agentType, String(managed.stdout || "").trim(), { runtimeVersionSnapshot });
        const nativeContinuationEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
            provider: agentType,
            runnerRequestId: request.id,
            requestedNativeSessionId: request.agentSession?.sessionId || "",
            returnedNativeSessionId: normalizedOutput.rawSessionId || normalizedOutput.sessionId || "",
            providerOutputContractEvidence: normalizedOutput.providerOutputContractEvidence || null,
            providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
            expectedProviderContractId: request.agentSession?.expectedProviderContractId || request.agentSession?.providerContractId || "",
            nativeResumeRequested: request.agentSession?.resumeSession === true,
            runnerSuccess: true,
        });
        providerMemoryChannelEvidence = (0, provider_memory_channel_1.acknowledgeProviderMemoryChannelLaunch)(providerMemoryChannelEvidence, {
            executionSucceeded: true,
            runnerStarted: true,
            exitCode: managed.exitCode,
            providerOutputContractEvidence: normalizedOutput.providerOutputContractEvidence || null,
            nativeContinuationEvidence,
            required: request.trustedMemoryProviderAcknowledgementRequired === true,
        });
        if (request.trustedMemoryProviderAcknowledgementRequired === true) {
            const acknowledgement = (0, provider_memory_channel_1.verifyProviderMemoryChannelEvidence)(providerMemoryChannelEvidence, {
                provider: agentType,
                originalPrompt: String(request.message || ""),
                envelopeChecksum: request.trustedMemoryEnvelopeChecksum || "",
                sourceChecksum: request.trustedMemoryEnvelopeSourceChecksum || "",
                runnerRequestId: request.id,
                required: true,
                requireAcknowledgement: true,
                providerOutputContractEvidence: normalizedOutput.providerOutputContractEvidence || null,
                nativeContinuationEvidence,
                executionSucceeded: true,
            });
            if (!acknowledgement.valid) {
                const error = new Error(`Provider memory acknowledgement blocked: ${acknowledgement.issues.join(",")}`);
                error.code = "CCM_PROVIDER_MEMORY_ACKNOWLEDGEMENT_BLOCKED";
                throw error;
            }
        }
        if (request.memoryContextConsumptionReceiptRequired === true) {
            let memoryReceipt = (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(request.memoryContextConsumptionChallenge, {
                groupId: request.groupId || "",
                groupSessionId: request.groupSessionId || request.group_session_id || "",
                taskId: request.taskId || "",
                executionId: request.executionId || "",
                project: request.projectName || "",
                taskAgentSessionId: request.taskAgentSessionId || request.task_agent_session_id || "",
            });
            if (!memoryReceipt.valid) {
                const recovery = await (0, memory_context_consumption_recovery_1.recoverMemoryContextConsumptionReceipt)({
                    challenge: request.memoryContextConsumptionChallenge,
                    provider: agentType,
                    runnerRequestId: request.id,
                    groupId: request.groupId || "",
                    groupSessionId: request.groupSessionId || request.group_session_id || "",
                    taskId: request.taskId || "",
                    executionId: request.executionId || "",
                    project: request.projectName || "",
                    taskAgentSessionId: request.taskAgentSessionId || request.task_agent_session_id || "",
                    nativeContinuationEvidence,
                    providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
                    trustedMemoryEnvelopeChecksum: request.trustedMemoryEnvelopeChecksum || "",
                    trustedMemoryEnvelopeSourceChecksum: request.trustedMemoryEnvelopeSourceChecksum || "",
                    providerWorkCompleted: true,
                }, async (recoveryRequest) => {
                    fs.writeFileSync(memoryReceiptRecoveryPromptFile, recoveryRequest.prompt, "utf-8");
                    const recoveryCommand = (0, runtime_1.buildAgentCommand)(agentType, memoryReceiptRecoveryPromptFile, {
                        cliAllowedTools,
                        mcpConfigPath: effectiveMcpConfigPath,
                        persistSession: true,
                        resumeSession: true,
                        sessionId: recoveryRequest.nativeSessionId,
                    });
                    const recoveryRun = await (0, execution_kernel_1.runManagedCommand)({
                        taskId: `${taskId}:memory-receipt-recovery`,
                        command: recoveryCommand,
                        cwd: workDir,
                        timeoutMs: Math.min(60_000, Math.max(15_000, timeoutMs)),
                        maxOutputBytes: 512 * 1024,
                        env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), request.envAllowlist || []),
                    });
                    memoryReceiptRecoveryProviderOutput = String(recoveryRun.stdout || "");
                    const recoveryOutput = (0, runtime_1.normalizeAgentCommandOutput)(agentType, memoryReceiptRecoveryProviderOutput, { runtimeVersionSnapshot });
                    return {
                        success: true,
                        exitCode: recoveryRun.exitCode,
                        output: recoveryOutput.output,
                        nativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
                        returnedNativeSessionId: recoveryOutput.rawSessionId || recoveryOutput.sessionId || "",
                        providerOutputContractEvidence: recoveryOutput.providerOutputContractEvidence || null,
                        providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
                    };
                });
                memoryContextConsumptionRecovery = recovery.record;
                if (!recovery.recovered) {
                    const error = new Error(`Memory context consumption receipt recovery blocked: ${(recovery.record?.issues || memoryReceipt.issues).join(",")}`);
                    error.code = "CCM_MEMORY_CONTEXT_CONSUMPTION_RECEIPT_RECOVERY_BLOCKED";
                    error.memoryContextConsumptionRecovery = recovery.record;
                    throw error;
                }
                memoryReceipt = (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(request.memoryContextConsumptionChallenge, {
                    groupId: request.groupId || "",
                    groupSessionId: request.groupSessionId || request.group_session_id || "",
                    taskId: request.taskId || "",
                    executionId: request.executionId || "",
                    project: request.projectName || "",
                    taskAgentSessionId: request.taskAgentSessionId || request.task_agent_session_id || "",
                });
            }
            memoryContextConsumptionReceipt = memoryReceipt.receipt;
        }
        const providerToolAccessEvidence = (0, provider_tool_access_evidence_1.extractProviderToolAccessEvidence)(agentType, [String(managed.stdout || ""), memoryReceiptRecoveryProviderOutput].filter(Boolean).join("\n"), {
            runnerRequestId: request.id,
            groupId: request.groupId || "",
            groupSessionId: request.groupSessionId || request.group_session_id || "",
            taskId: request.taskId || "",
            executionId: request.executionId || "",
            taskAgentSessionId: request.taskAgentSessionId || request.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
        });
        const nativeModelCapabilityReceipt = (0, runtime_1.extractNativeModelCapabilityReceipt)(agentType, String(managed.stdout || ""), {
            runner: "node",
            runnerRequestId: request.id,
            runnerPid: process.pid,
            groupId: request.groupId || "",
            taskId: request.taskId || "",
            executionId: request.executionId || "",
            taskAgentSessionId: request.taskAgentSessionId || request.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
            requestedNativeSessionId: nativeContinuationEvidence.requestedNativeSessionId,
            returnedNativeSessionId: nativeContinuationEvidence.returnedNativeSessionId,
            effectiveNativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            nativeSessionEvidenceSource: nativeContinuationEvidence.evidenceSource,
            nativeResumeRequested: nativeContinuationEvidence.nativeResumeRequested,
            nativeContinuationAcknowledged: nativeContinuationEvidence.nativeContinuationAcknowledged,
            nativeContinuationEvidence,
            providerToolAccessEvidence,
            providerRuntimeVersionSnapshot: runtimeVersionSnapshot,
            providerOutputContractEvidence: normalizedOutput.providerOutputContractEvidence || null,
            providerContractId: nativeContinuationEvidence.providerContractId || "",
            expectedProviderContractId: nativeContinuationEvidence.expectedProviderContractId || "",
            providerContractTransition: nativeContinuationEvidence.providerContractTransition === true,
        });
        const agentOutput = (0, execution_kernel_1.persistBoundedOutput)(taskId, normalizedOutput.output, Number(request.maxContextOutputBytes || 256 * 1024)).content;
        const runnerVerification = isAgentProbeRequest(request) || request.skipVerification === true
            ? { ccm_runner_verification: true, status: "skipped", verification: [], failed: [], results: [] }
            : await runProjectVerificationCommands(request.projectName || "", workDir, timeoutMs, request);
        const output = appendRunnerVerificationOutput(agentOutput, runnerVerification);
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        const finalSessionLifecycleValidation = validateAgentRunnerSessionLifecycleFence(request);
        if (!finalSessionLifecycleValidation.valid) {
            runtimeSessionLifecycleValidation = finalSessionLifecycleValidation;
            throw Object.assign(new Error(`群聊会话生命周期已变化：${finalSessionLifecycleValidation.issues.join(", ")}`), {
                code: "CCM_SESSION_LIFECYCLE_STALE",
            });
        }
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: true,
            output,
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
            requestedNativeSessionId: nativeContinuationEvidence.requestedNativeSessionId,
            returnedNativeSessionId: nativeContinuationEvidence.returnedNativeSessionId,
            effectiveNativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            nativeSessionEvidenceSource: nativeContinuationEvidence.evidenceSource,
            nativeResumeRequested: nativeContinuationEvidence.nativeResumeRequested,
            nativeContinuationAcknowledged: nativeContinuationEvidence.nativeContinuationAcknowledged,
            nativeContinuationEvidence,
            usage: normalizedOutput.usage || null,
            nativeModelCapabilityReceipt,
            providerMemoryChannelEvidence,
            memoryContextConsumptionReceipt,
            memoryContextConsumptionRecovery,
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
    }
    catch (error) {
        const failure = (0, execution_kernel_1.classifyExecutionFailure)(error);
        const cancelled = failure.failureClass === "cancelled";
        const output = failure.failureClass === "timeout" ? "Agent 响应超时" : failure.message.slice(0, 4000);
        const fileChanges = (0, utils_1.getFileChanges)(request.projectName || "", changeSnapshot);
        writeJsonAtomic(resultFile, {
            id: request.id,
            success: false,
            cancelled,
            sessionLifecycleStale: !!runtimeSessionLifecycleValidation,
            session_lifecycle_stale: !!runtimeSessionLifecycleValidation,
            sessionLifecycleValidation: runtimeSessionLifecycleValidation,
            failure,
            error: output || "Agent Runner 执行失败",
            output,
            fileChanges,
            agentType,
            command: cliAllowedTools.length ? `${command} --allowed-tools ${cliAllowedTools.join(",")}` : command,
            mcpConfigPath: effectiveMcpConfigPath,
            runtimeToolSnapshot: runtimeToolValidation.runtimeToolSnapshot || null,
            providerMemoryChannelEvidence,
            memoryContextConsumptionReceipt,
            memoryContextConsumptionRecovery: error?.memoryContextConsumptionRecovery || memoryContextConsumptionRecovery,
            cliAllowedTools,
            effectiveCliAllowedTools: cliAllowedTools.join(","),
            exitCode: error?.status ?? null,
            runner: "node",
            completed_at: new Date().toISOString(),
        });
        markRequest(file, { status: cancelled ? "cancelled" : "failed", completed_at: new Date().toISOString(), error: output });
        if (executionId)
            (0, execution_kernel_1.transitionExecution)(executionId, cancelled ? "cancelled" : "failed", output, { failure, failureClass: failure.failureClass });
    }
    finally {
        if (lifecycleMonitor)
            clearInterval(lifecycleMonitor);
        try {
            fs.unlinkSync(msgFile);
        }
        catch { }
        try {
            fs.unlinkSync(memorySystemPromptFile);
        }
        catch { }
        try {
            fs.unlinkSync(memoryDeveloperInstructionsFile);
        }
        catch { }
        try {
            fs.unlinkSync(memoryReceiptRecoveryPromptFile);
        }
        catch { }
        writeHeartbeat("idle", "");
    }
    return true;
}
async function runAgentRunnerRequestFile(file) {
    ensureDirs();
    return runRequest(file);
}
function runAgentRunnerSelfTest() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-runner-gate-"));
    try {
        const allowedTools = { mcp: [], skill: [] };
        const catalog = { mcpTools: [], skills: [] };
        const catalogRevision = (0, runtime_tool_sync_1.getRuntimeToolCatalogRevision)(catalog, allowedTools);
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
            catalogRevision: (0, runtime_tool_sync_1.getRuntimeToolCatalogRevision)(catalog, nonEmptyAllowedTools),
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
                catalogRevision: (0, runtime_tool_sync_1.getRuntimeToolCatalogRevision)(catalog, nonEmptyAllowedTools),
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
                catalogRevision: (0, runtime_tool_sync_1.getRuntimeToolCatalogRevision)(catalog, nonEmptyAllowedTools),
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
        const writeLaunchSnapshot = (runtime, rootName, extras = {}) => {
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
        const launchRequest = (runtime, launch, extra = {}) => ({
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
        const nestedOnlyClaudeCommand = (0, runtime_1.buildAgentCommand)("claudecode", "prompt.txt", { mcpConfigPath: nestedOnlyClaudeConfigPath });
        const nestedOnlyCursorCommand = (0, runtime_1.buildAgentCommand)("cursor", "prompt.txt", { mcpConfigPath: nestedOnlyCursorConfigPath });
        const nestedOnlyCodexCommand = (0, runtime_1.buildAgentCommand)("codex", "prompt.txt", { mcpConfigPath: nestedOnlyCodexConfigPath });
        const decodePromptRunnerArgs = (command) => {
            const encoded = command.trim().split(/\s+/).pop() || "";
            try {
                return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
            }
            catch {
                return [];
            }
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
                runnerGateReportsAuthorizationScopeBlocker: nonEmptyScopeDrift.runtimeToolDispatchGate?.blockers?.some((item) => item.id === "authorization_scope") === true,
                runnerFallsBackToPersistedSnapshotScope: persistedScopeFallback.ok === true
                    && persistedScopeFallback.runtimeToolScope?.current?.mcp?.includes("payments/createInvoice")
                    && persistedScopeFallback.runtimeToolSnapshot?.requested?.mcp?.includes("payments/createInvoice")
                    && persistedScopeFallback.runtimeToolSnapshot?.requested?.skill?.includes("release-notes"),
                runnerBlocksPayloadScopeForgery: forgedPayloadScope.ok === false
                    && forgedPayloadScope.runtimeToolDispatchGate?.blockers?.some((item) => item.id === "snapshot_requested_tools") === true,
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
                    && mismatchedRuntimeValidation.runtimeToolDispatchGate?.blockers?.some((item) => item.id === "payload_runtime" || item.id === "snapshot_runtime") === true,
            },
        };
    }
    finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        catch { }
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
            if (await runRequest(file))
                handled++;
        }
        catch (error) {
            console.error(`[agent-runner] ${path.basename(file)} ${error.message}`);
        }
    }
    writeHeartbeat("idle", "");
    return handled;
}
async function main() {
    (0, utils_1.refreshEnvPath)();
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
//# sourceMappingURL=runner.js.map