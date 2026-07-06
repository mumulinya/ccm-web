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
function includesAny(value, patterns) {
    return patterns.some(pattern => pattern.test(value));
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
function matchProjects(message, projects) {
    const lower = message.toLowerCase();
    return projects.filter(project => lower.includes(String(project.name || "").toLowerCase()));
}
function matchGroups(message, groups) {
    const lower = message.toLowerCase();
    return groups.filter(group => lower.includes(String(group.id || "").toLowerCase()) || lower.includes(String(group.name || "").toLowerCase()));
}
function classifyGlobalControlIntent(message, resources = {}) {
    const input = text(message);
    const projects = resources.projects || projectRows();
    const groups = resources.groups || groupRows();
    const matchedProjects = matchProjects(input, projects);
    const matchedGroups = matchGroups(input, groups);
    const wantsHealth = includesAny(input, [/健康|状态|巡检|体检|诊断|检查系统|系统概况/]);
    const wantsGovernance = includesAny(input, [/权限|授权|hook|拦截|治理|规则|审计|影子模式|高风险/]);
    const wantsSupervision = includesAny(input, [/监工|监督|全局任务|mission|验收|等待人工|恢复|暂停|取消/]);
    const wantsDevelopment = includesAny(input, [/实现|修复|修改|新增|开发|重构|优化|测试|排查|上线|部署|提交|审查/]);
    const wantsManagement = includesAny(input, [/创建|删除|启动|停止|重启|恢复|暂停|定时任务|群聊|项目|工具|mcp|skill|任务队列/]);
    const questionOnly = includesAny(input, [/怎么|如何|为什么|是什么|介绍|说明|能不能|可不可以|有哪些|有什么|[?？]$/]);
    let route = "ordinary_question";
    let confidence = 0.72;
    let reason = "普通问答或闲聊，不需要执行 CCM 系统动作";
    let recommended_tool = "";
    if (!input) {
        route = "ambiguous";
        confidence = 0.2;
        reason = "消息为空，无法判断";
    }
    else if (wantsGovernance) {
        route = "governance";
        confidence = 0.9;
        reason = "用户关注全局 Agent 权限、Hook、审计或治理规则";
        recommended_tool = "runtime_governance";
    }
    else if (wantsSupervision) {
        route = "mission_supervision";
        confidence = 0.88;
        reason = "用户关注全局任务监督、验收、恢复或人工介入";
        recommended_tool = "manage_supervision";
    }
    else if (wantsHealth && !wantsDevelopment) {
        route = "system_health";
        confidence = 0.9;
        reason = "用户要求查看或诊断 CCM 系统健康状态";
        recommended_tool = "inspect_system";
    }
    else if (wantsDevelopment && (matchedProjects.length || matchedGroups.length || /全局|全部|所有|跨项目|整个/.test(input))) {
        route = "development_dispatch";
        confidence = matchedProjects.length || matchedGroups.length ? 0.92 : 0.78;
        reason = "用户要求开发落地，应由全局 Agent 调度群聊主 Agent 或项目 Agent";
        recommended_tool = "orchestrate_development";
    }
    else if (wantsManagement && !questionOnly) {
        route = "system_management";
        confidence = 0.82;
        reason = "用户要求管理 CCM 资源或执行系统动作";
        recommended_tool = "manage_task";
    }
    else if (questionOnly && wantsDevelopment) {
        route = "ordinary_question";
        confidence = 0.78;
        reason = "用户在咨询开发问题，未明确授权派发或修改";
    }
    else if (wantsDevelopment) {
        route = "ambiguous";
        confidence = 0.58;
        reason = "存在开发意图，但缺少明确目标项目、群聊或范围";
        recommended_tool = "needs_clarification";
    }
    return {
        route,
        confidence,
        reason,
        recommended_tool,
        matched_projects: matchedProjects.map((item) => item.name),
        matched_groups: matchedGroups.map((item) => ({ id: item.id, name: item.name })),
        dry_run: {
            will_execute: ["development_dispatch", "mission_supervision", "system_management"].includes(route),
            requires_confirmation: route === "system_management" && /删除|移除|清除|purge|delete/i.test(input),
            needs_clarification: route === "ambiguous",
            safe_default: route === "ordinary_question" || route === "system_health" || route === "governance",
        },
    };
}
function buildGlobalDispatchStrategy(message, resources = {}) {
    const input = text(message);
    const projects = resources.projects || projectRows();
    const groups = resources.groups || groupRows();
    const matchedProjects = matchProjects(input, projects);
    const matchedGroups = matchGroups(input, groups);
    const workspaceWide = /全局|全部|所有|跨项目|整个/.test(input);
    const targets = [
        ...matchedGroups.map((group) => ({ type: "group", id: group.id, name: group.name, reason: "命中群聊名称或 ID，由群聊主 Agent 协调成员项目" })),
        ...matchedProjects.map((project) => ({ type: "project", id: project.name, name: project.name, reason: "命中项目名称，由项目 Agent 直接执行或作为 mission 子目标" })),
    ];
    if (!targets.length && workspaceWide) {
        targets.push(...projects.slice(0, 12).map((project) => ({ type: "project", id: project.name, name: project.name, reason: "用户要求全局/跨项目覆盖" })));
    }
    const mode = matchedGroups.length ? "group_main_agent" : targets.length > 1 ? "global_mission" : targets.length === 1 ? "direct_project_or_mission" : "needs_target";
    return {
        mode,
        confidence: targets.length ? 0.88 : 0.45,
        targets,
        missing: targets.length ? [] : ["目标项目或群聊", "允许影响范围", "验收标准"],
        instruction: targets.length
            ? `建议由全局 Agent 创建 mission，并按 ${mode === "group_main_agent" ? "群聊主 Agent" : "项目 Agent"} 路由执行。`
            : "需要先向用户澄清目标项目/群聊和验收标准。",
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
            label: "全局任务监工",
            severity: failedSupervisors.length ? "error" : waitingSupervisors.length ? "warn" : "ok",
            summary: `${supervisors.length} 个监工，${waitingSupervisors.length} 个等待人工，${failedSupervisors.length} 个异常终态`,
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
    const resources = { projects, groups };
    const intent = classifyGlobalControlIntent(message, resources);
    const dispatch = buildGlobalDispatchStrategy(message, resources);
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
    const intent = classifyGlobalControlIntent("请给研发群修复 demo 登录问题并验证", resources);
    const health = buildGlobalSystemHealth(resources);
    const dispatch = buildGlobalDispatchStrategy("请给研发群修复 demo 登录问题并验证", resources);
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