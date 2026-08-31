"use strict";
// collaboration-runtime-runtime-tools.ts — merged from 2 part files (behavior-freeze merge).
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
exports.runtimeToolDispatchBlockedMessage = runtimeToolDispatchBlockedMessage;
exports.runtimeToolDispatchBlockedReceipt = runtimeToolDispatchBlockedReceipt;
exports.assertRuntimeToolDispatchReady = assertRuntimeToolDispatchReady;
exports.prepareAgentRuntimeTools = prepareAgentRuntimeTools;
exports.getConfiguredProjectVerificationCommands = getConfiguredProjectVerificationCommands;
exports.getAgentRuntimeConsistencyStatus = getAgentRuntimeConsistencyStatus;
exports.getProjectVerificationHintDetail = getProjectVerificationHintDetail;
exports.buildProjectVerificationHints = buildProjectVerificationHints;
exports.compactFormText = compactFormText;
exports.buildTaskContinuationBlock = buildTaskContinuationBlock;
exports.createTask = createTask;
exports.createRequirementEpicWithChildren = createRequirementEpicWithChildren;
exports.updateRequirementEpicFromPlan = updateRequirementEpicFromPlan;
exports.classifyTaskContinuation = classifyTaskContinuation;
exports.looksLikeTaskContinuation = looksLikeTaskContinuation;
exports.getGlobalMissionChildDeliveryEvidence = getGlobalMissionChildDeliveryEvidence;
exports.globalMissionChildGatePassed = globalMissionChildGatePassed;
exports.refreshGlobalMissionParentInTaskList = refreshGlobalMissionParentInTaskList;
exports.getGlobalDirectDispatchMeta = getGlobalDirectDispatchMeta;
exports.getGlobalDirectDispatchContinuationKey = getGlobalDirectDispatchContinuationKey;
exports.shouldNotifyGlobalDirectDispatchContinuation = shouldNotifyGlobalDirectDispatchContinuation;
exports.buildGlobalDirectDispatchContinuationMessage = buildGlobalDirectDispatchContinuationMessage;
exports.shouldNotifyGlobalDirectDispatchCompletion = shouldNotifyGlobalDirectDispatchCompletion;
exports.buildGlobalDirectDispatchCompletionMessage = buildGlobalDirectDispatchCompletionMessage;
exports.shouldNotifyGlobalDirectDispatchRollback = shouldNotifyGlobalDirectDispatchRollback;
exports.buildGlobalDirectDispatchRollbackMessage = buildGlobalDirectDispatchRollbackMessage;
exports.appendGlobalDirectDispatchContinuationToHistory = appendGlobalDirectDispatchContinuationToHistory;
exports.appendGlobalDirectDispatchCompletionToHistory = appendGlobalDirectDispatchCompletionToHistory;
exports.appendGlobalDirectDispatchRollbackToHistory = appendGlobalDirectDispatchRollbackToHistory;
exports.updateTask = updateTask;
exports.normalizeTaskTerminalStateView = normalizeTaskTerminalStateView;
exports.refreshGlobalDevelopmentMissions = refreshGlobalDevelopmentMissions;
exports.getGlobalDevelopmentMission = getGlobalDevelopmentMission;
exports.getMissionDependencyRefs = getMissionDependencyRefs;
exports.missionChildMatchesRef = missionChildMatchesRef;
exports.removeTaskFromQueues = removeTaskFromQueues;
exports.appendGlobalMissionSupervisorTimeline = appendGlobalMissionSupervisorTimeline;
exports.superviseGlobalDevelopmentMissionCycle = superviseGlobalDevelopmentMissionCycle;
exports.controlGlobalDevelopmentMission = controlGlobalDevelopmentMission;
exports.targetProjectForMissionTarget = targetProjectForMissionTarget;
exports.buildGlobalMissionTargetHandoff = buildGlobalMissionTargetHandoff;
exports.buildGlobalGroupTestAgentOwnership = buildGlobalGroupTestAgentOwnership;
exports.normalizeGlobalMissionTargetRequirements = normalizeGlobalMissionTargetRequirements;
exports.createGlobalDevelopmentMission = createGlobalDevelopmentMission;
exports.canCompleteDailyDevFromDeliverySummary = canCompleteDailyDevFromDeliverySummary;
exports.reconcileTaskDeliveryEvidence = reconcileTaskDeliveryEvidence;
exports.validateTaskManualStatusUpdate = validateTaskManualStatusUpdate;
exports.buildTaskGapContinuationDraft = buildTaskGapContinuationDraft;
exports.buildTargetedReworkContinuationDraft = buildTargetedReworkContinuationDraft;
exports.getTaskGapItems = getTaskGapItems;
exports.getTaskGapFingerprint = getTaskGapFingerprint;
exports.isAutomaticGapContinuationSource = isAutomaticGapContinuationSource;
exports.canAutoContinueTaskGaps = canAutoContinueTaskGaps;
exports.reconcileTaskCollaborationState = reconcileTaskCollaborationState;
exports.hasDailyDevContinuationGaps = hasDailyDevContinuationGaps;
exports.taskNeedsUserIntervention = taskNeedsUserIntervention;
exports.getTaskExecutionPhase = getTaskExecutionPhase;
exports.getTaskDashboardActions = getTaskDashboardActions;
exports.buildExecutionDashboard = buildExecutionDashboard;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.continueTaskWithMessage = continueTaskWithMessage;
exports.retryTask = retryTask;
const rework_policy_1 = require("./rework-policy");
const task_replay_plan_1 = require("./task-replay-plan");
const task_recovery_orchestrator_1 = require("../../tasks/task-recovery-orchestrator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const runtime_edit_capability_1 = require("../../agents/runtime-edit-capability");
const collaboration_agent_probes_1 = require("./collaboration-agent-probes");
const memory_1 = require("./memory");
const agent_internal_mcp_1 = require("../../integrations/agent-internal-mcp");
const global_mission_1 = require("./global-mission");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const runtime_1 = require("../../agents/runtime");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const tool_authorization_1 = require("../../tools/tool-authorization");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const memory_2 = require("../../agents/global/memory");
const protocol_gates_1 = require("./protocol-gates");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const work_items_1 = require("../../agents/work-items");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const main_agent_plan_core_1 = require("./main-agent-plan-core");
// ===== merged from collaboration-runtime-runtime-tools-part-01.ts =====
function mergeRuntimeToolManagerAudit(audit, toolAudit) {
    if (!audit || !toolAudit)
        return audit;
    const rows = Array.isArray(toolAudit.mcp) ? toolAudit.mcp : [];
    for (const row of rows) {
        if (row.state !== "missing_tool")
            continue;
        const serverName = `ccm__${String(row.server || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "tool"}`;
        const existing = (audit.mcp_statuses || []).find((item) => item.name === row.server);
        if (existing) {
            existing.state = "missing_tool";
            existing.availableTools = row.availableTools || existing.availableTools || [];
            existing.missingTools = row.missingTools || [];
            existing.error = `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`;
        }
        else {
            audit.mcp_statuses = audit.mcp_statuses || [];
            audit.mcp_statuses.push({
                name: row.server,
                serverName,
                state: "missing_tool",
                grants: [row.raw],
                tools: row.tool ? [row.tool] : [],
                availableTools: row.availableTools || [],
                missingTools: row.missingTools || [],
                error: `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`,
            });
        }
        audit.warnings = audit.warnings || [];
        audit.warnings.push(`MCP ${row.server} 缺少授权工具：${(row.missingTools || []).join(", ")}`);
    }
    for (const row of rows.filter((item) => ["failed", "disconnected", "missing_server"].includes(String(item.state || "")))) {
        const existing = (audit.mcp_statuses || []).find((item) => item.name === row.server);
        if (existing && existing.state === "synced") {
            existing.state = "config_error";
            existing.error = row.serverStatus?.error || `MCP server 当前状态：${row.state}`;
        }
    }
    return audit;
}
function getRuntimeAuthorizationReadiness(allowedTools, options = {}) {
    if (options.authorizationReadiness?.schema === "ccm-tool-authorization-readiness-v1")
        return options.authorizationReadiness;
    if (options.toolAudit)
        return (0, tool_authorization_1.buildAuthorizationReadiness)(options.toolAudit, (0, tool_authorization_1.normalizeToolAuthorization)(allowedTools));
    return (0, tool_authorization_1.buildToolAuthorizationPayload)(allowedTools).authorization_readiness;
}
function summarizeRuntimeAuthorizationReadiness(readiness) {
    if (!readiness || readiness.dispatchReady !== false)
        return "";
    const missing = readiness.missing || {};
    const parts = [];
    if (missing.missing_mcp_servers)
        parts.push(`MCP server ${missing.missing_mcp_servers}`);
    if (missing.missing_mcp_tools)
        parts.push(`MCP tool ${missing.missing_mcp_tools}`);
    if (missing.missing_skills)
        parts.push(`Skill ${missing.missing_skills}`);
    if (readiness.invalid_mcp_grants)
        parts.push(`无效 MCP 授权 ${readiness.invalid_mcp_grants}`);
    return parts.length ? parts.join("、") : "存在不可用授权项";
}
function runtimeToolDispatchBlockedMessage(projectName, runtimeToolContext = {}) {
    const gate = runtimeToolContext.dispatchGate || runtimeToolContext.audit?.dispatch_gate || {};
    return `${projectName} MCP/Skill 授权未就绪，已阻止派发子 Agent：${gate.reason || "存在不可用授权项"}`;
}
function runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext = {}) {
    return require("./collaboration-acceptance").runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext);
}
function assertRuntimeToolDispatchReady(projectName, runtimeToolContext = {}) {
    if (runtimeToolContext.dispatchBlocked || runtimeToolContext.dispatchGate?.dispatchReady === false) {
        throw new Error(runtimeToolDispatchBlockedMessage(projectName, runtimeToolContext));
    }
}
function prepareAgentRuntimeTools(groupId, projectName, workDir, agentType, allowedTools, streamRes = null, options = {}) {
    const authorizationReadiness = getRuntimeAuthorizationReadiness(allowedTools, options);
    const sourceTask = options.task || (0, collaboration_runtime_task_queue_1.getTaskById)(options.taskId || "");
    const group = groupId ? (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(groupId)) || null : null;
    const coordinatorProject = group ? String((0, group_orchestrator_1.getCoordinatorMember)(group)?.project || group?.orchestrator?.coordinatorProject || "") : "";
    const internalAgentRole = options.internalAgentRole
        || (projectName && coordinatorProject && projectName === coordinatorProject ? "group-main-agent" : "project-child-agent");
    const internalProjects = group
        ? (group.members || []).filter((member) => member?.project && member.project !== coordinatorProject).map((member) => {
            const project = String(member.project);
            const extra = (0, collaboration_runtime_plan_tools_1.getProjectExtraConfig)(project);
            return {
                name: project,
                workDir: (0, collaboration_runtime_task_queue_1.configuredProjectWorkDir)(project),
                verificationCommands: Array.isArray(extra?.verification_commands) ? extra.verification_commands : [],
                targetUrl: String(extra?.target_url || extra?.targetUrl || ""),
            };
        }).filter((project) => project.workDir)
        : [];
    const runtimeEditCapability = (0, runtime_edit_capability_1.resolveRuntimeEditCapability)({
        runtimeDeclared: (0, runtime_1.getAgentRuntime)(agentType).capabilities.nativeWorkspaceEditing,
        probe: (0, collaboration_agent_probes_1.readAgentProbeStatus)({ groupId, project: projectName, agentType }),
    });
    const taskBoundInternalMcpServers = !options.disableTaskBoundInternalMcp && sourceTask?.id && workDir
        ? (0, agent_internal_mcp_1.buildTaskBoundInternalMcpServers)({
            taskId: String(sourceTask.id),
            groupId: String(groupId || sourceTask.group_id || ""),
            groupSessionId: String(options.groupSessionId || sourceTask.group_session_id || sourceTask.groupSessionId || ""),
            projectSessionId: String(options.projectSessionId || sourceTask.project_session_id || sourceTask.projectSessionId || ""),
            project: projectName,
            role: internalAgentRole,
            agentType,
            taskAgentSessionId: String(options.taskAgentSessionId || ""),
            nativeSessionId: String(options.nativeSessionId || ""),
            workDir,
            baseWorkDir: (0, collaboration_runtime_task_queue_1.configuredProjectWorkDir)(projectName) || workDir,
            projects: internalProjects,
            memoryReceiptChallenge: options.memoryReceiptChallenge || null,
            memoryReceiptFile: options.memoryReceiptFile || "",
            memorySnapshotId: options.memorySnapshotId || "",
            memorySnapshotChecksum: options.memorySnapshotChecksum || "",
            boundaryGeneration: Number(options.boundaryGeneration || 0),
            nativeGeneration: Number(options.nativeGeneration || 0),
            communicationMessageId: String(options.communicationMessageId || ""),
            communicationGeneration: Number(options.communicationGeneration || 0),
            communicationAttempt: Number(options.communicationAttempt || 0),
            communicationLeaseId: String(options.communicationLeaseId || ""),
            anchorMessageId: String(options.anchorMessageId || ""),
            originMessageId: String(options.originMessageId || ""),
            requestText: options.requestText || "",
            memoryReadBudgetTokens: Number(options.memoryReadBudgetTokens || 0),
            nativeWorkspaceEditing: runtimeEditCapability.nativeWorkspaceEditing,
        })
        : {};
    const audit = (0, runtime_tool_sync_1.syncRuntimeTools)(workDir, agentType, allowedTools, {
        authorizationReadiness,
        internalMcpServers: { ...taskBoundInternalMcpServers, ...(options.internalMcpServers || {}) },
    });
    audit.authorization_readiness = authorizationReadiness;
    audit.workspace_edit_capability = runtimeEditCapability;
    mergeRuntimeToolManagerAudit(audit, options.toolAudit);
    audit.dispatch_gate = (0, runtime_tool_sync_1.buildRuntimeToolDispatchGate)(audit);
    const dispatchBlocked = audit.dispatch_gate.dispatchReady === false;
    const authorizationBlocked = authorizationReadiness?.dispatchReady === false;
    const level = audit.mode === "failed" || audit.missing.mcp.length || audit.missing.skill.length || dispatchBlocked ? "warning" : "info";
    const missingNames = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
    const missingSuffix = missingNames.length ? `；未找到或未启用：${missingNames.join("、")}` : "";
    const authorizationSuffix = authorizationBlocked ? `；授权需处理缺失项：${summarizeRuntimeAuthorizationReadiness(authorizationReadiness)}` : "";
    const warningSuffix = audit.warnings?.length ? `；${audit.warnings.join("；")}` : "";
    const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
    const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item) => item.state === "synced").length : audit.synced.mcp.length;
    const proxyMcpCount = mcpStatuses.filter((item) => item.state === "proxy_only").length;
    const summary = audit.mode === "native-and-proxy"
        ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${missingSuffix}${authorizationSuffix}${warningSuffix}`
        : audit.mode === "ccm-proxy-only"
            ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式${authorizationSuffix}`
            : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`;
    const traceId = options.traceId || sourceTask?.trace_id || "";
    if (traceId) {
        (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
            scope: "worker",
            traceId,
            taskId: sourceTask?.id || options.taskId || "",
            groupId,
            agent: projectName,
            action: "runtime_tool_sync",
            phase: "prepare",
            risk: "read",
            target: projectName,
            status: audit.mode === "failed" ? "error" : (dispatchBlocked ? "blocked" : "ok"),
            message: summary,
            data: { runtime_tool_sync: (0, collaboration_runtime_task_queue_1.compactRuntimeToolAudit)(audit), snapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(audit, allowedTools) },
        });
    }
    (0, runtime_tool_sync_1.recordRuntimeToolSyncAudit)(audit, projectName, groupId);
    if (groupId)
        (0, logs_1.safeAddGroupLog)(groupId, level, "runtime-tool-sync", summary, audit);
    const workEvent = {
        id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
        time: new Date().toISOString(),
        agent: projectName,
        kind: audit.mode === "failed" || dispatchBlocked ? "error" : "tool",
        text: summary,
        runtimeToolSync: audit,
    };
    if (streamRes) {
        (0, collaboration_runtime_daily_dev_1.writeSse)(streamRes, { type: "agent_work_event", agent: projectName, event: workEvent });
        if (audit.mode === "failed" || dispatchBlocked)
            (0, collaboration_runtime_daily_dev_1.writeSse)(streamRes, { type: "status", text: `工具同步提示：${summary}` });
    }
    return { audit, workEvent, prompt: (0, runtime_tool_sync_1.buildRuntimeToolSyncPrompt)(audit), dispatchGate: audit.dispatch_gate, dispatchBlocked };
}
function normalizeVerificationCommands(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map(item => item.trim()).filter(Boolean);
}
function readPackageJsonScripts(workDir) {
    try {
        const file = path.join(workDir, "package.json");
        if (!fs.existsSync(file))
            return {};
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
    }
    catch {
        return {};
    }
}
function getConfiguredProjectVerificationCommands(projectName) {
    const projectConfig = (0, collaboration_runtime_plan_tools_1.getProjectExtraConfig)(projectName);
    return normalizeVerificationCommands(projectConfig.verification_commands
        || projectConfig.verificationCommands
        || projectConfig.test_commands
        || projectConfig.testCommands
        || projectConfig.check_commands
        || projectConfig.checkCommands);
}
function inferProjectVerificationCommands(workDir = "") {
    const dir = String(workDir || "").trim();
    if (!dir || !fs.existsSync(dir))
        return [];
    const hints = [];
    const scripts = readPackageJsonScripts(dir);
    const scriptNames = Object.keys(scripts);
    const addNpmScript = (name) => {
        if (scriptNames.includes(name))
            hints.push(`npm run ${name}`);
    };
    addNpmScript("check");
    addNpmScript("typecheck");
    addNpmScript("lint");
    addNpmScript("test");
    addNpmScript("build");
    if (fs.existsSync(path.join(dir, "pom.xml")))
        hints.push("mvn test");
    if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts")))
        hints.push("gradle test");
    if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml")))
        hints.push("pytest");
    if (fs.existsSync(path.join(dir, "go.mod")))
        hints.push("go test ./...");
    if (fs.existsSync(path.join(dir, "Cargo.toml")))
        hints.push("cargo test");
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)(hints).slice(0, 6);
}
function getAgentRuntimeConsistencyStatus() {
    const runtimes = (0, runtime_1.getPublicAgentRuntimes)();
    const runtimeKeys = new Set();
    for (const runtime of runtimes) {
        runtimeKeys.add(String(runtime.id || "").toLowerCase());
        for (const alias of runtime.aliases || [])
            runtimeKeys.add(String(alias || "").toLowerCase());
    }
    const agents = (db_1.AGENTS || []).map((agent) => ({
        type: String(agent.type || "").trim(),
        name: String(agent.name || agent.type || "").trim(),
    })).filter((agent) => agent.type);
    const missing = agents.filter((agent) => !runtimeKeys.has(agent.type.toLowerCase()));
    return {
        pass: missing.length === 0 && agents.length > 0,
        agents,
        runtimes: runtimes.map((runtime) => ({ id: runtime.id, aliases: runtime.aliases, commandLabel: runtime.commandLabel })),
        missing,
    };
}
function getProjectVerificationHintDetail(projectName, workDir = "") {
    const configured = getConfiguredProjectVerificationCommands(projectName);
    if (configured.length > 0) {
        return { source: "configured", commands: configured.slice(0, 6) };
    }
    const inferred = inferProjectVerificationCommands(workDir);
    return {
        source: inferred.length > 0 ? "inferred" : "missing",
        commands: inferred,
    };
}
function buildProjectVerificationHints(projectName, workDir = "") {
    return getProjectVerificationHintDetail(projectName, workDir).commands;
}
function compactFormText(value, fallback = "未填写") {
    const text = String(value || "").replace(/\r\n/g, "\n").trim();
    return text || fallback;
}
function buildTaskContinuationBlock(message) {
    return [
        "",
        "---",
        "",
        `用户补充说明（${new Date().toISOString()}）：`,
        compactFormText(message),
        "",
        "继续执行要求：",
        "- 主 Agent 必须结合原始任务和本次补充说明继续推进。",
        "- 如果此前有阻塞、缺口或返工项，优先用补充说明消解后再派发子 Agent。",
        "- 不要丢弃已有任务上下文、回执和验收标准；最终报告需要覆盖完整任务。"
    ].join("\n");
}
function createTask(task) {
    return require("./collaboration-task-service").createTask(task);
}
function createRequirementEpicWithChildren(payload) {
    return require("./collaboration-task-service").createRequirementEpicWithChildren(payload);
}
function updateRequirementEpicFromPlan(payload) {
    return require("./collaboration-task-service").updateRequirementEpicFromPlan(payload);
}
function classifyTaskContinuation(message) {
    return require("./collaboration-task-service").classifyTaskContinuation(message);
}
function looksLikeTaskContinuation(message) {
    return require("./collaboration-task-service").looksLikeTaskContinuation(message);
}
function getGlobalMissionDeps() {
    return {
        listExecutions: execution_kernel_1.listExecutions,
        taskRequiresCodeChanges: collaboration_runtime_status_helpers_1.taskRequiresCodeChanges,
        taskRequiresVerification: collaboration_runtime_status_helpers_1.taskRequiresVerification,
        listPermissionRequests: (filters = {}) => require("./task-permission-broker").listTaskPermissionRequests(filters),
    };
}
function getGlobalMissionChildDeliveryEvidence(task) {
    return (0, global_mission_1.getGlobalMissionChildDeliveryEvidence)(task, getGlobalMissionDeps());
}
function globalMissionChildGatePassed(task) {
    return (0, global_mission_1.globalMissionChildGatePassed)(task, getGlobalMissionDeps());
}
function refreshGlobalMissionParentInTaskList(tasks, parentId) {
    return (0, global_mission_1.refreshGlobalMissionParentInTaskList)(tasks, parentId, getGlobalMissionDeps());
}
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
function normalizeGlobalDispatchHistoryMessages(messages = []) {
    return messages
        .filter((item) => item && ["user", "assistant"].includes(String(item.role || "")) && String(item.content || "").trim())
        .map((item) => ({
        role: String(item.role),
        content: String(item.content || "").slice(0, 8000),
        timestamp: item.timestamp || new Date().toISOString(),
    }))
        .slice(-80);
}
function loadGlobalDispatchHistoryStore() {
    try {
        if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE))
            return { sessions: [], ...JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8")) };
    }
    catch { }
    try {
        if (fs.existsSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`))
            return { sessions: [], ...JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8")) };
    }
    catch { }
    return { current_session_id: "", sessions: [] };
}
function writeGlobalDispatchHistoryStore(store) {
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    store.sessions = sessions
        .map((session) => ({
        ...session,
        messages: normalizeGlobalDispatchHistoryMessages(session.messages || []),
        updatedAt: session.updatedAt || new Date().toISOString(),
    }))
        .filter((session) => session.id && session.messages.length > 0)
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, 30);
    fs.mkdirSync(path.dirname(GLOBAL_AGENT_HISTORY_FILE), { recursive: true });
    const temp = `${GLOBAL_AGENT_HISTORY_FILE}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
        try {
            fs.copyFileSync(GLOBAL_AGENT_HISTORY_FILE, `${GLOBAL_AGENT_HISTORY_FILE}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf-8");
    fs.renameSync(temp, GLOBAL_AGENT_HISTORY_FILE);
}
function getGlobalDirectDispatchMeta(task) {
    const meta = task?.workflow_meta?.global_direct_dispatch || task?.workflowMeta?.global_direct_dispatch || null;
    if (!meta || typeof meta !== "object")
        return null;
    if (String(meta.schema || "") !== "ccm-global-direct-dispatch-v1")
        return null;
    return meta;
}
function getGlobalDirectDispatchContinuationKey(task) {
    return require("./collaboration-global-missions").getGlobalDirectDispatchContinuationKey(task);
}
function shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus = "") {
    return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus);
}
function buildGlobalDirectDispatchContinuationMessage(task) {
    return require("./collaboration-global-missions").buildGlobalDirectDispatchContinuationMessage(task);
}
function shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus = "") {
    return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus);
}
function buildGlobalDirectDispatchCompletionMessage(task) {
    return require("./collaboration-global-missions").buildGlobalDirectDispatchCompletionMessage(task);
}
function shouldNotifyGlobalDirectDispatchRollback(task, previousStatus = "") {
    return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchRollback(task, previousStatus);
}
function buildGlobalDirectDispatchRollbackMessage(task) {
    return require("./collaboration-global-missions").buildGlobalDirectDispatchRollbackMessage(task);
}
function recordGlobalDirectDispatchCompletionMemory(task, meta, content) {
    try {
        const item = (0, memory_2.recordGlobalDirectDispatchMemory)({
            dispatchId: task?.id || meta?.global_run_id || "",
            sessionId: meta?.session_id || "",
            source: "global-agent-direct-dispatch",
            traceId: task?.trace_id || meta?.trace_id || "",
            userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
            groupId: task?.group_id || meta?.group_id || "",
            targetProject: task?.target_project || "",
            task,
            report: task?.delivery_summary || {},
            messageId: `global-direct-completion:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
            at: new Date().toISOString(),
        });
        return { ok: true, item, content_preview: (0, memory_1.compactMemoryText)(content, 240) };
    }
    catch (error) {
        (0, reliability_ledger_1.appendTraceEvent)(task?.trace_id, {
            type: "global_direct_dispatch.memory_writeback_failed",
            status: "warning",
            task_id: task?.id || "",
            group_id: task?.group_id || "",
            agent: "global-agent",
            message: "全局直派完成总结写入全局记忆失败",
            data: { error: error?.message || String(error) },
        });
        return { ok: false, error: error?.message || String(error) };
    }
}
function recordGlobalDirectDispatchRollbackMemoryFromTask(task, meta, content) {
    try {
        const item = (0, memory_2.recordGlobalDirectDispatchRollbackMemory)({
            dispatchId: task?.id || meta?.global_run_id || "",
            sessionId: meta?.session_id || "",
            source: "global-agent-direct-dispatch",
            traceId: task?.trace_id || meta?.trace_id || "",
            userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
            groupId: task?.group_id || meta?.group_id || "",
            task,
            report: task?.delivery_summary || {},
            messageId: `global-direct-rollback:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
            at: new Date().toISOString(),
            reason: task?.rollback_reason || "",
        });
        return { ok: true, item, content_preview: (0, memory_1.compactMemoryText)(content, 240) };
    }
    catch (error) {
        (0, reliability_ledger_1.appendTraceEvent)(task?.trace_id, {
            type: "global_direct_dispatch.rollback_memory_writeback_failed",
            status: "warning",
            task_id: task?.id || "",
            group_id: task?.group_id || "",
            agent: "global-agent",
            message: "全局直派撤销总结写入全局记忆失败",
            data: { error: error?.message || String(error) },
        });
        return { ok: false, error: error?.message || String(error) };
    }
}
function appendGlobalDirectDispatchContinuationToHistory(task, previousStatus = "") {
    if (!shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus))
        return false;
    const meta = getGlobalDirectDispatchMeta(task);
    const sessionId = String(meta?.session_id || "").trim();
    const key = getGlobalDirectDispatchContinuationKey(task);
    const content = buildGlobalDirectDispatchContinuationMessage(task);
    const store = loadGlobalDispatchHistoryStore();
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    let session = sessions.find((item) => item.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            name: "全局 Agent 会话",
            source: "web",
            createdAt: new Date().toISOString(),
            messages: [],
        };
        sessions.unshift(session);
    }
    session.messages = normalizeGlobalDispatchHistoryMessages([
        ...(session.messages || []),
        { role: "assistant", content, timestamp: new Date().toISOString() },
    ]);
    session.updatedAt = new Date().toISOString();
    store.sessions = sessions;
    if (!store.current_session_id)
        store.current_session_id = sessionId;
    writeGlobalDispatchHistoryStore(store);
    task.workflow_meta = {
        ...(task.workflow_meta || {}),
        global_direct_dispatch: {
            ...meta,
            continuation_notified_at: session.updatedAt,
            continuation_notified_key: key,
            continuation_message_preview: (0, memory_1.compactMemoryText)(content, 320),
        },
    };
    const timelineEvent = {
        id: `tl_global_direct_continuation_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        at: session.updatedAt,
        type: "global_direct_dispatch_continuation_synced",
        title: "全局 Agent 会话已同步接续状态",
        detail: "群聊任务收到补充要求后，接续状态已回写到全局 Agent 会话",
        status: "active",
        phase: "rework",
        agent: "global-agent",
        data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", continuation_key: key },
    };
    task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
    (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_continuation_synced", status: "active", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
    return true;
}
function appendGlobalDirectDispatchCompletionToHistory(task, previousStatus = "") {
    if (!shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus))
        return false;
    const meta = getGlobalDirectDispatchMeta(task);
    const sessionId = String(meta?.session_id || "").trim();
    const content = buildGlobalDirectDispatchCompletionMessage(task);
    const memoryWriteback = recordGlobalDirectDispatchCompletionMemory(task, meta, content);
    const store = loadGlobalDispatchHistoryStore();
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    let session = sessions.find((item) => item.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            name: "全局 Agent 会话",
            source: "web",
            createdAt: new Date().toISOString(),
            messages: [],
        };
        sessions.unshift(session);
    }
    session.messages = normalizeGlobalDispatchHistoryMessages([
        ...(session.messages || []),
        { role: "assistant", content, timestamp: new Date().toISOString() },
    ]);
    session.updatedAt = new Date().toISOString();
    store.sessions = sessions;
    if (!store.current_session_id)
        store.current_session_id = sessionId;
    writeGlobalDispatchHistoryStore(store);
    task.workflow_meta = {
        ...(task.workflow_meta || {}),
        global_direct_dispatch: {
            ...meta,
            completion_notified_at: session.updatedAt,
            completion_message_preview: (0, memory_1.compactMemoryText)(content, 320),
            memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.memory_writeback_at || "",
            memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.memory_writeback_item_id || "",
            memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
        },
    };
    const timelineEvent = {
        id: `tl_global_direct_completion_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        at: session.updatedAt,
        type: "global_direct_dispatch_completion_synced",
        title: "全局 Agent 会话已同步最终总结",
        detail: "群聊任务通过验收后，最终总结已回写到全局 Agent 会话",
        status: "ok",
        phase: "completed",
        agent: "global-agent",
        data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
    };
    task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
    (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_completion_synced", status: "ok", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
    return true;
}
function appendGlobalDirectDispatchRollbackToHistory(task, previousStatus = "") {
    if (!shouldNotifyGlobalDirectDispatchRollback(task, previousStatus))
        return false;
    const meta = getGlobalDirectDispatchMeta(task);
    const sessionId = String(meta?.session_id || "").trim();
    const content = buildGlobalDirectDispatchRollbackMessage(task);
    const memoryWriteback = recordGlobalDirectDispatchRollbackMemoryFromTask(task, meta, content);
    const store = loadGlobalDispatchHistoryStore();
    const sessions = Array.isArray(store.sessions) ? store.sessions : [];
    let session = sessions.find((item) => item.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            name: "全局 Agent 会话",
            source: "web",
            createdAt: new Date().toISOString(),
            messages: [],
        };
        sessions.unshift(session);
    }
    session.messages = normalizeGlobalDispatchHistoryMessages([
        ...(session.messages || []),
        { role: "assistant", content, timestamp: new Date().toISOString() },
    ]);
    session.updatedAt = new Date().toISOString();
    store.sessions = sessions;
    if (!store.current_session_id)
        store.current_session_id = sessionId;
    writeGlobalDispatchHistoryStore(store);
    task.workflow_meta = {
        ...(task.workflow_meta || {}),
        global_direct_dispatch: {
            ...meta,
            rollback_notified_at: session.updatedAt,
            rollback_message_preview: (0, memory_1.compactMemoryText)(content, 320),
            rollback_memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.rollback_memory_writeback_at || "",
            rollback_memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.rollback_memory_writeback_item_id || "",
            rollback_memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
        },
    };
    const timelineEvent = {
        id: `tl_global_direct_rollback_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
        at: session.updatedAt,
        type: "global_direct_dispatch_rollback_synced",
        title: "全局 Agent 会话已同步撤销结果",
        detail: "群聊任务安全撤销后，撤销总结已回写到全局 Agent 会话",
        status: "warn",
        phase: "cancelled",
        agent: "global-agent",
        data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
    };
    task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
    (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_rollback_synced", status: "warning", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
    return true;
}
function updateTask(id, updates) {
    return require("./collaboration-task-service").updateTask(id, updates);
}
function normalizeTaskTerminalStateView(task) {
    return require("./collaboration-task-service").normalizeTaskTerminalStateView(task);
}
function refreshGlobalDevelopmentMissions() {
    return require("./collaboration-global-missions").refreshGlobalDevelopmentMissions();
}
function getGlobalDevelopmentMission(id) {
    return require("./collaboration-global-missions").getGlobalDevelopmentMission(id);
}
function getMissionDependencyRefs(task) {
    const value = task?.mission_dependencies || task?.mission_target?.depends_on || task?.mission_target?.dependsOn || [];
    return (Array.isArray(value) ? value : [value]).map((item) => String(item || "").trim()).filter(Boolean);
}
function missionChildMatchesRef(task, ref) {
    const target = task?.mission_target || {};
    return [task?.id, target.name, target.project, target.group_id, task?.target_project, task?.group_id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase() === String(ref).toLowerCase());
}
function removeTaskFromQueues(taskId) {
    return require("./collaboration-task-service").removeTaskFromQueues(taskId);
}
function appendGlobalMissionSupervisorTimeline(mission, actions = [], waitingUser = [], terminal = false) {
    if (!mission?.id)
        return null;
    const actionTypes = (0, collaboration_runtime_status_helpers_1.uniqueStrings)((actions || []).map((item) => item?.type).filter(Boolean));
    const waitingReasons = (0, collaboration_runtime_status_helpers_1.uniqueStrings)((waitingUser || []).map((item) => item?.reason).filter(Boolean)).slice(0, 3);
    const reworkCount = actionTypes.filter((type) => /rework|recovery|retry|merge_conflict|failure/i.test(type)).length;
    const fingerprint = crypto.createHash("sha1").update(JSON.stringify({
        terminal: !!terminal,
        actionTypes,
        waitingReasons,
        allPassed: mission?.mission_summary?.all_passed === true,
    })).digest("hex").slice(0, 12);
    const recent = Array.isArray(mission.workflow_timeline) ? mission.workflow_timeline.slice(-8) : [];
    if (recent.some((event) => /^global_supervisor_/.test(String(event?.type || "")) && event?.data?.fingerprint === fingerprint))
        return null;
    const type = terminal
        ? "global_supervisor_completed"
        : waitingUser.length
            ? "global_supervisor_waiting_user"
            : reworkCount
                ? "global_supervisor_rework"
                : "global_supervisor_cycle";
    const title = terminal
        ? "我已确认全部子任务通过"
        : waitingUser.length
            ? "我发现有阻塞需要你处理"
            : reworkCount
                ? "我已安排子任务返工"
                : "我已检查子任务进展";
    const detail = terminal
        ? "所有子任务交付验收已通过，正在整理全局总结。"
        : waitingUser.length
            ? waitingReasons.join("；") || "有子任务需要人工确认后才能继续。"
            : actionTypes.length
                ? `已执行 ${actions.length} 个跟进动作：${actionTypes.slice(0, 4).join("、")}`
                : "子任务仍在推进，暂无需要你处理的事项。";
    return (0, logs_1.appendTaskTimelineEvent)(mission.id, {
        type,
        title,
        detail,
        status: terminal ? "ok" : waitingUser.length ? "warn" : reworkCount ? "active" : "active",
        phase: terminal ? "completed" : waitingUser.length ? "needs_user" : reworkCount ? "rework" : "supervising",
        agent: "global-agent",
        data: {
            fingerprint,
            action_types: actionTypes.slice(0, 8),
            action_count: actions.length,
            waiting_user_count: waitingUser.length,
            waiting_reasons: waitingReasons,
        },
    });
}
function superviseGlobalDevelopmentMissionCycle(id, ctx, options = {}) {
    return require("./collaboration-global-missions").superviseGlobalDevelopmentMissionCycle(id, ctx, options);
}
async function controlGlobalDevelopmentMission(id, operation, ctx, payload = {}) {
    return require("./collaboration-global-missions").controlGlobalDevelopmentMission(id, operation, ctx, payload);
}
function targetProjectForMissionTarget(target) {
    return String(target?.type === "group" ? target?.coordinator : (target?.project || target?.name || "")).trim();
}
function buildGlobalMissionTargetHandoff(input) {
    return require("./collaboration-global-missions").buildGlobalMissionTargetHandoff(input);
}
function buildGlobalGroupTestAgentOwnership() {
    return require("./collaboration-test-agent-runtime").buildGlobalGroupTestAgentOwnership();
}
function normalizeGlobalMissionTargetRequirements(payload, target) {
    return require("./collaboration-global-missions").normalizeGlobalMissionTargetRequirements(payload, target);
}
function createGlobalDevelopmentMission(payload, ctx) {
    return require("./collaboration-global-missions").createGlobalDevelopmentMission(payload, ctx);
}
function canCompleteDailyDevFromDeliverySummary(task, execution, summary) {
    return require("./collaboration-task-service").canCompleteDailyDevFromDeliverySummary(task, execution, summary);
}
function reconcileTaskDeliveryEvidence(taskId) {
    const task = (0, db_1.loadTasks)().find((item) => item.id === taskId);
    if (!task)
        return { success: false, status: 404, error: "任务不存在" };
    const execution = {
        status: "waiting",
        detail: task.status_detail || "重新核对持久化交付证据",
        report: task.final_report || task.result || "",
        result: task.result || "",
        receipt: task.receipt || null,
        review: task.review || null,
        fileChanges: task.file_changes || null,
    };
    const summary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, execution, "waiting");
    const eligible = canCompleteDailyDevFromDeliverySummary(task, execution, summary);
    if (!eligible) {
        const updated = updateTask(taskId, { delivery_summary: summary, reasoning_loop: summary.reasoning_loop });
        (0, logs_1.addTaskLog)(taskId, "info", `交付证据复核完成：仍有 ${summary.acceptance_gate?.failed_count || 0} 项门禁未通过`);
        return { success: true, completed: false, task: updated, delivery_summary: summary };
    }
    const completedExecution = { ...execution, status: "done", detail: "持久化交付证据复核通过，系统自动完成" };
    const completedSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, completedExecution, "waiting");
    const closedSessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId, groupId: task.group_id || undefined }, "持久化交付证据复核通过");
    const finalizedExecution = { ...completedExecution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item) => item.id) } };
    const finalizedSummary = (0, collaboration_runtime_status_helpers_1.buildDeliverySummary)(task, finalizedExecution, "done");
    if (!finalizedSummary.acceptance_gate_passed) {
        const updated = updateTask(taskId, { status: "in_progress", status_detail: "最终收尾门禁未通过，任务保持进行中", delivery_summary: finalizedSummary, reasoning_loop: finalizedSummary.reasoning_loop });
        (0, logs_1.addTaskLog)(taskId, "warning", `持久化交付证据复核后仍未完成团队收尾：${finalizedSummary.acceptance_gate?.failed_checks?.map((item) => item.label).join("、") || "未知缺口"}`);
        return { success: true, completed: false, task: updated, delivery_summary: finalizedSummary };
    }
    const completedTask = updateTask(taskId, {
        status: "done",
        status_detail: completedExecution.detail,
        delivery_summary: finalizedSummary,
        reasoning_loop: finalizedSummary.reasoning_loop,
        execution_readiness: null,
        daily_dev_execution_readiness: null,
        completed_at: new Date().toISOString(),
    }) || task;
    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(completedTask, "done", completedExecution.detail);
    (0, collaboration_runtime_coordinator_review_1.finalizeTaskKernel)(task, finalizedExecution, finalizedSummary, "succeeded", completedExecution.detail);
    (0, collaboration_runtime_task_queue_1.syncTaskBacklogStatus)(completedTask, "done", completedExecution.detail);
    (0, collaboration_runtime_task_queue_1.appendTaskGroupReport)(completedTask, "done", completedExecution.detail);
    (0, logs_1.addTaskLog)(taskId, "success", `✅ ${completedExecution.detail}`);
    return { success: true, completed: true, task: completedTask, delivery_summary: finalizedSummary };
}
function validateTaskManualStatusUpdate(current, updates) {
    if (updates?.status !== "done")
        return null;
    const terminalError = require("./collaboration-task-service").validateTaskTerminalTransition(current, {
        ...updates,
        terminal_actor: updates.terminal_actor || "user",
    });
    if (terminalError)
        return terminalError;
    if (current?.workflow_type !== "daily_dev")
        return null;
    const summary = updates.delivery_summary || current.delivery_summary || null;
    const missing = [];
    const review = updates.review || current.review || null;
    const receiptStatuses = Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : [];
    const hasDoneReceipt = receiptStatuses.some((item) => item?.status === "done")
        || current.receipt?.status === "done"
        || updates.receipt?.status === "done";
    const requiresCodeChanges = (0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(current);
    const requiresVerification = (0, collaboration_runtime_status_helpers_1.taskRequiresVerification)(current);
    const actualChangeCount = Number(summary?.actual_file_change_count || current.file_changes?.count || 0);
    const executedVerificationCount = Number(summary?.verification_executed?.length || 0);
    const coordinationPlanCount = Number(summary?.coordination_plan_count || 0);
    const assignmentCount = Number(summary?.assignment_count || 0);
    const workerNotificationCount = Number(summary?.worker_notification_count || 0);
    if (!summary)
        missing.push("交付摘要");
    if (coordinationPlanCount <= 0)
        missing.push("主 Agent 协调计划");
    if (assignmentCount <= 0)
        missing.push("主 Agent 派发证据");
    if (workerNotificationCount <= 0)
        missing.push("子 Agent 执行结果");
    if (!hasDoneReceipt)
        missing.push("子 Agent 完成结果说明");
    if (!summary?.has_final_review && !review)
        missing.push("主 Agent 最终复盘");
    if (requiresCodeChanges && actualChangeCount <= 0)
        missing.push("系统实际捕获的代码变更");
    if (requiresVerification && executedVerificationCount <= 0)
        missing.push("已执行验证记录");
    if (Array.isArray(summary?.blockers) && summary.blockers.length > 0)
        missing.push("未解决阻塞项");
    const blockingNeeds = Array.isArray(summary?.blocking_needs)
        ? summary.blocking_needs
        : (Array.isArray(summary?.needs) ? summary.needs.filter((item) => !(0, collaboration_runtime_status_helpers_1.isAdvisoryNeed)(item, current)) : []);
    if (blockingNeeds.length > 0)
        missing.push("仍需补充事项");
    if (Array.isArray(summary?.verification_failed) && summary.verification_failed.length > 0)
        missing.push("失败验证记录");
    if (Array.isArray(summary?.verification_suggested) && summary.verification_suggested.length > 0)
        missing.push("仅建议/未执行验证记录");
    if (requiresVerification && summary?.verification_required_gate_passed === false)
        missing.push("项目配置验证命令执行证据");
    if (requiresVerification && summary?.verification_source_gate_passed !== true)
        missing.push("独立外部 Runner 验证来源");
    if (summary?.independent_review_required === true && summary?.independent_review_gate_passed !== true)
        missing.push("复杂变更独立复核通过");
    if (summary?.post_review_spot_check_required === true && summary?.post_review_spot_check_gate_passed !== true)
        missing.push("TestAgent 通过后主 Agent 完成前抽查");
    if ((requiresCodeChanges || requiresVerification) && summary?.ack_gate_passed !== true)
        missing.push("ACK 前置审核通过");
    if ((requiresCodeChanges || requiresVerification) && summary?.receipt_quality_gate_passed !== true)
        missing.push("高质量子 Agent 结果说明（ACK/动作/文件/验证/契约/记忆声明）");
    if (summary?.contract_injection_gate_passed === false)
        missing.push("contractChanges 已注入依赖 Agent");
    if ((0, collaboration_runtime_daily_dev_1.taskRequiresAgentQa)(current) && summary?.agent_qa_gate_passed !== true)
        missing.push("已采纳并完成原会话续跑的 Agent 协作问答");
    if (summary?.work_item_summary?.total && summary.work_item_summary.all_completed !== true)
        missing.push("执行队列所有工作项完成");
    if (summary?.team_shutdown?.required && summary.team_shutdown.pass !== true)
        missing.push("团队收尾完成");
    if (summary?.acceptance_gate && summary.acceptance_gate.pass !== true)
        missing.push("主 Agent 硬验收检查通过");
    if (missing.length === 0)
        return null;
    return `业务开发任务不能手动标记完成，缺少验收证据：${missing.join("、")}。请通过队列让主 Agent 继续执行，或在任务报告中补齐证据后由系统完成。`;
}
function buildTaskGapContinuationDraft(task) {
    return require("./collaboration-acceptance").buildTaskGapContinuationDraft(task);
}
function buildTargetedReworkContinuationDraft(task, payload = {}) {
    const base = buildTaskGapContinuationDraft(task);
    const kind = compactFormText(payload.rework_kind || payload.reworkKind || payload.kind, "targeted_rework");
    const target = compactFormText(payload.target || payload.agent || payload.project, "");
    const reason = compactFormText(payload.reason || payload.detail || payload.message, "");
    const title = compactFormText(payload.title || payload.label, "");
    const workItems = (0, work_items_1.buildMainAgentWorkItems)(task, { executions: (0, execution_kernel_1.listExecutions)({ taskId: task?.id || "" }) });
    const relatedWorkItems = workItems.filter((item) => {
        if (target)
            return [item.target, item.owner, item.id].some(value => String(value || "").toLowerCase() === target.toLowerCase());
        return ["failed", "blocked", "in_progress"].includes(String(item.status || ""));
    }).slice(0, 6);
    const workItemLines = relatedWorkItems.length ? [
        "",
        "相关执行队列工作项：",
        ...relatedWorkItems.flatMap((item) => [
            `- ${item.target || item.owner || item.id}：${item.subject || "未命名工作项"}；状态=${item.status}；attempt=${item.attempt || 1}${item.blockedBy?.length ? `；等待=${item.blockedBy.join("、")}` : ""}`,
            ...(item.evidence?.length ? [`  - 现有证据：${item.evidence.slice(0, 3).join("；")}`] : []),
            ...(item.blockers?.length ? [`  - 阻塞：${item.blockers.slice(0, 3).join("；")}`] : []),
        ]),
    ] : [];
    const kindLabel = {
        missing_diff: "缺少真实文件 Diff：只派实现返工",
        missing_verification: "缺少已执行验证：只派验证返工",
        missing_receipt: "缺少子 Agent 结果说明：要求补结构化结果说明",
        missing_goal_review: "目标覆盖不足：主 Agent 重新复盘",
        failed_verification: "验证失败：只修失败点",
        weak_receipt: "结果说明质量不足：要求补接单确认、动作、文件、验证、契约或记忆声明",
        contract_sync: "契约未同步：补结构化 contractChanges",
        contract_inject: "注入契约给依赖 Agent：按 contractChanges 续跑",
        ack_rewrite: "ACK 不合格：先重写接单确认",
    };
    return [
        "【精准返工指令】",
        `返工类型：${kindLabel[kind] || title || kind}`,
        target ? `目标 Agent：${target}` : "",
        reason ? `触发原因：${reason}` : "",
        ...workItemLines,
        "",
        "执行方式：",
        "- 只处理本条精准返工缺口，不要整轮重跑。",
        "- 优先复用原任务、原 Trace、原 native session / scratchpad。",
        "- 如果目标 Agent 明确，优先让同一个 Agent 续跑；如果缺口属于主 Agent 复盘，则主 Agent 先重新规划。",
        "- 完成后必须提交新的 CCM_AGENT_RECEIPT；若涉及接口/字段/schema/类型变化，必须补 contractChanges。",
        "",
        base,
    ].filter(Boolean).join("\n");
}
function getTaskGapItems(task) {
    return require("./collaboration-acceptance").getTaskGapItems(task);
}
function getTaskGapFingerprint(task) {
    return require("./collaboration-acceptance").getTaskGapFingerprint(task);
}
function isAutomaticGapContinuationSource(source) {
    return /(gap_rework|autopilot_gap|watchdog_gap|automatic_gap)/i.test(String(source || ""));
}
function canAutoContinueTaskGaps(task) {
    return require("./collaboration-acceptance").canAutoContinueTaskGaps(task);
}
function reconcileTaskCollaborationState(task, previous = {}) {
    return require("./collaboration-task-service").reconcileTaskCollaborationState(task, previous);
}
// ===== merged from collaboration-runtime-runtime-tools-part-02.ts =====
function hasDailyDevContinuationGaps(task) {
    if (!task || task.workflow_type !== "daily_dev")
        return false;
    if (task.status === "done" && (0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}))
        return false;
    if ((0, collaboration_runtime_task_queue_1.isTaskPaused)(task) || collaboration_runtime_task_queue_1.runningTaskIds.has(task.id) || (0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task.id))
        return false;
    const summary = task.delivery_summary || {};
    const hasSummaryGaps = [
        summary.blockers,
        summary.needs,
        summary.verification_required_missing,
        summary.verification_suggested,
        summary.verification_failed,
    ].some((items) => Array.isArray(items) && items.length > 0);
    const hasReceiptGaps = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item) => item?.status && item.status !== "done");
    const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
        .some((item) => {
        const status = String(item?.status || "").trim();
        const receiptStatus = String(item?.receipt_status || "").trim();
        return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
            || (!!receiptStatus && receiptStatus !== "done");
    });
    const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
        || Number(summary.assignment_count || 0) <= 0
        || Number(summary.worker_notification_count || 0) <= 0;
    const hasAgentQaGap = summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true;
    const hasIndependentReviewGap = summary.independent_review_required === true && summary.independent_review_gate_passed !== true;
    const hasPostReviewSpotCheckGap = summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true;
    const hasWeakAcceptanceGap = summary.acceptance_gate_passed === true && !(0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], summary);
    const hasAckGateGap = ((0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(task) || (0, collaboration_runtime_status_helpers_1.taskRequiresVerification)(task))
        && (summary.ack_gate_passed === false || (0, protocol_gates_1.getTaskAckRewriteRows)(task).length > 0);
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    const hasContractInjectionGap = contractGate.required && !contractGate.pass;
    return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps || hasAgentQaGap || hasIndependentReviewGap || hasPostReviewSpotCheckGap || hasWeakAcceptanceGap || hasAckGateGap || hasContractInjectionGap;
}
function taskNeedsUserIntervention(task) {
    const summary = task?.delivery_summary || {};
    return task?.status === "failed"
        || (0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)
        || [
            summary.blockers,
            summary.needs,
            summary.verification_failed,
            summary.verification_required_missing,
            summary.project_policy_violations,
            summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? [summary.independent_review_gate?.reason || "复杂变更缺少独立复核"] : [],
            summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true ? [summary.post_review_spot_check_gate?.reason || "TestAgent 通过后主 Agent 抽查尚未通过"] : [],
        ].some((items) => Array.isArray(items) && items.length > 0)
        || [
            ...(Array.isArray(summary.receipts) ? summary.receipts : []),
            ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
        ].some((item) => ["failed", "blocked", "partial", "needs_info", "missing_receipt"].includes(String(item?.status || "")));
}
function getTaskExecutionPhase(task) {
    if (task?.status === "done")
        return (0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}) ? "done" : "reviewing";
    if (collaboration_runtime_task_queue_1.runningTaskIds.has(task?.id) || task?.status === "in_progress")
        return "running";
    if (taskNeedsUserIntervention(task))
        return "blocked";
    if ((0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task?.id))
        return "queued";
    if (task?.status === "pending")
        return "pending";
    return task?.status || "unknown";
}
function getDashboardWorkerRows(task) {
    return require("./collaboration-task-card").getDashboardWorkerRows.apply(null, arguments);
}
function getTaskDashboardActions(task, phase) {
    const actions = [];
    // A successful terminal task may retain old interruption receipts for audit.
    // Terminal authority must win before any recovery heuristic reads that history.
    if (phase === "done") {
        if (task?.delivery_summary)
            actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
        if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
            actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
        }
        actions.push({ id: "replay", label: "任务回放", kind: "view_replay", tone: "outline" });
        return actions;
    }
    if (task?.acceptance_state === "recovery_required" && task?.recovery_preflight?.recoveryMode === "manual_reconciliation") {
        return [
            { id: "adopt_current_changes", label: "采用当前改动并继续", kind: "adopt_current_changes", tone: "warning" },
            { id: "view_changes", label: "查看当前改动", kind: "view_changes", tone: "outline" },
            { id: "rollback", label: "撤销到安全检查点", kind: "rollback", tone: "outline" },
            { id: "cancel", label: "停止任务", kind: "cancel", tone: "danger" },
        ];
    }
    const interruptedForRecovery = task?.acceptance_state === "recovery_required"
        || task?.interruption_receipt?.schema === "ccm-task-interruption-receipt-v1"
        || (["cancelled", "canceled"].includes(String(task?.status || "").toLowerCase())
            && task?.cancellation_progress?.stage === "cancelled");
    if (interruptedForRecovery) {
        return [
            { id: "resume_interrupted", label: "继续执行", kind: "resume_interrupted", tone: "primary" },
            { id: "replan", label: "重新规划", kind: "continue", tone: "outline" },
            { id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" },
        ];
    }
    const recovery = task?.recovery || task?.interruption_receipt?.recovery || {};
    const interruptionReason = String(task?.interruption_receipt?.reason_code || "");
    const transientModelRecovery = task?.acceptance_state === "recovery_required"
        && ["temporary_network", "provider_overload", "provider_unavailable", "model_stream_interrupted"].includes(interruptionReason)
        && task?.interruption_receipt?.recoverable === true;
    if (transientModelRecovery) {
        const safeAutoRecovery = recovery.mode === "safe_auto"
            && ["waiting_provider", "validating", "queued"].includes(String(recovery.state || ""));
        return [
            { id: "resume_interrupted", label: safeAutoRecovery ? "立即重试" : "恢复任务", kind: "resume_interrupted", tone: "primary" },
            { id: "cancel", label: "停止任务", kind: "cancel", tone: "danger" },
        ];
    }
    if ((0, collaboration_runtime_task_queue_1.isTaskPaused)(task)) {
        actions.push({ id: "resume", label: "继续执行", kind: "resume", tone: "primary" });
    }
    else if (!["done", "cancelled"].includes(String(task?.status || ""))) {
        actions.push({ id: "pause", label: "暂停", kind: "pause", tone: "outline" });
    }
    if (task?.status !== "done") {
        actions.push({ id: "supplement", label: "补充说明", kind: "continue", tone: "primary" });
        actions.push({ id: "replan", label: "重新规划", kind: "continue", tone: "outline" });
        actions.push({ id: "redispatch", label: "重派", kind: "retry", tone: "outline" });
        actions.push({ id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" });
    }
    if (hasDailyDevContinuationGaps(task)) {
        actions.push({ id: "gap_continue", label: "按缺口返工", kind: "gap_continue", tone: "warning" });
    }
    if (task?.status === "pending" && !(0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task?.id) && !(0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)) {
        actions.push({ id: "queue", label: "加入队列", kind: "queue", tone: "primary" });
    }
    if (task?.delivery_summary)
        actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
    if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
        actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
    }
    if (task?.status !== "done" && canCompleteDailyDevFromDeliverySummary(task, {}, task?.delivery_summary)) {
        actions.push({ id: "confirm_done", label: "人工确认完成", kind: "confirm_done", tone: "success" });
    }
    if (phase === "blocked" && (0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)) {
        actions.unshift({ id: "probe", label: "复检执行通道", kind: "probe", tone: "warning" });
    }
    if (!["done", "cancelled"].includes(String(task?.status || ""))) {
        actions.push({ id: "cancel", label: "停止任务", kind: "cancel", tone: "danger" });
    }
    return actions;
}
function buildExecutionDashboard(limit = 12) {
    const tasks = (0, db_1.loadTasks)()
        .filter((task) => !task.archived && !task.deleted_at)
        .slice()
        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
    const queueStatus = (0, collaboration_runtime_coordinator_review_1.getQueueStatus)();
    const phaseCounts = { pending: 0, queued: 0, running: 0, blocked: 0, done: 0, failed: 0, unknown: 0 };
    const rows = tasks.map((task) => {
        const summary = task.delivery_summary || {};
        const phase = getTaskExecutionPhase(task);
        phaseCounts[phase] = Number(phaseCounts[phase] || 0) + 1;
        const latestPlan = summary.latest_coordination_plan || {};
        const normalizedPlan = (0, task_replay_plan_1.buildTaskReplayPlanView)(task);
        const normalizedPlanSteps = (normalizedPlan?.steps || []).map((step) => ({
            id: String(step?.id || ""),
            title: String(step?.title || "").trim(),
            detail: String(step?.detail || "").trim(),
            status: phase === "done" ? "completed"
                : step?.status === "in_progress" ? "running"
                    : step?.status === "completed" ? "completed"
                        : ["failed", "blocked"].includes(String(step?.status || "")) ? String(step.status)
                            : "pending",
            contentStored: false,
        })).filter((step) => step.title && step.title !== "[object Object]");
        const planVersionCount = normalizedPlanSteps.length
            ? Math.max(1, Number(normalizedPlan.revision_count || 0) + 1, Number(summary.coordination_plan_count || 0))
            : 0;
        const blockers = [
            ...(Array.isArray(summary.blockers) ? summary.blockers : []),
            ...(Array.isArray(summary.needs) ? summary.needs : []),
            ...(Array.isArray(summary.verification_failed) ? summary.verification_failed.map((item) => `验证失败：${String(item)}`) : []),
            ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item) => `${item?.agent || "未知 Agent"} 缺验证：${Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置命令"}`) : []),
            ...(Array.isArray(summary.project_policy_violations) ? summary.project_policy_violations : []),
            summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? `复杂变更缺少独立复核：${summary.independent_review_gate?.reason || "需要另一个 Agent 复核"}` : "",
        ].filter(Boolean);
        return {
            id: task.id,
            title: task.title,
            status: task.status,
            phase,
            priority: task.priority || "normal",
            workflow_type: task.workflow_type || "",
            assign_type: task.assign_type || "",
            target_project: task.target_project || "",
            group_id: task.group_id || "",
            created_at: task.created_at,
            updated_at: task.updated_at,
            status_detail: task.status_detail || "",
            headline: summary.headline || task.final_report || task.result || "",
            execution_readiness: task.execution_readiness || null,
            main_plan: {
                count: planVersionCount,
                version_count: planVersionCount,
                step_count: normalizedPlanSteps.length,
                strategy: normalizedPlan?.strategy || latestPlan.strategy || "",
                steps: normalizedPlanSteps.slice(0, 20),
            },
            assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.slice(0, 12) : [],
            workers: getDashboardWorkerRows(task),
            evidence: {
                actual_file_change_count: Number(summary.actual_file_change_count || task.file_changes?.count || 0),
                actual_file_changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 12) : [],
                verification_executed: Array.isArray(summary.verification_executed) ? summary.verification_executed.slice(0, 12) : [],
                verification_failed: Array.isArray(summary.verification_failed) ? summary.verification_failed.slice(0, 12) : [],
                verification_required_missing: Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.slice(0, 12) : [],
                has_final_review: !!summary.has_final_review || !!task.review,
                receipt_count: Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0)),
            },
            rework_records: [
                ...(Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []),
                ...(Array.isArray(task.followups) ? task.followups.map((item) => ({
                    time: item.time,
                    source: item.source || "user",
                    summary: item.message || item.summary || "用户补充说明",
                })) : []),
            ].slice(0, 12),
            blockers: blockers.slice(0, 12),
            recent_logs: (0, logs_1.getTaskLogs)(task.id, 5),
            actions: getTaskDashboardActions(task, phase),
            raw_task: task,
        };
    });
    const activeRows = rows.filter((item) => item.phase !== "done").slice(0, limit);
    const recentDoneRows = rows.filter((item) => item.phase === "done").slice(0, Math.max(0, limit - activeRows.length));
    return {
        success: true,
        generated_at: new Date().toISOString(),
        queue_status: queueStatus,
        summary: {
            total: tasks.length,
            active: activeRows.length,
            queued: Number(phaseCounts.queued || 0),
            running: Number(phaseCounts.running || 0),
            blocked: Number(phaseCounts.blocked || 0),
            pending: Number(phaseCounts.pending || 0),
            done: Number(phaseCounts.done || 0),
        },
        phase_counts: phaseCounts,
        items: [...activeRows, ...recentDoneRows],
    };
}
function continueDailyDevTasksFromGaps(ctx, options = {}) {
    return require("./collaboration-task-service").continueDailyDevTasksFromGaps(ctx, options);
}
function continueTaskWithMessage(taskId, message, ctx, options = {}) {
    if (!taskId)
        return { success: false, status: 400, error: "缺少任务 ID" };
    if (!compactFormText(message, ""))
        return { success: false, status: 400, error: "请输入补充说明" };
    const tasks = (0, db_1.loadTasks)();
    let current = tasks.find(t => t.id === taskId);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    const completedBeforeContinuation = ["done", "completed"].includes(String(current.status || ""))
        || ["accepted", "terminal_gate_passed"].includes(String(current.acceptance_state || ""));
    const requestedContinuationKind = String(options.continuation_kind || options.continuationKind || "auto");
    const machineGeneratedContinuation = options.internal === true
        || options.internalContinuation === true
        || /(?:gap_rework|dependency_unlocked|watchdog|autopilot|supervisor|targeted_rework)/i.test(String(options.source || ""));
    const continuationKind = requestedContinuationKind === "auto"
        ? machineGeneratedContinuation ? "supplement" : "new_task"
        : requestedContinuationKind;
    if (continuationKind === "new_task") {
        return { success: false, status: 409, new_task_suggested: true, error: "这条要求看起来是一个独立新任务，请直接在群聊发送，不会混入当前任务。" };
    }
    // 需求 Epic 的执行前计划等待确认时，追加要求必须走「修改计划」重新拆解：
    // 只把文字并入计划书的话，确认时子任务仍按旧的 decomposition_plan 生成，追加内容会被静默丢弃。
    if (current.workflow_type === "requirement_epic" && current.intake_state === "awaiting_confirmation") {
        return {
            success: false,
            status: 409,
            needs_plan_revision: true,
            error: "这个需求 Epic 的执行前计划还在等待确认；请使用确认卡上的「修改计划」提交这条要求，我会带着它重新拆解子任务后再请你确认。",
        };
    }
    const source = String(options.source || "user");
    const explicitCompletedRework = continuationKind === "revise_goal"
        || /(?:targeted_rework|completed_task_rework|explicit_rework)/i.test(source);
    if (completedBeforeContinuation && !explicitCompletedRework) {
        return {
            success: false,
            status: 409,
            code: "TASK_ALREADY_COMPLETED",
            new_task_suggested: true,
            error: "任务已经正式完成；新增修改请创建新任务，明确返工请使用返工入口。",
        };
    }
    const automaticGapContinuation = isAutomaticGapContinuationSource(source);
    const internalContinuation = options.internal === true || options.internalContinuation === true || /dependency_unlocked_next_work_item/i.test(source);
    const gapFingerprint = automaticGapContinuation ? getTaskGapFingerprint(current) : "";
    const gapItems = automaticGapContinuation ? getTaskGapItems(current) : [];
    if (automaticGapContinuation && !canAutoContinueTaskGaps(current)) {
        return {
            success: false,
            status: 409,
            needs_user: true,
            error: "相同交付缺口已经自动返工过一次，但没有出现新的验收证据；请补充业务信息、调整方案或人工选择重试。",
            gap_fingerprint: gapFingerprint,
            gap_items: gapItems,
        };
    }
    const explicitOperationKey = String(options.idempotency_key || options.idempotencyKey || options.request_id || options.requestId || "").trim();
    const automaticOperationKey = automaticGapContinuation && gapFingerprint ? `auto-gap:${gapFingerprint}` : "";
    // 用户追加缺省用消息内容哈希兜底：前端不传幂等键时，双击/HTTP 重试不会重复并入同一条补充。
    const userFollowupOperationKey = !automaticGapContinuation && !internalContinuation
        ? `user-followup:${crypto.createHash("sha1").update(`${continuationKind}:${compactFormText(message, "")}`).digest("hex").slice(0, 16)}`
        : "";
    const operationKey = explicitOperationKey || automaticOperationKey || userFollowupOperationKey;
    const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "task-continue", key: `${taskId}:${operationKey}`, traceId: current.trace_id, leaseMs: 60_000 }) : null;
    if (operation && !operation.acquired) {
        return { success: true, duplicate: true, task: (0, db_1.loadTasks)().find((item) => item.id === taskId) || current, ...(operation.record?.result || {}), trace_id: operation.traceId };
    }
    const requiresInterruptedRecovery = current?.interruption_receipt?.schema === "ccm-task-interruption-receipt-v1"
        && (current?.recovery_pending === true
            || ["recovery_required", "recovery_validating"].includes(String(current?.acceptance_state || ""))
            || ["validating", "rolled_back"].includes(String(current?.recovery_transaction?.status || "")));
    if (requiresInterruptedRecovery) {
        try {
            const workspace = (0, task_recovery_orchestrator_1.captureTaskRecoveryWorkspace)(current);
            const recovered = (0, task_recovery_orchestrator_1.runTaskRecoveryOrchestrator)(current, {
                scope: current.group_id ? "group" : current.global_mission_id ? "global" : "project",
                scopeId: String(current.group_id || current.global_mission_id || current.target_project || "global"),
                exactSessionId: String(current.group_session_id || current.groupSessionId || current.project_session_id || current.projectSessionId || current.origin_session_id || current.task_agent_session_id || current.id),
                idempotencyKey: `message-route:${taskId}:${current.interruption_receipt.checksum}`,
                authorizationValid: options.authorizationValid !== false,
                runtimeValid: options.runtimeValid !== false,
                currentWorkspaceChecksum: workspace.checksum,
                worktreeOwnershipValid: workspace.ownershipValid,
            });
            if (!recovered.success) {
                if (operationKey)
                    (0, reliability_ledger_1.failIdempotency)("task-continue", `${taskId}:${operationKey}`, new Error("recovery_preflight_blocked"));
                return {
                    success: false,
                    status: 409,
                    manual_recovery_required: true,
                    error: "恢复前需要核对中断现场",
                    recovery_preflight: recovered.preflight,
                    task: recovered.task || current,
                };
            }
            current = recovered.task || current;
        }
        catch (error) {
            if (operationKey)
                (0, reliability_ledger_1.failIdempotency)("task-continue", `${taskId}:${operationKey}`, error);
            return {
                success: false,
                status: 409,
                manual_recovery_required: true,
                error: error?.message || "恢复前需要核对中断现场",
                recovery_preflight: error?.recovery_preflight || null,
            };
        }
    }
    const currentlyRunning = collaboration_runtime_task_queue_1.runningTaskIds.has(taskId);
    const continuationRouteKind = continuationKind === "revise_goal"
        ? "revise_existing_task"
        : completedBeforeContinuation || requiresInterruptedRecovery
            ? "resume_existing_task"
            : "continue_current_session";
    const resolvesWaitingUser = options.resolve_waiting_user === true
        || options.resolveWaitingUser === true
        || /waiting[_-]?user[_-]?resolution/i.test(source);
    const continuationMeta = {
        rework_kind: compactFormText(options.rework_kind || options.reworkKind || options.continuation_rework_kind || "", ""),
        target: compactFormText(options.target || options.agent || options.project || "", ""),
        reason: compactFormText(options.reason || options.detail || "", ""),
        title: compactFormText(options.title || options.label || "", ""),
        work_item_id: compactFormText(options.work_item_id || options.workItemId || "", ""),
        resolves_waiting_user: resolvesWaitingUser,
    };
    const shouldInterruptCurrentRun = currentlyRunning
        && continuationKind === "revise_goal"
        && options.interrupt_current_run !== false
        && options.interruptCurrentRun !== false;
    const isNextWorkItemContinuation = continuationMeta.rework_kind === "next_claimable_work_item"
        || /next_work_item|user_next_work_item/i.test(`${source} ${continuationMeta.rework_kind}`);
    const continuationDecision = (0, collaboration_runtime_task_queue_1.buildContinuationUserDecision)({
        source,
        kind: continuationKind,
        meta: { ...continuationMeta, interrupt_current_run: shouldInterruptCurrentRun },
        deferred: currentlyRunning,
    });
    const continuationTitle = continuationDecision.title;
    const continuationDetail = continuationDecision.timeline_detail || continuationDecision.reason || (continuationMeta.target ? `目标：${continuationMeta.target}` : "");
    const followup = {
        time: new Date().toISOString(),
        message: compactFormText(message, ""),
        source,
        kind: continuationKind,
        status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupt_requested" : "queued_for_current_task") : "accepted",
        continuation: {
            ...continuationMeta,
            strategy: continuationDecision.strategy,
            route_label: continuationDecision.route_label,
            replan_required: continuationDecision.replan_required,
            interrupt_current_run: shouldInterruptCurrentRun,
        },
        user_visible: {
            schema: "ccm-main-agent-continuation-status-v1",
            title: continuationDecision.title,
            headline: continuationDecision.headline,
            route_label: continuationDecision.route_label,
            kind_label: continuationDecision.kind_label,
            next_action: continuationDecision.next_action,
        },
    };
    const nextDescription = `${current.description || ""}${buildTaskContinuationBlock(followup.message)}`;
    const previousGap = current.collaboration_state?.gap || {};
    const autoAttempts = automaticGapContinuation
        ? (previousGap.fingerprint === gapFingerprint ? Number(previousGap.auto_attempts || 0) : 0) + 1
        : Number(previousGap.auto_attempts || 0);
    const nextCollaborationState = {
        ...(current.collaboration_state || {}),
        phase: "reworking",
        needs_user: false,
        gap: automaticGapContinuation ? {
            ...previousGap,
            fingerprint: gapFingerprint,
            items: gapItems,
            auto_attempts: autoAttempts,
            last_auto_continue_at: followup.time,
        } : resolvesWaitingUser && Object.keys(previousGap).length ? {
            ...previousGap,
            resolved_at: followup.time,
            resolved_by: source,
        } : previousGap,
        waiting_user_resolution: resolvesWaitingUser ? {
            resolved_at: followup.time,
            source,
            summary: "用户已补充任务所需条件",
        } : current.collaboration_state?.waiting_user_resolution || null,
        last_continuation: {
            source,
            at: followup.time,
            automatic: automaticGapContinuation || internalContinuation,
            kind: continuationKind,
            status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
            strategy: continuationDecision.strategy,
            route_label: continuationDecision.route_label,
            replan_required: continuationDecision.replan_required,
            interrupt_current_run: shouldInterruptCurrentRun,
            ...continuationMeta,
        },
        continuation_events: [
            ...(Array.isArray(current.collaboration_state?.continuation_events) ? current.collaboration_state.continuation_events : []),
            {
                source,
                at: followup.time,
                automatic: automaticGapContinuation || internalContinuation,
                kind: continuationKind,
                status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
                title: continuationTitle,
                detail: continuationDetail,
                strategy: continuationDecision.strategy,
                route_label: continuationDecision.route_label,
                replan_required: continuationDecision.replan_required,
                interrupt_current_run: shouldInterruptCurrentRun,
                ...continuationMeta,
            },
        ].slice(-20),
        goal_revision_interruption: shouldInterruptCurrentRun ? {
            requested: true,
            requested_at: followup.time,
            reason: followup.message,
            source,
            followup_revision: Number(current.followup_revision || 0) + 1,
        } : current.collaboration_state?.goal_revision_interruption || null,
    };
    const updates = {
        description: nextDescription,
        followups: automaticGapContinuation || internalContinuation ? (Array.isArray(current.followups) ? current.followups : []) : [...(Array.isArray(current.followups) ? current.followups : []), followup],
        internal_continuations: automaticGapContinuation || internalContinuation ? [...(Array.isArray(current.internal_continuations) ? current.internal_continuations : []), followup].slice(-20) : (Array.isArray(current.internal_continuations) ? current.internal_continuations : []),
        status: currentlyRunning ? "in_progress" : "pending",
        is_paused: false,
        paused: false,
        ...(currentlyRunning ? {} : { result: "", final_report: "" }),
        followup_revision: Number(current.followup_revision || 0) + 1,
        pending_followups: [...(Array.isArray(current.pending_followups) ? current.pending_followups : []), followup].slice(-20),
        status_detail: options.status_detail || (automaticGapContinuation
            ? `已按 ${gapItems.length} 个交付缺口自动返工，等待主 Agent 继续执行`
            : continuationDecision.status_detail),
        collaboration_state: nextCollaborationState,
        last_continue_at: followup.time,
        last_continue_source: followup.source,
        continuation_route_kind: continuationRouteKind,
        ...(completedBeforeContinuation ? {
            execution_attempt: Math.max(0, Number(current.execution_attempt || current.attempt || 0)) + 1,
            resumed_from_completed_at: followup.time,
        } : {}),
        ...(resolvesWaitingUser ? {
            recovery_pending: false,
            waiting_user_resolved_at: followup.time,
            waiting_user_resolution_source: source,
        } : {}),
        ...(internalContinuation ? { last_internal_continue_at: followup.time } : {}),
    };
    if (continuationKind === "revise_goal") {
        updates.business_goal = `${current.business_goal || current.title || ""}\n目标调整：${followup.message}`.trim();
        updates.plan_revision_required = true;
        updates.last_goal_revision_at = followup.time;
    }
    if (current.status === "done") {
        const reopened = (0, agent_sessions_1.reopenTaskAgentSessions)(taskId, "用户在同一任务中继续修改，恢复已验收会话");
        updates.reopened_session_count = reopened.length;
    }
    if (automaticGapContinuation) {
        updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
        updates.last_auto_gap_continue_at = followup.time;
    }
    // 任何形式的继续/返工都开启新的验收周期：清零本周期轮次，保留累计值。
    // 不清零的话，监工的 gate_gap_rework 重发会让新一轮从上限起步，TestAgent 一失败即 blocked。
    Object.assign(updates, (0, rework_policy_1.buildReviewCycleResetUpdate)(current, `继续任务：${source}`));
    // 用户在计划书给出后继续追加要求：把追加内容并入计划书（新增步骤 + 修订历史）。
    // 等待确认阶段的计划要求重新确认；已执行中的任务并入后继续，不打断执行。
    const awaitingPlanConfirmation = current.intake_state === "awaiting_confirmation";
    const currentPlanMode = automaticGapContinuation || internalContinuation ? null : (0, main_agent_plan_core_1.readTaskPlanMode)(current);
    let revisedPlanMode = null;
    if (currentPlanMode) {
        const mergedPlanMode = (0, main_agent_plan_core_1.mergeFollowupIntoPlanMode)(currentPlanMode, {
            message: followup.message,
            kind: continuationKind,
            source,
            at: followup.time,
            executing: !awaitingPlanConfirmation,
        });
        // 幂等短路时返回原对象，说明同一条反馈已并入过，不再重写计划字段、不再发修订事件。
        if (mergedPlanMode !== currentPlanMode) {
            revisedPlanMode = mergedPlanMode;
            Object.assign(updates, (0, main_agent_plan_core_1.buildPlanRevisionTaskUpdates)(current, revisedPlanMode));
            if (awaitingPlanConfirmation) {
                updates.status = "pending";
                updates.auto_execute = false;
                updates.status_detail = "执行前计划已并入你的追加要求，等待你重新确认";
            }
        }
    }
    const task = updateTask(taskId, updates);
    let interruptionResult = null;
    if (shouldInterruptCurrentRun) {
        try {
            interruptionResult = (0, execution_kernel_1.requestTaskCancellation)(taskId, "用户调整了目标，先停止当前执行轮以重新核对计划", "main-agent-goal-revision");
            (0, logs_1.addTaskLog)(taskId, "warning", "目标调整触发当前执行轮停止；主 Agent 将保留上下文并按新目标重核计划");
            (0, logs_1.appendTaskTimelineEvent)(taskId, {
                type: "task_goal_revision_interrupt",
                title: "已停止当前执行轮以重核计划",
                detail: "用户调整了目标边界，主 Agent 正在停止可能跑偏的执行轮。",
                status: "warn",
                phase: "rework",
                agent: continuationMeta.target || "coordinator",
                data: { source, kind: continuationKind, interruption: interruptionResult },
            });
        }
        catch (error) {
            interruptionResult = { success: false, error: String(error?.message || error || "停止当前执行轮失败") };
            (0, logs_1.addTaskLog)(taskId, "warning", `目标调整尝试停止当前执行轮失败：${interruptionResult.error}`);
        }
    }
    (0, logs_1.addTaskLog)(taskId, "info", automaticGapContinuation
        ? `按交付缺口自动继续（${gapFingerprint}）：${gapItems.join("、").slice(0, 300)}`
        : internalContinuation
            ? `前置完成后自动接上下一步工作项：${followup.message.slice(0, 300)}`
            : `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);
    (0, logs_1.appendTaskTimelineEvent)(taskId, {
        type: automaticGapContinuation ? "auto_gap_rework" : continuationDecision.timeline_type || (isNextWorkItemContinuation ? "next_work_item_dispatch" : /targeted|gap_rework|rework/i.test(source) ? "targeted_rework" : "task_continuation"),
        title: continuationTitle,
        detail: (0, memory_1.compactMemoryText)(continuationDetail || "我已复用同一任务上下文继续处理。", 260),
        status: "active",
        phase: "rework",
        agent: continuationMeta.target || "",
        data: { source, kind: continuationKind, rework_kind: continuationMeta.rework_kind, work_item_id: continuationMeta.work_item_id },
    });
    if (revisedPlanMode) {
        const revisionSummary = (0, main_agent_plan_core_1.summarizePlanRevisionForUser)(revisedPlanMode, { executing: !awaitingPlanConfirmation });
        (0, logs_1.addTaskLog)(taskId, "info", revisionSummary);
        (0, logs_1.appendTaskTimelineEvent)(taskId, {
            type: "plan_mode_followup_merged",
            title: awaitingPlanConfirmation ? "追加要求已并入执行前计划，等待重新确认" : "追加要求已并入计划书",
            detail: (0, memory_1.compactMemoryText)(revisionSummary, 260),
            status: awaitingPlanConfirmation ? "warning" : "active",
            phase: "planning",
            agent: continuationMeta.target || "coordinator",
            data: { revision_count: revisedPlanMode.revision_count, step_id: revisedPlanMode.plan_revisions?.[revisedPlanMode.plan_revisions.length - 1]?.step_id || "", same_task_trace: true },
        });
    }
    // 补充说明已落盘；后续消息广播/入队若抛错，必须结算幂等记录再上抛，
    // 否则重试在租约期内会拿到 duplicate:true 的假成功，掩盖真实失败。
    try {
        if (task?.assign_type === "group" && task.group_id && !automaticGapContinuation && !internalContinuation && options.append_group_message !== false && options.appendGroupMessage !== false) {
            const group = (0, storage_1.loadGroups)().find(g => g.id === task.group_id);
            const target = group ? (0, group_orchestrator_1.getCoordinatorMember)(group).project : "coordinator";
            (0, storage_1.appendGroupMessage)(task.group_id, {
                id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
                role: "user",
                target,
                content: `任务补充说明：${followup.message}`,
                timestamp: followup.time,
                task_id: taskId,
            });
            (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
        }
        else if (task?.assign_type === "group" && task.group_id && automaticGapContinuation) {
            (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(task, "pending", `已自动按 ${gapItems.length} 个交付缺口返工，不新增重复消息`);
            (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务按相同卡片继续返工: ${task.title}`, { task_id: taskId, gap_fingerprint: gapFingerprint, gap_items: gapItems });
        }
        else if (task?.assign_type === "group" && task.group_id && internalContinuation) {
            (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(task, "pending", "前置工作已完成，我已自动接上下一步派发");
            (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务前置完成后自动接续下一步: ${task.title}`, { task_id: taskId, work_item_id: continuationMeta.work_item_id });
        }
        let queueResult = null;
        // 计划仍在等待确认时，追加要求只修订计划书，不得启动执行；确认门槛保留给用户。
        if (!currentlyRunning && !awaitingPlanConfirmation && options.auto_execute !== false && options.autoExecute !== false) {
            queueResult = (0, collaboration_runtime_coordinator_review_1.enqueueTask)(taskId, ctx);
        }
        const userStatus = (0, collaboration_runtime_task_queue_1.buildUserContinuationStatus)(task, task?.status || "");
        const planRevisionText = revisedPlanMode ? (0, main_agent_plan_core_1.summarizePlanRevisionForUser)(revisedPlanMode, { executing: !awaitingPlanConfirmation }) : "";
        const result = {
            success: true,
            task,
            message: followup.message,
            friendly_text: awaitingPlanConfirmation && planRevisionText ? planRevisionText : userStatus?.headline || continuationDecision.headline,
            next_action: awaitingPlanConfirmation && revisedPlanMode ? "请在任务卡上重新确认调整后的执行前计划" : userStatus?.next_action || continuationDecision.next_action,
            plan_revision: revisedPlanMode ? {
                revision_count: revisedPlanMode.revision_count,
                revision_status: revisedPlanMode.revision_status,
                summary: planRevisionText,
                awaiting_reconfirmation: awaitingPlanConfirmation,
            } : null,
            user_status: userStatus,
            interruption: interruptionResult,
            queued: !!queueResult?.queued,
            deferred: currentlyRunning,
            interrupted_current_run: shouldInterruptCurrentRun,
            same_task_trace: true,
            continuation_kind: continuationKind,
            trace_id: task?.trace_id || current.trace_id || "",
            queue_result: queueResult,
            queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)(),
        };
        // 幂等结果存下用户可见字段，重放响应与首次响应形状一致（不存整个 task，重放时重新加载）。
        if (operationKey)
            (0, reliability_ledger_1.completeIdempotency)("task-continue", `${taskId}:${operationKey}`, {
                task_id: taskId,
                queued: result.queued,
                followup_time: followup.time,
                friendly_text: result.friendly_text,
                next_action: result.next_action,
                plan_revision: result.plan_revision,
                deferred: result.deferred,
                continuation_kind: continuationKind,
            });
        return result;
    }
    catch (error) {
        if (operationKey)
            (0, reliability_ledger_1.failIdempotency)("task-continue", `${taskId}:${operationKey}`, error);
        throw error;
    }
}
function retryTask(id, ctx, reason = "", autoExecute = true) {
    return require("./collaboration-task-service").retryTask(id, ctx, reason, autoExecute);
}
//# sourceMappingURL=collaboration-runtime-runtime-tools.js.map