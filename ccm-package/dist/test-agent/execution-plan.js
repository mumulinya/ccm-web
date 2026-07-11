"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTestAgentExecutionPlan = buildTestAgentExecutionPlan;
const shared_1 = require("./browser/shared");
const multi_session_1 = require("./browser/multi-session");
const stability_summary_1 = require("./browser/stability-summary");
const provider_gaps_1 = require("./browser/provider-gaps");
const authentication_1 = require("./browser/authentication");
const existing_session_1 = require("./browser/existing-session");
const action_effects_1 = require("./browser/action-effects");
const command_planner_1 = require("./command-planner");
const utils_1 = require("./utils");
const work_order_1 = require("./work-order");
const adversarial_relevance_1 = require("./adversarial-relevance");
const http_concurrency_1 = require("./http-concurrency");
const provider_routing_1 = require("./browser/provider-routing");
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
    const detailEligibleBrowserChecks = browserChecks.filter(check => !check.minimalExistingSessionEvidence);
    if (detailEligibleBrowserChecks.length) {
        types.add("browser_snapshot");
        types.add("browser_accessibility_snapshot");
        types.add("browser_console_log");
        types.add("browser_network_log");
    }
    if (detailEligibleBrowserChecks.some(check => check.screenshot)
        || (detailEligibleBrowserChecks.length && (0, utils_1.hasRequiredCheck)(workOrder.requiredChecks, /screenshot/i))) {
        types.add("screenshot");
    }
    const hasArtifactEligibleBrowserCheck = detailEligibleBrowserChecks.some(check => !check.authenticationConfigured);
    if (hasArtifactEligibleBrowserCheck && workOrder.options.collectBrowserArtifacts && workOrder.options.browserProvider !== "none") {
        types.add("browser_trace");
        types.add("browser_har");
    }
    if (hasArtifactEligibleBrowserCheck && workOrder.options.collectBrowserVideo && workOrder.options.browserProvider !== "none") {
        types.add("browser_video");
    }
    return Array.from(types).sort();
}
function devServerNeeded(workOrder, project) {
    const browserChecks = (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria);
    if (!project.devServerCommand
        && !project.httpChecks.length
        && !project.adversarialHttpChecks.length
        && browserChecks.length
        && browserChecks.every(check => Boolean((0, existing_session_1.browserExistingSessionConfig)(check)))) {
        return false;
    }
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
        ].map(({ check, adversarial }) => {
            const name = check.name || "HTTP check";
            const method = String(check.method || "GET").toUpperCase();
            const url = (0, utils_1.resolveUrl)(project.targetUrl, check.url);
            const probeType = check.probeType || check.probe_type;
            const concurrency = (0, http_concurrency_1.httpConcurrencySpecFor)(check);
            const relevance = adversarial
                ? (0, adversarial_relevance_1.buildAdversarialEvidenceRelevance)({
                    name,
                    target: `${method} ${url}`,
                    probeType,
                    context: check.context,
                    originalUserGoal: workOrder.originalUserGoal,
                    acceptanceCriteria: workOrder.acceptanceCriteria,
                })
                : undefined;
            return {
                name,
                method,
                url,
                assertionCount: (check.assertions || []).length,
                concurrentRequests: concurrency?.requests || 0,
                concurrencyAssertionCount: concurrency?.aggregateAssertions.length || 0,
                adversarial,
                ...(probeType ? { probeType } : {}),
                ...(relevance ? {
                    adversarialRelevance: relevance.relevance,
                    linkedAcceptanceCriteria: relevance.linkedCriteria,
                    goalLinked: relevance.goalLinked,
                    relevanceScore: relevance.matchScore,
                } : {}),
            };
        });
        const explicitBrowserCount = project.browserChecks.length + project.adversarialBrowserChecks.length;
        const browserChecks = (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).map(check => {
            const sessionSteps = (0, multi_session_1.flattenBrowserSessionSteps)(check);
            const browserActions = [
                ...(check.actions || []),
                ...(check.sessions || []).flatMap(session => session.setupActions || session.setup_actions || []),
                ...sessionSteps.filter(multi_session_1.isBrowserSessionLeafStep).map(step => step.action).filter(Boolean),
            ];
            const stabilityRuns = (0, stability_summary_1.browserCheckStabilityRuns)(check);
            const credentialEnvNames = (0, authentication_1.browserCheckAuthenticationEnvNames)(check);
            const storageStateFileCount = Number(Boolean((0, authentication_1.browserStorageStatePath)(check)))
                + (check.sessions || []).filter(session => (0, authentication_1.browserStorageStatePath)(session)).length;
            const authenticationConfigured = (0, authentication_1.browserCheckRequiresAuthentication)(check);
            const existingSession = (0, existing_session_1.browserExistingSessionConfig)(check);
            const minimalExistingSessionEvidence = existingSession?.evidencePolicy === "minimal";
            const sessionRecoveryEnabled = Boolean(existingSession
                && ["auto", "claude-in-chrome", "chrome-devtools"].includes(existingSession.provider));
            const authenticationMode = existingSession
                ? "existing_session"
                : authenticationConfigured
                    ? "managed"
                    : undefined;
            const sensitiveArtifactsSuppressed = minimalExistingSessionEvidence
                || (!existingSession
                    && authenticationConfigured
                    && (workOrder.options.collectBrowserArtifacts || workOrder.options.collectBrowserVideo));
            const probeType = check.probeType || check.probe_type;
            const providerRoute = (0, provider_routing_1.browserProviderRouteForCheck)(workOrder, check);
            const relevance = check.adversarial === true
                ? (0, adversarial_relevance_1.buildAdversarialEvidenceRelevance)({
                    name: check.name || "Browser check",
                    target: browserCheckUrl(workOrder, project.name, check),
                    probeType,
                    context: check.context,
                    originalUserGoal: workOrder.originalUserGoal,
                    acceptanceCriteria: workOrder.acceptanceCriteria,
                })
                : undefined;
            const item = {
                name: check.name || "Browser check",
                url: browserCheckUrl(workOrder, project.name, check),
                actionCount: browserActions.length,
                actionEffectCount: browserActions.filter(action => (0, action_effects_1.browserActionEffectRequired)(action)).length,
                crossSessionActionEffectCount: browserActions.filter(action => (0, action_effects_1.browserActionEffectRequired)(action) && Boolean((0, action_effects_1.browserActionEffectSession)(action))).length,
                assertionCount: (check.assertions || []).length
                    + sessionSteps.filter(multi_session_1.isBrowserSessionLeafStep).filter(step => Boolean(step.assertion)).length
                    + sessionSteps.filter(multi_session_1.isBrowserSessionComparisonStep).length,
                plannedProvider: providerRoute.provider,
                providerRoutingReason: providerRoute.reason,
                sessionCount: (check.sessions || []).length,
                sessionStepCount: sessionSteps.length,
                parallelGroupCount: (0, multi_session_1.browserSessionParallelGroupCount)(check),
                comparisonCount: sessionSteps.filter(multi_session_1.isBrowserSessionComparisonStep).length,
                stabilityRuns,
                authenticationConfigured,
                ...(authenticationMode ? { authenticationMode } : {}),
                ...(existingSession ? { existingSessionProvider: existingSession.provider } : {}),
                ...(existingSession ? { existingSessionEvidencePolicy: existingSession.evidencePolicy } : {}),
                sessionRecoveryEnabled,
                credentialEnvNames,
                storageStateFileCount,
                sensitiveArtifactsSuppressed,
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
                ...(probeType ? { probeType } : {}),
                ...(relevance ? {
                    adversarialRelevance: relevance.relevance,
                    linkedAcceptanceCriteria: relevance.linkedCriteria,
                    goalLinked: relevance.goalLinked,
                    relevanceScore: relevance.matchScore,
                } : {}),
            };
            allBrowserChecksForArtifacts.push({
                screenshot: item.screenshot,
                authenticationConfigured: item.authenticationConfigured,
                minimalExistingSessionEvidence,
            });
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
    const adversarialProbeRequired = workOrder.options.requireAdversarialProbe
        || workOrder.requiredChecks.some(check => /adversarial|boundary|orphan|idempot|concurr|race/i.test(String(check || "")));
    const adversarialProbeCount = projects.reduce((sum, project) => sum
        + project.httpChecks.filter(check => check.adversarial).length
        + project.browserChecks.filter(check => check.adversarial).length, 0);
    const adversarialLinkedProbeCount = projects.reduce((sum, project) => sum
        + project.httpChecks.filter(check => check.adversarial && check.adversarialRelevance !== "none").length
        + project.browserChecks.filter(check => check.adversarial && check.adversarialRelevance !== "none").length, 0);
    const adversarialUnlinkedProbeCount = adversarialProbeCount - adversarialLinkedProbeCount;
    const issues = uniqueIssues([
        ...(validation?.errors || []).map(toPlanIssue),
        ...(validation?.warnings || []).map(toPlanIssue),
        ...planned.issues.map(toPlanIssue),
        ...(adversarialProbeRequired && adversarialProbeCount === 0 ? [{
                severity: "warning",
                code: "missing_adversarial_probe_plan",
                message: "The adversarial evidence gate is required, but the execution plan contains no adversarial HTTP or browser probe.",
            }] : []),
        ...(adversarialProbeRequired && adversarialProbeCount > 0 && adversarialLinkedProbeCount === 0 ? [{
                severity: "warning",
                code: "unlinked_adversarial_probe_plan",
                message: "The execution plan contains adversarial probes, but none are linked to the original goal or an acceptance criterion.",
            }] : []),
    ]);
    const expectedArtifacts = expectedArtifactTypes(workOrder, allBrowserChecksForArtifacts);
    const browserProviderWarnings = (0, provider_gaps_1.buildBrowserProviderPlanWarnings)(workOrder);
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
            httpConcurrencyChecks: projects.reduce((sum, project) => sum + project.httpChecks.filter(check => check.concurrentRequests > 0).length, 0),
            httpConcurrentRequests: projects.reduce((sum, project) => sum + project.httpChecks.reduce((projectSum, check) => projectSum + check.concurrentRequests, 0), 0),
            adversarialProbeRequired,
            adversarialProbeWaived: !adversarialProbeRequired && Boolean(workOrder.options.adversarialProbeWaiver),
            adversarialProbeWaiverReason: adversarialProbeRequired ? "" : workOrder.options.adversarialProbeWaiver,
            adversarialProbeCount,
            adversarialLinkedProbeCount,
            adversarialUnlinkedProbeCount,
            browserChecks: projects.reduce((sum, project) => sum + project.browserChecks.length, 0),
            autoBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.autoGenerated).length, 0),
            adversarialBrowserChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.adversarial).length, 0),
            browserPlannedPlaywrightChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.plannedProvider === "playwright").length, 0),
            browserPlannedMcpChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.plannedProvider === "mcp").length, 0),
            browserCapabilityRoutedChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.providerRoutingReason === "capability_requires_playwright").length, 0),
            browserExistingSessionRoutedChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.providerRoutingReason === "existing_authenticated_session").length, 0),
            browserSessions: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.sessionCount, 0), 0),
            browserSessionSteps: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.sessionStepCount, 0), 0),
            browserParallelGroups: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.parallelGroupCount, 0), 0),
            browserSessionComparisons: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.comparisonCount, 0), 0),
            browserStabilityChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.stabilityRuns > 1).length, 0),
            browserStabilityRuns: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.stabilityRuns, 0), 0),
            browserAuthenticationChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationConfigured).length, 0),
            browserManagedAuthenticationChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationMode === "managed").length, 0),
            browserExistingSessionChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.authenticationMode === "existing_session").length, 0),
            browserExistingSessionMinimalEvidenceChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.existingSessionEvidencePolicy === "minimal").length, 0),
            browserExistingSessionFullEvidenceChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.existingSessionEvidencePolicy === "full").length, 0),
            browserSessionRecoveryChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.sessionRecoveryEnabled).length, 0),
            browserActionEffectChecks: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.actionEffectCount > 0).length, 0),
            browserActionEffectActions: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.actionEffectCount, 0), 0),
            browserCrossSessionActionEffectActions: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.crossSessionActionEffectCount, 0), 0),
            browserExistingSessionProviders: Array.from(new Set(projects.flatMap(project => project.browserChecks.map(check => check.existingSessionProvider || "").filter(Boolean)))).sort(),
            browserCredentialEnvBindings: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.credentialEnvNames.length, 0), 0),
            browserStorageStateFiles: projects.reduce((sum, project) => sum + project.browserChecks.reduce((projectSum, check) => projectSum + check.storageStateFileCount, 0), 0),
            browserSensitiveArtifactSuppressions: projects.reduce((sum, project) => sum + project.browserChecks.filter(check => check.sensitiveArtifactsSuppressed).length, 0),
            browserProviderWarnings: browserProviderWarnings.length,
            expectedArtifactTypes: expectedArtifacts,
        },
        projects,
        browserProviderWarnings,
        issues,
        metadata: {
            plannedCommands: planned.plannedCommands,
            normalizedWorkOrder: workOrder,
        },
    };
}
//# sourceMappingURL=execution-plan.js.map