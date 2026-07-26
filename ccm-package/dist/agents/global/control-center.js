"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyGlobalControlIntent = classifyGlobalControlIntent;
exports.buildGlobalDispatchStrategy = buildGlobalDispatchStrategy;
exports.buildGlobalSystemHealth = buildGlobalSystemHealth;
exports.buildGlobalGovernanceSnapshot = buildGlobalGovernanceSnapshot;
exports.buildGlobalSupervisionDashboard = buildGlobalSupervisionDashboard;
exports.buildGlobalControlCenterSnapshot = buildGlobalControlCenterSnapshot;
exports.runGlobalControlCenterSelfTest = runGlobalControlCenterSelfTest;
const db_1 = require("../../core/db");
const collaboration_1 = require("../../modules/collaboration/collaboration");
const mission_supervisor_1 = require("./mission-supervisor");
const loop_1 = require("./loop");
const runtime_1 = require("./runtime");
function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function compact(value, max = 220) {
    const raw = text(value);
    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}
function riskOf(spec, args = {}) {
    try {
        return typeof spec?.risk === "function" ? spec.risk(args) : spec?.risk || "dynamic";
    }
    catch {
        return "dynamic";
    }
}
function projectRows(projects = (0, db_1.getConfigs)()) {
    return projects.map((config) => {
        const info = (0, db_1.getConfigInfo)(config.path)?.[0] || {};
        return {
            name: config.name,
            work_dir: info.workDir || "",
            agent: info.agent || "claudecode",
            platform: info.platform || "",
            configured: !!info.workDir,
        };
    });
}
function groupRows(groups = (0, collaboration_1.loadGroups)()) {
    return groups.map((group) => ({
        id: group.id,
        name: group.name,
        members: Array.isArray(group.members) ? group.members : [],
        member_count: Array.isArray(group.members) ? group.members.length : 0,
    }));
}
function classifyGlobalControlIntent(_message, resources = {}) {
    const decision = resources.workflowDecision || resources.workflow_decision || null;
    const needsClarification = Array.isArray(decision?.clarificationQuestions) && decision.clarificationQuestions.length > 0;
    const route = !decision
        ? "ambiguous"
        : needsClarification
            ? "ambiguous"
            : decision.intentKind === "status"
                ? "system_health"
                : decision.intentKind === "management"
                    ? "system_management"
                    : decision.intentKind === "execution"
                        ? "development_dispatch"
                        : "ordinary_question";
    const targets = Array.isArray(decision?.targetRefs) ? decision.targetRefs : [];
    return {
        route,
        confidence: Number(decision?.confidence || 0),
        reason: decision?.reason || "需要统一大模型形成语义决定",
        recommended_tool: decision?.recommendedTool || "",
        matched_projects: targets.filter((item) => item.type === "project").map((item) => item.id || item.name),
        matched_groups: targets.filter((item) => item.type === "group").map((item) => ({ id: item.id, name: item.name || item.id })),
        dry_run: {
            will_execute: decision?.actionRequired === true,
            requires_confirmation: decision?.requiresUserConfirmation === true,
            needs_clarification: needsClarification || !decision,
            safe_default: decision?.actionRequired !== true,
        },
    };
}
function buildGlobalDispatchStrategy(_message, resources = {}) {
    const decision = resources.workflowDecision || resources.workflow_decision || null;
    const targets = Array.isArray(decision?.targetRefs) ? decision.targetRefs : [];
    const mode = decision?.mode || "model_required";
    return {
        mode,
        confidence: Number(decision?.confidence || 0),
        targets,
        missing: Array.isArray(decision?.clarificationQuestions) ? decision.clarificationQuestions : ["需要模型语义决定"],
        instruction: decision?.reason || "控制中心不执行本地语义路由",
    };
}
function buildGlobalSystemHealth(resources = {}) {
    const projects = resources.projects || projectRows();
    const groups = resources.groups || groupRows();
    const tasks = resources.tasks || (0, db_1.loadTasks)();
    const cronJobs = resources.cronJobs || (0, db_1.loadCronJobs)();
    const mcpTools = resources.mcpTools || (0, db_1.loadMcpTools)();
    const skills = resources.skills || (0, db_1.loadSkills)();
    const supervisors = resources.supervisors || (0, mission_supervisor_1.listGlobalMissionSupervisors)({ limit: 100 });
    const missions = resources.missions || (0, collaboration_1.refreshGlobalDevelopmentMissions)();
    const activeTasks = tasks.filter((task) => ["pending", "queued", "in_progress", "running"].includes(String(task.status)));
    const failedTasks = tasks.filter((task) => ["failed", "error"].includes(String(task.status)));
    const waitingSupervisors = supervisors.filter((item) => item.status === "waiting_user");
    const failedSupervisors = supervisors.filter((item) => ["failed", "cancelled"].includes(String(item.status)));
    const rows = [
        {
            id: "projects",
            label: "项目配置",
            severity: projects.some((item) => !item.configured) ? "warn" : "ok",
            summary: `${projects.length} 个项目，${projects.filter((item) => !item.configured).length} 个缺少工作目录`,
        },
        {
            id: "groups",
            label: "群聊主 Agent",
            severity: groups.some((item) => !item.member_count) ? "warn" : "ok",
            summary: `${groups.length} 个群聊，${groups.filter((item) => !item.member_count).length} 个无成员`,
        },
        {
            id: "tasks",
            label: "任务队列",
            severity: failedTasks.length ? "error" : activeTasks.length > 10 ? "warn" : "ok",
            summary: `${activeTasks.length} 个活跃任务，${failedTasks.length} 个失败任务`,
        },
        {
            id: "supervisors",
            label: "全局任务跟进",
            severity: failedSupervisors.length ? "error" : waitingSupervisors.length ? "warn" : "ok",
            summary: `${supervisors.length} 个跟进任务，${waitingSupervisors.length} 个等待人工，${failedSupervisors.length} 个异常终态`,
        },
        {
            id: "cron",
            label: "定时调度",
            severity: cronJobs.some((job) => job.enabled === false) ? "warn" : "ok",
            summary: `${cronJobs.length} 个定时任务，${cronJobs.filter((job) => job.enabled === false).length} 个停用`,
        },
        {
            id: "tools",
            label: "MCP / Skill",
            severity: !mcpTools.length && !skills.length ? "warn" : "ok",
            summary: `${mcpTools.length} 个 MCP，${skills.length} 个 Skill`,
        },
    ].map(row => ({ ...row, detail: row.summary }));
    const severity = rows.some(row => row.severity === "error") ? "error" : rows.some(row => row.severity === "warn") ? "warn" : "ok";
    return {
        severity,
        score: Math.max(0, 100 - rows.filter(row => row.severity === "warn").length * 10 - rows.filter(row => row.severity === "error").length * 25),
        rows,
        counts: {
            projects: projects.length,
            groups: groups.length,
            active_tasks: activeTasks.length,
            failed_tasks: failedTasks.length,
            supervisors: supervisors.length,
            missions: missions.length,
            cron_jobs: cronJobs.length,
            mcp_tools: mcpTools.length,
            skills: skills.length,
        },
    };
}
function buildGlobalGovernanceSnapshot() {
    const tools = (0, runtime_1.buildGlobalAgentToolDefinitions)(loop_1.GLOBAL_AGENT_TOOL_SPECS);
    const permissions = (0, runtime_1.loadGlobalAgentPermissionRules)();
    const hooks = (0, runtime_1.loadGlobalAgentHooks)();
    const highRiskTools = loop_1.GLOBAL_AGENT_TOOL_SPECS
        .filter(spec => riskOf(spec, { operation: "delete" }) === "high" || riskOf(spec) === "high")
        .map(spec => spec.name);
    return {
        tools,
        summary: {
            tools: tools.length,
            high_risk_tools: highRiskTools.length,
            permission_rules: permissions.length,
            deny_rules: permissions.filter(rule => rule.decision === "deny").length,
            allow_rules: permissions.filter(rule => rule.decision === "allow").length,
            hooks: hooks.length,
            blocking_hooks: hooks.filter(hook => hook.effect === "block").length,
        },
        high_risk_tools: highRiskTools,
        permissions,
        hooks,
    };
}
function buildGlobalSupervisionDashboard(resources = {}) {
    const supervisors = resources.supervisors || (0, mission_supervisor_1.listGlobalMissionSupervisors)({ limit: 50 });
    return {
        total: supervisors.length,
        rows: supervisors.slice(0, 20).map((item) => ({
            id: item.id,
            mission_id: item.mission_id,
            global_run_id: item.global_run_id,
            status: item.status,
            phase: item.phase,
            business_goal: compact(item.business_goal, 120),
            cycle_count: item.cycle_count,
            max_attempts: item.max_attempts,
            next_check_at: item.next_check_at,
            updated_at: item.updated_at,
            waiting: item.status === "waiting_user",
            failed: ["failed", "cancelled"].includes(String(item.status)),
        })),
    };
}
function buildGlobalControlCenterSnapshot(message = "") {
    const projects = projectRows();
    const groups = groupRows();
    const intent = message ? {
        route: "model_required",
        confidence: 0,
        reason: "请使用 /api/global-agent/control-center/intent-preview 获取统一大模型语义决策",
        recommended_tool: "",
    } : null;
    const dispatch = { mode: "model_required", targets: [], reason: "控制中心快照不执行本地语义推断" };
    return {
        updated_at: new Date().toISOString(),
        intent,
        dispatch,
        health: buildGlobalSystemHealth({ projects, groups }),
        governance: buildGlobalGovernanceSnapshot(),
        supervision: buildGlobalSupervisionDashboard(),
    };
}
function runGlobalControlCenterSelfTest() {
    const resources = {
        projects: [{ name: "demo", configured: true }, { name: "api", configured: true }],
        groups: [{ id: "g1", name: "研发群", member_count: 2, members: [{ project: "demo" }] }],
        tasks: [{ id: "t1", status: "running" }, { id: "t2", status: "failed" }],
        cronJobs: [{ id: "c1", enabled: false }],
        mcpTools: [{ name: "mcp-a" }],
        skills: [{ name: "skill-a" }],
        supervisors: [{ id: "s1", mission_id: "m1", status: "waiting_user", phase: "supervising", business_goal: "demo", cycle_count: 1, max_attempts: 3 }],
        missions: [{ id: "m1" }],
    };
    const workflowDecision = {
        intentKind: "execution",
        actionRequired: true,
        confidence: 0.94,
        reason: "模型选择研发群与 demo 项目执行开发任务",
        mode: "group_main_agent",
        targetRefs: [{ type: "group", id: "g1", name: "研发群" }, { type: "project", id: "demo", name: "demo" }],
        clarificationQuestions: [],
        requiresUserConfirmation: false,
    };
    const intent = classifyGlobalControlIntent("fixture", { ...resources, workflowDecision });
    const health = buildGlobalSystemHealth(resources);
    const dispatch = buildGlobalDispatchStrategy("fixture", { ...resources, workflowDecision });
    const governance = buildGlobalGovernanceSnapshot();
    const checks = {
        developmentRoutesToDispatch: intent.route === "development_dispatch" && intent.recommended_tool === "orchestrate_development",
        healthFindsWarningsAndErrors: ["warn", "error"].includes(health.severity) && health.counts.failed_tasks === 1,
        dispatchFindsGroupAndProject: dispatch.targets.some((item) => item.type === "group") && dispatch.targets.some((item) => item.type === "project"),
        governanceHasTools: governance.summary.tools > 0,
    };
    return { pass: Object.values(checks).every(Boolean), checks, intent, health, dispatch };
}
//# sourceMappingURL=control-center.js.map