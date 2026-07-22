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
exports.getTaskAgentExecutionReadiness = getTaskAgentExecutionReadiness;
exports.getExternalAgentRunnerStatus = getExternalAgentRunnerStatus;
exports.buildAgentProbeMatrix = buildAgentProbeMatrix;
exports.buildDailyDevAgentDiagnostics = buildDailyDevAgentDiagnostics;
exports.runAgentCliProbeBatch = runAgentCliProbeBatch;
exports.buildCoordinatorSharedFilesContext = buildCoordinatorSharedFilesContext;
exports.buildTaskSourceDocumentsContext = buildTaskSourceDocumentsContext;
exports.mergeCoordinatorDocumentContexts = mergeCoordinatorDocumentContexts;
exports.runCollaborationProtocolSelfTest = runCollaborationProtocolSelfTest;
exports.getProjectExtraConfig = getProjectExtraConfig;
exports.normalizeProjectConfigList = normalizeProjectConfigList;
exports.getProjectAgentCapabilityProfile = getProjectAgentCapabilityProfile;
exports.collectProjectPolicyViolations = collectProjectPolicyViolations;
exports.buildAgentToolContext = buildAgentToolContext;
// Behavior-freeze split from collaboration-runtime-plan-tools.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 7/9).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const role_skills_1 = require("../../skills/role-skills");
const memory_1 = require("./memory");
const runtime_1 = require("../../agents/runtime");
const tool_authorization_1 = require("../../tools/tool-authorization");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const collaboration_runtime_plan_tools_part_01_1 = require("./collaboration-runtime-plan-tools-part-01");
function getTaskAgentExecutionReadiness(task) {
    return require("./collaboration-agent-probes").getTaskAgentExecutionReadiness(task);
}
function getExternalAgentRunnerStatus() {
    const runnerDir = path.join(utils_1.CCM_DIR, "agent-runner");
    const heartbeatFile = path.join(runnerDir, "heartbeat.json");
    const requestsDir = path.join(runnerDir, "requests");
    const resultsDir = path.join(runnerDir, "results");
    let heartbeat = null;
    try {
        if (fs.existsSync(heartbeatFile))
            heartbeat = (0, collaboration_runtime_plan_tools_part_01_1.readRunnerJson)(heartbeatFile);
    }
    catch { }
    const updatedAt = heartbeat?.updated_at ? Date.parse(heartbeat.updated_at) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : null;
    const pid = heartbeat?.pid ? Number(heartbeat.pid) : 0;
    let processAlive = false;
    if (pid > 0) {
        try {
            process.kill(pid, 0);
            processAlive = true;
        }
        catch {
            processAlive = false;
        }
    }
    const activeWindowMs = heartbeat?.status === "running" ? 10 * 60 * 1000 : 15000;
    const active = !!heartbeat && processAlive && ageMs !== null && ageMs < activeWindowMs && heartbeat.status !== "error";
    const listJsonFiles = (dir) => {
        try {
            return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith(".json")) : [];
        }
        catch {
            return [];
        }
    };
    const requestFiles = listJsonFiles(requestsDir);
    const resultFiles = listJsonFiles(resultsDir);
    const resultIds = new Set(resultFiles.map(file => file.replace(/\.json$/, "")));
    const pendingRequests = requestFiles.filter(file => !resultIds.has(file.replace(/\.json$/, ""))).length;
    let lastResult = null;
    try {
        if (fs.existsSync(resultsDir)) {
            const latest = resultFiles
                .map(file => {
                const full = path.join(resultsDir, file);
                const stat = fs.statSync(full);
                return { file, full, mtimeMs: stat.mtimeMs };
            })
                .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
            if (latest) {
                const data = (0, collaboration_runtime_plan_tools_part_01_1.readRunnerJson)(latest.full);
                lastResult = {
                    id: data?.id || latest.file.replace(/\.json$/, ""),
                    success: data?.success !== false,
                    error: String(data?.error || "").slice(0, 500),
                    output: String(data?.output || "").slice(0, 500),
                    agentType: data?.agentType || "",
                    command: data?.command || (0, runtime_1.getAgentCommandLabel)(data?.agentType || ""),
                    exitCode: data?.exitCode ?? null,
                    runner: data?.runner || "",
                    completed_at: data?.completed_at || new Date(latest.mtimeMs).toISOString(),
                    age_ms: Date.now() - latest.mtimeMs,
                };
                lastResult.hint = (0, collaboration_runtime_plan_tools_part_01_1.buildRunnerFixHint)(lastResult.error || lastResult.output, lastResult.agentType || "");
            }
        }
    }
    catch { }
    return {
        active,
        status: heartbeat?.status || "missing",
        detail: heartbeat?.detail || "",
        pid: pid || null,
        process_alive: processAlive,
        updated_at: heartbeat?.updated_at || "",
        age_ms: ageMs,
        pending_requests: pendingRequests,
        requests: requestFiles.length,
        results: resultFiles.length,
        last_result: lastResult,
    };
}
function buildAgentProbeMatrix(devGroups) {
    const targets = devGroups.flatMap((group) => (group.members || []).map((member) => {
        const target = {
            group_id: group.id,
            group_name: group.name || group.id,
            project: member.project,
            agent_type: member.agentType || member.agent || "claudecode",
            work_dir: member.workDir || "",
        };
        const fallbackRow = member.configured && member.workDirExists && member.workDirWritable
            ? (0, collaboration_runtime_plan_tools_part_01_1.summarizeAgentProbeTargets)([{ ...target, requires_write: true }]).rows[0]
            : null;
        const probe = fallbackRow?.probe || null;
        const probeHealth = fallbackRow?.probeHealth || (0, collaboration_runtime_plan_tools_part_01_1.getAgentProbeHealth)(probe);
        const taskReadiness = member.configured && member.workDirExists && member.workDirWritable
            ? {
                ready: fallbackRow?.ready === true,
                mode: fallbackRow?.fallback_active ? "fallback-agent-cli-probe" : "agent-cli-probe",
                message: fallbackRow?.ready
                    ? (fallbackRow?.fallback_active
                        ? `默认执行器不可用，备用执行器 ${fallbackRow.effective_agent_type} 已通过真实写入探针`
                        : "目标执行器已通过真实写入探针")
                    : (probeHealth.message || "目标项目 Agent 尚未通过探针"),
                fix_actions: [],
            }
            : {
                ready: false,
                mode: "member-not-executable",
                message: !member.configured
                    ? "项目 Agent 未配置执行器或工作目录"
                    : (!member.workDirExists ? "项目 Agent 工作目录不存在" : "项目 Agent 工作目录不可写"),
            };
        const status = taskReadiness.ready === true
            ? "ok"
            : (member.configured && member.workDirExists && member.workDirWritable ? "warn" : "fail");
        return {
            key: (0, collaboration_runtime_plan_tools_part_01_1.getAgentProbeTargetStatusKey)(target),
            status,
            ready: taskReadiness.ready === true,
            group_id: group.id,
            group_name: group.name || group.id,
            project: member.project,
            role: member.role || "member",
            agent_type: target.agent_type,
            effective_agent_type: fallbackRow?.effective_agent_type || target.agent_type,
            fallback_active: fallbackRow?.fallback_active === true,
            runtime_candidates: fallbackRow?.runtime_candidates || [],
            command: (0, runtime_1.getAgentCommandLabel)(fallbackRow?.effective_agent_type || target.agent_type),
            configured: !!member.configured,
            workDir: member.workDir || "",
            workDirExists: !!member.workDirExists,
            workDirWritable: !!member.workDirWritable,
            probe,
            probeHealth,
            readiness: {
                ready: taskReadiness.ready === true,
                mode: taskReadiness.mode || "",
                message: taskReadiness.message || probeHealth.message || "",
                fix_actions: Array.isArray(taskReadiness.fix_actions) ? taskReadiness.fix_actions : [],
            },
            checked_at: probe?.checked_at || "",
            age_ms: probe?.age_ms ?? null,
            message: taskReadiness.ready === true
                ? "目标项目 Agent 可执行 daily_dev"
                : (taskReadiness.message || probeHealth.message || "目标项目 Agent 尚未通过探针"),
        };
    }));
    const executable = targets.filter((target) => target.configured && target.workDirExists && target.workDirWritable);
    const ready = executable.filter((target) => target.ready);
    const stale = executable.filter((target) => target.probeHealth?.status === "stale_ok" || target.probeHealth?.status === "stale_failed");
    const missing = executable.filter((target) => target.probeHealth?.status === "missing");
    const failedRecent = executable.filter((target) => target.probeHealth?.failureRecent);
    const groupSummaries = devGroups.map((group) => {
        const groupTargets = (0, collaboration_runtime_plan_tools_part_01_1.getExecutableProbeTargetsFromDevGroup)(group);
        const summary = (0, collaboration_runtime_plan_tools_part_01_1.summarizeAgentProbeTargets)(groupTargets);
        return {
            group_id: group.id,
            group_name: group.name || group.id,
            orchestratorEnabled: group.orchestratorEnabled !== false,
            executable: summary.total,
            ready: summary.ready,
            missing: summary.missing,
            stale: summary.stale,
            failed_recent: summary.failed_recent,
            all_ready: summary.allReady,
            targets: summary.rows.map((row) => ({
                project: row.project,
                agent_type: row.agent_type,
                effective_agent_type: row.effective_agent_type || row.agent_type,
                fallback_active: row.fallback_active === true,
                ready: row.ready,
                probe_status: row.probeHealth?.status || "missing",
            })),
        };
    });
    const fullyReadyGroups = groupSummaries.filter((group) => group.orchestratorEnabled && group.executable > 0 && group.all_ready);
    return {
        total: targets.length,
        executable: executable.length,
        ready: ready.length,
        blocked: targets.filter((target) => !target.ready).length,
        missing: missing.length,
        stale: stale.length,
        failed_recent: failedRecent.length,
        group_total: groupSummaries.length,
        group_ready: fullyReadyGroups.length,
        groups: groupSummaries,
        targets,
    };
}
function buildDailyDevAgentDiagnostics() {
    return require("./collaboration-agent-probes").buildDailyDevAgentDiagnostics();
}
function getAgentProbeBatchTargets(payload = {}) {
    const diagnostics = buildDailyDevAgentDiagnostics();
    const includeReady = !!(payload.include_ready || payload.includeReady);
    const onlyMissing = !!(payload.only_missing || payload.onlyMissing);
    const groupId = String(payload.group_id || payload.groupId || "").trim();
    const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
    const requestedKeys = new Set(requestedTargets.map((target) => [
        String(target.group_id || target.groupId || "").trim(),
        String(target.target_member || target.targetMember || target.project || "").trim(),
    ].filter(Boolean).join("::")).filter(Boolean));
    const limit = Math.max(1, Math.min(20, Number(payload.limit || requestedTargets.length || 3)));
    const targets = (diagnostics.agent_probe_matrix?.targets || [])
        .filter((target) => target.configured && target.workDirExists && target.workDirWritable)
        .filter((target) => !groupId || target.group_id === groupId)
        .filter((target) => {
        if (requestedKeys.size === 0)
            return true;
        return requestedKeys.has(`${target.group_id}::${target.project}`) || requestedKeys.has(target.group_id) || requestedKeys.has(target.project);
    })
        .filter((target) => includeReady || !target.ready)
        .filter((target) => !onlyMissing || target.probeHealth?.status === "missing")
        .slice(0, limit);
    return { targets, diagnostics, limit, includeReady, onlyMissing };
}
async function runAgentCliProbeBatch(payload, ctx) {
    const selection = getAgentProbeBatchTargets(payload);
    const timeoutMs = Number(payload.timeout_ms || payload.timeoutMs || 120000);
    const dryRun = !!(payload.dry_run || payload.dryRun);
    if (dryRun) {
        return {
            success: true,
            dry_run: true,
            total: selection.targets.length,
            passed: 0,
            failed: 0,
            skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
            limit: selection.limit,
            include_ready: selection.includeReady,
            only_missing: selection.onlyMissing,
            auto_resume: false,
            resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
            targets: selection.targets.map((target) => ({
                group_id: target.group_id,
                group_name: target.group_name,
                project: target.project,
                agent_type: target.agent_type,
                command: target.command,
                probe_status: target.probeHealth?.status || "missing",
            })),
            probe_matrix: selection.diagnostics.agent_probe_matrix,
            message: selection.targets.length === 0 ? "没有需要批量复检的可执行项目 Agent" : `将复检 ${selection.targets.length} 个项目 Agent`,
        };
    }
    const results = [];
    for (const target of selection.targets) {
        const result = await (0, collaboration_runtime_daily_dev_1.runAgentCliProbe)({
            ...payload,
            group_id: target.group_id,
            target_member: target.project,
            timeout_ms: timeoutMs,
            source: "agent-cli-probe-batch",
        }, ctx);
        results.push({
            group_id: target.group_id,
            group_name: target.group_name,
            project: target.project,
            agent_type: target.agent_type,
            success: !!result?.success,
            blocked: !!result?.blocked,
            message: result?.message || result?.error || "",
            result,
        });
    }
    const after = buildDailyDevAgentDiagnostics();
    return {
        success: results.some((item) => item.success),
        total: selection.targets.length,
        passed: results.filter((item) => item.success).length,
        failed: results.filter((item) => !item.success).length,
        skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
        limit: selection.limit,
        include_ready: selection.includeReady,
        only_missing: selection.onlyMissing,
        timeout_ms: timeoutMs,
        auto_resume: false,
        resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
        results,
        probe_matrix: after.agent_probe_matrix,
        message: results.length === 0
            ? "没有需要批量复检的可执行项目 Agent"
            : `批量复检完成：通过 ${results.filter((item) => item.success).length}/${results.length}`,
    };
}
function buildCoordinatorSharedFilesContext(ctx, group) {
    const content = ctx.buildFilesContext(group?.shared_files || [], "以下是群聊共享文档/文件（主 Agent 拆分任务时必须读取，并在子 Agent 工作单中引用相关文档、接口、字段、业务规则或验收要求）：");
    return content.trim() ? content : undefined;
}
function buildTaskSourceDocumentsContext(task) {
    const lines = [
        "[任务级业务/接口文档]",
        task?.business_goal || task?.businessGoal ? `业务目标：${(0, memory_1.compactMemoryText)(task.business_goal || task.businessGoal, 600)}` : "",
        task?.acceptance_criteria || task?.acceptanceCriteria ? `验收标准：${(0, memory_1.compactMemoryText)(task.acceptance_criteria || task.acceptanceCriteria, 800)}` : "",
        task?.source_documents || task?.sourceDocuments ? `关联文档：${(0, memory_1.compactMemoryText)(task.source_documents || task.sourceDocuments, 12_000)}` : "",
        task?.source_attachment_context || task?.sourceAttachmentContext
            ? (0, memory_1.compactMemoryText)(task.source_attachment_context || task.sourceAttachmentContext, 50_000)
            : "",
    ].filter(Boolean);
    return lines.length > 1 ? lines.join("\n") : "";
}
function mergeCoordinatorDocumentContexts(...contexts) {
    const text = contexts
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n\n");
    return text || undefined;
}
function runCollaborationProtocolSelfTest() {
    return require("./collaboration-protocol-self-tests").runCollaborationProtocolSelfTest();
}
function normalizeToolSelection(tools = {}) {
    return {
        mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x) => String(x || "").trim()).filter(Boolean) : [],
        skill: Array.isArray(tools.skill) ? tools.skill.map((x) => String(x || "").trim()).filter(Boolean) : [],
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
    return {
        mcp: Array.from(merged.mcp),
        skill: Array.from(merged.skill),
    };
}
function getProjectToolSelection(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
}
function getProjectExtraConfig(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return configs?.[projectName] || {};
}
function normalizeProjectConfigList(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function getProjectAgentCapabilityProfile(projectName, workDir = "") {
    const config = getProjectExtraConfig(projectName);
    const verification = (0, collaboration_runtime_runtime_tools_1.getProjectVerificationHintDetail)(projectName, workDir);
    const responsibility = String(config.responsibility || config.role_scope || config.roleScope || "").trim();
    const capabilities = normalizeProjectConfigList(config.capabilities || config.capability_tags || config.capabilityTags);
    const writablePaths = normalizeProjectConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths);
    const forbiddenPaths = normalizeProjectConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths);
    const deliveryContract = String(config.delivery_contract || config.deliveryContract || "").trim();
    return {
        project: projectName,
        configured: !!(responsibility || capabilities.length || writablePaths.length || forbiddenPaths.length || deliveryContract || verification.commands.length),
        responsibility,
        capabilities,
        writable_paths: writablePaths,
        forbidden_paths: forbiddenPaths,
        delivery_contract: deliveryContract,
        verification_source: verification.source,
        verification_commands: verification.commands,
        work_dir: workDir || "",
    };
}
function buildProjectAgentProfileContractLines(profile) {
    return require("./collaboration-coordination-ux").buildProjectAgentProfileContractLines.apply(null, arguments);
}
function normalizePolicyPath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}
function policyPathMatches(filePath, pattern) {
    const file = normalizePolicyPath(filePath);
    const raw = normalizePolicyPath(pattern);
    if (!raw || raw === "**" || raw === "**/*" || raw === "*")
        return true;
    const prefix = raw.replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
    return file === prefix || file.startsWith(`${prefix}/`);
}
function collectProjectPolicyViolations(actualFileChanges = [], evidenceExclusions = []) {
    const violations = [];
    const excludedPaths = new Set((evidenceExclusions || []).map((item) => normalizePolicyPath(typeof item === "string" ? item : item?.path)).filter(Boolean));
    for (const change of actualFileChanges || []) {
        const agent = String(change?.agent || "").trim();
        const filePath = normalizePolicyPath(change?.path);
        if (!agent || !filePath)
            continue;
        if (excludedPaths.has(filePath))
            continue;
        const profile = getProjectAgentCapabilityProfile(agent);
        const writable = Array.isArray(profile.writable_paths) ? profile.writable_paths : [];
        const forbidden = Array.isArray(profile.forbidden_paths) ? profile.forbidden_paths : [];
        // These directories are generated by CCM while preparing native runtimes.
        // They are orchestration metadata, not an agent-authored project deliverable.
        if ([".claude", ".cursor", ".codex"].some(prefix => filePath === prefix || filePath.startsWith(`${prefix}/`)))
            continue;
        // Older evidence produced before the porcelain parser fix may be missing the
        // first character of a tracked path (for example `ackend/` -> `backend/`).
        // Reconcile only when it unambiguously matches a configured writable prefix.
        const repairedPath = writable.reduce((current, pattern) => {
            if (current !== filePath)
                return current;
            const prefix = normalizePolicyPath(pattern).replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
            if (prefix.length > 1 && (filePath === prefix.slice(1) || filePath.startsWith(`${prefix.slice(1)}/`))) {
                return `${prefix[0]}${filePath}`;
            }
            return current;
        }, filePath);
        const forbiddenMatch = forbidden.find((pattern) => policyPathMatches(repairedPath, pattern));
        if (forbiddenMatch) {
            violations.push({ agent, path: repairedPath, rule: "forbidden_paths", pattern: forbiddenMatch, message: `${agent} 修改了禁止范围 ${forbiddenMatch}: ${repairedPath}` });
            continue;
        }
        const hasStrictWritable = writable.length > 0 && !writable.some((pattern) => ["**", "**/*", "*"].includes(normalizePolicyPath(pattern)));
        if (hasStrictWritable && !writable.some((pattern) => policyPathMatches(repairedPath, pattern))) {
            violations.push({ agent, path: repairedPath, rule: "writable_paths", pattern: writable.join("; "), message: `${agent} 文件变更不在允许写入范围: ${repairedPath}` });
        }
    }
    return violations;
}
function buildAgentToolContext(ctx, group, projectName, taskText = "") {
    const selectedRoleSkills = (0, role_skills_1.selectRoleSkills)("project-child-agent", taskText, { forceWork: true, phase: "execution" });
    const allowedTools = (0, tool_authorization_1.normalizeToolAuthorization)(mergeToolSelections(group?.tools || {}, getProjectToolSelection(projectName), { skill: selectedRoleSkills.map(skill => skill.name) }));
    const prompt = [
        (0, role_skills_1.buildSelectedSkillUsageDirective)(selectedRoleSkills),
        ctx.toolManager.buildToolPrompt(allowedTools),
    ].filter(Boolean).join("\n\n");
    const toolAudit = typeof ctx.toolManager.buildScopeAudit === "function" ? ctx.toolManager.buildScopeAudit(allowedTools) : null;
    const authorizationReadiness = (0, tool_authorization_1.buildAuthorizationReadiness)(toolAudit, allowedTools);
    return {
        prompt,
        allowedTools,
        toolAudit,
        authorizationReadiness,
        selectedRoleSkills: selectedRoleSkills.map(skill => ({ name: skill.name, kind: skill.kind, reason: skill.reason })),
    };
}
//# sourceMappingURL=collaboration-runtime-plan-tools-part-02.js.map