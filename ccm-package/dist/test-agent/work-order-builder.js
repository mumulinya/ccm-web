"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTestAgentWorkOrderFromHandoff = buildTestAgentWorkOrderFromHandoff;
const utils_1 = require("./utils");
function text(value) {
    return String(value || "").trim();
}
function uniqueStrings(values) {
    const seen = new Set();
    const out = [];
    for (const value of values) {
        const item = text(value);
        if (!item || seen.has(item))
            continue;
        seen.add(item);
        out.push(item);
    }
    return out;
}
function projectName(project, index) {
    return text(project.name) || `project-${index + 1}`;
}
function completedTaskCriteria(tasks) {
    return uniqueStrings(tasks).map(task => `Completed task is independently verified: ${task}`);
}
function inferRequiredChecks(projects, options) {
    const checks = [];
    const add = (check) => checks.push(check);
    for (const project of projects) {
        if ((0, utils_1.asArray)(project.verificationCommands || project.verification_commands).length)
            add("commands");
        if (project.targetUrl || project.target_url || project.startupUrl || project.startup_url || (0, utils_1.asArray)(project.httpChecks || project.http_checks || project.apiChecks || project.api_checks).length)
            add("http");
        const hasBrowserSurface = !!(project.targetUrl || project.target_url)
            || (0, utils_1.asArray)(project.browserChecks || project.browser_checks).length > 0
            || (0, utils_1.asArray)(project.adversarialBrowserChecks || project.adversarial_browser_checks).length > 0
            || (0, utils_1.asArray)(project.adversarialBrowserProbeTemplates || project.adversarial_browser_probe_templates).length > 0;
        if (hasBrowserSurface) {
            add("browser_e2e");
            add("screenshots");
            add("console_errors");
            add("browser_snapshots");
            add("browser_accessibility_snapshot");
            add("browser_console_logs");
            add("browser_network_logs");
            if (options?.collectBrowserArtifacts !== false && options?.browserProvider !== "none") {
                add("browser_trace");
                add("browser_har");
            }
        }
        if ((0, utils_1.asArray)(project.adversarialHttpChecks || project.adversarial_http_checks || project.adversarialApiChecks || project.adversarial_api_checks).length
            || (0, utils_1.asArray)(project.adversarialBrowserChecks || project.adversarial_browser_checks).length
            || (0, utils_1.asArray)(project.adversarialBrowserProbeTemplates || project.adversarial_browser_probe_templates).length) {
            add("adversarial");
        }
    }
    if (options?.requireAdversarialProbe !== false)
        add("adversarial");
    return uniqueStrings(checks);
}
function buildProject(project, index, warnings) {
    const name = projectName(project, index);
    const workDir = text(project.workDir || project.work_dir);
    if (!workDir)
        warnings.push(`Project "${name}" is missing workDir; TestAgent validation will reject the work order until a workDir is supplied.`);
    const completedTasks = uniqueStrings((0, utils_1.asArray)(project.completedTasks || project.completed_tasks));
    const acceptanceCriteria = uniqueStrings((0, utils_1.asArray)(project.acceptanceCriteria || project.acceptance_criteria));
    const agentSummaryParts = [
        text(project.agentSummary || project.agent_summary),
        completedTasks.length ? `Completed tasks: ${completedTasks.join("; ")}` : "",
        acceptanceCriteria.length ? `Project acceptance criteria: ${acceptanceCriteria.join("; ")}` : "",
    ].filter(Boolean);
    return {
        name,
        workDir,
        runCommand: text(project.runCommand || project.run_command),
        devServerCommand: text(project.devServerCommand || project.dev_server_command),
        targetUrl: text(project.targetUrl || project.target_url),
        startupUrl: text(project.startupUrl || project.startup_url),
        startupTimeoutMs: project.startupTimeoutMs || project.startup_timeout_ms,
        env: project.env,
        changedFiles: uniqueStrings((0, utils_1.asArray)(project.changedFiles || project.changed_files)),
        verificationCommands: uniqueStrings((0, utils_1.asArray)(project.verificationCommands || project.verification_commands)),
        httpChecks: (0, utils_1.asArray)(project.httpChecks || project.http_checks || project.apiChecks || project.api_checks),
        adversarialHttpChecks: (0, utils_1.asArray)(project.adversarialHttpChecks || project.adversarial_http_checks || project.adversarialApiChecks || project.adversarial_api_checks),
        browserChecks: (0, utils_1.asArray)(project.browserChecks || project.browser_checks),
        adversarialBrowserChecks: (0, utils_1.asArray)(project.adversarialBrowserChecks || project.adversarial_browser_checks),
        adversarialBrowserProbeTemplates: (0, utils_1.asArray)(project.adversarialBrowserProbeTemplates || project.adversarial_browser_probe_templates),
        agentSummary: agentSummaryParts.join("\n"),
        risks: uniqueStrings((0, utils_1.asArray)(project.risks)),
    };
}
function buildTestAgentWorkOrderFromHandoff(input) {
    const warnings = [];
    const rawProjects = [
        ...(0, utils_1.asArray)(input.projects),
        ...(input.project ? [input.project] : []),
    ];
    if (!rawProjects.length)
        warnings.push("No project targets were supplied; TestAgent validation requires at least one project.");
    const projects = rawProjects.map((project, index) => buildProject(project, index, warnings));
    const globalCompletedTasks = uniqueStrings((0, utils_1.asArray)(input.completedTasks || input.completed_tasks));
    const projectCompletedTasks = rawProjects.flatMap(project => (0, utils_1.asArray)(project.completedTasks || project.completed_tasks));
    const acceptanceCriteria = uniqueStrings([
        ...(0, utils_1.asArray)(input.acceptanceCriteria || input.acceptance_criteria),
        ...rawProjects.flatMap(project => (0, utils_1.asArray)(project.acceptanceCriteria || project.acceptance_criteria)),
        ...completedTaskCriteria([...globalCompletedTasks, ...projectCompletedTasks]),
    ]);
    if (!acceptanceCriteria.length)
        warnings.push("No acceptance criteria or completed tasks were supplied; coverage will be weaker.");
    const explicitRequiredChecks = uniqueStrings([
        ...(0, utils_1.asArray)(input.requiredChecks || input.required_checks),
        ...rawProjects.flatMap(project => (0, utils_1.asArray)(project.requiredChecks || project.required_checks)),
    ]);
    const options = {
        verificationOnly: true,
        browserProvider: "auto",
        autoDiscoverVerificationCommands: true,
        collectBrowserArtifacts: true,
        requireAdversarialProbe: true,
        ...(input.options || {}),
    };
    const inferredRequiredChecks = inferRequiredChecks(projects, options);
    const workOrder = {
        schema: "ccm-test-agent-work-order-v1",
        id: text(input.id) || (0, utils_1.makeRunId)("test-agent-handoff"),
        taskId: text(input.taskId || input.task_id),
        groupId: text(input.groupId || input.group_id),
        issuedBy: text(input.issuedBy || input.issued_by || "group-main-agent"),
        originalUserGoal: text(input.originalUserGoal || input.original_user_goal),
        acceptanceCriteria,
        requiredChecks: uniqueStrings([...explicitRequiredChecks, ...inferredRequiredChecks]),
        projects,
        options,
        metadata: {
            ...(input.metadata || {}),
            handoffSource: text(input.metadata?.handoffSource) || "test-agent-handoff-builder",
            completedByProjectAgents: uniqueStrings((0, utils_1.asArray)(input.completedByProjectAgents || input.completed_by_project_agents)),
            ...(warnings.length ? { handoffWarnings: warnings.slice() } : {}),
        },
    };
    return { workOrder, warnings };
}
//# sourceMappingURL=work-order-builder.js.map