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
// Behavior-freeze split from collaboration-runtime-runtime-tools.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 8/9).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
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
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const work_items_1 = require("../../agents/work-items");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
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
    const taskBoundInternalMcpServers = !options.disableTaskBoundInternalMcp && sourceTask?.id && workDir
        ? (0, agent_internal_mcp_1.buildTaskBoundInternalMcpServers)({
            taskId: String(sourceTask.id),
            groupId: String(groupId || sourceTask.group_id || ""),
            groupSessionId: String(options.groupSessionId || sourceTask.group_session_id || sourceTask.groupSessionId || ""),
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
            requestText: options.requestText || "",
            memoryReadBudgetTokens: Number(options.memoryReadBudgetTokens || 0),
        })
        : {};
    const audit = (0, runtime_tool_sync_1.syncRuntimeTools)(workDir, agentType, allowedTools, {
        authorizationReadiness,
        internalMcpServers: { ...taskBoundInternalMcpServers, ...(options.internalMcpServers || {}) },
    });
    audit.authorization_readiness = authorizationReadiness;
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
    return { listExecutions: execution_kernel_1.listExecutions, taskRequiresCodeChanges: collaboration_runtime_status_helpers_1.taskRequiresCodeChanges, taskRequiresVerification: collaboration_runtime_status_helpers_1.taskRequiresVerification };
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
//# sourceMappingURL=collaboration-runtime-runtime-tools-part-01.js.map