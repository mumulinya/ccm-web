"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTestAgentExecutionPlan = buildTestAgentExecutionPlan;
const shared_1 = require("./browser/shared");
const command_planner_1 = require("./command-planner");
const utils_1 = require("./utils");
const work_order_1 = require("./work-order");
function issueKey(issue) {
    return [issue.severity, issue.code, issue.message, issue.path || "", issue.project || ""].join("\0");
}
function toPlanIssue(issue) {
    const rawIssue = issue;
    const issuePath = rawIssue.path;
    return {
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        ...(issuePath ? { path: issuePath } : {}),
        ...(rawIssue.project ? { project: rawIssue.project } : {}),
    };
}
function uniqueIssues(issues) {
    const seen = new Set();
    const out = [];
    for (const issue of issues) {
        const key = issueKey(issue);
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(issue);
    }
    return out;
}
function browserCheckUrl(workOrder, projectName, check) {
    const project = workOrder.projects.find(item => item.name === projectName);
    return (0, utils_1.resolveUrl)(project?.targetUrl || "", check.url || project?.targetUrl || "");
}
function expectedArtifactTypes(workOrder, browserChecks) {
    const types = new Set(["report_json", "report_markdown", "artifact_manifest"]);
    if (browserChecks.length) {
        types.add("browser_snapshot");
        types.add("browser_console_log");
        types.add("browser_network_log");
    }
    if (browserChecks.some(check => check.screenshot) || (0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /screenshot/i)) {
        types.add("screenshot");
    }
    if (browserChecks.length && workOrder.options.collectBrowserArtifacts && workOrder.options.browserProvider !== "none") {
        types.add("browser_trace");
        types.add("browser_har");
    }
    if (browserChecks.length && workOrder.options.collectBrowserVideo && workOrder.options.browserProvider !== "none") {
        types.add("browser_video");
    }
    return Array.from(types).sort();
}
function devServerNeeded(workOrder, project) {
    if ((0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /browser|e2e|screenshot|console|http|api/i))
        return true;
    return !!project.targetUrl || !!project.startupUrl || !!project.browserChecks.length || !!project.httpChecks.length || !!project.adversarialHttpChecks.length;
}
function buildTestAgentExecutionPlan(input, overrides = {}, validation) {
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(input, overrides);
    const planned = (0, command_planner_1.planVerificationCommands)(normalized.workOrder, normalized.issues);
    const workOrder = planned.workOrder;
    const plannedByCommand = new Map(planned.plannedCommands.map(item => [`${item.project}\0${item.command}`, item]));
    const allBrowserChecksForArtifacts = [];
    const projects = workOrder.projects.map(project => {
        const httpChecks = [
            ...project.httpChecks.map(check => ({ check, adversarial: false })),
            ...project.adversarialHttpChecks.map(check => ({ check, adversarial: true })),
        ].map(({ check, adversarial }) => ({
            name: check.name || "HTTP check",
            method: String(check.method || "GET").toUpperCase(),
            url: (0, utils_1.resolveUrl)(project.targetUrl, check.url),
            assertionCount: (check.assertions || []).length,
            adversarial,
            ...(check.probeType || check.probe_type ? { probeType: check.probeType || check.probe_type } : {}),
        }));
        const explicitBrowserCount = project.browserChecks.length + project.adversarialBrowserChecks.length;
        const browserChecks = (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).map(check => {
            const item = {
                name: check.name || "Browser check",
                url: browserCheckUrl(workOrder, project.name, check),
                actionCount: (check.actions || []).length,
                assertionCount: (check.assertions || []).length,
                screenshot: check.screenshot !== false,
                ...(check.viewport || check.viewportWidth || check.viewport_width || check.viewportHeight || check.viewport_height ? {
                    viewport: {
                        ...(check.viewport?.width || check.viewportWidth || check.viewport_width ? { width: check.viewport?.width || check.viewportWidth || check.viewport_width } : {}),
                        ...(check.viewport?.height || check.viewportHeight || check.viewport_height ? { height: check.viewport?.height || check.viewportHeight || check.viewport_height } : {}),
                        ...(check.isMobile === true || check.is_mobile === true ? { isMobile: true } : {}),
                    },
                } : {}),
                adversarial: check.adversarial === true,
                autoGenerated: explicitBrowserCount === 0,
                ...(check.probeType || check.probe_type ? { probeType: check.probeType || check.probe_type } : {}),
            };
            allBrowserChecksForArtifacts.push({ screenshot: item.screenshot });
            return item;
        });
        return {
            name: project.name,
            workDir: project.workDir,
            changedFiles: project.changedFiles,
            commands: project.verificationCommands.map(command => {
                const plannedCommand = plannedByCommand.get(`${project.name}\0${command}`);
                return {
                    command,
                    autoDiscovered: !!plannedCommand,
                    ...(plannedCommand?.reason ? { reason: plannedCommand.reason } : {}),
                    ...(plannedCommand?.script ? { script: plannedCommand.script } : {}),
                    ...(plannedCommand?.packageManager ? { packageManager: plannedCommand.packageManager } : {}),
                };
            }),
            devServer: {
                needed: devServerNeeded(workOrder, project),
                command: project.devServerCommand,
                startupUrl: project.startupUrl,
                targetUrl: project.targetUrl,
                timeoutMs: project.startupTimeoutMs,
            },
            httpChecks,
            browserChecks,
        };
    });
    const issues = uniqueIssues([
        ...(validation?.errors || []).map(toPlanIssue),
        ...(validation?.warnings || []).map(toPlanIssue),
        ...planned.issues.map(toPlanIssue),
    ]);
    const expectedArtifacts = expectedArtifactTypes(workOrder, allBrowserChecksForArtifacts);
    return {
        schema: "ccm-test-agent-execution-plan-v1",
        valid: issues.every(issue => issue.severity !== "error"),
        workOrderId: workOrder.id,
        taskId: workOrder.taskId,
        groupId: workOrder.groupId,
        issuedBy: workOrder.issuedBy,
        artifactDir: workOrder.options.artifactDir,
        browserProvider: workOrder.options.browserProvider,
        requiredChecks: workOrder.requiredChecks,
        acceptanceCriteria: workOrder.acceptanceCriteria,
        summary: {
            projects: projects.length,
            commands: projects.reduce((sum, project) => sum + project.commands.length, 0),
            autoDiscoveredCommands: planned.plannedCommands.length,
            devServers: projects.filter(project => project.devServer.needed).length,
            httpChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => !check.adversarial).length, 0),
            adversarialHttpChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => check.adversarial).length, 0),
            browserChecks: projects.reduce((sum, project) => sum + project.browserChecks.length, 0),
            autoBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.autoGenerated).length, 0),
            adversarialBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.adversarial).length, 0),
            expectedArtifactTypes: expectedArtifacts,
        },
        projects,
        issues,
        metadata: {
            plannedCommands: planned.plannedCommands,
            normalizedWorkOrder: workOrder,
        },
    };
}
//# sourceMappingURL=execution-plan.js.map